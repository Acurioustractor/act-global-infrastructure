/**
 * @act/contacts/matching — Contact Matching Engine
 *
 * Fuzzy matching for contacts across any data source.
 * Zero dependencies — works with any array of contact objects.
 *
 * Usage:
 *   import { ContactMatcher } from '@act/contacts/matching';
 *
 *   const matcher = new ContactMatcher(contactsArray);
 *   const match = matcher.findByEmail('ben@act.place');
 *   const fuzzy = matcher.findByName('Benjamin Knight');
 *   const best  = matcher.findBestMatch({ name: 'Ben Knight', email: 'ben@act.place' });
 *
 *   // From Supabase (any table):
 *   const matcher = await ContactMatcher.fromSupabase(supabaseClient, { table: 'ghl_contacts' });
 */

export class ContactMatcher {
  /**
   * @param {Array<object>} contacts - Array of contact records from any source
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
      // Index by all known ID fields
      const idFields = ['id', 'ghl_contact_id', 'ghl_id', 'external_id', 'source_id'];
      for (const field of idFields) {
        if (contact[field]) this.byId.set(contact[field], contact);
      }

      // Index by email (all known email fields)
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
   * Create a ContactMatcher from a Supabase table.
   * Works with any Supabase client and any contacts table.
   *
   * @param {object} supabase - Supabase client instance
   * @param {object} [options]
   * @param {string} [options.table] - Table name (default: 'contacts')
   * @param {string} [options.select] - Select columns
   * @returns {Promise<ContactMatcher>}
   */
  static async fromSupabase(supabase, options = {}) {
    if (!supabase) {
      throw new Error('Supabase client is required for ContactMatcher.fromSupabase()');
    }

    const table = options.table || 'contacts';
    const select = options.select || 'id, name, full_name, display_name, first_name, last_name, email, primary_email, emails, ghl_contact_id, ghl_id, organization, company_name, tags';

    const { data, error } = await supabase
      .from(table)
      .select(select);

    if (error) {
      console.error(`[ContactMatcher] Failed to load from ${table}:`, error.message);
      return new ContactMatcher([]);
    }

    return new ContactMatcher(data || []);
  }

  /**
   * Create a ContactMatcher from any data source.
   * Accepts an async function that returns an array of contacts.
   *
   * @param {() => Promise<Array<object>>} loader - Async function returning contacts
   * @returns {Promise<ContactMatcher>}
   */
  static async fromLoader(loader) {
    const contacts = await loader();
    return new ContactMatcher(contacts || []);
  }

  /**
   * Find a contact by exact email match.
   * @param {string} email
   * @returns {object|null}
   */
  findByEmail(email) {
    if (!email) return null;
    return this.byEmail.get(email.toLowerCase().trim()) || null;
  }

  /**
   * Find a contact by ID (checks all ID fields).
   * @param {string} id
   * @returns {object|null}
   */
  findById(id) {
    if (!id) return null;
    return this.byId.get(id) || null;
  }

  /**
   * Find a contact by name (fuzzy match).
   * @param {string} name
   * @returns {object|null}
   */
  findByName(name) {
    if (!name) return null;
    const key = this._normaliseName(name);
    if (key.length < 2) return null;

    // Exact normalised match
    if (this.byName.has(key)) return this.byName.get(key);

    // Partial match (substring in either direction)
    for (const [storedKey, contact] of this.byName) {
      if (storedKey.includes(key) || key.includes(storedKey)) {
        return contact;
      }
    }

    return null;
  }

  /**
   * Find the best matching contact using ID > email > name priority.
   *
   * @param {object} criteria
   * @param {string} [criteria.email]
   * @param {string} [criteria.name]
   * @param {string} [criteria.id]
   * @returns {{ contact: object|null, matchedOn: string|null, confidence: number }}
   */
  findBestMatch({ email, name, id } = {}) {
    if (id) {
      const byId = this.findById(id);
      if (byId) return { contact: byId, matchedOn: 'id', confidence: 1.0 };
    }

    if (email) {
      const byEmail = this.findByEmail(email);
      if (byEmail) return { contact: byEmail, matchedOn: 'email', confidence: 0.95 };
    }

    if (name) {
      const byName = this.findByName(name);
      if (byName) return { contact: byName, matchedOn: 'name', confidence: 0.7 };
    }

    return { contact: null, matchedOn: null, confidence: 0 };
  }

  /**
   * Batch-match records against contacts.
   *
   * @param {Array<object>} records
   * @param {object} [options]
   * @param {string} [options.emailField] - Field name for email (default: 'email')
   * @param {string} [options.nameField] - Field name for name (default: 'name')
   * @param {string} [options.idField] - Field name for ID (default: 'id')
   * @returns {Array<{ record: object, contact: object|null, matchedOn: string|null, confidence: number }>}
   */
  batchMatch(records, options = {}) {
    const emailField = options.emailField || 'email';
    const nameField = options.nameField || 'name';
    const idField = options.idField || 'id';

    return records.map(record => {
      const result = this.findBestMatch({
        email: record[emailField],
        name: record[nameField],
        id: record[idField],
      });
      return { record, ...result };
    });
  }

  /**
   * Get unmatched records from a batch.
   *
   * @param {Array<object>} records
   * @param {object} [options] - Same as batchMatch options
   * @returns {Array<object>} Records that didn't match any contact
   */
  findUnmatched(records, options = {}) {
    return this.batchMatch(records, options)
      .filter(r => r.contact === null)
      .map(r => r.record);
  }

  /**
   * Merge another ContactMatcher's contacts into this one.
   * Useful for combining contacts from multiple sources.
   *
   * @param {ContactMatcher} other
   * @returns {ContactMatcher} New merged matcher
   */
  merge(other) {
    const allContacts = [...this.contacts, ...other.contacts];
    return new ContactMatcher(allContacts);
  }

  /** @returns {{ totalContacts: number, emailIndex: number, nameIndex: number }} */
  get stats() {
    return {
      totalContacts: this.contacts.length,
      emailIndex: this.byEmail.size,
      nameIndex: this.byName.size,
    };
  }

  /**
   * Normalise a name for fuzzy matching.
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
