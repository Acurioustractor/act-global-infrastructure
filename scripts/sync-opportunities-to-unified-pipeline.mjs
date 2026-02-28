#!/usr/bin/env node
/**
 * Sync Opportunities to Unified Pipeline
 *
 * Daily sync from source systems (grant_opportunities, ghl_opportunities,
 * fundraising_pipeline) into opportunities_unified.
 * Only syncs records updated in the last 48 hours for efficiency.
 *
 * Usage:
 *   node scripts/sync-opportunities-to-unified-pipeline.mjs
 *   node scripts/sync-opportunities-to-unified-pipeline.mjs --full  (re-sync everything)
 */

import { createClient } from '@supabase/supabase-js';
import { recordSyncStatus } from './lib/sync-status.mjs';
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

const fullSync = process.argv.includes('--full');
const since = fullSync ? '2020-01-01' : new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

console.log(`Syncing opportunities (${fullSync ? 'full' : 'last 48h'})...`);

function mapGrantStatus(status) {
  const map = {
    'not_applied': 'identified', 'reviewing': 'researching',
    'will_apply': 'pursuing', 'in_progress': 'pursuing',
    'submitted': 'submitted', 'under_review': 'submitted',
    'successful': 'approved', 'approved': 'approved',
    'unsuccessful': 'lost', 'rejected': 'lost', 'expired': 'expired',
  };
  return map[status] || 'identified';
}

function mapGHLStatus(status) {
  return { 'open': 'pursuing', 'won': 'realized', 'lost': 'lost', 'abandoned': 'expired' }[status] || 'identified';
}

function stageProbability(stage) {
  return { 'identified': 10, 'researching': 20, 'pursuing': 35, 'submitted': 50, 'negotiating': 65, 'approved': 90, 'realized': 100 }[stage] || 0;
}

let totalSynced = 0;

// 1. Grants
const { data: grants } = await supabase
  .from('grant_opportunities')
  .select('*')
  .gte('updated_at', since);

if (grants?.length) {
  const rows = grants.map(g => {
    const stage = mapGrantStatus(g.application_status);
    return {
      opportunity_type: 'grant', source_system: 'grant_opportunities', source_id: g.id,
      title: g.name, description: g.description, contact_name: g.provider,
      value_low: g.amount_min || 0, value_mid: g.amount_max ? Math.round((g.amount_min + g.amount_max) / 2) : g.amount_min || 0,
      value_high: g.amount_max || g.amount_min || 0, value_type: 'cash',
      stage, probability: stageProbability(stage),
      project_codes: g.aligned_projects || [], expected_close: g.deadline, url: g.url,
      metadata: { fit_score: g.fit_score, relevance_score: g.relevance_score, categories: g.categories, source: g.source },
      updated_at: new Date().toISOString(),
    };
  });

  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabase.from('opportunities_unified').upsert(chunk, { onConflict: 'source_system,source_id' });
    if (error) console.error(`  Grants chunk ${i}: ${error.message}`);
    else totalSynced += chunk.length;
  }
  console.log(`  Synced ${rows.length} grants`);
}

// 2. GHL
const { data: ghl } = await supabase
  .from('ghl_opportunities')
  .select('*')
  .gte('updated_at', since);

if (ghl?.length) {
  const rows = ghl.map(g => {
    const stage = mapGHLStatus(g.status);
    return {
      opportunity_type: 'deal', source_system: 'ghl_opportunities', source_id: g.id,
      title: g.name, value_low: Number(g.monetary_value || 0), value_mid: Number(g.monetary_value || 0),
      value_high: Number(g.monetary_value || 0), value_type: 'cash',
      stage, probability: stageProbability(stage),
      project_codes: g.project_code ? [g.project_code] : [], actual_close: g.received_date,
      metadata: { ghl_id: g.ghl_id, pipeline_name: g.pipeline_name, stage_name: g.stage_name },
      updated_at: new Date().toISOString(),
    };
  });

  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabase.from('opportunities_unified').upsert(chunk, { onConflict: 'source_system,source_id' });
    if (error) console.error(`  GHL chunk ${i}: ${error.message}`);
    else totalSynced += chunk.length;
  }
  console.log(`  Synced ${rows.length} GHL opportunities`);
}

// 3. Fundraising
const { data: fundraising } = await supabase
  .from('fundraising_pipeline')
  .select('*')
  .gte('updated_at', since);

if (fundraising?.length) {
  const rows = fundraising.map(f => {
    const stage = { 'identified': 'identified', 'researching': 'researching', 'approaching': 'pursuing', 'submitted': 'submitted', 'negotiating': 'negotiating', 'approved': 'approved', 'received': 'realized', 'declined': 'lost' }[f.status] || 'identified';
    return {
      opportunity_type: { 'grant': 'grant', 'donation': 'donation', 'investment': 'investment', 'sponsorship': 'donation', 'earned': 'earned_revenue' }[f.type] || 'donation',
      source_system: 'fundraising_pipeline', source_id: f.id,
      title: f.name, contact_name: f.funder,
      value_low: Number(f.amount || 0), value_mid: Number(f.amount || 0), value_high: Number(f.amount || 0),
      value_type: 'cash', stage, probability: f.probability ? Number(f.probability) : stageProbability(stage),
      project_codes: f.project_codes || [], expected_close: f.expected_date || f.deadline,
      actual_close: f.actual_date, notes: f.notes,
      updated_at: new Date().toISOString(),
    };
  });

  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabase.from('opportunities_unified').upsert(chunk, { onConflict: 'source_system,source_id' });
    if (error) console.error(`  Fundraising chunk ${i}: ${error.message}`);
    else totalSynced += chunk.length;
  }
  console.log(`  Synced ${rows.length} fundraising items`);
}

console.log(`Done. ${totalSynced} opportunities synced.`);

try {
  await recordSyncStatus(supabase, 'opportunities_unified', {
    status: totalSynced > 0 ? 'healthy' : 'warning',
    recordCount: totalSynced,
    error: totalSynced === 0 ? 'No updated opportunities found' : null,
  });
} catch (e) {
  console.warn('Could not record sync status:', e.message);
}
