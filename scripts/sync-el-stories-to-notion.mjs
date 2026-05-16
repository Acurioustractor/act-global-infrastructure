#!/usr/bin/env node
/**
 * Sync Empathy Ledger v2 stories → Notion EL Stories DB.
 *
 * Links each story back to its Storyteller (relation) in the
 * EL Storytellers DB. Maps cultural sensitivity, consent, themes.
 *
 * Env:
 *   NOTION_MIRROR_TOKEN, NOTION_EL_STORIES_DB_ID, NOTION_EL_STORYTELLERS_DB_ID
 *   EL_SUPABASE_URL, EL_SUPABASE_SERVICE_KEY
 *
 * Usage:
 *   node scripts/sync-el-stories-to-notion.mjs           # dry-run
 *   node scripts/sync-el-stories-to-notion.mjs --apply
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');

const NOTION_TOKEN = process.env.NOTION_MIRROR_TOKEN;
const NOTION_DB = process.env.NOTION_EL_STORIES_DB_ID;
const NOTION_ST_DB = process.env.NOTION_EL_STORYTELLERS_DB_ID;
const EL_URL = process.env.EL_SUPABASE_URL;
const EL_KEY = process.env.EL_SUPABASE_SERVICE_KEY;

for (const [k, v] of Object.entries({ NOTION_MIRROR_TOKEN: NOTION_TOKEN, NOTION_EL_STORIES_DB_ID: NOTION_DB, NOTION_EL_STORYTELLERS_DB_ID: NOTION_ST_DB, EL_URL, EL_KEY })) {
  if (!v) { console.error(`Missing env: ${k}`); process.exit(1); }
}

const el = createClient(EL_URL, EL_KEY);
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

let lastNotionAt = 0;
async function notionFetch(path, init = {}, attempt = 0) {
  const dt = Date.now() - lastNotionAt;
  if (dt < 350) await new Promise(r => setTimeout(r, 350 - dt));
  lastNotionAt = Date.now();
  let r;
  try {
    r = await fetch(`${NOTION_API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${NOTION_TOKEN}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
  } catch (netErr) {
    if (attempt < 4) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      return notionFetch(path, init, attempt + 1);
    }
    throw netErr;
  }
  if ((r.status >= 500 || r.status === 429) && attempt < 4) {
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    return notionFetch(path, init, attempt + 1);
  }
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Notion ${r.status} ${path}: ${body.slice(0, 300)}`);
  }
  return r.json();
}

async function findStoryPageById(storyId) {
  const data = await notionFetch(`/databases/${NOTION_DB}/query`, {
    method: 'POST',
    body: JSON.stringify({ filter: { property: 'EL Story ID', rich_text: { equals: storyId } }, page_size: 1 }),
  });
  return data.results[0]?.id || null;
}

async function buildStorytellerPageMap() {
  const map = new Map();
  let cursor = null;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${NOTION_ST_DB}/query`, { method: 'POST', body: JSON.stringify(body) });
    for (const r of data.results) {
      const stId = r.properties['EL Storyteller ID']?.rich_text?.[0]?.plain_text;
      if (stId) map.set(stId, r.id);
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return map;
}

async function fetchStoryThemes() {
  // story_themes table: { story_id, theme }
  const map = new Map(); // story_id → string[]
  let offset = 0;
  while (true) {
    const { data, error } = await el.from('story_themes').select('story_id, theme').range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const t of data) {
      if (!map.has(t.story_id)) map.set(t.story_id, []);
      map.get(t.story_id).push(t.theme);
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return map;
}

async function fetchProjectCodes() {
  // story_project_tags joined with projects.act_project_code (act_approved=true).
  // Table may be empty per the schema research — handle gracefully.
  const map = new Map(); // story_id → act_project_code[]
  try {
    const { data: tags, error } = await el.from('story_project_tags').select('story_id, act_project_id, act_approved').eq('act_approved', true);
    if (error) throw error;
    if (!tags?.length) return map;
    const projIds = [...new Set(tags.map(t => t.act_project_id))];
    const { data: projs } = await el.from('act_projects').select('id, slug').in('id', projIds);
    const projMap = new Map((projs || []).map(p => [p.id, p.slug]));
    for (const t of tags) {
      const code = projMap.get(t.act_project_id);
      if (!code) continue;
      if (!map.has(t.story_id)) map.set(t.story_id, []);
      map.get(t.story_id).push(code);
    }
  } catch (e) { console.warn(`project tags fetch failed: ${e.message}`); }
  return map;
}

function classifyRegion(loc) {
  if (!loc) return null;
  const l = String(loc).toLowerCase();
  if (/alice|mparntwe|atnarpa|loves creek|undoolya|angas downs|arrernte/.test(l)) return 'Alice Springs / Mparntwe';
  if (/tennant/.test(l)) return 'Tennant Creek';
  if (/central australia/.test(l)) return 'Central Australia';
  if (/palm island/.test(l)) return 'Palm Island';
  if (/mount isa|mt isa|mt\.? isa/.test(l)) return 'Mount Isa';
  return 'Other';
}

function richText(s) { return { rich_text: [{ text: { content: (s || '').slice(0, 2000) } }] }; }
function selectOpt(name) { return name ? { select: { name: String(name).slice(0, 100).replace(/,/g, ' ') } } : { select: null }; }
function sanitize(s) { return String(s || '').slice(0, 100).replace(/,/g, ' '); }

function deriveStatus(s) {
  if (s.is_archived) return 'archived';
  if (s.published_at) return 'published';
  if (s.status === 'pending_review') return 'in-review';
  return 'draft';
}

function deriveConsent(s) {
  if (s.consent_withdrawn_at) return 'withdrawn';
  if (s.has_explicit_consent) return 'granted';
  return 'pending';
}

function toProperties(s, themes, projectCodes, storytellerPageId, orgPageId) {
  const locText = s.location_text || s.location || '';
  const region = classifyRegion(locText);
  const props = {
    Title: { title: [{ text: { content: (s.title || `(untitled ${s.id.slice(0, 8)})`).slice(0, 200) } }] },
    'EL Story ID': richText(s.id),
    'ACT Project': { multi_select: (projectCodes || []).slice(0, 30).map(c => ({ name: sanitize(c) })) },
    Themes: { multi_select: (themes || []).slice(0, 50).map(t => ({ name: sanitize(t) })) },
    'Cultural Themes': { multi_select: (s.cultural_themes || []).slice(0, 30).map(t => ({ name: sanitize(t) })) },
    'Cultural Sensitivity': selectOpt(s.cultural_sensitivity_level),
    'Permission Tier': selectOpt(s.permission_tier),
    'Elder Reviewed': { checkbox: !!s.elder_reviewed },
    'Elder Reviewed At': { date: s.elder_reviewed_at ? { start: s.elder_reviewed_at.split('T')[0] } : null },
    Consent: selectOpt(deriveConsent(s)),
    Privacy: selectOpt(s.privacy_level),
    Location: richText(locText),
    'Trip Region': selectOpt(region),
    Status: selectOpt(deriveStatus(s)),
    'Published At': { date: s.published_at ? { start: s.published_at.split('T')[0] } : null },
    Created: { date: s.created_at ? { start: s.created_at.split('T')[0] } : null },
    'EL Deep Link': { url: `https://empathyledger.app/stories/${s.id}` },
    Excerpt: richText(s.excerpt || s.summary || ''),
    'Has Transcript': { checkbox: !!s.transcription || !!s.transcript_id },
    'Has Media': { checkbox: !!(s.media_url || (s.media_urls && s.media_urls.length)) },
    'Last Synced': { date: { start: new Date().toISOString() } },
  };
  if (storytellerPageId) props.Storyteller = { relation: [{ id: storytellerPageId }] };
  if (orgPageId) props.Org = { relation: [{ id: orgPageId }] };
  return props;
}

// ────────────────────────────────────────────────────────────────

console.log(`sync-el-stories-to-notion — ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

console.log('Fetching EL v2 stories…');
const stories = [];
let offset = 0;
while (true) {
  const { data, error } = await el.from('stories').select('id, storyteller_id, organization_id, title, content, summary, excerpt, themes, tags, cultural_themes, story_category, story_type, privacy_level, permission_tier, is_public, is_archived, published_at, status, has_explicit_consent, consent_withdrawn_at, cultural_sensitivity_level, requires_elder_review, elder_reviewed, elder_reviewed_at, location, location_text, latitude, longitude, transcription, transcript_id, media_url, media_urls, created_at').range(offset, offset + 999);
  if (error) throw error;
  if (!data?.length) break;
  stories.push(...data);
  if (data.length < 1000) break;
  offset += 1000;
}
console.log(`  fetched ${stories.length} stories`);

console.log('Fetching story_themes…');
const themesMap = await fetchStoryThemes();
console.log(`  themes for ${themesMap.size} stories`);

console.log('Fetching project codes…');
const projectMap = await fetchProjectCodes();
console.log(`  project tags for ${projectMap.size} stories`);

if (!APPLY) {
  console.log(`\nSample first 5:`);
  for (const s of stories.slice(0, 5)) {
    console.log(`  ${s.id.slice(0, 8)}  ${(s.title || '?').slice(0, 60)}  loc=${(s.location_text || s.location || '-').slice(0, 30)}  archived=${s.is_archived ? 'Y' : 'N'}`);
  }
  console.log(`\nRe-run with --apply to write.`);
  process.exit(0);
}

console.log(`\nBuilding Storyteller page map…`);
const stMap = await buildStorytellerPageMap();
console.log(`  ${stMap.size} storyteller pages`);

console.log(`Building EL org → Notion org page map…`);
const NOTION_ORGS_DB = process.env.NOTION_ORGANISATIONS_DB_ID;
const elOrgIds = [...new Set(stories.map(s => s.organization_id).filter(Boolean))];
const { data: elOrgs } = await el.from('organizations').select('id, name, slug').in('id', elOrgIds);
const elOrgById = new Map((elOrgs || []).map(o => [o.id, o]));
console.log(`  ${elOrgById.size} EL orgs referenced by stories`);

// Build current Notion orgs map (lowercased Org Key → page id)
const orgPageByKey = new Map();
const orgPageByNameLower = new Map();
{
  let cursor = null;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${NOTION_ORGS_DB}/query`, { method: 'POST', body: JSON.stringify(body) });
    for (const r of data.results) {
      const orgKey = r.properties['Org Key']?.rich_text?.[0]?.plain_text;
      const displayName = r.properties['Name']?.title?.[0]?.plain_text;
      if (orgKey) orgPageByKey.set(orgKey, r.id);
      if (displayName) orgPageByNameLower.set(displayName.toLowerCase().trim(), r.id);
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
}
console.log(`  ${orgPageByKey.size} existing Notion orgs`);

// Fuzzy normaliser shared with sync-xero pattern
const LEGAL_SUFFIXES = /\b(pty\.?\s*ltd\.?|proprietary\s+limited|p\/l|limited|ltd\.?|incorporated|inc\.?|aboriginal\s+corporation|aboriginal\s+council)\b/gi;
const normaliseName = s => String(s || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(LEGAL_SUFFIXES, ' ').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

// Resolve EL org → Notion page id. Create new Notion Org if no match.
async function resolveOrgPage(elOrg) {
  if (!elOrg) return null;
  const candidates = [elOrg.name, elOrg.slug?.replace(/-/g, ' ')].filter(Boolean);
  for (const c of candidates) {
    const cn = normaliseName(c);
    if (orgPageByKey.has(cn)) return orgPageByKey.get(cn);
    if (orgPageByNameLower.has(c.toLowerCase().trim())) return orgPageByNameLower.get(c.toLowerCase().trim());
    // substring fallback
    for (const [key, id] of orgPageByKey) {
      if (!cn || cn.length < 4 || !key || key.length < 4) continue;
      if (cn.includes(key) || key.includes(cn)) return id;
    }
  }
  // No match — create new Notion Org sourced from EL
  const newOrgName = (elOrg.name || elOrg.slug || '(unnamed EL org)').slice(0, 200);
  try {
    const r = await notionFetch('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: NOTION_ORGS_DB },
        properties: {
          Name: { title: [{ text: { content: newOrgName } }] },
          'Org Key': richText(normaliseName(newOrgName)),
          Source: { multi_select: [{ name: 'EL' }] },
        },
      }),
    });
    orgPageByKey.set(normaliseName(newOrgName), r.id);
    orgPageByNameLower.set(newOrgName.toLowerCase(), r.id);
    return r.id;
  } catch (e) {
    console.error(`  failed to create EL org "${newOrgName}": ${e.message.slice(0, 200)}`);
    return null;
  }
}

const stats = { updated: 0, created: 0, errors: 0, st_linked: 0, org_linked: 0 };
let processed = 0;
for (const s of stories) {
  processed++;
  const stPageId = stMap.get(s.storyteller_id);
  if (stPageId) stats.st_linked++;
  const orgPageId = s.organization_id ? await resolveOrgPage(elOrgById.get(s.organization_id)) : null;
  if (orgPageId) stats.org_linked++;
  try {
    const existing = await findStoryPageById(s.id);
    const props = toProperties(s, themesMap.get(s.id) || [], projectMap.get(s.id) || [], stPageId, orgPageId);
    if (existing) {
      await notionFetch(`/pages/${existing}`, { method: 'PATCH', body: JSON.stringify({ properties: props }) });
      stats.updated++;
    } else {
      await notionFetch(`/pages`, { method: 'POST', body: JSON.stringify({ parent: { database_id: NOTION_DB }, properties: props }) });
      stats.created++;
    }
  } catch (e) {
    stats.errors++;
    if (stats.errors <= 5) console.error(`  err ${s.id}: ${e.message.slice(0, 200)}`);
  }
  if (processed % 50 === 0) console.log(`  …${processed}  updated=${stats.updated} created=${stats.created} st=${stats.st_linked} org=${stats.org_linked} errors=${stats.errors}`);
}

console.log(`\n─── results ───`);
console.log(`updated:            ${stats.updated}`);
console.log(`created:            ${stats.created}`);
console.log(`storyteller-linked: ${stats.st_linked}`);
console.log(`org-linked:         ${stats.org_linked}`);
console.log(`errors:             ${stats.errors}`);
