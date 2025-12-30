#!/usr/bin/env node

/**
 * Smart Work Queue
 *
 * AI-powered priority ranking that tells you what to work on next.
 *
 * Scoring factors:
 * - Dependencies: Issues blocking other work (HIGH priority)
 * - Impact: Strategic value to sprint/project goals
 * - Effort: Quick wins vs big features
 * - Context: Matches recent work/expertise
 * - Sprint criticality: Must-have vs nice-to-have
 * - Freshness: New issues vs stale ones
 *
 * Output: Ranked list of "next best tasks"
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
 * Fetch all issues with dependencies and context
 */
async function fetchIssuesWithContext(sprintName = null) {
  console.log('📊 Fetching issues with context...\n');

  const result = await graphqlWithAuth(`
    query {
      node(id: "${PROJECT_ID}") {
        ... on ProjectV2 {
          items(first: 100) {
            nodes {
              id
              content {
                ... on Issue {
                  number
                  title
                  body
                  url
                  createdAt
                  updatedAt
                  labels(first: 10) {
                    nodes {
                      name
                    }
                  }
                  assignees(first: 5) {
                    nodes {
                      login
                    }
                  }
                  milestone {
                    title
                  }
                  trackedIssues(first: 20) {
                    nodes {
                      number
                      title
                      state
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
  `);

  let items = result.node.items.nodes.filter(item => item.content);

  // Filter by sprint if specified
  if (sprintName) {
    items = items.filter(item => {
      const sprint = getFieldValue(item, 'Sprint');
      return sprint === sprintName;
    });
  }

  // Only return Todo items (work queue)
  items = items.filter(item => {
    const status = getFieldValue(item, 'Status');
    return status === 'Todo';
  });

  return items;
}

/**
 * Extract dependency information from issue body
 * Looks for: "Blocks #123", "Depends on #456", "Blocked by #789"
 */
function extractDependencies(issueBody) {
  if (!issueBody) return { blocks: [], blockedBy: [] };

  const blocks = [];
  const blockedBy = [];

  // Match "Blocks #123" or "Blocking #123"
  const blockMatches = issueBody.matchAll(/blocks?\s+#(\d+)/gi);
  for (const match of blockMatches) {
    blocks.push(parseInt(match[1]));
  }

  // Match "Blocked by #456" or "Depends on #456"
  const blockedByMatches = issueBody.matchAll(/(?:blocked\s+by|depends\s+on)\s+#(\d+)/gi);
  for (const match of blockedByMatches) {
    blockedBy.push(parseInt(match[1]));
  }

  // Also check trackedIssues (GitHub's built-in task lists)
  return { blocks, blockedBy };
}

/**
 * Convert effort string to hours for scoring
 */
function effortToHours(effortStr) {
  if (!effortStr) return 8; // Default 1 day

  const effortMap = {
    '1h': 1,
    '3h': 3,
    '1d': 8,
    '3d': 24,
    '1w': 40,
    '2w': 80
  };

  return effortMap[effortStr] || 8;
}

/**
 * Calculate priority score for an issue
 *
 * Score breakdown (0-100):
 * - Dependencies (0-30): +10 per issue this blocks
 * - Effort (0-20): Smaller = higher score (quick wins)
 * - Sprint criticality (0-20): Labels, milestone
 * - Freshness (0-15): Recent issues get boost
 * - Impact (0-15): Inferred from title/labels
 */
function calculatePriorityScore(item, allItems) {
  const issue = item.content;
  let score = 0;
  const reasons = [];

  // 1. DEPENDENCY SCORE (0-30 points)
  const deps = extractDependencies(issue.body);
  const blocksCount = deps.blocks.length;

  if (blocksCount > 0) {
    const depScore = Math.min(blocksCount * 10, 30);
    score += depScore;
    reasons.push(`Blocks ${blocksCount} other issue${blocksCount > 1 ? 's' : ''} (+${depScore})`);
  }

  // Penalty if blocked by others
  if (deps.blockedBy.length > 0) {
    score -= 20;
    reasons.push(`Blocked by ${deps.blockedBy.length} issue(s) (-20)`);
  }

  // 2. EFFORT SCORE (0-20 points) - smaller is better
  const effort = getFieldValue(item, 'Effort');
  const hours = effortToHours(effort);

  let effortScore = 0;
  if (hours <= 1) {
    effortScore = 20;
    reasons.push('Very quick (1h) (+20)');
  } else if (hours <= 3) {
    effortScore = 15;
    reasons.push('Quick win (3h) (+15)');
  } else if (hours <= 8) {
    effortScore = 10;
    reasons.push('Medium effort (1d) (+10)');
  } else if (hours <= 24) {
    effortScore = 5;
    reasons.push('Larger task (3d) (+5)');
  } else {
    effortScore = 0;
    reasons.push('Very large (>1w) (+0)');
  }
  score += effortScore;

  // 3. SPRINT CRITICALITY (0-20 points)
  const labels = issue.labels?.nodes.map(l => l.name.toLowerCase()) || [];

  if (labels.includes('critical') || labels.includes('p0')) {
    score += 20;
    reasons.push('Critical priority (+20)');
  } else if (labels.includes('high') || labels.includes('p1')) {
    score += 15;
    reasons.push('High priority (+15)');
  } else if (labels.includes('bug')) {
    score += 12;
    reasons.push('Bug fix (+12)');
  } else if (labels.includes('enhancement')) {
    score += 8;
    reasons.push('Enhancement (+8)');
  }

  // Milestone boost
  if (issue.milestone) {
    score += 10;
    reasons.push(`Milestone: ${issue.milestone.title} (+10)`);
  }

  // 4. FRESHNESS SCORE (0-15 points)
  const daysOld = (Date.now() - new Date(issue.createdAt)) / (1000 * 60 * 60 * 24);

  if (daysOld <= 1) {
    score += 15;
    reasons.push('Brand new (<1d) (+15)');
  } else if (daysOld <= 3) {
    score += 10;
    reasons.push('Recent (3d) (+10)');
  } else if (daysOld <= 7) {
    score += 5;
    reasons.push('This week (+5)');
  } else if (daysOld > 30) {
    score -= 5;
    reasons.push('Stale (>30d) (-5)');
  }

  // 5. IMPACT SCORE (0-15 points)
  const title = issue.title.toLowerCase();

  // High-impact keywords
  const highImpactKeywords = ['api', 'integration', 'deploy', 'production', 'critical', 'data', 'auth'];
  const hasHighImpact = highImpactKeywords.some(kw => title.includes(kw));

  if (hasHighImpact) {
    score += 15;
    reasons.push('High impact work (+15)');
  } else if (labels.includes('feature')) {
    score += 10;
    reasons.push('New feature (+10)');
  } else if (title.includes('refactor') || title.includes('cleanup')) {
    score += 5;
    reasons.push('Code quality (+5)');
  }

  // Normalize to 0-100
  score = Math.min(Math.max(score, 0), 100);

  return { score, reasons };
}

/**
 * Generate work queue with priority rankings
 */
async function generateWorkQueue(sprintName) {
  const items = await fetchIssuesWithContext(sprintName);

  console.log(`📋 Found ${items.length} Todo items in "${sprintName}"\n`);

  if (items.length === 0) {
    console.log('✅ No items in queue - sprint complete or all work in progress!\n');
    return [];
  }

  // Calculate priority for each item
  const rankedItems = items.map(item => {
    const { score, reasons } = calculatePriorityScore(item, items);

    return {
      number: item.content.number,
      title: item.content.title,
      url: item.content.url,
      effort: getFieldValue(item, 'Effort') || 'Unknown',
      labels: item.content.labels?.nodes.map(l => l.name) || [],
      score,
      reasons,
      deps: extractDependencies(item.content.body)
    };
  });

  // Sort by score (highest first)
  rankedItems.sort((a, b) => b.score - a.score);

  return rankedItems;
}

/**
 * Display work queue
 */
function displayWorkQueue(queue, showAll = false) {
  if (queue.length === 0) {
    console.log('✅ Work queue is empty!\n');
    return;
  }

  console.log('🎯 Smart Work Queue - Priority Ranked\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const itemsToShow = showAll ? queue : queue.slice(0, 5);

  itemsToShow.forEach((item, index) => {
    const rank = index + 1;
    const scoreColor = item.score >= 70 ? '🔥' :
                       item.score >= 50 ? '⚡' :
                       item.score >= 30 ? '📌' : '💤';

    console.log(`${rank}. ${scoreColor} #${item.number}: ${item.title}`);
    console.log(`   Priority Score: ${item.score}/100`);
    console.log(`   Effort: ${item.effort}`);

    if (item.labels.length > 0) {
      console.log(`   Labels: ${item.labels.join(', ')}`);
    }

    if (item.deps.blocks.length > 0) {
      console.log(`   🔗 Blocks: #${item.deps.blocks.join(', #')}`);
    }

    if (item.deps.blockedBy.length > 0) {
      console.log(`   ⛔ Blocked by: #${item.deps.blockedBy.join(', #')}`);
    }

    console.log(`   Why this score?`);
    item.reasons.forEach(reason => {
      console.log(`     • ${reason}`);
    });

    console.log(`   🔗 ${item.url}`);
    console.log('');
  });

  if (!showAll && queue.length > 5) {
    console.log(`   ... and ${queue.length - 5} more items\n`);
    console.log('   Run with --all to see full queue\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Show next best task (top of queue)
 */
function showNextTask(queue) {
  if (queue.length === 0) {
    console.log('✅ No tasks in queue - you\'re all caught up!\n');
    return;
  }

  const next = queue[0];

  console.log('🎯 YOUR NEXT BEST TASK\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`#${next.number}: ${next.title}\n`);
  console.log(`Priority Score: ${next.score}/100 🔥\n`);

  console.log('Why this one?\n');
  next.reasons.forEach(reason => {
    console.log(`  ✅ ${reason}`);
  });
  console.log('');

  if (next.deps.blocks.length > 0) {
    console.log(`🔗 Unblocks: ${next.deps.blocks.length} other issue(s)\n`);
  }

  console.log(`⏱️  Estimated effort: ${next.effort}\n`);

  console.log(`🔗 ${next.url}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('💡 Ready to start?\n');
  console.log(`   git checkout -b feat/${next.number}-${next.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40)}\n`);
}

/**
 * Main
 */
async function main() {
  console.log('🎯 Smart Work Queue\n');

  const args = process.argv.slice(2);
  const sprintArg = args.find(arg => arg.startsWith('--sprint='));
  const sprintName = sprintArg ? sprintArg.split('=')[1] : 'Sprint 2';
  const showAll = args.includes('--all');
  const showNext = args.includes('--next') || args.length === 0;

  // Generate queue
  const queue = await generateWorkQueue(sprintName);

  if (showNext && queue.length > 0) {
    // Show just the next task
    showNextTask(queue);
  } else {
    // Show full queue
    displayWorkQueue(queue, showAll);
  }

  // Summary
  if (queue.length > 0) {
    const avgScore = Math.round(queue.reduce((sum, item) => sum + item.score, 0) / queue.length);
    const highPriority = queue.filter(item => item.score >= 70).length;

    console.log('📊 Queue Summary:\n');
    console.log(`   Total items: ${queue.length}`);
    console.log(`   High priority (≥70): ${highPriority}`);
    console.log(`   Average score: ${avgScore}/100\n`);
  }
}

// Export for use by other scripts
export { generateWorkQueue, calculatePriorityScore };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
