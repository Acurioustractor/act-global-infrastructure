#!/usr/bin/env node
/**
 * journal-fetch-extras.mjs
 *
 * Pulls scrapbook content for the STAY journal pitch artefact:
 * - JusticeHub community programs (verified, featured)
 * - Empathy Ledger stories + media (consent-respected)
 *
 * Outputs: tools/journal-extras.json
 *
 * The journal HTML (tools/three-circles-journal.html) fetches this on load
 * and merges into PAGES extras based on community/program name match.
 *
 * Usage:
 *   node scripts/journal-fetch-extras.mjs                  # default: localhost APIs
 *   JUSTICEHUB_URL=https://justicehub.com.au \
 *     EMPATHY_LEDGER_URL=https://el.act.place \
 *     node scripts/journal-fetch-extras.mjs                # against prod
 */

import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { createEmpathyLedgerService } from './lib/empathy-ledger-content.mjs';

const JH_URL = process.env.JUSTICEHUB_URL || 'http://localhost:3000';
const OUT_FILE = 'tools/journal-extras.json';

// Communities that anchor STAY (Indigenous place names + program tags to look for)
const STAY_COMMUNITIES = [
  { key: 'mparntwe',    label: 'Mparntwe',    aliases: ['Alice Springs', 'Oonchiumpa', 'NT'] },
  { key: 'bwgcolman',   label: 'Bwgcolman',   aliases: ['Palm Island', 'PICC'] },
  { key: 'kalkadoon',   label: 'Kalkadoon',   aliases: ['Mount Isa', 'Mt Isa', 'CAMPFIRE', 'Brodie'] },
  { key: 'jaru',        label: 'Jaru',        aliases: ['Halls Creek', 'Kimberley'] },
  { key: 'darug',       label: 'Darug',       aliases: ['Mt Druitt', 'Mountie Yarns', 'Western Sydney'] },
  { key: 'ngemba',      label: 'Ngemba',      aliases: ['Bourke', 'NSW'] },
  { key: 'minjerribah', label: 'Minjerribah', aliases: ['Stradbroke', 'Quandamooka'] },
];

// ----- Fetchers -----

async function fetchJusticeHubPrograms() {
  const url = `${JH_URL}/api/community-programs?limit=100`;
  console.log(`→ JusticeHub: ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const programs = json.data || json.programs || json;
    return Array.isArray(programs) ? programs : [];
  } catch (err) {
    console.warn(`  ⚠ JusticeHub unreachable: ${err.message}`);
    return [];
  }
}

async function fetchEmpathyLedgerStories() {
  const el = createEmpathyLedgerService();
  console.log(`→ Empathy Ledger: stories + media`);
  try {
    const [stories, media] = await Promise.all([
      el.getStories({ limit: 60 }).catch(e => { console.warn(`  ⚠ stories: ${e.message}`); return { data: [] }; }),
      el.getMedia({ limit: 60 }).catch(e => { console.warn(`  ⚠ media: ${e.message}`); return { data: [] }; }),
    ]);
    return {
      stories: stories.data || stories.stories || [],
      media: media.data || media.media || [],
    };
  } catch (err) {
    console.warn(`  ⚠ EL unreachable: ${err.message}`);
    return { stories: [], media: [] };
  }
}

// ----- Matchers -----

function matchCommunity(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const c of STAY_COMMUNITIES) {
    if (t.includes(c.label.toLowerCase())) return c.key;
    for (const a of c.aliases) {
      if (t.includes(a.toLowerCase())) return c.key;
    }
  }
  return null;
}

// ----- Shapers (DB row → scrapbook extra) -----

function programToStamp(p) {
  return {
    type: 'stamp',
    lines: [
      'Verified',
      (p.organization || p.name || '').slice(0, 18).toUpperCase(),
      p.location || p.state || '',
    ].filter(Boolean),
    rot: -3 + Math.random() * 6,
    _source: { kind: 'justicehub.community_programs', id: p.id, name: p.name },
  };
}

function storyToCard(s) {
  // Pull a short pull-quote: prefer first sentence of summary, fallback to title
  const text = s.excerpt || s.summary || s.title || '';
  const quote = text.split(/[.!?](\s|$)/)[0].slice(0, 140).trim();
  if (!quote) return null;
  const author = s.storyteller_name || s.author || s.byline || 'Storyteller';
  const place = s.location || s.community || '';
  return {
    type: 'card',
    quote,
    meta: `${author}<br>${place}`.trim(),
    rot: -2 + Math.random() * 4,
    _source: { kind: 'empathy_ledger.stories', id: s.id, slug: s.slug },
  };
}

function mediaToPolaroid(m) {
  const src = m.thumbnail_url || m.medium_url || m.cdn_url;
  if (!src) return null;
  const caption = m.location_name || m.title || m.alt_text || 'photo';
  return {
    type: 'polaroid',
    src,
    caption: caption.slice(0, 36),
    rot: -3 + Math.random() * 6,
    _source: { kind: 'empathy_ledger.media_assets', id: m.id },
  };
}

// ----- Build extras index -----

function buildExtrasIndex(programs, stories, media) {
  // Index extras by community key. Each community gets up to 4 items (1-2 polaroids, 1-2 cards, 1 stamp).
  const index = {};
  for (const c of STAY_COMMUNITIES) index[c.key] = [];

  // Programs → stamps
  for (const p of programs) {
    const haystack = `${p.name || ''} ${p.organization || ''} ${p.location || ''} ${p.state || ''} ${p.description || ''}`;
    const ck = matchCommunity(haystack);
    if (ck) index[ck].push(programToStamp(p));
  }

  // Stories → cards
  for (const s of stories) {
    const haystack = `${s.title || ''} ${s.location || ''} ${s.community || ''} ${s.tags?.join(' ') || ''} ${s.excerpt || s.summary || ''}`;
    const ck = matchCommunity(haystack);
    if (ck) {
      const card = storyToCard(s);
      if (card) index[ck].push(card);
    }
  }

  // Media → polaroids
  for (const m of media) {
    const haystack = `${m.location_name || ''} ${m.title || ''} ${m.alt_text || ''} ${m.tags?.join(' ') || ''}`;
    const ck = matchCommunity(haystack);
    if (ck) {
      const pol = mediaToPolaroid(m);
      if (pol) index[ck].push(pol);
    }
  }

  // Trim each community to max 4 items
  for (const k of Object.keys(index)) {
    index[k] = index[k].slice(0, 4);
  }
  return index;
}

// ----- Main -----

async function main() {
  console.log('STAY journal extras fetch\n');

  const [programs, el] = await Promise.all([
    fetchJusticeHubPrograms(),
    fetchEmpathyLedgerStories(),
  ]);

  console.log(`  programs: ${programs.length}`);
  console.log(`  stories:  ${el.stories.length}`);
  console.log(`  media:    ${el.media.length}`);

  const extrasByCommunity = buildExtrasIndex(programs, el.stories, el.media);

  const output = {
    generated_at: new Date().toISOString(),
    sources: {
      justicehub: { url: JH_URL, programs: programs.length },
      empathy_ledger: { url: process.env.EMPATHY_LEDGER_URL || 'http://localhost:3030', stories: el.stories.length, media: el.media.length },
    },
    communities: STAY_COMMUNITIES,
    extras_by_community: extrasByCommunity,
  };

  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\n✓ wrote ${OUT_FILE}`);
  for (const [k, v] of Object.entries(extrasByCommunity)) {
    console.log(`  ${k.padEnd(13)} ${v.length} items`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
