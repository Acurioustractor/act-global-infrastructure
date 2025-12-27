#!/usr/bin/env node

/**
 * Add properties to existing Notion databases
 * Run this AFTER creating databases
 */

import { Client } from '@notionhq/client';
import fs from 'fs';

const NOTION_TOKEN = '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';
const notion = new Client({ auth: NOTION_TOKEN });

const dbIds = JSON.parse(fs.readFileSync('./config/notion-database-ids.json', 'utf8'));

console.log('🔧 Adding properties to Notion databases...\n');

/**
 * Update Sprint Tracking with properties
 */
async function updateSprintTracking() {
  console.log('📊 Updating Sprint Tracking...');

  try {
    await notion.databases.update({
      database_id: dbIds.sprintTracking,
      properties: {
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
        'Total Issues': { number: { format: 'number' } },
        'Completed Issues': { number: { format: 'number' } },
        'In Progress': { number: { format: 'number' } },
        'Blocked': { number: { format: 'number' } },
        'Total Effort Points': { number: { format: 'number' } },
        'Completed Effort': { number: { format: 'number' } },
        'Velocity': {
          formula: {
            expression: 'prop("Completed Effort") / prop("Duration (weeks)")'
          }
        },
        'Completion %': {
          formula: {
            expression: 'round(prop("Completed Issues") / prop("Total Issues") * 100)'
          }
        },
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
    });

    console.log('   ✅ Sprint Tracking properties added\n');
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }
}

/**
 * Update Strategic Pillars with properties
 */
async function updateStrategicPillars() {
  console.log('🎨 Updating Strategic Pillars...');

  try {
    await notion.databases.update({
      database_id: dbIds.strategicPillars,
      properties: {
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
        'Issues This Quarter': { number: { format: 'number' } },
        'Completed This Quarter': { number: { format: 'number' } },
        'Progress %': {
          formula: {
            expression: 'round(prop("Completed This Quarter") / prop("Issues This Quarter") * 100)'
          }
        },
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
    });

    console.log('   ✅ Strategic Pillars properties added\n');
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }
}

/**
 * Update ACT Projects with properties
 */
async function updateACTProjects() {
  console.log('🏗️ Updating ACT Projects...');

  try {
    await notion.databases.update({
      database_id: dbIds.actProjects,
      properties: {
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
        'Uptime %': { number: { format: 'number' } },
        'Avg Response Time (ms)': { number: { format: 'number' } },
        'Active Issues': { number: { format: 'number' } },
        'In Current Sprint': { number: { format: 'number' } },
        'Blocked': { number: { format: 'number' } },
        'Team Members': { people: {} },
        'Primary Contact': { people: {} },
        'Users (monthly)': { number: { format: 'number' } },
        'Growth Rate': { number: { format: 'percent' } }
      }
    });

    console.log('   ✅ ACT Projects properties added\n');
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }
}

/**
 * Update Deployments with properties
 */
async function updateDeployments() {
  console.log('🚀 Updating Deployments...');

  try {
    await notion.databases.update({
      database_id: dbIds.deployments,
      properties: {
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
    });

    console.log('   ✅ Deployments properties added\n');
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }
}

/**
 * Update Velocity Metrics with properties
 */
async function updateVelocityMetrics() {
  console.log('📈 Updating Velocity Metrics...');

  try {
    await notion.databases.update({
      database_id: dbIds.velocityMetrics,
      properties: {
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
    });

    console.log('   ✅ Velocity Metrics properties added\n');
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }
}

/**
 * Update Weekly Reports with properties
 */
async function updateWeeklyReports() {
  console.log('📝 Updating Weekly Reports...');

  try {
    await notion.databases.update({
      database_id: dbIds.weeklyReports,
      properties: {
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
    });

    console.log('   ✅ Weekly Reports properties added\n');
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }
}

async function main() {
  await updateSprintTracking();
  await updateStrategicPillars();
  await updateACTProjects();
  await updateDeployments();
  await updateVelocityMetrics();
  await updateWeeklyReports();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ALL PROPERTIES ADDED SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 Next: Check your Notion page - all databases should now have properties!');
}

main().catch(console.error);
