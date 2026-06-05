#!/usr/bin/env node
/**
 * build-unified-orbit.mjs — reconcile the orbit across all three sources.
 *
 * Merges into ONE row per real human:
 *   1. ALL GoHighLevel contacts        (Supabase mirror `ghl_contacts`, system of record)
 *   2. The Gmail two-way network        (thoughts/shared/network-alliance-worklist.csv)
 *   3. The Beeper warm-channel orbit    (thoughts/shared/network-vibe-orbit.csv)
 *
 * Surfaces: uncaptured allies (in your warm channels, NOT in GHL — the Ben Crofts),
 * community-line violations (storyteller/community on tier:/drip), duplicates, ghosts.
 * Attaches PROPOSED home + tag — proposals only. ZERO GHL/Notion writes. Read-only.
 *
 * Governing model: wiki/concepts/relationship-first-crm.md · energy-orbit.md
 * Plan: thoughts/shared/plans/2026-06-03-act-network-circle-action-stages.md (Phase 2)
 *
 * Run:  node scripts/build-unified-orbit.mjs
 * Out:  thoughts/shared/unified-orbit-worklist.csv
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

dotenv.config({ path: '.env.local' });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SHARED_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing Supabase env'); process.exit(1); }
const sb = createClient(url, key);

// --- helpers -------------------------------------------------------------
const HONORIFICS = /\b(mba|bsc|phd|ao|am|oam|dr|prof|professor|she ?her|maipm|cppp|micda|emfia|maiop|gaicd|acc|dipth|jp)\b/g;
const normName = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(HONORIFICS, '').replace(/\s+/g, ' ').trim();
const normEmail = s => (s || '').toLowerCase().trim();
const digits9 = s => (s || '').replace(/\D/g, '').slice(-9);
const COMMUNITY_NAME = /bloomfield|oonchiump|tanya turner|eloise hall|brodie|germaine|\bpicc\b|atnarpa|kristy|valerie riley/i;
const COMMUNITY_ROLES = ['role:storyteller', 'role:community', 'role:community-controlled', 'role:elder']; // broad — lane/ptag classification only
// The community-LINE VIOLATION (extraction-funnel protection) is about community INDIVIDUALS only.
// `role:community` / `role:community-controlled` are SEGMENT / ORG markers (the Goods "community"
// audience; community-controlled Aboriginal corporations) — NOT "this person is a storyteller" — so
// they must NOT trigger a violation. (2026-06-03: they were false-flagging ~40 orgs + funder staff
// like Snow/FRRR who carry a goods-community segment tag. Verified against the ghl_contacts mirror.)
const COMMUNITY_INDIVIDUAL_ROLES = ['role:storyteller', 'role:elder'];
const ORG_NAME = /\b(corporation|council|limited|ltd|pty|store|health|board|alliance|congress|centre|center|trust|services|company|incorporated|\binc\b|association|progress|homelands|land council)\b/i;

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (field !== '' || row.length) { row.push(field); rows.push(row); row = []; field = ''; } if (c === '\r' && text[i + 1] === '\n') i++; }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}
function loadCSV(path) {
  if (!existsSync(path)) { console.warn(`(missing ${path})`); return []; }
  const rows = parseCSV(readFileSync(path, 'utf8'));
  const head = rows.shift();
  return rows.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((h, i) => [h.trim(), r[i]])));
}

// --- 1) load the two CSV layers -----------------------------------------
const gmail = loadCSV('thoughts/shared/network-alliance-worklist.csv'); // subset of GHL, two-way email volume
const beeper = loadCSV('thoughts/shared/network-vibe-orbit.csv');       // warm-channel orbit
const gmailByEmail = new Map(), gmailByName = new Map();
for (const g of gmail) { if (g.email) gmailByEmail.set(normEmail(g.email), g); if (g.name) gmailByName.set(normName(g.name), g); }

// --- 2) pull ALL ghl_contacts (paginate past 1000-cap) ------------------
console.log('Pulling all ghl_contacts (paginated)…');
const contacts = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('ghl_contacts')
    .select('ghl_id, full_name, company_name, email, phone, tags, is_storyteller, newsletter_consent, last_contact_date')
    .range(from, from + 999);
  if (error) { console.error('ghl_contacts query failed:', error.message); process.exit(1); }
  if (!data.length) break;
  contacts.push(...data);
  if (data.length < 1000) break;
}
console.log(`  ${contacts.length} GHL contacts.`);

// indexes for reconciliation
const ghlByName = new Map(), ghlByPhone = new Map(), nameCount = new Map(), emailCount = new Map();
for (const c of contacts) {
  const nn = normName(c.full_name);
  if (nn) { if (!ghlByName.has(nn)) ghlByName.set(nn, c); nameCount.set(nn, (nameCount.get(nn) || 0) + 1); }
  const ne = normEmail(c.email); if (ne) emailCount.set(ne, (emailCount.get(ne) || 0) + 1);
  const p9 = digits9(c.phone); if (p9.length === 9) ghlByPhone.set(p9, c);
}

// --- 3) build unified rows from GHL base + overlays ---------------------
const rows = [];
const matchedBeeper = new Set();

function beeperMatch(c) {
  // try name, then phone
  const nn = normName(c.full_name);
  let b = beeper.find(x => normName(x.name) === nn && nn);
  if (!b) { const p9 = digits9(c.phone); if (p9.length === 9) b = beeper.find(x => digits9(x.name) === p9); }
  if (b) matchedBeeper.add(b);
  return b;
}

for (const c of contacts) {
  const tags = Array.isArray(c.tags) ? c.tags : [];
  const ne = normEmail(c.email), nn = normName(c.full_name);
  const ghost = tags.includes('gone-from-ghl');
  const isCommunity = c.is_storyteller || tags.some(t => COMMUNITY_ROLES.includes(t)) || COMMUNITY_NAME.test(c.full_name || '');
  const isOrg = ORG_NAME.test(c.full_name || '') || ORG_NAME.test(c.company_name || '') || /@goods\.civicgraph\.io$/i.test(c.email || '');
  // a community INDIVIDUAL is the only thing the community-line protects (excludes orgs + segment-tagged funders).
  // ACT's own team is excluded by definition: the line protects community FROM ACT — the org can't
  // violate it against itself. (Ben/Nic carry is_storyteller=true from their own EL transcripts,
  // which flagged their Harvest tier:member as a "violation" — noise, fixed 2026-06-05.)
  const isInternal = /@act\.place$/i.test(c.email || '') || /^(ben(jamin)? knight|nic(holas)? marchesi( oam)?|a curious tractor|act admin|benjamin test)$/i.test((c.full_name || '').trim());
  const isCommunityIndividual = !isOrg && !isInternal && (c.is_storyteller || tags.some(t => COMMUNITY_INDIVIDUAL_ROLES.includes(t)) || COMMUNITY_NAME.test(c.full_name || ''));
  const relTags = tags.filter(t => /^(tier:|circle:|role:|comms:|project:|lane:)/.test(t));
  const hasTier = tags.some(t => t.startsWith('tier:'));
  const hasDrip = tags.some(t => /drip/.test(t));
  const g = gmailByEmail.get(ne) || gmailByName.get(nn);
  const b = beeperMatch(c);

  const dupe = Math.max(nameCount.get(nn) || 1, emailCount.get(ne) || 1);
  const lane = isCommunity ? 'community' : 'supporter';
  const violation = isCommunityIndividual && (hasTier || hasDrip);

  const flags = [];
  if (violation) flags.push('COMMUNITY-LINE-VIOLATION');
  if (ghost) flags.push('ghost');
  if (dupe > 1) flags.push(`dupe×${dupe}`);
  if (b) flags.push('warm-channel-active');
  if (b && b.channels_all && b.channels_all.includes('|')) flags.push('multi-channel');

  let home = 'keep';
  if (ghost) home = 'review-ghost';
  else if (dupe > 1) home = 'dedupe';
  else if (violation) home = 'fix-community-line';

  let ptag = '';
  if (isCommunity) ptag = 'lane:community (constellation — no tier, no drip)';
  else {
    const score = b ? Number(b.score) : 0;
    const gt = g ? Number(g.total) : 0;
    if ((b && b.pattern === 'generative' && score >= 80) || gt >= 40) ptag = 'circle:gsd-alliance? + tier:steward?';
    else if (score >= 65 || gt >= 10 || b) ptag = 'tier: set-by-evidence';
    else if (relTags.length) ptag = '(has tags — review)';
    else ptag = 'tier:curious?';
  }

  const signalRank = (b ? Number(b.score) : 0) + (g ? Number(g.total) : 0) + relTags.length * 5 + (violation ? 200 : 0) + (b && !isCommunity ? 50 : 0);

  rows.push({
    status: ghost ? 'ghost' : isCommunity ? 'community' : 'captured',
    lane, name: c.full_name || '', email: c.email || '', phone: c.phone || '', in_ghl: 'y',
    sources: ['ghl', g ? 'gmail' : '', b ? 'beeper' : ''].filter(Boolean).join('+'),
    beeper_score: b ? b.score : '', beeper_pattern: b ? b.pattern : '',
    gmail_total: g ? g.total : '', gmail_in_out: g ? `${g.inbound}/${g.outbound}` : '',
    last_contact: (c.last_contact_date || (g ? g.last_contact : '') || '').slice(0, 10),
    rel_tags: relTags.join(' '), dupe, home, ptag, flags: flags.join(' '), signalRank,
  });
}

// --- 4) uncaptured allies: Beeper people with NO GHL match --------------
let uncaptured = 0;
for (const b of beeper) {
  if (matchedBeeper.has(b)) continue;
  if (b.lane === 'family' || b.lane === 'cold') continue;                 // skip household + cold edge
  const isPhone = /^\+?\d[\d ]+$|@icloud|@/.test(b.name) && !/[a-z]{3,}/i.test(b.name.replace(/@.*/, ''));
  const community = COMMUNITY_NAME.test(b.name);
  rows.push({
    status: community ? 'community' : 'UNCAPTURED',
    lane: community ? 'community' : 'supporter',
    name: b.name, email: '', phone: isPhone ? b.name : '', in_ghl: 'n',
    sources: 'beeper',
    beeper_score: b.score, beeper_pattern: b.pattern,
    gmail_total: '', gmail_in_out: '', last_contact: '',
    rel_tags: '', dupe: 1,
    home: isPhone ? 'identify-then-promote (needs phone/identity)' : 'promote-to-contact',
    ptag: community ? 'lane:community (constellation)' : (Number(b.score) >= 80 ? 'circle:gsd-alliance? + tier:steward?' : 'tier: set-by-evidence'),
    flags: ['UNCAPTURED-ALLY', b.read ? b.read : ''].filter(Boolean).join(' '),
    signalRank: Number(b.score) + 120,
  });
  if (!community) uncaptured++;
}

rows.sort((a, b) => b.signalRank - a.signalRank);

// --- 4.5) carry the hand-annotation columns forward ----------------------
// CIRCLE / LANE_FIX / NOTES are Ben's curation on the PREVIOUS worklist, not generated
// data — a regen must never wipe them (same rule as person-page Reflections).
// Keyed by email, falling back to normalised name.
{
  const prev = loadCSV('thoughts/shared/unified-orbit-worklist.csv');
  const ann = new Map();
  for (const p of prev) {
    if (!(p.CIRCLE || p.LANE_FIX || p.NOTES)) continue;
    const k = p.email ? 'e:' + normEmail(p.email) : 'n:' + normName(p.name || '');
    if (!ann.has(k)) ann.set(k, { CIRCLE: p.CIRCLE, LANE_FIX: p.LANE_FIX, NOTES: p.NOTES });
  }
  let carried = 0;
  for (const r of rows) {
    const a = ann.get(r.email ? 'e:' + normEmail(r.email) : 'n:' + normName(r.name || '')) || ann.get('n:' + normName(r.name || ''));
    if (a) { r.CIRCLE = a.CIRCLE; r.LANE_FIX = a.LANE_FIX; r.NOTES = a.NOTES; carried++; }
  }
  if (ann.size) console.log(`carried ${carried} hand-annotation row(s) forward (${ann.size} annotated in previous worklist)`);
}

// --- 5) write the worklist ----------------------------------------------
const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
const cols = ['CIRCLE', 'LANE_FIX', 'NOTES', 'status', 'home', 'ptag', 'name', 'email', 'phone', 'in_ghl', 'sources', 'beeper_score', 'beeper_pattern', 'gmail_total', 'gmail_in_out', 'last_contact', 'rel_tags', 'dupe', 'flags'];
const lines = [cols.join(',')];
for (const r of rows) lines.push(cols.map(c => esc(c in r ? r[c] : '')).join(','));
const out = 'thoughts/shared/unified-orbit-worklist.csv';
writeFileSync(out, lines.join('\n'));

// --- 6) summary ----------------------------------------------------------
const byStatus = rows.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
const violations = rows.filter(r => r.flags.includes('COMMUNITY-LINE-VIOLATION'));
const dupes = rows.filter(r => r.dupe > 1);
const uncapRows = rows.filter(r => r.status === 'UNCAPTURED');
const warmInGhl = rows.filter(r => r.in_ghl === 'y' && r.sources.includes('beeper'));

console.log(`\nWrote ${rows.length} rows → ${out}`);
console.log('Status split:', byStatus);
console.log(`\nUNCAPTURED allies (warm channels, not in GHL): ${uncaptured}`);
for (const r of uncapRows.slice(0, 12)) console.log(`  ${String(r.beeper_score).padStart(3)} ${r.beeper_pattern.padEnd(11)} ${r.name}  ${r.flags}`);
console.log(`\nCOMMUNITY-LINE violations (community on tier:/drip): ${violations.length}`);
for (const r of violations.slice(0, 10)) console.log(`  ${r.name} — ${r.rel_tags}`);
console.log(`\nDuplicates (same name/email >1 row in GHL): ${dupes.length} rows across people`);
console.log(`Warm-channel people already in GHL: ${warmInGhl.length}`);
console.log('\nRead-only. Next: review the worklist; put "y" in CIRCLE for inner ring, fix LANE_FIX. No GHL writes until you say so.');
