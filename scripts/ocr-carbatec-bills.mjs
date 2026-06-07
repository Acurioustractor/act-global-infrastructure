#!/usr/bin/env node
// Quick one-off: OCR the 4 Carbatec ACT-HV bill attachments to see actual SKUs
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';
import { readFileSync, writeFileSync, existsSync } from 'fs';

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
    line_items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
      description: { type: Type.STRING }, quantity: { type: Type.NUMBER }, unit_price: { type: Type.NUMBER }, line_total: { type: Type.NUMBER },
    }, required: ['description'] }},
    summary: { type: Type.STRING },
  },
  required: ['line_items', 'summary'],
};
const PROMPT = `Extract every line item from this invoice (description, quantity, unit price, line total). Also produce a one-sentence summary of what was bought.`;

async function ocrBill(billId) {
  const ar = await xfetch(`Invoices/${billId}/Attachments`);
  const att = (await ar.json()).Attachments?.[0];
  if (!att) return { error: 'no attachment' };
  const dr = await xfetch(`Invoices/${billId}/Attachments/${encodeURIComponent(att.FileName)}`, '*/*');
  const buf = Buffer.from(await dr.arrayBuffer());
  const mime = dr.headers.get('content-type') || (att.FileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
  const r = await ai.models.generateContent({
    model: MODEL,
    contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: mime, data: buf.toString('base64') } }] }],
    config: { responseMimeType: 'application/json', responseSchema: SCHEMA },
  });
  return JSON.parse(r.text || r.candidates[0].content.parts[0].text);
}

const BILLS = [
  { id: '4f8826dd-f0e4-49d8-a4ac-4c876f540156', date: '2026-01-05', total: 4575.65 },
  { id: '310fa568-bf02-4fdf-b6d4-c7e41f0ff4a4', date: '2026-01-05', total: 2338.70 },
  { id: '8e0c1987-71ee-494e-bbfb-a3f716485af1', date: '2026-01-11', total: 1811.70 },
  { id: '6bf82502-d122-45ab-8f1c-843415d36441', date: '2026-01-11', total: 1319.00 },
];

loadTokens();
for (const b of BILLS) {
  console.log(`\n## ${b.date} — Carbatec $${b.total.toFixed(2)}`);
  const r = await ocrBill(b.id);
  if (r.error) { console.log(`  ${r.error}`); continue; }
  console.log(`Summary: ${r.summary}`);
  console.log('Line items:');
  for (const li of r.line_items || []) {
    const q = li.quantity ?? ''; const u = li.unit_price ? '$'+li.unit_price.toFixed(2) : ''; const lt = li.line_total ? '$'+li.line_total.toFixed(2) : '';
    console.log(`  - ${li.description} | qty ${q} | unit ${u} | total ${lt}`);
  }
}
