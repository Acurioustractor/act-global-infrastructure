#!/usr/bin/env node
/**
 * Query Xero Fixed Assets register.
 *
 * Usage:
 *   node scripts/xero-assets.mjs                    # list all assets (Registered + Draft + Disposed)
 *   node scripts/xero-assets.mjs --status=Registered
 *   node scripts/xero-assets.mjs --types            # list AssetTypes only
 *   node scripts/xero-assets.mjs --json             # raw JSON output
 *
 * Requires `assets.read` scope. If you get 403, run: node scripts/xero-auth.mjs
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const TOKEN_FILE = '.xero-tokens.json';
const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const args = process.argv.slice(2);
const flag = (name) => args.find(a => a.startsWith(`--${name}`));
const statusArg = flag('status')?.split('=')[1] || null;
const wantTypes = args.includes('--types');
const wantJson = args.includes('--json');

async function loadTokens() {
  // Prefer Supabase
  if (supabase) {
    const { data } = await supabase.from('xero_tokens').select('*').eq('id', 'default').single();
    if (data?.access_token) {
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: new Date(data.expires_at).getTime(),
      };
    }
  }
  if (existsSync(TOKEN_FILE)) {
    return JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
  }
  throw new Error('No Xero tokens found. Run: node scripts/xero-auth.mjs');
}

async function refresh(refreshToken) {
  const credentials = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getTenantId(accessToken) {
  if (process.env.XERO_TENANT_ID) return process.env.XERO_TENANT_ID;
  const res = await fetch('https://api.xero.com/connections', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  const conns = await res.json();
  return conns[0]?.tenantId;
}

async function ensureToken() {
  let tokens = await loadTokens();
  const valid = tokens.expires_at && tokens.expires_at > Date.now();
  if (!valid) {
    if (!tokens.refresh_token) throw new Error('No refresh token. Re-auth via xero-auth.mjs');
    const fresh = await refresh(tokens.refresh_token);
    tokens.access_token = fresh.access_token;
    tokens.refresh_token = fresh.refresh_token;
    tokens.expires_at = Date.now() + fresh.expires_in * 1000 - 60000;
    if (supabase) {
      await supabase.from('xero_tokens').upsert({
        id: 'default',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expires_at).toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: 'xero-assets',
      }, { onConflict: 'id' });
    }
    writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  }
  return tokens.access_token;
}

async function assetsRequest(path, accessToken, tenantId) {
  const url = `https://api.xero.com/assets.xro/1.0/${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'xero-tenant-id': tenantId,
      Accept: 'application/json',
    },
  });
  if (res.status === 403) {
    throw new Error('403 — token missing `assets.read` scope. Re-run: node scripts/xero-auth.mjs');
  }
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

function fmt$(n) {
  if (n == null) return '';
  return Number(n).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
}

async function main() {
  const accessToken = await ensureToken();
  const tenantId = await getTenantId(accessToken);
  if (!tenantId) throw new Error('No tenant ID');

  if (wantTypes) {
    const data = await assetsRequest('AssetTypes', accessToken, tenantId);
    if (wantJson) return console.log(JSON.stringify(data, null, 2));
    console.log(`Asset Types (${data.length || 0}):\n`);
    for (const t of data) {
      console.log(`  ${t.assetTypeName.padEnd(40)} life=${t.bookDepreciationSetting?.depreciationRate || '?'}%  ${t.fixedAssetAccountId ? '' : '(no asset account)'}`);
    }
    return;
  }

  // Assets endpoint requires status: Draft | Registered | Disposed
  const statuses = statusArg ? [statusArg] : ['Draft', 'Registered', 'Disposed'];
  const all = [];
  for (const status of statuses) {
    let page = 1;
    while (true) {
      const data = await assetsRequest(`Assets?status=${status}&page=${page}&pageSize=100`, accessToken, tenantId);
      const items = data.items || [];
      all.push(...items.map(a => ({ ...a, _status: status })));
      if (items.length < 100) break;
      page++;
    }
  }

  if (wantJson) return console.log(JSON.stringify(all, null, 2));

  console.log(`Xero Fixed Assets — ${all.length} total\n`);
  const byStatus = {};
  let totalCost = 0;
  for (const a of all) {
    byStatus[a._status] = (byStatus[a._status] || 0) + 1;
    totalCost += Number(a.purchasePrice || 0);
  }
  console.log('By status:', byStatus);
  console.log('Total purchase price:', fmt$(totalCost), '\n');

  console.log('Number       Name                                     Status       Purchased    Cost           Book Value');
  console.log('-'.repeat(115));
  for (const a of all.sort((x, y) => (y.purchaseDate || '').localeCompare(x.purchaseDate || ''))) {
    console.log([
      (a.assetNumber || '').padEnd(12),
      (a.assetName || '').slice(0, 40).padEnd(40),
      (a._status).padEnd(12),
      (a.purchaseDate || '').slice(0, 10).padEnd(12),
      fmt$(a.purchasePrice).padStart(13),
      fmt$(a.bookDepreciationDetail?.currentCapitalGain ?? a.disposalPrice ?? a.purchasePrice).padStart(15),
    ].join(' '));
  }
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
