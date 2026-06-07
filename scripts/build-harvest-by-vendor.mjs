#!/usr/bin/env node
// Per-vendor chronological dump of ACT-HV rows for the top 10 vendors
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const sb = createClient(
  process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co',
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const fmt = (n) => Number(n || 0).toFixed(2).padStart(10, ' ');
const pad = (s, n) => (s || '').toString().slice(0, n).padEnd(n, ' ');

function firstDescr(li) {
  if (!Array.isArray(li) || !li.length) return '';
  for (const x of li) if (x?._ocr?.summary) return '[OCR] ' + x._ocr.summary;
  return li.map(x => x?.description || x?.Description || '').filter(Boolean).join(' | ');
}

function note(row) {
  const id = row.xero_id; const n = (row.contact_name || '').toLowerCase();
  if (id === '0e7e9885-4c3e-4100-a6fc-40433e2e1e6d') return '⚠ DUPLICATE';
  if (id === '9ae29a04-f83b-48d1-a158-22565e2bd0cc') return '★ St Mary\'s 10t decking';
  if (id === 'e8ab116e-7920-40fc-92ce-0ffbd2ea09d0') return '★ St Mary\'s 2.5t + recycled';
  if (n.includes('longara')) return 'milk crates';
  return '';
}

async function fetchAll(query) {
  const rows = []; let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + 999);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

const VENDOR_GROUPS = [
  { label: '1. RNM CARPENTRY', match: (n) => n.toUpperCase().includes('RNM CARPENTRY') },
  { label: '2. Kennards Hire', match: (n) => n.toLowerCase().includes('kennards hire') },
  { label: "3. Kennedy's (timber)", match: (n) => n.toLowerCase().includes("kennedy") },
  { label: '4. Thais Pupio Design', match: (n) => n.toLowerCase().includes('thais pupio') },
  { label: '5. Sophie Deirdre Hickey', match: (n) => n.toLowerCase().includes('sophie deirdre hickey') },
  { label: '6. Maleny Landscaping Supplies', match: (n) => n.toLowerCase().includes('maleny landscaping') },
  { label: '7. Carbatec (Brisbane + QLD)', match: (n) => n.toLowerCase().includes('carbatec') },
  { label: '8. Longara', match: (n) => n.toLowerCase().includes('longara') },
  { label: '9. Bunnings Warehouse', match: (n) => n.toLowerCase().includes('bunnings') },
  { label: '10. Maleny Hardware (all variants)', match: (n) => {
      const l = n.toLowerCase();
      return l.includes('maleny hardware') || l.includes('bussell rural') || l.includes('auscot rural');
  }},
];

const bills = await fetchAll(sb.from('xero_invoices')
  .select('xero_id, date, contact_name, total, status, line_items')
  .eq('project_code', 'ACT-HV').eq('type', 'ACCPAY').in('status', ['AUTHORISED','PAID']));
const spends = await fetchAll(sb.from('xero_transactions')
  .select('xero_transaction_id, date, contact_name, total, status, type, line_items')
  .eq('project_code', 'ACT-HV').in('type', ['SPEND','SPEND-OVERPAYMENT']));

const paid = bills.filter(b => b.status === 'PAID');
const matched = new Set();
for (const s of spends) {
  const sd = new Date(s.date);
  if (paid.some(b => (b.contact_name||'').trim().toUpperCase() === (s.contact_name||'').trim().toUpperCase()
    && Number(b.total) === Number(s.total)
    && Math.abs((new Date(b.date) - sd)/86400000) <= 14)) matched.add(s.xero_transaction_id);
}

const allRows = [
  ...bills.map(b => ({ src: 'bill', xero_id: b.xero_id, date: b.date, contact_name: b.contact_name, total: Number(b.total), status: b.status, descr: firstDescr(b.line_items), excluded: false })),
  ...spends.map(s => ({ src: s.type === 'SPEND' ? 'spnd' : 'spnd-o', xero_id: s.xero_transaction_id, date: s.date, contact_name: s.contact_name, total: Number(s.total), status: s.status, descr: firstDescr(s.line_items), excluded: matched.has(s.xero_transaction_id) })),
].filter(r => !r.excluded);

const out = [];
out.push('# ACT-HV — Top-10 Vendors Line-by-Line');
out.push('_Generated 2026-05-17. Excludes VOIDED bills + bank-payment duplicates of bills. Date order within each vendor block._');
out.push('');

for (const group of VENDOR_GROUPS) {
  const rows = allRows.filter(r => group.match(r.contact_name)).sort((a,b) => a.date.localeCompare(b.date));
  const sum = rows.reduce((a, r) => a + r.total, 0);
  out.push(`## ${group.label} — ${rows.length} rows, $${sum.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  out.push('');
  out.push('Date       | Src    | $          | Vendor (as Xero)                       | Status     | Description / Note');
  out.push('-----------+--------+------------+----------------------------------------+------------+------------------------------------------------------------');
  for (const r of rows) {
    const n = note(r);
    const desc = (n ? `[${n}] ` : '') + (r.descr || '').replace(/\n/g, ' ').replace(/\s+/g, ' ');
    out.push(`${r.date} | ${pad(r.src, 6)} | ${fmt(r.total)} | ${pad(r.contact_name, 38)} | ${pad(r.status, 10)} | ${desc.slice(0, 100)}`);
  }
  out.push('-----------+--------+------------+----------------------------------------+------------+------------------------------------------------------------');
  out.push(`**Subtotal: $${sum.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**`);
  out.push('');
}

const txt = out.join('\n');
writeFileSync('thoughts/shared/handoffs/act-hv-by-vendor-2026-05-17.md', txt);
console.log(txt);
