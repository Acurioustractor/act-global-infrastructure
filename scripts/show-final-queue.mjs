import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: pending } = await supabase
  .from("receipt_matches")
  .select("vendor_name, amount, transaction_date, category")
  .gte("transaction_date", "2025-10-01")
  .in("status", ["pending", "email_suggested"])
  .order("transaction_date", { ascending: false });

console.log("=== FINAL: Receipts Needing Attention (Oct 1 - Now) ===");
console.log("Total:", pending?.length || 0);

// By category
const byCategory = {};
(pending || []).forEach(p => {
  const cat = p.category || "other";
  if (!byCategory[cat]) byCategory[cat] = { count: 0, amount: 0 };
  byCategory[cat].count++;
  byCategory[cat].amount += parseFloat(p.amount) || 0;
});

console.log("\nBy category:");
Object.entries(byCategory)
  .sort((a, b) => b[1].amount - a[1].amount)
  .forEach(([cat, stats]) => {
    console.log("  " + cat + ": " + stats.count + " items, $" + stats.amount.toLocaleString("en-US", {minimumFractionDigits: 2}));
  });

// By vendor
const byVendor = {};
(pending || []).forEach(p => {
  const v = p.vendor_name || "Unknown";
  if (!byVendor[v]) byVendor[v] = { count: 0, amount: 0 };
  byVendor[v].count++;
  byVendor[v].amount += parseFloat(p.amount) || 0;
});

console.log("\nTop 20 vendors:");
Object.entries(byVendor)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 20)
  .forEach(([vendor, stats]) => {
    console.log("  " + vendor + ": " + stats.count + " txns, $" + stats.amount.toLocaleString("en-US", {minimumFractionDigits: 2}));
  });

// Total value
const totalValue = (pending || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
console.log("\nTotal value needing receipts: $" + totalValue.toLocaleString("en-US", {minimumFractionDigits: 2}));
