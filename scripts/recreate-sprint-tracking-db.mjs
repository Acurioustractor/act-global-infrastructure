#!/usr/bin/env node

/**
 * Recreate Sprint Tracking database in Notion
 * The original database was deleted or never created
 */

import '../lib/load-env.mjs';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = '2d6ebcf9-81cf-806e-8db2-dc8ec5d0b414'; // ACT Development Databases page
const API_VERSION = '2022-06-28';

console.log('📝 Creating Sprint Tracking database in Notion...\n');

const response = await fetch('https://api.notion.com/v1/databases', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': API_VERSION
  },
  body: JSON.stringify({
    parent: { page_id: PARENT_PAGE_ID },
    title: [{ text: { content: 'Sprint Tracking' } }],
    properties: {
      'Sprint Name': { title: {} },
      'Sprint Number': { number: { format: 'number' } },
      'Status': {
        select: {
          options: [
            { name: 'Planning', color: 'gray' },
            { name: 'Active', color: 'blue' },
            { name: 'Completed', color: 'green' }
          ]
        }
      },
      'Start Date': { date: {} },
      'End Date': { date: {} },
      'Goal': { rich_text: {} },
      'Total Issues': { number: { format: 'number' } },
      'Done': { number: { format: 'number' } },
      'In Progress': { number: { format: 'number' } },
      'Todo': { number: { format: 'number' } },
      'Blocked': { number: { format: 'number' } },
      'Effort Points': { number: { format: 'number' } },
      'Completion %': { number: { format: 'percent' } }
    }
  })
});

const data = await response.json();

if (!response.ok) {
  console.error('❌ Error:', data);
  process.exit(1);
}

console.log('✅ Sprint Tracking database created!');
console.log(`   ID: ${data.id}`);
console.log(`   URL: https://notion.so/${data.id.replace(/-/g, '')}`);
console.log('');
console.log('📝 Now update config/notion-database-ids.json:');
console.log(`   "sprintTracking": "${data.id}"`);
console.log('');
console.log('🔄 Then run: node scripts/create-sprint-entries.mjs');
