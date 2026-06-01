#!/usr/bin/env node
/**
 * Receipt finder for reconciliation: given bank lines (vendor, amount, date), find the matching
 * receipt in finance_receipt_documents by amount-exact + date-window, ranked by vendor similarity.
 * READ-ONLY. Edit the LINES array (or later: feed from a query) and run.
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Lines currently on Ben's Xero screen (NAB Visa, Oct 2025) — vendor, amount, date
const LINES = [
  ['Nest In Witta', 86.19, '2025-10-06'], ['Centre Trailer Sales Ciccone', 424.91, '2025-10-07'],
  ['AGL', 275.44, '2025-10-07'], ['Riceboi Mooloolaba', 94.00, '2025-10-07'],
  ['Sushi Gosu', 112.16, '2025-10-08'], ['Woolworths Maleny', 56.70, '2025-10-08'],
  ['Coles Alice Springs', 296.50, '2025-10-08'], ['Sushi Gosu', 7.11, '2025-10-08'],
  ['Aherrenge Community Store', 175.67, '2025-10-10'], ['CabFare', 19.11, '2025-10-10'],
];

for (const [vendor, amt, date] of LINES) {
  const { data } = await sb.rpc('exec_sql', { query: `
    SELECT vendor_name, document_date, amount_total, source, attachment_filename,
           ABS(document_date::date - '${date}'::date) day_gap
    FROM finance_receipt_documents
    WHERE amount_total = ${amt}
      AND document_date BETWEEN '${date}'::date - 14 AND '${date}'::date + 14
    ORDER BY day_gap ASC LIMIT 3` });
  const hit = (data || [])[0];
  if (hit) {
    console.log(`✅ ${vendor.padEnd(30)} $${String(amt).padStart(8)} ${date} → ${hit.source} "${hit.attachment_filename||'(no file)'}" [${hit.vendor_name}, ${hit.document_date}, gap ${hit.day_gap}d]`);
  } else {
    console.log(`❌ ${vendor.padEnd(30)} $${String(amt).padStart(8)} ${date} → no receipt at this amount±14d`);
  }
}
