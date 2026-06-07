#!/usr/bin/env node
/**
 * build-project-needs-match.mjs — Stage F of the energy-orbit system: project NEEDS → orbit PEOPLE.
 *
 * The fourth read-only reconciler. Reads thoughts/shared/unified-orbit-worklist.csv (the orbit),
 * maps each of ACT's five projects to its energy/resource NEEDS (grounded in
 * wiki/concepts/act-business-architecture.md), and surfaces SUPPORTER-lane candidates whose
 * signal fits each need. Writes a worklist CSV + prints a summary. No DB / GHL writes.
 *
 * HARD GUARDRAIL — the community line: people in the community lane (storytellers / elders /
 * community-controlled / community-line-violations) are NEVER matched as a "resource" to a
 * project need. That is the extraction this whole system refuses. They live in the constellation
 * (build-contributor-constellation.mjs) and are measured by what ACT OWES them, not by their use.
 * This matcher operates on the SUPPORTER lane only.
 *
 * Matching is CANDIDATE-surfacing for Ben's judgement, not assignment. Signals used:
 *   - project affinity:  comms:<project>-newsletter / -drip membership (the only project signal
 *                        the orbit carries — project: tags live on ghl_contacts, not here)
 *   - need-type via role: funder→capital · buyer→revenue · supplier→supply · partner→delivery ·
 *                        advisory/researcher→technical/governance · media/corporate→reach/clients
 *   - warmth:            beeper_score (generative/light) · gmail two-way · tier — to rank who's
 *                        actually reachable warm vs a cold name.
 *
 * Run:  node scripts/build-project-needs-match.mjs
 * Out:  thoughts/shared/project-needs-match.csv
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

// ── tiny CSV parser (quoted fields, embedded commas) ───────────────────────
function parseCSV(text) {
  const rows = []; let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const raw = parseCSV(readFileSync('thoughts/shared/unified-orbit-worklist.csv', 'utf8'));
const header = raw[0];
const people = raw.slice(1).filter(r => r.length === header.length).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));

// ── community-lane exclusion (the guardrail) ───────────────────────────────
const isCommunity = p => {
  const t = (p.rel_tags || '').toLowerCase();
  return p.status === 'community'
    || /lane:community/.test((p.ptag || '').toLowerCase())
    || /role:storyteller|role:elder|role:community\b|community-controlled|\belder\b/.test(t)
    || /COMMUNITY-LINE-VIOL/.test(p.flags || '');
};
// ACT's own team are not an external resource pool — exclude from need-matching.
const isInternal = p => /@act\.place$/i.test(p.email || '') || /^(ben knight|benjamin knight|nicholas marchesi|nic marchesi)$/i.test((p.name || '').trim());
const supporters = people.filter(p => p.name && !isCommunity(p) && !isInternal(p));
console.log(`${people.length} orbit people · ${supporters.length} on the supporter lane (community lane + ACT team held out of need-matching).`);

// ── warmth score (who is actually reachable, warm) ─────────────────────────
const tierRank = { 'tier:steward': 5, 'tier:active': 4, 'tier:member': 3, 'tier:connected': 2, 'tier:curious': 1 };
function warmth(p) {
  const tags = (p.rel_tags || '').toLowerCase();
  let contact = 0, why = [];
  const bs = Number(p.beeper_score);
  if (bs > 0) { contact += bs; why.push(`beeper ${p.beeper_pattern || bs}`); }
  const [gi, go] = (p.gmail_in_out || '').split('/').map(Number);
  if (gi && go) { contact += Math.min(gi, go) * 2; why.push(`gmail 2-way ${p.gmail_in_out}`); }      // two-way email is the real signal
  let s = contact;
  for (const [t, r] of Object.entries(tierRank)) if (tags.includes(t)) { s += r * 5; why.push(t.replace('tier:', 'tier-')); break; }
  // contact = real two-way signal only; score adds tier rank for PRIORITY ranking.
  // Consumers judge "warm enough to ask" on contact, never score — tier+affinity alone
  // can clear 20 with zero actual contact (110 such rows before this split).
  return { score: s, contact, why: why.join(', ') || 'cold/uncaught' };
}

// ── the five projects + their grounded needs ───────────────────────────────
// affinity = comms-tag regex; roles = role tokens that satisfy each need-type.
const PROJECTS = [
  { key: 'JusticeHub (incl. Contained)', affinity: /comms:justicehub/, needs: [
      { type: 'capital — grants (its lifeblood, grant-funded)', roles: ['funder'] },
      { type: 'justice-sector partners & champions (Contained pods)', roles: ['partner', 'advisory'] },
      { type: 'evidence / research collaborators', roles: ['researcher', 'media'] },
  ] },
  { key: 'Goods on Country', affinity: /comms:goods|comms:buyer/, needs: [
      { type: 'revenue — anchor buyers (councils / ACCHOs)', roles: ['buyer', 'council', 'health-service'] },
      { type: 'supply chain', roles: ['supplier'] },
      { type: 'capital — grants / philanthropy (Minderoo, QBE)', roles: ['funder'] },
      { type: 'delivery / community-production partners', roles: ['partner'] },
  ] },
  { key: 'The Harvest', affinity: /comms:harvest/, needs: [
      { type: 'the physical centre — local community, volunteers, day-attendees', roles: ['supporter', 'partner'], audienceNeed: true },
      { type: 'produce buyers / eco-tourism revenue', roles: ['buyer'] },
  ] },
  { key: 'CivicGraph (deferred spinout)', affinity: /$^/, needs: [   // no comms audience yet — role/skill match only
      { type: 'technical talent & data partners', roles: ['researcher', 'advisory'] },
      { type: 'SaaS pilots / early customers', roles: ['corporate', 'gov', 'council'] },
      { type: 'raise capital (investors at spinout)', roles: ['funder'] },
  ] },
  { key: 'Studio (Innovation + Regen — the earner)', affinity: /comms:act-newsletter/, needs: [
      { type: 'consulting clients (funds the platforms)', roles: ['corporate', 'gov'] },
      { type: 'creative / build collaborators & brand reach', roles: ['media', 'advisory', 'supporter'], audienceNeed: true },
  ] },
];
// named latent-energy people the orbit flagged as "reached in, never caught" (energy-orbit.md)
const LATENT = /phoebe frederick|terry hutchinson|anurag gummadi/i;

// emit the canonical needs catalog (ALL needs, matched or not) so the scope board can show empty-cell GAPS
writeFileSync('thoughts/shared/project-needs-catalog.json',
  JSON.stringify(PROJECTS.map(p => ({ project: p.key, needs: p.needs.map(n => n.type) })), null, 2));

function rolesOf(p) { return [...(p.rel_tags || '').toLowerCase().matchAll(/role:([a-z0-9-]+)/g)].map(m => m[1]); }

// ── ask-state from the circle-session ledger (the human's read wins) ────────
// A declared "NO to <project>" removes that person from that project's candidate pool —
// coverage must reflect answers, not tags (Lucy had declined JusticeHub while the board
// still showed her covering its capital need). Free-text match on the project word.
const PROJ_WORDS = { 'JusticeHub': /justicehub/i, 'Goods': /goods/i, 'The Harvest': /harvest/i, 'CivicGraph': /civicgraph/i, 'Studio': /studio/i };
const declines = new Map(); // norm(name) -> Set(project keys declined)
if (existsSync('thoughts/shared/field-decisions.jsonl'))
  for (const l of readFileSync('thoughts/shared/field-decisions.jsonl', 'utf8').split('\n').filter(Boolean)) {
    try {
      const d = JSON.parse(l); if (!d.ask_state || !/\bNO\b/i.test(d.ask_state)) continue;
      const k = (d.name || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
      for (const proj of PROJECTS) for (const [word, re] of Object.entries(PROJ_WORDS))
        if (proj.key.includes(word) && re.test(d.ask_state) && new RegExp(`NO[^·]*${word}`, 'i').test(d.ask_state))
          (declines.get(k) || declines.set(k, new Set()).get(k)).add(proj.key);
    } catch {}
  }
if (declines.size) console.log(`ask-state declines loaded: ${[...declines.entries()].map(([n, s]) => `${n} ✗ ${[...s].join('/')}`).join(' · ')}`);

// ── match ──────────────────────────────────────────────────────────────────
const out = [];
for (const proj of PROJECTS) {
  for (const need of proj.needs) {
    for (const p of supporters) {
      const nk = (p.name || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
      if (declines.get(nk)?.has(proj.key)) continue;   // they answered NO — not a candidate
      const roles = rolesOf(p);
      const hasRole = need.roles.some(r => roles.includes(r));
      const hasAffinity = proj.affinity.source !== '$^' && proj.affinity.test(p.rel_tags || '');
      // role gates every need; newsletter-affinity ALONE qualifies only genuine audience needs
      // (Harvest place, Studio reach). Otherwise affinity just boosts warmth/priority.
      const qualifies = hasRole || (need.audienceNeed && hasAffinity);
      if (!qualifies) continue;
      const w = warmth(p);
      const affinityBoost = hasAffinity ? 10 : 0;   // project-aligned beats generic
      const signals = [hasAffinity ? 'project-newsletter' : null, hasRole ? `role:${need.roles.filter(r => roles.includes(r)).join('/')}` : null, LATENT.test(p.name) ? 'LATENT — reached in, never caught' : null].filter(Boolean).join(' · ');
      out.push({
        project: proj.key, need: need.type, name: p.name,
        why: `${signals} | ${w.why}`, warmth: w.score + affinityBoost, contact_warmth: w.contact,
        email: p.email, phone: p.phone, in_ghl: p.in_ghl, action: p.home,
      });
    }
  }
}
// dedupe a person within the same project+need, keep highest warmth; then rank
const seen = new Map();
for (const r of out) { const k = `${r.project}|${r.need}|${r.name}`; if (!seen.has(k) || seen.get(k).warmth < r.warmth) seen.set(k, r); }
const rows = [...seen.values()].sort((a, b) => a.project.localeCompare(b.project) || a.need.localeCompare(b.need) || b.warmth - a.warmth);

const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
const cols = ['project', 'need', 'name', 'why', 'warmth', 'contact_warmth', 'email', 'phone', 'in_ghl', 'action'];
writeFileSync('thoughts/shared/project-needs-match.csv', [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n'));

// ── summary ──────────────────────────────────────────────────────────────
console.log(`\nWrote ${rows.length} candidate matches → thoughts/shared/project-needs-match.csv\n`);
for (const proj of PROJECTS) {
  console.log(`■ ${proj.key}`);
  for (const need of proj.needs) {
    const m = rows.filter(r => r.project === proj.key && r.need === need.type).sort((a, b) => b.warmth - a.warmth);
    const warm = m.filter(r => r.warmth > 0);
    console.log(`   ${need.type} — ${m.length} candidates (${warm.length} warm):`);
    for (const r of m.slice(0, 4)) console.log(`       ${String(r.warmth).padStart(3)} · ${r.name}${r.why.includes('LATENT') ? '  ⭐LATENT' : ''}`);
  }
  console.log('');
}
console.log('NOTE: CANDIDATES for Ben\'s judgement, not assignments. Community lane HELD OUT (owes-ledger only).');
console.log('Affinity = comms-newsletter membership (project: tags live on ghl_contacts, not the orbit). ⭐ = reached in, never caught.');
