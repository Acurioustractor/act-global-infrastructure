#!/usr/bin/env node
/**
 * One-off: cross-check Standard Ledger's "Nicholas Marchesi" Balance Sheet (as at 8 Jun 2026)
 * against LIVE Xero, via the codebase OAuth (standard app), NOT the MCP.
 * Pulls Reports/BalanceSheet at 2026-06-08 (match SL) and 2026-06-16 (today).
 * Read-only against Xero; refreshes + writes back the rotated token so the cron keeps working.
 */
import '../lib/load-env.mjs';
import { readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const TOKEN_PATH = path.join(process.cwd(), '.xero-tokens.json');
const CID = process.env.XERO_CLIENT_ID;
const CSEC = process.env.XERO_CLIENT_SECRET;
const tok = JSON.parse(readFileSync(TOKEN_PATH, 'utf8'));

// --- 1. use the freshly-minted access token from the file (xero-auth.mjs just wrote it) ---
const access_token = tok.access_token;
console.log('using access_token from .xero-tokens.json (just re-authed)');

// --- 3. resolve tenant ---
const conns = await (await fetch('https://api.xero.com/connections', {
  headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/json' },
})).json();
const want = process.env.XERO_TENANT_ID || '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0';
const conn = (Array.isArray(conns) && (conns.find(c => c.tenantId === want) || conns[0])) || null;
if (!conn) { console.error('No tenant:', JSON.stringify(conns).slice(0, 300)); process.exit(1); }
const headers = { Authorization: `Bearer ${access_token}`, 'xero-tenant-id': conn.tenantId, Accept: 'application/json' };
console.log(`Tenant: ${conn.tenantName} (${conn.tenantId})\n`);

// --- 4. balance sheet at both dates ---
function flatten(rows, out = []) {
  for (const r of rows || []) {
    if (r.RowType === 'Row' && r.Cells) {
      const name = (r.Cells[0]?.Value || '').trim();
      const val = r.Cells[1]?.Value ?? '';
      if (name) out.push({ name, val });
    }
    if (r.Rows) flatten(r.Rows, out);
  }
  return out;
}
const TARGETS = [
  'Accounts Receivable', 'Accounts Payable',
  'NJ Marchesi T/as ACT Everyday', 'NAB Visa ACT #8815', 'NM Personal',
  'Total Bank', 'Total Assets', 'Total Liabilities', 'Net Assets',
];
async function bs(date) {
  const j = await (await fetch(`https://api.xero.com/api.xro/2.0/Reports/BalanceSheet?date=${date}`, { headers })).json();
  const rep = j.Reports?.[0];
  if (!rep) { console.error(`No report ${date}:`, JSON.stringify(j).slice(0, 300)); return {}; }
  const flat = flatten(rep.Rows);
  const pick = {};
  for (const t of TARGETS) {
    const hit = flat.find(f => f.name.toLowerCase() === t.toLowerCase());
    pick[t] = hit ? hit.val : '(not found)';
  }
  return pick;
}
const d8 = await bs('2026-06-08');
await new Promise(r => setTimeout(r, 1200)); // rate-limit courtesy
const d16 = await bs('2026-06-16');

// --- 5. print comparison ---
const sl = {
  'Accounts Receivable': '165,417.88', 'Accounts Payable': '500,038.34',
  'NJ Marchesi T/as ACT Everyday': '288,981.73', 'NAB Visa ACT #8815': '131,937.70',
  'NM Personal': '375,991.57', 'Total Bank': '288,981.73', 'Total Assets': '2,339,727.10',
  'Total Liabilities': '2,481,675.25', 'Net Assets': '(141,948.15)',
};
console.log('Line                              | SL sheet (8 Jun) | Live Xero 8 Jun | Live Xero 16 Jun');
console.log('-'.repeat(92));
for (const t of TARGETS) {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`${pad(t, 33)} | ${pad(sl[t] ?? '', 16)} | ${pad(d8[t], 15)} | ${d16[t]}`);
}
