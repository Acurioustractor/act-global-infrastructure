#!/usr/bin/env node
/**
 * Build the clean ACT-HV per-supplier rollup for the Notion "Spend by supplier"
 * database. Post-Jan only, live status (excl DELETED/VOIDED), deduped
 * (placeholder-bill + bill-payment overlap). Emits JSON rows matching the
 * Notion schema: Supplier / Amount / Lines / Category / Garden area.
 *
 *   node scripts/build-harvest-notion-rollup.mjs   # prints total + writes JSON
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const sb = createClient(
  process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co',
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const f = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const U = (s) => (s || '').trim().toUpperCase();
const CUT = '2026-01-01';

// vendor (lowercase substring) -> {cat, garden}
function classify(nameRaw) {
  const n = (nameRaw || '').toLowerCase();
  const G = 'Garden & landscaping', P = 'Paths & structures', L = 'Labour', PAV = 'Pavilion',
    T = 'Tools & equipment', M = 'Materials & hardware', D = 'Design & branding',
    H = 'Hospitality & meals', F = 'Fuel & travel', O = 'Other';
  const rule = (cat, garden = false) => ({ cat, garden });
  if (n.includes('maleny landscaping') || n.includes('savage landscape') || n.includes('savage transport') || n.includes('sophie') || n.includes('hickey')) return rule(G, true);
  if (n.includes('kennedy') || n.includes('smartwood') || n.includes("st mary")) return rule(P, true); // heritage decking = Garden Paths
  if (n.includes('longara')) return rule(PAV); // milk crates -> pavilion build
  if (n.includes('joseph kirmos') || n.includes('chris w') || n.includes('tnt plaster') || n.includes('rnm')) return rule(L);
  if (n.includes('thais') || n.includes('pupio')) return rule(D);
  if (n.includes('total tools') || n.includes('sydney tools') || n.includes('carbatec') || n.includes('dnp') || n.includes('diggermate') || n.includes('kennards') || n.includes('hydraulink') || n.includes('bolt in') || n.includes('coastal fastener') || n.includes('supercheap') || n.includes('bcf')) return rule(T);
  if (n.includes('bunnings') || n.includes('maleny hardware') || n.includes('officeworks') || n.includes('auscot') || n.includes('bussell') || n.includes('salin') || n.includes('amazon')) return rule(M);
  if (n.includes('liberty') || n.includes('bp') || n === 'bp' || n.includes('caltex') || n.includes('7-eleven') || n.includes('avis')) return rule(F);
  if (n.includes('woolworths') || n.includes('iga') || n.includes('coles') || n.includes('bakery') || n.includes('hot bread') || n.includes('fisher') || n.includes('mapleton') || n.includes('nest in witta') || n.includes('hotel') || n.includes('cafe') || n.includes('restaurant') || n.includes('diner') || n.includes('thai') || n.includes('oyster') || n.includes('frank food') || n.includes('pastr') || n.includes('food co') || n.includes('source bulk') || n.includes('alsahwa') || n.includes('pocky') || n.includes('light years') || n.includes('sukhothai')) return rule(H);
  return rule(O);
}

async function pageAll(b) { const o = []; let from = 0; while (true) { const { data, error } = await b.range(from, from + 999); if (error) throw error; if (!data?.length) break; o.push(...data); if (data.length < 1000) break; from += 1000; } return o; }

async function main() {
  const bills = (await pageAll(sb.from('xero_invoices').select('xero_id,date,contact_name,total,status,invoice_number').eq('project_code', 'ACT-HV').eq('type', 'ACCPAY').gte('date', CUT)))
    .filter(b => ['AUTHORISED', 'PAID'].includes(b.status));
  const spends = (await pageAll(sb.from('xero_transactions').select('xero_transaction_id,date,contact_name,total,status,type').eq('project_code', 'ACT-HV').in('type', ['SPEND', 'SPEND-OVERPAYMENT']).gte('date', CUT)))
    .filter(s => !['DELETED', 'VOIDED'].includes(s.status));
  // drop placeholder-bill dups (no inv# matching a live txn same vendor/amount ±14d)
  const phBill = new Set();
  for (const b of bills) { if (b.invoice_number) continue; const bd = new Date(b.date); if (spends.find(s => U(s.contact_name) === U(b.contact_name) && Number(s.total) === Number(b.total) && Math.abs((new Date(s.date) - bd) / 864e5) <= 14)) phBill.add(b.xero_id); }
  const cleanBills = bills.filter(b => !phBill.has(b.xero_id));
  const paid = cleanBills.filter(b => b.status === 'PAID');
  const matched = new Set();
  for (const s of spends) { const sd = new Date(s.date); if (paid.find(b => U(b.contact_name) === U(s.contact_name) && Number(b.total) === Number(s.total) && Math.abs((new Date(b.date) - sd) / 864e5) <= 14)) matched.add(s.xero_transaction_id); }
  const cleanSpends = spends.filter(s => !matched.has(s.xero_transaction_id));

  // roll up by supplier (canonicalise a couple of name variants)
  const canon = (nm) => {
    let s = (nm || '').trim();
    if (/maleny hardware|auscot|bussell/i.test(s)) s = 'Maleny Hardware & Rural';
    if (/^kennedy/i.test(s)) s = "Kennedy's";
    return s;
  };
  const by = new Map();
  const add = (nm, amt) => { const k = canon(nm); if (!by.has(k)) by.set(k, { amount: 0, lines: 0 }); const e = by.get(k); e.amount += Number(amt); e.lines += 1; };
  for (const b of cleanBills) add(b.contact_name, b.total);
  for (const s of cleanSpends) add(s.contact_name, s.total);

  const rows = [...by.entries()].map(([supplier, v]) => {
    const c = classify(supplier);
    return { supplier, amount: Math.round(v.amount * 100) / 100, lines: v.lines, category: c.cat, garden: c.garden };
  }).filter(r => r.amount > 0).sort((a, b) => b.amount - a.amount);

  const total = rows.reduce((a, r) => a + r.amount, 0);
  const lines = rows.reduce((a, r) => a + r.lines, 0);
  const byCat = {};
  for (const r of rows) byCat[r.category] = (byCat[r.category] || 0) + r.amount;
  const garden = rows.filter(r => r.garden).reduce((a, r) => a + r.amount, 0);

  console.log(`CLEAN ACT-HV (post-Jan, live, deduped, incl 5 re-tags): ${f(total)}`);
  console.log(`Suppliers: ${rows.length} | Lines: ${lines} | Garden area: ${f(garden)}`);
  console.log('\nBy category:');
  Object.entries(byCat).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k.padEnd(22)} ${f(v)}`));
  console.log('\nSuppliers:');
  rows.forEach(r => console.log(`  ${f(r.amount).padStart(13)}  ${String(r.lines).padStart(2)}L  ${r.garden ? '🌱' : '  '} ${r.category.padEnd(22)} ${r.supplier}`));

  writeFileSync('thoughts/shared/reports/harvest-notion-rollup-2026-06-26.json', JSON.stringify({ total, lines, suppliers: rows.length, garden, byCat, rows }, null, 2));
  console.log('\nJSON: thoughts/shared/reports/harvest-notion-rollup-2026-06-26.json');
}
main().catch(e => { console.error(e); process.exit(1); });
