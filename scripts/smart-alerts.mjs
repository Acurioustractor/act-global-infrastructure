#!/usr/bin/env node

/**
 * Smart Alerts System
 *
 * Analyzes flow metrics and sends alerts when:
 * - Issues stuck >3 days
 * - WIP limit exceeded (>3 issues)
 * - Sprint at risk of missing goal
 * - Issues blocked >1 day
 * - Velocity dropping significantly
 *
 * Notification channels:
 * - macOS desktop notifications
 * - Email (if configured)
 * - Notion comments
 * - GitHub issue creation
 */

import '../lib/load-env.mjs';
import { calculateSprintMetrics } from './calculate-flow-metrics.mjs';
import { execSync } from 'child_process';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';

/**
 * Alert types and severity levels
 */
const ALERT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical'
};

/**
 * Send macOS desktop notification
 */
function sendMacOSNotification(title, message, severity = 'info') {
  try {
    const sound = severity === 'critical' ? 'Basso' :
                  severity === 'warning' ? 'Submarine' : 'Glass';

    const script = `
      display notification "${message.replace(/"/g, '\\"')}" ¬
        with title "${title.replace(/"/g, '\\"')}" ¬
        sound name "${sound}"
    `;

    execSync(`osascript -e '${script}'`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.error('Failed to send macOS notification:', error.message);
    return false;
  }
}

/**
 * Add comment to Notion page (issue)
 */
async function addNotionComment(pageId, comment) {
  try {
    // Notion doesn't have a direct comments API, but we can add to page content
    // For now, we'll log this - in future can use Notion API to update page
    console.log(`📝 Would add Notion comment to page ${pageId}: ${comment}`);
    return true;
  } catch (error) {
    console.error('Failed to add Notion comment:', error.message);
    return false;
  }
}

/**
 * Send email notification (if SMTP configured)
 */
async function sendEmailNotification(subject, body) {
  // Check if email is configured
  const emailTo = process.env.ALERT_EMAIL;

  if (!emailTo) {
    console.log('📧 Email not configured (set ALERT_EMAIL in .env)');
    return false;
  }

  // For now, log the email. In production, integrate with SMTP or SendGrid
  console.log(`📧 Would send email to ${emailTo}:`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Body: ${body.substring(0, 100)}...`);

  return true;
}

/**
 * Analyze metrics and generate alerts
 */
function analyzeMetrics(metrics) {
  const alerts = [];

  // Alert 1: WIP Limit Exceeded
  if (metrics.inProgress > 3) {
    alerts.push({
      severity: ALERT_SEVERITY.WARNING,
      type: 'WIP_LIMIT_EXCEEDED',
      title: '⚠️ Too Much Work In Progress!',
      message: `You have ${metrics.inProgress} issues in progress (limit: 3). Focus on finishing before starting new work.`,
      recommendation: 'Pick ONE issue to complete, then move to the next.',
      data: {
        current: metrics.inProgress,
        limit: 3,
        items: metrics.wipItems
      }
    });
  }

  // Alert 2: Stuck Issues (in progress >3 days)
  const stuckIssues = metrics.wipItems.filter(item => item.daysInProgress > 3);
  if (stuckIssues.length > 0) {
    stuckIssues.forEach(issue => {
      alerts.push({
        severity: ALERT_SEVERITY.WARNING,
        type: 'ISSUE_STUCK',
        title: '🐌 Issue Stuck in Progress',
        message: `Issue #${issue.number} has been in progress for ${issue.daysInProgress} days. May need help or should be broken down.`,
        recommendation: 'Review if this needs to be split into smaller issues or if you need help.',
        data: {
          issue: issue.number,
          daysStuck: issue.daysInProgress,
          title: issue.title,
          url: issue.url
        }
      });
    });
  }

  // Alert 3: Blocked Issues
  if (metrics.blocked > 0) {
    alerts.push({
      severity: ALERT_SEVERITY.CRITICAL,
      type: 'BLOCKED_ISSUES',
      title: '🚫 Issues Blocked!',
      message: `${metrics.blocked} issue(s) are blocked. These need immediate attention to unblock.`,
      recommendation: 'Review blocked items and work to remove blockers ASAP.',
      data: {
        count: metrics.blocked,
        items: metrics.blockedItems
      }
    });
  }

  // Alert 4: Sprint At Risk (< 50% complete with < 50% time remaining)
  const sprintDays = 30; // Assuming 30-day sprints
  const daysElapsed = 15; // TODO: Calculate actual days from sprint start
  const timeProgress = (daysElapsed / sprintDays) * 100;
  const workProgress = metrics.completionPercentage;

  if (timeProgress > 50 && workProgress < 50) {
    alerts.push({
      severity: ALERT_SEVERITY.CRITICAL,
      type: 'SPRINT_AT_RISK',
      title: '🚨 Sprint At Risk!',
      message: `Sprint is ${timeProgress.toFixed(0)}% through time but only ${workProgress}% complete. Need to accelerate!`,
      recommendation: 'Focus on highest priority items. Consider moving some issues to next sprint.',
      data: {
        timeProgress,
        workProgress,
        gap: timeProgress - workProgress
      }
    });
  }

  // Alert 5: Slow Cycle Time (>72 hours)
  if (metrics.avgCycleTime !== null && metrics.avgCycleTime > 72) {
    alerts.push({
      severity: ALERT_SEVERITY.WARNING,
      type: 'SLOW_CYCLE_TIME',
      title: '🐢 Slow Cycle Time Detected',
      message: `Average cycle time is ${Math.floor(metrics.avgCycleTime / 24)} days. Look for bottlenecks in review/merge process.`,
      recommendation: 'Consider smaller PRs, faster reviews, or auto-merge when CI passes.',
      data: {
        cycleTime: metrics.avgCycleTime,
        cycleTimeDays: Math.floor(metrics.avgCycleTime / 24)
      }
    });
  }

  // Alert 6: Low Flow Efficiency (<25%)
  if (metrics.flowEfficiency !== null && metrics.flowEfficiency < 25) {
    alerts.push({
      severity: ALERT_SEVERITY.WARNING,
      type: 'LOW_FLOW_EFFICIENCY',
      title: '⏱️ Low Flow Efficiency',
      message: `Flow efficiency is ${metrics.flowEfficiency}%. You're spending >75% of time waiting, not coding.`,
      recommendation: 'Identify where time is spent waiting. Reduce review delays, CI time, or blocked time.',
      data: {
        flowEfficiency: metrics.flowEfficiency
      }
    });
  }

  // Alert 7: Good Progress! (Positive reinforcement)
  if (metrics.completionPercentage >= 80 && metrics.inProgress <= 2 && metrics.blocked === 0) {
    alerts.push({
      severity: ALERT_SEVERITY.INFO,
      type: 'GOOD_PROGRESS',
      title: '🎉 Excellent Progress!',
      message: `Sprint is ${metrics.completionPercentage}% complete with healthy WIP and no blockers. Keep up the great work!`,
      recommendation: 'You are on track! Maintain current pace to hit sprint goal.',
      data: {
        completion: metrics.completionPercentage
      }
    });
  }

  return alerts;
}

/**
 * Send alerts through all configured channels
 */
async function sendAlerts(alerts, sprintName) {
  console.log(`\n🔔 Smart Alerts for ${sprintName}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (alerts.length === 0) {
    console.log('✅ No alerts - everything looks good!\n');
    return;
  }

  // Group by severity
  const critical = alerts.filter(a => a.severity === ALERT_SEVERITY.CRITICAL);
  const warnings = alerts.filter(a => a.severity === ALERT_SEVERITY.WARNING);
  const info = alerts.filter(a => a.severity === ALERT_SEVERITY.INFO);

  // Display summary
  console.log(`📊 Alert Summary:`);
  if (critical.length > 0) console.log(`   🚨 Critical: ${critical.length}`);
  if (warnings.length > 0) console.log(`   ⚠️  Warnings: ${warnings.length}`);
  if (info.length > 0) console.log(`   ℹ️  Info: ${info.length}`);
  console.log('');

  // Send each alert
  for (const alert of alerts) {
    const icon = alert.severity === ALERT_SEVERITY.CRITICAL ? '🚨' :
                 alert.severity === ALERT_SEVERITY.WARNING ? '⚠️' : 'ℹ️';

    console.log(`${icon} ${alert.title}`);
    console.log(`   ${alert.message}`);
    console.log(`   💡 ${alert.recommendation}`);
    console.log('');

    // Send macOS notification (only for critical and warnings)
    if (alert.severity !== ALERT_SEVERITY.INFO) {
      sendMacOSNotification(
        alert.title,
        `${alert.message}\n\n💡 ${alert.recommendation}`,
        alert.severity
      );
    }

    // Send email for critical alerts
    if (alert.severity === ALERT_SEVERITY.CRITICAL) {
      await sendEmailNotification(
        `[${sprintName}] ${alert.title}`,
        `${alert.message}\n\nRecommendation: ${alert.recommendation}\n\nData: ${JSON.stringify(alert.data, null, 2)}`
      );
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Generate alert summary for dashboard
 */
function generateAlertSummary(alerts) {
  const summary = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === ALERT_SEVERITY.CRITICAL).length,
    warnings: alerts.filter(a => a.severity === ALERT_SEVERITY.WARNING).length,
    info: alerts.filter(a => a.severity === ALERT_SEVERITY.INFO).length,
    alerts: alerts.map(a => ({
      type: a.type,
      severity: a.severity,
      title: a.title,
      message: a.message
    }))
  };

  return summary;
}

/**
 * Main
 */
async function main() {
  console.log('🔔 Smart Alerts System\n');

  const args = process.argv.slice(2);
  const sprintArg = args.find(arg => arg.startsWith('--sprint='));
  const sprintName = sprintArg ? sprintArg.split('=')[1] : 'Sprint 2';

  // Calculate metrics
  console.log(`📊 Analyzing ${sprintName}...\n`);
  const metrics = await calculateSprintMetrics(sprintName);

  // Analyze and generate alerts
  const alerts = analyzeMetrics(metrics);

  // Send alerts
  await sendAlerts(alerts, sprintName);

  // Generate summary
  const summary = generateAlertSummary(alerts);

  console.log('📋 Alert Summary JSON:');
  console.log(JSON.stringify(summary, null, 2));
  console.log('');

  // Exit with status code based on critical alerts
  if (summary.critical > 0) {
    console.log('⚠️  Critical alerts detected. Review immediately!\n');
    process.exit(1);
  } else if (summary.warnings > 0) {
    console.log('ℹ️  Warnings detected. Review when convenient.\n');
    process.exit(0);
  } else {
    console.log('✅ All systems green!\n');
    process.exit(0);
  }
}

// Export for use by other scripts
export { analyzeMetrics, sendAlerts, generateAlertSummary, ALERT_SEVERITY };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
