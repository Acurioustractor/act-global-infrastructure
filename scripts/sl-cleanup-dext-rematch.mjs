#!/usr/bin/env node
/**
 * SL clean-up Dext re-match — the strict first pass matched receipts on EXACT amount only and
 * missed real Dext receipts that differ by a surcharge/tip, a few days, or because one receipt
 * covers two card charges (e.g. Carla $11,180 = 2× $5,590). This re-matches every still-missing
 * line against ALL finance_receipt_documents (Dext + email + Xero) with a wide band + loose vendor
 * match, and ranks candidates. READ-ONLY. Writes a report + recovered.json.
 *
 * Usage: node scripts/sl-cleanup-dext-rematch.mjs
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DIR = path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup');
const q = async (s) => { const { data, error } = await sb.rpc('exec_sql', { query: s }); if (error) { console.error('ERR', error.message); return []; } return data; };

const D = JSON.parse(readFileSync(path.join(DIR, 'digest.json'), 'utf8'));
const V = JSON.parse(readFileSync(path.join(DIR, 'verdicts.json'), 'utf8'));
const statusByI = new Map(V.map(v => [v.i, v.receipt_status]));

const norm = (s) => (s || '').toUpperCase().replace(/PTY LTD| LTD| INC|SQ ?\*?|SP ?\*?|X{4,}\d*|\d{3,}|[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['THE', 'AND', 'PURCHASE', 'CARD', 'CREDIT', 'DEBIT', 'TRANSFER', 'PTY', 'COM', 'AUSTRALIA', 'CURIOUS', 'TRACTOR', 'INTERBANK', 'MONEY', 'THANKS', 'HOTEL', 'RESTAUR', 'PURCHASES']);
const toks = (s) => norm(s).split(' ').filter(w => w.length >= 4 && !STOP.has(w));
const vendorMatch = (lineParts, recVendor) => {
  const a = new Set(toks(lineParts)), bStr = norm(recVendor);
  for (const t of a) if (bStr.includes(t)) return true;
  const b = new Set(toks(recVendor));
  for (const t of b) if (norm(lineParts).includes(t)) return true;
  return false;
};
const amtClass = (r, amt) => {
  const d = Math.abs(r - amt);
  if (d < 0.02) return ['EXACT', 0];
  if (d <= Math.max(15, amt * 0.06)) return ['CLOSE (surcharge/tip/fx)', 1];
  if (Math.abs(r - 2 * amt) <= Math.max(20, amt * 0.03)) return ['COMBINED (this line is ½ of the receipt)', 2];
  if (Math.abs(r - amt / 2) <= Math.max(10, amt * 0.03)) return ['SPLIT (receipt is ½ of this line)', 3];
  return ['AMOUNT DIFFERS', 9];
};

const targets = D.filter(d => ['GAP_PLEASE_PROVIDE', 'RECEIPT_VENDOR_MISMATCH', 'GMAIL_CANDIDATE'].includes(statusByI.get(d.i)));
console.log(`Re-matching ${targets.length} still-missing/unverified lines against finance_receipt_documents...\n`);

const recovered = [];
for (const d of targets) {
  const lo = Math.min(d.amt * 0.45, d.amt - 2).toFixed(2);
  const hi = (d.amt * 2.1 + 20).toFixed(2);
  const rows = await q(`SELECT vendor_name, document_date, amount_total, source, attachment_filename, document_number, mailbox
    FROM finance_receipt_documents
    WHERE amount_total BETWEEN ${lo} AND ${hi}
      AND document_date BETWEEN '${d.date}'::date - 35 AND '${d.date}'::date + 35
    ORDER BY ABS(document_date::date - '${d.date}'::date) LIMIT 40`);
  const scored = rows.map(r => {
    const vm = vendorMatch(d.particulars, r.vendor_name);
    const [cls, crank] = amtClass(Number(r.amount_total), d.amt);
    const gap = Math.abs((new Date(r.document_date) - new Date(d.date)) / 86400000);
    return { r, vm, cls, crank, gap };
  }).filter(x => x.vm && x.crank < 9)            // require vendor match + a sane amount relationship
    .sort((a, b) => a.crank - b.crank || a.gap - b.gap)
    .slice(0, 3);
  const best = scored[0];
  const tag = best ? (best.crank === 0 ? '✅ EXACT' : best.crank <= 1 ? '✅ CLOSE' : '🔶 ' + best.cls.split(' ')[0]) : '❌ none';
  console.log(`${tag.padEnd(12)} ${d.date} $${String(d.amt).padStart(9)} ${(d.particulars.split('|')[0]).trim().slice(0,34).padEnd(35)}` +
    (best ? ` → ${best.r.source} "${best.r.vendor_name}" $${best.r.amount_total} ${best.r.document_date} [${best.cls}]` : ''));
  if (best) recovered.push({ i: d.i, date: d.date, amount: d.amt, particulars: d.particulars,
    match: { source: best.r.source, vendor: best.r.vendor_name, amount: Number(best.r.amount_total), doc_date: best.r.document_date, file: best.r.attachment_filename, doc_no: best.r.document_number, mailbox: best.r.mailbox, relationship: best.cls } });
}

writeFileSync(path.join(DIR, 'dext-recovered.json'), JSON.stringify(recovered, null, 2));
const exact = recovered.filter(r => /EXACT|CLOSE/.test(r.match.relationship)).length;
console.log(`\nRecovered candidates for ${recovered.length}/${targets.length} missing lines (${exact} exact/close, ${recovered.length - exact} combined/split).`);
console.log(`→ ${DIR}/dext-recovered.json`);
