#!/usr/bin/env node
/**
 * contained-ghl-ids-probe.mjs — READ-ONLY. Prints the GHL IDs the 16 Jun session
 * needs to wire CONTAINED Phase D into JusticeHub.
 *
 * No --apply, no writes, ever (GET only). Safe to run any time, including before the
 * pipeline/calendar exist (it just reports them as "not found yet"). Run it again AFTER
 * creating the pipeline + calendar in the GHL UI to capture their IDs.
 *
 * It surfaces:
 *   - every opportunity pipeline + stage IDs (so you can map partner/funder + the campaign
 *     lifecycle pipeline),
 *   - every calendar (id + booking link) — find "CONTAINED Adelaide Walkthroughs",
 *   - the CONTAINED custom field IDs (cohort, slot_confirmed, newsletter_consent),
 * then prints a paste-ready JusticeHub Vercel env block.
 *
 * DESIGN FLAG: JusticeHub's host/connect routes open opportunities in SEPARATE
 * GHL_PARTNER_PIPELINE_ID / GHL_FUNDER_PIPELINE_ID, while the campaign config defines one
 * participant-journey pipeline ("CONTAINED Adelaide 2026", Captured->Booked->Experienced).
 * Decide whether partner/funder deals reuse an existing ACT pipeline or get their own — the
 * full pipeline list below is to make that choice.
 *
 * USAGE:
 *   node scripts/contained-ghl-ids-probe.mjs
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
await import(join(HERE, '../lib/load-env.mjs'));

const KEY = process.env.GHL_API_KEY || process.env.GHL_PRIVATE_TOKEN;
const LOC = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;
const BASE = 'https://services.leadconnectorhq.com';
const H = { Authorization: `Bearer ${KEY}`, Version: '2021-07-28', 'Content-Type': 'application/json', Accept: 'application/json' };

if (!KEY || !LOC) {
  console.error('Missing GHL_API_KEY / GHL_LOCATION_ID in .env.local (or .env). Aborting.');
  process.exit(1);
}

const PIPELINE_NAME = 'CONTAINED Adelaide 2026';
const CALENDAR_NAME = 'CONTAINED Adelaide Walkthroughs';
const FIELD_KEYS = ['cohort', 'slot_confirmed', 'newsletter_consent'];

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: H });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

const keyOf = (f) => (f.fieldKey || '').replace(/^contact\./, '');

async function main() {
  console.log(`\nCONTAINED GHL IDs probe (READ-ONLY) — location ${LOC}\n`);

  // ── Pipelines ──────────────────────────────────────────────────────────
  console.log('PIPELINES');
  const pipelines = (await get(`/opportunities/pipelines?locationId=${LOC}`)).pipelines || [];
  let campaignPipeline = null;
  let bookedStageId = '';
  for (const p of pipelines) {
    const isCampaign = p.name === PIPELINE_NAME;
    if (isCampaign) campaignPipeline = p;
    console.log(`  ${isCampaign ? '➤' : ' '} ${p.name}  id=${p.id}`);
    for (const s of p.stages || []) {
      if (isCampaign && /^booked$/i.test(s.name)) bookedStageId = s.id;
      console.log(`        stage: ${String(s.name).padEnd(22)} id=${s.id}`);
    }
  }
  if (!campaignPipeline) console.log(`  (no pipeline named "${PIPELINE_NAME}" yet — create it in the GHL UI, then re-run)`);

  // ── Calendars ──────────────────────────────────────────────────────────
  console.log('\nCALENDARS');
  let calendar = null;
  try {
    const calendars = (await get(`/calendars/?locationId=${LOC}`)).calendars || [];
    for (const c of calendars) {
      const isWalk = c.name === CALENDAR_NAME;
      if (isWalk) calendar = c;
      const link = c.slug ? `https://api.leadconnectorhq.com/widget/booking/${c.slug}` : `(grab the public Permalink from the GHL calendar UI)`;
      console.log(`  ${isWalk ? '➤' : ' '} ${c.name}  id=${c.id}  ${link}`);
    }
    if (!calendar) console.log(`  (no calendar named "${CALENDAR_NAME}" yet — create it in the GHL UI, then re-run)`);
  } catch (e) {
    console.log(`  (could not list calendars: ${e.message})`);
  }

  // ── Custom fields ──────────────────────────────────────────────────────
  console.log('\nCUSTOM FIELDS');
  const fields = (await get(`/locations/${LOC}/customFields`)).customFields || [];
  const byKey = new Map(fields.map((f) => [keyOf(f), f]));
  const fieldIds = {};
  for (const k of FIELD_KEYS) {
    const f = byKey.get(k);
    fieldIds[k] = f?.id || '';
    console.log(`  ${f ? '✓' : '✗'} ${k.padEnd(18)} ${f ? `id=${f.id}` : '(not created yet — run contained-ghl-custom-fields.mjs --apply)'}`);
  }

  // ── JusticeHub Vercel env block ────────────────────────────────────────
  console.log('\n────────────────────────────────────────────────────────────');
  console.log('JusticeHub Vercel env (paste once the IDs above are filled in):');
  console.log('────────────────────────────────────────────────────────────');
  const calLink = calendar?.slug ? `https://api.leadconnectorhq.com/widget/booking/${calendar.slug}` : '<public booking permalink from GHL UI>';
  console.log(`# Opportunity pipelines for host/connect routes — MAP THESE (see DESIGN FLAG in header):`);
  console.log(`GHL_PARTNER_PIPELINE_ID=${campaignPipeline?.id || '<pick a pipeline id from the list above>'}`);
  console.log(`GHL_PARTNER_STAGE_NEW=${campaignPipeline?.stages?.[0]?.id || '<first-stage id of the chosen pipeline>'}`);
  console.log(`GHL_FUNDER_PIPELINE_ID=<pick a pipeline id from the list above>`);
  console.log(`GHL_FUNDER_STAGE_NEW=<first-stage id of the chosen pipeline>`);
  console.log(`# Native booking calendar (RC4) — un-gates the register CTA from JH PR #44:`);
  console.log(`NEXT_PUBLIC_GHL_CONTAINED_CALENDAR_URL=${calLink}`);
  if (bookedStageId) console.log(`# (calendar on_booking_confirmed -> move opportunity to "Booked" stage id=${bookedStageId})`);
  console.log('');
}

main().catch((e) => { console.error('\nFAILED:', e.message); process.exit(1); });
