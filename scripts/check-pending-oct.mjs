import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get pending receipts from Oct 1 onwards
const { data: pending, count } = await supabase
  .from("receipt_matches")
  .select("vendor_name, amount, transaction_date, category, status", { count: "exact" })
  .gte("transaction_date", "2025-10-01")
  .in("status", ["pending", "email_suggested"])
  .order("transaction_date", { ascending: false });

console.log("=== Pending Receipts (Oct 1 - Now) ===");
console.log("Total pending:", count);

// Group by category
const byCategory = {};
(pending || []).forEach(p => {
  const cat = p.category || "other";
  if (!byCategory[cat]) byCategory[cat] = { count: 0, amount: 0 };
  byCategory[cat].count++;
  byCategory[cat].amount += parseFloat(p.amount) || 0;
});

console.log("\nBy category:");
Object.entries(byCategory).forEach(([cat, stats]) => {
  console.log("  " + cat + ": " + stats.count + " items, $" + stats.amount.toFixed(2));
});

// Top vendors
const byVendor = {};
(pending || []).forEach(p => {
  const v = p.vendor_name || "Unknown";
  if (!byVendor[v]) byVendor[v] = { count: 0, amount: 0 };
  byVendor[v].count++;
  byVendor[v].amount += parseFloat(p.amount) || 0;
});

console.log("\nTop vendors needing receipts:");
Object.entries(byVendor)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 20)
  .forEach(([vendor, stats]) => {
    console.log("  " + vendor + ": " + stats.count + " txns, $" + stats.amount.toFixed(2));
  });

// Check which should be skipped
const skipPatterns = ["nab fee", "nab international", "bank fee", "nicholas marchesi", "2up spending", "gopayid"];
const shouldSkip = (pending || []).filter(p => {
  const v = (p.vendor_name || "").toLowerCase();
  return skipPatterns.some(pattern => v.includes(pattern));
});

console.log("\n=== Should be removed (bank fees/internal) ===");
console.log("Count:", shouldSkip.length);
console.log("Actual needing receipts:", (count || 0) - shouldSkip.length);
