#!/usr/bin/env node
/**
 * Batch Contact Enrichment Runner
 *
 * Enriches contacts using external data sources:
 * - Tavily web search (company/person lookup)
 * - Direct website fetch (company metadata)
 * - LinkedIn cross-reference (from imported connections)
 * - GitHub profile lookup
 * - OpenAI extraction (role, sector, org)
 * - ACT project alignment
 *
 * USAGE:
 *   node scripts/enrich-contacts-external.mjs [options]
 *
 * OPTIONS:
 *   --limit <n>      Max contacts to process (default: 50)
 *   --status <s>     Filter by enrichment_status (default: pending)
 *   --include-stale  Also re-enrich contacts older than 30 days
 *   --dry-run        Preview without writing changes
 *   --contact <id>   Enrich a single contact
 *   --email <email>  Enrich by email address
 *   --stats          Show enrichment statistics
 *   --verbose        Verbose output
 *
 * CRON: Daily 4am AEST — enriches pending contacts before daily briefing at 7am
 */

import '../lib/load-env.mjs';
import { ContactEnricher } from './lib/contact-enricher.mjs';
import { recordSyncStatus } from './lib/sync-status.mjs';
import { getSupabase } from './lib/supabase-client.mjs';

const args = process.argv.slice(2);
const flags = {
  limit: parseInt(args.find((_, i) => args[i - 1] === '--limit') || '50'),
  status: args.find((_, i) => args[i - 1] === '--status') || 'pending',
  includeStale: args.includes('--include-stale'),
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
  contactId: args.find((_, i) => args[i - 1] === '--contact'),
  email: args.find((_, i) => args[i - 1] === '--email'),
  showStats: args.includes('--stats'),
};

const supabase = getSupabase();
const startTime = Date.now();

const enricher = new ContactEnricher({
  supabase,
  verbose: flags.verbose,
  dryRun: flags.dryRun,
});

try {
  let result;

  if (flags.showStats) {
    // Just show stats
    const stats = await enricher.getEnrichmentStats();
    console.log('\n📊 Contact Enrichment Stats:');
    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
  }

  if (flags.contactId) {
    // Single contact
    console.log(`Enriching contact: ${flags.contactId}`);
    result = await enricher.enrichContact(flags.contactId);
    console.log(JSON.stringify(result, null, 2));
  } else if (flags.email) {
    // Single by email
    console.log(`Enriching by email: ${flags.email}`);
    result = await enricher.enrichByEmail(flags.email);
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Batch mode
    console.log(`\n🔄 Contact Enrichment Batch`);
    console.log(`  Limit: ${flags.limit}`);
    console.log(`  Status filter: ${flags.status}`);
    console.log(`  Include stale: ${flags.includeStale}`);
    console.log(`  Dry run: ${flags.dryRun}`);
    console.log('');

    result = await enricher.enrichBatch({
      limit: flags.limit,
      status: flags.status,
      includeStale: flags.includeStale,
    });

    const durationMs = Date.now() - startTime;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Enrichment Summary:');
    console.log(`  Enriched: ${result.stats?.enriched || 0}`);
    console.log(`  Skipped:  ${result.stats?.skipped || 0}`);
    console.log(`  Errors:   ${result.stats?.errors || 0}`);
    console.log(`  Total:    ${result.stats?.total || 0}`);
    console.log(`  Duration: ${(durationMs / 1000).toFixed(1)}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Record sync status for monitoring
    if (!flags.dryRun) {
      await recordSyncStatus(supabase, 'contact-enrichment', {
        success: (result.stats?.errors || 0) === 0,
        recordCount: result.stats?.enriched || 0,
        durationMs,
        error: result.stats?.errors > 0
          ? `${result.stats.errors} contacts failed enrichment`
          : undefined,
      });
    }
  }
} catch (err) {
  console.error('\n❌ Enrichment failed:', err.message);

  // Record failure
  await recordSyncStatus(supabase, 'contact-enrichment', {
    success: false,
    durationMs: Date.now() - startTime,
    error: err.message,
  });

  process.exit(1);
}
