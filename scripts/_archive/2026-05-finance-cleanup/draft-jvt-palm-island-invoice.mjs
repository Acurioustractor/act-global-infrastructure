#!/usr/bin/env node
/**
 * Draft Tax Invoice — A Curious Tractor → The John Villiers Trust
 * Goods Project: Palm Island trip travel reimbursement
 *
 * Run: node scripts/draft-jvt-palm-island-invoice.mjs
 * Add --apply to actually create. Default = dry-run.
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

// ---- Find or create contact ----
console.log('Searching for contact "John Villiers Trust"...');
const search = await xero.get('Contacts?where=' + encodeURIComponent('Name.Contains("Villiers")'));
const contacts = search.Contacts || [];
console.log(`Found ${contacts.length} matching contacts:`);
contacts.forEach(c => console.log(`  - ${c.Name} (${c.ContactID})`));

let contact = contacts.find(c => /john\s*villiers/i.test(c.Name));

if (!contact) {
  console.log('\nNo John Villiers Trust contact found.');
  if (APPLY) {
    const created = await xero.post('Contacts', {
      Contacts: [{
        Name: 'The John Villiers Trust',
        FirstName: 'Fiona',
        LastName: 'Maxwell',
        EmailAddress: 'ceo@jvtrust.org.au',
      }],
    });
    contact = created.Contacts[0];
    console.log(`Created contact: ${contact.Name} (${contact.ContactID})`);
  } else {
    console.log('(dry-run — would create "The John Villiers Trust" with Fiona Maxwell <ceo@jvtrust.org.au>)');
    contact = { ContactID: 'NEW', Name: 'The John Villiers Trust' };
  }
}

// ---- Line items (GST inclusive — travel reimbursement at cost) ----
const ACCOUNT_CODE = '200'; // Sales — confirm in Xero before sending
const TAX_TYPE = 'OUTPUT'; // GST on income (10%)

const LINE_ITEMS = [
  { Description: 'Return flight Brisbane–Townsville (Palm Island trip, 16–18 June 2026)', Quantity: 1, UnitAmount: 1000 },
  { Description: 'Return flight Townsville–Palm Island (16–18 June 2026)', Quantity: 1, UnitAmount: 400 },
  { Description: 'Two nights accommodation, Palm Island (16–18 June 2026)', Quantity: 1, UnitAmount: 400 },
].map(li => ({ ...li, AccountCode: ACCOUNT_CODE, TaxType: TAX_TYPE }));

const total = LINE_ITEMS.reduce((s, li) => s + li.UnitAmount, 0);
if (total !== 1800) { console.error('ERROR: total mismatch'); process.exit(1); }

const today = new Date().toISOString().slice(0, 10);
const dueDate = new Date(Date.now() + 14 * 86400e3).toISOString().slice(0, 10);

const invoicePayload = {
  Type: 'ACCREC',
  Contact: { ContactID: contact.ContactID },
  Date: today,
  DueDate: dueDate,
  Reference: 'Goods Project Palm Island Trip',
  Status: 'DRAFT',
  LineAmountTypes: 'Inclusive', // amounts are GST-inclusive
  LineItems: LINE_ITEMS,
};

console.log('\n--- Invoice preview ---');
console.log(`To: ${contact.Name} (Fiona Maxwell <ceo@jvtrust.org.au>)`);
console.log(`Date: ${today}  Due: ${dueDate}`);
console.log(`Reference: ${invoicePayload.Reference}`);
console.log(`Account: ${ACCOUNT_CODE}  Tax: ${TAX_TYPE}  LineAmountTypes: Inclusive`);
LINE_ITEMS.forEach((li, i) => console.log(`  ${i + 1}. ${li.Description} — $${li.UnitAmount}`));
console.log(`Total (inc GST): $${total}   GST component: $${(total / 11).toFixed(2)}`);

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
