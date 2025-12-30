#!/usr/bin/env node

/**
 * Knowledge Capture System
 *
 * Automatically extracts and documents learnings from:
 * - Completed issues (what worked, what didn't)
 * - PR comments and review threads
 * - Commit messages with key insights
 * - Patterns in successful vs stuck issues
 *
 * Creates knowledge base pages in Notion for:
 * - Technical decisions and rationale
 * - Recurring patterns and solutions
 * - Process improvements
 * - Sprint retrospective insights
 */

import '../lib/load-env.mjs';
import { graphql } from '@octokit/graphql';
import { execSync } from 'child_process';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_PROJECT_ID = process.env.GITHUB_PROJECT_ID;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';

const graphqlWithAuth = graphql.defaults({
  headers: { authorization: `bearer ${GITHUB_TOKEN}` }
});

/**
 * Extract learnings from recently completed issues
 */
async function extractCompletedIssueLearnings(sprintName) {
  console.log(`🔍 Analyzing completed issues in ${sprintName}...\n`);

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
                  body
                  comments(first: 50) {
                    nodes {
                      body
                      author {
                        login
                      }
                    }
                  }
                  labels(first: 10) {
                    nodes {
                      name
                    }
                  }
                  closedAt
                }
              }
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field {
                      ... on ProjectV2Field {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field {
                      ... on ProjectV2SingleSelectField {
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

  const result = await graphqlWithAuth(query, { projectId: GITHUB_PROJECT_ID });
  const items = result.node.items.nodes;

  const learnings = [];

  for (const item of items) {
    if (!item.content) continue;

    const issue = item.content;

    // Get sprint field
    const sprintField = item.fieldValues.nodes.find(
      f => f.field?.name === 'Sprint'
    );
    const sprint = sprintField?.text || sprintField?.name;

    // Get status field
    const statusField = item.fieldValues.nodes.find(
      f => f.field?.name === 'Status'
    );
    const status = statusField?.name;

    // Only look at completed issues in this sprint
    if (sprint !== sprintName || status !== 'Done') continue;

    // Extract insights from comments
    const insights = [];

    for (const comment of issue.comments.nodes) {
      const body = comment.body.toLowerCase();

      // Look for learning keywords
      if (
        body.includes('learned') ||
        body.includes('discovery') ||
        body.includes('found that') ||
        body.includes('turns out') ||
        body.includes('realized')
      ) {
        insights.push({
          type: 'learning',
          text: comment.body,
          author: comment.author?.login
        });
      }

      // Look for decision keywords
      if (
        body.includes('decided to') ||
        body.includes('chose to') ||
        body.includes('went with') ||
        body.includes('opted for')
      ) {
        insights.push({
          type: 'decision',
          text: comment.body,
          author: comment.author?.login
        });
      }

      // Look for problem/solution patterns
      if (
        body.includes('problem was') ||
        body.includes('issue was') ||
        body.includes('fix was to') ||
        body.includes('solution was')
      ) {
        insights.push({
          type: 'solution',
          text: comment.body,
          author: comment.author?.login
        });
      }
    }

    if (insights.length > 0) {
      learnings.push({
        issue: issue.number,
        title: issue.title,
        insights,
        labels: issue.labels.nodes.map(l => l.name),
        closedAt: issue.closedAt
      });
    }
  }

  return learnings;
}

/**
 * Analyze commit messages for insights
 */
function extractCommitInsights(days = 7) {
  console.log(`📝 Analyzing commit messages from last ${days} days...\n`);

  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const commits = execSync(
      `git log --since="${since.toISOString()}" --pretty=format:"%s|||%b"`,
      { encoding: 'utf8' }
    ).trim();

    if (!commits) return [];

    const insights = [];

    commits.split('\n').forEach(line => {
      const [subject, body] = line.split('|||');
      const fullMessage = (subject + ' ' + body).toLowerCase();

      // Look for refactoring insights
      if (fullMessage.includes('refactor')) {
        insights.push({
          type: 'refactoring',
          subject,
          body,
          category: 'code_quality'
        });
      }

      // Look for performance improvements
      if (
        fullMessage.includes('optimi') ||
        fullMessage.includes('performance') ||
        fullMessage.includes('faster')
      ) {
        insights.push({
          type: 'performance',
          subject,
          body,
          category: 'optimization'
        });
      }

      // Look for bug fixes with learnings
      if (fullMessage.includes('fix:') || fullMessage.includes('bug:')) {
        insights.push({
          type: 'bug_fix',
          subject,
          body,
          category: 'debugging'
        });
      }
    });

    return insights;
  } catch (error) {
    console.error('Failed to analyze commits:', error.message);
    return [];
  }
}

/**
 * Identify recurring patterns in issues
 */
async function identifyPatterns(sprintName) {
  console.log(`🔍 Identifying patterns in ${sprintName}...\n`);

  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: 100) {
            nodes {
              content {
                ... on Issue {
                  number
                  title
                  labels(first: 10) {
                    nodes {
                      name
                    }
                  }
                  closedAt
                  createdAt
                }
              }
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field {
                      ... on ProjectV2Field {
                        name
                      }
                    }
                  }
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

  const result = await graphqlWithAuth(query, { projectId: GITHUB_PROJECT_ID });
  const items = result.node.items.nodes.filter(item => {
    if (!item.content) return false;

    const sprintField = item.fieldValues.nodes.find(
      f => f.field?.name === 'Sprint'
    );
    const sprint = sprintField?.text || sprintField?.name;

    return sprint === sprintName;
  });

  const patterns = {
    labelFrequency: {},
    avgCycleTimeByLabel: {},
    commonBlockers: [],
    quickWins: []
  };

  for (const item of items) {
    const issue = item.content;
    const labels = issue.labels.nodes.map(l => l.name);

    // Count label frequency
    labels.forEach(label => {
      patterns.labelFrequency[label] = (patterns.labelFrequency[label] || 0) + 1;
    });

    // Calculate cycle time by label (if closed)
    if (issue.closedAt) {
      const created = new Date(issue.createdAt);
      const closed = new Date(issue.closedAt);
      const cycleTime = (closed - created) / (1000 * 60 * 60); // hours

      labels.forEach(label => {
        if (!patterns.avgCycleTimeByLabel[label]) {
          patterns.avgCycleTimeByLabel[label] = { total: 0, count: 0 };
        }
        patterns.avgCycleTimeByLabel[label].total += cycleTime;
        patterns.avgCycleTimeByLabel[label].count++;
      });

      // Identify quick wins (< 8 hours)
      if (cycleTime < 8) {
        patterns.quickWins.push({
          number: issue.number,
          title: issue.title,
          cycleTime: Math.round(cycleTime * 10) / 10,
          labels
        });
      }
    }

    // Look for blocked issues
    const statusField = item.fieldValues.nodes.find(
      f => f.field?.name === 'Status'
    );
    if (statusField?.name === 'Blocked') {
      patterns.commonBlockers.push({
        number: issue.number,
        title: issue.title,
        labels
      });
    }
  }

  // Calculate averages
  for (const label in patterns.avgCycleTimeByLabel) {
    const data = patterns.avgCycleTimeByLabel[label];
    patterns.avgCycleTimeByLabel[label] = Math.round((data.total / data.count) * 10) / 10;
  }

  return patterns;
}

/**
 * Create or update knowledge base page in Notion
 */
async function updateKnowledgeBase(sprintName, learnings, commitInsights, patterns) {
  console.log(`📚 Updating knowledge base in Notion...\n`);

  const PARENT_PAGE_ID = '2d5ebcf9-81cf-8042-9f40-ef7b39b39ca1';

  // Search for existing knowledge base
  const searchResponse = await fetch(
    'https://api.notion.com/v1/search',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION
      },
      body: JSON.stringify({
        query: `${sprintName} - Knowledge Base`,
        filter: { property: 'object', value: 'page' }
      })
    }
  );

  const searchData = await searchResponse.json();
  let pageId;

  if (searchData.results && searchData.results.length > 0) {
    pageId = searchData.results[0].id;
    console.log('✅ Found existing knowledge base page\n');
  } else {
    // Create new page
    const createResponse = await fetch(
      'https://api.notion.com/v1/pages',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': NOTION_VERSION
        },
        body: JSON.stringify({
          parent: { page_id: PARENT_PAGE_ID },
          icon: { emoji: '📚' },
          properties: {
            title: {
              title: [{ text: { content: `${sprintName} - Knowledge Base` } }]
            }
          }
        })
      }
    );

    const createData = await createResponse.json();
    pageId = createData.id;
    console.log('✅ Created new knowledge base page\n');
  }

  // Generate content blocks
  const blocks = [];

  // Header
  blocks.push({
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [{ text: { content: `📚 ${sprintName} - Knowledge Base` } }]
    }
  });

  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{
        text: { content: `Last updated: ${new Date().toLocaleString()}` },
        annotations: { color: 'gray' }
      }]
    }
  });

  blocks.push({ object: 'block', type: 'divider', divider: {} });

  // Learnings from issues
  if (learnings.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '💡 Key Learnings' } }]
      }
    });

    learnings.forEach(learning => {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [
            { text: { content: `#${learning.issue}` }, annotations: { code: true } },
            { text: { content: ` ${learning.title}` } }
          ]
        }
      });

      learning.insights.forEach(insight => {
        const emoji = insight.type === 'learning' ? '📝' :
                      insight.type === 'decision' ? '🎯' : '✅';

        blocks.push({
          object: 'block',
          type: 'callout',
          callout: {
            icon: { emoji },
            color: insight.type === 'learning' ? 'blue_background' :
                   insight.type === 'decision' ? 'purple_background' : 'green_background',
            rich_text: [
              { text: { content: insight.text.substring(0, 2000) } }
            ]
          }
        });
      });
    });

    blocks.push({ object: 'block', type: 'divider', divider: {} });
  }

  // Commit insights
  if (commitInsights.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '🔧 Technical Improvements' } }]
      }
    });

    // Group by category
    const byCategory = {};
    commitInsights.forEach(insight => {
      if (!byCategory[insight.category]) {
        byCategory[insight.category] = [];
      }
      byCategory[insight.category].push(insight);
    });

    for (const [category, insights] of Object.entries(byCategory)) {
      const emoji = category === 'code_quality' ? '✨' :
                    category === 'optimization' ? '🚀' : '🐛';

      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{
            text: { content: `${emoji} ${category.replace('_', ' ').toUpperCase()}` }
          }]
        }
      });

      insights.slice(0, 5).forEach(insight => {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ text: { content: insight.subject } }]
          }
        });
      });
    }

    blocks.push({ object: 'block', type: 'divider', divider: {} });
  }

  // Patterns
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ text: { content: '📊 Patterns & Insights' } }]
    }
  });

  // Most common labels
  if (Object.keys(patterns.labelFrequency).length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ text: { content: '🏷️ Most Common Labels' } }]
      }
    });

    const sortedLabels = Object.entries(patterns.labelFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    sortedLabels.forEach(([label, count]) => {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { text: { content: label }, annotations: { bold: true } },
            { text: { content: ` - ${count} issue(s)` } }
          ]
        }
      });
    });
  }

  // Cycle time by label
  if (Object.keys(patterns.avgCycleTimeByLabel).length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ text: { content: '⏱️ Average Cycle Time by Label' } }]
      }
    });

    const sortedCycleTimes = Object.entries(patterns.avgCycleTimeByLabel)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 5);

    sortedCycleTimes.forEach(([label, hours]) => {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      const timeStr = days > 0 ? `${days}d ${remainingHours}h` : `${remainingHours}h`;

      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { text: { content: label }, annotations: { bold: true } },
            { text: { content: ` - ${timeStr}` } }
          ]
        }
      });
    });
  }

  // Quick wins
  if (patterns.quickWins.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ text: { content: '🚀 Quick Wins (< 8h)' } }],
        color: 'green'
      }
    });

    patterns.quickWins.slice(0, 5).forEach(win => {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { text: { content: `#${win.number}` }, annotations: { code: true } },
            { text: { content: ` ${win.title}` } },
            { text: { content: ` - ${win.cycleTime}h` }, annotations: { color: 'green' } }
          ]
        }
      });
    });
  }

  // Clear existing content and add new blocks
  const getBlocksResponse = await fetch(
    `https://api.notion.com/v1/blocks/${pageId}/children`,
    {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_VERSION
      }
    }
  );

  const blocksData = await getBlocksResponse.json();

  for (const block of blocksData.results || []) {
    await fetch(
      `https://api.notion.com/v1/blocks/${block.id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': NOTION_VERSION
        }
      }
    );
  }

  // Add new blocks in batches
  const batchSize = 100;
  for (let i = 0; i < blocks.length; i += batchSize) {
    const batch = blocks.slice(i, i + batchSize);

    await fetch(
      `https://api.notion.com/v1/blocks/${pageId}/children`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': NOTION_VERSION
        },
        body: JSON.stringify({ children: batch })
      }
    );
  }

  return pageId;
}

/**
 * Main
 */
async function main() {
  console.log('📚 Knowledge Capture System\n');

  const args = process.argv.slice(2);
  const sprintArg = args.find(arg => arg.startsWith('--sprint='));
  const sprintName = sprintArg ? sprintArg.split('=')[1] : 'Sprint 2';

  // Extract learnings
  const learnings = await extractCompletedIssueLearnings(sprintName);
  console.log(`✅ Found ${learnings.length} issue(s) with insights\n`);

  // Extract commit insights
  const commitInsights = extractCommitInsights(7);
  console.log(`✅ Found ${commitInsights.length} commit insight(s)\n`);

  // Identify patterns
  const patterns = await identifyPatterns(sprintName);
  console.log(`✅ Identified patterns:\n`);
  console.log(`   • ${Object.keys(patterns.labelFrequency).length} unique label(s)`);
  console.log(`   • ${patterns.quickWins.length} quick win(s)`);
  console.log(`   • ${patterns.commonBlockers.length} blocker(s)\n`);

  // Update knowledge base
  const pageId = await updateKnowledgeBase(sprintName, learnings, commitInsights, patterns);

  console.log('✅ Knowledge base updated!\n');
  console.log(`🔗 View: https://www.notion.so/${pageId.replace(/-/g, '')}\n`);

  // Summary
  console.log('📊 Summary:\n');
  if (learnings.length > 0) {
    console.log(`   💡 ${learnings.length} key learning(s) documented`);
  }
  if (commitInsights.length > 0) {
    console.log(`   🔧 ${commitInsights.length} technical improvement(s) noted`);
  }
  if (patterns.quickWins.length > 0) {
    console.log(`   🚀 ${patterns.quickWins.length} quick win(s) identified`);
  }
  console.log('');
}

main().catch(console.error);
