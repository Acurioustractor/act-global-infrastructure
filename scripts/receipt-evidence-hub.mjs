#!/usr/bin/env node
/**
 * Build the receipt evidence mirror for BAS close work.
 *
 * Default mode is read-only: generate a dated report with candidate links.
 * Apply mode writes only Supabase evidence mirror tables:
 *   - finance_receipt_documents
 *   - finance_receipt_bank_line_links
 *   - finance_receipt_ingestion_runs
 *
 * It never writes to Xero and never reconciles bank-feed lines.
 *
 * Usage:
 *   node scripts/receipt-evidence-hub.mjs
 *   node scripts/receipt-evidence-hub.mjs --quarters Q2,Q3
 *   node scripts/receipt-evidence-hub.mjs Q2 --apply
 *   node scripts/receipt-evidence-hub.mjs Q2 Q3 --limit-lines 100
 */

import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
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
const FY = Number(valueAfter('--fy') || '26');
const LIMIT_LINES = valueAfter('--limit-lines') ? Number(valueAfter('--limit-lines')) : null;
const MATCH_THRESHOLD = Number(valueAfter('--min-confidence') || '0.6');
const QUARTERS = parseQuarterArgs();
const DATE = todayInBrisbane();
const RUN_ID = randomUUID();
const RUN_KEY = `receipt-evidence-hub-${DATE}-${RUN_ID.slice(0, 8)}`;
const REPORT_DIR = join('thoughts', 'shared', 'reports', `receipt-evidence-hub-${DATE}`);

const HIGH_CONFIDENCE_THRESHOLD = 0.85;
const MAX_CANDIDATES_PER_LINE = 5;
const DATE_WINDOW_DAYS = 60;
const STRICT_RECEIPT_DATE_DAYS = 7;
const REVIEW_RECEIPT_DATE_DAYS = 14;
const ACTIVE_LINK_STATUSES = ['candidate', 'approved', 'linked_in_xero', 'needs_review'];

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1];
}

function parseQuarterArgs() {
  const option = valueAfter('--quarters');
  if (option) return option.split(',').map((q) => q.trim().toUpperCase()).filter(Boolean);
  const positional = args.filter((arg) => /^Q[1-4]$/i.test(arg)).map((arg) => arg.toUpperCase());
  return positional.length ? positional : ['Q2', 'Q3'];
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

function addDays(dateString, days) {
  const d = new Date(`${dateString}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function absAmount(value) {
  const n = toNumber(value);
  return n === null ? null : Math.abs(n);
}

function money(value) {
  return Number(value || 0).toLocaleString('en-AU', {
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

function compactText(value) {
  return cleanText(value).replace(/\s+/g, '');
}

function bigrams(value) {
  const s = compactText(value);
  const pairs = [];
  for (let i = 0; i < s.length - 1; i += 1) pairs.push(s.slice(i, i + 2));
  return pairs;
}

function similarity(a, b) {
  const aa = bigrams(a);
  const bb = bigrams(b);
  if (!aa.length || !bb.length) return 0;
  const setB = new Set(bb);
  const matches = aa.filter((pair) => setB.has(pair)).length;
  return (2 * matches) / (aa.length + bb.length);
}

const GENERIC_VENDOR_TOKENS = new Set([
  'australia',
  'australian',
  'alice',
  'brisbane',
  'cairns',
  'darwin',
  'garbutt',
  'sydney',
  'melbourne',
  'mascot',
  'maleny',
  'mount',
  'mt',
  'north',
  'south',
  'springs',
  'townsville',
  'west',
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
  'holdings',
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
  'sales',
  'service',
  'services',
  'store',
  'stores',
  'the',
  'with',
  'www',
  'com',
  'au',
  'beach',
  'apartments',
  'apartment',
]);

function vendorTokens(value) {
  return cleanText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !GENERIC_VENDOR_TOKENS.has(token));
}

const VENDOR_ALIASES = new Map([
  ['highlevel', ['go high level', 'gohighlevel', 'msgsndr']],
  ['gohighlevel', ['highlevel', 'go high level', 'msgsndr']],
  ['anthropic', ['claude', 'claude ai']],
  ['claude ai', ['anthropic', 'claude']],
  ['openai', ['chatgpt', 'open ai']],
  ['railway corporation', ['railway', 'railway app']],
  ['x global llc', ['x corp', 'twitter', 'x.com']],
  ['qantas', ['qantas airways', 'qantas air']],
  ['uber', ['uber trip', 'uber eats', 'rasier']],
  ['bunnings warehouse', ['bunnings']],
  ['bunnings', ['bunnings warehouse']],
  ['webflow', ['webflow com']],
  ['supabase', ['supabase singapore']],
  ['zapier', ['zapier com']],
  ['bitwarden', ['bitwarden inc']],
  ['figma', ['figma inc']],
  ['vercel', ['vercel inc']],
  ['descript', ['descript com']],
  ['cognition ai', ['cognition labs']],
  ['mighty networks', ['mighty']],
  ['sideguide technologies', ['sideguide']],
  ['dialpad', ['dialpad inc']],
  ['avis', ['avis australia']],
  ['virgin australia', ['virgin']],
]);

function aliasVariants(value) {
  const cleaned = cleanText(value);
  const variants = new Set([cleaned]);
  const aliases = VENDOR_ALIASES.get(cleaned) || [];
  for (const alias of aliases) variants.add(cleanText(alias));
  for (const [key, vals] of VENDOR_ALIASES.entries()) {
    if (vals.map(cleanText).includes(cleaned)) variants.add(key);
  }
  return [...variants].filter(Boolean);
}

function vendorScore(docVendor, linePayee, lineParticulars) {
  const docVariants = aliasVariants(docVendor);
  const lineText = cleanText(`${linePayee || ''} ${lineParticulars || ''}`);
  const payeeText = cleanText(linePayee);
  const lineTokens = new Set(vendorTokens(lineText));

  if (!docVariants.length || !lineText) return 0;

  let best = 0;
  let hasTokenOverlap = false;
  let hasDirectMatch = false;
  for (const vendor of docVariants) {
    if (!vendor) continue;
    const meaningfulVendorTokens = vendorTokens(vendor);
    const tokenOverlap = meaningfulVendorTokens.some((token) => lineTokens.has(token));
    hasTokenOverlap ||= tokenOverlap;

    if (lineText.includes(vendor) || tokenOverlap) {
      best = Math.max(best, 1);
      hasDirectMatch = true;
    }
    if (payeeText && (payeeText.includes(vendor) || (tokenOverlap && vendor.includes(payeeText)))) {
      best = Math.max(best, 0.95);
      hasDirectMatch = true;
    }
    best = Math.max(best, similarity(vendor, payeeText), similarity(vendor, lineText));
  }

  // Fuzzy-only vendor similarity is too weak for evidence linking: e.g.
  // "Avis Australia" vs "Virgin Australia" must not match via "Australia".
  if (!hasDirectMatch && !hasTokenOverlap) best = Math.min(best, 0.3);
  return Math.min(best, 1);
}

function hasStrongVendorOverlap(docVendor, linePayee, lineParticulars) {
  const docVariants = aliasVariants(docVendor);
  const lineText = cleanText(`${linePayee || ''} ${lineParticulars || ''}`);
  const payeeText = cleanText(linePayee);
  const lineTokens = new Set(vendorTokens(lineText));

  if (!docVariants.length || !lineText) return false;

  for (const vendor of docVariants) {
    const cleanedVendor = cleanText(vendor);
    if (!cleanedVendor) continue;

    if (lineText.includes(cleanedVendor) || (payeeText && payeeText.includes(cleanedVendor))) {
      return true;
    }

    const tokens = vendorTokens(cleanedVendor);
    if (!tokens.length) continue;
    const overlapCount = tokens.filter((token) => lineTokens.has(token)).length;

    if (tokens.length === 1 && overlapCount === 1) return true;
    if (tokens.length > 1 && overlapCount >= Math.min(2, tokens.length)) return true;
  }

  return false;
}

function amountScore(docAmount, lineAmount) {
  const d = absAmount(docAmount);
  const l = absAmount(lineAmount);
  if (!d || !l) return 0;
  const delta = Math.abs(d - l);
  if (delta < 0.01) return 1;
  if (delta <= Math.max(1, l * 0.01)) return 0.96;
  if (Math.abs(d * 1.1 - l) / l < 0.02) return 0.92;
  if (Math.abs(d / 1.1 - l) / l < 0.02) return 0.92;
  const pct = delta / Math.max(d, l);
  if (pct < 0.05) return 0.8;
  if (pct < 0.1) return 0.55;
  if (pct < 0.2) return 0.25;
  return 0;
}

function dateScore(docDate, lineDate) {
  if (!docDate || !lineDate) return 0;
  const diff = Math.abs(new Date(docDate).getTime() - new Date(lineDate).getTime()) / 86400000;
  if (diff <= 1) return 1;
  if (diff <= 3) return 0.9;
  if (diff <= 7) return 0.75;
  if (diff <= 14) return 0.55;
  if (diff <= 30) return 0.3;
  if (diff <= DATE_WINDOW_DAYS) return 0.15;
  return 0;
}

function referenceScore(doc, line) {
  const docRefs = [
    doc.document_number,
    doc.attachment_filename,
    doc.subject,
  ].map(compactText).filter((value) => value.length >= 4);
  const lineRefs = [
    line.reference,
    line.particulars,
    line.analysis_code,
  ].map(compactText).filter((value) => value.length >= 4);

  for (const left of docRefs) {
    for (const right of lineRefs) {
      if (left === right) return 1;
      if (left.includes(right) || right.includes(left)) return 0.9;
    }
  }
  return 0;
}

function isHighFrequencyVendor(line) {
  const text = cleanText(`${line.payee || ''} ${line.particulars || ''}`);
  return ['qantas', 'uber', 'webflow', 'highlevel', 'zapier', 'railway', 'vercel', 'bitwarden']
    .some((vendor) => text.includes(vendor));
}

function isLikelyForeignCurrencyVendor(doc, line) {
  const text = cleanText(`${doc.vendor_name || ''} ${doc.subject || ''} ${doc.attachment_filename || ''} ${line.payee || ''} ${line.particulars || ''}`);
  const textTokens = new Set(text.split(' ').filter(Boolean));
  const knownVendors = [
    'anthropic',
    'claude',
    'codeguide',
    'cognition',
    'cursor',
    'descript',
    'exa',
    'figma',
    'firecrawl',
    'github',
    'holafly',
    'jetboost',
    'landingfolio',
    'mighty',
    'napkin',
    'notion',
    'openai',
    'railway',
    'serpapi',
    'sideguide',
    'supabase',
    'superdesign',
    'vercel',
    'warp',
    'webflow',
    'x global',
    'zapier',
  ];
  return knownVendors.some((vendor) => {
    const cleanedVendor = cleanText(vendor);
    return cleanedVendor.includes(' ')
      ? text.includes(cleanedVendor)
      : textTokens.has(cleanedVendor);
  });
}

function lineXeroIds(line) {
  return new Set([
    line.matched_xero_transaction_id,
    line.xero_transaction_id,
  ].map((value) => String(value || '').trim()).filter(Boolean));
}

function docXeroIds(doc) {
  return new Set([
    doc.xero_transaction_id,
    doc.xero_bank_transaction_id,
    doc.xero_invoice_id,
  ].map((value) => String(value || '').trim()).filter(Boolean));
}

function setsIntersect(left, right) {
  return [...left].some((value) => right.has(value));
}

function hasReceiptAttachment(doc) {
  return Boolean(doc.attachment_url || doc.attachment_storage_path || doc.attachment_filename);
}

function rawXeroStatuses(doc) {
  return [
    doc.status,
    doc.provenance?.status,
    doc.extracted_fields?.status,
  ].map(cleanText).filter(Boolean);
}

function isDeadXeroMirrorDoc(doc) {
  if (!['xero_transaction', 'xero_bill'].includes(doc.source)) return false;
  return rawXeroStatuses(doc).some((status) => ['deleted', 'voided'].includes(status));
}

function isLikelyForeignCurrencyReceipt(doc, line, amountRatio, dateDeltaDays) {
  if (!hasReceiptAttachment(doc)) return false;
  if (!doc.amount_total || !line.amount) return false;
  if (dateDeltaDays === null || Math.abs(dateDeltaDays) > REVIEW_RECEIPT_DATE_DAYS) return false;
  if (isHighFrequencyVendor(line)) return false;
  if (!hasStrongVendorOverlap(doc.vendor_name, line.payee, line.particulars)) return false;
  if (amountRatio < 1.15 || amountRatio > 2.25) return false;

  const currency = cleanText(doc.currency_code || doc.extracted_fields?.currency);
  if (currency && currency !== 'aud') return isLikelyForeignCurrencyVendor(doc, line);

  // Many imported SaaS PDFs lost their native currency and defaulted to AUD.
  // If the vendor/date are tight and the amount ratio looks like FX conversion,
  // keep the receipt visible instead of hiding it behind the AUD mismatch.
  return isLikelyForeignCurrencyVendor(doc, line);
}

function quickReferencePossible(doc, line) {
  const docRefs = compactText(`${doc.document_number || ''} ${doc.attachment_filename || ''} ${doc.subject || ''}`);
  const lineRefs = [
    line.reference,
    line.particulars,
    line.analysis_code,
  ].map(compactText).filter((value) => value.length >= 6);
  if (!docRefs || !lineRefs.length) return false;
  return lineRefs.some((value) => docRefs.includes(value) || value.includes(docRefs));
}

function shouldScoreCandidate(doc, line, lineDateMs, lineAmountValue) {
  if (isDeadXeroMirrorDoc(doc)) return false;

  const lineIds = lineXeroIds(line);
  const docIds = doc._xero_ids || docXeroIds(doc);
  if (setsIntersect(lineIds, docIds)) return true;

  if (doc._date_ms && lineDateMs) {
    const dateDelta = Math.abs(doc._date_ms - lineDateMs) / 86400000;
    if (dateDelta > DATE_WINDOW_DAYS) return false;
  }

  const docAmountValue = doc._amount;
  if (docAmountValue && lineAmountValue) {
    const delta = Math.abs(docAmountValue - lineAmountValue);
    const ratio = Math.max(docAmountValue, lineAmountValue) / Math.min(docAmountValue, lineAmountValue);
    const dateDeltaDays = doc._date_ms && lineDateMs
      ? Math.round((doc._date_ms - lineDateMs) / 86400000)
      : null;
    if (
      delta / Math.max(docAmountValue, lineAmountValue) > 0.2
      && !quickReferencePossible(doc, line)
      && !isLikelyForeignCurrencyReceipt(doc, line, ratio, dateDeltaDays)
    ) {
      return false;
    }
  }

  return true;
}

function scoreCandidate(doc, line) {
  if (isDeadXeroMirrorDoc(doc)) return null;

  const lineIds = lineXeroIds(line);
  const docIds = doc._xero_ids || docXeroIds(doc);
  const hasXeroIdMatch = setsIntersect(lineIds, docIds);
  const v = vendorScore(doc.vendor_name, line.payee, line.particulars);
  const a = amountScore(doc.amount_total, line.amount);
  const docDate = doc.document_date || dateOnly(doc.received_at);
  const d = dateScore(docDate, line.date);
  const r = referenceScore(doc, line);
  const lineAmount = absAmount(line.amount);
  const docAmount = absAmount(doc.amount_total);
  const amountDelta = docAmount === null || lineAmount === null ? null : Number((docAmount - lineAmount).toFixed(2));
  const dateDeltaDays = docDate
    ? Math.round((new Date(docDate).getTime() - new Date(line.date).getTime()) / 86400000)
    : null;
  const amountRatio = docAmount && lineAmount
    ? Math.max(docAmount, lineAmount) / Math.min(docAmount, lineAmount)
    : null;

  if (hasXeroIdMatch) {
    return {
      confidence: 0.99,
      vendor_score: v,
      amount_score: a,
      date_score: d,
      amount_delta: amountDelta,
      date_delta_days: dateDeltaDays,
      match_method: 'xero_id',
    };
  }

  if (r >= 0.9 && a >= 0.8) {
    return {
      confidence: 0.97,
      vendor_score: v,
      amount_score: a,
      date_score: d,
      amount_delta: amountDelta,
      date_delta_days: dateDeltaDays,
      match_method: 'reference_amount',
    };
  }

  const foreignCurrencyReceipt = amountRatio !== null
    && isLikelyForeignCurrencyReceipt(doc, line, amountRatio, dateDeltaDays);

  if (foreignCurrencyReceipt && v >= 0.85 && d >= 0.75) {
    return {
      confidence: Math.min(0.93, 0.72 + (v * 0.12) + (d * 0.09)),
      vendor_score: v,
      amount_score: a,
      date_score: d,
      amount_delta: amountDelta,
      date_delta_days: dateDeltaDays,
      match_method: 'vendor_date_foreign_currency',
    };
  }

  if (v < 0.42 && r < 0.8) return null;
  if (a === 0 && r < 0.8) return null;
  if (d === 0 && a < 0.96 && r < 0.8) return null;

  const absDateDeltaDays = dateDeltaDays === null ? null : Math.abs(dateDeltaDays);

  let confidence;
  if (isHighFrequencyVendor(line)) {
    confidence = (v * 0.15) + (a * 0.55) + (d * 0.30);
  } else {
    confidence = (v * 0.35) + (a * 0.45) + (d * 0.20);
  }

  if (v >= 0.85 && a >= 0.96 && d >= 0.75) confidence = Math.max(confidence, 0.9);
  if (v >= 0.95 && a >= 0.92 && d >= 0.75) confidence = Math.max(confidence, 0.92);

  // Exact vendor/amount matches can still be wrong when the date is far away.
  // Keep them visible as review candidates, but never let them look safe.
  if (absDateDeltaDays !== null && absDateDeltaDays > STRICT_RECEIPT_DATE_DAYS && r < 0.9) {
    confidence = Math.min(confidence, absDateDeltaDays <= REVIEW_RECEIPT_DATE_DAYS ? 0.82 : 0.7);
  }

  confidence = Math.min(confidence, 0.99);
  if (confidence < MATCH_THRESHOLD) return null;

  return {
    confidence,
    vendor_score: v,
    amount_score: a,
    date_score: d,
    amount_delta: amountDelta,
    date_delta_days: dateDeltaDays,
    match_method: a >= 0.96 && v >= 0.85 ? 'vendor_amount_date' : 'heuristic',
  };
}

async function fetchAll(table, select, configure, pageSize = 1000) {
  const rows = [];
  let page = 0;

  while (true) {
    let query = sb.from(table).select(select);
    if (configure) query = configure(query);
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await query.range(from, to);
    if (error) throw new Error(`${table} fetch failed: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
    page += 1;
  }

  return rows;
}

function normalizeDocument(doc) {
  const source = doc.source || 'other';
  const sourceRecordId = String(doc.source_record_id || doc.id || '').trim();
  if (!sourceRecordId) return null;

  if (['xero_transaction', 'xero_bill'].includes(source)) {
    if (isDeadXeroMirrorDoc({ ...doc, source })) return null;
  }

  return {
    id: doc.id || null,
    source,
    source_record_id: sourceRecordId,
    source_table: doc.source_table || null,
    mailbox: doc.mailbox || null,
    gmail_message_id: doc.gmail_message_id || null,
    gmail_thread_id: doc.gmail_thread_id || null,
    from_email: doc.from_email || null,
    subject: doc.subject || null,
    received_at: doc.received_at || null,
    vendor_name: doc.vendor_name || doc.contact_name || null,
    document_number: doc.document_number || doc.invoice_number || doc.reference || null,
    document_date: doc.document_date || doc.date || dateOnly(doc.received_at),
    amount_total: toNumber(doc.amount_total ?? doc.total ?? doc.amount_detected),
    tax_amount: toNumber(doc.tax_amount ?? doc.total_tax),
    currency_code: doc.currency_code || doc.currency || 'AUD',
    attachment_url: doc.attachment_url || null,
    attachment_storage_path: doc.attachment_storage_path || null,
    attachment_filename: doc.attachment_filename || doc.filename || null,
    attachment_content_type: doc.attachment_content_type || doc.file_type || null,
    attachment_size_bytes: doc.attachment_size_bytes || null,
    xero_transaction_id: doc.xero_transaction_id || null,
    xero_bank_transaction_id: doc.xero_bank_transaction_id || null,
    xero_invoice_id: doc.xero_invoice_id || doc.xero_id || null,
    xero_file_id: doc.xero_file_id || null,
    xero_attachment_id: doc.xero_attachment_id || null,
    xero_tenant_id: doc.xero_tenant_id || doc.tenant_id || null,
    project_code: doc.project_code || null,
    entity_code: doc.entity_code || null,
    ocr_text: doc.ocr_text || null,
    extracted_fields: doc.extracted_fields || {},
    provenance: doc.provenance || {},
    status: doc.status || 'candidate',
  };
}

function documentKey(doc) {
  return `${doc.source}:${doc.source_record_id}`;
}

function mergeDocuments(docs) {
  const byKey = new Map();
  for (const raw of docs) {
    const doc = normalizeDocument(raw);
    if (!doc) continue;
    const key = documentKey(doc);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, doc);
      continue;
    }

    // Prefer the canonical evidence table because it may already contain OCR,
    // storage paths, manually imported amounts, and reviewed metadata.
    const preferIncoming = Boolean(doc.id) && !existing.id;
    byKey.set(key, preferIncoming ? { ...existing, ...doc } : { ...doc, ...existing });
  }
  return [...byKey.values()];
}

async function loadContext(dateStart, dateEnd) {
  const sourceStart = addDays(dateStart, -DATE_WINDOW_DAYS);
  const sourceEnd = addDays(dateEnd, DATE_WINDOW_DAYS);

  let lines = await fetchAll(
    'bank_statement_lines',
    'id,date,type,payee,particulars,reference,analysis_code,amount,direction,status,bank_account,matched_xero_transaction_id,matched_receipt_email_id,project_code,project_source,rd_eligible,notes,receipt_match_id,receipt_match_score,receipt_match_status,xero_transaction_id,xero_tenant_id,lane,lcaa_phase',
    (query) => query
      .eq('direction', 'debit')
      .gte('date', dateStart)
      .lte('date', dateEnd)
      .order('date', { ascending: true }),
  );
  if (LIMIT_LINES) lines = lines.slice(0, LIMIT_LINES);

  const canonicalDocs = await fetchAll(
    'finance_receipt_documents',
    'id,source,source_record_id,source_table,mailbox,gmail_message_id,gmail_thread_id,from_email,subject,received_at,vendor_name,document_number,document_date,amount_total,tax_amount,currency_code,attachment_url,attachment_storage_path,attachment_filename,attachment_content_type,attachment_size_bytes,xero_transaction_id,xero_bank_transaction_id,xero_invoice_id,xero_file_id,xero_attachment_id,xero_tenant_id,project_code,entity_code,ocr_text,extracted_fields,provenance,status',
    (query) => query
      .not('status', 'in', '("duplicate","ignored")')
      .or(`and(document_date.gte.${sourceStart},document_date.lte.${sourceEnd}),and(received_at.gte.${sourceStart}T00:00:00Z,received_at.lte.${sourceEnd}T23:59:59Z)`),
  );

  const receiptEmails = await fetchAll(
    'receipt_emails',
    'id,gmail_message_id,mailbox,from_email,subject,received_at,vendor_name,amount_detected,currency,attachment_url,attachment_filename,attachment_content_type,attachment_size_bytes,xero_transaction_id,xero_bank_transaction_id,xero_invoice_id,match_confidence,match_method,project_code,status,error_message,source,dext_item_id,entity_code,xero_tenant_id,created_at,updated_at',
    (query) => query
      .not('status', 'in', '("junk","skipped")')
      .gte('received_at', `${sourceStart}T00:00:00Z`)
      .lte('received_at', `${sourceEnd}T23:59:59Z`)
      .order('received_at', { ascending: true }),
  );

  const dextReceipts = await fetchAll(
    'dext_receipts',
    'id,vendor_name,receipt_date,dext_id,file_type,filename,xero_transaction_id,match_confidence,match_method,imported_at,matched_at,notes',
    (query) => query
      .gte('receipt_date', sourceStart)
      .lte('receipt_date', sourceEnd)
      .order('receipt_date', { ascending: true }),
  );

  const xeroBills = await fetchAll(
    'xero_invoices',
    'id,xero_id,tenant_id,invoice_number,type,status,contact_name,date,total,total_tax,currency_code,line_items,has_attachments,reference,project_code,entity_code,xero_tenant_id',
    (query) => query
      .eq('type', 'ACCPAY')
      .eq('has_attachments', true)
      .gte('date', sourceStart)
      .lte('date', sourceEnd)
      .order('date', { ascending: true }),
  );

  const xeroTransactions = await fetchAll(
    'xero_transactions',
    'id,xero_transaction_id,type,contact_name,bank_account,project_code,total,status,date,line_items,has_attachments,is_reconciled,entity_code,xero_tenant_id',
    (query) => query
      .eq('has_attachments', true)
      .gte('date', sourceStart)
      .lte('date', sourceEnd)
      .order('date', { ascending: true }),
  );

  const documents = mergeDocuments([
    ...canonicalDocs,
    ...receiptEmails.map((row) => ({
      ...row,
      source: row.source === 'gmail_raw' ? 'gmail_raw' : 'receipt_email',
      source_record_id: row.id,
      source_table: 'receipt_emails',
      document_date: dateOnly(row.received_at),
      amount_total: row.amount_detected,
      currency_code: row.currency || 'AUD',
      status: 'candidate',
      provenance: {
        imported_by: 'scripts/receipt-evidence-hub.mjs',
        source_table: 'receipt_emails',
      },
    })),
    ...dextReceipts.map((row) => ({
      source: 'dext_receipt',
      source_record_id: row.id,
      source_table: 'dext_receipts',
      vendor_name: row.vendor_name,
      document_number: row.dext_id,
      document_date: row.receipt_date,
      attachment_filename: row.filename,
      attachment_content_type: row.file_type,
      xero_transaction_id: row.xero_transaction_id,
      status: 'candidate',
      provenance: {
        imported_by: 'scripts/receipt-evidence-hub.mjs',
        source_table: 'dext_receipts',
      },
    })),
    ...xeroBills.map((row) => ({
      source: 'xero_bill',
      source_record_id: row.xero_id || row.id,
      source_table: 'xero_invoices',
      vendor_name: row.contact_name,
      document_number: row.invoice_number || row.reference,
      document_date: row.date,
      amount_total: row.total,
      tax_amount: row.total_tax,
      currency_code: row.currency_code || 'AUD',
      xero_invoice_id: row.xero_id,
      xero_tenant_id: row.xero_tenant_id || row.tenant_id,
      project_code: row.project_code,
      entity_code: row.entity_code,
      status: row.status || 'linked_in_xero',
      provenance: {
        imported_by: 'scripts/receipt-evidence-hub.mjs',
        source_table: 'xero_invoices',
        has_attachments: true,
        status: row.status || null,
      },
    })),
    ...xeroTransactions.map((row) => ({
      source: 'xero_transaction',
      source_record_id: row.xero_transaction_id || row.id,
      source_table: 'xero_transactions',
      vendor_name: row.contact_name,
      document_date: row.date,
      amount_total: row.total,
      xero_transaction_id: row.xero_transaction_id,
      xero_tenant_id: row.xero_tenant_id,
      project_code: row.project_code,
      entity_code: row.entity_code,
      status: row.status || (row.is_reconciled ? 'linked_in_xero' : 'candidate'),
      provenance: {
        imported_by: 'scripts/receipt-evidence-hub.mjs',
        source_table: 'xero_transactions',
        has_attachments: true,
        is_reconciled: row.is_reconciled,
        status: row.status || null,
      },
    })),
  ]);

  return {
    lines,
    documents,
    sourceCounts: {
      canonical_docs: canonicalDocs.length,
      receipt_emails: receiptEmails.length,
      dext_receipts: dextReceipts.length,
      xero_bills: xeroBills.length,
      xero_transactions: xeroTransactions.length,
    },
  };
}

function buildCandidates(lines, documents, rejectedKeys = new Set()) {
  const byLine = new Map();
  const links = [];
  const preparedDocs = documents.map((doc) => ({
    ...doc,
    _amount: absAmount(doc.amount_total),
    _date_ms: doc.document_date || doc.received_at
      ? new Date(doc.document_date || dateOnly(doc.received_at)).getTime()
      : null,
    _xero_ids: docXeroIds(doc),
  }));

  for (const line of lines) {
    const scored = [];
    const lineDateMs = line.date ? new Date(line.date).getTime() : null;
    const lineAmountValue = absAmount(line.amount);
    for (const doc of preparedDocs) {
      const sourceKey = documentKey(doc);
      if (rejectedKeys.has(`${line.id}:${sourceKey}`)) continue;
      if (doc.id && rejectedKeys.has(`${line.id}:${doc.id}`)) continue;
      if (!shouldScoreCandidate(doc, line, lineDateMs, lineAmountValue)) continue;

      const score = scoreCandidate(doc, line);
      if (!score) continue;
      scored.push({ doc, score });
    }

    scored.sort((a, b) => b.score.confidence - a.score.confidence);
    const top = scored.slice(0, MAX_CANDIDATES_PER_LINE);
    byLine.set(line.id, top);

    for (const [index, candidate] of top.entries()) {
      const doc = candidate.doc;
      const xeroAction = doc.source === 'xero_bill'
        ? 'find_match'
        : ['receipt_email', 'dext_receipt', 'gmail_raw', 'manual_upload', 'xero_files', 'xero_me'].includes(doc.source)
          ? 'attach_file'
          : 'none';
      links.push({
        bank_line_id: line.id,
        receipt_document_id: doc.id || null,
        document_key: documentKey(doc),
        link_status: 'candidate',
        match_method: candidate.score.match_method,
        confidence: Number(candidate.score.confidence.toFixed(4)),
        rank: index + 1,
        is_best_candidate: index === 0,
        vendor_score: Number(candidate.score.vendor_score.toFixed(4)),
        amount_score: Number(candidate.score.amount_score.toFixed(4)),
        date_score: Number(candidate.score.date_score.toFixed(4)),
        amount_delta: candidate.score.amount_delta,
        date_delta_days: candidate.score.date_delta_days,
        review_owner: null,
        review_note: null,
        xero_action: xeroAction,
        provenance: {
          run_id: RUN_ID,
          run_key: RUN_KEY,
          source: doc.source,
          source_table: doc.source_table,
          quarter_scope: QUARTERS,
          high_confidence: candidate.score.confidence >= HIGH_CONFIDENCE_THRESHOLD,
        },
        created_by: 'agent',
      });
    }
  }

  return { byLine, links };
}

function summarize(lines, documents, links) {
  const candidateLineIds = new Set(links.map((link) => link.bank_line_id));
  const highConfidenceLineIds = new Set(
    links.filter((link) => link.confidence >= HIGH_CONFIDENCE_THRESHOLD).map((link) => link.bank_line_id),
  );
  const legacyCovered = lines.filter((line) => ['matched', 'no_receipt_needed'].includes(line.receipt_match_status)).length;
  const totalSpend = lines.reduce((sum, line) => sum + (absAmount(line.amount) || 0), 0);
  const highConfidenceSpend = lines
    .filter((line) => highConfidenceLineIds.has(line.id))
    .reduce((sum, line) => sum + (absAmount(line.amount) || 0), 0);
  const bySource = {};
  for (const doc of documents) bySource[doc.source] = (bySource[doc.source] || 0) + 1;

  return {
    bank_lines: lines.length,
    debit_spend: Number(totalSpend.toFixed(2)),
    documents: documents.length,
    links: links.length,
    candidate_lines: candidateLineIds.size,
    high_confidence_lines: highConfidenceLineIds.size,
    high_confidence_spend: Number(highConfidenceSpend.toFixed(2)),
    uncovered_lines_after_candidates: Math.max(lines.length - candidateLineIds.size, 0),
    legacy_covered_lines: legacyCovered,
    documents_by_source: bySource,
  };
}

function csvValue(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(path, rows, columns) {
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => csvValue(row[column])).join(','));
  }
  writeFileSync(path, `${lines.join('\n')}\n`);
}

function writeReport({ dateStart, dateEnd, context, byLine, links, summary }) {
  mkdirSync(REPORT_DIR, { recursive: true });

  const docRows = context.documents.map((doc) => ({
    source: doc.source,
    source_record_id: doc.source_record_id,
    vendor_name: doc.vendor_name || '',
    amount_total: doc.amount_total ?? '',
    document_date: doc.document_date || '',
    received_at: doc.received_at || '',
    status: doc.status,
    attachment_filename: doc.attachment_filename || '',
    xero_transaction_id: doc.xero_transaction_id || '',
    xero_invoice_id: doc.xero_invoice_id || '',
  }));

  const candidateRows = [];
  const uncoveredRows = [];
  for (const line of context.lines) {
    const candidates = byLine.get(line.id) || [];
    if (!candidates.length) {
      uncoveredRows.push({
        id: line.id,
        date: line.date,
        payee: line.payee || '',
        particulars: line.particulars || '',
        amount: absAmount(line.amount) || 0,
        status: line.status || '',
        receipt_match_status: line.receipt_match_status || '',
        project_code: line.project_code || '',
      });
    }

    for (const [index, candidate] of candidates.entries()) {
      candidateRows.push({
        bank_line_id: line.id,
        line_date: line.date,
        payee: line.payee || '',
        particulars: line.particulars || '',
        amount: absAmount(line.amount) || 0,
        rank: index + 1,
        confidence: candidate.score.confidence.toFixed(4),
        source: candidate.doc.source,
        document_id: candidate.doc.source_record_id,
        document_vendor: candidate.doc.vendor_name || '',
        document_amount: candidate.doc.amount_total ?? '',
        document_date: candidate.doc.document_date || dateOnly(candidate.doc.received_at) || '',
        match_method: candidate.score.match_method,
        high_confidence: candidate.score.confidence >= HIGH_CONFIDENCE_THRESHOLD ? 'yes' : 'no',
      });
    }
  }

  writeCsv(join(REPORT_DIR, 'documents.csv'), docRows, [
    'source',
    'source_record_id',
    'vendor_name',
    'amount_total',
    'document_date',
    'received_at',
    'status',
    'attachment_filename',
    'xero_transaction_id',
    'xero_invoice_id',
  ]);

  writeCsv(join(REPORT_DIR, 'candidates.csv'), candidateRows, [
    'bank_line_id',
    'line_date',
    'payee',
    'particulars',
    'amount',
    'rank',
    'confidence',
    'source',
    'document_id',
    'document_vendor',
    'document_amount',
    'document_date',
    'match_method',
    'high_confidence',
  ]);

  writeCsv(join(REPORT_DIR, 'uncovered-bank-lines.csv'), uncoveredRows, [
    'id',
    'date',
    'payee',
    'particulars',
    'amount',
    'status',
    'receipt_match_status',
    'project_code',
  ]);

  const md = [
    `# Receipt Evidence Hub - ${QUARTERS.join(' + ')} FY${FY}`,
    '',
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`,
    `Date range: ${dateStart} to ${dateEnd}`,
    '',
    '## Summary',
    '',
    `- Bank debit lines: ${summary.bank_lines}`,
    `- Debit spend: ${money(summary.debit_spend)}`,
    `- Evidence documents found: ${summary.documents}`,
    `- Candidate links: ${summary.links}`,
    `- Candidate lines: ${summary.candidate_lines}`,
    `- High-confidence candidate lines: ${summary.high_confidence_lines} (${money(summary.high_confidence_spend)})`,
    `- Uncovered after candidates: ${summary.uncovered_lines_after_candidates}`,
    `- Legacy-covered lines: ${summary.legacy_covered_lines}`,
    `- Minimum confidence threshold: ${MATCH_THRESHOLD}`,
    '',
    '## Source Counts',
    '',
    ...Object.entries(context.sourceCounts).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Output Files',
    '',
    `- ${join(REPORT_DIR, 'documents.csv')}`,
    `- ${join(REPORT_DIR, 'candidates.csv')}`,
    `- ${join(REPORT_DIR, 'uncovered-bank-lines.csv')}`,
    '',
    '## Verification Status',
    '',
    `verified: Queried live Supabase bank lines and receipt evidence sources for ${dateStart} to ${dateEnd}.`,
    `inferred: Candidate confidence scores are deterministic heuristic calculations in scripts/receipt-evidence-hub.mjs.`,
    `unverified: No Xero UI reconciliation, Xero attachment upload, or BAS lodgement check was performed by this script.`,
    '',
  ];
  writeFileSync(join(REPORT_DIR, 'summary.md'), md.join('\n'));

  const provenance = [
    `# Provenance - Receipt Evidence Hub ${QUARTERS.join(' + ')} FY${FY}`,
    '',
    `Report: ${join(REPORT_DIR, 'summary.md')}`,
    `Generated: ${new Date().toISOString()}`,
    `Command: node scripts/receipt-evidence-hub.mjs --quarters ${QUARTERS.join(',')} --fy ${FY}${APPLY ? ' --apply' : ''}`,
    '',
    '## Queried Sources',
    '',
    `- public.bank_statement_lines: debit lines from ${dateStart} to ${dateEnd}`,
    `- public.finance_receipt_documents: canonical evidence in ${addDays(dateStart, -DATE_WINDOW_DAYS)} to ${addDays(dateEnd, DATE_WINDOW_DAYS)}`,
    '- public.receipt_emails: raw receipt email mirror',
    '- public.dext_receipts: Dext receipt mirror',
    '- public.xero_invoices: ACCPAY invoices with attachments',
    '- public.xero_transactions: transactions with attachments',
    '',
    '## Verified',
    '',
    '- Live Supabase rows were fetched during this run.',
    '- Report files were written locally under thoughts/shared/reports.',
    '',
    '## Inferred',
    '',
    '- Receipt-to-bank-line links are heuristic unless match_method is xero_id or reference_amount.',
    '',
    '## Unknown / Not Checked',
    '',
    '- Xero UI reconciliation state after the last mirror sync.',
    '- BAS lodgement report values in Xero UI.',
    '- Whether every external mailbox has been captured.',
    '',
  ];
  writeFileSync(join(REPORT_DIR, 'summary.md.provenance.md'), provenance.join('\n'));
}

async function upsertBatches(table, rows, options = {}, batchSize = 500) {
  let count = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { data, error } = await sb.from(table).upsert(batch, options).select();
    if (error) throw new Error(`${table} upsert failed: ${error.message}`);
    count += data?.length || batch.length;
  }
  return count;
}

async function lookupPersistedDocuments(documents, batchSize = 200) {
  const byKey = new Map();
  const sourceRecordIds = [...new Set(documents.map((doc) => doc.source_record_id).filter(Boolean))];

  for (let i = 0; i < sourceRecordIds.length; i += batchSize) {
    const batch = sourceRecordIds.slice(i, i + batchSize);
    const { data, error } = await sb
      .from('finance_receipt_documents')
      .select('id,source,source_record_id')
      .in('source_record_id', batch);
    if (error) throw new Error(`document lookup failed: ${error.message}`);
    for (const row of data || []) byKey.set(`${row.source}:${row.source_record_id}`, row.id);
  }

  return byKey;
}

async function fetchRejectedKeys(lineIds) {
  const rejected = new Set();
  for (let i = 0; i < lineIds.length; i += 200) {
    const batch = lineIds.slice(i, i + 200);
    const { data, error } = await sb
      .from('finance_receipt_bank_line_links')
      .select('bank_line_id,receipt_document_id,finance_receipt_documents(source,source_record_id)')
      .in('bank_line_id', batch)
      .eq('link_status', 'rejected');
    if (error) throw new Error(`rejected link lookup failed: ${error.message}`);
    for (const row of data || []) {
      if (row.receipt_document_id) rejected.add(`${row.bank_line_id}:${row.receipt_document_id}`);
      const doc = row.finance_receipt_documents;
      if (doc?.source && doc?.source_record_id) rejected.add(`${row.bank_line_id}:${doc.source}:${doc.source_record_id}`);
    }
  }
  return rejected;
}

async function fetchProtectedLinkKeys(lineIds) {
  const protectedKeys = new Set();
  for (let i = 0; i < lineIds.length; i += 200) {
    const batch = lineIds.slice(i, i + 200);
    const { data, error } = await sb
      .from('finance_receipt_bank_line_links')
      .select('bank_line_id,receipt_document_id,finance_receipt_documents(source,source_record_id)')
      .in('bank_line_id', batch)
      .in('link_status', ['approved', 'needs_review']);
    if (error) throw new Error(`protected link lookup failed: ${error.message}`);
    for (const row of data || []) {
      if (row.receipt_document_id) protectedKeys.add(`${row.bank_line_id}:${row.receipt_document_id}`);
      const doc = row.finance_receipt_documents;
      if (doc?.source && doc?.source_record_id) protectedKeys.add(`${row.bank_line_id}:${doc.source}:${doc.source_record_id}`);
    }
  }
  return protectedKeys;
}

async function deleteGeneratedLinks(lineIds) {
  for (let i = 0; i < lineIds.length; i += 200) {
    const batch = lineIds.slice(i, i + 200);
    const { error } = await sb
      .from('finance_receipt_bank_line_links')
      .delete()
      .in('bank_line_id', batch)
      .in('link_status', ['candidate', 'linked_in_xero']);
    if (error) throw new Error(`generated link cleanup failed: ${error.message}`);
  }
}

function documentUpsertRows(documents) {
  return documents.map((doc) => ({
    source: doc.source,
    source_record_id: doc.source_record_id,
    source_table: doc.source_table,
    mailbox: doc.mailbox,
    gmail_message_id: doc.gmail_message_id,
    gmail_thread_id: doc.gmail_thread_id,
    from_email: doc.from_email,
    subject: doc.subject,
    received_at: doc.received_at,
    vendor_name: doc.vendor_name,
    document_number: doc.document_number,
    document_date: doc.document_date,
    amount_total: doc.amount_total,
    tax_amount: doc.tax_amount,
    currency_code: doc.currency_code,
    attachment_url: doc.attachment_url,
    attachment_storage_path: doc.attachment_storage_path,
    attachment_filename: doc.attachment_filename,
    attachment_content_type: doc.attachment_content_type,
    attachment_size_bytes: doc.attachment_size_bytes,
    xero_transaction_id: doc.xero_transaction_id,
    xero_bank_transaction_id: doc.xero_bank_transaction_id,
    xero_invoice_id: doc.xero_invoice_id,
    xero_file_id: doc.xero_file_id,
    xero_attachment_id: doc.xero_attachment_id,
    xero_tenant_id: doc.xero_tenant_id,
    project_code: doc.project_code,
    entity_code: doc.entity_code,
    ocr_text: doc.ocr_text,
    extracted_fields: doc.extracted_fields || {},
    provenance: {
      ...(doc.provenance || {}),
      run_id: RUN_ID,
      run_key: RUN_KEY,
    },
    status: doc.status || 'candidate',
    updated_at: new Date().toISOString(),
  }));
}

async function applyChanges(context, links) {
  const lineIds = context.lines.map((line) => line.id);
  const runStarted = new Date().toISOString();
  const runPayload = {
    run_key: RUN_KEY,
    run_type: 'receipt_evidence_hub',
    source_scope: ['finance_receipt_documents', 'receipt_emails', 'dext_receipts', 'xero_invoices', 'xero_transactions'],
    quarter_scope: QUARTERS,
    date_start: context.dateStart,
    date_end: context.dateEnd,
    dry_run: false,
    status: 'running',
    rows_seen: context.lines.length,
    documents_upserted: 0,
    links_upserted: 0,
    summary: {},
    started_at: runStarted,
  };

  const { data: run, error: runError } = await sb
    .from('finance_receipt_ingestion_runs')
    .insert(runPayload)
    .select('id')
    .single();
  if (runError) throw new Error(`run insert failed: ${runError.message}`);

  try {
    const docRows = documentUpsertRows(context.documents);
    const documentsUpserted = await upsertBatches(
      'finance_receipt_documents',
      docRows,
      { onConflict: 'source,source_record_id' },
    );
    const docIdByKey = await lookupPersistedDocuments(context.documents);

    await deleteGeneratedLinks(lineIds);

    const linkRows = links
      .map((link) => {
        const receiptDocumentId = docIdByKey.get(link.document_key) || link.receipt_document_id;
        if (!receiptDocumentId) return null;
        return {
          bank_line_id: link.bank_line_id,
          receipt_document_id: receiptDocumentId,
          link_status: link.link_status,
          match_method: link.match_method,
          confidence: link.confidence,
          rank: link.rank,
          is_best_candidate: link.is_best_candidate,
          vendor_score: link.vendor_score,
          amount_score: link.amount_score,
          date_score: link.date_score,
          amount_delta: link.amount_delta,
          date_delta_days: link.date_delta_days,
          review_owner: link.review_owner,
          review_note: link.review_note,
          xero_action: link.xero_action,
          provenance: link.provenance,
          created_by: link.created_by,
          updated_at: new Date().toISOString(),
        };
      })
      .filter(Boolean);

    const linksUpserted = await upsertBatches(
      'finance_receipt_bank_line_links',
      linkRows,
      { onConflict: 'bank_line_id,receipt_document_id' },
    );

    await sb
      .from('finance_receipt_ingestion_runs')
      .update({
        status: 'completed',
        documents_upserted: documentsUpserted,
        links_upserted: linksUpserted,
        summary: context.summary,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    return { documentsUpserted, linksUpserted };
  } catch (error) {
    await sb
      .from('finance_receipt_ingestion_runs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id);
    throw error;
  }
}

async function main() {
  const quarterRanges = QUARTERS.map((quarter) => quarterDates(FY, quarter));
  const dateStart = quarterRanges.map((range) => range.start).sort()[0];
  const dateEnd = quarterRanges.map((range) => range.end).sort().at(-1);

  const context = await loadContext(dateStart, dateEnd);
  context.dateStart = dateStart;
  context.dateEnd = dateEnd;

  const lineIds = context.lines.map((line) => line.id);
  const rejectedKeys = await fetchRejectedKeys(lineIds);
  const { byLine, links } = buildCandidates(context.lines, context.documents, rejectedKeys);
  const summary = summarize(context.lines, context.documents, links);
  context.summary = summary;

  writeReport({ dateStart, dateEnd, context, byLine, links, summary });

  let applied = null;
  if (APPLY) {
    const protectedKeys = await fetchProtectedLinkKeys(lineIds);
    const applyLinks = links.filter((link) => {
      if (link.receipt_document_id && protectedKeys.has(`${link.bank_line_id}:${link.receipt_document_id}`)) return false;
      return !protectedKeys.has(`${link.bank_line_id}:${link.document_key}`);
    });
    applied = await applyChanges(context, applyLinks);
  }

  console.log(`Receipt evidence hub ${APPLY ? 'apply' : 'dry-run'} complete`);
  console.log(`  Supabase:                ${SUPABASE_URL}`);
  console.log(`  Quarters:                ${QUARTERS.join(', ')}`);
  console.log(`  Date range:              ${dateStart} to ${dateEnd}`);
  console.log(`  Bank debit lines:        ${summary.bank_lines}`);
  console.log(`  Documents:               ${summary.documents}`);
  console.log(`  Candidate links:         ${summary.links}`);
  console.log(`  Candidate lines:         ${summary.candidate_lines}`);
  console.log(`  High-confidence lines:   ${summary.high_confidence_lines}`);
  console.log(`  Uncovered after links:   ${summary.uncovered_lines_after_candidates}`);
  if (applied) {
    console.log(`  Documents upserted:      ${applied.documentsUpserted}`);
    console.log(`  Links upserted:          ${applied.linksUpserted}`);
  }
  console.log(`  Report:                  ${join(REPORT_DIR, 'summary.md')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
