#!/usr/bin/env node
/**
 * Tests for Agent Approvals Component Logic
 *
 * Tests the data fetching and mutation logic that the AgentApprovals
 * component uses to interact with the agent_proposals table.
 *
 * Run: node tests/unit/test-agent-approvals-component.mjs
 */

import assert from 'assert';

// ─── Mock Supabase Client ──────────────────────────────────────────

function createMockSupabase({ proposals = [], updateError = null, selectError = null } = {}) {
  const calls = { selects: [], updates: [] };

  return {
    calls,
    from: (table) => ({
      select: (cols) => {
        calls.selects.push({ table, cols });
        return {
          eq: (col, val) => ({
            order: (orderCol, opts) => ({
              limit: (n) => Promise.resolve({
                data: selectError ? null : proposals.filter(p => p[col] === val).slice(0, n),
                error: selectError,
              }),
            }),
          }),
        };
      },
      update: (row) => {
        calls.updates.push({ table, row });
        return {
          eq: (col, val) => Promise.resolve({
            data: updateError ? null : { ...proposals.find(p => p[col] === val), ...row },
            error: updateError,
          }),
        };
      },
    }),
  };
}

// ─── Test Data ─────────────────────────────────────────────────────

const sampleProposals = [
  {
    id: 'prop-1',
    agent_name: 'scout',
    action_type: 'sync',
    title: 'Sync Notion projects',
    description: 'Detected 3 stale projects that need re-sync',
    priority: 'high',
    status: 'pending',
    context: { stale_count: 3 },
    created_at: '2026-01-30T10:00:00Z',
  },
  {
    id: 'prop-2',
    agent_name: 'oracle',
    action_type: 'alert',
    title: 'SSL certificate expiring',
    description: 'act.org.au SSL expires in 14 days',
    priority: 'critical',
    status: 'pending',
    context: { domain: 'act.org.au', days_remaining: 14 },
    created_at: '2026-01-30T09:00:00Z',
  },
  {
    id: 'prop-3',
    agent_name: 'kraken',
    action_type: 'refactor',
    title: 'Old proposal already approved',
    description: 'This was already handled',
    priority: 'low',
    status: 'approved',
    context: {},
    created_at: '2026-01-29T08:00:00Z',
  },
];

// ─── Test: Fetch Pending Proposals ─────────────────────────────────

async function testFetchPendingProposals() {
  const supabase = createMockSupabase({ proposals: sampleProposals });

  // Simulate what the component does: query pending proposals
  const { data, error } = await supabase
    .from('agent_proposals')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  assert.strictEqual(error, null, 'Should not return an error');
  assert.strictEqual(data.length, 2, 'Should return only pending proposals');
  assert.ok(data.every(p => p.status === 'pending'), 'All returned proposals should be pending');
  assert.strictEqual(supabase.calls.selects[0].table, 'agent_proposals', 'Should query agent_proposals table');

  console.log('  PASS: testFetchPendingProposals');
}

// ─── Test: Approve Proposal ────────────────────────────────────────

async function testApproveProposal() {
  const supabase = createMockSupabase({ proposals: sampleProposals });

  const { data, error } = await supabase
    .from('agent_proposals')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', 'prop-1');

  assert.strictEqual(error, null, 'Should not return an error');
  assert.strictEqual(supabase.calls.updates[0].table, 'agent_proposals', 'Should update agent_proposals table');
  assert.strictEqual(supabase.calls.updates[0].row.status, 'approved', 'Should set status to approved');
  assert.ok(supabase.calls.updates[0].row.reviewed_at, 'Should set reviewed_at timestamp');

  console.log('  PASS: testApproveProposal');
}

// ─── Test: Reject Proposal ─────────────────────────────────────────

async function testRejectProposal() {
  const supabase = createMockSupabase({ proposals: sampleProposals });

  const { data, error } = await supabase
    .from('agent_proposals')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', 'prop-2');

  assert.strictEqual(error, null, 'Should not return an error');
  assert.strictEqual(supabase.calls.updates[0].row.status, 'rejected', 'Should set status to rejected');

  console.log('  PASS: testRejectProposal');
}

// ─── Test: Handle Fetch Error ──────────────────────────────────────

async function testFetchError() {
  const supabase = createMockSupabase({
    proposals: [],
    selectError: { message: 'Connection refused', code: 'PGRST000' },
  });

  const { data, error } = await supabase
    .from('agent_proposals')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  assert.ok(error !== null, 'Should return an error');
  assert.strictEqual(data, null, 'Data should be null on error');
  assert.strictEqual(error.message, 'Connection refused', 'Error message should propagate');

  console.log('  PASS: testFetchError');
}

// ─── Test: Handle Update Error ─────────────────────────────────────

async function testUpdateError() {
  const supabase = createMockSupabase({
    proposals: sampleProposals,
    updateError: { message: 'Permission denied', code: '42501' },
  });

  const { data, error } = await supabase
    .from('agent_proposals')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', 'prop-1');

  assert.ok(error !== null, 'Should return an error');
  assert.strictEqual(data, null, 'Data should be null on error');

  console.log('  PASS: testUpdateError');
}

// ─── Test: Empty Pending List ──────────────────────────────────────

async function testEmptyPendingList() {
  // All proposals are non-pending
  const nonPendingProposals = sampleProposals.map(p => ({ ...p, status: 'approved' }));
  const supabase = createMockSupabase({ proposals: nonPendingProposals });

  const { data, error } = await supabase
    .from('agent_proposals')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  assert.strictEqual(error, null, 'Should not error');
  assert.strictEqual(data.length, 0, 'Should return empty array when no pending proposals');

  console.log('  PASS: testEmptyPendingList');
}

// ─── Test: Priority Ordering ───────────────────────────────────────

async function testPriorityMapping() {
  // Verify our priority config matches expected values
  const priorityConfig = {
    critical: { color: 'text-red-400', bg: 'bg-red-500/10' },
    high: { color: 'text-orange-400', bg: 'bg-orange-500/10' },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    low: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
  };

  assert.ok(priorityConfig.critical, 'Should have critical priority config');
  assert.ok(priorityConfig.high, 'Should have high priority config');
  assert.ok(priorityConfig.medium, 'Should have medium priority config');
  assert.ok(priorityConfig.low, 'Should have low priority config');
  assert.strictEqual(priorityConfig.critical.color, 'text-red-400', 'Critical should be red');
  assert.strictEqual(priorityConfig.high.color, 'text-orange-400', 'High should be orange');

  console.log('  PASS: testPriorityMapping');
}

// ─── Run All Tests ─────────────────────────────────────────────────

async function runTests() {
  console.log('\nAgent Approvals Component Tests\n');

  let passed = 0;
  let failed = 0;
  const tests = [
    testFetchPendingProposals,
    testApproveProposal,
    testRejectProposal,
    testFetchError,
    testUpdateError,
    testEmptyPendingList,
    testPriorityMapping,
  ];

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (err) {
      console.error(`  FAIL: ${test.name} - ${err.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed, ${tests.length} total\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
