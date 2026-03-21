#!/usr/bin/env node

import { Client } from '@notionhq/client';

const NOTION_TOKEN = process.env.NOTION_TOKEN || 'YOUR_TOKEN_HERE';
const notion = new Client({ auth: NOTION_TOKEN });

const databases = {
  'Yearly Goals': '2d8ebcf9-81cf-81e4-ae48-e1aab5d0138b',
  '6-Month Phases': '2d8ebcf9-81cf-81fe-bdfb-f2f2309fe50f',
  'Moon Cycles': '2d8ebcf9-81cf-8176-ada6-c7f3a2f8dd2a',
  'Daily Work Log': '2d8ebcf9-81cf-81ce-9cd4-cc20e30e18fa',
  'Subscription Tracking': '2d8ebcf9-81cf-811c-a325-f38a354d9750'
};

for (const [name, id] of Object.entries(databases)) {
  try {
    const db = await notion.databases.retrieve({ database_id: id });
    console.log(`\n${name}:`);

    if (db.properties) {
      console.log(`  Properties (${Object.keys(db.properties).length}):`);
      Object.keys(db.properties).forEach(prop => {
        const propType = db.properties[prop].type;
        console.log(`    - ${prop} (${propType})`);
      });
    } else {
      console.log(`  ❌ No properties found`);
      console.log(JSON.stringify(db, null, 2));
    }
  } catch (error) {
    console.log(`\n${name}: ❌ ERROR`);
    console.log(`  ${error.message}`);
  }
}
