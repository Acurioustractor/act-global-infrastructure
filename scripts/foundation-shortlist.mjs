#!/usr/bin/env node
/**
 * foundation-shortlist.mjs — weekly "top-10 foundations ACT should approach" ranker.
 *
 * READ-ONLY. Never writes to any DB or external service. Selects only.
 *
 * Blends four lanes into one score per foundation (weights are constants below):
 *   1. SIGNAL strength  — sum of ACT's own act_* relationship signals
 *                         (act_funded=100, act_pipeline=10, act_email_contact=msg-count).
 *                         Source: foundation_relationship_signals (shared Supabase
 *                         tednluwflfhxyucgwigh), the 47 derived rows applied 2026-06-07.
 *   2. RECENCY          — decay on the most-recent act_* signal (fresher = better).
 *   3. WARMTH (Field)   — ACT's relational orbit. TWO honest sources, both org-correct:
 *                           a) act_email_contact signal (in-DB, org-level comms-spine touch)
 *                           b) a foundation BOARD MEMBER who sits in Ben's Field rings
 *                              (thoughts/shared/field-decisions.jsonl) — e.g. Dusseldorp
 *                              Forum <- Teya Dusseldorp (ring 50). Ring 5=closest.
 *                         NOTE: the orbit is PERSON-keyed and the foundations are ORGs,
 *                         so warmth is necessarily sparse — most foundations score 0 here.
 *                         If field-decisions.jsonl is absent, lane (b) is skipped and the
 *                         gap is printed; the ranker still runs on signals+recency+capacity.
 *   4. CAPACITY         — giving capacity (best non-null of total_giving_annual /
 *                         grant_range_max / avg_grant_size / endowment_size), log-scaled.
 *
 * Power profile (foundation_power_profiles: openness / approachability / gatekeeping)
 * is folded in as an APPROACHABILITY MULTIPLIER on the blended score — a high-capacity
 * foundation you can't get a meeting with should rank below an approachable one. If a
 * foundation has no power profile, the multiplier is neutral (1.0).
 *
 * Usage:
 *   node scripts/foundation-shortlist.mjs           # console table, top 10
 *   node scripts/foundation-shortlist.mjs --json     # JSON array to stdout
 *   node scripts/foundation-shortlist.mjs --top 20   # change cutoff
 *
 * Connection idiom matches scripts/build-foundation-act-signals.mjs:
 *   shared Supabase via NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,
 *   raw reads through the exec_sql RPC (NOT 1000-row capped). Queries run
 *   sequentially — never Promise.all (pooler exhaustion incident 2026-06-07).
 */
// Keep stdout machine-clean for --json: dotenv prints its banner to stdout from
// inside load-env, which would corrupt piped JSON. Filter that one line out at
// the stdout level during the (dynamic) env load, then restore. Dynamic import
// so this guard is in place before load-env runs (static imports hoist above it).
const _origWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, ...rest) => {
  if (typeof chunk === 'string' && chunk.includes('[dotenv@')) return true;
  return _origWrite(chunk, ...rest);
};
await import('./lib/load-env.mjs');
process.stdout.write = _origWrite;

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');

// ─────────────────────────────────────────────────────────────────────────────
// WEIGHTS — the single source of truth for the blend. Tune here.
// Lanes are each normalised to ~0..1, then weighted, then summed, then the
// approachability multiplier is applied. Weights sum to 1.0 for readability.
// ─────────────────────────────────────────────────────────────────────────────
const W = {
  SIGNAL:   0.45,   // ACT's own relationship signals — the strongest "should approach" evidence
  RECENCY:  0.10,   // how fresh the latest signal is
  WARMTH:   0.25,   // Field/orbit relational warmth (board-member rings + comms spine)
  CAPACITY: 0.20,   // giving capacity (can they write the cheque)
};

// Recency half-life: a signal this many days old contributes half its recency score.
const RECENCY_HALFLIFE_DAYS = 90;

// Capacity normalisation: log10 scale anchored so $5M giving ≈ 1.0.
const CAPACITY_LOG_ANCHOR = 5_000_000;

// Field ring → warmth weight (ring 5 = inner/closest). Org-via-board-member.
const RING_WARMTH = { '5': 1.0, '15': 0.8, '50': 0.55, '150': 0.3 };

// act_email_contact contributes a modest in-DB warmth floor even with no ring hit.
const EMAIL_WARMTH = 0.25;

// Power-profile approachability multiplier bounds: maps the [0..1] approachability
// score onto [MIN..MAX] so an un-approachable funder is penalised, an open one boosted.
const APPROACH_MULT_MIN = 0.7;
const APPROACH_MULT_MAX = 1.15;

// ─────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const topIdx = args.indexOf('--top');
const TOP_N = topIdx >= 0 && args[topIdx + 1] ? parseInt(args[topIdx + 1], 10) : 10;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SHARED_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// exec_sql RPC — raw SELECT, not subject to the PostgREST 1000-row cap.
async function sql(query) {
  const { data, error } = await sb.rpc('exec_sql', { query });
  if (error) throw new Error(error.message);
  return data || [];
}

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// ── Field-warmth lane (b): board members who sit in Ben's rings ──────────────
// field-warmth.mjs documents the ring model; here we only need name -> ring.
function loadFieldRings() {
  const path = join(REPO, 'thoughts/shared/field-decisions.jsonl');
  const rings = new Map(); // norm(name) -> ring string
  if (!existsSync(path)) return { rings, present: false };
  for (const line of readFileSync(path, 'utf8').split('\n').filter(Boolean)) {
    let d; try { d = JSON.parse(line); } catch { continue; }
    if (!d.name || !d.ring) continue;
    const r = String(d.ring);
    if (['5', '15', '50', '150'].includes(r)) rings.set(norm(d.name), r); // latest wins
  }
  return { rings, present: true };
}

// strip common board-member suffixes ("- Board Director", "(Chair ...)") for matching
const cleanMember = (m) => norm(String(m).split(/[-(]/)[0]);

// ── scoring helpers ──────────────────────────────────────────────────────────
const recencyScore = (lastSignalAt) => {
  if (!lastSignalAt) return 0;
  const days = (Date.now() - new Date(lastSignalAt).getTime()) / 864e5;
  if (!isFinite(days) || days < 0) return 1;
  return Math.pow(0.5, days / RECENCY_HALFLIFE_DAYS);
};
const capacityScore = (cap) => {
  const c = Number(cap);
  if (!c || c <= 0) return 0;
  return Math.min(1, Math.log10(c + 1) / Math.log10(CAPACITY_LOG_ANCHOR + 1));
};
const approachMult = (approachability) => {
  if (approachability == null) return 1.0; // no power profile → neutral
  const a = Number(approachability);
  return APPROACH_MULT_MIN + (APPROACH_MULT_MAX - APPROACH_MULT_MIN) * Math.max(0, Math.min(1, a));
};

async function main() {
  // 1. aggregate act_* signals per foundation (one row each, in SQL — uncapped)
  const sigRows = await sql(`
    SELECT foundation_id,
           SUM(strength)::numeric                                              AS signal_sum,
           MAX(strength)::numeric                                              AS signal_max,
           COUNT(*) FILTER (WHERE signal_type='act_funded')                    AS n_funded,
           COUNT(*) FILTER (WHERE signal_type='act_pipeline')                  AS n_pipeline,
           COUNT(*) FILTER (WHERE signal_type='act_email_contact')             AS n_email,
           COALESCE(SUM((metadata->>'total_paid')::numeric)
                    FILTER (WHERE signal_type='act_funded'),0)                 AS funded_total,
           MAX(created_at)                                                     AS last_signal_at
    FROM foundation_relationship_signals
    WHERE signal_type LIKE 'act_%' AND foundation_id IS NOT NULL
    GROUP BY foundation_id`);
  if (!sigRows.length) { console.error('No act_* signals found — nothing to rank.'); process.exit(1); }

  const ids = sigRows.map((r) => `'${r.foundation_id}'`).join(',');

  // 2. foundation facts (capacity + board members + name) for those ids
  const founds = await sql(`
    SELECT id, name, website, has_dgr, board_members,
           total_giving_annual, grant_range_max, avg_grant_size, endowment_size,
           COALESCE(total_giving_annual, grant_range_max, avg_grant_size, endowment_size) AS giving_capacity
    FROM foundations WHERE id IN (${ids})`);
  const foundById = new Map(founds.map((f) => [f.id, f]));

  // 3. power profiles for those ids
  const profs = await sql(`
    SELECT foundation_id, openness_score, approachability_score, gatekeeping_score,
           capital_power_score, capital_holder_class, public_grant_surface
    FROM foundation_power_profiles WHERE foundation_id IN (${ids})`);
  const profById = new Map(profs.map((p) => [p.foundation_id, p]));

  // 4. Field rings (local files) — warmth lane (b)
  const { rings, present: fieldPresent } = loadFieldRings();

  // max signal_sum for in-cohort normalisation of the signal lane
  const maxSigSum = Math.max(...sigRows.map((r) => Number(r.signal_sum) || 0), 1);

  const ranked = sigRows.map((s) => {
    const f = foundById.get(s.foundation_id) || {};
    const p = profById.get(s.foundation_id) || {};
    const reasons = [];

    // SIGNAL lane (0..1)
    const sigLane = (Number(s.signal_sum) || 0) / maxSigSum;
    if (Number(s.n_funded) > 0)
      reasons.push(`funded ACT $${Math.round(Number(s.funded_total)).toLocaleString('en-AU')} (${s.n_funded} inv)`);
    if (Number(s.n_pipeline) > 0) reasons.push(`${s.n_pipeline} live pipeline opp${Number(s.n_pipeline) > 1 ? 's' : ''}`);

    // RECENCY lane (0..1)
    const recLane = recencyScore(s.last_signal_at);

    // WARMTH lane (0..1) — best of: ring-via-board-member, comms-spine email
    let warmthLane = 0, warmthWhy = null;
    if (Number(s.n_email) > 0) { warmthLane = EMAIL_WARMTH; warmthWhy = 'comms-spine email'; }
    if (fieldPresent && Array.isArray(f.board_members)) {
      for (const m of f.board_members) {
        const ring = rings.get(cleanMember(m));
        if (ring && (RING_WARMTH[ring] || 0) > warmthLane) {
          warmthLane = RING_WARMTH[ring];
          warmthWhy = `board: ${String(m).split(/[-(]/)[0].trim()} (ring ${ring})`;
        }
      }
    }
    if (warmthWhy) reasons.push(warmthWhy);

    // CAPACITY lane (0..1)
    const capLane = capacityScore(f.giving_capacity);
    if (Number(f.giving_capacity) > 0)
      reasons.push(`capacity $${Number(f.giving_capacity).toLocaleString('en-AU')}`);

    // blend + approachability multiplier
    const base = W.SIGNAL * sigLane + W.RECENCY * recLane + W.WARMTH * warmthLane + W.CAPACITY * capLane;
    const mult = approachMult(p.approachability_score);
    const score = base * mult;
    if (p.approachability_score != null && mult < 0.95) reasons.push('low approachability ↓');
    if (p.approachability_score != null && mult > 1.05) reasons.push('approachable ↑');
    if (f.has_dgr) reasons.push('DGR');

    return {
      foundation_id: s.foundation_id,
      name: f.name || '(unknown)',
      website: f.website || null,
      score: Number(score.toFixed(4)),
      lanes: {
        signal: Number(sigLane.toFixed(3)),
        recency: Number(recLane.toFixed(3)),
        warmth: Number(warmthLane.toFixed(3)),
        capacity: Number(capLane.toFixed(3)),
        approach_mult: Number(mult.toFixed(3)),
      },
      signal_sum: Number(s.signal_sum) || 0,
      funded_total: Number(s.funded_total) || 0,
      n_funded: Number(s.n_funded) || 0,
      n_pipeline: Number(s.n_pipeline) || 0,
      giving_capacity: f.giving_capacity != null ? Number(f.giving_capacity) : null,
      approachability_score: p.approachability_score != null ? Number(p.approachability_score) : null,
      has_dgr: !!f.has_dgr,
      last_signal_at: s.last_signal_at,
      why: reasons.join('; '),
    };
  });

  ranked.sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, TOP_N);

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(top, null, 2) + '\n');
    return;
  }

  // console table
  if (!fieldPresent)
    console.log('⚠ Field warmth gap: thoughts/shared/field-decisions.jsonl not found — '
      + 'board-member ring warmth skipped, ranking on signals + recency + capacity + email-warmth only.\n');

  console.log(`Top ${top.length} foundations ACT should approach — ${new Date().toISOString().slice(0, 10)}`);
  console.log(`weights: signal=${W.SIGNAL} recency=${W.RECENCY} warmth=${W.WARMTH} capacity=${W.CAPACITY} (×approachability)\n`);

  const rows = top.map((r, i) => ({
    '#': i + 1,
    foundation: r.name.length > 38 ? r.name.slice(0, 37) + '…' : r.name,
    score: r.score.toFixed(3),
    sig: r.lanes.signal.toFixed(2),
    warm: r.lanes.warmth.toFixed(2),
    cap: r.lanes.capacity.toFixed(2),
    appr: r.approachability_score == null ? '—' : r.approachability_score.toFixed(2),
    why: r.why.length > 70 ? r.why.slice(0, 69) + '…' : r.why,
  }));
  console.table(rows);
  console.log(`\n${ranked.length} foundations carry act_* signals; showing top ${top.length}.`);
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
