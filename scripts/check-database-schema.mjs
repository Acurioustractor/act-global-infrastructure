import './lib/load-env.mjs';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const GITHUB_ISSUES_DB = '2d5ebcf9-81cf-8042-9f40-ef7b39b39ca1';

console.log('📊 Checking GitHub Issues Database Schema...\n');

const response = await fetch(
  `https://api.notion.com/v1/databases/${GITHUB_ISSUES_DB}`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28'
    }
  }
);

const data = await response.json();

if (data.properties) {
  console.log('Properties in database:\n');
  Object.entries(data.properties).forEach(([name, prop]) => {
    console.log(`  • ${name}: ${prop.type}`);
    if (prop.type === 'select' && prop.select?.options) {
      console.log(`    Options: ${prop.select.options.map(o => o.name).join(', ')}`);
    }
  });
} else {
  console.log('Error:', data.message || JSON.stringify(data));
}
