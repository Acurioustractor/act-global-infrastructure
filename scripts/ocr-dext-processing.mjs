#!/usr/bin/env node
/**
 * OCR Dext Processing — extracts vendor/date/amount/currency from Dext-imported
 * receipt images whose metadata couldn't be auto-parsed because Dext's reader
 * was broken at the plan limit.
 *
 * Target rows: receipt_emails where source='dext_import' AND (vendor_name IS NULL
 * OR amount_detected IS NULL). Downloads the attachment from Supabase Storage,
 * sends it to Claude Haiku 4.5 via the vision + tool-use API, and writes
 * structured output back to the row.
 *
 * After this runs, use match-receipts-to-xero.mjs to auto-link the newly
 * populated rows to Xero SPEND transactions.
 *
 * Defaults to DRY RUN. Pass --apply to write updates.
 *
 * Usage:
 *   node scripts/ocr-dext-processing.mjs                # Dry run, all candidates
 *   node scripts/ocr-dext-processing.mjs --apply         # Write updates
 *   node scripts/ocr-dext-processing.mjs --local --apply # Local-only OCR, no external AI
 *   node scripts/ocr-dext-processing.mjs --apply --limit 5  # Small test batch
 *   node scripts/ocr-dext-processing.mjs --concurrency 3    # Parallel workers (default 3)
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';
import { execFile as execFileCb } from 'child_process';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { extname, join } from 'path';
import { promisify } from 'util';

const execFile = promisify(execFileCb);
const CLI_ARGS = process.argv.slice(2);
const USE_LOCAL_OCR = CLI_ARGS.includes('--local');

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!USE_LOCAL_OCR && !GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}
const ai = USE_LOCAL_OCR ? null : new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Gemini 2.5 Flash Lite — vision-capable, ~10× cheaper than Claude Haiku 4.5.
// Falls back to gemini-flash-latest if Lite is overloaded.
const MODEL = process.env.OCR_MODEL || 'gemini-2.5-flash-lite';
const FALLBACK_MODEL = 'gemini-flash-latest';

// Pricing (per MTok) — Gemini 2.5 Flash Lite (March 2026)
const INPUT_PRICE = 0.10;
const OUTPUT_PRICE = 0.40;

// Gemini response schema — structured output via responseSchema
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    vendor_name: {
      type: Type.STRING,
      description: 'Supplier/business name on the receipt. Use the most prominent name (e.g. "Bunnings Warehouse" not "BWS123"). Use "UNKNOWN" if unreadable.',
    },
    transaction_date: {
      type: Type.STRING,
      description: 'ISO date YYYY-MM-DD. Convert DD/MM/YYYY or DD-MMM-YYYY as needed. Use "UNKNOWN" if unreadable.',
    },
    total_amount: {
      type: Type.NUMBER,
      description: 'Final total paid including GST. Use the grand total, not pre-tax subtotal. 0 if unreadable.',
    },
    currency: {
      type: Type.STRING,
      description: 'Three-letter ISO currency. Default AUD for Australian receipts with $ symbol.',
    },
    gst_amount: {
      type: Type.NUMBER,
      description: 'GST/tax amount if shown separately. 0 if not shown.',
    },
    confidence: {
      type: Type.STRING,
      enum: ['high', 'medium', 'low'],
      description: 'high=everything legible; medium=one field guessed; low=blurry or partially unreadable.',
    },
    notes: {
      type: Type.STRING,
      description: 'Brief (≤100 char) notes on ambiguity or anything useful for a human reviewer. Empty string if nothing to flag.',
    },
  },
  required: ['vendor_name', 'transaction_date', 'total_amount', 'currency', 'confidence'],
};

const PROMPT = `You are extracting structured fields from an Australian business receipt or tax invoice. The receipt was scanned by a user and may be blurry, rotated, or partial.

Be strict about dates — convert to YYYY-MM-DD format. Be strict about the total — use the final grand total (including GST), not the pre-tax subtotal.

If a field is genuinely unreadable, use "UNKNOWN" for strings and 0 for numbers, and set confidence to "low".`;

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

async function downloadFromStorage(attachmentUrl) {
  if (!attachmentUrl) return null;
  if (attachmentUrl.startsWith('receipt-attachments/') || attachmentUrl.startsWith('dext-import/')) {
    const storagePath = attachmentUrl.startsWith('receipt-attachments/')
      ? attachmentUrl.replace('receipt-attachments/', '')
      : attachmentUrl;
    const { data, error } = await sb.storage.from('receipt-attachments').download(storagePath);
    if (error) throw new Error(`Storage: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  }
  if (attachmentUrl.startsWith('http')) {
    const r = await fetch(attachmentUrl);
    if (!r.ok) throw new Error(`Fetch ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  throw new Error(`Unknown attachment URL scheme: ${attachmentUrl}`);
}

function mediaTypeFor(contentType, filename) {
  if (contentType) return contentType;
  const lower = (filename || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg'; // safe default
}

async function extractFieldsFromReceipt(buffer, mediaType, row = null) {
  if (USE_LOCAL_OCR) return extractFieldsFromReceiptLocal(buffer, mediaType, row);

  // Gemini accepts images and PDFs via inlineData parts — native multimodal
  const inlineData = { mimeType: mediaType, data: buffer.toString('base64') };

  async function callModel(model) {
    return ai.models.generateContent({
      model,
      contents: [{
        parts: [
          { text: PROMPT },
          { inlineData },
        ],
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });
  }

  let response;
  try {
    response = await callModel(MODEL);
  } catch (e) {
    // If primary model is overloaded (503) or unavailable, fall back once
    if (/503|UNAVAILABLE|NOT_FOUND/.test(e.message || '')) {
      response = await callModel(FALLBACK_MODEL);
    } else {
      throw e;
    }
  }

  // Gemini returns JSON text — parse it
  const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Empty response from Gemini');
  let extracted;
  try {
    extracted = JSON.parse(text);
  } catch (e) {
    throw new Error(`Could not parse Gemini response as JSON: ${text.slice(0, 200)}`);
  }
  return { extracted, usage: response.usageMetadata };
}

function fileExtFor(mediaType) {
  if (mediaType === 'application/pdf') return '.pdf';
  if (mediaType === 'image/png') return '.png';
  if (mediaType === 'image/heic') return '.heic';
  if (mediaType === 'image/webp') return '.webp';
  if (mediaType === 'image/tiff') return '.tiff';
  return '.jpg';
}

async function extractTextLocal(buffer, mediaType) {
  const dir = await mkdtemp(join(tmpdir(), 'act-receipt-ocr-'));
  try {
    const inputPath = join(dir, `receipt${fileExtFor(mediaType)}`);
    await writeFile(inputPath, buffer);

    if (mediaType === 'application/pdf') {
      const { stdout } = await execFile('pdftotext', ['-layout', inputPath, '-'], { timeout: 30000, maxBuffer: 5 * 1024 * 1024 });
      if (stdout.trim().length > 40) return stdout;

      const pngPath = join(dir, 'page-0.png');
      const pngPrefix = join(dir, 'page-0');
      try {
        await execFile('pdftoppm', ['-f', '1', '-singlefile', '-r', '200', '-png', '-gray', inputPath, pngPrefix], { timeout: 60000 });
      } catch {
        await execFile('magick', ['-density', '200', `${inputPath}[0]`, '-colorspace', 'Gray', pngPath], { timeout: 60000 });
      }
      const ocr = await execFile('tesseract', [pngPath, 'stdout', '--psm', '6'], { timeout: 60000, maxBuffer: 5 * 1024 * 1024 });
      return ocr.stdout;
    }

    let ocrPath = inputPath;
    if (!['image/jpeg', 'image/png', 'image/tiff'].includes(mediaType)) {
      ocrPath = join(dir, `converted${extname(inputPath) === '.png' ? '.jpg' : '.png'}`);
      await execFile('magick', [inputPath, '-auto-orient', '-colorspace', 'Gray', ocrPath], { timeout: 60000 });
    }

    const { stdout } = await execFile('tesseract', [ocrPath, 'stdout', '--psm', '6'], { timeout: 60000, maxBuffer: 5 * 1024 * 1024 });
    return stdout;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function normalizeOcrLines(text) {
  return text
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function parseVendorFromText(text) {
  const skip = /(tax invoice|receipt|duplicate|eftpos|merchant|customer copy|abn|tax inv|invoice no|date|time|total|visa|mastercard|approved|purchase|terminal|cashier|subtotal|gst|forwarded message|begin forwarded|external sender|email not displaying|good morning|hi there|booking reference|policy number|order confirmation|loyalty offer|console)/i;
  for (const line of normalizeOcrLines(text).slice(0, 18)) {
    const cleaned = line
      .replace(/\bABN\b.*$/i, '')
      .replace(/[^A-Za-z0-9&'()./ -]/g, '')
      .trim();
    if (cleaned.length >= 3 && /[A-Za-z]/.test(cleaned) && !skip.test(cleaned)) {
      return cleaned.slice(0, 80);
    }
  }
  return null;
}

function inferVendorFromFilename(filename) {
  if (!filename || /^receipt\./i.test(filename) || /unknown-supplier/i.test(filename)) return null;
  const stem = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+receipt$/i, '')
    .replace(/[-_]+invoice$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
  if (!stem || /^download\s+\d+/i.test(stem)) return null;
  return stem.slice(0, 80);
}

function parseDateFromText(text) {
  const monthMap = {
    jan: '01', january: '01', feb: '02', february: '02', mar: '03', march: '03',
    apr: '04', april: '04', may: '05', jun: '06', june: '06', jul: '07', july: '07',
    aug: '08', august: '08', sep: '09', sept: '09', september: '09', oct: '10', october: '10',
    nov: '11', november: '11', dec: '12', december: '12',
  };

  const iso = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

  const au = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2}|\d{2})\b/);
  if (au) {
    const year = au[3].length === 2 ? `20${au[3]}` : au[3];
    return `${year}-${au[2].padStart(2, '0')}-${au[1].padStart(2, '0')}`;
  }

  const named = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2}|\d{2})\b/);
  if (named) {
    const month = monthMap[named[2].toLowerCase()];
    if (month) {
      const year = named[3].length === 2 ? `20${named[3]}` : named[3];
      return `${year}-${month}-${named[1].padStart(2, '0')}`;
    }
  }

  return null;
}

function parseAmountFromText(text) {
  const lines = normalizeOcrLines(text);
  const money = /(?:AUD|A\$|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2}|[0-9]+\.[0-9]{2})/g;
  const candidates = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    let match;
    while ((match = money.exec(line)) !== null) {
      const amount = Number(match[1].replace(/,/g, ''));
      if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) continue;
      let weight = 1;
      if (/(grand\s+total|amount\s+paid|total\s+paid|payment\s+total|balance\s+due)/i.test(lower)) weight = 5;
      else if (/\btotal\b/i.test(lower)) weight = 4;
      else if (/\bamount\b|\bpaid\b/i.test(lower)) weight = 3;
      else if (/\bgst\b|\btax\b|\bsubtotal\b|\bchange\b/i.test(lower)) weight = 0.5;
      candidates.push({ amount, weight });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (b.weight - a.weight) || (b.amount - a.amount));
  return candidates[0].amount;
}

async function extractFieldsFromReceiptLocal(buffer, mediaType, row = null) {
  const text = await extractTextLocal(buffer, mediaType);
  const vendorName = parseVendorFromText(text) || inferVendorFromFilename(row?.attachment_filename);
  const date = parseDateFromText(text);
  const amount = parseAmountFromText(text);
  const knownFields = [vendorName, date, amount].filter(Boolean).length;
  const confidence = knownFields === 3 ? 'high' : amount && vendorName ? 'medium' : 'low';

  return {
    extracted: {
      vendor_name: vendorName || 'UNKNOWN',
      transaction_date: date || 'UNKNOWN',
      total_amount: amount || 0,
      currency: 'AUD',
      confidence,
      notes: confidence === 'low' ? 'local OCR extracted limited fields' : 'local OCR',
    },
    usage: null,
  };
}

function normalizeDate(s) {
  if (!s || s === 'UNKNOWN') return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

async function processRow(row, apply) {
  try {
    const buffer = await downloadFromStorage(row.attachment_url);
    if (!buffer) return { row, status: 'skip', reason: 'no attachment' };

    const mediaType = mediaTypeFor(row.attachment_content_type, row.attachment_filename);
      const { extracted, usage } = await extractFieldsFromReceipt(buffer, mediaType, row);

    const vendorName = extracted.vendor_name && extracted.vendor_name !== 'UNKNOWN' ? extracted.vendor_name : null;
    const date = normalizeDate(extracted.transaction_date);
    const amount = Number(extracted.total_amount) > 0 ? Number(extracted.total_amount) : null;
    const currency = extracted.currency || 'AUD';
    const confidence = extracted.confidence || 'low';
    const notes = extracted.notes || null;

    const result = {
      row,
      status: 'ocr',
      extracted: { vendor_name: vendorName, date, amount, currency, confidence, notes },
      usage,
    };

    const shouldWrite = USE_LOCAL_OCR
      ? Boolean(vendorName && amount != null)
      : Boolean(vendorName || date || amount);

    if (apply && shouldWrite) {
      const update = {
        updated_at: new Date().toISOString(),
      };
      if (vendorName) update.vendor_name = vendorName;
      if (amount != null) update.amount_detected = amount;
      if (currency) update.currency = currency;
      if (date) update.received_at = new Date(date + 'T12:00:00Z').toISOString();
      update.match_method = `${USE_LOCAL_OCR ? 'ocr_local' : 'ocr_haiku'}_${confidence}`;
      // Keep status as 'review' so the matcher can pick it up on next run
      if (row.status === 'review' || row.status === 'captured' || row.status === 'failed') {
        update.status = 'review';
      }

      const { error } = await sb.from('receipt_emails').update(update).eq('id', row.id);
      if (error) result.writeError = error.message;
    }

    return result;
  } catch (e) {
    return { row, status: 'error', reason: e.message };
  }
}

async function main() {
  const args = CLI_ARGS;
  const apply = args.includes('--apply');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;
  const concIdx = args.indexOf('--concurrency');
  const concurrency = concIdx !== -1 ? parseInt(args[concIdx + 1], 10) : 3;

  console.log(`OCR Dext Processing — ${apply ? 'APPLY' : 'DRY RUN'} | mode: ${USE_LOCAL_OCR ? 'local' : MODEL} | concurrency: ${concurrency}${limit ? ` | limit: ${limit}` : ''}\n`);

  // Fetch target rows: receipts missing vendor/amount
  const sourcesIdx = args.indexOf('--sources');
  const sourcesArg = sourcesIdx !== -1 ? args[sourcesIdx + 1] : 'dext_import';
  const sourceList = sourcesArg.split(',').map(s => `'${s.trim()}'`).join(',');

  const rows = await q(`
    SELECT id, attachment_url, attachment_filename, attachment_content_type,
           vendor_name, amount_detected, status, dext_item_id, source
    FROM receipt_emails
    WHERE source IN (${sourceList})
      AND (vendor_name IS NULL OR vendor_name ILIKE '%unknown%' OR amount_detected IS NULL OR amount_detected = 0)
      AND attachment_url IS NOT NULL
      AND status NOT IN ('uploaded', 'junk')
    ORDER BY created_at DESC
    ${limit ? `LIMIT ${limit}` : 'LIMIT 500'}
  `);

  console.log(`Found ${rows.length} Dext rows needing OCR`);
  if (rows.length === 0) {
    console.log('Nothing to process.');
    return;
  }

  // Process with bounded concurrency
  const results = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let ocr = 0, skip = 0, err = 0;
  let idx = 0;

  async function worker() {
    while (idx < rows.length) {
      const myIdx = idx++;
      const row = rows[myIdx];
      const r = await processRow(row, apply);
      results.push(r);
      if (r.status === 'ocr') {
        ocr++;
        if (r.usage) {
          // Gemini uses promptTokenCount + candidatesTokenCount
          totalInputTokens += r.usage.promptTokenCount || r.usage.input_tokens || 0;
          totalOutputTokens += r.usage.candidatesTokenCount || r.usage.output_tokens || 0;
        }
        const e = r.extracted;
        const tag = e.confidence === 'high' ? '🟢' : e.confidence === 'medium' ? '🟡' : '🔴';
        const vendor = (e.vendor_name || '?').slice(0, 24).padEnd(24);
        const date = (e.date || '????-??-??').padEnd(10);
        const amount = e.amount ? `$${e.amount.toFixed(2)}`.padStart(12) : '          ?';
        console.log(`  ${tag} [${myIdx + 1}/${rows.length}] ${vendor} ${date} ${amount}${e.notes ? '  // ' + e.notes : ''}`);
      } else if (r.status === 'skip') {
        skip++;
        console.log(`  ⚪ [${myIdx + 1}/${rows.length}] SKIP: ${r.reason}`);
      } else {
        err++;
        console.log(`  ❌ [${myIdx + 1}/${rows.length}] ERROR: ${r.reason}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // Stats
  const inputCost = (totalInputTokens / 1_000_000) * INPUT_PRICE;
  const outputCost = (totalOutputTokens / 1_000_000) * OUTPUT_PRICE;
  const totalCost = inputCost + outputCost;

  const highConf = results.filter(r => r.extracted?.confidence === 'high').length;
  const medConf = results.filter(r => r.extracted?.confidence === 'medium').length;
  const lowConf = results.filter(r => r.extracted?.confidence === 'low').length;

  console.log(`\n=== Summary ===`);
  console.log(`  Processed: ${ocr}/${rows.length}`);
  console.log(`  Confidence: 🟢 ${highConf} high | 🟡 ${medConf} medium | 🔴 ${lowConf} low`);
  console.log(`  Skipped: ${skip}`);
  console.log(`  Errors: ${err}`);
  console.log(`  Tokens: ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out`);
  console.log(`  Cost: $${inputCost.toFixed(4)} in + $${outputCost.toFixed(4)} out = $${totalCost.toFixed(4)}`);
  if (!apply) console.log(`\n  (dry run — pass --apply to write extracted fields to receipt_emails)`);
  else console.log(`\n  Next: run "node scripts/match-receipts-to-xero.mjs --apply" to link newly-populated rows to Xero.`);
}

main().catch(e => { console.error(e); process.exit(1); });
