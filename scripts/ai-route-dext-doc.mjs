#!/usr/bin/env node
/**
 * AI Dext / bank-line / Xero routing grader.
 *
 * For every row that has vendor + amount + date but no project_code,
 * ask Sonnet 4.6 which of the 12 ACT project codes it belongs to,
 * with confidence + reason + risk flags. Write to
 * finance_ai_routing_suggestions. With --apply, copy
 * high-confidence (>= 0.85) suggestions to the source row's
 * project_code (except ASK_USER and SL_REVIEW — those stay as
 * suggestions until a human approves).
 *
 * Usage:
 *   node scripts/ai-route-dext-doc.mjs                       # dry run, top 20
 *   node scripts/ai-route-dext-doc.mjs --limit 50            # bigger batch
 *   node scripts/ai-route-dext-doc.mjs --apply               # write back to source
 *   node scripts/ai-route-dext-doc.mjs --source bank         # only bank_statement_lines
 *   node scripts/ai-route-dext-doc.mjs --source receipt      # only receipt_emails
 *   node scripts/ai-route-dext-doc.mjs --source xero         # only xero_transactions
 *   node scripts/ai-route-dext-doc.mjs --model haiku         # faster + cheaper
 *   node scripts/ai-route-dext-doc.mjs --min-confidence 0.9  # raise the apply bar
 */

import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { trackedClaudeCompletion } from './lib/llm-client.mjs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase URL / service role env vars.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const LIMIT = numberAfter('--limit', 20);
const MIN_CONFIDENCE = numberAfter('--min-confidence', 0.85);
const SOURCE = valueAfter('--source') || 'all';
const MODEL_TAG = valueAfter('--model') || 'sonnet';
const MODEL =
  MODEL_TAG === 'haiku' ? 'claude-haiku-4-5'
  : MODEL_TAG === 'opus' ? 'claude-opus-4-7'
  : 'claude-sonnet-4-6';
const PROMPT_VERSION = 'v1';
const SCRIPT_NAME = 'ai-route-dext-doc';

function valueAfter(flag) {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1];
}
function numberAfter(flag, fallback) {
  const raw = valueAfter(flag);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

const routingConfig = JSON.parse(
  readFileSync('config/dext-routing-sections.json', 'utf8')
);
const PROJECT_CODES = routingConfig.dext_fields_to_configure
  .find((f) => f.field === 'Project Tracking').values;

const ALLOWED_CODES = PROJECT_CODES.map((p) => p.code);
const CODE_DESCRIPTIONS = PROJECT_CODES
  .map((p) => `- ${p.code} (${p.name}): ${p.use_for}`)
  .join('\n');

const SYSTEM_PROMPT = `You route ACT (A Curious Tractor) bookkeeping rows to project codes.

You return ONE of the 12 codes below, plus a confidence 0-1, plus a one-sentence reason, plus risk flags.

Codes and what they're for:
${CODE_DESCRIPTIONS}

Rules:
1. SaaS / software / AI APIs / dev infra → ACT-IN.
2. Harvest / Witta / Maleny property / farm capital works → ACT-HV.
3. Farm operations, animals, local fuel where NOT Harvest capital works → ACT-FM.
4. Goods build, manufacturing, containers, marketplace, product/asset work → ACT-GD.
5. Justice travel, research, civic / youth justice → ACT-JH.
6. Studio operations, accounting, admin, general ACT work that is NOT infrastructure SaaS → ACT-CORE.
7. Storytelling, media capture, Empathy Ledger platform / content → ACT-EL.
8. Photo studio, camera, print, creative equipment for PICC → ACT-PS.
9. Mounty Yarns materials, events, travel, production → ACT-MY.
10. Oonchiumpa consultancy / service costs → ACT-OO.
11. Travel, meals, hotels, large purchases, ambiguous locations, shared trips → ASK_USER (confidence MUST be < 0.7).
12. BAS / tax / insurance / donations / write-offs / duplicate bills / capitalisation → SL_REVIEW (confidence MUST be < 0.7).

Risk flags to use when applicable:
- "duplicate_risk" (same vendor + same amount appears multiple times in nearby dates)
- "high_value" (amount >= 1000)
- "ambiguous_vendor" (vendor name is generic like AMEX, PAYPAL, STRIPE — the underlying merchant is unclear)
- "personal_card_flag" (looks like personal-card spend that needs reimbursement review)
- "foreign_currency" (non-AUD)
- "no_gst_inferred" (looks like overseas / GST-free)
- "needs_receipt" (high value with no receipt attached)
- "rd_eligible" (AI tools, dev infra, research-y purchase that qualifies for FY26 R&D tax)

Return STRICT JSON only — no prose, no markdown:
{
  "project_code": "<one of the 12 codes>",
  "confidence": <0-1>,
  "reason": "<one short sentence>",
  "risk_flags": ["<flag>", ...]
}`;

function buildUserPrompt(row) {
  const parts = [];
  parts.push(`Source: ${row.source_table}`);
  if (row.txn_date) parts.push(`Date: ${row.txn_date}`);
  if (row.vendor_name) parts.push(`Vendor / payee: ${row.vendor_name}`);
  if (row.amount !== null && row.amount !== undefined) {
    parts.push(`Amount: ${row.amount} AUD`);
  }
  if (row.bank_account) parts.push(`Bank account: ${row.bank_account}`);
  if (row.description) parts.push(`Description / notes: ${row.description}`);
  return parts.join('\n');
}

function safeParseJson(text) {
  if (!text) return null;
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) return null;
  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

async function fetchUnroutedBankLines(limit) {
  const { data, error } = await sb
    .from('bank_statement_lines')
    .select('id,date,payee,particulars,reference,analysis_code,amount,direction,bank_account,project_code,notes')
    .or('project_code.is.null,project_code.eq.UNKNOWN,project_code.eq.')
    .not('payee', 'is', null)
    .not('amount', 'is', null)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`bank_statement_lines: ${error.message}`);
  return (data || []).map((r) => ({
    source_table: 'bank_statement_lines',
    source_record_id: r.id,
    txn_date: r.date,
    vendor_name: r.payee,
    amount: r.amount,
    bank_account: r.bank_account,
    description: [r.particulars, r.reference, r.notes].filter(Boolean).join(' | '),
  }));
}

async function fetchUnroutedReceiptEmails(limit) {
  const { data, error } = await sb
    .from('receipt_emails')
    .select('id,received_at,vendor_name,subject,amount_detected,currency,project_code,status,from_email')
    .or('project_code.is.null,project_code.eq.UNKNOWN,project_code.eq.')
    .not('vendor_name', 'is', null)
    .order('received_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`receipt_emails: ${error.message}`);
  return (data || []).map((r) => ({
    source_table: 'receipt_emails',
    source_record_id: r.id,
    txn_date: r.received_at ? r.received_at.slice(0, 10) : null,
    vendor_name: r.vendor_name,
    amount: r.amount_detected,
    bank_account: null,
    description: [r.subject, r.from_email].filter(Boolean).join(' | '),
  }));
}

async function fetchUnroutedXeroTransactions(limit) {
  const { data, error } = await sb
    .from('xero_transactions')
    .select('id,date,contact_name,total,type,bank_account,project_code,line_items')
    .or('project_code.is.null,project_code.eq.UNKNOWN,project_code.eq.')
    .not('contact_name', 'is', null)
    .gte('date', '2025-07-01')
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`xero_transactions: ${error.message}`);
  return (data || []).map((r) => {
    let description = r.type || '';
    if (Array.isArray(r.line_items)) {
      const descs = r.line_items
        .map((li) => li?.description || li?.Description)
        .filter(Boolean)
        .slice(0, 3)
        .join(' | ');
      if (descs) description = `${description} | ${descs}`;
    }
    return {
      source_table: 'xero_transactions',
      source_record_id: r.id,
      txn_date: r.date,
      vendor_name: r.contact_name,
      amount: r.total,
      bank_account: r.bank_account,
      description,
    };
  });
}

async function fetchInputs() {
  const want = SOURCE.toLowerCase();
  const fns = [];
  if (want === 'all' || want === 'bank') fns.push(fetchUnroutedBankLines);
  if (want === 'all' || want === 'receipt') fns.push(fetchUnroutedReceiptEmails);
  if (want === 'all' || want === 'xero') fns.push(fetchUnroutedXeroTransactions);

  const perSource = Math.ceil(LIMIT / Math.max(fns.length, 1));
  const buckets = await Promise.all(fns.map((fn) => fn(perSource)));
  return buckets.flat().slice(0, LIMIT);
}

async function gradeOne(row) {
  const userPrompt = buildUserPrompt(row);
  let responseText;
  try {
    responseText = await trackedClaudeCompletion(userPrompt, SCRIPT_NAME, {
      model: MODEL,
      system: SYSTEM_PROMPT,
      maxTokens: 300,
      operation: 'route_dext',
    });
  } catch (err) {
    console.warn(`  grader error: ${err.message?.slice(0, 120)}`);
    return null;
  }

  const parsed = safeParseJson(responseText);
  if (!parsed || !parsed.project_code) {
    console.warn(`  unparseable response for ${row.source_record_id}: ${responseText?.slice(0, 80)}`);
    return null;
  }
  const code = String(parsed.project_code).toUpperCase().trim();
  if (!ALLOWED_CODES.includes(code)) {
    console.warn(`  rejected code "${code}" not in allow-list`);
    return null;
  }
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
  const reason = (parsed.reason || '').toString().slice(0, 500);
  const riskFlags = Array.isArray(parsed.risk_flags)
    ? parsed.risk_flags.map((f) => String(f).trim()).filter(Boolean).slice(0, 10)
    : [];

  return {
    ...row,
    suggested_project_code: code,
    confidence,
    reason,
    risk_flags: riskFlags,
  };
}

async function writeSuggestion(suggestion) {
  const payload = {
    source_table: suggestion.source_table,
    source_record_id: suggestion.source_record_id,
    vendor_name: suggestion.vendor_name,
    amount: suggestion.amount,
    txn_date: suggestion.txn_date,
    bank_account: suggestion.bank_account,
    description: suggestion.description,
    suggested_project_code: suggestion.suggested_project_code,
    confidence: suggestion.confidence,
    reason: suggestion.reason,
    risk_flags: suggestion.risk_flags,
    model: MODEL,
    prompt_version: PROMPT_VERSION,
  };

  const { data, error } = await sb
    .from('finance_ai_routing_suggestions')
    .upsert(payload, {
      onConflict: 'source_table,source_record_id,prompt_version,model',
      ignoreDuplicates: false,
    })
    .select('id')
    .single();

  if (error) {
    console.warn(`  failed to write suggestion: ${error.message}`);
    return null;
  }
  return data?.id;
}

async function applyToSource(suggestion) {
  const code = suggestion.suggested_project_code;
  if (code === 'ASK_USER' || code === 'SL_REVIEW') return false;
  if (suggestion.confidence < MIN_CONFIDENCE) return false;

  const table = suggestion.source_table;
  const updates = { project_code: code };
  if (table === 'xero_transactions') updates.project_code_source = 'ai_router';
  if (table === 'bank_statement_lines') updates.notes = (
    suggestion.description
      ? `${suggestion.description} | ai-router=${code} (${(suggestion.confidence * 100).toFixed(0)}%)`
      : `ai-router=${code} (${(suggestion.confidence * 100).toFixed(0)}%)`
  );

  const { error } = await sb
    .from(table)
    .update(updates)
    .eq('id', suggestion.source_record_id);
  if (error) {
    console.warn(`  apply failed (${table} ${suggestion.source_record_id}): ${error.message}`);
    return false;
  }

  await sb
    .from('finance_ai_routing_suggestions')
    .update({ applied_at: new Date().toISOString(), applied_to_source: true })
    .eq('source_table', suggestion.source_table)
    .eq('source_record_id', suggestion.source_record_id)
    .eq('prompt_version', PROMPT_VERSION)
    .eq('model', MODEL);

  return true;
}

async function main() {
  console.log('━'.repeat(72));
  console.log('AI Dext routing grader');
  console.log('━'.repeat(72));
  console.log(`Model: ${MODEL}  •  Source: ${SOURCE}  •  Limit: ${LIMIT}`);
  console.log(`Apply mode: ${APPLY ? 'YES (writes back to source)' : 'no (suggestions only)'}`);
  console.log(`Min confidence to auto-apply: ${MIN_CONFIDENCE}`);
  console.log(`Allowed codes: ${ALLOWED_CODES.join(', ')}`);
  console.log();

  const inputs = await fetchInputs();
  console.log(`Found ${inputs.length} unrouted rows.`);
  if (!inputs.length) return;

  const tallies = { graded: 0, written: 0, applied: 0, by_code: {}, low_conf: 0 };

  for (let i = 0; i < inputs.length; i += 1) {
    const row = inputs[i];
    process.stdout.write(`[${i + 1}/${inputs.length}] ${row.source_table} ${row.vendor_name?.slice(0, 30) || '?'} $${row.amount}…  `);

    const suggestion = await gradeOne(row);
    if (!suggestion) {
      console.log('skip');
      continue;
    }
    tallies.graded += 1;
    tallies.by_code[suggestion.suggested_project_code] =
      (tallies.by_code[suggestion.suggested_project_code] || 0) + 1;
    if (suggestion.confidence < MIN_CONFIDENCE) tallies.low_conf += 1;

    const id = await writeSuggestion(suggestion);
    if (id) tallies.written += 1;

    if (APPLY) {
      const applied = await applyToSource(suggestion);
      if (applied) tallies.applied += 1;
    }

    const flags = suggestion.risk_flags.length ? ` [${suggestion.risk_flags.join(',')}]` : '';
    console.log(`${suggestion.suggested_project_code} ${(suggestion.confidence * 100).toFixed(0)}%${flags}`);

    // Pace requests gently (Anthropic rate limit + give upstream room)
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log();
  console.log('━'.repeat(72));
  console.log('Summary');
  console.log('━'.repeat(72));
  console.log(`Graded:      ${tallies.graded}`);
  console.log(`Written:     ${tallies.written}`);
  console.log(`Applied:     ${APPLY ? tallies.applied : '(dry run)'}`);
  console.log(`Low-conf:    ${tallies.low_conf} (held back from apply)`);
  console.log('By code:');
  Object.entries(tallies.by_code)
    .sort(([, a], [, b]) => b - a)
    .forEach(([code, count]) => console.log(`  ${code.padEnd(10)} ${count}`));

  if (!APPLY) {
    console.log();
    console.log('Run with --apply to write suggestions back to source rows');
    console.log(`(applies only when confidence >= ${MIN_CONFIDENCE} and code is not ASK_USER / SL_REVIEW).`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
