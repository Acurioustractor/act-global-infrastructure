#!/usr/bin/env node
/**
 * Aleisha J Keating bad-debt write-off — FY26
 *
 * Writes off 27 unpaid invoices ($12,150 total) on Nic's sole-trader Xero
 * tenant by creating one ACCRECCREDIT (sales credit note) per invoice and
 * allocating it to the invoice. Each credit note posts against the
 * bad-debt expense account that Standard Ledger has confirmed.
 *
 * Tax-type policy: each credit note matches the source invoice's tax type
 * (EXEMPTOUTPUT for INV-0238 to INV-0274, INPUTTAXED for INV-0279 to
 * INV-0307). Both are GST-free, so the write-off is income-tax-deduction
 * only with no BAS impact.
 *
 * Usage:
 *   node scripts/write-off-aleisha-invoices.mjs                          # dry-run, prints planned actions
 *   node scripts/write-off-aleisha-invoices.mjs --account-code 6800      # dry-run with account code preview
 *   node scripts/write-off-aleisha-invoices.mjs --apply --account-code 6800 --confirm   # ACTUALLY WRITE OFF
 *
 * Pre-conditions:
 *   - Standard Ledger has confirmed the bad-debt expense account code (passed via --account-code)
 *   - Xero tokens are valid (run scripts/sync-xero-tokens.mjs if not)
 *   - All 27 invoices are still AUTHORISED with full amount_due (re-checked at run-time)
 *
 * Idempotency:
 *   - Per-invoice: skip if invoice is already PAID, VOIDED, or has amount_due < total
 *   - Audit log written to scripts/output/aleisha-writeoff-<ISO>.json with one
 *     entry per invoice (skipped, success, failed) so you can re-run safely
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { createXeroClient } from './lib/finance/xero-client.mjs';

const ALEISHA_CONTACT_ID = '41487e6d-15a5-44e5-8af8-6ef9625debc0';
const ALEISHA_CONTACT_NAME = 'Aleisha J Keating';
const TAX_TYPE_CHANGE_INVOICE = 'INV-0279'; // first INPUTTAXED — earlier are EXEMPTOUTPUT
const EXPECTED_TOTAL_INVOICES = 27;
const EXPECTED_TOTAL_AUD = 12150;
const PER_INVOICE_AMOUNT = 450;
const RATE_LIMIT_MS = 1100; // ~55 calls/min to stay under Xero's 60/min limit

// --- arg parsing ---
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const CONFIRM = args.includes('--confirm');
const accountCodeIdx = args.indexOf('--account-code');
const ACCOUNT_CODE = accountCodeIdx > -1 ? args[accountCodeIdx + 1] : null;

if (APPLY) {
  if (!ACCOUNT_CODE) { console.error('--apply requires --account-code <code> (confirmed by Standard Ledger)'); process.exit(2); }
  if (!CONFIRM)      { console.error('--apply requires --confirm (irreversible — adds 27 credit notes to Xero)'); process.exit(2); }
}

// --- supabase ---
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing Supabase env vars'); process.exit(2); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- helpers ---
function log(msg) { console.log(msg); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchUnpaidAleishaInvoices() {
  const { data, error } = await supabase
    .from('xero_invoices')
    .select('xero_id, invoice_number, date, total, amount_due, status, type, line_items')
    .eq('contact_id', ALEISHA_CONTACT_ID)
    .gt('amount_due', 0)
    .order('date');
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data.map(inv => ({
    xero_id: inv.xero_id,
    invoice_number: inv.invoice_number,
    date: inv.date,
    total: Number(inv.total),
    amount_due: Number(inv.amount_due),
    status: inv.status,
    type: inv.type,
    tax_type: inv.line_items?.[0]?.tax_type || null,
  }));
}

function buildCreditNotePayload(invoice, accountCode) {
  return {
    Type: 'ACCRECCREDIT',
    Contact: { ContactID: ALEISHA_CONTACT_ID },
    Date: new Date().toISOString().slice(0, 10),
    Status: 'AUTHORISED',
    Reference: `Bad debt write-off ${invoice.invoice_number} (FY26)`,
    LineItems: [{
      Description: `Bad debt write-off for invoice ${invoice.invoice_number} (Aleisha J Keating, FY26 sole trader, irrecoverable)`,
      Quantity: 1,
      UnitAmount: invoice.total,
      AccountCode: accountCode,
      TaxType: invoice.tax_type,
    }],
  };
}

function buildAllocationPayload(invoice) {
  return {
    Allocations: [{
      AppliedAmount: invoice.total,
      Invoice: { InvoiceID: invoice.xero_id },
      Date: new Date().toISOString().slice(0, 10),
    }],
  };
}

// --- main ---
async function main() {
  log('================================================================');
  log(`Aleisha J Keating bad-debt write-off — FY26 (${APPLY ? 'APPLY' : 'DRY-RUN'})`);
  log('================================================================');
  log('');

  // 1. Re-verify state
  log('Step 1: Re-fetching unpaid invoices from Supabase mirror of Xero...');
  const invoices = await fetchUnpaidAleishaInvoices();
  const totalAUD = invoices.reduce((s, i) => s + i.amount_due, 0);
  log(`  Found ${invoices.length} invoices · total amount_due $${totalAUD.toLocaleString()}`);

  if (invoices.length !== EXPECTED_TOTAL_INVOICES) {
    log(`  WARNING: expected ${EXPECTED_TOTAL_INVOICES} invoices, found ${invoices.length}. State has drifted since handoff. Inspect before --apply.`);
  }
  if (Math.abs(totalAUD - EXPECTED_TOTAL_AUD) > 1) {
    log(`  WARNING: expected total $${EXPECTED_TOTAL_AUD}, found $${totalAUD}. State has drifted.`);
  }

  // 2. Tax-type breakdown
  const exemptCount = invoices.filter(i => i.tax_type === 'EXEMPTOUTPUT').length;
  const inputTaxedCount = invoices.filter(i => i.tax_type === 'INPUTTAXED').length;
  const otherCount = invoices.length - exemptCount - inputTaxedCount;
  log('');
  log('Step 2: Tax-type breakdown:');
  log(`  EXEMPTOUTPUT: ${exemptCount}`);
  log(`  INPUTTAXED:   ${inputTaxedCount}`);
  if (otherCount > 0) log(`  OTHER:        ${otherCount} (UNEXPECTED — inspect before --apply)`);

  // 3. Plan
  log('');
  log('Step 3: Planned actions per invoice:');
  log(`  - Create ACCRECCREDIT for $${PER_INVOICE_AMOUNT} matching tax type`);
  log(`  - Account code: ${ACCOUNT_CODE || '<NOT SET — pass --account-code from Standard Ledger>'}`);
  log(`  - Allocate credit to invoice (clears amount_due)`);
  log('');
  invoices.slice(0, 3).forEach(inv => log(`    ${inv.invoice_number}  ${inv.date}  $${inv.amount_due}  ${inv.tax_type}  → CR + alloc`));
  if (invoices.length > 3) log(`    ... and ${invoices.length - 3} more`);

  if (!APPLY) {
    log('');
    log('Dry-run only. Re-run with --apply --account-code <code> --confirm to execute.');
    log('Per-invoice rate: ~2.2 calls (CR create + allocation), ~1.1s each → total ~60s.');
    return;
  }

  // 4. Execute
  log('');
  log('Step 4: Executing write-off via Xero API...');
  const xero = await createXeroClient(supabase);

  const audit = { started_at: new Date().toISOString(), account_code: ACCOUNT_CODE, results: [] };
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const inv of invoices) {
    const result = { invoice_number: inv.invoice_number, xero_id: inv.xero_id, action: null, credit_note_id: null, error: null };

    try {
      // Re-verify status from Xero before each write
      const fresh = await xero.get(`Invoices/${inv.xero_id}`);
      const freshInv = fresh.Invoices?.[0];
      if (!freshInv) { result.action = 'skip'; result.error = 'invoice not found in Xero'; skipCount++; }
      else if (freshInv.Status !== 'AUTHORISED') { result.action = 'skip'; result.error = `status is ${freshInv.Status}, not AUTHORISED`; skipCount++; }
      else if (Number(freshInv.AmountDue) < inv.total - 0.01) { result.action = 'skip'; result.error = `amount_due is ${freshInv.AmountDue}, not full ${inv.total}`; skipCount++; }
      else {
        await sleep(RATE_LIMIT_MS);
        const cnPayload = { CreditNotes: [buildCreditNotePayload(inv, ACCOUNT_CODE)] };
        const cnResp = await xero.post('CreditNotes', cnPayload);
        const cn = cnResp.CreditNotes?.[0];
        if (!cn?.CreditNoteID) throw new Error('credit note creation returned no ID');
        result.credit_note_id = cn.CreditNoteID;

        await sleep(RATE_LIMIT_MS);
        await xero.post(`CreditNotes/${cn.CreditNoteID}/Allocations`, buildAllocationPayload(inv));
        result.action = 'success';
        successCount++;
      }
    } catch (e) {
      result.action = 'fail';
      result.error = e.message;
      failCount++;
    }

    audit.results.push(result);
    log(`  ${inv.invoice_number}  ${result.action.padEnd(7)}  ${result.error || result.credit_note_id || ''}`);
  }

  // 5. Save audit log
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(process.cwd(), 'scripts/output');
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `aleisha-writeoff-${ts}.json`);
  audit.finished_at = new Date().toISOString();
  audit.summary = { success: successCount, skip: skipCount, fail: failCount, total_aud: successCount * PER_INVOICE_AMOUNT };
  writeFileSync(outPath, JSON.stringify(audit, null, 2));

  log('');
  log('================================================================');
  log(`Done. success=${successCount} skip=${skipCount} fail=${failCount} → $${audit.summary.total_aud} written off`);
  log(`Audit log: ${outPath}`);
  log('');
  log('Next: post a contact-level file note in Xero on Aleisha\'s record:');
  log(`  "Bad debt written off in FY26 — all ${successCount} of 27 invoices INV-0238 to INV-0307. Genuine irrecoverability confirmed ${new Date().toISOString().slice(0, 10)}. No GST credit applicable."`);
  log('================================================================');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
