#!/usr/bin/env node
/**
 * Money-in alignment audit.
 *
 * Reconciles every dollar of income FY26-to-date across:
 *   1. PAID invoices (xero_invoices, type=ACCREC, amount_paid > 0)
 *   2. Standalone bank receives (xero_transactions, type=RECEIVE — grants, refunds, odd receipts)
 *   3. Outstanding receivables (xero_invoices, type=ACCREC, amount_due > 0) — expected cash
 *   4. Internal transfers (xero_transactions, type=RECEIVE-TRANSFER) — surfaced separately
 *
 * Output:
 *   - Local markdown report at thoughts/shared/reports/money-in-alignment-<date>.md
 *   - Surfaces gaps: missing project_code, missing entity_code, unreconciled, status mismatches
 *   - Grand totals + % aligned
 *
 * Usage:
 *   node scripts/audit-money-in-alignment.mjs               # default FY26
 *   node scripts/audit-money-in-alignment.mjs --since 2025-04-01
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const sinceArg = args.find(a => a.startsWith('--since'));
const SINCE = sinceArg ? sinceArg.split(/[ =]/)[1] : '2025-07-01'; // FY26

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;
const log = (m) => console.log(m);

async function main() {
  log(`Money-in alignment since ${SINCE}\n`);

  // ---- 1. PAID invoices (cash already collected) ----
  const { data: paidInvs } = await supabase
    .from('xero_invoices')
    .select('xero_id, invoice_number, contact_name, total, amount_paid, fully_paid_date, project_code, income_type, entity_code')
    .eq('type', 'ACCREC')
    .gt('amount_paid', 0)
    .gte('date', SINCE)
    .order('fully_paid_date', { ascending: false });
  const paidInvCount = paidInvs?.length || 0;
  const paidInvTotal = (paidInvs || []).reduce((s, i) => s + Number(i.amount_paid || 0), 0);

  // ---- 2. Standalone RECEIVE bank transactions (cash in not via invoice) ----
  const { data: receives } = await supabase
    .from('xero_transactions')
    .select('xero_transaction_id, contact_name, total, date, project_code, entity_code, is_reconciled, status, bank_account, line_items')
    .eq('type', 'RECEIVE')
    .neq('status', 'DELETED')
    .gte('date', SINCE)
    .order('date', { ascending: false });
  const recvCount = receives?.length || 0;
  const recvTotal = (receives || []).reduce((s, r) => s + Number(r.total || 0), 0);

  // ---- 3. Outstanding receivables (cash expected) ----
  const { data: outstanding } = await supabase
    .from('xero_invoices')
    .select('invoice_number, contact_name, total, amount_due, due_date, project_code')
    .eq('type', 'ACCREC')
    .in('status', ['AUTHORISED', 'DRAFT'])
    .gt('amount_due', 0)
    .gte('date', SINCE)
    .order('amount_due', { ascending: false });
  const outCount = outstanding?.length || 0;
  const outTotal = (outstanding || []).reduce((s, i) => s + Number(i.amount_due || 0), 0);

  // ---- Payments hygiene (Xero Payments table) ----
  const { data: paymentRows } = await supabase
    .from('xero_payments')
    .select('xero_payment_id, invoice_number, date, amount, is_reconciled, account_id, status')
    .eq('status', 'AUTHORISED')
    .gte('date', SINCE);
  const payments = paymentRows || [];
  const pmtTotal = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const pmtUnreconciled = payments.filter(p => !p.is_reconciled);
  const pmtUnreconciledAmt = pmtUnreconciled.reduce((s, p) => s + Number(p.amount || 0), 0);

  // ---- 4. Transfers (excluded from totals — internal) ----
  const { data: transfers } = await supabase
    .from('xero_transactions')
    .select('total, contact_name, date, bank_account')
    .eq('type', 'RECEIVE-TRANSFER')
    .neq('status', 'DELETED')
    .gte('date', SINCE);
  const xferCount = transfers?.length || 0;
  const xferTotal = (transfers || []).reduce((s, t) => s + Number(t.total || 0), 0);

  // ---- Gaps ----
  const gapMissingProject = (paidInvs || []).filter(i => !i.project_code).length
    + (receives || []).filter(r => !r.project_code).length;
  const gapMissingEntity = (paidInvs || []).filter(i => !i.entity_code).length
    + (receives || []).filter(r => !r.entity_code).length;
  const gapUnreconciled = (receives || []).filter(r => r.is_reconciled === false).length;

  // ---- Build markdown report ----
  const lines = [];
  const date = new Date().toISOString().slice(0, 10);
  lines.push(`# Money-In Alignment — ${date}`);
  lines.push(`\n> Period: ${SINCE} → today. Reconciles every $ of income across paid invoices, standalone bank receives, and outstanding receivables.\n`);

  lines.push(`## 💰 Grand totals\n`);
  lines.push(`| Source | Count | $ |`);
  lines.push(`|---|---:|---:|`);
  lines.push(`| **PAID invoices** (cash collected via Xero invoice) | ${paidInvCount} | **${fmt(paidInvTotal)}** |`);
  lines.push(`| **Standalone RECEIVE bank txns** (cash without invoice) | ${recvCount} | **${fmt(recvTotal)}** |`);
  lines.push(`| **TOTAL CASH IN** | ${paidInvCount + recvCount} | **${fmt(paidInvTotal + recvTotal)}** |`);
  lines.push(``);
  lines.push(`| Pipeline | Count | $ |`);
  lines.push(`|---|---:|---:|`);
  lines.push(`| **Outstanding receivables** (cash expected) | ${outCount} | ${fmt(outTotal)} |`);
  lines.push(`| Internal RECEIVE-TRANSFERs (excluded) | ${xferCount} | ${fmt(xferTotal)} |`);
  lines.push(``);

  lines.push(`## 🔗 Payments reconciliation (Xero /Payments table)\n`);
  lines.push(`| Status | Count | $ |`);
  lines.push(`|---|---:|---:|`);
  lines.push(`| Reconciled (deposit↔invoice fully linked) | ${payments.length - pmtUnreconciled.length} | ${fmt(pmtTotal - pmtUnreconciledAmt)} |`);
  lines.push(`| **Unreconciled** (Payment recorded but bank line not matched) | **${pmtUnreconciled.length}** | **${fmt(pmtUnreconciledAmt)}** |`);
  lines.push(`| Total payments | ${payments.length} | ${fmt(pmtTotal)} |`);
  if (pmtUnreconciled.length > 0) {
    lines.push(`\n### Top unreconciled payments (need bank-line matching in Xero):\n`);
    lines.push(`| Date | Invoice | Amount | PaymentID |`);
    lines.push(`|---|---|---:|---|`);
    for (const p of pmtUnreconciled.slice(0, 10).sort((a, b) => Number(b.amount) - Number(a.amount))) {
      lines.push(`| ${p.date || '?'} | ${p.invoice_number || '—'} | ${fmt(p.amount)} | ${p.xero_payment_id.slice(0, 8)}... |`);
    }
  }
  lines.push(``);

  lines.push(`## 🚩 Alignment gaps\n`);
  lines.push(`- **${gapMissingProject}** records missing project_code`);
  lines.push(`- **${gapMissingEntity}** records missing entity_code`);
  lines.push(`- **${gapUnreconciled}** RECEIVE bank txns marked unreconciled (review needed)`);
  lines.push(``);

  // ---- Section: PAID invoices ----
  lines.push(`## ✅ Paid invoices (${paidInvCount}, ${fmt(paidInvTotal)})\n`);
  lines.push(`| Invoice | Date paid | Contact | Amount | Project | Income type |`);
  lines.push(`|---|---|---|---:|---|---|`);
  for (const i of (paidInvs || [])) {
    lines.push(`| ${i.invoice_number || '—'} | ${i.fully_paid_date || '?'} | ${(i.contact_name || '').slice(0, 40)} | ${fmt(i.amount_paid)} | ${i.project_code || '🚩 missing'} | ${i.income_type || '—'} |`);
  }
  lines.push(``);

  // ---- Section: standalone RECEIVE ----
  lines.push(`## 🏦 Standalone bank receives (${recvCount}, ${fmt(recvTotal)})\n`);
  lines.push(`*Cash that landed in our accounts without going through a Xero invoice — grants, refunds, deposits, direct payments.*\n`);
  lines.push(`| Date | Contact | Amount | Bank | Project | Reconciled |`);
  lines.push(`|---|---|---:|---|---|---|`);
  for (const r of (receives || []).slice(0, 60)) {
    lines.push(`| ${r.date} | ${(r.contact_name || 'unknown').slice(0, 40)} | ${fmt(r.total)} | ${(r.bank_account || '').slice(0, 20)} | ${r.project_code || '🚩'} | ${r.is_reconciled ? '✓' : '🚩'} |`);
  }
  if ((receives || []).length > 60) lines.push(`| ... ${receives.length - 60} more |  |  |  |  |  |`);
  lines.push(``);

  // ---- Section: outstanding ----
  lines.push(`## ⏳ Outstanding receivables (${outCount}, ${fmt(outTotal)})\n`);
  lines.push(`*Invoices sent but not yet paid. Sorted by amount due.*\n`);
  lines.push(`| Invoice | Contact | Due date | Amount due | Project |`);
  lines.push(`|---|---|---|---:|---|`);
  for (const i of (outstanding || []).slice(0, 30)) {
    const overdue = i.due_date && new Date(i.due_date) < new Date();
    lines.push(`| ${i.invoice_number || '—'} | ${(i.contact_name || '').slice(0, 40)} | ${i.due_date || '?'}${overdue ? ' ⚠️' : ''} | ${fmt(i.amount_due)} | ${i.project_code || '🚩'} |`);
  }
  lines.push(``);

  // ---- Footer ----
  lines.push(`---`);
  lines.push(`Generated by \`node scripts/audit-money-in-alignment.mjs\`. Data: \`xero_invoices\` + \`xero_transactions\` (Supabase shared instance).`);

  const outPath = join(__dirname, '..', 'thoughts', 'shared', 'reports', `money-in-alignment-${date}.md`);
  writeFileSync(outPath, lines.join('\n'));
  log(`\n✅ Wrote ${outPath}`);
  log(`Summary:`);
  log(`  Paid invoices: ${paidInvCount} (${fmt(paidInvTotal)})`);
  log(`  Standalone receives: ${recvCount} (${fmt(recvTotal)})`);
  log(`  Outstanding: ${outCount} (${fmt(outTotal)})`);
  log(`  Total cash in: ${fmt(paidInvTotal + recvTotal)}`);
  log(`  Gaps: ${gapMissingProject} no project, ${gapMissingEntity} no entity, ${gapUnreconciled} unreconciled`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
