#!/usr/bin/env node
/**
 * Build the canonical bank-line-first close action queue.
 *
 * Read-only. This does not write to Xero or Supabase.
 *
 * Usage:
 *   node scripts/build-bank-line-action-queue.mjs --quarters Q2,Q3
 *   node scripts/build-bank-line-action-queue.mjs --quarters Q2,Q3 --format json
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
const FY = numberAfter('--fy', 26);
const QUARTERS = valueAfter('--quarters')
  ? valueAfter('--quarters').split(',').map((q) => q.trim().toUpperCase()).filter(Boolean)
  : args.filter((arg) => /^Q[1-4]$/i.test(arg)).map((arg) => arg.toUpperCase());
const quarterList = QUARTERS.length ? QUARTERS : ['Q2', 'Q3'];
const FORMAT = valueAfter('--format') || 'all';
const DATE = todayInBrisbane();
const OUT_DIR = join('thoughts', 'shared', 'reports', `bank-line-action-queue-${DATE}`);
const RECEIPT_THRESHOLD = 82.5;

const ACTIONS = {
  already_done: 'already_done',
  attached_in_xero: 'attached_in_xero',
  upload_attachment: 'upload_attachment',
  xero_target_missing: 'xero_target_missing',
  click_ok_existing_match: 'click_ok_existing_match',
  create_low_value: 'create_low_value',
  create_with_receipt: 'create_with_receipt',
  review_receipt_candidate: 'review_receipt_candidate',
  find_match_bill: 'find_match_bill',
  transfer: 'transfer',
  income_review: 'income_review',
  reject_xero_suggestion: 'reject_xero_suggestion',
  reject_receipt_candidate: 'reject_receipt_candidate',
  find_receipt: 'find_receipt',
  project_rd_review: 'project_rd_review',
  bookkeeper_review: 'bookkeeper_review',
};

const LOW_VALUE_NO_RECEIPT_PURPOSE = 'No invoice required under $82.50; keep business purpose clear.';

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
}

function numberAfter(flag, fallback) {
  const raw = valueAfter(flag);
  if (!raw) return fallback;
  const number = Number(raw);
  return Number.isFinite(number) ? number : fallback;
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
  const ranges = {
    Q1: { start: `${yr1}-07-01`, end: `${yr1}-09-30` },
    Q2: { start: `${yr1}-10-01`, end: `${yr1}-12-31` },
    Q3: { start: `${yr2}-01-01`, end: `${yr2}-03-31` },
    Q4: { start: `${yr2}-04-01`, end: `${yr2}-06-30` },
  };
  if (!ranges[quarter]) throw new Error(`Unsupported quarter: ${quarter}`);
  return ranges[quarter];
}

function quarterForDate(date) {
  const month = Number(String(date || '').slice(5, 7));
  if (month >= 7 && month <= 9) return 'Q1';
  if (month >= 10 && month <= 12) return 'Q2';
  if (month >= 1 && month <= 3) return 'Q3';
  return 'Q4';
}

function dateClause(alias = 'bsl') {
  return quarterList
    .map((quarter) => {
      const { start, end } = quarterDates(FY, quarter);
      return `(${alias}.date >= $$${start}$$::date and ${alias}.date <= $$${end}$$::date)`;
    })
    .join(' or ');
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function absAmount(value) {
  return Math.abs(asNumber(value));
}

function cents(value) {
  return Math.round(absAmount(value) * 100);
}

function isAmountClose(a, b, toleranceCents = 2) {
  return Math.abs(cents(a) - cents(b)) <= toleranceCents;
}

function money(value) {
  return absAmount(value).toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  });
}

function cleanText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const GENERIC_WORDS = new Set([
  'and',
  'australia',
  'australian',
  'bank',
  'brisbane',
  'card',
  'co',
  'company',
  'credit',
  'group',
  'internet',
  'limited',
  'ltd',
  'melbourne',
  'payment',
  'payments',
  'purchase',
  'pty',
  'sydney',
  'the',
  'transfer',
  'visa',
]);

function meaningfulTokens(value) {
  return cleanText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !GENERIC_WORDS.has(token));
}

function vendorScore(needle, haystack) {
  const left = cleanText(needle);
  const right = cleanText(haystack);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.95;

  const leftTokens = meaningfulTokens(left);
  const rightTokens = new Set(meaningfulTokens(right));
  if (!leftTokens.length || !rightTokens.size) return 0;
  return leftTokens.filter((token) => rightTokens.has(token)).length / leftTokens.length;
}

function dateDeltaDays(a, b) {
  if (!a || !b) return null;
  const first = new Date(`${a}T00:00:00`).getTime();
  const second = new Date(`${b}T00:00:00`).getTime();
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
  return Math.round((second - first) / 86400000);
}

function hasFile(docOrCandidate) {
  return Boolean(
    docOrCandidate?.attachment_storage_path
    || docOrCandidate?.attachment_url
    || docOrCandidate?.attachment_filename,
  );
}

function hasXeroTarget(rowOrDoc) {
  return Boolean(
    rowOrDoc?.xero_bank_transaction_id
    || rowOrDoc?.xero_transaction_id
    || rowOrDoc?.matched_xero_transaction_id,
  );
}

function targetId(row, approvedLink) {
  return (
    approvedLink?.document_xero_bank_transaction_id
    || approvedLink?.document_xero_transaction_id
    || row.xero_transaction_id
    || row.matched_xero_transaction_id
    || null
  );
}

function rowVendor(row) {
  return row.payee || row.best_vendor_name || row.particulars || row.reference || 'Bank line';
}

function rowText(row) {
  return [
    row.payee,
    row.particulars,
    row.reference,
    row.best_vendor_name,
    row.bank_account,
  ].filter(Boolean).join(' ');
}

function isTransfer(row) {
  const text = cleanText(rowText(row));
  return Boolean(
    row.direction === 'credit' && /internet payment|linked acc|credit card payment|card repayment/.test(text)
    || /internet payment|linked acc|linked account|credit card payment|card repayment|bank transfer|transfer/.test(text)
    || /ato payment/.test(text)
  );
}

function isRefund(row) {
  const text = cleanText(rowText(row));
  return row.direction === 'credit' || /refund|rebate|reversal|credit/.test(text);
}

function noReceiptNeeded(row) {
  const state = String(row.evidence_status || row.receipt_match_status || '').toLowerCase();
  return state === 'no_receipt_needed'
    || String(row.receipt_match_status || '').toLowerCase() === 'no_receipt_needed'
    || isTransfer(row);
}

function bestApprovedLink(links) {
  return (links || [])
    .filter((link) => link.link_status === 'approved' && link.has_file)
    .sort((a, b) => asNumber(b.confidence) - asNumber(a.confidence))[0] || null;
}

function rejectedLinkCount(links) {
  return (links || []).filter((link) => link.link_status === 'rejected').length;
}

function bestReviewableCandidate(row, rejectedDocumentIds) {
  const candidates = Array.isArray(row.receipt_candidates) ? row.receipt_candidates : [];
  return candidates
    .filter((candidate) => {
      if (!candidate || rejectedDocumentIds.has(String(candidate.receipt_document_id || candidate.id || ''))) return false;
      const source = String(candidate.source || candidate.source_table || '').toLowerCase();
      const action = String(candidate.xero_action || '').toLowerCase();
      const confidence = asNumber(candidate.confidence);
      const amountDelta = Math.abs(asNumber(candidate.amount_delta));
      const dateDelta = candidate.date_delta_days === null || candidate.date_delta_days === undefined
        ? null
        : Math.abs(asNumber(candidate.date_delta_days));
      const vendor = asNumber(candidate.vendor_score) || vendorScore(rowText(row), candidate.vendor_name);
      const receiptish = /(dext|receipt|xero_me|manual|gmail)/.test(source) || action === 'attach_file';
      if (!receiptish || !hasFile(candidate)) return false;
      if (confidence < 0.70) return false;
      if (vendor < 0.45) return false;
      if (dateDelta !== null && dateDelta > 21) return false;
      if (amountDelta > Math.max(2, absAmount(row.amount) * 0.10)) return false;
      return true;
    })
    .sort((a, b) => asNumber(b.confidence) - asNumber(a.confidence))[0] || null;
}

function bestBillCandidate(row, invoices) {
  const candidates = invoices
    .map((invoice) => ({
      invoice,
      score: vendorScore(rowText(row), invoice.contact_name),
      delta: dateDeltaDays(row.date, invoice.date),
    }))
    .filter(({ invoice, score, delta }) => (
      invoice.type === 'ACCPAY'
      && ['AUTHORISED', 'PAID'].includes(String(invoice.status || '').toUpperCase())
      && isAmountClose(row.amount, invoice.total)
      && delta !== null
      && Math.abs(delta) <= 14
      && score >= 0.45
    ))
    .sort((a, b) => {
      const attachedDiff = Number(Boolean(b.invoice.has_attachments)) - Number(Boolean(a.invoice.has_attachments));
      if (attachedDiff !== 0) return attachedDiff;
      const scoreDiff = b.score - a.score;
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
      return Math.abs(a.delta || 0) - Math.abs(b.delta || 0);
    });

  return candidates.length === 1 ? candidates[0] : null;
}

function codingSuggestion(row) {
  const text = cleanText(rowText(row));
  const amount = absAmount(row.amount);

  if (isTransfer(row)) {
    return {
      who: '',
      account: 'Transfer',
      why: `NAB Visa card repayment/internal transfer - ${row.reference || row.card_last4 || 'bank line'}`,
      taxRate: 'BAS Excluded',
    };
  }

  if (/belong|telstra|dialpad|starlink/.test(text)) {
    return { who: rowVendor(row), account: '489 - Telephone & Internet', why: `${rowVendor(row)} phone/internet service`, taxRate: 'GST on Expenses' };
  }

  if (/linktree|linkedin|squarespace|webflow|openai|anthropic|claude|notion|figma|vercel|railway|supabase|zapier|bitwarden|codeguide|descript|mighty|warp|cognition/.test(text)) {
    const taxRate = /linkedin|openai|anthropic|claude|notion|figma|vercel|railway|supabase|zapier|bitwarden|codeguide|descript|mighty|warp|cognition|webflow/.test(text)
      ? 'GST Free Expenses'
      : 'GST on Expenses';
    return { who: rowVendor(row), account: '485 - Subscriptions', why: `${rowVendor(row)} subscription${amount <= RECEIPT_THRESHOLD ? ` - ${LOW_VALUE_NO_RECEIPT_PURPOSE}` : ''}`, taxRate };
  }

  if (/qantas|virgin|avis|budget|booking|airbnb|hotel|novotel|dayuse|cabfare|taxi|uber/.test(text)) {
    const account = /cabfare|taxi|uber/.test(text) ? '452 - Parking, Tolls & Taxis' : '493 - Travel - National';
    return { who: rowVendor(row), account, why: `${rowVendor(row)} travel-related spend`, taxRate: 'GST on Expenses' };
  }

  if (/fuel|ampol|bp |liberty|shell|caltex|eg group|reddy express/.test(text)) {
    return { who: rowVendor(row), account: '449 - MV - Fuel & Oil', why: `${rowVendor(row)} fuel/motor vehicle spend`, taxRate: 'GST on Expenses' };
  }

  if (/bunnings|stratco|electrical|hardware|kennards|trailer|tools|sydney tools/.test(text)) {
    return { who: rowVendor(row), account: '409 - Client to Advise', why: `${rowVendor(row)} supplies/equipment - confirm project and account`, taxRate: 'GST on Expenses' };
  }

  if (amount <= RECEIPT_THRESHOLD) {
    return { who: rowVendor(row), account: '429 - General Expenses', why: `${rowVendor(row)} - ${LOW_VALUE_NO_RECEIPT_PURPOSE}`, taxRate: 'GST on Expenses' };
  }

  return { who: rowVendor(row), account: '409 - Client to Advise', why: `${rowVendor(row)} - confirm receipt, project, and account before reconciling`, taxRate: 'GST on Expenses' };
}

function actionRecord(row, action, risk, owner, reason, extra = {}) {
  const coding = codingSuggestion(row);
  return {
    bank_line_id: row.id,
    quarter: quarterForDate(row.date),
    date: row.date,
    direction: row.direction,
    vendor: rowVendor(row),
    description: [row.particulars, row.reference, row.bank_account].filter(Boolean).join(' · '),
    amount: absAmount(row.amount),
    bank_status: row.status,
    xero_state: extra.xero_state || xeroState(row, extra),
    evidence_state: extra.evidence_state || evidenceState(row, extra),
    next_action: action,
    risk,
    owner,
    reason,
    safe_to_click: ['transfer', 'create_low_value', 'click_ok_existing_match'].includes(action) && risk === 'low',
    project_code: row.project_code || '',
    project_source: row.project_source || '',
    rd_eligible: row.rd_eligible === true,
    rd_category: row.rd_category || '',
    xero_target_id: extra.target_id || '',
    receipt_document_id: extra.receipt_document_id || '',
    receipt_source: extra.receipt_source || row.best_source || '',
    receipt_confidence: extra.receipt_confidence ?? row.best_confidence ?? '',
    candidate_count: asNumber(row.candidate_count),
    rejected_candidate_count: extra.rejected_candidate_count || 0,
    who: coding.who,
    what: coding.account,
    why: coding.why,
    tax_rate: coding.taxRate,
  };
}

function xeroState(row, extra) {
  if (extra.target_id && extra.target_has_attachment) return 'reconciled_target_attached';
  if (extra.target_id) return 'target_known';
  if (String(row.status || '').toLowerCase() === 'unreconciled') return 'unreconciled_target_missing';
  if (String(row.status || '').toLowerCase() === 'reconciled') return 'reconciled_target_missing';
  return 'unknown';
}

function evidenceState(row, extra) {
  if (extra.target_has_attachment) return 'attached_in_xero';
  if (extra.approved_link) return 'approved_file';
  if (noReceiptNeeded(row)) return 'no_receipt_needed';
  if (extra.candidate) return 'candidate';
  return row.evidence_status || row.receipt_match_status || 'none';
}

function classifyRow(row, context) {
  const links = context.linksByBankLine.get(row.id) || [];
  const rejectedIds = new Set(links.filter((link) => link.link_status === 'rejected').map((link) => String(link.receipt_document_id)));
  const approved = bestApprovedLink(links);
  const rejectedCount = rejectedLinkCount(links);
  const target = targetId(row, approved);
  const targetTxn = target ? context.transactionsById.get(target) : null;
  const targetHasAttachment = targetTxn?.has_attachments === true || approved?.document_xero_attachment_id;
  const candidate = bestReviewableCandidate(row, rejectedIds);
  const bankStatus = String(row.status || '').toLowerCase();
  const isReconciled = bankStatus === 'reconciled';
  const billCandidate = isReconciled ? null : bestBillCandidate(row, context.invoices);
  const amount = absAmount(row.amount);
  const baseExtra = {
    target_id: target || '',
    target_has_attachment: Boolean(targetHasAttachment),
    approved_link: approved || null,
    candidate,
    rejected_candidate_count: rejectedCount,
    receipt_document_id: approved?.receipt_document_id || candidate?.receipt_document_id || candidate?.id || '',
    receipt_source: approved?.document_source || candidate?.source || row.best_source || '',
    receipt_confidence: approved?.confidence ?? candidate?.confidence ?? row.best_confidence ?? '',
  };

  if (row.direction === 'credit' && !isTransfer(row)) {
    return actionRecord(row, ACTIONS.income_review, 'medium', 'ben', 'Incoming/refund line. Review against invoice, refund, or transfer before coding.', baseExtra);
  }

  if (isTransfer(row)) {
    return actionRecord(row, ACTIONS.transfer, 'low', 'ben', 'Internal transfer/card repayment. Use Xero Transfer, not a new spend item.', {
      ...baseExtra,
      evidence_state: 'no_receipt_needed',
    });
  }

  if (approved && target && targetHasAttachment) {
    return actionRecord(row, ACTIONS.attached_in_xero, 'low', 'codex', 'Approved receipt is already attached to the known Xero target.', baseExtra);
  }

  if (approved && target && !targetHasAttachment) {
    return actionRecord(row, ACTIONS.upload_attachment, 'low', 'codex', 'Approved receipt has an exact Xero target and can be uploaded as an attachment.', baseExtra);
  }

  if (approved && !target) {
    const owner = bankStatus === 'unreconciled' ? 'ben' : 'codex';
    const reason = bankStatus === 'unreconciled'
      ? 'Receipt is approved, but the bank line still needs the Xero UI reconciliation/create step before attachment.'
      : 'Receipt is approved, but the mirror lacks an exact Xero target. Run deterministic target linker or inspect Xero.';
    return actionRecord(row, ACTIONS.xero_target_missing, 'medium', owner, reason, baseExtra);
  }

  if (isReconciled) {
    const status = String(row.evidence_status || row.receipt_match_status || '').toLowerCase();
    if (candidate || ['covered_legacy', 'covered_evidence', 'candidate', 'high_confidence_candidate'].includes(status)) {
      return actionRecord(row, ACTIONS.review_receipt_candidate, 'medium', 'ben', 'Bank line is already reconciled, but receipt evidence still needs human approval/rejection for the close pack.', baseExtra);
    }

    if (noReceiptNeeded(row) || amount <= RECEIPT_THRESHOLD) {
      return actionRecord(row, ACTIONS.already_done, 'low', 'codex', 'Bank line is already reconciled and does not need more receipt work.', {
        ...baseExtra,
        evidence_state: noReceiptNeeded(row) ? 'no_receipt_needed' : 'low_value_no_file',
      });
    }

    if (!row.project_code || row.project_code === 'ACT-IN' || row.rd_eligible === null) {
      return actionRecord(row, ACTIONS.project_rd_review, 'medium', 'ben', 'Bank line is already reconciled but needs project/R&D review before bookkeeper pack.', baseExtra);
    }

    return actionRecord(row, ACTIONS.find_receipt, 'high', 'ben', 'Bank line is already reconciled, but receipt evidence is still missing for the close pack.', baseExtra);
  }

  if (billCandidate) {
    return actionRecord(row, ACTIONS.find_match_bill, 'low', 'ben', `Exact Xero bill candidate exists: ${billCandidate.invoice.contact_name || 'bill'} ${money(billCandidate.invoice.total)}. Use Find & Match, not Create.`, {
      ...baseExtra,
      target_id: billCandidate.invoice.xero_id || '',
      xero_state: 'bill_candidate',
    });
  }

  if (candidate) {
    return actionRecord(row, ACTIONS.review_receipt_candidate, 'medium', 'ben', 'Receipt candidate exists. Preview the file; approve if vendor/date/amount are correct, otherwise reject it.', baseExtra);
  }

  if (
    ['covered_legacy', 'covered_evidence', 'candidate', 'high_confidence_candidate'].includes(String(row.evidence_status || '').toLowerCase())
    || (asNumber(row.candidate_count) > 0 && row.best_source)
  ) {
    return actionRecord(row, ACTIONS.review_receipt_candidate, 'medium', 'ben', 'Evidence/candidates exist, but none are approved yet. Open the receipt preview and approve the correct file or reject bad candidates.', baseExtra);
  }

  if (noReceiptNeeded(row)) {
    if (bankStatus === 'unreconciled') {
      return actionRecord(row, ACTIONS.create_low_value, 'low', 'ben', 'No receipt needed path. Create/reconcile only if account, tax, project, and business purpose are correct.', {
        ...baseExtra,
        evidence_state: 'no_receipt_needed',
      });
    }
    return actionRecord(row, ACTIONS.already_done, 'low', 'codex', 'Bank line is already reconciled and marked no receipt needed.', {
      ...baseExtra,
      evidence_state: 'no_receipt_needed',
    });
  }

  if (amount <= RECEIPT_THRESHOLD && bankStatus === 'unreconciled') {
    return actionRecord(row, ACTIONS.create_low_value, 'low', 'ben', LOW_VALUE_NO_RECEIPT_PURPOSE, {
      ...baseExtra,
      evidence_state: 'low_value_no_file',
    });
  }

  if (bankStatus === 'unreconciled') {
    return actionRecord(row, ACTIONS.find_receipt, 'high', 'ben', 'Unreconciled spend over threshold with no approved receipt or exact bill target. Find receipt or code BAS excluded with explicit review.', baseExtra);
  }

  if (!row.project_code || row.project_code === 'ACT-IN' || row.rd_eligible === null) {
    return actionRecord(row, ACTIONS.project_rd_review, 'medium', 'ben', 'Bank line appears reconciled but needs project/R&D review before bookkeeper pack.', baseExtra);
  }

  return actionRecord(row, ACTIONS.bookkeeper_review, 'medium', 'standard_ledger', 'Reconciled or historical row still has unresolved evidence/target ambiguity. Include in bookkeeper exception pack.', baseExtra);
}

async function execSql(query) {
  const { data, error } = await sb.rpc('exec_sql', { query });
  if (error) throw error;
  return data || [];
}

async function fetchPaged(label, queryFactory, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory(from, from + pageSize - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function loadBankRows() {
  const rows = [];
  for (const quarter of quarterList) {
    const { start, end } = quarterDates(FY, quarter);
    rows.push(...await fetchPaged(`bank evidence ${quarter}`, (from, to) =>
      sb
        .from('v_finance_bank_line_evidence')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })
        .range(from, to)
    ));
  }
  return rows;
}

async function loadLinks() {
  const query = `
    select
      l.id,
      l.bank_line_id,
      l.receipt_document_id,
      l.link_status,
      l.match_method,
      l.confidence,
      l.rank,
      l.is_best_candidate,
      l.vendor_score,
      l.amount_score,
      l.date_score,
      l.amount_delta,
      l.date_delta_days,
      l.review_owner,
      l.review_note,
      l.xero_action,
      d.source as document_source,
      d.source_table as document_source_table,
      d.vendor_name as document_vendor,
      d.document_date as document_date,
      d.amount_total as document_amount,
      d.attachment_url as document_attachment_url,
      d.attachment_storage_path as document_attachment_storage_path,
      d.attachment_filename as document_attachment_filename,
      d.xero_transaction_id as document_xero_transaction_id,
      d.xero_bank_transaction_id as document_xero_bank_transaction_id,
      d.xero_invoice_id as document_xero_invoice_id,
      d.xero_attachment_id as document_xero_attachment_id,
      d.status as document_status,
      (
        d.attachment_url is not null
        or d.attachment_storage_path is not null
        or d.attachment_filename is not null
      ) as has_file
    from finance_receipt_bank_line_links l
    join finance_receipt_documents d on d.id = l.receipt_document_id
    join bank_statement_lines bsl on bsl.id = l.bank_line_id
    where ${dateClause('bsl')}
    order by l.bank_line_id, l.link_status, l.confidence desc nulls last
  `;
  const rows = await execSql(query);
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.bank_line_id) || [];
    list.push(row);
    map.set(row.bank_line_id, list);
  }
  return map;
}

async function loadXeroTransactions() {
  const ranges = quarterList.map((q) => quarterDates(FY, q));
  const start = ranges.map((r) => r.start).sort()[0];
  const end = ranges.map((r) => r.end).sort().at(-1);
  const rows = await fetchPaged('xero transactions', (from, to) =>
    sb
      .from('xero_transactions')
      .select('xero_transaction_id,type,contact_name,total,status,date,has_attachments,is_reconciled,project_code,rd_category')
      .gte('date', start)
      .lte('date', end)
      .range(from, to)
  );
  return new Map(rows.filter((row) => row.xero_transaction_id).map((row) => [row.xero_transaction_id, row]));
}

async function loadXeroInvoices() {
  const ranges = quarterList.map((q) => quarterDates(FY, q));
  const start = ranges.map((r) => r.start).sort()[0];
  const end = ranges.map((r) => r.end).sort().at(-1);
  return fetchPaged('xero invoices', (from, to) =>
    sb
      .from('xero_invoices')
      .select('id,xero_id,invoice_number,type,status,contact_name,date,total,amount_due,amount_paid,has_attachments,reference,project_code,project_code_source')
      .eq('type', 'ACCPAY')
      .gte('date', start)
      .lte('date', end)
      .range(from, to)
  );
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

function summarize(rows, key) {
  return [...rows.reduce((map, row) => {
    const value = row[key] || 'unknown';
    const item = map.get(value) || { key: value, count: 0, value: 0 };
    item.count += 1;
    item.value += row.amount;
    map.set(value, item);
    return map;
  }, new Map()).values()].sort((a, b) => b.value - a.value);
}

function markdownTable(rows, headers) {
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${headers.map((header) => row[header]).join(' | ')} |`);
  return [head, sep, ...body].join('\n');
}

function writeReports(rows) {
  mkdirSync(OUT_DIR, { recursive: true });

  const headers = [
    'quarter',
    'date',
    'direction',
    'vendor',
    'amount',
    'bank_status',
    'xero_state',
    'evidence_state',
    'next_action',
    'risk',
    'owner',
    'safe_to_click',
    'project_code',
    'rd_eligible',
    'xero_target_id',
    'receipt_document_id',
    'receipt_source',
    'receipt_confidence',
    'candidate_count',
    'rejected_candidate_count',
    'who',
    'what',
    'why',
    'tax_rate',
    'reason',
    'description',
    'bank_line_id',
  ];

  const csvRows = rows.map((row) => ({
    ...row,
    amount: row.amount.toFixed(2),
  }));

  writeCsv(join(OUT_DIR, 'queue.csv'), csvRows, headers);
  writeFileSync(join(OUT_DIR, 'queue.json'), `${JSON.stringify(rows, null, 2)}\n`);

  const byAction = summarize(rows, 'next_action').map((row) => ({
    Action: row.key,
    Count: row.count,
    Value: money(row.value),
  }));
  const byOwner = summarize(rows, 'owner').map((row) => ({
    Owner: row.key,
    Count: row.count,
    Value: money(row.value),
  }));
  const byRisk = summarize(rows, 'risk').map((row) => ({
    Risk: row.key,
    Count: row.count,
    Value: money(row.value),
  }));

  const topBenRows = rows
    .filter((row) => row.owner === 'ben' && row.next_action !== ACTIONS.transfer)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 50)
    .map((row) => ({
      Date: row.date,
      Vendor: row.vendor.replaceAll('|', '/'),
      Amount: money(row.amount),
      Action: row.next_action,
      Risk: row.risk,
      Reason: row.reason.replaceAll('|', '/'),
    }));

  const md = `# Bank-Line Action Queue ${DATE}

Read-only queue for ${quarterList.join(', ')} FY${FY}.

## Summary

- Total rows: ${rows.length}
- Total absolute value: ${money(rows.reduce((sum, row) => sum + row.amount, 0))}
- Safe-to-click rows: ${rows.filter((row) => row.safe_to_click).length}
- Ben-owned rows: ${rows.filter((row) => row.owner === 'ben').length}
- Codex-owned rows: ${rows.filter((row) => row.owner === 'codex').length}
- Standard Ledger rows: ${rows.filter((row) => row.owner === 'standard_ledger').length}

## By Action

${markdownTable(byAction, ['Action', 'Count', 'Value'])}

## By Owner

${markdownTable(byOwner, ['Owner', 'Count', 'Value'])}

## By Risk

${markdownTable(byRisk, ['Risk', 'Count', 'Value'])}

## Top Ben Review Rows

${markdownTable(topBenRows, ['Date', 'Vendor', 'Amount', 'Action', 'Risk', 'Reason'])}

## Files

- \`queue.csv\`
- \`queue.json\`

## Verification Status

- verified: Generated from live Supabase bank-line, receipt-link, Xero transaction, and Xero invoice mirrors.
- unverified: No Xero UI action, Xero write, attachment upload, or Dext publish was performed by this script.
`;

  writeFileSync(join(OUT_DIR, 'action-queue.md'), md);

  const provenance = `# Bank-Line Action Queue ${DATE} Provenance

## Purpose

- Output: Q2/Q3 bank-line close action queue.
- Intended destination: ACT finance close workflow and Xero Page Copilot validation.
- Why it was generated: Convert receipt/Xero/Dext/project state into one next action per bank line.

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| \`v_finance_bank_line_evidence\` | Supabase view | ${quarterList.join(', ')} FY${FY} | Base bank-line and evidence status queue. |
| \`finance_receipt_bank_line_links\` | Supabase table | ${quarterList.join(', ')} FY${FY} | Approved/rejected receipt evidence state. |
| \`finance_receipt_documents\` | Supabase table | ${quarterList.join(', ')} FY${FY} linked rows | Receipt file/source/Xero target metadata. |
| \`xero_transactions\` | Supabase mirror | ${quarterList.join(', ')} FY${FY} | Xero target attachment/reconciliation state. |
| \`xero_invoices\` | Supabase mirror | ${quarterList.join(', ')} FY${FY} | Exact bill candidates for Find & Match. |

## Verification Status

- verified: Report was generated from live Supabase mirrors.
- inferred: Next action, risk, owner, and Xero coding suggestions are rule-based classifications.
- unverified: No Xero UI action, Xero write, attachment upload, Dext publish, or BAS lodgement check was performed.

## Reproduction Steps

1. Run \`node scripts/build-bank-line-action-queue.mjs --quarters ${quarterList.join(',')}\`.
2. Review \`${OUT_DIR}/action-queue.md\`.
3. Use \`${OUT_DIR}/queue.csv\` for filtered close work.
`;

  writeFileSync(join(OUT_DIR, 'action-queue.provenance.md'), provenance);
}

const bankRows = await loadBankRows();
const [linksByBankLine, transactionsById, invoices] = await Promise.all([
  loadLinks(),
  loadXeroTransactions(),
  loadXeroInvoices(),
]);

const context = { linksByBankLine, transactionsById, invoices };
const actionRows = bankRows
  .map((row) => classifyRow(row, context))
  .sort((a, b) => {
    if (a.quarter !== b.quarter) return a.quarter.localeCompare(b.quarter);
    if (a.risk !== b.risk) return ['high', 'medium', 'low'].indexOf(a.risk) - ['high', 'medium', 'low'].indexOf(b.risk);
    return b.amount - a.amount;
  });

writeReports(actionRows);

if (FORMAT === 'json') {
  console.log(JSON.stringify(actionRows, null, 2));
} else {
  const byAction = summarize(actionRows, 'next_action');
  console.log(`Bank-line action queue generated: ${OUT_DIR}`);
  console.log(`Rows: ${actionRows.length}`);
  for (const row of byAction) {
    console.log(`${row.key}: ${row.count} (${money(row.value)})`);
  }
}
