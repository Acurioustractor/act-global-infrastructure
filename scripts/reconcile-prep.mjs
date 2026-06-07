#!/usr/bin/env node
/**
 * Reconcile-prep (DRY-RUN, read-only) — classify each unreconciled NAB Visa #8815
 * SPEND BankTransaction by the live-Xero action that makes the Reconcile tab clean 1:1.
 *
 * Candidates are generated from the Supabase mirror (fast), but STATUS IS VERIFIED
 * AGAINST LIVE XERO in batched IDs= calls — the mirror conflates spend-money/bills/
 * statement lines and is stale on status (RNM "AUTHORISED bill" is actually VOIDED live).
 *
 * Writes NOTHING to Xero. Emits a per-line action plan + a recommended tracer.
 *
 * Usage:
 *   node scripts/reconcile-prep.mjs --limit 40      # scope-test (default 40, biggest $ first)
 *   node scripts/reconcile-prep.mjs --all           # full 493
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';
import { writeFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const xero = await createXeroClient(sb);
const args = process.argv.slice(2);
const ALL = args.includes('--all');
const LIMIT = ALL ? 1e9 : (args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 40);
const ACC = `'NAB Visa ACT #8815'`;

const tok = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
const nameOverlap = (a, b) => { const A = new Set(tok(a)); return tok(b).some(w => A.has(w)); };
const amtMatch = (a, b) => Math.abs(a - b) <= Math.max(5, a * 0.02); // surcharge tolerance
const dayDiff = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);

// --- 1. mirror: the unreconciled NAB SPEND lines (candidate set) ---
const exec = async sql => { const { data, error } = await sb.rpc('exec_sql', { query: sql }); if (error) throw new Error(error.message); return data; };
// exec_sql ALSO caps row-dumps at 1000 (memory: command-center-finance-truth) → paginate.
const execPaged = async (cols, from, where, order) => {
  const rows = []; let off = 0;
  for (;;) { const page = await exec(`SELECT ${cols} FROM ${from} WHERE ${where} ORDER BY ${order} LIMIT 1000 OFFSET ${off}`);
    rows.push(...page); if (page.length < 1000) break; off += 1000; }
  return rows;
};
const lines = await execPaged('xero_transaction_id id, contact_name, date::text, ABS(total)::numeric(12,2) total, has_attachments',
  'xero_transactions', `bank_account=${ACC} AND type LIKE 'SPEND%' AND is_reconciled=false AND status IS DISTINCT FROM 'DELETED'`, 'ABS(total) DESC, xero_transaction_id');
const bills = await execPaged('xero_id, contact_name, date::text, ABS(total)::numeric(12,2) total, status, has_attachments',
  'xero_invoices', `type='ACCPAY' AND status NOT IN ('DELETED')`, 'xero_id');

console.log(`Mirror: ${lines.length} unreconciled NAB SPEND lines · ${bills.length} ACCPAY bills`);
const sample = lines.slice(0, LIMIT);
console.log(`Verifying ${sample.length} lines against LIVE Xero…\n`);

// --- 2. candidate match (mirror) ---
for (const L of sample) {
  L.cands = bills.filter(b => amtMatch(L.total, b.total) && dayDiff(L.date, b.date) <= 14 &&
    (!L.contact_name || !b.contact_name || nameOverlap(L.contact_name, b.contact_name)));
  // sibling unreconciled lines (potential dup) — same total, name overlap, date within 3d
  L.siblings = lines.filter(o => o.id !== L.id && Math.abs(o.total - L.total) < 0.02 &&
    dayDiff(o.date, L.date) <= 3 && nameOverlap(o.contact_name, L.contact_name));
}

// --- 3. LIVE verify candidate bills (batched IDs=) ---
const billIds = [...new Set(sample.flatMap(L => L.cands.map(c => c.xero_id)))];
const liveBill = new Map();
for (let i = 0; i < billIds.length; i += 40) {
  const batch = billIds.slice(i, i + 40);
  const r = await xero.get(`Invoices?IDs=${batch.join(',')}`);
  for (const inv of (r.Invoices || [])) liveBill.set(inv.InvoiceID, { status: inv.Status, total: inv.Total, due: inv.AmountDue, att: inv.HasAttachments, num: inv.InvoiceNumber });
}

// --- LIVE verify each bank txn via SINGLE GET ---
// CRITICAL: the batch `BankTransactions?IDs=` endpoint does NOT reliably return
// IsReconciled, and the mirror's is_reconciled is stale (Belong: mirror=false, live=true).
// Only a per-line GET gives the true recon flag — the one thing that makes a delete safe.
const liveTxn = new Map();
let done = 0;
for (const L of sample) {
  try {
    const r = await xero.get(`BankTransactions/${L.id}`);
    const t = r.BankTransactions?.[0];
    if (t) liveTxn.set(L.id, { recon: t.IsReconciled, status: t.Status, att: t.HasAttachments, total: Math.abs(t.Total), date: t.DateString?.slice(0, 10), contact: t.Contact?.Name });
  } catch (e) { liveTxn.set(L.id, { error: e.message?.slice(0, 60) }); }
  if (++done % 50 === 0) console.log(`  …${done}/${sample.length} txns verified`);
}
const trueUnrec = [...liveTxn.values()].filter(v => v.recon === false).length;
console.log(`Live recon check: ${trueUnrec} genuinely unreconciled of ${sample.length} (mirror claimed all unreconciled)`);

// --- 4. classify with 1:1 bill<->line assignment (no bill reused across lines) ---
const ACTIONS = { DELETE_PHANTOM: [], FLAG_AMBIGUOUS: [], DELETE_DUP: [], ATTACH: [], MATCH_CLEAN: [], ALREADY_DONE: [] };
const active = [];
for (const L of sample) {
  const lt = liveTxn.get(L.id);
  if (lt && (lt.recon === true || lt.status === 'DELETED')) { ACTIONS.ALREADY_DONE.push({ L, why: `live: recon=${lt.recon} status=${lt.status}` }); continue; }
  L.hasRecLive = lt ? lt.att : L.has_attachments;
  L.reconConfirmedFalse = (lt && lt.recon === false); // ONLY these may be deleted
  active.push(L);
}
// build candidate (line,bill) pairs with a quality score; live bills only, not voided/deleted
const exactAmt = (a, b) => Math.abs(a - b) < 0.02;
const pairs = [];
for (const L of active) for (const c of L.cands) {
  const lb = liveBill.get(c.xero_id); if (!lb || lb.status === 'VOIDED' || lb.status === 'DELETED') continue;
  const exact = exactAmt(L.total, Math.abs(lb.total)), name = nameOverlap(L.contact_name, c.contact_name);
  const q = (exact ? 4 : 0) + (name ? 2 : 0) + (lb.att ? 1 : 0); // exact+name+receipt best
  pairs.push({ L, billId: c.xero_id, lb, contact: c.contact_name, exact, name, q });
}
// greedy 1:1 assignment, best quality first
pairs.sort((a, b) => b.q - a.q || b.L.total - a.L.total);
const lineTaken = new Set(), billTaken = new Set();
for (const p of pairs) {
  if (lineTaken.has(p.L.id) || billTaken.has(p.billId)) continue;
  lineTaken.add(p.L.id); billTaken.add(p.billId); p.L.assigned = p;
}
for (const L of active) {
  const a = L.assigned;
  if (a && a.lb.status === 'PAID') {
    // only auto-propose delete when confident AND live-confirmed unreconciled
    const conf = a.exact && a.name && a.lb.att ? 'high' : (a.exact || (a.name && a.lb.att)) ? 'medium' : 'low';
    if (conf === 'low' || !L.reconConfirmedFalse) { ACTIONS.MATCH_CLEAN.push({ L, note: `PAID-bill match $${a.lb.total}${L.reconConfirmedFalse ? ' (loose — verify)' : ' (recon status UNCONFIRMED — do not delete)'}` }); }
    else ACTIONS.DELETE_PHANTOM.push({ L, bill: a, conf });
  } else if (a && a.lb.status === 'AUTHORISED') {
    ACTIONS.FLAG_AMBIGUOUS.push({ L, bill: a });
  } else if (L.reconConfirmedFalse && L.siblings.some(s => lineTaken.has(s.id) || s.has_attachments)) {
    ACTIONS.DELETE_DUP.push({ L });
  } else if (!L.hasRecLive) {
    ACTIONS.ATTACH.push({ L });
  } else {
    ACTIONS.MATCH_CLEAN.push({ L });
  }
}

// --- 5. report ---
const fmt = x => `${x.L.date} · ${x.L.contact_name || '(no name)'} · $${x.L.total}`;
const out = [`# Reconcile-prep dry-run — NAB Visa #8815  ·  ${sample.length}/${lines.length} lines live-verified`, ''];
const order = ['DELETE_PHANTOM', 'DELETE_DUP', 'ATTACH', 'FLAG_AMBIGUOUS', 'MATCH_CLEAN', 'ALREADY_DONE'];
const blurb = {
  DELETE_PHANTOM: 'Live PAID bill already covers this card movement → delete the Dext dup spend-money (API). Safest write.',
  DELETE_DUP: 'Two unreconciled spend-money for one movement → delete the worse copy (needs per-pair pick).',
  ATTACH: 'Real + clean but no receipt → attach if we have one (e.g. Supabase), else receipt-chase.',
  FLAG_AMBIGUOUS: 'Live AUTHORISED (unpaid) bill matches → HUMAN/SL decides: pay bill or void. No auto-action.',
  MATCH_CLEAN: 'Correctly coded + receipted → no API action; Ben just matches the statement line.',
  ALREADY_DONE: 'Live Xero shows already reconciled/deleted since the mirror sync.',
};
for (const k of order) {
  const items = ACTIONS[k];
  out.push(`## ${k} — ${items.length}`, `_${blurb[k]}_`, '');
  for (const x of items.slice(0, 60)) {
    let extra = '';
    if (x.bill) extra = ` → bill ${x.bill.lb.status} $${x.bill.lb.total} (att=${x.bill.lb.att}) ${x.bill.lb.num || x.bill.billId}` + (x.conf ? ` [${x.conf}]` : '');
    if (x.note) extra = ` — ${x.note}`;
    if (x.why) extra = ` — ${x.why}`;
    out.push(`- ${fmt(x)}${extra}`);
  }
  if (items.length > 60) out.push(`  …+${items.length - 60} more`);
  out.push('');
}
console.log(order.map(k => `${k}: ${ACTIONS[k].length}`).join('  ·  '));
// tracer = SMALLEST high-confidence phantom (lowest blast radius), not the biggest
const tracer = ACTIONS.DELETE_PHANTOM.filter(x => x.conf === 'high').sort((a, b) => a.L.total - b.L.total)[0];
if (tracer) { out.push('## ▶ Recommended tracer (smallest high-confidence DELETE_PHANTOM)', `- ${fmt(tracer)} → delete spend-money \`${tracer.L.id}\`; PAID bill \`${tracer.bill.billId}\` (${tracer.bill.lb.num || ''}) keeps the receipt.`); console.log(`\n▶ Tracer: ${fmt(tracer)} (delete spend-money ${tracer.L.id})`); }
const path = `thoughts/shared/recon-pack/reconcile-prep-dryrun-${ALL ? 'full' : 'sample'}.md`;
writeFileSync(path, out.join('\n'));
console.log(`\nReport: ${path}`);
