#!/usr/bin/env node
/**
 * Backfills project_code on untagged GHL opportunities.
 *
 * Strategy:
 *   1. Bot-scraped watchlist (contact = benjamin+test.* email) → project_code = 'WATCH'
 *      These are ARC/AHO/government grants pulled by a scraper, not actively pursued.
 *      Tagging them WATCH keeps them searchable but excludes from project pipeline value.
 *   2. Real-but-untagged opps in Goods/Empathy Ledger/Mukurtu pipelines → infer from pipeline + contact tags.
 *   3. Real-but-untagged Grants → keep untagged for human review (small count).
 *
 * Writes ONLY to Supabase ghl_opportunities — does NOT push back to GHL.
 *
 * Usage:
 *   node scripts/backfill-grant-project-codes.mjs           # dry-run (default)
 *   node scripts/backfill-grant-project-codes.mjs --apply
 *
 * Plan: act-communication-pipeline-2026-05-23-locked § GHL pipelines integration
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const apply = process.argv.includes('--apply');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// Tag heuristics per pipeline
const PIPELINE_DEFAULT_PROJECT = {
  'Goods — Buyer Pipeline': 'ACT-GD',
  'Goods — Demand Register': 'ACT-GD',
  'Empathy Ledger': 'ACT-EL',
  'Mukurtu Node Activation': 'ACT-MR',
};

// Tag-on-contact heuristics
const CONTACT_TAG_TO_PROJECT = [
  { tags: ['act-gd', 'goods', 'goods-funder', 'goods-supporter'], project: 'ACT-GD' },
  { tags: ['act-jh', 'justicehub'], project: 'ACT-JH' },
  { tags: ['act-hv', 'harvest'], project: 'ACT-HV' },
  { tags: ['act-el', 'empathy-ledger'], project: 'ACT-EL' },
  { tags: ['act-oo', 'oonchiumpa'], project: 'ACT-OO' },
  { tags: ['act-pi', 'picc', 'palm-island'], project: 'ACT-PI' },
];

function inferFromContact(contactTags) {
  if (!contactTags || contactTags.length === 0) return null;
  const lower = contactTags.map(t => (t || '').toLowerCase());
  for (const rule of CONTACT_TAG_TO_PROJECT) {
    if (rule.tags.some(t => lower.includes(t))) return rule.project;
  }
  return null;
}

async function main() {
  console.log(`🔧 Backfill grant project_codes — ${apply ? 'APPLY' : 'DRY-RUN'}\n`);

  // Pull untagged opps + their contacts
  const { data: opps, error } = await supabase
    .from('ghl_opportunities')
    .select('id, ghl_id, name, pipeline_name, monetary_value, ghl_contact_id, project_code')
    .or('project_code.is.null,project_code.eq.')
    .range(0, 9999);
  if (error) throw error;
  console.log(`✓ ${opps.length} untagged opportunities`);

  // Pull contact details (paginated)
  const contactIds = [...new Set(opps.map(o => o.ghl_contact_id).filter(Boolean))];
  const contactMap = new Map();
  for (let i = 0; i < contactIds.length; i += 500) {
    const batch = contactIds.slice(i, i + 500);
    const { data } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, email, tags')
      .in('ghl_id', batch);
    for (const c of (data || [])) contactMap.set(c.ghl_id, c);
  }
  console.log(`✓ Loaded ${contactMap.size} contacts`);

  // Decide a new project_code per opp
  const updates = []; // { id, ghl_id, name, current_pc, new_pc, reason }
  for (const o of opps) {
    const contact = contactMap.get(o.ghl_contact_id);
    let new_pc = null, reason = null;

    if (contact?.email?.startsWith('benjamin+test')) {
      new_pc = 'WATCH'; reason = 'bot-scraped watchlist';
    } else {
      const inferred = inferFromContact(contact?.tags);
      if (inferred) { new_pc = inferred; reason = `contact-tag→${inferred}`; }
      else if (PIPELINE_DEFAULT_PROJECT[o.pipeline_name]) {
        new_pc = PIPELINE_DEFAULT_PROJECT[o.pipeline_name];
        reason = `pipeline-default→${new_pc}`;
      }
    }
    if (new_pc) updates.push({ id: o.id, ghl_id: o.ghl_id, name: (o.name || '').slice(0, 60), pipeline: o.pipeline_name, new_pc, reason, value: o.monetary_value });
  }

  // Summarize
  const byNew = new Map();
  for (const u of updates) {
    if (!byNew.has(u.new_pc)) byNew.set(u.new_pc, { count: 0, value: 0, sample: [] });
    const b = byNew.get(u.new_pc);
    b.count++;
    b.value += Number(u.value || 0);
    if (b.sample.length < 3) b.sample.push(u);
  }
  console.log('\nProposed updates:');
  console.log('| Project | Opps | Value | Sample |');
  console.log('|---|---:|---:|---|');
  for (const [pc, b] of [...byNew.entries()].sort((a, b) => b[1].value - a[1].value)) {
    const sample = b.sample.map(s => `${s.pipeline}/${s.name}`).join(' · ');
    console.log(`| ${pc} | ${b.count} | $${b.value.toLocaleString()} | ${sample.slice(0, 80)} |`);
  }

  const untouched = opps.length - updates.length;
  console.log(`\n  Updates proposed: ${updates.length} (${opps.length - untouched - updates.length === 0 ? 'good' : ''})`);
  console.log(`  Left untouched:    ${untouched} (need human review)`);

  if (!apply) {
    console.log('\n[dry-run] No writes. Re-run with --apply to commit.');
    return;
  }

  // Apply in batches
  console.log('\nApplying updates...');
  let applied = 0, failed = 0;
  for (const u of updates) {
    const { error: upErr } = await supabase
      .from('ghl_opportunities')
      .update({ project_code: u.new_pc })
      .eq('id', u.id);
    if (upErr) { failed++; console.error(`  ✗ ${u.ghl_id}: ${upErr.message}`); }
    else applied++;
    if (applied % 50 === 0) console.log(`  ... ${applied}/${updates.length}`);
  }
  console.log(`\n✓ Applied ${applied}, failed ${failed}`);
  console.log(`⚠ Push-back to GHL itself not done — Supabase-only update. To sync back, dedicated session.`);
}

main().catch(e => { console.error('Backfill failed:', e); process.exit(1); });
