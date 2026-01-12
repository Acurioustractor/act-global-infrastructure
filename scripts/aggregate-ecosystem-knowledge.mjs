#!/usr/bin/env node

/**
 * ACT Ecosystem Knowledge Aggregator
 *
 * Gathers content sources across all 7 ACT codebases for automated
 * content generation. Used by Ralph to create data-informed social posts.
 *
 * Sources aggregated:
 * 1. Git activity (commits, releases, tags) across all repos
 * 2. Ralph progress (completed PRD features)
 * 3. Sprint tracking (Notion milestones)
 * 4. Documentation updates
 * 5. Deployment logs
 *
 * Usage:
 *   node scripts/aggregate-ecosystem-knowledge.mjs
 *   node scripts/aggregate-ecosystem-knowledge.mjs --output json
 *   node scripts/aggregate-ecosystem-knowledge.mjs --since "7 days ago"
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CONFIG = {
  projects: [
    { name: 'Global Infrastructure', path: '/Users/benknight/act-global-infrastructure', focus: 'Automation, skills, MCPs' },
    { name: 'JusticeHub', path: '/Users/benknight/Code/JusticeHub', focus: 'Youth justice platform' },
    { name: 'Empathy Ledger', path: '/Users/benknight/Code/empathy-ledger-v2', focus: 'Ethical storytelling' },
    { name: 'ACT Farm', path: '/Users/benknight/Code/ACT Farm/act-farm', focus: 'Land & conservation' },
    { name: 'The Harvest', path: '/Users/benknight/Code/The Harvest Website', focus: 'CSA & community' },
    { name: 'Goods on Country', path: '/Users/benknight/Code/Goods Asset Register', focus: 'Circular economy' },
    { name: 'ACT Placemat', path: '/Users/benknight/Code/ACT Placemat', focus: 'Hub website' }
  ],

  notionDatabases: {
    sprintTracking: '2d6ebcf9-81cf-8133-839b-000b727a55b5',
    deployments: '2d6ebcf9-81cf-81d1-a72e-c9180830a54e',
    velocityMetrics: '2d6ebcf9-81cf-8123-939f-fab96227b3da',
    contentHub: 'e400e93e-fd9d-4a21-810c-58d67ed9fe97'
  },

  ralphProgressFile: '/Users/benknight/act-global-infrastructure/ralph/progress.txt',

  // Media storage
  supabaseStorageUrl: 'https://tednluwflfhxyucgwigh.supabase.co/storage/v1/object/public/'
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GIT AGGREGATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getGitActivity(projectPath, since = '7 days ago') {
  if (!existsSync(projectPath)) {
    return { commits: [], tags: [], branches: [], error: 'Path not found' };
  }

  const gitDir = join(projectPath, '.git');
  if (!existsSync(gitDir)) {
    return { commits: [], tags: [], branches: [], error: 'Not a git repo' };
  }

  try {
    // Get recent commits
    const commitsRaw = execSync(
      `git log --since="${since}" --oneline --format="%h|%s|%an|%ai" 2>/dev/null || true`,
      { cwd: projectPath, encoding: 'utf8' }
    ).trim();

    const commits = commitsRaw.split('\n')
      .filter(Boolean)
      .map(line => {
        const [hash, message, author, date] = line.split('|');
        return { hash, message, author, date };
      });

    // Get recent tags
    const tagsRaw = execSync(
      `git tag --sort=-creatordate 2>/dev/null | head -5 || true`,
      { cwd: projectPath, encoding: 'utf8' }
    ).trim();

    const tags = tagsRaw.split('\n').filter(Boolean);

    // Get current branch
    const branch = execSync(
      `git branch --show-current 2>/dev/null || echo "unknown"`,
      { cwd: projectPath, encoding: 'utf8' }
    ).trim();

    return { commits, tags, branch, error: null };

  } catch (error) {
    return { commits: [], tags: [], branch: null, error: error.message };
  }
}

function aggregateGitActivity(since = '7 days ago') {
  const results = {};

  for (const project of CONFIG.projects) {
    results[project.name] = {
      ...getGitActivity(project.path, since),
      focus: project.focus,
      path: project.path
    };
  }

  return results;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RALPH PROGRESS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getRalphProgress(limit = 20) {
  if (!existsSync(CONFIG.ralphProgressFile)) {
    return { entries: [], error: 'Progress file not found' };
  }

  try {
    const content = readFileSync(CONFIG.ralphProgressFile, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);

    // Parse progress entries (format: [timestamp] feature_id: message)
    const entries = lines.slice(-limit).reverse().map(line => {
      const match = line.match(/^\[([^\]]+)\]\s*([^:]+):\s*(.+)$/);
      if (match) {
        return {
          timestamp: match[1],
          featureId: match[2].trim(),
          message: match[3].trim()
        };
      }
      return { raw: line };
    });

    return { entries, error: null };

  } catch (error) {
    return { entries: [], error: error.message };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTION QUERIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function notionRequest(endpoint, options = {}) {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error('NOTION_TOKEN not set');
  }

  const url = `https://api.notion.com/v1${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2025-09-03',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API Error (${response.status}): ${error}`);
  }

  return response.json();
}

async function getSprintMilestones() {
  try {
    const data = await notionRequest(`/data_sources/${CONFIG.notionDatabases.sprintTracking}/query`, {
      method: 'POST',
      body: JSON.stringify({
        filter: {
          property: 'Status',
          status: {
            equals: 'Done'
          }
        },
        sorts: [{ property: 'Date', direction: 'descending' }],
        page_size: 10
      })
    });

    return {
      milestones: (data.results || []).map(page => ({
        id: page.id,
        title: page.properties?.Name?.title?.[0]?.plain_text || 'Untitled',
        status: page.properties?.Status?.status?.name,
        date: page.properties?.Date?.date?.start,
        project: page.properties?.Project?.select?.name
      })),
      error: null
    };

  } catch (error) {
    return { milestones: [], error: error.message };
  }
}

async function getDeployments() {
  try {
    const data = await notionRequest(`/data_sources/${CONFIG.notionDatabases.deployments}/query`, {
      method: 'POST',
      body: JSON.stringify({
        sorts: [{ property: 'Deploy Date', direction: 'descending' }],
        page_size: 10
      })
    });

    return {
      deployments: (data.results || []).map(page => ({
        id: page.id,
        title: page.properties?.Name?.title?.[0]?.plain_text || 'Untitled',
        project: page.properties?.Project?.relation?.[0]?.id,
        date: page.properties?.['Deploy Date']?.date?.start,
        environment: page.properties?.Environment?.select?.name
      })),
      error: null
    };

  } catch (error) {
    return { deployments: [], error: error.message };
  }
}

async function getVelocityMetrics() {
  try {
    const data = await notionRequest(`/data_sources/${CONFIG.notionDatabases.velocityMetrics}/query`, {
      method: 'POST',
      body: JSON.stringify({
        sorts: [{ property: 'Week', direction: 'descending' }],
        page_size: 4
      })
    });

    return {
      velocity: (data.results || []).map(page => ({
        id: page.id,
        week: page.properties?.Week?.title?.[0]?.plain_text,
        points: page.properties?.Points?.number,
        issuesClosed: page.properties?.['Issues Closed']?.number
      })),
      error: null
    };

  } catch (error) {
    return { velocity: [], error: error.message };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOCUMENTATION SCAN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function findRecentDocs(projectPath, days = 7) {
  if (!existsSync(projectPath)) {
    return [];
  }

  const results = [];
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

  function scanDir(dir, depth = 0) {
    if (depth > 3) return; // Limit depth

    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'node_modules') continue;

        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (entry.endsWith('.md') && stat.mtimeMs > cutoff) {
          results.push({
            path: fullPath.replace(projectPath, ''),
            modified: new Date(stat.mtimeMs).toISOString(),
            name: entry
          });
        }
      }
    } catch (e) {
      // Ignore permission errors
    }
  }

  scanDir(projectPath);
  return results.sort((a, b) => new Date(b.modified) - new Date(a.modified)).slice(0, 10);
}

function aggregateDocUpdates(days = 7) {
  const results = {};

  for (const project of CONFIG.projects) {
    results[project.name] = findRecentDocs(project.path, days);
  }

  return results;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONTENT INSIGHTS GENERATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateContentInsights(knowledge) {
  const insights = [];

  // Git activity insights
  const totalCommits = Object.values(knowledge.git)
    .reduce((sum, p) => sum + (p.commits?.length || 0), 0);

  if (totalCommits > 0) {
    const activeProjects = Object.entries(knowledge.git)
      .filter(([_, p]) => p.commits?.length > 0)
      .map(([name]) => name);

    insights.push({
      type: 'activity',
      title: 'Development Activity',
      summary: `${totalCommits} commits across ${activeProjects.length} projects`,
      projects: activeProjects,
      suggestedContent: `Building momentum: ${totalCommits} commits this week across ${activeProjects.join(', ')}.`
    });
  }

  // Ralph completions
  if (knowledge.ralph?.entries?.length > 0) {
    const recentCompletions = knowledge.ralph.entries.filter(e => e.featureId).slice(0, 3);
    if (recentCompletions.length > 0) {
      insights.push({
        type: 'feature',
        title: 'Recent Completions',
        items: recentCompletions,
        suggestedContent: `Ralph shipped: ${recentCompletions[0].message}`
      });
    }
  }

  // Sprint milestones
  if (knowledge.sprints?.milestones?.length > 0) {
    const recent = knowledge.sprints.milestones[0];
    insights.push({
      type: 'milestone',
      title: 'Sprint Progress',
      item: recent,
      suggestedContent: `Sprint milestone reached: ${recent.title}`
    });
  }

  // Documentation updates
  const docsUpdated = Object.entries(knowledge.docs)
    .filter(([_, docs]) => docs.length > 0)
    .map(([project, docs]) => ({ project, count: docs.length }));

  if (docsUpdated.length > 0) {
    const totalDocs = docsUpdated.reduce((sum, d) => sum + d.count, 0);
    insights.push({
      type: 'documentation',
      title: 'Documentation Updates',
      summary: `${totalDocs} docs updated`,
      projects: docsUpdated,
      suggestedContent: `Keeping the knowledge fresh: ${totalDocs} documentation updates this week.`
    });
  }

  return insights;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN AGGREGATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function aggregateKnowledge(options = {}) {
  const since = options.since || '7 days ago';
  const days = parseInt(options.days) || 7;

  console.log('🔍 Aggregating ACT Ecosystem Knowledge...\n');

  const knowledge = {
    timestamp: new Date().toISOString(),
    period: since,
    git: {},
    ralph: {},
    sprints: {},
    deployments: {},
    velocity: {},
    docs: {},
    insights: []
  };

  // Git activity
  console.log('📦 Scanning git repositories...');
  knowledge.git = aggregateGitActivity(since);
  const gitProjects = Object.entries(knowledge.git)
    .filter(([_, p]) => p.commits?.length > 0);
  console.log(`   Found activity in ${gitProjects.length} projects\n`);

  // Ralph progress
  console.log('🤖 Checking Ralph progress...');
  knowledge.ralph = getRalphProgress();
  console.log(`   Found ${knowledge.ralph.entries?.length || 0} recent entries\n`);

  // Notion data (if token available)
  if (process.env.NOTION_TOKEN) {
    console.log('📋 Querying Notion databases...');

    knowledge.sprints = await getSprintMilestones();
    console.log(`   Sprint milestones: ${knowledge.sprints.milestones?.length || 0}`);

    knowledge.deployments = await getDeployments();
    console.log(`   Deployments: ${knowledge.deployments.deployments?.length || 0}`);

    knowledge.velocity = await getVelocityMetrics();
    console.log(`   Velocity records: ${knowledge.velocity.velocity?.length || 0}\n`);
  } else {
    console.log('⚠️  NOTION_TOKEN not set, skipping Notion queries\n');
  }

  // Documentation updates
  console.log('📝 Scanning documentation...');
  knowledge.docs = aggregateDocUpdates(days);
  const docsTotal = Object.values(knowledge.docs)
    .reduce((sum, docs) => sum + docs.length, 0);
  console.log(`   Found ${docsTotal} updated docs\n`);

  // Generate insights
  console.log('💡 Generating content insights...');
  knowledge.insights = generateContentInsights(knowledge);
  console.log(`   Generated ${knowledge.insights.length} insights\n`);

  return knowledge;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OUTPUT FORMATTERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function printSummary(knowledge) {
  console.log('━'.repeat(60));
  console.log('📊 ACT ECOSYSTEM KNOWLEDGE SUMMARY');
  console.log('━'.repeat(60));
  console.log(`\n⏰ Generated: ${knowledge.timestamp}`);
  console.log(`📅 Period: ${knowledge.period}\n`);

  // Git Summary
  console.log('📦 GIT ACTIVITY:');
  for (const [project, data] of Object.entries(knowledge.git)) {
    if (data.commits?.length > 0) {
      console.log(`   ${project}: ${data.commits.length} commits`);
      data.commits.slice(0, 2).forEach(c => {
        console.log(`      - ${c.message.substring(0, 50)}${c.message.length > 50 ? '...' : ''}`);
      });
    }
  }

  // Ralph Summary
  if (knowledge.ralph.entries?.length > 0) {
    console.log('\n🤖 RALPH COMPLETIONS:');
    knowledge.ralph.entries.slice(0, 5).forEach(e => {
      if (e.featureId) {
        console.log(`   [${e.featureId}] ${e.message}`);
      }
    });
  }

  // Sprint Summary
  if (knowledge.sprints.milestones?.length > 0) {
    console.log('\n🏃 SPRINT MILESTONES:');
    knowledge.sprints.milestones.slice(0, 5).forEach(m => {
      console.log(`   - ${m.title} (${m.date || 'no date'})`);
    });
  }

  // Insights
  if (knowledge.insights.length > 0) {
    console.log('\n💡 CONTENT INSIGHTS:');
    knowledge.insights.forEach(insight => {
      console.log(`\n   ${insight.title}:`);
      console.log(`   "${insight.suggestedContent}"`);
    });
  }

  console.log('\n' + '━'.repeat(60));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
ACT Ecosystem Knowledge Aggregator

Usage:
  node aggregate-ecosystem-knowledge.mjs              Human-readable summary
  node aggregate-ecosystem-knowledge.mjs --output json   JSON output
  node aggregate-ecosystem-knowledge.mjs --since "14 days ago"   Custom period

Options:
  --output <format>   Output format: summary (default), json
  --since <period>    Git log period (e.g., "7 days ago", "2 weeks ago")
  --days <number>     Days to look back for docs (default: 7)

Environment Variables:
  NOTION_TOKEN        Required for sprint/deployment data
`);
  process.exit(0);
}

// Parse args
const outputFormat = args.includes('--output') ? args[args.indexOf('--output') + 1] : 'summary';
const since = args.includes('--since') ? args[args.indexOf('--since') + 1] : '7 days ago';
const days = args.includes('--days') ? args[args.indexOf('--days') + 1] : '7';

// Run
aggregateKnowledge({ since, days })
  .then(knowledge => {
    if (outputFormat === 'json') {
      console.log(JSON.stringify(knowledge, null, 2));
    } else {
      printSummary(knowledge);
    }
  })
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });

export { aggregateKnowledge, CONFIG };
