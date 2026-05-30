#!/usr/bin/env node
/**
 * Phase 2 — backfill Xero `Project Tracking` onto income invoices that lack it,
 * keyed off the clean Supabase `project_code`. Makes Xero the durable source.
 *
 * DRY-RUN by default (no writes). Builds the per-invoice worklist split by Xero
 * period lock (≤ 2025-09-30 = locked → Standard Ledger, can't edit).
 *
 *   node scripts/backfill-xero-tracking.mjs               # dry-run (default)
 *   node scripts/backfill-xero-tracking.mjs --project=ACT-GD   # scope to one project
 *   node scripts/backfill-xero-tracking.mjs --apply      # GUARDED — not implemented here;
 *                                                          apply must GET-fresh per invoice
 *                                                          + resolve live TrackingOptionID + revert log.
 *
 * Candidate = ACCREC, status AUTHORISED|PAID (excludes VOIDED/DELETED/DRAFT),
 * project_code set + mapped to a chart option, and the live-mirror Project-Tracking
 * option is missing or != canonical. Apply step re-validates against live Xero.
 *
 * Output: /tmp/xero-backfill-worklist.json + thoughts/shared/financials/2026-05-30-xero-backfill-dryrun.md
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const LOCK_DATE = '2025-09-30';
const PROJECT_CAT = 'Project Tracking';
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const projArg = (args.find(a => a.startsWith('--project=')) || '').split('=')[1] || null;

if (APPLY) {
  console.error('--apply is intentionally not wired in this tool yet. The dry-run worklist must be');
  console.error('approved first; apply will GET-fresh each invoice, resolve the live TrackingOptionID,');
  console.error('PATCH the line items, and write a revert log. Run without --apply for the dry-run.');
  process.exit(2);
}

// canonical option per project code, from the (verified-current) chart
const chart = JSON.parse(readFileSync('config/xero-chart.json', 'utf8'));
const projCat = (chart.tracking_categories || []).find(c => (c.name || c.Name) === PROJECT_CAT);
const codeToOption = {};
for (const o of (projCat?.options || projCat?.Options || [])) {
  const name = o.name || o.Name;
  const code = name.split('—')[0].trim();
  if (/^ACT-[A-Z0-9]{2,3}$/.test(code)) codeToOption[code] = name;
}

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

let rows = await fetchAll(
  'xero_id,invoice_number,contact_name,status,total,amount_paid,date,line_items,project_code',
  q => q.eq('type', 'ACCREC').in('status', ['AUTHORISED', 'PAID'])
);

const candidates = [];
for (const r of rows) {
  const code = r.project_code;
  if (!code) continue;                         // no classification to apply
  if (projArg && code !== projArg) continue;
  const canonical = codeToOption[code];
  if (!canonical) continue;                    // project_code not a chart option — skip (needs intent)
  const current = projectOption(r.line_items);
  if (current === canonical) continue;         // already correct
  const locked = (r.date || '').slice(0, 10) <= LOCK_DATE && (r.date || '') !== '';
  candidates.push({
    invoice: r.invoice_number || r.xero_id.slice(0, 8),
    contact: r.contact_name,
    date: (r.date || '').slice(0, 10),
    status: r.status,
    total: Math.round(Number(r.total || 0)),
    project_code: code,
    current_tracking: current,                 // null = MISSING; string = WRONG/stale
    proposed_option: canonical,
    kind: current ? 'WRONG/stale' : 'MISSING',
    locked,
  });
}

candidates.sort((a, b) => (a.locked - b.locked) || a.project_code.localeCompare(b.project_code) || b.total - a.total);
const unlocked = candidates.filter(c => !c.locked);
const locked = candidates.filter(c => c.locked);
const sum = arr => arr.reduce((s, c) => s + c.total, 0);
const byProject = arr => {
  const m = {};
  for (const c of arr) { const o = m[c.project_code] || { n: 0, total: 0 }; o.n++; o.total += c.total; m[c.project_code] = o; }
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1].total - a[1].total));
};

const out = {
  generated: '2026-05-30', dry_run: true, scope: projArg || 'all projects',
  lock_date: LOCK_DATE,
  unlocked: { count: unlocked.length, total: sum(unlocked), by_project: byProject(unlocked), invoices: unlocked },
  locked_to_SL: { count: locked.length, total: sum(locked), by_project: byProject(locked), invoices: locked },
};
writeFileSync('/tmp/xero-backfill-worklist.json', JSON.stringify(out, null, 2));

const fmtUSD = n => '$' + n.toLocaleString();
const md = `# Phase 2 backfill — DRY RUN (no writes)

**Generated:** 2026-05-30 · scope: ${out.scope} · lock date \`${LOCK_DATE}\` · tool \`scripts/backfill-xero-tracking.mjs\`

Set the Xero \`Project Tracking\` option (keyed off the clean Supabase \`project_code\`) on income
invoices that lack it. Apply GET-fresh-validates each invoice against live Xero and skips any
already correct. **VOIDED/DELETED/DRAFT excluded; only AUTHORISED/PAID income.**

## Unlocked — apply in Xero (${out.unlocked.count} invoices · ${fmtUSD(out.unlocked.total)})

By project:

| project_code | invoices | total |
|---|---|---|
${Object.entries(out.unlocked.by_project).map(([k, o]) => `| ${k} → ${codeToOption[k] || '?'} | ${o.n} | ${fmtUSD(o.total)} |`).join('\n')}

Per invoice:

| Invoice | Contact | Date | Status | Total | Now | → Set |
|---|---|---|---|---|---|---|
${out.unlocked.invoices.map(c => `| ${c.invoice} | ${(c.contact || '').slice(0, 28)} | ${c.date} | ${c.status} | ${fmtUSD(c.total)} | ${c.current_tracking ? '`' + c.current_tracking + '`' : '—none—'} | \`${c.proposed_option}\` |`).join('\n')}

## Locked (≤ ${LOCK_DATE}) — hand to Standard Ledger (${out.locked_to_SL.count} invoices · ${fmtUSD(out.locked_to_SL.total)})

Cannot edit in Xero (period lock). By project:

| project_code | invoices | total |
|---|---|---|
${Object.entries(out.locked_to_SL.by_project).map(([k, o]) => `| ${k} | ${o.n} | ${fmtUSD(o.total)} |`).join('\n')}

_Full JSON: /tmp/xero-backfill-worklist.json. Nothing has been written to Xero._
`;
writeFileSync('thoughts/shared/financials/2026-05-30-xero-backfill-dryrun.md', md);

// Standard Ledger handoff for the locked-period invoices (can't be tagged via Xero API)
const sl = `# Standard Ledger handoff — locked-period Project Tracking

**Generated:** 2026-05-30 · from \`scripts/backfill-xero-tracking.mjs\`

## Context

ACT is making Xero's \`Project Tracking\` category the source of truth for which project each
dollar belongs to. We've back-tagged all **unlocked** income invoices directly via the Xero API.

The **${out.locked_to_SL.count} income invoices below ($${out.locked_to_SL.total.toLocaleString()})** sit in **locked periods**
(invoice date ≤ ${LOCK_DATE}; FY26-Q1 BAS lodged), so the API refuses edits — correctly. They need
their \`Project Tracking\` option set as part of prior-period handling, or confirmation that locked-period
project classification isn't required for your process.

**Ask:** apply the \`→ Set\` option to each invoice's line items (or advise if a manual journal /
reclassification is the right mechanism for locked periods). No amounts change — this is dimensional tagging only.

## By project

| project_code → option | invoices | total |
|---|---|---|
${Object.entries(out.locked_to_SL.by_project).map(([k, o]) => `| ${k} → ${codeToOption[k] || '?'} | ${o.n} | $${o.total.toLocaleString()} |`).join('\n')}

## Per invoice (${out.locked_to_SL.count})

| Invoice | Contact | Date | Status | Total | → Set Project Tracking |
|---|---|---|---|---|---|
${out.locked_to_SL.invoices.map(c => `| ${c.invoice} | ${(c.contact || '').slice(0, 30)} | ${c.date} | ${c.status} | $${c.total.toLocaleString()} | \`${c.proposed_option}\` |`).join('\n')}

_Generated read-only from the Supabase mirror + chart. Unlocked invoices already tagged in live Xero._
`;
writeFileSync('thoughts/shared/financials/2026-05-30-locked-tracking-for-sl.md', sl);

console.log(`DRY RUN · scope ${out.scope}`);
console.log(`Unlocked (apply): ${out.unlocked.count} invoices · ${fmtUSD(out.unlocked.total)}`);
console.log('  by project:', Object.entries(out.unlocked.by_project).map(([k, o]) => `${k}=${o.n}`).join(' '));
console.log(`Locked → SL:     ${out.locked_to_SL.count} invoices · ${fmtUSD(out.locked_to_SL.total)}`);
console.log('  by project:', Object.entries(out.locked_to_SL.by_project).map(([k, o]) => `${k}=${o.n}`).join(' '));
console.log('\nUnlocked sample:');
for (const c of out.unlocked.invoices.slice(0, 12))
  console.log(`  ${(c.invoice || '').padEnd(10)} ${(c.contact || '').slice(0, 26).padEnd(26)} ${c.date} ${c.status.padEnd(10)} ${c.kind.padEnd(11)} → ${c.proposed_option}`);
console.log(`\n→ thoughts/shared/financials/2026-05-30-xero-backfill-dryrun.md`);
