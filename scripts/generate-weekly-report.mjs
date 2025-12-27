#!/usr/bin/env node

/**
 * Generate Weekly Report
 *
 * Runs every Friday at 5 PM to:
 * 1. Aggregate this week's completed work from GitHub
 * 2. Get deployment stats
 * 3. Calculate velocity
 * 4. Generate report in Notion Weekly Reports database
 * 5. Create email HTML and blog draft (future: auto-send)
 *
 * Usage: node generate-weekly-report.mjs
 */

import { graphql } from '@octokit/graphql';
import fs from 'fs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_PROJECT_ID = process.env.GITHUB_PROJECT_ID || 'PVT_kwHOCOopjs4BLVik';
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const API_VERSION = '2022-06-28';

const dbIds = JSON.parse(fs.readFileSync('./config/notion-database-ids.json', 'utf8'));

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `bearer ${GITHUB_TOKEN}`,
  },
});

console.log('📊 Generating Weekly Report...\n');

/**
 * Get week ending date (this Friday)
 */
function getWeekEnding() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday
  const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
  const friday = new Date(today);
  friday.setDate(today.getDate() + daysUntilFriday);
  return friday.toISOString().split('T')[0];
}

/**
 * Get issues completed this week
 */
async function getCompletedIssues() {
  console.log('📥 Fetching completed issues from this week...');

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: 100) {
            nodes {
              id
              content {
                ... on Issue {
                  number
                  title
                  state
                  closedAt
                  url
                  repository {
                    name
                  }
                  labels(first: 10) {
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
  });

  const items = response.node?.items?.nodes || [];

  // Filter to completed this week
  const completed = items.filter((item) => {
    const closedAt = item.content?.closedAt;
    if (!closedAt) return false;

    const closedDate = new Date(closedAt);
    return closedDate >= oneWeekAgo;
  });

  console.log(`  ✅ Found ${completed.length} issues completed this week\n`);
  return completed;
}

/**
 * Get field value helper
 */
function getFieldValue(item, fieldName) {
  const field = item.fieldValues?.nodes?.find(
    (fv) => fv.field?.name === fieldName
  );
  return field?.name || field?.number || null;
}

/**
 * Group completed issues by project
 */
function groupByProject(issues) {
  const byProject = {};

  issues.forEach((item) => {
    const project = getFieldValue(item, 'ACT Project') || 'Other';
    const effort = getFieldValue(item, 'Effort') || 0;

    if (!byProject[project]) {
      byProject[project] = {
        issues: [],
        totalEffort: 0
      };
    }

    byProject[project].issues.push({
      number: item.content.number,
      title: item.content.title,
      url: item.content.url,
      repo: item.content.repository?.name,
      effort
    });

    byProject[project].totalEffort += effort;
  });

  return byProject;
}

/**
 * Generate summary text
 */
function generateSummary(completedIssues, byProject) {
  const projectCount = Object.keys(byProject).length;
  const totalEffort = Object.values(byProject).reduce(
    (sum, p) => sum + p.totalEffort,
    0
  );

  let summary = `Completed ${completedIssues.length} issues across ${projectCount} projects this week. `;
  summary += `Total effort: ${totalEffort} points.\n\n`;

  // Top achievements
  const topProjects = Object.entries(byProject)
    .sort((a, b) => b[1].issues.length - a[1].issues.length)
    .slice(0, 3);

  summary += 'Top achievements:\n';
  topProjects.forEach(([project, data]) => {
    summary += `• ${project}: ${data.issues.length} issues (${data.totalEffort} pts)\n`;
  });

  return summary;
}

/**
 * Generate detailed achievements
 */
function generateAchievements(byProject) {
  let achievements = '';

  Object.entries(byProject).forEach(([project, data]) => {
    achievements += `**${project}**\n`;
    data.issues.forEach((issue) => {
      achievements += `- #${issue.number}: ${issue.title}\n`;
    });
    achievements += '\n';
  });

  return achievements.trim();
}

/**
 * Generate email HTML
 */
function generateEmailHTML(weekEnding, summary, achievements, metrics) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .header { background: #2563eb; color: white; padding: 20px; }
    .content { padding: 20px; }
    .metric { display: inline-block; margin: 10px 20px; }
    .metric-value { font-size: 32px; font-weight: bold; }
    .metric-label { font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>ACT Ecosystem Development - Week Ending ${weekEnding}</h1>
  </div>
  <div class="content">
    <h2>Summary</h2>
    <p>${summary.replace(/\n/g, '<br>')}</p>

    <h2>Metrics</h2>
    <div class="metric">
      <div class="metric-value">${metrics.issuesCompleted}</div>
      <div class="metric-label">Issues Completed</div>
    </div>
    <div class="metric">
      <div class="metric-value">${metrics.pointsCompleted}</div>
      <div class="metric-label">Points Completed</div>
    </div>

    <h2>Achievements</h2>
    <div>${achievements.replace(/\n/g, '<br>')}</div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Create weekly report in Notion
 */
async function createWeeklyReport(weekEnding, completedIssues, byProject) {
  console.log('📝 Creating weekly report in Notion...');

  const summary = generateSummary(completedIssues, byProject);
  const achievements = generateAchievements(byProject);

  const metrics = {
    issuesCompleted: completedIssues.length,
    pointsCompleted: Object.values(byProject).reduce(
      (sum, p) => sum + p.totalEffort,
      0
    )
  };

  const emailHTML = generateEmailHTML(weekEnding, summary, achievements, metrics);

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': API_VERSION
    },
    body: JSON.stringify({
      parent: { database_id: dbIds.weeklyReports },
      properties: {
        'Week Ending': {
          title: [{ text: { content: `Week Ending ${weekEnding}` } }]
        },
        'Report Date': {
          date: { start: new Date().toISOString() }
        },
        'Summary': {
          rich_text: [{ text: { content: summary.substring(0, 2000) } }]
        },
        'Top Achievements': {
          rich_text: [{ text: { content: achievements.substring(0, 2000) } }]
        },
        'Issues Completed': {
          number: metrics.issuesCompleted
        },
        'Points Completed': {
          number: metrics.pointsCompleted
        },
        'Sent': {
          checkbox: false // Will be set to true after sending
        }
      }
    })
  });

  const data = await response.json();

  if (response.ok) {
    console.log('   ✅ Weekly report created\n');

    // Save email HTML to a temp file for reference
    fs.writeFileSync('/tmp/weekly-report.html', emailHTML);
    console.log('   📧 Email HTML saved to /tmp/weekly-report.html\n');

    return data;
  } else {
    console.error('   ❌ Error creating report:', data.message);
    throw new Error(data.message);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const weekEnding = getWeekEnding();
    console.log(`📅 Week Ending: ${weekEnding}\n`);

    // 1. Get completed issues
    const completedIssues = await getCompletedIssues();

    // 2. Group by project
    const byProject = groupByProject(completedIssues);

    // 3. Create report in Notion
    await createWeeklyReport(weekEnding, completedIssues, byProject);

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ WEEKLY REPORT GENERATED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 Week Ending: ${weekEnding}`);
    console.log(`   Issues Completed: ${completedIssues.length}`);
    console.log(`   Projects: ${Object.keys(byProject).length}`);
    console.log(`\n📋 View in Notion: https://www.notion.so/${dbIds.weeklyReports.replace(/-/g, '')}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
