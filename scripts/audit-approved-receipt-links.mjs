#!/usr/bin/env node
/**
 * Audit approved receipt evidence links that should not be trusted.
 *
 * Default mode is read-only. With --apply, this script updates only the
 * Supabase receipt-evidence mirror, changing unsafe approved links to
 * needs_review. It never writes to Xero.
 *
 * Usage:
 *   node scripts/audit-approved-receipt-links.mjs --quarters Q2,Q3,Q4
 *   node scripts/audit-approved-receipt-links.mjs --quarters Q2,Q3,Q4 --apply
 */

import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase URL/service role env vars');
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const APPLY_ALL_UNSAFE = args.includes('--apply-all-unsafe');
const QUARTERS = valueAfter('--quarters')?.split(',').map((q) => q.trim().toUpperCase()).filter(Boolean) || ['Q2', 'Q3'];
const FY = Number(valueAfter('--fy') || '26');
const DATE = todayInBrisbane();
const REPORT_DIR = join('thoughts', 'shared', 'reports', `approved-receipt-link-audit-${DATE}`);

const GENERIC_TOKENS = new Set([
  'australia',
  'australian',
  'brisbane',
  'sydney',
  'melbourne',
  'mascot',
  'pty',
  'ltd',
  'limited',
  'inc',
  'llc',
  'corp',
  'corporation',
  'company',
  'group',
  'air',
  'airways',
  'and',
  'bar',
  'cafe',
  'coffee',
  'for',
  'from',
  'hotel',
  'motel',
  'online',
  'resort',
  'restaurant',
  'restaurants',
  'the',
  'with',
  'beach',
]);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
}

function todayInBrisbane() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function quarterDates(fy, quarter) {
  const yr1 = 2000 + fy - 1;
  const yr2 = 2000 + fy;
  const quarters = {
    Q1: { start: `${yr1}-07-01`, end: `${yr1}-09-30` },
    Q2: { start: `${yr1}-10-01`, end: `${yr1}-12-31` },
    Q3: { start: `${yr2}-01-01`, end: `${yr2}-03-31` },
    Q4: { start: `${yr2}-04-01`, end: `${yr2}-06-30` },
  };
  if (!quarters[quarter]) throw new Error(`Unsupported quarter: ${quarter}`);
  return quarters[quarter];
}

function cleanText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value) {
  return cleanText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !GENERIC_TOKENS.has(token));
}

function vendorLooksRelated(row, candidate) {
  const vendorTokens = tokens(candidate.vendor_name || candidate.document_vendor || candidate.vendor || '');
  const lineTokens = new Set(tokens(`${row.payee || ''} ${row.particulars || ''}`));
  if (!vendorTokens.length || !lineTokens.size) return false;
  return vendorTokens.some((token) => lineTokens.has(token));
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function auditCandidate(row, candidate) {
  const reasons = [];
  const confidence = asNumber(candidate.confidence);
  const amountDelta = asNumber(candidate.amount_delta);
  const dateDelta = asNumber(candidate.date_delta_days);

  if (!candidate.link_id) reasons.push('missing link_id');
  if (confidence === null || confidence < 0.95) reasons.push(`confidence ${confidence ?? 'unknown'} < 0.95`);
  if (amountDelta === null || Math.abs(amountDelta) > 1) reasons.push(`amount delta ${amountDelta ?? 'unknown'} > $1`);
  if (dateDelta === null || Math.abs(dateDelta) > 7) reasons.push(`date delta ${dateDelta ?? 'unknown'}d > 7d`);
  if (!vendorLooksRelated(row, candidate)) reasons.push('vendor tokens do not match bank line');

  return reasons;
}

function severityFor(row, candidate, reasons) {
  const hasVendorMismatch = reasons.some((reason) => reason.includes('vendor tokens'));
  const hasAmountMismatch = reasons.some((reason) => reason.includes('amount delta'));
  const hasDateMismatch = reasons.some((reason) => reason.includes('date delta'));
  const vendor = cleanText(candidate.vendor_name || candidate.document_vendor || candidate.vendor || '');
  const line = cleanText(`${row.payee || ''} ${row.particulars || ''}`);

  if (hasVendorMismatch && (hasAmountMismatch || hasDateMismatch)) return 'definitely_wrong';
  if (hasAmountMismatch && hasDateMismatch) return 'definitely_wrong';
  if (hasVendorMismatch && vendor && line && !line.includes(vendor.slice(0, Math.min(vendor.length, 6)))) {
    return 'needs_human_review';
  }
  return 'needs_human_review';
}

async function fetchRows() {
  const ranges = QUARTERS.map((quarter) => ({ quarter, ...quarterDates(FY, quarter) }));
  const rows = [];
  for (const range of ranges) {
    const { data, error } = await sb
      .from('v_finance_bank_line_evidence')
      .select('id,date,payee,particulars,amount,status,evidence_status,best_confidence,best_vendor_name,best_source,receipt_candidates')
      .eq('direction', 'debit')
      .gte('date', range.start)
      .lte('date', range.end)
      .order('date');
    if (error) throw error;
    rows.push(...(data || []).map((row) => ({ ...row, quarter: range.quarter })));
  }
  return rows;
}

function csvEscape(value) {
  const string = value === null || value === undefined ? '' : String(value);
  if (!/[",\n]/.test(string)) return string;
  return `"${string.replace(/"/g, '""')}"`;
}

function writeCsv(path, rows, headers) {
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ];
  writeFileSync(path, `${lines.join('\n')}\n`);
}

const rows = await fetchRows();
const unsafe = [];
let approvedCount = 0;

for (const row of rows) {
  const candidates = Array.isArray(row.receipt_candidates) ? row.receipt_candidates : [];
  for (const candidate of candidates) {
    if (candidate.link_status !== 'approved') continue;
    approvedCount += 1;
    const reasons = auditCandidate(row, candidate);
    if (!reasons.length) continue;
    const severity = severityFor(row, candidate, reasons);
    unsafe.push({
      severity,
      quarter: row.quarter,
      bank_line_id: row.id,
      link_id: candidate.link_id || '',
      date: row.date,
      payee: row.payee,
      particulars: row.particulars,
      amount: row.amount,
      candidate_vendor: candidate.vendor_name || '',
      candidate_source: candidate.source || '',
      confidence: candidate.confidence ?? '',
      amount_delta: candidate.amount_delta ?? '',
      date_delta_days: candidate.date_delta_days ?? '',
      reasons: reasons.join('; '),
    });
  }
}

mkdirSync(REPORT_DIR, { recursive: true });
writeCsv(join(REPORT_DIR, 'unsafe-approved-links.csv'), unsafe, [
  'severity',
  'quarter',
  'bank_line_id',
  'link_id',
  'date',
  'payee',
  'particulars',
  'amount',
  'candidate_vendor',
  'candidate_source',
  'confidence',
  'amount_delta',
  'date_delta_days',
  'reasons',
]);

const definitelyWrong = unsafe.filter((row) => row.severity === 'definitely_wrong');
writeCsv(join(REPORT_DIR, 'definitely-wrong-approved-links.csv'), definitelyWrong, [
  'severity',
  'quarter',
  'bank_line_id',
  'link_id',
  'date',
  'payee',
  'particulars',
  'amount',
  'candidate_vendor',
  'candidate_source',
  'confidence',
  'amount_delta',
  'date_delta_days',
  'reasons',
]);

let updated = 0;
const applyRows = APPLY_ALL_UNSAFE ? unsafe : definitelyWrong;
if (APPLY && applyRows.length) {
  for (let i = 0; i < applyRows.length; i += 100) {
    const batch = applyRows.slice(i, i + 100).map((row) => row.link_id).filter(Boolean);
    if (!batch.length) continue;
    const { error, count } = await sb
      .from('finance_receipt_bank_line_links')
      .update({
        link_status: 'needs_review',
        review_owner: 'codex',
        review_note: `Demoted by approved receipt audit ${DATE}: strict receipt safety rule failed`,
        updated_at: new Date().toISOString(),
      }, { count: 'exact' })
      .in('id', batch);
    if (error) throw error;
    updated += count || 0;
  }
}

const md = [
  `# Approved Receipt Link Audit - ${DATE}`,
  '',
  `Mode: ${APPLY ? 'APPLY' : 'READ ONLY'}`,
  `Quarters: ${QUARTERS.join(', ')}`,
  `Rows scanned: ${rows.length}`,
  `Approved links scanned: ${approvedCount}`,
  `Unsafe approved links: ${unsafe.length}`,
  `Definitely wrong approved links: ${definitelyWrong.length}`,
  `Apply target: ${APPLY_ALL_UNSAFE ? 'all unsafe approved links' : 'definitely wrong approved links only'}`,
  `Links demoted to needs_review: ${updated}`,
  '',
  '## Rule',
  '',
  'Approved links should have confidence >= 0.95, amount delta <= $1, date delta <= 7 days, and vendor-token overlap with the bank line.',
  '',
  '## Output',
  '',
  `- ${join(REPORT_DIR, 'unsafe-approved-links.csv')}`,
  `- ${join(REPORT_DIR, 'definitely-wrong-approved-links.csv')}`,
  '',
  '## Verification Status',
  '',
  'verified: Queried live Supabase v_finance_bank_line_evidence.',
  APPLY
    ? `verified: Applied Supabase-only evidence mirror updates to ${updated} links.`
    : 'verified: Read-only mode; no Supabase writes were made.',
  'unverified: No Xero UI reconciliation state was changed or checked by this script.',
  '',
].join('\n');

writeFileSync(join(REPORT_DIR, 'summary.md'), md);

console.log(`Approved receipt link audit ${APPLY ? 'apply' : 'dry-run'} complete`);
console.log(`  Rows scanned:            ${rows.length}`);
console.log(`  Approved links scanned:  ${approvedCount}`);
console.log(`  Unsafe approved links:   ${unsafe.length}`);
console.log(`  Definitely wrong links:  ${definitelyWrong.length}`);
console.log(`  Apply target:            ${APPLY_ALL_UNSAFE ? 'all unsafe' : 'definitely wrong only'}`);
console.log(`  Links demoted:           ${updated}`);
console.log(`  Report:                  ${join(REPORT_DIR, 'summary.md')}`);
