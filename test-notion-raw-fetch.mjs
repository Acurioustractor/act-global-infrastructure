#!/usr/bin/env node

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const API_VERSION = '2022-06-28';

const SPRINT_DB_ID = '2d6ebcf9-81cf-815f-a30f-c7ade0c0046d';

if (!NOTION_TOKEN) {
  console.error('❌ Error: NOTION_TOKEN environment variable not set');
  console.error('   Example: NOTION_TOKEN=secret_... node test-notion-raw-fetch.mjs');
  process.exit(1);
}

console.log('🔍 Testing Notion API with Raw Fetch\n');
console.log(`Token: ${NOTION_TOKEN.substring(0, 20)}...`);
console.log(`Database: ${SPRINT_DB_ID}\n`);

async function testQuery() {
  try {
    console.log('Attempting to query database...');
    
    const response = await fetch(
      `https://api.notion.com/v1/databases/${SPRINT_DB_ID}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': API_VERSION
        },
        body: JSON.stringify({
          page_size: 1
        })
      }
    );

    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS! Token works with raw fetch');
      console.log(`   Found ${data.results?.length || 0} results`);
      if (data.results?.[0]) {
        console.log(`   First page ID: ${data.results[0].id}`);
      }
    } else {
      console.log('❌ FAILED');
      console.log(`   Error: ${data.message || JSON.stringify(data)}`);
      console.log(`   Code: ${data.code}`);
    }
    
    return response.ok;
  } catch (error) {
    console.log('❌ EXCEPTION');
    console.log(`   ${error.message}`);
    return false;
  }
}

async function testRetrieve() {
  try {
    console.log('\nAttempting to retrieve database metadata...');
    
    const response = await fetch(
      `https://api.notion.com/v1/databases/${SPRINT_DB_ID}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': API_VERSION
        }
      }
    );

    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS! Can retrieve database');
      console.log(`   Title: ${data.title?.[0]?.plain_text || '(no title)'}`);
      console.log(`   Properties: ${Object.keys(data.properties || {}).length}`);
    } else {
      console.log('❌ FAILED');
      console.log(`   Error: ${data.message || JSON.stringify(data)}`);
      console.log(`   Code: ${data.code}`);
    }
    
    return response.ok;
  } catch (error) {
    console.log('❌ EXCEPTION');
    console.log(`   ${error.message}`);
    return false;
  }
}

async function main() {
  const queryWorks = await testQuery();
  const retrieveWorks = await testRetrieve();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (queryWorks && retrieveWorks) {
    console.log('✅ Token works perfectly with raw fetch!');
    console.log('   The issue is with @notionhq/client SDK');
    console.log('   Solution: Use raw fetch instead of SDK');
  } else if (!queryWorks && !retrieveWorks) {
    console.log('❌ Token is invalid or expired');
    console.log('   Generate a new token at: https://www.notion.so/my-integrations');
  } else {
    console.log('⚠️  Partial success - token may need permissions');
  }
}

main();
