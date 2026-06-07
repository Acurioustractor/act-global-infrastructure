#!/usr/bin/env node
/**
 * Test Xero Attachment Reality — probes `xero_invoices` rows where our mirror
 * says `has_attachments=true` and GETs the actual Attachments API on each one,
 * classifying the drift.
 *
 * Why: The handoff flagged ~43 ACCPAY bills in Q2+Q3 FY26 where mirror says
 * true but the Attachments API returned empty. Root cause TBD — could be
 * `IncludeOnline`-only attachments, stale sync, or `sync-xero-to-supabase.mjs`
 * pulling the `HasAttachments` flag but not the attachment list.
 *
 * Recovery value: each drifted bill that actually has a receipt = ~$5-6K
 * potential recovery across Q2+Q3. This script proves/disproves the drift.
 *
 * Usage:
 *   node scripts/test-xero-attachment-reality.mjs                 # Q2+Q3, all
 *   node scripts/test-xero-attachment-reality.mjs --limit 20      # sample
 *   node scripts/test-xero-attachment-reality.mjs --fix           # update mirror
 */
import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const XERO_CLIENT_ID = process.env.XERO_CLIENT_ID;
const XERO_CLIENT_SECRET = process.env.XERO_CLIENT_SECRET;
const XERO_TENANT_ID = process.env.XERO_TENANT_ID;
let XERO_ACCESS_TOKEN = process.env.XERO_ACCESS_TOKEN;
let XERO_REFRESH_TOKEN = process.env.XERO_REFRESH_TOKEN;
const TOKEN_FILE = '.xero-tokens.json';
const XERO_API = 'https://api.xero.com/api.xro/2.0';

function loadTokens() {
  try {
    if (existsSync(TOKEN_FILE)) {
      const t = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
      if (t.access_token) XERO_ACCESS_TOKEN = t.access_token;
      if (t.refresh_token) XERO_REFRESH_TOKEN = t.refresh_token;
    }
  } catch {}
}

async function refreshXeroToken() {
  if (!XERO_CLIENT_ID || !XERO_REFRESH_TOKEN) return false;
  const creds = Buffer.from(`${XERO_CLIENT_ID}:${XERO_CLIENT_SECRET}`).toString('base64');
  const r = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: XERO_REFRESH_TOKEN }),
  });
  if (!r.ok) return false;
  const d = await r.json();
  XERO_ACCESS_TOKEN = d.access_token;
  XERO_REFRESH_TOKEN = d.refresh_token;
  writeFileSync(TOKEN_FILE, JSON.stringify({
    access_token: d.access_token, refresh_token: d.refresh_token,
    expires_at: Date.now() + d.expires_in * 1000 - 60000,
  }, null, 2));
  await sb.from('xero_tokens').upsert({
    id: 'default',
    access_token: d.access_token, refresh_token: d.refresh_token,
    expires_at: new Date(Date.now() + d.expires_in * 1000 - 60000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  return true;
}

async function xeroGet(endpoint, _retries = 0) {
  const r = await fetch(`${XERO_API}/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
      'xero-tenant-id': XERO_TENANT_ID,
      'Accept': 'application/json',
    },
  });
  if (r.status === 401 && _retries === 0) {
    await refreshXeroToken();
    return xeroGet(endpoint, _retries + 1);
  }
  if (r.status === 429 && _retries < 5) {
    const retryAfter = parseInt(r.headers.get('Retry-After') || '60');
    console.log(`    ⏳ 429 rate limited — sleeping ${retryAfter}s`);
    await new Promise(res => setTimeout(res, (retryAfter + 1) * 1000));
    return xeroGet(endpoint, _retries + 1);
  }
  return r;
}

async function main() {
  const args = process.argv.slice(2);
  const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null;
  const fix = args.includes('--fix');
  const before = args.includes('--before') ? args[args.indexOf('--before') + 1] : null;
  const after = args.includes('--after') ? args[args.indexOf('--after') + 1] : null;

  loadTokens();
  console.log('=== Test Xero Attachment Reality ===\n');

  // Load candidates: ACCPAY bills in Q2+Q3 FY26 with has_attachments=true
  let q = sb.from('xero_invoices')
    .select('xero_id, invoice_number, contact_name, total, date, status')
    .eq('has_attachments', true)
    .eq('type', 'ACCPAY')
    .gte('date', after || '2025-10-01').lte('date', before || '2026-03-31')
    .order('date', { ascending: false });
  if (limit) q = q.limit(limit);
  const { data: bills, error } = await q;
  if (error) { console.error('Supabase error:', error); process.exit(1); }
  console.log(`Loaded ${bills.length} ACCPAY bills (Q2+Q3) with mirror has_attachments=true\n`);

  const stats = {
    real: [],         // API returned ≥1 attachment
    drift: [],        // API returned []
    notFound: [],     // Invoice 404 / deleted
    error: [],        // 500 / unexpected
  };

  for (let i = 0; i < bills.length; i++) {
    const b = bills[i];
    const label = `[${i + 1}/${bills.length}] ${(b.contact_name || '').slice(0, 25).padEnd(25)} $${(b.total || 0).toFixed(2).padStart(10)} ${b.date}`;
    try {
      const r = await xeroGet(`Invoices/${b.xero_id}/Attachments`);
      if (r.status === 404) { stats.notFound.push(b); console.log(`  🚫 ${label}  404 NOT FOUND`); continue; }
      if (!r.ok) { stats.error.push({ ...b, status: r.status }); console.log(`  ❌ ${label}  HTTP ${r.status}`); continue; }
      const j = await r.json();
      const atts = j.Attachments || [];
      if (atts.length === 0) {
        stats.drift.push(b);
        console.log(`  🟡 ${label}  DRIFT (API: 0 attachments)`);
      } else {
        stats.real.push({ ...b, attachmentCount: atts.length, fileNames: atts.map(a => a.FileName) });
        console.log(`  🟢 ${label}  ${atts.length} attachment(s): ${atts.map(a => a.FileName).join(', ').slice(0, 60)}`);
      }
    } catch (e) {
      stats.error.push({ ...b, error: e.message });
      console.log(`  ❌ ${label}  ${e.message}`);
    }
    // Xero limit: 60/min per tenant. 1100ms = ~54/min with headroom.
    await new Promise(r => setTimeout(r, 1100));
  }

  console.log('\n=== Summary ===');
  console.log(`  🟢 Real (API confirms attachment): ${stats.real.length}`);
  console.log(`  🟡 Drift (API returns empty):      ${stats.drift.length}`);
  console.log(`  🚫 Not found / 404:                ${stats.notFound.length}`);
  console.log(`  ❌ Errors:                          ${stats.error.length}`);

  if (stats.drift.length > 0) {
    const driftValue = stats.drift.reduce((s, b) => s + (b.total || 0), 0);
    console.log(`\n  Drift value (Q2+Q3): $${driftValue.toFixed(2)}`);
    console.log(`  Potential G11 recovery: ~$${(driftValue / 11).toFixed(2)} GST credit`);
  }

  if (fix && stats.drift.length > 0) {
    console.log(`\n  Applying fix: setting has_attachments=false on ${stats.drift.length} drifted rows...`);
    const ids = stats.drift.map(b => b.xero_id);
    const { error: upErr } = await sb.from('xero_invoices').update({ has_attachments: false }).in('xero_id', ids);
    if (upErr) console.error('  Update failed:', upErr);
    else console.log('  ✅ Mirror updated');
  } else if (stats.drift.length > 0) {
    console.log(`\n  Run with --fix to set has_attachments=false on drifted rows in the mirror.`);
  }

  // Write report
  const reportPath = `thoughts/shared/reports/xero-attachment-drift-${new Date().toISOString().slice(0, 10)}.md`;
  const lines = [
    `# Xero Attachment Reality Check`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Scope:** ACCPAY bills Q2+Q3 FY26 with mirror \`has_attachments=true\``,
    ``,
    `## Summary`,
    `- Probed: ${bills.length}`,
    `- Real (API confirms): ${stats.real.length}`,
    `- **Drift (API empty): ${stats.drift.length}**`,
    `- Not found (404): ${stats.notFound.length}`,
    `- Errors: ${stats.error.length}`,
    ``,
    `## Drifted bills`,
    `| Date | Vendor | Amount | Invoice # | Xero ID |`,
    `|---|---|---:|---|---|`,
    ...stats.drift.map(b => `| ${b.date} | ${b.contact_name || ''} | $${(b.total || 0).toFixed(2)} | ${b.invoice_number || ''} | \`${b.xero_id}\` |`),
    ``,
    `## Real bills (API confirmed attachments)`,
    `Sample of 10:`,
    ``,
    ...stats.real.slice(0, 10).map(b => `- ${b.date} · ${b.contact_name} · $${(b.total || 0).toFixed(2)} · ${b.attachmentCount} file(s): ${(b.fileNames || []).join(', ')}`),
  ];
  writeFileSync(reportPath, lines.join('\n'));
  console.log(`\n  Report: ${reportPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
