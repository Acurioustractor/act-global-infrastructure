#!/usr/bin/env node
/**
 * Create the Justice Reform Initiative photography invoice (ACCREC) as a DRAFT
 * and save the PDF locally.
 *
 * SAFE: creates a DRAFT only (not AUTHORISED, not emailed). Ben reviews + sends.
 * Idempotency guard: refuses to create a 2nd draft with the same reference for
 *   the same contact (so re-running won't pile up duplicates).
 *
 * Confirmed with Ben 2026-06-17:
 *   - $800 + GST (exclusive) = $880 total
 *   - Account 220 Consulting/Mentoring Income, tax OUTPUT (GST on income 10%)
 *
 * Usage:
 *   node scripts/jri-invoice-create.mjs            # dry run (prints plan)
 *   node scripts/jri-invoice-create.mjs --apply    # create draft + save PDF
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import os from 'os';
import path from 'path';

const APPLY = process.argv.includes('--apply');

const SUPA_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPA_URL, SUPA_KEY);
const TENANT = process.env.XERO_TENANT_ID;

// ---- invoice definition (confirmed with Ben 2026-06-17) ----
const INVOICE = {
  contactName: 'Justice Reform Initiative',
  firstName: 'Emma',
  lastName: 'Cother',
  email: 'emma@justicereforminitiative.org.au',
  date: '2026-06-17',
  dueDate: '2026-07-01',          // net 14
  reference: 'Reintegration Conference — photography',
  accountCode: '220',             // Consulting/Mentoring Income
  taxType: 'OUTPUT',              // GST on Income 10%
  description: "Photography — Reintegration Conference, Adelaide.\n" +
    "• 2 days of conference coverage: Wednesday 24 & Thursday 25 June\n" +
    "• Photo call for 4 international experts in the lobby of the Hilton Adelaide\n" +
    "• Photo call for the SYC-hosted exhibition of 'Unfiltered', The Foundry",
  unitAmount: 800,
  quantity: 1,
};

async function getAccessToken() {
  const { data: row } = await supabase.from('xero_tokens').select('refresh_token').eq('id', 'default').single();
  if (!row?.refresh_token) throw new Error('No refresh token; run node scripts/xero-auth.mjs');
  const creds = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');
  const r = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: row.refresh_token }),
  });
  if (!r.ok) throw new Error(`Token refresh failed ${r.status}: ${await r.text()}`);
  const t = await r.json();
  const expiresAt = new Date(Date.now() + t.expires_in * 1000 - 60000);
  await supabase.from('xero_tokens').upsert({ id: 'default', refresh_token: t.refresh_token, access_token: t.access_token, expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString(), updated_by: 'jri-invoice' }, { onConflict: 'id' });
  return t.access_token;
}
const xh = (token, accept = 'application/json') => ({ Authorization: `Bearer ${token}`, 'xero-tenant-id': TENANT, Accept: accept, 'Content-Type': 'application/json' });

async function main() {
  const ex = INVOICE.unitAmount * INVOICE.quantity;
  const gst = +(ex * 0.10).toFixed(2);
  console.log(`\n=== Justice Reform Initiative photography DRAFT invoice ${APPLY ? '*** APPLY ***' : '(DRY RUN)'} ===`);
  console.log(`  To:        ${INVOICE.contactName} (${INVOICE.firstName} ${INVOICE.lastName}, ${INVOICE.email})`);
  console.log(`  Line:      ${INVOICE.description.replace(/\n/g, '\n             ')}`);
  console.log(`  Account:   ${INVOICE.accountCode} | Tax: ${INVOICE.taxType} (GST on Income 10%)`);
  console.log(`  Amounts:   $${ex.toLocaleString()} + $${gst.toLocaleString()} GST = $${(ex + gst).toLocaleString()}`);
  console.log(`  Date/Due:  ${INVOICE.date} / ${INVOICE.dueDate}  | Ref: ${INVOICE.reference}\n`);

  const token = await getAccessToken();
  if (!TENANT) throw new Error('XERO_TENANT_ID not set');

  // 1) Find or create contact
  const cSearch = await (await fetch(`https://api.xero.com/api.xro/2.0/Contacts?where=${encodeURIComponent(`Name.Contains("Justice Reform")`)}`, { headers: xh(token) })).json();
  let contact = (cSearch.Contacts || [])[0];
  if (contact) {
    console.log(`  Contact exists: ${contact.Name} (${contact.ContactID})`);
  } else if (!APPLY) {
    console.log('  Contact: would CREATE (none found)');
  } else {
    const cr = await fetch('https://api.xero.com/api.xro/2.0/Contacts', {
      method: 'POST', headers: xh(token),
      body: JSON.stringify({ Name: INVOICE.contactName, FirstName: INVOICE.firstName, LastName: INVOICE.lastName, EmailAddress: INVOICE.email }),
    });
    if (!cr.ok) throw new Error(`Create contact failed ${cr.status}: ${await cr.text()}`);
    contact = (await cr.json()).Contacts[0];
    console.log(`  Contact CREATED: ${contact.Name} (${contact.ContactID})`);
  }

  // 2) Idempotency guard — existing draft to this contact w/ same reference?
  if (contact) {
    const dup = await (await fetch(`https://api.xero.com/api.xro/2.0/Invoices?where=${encodeURIComponent(`Type=="ACCREC" AND Contact.ContactID==Guid("${contact.ContactID}") AND Reference=="${INVOICE.reference}"`)}`, { headers: xh(token) })).json();
    if ((dup.Invoices || []).length) {
      const e = dup.Invoices[0];
      console.log(`\n  ⚠ A matching invoice already exists: ${e.InvoiceNumber || e.InvoiceID} status=${e.Status}. Not creating a duplicate.`);
      console.log(`  Deep link: https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${e.InvoiceID}`);
      return;
    }
  }

  if (!APPLY) { console.log('\n  (dry run — pass --apply to create the draft + save PDF)'); return; }

  // 3) Create DRAFT invoice
  const body = {
    Type: 'ACCREC',
    Contact: { ContactID: contact.ContactID },
    Date: INVOICE.date,
    DueDate: INVOICE.dueDate,
    Reference: INVOICE.reference,
    Status: 'DRAFT',
    LineAmountTypes: 'Exclusive',   // unit amount is GST-exclusive → GST added on top
    LineItems: [{
      Description: INVOICE.description,
      Quantity: INVOICE.quantity,
      UnitAmount: INVOICE.unitAmount,
      AccountCode: INVOICE.accountCode,
      TaxType: INVOICE.taxType,
    }],
  };
  const ir = await fetch('https://api.xero.com/api.xro/2.0/Invoices', { method: 'POST', headers: xh(token), body: JSON.stringify(body) });
  if (!ir.ok) throw new Error(`Create invoice failed ${ir.status}: ${await ir.text()}`);
  const inv = (await ir.json()).Invoices[0];
  const num = inv.InvoiceNumber || inv.InvoiceID;
  console.log(`\n  ✅ DRAFT created: ${num}`);
  console.log(`     SubTotal $${inv.SubTotal}  GST $${inv.TotalTax}  Total $${inv.Total}  Status ${inv.Status}`);
  console.log(`     Deep link: https://go.xero.com/AccountsReceivable/Edit.aspx?InvoiceID=${inv.InvoiceID}`);

  // 4) Fetch PDF + save locally
  await new Promise(r => setTimeout(r, 1500));
  const pr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${inv.InvoiceID}`, { headers: xh(token, 'application/pdf') });
  if (!pr.ok) { console.log(`  ⚠ PDF fetch failed ${pr.status}: ${await pr.text()} — open the deep link to download from Xero.`); return; }
  const buf = Buffer.from(await pr.arrayBuffer());
  const safeNum = String(num).replace(/[^\w.-]/g, '_');
  const outPath = path.join(os.homedir(), 'Downloads', `JRI-photography-invoice-${safeNum}.pdf`);
  writeFileSync(outPath, buf);
  console.log(`\n  💾 PDF saved: ${outPath}  (${(buf.length / 1024).toFixed(0)} KB)`);
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
