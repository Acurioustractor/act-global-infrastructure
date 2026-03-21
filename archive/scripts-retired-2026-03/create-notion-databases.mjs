#!/usr/bin/env node

/**
 * ACT Ecosystem - Create Notion Databases
 *
 * This script creates all 7 Notion databases with the exact schema needed
 * for the ACT ecosystem development pipeline.
 *
 * Usage:
 *   NOTION_TOKEN=xxx NOTION_PARENT_PAGE_ID=xxx node create-notion-databases.mjs
 */

import { Client } from '@notionhq/client';

// Environment variables
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID || process.env.NOTION_DATABASE_ID;

if (!NOTION_TOKEN) {
  console.error('❌ Error: NOTION_TOKEN environment variable required');
  console.error('Get it from: https://www.notion.so/my-integrations');
  process.exit(1);
}

if (!PARENT_PAGE_ID) {
  console.error('❌ Error: NOTION_PARENT_PAGE_ID environment variable required');
  console.error('This is the page ID where databases will be created');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

console.log('🚀 Starting Notion database creation...');
console.log(`📄 Parent Page: ${PARENT_PAGE_ID}`);
console.log('');

// Store database IDs for linking
const dbIds = {};

/**
 * 1. Sprint Tracking Database
 */
async function createSprintTracking() {
  console.log('📊 Creating Sprint Tracking database...');

  try {
    const response = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: PARENT_PAGE_ID
      },
      title: [{ text: { content: 'Sprint Tracking' } }],
      icon: { emoji: '🎯' },
      properties: {
        'Sprint Name': { title: {} },
        'Sprint Number': { number: { format: 'number' } },
        'Status': {
          select: {
            options: [
              { name: 'Planning', color: 'gray' },
              { name: 'Active', color: 'blue' },
              { name: 'Completed', color: 'green' },
              { name: 'Archived', color: 'default' }
            ]
          }
        },
        'Start Date': { date: {} },
        'End Date': { date: {} },
        'Duration (weeks)': {
          formula: {
            expression: 'dateBetween(prop("End Date"), prop("Start Date"), "weeks")'
          }
        },
        'Goal': { rich_text: {} },
        'Projects': {
          multi_select: {
            options: [
              { name: 'ACT Farm Studio', color: 'blue' },
              { name: 'Empathy Ledger', color: 'purple' },
              { name: 'JusticeHub', color: 'pink' },
              { name: 'The Harvest', color: 'green' },
              { name: 'Goods', color: 'yellow' },
              { name: 'BCV/ACT Farm', color: 'orange' },
              { name: 'ACT Placemat', color: 'red' }
            ]
          }
        },
        'Retrospective': { rich_text: {} },
        'Wins': { rich_text: {} },
        'Challenges': { rich_text: {} },
        'Learnings': { rich_text: {} }
      }
    });

    dbIds.sprintTracking = response.id;
    console.log(`✅ Sprint Tracking created: ${response.id}`);
    console.log(`   URL: ${response.url}`);
    console.log('');

    // Add test entry
    await addSprintTestData(response.id);

    return response.id;
  } catch (error) {
    console.error('❌ Error creating Sprint Tracking:', error.message);
    throw error;
  }
}

async function addSprintTestData(dbId) {
  console.log('   Adding test data (Sprint 4)...');

  try {
    await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        'Sprint Name': { title: [{ text: { content: 'Sprint 4' } }] },
        'Sprint Number': { number: 4 },
        'Status': { select: { name: 'Active' } },
        'Start Date': { date: { start: '2025-12-20' } },
        'End Date': { date: { start: '2026-01-03' } },
        'Goal': { rich_text: [{ text: { content: 'Complete foundation features for Empathy Ledger, JusticeHub, and The Harvest' } }] },
        'Projects': {
          multi_select: [
            { name: 'Empathy Ledger' },
            { name: 'JusticeHub' },
            { name: 'The Harvest' }
          ]
        }
      }
    });

    console.log('   ✅ Test data added');
  } catch (error) {
    console.error('   ⚠️ Could not add test data:', error.message);
  }
}

/**
 * 2. Strategic Pillars Database
 */
async function createStrategicPillars() {
  console.log('🎨 Creating Strategic Pillars database...');

  try {
    const response = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: PARENT_PAGE_ID
      },
      title: [{ text: { content: 'Strategic Pillars' } }],
      icon: { emoji: '🎨' },
      properties: {
        'Pillar Name': { title: {} },
        'Description': { rich_text: {} },
        'Mission Statement': { rich_text: {} },
        'LCAA Phase': {
          select: {
            options: [
              { name: 'Listen', color: 'blue' },
              { name: 'Curiosity', color: 'purple' },
              { name: 'Action', color: 'green' },
              { name: 'Art', color: 'pink' }
            ]
          }
        },
        'Q1 Objective': { rich_text: {} },
        'Q1 Key Results': { rich_text: {} },
        'Community Impact': {
          select: {
            options: [
              { name: 'Transformative', color: 'green' },
              { name: 'Significant', color: 'blue' },
              { name: 'Moderate', color: 'yellow' },
              { name: 'Emerging', color: 'gray' }
            ]
          }
        },
        'Impact Stories': { rich_text: {} }
      }
    });

    dbIds.strategicPillars = response.id;
    console.log(`✅ Strategic Pillars created: ${response.id}`);
    console.log(`   URL: ${response.url}`);
    console.log('');

    // Add test entries
    await addPillarTestData(response.id);

    return response.id;
  } catch (error) {
    console.error('❌ Error creating Strategic Pillars:', error.message);
    throw error;
  }
}

async function addPillarTestData(dbId) {
  console.log('   Adding test data (6 pillars)...');

  const pillars = [
    {
      name: 'Ethical Storytelling',
      description: 'Consent-first narratives with OCAP principles',
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
    try {
      await notion.pages.create({
        parent: { database_id: dbId },
        properties: {
          'Pillar Name': { title: [{ text: { content: pillar.name } }] },
          'Description': { rich_text: [{ text: { content: pillar.description } }] },
          'Mission Statement': { rich_text: [{ text: { content: pillar.mission } }] },
          'LCAA Phase': { select: { name: pillar.phase } },
          'Community Impact': { select: { name: pillar.impact } }
        }
      });
      console.log(`   ✅ Added: ${pillar.name}`);
    } catch (error) {
      console.error(`   ⚠️ Could not add ${pillar.name}:`, error.message);
    }
  }
}

/**
 * 3. ACT Projects Database
 */
async function createACTProjects() {
  console.log('🏗️ Creating ACT Projects database...');

  try {
    const response = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: PARENT_PAGE_ID
      },
      title: [{ text: { content: 'ACT Projects' } }],
      icon: { emoji: '🏗️' },
      properties: {
        'Project Name': { title: {} },
        'Description': { rich_text: {} },
        'Tech Stack': {
          multi_select: {
            options: [
              { name: 'Next.js', color: 'blue' },
              { name: 'Supabase', color: 'green' },
              { name: 'Tailwind', color: 'pink' },
              { name: 'Vercel', color: 'default' },
              { name: 'TypeScript', color: 'purple' }
            ]
          }
        },
        'Primary Language': {
          select: {
            options: [
              { name: 'TypeScript', color: 'blue' },
              { name: 'JavaScript', color: 'yellow' },
              { name: 'Python', color: 'green' }
            ]
          }
        },
        'GitHub Repo': { url: {} },
        'Production URL': { url: {} },
        'Vercel Project': { url: {} },
        'Notion Doc': { url: {} },
        'Status': {
          select: {
            options: [
              { name: 'Active Development', color: 'blue' },
              { name: 'Maintenance', color: 'yellow' },
              { name: 'Beta', color: 'purple' },
              { name: 'Launched', color: 'green' },
              { name: 'Archived', color: 'gray' }
            ]
          }
        },
        'Current Version': { rich_text: {} },
        'Last Deployed': { date: {} },
        'Health Status': {
          select: {
            options: [
              { name: 'Healthy', color: 'green' },
              { name: 'Degraded', color: 'yellow' },
              { name: 'Down', color: 'red' },
              { name: 'Unknown', color: 'gray' }
            ]
          }
        },
        'Uptime %': { number: { format: 'percent' } },
        'Avg Response Time (ms)': { number: { format: 'number' } },
        'Team Members': { people: {} },
        'Primary Contact': { people: {} },
        'Users (monthly)': { number: { format: 'number' } },
        'Growth Rate': { number: { format: 'percent' } }
      }
    });

    dbIds.actProjects = response.id;
    console.log(`✅ ACT Projects created: ${response.id}`);
    console.log(`   URL: ${response.url}`);
    console.log('');

    // Add test entries
    await addProjectTestData(response.id);

    return response.id;
  } catch (error) {
    console.error('❌ Error creating ACT Projects:', error.message);
    throw error;
  }
}

async function addProjectTestData(dbId) {
  console.log('   Adding test data (7 projects)...');

  const projects = [
    {
      name: 'ACT Farm and Regenerative Innovation Studio',
      description: 'Multi-project orchestrator and operations hub',
      repo: 'https://github.com/Acurioustractor/act-regenerative-studio',
      url: 'https://act-studio.vercel.app'
    },
    {
      name: 'Empathy Ledger',
      description: 'Ethical storytelling platform with consent-first narratives',
      repo: 'https://github.com/Acurioustractor/empathy-ledger-v2',
      url: 'https://empathy-ledger.vercel.app'
    },
    {
      name: 'JusticeHub',
      description: 'Youth justice and community-designed program models',
      repo: 'https://github.com/Acurioustractor/justicehub-platform',
      url: 'https://justicehub.vercel.app'
    },
    {
      name: 'The Harvest',
      description: 'Community hub with therapeutic horticulture and heritage preservation',
      repo: 'https://github.com/Acurioustractor/harvest-community-hub',
      url: 'https://harvest-community.vercel.app'
    },
    {
      name: 'Goods Asset Register',
      description: 'Circular economy and community-designed asset management',
      repo: 'https://github.com/Acurioustractor/goods-asset-tracker',
      url: 'https://goods-tracker.vercel.app'
    },
    {
      name: 'Black Cockatoo Valley / ACT Farm',
      description: '150-acre conservation-first regeneration estate',
      repo: 'https://github.com/Acurioustractor/act-farm',
      url: 'https://act-farm.vercel.app'
    },
    {
      name: 'ACT Placemat',
      description: 'Backend services, shared infrastructure, and cross-project support',
      repo: 'https://github.com/Acurioustractor/act-intelligence-platform',
      url: 'https://act-placemat.vercel.app'
    }
  ];

  for (const project of projects) {
    try {
      await notion.pages.create({
        parent: { database_id: dbId },
        properties: {
          'Project Name': { title: [{ text: { content: project.name } }] },
          'Description': { rich_text: [{ text: { content: project.description } }] },
          'Tech Stack': {
            multi_select: [
              { name: 'Next.js' },
              { name: 'Supabase' },
              { name: 'Tailwind' },
              { name: 'Vercel' }
            ]
          },
          'Primary Language': { select: { name: 'TypeScript' } },
          'GitHub Repo': { url: project.repo },
          'Production URL': { url: project.url },
          'Status': { select: { name: 'Active Development' } },
          'Health Status': { select: { name: 'Healthy' } }
        }
      });
      console.log(`   ✅ Added: ${project.name}`);
    } catch (error) {
      console.error(`   ⚠️ Could not add ${project.name}:`, error.message);
    }
  }
}

/**
 * 4. Deployments Database
 */
async function createDeployments() {
  console.log('🚀 Creating Deployments database...');

  try {
    const response = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: PARENT_PAGE_ID
      },
      title: [{ text: { content: 'Deployments' } }],
      icon: { emoji: '🚀' },
      properties: {
        'Deployment': { title: {} },
        'Environment': {
          select: {
            options: [
              { name: 'Production', color: 'green' }
            ]
          }
        },
        'Version': { rich_text: {} },
        'Git SHA': { rich_text: {} },
        'Git Branch': { rich_text: {} },
        'Deployed At': { date: {} },
        'Deployed By': { people: {} },
        'Status': {
          select: {
            options: [
              { name: 'Success', color: 'green' },
              { name: 'Failed', color: 'red' },
              { name: 'In Progress', color: 'yellow' },
              { name: 'Rolled Back', color: 'orange' }
            ]
          }
        },
        'Duration (seconds)': { number: { format: 'number' } },
        'Deploy URL': { url: {} },
        'GitHub Commit URL': { url: {} },
        'Vercel URL': { url: {} },
        'Health Check': {
          select: {
            options: [
              { name: 'Healthy', color: 'green' },
              { name: 'Degraded', color: 'yellow' },
              { name: 'Down', color: 'red' },
              { name: 'Unknown', color: 'gray' }
            ]
          }
        },
        'Response Time (ms)': { number: { format: 'number' } },
        'Last Checked': { date: {} },
        'Changes': { rich_text: {} }
      }
    });

    dbIds.deployments = response.id;
    console.log(`✅ Deployments created: ${response.id}`);
    console.log(`   URL: ${response.url}`);
    console.log('');

    return response.id;
  } catch (error) {
    console.error('❌ Error creating Deployments:', error.message);
    throw error;
  }
}

/**
 * 5. Velocity Metrics Database
 */
async function createVelocityMetrics() {
  console.log('📈 Creating Velocity Metrics database...');

  try {
    const response = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: PARENT_PAGE_ID
      },
      title: [{ text: { content: 'Velocity Metrics' } }],
      icon: { emoji: '📈' },
      properties: {
        'Week Of': { title: {} },
        'Week Number': { number: { format: 'number' } },
        'Year': { number: { format: 'number' } },
        'Issues Completed': { number: { format: 'number' } },
        'Story Points Completed': { number: { format: 'number' } },
        'Team Size': { number: { format: 'number' } },
        'Team Capacity (hours)': { number: { format: 'number' } },
        'Points per Week': {
          formula: {
            expression: 'prop("Story Points Completed")'
          }
        },
        'Hours per Point': {
          formula: {
            expression: 'prop("Team Capacity (hours)") / prop("Story Points Completed")'
          }
        },
        'Utilization %': {
          formula: {
            expression: 'round(prop("Story Points Completed") / (prop("Team Capacity (hours)") / 2.5) * 100)'
          }
        },
        'vs Last Week': { number: { format: 'number' } },
        'Trend': {
          select: {
            options: [
              { name: 'Up', color: 'green' },
              { name: 'Steady', color: 'yellow' },
              { name: 'Down', color: 'red' }
            ]
          }
        },
        'Bugs Created': { number: { format: 'number' } },
        'Bugs Fixed': { number: { format: 'number' } },
        'Rework %': {
          formula: {
            expression: 'round(prop("Bugs Created") / prop("Issues Completed") * 100)'
          }
        },
        'Deployments': { number: { format: 'number' } },
        'Deploy Frequency': {
          formula: {
            expression: 'prop("Deployments") / 7'
          }
        }
      }
    });

    dbIds.velocityMetrics = response.id;
    console.log(`✅ Velocity Metrics created: ${response.id}`);
    console.log(`   URL: ${response.url}`);
    console.log('');

    return response.id;
  } catch (error) {
    console.error('❌ Error creating Velocity Metrics:', error.message);
    throw error;
  }
}

/**
 * 6. Weekly Reports Database
 */
async function createWeeklyReports() {
  console.log('📝 Creating Weekly Reports database...');

  try {
    const response = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: PARENT_PAGE_ID
      },
      title: [{ text: { content: 'Weekly Reports' } }],
      icon: { emoji: '📝' },
      properties: {
        'Week Ending': { title: {} },
        'Report Date': { date: {} },
        'Summary': { rich_text: {} },
        'Top Achievements': { rich_text: {} },
        'Deployments': { rich_text: {} },
        'Velocity': { rich_text: {} },
        'Next Week': { rich_text: {} },
        'Email HTML': { rich_text: {} },
        'Blog Draft': { rich_text: {} },
        'Social Snippets': { rich_text: {} },
        'Issues Completed': { number: { format: 'number' } },
        'Points Completed': { number: { format: 'number' } },
        'Deployments Count': { number: { format: 'number' } },
        'Sent': { checkbox: {} },
        'Sent To': {
          multi_select: {
            options: [
              { name: 'Team', color: 'blue' },
              { name: 'Co-Founders', color: 'purple' },
              { name: 'Community', color: 'green' },
              { name: 'Funders', color: 'yellow' }
            ]
          }
        },
        'Sent At': { date: {} }
      }
    });

    dbIds.weeklyReports = response.id;
    console.log(`✅ Weekly Reports created: ${response.id}`);
    console.log(`   URL: ${response.url}`);
    console.log('');

    return response.id;
  } catch (error) {
    console.error('❌ Error creating Weekly Reports:', error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Create all databases
    await createSprintTracking();
    await createStrategicPillars();
    await createACTProjects();
    await createDeployments();
    await createVelocityMetrics();
    await createWeeklyReports();

    // Save database IDs to file
    const fs = await import('fs');
    const configPath = new URL('../config/notion-database-ids.json', import.meta.url);
    fs.writeFileSync(
      configPath,
      JSON.stringify(dbIds, null, 2)
    );

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL DATABASES CREATED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📊 Database IDs saved to: config/notion-database-ids.json');
    console.log('');
    console.log('🔗 Database IDs:');
    console.log(`   Sprint Tracking:     ${dbIds.sprintTracking}`);
    console.log(`   Strategic Pillars:   ${dbIds.strategicPillars}`);
    console.log(`   ACT Projects:        ${dbIds.actProjects}`);
    console.log(`   Deployments:         ${dbIds.deployments}`);
    console.log(`   Velocity Metrics:    ${dbIds.velocityMetrics}`);
    console.log(`   Weekly Reports:      ${dbIds.weeklyReports}`);
    console.log('');
    console.log('📋 Next Steps:');
    console.log('   1. Review databases in Notion');
    console.log('   2. Link databases with relations (manually or via script)');
    console.log('   3. Test formulas and rollups');
    console.log('   4. Build sync scripts');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Error during database creation:', error);
    console.error('');
    process.exit(1);
  }
}

main();
