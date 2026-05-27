#!/usr/bin/env node
/**
 * Audience segmentation for the ACT communication pipeline.
 *
 * Computes which audience(s) each GHL contact belongs to — funder, partner,
 * brand, storyteller — from their pipelines, flags and tags, then writes
 * canonical `audience-*` tags to GHL. Those tags ARE the recipient lists the
 * newsletter/social system sends to.
 *
 * Rules live in config/audience-segments.json (data-driven; tune without code).
 * Closes the open item from plan act-communication-pipeline-2026-05-23-locked:
 * "which GHL lists/tags map to each audience".
 *
 * Membership signals per audience (any match qualifies):
 *   - pipelines: contact has an open/any opp in one of these pipeline_names
 *   - flags: a boolean column on ghl_contacts (e.g. is_storyteller)
 *   - tagPatterns: a case-insensitive substring of any existing tag
 *   - wonOpportunityWithValue: contact has a won opp with monetary_value > 0
 *   - requiresNewsletterConsent: newsletter_consent=true is the signal (brand)
 * Gate: requiresNewsletterConsent=true AND consent=false → excluded from that audience.
 * Unsubscribed contacts (newsletter_unsubscribed_at set) → excluded from ALL audiences.
 *
 * Usage:
 *   node scripts/assign-audience-segments.mjs                 # dry-run report (default, no writes)
 *   node scripts/assign-audience-segments.mjs --apply         # push audience-* tags to GHL
 *   node scripts/assign-audience-segments.mjs --limit 50      # process N contacts only
 *   node scripts/assign-audience-segments.mjs --verbose       # show per-contact detail
 *
 * Env: SUPABASE_SHARED_URL/SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL ·
 *      SUPABASE_SHARED_SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE_KEY ·
 *      GHL_PRIVATE_TOKEN or GHL_API_KEY · GHL_LOCATION_ID (only needed for --apply)
 */

import '../lib/load-env.mjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const VERBOSE = args.has('--verbose');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX > -1 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : null;

const SUPABASE_URL =
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env vars (SUPABASE_SHARED_URL / SUPABASE_SHARED_SERVICE_ROLE_KEY).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const config = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'audience-segments.json'), 'utf8'));
const PREFIX = config.tagPrefix || 'audience-';
const RESPECT_UNSUB = config.rules?.respectUnsubscribe !== false;
const AUDIENCES = config.audiences;

const norm = (s) => (s || '').toString().toLowerCase().trim();

// ── Load all contacts (paginate past the 1000-row default) ──────────────
async function loadContacts() {
  const rows = [];
  const page = 1000;
  for (let offset = 0; ; offset += page) {
    const { data, error } = await supabase
      .from('ghl_contacts')
      .select('id, ghl_id, full_name, email, tags, is_storyteller, newsletter_consent, newsletter_unsubscribed_at')
      .order('id', { ascending: true })
      .range(offset, offset + page - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < page) break;
    if (LIMIT && rows.length >= LIMIT) break;
  }
  return LIMIT ? rows.slice(0, LIMIT) : rows;
}

// ── Load opportunities → map ghl_contact_id → { pipelines:Set, hasWonValue } ─
async function loadOppIndex() {
  const index = new Map();
  const page = 1000;
  for (let offset = 0; ; offset += page) {
    const { data, error } = await supabase
      .from('ghl_opportunities')
      .select('ghl_contact_id, pipeline_name, status, monetary_value')
      .order('ghl_contact_id', { ascending: true })
      .range(offset, offset + page - 1);
    if (error) throw error;
    for (const o of data) {
      if (!o.ghl_contact_id) continue;
      let e = index.get(o.ghl_contact_id);
      if (!e) {
        e = { pipelines: new Set(), hasWonValue: false };
        index.set(o.ghl_contact_id, e);
      }
      if (o.pipeline_name) e.pipelines.add(norm(o.pipeline_name));
      if (norm(o.status) === 'won' && Number(o.monetary_value) > 0) e.hasWonValue = true;
    }
    if (data.length < page) break;
  }
  return index;
}

// ── Decide a contact's audiences ────────────────────────────────────────
function audiencesFor(contact, opp) {
  if (RESPECT_UNSUB && contact.newsletter_unsubscribed_at) return [];
  const tags = (contact.tags || []).map(norm);
  const pipelines = opp ? opp.pipelines : new Set();
  const result = [];

  for (const [key, a] of Object.entries(AUDIENCES)) {
    // hard consent gate
    if (a.requiresNewsletterConsent && contact.newsletter_consent !== true) continue;

    let signal = false;
    if (a.requiresNewsletterConsent && contact.newsletter_consent === true) signal = true;
    if (!signal && Array.isArray(a.flags)) {
      for (const f of a.flags) if (contact[f] === true) signal = true;
    }
    if (!signal && Array.isArray(a.pipelines)) {
      for (const p of a.pipelines) if (pipelines.has(norm(p))) signal = true;
    }
    if (!signal && Array.isArray(a.tagPatterns)) {
      for (const pat of a.tagPatterns) if (tags.some((t) => t.includes(norm(pat)))) signal = true;
    }
    if (!signal && a.wonOpportunityWithValue && opp?.hasWonValue) signal = true;

    if (signal) result.push(key);
  }
  return result;
}

// ── Main ────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n🎯 Audience segmentation — ${APPLY ? 'APPLY (writing tags to GHL)' : 'DRY-RUN (no writes)'}`);
  console.log(`   config v${config.version} · ${Object.keys(AUDIENCES).length} audiences · prefix "${PREFIX}"\n`);

  const [contacts, oppIndex] = await Promise.all([loadContacts(), loadOppIndex()]);
  console.log(`Loaded ${contacts.length} contacts · ${oppIndex.size} contacts with opportunities\n`);

  const counts = Object.fromEntries(Object.keys(AUDIENCES).map((k) => [k, 0]));
  const sizeDist = {}; // number-of-audiences → count
  let noAudience = 0;
  const plan = []; // { contact, target:Set, add:[], remove:[] }

  for (const c of contacts) {
    const auds = audiencesFor(c, oppIndex.get(c.ghl_id));
    for (const a of auds) counts[a]++;
    sizeDist[auds.length] = (sizeDist[auds.length] || 0) + 1;
    if (auds.length === 0) noAudience++;

    const targetTags = new Set(auds.map((k) => AUDIENCES[k].tag));
    const existingAudienceTags = (c.tags || []).filter((t) => norm(t).startsWith(norm(PREFIX)));
    const add = [...targetTags].filter((t) => !existingAudienceTags.map(norm).includes(norm(t)));
    const remove = existingAudienceTags.filter((t) => !targetTags.has(t));
    if (add.length || remove.length) plan.push({ contact: c, add, remove });
  }

  // Report
  console.log('Audience membership:');
  for (const [k, a] of Object.entries(AUDIENCES)) {
    const pct = ((counts[k] / contacts.length) * 100).toFixed(1);
    console.log(`  ${a.tag.padEnd(22)} ${String(counts[k]).padStart(5)}  (${pct}%)  — ${a.label}`);
  }
  console.log(`\nAudiences per contact:`);
  for (const n of Object.keys(sizeDist).sort()) {
    console.log(`  ${n} audience(s): ${sizeDist[n]}`);
  }
  console.log(`  → ${noAudience} contacts in no audience (not on any send list yet)`);

  console.log(`\nTag changes needed: ${plan.length} contacts`);
  const totalAdd = plan.reduce((s, p) => s + p.add.length, 0);
  const totalRemove = plan.reduce((s, p) => s + p.remove.length, 0);
  console.log(`  ${totalAdd} tag adds · ${totalRemove} tag removes`);

  if (VERBOSE) {
    for (const p of plan.slice(0, 30)) {
      const id = p.contact.full_name || p.contact.email || p.contact.ghl_id;
      console.log(`  • ${id}: +[${p.add.join(', ')}]${p.remove.length ? ` -[${p.remove.join(', ')}]` : ''}`);
    }
    if (plan.length > 30) console.log(`  …and ${plan.length - 30} more`);
  }

  if (!APPLY) {
    console.log(`\nDry-run only. Re-run with --apply to write these audience-* tags to GHL.`);
    console.log(`(--apply performs ${totalAdd + totalRemove} GHL writes — a shared-state bulk operation.)\n`);
    return;
  }

  // Apply: push audience-* tags to GHL (add then remove, within the audience-* namespace only)
  const ghl = createGHLService();
  let applied = 0;
  let skippedNoId = 0;
  let errors = 0;
  for (const p of plan) {
    if (!p.contact.ghl_id) {
      skippedNoId++;
      continue;
    }
    try {
      for (const t of p.add) await ghl.addTagToContact(p.contact.ghl_id, t);
      for (const t of p.remove) await ghl.removeTagFromContact(p.contact.ghl_id, t);
      applied++;
      if (applied % 50 === 0) console.log(`  …${applied}/${plan.length} contacts updated`);
    } catch (e) {
      errors++;
      console.error(`  ✗ ${p.contact.ghl_id}: ${e.message}`);
    }
  }
  console.log(`\n✅ Applied to ${applied} contacts · ${skippedNoId} skipped (no ghl_id) · ${errors} errors\n`);
})().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
