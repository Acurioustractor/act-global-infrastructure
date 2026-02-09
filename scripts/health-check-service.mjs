#!/usr/bin/env node
/**
 * ACT Ecosystem Health Check Service
 *
 * Multi-layer health monitoring for ACT ecosystem sites:
 * - Layer 1: HTTP health (status, response time, SSL)
 * - Layer 2: Vercel health (deployment status, build time)
 * - Layer 3: GitHub health (last commit, PRs, CI status, security)
 *
 * Usage:
 *   node scripts/health-check-service.mjs           - Check all sites
 *   node scripts/health-check-service.mjs --site X  - Check specific site by slug
 *   node scripts/health-check-service.mjs --dry     - Dry run (no DB writes)
 *
 * Environment Variables:
 *   SUPABASE_URL / SUPABASE_SHARED_URL
 *   SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SHARED_SERVICE_ROLE_KEY
 *   VERCEL_TOKEN (optional, for Vercel health checks)
 *   GITHUB_TOKEN / GH_PROJECT_TOKEN (optional, for GitHub health checks)
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';
import http from 'http';

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
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_PROJECT_TOKEN;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const DRY_RUN = process.argv.includes('--dry');
const SITE_FILTER = process.argv.includes('--site')
  ? process.argv[process.argv.indexOf('--site') + 1]
  : null;

const HTTP_TIMEOUT = 10000; // 10 seconds

// ============================================================================
// LAYER 1: HTTP HEALTH CHECK
// ============================================================================

/**
 * Check HTTP health of a URL
 * @param {string} url - URL to check
 * @returns {Promise<Object>} HTTP health data
 */
async function checkHttpHealth(url) {
  const result = {
    http_status: null,
    http_response_time_ms: null,
    http_error: null,
    ssl_valid: null,
    ssl_expires_at: null
  };

  try {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const response = await new Promise((resolve, reject) => {
      const req = client.request(url, {
        method: 'HEAD',
        timeout: HTTP_TIMEOUT,
        rejectUnauthorized: true
      }, (res) => {
        result.http_response_time_ms = Date.now() - startTime;
        result.http_status = res.statusCode;

        // Check SSL certificate
        if (isHttps && res.socket) {
          const cert = res.socket.getPeerCertificate();
          if (cert && cert.valid_to) {
            result.ssl_valid = true;
            result.ssl_expires_at = new Date(cert.valid_to).toISOString();
          }
        }

        resolve(res);
      });

      req.on('error', (err) => {
        result.http_response_time_ms = Date.now() - startTime;

        if (err.code === 'CERT_HAS_EXPIRED' || err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          result.ssl_valid = false;
          result.http_error = `SSL Error: ${err.code}`;
        } else {
          result.http_error = err.message;
        }

        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        result.http_error = 'Request timeout';
        reject(new Error('Timeout'));
      });

      req.end();
    });

  } catch (error) {
    if (!result.http_error) {
      result.http_error = error.message;
    }
  }

  return result;
}

// ============================================================================
// LAYER 2: VERCEL HEALTH CHECK
// ============================================================================

/**
 * Check Vercel deployment health
 * @param {string} projectId - Vercel project ID
 * @returns {Promise<Object>} Vercel health data
 */
async function checkVercelHealth(projectId) {
  const result = {
    vercel_deployment_status: null,
    vercel_deployment_id: null,
    vercel_build_time_seconds: null,
    vercel_error: null
  };

  if (!VERCEL_TOKEN || !projectId) {
    return result;
  }

  try {
    const response = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1&state=READY,BUILDING,ERROR`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      result.vercel_error = `API error: ${response.status}`;
      return result;
    }

    const data = await response.json();
    const deployment = data.deployments?.[0];

    if (deployment) {
      result.vercel_deployment_status = deployment.state || deployment.readyState;
      result.vercel_deployment_id = deployment.uid;

      // Calculate build time if available
      if (deployment.buildingAt && deployment.ready) {
        const buildStart = new Date(deployment.buildingAt).getTime();
        const buildEnd = new Date(deployment.ready).getTime();
        result.vercel_build_time_seconds = Math.round((buildEnd - buildStart) / 1000);
      }
    }

  } catch (error) {
    result.vercel_error = error.message;
  }

  return result;
}

// ============================================================================
// LAYER 3: GITHUB HEALTH CHECK
// ============================================================================

/**
 * Check GitHub repository health
 * @param {string} repo - Repository in format 'owner/repo'
 * @returns {Promise<Object>} GitHub health data
 */
async function checkGitHubHealth(repo) {
  const result = {
    github_last_commit_at: null,
    github_last_commit_sha: null,
    github_open_prs: 0,
    github_failed_checks: 0,
    github_security_alerts: 0
  };

  if (!GITHUB_TOKEN || !repo) {
    return result;
  }

  try {
    const [owner, repoName] = repo.split('/');

    // GraphQL query for comprehensive repo health
    const query = `
      query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          defaultBranchRef {
            target {
              ... on Commit {
                oid
                committedDate
                statusCheckRollup {
                  state
                }
              }
            }
          }
          pullRequests(states: OPEN) {
            totalCount
          }
          vulnerabilityAlerts(first: 100) {
            totalCount
          }
        }
      }
    `;

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        variables: { owner, repo: repoName }
      })
    });

    if (!response.ok) {
      console.error(`GitHub API error for ${repo}: ${response.status}`);
      return result;
    }

    const data = await response.json();
    const repository = data.data?.repository;

    if (repository) {
      const defaultBranch = repository.defaultBranchRef?.target;

      if (defaultBranch) {
        result.github_last_commit_sha = defaultBranch.oid;
        result.github_last_commit_at = defaultBranch.committedDate;

        // Check CI status
        const checkStatus = defaultBranch.statusCheckRollup?.state;
        if (checkStatus === 'FAILURE' || checkStatus === 'ERROR') {
          result.github_failed_checks = 1;
        }
      }

      result.github_open_prs = repository.pullRequests?.totalCount || 0;
      result.github_security_alerts = repository.vulnerabilityAlerts?.totalCount || 0;
    }

  } catch (error) {
    console.error(`GitHub check error for ${repo}:`, error.message);
  }

  return result;
}

// ============================================================================
// AGGREGATE HEALTH SCORE
// ============================================================================

/**
 * Calculate aggregate health score (0-100)
 *
 * Scoring breakdown:
 * - HTTP Health: 40 points
 *   - Status 2xx: 25 pts
 *   - Response time < 2s: 10 pts (scaled)
 *   - SSL valid: 5 pts
 * - Vercel Health: 30 points
 *   - READY: 30 pts
 *   - BUILDING: 20 pts
 *   - ERROR/other: 0 pts
 * - GitHub Health: 30 points
 *   - Recent commit (< 30 days): 15 pts (scaled)
 *   - CI passing: 10 pts
 *   - No security alerts: 5 pts
 */
function calculateHealthScore(httpHealth, vercelHealth, githubHealth) {
  let score = 0;

  // HTTP Health (40 pts max)
  if (httpHealth.http_status >= 200 && httpHealth.http_status < 300) {
    score += 25;
  } else if (httpHealth.http_status >= 300 && httpHealth.http_status < 400) {
    score += 15; // Redirects
  } else if (httpHealth.http_status) {
    score += 5; // At least responding
  }

  // Response time (10 pts max, scaled)
  if (httpHealth.http_response_time_ms) {
    if (httpHealth.http_response_time_ms < 500) {
      score += 10;
    } else if (httpHealth.http_response_time_ms < 1000) {
      score += 8;
    } else if (httpHealth.http_response_time_ms < 2000) {
      score += 5;
    } else if (httpHealth.http_response_time_ms < 5000) {
      score += 2;
    }
  }

  // SSL valid (5 pts)
  if (httpHealth.ssl_valid) {
    score += 5;
  }

  // Vercel Health (30 pts max)
  if (vercelHealth.vercel_deployment_status === 'READY') {
    score += 30;
  } else if (vercelHealth.vercel_deployment_status === 'BUILDING') {
    score += 20;
  } else if (vercelHealth.vercel_deployment_status === 'QUEUED') {
    score += 15;
  } else if (!vercelHealth.vercel_deployment_status && !vercelHealth.vercel_error) {
    // No Vercel project configured - give neutral score
    score += 15;
  }

  // GitHub Health (30 pts max)
  if (githubHealth.github_last_commit_at) {
    const daysSinceCommit = (Date.now() - new Date(githubHealth.github_last_commit_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCommit < 7) {
      score += 15;
    } else if (daysSinceCommit < 14) {
      score += 12;
    } else if (daysSinceCommit < 30) {
      score += 8;
    } else if (daysSinceCommit < 90) {
      score += 4;
    }
  } else if (!githubHealth.github_last_commit_at) {
    // No GitHub repo configured - give neutral score
    score += 7;
  }

  // CI passing (10 pts)
  if (githubHealth.github_failed_checks === 0) {
    score += 10;
  }

  // No security alerts (5 pts)
  if (githubHealth.github_security_alerts === 0) {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Determine health status from score
 */
function getHealthStatus(score) {
  if (score >= 80) return 'healthy';
  if (score >= 60) return 'degraded';
  if (score >= 30) return 'critical';
  return 'offline';
}

// ============================================================================
// MAIN CHECK FUNCTION
// ============================================================================

/**
 * Run health check for a single site
 */
async function checkSite(site) {
  console.log(`\n  Checking ${site.name} (${site.url})...`);

  // Run all layer checks in parallel
  const [httpHealth, vercelHealth, githubHealth] = await Promise.all([
    checkHttpHealth(site.url),
    checkVercelHealth(site.vercel_project_id),
    checkGitHubHealth(site.github_repo)
  ]);

  // Calculate aggregate score
  const healthScore = calculateHealthScore(httpHealth, vercelHealth, githubHealth);
  const healthStatus = getHealthStatus(healthScore);

  const result = {
    site_id: site.id,
    checked_at: new Date().toISOString(),
    ...httpHealth,
    ...vercelHealth,
    ...githubHealth,
    health_score: healthScore,
    health_status: healthStatus,
    raw_data: {
      http: httpHealth,
      vercel: vercelHealth,
      github: githubHealth
    }
  };

  // Status indicator
  const statusIcon = healthStatus === 'healthy' ? '✅' :
                     healthStatus === 'degraded' ? '🟡' :
                     healthStatus === 'critical' ? '🟠' : '🔴';

  console.log(`    ${statusIcon} Score: ${healthScore}/100 (${healthStatus})`);

  if (httpHealth.http_status) {
    console.log(`    HTTP: ${httpHealth.http_status} (${httpHealth.http_response_time_ms}ms)`);
  }
  if (httpHealth.http_error) {
    console.log(`    HTTP Error: ${httpHealth.http_error}`);
  }
  if (vercelHealth.vercel_deployment_status) {
    console.log(`    Vercel: ${vercelHealth.vercel_deployment_status}`);
  }
  if (githubHealth.github_last_commit_at) {
    const daysAgo = Math.round((Date.now() - new Date(githubHealth.github_last_commit_at).getTime()) / (1000 * 60 * 60 * 24));
    console.log(`    GitHub: Last commit ${daysAgo} days ago, ${githubHealth.github_open_prs} open PRs`);
  }

  return result;
}

/**
 * Main function - run health checks for all sites
 */
async function runHealthChecks() {
  console.log('\n========================================');
  console.log('  ACT Ecosystem Health Check');
  console.log('========================================');

  if (!supabase) {
    console.error('\n❌ Supabase not configured');
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN - No database writes');
  }

  // Fetch all sites
  let query = supabase.from('ecosystem_sites').select('*').order('display_order');

  if (SITE_FILTER) {
    query = query.eq('slug', SITE_FILTER);
  }

  const { data: sites, error } = await query;

  if (error) {
    console.error('\n❌ Error fetching sites:', error.message);
    process.exit(1);
  }

  if (!sites?.length) {
    console.log('\n⚠️ No sites found');
    return;
  }

  console.log(`\nChecking ${sites.length} site(s)...`);
  console.log(`Tokens: Vercel ${VERCEL_TOKEN ? '✅' : '❌'}, GitHub ${GITHUB_TOKEN ? '✅' : '❌'}`);

  const results = [];
  const startTime = Date.now();

  for (const site of sites) {
    try {
      const result = await checkSite(site);
      results.push(result);

      // Save to database
      if (!DRY_RUN) {
        const { error: insertError } = await supabase
          .from('site_health_checks')
          .insert(result);

        if (insertError) {
          console.error(`    ❌ DB Error: ${insertError.message}`);
        }
      }
    } catch (error) {
      console.error(`    ❌ Check failed: ${error.message}`);
    }
  }

  // Summary
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const healthy = results.filter(r => r.health_status === 'healthy').length;
  const degraded = results.filter(r => r.health_status === 'degraded').length;
  const critical = results.filter(r => r.health_status === 'critical').length;
  const offline = results.filter(r => r.health_status === 'offline').length;
  const avgScore = Math.round(results.reduce((sum, r) => sum + r.health_score, 0) / results.length);

  console.log('\n========================================');
  console.log('  Summary');
  console.log('========================================');
  console.log(`  Total sites: ${results.length}`);
  console.log(`  Average score: ${avgScore}/100`);
  console.log(`  ✅ Healthy: ${healthy}`);
  console.log(`  🟡 Degraded: ${degraded}`);
  console.log(`  🟠 Critical: ${critical}`);
  console.log(`  🔴 Offline: ${offline}`);
  console.log(`  Time: ${elapsed}s`);
  console.log('========================================\n');

  // Return results for programmatic use
  return {
    sites: results,
    summary: {
      total: results.length,
      avgScore,
      healthy,
      degraded,
      critical,
      offline
    }
  };
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

// Run if called directly
runHealthChecks().catch(err => {
  console.error('❌ Health check failed:', err.message);
  process.exit(1);
});

// Export for programmatic use
export {
  checkHttpHealth,
  checkVercelHealth,
  checkGitHubHealth,
  calculateHealthScore,
  getHealthStatus,
  checkSite,
  runHealthChecks
};
