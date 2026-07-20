#!/usr/bin/env node
/**
 * Clean the known Sonas / Harvest invoice revisions in Xero.
 *
 * Dry-run by default. `--apply` performs only these exact, gated changes:
 *   - delete the empty draft INV-0326
 *   - add ACT-HV Project Tracking to every non-zero line on INV-0336 and INV-0337
 *
 * It deliberately does not alter INV-0316 or its two reconciled NAB receipts. Xero
 * history shows the invoice payment was reversed and the split bank-feed deposits
 * were recreated as receive-money transactions by the bookkeeper on 11 June 2026.
 */
import './lib/load-env.mjs';
import { appendFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { createXeroClient } from './lib/finance/xero-client.mjs';

const APPLY = process.argv.includes('--apply');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const xero = await createXeroClient(sb);
const abort = message => { console.error(`\n🛑 ABORT: ${message}`); process.exit(2); };

const expected = {
  draft: {
    id: 'a94412f9-64ff-4bd6-ac9e-551cbbf31173',
    number: 'INV-0326', status: 'DRAFT', total: 0,
  },
  tracked: [
    { id: '4302edd1-079f-45e7-9a19-504fb54a64eb', number: 'INV-0336', status: 'PAID', total: 36388 },
    { id: 'f7c82e1d-9aad-448a-8029-32316cb28c29', number: 'INV-0337', status: 'AUTHORISED', total: 59950 },
  ],
};

const categories = (await xero.get('TrackingCategories')).TrackingCategories || [];
const projectCategory = categories.find(category => category.Name === 'Project Tracking');
const harvestOption = projectCategory?.Options?.find(option =>
  option.Status === 'ACTIVE' && option.Name === 'ACT-HV — The Harvest Witta');
if (!projectCategory || !harvestOption) abort('active ACT-HV Project Tracking option not found');

async function readInvoice(target) {
  const invoice = (await xero.get(`Invoices/${target.id}`)).Invoices?.[0];
  if (!invoice) abort(`${target.number} not found`);
  if (invoice.InvoiceNumber !== target.number) abort(`${target.id} is ${invoice.InvoiceNumber}, expected ${target.number}`);
  if (invoice.Contact?.Name !== 'Sonas Properties Pty Ltd') abort(`${target.number} has unexpected contact ${invoice.Contact?.Name}`);
  if (Number(invoice.Total) !== target.total) abort(`${target.number} total is ${invoice.Total}, expected ${target.total}`);
  return invoice;
}

const draft = await readInvoice(expected.draft);
if (!['DRAFT', 'DELETED'].includes(draft.Status)) abort(`${expected.draft.number} status is ${draft.Status}, expected DRAFT or DELETED`);
console.log(`${expected.draft.number}: ${draft.Status}, $${draft.Total} → DELETED${draft.Status === 'DELETED' ? ' (already clean)' : ''}`);

const trackingUpdates = [];
for (const target of expected.tracked) {
  const invoice = await readInvoice(target);
  if (invoice.Status !== target.status) abort(`${target.number} status is ${invoice.Status}, expected ${target.status}`);
  const nonZeroLines = (invoice.LineItems || []).filter(line => Number(line.LineAmount) !== 0);
  if (!nonZeroLines.length) abort(`${target.number} has no non-zero lines`);
  const missing = nonZeroLines.filter(line => !(line.Tracking || []).some(item => item.TrackingOptionID === harvestOption.TrackingOptionID));
  console.log(`${target.number}: ${invoice.Status}, $${invoice.Total}; ${missing.length}/${nonZeroLines.length} non-zero lines need ACT-HV`);
  trackingUpdates.push({ target, invoice, missing });
}

if (!APPLY) {
  console.log('\n✅ Gates pass. DRY-RUN only — add --apply to perform the cleanup.');
  process.exit(0);
}

if (draft.Status !== 'DELETED') {
  await xero.post(`Invoices/${expected.draft.id}`, { Invoices: [{ InvoiceID: expected.draft.id, Status: 'DELETED' }] });
  const after = await readInvoice(expected.draft);
  if (after.Status !== 'DELETED') abort(`${expected.draft.number} delete did not stick (status=${after.Status})`);
}

for (const { target, invoice, missing } of trackingUpdates) {
  if (!missing.length) continue;
  const lineItems = (invoice.LineItems || []).map(line => {
    if (Number(line.LineAmount) === 0) return line;
    const tracking = (line.Tracking || []).filter(item => item.TrackingCategoryID !== projectCategory.TrackingCategoryID);
    return {
      ...line,
      Tracking: [...tracking, {
        TrackingCategoryID: projectCategory.TrackingCategoryID,
        TrackingOptionID: harvestOption.TrackingOptionID,
      }],
    };
  });
  await xero.post(`Invoices/${target.id}`, { Invoices: [{ InvoiceID: target.id, LineItems: lineItems }] });
  const after = await readInvoice(target);
  const failed = (after.LineItems || []).filter(line => Number(line.LineAmount) !== 0).filter(line =>
    !(line.Tracking || []).some(item => item.TrackingOptionID === harvestOption.TrackingOptionID));
  if (failed.length) abort(`${target.number} tracking did not stick on ${failed.length} lines`);
  if (after.Status !== target.status || Number(after.Total) !== target.total) abort(`${target.number} status or total changed unexpectedly`);
}

appendFileSync('thoughts/shared/recon-pack/reconcile-write-log.md',
  `| ${new Date().toISOString()} | HARVEST_INVOICE_CLEANUP | 2026-04-29 | Sonas Properties Pty Ltd | $0 | INV-0326 | empty draft deleted; INV-0336 + INV-0337 ACT-HV tracking restored | OK |\n`);
console.log('\n✅ Harvest invoice cleanup applied and verified in live Xero.');
