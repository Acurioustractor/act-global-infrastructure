#!/usr/bin/env node
/**
 * Draft Tax Invoice — A Curious Tractor → Brodie Germaine Fitness
 * BAIL: YDPF partner deliverables (Lines 15, 16, 17)
 *
 * Creates as DRAFT so it can be reviewed in Xero before sending.
 * Run: node scripts/draft-bail-invoice.mjs
 * Add --apply to actually create. Default = dry-run (search + preview only).
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';

const APPLY = process.argv.includes('--apply');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.SUPABASE_SHARED_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY
);
const xero = await createXeroClient(supabase);

// ---- Search for contact ----
console.log('Searching for contact "Brodie Germaine"...');
const search = await xero.get('Contacts?where=' + encodeURIComponent('Name.Contains("Brodie")'));
const contacts = search.Contacts || [];
console.log(`Found ${contacts.length} contacts:`);
contacts.forEach(c => console.log(`  - ${c.Name} (${c.ContactID})`));

let contact = contacts.find(c => /brodie\s*germaine/i.test(c.Name));
if (!contact && contacts.length === 1) contact = contacts[0];

if (!contact) {
  console.log('\nNo Brodie Germaine contact found. Will create one.');
  if (APPLY) {
    const created = await xero.post('Contacts', {
      Contacts: [{ Name: 'Brodie Germaine Fitness' }]
    });
    contact = created.Contacts[0];
    console.log(`Created contact: ${contact.Name} (${contact.ContactID})`);
  } else {
    console.log('(dry-run — would create "Brodie Germaine Fitness")');
    contact = { ContactID: 'NEW', Name: 'Brodie Germaine Fitness' };
  }
}

// ---- Tracking categories ----
const TRACKING = [
  { Name: 'Business Divisions', Option: 'A Curious Tractor' },
  { Name: 'Project Tracking', Option: 'ACT-BG — BG Fit' },
];

// ---- Line items (ex GST) ----
const ACCOUNT_CODE = '200'; // Sales — confirm in Xero before applying
const TAX_TYPE = 'OUTPUT'; // GST on income (10%)

const LINE_ITEMS = [
  { Description: 'Campfire website build (Next.js, Tailwind, deployment)', Quantity: 1, UnitAmount: 4000 },
  { Description: 'Empathy Ledger API integration and Impact page', Quantity: 1, UnitAmount: 3000 },
  { Description: 'Content hub and copywriting (Hero, About, Services, Impact, Stories pages)', Quantity: 1, UnitAmount: 2000 },
  { Description: 'Hosting, domain, ongoing comms support', Quantity: 1, UnitAmount: 1000 },
  { Description: 'Brand assets, logo, design system', Quantity: 1, UnitAmount: 1500 },
  { Description: 'Social media content and scheduling', Quantity: 1, UnitAmount: 1000 },
  { Description: 'Marketing collateral (one-pagers, event graphics)', Quantity: 1, UnitAmount: 500 },
  { Description: 'Program design, cultural comms, referral materials', Quantity: 1, UnitAmount: 1000 },
].map(li => ({ ...li, AccountCode: ACCOUNT_CODE, TaxType: TAX_TYPE, Tracking: TRACKING }));

const subtotal = LINE_ITEMS.reduce((s, li) => s + li.UnitAmount, 0);
console.log(`\nSubtotal ex GST: $${subtotal.toLocaleString()} (expected $14,000)`);
if (subtotal !== 14000) {
  console.error('ERROR: subtotal mismatch'); process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const dueDate = new Date(Date.now() + 14 * 86400e3).toISOString().slice(0, 10);

const invoicePayload = {
  Type: 'ACCREC',
  Contact: { ContactID: contact.ContactID },
  Date: today,
  DueDate: dueDate,
  Reference: 'BAIL — YDPF partner deliverables (Lines 15, 16, 17)',
  Status: 'DRAFT',
  LineAmountTypes: 'Exclusive',
  LineItems: LINE_ITEMS,
};

console.log('\n--- Invoice preview ---');
console.log(`To: ${contact.Name}`);
console.log(`Date: ${today}  Due: ${dueDate}`);
console.log(`Reference: ${invoicePayload.Reference}`);
console.log(`Account: ${ACCOUNT_CODE}  Tax: ${TAX_TYPE}`);
console.log(`Tracking: ${TRACKING.map(t => `${t.Name}=${t.Option}`).join(', ')}`);
LINE_ITEMS.forEach((li, i) => console.log(`  ${i+1}. ${li.Description} — $${li.UnitAmount}`));
console.log(`Subtotal: $${subtotal}  GST: $${subtotal*0.1}  Total: $${subtotal*1.1}`);

if (!APPLY) {
  console.log('\n(dry-run — pass --apply to create the draft in Xero)');
  process.exit(0);
}

console.log('\nCreating DRAFT invoice in Xero...');
const result = await xero.post('Invoices', { Invoices: [invoicePayload] });
const inv = result.Invoices?.[0];
if (!inv || inv.HasErrors) {
  console.error('FAILED:', JSON.stringify(inv?.ValidationErrors || result, null, 2));
  process.exit(1);
}
console.log(`\nCreated: ${inv.InvoiceNumber || '(no number assigned to draft)'}  ID: ${inv.InvoiceID}`);
console.log(`Status: ${inv.Status}  Total: $${inv.Total}`);
console.log(`Deep link: https://go.xero.com/AccountsReceivable/Edit.aspx?InvoiceID=${inv.InvoiceID}`);
