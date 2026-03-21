#!/usr/bin/env node

/**
 * Sync GrantScope Matches → ACT Pipeline
 *
 * Pulls matched grants from GrantScope's saved_grants table and inserts them
 * into ACT's opportunities_unified table. Runs daily at 5am AEST, before the
 * priority engine at 6:30am.
 *
 * Flow:
 *   1. Connect to GrantScope Supabase (separate instance)
 *   2. Query saved_grants for ACT org profiles (not dismissed)
 *   3. Join with grant_opportunities for grant details
 *   4. Dedup against existing opportunities_unified rows
 *   5. Insert new matches as 'identified' stage opportunities
 *
 * Usage:
 *   node scripts/sync-grantscope-matches.mjs
 *   node scripts/sync-grantscope-matches.mjs --dry-run
 *   node scripts/sync-grantscope-matches.mjs --verbose
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const VERBOSE = process.argv.includes('--verbose');
const DRY_RUN = process.argv.includes('--dry-run');

function log(...args) {
  if (VERBOSE || DRY_RUN) console.log(...args);
}

// ACT Supabase
const actSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GrantScope Supabase (separate instance)
const gsUrl = process.env.GRANTSCOPE_SUPABASE_URL;
const gsKey = process.env.GRANTSCOPE_SUPABASE_KEY;

if (!gsUrl || !gsKey) {
  console.error('Missing GRANTSCOPE_SUPABASE_URL or GRANTSCOPE_SUPABASE_KEY in .env.local');
  console.error('Add these from the GrantScope project .env file.');
  process.exit(1);
}

const gsSupabase = createClient(gsUrl, gsKey);

// Single profile covers all ACT projects — map profile name to default project code
// (individual grant → project matching happens via grant domains/keywords)
const PROFILE_TO_PROJECT = {
  'A Curious Tractor': null, // Multi-project profile — project_codes assigned from grant matching
};

async function main() {
  console.log('🔗 Syncing GrantScope Matches → ACT Pipeline\n');

  // 1. Get ACT org profiles from GrantScope
  const { data: profiles, error: profErr } = await gsSupabase
    .from('org_profiles')
    .select('id, user_id, name, domains')
    .ilike('name', '%Curious Tractor%');

  if (profErr) {
    console.error('Error fetching profiles:', profErr.message);
    process.exit(1);
  }

  if (!profiles?.length) {
    console.log('No ACT profiles found in GrantScope. Run create-grantscope-profiles.mjs first.');
    return;
  }

  console.log(`Found ${profiles.length} ACT profiles in GrantScope`);

  const profileUserIds = [...new Set(profiles.map(p => p.user_id))];

  // 2. Get saved grants for ACT users (not dismissed)
  const { data: savedGrants, error: sgErr } = await gsSupabase
    .from('saved_grants')
    .select('id, grant_id, user_id, org_profile_id, stars, stage, notes, created_at')
    .in('user_id', profileUserIds)
    .not('stage', 'eq', 'dismissed');

  if (sgErr) {
    console.error('Error fetching saved grants:', sgErr.message);
    process.exit(1);
  }

  if (!savedGrants?.length) {
    console.log('No saved grant matches found. Run the GrantScope scout first.');
    return;
  }

  console.log(`Found ${savedGrants.length} grant matches across all profiles`);

  // 3. Get grant details from grant_opportunities
  const grantIds = [...new Set(savedGrants.map(sg => sg.grant_id))];
  const allGrants = [];

  // Paginate — Supabase limit is 1000
  for (let i = 0; i < grantIds.length; i += 500) {
    const batch = grantIds.slice(i, i + 500);
    const { data, error } = await gsSupabase
      .from('grant_opportunities')
      .select('id, name, provider, amount_min, amount_max, deadline, description, url, application_status')
      .in('id', batch);

    if (error) {
      console.error('Error fetching grant details:', error.message);
      continue;
    }
    allGrants.push(...(data || []));
  }

  const grantMap = Object.fromEntries(allGrants.map(g => [g.id, g]));
  log(`Fetched details for ${allGrants.length} grants`);

  // 4. Check existing ACT opportunities for dedup
  const { data: existing } = await actSupabase
    .from('opportunities_unified')
    .select('source_id')
    .eq('source_system', 'grantscope');

  const existingIds = new Set((existing || []).map(e => e.source_id));

  // 5. Build new opportunities
  const newOpps = [];

  for (const sg of savedGrants) {
    const grant = grantMap[sg.grant_id];
    if (!grant) continue;

    const dedupKey = `gs_${sg.grant_id}`;
    if (existingIds.has(dedupKey)) continue;

    // Estimate match score from stars (1-5 → 0.2-1.0) or default 0.65
    const matchScore = sg.stars ? sg.stars / 5 : 0.65;

    newOpps.push({
      opportunity_type: 'grant',
      source_system: 'grantscope',
      source_id: dedupKey,
      title: grant.name || 'Untitled Grant',
      description: grant.description?.slice(0, 500) || null,
      contact_name: grant.provider || null,
      value_low: grant.amount_min || null,
      value_mid: grant.amount_max ? Math.round((grant.amount_min || grant.amount_max) + (grant.amount_max - (grant.amount_min || 0)) / 2) : null,
      value_high: grant.amount_max || null,
      value_type: 'cash',
      stage: 'identified',
      probability: matchScore,
      project_codes: [],
      expected_close: grant.deadline || null,
      url: grant.url || null,
      notes: sg.notes || null,
      metadata: {
        grantscope_id: sg.grant_id,
        org_profile_id: sg.org_profile_id,
        match_stars: sg.stars,
        match_stage: sg.stage,
        funder: grant.provider,
        synced_at: new Date().toISOString(),
      },
    });
  }

  console.log(`New opportunities to insert: ${newOpps.length} (${existingIds.size} already exist)`);

  if (newOpps.length === 0) {
    console.log('All matches already synced. Done.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would insert:');
    for (const opp of newOpps.slice(0, 10)) {
      console.log(`  ${opp.title} (${opp.contact_name}) — $${opp.value_high || '?'} [${opp.project_codes}]`);
    }
    if (newOpps.length > 10) {
      console.log(`  ... and ${newOpps.length - 10} more`);
    }
    return;
  }

  // 6. Insert in batches
  let inserted = 0;
  for (let i = 0; i < newOpps.length; i += 50) {
    const batch = newOpps.slice(i, i + 50);
    const { error } = await actSupabase
      .from('opportunities_unified')
      .insert(batch);

    if (error) {
      console.error(`Batch insert error (${i}-${i + batch.length}):`, error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\n✅ Inserted ${inserted} GrantScope matches into opportunities_unified`);

  // Summary by project
  const byProject = {};
  for (const opp of newOpps) {
    const code = opp.project_codes?.[0] || 'unlinked';
    byProject[code] = (byProject[code] || 0) + 1;
  }
  console.log('\nBy project:', JSON.stringify(byProject));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
