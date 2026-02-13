#!/usr/bin/env node
/**
 * ACT Project Enrichment Engine
 *
 * Deep enrichment of projects using ALL available knowledge sources:
 * - Supabase: contacts, communications, voice notes, relationship health
 * - GHL: contacts, tags, pipelines, opportunities
 * - Notion: project pages, compendium, research
 * - Empathy Ledger v2: stories, storytellers, ALMA data
 * - GitHub: repos, activity, codebases
 * - Project codes config: mission, focus, LCAA themes
 *
 * Output: Rich project intelligence for dashboards
 *
 * Usage:
 *   node scripts/project-enrichment.mjs enrich ACT-JH        # Single project
 *   node scripts/project-enrichment.mjs enrich-all           # All projects
 *   node scripts/project-enrichment.mjs frontends            # ACT frontend sites
 *   node scripts/project-enrichment.mjs dashboard            # Generate dashboard data
 *   node scripts/project-enrichment.mjs opportunities        # Find opportunities
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { loadProjectsConfig } from './lib/project-loader.mjs';
import { sendDiscordMessage, sendEmbed } from './discord-notify.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const OUTPUT_DIR = '.claude/cache/project-intelligence';

// ============================================================================
// ACT ECOSYSTEM FRONTENDS
// ============================================================================

const ACT_FRONTENDS = {
  'act-studio': {
    name: 'ACT Studio',
    repo: 'actconsortium/act-studio',
    url: 'https://act.studio',
    description: 'Main ACT portfolio and project showcase',
    category: 'public',
    tech: ['Next.js', 'Tailwind', 'Supabase']
  },
  'empathy-ledger-v2': {
    name: 'Empathy Ledger v2',
    repo: 'actconsortium/empathy-ledger-v2',
    url: 'https://empathyledger.org',
    description: 'Community storytelling platform - storytellers own their data',
    category: 'core',
    tech: ['Next.js', 'Supabase', 'ALMA'],
    path: '/Users/benknight/Code/empathy-ledger-v2'
  },
  'act-intelligence': {
    name: 'ACT Intelligence Platform',
    repo: 'local',
    url: 'http://localhost:3999',
    description: 'Internal dashboard for relationship management and analytics',
    category: 'internal',
    tech: ['React', 'Vite', 'Supabase'],
    path: '/Users/benknight/Code/act-intelligence-platform'
  },
  'webflow-portfolio': {
    name: 'Year in Review',
    repo: 'local',
    url: 'https://act.place',
    description: 'Annual review and project showcase',
    category: 'public',
    tech: ['Next.js', 'Webflow', 'Supabase'],
    path: '/Users/benknight/Code/act-intelligence-platform/apps/webflow-portfolio'
  },
  'justicehub': {
    name: 'JusticeHub Platform',
    repo: 'actconsortium/justicehub-platform',
    url: 'https://justicehub.org.au',
    description: 'Youth justice reform network hub',
    category: 'project',
    tech: ['Next.js', 'Supabase']
  },
  'goods-website': {
    name: 'Goods Website',
    repo: 'local',
    url: 'https://goods.org.au',
    description: 'Social enterprise marketplace',
    category: 'project',
    tech: ['Webflow', 'Supabase'],
    path: '/Users/benknight/Code/goods-website'
  },
  'act-global-infrastructure': {
    name: 'ACT Global Infrastructure',
    repo: 'local',
    url: null,
    description: 'Single source of truth - 110+ scripts, agents, migrations',
    category: 'infrastructure',
    tech: ['Node.js', 'Supabase', 'Docker'],
    path: '/Users/benknight/Code/act-global-infrastructure'
  },
  'clawdbot-docker': {
    name: 'ClawdBot Docker',
    repo: 'local',
    url: null,
    description: 'NAS deployment - Telegram, Signal, agent services',
    category: 'infrastructure',
    tech: ['Docker', 'Node.js', 'Signal API'],
    path: '/Users/benknight/Code/act-global-infrastructure/clawdbot-docker'
  },
  'the-harvest-website': {
    name: 'The Harvest Website',
    repo: 'actconsortium/the-harvest-website',
    url: 'https://www.theharvestwitta.com.au',
    description: 'The Harvest Witta - regenerative farm and community hub',
    category: 'project',
    tech: ['Next.js', 'Vercel'],
    projectCode: 'ACT-HV',
    path: '/Users/benknight/Code/the-harvest-website'
  },
  'the-harvest-swot': {
    name: 'Harvest SWOT Analysis',
    repo: 'actconsortium/witta-swot-analysis',
    url: 'https://www.theharvestwitta.com.au',
    description: 'Strategic planning tool for The Harvest',
    category: 'project',
    tech: ['Next.js', 'Vercel'],
    projectCode: 'ACT-HV'
  }
};

// ============================================================================
// KNOWLEDGE SOURCES
// ============================================================================

async function loadProjectCodes() {
  try {
    return await loadProjectsConfig();
  } catch (e) {
    console.warn('Could not load project codes:', e.message);
    return { projects: {} };
  }
}

/**
 * Get contacts for a project from GHL
 */
async function getProjectContacts(project) {
  if (!supabase || !project.ghl_tags?.length) return { contacts: [], stats: {} };

  const allContacts = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  for (const tag of project.ghl_tags) {
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, full_name, email, phone, company_name, tags, last_contact_date, is_storyteller, stories_count')
      .contains('tags', [tag]);

    for (const c of contacts || []) {
      if (!allContacts.find(x => x.ghl_id === c.ghl_id)) {
        allContacts.push(c);
      }
    }
  }

  // Calculate stats
  const active = allContacts.filter(c => c.last_contact_date >= thirtyDaysAgo).length;
  const stale = allContacts.filter(c => !c.last_contact_date || c.last_contact_date < thirtyDaysAgo).length;
  const storytellers = allContacts.filter(c => c.is_storyteller).length;
  const totalStories = allContacts.reduce((sum, c) => sum + (c.stories_count || 0), 0);

  return {
    contacts: allContacts,
    stats: {
      total: allContacts.length,
      active,
      stale,
      storytellers,
      totalStories
    }
  };
}

/**
 * Get relationship health for contacts
 */
async function getRelationshipHealth(contactIds) {
  if (!supabase || !contactIds.length) return [];

  const { data } = await supabase
    .from('relationship_health')
    .select('ghl_contact_id, temperature, days_since_contact, lcaa_stage, risk_flags')
    .in('ghl_contact_id', contactIds);

  return data || [];
}

/**
 * Get communications for project contacts
 */
async function getProjectCommunications(contactIds, limit = 20) {
  if (!supabase || !contactIds.length) return { recent: [], stats: {} };

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Recent communications
  const { data: recent } = await supabase
    .from('communications_history')
    .select('id, ghl_contact_id, subject, channel, direction, occurred_at, content_preview')
    .in('ghl_contact_id', contactIds)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  // Stats
  const { count: last7Days } = await supabase
    .from('communications_history')
    .select('*', { count: 'exact', head: true })
    .in('ghl_contact_id', contactIds)
    .gte('occurred_at', sevenDaysAgo);

  const { count: last30Days } = await supabase
    .from('communications_history')
    .select('*', { count: 'exact', head: true })
    .in('ghl_contact_id', contactIds)
    .gte('occurred_at', thirtyDaysAgo);

  const { count: inbound } = await supabase
    .from('communications_history')
    .select('*', { count: 'exact', head: true })
    .in('ghl_contact_id', contactIds)
    .eq('direction', 'inbound')
    .gte('occurred_at', thirtyDaysAgo);

  return {
    recent: recent || [],
    stats: {
      last7Days: last7Days || 0,
      last30Days: last30Days || 0,
      inbound: inbound || 0,
      outbound: (last30Days || 0) - (inbound || 0)
    }
  };
}

/**
 * Get voice notes mentioning project
 */
async function getProjectVoiceNotes(project) {
  if (!supabase) return [];

  const searchTerms = [
    project.name,
    ...(project.ghl_tags || []),
    ...(project.leads || [])
  ].filter(Boolean);

  const notes = [];

  for (const term of searchTerms.slice(0, 5)) {
    const { data } = await supabase
      .from('voice_notes')
      .select('id, summary, recorded_at, action_items, mentioned_people, project_context')
      .or(`transcript.ilike.%${term}%,summary.ilike.%${term}%`)
      .order('recorded_at', { ascending: false })
      .limit(5);

    for (const n of data || []) {
      if (!notes.find(x => x.id === n.id)) {
        notes.push(n);
      }
    }
  }

  return notes;
}

/**
 * Get stories from Empathy Ledger v2
 */
async function getProjectStories(project) {
  if (!supabase) return { stories: [], stats: {} };

  // Try to get stories by project name/tags
  const searchTerms = [project.name, ...(project.ghl_tags || [])];
  const allStories = [];

  for (const term of searchTerms.slice(0, 3)) {
    const { data } = await supabase
      .from('stories')
      .select('id, title, summary, created_at, storyteller_id, lcaa_stage, impact_score')
      .or(`title.ilike.%${term}%,summary.ilike.%${term}%,tags.cs.{${term}}`)
      .limit(20);

    for (const s of data || []) {
      if (!allStories.find(x => x.id === s.id)) {
        allStories.push(s);
      }
    }
  }

  return {
    stories: allStories,
    stats: {
      total: allStories.length,
      byLcaaStage: allStories.reduce((acc, s) => {
        const stage = s.lcaa_stage || 'unknown';
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {})
    }
  };
}

/**
 * Get ALMA research for project
 */
async function getProjectResearch(project) {
  if (!supabase) return { evidence: [], interventions: [] };

  const { data: evidence } = await supabase
    .from('alma_evidence')
    .select('id, title, summary, source, created_at')
    .or(`tags.cs.{${project.alma_program}},title.ilike.%${project.name}%`)
    .limit(10);

  const { data: interventions } = await supabase
    .from('alma_interventions')
    .select('id, name, description, outcomes_summary')
    .or(`program_id.eq.${project.alma_program},name.ilike.%${project.name}%`)
    .limit(10);

  return {
    evidence: evidence || [],
    interventions: interventions || []
  };
}

/**
 * Search Notion for project pages
 */
async function searchNotionPages(project) {
  if (!NOTION_TOKEN) return [];

  const pages = [];

  for (const pageName of project.notion_pages || [project.name]) {
    try {
      const response = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          query: pageName,
          filter: { value: 'page', property: 'object' },
          page_size: 5
        })
      });

      const data = await response.json();

      for (const page of data.results || []) {
        const title = page.properties?.title?.title?.[0]?.plain_text ||
                     page.properties?.Name?.title?.[0]?.plain_text ||
                     'Untitled';
        pages.push({
          id: page.id,
          title,
          url: page.url,
          lastEdited: page.last_edited_time,
          createdTime: page.created_time
        });
      }
    } catch (e) {
      console.warn(`  Notion search failed for "${pageName}":`, e.message);
    }
  }

  return pages;
}

/**
 * Identify opportunities for a project
 */
function identifyOpportunities(project, enrichment) {
  const opportunities = [];

  // Relationship opportunities
  if (enrichment.contacts.stats.stale > enrichment.contacts.stats.active) {
    opportunities.push({
      type: 'relationship',
      priority: 'high',
      title: 'Re-engage dormant relationships',
      description: `${enrichment.contacts.stats.stale} contacts haven't been contacted in 30+ days`,
      action: 'Run cultivator for project contacts'
    });
  }

  // Storytelling opportunities
  if (enrichment.contacts.stats.storytellers === 0 && enrichment.stories.stats.total === 0) {
    opportunities.push({
      type: 'storytelling',
      priority: 'medium',
      title: 'Capture stories',
      description: 'No stories or storytellers connected to this project',
      action: 'Identify potential storytellers from contacts'
    });
  }

  // Communication opportunities
  if (enrichment.communications.stats.last7Days === 0 && project.priority === 'high') {
    opportunities.push({
      type: 'communication',
      priority: 'high',
      title: 'No recent activity',
      description: 'High-priority project with no communications in 7 days',
      action: 'Schedule project check-in'
    });
  }

  // Documentation opportunities
  if (!enrichment.notion.length) {
    opportunities.push({
      type: 'documentation',
      priority: 'medium',
      title: 'Create project documentation',
      description: 'No Notion pages found for this project',
      action: 'Create project page in Notion'
    });
  }

  // Research opportunities
  if (project.alma_program && !enrichment.research.evidence.length) {
    opportunities.push({
      type: 'research',
      priority: 'low',
      title: 'Add research evidence',
      description: `No ALMA evidence linked to ${project.alma_program}`,
      action: 'Run ALMA research crawler for project domain'
    });
  }

  return opportunities;
}

/**
 * Calculate project health score
 */
function calculateHealthScore(project, enrichment) {
  let score = 100;

  // Contacts (-20 if none, -10 if mostly stale)
  if (enrichment.contacts.stats.total === 0) {
    score -= 20;
  } else if (enrichment.contacts.stats.stale > enrichment.contacts.stats.active) {
    score -= 10;
  }

  // Communications (-15 if none in 30d for high priority)
  if (project.priority === 'high' && enrichment.communications.stats.last30Days === 0) {
    score -= 15;
  } else if (enrichment.communications.stats.last7Days === 0) {
    score -= 5;
  }

  // Documentation (-10 if no Notion)
  if (!enrichment.notion.length) {
    score -= 10;
  }

  // Stories (+5 for having stories)
  if (enrichment.stories.stats.total > 0) {
    score += 5;
  }

  // Storytellers (+5 for having storytellers)
  if (enrichment.contacts.stats.storytellers > 0) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// ENRICHMENT FUNCTIONS
// ============================================================================

/**
 * Full enrichment of a single project
 */
async function enrichProject(projectCode) {
  const config = await loadProjectCodes();
  const project = config.projects[projectCode.toUpperCase()];

  if (!project) {
    throw new Error(`Project not found: ${projectCode}`);
  }

  console.log(`\n🔍 Enriching ${projectCode}: ${project.name}\n`);

  const enrichment = {
    code: projectCode.toUpperCase(),
    project,
    enrichedAt: new Date().toISOString(),
    contacts: { contacts: [], stats: {} },
    relationships: [],
    communications: { recent: [], stats: {} },
    voiceNotes: [],
    stories: { stories: [], stats: {} },
    research: { evidence: [], interventions: [] },
    notion: [],
    opportunities: [],
    healthScore: 0
  };

  // Gather all data in parallel where possible
  console.log('  📇 Loading contacts...');
  enrichment.contacts = await getProjectContacts(project);
  console.log(`     Found ${enrichment.contacts.stats.total} contacts`);

  if (enrichment.contacts.contacts.length > 0) {
    const contactIds = enrichment.contacts.contacts.map(c => c.ghl_id);

    console.log('  🌡️ Loading relationship health...');
    enrichment.relationships = await getRelationshipHealth(contactIds);

    console.log('  📬 Loading communications...');
    enrichment.communications = await getProjectCommunications(contactIds);
    console.log(`     ${enrichment.communications.stats.last30Days} in last 30 days`);
  }

  console.log('  🎤 Loading voice notes...');
  enrichment.voiceNotes = await getProjectVoiceNotes(project);
  console.log(`     Found ${enrichment.voiceNotes.length} voice notes`);

  console.log('  📖 Loading stories...');
  enrichment.stories = await getProjectStories(project);
  console.log(`     Found ${enrichment.stories.stats.total} stories`);

  console.log('  🔬 Loading research...');
  enrichment.research = await getProjectResearch(project);
  console.log(`     Found ${enrichment.research.evidence.length} evidence items`);

  console.log('  📓 Searching Notion...');
  enrichment.notion = await searchNotionPages(project);
  console.log(`     Found ${enrichment.notion.length} Notion pages`);

  // Identify opportunities
  console.log('  💡 Identifying opportunities...');
  enrichment.opportunities = identifyOpportunities(project, enrichment);
  console.log(`     Found ${enrichment.opportunities.length} opportunities`);

  // Calculate health score
  enrichment.healthScore = calculateHealthScore(project, enrichment);
  console.log(`\n  📊 Health Score: ${enrichment.healthScore}/100`);

  // Save to cache
  const outputPath = `${OUTPUT_DIR}/${projectCode.toLowerCase()}.json`;
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  writeFileSync(outputPath, JSON.stringify(enrichment, null, 2));
  console.log(`\n  💾 Saved to ${outputPath}`);

  return enrichment;
}

/**
 * Enrich all projects
 */
async function enrichAllProjects() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  🚀 ACT Project Enrichment - Full Run');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const config = await loadProjectCodes();
  const projectCodes = Object.keys(config.projects);

  console.log(`Processing ${projectCodes.length} projects...\n`);

  const results = [];
  const errors = [];

  for (const code of projectCodes) {
    try {
      const enrichment = await enrichProject(code);
      results.push({
        code,
        name: enrichment.project.name,
        healthScore: enrichment.healthScore,
        contacts: enrichment.contacts.stats.total,
        opportunities: enrichment.opportunities.length
      });
    } catch (e) {
      console.error(`  ❌ Failed: ${code} - ${e.message}`);
      errors.push({ code, error: e.message });
    }
  }

  // Generate summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📊 Enrichment Summary');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const healthy = results.filter(r => r.healthScore >= 80);
  const needsAttention = results.filter(r => r.healthScore < 80);

  console.log(`✅ Healthy projects (80+):    ${healthy.length}`);
  console.log(`⚠️  Needs attention:           ${needsAttention.length}`);
  console.log(`❌ Errors:                     ${errors.length}`);
  console.log('');

  // Top opportunities
  const allOpportunities = results.flatMap(r => r.opportunities || []);
  const highPriority = allOpportunities.filter(o => o?.priority === 'high');

  if (highPriority.length > 0) {
    console.log(`🔥 High Priority Opportunities: ${highPriority.length}`);
  }

  // Save dashboard data
  const dashboardData = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      healthy: healthy.length,
      needsAttention: needsAttention.length,
      errors: errors.length
    },
    projects: results.sort((a, b) => a.healthScore - b.healthScore),
    errors
  };

  const dashboardPath = `${OUTPUT_DIR}/dashboard.json`;
  writeFileSync(dashboardPath, JSON.stringify(dashboardData, null, 2));
  console.log(`\n💾 Dashboard data saved to ${dashboardPath}`);

  return dashboardData;
}

/**
 * Fetch Vercel projects with deployment URLs
 */
async function getVercelProjects() {
  try {
    const { execSync } = await import('child_process');
    // Capture both stdout and stderr
    const output = execSync('vercel projects list --no-color 2>&1', {
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, FORCE_COLOR: '0' }
    });

    const projects = new Map();
    const lines = output.split('\n');

    for (const line of lines) {
      // Parse lines like: "  empathy-ledger-v2   https://empathy-ledger-v2.vercel.app   4m   22.x"
      // Match: 2+ spaces, project name, many spaces, URL or --, many spaces, time
      const match = line.match(/^\s{2}([\w-]+)\s+(https?:\/\/\S+|--)\s+(\d+[smhd])\s+/);
      if (match) {
        const projectName = match[1];
        const urlOrDash = match[2];
        const lastUpdated = match[3];

        // Skip if URL is "--" (no deployment)
        if (urlOrDash !== '--') {
          projects.set(projectName, {
            name: projectName,
            productionUrl: urlOrDash,
            lastUpdated
          });
        }
      }
    }

    return projects;
  } catch (e) {
    console.warn('  ⚠️ Could not fetch Vercel projects:', e.message);
    return new Map();
  }
}

// Vercel project name mapping to our frontend IDs
const VERCEL_PROJECT_MAP = {
  'empathy-ledger-v2': 'empathy-ledger-v2',
  'webflow-portfolio': 'webflow-portfolio',
  'justicehub': 'justicehub',
  'act-global-infrastructure': 'act-global-infrastructure',
  'witta-swot-analysis': 'the-harvest',
  'the-harvest-website': 'the-harvest-alt',
  'act-placemat': 'act-placemat',
  'act-farm': 'act-farm',
  'hub': 'hub',
  'act-regenerative-studio': 'act-studio'
};

/**
 * Generate ACT Frontends dashboard
 */
async function generateFrontendsDashboard() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  🌐 ACT Frontends Dashboard');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Fetch Vercel deployment data
  console.log('  📡 Fetching Vercel deployments...');
  const vercelProjects = await getVercelProjects();
  console.log(`  ✓ Found ${vercelProjects.size} Vercel projects\n`);

  const frontends = [];

  for (const [key, frontend] of Object.entries(ACT_FRONTENDS)) {
    const info = {
      id: key,
      ...frontend,
      status: 'unknown',
      lastActivity: null,
      files: null,
      vercel: null
    };

    // Check Vercel deployment
    const vercelName = Object.entries(VERCEL_PROJECT_MAP).find(([_, v]) => v === key)?.[0];
    if (vercelName && vercelProjects.has(vercelName)) {
      const vercel = vercelProjects.get(vercelName);
      info.vercel = vercel;
      info.url = vercel.productionUrl; // Use Vercel URL as primary
      info.status = 'online';
    }

    // Check if local path exists and get stats
    if (frontend.path && existsSync(frontend.path)) {
      if (info.status === 'unknown') info.status = 'local';
      try {
        const { execSync } = await import('child_process');

        // Get last git commit
        const lastCommit = execSync(`git -C "${frontend.path}" log -1 --format="%H|%s|%ci" 2>/dev/null || echo ""`).toString().trim();
        if (lastCommit) {
          const [hash, message, date] = lastCommit.split('|');
          info.lastActivity = { hash: hash.slice(0, 7), message, date };
        }

        // Count files
        const fileCount = execSync(`find "${frontend.path}" -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.mjs" 2>/dev/null | grep -v node_modules | wc -l`).toString().trim();
        info.files = parseInt(fileCount) || null;
      } catch (e) {
        // Silently continue
      }
    }

    frontends.push(info);
    const statusIcon = info.status === 'online' ? '✅' : info.status === 'local' ? '🔷' : '❓';
    console.log(`${statusIcon} ${info.name.padEnd(30)} ${info.url || 'local'}`);
  }

  // Add any Vercel projects not in our config
  for (const [name, vercel] of vercelProjects) {
    const mappedId = VERCEL_PROJECT_MAP[name];
    if (!mappedId || !ACT_FRONTENDS[mappedId]) {
      frontends.push({
        id: `vercel-${name}`,
        name: name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        url: vercel.productionUrl,
        status: 'online',
        category: 'vercel',
        tech: [],
        vercel
      });
      console.log(`🆕 ${name.padEnd(30)} ${vercel.productionUrl}`);
    }
  }

  // Save dashboard
  const dashboardPath = `${OUTPUT_DIR}/frontends.json`;
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  writeFileSync(dashboardPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    frontends,
    categories: {
      public: frontends.filter(f => f.category === 'public'),
      internal: frontends.filter(f => f.category === 'internal'),
      infrastructure: frontends.filter(f => f.category === 'infrastructure'),
      project: frontends.filter(f => f.category === 'project')
    }
  }, null, 2));

  console.log(`\n💾 Saved to ${dashboardPath}`);

  return frontends;
}

/**
 * Print project enrichment report
 */
function printEnrichmentReport(enrichment) {
  const e = enrichment;
  const p = e.project;

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ${e.code}: ${p.name}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📊 Health Score: ${e.healthScore}/100`);
  console.log(`📁 Category: ${p.category} | Priority: ${p.priority}`);
  console.log(`🏷️ Tags: ${(p.ghl_tags || []).join(', ')}`);
  if (p.lcaa_themes?.length) {
    console.log(`🌱 LCAA: ${p.lcaa_themes.join(' → ')}`);
  }
  if (p.cultural_protocols) {
    console.log('⚠️  Cultural protocols apply');
  }
  console.log('');

  // Contacts
  console.log('👥 CONTACTS');
  console.log(`   Total: ${e.contacts.stats.total} | Active: ${e.contacts.stats.active} | Stale: ${e.contacts.stats.stale}`);
  console.log(`   Storytellers: ${e.contacts.stats.storytellers} | Stories: ${e.contacts.stats.totalStories}`);

  // Top contacts
  if (e.contacts.contacts.length > 0) {
    console.log('   Key contacts:');
    e.contacts.contacts.slice(0, 5).forEach(c => {
      console.log(`     • ${c.full_name} ${c.is_storyteller ? '📖' : ''}`);
    });
  }
  console.log('');

  // Communications
  console.log('📬 COMMUNICATIONS');
  console.log(`   Last 7 days: ${e.communications.stats.last7Days} | Last 30 days: ${e.communications.stats.last30Days}`);
  console.log(`   Inbound: ${e.communications.stats.inbound} | Outbound: ${e.communications.stats.outbound}`);

  if (e.communications.recent.length > 0) {
    console.log('   Recent:');
    e.communications.recent.slice(0, 3).forEach(c => {
      const date = new Date(c.occurred_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
      console.log(`     • ${date} [${c.direction}] ${c.subject?.slice(0, 40) || 'No subject'}`);
    });
  }
  console.log('');

  // Stories
  if (e.stories.stats.total > 0) {
    console.log('📖 STORIES');
    console.log(`   Total: ${e.stories.stats.total}`);
    console.log(`   By LCAA: ${JSON.stringify(e.stories.stats.byLcaaStage)}`);
    console.log('');
  }

  // Voice Notes
  if (e.voiceNotes.length > 0) {
    console.log('🎤 VOICE NOTES');
    e.voiceNotes.slice(0, 3).forEach(v => {
      console.log(`   • ${v.summary?.slice(0, 60)}...`);
    });
    console.log('');
  }

  // Notion
  if (e.notion.length > 0) {
    console.log('📓 NOTION PAGES');
    e.notion.forEach(n => {
      console.log(`   • ${n.title}`);
    });
    console.log('');
  }

  // Opportunities
  if (e.opportunities.length > 0) {
    console.log('💡 OPPORTUNITIES');
    e.opportunities.forEach(o => {
      const icon = o.priority === 'high' ? '🔥' : o.priority === 'medium' ? '⚡' : '💭';
      console.log(`   ${icon} [${o.type}] ${o.title}`);
      console.log(`      → ${o.action}`);
    });
    console.log('');
  }
}

// ============================================================================
// CLI
// ============================================================================

const command = process.argv[2] || 'help';
const arg = process.argv[3];

switch (command) {
  case 'enrich':
    if (!arg) {
      console.log('Usage: project-enrichment.mjs enrich <PROJECT-CODE>');
      console.log('Example: project-enrichment.mjs enrich ACT-JH');
      process.exit(1);
    }
    const enrichment = await enrichProject(arg);
    printEnrichmentReport(enrichment);
    break;

  case 'enrich-all':
    await enrichAllProjects();
    break;

  case 'frontends':
    await generateFrontendsDashboard();
    break;

  case 'dashboard':
    // Generate both project and frontend dashboards
    await enrichAllProjects();
    await generateFrontendsDashboard();
    break;

  case 'opportunities':
    // Quick scan for opportunities
    console.log('\n🔍 Scanning for opportunities across all projects...\n');
    const config = await loadProjectCodes();
    const highPriorityProjects = Object.entries(config.projects)
      .filter(([_, p]) => p.priority === 'high')
      .slice(0, 10);

    for (const [code, project] of highPriorityProjects) {
      try {
        const e = await enrichProject(code);
        if (e.opportunities.length > 0) {
          console.log(`\n${code}: ${project.name}`);
          e.opportunities.filter(o => o.priority === 'high').forEach(o => {
            console.log(`  🔥 ${o.title}`);
          });
        }
      } catch (err) {
        // Skip errors
      }
    }
    break;

  default:
    console.log(`
🚀 ACT Project Enrichment Engine

Commands:
  enrich <code>     Deep enrichment of a single project
  enrich-all        Enrich ALL projects (full run)
  frontends         Generate ACT Frontends dashboard
  dashboard         Generate complete dashboard data
  opportunities     Quick scan for high-priority opportunities

Examples:
  node scripts/project-enrichment.mjs enrich ACT-JH
  node scripts/project-enrichment.mjs enrich-all
  node scripts/project-enrichment.mjs frontends

Knowledge Sources:
  • Supabase: contacts, communications, voice notes, health
  • GHL: contacts, tags, pipelines
  • Notion: project pages, compendium
  • Empathy Ledger v2: stories, storytellers
  • ALMA: research, evidence, interventions
  • GitHub: repos, codebases
`);
}
