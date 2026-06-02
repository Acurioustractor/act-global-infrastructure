#!/usr/bin/env node
/**
 * Emit the DELETE_DUP plan: two+ unreconciled NAB Visa #8815 spend-money for ONE real
 * charge (NO paid-bill anchor — the keeper is another spend-money). READ-ONLY.
 *
 * SAFETY: a cluster is a TRUE duplicate ONLY when 2+ members share the same non-empty
 * bank Reference (the card's unique txn id). Same amount+date+vendor but DIFFERENT refs
 * = two separate real charges → NOT a dup (flagged, never auto-deleted).
 *
 * Writes: recon-pack/dup-plan.json  [{deleteTxnId, keepTxnId, reference, amount, vendor, date}]
 *         recon-pack/dup-review.md   (TRUE dups + the FLAGGED non-dups for human review)
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';
import { writeFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const xero = await createXeroClient(sb);
const ACC = `'NAB Visa ACT #8815'`;
const tok = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
const nameOverlap = (a, b) => { const A = new Set(tok(a)); return tok(b).some(w => A.has(w)); };
const dayDiff = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000);
const exec = async sql => { const { data, error } = await sb.rpc('exec_sql', { query: sql }); if (error) throw new Error(error.message); return data; };
const execPaged = async (cols, from, where, order) => { const rows = []; let off = 0; for (;;) { const p = await exec(`SELECT ${cols} FROM ${from} WHERE ${where} ORDER BY ${order} LIMIT 1000 OFFSET ${off}`); rows.push(...p); if (p.length < 1000) break; off += 1000; } return rows; };

const lines = await execPaged('xero_transaction_id id, contact_name, date::text, ABS(total)::numeric(12,2) total',
  'xero_transactions', `bank_account=${ACC} AND type LIKE 'SPEND%' AND is_reconciled=false AND status IS DISTINCT FROM 'DELETED'`, 'ABS(total) DESC, xero_transaction_id');

// cluster by amount; within, group by name-overlap + date within 3d
const byAmt = new Map();
for (const L of lines) { const k = L.total.toFixed(2); (byAmt.get(k) || byAmt.set(k, []).get(k)).push(L); }
const clusters = [];
for (const [, group] of byAmt) {
  if (group.length < 2) continue;
  const used = new Set();
  for (const L of group) {
    if (used.has(L.id)) continue;
    const cl = [L]; used.add(L.id);
    for (const o of group) if (!used.has(o.id) && nameOverlap(L.contact_name, o.contact_name) && dayDiff(L.date, o.date) <= 3) { cl.push(o); used.add(o.id); }
    if (cl.length >= 2) clusters.push(cl);
  }
}
console.log(`Mirror: ${lines.length} unreconciled lines → ${clusters.length} same-amount/vendor/≤3d clusters to verify live`);

// live-verify every clustered member (reference + current recon/status)
const ids = clusters.flat().map(L => L.id);
const live = new Map();
let n = 0;
for (const id of ids) { try { const t = (await xero.get(`BankTransactions/${id}`)).BankTransactions?.[0]; if (t) live.set(id, { ref: (t.Reference || '').trim(), status: t.Status, recon: t.IsReconciled, att: t.HasAttachments, total: Math.abs(t.Total), date: t.DateString?.slice(0, 10), contact: t.Contact?.Name }); } catch {} if (++n % 25 === 0) console.log(`  …${n}/${ids.length}`); }

const dupPlan = [], flagged = [];
for (const cl of clusters) {
  const members = cl.map(L => ({ id: L.id, ...live.get(L.id) })).filter(m => m.status && m.recon === false && m.status !== 'DELETED');
  if (members.length < 2) continue; // sibling already gone (e.g. deleted as a phantom)
  // group members by reference
  const byRef = new Map();
  for (const m of members) if (m.ref) (byRef.get(m.ref) || byRef.set(m.ref, []).get(m.ref)).push(m);
  let madeDup = false;
  for (const [ref, ms] of byRef) {
    if (ms.length < 2) continue;
    const keep = ms.find(m => m.att) || ms[0];
    for (const m of ms) if (m.id !== keep.id) { dupPlan.push({ deleteTxnId: m.id, keepTxnId: keep.id, reference: ref, amount: m.total, vendor: m.contact, date: m.date }); madeDup = true; }
  }
  if (!madeDup) flagged.push(members); // same amount/vendor/date but distinct refs (or no ref) → separate charges
}
dupPlan.sort((a, b) => a.amount - b.amount);

writeFileSync('thoughts/shared/recon-pack/dup-plan.json', JSON.stringify(dupPlan, null, 2));
const md = ['# DELETE_DUP review — NAB Visa #8815', '',
  `## TRUE duplicates (same bank Reference) — ${dupPlan.length} safe to delete`, ''];
for (const d of dupPlan) md.push(`- ${d.date} · ${d.vendor} · $${d.amount} · ref ${d.reference} → delete ${d.deleteTxnId}, keep ${d.keepTxnId}`);
md.push('', `## FLAGGED — same amount/vendor/≤3d but DIFFERENT or NO reference (likely separate charges — NOT auto-deleted) — ${flagged.length} clusters`, '');
for (const f of flagged) md.push(`- ${f[0].date} · ${f[0].vendor} · $${f[0].total} · refs: [${f.map(m => m.ref || '∅').join(', ')}] (${f.length} txns)`);
writeFileSync('thoughts/shared/recon-pack/dup-review.md', md.join('\n'));
console.log(`\nTRUE dups (same ref): ${dupPlan.length}  ·  FLAGGED (different/no ref): ${flagged.length} clusters`);
console.log(`dup-plan.json + dup-review.md written`);
