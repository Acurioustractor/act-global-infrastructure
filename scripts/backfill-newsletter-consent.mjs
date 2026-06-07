#!/usr/bin/env node
/**
 * backfill-newsletter-consent.mjs — DRY-RUN DEFAULT.
 *
 * PROBLEM: ~213 GHL contacts sit on a `comms:*-newsletter` tag with NO
 * newsletter_consent recorded. Many ARE genuine opt-ins — the live GHL `source`
 * field proves it (e.g. "Harvest | Member Signup"). The old signup forms never
 * wrote the consent custom field. We BACKFILL consent where the live GHL source
 * evidences an opt-in, sourced to that exact event — we do NOT fabricate it.
 *
 * The ghl_contacts Supabase MIRROR does NOT carry the real GHL source (its
 * `source` column is the sync's own provenance, e.g. "gmail_auto"). The real
 * source lives ONLY on the live GHL contact record — so this script reads LIVE
 * from GHL per contact (one read per contact, sequential, rate-limited).
 *
 * Supabase is used ONLY to build the worklist of ghl_ids to check.
 *
 * Usage:
 *   node scripts/backfill-newsletter-consent.mjs           # DRY RUN (default) — writes nothing to GHL
 *   node scripts/backfill-newsletter-consent.mjs --apply   # write consent to OPT-IN set (DO NOT run blindly)
 *
 * DRY RUN: reads Supabase worklist + reads each live GHL contact, classifies,
 *          and writes ONLY the worksheet markdown. Writes NOTHING to GHL.
 * APPLY:   additionally writes the 3 consent custom-fields to each OPT-IN contact.
 *
 * Output worksheet: thoughts/shared/reviews/newsletter-consent-backfill-worksheet-2026-06-08.md
 */

import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

dotenv.config({ path: '.env.local', quiet: true });

// ── flags ────────────────────────────────────────────────────────────────
const APPLY = process.argv.includes('--apply');

// ── config ───────────────────────────────────────────────────────────────
const WORKSHEET = 'thoughts/shared/reviews/newsletter-consent-backfill-worksheet-2026-06-08.md';

const NEWSLETTER_TAGS = [
  'comms:act-newsletter',
  'comms:goods-newsletter',
  'comms:harvest-newsletter',
  'comms:justicehub-newsletter',
  'newsletter',
  'goods-newsletter',
];
// Map a newsletter tag to a friendly list label for the per-list breakdown.
const LIST_LABEL = {
  'comms:act-newsletter': 'ACT',
  'comms:goods-newsletter': 'Goods',
  'goods-newsletter': 'Goods',
  'comms:harvest-newsletter': 'Harvest',
  'comms:justicehub-newsletter': 'JusticeHub',
  'newsletter': 'Generic',
};
const LISTS = ['ACT', 'Goods', 'Harvest', 'JusticeHub', 'Generic'];

// Consent custom-field IDs (GHL location custom fields).
const CONSENT_FIELD_ID = 'aVnqmajnysMtGYhLD0oA';      // newsletter_consent → 'Yes'
const CONSENT_SOURCE_FIELD_ID = 'HdnMUyXkZRPZG7l7cygG'; // Consent Source → live GHL source string
const CONSENT_TS_FIELD_ID = 'Z1E4OJl7lf8kWbJGASDM';     // Consent Timestamp → dateAdded as ISO 'YYYY-MM-DD'

// Classification regexes.
const OPTIN_RE = /member signup|newsletter|subscribe|act-regenerative-studio|website.?form/i;
const NOT_OPTIN_RE = /import|xero|gmail|migrat|csv|api|^ghl$/i;

// Timing.
const GHL_SLEEP_MS = 1100;     // ~60 req/min ceiling
const GHL_429_BACKOFF_MS = 5000;
const DB_BACKOFF_MS = 30000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── supabase ───────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── helpers ──────────────────────────────────────────────────────────────

/** True if the mirror row already records consent (native bool OR consent custom-field === Yes). */
function mirrorHasConsent(row) {
  if (row.newsletter_consent === true) return true;
  if (typeof row.newsletter_consent === 'string' && row.newsletter_consent.toLowerCase() === 'yes') return true;
  // custom_fields jsonb is index-keyed: {"0":{"id":"...","value":"..."}, ...}
  for (const entry of customFieldEntries(row.custom_fields)) {
    if (entry.id === CONSENT_FIELD_ID && String(entry.value).toLowerCase() === 'yes') return true;
  }
  return false;
}

/** Normalise a GHL/mirror custom_fields blob into an array of {id, value}. */
function customFieldEntries(cf) {
  if (!cf) return [];
  if (Array.isArray(cf)) return cf;
  if (typeof cf === 'string') {
    try { cf = JSON.parse(cf); } catch { return []; }
  }
  if (typeof cf === 'object') return Object.values(cf).filter((e) => e && typeof e === 'object' && 'id' in e);
  return [];
}

/** Which newsletter lists is this contact on (from its tags)? */
function listsForTags(tags) {
  const lower = (tags || []).map((t) => String(t).toLowerCase());
  const labels = new Set();
  for (const t of lower) if (LIST_LABEL[t]) labels.add(LIST_LABEL[t]);
  return [...labels];
}

/** Classify a live GHL source string. */
function classifySource(source) {
  const s = (source || '').trim();
  if (!s) return 'NOT-OPT-IN'; // blank/null = not evidenced
  if (OPTIN_RE.test(s)) return 'OPT-IN';
  if (NOT_OPTIN_RE.test(s)) return 'NOT-OPT-IN';
  return 'UNKNOWN';
}

/** dateAdded → ISO 'YYYY-MM-DD' (GHL DATE fields reject epoch-ms strings). */
function isoDate(dateAdded) {
  if (!dateAdded) return '';
  const d = new Date(dateAdded);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

// ── worklist (Supabase) ──────────────────────────────────────────────────
/**
 * Pull all newsletter-tagged contacts whose mirror does NOT yet record consent.
 * Paginate 500s sequential. On DB error, back off 30s and retry once.
 */
async function fetchWorklist() {
  async function pullPage(from) {
    return supabase
      .from('ghl_contacts')
      .select('ghl_id, tags, custom_fields, newsletter_consent, full_name, email')
      .overlaps('tags', NEWSLETTER_TAGS)
      .range(from, from + 499);
  }

  const all = [];
  let from = 0;
  let retried = false;
  for (;;) {
    let { data, error } = await pullPage(from);
    if (error) {
      if (!retried) {
        console.error(`DB error: ${error.message} — backing off ${DB_BACKOFF_MS / 1000}s and retrying once...`);
        await sleep(DB_BACKOFF_MS);
        retried = true;
        ({ data, error } = await pullPage(from));
      }
      if (error) throw new Error(`Supabase worklist failed at offset ${from}: ${error.message}`);
    }
    retried = false; // reset per-page
    all.push(...data);
    if (data.length < 500) break;
    from += 500;
  }

  // Keep only no-consent rows with a real (live-readable) GHL id.
  const worklist = all.filter((r) => {
    if (mirrorHasConsent(r)) return false;
    if (!r.ghl_id || /^auto_/i.test(r.ghl_id)) return false; // gmail-auto / null ids aren't real GHL contacts
    return true;
  });
  const skippedAuto = all.filter((r) => !mirrorHasConsent(r) && (!r.ghl_id || /^auto_/i.test(r.ghl_id))).length;
  return { worklist, total: all.length, skippedAuto };
}

// ── live GHL read (one contact), with 429 retry ──────────────────────────
async function readLiveContact(ghl, ghlId) {
  try {
    return await ghl.getContactById(ghlId);
  } catch (err) {
    const msg = String(err?.message || err);
    if (/\(429\)/.test(msg) || /rate.?limit/i.test(msg)) {
      console.error(`  429 on ${ghlId} — backing off ${GHL_429_BACKOFF_MS / 1000}s and retrying once...`);
      await sleep(GHL_429_BACKOFF_MS);
      return await ghl.getContactById(ghlId); // single retry; let a second failure bubble
    }
    throw err;
  }
}

// ── --apply write (built but guarded) ────────────────────────────────────
/**
 * Write the three consent custom-fields to ONE contact. Uses the same
 * PUT /contacts/{id} { customFields:[{id, field_value}] } pattern that
 * GHLService.updateContact wraps. Only ever called when APPLY === true.
 */
async function writeConsent(ghl, ghlId, sourceStr, isoTs) {
  const customFields = [
    { id: CONSENT_FIELD_ID, field_value: 'Yes' },
    { id: CONSENT_SOURCE_FIELD_ID, field_value: sourceStr },
    { id: CONSENT_TS_FIELD_ID, field_value: isoTs },
  ];
  return ghl.updateContact(ghlId, { customFields });
}

// ── markdown worksheet ───────────────────────────────────────────────────
function buildWorksheet({ partial, checked, results, sourceErrors, total, skippedAuto }) {
  const optin = results.filter((r) => r.cls === 'OPT-IN');
  const notOptin = results.filter((r) => r.cls === 'NOT-OPT-IN');
  const unknown = results.filter((r) => r.cls === 'UNKNOWN');

  // Harvest subset of the OPT-IN set.
  const harvestOptin = optin.filter((r) => r.lists.includes('Harvest'));

  // Source distribution: distinct live source → count → classification.
  const srcMap = new Map();
  for (const r of results) {
    const key = r.source || '(blank/null)';
    if (!srcMap.has(key)) srcMap.set(key, { count: 0, cls: r.cls });
    srcMap.get(key).count++;
  }
  const srcRows = [...srcMap.entries()].sort((a, b) => b[1].count - a[1].count);

  // Per-list breakdown.
  const listStats = {};
  for (const L of LISTS) listStats[L] = { total: 0, optin: 0, notOptin: 0, unknown: 0 };
  for (const r of results) {
    for (const L of r.lists) {
      if (!listStats[L]) listStats[L] = { total: 0, optin: 0, notOptin: 0, unknown: 0 };
      listStats[L].total++;
      if (r.cls === 'OPT-IN') listStats[L].optin++;
      else if (r.cls === 'NOT-OPT-IN') listStats[L].notOptin++;
      else listStats[L].unknown++;
    }
  }

  const lines = [];
  lines.push(`# Newsletter Consent Backfill — Worksheet`);
  lines.push('');
  lines.push(`> Generated ${new Date().toISOString()} · mode: **${APPLY ? 'APPLY' : 'DRY RUN (nothing written to GHL)'}**`);
  lines.push(`> Source of truth for \`source\` = LIVE GHL contact record (the mirror does not carry it).`);
  if (partial) {
    lines.push('');
    lines.push(`## ⚠️ PARTIAL RUN`);
    lines.push(`This run did not complete all live GHL reads (GHL or DB became unreachable). Figures below cover only the ${checked} contacts read before the failure. Re-run to complete. No \`source\` value has been invented.`);
  }
  lines.push('');

  // 1. Summary
  lines.push(`## 1. Summary`);
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| Newsletter-tagged, no consent recorded (worklist, live-readable ids) | ${results.length + sourceErrors.length} |`);
  lines.push(`| Contacts checked (live GHL read OK) | ${checked} |`);
  lines.push(`| Live read errors (could not classify) | ${sourceErrors.length} |`);
  lines.push(`| **OPT-IN (backfillable)** | **${optin.length}** |`);
  lines.push(`| &nbsp;&nbsp;of which on Harvest list | ${harvestOptin.length} |`);
  lines.push(`| NOT-OPT-IN (flag, no backfill) | ${notOptin.length} |`);
  lines.push(`| UNKNOWN (Ben to rule) | ${unknown.length} |`);
  lines.push(`| Skipped (auto_/null mirror ids — not live GHL contacts) | ${skippedAuto} |`);
  lines.push('');
  lines.push(`Newsletter-tagged rows scanned in mirror (incl. already-consented): ${total}.`);
  lines.push('');

  // 2. Source distribution
  lines.push(`## 2. Source distribution (distinct live \`source\` → count → classification)`);
  lines.push('');
  lines.push(`| Live GHL source | Count | Classification |`);
  lines.push(`|---|---|---|`);
  for (const [src, { count, cls }] of srcRows) {
    lines.push(`| ${src.replace(/\|/g, '\\|')} | ${count} | ${cls} |`);
  }
  lines.push('');

  // 3. Per-list breakdown
  lines.push(`## 3. Per-list breakdown (contacts with no consent)`);
  lines.push('');
  lines.push(`| List | Total no-consent | Backfillable (OPT-IN) | Not-opt-in | Unknown |`);
  lines.push(`|---|---|---|---|---|`);
  for (const L of ['ACT', 'Goods', 'Harvest', 'JusticeHub', 'Generic']) {
    const s = listStats[L] || { total: 0, optin: 0, notOptin: 0, unknown: 0 };
    lines.push(`| ${L} | ${s.total} | ${s.optin} | ${s.notOptin} | ${s.unknown} |`);
  }
  lines.push('');
  lines.push(`_Note: a contact on more than one newsletter list is counted once per list, so list totals can exceed the worklist count._`);
  lines.push('');

  // 4. UNKNOWN list (Ben rules)
  lines.push(`## 4. UNKNOWN — Ben rules on these (${unknown.length} total, showing up to 50)`);
  lines.push('');
  if (unknown.length === 0) {
    lines.push('_None._');
  } else {
    lines.push(`| ghl_id | Live source (verbatim) | List(s) |`);
    lines.push(`|---|---|---|`);
    for (const r of unknown.slice(0, 50)) {
      lines.push(`| ${r.ghlId} | ${(r.source || '(blank/null)').replace(/\|/g, '\\|')} | ${r.lists.join(', ') || '—'} |`);
    }
    if (unknown.length > 50) lines.push('');
    if (unknown.length > 50) lines.push(`_… and ${unknown.length - 50} more UNKNOWN not shown._`);
  }
  lines.push('');

  // Read-error appendix (transparency; never invents a source)
  if (sourceErrors.length) {
    lines.push(`## Appendix — live read errors (${sourceErrors.length})`);
    lines.push('');
    lines.push(`| ghl_id | Error |`);
    lines.push(`|---|---|`);
    for (const e of sourceErrors.slice(0, 50)) {
      lines.push(`| ${e.ghlId} | ${String(e.error).replace(/\|/g, '\\|').slice(0, 120)} |`);
    }
    lines.push('');
  }

  return { md: lines.join('\n'), optin, notOptin, unknown, harvestOptin, srcRows };
}

// ── main ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== Newsletter consent backfill — ${APPLY ? 'APPLY' : 'DRY RUN'} ===\n`);

  let ghl;
  try {
    ghl = createGHLService();
  } catch (err) {
    console.error('GHL service init failed:', err.message);
    process.exit(1);
  }

  // 1) worklist
  let worklist, total, skippedAuto;
  try {
    ({ worklist, total, skippedAuto } = await fetchWorklist());
  } catch (err) {
    // DB unreachable → write a PARTIAL worksheet with nothing and exit.
    console.error('Worklist fetch failed:', err.message);
    const { md } = buildWorksheet({
      partial: true, checked: 0, results: [], sourceErrors: [], total: 0, skippedAuto: 0,
    });
    mkdirSync(dirname(WORKSHEET), { recursive: true });
    writeFileSync(WORKSHEET, md);
    console.error(`PARTIAL worksheet written → ${WORKSHEET}`);
    process.exit(1);
  }

  console.log(`Worklist: ${worklist.length} contacts to read live (mirror scanned ${total}, skipped ${skippedAuto} auto_/null ids).`);
  console.log(`Reading live GHL contacts sequentially (~${GHL_SLEEP_MS}ms each) — this takes a few minutes.\n`);

  const results = [];     // { ghlId, source, dateAdded, cls, lists, applied? }
  const sourceErrors = []; // { ghlId, error }
  let partial = false;
  let checked = 0;

  for (let i = 0; i < worklist.length; i++) {
    const row = worklist[i];
    const ghlId = row.ghl_id;
    let contact;
    try {
      contact = await readLiveContact(ghl, ghlId);
    } catch (err) {
      const msg = String(err?.message || err);
      sourceErrors.push({ ghlId, error: msg });
      // A connectivity / repeated-429 wall → stop and emit PARTIAL rather than spin.
      if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|fetch failed|\(429\)/i.test(msg)) {
        console.error(`  Hard failure on ${ghlId} (${msg.slice(0, 80)}). Stopping; will emit PARTIAL worksheet.`);
        partial = true;
        break;
      }
      console.error(`  read error ${ghlId}: ${msg.slice(0, 80)} (recorded, continuing)`);
      await sleep(GHL_SLEEP_MS);
      continue;
    }

    if (!contact) {
      sourceErrors.push({ ghlId, error: 'getContactById returned null' });
      await sleep(GHL_SLEEP_MS);
      continue;
    }

    checked++;
    // Prefer live tags for the list breakdown; fall back to mirror tags.
    const lists = listsForTags(contact.tags?.length ? contact.tags : row.tags);
    const source = contact.source ?? null;
    const cls = classifySource(source);
    const rec = { ghlId, source, dateAdded: contact.dateAdded ?? null, cls, lists };
    results.push(rec);

    const listStr = lists.join(',') || '—';
    console.log(`  [${i + 1}/${worklist.length}] ${ghlId} · "${(source || '(blank)').slice(0, 40)}" → ${cls} · [${listStr}]`);

    // --apply: write consent ONLY to OPT-IN contacts.
    if (APPLY && cls === 'OPT-IN') {
      const isoTs = isoDate(contact.dateAdded);
      try {
        await writeConsent(ghl, ghlId, source, isoTs);
        rec.applied = true;
        console.log(`        ✓ APPLIED consent (source="${source}", ts=${isoTs || 'n/a'})`);
      } catch (err) {
        rec.applied = false;
        rec.applyError = String(err?.message || err);
        console.error(`        ✗ apply failed: ${rec.applyError.slice(0, 80)}`);
      }
      await sleep(GHL_SLEEP_MS); // pace the write too
    }

    await sleep(GHL_SLEEP_MS);
  }

  // 2) worksheet
  const { md, optin, notOptin, unknown, harvestOptin, srcRows } = buildWorksheet({
    partial, checked, results, sourceErrors, total, skippedAuto,
  });
  mkdirSync(dirname(WORKSHEET), { recursive: true });
  writeFileSync(WORKSHEET, md);

  // 3) stdout summary
  console.log(`\n=== SUMMARY ${partial ? '(PARTIAL)' : ''} ===`);
  console.log(`Contacts checked (live read OK): ${checked}`);
  console.log(`OPT-IN (backfillable):           ${optin.length}  (of which Harvest: ${harvestOptin.length})`);
  console.log(`NOT-OPT-IN:                      ${notOptin.length}`);
  console.log(`UNKNOWN (Ben rules):             ${unknown.length}`);
  console.log(`Live read errors:                ${sourceErrors.length}`);
  console.log(`Top sources:`);
  for (const [src, { count, cls }] of srcRows.slice(0, 5)) {
    console.log(`  ${count.toString().padStart(4)}  ${cls.padEnd(11)}  ${src}`);
  }
  if (APPLY) {
    const applied = results.filter((r) => r.applied).length;
    const applyFailed = results.filter((r) => r.applied === false && r.cls === 'OPT-IN').length;
    console.log(`APPLIED consent writes:          ${applied}  (failed: ${applyFailed})`);
  } else {
    console.log(`(DRY RUN — nothing written to GHL. Re-run with --apply to write the ${optin.length} OPT-IN consent records.)`);
  }
  console.log(`Worksheet → ${WORKSHEET}\n`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
