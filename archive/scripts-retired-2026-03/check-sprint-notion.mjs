import './lib/load-env.mjs';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const SPRINT_DB_ID = '2d6ebcf9-81cf-815f-a30f-c7ade0c0046d';

const response = await fetch(
  `https://api.notion.com/v1/databases/${SPRINT_DB_ID}/query`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      filter: {
        property: 'Sprint Name',
        title: { equals: 'Sprint 1' }
      }
    })
  }
);

const data = await response.json();
const sprint = data.results[0];

if (sprint) {
  console.log('📊 Sprint 1 in Notion:\n');
  console.log(`   Total Issues: ${sprint.properties['Total Issues']?.number || 0}`);
  console.log(`   Completed: ${sprint.properties['Completed Issues']?.number || 0}`);
  console.log(`   In Progress: ${sprint.properties['In Progress']?.number || 0}`);
  console.log(`   Blocked: ${sprint.properties['Blocked']?.number || 0}`);
  console.log(`   Total Effort: ${sprint.properties['Total Effort Points']?.number || 0} hours`);
  console.log(`   Completed Effort: ${sprint.properties['Completed Effort']?.number || 0} hours`);
  console.log(`\n   🔗 View in Notion: ${sprint.url}\n`);
}
