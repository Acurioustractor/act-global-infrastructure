#!/usr/bin/env node
/**
 * Live-Xero-API search for any Knight Photography / Benjamin Knight money.
 *
 * Bypasses the Supabase mirror entirely. Hits the Xero API directly to find:
 *   - All contacts whose name matches Knight / Photography / Benjamin
 *   - All invoices (any status, any year) for each matching contact
 *   - All bank transactions for each matching contact
 *   - Summary totals
 *
 * Usage: node scripts/search-xero-knight-photography.mjs
 *
 * Read-only. No writes to Xero or Supabase.
 */

import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';

const sb = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const xero = await createXeroClient(sb);

// --- search terms (case-insensitive) ---
const NEEDLES = ['knight', 'photography', 'benjamin'];

console.log('Live Xero API search for Knight Photography / Benjamin Knight money');
console.log(`Tenant: ${process.env.XERO_TENANT_ID}`);
console.log(`Searching contact names containing any of: ${NEEDLES.join(', ')}`);
console.log('');

// --- fetch all contacts (paged) ---
async function fetchAllContacts() {
  const all = [];
  let page = 1;
  while (true) {
    const res = await xero.get(`Contacts?page=${page}&summaryOnly=true`);
    const batch = res.Contacts || [];
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return all;
}

console.log('Fetching contact list...');
const contacts = await fetchAllContacts();
console.log(`  ${contacts.length} contacts in Xero`);

const matches = contacts.filter(c => {
  const name = (c.Name || '').toLowerCase();
  return NEEDLES.some(n => name.includes(n));
});

console.log(`  ${matches.length} contacts matching "${NEEDLES.join(' / ')}":`);
for (const c of matches) {
  console.log(`    ${c.ContactID}  ${c.Name}`);
}
console.log('');

if (matches.length === 0) {
  console.log('No matching contacts found in live Xero.');
  process.exit(0);
}

// --- fetch invoices for each matching contact ---
async function fetchInvoicesForContact(contactId) {
  const all = [];
  // Explicitly request all statuses so VOIDED / DELETED / DRAFT invoices show up too.
  const statuses = 'DRAFT,SUBMITTED,AUTHORISED,PAID,VOIDED,DELETED';
  let page = 1;
  while (true) {
    const res = await xero.get(`Invoices?ContactIDs=${contactId}&Statuses=${statuses}&page=${page}`);
    const batch = res.Invoices || [];
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return all;
}

async function fetchBankTxnsForContact(contactId) {
  // BankTransactions endpoint doesn't filter by ContactID directly — fetch by where clause
  const where = encodeURIComponent(`Contact.ContactID==Guid("${contactId}")`);
  const all = [];
  let page = 1;
  while (true) {
    const res = await xero.get(`BankTransactions?where=${where}&page=${page}`);
    const batch = res.BankTransactions || [];
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return all;
}

const totals = { invoices: 0, txns: 0, accpay_total: 0, accrec_total: 0, txn_total: 0 };

for (const contact of matches) {
  console.log(`========================================`);
  console.log(`Contact: ${contact.Name}`);
  console.log(`ContactID: ${contact.ContactID}`);
  console.log('========================================');

  console.log(`\n--- Invoices ---`);
  const invoices = await fetchInvoicesForContact(contact.ContactID);
  console.log(`  Found ${invoices.length} invoice(s):`);
  for (const inv of invoices) {
    const date = (inv.DateString || inv.Date || '').slice(0, 10);
    const total = Number(inv.Total || 0);
    const amtDue = Number(inv.AmountDue || 0);
    const amtPaid = Number(inv.AmountPaid || 0);
    console.log(`    ${date}  ${inv.Type.padEnd(7)} ${inv.Status.padEnd(11)} ${(inv.InvoiceNumber || '').padEnd(15)} $${total.toFixed(2).padStart(11)}  paid:$${amtPaid.toFixed(2)}  due:$${amtDue.toFixed(2)}`);
    if (inv.Reference) console.log(`      Ref: ${inv.Reference}`);
    for (const li of (inv.LineItems || []).slice(0, 3)) {
      const desc = (li.Description || '').replace(/\s+/g, ' ').slice(0, 100);
      console.log(`      Line: $${Number(li.LineAmount || 0).toFixed(2)}  ${desc}`);
    }
    totals.invoices += 1;
    if (inv.Type === 'ACCPAY') totals.accpay_total += total;
    if (inv.Type === 'ACCREC') totals.accrec_total += total;
  }

  console.log(`\n--- Bank Transactions ---`);
  try {
    const txns = await fetchBankTxnsForContact(contact.ContactID);
    console.log(`  Found ${txns.length} bank transaction(s):`);
    for (const tx of txns) {
      const date = (tx.DateString || tx.Date || '').slice(0, 10);
      const total = Number(tx.Total || 0);
      const acct = (tx.BankAccount?.Name || '').slice(0, 30);
      console.log(`    ${date}  ${tx.Type.padEnd(7)} ${tx.Status.padEnd(11)} ${acct.padEnd(32)}  $${total.toFixed(2).padStart(11)}`);
      for (const li of (tx.LineItems || []).slice(0, 2)) {
        const desc = (li.Description || '').replace(/\s+/g, ' ').slice(0, 100);
        console.log(`      Line: $${Number(li.LineAmount || 0).toFixed(2)}  ${desc}`);
      }
      totals.txns += 1;
      totals.txn_total += total;
    }
  } catch (e) {
    console.log(`  (BankTransactions query failed: ${e.message})`);
  }

  // also fetch payments allocated against this contact's invoices
  console.log(`\n--- Payments ---`);
  try {
    const where = encodeURIComponent(`Invoice.Contact.ContactID==Guid("${contact.ContactID}")`);
    const res = await xero.get(`Payments?where=${where}`);
    const payments = res.Payments || [];
    console.log(`  Found ${payments.length} payment(s):`);
    for (const p of payments) {
      const date = (p.DateString || p.Date || '').slice(0, 10);
      const total = Number(p.Amount || 0);
      const acct = (p.Account?.Name || p.Account?.Code || '').slice(0, 30);
      const invNum = p.Invoice?.InvoiceNumber || '';
      console.log(`    ${date}  ${p.Status.padEnd(11)} acct:${acct.padEnd(20)} inv:${invNum.padEnd(12)} $${total.toFixed(2)}`);
    }
  } catch (e) {
    console.log(`  (Payments query failed: ${e.message})`);
  }

  console.log('');
}

console.log('');
console.log('========================================');
console.log('GRAND TOTAL');
console.log('========================================');
console.log(`Invoices found:       ${totals.invoices}  (ACCPAY $${totals.accpay_total.toFixed(2)}, ACCREC $${totals.accrec_total.toFixed(2)})`);
console.log(`Bank transactions:    ${totals.txns}  ($${totals.txn_total.toFixed(2)})`);
console.log('');
console.log('Note: Amounts may double-count between invoices + their settling payments.');
console.log('To trace settlement, look at "Payments" section per contact.');
