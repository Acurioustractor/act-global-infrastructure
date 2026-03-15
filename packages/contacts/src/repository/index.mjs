/**
 * @act/contacts/repository — Supabase Contact Repository
 *
 * Unified database layer for contacts. Works with any Supabase table
 * that has contact-like fields. Default table: 'ghl_contacts'.
 *
 * Usage:
 *   import { SupabaseContactRepository } from '@act/contacts/repository';
 *
 *   const repo = new SupabaseContactRepository(supabase);
 *   const contact = await repo.getById('abc-123');
 *   const results = await repo.search({ tags: ['partner'], sector: 'arts' });
 *   await repo.recordInteraction(contact.id, { type: 'email', direction: 'inbound' });
 */

export class SupabaseContactRepository {
  /**
   * @param {object} supabase - Supabase client
   * @param {object} [options]
   * @param {string} [options.table] - Table name (default: 'ghl_contacts')
   */
  constructor(supabase, options = {}) {
    if (!supabase) throw new Error('@act/contacts: supabase client is required');
    this.supabase = supabase;
    this.table = options.table || 'ghl_contacts';
  }

  /**
   * Get contact by ID (checks both internal UUID and ghl_id).
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async getById(id) {
    if (!id) return null;

    // Try ghl_id first, fall back to internal id
    let { data } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('ghl_id', id)
      .limit(1)
      .single();

    if (!data) {
      const fallback = await this.supabase
        .from(this.table)
        .select('*')
        .eq('id', id)
        .limit(1)
        .single();
      data = fallback.data;
    }

    return data || null;
  }

  /**
   * Get contact by email (case-insensitive).
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async getByEmail(email) {
    if (!email) return null;

    const { data } = await this.supabase
      .from(this.table)
      .select('*')
      .ilike('email', email.trim())
      .limit(1)
      .single();

    return data || null;
  }

  /**
   * Search contacts with filters.
   *
   * @param {object} [options]
   * @param {string} [options.query] - Free-text search (name/email)
   * @param {string[]} [options.tags] - Filter by tags (AND)
   * @param {string} [options.sector] - Filter by enriched_sector
   * @param {string} [options.enrichmentStatus] - Filter by enrichment_status
   * @param {string} [options.project] - Filter by project code in enriched_projects
   * @param {string} [options.source] - Filter by source field
   * @param {number} [options.limit] - Max results (default: 50)
   * @param {number} [options.offset] - Pagination offset
   * @param {string} [options.orderBy] - Sort field (default: 'full_name')
   * @returns {Promise<object[]>}
   */
  async search(options = {}) {
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const orderBy = options.orderBy || 'full_name';

    let query = this.supabase
      .from(this.table)
      .select('*')
      .order(orderBy, { ascending: true })
      .range(offset, offset + limit - 1);

    if (options.query) {
      query = query.or(`full_name.ilike.%${options.query}%,email.ilike.%${options.query}%,company_name.ilike.%${options.query}%`);
    }

    if (options.tags?.length) {
      query = query.contains('tags', options.tags);
    }

    if (options.sector) {
      query = query.eq('enriched_sector', options.sector);
    }

    if (options.enrichmentStatus) {
      query = query.eq('enrichment_status', options.enrichmentStatus);
    }

    if (options.source) {
      query = query.eq('source', options.source);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`[ContactRepo] Search failed:`, error.message);
      return [];
    }

    return data || [];
  }

  /**
   * Create or update a contact.
   * Uses email as the dedup key if no ID is provided.
   *
   * @param {object} contact - Contact fields to upsert
   * @returns {Promise<object>} Created/updated contact
   */
  async upsert(contact) {
    const { data, error } = await this.supabase
      .from(this.table)
      .upsert(contact, { onConflict: 'email' })
      .select()
      .single();

    if (error) throw new Error(`Upsert failed: ${error.message}`);
    return data;
  }

  /**
   * Update enrichment data for a contact.
   * @param {string} id - Contact ID
   * @param {object} data - Enrichment fields to update
   */
  async updateEnrichment(id, data) {
    const { error } = await this.supabase
      .from(this.table)
      .update({
        ...data,
        enriched_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw new Error(`Update enrichment failed: ${error.message}`);
  }

  /**
   * Get contacts that need enrichment.
   * @param {number} [limit] - Max results (default: 50)
   * @returns {Promise<object[]>}
   */
  async getEnrichmentQueue(limit = 50) {
    const { data } = await this.supabase
      .from(this.table)
      .select('*')
      .or('enrichment_status.eq.pending,enrichment_status.eq.failed')
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Record a contact interaction (email, meeting, call, etc.).
   * Writes to communications_history table.
   *
   * @param {string} contactId - ghl_contact_id
   * @param {object} interaction
   * @param {string} interaction.type - 'email' | 'meeting' | 'call' | 'message'
   * @param {string} [interaction.direction] - 'inbound' | 'outbound'
   * @param {string} [interaction.subject] - Subject line
   * @param {string} [interaction.summary] - Brief summary
   * @param {string[]} [interaction.projectCodes] - Related project codes
   */
  async recordInteraction(contactId, interaction) {
    await this.supabase.from('communications_history').insert({
      ghl_contact_id: contactId,
      channel: interaction.type,
      direction: interaction.direction || 'unknown',
      subject: interaction.subject,
      summary: interaction.summary,
      project_codes: interaction.projectCodes,
      occurred_at: new Date().toISOString(),
    });
  }

  /**
   * Get enrichment statistics.
   * @returns {Promise<{ total: number, pending: number, enriched: number, failed: number }>}
   */
  async getEnrichmentStats() {
    const [
      { count: total },
      { count: pending },
      { count: enriched },
      { count: failed },
    ] = await Promise.all([
      this.supabase.from(this.table).select('*', { count: 'exact', head: true }),
      this.supabase.from(this.table).select('*', { count: 'exact', head: true }).eq('enrichment_status', 'pending'),
      this.supabase.from(this.table).select('*', { count: 'exact', head: true }).eq('enrichment_status', 'enriched'),
      this.supabase.from(this.table).select('*', { count: 'exact', head: true }).eq('enrichment_status', 'failed'),
    ]);

    return { total, pending, enriched, failed };
  }

  /**
   * Get contacts with stale enrichment (older than N days).
   * @param {number} [days] - Days threshold (default: 30)
   * @param {number} [limit] - Max results (default: 50)
   */
  async getStaleEnrichments(days = 30, limit = 50) {
    const staleDate = new Date(Date.now() - days * 86400000).toISOString();

    const { data } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('enrichment_status', 'enriched')
      .lt('enriched_at', staleDate)
      .order('enriched_at', { ascending: true })
      .limit(limit);

    return data || [];
  }
}

export default SupabaseContactRepository;
