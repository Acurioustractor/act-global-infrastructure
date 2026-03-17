/**
 * Unit tests for receipt-classifier.mjs
 *
 * Tests isLikelyReceipt, extractAmount, extractReceiptFromHtml.
 * Run: node --test scripts/tests/receipt-classifier.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isLikelyReceipt, extractAmount, extractReceiptFromHtml } from '../lib/finance/receipt-classifier.mjs';

// ============================================================================
// isLikelyReceipt — POSITIVE CASES (should return true)
// ============================================================================

describe('isLikelyReceipt — receipts', () => {
  const receipts = [
    ['Your receipt from Uber', 'noreply@uber.com'],
    ['Tax invoice #12345', 'billing@aws.com'],
    ['Payment confirmed for March', 'payments@xero.com'],
    ['Order confirmation - #A1234', 'orders@amazon.com.au'],
    ['Your trip with Uber on 10 Mar', 'noreply@uber.com'],
    ['E-ticket confirmation', 'bookings@qantas.com'],
    ['Booking confirmation - Sydney', 'noreply@booking.com'],
    ['Your payment has been funded', 'no-reply@gofundme.com'],
    ['Your bill is ready', 'billing@telstra.com.au'],
    ['Your subscription renewal', 'billing@spotify.com'],
    ['Paid invoice INV-001', 'invoices@freshbooks.com'],
    ['Your purchase from Apple', 'no_reply@email.apple.com'],
  ];

  for (const [subject, from] of receipts) {
    it(`✓ "${subject}"`, () => {
      assert.equal(isLikelyReceipt(subject, from), true);
    });
  }
});

// ============================================================================
// isLikelyReceipt — NEGATIVE CASES (should return false)
// ============================================================================

describe('isLikelyReceipt — marketing', () => {
  const marketing = [
    ['Earn up to 10,000 bonus points!', 'offers@qantas.com'],
    ["Don't miss our biggest sale", 'marketing@store.com'],
    ['Last chance: 30% off flights', 'promo@jetstar.com'],
    ['Limited time offer inside', 'newsletter@brand.com'],
    ['Double points weekend is here', 'loyalty@hilton.com'],
    ['Newsletter: What\'s new this week', 'hello@company.com'],
    ['Webinar invite: How to grow', 'events@saas.com'],
    ['Save up to 50% on extras', 'offers@ahm.com.au'],
    ['Special offer just for you', 'marketing@store.com'],
    ['Your Pro trial ends tomorrow', 'noreply@cursor.sh'],
    ['Tips for better productivity', 'hello@notion.so'],
    ['Bid for an upgrade on your next flight', 'offers@qantas.com'],
  ];

  for (const [subject, from] of marketing) {
    it(`✗ "${subject}"`, () => {
      assert.equal(isLikelyReceipt(subject, from), false);
    });
  }
});

// ============================================================================
// isLikelyReceipt — FROM-ADDRESS DETECTION
// ============================================================================

describe('isLikelyReceipt — billing from-address', () => {
  it('detects noreply@ as receipt-like', () => {
    assert.equal(isLikelyReceipt('Your monthly update', 'noreply@company.com'), true);
  });

  it('detects receipts@ as receipt-like', () => {
    assert.equal(isLikelyReceipt('Transaction summary', 'receipts@square.com'), true);
  });

  it('detects billing@ as receipt-like', () => {
    assert.equal(isLikelyReceipt('Account notice', 'billing@aws.amazon.com'), true);
  });

  it('detects payments@ as receipt-like', () => {
    assert.equal(isLikelyReceipt('Payment update', 'payments@stripe.com'), true);
  });
});

// ============================================================================
// isLikelyReceipt — EDGE CASES
// ============================================================================

describe('isLikelyReceipt — edge cases', () => {
  it('handles null subject', () => {
    assert.equal(isLikelyReceipt(null, 'noreply@uber.com'), true);  // from-address match
  });

  it('handles null from', () => {
    assert.equal(isLikelyReceipt('Your receipt', null), true);  // subject match
  });

  it('handles both null', () => {
    assert.equal(isLikelyReceipt(null, null), false);
  });

  it('handles empty strings', () => {
    assert.equal(isLikelyReceipt('', ''), false);
  });

  it('is case-insensitive', () => {
    assert.equal(isLikelyReceipt('YOUR RECEIPT FROM UBER', 'NOREPLY@UBER.COM'), true);
  });

  it('ambiguous email (no strong signal) returns false', () => {
    assert.equal(isLikelyReceipt('Important update about your account', 'hello@company.com'), false);
  });

  it('marketing signal overrides billing from-address', () => {
    // Marketing subject + billing from → marketing wins (subject checked first)
    assert.equal(isLikelyReceipt("Don't miss our sale", 'billing@store.com'), false);
  });

  // Critical: receipt subject should always win regardless of from
  it('receipt subject beats any from-address', () => {
    assert.equal(isLikelyReceipt('Your receipt #12345', 'marketing@brand.com'), true);
  });
});

// ============================================================================
// extractAmount
// ============================================================================

describe('extractAmount', () => {
  it('extracts $29.00', () => {
    assert.equal(extractAmount('Your payment of $29.00 was processed'), 29.00);
  });

  it('extracts $1,234.56 with commas', () => {
    assert.equal(extractAmount('Total charged: $1,234.56'), 1234.56);
  });

  it('extracts AUD 44.62', () => {
    assert.equal(extractAmount('Charged AUD 44.62 to your card'), 44.62);
  });

  it('extracts A$99.99', () => {
    assert.equal(extractAmount('Price: A$99.99'), 99.99);
  });

  it('extracts Total: $580.00', () => {
    assert.equal(extractAmount('Total: $580.00'), 580.00);
  });

  it('extracts Amount: 250.00', () => {
    assert.equal(extractAmount('Amount: 250.00'), 250.00);
  });

  it('returns null for no amount', () => {
    assert.equal(extractAmount('Thank you for your booking'), null);
  });

  it('returns null for null input', () => {
    assert.equal(extractAmount(null), null);
  });

  it('returns null for empty string', () => {
    assert.equal(extractAmount(''), null);
  });

  it('rejects amounts >= $100,000', () => {
    assert.equal(extractAmount('Total: $150,000.00'), null);
  });

  it('prefers AUD format over bare dollar', () => {
    // AUD pattern is checked first
    const result = extractAmount('AUD 44.62 ($44.62)');
    assert.equal(result, 44.62);
  });
});

// ============================================================================
// extractReceiptFromHtml
// ============================================================================

describe('extractReceiptFromHtml', () => {
  it('extracts Total from HTML', () => {
    const html = '<div>Items: $10.00, $20.00</div><div>Total: $30.00</div>';
    const result = extractReceiptFromHtml(html);
    assert.equal(result.amount, 30.00);
  });

  it('extracts dollar amount from simple HTML', () => {
    const html = '<p>Your charge: $49.99</p>';
    const result = extractReceiptFromHtml(html);
    assert.equal(result.amount, 49.99);
  });

  it('extracts AUD from HTML', () => {
    const html = '<span>Amount charged: AUD 125.50</span>';
    const result = extractReceiptFromHtml(html);
    assert.equal(result.amount, 125.50);
  });

  it('returns null for null input', () => {
    assert.equal(extractReceiptFromHtml(null), null);
  });

  it('returns {amount: null} for HTML with no amounts', () => {
    const result = extractReceiptFromHtml('<p>Thank you for your order</p>');
    assert.equal(result.amount, null);
  });

  it('takes last Total match (total, not line items)', () => {
    const html = `
      <tr>Total: $15.00</tr>
      <tr>Total: $25.00</tr>
      <tr>Total: $40.00</tr>
    `;
    const result = extractReceiptFromHtml(html);
    // Takes the last "Total" match
    assert.equal(result.amount, 40.00);
  });

  it('handles comma-separated amounts in HTML', () => {
    const html = '<td>Total: $1,500.00</td>';
    const result = extractReceiptFromHtml(html);
    assert.equal(result.amount, 1500.00);
  });

  it('rejects amounts >= $100,000 in HTML', () => {
    const html = '<td>Total: $200,000.00</td>';
    const result = extractReceiptFromHtml(html);
    // Should not match $200,000
    assert.notEqual(result.amount, 200000);
  });

  it('handles Uber-style HTML receipt', () => {
    const html = `
      <table>
        <tr><td>UberX</td><td>$12.50</td></tr>
        <tr><td>Booking fee</td><td>$2.20</td></tr>
        <tr><td><b>Total</b></td><td><b>$14.70</b></td></tr>
      </table>
    `;
    const result = extractReceiptFromHtml(html);
    // Should get the Total line
    assert.equal(result.amount, 14.70);
  });
});
