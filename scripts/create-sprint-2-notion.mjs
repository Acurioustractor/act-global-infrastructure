import './lib/load-env.mjs';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const SPRINT_TRACKING_DB = '2d6ebcf9-81cf-815f-a30f-c7ade0c0046d';

console.log('📝 Creating Sprint 2 in Notion Sprint Tracking...\n');

// Calculate 30-day sprint dates (starting today)
const startDate = new Date();
const endDate = new Date();
endDate.setDate(endDate.getDate() + 30);

const response = await fetch(
  'https://api.notion.com/v1/pages',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      parent: { database_id: SPRINT_TRACKING_DB },
      properties: {
        'Sprint Name': {
          title: [{ text: { content: 'Sprint 2' } }]
        },
        'Sprint Number': {
          number: 2
        },
        'Start Date': {
          date: { start: startDate.toISOString().split('T')[0] }
        },
        'End Date': {
          date: { start: endDate.toISOString().split('T')[0] }
        },
        'Total Issues': {
          number: 0
        },
        'Completed Issues': {
          number: 0
        },
        'In Progress': {
          number: 0
        },
        'Blocked': {
          number: 0
        },
        'Total Effort Points': {
          number: 0
        },
        'Completed Effort': {
          number: 0
        }
      }
    })
  }
);

const data = await response.json();

if (response.ok) {
  console.log('✅ Sprint 2 created successfully!');
  console.log(`   Start: ${startDate.toISOString().split('T')[0]}`);
  console.log(`   End: ${endDate.toISOString().split('T')[0]}`);
  console.log(`\n🔗 View: https://www.notion.so/${data.id.replace(/-/g, '')}`);
} else {
  console.error('❌ Error:', data.message);
  console.error(JSON.stringify(data, null, 2));
}
