#!/usr/bin/env node
// READ-ONLY ground-truth: the real NAB Visa #8815 reconcile + bill + RECEIPT + phantom numbers.
// Aggregations only (no row dumps) so nothing hits the exec_sql 1000-cap.
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ACC = `'NAB Visa ACT #8815'`;
const q = async (label, sql) => { const {data,error}=await sb.rpc('exec_sql',{query:sql}); console.log(`\n### ${label}`); if(error) console.log('  ERR', error.message); else console.table(data); };

await q('1. NAB Visa spend-money by reconciled state',
  `SELECT is_reconciled, count(*), SUM(ABS(total))::numeric(12,0) total FROM xero_transactions WHERE bank_account=${ACC} AND type LIKE 'SPEND%' AND status IS DISTINCT FROM 'DELETED' GROUP BY is_reconciled`);

await q('2. ACCPAY bills by status (the whole entity)',
  `SELECT status, count(*), SUM(ABS(total))::numeric(12,0) total, SUM(CASE WHEN has_attachments THEN 1 ELSE 0 END) with_receipt FROM xero_invoices WHERE type='ACCPAY' AND status NOT IN ('VOIDED') GROUP BY status ORDER BY count(*) DESC`);

await q('3. RECEIPT coverage — all live ACCPAY bills',
  `SELECT has_attachments, count(*), SUM(ABS(total))::numeric(12,0) total FROM xero_invoices WHERE type='ACCPAY' AND status NOT IN ('DELETED','VOIDED') GROUP BY has_attachments`);

await q('4. RECEIPT coverage — GST-bearing bills >= $82.50 (the ones that LEGALLY need a tax invoice)',
  `SELECT has_attachments, count(*), SUM(ABS(total))::numeric(12,0) total FROM xero_invoices WHERE type='ACCPAY' AND status NOT IN ('DELETED','VOIDED') AND total_tax>0 AND ABS(total)>=82.50 GROUP BY has_attachments`);

await q('5. AUTHORISED bills (awaiting payment = what unreconciled bank lines should MATCH to)',
  `SELECT count(*), SUM(ABS(total))::numeric(12,0) total, SUM(CASE WHEN has_attachments THEN 1 ELSE 0 END) with_receipt FROM xero_invoices WHERE type='ACCPAY' AND status='AUTHORISED'`);

await q('6. PHANTOM SCALE — unreconciled NAB spend-money that DUPLICATE an existing bill (amount+date match)',
  `SELECT count(*) phantoms, SUM(ABS(t.total))::numeric(12,0) total FROM xero_transactions t WHERE t.bank_account=${ACC} AND t.type LIKE 'SPEND%' AND t.is_reconciled=false AND t.status IS DISTINCT FROM 'DELETED' AND EXISTS (SELECT 1 FROM xero_invoices i WHERE i.type='ACCPAY' AND i.status NOT IN ('DELETED','VOIDED') AND ABS(ABS(i.total)-ABS(t.total))<0.02 AND i.date BETWEEN (t.date - 14) AND (t.date + 14))`);

await q('7. The other side — unreconciled NAB spend-money with NO matching bill (genuine creates/uncoded)',
  `SELECT count(*) no_bill, SUM(ABS(t.total))::numeric(12,0) total FROM xero_transactions t WHERE t.bank_account=${ACC} AND t.type LIKE 'SPEND%' AND t.is_reconciled=false AND t.status IS DISTINCT FROM 'DELETED' AND NOT EXISTS (SELECT 1 FROM xero_invoices i WHERE i.type='ACCPAY' AND i.status NOT IN ('DELETED','VOIDED') AND ABS(ABS(i.total)-ABS(t.total))<0.02 AND i.date BETWEEN (t.date - 14) AND (t.date + 14))`);
