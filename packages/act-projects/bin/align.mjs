#!/usr/bin/env node
// Three-way alignment: config/project-codes.json (the id) <-> Notion Projects DB <-> Empathy Ledger projects.
//
//   node packages/act-projects/bin/align.mjs                 read-only report
//   node packages/act-projects/bin/align.mjs --json          machine output
//   node packages/act-projects/bin/align.mjs --write-registry
//        fill notion.page_id, empathy_ledger.project_id/project_key into project-codes.json
//        for matches that are exact by code, or unambiguous by name. Local file only.
//   node packages/act-projects/bin/align.mjs --write-notion
//        set "ACT Project Code" on matched Notion rows that lack it, and overwrite a
//        single matched row whose code disagrees with the registry (Tier 2: ask first)
//
//   node packages/act-projects/bin/align.mjs --create-notion
//        create a Notion row for every live registry project with no match at all
//        (Tier 2: ask first), then pin the new page id into the registry
//
// Env: NOTION_API_KEY (or NOTION_TOKEN), NOTION_PROJECTS_DATABASE_ID,
//      EL_SUPABASE_URL, EL_SUPABASE_SERVICE_ROLE_KEY. Run with node --env-file=.env.local.
// EL rows are never written here; scripts/sync-projects-to-el.mjs owns that.
import { readFileSync, writeFileSync } from 'node:fs';
import { loadProjects, PROJECT_CODES_PATH } from '../src/index.mjs';

const args = new Set(process.argv.slice(2));
const NOTION_KEY = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;
const NOTION_DB = process.env.NOTION_PROJECTS_DATABASE_ID || '177ebcf9-81cf-80dd-9514-f1ec32f3314c';
const EL_URL = process.env.EL_SUPABASE_URL || 'https://yvnuayzslukamizrlhwb.supabase.co';
const EL_KEY = process.env.EL_SUPABASE_SERVICE_ROLE_KEY || process.env.EL_SUPABASE_SERVICE_KEY;
if (!NOTION_KEY || !EL_KEY) {
  console.error('need NOTION_API_KEY and EL_SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(2);
}

const norm = (s) => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '').trim();

async function notionRows() {
  const rows = [];
  let cursor;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_DB}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${NOTION_KEY}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    if (!res.ok) throw new Error(`notion ${res.status}: ${await res.text()}`);
    const j = await res.json();
    for (const p of j.results) {
      const props = p.properties;
      rows.push({
        id: p.id,
        name: props.Name?.title?.map((t) => t.plain_text).join('') || '',
        code: props['ACT Project Code']?.rich_text?.map((t) => t.plain_text).join('').trim() || null,
        status: props.Status?.select?.name || null,
        type: props['Project Type']?.select?.name || null,
        archived: p.archived,
      });
    }
    cursor = j.has_more ? j.next_cursor : null;
  } while (cursor);
  return rows;
}

async function elRows() {
  const res = await fetch(`${EL_URL}/rest/v1/projects?select=id,name,slug,act_project_code,status,organization_id&limit=1000`, {
    headers: { apikey: EL_KEY, Authorization: `Bearer ${EL_KEY}` },
  });
  if (!res.ok) throw new Error(`el ${res.status}: ${await res.text()}`);
  return res.json();
}

const { projects } = loadProjects();
const [notion, el] = await Promise.all([notionRows(), elRows()]);

const codeOf = (p) => new Set([p.code, ...(p.legacy_codes || [])]);
const namesOf = (p) => new Set([p.name, p.canonical_slug, ...(p.slug_aliases || []), ...(p.notion_pages || [])].map(norm).filter(Boolean));

function match(list, getCode, getName, getId, idField) {
  // returns { byCode: Map<projectCode, row[]>, byName: Map<projectCode, row[]> } plus unmatched rows
  const claimed = new Set();
  const exact = new Map();
  const byName = new Map();
  for (const p of Object.values(projects)) {
    const hits = list.filter((r) => getCode(r) && codeOf(p).has(getCode(r)));
    const pinned = idField && p[idField] ? list.filter((r) => getId(r) === p[idField]) : [];
    const all = [...new Set([...pinned, ...hits])];
    if (all.length) {
      exact.set(p.code, all);
      all.forEach((r) => claimed.add(getId(r)));
    }
  }
  for (const p of Object.values(projects)) {
    if (exact.has(p.code)) continue;
    const names = namesOf(p);
    const hits = list.filter((r) => !claimed.has(getId(r)) && !getCode(r) && names.has(norm(getName(r))));
    if (hits.length) byName.set(p.code, hits);
  }
  for (const rows of byName.values()) if (rows.length === 1) claimed.add(getId(rows[0]));
  const unmatched = list.filter((r) => !claimed.has(getId(r)));
  return { exact, byName, unmatched };
}

const pinConflicts = [];
const N = match(notion, (r) => r.code, (r) => r.name, (r) => r.id, null);
// pin by stored page id too
for (const p of Object.values(projects)) {
  const pid = p.notion?.page_id || p.notion_page_id;
  if (!pid) continue;
  const row = notion.find((r) => r.id.replace(/-/g, '') === pid.replace(/-/g, ''));
  if (!row || N.exact.has(p.code)) continue;
  // a pinned row that now carries another project's code belongs to that project
  if (row.code && !codeOf(p).has(row.code)) { pinConflicts.push({ code: p.code, page_id: row.id, owner: row.code }); continue; }
  N.exact.set(p.code, [row]); N.byName.delete(p.code); N.unmatched = N.unmatched.filter((r) => r.id !== row.id);
}
const E = match(el, (r) => r.act_project_code, (r) => r.name, (r) => r.id, null);
for (const p of Object.values(projects)) {
  const eid = p.empathy_ledger?.project_id;
  if (!eid) continue;
  const row = el.find((r) => r.id === eid);
  if (row && !E.exact.has(p.code)) { E.exact.set(p.code, [row]); E.byName.delete(p.code); E.unmatched = E.unmatched.filter((r) => r.id !== row.id); }
}

const report = [];
for (const p of Object.values(projects)) {
  const pinned = pinConflicts.find((c) => c.code === p.code);
  const n = pinned ? [] : (N.exact.get(p.code) || N.byName.get(p.code) || []);
  const e = E.exact.get(p.code) || E.byName.get(p.code) || [];
  const flags = [];
  if (pinned) flags.push(`notion:pin-conflict(page owned by ${pinned.owner})`);
  else if (n.length === 0) flags.push('notion:missing');
  if (n.length > 1) flags.push(`notion:ambiguous(${n.length})`);
  if (n.length === 1 && n[0].code && !codeOf(p).has(n[0].code)) flags.push(`notion:code=${n[0].code}`);
  if (n.length === 1 && !n[0].code) flags.push('notion:no-code');
  if (e.length === 0 && p.empathy_ledger?.tracked !== false) flags.push('el:missing');
  if (e.length > 1) flags.push(`el:ambiguous(${e.length})`);
  if (e.length === 1 && e[0].act_project_code && !codeOf(p).has(e[0].act_project_code)) flags.push(`el:code=${e[0].act_project_code}`);
  report.push({ code: p.code, name: p.name, status: p.status, tier: p.tier, notion: n.map((r) => ({ id: r.id, name: r.name, code: r.code })), el: e.map((r) => ({ id: r.id, slug: r.slug, code: r.act_project_code })), flags });
}

if (args.has('--json')) {
  console.log(JSON.stringify({ report, notion_unmatched: N.unmatched, el_unmatched: E.unmatched.filter((r) => r.act_project_code) }, null, 2));
} else {
  const live = report.filter((r) => r.status !== 'archived' && r.status !== 'transferred');
  console.log(`${report.length} registry projects · ${notion.length} Notion rows · ${el.length} EL rows\n`);
  console.log('Live projects with drift:');
  for (const r of live.filter((r) => r.flags.length)) console.log(`  ${r.code.padEnd(9)} ${r.name.padEnd(36).slice(0, 36)} ${r.flags.join('  ')}`);
  console.log(`\nLive and fully aligned: ${live.filter((r) => !r.flags.length).length} of ${live.length}`);
  console.log(`\nNotion rows matching no registry code (${N.unmatched.length}):`);
  for (const r of N.unmatched) console.log(`  ${(r.code || '-').padEnd(10)} ${(r.status || '-').padEnd(14)} ${r.name}`);
  const elOrphans = E.unmatched.filter((r) => r.act_project_code);
  console.log(`\nEL rows carrying a code the registry does not know (${elOrphans.length}):`);
  for (const r of elOrphans) console.log(`  ${r.act_project_code.padEnd(14)} ${r.name}`);
}

if (args.has('--write-registry')) {
  const file = JSON.parse(readFileSync(PROJECT_CODES_PATH, 'utf8'));
  let changed = 0;
  const safe = (rows, codeField, p) => rows.length === 1 && (!rows[0][codeField] || codeOf(p).has(rows[0][codeField]));
  for (const r of report) {
    const p = file.projects[r.code];
    const pr = projects[r.code];
    if (safe(r.notion, 'code', pr) && !(p.notion?.page_id)) { p.notion = { ...(p.notion || {}), page_id: r.notion[0].id }; changed++; }
    if (safe(r.el, 'code', pr)) {
      const cur = p.empathy_ledger || {};
      if (!cur.project_id || (!cur.project_key && r.el[0].slug)) {
        p.empathy_ledger = { ...cur, project_id: r.el[0].id, ...(r.el[0].slug ? { project_key: r.el[0].slug } : {}) };
        changed++;
      }
    }
  }
  writeFileSync(PROJECT_CODES_PATH, JSON.stringify(file, null, 2) + '\n');
  console.log(`\nwrote ${changed} field groups into ${PROJECT_CODES_PATH}`);
}

if (args.has('--write-notion')) {
  let n = 0;
  for (const r of report) {
    if (r.notion.length !== 1) continue;
    const pr = projects[r.code];
    if (r.notion[0].code && codeOf(pr).has(r.notion[0].code)) continue;
    if (r.notion[0].code) console.log(`  ${r.notion[0].name}: ${r.notion[0].code} -> ${r.code}`);
    const res = await fetch(`https://api.notion.com/v1/pages/${r.notion[0].id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${NOTION_KEY}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { 'ACT Project Code': { rich_text: [{ text: { content: r.code } }] } } }),
    });
    if (!res.ok) console.error(`  notion write failed for ${r.code}: ${res.status}`);
    else n++;
  }
  console.log(`\nset ACT Project Code on ${n} Notion rows`);
}

if (args.has('--create-notion')) {
  const STATUS = { active: 'Active 🔥', ideation: 'Ideation 🌀', sunsetting: 'Sunsetting 🌅', archived: 'Archived 📦', transferred: 'Transferred ✅' };
  const file = JSON.parse(readFileSync(PROJECT_CODES_PATH, 'utf8'));
  let n = 0;
  for (const r of report) {
    const pr = projects[r.code];
    if (r.notion.length || !['active', 'ideation', 'sunsetting'].includes(pr.status)) continue;
    const props = {
      Name: { title: [{ text: { content: pr.name } }] },
      'ACT Project Code': { rich_text: [{ text: { content: pr.code } }] },
      Status: { select: { name: STATUS[pr.status] } },
    };
    if (pr.art) props['Project Type'] = { select: { name: 'Art' } };
    else if (pr.tier === 'ecosystem') props['Project Type'] = { select: { name: 'Core Project' } };
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${NOTION_KEY}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent: { database_id: NOTION_DB }, properties: props, children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ text: { content: pr.description } }] } }] }),
    });
    if (!res.ok) { console.error(`  create failed for ${r.code}: ${res.status} ${await res.text()}`); continue; }
    const page = await res.json();
    file.projects[r.code].notion = { ...(file.projects[r.code].notion || {}), page_id: page.id };
    console.log(`  created ${r.code} ${pr.name} -> ${page.id}`);
    n++;
  }
  writeFileSync(PROJECT_CODES_PATH, JSON.stringify(file, null, 2) + '\n');
  console.log(`\ncreated ${n} Notion rows, page ids pinned in registry`);
}
