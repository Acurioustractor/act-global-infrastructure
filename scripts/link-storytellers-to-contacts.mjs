#!/usr/bin/env node
/**
 * Link Empathy Ledger v2 Storytellers to ACT Contacts
 *
 * Updates ghl_contacts in main ACT Supabase with:
 * - stories_count
 * - published_stories
 * - is_storyteller
 * - is_elder
 * - empathy_ledger_id
 *
 * USAGE:
 *   node scripts/link-storytellers-to-contacts.mjs [options]
 *
 * OPTIONS:
 *   --dry-run     Preview changes without updating
 *   --verbose     Show detailed matching info
 *
 * ENVIRONMENT:
 *   EL_SUPABASE_URL        - Empathy Ledger v2 Supabase URL
 *   EL_SUPABASE_SERVICE_KEY - Empathy Ledger v2 service role key
 *   SUPABASE_URL           - Main ACT Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY - Main ACT service role key
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUPABASE CLIENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createELClient() {
  const url = process.env.EL_SUPABASE_URL;
  const key = process.env.EL_SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('Missing EL_SUPABASE_URL or EL_SUPABASE_SERVICE_KEY');
  }

  return createClient(url, key);
}

function createACTClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, key);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATA FETCHING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getELStorytellers(elClient) {
  // Get storytellers with profile data (email is in profiles table)
  const { data: storytellers, error: sError } = await elClient
    .from('storytellers')
    .select(`
      id,
      display_name,
      is_elder,
      is_featured,
      is_active,
      profile:profiles!storytellers_profile_id_fkey (
        email
      )
    `)
    .eq('is_active', true);

  if (sError) {
    throw new Error(`Failed to fetch storytellers: ${sError.message}`);
  }

  // Flatten profile.email to storyteller.email
  const flatStorytellers = (storytellers || []).map(s => ({
    ...s,
    email: s.profile?.email || null,
    profile: undefined  // Remove nested object
  }));

  if (!flatStorytellers?.length) {
    return [];
  }

  // Get story counts
  const ids = flatStorytellers.map(s => s.id);
  const { data: stories, error: stError } = await elClient
    .from('stories')
    .select('storyteller_id, status')
    .in('storyteller_id', ids);

  if (stError) {
    console.warn(`Warning: Could not fetch stories: ${stError.message}`);
  }

  // Aggregate counts
  const countMap = new Map();
  (stories || []).forEach(story => {
    const id = story.storyteller_id;
    if (!countMap.has(id)) {
      countMap.set(id, { total: 0, published: 0 });
    }
    const c = countMap.get(id);
    c.total++;
    if (story.status === 'published') c.published++;
  });

  return flatStorytellers.map(s => ({
    ...s,
    stories_count: countMap.get(s.id)?.total || 0,
    published_stories: countMap.get(s.id)?.published || 0
  }));
}

async function getGHLContacts(actClient) {
  const { data, error } = await actClient
    .from('ghl_contacts')
    .select('id, email, full_name, tags, is_storyteller, empathy_ledger_id');

  if (error) {
    throw new Error(`Failed to fetch contacts: ${error.message}`);
  }

  return data || [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MATCHING LOGIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function normalizeEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

function normalizeName(name) {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchStorytellersToContacts(storytellers, contacts) {
  const matches = [];
  const unmatched = [];

  // Build lookup maps
  const contactByEmail = new Map();
  const contactByName = new Map();

  contacts.forEach(c => {
    const email = normalizeEmail(c.email);
    const name = normalizeName(c.full_name);

    if (email) contactByEmail.set(email, c);
    if (name) contactByName.set(name, c);
  });

  // Match storytellers
  storytellers.forEach(s => {
    const email = normalizeEmail(s.email);
    const name = normalizeName(s.display_name);

    // Try email match first
    let contact = email ? contactByEmail.get(email) : null;
    let matchType = 'email';

    // Fall back to name match
    if (!contact && name) {
      contact = contactByName.get(name);
      matchType = 'name';
    }

    if (contact) {
      matches.push({
        storyteller: s,
        contact,
        matchType
      });
    } else {
      unmatched.push(s);
    }
  });

  return { matches, unmatched };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UPDATE LOGIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function updateContacts(actClient, matches, options = {}) {
  const { dryRun = false, verbose = false } = options;

  let updated = 0;
  let errors = 0;

  for (const { storyteller, contact, matchType } of matches) {
    const updates = {
      is_storyteller: true,
      is_elder: storyteller.is_elder || false,
      stories_count: storyteller.stories_count,
      published_stories: storyteller.published_stories,
      empathy_ledger_id: storyteller.id,
      el_last_synced_at: new Date().toISOString()
    };

    // Also add Storyteller tag if not present
    const tags = contact.tags || [];
    if (!tags.includes('Storyteller')) {
      updates.tags = [...tags, 'Storyteller'];
    }
    if (storyteller.is_elder && !tags.includes('Elder')) {
      updates.tags = updates.tags || [...tags];
      if (!updates.tags.includes('Elder')) {
        updates.tags.push('Elder');
      }
    }

    if (verbose) {
      console.log(`  ${contact.full_name} ← ${storyteller.display_name} (${matchType})`);
      console.log(`    Stories: ${storyteller.stories_count} (${storyteller.published_stories} published)`);
      if (storyteller.is_elder) console.log(`    Elder: yes`);
    }

    if (dryRun) {
      updated++;
      continue;
    }

    try {
      const { error } = await actClient
        .from('ghl_contacts')
        .update(updates)
        .eq('id', contact.id);

      if (error) {
        console.error(`  Error updating ${contact.full_name}: ${error.message}`);
        errors++;
      } else {
        updated++;
      }
    } catch (err) {
      console.error(`  Error updating ${contact.full_name}: ${err.message}`);
      errors++;
    }
  }

  return { updated, errors };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Link EL v2 Storytellers → ACT Contacts');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  if (dryRun) console.log('  Mode: DRY RUN');
  console.log();

  // Connect
  let elClient, actClient;

  try {
    elClient = createELClient();
    console.log('  ✓ Connected to Empathy Ledger v2');
  } catch (err) {
    console.error('  ✗ EL v2 connection failed:', err.message);
    process.exit(1);
  }

  try {
    actClient = createACTClient();
    console.log('  ✓ Connected to ACT Supabase');
  } catch (err) {
    console.error('  ✗ ACT Supabase connection failed:', err.message);
    process.exit(1);
  }

  console.log();

  // Fetch data
  console.log('Fetching data...');
  const storytellers = await getELStorytellers(elClient);
  console.log(`  EL v2 Storytellers: ${storytellers.length}`);

  const contacts = await getGHLContacts(actClient);
  console.log(`  GHL Contacts: ${contacts.length}`);
  console.log();

  // Match
  console.log('Matching storytellers to contacts...');
  const { matches, unmatched } = matchStorytellersToContacts(storytellers, contacts);
  console.log(`  Matched: ${matches.length}`);
  console.log(`  Unmatched: ${unmatched.length}`);

  // Show match breakdown
  const emailMatches = matches.filter(m => m.matchType === 'email').length;
  const nameMatches = matches.filter(m => m.matchType === 'name').length;
  console.log(`    By email: ${emailMatches}`);
  console.log(`    By name: ${nameMatches}`);
  console.log();

  if (matches.length === 0) {
    console.log('No matches found - nothing to update');
    return;
  }

  // Update
  console.log('Updating contacts...');
  if (verbose) console.log();

  const { updated, errors } = await updateContacts(actClient, matches, { dryRun, verbose });

  console.log();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Storytellers in EL v2: ${storytellers.length}`);
  console.log(`  Matched to contacts: ${matches.length}`);
  if (dryRun) {
    console.log(`  Would update: ${updated}`);
  } else {
    console.log(`  Updated: ${updated}`);
    console.log(`  Errors: ${errors}`);
  }

  // Story stats
  const totalStories = storytellers.reduce((sum, s) => sum + s.stories_count, 0);
  const publishedStories = storytellers.reduce((sum, s) => sum + s.published_stories, 0);
  const elders = storytellers.filter(s => s.is_elder).length;

  console.log();
  console.log('  Storyteller Stats:');
  console.log(`    Total stories: ${totalStories}`);
  console.log(`    Published: ${publishedStories}`);
  console.log(`    Elders: ${elders}`);

  // Show unmatched if any
  if (unmatched.length > 0 && verbose) {
    console.log();
    console.log('  Unmatched Storytellers:');
    unmatched.forEach(s => {
      console.log(`    - ${s.display_name} (${s.email || 'no email'})`);
    });
  }

  console.log();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
