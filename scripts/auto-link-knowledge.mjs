#!/usr/bin/env node
/**
 * Auto-Link Knowledge
 *
 * Daily script that cross-links related knowledge items based on:
 * 1. Same project + overlapping topics
 * 2. Same participants/contacts
 * 3. Related keywords in titles
 *
 * Uses direct matching, not LLM, so it's fast and cheap.
 *
 * Usage:
 *   node scripts/auto-link-knowledge.mjs
 *   node scripts/auto-link-knowledge.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { recordSyncStatus } from './lib/sync-status.mjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dryRun = process.argv.includes('--dry-run');

console.log(`Auto-linking knowledge items${dryRun ? ' (DRY RUN)' : ''}...`);

// Fetch recent knowledge items (last 90 days)
const since = new Date();
since.setDate(since.getDate() - 90);

const { data: items, error } = await supabase
  .from('project_knowledge')
  .select('id, title, project_code, knowledge_type, topics, participants, contact_ids, recorded_at')
  .gte('recorded_at', since.toISOString())
  .not('topics', 'is', null)
  .order('recorded_at', { ascending: false })
  .limit(500);

if (error) {
  console.error('Failed to fetch knowledge items:', error.message);
  process.exit(1);
}

console.log(`Loaded ${items.length} knowledge items from last 90 days.`);

// Get existing links to avoid duplicates
const { data: existingLinks } = await supabase
  .from('knowledge_links')
  .select('source_id, target_id, link_type');

const linkSet = new Set(
  (existingLinks || []).map(l => `${l.source_id}|${l.target_id}|${l.link_type}`)
);

function linkExists(sourceId, targetId, type) {
  return linkSet.has(`${sourceId}|${targetId}|${type}`) ||
         linkSet.has(`${targetId}|${sourceId}|${type}`);
}

const newLinks = [];

// Strategy 1: Same project + overlapping topics
for (let i = 0; i < items.length; i++) {
  for (let j = i + 1; j < items.length; j++) {
    const a = items[i];
    const b = items[j];

    if (a.id === b.id) continue;
    if (linkExists(a.id, b.id, 'related')) continue;

    // Same project
    if (a.project_code && a.project_code === b.project_code) {
      const aTopics = new Set((a.topics || []).map(t => t.toLowerCase()));
      const bTopics = (b.topics || []).map(t => t.toLowerCase());
      const overlap = bTopics.filter(t => aTopics.has(t));

      if (overlap.length >= 2) {
        const strength = Math.min(0.9, 0.3 + overlap.length * 0.15);
        newLinks.push({
          source_id: a.id,
          target_id: b.id,
          link_type: 'related',
          strength,
          reason: `Shared topics: ${overlap.join(', ')}`,
          auto_generated: true,
        });
        linkSet.add(`${a.id}|${b.id}|related`);
      }
    }

    // Shared contacts
    if (a.contact_ids?.length && b.contact_ids?.length) {
      const aContacts = new Set(a.contact_ids);
      const shared = b.contact_ids.filter(c => aContacts.has(c));
      if (shared.length > 0 && !linkExists(a.id, b.id, 'related')) {
        newLinks.push({
          source_id: a.id,
          target_id: b.id,
          link_type: 'related',
          strength: 0.4 + shared.length * 0.1,
          reason: `Shared contacts (${shared.length})`,
          auto_generated: true,
        });
        linkSet.add(`${a.id}|${b.id}|related`);
      }
    }
  }
}

// Strategy 2: Decision → action_item links (builds_on)
const decisions = items.filter(i => i.knowledge_type === 'decision');
const actions = items.filter(i => i.knowledge_type === 'action_item');

for (const decision of decisions) {
  for (const action of actions) {
    if (decision.project_code !== action.project_code) continue;
    if (linkExists(decision.id, action.id, 'builds_on')) continue;

    // Check if action was recorded after decision and shares topics
    if (new Date(action.recorded_at) >= new Date(decision.recorded_at)) {
      const dTopics = new Set((decision.topics || []).map(t => t.toLowerCase()));
      const overlap = (action.topics || []).filter(t => dTopics.has(t.toLowerCase()));
      if (overlap.length >= 1) {
        newLinks.push({
          source_id: action.id,
          target_id: decision.id,
          link_type: 'builds_on',
          strength: 0.6,
          reason: `Action follows decision on: ${overlap.join(', ')}`,
          auto_generated: true,
        });
        linkSet.add(`${action.id}|${decision.id}|builds_on`);
      }
    }
  }
}

console.log(`Generated ${newLinks.length} new links.`);

if (newLinks.length > 0 && !dryRun) {
  // Insert in batches
  for (let i = 0; i < newLinks.length; i += 100) {
    const chunk = newLinks.slice(i, i + 100);
    const { error: insertErr } = await supabase
      .from('knowledge_links')
      .insert(chunk);
    if (insertErr) {
      console.error(`  Chunk ${i}: ${insertErr.message}`);
    }
  }
  console.log(`Inserted ${newLinks.length} knowledge links.`);
} else if (dryRun) {
  for (const link of newLinks.slice(0, 10)) {
    console.log(`  [DRY RUN] ${link.link_type}: ${link.reason}`);
  }
}

try {
  await recordSyncStatus(supabase, 'knowledge_links', {
    status: 'healthy',
    recordCount: newLinks.length,
  });
} catch (e) {
  console.warn('Could not record sync status:', e.message);
}

console.log('Done.');
