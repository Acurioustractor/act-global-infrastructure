#!/usr/bin/env node
/**
 * Pull all spend from Xero direct for the cabin build window (Nov 2022 - May 2024)
 * and identify cabin-related cost-base candidates.
 */
import '../lib/load-env.mjs';
import { readFileSync, writeFileSync } from 'fs';

const tokens = JSON.parse(readFileSync('.xero-tokens.json','utf8'));
const ACCESS = tokens.access_token;
const TENANT = process.env.XERO_TENANT_ID;

const FROM = '2022-11-01';
const TO   = '2024-05-31';

async function xget(path) {
  const url = `https://api.xero.com/api.xro/2.0/${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${ACCESS}`,
      'xero-tenant-id': TENANT,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0,200)}`);
  return res.json();
}

// Build Xero "where" clause for date
const dateWhere = `Date>=DateTime(2022,11,01)&&Date<=DateTime(2024,05,31)`;

console.log(`Pulling Xero spend ${FROM} → ${TO}...\n`);

async function pullAll2(typeFilter) {
  const all = [];
  for (let p = 1; p < 200; p++) {
    const where = `${typeFilter}&&${dateWhere}`;
    const url = `Invoices?where=${encodeURIComponent(where)}&page=${p}&order=Date`;
    const d = await xget(url);
    const items = d.Invoices || [];
    if (!items.length) break;
    all.push(...items);
    process.stdout.write(`  ACCPAY page ${p}: ${items.length}\r`);
    if (items.length < 100) break;
  }
  process.stdout.write('\n');
  return all;
}

const bills = await pullAll2(`Type=="ACCPAY"`);
console.log(`Bills (ACCPAY): ${bills.length}`);

// Bank transactions
async function pullBankTxns() {
  const all = [];
  for (let p = 1; p < 200; p++) {
    const url = `BankTransactions?where=${encodeURIComponent(dateWhere)}&page=${p}&order=Date`;
    const d = await xget(url);
    const items = d.BankTransactions || [];
    if (!items.length) break;
    all.push(...items);
    process.stdout.write(`  BankTxn page ${p}: ${items.length}\r`);
    if (items.length < 100) break;
  }
  process.stdout.write('\n');
  return all;
}

const banktxns = await pullBankTxns();
console.log(`Bank txns: ${banktxns.length}`);

writeFileSync('/tmp/cabin-raw.json', JSON.stringify({ bills, banktxns }, null, 2));
console.log('\nSaved raw → /tmp/cabin-raw.json');

// Parse
function lineItemBlob(li) {
  return [li.Description || '', li.AccountCode || '', li.ItemCode || ''].join(' ');
}

function trackingOptions(rec) {
  const opts = new Set();
  for (const li of (rec.LineItems || [])) {
    for (const t of (li.Tracking || [])) {
      if (t.Option) opts.add(t.Option);
    }
  }
  return [...opts];
}

const KEYWORDS = [
  'solar','panel','battery','batteries','redarc','bms','inverter','victron',
  'hot water','rinnai','rheem','instant gas',
  'rainwater','tank','plumb',
  'cooktop','burner','gas',
  'fridge','engel','waeco',
  'shower','toilet','compost','ecoflow','eco flow',
  'trailer','axle','axel','3500',
  'deck','decking','timber','merbau','spotted gum','hardwood',
  'fan','12v','led','lights',
  'storage','underbed',
  'cabin','unyoked','tiny home','tiny house',
  'frame','cladding','colorbond','roof',
  'insulation','window','door',
  'paint','stain',
  'hardware','bunnings','mitre','total tools','sydney tools',
];

function matchKeywords(rec) {
  const blob = [
    rec.Contact?.Name || '',
    rec.Reference || '',
    (rec.LineItems || []).map(lineItemBlob).join(' '),
  ].join(' ').toLowerCase();
  return KEYWORDS.filter(k => blob.includes(k));
}

const all = [
  ...bills.map(b => ({ ...b, _kind: 'BILL' })),
  ...banktxns.map(t => ({ ...t, _kind: 'TXN' })),
];

const ecoTagged = all.filter(r => trackingOptions(r).some(t => /eco/i.test(t)));
const farmTagged = all.filter(r => !ecoTagged.includes(r) && trackingOptions(r).some(t => /farm/i.test(t)));
const kwMatched = all.filter(r => !ecoTagged.includes(r) && !farmTagged.includes(r) && matchKeywords(r).length);

const fmt$ = n => '$' + Number(n||0).toFixed(2);
const totalOf = rs => rs.reduce((s,r)=>s+Number(r.Total||r.SubTotal||0),0);

console.log(`\n=== ECO-TOURISM tagged (${ecoTagged.length}) — total ${fmt$(totalOf(ecoTagged))} ===`);
ecoTagged.sort((a,b)=>(b.Total||0)-(a.Total||0)).slice(0,40).forEach(r => {
  const desc = (r.LineItems||[]).map(li => (li.Description||'').slice(0,50)).filter(Boolean).join(' | ').slice(0,100);
  console.log(`  ${r.Date?.slice(0,10) || (r.DateString||'').slice(0,10)} ${r._kind.padEnd(4)} ${(r.Contact?.Name||'').slice(0,28).padEnd(28)} ${fmt$(r.Total).padStart(10)} ${desc}`);
});

console.log(`\n=== FARM ACTIVITIES tagged (${farmTagged.length}) — total ${fmt$(totalOf(farmTagged))} ===`);
farmTagged.sort((a,b)=>(b.Total||0)-(a.Total||0)).slice(0,30).forEach(r => {
  const desc = (r.LineItems||[]).map(li => (li.Description||'').slice(0,50)).filter(Boolean).join(' | ').slice(0,100);
  console.log(`  ${r.Date?.slice(0,10) || (r.DateString||'').slice(0,10)} ${r._kind.padEnd(4)} ${(r.Contact?.Name||'').slice(0,28).padEnd(28)} ${fmt$(r.Total).padStart(10)} ${desc}`);
});

console.log(`\n=== KEYWORD-MATCHED untagged (${kwMatched.length}) — total ${fmt$(totalOf(kwMatched))} ===`);
kwMatched.sort((a,b)=>(b.Total||0)-(a.Total||0)).slice(0,40).forEach(r => {
  const desc = (r.LineItems||[]).map(li => (li.Description||'').slice(0,60)).filter(Boolean).join(' | ').slice(0,120);
  console.log(`  ${r.Date?.slice(0,10) || (r.DateString||'').slice(0,10)} ${r._kind.padEnd(4)} ${(r.Contact?.Name||'').slice(0,28).padEnd(28)} ${fmt$(r.Total).padStart(10)} [${matchKeywords(r).slice(0,4).join(',')}] ${desc}`);
});

writeFileSync('/tmp/cabin-cost-base.json', JSON.stringify({
  window: { from: FROM, to: TO },
  totals: {
    eco: totalOf(ecoTagged),
    farm: totalOf(farmTagged),
    kw: totalOf(kwMatched),
  },
  ecoTagged, farmTagged, kwMatched,
}, null, 2));
console.log('\nFull data: /tmp/cabin-cost-base.json');
