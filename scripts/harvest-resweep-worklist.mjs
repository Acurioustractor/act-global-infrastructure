#!/usr/bin/env node
/**
 * Harvest (ACT-HV) forensic re-sweep worklist (READ-ONLY).
 *
 * Why this exists: a full Xero sync re-tags pre-Jan rows onto ACT-HV via
 * xero_tracking, and scrambles live-vs-deleted / cross-project tags. The
 * May-2026 manual clean keeps getting wiped. This rebuilds the picture from
 * scratch so the clean number + re-tag decisions can be reviewed before any
 * write. NEVER writes to Supabase or Xero.
 *
 * Output: thoughts/shared/handoffs/sl-cleanup/.. no — writes
 *   thoughts/shared/reports/harvest-resweep-worklist-<today>.md
 * and prints a summary.
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const sb = createClient(
  process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co',
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const f = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const U = (s) => (s || '').trim().toUpperCase();
const CUT = '2026-01-01';
const TODAY = process.argv[2] || '2026-06-26'; // pass date to keep deterministic

async function pageAll(builder) {
  const out = []; let from = 0; const size = 1000;
  while (true) {
    const { data, error } = await builder.range(from, from + size - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return out;
}

async function main() {
  // 1) vendor universe = any vendor that currently has an ACT-HV-tagged row (any status, any date)
  const hvBills = await pageAll(sb.from('xero_invoices')
    .select('xero_id,date,contact_name,total,status,invoice_number,project_code_source')
    .eq('project_code', 'ACT-HV').eq('type', 'ACCPAY'));
  const hvTxns = await pageAll(sb.from('xero_transactions')
    .select('xero_transaction_id,date,contact_name,total,type,status,project_code_source')
    .eq('project_code', 'ACT-HV').in('type', ['SPEND', 'SPEND-OVERPAYMENT']));
  const vendors = [...new Set([...hvBills, ...hvTxns].map(r => U(r.contact_name)))].filter(Boolean);

  // 2) pull ALL records (any project, any status) for those vendors, post-Jan
  //    (so we can see live spend sitting on NULL / ACT-CORE / elsewhere)
  const allBills = [], allTxns = [];
  for (const v of vendors) {
    const b = await pageAll(sb.from('xero_invoices')
      .select('xero_id,date,contact_name,total,status,invoice_number,project_code,project_code_source')
      .eq('type', 'ACCPAY').ilike('contact_name', v.replace(/[%_]/g, ' ') + '%').gte('date', CUT));
    const t = await pageAll(sb.from('xero_transactions')
      .select('xero_transaction_id,date,contact_name,total,type,status,project_code,project_code_source')
      .in('type', ['SPEND', 'SPEND-OVERPAYMENT']).ilike('contact_name', v.replace(/[%_]/g, ' ') + '%').gte('date', CUT));
    allBills.push(...b); allTxns.push(...t);
  }
  // de-dupe rows pulled multiple times by overlapping ilike
  const ub = new Map(allBills.map(r => [r.xero_id, r]));
  const ut = new Map(allTxns.map(r => [r.xero_transaction_id, r]));
  const bills = [...ub.values()].filter(r => vendors.includes(U(r.contact_name)));
  const txns = [...ut.values()].filter(r => vendors.includes(U(r.contact_name)));

  const liveBillStatus = (s) => ['AUTHORISED', 'PAID'].includes(s);
  const deadBillStatus = (s) => ['VOIDED', 'DELETED', 'DRAFT'].includes(s);
  const liveTxnStatus = (s) => !['DELETED', 'VOIDED'].includes(s);

  // 3) classify per vendor
  const byVendor = new Map();
  const push = (v, rec) => { if (!byVendor.has(v)) byVendor.set(v, []); byVendor.get(v).push(rec); };
  for (const b of bills) push(U(b.contact_name), { k: 'bill', ...b, id: b.xero_id });
  for (const t of txns) push(U(t.contact_name), { k: 'txn', ...t, id: t.xero_transaction_id });

  // current clean ACT-HV (only rows currently tagged ACT-HV, live status, post-Jan, deduped)
  let currentCleanBills = bills.filter(b => b.project_code === 'ACT-HV' && b.date >= CUT && liveBillStatus(b.status));
  const currentLiveTxns = txns.filter(t => t.project_code === 'ACT-HV' && t.date >= CUT && liveTxnStatus(t.status));
  // placeholder-bill dup: no inv# matching a live txn (any project) same vendor+amount ±14d
  const allLiveTxns = txns.filter(t => liveTxnStatus(t.status) && t.date >= CUT);
  const phBill = new Set();
  for (const b of currentCleanBills) {
    if (b.invoice_number) continue;
    const bd = new Date(b.date);
    if (allLiveTxns.find(s => U(s.contact_name) === U(b.contact_name) && Number(s.total) === Number(b.total) && Math.abs((new Date(s.date) - bd) / 864e5) <= 14)) phBill.add(b.xero_id);
  }
  currentCleanBills = currentCleanBills.filter(b => !phBill.has(b.xero_id));
  const paid = currentCleanBills.filter(b => b.status === 'PAID');
  const overlapTxn = new Set();
  for (const s of currentLiveTxns) { const sd = new Date(s.date); if (paid.find(b => U(b.contact_name) === U(s.contact_name) && Number(b.total) === Number(s.total) && Math.abs((new Date(b.date) - sd) / 864e5) <= 14)) overlapTxn.add(s.xero_transaction_id); }
  const cleanTxns = currentLiveTxns.filter(t => !overlapTxn.has(t.xero_transaction_id));
  const currentCleanTotal = currentCleanBills.reduce((a, b) => a + Number(b.total), 0) + cleanTxns.reduce((a, t) => a + Number(t.total), 0);

  // re-tag candidates: live rows for these vendors sitting on NULL or non-ACT-HV project, post-Jan,
  // NOT already counted, NOT an obvious dup of a counted row
  const countedKeys = new Set([...currentCleanBills, ...cleanTxns].map(r => `${U(r.contact_name)}|${Number(r.total)}|${r.date}`));
  const retagCandidates = [];
  for (const r of [...bills.map(b => ({ k: 'bill', ...b, id: b.xero_id, live: liveBillStatus(b.status) })),
                   ...txns.map(t => ({ k: 'txn', ...t, id: t.xero_transaction_id, live: liveTxnStatus(t.status) }))]) {
    if (r.project_code === 'ACT-HV') continue;
    if (!r.live) continue;
    if (r.date < CUT) continue;
    retagCandidates.push(r);
  }

  // 4) render
  const md = [];
  md.push(`# Harvest (ACT-HV) forensic re-sweep worklist — ${TODAY}`);
  md.push('');
  md.push('_READ-ONLY. Rebuilt after the May clean was wiped by a Xero sync. Two pools below: (A) what to KEEP/clean on the current ACT-HV tag, (B) live Harvest-vendor spend sitting OFF ACT-HV that may need re-tagging in._');
  md.push('');
  md.push('## Headline');
  md.push(`- Vendor universe (any current ACT-HV row): **${vendors.length}**`);
  md.push(`- **Current clean ACT-HV total (live, post-Jan, deduped): ${f(currentCleanTotal)}** — ${currentCleanBills.length} bills + ${cleanTxns.length} txns`);
  md.push(`- Placeholder-bill dups dropped: ${phBill.size} · bill-payment overlaps dropped: ${overlapTxn.size}`);
  md.push(`- **Re-tag candidate pool (live spend OFF ACT-HV for these vendors): ${f(retagCandidates.reduce((a, r) => a + Number(r.total), 0))} across ${retagCandidates.length} rows**`);
  md.push('');
  md.push('## B) Re-tag candidates — live spend NOT on ACT-HV (review each: is it Harvest?)');
  md.push('');
  md.push('| Date | Vendor | $ | Kind | Status | Current proj | Source |');
  md.push('|---|---|---:|---|---|---|---|');
  for (const r of retagCandidates.sort((a, b) => Number(b.total) - Number(a.total))) {
    md.push(`| ${r.date} | ${r.contact_name} | ${f(r.total)} | ${r.k} | ${r.status} | ${r.project_code || 'NULL'} | ${r.project_code_source || ''} |`);
  }
  md.push('');
  md.push('## A) Per-vendor detail (all post-Jan rows for ACT-HV vendors)');
  md.push('');
  const vsorted = [...byVendor.entries()].sort((a, b) => {
    const sum = (rows) => rows.filter(r => (r.k === 'bill' ? liveBillStatus(r.status) : liveTxnStatus(r.status))).reduce((s, r) => s + Number(r.total), 0);
    return sum(b[1]) - sum(a[1]);
  });
  for (const [v, rows] of vsorted) {
    md.push(`### ${v}`);
    md.push('| Date | $ | Kind | Status | Proj | inv# | Source |');
    md.push('|---|---:|---|---|---|---|---|');
    for (const r of rows.sort((a, b) => a.date.localeCompare(b.date))) {
      md.push(`| ${r.date} | ${f(r.total)} | ${r.k} | ${r.status} | ${r.project_code || 'NULL'} | ${r.invoice_number || '-'} | ${r.project_code_source || ''} |`);
    }
    md.push('');
  }
  const outPath = `thoughts/shared/reports/harvest-resweep-worklist-${TODAY}.md`;
  writeFileSync(outPath, md.join('\n'));
  console.log(`Vendors: ${vendors.length}`);
  console.log(`CURRENT CLEAN ACT-HV (live, deduped): ${f(currentCleanTotal)}  (${currentCleanBills.length} bills + ${cleanTxns.length} txns)`);
  console.log(`Placeholder dups dropped: ${phBill.size} | overlaps dropped: ${overlapTxn.size}`);
  console.log(`RE-TAG CANDIDATE POOL (live, off ACT-HV): ${f(retagCandidates.reduce((a, r) => a + Number(r.total), 0))} across ${retagCandidates.length} rows`);
  console.log(`\nTop re-tag candidates:`);
  for (const r of retagCandidates.sort((a, b) => Number(b.total) - Number(a.total)).slice(0, 20))
    console.log(`  ${r.date} ${f(r.total).padStart(12)} ${r.status.padEnd(10)} ${(r.project_code || 'NULL').padEnd(9)} ${r.contact_name}`);
  console.log(`\nWorklist: ${outPath}`);
}
main().catch(e => { console.error(e); process.exit(1); });
