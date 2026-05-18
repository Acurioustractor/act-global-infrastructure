#!/usr/bin/env node
// Compact one-line-per-row dump of ACT-HV cost ledger (no Xero links, narrow cols)
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
  for (const x of li) if (x?._ocr?.summary) return x._ocr.summary;
  return li.map(x => x?.description || x?.Description || '').filter(Boolean).join(' | ');
}

function note(row) {
  const id = row.xero_id; const n = (row.contact_name || '').toLowerCase();
  if (id === '0e7e9885-4c3e-4100-a6fc-40433e2e1e6d') return '⚠ DUPLICATE — VOID';
  if (id === '9ae29a04-f83b-48d1-a158-22565e2bd0cc') return '★ St Mary\'s 10t decking';
  if (id === 'e8ab116e-7920-40fc-92ce-0ffbd2ea09d0') return '★ St Mary\'s 2.5t + recycled timber';
  if (row.contact_name === 'Flight Bar Witta') return '⚠ NT/SA travel — wrong project';
  if (row.contact_name === 'Claire Marchesi' && Number(row.total) === 8888) return '? purpose unconfirmed';
  if (n.includes('longara')) return 'milk crates';
  if (id === 'eb06f68e-d3f5-4075-b2d6-bda9a912196f') return '? meal — review tag';
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

const rows = [
  ...bills.map(b => ({ src: 'bill', xero_id: b.xero_id, date: b.date, contact_name: b.contact_name, total: Number(b.total), status: b.status, descr: firstDescr(b.line_items), excluded: false })),
  ...spends.map(s => ({ src: s.type === 'SPEND' ? 'spnd' : 'spnd-o', xero_id: s.xero_transaction_id, date: s.date, contact_name: s.contact_name, total: Number(s.total), status: s.status, descr: firstDescr(s.line_items), excluded: matched.has(s.xero_transaction_id) })),
].filter(r => !r.excluded).sort((a,b) => a.date.localeCompare(b.date) || a.contact_name.localeCompare(b.contact_name));

const lines = [];
lines.push('Date       | Src  | $          | Vendor                          | Description / Note');
lines.push('-----------+------+------------+---------------------------------+-----------------------------------------------------------');
let total = 0;
for (const r of rows) {
  total += r.total;
  const n = note(r);
  const desc = (n ? `[${n}] ` : '') + (r.descr || '').replace(/\n/g, ' ').replace(/\s+/g, ' ');
  lines.push(`${r.date} | ${pad(r.src,4)} | ${fmt(r.total)} | ${pad(r.contact_name, 31)} | ${desc.slice(0, 110)}`);
}
lines.push('-----------+------+------------+---------------------------------+-----------------------------------------------------------');
lines.push(`Sum of ${rows.length} rows: $${total.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

const txt = lines.join('\n');
writeFileSync('thoughts/shared/handoffs/act-hv-final-ledger-compact-2026-05-17.txt', txt);
console.log(txt);
