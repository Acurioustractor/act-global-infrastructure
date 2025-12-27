#!/usr/bin/env node

/**
 * Sprint Snapshot Script
 *
 * Captures daily snapshot of sprint progress and stores in Supabase sprint_snapshots table
 * for velocity and burndown chart data.
 *
 * Run daily at 5:00 PM via GitHub Action or manually
 */

import { graphql } from '@octokit/graphql';
import { createClient } from '@supabase/supabase-js';

// Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_PROJECT_ID = process.env.GITHUB_PROJECT_ID || 'PVT_kwHOCOopjs4BLVik';
const GITHUB_ORG = 'Acurioustractor';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Current sprint (make configurable via env or auto-detect)
const CURRENT_SPRINT = process.env.CURRENT_SPRINT || 'Sprint 4';

// Initialize clients
const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `bearer ${GITHUB_TOKEN}`,
  },
});
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

console.log('🚀 Sprint Snapshot Script Starting...');
console.log(`📅 Target Sprint: ${CURRENT_SPRINT}`);
console.log(`📊 GitHub Project: ${GITHUB_PROJECT_ID}`);

/**
 * Fetch all issues from GitHub Project with pagination
 */
async function fetchGitHubProjectItems() {
  console.log('\n📥 Fetching GitHub Project items...');

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
    const totalCount = itemsData?.totalCount || 0;

    allItems.push(...items);
    hasNextPage = itemsData?.pageInfo?.hasNextPage || false;
    cursor = itemsData?.pageInfo?.endCursor;

    console.log(`  Page ${pageCount}: Fetched ${items.length} items (${allItems.length}/${totalCount} total)`);
  }

  console.log(`✅ Fetched ${allItems.length} total items across ${pageCount} page(s)`);
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
 * Calculate sprint metrics
 */
function calculateSprintMetrics(items, sprintName) {
  console.log(`\n📊 Calculating metrics for ${sprintName}...`);

  // Filter to current sprint
  const sprintItems = items.filter((item) => {
    const sprint = getFieldValue(item, 'Sprint');
    return sprint === sprintName;
  });

  console.log(`🔍 Found ${sprintItems.length} issues in ${sprintName}`);

  // Count by status
  let todo = 0;
  let inProgress = 0;
  let done = 0;
  let blocked = 0;

  // Breakdown by repository, type, priority
  const byRepository = {};
  const byType = {};
  const byPriority = {};

  sprintItems.forEach((item) => {
    const status = getFieldValue(item, 'Status');
    const repo = item.content?.repository?.name || 'unknown';
    const type = getFieldValue(item, 'Type');
    const priority = getFieldValue(item, 'Priority');

    // Status counts
    if (status === 'Todo' || status === 'Backlog') {
      todo++;
    } else if (status === 'In Progress') {
      inProgress++;
    } else if (status === 'Done' || status === 'Closed') {
      done++;
    } else if (status === 'Blocked') {
      blocked++;
    }

    // Repository breakdown
    byRepository[repo] = (byRepository[repo] || 0) + 1;

    // Type breakdown
    if (type) {
      byType[type] = (byType[type] || 0) + 1;
    }

    // Priority breakdown
    if (priority) {
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    }
  });

  const total = todo + inProgress + done + blocked;
  const completionPercentage = total > 0 ? Math.round((done / total) * 100 * 100) / 100 : 0;

  const metrics = {
    sprintName,
    sprintNumber: parseInt(sprintName.replace(/\D/g, ''), 10) || 0,
    totalIssues: total,
    todoIssues: todo,
    inProgressIssues: inProgress,
    doneIssues: done,
    blockedIssues: blocked,
    completionPercentage,
    velocity: done, // Velocity = completed issues
    actualRemaining: todo + inProgress + blocked,
    byRepository,
    byType,
    byPriority,
  };

  console.log(`  Total: ${total}`);
  console.log(`  Todo: ${todo}`);
  console.log(`  In Progress: ${inProgress}`);
  console.log(`  Done: ${done}`);
  console.log(`  Blocked: ${blocked}`);
  console.log(`  Completion: ${completionPercentage}%`);

  return metrics;
}

/**
 * Store snapshot in Supabase
 */
async function storeInSupabase(metrics) {
  if (!supabase) {
    console.log('\n⚠️  Supabase not configured, skipping...');
    return null;
  }

  console.log('\n💾 Storing snapshot in Supabase...');

  const snapshotData = {
    sprint_name: metrics.sprintName,
    sprint_number: metrics.sprintNumber,
    snapshot_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    total_issues: metrics.totalIssues,
    todo_issues: metrics.todoIssues,
    in_progress_issues: metrics.inProgressIssues,
    done_issues: metrics.doneIssues,
    blocked_issues: metrics.blockedIssues,
    completion_percentage: metrics.completionPercentage,
    velocity: metrics.velocity,
    actual_remaining: metrics.actualRemaining,
    by_repository: metrics.byRepository,
    by_type: metrics.byType,
    by_priority: metrics.byPriority,
    project_id: GITHUB_PROJECT_ID,
    github_org: GITHUB_ORG,
  };

  const { data, error } = await supabase
    .from('sprint_snapshots')
    .upsert([snapshotData], {
      onConflict: 'sprint_name,snapshot_date',
    })
    .select();

  if (error) {
    console.error('❌ Supabase error:', error.message || JSON.stringify(error, null, 2));
    return null;
  }

  console.log('✅ Snapshot stored in Supabase');
  return data?.[0];
}


/**
 * Main execution
 */
async function main() {
  try {
    // 1. Fetch GitHub Project items
    const items = await fetchGitHubProjectItems();

    // 2. Calculate sprint metrics
    const metrics = calculateSprintMetrics(items, CURRENT_SPRINT);

    // 3. Store in Supabase
    const supabaseResult = await storeInSupabase(metrics);

    // Summary
    console.log('\n✨ Sprint Snapshot Complete!');
    console.log(`   Sprint: ${metrics.sprintName}`);
    console.log(`   Total Issues: ${metrics.totalIssues}`);
    console.log(`   Completed: ${metrics.doneIssues} (${metrics.completionPercentage}%)`);
    console.log(`   Supabase: ${supabaseResult ? '✅' : '⚠️'}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
