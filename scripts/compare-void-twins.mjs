#!/usr/bin/env node
/**
 * READ-ONLY side-by-side of the 🟡 "different-#s" worklist pairs.
 * For each AUTHORISED bill, GET it fresh from Xero (Reference + LineItems),
 * find its PAID twin in the app DB (same contact + total, status PAID), and
 * GET that too. Prints both so a human can judge dup vs genuine. NO writes.
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';

const SUPA_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const APP_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPA_URL, SUPA_KEY);
const appDb = createClient(APP_URL, APP_KEY);
const TENANT = process.env.XERO_TENANT_ID;

// 🟡 AUTHORISED bills to walk (from the worklist), with their amounts.
const AUTH = [
  { v: 'Bunnings Warehouse',        amt: 1199.80, id: 'f17812a9-4e07-4492-b587-7e9ad11bdd99' },
  { v: 'Palm Island Motel',         amt: 514.00,  id: '503b4d00-d757-4fec-a858-f66fb8c07d0e' },
  { v: 'Maleny Hardware And Rural', amt: 497.48,  id: 'adc8c86f-9baf-4a53-a597-3c11df96a66b' },
  { v: 'Maleny Hardware And Rural', amt: 423.75,  id: 'db9b2797-54a8-4511-8ef5-3f69c3a88622' },
  { v: 'Repco',                     amt: 384.00,  id: '4912fa8d-2030-4153-a80c-db48ce4b30b1' },
  { v: 'Maleny Hardware And Rural', amt: 285.20,  id: '0d240fbf-89c4-43a0-8aff-00704b615815' },
  { v: 'Virgin Australia',          amt: 202.00,  id: '27c08325-0ec5-4d53-87f0-71095969fa63' },
  { v: 'Apple Pty Ltd',             amt: 99.99,   id: '0df8f163-b479-433f-92bc-c242110e1c51' },
];

async function getAccessToken() {
  const { data: row } = await supabase.from('xero_tokens').select('refresh_token').eq('id', 'default').single();
  const creds = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');
  const r = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: row.refresh_token }),
  });
  if (!r.ok) throw new Error(`Token refresh failed ${r.status}`);
  const t = await r.json();
  const expiresAt = new Date(Date.now() + t.expires_in * 1000 - 60000);
  await supabase.from('xero_tokens').upsert({ id: 'default', refresh_token: t.refresh_token, access_token: t.access_token, expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString(), updated_by: 'compare-twins' }, { onConflict: 'id' });
  return t.access_token;
}
const xh = (token) => ({ Authorization: `Bearer ${token}`, 'xero-tenant-id': TENANT, Accept: 'application/json' });

async function getInv(token, id) {
  const gr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${id}`, { headers: xh(token) });
  if (!gr.ok) return null;
  return (await gr.json()).Invoices?.[0];
}
function fmtInv(inv) {
  if (!inv) return '    (could not fetch)';
  const lines = (inv.LineItems || []).map((l) => `      • ${l.Description || '(no desc)'} | acct ${l.AccountCode || '?'} | $${l.LineAmount}`).join('\n');
  return `    #${inv.InvoiceNumber || '(none)'} | ${String(inv.DateString || inv.Date).slice(0, 10)} | Ref: ${inv.Reference || '—'} | ${inv.Status} | $${inv.Total}\n${lines || '      (no line items)'}`;
}

async function main() {
  const token = await getAccessToken();
  for (const a of AUTH) {
    const auth = await getInv(token, a.id);
    // find PAID twin in app DB
    const { data: twins } = await appDb.from('xero_invoices')
      .select('xero_id,invoice_number,date,total,status,contact_name')
      .ilike('contact_name', `%${a.v.split(' ')[0]}%`)
      .eq('status', 'PAID')
      .gte('total', a.amt - 0.005).lte('total', a.amt + 0.005);
    console.log(`\n${'='.repeat(78)}\n${a.v} — $${a.amt}`);
    console.log('  AUTHORISED (worklist candidate):');
    console.log(fmtInv(auth));
    if (!twins?.length) { console.log('  PAID twin: none found in app DB'); continue; }
    for (const tw of twins) {
      const paid = await getInv(token, tw.xero_id);
      console.log('  PAID twin:');
      console.log(fmtInv(paid));
      await new Promise((r) => setTimeout(r, 120));
    }
    await new Promise((r) => setTimeout(r, 120));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
