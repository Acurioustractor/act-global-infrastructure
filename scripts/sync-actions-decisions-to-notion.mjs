#!/usr/bin/env node
/**
 * Sync Actions & Decisions to Notion
 *
 * Pushes action items and decisions from project_knowledge to dedicated
 * Notion databases. Supports bidirectional status sync — completing an
 * action in Notion (via checkbox) will update Supabase on next poll.
 *
 * Data flow:
 *   Supabase project_knowledge → Notion Actions DB + Decisions DB
 *   Notion checkbox changes → poll-notion-checkboxes.mjs (existing)
 *
 * Usage:
 *   node scripts/sync-actions-decisions-to-notion.mjs              # Full sync
 *   node scripts/sync-actions-decisions-to-notion.mjs --dry-run    # Preview
 *   node scripts/sync-actions-decisions-to-notion.mjs --verbose    # Detailed
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const notionDbIds = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'notion-database-ids.json'), 'utf-8'));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function verbose(msg) {
  if (VERBOSE) log(msg);
}

// ============================================
// Fetch from Supabase
// ============================================

async function fetchActions() {
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('project_knowledge')
    .select('id, title, content, project_code, project_name, recorded_at, source_url, action_required, follow_up_date, importance, participants')
    .eq('knowledge_type', 'action')
    .gte('recorded_at', sixMonthsAgo)
    .order('recorded_at', { ascending: false })
    .limit(100);

  if (error) {
    log(`Error fetching actions: ${error.message}`);
    return [];
  }
  return data || [];
}

async function fetchDecisions() {
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('project_knowledge')
    .select('id, title, content, project_code, project_name, recorded_at, source_url, decision_status, decision_rationale, importance, participants')
    .eq('knowledge_type', 'decision')
    .gte('recorded_at', oneYearAgo)
    .order('recorded_at', { ascending: false })
    .limit(100);

  if (error) {
    log(`Error fetching decisions: ${error.message}`);
    return [];
  }
  return data || [];
}

// ============================================
// Check existing Notion pages (avoid duplicates)
// ============================================

async function getExistingNotionIds(databaseId) {
  const existing = new Map();
  let cursor;

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    for (const page of response.results) {
      // Look for supabase_id in properties
      const supabaseIdProp = page.properties['Supabase ID'];
      if (supabaseIdProp?.rich_text?.[0]?.plain_text) {
        existing.set(supabaseIdProp.rich_text[0].plain_text, page.id);
      }
    }

    cursor = response.has_more ? response.next_cursor : null;
    if (cursor) await sleep(350);
  } while (cursor);

  return existing;
}

// ============================================
// Upsert to Notion
// ============================================

async function upsertAction(action, databaseId, existingMap, projectPageMap) {
  const notionPageId = existingMap.get(action.id);
  const title = action.title || action.content?.split('\n')[0]?.slice(0, 100) || 'Untitled action';
  const isComplete = !action.action_required;

  // Existing Actions DB uses: 'Action Item' (title), 'Status' (status type), 'Projects' (relation)
  const properties = {
    'Action Item': { title: [{ text: { content: title } }] },
    'Status': { status: { name: isComplete ? 'Done' : 'In progress' } },
    'Supabase ID': { rich_text: [{ text: { content: action.id } }] },
  };

  // Link to project via relation if we can resolve it
  if (action.project_code && projectPageMap.has(action.project_code)) {
    properties['Projects'] = { relation: [{ id: projectPageMap.get(action.project_code) }] };
  }

  if (action.follow_up_date) {
    properties['Due Date'] = { date: { start: action.follow_up_date } };
  }

  if (notionPageId) {
    // Update existing
    verbose(`  Updating action: ${title}`);
    if (!DRY_RUN) {
      await notion.pages.update({ page_id: notionPageId, properties });
      await sleep(350);
    }
    return 'updated';
  } else {
    // Create new
    verbose(`  Creating action: ${title}`);
    if (!DRY_RUN) {
      const children = [];
      if (action.content) {
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: action.content.slice(0, 2000) } }] },
        });
      }
      if (action.source_url) {
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: 'Source: ' } }, { text: { content: action.source_url, link: { url: action.source_url } } }] },
        });
      }

      await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
        children,
      });
      await sleep(350);
    }
    return 'created';
  }
}

async function upsertDecision(decision, databaseId, existingMap, projectPageMap) {
  const notionPageId = existingMap.get(decision.id);
  const title = decision.title || decision.content?.split('\n')[0]?.slice(0, 100) || 'Untitled decision';

  const properties = {
    'Name': { title: [{ text: { content: title } }] },
    'Status': { select: { name: decision.decision_status || 'active' } },
    'Priority': { select: { name: decision.importance || 'normal' } },
    'Date': { date: decision.recorded_at ? { start: decision.recorded_at.split('T')[0] } : null },
    'Supabase ID': { rich_text: [{ text: { content: decision.id } }] },
  };

  // Link to project via relation if we can resolve it
  if (decision.project_code && projectPageMap.has(decision.project_code)) {
    properties['Project'] = { relation: [{ id: projectPageMap.get(decision.project_code) }] };
  }

  // Store rationale in dedicated property
  if (decision.decision_rationale) {
    properties['Rationale'] = { rich_text: [{ text: { content: decision.decision_rationale.slice(0, 2000) } }] };
  }

  if (notionPageId) {
    verbose(`  Updating decision: ${title}`);
    if (!DRY_RUN) {
      await notion.pages.update({ page_id: notionPageId, properties });
      await sleep(350);
    }
    return 'updated';
  } else {
    verbose(`  Creating decision: ${title}`);
    if (!DRY_RUN) {
      const children = [];
      if (decision.content) {
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: decision.content.slice(0, 2000) } }] },
        });
      }
      if (decision.decision_rationale) {
        children.push({
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [{ text: { content: `Rationale: ${decision.decision_rationale.slice(0, 1000)}` } }],
            icon: { type: 'emoji', emoji: '\u{1F4AD}' },
          },
        });
      }
      if (decision.source_url) {
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: 'Source: ' } }, { text: { content: decision.source_url, link: { url: decision.source_url } } }] },
        });
      }

      await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
        children,
      });
      await sleep(350);
    }
    return 'created';
  }
}

// ============================================
// Main
// ============================================

async function main() {
  log('=== Actions & Decisions Notion Sync ===');
  if (DRY_RUN) log('DRY RUN MODE');

  const actionsDbId = notionDbIds.actions;
  const decisionsDbId = notionDbIds.decisions;

  if (!actionsDbId && !decisionsDbId) {
    log('ERROR: No actions or decisions DB IDs in config/notion-database-ids.json');
    log('Create "Actions" and "Decisions" databases in Notion and add their IDs.');
    process.exit(1);
  }

  // Build project code → Notion page ID map for relation linking
  const projectPageMap = new Map();
  const projectsDbId = notionDbIds.actProjects;
  if (projectsDbId) {
    log('Loading project pages for relation linking...');
    let cursor;
    do {
      const response = await notion.databases.query({
        database_id: projectsDbId,
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      for (const page of response.results) {
        // Try to extract project code from title or a Code property
        const titleProp = page.properties['Name'] || page.properties['Project'] || page.properties['Title'];
        const codeProp = page.properties['Code'] || page.properties['Project Code'];
        if (codeProp?.rich_text?.[0]?.plain_text) {
          projectPageMap.set(codeProp.rich_text[0].plain_text, page.id);
        }
        // Also map by title for fuzzy matching
        if (titleProp?.title?.[0]?.plain_text) {
          projectPageMap.set(titleProp.title[0].plain_text, page.id);
        }
      }
      cursor = response.has_more ? response.next_cursor : null;
      if (cursor) await sleep(350);
    } while (cursor);
    verbose(`  Loaded ${projectPageMap.size} project mappings`);
  }

  // Fetch data
  const [actions, decisions] = await Promise.all([
    fetchActions(),
    fetchDecisions(),
  ]);

  log(`Found ${actions.length} actions and ${decisions.length} decisions`);

  // Sync actions
  if (actionsDbId && actions.length > 0) {
    log('\nSyncing actions...');
    const existingActions = await getExistingNotionIds(actionsDbId);
    verbose(`  ${existingActions.size} existing actions in Notion`);

    const stats = { created: 0, updated: 0, errors: 0 };
    for (const action of actions) {
      try {
        const result = await upsertAction(action, actionsDbId, existingActions, projectPageMap);
        stats[result]++;
      } catch (err) {
        log(`  Error syncing action "${action.title}": ${err.message}`);
        stats.errors++;
      }
    }
    log(`Actions: ${stats.created} created, ${stats.updated} updated, ${stats.errors} errors`);
  } else if (!actionsDbId) {
    log('Skipping actions — no DB ID configured');
  }

  // Sync decisions
  if (decisionsDbId && decisions.length > 0) {
    log('\nSyncing decisions...');
    const existingDecisions = await getExistingNotionIds(decisionsDbId);
    verbose(`  ${existingDecisions.size} existing decisions in Notion`);

    const stats = { created: 0, updated: 0, errors: 0 };
    for (const decision of decisions) {
      try {
        const result = await upsertDecision(decision, decisionsDbId, existingDecisions, projectPageMap);
        stats[result]++;
      } catch (err) {
        log(`  Error syncing decision "${decision.title}": ${err.message}`);
        stats.errors++;
      }
    }
    log(`Decisions: ${stats.created} created, ${stats.updated} updated, ${stats.errors} errors`);
  } else if (!decisionsDbId) {
    log('Skipping decisions — no DB ID configured');
  }

  log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
