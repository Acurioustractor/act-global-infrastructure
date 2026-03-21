/**
 * Data freshness checking — detects stale integrations.
 *
 * Usage:
 *   import { checkHealth, formatHealthReport } from '@act/ops/health';
 *   const report = await checkHealth(supabase);
 *   console.log(formatHealthReport(report));
 */

// Default thresholds (hours) — when data is considered stale
const DEFAULT_THRESHOLDS = {
  ghl_contacts:           { warn: 48, critical: 168, column: 'updated_at', label: 'GHL Contacts' },
  ghl_opportunities:      { warn: 48, critical: 168, column: 'updated_at', label: 'GHL Opportunities' },
  communications_history: { warn: 24, critical: 72,  column: 'occurred_at', label: 'Communications' },
  project_knowledge:      { warn: 48, critical: 168, column: 'recorded_at', label: 'Project Knowledge' },
  knowledge_chunks:       { warn: 48, critical: 168, column: 'created_at', label: 'Knowledge Chunks' },
  calendar_events:        { warn: 72, critical: 336, column: 'synced_at', label: 'Calendar Events' },
  subscriptions:          { warn: 168, critical: 720, column: 'updated_at', label: 'Subscriptions' },
  api_usage:              { warn: 24, critical: 72,  column: 'created_at', label: 'API Usage' },
  site_health_checks:     { warn: 24, critical: 72,  column: 'checked_at', label: 'Site Health Checks' },
};

/**
 * Check freshness of all configured data sources.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Object} [opts]
 * @param {Object} [opts.thresholds] - Override default thresholds
 * @returns {Promise<{healthy: Array, warning: Array, critical: Array, all: Array}>}
 */
export async function checkHealth(supabase, { thresholds = DEFAULT_THRESHOLDS } = {}) {
  const now = new Date();
  const results = [];

  for (const [table, config] of Object.entries(thresholds)) {
    const result = await checkTable(supabase, table, config, now);
    results.push(result);
  }

  return {
    healthy: results.filter(r => r.status === 'ok'),
    warning: results.filter(r => r.status === 'warn'),
    critical: results.filter(r => r.status === 'critical'),
    all: results,
  };
}

/**
 * Format a health report for Telegram/console output.
 *
 * @param {{healthy: Array, warning: Array, critical: Array}} report
 * @returns {string} Markdown-formatted report
 */
export function formatHealthReport(report) {
  const lines = ['*Data Freshness Report*', ''];

  if (report.critical.length > 0) {
    lines.push(`${report.critical.length} CRITICAL:`);
    for (const r of report.critical) {
      lines.push(`  - ${r.label}: ${r.age_hours}h ago`);
    }
    lines.push('');
  }

  if (report.warning.length > 0) {
    lines.push(`${report.warning.length} warning(s):`);
    for (const r of report.warning) {
      lines.push(`  - ${r.label}: ${r.age_hours ?? 'N/A'}h ago ${r.note ? `(${r.note})` : ''}`);
    }
    lines.push('');
  }

  lines.push(`${report.healthy.length} healthy`);
  return lines.join('\n');
}

async function checkTable(supabase, table, config, now) {
  const result = {
    table,
    label: config.label,
    status: 'ok',
    age_hours: null,
    row_count: null,
    last_updated: null,
    note: '',
  };

  try {
    const { data, error, count } = await supabase
      .from(table)
      .select(config.column, { count: 'exact' })
      .order(config.column, { ascending: false })
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        result.status = 'warn';
        result.note = 'table not found';
        return result;
      }
      result.status = 'warn';
      result.note = error.message;
      return result;
    }

    result.row_count = count;

    if (!data || data.length === 0) {
      result.status = 'warn';
      result.note = 'empty table';
      return result;
    }

    const lastDate = new Date(data[0][config.column]);
    const ageHours = Math.round((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60));
    result.age_hours = ageHours;
    result.last_updated = lastDate.toISOString();

    if (ageHours >= config.critical) {
      result.status = 'critical';
      result.note = `stale (>${config.critical}h threshold)`;
    } else if (ageHours >= config.warn) {
      result.status = 'warn';
      result.note = `aging (>${config.warn}h threshold)`;
    }
  } catch (err) {
    result.status = 'warn';
    result.note = err.message;
  }

  return result;
}
