#!/usr/bin/env node
/**
 * Goods Auto-Tagger
 *
 * Finds contacts who appear in Goods-related communications
 * but don't have the 'goods' tag yet. Adds goods + goods-supporter tags.
 * Does NOT auto-enroll in newsletter (consent required).
 *
 * USAGE:
 *   node scripts/goods-auto-tagger.mjs [options]
 *
 * OPTIONS:
 *   --dry-run     Preview changes without writing
 *   --days N      Look back N days for communications (default: 30)
 *   --verbose     Show detailed output
 */

import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Goods Auto-Tagger');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  const daysIdx = args.indexOf('--days');
  const days = daysIdx >= 0 ? parseInt(args[daysIdx + 1]) : 30;

  if (dryRun) console.log('  Mode: DRY RUN');
  console.log(`  Lookback: ${days} days`);
  console.log();

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let ghlService;
  try {
    ghlService = createGHLService();
  } catch (err) {
    console.error('  GHL not configured — tag sync to GHL will be skipped');
    ghlService = null;
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Find contacts linked to GOODS communications who lack the goods tag
  const { data: comms, error: commsError } = await supabase
    .from('communications_history')
    .select('contact_id, ghl_contact_id')
    .contains('project_codes', ['GOODS'])
    .gte('event_date', since.toISOString())
    .not('contact_id', 'is', null);

  if (commsError) {
    console.error('  Failed to query communications:', commsError.message);
    process.exit(1);
  }

  // Unique contact IDs
  const contactIds = [...new Set((comms || []).map(c => c.contact_id).filter(Boolean))];
  console.log(`  Found ${contactIds.length} contacts with GOODS communications`);

  if (contactIds.length === 0) {
    console.log('  No contacts to process.');
    return;
  }

  // Fetch these contacts and check which lack the goods tag
  const { data: contacts, error: contactsError } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id, full_name, first_name, last_name, email, tags, projects')
    .in('id', contactIds);

  if (contactsError) {
    console.error('  Failed to fetch contacts:', contactsError.message);
    process.exit(1);
  }

  const needsTagging = (contacts || []).filter(c => {
    const tags = (c.tags || []).map(t => t.toLowerCase());
    return !tags.includes('goods');
  });

  console.log(`  ${needsTagging.length} contacts need goods tag`);
  console.log();

  let tagged = 0;
  let errors = 0;

  for (const contact of needsTagging) {
    const name = contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email || 'Unknown';
    const currentTags = contact.tags || [];
    const currentProjects = contact.projects || [];

    const newTags = [...new Set([...currentTags, 'goods', 'goods-supporter'])];
    const newProjects = [...new Set([...currentProjects, 'goods'])];

    if (verbose || dryRun) {
      console.log(`  ${dryRun ? '[DRY RUN] ' : ''}${name}: +goods, +goods-supporter`);
    }

    if (dryRun) {
      tagged++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('ghl_contacts')
      .update({ tags: newTags, projects: newProjects })
      .eq('id', contact.id);

    if (updateError) {
      console.error(`  ERROR updating ${name}: ${updateError.message}`);
      errors++;
      continue;
    }

    // Sync to GHL
    if (ghlService && contact.ghl_id) {
      try {
        await ghlService.addTagToContact(contact.ghl_id, 'goods');
        await ghlService.addTagToContact(contact.ghl_id, 'goods-supporter');
      } catch (ghlErr) {
        console.error(`  GHL tag sync failed for ${name}: ${ghlErr.message}`);
      }
    }

    tagged++;
  }

  console.log();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Tagged: ${tagged}`);
  console.log(`  Errors: ${errors}`);
  console.log();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
