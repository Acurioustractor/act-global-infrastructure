#!/usr/bin/env node
/**
 * READ-ONLY discovery for the Justice Reform Initiative photography invoice.
 * Mirrors tandanya-invoice-discovery.mjs. Makes NO writes to Xero.
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
  await supabase.from('xero_tokens').upsert({ id: 'default', refresh_token: t.refresh_token, access_token: t.access_token, expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString(), updated_by: 'jri-discovery' }, { onConflict: 'id' });
  return t.access_token;
}
const xh = (token) => ({ Authorization: `Bearer ${token}`, 'xero-tenant-id': TENANT, Accept: 'application/json', 'Content-Type': 'application/json' });

async function main() {
  const token = await getAccessToken();

  const conns = await (await fetch('https://api.xero.com/connections', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })).json();
  console.log('=== CONNECTIONS (available entities) ===');
  for (const c of conns) console.log(`  ${c.tenantName}  | id=${c.tenantId}${c.tenantId === TENANT ? '  <-- XERO_TENANT_ID (active)' : ''}`);

  const org = (await (await fetch('https://api.xero.com/api.xro/2.0/Organisation', { headers: xh(token) })).json()).Organisations?.[0];
  console.log('\n=== ACTIVE ORG ===');
  console.log(`  Name:        ${org?.Name}`);
  console.log(`  LegalName:   ${org?.LegalName || '(none)'}`);
  console.log(`  ABN/TaxNum:  ${org?.TaxNumber || '(none)'}`);
  console.log(`  BaseCurrency:${org?.BaseCurrency}  | CountryCode: ${org?.CountryCode}`);

  // Contact search — JRI / Emma Cother
  for (const term of ['Justice Reform', 'Cother']) {
    const cRes = await (await fetch(`https://api.xero.com/api.xro/2.0/Contacts?where=${encodeURIComponent(`Name.Contains("${term}")`)}`, { headers: xh(token) })).json();
    console.log(`\n=== CONTACT SEARCH "${term}" ===`);
    if (!cRes.Contacts?.length) console.log('  (none found)');
    for (const c of cRes.Contacts || []) console.log(`  ${c.Name} | id=${c.ContactID} | email=${c.EmailAddress || '(none)'} | status=${c.ContactStatus}`);
  }

  const aRes = await (await fetch('https://api.xero.com/api.xro/2.0/Accounts?where=Class=="REVENUE"', { headers: xh(token) })).json();
  console.log('\n=== REVENUE ACCOUNTS ===');
  for (const a of (aRes.Accounts || [])) console.log(`  ${a.Code.padEnd(6)} ${a.Name}  [${a.Status}] tax=${a.TaxType}`);

  const tRes = await (await fetch('https://api.xero.com/api.xro/2.0/TaxRates', { headers: xh(token) })).json();
  console.log('\n=== TAX RATES (income-relevant) ===');
  for (const t of (tRes.TaxRates || [])) {
    if (/income|output|gst/i.test(t.Name) || /OUTPUT|GST/i.test(t.TaxType)) {
      console.log(`  ${t.TaxType.padEnd(16)} ${t.Name}  rate=${t.EffectiveRate}%  status=${t.Status}`);
    }
  }
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
