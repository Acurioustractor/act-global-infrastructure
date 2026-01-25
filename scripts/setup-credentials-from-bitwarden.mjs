#!/usr/bin/env node
/**
 * Bitwarden Credential Setup Script
 *
 * Fetches credentials from Bitwarden and writes to .env.local
 *
 * Usage:
 *   node scripts/setup-credentials-from-bitwarden.mjs [--write]
 *
 * Without --write, it only shows what would be written.
 */

import { execSync } from 'child_process';
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BW_ITEM_NAME = 'ACT Platform Credentials';

async function getBitwardenItem(itemName) {
  try {
    // Check if vault is unlocked
    const status = execSync('bw unlock --check 2>&1', { encoding: 'utf8' });
    if (status.includes('locked')) {
      throw new Error('Bitwarden vault is locked. Run: export BW_PASSWORD=your_password && bw unlock $BW_PASSWORD');
    }

    // List items and find the one we want
    const items = JSON.parse(execSync('bw list items --search "' + itemName + '"', { encoding: 'utf8' }));

    if (!items || items.length === 0) {
      throw new Error('No item found with name: ' + itemName);
    }

    return items[0];
  } catch (e) {
    console.error('Bitwarden error:', e.message);
    return null;
  }
}

async function parseBitwardenFields(item) {
  const credentials = {};

  if (!item.fields) {
    return credentials;
  }

  for (const field of item.fields) {
    const name = field.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    credentials[`BITWARDEN_${name}`] = field.value;
  }

  // Also check notes
  if (item.notes) {
    credentials.BITWARDEN_NOTES = item.notes;
  }

  return credentials;
}

function generateEnvContent(bitwardenData, existingEnv = {}) {
  const envVars = [
    '# ACT Platform Credentials - Generated from Bitwarden',
    '# Run: node scripts/setup-credentials-from-bitwarden.mjs --write',
    '',
    '# === XERO ===',
    bitwardenData.XERO_CLIENT_ID ? `XERO_CLIENT_ID=${bitwardenData.XERO_CLIENT_ID}` : '# XERO_CLIENT_ID=',
    bitwardenData.XERO_CLIENT_SECRET ? `XERO_CLIENT_SECRET=${bitwardenData.XERO_CLIENT_SECRET}` : '# XERO_CLIENT_SECRET=',
    bitwardenData.XERO_TENANT_ID ? `XERO_TENANT_ID=${bitwardenData.XERO_TENANT_ID}` : '# XERO_TENANT_ID=',
    '',
    '# === NOTION ===',
    bitwardenData.NOTION_API_KEY ? `NOTION_API_KEY=${bitwardenData.NOTION_API_KEY}` : '# NOTION_API_KEY=',
    bitwardenData.NOTION_PROJECTS_DATABASE_ID ? `NOTION_PROJECTS_DATABASE_ID=${bitwardenData.NOTION_PROJECTS_DATABASE_ID}` : '# NOTION_PROJECTS_DATABASE_ID=',
    '',
    '# === GMAIL ===',
    bitwardenData.GMAIL_CLIENT_ID ? `GMAIL_CLIENT_ID=${bitwardenData.GMAIL_CLIENT_ID}` : '# GMAIL_CLIENT_ID=',
    bitwardenData.GMAIL_CLIENT_SECRET ? `GMAIL_CLIENT_SECRET=${bitwardenData.GMAIL_CLIENT_SECRET}` : '# GMAIL_CLIENT_SECRET=',
    '',
    '# === SUPABASE ===',
    bitwardenData.SUPABASE_URL ? `SUPABASE_URL=${bitwardenData.SUPABASE_URL}` : '# SUPABASE_URL=',
    bitwardenData.SUPABASE_SERVICE_ROLE_KEY ? `SUPABASE_SERVICE_ROLE_KEY=${bitwardenData.SUPABASE_SERVICE_ROLE_KEY}` : '# SUPABASE_SERVICE_ROLE_KEY=',
    bitwardenData.NEXT_PUBLIC_SUPABASE_URL ? `NEXT_PUBLIC_SUPABASE_URL=${bitwardenData.NEXT_PUBLIC_SUPABASE_URL}` : '# NEXT_PUBLIC_SUPABASE_URL=',
    '',
    '# === AI API KEYS ===',
    bitwardenData.OPENAI_API_KEY ? `OPENAI_API_KEY=${bitwardenData.OPENAI_API_KEY}` : '# OPENAI_API_KEY=',
    bitwardenData.ANTHROPIC_API_KEY ? `ANTHROPIC_API_KEY=${bitwardenData.ANTHROPIC_API_KEY}` : '# ANTHROPIC_API_KEY=',
    '',
    '# === CLAUDE BOT NOTIFICATIONS ===',
    bitwardenData.CLAUDE_BOT_WEBHOOK_URL ? `CLAUDE_BOT_WEBHOOK_URL=${bitwardenData.CLAUDE_BOT_WEBHOOK_URL}` : '# CLAUDE_BOT_WEBHOOK_URL=',
    bitwardenData.MCP_NOTIFICATIONS_ENABLED ? `MCP_NOTIFICATIONS_ENABLED=${bitwardenData.MCP_NOTIFICATIONS_ENABLED}` : '# MCP_NOTIFICATIONS_ENABLED=false',
    '',
    '# === CREDENTIALS TIMESTAMP ===',
    `CREDENTIALS_FETCHED=${new Date().toISOString()}`,
    ''
  ];

  return envVars.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const writeMode = args.includes('--write');
  const showConfig = args.includes('--show');

  console.log('🔐 ACT Platform - Bitwarden Credential Setup');
  console.log('='.repeat(50));

  // Try to get from Bitwarden
  const item = await getBitwardenItem(BW_ITEM_NAME);

  if (!item) {
    console.log('\n⚠️  Could not fetch from Bitwarden.');
    console.log('   Make sure Bitwarden is unlocked and item "' + BW_ITEM_NAME + '" exists.');
    console.log('\n📝 Expected fields in Bitwarden:');
    console.log('   - XERO_CLIENT_ID');
    console.log('   - XERO_CLIENT_SECRET');
    console.log('   - XERO_TENANT_ID');
    console.log('   - NOTION_API_KEY');
    console.log('   - NOTION_PROJECTS_DATABASE_ID');
    console.log('   - GMAIL_CLIENT_ID');
    console.log('   - GMAIL_CLIENT_SECRET');
    console.log('   - SUPABASE_URL');
    console.log('   - SUPABASE_SERVICE_ROLE_KEY');
    console.log('   - OPENAI_API_KEY');
    console.log('   - ANTHROPIC_API_KEY');
    console.log('   - CLAUDE_BOT_WEBHOOK_URL');
    console.log('');
    return;
  }

  const fields = await parseBitwardenFields(item);
  const envContent = generateEnvContent(fields);

  if (showConfig || writeMode) {
    console.log('\n📄 Generated .env.local content:');
    console.log('-'.repeat(50));
    console.log(envContent);
    console.log('-'.repeat(50));
  }

  if (writeMode) {
    const envPath = join(__dirname, '..', '.env.local');
    await writeFile(envPath, envContent);
    console.log('\n✅ Written to ' + envPath);
    console.log('\n🚀 Restart the API server to load new credentials:');
    console.log('   cd packages/act-dashboard && node api-server.mjs');
  } else {
    console.log('\n💡 Run with --write to save to .env.local');
    console.log('   node scripts/setup-credentials-from-bitwarden.mjs --write');
  }
}

main().catch(console.error);
