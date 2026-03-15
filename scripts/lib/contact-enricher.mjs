/**
 * Contact Enricher — ACT-specific wrapper around @act/contacts
 *
 * Wires up ACT infrastructure (Supabase, LLM client, project matcher)
 * into the generic @act/contacts enrichment engine.
 *
 * Existing scripts can continue importing from here:
 *   import { ContactEnricher } from './lib/contact-enricher.mjs';
 *
 * New code should use the package directly:
 *   import { ContactEnricher } from '@act/contacts/enrichment';
 *
 * Usage:
 *   const enricher = new ContactEnricher();
 *   const result = await enricher.enrichContact(contactId);
 *   const batch = await enricher.enrichBatch({ limit: 50 });
 */

// Re-export the package class for direct usage
export { ContactEnricher as BaseContactEnricher } from '../../packages/contacts/src/enrichment/index.mjs';

import { ContactEnricher as BaseEnricher } from '../../packages/contacts/src/enrichment/index.mjs';

/**
 * ACT-flavored ContactEnricher that auto-wires Supabase + LLM + project matching.
 * Lazy-loads all dependencies to avoid import failures in tests.
 */
export class ContactEnricher extends BaseEnricher {
  /**
   * @param {object} [options]
   * @param {object} [options.supabase] - Supabase client (auto-resolved if missing)
   * @param {boolean} [options.verbose]
   * @param {boolean} [options.dryRun]
   */
  constructor(options = {}) {
    // Defer supabase requirement — we'll set it lazily
    const supabase = options.supabase || { _placeholder: true };

    super({
      ...options,
      supabase,
      // LLM and project matcher will be set lazily
    });

    this._needsInit = !options.supabase;
    this._llmLoaded = false;
    this._projectLoaded = false;
  }

  async _ensureInit() {
    if (this._needsInit) {
      const { getSupabase } = await import('./supabase-client.mjs');
      this.supabase = getSupabase();
      this._needsInit = false;
    }

    if (!this._llmLoaded) {
      try {
        const { trackedCompletion } = await import('./llm-client.mjs');
        this.llmFn = trackedCompletion;
      } catch { /* LLM not available */ }
      this._llmLoaded = true;
    }

    if (!this._projectLoaded) {
      try {
        const { matchProjectFromText } = await import('./project-loader.mjs');
        this.projectMatchFn = matchProjectFromText;
      } catch { /* Project matcher not available */ }
      this._projectLoaded = true;
    }
  }

  async enrichContact(contactId) {
    await this._ensureInit();
    return super.enrichContact(contactId);
  }

  async enrichBatch(options = {}) {
    await this._ensureInit();
    return super.enrichBatch(options);
  }

  async enrichByEmail(email) {
    await this._ensureInit();
    return super.enrichByEmail(email);
  }

  async getEnrichmentStats() {
    await this._ensureInit();
    const { SupabaseContactRepository } = await import('../../packages/contacts/src/repository/index.mjs');
    const repo = new SupabaseContactRepository(this.supabase);
    return repo.getEnrichmentStats();
  }
}

// CLI support
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
