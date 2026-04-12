#!/usr/bin/env node
/**
 * Populate Funding Pipeline
 *
 * Inserts strategic funding opportunities into the opportunities_unified table.
 * Sources from the funding-pipeline-strategy.md plan — 21 opportunities across 4 tiers.
 *
 * Usage:
 *   node scripts/populate-funding-pipeline.mjs              # Insert new opportunities
 *   node scripts/populate-funding-pipeline.mjs --dry-run    # Preview without inserting
 *   node scripts/populate-funding-pipeline.mjs --clean      # Remove previously inserted pipeline opps, then re-insert
 *
 * Created: 2026-03-12
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
const clean = args.includes('--clean');

// ============================================================================
// PIPELINE OPPORTUNITIES
// ============================================================================

const SOURCE_TAG = 'funding-pipeline-2026-03';

const opportunities = [
  // TIER 1: Money Within 30 Days
  {
    title: 'BG Fit services invoice',
    description: 'Scope and invoice for services delivered to BG Fit. Nic to lead engagement.',
    opportunity_type: 'deal',
    source_system: 'manual',
    contact_name: 'BG Fit',
    value_low: 5000, value_mid: 15000, value_high: 30000,
    value_type: 'cash',
    stage: 'pursuing',
    probability: 0.8,
    project_codes: ['ACT-BG'],
    expected_close: '2026-04-15',
    metadata: { tier: 1, source: SOURCE_TAG }
  },
  {
    title: 'Chancy Mounty Yarns — outstanding payment',
    description: 'Chase outstanding payment. Confirm amount and invoice status in Xero.',
    opportunity_type: 'deal',
    source_system: 'xero',
    contact_name: 'Chancy Mounty Yarns',
    value_low: 1000, value_mid: 5000, value_high: 10000,
    value_type: 'cash',
    stage: 'pursuing',
    probability: 0.7,
    project_codes: ['ACT-MY'],
    expected_close: '2026-04-01',
    metadata: { tier: 1, source: SOURCE_TAG }
  },
  {
    title: 'Greenflex — outstanding payment',
    description: 'Chase outstanding payment. Confirm amount and invoice status in Xero.',
    opportunity_type: 'deal',
    source_system: 'xero',
    contact_name: 'Greenflex',
    value_low: 1000, value_mid: 5000, value_high: 10000,
    value_type: 'cash',
    stage: 'pursuing',
    probability: 0.7,
    project_codes: ['ACT-CORE'],
    expected_close: '2026-04-01',
    metadata: { tier: 1, source: SOURCE_TAG }
  },
  {
    title: 'Goods bed sales — follow up existing leads',
    description: 'Audit all Goods leads in GHL. Follow up Centre Corp (107 beds approved), Miwatj Health, Groote Eylandt (500+ mattress requests).',
    opportunity_type: 'deal',
    source_system: 'ghl',
    contact_name: 'Multiple (Centre Corp, Miwatj Health, Groote Eylandt)',
    value_low: 10000, value_mid: 30000, value_high: 50000,
    value_type: 'cash',
    stage: 'pursuing',
    probability: 0.5,
    project_codes: ['ACT-GD'],
    expected_close: '2026-04-15',
    metadata: { tier: 1, source: SOURCE_TAG }
  },

  // TIER 2: Money Within 60-90 Days
  {
    title: 'PICC Elders — $50K elders organisation funding',
    description: 'Funders identified. Scope deliverables for elders organisation. Show value through GrantScope (PICC role in data ecosystem).',
    opportunity_type: 'grant',
    source_system: 'manual',
    contact_name: 'PICC / Elders',
    value_low: 40000, value_mid: 50000, value_high: 60000,
    value_type: 'cash',
    stage: 'researching',
    probability: 0.6,
    project_codes: ['ACT-PI', 'ACT-ER'],
    expected_close: '2026-06-01',
    metadata: { tier: 2, source: SOURCE_TAG }
  },
  {
    title: 'PICC Annual Report System — first paid EL deployment',
    description: 'Position as Empathy Ledger subscription. Annual report system IS the EL platform configured for PICC. First paid deployment = proof of commercial model.',
    opportunity_type: 'deal',
    source_system: 'manual',
    contact_name: 'Palm Island Community Company Limited (PICC)',
    value_low: 40000, value_mid: 50000, value_high: 60000,
    value_type: 'cash',
    stage: 'researching',
    probability: 0.65,
    project_codes: ['ACT-PI', 'ACT-EL'],
    expected_close: '2026-06-01',
    metadata: { tier: 2, source: SOURCE_TAG }
  },
  {
    title: 'Goods bed newsletter + institutional sales push',
    description: 'Build simple newsletter (Mailchimp/Buttondown). Compile all leads. Send product update to institutional buyers.',
    opportunity_type: 'deal',
    source_system: 'manual',
    contact_name: 'Multiple institutional buyers',
    value_low: 20000, value_mid: 35000, value_high: 50000,
    value_type: 'cash',
    stage: 'identified',
    probability: 0.4,
    project_codes: ['ACT-GD'],
    expected_close: '2026-06-15',
    metadata: { tier: 2, source: SOURCE_TAG }
  },
  {
    title: 'GrantScope — find grants for The Harvest',
    description: 'Run GrantScope grant scout against The Harvest profile (regenerative agriculture, community gardens, therapeutic horticulture, Jinibara Country). Submit top 3 matches. $165K/yr operational gap from July.',
    opportunity_type: 'grant',
    source_system: 'grantscope',
    contact_name: null,
    value_low: 50000, value_mid: 125000, value_high: 200000,
    value_type: 'cash',
    stage: 'researching',
    probability: 0.4,
    project_codes: ['ACT-HV'],
    expected_close: '2026-06-30',
    metadata: { tier: 2, source: SOURCE_TAG }
  },
  {
    title: 'GrantScope — find grants for all ACT projects',
    description: 'Create org profiles for each of 7 projects. Run AI matching against 18K grants. Build prioritised grant calendar by deadline.',
    opportunity_type: 'grant',
    source_system: 'grantscope',
    contact_name: null,
    value_low: 100000, value_mid: 300000, value_high: 500000,
    value_type: 'cash',
    stage: 'identified',
    probability: 0.3,
    project_codes: ['ACT-CORE'],
    expected_close: '2026-06-30',
    metadata: { tier: 2, source: SOURCE_TAG }
  },
  {
    title: 'JusticeHub containerised campaign',
    description: 'Push contained campaign — specific ask, next container purchase, platform dev funding. Identify 3 target funders and submit.',
    opportunity_type: 'grant',
    source_system: 'manual',
    contact_name: null,
    value_low: 50000, value_mid: 75000, value_high: 100000,
    value_type: 'cash',
    stage: 'identified',
    probability: 0.35,
    project_codes: ['ACT-JH'],
    expected_close: '2026-06-30',
    metadata: { tier: 2, source: SOURCE_TAG }
  },

  // TIER 3: Money Within 3-6 Months
  {
    title: 'GrantScope v1 launch — first paying customers',
    description: 'Product 90% built. Push to launch with 5-10 beta customers at $200/mo. Target: $2-5K/mo recurring.',
    opportunity_type: 'deal',
    source_system: 'manual',
    contact_name: null,
    value_low: 24000, value_mid: 42000, value_high: 60000,
    value_type: 'cash',
    stage: 'identified',
    probability: 0.5,
    project_codes: ['ACT-CS'],
    expected_close: '2026-09-01',
    metadata: { tier: 3, source: SOURCE_TAG }
  },
  {
    title: 'Empathy Ledger — first institutional customer',
    description: 'PICC natural first customer. Annual report system = paid EL subscription. Then Oonchiumpa, SNAICC. Target: 3 customers by Q2 end.',
    opportunity_type: 'deal',
    source_system: 'manual',
    contact_name: 'PICC / Oonchiumpa / SNAICC',
    value_low: 12000, value_mid: 24000, value_high: 36000,
    value_type: 'cash',
    stage: 'identified',
    probability: 0.45,
    project_codes: ['ACT-EL'],
    expected_close: '2026-09-01',
    metadata: { tier: 3, source: SOURCE_TAG }
  },
  {
    title: 'JusticeHub — philanthropic bridge funding',
    description: 'Paul Ramsay Foundation, Myer Foundation, Vincent Fairfax. Position as "Australia\'s Recidiviz". The $3.9B NAJP procurement window is NOW.',
    opportunity_type: 'grant',
    source_system: 'manual',
    contact_name: 'Paul Ramsay / Myer / Vincent Fairfax Foundations',
    value_low: 100000, value_mid: 300000, value_high: 500000,
    value_type: 'cash',
    stage: 'identified',
    probability: 0.3,
    project_codes: ['ACT-JH'],
    expected_close: '2026-09-30',
    metadata: { tier: 3, source: SOURCE_TAG }
  },
  {
    title: 'Mukutu — storytelling and cultural preservation grants',
    description: 'Work with Mukutu team to identify cultural preservation / storytelling grants. Australia Council, Create NSW, Arts QLD.',
    opportunity_type: 'grant',
    source_system: 'manual',
    contact_name: 'Mukutu team',
    value_low: 20000, value_mid: 35000, value_high: 50000,
    value_type: 'cash',
    stage: 'identified',
    probability: 0.35,
    project_codes: ['ACT-EL'],
    expected_close: '2026-09-30',
    metadata: { tier: 3, source: SOURCE_TAG }
  },
  {
    title: 'Mental health team — EL platform costing',
    description: 'Scope platform for mental health team. EL deployment? JusticeHub module? Custom build? Cost it out, pitch for funding.',
    opportunity_type: 'deal',
    source_system: 'manual',
    contact_name: 'Mental health team',
    value_low: 20000, value_mid: 50000, value_high: 100000,
    value_type: 'cash',
    stage: 'identified',
    probability: 0.25,
    project_codes: ['ACT-EL'],
    expected_close: '2026-09-30',
    metadata: { tier: 3, source: SOURCE_TAG }
  },
  {
    title: 'Goods PFI Stage 2 (if EOI submitted)',
    description: 'PFI Stage 1 EOI was due March 15. If submitted, prepare for Stage 2. If not, find alternative scale-up funding.',
    opportunity_type: 'grant',
    source_system: 'manual',
    contact_name: null,
    value_low: 200000, value_mid: 420000, value_high: 640000,
    value_type: 'cash',
    stage: 'identified',
    probability: 0.2,
    project_codes: ['ACT-GD'],
    expected_close: '2026-09-30',
    metadata: { tier: 3, source: SOURCE_TAG }
  },

  // TIER 4: Money Within 6-12 Months
  {
    title: 'JusticeHub government pilot contract',
    description: 'QLD Youth Justice data platform pilot. 12-18 month procurement cycle starts now.',
    opportunity_type: 'deal',
    source_system: 'manual',
    contact_name: 'QLD Youth Justice',
    value_low: 200000, value_mid: 500000, value_high: 1000000,
    value_type: 'cash',
    stage: 'identified',
    probability: 0.2,
    project_codes: ['ACT-JH'],
    expected_close: '2027-03-01',
    metadata: { tier: 4, source: SOURCE_TAG }
  },
  {
    title: 'GrantScope — foundation/enterprise customers',
    description: 'Once v1 proven, target foundations and consultancies who need grant data. $5-15K/mo.',
    opportunity_type: 'deal',
    source_system: 'manual',
    contact_name: null,
    value_low: 60000, value_mid: 120000, value_high: 180000,
    value_type: 'cash',
    stage: 'identified',
    probability: 0.3,
    project_codes: ['ACT-CS'],
    expected_close: '2027-03-01',
    metadata: { tier: 4, source: SOURCE_TAG }
  },
  {
    title: 'R&D Tax Incentive refund (FY2025)',
    description: 'Deadline April 30, 2026. Requires tax advisor to verify ACT Ventures structure. See rd-activity-register-fy2025.md.',
    opportunity_type: 'grant',
    source_system: 'manual',
    contact_name: 'Tax advisor (TBD)',
    value_low: 87000, value_mid: 108000, value_high: 130000,
    value_type: 'cash',
    stage: 'researching',
    probability: 0.6,
    project_codes: ['ACT-CORE'],
    expected_close: '2026-10-01',
    metadata: { tier: 4, source: SOURCE_TAG }
  },
  {
    title: 'Impact investor conversations',
    description: 'Giant Leap, Airtree Impact. Only after revenue proof points exist.',
    opportunity_type: 'deal',
    source_system: 'manual',
    contact_name: 'Giant Leap / Airtree Impact',
    value_low: 500000, value_mid: 1000000, value_high: 2000000,
    value_type: 'cash',
    stage: 'identified',
    probability: 0.1,
    project_codes: ['ACT-CORE'],
    expected_close: '2027-03-01',
    metadata: { tier: 4, source: SOURCE_TAG }
  },
  {
    title: 'Grant writing automation as a service',
    description: 'Productize GrantAgent + ImpactAgent (SROI) for other nonprofits. 15-25% success fee on grants won. Agentic org revenue stream.',
    opportunity_type: 'deal',
    source_system: 'manual',
    contact_name: null,
    value_low: 50000, value_mid: 125000, value_high: 200000,
    value_type: 'cash',
    stage: 'identified',
    probability: 0.25,
    project_codes: ['ACT-CORE'],
    expected_close: '2027-03-01',
    metadata: { tier: 4, source: SOURCE_TAG }
  }
];

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  ACT FUNDING PIPELINE — POPULATE OPPORTUNITIES');
  console.log(`  ${dryRun ? '(DRY RUN)' : ''} ${new Date().toISOString().split('T')[0]}`);
  console.log('════════════════════════════════════════════════════════════\n');

  // Clean existing pipeline entries if requested
  if (clean) {
    console.log('  Cleaning existing pipeline opportunities...');
    if (!dryRun) {
      const { error, count } = await supabase
        .from('opportunities_unified')
        .delete()
        .eq('source_system', 'manual')
        .filter('metadata->>source', 'eq', SOURCE_TAG);

      if (error) {
        console.error('  Failed to clean:', error.message);
      } else {
        console.log(`  Removed ${count || '?'} existing pipeline entries`);
      }
    } else {
      console.log('  (dry run — would remove existing pipeline entries)');
    }
    console.log('');
  }

  // Check for duplicates
  const { data: existing } = await supabase
    .from('opportunities_unified')
    .select('title')
    .filter('metadata->>source', 'eq', SOURCE_TAG);

  const existingTitles = new Set((existing || []).map(e => e.title));

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  // Weighted pipeline value
  let weightedTotal = 0;

  for (const opp of opportunities) {
    const tier = opp.metadata.tier;
    const weighted = opp.value_mid * opp.probability;
    weightedTotal += weighted;

    if (existingTitles.has(opp.title) && !clean) {
      console.log(`  SKIP (exists): ${opp.title}`);
      skipped++;
      continue;
    }

    const label = `T${tier} | $${opp.value_mid.toLocaleString()} @ ${(opp.probability * 100).toFixed(0)}% = $${weighted.toLocaleString()} weighted`;
    console.log(`  INSERT: ${opp.title}`);
    console.log(`          ${label}`);

    if (!dryRun) {
      const { error } = await supabase
        .from('opportunities_unified')
        .insert(opp);

      if (error) {
        console.error(`  ERROR: ${error.message}`);
        errors++;
      } else {
        inserted++;
      }
    } else {
      inserted++;
    }
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);
  console.log(`  Weighted pipeline value: $${weightedTotal.toLocaleString('en-AU', { minimumFractionDigits: 0 })}`);
  console.log(`  ${dryRun ? '(DRY RUN — no data written)' : ''}`);

  // Tier breakdown
  console.log('\n  By Tier:');
  for (const tier of [1, 2, 3, 4]) {
    const tierOpps = opportunities.filter(o => o.metadata.tier === tier);
    const tierWeighted = tierOpps.reduce((sum, o) => sum + (o.value_mid * o.probability), 0);
    const tierMax = tierOpps.reduce((sum, o) => sum + o.value_high, 0);
    console.log(`    Tier ${tier}: ${tierOpps.length} opportunities | Weighted: $${tierWeighted.toLocaleString()} | Max: $${tierMax.toLocaleString()}`);
  }

  console.log('');
}

main().catch(console.error);
