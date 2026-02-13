#!/usr/bin/env node
/**
 * Xero Tracking Categories Setup
 *
 * Creates 2 tracking categories in Xero via API:
 *   1. "Project" — 26 ACT project codes (ACT-IN, ACT-JH, etc.)
 *   2. "Cost Type" — 7 standardised categories
 *
 * Usage:
 *   node scripts/setup-xero-tracking.mjs           # Dry run (show what would be created)
 *   node scripts/setup-xero-tracking.mjs --apply    # Create categories in Xero
 *   node scripts/setup-xero-tracking.mjs --status   # Show current tracking categories
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

// ============================================================================
// CONFIG
// ============================================================================

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
let XERO_ACCESS_TOKEN = process.env.XERO_ACCESS_TOKEN;
let XERO_REFRESH_TOKEN = process.env.XERO_REFRESH_TOKEN;

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const TOKEN_FILE = path.join(process.cwd(), '.xero-tokens.json');

const args = process.argv.slice(2);
const applyMode = args.includes('--apply');
const statusMode = args.includes('--status');

// ============================================================================
// TOKEN MANAGEMENT (copied from sync-xero-to-supabase.mjs pattern)
// ============================================================================

function loadStoredTokens() {
  try {
    if (existsSync(TOKEN_FILE)) {
      const tokens = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
      if (tokens.access_token && tokens.expires_at > Date.now()) {
        XERO_ACCESS_TOKEN = tokens.access_token;
        return true;
      }
      if (tokens.refresh_token) XERO_REFRESH_TOKEN = tokens.refresh_token;
    }
  } catch (e) { /* ignore */ }
  return false;
}

function saveTokens(accessToken, refreshToken, expiresIn) {
  try {
    writeFileSync(TOKEN_FILE, JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Date.now() + (expiresIn * 1000) - 60000
    }, null, 2));
  } catch (e) { /* ignore */ }
}

async function saveTokenToSupabase(refreshToken, accessToken, expiresIn) {
  if (!supabase) return;
  try {
    await supabase.from('xero_tokens').upsert({
      id: 'default',
      refresh_token: refreshToken,
      access_token: accessToken,
      expires_at: new Date(Date.now() + (expiresIn * 1000) - 60000).toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'setup-xero-tracking'
    }, { onConflict: 'id' });
  } catch (e) { /* ignore */ }
}

async function loadTokenFromSupabase() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('xero_tokens')
      .select('refresh_token, access_token, expires_at')
      .eq('id', 'default')
      .single();
    if (error || !data || data.refresh_token === 'placeholder') return null;
    if (data.access_token && new Date(data.expires_at).getTime() > Date.now()) {
      return { access_token: data.access_token, refresh_token: data.refresh_token, valid: true };
    }
    return { refresh_token: data.refresh_token, valid: false };
  } catch (e) { return null; }
}

async function refreshAccessToken() {
  if (!XERO_CLIENT_ID || !XERO_CLIENT_SECRET || !XERO_REFRESH_TOKEN) {
    console.error('Missing OAuth credentials');
    return false;
  }
  const credentials = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64');
  const response = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: XERO_REFRESH_TOKEN })
  });
  if (!response.ok) {
    console.error('Token refresh failed:', response.status, await response.text());
    return false;
  }
  const tokens = await response.json();
  XERO_ACCESS_TOKEN = tokens.access_token;
  XERO_REFRESH_TOKEN = tokens.refresh_token;
  saveTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
  await saveTokenToSupabase(tokens.refresh_token, tokens.access_token, tokens.expires_in);
  console.log('   Token refreshed');
  return true;
}

async function ensureValidToken() {
  const supabaseTokens = await loadTokenFromSupabase();
  if (supabaseTokens?.valid) {
    XERO_ACCESS_TOKEN = supabaseTokens.access_token;
    XERO_REFRESH_TOKEN = supabaseTokens.refresh_token;
    return true;
  }
  if (supabaseTokens?.refresh_token) XERO_REFRESH_TOKEN = supabaseTokens.refresh_token;
  if (loadStoredTokens()) return true;
  return await refreshAccessToken();
}

// ============================================================================
// XERO API
// ============================================================================

async function xeroRequest(endpoint, options = {}) {
  const url = `https://api.xero.com/api.xro/2.0/${endpoint}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
      'xero-tenant-id': XERO_TENANT_ID,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return xeroRequest(endpoint, options);
    }
    const text = await response.text();
    throw new Error(`Xero API ${response.status}: ${text}`);
  }
  return response.json();
}

// ============================================================================
// TRACKING CATEGORY SETUP
// ============================================================================

async function getExistingCategories() {
  const data = await xeroRequest('TrackingCategories');
  return data.TrackingCategories || [];
}

async function createCategory(name) {
  const data = await xeroRequest('TrackingCategories', {
    method: 'PUT',
    body: { Name: name },
  });
  return data.TrackingCategories[0];
}

async function addOption(categoryId, optionName) {
  const data = await xeroRequest(`TrackingCategories/${categoryId}/Options`, {
    method: 'PUT',
    body: { Name: optionName },
  });
  return data.Options?.[0];
}

async function setupTracking() {
  // Load project codes from DB
  const { data: projects, error } = await supabase
    .from('projects')
    .select('code, name')
    .in('status', ['active', 'ideation'])
    .order('code');

  if (error) {
    console.error('Failed to load projects:', error.message);
    return;
  }

  const projectOptions = projects.map(p => p.code);

  const costTypes = [
    'Software & Subscriptions',
    'Travel',
    'Operations',
    'Materials & Supplies',
    'Bank Fees',
    'Meals & Entertainment',
    'Income',
  ];

  // Check existing
  const existing = await getExistingCategories();
  console.log(`\nExisting tracking categories: ${existing.length}/2`);
  for (const cat of existing) {
    const options = cat.Options?.map(o => o.Name) || [];
    console.log(`  ${cat.Name} (${options.length} options): ${options.slice(0, 5).join(', ')}${options.length > 5 ? '...' : ''}`);
  }

  const existingNames = existing.map(c => c.Name);
  // Match existing categories by flexible names
  const projectCatExists = existingNames.some(n => n.toLowerCase().includes('project'));
  const costTypeCatExists = existingNames.some(n => n === 'Cost Type');

  console.log('\n--- Plan ---');

  // Find project category (may be called "Project" or "Project Tracking")
  const projectCat = existing.find(c => c.Name.toLowerCase().includes('project'));
  if (projectCatExists) {
    const existingOptions = new Set((projectCat.Options || []).map(o => o.Name));
    const newOptions = projectOptions.filter(o => !existingOptions.has(o));
    console.log(`${projectCat.Name}: exists (${existingOptions.size} options), ${newOptions.length} to add`);
    if (newOptions.length > 0) console.log(`  New: ${newOptions.join(', ')}`);
  } else {
    console.log(`Project: CREATE with ${projectOptions.length} options`);
    console.log(`  ${projectOptions.join(', ')}`);
  }

  // Cost Type category
  const costTypeCat = existing.find(c => c.Name === 'Cost Type');
  if (costTypeCatExists) {
    const existingOptions = new Set((costTypeCat.Options || []).map(o => o.Name));
    const newOptions = costTypes.filter(o => !existingOptions.has(o));
    console.log(`Cost Type: exists (${existingOptions.size} options), ${newOptions.length} to add`);
    if (newOptions.length > 0) console.log(`  New: ${newOptions.join(', ')}`);
  } else if (existing.length >= 2 && !costTypeCatExists) {
    const otherCat = existing.find(c => !c.Name.toLowerCase().includes('project'));
    console.log(`Cost Type: CANNOT CREATE — both slots used. "${otherCat?.Name}" occupies the second slot.`);
    console.log(`  To add Cost Type, archive "${otherCat?.Name}" in Xero Settings → Tracking Categories.`);
  } else {
    console.log(`Cost Type: CREATE with ${costTypes.length} options`);
    console.log(`  ${costTypes.join(', ')}`);
  }

  if (!applyMode) {
    console.log('\nRun with --apply to create these in Xero');
    return;
  }

  // Apply: Project category
  console.log('\nApplying...');

  let appliedProjectCat = projectCat;
  if (!appliedProjectCat) {
    console.log('Creating "Project" tracking category...');
    appliedProjectCat = await createCategory('Project');
    console.log(`  Created: ${appliedProjectCat.TrackingCategoryID}`);
  }

  const existingProjectOptions = new Set((appliedProjectCat.Options || []).map(o => o.Name));
  let added = 0;
  for (const code of projectOptions) {
    if (existingProjectOptions.has(code)) continue;
    console.log(`  Adding: ${code}`);
    await addOption(appliedProjectCat.TrackingCategoryID, code);
    added++;
    // Rate limit: 500ms between calls
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`  ${appliedProjectCat.Name}: ${added} options added (${existingProjectOptions.size} already existed)`);

  // Apply: Cost Type category
  let appliedCostTypeCat = costTypeCat;
  if (!appliedCostTypeCat && existing.length < 2) {
    console.log('Creating "Cost Type" tracking category...');
    appliedCostTypeCat = await createCategory('Cost Type');
    console.log(`  Created: ${appliedCostTypeCat.TrackingCategoryID}`);
  }

  if (appliedCostTypeCat) {
    const existingCostOptions = new Set((appliedCostTypeCat.Options || []).map(o => o.Name));
    added = 0;
    for (const type of costTypes) {
      if (existingCostOptions.has(type)) continue;
      console.log(`  Adding: ${type}`);
      await addOption(appliedCostTypeCat.TrackingCategoryID, type);
      added++;
      await new Promise(r => setTimeout(r, 500));
    }
    console.log(`  Cost Type: ${added} options added (${existingCostOptions.size} already existed)`);
  } else {
    console.log('\n  Skipping Cost Type — no available slot. Archive "Business Divisions" in Xero first.');
  }

  console.log('\nDone! Tracking categories configured in Xero.');
}

async function showStatus() {
  const categories = await getExistingCategories();
  console.log(`\nXero Tracking Categories (${categories.length}/2 slots used)`);
  console.log('═'.repeat(60));

  for (const cat of categories) {
    const options = cat.Options || [];
    console.log(`\n${cat.Name} (${cat.Status})`);
    console.log(`  ID: ${cat.TrackingCategoryID}`);
    console.log(`  Options (${options.length}):`);
    for (const opt of options) {
      console.log(`    ${opt.Name} ${opt.Status !== 'ACTIVE' ? `[${opt.Status}]` : ''}`);
    }
  }

  if (categories.length === 0) {
    console.log('  No tracking categories configured');
  }
}

// ============================================================================
// MAIN
// ============================================================================

console.log('Xero Tracking Categories Setup');
console.log('═'.repeat(40));

if (!await ensureValidToken()) {
  console.error('Failed to authenticate with Xero');
  process.exit(1);
}
console.log('Authenticated with Xero');

if (statusMode) {
  await showStatus();
} else {
  await setupTracking();
}
