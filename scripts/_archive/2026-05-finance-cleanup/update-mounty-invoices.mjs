#!/usr/bin/env node
/**
 * Update Mounty Yarns invoices for Just Reinvest:
 * - Edit INV-0295: replace single line with 6 detailed line items ($25,000 + GST)
 * - Void INV-0296 and INV-0297
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const xero = await createXeroClient(supabase);

const INV_0295_ID = '0b67f867-45aa-44d2-af47-0deee8124b41';
const INV_0296_ID = '48ec188f-41fa-4438-a7bc-59b04a4e6447';
const INV_0297_ID = '3eb7fd6c-5f96-4b3b-aa25-dbf7ef488dae';

const TRACKING = [
  { Name: 'Business Divisions', Option: 'A Curious Tractor' },
  { Name: 'Project Tracking', Option: 'Mounty' },
];

const LINE_ITEMS = [
  { Description: 'Container purchase and fit-out', Quantity: 1, UnitAmount: 10000, AccountCode: '260', TaxType: 'OUTPUT', Tracking: TRACKING },
  { Description: 'Equipment hire and ground cover', Quantity: 1, UnitAmount: 5000, AccountCode: '260', TaxType: 'OUTPUT', Tracking: TRACKING },
  { Description: 'Hardware, tools and activation materials', Quantity: 1, UnitAmount: 5500, AccountCode: '260', TaxType: 'OUTPUT', Tracking: TRACKING },
  { Description: 'Travel — flights (2 pax)', Quantity: 1, UnitAmount: 2000, AccountCode: '260', TaxType: 'OUTPUT', Tracking: TRACKING },
  { Description: 'Travel — accommodation, transport and meals', Quantity: 1, UnitAmount: 1500, AccountCode: '260', TaxType: 'OUTPUT', Tracking: TRACKING },
  { Description: 'Project coordination', Quantity: 1, UnitAmount: 1000, AccountCode: '260', TaxType: 'OUTPUT', Tracking: TRACKING },
];

// Verify total
const total = LINE_ITEMS.reduce((sum, li) => sum + li.UnitAmount, 0);
console.log(`Line items total: $${total.toLocaleString()} (expected $25,000)`);
if (total !== 25000) {
  console.error('ERROR: Line items do not sum to $25,000');
  process.exit(1);
}

// Step 1: Update INV-0295 with new line items
console.log('\n--- Updating INV-0295 with 6 detailed line items ---');
try {
  const updateResult = await xero.post(`Invoices/${INV_0295_ID}`, {
    Invoices: [{
      InvoiceID: INV_0295_ID,
      LineItems: LINE_ITEMS,
    }],
  });
  const inv = updateResult.Invoices?.[0];
  console.log(`INV-0295 updated: ${inv?.Status}, Total: $${inv?.Total}`);
  console.log(`Line items: ${inv?.LineItems?.length}`);
  inv?.LineItems?.forEach((li, i) => {
    console.log(`  ${i + 1}. ${li.Description} — $${li.UnitAmount}`);
  });
} catch (err) {
  console.error('Failed to update INV-0295:', err.message);
  if (err.xeroError) console.error(err.xeroError);
  process.exit(1);
}

// Step 2: Void INV-0296
console.log('\n--- Voiding INV-0296 ---');
try {
  const voidResult = await xero.post(`Invoices/${INV_0296_ID}`, {
    Invoices: [{
      InvoiceID: INV_0296_ID,
      Status: 'VOIDED',
    }],
  });
  console.log(`INV-0296: ${voidResult.Invoices?.[0]?.Status}`);
} catch (err) {
  console.error('Failed to void INV-0296:', err.message);
  if (err.xeroError) console.error(err.xeroError);
}

// Step 3: Void INV-0297
console.log('\n--- Voiding INV-0297 ---');
try {
  const voidResult = await xero.post(`Invoices/${INV_0297_ID}`, {
    Invoices: [{
      InvoiceID: INV_0297_ID,
      Status: 'VOIDED',
    }],
  });
  console.log(`INV-0297: ${voidResult.Invoices?.[0]?.Status}`);
} catch (err) {
  console.error('Failed to void INV-0297:', err.message);
  if (err.xeroError) console.error(err.xeroError);
}

// Print Xero link
console.log('\n--- Done ---');
console.log(`View INV-0295 in Xero:`);
console.log(`https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${INV_0295_ID}`);
