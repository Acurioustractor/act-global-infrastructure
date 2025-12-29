#!/usr/bin/env node

/**
 * Verify Notion Databases - Check for Duplicates
 *
 * This script fetches metadata from all Notion databases across
 * ACT Global Infrastructure and ACT Studio to identify duplicates.
 */

import '../lib/load-env.mjs';
import { Client } from '@notionhq/client';

const NOTION_TOKEN = process.env.NOTION_TOKEN;

const notion = new Client({ auth: NOTION_TOKEN });

// Database IDs from both systems
const databases = {
  globalInfrastructure: {
    'GitHub Issues': '2d5ebcf9-81cf-8042-9f40-ef7b39b39ca1',
    'Sprint Tracking': '2d6ebcf9-81cf-815f-a30f-c7ade0c0046d',
    'Strategic Pillars': '2d6ebcf9-81cf-81fe-a62f-e7dc9a42e5c1',
    'ACT Projects': '2d6ebcf9-81cf-8141-95a0-f8688dbb7c02',
    'Deployments': '2d6ebcf9-81cf-81d1-a72e-c9180830a54e',
    'Velocity Metrics': '2d6ebcf9-81cf-8123-939f-fab96227b3da',
    'Weekly Reports': '2d6ebcf9-81cf-81fe-9ead-e932693cd5dc'
  },
  actStudio: {
    'Projects': '177ebcf9-81cf-80dd-9514-f1ec32f3314c',
    'Actions': '177ebcf9-81cf-8023-af6e-dff974284218',
    'People': '47bdc1c4-df99-4ddc-81c4-a0214c919d69',
    'Organizations': '948f3946-7d1c-42f2-bd7e-1317a755e67b'
  }
};

async function fetchDatabaseInfo(dbId, name, system) {
  try {
    const response = await notion.databases.retrieve({
      database_id: dbId
    });

    // Get page count
    const pages = await notion.databases.query({
      database_id: dbId,
      page_size: 1
    });

    return {
      id: dbId,
      name,
      system,
      title: response.title[0]?.text?.content || '(no title)',
      properties: Object.keys(response.properties),
      propertyCount: Object.keys(response.properties).length,
      created: response.created_time,
      lastEdited: response.last_edited_time,
      url: response.url,
      hasResults: pages.results.length > 0
    };
  } catch (error) {
    return {
      id: dbId,
      name,
      system,
      error: error.message
    };
  }
}

async function main() {
  console.log('🔍 Verifying Notion Databases\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const allDatabases = [];

  // Fetch all database info
  for (const [system, dbs] of Object.entries(databases)) {
    console.log(`📊 ${system === 'globalInfrastructure' ? 'ACT Global Infrastructure' : 'ACT Studio'}\n`);

    for (const [name, id] of Object.entries(dbs)) {
      const info = await fetchDatabaseInfo(id, name, system);
      allDatabases.push(info);

      if (info.error) {
        console.log(`❌ ${name}`);
        console.log(`   ID: ${id}`);
        console.log(`   Error: ${info.error}\n`);
      } else {
        console.log(`✅ ${name}`);
        console.log(`   ID: ${id}`);
        console.log(`   Title: "${info.title}"`);
        console.log(`   Properties: ${info.propertyCount} (${info.properties.slice(0, 3).join(', ')}${info.propertyCount > 3 ? '...' : ''})`);
        console.log(`   Has Data: ${info.hasResults ? 'Yes' : 'No (empty)'}`);
        console.log(`   URL: ${info.url}\n`);
      }
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Analyze duplicates
  console.log('🔍 Duplicate Analysis\n');

  const globalProjects = allDatabases.find(db => db.name === 'ACT Projects');
  const studioProjects = allDatabases.find(db => db.name === 'Projects');

  if (globalProjects && studioProjects && !globalProjects.error && !studioProjects.error) {
    console.log('📋 "ACT Projects" vs "Projects" Comparison:\n');
    console.log(`Global Infrastructure - ACT Projects:`);
    console.log(`  Title: "${globalProjects.title}"`);
    console.log(`  Properties: ${globalProjects.propertyCount}`);
    console.log(`  Created: ${globalProjects.created}`);
    console.log(`  Has Data: ${globalProjects.hasResults}\n`);

    console.log(`ACT Studio - Projects:`);
    console.log(`  Title: "${studioProjects.title}"`);
    console.log(`  Properties: ${studioProjects.propertyCount}`);
    console.log(`  Created: ${studioProjects.created}`);
    console.log(`  Has Data: ${studioProjects.hasResults}\n`);

    // Compare properties
    const globalProps = new Set(globalProjects.properties);
    const studioProps = new Set(studioProjects.properties);
    const sharedProps = globalProjects.properties.filter(p => studioProps.has(p));
    const uniqueGlobal = globalProjects.properties.filter(p => !studioProps.has(p));
    const uniqueStudio = studioProjects.properties.filter(p => !globalProps.has(p));

    console.log(`Shared Properties (${sharedProps.length}): ${sharedProps.join(', ')}`);
    console.log(`Unique to Global (${uniqueGlobal.length}): ${uniqueGlobal.join(', ') || 'none'}`);
    console.log(`Unique to Studio (${uniqueStudio.length}): ${uniqueStudio.join(', ') || 'none'}\n`);

    if (sharedProps.length === globalProjects.propertyCount &&
        sharedProps.length === studioProjects.propertyCount) {
      console.log('⚠️  WARNING: These databases have IDENTICAL properties!');
      console.log('   They may be duplicates. Consider consolidating to one.\n');
    } else {
      console.log('✅ These databases have DIFFERENT schemas.');
      console.log('   They serve different purposes.\n');
    }
  }

  // Check Actions database
  const actions = allDatabases.find(db => db.name === 'Actions');
  const githubIssues = allDatabases.find(db => db.name === 'GitHub Issues');

  if (actions && githubIssues && !actions.error && !githubIssues.error) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 "Actions" vs "GitHub Issues" Comparison:\n');
    console.log(`ACT Studio - Actions:`);
    console.log(`  Title: "${actions.title}"`);
    console.log(`  Properties: ${actions.propertyCount} (${actions.properties.join(', ')})`);
    console.log(`  Has Data: ${actions.hasResults}\n`);

    console.log(`Global - GitHub Issues:`);
    console.log(`  Title: "${githubIssues.title}"`);
    console.log(`  Properties: ${githubIssues.propertyCount} (${githubIssues.properties.slice(0, 5).join(', ')}...)`);
    console.log(`  Has Data: ${githubIssues.hasResults}\n`);

    const actionProps = new Set(actions.properties);
    const issueProps = new Set(githubIssues.properties);
    const sharedActions = actions.properties.filter(p => issueProps.has(p));

    console.log(`Shared Properties (${sharedActions.length}): ${sharedActions.join(', ') || 'none'}`);

    if (sharedActions.length < 3) {
      console.log('✅ These databases have DIFFERENT purposes.');
      console.log('   Actions = non-GitHub tasks, GitHub Issues = dev tasks\n');
    } else {
      console.log('⚠️  WARNING: Significant overlap in properties!');
      console.log('   Verify if both are needed.\n');
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Summary\n');

  const totalDbs = allDatabases.length;
  const errorDbs = allDatabases.filter(db => db.error).length;
  const emptyDbs = allDatabases.filter(db => !db.error && !db.hasResults).length;

  console.log(`Total Databases: ${totalDbs}`);
  console.log(`Accessible: ${totalDbs - errorDbs}`);
  console.log(`With Errors: ${errorDbs}`);
  console.log(`Empty (no entries): ${emptyDbs}\n`);

  // Recommendations
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 Recommendations\n');

  if (globalProjects && studioProjects && !globalProjects.error && !studioProjects.error) {
    const propsMatch = globalProjects.properties.every(p => studioProjects.properties.includes(p)) &&
                       studioProjects.properties.every(p => globalProjects.properties.includes(p));

    if (propsMatch) {
      console.log('1. ⚠️  "ACT Projects" and "Projects" appear to be duplicates');
      console.log('   → Consolidate to one database');
      console.log('   → Update references in ACT Studio to use Global version');
      console.log('   → Archive/delete the duplicate\n');
    } else {
      console.log('1. ✅ "ACT Projects" and "Projects" serve different purposes');
      console.log('   → Keep both, document the difference\n');
    }
  }

  if (emptyDbs > 0) {
    console.log(`2. ℹ️  ${emptyDbs} database(s) are empty`);
    console.log('   → Consider if they\'re still needed');
    console.log('   → Delete if created for testing\n');
  }

  console.log('3. ✅ Proceed with creating new databases for:');
  console.log('   → Yearly Goals');
  console.log('   → 6-Month Phases');
  console.log('   → Moon Cycles');
  console.log('   → Daily Work Log');
  console.log('   → Subscription Tracking\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ Verification complete!\n');
}

main().catch(console.error);
