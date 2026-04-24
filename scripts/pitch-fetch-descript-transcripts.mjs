#!/usr/bin/env node
// Fetch actual transcript text from Descript share pages for the 5 still-deferred voices.
// Descript pages embed a signed URL to transcript.json; we follow it and extract paragraphs.

import { writeFileSync } from 'fs';

const targets = [
  { name: 'Nigel Alice',           url: 'https://share.descript.com/view/81eXhBcx1sq' },
  { name: 'Jackquann',             url: 'https://share.descript.com/view/iMkgYckmB6r' },
  { name: 'Laquisha',              url: 'https://share.descript.com/view/upRsPoO2uG8' },
  { name: 'Jay',                   url: 'https://share.descript.com/view/CBFA59vK0Cv' },
  { name: 'Rashad Gavin Isaacson', url: 'https://share.descript.com/view/8ywPFEnrUp4' },
];

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

async function fetchShare(shareUrl) {
  const r = await fetch(shareUrl, { headers: { 'User-Agent': UA } });
  const html = await r.text();
  // Find the transcript URL embedded in page state (HTML-escaped)
  const m = html.match(/"transcript"\s*:\s*\{\s*"url"\s*:\s*"([^"]+)"/);
  if (!m) return null;
  const transcriptUrl = m[1].replace(/&amp;/g, '&');
  return transcriptUrl;
}

async function fetchTranscriptJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error('transcript.json ' + r.status);
  return r.json();
}

function extractText(tx) {
  // Descript transcript.json shape varies. Common shapes:
  //   { paragraphs: [{ words: [{ text }] }] }
  //   { blocks: [{ children: [{ text }] }] }
  //   { text: "..." }
  if (tx.text && typeof tx.text === 'string') return tx.text;

  const paragraphs = [];

  // Shape 1: paragraphs[].words[]
  if (Array.isArray(tx.paragraphs)) {
    for (const p of tx.paragraphs) {
      const speaker = p.speaker_name || p.speaker || '';
      let line = '';
      if (Array.isArray(p.words)) line = p.words.map((w) => w.text || w.word || '').join('');
      else if (typeof p.text === 'string') line = p.text;
      if (line.trim()) paragraphs.push((speaker ? speaker + ': ' : '') + line.trim());
    }
    if (paragraphs.length) return paragraphs.join('\n\n');
  }

  // Shape 2: blocks[].children[]
  if (Array.isArray(tx.blocks)) {
    for (const b of tx.blocks) {
      if (Array.isArray(b.children)) {
        const line = b.children.map((c) => c.text || '').join('');
        if (line.trim()) paragraphs.push(line.trim());
      } else if (typeof b.text === 'string' && b.text.trim()) {
        paragraphs.push(b.text.trim());
      }
    }
    if (paragraphs.length) return paragraphs.join('\n\n');
  }

  // Fallback: dump keys so we can inspect
  return '(unrecognised transcript shape · keys=' + Object.keys(tx).join(',') + ')';
}

const out = [];
out.push('='.repeat(90));
out.push('DEFERRED CAST — Descript transcript text (fetched from share URLs)');
out.push('Generated ' + new Date().toISOString());
out.push('='.repeat(90));

for (const t of targets) {
  out.push('');
  out.push('#'.repeat(90));
  out.push('# ' + t.name);
  out.push('#'.repeat(90));
  out.push('source: ' + t.url);
  out.push('');

  try {
    const transcriptUrl = await fetchShare(t.url);
    if (!transcriptUrl) { out.push('(no transcript url in share page)'); continue; }
    const j = await fetchTranscriptJson(transcriptUrl);
    const text = extractText(j);
    out.push(text);
  } catch (e) {
    out.push('ERROR: ' + e.message);
  }
}

const path = 'data/pitch/descript-transcripts.txt';
writeFileSync(path, out.join('\n'));
console.log('Wrote', path);
