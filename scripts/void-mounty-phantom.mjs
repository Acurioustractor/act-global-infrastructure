#!/usr/bin/env node
/**
 * Void the made-up "Mounty Container" $11,000 bill (manual entry, no payment).
 * The real Mounty Yarns container is Container Options $5,802.50 (NAB Visa 5-Dec-25).
 * See wiki/decisions/2026-05-31-q2q3-429-review-band-classification.md §4.
 *
 * SAFE BY DESIGN:
 *  - DRY RUN by default. Pass --apply to write.
 *  - GETs the bill fresh; ABORTS unless it is exactly: AUTHORISED, AmountPaid 0,
 *    Total 11000, contact contains "Mounty" — never voids an unexpected state.
 *  - Full before-state → revert log (voids are NOT API-reversible; recovery = re-create).
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const ID = '408b05bb-15f8-4895-83ba-f858046db38a';
const EXPECT = { status: 'AUTHORISED', total: 11000, paid: 0, contact: /mounty/i };

const SUPA_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPA_URL, SUPA_KEY);
const TENANT = process.env.XERO_TENANT_ID;

async function getAccessToken() {
  const { data: row } = await supabase.from('xero_tokens').select('refresh_token').eq('id', 'default').single();
  if (!row?.refresh_token) throw new Error('No refresh token; run node scripts/xero-auth.mjs');
  const creds = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64');
  const r = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST', headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: row.refresh_token }),
  });
  if (!r.ok) throw new Error(`Token refresh failed ${r.status}: ${await r.text()}`);
  const t = await r.json();
  await supabase.from('xero_tokens').upsert({ id: 'default', refresh_token: t.refresh_token, access_token: t.access_token, expires_at: new Date(Date.now() + t.expires_in * 1000 - 60000).toISOString(), updated_at: new Date().toISOString(), updated_by: 'void-mounty' }, { onConflict: 'id' });
  if (existsSync('.env.local')) { let b = readFileSync('.env.local', 'utf8'); b = /^XERO_REFRESH_TOKEN=/m.test(b) ? b.replace(/^XERO_REFRESH_TOKEN=.*/m, `XERO_REFRESH_TOKEN=${t.refresh_token}`) : `${b.trimEnd()}\nXERO_REFRESH_TOKEN=${t.refresh_token}\n`; writeFileSync('.env.local', b); }
  return t.access_token;
}
const xh = (token) => ({ Authorization: `Bearer ${token}`, 'xero-tenant-id': TENANT, Accept: 'application/json', 'Content-Type': 'application/json' });

async function main() {
  console.log(`\n=== Void Mounty Container phantom ${APPLY ? '*** APPLY ***' : '(DRY RUN)'} ===\n`);
  if (!TENANT) throw new Error('XERO_TENANT_ID not set');
  const token = await getAccessToken();
  const gr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${ID}`, { headers: xh(token) });
  if (!gr.ok) throw new Error(`GET failed ${gr.status}: ${await gr.text()}`);
  const inv = (await gr.json()).Invoices?.[0];
  if (!inv) throw new Error('bill not found');
  console.log(`  ${inv.Contact?.Name} | ${inv.Status} | Total $${inv.Total} | Paid $${inv.AmountPaid} | ${inv.Date}`);

  const ok = inv.Status === EXPECT.status && Number(inv.Total) === EXPECT.total && Number(inv.AmountPaid) === EXPECT.paid && EXPECT.contact.test(inv.Contact?.Name || '');
  if (!ok) { console.log('\n  ✗ ABORT — bill is not the expected AUTHORISED/$11000/unpaid/Mounty state. Nothing voided.\n'); process.exit(1); }

  if (!APPLY) { console.log('\n  ✓ preflight passed — re-run with --apply to void.\n'); return; }

  mkdirSync('scripts/output', { recursive: true });
  const f = `scripts/output/void-mounty-revert-${Date.now()}.json`;
  writeFileSync(f, JSON.stringify(inv, null, 2));   // full before-state (voids not API-reversible)

  const cid = inv.Contact?.ContactID;
  const setContact = (status) => fetch('https://api.xero.com/api.xro/2.0/Contacts', { method: 'POST', headers: xh(token), body: JSON.stringify({ Contacts: [{ ContactID: cid, ContactStatus: status }] }) });

  // 1) un-archive the contact (archived contact blocks the void)
  const ua = await setContact('ACTIVE');
  if (!ua.ok) {
    const txt = await ua.text(); let msg = txt;
    try { const el = JSON.parse(txt).Elements?.[0]; const ve = el?.ValidationErrors || []; if (ve.length) msg = ve.map(v => v.Message).join(' | '); } catch {}
    console.log(`  ✗ un-archive failed ${ua.status}: ${msg}`); process.exit(1);
  }
  console.log('  ✓ contact un-archived');

  // 2) void the bill
  const pr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${ID}`, { method: 'POST', headers: xh(token), body: JSON.stringify({ Invoices: [{ InvoiceID: ID, Status: 'VOIDED' }] }) });
  if (!pr.ok) {
    const txt = await pr.text(); let msg = txt;
    try { const el = JSON.parse(txt).Elements?.[0]; const ve = (el?.ValidationErrors || []).concat((el?.LineItems || []).flatMap(l => l.ValidationErrors || [])); if (ve.length) msg = ve.map(v => v.Message).join(' | '); } catch {}
    console.log(`  ✗ VOID failed ${pr.status}: ${msg}`);
    const back = await setContact('ARCHIVED'); console.log(back.ok ? '  ↩ contact re-archived (restored)' : '  ⚠ re-archive failed — contact left ACTIVE');
    process.exit(1);
  }
  const after = (await pr.json()).Invoices?.[0];
  await supabase.from('xero_invoices').update({ status: 'VOIDED', updated_at: new Date().toISOString() }).eq('xero_id', ID);
  console.log(`  ✓ VOIDED — status now ${after?.Status}`);

  // 3) re-archive the contact (restore original state)
  const ra = await setContact('ARCHIVED');
  console.log(ra.ok ? '  ✓ contact re-archived' : `  ⚠ re-archive failed ${ra.status} — contact left ACTIVE (re-archive manually in Xero)`);
  console.log(`\n  Done. Before-state: ${f}\n`);
}
main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
