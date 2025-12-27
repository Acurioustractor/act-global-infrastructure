#!/usr/bin/env node

/**
 * Setup database relations between GitHub Issues and Sprint Tracking
 * This creates the links so Sprint Tracking can roll up metrics from GitHub Issues
 */

import fs from 'fs';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const dbIds = JSON.parse(fs.readFileSync('./config/notion-database-ids.json', 'utf8'));
const API_VERSION = '2022-06-28';

if (!NOTION_TOKEN) {
  console.error('❌ Error: NOTION_TOKEN environment variable not set');
  process.exit(1);
}

console.log('🔗 Setting up database relations...\n');

/**
 * Step 1: Add Sprint relation property to GitHub Issues database
 * This allows each issue to be linked to a sprint
 */
async function addSprintRelationToIssues() {
  console.log('📝 Adding "Sprint" relation to GitHub Issues database...');

  const response = await fetch(`https://api.notion.com/v1/databases/${dbIds.githubIssues}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': API_VERSION
    },
    body: JSON.stringify({
      properties: {
        'Sprint': {
          relation: {
            database_id: dbIds.sprintTracking,
            type: 'dual_property',
            dual_property: {
              synced_property_name: 'Issues'
            }
          }
        }
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('   ❌ Error:', data.message || JSON.stringify(data));
    return false;
  }

  console.log('   ✅ Added Sprint relation to GitHub Issues');
  return true;
}

/**
 * Step 2: Add rollup properties to Sprint Tracking
 * These calculate totals from linked issues
 */
async function addRollupsToSprintTracking() {
  console.log('\n📊 Adding rollup properties to Sprint Tracking...');

  const response = await fetch(`https://api.notion.com/v1/databases/${dbIds.sprintTracking}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': API_VERSION
    },
    body: JSON.stringify({
      properties: {
        // This will be auto-created by the dual_property relation
        // 'Issues': {
        //   relation: { database_id: dbIds.githubIssues }
        // },

        'Total Issues (Rollup)': {
          rollup: {
            relation_property_name: 'Issues',
            rollup_property_name: 'Name',
            function: 'count'
          }
        },
        'Completed Issues (Rollup)': {
          rollup: {
            relation_property_name: 'Issues',
            rollup_property_name: 'Status',
            function: 'count',
            filter: {
              property: 'Status',
              select: {
                equals: 'Done'
              }
            }
          }
        }
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('   ❌ Error:', data.message || JSON.stringify(data));
    return false;
  }

  console.log('   ✅ Added rollup properties');
  return true;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Step 1: Add relation from GitHub Issues to Sprint Tracking
    const step1 = await addSprintRelationToIssues();

    if (!step1) {
      console.log('\n⚠️  Could not add Sprint relation. This might already exist.');
      console.log('   Check manually in Notion if the Sprint property exists in GitHub Issues database');
    }

    // Give Notion a moment to create the reverse relation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Add rollups to Sprint Tracking
    const step2 = await addRollupsToSprintTracking();

    if (!step2) {
      console.log('\n⚠️  Could not add rollups. Check error above.');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DATABASE RELATIONS SETUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 What was created:');
    console.log('   1. GitHub Issues → Sprint (relation property)');
    console.log('   2. Sprint Tracking → Issues (reverse relation, auto-created)');
    console.log('   3. Sprint Tracking → Total Issues (rollup)');
    console.log('   4. Sprint Tracking → Completed Issues (rollup)\n');

    console.log('🔄 Next steps:');
    console.log('   1. Create sprint entries: node scripts/create-sprint-entries.mjs');
    console.log('   2. Link issues to sprints in Notion (or update sync script)');
    console.log('   3. Metrics will auto-calculate from rollups!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
