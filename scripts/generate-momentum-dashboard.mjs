#!/usr/bin/env node

/**
 * Generate Momentum Dashboard in Notion
 *
 * Creates a beautiful dashboard page showing:
 * - Real-time flow metrics
 * - Sprint progress
 * - Velocity trends
 * - Bottleneck alerts
 * - Actionable insights
 */

import '../lib/load-env.mjs';
import { calculateSprintMetrics } from './calculate-flow-metrics.mjs';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';

/**
 * Get or create dashboard page in Notion
 */
async function getOrCreateDashboard() {
  const PARENT_PAGE_ID = '2d5ebcf9-81cf-8042-9f40-ef7b39b39ca1'; // GitHub Issues database parent

  // Search for existing dashboard
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
        query: 'Developer Momentum Dashboard',
        filter: { property: 'object', value: 'page' }
      })
    }
  );

  const searchData = await searchResponse.json();

  if (searchData.results && searchData.results.length > 0) {
    return searchData.results[0].id;
  }

  // Create new dashboard page
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
        icon: { emoji: '🚀' },
        properties: {
          title: {
            title: [{ text: { content: 'Developer Momentum Dashboard' } }]
          }
        }
      })
    }
  );

  const createData = await createResponse.json();
  return createData.id;
}

/**
 * Generate dashboard content blocks from metrics
 */
function generateDashboardBlocks(metrics) {
  const blocks = [];

  // Header
  blocks.push({
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [{ text: { content: `🚀 Developer Momentum - ${metrics.sprint}` } }],
      color: 'blue'
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

  // Sprint Overview
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ text: { content: '📊 Sprint Overview' } }]
    }
  });

  const completionBar = '█'.repeat(Math.floor(metrics.completionPercentage / 10)) +
                        '░'.repeat(10 - Math.floor(metrics.completionPercentage / 10));

  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      icon: { emoji: '🎯' },
      color: metrics.completionPercentage >= 80 ? 'green_background' :
             metrics.completionPercentage >= 50 ? 'yellow_background' : 'red_background',
      rich_text: [{
        text: {
          content: `Progress: ${completionBar} ${metrics.completed}/${metrics.totalIssues} (${metrics.completionPercentage}%)`
        }
      }]
    }
  });

  // Status breakdown
  const statusText = [
    `✅ Done: ${metrics.completed}`,
    `🔄 In Progress: ${metrics.inProgress}`,
    `📋 Todo: ${metrics.todo}`,
    metrics.blocked > 0 ? `🚫 Blocked: ${metrics.blocked}` : null
  ].filter(Boolean).join('  •  ');

  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ text: { content: statusText } }]
    }
  });

  blocks.push({ object: 'block', type: 'divider', divider: {} });

  // Velocity Metrics
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ text: { content: '⚡ Velocity Metrics' } }]
    }
  });

  const metricsText = [];

  if (metrics.avgCycleTime !== null) {
    const days = Math.floor(metrics.avgCycleTime / 24);
    const hours = Math.floor(metrics.avgCycleTime % 24);
    const cycleColor = metrics.avgCycleTime < 24 ? 'green' :
                       metrics.avgCycleTime < 72 ? 'yellow' : 'red';
    metricsText.push({
      text: { content: `Cycle Time: ${days}d ${hours}h` },
      annotations: { bold: true, color: cycleColor }
    });
    metricsText.push({ text: { content: '  (commit → merged)\n' } });
  }

  if (metrics.avgLeadTime !== null) {
    const days = Math.floor(metrics.avgLeadTime / 24);
    const hours = Math.floor(metrics.avgLeadTime % 24);
    metricsText.push({ text: { content: `Lead Time: ${days}d ${hours}h` }, annotations: { bold: true } });
    metricsText.push({ text: { content: '  (created → closed)\n' } });
  }

  metricsText.push({
    text: { content: `Throughput: ${metrics.throughputPerWeek.toFixed(1)} issues/week` },
    annotations: { bold: true }
  });
  metricsText.push({ text: { content: '\n' } });

  if (metrics.flowEfficiency !== null) {
    const effColor = metrics.flowEfficiency >= 40 ? 'green' :
                     metrics.flowEfficiency >= 25 ? 'yellow' : 'red';
    metricsText.push({
      text: { content: `Flow Efficiency: ${metrics.flowEfficiency}%` },
      annotations: { bold: true, color: effColor }
    });
    metricsText.push({ text: { content: '  (active work / total time)' } });
  }

  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: metricsText }
  });

  blocks.push({ object: 'block', type: 'divider', divider: {} });

  // Work in Progress
  if (metrics.wipItems.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '🔥 Work In Progress' } }]
      }
    });

    const wipWarning = metrics.inProgress > 3 ? 'red_background' :
                       metrics.inProgress > 2 ? 'yellow_background' : 'green_background';

    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        icon: { emoji: '📊' },
        color: wipWarning,
        rich_text: [{
          text: {
            content: `WIP Limit: ${metrics.inProgress}/3 ` +
                    (metrics.inProgress > 3 ? '⚠️ Too many!' :
                     metrics.inProgress > 2 ? '⚠️ At limit' : '✅ Healthy')
          }
        }]
      }
    });

    // List WIP items
    metrics.wipItems.forEach(item => {
      const isStuck = item.daysInProgress > 3;
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { text: { content: `#${item.number}` }, annotations: { code: true } },
            { text: { content: ` ${item.title.substring(0, 60)}${item.title.length > 60 ? '...' : ''}` } },
            { text: { content: ` - ${item.daysInProgress} days` },
              annotations: { color: isStuck ? 'red' : 'default' } },
            isStuck ? { text: { content: ' ⚠️ May be stuck!' }, annotations: { bold: true, color: 'red' } } : null
          ].filter(Boolean)
        }
      });
    });

    blocks.push({ object: 'block', type: 'divider', divider: {} });
  }

  // Blocked items
  if (metrics.blockedItems.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '🚫 Blocked Items' } }],
        color: 'red'
      }
    });

    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        icon: { emoji: '⚠️' },
        color: 'red_background',
        rich_text: [{
          text: { content: `${metrics.blockedItems.length} item(s) blocked - immediate attention needed!` }
        }]
      }
    });

    metrics.blockedItems.forEach(item => {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { text: { content: `#${item.number}` }, annotations: { code: true } },
            { text: { content: ` ${item.title}` } },
            { text: { content: ` - blocked for ${item.daysBlocked} days` }, annotations: { color: 'red' } }
          ]
        }
      });
    });

    blocks.push({ object: 'block', type: 'divider', divider: {} });
  }

  // Fastest completions
  if (metrics.fastestItems.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '🚀 Fastest Completions' } }],
        color: 'green'
      }
    });

    metrics.fastestItems.forEach((item, i) => {
      const hours = Math.floor(item.cycleTime);
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [
            { text: { content: `#${item.number}` }, annotations: { code: true } },
            { text: { content: ` - ${hours}h cycle time` }, annotations: { color: 'green', bold: true } },
            { text: { content: ` 🎉` } }
          ]
        }
      });
    });

    blocks.push({ object: 'block', type: 'divider', divider: {} });
  }

  // Insights
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ text: { content: '💡 Insights' } }]
    }
  });

  const insights = [];

  // Completion rate insight
  if (metrics.completionPercentage >= 80) {
    insights.push(`✅ Excellent progress! You're ${metrics.completionPercentage}% through the sprint.`);
  } else if (metrics.completionPercentage >= 50) {
    insights.push(`📊 On track! ${metrics.completionPercentage}% complete, keep the momentum!`);
  } else {
    insights.push(`⚠️ Need to accelerate! Only ${metrics.completionPercentage}% complete.`);
  }

  // WIP insight
  if (metrics.inProgress === 0) {
    insights.push(`🎯 No active work - time to pick up the next issue!`);
  } else if (metrics.inProgress <= 2) {
    insights.push(`✅ WIP is healthy (${metrics.inProgress} issues) - good focus!`);
  } else if (metrics.inProgress === 3) {
    insights.push(`⚠️ At WIP limit (3 issues) - finish before starting new work.`);
  } else {
    insights.push(`🚨 Too much WIP (${metrics.inProgress} issues) - focus on completing existing work!`);
  }

  // Cycle time insight
  if (metrics.avgCycleTime !== null) {
    if (metrics.avgCycleTime < 24) {
      insights.push(`🚀 Blazing fast cycle time (${Math.floor(metrics.avgCycleTime)}h) - keep it up!`);
    } else if (metrics.avgCycleTime < 72) {
      insights.push(`✅ Good cycle time (${Math.floor(metrics.avgCycleTime / 24)}d) - shipping efficiently.`);
    } else {
      insights.push(`🐌 Slow cycle time (${Math.floor(metrics.avgCycleTime / 24)}d) - look for bottlenecks.`);
    }
  }

  // Blocked insight
  if (metrics.blocked === 0) {
    insights.push(`✅ No blocked items - smooth sailing!`);
  } else {
    insights.push(`🚫 ${metrics.blocked} blocked item(s) - unblock these ASAP!`);
  }

  insights.forEach(insight => {
    blocks.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: insight } }]
      }
    });
  });

  return blocks;
}

/**
 * Update dashboard page with new content
 */
async function updateDashboard(pageId, metrics) {
  // First, delete existing content
  console.log('📝 Clearing old dashboard content...');

  // Get existing blocks
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

  // Delete each block
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

  // Generate new content
  console.log('✨ Generating new dashboard content...');
  const blocks = generateDashboardBlocks(metrics);

  // Notion API limits blocks to 100 per request, send in batches
  const batchSize = 100;
  for (let i = 0; i < blocks.length; i += batchSize) {
    const batch = blocks.slice(i, i + batchSize);

    const updateResponse = await fetch(
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

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      console.error('❌ Failed to update dashboard:', error);
      throw new Error('Dashboard update failed');
    }
  }

  return pageId;
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Generate Momentum Dashboard\n');

  const args = process.argv.slice(2);
  const sprintArg = args.find(arg => arg.startsWith('--sprint='));
  const sprintName = sprintArg ? sprintArg.split('=')[1] : 'Sprint 2';

  // Calculate metrics
  console.log(`📊 Calculating metrics for "${sprintName}"...\n`);
  const metrics = await calculateSprintMetrics(sprintName);

  // Get or create dashboard
  console.log('📄 Finding dashboard page...\n');
  const pageId = await getOrCreateDashboard();

  // Update dashboard
  await updateDashboard(pageId, metrics);

  console.log('\n✅ Dashboard updated successfully!\n');
  console.log(`🔗 View: https://www.notion.so/${pageId.replace(/-/g, '')}\n`);
}

main().catch(console.error);
