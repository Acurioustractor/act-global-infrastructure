#!/usr/bin/env node
/**
 * Seed the Notion Action Items DB from today's 9 artefact pages.
 *
 * Each action is hard-coded here rather than parsed from markdown — gives
 * us deterministic, audited entries with the right Tier / Owner / Priority
 * classification for each item.
 *
 * Skips items already in the DB (matched by Action title).
 *
 * Env:
 *   NOTION_MIRROR_TOKEN, NOTION_ACTION_ITEMS_DB_ID, NOTION_ORGANISATIONS_DB_ID
 *
 * Usage:
 *   node scripts/seed-action-items.mjs           # dry-run
 *   node scripts/seed-action-items.mjs --apply
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const TOKEN = process.env.NOTION_MIRROR_TOKEN;
const DB = process.env.NOTION_ACTION_ITEMS_DB_ID;
const ORGS_DB = process.env.NOTION_ORGANISATIONS_DB_ID;

const URLS = {
  QBE: 'https://www.notion.so/QBE-Foundation-prep-package-361ebcf981cf81faa121c70030549e7c',
  GOODS_1PG: 'https://www.notion.so/Goods-on-Country-one-page-brief-361ebcf981cf81ffb72bdc06ce2cbaa0',
  MPARNTWE: 'https://www.notion.so/Mparntwe-partnership-memo-Oonchiumpa-Goods-361ebcf981cf818aa9c7f681ed7e2676',
  SNOW_AP: 'https://www.notion.so/Snow-Airport-Stretch-Bed-panel-copy-361ebcf981cf815ca536f47c1caea3e7',
  GAG: 'https://www.notion.so/Goods-Advisory-Group-reconvene-pack-361ebcf981cf815baa52e44e0bd98deb',
  ENVIRO: 'https://www.notion.so/Envirobank-HDPE-outstanding-docs-pack-361ebcf981cf81a6a754e08abf0ed5cd',
  RECV: 'https://www.notion.so/Receivables-chase-ready-to-send-drafts-361ebcf981cf811aa34ad7c1ff63d0dd',
  ALICE: 'https://www.notion.so/Alice-Springs-Trip-Story-Capture-Prep-361ebcf981cf8136907ff08c855a1e0e',
  STRAT: 'https://www.notion.so/Strategic-Pipeline-who-where-why-361ebcf981cf8132971de10f1782b558',
};

const ACTIONS = [
  // QBE
  { action: 'Create QBE Foundation contact record in GHL', priority: 'This week', owner: 'Ben', tier: '1 — local-only', project: ['ACT-GD'], source: URLS.QBE, notes: 'Program contact from Catalysing Impact cohort onboarding. 10min job. Unblocks all funder-cadence automation on QBE.' },
  { action: 'Send overdue strategy material to QBE mentors', priority: 'This week', owner: 'Ben', tier: '2 — shared/reversible', project: ['ACT-GD'], source: URLS.QBE, notes: 'Notion HQ task open since 2026-04-21. 24+ days overdue. Template in QBE prep package.' },
  { action: 'Fill the Goods delivered-cost report for last 50 beds', priority: 'This week', owner: 'Ben', tier: '1 — local-only', project: ['ACT-GD'], source: URLS.QBE, notes: 'Template at JusticeHub/output/goods-on-country/actual-delivered-cost-report.md. funders.json: QBE will not move without this on the page.' },
  { action: 'Confirm funders.json values for QBE (ask $400K / deadline 2026-08-31 / stage cohort-active)', priority: 'This week', owner: 'Ben', tier: '1 — local-only', project: ['ACT-GD'], source: URLS.QBE, notes: 'Three null fields blocking automated alignment loop.' },
  { action: 'Schedule monthly QBE program check-in', priority: 'This week', owner: 'Nic', tier: '2 — shared/reversible', project: ['ACT-GD'], source: URLS.QBE, notes: 'Expected program rhythm per goods-crm-upgrade plan. First report due end of May.' },

  // Receivables
  { action: 'Send Snow Foundation INV-0321 ($132K) courtesy confirm', priority: 'This week', owner: 'Ben', tier: '2 — shared/reversible', project: ['ACT-GD'], source: URLS.RECV, notes: 'Due 1 Jun. Active multi-tranche partner.', orgName: 'Snow Foundation' },
  { action: 'Send PICC chase for INV-0317 + INV-0324 ($96.8K total)', priority: 'This week', owner: 'Ben', tier: '2 — shared/reversible', project: ['ACT-GD'], source: URLS.RECV, notes: 'INV-0317 snooze expired 21 May. INV-0324 30 days overdue.', orgName: 'Palm Island Community Company Limited (PICC)' },
  { action: 'Send Sonas Properties INV-0328 ($37.3K) gentle nudge', priority: 'This week', owner: 'Ben', tier: '2 — shared/reversible', project: ['ACT-GD'], source: URLS.RECV, notes: 'Due today. $81K paid lifetime — friendly first touch.', orgName: 'Sonas Properties Pty Ltd' },
  { action: 'Send Regional Arts Australia INV-0301 ($16.5K) chase', priority: 'This week', owner: 'Ben', tier: '2 — shared/reversible', project: ['ACT-RA'], source: URLS.RECV, notes: '74 days overdue. INV-0302 still in their system due June.', orgName: 'Regional Arts Australia' },
  { action: 'Resolve Rotary eClub Outback INV-0222 ($82.5K, 386d) — disposition decision', priority: 'This week', owner: 'Ben', tier: '3 — outbound/hard-to-reverse', project: ['ACT-GD'], source: URLS.RECV, notes: 'Disposition decision needed before 30 Jun. Not a chase — writeoff or path.' },

  // Goods artefacts
  { action: 'Approve & deliver Snow Airport panel copy', priority: 'This week', owner: 'Ben', tier: '2 — shared/reversible', project: ['ACT-GD'], source: URLS.SNOW_AP, notes: '5 Curtis-voice panels drafted. Hand to Sally Grimsley-Ballard for ~25 May Reconciliation Week install.', orgName: 'Snow Foundation' },
  { action: 'Reconvene the 13-person Goods Advisory Group', priority: 'This week', owner: 'Nic', tier: '2 — shared/reversible', project: ['ACT-GD'], source: URLS.GAG, notes: 'Last met 3 March. 10+ weeks dormant. 4 TBC names to confirm before invite. Doodle for early June.' },
  { action: 'Send Envirobank docs pack to Marty Taylor', priority: 'This week', owner: 'Nic', tier: '2 — shared/reversible', project: ['ACT-GD'], source: URLS.ENVIRO, notes: '93 days overdue. Opens HDPE supply talk for Mparntwe plant.' },
  { action: 'Draft Minderoo holding-pattern note (1pg)', priority: 'This week', owner: 'Ben', tier: '1 — local-only', project: ['ACT-GD'], source: URLS.STRAT, notes: 'Lucy Stronach paused 14 May. Keep relationship warm through June Board lockup.' },
  { action: 'Send Goods 1-pager to Bryan Foundation (Matthew Cox 26 May)', priority: 'This week', owner: 'Ben', tier: '2 — shared/reversible', project: ['ACT-GD'], source: URLS.GOODS_1PG, notes: 'Coffee locked 26 May. Pre-read: Goods 1-pager + Mparntwe memo.', orgName: 'Bryan Foundation' },
  { action: 'TABOO / Butterfly / Status / Hospital Research follow-up brief', priority: 'Next week', owner: 'Ben', tier: '1 — local-only', project: ['ACT-GD','ACT-CN'], source: URLS.STRAT, notes: '4-org Adelaide cluster met 14 May. Eloise brokered.' },
  { action: 'Brian M Davis Charitable Foundation next call follow-up', priority: 'Next week', owner: 'Ben', tier: '2 — shared/reversible', project: ['ACT-GD'], source: URLS.STRAT, notes: 'Met 4 May. Pitch-stage.' },

  // Alice Springs trip
  { action: 'Confirm Kirsty / Kristy Bloomfield spelling in person, then merge in EL admin', priority: 'Next week', owner: 'Ben', tier: '2 — shared/reversible', project: ['ACT-EL','ACT-GD'], source: URLS.ALICE, notes: 'Duplicate identity flagged 2026-05-15. Confirm verbally before merging via storyteller_verification_actions.' },
  { action: 'Alice Springs — record 5 priority storyteller captures', priority: 'Next week', owner: 'Ben', tier: '2 — shared/reversible', project: ['ACT-EL','ACT-OO'], source: URLS.ALICE, notes: 'Kirsty Bloomfield, Karen Liddle, Yani Bloomfield, Chelsea Kenneally, Suzie Ma. 0 transcripts + 0 stories each.' },
  { action: 'Alice Springs — pre-arrange CEO meetings (Julalikari · Wilyajanta · Ingkerreke · Bawinanga · Urapuntja)', priority: 'Next week', owner: 'Ben', tier: '2 — shared/reversible', project: ['ACT-GD'], source: URLS.ALICE, notes: 'Institutional intros from the 16 contact-orbit list.' },
  { action: 'Write up the 7 Easy Win stories (transcript exists, no story)', priority: 'Later', owner: 'Ben', tier: '1 — local-only', project: ['ACT-EL'], source: URLS.ALICE, notes: 'Anthony Hopkins, Braydon Dema, Jackquann, Laquisha, Patricia Ann Miller, Patricia Frank, Georgina Byron AM. Post-trip work.' },

  // Operational
  { action: 'Run pm2 reload ecosystem.config.cjs to activate hourly canonical-contacts cron', priority: 'This week', owner: 'Ben', tier: '2 — shared/reversible', project: ['ACT-CORE'], source: '', notes: 'Cron entry already added. One command activates it.' },
  { action: 'Address 12 RLS-disabled tables in EL v2 (security advisory)', priority: 'This month', owner: 'Ben', tier: '1 — local-only', project: ['ACT-EL'], source: '', notes: 'comments, story_versions, kinship_*, timeline_event_*, connections, canonical_theme_quotes. Surfaced in EL v2 schema research.' },
];

const COMMENTS = `Seeded from today's 9 artefact pages. Status defaults to To do. Update Status / Due Date / Notes as you work through.`;

async function notionFetch(path, init = {}) {
  const r = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`Notion ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

console.log(`seed-action-items — ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

// Get existing actions to avoid dups
const existingTitles = new Set();
{
  let cursor = null;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${DB}/query`, { method: 'POST', body: JSON.stringify(body) });
    for (const r of data.results) existingTitles.add(r.properties['Action']?.title?.[0]?.plain_text || '');
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
}

// Get orgs map for relation
const orgPageByName = new Map();
{
  let cursor = null;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${ORGS_DB}/query`, { method: 'POST', body: JSON.stringify(body) });
    for (const r of data.results) {
      const name = r.properties['Name']?.title?.[0]?.plain_text;
      if (name) orgPageByName.set(name, r.id);
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
}
console.log(`existing actions: ${existingTitles.size}, orgs: ${orgPageByName.size}`);

const toCreate = ACTIONS.filter(a => !existingTitles.has(a.action));
console.log(`to create: ${toCreate.length} / ${ACTIONS.length}`);

if (!APPLY) {
  for (const a of toCreate.slice(0, 30)) console.log(`  [${a.priority.padEnd(10)}] [${a.owner}] ${a.action}`);
  console.log(`\nRe-run with --apply.`);
  process.exit(0);
}

let created = 0;
for (const a of toCreate) {
  const props = {
    Action: { title: [{ text: { content: a.action.slice(0, 200) } }] },
    Status: { select: { name: 'To do' } },
    Priority: { select: { name: a.priority } },
    Owner: { select: { name: a.owner } },
    Tier: { select: { name: a.tier } },
    Project: { multi_select: (a.project || []).map(p => ({ name: p })) },
    Notes: { rich_text: [{ text: { content: a.notes?.slice(0, 1800) || '' } }] },
  };
  if (a.source) props['Source Artefact'] = { url: a.source };
  if (a.orgName && orgPageByName.has(a.orgName)) props.Org = { relation: [{ id: orgPageByName.get(a.orgName) }] };
  try {
    await fetch(`https://api.notion.com/v1/pages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent: { database_id: DB }, properties: props }),
    }).then(r => { if (!r.ok) throw new Error(`${r.status}: ${r.statusText}`); return r.json(); });
    created++;
  } catch (e) {
    console.error(`  err "${a.action.slice(0, 40)}": ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 380));
}
console.log(`\nCreated: ${created} / ${toCreate.length}`);
