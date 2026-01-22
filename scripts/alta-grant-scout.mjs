#!/usr/bin/env node

/**
 * ALTA - Grant Scout Agent
 *
 * Australian Livelihood & Territory Advancement
 * Proactively discovers grants, matches to ACT projects, tracks deadlines.
 *
 * Commands:
 *   scout [--category X]   - Discover new grants from Australian databases
 *   match [--project X]    - Match stored grants to ACT projects
 *   upcoming [--days N]    - Show grants with upcoming deadlines
 *   at-risk               - Show high-relevance grants at risk of missing
 *   add <url>             - Manually add a grant from URL
 *   summary               - Show grant pipeline summary
 *
 * Usage:
 *   node alta-grant-scout.mjs scout --category indigenous
 *   node alta-grant-scout.mjs match --project ACT-JH
 *   node alta-grant-scout.mjs upcoming --days 30
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Set in .env.local or environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Load project codes for matching
let projectCodes = null;
function loadProjectCodes() {
  if (projectCodes) return projectCodes;
  const configPath = join(__dirname, '../config/project-codes.json');
  if (existsSync(configPath)) {
    projectCodes = JSON.parse(readFileSync(configPath, 'utf8'));
    return projectCodes;
  }
  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GRANT KEYWORDS BY CATEGORY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GRANT_KEYWORDS = {
  justice: [
    'youth justice', 'justice reinvestment', 'diversion', 'rehabilitation',
    'detention alternatives', 'restorative justice', 'recidivism', 'crime prevention',
    'community corrections', 'legal aid', 'advocacy', 'access to justice'
  ],
  indigenous: [
    'Indigenous', 'Aboriginal', 'Torres Strait Islander', 'First Nations',
    'Closing the Gap', 'NIAA', 'IAS', 'Indigenous Advancement Strategy',
    'native title', 'land rights', 'cultural heritage', 'traditional owners',
    'ranger', 'country', 'elders', 'language preservation'
  ],
  stories: [
    'storytelling', 'oral history', 'digital stories', 'documentary',
    'community voice', 'narrative', 'lived experience', 'testimony',
    'archive', 'heritage recording'
  ],
  enterprise: [
    'social enterprise', 'not-for-profit', 'NFP', 'community business',
    'cooperative', 'economic development', 'employment', 'training',
    'capacity building', 'social innovation', 'impact investment'
  ],
  regenerative: [
    'regenerative agriculture', 'sustainable', 'environment', 'conservation',
    'biodiversity', 'land management', 'carbon', 'reforestation',
    'food systems', 'circular economy', 'climate adaptation'
  ],
  health: [
    'mental health', 'wellbeing', 'health services', 'primary care',
    'community health', 'preventive health', 'recovery', 'disability',
    'NDIS', 'aged care', 'health equity'
  ],
  arts: [
    'arts', 'creative', 'cultural', 'artist', 'performance', 'visual arts',
    'music', 'film', 'public art', 'community arts', 'festival'
  ],
  community: [
    'community development', 'place-based', 'neighbourhood', 'local',
    'grassroots', 'volunteering', 'community organisation', 'social cohesion'
  ]
};

// Australian grant sources
const GRANT_SOURCES = [
  {
    name: 'GrantConnect',
    url: 'https://www.grants.gov.au/',
    description: 'Australian Government grants portal'
  },
  {
    name: 'Community Grants Hub',
    url: 'https://www.communitygrants.gov.au/',
    description: 'DSS community funding programs'
  },
  {
    name: 'NIAA',
    url: 'https://www.niaa.gov.au/indigenous-affairs/grants-and-funding',
    description: 'Indigenous-specific funding'
  },
  {
    name: 'Arts Queensland',
    url: 'https://www.arts.qld.gov.au/funding',
    description: 'Queensland arts funding'
  },
  {
    name: 'Philanthropy Australia',
    url: 'https://www.philanthropy.org.au/',
    description: 'Foundation and trust funding'
  },
  {
    name: 'Queensland Government',
    url: 'https://www.qld.gov.au/community/community-organisations-volunteers/grants',
    description: 'QLD state grants'
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GRANT DISCOVERY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Build search query for category
 */
function buildSearchQuery(category) {
  const keywords = GRANT_KEYWORDS[category] || [];
  const baseTerms = ['grant', 'funding', 'Australia', '2026'];

  // Take top 3 keywords for focused search
  const topKeywords = keywords.slice(0, 3);
  return [...baseTerms, ...topKeywords].join(' ');
}

/**
 * Search for grants using web search
 */
async function searchGrants(category = null) {
  const categories = category ? [category] : Object.keys(GRANT_KEYWORDS);
  const results = [];

  for (const cat of categories) {
    const query = buildSearchQuery(cat);
    console.log(`\n🔍 Searching ${cat} grants: "${query}"`);

    // Try Perplexity search if available
    try {
      const searchQuery = `Australian grants funding opportunities ${query} application deadline eligibility 2026`;
      const result = execSync(
        `cd ~/.claude/skills/perplexity-search && uv run python scripts/perplexity_search.py --research "${searchQuery}" 2>/dev/null`,
        { encoding: 'utf8', timeout: 60000 }
      );

      // Parse results (simplified - would need more robust parsing)
      console.log(`  Found results for ${cat}`);
      results.push({
        category: cat,
        searchQuery: query,
        rawResults: result.substring(0, 2000) // Truncate for storage
      });
    } catch (e) {
      console.log(`  ⚠️ Search API not available, using manual sources`);
      results.push({
        category: cat,
        searchQuery: query,
        sources: GRANT_SOURCES.filter(s =>
          cat === 'indigenous' ? s.name === 'NIAA' :
          cat === 'arts' ? s.name.includes('Arts') : true
        )
      });
    }
  }

  return results;
}

/**
 * Scout for grants and store discoveries
 */
async function scoutGrants(options = {}) {
  console.log('\n🦅 ALTA GRANT SCOUT\n');
  console.log('Searching Australian grant databases...\n');

  const category = options.category;
  const searchResults = await searchGrants(category);

  // Display search suggestions
  console.log('\n📋 GRANT SOURCES TO CHECK:\n');

  for (const result of searchResults) {
    console.log(`── ${result.category.toUpperCase()} ──`);

    if (result.sources) {
      for (const source of result.sources) {
        console.log(`  🔗 ${source.name}`);
        console.log(`     ${source.url}`);
        console.log(`     ${source.description}`);
      }
    }

    console.log(`  Search terms: ${result.searchQuery}`);
    console.log();
  }

  // Show relevant ACT projects
  const config = loadProjectCodes();
  if (config) {
    const relevantProjects = Object.entries(config.projects)
      .filter(([code, p]) => !category || p.category === category)
      .slice(0, 10);

    console.log('\n🌱 ACT PROJECTS SEEKING FUNDING:\n');
    for (const [code, project] of relevantProjects) {
      const icon = config.categories[project.category]?.icon || '📂';
      console.log(`  ${icon} ${project.name} (${code})`);
      console.log(`     ${project.description}`);
    }
  }

  return searchResults;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GRANT MATCHING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Calculate relevance score for a grant-project match
 */
function calculateRelevance(grant, project, projectConfig) {
  let score = 0;
  const reasons = [];

  // Category match (40 points)
  const projectCategory = projectConfig.category;
  if (grant.metadata?.categories?.includes(projectCategory)) {
    score += 40;
    reasons.push(`Category match: ${projectCategory}`);
  }

  // Keyword match (30 points)
  const grantText = `${grant.name} ${grant.description}`.toLowerCase();
  const projectKeywords = [
    ...(projectConfig.ghl_tags || []),
    projectConfig.alma_program,
    ...GRANT_KEYWORDS[projectCategory] || []
  ].filter(Boolean);

  const matchedKeywords = projectKeywords.filter(kw =>
    grantText.includes(kw.toLowerCase())
  );

  if (matchedKeywords.length > 0) {
    score += Math.min(30, matchedKeywords.length * 10);
    reasons.push(`Keywords: ${matchedKeywords.slice(0, 3).join(', ')}`);
  }

  // Amount alignment (15 points)
  // Smaller grants (<$100k) better for emerging projects
  // Larger grants (>$500k) for established programs
  if (grant.amount_max && grant.amount_max <= 100000 && projectConfig.priority !== 'high') {
    score += 10;
    reasons.push('Amount suits emerging project');
  } else if (grant.amount_max && grant.amount_max >= 500000 && projectConfig.priority === 'high') {
    score += 15;
    reasons.push('Major funding for priority project');
  } else if (grant.amount_min && grant.amount_max) {
    score += 5;
    reasons.push('Amount in range');
  }

  // Cultural protocols (15 points for First Nations projects)
  if (projectConfig.cultural_protocols &&
      (grantText.includes('indigenous') || grantText.includes('aboriginal') || grantText.includes('first nations'))) {
    score += 15;
    reasons.push('Indigenous focus aligned');
  }

  return { score, reasons };
}

/**
 * Match stored grants to ACT projects
 */
async function matchGrants(projectFilter = null) {
  console.log('\n🎯 ALTA GRANT MATCHING\n');

  // Get grants from Supabase
  const { data: grants, error } = await supabase
    .from('grant_opportunities')
    .select('*')
    .order('deadline', { ascending: true });

  if (error || !grants?.length) {
    console.log('No grants in database. Run `alta scout` first or add manually.');
    return [];
  }

  // Load project config
  const config = loadProjectCodes();
  if (!config) {
    console.log('Project codes not found.');
    return [];
  }

  const matches = [];

  // Match each grant to relevant projects
  for (const grant of grants) {
    console.log(`\n📋 ${grant.name}`);
    console.log(`   ${grant.description?.substring(0, 80)}...`);
    console.log(`   Deadline: ${grant.deadline || 'Unknown'} | Amount: $${grant.amount_min || '?'}-$${grant.amount_max || '?'}`);

    const projectMatches = [];

    for (const [code, project] of Object.entries(config.projects)) {
      if (projectFilter && code !== projectFilter) continue;

      const { score, reasons } = calculateRelevance(grant, project, project);

      if (score >= 30) { // Minimum relevance threshold
        projectMatches.push({
          code,
          name: project.name,
          score,
          reasons
        });
      }
    }

    // Sort by relevance
    projectMatches.sort((a, b) => b.score - a.score);

    if (projectMatches.length > 0) {
      console.log(`\n   🌱 Matching projects:`);
      for (const match of projectMatches.slice(0, 3)) {
        const urgency = match.score >= 60 ? '🔴' : match.score >= 45 ? '🟡' : '🟢';
        console.log(`   ${urgency} ${match.name} (${match.code}) - Score: ${match.score}`);
        console.log(`      ${match.reasons.join(' | ')}`);
      }

      matches.push({
        grant,
        projects: projectMatches
      });
    } else {
      console.log(`   ⚪ No strong project matches`);
    }
  }

  // Update relevance scores in database
  for (const match of matches) {
    const topScore = match.projects[0]?.score || 0;
    await supabase
      .from('grant_opportunities')
      .update({
        relevance_score: topScore,
        metadata: {
          ...match.grant.metadata,
          matched_projects: match.projects.slice(0, 5).map(p => p.code)
        }
      })
      .eq('id', match.grant.id);
  }

  console.log(`\n✅ Matched ${matches.length} grants to ACT projects`);
  return matches;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEADLINE TRACKING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get grants with upcoming deadlines
 */
async function getUpcomingGrants(days = 30) {
  const today = new Date();
  const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

  const { data: grants, error } = await supabase
    .from('grant_opportunities')
    .select('*')
    .gte('deadline', today.toISOString().split('T')[0])
    .lte('deadline', futureDate.toISOString().split('T')[0])
    .order('deadline', { ascending: true });

  if (error) {
    console.error('Error fetching grants:', error.message);
    return [];
  }

  return grants || [];
}

/**
 * Show upcoming grants
 */
async function showUpcoming(days = 30) {
  console.log(`\n📅 GRANTS DUE IN NEXT ${days} DAYS\n`);

  const grants = await getUpcomingGrants(days);
  const today = new Date();

  if (grants.length === 0) {
    console.log('  No grants with upcoming deadlines.\n');
    console.log('  Run `alta scout` to find new opportunities.');
    return;
  }

  for (const grant of grants) {
    const deadline = new Date(grant.deadline);
    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    const urgency = daysLeft <= 7 ? '🔴' : daysLeft <= 14 ? '🟡' : '🟢';

    console.log(`${urgency} ${grant.name}`);
    console.log(`   Deadline: ${grant.deadline} (${daysLeft} days)`);
    if (grant.amount_min || grant.amount_max) {
      console.log(`   Amount: $${grant.amount_min?.toLocaleString() || '?'} - $${grant.amount_max?.toLocaleString() || '?'}`);
    }
    if (grant.relevance_score) {
      console.log(`   Relevance: ${grant.relevance_score}%`);
    }
    if (grant.metadata?.matched_projects) {
      console.log(`   Projects: ${grant.metadata.matched_projects.join(', ')}`);
    }
    console.log(`   Status: ${grant.application_status || 'Not started'}`);
    if (grant.url) {
      console.log(`   URL: ${grant.url}`);
    }
    console.log();
  }
}

/**
 * Show at-risk grants (high relevance, deadline approaching)
 */
async function showAtRisk() {
  console.log('\n⚠️ AT-RISK GRANTS\n');
  console.log('High-relevance grants with approaching deadlines:\n');

  const grants = await getUpcomingGrants(30);
  const today = new Date();

  const atRisk = grants.filter(g => {
    const deadline = new Date(g.deadline);
    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    const isUrgent = daysLeft <= 14;
    const isRelevant = (g.relevance_score || 0) >= 50;
    const notSubmitted = !g.application_status || g.application_status === 'Not started';

    return isUrgent && isRelevant && notSubmitted;
  });

  if (atRisk.length === 0) {
    console.log('  ✅ No at-risk grants!\n');
    return;
  }

  for (const grant of atRisk) {
    const deadline = new Date(grant.deadline);
    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    console.log(`🔴 ${grant.name}`);
    console.log(`   DEADLINE: ${grant.deadline} (${daysLeft} DAYS!)`);
    console.log(`   Relevance: ${grant.relevance_score}%`);
    console.log(`   Amount: $${grant.amount_min?.toLocaleString() || '?'} - $${grant.amount_max?.toLocaleString() || '?'}`);
    if (grant.metadata?.matched_projects) {
      console.log(`   For: ${grant.metadata.matched_projects.join(', ')}`);
    }
    if (grant.url) {
      console.log(`   Apply: ${grant.url}`);
    }
    console.log();
  }

  // Send Discord alert if webhook available
  const discordWebhook = process.env.DISCORD_WEBHOOK_ALERTS;
  if (discordWebhook && atRisk.length > 0) {
    await sendDiscordAlert(atRisk);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MANUAL GRANT ENTRY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Add a grant manually
 */
async function addGrant(options) {
  const grant = {
    name: options.name,
    description: options.description || null,
    url: options.url || null,
    deadline: options.deadline || null,
    amount_min: options.amountMin ? parseInt(options.amountMin) : null,
    amount_max: options.amountMax ? parseInt(options.amountMax) : null,
    source: options.source || 'Manual',
    application_status: 'Not started',
    metadata: {
      categories: options.categories ? options.categories.split(',') : [],
      added_by: 'alta-scout'
    }
  };

  const { data, error } = await supabase
    .from('grant_opportunities')
    .insert(grant)
    .select()
    .single();

  if (error) {
    console.error('Error adding grant:', error.message);
    return null;
  }

  console.log(`\n✅ Added grant: ${data.name}`);
  console.log(`   ID: ${data.id}`);
  return data;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUMMARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Show grant pipeline summary
 */
async function showSummary() {
  console.log('\n🦅 ALTA GRANT PIPELINE SUMMARY\n');

  // Get all grants
  const { data: grants, error } = await supabase
    .from('grant_opportunities')
    .select('*')
    .order('deadline', { ascending: true });

  if (error || !grants?.length) {
    console.log('No grants in pipeline.\n');
    console.log('Run `alta scout` to discover grants or `alta add` to add manually.');
    return;
  }

  // Group by status
  const byStatus = {};
  for (const grant of grants) {
    const status = grant.application_status || 'Not started';
    if (!byStatus[status]) byStatus[status] = [];
    byStatus[status].push(grant);
  }

  // Display counts
  console.log('── PIPELINE STATUS ──');
  for (const [status, statusGrants] of Object.entries(byStatus)) {
    const icon = status === 'Submitted' ? '✅' :
                 status === 'In progress' ? '📝' :
                 status === 'Not started' ? '⚪' : '📋';
    console.log(`  ${icon} ${status}: ${statusGrants.length}`);
  }

  // Get upcoming deadlines
  const today = new Date();
  const upcoming = grants.filter(g => {
    if (!g.deadline) return false;
    const deadline = new Date(g.deadline);
    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 && daysLeft <= 30;
  });

  console.log(`\n── UPCOMING (30 days) ──`);
  if (upcoming.length === 0) {
    console.log('  No deadlines in next 30 days');
  } else {
    for (const grant of upcoming.slice(0, 5)) {
      const deadline = new Date(grant.deadline);
      const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
      const urgency = daysLeft <= 7 ? '🔴' : daysLeft <= 14 ? '🟡' : '🟢';
      console.log(`  ${urgency} ${grant.name} (${daysLeft} days)`);
    }
    if (upcoming.length > 5) {
      console.log(`  ... and ${upcoming.length - 5} more`);
    }
  }

  // Get high-relevance grants
  const highRelevance = grants.filter(g => (g.relevance_score || 0) >= 60);

  console.log(`\n── HIGH RELEVANCE (60%+) ──`);
  if (highRelevance.length === 0) {
    console.log('  No high-relevance grants. Run `alta match` to score.');
  } else {
    for (const grant of highRelevance.slice(0, 5)) {
      console.log(`  🎯 ${grant.name} (${grant.relevance_score}%)`);
      if (grant.metadata?.matched_projects) {
        console.log(`     → ${grant.metadata.matched_projects.slice(0, 3).join(', ')}`);
      }
    }
  }

  // Total value
  const totalMin = grants.reduce((sum, g) => sum + (g.amount_min || 0), 0);
  const totalMax = grants.reduce((sum, g) => sum + (g.amount_max || 0), 0);

  console.log(`\n── TOTAL OPPORTUNITY ──`);
  console.log(`  ${grants.length} grants tracked`);
  console.log(`  Value range: $${totalMin.toLocaleString()} - $${totalMax.toLocaleString()}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DISCORD ALERTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Send Discord alert for at-risk grants
 */
async function sendDiscordAlert(grants) {
  const webhook = process.env.DISCORD_WEBHOOK_ALERTS;
  if (!webhook) return;

  const today = new Date();
  let message = '🦅 **ALTA GRANT ALERT**\n\n';
  message += `${grants.length} high-relevance grant(s) need attention:\n\n`;

  for (const grant of grants.slice(0, 5)) {
    const deadline = new Date(grant.deadline);
    const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    message += `🔴 **${grant.name}**\n`;
    message += `   Deadline: ${grant.deadline} (${daysLeft} days)\n`;
    message += `   Relevance: ${grant.relevance_score}%\n`;
    if (grant.metadata?.matched_projects) {
      message += `   Projects: ${grant.metadata.matched_projects.join(', ')}\n`;
    }
    message += '\n';
  }

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });
    console.log('📢 Discord alert sent');
  } catch (e) {
    console.error('Failed to send Discord alert:', e.message);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function parseArgs(args) {
  const options = {};
  let i = 0;
  while (i < args.length) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      options[key] = value;
      i += value === true ? 1 : 2;
    } else {
      i++;
    }
  }
  return options;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = parseArgs(args.slice(1));

  try {
    switch (command) {
      case 'scout':
        await scoutGrants({ category: options.category });
        break;

      case 'match':
        await matchGrants(options.project);
        break;

      case 'upcoming':
        await showUpcoming(parseInt(options.days) || 30);
        break;

      case 'at-risk':
        await showAtRisk();
        break;

      case 'add':
        if (!options.name) {
          console.log('Usage: alta add --name "Grant Name" [--url URL] [--deadline YYYY-MM-DD] [--amountMin N] [--amountMax N]');
          process.exit(1);
        }
        await addGrant(options);
        break;

      case 'summary':
        await showSummary();
        break;

      default:
        console.log(`
🦅 ALTA - Grant Scout Agent
   Australian Livelihood & Territory Advancement

Usage:
  alta scout [--category X]    Search for grants (categories: justice, indigenous, stories, etc.)
  alta match [--project X]     Match stored grants to ACT projects
  alta upcoming [--days N]     Show grants with upcoming deadlines (default: 30 days)
  alta at-risk                 Show high-relevance grants at risk of missing
  alta add --name "..." [opts] Manually add a grant
  alta summary                 Show grant pipeline summary

Add options:
  --name "Grant Name"          Grant name (required)
  --url "https://..."          Application URL
  --deadline YYYY-MM-DD        Application deadline
  --amountMin N                Minimum grant amount
  --amountMax N                Maximum grant amount
  --source "GrantConnect"      Where you found it
  --categories "justice,indigenous"  Relevant categories

Examples:
  alta scout --category indigenous
  alta match --project ACT-JH
  alta add --name "SEDI Grant" --deadline 2026-03-15 --amountMin 25000 --amountMax 50000
  alta upcoming --days 14
`);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();

export { scoutGrants, matchGrants, getUpcomingGrants, showAtRisk, addGrant };
