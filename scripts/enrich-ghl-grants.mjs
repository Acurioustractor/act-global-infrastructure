#!/usr/bin/env node
/**
 * enrich-ghl-grants.mjs — flow ACT's rich grant data into the bare GHL Grants pipeline.
 *
 * GHL grant opportunities carry only name + monetaryValue + a couple of custom fields.
 * The source table `grant_opportunities` (shared Supabase tednluwflfhxyucgwigh) is rich:
 * provider, requirements_summary/description, amount_min/max, deadline/closes_at,
 * categories[]/focus_areas[], geography, fit_score, source/discovered_by, url, and
 * eligibility booleans. This script pushes that into GHL opportunity custom fields.
 *
 * Review-first: DRY RUN by default; pass --apply to write to GHL.
 *   node scripts/enrich-ghl-grants.mjs            # dry run (prints the plan)
 *   node scripts/enrich-ghl-grants.mjs --apply    # write to GHL
 *
 * STEP A — ensure 8 opportunity custom fields exist (look up by exact name, create if
 *   missing). Also resolves 3 EXISTING fields by name (Submission Link, Submission date,
 *   Funding type) — never recreated.
 * STEP B — backfill: SELECT FROM grant_opportunities WHERE ghl_opportunity_id IS NOT NULL
 *   (paginated in 500s, sequential), build a per-opp customFields array (skipping
 *   null/empty values — never write empty strings), and updateOpportunity (MERGES by id).
 *   Also sets monetaryValue = amount_max || amount_min when present.
 *
 * NOTE on ghl_opportunity_id: ~22% of stored ids are Supabase mirror UUIDs, not real GHL
 *   ids. We resolve UUID -> ghl_opportunities.ghl_id before writing (same pattern as
 *   sync-grants-ghl.mjs), otherwise those writes would 404.
 *
 * GHL DATE custom fields: written as epoch milliseconds (per existing opp convention).
 *
 * Companion: scripts/sync-grants-ghl.mjs (two-way name/status/URL/deadline sync).
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// GHL Grants pipeline + parent folder for new opportunity fields (proven in goods-wire-unit-ledger.mjs).
const FIELD_PARENT_ID = '2uKy5KYpDdfr4K6nnnAr';
const PAGE_SIZE = 500;
const WRITE_SLEEP_MS = 300; // GHL rate limit between opp writes
const FUNDS_MAX_CHARS = 900;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FIELD DEFINITIONS
//   newFields    — created if missing (looked up by exact name first)
//   existingOnly — looked up by exact name, NEVER created
// Each has a `value(row)` that returns the string to write, or null/'' to skip.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function fmtMoney(n) {
  return '$' + Number(n).toLocaleString('en-US');
}

function amountRange(row) {
  // amount_min/max are integers; null = absent. (0 is unusual but allowed.)
  const lo = row.amount_min;
  const hi = row.amount_max;
  const haveLo = lo != null;
  const haveHi = hi != null;
  if (haveLo && haveHi) {
    if (lo === hi) return fmtMoney(lo);
    return `${fmtMoney(lo)}–${fmtMoney(hi)}`; // en-dash
  }
  if (haveLo) return `From ${fmtMoney(lo)}`;
  if (haveHi) return `Up to ${fmtMoney(hi)}`;
  return null;
}

function focusAreas(row) {
  const cats = Array.isArray(row.categories) ? row.categories : [];
  const focus = Array.isArray(row.focus_areas) ? row.focus_areas : [];
  const merged = [...cats, ...focus]
    .map((s) => (s == null ? '' : String(s).trim()))
    .filter(Boolean);
  const deduped = [...new Set(merged)];
  return deduped.length ? deduped.join(', ') : null;
}

function whatItFunds(row) {
  const raw = (row.requirements_summary && row.requirements_summary.trim())
    || (row.description && row.description.trim())
    || null;
  if (!raw) return null;
  if (raw.length <= FUNDS_MAX_CHARS) return raw;
  return raw.slice(0, FUNDS_MAX_CHARS - 1).trimEnd() + '…'; // ellipsis
}

function eligibility(row) {
  // Only include clauses where the boolean is non-null. null -> omit (treated as unknown).
  const yn = (b) => (b ? 'Yes' : 'No');
  const clauses = [];
  if (row.dgr_required != null) clauses.push(`DGR required: ${yn(row.dgr_required)}`);
  if (row.accepts_pty_ltd != null) clauses.push(`Pty Ltd: ${yn(row.accepts_pty_ltd)}`);
  if (row.accepts_charity != null) clauses.push(`Charity: ${yn(row.accepts_charity)}`);
  if (row.accepts_sole_trader != null) clauses.push(`Sole trader: ${yn(row.accepts_sole_trader)}`);
  if (row.accepts_unincorporated != null) clauses.push(`Unincorporated: ${yn(row.accepts_unincorporated)}`);
  return clauses.length ? clauses.join(' · ') : null; // middle dot separator
}

// DATE -> epoch ms. closes_at / deadline are SQL `date` -> ISO 'YYYY-MM-DD' strings.
function dateToEpochMs(row) {
  const d = row.closes_at || row.deadline;
  if (!d) return null;
  const t = Date.parse(d + (typeof d === 'string' && d.length === 10 ? 'T00:00:00Z' : ''));
  if (Number.isNaN(t)) return null;
  return String(t);
}

const NEW_FIELDS = [
  { name: 'Funder', dataType: 'TEXT', value: (r) => (r.provider && r.provider.trim()) || null },
  { name: 'Grant fit score', dataType: 'NUMERICAL', value: (r) => (r.fit_score != null ? String(r.fit_score) : null) },
  { name: 'Amount range', dataType: 'TEXT', value: amountRange },
  { name: 'What it funds', dataType: 'LARGE_TEXT', value: whatItFunds },
  { name: 'Focus areas', dataType: 'TEXT', value: focusAreas },
  { name: 'Geography', dataType: 'TEXT', value: (r) => (r.geography && r.geography.trim()) || null },
  { name: 'Eligibility', dataType: 'LARGE_TEXT', value: eligibility },
  { name: 'Discovery source', dataType: 'TEXT', value: (r) => (r.source && r.source.trim()) || (r.discovered_by && r.discovered_by.trim()) || null },
];

const EXISTING_FIELDS = [
  { name: 'Submission Link', value: (r) => (r.url && r.url.trim()) || null },
  { name: 'Submission date', value: dateToEpochMs },
  { name: 'Funding type', value: () => 'Grant' }, // SINGLE_OPTIONS — 'Grant' is a valid picklist option
];

const SELECT_COLS = [
  'id', 'name', 'ghl_opportunity_id',
  'provider', 'fit_score', 'amount_min', 'amount_max',
  'requirements_summary', 'description',
  'categories', 'focus_areas', 'geography',
  'dgr_required', 'accepts_pty_ltd', 'accepts_charity', 'accepts_sole_trader', 'accepts_unincorporated',
  'source', 'discovered_by', 'url', 'closes_at', 'deadline',
].join(', ');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP A — ensure custom fields exist; resolve all field ids by name.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function ensureFields(ghl) {
  console.log('-- Step A: opportunity custom fields --');
  const existing = await ghl.request(`/locations/${ghl.locationId}/customFields?model=opportunity`);
  const byName = new Map((existing.customFields || []).map((f) => [f.name, f]));

  const fieldIds = {};   // name -> id
  const toCreate = [];   // names we'd create

  // New fields: look up, create if missing.
  for (const f of NEW_FIELDS) {
    const hit = byName.get(f.name);
    if (hit) {
      fieldIds[f.name] = hit.id;
      console.log(`  ✓ exists: "${f.name}" (${hit.id})`);
      continue;
    }
    toCreate.push(f);
    if (!APPLY) {
      console.log(`  + would create: "${f.name}" (${f.dataType}, opportunity)`);
      continue;
    }
    const created = await ghl.request(`/locations/${ghl.locationId}/customFields`, {
      method: 'POST',
      body: JSON.stringify({ name: f.name, dataType: f.dataType, model: 'opportunity', parentId: FIELD_PARENT_ID }),
    });
    const cf = created.customField || created;
    fieldIds[f.name] = cf.id;
    console.log(`  + created: "${f.name}" (${cf.id})`);
  }

  // Existing-only fields: must already exist; resolve by name.
  for (const f of EXISTING_FIELDS) {
    const hit = byName.get(f.name);
    if (hit) {
      fieldIds[f.name] = hit.id;
      console.log(`  ✓ existing field: "${f.name}" (${hit.id})`);
    } else {
      console.log(`  ⚠ expected existing field NOT found: "${f.name}" — its mapping will be skipped`);
    }
  }

  return { fieldIds, toCreate };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Resolve ghl_opportunity_id -> real GHL opportunity id (handle mirror UUIDs).
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function buildMirrorMap() {
  // Map ghl_opportunities.id (UUID) -> ghl_id (real GHL id), Grants pipeline.
  const map = new Map();
  let from = 0;
  for (;;) {
    let rows = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await supabase
        .from('ghl_opportunities')
        .select('id, ghl_id')
        .eq('pipeline_name', 'Grants')
        .range(from, from + PAGE_SIZE - 1);
      if (!error) { rows = data; break; }
      console.log(`  ⚠ mirror page error (${error.message}); backing off 30s, retrying once...`);
      await sleep(30000);
    }
    if (!rows) throw new Error('ghl_opportunities mirror unreachable after retry');
    for (const r of rows) if (r.ghl_id) map.set(r.id, r.ghl_id);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return map;
}

function resolveGhlId(stored, mirrorMap, liveIds) {
  if (!stored) return null;
  if (UUID_RE.test(stored)) return mirrorMap.get(stored) || null; // UUID must resolve via mirror (mirror values are live)
  return liveIds.has(stored) ? stored : null; // real id only if it's actually live in GHL — else it's a stale/deleted ref (404 guard)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Build the customFields payload for a single grant row.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildPayload(row, fieldIds) {
  const customFields = [];
  for (const f of [...NEW_FIELDS, ...EXISTING_FIELDS]) {
    const id = fieldIds[f.name];
    if (!id) continue; // field missing (e.g. an expected-existing field absent) — skip
    let v;
    try { v = f.value(row); } catch { v = null; }
    if (v == null) continue;
    const s = String(v).trim();
    if (s === '') continue; // never write empty strings
    customFields.push({ id, field_value: s, _name: f.name });
  }
  const updates = {};
  if (customFields.length) updates.customFields = customFields.map(({ id, field_value }) => ({ id, field_value }));
  const mv = row.amount_max != null ? row.amount_max : (row.amount_min != null ? row.amount_min : null);
  if (mv != null) updates.monetaryValue = mv;
  return { updates, debugFields: customFields };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP B — backfill linked grant_opportunities.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function fetchLinkedGrants() {
  const all = [];
  let from = 0;
  for (;;) {
    let rows = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await supabase
        .from('grant_opportunities')
        .select(SELECT_COLS)
        .not('ghl_opportunity_id', 'is', null)
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (!error) { rows = data; break; }
      console.log(`  ⚠ grant page error (${error.message}); backing off 30s, retrying once...`);
      await sleep(30000);
    }
    if (!rows) throw new Error('grant_opportunities unreachable after retry');
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

async function main() {
  console.log(`\n=== Enrich GHL Grants pipeline from grant_opportunities (${APPLY ? 'APPLY' : 'DRY RUN'}) ===\n`);

  const ghl = createGHLService();

  // STEP A
  const { fieldIds, toCreate } = await ensureFields(ghl);

  // Mirror map for UUID resolution.
  console.log('\n-- Resolving GHL id mirror (ghl_opportunities) --');
  const mirrorMap = await buildMirrorMap();
  const liveIds = new Set(mirrorMap.values()); // every real GHL id known live in the Grants pipeline
  console.log(`  mirror entries: ${mirrorMap.size} (live GHL ids: ${liveIds.size})`);

  // STEP B — fetch.
  console.log('\n-- Step B: backfill linked grant_opportunities --');
  const grants = await fetchLinkedGrants();
  console.log(`  grant_opportunities with ghl_opportunity_id: ${grants.length}`);

  // Pre-compute resolution + payloads; track skips.
  let unresolved = 0;
  let noPayload = 0;
  const plan = []; // { row, realId, updates, debugFields }
  for (const row of grants) {
    const realId = resolveGhlId(row.ghl_opportunity_id, mirrorMap, liveIds);
    if (!realId) { unresolved++; continue; }
    const { updates, debugFields } = buildPayload(row, fieldIds);
    if (!updates.customFields && updates.monetaryValue == null) { noPayload++; continue; }
    plan.push({ row, realId, updates, debugFields });
  }

  console.log(`  resolvable & with data: ${plan.length}`);
  console.log(`  skipped (unresolved GHL id / not in mirror): ${unresolved}`);
  console.log(`  skipped (no enrichable data): ${noPayload}`);

  if (!APPLY) {
    // DRY RUN — print would-create fields, 5 sample payloads, totals.
    console.log('\n-- Fields it WOULD create --');
    if (toCreate.length === 0) {
      console.log('  (none — all 8 enrichment fields already exist)');
    } else {
      for (const f of toCreate) console.log(`  + ${f.name} (${f.dataType})`);
    }

    console.log('\n-- Sample payloads (first 5 enrichable opps) --');
    for (const item of plan.slice(0, 5)) {
      console.log(`\n  • "${item.row.name}"`);
      console.log(`    GHL opp id: ${item.realId}${UUID_RE.test(item.row.ghl_opportunity_id) ? ' (resolved from mirror UUID)' : ''}`);
      if (item.updates.monetaryValue != null) console.log(`    monetaryValue: ${item.updates.monetaryValue}`);
      for (const cf of item.debugFields) {
        const preview = cf.field_value.length > 120 ? cf.field_value.slice(0, 117) + '...' : cf.field_value;
        console.log(`    [${cf._name}] = ${preview}`);
      }
    }

    const totalFieldWrites = plan.reduce((n, p) => n + (p.updates.customFields ? p.updates.customFields.length : 0), 0);
    console.log('\n-- Totals --');
    console.log(`  would enrich ${plan.length} opportunities`);
    console.log(`  ${toCreate.length} custom fields to create`);
    console.log(`  ${totalFieldWrites} custom-field values would be written (across all opps)`);
    console.log('\nDry run complete — re-run with --apply to write to GHL.');
    return;
  }

  // APPLY — write each opp, one-line log, final tally.
  let enriched = 0;
  let failed = 0;
  for (const item of plan) {
    try {
      await ghl.updateOpportunity(item.realId, item.updates);
      const n = item.updates.customFields ? item.updates.customFields.length : 0;
      const mv = item.updates.monetaryValue != null ? ` $${item.updates.monetaryValue}` : '';
      console.log(`  ✓ ${item.row.name.slice(0, 50)} (${n} fields${mv})`);
      enriched++;
    } catch (err) {
      console.log(`  ✗ ${item.row.name.slice(0, 50)}: ${err.message.slice(0, 100)}`);
      failed++;
    }
    await sleep(WRITE_SLEEP_MS);
  }

  console.log('\n-- Done --');
  console.log(`  enriched: ${enriched}`);
  console.log(`  failed:   ${failed}`);
  console.log(`  skipped (unresolved id): ${unresolved}`);
  console.log(`  skipped (no data):       ${noPayload}`);
}

main().catch((e) => { console.error('Fatal error:', e); process.exit(1); });
