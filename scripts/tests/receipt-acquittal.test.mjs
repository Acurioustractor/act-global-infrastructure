// Fixture tests for the receipt-acquittal strict auto-link bar + GST estimate.
// No env, no network. Run: node --test scripts/tests/receipt-acquittal.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAutoLink, vendorToken, gstAtRiskEstimate } from '../lib/receipt-acquittal-lib.mjs';

// A line that SHOULD auto-link: exact $, sole candidate, high confidence, vendor token in receipt.
const okGap = { amount: -129.78, payee: 'KIOSK BUDAPEST BUDAPEST', best_document_id: 'doc-1', best_confidence: 0.91, best_vendor_name: 'KIOSK', candidate_count: 1 };
const okDoc = { amount_total: 129.78, vendor_name: 'KIOSK', ocr_text: 'kiosk budapest receipt' };

test('auto-links the dead-obvious match (exact $, token, sole candidate, confident)', () => {
  const r = classifyAutoLink(okGap, okDoc);
  assert.equal(r.autoLink, true, r.reason);
});

test('REFUSES to auto-link when there are multiple candidates', () => {
  const r = classifyAutoLink({ ...okGap, candidate_count: 5 }, okDoc);
  assert.equal(r.autoLink, false);
  assert.match(r.reason, /candidates/);
});

test('REFUSES when the amount is off by even a cent', () => {
  const r = classifyAutoLink(okGap, { ...okDoc, amount_total: 129.79 });
  assert.equal(r.autoLink, false);
  assert.match(r.reason, /amount not exact/);
});

test('REFUSES when confidence is below the bar', () => {
  const r = classifyAutoLink({ ...okGap, best_confidence: 0.6 }, okDoc);
  assert.equal(r.autoLink, false);
  assert.match(r.reason, /confidence/);
});

test('REFUSES when the vendor token is not in the receipt (wrong receipt, right amount)', () => {
  const r = classifyAutoLink(okGap, { amount_total: 129.78, vendor_name: 'WOOLWORTHS', ocr_text: 'groceries' });
  assert.equal(r.autoLink, false);
  assert.match(r.reason, /token/);
});

test('REFUSES when there is no ingested candidate at all', () => {
  const r = classifyAutoLink({ ...okGap, best_document_id: null }, null);
  assert.equal(r.autoLink, false);
  assert.match(r.reason, /no ingested candidate/);
});

test('vendorToken picks the strongest token, dropping generic words', () => {
  assert.equal(vendorToken('KIOSK BUDAPEST BUDAPEST'), 'budapest'); // longest meaningful token (8 > 5)
  assert.equal(vendorToken('THE STORE PTY LTD'), null);            // all generic → none
  assert.equal(vendorToken('AIRTASKER HAYMARKET'), 'airtasker');   // tie on length → first (the merchant)
});

test('gstAtRiskEstimate divides GST-inclusive totals by 11', () => {
  assert.equal(gstAtRiskEstimate([110, 22]), 12);        // 10 + 2
  assert.equal(gstAtRiskEstimate([-129.78]).toFixed(2), '11.80');
  assert.equal(gstAtRiskEstimate([]), 0);
});
