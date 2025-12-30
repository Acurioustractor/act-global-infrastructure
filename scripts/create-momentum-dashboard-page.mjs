#!/usr/bin/env node

/**
 * ONE-TIME SETUP: Create dedicated Momentum Dashboard page
 * This creates a new page that the dashboard script will update
 */

import '../lib/load-env.mjs';
import fs from 'fs';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const API_VERSION = '2022-06-28';
const PARENT_PAGE_ID = '2d6ebcf9-81cf-806e-8db2-dc8ec5d0b414'; // ACT Development Databases page

// Create the dashboard page inside ACT Development Databases (as a dedicated child page)
const response = await fetch('https://api.notion.com/v1/pages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': API_VERSION
  },
  body: JSON.stringify({
    parent: { page_id: PARENT_PAGE_ID },
    icon: { emoji: '🚀' },
    properties: {
      title: {
        title: [{ text: { content: 'Developer Momentum Dashboard' } }]
      }
    },
    children: [{
      object: 'block',
      type: 'callout',
      callout: {
        icon: { emoji: '⚠️' },
        color: 'yellow_background',
        rich_text: [{
          text: {
            content: '🔄 This page is automatically updated by automation. Do not manually edit - changes will be overwritten.'
          }
        }]
      }
    }]
  })
});

const data = await response.json();

if (!response.ok) {
  console.error('❌ Error:', data);
  process.exit(1);
}

console.log('✅ Momentum Dashboard page created!\n');
console.log(`   Page ID: ${data.id}`);
console.log(`   URL: https://notion.so/${data.id.replace(/-/g, '')}\n`);

// Update config file
const configPath = './config/notion-database-ids.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.momentumDashboard = data.id;
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log('📝 Updated config/notion-database-ids.json\n');
console.log('🔒 IMPORTANT: This page is dedicated to automation');
console.log('   Do NOT add other content to it - it will be deleted on updates\n');
console.log('✅ Ready! Now the dashboard script will only update this specific page.');
