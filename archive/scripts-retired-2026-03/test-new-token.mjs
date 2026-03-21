#!/usr/bin/env node

const NOTION_TOKEN = process.env.NOTION_TOKEN || 'YOUR_TOKEN_HERE';
const API_VERSION = '2022-06-28';

// Test databases
const TEST_DBS = {
  'Sprint Tracking (Global)': '2d6ebcf9-81cf-815f-a30f-c7ade0c0046d',
  'ACT Projects (Global)': '2d6ebcf9-81cf-8141-95a0-f8688dbb7c02',
  'GitHub Issues': '2d5ebcf981cf80429f40ef7b39b39ca1',
  'Projects (Studio)': '177ebcf9-81cf-80dd-9514-f1ec32f3314c',
  'Parent Page': '2d6ebcf981cf806e8db2dc8ec5d0b414'
};

console.log('🔍 Testing New Notion Token\n');
console.log(`Token: ${NOTION_TOKEN.substring(0, 20)}...\n`);

async function testDatabase(name, id) {
  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': API_VERSION
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ ${name}`);
      console.log(`   Title: ${data.title?.[0]?.plain_text || '(no title)'}`);
      console.log(`   Properties: ${Object.keys(data.properties || {}).length}`);
      return true;
    } else {
      console.log(`❌ ${name}: ${data.code || 'error'}`);
      console.log(`   Message: ${data.message}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function testPageAccess(name, id) {
  try {
    const response = await fetch(
      `https://api.notion.com/v1/pages/${id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': API_VERSION
        }
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ ${name} (Page)`);
      console.log(`   Can access: Yes`);
      return true;
    } else {
      console.log(`❌ ${name} (Page): ${data.code || 'error'}`);
      console.log(`   Message: ${data.message}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function main() {
  let successCount = 0;
  const total = Object.keys(TEST_DBS).length;

  for (const [name, id] of Object.entries(TEST_DBS)) {
    if (name === 'Parent Page') {
      const success = await testPageAccess(name, id);
      if (success) successCount++;
    } else {
      const success = await testDatabase(name, id);
      if (success) successCount++;
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\nResults: ${successCount}/${total} accessible\n`);

  if (successCount === total) {
    console.log('🎉 PERFECT! Token has full access!');
    console.log('✅ Ready to create new databases');
  } else if (successCount > 0) {
    console.log('⚠️  Partial access - some databases/pages need connection');
    console.log('Share missing items with integration in Notion');
  } else {
    console.log('❌ No access - token may be invalid or integration not connected');
  }
}

main();
