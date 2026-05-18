#!/usr/bin/env node
/**
 * OCR Bank Transaction Attachments — for Xero bank transactions (SPEND) whose
 * line description is missing or unhelpful (e.g. ".", "", "Materials & Supplies"),
 * downloads the attached receipt from Xero and uses Gemini 2.5 Flash Lite to
 * extract the real vendor, line items, and totals.
 *
 * Surfaces what was actually purchased so you can audit project-coded spend
 * (e.g. ACT-HV) without opening each receipt by hand.
 *
 * Usage:
 *   node scripts/ocr-bank-txn-attachments.mjs --project ACT-HV
 *   node scripts/ocr-bank-txn-attachments.mjs --project ACT-HV --limit 5
 *   node scripts/ocr-bank-txn-attachments.mjs --ids <guid>,<guid>
 *   node scripts/ocr-bank-txn-attachments.mjs --project ACT-HV --apply         # write OCR back to Supabase
 *   node scripts/ocr-bank-txn-attachments.mjs --project ACT-HV --push-xero     # also update Xero line description
 *   node scripts/ocr-bank-txn-attachments.mjs --project ACT-HV --report thoughts/shared/handoffs/act-hv-ocr.md
 *
 * Default: dry run, prints Markdown report to stdout. --apply only writes to
 * Supabase (mirror). --push-xero updates the line description in Xero.
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
let XERO_ACCESS_TOKEN = process.env.XERO_ACCESS_TOKEN;
let XERO_REFRESH_TOKEN = process.env.XERO_REFRESH_TOKEN;
const TOKEN_FILE = '.xero-tokens.json';
const XERO_API = 'https://api.xero.com/api.xro/2.0';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set in env');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const MODEL = process.env.OCR_MODEL || 'gemini-2.5-flash-lite';
const FALLBACK_MODEL = 'gemini-flash-latest';

function loadTokens() {
  try {
    if (existsSync(TOKEN_FILE)) {
      const t = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
      if (t.access_token) XERO_ACCESS_TOKEN = t.access_token;
      if (t.refresh_token) XERO_REFRESH_TOKEN = t.refresh_token;
    }
  } catch {}
}

async function refreshXeroToken() {
  if (!XERO_CLIENT_ID || !XERO_REFRESH_TOKEN) return false;
  const creds = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64');
  const r = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: XERO_REFRESH_TOKEN }),
  });
  if (!r.ok) return false;
  const d = await r.json();
  XERO_ACCESS_TOKEN = d.access_token;
  XERO_REFRESH_TOKEN = d.refresh_token;
  writeFileSync(TOKEN_FILE, JSON.stringify({
    access_token: d.access_token, refresh_token: d.refresh_token,
    expires_at: Date.now() + d.expires_in * 1000 - 60000,
  }, null, 2));
  await sb.from('xero_tokens').upsert({
    id: 'default',
    access_token: d.access_token, refresh_token: d.refresh_token,
    expires_at: new Date(Date.now() + d.expires_in * 1000 - 60000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  return true;
}

async function xeroFetch(endpoint, method = 'GET', accept = 'application/json', body = null, contentType = null, _retry = false) {
  const headers = {
    'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
    'xero-tenant-id': XERO_TENANT_ID,
    'Accept': accept,
  };
  if (contentType) headers['Content-Type'] = contentType;
  if (body && body instanceof Buffer) headers['Content-Length'] = body.length.toString();
  const r = await fetch(`${XERO_API}/${endpoint}`, { method, headers, body });
  if (r.status === 401 && !_retry) {
    await refreshXeroToken();
    return xeroFetch(endpoint, method, accept, body, contentType, true);
  }
  return r;
}

async function getTxnAttachments(txnId) {
  const r = await xeroFetch(`BankTransactions/${txnId}/Attachments`);
  if (!r.ok) return [];
  const d = await r.json();
  return d.Attachments || [];
}

async function downloadTxnAttachment(txnId, fileName) {
  const r = await xeroFetch(`BankTransactions/${txnId}/Attachments/${encodeURIComponent(fileName)}`, 'GET', '*/*');
  if (!r.ok) return null;
  const contentType = r.headers.get('content-type') || 'application/octet-stream';
  const buffer = Buffer.from(await r.arrayBuffer());
  return { buffer, contentType, fileName };
}

async function getTxnFull(txnId) {
  const r = await xeroFetch(`BankTransactions/${txnId}`);
  if (!r.ok) return null;
  const d = await r.json();
  return d.BankTransactions?.[0] || null;
}

function cleanForPost(txn) {
  // Build a minimal upsert payload. Xero rejects POSTs that echo back empty
  // Phone/Address sub-objects with no PhoneType data, and chokes on read-only
  // fields like UpdatedDateUTC / HasValidationErrors. Keep only the editable
  // surface plus the IDs Xero needs to locate the records.
  const out = {
    BankTransactionID: txn.BankTransactionID,
    Type: txn.Type,
    Status: txn.Status,
    DateString: txn.DateString,
    Reference: txn.Reference,
    LineAmountTypes: txn.LineAmountTypes,
    Contact: { ContactID: txn.Contact?.ContactID },
    BankAccount: { AccountID: txn.BankAccount?.AccountID },
    LineItems: (txn.LineItems || []).map(li => ({
      LineItemID: li.LineItemID,
      Description: li.Description,
      Quantity: li.Quantity,
      UnitAmount: li.UnitAmount,
      LineAmount: li.LineAmount,
      AccountCode: li.AccountCode,
      TaxType: li.TaxType,
      Tracking: li.Tracking,
    })),
  };
  return out;
}

async function postTxnUpdate(txn) {
  const payload = cleanForPost(txn);
  const r = await xeroFetch('BankTransactions', 'POST', 'application/json',
    Buffer.from(JSON.stringify({ BankTransactions: [payload] })), 'application/json');
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`${r.status}: ${t.slice(0, 3000)}`);
  }
  return r.json();
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    vendor_name: { type: Type.STRING, description: 'Supplier/business name as printed on receipt (most prominent name). "UNKNOWN" if unreadable.' },
    summary: { type: Type.STRING, description: 'One sentence describing what was purchased — for the bank-txn line description. Keep under 120 chars.' },
    transaction_date: { type: Type.STRING, description: 'ISO YYYY-MM-DD. "UNKNOWN" if unreadable.' },
    total_amount: { type: Type.NUMBER, description: 'Final grand total including GST. 0 if unreadable.' },
    gst_amount: { type: Type.NUMBER, description: 'GST shown on receipt, 0 if not separately listed.' },
    currency: { type: Type.STRING, description: 'Three-letter ISO. Default AUD.' },
    line_items: {
      type: Type.ARRAY,
      description: 'Individual line items on the receipt — up to 20.',
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit_price: { type: Type.NUMBER },
          line_total: { type: Type.NUMBER },
        },
        required: ['description'],
      },
    },
    confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
    notes: { type: Type.STRING, description: 'Brief notes on ambiguity or red flags. Empty string if clean.' },
  },
  required: ['vendor_name', 'summary', 'transaction_date', 'total_amount', 'currency', 'line_items', 'confidence'],
};

const PROMPT = `You are extracting structured fields from an Australian business receipt or tax invoice attached to a Xero bank transaction.

Goals (in priority order):
1. Identify the vendor and a one-sentence summary of what was bought — this will replace a missing or generic line description in Xero.
2. List every line item (description, qty, unit price, line total) up to 20 items.
3. Capture grand total + GST + date.

Rules:
- Convert dates to YYYY-MM-DD.
- Use the final grand total (incl. GST), not the pre-tax subtotal.
- "UNKNOWN" for unreadable strings, 0 for unreadable numbers.
- Keep the summary under 120 characters. Be specific ("10t hardwood decking — Spotted Gum" beats "decking").
- If multiple receipts are stitched together, use the first/dominant one for date+vendor but include all line items.`;

function mediaTypeFor(contentType, filename) {
  if (contentType && contentType !== 'application/octet-stream') return contentType;
  const lower = (filename || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.tiff') || lower.endsWith('.tif')) return 'image/tiff';
  return 'image/jpeg';
}

async function ocrAttachment(buffer, mediaType) {
  const inlineData = { mimeType: mediaType, data: buffer.toString('base64') };
  const callModel = (model) => ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: PROMPT }, { inlineData }] }],
    config: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
  });

  let response;
  try {
    response = await callModel(MODEL);
  } catch (e) {
    if (/503|UNAVAILABLE|NOT_FOUND/.test(e.message || '')) response = await callModel(FALLBACK_MODEL);
    else throw e;
  }
  const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Empty Gemini response');
  return { extracted: JSON.parse(text), usage: response.usageMetadata };
}

function looksUnhelpful(descrs) {
  if (!descrs) return true;
  const stripped = descrs.replace(/[.\s|]/g, '').trim();
  if (stripped.length === 0) return true;
  if (stripped.length < 8) return true;
  if (/^materials\s*[&and]+\s*(supplies|equipment)/i.test(descrs)) return true;
  if (/—\s*ACT-[A-Z]{2,3}\s*$/i.test(descrs)) return true;
  return false;
}

function fmtMoney(n) { return '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i === -1 ? null : args[i + 1]; };
  return {
    project: get('--project'),
    ids: get('--ids')?.split(',').map(s => s.trim()).filter(Boolean) || [],
    limit: get('--limit') ? parseInt(get('--limit'), 10) : null,
    sinceDate: get('--since') || '2025-01-01',
    apply: args.includes('--apply'),
    pushXero: args.includes('--push-xero'),
    includeAll: args.includes('--all'),    // skip the missing-desc filter
    reportPath: get('--report'),
    minTotal: get('--min-total') ? parseFloat(get('--min-total')) : 0,
  };
}

async function pickCandidates(opts) {
  if (opts.ids.length) {
    const { data } = await sb.from('xero_transactions')
      .select('xero_transaction_id, date, contact_name, total, status, project_code, line_items, has_attachments')
      .in('xero_transaction_id', opts.ids);
    return data || [];
  }
  let q = sb.from('xero_transactions')
    .select('xero_transaction_id, date, contact_name, total, status, project_code, line_items, has_attachments')
    .gte('date', opts.sinceDate)
    .order('date', { ascending: false });
  if (opts.project) q = q.eq('project_code', opts.project);
  if (opts.minTotal > 0) q = q.gte('total', opts.minTotal);
  q = q.eq('has_attachments', true);
  q = q.in('type', ['SPEND', 'SPEND-OVERPAYMENT']);
  if (opts.limit) q = q.limit(opts.limit * 5); // overscan; we filter unhelpful descrs in JS
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let rows = data || [];
  if (!opts.includeAll) {
    rows = rows.filter(r => {
      const descrs = (r.line_items || []).map(li => li.description || li.Description || '').join(' | ');
      return looksUnhelpful(descrs);
    });
  }
  if (opts.limit) rows = rows.slice(0, opts.limit);
  return rows;
}

async function processRow(row, opts) {
  const txnId = row.xero_transaction_id;
  const result = {
    txnId, date: row.date, contact: row.contact_name, total: row.total,
    xero_link: `https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=${txnId}`,
    status: 'pending', summary: null, line_items: [], vendor_name: null, confidence: null, notes: null, error: null,
    applied_supabase: false, pushed_xero: false,
  };
  try {
    const attachments = await getTxnAttachments(txnId);
    if (!attachments.length) { result.status = 'no-attachment'; return result; }
    // pick the first attachment (largest if multiple)
    attachments.sort((a, b) => (b.ContentLength || 0) - (a.ContentLength || 0));
    const att = attachments[0];
    const dl = await downloadTxnAttachment(txnId, att.FileName);
    if (!dl) { result.status = 'download-failed'; return result; }
    const mediaType = mediaTypeFor(dl.contentType, att.FileName);
    const { extracted } = await ocrAttachment(dl.buffer, mediaType);
    Object.assign(result, {
      status: 'ocr-ok',
      summary: extracted.summary,
      vendor_name: extracted.vendor_name,
      line_items: extracted.line_items || [],
      ocr_total: extracted.total_amount,
      ocr_date: extracted.transaction_date,
      confidence: extracted.confidence,
      notes: extracted.notes,
    });
    if (opts.apply) {
      const updatedLineItems = (row.line_items || []).map((li, i) => ({
        ...li,
        _ocr: i === 0 ? { summary: extracted.summary, vendor: extracted.vendor_name, items: extracted.line_items, confidence: extracted.confidence, ocr_at: new Date().toISOString(), model: MODEL } : li._ocr,
      }));
      if (updatedLineItems.length === 0) {
        updatedLineItems.push({ description: extracted.summary, _ocr: { summary: extracted.summary, vendor: extracted.vendor_name, items: extracted.line_items, confidence: extracted.confidence, ocr_at: new Date().toISOString(), model: MODEL } });
      }
      const { error } = await sb.from('xero_transactions').update({ line_items: updatedLineItems }).eq('xero_transaction_id', txnId);
      if (error) result.error = `supabase: ${error.message}`;
      else result.applied_supabase = true;
    }
    if (opts.pushXero) {
      const fullTxn = await getTxnFull(txnId);
      if (!fullTxn) { result.error = 'could not fetch full txn from Xero'; return result; }
      // Replace the first line item description with the OCR summary
      if (Array.isArray(fullTxn.LineItems) && fullTxn.LineItems.length > 0) {
        fullTxn.LineItems[0].Description = extracted.summary;
      }
      try {
        await postTxnUpdate(fullTxn);
        result.pushed_xero = true;
      } catch (e) {
        result.error = `xero push: ${e.message}`;
      }
    }
  } catch (e) {
    result.status = 'error';
    result.error = e.message;
  }
  return result;
}

function renderReport(results, opts) {
  const lines = [];
  lines.push(`# OCR Bank Txn Attachments — ${new Date().toISOString().slice(0,10)}`);
  lines.push('');
  lines.push(`- Project filter: ${opts.project || '(any)'}`);
  lines.push(`- Mode: ${opts.apply ? 'APPLY supabase' : 'DRY RUN'}${opts.pushXero ? ' + PUSH-XERO' : ''}`);
  lines.push(`- Rows processed: ${results.length}`);
  const ok = results.filter(r => r.status === 'ocr-ok');
  const noatt = results.filter(r => r.status === 'no-attachment');
  const errs = results.filter(r => r.status === 'error' || r.error);
  lines.push(`- OCR success: ${ok.length} · No attachment: ${noatt.length} · Errors: ${errs.length}`);
  lines.push('');
  lines.push('| Date | Vendor (Xero) | $ | OCR Summary | Conf | Status | Link |');
  lines.push('|---|---|---:|---|---|---|---|');
  for (const r of results) {
    const summary = (r.summary || '').replace(/\|/g, '\\|').slice(0, 110);
    const status = [r.status, r.applied_supabase ? '✓ sb' : '', r.pushed_xero ? '✓ xero' : '', r.error ? `⚠ ${r.error}` : ''].filter(Boolean).join(' · ');
    lines.push(`| ${r.date} | ${r.contact} | ${fmtMoney(r.total)} | ${summary} | ${r.confidence || '-'} | ${status} | [open](${r.xero_link}) |`);
  }
  lines.push('');
  // Per-row line-item detail
  for (const r of ok) {
    if (!r.line_items?.length) continue;
    lines.push(`### ${r.date} — ${r.contact} ${fmtMoney(r.total)}`);
    lines.push(`Summary: ${r.summary}`);
    if (r.vendor_name && r.vendor_name !== r.contact) lines.push(`OCR vendor: **${r.vendor_name}**`);
    if (r.notes) lines.push(`Notes: ${r.notes}`);
    lines.push('');
    lines.push('| # | Description | Qty | Unit | Line $ |');
    lines.push('|---|---|---:|---:|---:|');
    r.line_items.slice(0, 20).forEach((li, i) => {
      lines.push(`| ${i+1} | ${(li.description||'').replace(/\|/g, '\\|')} | ${li.quantity ?? ''} | ${li.unit_price ? fmtMoney(li.unit_price) : ''} | ${li.line_total ? fmtMoney(li.line_total) : ''} |`);
    });
    lines.push(`Xero: ${r.xero_link}`);
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  const opts = parseArgs();
  loadTokens();
  if (!XERO_ACCESS_TOKEN) {
    if (!(await refreshXeroToken())) {
      console.error('Xero auth failed. Run: node scripts/sync-xero-tokens.mjs');
      process.exit(1);
    }
  }

  console.log(`Picking candidates — project=${opts.project || '(any)'} since=${opts.sinceDate} limit=${opts.limit || '∞'}${opts.includeAll ? ' includeAll' : ''}`);
  const rows = await pickCandidates(opts);
  console.log(`Got ${rows.length} candidate bank txns. Mode: ${opts.apply ? 'APPLY supabase' : 'DRY RUN'}${opts.pushXero ? ' + PUSH-XERO' : ''}`);
  if (!rows.length) { console.log('Nothing to do.'); return; }

  const results = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write(`[${i+1}/${rows.length}] ${row.date} ${row.contact_name} ${fmtMoney(row.total)} ... `);
    const res = await processRow(row, opts);
    results.push(res);
    process.stdout.write(`${res.status}${res.confidence ? ` (${res.confidence})` : ''}${res.error ? ` ⚠ ${res.error}` : ''}\n`);
  }

  const report = renderReport(results, opts);
  if (opts.reportPath) {
    writeFileSync(opts.reportPath, report);
    console.log(`\nReport: ${opts.reportPath}`);
  } else {
    console.log('\n' + report);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
