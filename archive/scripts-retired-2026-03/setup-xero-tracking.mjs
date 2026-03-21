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

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

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

async function renameOption(categoryId, optionId, newName) {
  const data = await xeroRequest(`TrackingCategories/${categoryId}/Options/${optionId}`, {
    method: 'POST',
    body: { Name: newName },
  });
  return data.Options?.[0];
}

async function archiveOption(categoryId, optionId) {
  const data = await xeroRequest(`TrackingCategories/${categoryId}/Options/${optionId}`, {
    method: 'POST',
    body: { Status: 'ARCHIVED' },
  });
  return data.Options?.[0];
}

async function setupTracking() {
  // Load project codes from config (canonical source)
  const projectCodes = JSON.parse(readFileSync(path.join(process.cwd(), 'config/project-codes.json'), 'utf8'));

  // Build desired options: "ACT-XX — Name" format from xero_tracking field
  const desiredOptions = {};
  for (const [code, proj] of Object.entries(projectCodes.projects || {})) {
    if (proj.xero_tracking) {
      desiredOptions[code] = proj.xero_tracking; // e.g. "ACT-JH — JusticeHub"
    }
  }

  // Build reverse lookup: old name → { code, newName }
  // This maps aliases and bare codes to the desired new name for renaming
  const renameLookup = {};
  for (const [code, proj] of Object.entries(projectCodes.projects || {})) {
    if (!proj.xero_tracking) continue;
    // Bare code (e.g. "ACT-JH") should be renamed to full format
    if (proj.xero_tracking !== code) {
      renameLookup[code] = { code, newName: proj.xero_tracking };
    }
    // Old aliases (e.g. "JusticeHub") should be renamed to full format
    for (const alias of (proj.xero_tracking_aliases || [])) {
      renameLookup[alias] = { code, newName: proj.xero_tracking };
    }
  }

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

  // Find project category (may be called "Project" or "Project Tracking")
  const projectCat = existing.find(c => c.Name.toLowerCase().includes('project'));

  console.log('\n--- Plan ---');

  if (projectCat) {
    const existingOpts = projectCat.Options || [];
    const existingByName = new Map(existingOpts.map(o => [o.Name, o]));

    // Classify each existing option
    const toRename = [];    // { optionId, oldName, newName }
    const toDelete = [];    // { optionId, name, reason }
    const alreadyCorrect = new Set();

    for (const opt of existingOpts) {
      const name = opt.Name;
      // Already in correct ACT-XX — Name format?
      if (Object.values(desiredOptions).includes(name)) {
        alreadyCorrect.add(name);
        continue;
      }
      // Is it a bare code or old alias that should be renamed?
      if (renameLookup[name]) {
        const { newName } = renameLookup[name];
        // Check if the correct version already exists — if so, delete this duplicate
        if (existingByName.has(newName) || alreadyCorrect.has(newName)) {
          toDelete.push({ optionId: opt.TrackingOptionID, name, reason: `duplicate of ${newName}` });
        } else {
          toRename.push({ optionId: opt.TrackingOptionID, oldName: name, newName });
          alreadyCorrect.add(newName); // Mark as handled
        }
        continue;
      }
      // Unknown option — leave it alone
      console.log(`  ⚠️  Unknown option: "${name}" — leaving as-is`);
    }

    // Find options that need to be added (not existing and not being renamed to)
    const toAdd = Object.values(desiredOptions).filter(name => !alreadyCorrect.has(name));

    console.log(`\n${projectCat.Name}:`);
    console.log(`  ✓ Already correct: ${alreadyCorrect.size}`);
    if (toRename.length > 0) {
      console.log(`  ✏️  To rename: ${toRename.length}`);
      for (const r of toRename) console.log(`    "${r.oldName}" → "${r.newName}"`);
    }
    if (toDelete.length > 0) {
      console.log(`  📦 To archive (duplicates): ${toDelete.length}`);
      for (const d of toDelete) console.log(`    "${d.name}" (${d.reason})`);
    }
    if (toAdd.length > 0) {
      console.log(`  ➕ To add: ${toAdd.length}`);
      for (const a of toAdd) console.log(`    "${a}"`);
    }

    if (!applyMode) {
      console.log('\nRun with --apply to execute these changes in Xero');
    } else {
      console.log('\nApplying...');
      let ops = 0;

      // Renames first (preserves transaction history)
      for (const r of toRename) {
        console.log(`  Renaming: "${r.oldName}" → "${r.newName}"`);
        await renameOption(projectCat.TrackingCategoryID, r.optionId, r.newName);
        ops++;
        await new Promise(r => setTimeout(r, 500));
      }

      // Archive duplicates (can't delete in-use options)
      for (const d of toDelete) {
        console.log(`  Archiving: "${d.name}"`);
        await archiveOption(projectCat.TrackingCategoryID, d.optionId);
        ops++;
        await new Promise(r => setTimeout(r, 500));
      }

      // Adds (new projects)
      for (const name of toAdd) {
        console.log(`  Adding: "${name}"`);
        await addOption(projectCat.TrackingCategoryID, name);
        ops++;
        await new Promise(r => setTimeout(r, 500));
      }

      console.log(`  Done: ${ops} operations applied`);
    }
  } else {
    // No project category exists — create it
    const allOptions = Object.values(desiredOptions);
    console.log(`Project: CREATE with ${allOptions.length} options`);
    if (applyMode) {
      console.log('Creating "Project" tracking category...');
      const newCat = await createCategory('Project');
      console.log(`  Created: ${newCat.TrackingCategoryID}`);
      for (const name of allOptions) {
        console.log(`  Adding: "${name}"`);
        await addOption(newCat.TrackingCategoryID, name);
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  // Cost Type category (unchanged)
  const costTypeCat = existing.find(c => c.Name === 'Cost Type');
  if (costTypeCat) {
    const existingOptions = new Set((costTypeCat.Options || []).map(o => o.Name));
    const newOptions = costTypes.filter(o => !existingOptions.has(o));
    if (newOptions.length > 0) {
      console.log(`\nCost Type: ${newOptions.length} to add`);
      if (applyMode) {
        for (const type of newOptions) {
          console.log(`  Adding: ${type}`);
          await addOption(costTypeCat.TrackingCategoryID, type);
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }
  }

  console.log('\nDone!');
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
