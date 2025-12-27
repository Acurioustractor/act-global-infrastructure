#!/usr/bin/env node

import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: '2022-06-28'
});

const PARENT_PAGE_ID = '2d6ebcf981cf806e8db2dc8ec5d0b414';

const payload = {
  parent: {
    page_id: PARENT_PAGE_ID
  },
  title: [
    {
      text: {
        content: 'TEST Properties Debug'
      }
    }
  ],
  properties: {
    'Name': {
      title: {}
    },
    'Status': {
      select: {}
    }
  }
};

console.log('Payload being sent:');
console.log(JSON.stringify(payload, null, 2));

try {
  const db = await notion.databases.create(payload);
  console.log('\nSuccess! Created:', db.id);
  console.log('Properties:', Object.keys(db.properties || {}));
} catch (error) {
  console.error('\nError:', error.message);
  console.error('Request ID:', error.request_id);
}
