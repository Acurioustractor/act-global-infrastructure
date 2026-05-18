#!/usr/bin/env node
// Every ACT-HV transaction from 2026-01-01 onwards, chronological
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
  if (id === '0e7e9885-4c3e-4100-a6fc-40433e2e1e6d') return '⚠ DUPLICATE — VOID';
  if (id === '9ae29a04-f83b-48d1-a158-22565e2bd0cc') return '★ St Mary\'s Cathedral 10t decking';
  if (id === 'e8ab116e-7920-40fc-92ce-0ffbd2ea09d0') return '★ St Mary\'s Cathedral 2.5t';
  if (id === '4f8826dd-f0e4-49d8-a4ac-4c876f540156') return 'Router table + drill press + dust collector + CMT bits';
  if (id === '310fa568-bf02-4fdf-b6d4-c7e41f0ff4a4') return '? maybe-duplicate of router table in $4,575 invoice';
  if (id === '8e0c1987-71ee-494e-bbfb-a3f716485af1') return 'RIKON 14" bandsaw + router bits + dust handle';
  if (id === '6bf82502-d122-45ab-8f1c-843415d36441') return '? maybe-duplicate of bandsaw in $1,811 invoice';
  if (n === 'flight bar witta') return '⚠ NT/travel — wrong project';
  if (n.includes('longara')) return 'milk crates';
  if (n.includes('savage landscape')) return 'soil/compost';
  if (n.includes('maleny landscaping')) return 'mulch/landscape';
  if (n.includes('sophie deirdre hickey')) return 'gardening';
  if (n.includes('thais pupio')) return '? design — confirm Harvest-related';
  if (n.includes('smartwood')) return 'timber';
  if (n.includes('liberty') || n === '7-eleven') return 'fuel';
  if (n === 'maleny hotel') return '? team meal — review tag';
  if (n.includes('fisher')) return '? 70 oyster plates — review';
  if (n === 'iga' || n === 'woolworths') return '? groceries — review';
  if (n.includes('nest in witta') || n.startsWith('cj') || n.includes('frank food') || n.includes('mapleton') || n.includes('sukhothai')) return 'local cafe/meal';
  if (n.includes('rnm carpentry')) return '⚠ user said NOT Harvest';
  if (n.includes('bunnings') && /act-in/i.test(row.descr || '')) return '⚠ line desc says ACT-IN — miscoded';
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
  .eq('project_code','ACT-HV').eq('type','ACCPAY').in('status',['AUTHORISED','PAID']).gte('date','2026-01-01'));
const spends = await fetchAll(sb.from('xero_transactions')
  .select('xero_transaction_id, date, contact_name, total, status, type, line_items')
  .eq('project_code','ACT-HV').in('type',['SPEND','SPEND-OVERPAYMENT']).gte('date','2026-01-01'));

// dedup spends that look like payment-of-bill
const paid = bills.filter(b => b.status==='PAID');
const matched = new Set();
for (const s of spends) {
  const sd = new Date(s.date);
  if (paid.some(b => (b.contact_name||'').trim().toUpperCase() === (s.contact_name||'').trim().toUpperCase()
    && Number(b.total) === Number(s.total)
    && Math.abs((new Date(b.date) - sd)/86400000) <= 14)) matched.add(s.xero_transaction_id);
}

const rows = [
  ...bills.map(b => ({ src:'bill', xero_id:b.xero_id, date:b.date, contact_name:b.contact_name, total:Number(b.total), status:b.status, descr:firstDescr(b.line_items), excluded: false })),
  ...spends.map(s => ({ src: s.type==='SPEND'?'spnd':'spnd-o', xero_id:s.xero_transaction_id, date:s.date, contact_name:s.contact_name, total:Number(s.total), status:s.status, descr:firstDescr(s.line_items), excluded: matched.has(s.xero_transaction_id) })),
].filter(r => !r.excluded).sort((a,b) => a.date.localeCompare(b.date) || a.contact_name.localeCompare(b.contact_name));

const out = [];
out.push('# ACT-HV — Every transaction from 2026-01-01 onwards');
out.push(`_${rows.length} rows · Generated 2026-05-17. Excludes VOIDED bills + SPEND rows that mirror a PAID bill payment. Pre-2026-01-01 spend is filtered out._`);
out.push('');
out.push('Date       | Src    | $          | Vendor                          | Status     | Description / Note');
out.push('-----------+--------+------------+---------------------------------+------------+------------------------------------------------------------');
let total = 0;
for (const r of rows) {
  total += r.total;
  const n = note(r);
  const desc = (n?`[${n}] `:'') + (r.descr || '').replace(/\s+/g,' ');
  out.push(`${r.date} | ${pad(r.src,6)} | ${fmt(r.total)} | ${pad(r.contact_name,31)} | ${pad(r.status,10)} | ${desc.slice(0, 100)}`);
}
out.push('-----------+--------+------------+---------------------------------+------------+------------------------------------------------------------');
out.push(`**Total ${rows.length} rows: $${total.toLocaleString('en-AU', {minimumFractionDigits:2,maximumFractionDigits:2})}**`);

const txt = out.join('\n');
writeFileSync('thoughts/shared/handoffs/act-hv-jan26-fulldump-2026-05-17.md', txt);
console.log(txt);
