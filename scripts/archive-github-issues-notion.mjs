#!/usr/bin/env node

/**
 * Archive GitHub Issues Notion Database
 *
 * This script archives all pages in the GitHub Issues Notion database.
 * We don't use this database in our current workflow - we only track
 * sprint-level aggregates in the Sprint Tracking database.
 *
 * This will clean up the 1000+ accumulated issues.
 *
 * Usage: node scripts/archive-github-issues-notion.mjs
 */

import '../lib/load-env.mjs';
import fs from 'fs';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const API_VERSION = '2022-06-28';

// Load database IDs
const dbIds = JSON.parse(fs.readFileSync('./config/notion-database-ids.json', 'utf8'));
const GITHUB_ISSUES_DB = dbIds.githubIssues;

console.log('🗄️  Archive GitHub Issues Notion Database');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋 About this database:');
console.log('   • Database: GitHub Issues');
console.log('   • ID:', GITHUB_ISSUES_DB);
console.log('   • Status: NOT USED in current workflow');
console.log('   • Problem: 1000+ accumulated issues from old syncs\n');

console.log('✅ What we use instead:');
console.log('   • Sprint Tracking database (working perfectly)');
console.log('   • Only tracks sprint-level aggregated metrics');
console.log('   • Updated daily by sync-sprint-to-notion.mjs\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function getPageCount() {
  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${GITHUB_ISSUES_DB}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': API_VERSION
        },
        body: JSON.stringify({
          page_size: 1
        })
      }
    );

    const data = await response.json();

    console.log('📊 Checking database contents...\n');
    return data.results && data.results.length > 0;
  } catch (error) {
    console.error('❌ Error querying database:', error.message);
    return false;
  }
}

async function archiveAllPages() {
  console.log('🗑️  Archiving all pages (this may take a while)...\n');

  let totalArchived = 0;
  let hasMore = true;
  let cursor = undefined;

  while (hasMore) {
    try {
      // Fetch a batch of pages
      const queryBody = {
        page_size: 100
      };
      if (cursor) {
        queryBody.start_cursor = cursor;
      }

      const response = await fetch(
        `https://api.notion.com/v1/databases/${GITHUB_ISSUES_DB}/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Content-Type': 'application/json',
            'Notion-Version': API_VERSION
          },
          body: JSON.stringify(queryBody)
        }
      );

      const data = await response.json();
      const pages = data.results || [];

      if (pages.length === 0) {
        hasMore = false;
        break;
      }

      // Archive each page in this batch
      for (const page of pages) {
        try {
          const archiveResponse = await fetch(
            `https://api.notion.com/v1/pages/${page.id}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Content-Type': 'application/json',
                'Notion-Version': API_VERSION
              },
              body: JSON.stringify({
                archived: true
              })
            }
          );

          if (archiveResponse.ok) {
            totalArchived++;

            // Progress indicator every 50 pages
            if (totalArchived % 50 === 0) {
              console.log(`   Archived ${totalArchived} pages...`);
            }
          } else {
            const errorData = await archiveResponse.json();
            console.error(`   ⚠️  Failed to archive page ${page.id}:`, errorData.message);
          }
        } catch (error) {
          console.error(`   ⚠️  Failed to archive page ${page.id}:`, error.message);
        }
      }

      hasMore = data.has_more;
      cursor = data.next_cursor;

    } catch (error) {
      console.error('❌ Error fetching pages:', error.message);
      hasMore = false;
    }
  }

  return totalArchived;
}

async function main() {
  // Check if database has content
  const hasContent = await getPageCount();

  if (!hasContent) {
    console.log('✅ Database is already empty - nothing to archive\n');
    return;
  }

  console.log('⚠️  WARNING: This will archive ALL pages in the GitHub Issues database');
  console.log('   (They can be restored manually in Notion if needed)\n');
  console.log('Starting in 3 seconds... (Ctrl+C to cancel)\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  const totalArchived = await archiveAllPages();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ARCHIVE COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`📊 Total pages archived: ${totalArchived}`);
  console.log('\n💡 What this means:');
  console.log('   • GitHub Issues database is now clean');
  console.log('   • Sprint Tracking continues working normally');
  console.log('   • If needed, archived pages can be restored in Notion\n');

  console.log('🔗 View cleaned database:');
  console.log(`   https://www.notion.so/${GITHUB_ISSUES_DB.replace(/-/g, '')}\n`);
}

main().catch(console.error);
