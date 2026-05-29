#!/usr/bin/env node
/**
 * Apply the two safe Goods (ACT-GD) bookkeeper corrections to Xero.
 *
 * SAFE BY DESIGN:
 *  - DRY RUN by default. Pass --apply to write.
 *  - GETs each bill fresh from Xero before acting; aborts the op if the live
 *    state isn't exactly what we expect (AUTHORISED + AmountPaid 0).
 *  - Writes before-state to scripts/output/goods-bookkeeper-revert-<ts>.json.
 *  - Does NOT touch the 35 AUTHORISED match bills — those are a bank-reconcile
 *    job for the Xero UI (Find & Match), not an API write (double-pay risk).
 *
 * Ops:
 *   1. VOID  Carla Furnishers duplicate $11,180  (42960d4f… — no-attach Dext junk)
 *   2. RECODE 1300 Washer $13,980 (c3d5dd2a…): line acct 429→446,
 *      Project Tracking "ACT-FM — The Farm" → "ACT-GD — Goods", desc ACT-FM→ACT-GD
 *
 * Usage:
 *   node scripts/apply-goods-bookkeeper-corrections.mjs            # dry run
 *   node scripts/apply-goods-bookkeeper-corrections.mjs --apply    # write
 */
import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';

const APPLY = process.argv.includes('--apply');
const SUPA_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPA_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPA_URL, SUPA_KEY);
const TENANT = process.env.XERO_TENANT_ID;

const CARLA_VOID = '42960d4f-49e3-4f9a-a378-af8fde24704c';
const WASHER      = 'c3d5dd2a-98e9-4261-81aa-18e57ec86109';
const ACCT_FROM = '429', ACCT_TO = '446';
const TRK_CAT = 'Project Tracking', TRK_FROM = 'ACT-FM — The Farm', TRK_TO = 'ACT-GD — Goods';

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
  await supabase.from('xero_tokens').upsert({ id: 'default', refresh_token: t.refresh_token, access_token: t.access_token, expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString(), updated_by: 'goods-bookkeeper' }, { onConflict: 'id' });
  return t.access_token;
}
const xh = (token) => ({ Authorization: `Bearer ${token}`, 'xero-tenant-id': TENANT, Accept: 'application/json', 'Content-Type': 'application/json' });

async function getInvoice(token, id) {
  const gr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${id}`, { headers: xh(token) });
  if (!gr.ok) throw new Error(`GET ${id} → ${gr.status}: ${(await gr.text()).slice(0, 200)}`);
  return (await gr.json()).Invoices?.[0];
}
function postErr(txt) { try { const j = JSON.parse(txt); const el = j.Elements?.[0]; const ve = (el?.ValidationErrors || []).concat((el?.LineItems || []).flatMap(l => l.ValidationErrors || [])); return ve.length ? ve.map(v => v.Message).join(' | ') : JSON.stringify(el).slice(0, 300); } catch { return txt.slice(0, 300); } }

async function main() {
  if (!TENANT) throw new Error('XERO_TENANT_ID not set');
  console.log(`\n=== Goods bookkeeper corrections ${APPLY ? '*** APPLY ***' : '(DRY RUN — no writes)'} ===\n`);
  const token = await getAccessToken();
  const revert = [];

  // ---- OP 1: VOID Carla duplicate ----
  const carla = await getInvoice(token, CARLA_VOID);
  console.log(`OP1 VOID  ${carla.Contact?.Name} $${carla.Total} | ${carla.Status} | Paid $${carla.AmountPaid} | attach=${carla.HasAttachments}`);
  const carlaOk = carla.Status === 'AUTHORISED' && Number(carla.AmountPaid) === 0;
  if (!carlaOk) { console.log(`     ✗ ABORT op1: not AUTHORISED/$0-paid (got ${carla.Status}/$${carla.AmountPaid})`); }
  else if (carla.HasAttachments) { console.log(`     ✗ ABORT op1: target has an attachment — wrong twin? expected the no-attach copy`); }
  else {
    console.log(`     → set Status VOIDED`);
    if (APPLY) {
      revert.push({ op: 'void', invoiceID: CARLA_VOID, before: { Status: carla.Status } });
      const pr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${CARLA_VOID}`, { method: 'POST', headers: xh(token), body: JSON.stringify({ Invoices: [{ InvoiceID: CARLA_VOID, Status: 'VOIDED' }] }) });
      if (pr.ok) console.log(`     ✓ VOIDED`);
      else console.log(`     ✗ POST ${pr.status}: ${postErr(await pr.text())}`);
    }
  }

  console.log('');
  await new Promise(r => setTimeout(r, 2500));

  // ---- OP 2: RECODE 1300 Washer ----
  const w = await getInvoice(token, WASHER);
  console.log(`OP2 RECODE ${w.Contact?.Name} $${w.Total} | ${w.Status} | Paid $${w.AmountPaid}`);
  const wOk = w.Status === 'AUTHORISED' && Number(w.AmountPaid) === 0;
  if (!wOk) { console.log(`     ✗ ABORT op2: not AUTHORISED/$0-paid (got ${w.Status}/$${w.AmountPaid})`); }
  else {
    const lines = w.LineItems || [];
    const target = lines.filter(li => String(li.AccountCode) === ACCT_FROM);
    if (!target.length) { console.log(`     ✗ ABORT op2: no line on acct ${ACCT_FROM} (already recoded?)`); }
    else {
      const updatedLines = lines.map(li => {
        const base = { LineItemID: li.LineItemID, Description: li.Description, Quantity: li.Quantity, UnitAmount: li.UnitAmount, LineAmount: li.LineAmount, TaxType: li.TaxType, AccountCode: li.AccountCode, Tracking: (li.Tracking || []).map(t => ({ Name: t.Name, Option: t.Option })) };
        if (String(li.AccountCode) === ACCT_FROM) {
          base.AccountCode = ACCT_TO;
          base.Tracking = base.Tracking.map(t => (t.Name === TRK_CAT && t.Option === TRK_FROM) ? { Name: TRK_CAT, Option: TRK_TO } : t);
          if (typeof base.Description === 'string') base.Description = base.Description.replace(/ACT-FM/g, 'ACT-GD');
        }
        return base;
      });
      for (const li of target) {
        const trk = (li.Tracking || []).map(t => `${t.Name}=${t.Option}`).join(', ');
        console.log(`     line $${li.LineAmount}: acct ${ACCT_FROM}→${ACCT_TO} | tracking [${trk}] → ${TRK_CAT}=${TRK_TO}`);
      }
      if (APPLY) {
        revert.push({ op: 'recode', invoiceID: WASHER, before: lines.map(li => ({ LineItemID: li.LineItemID, AccountCode: li.AccountCode, Description: li.Description, Tracking: li.Tracking })) });
        const pr = await fetch(`https://api.xero.com/api.xro/2.0/Invoices/${WASHER}`, { method: 'POST', headers: xh(token), body: JSON.stringify({ Invoices: [{ InvoiceID: WASHER, LineItems: updatedLines }] }) });
        if (pr.ok) console.log(`     ✓ RECODED`);
        else console.log(`     ✗ POST ${pr.status}: ${postErr(await pr.text())}`);
      }
    }
  }

  if (APPLY && revert.length) {
    mkdirSync('scripts/output', { recursive: true });
    const f = `scripts/output/goods-bookkeeper-revert-${Date.now()}.json`;
    writeFileSync(f, JSON.stringify(revert, null, 2));
    console.log(`\n  revert log: ${f}`);
  }
  console.log(`\n  ${APPLY ? 'done' : '(dry run — nothing written; re-run with --apply to write)'}\n`);
}
main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
