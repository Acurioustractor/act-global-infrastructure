#!/usr/bin/env node
/**
 * Seed top fresh ACT-fit grants into GHL Grants pipeline.
 *
 * Pulls the top N foundation-linked, future-deadline, ACT-relevant grants from
 * grant_opportunities (where ghl_opportunity_id IS NULL), creates GHL opps in
 * the Grants pipeline + Grant Opportunity Identified stage, then writes the
 * resulting ghl_id back to grant_opportunities so they're linked.
 *
 * Usage:
 *   node scripts/seed-ghl-grants.mjs                # default top 5
 *   node scripts/seed-ghl-grants.mjs --count 10
 *   node scripts/seed-ghl-grants.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const countArg = args.find(a => a.startsWith('--count'));
const COUNT = countArg ? parseInt(countArg.split(/[ =]/)[1], 10) : 5;

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GRANTS_PIPELINE_ID = 'scom3L0kNwA1W0zPIzMe';
const IDENTIFIED_STAGE_ID = '8124c61a-1175-461e-be5d-1fa64ef6dd65';

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;

const ghl = await import(join(__dirname, 'lib', 'ghl-api-service.mjs')).then(m => m.createGHLService());

async function fetchTopGrants(limit) {
  // Filter universities at DB level via foundations!inner join
  const { data, error } = await supabase
    .from('grant_opportunities')
    .select('id, name, amount_max, deadline, url, foundation_id, foundations!inner(name, has_dgr, thematic_focus)')
    .eq('pipeline_stage', 'discovered')
    .gte('amount_max', 50000)
    .lte('amount_max', 5000000)
    .gte('deadline', new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10))
    .lte('deadline', new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10))
    .is('ghl_opportunity_id', null)
    .not('name', 'ilike', 'ARC Centre%')
    .not('name', 'ilike', 'ARC Industrial%')
    .not('foundations.name', 'ilike', '%Universit%')
    .overlaps('foundations.thematic_focus', ['indigenous','community','arts','social_justice','social-justice','youth','employment','social-enterprise','poverty_reduction','capacity_building'])
    .order('amount_max', { ascending: false })
    .limit(limit * 4);
  if (error) throw error;
  // Dedupe by name prefix
  const seen = new Set();
  const result = [];
  for (const g of (data || [])) {
    if (!g.foundations) continue;
    const key = (g.name || '').toLowerCase().slice(0, 50);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(g);
    if (result.length >= limit) break;
  }
  return result;
}

async function ensureTriageContact() {
  // GHL requires contactId on opportunity create. Use a single triage contact for grants
  // sourced via GrantScope sweeps — owners can re-link to a real funder contact later.
  const upsert = await ghl.upsertContact({
    email: 'grantscope-triage@act.place',
    firstName: 'GrantScope',
    lastName: 'Triage',
    companyName: 'ACT — Foundation Research',
    tags: ['grantscope-source', 'auto-triage'],
  });
  return upsert.contact.id || upsert.contact._id;
}

async function main() {
  log('=== Seed GHL grants ===');
  if (DRY_RUN) log('DRY RUN');
  log(`Target count: ${COUNT}`);

  const grants = await fetchTopGrants(COUNT);
  log(`Found ${grants.length} grants to seed`);

  const contactId = DRY_RUN ? 'dry-run-contact' : await ensureTriageContact();
  if (!DRY_RUN) log(`Triage contact: ${contactId}`);

  let created = 0, errors = 0;
  for (const g of grants) {
    const name = `${g.name?.slice(0, 90) || 'unnamed'} — ${(g.foundations?.name || '').slice(0, 30)}`;
    log(`  ${fmt(g.amount_max).padEnd(12)} ${name.slice(0, 70)} (deadline ${g.deadline})`);
    if (DRY_RUN) continue;
    try {
      const opp = await ghl.createOpportunity({
        pipelineId: GRANTS_PIPELINE_ID,
        stageId: IDENTIFIED_STAGE_ID,
        name,
        monetaryValue: Number(g.amount_max || 0),
        status: 'open',
        contactId,
      });
      const ghlId = opp.id || opp._id;
      if (!ghlId) throw new Error('GHL response missing opportunity id');
      // Link back to grant_opportunities
      await supabase.from('grant_opportunities')
        .update({ ghl_opportunity_id: ghlId, pipeline_stage: 'researching' })
        .eq('id', g.id);
      log(`    → created GHL opp ${ghlId}, marked grant as researching`);
      created++;
    } catch (e) {
      log(`    ✗ ERROR: ${e.message}`);
      errors++;
    }
  }
  log(`Done: created ${created}, errors ${errors}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
