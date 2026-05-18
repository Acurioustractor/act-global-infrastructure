#!/usr/bin/env node
// (a) Kennards Hire Jan 2026+, (b) Bunnings Jan 2026+, (c) all remaining vendors line-by-line
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const sb = createClient(
  process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co',
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const fmt = (n) => Number(n||0).toFixed(2).padStart(10, ' ');
const pad = (s, n) => (s||'').toString().slice(0, n).padEnd(n, ' ');

function firstDescr(li) {
  if (!Array.isArray(li) || !li.length) return '';
  for (const x of li) if (x?._ocr?.summary) return '[OCR] ' + x._ocr.summary;
  return li.map(x => x?.description || x?.Description || '').filter(Boolean).join(' | ');
}

function note(row) {
  const id = row.xero_id; const n = (row.contact_name||'').toLowerCase();
  if (id === '0e7e9885-4c3e-4100-a6fc-40433e2e1e6d') return '⚠ DUPLICATE';
  if (id === '9ae29a04-f83b-48d1-a158-22565e2bd0cc') return '★ St Mary\'s 10t';
  if (id === 'e8ab116e-7920-40fc-92ce-0ffbd2ea09d0') return '★ St Mary\'s 2.5t';
  if (n === 'flight bar witta') return '⚠ NT travel — wrong project';
  if (n.includes('longara')) return 'milk crates';
  if (n.startsWith('chris witta')) return 'site work';
  return '';
}

async function fetchAll(query) {
  const rows=[]; let from=0;
  while(true) {
    const { data, error } = await query.range(from, from+999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length<1000) break;
    from += 1000;
  }
  return rows;
}

const bills = await fetchAll(sb.from('xero_invoices')
  .select('xero_id, date, contact_name, total, status, line_items')
  .eq('project_code','ACT-HV').eq('type','ACCPAY').in('status',['AUTHORISED','PAID']));
const spends = await fetchAll(sb.from('xero_transactions')
  .select('xero_transaction_id, date, contact_name, total, status, type, line_items')
  .eq('project_code','ACT-HV').in('type',['SPEND','SPEND-OVERPAYMENT']));

// matched-payment dedup
const paid = bills.filter(b => b.status==='PAID');
const matched = new Set();
for (const s of spends) {
  const sd = new Date(s.date);
  if (paid.some(b => (b.contact_name||'').trim().toUpperCase() === (s.contact_name||'').trim().toUpperCase()
    && Number(b.total) === Number(s.total)
    && Math.abs((new Date(b.date) - sd)/86400000) <= 14)) matched.add(s.xero_transaction_id);
}

const allRows = [
  ...bills.map(b => ({ src:'bill', xero_id:b.xero_id, date:b.date, contact_name:b.contact_name, total:Number(b.total), status:b.status, descr:firstDescr(b.line_items) })),
  ...spends.filter(s => !matched.has(s.xero_transaction_id)).map(s => ({ src: s.type==='SPEND'?'spnd':'spnd-o', xero_id:s.xero_transaction_id, date:s.date, contact_name:s.contact_name, total:Number(s.total), status:s.status, descr:firstDescr(s.line_items) })),
];

const out = [];

// 1) Kennards Hire Jan 2026 onwards
const kennards = allRows.filter(r => /kennards hire/i.test(r.contact_name) && r.date >= '2026-01-01').sort((a,b)=>a.date.localeCompare(b.date));
const kSum = kennards.reduce((a,r)=>a+r.total,0);
out.push(`## Kennards Hire — Jan 2026 onwards (${kennards.length} rows, $${kSum.toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2})})`);
out.push('');
out.push('Date       | Src    | $          | Status     | Description');
out.push('-----------+--------+------------+------------+------------------------------------------------------------');
for (const r of kennards) {
  out.push(`${r.date} | ${pad(r.src,6)} | ${fmt(r.total)} | ${pad(r.status,10)} | ${(r.descr||'').slice(0,80)}`);
}
out.push(`**Subtotal Jan 2026+: $${kSum.toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2})}**`);
out.push('');

// 2) Bunnings Jan 2026 onwards
const bunn = allRows.filter(r => /bunnings/i.test(r.contact_name) && r.date >= '2026-01-01').sort((a,b)=>a.date.localeCompare(b.date));
const bSum = bunn.reduce((a,r)=>a+r.total,0);
out.push(`## Bunnings Warehouse — Jan 2026 onwards (${bunn.length} rows, $${bSum.toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2})})`);
out.push('');
out.push('Date       | Src    | $          | Status     | Description');
out.push('-----------+--------+------------+------------+------------------------------------------------------------');
for (const r of bunn) {
  out.push(`${r.date} | ${pad(r.src,6)} | ${fmt(r.total)} | ${pad(r.status,10)} | ${(r.descr||'').slice(0,80)}`);
}
out.push(`**Subtotal Jan 2026+: $${bSum.toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2})}**`);
out.push('');

// 3) All remaining vendors NOT in top 10 — grouped by vendor (then chronological)
const top10 = [
  /RNM CARPENTRY/i, /kennards hire/i, /kennedy/i, /thais pupio/i, /sophie deirdre hickey/i,
  /maleny landscaping/i, /carbatec/i, /longara/i, /bunnings/i,
  /maleny hardware|bussell rural|auscot rural/i,
];
const inTop10 = (name) => top10.some(re => re.test(name));

const rest = allRows.filter(r => !inTop10(r.contact_name));
const byVendor = new Map();
for (const r of rest) {
  const key = r.contact_name;
  if (!byVendor.has(key)) byVendor.set(key, []);
  byVendor.get(key).push(r);
}
// Sort vendors by descending sum
const vendorSums = [...byVendor.entries()].map(([k, rows]) => ({ k, sum: rows.reduce((a,r)=>a+r.total,0), rows }));
vendorSums.sort((a,b) => b.sum - a.sum);

out.push(`## All other vendors (${vendorSums.length} vendors, ${rest.length} rows, $${rest.reduce((a,r)=>a+r.total,0).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2})})`);
out.push('_Sorted by spend descending. All rows shown line-by-line._');
out.push('');

for (const v of vendorSums) {
  out.push(`### ${v.k} — ${v.rows.length} rows, $${v.sum.toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2})}`);
  out.push('Date       | Src    | $          | Status     | Description / Note');
  out.push('-----------+--------+------------+------------+------------------------------------------------------------');
  v.rows.sort((a,b)=>a.date.localeCompare(b.date));
  for (const r of v.rows) {
    const n = note(r);
    const desc = (n?`[${n}] `:'') + (r.descr||'').replace(/\s+/g,' ');
    out.push(`${r.date} | ${pad(r.src,6)} | ${fmt(r.total)} | ${pad(r.status,10)} | ${desc.slice(0,90)}`);
  }
  out.push('');
}

const txt = out.join('\n');
writeFileSync('thoughts/shared/handoffs/act-hv-rest-and-jan26-2026-05-17.md', txt);
console.log(txt);
