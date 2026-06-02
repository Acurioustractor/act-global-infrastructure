#!/usr/bin/env node
// READ-ONLY receipt-chase target list: the exact bills + no-bill NAB lines missing a receipt.
// xero_invoices.has_attachments is accurate (memory: command-center-finance-truth); transactions' drifts.
// Aggregations + small row lists only (well under the exec_sql 1000-cap).
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ACC = `'NAB Visa ACT #8815'`;
const q = async (sql) => { const {data,error}=await sb.rpc('exec_sql',{query:sql}); if(error){console.log('  ERR',error.message); return [];} return data; };

console.log('# Receipt-chase target list  ·  generated READ-ONLY\n');

// A — GST-bearing bills >= $82.50 with NO receipt (legally need a tax invoice; BAS-relevant)
console.log('## A. GST-bearing bills >= $82.50, NO receipt (legally require a tax invoice)');
const a = await q(`SELECT contact_name, date, ABS(total)::numeric(12,2) total, ABS(total_tax)::numeric(12,2) gst, invoice_number, status, xero_id
  FROM xero_invoices WHERE type='ACCPAY' AND status NOT IN ('DELETED','VOIDED') AND total_tax>0 AND ABS(total)>=82.50 AND has_attachments=false
  ORDER BY ABS(total) DESC`);
console.table(a);

// B — remaining bills with NO receipt (sub-threshold or GST-free; lower priority)
console.log('## B. Other bills with NO receipt (sub-threshold or GST-free)');
const b = await q(`SELECT contact_name, date, ABS(total)::numeric(12,2) total, ABS(total_tax)::numeric(12,2) gst, invoice_number, status, xero_id
  FROM xero_invoices WHERE type='ACCPAY' AND status NOT IN ('DELETED','VOIDED') AND has_attachments=false AND NOT (total_tax>0 AND ABS(total)>=82.50)
  ORDER BY ABS(total) DESC`);
console.table(b);

// C — no-bill unreconciled NAB spend-money >= $82.50 (need a bill+receipt created; mostly Qantas per prior diagnosis)
console.log('## C. No-bill unreconciled NAB lines >= $82.50 (need bill+receipt; portal-recoverable)');
const c = await q(`SELECT t.contact_name, t.date, ABS(t.total)::numeric(12,2) total, t.has_attachments
  FROM xero_transactions t
  WHERE t.bank_account=${ACC} AND t.type LIKE 'SPEND%' AND t.is_reconciled=false AND t.status IS DISTINCT FROM 'DELETED'
    AND ABS(t.total)>=82.50
    AND NOT EXISTS (SELECT 1 FROM xero_invoices i WHERE i.type='ACCPAY' AND i.status NOT IN ('DELETED','VOIDED')
                    AND ABS(ABS(i.total)-ABS(t.total))<0.02 AND i.date BETWEEN (t.date - 14) AND (t.date + 14))
  ORDER BY ABS(t.total) DESC`);
console.table(c);

// Roll-up by vendor for C (so the chase is batchable by portal)
console.log('## C-rollup — no-bill >= $82.50 grouped by vendor');
const cr = await q(`SELECT t.contact_name, count(*) lines, SUM(ABS(t.total))::numeric(12,2) total
  FROM xero_transactions t
  WHERE t.bank_account=${ACC} AND t.type LIKE 'SPEND%' AND t.is_reconciled=false AND t.status IS DISTINCT FROM 'DELETED'
    AND ABS(t.total)>=82.50
    AND NOT EXISTS (SELECT 1 FROM xero_invoices i WHERE i.type='ACCPAY' AND i.status NOT IN ('DELETED','VOIDED')
                    AND ABS(ABS(i.total)-ABS(t.total))<0.02 AND i.date BETWEEN (t.date - 14) AND (t.date + 14))
  GROUP BY t.contact_name ORDER BY SUM(ABS(t.total)) DESC`);
console.table(cr);

console.log(`\nTotals: A=${a.length} bills, B=${b.length} bills, C=${c.length} no-bill lines`);
