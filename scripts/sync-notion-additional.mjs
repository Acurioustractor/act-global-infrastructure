#!/usr/bin/env node
/**
 * Sync additional Notion databases to Supabase
 *
 * Syncs: Decisions, Meetings, Actions, Planning Calendar, Grant Pipeline
 *
 * Usage:
 *   node scripts/sync-notion-additional.mjs                    # Incremental (last 24h)
 *   node scripts/sync-notion-additional.mjs --full             # Full sync
 *   node scripts/sync-notion-additional.mjs --only decisions   # Only sync decisions
 *   node scripts/sync-notion-additional.mjs --dry-run          # Preview
 *   node scripts/sync-notion-additional.mjs --verbose          # Detailed output
 */

import '../lib/load-env.mjs';
import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { queryDatabase } from './lib/notion-datasource.mjs';
import { recordSyncStatus } from './lib/sync-status.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────

function loadDatabaseIds() {
  return JSON.parse(readFileSync(join(__dirname, '../config/notion-database-ids.json'), 'utf8'));
}

function getNotion() {
  if (!process.env.NOTION_TOKEN) throw new Error('NOTION_TOKEN not set');
  return new Client({ auth: process.env.NOTION_TOKEN });
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
  const key = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
  return createClient(url, key);
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    hours: args.includes('--hours') ? parseInt(args[args.indexOf('--hours') + 1]) : 24,
    full: args.includes('--full'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    only: args.includes('--only') ? args[args.indexOf('--only') + 1] : null,
  };
}

// ─── Notion Helpers ──────────────────────────────────────────────────────────

function getText(prop) {
  if (!prop) return null;
  if (prop.type === 'title') return prop.title?.[0]?.plain_text || null;
  if (prop.type === 'rich_text') return prop.rich_text?.[0]?.plain_text || null;
  if (prop.type === 'select') return prop.select?.name || null;
  if (prop.type === 'multi_select') return prop.multi_select?.map(s => s.name) || [];
  if (prop.type === 'status') return prop.status?.name || null;
  if (prop.type === 'date') return prop.date?.start || null;
  if (prop.type === 'number') return prop.number;
  if (prop.type === 'checkbox') return prop.checkbox;
  if (prop.type === 'people') return prop.people?.map(p => p.name || p.id) || [];
  if (prop.type === 'relation') return prop.relation?.map(r => r.id) || [];
  if (prop.type === 'url') return prop.url || null;
  return null;
}

async function fetchAll(notion, databaseId, options) {
  const pages = [];
  let cursor;

  const filter = options.full ? undefined : {
    timestamp: 'last_edited_time',
    last_edited_time: {
      after: new Date(Date.now() - options.hours * 60 * 60 * 1000).toISOString()
    }
  };

  do {
    const response = await queryDatabase(notion, databaseId, {
      start_cursor: cursor,
      filter,
      page_size: 100,
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }]
    });

    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);

  return pages;
}

// ─── Decisions Sync ──────────────────────────────────────────────────────────

function extractDecision(page) {
  const p = page.properties;
  return {
    notion_id: page.id.replace(/-/g, ''),
    title: getText(p.Name || p.name || p.Title || p.title),
    status: getText(p.Status || p.status),
    priority: getText(p.Priority || p.priority),
    decision_date: getText(p.Date || p.date || p['Decision Date']),
    rationale: getText(p.Rationale || p.rationale || p.Description || p.description),
    project_notion_id: (getText(p.Project || p.project) || [])[0] || null,
    data: Object.fromEntries(
      Object.entries(p).map(([k, v]) => [k, getText(v)])
    ),
    updated_at: page.last_edited_time,
    last_synced: new Date().toISOString(),
  };
}

async function syncDecisions(notion, supabase, databaseId, options) {
  const stats = { fetched: 0, upserted: 0, errors: 0 };

  console.log(`\n── Decisions ──────────────────────────────────────`);
  console.log(`  Fetching (${options.full ? 'full' : `last ${options.hours}h`})...`);

  const pages = await fetchAll(notion, databaseId, options);
  stats.fetched = pages.length;
  console.log(`  Found ${pages.length} decisions`);

  if (pages.length === 0) return stats;

  const records = pages.map(extractDecision);

  if (options.verbose) {
    for (const r of records) {
      console.log(`    ${r.title} [${r.status}] ${r.decision_date || 'no date'}`);
    }
  }

  if (options.dryRun) {
    console.log(`  [DRY-RUN] Would upsert ${records.length} decisions`);
    stats.upserted = records.length;
    return stats;
  }

  // Upsert in batches of 50
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { error } = await supabase
      .from('notion_decisions')
      .upsert(batch, { onConflict: 'notion_id' });

    if (error) {
      console.error(`  ERROR upserting batch: ${error.message}`);
      stats.errors++;
    } else {
      stats.upserted += batch.length;
      if (!options.verbose) process.stdout.write('.');
    }
  }

  if (!options.verbose) console.log('');
  console.log(`  Upserted: ${stats.upserted}, Errors: ${stats.errors}`);

  return stats;
}

// ─── Meetings Sync ───────────────────────────────────────────────────────────

function extractMeeting(page) {
  const p = page.properties;
  return {
    notion_id: page.id.replace(/-/g, ''),
    title: getText(p.Name || p.name || p.Title || p.title),
    status: getText(p.Status || p.status),
    meeting_date: getText(p.Date || p.date),
    attendees: getText(p.Attendees || p.attendees),
    ai_summary: getText(p['AI summary'] || p.ai_summary),
    follow_up_required: getText(p['Follow-up Required']) || false,
    task_status: getText(p['Task Status']),
    assigned_to: (getText(p['Assigned to']) || []).join(', ') || null,
    due_date: getText(p['Due Date']),
    meeting_type: getText(p.Type || p.type),
    project_notion_ids: getText(p.Project || p.project) || [],
    data: Object.fromEntries(Object.entries(p).map(([k, v]) => [k, getText(v)])),
    updated_at: page.last_edited_time,
    last_synced: new Date().toISOString(),
  };
}

async function syncMeetings(notion, supabase, databaseId, options) {
  const stats = { fetched: 0, upserted: 0, errors: 0 };
  console.log(`\n── Meetings ──────────────────────────────────────`);
  console.log(`  Fetching (${options.full ? 'full' : `last ${options.hours}h`})...`);

  const pages = await fetchAll(notion, databaseId, options);
  stats.fetched = pages.length;
  console.log(`  Found ${pages.length} meetings`);
  if (pages.length === 0) return stats;

  const records = pages.map(extractMeeting);
  if (options.verbose) {
    for (const r of records) {
      console.log(`    ${r.title} [${r.task_status}] ${r.meeting_date || 'no date'}`);
    }
  }
  if (options.dryRun) { stats.upserted = records.length; return stats; }

  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { error } = await supabase.from('notion_meetings').upsert(batch, { onConflict: 'notion_id' });
    if (error) { console.error(`  ERROR: ${error.message}`); stats.errors++; }
    else { stats.upserted += batch.length; if (!options.verbose) process.stdout.write('.'); }
  }
  if (!options.verbose) console.log('');
  console.log(`  Upserted: ${stats.upserted}, Errors: ${stats.errors}`);
  return stats;
}

// ─── Actions Sync ────────────────────────────────────────────────────────────

function extractAction(page) {
  const p = page.properties;
  return {
    notion_id: page.id.replace(/-/g, ''),
    title: getText(p['Action Item'] || p.Name || p.name || p.Title || p.title),
    status: getText(p.Status || p.status),
    action_type: getText(p.Type || p.type),
    due_date: getText(p['Due Date'] || p.due_date),
    assigned_to: (getText(p['Assigned to']) || []).join(', ') || null,
    location: getText(p.Location || p.Place),
    themes: getText(p.Theme || p.theme) || [],
    project_notion_ids: getText(p.Projects || p.Project || p.project) || [],
    ai_summary: getText(p['AI summary'] || p.ai_summary),
    data: Object.fromEntries(Object.entries(p).map(([k, v]) => [k, getText(v)])),
    updated_at: page.last_edited_time,
    last_synced: new Date().toISOString(),
  };
}

async function syncActions(notion, supabase, databaseId, options) {
  const stats = { fetched: 0, upserted: 0, errors: 0 };
  console.log(`\n── Actions ───────────────────────────────────────`);
  console.log(`  Fetching (${options.full ? 'full' : `last ${options.hours}h`})...`);

  const pages = await fetchAll(notion, databaseId, options);
  stats.fetched = pages.length;
  console.log(`  Found ${pages.length} actions`);
  if (pages.length === 0) return stats;

  const records = pages.map(extractAction);
  if (options.verbose) {
    for (const r of records) {
      console.log(`    ${(r.title || '').slice(0, 60)} [${r.status}] ${r.due_date || 'no date'}`);
    }
  }
  if (options.dryRun) { stats.upserted = records.length; return stats; }

  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { error } = await supabase.from('notion_actions').upsert(batch, { onConflict: 'notion_id' });
    if (error) { console.error(`  ERROR: ${error.message}`); stats.errors++; }
    else { stats.upserted += batch.length; if (!options.verbose) process.stdout.write('.'); }
  }
  if (!options.verbose) console.log('');
  console.log(`  Upserted: ${stats.upserted}, Errors: ${stats.errors}`);
  return stats;
}

// ─── Calendar Sync ───────────────────────────────────────────────────────────

function extractCalendarEvent(page) {
  const p = page.properties;
  const dateVal = p.Date || p.date;
  return {
    notion_id: page.id.replace(/-/g, ''),
    title: getText(p.Event || p.Name || p.name || p.Title || p.title),
    event_date: dateVal?.date?.start || null,
    event_end_date: dateVal?.date?.end || null,
    status: getText(p.Status || p.status),
    event_type: getText(p.Type || p.type),
    owner: (getText(p.Owner || p.owner) || []).join(', ') || null,
    notes: getText(p.Notes || p.notes),
    project_notion_ids: getText(p.Project || p.project) || [],
    data: Object.fromEntries(Object.entries(p).map(([k, v]) => [k, getText(v)])),
    updated_at: page.last_edited_time,
    last_synced: new Date().toISOString(),
  };
}

async function syncCalendar(notion, supabase, databaseId, options) {
  const stats = { fetched: 0, upserted: 0, errors: 0 };
  console.log(`\n── Planning Calendar ──────────────────────────────`);
  console.log(`  Fetching (${options.full ? 'full' : `last ${options.hours}h`})...`);

  const pages = await fetchAll(notion, databaseId, options);
  stats.fetched = pages.length;
  console.log(`  Found ${pages.length} events`);
  if (pages.length === 0) return stats;

  const records = pages.map(extractCalendarEvent);
  if (options.verbose) {
    for (const r of records) {
      console.log(`    ${(r.title || '').slice(0, 50)} [${r.event_type}] ${r.event_date || 'no date'}`);
    }
  }
  if (options.dryRun) { stats.upserted = records.length; return stats; }

  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { error } = await supabase.from('notion_calendar').upsert(batch, { onConflict: 'notion_id' });
    if (error) { console.error(`  ERROR: ${error.message}`); stats.errors++; }
    else { stats.upserted += batch.length; if (!options.verbose) process.stdout.write('.'); }
  }
  if (!options.verbose) console.log('');
  console.log(`  Upserted: ${stats.upserted}, Errors: ${stats.errors}`);
  return stats;
}

// ─── Grant Pipeline Sync ─────────────────────────────────────────────────────

function extractGrant(page) {
  const p = page.properties;
  return {
    notion_id: page.id.replace(/-/g, ''),
    title: getText(p['Grant Name'] || p.Name || p.name || p.Title || p.title),
    funder: getText(p.Funder || p.funder),
    amount: getText(p.Amount || p.amount),
    stage: getText(p.Stage || p.stage),
    grant_type: getText(p.Type || p.type),
    deadline: getText(p.Deadline || p.deadline),
    readiness_score: getText(p['Readiness Score']),
    project_code: getText(p.Project || p.project),
    application_url: getText(p['Application URL']),
    key_requirements: getText(p['Key Requirements']),
    missing_documents: getText(p['Missing Documents']),
    notes: getText(p.Notes || p.notes),
    last_updated: getText(p['Last Updated']),
    data: Object.fromEntries(Object.entries(p).map(([k, v]) => [k, getText(v)])),
    updated_at: page.last_edited_time,
    last_synced: new Date().toISOString(),
  };
}

async function syncGrants(notion, supabase, databaseId, options) {
  const stats = { fetched: 0, upserted: 0, errors: 0 };
  console.log(`\n── Grant Pipeline ────────────────────────────────`);
  console.log(`  Fetching (${options.full ? 'full' : `last ${options.hours}h`})...`);

  const pages = await fetchAll(notion, databaseId, options);
  stats.fetched = pages.length;
  console.log(`  Found ${pages.length} grants`);
  if (pages.length === 0) return stats;

  const records = pages.map(extractGrant);
  if (options.verbose) {
    for (const r of records) {
      console.log(`    ${(r.title || '').slice(0, 50)} [${r.stage}] $${r.amount || '?'} ${r.deadline || 'no deadline'}`);
    }
  }
  if (options.dryRun) { stats.upserted = records.length; return stats; }

  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { error } = await supabase.from('notion_grants').upsert(batch, { onConflict: 'notion_id' });
    if (error) { console.error(`  ERROR: ${error.message}`); stats.errors++; }
    else { stats.upserted += batch.length; if (!options.verbose) process.stdout.write('.'); }
  }
  if (!options.verbose) console.log('');
  console.log(`  Upserted: ${stats.upserted}, Errors: ${stats.errors}`);
  return stats;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const options = parseArgs();
  const dbIds = loadDatabaseIds();
  const notion = getNotion();
  const supabase = getSupabase();
  const startTime = Date.now();

  console.log('\n===================================================================');
  console.log('   Notion Additional Database Sync');
  console.log('===================================================================');
  if (options.dryRun) console.log('   [DRY-RUN MODE]');

  const results = {};

  // Decisions
  if (!options.only || options.only === 'decisions') {
    if (dbIds.decisions) {
      results.decisions = await syncDecisions(notion, supabase, dbIds.decisions, options);
    }
  }

  // Meetings
  if (!options.only || options.only === 'meetings') {
    if (dbIds.meetings) {
      results.meetings = await syncMeetings(notion, supabase, dbIds.meetings, options);
    }
  }

  // Actions
  if (!options.only || options.only === 'actions') {
    if (dbIds.actions) {
      results.actions = await syncActions(notion, supabase, dbIds.actions, options);
    }
  }

  // Planning Calendar
  if (!options.only || options.only === 'calendar') {
    if (dbIds.planningCalendar) {
      results.calendar = await syncCalendar(notion, supabase, dbIds.planningCalendar, options);
    }
  }

  // Grant Pipeline
  if (!options.only || options.only === 'grants') {
    if (dbIds.grantPipeline) {
      results.grants = await syncGrants(notion, supabase, dbIds.grantPipeline, options);
    }
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n===================================================================');
  console.log('   Sync Complete');
  console.log('===================================================================');

  let totalUpserted = 0;
  let totalErrors = 0;
  for (const [name, s] of Object.entries(results)) {
    console.log(`  ${name}: ${s.fetched} fetched, ${s.upserted} upserted, ${s.errors} errors`);
    totalUpserted += s.upserted;
    totalErrors += s.errors;
  }
  console.log(`  Duration: ${duration}s\n`);

  await recordSyncStatus(supabase, 'sync_notion_additional', {
    success: totalErrors === 0,
    recordCount: totalUpserted,
    durationMs: Date.now() - startTime,
  });

  if (totalErrors > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
