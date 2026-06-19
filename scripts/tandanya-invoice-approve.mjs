#!/usr/bin/env node
/**
 * Approve (AUTHORISE) the Tandanya / CONTAINED invoice and re-save the finalised PDF.
 * Does NOT email the contact. Run with --apply.
 *   node scripts/tandanya-invoice-approve.mjs --apply
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import os from 'os';
import path from 'path';

const APPLY = process.argv.includes('--apply');
const INVOICE_ID = 'fd12b161-a3f1-4178-9e3d-c55baade759a'; // INV-0332

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
  await supabase.from('xero_tokens').upsert({ id: 'default', refresh_token: t.refresh_token, access_token: t.access_token, expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString(), updated_by: 'tandanya-approve' }, { onConflict: 'id' });
  return t.access_token;
}
const xh = (token, accept = 'application/json') => ({ Authorization: `Bearer ${token}`, 'xero-tenant-id': TENANT, Accept: accept, 'Content-Type': 'application/json' });

async function main() {
  const token = await getAccessToken();

  // Fetch fresh state
  const cur = (await (await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${INVOICE_ID}`, { headers: xh(token) })).json()).Invoices?.[0];
  if (!cur) throw new Error('Invoice not found');
  console.log(`  Current: ${cur.InvoiceNumber} status=${cur.Status} total=$${cur.Total}`);
  if (cur.Status === 'AUTHORISED') { console.log('  Already AUTHORISED — nothing to do.'); }
  else if (!APPLY) { console.log('  (dry run — pass --apply to authorise)'); return; }
  else {
    const r = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${INVOICE_ID}`, {
      method: 'POST', headers: xh(token), body: JSON.stringify({ Status: 'AUTHORISED' }),
    });
    if (!r.ok) throw new Error(`Authorise failed ${r.status}: ${await r.text()}`);
    const inv = (await r.json()).Invoices[0];
    console.log(`  ✅ ${inv.InvoiceNumber} → ${inv.Status}  (SubTotal $${inv.SubTotal} GST $${inv.TotalTax} Total $${inv.Total})`);
  }

  // Re-save finalised PDF
  await new Promise(r => setTimeout(r, 1500));
  const pr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${INVOICE_ID}`, { headers: xh(token, 'application/pdf') });
  if (!pr.ok) { console.log(`  ⚠ PDF fetch failed ${pr.status} — download from Xero.`); return; }
  const buf = Buffer.from(await pr.arrayBuffer());
  const outPath = path.join(os.homedir(), 'Downloads', `Tandanya-CONTAINED-invoice-${cur.InvoiceNumber}.pdf`);
  writeFileSync(outPath, buf);
  console.log(`  💾 Finalised PDF saved: ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
  console.log(`  Deep link: https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${INVOICE_ID}`);
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
