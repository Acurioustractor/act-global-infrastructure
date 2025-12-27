#!/usr/bin/env node

/**
 * Add sprint metrics properties to existing Sprint Tracking database
 */

import fs from 'fs';

const TOKEN = process.env.NOTION_TOKEN;
const dbIds = JSON.parse(fs.readFileSync('./config/notion-database-ids.json', 'utf8'));
const DB_ID = dbIds.sprintTracking;
const API_VERSION = '2022-06-28';

if (!TOKEN) {
  console.error('❌ Error: NOTION_TOKEN environment variable not set');
  process.exit(1);
}

console.log('📊 Adding sprint metrics properties to Sprint Tracking database...\n');

// Add the metrics properties
const response = await fetch(`https://api.notion.com/v1/databases/${DB_ID}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': API_VERSION
  },
  body: JSON.stringify({
    properties: {
      'Total Issues': {
        number: { format: 'number' }
      },
      'Completed Issues': {
        number: { format: 'number' }
      },
      'In Progress': {
        number: { format: 'number' }
      },
      'Blocked': {
        number: { format: 'number' }
      },
      'Total Effort Points': {
        number: { format: 'number' }
      },
      'Completed Effort': {
        number: { format: 'number' }
      },
      // Note: Formulas can be added manually in Notion UI if needed:
      // Velocity = prop("Completed Effort") / prop("Duration (weeks)")
      // Completion % = round(prop("Completed Issues") / prop("Total Issues") * 100)
    }
  })
});

const data = await response.json();

if (!response.ok) {
  console.error('❌ Error:', data);
  process.exit(1);
}

console.log('✅ Successfully added 6 metrics properties:');
console.log('   - Total Issues (number)');
console.log('   - Completed Issues (number)');
console.log('   - In Progress (number)');
console.log('   - Blocked (number)');
console.log('   - Total Effort Points (number)');
console.log('   - Completed Effort (number)');
console.log('\n📝 Note: Velocity and Completion % formulas can be added manually in Notion UI');
console.log('\n📋 Database now has', Object.keys(data.properties).length, 'total properties');
console.log('\n✅ Ready for automation! Run: node scripts/sync-sprint-to-notion.mjs');
