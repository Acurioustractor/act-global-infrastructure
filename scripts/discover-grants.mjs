#!/usr/bin/env npx tsx

/**
 * Grant Discovery Orchestrator
 *
 * Daily cron job that:
 * 1. Discovers grants via GrantScope engine (GrantConnect, web search, LLM knowledge)
 * 2. Deduplicates against existing grant_opportunities
 * 3. Scores new grants against all 26 ACT projects
 * 4. Upserts to database with scores
 * 5. Sends Telegram alert for high-fit grants (>70%)
 * 6. Auto-creates applications for high-fit grants
 *
 * Usage:
 *   node scripts/discover-grants.mjs              # Full discovery
 *   node scripts/discover-grants.mjs --dry-run    # Preview only
 *   node scripts/discover-grants.mjs --score-only # Re-score existing unscored grants
 *   node scripts/discover-grants.mjs --sources grantconnect,web-search  # Specific sources
 */

import { createClient } from '@supabase/supabase-js';
import { loadProjects } from './lib/project-loader.mjs';
import { scoreGrantBatch } from './lib/grant-scorer.mjs';
import { GrantEngine } from '../packages/grant-engine/src/index.ts';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SCORE_ONLY = args.includes('--score-only');
const sourcesArg = args.find(a => a.startsWith('--sources'));
const sourcesIdx = args.indexOf('--sources');
const SOURCES = sourcesIdx >= 0 && args[sourcesIdx + 1]
  ? args[sourcesIdx + 1].split(',')
  : undefined;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TELEGRAM ALERTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function sendTelegramAlert(grants) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;

  for (const g of grants.slice(0, 5)) {
    const projects = g.alignedProjects.slice(0, 3).join(', ');
    const amount = g.grant.amountMax
      ? `$${(g.grant.amountMax / 1000).toFixed(0)}K`
      : 'Amount TBC';
    const deadline = g.grant.closesAt || 'No deadline';
    const daysLeft = g.grant.closesAt
      ? Math.ceil((new Date(g.grant.closesAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    const message = [
      `🦅 *ALTA Grant Alert*`,
      `📋 ${g.grant.name} by ${g.grant.provider}`,
      `💰 ${amount} · Closes ${deadline}${daysLeft ? ` (${daysLeft} days)` : ''}`,
      `🎯 ${g.fitScore}% fit for ${projects}`,
      g.grant.url ? `🔗 ${g.grant.url}` : '',
    ].filter(Boolean).join('\n');

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      });
    } catch (err) {
      console.error('Telegram alert failed:', err.message);
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCORE EXISTING UNSCORED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function scoreExistingUnscored(projects) {
  const { data: unscored } = await supabase
    .from('grant_opportunities')
    .select('*')
    .is('relevance_score', null);

  if (!unscored || unscored.length === 0) {
    console.log('No unscored grants found.');
    return 0;
  }

  console.log(`Found ${unscored.length} unscored grants. Scoring...`);

  const normalized = unscored.map(g => ({
    name: g.name,
    provider: g.provider,
    program: g.program,
    amountMin: g.amount_min,
    amountMax: g.amount_max,
    closesAt: g.closes_at,
    url: g.url,
    description: g.fit_notes || g.notes || '',
    categories: g.categories || [],
  }));

  const scored = await scoreGrantBatch(normalized, projects);
  let updated = 0;

  for (const sg of scored) {
    if (sg.fitScore === 0 && sg.fitNotes === 'Scoring failed') continue;

    const original = unscored.find(u => u.name === sg.grant.name);
    if (!original) continue;

    const { error } = await supabase
      .from('grant_opportunities')
      .update({
        fit_score: sg.fitScore,
        relevance_score: sg.fitScore,
        eligibility_score: sg.eligibilityScore || undefined,
        aligned_projects: sg.alignedProjects,
        categories: sg.categories.length > 0 ? sg.categories : undefined,
      })
      .eq('id', original.id);

    if (!error) {
      updated++;
      console.log(`  ✓ Scored: ${sg.grant.name} → ${sg.fitScore}%`);
    }
  }

  return updated;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTO-PIPELINE: Create applications for high-fit grants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function autoPipeline(scoredGrants) {
  const eligible = scoredGrants.filter(sg => sg.fitScore >= 70);
  if (eligible.length === 0) return 0;

  let created = 0;

  for (const sg of eligible) {
    const { data: grant } = await supabase
      .from('grant_opportunities')
      .select('id, name, closes_at, aligned_projects, amount_max')
      .eq('name', sg.grant.name)
      .limit(1)
      .single();

    if (!grant) continue;

    const { data: existing } = await supabase
      .from('grant_applications')
      .select('id')
      .eq('opportunity_id', grant.id)
      .limit(1);

    if (existing && existing.length > 0) continue;

    const closesAt = grant.closes_at ? new Date(grant.closes_at) : null;
    const now = new Date();
    const daysUntil = closesAt ? Math.ceil((closesAt - now) / (1000 * 60 * 60 * 24)) : 90;
    const primaryProject = (grant.aligned_projects || [])[0] || null;

    const milestones = [];
    if (daysUntil > 14) {
      milestones.push({ name: 'Research grant requirements', completed: false, due: addDays(now, 3) });
      milestones.push({ name: 'Gather supporting documents', completed: false, due: addDays(now, Math.min(7, daysUntil - 7)) });
      milestones.push({ name: 'Draft application sections', completed: false, due: addDays(now, Math.min(14, daysUntil - 5)) });
      milestones.push({ name: 'Internal review', completed: false, due: addDays(now, Math.min(daysUntil - 3, daysUntil - 3)) });
      milestones.push({ name: 'Submit application', completed: false, due: closesAt ? addDays(closesAt, -1) : addDays(now, daysUntil - 1) });
    } else if (daysUntil > 3) {
      milestones.push({ name: 'Fast-track: gather docs + draft', completed: false, due: addDays(now, Math.ceil(daysUntil / 2)) });
      milestones.push({ name: 'Review and submit', completed: false, due: closesAt ? addDays(closesAt, -1) : addDays(now, daysUntil - 1) });
    }

    const priority = sg.fitScore >= 85 ? 'high' : sg.fitScore >= 70 ? 'medium' : 'low';
    const effort = (grant.amount_max || 0) >= 100000 ? 'large' : (grant.amount_max || 0) >= 25000 ? 'medium' : 'small';

    const { error } = await supabase
      .from('grant_applications')
      .insert({
        opportunity_id: grant.id,
        status: 'draft',
        project_code: primaryProject,
        lead_contact: 'Benjamin Knight',
        milestones,
        documents: [],
        auto_created: true,
        assigned_to: 'benjamin@act.place',
        priority,
        estimated_effort: effort,
      });

    if (!error) {
      created++;
      console.log(`  ✓ Auto-created application: ${grant.name} (${priority} priority, ${effort} effort)`);
    } else {
      console.error(`  ✗ Failed to create application for ${grant.name}: ${error.message}`);
    }
  }

  return created;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTO-REQUIREMENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function autoRequirements() {
  const { data: apps } = await supabase
    .from('grant_applications')
    .select('id, opportunity_id')
    .eq('auto_created', true);

  if (!apps || apps.length === 0) return 0;

  const { data: assets } = await supabase
    .from('grant_assets')
    .select('id, asset_type, name, category');

  if (!assets || assets.length === 0) return 0;

  const standardTypes = [
    'abn', 'nfp_status', 'constitution', 'insurance_public_liability',
    'annual_report', 'budget_template', 'capability_statement',
    'evaluation_framework', 'cv_benjamin',
  ];

  let linked = 0;

  for (const app of apps) {
    const { data: existingReqs } = await supabase
      .from('grant_application_requirements')
      .select('id')
      .eq('application_id', app.id)
      .limit(1);

    if (existingReqs && existingReqs.length > 0) continue;

    const requirements = standardTypes.map(assetType => {
      const asset = assets.find(a => a.asset_type === assetType);
      return {
        application_id: app.id,
        asset_id: asset?.id || null,
        requirement_name: asset?.name || assetType,
        asset_type: assetType,
        status: asset?.is_current ? 'ready' : 'needed',
      };
    }).filter(Boolean);

    if (requirements.length > 0) {
      const { error } = await supabase
        .from('grant_application_requirements')
        .insert(requirements);

      if (!error) {
        linked += requirements.length;
      }
    }
  }

  return linked;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  const startTime = Date.now();
  console.log('🦅 ALTA Grant Discovery (powered by GrantScope)\n');

  // Load projects for scoring
  const projects = await loadProjects();
  const projectCount = Object.keys(projects).length;
  console.log(`Loaded ${projectCount} projects for scoring.\n`);

  if (SCORE_ONLY) {
    const updated = await scoreExistingUnscored(projects);
    console.log(`\n✅ Scored ${updated} existing grants.`);
    return;
  }

  // Step 1: Discover using GrantScope engine
  console.log('Step 1: Discovering grants via GrantScope engine...');
  const engine = new GrantEngine({
    supabase,
    sources: SOURCES,
    dryRun: DRY_RUN,
  });

  const discoveryResult = await engine.discover({
    geography: ['AU'],
    categories: ['arts', 'indigenous', 'community', 'enterprise', 'justice', 'regenerative', 'health'],
  });

  console.log(`\nDiscovery: ${discoveryResult.grantsDiscovered} found, ${discoveryResult.grantsNew} new, ${discoveryResult.grantsUpdated} updated.\n`);

  // Step 2: Score new grants
  if (discoveryResult.grantsNew > 0 && !DRY_RUN) {
    console.log('Step 2: Scoring new grants against projects...');

    // Fetch newly inserted grants for scoring
    const { data: newGrants } = await supabase
      .from('grant_opportunities')
      .select('*')
      .is('fit_score', null)
      .order('created_at', { ascending: false })
      .limit(discoveryResult.grantsNew);

    if (newGrants && newGrants.length > 0) {
      const normalized = newGrants.map(g => ({
        name: g.name,
        provider: g.provider,
        program: g.program,
        amountMin: g.amount_min,
        amountMax: g.amount_max,
        closesAt: g.closes_at,
        url: g.url,
        description: g.fit_notes || g.notes || '',
        categories: g.categories || [],
      }));

      const scored = await scoreGrantBatch(normalized, projects);
      let scoredCount = 0;

      for (const sg of scored) {
        if (sg.fitScore === 0 && sg.fitNotes === 'Scoring failed') continue;

        const original = newGrants.find(u => u.name === sg.grant.name);
        if (!original) continue;

        const { error } = await supabase
          .from('grant_opportunities')
          .update({
            fit_score: sg.fitScore,
            relevance_score: sg.fitScore,
            eligibility_score: sg.eligibilityScore || undefined,
            aligned_projects: sg.alignedProjects,
            categories: sg.categories.length > 0 ? sg.categories : undefined,
          })
          .eq('id', original.id);

        if (!error) {
          scoredCount++;
          console.log(`  ✓ Scored: ${sg.grant.name} → ${sg.fitScore}%`);
        }
      }
      console.log(`  Scored ${scoredCount} grants.\n`);

      // Step 3: Auto-pipeline for high-fit grants
      const highFit = scored.filter(s => s.fitScore >= 70);
      if (highFit.length > 0) {
        console.log(`Step 3: Auto-pipeline for ${highFit.length} high-fit grants...`);
        const pipelined = await autoPipeline(scored);
        if (pipelined > 0) {
          console.log(`  Created ${pipelined} draft applications.\n`);
          console.log('Step 3b: Linking standard requirements...');
          const linked = await autoRequirements();
          console.log(`  Linked ${linked} requirements.\n`);
        }

        // Step 4: Telegram alerts
        console.log(`Step 4: Sending alerts for ${highFit.length} high-fit grants...`);
        await sendTelegramAlert(highFit);
      }
    }
  }

  // Also score existing unscored
  const updated = await scoreExistingUnscored(projects);
  if (updated > 0) console.log(`Also scored ${updated} existing grants.`);

  // Stats
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ ALTA Discovery Complete`);
  console.log(`   Sources: ${discoveryResult.sourcesUsed.join(', ')}`);
  console.log(`   Grants discovered: ${discoveryResult.grantsDiscovered}`);
  console.log(`   New grants: ${discoveryResult.grantsNew}`);
  console.log(`   Updated: ${discoveryResult.grantsUpdated}`);
  console.log(`   Errors: ${discoveryResult.errors.length}`);
  console.log(`   Run ID: ${discoveryResult.runId.slice(0, 8)}`);
  console.log(`   Time: ${elapsed}s`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
