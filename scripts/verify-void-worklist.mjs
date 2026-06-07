#!/usr/bin/env node
/**
 * READ-ONLY verifier for the duplicate-void worklist.
 *
 * Parses InvoiceIDs out of the worklist markdown, GETs each bill fresh from
 * live Xero, and reports current Status / AmountDue / AmountPaid + whether it
 * is still safely voidable (AUTHORISED + AmountPaid 0). NO writes.
 *
 * Usage: node scripts/verify-void-worklist.mjs [--json]
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const JSON_OUT = process.argv.includes('--json');
const WORKLIST = 'thoughts/shared/financials/2026-05-29-duplicate-void-worklist.md';
const SUPA_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPA_URL, SUPA_KEY);
const TENANT = process.env.XERO_TENANT_ID;

async function getAccessToken() {
  const { data: row } = await supabase.from('xero_tokens').select('refresh_token').eq('id', 'default').single();
  if (!row?.refresh_token) throw new Error('No refresh token; run node scripts/xero-auth.mjs');
  const creds = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');
  const r = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: row.refresh_token }),
  });
  if (!r.ok) throw new Error(`Token refresh failed ${r.status}: ${await r.text()}`);
  const t = await r.json();
  const expiresAt = new Date(Date.now() + t.expires_in * 1000 - 60000);
  await supabase.from('xero_tokens').upsert({ id: 'default', refresh_token: t.refresh_token, access_token: t.access_token, expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString(), updated_by: 'void-worklist-verify' }, { onConflict: 'id' });
  return t.access_token;
}
const xh = (token) => ({ Authorization: `Bearer ${token}`, 'xero-tenant-id': TENANT, Accept: 'application/json' });

// Parse worklist rows: confidence | date | amount | vendor(link w/ InvoiceID) | authNo | paidTwin | why
function parseWorklist() {
  const md = readFileSync(WORKLIST, 'utf8');
  const rows = [];
  for (const line of md.split('\n')) {
    if (!line.startsWith('| 🔴') && !line.startsWith('| 🟠') && !line.startsWith('| 🟡')) continue;
    const id = (line.match(/InvoiceID=([0-9a-f-]{36})/) || [])[1];
    const vendor = (line.match(/\[([^\]]+)\]/) || [])[1];
    const amount = (line.match(/\$[\d,]+\.\d{2}/) || [])[0];
    const conf = line.includes('🔴') ? '🔴' : line.includes('🟠') ? '🟠' : '🟡';
    if (id) rows.push({ conf, vendor, amount, id });
  }
  return rows;
}

async function main() {
  const rows = parseWorklist();
  const token = await getAccessToken();
  const out = [];
  for (const r of rows) {
    let status = '?', due = '?', paid = '?', voidable = false, err = null;
    try {
      const gr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${r.id}`, { headers: xh(token) });
      if (!gr.ok) { err = `GET ${gr.status}`; }
      else {
        const inv = (await gr.json()).Invoices?.[0];
        status = inv?.Status ?? 'MISSING';
        due = inv?.AmountDue ?? '?';
        paid = inv?.AmountPaid ?? '?';
        voidable = status === 'AUTHORISED' && Number(paid) === 0;
      }
    } catch (e) { err = e.message?.slice(0, 80); }
    out.push({ ...r, status, due, paid, voidable, err });
    await new Promise((res) => setTimeout(res, 120)); // gentle on rate limit
  }

  if (JSON_OUT) { console.log(JSON.stringify(out, null, 2)); return; }

  const pad = (s, n) => String(s).padEnd(n).slice(0, n);
  console.log(`\nLive Xero status of ${out.length} worklist bills (read-only):\n`);
  console.log(pad('C', 3) + pad('Vendor', 28) + pad('Amount', 12) + pad('Status', 13) + pad('Paid', 10) + 'Voidable?');
  console.log('-'.repeat(80));
  for (const r of out) {
    const flag = r.err ? `ERR ${r.err}` : r.voidable ? '✅ yes' : `⚠️ NO (${r.status}/paid ${r.paid})`;
    console.log(pad(r.conf, 3) + pad(r.vendor, 28) + pad(r.amount, 12) + pad(r.status, 13) + pad(r.paid, 10) + flag);
  }
  const notVoidable = out.filter((r) => !r.voidable && !r.err);
  const errs = out.filter((r) => r.err);
  console.log('\nSummary:');
  console.log(`  voidable (AUTHORISED, unpaid): ${out.filter((r) => r.voidable).length}/${out.length}`);
  if (notVoidable.length) console.log(`  ⚠️ NOT voidable (status changed): ${notVoidable.map((r) => `${r.vendor} ${r.amount} [${r.status}]`).join(', ')}`);
  if (errs.length) console.log(`  ❌ errors: ${errs.map((r) => `${r.vendor} (${r.err})`).join(', ')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
