#!/usr/bin/env node
// Dump story CONTENT per cast member (storyteller's own words) for quote picking.
// Transcripts are null in this export; stories carry the real prose.

import fs from 'node:fs';
import path from 'node:path';

const cast = [
  { name: 'Kristy Bloomfield',        files: ['oonchiumpa'] },
  { name: 'Henry Bloomfield',         files: ['oonchiumpa'] },
  { name: 'Tanya Turner',             files: ['oonchiumpa'] },
  { name: 'Braydon Dema',             files: ['oonchiumpa'] },
  { name: 'Nigel Alice',              files: ['oonchiumpa'] },
  { name: 'Jackquann',                files: ['justicehub', 'oonchiumpa'] },
  { name: 'Laquisha',                 files: ['justicehub', 'oonchiumpa'] },
  { name: 'Allan Palm Island',        files: ['picc'] },
  { name: 'Aunty Ethel Robertson',    files: ['picc'] },
  { name: 'Rachel Atkinson',          files: ['picc'] },
  { name: 'Elders Group',             files: ['picc'] },
  { name: 'Brodie Germaine',          files: ['bg-fit'] },
  { name: 'Uncle George',             files: ['bg-fit'] },
  { name: 'Jay',                      files: ['bg-fit'] },
  { name: 'Benji - Young Person',     files: ['bg-fit'] },
  { name: 'Rashad Gavin Isaacson',    files: ['bg-fit'] },
  { name: 'David Romero McGuire',     files: ['diagrama'] },
  { name: 'Young People Murcia',      files: ['diagrama'] },
];

const DIR = 'data/pitch';
const cache = new Map();
function load(key) {
  if (cache.has(key)) return cache.get(key);
  const p = path.join(DIR, key + '.json');
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  cache.set(key, d);
  return d;
}

function findStoryteller(d, name) {
  const tokens = name.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  return (d.storytellers || []).find((st) => {
    const n = (st.display_name || st.name || '').toLowerCase();
    if (n === name.toLowerCase()) return true;
    return tokens.every((t) => n.includes(t));
  });
}

const out = [];
out.push('='.repeat(90));
out.push('CAST STORY CONTENT — pick quotes from here');
out.push('Generated 2026-04-22 · 18 voices · Minderoo pitch');
out.push('='.repeat(90));

for (const member of cast) {
  out.push('');
  out.push('#'.repeat(90));
  out.push(`# ${member.name}`);
  out.push('#'.repeat(90));

  let anyContent = false;
  for (const f of member.files) {
    const d = load(f);
    const st = findStoryteller(d, member.name);
    if (!st) continue;
    const stories = (d.stories || []).filter((s) => s.storyteller_id === st.id);
    const transcripts = (d.transcripts || []).filter((t) => t.storyteller_id === st.id);
    for (const s of stories) {
      if (!s.content) continue;
      anyContent = true;
      out.push('');
      out.push(`[story · ${f}] ${s.title || '(untitled)'}`);
      out.push(`  public=${s.is_public} · elder_ok=${!!s.elder_approved_at} · themes=${(s.themes||[]).join(', ')}`);
      out.push('');
      out.push(s.content.trim());
    }
    for (const t of transcripts) {
      if (!t.content) continue;
      anyContent = true;
      out.push('');
      out.push(`[transcript · ${f}] ${t.title || '(untitled)'}`);
      out.push(s => '  words=' + (t.word_count || '?'));
      out.push(typeof t.content === 'string' ? t.content.trim() : JSON.stringify(t.content));
    }
  }
  if (!anyContent) {
    out.push('');
    out.push(`(no story content; transcripts may exist without text. Files checked: ${member.files.join(', ')})`);
  }
}

const outPath = path.join(DIR, 'cast-content.txt');
fs.writeFileSync(outPath, out.join('\n'));
console.log('Wrote', outPath);
console.log('Size:', fs.statSync(outPath).size, 'bytes');
