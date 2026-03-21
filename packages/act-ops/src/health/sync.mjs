/**
 * Sync status tracking — records sync results to the sync_status table.
 *
 * Usage:
 *   import { recordSync } from '@act/ops/health';
 *   await recordSync(supabase, 'gmail_sync', { success: true, recordCount: 42, durationMs: 3200 });
 */

const STALE_THRESHOLD_HOURS = 12;

/**
 * Record the result of a sync operation.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} integrationName - Must match a row in sync_status (auto-upserts)
 * @param {Object} opts
 * @param {boolean} opts.success
 * @param {number} [opts.recordCount]
 * @param {string} [opts.error]
 * @param {number} [opts.durationMs]
 */
export async function recordSync(supabase, integrationName, { success, recordCount, error, durationMs } = {}) {
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
    console.warn(`[health/sync] Failed to record status for ${integrationName}:`, dbError.message);
  }
}

/**
 * Get all sync statuses, flagging stale ones.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Object} [opts]
 * @param {number} [opts.staleThresholdHours=12]
 * @returns {Promise<Array>} Array of sync status rows with is_stale flag
 */
export async function getSyncStatuses(supabase, { staleThresholdHours = STALE_THRESHOLD_HOURS } = {}) {
  const { data, error } = await supabase
    .from('sync_status')
    .select('*')
    .order('integration_name');

  if (error) {
    console.error('[health/sync] Failed to fetch sync statuses:', error.message);
    return [];
  }

  const now = Date.now();
  return data.map(row => ({
    ...row,
    is_stale: row.last_success_at
      ? (now - new Date(row.last_success_at).getTime()) > staleThresholdHours * 3600 * 1000
      : true,
  }));
}
