/**
 * @act/contacts/relationships — Relationship Health Analyzer
 *
 * Scores and tracks relationship health based on interaction patterns.
 * Used for daily briefings, priority contacts, and engagement alerts.
 *
 * Usage:
 *   import { RelationshipAnalyzer } from '@act/contacts/relationships';
 *
 *   const analyzer = new RelationshipAnalyzer(supabase);
 *   const score = await analyzer.scoreRelationship(contactId);
 *   const top = await analyzer.getTopRelationships(10);
 *   const stale = await analyzer.getStaleRelationships(30);
 */

export class RelationshipAnalyzer {
  /**
   * @param {object} supabase - Supabase client
   * @param {object} [options]
   * @param {string} [options.contactsTable] - Contacts table (default: 'ghl_contacts')
   * @param {string} [options.commsTable] - Communications table (default: 'communications_history')
   */
  constructor(supabase, options = {}) {
    if (!supabase) throw new Error('@act/contacts: supabase client is required');
    this.supabase = supabase;
    this.contactsTable = options.contactsTable || 'ghl_contacts';
    this.commsTable = options.commsTable || 'communications_history';
  }

  /**
   * Score a single contact's relationship health (0-100).
   *
   * Factors:
   * - Recency: When was last interaction? (40% weight)
   * - Frequency: How often do we interact? (30% weight)
   * - Reciprocity: Is it two-way? (20% weight)
   * - Depth: Do we share projects? (10% weight)
   *
   * @param {string} contactId - ghl_contact_id or id
   * @returns {Promise<object>} RelationshipScore
   */
  async scoreRelationship(contactId) {
    // Get contact
    const { data: contact } = await this.supabase
      .from(this.contactsTable)
      .select('id, ghl_id, full_name, email, tags, enriched_projects')
      .or(`id.eq.${contactId},ghl_id.eq.${contactId}`)
      .limit(1)
      .single();

    if (!contact) return null;

    const ghlId = contact.ghl_id || contact.id;

    // Get interaction history (last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data: comms } = await this.supabase
      .from(this.commsTable)
      .select('direction, occurred_at, project_codes')
      .eq('ghl_contact_id', ghlId)
      .gte('occurred_at', ninetyDaysAgo)
      .order('occurred_at', { ascending: false });

    const interactions = comms || [];
    const now = Date.now();

    // Recency (40 points max)
    let recencyScore = 0;
    if (interactions.length > 0) {
      const lastInteraction = new Date(interactions[0].occurred_at).getTime();
      const daysSince = (now - lastInteraction) / 86400000;
      if (daysSince < 1) recencyScore = 40;
      else if (daysSince < 3) recencyScore = 35;
      else if (daysSince < 7) recencyScore = 30;
      else if (daysSince < 14) recencyScore = 20;
      else if (daysSince < 30) recencyScore = 10;
      else recencyScore = 5;
    }

    // Frequency (30 points max)
    let frequencyScore = 0;
    if (interactions.length >= 20) frequencyScore = 30;
    else if (interactions.length >= 10) frequencyScore = 25;
    else if (interactions.length >= 5) frequencyScore = 20;
    else if (interactions.length >= 2) frequencyScore = 10;
    else if (interactions.length >= 1) frequencyScore = 5;

    // Reciprocity (20 points max)
    const inbound = interactions.filter(i => i.direction === 'inbound').length;
    const outbound = interactions.filter(i => i.direction === 'outbound').length;
    let reciprocityScore = 0;
    if (inbound > 0 && outbound > 0) {
      const ratio = Math.min(inbound, outbound) / Math.max(inbound, outbound);
      reciprocityScore = Math.round(ratio * 20);
    }

    // Depth (10 points max) — shared projects
    const allProjectCodes = interactions.flatMap(i => i.project_codes || []);
    const uniqueProjects = [...new Set(allProjectCodes)];
    const depthScore = Math.min(uniqueProjects.length * 3, 10);

    const totalScore = recencyScore + frequencyScore + reciprocityScore + depthScore;

    // Determine trend
    const recentComms = interactions.filter(i => {
      const age = (now - new Date(i.occurred_at).getTime()) / 86400000;
      return age < 30;
    }).length;
    const olderComms = interactions.filter(i => {
      const age = (now - new Date(i.occurred_at).getTime()) / 86400000;
      return age >= 30 && age < 60;
    }).length;

    let trend = 'stable';
    if (recentComms > olderComms * 1.5) trend = 'growing';
    else if (recentComms < olderComms * 0.5 && olderComms > 0) trend = 'cooling';
    else if (interactions.length === 0 || recentComms === 0) trend = 'dormant';

    const daysSinceContact = interactions.length > 0
      ? Math.floor((now - new Date(interactions[0].occurred_at).getTime()) / 86400000)
      : 999;

    return {
      contactId: contact.id,
      contactName: contact.full_name || contact.email || contactId,
      score: totalScore,
      trend,
      daysSinceContact,
      totalInteractions: interactions.length,
      sharedProjects: uniqueProjects,
      breakdown: { recency: recencyScore, frequency: frequencyScore, reciprocity: reciprocityScore, depth: depthScore },
    };
  }

  /**
   * Get top relationships by score.
   * @param {number} [limit] - Max results (default: 20)
   */
  async getTopRelationships(limit = 20) {
    // Get contacts with recent activity
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: recentContacts } = await this.supabase
      .from(this.commsTable)
      .select('ghl_contact_id')
      .gte('occurred_at', thirtyDaysAgo)
      .order('occurred_at', { ascending: false })
      .limit(200);

    if (!recentContacts?.length) return [];

    const uniqueIds = [...new Set(recentContacts.map(c => c.ghl_contact_id))];
    const scores = [];

    // Score each (limit to avoid too many queries)
    for (const id of uniqueIds.slice(0, limit * 2)) {
      const score = await this.scoreRelationship(id);
      if (score) scores.push(score);
    }

    return scores.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Get contacts with stale/dormant relationships.
   * @param {number} [daysSince] - Days since last contact (default: 30)
   * @param {number} [limit] - Max results (default: 20)
   */
  async getStaleRelationships(daysSince = 30, limit = 20) {
    const cutoffDate = new Date(Date.now() - daysSince * 86400000).toISOString();

    // Get contacts who had activity before cutoff but not after
    const { data: contacts } = await this.supabase
      .from(this.contactsTable)
      .select('id, ghl_id, full_name, email, tags')
      .not('tags', 'cs', '{"do-not-contact"}')
      .limit(limit * 3);

    if (!contacts?.length) return [];

    const results = [];
    for (const contact of contacts) {
      const ghlId = contact.ghl_id || contact.id;

      // Check for recent activity
      const { count: recentCount } = await this.supabase
        .from(this.commsTable)
        .select('*', { count: 'exact', head: true })
        .eq('ghl_contact_id', ghlId)
        .gte('occurred_at', cutoffDate);

      if (recentCount === 0) {
        // Has older activity?
        const { count: olderCount } = await this.supabase
          .from(this.commsTable)
          .select('*', { count: 'exact', head: true })
          .eq('ghl_contact_id', ghlId);

        if (olderCount > 0) {
          results.push({
            contactId: contact.id,
            contactName: contact.full_name || contact.email,
            totalInteractions: olderCount,
            trend: 'dormant',
          });
        }
      }

      if (results.length >= limit) break;
    }

    return results;
  }

  /**
   * Get relationships filtered by project.
   * @param {string} projectCode
   * @param {number} [limit] - Max results (default: 20)
   */
  async getRelationshipsByProject(projectCode, limit = 20) {
    const { data: comms } = await this.supabase
      .from(this.commsTable)
      .select('ghl_contact_id')
      .contains('project_codes', [projectCode])
      .order('occurred_at', { ascending: false })
      .limit(200);

    if (!comms?.length) return [];

    const uniqueIds = [...new Set(comms.map(c => c.ghl_contact_id))];
    const scores = [];

    for (const id of uniqueIds.slice(0, limit * 2)) {
      const score = await this.scoreRelationship(id);
      if (score) scores.push(score);
    }

    return scores.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

export default RelationshipAnalyzer;
