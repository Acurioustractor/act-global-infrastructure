/**
 * @act/ops/health — Operational health monitoring for ACT infrastructure.
 *
 * Consolidates sync tracking, staleness detection, and alerting into one module.
 *
 * Usage:
 *   import { recordSync, checkHealth, sendAlert } from '@act/ops/health';
 *
 *   // Record a sync result
 *   await recordSync(supabase, 'gmail_sync', { success: true, recordCount: 42, durationMs: 3200 });
 *
 *   // Check all integrations for staleness
 *   const report = await checkHealth(supabase);
 *   if (report.critical.length > 0) {
 *     await sendAlert(formatHealthReport(report));
 *   }
 */

export { recordSync } from './sync.mjs';
export { checkHealth, formatHealthReport } from './freshness.mjs';
export { sendAlert } from './alert.mjs';
