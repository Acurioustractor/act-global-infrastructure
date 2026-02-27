#!/usr/bin/env node
/**
 * Push Highlights to Notion
 *
 * Reads unprocessed high-value integration_events and creates pages
 * in a "Live Alerts" Notion database. Events include:
 *   - Grant urgency changes (CRITICAL/URGENT)
 *   - Invoice paid / overdue
 *   - Project health drops
 *   - Key contact engagement drops
 *   - Data staleness alerts
 *
 * Usage:
 *   node scripts/push-highlights-to-notion.mjs           # Process unprocessed events
 *   node scripts/push-highlights-to-notion.mjs --dry-run # Preview without writing
 *   node scripts/push-highlights-to-notion.mjs --verbose  # Detailed output
 *
 * Schedule: Every 30 minutes via PM2
 */

import '../lib/load-env.mjs';
import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { recordSyncStatus } from './lib/sync-status.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// The "Live Alerts" database — will need to be created in Notion first
// and its ID added to config/notion-database-ids.json as "liveAlerts"
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbIds = JSON.parse(readFileSync(join(__dirname, '../config/notion-database-ids.json'), 'utf8'));
const ALERTS_DB_ID = dbIds.liveAlerts;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose') || args.includes('-v');

const HIGHLIGHT_EVENT_TYPES = [
  'grant_urgency_change',
  'invoice_paid',
  'invoice_overdue',
  'project_health_drop',
  'engagement_drop',
  'staleness_alert',
  'grant_deadline_critical',
];

function verbose(...msg) {
  if (VERBOSE) console.log(...msg);
}

function severityEmoji(type) {
  if (type.includes('critical') || type.includes('overdue') || type.includes('drop')) return '🔴';
  if (type.includes('urgency') || type.includes('staleness')) return '🟡';
  if (type.includes('paid')) return '🟢';
  return '🔵';
}

function categoryFromType(type) {
  if (type.includes('grant')) return 'Grants';
  if (type.includes('invoice')) return 'Finance';
  if (type.includes('health')) return 'Projects';
  if (type.includes('engagement')) return 'Relationships';
  if (type.includes('staleness')) return 'Infrastructure';
  return 'General';
}

async function main() {
  const start = Date.now();

  if (!ALERTS_DB_ID) {
    console.error('❌ No liveAlerts database ID in config/notion-database-ids.json');
    console.error('   Create a "Live Alerts" database in Notion and add its ID first.');
    process.exit(1);
  }

  // Fetch unprocessed highlight events
  const { data: events, error } = await supabase
    .from('integration_events')
    .select('id, source, event_type, entity_type, entity_id, payload, created_at')
    .in('event_type', HIGHLIGHT_EVENT_TYPES)
    .is('processed_at', null)
    .order('created_at', { ascending: true })
    .limit(20);

  if (error) {
    console.error('Failed to fetch events:', error.message);
    process.exit(1);
  }

  if (!events?.length) {
    verbose('No unprocessed highlights.');
    await recordSyncStatus(supabase, 'push_highlights_notion', { success: true, recordCount: 0, durationMs: Date.now() - start });
    return;
  }

  console.log(`Processing ${events.length} highlight event(s)...`);

  let created = 0;
  let errors = 0;

  for (const event of events) {
    const payload = event.payload || {};
    const title = payload.message || payload.title || `${event.event_type}: ${event.entity_id || 'system'}`;
    const category = categoryFromType(event.event_type);
    const emoji = severityEmoji(event.event_type);

    verbose(`  ${emoji} ${title}`);

    if (!DRY_RUN) {
      try {
        await notion.pages.create({
          parent: { database_id: ALERTS_DB_ID },
          properties: {
            'Name': { title: [{ text: { content: `${emoji} ${title}`.slice(0, 200) } }] },
            'Category': { select: { name: category } },
            'Event Type': { rich_text: [{ text: { content: event.event_type } }] },
            'Source': { rich_text: [{ text: { content: event.source || 'unknown' } }] },
            'Date': { date: { start: event.created_at.split('T')[0] } },
          },
          children: payload.details ? [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: { rich_text: [{ text: { content: typeof payload.details === 'string' ? payload.details : JSON.stringify(payload.details, null, 2) } }] },
            },
          ] : [],
        });

        // Mark event as processed
        await supabase
          .from('integration_events')
          .update({ processed_at: new Date().toISOString(), action: 'notion_alert_created' })
          .eq('id', event.id);

        created++;
      } catch (err) {
        console.error(`  Failed to create page for event ${event.id}:`, err.message);
        await supabase
          .from('integration_events')
          .update({ error: err.message })
          .eq('id', event.id);
        errors++;
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 350));
    } else {
      created++;
    }
  }

  console.log(`\n✅ Push complete: ${created} alerts created, ${errors} errors${DRY_RUN ? ' (DRY RUN)' : ''}`);

  await recordSyncStatus(supabase, 'push_highlights_notion', {
    success: errors === 0,
    recordCount: created,
    durationMs: Date.now() - start,
  });
}

main().catch(async (err) => {
  console.error('Fatal error:', err.message);
  await recordSyncStatus(supabase, 'push_highlights_notion', { success: false, error: err.message });
  process.exit(1);
});
