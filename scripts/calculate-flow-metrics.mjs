#!/usr/bin/env node

/**
 * Calculate Flow Metrics
 *
 * Analyzes GitHub Project issues to calculate:
 * - Cycle Time (commit → merged)
 * - Work In Progress (WIP)
 * - Flow Efficiency
 * - Throughput (issues completed)
 * - Bottleneck detection
 */

import '../lib/load-env.mjs';
import { graphql } from '@octokit/graphql';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PROJECT_ID = process.env.GITHUB_PROJECT_ID;

const graphqlWithAuth = graphql.defaults({
  headers: { authorization: `bearer ${GITHUB_TOKEN}` }
});

/**
 * Get field value from item
 */
function getFieldValue(item, fieldName) {
  const field = item.fieldValues.nodes.find(f => f.field?.name === fieldName);
  return field?.name || field?.number || field?.text || null;
}

/**
 * Get all issues from GitHub Project with timeline data
 */
async function getProjectIssuesWithTimeline(sprintName = null) {
  console.log('📊 Fetching issues with timeline data...\n');

  const result = await graphqlWithAuth(`
    query {
      node(id: "${PROJECT_ID}") {
        ... on ProjectV2 {
          items(first: 100) {
            nodes {
              id
              createdAt
              content {
                ... on Issue {
                  number
                  title
                  createdAt
                  updatedAt
                  closedAt
                  state
                  url
                  repository {
                    name
                  }
                  timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT, CLOSED_EVENT, REOPENED_EVENT]) {
                    nodes {
                      __typename
                      ... on CrossReferencedEvent {
                        createdAt
                        source {
                          ... on PullRequest {
                            number
                            state
                            createdAt
                            mergedAt
                            closedAt
                          }
                        }
                      }
                      ... on ClosedEvent {
                        createdAt
                      }
                      ... on ReopenedEvent {
                        createdAt
                      }
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
                  ... on ProjectV2ItemFieldNumberValue {
                    number
                    field {
                      ... on ProjectV2Field {
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
  `);

  let items = result.node.items.nodes.filter(item => item.content);

  // Filter by sprint if specified
  if (sprintName) {
    items = items.filter(item => {
      const sprint = getFieldValue(item, 'Sprint');
      return sprint === sprintName;
    });
  }

  return items;
}

/**
 * Calculate cycle time for an issue
 * Cycle time = First commit (PR created) → Merged
 */
function calculateCycleTime(issue) {
  const firstPR = issue.timelineItems.nodes.find(
    event => event.__typename === 'CrossReferencedEvent' &&
             event.source?.createdAt
  );

  if (!firstPR?.source?.mergedAt) {
    return null; // Not merged yet
  }

  const started = new Date(firstPR.source.createdAt);
  const merged = new Date(firstPR.source.mergedAt);

  const hours = (merged - started) / (1000 * 60 * 60);
  return hours;
}

/**
 * Calculate lead time for an issue
 * Lead time = Issue created → Closed
 */
function calculateLeadTime(issue) {
  if (!issue.closedAt) {
    return null; // Not closed yet
  }

  const created = new Date(issue.createdAt);
  const closed = new Date(issue.closedAt);

  const hours = (closed - created) / (1000 * 60 * 60);
  return hours;
}

/**
 * Calculate time in current status
 */
function calculateTimeInStatus(item) {
  const now = new Date();
  const updated = new Date(item.content.updatedAt);
  const hours = (now - updated) / (1000 * 60 * 60);
  return hours;
}

/**
 * Calculate all metrics for a sprint
 */
async function calculateSprintMetrics(sprintName) {
  const items = await getProjectIssuesWithTimeline(sprintName);

  console.log(`📋 Analyzing ${items.length} issues in "${sprintName}"\n`);

  const metrics = {
    sprint: sprintName,
    totalIssues: items.length,
    completed: 0,
    inProgress: 0,
    todo: 0,
    blocked: 0,
    cycleTimes: [],
    leadTimes: [],
    wipItems: [],
    blockedItems: [],
    completedItems: [],
    slowestItems: [],
    fastestItems: [],
  };

  // Analyze each issue
  items.forEach(item => {
    const issue = item.content;
    const status = getFieldValue(item, 'Status');
    const effort = getFieldValue(item, 'Effort');

    // Count by status
    if (status === 'Done') {
      metrics.completed++;
      metrics.completedItems.push({
        number: issue.number,
        title: issue.title,
        url: issue.url,
        effort,
        cycleTime: calculateCycleTime(issue),
        leadTime: calculateLeadTime(issue),
      });
    } else if (status === 'In Progress') {
      metrics.inProgress++;
      const timeInStatus = calculateTimeInStatus(item);
      metrics.wipItems.push({
        number: issue.number,
        title: issue.title,
        url: issue.url,
        effort,
        hoursInProgress: timeInStatus,
        daysInProgress: Math.floor(timeInStatus / 24),
      });
    } else if (status === 'Blocked') {
      metrics.blocked++;
      const timeInStatus = calculateTimeInStatus(item);
      metrics.blockedItems.push({
        number: issue.number,
        title: issue.title,
        url: issue.url,
        effort,
        hoursBlocked: timeInStatus,
        daysBlocked: Math.floor(timeInStatus / 24),
      });
    } else {
      metrics.todo++;
    }

    // Collect cycle times
    const cycleTime = calculateCycleTime(issue);
    if (cycleTime !== null) {
      metrics.cycleTimes.push(cycleTime);
    }

    // Collect lead times
    const leadTime = calculateLeadTime(issue);
    if (leadTime !== null) {
      metrics.leadTimes.push(leadTime);
    }
  });

  // Calculate averages
  metrics.avgCycleTime = metrics.cycleTimes.length > 0
    ? metrics.cycleTimes.reduce((a, b) => a + b, 0) / metrics.cycleTimes.length
    : null;

  metrics.avgLeadTime = metrics.leadTimes.length > 0
    ? metrics.leadTimes.reduce((a, b) => a + b, 0) / metrics.leadTimes.length
    : null;

  // Sort items
  metrics.wipItems.sort((a, b) => b.hoursInProgress - a.hoursInProgress);
  metrics.blockedItems.sort((a, b) => b.hoursBlocked - a.hoursBlocked);

  // Find fastest and slowest
  const withCycleTime = metrics.completedItems.filter(i => i.cycleTime !== null);
  metrics.fastestItems = withCycleTime
    .sort((a, b) => a.cycleTime - b.cycleTime)
    .slice(0, 3);
  metrics.slowestItems = withCycleTime
    .sort((a, b) => b.cycleTime - a.cycleTime)
    .slice(0, 3);

  // Calculate completion percentage
  metrics.completionPercentage = metrics.totalIssues > 0
    ? Math.round((metrics.completed / metrics.totalIssues) * 100)
    : 0;

  // Calculate throughput (issues per week)
  // Assuming 30-day sprint = ~4.3 weeks
  metrics.throughputPerWeek = metrics.completed / 4.3;

  // Flow efficiency (time actively working / total time)
  // Simplified: assume 8 hours active per day
  if (metrics.avgLeadTime !== null && metrics.avgCycleTime !== null) {
    metrics.flowEfficiency = Math.round((metrics.avgCycleTime / metrics.avgLeadTime) * 100);
  } else {
    metrics.flowEfficiency = null;
  }

  return metrics;
}

/**
 * Display metrics in console
 */
function displayMetrics(metrics) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 Developer Momentum - ${metrics.sprint}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📊 SPRINT OVERVIEW');
  console.log('─────────────────');
  console.log(`Total Issues:       ${metrics.totalIssues}`);
  console.log(`Completed:          ${metrics.completed} (${metrics.completionPercentage}%)`);
  console.log(`In Progress:        ${metrics.inProgress}`);
  console.log(`Todo:               ${metrics.todo}`);
  console.log(`Blocked:            ${metrics.blocked}\n`);

  console.log('⚡ VELOCITY METRICS');
  console.log('──────────────────');
  if (metrics.avgCycleTime !== null) {
    const days = Math.floor(metrics.avgCycleTime / 24);
    const hours = Math.floor(metrics.avgCycleTime % 24);
    console.log(`Avg Cycle Time:     ${days}d ${hours}h`);
  } else {
    console.log(`Avg Cycle Time:     N/A (no completed issues with PRs)`);
  }

  if (metrics.avgLeadTime !== null) {
    const days = Math.floor(metrics.avgLeadTime / 24);
    const hours = Math.floor(metrics.avgLeadTime % 24);
    console.log(`Avg Lead Time:      ${days}d ${hours}h`);
  } else {
    console.log(`Avg Lead Time:      N/A`);
  }

  console.log(`Throughput:         ${metrics.throughputPerWeek.toFixed(1)} issues/week`);

  if (metrics.flowEfficiency !== null) {
    console.log(`Flow Efficiency:    ${metrics.flowEfficiency}%\n`);
  } else {
    console.log(`Flow Efficiency:    N/A\n`);
  }

  console.log('🔥 WORK IN PROGRESS');
  console.log('───────────────────');
  if (metrics.wipItems.length === 0) {
    console.log('✅ No items in progress\n');
  } else {
    metrics.wipItems.forEach(item => {
      console.log(`#${item.number}: ${item.title.substring(0, 50)}...`);
      console.log(`   In progress for: ${item.daysInProgress} days (${Math.floor(item.hoursInProgress)}h)`);
    });
    console.log();
  }

  if (metrics.blockedItems.length > 0) {
    console.log('⚠️  BLOCKED ITEMS');
    console.log('─────────────────');
    metrics.blockedItems.forEach(item => {
      console.log(`#${item.number}: ${item.title.substring(0, 50)}...`);
      console.log(`   Blocked for: ${item.daysBlocked} days`);
    });
    console.log();
  }

  if (metrics.fastestItems.length > 0) {
    console.log('🚀 FASTEST COMPLETIONS');
    console.log('──────────────────────');
    metrics.fastestItems.forEach((item, i) => {
      const hours = Math.floor(item.cycleTime);
      console.log(`${i + 1}. #${item.number} - ${hours}h cycle time`);
    });
    console.log();
  }

  if (metrics.slowestItems.length > 0) {
    console.log('🐌 SLOWEST COMPLETIONS');
    console.log('──────────────────────');
    metrics.slowestItems.forEach((item, i) => {
      const days = Math.floor(item.cycleTime / 24);
      const hours = Math.floor(item.cycleTime % 24);
      console.log(`${i + 1}. #${item.number} - ${days}d ${hours}h cycle time`);
    });
    console.log();
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const sprintArg = args.find(arg => arg.startsWith('--sprint='));
  const sprintName = sprintArg ? sprintArg.split('=')[1] : 'Sprint 2';

  console.log('📊 Calculate Flow Metrics\n');

  const metrics = await calculateSprintMetrics(sprintName);
  displayMetrics(metrics);

  // Return metrics for use by other scripts
  return metrics;
}

// Export for use by other scripts
export { calculateSprintMetrics };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
