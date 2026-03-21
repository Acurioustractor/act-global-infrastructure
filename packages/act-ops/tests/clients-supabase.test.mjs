/**
 * Integration tests for @act/ops/clients/supabase module.
 *
 * Tests auto-pagination and the exec_agent_sql function.
 * Run: node --test packages/act-ops/tests/clients-supabase.test.mjs
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { fetchAll, countAll } from '@act/ops/clients/supabase';

import '../../../lib/load-env.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase;

before(() => {
  assert.ok(supabaseUrl, 'SUPABASE_URL must be set');
  assert.ok(supabaseKey, 'SUPABASE_SERVICE_ROLE_KEY must be set');
  supabase = createClient(supabaseUrl, supabaseKey);
});

describe('fetchAll', () => {
  it('fetches rows from sync_status', async () => {
    const rows = await fetchAll(supabase, 'sync_status', {
      select: 'integration_name, status',
      orderBy: 'integration_name',
    });

    assert.ok(Array.isArray(rows));
    assert.ok(rows.length > 0, 'sync_status should have rows');
    assert.ok(rows[0].integration_name, 'rows should have integration_name');
  });

  it('respects maxRows limit', async () => {
    const rows = await fetchAll(supabase, 'sync_status', {
      maxRows: 2,
    });

    assert.ok(rows.length <= 2);
  });

  it('supports filter function', async () => {
    const rows = await fetchAll(supabase, 'sync_status', {
      filter: (q) => q.eq('status', 'healthy'),
    });

    for (const row of rows) {
      assert.equal(row.status, 'healthy');
    }
  });

  it('throws on invalid table', async () => {
    await assert.rejects(
      () => fetchAll(supabase, 'nonexistent_table_xyz'),
      /failed/i,
    );
  });
});

describe('countAll', () => {
  it('counts rows in sync_status', async () => {
    const count = await countAll(supabase, 'sync_status');
    assert.ok(typeof count === 'number');
    assert.ok(count > 0);
  });

  it('counts with filter', async () => {
    const total = await countAll(supabase, 'sync_status');
    const healthy = await countAll(supabase, 'sync_status', {
      filter: (q) => q.eq('status', 'healthy'),
    });

    assert.ok(healthy <= total);
  });
});

describe('exec_agent_sql', () => {
  it('executes a SELECT query', async () => {
    const { data, error } = await supabase.rpc('exec_agent_sql', {
      query_text: 'SELECT count(*) as n FROM sync_status',
    });

    assert.ok(!error, `RPC error: ${error?.message}`);
    assert.ok(Array.isArray(data));
    assert.ok(data[0].n > 0);
  });

  it('blocks DELETE queries', async () => {
    const { data, error } = await supabase.rpc('exec_agent_sql', {
      query_text: 'DELETE FROM sync_status',
    });

    assert.ok(!error, `RPC error: ${error?.message}`);
    assert.ok(data.error, 'Should return error object');
    assert.ok(data.error.includes('Only SELECT'));
  });

  it('blocks multi-statement injection', async () => {
    const { data, error } = await supabase.rpc('exec_agent_sql', {
      query_text: 'SELECT 1; DROP TABLE sync_status',
    });

    assert.ok(!error, `RPC error: ${error?.message}`);
    assert.ok(data.error, 'Should return error object');
    assert.ok(data.error.includes('Multiple SQL'));
  });

  it('allows CTE (WITH) queries', async () => {
    const { data, error } = await supabase.rpc('exec_agent_sql', {
      query_text: 'WITH counts AS (SELECT count(*) as n FROM sync_status) SELECT n FROM counts',
    });

    assert.ok(!error, `RPC error: ${error?.message}`);
    assert.ok(Array.isArray(data));
  });
});
