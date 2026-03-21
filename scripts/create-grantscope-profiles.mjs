#!/usr/bin/env node

/**
 * Update GrantScope Org Profile for ACT
 *
 * Updates the existing ACT org_profile in GrantScope with enriched domains,
 * geographic focus, and project details covering all 7 core projects.
 * GrantScope uses 1 profile per user (unique constraint on user_id).
 *
 * After running this, run the GrantScope scout:
 *   cd /Users/benknight/Code/grantscope
 *   node scripts/scout-grants-for-profiles.mjs
 *
 * Usage:
 *   node scripts/create-grantscope-profiles.mjs
 *   node scripts/create-grantscope-profiles.mjs --dry-run
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DRY_RUN = process.argv.includes('--dry-run');

// GrantScope Supabase instance (separate from ACT)
const gsUrl = process.env.GRANTSCOPE_SUPABASE_URL;
const gsKey = process.env.GRANTSCOPE_SUPABASE_KEY;

if (!gsUrl || !gsKey) {
  console.error('Missing GRANTSCOPE_SUPABASE_URL or GRANTSCOPE_SUPABASE_KEY in .env.local');
  console.error('Add these from the GrantScope project .env file.');
  process.exit(1);
}

const gsSupabase = createClient(gsUrl, gsKey);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Load project codes
const projectCodesPath = join(__dirname, '..', 'config', 'project-codes.json');
const projectCodes = JSON.parse(readFileSync(projectCodesPath, 'utf-8'));

// The 7 core ACT projects with grant-relevant metadata
const CORE_PROJECTS = [
  {
    code: 'ACT-EL',
    domains: ['indigenous data sovereignty', 'community storytelling', 'digital ethics', 'social impact measurement', 'participatory research'],
    geographic: ['Queensland', 'Palm Island', 'Sunshine Coast'],
  },
  {
    code: 'ACT-JH',
    domains: ['youth justice', 'justice reinvestment', 'systems change', 'community advocacy', 'social policy'],
    geographic: ['Queensland', 'Northern Territory'],
  },
  {
    code: 'ACT-GD',
    domains: ['social enterprise', 'community assets', 'circular economy', 'sustainability', 'resource tracking'],
    geographic: ['Queensland'],
  },
  {
    code: 'ACT-HV',
    domains: ['regenerative agriculture', 'community hub', 'therapeutic horticulture', 'heritage preservation', 'food systems'],
    geographic: ['Sunshine Coast', 'Witta'],
  },
  {
    code: 'ACT-FM',
    domains: ['regenerative agriculture', 'land-based healing', 'creative practice', 'therapeutic landscapes'],
    geographic: ['Jinibara Country'],
  },
  {
    code: 'ACT-PI',
    domains: ['indigenous community development', 'cultural preservation', 'first nations', 'digital tools'],
    geographic: ['Palm Island', 'North Queensland'],
  },
  {
    code: 'ACT-CA',
    domains: ['art for social change', 'creative practice', 'community storytelling', 'wellbeing', 'cultural production'],
    geographic: ['Queensland'],
  },
];

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function main() {
  console.log('🌱 Updating GrantScope Org Profile for ACT\n');

  // Find existing ACT profile
  const { data: existing } = await gsSupabase
    .from('org_profiles')
    .select('id, user_id, name, domains, geographic_focus, projects')
    .ilike('name', '%Curious Tractor%')
    .limit(1);

  if (!existing?.length) {
    console.error('No existing ACT profile found in GrantScope.');
    process.exit(1);
  }

  const profile = existing[0];
  console.log(`Found profile: ${profile.name} (id: ${profile.id})`);
  console.log(`Current domains: ${(profile.domains || []).join(', ')}`);

  // Merge all domains (deduplicated)
  const allDomains = [...new Set(CORE_PROJECTS.flatMap(p => p.domains))];
  // Merge all geographic areas
  const allGeographic = [...new Set(['Queensland', 'Australia', ...CORE_PROJECTS.flatMap(p => p.geographic)])];

  // Build projects array with details from project-codes.json
  const projectsData = CORE_PROJECTS.map(proj => {
    const config = projectCodes.projects[proj.code] || {};
    return {
      code: proj.code,
      name: config.name || proj.code,
      description: config.description || '',
      category: config.category || '',
      tier: config.tier || '',
      leads: config.leads || [],
      domains: proj.domains,
    };
  });

  const name = 'A Curious Tractor';
  const description = 'Regenerative innovation ecosystem partnering with marginalised communities to transfer institutional power through Listen, Curiosity, Action, Art (LCAA).';
  const mission = `ACT (A Curious Tractor) is a dual-entity ecosystem: ACT Foundation (charitable CLG) and ACT Ventures (mission-locked trading). We partner WITH marginalised communities — especially First Nations communities — to transfer institutional power to community-led initiatives. Our 7 core projects span youth justice reform (JusticeHub), indigenous data sovereignty (Empathy Ledger), social enterprise (Goods), regenerative agriculture (The Harvest, The Farm), indigenous community development (PICC), and art for social change. Based on Jinibara Country, QLD. ABN 21 591 780 066.`;

  // Build embedding text
  const embeddingText = [
    name,
    mission,
    `Domains: ${allDomains.join(', ')}`,
    `Geographic focus: ${allGeographic.join(', ')}`,
    `Projects: ${projectsData.map(p => `${p.name} (${p.code}): ${p.description}`).join('; ')}`,
  ].join('\n');

  console.log(`\nUpdated domains (${allDomains.length}): ${allDomains.join(', ')}`);
  console.log(`Updated geographic (${allGeographic.length}): ${allGeographic.join(', ')}`);
  console.log(`Projects: ${projectsData.map(p => p.code).join(', ')}`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would update profile with above data');
    return;
  }

  // Generate new embedding
  console.log('\nGenerating embedding...');
  const embedding = await generateEmbedding(embeddingText);

  const { error } = await gsSupabase
    .from('org_profiles')
    .update({
      name,
      description,
      mission,
      abn: '21 591 780 066',
      website: 'https://act.place',
      domains: allDomains,
      geographic_focus: allGeographic,
      org_type: 'charity',
      projects: projectsData,
      embedding,
      embedding_text: embeddingText,
      notify_email: true,
      notify_threshold: 0.65,
    })
    .eq('id', profile.id);

  if (error) {
    console.error(`❌ Update failed: ${error.message}`);
    process.exit(1);
  }

  console.log(`\n✅ Updated profile (id: ${profile.id})`);

  // Verify
  const { data: updated } = await gsSupabase
    .from('org_profiles')
    .select('id, name, domains, geographic_focus, projects, notify_threshold')
    .eq('id', profile.id)
    .single();

  console.log(`\n📊 Verified profile:`);
  console.log(`   Name: ${updated.name}`);
  console.log(`   Domains: ${(updated.domains || []).length}`);
  console.log(`   Geographic: ${(updated.geographic_focus || []).length}`);
  console.log(`   Projects: ${Array.isArray(updated.projects) ? updated.projects.length : 'object'}`);
  console.log(`   Notify threshold: ${updated.notify_threshold}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
