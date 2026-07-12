#!/usr/bin/env node
/**
 * SL clean-up — apply VERIFIED deep-hunt receipt recoveries to verdicts.json.
 * These were confirmed by sl-cleanup-confirm-receipt.mjs (vendor-exact + invoice PDF or
 * amount-tie-in-body). Sets receipt_status to GMAIL_FOUND / GMAIL_LEAD and appends the
 * receipt location to your_comment so the regenerated CSV tells SL where the receipt is.
 * Local-file edit only — no Xero writes. Idempotent (won't double-append). READ-ONLY to Xero.
 *
 * Usage: node scripts/sl-cleanup-apply-receipts.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const VERD = path.join(process.cwd(), 'thoughts/shared/handoffs/sl-cleanup/verdicts.json');
const MARK = ' · RECEIPT FOUND:';

// VERIFIED recoveries (see thoughts/shared/handoffs/sl-cleanup/gmail-deephunt.json + confirm step)
const RECOVERIES = {
  47: { status: 'GMAIL_FOUND', gst_treatment: 'GST on Expenses',
        detail: " RECEIPT FOUND: matching tax invoice located — 'Carla Furnishers Pty Ltd : Invoice# 26-00000151' (PDF 26-00000151.pdf) in nicholas@act.place, 28 Jan 2026 (also attached to Adrian Venturin's 'Goods Project' thread). This is the tax invoice for the $4,816 card charge — GST is now claimable. Forwarding to SL." },
  44: { status: 'GMAIL_FOUND',
        detail: " RECEIPT FOUND: Colyton Hotel booking #5406236 in nicholas@act.place, amount $436.24 confirmed in the email body (plus a forwarded Qantas Hotels confirmation QBQ4Y39HW). Forwarding to SL." },
  64: { status: 'GMAIL_FOUND',
        detail: " RECEIPT FOUND: Colemans Printing tax invoice 'Invoice-CA120130.pdf' from alice.office@colemanprint.com.au in benjamin@act.place, 20 May 2026. Forwarding to SL." },
  39: { status: 'GMAIL_FOUND',
        detail: " RECEIPT FOUND: Audible order receipt (donotreply@audible.com.au, 'your order is complete', $16.45 confirmed) in benjamin@act.place — so a receipt does exist. The remaining call is still office-expense vs Drawings (an audiobook sub is presumptively personal)." },
  45: { status: 'GMAIL_FOUND',
        detail: " RECEIPT FOUND: Audible order receipt (donotreply@audible.com.au, $16.45 confirmed) in benjamin@act.place. Forwarding to SL." },
  53: { status: 'GMAIL_LEAD',
        detail: " RECEIPT FOUND (lead): booking confirmation for Tullah Lakeside Lodge in nicholas@act.place (25 Jan 2026) — the tax-invoice/folio amount isn't in the email body; will confirm the $374.07 on forward." },
};

const verdicts = JSON.parse(readFileSync(VERD, 'utf8'));
let applied = 0, skipped = 0;
for (const v of verdicts) {
  const rec = RECOVERIES[v.i];
  if (!rec) continue;
  if ((v.your_comment || '').includes(MARK.trim())) { skipped++; continue; }
  v.receipt_status = rec.status;
  if (rec.gst_treatment) v.gst_treatment = rec.gst_treatment;
  v.your_comment = (v.your_comment || '').trimEnd() + rec.detail;
  v.receipt_recovered = true;
  applied++;
  console.log(`#${v.i} → ${rec.status}`);
}
writeFileSync(VERD, JSON.stringify(verdicts, null, 2));
console.log(`\nApplied ${applied}, already-applied ${skipped}. verdicts.json updated.`);
