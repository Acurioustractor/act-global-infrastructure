#!/usr/bin/env node

/**
 * Check what properties were actually created in Notion databases
 */

import { Client } from '@notionhq/client';
import fs from 'fs';

const NOTION_TOKEN = process.env.NOTION_TOKEN || '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';
const notion = new Client({ auth: NOTION_TOKEN });

// Read the database IDs we just created
const dbIds = JSON.parse(fs.readFileSync('./config/notion-database-ids.json', 'utf8'));

async function checkDatabase(name, dbId) {
  console.log(`\n📊 Checking ${name}...`);
  console.log(`   ID: ${dbId}`);

  try {
    const db = await notion.databases.retrieve({ database_id: dbId });

    console.log(`   Properties found: ${Object.keys(db.properties).length}`);
    console.log(`   Property names:`);
    for (const [name, prop] of Object.entries(db.properties)) {
      console.log(`      - ${name} (${prop.type})`);
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 Checking Notion Databases...\n');

  await checkDatabase('Sprint Tracking', dbIds.sprintTracking);
  await checkDatabase('Strategic Pillars', dbIds.strategicPillars);
  await checkDatabase('ACT Projects', dbIds.actProjects);
  await checkDatabase('Deployments', dbIds.deployments);
  await checkDatabase('Velocity Metrics', dbIds.velocityMetrics);
  await checkDatabase('Weekly Reports', dbIds.weeklyReports);

  console.log('\n✅ Check complete\n');
}

main().catch(console.error);
