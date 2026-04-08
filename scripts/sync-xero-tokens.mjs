#!/usr/bin/env node
/**
 * Sync Xero Tokens — reconciles the three Xero token stores so they don't drift.
 *
 * There are three places the Xero refresh token lives:
 *   1. `.xero-tokens.json` (local file, used by prepare-bas.mjs)
 *   2. Supabase `xero_tokens` table id='default' (used by upload-receipts-to-xero.mjs)
 *   3. `.env.local` XERO_REFRESH_TOKEN (used by some scripts as fallback)
 *
 * When Xero rotates a refresh token (which it does on every use), only one of
 * these stores gets updated, and the others go stale. Next refresh fails with
 * `invalid_grant: Refresh token not found`.
 *
 * This script:
 *   1. Reads all three stores
 *   2. Tests each refresh token against Xero (cheap call, no data)
 *   3. Identifies the working one (if any)
 *   4. Writes that one to all three stores
 *
 * Also usable as a post-refresh helper — pass --set <token> to write a known-good
 * token to all three stores without probing Xero.
 *
 * Usage:
 *   node scripts/sync-xero-tokens.mjs               # Diagnose + auto-fix
 *   node scripts/sync-xero-tokens.mjs --dry-run     # Diagnose only
 *   node scripts/sync-xero-tokens.mjs --set <token> # Force a specific token everywhere
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const TOKEN_FILE = '.xero-tokens.json';
const ENV_FILE = '.env.local';

function preview(token) {
  if (!token) return '(none)';
  return `${token.slice(0, 6)}...${token.slice(-4)} (${token.length} chars)`;
}

function loadFileTokens() {
  if (!existsSync(TOKEN_FILE)) return null;
  try {
    const t = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
    return {
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at: t.expires_at,
    };
  } catch (e) {
    console.error(`  ⚠ ${TOKEN_FILE} unreadable: ${e.message}`);
    return null;
  }
}

async function loadSupabaseTokens() {
  try {
    const { data, error } = await sb
      .from('xero_tokens')
      .select('access_token, refresh_token, expires_at, updated_at')
      .eq('id', 'default')
      .maybeSingle();
    if (error) { console.error(`  ⚠ supabase: ${error.message}`); return null; }
    return data;
  } catch (e) {
    console.error(`  ⚠ supabase: ${e.message}`);
    return null;
  }
}

function loadEnvToken() {
  return process.env.XERO_REFRESH_TOKEN || null;
}

/**
 * Test a refresh token against Xero. Returns the new token pair on success,
 * or null on failure. Uses Basic auth (confidential OAuth client pattern).
 */
async function testRefreshToken(refreshToken) {
  if (!refreshToken || !XERO_CLIENT_ID || !XERO_CLIENT_SECRET) return null;
  const creds = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64');
  try {
    const r = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/**
 * Write the new tokens to all three stores. Idempotent.
 */
async function writeAll(accessToken, refreshToken, expiresInSec) {
  const expiresAt = Date.now() + expiresInSec * 1000 - 60_000;
  const expiresAtISO = new Date(expiresAt).toISOString();

  // 1. Local file
  writeFileSync(TOKEN_FILE, JSON.stringify({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
  }, null, 2));
  console.log(`  ✅ ${TOKEN_FILE}`);

  // 2. Supabase xero_tokens table
  const { error } = await sb.from('xero_tokens').upsert({
    id: 'default',
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAtISO,
    updated_at: new Date().toISOString(),
    updated_by: 'sync-xero-tokens',
  });
  if (error) console.log(`  ❌ supabase xero_tokens: ${error.message}`);
  else console.log(`  ✅ supabase xero_tokens`);

  // 3. .env.local (safe regex replace, preserves other vars)
  if (existsSync(ENV_FILE)) {
    let envBody = readFileSync(ENV_FILE, 'utf8');
    const line = `XERO_REFRESH_TOKEN=${refreshToken}`;
    if (/^XERO_REFRESH_TOKEN=/m.test(envBody)) {
      envBody = envBody.replace(/^XERO_REFRESH_TOKEN=.*/m, line);
    } else {
      envBody = envBody.trimEnd() + '\n' + line + '\n';
    }
    writeFileSync(ENV_FILE, envBody);
    console.log(`  ✅ ${ENV_FILE} (XERO_REFRESH_TOKEN)`);
  } else {
    console.log(`  ⚠ ${ENV_FILE} not found — skipped`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const setIdx = args.indexOf('--set');
  const forceToken = setIdx !== -1 ? args[setIdx + 1] : null;

  console.log('Xero token sync\n');

  // --set mode: skip diagnosis, refresh the given token, propagate everywhere
  if (forceToken) {
    console.log('Mode: --set (force refresh + write everywhere)');
    console.log(`  Token: ${preview(forceToken)}`);
    const result = await testRefreshToken(forceToken);
    if (!result) {
      console.error('\n❌ The provided token failed to refresh. Aborting.');
      process.exit(1);
    }
    console.log(`  ✅ Xero refresh OK, expires in ${result.expires_in}s`);
    if (dryRun) { console.log('\n(dry run — no writes)'); return; }
    console.log('\nWriting to all three stores:');
    await writeAll(result.access_token, result.refresh_token, result.expires_in);
    console.log('\n✅ Done');
    return;
  }

  // Default mode: diagnose
  console.log('Reading tokens from all three stores...\n');

  const fileTokens = loadFileTokens();
  const sbTokens = await loadSupabaseTokens();
  const envToken = loadEnvToken();

  console.log('  1. .xero-tokens.json :', preview(fileTokens?.refresh_token));
  if (fileTokens?.expires_at) console.log(`       expires_at: ${new Date(fileTokens.expires_at).toISOString()}`);
  console.log('  2. supabase xero_tokens:', preview(sbTokens?.refresh_token));
  if (sbTokens?.expires_at) console.log(`       expires_at: ${sbTokens.expires_at} (updated ${sbTokens.updated_at})`);
  console.log('  3. .env.local        :', preview(envToken));

  // Collect unique candidates
  const candidates = [
    { source: '.xero-tokens.json', token: fileTokens?.refresh_token },
    { source: 'supabase xero_tokens', token: sbTokens?.refresh_token },
    { source: '.env.local', token: envToken },
  ].filter(c => c.token);

  const seen = new Set();
  const unique = candidates.filter(c => {
    if (seen.has(c.token)) return false;
    seen.add(c.token);
    return true;
  });

  console.log(`\nUnique refresh tokens found: ${unique.length}`);
  if (unique.length === 0) {
    console.error('\n❌ No refresh tokens found anywhere. Run: node scripts/xero-auth.mjs');
    process.exit(1);
  }

  console.log('\nTesting each candidate against Xero...');
  let working = null;
  for (const c of unique) {
    process.stdout.write(`  ${c.source} ... `);
    const result = await testRefreshToken(c.token);
    if (result) {
      console.log('✅ works');
      working = { ...c, result };
      break; // first working token wins (we'll write the refreshed value everywhere)
    } else {
      console.log('❌ invalid');
    }
  }

  if (!working) {
    console.error('\n❌ No working refresh token. Re-auth required: node scripts/xero-auth.mjs');
    process.exit(2);
  }

  console.log(`\n✅ Found working token in: ${working.source}`);
  console.log(`  New access token expires in ${working.result.expires_in}s`);

  if (dryRun) {
    console.log('\n(dry run — no writes made)');
    return;
  }

  console.log('\nPropagating refreshed tokens to all three stores:');
  await writeAll(working.result.access_token, working.result.refresh_token, working.result.expires_in);
  console.log('\n✅ All three stores are now in sync.');
}

main().catch(e => { console.error('\nError:', e); process.exit(1); });
