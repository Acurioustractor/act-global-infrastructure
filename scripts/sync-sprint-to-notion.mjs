#!/usr/bin/env node

/**
 * Sync Sprint Metrics to Notion Sprint Tracking Database
 *
 * This script:
 * 1. Fetches all issues from GitHub Project
 * 2. Groups by Sprint field
 * 3. Calculates metrics for each sprint
 * 4. Updates Sprint Tracking database in Notion
 * 5. Also stores snapshot in Supabase for historical tracking
 *
 * Run: Daily at 5 PM via GitHub Action or on-demand
 */

import { graphql } from '@octokit/graphql';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_PROJECT_ID = process.env.GITHUB_PROJECT_ID || 'PVT_kwHOCOopjs4BLVik';
const GITHUB_ORG = 'Acurioustractor';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const API_VERSION = '2022-06-28';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Load database IDs
const dbIds = JSON.parse(fs.readFileSync('./config/notion-database-ids.json', 'utf8'));

// Initialize clients
const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `bearer ${GITHUB_TOKEN}`,
  },
});

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

console.log('🚀 Sprint Metrics Sync Starting...');
console.log(`📊 GitHub Project: ${GITHUB_PROJECT_ID}`);
console.log(`📋 Notion Sprint Tracking: ${dbIds.sprintTracking}\n`);

/**
 * Fetch all issues from GitHub Project
 */
async function fetchGitHubProjectItems() {
  console.log('📥 Fetching GitHub Project items...');

  let allItems = [];
  let hasNextPage = true;
  let cursor = null;
  let pageCount = 0;

  while (hasNextPage) {
    pageCount++;
    const query = `
      query($projectId: ID!, $cursor: String) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: 100, after: $cursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              totalCount
              nodes {
                id
                content {
                  ... on Issue {
                    id
                    number
                    title
                    state
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
                    ... on ProjectV2ItemFieldNumberValue {
                      number
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

    console.log(`  Page ${pageCount}: ${items.length} items`);
  }

  console.log(`✅ Fetched ${allItems.length} total items\n`);
  return allItems;
}

/**
 * Extract field value from GitHub Project item
 */
function getFieldValue(item, fieldName) {
  const field = item.fieldValues?.nodes?.find(
    (fv) => fv.field?.name === fieldName
  );
  return field?.name || field?.text || field?.number || null;
}

/**
 * Group items by sprint and calculate metrics
 */
function groupBySprint(items) {
  console.log('📊 Grouping items by sprint...');

  const sprints = {};

  items.forEach((item) => {
    const sprint = getFieldValue(item, 'Sprint');
    if (!sprint) return; // Skip items without sprint assignment

    if (!sprints[sprint]) {
      sprints[sprint] = {
        name: sprint,
        total: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
        blocked: 0,
        effortTotal: 0,
        effortCompleted: 0,
        byProject: {},
      };
    }

    const status = getFieldValue(item, 'Status');
    const effort = getFieldValue(item, 'Effort') || 0;
    const project = getFieldValue(item, 'ACT Project') || 'Unknown';

    sprints[sprint].total++;
    sprints[sprint].effortTotal += effort;

    // Count by status
    if (status === 'Todo' || status === 'Backlog') {
      sprints[sprint].todo++;
    } else if (status === 'In Progress') {
      sprints[sprint].inProgress++;
    } else if (status === 'Done' || status === 'Closed') {
      sprints[sprint].done++;
      sprints[sprint].effortCompleted += effort;
    } else if (status === 'Blocked') {
      sprints[sprint].blocked++;
    }

    // Count by project
    sprints[sprint].byProject[project] = (sprints[sprint].byProject[project] || 0) + 1;
  });

  // Calculate percentages
  Object.values(sprints).forEach((sprint) => {
    sprint.completionPercentage =
      sprint.total > 0 ? Math.round((sprint.done / sprint.total) * 100) : 0;
  });

  console.log(`  Found ${Object.keys(sprints).length} sprints with assigned issues\n`);
  return sprints;
}

/**
 * Find Sprint Tracking page in Notion by sprint name
 */
async function findSprintPage(sprintName) {
  const response = await fetch(
    `https://api.notion.com/v1/databases/${dbIds.sprintTracking}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': API_VERSION
      },
      body: JSON.stringify({
        filter: {
          property: 'Sprint Name',
          title: {
            equals: sprintName
          }
        }
      })
    }
  );

  const data = await response.json();
  return data.results?.[0] || null;
}

/**
 * Update Sprint Tracking in Notion
 */
async function updateSprintTracking(sprint) {
  console.log(`📝 Updating ${sprint.name} in Notion...`);

  // Find existing page
  const existingPage = await findSprintPage(sprint.name);

  if (!existingPage) {
    console.log(`  ⚠️  Sprint "${sprint.name}" not found in Notion - skipping`);
    console.log(`     Create this sprint manually in Notion first`);
    return null;
  }

  // Update the page with calculated metrics
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
        properties: {
          'Total Issues': { number: sprint.total },
          'Completed Issues': { number: sprint.done },
          'In Progress': { number: sprint.inProgress },
          'Blocked': { number: sprint.blocked },
          'Total Effort Points': { number: sprint.effortTotal },
          'Completed Effort': { number: sprint.effortCompleted }
          // Note: Velocity and Completion % are formulas - calculated automatically
        }
      })
    }
  );

  const data = await response.json();

  if (response.ok) {
    console.log(`  ✅ Updated ${sprint.name}`);
    console.log(`     Total: ${sprint.total}, Done: ${sprint.done}, Completion: ${sprint.completionPercentage}%`);
  } else {
    console.error(`  ❌ Error updating ${sprint.name}:`, data.message);
  }

  return data;
}

/**
 * Store snapshot in Supabase
 */
async function storeSnapshot(sprint) {
  if (!supabase) {
    return null;
  }

  const snapshotData = {
    sprint_name: sprint.name,
    sprint_number: parseInt(sprint.name.replace(/\D/g, ''), 10) || 0,
    snapshot_date: new Date().toISOString().split('T')[0],
    total_issues: sprint.total,
    todo_issues: sprint.todo,
    in_progress_issues: sprint.inProgress,
    done_issues: sprint.done,
    blocked_issues: sprint.blocked,
    completion_percentage: sprint.completionPercentage,
    velocity: sprint.done,
    actual_remaining: sprint.todo + sprint.inProgress + sprint.blocked,
    by_repository: {},
    by_type: {},
    by_priority: {},
    project_id: GITHUB_PROJECT_ID,
    github_org: GITHUB_ORG,
  };

  const { data, error } = await supabase
    .from('sprint_snapshots')
    .upsert([snapshotData], {
      onConflict: 'sprint_name,snapshot_date',
    });

  if (error) {
    console.error(`  ⚠️  Supabase error for ${sprint.name}:`, error.message);
  }

  return data;
}

/**
 * Main execution
 */
async function main() {
  try {
    // 1. Fetch all GitHub Project items
    const items = await fetchGitHubProjectItems();

    // 2. Group by sprint and calculate metrics
    const sprints = groupBySprint(items);

    // 3. Update each sprint in Notion
    console.log('📋 Updating Notion Sprint Tracking...\n');
    for (const sprint of Object.values(sprints)) {
      await updateSprintTracking(sprint);
      await storeSnapshot(sprint); // Also store in Supabase
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SPRINT SYNC COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 Synced ${Object.keys(sprints).length} sprints:`);
    Object.values(sprints).forEach((sprint) => {
      console.log(`  - ${sprint.name}: ${sprint.done}/${sprint.total} (${sprint.completionPercentage}%)`);
    });

    console.log('\n📋 Next: Check Notion Sprint Tracking database');
    console.log(`   URL: https://www.notion.so/${dbIds.sprintTracking.replace(/-/g, '')}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
