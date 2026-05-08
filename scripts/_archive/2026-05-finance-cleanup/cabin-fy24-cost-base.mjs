#!/usr/bin/env node
/**
 * Build FY24 (Jul 2023 - Jun 2024) cost-base candidate list for the Black Unyoked cabin
 * sold to Cameron via INV-0137. Plus full ownership-period summary.
 */
import '../lib/load-env.mjs';
import { readFileSync, writeFileSync } from 'fs';

const tokens = JSON.parse(readFileSync('.xero-tokens.json','utf8'));
const ACCESS = tokens.access_token;
const TENANT = process.env.XERO_TENANT_ID;

async function xget(path) {
  const url = `https://api.xero.com/api.xro/2.0/${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${ACCESS}`, 'xero-tenant-id': TENANT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0,200)}`);
  return res.json();
}

// Pull all bills + bank txns for the cabin's ownership period (Nov 2022 - May 2024)
const dateWhere = `Date>=DateTime(2022,11,01)&&Date<=DateTime(2024,05,31)`;

async function pullBills() {
  const all = [];
  for (let p = 1; p < 50; p++) {
    const where = `Type=="ACCPAY"&&${dateWhere}`;
    const d = await xget(`Invoices?where=${encodeURIComponent(where)}&page=${p}&order=Date`);
    const items = d.Invoices || [];
    if (!items.length) break;
    all.push(...items);
    if (items.length < 100) break;
  }
  return all;
}

async function pullBankTxns() {
  const all = [];
  for (let p = 1; p < 50; p++) {
    const d = await xget(`BankTransactions?where=${encodeURIComponent(dateWhere)}&page=${p}&order=Date`);
    const items = d.BankTransactions || [];
    if (!items.length) break;
    all.push(...items);
    if (items.length < 100) break;
  }
  return all;
}

console.log('Pulling Xero data...');
const bills = await pullBills();
const txns = await pullBankTxns();
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
  for (const li of (r.LineItems || [])) {
    for (const t of (li.Tracking || [])) {
      if (t.Option) set.add(t.Option);
    }
  }
  return [...set];
}

function descOf(r) {
  return (r.LineItems || []).map(l => l.Description || '').filter(Boolean).join(' | ').slice(0,250);
}

// Categorise each record
function categorise(r) {
  const tags = tracking(r);
  const desc = descOf(r).toLowerCase();
  const contact = (r.Contact?.Name || '').toLowerCase();
  const isEco = tags.some(t => /eco-tourism/i.test(t));
  const isFarm = tags.some(t => /farm activities/i.test(t));
  const isCabinSpecific = /cabin|tiny home|tiny house|unyoked/i.test(desc) || /unyoked/i.test(contact);
  return { isEco, isFarm, isCabinSpecific, tags };
}

// Allocation: 50/50 for items not specific to one cabin
const ALLOCATIONS = {
  'specific-to-this-cabin': 1.0,    // 100% to Cameron cabin
  'split-between-two-unyoked': 0.5, // half (Cameron got one of two Black Unyoked)
  'shared-across-all-cabins': 0.2,  // 20% (5 cabin assets on register)
};

// Hand-curated review of the Eco-tourism + cabin-related spend
function classifyForCabin(r) {
  const desc = descOf(r).toLowerCase();
  const contact = (r.Contact?.Name || '').toLowerCase();
  const date = dateOf(r);

  // The two Unyoked cabin purchases — split 50/50 (Cameron got one)
  if (contact.includes('unyoked') && Number(r.Total) > 1000) {
    return { rule: 'split-between-two-unyoked', note: 'One of two Black Unyoked cabins → 50% to Cameron' };
  }

  // Transport from Jamberoo - "1st Cabin" specifically tied to one
  if (contact.includes('chriscourt')) {
    if (desc.includes('1st')) return { rule: 'specific-to-this-cabin', note: 'Transport of 1st cabin (likely the one sold to Cameron)' };
    if (desc.includes('2nd')) return { rule: 'specific-to-this-cabin', note: '2nd cabin transport — assign to other Unyoked', skip: true };
    return { rule: 'split-between-two-unyoked', note: 'Cabin transport, unspecified' };
  }

  // Items that match the INV-0137 description directly
  if (contact.includes('outbax') && desc.includes('lithium')) return { rule: 'specific-to-this-cabin', note: 'VoltX Lithium Battery — matches INV-0137 "2x Batteries"' };
  if (contact.includes('tradelink') && desc.includes('rinnai')) return { rule: 'specific-to-this-cabin', note: 'Rinnai HWS — matches INV-0137 "Instant hot water system"' };
  if (contact.includes('outback equipment') && desc.includes('stove')) return { rule: 'specific-to-this-cabin', note: 'Stoves — matches INV-0137 "Dual burner cooktop gas"' };
  if (contact.includes('anaconda') && desc.includes('fridge')) return { rule: 'specific-to-this-cabin', note: 'Oztrail Fridge/Freezer — matches INV-0137 "90L fridge"' };
  if (contact.includes('lachlan devlin') && desc.includes('hardwood doors')) return { rule: 'specific-to-this-cabin', note: 'Hardwood doors — matches INV-0137 build description' };
  if (contact.includes('ranks tanks')) return { rule: 'specific-to-this-cabin', note: 'Rainwater tank — matches INV-0137 "Underbody rainwater tank" (no paperwork — confirm)' };
  if (contact.includes('ecoflo') && /clivus|nature loo|composting toilet/i.test(desc)) return { rule: 'split-between-two-unyoked', note: 'Compost toilet - matches INV-0137 description, but two installed' };
  if (contact.includes('the bunker') && desc.includes('decking')) return { rule: 'specific-to-this-cabin', note: 'Deck materials May 2024 — INV-0137 mentions disassembly of 6x2.4m deck taken with cabin' };
  if (contact.includes('hatch electrical')) return { rule: 'split-between-two-unyoked', note: 'Electrical for new tiny homes — split between Unyokeds' };
  if (contact.includes('burgess plumbing')) return { rule: 'specific-to-this-cabin', note: 'Plumbing/HWS install — likely this cabin given timing matches' };

  // Eco-tourism Bunnings — split among cabins
  const cat = categorise(r);
  if (cat.isEco) return { rule: 'shared-across-all-cabins', note: 'Eco-tourism general fitout/repairs' };
  if (cat.isFarm && /cabin|ecotourism/i.test(desc)) return { rule: 'shared-across-all-cabins', note: 'Farm-tagged but cabin-related' };

  return null; // Not relevant to cabin
}

// Score and tabulate
const rows = [];
for (const r of all) {
  const cls = classifyForCabin(r);
  if (!cls || cls.skip) continue;
  const date = dateOf(r);
  const fy = (date >= '2023-07-01' && date <= '2024-06-30') ? 'FY24' : (date >= '2022-07-01' && date <= '2023-06-30') ? 'FY23' : 'OTHER';
  const allocation = ALLOCATIONS[cls.rule];
  const total = Number(r.Total || 0);
  const allocatedToCabin = total * allocation;
  rows.push({
    date, fy,
    kind: r._kind,
    contact: r.Contact?.Name || '',
    total,
    allocation,
    allocated: allocatedToCabin,
    rule: cls.rule,
    note: cls.note,
    desc: descOf(r),
    tags: tracking(r).join(', '),
    invoice: r.InvoiceNumber || r.BankTransactionID || '',
  });
}

rows.sort((a,b) => a.date.localeCompare(b.date));

// === FY24 SUMMARY ===
const fy24Rows = rows.filter(r => r.fy === 'FY24');
const fy23Rows = rows.filter(r => r.fy === 'FY23');

const sum = arr => arr.reduce((s,r) => s + r.allocated, 0);
const sumGross = arr => arr.reduce((s,r) => s + r.total, 0);

console.log('=== FY23 (Jul 2022 - Jun 2023) Cameron-cabin-related spend ===');
console.log(`${fy23Rows.length} records, gross $${sumGross(fy23Rows).toFixed(2)}, allocated to Cameron cabin $${sum(fy23Rows).toFixed(2)}`);
console.log();
console.log('=== FY24 (Jul 2023 - Jun 2024) Cameron-cabin-related spend ===');
console.log(`${fy24Rows.length} records, gross $${sumGross(fy24Rows).toFixed(2)}, allocated to Cameron cabin $${sum(fy24Rows).toFixed(2)}`);
console.log();
console.log('=== TOTAL (Nov 2022 - May 2024) Cameron cabin cost-base candidates ===');
console.log(`${rows.length} records, gross $${sumGross(rows).toFixed(2)}, allocated to Cameron cabin $${sum(rows).toFixed(2)}`);

// Save
writeFileSync('/tmp/cabin-fy24-cost-base.json', JSON.stringify({
  cameron_invoice: 'INV-0137 dated 21 May 2024, Mike & Gem Cameron, $83,985 inc GST ($76,350 ex GST)',
  rows,
  fy23: { count: fy23Rows.length, gross: sumGross(fy23Rows), allocated: sum(fy23Rows), rows: fy23Rows },
  fy24: { count: fy24Rows.length, gross: sumGross(fy24Rows), allocated: sum(fy24Rows), rows: fy24Rows },
}, null, 2));
console.log('\nFull data: /tmp/cabin-fy24-cost-base.json');
