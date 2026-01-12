#!/usr/bin/env node

const NOTION_TOKEN = process.env.NOTION_TOKEN || 'YOUR_TOKEN_HERE';

const dbs = {
  'Yearly Goals': '2d8ebcf9-81cf-81e4-ae48-e1aab5d0138b',
  '6-Month Phases': '2d8ebcf9-81cf-81fe-bdfb-f2f2309fe50f',
  'Moon Cycles': '2d8ebcf9-81cf-8176-ada6-c7f3a2f8dd2a',
  'Daily Work Log': '2d8ebcf9-81cf-81ce-9cd4-cc20e30e18fa',
  'Subscription Tracking': '2d8ebcf9-81cf-811c-a325-f38a354d9750'
};

for (const [name, id] of Object.entries(dbs)) {
  const response = await fetch(`https://api.notion.com/v1/databases/${id}`, {
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28'
    }
  });

  const data = await response.json();
  console.log(`\n${name}:`);
  console.log(`  Has properties: ${!!data.properties}`);
  if (data.properties) {
    console.log(`  Properties (${Object.keys(data.properties).length}):`);
    Object.keys(data.properties).forEach(p => console.log(`    - ${p}`));
  } else {
    console.log(`  ❌ No properties!`);
  }
}
