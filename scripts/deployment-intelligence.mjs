#!/usr/bin/env node

/**
 * Deployment Intelligence
 *
 * Tracks and analyzes deployment patterns to improve delivery velocity.
 *
 * Features:
 * - Deploy frequency tracking
 * - Change failure rate analysis
 * - Mean time to recovery (MTTR)
 * - Lead time for changes
 * - Deployment risk assessment
 * - Rollback detection and analysis
 *
 * Integrates with:
 * - Git tags (releases)
 * - GitHub Actions (deployment workflows)
 * - GitHub Issues (incident tracking)
 */

import '../lib/load-env.mjs';
import { graphql } from '@octokit/graphql';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const graphqlWithAuth = graphql.defaults({
  headers: { authorization: `bearer ${GITHUB_TOKEN}` }
});

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

/**
 * Get deployment history from git tags
 */
function getDeploymentHistory(days = 30) {
  console.log(`📦 Analyzing deployments from last ${days} days...\n`);

  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get all tags with dates
    const tagsOutput = execSync(
      `git tag -l --sort=-creatordate --format='%(refname:short)|||%(creatordate:iso)|||%(subject)'`,
      { encoding: 'utf8' }
    ).trim();

    if (!tagsOutput) return [];

    const deployments = tagsOutput.split('\n').map(line => {
      const [tag, date, subject] = line.split('|||');
      return {
        tag,
        date: new Date(date),
        subject,
        version: tag
      };
    }).filter(d => d.date >= since);

    return deployments;
  } catch (error) {
    console.log('⚠️  No git tags found or not a git repository\n');
    return [];
  }
}

/**
 * Calculate deployment frequency
 */
function calculateDeployFrequency(deployments, days) {
  if (deployments.length === 0) return null;

  const deploysPerDay = deployments.length / days;

  let frequency = 'Unknown';
  if (deploysPerDay >= 1) {
    frequency = 'Multiple per day';
  } else if (deploysPerDay >= 0.14) { // ~1 per week
    frequency = 'Weekly';
  } else if (deploysPerDay >= 0.03) { // ~1 per month
    frequency = 'Monthly';
  } else {
    frequency = 'Rarely';
  }

  return {
    total: deployments.length,
    perDay: deploysPerDay.toFixed(2),
    frequency,
    period: days
  };
}

/**
 * Analyze change size between deployments
 */
function analyzeChangeSize(deployments) {
  if (deployments.length < 2) return [];

  const changes = [];

  for (let i = 0; i < deployments.length - 1; i++) {
    const current = deployments[i];
    const previous = deployments[i + 1];

    try {
      // Get commit count between tags
      const commitCount = execSync(
        `git rev-list --count ${previous.tag}..${current.tag}`,
        { encoding: 'utf8' }
      ).trim();

      // Get files changed
      const filesChanged = execSync(
        `git diff --name-only ${previous.tag}..${current.tag} | wc -l`,
        { encoding: 'utf8' }
      ).trim();

      // Get additions/deletions
      const diffStats = execSync(
        `git diff --shortstat ${previous.tag}..${current.tag}`,
        { encoding: 'utf8' }
      ).trim();

      const additionsMatch = diffStats.match(/(\d+) insertion/);
      const deletionsMatch = diffStats.match(/(\d+) deletion/);

      const additions = additionsMatch ? parseInt(additionsMatch[1]) : 0;
      const deletions = deletionsMatch ? parseInt(deletionsMatch[1]) : 0;

      changes.push({
        from: previous.tag,
        to: current.tag,
        commits: parseInt(commitCount),
        filesChanged: parseInt(filesChanged),
        additions,
        deletions,
        totalChanges: additions + deletions,
        date: current.date
      });
    } catch (error) {
      // Skip if tags don't exist in local repo
      continue;
    }
  }

  return changes;
}

/**
 * Detect incidents from issues
 */
async function detectIncidents(days = 30) {
  console.log(`🚨 Checking for incidents in last ${days} days...\n`);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const query = `
    query {
      search(query: "is:issue label:incident created:>${since.toISOString().split('T')[0]}", type: ISSUE, first: 50) {
        nodes {
          ... on Issue {
            number
            title
            createdAt
            closedAt
            labels(first: 10) {
              nodes {
                name
              }
            }
          }
        }
      }
    }
  `;

  try {
    const result = await graphqlWithAuth(query);
    const incidents = result.search.nodes.map(issue => ({
      number: issue.number,
      title: issue.title,
      createdAt: new Date(issue.createdAt),
      resolvedAt: issue.closedAt ? new Date(issue.closedAt) : null,
      severity: issue.labels.nodes.find(l =>
        l.name.includes('critical') || l.name.includes('high')
      ) ? 'high' : 'normal',
      labels: issue.labels.nodes.map(l => l.name)
    }));

    return incidents;
  } catch (error) {
    console.log('⚠️  Could not fetch incidents:', error.message);
    return [];
  }
}

/**
 * Calculate MTTR (Mean Time To Recovery)
 */
function calculateMTTR(incidents) {
  const resolvedIncidents = incidents.filter(i => i.resolvedAt);

  if (resolvedIncidents.length === 0) {
    return null;
  }

  const totalTime = resolvedIncidents.reduce((sum, incident) => {
    const timeToResolve = incident.resolvedAt - incident.createdAt;
    return sum + timeToResolve;
  }, 0);

  const avgTime = totalTime / resolvedIncidents.length;
  const hours = avgTime / (1000 * 60 * 60);

  return {
    avgHours: Math.round(hours * 10) / 10,
    totalIncidents: incidents.length,
    resolvedIncidents: resolvedIncidents.length
  };
}

/**
 * Calculate change failure rate
 */
function calculateChangeFailureRate(deployments, incidents) {
  if (deployments.length === 0) return null;

  // Count deployments that had incidents within 24 hours
  const failedDeployments = deployments.filter(deploy => {
    return incidents.some(incident => {
      const timeDiff = incident.createdAt - deploy.date;
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      return hoursDiff >= 0 && hoursDiff <= 24;
    });
  });

  const rate = (failedDeployments.length / deployments.length) * 100;

  return {
    total: deployments.length,
    failed: failedDeployments.length,
    rate: Math.round(rate * 10) / 10
  };
}

/**
 * Assess deployment risk
 */
function assessDeploymentRisk(changes) {
  if (changes.length === 0) return [];

  const risks = changes.map(change => {
    let riskScore = 0;
    const reasons = [];

    // Large number of commits
    if (change.commits > 50) {
      riskScore += 3;
      reasons.push('Many commits (>50)');
    } else if (change.commits > 20) {
      riskScore += 2;
      reasons.push('Moderate commits (>20)');
    }

    // Large number of files
    if (change.filesChanged > 30) {
      riskScore += 3;
      reasons.push('Many files changed (>30)');
    } else if (change.filesChanged > 10) {
      riskScore += 2;
      reasons.push('Several files changed (>10)');
    }

    // Large code changes
    if (change.totalChanges > 5000) {
      riskScore += 3;
      reasons.push('Large code changes (>5k lines)');
    } else if (change.totalChanges > 1000) {
      riskScore += 2;
      reasons.push('Moderate code changes (>1k lines)');
    }

    const riskLevel = riskScore >= 7 ? 'high' :
                     riskScore >= 4 ? 'medium' : 'low';

    return {
      ...change,
      riskScore,
      riskLevel,
      reasons
    };
  });

  return risks;
}

/**
 * Store deployment metrics in Supabase
 */
async function storeDeploymentMetrics(metrics) {
  if (!supabase) {
    console.log('⚠️  Supabase not configured, skipping storage\n');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('deployment_metrics')
      .insert({
        snapshot_date: new Date().toISOString(),
        deploy_frequency: metrics.frequency?.frequency || 'Unknown',
        deploys_per_day: parseFloat(metrics.frequency?.perDay || 0),
        total_deployments: metrics.frequency?.total || 0,
        change_failure_rate: metrics.changeFailureRate?.rate || 0,
        mttr_hours: metrics.mttr?.avgHours || null,
        total_incidents: metrics.incidents.length,
        period_days: metrics.frequency?.period || 30
      })
      .select();

    if (error) {
      console.error('Failed to store metrics:', error.message);
    }
  } catch (error) {
    console.error('Failed to store metrics:', error.message);
  }
}

/**
 * Generate deployment report
 */
function generateReport(deployments, changes, incidents, frequency, mttr, changeFailureRate, risks) {
  console.log('📊 Deployment Intelligence Report\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Deployment Frequency
  console.log('📦 Deployment Frequency\n');
  if (frequency) {
    console.log(`   Total Deployments: ${frequency.total} in ${frequency.period} days`);
    console.log(`   Rate: ${frequency.perDay} per day`);
    console.log(`   Frequency: ${frequency.frequency}`);

    // DORA classification
    if (frequency.frequency === 'Multiple per day') {
      console.log('   🏆 Elite Performer');
    } else if (frequency.frequency === 'Weekly') {
      console.log('   ✅ High Performer');
    } else if (frequency.frequency === 'Monthly') {
      console.log('   ⚠️  Medium Performer');
    } else {
      console.log('   ⚠️  Low Performer');
    }
  } else {
    console.log('   No deployment data available');
  }
  console.log('');

  // Change Failure Rate
  console.log('🚨 Change Failure Rate\n');
  if (changeFailureRate) {
    console.log(`   Failed Deployments: ${changeFailureRate.failed}/${changeFailureRate.total}`);
    console.log(`   Failure Rate: ${changeFailureRate.rate}%`);

    // DORA classification
    if (changeFailureRate.rate <= 15) {
      console.log('   🏆 Elite/High Performer (<15%)');
    } else if (changeFailureRate.rate <= 30) {
      console.log('   ✅ Medium Performer (<30%)');
    } else {
      console.log('   ⚠️  Needs Improvement (>30%)');
    }
  } else {
    console.log('   No failure data available');
  }
  console.log('');

  // MTTR
  console.log('⏱️  Mean Time To Recovery (MTTR)\n');
  if (mttr && mttr.resolvedIncidents > 0) {
    console.log(`   Average: ${mttr.avgHours}h`);
    console.log(`   Incidents: ${mttr.totalIncidents} (${mttr.resolvedIncidents} resolved)`);

    // DORA classification
    if (mttr.avgHours < 1) {
      console.log('   🏆 Elite Performer (<1h)');
    } else if (mttr.avgHours < 24) {
      console.log('   ✅ High Performer (<1 day)');
    } else if (mttr.avgHours < 168) {
      console.log('   ⚠️  Medium Performer (<1 week)');
    } else {
      console.log('   ⚠️  Low Performer (>1 week)');
    }
  } else {
    console.log('   No incidents or insufficient data');
  }
  console.log('');

  // Recent Deployments
  if (deployments.length > 0) {
    console.log('📋 Recent Deployments\n');
    deployments.slice(0, 5).forEach(deploy => {
      console.log(`   • ${deploy.tag} - ${deploy.date.toLocaleDateString()}`);
    });
    console.log('');
  }

  // High Risk Changes
  const highRisk = risks.filter(r => r.riskLevel === 'high');
  if (highRisk.length > 0) {
    console.log('⚠️  High Risk Deployments\n');
    highRisk.forEach(risk => {
      console.log(`   • ${risk.from} → ${risk.to}`);
      console.log(`     ${risk.commits} commits, ${risk.filesChanged} files, ${risk.totalChanges} changes`);
      console.log(`     Risks: ${risk.reasons.join(', ')}`);
    });
    console.log('');
  }

  // Recommendations
  console.log('💡 Recommendations\n');

  if (frequency && frequency.frequency === 'Rarely') {
    console.log('   📦 Increase deployment frequency to reduce batch size and risk');
  }

  if (changeFailureRate && changeFailureRate.rate > 30) {
    console.log('   🧪 Improve testing and quality gates to reduce failures');
  }

  if (mttr && mttr.avgHours > 24) {
    console.log('   🚨 Improve incident response and rollback procedures');
  }

  const avgChangeSize = changes.length > 0
    ? changes.reduce((sum, c) => sum + c.commits, 0) / changes.length
    : 0;

  if (avgChangeSize > 30) {
    console.log('   📦 Reduce deployment batch size (avg commits per deploy is high)');
  }

  if (highRisk.length > risks.length * 0.5) {
    console.log('   ⚠️  Many high-risk deployments - consider smaller, more frequent releases');
  }

  console.log('');
}

/**
 * Main
 */
async function main() {
  console.log('📊 Deployment Intelligence\n');

  const args = process.argv.slice(2);
  const daysArg = args.find(arg => arg.startsWith('--days='));
  const days = daysArg ? parseInt(daysArg.split('=')[1]) : 30;

  // Get deployment history
  const deployments = getDeploymentHistory(days);
  console.log(`✅ Found ${deployments.length} deployment(s)\n`);

  // Analyze changes
  const changes = analyzeChangeSize(deployments);
  console.log(`✅ Analyzed ${changes.length} release(s)\n`);

  // Detect incidents
  const incidents = await detectIncidents(days);
  console.log(`✅ Found ${incidents.length} incident(s)\n`);

  // Calculate metrics
  const frequency = calculateDeployFrequency(deployments, days);
  const mttr = calculateMTTR(incidents);
  const changeFailureRate = calculateChangeFailureRate(deployments, incidents);
  const risks = assessDeploymentRisk(changes);

  // Store metrics
  await storeDeploymentMetrics({
    frequency,
    mttr,
    changeFailureRate,
    incidents
  });

  // Generate report
  generateReport(deployments, changes, incidents, frequency, mttr, changeFailureRate, risks);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📖 DORA Metrics Reference:\n');
  console.log('   Elite: Daily deploys, <15% failures, <1h MTTR');
  console.log('   High: Weekly deploys, <30% failures, <1 day MTTR');
  console.log('   Medium: Monthly deploys, <45% failures, <1 week MTTR');
  console.log('   Low: Rarely deploys, >45% failures, >1 week MTTR\n');
}

main().catch(console.error);
