// field-warmth.mjs — warmth v2: the two honest numbers.
//
// LOCKED MODEL (calibrated 2026-06-07 against Ben's 85 ring reads — machine warmth
// had ZERO correlation with his rings; his rejects scored HIGHEST):
//   1. RING = human-only. From field-decisions.jsonl, never estimated. Unread ≠ ring-150.
//   2. CONTACT = factual recency/volume of two-way exchange. Orders the reading queue,
//      tracks tending. Never pretends to be closeness.
//   3. CADENCE = expected rhythm per ring, per-person override from the ledger
//      (e.g. Andy Fog "fortnightly"). Cooling = overdue vs YOUR rhythm for THAT ring.
//      Only human-ringed people get cadence alerts — no strangers in the morning read.
//   4. VOTES (triage 👍/👎) steer the reading queue, never the ring.
//   5. Hard rules unchanged: community lane never laddered/alerted-for-asks; family
//      never CRM'd; vendors never in the rings; ask-state vetoes per project.
import { readFileSync, existsSync } from 'node:fs';

export const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

// known name variants (norm-level): the same human under two spellings breaks every join
// (found 2026-06-07: "Benjamin Croft" beeper identity vs "ben croft" GHL contact — his ring
// never reached GHL). Durable fix = identity resolution; this map handles the known few.
const ALIAS = new Map([
  ['ben croft', 'benjamin croft'],
]);
export const canon = n => { const k = norm(n); return ALIAS.get(k) || k; };

// expected days between touches, by ring (Ben can retune here — one place)
export const CADENCE_DAYS = { 5: 7, 15: 14, 50: 90, 150: 180 };

const CADENCE_WORDS = { daily: 1, weekly: 7, fortnightly: 14, monthly: 30, quarterly: 90, yearly: 365 };

/** Load the ledger once: latest read per person (ring, energy, cadence, votes, asks). */
export function loadLedger(path = 'thoughts/shared/field-decisions.jsonl') {
  const latest = new Map();
  const votes = new Map();
  if (!existsSync(path)) return { reads: latest, votes };
  for (const l of readFileSync(path, 'utf8').split('\n').filter(Boolean)) {
    let d; try { d = JSON.parse(l); } catch { continue; }
    if (!d.name) continue;
    const k = canon(d.name);
    if (d.vote) votes.set(k, d.vote);            // latest vote wins
    if (d.ring || d.energy != null || d.relation) latest.set(k, { ...(latest.get(k) || {}), ...d });
  }
  return { reads: latest, votes };
}

// org reads in the ledger (organisations Ben ringed in session 1 — rings are for HUMANS;
// resolve relationship-to-org via its people). They get no ring, no cadence, no queue.
export const ORG_READS = new Set(['minjerribah moorgumpin elders', 'mmeic justice', 'yj_grants']);

/** Ben's ring for a person, or null. NEVER estimated. */
export const ringOf = (reads, name) => {
  if (ORG_READS.has(norm(name))) return null;
  const r = reads.get(canon(name))?.ring;
  return r && ['5', '15', '50', '150'].includes(String(r)) ? String(r) : null; // out/family → no CRM ring
};

/** Has Ben read this person at all (any ring/vote/relation — incl. out/family)? */
export const hasRead = (reads, name) => reads.has(canon(name));

/** Drawing layer: ring, with the inner core promoted — ring 5 OR energy ≥75 lands in
 *  band 5 (Ben names his inner five by energy; no explicit ring-5 reads exist yet).
 *  Keeps the orbit viz and morning read telling the same story. */
export const layerOf = (reads, name) => {
  const r = ringOf(reads, name);
  if (!r) return null;
  const e = reads.get(canon(name))?.energy;
  return (r === '5' || (e != null && e >= 75)) ? '5' : r;
};

/** Factual contact strength: two-way only (queue ordering, not closeness). */
export function contactSignal(row) {
  const bs = Number(row.beeper_score) || 0;
  const [gi, go] = (row.gmail_in_out || '').split('/').map(Number);
  return bs + ((gi && go) ? Math.min(gi, go) * 2 : 0);
}

/** Cadence state for a RINGED person. {state:'ok'|'due'|'overdue', expected, days, ratio} */
export function cadenceState(reads, name, lastContact, now = Date.now()) {
  const d = reads.get(canon(name));
  const ring = ringOf(reads, name);
  if (!ring) return null;                                   // unringed → no cadence alerts
  let expected = CADENCE_DAYS[ring];
  const word = (d?.cadence || '').toLowerCase().trim();
  if (CADENCE_WORDS[word]) expected = CADENCE_WORDS[word];  // per-person override (his words)
  const t = Date.parse(lastContact || '');
  const days = isNaN(t) ? null : Math.round((now - t) / 864e5);
  if (days == null) return { state: 'unknown', expected, days, ratio: null, ring };
  const ratio = days / expected;
  return { state: ratio <= 1 ? 'ok' : ratio <= 1.75 ? 'due' : 'overdue', expected, days, ratio, ring };
}

/** Reading-queue priority for UNREAD people: 👍 first, then contact signal. */
export function queuePriority(votes, name, signal) {
  const v = votes.get(canon(name));
  return (v === 'up' ? 10000 : v === 'down' ? -10000 : 0) + signal;
}
