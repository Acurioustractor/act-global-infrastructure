#!/usr/bin/env node
/**
 * Align Pipeline Projects
 *
 * Cleans up opportunities_unified data:
 * 1. Tags untagged high-value opportunities with correct project_codes
 * 2. Adds missing known opportunities (Alive Mental Health, Contained Tour, etc.)
 * 3. Sets expected_close dates on opportunities that lack them
 * 4. Verifies pipeline stages are meaningful
 *
 * Usage:
 *   node scripts/align-pipeline-projects.mjs              # Apply changes
 *   node scripts/align-pipeline-projects.mjs --dry-run    # Preview without writing
 *
 * Created: 2026-03-21
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// ============================================================================
// 1A. TAG UNTAGGED HIGH-VALUE OPPORTUNITIES
// ============================================================================

/** Map of title substrings → project codes to assign */
const TAG_RULES = [
  { match: 'REAL Innovation Fund', codes: ['ACT-GD'], notes: 'Goods on Country innovation' },
  { match: 'R&D Tax Incentive', codes: ['ACT-IN'], notes: 'Infrastructure-wide R&D offset' },
  { match: 'Remote community demand', codes: ['ACT-GD'], notes: 'NT remote community laundry' },
  { match: 'remote community', codes: ['ACT-GD'], notes: 'NT remote community laundry' },
  { match: 'NT procurement', codes: ['ACT-GD'], notes: 'NT government procurement' },
  { match: 'NT government', codes: ['ACT-GD'], notes: 'NT government' },
  { match: 'Minderoo', codes: ['ACT-JH'], notes: 'JusticeHub foundation partner' },
  { match: 'Youth Justice', codes: ['ACT-JH'], notes: 'JusticeHub youth justice' },
];

async function tagUntaggedOpportunities() {
  console.log('\n📌 Phase 1A: Tagging untagged high-value opportunities...');

  // Get all opportunities with empty or null project_codes
  const { data: untagged, error } = await supabase
    .from('opportunities_unified')
    .select('id, title, project_codes, value_mid, stage')
    .or('project_codes.is.null,project_codes.eq.{}')
    .order('value_mid', { ascending: false });

  if (error) {
    console.error('Error fetching untagged:', error.message);
    return { tagged: 0 };
  }

  console.log(`  Found ${untagged?.length || 0} untagged opportunities`);

  let tagged = 0;
  for (const opp of (untagged || [])) {
    for (const rule of TAG_RULES) {
      if (opp.title?.toLowerCase().includes(rule.match.toLowerCase())) {
        console.log(`  ✓ ${opp.title} → ${rule.codes.join(', ')} (${rule.notes})`);
        if (!dryRun) {
          await supabase
            .from('opportunities_unified')
            .update({ project_codes: rule.codes, updated_at: new Date().toISOString() })
            .eq('id', opp.id);
        }
        tagged++;
        break;
      }
    }
  }

  console.log(`  Tagged: ${tagged} opportunities${dryRun ? ' (dry run)' : ''}`);
  return { tagged };
}

// ============================================================================
// 1B. ADD MISSING OPPORTUNITIES
// ============================================================================

const MISSING_OPPORTUNITIES = [
  {
    title: 'Alive Mental Health — partnership',
    description: 'Mental health partnership for Empathy Ledger. $50k engagement for digital narrative platform.',
    opportunity_type: 'deal',
    source_system: 'manual',
    source_id: 'manual-alive-mental-health',
    contact_name: 'Alive Mental Health',
    value_low: 40000, value_mid: 50000, value_high: 60000,
    value_type: 'cash',
    stage: 'pursuing',
    probability: 40,
    project_codes: ['ACT-EL'],
    expected_close: '2026-09-30',
    metadata: { source: 'pipeline-alignment-2026-03' },
  },
  {
    title: 'Contained Australia Tour — JusticeHub',
    description: 'National tour of Contained exhibition. Funding for transport, venue hire, and community engagement.',
    opportunity_type: 'deal',
    source_system: 'manual',
    source_id: 'manual-contained-tour',
    contact_name: 'JusticeHub',
    value_low: 30000, value_mid: 50000, value_high: 80000,
    value_type: 'cash',
    stage: 'pursuing',
    probability: 35,
    project_codes: ['ACT-JH'],
    expected_close: '2026-12-31',
    metadata: { source: 'pipeline-alignment-2026-03' },
  },
  {
    title: 'Goods NT procurement & sales',
    description: 'NT government procurement for washing machines and commercial laundry sales to remote communities.',
    opportunity_type: 'earned_revenue',
    source_system: 'manual',
    source_id: 'manual-goods-nt-procurement',
    contact_name: 'NT Government',
    value_low: 80000, value_mid: 120000, value_high: 200000,
    value_type: 'cash',
    stage: 'pursuing',
    probability: 45,
    project_codes: ['ACT-GD'],
    expected_close: '2026-09-30',
    metadata: { source: 'pipeline-alignment-2026-03' },
  },
  {
    title: 'JusticeHub container build & setup',
    description: 'Container conversion for mobile justice exhibition unit. Fabrication, fit-out, and transport.',
    opportunity_type: 'deal',
    source_system: 'manual',
    source_id: 'manual-jh-container-build',
    contact_name: 'JusticeHub',
    value_low: 20000, value_mid: 40000, value_high: 60000,
    value_type: 'cash',
    stage: 'researching',
    probability: 25,
    project_codes: ['ACT-JH'],
    expected_close: '2026-12-31',
    metadata: { source: 'pipeline-alignment-2026-03' },
  },
];

async function addMissingOpportunities() {
  console.log('\n📌 Phase 1B: Adding missing opportunities...');

  let added = 0;
  let skipped = 0;

  for (const opp of MISSING_OPPORTUNITIES) {
    // Check if already exists by source_id
    const { data: existing } = await supabase
      .from('opportunities_unified')
      .select('id, title')
      .eq('source_system', opp.source_system)
      .eq('source_id', opp.source_id)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`  ⏭ Already exists: ${opp.title}`);
      skipped++;
      continue;
    }

    console.log(`  + ${opp.title} — $${opp.value_mid.toLocaleString()} → ${opp.project_codes.join(', ')}`);
    if (!dryRun) {
      const { error } = await supabase.from('opportunities_unified').insert(opp);
      if (error) {
        console.error(`    Error inserting ${opp.title}:`, error.message);
      } else {
        added++;
      }
    } else {
      added++;
    }
  }

  console.log(`  Added: ${added}, Skipped: ${skipped}${dryRun ? ' (dry run)' : ''}`);
  return { added, skipped };
}

// ============================================================================
// 1C. SET EXPECTED_CLOSE DATES ON KEY OPPORTUNITIES
// ============================================================================

/** Map of title patterns → expected close dates for opportunities missing them */
const DATE_RULES = [
  // Harvest opportunities — based on renovation timeline
  { match: 'Snow Foundation', date: '2026-06-30', notes: 'Snow Foundation grant — FY26 close' },
  { match: 'Regional Arts', date: '2026-07-31', notes: 'Regional Arts — early FY27' },
  { match: 'Creative Australia', date: '2026-09-30', notes: 'Creative Australia — Q1 FY27' },
  { match: 'Harvest renovation', date: '2026-08-31', notes: 'Renovation works' },
  // PICC
  { match: 'Arts Projects for Organisations', date: '2026-04-30', notes: 'PICC arts grant — application due Apr 2026' },
  // Goods
  { match: 'REAK Innovation', date: '2026-12-31', notes: 'REAK fund — end of CY2026' },
  { match: 'REAL Innovation', date: '2026-12-31', notes: 'REAL fund — end of CY2026' },
];

async function setExpectedCloseDates() {
  console.log('\n📌 Phase 1C: Setting expected_close dates...');

  // Only look at opps that have project_codes (ACT-tagged) — skip the 8000+ GrantScope bulk opps
  const { data: noDate, error } = await supabase
    .from('opportunities_unified')
    .select('id, title, expected_close, value_mid, project_codes')
    .is('expected_close', null)
    .not('stage', 'in', '("realized","lost","expired")')
    .not('project_codes', 'eq', '{}')
    .order('value_mid', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Error fetching:', error.message);
    return { updated: 0 };
  }

  console.log(`  Found ${noDate?.length || 0} tagged opportunities without expected_close`);

  let updated = 0;
  for (const opp of (noDate || [])) {
    for (const rule of DATE_RULES) {
      if (opp.title?.toLowerCase().includes(rule.match.toLowerCase())) {
        console.log(`  📅 ${opp.title} → ${rule.date} (${rule.notes})`);
        if (!dryRun) {
          await supabase
            .from('opportunities_unified')
            .update({ expected_close: rule.date, updated_at: new Date().toISOString() })
            .eq('id', opp.id);
        }
        updated++;
        break;
      }
    }
  }

  console.log(`  Dates set: ${updated}${dryRun ? ' (dry run)' : ''}`);
  return { updated };
}

// ============================================================================
// 1D. VERIFY STAGES
// ============================================================================

async function verifyStages() {
  console.log('\n📌 Phase 1D: Pipeline stage summary...');

  const { data, error } = await supabase
    .from('opportunities_unified')
    .select('stage, project_codes, value_mid')
    .not('stage', 'in', '("realized","lost","expired")');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  // Summary by stage
  const byStage = {};
  for (const opp of (data || [])) {
    const stage = opp.stage || 'unknown';
    if (!byStage[stage]) byStage[stage] = { count: 0, value: 0 };
    byStage[stage].count++;
    byStage[stage].value += Number(opp.value_mid || 0);
  }

  console.log('\n  Stage Distribution:');
  for (const [stage, stats] of Object.entries(byStage)) {
    console.log(`    ${stage.padEnd(15)} ${String(stats.count).padStart(5)} opps  $${Math.round(stats.value).toLocaleString()}`);
  }

  // Summary by project
  const byProject = {};
  for (const opp of (data || [])) {
    const codes = opp.project_codes || [];
    if (codes.length === 0) {
      if (!byProject['UNTAGGED']) byProject['UNTAGGED'] = { count: 0, value: 0 };
      byProject['UNTAGGED'].count++;
      byProject['UNTAGGED'].value += Number(opp.value_mid || 0);
    } else {
      for (const code of codes) {
        if (!byProject[code]) byProject[code] = { count: 0, value: 0 };
        byProject[code].count++;
        byProject[code].value += Number(opp.value_mid || 0);
      }
    }
  }

  console.log('\n  Project Pipeline:');
  const sorted = Object.entries(byProject).sort((a, b) => b[1].value - a[1].value);
  for (const [code, stats] of sorted) {
    console.log(`    ${code.padEnd(15)} ${String(stats.count).padStart(5)} opps  $${Math.round(stats.value).toLocaleString()}`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`\n🔧 Pipeline Project Alignment${dryRun ? ' (DRY RUN)' : ''}`);
  console.log('='.repeat(60));

  const r1 = await tagUntaggedOpportunities();
  const r2 = await addMissingOpportunities();
  const r3 = await setExpectedCloseDates();
  await verifyStages();

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Summary: Tagged ${r1.tagged}, Added ${r2.added}, Dates set ${r3.updated}${dryRun ? ' (dry run)' : ''}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
