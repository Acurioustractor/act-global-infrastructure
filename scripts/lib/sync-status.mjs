/**
 * Sync Status Utility
 *
 * Records sync results to the sync_status table for freshness monitoring.
 *
 * Usage:
 *   import { recordSyncStatus } from './lib/sync-status.mjs';
 *
 *   // On success:
 *   await recordSyncStatus(supabase, 'gmail_sync', { success: true, recordCount: 42, durationMs: 3200 });
 *
 *   // On failure:
 *   await recordSyncStatus(supabase, 'gmail_sync', { success: false, error: 'Connection timeout' });
 */

const STALE_THRESHOLD_HOURS = 12;

/**
 * Record the result of a sync operation.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} integrationName - Must match a row in sync_status
 * @param {Object} opts
 * @param {boolean} opts.success
 * @param {number} [opts.recordCount]
 * @param {string} [opts.error]
 * @param {number} [opts.durationMs]
 */
export async function recordSyncStatus(supabase, integrationName, { success, recordCount, error, durationMs } = {}) {
  const now = new Date().toISOString();
  const update = {
    last_attempt_at: now,
    status: success ? 'healthy' : 'error',
    updated_at: now,
  };

  if (success) {
    update.last_success_at = now;
    update.last_error = null;
  } else {
    update.last_error = error || 'Unknown error';
  }

  if (recordCount !== undefined) {
    update.record_count = recordCount;
  }

  if (durationMs !== undefined) {
    update.avg_duration_ms = durationMs;
  }

  const { error: dbError } = await supabase
    .from('sync_status')
    .upsert({
      integration_name: integrationName,
      ...update,
    }, { onConflict: 'integration_name' });

  if (dbError) {
    console.warn(`⚠️  Failed to record sync status for ${integrationName}:`, dbError.message);
  }
}

/**
 * Get all sync statuses, flagging stale ones.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<Array>} Array of sync status rows with is_stale flag
 */
export async function getSyncStatuses(supabase) {
  const { data, error } = await supabase
    .from('sync_status')
    .select('*')
    .order('integration_name');

  if (error) {
    console.error('Failed to fetch sync statuses:', error.message);
    return [];
  }

  const now = Date.now();
  return data.map(row => ({
    ...row,
    is_stale: row.last_success_at
      ? (now - new Date(row.last_success_at).getTime()) > STALE_THRESHOLD_HOURS * 3600 * 1000
      : true,
  }));
}
