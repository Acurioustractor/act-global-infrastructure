/**
 * @act/contacts/enrichment — Contact Enrichment Engine
 *
 * Multi-source enrichment pipeline. Dependency-injectable so it works
 * in any codebase without requiring specific LLM or project matching libraries.
 *
 * Usage:
 *   import { ContactEnricher } from '@act/contacts/enrichment';
 *
 *   // Basic (web sources only, no AI extraction):
 *   const enricher = new ContactEnricher({ supabase });
 *   const result = await enricher.enrichContact(contactId);
 *
 *   // Full (with AI extraction + project matching):
 *   const enricher = new ContactEnricher({
 *     supabase,
 *     llmFn: trackedCompletion,           // inject your LLM function
 *     projectMatchFn: matchProjectFromText, // inject project matcher
 *   });
 *
 *   // Batch:
 *   const results = await enricher.enrichBatch({ limit: 50 });
 */

import {
  searchTavily,
  fetchWebsite,
  lookupGitHub,
  crossRefLinkedIn,
  isPersonalEmail,
} from './sources.mjs';

export class ContactEnricher {
  /**
   * @param {object} options
   * @param {object} options.supabase - Supabase client (required)
   * @param {Function} [options.llmFn] - LLM completion function (messages, scriptName, opts) => string
   * @param {Function} [options.projectMatchFn] - Project matching function (text, opts) => matches[]
   * @param {boolean} [options.verbose] - Verbose logging
   * @param {boolean} [options.dryRun] - Preview without writing
   * @param {string} [options.table] - Contacts table name (default: 'ghl_contacts')
   * @param {object} [options.sourceOptions] - Per-source config { tavily: { apiKey }, github: { token } }
   */
  constructor(options = {}) {
    if (!options.supabase) {
      throw new Error('@act/contacts: supabase client is required');
    }

    this.supabase = options.supabase;
    this.llmFn = options.llmFn || null;
    this.projectMatchFn = options.projectMatchFn || null;
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.table = options.table || 'ghl_contacts';
    this.sourceOptions = options.sourceOptions || {};
    this.stats = { enriched: 0, skipped: 0, errors: 0, total: 0 };
  }

  log(...args) {
    if (this.verbose) console.log('[Enricher]', ...args);
  }

  /**
   * Enrich a single contact by ID.
   * @param {string} contactId
   * @returns {Promise<object>} Enrichment result
   */
  async enrichContact(contactId) {
    this.stats.total++;

    const { data: contact } = await this.supabase
      .from(this.table)
      .select('*')
      .or(`id.eq.${contactId},ghl_id.eq.${contactId}`)
      .limit(1)
      .single();

    if (!contact) {
      this.stats.skipped++;
      return { error: 'Contact not found', contactId };
    }

    return this._enrichContactRecord(contact);
  }

  /**
   * Core enrichment logic.
   */
  async _enrichContactRecord(contact) {
    const email = contact.email;
    const name = contact.full_name || [contact.first_name, contact.last_name].filter(Boolean).join(' ');

    this.log(`Enriching: ${name || email || contact.id}`);

    // Skip recently enriched (30-day window)
    if (contact.enrichment_status === 'enriched' && contact.enriched_at) {
      const daysSince = (Date.now() - new Date(contact.enriched_at).getTime()) / 86400000;
      if (daysSince < 30) {
        this.log(`  Skipping — enriched ${Math.floor(daysSince)} days ago`);
        this.stats.skipped++;
        return { status: 'skipped', reason: 'recently_enriched', contact: contact.id };
      }
    }

    try {
      // 1. Gather from all sources in parallel
      const emailDomain = email ? email.split('@')[1] : null;
      const personalEmail = email ? isPersonalEmail(email) : false;

      const searchQuery = name
        ? (personalEmail ? `"${name}" professional background` : `"${name}" ${emailDomain} role company`)
        : null;

      const companyUrl = emailDomain && !personalEmail ? `https://${emailDomain}` : null;

      const [tavilyResult, websiteData, linkedInData, gitHubData] = await Promise.all([
        searchQuery ? searchTavily(searchQuery, this.sourceOptions.tavily) : null,
        companyUrl ? fetchWebsite(companyUrl, this.sourceOptions.website) : null,
        crossRefLinkedIn(
          this.supabase,
          { email, firstName: contact.first_name, lastName: contact.last_name },
          this.sourceOptions.linkedin
        ),
        email ? lookupGitHub(email, this.sourceOptions.github) : null,
      ]);

      // 2. AI extraction (if LLM function provided)
      const context = this._buildContext(contact, { tavily: tavilyResult, website: websiteData, linkedIn: linkedInData, gitHub: gitHubData });
      let enrichedData = {};

      if (this.llmFn && context.length > 50) {
        enrichedData = await this._extractWithAI(contact, context);
      } else {
        // Fallback: extract what we can without AI
        enrichedData = this._extractWithoutAI({ tavily: tavilyResult, website: websiteData, linkedIn: linkedInData, gitHub: gitHubData });
      }

      // 3. Project matching (if function provided)
      let projectMatches = [];
      if (this.projectMatchFn) {
        const projectText = [enrichedData.role, enrichedData.organization, enrichedData.sector, enrichedData.interests?.join(' '), enrichedData.bio].filter(Boolean).join(' ');
        if (projectText.length > 10) {
          try {
            projectMatches = await this.projectMatchFn(projectText, { activeOnly: true });
          } catch { /* non-blocking */ }
        }
      }

      // 4. Build update payload
      const sources = [];
      if (tavilyResult) sources.push('tavily');
      if (websiteData) sources.push('website');
      if (linkedInData) sources.push('linkedin');
      if (gitHubData) sources.push('github');
      if (this.llmFn) sources.push('ai');

      const updates = {};
      if (enrichedData.organization && !contact.company_name) updates.company_name = enrichedData.organization;
      if (enrichedData.role) updates.enriched_role = enrichedData.role;
      if (enrichedData.sector) updates.enriched_sector = enrichedData.sector;
      if (enrichedData.bio) updates.enriched_bio = enrichedData.bio;
      if (enrichedData.location && !contact.city) updates.city = enrichedData.location;
      if (enrichedData.website) updates.enriched_website = enrichedData.website;

      // Merge tags
      const existingTags = contact.tags || [];
      const newTags = [...existingTags];
      if (enrichedData.sector && !newTags.includes(enrichedData.sector.toLowerCase())) {
        newTags.push(enrichedData.sector.toLowerCase());
      }
      if (gitHubData && !newTags.includes('github-profile')) newTags.push('github-profile');
      if (linkedInData && !newTags.includes('linkedin-matched')) newTags.push('linkedin-matched');
      const uniqueTags = [...new Set(newTags)];
      if (uniqueTags.length > existingTags.length) updates.tags = uniqueTags;

      if (projectMatches.length > 0) {
        updates.enriched_projects = projectMatches.slice(0, 5).map(p => ({ code: p.code, name: p.name, score: p.score }));
      }

      updates.enrichment_sources = sources;
      updates.enrichment_status = 'enriched';
      updates.enriched_at = new Date().toISOString();
      updates.enrichment_data = {
        ...enrichedData,
        github: gitHubData ? { login: gitHubData.login, bio: gitHubData.bio, company: gitHubData.company, repos: gitHubData.public_repos, followers: gitHubData.followers } : null,
        linkedin_crossref: linkedInData || null,
        project_matches: projectMatches.slice(0, 5),
        enriched_at: new Date().toISOString(),
      };

      // 5. Write
      if (!this.dryRun) {
        const { error } = await this.supabase.from(this.table).update(updates).eq('id', contact.id);
        if (error) {
          this.stats.errors++;
          return { status: 'error', error: error.message, contact: contact.id };
        }

        // Fire integration event
        await this.supabase.from('integration_events').insert({
          source: 'enricher',
          event_type: 'contact.enriched',
          entity_type: 'contact',
          entity_id: contact.id,
          action: 'enriched',
          payload: { name: name || email, sources, projects: projectMatches.slice(0, 3).map(p => p.code), sector: enrichedData.sector },
          processed_at: new Date().toISOString(),
        }).catch(() => {}); // non-blocking
      }

      this.stats.enriched++;
      this.log(`  Done — ${sources.join(', ')} — ${enrichedData.sector || 'no sector'}`);

      return {
        status: 'enriched',
        contact: contact.id,
        name,
        sources,
        data: enrichedData,
        projectMatches: projectMatches.slice(0, 5),
        updates: this.dryRun ? updates : undefined,
      };
    } catch (err) {
      this.stats.errors++;

      if (!this.dryRun) {
        await this.supabase.from(this.table)
          .update({ enrichment_status: 'failed', enrichment_data: { error: err.message, failed_at: new Date().toISOString() } })
          .eq('id', contact.id)
          .catch(() => {});
      }

      return { status: 'error', error: err.message, contact: contact.id };
    }
  }

  /**
   * Batch enrich contacts.
   * @param {object} [options]
   * @param {number} [options.limit] - Max contacts (default: 50)
   * @param {string} [options.status] - Filter status (default: 'pending')
   * @param {boolean} [options.includeStale] - Re-enrich old contacts
   * @param {number} [options.concurrency] - Parallel enrichments (default: 3)
   */
  async enrichBatch(options = {}) {
    const limit = options.limit || 50;
    const status = options.status || 'pending';
    const concurrency = options.concurrency || 3;

    let query = this.supabase.from(this.table)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options.includeStale) {
      const staleDate = new Date(Date.now() - 30 * 86400000).toISOString();
      query = query.or(`enrichment_status.eq.pending,enrichment_status.eq.failed,and(enrichment_status.eq.enriched,enriched_at.lt.${staleDate})`);
    } else {
      query = query.eq('enrichment_status', status);
    }

    const { data: contacts, error } = await query;
    if (error) return { error: error.message, stats: this.stats };
    if (!contacts?.length) return { status: 'complete', message: 'No contacts need enrichment', stats: this.stats };

    this.log(`Found ${contacts.length} contacts to enrich`);

    const results = [];
    for (let i = 0; i < contacts.length; i += concurrency) {
      const batch = contacts.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(c => this._enrichContactRecord(c)));
      results.push(...batchResults);
      if (i + concurrency < contacts.length) await new Promise(r => setTimeout(r, 1000));
    }

    return { status: 'complete', stats: { ...this.stats }, results };
  }

  /** Enrich by email address. */
  async enrichByEmail(email) {
    const { data: contact } = await this.supabase
      .from(this.table)
      .select('id')
      .ilike('email', email)
      .limit(1)
      .single();

    if (!contact) return { error: 'Contact not found', email };
    return this.enrichContact(contact.id);
  }

  /**
   * Build context text from all sources for AI extraction.
   */
  _buildContext(contact, sources) {
    const parts = [];
    parts.push(`Contact: ${contact.full_name || contact.first_name || 'Unknown'}`);
    if (contact.email) parts.push(`Email: ${contact.email}`);
    if (contact.company_name) parts.push(`Known Company: ${contact.company_name}`);
    if (contact.tags?.length) parts.push(`Existing Tags: ${contact.tags.join(', ')}`);

    if (sources.tavily) {
      parts.push('\n--- Web Search Results ---');
      if (sources.tavily.answer) parts.push(`Summary: ${sources.tavily.answer}`);
      for (const r of sources.tavily.results.slice(0, 3)) {
        parts.push(`[${r.title}] ${r.url}\n${r.content || ''}`);
      }
    }

    if (sources.website) {
      parts.push('\n--- Company Website ---');
      parts.push(`URL: ${sources.website.url}`);
      if (sources.website.title) parts.push(`Title: ${sources.website.title}`);
      if (sources.website.description) parts.push(`Description: ${sources.website.description}`);
      if (sources.website.text) parts.push(`Content: ${sources.website.text.substring(0, 800)}`);
    }

    if (sources.linkedIn) {
      parts.push('\n--- LinkedIn Cross-Reference ---');
      if (sources.linkedIn.company_name) parts.push(`Company: ${sources.linkedIn.company_name}`);
      if (sources.linkedIn.tags) parts.push(`Tags: ${sources.linkedIn.tags.join(', ')}`);
    }

    if (sources.gitHub) {
      parts.push('\n--- GitHub Profile ---');
      parts.push(`Username: ${sources.gitHub.login}`);
      if (sources.gitHub.name) parts.push(`Name: ${sources.gitHub.name}`);
      if (sources.gitHub.bio) parts.push(`Bio: ${sources.gitHub.bio}`);
      if (sources.gitHub.company) parts.push(`Company: ${sources.gitHub.company}`);
      if (sources.gitHub.location) parts.push(`Location: ${sources.gitHub.location}`);
    }

    return parts.join('\n');
  }

  /**
   * Use injected LLM function for structured extraction.
   */
  async _extractWithAI(contact, context) {
    try {
      const raw = await this.llmFn(
        [
          {
            role: 'system',
            content: `You are a contact data enrichment assistant. Extract structured information from web search results.

Return JSON only (no markdown):
{
  "organization": "Company name",
  "role": "Job title",
  "sector": "One of: technology, education, arts, government, nonprofit, health, environment, finance, social-enterprise, indigenous, community, legal, media, other",
  "location": "City, Country",
  "bio": "1-2 sentence summary",
  "website": "URL",
  "interests": ["topic1", "topic2"],
  "social_profiles": {"linkedin": "url", "twitter": "handle"},
  "confidence": "high|medium|low"
}

Only include fields you are confident about. Omit uncertain fields.`
          },
          { role: 'user', content: context }
        ],
        'contact-enricher',
        { model: 'gpt-4o-mini', temperature: 0.2, maxTokens: 500, operation: 'contact_enrichment' }
      );
      return JSON.parse(raw.trim());
    } catch {
      return { confidence: 'low' };
    }
  }

  /**
   * Extract what we can without AI (from raw source data).
   */
  _extractWithoutAI(sources) {
    const data = { confidence: 'low' };

    if (sources.gitHub) {
      if (sources.gitHub.company) data.organization = sources.gitHub.company.replace(/^@/, '');
      if (sources.gitHub.bio) data.bio = sources.gitHub.bio;
      if (sources.gitHub.location) data.location = sources.gitHub.location;
      data.sector = 'technology';
      data.confidence = 'medium';
    }

    if (sources.linkedIn?.company_name) {
      data.organization = data.organization || sources.linkedIn.company_name;
      data.confidence = 'medium';
    }

    if (sources.website?.title) {
      data.organization = data.organization || sources.website.title;
    }

    if (sources.tavily?.answer) {
      data.bio = data.bio || sources.tavily.answer.substring(0, 200);
    }

    return data;
  }
}

// Re-export sources for direct use
export { searchTavily, fetchWebsite, lookupGitHub, crossRefLinkedIn, isPersonalEmail } from './sources.mjs';

export default ContactEnricher;
