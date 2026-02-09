import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Additional patterns to skip
const skipVendors = ["NAB", "Nicholas"];

const { data: toCheck } = await supabase
  .from("receipt_matches")
  .select("id, vendor_name, amount")
  .in("status", ["pending", "email_suggested"]);

const idsToUpdate = [];
for (const item of (toCheck || [])) {
  const v = item.vendor_name || "";
  // NAB without other context = bank fee
  if (v === "NAB" || v === "Nicholas") {
    idsToUpdate.push(item.id);
    console.log("Skipping:", v, "$" + item.amount);
  }
}

if (idsToUpdate.length > 0) {
  const { error } = await supabase
    .from("receipt_matches")
    .update({ status: "no_receipt_needed", resolved_at: new Date().toISOString() })
    .in("id", idsToUpdate);
  
  console.log("\nMarked", idsToUpdate.length, "as no_receipt_needed");
}

const { count } = await supabase
  .from("receipt_matches")
  .select("*", { count: "exact", head: true })
  .gte("transaction_date", "2025-10-01")
  .in("status", ["pending", "email_suggested"]);

console.log("\n=== FINAL COUNT ===");
console.log("Receipts needing attention (Oct 1 - Now):", count);
