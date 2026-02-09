#!/usr/bin/env node
/**
 * Sync 2026 Goals from Notion to Supabase
 *
 * Fetches goals from the 2026 ACT Goals database in Notion
 * and syncs them to the goals_2026 table in Supabase.
 *
 * Usage:
 *   node scripts/sync-notion-goals.mjs        - Run sync
 *   node scripts/sync-notion-goals.mjs --dry  - Dry run (show what would sync)
 *
 * Environment Variables:
 *   NOTION_API_KEY - Notion integration token
 *   SUPABASE_URL / SUPABASE_SHARED_URL
 *   SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SHARED_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config({ path: '.env.local' });

// ============================================================================
// CONFIGURATION
// ============================================================================

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const GOALS_DATABASE_ID = '9fa589ce-5252-40ab-9fbd-f1c3c26f71d1';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const DRY_RUN = process.argv.includes('--dry');

// ============================================================================
// NOTION API
// ============================================================================

async function queryNotionDatabase(databaseId, startCursor = null) {
  const body = {
    page_size: 100,
  };
  if (startCursor) {
    body.start_cursor = startCursor;
  }

  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function getAllGoals() {
  const goals = [];
  let hasMore = true;
  let startCursor = null;

  while (hasMore) {
    const result = await queryNotionDatabase(GOALS_DATABASE_ID, startCursor);
    goals.push(...result.results);
    hasMore = result.has_more;
    startCursor = result.next_cursor;
  }

  return goals;
}

// ============================================================================
// DATA EXTRACTION
// ============================================================================

function extractTitle(titleProperty) {
  if (!titleProperty || !titleProperty.title) return '';
  return titleProperty.title.map(t => t.plain_text).join('');
}

function extractSelect(selectProperty) {
  if (!selectProperty || !selectProperty.select) return null;
  return selectProperty.select.name;
}

function extractMultiSelect(multiSelectProperty) {
  if (!multiSelectProperty || !multiSelectProperty.multi_select) return [];
  return multiSelectProperty.multi_select.map(s => s.name);
}

function extractRichText(richTextProperty) {
  if (!richTextProperty || !richTextProperty.rich_text) return '';
  return richTextProperty.rich_text.map(t => t.plain_text).join('');
}

function extractDate(dateProperty, field = 'start') {
  if (!dateProperty || !dateProperty.date) return null;
  return dateProperty.date[field] || null;
}

function extractRelation(relationProperty) {
  if (!relationProperty || !relationProperty.relation) return null;
  return relationProperty.relation.length > 0 ? relationProperty.relation[0].id : null;
}

function transformGoal(notionPage) {
  const props = notionPage.properties;

  return {
    notion_id: notionPage.id,
    title: extractTitle(props['Goal'] || props['Name'] || props['Title']),
    type: extractSelect(props['Type']) || 'Yearly Goal',
    lane: extractSelect(props['Lane']),
    status: extractSelect(props['Status']) || 'Not started',
    owner: extractMultiSelect(props['Owner']),
    key_results: extractRichText(props['Key Results'] || props['Key Result']),
    start_date: extractDate(props['Timeline'] || props['Date'], 'start'),
    due_date: extractDate(props['Timeline'] || props['Date'], 'end'),
    parent_goal_id: extractRelation(props['Parent Goal'] || props['Parent']),
    pillar_id: extractRelation(props['Pillar']),
    project_id: extractRelation(props['Project'] || props['Projects']),
    last_update_source: 'notion_sync',
    last_updated_by: 'notion-sync-script',
    synced_at: new Date().toISOString(),
  };
}

// ============================================================================
// SYNC LOGIC
// ============================================================================

async function syncGoals() {
  console.log('\n🎯 ACT 2026 Goals Sync\n');
  console.log('=' .repeat(50));

  if (!NOTION_API_KEY) {
    console.error('❌ NOTION_API_KEY not configured');
    process.exit(1);
  }

  if (!supabase) {
    console.error('❌ Supabase not configured');
    process.exit(1);
  }

  // Fetch all goals from Notion
  console.log('\n📥 Fetching goals from Notion...');
  const notionGoals = await getAllGoals();
  console.log(`   Found ${notionGoals.length} goals`);

  // Transform goals
  const goals = notionGoals.map(transformGoal);

  // Group by lane for display
  const byLane = {
    'A — Core Ops': goals.filter(g => g.lane?.startsWith('A')),
    'B — Platforms': goals.filter(g => g.lane?.startsWith('B')),
    'C — Place/Seasonal': goals.filter(g => g.lane?.startsWith('C')),
    'Unassigned': goals.filter(g => !g.lane),
  };

  console.log('\n📊 Goals by Lane:');
  for (const [lane, laneGoals] of Object.entries(byLane)) {
    if (laneGoals.length > 0) {
      console.log(`   ${lane}: ${laneGoals.length}`);
    }
  }

  // Group by type
  const byType = {
    'Yearly Goal': goals.filter(g => g.type === 'Yearly Goal'),
    'Quarterly Sprint': goals.filter(g => g.type === 'Quarterly Sprint'),
  };

  console.log('\n📅 Goals by Type:');
  for (const [type, typeGoals] of Object.entries(byType)) {
    console.log(`   ${type}: ${typeGoals.length}`);
  }

  if (DRY_RUN) {
    console.log('\n🔍 Dry run - Goals that would be synced:');
    for (const goal of goals.slice(0, 10)) {
      console.log(`   • ${goal.title} (${goal.lane || 'No lane'}) - ${goal.status}`);
    }
    if (goals.length > 10) {
      console.log(`   ... and ${goals.length - 10} more`);
    }
    return;
  }

  // Upsert to Supabase
  console.log('\n📤 Syncing to Supabase...');

  let synced = 0;
  let errors = 0;

  for (const goal of goals) {
    const { error } = await supabase
      .from('goals_2026')
      .upsert(goal, { onConflict: 'notion_id' });

    if (error) {
      console.error(`   ❌ Error syncing "${goal.title}": ${error.message}`);
      errors++;
    } else {
      synced++;
    }
  }

  console.log(`\n✅ Sync complete: ${synced} synced, ${errors} errors`);

  // Show summary
  console.log('\n📋 Summary:');
  const { data: dbGoals } = await supabase.from('goals_2026').select('*');
  if (dbGoals) {
    const completed = dbGoals.filter(g => g.status === 'Completed').length;
    const inProgress = dbGoals.filter(g => g.status === 'In progress').length;
    const planning = dbGoals.filter(g => g.status === 'Planning').length;

    console.log(`   Total in database: ${dbGoals.length}`);
    console.log(`   Completed: ${completed}`);
    console.log(`   In Progress: ${inProgress}`);
    console.log(`   Planning: ${planning}`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

syncGoals().catch(err => {
  console.error('❌ Sync failed:', err.message);
  process.exit(1);
});
