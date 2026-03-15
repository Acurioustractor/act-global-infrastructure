/**
 * Sync Base Class
 *
 * Standardised foundation for all sync scripts. Provides:
 * - Automatic Supabase client setup
 * - Stats tracking (created/updated/skipped/errors)
 * - Structured logging with consistent formatting
 * - Pagination helpers (cursor-based and offset-based)
 * - Incremental sync via cursor caching in sync_status
 * - Duration tracking and sync status recording
 *
 * Usage:
 *   import { SyncBase } from './lib/sync-base.mjs';
 *
 *   class XeroSync extends SyncBase {
 *     constructor() {
 *       super('xero_sync', { description: 'Xero → Supabase' });
 *     }
 *
 *     async execute() {
 *       const invoices = await this.paginateAPI('https://api.xero.com/Invoices', {
 *         pageParam: 'page',
 *         dataKey: 'Invoices',
 *         pageSize: 100,
 *       });
 *       for (const inv of invoices) {
 *         await this.upsertRecord('xero_invoices', inv, 'xero_id');
 *       }
 *     }
 *   }
 *
 *   await new XeroSync().run();
 */

import { getSupabase } from './supabase-client.mjs';
import { recordSyncStatus } from './sync-status.mjs';

export class SyncBase {
  /**
   * @param {string} name - Integration name for sync_status (e.g. 'xero_sync')
   * @param {object} [options]
   * @param {string} [options.description] - Human-readable description
   * @param {import('@supabase/supabase-js').SupabaseClient} [options.supabase] - Pre-existing client
   * @param {boolean} [options.dryRun] - If true, skip writes
   */
  constructor(name, options = {}) {
    this.name = name;
    this.description = options.description || name;
    this.supabase = options.supabase || getSupabase();
    this.dryRun = options.dryRun || false;
    this.startTime = Date.now();

    /** @type {{ created: number, updated: number, skipped: number, errors: number, total: number }} */
    this.stats = { created: 0, updated: 0, skipped: 0, errors: 0, total: 0 };

    /** @type {Array<{ message: string, context?: any }>} */
    this.errors = [];
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Logging
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Log a section header */
  section(title) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${title}`);
    console.log('='.repeat(60));
  }

  /** Log an info message */
  info(msg) { console.log(`   ${msg}`); }

  /** Log a success message */
  success(msg) { console.log(`   [OK] ${msg}`); }

  /** Log a warning */
  warn(msg) { console.warn(`   [WARN] ${msg}`); }

  /** Log an error (also tracks in this.errors) */
  error(msg, context) {
    console.error(`   [ERR] ${msg}`);
    this.errors.push({ message: msg, context });
    this.stats.errors++;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Stats
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** Increment a stat counter */
  track(stat, count = 1) {
    if (this.stats[stat] !== undefined) {
      this.stats[stat] += count;
    }
  }

  /** Print a summary of stats */
  printStats() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    this.section(`${this.description} - Summary`);
    this.info(`Duration:  ${duration}s`);
    this.info(`Total:     ${this.stats.total}`);
    this.info(`Created:   ${this.stats.created}`);
    this.info(`Updated:   ${this.stats.updated}`);
    this.info(`Skipped:   ${this.stats.skipped}`);
    if (this.stats.errors > 0) {
      this.info(`Errors:    ${this.stats.errors}`);
    }
    console.log('');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Incremental Sync (Cursor Caching)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Get the last sync cursor from sync_status metadata.
   * Enables incremental syncs instead of full re-fetches.
   *
   * @param {string} [key] - Cursor key (default: 'last_cursor')
   * @returns {Promise<string|null>}
   */
  async getLastCursor(key = 'last_cursor') {
    const { data } = await this.supabase
      .from('sync_status')
      .select('metadata')
      .eq('integration_name', this.name)
      .single();

    return data?.metadata?.[key] || null;
  }

  /**
   * Save a sync cursor to sync_status metadata.
   *
   * @param {string} cursor - Cursor value to save
   * @param {string} [key] - Cursor key (default: 'last_cursor')
   */
  async saveCursor(cursor, key = 'last_cursor') {
    const { data: existing } = await this.supabase
      .from('sync_status')
      .select('metadata')
      .eq('integration_name', this.name)
      .single();

    const metadata = { ...(existing?.metadata || {}), [key]: cursor };

    await this.supabase
      .from('sync_status')
      .upsert({
        integration_name: this.name,
        metadata,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'integration_name' });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Pagination Helpers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Paginate through an API endpoint, collecting all results.
   *
   * @param {Function} fetchFn - Async function that accepts { page, cursor, limit } and returns { data, hasMore, cursor? }
   * @param {object} [options]
   * @param {number} [options.pageSize] - Items per page (default: 100)
   * @param {number} [options.maxPages] - Safety limit (default: 100)
   * @param {string} [options.startCursor] - Starting cursor for incremental sync
   * @returns {Promise<Array>} All collected items
   */
  async paginate(fetchFn, options = {}) {
    const { pageSize = 100, maxPages = 100, startCursor = null } = options;
    const allItems = [];
    let page = 1;
    let cursor = startCursor;

    while (page <= maxPages) {
      const result = await fetchFn({ page, cursor, limit: pageSize });
      const items = result.data || [];
      allItems.push(...items);

      if (!result.hasMore || items.length === 0) break;

      cursor = result.cursor || null;
      page++;
    }

    if (page > maxPages) {
      this.warn(`Hit max page limit (${maxPages})`);
    }

    return allItems;
  }

  /**
   * Paginate through Supabase query results.
   *
   * @param {string} table - Table name
   * @param {object} [options]
   * @param {string} [options.select] - Column selection (default: '*')
   * @param {object} [options.filters] - Filters to apply as { column: value }
   * @param {string} [options.orderBy] - Order column
   * @param {number} [options.pageSize] - Items per page (default: 1000)
   * @returns {Promise<Array>}
   */
  async paginateSupabase(table, options = {}) {
    const { select = '*', filters = {}, orderBy = 'id', pageSize = 1000 } = options;
    const allItems = [];
    let from = 0;

    while (true) {
      let query = this.supabase
        .from(table)
        .select(select)
        .order(orderBy)
        .range(from, from + pageSize - 1);

      for (const [col, val] of Object.entries(filters)) {
        query = query.eq(col, val);
      }

      const { data, error } = await query;
      if (error) {
        this.error(`Paginate ${table} failed: ${error.message}`);
        break;
      }

      if (!data || data.length === 0) break;
      allItems.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    return allItems;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Database Helpers
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Upsert a record and track stats.
   *
   * @param {string} table - Target table
   * @param {object} record - Record to upsert
   * @param {string} conflictColumn - Unique column for conflict resolution
   * @returns {Promise<object|null>} Upserted record or null on error
   */
  async upsertRecord(table, record, conflictColumn) {
    if (this.dryRun) {
      this.stats.skipped++;
      return record;
    }

    const { data, error } = await this.supabase
      .from(table)
      .upsert(record, { onConflict: conflictColumn })
      .select()
      .single();

    if (error) {
      this.error(`Upsert to ${table} failed: ${error.message}`, { record });
      return null;
    }

    this.stats.total++;
    return data;
  }

  /**
   * Batch upsert records with progress tracking.
   *
   * @param {string} table - Target table
   * @param {Array<object>} records - Records to upsert
   * @param {string} conflictColumn - Unique column for conflict resolution
   * @param {object} [options]
   * @param {number} [options.batchSize] - Records per batch (default: 100)
   * @returns {Promise<{ success: number, errors: number }>}
   */
  async batchUpsert(table, records, conflictColumn, options = {}) {
    const { batchSize = 100 } = options;
    let success = 0;
    let errors = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      if (this.dryRun) {
        success += batch.length;
        continue;
      }

      const { error } = await this.supabase
        .from(table)
        .upsert(batch, { onConflict: conflictColumn });

      if (error) {
        this.error(`Batch upsert to ${table} failed (batch ${Math.floor(i / batchSize) + 1}): ${error.message}`);
        errors += batch.length;
      } else {
        success += batch.length;
      }
    }

    this.stats.total += success;
    return { success, errors };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Lifecycle
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Override this method with your sync logic.
   * @abstract
   */
  async execute() {
    throw new Error('Subclass must implement execute()');
  }

  /**
   * Run the sync with full lifecycle management:
   * logging, error handling, stats, and status recording.
   */
  async run() {
    this.section(`Starting: ${this.description}`);
    this.startTime = Date.now();

    try {
      await this.execute();

      const durationMs = Date.now() - this.startTime;
      this.printStats();

      await recordSyncStatus(this.supabase, this.name, {
        success: this.stats.errors === 0,
        recordCount: this.stats.total,
        durationMs,
        error: this.stats.errors > 0
          ? `${this.stats.errors} error(s): ${this.errors.slice(0, 3).map(e => e.message).join('; ')}`
          : undefined,
      });

      return { success: true, stats: this.stats, durationMs };

    } catch (err) {
      const durationMs = Date.now() - this.startTime;
      this.error(`Fatal error: ${err.message}`);
      this.printStats();

      await recordSyncStatus(this.supabase, this.name, {
        success: false,
        error: err.message,
        durationMs,
      });

      return { success: false, stats: this.stats, durationMs, error: err.message };
    }
  }
}

/**
 * Create sync stats object (for scripts not using the class).
 *
 * @param {Array<string>} [extraFields] - Additional stat fields
 * @returns {object}
 */
export function createSyncStats(extraFields = []) {
  const stats = { created: 0, updated: 0, skipped: 0, errors: 0, total: 0, startTime: Date.now() };
  for (const field of extraFields) {
    stats[field] = 0;
  }
  return stats;
}

/**
 * Print stats summary (for scripts not using the class).
 *
 * @param {string} name - Sync name
 * @param {object} stats - Stats object from createSyncStats()
 */
export function printSyncStats(name, stats) {
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${name} - Summary`);
  console.log('='.repeat(60));
  console.log(`   Duration:  ${duration}s`);
  for (const [key, val] of Object.entries(stats)) {
    if (key === 'startTime') continue;
    console.log(`   ${key.charAt(0).toUpperCase() + key.slice(1)}:${' '.repeat(Math.max(1, 10 - key.length))}${val}`);
  }
  console.log('');
}

export default { SyncBase, createSyncStats, printSyncStats };
