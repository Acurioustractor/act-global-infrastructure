#!/usr/bin/env node

/**
 * Generate Momentum Dashboard in Notion
 *
 * Creates a beautiful dashboard page showing:
 * - Real-time flow metrics
 * - Sprint progress
 * - Velocity trends (historical comparison)
 * - Bottleneck alerts
 * - Actionable insights
 * - Week-over-week velocity changes
 * - Sprint-to-sprint comparisons
 */

import '../lib/load-env.mjs';
import { calculateSprintMetrics } from './calculate-flow-metrics.mjs';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VERSION = '2022-06-28';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Load dashboard page ID from config (created by create-momentum-dashboard-page.mjs)
const dbIds = JSON.parse(fs.readFileSync('./config/notion-database-ids.json', 'utf8'));
const DASHBOARD_PAGE_ID = dbIds.momentumDashboard;

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

/**
 * Store snapshot in Supabase for historical tracking
 */
async function storeSnapshot(metrics) {
  if (!supabase) {
    console.log('⚠️  Supabase not configured, skipping snapshot storage');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('sprint_snapshots')
      .insert({
        sprint_name: metrics.sprint,
        snapshot_date: new Date().toISOString(),
        total_issues: metrics.totalIssues,
        completed: metrics.completed,
        in_progress: metrics.inProgress,
        todo: metrics.todo,
        blocked: metrics.blocked,
        completion_percentage: metrics.completionPercentage,
        avg_cycle_time: metrics.avgCycleTime,
        avg_lead_time: metrics.avgLeadTime,
        throughput_per_week: metrics.throughputPerWeek,
        flow_efficiency: metrics.flowEfficiency,
        wip_count: metrics.inProgress
      })
      .select();

    if (error) {
      console.error('Failed to store snapshot:', error.message);
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('Failed to store snapshot:', error.message);
    return null;
  }
}

/**
 * Get historical snapshots for trend analysis
 */
async function getHistoricalSnapshots(sprintName, days = 30) {
  if (!supabase) {
    return [];
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('sprint_snapshots')
      .select('*')
      .eq('sprint_name', sprintName)
      .gte('snapshot_date', cutoffDate.toISOString())
      .order('snapshot_date', { ascending: true });

    if (error) {
      console.error('Failed to fetch snapshots:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch snapshots:', error.message);
    return [];
  }
}

/**
 * Calculate velocity trend from snapshots
 */
function calculateTrends(snapshots) {
  if (snapshots.length < 2) {
    return {
      hasTrend: false,
      completionTrend: 0,
      cycleTimeTrend: 0,
      throughputTrend: 0
    };
  }

  const recent = snapshots[snapshots.length - 1];
  const previous = snapshots[Math.max(0, snapshots.length - 7)]; // Compare to 7 days ago

  const completionTrend = recent.completion_percentage - previous.completion_percentage;
  const cycleTimeTrend = recent.avg_cycle_time && previous.avg_cycle_time
    ? ((recent.avg_cycle_time - previous.avg_cycle_time) / previous.avg_cycle_time) * 100
    : 0;
  const throughputTrend = recent.throughput_per_week && previous.throughput_per_week
    ? ((recent.throughput_per_week - previous.throughput_per_week) / previous.throughput_per_week) * 100
    : 0;

  return {
    hasTrend: true,
    completionTrend: Math.round(completionTrend),
    cycleTimeTrend: Math.round(cycleTimeTrend),
    throughputTrend: Math.round(throughputTrend),
    daysTracked: snapshots.length
  };
}

/**
 * Generate trend sparkline (simple text visualization)
 */
function generateSparkline(snapshots, key) {
  if (snapshots.length < 2) return '';

  const values = snapshots.map(s => s[key]).filter(v => v !== null);
  if (values.length === 0) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) return '━'.repeat(Math.min(values.length, 10));

  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const recent = values.slice(-10); // Last 10 data points

  return recent.map(v => {
    const normalized = (v - min) / range;
    const index = Math.min(Math.floor(normalized * chars.length), chars.length - 1);
    return chars[index];
  }).join('');
}

/**
 * Get dashboard page ID (must be created first with create-momentum-dashboard-page.mjs)
 */
async function getDashboardPageId() {
  if (!DASHBOARD_PAGE_ID) {
    throw new Error(
      'Dashboard page not configured!\n' +
      'Run: node scripts/create-momentum-dashboard-page.mjs\n' +
      'This will create a dedicated page and save its ID to config.'
    );
  }

  // Verify the page exists and is accessible
  const response = await fetch(
    `https://api.notion.com/v1/pages/${DASHBOARD_PAGE_ID}`,
    {
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_VERSION
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `Dashboard page ${DASHBOARD_PAGE_ID} not accessible!\n` +
      'Run: node scripts/create-momentum-dashboard-page.mjs\n' +
      'to create a new dedicated dashboard page.'
    );
  }

  return DASHBOARD_PAGE_ID;
}

/**
 * Generate dashboard content blocks from metrics
 */
function generateDashboardBlocks(metrics, trends = null, snapshots = []) {
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

  // Velocity Trends (if available)
  if (trends && trends.hasTrend) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '📈 Velocity Trends' } }]
      }
    });

    blocks.push({
      object: 'block',
      type: 'callout',
      callout: {
        icon: { emoji: '📊' },
        color: 'blue_background',
        rich_text: [{
          text: { content: `Tracking ${trends.daysTracked} day(s) of data` }
        }]
      }
    });

    const trendItems = [];

    // Completion trend
    const completionEmoji = trends.completionTrend > 0 ? '📈' : trends.completionTrend < 0 ? '📉' : '➡️';
    const completionColor = trends.completionTrend > 0 ? 'green' : trends.completionTrend < 0 ? 'red' : 'default';
    trendItems.push({
      text: { content: `${completionEmoji} Completion: ` },
      annotations: { bold: true }
    });
    trendItems.push({
      text: { content: `${trends.completionTrend > 0 ? '+' : ''}${trends.completionTrend}% ` },
      annotations: { color: completionColor }
    });

    // Add sparkline if we have data
    if (snapshots.length >= 2) {
      const sparkline = generateSparkline(snapshots, 'completion_percentage');
      trendItems.push({ text: { content: sparkline + '\n' }, annotations: { code: true } });
    } else {
      trendItems.push({ text: { content: '\n' } });
    }

    // Cycle time trend
    if (trends.cycleTimeTrend !== 0) {
      const cycleEmoji = trends.cycleTimeTrend < 0 ? '🚀' : trends.cycleTimeTrend > 0 ? '🐌' : '➡️';
      const cycleColor = trends.cycleTimeTrend < 0 ? 'green' : trends.cycleTimeTrend > 0 ? 'red' : 'default';
      trendItems.push({
        text: { content: `${cycleEmoji} Cycle Time: ` },
        annotations: { bold: true }
      });
      trendItems.push({
        text: { content: `${trends.cycleTimeTrend > 0 ? '+' : ''}${trends.cycleTimeTrend}% ` },
        annotations: { color: cycleColor }
      });
      trendItems.push({ text: { content: `(${trends.cycleTimeTrend < 0 ? 'faster' : 'slower'})\n` } });
    }

    // Throughput trend
    if (trends.throughputTrend !== 0) {
      const throughputEmoji = trends.throughputTrend > 0 ? '📈' : trends.throughputTrend < 0 ? '📉' : '➡️';
      const throughputColor = trends.throughputTrend > 0 ? 'green' : trends.throughputTrend < 0 ? 'red' : 'default';
      trendItems.push({
        text: { content: `${throughputEmoji} Throughput: ` },
        annotations: { bold: true }
      });
      trendItems.push({
        text: { content: `${trends.throughputTrend > 0 ? '+' : ''}${trends.throughputTrend}%` },
        annotations: { color: throughputColor }
      });
    }

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: trendItems }
    });

    blocks.push({ object: 'block', type: 'divider', divider: {} });
  }

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
async function updateDashboard(pageId, metrics, trends = null, snapshots = []) {
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
  const blocks = generateDashboardBlocks(metrics, trends, snapshots);

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

  // Store snapshot for historical tracking
  console.log('💾 Storing snapshot for trend analysis...\n');
  await storeSnapshot(metrics);

  // Get historical data
  console.log('📈 Fetching historical data...\n');
  const snapshots = await getHistoricalSnapshots(sprintName, 30);
  const trends = calculateTrends(snapshots);

  if (trends.hasTrend) {
    console.log(`✅ Found ${trends.daysTracked} day(s) of historical data\n`);
  } else {
    console.log('ℹ️  No historical data yet - trends will appear after a few days\n');
  }

  // Get dashboard page ID
  console.log('📄 Finding dashboard page...\n');
  const pageId = await getDashboardPageId();

  // Update dashboard
  await updateDashboard(pageId, metrics, trends, snapshots);

  console.log('\n✅ Dashboard updated successfully!\n');
  console.log(`🔗 View: https://www.notion.so/${pageId.replace(/-/g, '')}\n`);

  // Summary of trends
  if (trends.hasTrend) {
    console.log('📊 Trend Summary:\n');
    if (trends.completionTrend > 0) {
      console.log(`   📈 Completion up ${trends.completionTrend}%`);
    } else if (trends.completionTrend < 0) {
      console.log(`   📉 Completion down ${Math.abs(trends.completionTrend)}%`);
    }

    if (trends.cycleTimeTrend < 0) {
      console.log(`   🚀 Cycle time improving (${Math.abs(trends.cycleTimeTrend)}% faster)`);
    } else if (trends.cycleTimeTrend > 0) {
      console.log(`   🐌 Cycle time slowing (${trends.cycleTimeTrend}% slower)`);
    }

    if (trends.throughputTrend > 0) {
      console.log(`   📈 Throughput up ${trends.throughputTrend}%`);
    } else if (trends.throughputTrend < 0) {
      console.log(`   📉 Throughput down ${Math.abs(trends.throughputTrend)}%`);
    }
    console.log('');
  }
}

main().catch(console.error);
