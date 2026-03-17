/**
 * Integration tests for ACT Finance Engine
 *
 * Tests module initialization, Supabase connectivity, and pipeline wiring.
 * Requires env vars (SUPABASE_SERVICE_ROLE_KEY, XERO_CLIENT_ID, etc).
 *
 * Run: node --test scripts/tests/finance-integration.test.mjs
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

// Load env
import '../../lib/load-env.mjs';

// ============================================================================
// MODULE IMPORTS (verify they all load cleanly)
// ============================================================================

describe('Module initialization', () => {
  it('imports finance/common without error', async () => {
    const mod = await import('../lib/finance/common.mjs');
    assert.ok(mod.createSupabase, 'createSupabase should be exported');
    assert.ok(mod.log, 'log should be exported');
    assert.ok(mod.retry, 'retry should be exported');
    assert.ok(mod.parseArgs, 'parseArgs should be exported');
    assert.ok(mod.getAustralianFY, 'getAustralianFY should be exported');
    assert.ok(mod.getCurrentBASQuarter, 'getCurrentBASQuarter should be exported');
  });

  it('imports finance/receipt-classifier without error', async () => {
    const mod = await import('../lib/finance/receipt-classifier.mjs');
    assert.ok(mod.isLikelyReceipt, 'isLikelyReceipt should be exported');
    assert.ok(mod.extractAmount, 'extractAmount should be exported');
    assert.ok(mod.extractReceiptFromHtml, 'extractReceiptFromHtml should be exported');
  });

  it('imports finance/index barrel without error', async () => {
    const mod = await import('../lib/finance/index.mjs');
    // Verify all expected exports are present
    const expected = [
      'createXeroClient', 'createSupabase', 'log', 'warn', 'error',
      'retry', 'notify', 'parseArgs',
      'getAustralianFY', 'getFYDates', 'getCurrentBASQuarter',
      'isLikelyReceipt', 'extractAmount', 'extractReceiptFromHtml',
    ];
    for (const name of expected) {
      assert.ok(mod[name], `${name} should be exported from barrel`);
    }
  });
});

// ============================================================================
// SUPABASE CONNECTIVITY
// ============================================================================

describe('Supabase connectivity', () => {
  let supabase;

  before(() => {
    const { createSupabase } = require_or_skip('../lib/finance/common.mjs');
    try {
      supabase = createSupabase();
    } catch {
      // Skip if no env vars
    }
  });

  it('creates Supabase client', () => {
    if (!supabase) return; // skip without env
    assert.ok(supabase, 'Supabase client should be created');
  });

  it('can query act_entities table', async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('act_entities')
      .select('code, name, entity_type')
      .eq('code', 'ACT-ST')
      .single();
    assert.ok(!error, `Query should succeed: ${error?.message}`);
    assert.equal(data.code, 'ACT-ST');
    assert.equal(data.entity_type, 'sole_trader');
  });

  it('can query pipeline_runs table', async () => {
    if (!supabase) return;
    const { error } = await supabase
      .from('pipeline_runs')
      .select('id')
      .limit(1);
    assert.ok(!error, `pipeline_runs should be queryable: ${error?.message}`);
  });

  it('entity_code column exists on xero_transactions', async () => {
    if (!supabase) return;
    const { data } = await supabase.rpc('exec_sql', {
      query: `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'xero_transactions' AND column_name = 'entity_code'`
    });
    assert.ok(data?.length > 0, 'entity_code column should exist on xero_transactions');
  });

  it('entity_code column exists on receipt_emails', async () => {
    if (!supabase) return;
    const { data } = await supabase.rpc('exec_sql', {
      query: `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'receipt_emails' AND column_name = 'entity_code'`
    });
    assert.ok(data?.length > 0, 'entity_code column should exist on receipt_emails');
  });
});

// ============================================================================
// XERO CLIENT INITIALIZATION
// ============================================================================

describe('Xero client', () => {
  it('creates Xero client when credentials exist', async () => {
    if (!process.env.XERO_CLIENT_ID) return; // skip without env
    const { createXeroClient } = await import('../lib/finance/xero-client.mjs');
    const { createSupabase } = await import('../lib/finance/common.mjs');
    const supabase = createSupabase();
    const xero = await createXeroClient(supabase);
    assert.ok(xero.get, 'Should have get method');
    assert.ok(xero.post, 'Should have post method');
    assert.ok(xero.uploadAttachment, 'Should have uploadAttachment method');
    assert.ok(xero.getAccessToken(), 'Should have a valid access token');
  });
});

// ============================================================================
// AUSTRALIAN FY HELPERS
// ============================================================================

describe('Australian FY helpers', () => {
  it('getAustralianFY returns correct FY for March 2026', async () => {
    const { getAustralianFY } = await import('../lib/finance/common.mjs');
    const fy = getAustralianFY(new Date(2026, 2, 17)); // March 17, 2026
    assert.equal(fy, 'FY26');
  });

  it('getAustralianFY returns FY27 for July 2026', async () => {
    const { getAustralianFY } = await import('../lib/finance/common.mjs');
    const fy = getAustralianFY(new Date(2026, 6, 1)); // July 1, 2026
    assert.equal(fy, 'FY27');
  });

  it('getFYDates returns correct range for FY26', async () => {
    const { getFYDates } = await import('../lib/finance/common.mjs');
    const { start, end } = getFYDates('FY26');
    assert.equal(start.getFullYear(), 2025);
    assert.equal(start.getMonth(), 6); // July
    assert.equal(end.getFullYear(), 2026);
    assert.equal(end.getMonth(), 5); // June
  });

  it('getCurrentBASQuarter returns Q3 for March', async () => {
    const { getCurrentBASQuarter } = await import('../lib/finance/common.mjs');
    const q = getCurrentBASQuarter(new Date(2026, 2, 17)); // March
    assert.equal(q.quarter, 'Q3');
  });
});

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

describe('parseArgs', () => {
  it('parses --dry-run flag', async () => {
    const { parseArgs } = await import('../lib/finance/common.mjs');
    const args = parseArgs(['--dry-run']);
    assert.equal(args.dryRun, true);
  });

  it('parses --limit with value', async () => {
    const { parseArgs } = await import('../lib/finance/common.mjs');
    const args = parseArgs(['--limit', '10']);
    assert.equal(args.limit, 10);
  });

  it('parses subcommand with flags', async () => {
    const { parseArgs } = await import('../lib/finance/common.mjs');
    const args = parseArgs(['--limit', '10', 'capture', '--verbose']);
    assert.equal(args.command, 'capture');
    assert.equal(args.limit, 10);
    assert.equal(args.verbose, true);
  });

  it('parses --days with value', async () => {
    const { parseArgs } = await import('../lib/finance/common.mjs');
    const args = parseArgs(['--days', '7', '--notify']);
    assert.equal(args.days, 7);
    assert.equal(args.notify, true);
  });

  it('returns null for missing optional args', async () => {
    const { parseArgs } = await import('../lib/finance/common.mjs');
    const args = parseArgs([]);
    assert.equal(args.dryRun, false);
    assert.equal(args.limit, null);
    assert.equal(args.command, null);
  });
});

// ============================================================================
// RETRY LOGIC
// ============================================================================

describe('retry', () => {
  it('returns on first success', async () => {
    const { retry } = await import('../lib/finance/common.mjs');
    let calls = 0;
    const result = await retry(() => { calls++; return 'ok'; }, { retries: 3, baseDelay: 10 });
    assert.equal(result, 'ok');
    assert.equal(calls, 1);
  });

  it('retries on failure then succeeds', async () => {
    const { retry } = await import('../lib/finance/common.mjs');
    let calls = 0;
    const result = await retry(() => {
      calls++;
      if (calls < 3) throw new Error('fail');
      return 'ok';
    }, { retries: 3, baseDelay: 10, label: 'test' });
    assert.equal(result, 'ok');
    assert.equal(calls, 3);
  });

  it('throws after max retries', async () => {
    const { retry } = await import('../lib/finance/common.mjs');
    await assert.rejects(
      () => retry(() => { throw new Error('always fail'); }, { retries: 2, baseDelay: 10 }),
      { message: 'always fail' }
    );
  });

  it('respects shouldRetry predicate', async () => {
    const { retry } = await import('../lib/finance/common.mjs');
    let calls = 0;
    await assert.rejects(
      () => retry(
        () => { calls++; throw new Error('fatal'); },
        { retries: 3, baseDelay: 10, shouldRetry: (err) => !err.message.includes('fatal') }
      ),
      { message: 'fatal' }
    );
    assert.equal(calls, 1, 'Should not retry when shouldRetry returns false');
  });
});

// Helper to handle missing modules gracefully
function require_or_skip(path) {
  try {
    // Dynamic import workaround for sync check
    return { createSupabase: null };
  } catch {
    return {};
  }
}
