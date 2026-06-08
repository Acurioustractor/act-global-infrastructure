#!/usr/bin/env node
/**
 * ghl-taxonomy-migrate.mjs — READ-ONLY DRY RUN ONLY (v1, no --apply mode at all).
 *
 * Operationalises the two specs:
 *   - wiki/concepts/ghl-crm-taxonomy.md         (§2/§3 legacy→namespaced mapping + namespaces)
 *   - wiki/concepts/ghl-audience-comms-automation.md (Layer 5 consent + community-line gates)
 *
 * For every contact in the ghl_contacts MIRROR (shared Supabase tednluwflfhxyucgwigh) it computes
 * the migration plan — tags to ADD, tags to REMOVE, and the two gate violations — and emits a
 * review worksheet. It writes NOTHING to GHL and NOTHING to the DB. A separate v2 will do the
 * writing after Ben rules on the worksheet (especially the ORPHAN list).
 *
 * HARD CONSTRAINTS (enforced by the absence of any write path):
 *   - No GHL API calls at all.
 *   - No DB writes (read-only SELECTs via supabase-js).
 *   - No git, no other file edits — only the one worksheet file under thoughts/shared/reviews/.
 *
 * Usage:
 *   node scripts/ghl-taxonomy-migrate.mjs
 *
 * Output:
 *   thoughts/shared/reviews/ghl-taxonomy-migration-worksheet-2026-06-08.md
 *   + a summary printed to stdout.
 */

import dotenv from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXPECTED_REF = 'tednluwflfhxyucgwigh'; // shared operational DB (the mirror lives here)

const PAGE_SIZE = 500;        // supabase-js caps at 1000 even with .range(); stay well under
const BACKOFF_MS = 30_000;    // DB has been wobbling — back off 30s on a page error, retry once
const WORKSHEET_PATH = 'thoughts/shared/reviews/ghl-taxonomy-migration-worksheet-2026-06-08.md';
const CONSENT_FIELD_ID = 'aVnqmajnysMtGYhLD0oA'; // "Newsletter Consent" custom field (value must be 'Yes')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
if (!SUPABASE_URL.includes(EXPECTED_REF)) {
  console.error(`Refusing to run: Supabase URL is not the expected shared project (${EXPECTED_REF}). Got: ${SUPABASE_URL}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
// The legacy → namespaced mapping (hard-coded; derived from the §2/§3 audit).
// Keys are matched case-INSENSITIVELY against the lowercased legacy tag, EXCEPT we
// also retain the original tag for the "case dup" reporting (Storyteller vs storyteller).
// A value is an array of one-or-more target namespaced tags. An empty array = "drop".
// ---------------------------------------------------------------------------
const MAP = {
  // Project
  'goods':                      ['project:act-gd'],
  'act-gd':                     ['project:act-gd'],
  'act-hv':                     ['project:act-hv'],
  'act-jh':                     ['project:act-jh'],
  'justicehub':                 ['project:act-jh'],
  'empathy ledger':             ['project:act-el'], // note the space

  // Role
  'storyteller':                ['role:storyteller'],
  // 'Storyteller' (case dup) handled by case-insensitive lookup below; recorded as a case-dup.
  'partner':                    ['role:partner'],
  'funder':                     ['role:funder'],
  'audience-funder':            ['role:funder'],
  'audience-partner':           ['role:partner'],
  'audience-brand':             [], // drop, meaningless

  // Comms
  'newsletter':                 ['comms:act-newsletter'],
  'goods-newsletter':           ['comms:goods-newsletter'],
  'harvest-website':            ['source:website', 'project:act-hv'],

  // Interest
  'interest-membership':        ['interest:membership'],
  'interest-community':         ['interest:community'],
  'interest-events':            ['interest:events'],
  'interest-markets':           ['interest:markets'],
  'interest-workshops':         ['interest:workshops'],

  // Goods sub-state
  'goods-funder':               ['role:funder', 'project:act-gd'],
  'goods-supporter':            ['role:supporter', 'project:act-gd'],
  'goods-inquiry':              ['role:buyer', 'project:act-gd'],
  'goods-nurture':              ['comms:goods-newsletter', 'project:act-gd'],
  'goods-warm':                 ['project:act-gd'],
  'goods-communitycontrolled':  ['role:community-controlled', 'project:act-gd'],
  'goods-state-nt':             ['place:nt', 'project:act-gd'],
  'goods-gmail-active':         ['project:act-gd'],

  // Event / source
  'eoi-gathering-march-2026':   ['source:event:eoi-gathering-2026'],
};

// Cruft — never map; list separately as flag-for-deletion.
const CRUFT = new Set(['gone-from-ghl', 'gone-from-ghl-2026-05-27']);

// Namespaces that count as "already namespaced" → pass through unchanged.
const KNOWN_PREFIXES = ['role:', 'project:', 'comms:', 'interest:', 'tier:', 'ring:', 'place:', 'source:', 'lane:'];

// ---------------------------------------------------------------------------
// Per-tag normalisation + mapping.
// Returns { targets:[], action:'map'|'passthrough'|'cruft'|'orphan'|'drop', note? }
// `targets` = the namespaced tags this legacy tag becomes (may be []).
// ---------------------------------------------------------------------------
function isNamespaced(tag) {
  const lower = tag.toLowerCase();
  return KNOWN_PREFIXES.some((p) => lower.startsWith(p));
}

// Formatting fixes (P4):
//  - "^source: " (space after the colon) → strip the space.
//  - any tag with an internal space AND a known namespace prefix → normalise (drop spaces after colon
//    and collapse the prefix:value spacing). We only touch namespaced tags here; flat legacy tags
//    with spaces (e.g. "empathy ledger") are handled by the MAP, not by this normaliser.
function normaliseFormatting(tag) {
  let t = tag;
  const lower = t.toLowerCase();
  const prefix = KNOWN_PREFIXES.find((p) => lower.startsWith(p.trimEnd()) || lower.startsWith(p));
  // Fix "source: footer" / "<ns>: value" → "<ns>:value"
  for (const p of KNOWN_PREFIXES) {
    const ns = p.slice(0, -1); // e.g. "source"
    // matches "source:" optionally followed by spaces
    const re = new RegExp(`^${ns}:\\s+`, 'i');
    if (re.test(t)) {
      t = t.replace(re, `${ns}:`);
      break;
    }
  }
  return { fixed: t, changed: t !== tag, hadPrefix: !!prefix };
}

function classifyTag(rawTag) {
  const tag = (rawTag || '').trim();
  if (!tag) return { action: 'drop', targets: [], orig: rawTag };

  const lower = tag.toLowerCase();

  // Cruft first.
  if (CRUFT.has(lower)) return { action: 'cruft', targets: [], orig: tag };

  // Already namespaced → passthrough, but apply formatting fix if needed.
  if (isNamespaced(tag)) {
    const { fixed, changed } = normaliseFormatting(tag);
    if (changed) {
      return { action: 'normalise', targets: [fixed], orig: tag, note: `format-fix → ${fixed}` };
    }
    return { action: 'passthrough', targets: [tag], orig: tag };
  }

  // Legacy flat tag → look up the map (case-insensitive).
  if (Object.prototype.hasOwnProperty.call(MAP, lower)) {
    const targets = MAP[lower];
    const caseDup = tag !== lower; // e.g. "Storyteller"
    if (targets.length === 0) {
      return { action: 'drop', targets: [], orig: tag, note: caseDup ? 'case-dup; drop' : 'drop (meaningless)' };
    }
    return { action: 'map', targets: [...targets], orig: tag, caseDup };
  }

  // Not mapped, not namespaced, not cruft → ORPHAN (needs a human decision).
  return { action: 'orphan', targets: [], orig: tag };
}

// ---------------------------------------------------------------------------
// Consent check: scan the custom_fields jsonb (object whose values are {id,value})
// for an entry with id === CONSENT_FIELD_ID and value === 'Yes'.
// The mirror stores custom_fields as { "0": {id,value}, "1": {...}, "email": ..., ... }.
// ---------------------------------------------------------------------------
function hasNewsletterConsent(customFields) {
  if (!customFields || typeof customFields !== 'object') return false;
  for (const v of Object.values(customFields)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && v.id === CONSENT_FIELD_ID) {
      return String(v.value).toLowerCase() === 'yes';
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Per-contact plan.
// ---------------------------------------------------------------------------
function planContact(contact, agg) {
  const orig = Array.isArray(contact.tags) ? contact.tags.filter((t) => typeof t === 'string') : [];
  const present = new Set(orig); // exact-string set of current tags

  const toAddSet = new Set();    // namespaced targets not already present
  const toRemoveSet = new Set(); // legacy flats being replaced + cruft + reformatted-original

  for (const tag of orig) {
    const c = classifyTag(tag);

    if (c.action === 'cruft') {
      toRemoveSet.add(tag);
      agg.cruftUses += 1;
      agg.cruftByTag.set(tag.toLowerCase(), (agg.cruftByTag.get(tag.toLowerCase()) || 0) + 1);
      continue;
    }
    if (c.action === 'orphan') {
      const key = tag; // preserve original casing for the orphan list
      agg.orphanByTag.set(key, (agg.orphanByTag.get(key) || 0) + 1);
      // orphans are left in place (no add/remove) pending Ben's decision
      continue;
    }
    if (c.action === 'passthrough') {
      // already clean & namespaced — nothing to do
      continue;
    }
    if (c.action === 'normalise') {
      // namespaced but mis-formatted → remove the bad form, add the fixed form
      const fixed = c.targets[0];
      toRemoveSet.add(tag);
      if (!present.has(fixed)) toAddSet.add(fixed);
      recordMigration(agg, tag, c.targets, contact.ghl_id);
      continue;
    }
    if (c.action === 'drop') {
      toRemoveSet.add(tag);
      recordMigration(agg, tag, ['(drop)'], contact.ghl_id);
      continue;
    }
    if (c.action === 'map') {
      // remove the legacy flat, add each namespaced target not already present
      toRemoveSet.add(tag);
      for (const target of c.targets) {
        if (!present.has(target)) toAddSet.add(target);
      }
      recordMigration(agg, tag, c.targets, contact.ghl_id);
    }
  }

  // Compute the END STATE tag set: (present - removed) + added
  const endState = new Set(orig);
  for (const r of toRemoveSet) endState.delete(r);
  for (const a of toAddSet) endState.add(a);

  // ---- GATE: community-line violation -------------------------------------
  // Contact would end up with (or already has) any comms:* tag AND has one of the
  // community-line markers (lane:community / role:storyteller / role:community).
  const endLower = [...endState].map((t) => t.toLowerCase());
  const endComms = [...endState].filter((t) => t.toLowerCase().startsWith('comms:'));
  const isCommunityLine =
    endLower.includes('lane:community') ||
    endLower.includes('role:storyteller') ||
    endLower.includes('role:community');
  let communityLineViolation = null;
  if (endComms.length > 0 && isCommunityLine) {
    communityLineViolation = {
      ghl_id: contact.ghl_id,
      name: nameOf(contact),
      comms: endComms.sort(),
    };
  }

  // ---- GATE: consent violation --------------------------------------------
  // Would end up with a comms:*newsletter tag but no newsletter_consent=Yes.
  const endNewsletter = [...endState].filter((t) => /^comms:.*newsletter$/i.test(t));
  let consentViolation = null;
  if (endNewsletter.length > 0 && !hasNewsletterConsent(contact.custom_fields)) {
    consentViolation = {
      ghl_id: contact.ghl_id,
      name: nameOf(contact),
      newsletter: endNewsletter.sort(),
    };
  }

  return {
    add: [...toAddSet],
    remove: [...toRemoveSet],
    communityLineViolation,
    consentViolation,
  };
}

function nameOf(c) {
  const n = (c.full_name || `${c.first_name || ''} ${c.last_name || ''}`).trim();
  return n || '(no name)';
}

// Record a per-namespace migration: legacy tag → target(s), counting distinct contacts.
function recordMigration(agg, legacyTag, targets, ghlId) {
  const key = `${legacyTag.toLowerCase()} → ${targets.join(' + ')}`;
  let rec = agg.migrations.get(key);
  if (!rec) {
    rec = { legacy: legacyTag.toLowerCase(), target: targets.join(' + '), contacts: new Set() };
    agg.migrations.set(key, rec);
  }
  rec.contacts.add(ghlId);
}

// ---------------------------------------------------------------------------
// Paginated read with one-retry-after-backoff per page (DB is wobbly tonight).
// Returns { contacts:[], partial:boolean, totalKnown:number|null, failedPages:[] }.
// ---------------------------------------------------------------------------
async function fetchPage(from, to) {
  return supabase
    .from('ghl_contacts')
    .select('id, ghl_id, first_name, last_name, full_name, tags, custom_fields')
    .order('id', { ascending: true })
    .range(from, to);
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function loadAllContacts() {
  const contacts = [];
  const failedPages = [];
  let partial = false;
  let page = 0;

  for (;;) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let { data, error } = await fetchPage(from, to);

    if (error) {
      console.warn(`  ⚠ page ${page} (rows ${from}-${to}) failed: ${error.message}. Backing off ${BACKOFF_MS / 1000}s and retrying once…`);
      await sleep(BACKOFF_MS);
      ({ data, error } = await fetchPage(from, to));
      if (error) {
        console.warn(`  ⚠ page ${page} failed again: ${error.message}. Skipping this page (PARTIAL).`);
        failedPages.push({ page, from, to, error: error.message });
        partial = true;
        // We can't trust the offset window past a failed page; stop to avoid silently
        // dropping a whole middle band. Report what we have.
        break;
      }
    }

    if (!data || data.length === 0) break;
    contacts.push(...data);
    if (data.length < PAGE_SIZE) break; // last page
    page += 1;
  }

  return { contacts, partial, failedPages };
}

// ---------------------------------------------------------------------------
// Worksheet rendering.
// ---------------------------------------------------------------------------
function renderWorksheet({ scanned, partial, failedPages, addOps, removeOps, migrations, orphanByTag, cruftByTag, cruftUses, communityLineViolations, consentViolations }) {
  const lines = [];
  const ts = new Date().toISOString();

  lines.push('# GHL Taxonomy Migration Worksheet — 2026-06-08');
  lines.push('');
  lines.push('> READ-ONLY dry-run output of `scripts/ghl-taxonomy-migrate.mjs`. Nothing was written to GHL or the DB.');
  lines.push('> Source: `ghl_contacts` mirror (shared Supabase `tednluwflfhxyucgwigh`). Specs: `wiki/concepts/ghl-crm-taxonomy.md` (§2/§3) + `wiki/concepts/ghl-audience-comms-automation.md` (Layer 5 gates).');
  lines.push(`> Generated: ${ts}`);
  lines.push('');

  if (partial) {
    lines.push('## ⚠ PARTIAL — DB wobble');
    lines.push('');
    lines.push('One or more pages failed to load even after a 30s backoff + retry. The counts below cover ONLY the pages that loaded. **Do not treat these as complete numbers.**');
    lines.push('');
    for (const f of failedPages) {
      lines.push(`- Page ${f.page} (rows ${f.from}–${f.to}) failed: \`${f.error}\``);
    }
    lines.push('');
  }

  // Section 1 — summary counts
  const distinctOrphans = orphanByTag.size;
  const distinctCruft = cruftByTag.size;
  lines.push('## 1. Summary counts');
  lines.push('');
  lines.push(`- **Contacts scanned:** ${scanned}${partial ? ' (PARTIAL)' : ''}`);
  lines.push(`- **Total ADD ops:** ${addOps}`);
  lines.push(`- **Total REMOVE ops:** ${removeOps}`);
  lines.push(`- **Orphan tags (distinct):** ${distinctOrphans} — see §3`);
  lines.push(`- **Community-line violations:** ${communityLineViolations.length} — see §4`);
  lines.push(`- **Consent violations:** ${consentViolations.length} — see §5`);
  lines.push(`- **Cruft tag-uses to delete:** ${cruftUses} across ${distinctCruft} distinct cruft tags`);
  lines.push('');

  // Section 2 — per-namespace migration table
  lines.push('## 2. Migration table (legacy tag → target, # contacts affected)');
  lines.push('');
  lines.push('| Legacy tag | Target | # contacts |');
  lines.push('|---|---|---|');
  const migRows = [...migrations.values()].sort((a, b) => b.contacts.size - a.contacts.size || a.legacy.localeCompare(b.legacy));
  if (migRows.length === 0) {
    lines.push('| _(none)_ | | 0 |');
  } else {
    for (const m of migRows) {
      lines.push(`| \`${m.legacy}\` | \`${m.target}\` | ${m.contacts.size} |`);
    }
  }
  lines.push('');

  // Section 3 — full ORPHAN list
  lines.push('## 3. ORPHAN list (unmapped, un-namespaced, non-cruft tags — Ben must rule on each)');
  lines.push('');
  lines.push('These are NOT migrated by v2 until a mapping decision is recorded here.');
  lines.push('');
  lines.push('| Orphan tag | # contacts |');
  lines.push('|---|---|');
  const orphanRows = [...orphanByTag.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (orphanRows.length === 0) {
    lines.push('| _(none)_ | 0 |');
  } else {
    for (const [tag, n] of orphanRows) {
      lines.push(`| \`${tag}\` | ${n} |`);
    }
  }
  lines.push('');

  // Section 4 — community-line violations (cap 50)
  lines.push('## 4. Community-line violations (the dangerous ones)');
  lines.push('');
  lines.push('Contact would end up with a `comms:*` tag while carrying `lane:community` / `role:storyteller` / `role:community`. v2 MUST strip the comms tags here, never add them.');
  lines.push('');
  lines.push(`**Total: ${communityLineViolations.length}** (showing up to 50)`);
  lines.push('');
  lines.push('| ghl_id | name | offending comms tags |');
  lines.push('|---|---|---|');
  if (communityLineViolations.length === 0) {
    lines.push('| _(none)_ | | |');
  } else {
    for (const v of communityLineViolations.slice(0, 50)) {
      lines.push(`| \`${v.ghl_id}\` | ${escapePipe(v.name)} | ${v.comms.map((c) => `\`${c}\``).join(', ')} |`);
    }
  }
  lines.push('');

  // Section 5 — consent violations (cap 50)
  lines.push('## 5. Consent violations');
  lines.push('');
  lines.push("Contact would end up with a `comms:*newsletter` tag but has no `newsletter_consent=Yes` (custom field `aVnqmajnysMtGYhLD0oA`). v2 MUST NOT enrol these without consent (Spam Act 2003).");
  lines.push('');
  lines.push(`**Total: ${consentViolations.length}** (showing up to 50)`);
  lines.push('');
  lines.push('| ghl_id | name | would-be newsletter tags |');
  lines.push('|---|---|---|');
  if (consentViolations.length === 0) {
    lines.push('| _(none)_ | | |');
  } else {
    for (const v of consentViolations.slice(0, 50)) {
      lines.push(`| \`${v.ghl_id}\` | ${escapePipe(v.name)} | ${v.newsletter.map((c) => `\`${c}\``).join(', ')} |`);
    }
  }
  lines.push('');

  lines.push('---');
  lines.push('_End of worksheet. v2 (the writer) runs only after Ben rules on §3 and confirms §4/§5 are handled by stripping, not adding._');
  lines.push('');

  return lines.join('\n');
}

function escapePipe(s) {
  return String(s).replace(/\|/g, '\\|');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('ghl-taxonomy-migrate.mjs — DRY RUN (read-only, no GHL/DB writes)');
  console.log(`Reading ghl_contacts from shared Supabase ${EXPECTED_REF} in pages of ${PAGE_SIZE}…`);

  const { contacts, partial, failedPages } = await loadAllContacts();

  const agg = {
    migrations: new Map(),
    orphanByTag: new Map(),
    cruftByTag: new Map(),
    cruftUses: 0,
  };
  const communityLineViolations = [];
  const consentViolations = [];
  let addOps = 0;
  let removeOps = 0;

  for (const c of contacts) {
    const plan = planContact(c, agg);
    addOps += plan.add.length;
    removeOps += plan.remove.length;
    if (plan.communityLineViolation) communityLineViolations.push(plan.communityLineViolation);
    if (plan.consentViolation) consentViolations.push(plan.consentViolation);
  }

  const worksheet = renderWorksheet({
    scanned: contacts.length,
    partial,
    failedPages,
    addOps,
    removeOps,
    migrations: agg.migrations,
    orphanByTag: agg.orphanByTag,
    cruftByTag: agg.cruftByTag,
    cruftUses: agg.cruftUses,
    communityLineViolations,
    consentViolations,
  });

  mkdirSync(dirname(WORKSHEET_PATH), { recursive: true });
  writeFileSync(WORKSHEET_PATH, worksheet);

  // stdout summary
  console.log('');
  console.log('=== SUMMARY ===');
  console.log(`Contacts scanned:           ${contacts.length}${partial ? ' (PARTIAL — DB wobble)' : ''}`);
  console.log(`Total ADD ops:              ${addOps}`);
  console.log(`Total REMOVE ops:           ${removeOps}`);
  console.log(`Orphan tags (distinct):     ${agg.orphanByTag.size}`);
  console.log(`Community-line violations:  ${communityLineViolations.length}`);
  console.log(`Consent violations:         ${consentViolations.length}`);
  console.log(`Cruft tag-uses to delete:   ${agg.cruftUses}`);
  console.log('');
  console.log(`Worksheet written → ${WORKSHEET_PATH}`);
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
