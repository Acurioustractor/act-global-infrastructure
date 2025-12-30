import './lib/load-env.mjs';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const GITHUB_ISSUES_DB = '2d5ebcf9-81cf-8042-9f40-ef7b39b39ca1';

console.log('📊 Checking GitHub Issues Notion Database...\n');

const response = await fetch(
  `https://api.notion.com/v1/databases/${GITHUB_ISSUES_DB}/query`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      page_size: 1
    })
  }
);

const data = await response.json();

if (data.results) {
  console.log(`   Database has content: ${data.results.length > 0 ? 'YES' : 'NO'}`);
  console.log(`   Has more pages: ${data.has_more ? 'YES' : 'NO'}`);

  if (data.results.length > 0) {
    console.log('\n   Sample issue:');
    const issue = data.results[0];
    console.log(`   - ID: ${issue.id}`);
    console.log(`   - Created: ${issue.created_time}`);
    console.log(`   - Last edited: ${issue.last_edited_time}`);
  }
} else {
  console.log('   ❌ Error:', data.message);
}

console.log(`\n🔗 View database: https://www.notion.so/${GITHUB_ISSUES_DB.replace(/-/g, '')}\n`);
