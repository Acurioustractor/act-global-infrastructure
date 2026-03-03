#!/usr/bin/env node
/**
 * Meeting Intelligence — Cron Wrapper
 *
 * Runs LLM-based intelligence extraction on unprocessed meetings.
 * When Notion AI has already provided summary + action items (via transcription),
 * those are used directly — LLM is only called for fields Notion doesn't provide
 * (strategic_relevance, financial_mentions, sentiment, people_mentioned).
 *
 * Usage:
 *   node scripts/run-meeting-intelligence.mjs [--verbose] [--dry-run] [--limit N]
 *
 * Cron: Daily 6am AEST (after meeting-sync at 5:30am)
 */

import { createClient } from '@supabase/supabase-js';
import { MeetingIntelligence } from './lib/meeting-intelligence.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 50;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log('\n===================================================================');
  console.log('   Meeting Intelligence Extraction');
  console.log('===================================================================\n');

  if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const mi = new MeetingIntelligence({ supabase, verbose, dryRun });

  const startTime = Date.now();

  try {
    // Process unprocessed meetings
    const results = await mi.processUnprocessedMeetings(limit);

    const totalActions = results.reduce((s, r) => s + (r?.actionItems?.length || 0), 0);
    const totalDecisions = results.reduce((s, r) => s + (r?.decisions?.length || 0), 0);
    const totalEdges = results.reduce((s, r) => s + (r?.edges || 0), 0);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n===================================================================');
    console.log('   Meeting Intelligence Complete');
    console.log('===================================================================\n');
    console.log(`   Meetings processed: ${results.length}`);
    console.log(`   Action items:       ${totalActions}`);
    console.log(`   Decisions:          ${totalDecisions}`);
    console.log(`   Graph edges:        ${totalEdges}`);
    console.log(`   Duration:           ${duration}s\n`);

    // Report to sync_status for integration health
    if (!dryRun) {
      try {
        await supabase.from('sync_status').upsert({
          integration_name: 'meeting_intelligence',
          status: 'healthy',
          last_success_at: new Date().toISOString(),
          last_attempt_at: new Date().toISOString(),
          record_count: results.length,
          avg_duration_ms: Date.now() - startTime,
          last_error: null,
        }, { onConflict: 'integration_name' });
      } catch { /* sync_status is optional */ }
    }
  } catch (error) {
    console.error('\nMeeting intelligence failed:', error.message);

    // Report failure to sync_status
    try {
      await supabase.from('sync_status').upsert({
        integration_name: 'meeting_intelligence',
        status: 'error',
        last_attempt_at: new Date().toISOString(),
        last_error: error.message,
      }, { onConflict: 'integration_name' });
    } catch { /* sync_status is optional */ }

    process.exit(1);
  }
}

main();
