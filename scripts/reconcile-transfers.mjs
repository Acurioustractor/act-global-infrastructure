#!/usr/bin/env node
/**
 * Reconcile Bank Transfers — pairs SPEND-TRANSFER / RECEIVE-TRANSFER rows
 * in Xero and marks them reconciled via the Xero API.
 *
 * Uses the same pairing logic as pair-bank-transfers.mjs. For each matched
 * pair, attempts to flip IsReconciled=true on both sides via a PUT to
 * /BankTransactions/{id}. If Xero rejects the simple flag flip, falls back
 * to reporting the pair as "needs manual reconciliation" so Ben can use the
 * existing bank-transfers-*.md playbook in the Xero UI.
 *
 * Defaults to dry-run — must pass --apply to write.
 *
 * Usage:
 *   node scripts/reconcile-transfers.mjs Q2                # Dry run, Q2
 *   node scripts/reconcile-transfers.mjs Q2 --apply         # Apply Q2
 *   node scripts/reconcile-transfers.mjs Q2 Q3 --apply      # Both
 *   node scripts/reconcile-transfers.mjs Q3 --apply --limit 3  # Small test batch
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

const QUARTERS = {
  Q1: { start: '2025-07-01', end: '2025-09-30', label: 'Q1 FY26' },
  Q2: { start: '2025-10-01', end: '2025-12-31', label: 'Q2 FY26' },
  Q3: { start: '2026-01-01', end: '2026-03-31', label: 'Q3 FY26' },
  Q4: { start: '2026-04-01', end: '2026-06-30', label: 'Q4 FY26' },
};

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
  // Also update Supabase so next run finds it
  await sb.from('xero_tokens').upsert({
    id: 'default',
    access_token: d.access_token, refresh_token: d.refresh_token,
    expires_at: new Date(Date.now() + d.expires_in * 1000 - 60000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  return true;
}

async function xeroRequest(method, endpoint, body = null, _retry = false) {
  const url = `${XERO_API}/${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${XERO_ACCESS_TOKEN}`,
    'xero-tenant-id': XERO_TENANT_ID,
    'Accept': 'application/json',
  };
  if (body) headers['Content-Type'] = 'application/json';
  const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401 && !_retry) {
    const ok = await refreshXeroToken();
    if (ok) return xeroRequest(method, endpoint, body, true);
  }
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { ok: r.ok, status: r.status, data, text };
}

async function q(sql) {
  const { data, error } = await sb.rpc('exec_sql', { query: sql });
  if (error) { console.error('SQL:', error.message); return []; }
  return data || [];
}

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function findPairs(quarter) {
  const transfers = await q(`
    SELECT xero_transaction_id, type, date, contact_name, bank_account,
           abs(total)::numeric(12,2) as amount, is_reconciled
    FROM xero_transactions
    WHERE type IN ('SPEND-TRANSFER', 'RECEIVE-TRANSFER')
      AND date >= '${quarter.start}'::date - interval '3 days'
      AND date <= '${quarter.end}'::date + interval '3 days'
  `);
  const spends = transfers.filter(t => t.type === 'SPEND-TRANSFER');
  const receives = transfers.filter(t => t.type === 'RECEIVE-TRANSFER');

  const used = new Set();
  const pairs = [];
  for (const s of spends) {
    const sDate = new Date(s.date);
    const match = receives
      .filter(r => !used.has(r.xero_transaction_id))
      .filter(r => Math.abs(Number(r.amount) - Number(s.amount)) < 0.01)
      .filter(r => r.bank_account !== s.bank_account)
      .filter(r => Math.abs((new Date(r.date) - sDate) / 86400000) <= 2)
      .sort((a, b) => Math.abs(new Date(a.date) - sDate) - Math.abs(new Date(b.date) - sDate))[0];
    if (match) {
      used.add(match.xero_transaction_id);
      used.add(s.xero_transaction_id);
      pairs.push({ spend: s, receive: match });
    }
  }

  // Only in-quarter pairs
  const inQuarter = (d) => d >= quarter.start && d <= quarter.end;
  return pairs.filter(p => inQuarter(p.spend.date) || inQuarter(p.receive.date));
}

/**
 * Attempt to mark a single bank transaction as reconciled via PUT.
 * Xero expects the full transaction object — we PUT with IsReconciled=true.
 */
async function markReconciled(txnId) {
  // First fetch the full transaction so we can PUT it back with IsReconciled flipped
  const g = await xeroRequest('GET', `BankTransactions/${txnId}`);
  if (!g.ok || !g.data?.BankTransactions?.[0]) {
    return { ok: false, reason: `GET failed: ${g.status} ${g.text?.slice(0, 150)}` };
  }
  const tx = g.data.BankTransactions[0];
  if (tx.IsReconciled) return { ok: true, already: true };

  // PUT the mutation — Xero wants the full BankTransactions wrapper
  const body = {
    BankTransactions: [{
      BankTransactionID: txnId,
      IsReconciled: true,
    }],
  };
  const p = await xeroRequest('POST', 'BankTransactions', body);
  if (!p.ok) {
    // Xero returns a ValidationException here because IsReconciled is a
    // read-only field on bank-fed transactions. Surface the detail so
    // callers understand the limitation rather than just seeing HTTP 400.
    const vMsgs = (p.data?.Elements?.[0]?.ValidationErrors || []).map(e => e.Message).join('; ');
    return { ok: false, reason: `POST ${p.status}: ${vMsgs || p.text?.slice(0, 200)}` };
  }
  const returned = p.data?.BankTransactions?.[0];
  if (returned?.IsReconciled) return { ok: true };
  return { ok: false, reason: 'POST returned but IsReconciled still false — not writable via public API', xero: returned };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;
  const quarterArgs = args.filter(a => /^Q[1-4]$/i.test(a)).map(a => a.toUpperCase());
  const quarters = quarterArgs.length > 0 ? quarterArgs : ['Q2', 'Q3'];

  console.log(`Reconcile Transfers — ${apply ? 'APPLY' : 'DRY RUN'} | quarters: ${quarters.join(', ')}${limit ? ` | limit ${limit}` : ''}`);

  loadTokens();
  if (apply && !XERO_ACCESS_TOKEN) {
    console.log('Refreshing Xero token...');
    if (!(await refreshXeroToken())) {
      console.error('Token refresh failed. Run: node scripts/sync-xero-tokens.mjs');
      process.exit(1);
    }
  }

  const allPairs = [];
  for (const qArg of quarters) {
    const quarter = QUARTERS[qArg];
    if (!quarter) continue;
    const pairs = await findPairs(quarter);
    console.log(`  ${quarter.label}: ${pairs.length} pairs`);
    allPairs.push(...pairs.map(p => ({ ...p, quarter: quarter.label })));
  }

  console.log(`\nTotal pairs: ${allPairs.length}`);

  // Filter out pairs where both sides are already reconciled (nothing to do)
  const needsWork = allPairs.filter(p => !p.spend.is_reconciled || !p.receive.is_reconciled);
  const alreadyDone = allPairs.length - needsWork.length;
  if (alreadyDone > 0) console.log(`  (${alreadyDone} already fully reconciled, skipping)`);
  console.log(`  Needs reconciliation: ${needsWork.length}`);

  if (needsWork.length === 0) {
    console.log('\n✅ Nothing to do.');
    return;
  }

  const targetPairs = limit ? needsWork.slice(0, limit) : needsWork;
  console.log(`\nTargeting ${targetPairs.length} pair(s):`);
  for (const p of targetPairs.slice(0, 10)) {
    const spState = p.spend.is_reconciled ? '✓' : '✗';
    const rcState = p.receive.is_reconciled ? '✓' : '✗';
    console.log(`  ${p.spend.date}  ${fmt(p.spend.amount).padStart(12)}  ${(p.spend.bank_account || '?').padEnd(28)}[${spState}] → ${(p.receive.bank_account || '?').padEnd(28)}[${rcState}]`);
  }
  if (targetPairs.length > 10) console.log(`  ...and ${targetPairs.length - 10} more`);

  if (!apply) {
    console.log('\n(dry run — pass --apply to attempt reconciliation via Xero API)');
    return;
  }

  console.log('\nApplying via Xero API...');
  let reconciled = 0, failed = 0, skipped = 0;
  const failures = [];

  for (const pair of targetPairs) {
    const ids = [
      { side: 'spend', id: pair.spend.xero_transaction_id, reconciled: pair.spend.is_reconciled },
      { side: 'receive', id: pair.receive.xero_transaction_id, reconciled: pair.receive.is_reconciled },
    ];
    for (const { side, id, reconciled: alreadyRec } of ids) {
      if (alreadyRec) { skipped++; continue; }
      const result = await markReconciled(id);
      if (result.ok) {
        reconciled++;
        // Update Supabase mirror
        await sb.from('xero_transactions')
          .update({ is_reconciled: true, updated_at: new Date().toISOString() })
          .eq('xero_transaction_id', id);
      } else {
        failed++;
        failures.push({ pair, side, id, reason: result.reason });
        if (failures.length <= 3) console.log(`    ❌ ${side} ${id.slice(0, 8)}: ${result.reason}`);
      }
      await new Promise(r => setTimeout(r, 1100)); // Xero rate limit
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Reconciled: ${reconciled}`);
  console.log(`  Skipped (already reconciled): ${skipped}`);
  console.log(`  Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n⚠ Some reconciliations failed. This is likely because Xero does not allow');
    console.log('  setting IsReconciled=true via the public API on bank-fed transactions.');
    console.log('  Fall back to manual reconciliation in Xero UI — see:');
    console.log('  thoughts/shared/reports/bank-transfers-q2-fy26-2026-04-08.md');
    console.log('  thoughts/shared/reports/bank-transfers-q3-fy26-2026-04-08.md');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
