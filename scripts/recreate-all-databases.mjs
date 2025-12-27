#!/usr/bin/env node

/**
 * Recreate ALL Notion databases using raw fetch API
 * This bypasses the @notionhq/client bug that strips properties
 */

import fs from 'fs';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = '2d6ebcf981cf806e8db2dc8ec5d0b414';
const API_VERSION = '2022-06-28'; // This version supports properties in create!

const dbIds = {};

async function createDatabase(title, icon, properties) {
  const payload = {
    parent: { page_id: PARENT_PAGE_ID },
    title: [{ text: { content: title } }],
    icon: { emoji: icon },
    properties
  };

  const response = await fetch('https://api.notion.com/v1/databases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': API_VERSION
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to create ${title}: ${data.message}`);
  }

  return data;
}

console.log('🚀 Recreating Notion databases with RAW API...\n');

// 1. Sprint Tracking
console.log('📊 Creating Sprint Tracking...');
const sprintTracking = await createDatabase(
  'Sprint Tracking',
  '🎯',
  {
    'Sprint Name': { title: {} },
    'Sprint Number': { number: { format: 'number' } },
    'Status': {
      select: {
        options: [
          { name: 'Planning', color: 'gray' },
          { name: 'Active', color: 'blue' },
          { name: 'Completed', color: 'green' },
          { name: 'Archived', color: 'default' }
        ]
      }
    },
    'Start Date': { date: {} },
    'End Date': { date: {} },
    'Duration (weeks)': {
      formula: {
        expression: 'dateBetween(prop("End Date"), prop("Start Date"), "weeks")'
      }
    },
    'Goal': { rich_text: {} },
    // Note: Rollups will be added later after linking to GitHub Issues
    // 'Total Issues', 'Completed Issues', 'In Progress', 'Blocked'
    // 'Total Effort Points', 'Completed Effort'
    // Formulas 'Velocity' and 'Completion %' will be added after rollups exist
    'Projects': {
      multi_select: {
        options: [
          { name: 'ACT Farm Studio', color: 'blue' },
          { name: 'Empathy Ledger', color: 'purple' },
          { name: 'JusticeHub', color: 'pink' },
          { name: 'The Harvest', color: 'green' },
          { name: 'Goods', color: 'yellow' },
          { name: 'BCV/ACT Farm', color: 'brown' },
          { name: 'ACT Placemat', color: 'gray' }
        ]
      }
    },
    'Retrospective': { rich_text: {} },
    'Wins': { rich_text: {} },
    'Challenges': { rich_text: {} },
    'Learnings': { rich_text: {} }
  }
);
dbIds.sprintTracking = sprintTracking.id;
console.log(`   ✅ Created with ${Object.keys(sprintTracking.properties).length} properties\n`);

// 2. Strategic Pillars
console.log('🎨 Creating Strategic Pillars...');
const strategicPillars = await createDatabase(
  'Strategic Pillars',
  '🎨',
  {
    'Pillar Name': { title: {} },
    'Description': { rich_text: {} },
    'Mission Statement': { rich_text: {} },
    'LCAA Phase': {
      select: {
        options: [
          { name: 'Listen', color: 'blue' },
          { name: 'Curiosity', color: 'purple' },
          { name: 'Action', color: 'green' },
          { name: 'Art', color: 'pink' }
        ]
      }
    },
    'Q1 Objective': { rich_text: {} },
    'Q1 Key Results': { rich_text: {} },
    // Note: Rollups and formulas will be added after linking to GitHub Issues
    // 'Issues This Quarter', 'Completed This Quarter', 'Progress %'
    'Community Impact': {
      select: {
        options: [
          { name: 'Transformative', color: 'purple' },
          { name: 'Significant', color: 'blue' },
          { name: 'Moderate', color: 'yellow' },
          { name: 'Emerging', color: 'gray' }
        ]
      }
    },
    'Impact Stories': { rich_text: {} }
  }
);
dbIds.strategicPillars = strategicPillars.id;
console.log(`   ✅ Created with ${Object.keys(strategicPillars.properties).length} properties\n`);

// 3. ACT Projects
console.log('🏗️ Creating ACT Projects...');
const actProjects = await createDatabase(
  'ACT Projects',
  '🏗️',
  {
    'Project Name': { title: {} },
    'Description': { rich_text: {} },
    'Tech Stack': {
      multi_select: {
        options: [
          { name: 'Next.js', color: 'default' },
          { name: 'Supabase', color: 'green' },
          { name: 'Tailwind', color: 'blue' },
          { name: 'Vercel', color: 'default' },
          { name: 'TypeScript', color: 'blue' }
        ]
      }
    },
    'Primary Language': {
      select: {
        options: [
          { name: 'TypeScript', color: 'blue' },
          { name: 'JavaScript', color: 'yellow' },
          { name: 'Python', color: 'green' }
        ]
      }
    },
    'GitHub Repo': { url: {} },
    'Production URL': { url: {} },
    'Vercel Project': { url: {} },
    'Notion Doc': { url: {} },
    'Status': {
      select: {
        options: [
          { name: 'Active Development', color: 'blue' },
          { name: 'Maintenance', color: 'yellow' },
          { name: 'Beta', color: 'purple' },
          { name: 'Launched', color: 'green' },
          { name: 'Archived', color: 'gray' }
        ]
      }
    },
    'Current Version': { rich_text: {} },
    'Last Deployed': { date: {} },
    'Health Status': {
      select: {
        options: [
          { name: 'Healthy', color: 'green' },
          { name: 'Degraded', color: 'yellow' },
          { name: 'Down', color: 'red' },
          { name: 'Unknown', color: 'gray' }
        ]
      }
    },
    'Uptime %': { number: { format: 'percent' } },
    'Avg Response Time (ms)': { number: { format: 'number' } },
    'Active Issues': { number: { format: 'number' } },
    'In Current Sprint': { number: { format: 'number' } },
    'Blocked': { number: { format: 'number' } },
    'Team Members': { people: {} },
    'Primary Contact': { people: {} },
    'Users (monthly)': { number: { format: 'number' } },
    'Growth Rate': { number: { format: 'percent' } }
  }
);
dbIds.actProjects = actProjects.id;
console.log(`   ✅ Created with ${Object.keys(actProjects.properties).length} properties\n`);

// 4. Deployments
console.log('🚀 Creating Deployments...');
const deployments = await createDatabase(
  'Deployments',
  '🚀',
  {
    'Deployment': { title: {} },
    'Environment': {
      select: {
        options: [
          { name: 'Production', color: 'green' }
        ]
      }
    },
    'Version': { rich_text: {} },
    'Git SHA': { rich_text: {} },
    'Git Branch': { rich_text: {} },
    'Deployed At': { date: {} },
    'Deployed By': { people: {} },
    'Status': {
      select: {
        options: [
          { name: 'Success', color: 'green' },
          { name: 'Failed', color: 'red' },
          { name: 'In Progress', color: 'blue' },
          { name: 'Rolled Back', color: 'orange' }
        ]
      }
    },
    'Duration (seconds)': { number: { format: 'number' } },
    'Deploy URL': { url: {} },
    'GitHub Commit URL': { url: {} },
    'Vercel URL': { url: {} },
    'Health Check': {
      select: {
        options: [
          { name: 'Healthy', color: 'green' },
          { name: 'Degraded', color: 'yellow' },
          { name: 'Down', color: 'red' },
          { name: 'Unknown', color: 'gray' }
        ]
      }
    },
    'Response Time (ms)': { number: { format: 'number' } },
    'Last Checked': { date: {} },
    'Changes': { rich_text: {} }
  }
);
dbIds.deployments = deployments.id;
console.log(`   ✅ Created with ${Object.keys(deployments.properties).length} properties\n`);

// 5. Velocity Metrics
console.log('📈 Creating Velocity Metrics...');
const velocityMetrics = await createDatabase(
  'Velocity Metrics',
  '📈',
  {
    'Week Of': { title: {} },
    'Week Number': { number: { format: 'number' } },
    'Year': { number: { format: 'number' } },
    'Issues Completed': { number: { format: 'number' } },
    'Story Points Completed': { number: { format: 'number' } },
    'Team Size': { number: { format: 'number' } },
    'Team Capacity (hours)': { number: { format: 'number' } },
    'Points per Week': {
      formula: {
        expression: 'prop("Story Points Completed")'
      }
    },
    'Hours per Point': {
      formula: {
        expression: 'prop("Team Capacity (hours)") / prop("Story Points Completed")'
      }
    },
    'Utilization %': {
      formula: {
        expression: 'round(prop("Story Points Completed") / (prop("Team Capacity (hours)") / 2.5) * 100)'
      }
    },
    'vs Last Week': { number: { format: 'number' } },
    'Trend': {
      select: {
        options: [
          { name: 'Up', color: 'green' },
          { name: 'Steady', color: 'yellow' },
          { name: 'Down', color: 'red' }
        ]
      }
    },
    'Bugs Created': { number: { format: 'number' } },
    'Bugs Fixed': { number: { format: 'number' } },
    'Rework %': {
      formula: {
        expression: 'round(prop("Bugs Created") / prop("Issues Completed") * 100)'
      }
    },
    'Deployments': { number: { format: 'number' } },
    'Deploy Frequency': {
      formula: {
        expression: 'prop("Deployments") / 7'
      }
    }
  }
);
dbIds.velocityMetrics = velocityMetrics.id;
console.log(`   ✅ Created with ${Object.keys(velocityMetrics.properties).length} properties\n`);

// 6. Weekly Reports
console.log('📝 Creating Weekly Reports...');
const weeklyReports = await createDatabase(
  'Weekly Reports',
  '📝',
  {
    'Week Ending': { title: {} },
    'Report Date': { date: {} },
    'Summary': { rich_text: {} },
    'Top Achievements': { rich_text: {} },
    'Deployments': { rich_text: {} },
    'Velocity': { rich_text: {} },
    'Next Week': { rich_text: {} },
    'Email HTML': { rich_text: {} },
    'Blog Draft': { rich_text: {} },
    'Social Snippets': { rich_text: {} },
    'Issues Completed': { number: { format: 'number' } },
    'Points Completed': { number: { format: 'number' } },
    'Deployments Count': { number: { format: 'number' } },
    'Sent': { checkbox: {} },
    'Sent To': {
      multi_select: {
        options: [
          { name: 'Team', color: 'blue' },
          { name: 'Co-Founders', color: 'purple' },
          { name: 'Community', color: 'green' },
          { name: 'Funders', color: 'orange' }
        ]
      }
    },
    'Sent At': { date: {} }
  }
);
dbIds.weeklyReports = weeklyReports.id;
console.log(`   ✅ Created with ${Object.keys(weeklyReports.properties).length} properties\n`);

// Save the IDs
fs.writeFileSync('./config/notion-database-ids.json', JSON.stringify(dbIds, null, 2));

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ ALL DATABASES RECREATED SUCCESSFULLY!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📊 Database IDs saved to: config/notion-database-ids.json\n');
console.log('🔗 URLs:');
console.log(`   Sprint Tracking: https://www.notion.so/${sprintTracking.id.replace(/-/g, '')}`);
console.log(`   Strategic Pillars: https://www.notion.so/${strategicPillars.id.replace(/-/g, '')}`);
console.log(`   ACT Projects: https://www.notion.so/${actProjects.id.replace(/-/g, '')}`);
console.log(`   Deployments: https://www.notion.so/${deployments.id.replace(/-/g, '')}`);
console.log(`   Velocity Metrics: https://www.notion.so/${velocityMetrics.id.replace(/-/g, '')}`);
console.log(`   Weekly Reports: https://www.notion.so/${weeklyReports.id.replace(/-/g, '')}`);
console.log('\n📋 Next: Check your Notion page - all databases should have properties!');
