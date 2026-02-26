#!/usr/bin/env node
/**
 * Create World Tour Partner Opportunities in GHL
 *
 * Creates an opportunity in the "Empathy Ledger Org Partnership" pipeline
 * for each world tour partner, so they appear on the kanban board for
 * tracking outreach status.
 *
 * Links each opportunity to the partner's GHL contact (looked up via
 * Supabase ghl_contacts for reliability).
 *
 * Usage:
 *   node scripts/create-partner-opportunities.mjs              # Dry run
 *   node scripts/create-partner-opportunities.mjs --apply      # Create opportunities
 */

import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');

// GHL v2 requires contactId on all opportunities — fallback to Ben Knight's contact
const FALLBACK_CONTACT_ID = 'D7bV2Nax6h7lJXsnEFhC';

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

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

// World Tour Partners (same data as sync-world-tour-partners-to-ghl.mjs)
const WORLD_TOUR_PARTNERS = [
  // South Africa
  { name: 'Truth and Reconciliation Archive', email: null, company: 'Truth and Reconciliation Archive', tourStop: 'south-africa', tier: 'network' },

  // Uganda
  { name: 'Navjot Sawhney', email: 'hello@thewashingmachineproject.org', company: 'The Washing Machine Project', tourStop: 'uganda', tier: 'anchor' },
  { name: 'Ogole Oscar', email: 'contact@cdsuganda.org', company: 'Community Development Shield Uganda', tourStop: 'uganda', tier: 'partner' },
  { name: 'Frances Birungi', email: 'info@ucobac.org', company: 'UCOBAC', tourStop: 'uganda', tier: 'partner' },
  { name: 'Isaac Opio', email: 'partnerships@ayado.org', company: 'African Youth Alliance Development Organization', tourStop: 'uganda', tier: 'partner' },
  { name: null, email: null, company: 'World Voices Uganda', tourStop: 'uganda', tier: 'network' },
  { name: null, email: null, company: 'Design Hub Kampala', tourStop: 'uganda', tier: 'network' },

  // Kenya
  { name: 'Daniel Paffenholz', email: 'info@takatakasolutions.com', company: 'TakaTaka Solutions', tourStop: 'kenya', tier: 'anchor' },
  { name: null, email: 'info@kkcfke.org', company: 'Kakuma Kalobeyei Challenge Fund', tourStop: 'kenya', tier: 'partner' },
  { name: null, email: 'stp@uonbi.ac.ke', company: 'FabLab Nairobi', tourStop: 'kenya', tier: 'partner' },
  { name: null, email: null, company: 'FabLab Winam', tourStop: 'kenya', tier: 'partner' },
  { name: null, email: null, company: 'Bridging the Gap Africa', tourStop: 'kenya', tier: 'network' },

  // Netherlands
  { name: 'Freek van Eijk', email: 'freek.vaneijk@hollandcircularhotspot.nl', company: 'Holland Circular Hotspot', tourStop: 'netherlands', tier: 'anchor' },
  { name: null, email: null, company: 'Fairphone', tourStop: 'netherlands', tier: 'partner' },
  { name: null, email: null, company: 'Mud Jeans', tourStop: 'netherlands', tier: 'partner' },
  { name: null, email: null, company: 'Fashion for Good', tourStop: 'netherlands', tier: 'network' },
  { name: null, email: null, company: 'Brightlands Chemelot Campus', tourStop: 'netherlands', tier: 'network' },

  // Sweden
  { name: null, email: null, company: 'Coompanion Sweden', tourStop: 'sweden', tier: 'anchor' },
  { name: 'Mats Målqvist', email: 'mats.malqvist@uu.se', company: 'SIHI Sweden (Uppsala University)', tourStop: 'sweden', tier: 'partner' },
  { name: null, email: null, company: 'Forum for Social Innovation Sweden', tourStop: 'sweden', tier: 'partner' },
  { name: null, email: null, company: 'Yalla Trappan', tourStop: 'sweden', tier: 'network' },
];

// ============================================
// Main
// ============================================

async function main() {
  log('=== Create World Tour Partner Opportunities ===');
  if (!APPLY) log('DRY RUN — pass --apply to create opportunities');

  // Connect to GHL
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

  // Find the Org Partnership pipeline
  // Clean up old opportunities from ACT pipeline if they exist
  const actPipeline = await ghl.getPipelineByName('A Curious Tractor');
  if (actPipeline) {
    const actOpps = await ghl.getOpportunities(actPipeline.id);
    const worldTourOpps = actOpps.filter(o => o.name?.includes('(World Tour)'));
    if (worldTourOpps.length > 0) {
      log(`Found ${worldTourOpps.length} World Tour opportunities in ACT pipeline — cleaning up...`);
      if (APPLY) {
        for (const opp of worldTourOpps) {
          try {
            await ghl.deleteOpportunity(opp.id);
            log(`  Deleted: ${opp.name}`);
          } catch (err) {
            log(`  Error deleting ${opp.name}: ${err.message}`);
          }
          await new Promise(r => setTimeout(r, 200));
        }
      } else {
        log(`  (would delete ${worldTourOpps.length} in --apply mode)`);
      }
    }
  }

  const pipeline = await ghl.getPipelineByName('Empathy Ledger');
  if (!pipeline) {
    log('ERROR: "Empathy Ledger" pipeline not found.');
    log('Available pipelines:');
    const pipelines = await ghl.getPipelines();
    for (const p of pipelines) {
      log(`  - ${p.name}`);
    }
    return;
  }

  log(`Pipeline: ${pipeline.name} (${pipeline.id})`);
  log(`Stages: ${pipeline.stages.map(s => s.name).join(' → ')}`);

  // Use the first stage (typically "New/Identified" or similar)
  const firstStage = pipeline.stages[0];
  log(`Target stage: ${firstStage.name} (${firstStage.id})`);

  // Check existing opportunities to avoid duplicates
  const existing = await ghl.getOpportunities(pipeline.id);
  const existingNames = new Set(existing.map(o => o.name?.toLowerCase()));
  log(`Existing opportunities in pipeline: ${existing.length}`);

  // Load all GHL contacts from Supabase for reliable lookup
  const { data: ghlContacts, error: sbError } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, company_name')
    .limit(1000);

  if (sbError) {
    log(`Warning: Could not load contacts from Supabase: ${sbError.message}`);
  }
  log(`Loaded ${ghlContacts?.length || 0} contacts from Supabase for matching`);

  console.log('');

  const stats = { created: 0, skipped: 0, errors: 0 };

  for (const partner of WORLD_TOUR_PARTNERS) {
    const displayName = partner.name || partner.company;
    const stopName = TOUR_STOP_NAMES[partner.tourStop] || partner.tourStop;
    const oppName = `${displayName} — ${stopName} (World Tour)`;

    // Check for duplicates
    if (existingNames.has(oppName.toLowerCase())) {
      log(`SKIP  ${oppName} (already exists)`);
      stats.skipped++;
      continue;
    }

    // Find contact ID via Supabase
    let contactId = null;
    if (ghlContacts) {
      // Match by email first, then by company name
      const match = partner.email
        ? ghlContacts.find(c => c.email?.toLowerCase() === partner.email.toLowerCase())
        : ghlContacts.find(c =>
            c.company_name?.toLowerCase() === partner.company.toLowerCase() ||
            c.full_name?.toLowerCase() === partner.company.toLowerCase()
          );

      if (match) {
        contactId = match.ghl_id;
      }
    }

    const tierIcon = partner.tier === 'anchor' ? '⚓' : partner.tier === 'partner' ? '🤝' : '🔗';
    log(`${tierIcon} ${oppName}`);
    log(`   Contact: ${contactId ? `matched (${contactId.slice(0, 8)}...)` : 'using fallback'}`);

    if (!APPLY) {
      stats.skipped++;
      continue;
    }

    try {
      await ghl.createOpportunity({
        pipelineId: pipeline.id,
        stageId: firstStage.id,
        name: oppName,
        status: 'open',
        contactId: contactId || FALLBACK_CONTACT_ID,
      });
      log(`   → Created`);
      stats.created++;
    } catch (err) {
      log(`   → ERROR: ${err.message}`);
      stats.errors++;
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 250));
  }

  console.log('');
  log(`Results: ${stats.created} created, ${stats.skipped} skipped, ${stats.errors} errors`);

  if (!APPLY) {
    log('\n💡 Run with --apply to create opportunities in GHL');
  } else {
    log(`\nDone! Check GHL → Opportunities → "${pipeline.name}" pipeline`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
