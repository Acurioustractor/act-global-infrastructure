import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tednluwflfhxyucgwigh.supabase.co",
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: all, count } = await supabase
  .from("xero_invoices")
  .select("type, has_attachments", { count: "exact" });

console.log("Total invoices in DB:", count);

const byType = {};
(all || []).forEach(i => {
  const key = i.type || "null";
  if (!byType[key]) byType[key] = { total: 0, withAttach: 0 };
  byType[key].total++;
  if (i.has_attachments) byType[key].withAttach++;
});

console.log("\nBy type:");
Object.entries(byType).forEach(([type, stats]) => {
  console.log("  " + type + ":", stats.total, "total,", stats.withAttach, "with attachments");
});
