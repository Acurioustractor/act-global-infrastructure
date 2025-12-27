#!/usr/bin/env node

/**
 * Add test data to all Notion databases
 */

import fs from 'fs';

const TOKEN = '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';
const API_VERSION = '2022-06-28';
const dbIds = JSON.parse(fs.readFileSync('./config/notion-database-ids.json', 'utf8'));

async function createPage(databaseId, properties) {
  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': API_VERSION
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to create page: ${data.message}`);
  }
  return data;
}

console.log('📝 Adding test data to Notion databases...\n');

// 1. Add Sprint 4 to Sprint Tracking
console.log('📊 Adding Sprint 4...');
await createPage(dbIds.sprintTracking, {
  'Sprint Name': {
    title: [{ text: { content: 'Sprint 4' } }]
  },
  'Sprint Number': { number: 4 },
  'Status': { select: { name: 'Active' } },
  'Start Date': { date: { start: '2025-12-20' } },
  'End Date': { date: { start: '2026-01-03' } },
  'Goal': {
    rich_text: [{ text: { content: 'Complete foundation features for Empathy Ledger, JusticeHub, and The Harvest' } }]
  },
  'Projects': {
    multi_select: [
      { name: 'Empathy Ledger' },
      { name: 'JusticeHub' },
      { name: 'The Harvest' }
    ]
  }
});
console.log('   ✅ Sprint 4 added\n');

// 2. Add 6 Strategic Pillars
console.log('🎨 Adding Strategic Pillars...');

const pillars = [
  {
    name: 'Ethical Storytelling',
    description: 'Consent-first narratives with OCAP® principles',
    mission: 'Give community members full agency over their stories',
    phase: 'Action',
    impact: 'Transformative'
  },
  {
    name: 'Justice Reimagined',
    description: 'Community-designed program models for youth justice',
    mission: 'Replace punitive systems with community-led alternatives',
    phase: 'Action',
    impact: 'Transformative'
  },
  {
    name: 'Community Resilience',
    description: 'Therapeutic horticulture and heritage preservation',
    mission: 'Build food sovereignty and cultural connection through community gardens',
    phase: 'Action',
    impact: 'Significant'
  },
  {
    name: 'Circular Economy & Community-Designed Goods',
    description: 'Waste-to-wealth manufacturing with community ownership',
    mission: 'Transform waste into community-owned assets',
    phase: 'Curiosity',
    impact: 'Emerging'
  },
  {
    name: 'Regeneration at Scale',
    description: '150-acre conservation-first regeneration estate',
    mission: 'Prove regenerative agriculture at commercial scale',
    phase: 'Action',
    impact: 'Significant'
  },
  {
    name: 'Art of Social Impact',
    description: 'All ACT projects, contracted work, free programs, art support',
    mission: 'Revolution through creativity - installations, residencies, community art',
    phase: 'Art',
    impact: 'Transformative'
  }
];

for (const pillar of pillars) {
  await createPage(dbIds.strategicPillars, {
    'Pillar Name': {
      title: [{ text: { content: pillar.name } }]
    },
    'Description': {
      rich_text: [{ text: { content: pillar.description } }]
    },
    'Mission Statement': {
      rich_text: [{ text: { content: pillar.mission } }]
    },
    'LCAA Phase': { select: { name: pillar.phase } },
    'Community Impact': { select: { name: pillar.impact } }
  });
  console.log(`   ✅ ${pillar.name}`);
}
console.log('');

// 3. Add 7 ACT Projects
console.log('🏗️ Adding ACT Projects...');

const projects = [
  {
    name: 'ACT Farm and Regenerative Innovation Studio',
    description: 'Multi-project orchestrator and operations hub',
    stack: ['Next.js', 'Supabase', 'Tailwind', 'TypeScript'],
    language: 'TypeScript',
    github: 'https://github.com/Acurioustractor/act-regenerative-studio',
    production: 'https://act-studio.vercel.app',
    status: 'Active Development',
    health: 'Healthy'
  },
  {
    name: 'Empathy Ledger',
    description: 'Ethical storytelling platform with consent-first narratives',
    stack: ['Next.js', 'Supabase', 'Tailwind', 'TypeScript'],
    language: 'TypeScript',
    github: 'https://github.com/Acurioustractor/empathy-ledger-v2',
    production: 'https://empathy-ledger.vercel.app',
    status: 'Active Development',
    health: 'Healthy'
  },
  {
    name: 'JusticeHub',
    description: 'Youth justice and community-designed program models',
    stack: ['Next.js', 'Supabase', 'Tailwind', 'TypeScript'],
    language: 'TypeScript',
    github: 'https://github.com/Acurioustractor/justicehub-platform',
    production: 'https://justicehub.vercel.app',
    status: 'Active Development',
    health: 'Healthy'
  },
  {
    name: 'The Harvest',
    description: 'Community hub with therapeutic horticulture and heritage preservation',
    stack: ['Next.js', 'Supabase', 'Tailwind'],
    language: 'TypeScript',
    github: 'https://github.com/Acurioustractor/harvest-community-hub',
    production: 'https://harvest-community.vercel.app',
    status: 'Active Development',
    health: 'Healthy'
  },
  {
    name: 'Goods Asset Register',
    description: 'Circular economy and community-designed asset management',
    stack: ['Next.js', 'Supabase', 'Tailwind'],
    language: 'TypeScript',
    github: 'https://github.com/Acurioustractor/goods-asset-tracker',
    production: 'https://goods-tracker.vercel.app',
    status: 'Active Development',
    health: 'Healthy'
  },
  {
    name: 'Black Cockatoo Valley / ACT Farm',
    description: '150-acre conservation-first regeneration estate',
    stack: ['Next.js', 'Supabase', 'Tailwind'],
    language: 'TypeScript',
    github: 'https://github.com/Acurioustractor/act-farm',
    production: 'https://act-farm.vercel.app',
    status: 'Active Development',
    health: 'Healthy'
  },
  {
    name: 'ACT Placemat',
    description: 'Backend services, shared infrastructure, and cross-project support',
    stack: ['Next.js', 'Supabase', 'Tailwind'],
    language: 'TypeScript',
    github: 'https://github.com/Acurioustractor/act-intelligence-platform',
    production: 'https://act-placemat.vercel.app',
    status: 'Active Development',
    health: 'Healthy'
  }
];

for (const project of projects) {
  await createPage(dbIds.actProjects, {
    'Project Name': {
      title: [{ text: { content: project.name } }]
    },
    'Description': {
      rich_text: [{ text: { content: project.description } }]
    },
    'Tech Stack': {
      multi_select: project.stack.map(name => ({ name }))
    },
    'Primary Language': { select: { name: project.language } },
    'GitHub Repo': { url: project.github },
    'Production URL': { url: project.production },
    'Status': { select: { name: project.status } },
    'Health Status': { select: { name: project.health } }
  });
  console.log(`   ✅ ${project.name}`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ TEST DATA ADDED SUCCESSFULLY!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📊 Added:');
console.log('   - 1 Sprint (Sprint 4)');
console.log('   - 6 Strategic Pillars');
console.log('   - 7 ACT Projects');
console.log('\n📋 Next: Check Notion to see the test data!');
