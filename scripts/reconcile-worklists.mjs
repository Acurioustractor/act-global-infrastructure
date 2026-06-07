#!/usr/bin/env node
/**
 * READ-ONLY: generate the three reconcile worklists from the corrected diagnosis
 * (multi-agent review 2026-06-02). Writes markdown to thoughts/shared/recon-pack/.
 *   1. danger cluster  — unreconciled NAB lines that match an AUTHORISED (unpaid) bill → MATCH, do NOT delete (→ SL)
 *   2. no-bill batches  — unreconciled NAB lines with no bill anywhere → code-and-reconcile by vendor (DIY)
 *   3. safe-delete     — unreconciled NAB lines that tightly match a PAID bill (±3d, exact cents) and NOT an AUTHORISED bill → safe dedup (DIY)
 * See memory dext-duplicate-resolution: MATCH-THEN-DEDUPE, never dedupe-everything.
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ACC = `'NAB Visa ACT #8815'`;
const BASE = `t.bank_account=${ACC} AND t.type LIKE 'SPEND%' AND t.is_reconciled=false AND t.status IS DISTINCT FROM 'DELETED'`;
const AUTH = `EXISTS (SELECT 1 FROM xero_invoices i WHERE i.type='ACCPAY' AND i.status='AUTHORISED' AND ABS(ABS(i.total)-ABS(t.total))<0.02 AND i.date BETWEEN (t.date-14) AND (t.date+14))`;
const PAID_TIGHT = `EXISTS (SELECT 1 FROM xero_invoices i WHERE i.type='ACCPAY' AND i.status='PAID' AND ABS(ABS(i.total)-ABS(t.total))<0.005 AND i.date BETWEEN (t.date-3) AND (t.date+3))`;
const ANYBILL = `EXISTS (SELECT 1 FROM xero_invoices i WHERE i.type='ACCPAY' AND i.status NOT IN ('DELETED','VOIDED') AND ABS(ABS(i.total)-ABS(t.total))<0.02 AND i.date BETWEEN (t.date-14) AND (t.date+14))`;
const run = async (sql) => { const {data,error}=await sb.rpc('exec_sql',{query:sql}); if(error){console.error(sql,error);process.exit(1);} return data; };
const fmt = n => '$'+Number(n).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2});
const OUT = 'thoughts/shared/recon-pack/';

// 1. DANGER CLUSTER
const danger = await run(`SELECT contact_name, date::text d, ABS(total)::numeric(12,2) amt FROM xero_transactions t WHERE ${BASE} AND ${AUTH} ORDER BY ABS(total) DESC`);
const dTot = danger.reduce((s,r)=>s+Number(r.amt),0);
writeFileSync(OUT+'worklist-1-SL-danger-cluster.md',
`# Worklist 1 — ⚠️ DANGER CLUSTER → Standard Ledger (MATCH, do NOT delete)

> ${danger.length} unreconciled NAB Visa lines that match an **AUTHORISED (unpaid)** bill — total ${fmt(dTot)}.
> **These are REAL PAYMENTS, not duplicates.** For each: in Xero, MATCH the bank line to its AUTHORISED bill (flips it PAID, clears the line). **Deleting falsely un-pays a real bill + understates spend.** SL confirms open-vs-already-paid per pair. (Generated \`scripts/reconcile-worklists.mjs\`, READ-ONLY.)

| Date | Vendor | Amount |
|---|---|---|
${danger.map(r=>`| ${r.d} | ${(r.contact_name||'?').replace(/\|/g,'')} | ${fmt(r.amt)} |`).join('\n')}
`);

// 2. NO-BILL BATCHES (DIY)
const nobill = await run(`SELECT contact_name, count(*)::int n, SUM(ABS(total))::numeric(12,2) tot, SUM(CASE WHEN ABS(total)>=82.50 THEN 1 ELSE 0 END)::int over_thr FROM xero_transactions t WHERE ${BASE} AND NOT ${ANYBILL} GROUP BY contact_name ORDER BY count(*) DESC`);
const nTot = nobill.reduce((s,r)=>s+Number(r.tot),0); const nLines = nobill.reduce((s,r)=>s+r.n,0);
writeFileSync(OUT+'worklist-2-DIY-no-bill-batches.md',
`# Worklist 2 — ✅ YOUR CHEAP WIN: no-bill lines, vendor-batched (DIY)

> ${nLines} unreconciled NAB Visa lines with **no matching bill anywhere** — total ${fmt(nTot)}. These need **code-and-reconcile** (Create in the Reconcile tab), not dedup.
> Work by vendor batch (search the box, code the batch). Coding per vendor: see \`scripts/reconcile-triage.mjs\`. Lines under $82.50 need no tax invoice. (READ-ONLY.)

| Vendor | Lines | Total | ≥$82.50 (need a glance) |
|---|---|---|---|
${nobill.map(r=>`| ${(r.contact_name||'?').replace(/\|/g,'')} | ${r.n} | ${fmt(r.tot)} | ${r.over_thr} |`).join('\n')}
`);

// 3. SAFE-DELETE (DIY)
const safe = await run(`SELECT contact_name, date::text d, ABS(total)::numeric(12,2) amt FROM xero_transactions t WHERE ${BASE} AND ${PAID_TIGHT} AND NOT ${AUTH} ORDER BY ABS(total) DESC`);
const sTot = safe.reduce((s,r)=>s+Number(r.amt),0);
writeFileSync(OUT+'worklist-3-DIY-safe-delete.md',
`# Worklist 3 — ✅ SAFE-DELETE: PAID-bill phantoms (DIY dedup)

> ${safe.length} unreconciled NAB Visa lines that **tightly** match an already-**PAID** bill (±3 days, exact cents) and do NOT match any AUTHORISED bill — total ${fmt(sTot)}.
> Safe to delete (same as today's 27): the PAID bill keeps the receipt. Delete the unreconciled spend-money → Remove & Redo → Yes. **Work in GST-bearing batches and run \`prepare-bas.mjs\` after each batch** to watch the BAS delta (deletes raise net payable; that's the correction). (READ-ONLY.)

| Date | Vendor | Amount |
|---|---|---|
${safe.map(r=>`| ${r.d} | ${(r.contact_name||'?').replace(/\|/g,'')} | ${fmt(r.amt)} |`).join('\n')}
`);

console.log(`Worklist 1 (SL danger):  ${danger.length} lines · ${fmt(dTot)}`);
console.log(`Worklist 2 (DIY no-bill): ${nLines} lines · ${fmt(nTot)} · ${nobill.length} vendors`);
console.log(`Worklist 3 (DIY safe-del): ${safe.length} lines · ${fmt(sTot)}`);
console.log(`Written to ${OUT}worklist-{1,2,3}-*.md`);
