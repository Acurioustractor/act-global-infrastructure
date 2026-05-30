#!/usr/bin/env node
/**
 * READ-ONLY probe: is the funder/project truth set at the TOPMOST level in Xero
 * (the "Project Tracking" tracking category), and what is the Goods (ACT-GD)
 * funder cash ledger derived from it?
 *
 * No writes. Reads the command-center finance DB (NEXT_PUBLIC_SUPABASE_URL),
 * the same DB the /finance/mirror surface uses, so numbers reconcile.
 *
 * Output: compact summary to stdout + full JSON to /tmp/goods-funder-truth.json
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Extract Project-Tracking option codes from a line_items[] blob, tolerating key casing.
function trackingOptions(lineItems) {
  const opts = [];
  for (const li of Array.isArray(lineItems) ? lineItems : []) {
    const tr = li.tracking || li.Tracking || [];
    for (const t of Array.isArray(tr) ? tr : []) {
      const opt = t.option ?? t.Option ?? t.optionName ?? t.Name ?? t.name;
      if (opt) opts.push(String(opt));
    }
  }
  return [...new Set(opts)];
}

// Ordered pagination by xero_id (unordered .range() returns duplicate rows).
async function fetchAll(select, build) {
  let all = [], from = 0;
  for (;;) {
    let q = sb.from('xero_invoices').select(select);
    if (build) q = build(q);
    q = q.order('xero_id', { ascending: true }).range(from, from + 999);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    all = all.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  const seen = new Set();
  return all.filter(r => !seen.has(r.xero_id) && seen.add(r.xero_id));
}

const ACCREC = await fetchAll(
  'xero_id,contact_name,type,status,total,amount_paid,amount_due,line_items,project_code,income_type',
  q => q.eq('type', 'ACCREC')
);

const r2 = n => Math.round(Number(n) || 0);
const isGoods = r =>
  r.project_code === 'ACT-GD' || trackingOptions(r.line_items).includes('ACT-GD');

// --- 1. Coverage: is income classified at the topmost level (Xero tracking)? ---
const withTracking = ACCREC.filter(r => trackingOptions(r.line_items).length);
const withProjectCode = ACCREC.filter(r => r.project_code);
const withIncomeType = ACCREC.filter(r => r.income_type);
const trackingDist = {};
for (const r of ACCREC)
  for (const o of trackingOptions(r.line_items)) trackingDist[o] = (trackingDist[o] || 0) + 1;

// --- 2. Goods (ACT-GD) funder ledger derived from Xero ---
const goods = ACCREC.filter(isGoods);
const byFunder = new Map();
for (const r of goods) {
  const k = r.contact_name || '(no contact)';
  const o = byFunder.get(k) || { invoiced_paid: 0, cash_received: 0, due: 0, n: 0, tagged_xero: false };
  o.n++;
  o.cash_received += Number(r.amount_paid || 0);
  o.due += Number(r.amount_due || 0);
  if (r.status === 'PAID') o.invoiced_paid += Number(r.total || 0);
  if (trackingOptions(r.line_items).includes('ACT-GD')) o.tagged_xero = true; // tagged IN Xero vs only project_code
  byFunder.set(k, o);
}
const goodsFunders = [...byFunder.entries()]
  .sort((a, b) => b[1].cash_received - a[1].cash_received)
  .map(([name, o]) => ({
    funder: name.slice(0, 42),
    cash_received: r2(o.cash_received),
    due: r2(o.due),
    n: o.n,
    in_xero_tracking: o.tagged_xero,   // true = truth is at topmost level; false = only project_code in Supabase
  }));

// --- 3. Cross-check the pasted-plan funders by name (do they exist in Xero, as what?) ---
const ALL = await fetchAll('xero_id,contact_name,type,status,total,amount_paid,amount_due,line_items,project_code');
const terms = {
  PICC: 'picc', 'Funding Network (TFN)': 'funding network', FRRR: 'frrr', AMP: 'amp ',
  'Regional Arts': 'regional arts', Dusseldorp: 'dusseldorp', 'Paul Ramsay': 'ramsay',
  'Red Dust': 'red dust', Centrecorp: 'centrecorp',
};
const crosscheck = {};
for (const [label, term] of Object.entries(terms)) {
  const m = ALL.filter(r => (r.contact_name || '').toLowerCase().includes(term));
  crosscheck[label] = {
    found: m.length,
    names: [...new Set(m.map(r => r.contact_name))].slice(0, 4),
    types: [...new Set(m.map(r => r.type))],
    cash_received: r2(m.reduce((s, r) => s + Number(r.amount_paid || 0), 0)),
    due: r2(m.reduce((s, r) => s + Number(r.amount_due || 0), 0)),
    tagged_ACT_GD: m.some(r => trackingOptions(r.line_items).includes('ACT-GD')),
  };
}

const out = {
  db: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/https?:\/\//, '').split('.')[0],
  accrec_unique: ACCREC.length,
  coverage: {
    with_xero_tracking: withTracking.length,
    with_project_code: withProjectCode.length,
    with_income_type: withIncomeType.length,
    pct_xero_tracking: Math.round((withTracking.length / ACCREC.length) * 100),
  },
  tracking_distribution: Object.fromEntries(
    Object.entries(trackingDist).sort((a, b) => b[1] - a[1])
  ),
  goods: {
    invoice_count: goods.length,
    cash_received: r2(goods.reduce((s, r) => s + Number(r.amount_paid || 0), 0)),
    due: r2(goods.reduce((s, r) => s + Number(r.amount_due || 0), 0)),
    funders: goodsFunders,
  },
  crosscheck,
};

writeFileSync('/tmp/goods-funder-truth.json', JSON.stringify(out, null, 2));

// Compact stdout
console.log(`DB: ${out.db}  ·  ACCREC unique: ${out.accrec_unique}`);
console.log(`Coverage — Xero tracking: ${out.coverage.with_xero_tracking} (${out.coverage.pct_xero_tracking}%) · project_code: ${out.coverage.with_project_code} · income_type: ${out.coverage.with_income_type}`);
console.log(`\nProject Tracking distribution on ACCREC (top): ` +
  Object.entries(out.tracking_distribution).slice(0, 8).map(([k, v]) => `${k}=${v}`).join('  '));
console.log(`\nGoods (ACT-GD): ${out.goods.invoice_count} inv · cash $${out.goods.cash_received.toLocaleString()} · due $${out.goods.due.toLocaleString()}`);
console.log(`Top Goods funders (cash · in_xero_tracking):`);
for (const f of out.goods.funders.slice(0, 12))
  console.log(`  ${f.in_xero_tracking ? '🟢' : '🟡'} ${f.funder.padEnd(42)} $${f.cash_received.toLocaleString().padStart(10)}  due $${f.due.toLocaleString()}  (${f.n})`);
console.log(`\nCross-check pasted-plan funders:`);
for (const [k, v] of Object.entries(out.crosscheck))
  console.log(`  ${k.padEnd(22)} found=${v.found} types=${v.types.join(',') || '—'} cash=$${v.cash_received.toLocaleString()} due=$${v.due.toLocaleString()} ACT-GD-tagged=${v.tagged_ACT_GD}`);
console.log(`\nFull JSON → /tmp/goods-funder-truth.json`);
