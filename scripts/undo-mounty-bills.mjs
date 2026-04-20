#!/usr/bin/env node
/**
 * Undo Mounty Bills — voids/deletes all ACCPAY bills created by
 * tag-mounty-bills.mjs (any bill with Reference starting "MOUNTY-").
 *
 * Then archives the 4 new contacts that were created.
 *
 * Idempotent: only acts on bills currently AUTHORISED (already-deleted ones skip).
 *
 * Usage:
 *   node scripts/undo-mounty-bills.mjs              # dry run
 *   node scripts/undo-mounty-bills.mjs --apply      # actually void
 */
import './lib/load-env.mjs';
import { readFileSync, existsSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const TENANT = process.env.XERO_TENANT_ID;
let token;
if (existsSync('.xero-tokens.json')) {
  token = JSON.parse(readFileSync('.xero-tokens.json', 'utf8')).access_token;
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

const NEW_CONTACT_NAMES = [
  'The Sand Yard',
  'Edmonds Landscaping Supplies',
  'Auto Sparky',
  'Mounty Container Supplier',
];

async function main() {
  console.log('=== Undo Mounty Bills ===');
  console.log('Mode:', APPLY ? 'APPLY (will void bills + archive new contacts)' : 'DRY RUN');
  console.log();

  // Find all bills with Reference starting MOUNTY-
  // Xero filter syntax: Reference.StartsWith("MOUNTY-")
  console.log('Searching for bills with Reference starting "MOUNTY-"...');
  const j = await xero('GET', `Invoices?where=${encodeURIComponent('Type=="ACCPAY" AND Reference.StartsWith("MOUNTY-")')}`);
  const bills = j.Invoices || [];
  console.log(`Found ${bills.length} bills\n`);

  let voided = 0, skipped = 0, failed = 0;
  for (const b of bills) {
    const ref = b.Reference || '';
    const status = b.Status;
    const total = b.Total;
    const contact = b.Contact?.Name;
    const id = b.InvoiceID;

    if (status === 'DELETED' || status === 'VOIDED') {
      console.log(`  ⏭  ${ref} ${id.slice(0,8)} already ${status}, $${total} ${contact}`);
      skipped++;
      continue;
    }

    if (!APPLY) {
      console.log(`  [DRY] would void ${ref} ${id.slice(0,8)} $${total} ${contact} (currently ${status})`);
      continue;
    }

    try {
      // AUTHORISED ACCPAY bills: Status must be VOIDED (not DELETED — that's only for DRAFT)
      await xero('POST', `Invoices/${id}`, {
        Invoices: [{ InvoiceID: id, Status: 'VOIDED' }],
      });
      console.log(`  ✓ voided ${ref} ${id.slice(0,8)} $${total} ${contact}`);
      voided++;
    } catch (e) {
      console.log(`  ❌ ${ref}: ${e.message}`);
      failed++;
    }
  }

  // Archive the new contacts
  console.log(`\n=== Archiving ${NEW_CONTACT_NAMES.length} new contacts ===`);
  let archived = 0, contactSkipped = 0, contactFailed = 0;
  for (const name of NEW_CONTACT_NAMES) {
    try {
      const search = await xero('GET', `Contacts?where=${encodeURIComponent(`Name=="${name}"`)}`);
      const contact = search.Contacts?.[0];
      if (!contact) {
        console.log(`  ⏭  ${name}: not found`);
        contactSkipped++;
        continue;
      }
      if (contact.ContactStatus === 'ARCHIVED') {
        console.log(`  ⏭  ${name}: already archived`);
        contactSkipped++;
        continue;
      }
      if (!APPLY) {
        console.log(`  [DRY] would archive ${name} (${contact.ContactID.slice(0,8)})`);
        continue;
      }
      await xero('POST', `Contacts/${contact.ContactID}`, {
        Contacts: [{ ContactID: contact.ContactID, ContactStatus: 'ARCHIVED' }],
      });
      console.log(`  ✓ archived ${name}`);
      archived++;
    } catch (e) {
      console.log(`  ❌ ${name}: ${e.message}`);
      contactFailed++;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Bills voided: ${voided}`);
  console.log(`Bills skipped (already gone): ${skipped}`);
  console.log(`Bills failed: ${failed}`);
  console.log(`Contacts archived: ${archived}`);
  console.log(`Contacts skipped: ${contactSkipped}`);
  console.log(`Contacts failed: ${contactFailed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
