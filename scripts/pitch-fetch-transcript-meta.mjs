#!/usr/bin/env node
// Probe transcript metadata (ai_analysis, source_video_url, etc.) for the 5 still-empty deferred voices.
// Raw content is null in EL v2 transcripts — maybe metadata has themes/quotes or the source URL.

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

try {
  const rootEnv = readFileSync(join(process.env.PWD || '.', '.env.local'), 'utf8');
  for (const line of rootEnv.split('\n')) {
    const [k, ...rest] = line.split('=');
    if (k && rest.length > 0 && !process.env[k]) process.env[k] = rest.join('=').trim();
  }
} catch {}

const SUPABASE_URL = process.env.EL_SUPABASE_URL || process.env.STORY_SUPABASE_URL;
const KEY = process.env.EL_SUPABASE_SERVICE_KEY || process.env.STORY_SUPABASE_SERVICE_ROLE_KEY;

const ids = [
  { name: 'Nigel Alice',           storyteller_id: 'a4bcc6f9-dc98-4f53-b99c-b5e3391a2760' },
  { name: 'Jackquann',             storyteller_id: '6a86acf2-1701-41a9-96ef-d3bae49d91b3' },
  { name: 'Laquisha',              storyteller_id: '7a0cd28a-ad12-4f70-b900-d869b42c9f88' },
  { name: 'Jay',                   storyteller_id: 'c79b6dc3-4cdb-4af3-a6d6-2f7065d361b3' },
  { name: 'Rashad Gavin Isaacson', storyteller_id: '872024ec-984b-4d8e-ae10-e536b491f66f' },
];

const out = [];
out.push('DEFERRED CAST — transcript metadata probe');
out.push('='.repeat(80));

for (const m of ids) {
  const q = new URL(SUPABASE_URL + '/rest/v1/transcripts');
  q.searchParams.set('select', 'id,title,word_count,source_video_url,source_video_platform,status,metadata');
  q.searchParams.set('storyteller_id', 'eq.' + m.storyteller_id);
  const r = await fetch(q.toString(), { headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
  const data = await r.json();
  out.push('');
  out.push('### ' + m.name);
  for (const t of data) {
    out.push('  transcript: ' + (t.title || '(untitled)') + '  (' + t.word_count + ' words)');
    out.push('    status: ' + t.status);
    out.push('    source_video_url: ' + (t.source_video_url || 'null'));
    out.push('    source_video_platform: ' + (t.source_video_platform || 'null'));
    const keys = Object.keys(t.metadata || {});
    out.push('    metadata keys: ' + keys.join(', '));
    if (t.metadata && t.metadata.ai_analysis) {
      const a = t.metadata.ai_analysis;
      const sub = Object.keys(a);
      out.push('    ai_analysis keys: ' + sub.join(', '));
      if (a.cultural_themes) out.push('    cultural_themes: ' + JSON.stringify(a.cultural_themes));
      if (a.knowledge_contributions) out.push('    knowledge_contributions: ' + JSON.stringify(a.knowledge_contributions).slice(0, 600));
      if (a.alma_signals && a.alma_signals.authority) out.push('    authority: ' + JSON.stringify(a.alma_signals.authority));
    }
  }
}

writeFileSync('data/pitch/deferred-meta.txt', out.join('\n'));
console.log('Wrote data/pitch/deferred-meta.txt');
