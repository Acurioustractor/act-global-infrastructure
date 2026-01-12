#!/usr/bin/env node

import { Client } from '@notionhq/client';

const NOTION_TOKEN = process.env.NOTION_TOKEN;

// Test databases from your env
const TEST_DATABASES = {
  'Projects': '177ebcf9-81cf-80dd-9514-f1ec32f3314c',
  'Actions': '177ebcf9-81cf-8023-af6e-dff974284218',
  'People': '47bdc1c4-df99-4ddc-81c4-a0214c919d69',
  'Organizations': '948f3946-7d1c-42f2-bd7e-1317a755e67b'
};

if (!NOTION_TOKEN) {
  console.error('❌ Error: NOTION_TOKEN environment variable not set');
  console.error('   Example: NOTION_TOKEN=secret_... node test-notion-connection.mjs');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

console.log('🔍 Testing Notion API Connection\n');
console.log(`Token: ${NOTION_TOKEN.substring(0, 20)}...`);
console.log('');

async function testDatabase(name, id) {
  try {
    console.log(`Testing ${name} (${id})...`);
    
    const response = await notion.databases.retrieve({
      database_id: id
    });
    
    console.log(`✅ ${name}: Connected`);
    console.log(`   Title: ${response.title[0]?.plain_text || '(no title)'}`);
    console.log(`   Properties: ${Object.keys(response.properties).length}`);
    console.log('');
    
    return true;
  } catch (error) {
    console.log(`❌ ${name}: FAILED`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code}`);
    console.log('');
    
    return false;
  }
}

async function main() {
  let successCount = 0;
  
  for (const [name, id] of Object.entries(TEST_DATABASES)) {
    const success = await testDatabase(name, id);
    if (success) successCount++;
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Results: ${successCount}/${Object.keys(TEST_DATABASES).length} databases accessible`);
  
  if (successCount === 0) {
    console.log('\n❌ Token appears invalid or lacks permissions');
    console.log('\nTroubleshooting:');
    console.log('1. Check token is from correct workspace');
    console.log('2. Verify integration has access to these databases');
    console.log('3. Ensure databases are shared with integration');
  } else if (successCount < Object.keys(TEST_DATABASES).length) {
    console.log('\n⚠️  Token works but some databases inaccessible');
    console.log('Check database sharing settings in Notion');
  } else {
    console.log('\n✅ Token working perfectly!');
  }
}

main();
