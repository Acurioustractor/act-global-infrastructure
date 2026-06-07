#!/usr/bin/env node
/**
 * Inbound sync — Notion Contacts (Tags + Projects) → ghl_contacts.
 *
 * Notion is editable: Ben can add a tag, add a project chip, or mark a
 * contact's Sync Status. This script reads Notion as source-of-feedback
 * for those specific fields and writes diffs back to ghl_contacts.
 *
 * Critical scope rules:
 *   - ONLY Tags + Projects flow back. No name / email / phone / consent changes.
 *   - Tags + Projects in Notion are UNION-MERGED with ghl_contacts.tags /
 *     .projects. We never DELETE tags from ghl_contacts via inbound — only
 *     add. (To remove a tag, do it in GHL.)
 *   - Hard block on cultural-sensitivity overrides: never overwrite a
 *     contact flagged as is_elder or with sacred-knowledge tags.
 *   - Notion Sync Status = "blocked" skips the row entirely.
 *
 * After write, sets ghl_contacts.updated_at + sets Notion Sync Status =
 * "synced" so next outbound run respects the new state.
 *
 * Usage:
 *   node scripts/sync-notion-inbound-contacts.mjs            # dry-run, shows diffs
 *   node scripts/sync-notion-inbound-contacts.mjs --apply
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const TOKEN = process.env.NOTION_MIRROR_TOKEN;
const CONTACTS_DB = process.env.NOTION_CONTACTS_DB_ID;
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SACRED_TAG_PATTERNS = [/elder/i, /sacred/i, /restricted/i, /no-?contact/i];

let lastN = 0;
async function nfetch(path, init = {}) {
  const dt = Date.now() - lastN; if (dt < 350) await new Promise(r => setTimeout(r, 350 - dt)); lastN = Date.now();
  const r = await fetch(`https://api.notion.com/v1${path}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json', ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`Notion ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

console.log(`sync-notion-inbound-contacts — ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

// 1. Pull all Notion Contacts rows with their Tags + Projects + Sync Status
console.log('Loading Notion Contacts…');
const notionRows = [];
{
  let cursor = null;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const d = await nfetch(`/databases/${CONTACTS_DB}/query`, { method: 'POST', body: JSON.stringify(body) });
    for (const r of d.results) {
      notionRows.push({
        pageId: r.id,
        ghlId: r.properties['GHL ID']?.rich_text?.[0]?.plain_text || '',
        name: r.properties['Name']?.title?.[0]?.plain_text || '',
        tags: (r.properties['Tags']?.multi_select || []).map(t => t.name),
        projects: (r.properties['Projects']?.multi_select || []).map(t => t.name),
        elder: !!r.properties['Elder']?.checkbox,
        storyteller: !!r.properties['Storyteller']?.checkbox,
        syncStatus: r.properties['Sync Status']?.select?.name || null,
        lastEdited: r.last_edited_time,
      });
    }
    if (!d.has_more) break;
    cursor = d.next_cursor;
  }
}
console.log(`  loaded ${notionRows.length} Notion contacts`);

// 2. Pull ghl_contacts in one shot for the same ids
const ghlIds = notionRows.map(r => r.ghlId).filter(Boolean);
const ghlMap = new Map();
{
  let offset = 0;
  const page = 500;
  while (offset < ghlIds.length) {
    const slice = ghlIds.slice(offset, offset + page);
    const { data, error } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, tags, projects, is_elder, full_name, updated_at')
      .in('ghl_id', slice);
    if (error) throw error;
    for (const c of data || []) ghlMap.set(c.ghl_id, c);
    offset += page;
  }
}
console.log(`  matched ${ghlMap.size} ghl_contacts`);

// 3. Compute diffs (additions only)
const diffs = [];
let blocked = 0, noChange = 0;
for (const n of notionRows) {
  if (n.syncStatus === 'blocked') { blocked++; continue; }
  const g = ghlMap.get(n.ghlId);
  if (!g) continue;
  // Cultural sensitivity hard block
  if (g.is_elder || n.elder) continue;
  if ((g.tags || []).some(t => SACRED_TAG_PATTERNS.some(p => p.test(t)))) continue;

  const gTagSet = new Set((g.tags || []).map(s => String(s).toLowerCase()));
  const gProjSet = new Set((g.projects || []).map(s => String(s).toLowerCase()));
  const newTags = n.tags.filter(t => !gTagSet.has(t.toLowerCase()));
  const newProjects = n.projects.filter(p => !gProjSet.has(p.toLowerCase()));
  if (newTags.length === 0 && newProjects.length === 0) { noChange++; continue; }

  diffs.push({
    ghlId: n.ghlId,
    pageId: n.pageId,
    name: g.full_name || n.name,
    newTags,
    newProjects,
    mergedTags: [...new Set([...(g.tags || []), ...n.tags])].sort(),
    mergedProjects: [...new Set([...(g.projects || []), ...n.projects])].sort(),
  });
}

console.log(`\nDiff summary:`);
console.log(`  total Notion rows:        ${notionRows.length}`);
console.log(`  blocked (Sync Status):    ${blocked}`);
console.log(`  no change:                ${noChange}`);
console.log(`  needs inbound write:      ${diffs.length}`);

if (diffs.length === 0) { console.log('\nNothing to sync. Done.'); process.exit(0); }

console.log(`\nSample diffs (first 10):`);
for (const d of diffs.slice(0, 10)) {
  console.log(`  ${d.name.padEnd(28)} +tags=[${d.newTags.join(',') || '-'}] +projects=[${d.newProjects.join(',') || '-'}]`);
}

if (!APPLY) {
  console.log(`\nRe-run with --apply to write to ghl_contacts.`);
  process.exit(0);
}

// 4. Apply writes (Tier 2 — modifies ghl_contacts)
let written = 0, errors = 0;
for (const d of diffs) {
  try {
    const { error } = await supabase
      .from('ghl_contacts')
      .update({ tags: d.mergedTags, projects: d.mergedProjects, updated_at: new Date().toISOString() })
      .eq('ghl_id', d.ghlId);
    if (error) throw error;
    // Mark Notion Sync Status = synced
    await nfetch(`/pages/${d.pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties: { 'Sync Status': { select: { name: 'synced' } } } }),
    });
    written++;
    if (written % 25 === 0) console.log(`  …${written}`);
  } catch (e) {
    errors++;
    if (errors <= 5) console.error(`  err ${d.ghlId}: ${e.message}`);
  }
}

console.log(`\nResults: ${written} written, ${errors} errors.`);
