#!/usr/bin/env node
/**
 * Two-Way Grant Sync: grant_opportunities <-> GHL Grants Pipeline
 *
 * Runs after ghl-sync to keep both systems in sync:
 * 1. GHL → grant_opportunities: Creates missing entries from GHL Grants pipeline
 * 2. grant_opportunities → GHL: Pushes discovered grants into GHL pipeline
 * 3. Status sync both ways
 * 4. Links grant_applications to GHL opportunities
 *
 * Usage:
 *   node scripts/sync-grants-ghl.mjs              # Full sync
 *   node scripts/sync-grants-ghl.mjs --dry-run    # Preview only
 *
 * Cron: Runs every 6 hours (after ghl-sync)
 */

import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const dryRun = process.argv.includes('--dry-run');

// GHL Grants Pipeline config
const GRANTS_PIPELINE_ID = 'scom3L0kNwA1W0zPIzMe';
const DEFAULT_CONTACT_ID = 'AXrbvQAQKR0TcTcZL71H'; // Benjamin Knight — default owner for grant opportunities
const GHL_STAGES = {
  'Grant Opportunity Identified': '8124c61a-1175-461e-be5d-1fa64ef6dd65',
  'Application In Progress':      '3eb617e6-5635-4091-bd04-acc72d2ae5b0',
  'Grant Submitted':              '8b0818ce-3fe8-4aae-97ab-905366fdd5ee',
};

// Status mapping: grant_opportunities.application_status <-> GHL stage
const STATUS_TO_GHL_STAGE = {
  'not_applied':   'Grant Opportunity Identified',
  'in_progress':   'Application In Progress',
  'applied':       'Grant Submitted',
  'submitted':     'Grant Submitted',
};

const GHL_STAGE_TO_STATUS = {
  'Grant Opportunity Identified': 'not_applied',
  'Application In Progress':      'in_progress',
  'Grant Submitted':              'submitted',
};

// Name similarity matching (reused from link-grants-to-ghl.mjs)
function similarity(a, b) {
  if (!a || !b) return 0;
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return 1;
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.85;

  // Word overlap (Jaccard)
  const aWords = new Set(aLower.split(/\s+/).filter(w => w.length > 2));
  const bWords = new Set(bLower.split(/\s+/).filter(w => w.length > 2));
  const intersection = [...aWords].filter(w => bWords.has(w));
  const union = new Set([...aWords, ...bWords]);
  return union.size > 0 ? intersection.length / union.size : 0;
}

const stats = {
  ghlToGrants: { created: 0, updated: 0, linked: 0, skipped: 0 },
  grantsToGhl: { created: 0, updated: 0, skipped: 0 },
  applicationsLinked: 0,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 1: GHL → grant_opportunities
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function syncGHLToGrants() {
  console.log('\n📥 Step 1: GHL → grant_opportunities');
  console.log('─'.repeat(50));

  // Get all GHL Grants pipeline opportunities from local mirror
  const { data: ghlGrants, error: ghlErr } = await supabase
    .from('ghl_opportunities')
    .select('*')
    .eq('pipeline_name', 'Grants');

  if (ghlErr) {
    console.error('Error fetching GHL grants:', ghlErr.message);
    return;
  }

  // Get all grant_opportunities (with ghl link)
  const { data: existingGrants, error: goErr } = await supabase
    .from('grant_opportunities')
    .select('id, name, ghl_opportunity_id, application_status');

  if (goErr) {
    console.error('Error fetching grant_opportunities:', goErr.message);
    return;
  }

  console.log(`  GHL Grants pipeline: ${ghlGrants.length} items`);
  console.log(`  grant_opportunities: ${existingGrants.length} items`);

  // Index existing grants by ghl_opportunity_id for fast lookup
  const linkedByGhlId = new Map();
  for (const g of existingGrants) {
    if (g.ghl_opportunity_id) linkedByGhlId.set(g.ghl_opportunity_id, g);
  }

  for (const ghl of ghlGrants) {
    // Already linked?
    if (linkedByGhlId.has(ghl.id)) {
      // Sync status from GHL → grant_opportunities
      const existing = linkedByGhlId.get(ghl.id);
      const expectedStatus = GHL_STAGE_TO_STATUS[ghl.stage_name];
      if (expectedStatus && existing.application_status !== expectedStatus) {
        console.log(`  ↕ Status sync: "${ghl.name}" ${existing.application_status} → ${expectedStatus}`);
        if (!dryRun) {
          await supabase
            .from('grant_opportunities')
            .update({ application_status: expectedStatus, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        }
        stats.ghlToGrants.updated++;
      } else {
        stats.ghlToGrants.skipped++;
      }
      continue;
    }

    // Try name matching to find unlinked grant
    let bestMatch = null;
    let bestScore = 0;
    for (const g of existingGrants) {
      if (g.ghl_opportunity_id) continue; // already linked
      const score = similarity(ghl.name, g.name);
      if (score > bestScore && score > 0.5) {
        bestScore = score;
        bestMatch = g;
      }
    }

    if (bestMatch) {
      // Link existing grant to GHL
      console.log(`  🔗 Link: "${ghl.name}" → "${bestMatch.name}" (${(bestScore * 100).toFixed(0)}%)`);
      if (!dryRun) {
        await supabase
          .from('grant_opportunities')
          .update({
            ghl_opportunity_id: ghl.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bestMatch.id);
      }
      stats.ghlToGrants.linked++;
    } else {
      // Create new grant_opportunity from GHL
      const newGrant = {
        name: ghl.name,
        application_status: GHL_STAGE_TO_STATUS[ghl.stage_name] || 'not_applied',
        amount_min: ghl.monetary_value ? Math.round(parseFloat(ghl.monetary_value)) : null,
        amount_max: ghl.monetary_value ? Math.round(parseFloat(ghl.monetary_value)) : null,
        aligned_projects: ghl.project_code ? [ghl.project_code] : [],
        ghl_opportunity_id: ghl.id,
        source: 'ghl_sync',
        discovered_by: 'ghl_sync',
      };

      console.log(`  ➕ Create: "${ghl.name}" ($${ghl.monetary_value || 0}) [${ghl.stage_name}]`);
      if (!dryRun) {
        await supabase.from('grant_opportunities').insert(newGrant);
      }
      stats.ghlToGrants.created++;
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 2: grant_opportunities → GHL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function syncGrantsToGHL() {
  console.log('\n📤 Step 2: grant_opportunities → GHL');
  console.log('─'.repeat(50));

  let ghl = null;
  try {
    ghl = createGHLService();
  } catch {
    console.log('  ⚠ GHL API not configured — skipping push to GHL');
    return;
  }

  // Get grants without GHL link that have decent fit scores
  const { data: unlinkedGrants, error } = await supabase
    .from('grant_opportunities')
    .select('*')
    .is('ghl_opportunity_id', null)
    .gte('fit_score', 50) // Only push grants with >50% fit
    .order('fit_score', { ascending: false });

  if (error) {
    console.error('Error fetching unlinked grants:', error.message);
    return;
  }

  console.log(`  Unlinked grants (fit >= 50%): ${unlinkedGrants?.length || 0}`);

  if (!unlinkedGrants?.length) return;

  for (const grant of unlinkedGrants) {
    const stageName = STATUS_TO_GHL_STAGE[grant.application_status] || 'Grant Opportunity Identified';
    const stageId = GHL_STAGES[stageName];

    if (!stageId) {
      console.log(`  ⚠ No stage mapping for "${grant.application_status}" — skipping ${grant.name}`);
      stats.grantsToGhl.skipped++;
      continue;
    }

    const amount = grant.amount_max || grant.amount_min || 0;

    console.log(`  ➕ Push to GHL: "${grant.name}" ($${amount}) → ${stageName}`);

    if (!dryRun) {
      try {
        const created = await ghl.createOpportunity({
          pipelineId: GRANTS_PIPELINE_ID,
          stageId,
          name: grant.name,
          monetaryValue: amount,
          contactId: DEFAULT_CONTACT_ID,
        });

        // Store the GHL ID back
        if (created?.id) {
          await supabase
            .from('grant_opportunities')
            .update({ ghl_opportunity_id: created.id, updated_at: new Date().toISOString() })
            .eq('id', grant.id);
        }
        stats.grantsToGhl.created++;
      } catch (err) {
        console.error(`  ✗ Error creating GHL opportunity: ${err.message}`);
        stats.grantsToGhl.skipped++;
      }
    } else {
      stats.grantsToGhl.created++;
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 3: Link grant_applications ↔ GHL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function linkApplications() {
  console.log('\n🔗 Step 3: Link grant_applications to GHL');
  console.log('─'.repeat(50));

  const { data: unlinked, error } = await supabase
    .from('grant_applications')
    .select('id, application_name, amount_requested, project_code')
    .is('ghl_opportunity_id', null);

  if (error || !unlinked?.length) {
    console.log(`  No unlinked applications (${unlinked?.length || 0})`);
    return;
  }

  const { data: ghlOpps } = await supabase
    .from('ghl_opportunities')
    .select('id, name, monetary_value');

  if (!ghlOpps?.length) return;

  for (const app of unlinked) {
    let bestMatch = null;
    let bestScore = 0;

    for (const opp of ghlOpps) {
      const nameScore = similarity(app.application_name, opp.name);
      let amountBonus = 0;
      if (app.amount_requested && opp.monetary_value) {
        const ratio = Math.min(parseFloat(app.amount_requested), parseFloat(opp.monetary_value)) /
                      Math.max(parseFloat(app.amount_requested), parseFloat(opp.monetary_value));
        if (ratio > 0.8) amountBonus = 0.15;
      }
      const total = nameScore + amountBonus;
      if (total > bestScore && total > 0.5) {
        bestScore = total;
        bestMatch = opp;
      }
    }

    if (bestMatch) {
      console.log(`  🔗 ${app.application_name.substring(0, 40)} → ${bestMatch.name.substring(0, 40)} (${(bestScore * 100).toFixed(0)}%)`);
      if (!dryRun) {
        await supabase
          .from('grant_applications')
          .update({ ghl_opportunity_id: bestMatch.id, updated_at: new Date().toISOString() })
          .eq('id', app.id);
      }
      stats.applicationsLinked++;
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  console.log(`\n🔄 Grant Two-Way Sync ${dryRun ? '(DRY RUN)' : ''}`);
  console.log('═'.repeat(50));

  await syncGHLToGrants();
  await syncGrantsToGHL();
  await linkApplications();

  console.log('\n📊 Summary');
  console.log('─'.repeat(50));
  console.log(`  GHL → Grants:  ${stats.ghlToGrants.created} created, ${stats.ghlToGrants.linked} linked, ${stats.ghlToGrants.updated} status synced, ${stats.ghlToGrants.skipped} unchanged`);
  console.log(`  Grants → GHL:  ${stats.grantsToGhl.created} pushed, ${stats.grantsToGhl.skipped} skipped`);
  console.log(`  Applications:  ${stats.applicationsLinked} newly linked`);
  console.log(dryRun ? '\n💡 Run without --dry-run to apply changes' : '\n✅ Sync complete');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
