#!/usr/bin/env node

/**
 * Setup GitHub Actions Secrets
 *
 * This script reads secrets from .env.local and sets them as GitHub repository secrets
 * using the gh CLI tool.
 *
 * Usage: node setup-github-secrets.mjs
 */

import '../lib/load-env.mjs';
import { execSync } from 'child_process';

console.log('🔐 Setting up GitHub Actions Secrets...\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Define required secrets and their mapping
const secrets = [
  { name: 'GH_PROJECT_TOKEN', envVar: 'GH_PROJECT_TOKEN' },
  { name: 'PROJECT_ID', envVar: 'GITHUB_PROJECT_ID' },
  { name: 'NOTION_TOKEN', envVar: 'NOTION_TOKEN' },
  { name: 'SUPABASE_URL', envVar: 'NEXT_PUBLIC_SUPABASE_URL' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', envVar: 'SUPABASE_SERVICE_ROLE_KEY' }
];

// Check all required env vars are present
console.log('📋 Checking required environment variables...\n');

const missing = [];
secrets.forEach(({ name, envVar }) => {
  const value = process.env[envVar];
  if (!value) {
    missing.push(envVar);
    console.log(`❌ ${envVar} - NOT FOUND`);
  } else {
    console.log(`✅ ${envVar} - Found (${value.substring(0, 20)}...)`);
  }
});

if (missing.length > 0) {
  console.log('\n❌ Error: Missing required environment variables');
  console.log('   Make sure .env.local contains all required secrets\n');
  process.exit(1);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('This will set the following GitHub repository secrets:\n');
secrets.forEach(({ name }) => console.log(`  - ${name}`));
console.log('\n⚠️  These secrets will be accessible to GitHub Actions workflows\n');

// Check if gh CLI is installed
try {
  execSync('gh --version', { stdio: 'ignore' });
} catch (error) {
  console.log('❌ Error: GitHub CLI (gh) not found');
  console.log('   Install it: https://cli.github.com/\n');
  process.exit(1);
}

// Check if we're in a git repo
try {
  execSync('git rev-parse --git-dir', { stdio: 'ignore' });
} catch (error) {
  console.log('❌ Error: Not in a git repository\n');
  process.exit(1);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('Setting secrets...\n');

// Set each secret
let successCount = 0;
let failCount = 0;

for (const { name, envVar } of secrets) {
  const value = process.env[envVar];

  try {
    // Use gh secret set with stdin to avoid shell escaping issues
    execSync(`gh secret set ${name}`, {
      input: value,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(`✅ ${name}`);
    successCount++;
  } catch (error) {
    console.log(`❌ ${name} - Failed: ${error.message}`);
    failCount++;
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (failCount === 0) {
  console.log('✅ ALL SECRETS SET SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📋 Verify secrets are set:');
  console.log('   gh secret list\n');

  console.log('📋 Next steps:');
  console.log('   1. Push this repo to GitHub (if not already pushed)');
  console.log('   2. GitHub Actions will run automatically on schedule');
  console.log('   3. Or trigger manually: gh workflow run "Sync Sprint Metrics to Notion"\n');

  process.exit(0);
} else {
  console.log(`⚠️  ${successCount} succeeded, ${failCount} failed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Check the errors above and try again\n');
  process.exit(1);
}
