#!/usr/bin/env node
/**
 * Backfill ghl_contacts.projects[] with canonical ACT-XX codes.
 *
 * Derives codes from each contact's tags using:
 *   1. Direct match against projects.ghl_tags
 *   2. Prefix rules (goods-* → ACT-GD, etc.)
 *
 * Writes canonical codes to ghl_contacts.projects[] (replaces lowercase slugs).
 * Optionally pushes the ACT-XX codes back to GHL as tags so future syncs round-trip.
 *
 * Usage:
 *   node scripts/backfill-ghl-contact-projects.mjs              # dry-run
 *   node scripts/backfill-ghl-contact-projects.mjs --apply      # write to Supabase
 *   node scripts/backfill-ghl-contact-projects.mjs --apply --push-ghl  # also push tags to GHL
 *   node scripts/backfill-ghl-contact-projects.mjs --limit 50   # process N contacts only
 *
 * Env: SUPABASE_SHARED_URL · SUPABASE_SHARED_SERVICE_ROLE_KEY · GHL_API_KEY · GHL_LOCATION_ID
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const PUSH_GHL = args.has('--push-ghl');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX > -1 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : null;
const VERBOSE = args.has('--verbose');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Prefix rules: tag starts with key → canonical code
const PREFIX_RULES = [
  ['goods-', 'ACT-GD'],
  ['harvest-', 'ACT-HV'],
  ['contained-', 'ACT-CN'],
  ['picc-', 'ACT-PI'],
  ['justicehub-', 'ACT-JH'],
  ['el-', 'ACT-EL'],
  ['empathy-', 'ACT-EL'],
  ['bcv-', 'ACT-BV'],
  ['black-cockatoo-', 'ACT-BV'],
  ['farm-', 'ACT-FM'],
  ['the-farm-', 'ACT-FM']
];

// ────────────────────────────────────────────────────────────────────
// Build the tag → canonical-code lookup
// ────────────────────────────────────────────────────────────────────

async function buildTagMap() {
  const { data, error } = await supabase
    .from('projects')
    .select('code, name, ghl_tags, status');
  if (error) throw error;

  const directMap = new Map(); // lowercase tag → code
  const codeMeta = new Map();
  for (const p of data) {
    codeMeta.set(p.code, { name: p.name, status: p.status });
    for (const t of p.ghl_tags || []) {
      const key = t.toLowerCase();
      // Skip if collision (a tag mapped to multiple codes — already audited)
      if (directMap.has(key) && directMap.get(key) !== p.code) {
        if (VERBOSE) console.warn(`tag collision: '${t}' on ${directMap.get(key)} and ${p.code}`);
        continue;
      }
      directMap.set(key, p.code);
    }
    // Slug variants for legacy contact.projects[] values
    directMap.set(p.code.toLowerCase(), p.code);
  }
  // Legacy slug aliases that pre-date canonical codes
  directMap.set('the-harvest', 'ACT-HV');
  directMap.set('act-farm', 'ACT-FM');
  directMap.set('act-studio', 'ACT-CORE');
  return { directMap, codeMeta };
}

function deriveCodes(tags, directMap) {
  const codes = new Set();
  for (const raw of tags || []) {
    if (!raw) continue;
    const tag = String(raw).toLowerCase();
    if (directMap.has(tag)) {
      codes.add(directMap.get(tag));
      continue;
    }
    for (const [prefix, code] of PREFIX_RULES) {
      if (tag.startsWith(prefix)) {
        codes.add(code);
        break;
      }
    }
  }
  return codes;
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

// ────────────────────────────────────────────────────────────────────
// Stream contacts in pages
// ────────────────────────────────────────────────────────────────────

async function* streamContacts() {
  const page = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('ghl_contacts')
      .select('id, ghl_id, full_name, email, tags, projects')
      .order('id', { ascending: true })
      .range(offset, offset + page - 1);
    if (error) throw error;
    if (!data?.length) return;
    for (const c of data) yield c;
    if (data.length < page) return;
    offset += page;
  }
}

// ────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────

async function main() {
  const startedAt = Date.now();
  console.log(`backfill-ghl-contact-projects — ${APPLY ? 'APPLY' : 'DRY-RUN'}${PUSH_GHL ? ' + push to GHL' : ''}${LIMIT ? ` (limit ${LIMIT})` : ''}`);

  const { directMap, codeMeta } = await buildTagMap();
  console.log(`Loaded ${directMap.size} tag mappings across ${codeMeta.size} projects`);

  const ghl = PUSH_GHL ? createGHLService() : null;

  const stats = {
    seen: 0,
    no_change: 0,
    would_update: 0,
    updated_supabase: 0,
    ghl_tags_added: 0,
    ghl_push_errors: 0,
    no_derivable_codes: 0
  };
  const perCodeAdd = new Map();
  const examples = [];

  for await (const c of streamContacts()) {
    if (LIMIT && stats.seen >= LIMIT) break;
    stats.seen++;

    const derived = deriveCodes(c.tags, directMap);
    if (derived.size === 0) {
      stats.no_derivable_codes++;
      continue;
    }

    const target = derived;
    const targetSorted = [...target].sort();
    const currentSorted = [...(c.projects || [])].sort();
    const supabaseIdentical = currentSorted.length === targetSorted.length
      && currentSorted.every((v, i) => v === targetSorted[i]);

    // Track ADDITIONS — codes in target that aren't already in GHL tags
    const existingTagsLower = new Set((c.tags || []).map(t => String(t).toLowerCase()));
    const codesToPush = [...target].filter(code => !existingTagsLower.has(code.toLowerCase()));
    const ghlNeedsPush = codesToPush.length > 0;

    if (supabaseIdentical && !ghlNeedsPush) {
      stats.no_change++;
      continue;
    }
    if (!supabaseIdentical) {
      stats.would_update++;
      for (const code of codesToPush) {
        perCodeAdd.set(code, (perCodeAdd.get(code) || 0) + 1);
      }
      if (examples.length < 8) {
        examples.push({
          name: c.full_name || c.email,
          ghl_id: c.ghl_id,
          from: currentSorted,
          to: targetSorted
        });
      }
    }

    if (!APPLY) continue;

    // 1. Write Supabase (only if changed)
    if (!supabaseIdentical) {
      const { error: upErr } = await supabase
        .from('ghl_contacts')
        .update({ projects: targetSorted, updated_at: new Date().toISOString() })
        .eq('id', c.id);
      if (upErr) {
        console.error(`supabase update failed for ${c.ghl_id}:`, upErr.message);
        continue;
      }
      stats.updated_supabase++;
    }

    // 2. GHL push — independent of Supabase delta
    const isSynthetic = c.email && /\.(local|temp)$/i.test(c.email);
    if (isSynthetic) {
      stats.skipped_synthetic = (stats.skipped_synthetic || 0) + 1;
      continue;
    }
    if (PUSH_GHL && c.ghl_id && codesToPush.length > 0) {
      for (const code of codesToPush) {
        try {
          await ghl.addTagToContact(c.ghl_id, code);
          stats.ghl_tags_added++;
        } catch (e) {
          stats.ghl_push_errors++;
          if (VERBOSE) console.error(`GHL addTag ${code} → ${c.ghl_id}: ${e.message}`);
        }
      }
    }

    if (stats.seen % 250 === 0) {
      console.log(`  …processed ${stats.seen}  would_update=${stats.would_update}  updated=${stats.updated_supabase}  ghl_tags_added=${stats.ghl_tags_added}`);
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log('\n─── results ───');
  console.log(`seen:               ${stats.seen}`);
  console.log(`no_change:          ${stats.no_change}`);
  console.log(`no_derivable_codes: ${stats.no_derivable_codes}`);
  console.log(`would_update:       ${stats.would_update}`);
  if (APPLY) {
    console.log(`updated_supabase:   ${stats.updated_supabase}`);
  }
  if (PUSH_GHL) {
    console.log(`ghl_tags_added:     ${stats.ghl_tags_added}`);
    console.log(`ghl_push_errors:    ${stats.ghl_push_errors}`);
    console.log(`skipped_synthetic:  ${stats.skipped_synthetic || 0}`);
  }
  console.log(`elapsed:            ${elapsed}s`);

  console.log('\n─── per canonical code (to be added) ───');
  const sorted = [...perCodeAdd.entries()].sort((a, b) => b[1] - a[1]);
  for (const [code, count] of sorted) {
    const meta = codeMeta.get(code);
    console.log(`  ${code.padEnd(8)} +${String(count).padStart(5)}  ${meta?.name || ''}${meta?.status && meta.status !== 'active' ? ` (${meta.status})` : ''}`);
  }

  console.log('\n─── example diffs ───');
  for (const ex of examples) {
    console.log(`  ${ex.name}`);
    console.log(`    from: [${ex.from.join(', ')}]`);
    console.log(`    to:   [${ex.to.join(', ')}]`);
  }

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to write Supabase, --apply --push-ghl to also tag in GHL.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
