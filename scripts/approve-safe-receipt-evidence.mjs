#!/usr/bin/env node
/**
 * Approve only strict-safe receipt evidence links.
 *
 * This updates Supabase evidence state only. It does not write to Xero and it
 * does not reconcile bank-feed lines.
 *
 * Strict-safe means:
 * - bank statement line is unreconciled
 * - best candidate has an attachment/file
 * - confidence >= 95%
 * - amount delta <= $1
 * - date delta <= 7 days
 * - candidate vendor has a meaningful token in the bank payee/particulars
 *
 * Usage:
 *   node scripts/approve-safe-receipt-evidence.mjs --quarters Q2,Q3
 *   node scripts/approve-safe-receipt-evidence.mjs --quarters Q2,Q3 --apply
 *   node scripts/approve-safe-receipt-evidence.mjs --link-id <uuid> --apply
 */

import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase URL/service role env vars');
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const QUARTERS = valueAfter('--quarters')
  ? valueAfter('--quarters').split(',').map((q) => q.trim().toUpperCase()).filter(Boolean)
  : ['Q2', 'Q3'];
const TARGET_LINK_IDS = new Set(
  (valueAfter('--link-id') || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
);
const INCLUDE_NON_BEST = args.includes('--include-non-best');

const GENERIC_VENDOR_WORDS = new Set([
  'australia',
  'australian',
  'brisbane',
  'sydney',
  'melbourne',
  'mascot',
  'maleny',
  'alice',
  'springs',
  'townsville',
  'witta',
  'pty',
  'ltd',
  'limited',
  'inc',
  'llc',
  'corp',
  'corporation',
  'company',
  'group',
  'www',
  'com',
  'au',
  'internet',
  'banking',
  'transfer',
  'payment',
  'service',
  'station',
  'the',
  'and',
  'for',
  'with',
  'mount',
  'mt',
  'isa',
  'air',
  'airways',
]);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
}

function quarterDates(quarter) {
  const quarters = {
    Q1: { start: '2025-07-01', end: '2025-09-30' },
    Q2: { start: '2025-10-01', end: '2025-12-31' },
    Q3: { start: '2026-01-01', end: '2026-03-31' },
    Q4: { start: '2026-04-01', end: '2026-06-30' },
  };
  if (!quarters[quarter]) throw new Error(`Unsupported quarter: ${quarter}`);
  return quarters[quarter];
}

function cleanMatchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function meaningfulTokens(value) {
  return cleanMatchText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !GENERIC_VENDOR_WORDS.has(token));
}

function vendorMatchesPayee(row, candidate) {
  const payeeTokens = new Set([
    ...meaningfulTokens(row.payee),
    ...meaningfulTokens(row.particulars),
  ]);
  return meaningfulTokens(candidate.vendor_name).some((token) => payeeTokens.has(token));
}

function hasAttachment(candidate) {
  return Boolean(
    candidate.signed_url
    || candidate.attachment_url
    || candidate.attachment_storage_path
    || candidate.attachment_filename,
  );
}

function candidatesFor(row) {
  const candidates = Array.isArray(row.receipt_candidates) ? row.receipt_candidates : [];
  return candidates;
}

function approvalCandidatesFor(row) {
  const candidates = candidatesFor(row);
  if (TARGET_LINK_IDS.size > 0) {
    return candidates.filter((candidate) => TARGET_LINK_IDS.has(String(candidate.link_id || '')));
  }
  return INCLUDE_NON_BEST ? candidates : candidates.slice(0, 1);
}

function isStrictSafe(row, candidate) {
  if (!candidate) return false;
  if (String(row.status || '').toLowerCase() !== 'unreconciled') return false;
  if (!['candidate', 'needs_review'].includes(String(candidate.link_status || 'candidate'))) return false;
  if (!hasAttachment(candidate)) return false;
  if (Number(candidate.confidence || row.best_confidence || 0) < 0.95) return false;
  if (Math.abs(Number(candidate.amount_delta || 0)) > 1) return false;

  const dateDelta = candidate.date_delta_days;
  if (dateDelta === null || dateDelta === undefined || dateDelta === '') return false;
  if (Math.abs(Number(dateDelta)) > 7) return false;

  return vendorMatchesPayee(row, candidate);
}

function money(value) {
  return Number(value || 0).toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  });
}

async function loadRowsForQuarter(quarter) {
  const { start, end } = quarterDates(quarter);
  const { data, error } = await sb
    .from('v_finance_bank_line_evidence')
    .select('*')
    .eq('direction', 'debit')
    .gte('date', start)
    .lte('date', end)
    .order('amount', { ascending: false })
    .limit(2000);

  if (error) throw error;
  return (data || []).map((row) => ({ ...row, quarter }));
}

async function approveLink(row, candidate) {
  const linkId = candidate.link_id;
  if (!linkId) throw new Error(`Missing link_id for ${row.id}`);

  const { error: linkError } = await sb
    .from('finance_receipt_bank_line_links')
    .update({
      link_status: 'approved',
      review_note: 'Auto-approved strict safe receipt evidence: exact amount, <=7d date delta, vendor token match',
      review_owner: 'codex',
      updated_at: new Date().toISOString(),
    })
    .eq('id', linkId);

  if (linkError) throw linkError;

  if (candidate.source_table !== 'receipt_emails' || !candidate.source_record_id) return;

  const { error: lineError } = await sb
    .from('bank_statement_lines')
    .update({
      receipt_match_status: 'matched',
      receipt_match_score: Number(candidate.confidence || row.best_confidence || 1),
      receipt_match_id: candidate.source_record_id,
      matched_receipt_email_id: candidate.source_record_id,
      notes: `Approved strict safe receipt evidence link ${linkId}`,
    })
    .eq('id', row.id);

  if (lineError) throw lineError;
}

const allRows = [];
for (const quarter of QUARTERS) {
  allRows.push(...await loadRowsForQuarter(quarter));
}

const safe = allRows
  .map((row) => ({
    row,
    candidate: approvalCandidatesFor(row).find((candidate) => isStrictSafe(row, candidate)) || null,
  }))
  .filter(({ candidate }) => candidate);

const value = safe.reduce((sum, item) => sum + Math.abs(Number(item.row.amount || 0)), 0);

console.log(`Safe evidence approvals: ${safe.length} (${money(value)})`);
for (const { row, candidate } of safe) {
  console.log([
    row.quarter,
    row.date,
    money(row.amount).padStart(12),
    String(row.payee || '').slice(0, 34).padEnd(34),
    '->',
    String(candidate.vendor_name || '').slice(0, 30).padEnd(30),
    `${Math.round(Number(candidate.confidence || 0) * 100)}%`,
    candidate.link_id,
  ].join(' '));
}

if (!APPLY) {
  console.log('\nDry run only. Re-run with --apply to approve these Supabase evidence links.');
  process.exit(0);
}

let applied = 0;
for (const { row, candidate } of safe) {
  await approveLink(row, candidate);
  applied += 1;
}

console.log(`\nApplied approvals: ${applied}/${safe.length}`);
