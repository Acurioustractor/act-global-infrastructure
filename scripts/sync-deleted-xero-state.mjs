#!/usr/bin/env node
/**
 * Sync Deleted Xero State — probes every xero_transactions row in our mirror
 * and marks zombies (DELETED/VOIDED in Xero) as has_attachments=true so the
 * matcher + BAS reports stop targeting them.
 *
 * Why: sync-xero-to-supabase.mjs doesn't pull the Status field, so when Xero
 * deletes or voids a transaction, our mirror keeps the row as if it were live.
 * The matcher then happily pairs receipts with these zombies. Uploads fail
 * with Xero 500s because you can't attach files to deleted entities.
 *
 * This is a one-time deep clean. Future syncs need an upstream fix to
 * sync-xero-to-supabase.mjs. Use --scope last18mo (default) or --scope all.
 *
 * Safe: only writes to our mirror (marks zombies as has_attachments=true).
 * Never touches Xero.
 *
 * Usage:
 *   node scripts/sync-deleted-xero-state.mjs              # dry run, last 18mo
 *   node scripts/sync-deleted-xero-state.mjs --apply      # write mirror patches
 *   node scripts/sync-deleted-xero-state.mjs --apply --scope all
 *   node scripts/sync-deleted-xero-state.mjs --resume path/to/progress.json
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

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const SCOPE = args.includes('--scope') ? args[args.indexOf('--scope') + 1] : 'last18mo';
const PROGRESS_FILE = 'thoughts/shared/reports/_sync-deleted-progress.json';

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
  writeFileSync(TOKEN_FILE, JSON.stringify({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + d.expires_in * 1000 - 60000 }, null, 2));
  return true;
}

async function xeroGet(endpoint, _retries = 0) {
  const r = await fetch(`https://api.xero.com/api.xro/2.0/${endpoint}`, {
    headers: { Authorization: `Bearer ${XERO_ACCESS_TOKEN}`, 'xero-tenant-id': XERO_TENANT_ID, Accept: 'application/json' },
  });
  if (r.status === 401 && _retries === 0) {
    await refreshXeroToken();
    return xeroGet(endpoint, _retries + 1);
  }
  if (r.status === 429 && _retries < 5) {
    const retryAfter = parseInt(r.headers.get('Retry-After') || '60');
    console.log(`    ⏳ 429 — sleeping ${retryAfter}s`);
    await new Promise(res => setTimeout(res, (retryAfter + 1) * 1000));
    return xeroGet(endpoint, _retries + 1);
  }
  return r;
}

async function main() {
  console.log('=== Sync Deleted Xero State ===');
  console.log('Mode:', APPLY ? 'APPLY' : 'dry run');
  console.log('Scope:', SCOPE);

  loadTokens();

  // Load candidate rows from mirror
  const cutoff = SCOPE === 'last18mo' ? (() => {
    const d = new Date(); d.setMonth(d.getMonth() - 18);
    return d.toISOString().slice(0, 10);
  })() : '2024-01-01';

  const candidates = [];
  let p = 0;
  while (true) {
    const { data } = await sb.from('xero_transactions')
      .select('xero_transaction_id, contact_name, total, date, has_attachments, type')
      .in('type', ['SPEND', 'RECEIVE', 'SPEND-TRANSFER', 'RECEIVE-TRANSFER'])
      .gte('date', cutoff)
      .order('date', { ascending: false })
      .range(p * 1000, (p + 1) * 1000 - 1);
    if (!data || data.length === 0) break;
    candidates.push(...data);
    if (data.length < 1000) break;
    p++;
  }
  console.log(`Candidates in mirror: ${candidates.length}`);

  // Resume from progress file if it exists
  const processed = new Set();
  if (existsSync(PROGRESS_FILE)) {
    try {
      const prog = JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
      for (const id of prog.processed || []) processed.add(id);
      console.log(`Resuming: skipping ${processed.size} already-probed rows`);
    } catch {}
  }

  const todo = candidates.filter(c => !processed.has(c.xero_transaction_id));
  console.log(`Rows to probe: ${todo.length}`);
  console.log(`Estimated time: ${Math.ceil(todo.length * 1.1 / 60)} min`);

  const zombies = [];   // DELETED/VOIDED
  const alive = [];     // still real
  const errors = [];

  const startTime = Date.now();
  for (let i = 0; i < todo.length; i++) {
    const c = todo[i];
    try {
      const r = await xeroGet(`BankTransactions/${c.xero_transaction_id}`);
      if (r.status === 404) {
        // Xero returns 404 for genuinely deleted txns sometimes
        zombies.push({ ...c, status: 'NOT_FOUND' });
        processed.add(c.xero_transaction_id);
      } else if (r.ok) {
        const j = await r.json();
        const status = j.BankTransactions?.[0]?.Status;
        if (status === 'DELETED' || status === 'VOIDED') {
          zombies.push({ ...c, status });
        } else {
          alive.push(c);
        }
        processed.add(c.xero_transaction_id);
      } else {
        errors.push({ ...c, code: r.status });
      }
    } catch (e) {
      errors.push({ ...c, err: e.message });
    }

    // Progress every 50
    if ((i + 1) % 50 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (i + 1) / elapsed;
      const eta = ((todo.length - i - 1) / rate / 60).toFixed(1);
      console.log(`  [${i + 1}/${todo.length}] zombies: ${zombies.length} | alive: ${alive.length} | err: ${errors.length} | ETA: ${eta}min`);
      // Save progress
      writeFileSync(PROGRESS_FILE, JSON.stringify({
        processed: [...processed],
        zombies: zombies.map(z => z.xero_transaction_id),
        updated_at: new Date().toISOString(),
      }, null, 2));
    }
    await new Promise(rs => setTimeout(rs, 1100));
  }

  console.log('\n=== Summary ===');
  console.log(`  Probed: ${todo.length}`);
  console.log(`  🚫 Zombies (DELETED/VOIDED/404): ${zombies.length}`);
  console.log(`  🟢 Alive: ${alive.length}`);
  console.log(`  ❌ Errors: ${errors.length}`);

  if (zombies.length > 0) {
    const zombieValue = zombies.reduce((s, z) => s + Math.abs(Number(z.total) || 0), 0);
    console.log(`  Zombie total value: $${zombieValue.toFixed(2)}`);

    if (APPLY) {
      console.log('\nMarking zombies as has_attachments=true in mirror...');
      const ids = zombies.map(z => z.xero_transaction_id);
      // Batch in chunks of 100
      let done = 0;
      for (let i = 0; i < ids.length; i += 100) {
        const batch = ids.slice(i, i + 100);
        const { error } = await sb.from('xero_transactions')
          .update({ has_attachments: true })
          .in('xero_transaction_id', batch);
        if (error) { console.error('  FAIL:', error.message); break; }
        done += batch.length;
      }
      console.log(`  Mirror marked: ${done}/${ids.length}`);

      // Also reset any receipt_emails pointing at zombies back to captured
      const { data: affected } = await sb.from('receipt_emails')
        .select('id')
        .or(`xero_bank_transaction_id.in.(${ids.slice(0, 100).map(id => `"${id}"`).join(',')}),xero_transaction_id.in.(${ids.slice(0, 100).map(id => `"${id}"`).join(',')})`);
      if (affected && affected.length > 0) {
        await sb.from('receipt_emails').update({
          status: 'captured',
          xero_bank_transaction_id: null,
          xero_transaction_id: null,
          error_message: 'Matched to zombie Xero entity — reset by sync-deleted-xero-state',
        }).in('id', affected.map(r => r.id));
        console.log(`  Reset ${affected.length} affected receipts to captured`);
      }
    } else {
      console.log('\n(dry run — pass --apply to mark zombies in mirror)');
    }
  }

  // Write report
  const reportPath = `thoughts/shared/reports/zombie-sweep-${new Date().toISOString().slice(0, 10)}.md`;
  const lines = [
    `# Xero Zombie Sweep`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Mode:** ${APPLY ? 'APPLIED' : 'dry run'}`,
    `**Scope:** ${SCOPE}`,
    ``,
    `## Summary`,
    `- Probed: ${todo.length}`,
    `- Zombies (DELETED/VOIDED): ${zombies.length}`,
    `- Alive: ${alive.length}`,
    `- Errors: ${errors.length}`,
    ``,
    `## Zombies by vendor`,
    ...(() => {
      const byVendor = {};
      for (const z of zombies) byVendor[z.contact_name || '?'] = (byVendor[z.contact_name || '?'] || 0) + 1;
      return Object.entries(byVendor).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([v, n]) => `- ${v}: ${n}`);
    })(),
    ``,
    `## Zombies (sample)`,
    ...zombies.slice(0, 100).map(z => `- ${z.date} ${z.type} ${z.contact_name} $${z.total} [${z.status}] \`${z.xero_transaction_id}\``),
  ];
  writeFileSync(reportPath, lines.join('\n'));
  console.log(`\nReport: ${reportPath}`);

  // Clean up progress file on success
  if (APPLY && errors.length === 0) {
    try { writeFileSync(PROGRESS_FILE, JSON.stringify({ done: true, date: new Date().toISOString() })); } catch {}
  }
}

main().catch(e => { console.error(e); process.exit(1); });
