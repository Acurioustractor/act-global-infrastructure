/**
 * Unified API Service
 *
 * Single interface for all ACT data access. All agents and services
 * should use this to access contacts, communications, voice notes, etc.
 *
 * Features:
 * - Contact lookup and history
 * - Communication tracking
 * - Voice note search
 * - Relationship health
 * - Daily/weekly briefs
 *
 * @author ACT Technology
 * @version 1.0.0
 */

import { createClient } from '@supabase/supabase-js';
import { pipeline } from '@xenova/transformers';

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  ghl: {
    apiKey: process.env.GHL_API_KEY,
    locationId: process.env.GHL_LOCATION_ID,
  },
};

// Initialize Supabase client
let supabase = null;
let embedder = null;

function getSupabase() {
  if (!supabase && config.supabase.url && config.supabase.key) {
    supabase = createClient(config.supabase.url, config.supabase.key);
  }
  return supabase;
}

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

/**
 * UnifiedAPIService - Main class for data access
 */
export class UnifiedAPIService {
  constructor() {
    this.db = getSupabase();
  }

  // ==========================================
  // CONTACTS
  // ==========================================

  /**
   * Get contact by various identifiers
   *
   * @param {Object} query - { email?, phone?, ghlId?, name? }
   * @returns {Object|null} Contact record
   */
  async getContact(query) {
    const { email, phone, ghlId, name } = query;

    let queryBuilder = this.db.from('ghl_contacts').select(`
      *,
      cultural_protocols (
        cultural_nation,
        elder_status,
        requires_elder_review
      ),
      relationship_health (
        temperature,
        lcaa_stage,
        days_since_contact,
        overall_sentiment
      )
    `);

    if (ghlId) {
      queryBuilder = queryBuilder.eq('ghl_id', ghlId);
    } else if (email) {
      queryBuilder = queryBuilder.eq('email', email);
    } else if (phone) {
      queryBuilder = queryBuilder.ilike('phone', `%${phone.replace(/\D/g, '').slice(-10)}%`);
    } else if (name) {
      queryBuilder = queryBuilder.ilike('full_name', `%${name}%`);
    }

    const { data, error } = await queryBuilder.single();

    if (error && error.code !== 'PGRST116') {
      console.error('[unified-api] getContact error:', error);
    }

    return data;
  }

  /**
   * Search contacts
   *
   * @param {string} query - Search term
   * @param {Object} filters - { tags?, engagement_status?, project? }
   * @param {number} limit - Max results
   */
  async searchContacts(query, filters = {}, limit = 20) {
    let queryBuilder = this.db
      .from('ghl_contacts')
      .select(`
        *,
        relationship_health (
          temperature,
          lcaa_stage,
          days_since_contact
        )
      `)
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,company_name.ilike.%${query}%`)
      .limit(limit);

    if (filters.tags) {
      queryBuilder = queryBuilder.contains('tags', filters.tags);
    }
    if (filters.engagement_status) {
      queryBuilder = queryBuilder.eq('engagement_status', filters.engagement_status);
    }
    if (filters.project) {
      queryBuilder = queryBuilder.contains('projects', [filters.project]);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('[unified-api] searchContacts error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get contact's communication history
   *
   * @param {string} contactId - GHL contact ID
   * @param {number} limit - Max results
   */
  async getContactHistory(contactId, limit = 50) {
    const { data, error } = await this.db
      .from('communications_history')
      .select('*')
      .eq('ghl_contact_id', contactId)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[unified-api] getContactHistory error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get relationship health for a contact
   */
  async getRelationshipHealth(contactId) {
    const { data, error } = await this.db
      .from('relationship_health')
      .select('*')
      .eq('ghl_contact_id', contactId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[unified-api] getRelationshipHealth error:', error);
    }

    return data;
  }

  // ==========================================
  // COMMUNICATIONS
  // ==========================================

  /**
   * Get recent communications
   *
   * @param {Object} options - { channel?, direction?, limit?, since? }
   */
  async getRecentCommunications(options = {}) {
    const { channel, direction, limit = 50, since } = options;

    let queryBuilder = this.db
      .from('v_recent_communications')
      .select('*')
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (channel) {
      queryBuilder = queryBuilder.eq('channel', channel);
    }
    if (direction) {
      queryBuilder = queryBuilder.eq('direction', direction);
    }
    if (since) {
      queryBuilder = queryBuilder.gte('occurred_at', since);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('[unified-api] getRecentCommunications error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get communications awaiting their response
   */
  async getAwaitingResponse(limit = 20) {
    const { data, error } = await this.db
      .from('v_awaiting_response')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('[unified-api] getAwaitingResponse error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get communications where we need to respond
   */
  async getWaitingForUs(limit = 20) {
    const { data, error } = await this.db
      .from('v_need_to_respond')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('[unified-api] getWaitingForUs error:', error);
      return [];
    }

    return data || [];
  }

  // ==========================================
  // VOICE NOTES
  // ==========================================

  /**
   * Get recent voice notes
   *
   * @param {Object} options - { recordedBy?, project?, limit? }
   */
  async getVoiceNotes(options = {}) {
    const { recordedBy, project, limit = 20 } = options;

    let queryBuilder = this.db
      .from('voice_notes')
      .select('id, summary, topics, recorded_by_name, recorded_at, source_channel, visibility')
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (recordedBy) {
      queryBuilder = queryBuilder.eq('recorded_by_name', recordedBy);
    }
    if (project) {
      queryBuilder = queryBuilder.eq('project_context', project);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('[unified-api] getVoiceNotes error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Search voice notes semantically
   *
   * @param {string} query - Search query
   * @param {number} limit - Max results
   */
  async searchVoiceNotes(query, limit = 10) {
    try {
      const embed = await getEmbedder();
      const result = await embed(query, { pooling: 'mean', normalize: true });
      const queryEmbedding = Array.from(result.data);

      const { data, error } = await this.db.rpc('search_voice_notes', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
      });

      if (error) {
        console.error('[unified-api] searchVoiceNotes error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[unified-api] searchVoiceNotes error:', error);
      return [];
    }
  }

  // ==========================================
  // SYNTHESIS / BRIEFS
  // ==========================================

  /**
   * Get comprehensive brief for a contact
   *
   * @param {string} contactId - GHL contact ID
   */
  async getContactBrief(contactId) {
    const [contact, history, health] = await Promise.all([
      this.getContact({ ghlId: contactId }),
      this.getContactHistory(contactId, 10),
      this.getRelationshipHealth(contactId),
    ]);

    if (!contact) {
      return null;
    }

    return {
      contact: {
        name: contact.full_name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company_name,
        tags: contact.tags,
        projects: contact.projects,
        engagement: contact.engagement_status,
      },
      relationship: health ? {
        temperature: health.temperature,
        stage: health.lcaa_stage,
        daysSinceContact: health.days_since_contact,
        sentiment: health.overall_sentiment,
        riskFlags: health.risk_flags,
        suggestedActions: health.suggested_actions,
      } : null,
      culturalProtocols: contact.cultural_protocols ? {
        nation: contact.cultural_protocols.cultural_nation,
        isElder: contact.cultural_protocols.elder_status,
        requiresReview: contact.cultural_protocols.requires_elder_review,
      } : null,
      recentHistory: history.map(h => ({
        channel: h.channel,
        direction: h.direction,
        subject: h.subject,
        summary: h.summary,
        date: h.occurred_at,
        topics: h.topics,
      })),
      lastContact: history[0]?.occurred_at,
    };
  }

  /**
   * Get daily overview brief
   */
  async getDailyBrief() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [communications, awaiting, needRespond, voiceNotes, coldContacts] = await Promise.all([
      this.getRecentCommunications({ since: todayISO, limit: 100 }),
      this.getAwaitingResponse(10),
      this.getWaitingForUs(10),
      this.getVoiceNotes({ limit: 10 }),
      this.db
        .from('relationship_health')
        .select('ghl_contact_id')
        .lte('temperature', 30)
        .order('days_since_contact', { ascending: false })
        .limit(5),
    ]);

    // Calculate stats
    const channels = {};
    const directions = { inbound: 0, outbound: 0, internal: 0 };
    const topics = {};

    communications.forEach(c => {
      channels[c.channel] = (channels[c.channel] || 0) + 1;
      directions[c.direction] = (directions[c.direction] || 0) + 1;
      c.topics?.forEach(t => {
        topics[t] = (topics[t] || 0) + 1;
      });
    });

    return {
      date: today.toDateString(),
      stats: {
        totalCommunications: communications.length,
        byChannel: channels,
        byDirection: directions,
        voiceNotesToday: voiceNotes.filter(v =>
          new Date(v.recorded_at) >= today
        ).length,
      },
      attention: {
        awaitingTheirResponse: awaiting.map(a => ({
          contact: a.contact_name,
          subject: a.subject,
          daysWaiting: a.days_waiting,
        })),
        needOurResponse: needRespond.map(n => ({
          contact: n.contact_name,
          subject: n.subject,
          daysSince: n.days_since,
        })),
        coldContacts: coldContacts.data?.length || 0,
      },
      topics: Object.entries(topics)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count })),
      recentVoiceNotes: voiceNotes.slice(0, 5).map(v => ({
        summary: v.summary,
        by: v.recorded_by_name,
        topics: v.topics,
        when: v.recorded_at,
      })),
    };
  }

  /**
   * Get weekly overview
   */
  async getWeeklyOverview() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    const [communications, voiceNotes, relationshipChanges] = await Promise.all([
      this.getRecentCommunications({ since: weekAgoISO, limit: 500 }),
      this.getVoiceNotes({ limit: 100 }),
      this.db
        .from('relationship_health')
        .select('ghl_contact_id, temperature, temperature_trend')
        .or('temperature_trend.eq.rising,temperature_trend.eq.falling'),
    ]);

    // Calculate daily breakdown
    const dailyStats = {};
    communications.forEach(c => {
      const day = new Date(c.occurred_at).toDateString();
      if (!dailyStats[day]) {
        dailyStats[day] = { total: 0, inbound: 0, outbound: 0 };
      }
      dailyStats[day].total++;
      dailyStats[day][c.direction]++;
    });

    // Topic frequency
    const topics = {};
    [...communications, ...voiceNotes].forEach(item => {
      item.topics?.forEach(t => {
        topics[t] = (topics[t] || 0) + 1;
      });
    });

    return {
      period: {
        start: weekAgoISO,
        end: new Date().toISOString(),
      },
      totals: {
        communications: communications.length,
        voiceNotes: voiceNotes.length,
        uniqueContacts: new Set(communications.filter(c => c.ghl_contact_id).map(c => c.ghl_contact_id)).size,
      },
      daily: dailyStats,
      relationships: {
        warming: relationshipChanges.data?.filter(r => r.temperature_trend === 'rising').length || 0,
        cooling: relationshipChanges.data?.filter(r => r.temperature_trend === 'falling').length || 0,
      },
      topTopics: Object.entries(topics)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([topic, count]) => ({ topic, count })),
    };
  }

  // ==========================================
  // UTILITY
  // ==========================================

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const { count } = await this.db
        .from('ghl_contacts')
        .select('*', { count: 'exact', head: true });

      return {
        status: 'healthy',
        database: 'connected',
        contactCount: count,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
}

// Create singleton instance
const api = new UnifiedAPIService();

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, command, ...args] = process.argv;

  const commands = {
    async contact() {
      const query = args[0];
      if (!query) {
        console.log('Usage: node unified-api.mjs contact <email|name|phone>');
        process.exit(1);
      }

      const contact = await api.getContact({
        email: query.includes('@') ? query : undefined,
        name: !query.includes('@') ? query : undefined,
      });

      if (contact) {
        console.log(JSON.stringify(contact, null, 2));
      } else {
        console.log('Contact not found');
      }
    },

    async brief() {
      const contactId = args[0];
      if (contactId) {
        const brief = await api.getContactBrief(contactId);
        console.log(JSON.stringify(brief, null, 2));
      } else {
        const brief = await api.getDailyBrief();
        console.log(JSON.stringify(brief, null, 2));
      }
    },

    async weekly() {
      const overview = await api.getWeeklyOverview();
      console.log(JSON.stringify(overview, null, 2));
    },

    async awaiting() {
      const awaiting = await api.getAwaitingResponse();
      console.log('Awaiting their response:');
      for (const item of awaiting) {
        console.log(`- ${item.contact_name}: ${item.subject} (${item.days_waiting} days)`);
      }
    },

    async respond() {
      const needRespond = await api.getWaitingForUs();
      console.log('We need to respond to:');
      for (const item of needRespond) {
        console.log(`- ${item.contact_name}: ${item.subject} (${item.days_since} days)`);
      }
    },

    async voice() {
      const query = args.join(' ');
      if (query) {
        const results = await api.searchVoiceNotes(query);
        console.log(`Search results for "${query}":`);
        for (const note of results) {
          console.log(`- ${note.summary || 'No summary'}`);
          console.log(`  Similarity: ${(note.similarity * 100).toFixed(1)}%`);
        }
      } else {
        const notes = await api.getVoiceNotes({ limit: 5 });
        console.log('Recent voice notes:');
        for (const note of notes) {
          console.log(`- ${note.summary || 'No summary'} (by ${note.recorded_by_name})`);
        }
      }
    },

    async health() {
      const status = await api.healthCheck();
      console.log(JSON.stringify(status, null, 2));
    },
  };

  if (commands[command]) {
    commands[command]().catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
  } else {
    console.log('Unified API Service');
    console.log('Commands:');
    console.log('  contact <query>  - Look up a contact');
    console.log('  brief [contactId] - Get daily brief or contact brief');
    console.log('  weekly           - Get weekly overview');
    console.log('  awaiting         - Show awaiting their response');
    console.log('  respond          - Show where we need to respond');
    console.log('  voice [query]    - Search or list voice notes');
    console.log('  health           - Check service health');
  }
}

export { UnifiedAPIService };
export default api;
