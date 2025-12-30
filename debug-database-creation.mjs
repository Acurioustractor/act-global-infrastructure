#!/usr/bin/env node

/**
 * Debug Database Creation - Find Why Properties Aren't Created
 */

const NOTION_TOKEN = process.env.NOTION_TOKEN || 'YOUR_TOKEN_HERE';
const PARENT_PAGE_ID = '2d6ebcf981cf806e8db2dc8ec5d0b414';
const API_VERSION = '2022-06-28';

console.log('🔍 Debugging Notion Database Creation\n');

// Test 1: Check what the working Sprint Tracking database looks like
console.log('Step 1: Inspect WORKING database (Sprint Tracking)...\n');

const sprintTrackingId = '2d6ebcf981cf815fa30fc7ade0c0046d';

const workingDb = await fetch(
  `https://api.notion.com/v1/databases/${sprintTrackingId}`,
  {
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': API_VERSION
    }
  }
);

const workingData = await workingDb.json();

console.log('Working Database Response:');
console.log(`  Has properties field: ${!!workingData.properties}`);
console.log(`  Number of properties: ${Object.keys(workingData.properties || {}).length}`);
console.log(`  Sample properties:`, Object.keys(workingData.properties || {}).slice(0, 3));
console.log('');

// Test 2: Create a minimal test database
console.log('Step 2: Create MINIMAL test database (just title)...\n');

const minimalSchema = {
  parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
  title: [{ type: 'text', text: { content: 'Test Minimal DB' } }],
  properties: {
    'Name': { title: {} }
  }
};

console.log('Sending minimal schema:');
console.log(JSON.stringify(minimalSchema, null, 2));
console.log('');

const minimalResponse = await fetch('https://api.notion.com/v1/databases', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': API_VERSION
  },
  body: JSON.stringify(minimalSchema)
});

const minimalData = await minimalResponse.json();

console.log('Minimal Database Response:');
console.log(`  Status: ${minimalResponse.status}`);
console.log(`  Has properties field: ${!!minimalData.properties}`);
if (minimalData.properties) {
  console.log(`  Properties:`, Object.keys(minimalData.properties));
} else {
  console.log(`  No properties field in response!`);
  console.log(`  Full response keys:`, Object.keys(minimalData));
}
console.log('');

// Test 3: Immediately retrieve the created database
if (minimalResponse.ok && minimalData.id) {
  console.log('Step 3: Retrieve the database we just created...\n');
  
  const retrieveResponse = await fetch(
    `https://api.notion.com/v1/databases/${minimalData.id}`,
    {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': API_VERSION
      }
    }
  );
  
  const retrievedData = await retrieveResponse.json();
  
  console.log('Retrieved Database:');
  console.log(`  Has properties field: ${!!retrievedData.properties}`);
  if (retrievedData.properties) {
    console.log(`  Properties:`, Object.keys(retrievedData.properties));
  } else {
    console.log(`  Still no properties!`);
    console.log(`  Response structure:`, Object.keys(retrievedData));
  }
  console.log('');
}

// Test 4: Compare API versions
console.log('Step 4: Try with LATEST API version...\n');

const latestSchema = {
  parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
  title: [{ type: 'text', text: { content: 'Test Latest API' } }],
  properties: {
    'Name': { title: {} },
    'Status': {
      select: {
        options: [
          { name: 'Active', color: 'green' }
        ]
      }
    }
  }
};

const latestResponse = await fetch('https://api.notion.com/v1/databases', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28'  // This is current stable
  },
  body: JSON.stringify(latestSchema)
});

const latestData = await latestResponse.json();

console.log('Latest API Version Response:');
console.log(`  Status: ${latestResponse.status}`);
console.log(`  Has properties: ${!!latestData.properties}`);
if (latestData.properties) {
  console.log(`  Properties:`, Object.keys(latestData.properties));
  console.log('  ✅ PROPERTIES CREATED!');
} else {
  console.log('  ❌ Still no properties');
}
console.log('');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\nDiagnosis:\n');

if (!workingData.properties) {
  console.log('❌ Even the WORKING database shows no properties!');
  console.log('   This means the API response format changed or token lacks read permissions');
} else if (!minimalData.properties && !latestData.properties) {
  console.log('❌ Created databases have no properties');
  console.log('   BUT working database DOES have properties');
  console.log('   This suggests a creation permission issue');
} else if (latestData.properties) {
  console.log('✅ Latest API version WORKS!');
  console.log('   Properties are being created successfully');
}

