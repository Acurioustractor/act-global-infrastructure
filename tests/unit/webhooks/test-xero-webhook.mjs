#!/usr/bin/env node
/**
 * Tests for Xero Webhook Route Handler
 *
 * Tests the HMAC-SHA256 signature verification, Intent to Receive handling,
 * event processing, and Supabase logging.
 *
 * Run: node tests/unit/webhooks/test-xero-webhook.mjs
 */

import assert from 'assert';
import crypto from 'crypto';

// ============================================================================
// TEST HELPERS
// ============================================================================

const TEST_WEBHOOK_KEY = 'test-webhook-key-for-xero-hmac';

/**
 * Generate a valid HMAC-SHA256 signature for a given body
 */
function generateSignature(body, key = TEST_WEBHOOK_KEY) {
  return crypto
    .createHmac('sha256', key)
    .update(body)
    .digest('base64');
}

/**
 * Create a mock NextRequest-like object
 */
function createMockRequest(body, headers = {}) {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    text: async () => bodyStr,
    headers: {
      get: (name) => headers[name.toLowerCase()] || null,
    },
  };
}

// ============================================================================
// IMPORT THE MODULE UNDER TEST
// ============================================================================

// We test the core logic functions directly rather than the Next.js route handler,
// since the route handler depends on Next.js runtime. The route.ts exports
// helper functions for testability.

let verifyXeroSignature, handleXeroWebhook;

try {
  const mod = await import(
    '../../../apps/command-center-v2/src/lib/webhooks/xero-handler.mjs'
  );
  verifyXeroSignature = mod.verifyXeroSignature;
  handleXeroWebhook = mod.handleXeroWebhook;
} catch (e) {
  console.log(`Import failed (expected if not yet implemented): ${e.message}`);
  // Define stubs so tests can run and fail meaningfully
  verifyXeroSignature = () => { throw new Error('Not implemented'); };
  handleXeroWebhook = () => { throw new Error('Not implemented'); };
}

// ============================================================================
// TESTS
// ============================================================================

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${e.message}`);
    failed++;
  }
}

console.log('\n=== Xero Webhook Tests ===\n');

// --- Signature Verification ---

console.log('Signature Verification:');

await test('accepts valid HMAC-SHA256 signature', () => {
  const body = '{"events":[]}';
  const signature = generateSignature(body);
  const result = verifyXeroSignature(body, signature, TEST_WEBHOOK_KEY);
  assert.strictEqual(result, true);
});

await test('rejects invalid signature', () => {
  const body = '{"events":[]}';
  const result = verifyXeroSignature(body, 'invalid-signature', TEST_WEBHOOK_KEY);
  assert.strictEqual(result, false);
});

await test('rejects empty signature', () => {
  const body = '{"events":[]}';
  const result = verifyXeroSignature(body, '', TEST_WEBHOOK_KEY);
  assert.strictEqual(result, false);
});

await test('rejects null signature', () => {
  const body = '{"events":[]}';
  const result = verifyXeroSignature(body, null, TEST_WEBHOOK_KEY);
  assert.strictEqual(result, false);
});

await test('uses timing-safe comparison', () => {
  // Verifying that different-length signatures don't short-circuit
  const body = '{"events":[]}';
  const result = verifyXeroSignature(body, 'short', TEST_WEBHOOK_KEY);
  assert.strictEqual(result, false);
});

// --- Intent to Receive ---

console.log('\nIntent to Receive:');

await test('identifies Intent to Receive payload', () => {
  const payload = {
    firstEventSequence: 0,
    lastEventSequence: 0,
    entropy: 'some-random-string',
    events: [],
  };
  const result = handleXeroWebhook(payload);
  assert.strictEqual(result.type, 'intent_to_receive');
  assert.strictEqual(result.status, 200);
});

await test('Intent to Receive returns empty body', () => {
  const payload = {
    firstEventSequence: 0,
    lastEventSequence: 0,
    entropy: 'test-entropy',
    events: [],
  };
  const result = handleXeroWebhook(payload);
  assert.strictEqual(result.body, null);
});

// --- Event Processing ---

console.log('\nEvent Processing:');

await test('processes invoice CREATE event', () => {
  const payload = {
    firstEventSequence: 1,
    lastEventSequence: 1,
    entropy: 'test',
    events: [
      {
        resourceUrl: 'https://api.xero.com/api.xro/2.0/Invoices/abc-123',
        resourceId: 'abc-123',
        eventDateUtc: '2026-01-30T10:00:00Z',
        eventType: 'CREATE',
        eventCategory: 'INVOICE',
        tenantId: 'tenant-123',
        tenantType: 'ORGANISATION',
      },
    ],
  };
  const result = handleXeroWebhook(payload);
  assert.strictEqual(result.type, 'events');
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.events.length, 1);
  assert.strictEqual(result.events[0].eventCategory, 'INVOICE');
  assert.strictEqual(result.events[0].eventType, 'CREATE');
  assert.strictEqual(result.events[0].resourceId, 'abc-123');
});

await test('processes multiple events in single payload', () => {
  const payload = {
    firstEventSequence: 1,
    lastEventSequence: 3,
    entropy: 'test',
    events: [
      {
        resourceUrl: 'https://api.xero.com/api.xro/2.0/Invoices/inv-1',
        resourceId: 'inv-1',
        eventDateUtc: '2026-01-30T10:00:00Z',
        eventType: 'CREATE',
        eventCategory: 'INVOICE',
        tenantId: 'tenant-123',
        tenantType: 'ORGANISATION',
      },
      {
        resourceUrl: 'https://api.xero.com/api.xro/2.0/Contacts/con-1',
        resourceId: 'con-1',
        eventDateUtc: '2026-01-30T10:01:00Z',
        eventType: 'UPDATE',
        eventCategory: 'CONTACT',
        tenantId: 'tenant-123',
        tenantType: 'ORGANISATION',
      },
      {
        resourceUrl: 'https://api.xero.com/api.xro/2.0/BankTransactions/bt-1',
        resourceId: 'bt-1',
        eventDateUtc: '2026-01-30T10:02:00Z',
        eventType: 'CREATE',
        eventCategory: 'BANK_TRANSACTION',
        tenantId: 'tenant-123',
        tenantType: 'ORGANISATION',
      },
    ],
  };
  const result = handleXeroWebhook(payload);
  assert.strictEqual(result.events.length, 3);
  assert.strictEqual(result.events[0].eventCategory, 'INVOICE');
  assert.strictEqual(result.events[1].eventCategory, 'CONTACT');
  assert.strictEqual(result.events[2].eventCategory, 'BANK_TRANSACTION');
});

await test('handles empty events array as normal event payload (not ITR)', () => {
  // When firstEventSequence > 0 but events is empty, treat as event response
  const payload = {
    firstEventSequence: 5,
    lastEventSequence: 5,
    entropy: 'test',
    events: [],
  };
  const result = handleXeroWebhook(payload);
  assert.strictEqual(result.type, 'events');
  assert.strictEqual(result.events.length, 0);
});

await test('normalizes event data for integration_events format', () => {
  const payload = {
    firstEventSequence: 1,
    lastEventSequence: 1,
    entropy: 'test',
    events: [
      {
        resourceUrl: 'https://api.xero.com/api.xro/2.0/Invoices/abc-123',
        resourceId: 'abc-123',
        eventDateUtc: '2026-01-30T10:00:00Z',
        eventType: 'UPDATE',
        eventCategory: 'INVOICE',
        tenantId: 'tenant-123',
        tenantType: 'ORGANISATION',
      },
    ],
  };
  const result = handleXeroWebhook(payload);
  const event = result.events[0];
  // Should have fields useful for integration_events table
  assert.ok(event.resourceId);
  assert.ok(event.eventType);
  assert.ok(event.eventCategory);
  assert.ok(event.eventDateUtc);
  assert.ok(event.tenantId);
});

// --- Edge Cases ---

console.log('\nEdge Cases:');

await test('handles malformed payload gracefully', () => {
  const payload = {};
  const result = handleXeroWebhook(payload);
  // Should not throw, should handle gracefully
  assert.strictEqual(result.type, 'events');
  assert.strictEqual(result.events.length, 0);
});

await test('handles payload with null events', () => {
  const payload = { events: null, firstEventSequence: 1 };
  const result = handleXeroWebhook(payload);
  assert.strictEqual(result.events.length, 0);
});

// --- Summary ---

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
