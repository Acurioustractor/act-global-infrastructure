/**
 * External Researcher: On-Demand Contact Research
 *
 * Gathers all internal context for a contact (comms, graph neighbors,
 * episodes) and asks AI for project fit, connection suggestions, next actions.
 *
 * On-demand only — triggered from dashboard "Research" button, not cron.
 *
 * Usage:
 *   import { ExternalResearcher } from './lib/external-research.mjs';
 *   const researcher = new ExternalResearcher();
 *   const result = await researcher.researchContact(contactId);
 */

import { createClient } from '@supabase/supabase-js';
import '../../lib/load-env.mjs';
import { trackedCompletion } from './llm-client.mjs';
import { KnowledgeGraph } from './knowledge-graph.mjs';
import { PROJECT_CODES } from './project-linker.mjs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export class ExternalResearcher {
  constructor(options = {}) {
    this.supabase = options.supabase || supabase;
    this.graph = new KnowledgeGraph({ supabase: this.supabase });
    this.verbose = options.verbose || false;
  }

  /**
   * Research a contact: gather context and generate insights
   * @param {string} contactId - ghl_contacts.id or ghl_id
   * @returns {object} Research results
   */
  async researchContact(contactId) {
    // 1. Get contact details
    const { data: contact } = await this.supabase
      .from('ghl_contacts')
      .select('*')
      .or(`id.eq.${contactId},ghl_id.eq.${contactId}`)
      .limit(1)
      .single();

    if (!contact) {
      return { error: 'Contact not found', contactId };
    }

    if (this.verbose) console.log(`[Research] Researching: ${contact.full_name || contact.email}`);

    // 2. Gather context in parallel
    const [comms, graphNeighbors, episodes] = await Promise.all([
      this.getRecentComms(contact),
      this.getGraphContext(contact),
      this.getEpisodicContext(contact),
    ]);

    // 3. Build research context
    const context = this.buildContext(contact, comms, graphNeighbors, episodes);

    // 4. Ask AI for analysis
    const analysis = await this.analyzeContext(contact, context);

    // 5. Store as intelligence insight
    await this.storeInsight(contact, analysis);

    return {
      contact: {
        id: contact.id,
        name: contact.full_name,
        email: contact.email,
        company: contact.company_name,
      },
      context_summary: {
        communications: comms.length,
        graph_connections: graphNeighbors.length,
        episodes: episodes.length,
      },
      analysis,
    };
  }

  async getRecentComms(contact) {
    const ghlId = contact.ghl_id || contact.id;
    const { data } = await this.supabase
      .from('communications_history')
      .select('subject, summary, sentiment, topics, project_codes, direction, occurred_at')
      .eq('ghl_contact_id', ghlId)
      .order('occurred_at', { ascending: false })
      .limit(20);

    return data || [];
  }

  async getGraphContext(contact) {
    try {
      const neighbors = await this.graph.getNeighbors('entity', contact.id);
      return neighbors || [];
    } catch {
      return [];
    }
  }

  async getEpisodicContext(contact) {
    const { data } = await this.supabase
      .from('episodic_memory')
      .select('episode_type, title, summary, emotional_valence, created_at')
      .contains('participants', [contact.ghl_id || contact.id])
      .order('created_at', { ascending: false })
      .limit(10);

    return data || [];
  }

  buildContext(contact, comms, neighbors, episodes) {
    const parts = [];

    parts.push(`Contact: ${contact.full_name || 'Unknown'} (${contact.email || 'no email'})`);
    if (contact.company_name) parts.push(`Company: ${contact.company_name}`);
    if (contact.tags?.length) parts.push(`Tags: ${contact.tags.join(', ')}`);
    if (contact.temperature) parts.push(`Temperature: ${contact.temperature}`);

    if (comms.length > 0) {
      parts.push(`\nRecent Communications (${comms.length}):`);
      for (const c of comms.slice(0, 10)) {
        const projects = c.project_codes?.join(', ') || 'none';
        parts.push(`  [${c.direction}] ${c.subject || '?'} — ${c.sentiment || '?'}, projects: ${projects}`);
        if (c.summary) parts.push(`    Summary: ${c.summary}`);
      }
    }

    if (episodes.length > 0) {
      parts.push(`\nEpisodes (${episodes.length}):`);
      for (const e of episodes.slice(0, 5)) {
        parts.push(`  ${e.episode_type}: ${e.title} (${e.emotional_valence || 'neutral'})`);
      }
    }

    if (neighbors.length > 0) {
      parts.push(`\nGraph Connections (${neighbors.length}):`);
      for (const n of neighbors.slice(0, 5)) {
        parts.push(`  → ${n.target_type}/${n.edge_type} (strength: ${n.strength})`);
      }
    }

    return parts.join('\n');
  }

  async analyzeContext(contact, context) {
    const projectList = Object.entries(PROJECT_CODES)
      .map(([code, desc]) => `  ${code}: ${desc}`)
      .join('\n');

    try {
      const raw = await trackedCompletion(
        [
          {
            role: 'system',
            content: `You are an advisor for ACT (A Curious Tractor), a social enterprise ecosystem.
Given context about a contact, provide:
1. project_fit: which ACT projects they could contribute to or benefit from
2. connection_suggestions: who else in the ecosystem they should connect with and why
3. next_actions: 2-3 specific recommended next steps
4. relationship_summary: brief assessment of the relationship

ACT Projects:
${projectList}

Return JSON: { "project_fit": [{"code":"...", "reason":"..."}], "connection_suggestions": ["..."], "next_actions": ["..."], "relationship_summary": "..." }
No markdown, ONLY valid JSON.`
          },
          { role: 'user', content: context }
        ],
        'external-research',
        {
          model: 'gpt-4o-mini',
          temperature: 0.4,
          maxTokens: 600,
          operation: 'contact_research',
        }
      );

      return JSON.parse(raw.trim());
    } catch (err) {
      console.error('[Research] Analysis failed:', err.message);
      return {
        project_fit: [],
        connection_suggestions: [],
        next_actions: ['Manual review recommended — AI analysis failed'],
        relationship_summary: 'Analysis unavailable',
        error: err.message,
      };
    }
  }

  async storeInsight(contact, analysis) {
    await this.supabase.from('intelligence_insights').insert({
      insight_type: 'contact_research',
      title: `Research: ${contact.full_name || contact.email}`,
      description: analysis.relationship_summary || 'Research complete',
      priority: 'medium',
      data: {
        contact_id: contact.ghl_id || contact.id,
        contact_name: contact.full_name,
        ...analysis,
      },
      source_type: 'ai',
      source_id: contact.id,
      dedup_key: `research_${contact.id}_${new Date().toISOString().slice(0, 10)}`,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
  }
}

// CLI: node scripts/lib/external-research.mjs <contactId>
if (process.argv[1]?.includes('external-research')) {
  const contactId = process.argv[2];
  if (!contactId) {
    console.error('Usage: node scripts/lib/external-research.mjs <contactId>');
    process.exit(1);
  }

  const researcher = new ExternalResearcher({ verbose: true });
  const result = await researcher.researchContact(contactId);
  console.log(JSON.stringify(result, null, 2));
}

export default ExternalResearcher;
