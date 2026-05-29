#!/usr/bin/env node
/**
 * Void the 26 confirmed duplicate AUTHORISED bills from the 2026-05-29
 * duplicate-void worklist (Ben approved "void all 26", $71,191.75).
 *
 * SAFE BY DESIGN (mirrors apply-goods-bookkeeper-corrections.mjs):
 *  - DRY RUN by default. Pass --apply to write.
 *  - GETs each bill fresh from Xero; SKIPS any that isn't AUTHORISED + AmountPaid 0
 *    (logs the reason, never voids an unexpected state).
 *  - Writes FULL before-state of every voided bill to the revert log
 *    (voids are NOT API-reversible — recovery = re-create from this JSON).
 *  - Per-invoice try/catch: one rejection (locked period / credit note) does
 *    not halt the batch.
 *  - On --apply, mirrors Status→VOIDED into the app DB (NEXT_PUBLIC) so the
 *    mirror/finance pages reflect it without waiting for the next Xero sync.
 *
 * HELD BACK (NOT in this list — confirmed not dups this session):
 *   Kirmos INV-004 $4,500 (genuinely owed) · Google $67.98 · Dialpad $56 ·
 *   Kennards $244 (recurring subs / separate hire).
 *
 * Usage:
 *   node scripts/void-duplicate-bills-2026-05-29.mjs           # dry run / preflight
 *   node scripts/void-duplicate-bills-2026-05-29.mjs --apply    # void for real
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const SUPA_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPA_URL, SUPA_KEY);
const appDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const TENANT = process.env.XERO_TENANT_ID;

// The 26 approved voids: confidence · vendor · amount · InvoiceID
const VOIDS = [
  // 🔴 exact-invoice-# (2)
  ['🔴', 'HighLevel',               137.27,   'c108669b-f8ed-4b9b-a410-c2a0d71bff2f'],
  ['🔴', 'Booking.com',             89.00,    'c41d3789-e0d4-4dee-b9be-ed0f3ae45192'],
  // 🟠 same/next-day no-# shadows (16)
  ['🟠', 'Telford Smith',           19800.00, 'f47c47b4-8df4-4b04-8dea-5476f913ab67'],
  ['🟠', 'Centre Canvas',           10285.00, '993dd389-f8ca-4ba0-9109-12eb5da17d0e'],
  ['🟠', 'Matnic Trust',            6441.74,  'a2a542fe-c6dc-4c47-ab9d-9b7f13fae33f'],
  ['🟠', 'Oonchiumpa',              5940.00,  'aac157a9-5517-4053-b074-6084ca63b3fe'],
  ['🟠', 'Sophie Hickey',           4950.00,  'bb3da03e-6534-477f-bffb-3b46431fe405'],
  ['🟠', 'Airbnb',                  4621.18,  '07b3769d-b355-426c-b02d-7ae3f954ebd9'],
  ['🟠', 'Joseph Kirmos (no #)',    4500.00,  '99e9f3dd-7f76-4aaf-b546-847fcc20924f'],
  ['🟠', 'Matnic Trust',            2826.92,  '0338c916-297b-479c-a83a-381848c49fc9'],
  ['🟠', 'TNT Plastering',          2000.00,  '18534bcf-f6ae-4a3c-aafe-7f55ccfb917d'],
  ['🟠', 'Bunnings',                1597.00,  '6db66932-ff38-476f-8c4e-e28b182f9017'],
  ['🟠', 'Hayden Alexander',        1505.62,  '0b998d79-907f-49bf-a7de-72092aa36451'],
  ['🟠', 'Sophie Hickey',           1140.00,  '0f55cedb-b565-46b3-8fe2-b8686d8492c4'],
  ['🟠', 'Clearview Towing',        768.83,   '6bdfea19-e181-4b84-a719-3cbfb6e16676'],
  ['🟠', 'Izzy Mobile',             671.90,   'a0df1ad7-d4e6-4fb6-994d-2e395c77aeaf'],
  ['🟠', 'Salin Appliance',         228.90,   '74698641-4592-4afa-9c34-9662754e34a3'],
  ['🟠', 'WizBang',                 82.17,    'bf39c61b-aff3-4390-a8ae-93ffaab79100'],
  // 🟡 walked-and-confirmed dups (8)
  ['🟡', 'Bunnings (diff acct)',    1199.80,  'f17812a9-4e07-4492-b587-7e9ad11bdd99'],
  ['🟡', 'Palm Island Motel',       514.00,   '503b4d00-d757-4fec-a858-f66fb8c07d0e'],
  ['🟡', 'Maleny Hardware',         497.48,   'adc8c86f-9baf-4a53-a597-3c11df96a66b'],
  ['🟡', 'Maleny Hardware',         423.75,   'db9b2797-54a8-4511-8ef5-3f69c3a88622'],
  ['🟡', 'Repco',                   384.00,   '4912fa8d-2030-4153-a80c-db48ce4b30b1'],
  ['🟡', 'Maleny Hardware',         285.20,   '0d240fbf-89c4-43a0-8aff-00704b615815'],
  ['🟡', 'Virgin Australia',        202.00,   '27c08325-0ec5-4d53-87f0-71095969fa63'],
  ['🟡', 'Apple',                   99.99,    '0df8f163-b479-433f-92bc-c242110e1c51'],
];

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
  await supabase.from('xero_tokens').upsert({ id: 'default', refresh_token: t.refresh_token, access_token: t.access_token, expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString(), updated_by: 'void-dups-2026-05-29' }, { onConflict: 'id' });
  return t.access_token;
}
const xh = (token) => ({ Authorization: `Bearer ${token}`, 'xero-tenant-id': TENANT, Accept: 'application/json', 'Content-Type': 'application/json' });

async function getInvoice(token, id) {
  const gr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${id}`, { headers: xh(token) });
  if (!gr.ok) throw new Error(`GET ${gr.status}: ${(await gr.text()).slice(0, 160)}`);
  return (await gr.json()).Invoices?.[0];
}
function postErr(txt) { try { const j = JSON.parse(txt); const el = j.Elements?.[0]; const ve = (el?.ValidationErrors || []); return ve.length ? ve.map(v => v.Message).join(' | ') : JSON.stringify(j).slice(0, 240); } catch { return txt.slice(0, 240); } }

async function main() {
  if (!TENANT) throw new Error('XERO_TENANT_ID not set');
  console.log(`\n=== Void duplicate bills (2026-05-29) ${APPLY ? '*** APPLY ***' : '(DRY RUN — no writes)'} ===`);
  console.log(`    ${VOIDS.length} bills · $${VOIDS.reduce((s, v) => s + v[2], 0).toFixed(2)} expected\n`);
  const token = await getAccessToken();

  const revert = [];
  let voided = 0, voidedSum = 0, skipped = 0, failed = 0;
  const skippedRows = [], failedRows = [];

  for (const [conf, vendor, amt, id] of VOIDS) {
    let inv;
    try { inv = await getInvoice(token, id); }
    catch (e) { console.log(`${conf} ${vendor.padEnd(22)} $${amt.toFixed(2).padStart(10)}  ✗ FETCH ${e.message}`); failed++; failedRows.push([vendor, amt, e.message]); await sleep(); continue; }

    const ok = inv?.Status === 'AUTHORISED' && Number(inv.AmountPaid) === 0;
    const tag = `${conf} ${vendor.padEnd(22)} $${amt.toFixed(2).padStart(10)}`;
    if (!ok) {
      console.log(`${tag}  ⤼ SKIP (live=${inv?.Status}/paid $${inv?.AmountPaid})`);
      skipped++; skippedRows.push([vendor, amt, `${inv?.Status}/paid ${inv?.AmountPaid}`]); await sleep(); continue;
    }
    if (Math.abs(Number(inv.Total) - amt) > 0.005) {
      console.log(`${tag}  ⤼ SKIP (amount drift: live $${inv.Total} ≠ worklist $${amt})`);
      skipped++; skippedRows.push([vendor, amt, `amount ${inv.Total}`]); await sleep(); continue;
    }

    if (!APPLY) { console.log(`${tag}  → would VOID (live AUTHORISED $${inv.Total}, #${inv.InvoiceNumber || 'none'})`); await sleep(); continue; }

    // capture FULL before-state for re-creation, then void
    revert.push({ invoiceID: id, vendor, before: inv });
    try {
      const pr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${id}`, { method: 'POST', headers: xh(token), body: JSON.stringify({ Invoices: [{ InvoiceID: id, Status: 'VOIDED' }] }) });
      const body = await pr.text();
      if (pr.ok && JSON.parse(body).Invoices?.[0]?.Status === 'VOIDED') {
        console.log(`${tag}  ✓ VOIDED`);
        voided++; voidedSum += amt;
        await appDb.from('xero_invoices').update({ status: 'VOIDED' }).eq('xero_id', id);
      } else {
        console.log(`${tag}  ✗ POST ${pr.status}: ${postErr(body)}`);
        failed++; failedRows.push([vendor, amt, `POST ${pr.status}`]);
      }
    } catch (e) {
      console.log(`${tag}  ✗ ${e.message}`); failed++; failedRows.push([vendor, amt, e.message]);
    }
    await sleep();
  }

  if (APPLY && revert.length) {
    mkdirSync('scripts/output', { recursive: true });
    const f = `scripts/output/void-dups-revert-${Date.now()}.json`;
    writeFileSync(f, JSON.stringify(revert, null, 2));
    console.log(`\n  revert log (full before-state for re-creation): ${f}`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`  ${APPLY ? 'VOIDED' : 'would void'}: ${APPLY ? voided : VOIDS.length - skipped - failed} bills${APPLY ? ` · $${voidedSum.toFixed(2)}` : ''}`);
  if (skipped) console.log(`  skipped (state changed): ${skipped} — ${skippedRows.map(r => `${r[0]} $${r[1]} [${r[2]}]`).join(', ')}`);
  if (failed) console.log(`  failed: ${failed} — ${failedRows.map(r => `${r[0]} $${r[1]} [${r[2]}]`).join(', ')}`);
  console.log(`\n  ${APPLY ? 'done' : '(dry run — re-run with --apply to void)'}\n`);
}
function sleep() { return new Promise(r => setTimeout(r, 1300)); }
main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
