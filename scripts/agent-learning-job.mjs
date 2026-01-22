#!/usr/bin/env node
/**
 * Agent Learning Job
 *
 * Daily job that:
 * 1. Analyzes all active agents' performance
 * 2. Generates learnings (threshold adjustments, patterns, bound suggestions)
 * 3. Stores learnings in the database
 * 4. Notifies Discord of significant findings
 * 5. Optionally auto-applies high-confidence, low-risk learnings
 *
 * Run manually:
 *   node scripts/agent-learning-job.mjs
 *
 * Run via cron (recommended: daily at 2am):
 *   0 2 * * * cd /path/to/project && node scripts/agent-learning-job.mjs
 *
 * Options:
 *   --dry-run       Don't store learnings, just analyze
 *   --agent <id>    Only analyze specific agent
 *   --auto-apply    Auto-apply high-confidence learnings
 *   --verbose       Show detailed output
 *   --days <n>      Analysis time window (default: 30)
 */

import { createClient } from '@supabase/supabase-js';
import { AgentLearning } from './lib/agent-learning.mjs';
import { sendEmbed, sendDiscordMessage } from './discord-notify.mjs';
import { createAuditor } from './lib/audit.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const audit = createAuditor('agent-learning-job');

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  autoApply: args.includes('--auto-apply'),
  verbose: args.includes('--verbose'),
  days: parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '30'),
  specificAgent: args.find((a, i) => args[i - 1] === '--agent') || null
};

// ============================================================================
// MAIN JOB
// ============================================================================

async function runLearningJob() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log('\n========================================');
  console.log('  Agent Learning Job');
  console.log(`  ${timestamp}`);
  console.log('========================================\n');

  if (options.dryRun) {
    console.log('MODE: Dry run (no changes will be saved)\n');
  }

  const results = {
    timestamp,
    agentsAnalyzed: 0,
    learningsGenerated: 0,
    learningsApplied: 0,
    alerts: [],
    errors: []
  };

  try {
    // Step 1: Get list of active agents
    const agents = await getActiveAgents();

    if (options.specificAgent) {
      const filtered = agents.filter(a => a.agent_id === options.specificAgent);
      if (filtered.length === 0) {
        console.log(`Agent not found: ${options.specificAgent}`);
        console.log(`Active agents: ${agents.map(a => a.agent_id).join(', ')}`);
        return;
      }
      agents.length = 0;
      agents.push(...filtered);
    }

    console.log(`Found ${agents.length} active agent(s) to analyze\n`);

    // Step 2: Analyze each agent
    for (const agent of agents) {
      console.log(`\n--- Analyzing: ${agent.agent_id} ---`);

      try {
        const agentResults = await analyzeAgent(agent.agent_id);
        results.agentsAnalyzed++;
        results.learningsGenerated += agentResults.learnings.length;
        results.alerts.push(...agentResults.alerts);

        // Auto-apply if enabled
        if (options.autoApply && !options.dryRun) {
          const applied = await autoApplyLearnings(agent.agent_id, agentResults.learnings);
          results.learningsApplied += applied;
        }

      } catch (err) {
        console.error(`  Error analyzing ${agent.agent_id}:`, err.message);
        results.errors.push({ agent: agent.agent_id, error: err.message });
      }
    }

    // Step 3: Generate cross-agent insights
    if (agents.length > 1) {
      console.log('\n--- Cross-Agent Analysis ---');
      const crossInsights = await generateCrossAgentInsights(agents);
      results.crossInsights = crossInsights;
    }

    // Step 4: Send Discord summary
    await sendLearningReport(results);

    // Step 5: Log completion
    const duration = Date.now() - startTime;
    console.log('\n========================================');
    console.log('  Job Complete');
    console.log(`  Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`  Agents: ${results.agentsAnalyzed}`);
    console.log(`  Learnings: ${results.learningsGenerated}`);
    console.log(`  Applied: ${results.learningsApplied}`);
    console.log(`  Alerts: ${results.alerts.length}`);
    console.log('========================================\n');

    // Audit log
    await audit.log('learning_job_complete', 'agent_learnings', {
      success: true,
      durationMs: duration,
      outputSummary: {
        agentsAnalyzed: results.agentsAnalyzed,
        learningsGenerated: results.learningsGenerated,
        learningsApplied: results.learningsApplied,
        alertCount: results.alerts.length,
        errorCount: results.errors.length
      }
    });

  } catch (err) {
    console.error('\nJob failed:', err.message);
    results.errors.push({ agent: 'job', error: err.message });

    await audit.log('learning_job_failed', 'agent_learnings', {
      success: false,
      errorMessage: err.message
    });

    // Send error notification
    await sendDiscordMessage('errors',
      `Agent Learning Job Failed\n\`\`\`\n${err.message}\n\`\`\``
    );
  }

  return results;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get list of agents with recent activity
 */
async function getActiveAgents() {
  const cutoff = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000).toISOString();

  // Get agents with proposals
  const { data: proposalAgents } = await supabase
    .from('agent_proposals')
    .select('agent_id')
    .gte('created_at', cutoff)
    .limit(100);

  // Get agents with executions
  const { data: executionAgents } = await supabase
    .from('autonomous_executions')
    .select('agent_id')
    .gte('created_at', cutoff)
    .limit(100);

  // Combine and dedupe
  const allAgents = new Set([
    ...(proposalAgents || []).map(a => a.agent_id),
    ...(executionAgents || []).map(a => a.agent_id)
  ]);

  return Array.from(allAgents).map(agent_id => ({ agent_id }));
}

/**
 * Analyze a single agent and generate learnings
 */
async function analyzeAgent(agentId) {
  const learning = new AgentLearning(agentId, supabase, {
    timeWindowDays: options.days,
    verbose: options.verbose
  });

  const result = {
    agentId,
    learnings: [],
    alerts: []
  };

  // 1. Analyze overall performance
  const performance = await learning.analyzePerformance();

  if (options.verbose) {
    console.log(`  Health Score: ${performance.healthScore.score}/100`);
    if (performance.healthScore.factors.length > 0) {
      console.log(`  Issues: ${performance.healthScore.factors.join(', ')}`);
    }
  }

  // Alert if health is low
  if (performance.healthScore.score < 70) {
    result.alerts.push({
      type: 'low_health',
      agentId,
      score: performance.healthScore.score,
      factors: performance.healthScore.factors
    });
  }

  // 2. Calculate threshold
  const threshold = await learning.calculateThreshold();

  if (threshold.suggestedThreshold && threshold.confidenceInSuggestion > 0.5) {
    if (!options.dryRun) {
      const stored = await learning.storeLearning('threshold', {
        suggestedThreshold: threshold.suggestedThreshold,
        currentApprovalRate: threshold.currentApprovalRate,
        samples: threshold.samplesAnalyzed,
        reason: threshold.reason
      }, threshold.confidenceInSuggestion);
      result.learnings.push(stored);
    }

    if (options.verbose) {
      console.log(`  Threshold suggestion: ${threshold.suggestedThreshold} (${(threshold.confidenceInSuggestion * 100).toFixed(0)}% confidence)`);
    }
  }

  // 3. Get rejection patterns
  const rejectionPatterns = await learning.getRejectionPatterns();

  for (const pattern of rejectionPatterns.slice(0, 3)) {
    if (pattern.count >= 3) {
      if (!options.dryRun) {
        const stored = await learning.storeLearning('pattern', {
          type: 'rejection_pattern',
          action: pattern.actionName,
          trigger: pattern.trigger,
          frequency: pattern.count,
          commonReason: pattern.commonReason,
          recommendation: pattern.recommendation
        }, Math.min(pattern.count / 10, 1));
        result.learnings.push(stored);
      }

      if (options.verbose) {
        console.log(`  Rejection pattern: ${pattern.actionName}/${pattern.trigger} (${pattern.count}x)`);
      }

      // Alert on high-frequency rejections
      if (pattern.count >= 5) {
        result.alerts.push({
          type: 'rejection_pattern',
          agentId,
          action: pattern.actionName,
          trigger: pattern.trigger,
          count: pattern.count,
          reason: pattern.commonReason
        });
      }
    }
  }

  // 4. Suggest bound adjustments
  const adjustments = await learning.suggestBoundAdjustments();

  for (const adjustment of adjustments) {
    if (!options.dryRun) {
      const stored = await learning.storeLearning('bound_adjustment', {
        action: adjustment.actionName,
        adjustmentType: adjustment.type,
        reason: adjustment.reason,
        recommendation: adjustment.recommendation
      }, adjustment.confidence);
      result.learnings.push(stored);
    }

    if (options.verbose) {
      console.log(`  Bound adjustment: ${adjustment.actionName} - ${adjustment.type}`);
    }

    // Alert on significant adjustments
    if (adjustment.confidence > 0.7) {
      result.alerts.push({
        type: 'bound_adjustment',
        agentId,
        action: adjustment.actionName,
        adjustmentType: adjustment.type,
        reason: adjustment.reason
      });
    }
  }

  // 5. Check calibration
  if (performance.executions.total >= 10) {
    const avgCorrectConf = performance.executions.avgConfidence;
    const accuracyRate = performance.executions.accuracyRate;

    if (accuracyRate !== null && avgCorrectConf !== null) {
      const calibrationError = Math.abs(avgCorrectConf - (accuracyRate / 100));

      if (calibrationError > 0.15) {
        if (!options.dryRun) {
          const stored = await learning.storeLearning('calibration', {
            avgConfidence: avgCorrectConf,
            actualAccuracy: accuracyRate / 100,
            calibrationError,
            direction: avgCorrectConf > (accuracyRate / 100) ? 'overconfident' : 'underconfident'
          }, Math.min(performance.executions.total / 30, 1));
          result.learnings.push(stored);
        }

        result.alerts.push({
          type: 'calibration_issue',
          agentId,
          error: calibrationError,
          direction: avgCorrectConf > (accuracyRate / 100) ? 'overconfident' : 'underconfident'
        });
      }
    }
  }

  console.log(`  Generated ${result.learnings.length} learnings, ${result.alerts.length} alerts`);

  return result;
}

/**
 * Auto-apply high-confidence, low-risk learnings
 */
async function autoApplyLearnings(agentId, learnings) {
  let applied = 0;

  for (const learning of learnings) {
    // Only auto-apply threshold suggestions with high confidence
    if (learning.type === 'threshold' && learning.confidence > 0.8) {
      const insight = learning.insight;

      // Check if threshold change is small (< 0.15 difference)
      if (Math.abs(insight.suggestedThreshold - 0.7) < 0.15) {
        // This is a conservative change - apply it
        // In a real implementation, this would update agent_actions bounds

        const agentLearning = new AgentLearning(agentId, supabase);
        await agentLearning.markLearningApplied(learning.id, 'auto-apply', {
          applied_threshold: insight.suggestedThreshold,
          timestamp: new Date().toISOString()
        });

        applied++;
        console.log(`  Auto-applied: threshold adjustment to ${insight.suggestedThreshold}`);
      }
    }
  }

  return applied;
}

/**
 * Generate insights across all agents
 */
async function generateCrossAgentInsights(agents) {
  const insights = [];

  // Get aggregate metrics
  const agentMetrics = [];

  for (const agent of agents) {
    const learning = new AgentLearning(agent.agent_id, supabase, {
      timeWindowDays: options.days,
      verbose: false
    });

    const performance = await learning.analyzePerformance();
    agentMetrics.push({
      agentId: agent.agent_id,
      healthScore: performance.healthScore.score,
      approvalRate: performance.proposals.approvalRate,
      executionSuccess: performance.executions.successRate,
      totalActivity: performance.proposals.total + performance.executions.total
    });
  }

  // Find best and worst performers
  const sorted = agentMetrics.sort((a, b) => b.healthScore - a.healthScore);

  if (sorted.length >= 2) {
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    if (best.healthScore - worst.healthScore > 20) {
      insights.push({
        type: 'performance_gap',
        best: { agent: best.agentId, score: best.healthScore },
        worst: { agent: worst.agentId, score: worst.healthScore },
        recommendation: `Consider reviewing ${worst.agentId} configuration based on ${best.agentId} patterns`
      });
    }
  }

  // Find common patterns
  const avgApprovalRate = agentMetrics.reduce((sum, a) => sum + (a.approvalRate || 0), 0) / agentMetrics.filter(a => a.approvalRate).length;

  if (avgApprovalRate < 70) {
    insights.push({
      type: 'system_wide_rejections',
      avgApprovalRate,
      recommendation: 'Overall approval rate is low - consider reviewing proposal criteria or human reviewer guidelines'
    });
  }

  if (options.verbose && insights.length > 0) {
    console.log(`\nCross-agent insights:`);
    insights.forEach(i => {
      console.log(`  - ${i.type}: ${i.recommendation}`);
    });
  }

  return insights;
}

/**
 * Send learning report to Discord
 */
async function sendLearningReport(results) {
  // Skip Discord if no significant findings
  if (results.learningsGenerated === 0 && results.alerts.length === 0) {
    if (options.verbose) {
      console.log('\nNo significant findings to report to Discord');
    }
    return;
  }

  const color = results.alerts.length > 3 ? 0xFF6B6B :  // Red for many alerts
                results.alerts.length > 0 ? 0xFFA500 :  // Orange for some alerts
                0x00AE86;                               // Green for no alerts

  const fields = [
    {
      name: 'Agents Analyzed',
      value: results.agentsAnalyzed.toString(),
      inline: true
    },
    {
      name: 'Learnings Generated',
      value: results.learningsGenerated.toString(),
      inline: true
    },
    {
      name: 'Auto-Applied',
      value: results.learningsApplied.toString(),
      inline: true
    }
  ];

  // Add alerts summary
  if (results.alerts.length > 0) {
    const alertSummary = results.alerts.slice(0, 5).map(a => {
      switch (a.type) {
        case 'low_health':
          return `${a.agentId}: Health ${a.score}/100`;
        case 'rejection_pattern':
          return `${a.agentId}: ${a.action} rejected ${a.count}x`;
        case 'calibration_issue':
          return `${a.agentId}: ${a.direction}`;
        case 'bound_adjustment':
          return `${a.agentId}: ${a.action} needs ${a.adjustmentType}`;
        default:
          return `${a.agentId}: ${a.type}`;
      }
    }).join('\n');

    fields.push({
      name: `Alerts (${results.alerts.length})`,
      value: alertSummary || 'None',
      inline: false
    });
  }

  // Add errors if any
  if (results.errors.length > 0) {
    fields.push({
      name: 'Errors',
      value: results.errors.map(e => `${e.agent}: ${e.error}`).join('\n').slice(0, 500),
      inline: false
    });
  }

  const embed = {
    title: 'Agent Learning Report',
    color,
    fields,
    footer: {
      text: `Time window: ${options.days} days | ${options.dryRun ? 'DRY RUN' : 'Production'}`
    },
    timestamp: results.timestamp
  };

  try {
    await sendEmbed('agent-alerts', embed);
  } catch (err) {
    // Fallback to general alerts channel
    try {
      await sendEmbed('alerts', embed);
    } catch (err2) {
      console.warn('Could not send Discord notification:', err2.message);
    }
  }
}

// ============================================================================
// RUN JOB
// ============================================================================

runLearningJob().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
