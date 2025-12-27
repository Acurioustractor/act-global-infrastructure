#!/usr/bin/env node

/**
 * Log Deployment to Notion Deployments Database
 *
 * Called from GitHub Actions after successful Vercel deployment.
 * Records deployment details and runs health check.
 *
 * Usage:
 *   DEPLOYMENT_URL=https://... VERSION=v1.2.3 node log-deployment.mjs
 */

import fs from 'fs';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const API_VERSION = '2022-06-28';

// Load database IDs
const dbIds = JSON.parse(fs.readFileSync('./config/notion-database-ids.json', 'utf8'));

// Deployment details from environment (set by GitHub Action)
const DEPLOYMENT_URL = process.env.DEPLOYMENT_URL;
const PROJECT_NAME = process.env.PROJECT_NAME || process.env.VERCEL_PROJECT_NAME;
const VERSION = process.env.VERSION || process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7);
const GIT_SHA = process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA;
const GIT_BRANCH = process.env.GIT_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main';
const GITHUB_COMMIT_URL = process.env.GITHUB_COMMIT_URL;
const VERCEL_URL = process.env.VERCEL_URL;

if (!DEPLOYMENT_URL || !PROJECT_NAME) {
  console.error('❌ Missing required environment variables: DEPLOYMENT_URL, PROJECT_NAME');
  process.exit(1);
}

console.log('🚀 Logging deployment to Notion...');
console.log(`   Project: ${PROJECT_NAME}`);
console.log(`   URL: ${DEPLOYMENT_URL}`);
console.log(`   Version: ${VERSION}\n`);

/**
 * Run health check on deployed URL
 */
async function runHealthCheck(url) {
  console.log(`🏥 Running health check: ${url}...`);

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'HEAD',
      timeout: 10000
    });
    const responseTime = Date.now() - startTime;

    const health = response.ok ? 'Healthy' : response.status >= 500 ? 'Down' : 'Degraded';

    console.log(`   Status: ${response.status}`);
    console.log(`   Health: ${health}`);
    console.log(`   Response Time: ${responseTime}ms\n`);

    return {
      status: response.ok ? 'Success' : 'Failed',
      health,
      responseTime
    };
  } catch (error) {
    console.error(`   ❌ Health check failed: ${error.message}\n`);
    return {
      status: 'Failed',
      health: 'Down',
      responseTime: null
    };
  }
}

/**
 * Log deployment to Notion
 */
async function logDeployment(healthCheck) {
  console.log('📝 Creating deployment record in Notion...');

  const deploymentName = `${PROJECT_NAME} - ${VERSION || 'latest'}`;
  const now = new Date().toISOString();

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': API_VERSION
    },
    body: JSON.stringify({
      parent: { database_id: dbIds.deployments },
      properties: {
        'Deployment': {
          title: [{ text: { content: deploymentName } }]
        },
        'Environment': {
          select: { name: 'Production' }
        },
        'Version': {
          rich_text: [{ text: { content: VERSION || 'unknown' } }]
        },
        'Git SHA': {
          rich_text: [{ text: { content: GIT_SHA?.substring(0, 7) || 'unknown' } }]
        },
        'Git Branch': {
          rich_text: [{ text: { content: GIT_BRANCH } }]
        },
        'Deployed At': {
          date: { start: now }
        },
        'Status': {
          select: { name: healthCheck.status }
        },
        'Deploy URL': {
          url: DEPLOYMENT_URL
        },
        ...(GITHUB_COMMIT_URL && {
          'GitHub Commit URL': { url: GITHUB_COMMIT_URL }
        }),
        ...(VERCEL_URL && {
          'Vercel URL': { url: VERCEL_URL }
        }),
        'Health Check': {
          select: { name: healthCheck.health }
        },
        ...(healthCheck.responseTime && {
          'Response Time (ms)': { number: healthCheck.responseTime }
        }),
        'Last Checked': {
          date: { start: now }
        }
      }
    })
  });

  const data = await response.json();

  if (response.ok) {
    console.log('   ✅ Deployment logged successfully');
    console.log(`   Notion URL: ${data.url}\n`);
    return data;
  } else {
    console.error('   ❌ Error logging deployment:', data.message);
    throw new Error(data.message);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // 1. Run health check
    const healthCheck = await runHealthCheck(DEPLOYMENT_URL);

    // 2. Log to Notion
    await logDeployment(healthCheck);

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPLOYMENT LOGGED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 Deployment: ${deploymentName}`);
    console.log(`   Status: ${healthCheck.status}`);
    console.log(`   Health: ${healthCheck.health}`);
    console.log(`\n📋 View in Notion: https://www.notion.so/${dbIds.deployments.replace(/-/g, '')}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
