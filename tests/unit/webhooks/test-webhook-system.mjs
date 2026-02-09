#!/usr/bin/env node
/**
 * Tests for Webhook System
 *
 * Tests the event bus, processor, and GHL webhook handler.
 * Run: npx tsx tests/unit/webhooks/test-webhook-system.mjs
 *
 * Uses mock Supabase client to test without DB dependency.
 */

import assert from 'assert';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOCK SUPABASE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Records of all inserts/upserts for assertions */
const mockDb = {
  inserts: [],
  upserts: [],
  reset() {
    this.inserts = [];
    this.upserts = [];
  }
};

function createMockSupabase(overrides = {}) {
  return {
    from: (table) => ({
      insert: (data) => {
        mockDb.inserts.push({ table, data });
        return {
          select: () => ({
            single: () => Promise.resolve({
              data: { id: 'mock-id-1', ...data },
              error: overrides.insertError || null
            })
          }),
          then: (resolve) => resolve({
            data: { id: 'mock-id-1', ...data },
            error: overrides.insertError || null
          })
        };
      },
      upsert: (data, opts) => {
        mockDb.upserts.push({ table, data, opts });
        return Promise.resolve({
          data: { id: 'mock-id-1', ...data },
          error: overrides.upsertError || null
        });
      },
      update: (data) => ({
        eq: (col, val) => {
          mockDb.inserts.push({ table, data, update: { col, val } });
          return Promise.resolve({
            data: { id: val, ...data },
            error: overrides.updateError || null
          });
        }
      })
    })
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let testsPassed = 0;
let testsFailed = 0;
const failures = [];

async function test(name, fn) {
  try {
    mockDb.reset();
    await fn();
    testsPassed++;
    console.log(`  PASS: ${name}`);
  } catch (err) {
    testsFailed++;
    failures.push({ name, error: err });
    console.log(`  FAIL: ${name}`);
    console.log(`        ${err.message}`);
  }
}

function describe(name, fn) {
  console.log(`\n${name}`);
  return fn();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EVENT BUS TESTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function testEventBus() {
  // Dynamic import to test the actual module
  const { createEventBus } = await import(
    '../../../apps/command-center-v2/src/lib/webhooks/event-bus.ts'
  );

  await describe('EventBus: emitIntegrationEvent', async () => {
    await test('inserts event into integration_events table', async () => {
      const mockSupa = createMockSupabase();
      const bus = createEventBus(mockSupa);

      const event = {
        source: 'ghl',
        event_type: 'contact.create',
        entity_type: 'contact',
        entity_id: 'abc-123',
        action: 'created',
        payload: { firstName: 'Test' },
        latency_ms: 42,
      };

      const result = await bus.emitIntegrationEvent(event);

      assert.ok(result.data, 'Should return data');
      assert.strictEqual(result.data.id, 'mock-id-1');

      const insert = mockDb.inserts.find(i => i.table === 'integration_events');
      assert.ok(insert, 'Should insert into integration_events');
      assert.strictEqual(insert.data.source, 'ghl');
      assert.strictEqual(insert.data.event_type, 'contact.create');
      assert.strictEqual(insert.data.entity_id, 'abc-123');
    });

    await test('includes processed_at timestamp', async () => {
      const mockSupa = createMockSupabase();
      const bus = createEventBus(mockSupa);

      await bus.emitIntegrationEvent({
        source: 'ghl',
        event_type: 'contact.update',
        entity_type: 'contact',
        entity_id: 'abc-123',
        action: 'updated',
      });

      const insert = mockDb.inserts.find(i => i.table === 'integration_events');
      assert.ok(insert.data.processed_at, 'Should include processed_at');
    });

    await test('returns error on insert failure', async () => {
      const mockSupa = createMockSupabase({ insertError: { message: 'DB error' } });
      const bus = createEventBus(mockSupa);

      const result = await bus.emitIntegrationEvent({
        source: 'ghl',
        event_type: 'contact.create',
        entity_type: 'contact',
        entity_id: 'abc-123',
        action: 'created',
      });

      assert.ok(result.error, 'Should return error');
    });
  });

  await describe('EventBus: logWebhookDelivery', async () => {
    await test('inserts delivery log with received status', async () => {
      const mockSupa = createMockSupabase();
      const bus = createEventBus(mockSupa);

      const result = await bus.logWebhookDelivery('ghl', 'contact.create', 'received', '{"test":true}');

      const insert = mockDb.inserts.find(i => i.table === 'webhook_delivery_log');
      assert.ok(insert, 'Should insert into webhook_delivery_log');
      assert.strictEqual(insert.data.source, 'ghl');
      assert.strictEqual(insert.data.status, 'received');
      assert.strictEqual(insert.data.raw_body, '{"test":true}');
    });

    await test('includes error when provided', async () => {
      const mockSupa = createMockSupabase();
      const bus = createEventBus(mockSupa);

      await bus.logWebhookDelivery('ghl', 'contact.create', 'failed', '{}', 'Something broke');

      const insert = mockDb.inserts.find(i => i.table === 'webhook_delivery_log');
      assert.strictEqual(insert.data.error, 'Something broke');
      assert.strictEqual(insert.data.status, 'failed');
    });
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROCESSOR TESTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function testProcessor() {
  const { createWebhookProcessor } = await import(
    '../../../apps/command-center-v2/src/lib/webhooks/processor.ts'
  );

  await describe('Processor: processWebhook', async () => {
    await test('calls handler with parsed event and returns success', async () => {
      const mockSupa = createMockSupabase();
      const processor = createWebhookProcessor(mockSupa);

      const body = JSON.stringify({
        type: 'contact.create',
        id: 'contact-1',
        firstName: 'Test'
      });

      let handlerCalled = false;
      const result = await processor.processWebhook('ghl', body, {}, async (event) => {
        handlerCalled = true;
        assert.strictEqual(event.source, 'ghl');
        assert.strictEqual(event.payload.type, 'contact.create');
        return {
          success: true,
          supabaseId: 'sb-1',
          action: 'created',
          latencyMs: 10,
        };
      });

      assert.ok(handlerCalled, 'Handler should be called');
      assert.strictEqual(result.status, 200);
      assert.ok(result.body.success);
    });

    await test('logs delivery as received then processed', async () => {
      const mockSupa = createMockSupabase();
      const processor = createWebhookProcessor(mockSupa);

      const body = JSON.stringify({ type: 'contact.update', id: 'c-1' });

      await processor.processWebhook('ghl', body, {}, async () => ({
        success: true,
        action: 'updated',
        latencyMs: 5,
      }));

      const deliveryLogs = mockDb.inserts.filter(i => i.table === 'webhook_delivery_log');
      assert.ok(deliveryLogs.length >= 1, 'Should log delivery');
      assert.strictEqual(deliveryLogs[0].data.status, 'received');
    });

    await test('emits integration event on success', async () => {
      const mockSupa = createMockSupabase();
      const processor = createWebhookProcessor(mockSupa);

      const body = JSON.stringify({ type: 'contact.create', id: 'c-2' });

      await processor.processWebhook('ghl', body, {}, async (event) => ({
        success: true,
        supabaseId: 'sb-2',
        action: 'created',
        latencyMs: 8,
      }));

      const integrationEvents = mockDb.inserts.filter(i => i.table === 'integration_events');
      assert.ok(integrationEvents.length >= 1, 'Should emit integration event');
      assert.strictEqual(integrationEvents[0].data.source, 'ghl');
      assert.strictEqual(integrationEvents[0].data.action, 'created');
    });

    await test('returns 500 and logs failure on handler error', async () => {
      const mockSupa = createMockSupabase();
      const processor = createWebhookProcessor(mockSupa);

      const body = JSON.stringify({ type: 'contact.create', id: 'c-3' });

      const result = await processor.processWebhook('ghl', body, {}, async () => {
        throw new Error('Handler exploded');
      });

      assert.strictEqual(result.status, 500);
      assert.strictEqual(result.body.success, false);
      assert.ok(result.body.error.includes('Handler exploded'));
    });

    await test('returns 400 on invalid JSON body', async () => {
      const mockSupa = createMockSupabase();
      const processor = createWebhookProcessor(mockSupa);

      const result = await processor.processWebhook('ghl', 'not json {{{', {}, async () => ({
        success: true,
        action: 'created',
        latencyMs: 0,
      }));

      assert.strictEqual(result.status, 400);
      assert.strictEqual(result.body.success, false);
    });
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GHL HANDLER TESTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function testGHLHandler() {
  const { handleGHLWebhook, BLOCKED_FIELDS_TO_GHL, transformGHLContact, transformGHLOpportunity } = await import(
    '../../../apps/command-center-v2/src/lib/webhooks/ghl-handler.ts'
  );

  await describe('GHL Handler: BLOCKED_FIELDS_TO_GHL', async () => {
    await test('contains all required blocked fields', async () => {
      const requiredFields = [
        'elder_consent',
        'sacred_knowledge',
        'sacred_knowledge_notes',
        'cultural_nation_details',
        'ocap_ownership',
        'ocap_control',
        'ocap_access',
        'ocap_possession',
        'detailed_consent_history',
        'elder_review_notes'
      ];

      for (const field of requiredFields) {
        assert.ok(
          BLOCKED_FIELDS_TO_GHL.includes(field),
          `BLOCKED_FIELDS_TO_GHL must include '${field}'`
        );
      }
    });

    await test('has exactly the expected number of blocked fields', async () => {
      assert.strictEqual(BLOCKED_FIELDS_TO_GHL.length, 10);
    });
  });

  await describe('GHL Handler: transformGHLContact', async () => {
    await test('transforms GHL contact payload for Supabase', async () => {
      const ghlPayload = {
        id: 'ghl-c-1',
        locationId: 'loc-1',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        phone: '+61400000000',
        company: 'ACT',
        tags: ['empathy-ledger', 'engagement:active', 'other-tag'],
        customFields: { field1: 'value1' },
        dateAdded: '2026-01-01T00:00:00Z',
        dateUpdated: '2026-01-15T00:00:00Z',
      };

      const result = transformGHLContact(ghlPayload);

      assert.strictEqual(result.ghl_id, 'ghl-c-1');
      assert.strictEqual(result.ghl_location_id, 'loc-1');
      assert.strictEqual(result.first_name, 'Alice');
      assert.strictEqual(result.last_name, 'Smith');
      assert.strictEqual(result.email, 'alice@example.com');
      assert.strictEqual(result.phone, '+61400000000');
      assert.strictEqual(result.company_name, 'ACT');
      assert.deepStrictEqual(result.projects, ['empathy-ledger']);
      assert.strictEqual(result.engagement_status, 'active');
      assert.strictEqual(result.sync_status, 'synced');
    });

    await test('defaults engagement_status to lead when no engagement tag', async () => {
      const result = transformGHLContact({
        id: 'ghl-c-2',
        locationId: 'loc-1',
        tags: [],
      });

      assert.strictEqual(result.engagement_status, 'lead');
    });

    await test('strips blocked fields from custom fields', async () => {
      const result = transformGHLContact({
        id: 'ghl-c-3',
        locationId: 'loc-1',
        customFields: {
          elder_consent: 'yes',
          sacred_knowledge: 'sensitive data',
          normal_field: 'keep this',
        },
        tags: [],
      });

      assert.strictEqual(result.custom_fields.normal_field, 'keep this');
      assert.strictEqual(result.custom_fields.elder_consent, undefined);
      assert.strictEqual(result.custom_fields.sacred_knowledge, undefined);
    });
  });

  await describe('GHL Handler: transformGHLOpportunity', async () => {
    await test('transforms GHL opportunity payload for Supabase', async () => {
      const ghlPayload = {
        id: 'ghl-o-1',
        contactId: 'ghl-c-1',
        pipelineId: 'pipe-1',
        pipelineStageId: 'stage-1',
        name: 'Test Opportunity',
        stageName: 'Qualified',
        status: 'open',
        monetaryValue: 5000,
        customFields: { key: 'val' },
        assignedTo: 'user-1',
        dateAdded: '2026-01-01T00:00:00Z',
        dateUpdated: '2026-01-15T00:00:00Z',
      };

      const result = transformGHLOpportunity(ghlPayload);

      assert.strictEqual(result.ghl_id, 'ghl-o-1');
      assert.strictEqual(result.ghl_contact_id, 'ghl-c-1');
      assert.strictEqual(result.ghl_pipeline_id, 'pipe-1');
      assert.strictEqual(result.name, 'Test Opportunity');
      assert.strictEqual(result.monetary_value, 5000);
      assert.strictEqual(result.status, 'open');
    });
  });

  await describe('GHL Handler: handleGHLWebhook', async () => {
    await test('handles contact.create event', async () => {
      const mockSupa = createMockSupabase();

      const event = {
        source: 'ghl',
        eventType: 'contact.create',
        entityType: 'contact',
        entityId: 'ghl-c-1',
        payload: {
          id: 'ghl-c-1',
          locationId: 'loc-1',
          firstName: 'Bob',
          lastName: 'Jones',
          email: 'bob@example.com',
          tags: [],
          customFields: {},
          dateAdded: '2026-01-01T00:00:00Z',
        },
        receivedAt: new Date().toISOString(),
      };

      const result = await handleGHLWebhook(event, mockSupa);

      assert.ok(result.success);
      assert.strictEqual(result.action, 'created');

      const upsert = mockDb.upserts.find(u => u.table === 'ghl_contacts');
      assert.ok(upsert, 'Should upsert to ghl_contacts');
      assert.strictEqual(upsert.data.first_name, 'Bob');
    });

    await test('handles contact.update event', async () => {
      const mockSupa = createMockSupabase();

      const event = {
        source: 'ghl',
        eventType: 'contact.update',
        entityType: 'contact',
        entityId: 'ghl-c-1',
        payload: {
          id: 'ghl-c-1',
          locationId: 'loc-1',
          firstName: 'Updated',
          tags: [],
          customFields: {},
        },
        receivedAt: new Date().toISOString(),
      };

      const result = await handleGHLWebhook(event, mockSupa);

      assert.ok(result.success);
      assert.strictEqual(result.action, 'updated');
    });

    await test('handles contact.delete event', async () => {
      const mockSupa = createMockSupabase();

      const event = {
        source: 'ghl',
        eventType: 'contact.delete',
        entityType: 'contact',
        entityId: 'ghl-c-1',
        payload: { id: 'ghl-c-1' },
        receivedAt: new Date().toISOString(),
      };

      const result = await handleGHLWebhook(event, mockSupa);

      assert.ok(result.success);
      assert.strictEqual(result.action, 'updated'); // soft delete via update
    });

    await test('handles opportunity.create event', async () => {
      const mockSupa = createMockSupabase();

      const event = {
        source: 'ghl',
        eventType: 'opportunity.create',
        entityType: 'opportunity',
        entityId: 'ghl-o-1',
        payload: {
          id: 'ghl-o-1',
          contactId: 'ghl-c-1',
          pipelineId: 'pipe-1',
          pipelineStageId: 'stage-1',
          name: 'New Opp',
          status: 'open',
          monetaryValue: 1000,
          dateAdded: '2026-01-01T00:00:00Z',
        },
        receivedAt: new Date().toISOString(),
      };

      const result = await handleGHLWebhook(event, mockSupa);

      assert.ok(result.success);
      assert.strictEqual(result.action, 'created');

      const upsert = mockDb.upserts.find(u => u.table === 'ghl_opportunities');
      assert.ok(upsert, 'Should upsert to ghl_opportunities');
    });

    await test('handles opportunity.status_change event', async () => {
      const mockSupa = createMockSupabase();

      const event = {
        source: 'ghl',
        eventType: 'opportunity.status_change',
        entityType: 'opportunity',
        entityId: 'ghl-o-1',
        payload: {
          id: 'ghl-o-1',
          contactId: 'ghl-c-1',
          pipelineId: 'pipe-1',
          pipelineStageId: 'stage-2',
          name: 'Status Change Opp',
          status: 'won',
          monetaryValue: 2000,
          dateAdded: '2026-01-01T00:00:00Z',
          dateUpdated: '2026-01-20T00:00:00Z',
        },
        receivedAt: new Date().toISOString(),
      };

      const result = await handleGHLWebhook(event, mockSupa);

      assert.ok(result.success);
      assert.strictEqual(result.action, 'updated');
    });

    await test('returns failed for unknown event type', async () => {
      const mockSupa = createMockSupabase();

      const event = {
        source: 'ghl',
        eventType: 'unknown.event',
        entityType: 'unknown',
        entityId: 'x',
        payload: {},
        receivedAt: new Date().toISOString(),
      };

      const result = await handleGHLWebhook(event, mockSupa);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.action, 'skipped');
    });

    await test('enforces cultural protocol - strips blocked fields from contact payload', async () => {
      const mockSupa = createMockSupabase();

      const event = {
        source: 'ghl',
        eventType: 'contact.create',
        entityType: 'contact',
        entityId: 'ghl-c-1',
        payload: {
          id: 'ghl-c-1',
          locationId: 'loc-1',
          firstName: 'Cultural',
          tags: [],
          customFields: {
            elder_consent: 'true',
            sacred_knowledge: 'secret info',
            ocap_ownership: 'community',
            safe_field: 'visible',
          },
          dateAdded: '2026-01-01T00:00:00Z',
        },
        receivedAt: new Date().toISOString(),
      };

      const result = await handleGHLWebhook(event, mockSupa);

      assert.ok(result.success);

      const upsert = mockDb.upserts.find(u => u.table === 'ghl_contacts');
      const customFields = upsert.data.custom_fields;
      assert.strictEqual(customFields.safe_field, 'visible');
      assert.strictEqual(customFields.elder_consent, undefined, 'elder_consent must be stripped');
      assert.strictEqual(customFields.sacred_knowledge, undefined, 'sacred_knowledge must be stripped');
      assert.strictEqual(customFields.ocap_ownership, undefined, 'ocap_ownership must be stripped');
    });

    await test('returns failed result on Supabase upsert error', async () => {
      const mockSupa = createMockSupabase({ upsertError: { message: 'DB constraint violation' } });

      const event = {
        source: 'ghl',
        eventType: 'contact.create',
        entityType: 'contact',
        entityId: 'ghl-c-1',
        payload: {
          id: 'ghl-c-1',
          locationId: 'loc-1',
          tags: [],
          customFields: {},
        },
        receivedAt: new Date().toISOString(),
      };

      const result = await handleGHLWebhook(event, mockSupa);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.action, 'failed');
      assert.ok(result.error.includes('DB constraint violation'));
    });
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RUN ALL TESTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('========================================');
  console.log('  Webhook System Tests');
  console.log('========================================');

  try {
    await testEventBus();
    await testProcessor();
    await testGHLHandler();
  } catch (err) {
    console.error('\nTest suite error:', err.message);
    console.error(err.stack);
  }

  console.log('\n========================================');
  console.log(`  Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('========================================\n');

  if (failures.length > 0) {
    console.log('Failures:');
    for (const f of failures) {
      console.log(`  - ${f.name}: ${f.error.message}`);
    }
    console.log('');
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

main();
