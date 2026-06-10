#!/usr/bin/env node
// recon-status.mjs — always-current READ-ONLY overview of the mirrored Xero state.
// SQL aggregates only (no row dumps — exec_sql caps rows at 1000 silently).
// Scope: the two ACT accounts only (two-account rule). No Supabase/Xero writes.
// Output: console + thoughts/shared/reports/recon-status-latest.{md,json}
//
// Usage: node scripts/recon-status.mjs
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  ACT_ACCOUNTS, FY26_QUARTERS, CAVEAT_RECONCILED, CAVEAT_ATTACHMENTS,
  quarterCaseSql, fmtMoney, classifyFreshness, pivotReconcileState, buildMarkdown,
} from './lib/recon-status-lib.mjs';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local then re-run.');
  process.exit(1);
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORTS_DIR = join(REPO_ROOT, 'thoughts/shared/reports');
const ACC_IN = `(${ACT_ACCOUNTS.map((a) => `'${a}'`).join(',')})`;
const FY_START = FY26_QUARTERS[0].start, FY_END = FY26_QUARTERS[3].end;
const QCASE = quarterCaseSql('date');

// Aggregate query helper — returns rows or null (logged), never throws.
async function agg(label, sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) {
    console.log(`  [${label}] unavailable: ${error.message}`);
    return { unavailable: error.message };
  }
  return { rows: data || [] };
}

const show = (title, section) => {
  console.log(`\n### ${title}`);
  if (section?.unavailable) console.log(`  unavailable: ${section.unavailable}`);
  else if (!section?.rows?.length) console.log('  (no rows)');
  else console.table(section.rows);
};

const generatedAt = new Date().toISOString();
console.log(`recon-status — generated ${generatedAt}`);
console.log(`accounts: ${ACT_ACCOUNTS.join(' · ')}`);
console.log(`\n⚠️  ${CAVEAT_RECONCILED}`);

// ── 0. Probe optional tables/columns (information_schema, graceful degrade) ──
const probe = await agg('probe', `
  SELECT table_name, count(*) n FROM information_schema.columns
  WHERE table_schema='public'
    AND table_name IN ('finance_receipt_documents','finance_receipt_bank_line_links')
  GROUP BY 1`);
const tableExists = (t) => !!probe.rows?.find((r) => r.table_name === t);
const colProbe = await agg('col-probe', `
  SELECT 1 AS yes FROM information_schema.columns
  WHERE table_schema='public' AND table_name='xero_transactions' AND column_name='updated_at'`);
const hasUpdatedAt = !!colProbe.rows?.length;

// ── 1. RECONCILE STATE — per account x quarter (AUTHORISED only) ──
const reconRaw = await agg('reconcile-state', `
  SELECT bank_account, ${QCASE} AS quarter, is_reconciled,
         count(*) AS n, round(SUM(ABS(total))::numeric, 2) AS total
  FROM xero_transactions
  WHERE bank_account IN ${ACC_IN} AND status='AUTHORISED'
    AND date BETWEEN '${FY_START}' AND '${FY_END}'
  GROUP BY 1,2,3`);
const reconcileState = reconRaw.unavailable ? reconRaw : {
  rows: pivotReconcileState(reconRaw.rows).map((r) => ({
    ...r, unreconciled_total: fmtMoney(r.unreconciled_total), reconciled_total: fmtMoney(r.reconciled_total),
  })),
};
show('1. Reconcile state (AUTHORISED, per account x quarter) — is_reconciled drifts, see caveat', reconcileState);

// ── 2. UNTAGGED genuine SPEND ──
const untaggedRaw = await agg('untagged', `
  SELECT ${QCASE} AS quarter, count(*) AS n, round(SUM(ABS(total))::numeric, 2) AS total
  FROM xero_transactions
  WHERE bank_account IN ${ACC_IN} AND type='SPEND'
    AND status IS DISTINCT FROM 'DELETED'
    AND (project_code IS NULL OR project_code='')
    AND date BETWEEN '${FY_START}' AND '${FY_END}'
  GROUP BY 1 ORDER BY 1`);
const untagged = untaggedRaw.unavailable ? untaggedRaw
  : { rows: untaggedRaw.rows.map((r) => ({ ...r, total: fmtMoney(r.total) })) };
show("2. Untagged SPEND (project_code null/empty)", untagged);

// ── 3. RECEIPTS ──
const spendRaw = await agg('receipts-spend', `
  SELECT ${QCASE} AS quarter, has_attachments, count(*) AS n, round(SUM(ABS(total))::numeric, 2) AS total
  FROM xero_transactions
  WHERE bank_account IN ${ACC_IN} AND type='SPEND'
    AND status IS DISTINCT FROM 'DELETED'
    AND date BETWEEN '${FY_START}' AND '${FY_END}'
  GROUP BY 1,2 ORDER BY 1,2`);
const receiptsSpend = spendRaw.unavailable ? spendRaw
  : { rows: spendRaw.rows.map((r) => ({ ...r, total: fmtMoney(r.total) })) };
const emailsByStatus = await agg('receipt-emails', `
  SELECT status, count(*) AS n FROM receipt_emails GROUP BY 1 ORDER BY 2 DESC`);
const docCounts = {};
for (const t of ['finance_receipt_documents', 'finance_receipt_bank_line_links']) {
  if (!tableExists(t)) { docCounts[t] = 'unavailable: table absent'; continue; }
  const c = await agg(t, `SELECT count(*) AS n FROM ${t}`);
  docCounts[t] = c.unavailable ? `unavailable: ${c.unavailable}` : Number(c.rows[0]?.n ?? 0);
}
show('3a. SPEND by has_attachments (drifting flag — refresh via receipt_emails.status=uploaded)', receiptsSpend);
show('3b. receipt_emails by status', emailsByStatus);
console.log('  3c. receipt document tables:', docCounts);

// ── 4. DUPLICATE RADAR — (date,total,bank_account) groups >1 on AUTHORISED SPEND ──
const dupRaw = await agg('duplicate-radar', `
  SELECT quarter, count(*) AS dup_groups, SUM(n) AS txns_covered,
         round(SUM(grp_total)::numeric, 2) AS total
  FROM (
    SELECT ${QCASE} AS quarter, date, total, bank_account,
           count(*) AS n, SUM(ABS(total)) AS grp_total
    FROM xero_transactions
    WHERE bank_account IN ${ACC_IN} AND type='SPEND' AND status='AUTHORISED'
      AND date BETWEEN '${FY_START}' AND '${FY_END}'
    GROUP BY 1,2,3,4 HAVING count(*) > 1
  ) g GROUP BY 1 ORDER BY 1`);
const duplicateRadar = dupRaw.unavailable ? dupRaw
  : { rows: dupRaw.rows.map((r) => ({ ...r, total: fmtMoney(r.total) })) };
show('4. Duplicate radar (same date+total+account, AUTHORISED SPEND)', duplicateRadar);

// ── 5. MATCH TARGETS — AUTHORISED ACCPAY bills awaiting payment ──
const matchRaw = await agg('match-targets', `
  SELECT count(*) AS n, round(SUM(ABS(total))::numeric, 2) AS total,
         SUM(CASE WHEN has_attachments THEN 1 ELSE 0 END) AS with_receipt
  FROM xero_invoices
  WHERE type='ACCPAY' AND status='AUTHORISED'`);
const matchTargets = matchRaw.unavailable ? matchRaw
  : { rows: matchRaw.rows.map((r) => ({ ...r, total: fmtMoney(r.total) })) };
show('5. Match targets (AUTHORISED ACCPAY bills — what unreconciled lines should MATCH to)', matchTargets);

// ── 6. FRESHNESS — per account ──
const freshSql = hasUpdatedAt ? `
  SELECT bank_account, max(date) AS max_date, max(updated_at) AS max_updated,
         count(*) FILTER (WHERE updated_at > now() - interval '24 hours') AS rows_24h,
         count(*) FILTER (WHERE updated_at > now() - interval '7 days') AS rows_7d
  FROM xero_transactions
  WHERE bank_account IN ${ACC_IN} AND status IS DISTINCT FROM 'DELETED'
  GROUP BY 1` : `
  SELECT bank_account, max(date) AS max_date, NULL AS max_updated, NULL AS rows_24h, NULL AS rows_7d
  FROM xero_transactions
  WHERE bank_account IN ${ACC_IN} AND status IS DISTINCT FROM 'DELETED'
  GROUP BY 1`;
const freshRaw = await agg('freshness', freshSql);
const freshness = freshRaw.unavailable ? freshRaw : {
  rows: freshRaw.rows.map((r) => {
    const f = classifyFreshness(r.max_updated, generatedAt);
    return { ...r, state: f.state, hours_since: f.hoursSince };
  }),
};
show('6. Freshness (per account)', freshness);
for (const r of freshness.rows || []) {
  if (r.state !== 'fresh') {
    console.log(`\n🚨 STALE MIRROR: ${r.bank_account} — newest updated row ${r.hours_since ?? '?'}h old (>26h). Run the Xero sync before trusting any figure above.`);
  }
}

// ── Write artifacts ──
const report = {
  generatedAt,
  accounts: ACT_ACCOUNTS,
  caveats: [CAVEAT_RECONCILED, CAVEAT_ATTACHMENTS],
  fy26Quarters: FY26_QUARTERS,
  sections: {
    reconcileState, untagged,
    receipts: { spend: receiptsSpend, emailsByStatus, docCounts },
    duplicateRadar, matchTargets, freshness,
  },
};
mkdirSync(REPORTS_DIR, { recursive: true });
const mdPath = join(REPORTS_DIR, 'recon-status-latest.md');
const jsonPath = join(REPORTS_DIR, 'recon-status-latest.json');
writeFileSync(mdPath, buildMarkdown(report));
writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n');
console.log(`\nWrote ${mdPath}`);
console.log(`Wrote ${jsonPath}`);
console.log(`\n⚠️  ${CAVEAT_RECONCILED}`);
