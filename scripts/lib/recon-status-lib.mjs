// Pure helpers for recon-status.mjs — no env, no I/O, fully fixture-testable.
// Money-math TDD rule: tests in scripts/tests/recon-status.test.mjs import these directly.

// Two-account rule: ACT spend lives in exactly these two Xero bank accounts.
export const ACT_ACCOUNTS = ['NAB Visa ACT #8815', 'NJ Marchesi T/as ACT Everyday'];

// FY26 quarters (Australian FY Jul-Jun).
export const FY26_QUARTERS = [
  { key: 'Q1', start: '2025-07-01', end: '2025-09-30' },
  { key: 'Q2', start: '2025-10-01', end: '2025-12-31' },
  { key: 'Q3', start: '2026-01-01', end: '2026-03-31' },
  { key: 'Q4', start: '2026-04-01', end: '2026-06-30' },
];

export const CAVEAT_RECONCILED =
  "CAVEAT: mirror is_reconciled DRIFTS vs Xero — single-GET BankTransactions/{id} is the only truth.";
export const CAVEAT_ATTACHMENTS =
  "CAVEAT: xero_transactions.has_attachments drifts — refresh path is receipt_emails.status='uploaded'.";

// Quarter window derivation: ISO date string -> quarter object or null (outside FY26).
export function quarterFor(dateStr) {
  if (!dateStr) return null;
  const d = String(dateStr).slice(0, 10);
  return FY26_QUARTERS.find((q) => d >= q.start && d <= q.end) || null;
}

// SQL CASE expression assigning a quarter label to a date column. Generated
// from FY26_QUARTERS so SQL and JS can never disagree on the windows.
export function quarterCaseSql(col) {
  const whens = FY26_QUARTERS.map(
    (q) => `WHEN ${col} BETWEEN '${q.start}' AND '${q.end}' THEN '${q.key}'`
  ).join(' ');
  return `CASE ${whens} END`;
}

// Whole-dollar money formatting: $1,235 / -$50 / — for null.
export function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const r = Math.round(Number(n));
  const abs = Math.abs(r).toLocaleString('en-AU');
  return r < 0 ? `-$${abs}` : `$${abs}`;
}

// Staleness classifier. >thresholdHours since newest updated row = STALE.
// Missing timestamp = unknown (treated as loud, like stale).
export function classifyFreshness(maxUpdatedIso, nowIso, thresholdHours = 26) {
  if (!maxUpdatedIso) return { state: 'unknown', hoursSince: null, loud: true };
  const ms = new Date(nowIso).getTime() - new Date(maxUpdatedIso).getTime();
  const hoursSince = ms / 3_600_000;
  if (Number.isNaN(hoursSince)) return { state: 'unknown', hoursSince: null, loud: true };
  const stale = hoursSince > thresholdHours;
  return { state: stale ? 'STALE' : 'fresh', hoursSince: Math.round(hoursSince * 10) / 10, loud: stale };
}

// Pivot reconcile-state SQL rows (bank_account, quarter, is_reconciled, n, total)
// into one row per account x quarter with reconciled/unreconciled splits.
export function pivotReconcileState(rows) {
  const map = new Map();
  for (const r of rows || []) {
    if (!r.quarter) continue;
    const k = `${r.bank_account}|${r.quarter}`;
    if (!map.has(k)) {
      map.set(k, {
        bank_account: r.bank_account, quarter: r.quarter,
        unreconciled_n: 0, unreconciled_total: 0, reconciled_n: 0, reconciled_total: 0,
      });
    }
    const row = map.get(k);
    if (r.is_reconciled) {
      row.reconciled_n += Number(r.n || 0);
      row.reconciled_total += Number(r.total || 0);
    } else {
      row.unreconciled_n += Number(r.n || 0);
      row.unreconciled_total += Number(r.total || 0);
    }
  }
  return [...map.values()].sort((a, b) =>
    a.bank_account === b.bank_account ? a.quarter.localeCompare(b.quarter) : a.bank_account.localeCompare(b.bank_account)
  );
}

// Markdown table from homogeneous row objects.
export function mdTable(rows) {
  if (!rows || rows.length === 0) return '_no rows_';
  const cols = Object.keys(rows[0]);
  const head = `| ${cols.join(' | ')} |`;
  const sep = `|${cols.map(() => '---').join('|')}|`;
  const body = rows.map((r) => `| ${cols.map((c) => r[c] ?? '—').join(' | ')} |`).join('\n');
  return [head, sep, body].join('\n');
}

const renderSection = (data, render) => {
  if (!data) return 'unavailable: no data';
  if (data.unavailable) return `unavailable: ${data.unavailable}`;
  return render(data);
};

// Markdown builder. Takes the full report object (canned in tests), returns the .md document.
export function buildMarkdown(report) {
  const s = report.sections || {};
  const lines = [];
  lines.push('# Recon Status — mirrored Xero state');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Accounts (two-account rule): ${(report.accounts || ACT_ACCOUNTS).join(' · ')}`);
  lines.push('');
  lines.push(`> ${CAVEAT_RECONCILED}`);
  lines.push('');

  lines.push('## 1. Reconcile state (AUTHORISED, per account x FY26 quarter)');
  lines.push(renderSection(s.reconcileState, (d) => mdTable(d.rows)));
  lines.push('');
  lines.push(`_${CAVEAT_RECONCILED}_`);
  lines.push('');

  lines.push("## 2. Untagged genuine SPEND (type='SPEND', project_code null/empty)");
  lines.push(renderSection(s.untagged, (d) => mdTable(d.rows)));
  lines.push('');

  lines.push('## 3. Receipts');
  lines.push('### SPEND by has_attachments, per quarter');
  lines.push(renderSection(s.receipts?.spend, (d) => mdTable(d.rows)));
  lines.push('');
  lines.push(`_${CAVEAT_ATTACHMENTS}_`);
  lines.push('');
  lines.push('### receipt_emails by status');
  lines.push(renderSection(s.receipts?.emailsByStatus, (d) => mdTable(d.rows)));
  lines.push('');
  lines.push('### receipt document tables');
  const docCounts = s.receipts?.docCounts || {};
  for (const [table, count] of Object.entries(docCounts)) {
    lines.push(`- ${table}: ${count}`);
  }
  if (Object.keys(docCounts).length === 0) lines.push('- unavailable: no probe results');
  lines.push('');

  lines.push('## 4. Duplicate radar ((date,total,bank_account) groups >1, AUTHORISED SPEND)');
  lines.push(renderSection(s.duplicateRadar, (d) => mdTable(d.rows)));
  lines.push('');

  lines.push('## 5. Match targets (AUTHORISED ACCPAY bills awaiting payment)');
  lines.push(renderSection(s.matchTargets, (d) => mdTable(d.rows)));
  lines.push('');

  lines.push('## 6. Freshness (per account)');
  lines.push(renderSection(s.freshness, (d) => mdTable(d.rows)));
  const staleAccounts = (s.freshness?.rows || []).filter((r) => r.state !== 'fresh');
  for (const r of staleAccounts) {
    lines.push('');
    lines.push(`**⚠️ STALE: ${r.bank_account} — newest updated row is ${r.hours_since ?? '?'}h old (>26h threshold). Mirror may be behind Xero.**`);
  }
  lines.push('');
  return lines.join('\n');
}
