#!/usr/bin/env node
/**
 * Void the leftover 429 Dext shadow-duplicates the 2026-05-29 sweep missed.
 * See wiki/decisions/2026-05-31-q2q3-429-review-band-classification.md §5/§6.
 *
 * SAFE BY DESIGN (mirrors void-duplicate-bills-2026-05-29.mjs):
 *  - DRY RUN by default. Pass --apply to write.
 *  - GETs each bill fresh; SKIPS unless it matches the expected
 *    AUTHORISED + AmountPaid 0 + total + contact — never voids an unexpected state.
 *  - Per-bill try/catch (archived contact / period lock does not halt the batch).
 *  - Full before-state → revert log (voids are NOT API-reversible).
 *  - Mirrors Status→VOIDED into Supabase so finance surfaces reflect it.
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const SUPA_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPA_URL, SUPA_KEY);
const TENANT = process.env.XERO_TENANT_ID;

// Confirmed duplicate bills to void (keep the twin noted in each entry).
const VOIDS = [
  { id: '764b8b05-b5cc-4706-8d0c-236b88984b2e', contact: /nicholas marchesi/i, total: 1974.50, note: 'Nicholas Marchesi $1,974.50 — dup (same Dext ref 03a26314 as kept twin 72d0abe7)' },
  { id: 'f8982afe-dc08-4186-8c55-8946f9a42ac8', contact: /matnic/i,            total: 591.28,  note: 'Matnic Trust $591.28 — Dext dup of PAID keeper 446/ACT-HV (sweep missed)' },
];

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
  await supabase.from('xero_tokens').upsert({ id: 'default', refresh_token: t.refresh_token, access_token: t.access_token, expires_at: new Date(Date.now() + t.expires_in * 1000 - 60000).toISOString(), updated_at: new Date().toISOString(), updated_by: 'void-429-dups' }, { onConflict: 'id' });
  if (existsSync('.env.local')) { let b = readFileSync('.env.local', 'utf8'); b = /^XERO_REFRESH_TOKEN=/m.test(b) ? b.replace(/^XERO_REFRESH_TOKEN=.*/m, `XERO_REFRESH_TOKEN=${t.refresh_token}`) : `${b.trimEnd()}\nXERO_REFRESH_TOKEN=${t.refresh_token}\n`; writeFileSync('.env.local', b); }
  return t.access_token;
}
const xh = (token) => ({ Authorization: `Bearer ${token}`, 'xero-tenant-id': TENANT, Accept: 'application/json', 'Content-Type': 'application/json' });
const parseErr = (txt) => { try { const el = JSON.parse(txt).Elements?.[0]; const ve = (el?.ValidationErrors || []).concat((el?.LineItems || []).flatMap(l => l.ValidationErrors || [])); return ve.length ? ve.map(v => v.Message).join(' | ') : txt.slice(0, 200); } catch { return txt.slice(0, 200); } };

async function main() {
  console.log(`\n=== Void 429 leftover dups ${APPLY ? '*** APPLY ***' : '(DRY RUN)'} ===\n`);
  if (!TENANT) throw new Error('XERO_TENANT_ID not set');
  const token = await getAccessToken();
  const revert = []; let voided = 0, skipped = 0, failed = 0;

  for (const v of VOIDS) {
    await new Promise(r => setTimeout(r, 2500));
    const gr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${v.id}`, { headers: xh(token) });
    if (!gr.ok) { console.log(`  ✗ GET ${v.id} ${gr.status}`); failed++; continue; }
    const inv = (await gr.json()).Invoices?.[0];
    const ok = inv && inv.Status === 'AUTHORISED' && Number(inv.AmountPaid) === 0 && Number(inv.Total) === v.total && v.contact.test(inv.Contact?.Name || '');
    console.log(`  ${inv?.Contact?.Name?.slice(0, 22).padEnd(22)} $${inv?.Total} ${inv?.Status} — ${v.note}`);
    if (!ok) { console.log(`     ⏭ SKIP — state not the expected AUTHORISED/$${v.total}/unpaid match`); skipped++; continue; }
    if (!APPLY) { voided++; continue; }
    revert.push(inv);
    const pr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${v.id}`, { method: 'POST', headers: xh(token), body: JSON.stringify({ Invoices: [{ InvoiceID: v.id, Status: 'VOIDED' }] }) });
    if (pr.ok) { voided++; await supabase.from('xero_invoices').update({ status: 'VOIDED', updated_at: new Date().toISOString() }).eq('xero_id', v.id); console.log(`     ✓ VOIDED`); }
    else { failed++; console.log(`     ✗ VOID ${pr.status}: ${parseErr(await pr.text())}`); }
  }

  console.log(`\n  ${APPLY ? `voided=${voided} skipped=${skipped} failed=${failed}` : `would void=${voided} skipped=${skipped} (dry run)`}`);
  if (APPLY && revert.length) { mkdirSync('scripts/output', { recursive: true }); const f = `scripts/output/void-429-dups-revert-${Date.now()}.json`; writeFileSync(f, JSON.stringify(revert, null, 2)); console.log(`  revert log: ${f}\n`); }
}
main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
