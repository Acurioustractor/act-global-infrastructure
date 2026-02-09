/**
 * Contact Intelligence: Auto-Create Contacts from Unknown Emails
 *
 * Checks ghl_contacts for matching email. If not found, creates a new
 * contact record with auto_created=true and fires an integration event.
 *
 * Usage:
 *   import { matchOrCreateContact } from './lib/contact-intelligence.mjs';
 *   const result = await matchOrCreateContact(supabase, email, { subject, from });
 */

import { shouldAutoCreateContact } from './cultural-guard.mjs';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTEXTUAL TAGGING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GOODS_KEYWORDS = [
  'goods on country', 'goods-on-country', 'goods_on_country',
  'circular economy', 'waste to wealth', 'waste-to-wealth',
  'manufacturing', 'recycl', 'upcycl', 'compost',
  'goods project', 'goods program',
];

/**
 * Infer project tags from subject line context.
 * Returns tags to add to auto-created contacts.
 *
 * @param {string} subject - Email subject line
 * @returns {string[]} Tags to apply
 */
export function contextualTags(subject) {
  if (!subject) return [];
  const lower = subject.toLowerCase();
  const tags = [];

  if (GOODS_KEYWORDS.some(kw => lower.includes(kw))) {
    tags.push('goods', 'goods-supporter');
  }

  return tags;
}

/**
 * Extract name from "Display Name <email>" format
 */
function extractNameFromHeader(fromHeader) {
  if (!fromHeader) return null;
  // "John Smith <john@example.com>" → "John Smith"
  const match = fromHeader.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  // Plain email
  return null;
}

/**
 * Extract email from header
 */
function extractEmail(value) {
  if (!value) return null;
  const match = value.match(/<([^>]+)>/);
  return match ? match[1].toLowerCase() : value.toLowerCase().trim();
}

/**
 * Match an email to existing contacts, or create a new one.
 *
 * @param {object} supabase - Supabase client
 * @param {string} email - Email address to match
 * @param {object} context - { subject, from, direction }
 * @returns {{ contactId: string|null, wasCreated: boolean }}
 */
export async function matchOrCreateContact(supabase, email, context = {}) {
  if (!email) return { contactId: null, wasCreated: false };

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check if contact exists
  const { data: existing } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id')
    .ilike('email', normalizedEmail)
    .limit(1)
    .single();

  if (existing) {
    return { contactId: existing.ghl_id || existing.id, wasCreated: false };
  }

  // 2. Check if we should auto-create
  if (!shouldAutoCreateContact(normalizedEmail)) {
    return { contactId: null, wasCreated: false };
  }

  // 3. Extract name from From header
  const displayName = extractNameFromHeader(context.from);
  const nameParts = displayName ? displayName.split(/\s+/) : [];
  const firstName = nameParts[0] || normalizedEmail.split('@')[0];
  const lastName = nameParts.slice(1).join(' ') || '';

  // 4. Infer contextual tags from subject line
  const autoTags = contextualTags(context.subject);
  const autoProjects = autoTags.includes('goods') ? ['goods'] : [];

  // 5. Create contact
  const contactId = crypto.randomUUID();
  const { data: created, error } = await supabase
    .from('ghl_contacts')
    .insert({
      id: contactId,
      ghl_id: `auto_${contactId.slice(0, 8)}`,
      ghl_location_id: process.env.GHL_LOCATION_ID || 'auto_created',
      email: normalizedEmail,
      first_name: firstName,
      last_name: lastName,
      source: 'gmail_auto',
      auto_created: true,
      auto_created_from: 'gmail_sync',
      first_seen_subject: (context.subject || '').substring(0, 200),
      enrichment_status: 'pending',
      last_synced_at: new Date().toISOString(),
      ...(autoTags.length > 0 && { tags: autoTags }),
      ...(autoProjects.length > 0 && { projects: autoProjects }),
    })
    .select('id, ghl_id')
    .single();

  if (error) {
    // Duplicate email (race condition) — just look up again
    if (error.code === '23505') {
      const { data: found } = await supabase
        .from('ghl_contacts')
        .select('id, ghl_id')
        .ilike('email', normalizedEmail)
        .limit(1)
        .single();
      return { contactId: found?.ghl_id || found?.id || null, wasCreated: false };
    }
    console.error(`[ContactIntel] Failed to create contact for ${normalizedEmail}:`, error.message);
    return { contactId: null, wasCreated: false };
  }

  // 6. Fire integration event
  await supabase.from('integration_events').insert({
    source: 'gmail',
    event_type: 'contact.auto_created',
    entity_type: 'contact',
    entity_id: created.id,
    action: 'created',
    payload: {
      email: normalizedEmail,
      name: displayName || firstName,
      first_seen_subject: context.subject,
      direction: context.direction || 'inbound',
    },
    processed_at: new Date().toISOString(),
  });

  return { contactId: created.ghl_id, wasCreated: true };
}

/**
 * Batch match/create for multiple emails
 *
 * @param {object} supabase - Supabase client
 * @param {Map} existingContactMap - Pre-loaded email → { ghl_contact_id } map
 * @param {Array} emails - Array of { email, from, subject, direction }
 * @returns {{ matched: number, created: number, results: Map }}
 */
export async function batchMatchOrCreate(supabase, existingContactMap, emails) {
  let matched = 0;
  let created = 0;
  const results = new Map();

  for (const item of emails) {
    const email = extractEmail(item.email || item.from);
    if (!email) continue;

    // Check pre-loaded map first
    const existing = existingContactMap.get(email);
    if (existing) {
      results.set(email, { contactId: existing.ghl_contact_id, wasCreated: false });
      matched++;
      continue;
    }

    // Try match or create
    const result = await matchOrCreateContact(supabase, email, {
      subject: item.subject,
      from: item.from,
      direction: item.direction,
    });

    results.set(email, result);
    if (result.wasCreated) {
      created++;
      // Add to map for subsequent lookups
      existingContactMap.set(email, { ghl_contact_id: result.contactId });
    } else if (result.contactId) {
      matched++;
    }
  }

  return { matched, created, results };
}

export default { matchOrCreateContact, batchMatchOrCreate, contextualTags };
