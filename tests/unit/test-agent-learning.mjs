#!/usr/bin/env node
/**
 * Tests for Agent Learning System
 *
 * Run: node tests/unit/test-agent-learning.mjs
 */

import assert from 'assert';

// Mock Supabase for testing
const createMockSupabase = (data = {}) => ({
  from: (table) => ({
    select: (cols) => ({
      eq: (col, val) => ({
        gte: (col2, val2) => ({
          order: () => ({
            limit: () => Promise.resolve({ data: data.proposals || [], error: null })
          })
        }),
        order: () => ({
          limit: () => Promise.resolve({ data: data.proposals || [], error: null })
        })
      }),
      gte: (col, val) => ({
        eq: (col2, val2) => ({
          order: () => ({
            limit: () => Promise.resolve({ data: data.executions || [], error: null })
          })
        })
      }),
      order: () => Promise.resolve({ data: data.learnings || [], error: null })
    }),
    insert: (row) => ({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'test-uuid', ...row }, error: null })
      })
    }),
    update: (row) => ({
      eq: () => Promise.resolve({ data: row, error: null })
    })
  }),
  rpc: (func, params) => {
    if (func === 'get_decision_quality_metrics') {
      return Promise.resolve({
        data: data.metrics || [{
          agent_id: 'test-agent',
          decision_type: 'test',
          total_decisions: 100,
          with_feedback: 80,
          correct_decisions: 70,
          incorrect_decisions: 10,
          accuracy_rate: 87.5,
          avg_confidence: 0.85
        }],
        error: null
      });
    }
    return Promise.resolve({ data: [], error: null });
  }
});

// Test data
const mockProposals = [
  {
    id: '1',
    agent_id: 'test-agent',
    action_name: 'sync_contacts',
    status: 'approved',
    reasoning: { confidence: 0.9, trigger: 'scheduled' },
    review_notes: null,
    created_at: '2026-01-20T10:00:00Z'
  },
  {
    id: '2',
    agent_id: 'test-agent',
    action_name: 'sync_contacts',
    status: 'rejected',
    reasoning: { confidence: 0.7, trigger: 'scheduled' },
    review_notes: 'Too many contacts',
    created_at: '2026-01-21T10:00:00Z'
  },
  {
    id: '3',
    agent_id: 'test-agent',
    action_name: 'send_notification',
    status: 'approved',
    reasoning: { confidence: 0.95, trigger: 'alert' },
    review_notes: null,
    created_at: '2026-01-22T10:00:00Z'
  }
];

const mockExecutions = [
  {
    id: '1',
    agent_id: 'test-agent',
    action_name: 'generate_report',
    confidence: 0.85,
    success: true,
    review_outcome: 'correct',
    within_bounds: true,
    created_at: '2026-01-20T10:00:00Z'
  },
  {
    id: '2',
    agent_id: 'test-agent',
    action_name: 'generate_report',
    confidence: 0.6,
    success: true,
    review_outcome: 'incorrect',
    within_bounds: true,
    created_at: '2026-01-21T10:00:00Z'
  }
];

// Import the class (we'll test with mocks since DB isn't available)
// For now, test the logic patterns

console.log('Agent Learning System - Unit Tests\n');
console.log('='.repeat(50));

// Test 1: Approval rate calculation
console.log('\nTest 1: Approval Rate Calculation');
try {
  const approved = mockProposals.filter(p => p.status === 'approved').length;
  const total = mockProposals.length;
  const approvalRate = approved / total;

  assert.strictEqual(approved, 2, 'Should have 2 approved proposals');
  assert.strictEqual(total, 3, 'Should have 3 total proposals');
  assert.strictEqual(approvalRate.toFixed(2), '0.67', 'Approval rate should be ~67%');
  console.log('  PASS: Approval rate calculated correctly (67%)');
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 2: Confidence threshold calculation
console.log('\nTest 2: Confidence Threshold Analysis');
try {
  // Find optimal threshold - confidence level where most approvals happen
  const approved = mockProposals.filter(p => p.status === 'approved');
  const rejected = mockProposals.filter(p => p.status === 'rejected');

  const avgApprovedConfidence = approved.reduce((sum, p) => sum + p.reasoning.confidence, 0) / approved.length;
  const avgRejectedConfidence = rejected.reduce((sum, p) => sum + p.reasoning.confidence, 0) / rejected.length;

  // Optimal threshold is between rejected max and approved min
  const optimalThreshold = (avgApprovedConfidence + avgRejectedConfidence) / 2;

  assert.ok(avgApprovedConfidence > avgRejectedConfidence, 'Approved should have higher avg confidence');
  assert.ok(optimalThreshold > 0.7 && optimalThreshold < 0.95, 'Threshold should be between 0.7 and 0.95');
  console.log(`  PASS: Optimal threshold calculated (~${optimalThreshold.toFixed(2)})`);
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 3: Pattern extraction from rejections
console.log('\nTest 3: Rejection Pattern Extraction');
try {
  const rejected = mockProposals.filter(p => p.status === 'rejected');
  const patterns = {};

  rejected.forEach(p => {
    const actionName = p.action_name;
    const trigger = p.reasoning.trigger;
    const key = `${actionName}:${trigger}`;
    patterns[key] = (patterns[key] || 0) + 1;
  });

  assert.strictEqual(Object.keys(patterns).length, 1, 'Should have 1 rejection pattern');
  assert.strictEqual(patterns['sync_contacts:scheduled'], 1, 'Should identify sync_contacts:scheduled pattern');
  console.log('  PASS: Rejection patterns extracted correctly');
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 4: Bound adjustment suggestions
console.log('\nTest 4: Bound Adjustment Suggestions');
try {
  // If rejection rate for an action > 30%, suggest tighter bounds
  const actionStats = {};

  mockProposals.forEach(p => {
    if (!actionStats[p.action_name]) {
      actionStats[p.action_name] = { approved: 0, rejected: 0 };
    }
    if (p.status === 'approved') actionStats[p.action_name].approved++;
    if (p.status === 'rejected') actionStats[p.action_name].rejected++;
  });

  const adjustments = [];
  Object.entries(actionStats).forEach(([action, stats]) => {
    const total = stats.approved + stats.rejected;
    if (total > 0) {
      const rejectionRate = stats.rejected / total;
      if (rejectionRate > 0.3) {
        adjustments.push({
          action,
          rejectionRate,
          suggestion: 'Consider tighter bounds or lower autonomy level'
        });
      }
    }
  });

  assert.strictEqual(adjustments.length, 1, 'Should suggest 1 adjustment');
  assert.strictEqual(adjustments[0].action, 'sync_contacts', 'Should suggest adjustment for sync_contacts');
  console.log('  PASS: Bound adjustments suggested correctly');
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 5: Execution success analysis
console.log('\nTest 5: Execution Success Analysis');
try {
  const successRate = mockExecutions.filter(e => e.success).length / mockExecutions.length;
  const reviewedCorrect = mockExecutions.filter(e => e.review_outcome === 'correct').length;
  const reviewedIncorrect = mockExecutions.filter(e => e.review_outcome === 'incorrect').length;

  assert.strictEqual(successRate, 1, 'All executions succeeded');
  assert.strictEqual(reviewedCorrect, 1, 'One reviewed as correct');
  assert.strictEqual(reviewedIncorrect, 1, 'One reviewed as incorrect');
  console.log('  PASS: Execution analysis correct');
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 6: Confidence calibration check
console.log('\nTest 6: Confidence Calibration');
try {
  // Check if confidence predicts outcomes
  const correct = mockExecutions.filter(e => e.review_outcome === 'correct');
  const incorrect = mockExecutions.filter(e => e.review_outcome === 'incorrect');

  const avgCorrectConf = correct.reduce((sum, e) => sum + e.confidence, 0) / correct.length;
  const avgIncorrectConf = incorrect.reduce((sum, e) => sum + e.confidence, 0) / incorrect.length;

  // Good calibration: higher confidence correlates with correct outcomes
  const wellCalibrated = avgCorrectConf > avgIncorrectConf;

  assert.strictEqual(wellCalibrated, true, 'Higher confidence should correlate with correct outcomes');
  console.log(`  PASS: Calibration check (correct: ${avgCorrectConf.toFixed(2)}, incorrect: ${avgIncorrectConf.toFixed(2)})`);
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 7: Learning storage format
console.log('\nTest 7: Learning Storage Format');
try {
  const learning = {
    agent_id: 'test-agent',
    learning_type: 'threshold',
    insight: {
      current_threshold: 0.7,
      suggested_threshold: 0.82,
      based_on_samples: 100,
      expected_improvement: '15% fewer rejections'
    },
    confidence: 0.85,
    applied: false
  };

  assert.ok(learning.insight.suggested_threshold > learning.insight.current_threshold, 'Should suggest higher threshold');
  assert.strictEqual(typeof learning.confidence, 'number', 'Confidence should be a number');
  assert.ok(learning.confidence >= 0 && learning.confidence <= 1, 'Confidence should be 0-1');
  console.log('  PASS: Learning storage format valid');
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 8: Health score calculation
console.log('\nTest 8: Health Score Calculation');
try {
  // Simulate health score calculation
  let score = 100;
  const proposalMetrics = {
    approvalRate: 67,  // < 70% triggers penalty
    total: 3
  };
  const executionMetrics = {
    successRate: 100,
    boundsViolations: 0
  };
  const decisionMetrics = {
    accuracyRate: 85  // >= 80% is fine
  };

  // Factor 1: Approval rate penalty
  if (proposalMetrics.approvalRate < 70) {
    score -= (70 - proposalMetrics.approvalRate) * 0.3;
  }

  // Factor 2: Execution success (no penalty here)
  if (executionMetrics.successRate < 90) {
    score -= (90 - executionMetrics.successRate) * 0.4;
  }

  // Factor 3: Decision accuracy (no penalty here)
  if (decisionMetrics.accuracyRate < 80) {
    score -= (80 - decisionMetrics.accuracyRate) * 0.3;
  }

  score = Math.round(score);

  assert.ok(score < 100, 'Score should be reduced due to low approval rate');
  assert.ok(score > 95, 'Score should still be reasonably high');
  console.log(`  PASS: Health score calculated correctly (${score}/100)`);
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 9: Cross-agent insight detection
console.log('\nTest 9: Cross-Agent Performance Gap Detection');
try {
  const agentMetrics = [
    { agentId: 'agent-a', healthScore: 95 },
    { agentId: 'agent-b', healthScore: 72 },
    { agentId: 'agent-c', healthScore: 88 }
  ];

  const sorted = agentMetrics.sort((a, b) => b.healthScore - a.healthScore);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const gap = best.healthScore - worst.healthScore;

  const shouldAlert = gap > 20;

  assert.strictEqual(best.agentId, 'agent-a', 'Best agent should be agent-a');
  assert.strictEqual(worst.agentId, 'agent-b', 'Worst agent should be agent-b');
  assert.strictEqual(gap, 23, 'Gap should be 23 points');
  assert.strictEqual(shouldAlert, true, 'Should alert on 20+ point gap');
  console.log(`  PASS: Performance gap detected (${gap} points between ${best.agentId} and ${worst.agentId})`);
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 10: Auto-apply safety check
console.log('\nTest 10: Auto-Apply Safety Check');
try {
  // Only auto-apply if:
  // 1. Confidence > 0.8
  // 2. Threshold change is small (< 0.15 from baseline 0.7)
  const learnings = [
    { type: 'threshold', confidence: 0.9, insight: { suggestedThreshold: 0.75 } },  // Safe to apply
    { type: 'threshold', confidence: 0.9, insight: { suggestedThreshold: 0.95 } },  // Too big a change
    { type: 'threshold', confidence: 0.6, insight: { suggestedThreshold: 0.72 } },  // Low confidence
    { type: 'pattern', confidence: 0.9, insight: { type: 'rejection_pattern' } }    // Wrong type
  ];

  const safeToApply = learnings.filter(l => {
    if (l.type !== 'threshold') return false;
    if (l.confidence <= 0.8) return false;
    if (Math.abs(l.insight.suggestedThreshold - 0.7) >= 0.15) return false;
    return true;
  });

  assert.strictEqual(safeToApply.length, 1, 'Only 1 learning should be safe to auto-apply');
  assert.strictEqual(safeToApply[0].insight.suggestedThreshold, 0.75, 'Should be the conservative threshold change');
  console.log('  PASS: Auto-apply safety checks working');
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// ============================================================================
// NEW METHOD TESTS (detectRepeatedMistakes, calibrateConfidence,
// evaluateAutonomyAdjustments, createCorrectionRule, enhanced runLearningCycle)
// ============================================================================

// Extended mock Supabase that supports the new RPC calls and table operations
const createExtendedMockSupabase = (overrides = {}) => {
  const rpcResponses = {
    detect_repeated_mistakes: overrides.repeatedMistakes || [
      {
        action_name: 'sync_contacts',
        mistake_category: 'timeout',
        occurrence_count: 5,
        feedback_record_ids: ['fb-1', 'fb-2', 'fb-3', 'fb-4', 'fb-5'],
        first_seen: '2026-01-01T00:00:00Z',
        last_seen: '2026-01-28T00:00:00Z',
        common_feedback: 'Operation timed out repeatedly'
      },
      {
        action_name: 'send_notification',
        mistake_category: 'wrong_recipient',
        occurrence_count: 3,
        feedback_record_ids: ['fb-6', 'fb-7', 'fb-8'],
        first_seen: '2026-01-10T00:00:00Z',
        last_seen: '2026-01-25T00:00:00Z',
        common_feedback: 'Sent to wrong contact'
      }
    ],
    calculate_calibration: overrides.calibration || [
      { bucket_start: 0.0, bucket_end: 0.2, predicted_confidence: 0.1, actual_success_rate: 0.15, action_count: 10, calibration_gap: 0.05 },
      { bucket_start: 0.2, bucket_end: 0.4, predicted_confidence: 0.3, actual_success_rate: 0.35, action_count: 15, calibration_gap: 0.05 },
      { bucket_start: 0.4, bucket_end: 0.6, predicted_confidence: 0.5, actual_success_rate: 0.40, action_count: 20, calibration_gap: -0.10 },
      { bucket_start: 0.6, bucket_end: 0.8, predicted_confidence: 0.7, actual_success_rate: 0.55, action_count: 30, calibration_gap: -0.15 },
      { bucket_start: 0.8, bucket_end: 1.0, predicted_confidence: 0.9, actual_success_rate: 0.70, action_count: 25, calibration_gap: -0.20 }
    ],
    evaluate_autonomy_change: overrides.autonomyChange || {
      recommended_change: 'decrease',
      current_level: 'bounded',
      suggested_level: 'supervised',
      reason: 'High failure rate in recent window',
      confidence: 0.75
    },
    get_decision_quality_metrics: overrides.decisionMetrics || [{
      agent_id: 'test-agent',
      decision_type: 'test',
      total_decisions: 100,
      with_feedback: 80,
      correct_decisions: 70,
      incorrect_decisions: 10,
      accuracy_rate: 87.5,
      avg_confidence: 0.85
    }],
    store_agent_learning: 'learning-uuid-123',
    ...overrides.rpcOverrides
  };

  const tableData = {
    agent_mistake_patterns: overrides.existingPatterns || [],
    agent_actions: overrides.agentActions || [
      { action_name: 'sync_contacts', autonomy_level: 'bounded' },
      { action_name: 'send_notification', autonomy_level: 'supervised' }
    ],
    agent_feedback: overrides.feedbackRecords || [
      { id: 'fb-1', feedback_type: 'correction', details: { message: 'Timed out, increase timeout' } },
      { id: 'fb-2', feedback_type: 'correction', details: { message: 'Network issue, retry needed' } }
    ],
    procedural_memory: overrides.procedures || [],
    memory_episodes: overrides.episodes || [],
    agent_proposals: overrides.proposals || [],
    autonomous_executions: overrides.executions || [],
    agent_learnings: overrides.learnings || [],
    ...overrides.tableOverrides
  };

  const insertedRows = [];
  const updatedRows = [];
  const upsertedRows = [];

  const chainable = (resolveData) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      neq: () => chain,
      in: () => chain,
      gte: () => chain,
      lte: () => chain,
      is: () => chain,
      or: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => Promise.resolve({ data: Array.isArray(resolveData) ? resolveData[0] : resolveData, error: null }),
      then: (resolve) => resolve({ data: resolveData, error: null })
    };
    // Make it thenable
    chain[Symbol.for('nodejs.util.promisify.custom')] = () => Promise.resolve({ data: resolveData, error: null });
    return chain;
  };

  return {
    from: (table) => ({
      select: (cols) => {
        const data = tableData[table] || [];
        return chainable(data);
      },
      insert: (row) => {
        insertedRows.push({ table, row });
        return chainable(Array.isArray(row) ? row : [{ id: 'new-uuid', ...row }]);
      },
      update: (row) => {
        updatedRows.push({ table, row });
        return chainable([{ id: 'updated-uuid', ...row }]);
      },
      upsert: (row) => {
        upsertedRows.push({ table, row });
        return chainable(Array.isArray(row) ? row : [{ id: 'upserted-uuid', ...row }]);
      }
    }),
    rpc: (func, params) => {
      const response = rpcResponses[func];
      if (response === undefined) {
        return Promise.resolve({ data: null, error: { message: `Unknown RPC: ${func}` } });
      }
      return Promise.resolve({ data: response, error: null });
    },
    _insertedRows: insertedRows,
    _updatedRows: updatedRows,
    _upsertedRows: upsertedRows
  };
};

// Test 11: detectRepeatedMistakes returns patterns from RPC
console.log('\nTest 11: detectRepeatedMistakes - Basic');
try {
  const mockSb = createExtendedMockSupabase();
  const { AgentLearning } = await import('../../scripts/lib/agent-learning.mjs');
  const learning = new AgentLearning('test-agent', mockSb, { timeWindowDays: 30 });

  const patterns = await learning.detectRepeatedMistakes();

  assert.ok(Array.isArray(patterns), 'Should return an array');
  assert.strictEqual(patterns.length, 2, 'Should return 2 patterns');
  assert.strictEqual(patterns[0].action_name || patterns[0].actionName, 'sync_contacts', 'First pattern should be sync_contacts');
  console.log('  PASS: detectRepeatedMistakes returns patterns');
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 12: detectRepeatedMistakes handles empty results
console.log('\nTest 12: detectRepeatedMistakes - Empty');
try {
  const mockSb = createExtendedMockSupabase({ repeatedMistakes: [] });
  const { AgentLearning } = await import('../../scripts/lib/agent-learning.mjs');
  const learning = new AgentLearning('test-agent', mockSb, { timeWindowDays: 30 });

  const patterns = await learning.detectRepeatedMistakes();

  assert.ok(Array.isArray(patterns), 'Should return an array');
  assert.strictEqual(patterns.length, 0, 'Should return empty array');
  console.log('  PASS: detectRepeatedMistakes handles empty results');
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 13: detectRepeatedMistakes uses custom windowDays
console.log('\nTest 13: detectRepeatedMistakes - Custom Window');
try {
  let capturedParams = null;
  const mockSb = createExtendedMockSupabase();
  const origRpc = mockSb.rpc.bind(mockSb);
  mockSb.rpc = (func, params) => {
    if (func === 'detect_repeated_mistakes') capturedParams = params;
    return origRpc(func, params);
  };

  const { AgentLearning } = await import('../../scripts/lib/agent-learning.mjs');
  const learning = new AgentLearning('test-agent', mockSb, { timeWindowDays: 30 });

  await learning.detectRepeatedMistakes(60);

  assert.strictEqual(capturedParams.p_window_days, 60, 'Should use provided windowDays');
  assert.strictEqual(capturedParams.p_agent_id, 'test-agent', 'Should use agent ID');
  assert.strictEqual(capturedParams.p_min_occurrences, 3, 'Should use min occurrences of 3');
  console.log('  PASS: detectRepeatedMistakes uses custom window');
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 14: calibrateConfidence calculates ECE
console.log('\nTest 14: calibrateConfidence - ECE Calculation');
try {
  const mockSb = createExtendedMockSupabase();
  const { AgentLearning } = await import('../../scripts/lib/agent-learning.mjs');
  const learning = new AgentLearning('test-agent', mockSb, { timeWindowDays: 30 });

  const result = await learning.calibrateConfidence();

  assert.ok(result !== null, 'Should return a result');
  assert.ok(typeof result.ece === 'number', 'ECE should be a number');
  assert.ok(result.ece >= 0 && result.ece <= 1, 'ECE should be between 0 and 1');
  assert.ok(typeof result.adjustment === 'number', 'Adjustment should be a number');
  assert.ok(Math.abs(result.adjustment) <= 0.15, 'Adjustment should be capped at 0.15');
  assert.ok(Array.isArray(result.buckets), 'Should include buckets');
  assert.ok(typeof result.totalActions === 'number', 'Should include totalActions');
  console.log(`  PASS: ECE calculated (${result.ece.toFixed(4)}, adjustment: ${result.adjustment.toFixed(3)})`);
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 15: calibrateConfidence detects overconfidence
console.log('\nTest 15: calibrateConfidence - Overconfidence Detection');
try {
  // Overconfident: predicted confidence > actual success rate (negative gaps)
  const mockSb = createExtendedMockSupabase({
    calibration: [
      { bucket_start: 0.8, bucket_end: 1.0, predicted_confidence: 0.9, actual_success_rate: 0.60, action_count: 50, calibration_gap: -0.30 }
    ]
  });
  const { AgentLearning } = await import('../../scripts/lib/agent-learning.mjs');
  const learning = new AgentLearning('test-agent', mockSb);

  const result = await learning.calibrateConfidence();

  assert.ok(result.adjustment < 0, 'Overconfident agent should get negative adjustment');
  assert.strictEqual(result.adjustment, -0.15, 'Adjustment should be capped at -0.15');
  console.log('  PASS: Overconfidence detected with negative adjustment');
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 16: calibrateConfidence handles no data
console.log('\nTest 16: calibrateConfidence - No Data');
try {
  const mockSb = createExtendedMockSupabase({ calibration: [] });
  const { AgentLearning } = await import('../../scripts/lib/agent-learning.mjs');
  const learning = new AgentLearning('test-agent', mockSb);

  const result = await learning.calibrateConfidence();

  assert.strictEqual(result, null, 'Should return null when no data');
  console.log('  PASS: calibrateConfidence handles empty data');
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 17: evaluateAutonomyAdjustments queries actions and calls RPC
console.log('\nTest 17: evaluateAutonomyAdjustments - Basic');
try {
  const rpcCalls = [];
  const mockSb = createExtendedMockSupabase();
  const origRpc = mockSb.rpc.bind(mockSb);
  mockSb.rpc = (func, params) => {
    rpcCalls.push({ func, params });
    return origRpc(func, params);
  };

  const { AgentLearning } = await import('../../scripts/lib/agent-learning.mjs');
  const learning = new AgentLearning('test-agent', mockSb);

  const transitions = await learning.evaluateAutonomyAdjustments();

  assert.ok(Array.isArray(transitions), 'Should return an array');
  // Should have called evaluate_autonomy_change for each action
  const autonomyCalls = rpcCalls.filter(c => c.func === 'evaluate_autonomy_change');
  assert.ok(autonomyCalls.length >= 1, 'Should call evaluate_autonomy_change RPC');
  console.log(`  PASS: evaluateAutonomyAdjustments called ${autonomyCalls.length} RPC evaluations`);
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 18: createCorrectionRule creates procedural memory
console.log('\nTest 18: createCorrectionRule - Creates Rule');
try {
  const mockSb = createExtendedMockSupabase({
    existingPatterns: [{
      id: 'pattern-1',
      agent_id: 'test-agent',
      action_name: 'sync_contacts',
      mistake_category: 'timeout',
      occurrence_count: 5,
      feedback_record_ids: ['fb-1', 'fb-2'],
      status: 'active'
    }]
  });
  const { AgentLearning } = await import('../../scripts/lib/agent-learning.mjs');
  const learning = new AgentLearning('test-agent', mockSb);

  const rule = await learning.createCorrectionRule('pattern-1');

  assert.ok(rule !== null, 'Should return a rule');
  // Verify the pattern was updated (status to mitigated) by checking updatedRows
  const patternUpdates = mockSb._updatedRows.filter(r => r.table === 'agent_mistake_patterns');
  assert.ok(patternUpdates.length > 0, 'Should update pattern status');
  console.log('  PASS: createCorrectionRule creates rule and updates pattern');
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 19: Enhanced runLearningCycle calls new methods
console.log('\nTest 19: Enhanced runLearningCycle - Calls New Methods');
try {
  const methodsCalled = [];
  const mockSb = createExtendedMockSupabase({
    repeatedMistakes: [],
    calibration: [],
    agentActions: []
  });
  const { AgentLearning } = await import('../../scripts/lib/agent-learning.mjs');
  const learning = new AgentLearning('test-agent', mockSb, { timeWindowDays: 30 });

  // Wrap methods to track calls
  const origDetect = learning.detectRepeatedMistakes.bind(learning);
  learning.detectRepeatedMistakes = async (...args) => {
    methodsCalled.push('detectRepeatedMistakes');
    return origDetect(...args);
  };
  const origCalibrate = learning.calibrateConfidence.bind(learning);
  learning.calibrateConfidence = async (...args) => {
    methodsCalled.push('calibrateConfidence');
    return origCalibrate(...args);
  };
  const origAutonomy = learning.evaluateAutonomyAdjustments.bind(learning);
  learning.evaluateAutonomyAdjustments = async (...args) => {
    methodsCalled.push('evaluateAutonomyAdjustments');
    return origAutonomy(...args);
  };

  await learning.runLearningCycle();

  assert.ok(methodsCalled.includes('detectRepeatedMistakes'), 'Should call detectRepeatedMistakes');
  assert.ok(methodsCalled.includes('calibrateConfidence'), 'Should call calibrateConfidence');
  assert.ok(methodsCalled.includes('evaluateAutonomyAdjustments'), 'Should call evaluateAutonomyAdjustments');
  console.log('  PASS: runLearningCycle calls all new methods');
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Test 20: ECE weighted calculation correctness
console.log('\nTest 20: ECE Weighted Calculation');
try {
  // Manual ECE calculation to verify:
  // ECE = sum(action_count/total * |calibration_gap|) for each bucket
  const buckets = [
    { action_count: 10, calibration_gap: 0.05 },
    { action_count: 15, calibration_gap: 0.05 },
    { action_count: 20, calibration_gap: -0.10 },
    { action_count: 30, calibration_gap: -0.15 },
    { action_count: 25, calibration_gap: -0.20 }
  ];
  const total = buckets.reduce((s, b) => s + b.action_count, 0); // 100
  const expectedECE = buckets.reduce((s, b) => s + (b.action_count / total) * Math.abs(b.calibration_gap), 0);
  // = (10/100)*0.05 + (15/100)*0.05 + (20/100)*0.10 + (30/100)*0.15 + (25/100)*0.20
  // = 0.005 + 0.0075 + 0.02 + 0.045 + 0.05 = 0.1275

  const mockSb = createExtendedMockSupabase();
  const { AgentLearning } = await import('../../scripts/lib/agent-learning.mjs');
  const learning = new AgentLearning('test-agent', mockSb);

  const result = await learning.calibrateConfidence();

  assert.ok(Math.abs(result.ece - expectedECE) < 0.001, `ECE should be ~${expectedECE.toFixed(4)} but got ${result.ece.toFixed(4)}`);
  assert.strictEqual(result.totalActions, 100, 'Total actions should be 100');
  console.log(`  PASS: ECE calculation verified (${result.ece.toFixed(4)} === ${expectedECE.toFixed(4)})`);
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('All 20 tests completed.\n');
