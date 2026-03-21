#!/usr/bin/env node

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

if (!NOTION_TOKEN || !PARENT_PAGE_ID) {
  console.error('❌ Error: NOTION_TOKEN and NOTION_PARENT_PAGE_ID environment variables must be set');
  process.exit(1);
}

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
