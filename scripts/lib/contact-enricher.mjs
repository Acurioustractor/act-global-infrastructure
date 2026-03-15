/**
 * Contact Enricher: External Data Enrichment Engine
 *
 * Multi-source enrichment pipeline for contacts:
 * 1. Email domain → company website (Tavily web search)
 * 2. Direct website fetch → parse metadata
 * 3. LinkedIn data cross-reference (from imported CSV connections)
 * 4. GitHub profile lookup (if developer contact)
 * 5. OpenAI extraction → role, sector, org, interests
 * 6. Project alignment via matchProjectFromText
 * 7. Write enriched data → ghl_contacts + Supabase
 *
 * Sources: Tavily (web search), OpenAI (extraction), LinkedIn CSV data,
 * GitHub API, direct website fetch. NO Perplexity.
 *
 * Usage:
 *   import { ContactEnricher } from './lib/contact-enricher.mjs';
 *   const enricher = new ContactEnricher();
 *   const result = await enricher.enrichContact(contactId);
 *   const batch = await enricher.enrichBatch({ limit: 50 });
 */

// All dependencies lazy-loaded to avoid test failures (openai, supabase packages)
let _supabase = null;
let _trackedCompletion = null;
let _matchProjectFromText = null;

async function getDb() {
  if (_supabase) return _supabase;
  const { getSupabase } = await import('./supabase-client.mjs');
  _supabase = getSupabase();
  return _supabase;
}

async function getLLM() {
  if (!_trackedCompletion) {
    const mod = await import('./llm-client.mjs');
    _trackedCompletion = mod.trackedCompletion;
  }
  return _trackedCompletion;
}

async function getProjectMatcher() {
  if (!_matchProjectFromText) {
    const mod = await import('./project-loader.mjs');
    _matchProjectFromText = mod.matchProjectFromText;
  }
  return _matchProjectFromText;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SOURCES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Tavily web search for company/person info.
 * Returns search results or null if unavailable.
 */
async function tavilySearch(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;

  try {
    const resp = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_raw_content: false,
        include_answer: true,
      }),
    });

    if (!resp.ok) {
      console.warn(`[Enricher] Tavily search failed (${resp.status})`);
      return null;
    }

    const data = await resp.json();
    return {
      answer: data.answer || null,
      results: (data.results || []).map(r => ({
        title: r.title,
        url: r.url,
        content: r.content?.substring(0, 500),
      })),
    };
  } catch (err) {
    console.warn('[Enricher] Tavily search error:', err.message);
    return null;
  }
}

/**
 * Fetch and extract metadata from a website.
 * Returns page title, description, and text excerpt.
 */
async function fetchWebsite(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ACT-Enricher/1.0 (+https://act.place)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;

    const html = await resp.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);

    // Strip HTML tags for a text excerpt
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const text = (bodyMatch?.[1] || html)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1500);

    return {
      title: titleMatch?.[1]?.trim() || null,
      description: descMatch?.[1]?.trim() || ogDescMatch?.[1]?.trim() || null,
      text,
      url,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Look up GitHub profile by username or email.
 * Uses GitHub API (GITHUB_TOKEN for higher rate limits).
 */
async function lookupGitHub(identifier) {
  const token = process.env.GITHUB_TOKEN;
  if (!identifier) return null;

  try {
    // Try as username first
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let username = identifier;

    // If it looks like an email, search for the user
    if (identifier.includes('@')) {
      const searchResp = await fetch(
        `https://api.github.com/search/users?q=${encodeURIComponent(identifier)}+in:email`,
        { headers }
      );
      if (!searchResp.ok) return null;
      const searchData = await searchResp.json();
      if (!searchData.items?.length) return null;
      username = searchData.items[0].login;
    }

    const resp = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
    if (!resp.ok) return null;

    const data = await resp.json();
    return {
      login: data.login,
      name: data.name,
      bio: data.bio,
      company: data.company,
      location: data.location,
      blog: data.blog,
      public_repos: data.public_repos,
      followers: data.followers,
      twitter_username: data.twitter_username,
    };
  } catch {
    return null;
  }
}

/**
 * Cross-reference against LinkedIn data already in Supabase.
 * Looks for matching email or name in ghl_contacts with linkedin tag.
 */
async function crossRefLinkedIn(supabase, { email, firstName, lastName }) {
  try {
    // Try email match first
    if (email) {
      const { data } = await supabase
        .from('ghl_contacts')
        .select('company_name, tags, first_name, last_name, source')
        .ilike('email', email)
        .contains('tags', ['linkedin'])
        .limit(1)
        .single();

      if (data) return { source: 'linkedin_email', ...data };
    }

    // Try name match
    if (firstName && lastName) {
      const { data } = await supabase
        .from('ghl_contacts')
        .select('company_name, tags, email, source')
        .ilike('first_name', firstName)
        .ilike('last_name', lastName)
        .contains('tags', ['linkedin'])
        .limit(1)
        .single();

      if (data) return { source: 'linkedin_name', ...data };
    }

    return null;
  } catch {
    return null;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENRICHER CLASS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class ContactEnricher {
  constructor(options = {}) {
    this.supabase = options.supabase || null;
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.stats = { enriched: 0, skipped: 0, errors: 0, total: 0 };
  }

  async _db() {
    if (!this.supabase) this.supabase = await getDb();
    return this.supabase;
  }

  log(...args) {
    if (this.verbose) console.log('[Enricher]', ...args);
  }

  /**
   * Enrich a single contact by ID.
   *
   * @param {string} contactId - ghl_contacts.id or ghl_id
   * @returns {object} Enrichment result
   */
  async enrichContact(contactId) {
    const db = await this._db();
    this.stats.total++;

    // 1. Load contact
    const { data: contact } = await db
      .from('ghl_contacts')
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
   * Core enrichment logic for a contact record.
   */
  async _enrichContactRecord(contact) {
    const db = await this._db();
    const email = contact.email;
    const name = contact.full_name || [contact.first_name, contact.last_name].filter(Boolean).join(' ');

    this.log(`Enriching: ${name || email || contact.id}`);

    // Skip if already enriched recently (within 30 days)
    if (contact.enrichment_status === 'enriched' && contact.enriched_at) {
      const daysSince = (Date.now() - new Date(contact.enriched_at).getTime()) / 86400000;
      if (daysSince < 30) {
        this.log(`  Skipping — enriched ${Math.floor(daysSince)} days ago`);
        this.stats.skipped++;
        return { status: 'skipped', reason: 'recently_enriched', contact: contact.id };
      }
    }

    try {
      // 2. Gather data from multiple sources in parallel
      const emailDomain = email ? email.split('@')[1] : null;
      const isPersonalEmail = emailDomain && ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'live.com', 'me.com'].includes(emailDomain);

      const searchQueries = [];

      // Build search queries
      if (name && email && !isPersonalEmail) {
        searchQueries.push(`"${name}" ${emailDomain} role company`);
      } else if (name) {
        searchQueries.push(`"${name}" professional background`);
      }

      // Company website from domain
      let companyUrl = null;
      if (emailDomain && !isPersonalEmail) {
        companyUrl = `https://${emailDomain}`;
      }

      // Run all data gathering in parallel
      const [
        tavilyResult,
        websiteData,
        linkedInData,
        gitHubData,
      ] = await Promise.all([
        searchQueries.length > 0 ? tavilySearch(searchQueries[0]) : null,
        companyUrl ? fetchWebsite(companyUrl) : null,
        crossRefLinkedIn(db, {
          email,
          firstName: contact.first_name,
          lastName: contact.last_name,
        }),
        email ? lookupGitHub(email) : null,
      ]);

      // 3. Build context for AI extraction
      const context = this._buildExtractionContext(contact, {
        tavily: tavilyResult,
        website: websiteData,
        linkedIn: linkedInData,
        gitHub: gitHubData,
      });

      // 4. AI extraction via OpenAI
      const enrichedData = await this._extractWithAI(contact, context);

      // 5. Match to ACT projects
      let projectMatches = [];
      const projectText = [
        enrichedData.role,
        enrichedData.organization,
        enrichedData.sector,
        enrichedData.interests?.join(' '),
        enrichedData.bio,
      ].filter(Boolean).join(' ');

      if (projectText.length > 10) {
        try {
          const matchFn = await getProjectMatcher();
          projectMatches = await matchFn(projectText, { activeOnly: true });
        } catch {
          // Non-blocking
        }
      }

      // 6. Prepare update payload
      const updates = {};
      if (enrichedData.organization && !contact.company_name) {
        updates.company_name = enrichedData.organization;
      }
      if (enrichedData.role) updates.enriched_role = enrichedData.role;
      if (enrichedData.sector) updates.enriched_sector = enrichedData.sector;
      if (enrichedData.bio) updates.enriched_bio = enrichedData.bio;
      if (enrichedData.location && !contact.city) updates.city = enrichedData.location;
      if (enrichedData.website) updates.enriched_website = enrichedData.website;

      // Merge new tags without duplicating
      const existingTags = contact.tags || [];
      const newTags = [...existingTags];
      if (enrichedData.sector && !newTags.includes(enrichedData.sector.toLowerCase())) {
        newTags.push(enrichedData.sector.toLowerCase());
      }
      if (gitHubData) newTags.push('github-profile');
      if (linkedInData) newTags.push('linkedin-matched');
      const uniqueTags = [...new Set(newTags)];
      if (uniqueTags.length > existingTags.length) {
        updates.tags = uniqueTags;
      }

      // Project alignment
      if (projectMatches.length > 0) {
        updates.enriched_projects = projectMatches.slice(0, 5).map(p => ({
          code: p.code,
          name: p.name,
          score: p.score,
        }));
      }

      // Sources used
      const sources = [];
      if (tavilyResult) sources.push('tavily');
      if (websiteData) sources.push('website');
      if (linkedInData) sources.push('linkedin');
      if (gitHubData) sources.push('github');
      updates.enrichment_sources = sources;
      updates.enrichment_status = 'enriched';
      updates.enriched_at = new Date().toISOString();

      // Store full enrichment data as JSONB
      updates.enrichment_data = {
        ...enrichedData,
        github: gitHubData ? {
          login: gitHubData.login,
          bio: gitHubData.bio,
          company: gitHubData.company,
          repos: gitHubData.public_repos,
          followers: gitHubData.followers,
        } : null,
        linkedin_crossref: linkedInData || null,
        project_matches: projectMatches.slice(0, 5),
        enriched_at: new Date().toISOString(),
      };

      // 7. Write updates
      if (!this.dryRun && Object.keys(updates).length > 0) {
        const { error } = await db
          .from('ghl_contacts')
          .update(updates)
          .eq('id', contact.id);

        if (error) {
          console.error(`[Enricher] Update failed for ${contact.id}:`, error.message);
          this.stats.errors++;
          return { status: 'error', error: error.message, contact: contact.id };
        }

        // Fire integration event
        await db.from('integration_events').insert({
          source: 'enricher',
          event_type: 'contact.enriched',
          entity_type: 'contact',
          entity_id: contact.id,
          action: 'enriched',
          payload: {
            name: name || email,
            sources,
            projects: projectMatches.slice(0, 3).map(p => p.code),
            sector: enrichedData.sector,
          },
          processed_at: new Date().toISOString(),
        });
      }

      this.stats.enriched++;
      this.log(`  ✓ Enriched from ${sources.join(', ')} — ${enrichedData.sector || 'no sector'}`);

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
      console.error(`[Enricher] Error enriching ${contact.id}:`, err.message);
      this.stats.errors++;

      // Mark as failed so we retry later
      if (!this.dryRun) {
        await db
          .from('ghl_contacts')
          .update({
            enrichment_status: 'failed',
            enrichment_data: { error: err.message, failed_at: new Date().toISOString() },
          })
          .eq('id', contact.id);
      }

      return { status: 'error', error: err.message, contact: contact.id };
    }
  }

  /**
   * Build context text from all data sources for AI extraction.
   */
  _buildExtractionContext(contact, sources) {
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
      if (sources.linkedIn.tags) parts.push(`LinkedIn Tags: ${sources.linkedIn.tags.join(', ')}`);
      parts.push(`Match Type: ${sources.linkedIn.source}`);
    }

    if (sources.gitHub) {
      parts.push('\n--- GitHub Profile ---');
      parts.push(`Username: ${sources.gitHub.login}`);
      if (sources.gitHub.name) parts.push(`Name: ${sources.gitHub.name}`);
      if (sources.gitHub.bio) parts.push(`Bio: ${sources.gitHub.bio}`);
      if (sources.gitHub.company) parts.push(`Company: ${sources.gitHub.company}`);
      if (sources.gitHub.location) parts.push(`Location: ${sources.gitHub.location}`);
      parts.push(`Repos: ${sources.gitHub.public_repos}, Followers: ${sources.gitHub.followers}`);
    }

    return parts.join('\n');
  }

  /**
   * Use OpenAI to extract structured data from gathered context.
   */
  async _extractWithAI(contact, context) {
    if (!context || context.length < 50) {
      return { confidence: 'low', note: 'Insufficient data for extraction' };
    }

    try {
      const completionFn = await getLLM();
      const raw = await completionFn(
        [
          {
            role: 'system',
            content: `You are a contact data enrichment assistant. Given web search results and other data about a person, extract structured information.

Return JSON only (no markdown):
{
  "organization": "Company or organization name",
  "role": "Job title or role",
  "sector": "One of: technology, education, arts, government, nonprofit, health, environment, finance, social-enterprise, indigenous, community, legal, media, other",
  "location": "City, State/Country",
  "bio": "1-2 sentence professional summary",
  "website": "Their personal or company website URL",
  "interests": ["topic1", "topic2"],
  "social_profiles": {"linkedin": "url", "twitter": "handle"},
  "confidence": "high|medium|low"
}

Only include fields you are reasonably confident about. Omit uncertain fields rather than guessing.`
          },
          { role: 'user', content: context }
        ],
        'contact-enricher',
        {
          model: 'gpt-4o-mini',
          temperature: 0.2,
          maxTokens: 500,
          operation: 'contact_enrichment',
        }
      );

      return JSON.parse(raw.trim());
    } catch (err) {
      console.warn('[Enricher] AI extraction failed:', err.message);
      return { confidence: 'low', error: err.message };
    }
  }

  /**
   * Batch enrich contacts that need enrichment.
   *
   * @param {object} options
   * @param {number} [options.limit] - Max contacts to process (default: 50)
   * @param {string} [options.status] - Filter by enrichment_status (default: 'pending')
   * @param {boolean} [options.includeStale] - Re-enrich contacts older than 30 days
   * @returns {object} Batch results
   */
  async enrichBatch(options = {}) {
    const db = await this._db();
    const limit = options.limit || 50;
    const status = options.status || 'pending';

    this.log(`Starting batch enrichment (limit: ${limit}, status: ${status})`);

    // Query contacts needing enrichment
    let query = db
      .from('ghl_contacts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options.includeStale) {
      // Pending OR stale (enriched > 30 days ago) OR failed
      const staleDate = new Date(Date.now() - 30 * 86400000).toISOString();
      query = query.or(`enrichment_status.eq.pending,enrichment_status.eq.failed,and(enrichment_status.eq.enriched,enriched_at.lt.${staleDate})`);
    } else {
      query = query.eq('enrichment_status', status);
    }

    const { data: contacts, error } = await query;

    if (error) {
      console.error('[Enricher] Batch query failed:', error.message);
      return { error: error.message, stats: this.stats };
    }

    if (!contacts?.length) {
      this.log('No contacts need enrichment');
      return { status: 'complete', message: 'No contacts need enrichment', stats: this.stats };
    }

    this.log(`Found ${contacts.length} contacts to enrich`);

    // Process with concurrency limit (avoid rate limits)
    const results = [];
    const concurrency = 3;

    for (let i = 0; i < contacts.length; i += concurrency) {
      const batch = contacts.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(c => this._enrichContactRecord(c))
      );
      results.push(...batchResults);

      // Brief pause between batches to respect rate limits
      if (i + concurrency < contacts.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    this.log(`\nBatch complete: ${this.stats.enriched} enriched, ${this.stats.skipped} skipped, ${this.stats.errors} errors`);

    return {
      status: 'complete',
      stats: { ...this.stats },
      results,
    };
  }

  /**
   * Enrich a single contact by email (convenience method).
   */
  async enrichByEmail(email) {
    const db = await this._db();
    const { data: contact } = await db
      .from('ghl_contacts')
      .select('id')
      .ilike('email', email)
      .limit(1)
      .single();

    if (!contact) return { error: 'Contact not found', email };
    return this.enrichContact(contact.id);
  }

  /**
   * Get enrichment stats from the database.
   */
  async getEnrichmentStats() {
    const db = await this._db();

    const { data, error } = await db.rpc('get_enrichment_stats').single();
    if (error) {
      // Fallback: manual count
      const { count: pending } = await db.from('ghl_contacts').select('*', { count: 'exact', head: true }).eq('enrichment_status', 'pending');
      const { count: enriched } = await db.from('ghl_contacts').select('*', { count: 'exact', head: true }).eq('enrichment_status', 'enriched');
      const { count: failed } = await db.from('ghl_contacts').select('*', { count: 'exact', head: true }).eq('enrichment_status', 'failed');
      const { count: total } = await db.from('ghl_contacts').select('*', { count: 'exact', head: true });

      return { pending, enriched, failed, total };
    }

    return data;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (process.argv[1]?.includes('contact-enricher')) {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'help';

  const enricher = new ContactEnricher({ verbose: true });

  if (cmd === 'contact' && args[1]) {
    const result = await enricher.enrichContact(args[1]);
    console.log(JSON.stringify(result, null, 2));
  } else if (cmd === 'email' && args[1]) {
    const result = await enricher.enrichByEmail(args[1]);
    console.log(JSON.stringify(result, null, 2));
  } else if (cmd === 'stats') {
    const stats = await enricher.getEnrichmentStats();
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.log(`Usage:
  node scripts/lib/contact-enricher.mjs contact <id>   Enrich single contact
  node scripts/lib/contact-enricher.mjs email <email>  Enrich by email
  node scripts/lib/contact-enricher.mjs stats          Show enrichment stats`);
  }
}

export default ContactEnricher;
