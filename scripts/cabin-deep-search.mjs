#!/usr/bin/env node
/**
 * Deep search for missing cabin build items.
 * Wider date range (Jul 2021 → May 2024), more keywords, all tracking categories.
 */
import '../lib/load-env.mjs';
import { readFileSync, writeFileSync } from 'fs';

const tokens = JSON.parse(readFileSync('.xero-tokens.json','utf8'));
const ACCESS = tokens.access_token;
const TENANT = process.env.XERO_TENANT_ID;

const FROM = '2021-07-01';
const TO   = '2024-05-31';
const dateWhere = `Date>=DateTime(2021,07,01)&&Date<=DateTime(2024,05,31)`;

async function xget(path) {
  const url = `https://api.xero.com/api.xro/2.0/${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${ACCESS}`, 'xero-tenant-id': TENANT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0,200)}`);
  return res.json();
}

async function pullBills() {
  const all = [];
  for (let p = 1; p < 200; p++) {
    const where = `Type=="ACCPAY"&&${dateWhere}`;
    const d = await xget(`Invoices?where=${encodeURIComponent(where)}&page=${p}&order=Date`);
    const items = d.Invoices || [];
    if (!items.length) break;
    all.push(...items);
    process.stdout.write(`  bills page ${p}: ${all.length}\r`);
    if (items.length < 100) break;
  }
  process.stdout.write('\n');
  return all;
}

async function pullBankTxns() {
  const all = [];
  for (let p = 1; p < 200; p++) {
    const d = await xget(`BankTransactions?where=${encodeURIComponent(dateWhere)}&page=${p}&order=Date`);
    const items = d.BankTransactions || [];
    if (!items.length) break;
    all.push(...items);
    process.stdout.write(`  txns page ${p}: ${all.length}\r`);
    if (items.length < 100) break;
  }
  process.stdout.write('\n');
  return all;
}

console.log(`Pulling Xero ${FROM} → ${TO} ...`);
const bills = await pullBills();
const txns = await pullBankTxns();
console.log(`Bills: ${bills.length}, Bank txns: ${txns.length}`);

const all = [
  ...bills.map(b => ({ ...b, _kind: 'BILL' })),
  ...txns.map(t => ({ ...t, _kind: 'TXN' })),
];

function blob(r) {
  const li = (r.LineItems || []).map(l => [l.Description, l.AccountCode, l.ItemCode].filter(Boolean).join(' ')).join(' || ');
  return [r.Contact?.Name || '', r.Reference || '', li].join(' || ').toLowerCase();
}

function tracking(r) {
  const opts = new Set();
  for (const li of (r.LineItems || [])) {
    for (const t of (li.Tracking || [])) {
      if (t.Option) opts.add(t.Option);
      if (t.Name) opts.add(t.Name + ':' + (t.Option || ''));
    }
  }
  return [...opts];
}

function fmt(r) {
  const date = (r.DateString || r.Date || '').slice(0,10).replace(/^\/Date\((\d+).*$/, (_,ms)=>new Date(+ms).toISOString().slice(0,10));
  const desc = (r.LineItems||[]).map(l => (l.Description||'').slice(0,80)).filter(Boolean).join(' | ').slice(0,150);
  return `${date} ${r._kind.padEnd(4)} ${(r.Contact?.Name||'').slice(0,28).padEnd(28)} $${Number(r.Total||0).toFixed(2).padStart(10)} {${tracking(r).join(',')}} ${desc}`;
}

// === SPECIFIC ITEM SEARCHES ===
const hunts = {
  'SOLAR (panels, watts)':            /\bsolar\b|\b\d+\s*w(att)?s?\b solar|panel|photovoltaic|pv (panel|system)/i,
  'REDARC / BMS / inverter':          /redarc|\bbms\b|battery management|inverter|victron|enerdrive|projecta/i,
  'LITHIUM batteries':                /lithium|lifepo4|li-ion|voltx|battery system/i,
  'TRAILER (3500kg / dual axle)':     /\btrailer\b|dual ax(le|el)|\b3500\s*kg\b|\batm\b|tandem trailer/i,
  'WATER TANK (rainwater / poly)':    /water tank|rainwater tank|poly tank|polyethylene|rotomold|\btanks\b|under(body|bed)? tank/i,
  'COMPOST TOILET (Eco Flow specifically)': /eco\s*flow|ecoflow|cuddy|nature\s*flush|sun-mar|composting toilet/i,
  'GENERATOR':                        /generator|honda eu|honda 20i|inverter generator/i,
  'GAS HOT WATER':                    /rinnai|rheem|gas hot water|instantaneous|hwu|hws/i,
  'KAYO / DOMETIC / WAECO / ENGEL':   /kayo|dometic|waeco|engel|primus|portafridge/i,
  'BUNNINGS / MITRE 10 / hardware':   /bunnings|mitre\s*10|total tools|sydney tools|tradies|ulton|hardware|bcf|supercheap|repco/i,
  'BUILDING / construction':          /building|construction|builder|carpentry|joinery|cladding|colorbond|roofing|frame|stud|insulation|gyprock|plasterboard|window|door frame/i,
  'PLUMBING':                         /plumb|reece|tradelink|pvc|copper pipe|fittings|fitting|valve/i,
  'ELECTRICAL':                       /electric(al|ian)|hatch|sparky|wiring|cable|conduit|switch|outlet|gpo/i,
  'TIMBER / decking':                 /timber|decking|merbau|spotted gum|hardwood|pine|treated pine|joist|bearer/i,
  'KITCHEN / cooktop / sink':         /kitchen|cooktop|stove|burner|oven|sink|tap\b|mixer|range/i,
};

for (const [label, regex] of Object.entries(hunts)) {
  const hits = all.filter(r => regex.test(blob(r)));
  if (!hits.length) { console.log(`\n--- ${label}: 0 hits ---`); continue; }
  const total = hits.reduce((s,r) => s + Number(r.Total||0), 0);
  console.log(`\n=== ${label} — ${hits.length} hits, $${total.toFixed(2)} ===`);
  hits.sort((a,b) => Number(b.Total||0) - Number(a.Total||0))
      .slice(0, 25)
      .forEach(r => console.log('  ' + fmt(r)));
}

// === HARDWARE / BUILDING TAGGED ===
console.log(`\n\n=== TRACKING TAGS (top 30 by frequency) ===`);
const tagFreq = {};
for (const r of all) {
  for (const t of tracking(r)) {
    tagFreq[t] = (tagFreq[t] || 0) + 1;
  }
}
const tagsSorted = Object.entries(tagFreq).sort((a,b) => b[1]-a[1]).slice(0, 30);
tagsSorted.forEach(([t, n]) => console.log(`  ${t.padEnd(50)} ${n}`));

// Anything tagged with hardware/building/construction
const buildingTagged = all.filter(r => {
  const ts = tracking(r).join(' ').toLowerCase();
  return /hardware|building|construct|cabin|farm.*build|infrastruct/i.test(ts);
});
console.log(`\n=== HARDWARE/BUILDING-TAGGED records — ${buildingTagged.length}, total $${buildingTagged.reduce((s,r)=>s+Number(r.Total||0),0).toFixed(2)} ===`);
buildingTagged.sort((a,b)=>Number(b.Total||0)-Number(a.Total||0)).slice(0,40).forEach(r => console.log('  ' + fmt(r)));

writeFileSync('/tmp/cabin-deep.json', JSON.stringify({ window:{from:FROM,to:TO}, hunts: Object.fromEntries(Object.entries(hunts).map(([k,r])=>[k, all.filter(rec=>r.test(blob(rec)))])), buildingTagged }, null, 2));
console.log('\nFull data: /tmp/cabin-deep.json');
