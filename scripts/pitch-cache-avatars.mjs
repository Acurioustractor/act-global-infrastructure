#!/usr/bin/env node
// Cache the 17 Supabase avatar URLs referenced in minderoo-pitch.html to a local
// directory, then rewrite the HTML to point at the local paths.
//
// Reason: 1 May 2026 envelope readability depends on the page not looking broken
// if Supabase storage is rate-limited or down. One-off build-time cache.

import { readFileSync, writeFileSync, createWriteStream } from 'fs';
import { mkdirSync, existsSync } from 'fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';

const PITCH = 'apps/command-center/public/minderoo-pitch.html';
const OUT_DIR = 'apps/command-center/public/minderoo-cast';

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const html = readFileSync(PITCH, 'utf8');

// Find every Supabase avatar URL in the file.
const urlPattern = /https:\/\/yvnuayzslukamizrlhwb\.supabase\.co\/storage\/v1\/object\/public\/[^"'\s]+/g;
const urls = [...new Set(html.match(urlPattern) || [])];
console.log(`Found ${urls.length} unique Supabase URLs.`);

function slugify(url) {
  // Use a short hash + best-guess name to keep filenames stable + readable.
  const tail = url.split('/').pop().replace(/\?.*$/, '');
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8);
  const ext = tail.match(/\.(jpe?g|png|webp|svg)$/i)?.[1]?.toLowerCase() || 'jpg';
  const base = tail.replace(/\.(jpe?g|png|webp|svg)$/i, '').slice(0, 40);
  return `${base}-${hash}.${ext}`;
}

function fetch(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'act-pitch-cache/1.0' } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const file = createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
      file.on('error', reject);
    }).on('error', reject);
  });
}

const urlToLocal = new Map();
let failed = 0;

for (const url of urls) {
  const filename = slugify(url);
  const dest = path.join(OUT_DIR, filename);
  const localPath = '/minderoo-cast/' + filename;

  if (existsSync(dest)) {
    urlToLocal.set(url, localPath);
    console.log('SKIP (cached):', filename);
    continue;
  }

  try {
    await fetch(url, dest);
    urlToLocal.set(url, localPath);
    console.log('OK   ', filename);
  } catch (e) {
    console.warn('FAIL ', url.slice(60), '→', e.message);
    failed++;
  }
}

// Rewrite the HTML.
let out = html;
for (const [url, local] of urlToLocal) {
  // Escape regex special chars in the URL.
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  out = out.replace(new RegExp(escaped, 'g'), local);
}

writeFileSync(PITCH, out);
console.log('');
console.log(`Rewrote ${PITCH}. ${urlToLocal.size} URLs replaced, ${failed} failed.`);
