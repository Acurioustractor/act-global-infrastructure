import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get all vendors that have bills WITH attachments
const { data: billsWithReceipts } = await supabase
  .from("xero_invoices")
  .select("contact_name")
  .eq("type", "ACCPAY")
  .eq("has_attachments", true);

const vendorsWithReceipts = new Set(
  (billsWithReceipts || []).map(b => b.contact_name?.toLowerCase()).filter(Boolean)
);

console.log("Vendors with bill receipts:", vendorsWithReceipts.size);
console.log("Sample:", [...vendorsWithReceipts].slice(0, 10));

// Get pending receipt_matches
const { data: pending } = await supabase
  .from("receipt_matches")
  .select("id, vendor_name")
  .in("status", ["pending", "email_suggested"]);

// Find which ones should be marked as resolved
const toResolve = [];
for (const item of (pending || [])) {
  const vendorLower = (item.vendor_name || "").toLowerCase();
  if (vendorsWithReceipts.has(vendorLower)) {
    toResolve.push(item);
  }
}

console.log("\nPending items whose vendor has bill receipts:", toResolve.length);
toResolve.slice(0, 10).forEach(t => console.log("  -", t.vendor_name));

if (toResolve.length > 0) {
  const ids = toResolve.map(t => t.id);
  const { error } = await supabase
    .from("receipt_matches")
    .update({ 
      status: "resolved", 
      resolved_at: new Date().toISOString(),
      resolved_by: "bill_has_receipt"
    })
    .in("id", ids);

  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("\nMarked", ids.length, "as resolved (vendor has bill with receipt)");
  }
}

// Get final count
const { count } = await supabase
  .from("receipt_matches")
  .select("*", { count: "exact", head: true })
  .gte("transaction_date", "2025-10-01")
  .in("status", ["pending", "email_suggested"]);

console.log("\nRemaining pending (Oct 1 - Now):", count);
