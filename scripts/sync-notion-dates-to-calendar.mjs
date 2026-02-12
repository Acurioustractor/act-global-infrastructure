#!/usr/bin/env node

/**
 * Sync Notion date items to calendar_events
 *
 * Pulls actions (due dates), meetings, and decisions from project_knowledge
 * and upserts them as calendar events with sync_source='notion'.
 *
 * Usage:
 *   node scripts/sync-notion-dates-to-calendar.mjs              # Default sync
 *   node scripts/sync-notion-dates-to-calendar.mjs --dry-run    # Preview without writing
 *   node scripts/sync-notion-dates-to-calendar.mjs --verbose    # Detailed output
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

// Load secrets from Bitwarden
let secretCache = null;

function loadSecrets() {
  if (secretCache) return secretCache;
  try {
    const token = execSync(
      'security find-generic-password -a "bws" -s "act-personal-ai" -w 2>/dev/null',
      { encoding: 'utf8' }
    ).trim();

    const result = execSync(
      `BWS_ACCESS_TOKEN="${token}" ~/bin/bws secret list --output json 2>/dev/null`,
      { encoding: 'utf8' }
    );
    const secrets = JSON.parse(result);
    secretCache = {};
    for (const s of secrets) {
      secretCache[s.key] = s.value;
    }
    return secretCache;
  } catch (e) {
    return {};
  }
}

function getSecret(name) {
  const secrets = loadSecrets();
  return secrets[name] || process.env[name];
}

function getSupabase() {
  const url = getSecret('SUPABASE_SHARED_URL') || getSecret('SUPABASE_URL') || getSecret('NEXT_PUBLIC_SUPABASE_URL');
  const key = getSecret('SUPABASE_SHARED_SERVICE_ROLE_KEY') || getSecret('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key);
}

// Virtual calendar IDs for Notion sources
const NOTION_CALENDARS = {
  action: { id: 'notion-actions', name: 'Notion Actions', color: '#ef4444' },
  meeting: { id: 'notion-meetings', name: 'Notion Meetings', color: '#3b82f6' },
  decision: { id: 'notion-decisions', name: 'Notion Decisions', color: '#f59e0b' },
};

// Map knowledge_type to event_type
const TYPE_MAP = {
  action: 'deadline',
  meeting: 'meeting',
  decision: 'milestone',
};

async function syncNotionDates(options = {}) {
  const { dryRun = false, verbose = false } = options;

  console.log('\n📅 Notion Dates → Calendar Sync\n');

  const supabase = getSupabase();
  const now = new Date();

  // Date range: 1 month back, 3 months forward
  const pastDate = new Date(now);
  pastDate.setMonth(pastDate.getMonth() - 1);
  const futureDate = new Date(now);
  futureDate.setMonth(futureDate.getMonth() + 3);

  const pastStr = pastDate.toISOString().split('T')[0];
  const futureStr = futureDate.toISOString().split('T')[0];

  console.log(`Date range: ${pastStr} to ${futureStr}\n`);

  // Fetch actions with follow_up_date
  const { data: actions, error: actionsErr } = await supabase
    .from('project_knowledge')
    .select('id, title, project_code, follow_up_date, action_required, knowledge_type')
    .eq('knowledge_type', 'action')
    .not('follow_up_date', 'is', null)
    .gte('follow_up_date', pastStr)
    .lte('follow_up_date', futureStr)
    .order('follow_up_date', { ascending: true });

  if (actionsErr) {
    console.error('Error fetching actions:', actionsErr.message);
  }

  // Fetch meetings with recorded_at
  const { data: meetings, error: meetingsErr } = await supabase
    .from('project_knowledge')
    .select('id, title, project_code, recorded_at, knowledge_type')
    .eq('knowledge_type', 'meeting')
    .not('recorded_at', 'is', null)
    .gte('recorded_at', pastDate.toISOString())
    .lte('recorded_at', futureDate.toISOString())
    .order('recorded_at', { ascending: true });

  if (meetingsErr) {
    console.error('Error fetching meetings:', meetingsErr.message);
  }

  // Fetch decisions with recorded_at
  const { data: decisions, error: decisionsErr } = await supabase
    .from('project_knowledge')
    .select('id, title, project_code, recorded_at, knowledge_type')
    .eq('knowledge_type', 'decision')
    .not('recorded_at', 'is', null)
    .gte('recorded_at', pastDate.toISOString())
    .lte('recorded_at', futureDate.toISOString())
    .order('recorded_at', { ascending: true });

  if (decisionsErr) {
    console.error('Error fetching decisions:', decisionsErr.message);
  }

  console.log(`Found:`);
  console.log(`  Actions with due dates: ${(actions || []).length}`);
  console.log(`  Meetings: ${(meetings || []).length}`);
  console.log(`  Decisions: ${(decisions || []).length}`);
  console.log();

  // Transform to calendar events
  const calendarEvents = [];

  for (const item of (actions || [])) {
    const cal = NOTION_CALENDARS.action;
    calendarEvents.push({
      google_event_id: `notion-action-${item.id}`,
      google_calendar_id: cal.id,
      calendar_name: cal.name,
      calendar_color: cal.color,
      title: item.title || '(Untitled action)',
      start_time: `${item.follow_up_date}T09:00:00+10:00`,
      end_time: `${item.follow_up_date}T09:00:00+10:00`,
      is_all_day: true,
      event_type: TYPE_MAP.action,
      project_code: item.project_code,
      detected_project_code: item.project_code,
      status: item.action_required ? 'confirmed' : 'completed',
      sync_source: 'notion',
      synced_at: now.toISOString(),
      metadata: JSON.stringify({ knowledge_id: item.id, knowledge_type: 'action' }),
    });
  }

  for (const item of (meetings || [])) {
    const cal = NOTION_CALENDARS.meeting;
    const dateStr = new Date(item.recorded_at).toISOString();
    calendarEvents.push({
      google_event_id: `notion-meeting-${item.id}`,
      google_calendar_id: cal.id,
      calendar_name: cal.name,
      calendar_color: cal.color,
      title: item.title || '(Untitled meeting)',
      start_time: dateStr,
      end_time: dateStr,
      is_all_day: false,
      event_type: TYPE_MAP.meeting,
      project_code: item.project_code,
      detected_project_code: item.project_code,
      status: 'confirmed',
      sync_source: 'notion',
      synced_at: now.toISOString(),
      metadata: JSON.stringify({ knowledge_id: item.id, knowledge_type: 'meeting' }),
    });
  }

  for (const item of (decisions || [])) {
    const cal = NOTION_CALENDARS.decision;
    const dateStr = new Date(item.recorded_at).toISOString();
    calendarEvents.push({
      google_event_id: `notion-decision-${item.id}`,
      google_calendar_id: cal.id,
      calendar_name: cal.name,
      calendar_color: cal.color,
      title: item.title || '(Untitled decision)',
      start_time: dateStr,
      end_time: dateStr,
      is_all_day: true,
      event_type: TYPE_MAP.decision,
      project_code: item.project_code,
      detected_project_code: item.project_code,
      status: 'confirmed',
      sync_source: 'notion',
      synced_at: now.toISOString(),
      metadata: JSON.stringify({ knowledge_id: item.id, knowledge_type: 'decision' }),
    });
  }

  console.log(`Total calendar events to sync: ${calendarEvents.length}\n`);

  if (verbose) {
    console.log('Sample events:');
    for (const event of calendarEvents.slice(0, 5)) {
      console.log(`  - [${event.google_calendar_id}] ${event.title}`);
      console.log(`    Date: ${event.start_time}`);
      console.log(`    Type: ${event.event_type}`);
      console.log(`    Project: ${event.project_code || '(none)'}`);
      console.log();
    }
  }

  if (dryRun) {
    console.log('DRY RUN - No changes written to database\n');
    return;
  }

  // Upsert in batches
  const batchSize = 50;
  let synced = 0;
  let errors = 0;

  for (let i = 0; i < calendarEvents.length; i += batchSize) {
    const batch = calendarEvents.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('calendar_events')
      .upsert(batch, {
        onConflict: 'google_event_id',
        ignoreDuplicates: false,
      })
      .select('id');

    if (error) {
      console.error(`Error in batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      errors += batch.length;
    } else {
      synced += data?.length || 0;
    }
  }

  console.log('✅ Sync complete!');
  console.log(`  Total: ${calendarEvents.length}`);
  console.log(`  Synced: ${synced}`);
  console.log(`  Errors: ${errors}`);
  console.log();
}

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose') || args.includes('-v'),
};

try {
  await syncNotionDates(options);
} catch (err) {
  console.error('\n❌ Error:', err.message);
  if (options.verbose) console.error(err.stack);
  process.exit(1);
}
