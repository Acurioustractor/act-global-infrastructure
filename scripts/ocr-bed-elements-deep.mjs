#!/usr/bin/env node
// Deep OCR of every bed-element invoice — canvas, hardware, INV-1507 re-check.
// Unlike ocr-bed-supplier-bills.mjs, this one IGNORES project_code (so it catches
// the canvas mis-tagged ACT-IN) and runs against specific supplier names + bill IDs.
//
// Output: thoughts/shared/analysis/2026-05-28-bed-elements-deep-ocr.json
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
function loadTokens() { if (existsSync('.xero-tokens.json')) TOKEN = JSON.parse(readFileSync('.xero-tokens.json', 'utf8')); }
async function refresh() {
  const creds = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');
  const r = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: TOKEN.refresh_token }),
  });
  const d = await r.json();
  TOKEN = { access_token: d.access_token, refresh_token: d.refresh_token };
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
    supplier_on_invoice: { type: Type.STRING, description: 'The actual supplier name as printed on the invoice (may differ from Xero contact_name).' },
    invoice_date_on_doc: { type: Type.STRING, description: 'The invoice date as printed.' },
    line_items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: 'Verbatim line description.' },
          quantity: { type: Type.NUMBER },
          unit_price: { type: Type.NUMBER },
          line_total: { type: Type.NUMBER },
          product_code: { type: Type.STRING, description: 'SKU/product code if visible.' },
        },
        required: ['description'],
      },
    },
    subtotal_ex_gst: { type: Type.NUMBER },
    gst: { type: Type.NUMBER },
    total_inc_gst: { type: Type.NUMBER },
    bed_count_mentioned: { type: Type.NUMBER, description: '0 if no bed count.' },
    canvas_metres_mentioned: { type: Type.NUMBER, description: 'Metres of canvas if stated. 0 if not.' },
    steel_metres_mentioned: { type: Type.NUMBER, description: 'Metres of steel if stated. 0 if not.' },
    bed_relevant: { type: Type.STRING, description: 'yes / no / indirect / unclear' },
    summary: { type: Type.STRING, description: 'One sentence: what this invoice was for in plain English.' },
    per_unit_rates: { type: Type.STRING, description: 'Capture any per-unit rates (e.g. "$4.80/m canvas", "$5.50/m steel", "$600/bed").' },
  },
  required: ['line_items', 'summary', 'bed_relevant'],
};

const PROMPT = `Extract every line item from this supplier invoice to a project called ACT (Australian remote-community social enterprise) which makes flat-pack beds + does Indigenous laundromat / housing / facility work across multiple sub-projects.

Be precise on:
1. Line descriptions VERBATIM (don't paraphrase).
2. Quantities, unit prices, line totals.
3. Product codes / SKUs if printed.
4. Any per-unit rate ($/bed, $/m, $/kg, $/sheet, etc.) — capture in per_unit_rates.
5. Whether the bed/canvas/steel quantities are explicitly stated.
6. The supplier name AS PRINTED on the invoice (may differ from accounting record).

Classify bed_relevant: "yes" if directly for bed materials/labour/freight; "indirect" if capital/tooling/facility supporting bed production; "no" if other-project (laundromat, housing, retail, etc.); "unclear" if can't tell.

If this is a canvas invoice: ALWAYS try to capture metres of canvas + $/m rate.
If this is a steel invoice: capture metres of steel + $/m rate.
If this is a bed invoice: bed_count_mentioned + $/bed rate.`;

async function ocrBill(bill) {
  try {
    const xeroId = bill.xero_id;
    if (!xeroId) return { error: 'no xero_id' };
    const ar = await xfetch(`Invoices/${xeroId}/Attachments`);
    const atts = (await ar.json()).Attachments || [];
    if (atts.length === 0) return { error: 'no attachments' };
    const att = atts.find((a) => /pdf|jpe?g|png|tiff/i.test(a.FileName)) || atts[0];
    const dr = await xfetch(`Invoices/${xeroId}/Attachments/${encodeURIComponent(att.FileName)}`, '*/*');
    const buf = Buffer.from(await dr.arrayBuffer());
    const mime = dr.headers.get('content-type') || (att.FileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    const r = await ai.models.generateContent({
      model: MODEL,
      contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: mime, data: buf.toString('base64') } }] }],
      config: { responseMimeType: 'application/json', responseSchema: SCHEMA },
    });
    return { attachment: att.FileName, ...JSON.parse(r.text || r.candidates[0].content.parts[0].text) };
  } catch (e) {
    return { error: String(e?.message || e) };
  }
}

// Targets — ALL canvas + selected big Bunnings + INV-1507 re-check + fasteners
const TARGETS = [
  // Canvas across ALL projects
  { supplier_ilike: '%centre canvas%', element: 'canvas' },
  { supplier_ilike: '%wholesale canvas%', element: 'canvas' },
  { supplier_ilike: '%coastal fastener%', element: 'hardware' },
  // Largest Bunnings bills (>$1K) regardless of project — likely bed-related
  // We pull all Bunnings ACT-tagged bills above $1K
  { supplier_ilike: '%bunnings%', element: 'hardware/bunnings', min_total: 1000 },
];

const allBills = [];
for (const t of TARGETS) {
  let q = sb
    .from('xero_invoices')
    .select('id, xero_id, invoice_number, contact_name, project_code, date, total, has_attachments')
    .ilike('contact_name', t.supplier_ilike)
    .eq('type', 'ACCPAY')
    .not('status', 'in', '(VOIDED,DELETED)')
    .order('date');
  if (t.min_total) q = q.gte('total', t.min_total);
  const { data, error } = await q;
  if (error) { console.error(`Skip ${t.supplier_ilike}: ${error.message}`); continue; }
  for (const bill of data) allBills.push({ ...bill, expected_element: t.element });
}

// Also re-OCR INV-1507 (Defy 25 Single Beds @ $600)
const { data: inv1507 } = await sb
  .from('xero_invoices')
  .select('id, xero_id, invoice_number, contact_name, project_code, date, total, has_attachments')
  .eq('invoice_number', 'INV-1507')
  .limit(1);
if (inv1507?.[0]) allBills.push({ ...inv1507[0], expected_element: 'defy-single-bed-recheck' });

console.log(`Found ${allBills.length} bills to OCR.\n`);

loadTokens();
const results = [];
for (const b of allBills) {
  process.stdout.write(`${b.date}  ${(b.contact_name || '?').slice(0, 22).padEnd(22)} [${(b.project_code || '?').padEnd(7)}] ${(b.invoice_number || 'no-inv').slice(0, 14).padEnd(14)} $${Number(b.total).toFixed(2).padStart(10)}  `);
  const r = await ocrBill(b);
  if (r.error) { console.log(`ERR: ${r.error}`); results.push({ ...b, error: r.error }); continue; }
  const tags = [];
  if (r.bed_count_mentioned) tags.push(`${r.bed_count_mentioned}beds`);
  if (r.canvas_metres_mentioned) tags.push(`${r.canvas_metres_mentioned}m canvas`);
  if (r.steel_metres_mentioned) tags.push(`${r.steel_metres_mentioned}m steel`);
  console.log(`[${r.bed_relevant}] ${tags.join(' ')} ${r.summary?.slice(0, 75) || ''}`);
  if (r.per_unit_rates) console.log(`    rates: ${r.per_unit_rates}`);
  for (const li of (r.line_items || []).slice(0, 6)) {
    const q = li.quantity ?? '';
    const u = li.unit_price ? '$' + Number(li.unit_price).toFixed(2) : '';
    const lt = li.line_total ? '$' + Number(li.line_total).toFixed(2) : '';
    const sku = li.product_code ? ` [${li.product_code}]` : '';
    console.log(`      - ${(li.description || '').replace(/\s+/g, ' ').slice(0, 100)}${sku}  qty ${q} unit ${u} total ${lt}`);
  }
  results.push({ ...b, ...r });
  await new Promise((r) => setTimeout(r, 300));
}

const OUT_DIR = 'thoughts/shared/analysis';
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const outPath = `${OUT_DIR}/2026-05-28-bed-elements-deep-ocr.json`;
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\nSaved ${results.length} OCR results to ${outPath}`);
