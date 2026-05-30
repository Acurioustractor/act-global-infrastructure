#!/usr/bin/env node
/**
 * Phase 0 audit (READ-ONLY): how well is Xero's `Project Tracking` category
 * populated on income, and what is the re-tag worklist to make Xero the source?
 *
 * Distinguishes `Project Tracking` from `Business Divisions` (a line can carry
 * one option per category). Compares the Project-Tracking option against the
 * clean Supabase `project_code`, classifies each ACCREC invoice, and splits the
 * backfill worklist by Xero period lock (≤ 2025-09-30 = locked, route to SL).
 *
 * No writes. Reads the command-center finance DB (NEXT_PUBLIC_SUPABASE_URL).
 * Outputs JSON to /tmp/xero-tracking-audit.json and a markdown audit doc.
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const LOCK_DATE = '2025-09-30';            // FY26-Q1 BAS lodged; invoices on/before this are locked in Xero
const PROJECT_CAT = 'Project Tracking';

// --- canonical option set from the exported chart ---
const chart = JSON.parse(readFileSync('config/xero-chart.json', 'utf8'));
const projCat = (chart.tracking_categories || []).find(c => (c.name || c.Name) === PROJECT_CAT);
const canonicalOptions = (projCat?.options || projCat?.Options || []).map(o => o.name || o.Name);
const codeToOption = {};        // 'ACT-GD' -> 'ACT-GD — Goods'
for (const opt of canonicalOptions) {
  const code = opt.split('—')[0].trim();        // em-dash separator
  if (/^ACT-[A-Z0-9]{2,3}$/.test(code)) codeToOption[code] = opt;
}
const canonicalSet = new Set(canonicalOptions);

// --- helpers ---
const r2 = n => Math.round(Number(n) || 0);
function projectOption(lineItems) {
  for (const li of Array.isArray(lineItems) ? lineItems : []) {
    for (const t of (li.tracking || li.Tracking || [])) {
      if ((t.Name || t.name) === PROJECT_CAT) return t.Option ?? t.option ?? null;
    }
  }
  return null;
}
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

const COLS = 'xero_id,contact_name,type,status,total,amount_paid,amount_due,date,line_items,project_code,income_type';
const accrec = await fetchAll(COLS, q => q.eq('type', 'ACCREC'));
const accpay = await fetchAll('xero_id,type,date,line_items,project_code', q => q.eq('type', 'ACCPAY'));

// --- classify each ACCREC ---
const rows = accrec.map(r => {
  const opt = projectOption(r.line_items);
  const code = r.project_code || null;
  const canonical = code ? (codeToOption[code] || null) : null;
  const locked = (r.date || '').slice(0, 10) <= LOCK_DATE && (r.date || '') !== '';
  let cls;
  if (opt && canonical && opt === canonical) cls = 'MATCH';
  else if (opt && canonical && opt !== canonical) cls = 'WRONG';      // Xero option disagrees with project_code
  else if (!opt && code) cls = 'MISSING';                             // backfill candidate
  else if (opt && !code) cls = 'CODE_FROM_OPT';                       // Xero has it, Supabase code blank
  else cls = 'NEITHER';
  return { ...r, opt, code, canonical, locked, cls };
});

const sum = (arr, f) => r2(arr.reduce((s, r) => s + Number(f(r) || 0), 0));
const by = (arr, key) => arr.reduce((m, r) => ((m[r[key]] = (m[r[key]] || 0) + 1), m), {});

// coverage
const withProjOpt = rows.filter(r => r.opt);
const withCode = rows.filter(r => r.code);
const accpayWithOpt = accpay.filter(r => projectOption(r.line_items));

// worklist = MISSING + WRONG, split lock
const work = rows.filter(r => r.cls === 'MISSING' || r.cls === 'WRONG');
const workUnlocked = work.filter(r => !r.locked);
const workLocked = work.filter(r => r.locked);

// option usage (actual strings on ACCREC) + orphans (used but not in chart)
const optUsage = {};
for (const r of rows) if (r.opt) optUsage[r.opt] = (optUsage[r.opt] || 0) + 1;
const orphanOptions = Object.keys(optUsage).filter(o => !canonicalSet.has(o));

// per-project worklist breakdown (unlocked)
const workByProject = {};
for (const r of workUnlocked) {
  const k = r.code || '(no code)';
  const o = workByProject[k] || { n: 0, cash: 0, due: 0 };
  o.n++; o.cash += Number(r.amount_paid || 0); o.due += Number(r.amount_due || 0);
  workByProject[k] = o;
}

// Goods spotlight
const goods = rows.filter(r => r.code === 'ACT-GD');
const goodsState = by(goods, 'cls');
const goodsLocked = goods.filter(r => r.locked).length;

const out = {
  generated_for: 'Phase 0 — Xero source-of-truth audit',
  db: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/https?:\/\//, '').split('.')[0],
  lock_date: LOCK_DATE,
  canonical_project_options: canonicalOptions.length,
  accrec: {
    total: rows.length,
    with_project_tracking: withProjOpt.length,
    pct_project_tracking: Math.round((withProjOpt.length / rows.length) * 100),
    with_supabase_code: withCode.length,
    classification: by(rows, 'cls'),
  },
  accpay: {
    total: accpay.length,
    with_project_tracking: accpayWithOpt.length,
    pct_project_tracking: Math.round((accpayWithOpt.length / (accpay.length || 1)) * 100),
  },
  worklist: {
    total: work.length,
    unlocked_retaggable: workUnlocked.length,
    unlocked_cash: sum(workUnlocked, r => r.amount_paid),
    locked_to_SL: workLocked.length,
    locked_cash: sum(workLocked, r => r.amount_paid),
    by_project_unlocked: Object.fromEntries(
      Object.entries(workByProject).sort((a, b) => b[1].cash - a[1].cash)
        .map(([k, o]) => [k, { n: o.n, cash: r2(o.cash), due: r2(o.due) }])
    ),
  },
  option_usage_on_accrec: Object.fromEntries(Object.entries(optUsage).sort((a, b) => b[1] - a[1])),
  orphan_options_not_in_chart: orphanOptions,
  goods_spotlight: {
    invoices: goods.length,
    cash: sum(goods, r => r.amount_paid),
    due: sum(goods, r => r.amount_due),
    tracking_state: goodsState,
    locked: goodsLocked,
  },
};

writeFileSync('/tmp/xero-tracking-audit.json', JSON.stringify(out, null, 2));

// --- markdown audit doc ---
const md = `# Phase 0 audit — Xero \`Project Tracking\` as source of truth

**Generated:** 2026-05-30 · read-only · DB \`${out.db}\` · lock date \`${LOCK_DATE}\`
**Tool:** \`scripts/audit-xero-tracking.mjs\` (re-runnable)

## Income (ACCREC) classification

| Metric | Value |
|---|---|
| ACCREC invoices | ${out.accrec.total} |
| **With \`Project Tracking\` option (Xero, the source)** | **${out.accrec.with_project_tracking} (${out.accrec.pct_project_tracking}%)** |
| With Supabase \`project_code\` (current de-facto truth) | ${out.accrec.with_supabase_code} |

Classification (Xero Project-Tracking option vs Supabase project_code):

${Object.entries(out.accrec.classification).map(([k, v]) => `- **${k}** — ${v}`).join('\n')}

> MATCH = Xero already agrees · MISSING = code present, Xero option blank (backfill) ·
> WRONG = Xero option disagrees with code · CODE_FROM_OPT = Xero has option, Supabase blank ·
> NEITHER = no project info either side.

## Backfill worklist (Phase 2 input)

| | invoices | cash received |
|---|---|---|
| **Unlocked — re-taggable in Xero** | **${out.worklist.unlocked_retaggable}** | $${out.worklist.unlocked_cash.toLocaleString()} |
| Locked (≤ ${LOCK_DATE}) — route to Standard Ledger | ${out.worklist.locked_to_SL} | $${out.worklist.locked_cash.toLocaleString()} |

Unlocked worklist by project:

| project_code | invoices | cash | due |
|---|---|---|---|
${Object.entries(out.worklist.by_project_unlocked).map(([k, o]) => `| ${k} | ${o.n} | $${o.cash.toLocaleString()} | $${o.due.toLocaleString()} |`).join('\n')}

## \`Project Tracking\` options actually used on income

${Object.entries(out.option_usage_on_accrec).map(([k, v]) => `- ${canonicalSet.has(k) ? '🟢' : '🟠 ORPHAN'} \`${k}\` — ${v}`).join('\n')}

${out.orphan_options_not_in_chart.length ? `> ⚠️ **Orphan options** used on invoices but absent from \`config/xero-chart.json\`: ${out.orphan_options_not_in_chart.map(o => `\`${o}\``).join(', ')}. Either the chart export is stale or these were renamed/created live. Resolve before Phase 1.` : '> No orphan options.'}

## Goods (ACT-GD) spotlight

- Invoices: ${out.goods_spotlight.invoices} · cash $${out.goods_spotlight.cash.toLocaleString()} · due $${out.goods_spotlight.due.toLocaleString()} · locked: ${out.goods_spotlight.locked}
- Tracking state: ${Object.entries(out.goods_spotlight.tracking_state).map(([k, v]) => `${k}=${v}`).join(' · ')}

## Standardisation map (Phase 1 input)

Canonical \`Project Tracking\` options: ${out.canonical_project_options}. Dirty/orphan options
to merge into canonical (resolve in Phase 1): see orphan list above + any non-\`ACT-XX\` strings.

_Full JSON: /tmp/xero-tracking-audit.json_
`;
writeFileSync('thoughts/shared/financials/2026-05-30-xero-tracking-audit.md', md);

// compact stdout
console.log(`ACCREC ${out.accrec.total} · Project-Tracking ${out.accrec.with_project_tracking} (${out.accrec.pct_project_tracking}%) · Supabase code ${out.accrec.with_supabase_code}`);
console.log(`Classification:`, out.accrec.classification);
console.log(`Worklist: ${out.worklist.unlocked_retaggable} unlocked ($${out.worklist.unlocked_cash.toLocaleString()}) · ${out.worklist.locked_to_SL} locked→SL ($${out.worklist.locked_cash.toLocaleString()})`);
console.log(`ACCPAY: ${out.accpay.total} · Project-Tracking ${out.accpay.pct_project_tracking}%`);
console.log(`Orphan options:`, out.orphan_options_not_in_chart);
console.log(`Goods: ${out.goods_spotlight.invoices} inv, state`, out.goods_spotlight.tracking_state, `locked ${out.goods_spotlight.locked}`);
console.log(`\n→ thoughts/shared/financials/2026-05-30-xero-tracking-audit.md`);
