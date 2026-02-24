#!/usr/bin/env node
/**
 * Sync World Tour Partners to GHL
 *
 * Extracts all partner organizations and storytellers from the Empathy Ledger
 * world tour location data and upserts them into GHL as contacts with
 * appropriate tags (world-tour, world-tour-partner, location-specific).
 *
 * Usage:
 *   node scripts/sync-world-tour-partners-to-ghl.mjs              # Dry run
 *   node scripts/sync-world-tour-partners-to-ghl.mjs --apply      # Create/update contacts
 */

import { createGHLService } from './lib/ghl-api-service.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// ============================================
// World Tour Partner Data (extracted from Empathy Ledger locations.ts)
// ============================================

const WORLD_TOUR_PARTNERS = [
  // South Africa
  { name: 'Truth and Reconciliation Archive', email: null, company: 'Truth and Reconciliation Archive', tourStop: 'south-africa', tier: 'network', focus: ['Justice', 'Oral History', 'Reconciliation'], website: null },

  // Uganda
  { name: 'Navjot Sawhney', email: 'hello@thewashingmachineproject.org', company: 'The Washing Machine Project', tourStop: 'uganda', tier: 'anchor', focus: ['Innovation', 'Essential Goods', 'Co-Design'], website: 'https://thewashingmachineproject.org' },
  { name: 'Ogole Oscar', email: 'contact@cdsuganda.org', company: 'Community Development Shield Uganda', tourStop: 'uganda', tier: 'partner', focus: ['Youth', 'Health', 'Agriculture'], website: 'https://cdsuganda.org' },
  { name: 'Frances Birungi', email: 'info@ucobac.org', company: 'UCOBAC', tourStop: 'uganda', tier: 'partner', focus: ["Women's Rights", 'Community', 'Social Enterprise'], website: 'https://ucobac.org' },
  { name: 'Isaac Opio', email: 'partnerships@ayado.org', company: 'African Youth Alliance Development Organization', tourStop: 'uganda', tier: 'partner', focus: ['Youth', 'Justice', 'Refugees'], website: 'https://ayado.org' },
  { name: null, email: null, company: 'World Voices Uganda', tourStop: 'uganda', tier: 'network', focus: ['Justice', 'Youth', 'Refugees'], website: null },
  { name: null, email: null, company: 'Design Hub Kampala', tourStop: 'uganda', tier: 'network', focus: ['Innovation', 'Co-Design'], website: null },

  // Kenya
  { name: 'Daniel Paffenholz', email: 'info@takatakasolutions.com', company: 'TakaTaka Solutions', tourStop: 'kenya', tier: 'anchor', focus: ['Social Enterprise', 'Community Co-ops', 'Innovation'], website: 'https://takatakasolutions.com' },
  { name: null, email: 'info@kkcfke.org', company: 'Kakuma Kalobeyei Challenge Fund', tourStop: 'kenya', tier: 'partner', focus: ['Refugees', 'Social Enterprise', 'Community Co-ops'], website: 'https://kkcfke.org' },
  { name: null, email: 'stp@uonbi.ac.ke', company: 'FabLab Nairobi', tourStop: 'kenya', tier: 'partner', focus: ['Innovation', 'Youth', 'Essential Goods'], website: 'https://fablabs.io/labs/fablabnairobi' },
  { name: null, email: null, company: 'FabLab Winam', tourStop: 'kenya', tier: 'partner', focus: ['Innovation', "Women's Rights", 'Youth'], website: 'https://fablabwinam.org' },
  { name: null, email: null, company: 'Bridging the Gap Africa', tourStop: 'kenya', tier: 'network', focus: ['Justice', 'Health', 'Community'], website: null },

  // Netherlands
  { name: 'Freek van Eijk', email: 'freek.vaneijk@hollandcircularhotspot.nl', company: 'Holland Circular Hotspot', tourStop: 'netherlands', tier: 'anchor', focus: ['Innovation', 'Social Enterprise', 'Community Co-ops'], website: 'https://hollandcircularhotspot.nl' },
  { name: null, email: null, company: 'Fairphone', tourStop: 'netherlands', tier: 'partner', focus: ['Innovation', 'Essential Goods', 'Social Enterprise'], website: 'https://fairphone.com' },
  { name: null, email: null, company: 'Mud Jeans', tourStop: 'netherlands', tier: 'partner', focus: ['Social Enterprise', 'Innovation'], website: null },
  { name: null, email: null, company: 'Fashion for Good', tourStop: 'netherlands', tier: 'network', focus: ['Innovation', 'Social Enterprise'], website: null },
  { name: null, email: null, company: 'Brightlands Chemelot Campus', tourStop: 'netherlands', tier: 'network', focus: ['Innovation', 'Social Enterprise'], website: null },

  // Sweden
  { name: null, email: null, company: 'Coompanion Sweden', tourStop: 'sweden', tier: 'anchor', focus: ['Community Co-ops', 'Social Enterprise', 'Innovation'], website: 'https://coompanion.se' },
  { name: 'Mats Målqvist', email: 'mats.malqvist@uu.se', company: 'SIHI Sweden (Uppsala University)', tourStop: 'sweden', tier: 'partner', focus: ['Health', 'Innovation', 'Community'], website: null },
  { name: null, email: null, company: 'Forum for Social Innovation Sweden', tourStop: 'sweden', tier: 'partner', focus: ['Innovation', 'Community'], website: 'https://socialinnovation.se/eng/' },
  { name: null, email: null, company: 'Yalla Trappan', tourStop: 'sweden', tier: 'network', focus: ["Women's Rights", 'Community Co-ops', 'Social Enterprise'], website: null },
];

// Tour stop display names
const TOUR_STOP_NAMES = {
  'south-africa': 'South Africa',
  'botswana': 'Botswana',
  'uganda': 'Uganda',
  'kenya': 'Kenya',
  'spain': 'Spain',
  'netherlands': 'Netherlands',
  'sweden': 'Sweden',
  'scotland': 'Scotland',
  'alice-springs': 'Alice Springs',
  'darwin': 'Darwin',
  'sydney': 'Sydney',
};

// ============================================
// Main
// ============================================

async function main() {
  log('=== World Tour Partners → GHL Sync ===');
  if (!APPLY) log('DRY RUN — pass --apply to create contacts');

  let ghl;
  try {
    ghl = createGHLService();
    const health = await ghl.healthCheck();
    if (!health.healthy) {
      log(`GHL connection failed: ${health.error}`);
      return;
    }
    log('GHL connection: OK');
  } catch (err) {
    log(`GHL not configured: ${err.message}`);
    return;
  }

  log(`\nPartners to sync: ${WORLD_TOUR_PARTNERS.length}`);
  console.log('');

  const stats = { created: 0, updated: 0, skipped: 0, errors: 0 };

  for (const partner of WORLD_TOUR_PARTNERS) {
    const displayName = partner.name || partner.company;
    const stopName = TOUR_STOP_NAMES[partner.tourStop] || partner.tourStop;

    // Build tags
    const tags = [
      'world-tour',
      'world-tour-partner',
      partner.tourStop,
      `tier:${partner.tier}`,
      ...partner.focus.map(f => f.toLowerCase().replace(/['\s]+/g, '-')),
    ];

    log(`${partner.tier.toUpperCase().padEnd(8)} ${displayName.padEnd(40)} ${stopName.padEnd(15)} ${partner.email || '(no email)'}`);

    if (!APPLY) {
      stats.skipped++;
      continue;
    }

    // If we have an email, upsert by email
    if (partner.email) {
      try {
        const existing = await ghl.lookupContactByEmail(partner.email);

        if (existing) {
          // Update existing contact — add tags
          const existingTags = existing.tags || [];
          const newTags = tags.filter(t => !existingTags.includes(t));

          if (newTags.length > 0) {
            await ghl.updateContact(existing.id, {
              tags: [...existingTags, ...newTags],
              companyName: partner.company,
              ...(partner.website && { website: partner.website }),
            });
            log(`  → Updated (added ${newTags.length} tags)`);
            stats.updated++;
          } else {
            log(`  → Already up to date`);
            stats.skipped++;
          }
        } else {
          // Create new contact
          const [firstName, ...lastParts] = (partner.name || partner.company).split(' ');
          const lastName = lastParts.join(' ') || null;

          await ghl.createContact({
            email: partner.email,
            firstName: firstName,
            lastName: lastName,
            companyName: partner.company,
            tags,
            ...(partner.website && { website: partner.website }),
          });
          log(`  → Created`);
          stats.created++;
        }
      } catch (err) {
        log(`  → ERROR: ${err.message}`);
        stats.errors++;
      }
    } else {
      // No email — create by company name (use company as email placeholder)
      try {
        const placeholderEmail = `info@${partner.company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}.placeholder`;

        const existing = await ghl.lookupContactByEmail(placeholderEmail);
        if (existing) {
          log(`  → Already exists (placeholder email)`);
          stats.skipped++;
          continue;
        }

        await ghl.createContact({
          email: placeholderEmail,
          firstName: partner.company,
          companyName: partner.company,
          tags,
          ...(partner.website && { website: partner.website }),
        });
        log(`  → Created (placeholder email — needs real contact)`);
        stats.created++;
      } catch (err) {
        log(`  → ERROR: ${err.message}`);
        stats.errors++;
      }
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('');
  log(`Results: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`);

  if (!APPLY) {
    log('\n💡 Run with --apply to create/update contacts in GHL');
  } else {
    log('\nDone! Check GHL → Contacts → filter by "world-tour-partner" tag');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
