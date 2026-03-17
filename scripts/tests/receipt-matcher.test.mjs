/**
 * Unit tests for receipt-matcher.mjs
 *
 * Tests pure scoring functions without Supabase dependency.
 * Run: node --test scripts/tests/receipt-matcher.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import the module — we need the calculateMatchScore export
// The module creates a Supabase client at import time, but it's null without env vars
// (which is fine — we only test pure functions)
import { calculateMatchScore } from '../lib/receipt-matcher.mjs';

// ============================================================================
// HELPERS
// ============================================================================

function makeReceipt(overrides = {}) {
  return {
    id: 'test-receipt',
    vendor_name: 'Qantas Airways',
    amount: 580.00,
    transaction_date: '2026-03-10',
    ...overrides,
  };
}

function makeEmail(overrides = {}) {
  return {
    id: 'test-email',
    subject: 'Your Qantas booking confirmation',
    content_preview: 'Total: $580.00 AUD',
    source_id: 'bookings@qantas.com',
    occurred_at: '2026-03-10T10:00:00Z',
    ...overrides,
  };
}

// ============================================================================
// VENDOR MATCHING
// ============================================================================

describe('Vendor matching', () => {
  it('scores full vendor name match in subject', () => {
    const result = calculateMatchScore(
      makeReceipt({ vendor_name: 'Qantas Airways' }),
      makeEmail({ subject: 'Your Qantas booking confirmation', source_id: '' }),
    );
    assert.ok(result.breakdown.vendor.score > 0, 'Should have positive vendor score');
    assert.ok(result.breakdown.vendor.reason.includes('qantas'));
  });

  it('scores vendor match in sender email', () => {
    const result = calculateMatchScore(
      makeReceipt({ vendor_name: 'Uber' }),
      makeEmail({
        subject: 'Your trip receipt',
        source_id: 'noreply@uber.com',
        content_preview: '',
      }),
    );
    assert.ok(result.breakdown.vendor.score > 0, 'Sender match should score');
  });

  it('scores zero for unrelated vendor', () => {
    const result = calculateMatchScore(
      makeReceipt({ vendor_name: 'Telstra' }),
      makeEmail({
        subject: 'Your Qantas booking',
        source_id: 'bookings@qantas.com',
        content_preview: '',
      }),
    );
    assert.equal(result.breakdown.vendor.score, 0);
  });

  it('strips common suffixes (Pty, Ltd, Limited)', () => {
    const result = calculateMatchScore(
      makeReceipt({ vendor_name: 'Kennards Hire Pty Ltd' }),
      makeEmail({
        subject: 'Kennards Hire booking receipt',
        source_id: 'noreply@kennards.com.au',
        content_preview: '',
      }),
    );
    assert.ok(result.breakdown.vendor.score > 0, 'Should match after stripping Pty Ltd');
  });

  it('handles null vendor name gracefully', () => {
    const result = calculateMatchScore(
      makeReceipt({ vendor_name: null }),
      makeEmail(),
    );
    assert.equal(result.breakdown.vendor.score, 0);
    assert.ok(result.breakdown.vendor.reason.includes('No vendor'));
  });

  it('handles empty vendor name gracefully', () => {
    const result = calculateMatchScore(
      makeReceipt({ vendor_name: '' }),
      makeEmail(),
    );
    assert.equal(result.breakdown.vendor.score, 0);
  });
});

// ============================================================================
// AMOUNT MATCHING
// ============================================================================

describe('Amount matching', () => {
  it('scores exact amount match ($580.00)', () => {
    const result = calculateMatchScore(
      makeReceipt({ amount: 580.00 }),
      makeEmail({ content_preview: 'Total: $580.00' }),
    );
    assert.ok(result.breakdown.amount.score > 0, 'Exact match should score');
    assert.ok(result.breakdown.amount.reason.includes('exact'));
  });

  it('scores amount within 10% tolerance', () => {
    // $580 ±10% = $522–$638, so $600 should match
    const result = calculateMatchScore(
      makeReceipt({ amount: 580.00 }),
      makeEmail({ content_preview: 'Total: $600.00' }),
    );
    assert.ok(result.breakdown.amount.score > 0, 'Within tolerance should score');
  });

  it('rejects amount outside 10% tolerance', () => {
    // $580 ±10% = $522–$638, so $700 should NOT match
    const result = calculateMatchScore(
      makeReceipt({ amount: 580.00 }),
      makeEmail({ content_preview: 'Total: $700.00' }),
    );
    assert.equal(result.breakdown.amount.score, 0);
  });

  it('extracts AUD format amounts', () => {
    const result = calculateMatchScore(
      makeReceipt({ amount: 44.62 }),
      makeEmail({ content_preview: 'Charged AUD 44.62 to your card' }),
    );
    assert.ok(result.breakdown.amount.score > 0, 'AUD format should match');
  });

  it('extracts amounts with commas ($1,234.56)', () => {
    const result = calculateMatchScore(
      makeReceipt({ amount: 1234.56 }),
      makeEmail({ content_preview: 'Your payment of $1,234.56 was processed' }),
    );
    assert.ok(result.breakdown.amount.score > 0, 'Comma-separated amount should match');
  });

  it('handles null amount', () => {
    const result = calculateMatchScore(
      makeReceipt({ amount: null }),
      makeEmail(),
    );
    assert.equal(result.breakdown.amount.score, 0);
  });

  it('handles email with no amounts', () => {
    const result = calculateMatchScore(
      makeReceipt({ amount: 100 }),
      makeEmail({ subject: 'Your booking', content_preview: 'Confirmed' }),
    );
    assert.equal(result.breakdown.amount.score, 0);
  });

  it('picks closest amount when multiple in email', () => {
    const result = calculateMatchScore(
      makeReceipt({ amount: 29.99 }),
      makeEmail({ content_preview: 'Items: $9.99, $19.99. Total: $29.99' }),
    );
    assert.ok(result.breakdown.amount.score > 0);
    assert.equal(result.breakdown.amount.matchedAmount, 29.99);
  });
});

// ============================================================================
// DATE MATCHING
// ============================================================================

describe('Date matching', () => {
  it('gives full score for same-day match', () => {
    const result = calculateMatchScore(
      makeReceipt({ transaction_date: '2026-03-10' }),
      makeEmail({ occurred_at: '2026-03-10T14:00:00Z' }),
    );
    assert.ok(result.breakdown.date.score > 0, 'Same day should score');
    assert.ok(result.breakdown.date.reason.includes('Same day'));
  });

  it('scores 3 days apart (within 7-day window)', () => {
    const result = calculateMatchScore(
      makeReceipt({ transaction_date: '2026-03-10' }),
      makeEmail({ occurred_at: '2026-03-13T10:00:00Z' }),
    );
    assert.ok(result.breakdown.date.score > 0, '3 days should score');
    assert.equal(result.breakdown.date.daysDiff, 3);
  });

  it('scores zero for 8+ days apart', () => {
    const result = calculateMatchScore(
      makeReceipt({ transaction_date: '2026-03-10' }),
      makeEmail({ occurred_at: '2026-03-20T10:00:00Z' }),
    );
    assert.equal(result.breakdown.date.score, 0);
  });

  it('same-day score > 3-day score', () => {
    const receipt = makeReceipt({ transaction_date: '2026-03-10' });
    const sameDay = calculateMatchScore(
      receipt,
      makeEmail({ occurred_at: '2026-03-10T14:00:00Z' }),
    );
    const threeDays = calculateMatchScore(
      receipt,
      makeEmail({ occurred_at: '2026-03-13T14:00:00Z' }),
    );
    assert.ok(sameDay.breakdown.date.score > threeDays.breakdown.date.score);
  });

  it('handles cross-month matching', () => {
    const result = calculateMatchScore(
      makeReceipt({ transaction_date: '2026-02-28' }),
      makeEmail({ occurred_at: '2026-03-02T10:00:00Z' }),
    );
    assert.ok(result.breakdown.date.score > 0, 'Cross-month within 7 days should score');
  });

  it('handles missing transaction date', () => {
    const result = calculateMatchScore(
      makeReceipt({ transaction_date: null }),
      makeEmail(),
    );
    assert.equal(result.breakdown.date.score, 0);
  });

  it('handles missing email date', () => {
    const result = calculateMatchScore(
      makeReceipt(),
      makeEmail({ occurred_at: null }),
    );
    assert.equal(result.breakdown.date.score, 0);
  });
});

// ============================================================================
// KEYWORD SCORING
// ============================================================================

describe('Keyword scoring', () => {
  it('boosts for strong receipt keywords (tax invoice)', () => {
    const result = calculateMatchScore(
      makeReceipt(),
      makeEmail({ subject: 'Your tax invoice from Qantas' }),
    );
    assert.ok(result.breakdown.keywords.score > 0, 'Strong keyword should boost');
  });

  it('boosts for regular keywords (receipt)', () => {
    const result = calculateMatchScore(
      makeReceipt(),
      makeEmail({ subject: 'Qantas receipt' }),
    );
    assert.ok(result.breakdown.keywords.score > 0);
  });

  it('strong keywords score higher than regular', () => {
    const receipt = makeReceipt();
    const strong = calculateMatchScore(
      receipt,
      makeEmail({ subject: 'Your tax invoice', content_preview: '' }),
    );
    const regular = calculateMatchScore(
      receipt,
      makeEmail({ subject: 'Your statement', content_preview: '' }),
    );
    assert.ok(strong.breakdown.keywords.score >= regular.breakdown.keywords.score);
  });

  it('no keywords = zero score', () => {
    const result = calculateMatchScore(
      makeReceipt(),
      makeEmail({ subject: 'Hello there', content_preview: 'Some random email' }),
    );
    assert.equal(result.breakdown.keywords.score, 0);
  });
});

// ============================================================================
// TOTAL SCORE COMPOSITION
// ============================================================================

describe('Total score', () => {
  it('max possible score is 100', () => {
    const result = calculateMatchScore(makeReceipt(), makeEmail());
    assert.equal(result.maxScore, 100);
  });

  it('perfect match scores near 100', () => {
    const result = calculateMatchScore(
      makeReceipt({ vendor_name: 'Qantas', amount: 580.00, transaction_date: '2026-03-10' }),
      makeEmail({
        subject: 'Your Qantas tax invoice',
        content_preview: 'Total: $580.00',
        source_id: 'billing@qantas.com',
        occurred_at: '2026-03-10T10:00:00Z',
      }),
    );
    assert.ok(result.totalScore >= 80, `Expected >=80, got ${result.totalScore}`);
    assert.ok(result.confidence >= 80);
  });

  it('completely unrelated email scores near 0', () => {
    const result = calculateMatchScore(
      makeReceipt({ vendor_name: 'Telstra', amount: 99.00, transaction_date: '2026-01-15' }),
      makeEmail({
        subject: 'Newsletter from Acme Corp',
        content_preview: 'Check out our latest offers',
        source_id: 'marketing@acme.com',
        occurred_at: '2026-03-10T10:00:00Z',
      }),
    );
    assert.ok(result.totalScore < 10, `Expected <10, got ${result.totalScore}`);
  });

  it('reasons array excludes "No" entries', () => {
    const result = calculateMatchScore(
      makeReceipt({ vendor_name: 'Qantas', amount: null }),
      makeEmail({ subject: 'Qantas receipt' }),
    );
    // Reasons should not include "No transaction amount" etc.
    for (const reason of result.reasons) {
      assert.ok(!reason.startsWith('No '), `Reason "${reason}" should be filtered`);
    }
  });
});
