#!/usr/bin/env node
/**
 * Weekly card-reconciliation digest (READ-ONLY).
 *
 * The Monday-morning nudge for the NAB Visa #8815: hits the LIVE reconcile cockpit engine
 * (the deployed /api/finance/reconcile — the single source of truth, so this can never drift
 * from what Ben sees) and emits a 5-line "what needs attention" digest. It does NOT write to
 * Xero and does NOT re-classify — it just summarises and points Ben at the cockpit for his
 * ~30-minute weekly triage.
 *
 * The agent-heavy CODING of new create lines is NOT done here (token cost) — run the
 * q2-reconcile-full-style workflow on-demand (monthly / pre-BAS) when there's a batch worth coding.
 *
 * Env:
 *   RECONCILE_API_BASE  base URL of command-center (default http://localhost:3002;
 *                       set to https://command.act.place in cron). If the route is auth-gated,
 *                       also set RECONCILE_API_COOKIE / RECONCILE_API_TOKEN.
 * Usage:
 *   node scripts/weekly-card-reconcile.mjs                 # full FY window
 *   node scripts/weekly-card-reconcile.mjs --start 2025-10-01 --end 2025-12-31
 *   node scripts/weekly-card-reconcile.mjs --json          # machine-readable (for the weekly cron to append)
 */
import './lib/load-env.mjs';
import { writeFileSync } from 'fs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const BASE = process.env.RECONCILE_API_BASE || 'http://localhost:3002';
const START = arg('--start', '2025-07-01');
const END = arg('--end', '2026-06-30');
const AS_JSON = process.argv.includes('--json');
const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString();

const headers = {};
if (process.env.RECONCILE_API_COOKIE) headers.cookie = process.env.RECONCILE_API_COOKIE;
if (process.env.RECONCILE_API_TOKEN) headers.authorization = `Bearer ${process.env.RECONCILE_API_TOKEN}`;

const url = `${BASE}/api/finance/reconcile?limit=1&start=${START}&end=${END}`;
let summary;
try {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url} (is the cockpit reachable / authed?)`);
  const j = await res.json();
  if (j.error) throw new Error(j.error);
  summary = j.summary;
} catch (e) {
  console.error(`[weekly-card-reconcile] could not reach the cockpit: ${e.message}`);
  console.error('Set RECONCILE_API_BASE to the deployed command-center, or run a local dev server on 3002.');
  process.exit(1);
}

const s = summary;
const cockpit = `${BASE.replace('localhost:3002', 'command.act.place')}/finance/reconcile`;
const digest = {
  generated: new Date().toISOString().slice(0, 10),
  unreconciledLines: s.totalLines,
  unreconciledValue: s.totalValue,
  duplicates: s.duplicateCount,
  duplicateValueRecoverable: s.duplicateValue,
  matches: s.matchCount,
  alreadyInXero: s.alreadyReconciledCount,
  creates: s.createCount,
  surcharges: s.surchargeCount,
  surchargeValue: s.surchargeTotal,
  cockpit,
};

if (AS_JSON) { console.log(JSON.stringify(digest)); process.exit(0); }

const md = [
  `## 💳 NAB Visa reconciliation — weekly`,
  ``,
  `**${digest.unreconciledLines} unreconciled lines** · ${money(digest.unreconciledValue)} to clear`,
  `- ♻️ **${digest.duplicates} duplicates** to delete → recover **${money(digest.duplicateValueRecoverable)}**`,
  `- 🔗 ${digest.matches} match a bill/txn · ✅ ${digest.alreadyInXero} already in Xero (verify)`,
  `- 🆕 ${digest.creates} need a coded transaction · ⚠️ ${digest.surcharges} surcharges (${money(digest.surchargeValue)})`,
  ``,
  `→ Triage in the cockpit: ${cockpit}  (~30 min: duplicates first, then confirm codings)`,
].join('\n');

console.log(md);
const out = 'scripts/output/weekly-card-reconcile-digest.md';
writeFileSync(out, md + '\n');
console.error(`\n[weekly-card-reconcile] digest written to ${out}`);
