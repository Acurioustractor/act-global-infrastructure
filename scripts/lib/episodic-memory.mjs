#!/usr/bin/env node
/**
 * Episodic Memory: Coherent Event Sequences
 *
 * Groups related events into episodes (project phases, decision sequences,
 * interaction arcs, incidents, learning journeys).
 *
 * Part of: Advanced Memory System (Phase 3)
 *
 * Usage:
 *   import { EpisodicMemory } from './lib/episodic-memory.mjs';
 *   const memory = new EpisodicMemory();
 *   const episode = await memory.createEpisode('Grant Application', 'grant_process', { projectCode: 'ACT-HV' });
 *   await memory.addEventToEpisode(episode.id, { event_type: 'submitted', description: '...' });
 */

import { createClient } from '@supabase/supabase-js';
import { cachedEmbedding } from './cache.mjs';
import '../../lib/load-env.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const VALID_EPISODE_TYPES = [
  'project_phase', 'decision_sequence', 'interaction_arc',
  'incident', 'learning_journey', 'campaign', 'grant_process'
];

export class EpisodicMemory {
  constructor(options = {}) {
    this.supabase = options.supabase || supabase;
    this.verbose = options.verbose || false;
  }

  /**
   * Create a new episode
   */
  async createEpisode(title, episodeType, options = {}) {
    if (!VALID_EPISODE_TYPES.includes(episodeType)) {
      throw new Error(`Invalid episode type: ${episodeType}. Valid: ${VALID_EPISODE_TYPES.join(', ')}`);
    }

    // Generate embedding from title + summary
    const textForEmbedding = [title, options.summary].filter(Boolean).join('. ');
    let embedding = null;
    try {
      embedding = await cachedEmbedding(textForEmbedding, 'episodic-memory');
    } catch (err) {
      console.warn('Failed to generate episode embedding:', err.message);
    }

    const { data, error } = await this.supabase
      .from('memory_episodes')
      .insert({
        title,
        summary: options.summary || null,
        episode_type: episodeType,
        project_code: options.projectCode || null,
        entity_ids: options.entityIds || [],
        started_at: options.startedAt || new Date().toISOString(),
        key_events: options.events || [],
        topics: options.topics || [],
        embedding
      })
      .select()
      .single();

    if (error) throw error;

    if (this.verbose) {
      console.log(`Episode created: ${data.id} — "${title}" (${episodeType})`);
    }

    return data;
  }

  /**
   * Add an event to an existing episode
   */
  async addEventToEpisode(episodeId, event) {
    const { data: episode, error: fetchError } = await this.supabase
      .from('memory_episodes')
      .select('key_events')
      .eq('id', episodeId)
      .single();

    if (fetchError) throw fetchError;

    const events = episode.key_events || [];
    events.push({
      timestamp: event.timestamp || new Date().toISOString(),
      event_type: event.event_type || 'update',
      description: event.description,
      source_id: event.sourceId || null,
      source_type: event.sourceType || null
    });

    const { data, error } = await this.supabase
      .from('memory_episodes')
      .update({
        key_events: events,
        updated_at: new Date().toISOString()
      })
      .eq('id', episodeId)
      .select()
      .single();

    if (error) throw error;

    if (this.verbose) {
      console.log(`Event added to episode ${episodeId}: ${event.event_type}`);
    }

    return data;
  }

  /**
   * Close an episode with outcome and lessons
   */
  async closeEpisode(episodeId, outcome, lessons = []) {
    // Re-embed with outcome context
    const { data: episode } = await this.supabase
      .from('memory_episodes')
      .select('title, summary')
      .eq('id', episodeId)
      .single();

    let embedding = null;
    if (episode) {
      const text = [episode.title, episode.summary, outcome, ...lessons].filter(Boolean).join('. ');
      try {
        embedding = await cachedEmbedding(text, 'episodic-memory');
      } catch (err) {
        console.warn('Failed to update episode embedding:', err.message);
      }
    }

    const updateData = {
      status: 'completed',
      ended_at: new Date().toISOString(),
      outcome,
      lessons_learned: lessons,
      updated_at: new Date().toISOString()
    };

    if (embedding) updateData.embedding = embedding;

    const { data, error } = await this.supabase
      .from('memory_episodes')
      .update(updateData)
      .eq('id', episodeId)
      .select()
      .single();

    if (error) throw error;

    if (this.verbose) {
      console.log(`Episode ${episodeId} closed: ${outcome}`);
    }

    return data;
  }

  /**
   * Search for related episodes semantically
   */
  async findRelatedEpisodes(query, options = {}) {
    let embedding;
    try {
      embedding = await cachedEmbedding(query, 'episodic-memory');
    } catch (err) {
      console.warn('Failed to generate search embedding:', err.message);
      return [];
    }

    const { data, error } = await this.supabase.rpc('search_episodes', {
      query_embedding: embedding,
      p_project_code: options.projectCode || null,
      p_episode_types: options.episodeTypes || null,
      match_threshold: options.threshold || 0.6,
      match_count: options.limit || 10
    });

    if (error) {
      console.error('Episode search failed:', error.message);
      return [];
    }

    // Record access
    for (const ep of (data || [])) {
      await this.supabase
        .from('memory_episodes')
        .update({
          access_count: this.supabase.sql`access_count + 1`,
          last_accessed_at: new Date().toISOString()
        })
        .eq('id', ep.id);
    }

    return data || [];
  }

  /**
   * Get active (ongoing) episodes, optionally filtered by project
   */
  async getActiveEpisodes(projectCode = null) {
    let query = this.supabase
      .from('memory_episodes')
      .select('*')
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (projectCode) {
      query = query.eq('project_code', projectCode);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Detect episode boundaries from temporal clusters of knowledge
   *
   * Looks at project_knowledge entries for a project and groups them
   * into time-based clusters that could form episodes.
   */
  async detectEpisodeBoundaries(projectCode, options = {}) {
    const gapThresholdDays = options.gapThresholdDays || 7;
    const minEventsPerEpisode = options.minEventsPerEpisode || 3;

    const { data: knowledge, error } = await this.supabase
      .from('project_knowledge')
      .select('id, title, content, knowledge_type, created_at')
      .eq('project_code', projectCode)
      .is('superseded_by', null)
      .order('created_at', { ascending: true });

    if (error || !knowledge || knowledge.length < minEventsPerEpisode) {
      return [];
    }

    // Detect gaps > threshold to split into episodes
    const episodes = [];
    let currentGroup = [knowledge[0]];

    for (let i = 1; i < knowledge.length; i++) {
      const prev = new Date(knowledge[i - 1].created_at);
      const curr = new Date(knowledge[i].created_at);
      const gapDays = (curr - prev) / (1000 * 60 * 60 * 24);

      if (gapDays > gapThresholdDays) {
        // Gap detected — close current group
        if (currentGroup.length >= minEventsPerEpisode) {
          episodes.push(this._groupToEpisodeSuggestion(currentGroup, projectCode));
        }
        currentGroup = [knowledge[i]];
      } else {
        currentGroup.push(knowledge[i]);
      }
    }

    // Final group
    if (currentGroup.length >= minEventsPerEpisode) {
      episodes.push(this._groupToEpisodeSuggestion(currentGroup, projectCode));
    }

    if (this.verbose) {
      console.log(`Detected ${episodes.length} potential episodes for ${projectCode}`);
      episodes.forEach((e, i) => {
        console.log(`  ${i + 1}. "${e.suggestedTitle}" (${e.eventCount} events, ${e.startDate} — ${e.endDate})`);
      });
    }

    return episodes;
  }

  _groupToEpisodeSuggestion(group, projectCode) {
    const types = [...new Set(group.map(k => k.knowledge_type))];
    const startDate = group[0].created_at;
    const endDate = group[group.length - 1].created_at;

    return {
      suggestedTitle: `${projectCode}: ${types.join(', ')} activity`,
      suggestedType: types.includes('decision') ? 'decision_sequence' : 'project_phase',
      projectCode,
      startDate,
      endDate,
      eventCount: group.length,
      knowledgeIds: group.map(k => k.id)
    };
  }
}

export default EpisodicMemory;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const memory = new EpisodicMemory({ verbose: true });

  console.log('Episodic Memory');
  console.log('='.repeat(50));

  if (args.includes('--active')) {
    const projectCode = args[args.indexOf('--active') + 1] || null;
    const episodes = await memory.getActiveEpisodes(projectCode);
    console.log(`\nActive episodes${projectCode ? ` for ${projectCode}` : ''}:`);
    if (episodes.length === 0) {
      console.log('  None');
    } else {
      episodes.forEach((e, i) => {
        console.log(`  ${i + 1}. [${e.episode_type}] ${e.title}`);
        console.log(`     Started: ${e.started_at} | Events: ${(e.key_events || []).length}`);
      });
    }
  } else if (args.includes('--detect') && args.length >= 2) {
    const projectCode = args[args.indexOf('--detect') + 1];
    await memory.detectEpisodeBoundaries(projectCode);
  } else if (args.includes('--search') && args.length >= 2) {
    const query = args.slice(args.indexOf('--search') + 1).join(' ');
    const results = await memory.findRelatedEpisodes(query);
    console.log(`\nEpisodes matching "${query}":`);
    results.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.episode_type}] ${r.title} (similarity: ${r.similarity?.toFixed(3)})`);
    });
  } else {
    console.log(`
Usage:
  node scripts/lib/episodic-memory.mjs --active [project-code]     List active episodes
  node scripts/lib/episodic-memory.mjs --detect <project-code>     Detect episode boundaries
  node scripts/lib/episodic-memory.mjs --search <query>            Search episodes
`);
  }
}
