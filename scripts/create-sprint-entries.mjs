#!/usr/bin/env node

/**
 * Automatically create sprint entries in Notion Sprint Tracking database
 * This is a one-time setup to create the sprint pages that the automation will update
 */

import '../lib/load-env.mjs';
import fs from 'fs';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const dbIds = JSON.parse(fs.readFileSync('./config/notion-database-ids.json', 'utf8'));
const API_VERSION = '2022-06-28';

if (!NOTION_TOKEN) {
  console.error('❌ Error: NOTION_TOKEN environment variable not set');
  process.exit(1);
}

console.log('🚀 Creating sprint entries in Notion...\n');

const sprints = [
  {
    name: 'Backlog',
    number: 0,
    status: 'Active',
    startDate: null,
    endDate: null,
    goal: 'Issues not yet assigned to a sprint'
  },
  {
    name: 'Sprint 1',
    number: 1,
    status: 'Completed',
    startDate: '2025-11-25',
    endDate: '2025-12-06',
    goal: 'Initial setup and infrastructure',
    projects: []
  },
  {
    name: 'Sprint 2',
    number: 2,
    status: 'Active',
    startDate: '2025-12-09',
    endDate: '2025-12-20',
    goal: 'Integration platform and real data connections',
    projects: ['ACT Farm']
  },
  {
    name: 'Sprint 4',
    number: 4,
    status: 'Completed',
    startDate: '2025-12-20',
    endDate: '2026-01-03',
    goal: 'Complete foundation features for Empathy Ledger, JusticeHub, and The Harvest',
    projects: ['Empathy Ledger', 'JusticeHub', 'The Harvest']
  },
  {
    name: 'Sprint 5',
    number: 5,
    status: 'Planning',
    startDate: '2026-01-06',
    endDate: '2026-01-17',
    goal: 'TBD - Planning in progress',
    projects: []
  }
];

async function createSprintEntry(sprint) {
  const properties = {
    'Sprint Name': {
      title: [{ text: { content: sprint.name } }]
    },
    'Sprint Number': {
      number: sprint.number
    },
    'Status': {
      select: { name: sprint.status }
    },
    'Goal': {
      rich_text: [{ text: { content: sprint.goal } }]
    }
  };

  // Add dates if provided
  if (sprint.startDate) {
    properties['Start Date'] = { date: { start: sprint.startDate } };
  }
  if (sprint.endDate) {
    properties['End Date'] = { date: { start: sprint.endDate } };
  }

  // Add projects if provided
  if (sprint.projects && sprint.projects.length > 0) {
    properties['Projects'] = {
      multi_select: sprint.projects.map(name => ({ name }))
    };
  }

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': API_VERSION
    },
    body: JSON.stringify({
      parent: { database_id: dbIds.sprintTracking },
      properties
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to create ${sprint.name}: ${data.message}`);
  }

  return data;
}

// Check if sprints already exist
async function checkExistingSprints() {
  const response = await fetch(
    `https://api.notion.com/v1/databases/${dbIds.sprintTracking}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': API_VERSION
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error('Error checking existing sprints:', data);
    return [];
  }

  const existingNames = (data.results || []).map(
    page => page.properties['Sprint Name']?.title[0]?.text?.content
  ).filter(Boolean);

  return existingNames;
}

// Main execution
try {
  console.log('📋 Checking for existing sprints...');
  const existing = await checkExistingSprints();
  console.log(`   Found ${existing.length} existing sprint(s): ${existing.join(', ') || 'none'}\n`);

  for (const sprint of sprints) {
    if (existing.includes(sprint.name)) {
      console.log(`⏭️  Skipping "${sprint.name}" - already exists`);
      continue;
    }

    console.log(`📝 Creating "${sprint.name}"...`);
    await createSprintEntry(sprint);
    console.log(`   ✅ Created ${sprint.name}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SPRINT ENTRIES CREATED!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 View in Notion:');
  console.log('   https://www.notion.so/2d6ebcf981cf815fa30fc7ade0c0046d\n');
  console.log('🔄 Run sprint sync to populate metrics:');
  console.log('   GITHUB_TOKEN=$(gh auth token) node scripts/sync-sprint-to-notion.mjs');
  console.log('   OR trigger GitHub Action: gh workflow run sync-sprint-metrics.yml\n');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
