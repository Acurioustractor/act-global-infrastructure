#!/usr/bin/env node
/**
 * Sync Empathy Ledger v2 Storytellers to GHL Contacts
 *
 * Synchronizes storyteller data from Empathy Ledger v2 database to GHL CRM.
 * Creates/updates contacts with proper tags and custom fields.
 *
 * STRATEGIC IMPORTANCE:
 * - Core to ACT mission: storytellers OWN their data
 * - Measures impact through community storytelling
 * - Links stories_count to contact profiles
 *
 * USAGE:
 *   node scripts/sync-storytellers-to-ghl.mjs [options]
 *
 * OPTIONS:
 *   --dry-run     Preview changes without writing to GHL
 *   --limit N     Limit to N storytellers (for testing)
 *   --force       Force sync even if recently synced
 *
 * ENVIRONMENT:
 *   EL_SUPABASE_URL        - Empathy Ledger v2 Supabase URL
 *   EL_SUPABASE_SERVICE_KEY - Empathy Ledger v2 service role key
 *   GHL_API_KEY            - GoHighLevel API key
 *   GHL_LOCATION_ID        - GoHighLevel location ID
 */

import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CONFIG = {
  // Tags to apply to GHL contacts
  TAGS: {
    BASE: 'Storyteller',
    ELDER: 'Elder',
    FEATURED: 'Featured Storyteller',
    JUSTICEHUB: 'JusticeHub',
    SOURCE: 'Empathy Ledger'
  },

  // Custom field mappings (GHL field IDs need to be configured)
  CUSTOM_FIELDS: {
    EMPATHY_LEDGER_ID: 'empathy_ledger_id',
    STORY_COUNT: 'story_count',
    PUBLISHED_STORIES: 'published_stories',
    CULTURAL_BACKGROUND: 'cultural_background',
    LANGUAGES: 'languages',
    EXPERTISE: 'expertise'
  },

  // Sync settings
  BATCH_SIZE: 50,
  SYNC_THRESHOLD_HOURS: 24  // Skip if synced within this many hours
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUPABASE CLIENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Empathy Ledger v2 Supabase (source)
function createELClient() {
  const url = process.env.EL_SUPABASE_URL;
  const key = process.env.EL_SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing EL credentials. Set EL_SUPABASE_URL and EL_SUPABASE_SERVICE_KEY'
    );
  }

  return createClient(url, key);
}

// Main ACT Supabase (for sync tracking - optional, can use EL's ghl_contact_sync)
function createACTClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn('ACT Supabase not configured - using EL database for sync tracking');
    return null;
  }

  return createClient(url, key);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATA FETCHING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get storytellers with story counts from EL v2
 */
async function getStorytellersWithCounts(elClient, options = {}) {
  const { limit } = options;

  // Get active storytellers with profile email
  // Note: avatar_url was renamed to public_avatar_url in EL v2
  // email was moved to profiles table
  let query = elClient
    .from('storytellers')
    .select(`
      id,
      profile_id,
      display_name,
      bio,
      location,
      cultural_background,
      language_skills,
      areas_of_expertise,
      public_avatar_url,
      is_active,
      is_elder,
      is_featured,
      is_justicehub_featured,
      justicehub_enabled,
      author_role,
      created_at,
      updated_at,
      profiles:profile_id (
        email,
        full_name
      )
    `)
    .eq('is_active', true)
    .order('updated_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: storytellers, error: storytellerError } = await query;

  if (storytellerError) {
    throw new Error(`Failed to fetch storytellers: ${storytellerError.message}`);
  }

  if (!storytellers || storytellers.length === 0) {
    return [];
  }

  // Get story counts for each storyteller
  const storytellerIds = storytellers.map(s => s.id);

  const { data: storyCounts, error: storyError } = await elClient
    .from('stories')
    .select('storyteller_id, status')
    .in('storyteller_id', storytellerIds);

  if (storyError) {
    console.warn(`Warning: Could not fetch story counts: ${storyError.message}`);
  }

  // Aggregate story counts
  const countMap = new Map();
  (storyCounts || []).forEach(story => {
    const id = story.storyteller_id;
    if (!countMap.has(id)) {
      countMap.set(id, { total: 0, published: 0, draft: 0 });
    }
    const counts = countMap.get(id);
    counts.total++;
    if (story.status === 'published') counts.published++;
    else if (story.status === 'draft') counts.draft++;
  });

  // Enrich storytellers with counts
  return storytellers.map(s => ({
    ...s,
    story_count: countMap.get(s.id)?.total || 0,
    published_stories: countMap.get(s.id)?.published || 0,
    draft_stories: countMap.get(s.id)?.draft || 0
  }));
}

/**
 * Get existing GHL sync records from EL database
 */
async function getExistingSyncRecords(elClient, storytellerIds) {
  const { data, error } = await elClient
    .from('ghl_contact_sync')
    .select('storyteller_id, ghl_contact_id, last_sync_at, sync_status')
    .in('storyteller_id', storytellerIds);

  if (error) {
    console.warn(`Warning: Could not fetch sync records: ${error.message}`);
    return new Map();
  }

  const syncMap = new Map();
  (data || []).forEach(record => {
    syncMap.set(record.storyteller_id, record);
  });

  return syncMap;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GHL SYNC LOGIC
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Convert storyteller to GHL contact data
 */
function storytellerToGHLContact(storyteller) {
  // Parse name into first/last
  const nameParts = (storyteller.display_name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Build tags
  const tags = [CONFIG.TAGS.BASE, CONFIG.TAGS.SOURCE];
  if (storyteller.is_elder) tags.push(CONFIG.TAGS.ELDER);
  if (storyteller.is_featured) tags.push(CONFIG.TAGS.FEATURED);
  if (storyteller.is_justicehub_featured || storyteller.justicehub_enabled) {
    tags.push(CONFIG.TAGS.JUSTICEHUB);
  }

  // Build custom fields
  const customFields = {
    [CONFIG.CUSTOM_FIELDS.EMPATHY_LEDGER_ID]: storyteller.id,
    [CONFIG.CUSTOM_FIELDS.STORY_COUNT]: String(storyteller.story_count || 0),
    [CONFIG.CUSTOM_FIELDS.PUBLISHED_STORIES]: String(storyteller.published_stories || 0)
  };

  if (storyteller.cultural_background?.length > 0) {
    customFields[CONFIG.CUSTOM_FIELDS.CULTURAL_BACKGROUND] =
      storyteller.cultural_background.join(', ');
  }
  if (storyteller.language_skills?.length > 0) {
    customFields[CONFIG.CUSTOM_FIELDS.LANGUAGES] =
      storyteller.language_skills.join(', ');
  }
  if (storyteller.areas_of_expertise?.length > 0) {
    customFields[CONFIG.CUSTOM_FIELDS.EXPERTISE] =
      storyteller.areas_of_expertise.join(', ');
  }

  return {
    firstName,
    lastName,
    email: storyteller.profiles?.email || '',
    address1: storyteller.location || '',
    tags,
    customFields,
    source: 'Empathy Ledger'
  };
}

/**
 * Sync a single storyteller to GHL
 */
async function syncStorytellerToGHL(
  storyteller,
  existingSync,
  ghlService,
  elClient,
  options = {}
) {
  const { dryRun = false, force = false } = options;

  // Check if recently synced (unless forced)
  if (existingSync && !force) {
    const lastSync = new Date(existingSync.last_sync_at);
    const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSync < CONFIG.SYNC_THRESHOLD_HOURS) {
      return { status: 'skipped', reason: 'recently_synced' };
    }
  }

  const contactData = storytellerToGHLContact(storyteller);

  if (dryRun) {
    console.log(`  [DRY RUN] Would sync: ${storyteller.display_name}`);
    console.log(`    Email: ${contactData.email || '(none)'}`);
    console.log(`    Tags: ${contactData.tags.join(', ')}`);
    console.log(`    Stories: ${storyteller.story_count} (${storyteller.published_stories} published)`);
    return { status: 'dry_run', contactData };
  }

  try {
    let ghlContactId = existingSync?.ghl_contact_id;
    let created = false;

    if (ghlContactId) {
      // Update existing contact
      await ghlService.updateContact(ghlContactId, contactData);
    } else if (contactData.email) {
      // Try to find by email first
      const existing = await ghlService.lookupContactByEmail(contactData.email);

      if (existing) {
        ghlContactId = existing.id;
        await ghlService.updateContact(ghlContactId, contactData);
      } else {
        // Create new contact
        const newContact = await ghlService.createContact(contactData);
        ghlContactId = newContact.id;
        created = true;
      }
    } else {
      // No email - create with name only
      const newContact = await ghlService.createContact({
        ...contactData,
        email: `storyteller-${storyteller.id.slice(0, 8)}@empathy-ledger.local`
      });
      ghlContactId = newContact.id;
      created = true;
    }

    // Update sync record in EL database
    const syncRecord = {
      storyteller_id: storyteller.id,
      ghl_contact_id: ghlContactId,
      ghl_name: storyteller.display_name,
      ghl_email: contactData.email,
      ghl_tags: contactData.tags,
      sync_status: 'synced',
      last_sync_at: new Date().toISOString(),
      last_sync_direction: 'to_ghl'
    };

    // Try to get integration_id from environment or use a default
    const integrationId = process.env.GHL_INTEGRATION_ID;

    if (integrationId) {
      syncRecord.integration_id = integrationId;

      await elClient
        .from('ghl_contact_sync')
        .upsert(syncRecord, {
          onConflict: 'storyteller_id'
        });
    }

    return {
      status: created ? 'created' : 'updated',
      ghlContactId,
      storyteller: storyteller.display_name
    };
  } catch (error) {
    console.error(`  Error syncing ${storyteller.display_name}:`, error.message);
    return {
      status: 'error',
      error: error.message,
      storyteller: storyteller.display_name
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Empathy Ledger v2 → GHL Storyteller Sync');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();

  // Parse CLI args
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const limitArg = args.find(a => a.startsWith('--limit'));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1]) : null;

  if (dryRun) {
    console.log('  Mode: DRY RUN (no changes will be made)');
  }
  if (force) {
    console.log('  Mode: FORCE (ignoring sync threshold)');
  }
  if (limit) {
    console.log(`  Limit: ${limit} storytellers`);
  }
  console.log();

  // Initialize clients
  let elClient, ghlService;

  try {
    elClient = createELClient();
    console.log('  ✓ Connected to Empathy Ledger v2 Supabase');
  } catch (error) {
    console.error('  ✗ Failed to connect to EL v2:', error.message);
    console.log();
    console.log('  Set these environment variables:');
    console.log('    EL_SUPABASE_URL=https://your-el-project.supabase.co');
    console.log('    EL_SUPABASE_SERVICE_KEY=eyJhbGc...');
    process.exit(1);
  }

  try {
    ghlService = createGHLService();
    const health = await ghlService.healthCheck();
    if (!health.healthy) {
      throw new Error(health.error);
    }
    console.log('  ✓ Connected to GoHighLevel');
  } catch (error) {
    console.error('  ✗ Failed to connect to GHL:', error.message);
    console.log();
    console.log('  Set these environment variables:');
    console.log('    GHL_API_KEY=your-api-key');
    console.log('    GHL_LOCATION_ID=your-location-id');
    process.exit(1);
  }

  console.log();

  // Fetch storytellers
  console.log('Fetching storytellers from Empathy Ledger v2...');
  const storytellers = await getStorytellersWithCounts(elClient, { limit });
  console.log(`  Found ${storytellers.length} active storytellers`);

  if (storytellers.length === 0) {
    console.log('  No storytellers to sync');
    return;
  }

  // Get existing sync records
  const storytellerIds = storytellers.map(s => s.id);
  const existingSyncs = await getExistingSyncRecords(elClient, storytellerIds);
  console.log(`  ${existingSyncs.size} have existing GHL sync records`);
  console.log();

  // Sync each storyteller
  console.log('Syncing storytellers to GHL...');
  console.log();

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    dryRun: 0
  };

  for (const storyteller of storytellers) {
    const existingSync = existingSyncs.get(storyteller.id);
    const result = await syncStorytellerToGHL(
      storyteller,
      existingSync,
      ghlService,
      elClient,
      { dryRun, force }
    );

    switch (result.status) {
      case 'created':
        results.created++;
        console.log(`  ✓ Created: ${storyteller.display_name} (${storyteller.story_count} stories)`);
        break;
      case 'updated':
        results.updated++;
        console.log(`  ✓ Updated: ${storyteller.display_name} (${storyteller.story_count} stories)`);
        break;
      case 'skipped':
        results.skipped++;
        break;
      case 'dry_run':
        results.dryRun++;
        break;
      case 'error':
        results.errors++;
        break;
    }
  }

  // Summary
  console.log();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Total storytellers: ${storytellers.length}`);
  if (dryRun) {
    console.log(`  Would sync: ${results.dryRun}`);
  } else {
    console.log(`  Created: ${results.created}`);
    console.log(`  Updated: ${results.updated}`);
    console.log(`  Skipped: ${results.skipped}`);
    console.log(`  Errors: ${results.errors}`);
  }
  console.log();

  // Aggregate story stats
  const totalStories = storytellers.reduce((sum, s) => sum + s.story_count, 0);
  const publishedStories = storytellers.reduce((sum, s) => sum + s.published_stories, 0);
  const elders = storytellers.filter(s => s.is_elder).length;
  const featured = storytellers.filter(s => s.is_featured).length;

  console.log('  Storyteller Stats:');
  console.log(`    Total stories: ${totalStories} (${publishedStories} published)`);
  console.log(`    Elders: ${elders}`);
  console.log(`    Featured: ${featured}`);
  console.log();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
