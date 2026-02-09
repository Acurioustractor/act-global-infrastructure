import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get all SPEND transactions
const { data: txns } = await supabase
  .from("xero_transactions")
  .select("xero_transaction_id, contact_name, total, date, has_attachments")
  .eq("type", "SPEND")
  .eq("has_attachments", false);

// Get all bills with attachments (contact names)
const { data: billsWithReceipts } = await supabase
  .from("xero_invoices")
  .select("contact_name")
  .eq("type", "ACCPAY")
  .eq("has_attachments", true);

const reconcilledVendors = new Set((billsWithReceipts || []).map(b => b.contact_name?.toLowerCase()));

// Categorize transactions
const needsReceipt = [];
const probablyOk = [];
const skipPatterns = ["nab fee", "bank fee", "interest", "eftpos fee"];

for (const txn of (txns || [])) {
  const vendor = (txn.contact_name || "").toLowerCase();
  
  // Skip bank fees
  if (skipPatterns.some(p => vendor.includes(p))) {
    continue;
  }
  
  // Check if vendor has a bill with receipt
  if (reconcilledVendors.has(vendor)) {
    probablyOk.push(txn);
  } else {
    needsReceipt.push(txn);
  }
}

console.log("=== Receipt Reconciliation Status ===");
console.log("Bank transactions without direct attachment:", txns?.length || 0);
console.log("Skipped (bank fees):", (txns?.length || 0) - needsReceipt.length - probablyOk.length);
console.log("Vendor has bill with receipt:", probablyOk.length);
console.log("ACTUALLY NEEDS RECEIPT:", needsReceipt.length);

console.log("\n=== Top vendors needing receipts ===");
const byVendor = {};
needsReceipt.forEach(t => {
  const v = t.contact_name || "Unknown";
  if (!byVendor[v]) byVendor[v] = { count: 0, total: 0 };
  byVendor[v].count++;
  byVendor[v].total += Math.abs(t.total);
});

Object.entries(byVendor)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 15)
  .forEach(([vendor, stats]) => {
    console.log(`  ${vendor}: ${stats.count} txns, $${stats.total.toFixed(2)}`);
  });
