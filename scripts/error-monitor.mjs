/**
 * Error Monitoring Service
 * Tracks errors across ACT AI services and alerts when issues occur
 *
 * Usage:
 *   npm run errors:check    # Check recent errors
 *   npm run errors:clear    # Clear old errors
 *   npm run errors:report   # Generate error report
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Error severity levels
const SEVERITY = {
  CRITICAL: 'critical',   // System down, data loss risk
  ERROR: 'error',         // Feature broken, needs fix
  WARNING: 'warning',     // Degraded experience
  INFO: 'info'           // Informational
};

// Services to monitor
const SERVICES = {
  'calendar-sync': { critical_threshold: 3, window_hours: 1 },
  'gmail-sync': { critical_threshold: 3, window_hours: 1 },
  'ghl-webhook': { critical_threshold: 5, window_hours: 1 },
  'rag-retrieval': { critical_threshold: 10, window_hours: 1 },
  'chatbot': { critical_threshold: 5, window_hours: 1 },
  'morning-brief': { critical_threshold: 1, window_hours: 24 },
  'knowledge-sync': { critical_threshold: 3, window_hours: 1 }
};

/**
 * Log an error to the monitoring system
 */
export async function logError({
  service,
  severity = SEVERITY.ERROR,
  message,
  error = null,
  context = {}
}) {
  const errorRecord = {
    service,
    severity,
    message,
    error_stack: error?.stack || null,
    error_message: error?.message || null,
    context: JSON.stringify(context),
    occurred_at: new Date().toISOString(),
    resolved: false
  };

  // Log to console with color coding
  const colors = {
    critical: '\x1b[41m\x1b[37m', // Red background
    error: '\x1b[31m',            // Red text
    warning: '\x1b[33m',          // Yellow
    info: '\x1b[36m'              // Cyan
  };
  const reset = '\x1b[0m';

  console.log(`${colors[severity]}[${severity.toUpperCase()}]${reset} [${service}] ${message}`);
  if (error?.stack) {
    console.log(`  ${error.stack.split('\n').slice(0, 3).join('\n  ')}`);
  }

  // Store in Supabase
  try {
    await supabase.from('knowledge_chunks').insert({
      content: JSON.stringify(errorRecord),
      source_type: 'error_log',
      source_id: `error-${service}-${Date.now()}`,
      metadata: {
        type: 'error',
        service,
        severity,
        occurred_at: errorRecord.occurred_at
      }
    });
  } catch (e) {
    console.error('Failed to log error to Supabase:', e.message);
  }

  // Check if this triggers an alert
  await checkAlertThreshold(service, severity);

  return errorRecord;
}

/**
 * Check if error rate exceeds threshold
 */
async function checkAlertThreshold(service, severity) {
  if (severity !== SEVERITY.ERROR && severity !== SEVERITY.CRITICAL) return;

  const config = SERVICES[service];
  if (!config) return;

  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - config.window_hours);

  // Count recent errors for this service
  const { data: recentErrors } = await supabase
    .from('knowledge_chunks')
    .select('*')
    .eq('source_type', 'error_log')
    .gte('created_at', windowStart.toISOString())
    .filter('metadata->>service', 'eq', service);

  const errorCount = recentErrors?.length || 0;

  if (errorCount >= config.critical_threshold) {
    await triggerAlert(service, errorCount, config.window_hours);
  }
}

/**
 * Trigger an alert for high error rate
 */
async function triggerAlert(service, errorCount, windowHours) {
  console.log(`\n🚨 ALERT: ${service} has ${errorCount} errors in the last ${windowHours}h\n`);

  // Store alert
  await supabase.from('knowledge_chunks').insert({
    content: JSON.stringify({
      type: 'alert',
      service,
      errorCount,
      windowHours,
      triggered_at: new Date().toISOString()
    }),
    source_type: 'alert',
    source_id: `alert-${service}-${Date.now()}`,
    metadata: {
      type: 'alert',
      service,
      triggered_at: new Date().toISOString()
    }
  });

  // Could also:
  // - Send email notification
  // - Post to Slack
  // - Create Notion task
  // - Trigger PagerDuty
}

/**
 * Get recent errors
 */
export async function getRecentErrors(hours = 24, service = null) {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - hours);

  let query = supabase
    .from('knowledge_chunks')
    .select('*')
    .eq('source_type', 'error_log')
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: false });

  if (service) {
    query = query.filter('metadata->>service', 'eq', service);
  }

  const { data: errors, error } = await query;
  if (error) throw error;

  return (errors || []).map(e => {
    const content = JSON.parse(e.content);
    return {
      ...content,
      id: e.id
    };
  });
}

/**
 * Get error summary by service
 */
export async function getErrorSummary(hours = 24) {
  const errors = await getRecentErrors(hours);

  const summary = {
    total: errors.length,
    byService: {},
    bySeverity: {
      critical: 0,
      error: 0,
      warning: 0,
      info: 0
    },
    recentErrors: errors.slice(0, 10)
  };

  for (const err of errors) {
    // Count by service
    if (!summary.byService[err.service]) {
      summary.byService[err.service] = { total: 0, critical: 0, error: 0, warning: 0 };
    }
    summary.byService[err.service].total++;
    summary.byService[err.service][err.severity]++;

    // Count by severity
    summary.bySeverity[err.severity]++;
  }

  return summary;
}

/**
 * Clear old errors
 */
export async function clearOldErrors(daysToKeep = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);

  const { data, error } = await supabase
    .from('knowledge_chunks')
    .delete()
    .eq('source_type', 'error_log')
    .lt('created_at', cutoff.toISOString())
    .select();

  if (error) throw error;

  return { deleted: data?.length || 0 };
}

/**
 * Check system health
 */
export async function checkSystemHealth() {
  const summary = await getErrorSummary(1); // Last hour

  const health = {
    status: 'healthy',
    issues: [],
    services: {}
  };

  // Check each service
  for (const [service, config] of Object.entries(SERVICES)) {
    const serviceErrors = summary.byService[service] || { total: 0, critical: 0, error: 0 };

    let serviceStatus = 'healthy';
    if (serviceErrors.critical > 0) {
      serviceStatus = 'critical';
      health.issues.push(`${service}: ${serviceErrors.critical} critical errors`);
    } else if (serviceErrors.total >= config.critical_threshold) {
      serviceStatus = 'degraded';
      health.issues.push(`${service}: high error rate (${serviceErrors.total})`);
    } else if (serviceErrors.error > 0) {
      serviceStatus = 'warning';
    }

    health.services[service] = serviceStatus;
  }

  // Overall status
  if (health.issues.some(i => i.includes('critical'))) {
    health.status = 'critical';
  } else if (health.issues.length > 0) {
    health.status = 'degraded';
  }

  return health;
}

/**
 * Generate error report for morning brief
 */
export async function getErrorReportForBrief() {
  const summary = await getErrorSummary(24);
  const health = await checkSystemHealth();

  return {
    health: health.status,
    errorsLast24h: summary.total,
    criticalErrors: summary.bySeverity.critical,
    issues: health.issues,
    servicesAffected: Object.entries(health.services)
      .filter(([, status]) => status !== 'healthy')
      .map(([service, status]) => ({ service, status }))
  };
}

// CLI Interface
const command = process.argv[2];

if (command === 'check' || !command) {
  console.log('\n🔍 Checking recent errors...\n');

  getErrorSummary(24)
    .then(summary => {
      if (summary.total === 0) {
        console.log('✨ No errors in the last 24 hours!');
        return;
      }

      console.log(`Total errors: ${summary.total}\n`);

      console.log('By Severity:');
      console.log(`  🔴 Critical: ${summary.bySeverity.critical}`);
      console.log(`  🟠 Error:    ${summary.bySeverity.error}`);
      console.log(`  🟡 Warning:  ${summary.bySeverity.warning}`);
      console.log(`  🔵 Info:     ${summary.bySeverity.info}`);

      console.log('\nBy Service:');
      for (const [service, counts] of Object.entries(summary.byService)) {
        console.log(`  ${service}: ${counts.total} (${counts.critical} critical, ${counts.error} errors)`);
      }

      if (summary.recentErrors.length > 0) {
        console.log('\nRecent Errors:');
        for (const err of summary.recentErrors.slice(0, 5)) {
          const time = new Date(err.occurred_at).toLocaleString('en-AU');
          console.log(`  [${time}] [${err.severity}] ${err.service}: ${err.message}`);
        }
      }
    })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}

else if (command === 'health') {
  console.log('\n💚 Checking system health...\n');

  checkSystemHealth()
    .then(health => {
      const statusEmoji = {
        healthy: '✅',
        warning: '⚠️',
        degraded: '🟡',
        critical: '🔴'
      }[health.status];

      console.log(`System Status: ${statusEmoji} ${health.status.toUpperCase()}\n`);

      console.log('Service Status:');
      for (const [service, status] of Object.entries(health.services)) {
        const emoji = {
          healthy: '✅',
          warning: '⚠️',
          degraded: '🟡',
          critical: '🔴'
        }[status];
        console.log(`  ${emoji} ${service}: ${status}`);
      }

      if (health.issues.length > 0) {
        console.log('\nIssues:');
        health.issues.forEach(issue => console.log(`  • ${issue}`));
      }
    })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}

else if (command === 'clear') {
  const days = parseInt(process.argv[3]) || 7;
  console.log(`\n🧹 Clearing errors older than ${days} days...\n`);

  clearOldErrors(days)
    .then(result => {
      console.log(`✓ Deleted ${result.deleted} old error records`);
    })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}

else if (command === 'report') {
  console.log('\n📊 Generating error report...\n');

  getErrorReportForBrief()
    .then(report => {
      console.log(JSON.stringify(report, null, 2));
    })
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}

else if (command === 'test') {
  console.log('\n🧪 Logging test error...\n');

  logError({
    service: 'error-monitor',
    severity: SEVERITY.INFO,
    message: 'Test error for monitoring system',
    context: { test: true }
  }).then(() => {
    console.log('✓ Test error logged successfully');
  });
}

else {
  console.log(`
Error Monitoring Service

Commands:
  check        Check recent errors (default)
  health       Check overall system health
  clear [days] Clear errors older than N days (default: 7)
  report       Generate error report for morning brief
  test         Log a test error

Severity Levels:
  🔴 Critical: System down, data loss risk
  🟠 Error:    Feature broken, needs fix
  🟡 Warning:  Degraded experience
  🔵 Info:     Informational

Monitored Services:
  • calendar-sync
  • gmail-sync
  • ghl-webhook
  • rag-retrieval
  • chatbot
  • morning-brief
  • knowledge-sync
`);
}

// Export for use in other services
export { SEVERITY };
