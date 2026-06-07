#!/usr/bin/env node
/**
 * orbit-community-line-sweep.mjs — Phase 4 community-line sweep (the OCAP correction at scale).
 *
 * Applies the PROVEN Kristy fix to all COMMUNITY-LINE-VIOLATION people, but the violation set
 * mixes two cases that need OPPOSITE fixes — so we classify first and NEVER blind-strip:
 *
 *   A) GENUINE community (storyteller/elder/community member wrongly on tier:/drips)
 *      → strip tier:* + comms:*drip*, add lane:community.  [the Kristy fix]
 *   B) MIS-TAGGED non-community (ACT team / supporter wrongly carrying role:storyteller etc.)
 *      → remove the erroneous community role tag(s); leave tier/lane as supporter.  [the Nic fix]
 *   C) AMBIGUOUS (tagged community but not an EL contributor, not ACT team, no community signal)
 *      → NO auto-write; flagged for Ben.
 *
 * Classification signal for "genuine community": appears as a contributor in the EL constellation
 * (el-contributor-constellation.csv), OR matches the known-community-name regex, OR has a community
 * email domain. ACT team = @act.place. Everything else flagged ambiguous.
 *
 *   node scripts/orbit-community-line-sweep.mjs prep            # READ-ONLY: classify + diff (default)
 *   node scripts/orbit-community-line-sweep.mjs apply A         # apply bucket A (genuine community) — gated
 *   node scripts/orbit-community-line-sweep.mjs apply B         # apply bucket B (mis-tagged role removal) — gated
 *
 * prep reads the orbit worklist mirror for speed; apply RE-RESOLVES each person live in GHL by
 * email and acts on live tags (per-tag add/remove, never blind-overwrite), logging every change.
 */
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
dotenv.config({ path: '.env.local' });

const mode = process.argv[2] || 'prep';
const bucket = (process.argv[3] || '').toUpperCase();
const LOG = 'thoughts/shared/orbit-community-line-sweep-log.md';
const DIFF = 'thoughts/shared/orbit-community-line-sweep-diff.csv';

// ── classification constants (mirror build-unified-orbit.mjs) ──────────────
// 2026-06-06: "eloise hall" removed (TABOO co-founder, supporter lane — see build-unified-orbit.mjs)
const COMMUNITY_NAME = /bloomfield|oonchiump|tanya turner|brodie|germaine|\bpicc\b|atnarpa|kristy|valerie riley|palm island|cassidy|stokes|doyle|anderson/i;
const COMMUNITY_ROLES = ['role:storyteller', 'role:community', 'role:community-controlled', 'role:elder'];
const COMMUNITY_DOMAINS = /@(oonchiumpa|empathy-ledger)\b/i;
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

// ── tiny CSV parser ─────────────────────────────────────────────────────────
function parseCSV(text) {
  const rows = []; let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
    else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const readCSV = (p) => { const r = parseCSV(readFileSync(p, 'utf8')); const h = r[0]; return r.slice(1).filter(x => x.length === h.length).map(x => Object.fromEntries(h.map((k, i) => [k, x[i]]))); };

// ── load EL constellation (genuine storyteller names) ──────────────────────
const elNames = new Set(readCSV('thoughts/shared/el-contributor-constellation.csv').map(r => norm(r.name)).filter(n => n && !/^[0-9a-f-]{20,}$/.test(n)));

// ── gather unique flagged people from the orbit worklist ───────────────────
const orbit = readCSV('thoughts/shared/unified-orbit-worklist.csv');
const seen = new Map();
for (const p of orbit) {
  if (!/COMMUNITY-LINE-VIOLATION/.test(p.flags || '')) continue;
  const key = norm(p.name);
  // merge dupes: union their rel_tags so we see every offending tag the person carries
  const prev = seen.get(key);
  const tags = new Set([...(prev?.tags || []), ...(p.rel_tags || '').split(/\s+/).filter(Boolean)]);
  seen.set(key, { name: p.name, email: prev?.email || p.email, tags, status: p.status });
}
const people = [...seen.values()];

// ── classify + compute fix ─────────────────────────────────────────────────
const VIOL_TIER = t => t.startsWith('tier:');
const VIOL_DRIP = t => /drip/.test(t);
const ORG = /\b(corporation|council|limited|ltd|pty|store|health|board|alliance|congress|centre|center|trust|services|company|incorporated|\binc\b|association|progress|homelands|outstations|land)\b/i;
function classify(p) {
  const tags = [...p.tags];
  const tier = tags.filter(VIOL_TIER), drip = tags.filter(VIOL_DRIP);
  const commRoles = tags.filter(t => COMMUNITY_ROLES.includes(t));
  const isTeam = /@act\.place$/i.test(p.email || '');
  const inEL = elNames.has(norm(p.name));
  const isOrg = ORG.test(p.name || '') || /@goods\.civicgraph\.io$/i.test(p.email || '');
  const known = COMMUNITY_NAME.test(p.name || '') || COMMUNITY_DOMAINS.test(p.email || '');
  // B — ACT's own team/org wrongly carrying a community role
  if (isTeam) return { bucket: 'B', reason: 'ACT team @act.place — community role is a mis-tag', remove: commRoles, add: [] };
  // C(org) — community-controlled ORGANISATION in a commercial buyer/partner drip: a POLICY question
  //   (legitimate B2B comms vs community-control), not the individual-storyteller extraction. No auto-write.
  if (isOrg) return { bucket: 'C', reason: 'community-controlled ORG in commercial drip — policy review (B2B comms vs community-control)', remove: [], add: [] };
  // A — EL-verified community INDIVIDUAL on tier/drips: the proven Kristy fix
  if (inEL) return { bucket: 'A', reason: 'genuine community individual (EL contributor)', remove: [...tier, ...drip], add: tags.includes('lane:community') ? [] : ['lane:community'] };
  // C(person) — looks community by name/domain but NOT an EL contributor, or a funder-staff false-positive
  return { bucket: 'C', reason: known ? 'name/domain looks community but NOT an EL contributor — confirm' : 'flagged community but no EL/role evidence — likely false-positive (funder/partner staff)', remove: [], add: [] };
}
const classified = people.map(p => ({ ...p, ...classify(p) })).sort((a, b) => a.bucket.localeCompare(b.bucket) || a.name.localeCompare(b.name));

if (mode === 'prep') {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const cols = ['bucket', 'name', 'email', 'reason', 'remove', 'add', 'all_tier_drip_role'];
  const rows = classified.map(c => ({
    bucket: c.bucket, name: c.name, email: c.email, reason: c.reason,
    remove: c.remove.join(' '), add: c.add.join(' '),
    all_tier_drip_role: [...c.tags].filter(t => VIOL_TIER(t) || VIOL_DRIP(t) || COMMUNITY_ROLES.includes(t)).join(' '),
  }));
  writeFileSync(DIFF, [cols.join(','), ...rows.map(r => cols.map(k => esc(r[k])).join(','))].join('\n'));
  const byB = b => classified.filter(c => c.bucket === b);
  console.log(`COMMUNITY-LINE SWEEP — ${classified.length} unique flagged people. Diff → thoughts/shared/orbit-community-line-sweep-diff.csv\n`);
  console.log(`A) GENUINE community — strip tier/drips + lane:community  (${byB('A').length} people, the proven Kristy fix):`);
  for (const c of byB('A')) console.log(`   ${c.name}  — remove [${c.remove.join(', ') || '—'}]  +[${c.add.join(', ') || '—'}]`);
  console.log(`\nB) MIS-TAGGED non-community — remove erroneous community role  (${byB('B').length} people, the Nic fix):`);
  for (const c of byB('B')) console.log(`   ${c.name} <${c.email}> — remove [${c.remove.join(', ') || '—'}]`);
  console.log(`\nC) AMBIGUOUS — NO auto-write, needs your call  (${byB('C').length} people):`);
  for (const c of byB('C')) console.log(`   ${c.name} <${c.email}> — carries [${[...c.tags].filter(t => VIOL_TIER(t) || VIOL_DRIP(t)).join(', ')}]`);
  console.log('\nNothing written. To apply a bucket after review:  node scripts/orbit-community-line-sweep.mjs apply A   (or B)');
}

else if (mode === 'apply') {
  if (!['A', 'B'].includes(bucket)) { console.error('Specify bucket: apply A  (genuine) or  apply B  (mis-tagged). C is manual.'); process.exit(1); }
  const { createGHLService } = await import('./lib/ghl-api-service.mjs');
  const ghl = createGHLService();
  const tagsOf = c => (c.tags || []).slice().sort();
  const now = () => new Date().toISOString();
  const targets = classified.filter(c => c.bucket === bucket);
  appendFileSync(LOG, `\n## Sweep bucket ${bucket} — ${now()} (${targets.length} people)\n`);
  console.log(`APPLY bucket ${bucket} — ${targets.length} people. Resolving each live in GHL by email…\n`);
  let done = 0, skipped = 0;
  for (const t of targets) {
    if (!t.email) { console.log(`   SKIP ${t.name} — no email to resolve live.`); skipped++; continue; }
    const matches = (await ghl.searchContacts(t.email)).filter(x => (x.email || '').toLowerCase() === t.email.toLowerCase());
    if (!matches.length) { console.log(`   SKIP ${t.name} <${t.email}> — no live GHL match.`); skipped++; continue; }
    for (const c of matches) {
      const before = tagsOf(c);
      const rm = t.remove.filter(x => before.includes(x));
      const ad = t.add.filter(x => !before.includes(x));
      for (const tag of rm) await ghl.removeTagFromContact(c.id, tag);
      for (const tag of ad) await ghl.addTagToContact(c.id, tag);
      console.log(`   ${t.name} ${c.id}: -[${rm.join(', ') || '—'}] +[${ad.join(', ') || '—'}]`);
      appendFileSync(LOG, `- ${t.name} ${c.id}: removed [${rm.join(' ')}], added [${ad.join(' ')}] · UNDO: re-add removed / remove added · before=[${before.join(' ')}]\n`);
    }
    done++;
  }
  console.log(`\n✓ bucket ${bucket}: ${done} people updated, ${skipped} skipped. Logged → ${LOG}`);
}
