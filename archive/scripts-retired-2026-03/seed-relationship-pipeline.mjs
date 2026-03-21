#!/usr/bin/env node
/**
 * Seed the relationship_pipeline table from existing data sources:
 * - saved_grants (from GrantScope)
 * - saved_foundations (from GrantScope)
 * - opportunities_unified
 * - xero_invoices (top receivable contacts as businesses)
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const DRY_RUN = process.argv.includes('--dry-run');

// Stage mapping from various sources to unified stages
const GRANT_STAGE_MAP = {
  discovered: 'cold',
  researching: 'warm',
  pursuing: 'engaged',
  submitted: 'engaged',
  negotiating: 'active',
  approved: 'active',
  realized: 'partner',
  expired: 'dormant',
  lost: 'lost',
};

const FOUNDATION_STAGE_MAP = {
  identified: 'cold',
  researching: 'warm',
  prospect: 'warm',
  connected: 'engaged',
  active_relationship: 'partner',
  lapsed: 'dormant',
};

async function seedFromGrants() {
  console.log('\n--- Seeding from saved_grants ---');
  const { data: grants, error } = await supabase
    .from('saved_grants')
    .select(`
      *,
      grant:grant_opportunities(id, name, provider, amount_min, amount_max, closes_at, aligned_projects)
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching saved_grants:', error.message);
    return [];
  }

  const rows = [];
  for (const sg of grants || []) {
    if (!sg.grant) continue;
    rows.push({
      entity_type: 'grant',
      entity_id: sg.grant_id,
      entity_name: sg.grant.name,
      stage: GRANT_STAGE_MAP[sg.stage] || 'cold',
      love_score: 0,
      money_score: scoreFromAmount(sg.grant.amount_max),
      strategic_score: sg.stars || 0,
      urgency_score: sg.grant.closes_at ? scoreFromDeadline(sg.grant.closes_at) : 0,
      color: sg.color || null,
      notes: sg.notes || null,
      value_low: sg.grant.amount_min || null,
      value_high: sg.grant.amount_max || null,
      subtitle: sg.grant.provider || null,
      project_codes: sg.grant.aligned_projects || [],
      last_contact_date: sg.updated_at ? sg.updated_at.split('T')[0] : null,
    });
  }

  console.log(`  Found ${rows.length} saved grants`);
  return rows;
}

async function seedFromFoundations() {
  console.log('\n--- Seeding from saved_foundations ---');
  const { data: foundations, error } = await supabase
    .from('saved_foundations')
    .select(`
      *,
      foundation:foundations(id, name, website, total_giving_annual)
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching saved_foundations:', error.message);
    return [];
  }

  const rows = [];
  for (const sf of foundations || []) {
    if (!sf.foundation) continue;
    rows.push({
      entity_type: 'foundation',
      entity_id: sf.foundation_id,
      entity_name: sf.foundation.name,
      stage: FOUNDATION_STAGE_MAP[sf.stage] || 'cold',
      love_score: Math.min(5, Math.round((sf.alignment_score || 0) / 20)),
      money_score: scoreFromAmount(sf.foundation.total_giving_annual),
      strategic_score: 0,
      urgency_score: 0,
      color: null,
      notes: sf.notes || null,
      value_high: sf.foundation.total_giving_annual || null,
      subtitle: sf.foundation.website || null,
      project_codes: [],
    });
  }

  console.log(`  Found ${rows.length} saved foundations`);
  return rows;
}

async function seedFromOpportunities() {
  console.log('\n--- Seeding from opportunities_unified ---');
  const { data: opps, error } = await supabase
    .from('opportunities_unified')
    .select('id, title, source_system, source_id, stage, opportunity_type, probability, value_low, value_high, expected_close, notes, contact_name, project_codes, updated_at')
    .not('source_system', 'eq', 'grantscope')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching opportunities_unified:', error.message);
    return [];
  }

  const rows = [];
  for (const o of opps || []) {
    rows.push({
      entity_type: 'opportunity',
      entity_id: o.id,
      entity_name: o.title,
      stage: mapOppStage(o.stage),
      love_score: 0,
      money_score: scoreFromAmount(o.value_high || o.value_low),
      strategic_score: Math.min(5, Math.round((o.probability || 0) / 20)),
      urgency_score: o.expected_close ? scoreFromDeadline(o.expected_close) : 0,
      color: null,
      notes: o.notes || null,
      value_low: o.value_low || null,
      value_high: o.value_high || null,
      subtitle: o.contact_name || o.opportunity_type || null,
      project_codes: o.project_codes || [],
      last_contact_date: o.updated_at ? o.updated_at.split('T')[0] : null,
    });
  }

  console.log(`  Found ${rows.length} opportunities (non-grant)`);
  return rows;
}

async function seedFromXeroReceivables() {
  console.log('\n--- Seeding from Xero receivables ---');
  // Get top receivable contacts by total value
  const { data: invoices, error } = await supabase
    .from('xero_invoices')
    .select('contact_name, contact_id, amount_due, total, type, status, due_date')
    .eq('type', 'ACCREC')
    .in('status', ['AUTHORISED', 'SENT', 'SUBMITTED']);

  if (error) {
    console.error('Error fetching xero_invoices:', error.message);
    return [];
  }

  // Group by contact
  const contactTotals = new Map();
  for (const inv of invoices || []) {
    if (!inv.contact_name) continue;
    const existing = contactTotals.get(inv.contact_name) || {
      contact_id: inv.contact_id,
      total: 0,
      due: 0,
      count: 0,
      earliest_due: null,
    };
    existing.total += inv.total || 0;
    existing.due += inv.amount_due || 0;
    existing.count++;
    if (inv.due_date && (!existing.earliest_due || inv.due_date < existing.earliest_due)) {
      existing.earliest_due = inv.due_date;
    }
    contactTotals.set(inv.contact_name, existing);
  }

  const rows = [];
  for (const [name, info] of contactTotals) {
    if (info.total < 1000) continue; // Skip small contacts
    const isOverdue = info.earliest_due && new Date(info.earliest_due) < new Date();
    rows.push({
      entity_type: 'business',
      entity_id: info.contact_id || `xero-${name.toLowerCase().replace(/\s+/g, '-')}`,
      entity_name: name,
      stage: info.due > 0 ? 'active' : 'partner',
      love_score: 0,
      money_score: scoreFromAmount(info.total),
      strategic_score: 0,
      urgency_score: isOverdue ? 4 : info.due > 0 ? 2 : 0,
      color: null,
      notes: `${info.count} invoice(s), $${Math.round(info.total).toLocaleString()} total, $${Math.round(info.due).toLocaleString()} due`,
      value_low: null,
      value_high: info.total,
      subtitle: `${info.count} invoices`,
      project_codes: [],
      last_contact_date: null,
    });
  }

  console.log(`  Found ${rows.length} business contacts (>$1K receivables)`);
  return rows;
}

// --- Helpers ---

function scoreFromAmount(amount) {
  if (!amount) return 0;
  if (amount >= 500000) return 5;
  if (amount >= 100000) return 4;
  if (amount >= 50000) return 3;
  if (amount >= 10000) return 2;
  return 1;
}

function scoreFromDeadline(deadline) {
  const days = Math.ceil((new Date(deadline) - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 5; // Overdue
  if (days <= 7) return 4;
  if (days <= 30) return 3;
  if (days <= 90) return 2;
  return 1;
}

function mapOppStage(stage) {
  if (!stage) return 'cold';
  const s = stage.toLowerCase();
  if (['lead', 'identified', 'discovered'].includes(s)) return 'cold';
  if (['prospect', 'researching', 'qualified'].includes(s)) return 'warm';
  if (['pursuing', 'submitted', 'proposal', 'connected'].includes(s)) return 'engaged';
  if (['negotiating', 'approved', 'active', 'contracted'].includes(s)) return 'active';
  if (['realized', 'won', 'partner'].includes(s)) return 'partner';
  if (['dormant', 'paused', 'expired'].includes(s)) return 'dormant';
  if (['lost', 'declined'].includes(s)) return 'lost';
  return 'cold';
}

// --- Main ---

async function main() {
  console.log('Seeding relationship_pipeline...');
  if (DRY_RUN) console.log('(DRY RUN — no writes)\n');

  const allRows = [
    ...(await seedFromGrants()),
    ...(await seedFromFoundations()),
    ...(await seedFromOpportunities()),
    ...(await seedFromXeroReceivables()),
  ];

  console.log(`\nTotal rows to seed: ${allRows.length}`);

  if (DRY_RUN) {
    console.log('\nSample rows:');
    for (const row of allRows.slice(0, 5)) {
      console.log(`  [${row.entity_type}] ${row.entity_name} — ${row.stage} (💛${row.love_score} 💰${row.money_score} ⭐${row.strategic_score} 🔥${row.urgency_score})`);
    }
    console.log('\nDry run complete. Run without --dry-run to insert.');
    return;
  }

  // Upsert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < allRows.length; i += batchSize) {
    const batch = allRows.slice(i, i + batchSize);
    const { error } = await supabase
      .from('relationship_pipeline')
      .upsert(batch, { onConflict: 'entity_type,entity_id' });

    if (error) {
      console.error(`  Batch ${i / batchSize + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\nDone! Inserted/updated: ${inserted}, Errors: ${errors}`);
}

main().catch(console.error);
