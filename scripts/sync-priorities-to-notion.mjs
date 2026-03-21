#!/usr/bin/env node

/**
 * Sync Daily Priorities to Notion Mission Control OS Database
 *
 * Reads sprint_suggestions from Supabase and upserts them as rows in the
 * Mission Control OS Notion database. This gives a clean, filterable,
 * sortable Notion view of daily priorities.
 *
 * Mapping:
 *   sprint_suggestions.source_type → Notion Type + Domain
 *     invoice_chase       → Alert, Finance
 *     grant_deadline      → Action, Finance
 *     deal_risk           → Alert, Partnerships
 *     email_followup      → Action, Partnerships
 *     overdue_action      → Action, Ops
 *     pipeline_progression → Focus, Projects
 *
 *   sprint_suggestions.priority → Notion Priority
 *     'now'  → Critical
 *     'next' → High
 *
 *   sprint_suggestions.notes (JSON) → Value (amount), Summary (action)
 *
 * PM2 cron: daily at 6:45am AEST (after priorities at 6:30, before briefing at 7)
 *
 * Usage:
 *   node scripts/sync-priorities-to-notion.mjs              # Full sync
 *   node scripts/sync-priorities-to-notion.mjs --dry-run    # Preview only
 *   node scripts/sync-priorities-to-notion.mjs --verbose    # Detailed output
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

// Mission Control OS database ID (from Notion page inspection)
const MISSION_CONTROL_OS_DB = '3db68c5f-91f2-47db-bcc2-c721992b904e';

// Prefix used to identify synced items (so we don't touch manually-added items)
const SYNC_TAG = '[auto]';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

function log(...args) { console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...args); }
function verbose(...args) { if (VERBOSE) log(...args); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Mapping ───────────────────────────────────────────────────────────

const SOURCE_TYPE_MAP = {
  invoice_chase:        { type: 'Alert',  domain: ['Finance'] },
  grant_deadline:       { type: 'Action', domain: ['Finance', 'Projects'] },
  deal_risk:            { type: 'Alert',  domain: ['Partnerships'] },
  email_followup:       { type: 'Action', domain: ['Partnerships'] },
  overdue_action:       { type: 'Action', domain: ['Ops'] },
  pipeline_progression: { type: 'Focus',  domain: ['Projects'] },
};

const PRIORITY_MAP = {
  now:  'Critical',
  next: 'High',
};

function parseNotes(notesStr) {
  if (!notesStr) return {};
  try {
    return JSON.parse(notesStr);
  } catch {
    return {};
  }
}

function buildNotionProperties(item) {
  const notes = parseNotes(item.notes);
  const mapping = SOURCE_TYPE_MAP[item.source_type] || { type: 'Action', domain: ['Ops'] };

  const props = {
    Title: {
      title: [{ text: { content: `${SYNC_TAG} ${item.title}`.slice(0, 2000) } }],
    },
    Type: {
      select: { name: mapping.type },
    },
    Priority: {
      select: { name: PRIORITY_MAP[item.priority] || 'Medium' },
    },
    Status: {
      status: { name: 'Queued' },
    },
    Domain: {
      multi_select: mapping.domain.map(d => ({ name: d })),
    },
    Active: {
      checkbox: true,
    },
  };

  // Value — extract amount from notes
  const amount = notes.amount || notes.value;
  if (amount && typeof amount === 'number' && amount > 0) {
    props.Value = { number: amount };
  }

  // Summary — use the action from notes
  const summary = notes.action || '';
  if (summary) {
    props.Summary = {
      rich_text: [{ text: { content: summary.slice(0, 2000) } }],
    };
  }

  // Due date
  if (item.due_date) {
    props.Due = {
      date: { start: item.due_date.split('T')[0] },
    };
  }

  return props;
}

// ── Fetch existing synced items from Notion ───────────────────────────

async function queryDatabase(databaseId, filter, startCursor) {
  const body = { filter, page_size: 100 };
  if (startCursor) body.start_cursor = startCursor;

  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Notion query failed: ${err.message}`);
  }
  return res.json();
}

async function getExistingSyncedItems() {
  const items = [];
  let cursor;

  do {
    const response = await queryDatabase(
      MISSION_CONTROL_OS_DB,
      { property: 'Title', title: { starts_with: SYNC_TAG } },
      cursor
    );

    items.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
    if (cursor) await sleep(350);
  } while (cursor);

  return items;
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  log('=== Sync Priorities to Notion ===');
  if (DRY_RUN) log('DRY RUN MODE');

  // 1. Fetch active sprint_suggestions from Supabase
  const { data: suggestions, error } = await supabase
    .from('sprint_suggestions')
    .select('*')
    .eq('dismissed', false)
    .is('promoted_to', null)
    .order('priority', { ascending: false }) // 'now' before 'next'
    .limit(20);

  if (error) {
    log('ERROR fetching sprint_suggestions:', error.message);
    process.exit(1);
  }

  log(`Found ${suggestions.length} active suggestions in Supabase`);

  if (suggestions.length === 0) {
    log('No suggestions to sync');
    return;
  }

  // 2. Fetch existing synced items from Notion
  const existingPages = await getExistingSyncedItems();
  log(`Found ${existingPages.length} existing [auto] items in Notion`);

  // Build lookup: source_type::source_ref → Notion page ID
  const existingMap = new Map();
  for (const page of existingPages) {
    const title = page.properties?.Title?.title?.[0]?.text?.content || '';
    existingMap.set(title, page.id);
  }

  // 3. Build dedup key from suggestion → title (since that's what we tag with [auto])
  const suggestionTitles = new Set();

  let created = 0;
  let updated = 0;
  let archived = 0;

  for (const item of suggestions) {
    const props = buildNotionProperties(item);
    const titleText = `${SYNC_TAG} ${item.title}`.slice(0, 2000);
    suggestionTitles.add(titleText);

    if (DRY_RUN) {
      const notionPriority = PRIORITY_MAP[item.priority] || 'Medium';
      const mapping = SOURCE_TYPE_MAP[item.source_type] || { type: 'Action', domain: ['Ops'] };
      verbose(`  Would sync: [${notionPriority}] ${item.title} → Type:${mapping.type} Domain:${mapping.domain.join(',')}`);
      continue;
    }

    // Check if exists in Notion already
    if (existingMap.has(titleText)) {
      // Update existing page (refresh priority, status, value)
      const pageId = existingMap.get(titleText);
      try {
        await notion.pages.update({ page_id: pageId, properties: props });
        updated++;
        verbose(`  Updated: ${item.title}`);
      } catch (err) {
        log(`  Warning: failed to update ${pageId}: ${err.message}`);
      }
    } else {
      // Create new page in database
      try {
        await notion.pages.create({
          parent: { database_id: MISSION_CONTROL_OS_DB },
          properties: props,
        });
        created++;
        verbose(`  Created: ${item.title}`);
      } catch (err) {
        log(`  Warning: failed to create "${item.title}": ${err.message}`);
      }
    }

    await sleep(350); // Rate limit: ~3 req/sec
  }

  // 4. Archive stale synced items (in Notion but no longer in suggestions)
  if (!DRY_RUN) {
    for (const page of existingPages) {
      const title = page.properties?.Title?.title?.[0]?.text?.content || '';
      if (!suggestionTitles.has(title)) {
        try {
          await notion.pages.update({
            page_id: page.id,
            properties: {
              Status: { status: { name: 'Done' } },
              Active: { checkbox: false },
            },
          });
          archived++;
          verbose(`  Archived: ${title}`);
        } catch (err) {
          verbose(`  Warning: failed to archive ${page.id}: ${err.message}`);
        }
        await sleep(350);
      }
    }
  }

  // Summary
  if (DRY_RUN) {
    log(`\n[DRY RUN] Would sync ${suggestions.length} items to Notion Mission Control OS`);
    for (const item of suggestions) {
      const badge = item.priority === 'now' ? 'NOW' : 'NEXT';
      const notes = parseNotes(item.notes);
      log(`  [${badge}] ${item.title} → score:${notes.score || '?'}`);
    }
  } else {
    log(`\nSync complete: ${created} created, ${updated} updated, ${archived} archived`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
