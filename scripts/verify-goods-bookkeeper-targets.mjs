#!/usr/bin/env node
/**
 * READ-ONLY probe of the 3 Goods bookkeeper write-targets + tracking categories.
 * No writes. Confirms live Xero state before any void/recode.
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

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
  await supabase.from('xero_tokens').upsert({ id: 'default', refresh_token: t.refresh_token, access_token: t.access_token, expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString(), updated_by: 'verify-goods-targets' }, { onConflict: 'id' });
  return t.access_token;
}
const xh = (token) => ({ Authorization: `Bearer ${token}`, 'xero-tenant-id': TENANT, Accept: 'application/json' });

const TARGETS = [
  ['Carla DUP (void target)',  '42960d4f-49e3-4f9a-a378-af8fde24704c'],
  ['Carla KEEP',               '6a60f4fd-c99d-4bb2-9ad2-51f372958cbc'],
  ['1300 Washer (recode tgt)', 'c3d5dd2a-98e9-4261-81aa-18e57ec86109'],
];

async function main() {
  if (!TENANT) throw new Error('XERO_TENANT_ID not set');
  const token = await getAccessToken();
  console.log(`Tenant: ${TENANT}\n`);

  for (const [label, id] of TARGETS) {
    await new Promise(r => setTimeout(r, 1500));
    const gr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${id}`, { headers: xh(token) });
    if (!gr.ok) { console.log(`✗ ${label} ${id} → GET ${gr.status}`); continue; }
    const inv = (await gr.json()).Invoices?.[0];
    if (!inv) { console.log(`✗ ${label} ${id} → not found`); continue; }
    console.log(`=== ${label} ===`);
    console.log(`  ${inv.Contact?.Name} | ${inv.InvoiceNumber || '(no #)'} | ${inv.Type} | ${inv.Status}`);
    console.log(`  Total $${inv.Total} | Paid $${inv.AmountPaid} | Due $${inv.AmountDue} | HasAttachments=${inv.HasAttachments}`);
    for (const li of inv.LineItems || []) {
      const trk = (li.Tracking || []).map(t => `${t.Name}=${t.Option}`).join(', ') || '(none)';
      console.log(`    line: $${li.LineAmount} acct=${li.AccountCode} tax=${li.TaxType} | tracking: ${trk}`);
      console.log(`          desc: ${(li.Description || '').slice(0, 70)}`);
    }
    console.log('');
  }

  // tracking categories — need the ACT-GD + ACT-FM option IDs for the recode
  await new Promise(r => setTimeout(r, 1500));
  const tr = await fetch('https://api.xero.com/api.xro/2.0/TrackingCategories', { headers: xh(token) });
  if (tr.ok) {
    const cats = (await tr.json()).TrackingCategories || [];
    console.log('=== Tracking categories ===');
    for (const c of cats) {
      console.log(`  ${c.Name} [${c.Status}] id=${c.TrackingCategoryID}`);
      for (const o of c.Options || []) {
        if (/ACT-GD|ACT-FM|Goods|Farm/i.test(o.Name)) console.log(`     • ${o.Name} [${o.Status}] optId=${o.TrackingOptionID}`);
      }
    }
  } else {
    console.log(`✗ TrackingCategories GET ${tr.status}`);
  }
}
main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
