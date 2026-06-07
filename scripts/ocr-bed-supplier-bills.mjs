#!/usr/bin/env node
// Generalised version of ocr-defy-bills.mjs that pulls line-item detail
// from EVERY bed-relevant supplier in ACT-GD Xero — not just Defy.
// Used to build the per-element cost model with exact pricing.
//
// Pulls bills for each supplier in BED_RELEVANT_SUPPLIERS, fetches the
// Xero attachment PDF, OCRs it via Gemini 2.5 Flash Lite with structured
// output, dumps per-line detail + product classification.
//
// Output: thoughts/shared/analysis/2026-05-28-bed-supplier-ocr-FULL.json
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
  TOKEN = { access_token: d.access_token, refresh_token: d.refresh_token };
  writeFileSync('.xero-tokens.json', JSON.stringify(TOKEN, null, 2));
}
async function xfetch(ep, accept = 'application/json', _retry = false) {
  const r = await fetch(`${XERO_API}/${ep}`, { headers: { Authorization: `Bearer ${TOKEN.access_token}`, 'xero-tenant-id': process.env.XERO_TENANT_ID, Accept: accept } });
  if (r.status === 401 && !_retry) { await refresh(); return xfetch(ep, accept, true); }
  return r;
}

// Each entry is a supplier we care about for the bed cost model + what
// element of the bed they relate to. This shapes the OCR prompt.
const BED_RELEVANT_SUPPLIERS = [
  // Materials
  { match: '%defy%', element: 'plastic (HDPE)', already_done: true },
  { match: '%centre canvas%', element: 'canvas' },
  { match: '%rw pacific%', element: 'canvas?' },
  { match: '%steelmart%', element: 'steel' },
  { match: '%brisbane steel%', element: 'steel' },
  { match: '%dna steel%', element: 'steel' },
  { match: '%zinus%', element: 'mattress?' },
  // Labour / build
  { match: '%kirmos%', element: 'facility labour' },
  { match: '%adriana beach%', element: 'labour?' },
  // Freight
  { match: '%peak up%', element: 'freight road' },
  { match: '%sea swift%', element: 'freight barge' },
  { match: '%sendle%', element: 'freight courier' },
  { match: '%aj couriers%', element: 'freight courier' },
  // Capital / tooling
  { match: '%carbatec%', element: 'tooling (capital)' },
  { match: '%r m tanner%', element: 'capital asset' },
  { match: '%endless parks%', element: 'design / R&D' },
  { match: '%bionic group%', element: 'capital?' },
  { match: '%openfields%', element: 'manufacture?' },
  // Branding / operational
  { match: '%trademutt%', element: 'PPE / branded' },
  { match: '%nq clothing%', element: 'branded merch' },
  { match: '%eprint%', element: 'printing' },
];

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
    bed_count: { type: Type.NUMBER, description: 'Bed count if mentioned. 0 if not.' },
    bed_relevant: { type: Type.STRING, description: 'Is this bill bed-related? "yes" / "no" / "indirect" (e.g. capital/tooling/facility build that supports bed production but isn\'t per-unit).' },
    bed_element: { type: Type.STRING, description: 'Which bed element this bill is for: plastic / canvas / steel / hardware / assembly / freight / tooling / capital / R&D / admin / branding / other' },
    rate_per_unit_summary: { type: Type.STRING, description: 'If a per-unit rate is stated (e.g. $X/kg, $Y/m, $Z/bed), capture it in 1 sentence.' },
    product_summary: { type: Type.STRING, description: 'One sentence: what this invoice was actually for.' },
    notes: { type: Type.STRING, description: 'Anything notable for the cost model.' },
  },
  required: ['line_items', 'product_summary', 'bed_relevant', 'bed_element'],
};
const PROMPT = `Extract every line item from this supplier invoice to a project called ACT Goods on Country, which makes flat-pack steel-frame beds from recycled HDPE plastic for remote Indigenous communities.

For each line: description verbatim, quantity, unit price, line total.

Classify the invoice as bed-relevant or not:
- bed_relevant=yes: direct material, labour, freight, hardware, packing for the bed itself
- bed_relevant=indirect: capital, tooling, R&D, facility build/labour that supports bed production but isn't per-unit COGS
- bed_relevant=no: PPE, branding, merch, accommodation, admin, vehicles unrelated to bed production

bed_element: pick the closest match — plastic / canvas / steel / hardware / assembly / freight / tooling / capital / R&D / admin / branding / other.

rate_per_unit_summary: if the invoice states a clear per-unit rate (e.g. "$2/kg shred", "$18 per pole", "$93.50/bed canvas", "$1,480/pallet freight Botany→Alice"), summarise it.`;

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
    const parsed = JSON.parse(r.text || r.candidates[0].content.parts[0].text);
    return { attachment: att.FileName, ...parsed };
  } catch (e) {
    return { error: String(e?.message || e) };
  }
}

const skipDefy = process.argv.includes('--skip-defy');
const suppliersToOcr = BED_RELEVANT_SUPPLIERS.filter((s) => !s.already_done || !skipDefy);

console.log(`Will pull bills from ${suppliersToOcr.length} suppliers...\n`);

const allBills = [];
for (const s of suppliersToOcr) {
  const { data, error } = await sb
    .from('xero_invoices')
    .select('id, xero_id, invoice_number, contact_name, date, total, has_attachments')
    .ilike('contact_name', s.match)
    .eq('type', 'ACCPAY')
    .not('status', 'in', '(VOIDED,DELETED)')
    .eq('project_code', 'ACT-GD')
    .order('date');
  if (error) {
    console.error(`Skip ${s.match}: ${error.message}`);
    continue;
  }
  for (const bill of data) {
    allBills.push({ ...bill, expected_element: s.element });
  }
}

console.log(`Found ${allBills.length} bills to OCR.\n`);

loadTokens();
const results = [];
for (const b of allBills) {
  process.stdout.write(`${b.date}  ${(b.contact_name || '?').slice(0, 20).padEnd(20)}  ${(b.invoice_number || '(no inv#)').slice(0, 12).padEnd(12)}  $${Number(b.total).toFixed(2).padStart(10)}  `);
  const r = await ocrBill(b);
  if (r.error) {
    console.log(`ERR: ${r.error}`);
    results.push({ ...b, error: r.error });
    continue;
  }
  const beds = r.bed_count ? `${r.bed_count} beds` : '';
  console.log(`[${r.bed_element || '?'}] [${r.bed_relevant || '?'}] ${beds} ${r.product_summary?.slice(0, 70) || ''}`);
  if (r.rate_per_unit_summary) console.log(`    rate: ${r.rate_per_unit_summary}`);
  for (const li of (r.line_items || []).slice(0, 4)) {
    const q = li.quantity ?? '';
    const u = li.unit_price ? '$' + Number(li.unit_price).toFixed(2) : '';
    const lt = li.line_total ? '$' + Number(li.line_total).toFixed(2) : '';
    console.log(`      - ${(li.description || '').replace(/\s+/g, ' ').slice(0, 110)}  qty ${q}  unit ${u}  total ${lt}`);
  }
  results.push({ ...b, ...r });
  await new Promise((r) => setTimeout(r, 300));
}

const OUT_DIR = 'thoughts/shared/analysis';
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const outPath = `${OUT_DIR}/2026-05-28-bed-supplier-ocr-FULL.json`;
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\nSaved ${results.length} OCR results to ${outPath}`);

// Rollup per element
const byElement = new Map();
for (const r of results) {
  if (r.error || !r.bed_element) continue;
  const e = r.bed_element;
  const existing = byElement.get(e) || { bills: 0, total: 0, suppliers: new Set() };
  existing.bills += 1;
  existing.total += Number(r.total) || 0;
  existing.suppliers.add(r.contact_name);
  byElement.set(e, existing);
}

console.log(`\n=== ROLLUP BY ELEMENT ===`);
for (const [element, agg] of [...byElement.entries()].sort((a, b) => b[1].total - a[1].total)) {
  console.log(`  ${element.padEnd(20)} ${agg.bills} bills, $${agg.total.toFixed(2).padStart(10)}, ${[...agg.suppliers].slice(0, 3).join(', ')}`);
}
