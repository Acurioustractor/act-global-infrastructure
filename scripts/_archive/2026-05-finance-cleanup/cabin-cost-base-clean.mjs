#!/usr/bin/env node
/**
 * Build a CLEAN cost-base candidate list for the Cameron-cabin sale (INV-0137).
 * Strict filter: only genuine building/fitout capital items, no operating expenses.
 */
import '../lib/load-env.mjs';
import { readFileSync, writeFileSync } from 'fs';

const tokens = JSON.parse(readFileSync('.xero-tokens.json','utf8'));
const ACCESS = tokens.access_token;
const TENANT = process.env.XERO_TENANT_ID;

async function xget(path) {
  const url = `https://api.xero.com/api.xro/2.0/${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${ACCESS}`, 'xero-tenant-id': TENANT, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0,200)}`);
  return res.json();
}

const dateWhere = `Date>=DateTime(2022,11,01)&&Date<=DateTime(2024,05,31)`;

async function pull(endpoint, key, extra='') {
  const all = [];
  for (let p = 1; p < 50; p++) {
    const where = extra ? `${extra}&&${dateWhere}` : dateWhere;
    const d = await xget(`${endpoint}?where=${encodeURIComponent(where)}&page=${p}&order=Date`);
    const items = d[key] || [];
    if (!items.length) break;
    all.push(...items);
    if (items.length < 100) break;
  }
  return all;
}

console.log('Pulling Xero...');
const bills = await pull('Invoices', 'Invoices', `Type=="ACCPAY"`);
const txns = await pull('BankTransactions', 'BankTransactions');
console.log(`Bills: ${bills.length}, Bank txns: ${txns.length}\n`);

const all = [
  ...bills.map(b => ({ ...b, _kind: 'BILL' })),
  ...txns.map(t => ({ ...t, _kind: 'TXN' })),
];

function dateOf(r) {
  if (r.DateString) return r.DateString.slice(0,10);
  if (typeof r.Date === 'string' && r.Date.startsWith('/Date(')) {
    const ms = parseInt(r.Date.match(/\d+/)[0]);
    return new Date(ms).toISOString().slice(0,10);
  }
  return (r.Date || '').slice(0,10);
}
function tracking(r) {
  const set = new Set();
  for (const li of (r.LineItems || [])) for (const t of (li.Tracking || [])) if (t.Option) set.add(t.Option);
  return [...set];
}
function descOf(r) { return (r.LineItems || []).map(l => l.Description || '').filter(Boolean).join(' | '); }

// === STRICT CAPITAL IMPROVEMENT FILTER ===
// Only items that are clearly building materials, fixtures, fittings, or fitted equipment.
// Excludes: food, groceries, fuel, accommodation, restaurants, training, software, professional services unrelated to build.

const EXCLUDE_SUPPLIERS = /woolworths|coles|aldi|iga|liberty maleny|maleny hotel|witta shop|nest in witta|santini|alternative brewing|the falls farm|tk maxx|kmart|macpac|harbour plants|fremantle arts|qantas|virgin|finnair|qatar|google domains|zapier|dropbox|qantas group accommodation|worendo cottages|onsite rentals dinkum dunnies|rose training|rps aap consulting|tj.s imaging|sunshine glamping|nomadic tents|katerini lavidis|sunshine coast council|maggie hassan|paul r marchesi|natasha|jane flintoff|jack huang|naomi stenning|brian worthing|damon cooper|wild water|orange sky|bcf|officeworks|google|qantas group|tide.*arsonist|the good guys|blackflag|fraser earthworks|proudy|chris witta|jye witta|whogivesacrap|who gives a crap|metal mfg|biofilta|mcguires|house chermside|sunshine coast health|lotte/i;

const INCLUDE_KEYWORDS = /cabin|tiny home|tiny house|unyoked|deck|decking|timber|hardwood|merbau|frame|cladding|colorbond|roof|insulation|window|door|gyprock|plasterboard|hot water|rinnai|rheem|hws|tank|rainwater|plumb|gas|electric|wiring|cable|lights|switch|fixture|fitting|battery|lithium|solar|panel|inverter|bms|fridge|stove|cooktop|burner|sink|tap|shower|toilet|compost|clivus|nature.*loo|building material|construction|fitout|fit-out|paint|stain|sealant|hardware|smoke alarm|ridge|joist|bearer|stud|fixings|fastener|screws|bolts|brackets/i;

function isCapitalCandidate(r) {
  const supplier = (r.Contact?.Name || '').toLowerCase();
  const desc = descOf(r).toLowerCase();

  // Hard excludes
  if (EXCLUDE_SUPPLIERS.test(supplier)) return false;
  // Exclude bank txns with "no paperwork" UNLESS very specifically cabin-tied
  // Exclude transport/freight unless specifically cabin transport
  if (/^(freight|delivery|courier|postage)$/i.test(desc.trim())) return false;

  // Must contain capital-improvement keywords in supplier or description
  return INCLUDE_KEYWORDS.test(supplier + ' ' + desc);
}

// Allocation rules
function allocate(r) {
  const desc = descOf(r).toLowerCase();
  const contact = (r.Contact?.Name || '').toLowerCase();
  const total = Number(r.Total || 0);

  // The two Unyoked cabin purchases
  if (contact.includes('unyoked') && total > 1000) {
    return { pct: 0.5, basis: 'Half — one of two Black Unyoked cabins (Cameron got one)' };
  }

  // Specifically "1st Cabin" transport
  if (contact.includes('chriscourt') && desc.includes('1st')) {
    return { pct: 1.0, basis: '1st Cabin transport (Cameron cabin)' };
  }
  if (contact.includes('chriscourt') && desc.includes('2nd')) {
    return { pct: 0.0, basis: '2nd Cabin transport — assign to other Unyoked', exclude: true };
  }

  // Direct matches to INV-0137 description
  if (contact.includes('outbax') && /lithium|battery/.test(desc)) return { pct: 1.0, basis: 'Matches INV-0137 batteries' };
  if (contact.includes('tradelink') && /rinnai/.test(desc)) return { pct: 1.0, basis: 'Matches INV-0137 hot water system' };
  if (contact.includes('outback equipment')) return { pct: 1.0, basis: 'Matches INV-0137 cooktop/stoves' };
  if (contact.includes('anaconda') && /fridge/.test(desc)) return { pct: 1.0, basis: 'Matches INV-0137 fridge' };
  if (contact.includes('lachlan devlin') && /hardwood doors/.test(desc)) return { pct: 1.0, basis: 'Matches INV-0137 doors' };
  if (contact.includes('ranks tanks')) return { pct: 1.0, basis: 'Matches INV-0137 underbody rainwater tank' };
  if (contact.includes('the bunker') && /deck|building/.test(desc)) return { pct: 1.0, basis: 'May 2024 deck materials, removed with cabin' };

  // Items shared between two Unyoked cabins
  if (contact.includes('hatch electrical')) return { pct: 0.5, basis: 'Electrical for "new tiny homes" — both Unyokeds' };
  if (contact.includes('burgess plumbing')) return { pct: 0.5, basis: 'Plumbing for tiny homes — split between Unyokeds' };
  if (contact.includes('ecoflo wastewater')) return { pct: 0.5, basis: 'Compost toilet — both Unyokeds' };

  // Bunnings — Eco-tourism tagged with cabin keywords
  const tags = tracking(r);
  if (tags.some(t => /eco-tourism/i.test(t))) {
    if (/cabin|tiny home|fitout|fit-out|construct/.test(desc)) return { pct: 0.5, basis: 'Eco-tourism build-out — split between Unyokeds' };
    if (/repairs.*cabin|cabin.*repair/.test(desc)) return { pct: 0.5, basis: 'Cabin repairs — split between Unyokeds' };
    return { pct: 0.3, basis: 'Eco-tourism tagged hardware/materials — partial allocation' };
  }
  if (tags.some(t => /farm activities/i.test(t))) {
    if (/ecotourism|tiny home|cabin/.test(desc)) return { pct: 0.5, basis: 'Farm-tagged but cabin-specific description' };
  }

  return null;
}

const candidates = [];
for (const r of all) {
  if (!isCapitalCandidate(r)) continue;
  const alloc = allocate(r);
  if (!alloc || alloc.exclude || alloc.pct === 0) continue;
  const date = dateOf(r);
  const fy = (date >= '2023-07-01' && date <= '2024-06-30') ? 'FY24'
           : (date >= '2022-07-01' && date <= '2023-06-30') ? 'FY23' : 'OTHER';
  const total = Number(r.Total || 0);
  candidates.push({
    date, fy,
    kind: r._kind,
    supplier: r.Contact?.Name || '',
    invoice_number: r.InvoiceNumber || '',
    total_inc_gst: total,
    allocation_pct: alloc.pct,
    allocated_to_cameron: total * alloc.pct,
    allocation_basis: alloc.basis,
    description: descOf(r).slice(0, 200),
    tracking: tracking(r).join(', '),
    xero_id: r.InvoiceID || r.BankTransactionID || '',
  });
}

candidates.sort((a,b) => a.date.localeCompare(b.date));

const fy23 = candidates.filter(r => r.fy === 'FY23');
const fy24 = candidates.filter(r => r.fy === 'FY24');
const sumGross = arr => arr.reduce((s,r) => s + r.total_inc_gst, 0);
const sumAlloc = arr => arr.reduce((s,r) => s + r.allocated_to_cameron, 0);

console.log('=== FY23 (Jul 2022 - Jun 2023) ===');
console.log(`${fy23.length} records — gross $${sumGross(fy23).toFixed(2)} — allocated to Cameron cabin $${sumAlloc(fy23).toFixed(2)}\n`);
console.log('=== FY24 (Jul 2023 - Jun 2024) ===');
console.log(`${fy24.length} records — gross $${sumGross(fy24).toFixed(2)} — allocated to Cameron cabin $${sumAlloc(fy24).toFixed(2)}\n`);
console.log('=== TOTAL (Nov 2022 - May 2024) ===');
console.log(`${candidates.length} records — gross $${sumGross(candidates).toFixed(2)} — allocated to Cameron cabin $${sumAlloc(candidates).toFixed(2)}`);

writeFileSync('/tmp/cabin-clean.json', JSON.stringify({
  cameron_invoice: { number: 'INV-0137', date: '2024-05-21', buyer: 'Mike & Gem Cameron', total_inc_gst: 83985, total_ex_gst: 76350 },
  candidates,
  fy23: { count: fy23.length, gross: sumGross(fy23), allocated: sumAlloc(fy23), rows: fy23 },
  fy24: { count: fy24.length, gross: sumGross(fy24), allocated: sumAlloc(fy24), rows: fy24 },
}, null, 2));
console.log('\nSaved → /tmp/cabin-clean.json');
