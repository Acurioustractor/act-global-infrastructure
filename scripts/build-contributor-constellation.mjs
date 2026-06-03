#!/usr/bin/env node
/**
 * build-contributor-constellation.mjs — the storyteller OWES-ledger (not an energy score).
 *
 * Reads the Empathy Ledger (separate instance, via this repo's own EL_SUPABASE_* creds).
 *
 * ANCHORED ON TRANSCRIPTS, NOT STORIES (Ben, 2026-06-03): "focus more on the storytellers'
 * information — transcripts — rather than specific stories. Stories are things we edit and
 * create, whereas transcripts are raw and they're full of the love." The transcript is the
 * person's actual gift; the story is ACT's derived artifact. So the gift we count is the
 * transcript, and "honoured" = ACT turned that raw transcript into a LIVE story.
 *
 * Per storyteller we show the CARE-owes side: of the raw transcripts they gave, how many has
 * ACT brought to life (linked to a published story) vs left raw / in draft / consent-blocked —
 * i.e. what ACT has (or hasn't) honoured back. This is the COMMUNITY constellation: NEVER an
 * orbit score, NEVER a tier. It exists to hold ACT accountable, per OCAP / ecosystem-value-exchange.
 *
 * "Honoured / live" signal (confirmed 2026-06-03 via probe-el-honoured-column.mjs + tx-link probe):
 *   - transcripts.status is uniformly 'completed' (just means transcription finished — useless).
 *   - The real honour = transcript.story_id → a stories row with status='published' (live).
 *       stories.status is the canonical lifecycle (published/draft/archived); published_at is
 *       NULL on 770/797 so it was a pure artifact — NEVER use it.
 *   - 331 of 597 transcripts have NO story at all (raw love, never actioned); only 192 are live.
 *   - transcripts.processing_status='consent_required' (127) = ACT owes the CONSENT conversation
 *     before it can act — surfaced as its own column, not folded into the story owes-gap.
 *   - is_public/privacy_level are NOT used as owes signals: 393/597 transcripts are private by
 *     design, and for First Nations stories private-but-honoured is legitimate, not a debt.
 *   - Withdrawn/deleted (transcripts.deleted_at=40) = RESOLVED, neither owed nor live.
 *
 * Read-only. Writes ONE local CSV. Internal analysis only — anything OUTWARD-facing must
 * pass `consent-check` first.
 *
 * Run:  node scripts/build-contributor-constellation.mjs
 * Out:  thoughts/shared/el-contributor-constellation.csv
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

dotenv.config({ path: '.env.local' });
const URL = process.env.EL_SUPABASE_URL || process.env.STORY_SUPABASE_URL;
const KEY = process.env.EL_SUPABASE_SERVICE_KEY || process.env.STORY_SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error('Missing EL_SUPABASE_URL / EL_SUPABASE_SERVICE_KEY in .env.local'); process.exit(1); }
const el = createClient(URL, KEY);

// 0) schema-first: confirm profile name column (no guessing)
const { data: p1, error: e2 } = await el.from('profiles').select('*').limit(1);
if (e2) { console.error('profiles probe failed:', e2.message); process.exit(1); }
const profCols = Object.keys(p1[0] || {});
const pick = (cols, names) => names.find(n => cols.includes(n));
const NAME = pick(profCols, ['full_name', 'display_name', 'name', 'preferred_name']) || 'id';
const FIRST = pick(profCols, ['first_name']), LAST = pick(profCols, ['last_name']);
console.log('profiles name col:', NAME, FIRST ? `(+${FIRST}/${LAST})` : '');

// 1) build the live-story set: which stories are honoured (status='published')
const liveStory = new Set();
const storyExists = new Set();
for (let from = 0; ; from += 1000) {
  const { data, error } = await el.from('stories').select('id,status').range(from, from + 999);
  if (error) { console.error('stories query failed:', error.message); process.exit(1); }
  if (!data.length) break;
  for (const s of data) { storyExists.add(s.id); if (s.status === 'published') liveStory.add(s.id); }
  if (data.length < 1000) break;
}
console.log(`${storyExists.size} stories · ${liveStory.size} live (published).`);

// 2) paginate TRANSCRIPTS (the raw gift), aggregate per storyteller
const TSEL = 'storyteller_id,story_id,processing_status,deleted_at,privacy_level,transcript_type,recording_date';
let total = 0, withStoryteller = 0;
const agg = new Map(); // id -> {tx, live, draft, raw, consent_req, withdrawn, words... }
for (let from = 0; ; from += 1000) {
  const { data, error } = await el.from('transcripts').select(TSEL).range(from, from + 999);
  if (error) { console.error('transcripts query failed:', error.message); process.exit(1); }
  if (!data.length) break;
  total += data.length;
  for (const r of data) {
    if (!r.storyteller_id) continue;
    withStoryteller++;
    const m = agg.get(r.storyteller_id) || { tx: 0, live: 0, draft: 0, raw: 0, consent_req: 0, withdrawn: 0 };
    m.tx++;
    if (r.deleted_at) { m.withdrawn++; }                          // resolved — not owed, not live
    else if (r.story_id && liveStory.has(r.story_id)) { m.live++; } // honoured: raw love became a live story
    else if (r.story_id && storyExists.has(r.story_id)) { m.draft++; } // linked to a non-live (draft/archived) story
    else { m.raw++; }                                            // NO story at all — raw love, never actioned
    if (r.processing_status === 'consent_required') m.consent_req++; // ACT owes the consent conversation
    agg.set(r.storyteller_id, m);
  }
  if (data.length < 1000) break;
}
console.log(`\n${total} transcripts · ${withStoryteller} carry a storyteller_id · ${agg.size} distinct storytellers.`);

// 3) hydrate names
const ids = [...agg.keys()];
const names = new Map();
for (let i = 0; i < ids.length; i += 200) {
  const sel = ['id', NAME, FIRST, LAST].filter(Boolean).join(',');
  const { data, error } = await el.from('profiles').select(sel).in('id', ids.slice(i, i + 200));
  if (error) { console.error('profiles hydrate failed:', error.message); process.exit(1); }
  for (const p of data) names.set(p.id, p[NAME] || [p[FIRST], p[LAST]].filter(Boolean).join(' ') || p.id);
}

// 4) rows, ranked by contribution (transcripts given)
const rows = ids.map(id => {
  const m = agg.get(id);
  const active = m.tx - m.withdrawn;            // gifts still in play (withdrawals are resolved)
  return {
    name: names.get(id) || id, storyteller_id: id,
    transcripts: m.tx,                          // raw transcripts given — the gift, "full of the love"
    live: m.live,                               // brought to life: transcript → a published story (honoured)
    in_draft: m.draft,                          // linked to a draft/archived story (in progress)
    raw_unactioned: m.raw,                      // NO story at all — the love sitting untouched ← headline owes
    consent_required: m.consent_req,            // ACT owes the consent conversation before it can act
    withdrawn: m.withdrawn,                     // deleted — resolved, not owed
    owes_gap: m.raw + m.draft,                  // raw love not yet brought to life (excl. withdrawn)
    honoured_pct: active ? Math.round((m.live / active) * 100) : 0,
  };
}).sort((a, b) => b.transcripts - a.transcripts);

// 5) write
const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
const cols = ['name', 'transcripts', 'live', 'in_draft', 'raw_unactioned', 'consent_required', 'withdrawn', 'owes_gap', 'honoured_pct', 'storyteller_id'];
writeFileSync('thoughts/shared/el-contributor-constellation.csv',
  [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n'));

// 6) summary + the named people Ben flagged
const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
console.log(`\nWrote ${rows.length} contributors → thoughts/shared/el-contributor-constellation.csv`);
console.log(`\nLEDGER TOTALS (transcript-anchored) — ${sum('transcripts')} transcripts · ${sum('live')} brought to life · ${sum('raw_unactioned')} raw/un-actioned · ${sum('in_draft')} in draft · ${sum('consent_required')} consent-blocked · ${sum('withdrawn')} withdrawn`);
console.log('Top 15 contributors (transcripts · live · owed=raw+draft):');
for (const r of rows.slice(0, 15)) console.log(`  ${String(r.transcripts).padStart(3)} tx · live ${String(r.live).padStart(3)} · owed ${String(r.owes_gap).padStart(3)} · consent? ${String(r.consent_required).padStart(2)}  ${r.name}`);
const NAMED = /bloomfield|tanya turner|brodie|germaine|fisher|cassidy|palm island|allan|alan/i;
console.log('\nNamed contributors you flagged (Allan Palm Island, Shaun Fisher, Oonchiumpa, Brodie):');
for (const r of rows.filter(r => NAMED.test(r.name))) console.log(`  ${String(r.transcripts).padStart(3)} tx · live ${String(r.live).padStart(3)} · owed ${String(r.owes_gap).padStart(3)} · consent? ${String(r.consent_required).padStart(2)}  ${r.name}`);
console.log('\nNOTE: anchored on TRANSCRIPTS (the raw gift), not stories. "live" = transcript → a published story.');
console.log('owes_gap = raw_unactioned + in_draft (love not yet brought to life); consent_required is owed separately.');
console.log('NOT an energy score — the community lane is never ranked for ACT. This is what ACT owes back. Outward-facing → consent-check first.');
