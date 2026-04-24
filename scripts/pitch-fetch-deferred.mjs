#!/usr/bin/env node
// Fetch transcript CONTENT from EL v2 REST API for the 7 deferred pitch storytellers.
// Output: data/pitch/deferred-transcripts.txt · writes file only, never echoes keys.
// Pattern borrowed from scripts/read-el-story.mjs (already-approved EL v2 read path).

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Load EL v2 env alongside project env, same convention as read-el-story.mjs.
try {
  const elEnv = readFileSync(join(process.env.HOME, 'Code/empathy-ledger-v2/.env.local'), 'utf8');
  for (const line of elEnv.split('\n')) {
    const [k, ...rest] = line.split('=');
    if (k && rest.length > 0 && !process.env[`EL_${k}`]) process.env[`EL_${k}`] = rest.join('=').trim();
  }
} catch { /* fall back to root env */ }
try {
  const rootEnv = readFileSync(join(process.env.PWD || '.', '.env.local'), 'utf8');
  for (const line of rootEnv.split('\n')) {
    const [k, ...rest] = line.split('=');
    if (k && rest.length > 0 && !process.env[k]) process.env[k] = rest.join('=').trim();
  }
} catch { /* ignore */ }

const SUPABASE_URL = process.env.EL_SUPABASE_URL || process.env.EL_NEXT_PUBLIC_SUPABASE_URL || process.env.STORY_SUPABASE_URL;
const KEY = process.env.EL_SUPABASE_SERVICE_KEY
  || process.env.EL_SUPABASE_SERVICE_ROLE_KEY
  || process.env.STORY_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !KEY) {
  console.error('Missing EL v2 URL or service key in env.');
  process.exit(1);
}

const deferred = [
  { name: 'Tanya Turner',          storyteller_id: 'dc85700d-f139-46fa-9074-6afee55ea801' },
  { name: 'Nigel Alice',           storyteller_id: 'a4bcc6f9-dc98-4f53-b99c-b5e3391a2760' },
  { name: 'Jackquann',             storyteller_id: '6a86acf2-1701-41a9-96ef-d3bae49d91b3' },
  { name: 'Laquisha',              storyteller_id: '7a0cd28a-ad12-4f70-b900-d869b42c9f88' },
  { name: 'Uncle George',          storyteller_id: '0d69f085-dfc5-4a7e-bf03-f9bdb5099d7f' },
  { name: 'Jay',                   storyteller_id: 'c79b6dc3-4cdb-4af3-a6d6-2f7065d361b3' },
  { name: 'Rashad Gavin Isaacson', storyteller_id: '872024ec-984b-4d8e-ae10-e536b491f66f' },
];

async function fetchTranscripts(storyteller_id) {
  const q = new URL(SUPABASE_URL + '/rest/v1/transcripts');
  q.searchParams.set('select', 'id,title,content,word_count,created_at');
  q.searchParams.set('storyteller_id', 'eq.' + storyteller_id);
  const r = await fetch(q.toString(), {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY },
  });
  if (!r.ok) throw new Error('transcript fetch ' + r.status);
  return r.json();
}

async function fetchStories(storyteller_id) {
  const q = new URL(SUPABASE_URL + '/rest/v1/stories');
  q.searchParams.set('select', 'id,title,content,is_public,themes,created_at');
  q.searchParams.set('storyteller_id', 'eq.' + storyteller_id);
  const r = await fetch(q.toString(), {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY },
  });
  if (!r.ok) throw new Error('story fetch ' + r.status);
  return r.json();
}

const out = [];
out.push('='.repeat(90));
out.push('DEFERRED CAST — transcripts + stories pulled directly from EL v2');
out.push('Generated ' + new Date().toISOString());
out.push('='.repeat(90));

for (const member of deferred) {
  out.push('');
  out.push('#'.repeat(90));
  out.push('# ' + member.name);
  out.push('#'.repeat(90));

  try {
    const [transcripts, stories] = await Promise.all([
      fetchTranscripts(member.storyteller_id),
      fetchStories(member.storyteller_id),
    ]);

    out.push('');
    out.push(`Transcripts: ${transcripts.length} · Stories: ${stories.length}`);

    for (const t of transcripts) {
      out.push('');
      out.push(`[transcript] ${t.title || '(untitled)'}  (${t.word_count || '?'} words)`);
      const c = typeof t.content === 'string' ? t.content : JSON.stringify(t.content);
      out.push(c || '(content null)');
    }
    for (const s of stories) {
      out.push('');
      out.push(`[story] ${s.title || '(untitled)'}  public=${s.is_public}`);
      const c = typeof s.content === 'string' ? s.content : JSON.stringify(s.content);
      out.push(c || '(content null)');
    }
  } catch (e) {
    out.push('');
    out.push('ERROR: ' + e.message);
  }
}

const outPath = 'data/pitch/deferred-transcripts.txt';
writeFileSync(outPath, out.join('\n'));
console.log('Wrote', outPath, '·', out.length, 'lines');
