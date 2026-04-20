#!/usr/bin/env node
/**
 * Tag Mounty Bills — creates ACCPAY bills in Xero for the Mounty Yarns
 * project receipts that are sitting in our receipt_emails pool but aren't
 * currently in Xero as bills.
 *
 * For each unique vendor:
 *   1. Look up Xero contact (create if missing)
 * For each receipt:
 *   2. Create ACCPAY bill with one line item
 *      - Project Tracking = ACT-MY (Mounty Yarns)
 *      - Account 429 (General Expenses) — accountant can recategorise
 *      - Tax: INPUT (claim GST)
 *      - Status: AUTHORISED (not yet paid — to be settled via owner contribution)
 *      - Reference: receipt_emails id (for traceability)
 *   3. Track receipt_emails id → Xero InvoiceID linkage
 *
 * Idempotent: checks for existing bills via Reference field before creating.
 *
 * Usage:
 *   node scripts/tag-mounty-bills.mjs              # dry run, shows what would happen
 *   node scripts/tag-mounty-bills.mjs --apply      # creates bills in Xero
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const APPLY = process.argv.includes('--apply');
const TENANT = process.env.XERO_TENANT_ID;
const PROJECT_TRACKING_ID = '1a1ad7c5-249a-4b1f-842d-06ba2a63a0fe';  // discovered earlier
const MOUNTY_OPTION_NAME = 'ACT-MY — Mounty Yarns';

let token;
function loadToken() {
  if (existsSync('.xero-tokens.json')) {
    token = JSON.parse(readFileSync('.xero-tokens.json', 'utf8')).access_token;
  }
}

async function xero(method, endpoint, body = null) {
  await new Promise(r => setTimeout(r, 800));
  const headers = {
    Authorization: 'Bearer ' + token,
    'xero-tenant-id': TENANT,
    Accept: 'application/json',
  };
  if (body) headers['Content-Type'] = 'application/json';
  const r = await fetch('https://api.xero.com/api.xro/2.0/' + endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Xero ${method} ${endpoint}: ${r.status} ${text.slice(0, 300)}`);
  }
  return r.json();
}

// ============================================================================
// Vendor configuration — these are the receipts to import
// Excludes TNT Plastering (per Ben's instruction)
// ============================================================================
// NOTE: Container Options excluded per Ben — the actual $10k container purchase
// was paid via director owner contribution (visible as the Nov 4 / Nov 19 Nicholas
// Marchesi $10k deposits into ACT Everyday). We'll add the container as a separate
// manual bill so it shows on the Mounty project P&L, sourced as owner contribution.
const VENDORS = [
  { name: 'Kennards Hire', search: 'kennards' },
  { name: 'The Sand Yard', search: 'sand yard' },
  { name: 'Edmonds Landscaping Supplies', search: 'edmonds landscap' },
  { name: 'Auto Sparky', search: 'auto sparky' },
  { name: 'Loadshift Sydney', search: 'loadshift' },
  { name: 'AR Equipment', search: 'ar equipment' },
];

// Manual bills to add (not in receipt pool)
const MANUAL_BILLS = [
  {
    vendor: 'Mounty Container Supplier',
    description: 'Mounty Yarns project — Container purchase and fit-out (paid via director owner contribution)',
    incGst: 11000,
    date: '2025-11-04',
    reference: 'MOUNTY-CONTAINER-MANUAL',
  },
];

const FROM = '2025-11-01';
const TO = '2025-12-31';

async function findOrCreateContact(name) {
  // Find existing
  const j = await xero('GET', `Contacts?where=${encodeURIComponent(`Name="${name}"`)}`);
  if (j.Contacts && j.Contacts.length > 0) {
    return { contact: j.Contacts[0], created: false };
  }
  // Try fuzzy
  const j2 = await xero('GET', `Contacts?where=${encodeURIComponent(`Name.Contains("${name}")`)}`);
  if (j2.Contacts && j2.Contacts.length > 0) {
    return { contact: j2.Contacts[0], created: false };
  }
  // Create
  if (!APPLY) return { contact: { Name: name, ContactID: 'WOULD_CREATE' }, created: 'pending' };
  const created = await xero('POST', 'Contacts', { Contacts: [{ Name: name }] });
  return { contact: created.Contacts[0], created: true };
}

async function findExistingBillByReference(reference) {
  const j = await xero('GET', `Invoices?where=${encodeURIComponent(`Type=="ACCPAY" AND Reference="${reference}"`)}`);
  return (j.Invoices && j.Invoices.length > 0) ? j.Invoices[0] : null;
}

async function createBill(receipt, contactId) {
  const dateStr = (receipt.received_at || '').slice(0, 10);
  // Receipts are already inc-GST. Xero LineItems need ex-GST UnitAmount + tax_type that adds 10%.
  const incGst = Math.abs(Number(receipt.amount_detected || 0));
  const exGst = incGst / 1.1;

  const body = {
    Invoices: [{
      Type: 'ACCPAY',
      Contact: { ContactID: contactId },
      Date: dateStr,
      DueDate: dateStr,
      Status: 'AUTHORISED',
      LineAmountTypes: 'Exclusive',
      Reference: `MOUNTY-${receipt.id.slice(0, 8)}`,
      LineItems: [{
        Description: `Mounty Yarns project — ${receipt.vendor_name}` + (receipt.subject ? ` (${receipt.subject.slice(0, 80)})` : ''),
        Quantity: 1,
        UnitAmount: Number(exGst.toFixed(2)),
        AccountCode: '429',  // General Expenses (placeholder — Nic/accountant can recategorise)
        TaxType: 'INPUT',
        Tracking: [{
          Name: 'Project Tracking',
          Option: MOUNTY_OPTION_NAME,
        }],
      }],
    }],
  };

  if (!APPLY) return { wouldCreate: true, body };
  const j = await xero('POST', 'Invoices', body);
  return j.Invoices[0];
}

async function main() {
  loadToken();
  if (!token) { console.error('No Xero token'); process.exit(1); }
  console.log('=== Tag Mounty Bills ===');
  console.log('Mode:', APPLY ? 'APPLY (writes to Xero)' : 'DRY RUN');
  console.log();

  // Pull all matching receipts from Supabase
  const rawReceipts = [];
  for (const v of VENDORS) {
    const { data, error } = await sb.from('receipt_emails')
      .select('id, vendor_name, amount_detected, received_at, subject, source, status, attachment_filename, attachment_url')
      .ilike('vendor_name', `%${v.search}%`)
      .gte('received_at', FROM + 'T00:00:00')
      .lte('received_at', TO + 'T23:59:59')
      .order('received_at');
    if (error) { console.error('SB error:', error.message); continue; }
    rawReceipts.push(...(data || []).map(r => ({ ...r, _vendorConfig: v })));
  }

  // Net out refund pairs: if there's a +X and -X for the same vendor in the
  // same window, both cancel out and we skip both to keep the project P&L clean.
  const allReceipts = [];
  const skippedRefunds = [];
  for (const r of rawReceipts) {
    const amt = Number(r.amount_detected || 0);
    if (amt < 0) {
      // This is a refund — find a matching positive to cancel
      const matchIdx = rawReceipts.findIndex(o =>
        o.id !== r.id &&
        o._vendorConfig.name === r._vendorConfig.name &&
        Math.abs(Number(o.amount_detected || 0) + amt) < 0.01
      );
      if (matchIdx >= 0) {
        skippedRefunds.push({ refund: r, original: rawReceipts[matchIdx] });
        continue;
      }
    }
    allReceipts.push(r);
  }
  // Also remove the matching positives
  const refundOriginalIds = new Set(skippedRefunds.map(s => s.original.id));
  const filtered = allReceipts.filter(r => !refundOriginalIds.has(r.id));

  console.log(`Found ${rawReceipts.length} raw receipts across ${VENDORS.length} vendors`);
  if (skippedRefunds.length > 0) {
    console.log(`Refund pairs cancelled out: ${skippedRefunds.length}`);
    skippedRefunds.forEach(s => console.log(`  - ${s.refund.vendor_name} ${(s.original.received_at||'').slice(0,10)} +$${s.original.amount_detected} ↔ ${(s.refund.received_at||'').slice(0,10)} -$${Math.abs(s.refund.amount_detected)} (both skipped)`));
  }
  console.log(`After refund netting: ${filtered.length} receipts to process\n`);

  // From here use the filtered list as 'allReceipts'
  allReceipts.length = 0;
  allReceipts.push(...filtered);

  // Group by vendor
  const byVendor = {};
  for (const r of allReceipts) {
    const k = r._vendorConfig.name;
    if (!byVendor[k]) byVendor[k] = [];
    byVendor[k].push(r);
  }

  let totalInc = 0;
  let totalEx = 0;
  let createdContacts = 0;
  let createdBills = 0;
  let skippedBills = 0;
  const failures = [];

  for (const [vendorName, receipts] of Object.entries(byVendor)) {
    console.log(`\n📦 ${vendorName} (${receipts.length} receipts)`);

    // Find or create contact
    let contactId;
    try {
      const { contact, created } = await findOrCreateContact(vendorName);
      contactId = contact.ContactID;
      if (created === true) { createdContacts++; console.log(`   ✓ created contact: ${contact.Name}`); }
      else if (created === 'pending') console.log(`   [DRY] would create contact`);
      else console.log(`   ✓ found existing contact: ${contact.Name}`);
    } catch (e) {
      console.log(`   ❌ contact lookup failed: ${e.message}`);
      failures.push({ vendor: vendorName, err: e.message });
      continue;
    }

    // For each receipt, create a bill
    for (const r of receipts) {
      const ref = `MOUNTY-${r.id.slice(0, 8)}`;
      const incGst = Math.abs(Number(r.amount_detected || 0));
      totalInc += incGst;
      totalEx += incGst / 1.1;

      try {
        if (APPLY) {
          const existing = await findExistingBillByReference(ref);
          if (existing) {
            console.log(`   ⏭  ${ref} already exists (${existing.InvoiceNumber || existing.InvoiceID.slice(0,8)}), $${incGst}`);
            skippedBills++;
            continue;
          }
        }
        const bill = await createBill(r, contactId);
        if (APPLY) {
          createdBills++;
          console.log(`   ✓ created bill ${bill.InvoiceNumber || bill.InvoiceID.slice(0,8)} — ${(r.received_at||'').slice(0,10)} $${incGst.toFixed(2)} ref=${ref}`);
        } else {
          console.log(`   [DRY] ${(r.received_at||'').slice(0,10)} $${incGst.toFixed(2)} ref=${ref} → ACCPAY AUTHORISED, ACT-MY tracking`);
        }
      } catch (e) {
        console.log(`   ❌ ${(r.received_at||'').slice(0,10)} $${incGst.toFixed(2)}: ${e.message}`);
        failures.push({ vendor: vendorName, receipt: r.id, err: e.message });
      }
    }
  }

  // Manual bills (e.g. the $10k container that doesn't have a receipt in the pool)
  console.log(`\n=== Manual bills (${MANUAL_BILLS.length}) ===`);
  let manualCreated = 0;
  for (const m of MANUAL_BILLS) {
    console.log(`\n📦 ${m.vendor} (manual)`);
    let contactId;
    try {
      const { contact, created } = await findOrCreateContact(m.vendor);
      contactId = contact.ContactID;
      if (created === true) { createdContacts++; console.log(`   ✓ created contact: ${contact.Name}`); }
      else if (created === 'pending') console.log(`   [DRY] would create contact`);
      else console.log(`   ✓ found existing contact: ${contact.Name}`);
    } catch (e) {
      console.log(`   ❌ contact lookup failed: ${e.message}`);
      continue;
    }

    if (APPLY) {
      const existing = await findExistingBillByReference(m.reference);
      if (existing) {
        console.log(`   ⏭  ${m.reference} already exists (${existing.InvoiceNumber || existing.InvoiceID.slice(0,8)})`);
        continue;
      }
    }

    const exGst = m.incGst / 1.1;
    const body = {
      Invoices: [{
        Type: 'ACCPAY',
        Contact: { ContactID: contactId },
        Date: m.date,
        DueDate: m.date,
        Status: 'AUTHORISED',
        LineAmountTypes: 'Exclusive',
        Reference: m.reference,
        LineItems: [{
          Description: m.description,
          Quantity: 1,
          UnitAmount: Number(exGst.toFixed(2)),
          AccountCode: '429',
          TaxType: 'INPUT',
          Tracking: [{ Name: 'Project Tracking', Option: MOUNTY_OPTION_NAME }],
        }],
      }],
    };

    if (!APPLY) {
      console.log(`   [DRY] ${m.date} $${m.incGst.toFixed(2)} ref=${m.reference} → ACCPAY AUTHORISED, ACT-MY tracking`);
    } else {
      try {
        const j = await xero('POST', 'Invoices', body);
        const bill = j.Invoices[0];
        manualCreated++;
        console.log(`   ✓ created bill ${bill.InvoiceNumber || bill.InvoiceID.slice(0,8)} — ${m.date} $${m.incGst.toFixed(2)} ref=${m.reference}`);
      } catch (e) {
        console.log(`   ❌ ${e.message}`);
        failures.push({ vendor: m.vendor, err: e.message });
      }
    }
    totalInc += m.incGst;
    totalEx += exGst;
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Receipts processed: ${allReceipts.length}`);
  console.log(`Manual bills: ${MANUAL_BILLS.length}`);
  console.log(`Contacts ${APPLY ? 'created' : 'would create'}: ${createdContacts}`);
  console.log(`Bills ${APPLY ? 'created' : 'would create'}: ${APPLY ? createdBills : allReceipts.length - skippedBills}`);
  console.log(`Bills skipped (already exist): ${skippedBills}`);
  console.log(`Failures: ${failures.length}`);
  console.log();
  console.log(`Total inc GST: $${totalInc.toFixed(2)}`);
  console.log(`Total ex GST:  $${totalEx.toFixed(2)}`);
  console.log();
  console.log('After this run, Mounty project in Xero will show:');
  console.log(`  Bills tagged ACT-MY: $${totalInc.toFixed(2)} inc GST`);
  console.log(`  Status: AUTHORISED (not yet paid — to be settled via owner contribution)`);
  console.log();
  console.log('To bring total Mounty project value to the $27,500 invoice:');
  console.log(`  Receipts above:        $${totalInc.toFixed(2)}`);
  console.log(`  + Flights (Qantas/Virgin Sydney trip): $2,200`);
  console.log(`  + Accommodation/transport/meals: $1,650`);
  console.log(`  + Project coordination time: $1,100`);
  console.log(`  Need to add to hit $27,500: $${(27500 - totalInc).toFixed(2)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
