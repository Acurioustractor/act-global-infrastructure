#!/usr/bin/env node
// Build the "Eighteen voices" cast-wall HTML block for minderoo-pitch.html.
// Merges quotes (locked) + avatars (pulled from data/pitch/*.json storytellers).
// Writes the block to data/pitch/cast-wall.html for injection.

import { readFileSync, writeFileSync } from 'fs';
import path from 'node:path';

// 18 cast members, in pitch-arc order: Oonchiumpa → PICC → BG Fit → Diagrama.
const cast = [
  { beat: 'Oonchiumpa (Mparntwe)', voices: [
    { name: 'Kristy Bloomfield',        role: 'Elder · Traditional Owner', files: ['oonchiumpa'],
      quote: "That's what happens when you lead with culture instead of compliance.",
      footer: "Bloomfield and Liddle families · Love's Creek / Atnarpa" },
    { name: 'Henry Bloomfield',         role: 'Elder · Ross River',        files: ['oonchiumpa'],
      quote: "I grew up between here and Ross River as a kid. It's good to be back home. To grow my kids up here.",
      footer: '67 years old · Aboriginal Australian' },
    { name: 'Tanya Turner',             role: 'Traditional owner · Eastern/Central Australian Aboriginal', files: ['oonchiumpa'],
      quote: "Our young people need to know they are valued. Not by the system, but by their own mob.",
      footer: 'Founders framing line, Oonchiumpa' },
    { name: 'Braydon Dema',             role: 'Young person · Ross River', files: ['oonchiumpa'],
      quote: "We're here with 55 judges, showing them how we live. Pops country.",
      footer: 'On hosting 55 judges at Atnarpa, April 2026' },
    { name: 'Nigel Alice',              role: 'Young person · Alice Springs · 14', files: ['oonchiumpa'],
      quote: "When I'm talking to the judge, I feel like I'm panicking.",
      footer: 'On being in court · interviewed 2026' },
    { name: 'Jackquann',                role: 'Young person · Alice Springs · 14', files: ['justicehub', 'oonchiumpa'],
      quote: "Detention. That's not my home.",
      footer: 'Detained at Alice Springs Youth Detention Centre' },
    { name: 'Laquisha',                 role: 'Young person · Alice Springs · 16', files: ['justicehub', 'oonchiumpa'],
      quote: "It would've been better hanging around with family instead of sitting in your cell by yourself. Twelve-minute calls. Two hours waiting for the next one.",
      footer: 'On the Darwin youth detention centre · the cause: "oppression"' },
  ]},
  { beat: 'Palm Island Community Company', voices: [
    { name: 'Allan Palm Island',        role: 'Elder · Manbarra, Wulgurukaba', files: ['picc'],
      quote: 'Go back to country and come back home to find ourselves, and teach the kids the history.',
      footer: 'Bwgcolman · Palm Island Elders Advisory Group' },
    { name: 'Aunty Ethel Robertson',    role: 'Elder · Palm Island',        files: ['picc'],
      quote: "A lot of the young generation still don't know the stories. I used to find time for the young people because they wanted to know.",
      footer: 'Aboriginal Australian · Palm Island Elders Advisory Group' },
    { name: 'Rachel Atkinson',          role: 'CEO, Palm Island Community Company · Yorta Yorta', files: ['picc'],
      quote: "They're our ancestors in the future, so we've gotta make it right for them.",
      footer: '217 staff. 87% Aboriginal or Torres Strait Islander.' },
    { name: 'Elders Group',             role: 'PICC Elders Advisory Group', files: ['picc'],
      quote: 'We should have been consulted.',
      footer: 'On exclusion from 2024 cyclone emergency planning' },
  ]},
  { beat: 'BG Fit (Mount Isa / Doomadgee)', voices: [
    { name: 'Brodie Germaine',          role: 'Founder, BG Fit · Gadigal', files: ['bg-fit'],
      quote: "Some of these kids have never had anyone believe in them before. When you show up every week, that means something.",
      footer: 'Started BG Fit from a Tuesday PCYC gym session' },
    { name: 'Uncle George',             role: 'Elder · Kalkadoon',          files: ['bg-fit'],
      quote: "You've got to learn to speak from the heart. If you speak from the heart and you tell the truth, people listen.",
      footer: 'Former Police Liaison Officer · engaged 400–500 kids a week in schools' },
    { name: 'Jay',                      role: 'Young person · Mount Isa',    files: ['bg-fit'],
      quote: 'I just get too bored, and I just get angry sometimes.',
      footer: 'On what causes offending in Mount Isa' },
    { name: 'Benji',                    role: 'Young person · Mount Isa',    files: ['bg-fit'],
      quote: 'Brodie, he know half of the black people. He been around the world.',
      footer: 'Why young people trust Brodie at the BG Fit gym' },
    { name: 'Rashad Gavin Isaacson',    role: 'Kalkadoon Sundowners dance crew · young person', files: ['bg-fit'],
      quote: "Culture. It's everything. It's part of my culture.",
      footer: 'NAIDOC Week, Mount Isa, 2026' },
  ]},
  { beat: 'Diagrama (Spain — comparator)', voices: [
    { name: 'David Romero McGuire PhD', role: 'Chief executive, Diagrama UK · British', files: ['diagrama'],
      quote: 'They were shocked about what they saw — the difference between the UK and Spain.',
      footer: 'On BBC reporting on Spanish youth justice · working with Australia since 2015' },
    { name: 'Young People Murcia',      role: 'Group voice · Diagrama Spain', files: ['diagrama'],
      quote: "You have an educator you can talk to when you're angry. It's more calming.",
      footer: 'Murcia centre, Spain · open house, ping-pong, sports twice a week' },
  ]},
];

// Load avatars from EL v2 pitch exports.
const DIR = 'data/pitch';
const cache = new Map();
function load(key) {
  if (cache.has(key)) return cache.get(key);
  const d = JSON.parse(readFileSync(path.join(DIR, key + '.json'), 'utf8'));
  cache.set(key, d);
  return d;
}

function avatarFor(member) {
  for (const f of member.files) {
    const d = load(f);
    const st = (d.storytellers || []).find((s) => {
      const n = (s.display_name || s.name || '').toLowerCase();
      if (n === member.name.toLowerCase()) return true;
      const tokens = member.name.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
      return tokens.every((t) => n.includes(t));
    });
    if (st) {
      const url = st.public_avatar_url || st.profile_image_url || st.avatar_url;
      if (url) return url;
    }
  }
  return null;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const parts = [];
parts.push('<!-- EIGHTEEN VOICES · locked cast for the Minderoo envelope -->');
parts.push('<!-- Built 2026-04-22 from data/pitch/*.json + Descript transcripts. -->');
parts.push('<!-- To refresh: run scripts/pitch-build-cast-wall.mjs and paste output. -->');
parts.push('<section class="section" style="background: var(--m-cream-2)" id="eighteen-voices">');
parts.push('  <div class="container-narrow text-center mb-12">');
parts.push('    <div class="eyebrow mb-3">Empathy Ledger · eighteen voices · consented corpus</div>');
parts.push('    <h2 class="text-4xl md:text-5xl mb-4" style="font-weight:500">Eighteen voices. Four communities. One ledger.</h2>');
parts.push('    <p class="serif-italic text-lg text-stone-700 leading-relaxed">Every quote below is the storyteller\'s own words, recorded and consented in Empathy Ledger v2. Ten Elders and organisational leaders. Eight young people, four of them speaking directly from detention or court. Spain is the comparator; everyone else is the argument.</p>');
parts.push('  </div>');

for (const beat of cast) {
  parts.push('  <div class="container mb-12">');
  parts.push(`    <div class="eyebrow mb-6 text-center" style="color:var(--m-stone-soft)">${esc(beat.beat)}</div>`);
  parts.push('    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">');
  for (const m of beat.voices) {
    const avatar = avatarFor(m);
    const photoBlock = avatar
      ? `<div style="width:80px;height:80px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--m-cream)"><img src="${esc(avatar)}" alt="${esc(m.name)}" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div>`
      : `<div style="width:80px;height:80px;border-radius:50%;background:var(--m-cream);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--m-stone-soft);font-size:28px;font-family:'Cormorant Garamond',serif;font-style:italic">${esc(m.name.charAt(0))}</div>`;
    parts.push('      <article style="background:white;border:1px solid var(--m-cream);border-radius:6px;padding:24px;display:flex;flex-direction:column;gap:16px">');
    parts.push('        <header style="display:flex;gap:16px;align-items:center">');
    parts.push(`          ${photoBlock}`);
    parts.push('          <div style="flex:1;min-width:0">');
    parts.push(`            <div style="font-size:17px;font-weight:600;color:var(--m-stone);line-height:1.2">${esc(m.name)}</div>`);
    parts.push(`            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--m-stone-soft);margin-top:4px">${esc(m.role)}</div>`);
    parts.push('          </div>');
    parts.push('        </header>');
    parts.push(`        <blockquote class="pullquote" style="font-size:19px;line-height:1.35;color:var(--m-stone);border-left:3px solid var(--m-gold);padding-left:16px;margin:0">&ldquo;${esc(m.quote)}&rdquo;</blockquote>`);
    parts.push(`        <footer style="font-size:12px;color:var(--m-stone-soft);font-style:italic;line-height:1.5;margin-top:auto">${esc(m.footer)}</footer>`);
    parts.push('      </article>');
  }
  parts.push('    </div>');
  parts.push('  </div>');
}

parts.push('  <div class="container-narrow text-center mt-4">');
parts.push('    <p class="caption">Every voice on this page is consented under OCAP governance. Elder-approved where elder approval is required. Revocable within 24 hours. The system holding the quotes is the system the envelope funds.</p>');
parts.push('  </div>');
parts.push('</section>');

const html = parts.join('\n');
writeFileSync('data/pitch/cast-wall.html', html);
console.log('Wrote data/pitch/cast-wall.html (' + html.length + ' bytes)');

// Avatar stats
let withAvatar = 0, without = 0;
for (const beat of cast) for (const m of beat.voices) avatarFor(m) ? withAvatar++ : without++;
console.log('Avatars: ' + withAvatar + ' of ' + (withAvatar + without));
