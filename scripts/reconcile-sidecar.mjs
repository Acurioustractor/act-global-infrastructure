#!/usr/bin/env node
// Reconcile-session sidecar (READ-ONLY) — pair every unreconciled bank line with its
// receipt evidence + a recommended action. NO Xero writes, NO Supabase writes; output
// is console + thoughts/shared/reports/ only.
//
// CAVEAT (print everywhere): mirror is_reconciled DRIFTS vs Xero — single-GET
// BankTransactions/{id} is the only truth (use --verify, day-shift).
//
// Usage:
//   node scripts/reconcile-sidecar.mjs --scope q2|q3|q2q3|q4|fy26 [--account visa|everyday|both] [--verify] [--limit N]
//   Defaults: --scope q2q3 --account both. --limit caps lines (and --verify single-GETs).
//   --verify is DAY-SHIFT: per-line live GET at ~1100ms/call.
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  scopeWindow, accountsFor, findTwins, classifyLine, evidenceForTxn,
  summarize, money, buildHtml, BANNER, DRIFT_CAVEAT, BUCKETS,
} from './lib/reconcile-sidecar-lib.mjs';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const args = process.argv.slice(2);
const flag = f => { const i = args.indexOf(f); return i === -1 ? null : (args[i + 1] || null); };
const SCOPE = (flag('--scope') || 'q2q3').toLowerCase();
const ACCOUNT_KEY = (flag('--account') || 'both').toLowerCase();
const VERIFY = args.includes('--verify');
const LIMIT = flag('--limit') ? parseInt(flag('--limit'), 10) : null;

const { start, end } = scopeWindow(SCOPE);
const ACCOUNTS = accountsFor(ACCOUNT_KEY);
const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Brisbane' }).format(new Date());
const OUT_DIR = join('thoughts', 'shared', 'reports');
const OUT_BASE = join(OUT_DIR, `reconcile-sidecar-${SCOPE}-${TODAY}`);

const addDays = (d, n) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

// Row fetches paginate at 1000 (PostgREST caps row dumps silently — exec_sql included).
async function fetchAll(table, select, configure, pageSize = 1000) {
  const rows = [];
  for (let page = 0; ; page++) {
    let q = sb.from(table).select(select);
    if (configure) q = configure(q);
    const { data, error } = await q.range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) { const e = new Error(`${table}: ${error.message}`); e.code = error.code; throw e; }
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}
const tableMissing = e => e.code === '42P01' || /does not exist|relation/i.test(e.message || '');

console.log(`reconcile-sidecar · scope=${SCOPE} (${start}..${end}) · accounts=${ACCOUNTS.join(' + ')} · ${VERIFY ? 'VERIFY (live single-GETs)' : 'mirror-only'}`);
console.log(`⚠ ${DRIFT_CAVEAT}`);
console.log(`⚠ ${BANNER}\n`);

// --- 1. unreconciled AUTHORISED spend lines in scope (two-account rule, no DELETED) ---
let lines = await fetchAll(
  'xero_transactions',
  'xero_transaction_id,contact_name,bank_account,date,total,type,status,is_reconciled,has_attachments,project_code,line_items',
  q => q.in('bank_account', ACCOUNTS).like('type', 'SPEND%').eq('is_reconciled', false)
    .or('status.is.null,status.eq.AUTHORISED')
    .gte('date', start).lte('date', end).order('date', { ascending: true }),
);
if (LIMIT && !VERIFY) lines = lines.slice(0, LIMIT);
console.log(`mirror: ${lines.length} unreconciled AUTHORISED spend lines in scope`);

// --- 2. live ACCPAY bills (twin pool, date window padded ±14d; no DELETED/VOIDED) ---
const bills = await fetchAll(
  'xero_invoices',
  'xero_id,invoice_number,contact_name,date,total,status,has_attachments',
  q => q.eq('type', 'ACCPAY').not('status', 'in', '("DELETED","VOIDED")')
    .gte('date', addDays(start, -14)).lte('date', addDays(end, 14)),
);
console.log(`mirror: ${bills.length} live ACCPAY bills in twin window`);

// --- 3. evidence sources ---
const evidenceNotes = [];
const emailsByTxn = new Map();
const docsByTxn = new Map();
const push = (map, key, val) => { if (!key) return; if (!map.has(key)) map.set(key, []); map.get(key).push(val); };

try {
  const emails = await fetchAll(
    'receipt_emails',
    'id,gmail_message_id,mailbox,vendor_name,subject,received_at,xero_transaction_id,xero_bank_transaction_id,status',
    q => q.not('status', 'in', '("junk","skipped")')
      .or('xero_transaction_id.not.is.null,xero_bank_transaction_id.not.is.null')
      .gte('received_at', `${addDays(start, -35)}T00:00:00Z`).lte('received_at', `${addDays(end, 35)}T23:59:59Z`),
  );
  for (const e of emails) { push(emailsByTxn, e.xero_transaction_id, e); if (e.xero_bank_transaction_id !== e.xero_transaction_id) push(emailsByTxn, e.xero_bank_transaction_id, e); }
  console.log(`evidence: ${emails.length} receipt_emails with xero ids`);
} catch (e) {
  if (!tableMissing(e)) throw e;
  evidenceNotes.push('receipt_emails table absent');
}

let financeTablesPresent = true;
try {
  // 3a. direct id-matched evidence docs
  const docs = await fetchAll(
    'finance_receipt_documents',
    'id,source,vendor_name,attachment_filename,attachment_url,gmail_message_id,xero_transaction_id,xero_bank_transaction_id,status',
    q => q.not('status', 'in', '("duplicate","ignored")')
      .or('xero_transaction_id.not.is.null,xero_bank_transaction_id.not.is.null'),
  );
  for (const d of docs) { push(docsByTxn, d.xero_transaction_id, d); if (d.xero_bank_transaction_id !== d.xero_transaction_id) push(docsByTxn, d.xero_bank_transaction_id, d); }
  console.log(`evidence: ${docs.length} finance_receipt_documents with xero ids`);

  // 3b. heuristic links via bank_statement_lines -> finance_receipt_bank_line_links
  const stmtLines = await fetchAll(
    'bank_statement_lines',
    'id,xero_transaction_id,matched_xero_transaction_id',
    q => q.eq('direction', 'debit').gte('date', start).lte('date', end)
      .or('xero_transaction_id.not.is.null,matched_xero_transaction_id.not.is.null'),
  );
  const txnByStmtLine = new Map(stmtLines.map(l => [l.id, [l.xero_transaction_id, l.matched_xero_transaction_id].filter(Boolean)]));
  const stmtIds = [...txnByStmtLine.keys()];
  let linkDocs = 0;
  for (let i = 0; i < stmtIds.length; i += 200) {
    const { data, error } = await sb
      .from('finance_receipt_bank_line_links')
      .select('bank_line_id,confidence,link_status,finance_receipt_documents(id,source,vendor_name,attachment_filename,attachment_url,gmail_message_id)')
      .in('bank_line_id', stmtIds.slice(i, i + 200))
      .in('link_status', ['approved', 'linked_in_xero'])
      .eq('is_best_candidate', true);
    if (error) { const e = new Error(error.message); e.code = error.code; throw e; }
    for (const row of data || []) {
      const doc = row.finance_receipt_documents;
      if (!doc) continue;
      for (const txnId of txnByStmtLine.get(row.bank_line_id) || []) { push(docsByTxn, txnId, doc); linkDocs++; }
    }
  }
  console.log(`evidence: ${linkDocs} approved/linked best-candidate evidence links via bank_statement_lines`);
} catch (e) {
  if (!tableMissing(e)) throw e;
  financeTablesPresent = false;
  evidenceNotes.push('finance_receipt_documents/_bank_line_links absent — receipt_emails + has_attachments only');
}

// --- 4. classify (pure, fixture-tested) ---
const dedupeDocs = arr => { const seen = new Set(); return (arr || []).filter(d => { const k = d.id || `${d.source}|${d.attachment_filename}`; if (seen.has(k)) return false; seen.add(k); return true; }); };
const li0 = t => { const li = Array.isArray(t.line_items) ? t.line_items[0] : null; return li || {}; };
const rows = lines.map(t => {
  const id = t.xero_transaction_id;
  const lineForClassify = {
    ...t,
    id,
    total: Math.abs(Number(t.total)),
    account_code: li0(t).AccountCode || li0(t).account_code || null,
  };
  const twins = findTwins(lineForClassify, bills);
  const evidence = evidenceForTxn(t, { emails: emailsByTxn.get(id) || [], docs: dedupeDocs(docsByTxn.get(id)) });
  const cls = classifyLine(lineForClassify, twins, evidence);
  return {
    id,
    date: String(t.date).slice(0, 10),
    contact_name: t.contact_name,
    description: li0(t).Description || li0(t).description || null,
    total: Math.abs(Number(t.total)),
    bank_account: t.bank_account,
    project_code: t.project_code || null,
    has_attachments: !!t.has_attachments,
    evidence,
    twin: cls.twin ? { xero_id: cls.twin.xero_id, invoice_number: cls.twin.invoice_number, contact_name: cls.twin.contact_name, status: cls.twin.status, date: cls.twin.date, total: cls.twin.total } : null,
    coding: cls.coding || null,
    bucket: cls.bucket,
    action: cls.action,
  };
});

// --- 5. optional live verify (day-shift; single GET per line is the only recon truth) ---
let verifySummary = null;
const stale = [];
if (VERIFY) {
  let xero = null;
  try {
    const { createXeroClient } = await import('./lib/finance/xero-client.mjs');
    xero = await createXeroClient(sb); // rate-limited at ~1100ms/call internally
  } catch (e) {
    console.log(`\n⚠ verify NOT WIRED: ${e.message}`);
    console.log('  run: node scripts/sync-xero-tokens.mjs');
    verifySummary = `not wired: ${e.message.slice(0, 80)} — UNVERIFIED`;
  }
  if (xero) {
    const toCheck = LIMIT ? rows.slice(0, LIMIT) : rows;
    let checked = 0, moved = 0, aborted = false;
    for (const r of toCheck) {
      try {
        const res = await xero.get(`BankTransactions/${r.id}`);
        const t = res.BankTransactions?.[0];
        checked++;
        r.live = t ? { is_reconciled: t.IsReconciled, status: t.Status } : { missing: true };
        if (t && (t.IsReconciled === true || t.Status === 'DELETED')) {
          r.bucket = 'MIRROR-STALE';
          r.action = `live Xero: IsReconciled=${t.IsReconciled} status=${t.Status} — mirror drift, not work`;
          stale.push(r);
          moved++;
        }
        if (checked % 25 === 0) console.log(`  …verified ${checked}/${toCheck.length}`);
      } catch (e) {
        if (/invalid_grant|token refresh failed|401/i.test(e.message)) {
          console.log(`\n⚠ Xero auth failed mid-verify (${e.message.slice(0, 60)})`);
          console.log('  run: node scripts/sync-xero-tokens.mjs');
          aborted = true;
          break;
        }
        r.live = { error: e.message.slice(0, 60) };
      }
    }
    verifySummary = `${checked}/${rows.length} lines live-verified · ${moved} mirror-stale${aborted ? ' · ABORTED on auth — remainder UNVERIFIED' : ''}${LIMIT ? ` · --limit ${LIMIT}` : ''}`;
    console.log(`\nverify: ${verifySummary}`);
  }
}

// --- 6. artifacts (console + files only — READ-ONLY everywhere else) ---
const work = rows.filter(r => r.bucket !== 'MIRROR-STALE');
const buckets = Object.fromEntries(BUCKETS.map(b => [b, work.filter(r => r.bucket === b)]));
if (stale.length) buckets['MIRROR-STALE'] = stale;

const summary = summarize(rows);
console.log('');
console.table(summary.map(s => ({ account: s.account, bucket: s.bucket, count: s.count, total: money(s.total) })));
console.log(`TOTAL: ${rows.length} lines · ${money(rows.reduce((s, r) => s + r.total, 0))}`);

mkdirSync(OUT_DIR, { recursive: true });
const generatedAt = new Date().toISOString();
const evidenceNote = evidenceNotes.join('; ') || (financeTablesPresent ? '' : 'evidence tables absent');
writeFileSync(`${OUT_BASE}.html`, buildHtml({ scope: SCOPE, accounts: ACCOUNTS, generatedAt, buckets, verify: verifySummary, evidenceNote }));
writeFileSync(`${OUT_BASE}.json`, JSON.stringify({
  generated_at: generatedAt,
  scope: SCOPE,
  window: { start, end },
  accounts: ACCOUNTS,
  caveats: [BANNER, DRIFT_CAVEAT],
  evidence_note: evidenceNote || null,
  verify: verifySummary || 'not run — mirror is_reconciled UNVERIFIED (drifts vs Xero)',
  summary,
  buckets,
}, null, 2));
console.log(`\nHTML: ${OUT_BASE}.html\nJSON: ${OUT_BASE}.json`);
if (evidenceNote) console.log(`note: ${evidenceNote}`);
