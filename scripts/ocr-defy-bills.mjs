#!/usr/bin/env node
// Read the actual line items from every Defy invoice attached in Xero.
// The Xero JSON sync strips line descriptions to "."; the attachments
// (PDF/image) carry the real product detail. Used to back-derive per-bed
// unit economics from the actual production batches.
//
// Output: thoughts/shared/analysis/2026-05-28-defy-invoice-ocr.json
// Plan: goods-cost-evidence-funder-artifact
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const sb = createClient(
  process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co',
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = 'gemini-2.5-flash-lite';

const XERO_API = 'https://api.xero.com/api.xro/2.0';
let TOKEN = null;
function loadTokens() {
  if (existsSync('.xero-tokens.json')) TOKEN = JSON.parse(readFileSync('.xero-tokens.json', 'utf8'));
}
async function refresh() {
  const creds = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');
  const r = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: TOKEN.refresh_token }),
  });
  const d = await r.json();
  TOKEN = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + d.expires_in * 1000 - 60000 };
  writeFileSync('.xero-tokens.json', JSON.stringify(TOKEN, null, 2));
}
async function xfetch(ep, accept = 'application/json', _retry = false) {
  const r = await fetch(`${XERO_API}/${ep}`, { headers: { Authorization: `Bearer ${TOKEN.access_token}`, 'xero-tenant-id': process.env.XERO_TENANT_ID, Accept: accept } });
  if (r.status === 401 && !_retry) { await refresh(); return xfetch(ep, accept, true); }
  return r;
}

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    line_items: {
      type: Type.ARRAY,
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
    bed_count: { type: Type.NUMBER, description: 'How many beds (or bed-like products) the invoice covers, if stated. 0 if no beds.' },
    product_summary: { type: Type.STRING, description: 'One sentence: what product(s) does this invoice cover (beds, sheds, coasters, prototype, materials-only, etc.)' },
    notes: { type: Type.STRING, description: 'Anything notable — e.g. special finish, mention of sheets vs assembled, deposit/prepayment, etc.' },
  },
  required: ['line_items', 'product_summary'],
};
const PROMPT = `Extract every line item from this Defy Manufacturing invoice. Defy makes bed-frame products and related items from recycled HDPE plastic for ACT (the buyer).

For each line: description verbatim, quantity, unit price, line total.

Also: if the invoice mentions a bed count or bed-related product, record it in bed_count. Common product types: BEDS (assembled, cut+finished), SHEETS/SHRED (raw materials), SHEDS, COASTERS, prototypes/samples. Use product_summary to say in one sentence what this invoice was for.

If anything stands out (deposit, special finish, custom engraving, R&D), put it in notes.`;

async function ocrBill(bill) {
  try {
    const xeroId = bill.xero_id;
    if (!xeroId) return { error: 'no xero_id in DB row' };
    const ar = await xfetch(`Invoices/${xeroId}/Attachments`);
    const atts = (await ar.json()).Attachments || [];
    if (atts.length === 0) return { error: 'no attachments' };
    // Sometimes there are multiple attachments; we OCR the first non-trivial one.
    const att = atts.find((a) => /pdf|jpe?g|png|tiff/i.test(a.FileName)) || atts[0];
    const dr = await xfetch(`Invoices/${xeroId}/Attachments/${encodeURIComponent(att.FileName)}`, '*/*');
    const buf = Buffer.from(await dr.arrayBuffer());
    const mime = dr.headers.get('content-type') || (att.FileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    const r = await ai.models.generateContent({
      model: MODEL,
      contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: mime, data: buf.toString('base64') } }] }],
      config: { responseMimeType: 'application/json', responseSchema: SCHEMA },
    });
    const parsed = JSON.parse(r.text || r.candidates[0].content.parts[0].text);
    return { attachment: att.FileName, ...parsed };
  } catch (e) {
    return { error: String(e?.message || e) };
  }
}

// Pull bills from DB to keep this in sync with the live data.
// `xero_id` is the Xero InvoiceID needed for the API; our `id` is internal-only.
const { data: bills, error } = await sb
  .from('xero_invoices')
  .select('id, xero_id, xero_tenant_id, invoice_number, date, total, has_attachments')
  .ilike('contact_name', '%defy%')
  .eq('type', 'ACCPAY')
  .not('status', 'in', '(VOIDED,DELETED)')
  .eq('project_code', 'ACT-GD')
  .order('date');

if (error) {
  console.error('DB error:', error.message);
  process.exit(1);
}

console.log(`OCRing ${bills.length} Defy bills...\n`);
loadTokens();

const results = [];
for (const b of bills) {
  process.stdout.write(`${b.date}  ${(b.invoice_number || '(no inv#)').padEnd(12)}  $${Number(b.total).toFixed(2).padStart(10)}  `);
  const r = await ocrBill(b);
  if (r.error) {
    console.log(`ERR: ${r.error}`);
    results.push({ ...b, error: r.error });
    continue;
  }
  const bedNote = r.bed_count ? `${r.bed_count} beds` : 'no bed count';
  console.log(`[${bedNote}] ${r.product_summary?.slice(0, 80) || ''}`);
  if (r.notes) console.log(`    note: ${r.notes}`);
  for (const li of r.line_items || []) {
    const q = li.quantity ?? '';
    const u = li.unit_price ? '$' + Number(li.unit_price).toFixed(2) : '';
    const lt = li.line_total ? '$' + Number(li.line_total).toFixed(2) : '';
    console.log(`    - ${li.description?.slice(0, 110) || '(no desc)'}   qty ${q}  unit ${u}  total ${lt}`);
  }
  results.push({ ...b, ...r });
  // Modest rate-limit kindness.
  await new Promise((r) => setTimeout(r, 400));
}

const OUT_DIR = 'thoughts/shared/analysis';
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const outPath = `${OUT_DIR}/2026-05-28-defy-invoice-ocr.json`;
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\nSaved ${results.length} OCR results to ${outPath}`);

// Bed-count rollup.
const totalBeds = results.reduce((s, r) => s + (Number(r.bed_count) || 0), 0);
const totalSpend = results.reduce((s, r) => s + Number(r.total), 0);
const billsWithBeds = results.filter((r) => Number(r.bed_count) > 0);
console.log(`\n=== ROLLUP ===`);
console.log(`Total Defy spend (incl GST): $${totalSpend.toFixed(2)}`);
console.log(`Total beds attributed: ${totalBeds}`);
console.log(`Bills naming a bed count: ${billsWithBeds.length} of ${results.length}`);
if (totalBeds > 0) console.log(`Naive per-bed (total Defy / beds named): $${(totalSpend / totalBeds).toFixed(2)}`);
