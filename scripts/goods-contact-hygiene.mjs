#!/usr/bin/env node
/**
 * Goods Contact Hygiene
 *
 * Normalizes and segments all Goods-tagged contacts:
 * 1. Adds 'goods' to projects[] for contacts with goods tag
 * 2. Segments contacts by inferring role from existing tags
 * 3. Sets newsletter_consent = TRUE for contacts with email
 * 4. Adds 'goods-newsletter' tag
 * 5. Updates engagement_status based on last communication
 * 6. Syncs tag changes to GHL
 *
 * USAGE:
 *   node scripts/goods-contact-hygiene.mjs [options]
 *
 * OPTIONS:
 *   --dry-run     Preview changes without writing
 *   --verbose     Show detailed output per contact
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

const GOODS_TAG = 'goods';

// Role inference: first match wins
const ROLE_RULES = [
  { matchTag: 'Storyteller', addTag: 'goods-storyteller' },
  { matchTag: 'funder', addTag: 'goods-funder' },
  { matchTag: 'partner', addTag: 'goods-partner' },
  { matchTag: 'community', addTag: 'goods-community' },
];
const DEFAULT_ROLE_TAG = 'goods-supporter';

// Engagement tiers based on days since last contact
const ENGAGEMENT_TIERS = [
  { maxDays: 14, status: 'active' },
  { maxDays: 30, status: 'warm' },
  { maxDays: 60, status: 'cooling' },
  { maxDays: 90, status: 'dormant' },
];
const DORMANT_STATUS = 'dormant';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function inferRoleTag(tags) {
  const lowerTags = (tags || []).map(t => t.toLowerCase());
  for (const rule of ROLE_RULES) {
    if (lowerTags.includes(rule.matchTag.toLowerCase())) {
      return rule.addTag;
    }
  }
  return DEFAULT_ROLE_TAG;
}

function inferEngagementStatus(lastContactDate) {
  const days = daysSince(lastContactDate);
  if (days === null) return DORMANT_STATUS;
  for (const tier of ENGAGEMENT_TIERS) {
    if (days <= tier.maxDays) return tier.status;
  }
  return DORMANT_STATUS;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Goods Contact Hygiene');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');

  if (dryRun) console.log('  Mode: DRY RUN (no changes will be made)');
  console.log();

  // Initialize clients
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let ghlService;
  try {
    ghlService = createGHLService();
  } catch (err) {
    console.error('  GHL not configured — tag sync to GHL will be skipped');
    console.error(`  (${err.message})`);
    ghlService = null;
  }

  // Fetch all Goods contacts from Supabase
  const { data: contacts, error } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id, full_name, first_name, last_name, email, tags, projects, engagement_status, last_contact_date')
    .contains('tags', [GOODS_TAG]);

  if (error) {
    console.error('  Failed to fetch contacts:', error.message);
    process.exit(1);
  }

  console.log(`  Found ${contacts.length} contacts with '${GOODS_TAG}' tag`);
  const withEmail = contacts.filter(c => c.email);
  console.log(`  ${withEmail.length} have email addresses`);
  console.log();

  // Process each contact
  const results = {
    updated: 0,
    skipped: 0,
    errors: 0,
    tagsAdded: 0,
    newsletterEnrolled: 0,
  };

  for (const contact of contacts) {
    const name = contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email || 'Unknown';
    const currentTags = contact.tags || [];
    const currentProjects = contact.projects || [];

    // 1. Determine new tags to add
    const newTags = new Set(currentTags);
    const tagsToAddToGHL = [];

    // Add role tag
    const roleTag = inferRoleTag(currentTags);
    if (!newTags.has(roleTag)) {
      newTags.add(roleTag);
      tagsToAddToGHL.push(roleTag);
    }

    // Add goods-newsletter tag if they have an email
    if (contact.email && !newTags.has('goods-newsletter')) {
      newTags.add('goods-newsletter');
      tagsToAddToGHL.push('goods-newsletter');
    }

    // 2. Ensure 'goods' is in projects array
    const newProjects = [...new Set([...currentProjects, 'goods'])];

    // 3. Newsletter consent for contacts with email
    const shouldConsent = !!contact.email;

    // 4. Engagement status
    const newEngagement = inferEngagementStatus(contact.last_contact_date);

    // Build update payload
    const update = {
      tags: [...newTags],
      projects: newProjects,
      engagement_status: newEngagement,
    };

    if (shouldConsent) {
      update.newsletter_consent = true;
      update.newsletter_consent_at = new Date().toISOString();
    }

    // Check if anything changed
    const tagsChanged = JSON.stringify([...newTags].sort()) !== JSON.stringify([...currentTags].sort());
    const projectsChanged = JSON.stringify(newProjects.sort()) !== JSON.stringify(currentProjects.sort());
    const engagementChanged = newEngagement !== contact.engagement_status;
    const consentChanged = shouldConsent; // Always set for contacts with email

    if (!tagsChanged && !projectsChanged && !engagementChanged && !consentChanged) {
      if (verbose) console.log(`  - ${name}: no changes needed`);
      results.skipped++;
      continue;
    }

    if (verbose || dryRun) {
      console.log(`  ${dryRun ? '[DRY RUN] ' : ''}${name}:`);
      if (tagsChanged) console.log(`    Tags: +${tagsToAddToGHL.join(', +') || '(none)'}`);
      if (projectsChanged) console.log(`    Projects: ${newProjects.join(', ')}`);
      if (engagementChanged) console.log(`    Engagement: ${contact.engagement_status} → ${newEngagement}`);
      if (shouldConsent) console.log(`    Newsletter: enrolled`);
    }

    if (dryRun) {
      results.updated++;
      if (shouldConsent) results.newsletterEnrolled++;
      results.tagsAdded += tagsToAddToGHL.length;
      continue;
    }

    // Apply Supabase update
    const { error: updateError } = await supabase
      .from('ghl_contacts')
      .update(update)
      .eq('id', contact.id);

    if (updateError) {
      console.error(`  ERROR updating ${name}: ${updateError.message}`);
      results.errors++;
      continue;
    }

    // Sync new tags to GHL
    if (ghlService && contact.ghl_id && tagsToAddToGHL.length > 0) {
      try {
        for (const tag of tagsToAddToGHL) {
          await ghlService.addTagToContact(contact.ghl_id, tag);
        }
      } catch (ghlErr) {
        console.error(`  GHL tag sync failed for ${name}: ${ghlErr.message}`);
        // Non-fatal: Supabase is updated, GHL tags can be retried
      }
    }

    results.updated++;
    if (shouldConsent) results.newsletterEnrolled++;
    results.tagsAdded += tagsToAddToGHL.length;
  }

  // Summary
  console.log();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Total contacts: ${contacts.length}`);
  console.log(`  Updated: ${results.updated}`);
  console.log(`  Skipped: ${results.skipped}`);
  console.log(`  Errors: ${results.errors}`);
  console.log(`  Tags added: ${results.tagsAdded}`);
  console.log(`  Newsletter enrolled: ${results.newsletterEnrolled}`);
  console.log();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
