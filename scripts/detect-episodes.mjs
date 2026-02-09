#!/usr/bin/env node
/**
 * Detect and Create Memory Episodes
 *
 * Clusters project_knowledge items by project_code + time window
 * into coherent episodes stored in memory_episodes.
 *
 * Algorithm:
 *   1. Group knowledge items by project_code
 *   2. Within each project, cluster items within 7-day windows
 *   3. For each cluster with 3+ items, create an episode
 *   4. Generate embedding for each episode using its summary
 *
 * Usage:
 *   node scripts/detect-episodes.mjs             # Detect and create episodes
 *   node scripts/detect-episodes.mjs --dry-run   # Preview without changes
 *   node scripts/detect-episodes.mjs --stats      # Show episode stats only
 */

import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(import.meta.dirname, '..', '.env.local'), override: true });

import { createClient } from '@supabase/supabase-js';
import { trackedBatchEmbedding } from './lib/llm-client.mjs';

const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SCRIPT_NAME = 'detect-episodes.mjs';
const WINDOW_DAYS = 7;       // Cluster items within 7-day windows
const MIN_ITEMS = 2;         // Minimum items to form an episode
const GAP_DAYS = 14;         // Gap between items to split episodes

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const statsOnly = args.includes('--stats');

function inferEpisodeType(items) {
  const types = {};
  for (const item of items) {
    types[item.knowledge_type] = (types[item.knowledge_type] || 0) + 1;
  }
  if (types.decision > 0 && types.decision >= (items.length * 0.3)) return 'decision_sequence';
  if (types.meeting > 0 && types.meeting >= (items.length * 0.5)) return 'project_phase';
  return 'project_phase';
}

function generateTitle(projectCode, items, startDate, endDate) {
  // Try to extract a meaningful title from the cluster
  const meetings = items.filter(i => i.knowledge_type === 'meeting');
  const decisions = items.filter(i => i.knowledge_type === 'decision');
  const actions = items.filter(i => i.knowledge_type === 'action');

  // Use common topics
  const topicCounts = {};
  for (const item of items) {
    for (const t of item.topics || []) {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    }
  }
  const topTopic = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const start = new Date(startDate);
  const end = new Date(endDate);
  const month = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  if (topTopic) {
    return `${projectCode}: ${topTopic} (${month})`;
  }
  if (decisions.length > 0) {
    return `${projectCode}: Decision Phase (${month})`;
  }
  if (meetings.length >= 2) {
    return `${projectCode}: Planning & Review (${month})`;
  }
  return `${projectCode}: Activity Cluster (${month})`;
}

function generateSummary(items) {
  const meetings = items.filter(i => i.knowledge_type === 'meeting');
  const decisions = items.filter(i => i.knowledge_type === 'decision');
  const actions = items.filter(i => i.knowledge_type === 'action');

  const parts = [];
  if (meetings.length > 0) {
    parts.push(`${meetings.length} meeting${meetings.length > 1 ? 's' : ''}: ${meetings.map(m => m.title).join('; ')}`);
  }
  if (decisions.length > 0) {
    parts.push(`${decisions.length} decision${decisions.length > 1 ? 's' : ''}: ${decisions.map(d => d.title).join('; ')}`);
  }
  if (actions.length > 0) {
    parts.push(`${actions.length} action${actions.length > 1 ? 's' : ''}: ${actions.slice(0, 3).map(a => a.title).join('; ')}`);
    if (actions.length > 3) parts[parts.length - 1] += ` (+${actions.length - 3} more)`;
  }
  return parts.join('. ');
}

function clusterByTimeWindow(items) {
  if (items.length === 0) return [];

  // Sort by date
  const sorted = items
    .filter(i => i.recorded_at)
    .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

  if (sorted.length === 0) return [];

  const clusters = [];
  let currentCluster = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].recorded_at);
    const curr = new Date(sorted[i].recorded_at);
    const daysDiff = (curr - prev) / (1000 * 60 * 60 * 24);

    if (daysDiff > GAP_DAYS) {
      // Start new cluster
      if (currentCluster.length >= MIN_ITEMS) {
        clusters.push(currentCluster);
      }
      currentCluster = [sorted[i]];
    } else {
      currentCluster.push(sorted[i]);
    }
  }

  // Don't forget the last cluster
  if (currentCluster.length >= MIN_ITEMS) {
    clusters.push(currentCluster);
  }

  return clusters;
}

async function main() {
  console.log('=== Episode Detection ===');
  if (dryRun) console.log('DRY RUN — no changes will be made');
  console.log('');

  // Check existing episodes
  const { count: existingCount } = await supabase
    .from('memory_episodes')
    .select('id', { count: 'exact', head: true });

  console.log(`Existing episodes: ${existingCount || 0}`);

  if (statsOnly && existingCount > 0) {
    const { data: episodes } = await supabase
      .from('memory_episodes')
      .select('id, title, episode_type, project_code, status, started_at, ended_at')
      .order('started_at', { ascending: false });

    console.log('');
    for (const ep of episodes || []) {
      console.log(`  [${ep.episode_type}] ${ep.title} (${ep.status})`);
      console.log(`    ${ep.started_at?.slice(0, 10)} — ${ep.ended_at?.slice(0, 10) || 'ongoing'}`);
    }
    process.exit(0);
  }

  // Fetch all knowledge items
  const { data: knowledge, error } = await supabase
    .from('project_knowledge')
    .select('id, title, knowledge_type, project_code, recorded_at, topics, summary')
    .order('recorded_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch knowledge:', error.message);
    process.exit(1);
  }

  console.log(`Total knowledge items: ${knowledge.length}`);

  // Group by project
  const byProject = {};
  for (const k of knowledge) {
    const code = k.project_code || 'UNLINKED';
    if (!byProject[code]) byProject[code] = [];
    byProject[code].push(k);
  }

  console.log(`Projects: ${Object.keys(byProject).length}`);
  console.log('');

  // Detect episodes for each project
  const episodes = [];

  for (const [projectCode, items] of Object.entries(byProject)) {
    if (projectCode === 'UNLINKED') continue; // Skip unlinked items

    const clusters = clusterByTimeWindow(items);

    for (const cluster of clusters) {
      const dates = cluster.map(i => new Date(i.recorded_at)).sort((a, b) => a - b);
      const startDate = dates[0].toISOString();
      const endDate = dates[dates.length - 1].toISOString();

      const title = generateTitle(projectCode, cluster, startDate, endDate);
      const summary = generateSummary(cluster);
      const episodeType = inferEpisodeType(cluster);

      // Collect topics
      const allTopics = new Set();
      for (const item of cluster) {
        for (const t of item.topics || []) allTopics.add(t);
      }

      // Key events
      const keyEvents = cluster.map(item => ({
        id: item.id,
        type: item.knowledge_type,
        title: item.title,
        date: item.recorded_at,
      }));

      episodes.push({
        title,
        summary,
        episode_type: episodeType,
        project_code: projectCode,
        started_at: startDate,
        ended_at: endDate,
        key_events: keyEvents,
        topics: Array.from(allTopics),
        status: new Date(endDate) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) ? 'active' : 'completed',
        _itemCount: cluster.length,
      });
    }
  }

  console.log(`Detected ${episodes.length} episodes:`);
  console.log('');

  for (const ep of episodes) {
    const typeEmoji = ep.episode_type === 'decision_sequence' ? 'D' : 'P';
    console.log(`  [${typeEmoji}] ${ep.title} (${ep._itemCount} items, ${ep.status})`);
  }

  if (episodes.length === 0) {
    console.log('No episodes detected.');
    process.exit(0);
  }

  if (dryRun) {
    console.log('');
    console.log('Dry run complete.');
    process.exit(0);
  }

  // Generate embeddings for episode summaries
  console.log('');
  console.log('Generating embeddings...');

  const texts = episodes.map(ep => `${ep.title}\n\n${ep.summary}`);
  const BATCH_SIZE = 20;
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await trackedBatchEmbedding(batch, SCRIPT_NAME);
    allEmbeddings.push(...embeddings);
  }

  console.log(`Generated ${allEmbeddings.length} embeddings.`);

  // Insert episodes
  console.log('Inserting episodes...');
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i];
    const { _itemCount, ...insertData } = ep;

    const { error: insertError } = await supabase
      .from('memory_episodes')
      .insert({
        ...insertData,
        embedding: allEmbeddings[i],
      });

    if (insertError) {
      console.error(`  Failed: ${ep.title}: ${insertError.message}`);
      failed++;
    } else {
      inserted++;
    }
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`Detected:  ${episodes.length}`);
  console.log(`Inserted:  ${inserted}`);
  console.log(`Failed:    ${failed}`);

  // Final count
  const { count } = await supabase
    .from('memory_episodes')
    .select('id', { count: 'exact', head: true });
  console.log(`Total episodes: ${count}`);
  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
