#!/usr/bin/env node
// Consolidated storyteller list across all pitch-export orgs.
// Output: grouped by org, one line per storyteller, role + heritage + content counts.
// Filter: any storyteller with an avatar OR a public story OR a transcript.

import fs from 'node:fs';
import path from 'node:path';

const DIR = 'data/pitch';
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && !f.endsWith('.insights.json'));

const orgLabel = {
  'act.json': 'A Curious Tractor',
  'bg-fit.json': 'BG Fit',
  'confit.json': 'Confit',
  'diagrama.json': 'Diagrama',
  'justicehub.json': 'JusticeHub',
  'mmeic.json': 'MMEIC',
  'mounty-yarns.json': 'Mounty Yarns',
  'oonchiumpa.json': 'Oonchiumpa',
  'orange-sky.json': 'Orange Sky',
  'picc.json': 'PICC',
  'young-guns.json': 'Young Guns',
};

const ordered = [
  'oonchiumpa.json',
  'picc.json',
  'bg-fit.json',
  'mmeic.json',
  'mounty-yarns.json',
  'act.json',
  'justicehub.json',
  'young-guns.json',
  'diagrama.json',
  'confit.json',
  'orange-sky.json',
];

function short(s, n) {
  if (!s) return '';
  const clean = String(s).replace(/\s+/g, ' ').trim();
  return clean.length > n ? clean.slice(0, n - 1) + '…' : clean;
}

function rolesOf(st) {
  const r = new Set();
  (st.roles || []).forEach((x) => r.add(x));
  (st.role_tags || []).forEach((x) => r.add(x));
  if (st.is_elder) r.add('Elder');
  if (st.is_cultural_authority) r.add('Cultural authority');
  return [...r].sort().join(' / ');
}

function heritageOf(st) {
  return st.cultural_background || st.heritage || st.community_affiliation || '';
}

let total = 0;
for (const file of ordered) {
  if (!files.includes(file)) continue;
  const data = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  const storytellers = data.storytellers || [];
  const stories = data.stories || [];
  const transcripts = data.transcripts || [];

  const pubBy = new Map();
  const txBy = new Map();
  for (const s of stories) {
    if (!s.is_public) continue;
    const ids = s.storyteller_ids && s.storyteller_ids.length ? s.storyteller_ids : [s.storyteller_id].filter(Boolean);
    for (const id of ids) {
      pubBy.set(id, (pubBy.get(id) || 0) + 1);
    }
  }
  for (const t of transcripts) {
    const id = t.storyteller_id;
    if (id) txBy.set(id, (txBy.get(id) || 0) + 1);
  }

  const rows = storytellers
    .map((st) => {
      const hasAvatar = Boolean(st.profile_image_url || st.public_avatar_url || st.avatar_url);
      const pub = pubBy.get(st.id) || 0;
      const tx = txBy.get(st.id) || 0;
      return { st, hasAvatar, pub, tx };
    })
    .filter(({ hasAvatar, pub, tx }) => hasAvatar || pub > 0 || tx > 0)
    .sort((a, b) => {
      const score = (r) => (r.pub > 0 ? 2 : 0) + (r.tx > 0 ? 1 : 0) + (r.hasAvatar ? 0.1 : 0);
      return score(b) - score(a) || b.pub - a.pub || b.tx - a.tx;
    });

  if (rows.length === 0) continue;
  console.log('');
  console.log(`## ${orgLabel[file]}  (${rows.length} storytellers available)`);
  console.log('');
  console.log('   flags | name                                 | roles                                          | heritage                                 | pub | tx');
  console.log('   ----- + ------------------------------------ + ---------------------------------------------- + ---------------------------------------- + --- + ---');
  for (const { st, hasAvatar, pub, tx } of rows) {
    const flags =
      (hasAvatar ? '📸' : '  ') + (pub > 0 ? '📖' : '  ') + (tx > 0 ? '📝' : '  ');
    const name = short(st.name || st.display_name || '(unnamed)', 36).padEnd(36);
    const roles = short(rolesOf(st), 46).padEnd(46);
    const heritage = short(heritageOf(st), 40).padEnd(40);
    console.log(`   ${flags} | ${name} | ${roles} | ${heritage} | ${String(pub).padStart(3)} | ${String(tx).padStart(3)}`);
  }
  total += rows.length;
}

console.log('');
console.log(`Total: ${total} storytellers across all anchors.`);
console.log('Legend: 📸=avatar · 📖=has public story · 📝=has transcript · sorted by pitch-readiness.');
