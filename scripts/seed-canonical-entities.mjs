#!/usr/bin/env node
/**
 * Seed Canonical Entities from Existing Data Sources
 *
 * One-time script to populate canonical_entities from:
 * 1. ghl_contacts (primary source)
 * 2. xero_invoices (unique contact names)
 * 3. communications_history (unknown sender emails)
 *
 * Uses the resolve_entity() SQL function which handles dedup by email/phone.
 *
 * Usage:
 *   node scripts/seed-canonical-entities.mjs
 *   node scripts/seed-canonical-entities.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const DRY_RUN = process.argv.includes('--dry-run');

const stats = { ghl: { created: 0, matched: 0, skipped: 0, errors: 0 }, xero: { created: 0, matched: 0, skipped: 0, errors: 0 }, gmail: { created: 0, matched: 0, skipped: 0, errors: 0 } };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEED FROM GHL CONTACTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function seedFromGHLContacts() {
  console.log('\n── Seeding from ghl_contacts ──');

  // Fetch all contacts with pagination (Supabase caps at 1000 per request)
  const contacts = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data: page, error } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, first_name, last_name, full_name, email, phone, company_name')
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('Failed to fetch ghl_contacts:', error.message);
      return;
    }
    contacts.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  console.log(`Found ${contacts.length} GHL contacts`);

  for (const contact of contacts) {
    const name = contact.full_name || [contact.first_name, contact.last_name].filter(Boolean).join(' ');
    if (!name || name.trim() === '') {
      stats.ghl.skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  [DRY] resolve_entity('ghl', '${contact.ghl_id}', '${name}', '${contact.email || ''}', ...)`);
      stats.ghl.created++;
      continue;
    }

    try {
      // Check if already linked
      const { data: existing } = await supabase
        .from('entity_identifiers')
        .select('entity_id')
        .eq('source', 'ghl')
        .eq('source_record_id', contact.ghl_id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update ghl_contacts with canonical_entity_id
        await supabase
          .from('ghl_contacts')
          .update({ canonical_entity_id: existing.entity_id })
          .eq('ghl_id', contact.ghl_id);
        stats.ghl.matched++;
        continue;
      }

      const { data: entityId, error: rpcError } = await supabase.rpc('resolve_entity', {
        p_source: 'ghl',
        p_source_id: contact.ghl_id,
        p_name: name.trim(),
        p_email: contact.email || null,
        p_phone: contact.phone || null,
        p_company: contact.company_name || null,
        p_entity_type: 'person',
      });

      if (rpcError) {
        console.error(`  Error resolving ${name}: ${rpcError.message}`);
        stats.ghl.errors++;
        continue;
      }

      // Link ghl_contact to canonical entity
      await supabase
        .from('ghl_contacts')
        .update({ canonical_entity_id: entityId })
        .eq('ghl_id', contact.ghl_id);

      stats.ghl.created++;
    } catch (err) {
      console.error(`  Error for ${name}:`, err.message);
      stats.ghl.errors++;
    }
  }

  console.log(`  GHL: created=${stats.ghl.created}, matched=${stats.ghl.matched}, skipped=${stats.ghl.skipped}, errors=${stats.ghl.errors}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEED FROM XERO INVOICES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function seedFromXeroInvoices() {
  console.log('\n── Seeding from xero_invoices ──');

  const { data: invoices, error } = await supabase
    .from('xero_invoices')
    .select('contact_name, contact_id')
    .not('contact_name', 'is', null);

  if (error) {
    console.error('Failed to fetch xero_invoices:', error.message);
    return;
  }

  // Deduplicate by contact_id
  const uniqueContacts = new Map();
  for (const inv of invoices) {
    if (inv.contact_id && inv.contact_name && !uniqueContacts.has(inv.contact_id)) {
      uniqueContacts.set(inv.contact_id, inv.contact_name);
    }
  }

  console.log(`Found ${uniqueContacts.size} unique Xero contacts`);

  for (const [contactId, contactName] of uniqueContacts) {
    if (DRY_RUN) {
      console.log(`  [DRY] resolve_entity('xero', '${contactId}', '${contactName}')`);
      stats.xero.created++;
      continue;
    }

    try {
      const { error: rpcError } = await supabase.rpc('resolve_entity', {
        p_source: 'xero',
        p_source_id: contactId,
        p_name: contactName.trim(),
        p_entity_type: 'person',
      });

      if (rpcError) {
        console.error(`  Error resolving Xero ${contactName}: ${rpcError.message}`);
        stats.xero.errors++;
        continue;
      }

      stats.xero.created++;
    } catch (err) {
      console.error(`  Error for Xero ${contactName}:`, err.message);
      stats.xero.errors++;
    }
  }

  console.log(`  Xero: created=${stats.xero.created}, matched=${stats.xero.matched}, skipped=${stats.xero.skipped}, errors=${stats.xero.errors}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEED FROM COMMUNICATIONS HISTORY (UNKNOWN SENDERS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function seedFromGmailSenders() {
  console.log('\n── Seeding from communications_history (unmatched senders) ──');

  // Get unique sender emails that don't have a ghl_contact
  const { data: senders, error } = await supabase
    .from('communications_history')
    .select('from_identity, contact_email')
    .is('ghl_contact_id', null)
    .not('from_identity', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch communications_history:', error.message);
    return;
  }

  // Deduplicate by email - extract email from from_identity ("Name <email>" format)
  const uniqueSenders = new Map();
  for (const s of senders) {
    const fromStr = s.from_identity || '';
    const emailMatch = fromStr.match(/<([^>]+)>/);
    const email = (emailMatch ? emailMatch[1] : s.contact_email || fromStr).toLowerCase().trim();
    if (email && email.includes('@') && !uniqueSenders.has(email)) {
      const nameMatch = fromStr.match(/^"?([^"<]+)"?\s*</);
      const name = nameMatch ? nameMatch[1].trim() : email.split('@')[0];
      uniqueSenders.set(email, name);
    }
  }

  // Filter out known internal emails
  const internalDomains = ['act.place', 'empathy-ledger.local', 'placeholder.local', 'example.com'];
  const filtered = [...uniqueSenders.entries()].filter(([email]) =>
    !internalDomains.some(d => email.endsWith(`@${d}`))
  );

  console.log(`Found ${filtered.length} unique unmatched sender emails`);

  for (const [email, name] of filtered) {
    if (DRY_RUN) {
      console.log(`  [DRY] resolve_entity('gmail', '${email}', '${name}', '${email}')`);
      stats.gmail.created++;
      continue;
    }

    try {
      const { error: rpcError } = await supabase.rpc('resolve_entity', {
        p_source: 'gmail',
        p_source_id: email,
        p_name: name.trim(),
        p_email: email,
        p_entity_type: 'person',
      });

      if (rpcError) {
        console.error(`  Error resolving Gmail ${email}: ${rpcError.message}`);
        stats.gmail.errors++;
        continue;
      }

      stats.gmail.created++;
    } catch (err) {
      console.error(`  Error for Gmail ${email}:`, err.message);
      stats.gmail.errors++;
    }
  }

  console.log(`  Gmail: created=${stats.gmail.created}, matched=${stats.gmail.matched}, skipped=${stats.gmail.skipped}, errors=${stats.gmail.errors}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('=== Seed Canonical Entities ===');
  if (DRY_RUN) console.log('🔵 DRY RUN — no changes will be made\n');

  // Check current state
  const { count: existingCount } = await supabase
    .from('canonical_entities')
    .select('*', { count: 'exact', head: true });
  console.log(`Current canonical_entities count: ${existingCount || 0}`);

  await seedFromGHLContacts();
  await seedFromXeroInvoices();
  await seedFromGmailSenders();

  // Final count
  if (!DRY_RUN) {
    const { count: finalCount } = await supabase
      .from('canonical_entities')
      .select('*', { count: 'exact', head: true });
    console.log(`\n=== Final canonical_entities count: ${finalCount} ===`);
  }

  console.log('\n=== Summary ===');
  console.log(`GHL:   ${stats.ghl.created} created, ${stats.ghl.matched} matched, ${stats.ghl.skipped} skipped, ${stats.ghl.errors} errors`);
  console.log(`Xero:  ${stats.xero.created} created, ${stats.xero.matched} matched, ${stats.xero.skipped} skipped, ${stats.xero.errors} errors`);
  console.log(`Gmail: ${stats.gmail.created} created, ${stats.gmail.matched} matched, ${stats.gmail.skipped} skipped, ${stats.gmail.errors} errors`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
