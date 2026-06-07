#!/usr/bin/env node
/**
 * Goods funder ledger (derived from Xero) vs LIVE GHL opportunities. READ-ONLY.
 *
 * LEDGER = ACCREC where project_code='ACT-GD', grouped by funder →
 *          cash_received (Σ amount_paid), due (Σ amount_due), #inv.
 * GHL    = live ghl_opportunities (mirror, synced ~6h), all pipelines, matched to a
 *          Goods funder by normalized name OR sitting in a 'Goods' pipeline.
 *          Per funder: ghl_paid (Σ value on Paid/Won stages), ghl_open (Σ other), pipelines.
 * DIFF   = Xero cash vs GHL paid, classified, with reconciliation.
 *
 * Outputs: /tmp/goods-funder-diff.json + thoughts/shared/financials/2026-05-30-goods-funder-ledger-vs-ghl.md
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = n => Math.round(Number(n) || 0);

// fuzzy funder key: strip punctuation + org-suffix stopwords, keep distinctive first token
const STOP = new Set('the foundation inc incorporated limited ltd council aboriginal corporation corp company co pty service services health role models division australia outback eclub of and goods beds buyer demand'.split(' '));
const tokens = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w));
const keyOf = s => tokens(s)[0] || (s || '').toLowerCase();
const isPaidStage = (stage, status) =>
  /paid|won|steward|reporting|committed|renew/i.test(stage || '') || /won|paid/i.test(status || '');

async function fetchAll(table, select, build) {
  let all = [], from = 0;
  for (;;) {
    let q = sb.from(table).select(select);
    if (build) q = build(q);
    q = q.order('id', { ascending: true }).range(from, from + 999);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    all = all.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return all;
}

// --- Xero ACT-GD ledger ---
let goods = [], gf = 0;
for (;;) {
  const { data, error } = await sb.from('xero_invoices')
    .select('xero_id,contact_name,status,amount_paid,amount_due')
    .eq('type', 'ACCREC').eq('project_code', 'ACT-GD')
    .order('xero_id', { ascending: true }).range(gf, gf + 999);
  if (error) throw new Error(error.message);
  goods = goods.concat(data || []);
  if (!data || data.length < 1000) break; gf += 1000;
}
const seenX = new Set();
goods = goods.filter(r => !seenX.has(r.xero_id) && seenX.add(r.xero_id));
const ledger = new Map();
for (const r of goods) {
  const k = keyOf(r.contact_name);
  const o = ledger.get(k) || { funder: r.contact_name, cash: 0, due: 0, n: 0 };
  o.n++; o.cash += Number(r.amount_paid || 0); o.due += Number(r.amount_due || 0);
  if ((r.contact_name || '').length > (o.funder || '').length) o.funder = r.contact_name;
  ledger.set(k, o);
}

// --- live GHL opps ---
const opps = await fetchAll('ghl_opportunities', 'id,name,monetary_value,pipeline_name,stage_name,status');
const ghl = new Map();   // key -> {paid, open, pipelines:Set, names:Set}
for (const o of opps) {
  const inGoodsPipeline = /goods/i.test(o.pipeline_name || '');
  const k = keyOf(o.name);
  const matchesFunder = ledger.has(k);
  if (!inGoodsPipeline && !matchesFunder) continue;     // ignore unrelated opps
  const g = ghl.get(k) || { paid: 0, open: 0, pipelines: new Set(), names: new Set() };
  const v = Number(o.monetary_value || 0);
  if (isPaidStage(o.stage_name, o.status)) g.paid += v; else g.open += v;
  if (o.pipeline_name) g.pipelines.add(o.pipeline_name);
  if (o.name) g.names.add(o.name);
  ghl.set(k, g);
}

// --- diff (union of funder keys) ---
const keys = new Set([...ledger.keys(), ...ghl.keys()]);
const rows = [...keys].map(k => {
  const x = ledger.get(k);
  const g = ghl.get(k);
  const cash = r2(x?.cash || 0), due = r2(x?.due || 0);
  const paid = r2(g?.paid || 0), open = r2(g?.open || 0);
  let verdict;
  if (x && !g) verdict = 'XERO_ONLY';                       // real cash, no GHL opp at all
  else if (!x && g) verdict = g.paid > 0 ? 'GHL_PAID_NO_XERO' : 'GHL_PROSPECT'; // claimed paid w/o Xero = phantom; else just a prospect
  else if (Math.abs(cash - paid) <= 50) verdict = 'MATCH';
  else verdict = 'DRIFT';
  return {
    funder: (x?.funder) || [...(g?.names || [])][0] || k,
    xero_cash: cash, xero_due: due, ghl_paid: paid, ghl_open: open,
    gap: paid - cash, pipelines: [...(g?.pipelines || [])], verdict,
  };
}).sort((a, b) => Math.max(b.xero_cash, b.ghl_paid) - Math.max(a.xero_cash, a.ghl_paid));

const xeroCash = r2(goods.reduce((s, r) => s + Number(r.amount_paid || 0), 0));
const xeroDue = r2(goods.reduce((s, r) => s + Number(r.amount_due || 0), 0));
const ghlPaid = r2([...ghl.values()].reduce((s, g) => s + g.paid, 0));
const ghlOpen = r2([...ghl.values()].reduce((s, g) => s + g.open, 0));

const out = {
  db: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/https?:\/\//, '').split('.')[0],
  totals: { xero_cash: xeroCash, xero_due: xeroDue, ghl_paid: ghlPaid, ghl_open_pipeline: ghlOpen },
  rows,
  counts: rows.reduce((m, r) => ((m[r.verdict] = (m[r.verdict] || 0) + 1), m), {}),
};
writeFileSync('/tmp/goods-funder-diff.json', JSON.stringify(out, null, 2));

const V = { MATCH: '🟢', DRIFT: '🟡', XERO_ONLY: '🔵', GHL_PAID_NO_XERO: '🔴', GHL_PROSPECT: '⚪' };
const md = `# Goods funder ledger (Xero truth) vs LIVE GHL opportunities

**Generated:** 2026-05-30 · read-only · DB \`${out.db}\` · tool \`scripts/goods-funder-ledger-diff.mjs\`
**GHL source:** live \`ghl_opportunities\` mirror (NOT the obsolete seed).

## Totals

| | Amount |
|---|---|
| Xero cash received (ACT-GD) | **$${xeroCash.toLocaleString()}** |
| Xero still owed (due) | $${xeroDue.toLocaleString()} |
| GHL "paid/won" across Goods pipelines | $${ghlPaid.toLocaleString()} |
| GHL open pipeline (prospects/cultivating) | $${ghlOpen.toLocaleString()} |

Verdict counts: ${Object.entries(out.counts).map(([k, v]) => `${V[k] || ''} ${k}=${v}`).join(' · ')}

## Per-funder

| | Funder | Xero cash | Xero due | GHL paid | GHL open | Pipelines |
|---|---|---|---|---|---|---|
${rows.map(r => `| ${V[r.verdict]} ${r.verdict} | ${r.funder} | $${r.xero_cash.toLocaleString()} | $${r.xero_due.toLocaleString()} | $${r.ghl_paid.toLocaleString()} | $${r.ghl_open.toLocaleString()} | ${r.pipelines.join(', ')} |`).join('\n')}

> 🟢 MATCH = Xero cash ≈ GHL paid · 🟡 DRIFT = both exist, disagree · 🔵 XERO_ONLY = real cash, no GHL opp ·
> 🔴 GHL_PAID_NO_XERO = GHL marks paid but no Xero ACT-GD cash (phantom) · ⚪ GHL_PROSPECT = open opp, no cash yet.

_Full JSON: /tmp/goods-funder-diff.json_
`;
writeFileSync('thoughts/shared/financials/2026-05-30-goods-funder-ledger-vs-ghl.md', md);

console.log(`Xero cash $${xeroCash.toLocaleString()} (due $${xeroDue.toLocaleString()})  ·  GHL paid $${ghlPaid.toLocaleString()}  ·  GHL open $${ghlOpen.toLocaleString()}`);
console.log(`Counts:`, out.counts, '\n');
for (const r of rows.slice(0, 20)) console.log(`  ${V[r.verdict]} ${r.verdict.padEnd(17)} ${r.funder.slice(0,32).padEnd(32)} Xero $${r.xero_cash.toLocaleString().padStart(9)} (due ${r.xero_due.toLocaleString()})  GHLpaid $${r.ghl_paid.toLocaleString().padStart(8)}  [${r.pipelines.join(', ')}]`);
console.log(`\n→ thoughts/shared/financials/2026-05-30-goods-funder-ledger-vs-ghl.md`);
