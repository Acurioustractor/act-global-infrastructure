#!/usr/bin/env node
/**
 * ACT Vercel Projects Sync
 *
 * Syncs Vercel projects to ecosystem_sites table and tracks deployment history.
 *
 * Usage:
 *   node scripts/vercel-sync.mjs           - Sync all Vercel projects
 *   node scripts/vercel-sync.mjs --dry     - Dry run (show what would sync)
 *   node scripts/vercel-sync.mjs --list    - List Vercel projects only
 *
 * Environment Variables:
 *   VERCEL_TOKEN - Vercel API token
 *   SUPABASE_URL / SUPABASE_SHARED_URL
 *   SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SHARED_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
await import(join(__dirname, '../lib/load-env.mjs'));

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const DRY_RUN = process.argv.includes('--dry');
const LIST_ONLY = process.argv.includes('--list');

// ACT team ID (if using Vercel teams)
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

// Category mapping based on project name patterns
const CATEGORY_PATTERNS = {
  core: [/^act-/, /command-center/, /dashboard/, /api/],
  platform: [/empathy-ledger/, /justicehub/, /studio/, /intelligence/],
  community: [/farm/, /goods/, /harvest/, /patch/, /bali/]
};

// ============================================================================
// VERCEL API
// ============================================================================

/**
 * Fetch all Vercel projects
 */
async function fetchVercelProjects() {
  const projects = [];
  let next = null;

  do {
    const url = new URL('https://api.vercel.com/v9/projects');
    url.searchParams.set('limit', '100');
    if (next) url.searchParams.set('until', next);
    if (VERCEL_TEAM_ID) url.searchParams.set('teamId', VERCEL_TEAM_ID);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`Vercel API error: ${response.status}`);
    }

    const data = await response.json();
    projects.push(...data.projects);
    next = data.pagination?.next;
  } while (next);

  return projects;
}

/**
 * Fetch recent deployments for a project
 */
async function fetchProjectDeployments(projectId, limit = 5) {
  const url = new URL('https://api.vercel.com/v6/deployments');
  url.searchParams.set('projectId', projectId);
  url.searchParams.set('limit', limit.toString());
  if (VERCEL_TEAM_ID) url.searchParams.set('teamId', VERCEL_TEAM_ID);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`
    }
  });

  if (!response.ok) {
    console.error(`  ⚠️ Failed to fetch deployments: ${response.status}`);
    return [];
  }

  const data = await response.json();
  return data.deployments || [];
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Determine category based on project name
 */
function categorizeProject(name) {
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(name.toLowerCase())) {
        return category;
      }
    }
  }
  return 'community'; // Default
}

/**
 * Generate slug from project name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Get production URL for a project
 */
function getProductionUrl(project) {
  // Try to find production alias
  if (project.alias?.length) {
    const prodAlias = project.alias.find(a =>
      !a.includes('vercel.app') && !a.includes('.vercel.')
    ) || project.alias[0];
    return `https://${prodAlias}`;
  }

  // Fall back to Vercel-provided URL
  if (project.latestDeployments?.length) {
    const prodDeploy = project.latestDeployments.find(d => d.target === 'production');
    if (prodDeploy?.url) {
      return `https://${prodDeploy.url}`;
    }
  }

  // Default Vercel URL
  return `https://${project.name}.vercel.app`;
}

/**
 * Extract GitHub repo from project link
 */
function getGitHubRepo(project) {
  if (project.link?.type === 'github') {
    const org = project.link.org || project.link.repoOwner;
    const repo = project.link.repo || project.link.repoSlug;
    if (org && repo) {
      return `${org}/${repo}`;
    }
  }
  return null;
}

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

/**
 * Sync a single project to ecosystem_sites
 */
async function syncProject(project) {
  const slug = generateSlug(project.name);
  const url = getProductionUrl(project);
  const category = categorizeProject(project.name);
  const githubRepo = getGitHubRepo(project);

  const siteData = {
    name: project.name,
    slug,
    url,
    category,
    vercel_project_id: project.id,
    vercel_project_name: project.name,
    github_repo: githubRepo,
    updated_at: new Date().toISOString()
  };

  if (DRY_RUN) {
    console.log(`  Would sync: ${project.name} -> ${slug} (${category})`);
    return { action: 'dry_run', slug };
  }

  // Upsert to ecosystem_sites
  const { error } = await supabase
    .from('ecosystem_sites')
    .upsert(siteData, { onConflict: 'slug' });

  if (error) {
    console.error(`  ❌ Error syncing ${project.name}: ${error.message}`);
    return { action: 'error', error: error.message };
  }

  return { action: 'synced', slug };
}

/**
 * Sync deployments for a site
 */
async function syncDeployments(site, deployments) {
  if (DRY_RUN || !deployments.length) return;

  for (const deploy of deployments) {
    const deployData = {
      site_id: site.id,
      vercel_deployment_id: deploy.uid,
      status: deploy.state || deploy.readyState,
      environment: deploy.target || 'preview',
      git_commit_sha: deploy.meta?.githubCommitSha,
      git_commit_message: deploy.meta?.githubCommitMessage,
      git_branch: deploy.meta?.githubCommitRef,
      build_duration_seconds: deploy.buildingAt && deploy.ready
        ? Math.round((new Date(deploy.ready) - new Date(deploy.buildingAt)) / 1000)
        : null,
      deployed_at: deploy.ready ? new Date(deploy.ready).toISOString() : null
    };

    const { error } = await supabase
      .from('site_deployments')
      .upsert(deployData, { onConflict: 'vercel_deployment_id' });

    if (error && !error.message.includes('duplicate')) {
      console.error(`    ⚠️ Deploy sync error: ${error.message}`);
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n========================================');
  console.log('  ACT Vercel Projects Sync');
  console.log('========================================\n');

  if (!VERCEL_TOKEN) {
    console.error('❌ VERCEL_TOKEN not configured');
    process.exit(1);
  }

  if (!supabase && !LIST_ONLY) {
    console.error('❌ Supabase not configured');
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('🔍 DRY RUN - No database writes\n');
  }

  // Fetch all Vercel projects
  console.log('Fetching Vercel projects...');
  const projects = await fetchVercelProjects();
  console.log(`Found ${projects.length} projects\n`);

  if (LIST_ONLY) {
    console.log('Projects:');
    for (const project of projects) {
      const url = getProductionUrl(project);
      const category = categorizeProject(project.name);
      const repo = getGitHubRepo(project);
      console.log(`  ${project.name}`);
      console.log(`    ID: ${project.id}`);
      console.log(`    URL: ${url}`);
      console.log(`    Category: ${category}`);
      if (repo) console.log(`    GitHub: ${repo}`);
      console.log('');
    }
    return;
  }

  // Sync each project
  console.log('Syncing projects...\n');
  const results = { synced: 0, errors: 0, dry_run: 0 };

  for (const project of projects) {
    const result = await syncProject(project);
    results[result.action] = (results[result.action] || 0) + 1;

    // If synced, also sync deployments
    if (result.action === 'synced') {
      // Get the site ID
      const { data: site } = await supabase
        .from('ecosystem_sites')
        .select('id')
        .eq('slug', result.slug)
        .single();

      if (site) {
        const deployments = await fetchProjectDeployments(project.id);
        await syncDeployments(site, deployments);

        // Update last deployment time
        const latestDeploy = deployments.find(d => d.target === 'production' && d.ready);
        if (latestDeploy) {
          await supabase
            .from('ecosystem_sites')
            .update({ last_deployment_at: new Date(latestDeploy.ready).toISOString() })
            .eq('id', site.id);
        }

        console.log(`  ✅ ${project.name} (${deployments.length} deployments)`);
      }
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('  Summary');
  console.log('========================================');
  console.log(`  Total projects: ${projects.length}`);
  console.log(`  Synced: ${results.synced || 0}`);
  console.log(`  Errors: ${results.errors || 0}`);
  if (DRY_RUN) console.log(`  Would sync: ${results.dry_run || 0}`);
  console.log('========================================\n');
}

main().catch(err => {
  console.error('❌ Sync failed:', err.message);
  process.exit(1);
});

export { fetchVercelProjects, fetchProjectDeployments, syncProject };
