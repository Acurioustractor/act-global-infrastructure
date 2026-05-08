#!/usr/bin/env node
/**
 * Export sole-trader → ACT Pty Ltd reallocation mapping (CSV).
 *
 * Cutover artefact called out in:
 *   - thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md §11.4
 *   - 5 May 2026 Standard Ledger conversation
 *
 * Principle: every income line in Nic's sole trader was actually ACT income;
 * every expense line was incurred on ACT's behalf. This export gives Standard
 * Ledger one spreadsheet to journal-allocate the FY26 sole-trader ledger
 * across to A Curious Tractor Pty Ltd.
 *
 * Read-only. Writes two CSVs to ./out/:
 *   - sole-trader-to-pty-mapping-<FY>.csv         (line-by-line)
 *   - sole-trader-to-pty-mapping-<FY>-summary.csv (project_code totals)
 *
 * Usage:
 *   node scripts/export-sole-trader-to-pty-mapping.mjs
 *   node scripts/export-sole-trader-to-pty-mapping.mjs --from 2025-07-01 --to 2026-04-30
 *   node scripts/export-sole-trader-to-pty-mapping.mjs --tenant <uuid>
 */

import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// --- args ---
const args = process.argv.slice(2);
const argVal = (k, dflt) => {
  const i = args.indexOf(k);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const FROM = argVal('--from', '2025-07-01');
const TO = argVal('--to', '2026-04-30');
const TENANT = argVal('--tenant', null);
const FY_LABEL = argVal('--label', 'FY26-YTD');

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- reallocation rule ---
// Returns 'Y' | 'N' | 'REVIEW' + a note.
function reallocationDecision(projectCode) {
  const code = (projectCode || '').trim().toUpperCase();
  if (!code) return { decision: 'REVIEW', note: 'No project code — needs manual triage' };
  if (code === 'ACT-FM' || code === 'ACT-BV') {
    return { decision: 'N', note: 'Farm/place asset stays with Nic / separate farm entity (per CEO decision)' };
  }
  if (code === 'ACT-HV') {
    return { decision: 'Y', note: 'Pre-incorporation Harvest spend rolls into Pty; post-incorporation moves to Harvest subsidiary' };
  }
  if (code === 'UNASSIGNED') return { decision: 'REVIEW', note: 'Untagged — clear before reallocation' };
  if (code.startsWith('ACT-')) return { decision: 'Y', note: 'ACT project — reallocate to Pty' };
  return { decision: 'REVIEW', note: `Unknown code prefix (${code}) — confirm with Standard Ledger` };
}

// --- helpers ---
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
function toCsv(rows, columns) {
  const header = columns.map(c => c.label || c.key).join(',');
  const body = rows.map(row =>
    columns.map(c => csvEscape(typeof c.fn === 'function' ? c.fn(row) : row[c.key])).join(',')
  ).join('\n');
  return `${header}\n${body}\n`;
}
function describeLineItems(lineItems) {
  if (!Array.isArray(lineItems)) return '';
  return lineItems
    .map(li => (li?.Description || li?.description || '').trim())
    .filter(Boolean)
    .join(' | ');
}
function gstFromLineItems(lineItems) {
  if (!Array.isArray(lineItems)) return 0;
  return lineItems.reduce((sum, li) => sum + Number(li?.TaxAmount ?? li?.tax_amount ?? 0), 0);
}
function num(v) { return Number(v || 0); }
function fmt(v) { return num(v).toFixed(2); }

// Xero stores `total` as a positive gross amount on most rows; the income/expense
// direction lives in `type`. Normalize so income is +ve and expense is -ve so the
// summary nets out the way an accountant reads a ledger.
const INCOME_TYPES = new Set(['RECEIVE', 'ACCREC', 'RECEIVABLEPAYMENT', 'RECEIVE-OVERPAYMENT', 'RECEIVE-PREPAYMENT']);
const EXPENSE_TYPES = new Set(['SPEND', 'ACCPAY', 'PAYABLEPAYMENT', 'SPEND-OVERPAYMENT', 'SPEND-PREPAYMENT']);
function direction(type) {
  const t = (type || '').toUpperCase();
  if (INCOME_TYPES.has(t)) return 'income';
  if (EXPENSE_TYPES.has(t)) return 'expense';
  return 'other';
}
function signedAmount(type, total) {
  const d = direction(type);
  const abs = Math.abs(num(total));
  if (d === 'income') return abs;
  if (d === 'expense') return -abs;
  return num(total);
}

// --- pull data ---
console.log(`Sole-trader → Pty mapping export`);
console.log(`Period: ${FROM} → ${TO}${TENANT ? `   Tenant: ${TENANT}` : ''}`);
console.log('');

async function fetchAllPaged(builder, label) {
  const PAGE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await builder().range(from, from + PAGE - 1);
    if (error) { console.error(`${label} error:`, error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

const txns = await fetchAllPaged(() => {
  const q = sb.from('xero_transactions')
    .select('xero_transaction_id,date,type,contact_name,bank_account,total,line_items,project_code,project_code_source,rd_eligible,rd_category,is_reconciled,has_attachments,xero_tenant_id')
    .gte('date', FROM).lte('date', TO).order('date', { ascending: true });
  if (TENANT) q.eq('xero_tenant_id', TENANT);
  return q;
}, 'xero_transactions');

const invs = await fetchAllPaged(() => {
  const q = sb.from('xero_invoices')
    .select('xero_id,invoice_number,date,due_date,type,status,contact_name,total,subtotal,total_tax,amount_due,amount_paid,reference,line_items,project_code,project_code_source,entity_code,income_type,has_attachments,xero_tenant_id')
    .gte('date', FROM).lte('date', TO).order('date', { ascending: true });
  if (TENANT) q.eq('xero_tenant_id', TENANT);
  return q;
}, 'xero_invoices');

console.log(`Pulled ${txns.length} transactions, ${invs.length} invoices`);

// --- shape rows ---
const txRows = (txns || []).map(t => {
  const { decision, note } = reallocationDecision(t.project_code);
  const dir = direction(t.type);
  return {
    source: 'transaction',
    date: t.date,
    type: t.type,
    direction: dir,
    xero_id: t.xero_transaction_id,
    invoice_number: '',
    contact: t.contact_name || '',
    description: describeLineItems(t.line_items),
    bank_account: t.bank_account || '',
    amount: fmt(signedAmount(t.type, t.total)),
    amount_gross: fmt(t.total),
    gst: fmt(gstFromLineItems(t.line_items)),
    project_code: t.project_code || '',
    project_code_source: t.project_code_source || '',
    rd_eligible: t.rd_eligible === true ? 'Y' : t.rd_eligible === false ? 'N' : '',
    rd_category: t.rd_category || '',
    reallocate_to_pty: decision,
    notes: note,
  };
});

const invRows = (invs || []).map(i => {
  const { decision, note } = reallocationDecision(i.project_code);
  const dir = direction(i.type);
  return {
    source: 'invoice',
    date: i.date,
    type: i.type,
    direction: dir,
    xero_id: i.xero_id,
    invoice_number: i.invoice_number || '',
    contact: i.contact_name || '',
    description: [i.reference, describeLineItems(i.line_items)].filter(Boolean).join(' | '),
    bank_account: '',
    amount: fmt(signedAmount(i.type, i.total)),
    amount_gross: fmt(i.total),
    gst: fmt(i.total_tax),
    project_code: i.project_code || '',
    project_code_source: i.project_code_source || '',
    rd_eligible: '',
    rd_category: '',
    reallocate_to_pty: decision,
    notes: [note, i.status ? `status=${i.status}` : '', i.amount_due > 0 ? `due=${fmt(i.amount_due)}` : ''].filter(Boolean).join(' | '),
  };
});

const allRows = [...txRows, ...invRows].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

// --- summary by project_code (income vs expense, signed) ---
const summary = new Map();
for (const r of allRows) {
  const key = r.project_code || 'UNTAGGED';
  if (!summary.has(key)) {
    summary.set(key, {
      project_code: key,
      reallocate_to_pty: r.reallocate_to_pty,
      lines: 0,
      income: 0,
      expense: 0,
      other: 0,
      gst_collected: 0,
      gst_paid: 0,
    });
  }
  const s = summary.get(key);
  s.lines += 1;
  const amt = num(r.amount);
  if (r.direction === 'income') {
    s.income += amt;
    s.gst_collected += num(r.gst);
  } else if (r.direction === 'expense') {
    s.expense += amt;
    s.gst_paid += num(r.gst);
  } else {
    s.other += amt;
  }
}
const summaryRows = [...summary.values()]
  .sort((a, b) => Math.abs(b.income + b.expense) - Math.abs(a.income + a.expense))
  .map(s => ({
    project_code: s.project_code,
    reallocate_to_pty: s.reallocate_to_pty,
    lines: s.lines,
    income: fmt(s.income),
    expense: fmt(s.expense),
    net: fmt(s.income + s.expense),
    other_movements: fmt(s.other),
    gst_collected: fmt(s.gst_collected),
    gst_paid: fmt(s.gst_paid),
  }));

// --- write CSVs ---
mkdirSync('out', { recursive: true });

const detailCols = [
  { key: 'source' },
  { key: 'date' },
  { key: 'type' },
  { key: 'direction' },
  { key: 'xero_id' },
  { key: 'invoice_number' },
  { key: 'contact' },
  { key: 'description' },
  { key: 'bank_account' },
  { key: 'amount' },
  { key: 'amount_gross' },
  { key: 'gst' },
  { key: 'project_code' },
  { key: 'project_code_source' },
  { key: 'rd_eligible' },
  { key: 'rd_category' },
  { key: 'reallocate_to_pty' },
  { key: 'notes' },
];
const summaryCols = [
  { key: 'project_code' },
  { key: 'reallocate_to_pty' },
  { key: 'lines' },
  { key: 'income' },
  { key: 'expense' },
  { key: 'net' },
  { key: 'other_movements' },
  { key: 'gst_collected' },
  { key: 'gst_paid' },
];

const detailPath = join('out', `sole-trader-to-pty-mapping-${FY_LABEL}.csv`);
const summaryPath = join('out', `sole-trader-to-pty-mapping-${FY_LABEL}-summary.csv`);
writeFileSync(detailPath, toCsv(allRows, detailCols));
writeFileSync(summaryPath, toCsv(summaryRows, summaryCols));

// --- stdout summary ---
console.log('');
console.log(`Wrote ${detailPath}      (${allRows.length} lines)`);
console.log(`Wrote ${summaryPath}     (${summaryRows.length} project codes)`);
console.log('');
console.log('Reallocation summary:');
const buckets = { Y: 0, N: 0, REVIEW: 0 };
for (const r of allRows) buckets[r.reallocate_to_pty] = (buckets[r.reallocate_to_pty] || 0) + 1;
console.log(`  Y      = ${buckets.Y || 0} lines (reallocate to Pty)`);
console.log(`  N      = ${buckets.N || 0} lines (stays with sole trader / Nic / farm)`);
console.log(`  REVIEW = ${buckets.REVIEW || 0} lines (manual triage required)`);
console.log('');
console.log('Top 12 by net (income + expense):');
console.log('  code            lines    income          expense         net');
for (const s of summaryRows.slice(0, 12)) {
  const flag = s.reallocate_to_pty === 'Y' ? ' → Pty' : s.reallocate_to_pty === 'N' ? ' (stays)' : ' (REVIEW)';
  console.log(`  ${s.project_code.padEnd(14)} ${s.lines.toString().padStart(5)}  $${s.income.padStart(13)}  $${s.expense.padStart(14)}  $${s.net.padStart(13)}${flag}`);
}
console.log('');
console.log('Next: open in Sheets / Numbers, share with Standard Ledger for journal-entry review.');
