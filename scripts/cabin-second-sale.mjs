#!/usr/bin/env node
/**
 * Find the second cabin sale (FY25 = Jul 2024 - Jun 2025).
 */
import '../lib/load-env.mjs';
import { readFileSync } from 'fs';

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

// Pull ACCREC invoices Jul 2024 - Jun 2025
const dateWhere = `Date>=DateTime(2024,06,01)&&Date<=DateTime(2025,06,30)`;
const all = [];
for (let p = 1; p < 50; p++) {
  const where = `Type=="ACCREC"&&${dateWhere}`;
  const d = await xget(`Invoices?where=${encodeURIComponent(where)}&page=${p}&order=Date`);
  const items = d.Invoices || [];
  if (!items.length) break;
  all.push(...items);
  if (items.length < 100) break;
}
console.log(`ACCREC invoices Jun 2024 - Jun 2025: ${all.length}\n`);

// Filter for cabin-related sales
const blob = (r) => {
  const li = (r.LineItems || []).map(l => l.Description || '').join(' | ');
  return [r.Contact?.Name || '', r.Reference || '', li].join(' || ').toLowerCase();
};

const cabinRelated = all.filter(r => /cabin|tiny home|tiny house|unyoked|dwelling|hut|shed/i.test(blob(r)));
console.log(`Cabin-related sales: ${cabinRelated.length}\n`);

for (const inv of cabinRelated.sort((a,b) => Number(b.Total||0) - Number(a.Total||0))) {
  const date = (inv.DateString || '').slice(0,10);
  console.log(`${date} | ${inv.InvoiceNumber} | ${inv.Contact?.Name} | $${inv.Total} | ${inv.Status}`);
  for (const li of (inv.LineItems || [])) {
    const t = (li.Tracking || []).map(t => t.Option).filter(Boolean).join(',');
    console.log(`   - ${(li.Description || '').slice(0,150)}`);
    console.log(`     qty=${li.Quantity} price=${li.UnitAmount} acct=${li.AccountCode} tracking=${t}`);
  }
  console.log();
}

// Also look at high-value sales generally
console.log('\n=== Top 10 ACCREC by value, Jun 2024 - Jun 2025 ===');
all.sort((a,b)=>Number(b.Total||0)-Number(a.Total||0)).slice(0,10).forEach(inv => {
  const date = (inv.DateString || '').slice(0,10);
  const desc = (inv.LineItems || []).map(l => (l.Description||'').slice(0,60)).filter(Boolean).join(' | ').slice(0,100);
  console.log(`${date} | ${inv.InvoiceNumber} | $${inv.Total} | ${inv.Contact?.Name?.slice(0,30)} | ${desc}`);
});
