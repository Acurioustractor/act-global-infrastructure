#!/usr/bin/env node
/**
 * Sync Empathy Ledger v2 storytellers → Notion EL Storytellers DB.
 *
 * Source: EL v2 Supabase (yvnuayzslukamizrlhwb), tables:
 *   storytellers + profiles (join) + transcripts (count) + stories (count + last)
 *
 * Computes Gap Status per the schema research:
 *   PRIORITY — active + 0 transcripts + 0 stories
 *   EASY WIN — active + transcripts > 0 + stories = 0
 *   STALE   — active + last story > 6mo ago
 *   FRESH   — active + recent story
 *   ARCHIVED — inactive / ancestor
 *
 * Tags Trip Region from location text. Adds Contact relation by joining
 * empathy_ledger_id → ghl_contacts on the MAIN db, looked up in the
 * Notion Contacts DB by GHL ID.
 *
 * Env:
 *   NOTION_MIRROR_TOKEN, NOTION_EL_STORYTELLERS_DB_ID, NOTION_CONTACTS_DB_ID
 *   EL_SUPABASE_URL, EL_SUPABASE_SERVICE_KEY  (the v2 instance)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY    (the main instance — for ghl_contacts join)
 *
 * Usage:
 *   node scripts/sync-el-storytellers-to-notion.mjs           # dry-run
 *   node scripts/sync-el-storytellers-to-notion.mjs --apply
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');

const NOTION_TOKEN = process.env.NOTION_MIRROR_TOKEN;
const NOTION_DB = process.env.NOTION_EL_STORYTELLERS_DB_ID;
const NOTION_CONTACTS_DB = process.env.NOTION_CONTACTS_DB_ID;
const EL_URL = process.env.EL_SUPABASE_URL;
const EL_KEY = process.env.EL_SUPABASE_SERVICE_KEY;
const MAIN_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL;
const MAIN_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

for (const [k, v] of Object.entries({ NOTION_MIRROR_TOKEN: NOTION_TOKEN, NOTION_EL_STORYTELLERS_DB_ID: NOTION_DB, NOTION_CONTACTS_DB_ID: NOTION_CONTACTS_DB, EL_URL, EL_KEY, MAIN_URL, MAIN_KEY })) {
  if (!v) { console.error(`Missing env: ${k}`); process.exit(1); }
}

const el = createClient(EL_URL, EL_KEY);
const main = createClient(MAIN_URL, MAIN_KEY);
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

async function findPageByStorytellerId(stId) {
  const data = await notionFetch(`/databases/${NOTION_DB}/query`, {
    method: 'POST',
    body: JSON.stringify({ filter: { property: 'EL Storyteller ID', rich_text: { equals: stId } }, page_size: 1 }),
  });
  return data.results[0]?.id || null;
}

async function buildContactMap() {
  // Notion Contacts page id by GHL ID
  const map = new Map();
  let cursor = null;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${NOTION_CONTACTS_DB}/query`, { method: 'POST', body: JSON.stringify(body) });
    for (const r of data.results) {
      const ghlId = r.properties['GHL ID']?.rich_text?.[0]?.plain_text;
      if (ghlId) map.set(ghlId, r.id);
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return map;
}

async function buildEmpathyToGhlMap() {
  // main db: empathy_ledger_id → ghl_id
  const map = new Map();
  let offset = 0;
  while (true) {
    const { data, error } = await main.from('ghl_contacts').select('ghl_id, empathy_ledger_id').not('empathy_ledger_id', 'is', null).range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const c of data) map.set(c.empathy_ledger_id, c.ghl_id);
    if (data.length < 1000) break;
    offset += 1000;
  }
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

function classifyGap(active, storyCount, transcriptCount, lastStoryAt) {
  if (!active) return 'ARCHIVED — historical';
  if (transcriptCount === 0 && storyCount === 0) return 'PRIORITY — no transcript';
  if (transcriptCount > 0 && storyCount === 0) return 'EASY WIN — transcript no story';
  const SIX_MONTHS = 6 * 30 * 24 * 3600 * 1000;
  if (lastStoryAt && Date.now() - new Date(lastStoryAt).getTime() > SIX_MONTHS) return 'STALE — story over 6mo';
  return 'FRESH — recent story';
}

async function fetchStorytellersWithJoins() {
  // 1. Storytellers
  const storytellers = [];
  let offset = 0;
  while (true) {
    const { data, error } = await el.from('storytellers').select('id, profile_id, organization_id, display_name, location, latitude, longitude, cultural_background, is_active, content_status, is_elder, is_featured, verified_at, tags').range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    storytellers.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`  fetched ${storytellers.length} storytellers`);

  // 2. Profiles by profile_id
  const profileIds = storytellers.map(s => s.profile_id).filter(Boolean);
  const profiles = new Map();
  offset = 0;
  while (offset < profileIds.length) {
    const slice = profileIds.slice(offset, offset + 500);
    const { data, error } = await el.from('profiles').select('id, traditional_country, language_group, languages_spoken, indigenous_status, community_role, traditional_knowledge_keeper, cultural_protocol_level, requires_elder_review, is_elder, ai_processing_consent, face_recognition_consent').in('id', slice);
    if (error) throw error;
    for (const p of data || []) profiles.set(p.id, p);
    offset += 500;
  }
  console.log(`  fetched ${profiles.size} profiles`);

  // 3. Stories per storyteller (counts + last_date)
  const storyAgg = new Map();
  offset = 0;
  while (true) {
    const { data, error } = await el.from('stories').select('storyteller_id, created_at, is_archived').not('storyteller_id', 'is', null).range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const s of data) {
      if (s.is_archived) continue;
      if (!storyAgg.has(s.storyteller_id)) storyAgg.set(s.storyteller_id, { count: 0, last: null });
      const agg = storyAgg.get(s.storyteller_id);
      agg.count++;
      if (s.created_at && (!agg.last || s.created_at > agg.last)) agg.last = s.created_at;
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`  story aggregates for ${storyAgg.size} storytellers`);

  // 4. Transcripts per storyteller (counts + last)
  const transcriptAgg = new Map();
  offset = 0;
  while (true) {
    const { data, error } = await el.from('transcripts').select('storyteller_id, created_at').not('storyteller_id', 'is', null).range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) break;
    for (const t of data) {
      if (!transcriptAgg.has(t.storyteller_id)) transcriptAgg.set(t.storyteller_id, { count: 0, last: null });
      const agg = transcriptAgg.get(t.storyteller_id);
      agg.count++;
      if (t.created_at && (!agg.last || t.created_at > agg.last)) agg.last = t.created_at;
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`  transcript aggregates for ${transcriptAgg.size} storytellers`);

  // 5. ACT projects per storyteller via project_storytellers + projects.act_project_code
  const { data: psRows } = await el.from('project_storytellers').select('storyteller_id, project_id, status');
  const { data: actProjects } = await el.from('projects').select('id, act_project_code').not('act_project_code', 'is', null);
  const codeByProj = new Map((actProjects || []).map(p => [p.id, p.act_project_code]));
  const projsByStoryteller = new Map();
  for (const r of psRows || []) {
    const code = codeByProj.get(r.project_id);
    if (!code) continue;
    if (!projsByStoryteller.has(r.storyteller_id)) projsByStoryteller.set(r.storyteller_id, new Set());
    projsByStoryteller.get(r.storyteller_id).add(code);
  }
  console.log(`  ACT project memberships for ${projsByStoryteller.size} storytellers`);

  return storytellers.map(s => {
    const p = profiles.get(s.profile_id) || {};
    const stats = storyAgg.get(s.id) || { count: 0, last: null };
    const ts = transcriptAgg.get(s.id) || { count: 0, last: null };
    const projs = [...(projsByStoryteller.get(s.id) || new Set())].sort();
    return {
      ...s, profile: p, story_count: stats.count, last_story_at: stats.last,
      transcript_count: ts.count, last_transcript_at: ts.last, act_projects: projs,
    };
  });
}

function richText(s) { return { rich_text: [{ text: { content: (s || '').slice(0, 2000) } }] }; }
function selectOpt(name) { return name ? { select: { name: String(name).slice(0, 100).replace(/,/g, ' ') } } : { select: null }; }

function toProperties(s, contactPageId) {
  const p = s.profile || {};
  const langs = (p.languages_spoken || []).filter(Boolean).slice(0, 100).map(l => ({ name: String(l).slice(0, 100).replace(/,/g, ' ') }));
  const region = classifyRegion(s.location);
  const gap = classifyGap(s.is_active, s.story_count, s.transcript_count, s.last_story_at);
  const props = {
    'Display Name': { title: [{ text: { content: (s.display_name || '(unnamed)').slice(0, 200) } }] },
    'EL Storyteller ID': richText(s.id),
    Active: { checkbox: !!s.is_active },
    'Content Status': selectOpt(s.content_status),
    Location: richText(s.location || ''),
    'Traditional Country': richText(p.traditional_country || ''),
    'Language Group': richText(p.language_group || ''),
    'Languages Spoken': { multi_select: langs },
    'Indigenous Status': selectOpt(p.indigenous_status),
    'Community Role': richText(p.community_role || ''),
    Elder: { checkbox: !!(s.is_elder || p.is_elder) },
    'Traditional Knowledge Keeper': { checkbox: !!p.traditional_knowledge_keeper },
    'Cultural Protocol Level': selectOpt(p.cultural_protocol_level),
    'Requires Elder Review': { checkbox: !!p.requires_elder_review },
    'Story Count': { number: s.story_count },
    'Last Story Date': { date: s.last_story_at ? { start: s.last_story_at.split('T')[0] } : null },
    'Transcript Count': { number: s.transcript_count },
    'Last Transcript Date': { date: s.last_transcript_at ? { start: s.last_transcript_at.split('T')[0] } : null },
    'Gap Status': selectOpt(gap),
    'Trip Region': selectOpt(region),
    'ACT Project': { multi_select: (s.act_projects || []).slice(0, 30).map(c => ({ name: String(c).slice(0, 100).replace(/,/g, ' ') })) },
    'Org': { relation: s.org_page_id ? [{ id: s.org_page_id }] : [] },
    'EL Deep Link': { url: `https://empathyledger.app/storytellers/${s.id}` },
    Verified: { checkbox: !!s.verified_at },
    'AI Processing Consent': { checkbox: !!p.ai_processing_consent },
    'Face Recognition Consent': { checkbox: !!p.face_recognition_consent },
    'Last Synced': { date: { start: new Date().toISOString() } },
  };
  if (contactPageId) props.Contact = { relation: [{ id: contactPageId }] };
  return props;
}

// ────────────────────────────────────────────────────────────────

console.log(`sync-el-storytellers-to-notion — ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

console.log('Fetching EL v2 storytellers + joins…');
const storytellers = await fetchStorytellersWithJoins();
console.log(`Loaded ${storytellers.length} storytellers`);

const gapCounts = {};
const regionCounts = {};
for (const s of storytellers) {
  const g = classifyGap(s.is_active, s.story_count, s.transcript_count, s.last_story_at);
  const r = classifyRegion(s.location) || 'Other';
  gapCounts[g] = (gapCounts[g] || 0) + 1;
  regionCounts[r] = (regionCounts[r] || 0) + 1;
}
console.log(`\nGap distribution:`);
for (const [k, v] of Object.entries(gapCounts)) console.log(`  ${v.toString().padStart(4)}  ${k}`);
console.log(`\nTrip Region distribution:`);
for (const [k, v] of Object.entries(regionCounts)) console.log(`  ${v.toString().padStart(4)}  ${k}`);

if (!APPLY) {
  console.log(`\nRe-run with --apply to write to Notion.`);
  process.exit(0);
}

console.log(`\nBuilding contact maps…`);
const elToGhl = await buildEmpathyToGhlMap();
console.log(`  ${elToGhl.size} EL→GHL mappings`);
const contactMap = await buildContactMap();
console.log(`  ${contactMap.size} Notion contact pages`);

console.log(`Building EL org → Notion org page map…`);
const ORGS_DB = process.env.NOTION_ORGANISATIONS_DB_ID;
const orgIds = [...new Set(storytellers.map(s => s.organization_id).filter(Boolean))];
const { data: elOrgs } = await el.from('organizations').select('id, name, slug').in('id', orgIds);
const elOrgById = new Map((elOrgs || []).map(o => [o.id, o]));

const orgPageByKey = new Map();
const orgPageByNameLower = new Map();
{
  let cursor = null;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${ORGS_DB}/query`, { method: 'POST', body: JSON.stringify(body) });
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
const LEGAL_SUFFIXES = /\b(pty\.?\s*ltd\.?|proprietary\s+limited|p\/l|limited|ltd\.?|incorporated|inc\.?|aboriginal\s+corporation|aboriginal\s+council)\b/gi;
const normaliseOrgName = s => String(s || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(LEGAL_SUFFIXES, ' ').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
function resolveOrgPageId(elOrgId) {
  const elOrg = elOrgById.get(elOrgId);
  if (!elOrg) return null;
  for (const c of [elOrg.name, elOrg.slug?.replace(/-/g, ' ')].filter(Boolean)) {
    const cn = normaliseOrgName(c);
    if (orgPageByKey.has(cn)) return orgPageByKey.get(cn);
    if (orgPageByNameLower.has(c.toLowerCase().trim())) return orgPageByNameLower.get(c.toLowerCase().trim());
    for (const [key, id] of orgPageByKey) {
      if (!cn || cn.length < 4 || !key || key.length < 4) continue;
      if (cn.includes(key) || key.includes(cn)) return id;
    }
  }
  return null;
}
console.log(`  ${orgPageByKey.size} Notion orgs available for linkage`);

const stats = { updated: 0, created: 0, errors: 0, contact_linked: 0, org_linked: 0 };
let processed = 0;
for (const s of storytellers) {
  processed++;
  const ghlId = elToGhl.get(s.id);
  const contactPageId = ghlId ? contactMap.get(ghlId) : null;
  if (contactPageId) stats.contact_linked++;
  s.org_page_id = s.organization_id ? resolveOrgPageId(s.organization_id) : null;
  if (s.org_page_id) stats.org_linked++;
  try {
    const existing = await findPageByStorytellerId(s.id);
    const props = toProperties(s, contactPageId);
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
  if (processed % 50 === 0) console.log(`  …${processed}  updated=${stats.updated} created=${stats.created} contact=${stats.contact_linked} org=${stats.org_linked} errors=${stats.errors}`);
}

console.log(`\n─── results ───`);
console.log(`updated:         ${stats.updated}`);
console.log(`created:         ${stats.created}`);
console.log(`contact-linked:  ${stats.contact_linked}`);
console.log(`org-linked:      ${stats.org_linked}`);
console.log(`errors:          ${stats.errors}`);
