import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FROM = '2022-11-01';
const TO   = '2024-05-31';

// Keywords from the invoice description + typical cabin build items
const KEYWORDS = [
  'solar','panel','battery','batteries','redarc','bms','inverter',
  'hot water','instant gas','rinnai','rheem',
  'rainwater','tank','plumbing',
  'cooktop','burner','gas',
  'fridge','engel','waeco',
  'shower','toilet','compost','ecoflow','eco flow',
  'trailer','axle','axel','3500',
  'deck','decking','timber','merbau','spotted gum',
  'fan','12v','lights','led',
  'storage','underbed',
  'cabin','unyoked','tiny home','tiny house',
  'kit home','frame','cladding','colorbond','roofing',
  'insulation','window','door','hinge','lock',
  'paint','stain','sealant',
  'screw','bolt','bracket','hardware',
  'bunnings','mitre 10','total tools','sydney tools','tradies',
  'cabin build','build out','fit out','fitout'
];

// Pull all bills (ACCPAY) in range
const { data: bills, error: e1 } = await sb.from('xero_invoices')
  .select('xero_id,date,invoice_number,contact_name,total,status,reference,line_items')
  .eq('type','ACCPAY')
  .gte('date',FROM).lte('date',TO)
  .order('date',{ascending:true})
  .range(0, 9999);
console.log(`ACCPAY bills in window: ${bills?.length || 0}`, e1?.message || '');

// Pull all bank txns in range (debits = SPEND)
const { data: txns } = await sb.from('xero_transactions')
  .select('xero_id,date,contact_name,total,reference,bank_account_name,line_items,type')
  .gte('date',FROM).lte('date',TO)
  .range(0, 9999);
console.log(`Bank transactions in window: ${txns?.length || 0}`);

// Helper: does any text in record match keywords?
function matchKeywords(rec, kws) {
  const blob = [
    rec.contact_name || '',
    rec.reference || '',
    JSON.stringify(rec.line_items || [])
  ].join(' ').toLowerCase();
  const hits = kws.filter(k => blob.includes(k.toLowerCase()));
  return hits;
}

// Helper: extract tracking categories
function trackingNames(rec) {
  const set = new Set();
  for (const li of (rec.line_items || [])) {
    for (const t of (li.tracking || [])) {
      if (t.option) set.add(t.option);
    }
  }
  return [...set];
}

// 1) Eco-tourism tagged spend (most reliable signal)
const ecoBills = bills.filter(b => trackingNames(b).some(t => /eco/i.test(t)));
const ecoTxns  = txns.filter(t => trackingNames(t).some(x => /eco/i.test(x)));
const ecoTotal = (rs) => rs.reduce((s, r) => s + Number(r.total || 0), 0);

console.log(`\n=== ECO-TOURISM tagged spend in window ===`);
console.log(`Bills: ${ecoBills.length}, total $${ecoTotal(ecoBills).toFixed(2)}`);
console.log(`Bank txns: ${ecoTxns.length}, total $${ecoTotal(ecoTxns).toFixed(2)}`);
console.log(`COMBINED: $${(ecoTotal(ecoBills) + ecoTotal(ecoTxns)).toFixed(2)}`);

// 2) Keyword-matched (untagged) spend
const kwBills = bills.filter(b => !ecoBills.includes(b) && matchKeywords(b, KEYWORDS).length);
const kwTxns  = txns.filter(t => !ecoTxns.includes(t) && matchKeywords(t, KEYWORDS).length);

console.log(`\n=== KEYWORD-MATCHED (untagged) spend in window ===`);
console.log(`Bills: ${kwBills.length}, total $${ecoTotal(kwBills).toFixed(2)}`);
console.log(`Bank txns: ${kwTxns.length}, total $${ecoTotal(kwTxns).toFixed(2)}`);

// 3) Output detail tables
function summary(label, rows, showHits=false) {
  if (!rows.length) return;
  console.log(`\n--- ${label} (${rows.length}) ---`);
  for (const r of rows.sort((a,b)=>(b.total||0)-(a.total||0))) {
    const hits = showHits ? ` [${matchKeywords(r, KEYWORDS).join(',')}]` : '';
    const desc = (r.line_items || []).map(li => li.description?.slice(0,60)).filter(Boolean).join(' | ').slice(0,120);
    console.log(`  ${r.date} ${(r.contact_name||'').padEnd(30).slice(0,30)} $${(r.total||0).toFixed(2).padStart(10)} ${trackingNames(r).join(',').padEnd(15)} ${desc}${hits}`);
  }
}

summary('ECO-TOURISM bills', ecoBills);
summary('ECO-TOURISM bank txns', ecoTxns);
summary('Keyword bills (untagged)', kwBills.filter(b => Number(b.total||0) >= 100), true);
summary('Keyword bank txns (untagged)', kwTxns.filter(t => Number(t.total||0) >= 100), true);

// Save full structured output
import { writeFileSync } from 'fs';
const out = {
  window: { from: FROM, to: TO },
  totals: {
    eco_bills: ecoTotal(ecoBills),
    eco_txns: ecoTotal(ecoTxns),
    kw_bills: ecoTotal(kwBills),
    kw_txns: ecoTotal(kwTxns),
  },
  eco_bills: ecoBills,
  eco_txns: ecoTxns,
  kw_bills: kwBills,
  kw_txns: kwTxns,
};
writeFileSync('/tmp/cabin-cost-base.json', JSON.stringify(out, null, 2));
console.log('\nFull data: /tmp/cabin-cost-base.json');
