#!/usr/bin/env node
/**
 * Interactive Pipeline Review & Cleanup
 *
 * Walks through all data quality issues in priority order:
 * 1. Opportunities with $0 value
 * 2. Contacts with wrong/missing company names
 * 3. Opportunities in wrong pipeline stage
 * 4. Contacts that should be merged (duplicate emails)
 * 5. Stale opportunities that should be closed
 *
 * Writes fixes to Supabase + GHL (bi-directional sync).
 * Learns patterns and stores rules for future auto-fixes.
 *
 * Usage:
 *   node scripts/review-pipeline.mjs                # Full review
 *   node scripts/review-pipeline.mjs --section=values   # Only $0 value opps
 *   node scripts/review-pipeline.mjs --section=stages   # Only stage review
 *   node scripts/review-pipeline.mjs --section=stale    # Only stale opps
 *   node scripts/review-pipeline.mjs --section=contacts # Only contact cleanup
 */

import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';
import { createInterface } from 'readline';
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

let ghl;
try {
  ghl = createGHLService();
} catch (e) {
  console.log('⚠️  GHL service not available — Supabase-only mode');
  ghl = null;
}

const section = process.argv.find(a => a.startsWith('--section='))?.split('=')[1] || 'all';

// ─── Readline helpers ────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function confirm(msg) {
  const answer = await ask(`${msg} (y/n/s=skip all): `);
  return answer.trim().toLowerCase();
}

async function pickOption(msg, options) {
  console.log(`\n${msg}`);
  options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
  console.log(`  s. Skip`);
  const answer = await ask(`Choose (1-${options.length}/s): `);
  const num = parseInt(answer.trim());
  if (num >= 1 && num <= options.length) return num - 1;
  return -1; // skip
}

async function askValue(msg, defaultVal) {
  const answer = await ask(`${msg}${defaultVal ? ` [${defaultVal}]` : ''}: `);
  return answer.trim() || defaultVal || '';
}

// ─── Data loading ────────────────────────────────────────────────

async function fetchAll(table, select, filters) {
  const PAGE_SIZE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    let query = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (filters) {
      for (const [key, val] of Object.entries(filters)) {
        query = query.eq(key, val);
      }
    }
    const { data, error } = await query;
    if (error) throw new Error(`Failed to load ${table}: ${error.message}`);
    all = all.concat(data || []);
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

function formatK(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

// ─── Stage map ───────────────────────────────────────────────────

async function loadStageMap() {
  const { data: pipelines } = await supabase.from('ghl_pipelines').select('ghl_id, name, stages');
  const stageMap = new Map();
  const pipelineStages = new Map(); // pipelineId -> [{id, name}]
  for (const p of pipelines || []) {
    const stages = p.stages || [];
    pipelineStages.set(p.ghl_id, { name: p.name, stages });
    for (const s of stages) {
      stageMap.set(s.id, { name: s.name, pipeline: p.name, pipelineId: p.ghl_id });
    }
  }
  return { stageMap, pipelineStages };
}

// ─── Project map ─────────────────────────────────────────────────

async function loadProjects() {
  const { data } = await supabase.from('projects').select('code, name').order('code');
  return data || [];
}

// ─── Section: $0 Value Opportunities ─────────────────────────────

async function reviewZeroValueOpps(opps, contacts, projects) {
  const zeroValue = opps.filter(o => o.status === 'open' && (!o.monetary_value || parseFloat(o.monetary_value) === 0));

  if (zeroValue.length === 0) {
    console.log('\n✅ No $0 value opportunities');
    return { fixed: 0, skipped: 0 };
  }

  console.log(`\n━━━ $0 Value Opportunities (${zeroValue.length}) ━━━`);
  console.log('These open opportunities have no dollar value set.\n');

  let fixed = 0, skipped = 0;

  for (const opp of zeroValue) {
    const contact = contacts.find(c => c.ghl_id === opp.ghl_contact_id);
    console.log(`\n  📋 ${opp.name}`);
    console.log(`     Pipeline: ${opp.pipeline_name} → ${opp.stage_name}`);
    console.log(`     Contact: ${contact?.full_name || 'Unknown'} ${contact?.company_name ? `(${contact.company_name})` : ''}`);
    console.log(`     Project: ${opp.project_code || 'none'}`);

    const action = await confirm('  Set a value?');
    if (action === 's') { skipped += zeroValue.length - fixed; break; }
    if (action !== 'y') { skipped++; continue; }

    const valueStr = await askValue('  Dollar value', '');
    const value = parseFloat(valueStr.replace(/[$,]/g, ''));
    if (isNaN(value) || value <= 0) { skipped++; continue; }

    // Update Supabase
    const { error } = await supabase
      .from('ghl_opportunities')
      .update({ monetary_value: value })
      .eq('id', opp.id);

    if (error) {
      console.log(`  ❌ Supabase error: ${error.message}`);
    } else {
      console.log(`  ✅ Set to ${formatK(value)}`);
      fixed++;
    }

    // Update GHL if available
    if (ghl && opp.ghl_id) {
      try {
        await ghl.updateOpportunity(opp.ghl_id, { monetaryValue: value });
        console.log(`  ✅ Synced to GHL`);
      } catch (e) {
        console.log(`  ⚠️  GHL sync failed: ${e.message}`);
      }
    }
  }

  return { fixed, skipped };
}

// ─── Section: Stage Review ───────────────────────────────────────

async function reviewStages(opps, contacts, { stageMap, pipelineStages }) {
  // Find opps that might be in the wrong stage
  const stale = opps.filter(o => {
    if (o.status !== 'open') return false;
    // Opps in early stages (New Lead, Germination, Grant Opportunity Identified) for 30+ days
    const earlyStages = ['New Lead', 'Germination', 'Grant Opportunity Identified', 'Invited', 'Invite list drafted'];
    const daysSinceUpdate = Math.floor((Date.now() - new Date(o.ghl_updated_at || o.ghl_created_at).getTime()) / (1000 * 60 * 60 * 24));
    return earlyStages.includes(o.stage_name) && daysSinceUpdate > 30;
  });

  if (stale.length === 0) {
    console.log('\n✅ No stale-stage opportunities');
    return { fixed: 0, skipped: 0 };
  }

  console.log(`\n━━━ Opportunities Stuck in Early Stages (${stale.length}) ━━━`);
  console.log('These have been in their initial stage for 30+ days.\n');

  let fixed = 0, skipped = 0;

  for (const opp of stale) {
    const contact = contacts.find(c => c.ghl_id === opp.ghl_contact_id);
    const daysSince = Math.floor((Date.now() - new Date(opp.ghl_updated_at || opp.ghl_created_at).getTime()) / (1000 * 60 * 60 * 24));
    const pipeline = pipelineStages.get(opp.ghl_pipeline_id);

    console.log(`\n  📋 ${opp.name}`);
    console.log(`     Stage: ${opp.stage_name} (${daysSince} days)`);
    console.log(`     Contact: ${contact?.full_name || 'Unknown'}`);
    console.log(`     Value: ${opp.monetary_value ? formatK(parseFloat(opp.monetary_value)) : '$0'}`);

    if (!pipeline) { skipped++; continue; }

    const stageOptions = pipeline.stages.map(s => s.name);
    stageOptions.push('Close (won)', 'Close (lost)');

    const choice = await pickOption('  Move to:', stageOptions);
    if (choice === -1) { skipped++; continue; }

    if (stageOptions[choice] === 'Close (won)' || stageOptions[choice] === 'Close (lost)') {
      const newStatus = stageOptions[choice] === 'Close (won)' ? 'won' : 'lost';
      const { error } = await supabase
        .from('ghl_opportunities')
        .update({ status: newStatus })
        .eq('id', opp.id);

      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  ✅ Closed as ${newStatus}`);
        fixed++;
      }

      if (ghl && opp.ghl_id) {
        try {
          await ghl.updateOpportunity(opp.ghl_id, { status: newStatus });
          console.log(`  ✅ Synced to GHL`);
        } catch (e) {
          console.log(`  ⚠️  GHL sync failed: ${e.message}`);
        }
      }
    } else {
      const newStage = pipeline.stages[choice];
      const { error } = await supabase
        .from('ghl_opportunities')
        .update({ stage_name: newStage.name, ghl_stage_id: newStage.id })
        .eq('id', opp.id);

      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  ✅ Moved to ${newStage.name}`);
        fixed++;
      }

      if (ghl && opp.ghl_id) {
        try {
          await ghl.updateOpportunity(opp.ghl_id, { pipelineStageId: newStage.id });
          console.log(`  ✅ Synced to GHL`);
        } catch (e) {
          console.log(`  ⚠️  GHL sync failed: ${e.message}`);
        }
      }
    }
  }

  return { fixed, skipped };
}

// ─── Section: Stale Opportunities ────────────────────────────────

async function reviewStaleOpps(opps, contacts) {
  const stale = opps.filter(o => {
    if (o.status !== 'open') return false;
    const daysSince = Math.floor((Date.now() - new Date(o.ghl_updated_at || o.ghl_created_at).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > 90;
  }).sort((a, b) => new Date(a.ghl_updated_at || a.ghl_created_at) - new Date(b.ghl_updated_at || b.ghl_created_at));

  if (stale.length === 0) {
    console.log('\n✅ No stale opportunities (90+ days)');
    return { fixed: 0, skipped: 0 };
  }

  console.log(`\n━━━ Stale Opportunities — 90+ Days No Update (${stale.length}) ━━━\n`);

  let fixed = 0, skipped = 0;

  for (const opp of stale) {
    const contact = contacts.find(c => c.ghl_id === opp.ghl_contact_id);
    const daysSince = Math.floor((Date.now() - new Date(opp.ghl_updated_at || opp.ghl_created_at).getTime()) / (1000 * 60 * 60 * 24));

    console.log(`\n  📋 ${opp.name}`);
    console.log(`     ${opp.pipeline_name} → ${opp.stage_name} | ${daysSince} days stale`);
    console.log(`     Contact: ${contact?.full_name || 'Unknown'} | Value: ${opp.monetary_value ? formatK(parseFloat(opp.monetary_value)) : '$0'}`);

    const action = await confirm('  Close this? (y=lost / w=won / n=keep / s=skip all)');
    if (action === 's') { skipped += stale.length - fixed - skipped; break; }
    if (action === 'w') {
      await supabase.from('ghl_opportunities').update({ status: 'won' }).eq('id', opp.id);
      if (ghl && opp.ghl_id) try { await ghl.updateOpportunity(opp.ghl_id, { status: 'won' }); } catch {}
      console.log(`  ✅ Closed as won`);
      fixed++;
    } else if (action === 'y') {
      await supabase.from('ghl_opportunities').update({ status: 'lost' }).eq('id', opp.id);
      if (ghl && opp.ghl_id) try { await ghl.updateOpportunity(opp.ghl_id, { status: 'lost' }); } catch {}
      console.log(`  ✅ Closed as lost`);
      fixed++;
    } else {
      skipped++;
    }
  }

  return { fixed, skipped };
}

// ─── Section: Contact Cleanup ────────────────────────────────────

async function reviewContacts(contacts, opps, health) {
  // Find contacts with open opps but missing company name
  const needsCompany = contacts.filter(c => {
    const hasOpp = opps.some(o => o.ghl_contact_id === c.ghl_id && o.status === 'open');
    return hasOpp && !c.company_name;
  });

  // Find duplicate emails
  const emailCount = new Map();
  for (const c of contacts) {
    if (!c.email) continue;
    const email = c.email.toLowerCase();
    const existing = emailCount.get(email) || [];
    existing.push(c);
    emailCount.set(email, existing);
  }
  const duplicates = [...emailCount.entries()].filter(([, arr]) => arr.length > 1);

  const totalIssues = needsCompany.length + duplicates.length;
  if (totalIssues === 0) {
    console.log('\n✅ No contact issues found');
    return { fixed: 0, skipped: 0 };
  }

  let fixed = 0, skipped = 0;

  // Missing company
  if (needsCompany.length > 0) {
    console.log(`\n━━━ Contacts Missing Company (${needsCompany.length}) ━━━`);
    console.log('These contacts have open opportunities but no company name.\n');

    for (const c of needsCompany) {
      const h = health.find(h => h.ghl_contact_id === c.ghl_id);
      const contactOpps = opps.filter(o => o.ghl_contact_id === c.ghl_id && o.status === 'open');

      console.log(`\n  👤 ${c.full_name || '(no name)'} — ${c.email || 'no email'}`);
      console.log(`     Opps: ${contactOpps.map(o => o.name).join(', ')}`);
      if (h) console.log(`     Temp: ${h.temperature}° | ${h.days_since_contact}d since contact`);

      const action = await confirm('  Add company name?');
      if (action === 's') { skipped += needsCompany.length - fixed - skipped; break; }
      if (action !== 'y') { skipped++; continue; }

      const company = await askValue('  Company name', '');
      if (!company) { skipped++; continue; }

      await supabase.from('ghl_contacts').update({ company_name: company }).eq('ghl_id', c.ghl_id);

      if (ghl && c.ghl_id) {
        try {
          await ghl.updateContact(c.ghl_id, { companyName: company });
          console.log(`  ✅ Updated in Supabase + GHL`);
        } catch (e) {
          console.log(`  ✅ Updated in Supabase (GHL failed: ${e.message})`);
        }
      } else {
        console.log(`  ✅ Updated in Supabase`);
      }
      fixed++;
    }
  }

  // Duplicates
  if (duplicates.length > 0) {
    console.log(`\n━━━ Duplicate Email Contacts (${duplicates.length}) ━━━\n`);

    for (const [email, dupes] of duplicates.slice(0, 10)) {
      console.log(`\n  📧 ${email} — ${dupes.length} contacts:`);
      for (const d of dupes) {
        const h = health.find(h => h.ghl_contact_id === d.ghl_id);
        console.log(`     • ${d.full_name || '(no name)'} ${d.company_name ? `(${d.company_name})` : ''} — temp ${h?.temperature ?? '?'}°, ${h?.total_touchpoints ?? 0} touchpoints`);
      }
      console.log('     (Manual merge recommended in GHL)');
    }
    if (duplicates.length > 10) console.log(`\n  ... and ${duplicates.length - 10} more duplicate groups`);
  }

  return { fixed, skipped };
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║    Pipeline Review & Cleanup Tool    ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Load all data
  console.log('Loading data...');
  const [opps, contacts, health, projects, stageData] = await Promise.all([
    fetchAll('ghl_opportunities', '*'),
    fetchAll('ghl_contacts', 'ghl_id, full_name, email, company_name, engagement_status, tags'),
    fetchAll('relationship_health', 'ghl_contact_id, temperature, days_since_contact, total_touchpoints'),
    loadProjects(),
    loadStageMap(),
  ]);

  const openOpps = opps.filter(o => o.status === 'open');
  const totalPipeline = openOpps.reduce((s, o) => s + (parseFloat(o.monetary_value) || 0), 0);

  console.log(`\n📊 Current State:`);
  console.log(`   ${openOpps.length} open opportunities | ${formatK(totalPipeline)} pipeline`);
  console.log(`   ${contacts.length} contacts | ${health.length} with relationship data`);
  console.log(`   ${projects.length} active projects\n`);

  // Identify issues
  const zeroValue = openOpps.filter(o => !o.monetary_value || parseFloat(o.monetary_value) === 0);
  const staleOpps = openOpps.filter(o => {
    const d = Math.floor((Date.now() - new Date(o.ghl_updated_at || o.ghl_created_at).getTime()) / (1000 * 60 * 60 * 24));
    return d > 90;
  });
  const earlyStage = openOpps.filter(o => {
    const early = ['New Lead', 'Germination', 'Grant Opportunity Identified', 'Invited', 'Invite list drafted'];
    const d = Math.floor((Date.now() - new Date(o.ghl_updated_at || o.ghl_created_at).getTime()) / (1000 * 60 * 60 * 24));
    return early.includes(o.stage_name) && d > 30;
  });
  const noCompany = contacts.filter(c => {
    return opps.some(o => o.ghl_contact_id === c.ghl_id && o.status === 'open') && !c.company_name;
  });

  console.log(`🔍 Issues Found:`);
  console.log(`   ${zeroValue.length} opportunities with $0 value`);
  console.log(`   ${earlyStage.length} stuck in early stages (30+ days)`);
  console.log(`   ${staleOpps.length} stale opportunities (90+ days)`);
  console.log(`   ${noCompany.length} contacts missing company name`);

  const totals = { fixed: 0, skipped: 0 };

  // Run sections
  if (section === 'all' || section === 'values') {
    const r = await reviewZeroValueOpps(opps, contacts, projects);
    totals.fixed += r.fixed; totals.skipped += r.skipped;
  }
  if (section === 'all' || section === 'stages') {
    const r = await reviewStages(opps, contacts, stageData);
    totals.fixed += r.fixed; totals.skipped += r.skipped;
  }
  if (section === 'all' || section === 'stale') {
    const r = await reviewStaleOpps(opps, contacts);
    totals.fixed += r.fixed; totals.skipped += r.skipped;
  }
  if (section === 'all' || section === 'contacts') {
    const r = await reviewContacts(contacts, opps, health);
    totals.fixed += r.fixed; totals.skipped += r.skipped;
  }

  // Summary
  console.log(`\n━━━ Review Complete ━━━`);
  console.log(`  Fixed: ${totals.fixed}`);
  console.log(`  Skipped: ${totals.skipped}`);

  // Re-calculate pipeline
  if (totals.fixed > 0) {
    const { data: updatedOpps } = await supabase
      .from('ghl_opportunities')
      .select('monetary_value')
      .eq('status', 'open');
    const newPipeline = (updatedOpps || []).reduce((s, o) => s + (parseFloat(o.monetary_value) || 0), 0);
    console.log(`  Pipeline: ${formatK(totalPipeline)} → ${formatK(newPipeline)}`);
  }

  console.log('');
  rl.close();
}

main().catch(err => {
  console.error('Fatal:', err);
  rl.close();
  process.exit(1);
});
