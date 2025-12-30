#!/usr/bin/env node

/**
 * Create Planning Databases for ACT Ecosystem
 * 
 * Creates 5 new databases:
 * 1. Yearly Goals
 * 2. 6-Month Phases  
 * 3. Moon Cycles
 * 4. Daily Work Log
 * 5. Subscription Tracking
 */

import { Client } from '@notionhq/client';
import fs from 'fs/promises';
import path from 'path';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = '2d6ebcf981cf806e8db2dc8ec5d0b414';

// Existing database IDs to link to
const EXISTING_DBS = {
  sprintTracking: '2d6ebcf9-81cf-815f-a30f-c7ade0c0046d',
  githubIssues: '2d5ebcf981cf80429f40ef7b39b39ca1',
  actProjects: '2d6ebcf9-81cf-8141-95a0-f8688dbb7c02'
};

if (!NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN required');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

async function createYearlyGoals() {
  console.log('🎯 Creating Yearly Goals...');

  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    icon: { emoji: '🎯' },
    title: [{ text: { content: 'Yearly Goals' } }],
    properties: {
      'Goal': { title: {} },
      'Year': { number: {} },
      'ACT Project': {
        relation: { database_id: EXISTING_DBS.actProjects }
      },
      'Status': {
        select: {
          options: [
            { name: 'Not Started', color: 'gray' },
            { name: 'In Progress', color: 'yellow' },
            { name: 'Completed', color: 'green' }
          ]
        }
      },
      'Key Results': { rich_text: {} }
    }
  });
  
  console.log(`✅ Created: ${db.id}`);
  return db.id;
}

async function create6MonthPhases(yearlyGoalsId) {
  console.log('📅 Creating 6-Month Phases...');
  
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    icon: { emoji: '📅' },
    title: [{ text: { content: '6-Month Phases' } }],
    properties: {
      'Phase': { title: {} },
      'Start Date': { date: {} },
      'End Date': { date: {} },
      'Yearly Goal': {
        relation: { database_id: yearlyGoalsId }
      },
      'Deliverables': { rich_text: {} },
      'Status': {
        select: {
          options: [
            { name: 'Planning', color: 'gray' },
            { name: 'Active', color: 'blue' },
            { name: 'Complete', color: 'green' }
          ]
        }
      }
    }
  });
  
  console.log(`✅ Created: ${db.id}`);
  return db.id;
}

async function createMoonCycles(sixMonthPhasesId) {
  console.log('🌙 Creating Moon Cycles...');
  
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    icon: { emoji: '🌙' },
    title: [{ text: { content: 'Moon Cycles' } }],
    properties: {
      'Cycle': { title: {} },
      'Moon Phase': {
        select: {
          options: [
            { name: 'New Moon', color: 'gray' },
            { name: 'Waxing', color: 'yellow' },
            { name: 'Full', color: 'blue' },
            { name: 'Waning', color: 'purple' }
          ]
        }
      },
      'Start Date': { date: {} },
      'End Date': { date: {} },
      '6-Month Phase': {
        relation: { database_id: sixMonthPhasesId }
      },
      'Sprints': {
        relation: { database_id: EXISTING_DBS.sprintTracking }
      },
      'Focus': { rich_text: {} },
      'Ceremonies': {
        multi_select: {
          options: [
            { name: 'Planning', color: 'blue' },
            { name: 'Review', color: 'green' },
            { name: 'Retrospective', color: 'purple' }
          ]
        }
      }
    }
  });
  
  console.log(`✅ Created: ${db.id}`);
  return db.id;
}

async function createDailyWorkLog() {
  console.log('📝 Creating Daily Work Log...');
  
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    icon: { emoji: '📝' },
    title: [{ text: { content: 'Daily Work Log' } }],
    properties: {
      'Date': { title: {} },
      'Sprint': {
        relation: { database_id: EXISTING_DBS.sprintTracking }
      },
      'Completed Today': {
        relation: { database_id: EXISTING_DBS.githubIssues }
      },
      'Time Spent': { number: {} },
      'Learnings': { rich_text: {} },
      'Blockers': { rich_text: {} },
      "Tomorrow's Plan": { rich_text: {} }
    }
  });
  
  console.log(`✅ Created: ${db.id}`);
  return db.id;
}

async function createSubscriptionTracking() {
  console.log('💳 Creating Subscription Tracking...');
  
  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
    icon: { emoji: '💳' },
    title: [{ text: { content: 'Subscription Tracking' } }],
    properties: {
      'Vendor': { title: {} },
      'Annual Cost': { number: { format: 'dollar' } },
      'Billing Cycle': {
        select: {
          options: [
            { name: 'monthly', color: 'blue' },
            { name: 'annual', color: 'green' },
            { name: 'quarterly', color: 'yellow' }
          ]
        }
      },
      'Account Email': {
        select: {
          options: [
            { name: 'nicholas@act.place', color: 'blue' },
            { name: 'hi@act.place', color: 'green' },
            { name: 'accounts@act.place', color: 'purple' }
          ]
        }
      },
      'Status': {
        select: {
          options: [
            { name: 'active', color: 'green' },
            { name: 'cancelled', color: 'red' },
            { name: 'trial', color: 'yellow' }
          ]
        }
      },
      'Next Renewal': { date: {} },
      'Migration Status': {
        select: {
          options: [
            { name: 'pending', color: 'gray' },
            { name: 'in_progress', color: 'yellow' },
            { name: 'completed', color: 'green' }
          ]
        }
      },
      'Potential Savings': { number: { format: 'dollar' } },
      'Last Synced': { date: {} }
    }
  });
  
  console.log(`✅ Created: ${db.id}`);
  return db.id;
}

async function main() {
  console.log('🚀 Creating Notion Planning Databases\n');
  
  try {
    const yearlyGoalsId = await createYearlyGoals();
    const sixMonthPhasesId = await create6MonthPhases(yearlyGoalsId);
    const moonCyclesId = await createMoonCycles(sixMonthPhasesId);
    const dailyWorkLogId = await createDailyWorkLog();
    const subscriptionTrackingId = await createSubscriptionTracking();
    
    // Update config file
    const configPath = path.join(process.cwd(), 'config', 'notion-database-ids.json');
    const existingConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    
    const updatedConfig = {
      ...existingConfig,
      yearlyGoals: yearlyGoalsId,
      sixMonthPhases: sixMonthPhasesId,
      moonCycles: moonCyclesId,
      dailyWorkLog: dailyWorkLogId,
      subscriptionTracking: subscriptionTrackingId
    };
    
    await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2));
    
    console.log('\n✅ All databases created!\n');
    console.log('Database IDs:');
    console.log(`  Yearly Goals:          ${yearlyGoalsId}`);
    console.log(`  6-Month Phases:        ${sixMonthPhasesId}`);
    console.log(`  Moon Cycles:           ${moonCyclesId}`);
    console.log(`  Daily Work Log:        ${dailyWorkLogId}`);
    console.log(`  Subscription Tracking: ${subscriptionTrackingId}`);
    console.log('\n📝 Updated: config/notion-database-ids.json\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
