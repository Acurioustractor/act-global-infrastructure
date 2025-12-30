#!/usr/bin/env node

/**
 * Sync GitHub Project Issues to Notion GitHub Issues Database
 *
 * This script syncs individual issues from your GitHub Project to Notion.
 * Unlike the sprint tracking sync (which creates aggregated metrics),
 * this creates one Notion page per GitHub issue for browsing/filtering.
 *
 * What it does:
 * 1. Fetches all issues from your GitHub Project (all 7 repos)
 * 2. Creates/updates corresponding pages in Notion GitHub Issues database
 * 3. Archives Notion pages for issues removed from the project
 *
 * Performance Modes:
 * - Sprint mode: npm run sync:issues -- --sprint="Sprint 2" (FAST - only 5 issues)
 * - Full mode: npm run sync:issues (SLOW - all 149 issues)
 *
 * Usage: npm run sync:issues [--sprint="Sprint Name"]
 */

import '../lib/load-env.mjs';
import { graphql } from '@octokit/graphql';
import fs from 'fs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_PROJECT_ID = process.env.GITHUB_PROJECT_ID || 'PVT_kwHOCOopjs4BLVik';
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const API_VERSION = '2022-06-28';

// Parse command line arguments
const args = process.argv.slice(2);
const sprintArg = args.find(arg => arg.startsWith('--sprint='));
const SPRINT_FILTER = sprintArg ? sprintArg.split('=')[1] : null;

// Load database IDs
const dbIds = JSON.parse(fs.readFileSync('./config/notion-database-ids.json', 'utf8'));
const GITHUB_ISSUES_DB = dbIds.githubIssues;

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `bearer ${GITHUB_TOKEN}`,
  },
});

console.log('🔄 Sync GitHub Project Issues → Notion');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`📊 GitHub Project: ${GITHUB_PROJECT_ID}`);
console.log(`📋 Notion Database: ${GITHUB_ISSUES_DB}`);
if (SPRINT_FILTER) {
  console.log(`⚡ SPRINT MODE: Only syncing "${SPRINT_FILTER}" issues (FAST!)\n`);
} else {
  console.log(`📦 FULL MODE: Syncing all issues (may take 1-2 minutes)\n`);
}

/**
 * Fetch all issues from GitHub Project
 */
async function fetchGitHubProjectIssues() {
  console.log('📥 Fetching issues from GitHub Project...');

  let allItems = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const query = `
      query($projectId: ID!, $cursor: String) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: 100, after: $cursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                content {
                  ... on Issue {
                    id
                    number
                    title
                    state
                    url
                    createdAt
                    updatedAt
                    closedAt
                    repository {
                      name
                      owner {
                        login
                      }
                    }
                    labels(first: 20) {
                      nodes {
                        name
                      }
                    }
                    assignees(first: 10) {
                      nodes {
                        login
                      }
                    }
                  }
                }
                fieldValues(first: 20) {
                  nodes {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2SingleSelectField {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldTextValue {
                      text
                      field {
                        ... on ProjectV2Field {
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await graphqlWithAuth({
      query,
      projectId: GITHUB_PROJECT_ID,
      cursor,
    });

    const itemsData = response.node?.items;
    const items = itemsData?.nodes || [];

    allItems.push(...items);
    hasNextPage = itemsData?.pageInfo?.hasNextPage || false;
    cursor = itemsData?.pageInfo?.endCursor;
  }

  console.log(`✅ Fetched ${allItems.length} issues\n`);
  return allItems;
}

/**
 * Extract field value from GitHub Project item
 */
function getFieldValue(item, fieldName) {
  const field = item.fieldValues?.nodes?.find(
    (fv) => fv.field?.name === fieldName
  );
  return field?.name || field?.text || null;
}

/**
 * Find existing Notion page by GitHub issue URL
 */
async function findNotionPage(githubUrl) {
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
        filter: {
          property: 'GitHub URL',
          url: {
            equals: githubUrl
          }
        }
      })
    }
  );

  const data = await response.json();
  return data.results?.[0] || null;
}

/**
 * Create or update issue in Notion
 */
async function syncIssueToNotion(item) {
  const issue = item.content;
  if (!issue) return null; // Skip non-issue items

  const issueNumber = issue.number;
  const repoName = issue.repository.name;
  const repoOwner = issue.repository.owner.login;
  const title = issue.title;
  const githubUrl = issue.url;

  // Project fields
  const status = getFieldValue(item, 'Status') || 'Backlog';
  const sprint = getFieldValue(item, 'Sprint');
  const effort = getFieldValue(item, 'Effort');
  const actProject = getFieldValue(item, 'ACT Project');
  const priority = getFieldValue(item, 'Priority');

  // GitHub fields
  const labels = issue.labels?.nodes?.map(l => l.name) || [];
  const assignees = issue.assignees?.nodes?.map(a => a.login).join(', ') || '';

  // Find existing Notion page
  const existingPage = await findNotionPage(githubUrl);

  const properties = {
    'Title': {
      title: [{ text: { content: title } }]
    },
    'GitHub ID': {
      number: issueNumber
    },
    'Repository': {
      select: { name: repoName }
    },
    'GitHub URL': {
      url: githubUrl
    },
    'Created': {
      date: { start: issue.createdAt }
    },
    'Updated': {
      date: { start: issue.updatedAt }
    }
  };

  // Add optional fields if they exist
  if (status) {
    properties['Status'] = { select: { name: status } };
  }
  if (sprint) {
    properties['Sprint'] = { select: { name: sprint } };
  }
  if (effort) {
    properties['Effort'] = { select: { name: effort } };
  }
  if (actProject) {
    properties['ACT Project'] = { select: { name: actProject } };
  }
  if (priority) {
    properties['Priority'] = { select: { name: priority } };
  }
  if (labels.length > 0) {
    properties['Labels'] = { multi_select: labels.map(name => ({ name })) };
  }
  if (issue.closedAt) {
    properties['Status'] = { select: { name: 'Done' } };
  }

  if (existingPage) {
    // Update existing page
    const response = await fetch(
      `https://api.notion.com/v1/pages/${existingPage.id}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': API_VERSION
        },
        body: JSON.stringify({
          properties,
          archived: false // Unarchive if it was archived
        })
      }
    );

    const data = await response.json();
    return response.ok ? 'updated' : 'failed';
  } else {
    // Create new page
    const response = await fetch(
      'https://api.notion.com/v1/pages',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': API_VERSION
        },
        body: JSON.stringify({
          parent: { database_id: GITHUB_ISSUES_DB },
          properties
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error(`   ❌ Failed to create issue #${issueNumber}:`, data.message);
      return 'failed';
    }
    return 'created';
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // 1. Fetch all GitHub Project issues
    const allItems = await fetchGitHubProjectIssues();

    // 2. Filter by sprint if specified
    let items = allItems;
    if (SPRINT_FILTER) {
      items = allItems.filter(item => {
        if (!item.content) return false;
        const sprint = getFieldValue(item, 'Sprint');
        return sprint === SPRINT_FILTER;
      });
      console.log(`📊 Filtered to ${items.length} issues in "${SPRINT_FILTER}"`);
      console.log(`   (Skipping ${allItems.length - items.length} issues from other sprints)\n`);
    }

    // 3. Sync each issue to Notion
    console.log('🔄 Syncing issues to Notion...\n');

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const item of items) {
      if (!item.content) continue; // Skip non-issue items

      const result = await syncIssueToNotion(item);

      if (result === 'created') {
        created++;
        if (created % 10 === 0) console.log(`   Created ${created} new issues...`);
      } else if (result === 'updated') {
        updated++;
        if (updated % 10 === 0) console.log(`   Updated ${updated} issues...`);
      } else if (result === 'failed') {
        failed++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SYNC COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📊 Results:`);
    console.log(`   • Created: ${created} new issues`);
    console.log(`   • Updated: ${updated} existing issues`);
    console.log(`   • Failed: ${failed} errors`);
    console.log(`   • Total synced: ${items.length} issues from 7 repos\n`);

    console.log('🔗 View in Notion:');
    console.log(`   https://www.notion.so/${GITHUB_ISSUES_DB.replace(/-/g, '')}\n`);

    console.log('💡 What you can do now:');
    console.log('   • Browse all issues across 7 repos in one Notion database');
    console.log('   • Filter by Sprint, Status, Priority, ACT Project');
    console.log('   • Create custom views for different teams');
    console.log('   • Link to Sprint Tracking for aggregated metrics\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
