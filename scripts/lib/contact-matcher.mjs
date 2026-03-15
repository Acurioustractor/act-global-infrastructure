/**
 * Contact Matcher Library
 *
 * Unified fuzzy matching for contacts across all sync scripts.
 * Replaces 3+ duplicate implementations in sync-xero, daily-briefing, sync-ghl.
 *
 * Usage:
 *   import { ContactMatcher } from './lib/contact-matcher.mjs';
 *
 *   const matcher = await ContactMatcher.fromSupabase(supabase);
 *   const match = matcher.findByEmail('ben@act.place');
 *   const fuzzy = matcher.findByName('Benjamin Knight');
 *   const best  = matcher.findBestMatch({ name: 'Ben Knight', email: 'ben@act.place' });
 */

export class ContactMatcher {
  /**
   * @param {Array<object>} contacts - Array of contact records
   */
  constructor(contacts = []) {
    /** @type {Map<string, object>} email → contact */
    this.byEmail = new Map();
    /** @type {Map<string, object>} normalised name → contact */
    this.byName = new Map();
    /** @type {Map<string, object>} id → contact */
    this.byId = new Map();
    /** @type {Array<object>} raw contact list */
    this.contacts = contacts;

    for (const contact of contacts) {
      // Index by ID
      if (contact.id) this.byId.set(contact.id, contact);
      if (contact.ghl_contact_id) this.byId.set(contact.ghl_contact_id, contact);

      // Index by email (all known emails)
      const emails = [
        contact.email,
        contact.primary_email,
        ...(contact.emails || []),
      ].filter(Boolean);

      for (const email of emails) {
        this.byEmail.set(email.toLowerCase().trim(), contact);
      }

      // Index by normalised name
      const names = [
        contact.name,
        contact.full_name,
        contact.display_name,
        [contact.first_name, contact.last_name].filter(Boolean).join(' '),
      ].filter(Boolean);

      for (const name of names) {
        const key = this._normaliseName(name);
        if (key.length >= 2) {
          this.byName.set(key, contact);
        }
      }
    }
  }

  /**
   * Create a ContactMatcher from Supabase contacts table.
   *
   * @param {import('@supabase/supabase-js').SupabaseClient} [supabase]
   * @param {object} [options]
   * @param {string} [options.table] - Table name (default: 'contacts')
   * @param {string} [options.select] - Select columns
   * @returns {Promise<ContactMatcher>}
   */
  static async fromSupabase(supabase, options = {}) {
    let sb = supabase;
    if (!sb) {
      const { getSupabase } = await import('./supabase-client.mjs');
      sb = getSupabase();
    }
    const table = options.table || 'contacts';
    const select = options.select || 'id, name, full_name, display_name, first_name, last_name, email, primary_email, emails, ghl_contact_id, organization, tags';

    const { data, error } = await sb
      .from(table)
      .select(select);

    if (error) {
      console.error(`[ContactMatcher] Failed to load contacts from ${table}:`, error.message);
      return new ContactMatcher([]);
    }

    return new ContactMatcher(data || []);
  }

  /**
   * Find a contact by exact email match.
   *
   * @param {string} email
   * @returns {object|null}
   */
  findByEmail(email) {
    if (!email) return null;
    return this.byEmail.get(email.toLowerCase().trim()) || null;
  }

  /**
   * Find a contact by ID (supports both internal and GHL IDs).
   *
   * @param {string} id
   * @returns {object|null}
   */
  findById(id) {
    if (!id) return null;
    return this.byId.get(id) || null;
  }

  /**
   * Find a contact by name (fuzzy match).
   *
   * @param {string} name
   * @returns {object|null} Best matching contact or null
   */
  findByName(name) {
    if (!name) return null;
    const key = this._normaliseName(name);
    if (key.length < 2) return null;

    // Exact normalised match
    if (this.byName.has(key)) return this.byName.get(key);

    // Try partial match (first + last name fragments)
    for (const [storedKey, contact] of this.byName) {
      if (storedKey.includes(key) || key.includes(storedKey)) {
        return contact;
      }
    }

    return null;
  }

  /**
   * Find the best matching contact using email (preferred) then name (fallback).
   *
   * @param {object} criteria
   * @param {string} [criteria.email]
   * @param {string} [criteria.name]
   * @param {string} [criteria.id]
   * @returns {{ contact: object|null, matchedOn: string|null, confidence: number }}
   */
  findBestMatch({ email, name, id } = {}) {
    // Try ID first (highest confidence)
    if (id) {
      const byId = this.findById(id);
      if (byId) return { contact: byId, matchedOn: 'id', confidence: 1.0 };
    }

    // Then email (high confidence)
    if (email) {
      const byEmail = this.findByEmail(email);
      if (byEmail) return { contact: byEmail, matchedOn: 'email', confidence: 0.95 };
    }

    // Then name (lower confidence)
    if (name) {
      const byName = this.findByName(name);
      if (byName) return { contact: byName, matchedOn: 'name', confidence: 0.7 };
    }

    return { contact: null, matchedOn: null, confidence: 0 };
  }

  /**
   * Batch-match an array of records against contacts.
   *
   * @param {Array<object>} records - Records with name/email fields
   * @param {object} [options]
   * @param {string} [options.emailField] - Field name for email (default: 'email')
   * @param {string} [options.nameField] - Field name for name (default: 'name')
   * @returns {Array<{ record: object, match: object|null, matchedOn: string|null, confidence: number }>}
   */
  batchMatch(records, options = {}) {
    const emailField = options.emailField || 'email';
    const nameField = options.nameField || 'name';

    return records.map(record => {
      const result = this.findBestMatch({
        email: record[emailField],
        name: record[nameField],
      });
      return { record, ...result };
    });
  }

  /**
   * Get stats about the matcher index.
   *
   * @returns {{ totalContacts: number, emailIndex: number, nameIndex: number }}
   */
  get stats() {
    return {
      totalContacts: this.contacts.length,
      emailIndex: this.byEmail.size,
      nameIndex: this.byName.size,
    };
  }

  /**
   * Normalise a name for fuzzy matching.
   * Lowercases, removes titles/suffixes, collapses whitespace.
   *
   * @param {string} name
   * @returns {string}
   * @private
   */
  _normaliseName(name) {
    return name
      .toLowerCase()
      .replace(/\b(mr|mrs|ms|dr|prof|sir|jr|sr|ii|iii|iv)\b\.?/g, '')
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export default ContactMatcher;
