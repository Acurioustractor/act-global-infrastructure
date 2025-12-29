#!/usr/bin/env node

/**
 * Cleanup Duplicate Notion Databases
 *
 * This script identifies duplicate databases and provides instructions to delete them.
 * Note: Notion API doesn't support database deletion, so this must be done manually.
 *
 * Usage: node cleanup-notion-duplicates.mjs
 */

import '../lib/load-env.mjs';
import fs from 'fs';

const dbIds = JSON.parse(fs.readFileSync('./config/notion-database-ids.json', 'utf8'));

console.log('🗑️  Notion Database Cleanup Guide\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Databases to keep (from config)
console.log('✅ KEEP THESE DATABASES (Already in config):\n');

const keepDatabases = [
  { name: 'GitHub Issues', id: dbIds.githubIssues },
  { name: 'Sprint Tracking', id: dbIds.sprintTracking },
  { name: 'Strategic Pillars', id: dbIds.strategicPillars },
  { name: 'ACT Projects', id: dbIds.actProjects },
  { name: 'Deployments', id: dbIds.deployments },
  { name: 'Velocity Metrics', id: dbIds.velocityMetrics },
  { name: 'Weekly Reports', id: dbIds.weeklyReports },
  { name: 'Yearly Goals', id: dbIds.yearlyGoals },
  { name: '6-Month Phases', id: dbIds.sixMonthPhases },
  { name: 'Moon Cycles', id: dbIds.moonCycles },
  { name: 'Daily Work Log', id: dbIds.dailyWorkLog },
  { name: 'Subscription Tracking', id: dbIds.subscriptionTracking }
];

keepDatabases.forEach(db => {
  console.log(`   ${db.name}`);
  console.log(`   https://www.notion.so/${db.id.replace(/-/g, '')}\n`);
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('❌ DELETE THESE DATABASES (Duplicates & Tests):\n');

// Duplicates identified from user's list
const duplicatesToDelete = [
  { name: 'Yearly Goals (Duplicate)', id: '2d8ebcf9-81cf-813b-9c02-de471e8d18d5' },
  { name: '6-Month Phases (Duplicate)', id: '2d8ebcf9-81cf-81cd-bd03-ec3e93f936e2' },
  { name: 'Moon Cycles (Duplicate)', id: '2d8ebcf9-81cf-81d9-ba12-f3ed3f2c33d0' },
  { name: 'Daily Work Log (Duplicate)', id: '2d8ebcf9-81cf-81a4-b1a7-d1c7a9cb00ba' },
  { name: 'Subscription Tracking (Duplicate)', id: '2d8ebcf9-81cf-8141-bd3c-ee7715a96ca4' },
  { name: 'Test Minimal DB', id: '2d8ebcf9-81cf-81de-8eeb-c743740ca0c0' },
  { name: 'Test Latest API', id: '2d8ebcf9-81cf-81d4-b023-d08cc477581d' }
];

duplicatesToDelete.forEach((db, index) => {
  console.log(`${index + 1}. ${db.name}`);
  console.log(`   URL: https://www.notion.so/${db.id.replace(/-/g, '')}`);
  console.log(`   Instructions: Open URL → Click "..." menu → Delete\n`);
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📋 HOW TO DELETE:\n');
console.log('   1. Open each duplicate database URL above');
console.log('   2. Click the "..." menu in the top right');
console.log('   3. Select "Delete"');
console.log('   4. Confirm deletion\n');

console.log('⚠️  NOTE: Notion API does not support database deletion');
console.log('   You must delete these manually through the Notion UI\n');

console.log('✅ After deletion, run: npm run verify:notion\n');
