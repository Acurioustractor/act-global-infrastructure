#!/usr/bin/env node
/**
 * Search live Xero bank transactions for any FY26 SPEND that *mentions*
 * Knight / Photography / Benjamin in the bank description or line items —
 * even when the contact isn't tagged as Knight Photography.
 *
 * Catches the case where money moved from ACT → Ben without a Xero bill being raised.
 *
 * Read-only.
 */

import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';

const sb = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);
const xero = await createXeroClient(sb);

const NEEDLES = ['knight', 'photography', 'benjamin', 'b knight', 'b. knight', 'bjk'];
const FY_FROM = '2025-07-01';
const FY_TO = '2026-06-30';

console.log(`Live Xero bank-transaction search`);
console.log(`Window: ${FY_FROM} → ${FY_TO}`);
console.log(`Looking for: ${NEEDLES.join(' / ')} in bank reference, contact name, or line item description`);
console.log('');

// Pull all FY26 BankTransactions. Xero where clause uses ISO-style date.
const where = encodeURIComponent(`Date >= DateTime(${FY_FROM.replaceAll('-', ',')}) AND Date <= DateTime(${FY_TO.replaceAll('-', ',')})`);

let page = 1;
let total = 0;
const matches = [];
while (true) {
  const res = await xero.get(`BankTransactions?where=${where}&page=${page}`);
  const batch = res.BankTransactions || [];
  if (batch.length === 0) break;
  for (const tx of batch) {
    total += 1;
    const ref = (tx.Reference || '').toLowerCase();
    const contact = (tx.Contact?.Name || '').toLowerCase();
    const lineDescs = (tx.LineItems || []).map(li => (li.Description || '').toLowerCase()).join(' | ');
    const blob = `${ref} ${contact} ${lineDescs}`;
    if (NEEDLES.some(n => blob.includes(n))) {
      matches.push(tx);
    }
  }
  console.log(`  page ${page}: ${batch.length} txns (running ${total})`);
  if (batch.length < 100) break;
  page += 1;
}
console.log('');
console.log(`Scanned ${total} bank transactions in FY26.`);
console.log(`Found ${matches.length} match(es) mentioning Knight / Photography / Benjamin / etc:`);
console.log('');

let totalMatched = 0;
for (const tx of matches) {
  const date = (tx.DateString || tx.Date || '').slice(0, 10);
  const amt = Number(tx.Total || 0);
  totalMatched += amt;
  console.log(`${date}  ${tx.Type.padEnd(7)} ${tx.Status.padEnd(11)} acct:${(tx.BankAccount?.Name || '').slice(0, 30).padEnd(32)} contact:${(tx.Contact?.Name || '').padEnd(30)} $${amt.toFixed(2).padStart(11)}`);
  if (tx.Reference) console.log(`    Ref: ${tx.Reference}`);
  for (const li of (tx.LineItems || []).slice(0, 3)) {
    const d = (li.Description || '').replace(/\s+/g, ' ').slice(0, 120);
    if (d) console.log(`    Line: $${Number(li.LineAmount || 0).toFixed(2)}  ${d}`);
  }
  console.log('');
}
console.log(`Matched total: $${totalMatched.toFixed(2)}`);
