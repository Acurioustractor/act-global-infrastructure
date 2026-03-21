/**
 * Integration tests for @act/ops/health module.
 *
 * Uses real Supabase calls against the shared ACT project.
 * Run: node --test packages/act-ops/tests/health.test.mjs
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { recordSync, checkHealth, formatHealthReport, sendAlert } from '@act/ops/health';

// Load env (root .env.local)
import '../../../lib/load-env.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;

before(() => {
  assert.ok(supabaseUrl, 'SUPABASE_URL must be set');
  assert.ok(supabaseKey, 'SUPABASE_SERVICE_ROLE_KEY must be set');
  supabase = createClient(supabaseUrl, supabaseKey);
});

describe('recordSync', () => {
  const testIntegration = `__test_${Date.now()}`;

  it('records a successful sync', async () => {
    await recordSync(supabase, testIntegration, {
      success: true,
      recordCount: 42,
      durationMs: 1234,
    });

    const { data } = await supabase
      .from('sync_status')
      .select('*')
      .eq('integration_name', testIntegration)
      .single();

    assert.equal(data.status, 'healthy');
    assert.equal(data.record_count, 42);
    assert.equal(data.avg_duration_ms, 1234);
    assert.ok(data.last_success_at);
    assert.equal(data.last_error, null);
  });

  it('records a failed sync', async () => {
    await recordSync(supabase, testIntegration, {
      success: false,
      error: 'Connection timeout',
    });

    const { data } = await supabase
      .from('sync_status')
      .select('*')
      .eq('integration_name', testIntegration)
      .single();

    assert.equal(data.status, 'error');
    assert.equal(data.last_error, 'Connection timeout');
  });

  it('cleans up test row', async () => {
    await supabase.from('sync_status').delete().eq('integration_name', testIntegration);
  });
});

describe('checkHealth', () => {
  it('returns healthy/warning/critical arrays', async () => {
    const report = await checkHealth(supabase);

    assert.ok(Array.isArray(report.healthy));
    assert.ok(Array.isArray(report.warning));
    assert.ok(Array.isArray(report.critical));
    assert.ok(Array.isArray(report.all));
    assert.equal(report.all.length, report.healthy.length + report.warning.length + report.critical.length);
  });

  it('each result has required fields', async () => {
    const report = await checkHealth(supabase);

    for (const r of report.all) {
      assert.ok(r.table, 'result must have table');
      assert.ok(r.label, 'result must have label');
      assert.ok(['ok', 'warn', 'critical'].includes(r.status), `status must be ok/warn/critical, got ${r.status}`);
    }
  });
});

describe('formatHealthReport', () => {
  it('formats a report as markdown string', () => {
    const report = {
      healthy: [{ label: 'Gmail', age_hours: 2 }],
      warning: [{ label: 'Calendar', age_hours: 50, note: 'aging' }],
      critical: [{ label: 'GHL', age_hours: 200 }],
    };

    const text = formatHealthReport(report);
    assert.ok(text.includes('Data Freshness Report'));
    assert.ok(text.includes('GHL'));
    assert.ok(text.includes('Calendar'));
    assert.ok(text.includes('1 healthy'));
  });
});

describe('sendAlert', () => {
  it('returns false when Telegram is not configured', async () => {
    // Save and clear env
    const savedToken = process.env.TELEGRAM_BOT_TOKEN;
    const savedChat = process.env.TELEGRAM_CHAT_ID;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;

    const result = await sendAlert('test message');
    assert.equal(result, false);

    // Restore env
    if (savedToken) process.env.TELEGRAM_BOT_TOKEN = savedToken;
    if (savedChat) process.env.TELEGRAM_CHAT_ID = savedChat;
  });
});
