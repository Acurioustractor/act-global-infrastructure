#!/usr/bin/env node
/**
 * Build Revenue Scenarios
 *
 * Creates 3 revenue scenarios (Conservative, Moderate, Aggressive)
 * from current revenue_streams data, projecting 10 years forward.
 * Re-runnable — upserts by scenario name.
 *
 * Usage:
 *   node scripts/build-revenue-scenarios.mjs
 *   node scripts/build-revenue-scenarios.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const dryRun = process.argv.includes('--dry-run');
const startYear = new Date().getFullYear();
const endYear = startYear + 9; // 10 years

console.log(`Building revenue scenarios ${startYear}-${endYear}${dryRun ? ' (DRY RUN)' : ''}...`);

// Fetch current revenue streams
const { data: streams, error } = await supabase
  .from('revenue_streams')
  .select('*')
  .eq('status', 'active')
  .order('name');

if (error) {
  console.error('Failed to fetch revenue streams:', error.message);
  process.exit(1);
}

console.log(`Found ${streams.length} active revenue streams:`);
for (const s of streams) {
  console.log(`  ${s.name} (${s.code}): $${s.target_monthly}/mo = $${s.target_monthly * 12}/yr`);
}

// Define scenario parameters
const scenarios = [
  {
    name: 'conservative',
    description: 'Flat growth, no new revenue streams. Current streams maintain targets.',
    assumptions: {
      annual_growth: 0.0,
      new_streams: false,
      grant_success_rate: 0.15,
      attrition_rate: 0.05,
    },
    getGrowth: (year, stream) => {
      // Flat with 5% attrition risk compounding
      return Math.pow(0.95, year - startYear);
    },
  },
  {
    name: 'moderate',
    description: '10% annual growth across streams. Assumes incremental improvements.',
    assumptions: {
      annual_growth: 0.10,
      new_streams: false,
      grant_success_rate: 0.25,
      retention_improvement: 0.02,
    },
    getGrowth: (year, stream) => {
      return Math.pow(1.10, year - startYear);
    },
  },
  {
    name: 'aggressive',
    description: '25% growth + new revenue streams from Year 3. Requires significant investment.',
    assumptions: {
      annual_growth: 0.25,
      new_streams_year: 3,
      new_stream_value: 5000, // per month
      grant_success_rate: 0.40,
      team_growth: true,
    },
    getGrowth: (year, stream) => {
      return Math.pow(1.25, year - startYear);
    },
    extraRevenue: (year) => {
      // New streams from Year 3 onwards
      const yearsOfNew = year - (startYear + 2);
      if (yearsOfNew <= 0) return 0;
      // Each year adds one new $5K/mo stream
      return yearsOfNew * 5000 * 12;
    },
  },
];

for (const scenario of scenarios) {
  console.log(`\n--- ${scenario.name.toUpperCase()} ---`);

  // Build annual targets
  const annualTargets = {};
  const projections = [];

  for (let year = startYear; year <= endYear; year++) {
    let yearTotal = 0;

    for (const stream of streams) {
      const baseAnnual = Number(stream.target_monthly) * 12;
      const growth = scenario.getGrowth(year, stream);
      const projected = Math.round(baseAnnual * growth);
      yearTotal += projected;

      projections.push({
        stream_id: stream.id,
        year,
        projected_annual: projected,
        notes: year === startYear ? 'Base year' : `${scenario.assumptions.annual_growth * 100}% growth applied`,
      });
    }

    // Extra revenue for aggressive scenario
    if (scenario.extraRevenue) {
      const extra = scenario.extraRevenue(year);
      if (extra > 0) {
        yearTotal += extra;
        // We don't have a stream_id for hypothetical new streams,
        // so we track in annual_targets only
      }
    }

    annualTargets[year] = yearTotal;
    console.log(`  ${year}: ${yearTotal.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })}`);
  }

  if (dryRun) continue;

  // Upsert scenario
  const { data: scenarioRow, error: scenError } = await supabase
    .from('revenue_scenarios')
    .upsert({
      name: scenario.name,
      description: scenario.description,
      assumptions: scenario.assumptions,
      annual_targets: annualTargets,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'name' })
    .select()
    .single();

  if (scenError) {
    console.error(`  Error upserting scenario: ${scenError.message}`);
    continue;
  }

  console.log(`  Scenario upserted: ${scenarioRow.id}`);

  // Delete old projections for this scenario then insert fresh
  await supabase
    .from('revenue_stream_projections')
    .delete()
    .eq('scenario_id', scenarioRow.id);

  // Insert projections in batches
  const projectionsWithId = projections.map(p => ({
    ...p,
    scenario_id: scenarioRow.id,
  }));

  for (let i = 0; i < projectionsWithId.length; i += 100) {
    const chunk = projectionsWithId.slice(i, i + 100);
    const { error: insertErr } = await supabase
      .from('revenue_stream_projections')
      .insert(chunk);
    if (insertErr) console.error(`  Projection chunk ${i}: ${insertErr.message}`);
  }

  console.log(`  ${projectionsWithId.length} projections inserted`);
}

console.log('\nDone.');
