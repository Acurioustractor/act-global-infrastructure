#!/usr/bin/env node
/**
 * Migrate Opportunities to Unified Pipeline
 *
 * One-time (re-runnable) migration that copies grant_opportunities,
 * ghl_opportunities, and fundraising_pipeline into opportunities_unified.
 * Uses upsert on (source_system, source_id) to be safe to re-run.
 *
 * Usage:
 *   node scripts/migrate-opportunities-to-unified-pipeline.mjs
 *   node scripts/migrate-opportunities-to-unified-pipeline.mjs --dry-run
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
let totalMigrated = 0;

// Stage mapping for grants
function mapGrantStatus(status) {
  const map = {
    'not_applied': 'identified',
    'reviewing': 'researching',
    'will_apply': 'pursuing',
    'in_progress': 'pursuing',
    'submitted': 'submitted',
    'under_review': 'submitted',
    'successful': 'approved',
    'approved': 'approved',
    'unsuccessful': 'lost',
    'rejected': 'lost',
    'expired': 'expired',
  };
  return map[status] || 'identified';
}

// Stage mapping for GHL
function mapGHLStatus(status) {
  const map = {
    'open': 'pursuing',
    'won': 'realized',
    'lost': 'lost',
    'abandoned': 'expired',
  };
  return map[status] || 'identified';
}

// Probability by stage
function stageProbability(stage) {
  const map = {
    'identified': 10,
    'researching': 20,
    'pursuing': 35,
    'submitted': 50,
    'negotiating': 65,
    'approved': 90,
    'realized': 100,
    'lost': 0,
    'expired': 0,
  };
  return map[stage] || 10;
}

console.log(`Migrating opportunities to unified pipeline${dryRun ? ' (DRY RUN)' : ''}...`);

// 1. Grant Opportunities
console.log('\n--- Grant Opportunities ---');
const { data: grants, error: grantErr } = await supabase
  .from('grant_opportunities')
  .select('*');

if (grantErr) {
  console.error('Failed to fetch grants:', grantErr.message);
} else {
  console.log(`Found ${grants.length} grants`);
  const rows = grants.map(g => {
    const stage = mapGrantStatus(g.application_status);
    return {
      opportunity_type: 'grant',
      source_system: 'grant_opportunities',
      source_id: g.id,
      title: g.name,
      description: g.description,
      contact_name: g.provider || null,
      value_low: g.amount_min || 0,
      value_mid: g.amount_max ? Math.round((g.amount_min + g.amount_max) / 2) : g.amount_min || 0,
      value_high: g.amount_max || g.amount_min || 0,
      value_type: 'cash',
      stage,
      probability: stageProbability(stage),
      project_codes: g.aligned_projects || [],
      expected_close: g.deadline,
      url: g.url,
      metadata: {
        fit_score: g.fit_score,
        relevance_score: g.relevance_score,
        categories: g.categories,
        focus_areas: g.focus_areas,
        source: g.source,
        program: g.program,
      },
      created_at: g.created_at,
      updated_at: g.updated_at || new Date().toISOString(),
    };
  });

  if (!dryRun) {
    // Batch upsert in chunks of 100
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error } = await supabase
        .from('opportunities_unified')
        .upsert(chunk, { onConflict: 'source_system,source_id' });
      if (error) console.error(`  Chunk ${i}: ${error.message}`);
      else totalMigrated += chunk.length;
    }
    console.log(`  Migrated ${rows.length} grants`);
  } else {
    console.log(`  Would migrate ${rows.length} grants`);
  }
}

// 2. GHL Opportunities
console.log('\n--- GHL Opportunities ---');
const { data: ghlOpps, error: ghlErr } = await supabase
  .from('ghl_opportunities')
  .select('*');

if (ghlErr) {
  console.error('Failed to fetch GHL opportunities:', ghlErr.message);
} else {
  console.log(`Found ${ghlOpps.length} GHL opportunities`);
  const rows = ghlOpps.map(g => {
    const stage = mapGHLStatus(g.status);
    return {
      opportunity_type: 'deal',
      source_system: 'ghl_opportunities',
      source_id: g.id,
      title: g.name,
      contact_name: null, // GHL stores contact by reference
      value_low: Number(g.monetary_value || 0),
      value_mid: Number(g.monetary_value || 0),
      value_high: Number(g.monetary_value || 0),
      value_type: 'cash',
      stage,
      probability: stageProbability(stage),
      project_codes: g.project_code ? [g.project_code] : [],
      actual_close: g.received_date || null,
      metadata: {
        ghl_id: g.ghl_id,
        ghl_pipeline_id: g.ghl_pipeline_id,
        ghl_stage_id: g.ghl_stage_id,
        pipeline_name: g.pipeline_name,
        stage_name: g.stage_name,
        assigned_to: g.assigned_to,
      },
      created_at: g.created_at,
      updated_at: g.updated_at || new Date().toISOString(),
    };
  });

  if (!dryRun) {
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error } = await supabase
        .from('opportunities_unified')
        .upsert(chunk, { onConflict: 'source_system,source_id' });
      if (error) console.error(`  Chunk ${i}: ${error.message}`);
      else totalMigrated += chunk.length;
    }
    console.log(`  Migrated ${rows.length} GHL opportunities`);
  } else {
    console.log(`  Would migrate ${rows.length} GHL opportunities`);
  }
}

// 3. Fundraising Pipeline
console.log('\n--- Fundraising Pipeline ---');
const { data: fundraising, error: fundErr } = await supabase
  .from('fundraising_pipeline')
  .select('*');

if (fundErr) {
  console.error('Failed to fetch fundraising:', fundErr.message);
} else {
  console.log(`Found ${fundraising.length} fundraising items`);
  if (fundraising.length > 0) {
    const typeMap = {
      'grant': 'grant',
      'donation': 'donation',
      'investment': 'investment',
      'sponsorship': 'donation',
      'earned': 'earned_revenue',
    };

    const statusMap = {
      'identified': 'identified',
      'researching': 'researching',
      'approaching': 'pursuing',
      'submitted': 'submitted',
      'negotiating': 'negotiating',
      'approved': 'approved',
      'received': 'realized',
      'declined': 'lost',
    };

    const rows = fundraising.map(f => {
      const stage = statusMap[f.status] || 'identified';
      return {
        opportunity_type: typeMap[f.type] || 'donation',
        source_system: 'fundraising_pipeline',
        source_id: f.id,
        title: f.name,
        contact_name: f.funder,
        value_low: Number(f.amount || 0),
        value_mid: Number(f.amount || 0),
        value_high: Number(f.amount || 0),
        value_type: 'cash',
        stage,
        probability: f.probability ? Number(f.probability) : stageProbability(stage),
        project_codes: f.project_codes || [],
        expected_close: f.expected_date || f.deadline,
        actual_close: f.actual_date,
        notes: f.notes,
        metadata: { requirements: f.requirements },
        created_at: f.created_at,
        updated_at: f.updated_at || new Date().toISOString(),
      };
    });

    if (!dryRun) {
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100);
        const { error } = await supabase
          .from('opportunities_unified')
          .upsert(chunk, { onConflict: 'source_system,source_id' });
        if (error) console.error(`  Chunk ${i}: ${error.message}`);
        else totalMigrated += chunk.length;
      }
      console.log(`  Migrated ${rows.length} fundraising items`);
    } else {
      console.log(`  Would migrate ${rows.length} fundraising items`);
    }
  }
}

console.log(`\nDone. ${dryRun ? 'Would have migrated' : 'Migrated'} ${totalMigrated} total opportunities.`);
