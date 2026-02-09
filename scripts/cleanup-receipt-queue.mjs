import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Patterns to mark as "no_receipt_needed"
const skipPatterns = [
  "nab fee", "nab international fee", "bank fee", "eftpos fee",
  "nicholas marchesi", "2up spending", "gopayid"
];

// Get all pending that match skip patterns
const { data: toSkip } = await supabase
  .from("receipt_matches")
  .select("id, vendor_name")
  .in("status", ["pending", "email_suggested"]);

const idsToUpdate = [];
for (const item of (toSkip || [])) {
  const v = (item.vendor_name || "").toLowerCase();
  if (skipPatterns.some(p => v.includes(p))) {
    idsToUpdate.push(item.id);
  }
}

console.log("Found", idsToUpdate.length, "items to mark as no_receipt_needed");

if (idsToUpdate.length > 0) {
  // Update in batches
  const batchSize = 100;
  let updated = 0;
  for (let i = 0; i < idsToUpdate.length; i += batchSize) {
    const batch = idsToUpdate.slice(i, i + batchSize);
    const { error } = await supabase
      .from("receipt_matches")
      .update({ status: "no_receipt_needed", resolved_at: new Date().toISOString() })
      .in("id", batch);
    
    if (error) {
      console.error("Error updating batch:", error.message);
    } else {
      updated += batch.length;
    }
  }
  console.log("Updated", updated, "items");
}

// Get new counts
const { count: remaining } = await supabase
  .from("receipt_matches")
  .select("*", { count: "exact", head: true })
  .gte("transaction_date", "2025-10-01")
  .in("status", ["pending", "email_suggested"]);

console.log("\nRemaining pending (Oct 1 - Now):", remaining);
