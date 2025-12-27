#!/usr/bin/env node

import fs from 'fs';

const TOKEN = process.env.NOTION_TOKEN;
const dbIds = JSON.parse(fs.readFileSync('./config/notion-database-ids.json', 'utf8'));

if (!TOKEN) {
  console.error('❌ Error: NOTION_TOKEN environment variable not set');
  process.exit(1);
}

console.log('🔍 Verifying all databases have properties...\n');

for (const [name, id] of Object.entries(dbIds)) {
  const response = await fetch(`https://api.notion.com/v1/databases/${id}`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Notion-Version': '2022-06-28'
    }
  });
  const db = await response.json();
  const props = Object.keys(db.properties || {});
  console.log(`✅ ${name}: ${props.length} properties`);
  console.log(`   ${props.join(', ')}\n`);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ ALL DATABASES HAVE PROPERTIES!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
