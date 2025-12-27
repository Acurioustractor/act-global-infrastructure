#!/usr/bin/env node

const NOTION_TOKEN = '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';
const PARENT_PAGE_ID = '2d6ebcf981cf806e8db2dc8ec5d0b414';

const payload = {
  parent: {
    page_id: PARENT_PAGE_ID
  },
  title: [
    {
      text: {
        content: 'TEST RAW API'
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

console.log('Sending via raw fetch API...');
console.log(JSON.stringify(payload, null, 2));

const response = await fetch('https://api.notion.com/v1/databases', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28'
  },
  body: JSON.stringify(payload)
});

const data = await response.json();

if (response.ok) {
  console.log('\n✅ Success!');
  console.log('Database ID:', data.id);
  console.log('Properties:', Object.keys(data.properties || {}));
} else {
  console.error('\n❌ Error:');
  console.error(JSON.stringify(data, null, 2));
}
