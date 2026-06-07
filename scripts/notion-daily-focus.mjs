#!/usr/bin/env node
/**
 * Daily Focus — runs every morning (7am AEST) and does two things:
 *
 *   1. SCAN for drift signals across the five Notion DBs + Supabase signals
 *      and create new Action Items rows for anything new that needs action.
 *
 *   2. UPDATE the single "🎯 Today's Focus" Notion page with a live view of
 *      what needs eyes today — pulled fresh, no caching.
 *
 * Drift signals → new Action Items:
 *   - Opportunity stuck >180d in same stage with value > $0  →  "Move forward or void"
 *   - Xero invoice 30+ days overdue with no recent chase     →  "Chase <invoice>"
 *   - Org Funder Cadence = FAIL (no existing FAIL action)     →  "Investigate FAIL"
 *   - Storyteller transcript >30d + 0 stories                →  "Write up story"
 *
 * Daily Focus page content:
 *   - This week's action items (status != Done)
 *   - FAIL orgs (immediate eyes)
 *   - Top 5 relationship-pipeline opps by value
 *   - Top 5 overdue receivables
 *   - Today's priority storyteller captures (Trip Region active)
 *
 * Env:
 *   NOTION_MIRROR_TOKEN, NOTION_* DB IDs
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   EL_SUPABASE_URL + EL_SUPABASE_SERVICE_KEY
 *
 * Usage:
 *   node scripts/notion-daily-focus.mjs           # dry-run
 *   node scripts/notion-daily-focus.mjs --apply
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const TOKEN = process.env.NOTION_MIRROR_TOKEN;
const PARENT = '305ebcf9-81cf-81e9-8d08-e30d3f3416b1';
const ACTIONS_DB = process.env.NOTION_ACTION_ITEMS_DB_ID;
const ORGS_DB = process.env.NOTION_ORGANISATIONS_DB_ID;
const OPPS_DB = process.env.NOTION_OPPORTUNITIES_DB_ID;
const STORYTELLERS_DB = process.env.NOTION_EL_STORYTELLERS_DB_ID;

// The single "Today's Focus" page. First run creates; subsequent runs update.
// Stored in ecosystem so we can clear children + repost each morning.
const FOCUS_PAGE_NAME = "🎯 Today's Focus";

const main = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);
const el = createClient(process.env.EL_SUPABASE_URL, process.env.EL_SUPABASE_SERVICE_KEY);

let lastN = 0;
async function notionFetch(path, init = {}, attempt = 0) {
  const dt = Date.now() - lastN; if (dt < 350) await new Promise(r => setTimeout(r, 350 - dt)); lastN = Date.now();
  let r;
  try {
    r = await fetch(`https://api.notion.com/v1${path}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json', ...(init.headers || {}) } });
  } catch (e) {
    if (attempt < 4) { await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt))); return notionFetch(path, init, attempt + 1); }
    throw e;
  }
  if ((r.status >= 500 || r.status === 429) && attempt < 4) { await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt))); return notionFetch(path, init, attempt + 1); }
  if (!r.ok) throw new Error(`Notion ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

const DAY = 24 * 3600 * 1000;
const daysAgo = ts => Math.floor((Date.now() - new Date(ts).getTime()) / DAY);
const isoToday = new Date().toISOString().split('T')[0];

console.log(`notion-daily-focus — ${APPLY ? 'APPLY' : 'DRY-RUN'} (${isoToday})`);

// ─── SCAN signals ──────────────────────────────────────────────────

// 1. Opp stuck > 180d
const { data: oppsAll } = await main.from('ghl_opportunities')
  .select('ghl_id, name, stage_name, status, monetary_value, ghl_contact_id, ghl_updated_at')
  .eq('status', 'open');
const stuckOpps = (oppsAll || []).filter(o =>
  o.ghl_updated_at && daysAgo(o.ghl_updated_at) > 180 && Number(o.monetary_value || 0) > 0
);

// 2. Xero invoices 30+d overdue
const { data: overdueInvoices } = await main.from('xero_invoices')
  .select('contact_name, invoice_number, amount_due, due_date')
  .eq('type', 'ACCREC').eq('status', 'AUTHORISED')
  .lt('due_date', new Date(Date.now() - 30 * DAY).toISOString().split('T')[0])
  .order('amount_due', { ascending: false });

// 3. FAIL orgs
const failOrgs = [];
{
  let cursor = null;
  while (true) {
    const body = { page_size: 100, filter: { property: 'Funder Cadence', select: { equals: 'FAIL' } } };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${ORGS_DB}/query`, { method: 'POST', body: JSON.stringify(body) });
    for (const r of data.results) {
      failOrgs.push({
        id: r.id,
        name: r.properties['Name']?.title?.[0]?.plain_text || '',
        outstanding: r.properties['Outstanding (Xero)']?.number || 0,
      });
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
}

// 4. Storyteller transcript >30d + 0 stories
const { data: transcripts } = await el.from('transcripts').select('storyteller_id, created_at');
const { data: stories } = await el.from('stories').select('storyteller_id').not('storyteller_id', 'is', null);
const storyByStory = new Set((stories || []).map(s => s.storyteller_id));
const trCount = new Map();
for (const t of transcripts || []) {
  if (storyByStory.has(t.storyteller_id)) continue;
  if (daysAgo(t.created_at) > 30) trCount.set(t.storyteller_id, (trCount.get(t.storyteller_id) || 0) + 1);
}
const { data: stForCount } = await el.from('storytellers').select('id, display_name').in('id', [...trCount.keys()]);
const easyWinNames = (stForCount || []).filter(s => trCount.get(s.id) > 0);

// ─── Existing Action Items (avoid duplicate creates) ───────────────
const existingActions = new Set();
{
  let cursor = null;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${ACTIONS_DB}/query`, { method: 'POST', body: JSON.stringify(body) });
    for (const r of data.results) {
      const title = r.properties['Action']?.title?.[0]?.plain_text || '';
      const status = r.properties['Status']?.select?.name || '';
      if (status !== 'Done' && status !== 'Cancelled') existingActions.add(title);
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
}

// ─── Build proposed Action Items ───────────────────────────────────
const proposed = [];
for (const o of stuckOpps.slice(0, 10)) {
  const t = `Move forward or void: ${(o.name || '?').slice(0, 60)}`;
  if (!existingActions.has(t)) proposed.push({ action: t, priority: 'This week', owner: 'Ben', tier: '2 — shared/reversible', notes: `Stuck ${daysAgo(o.ghl_updated_at)} days in stage "${o.stage_name}". Value $${Number(o.monetary_value).toFixed(0)}.` });
}
for (const i of (overdueInvoices || []).slice(0, 5)) {
  const t = `Chase ${i.contact_name}: ${i.invoice_number} ($${Number(i.amount_due).toFixed(0)})`;
  if (!existingActions.has(t)) proposed.push({ action: t, priority: 'This week', owner: 'Ben', tier: '2 — shared/reversible', notes: `${daysAgo(i.due_date)}d overdue.` });
}
for (const o of failOrgs) {
  const t = `Investigate FAIL: ${o.name}`;
  if (!existingActions.has(t)) proposed.push({ action: t, priority: 'This week', owner: 'Ben', tier: '1 — local-only', notes: `Funder Cadence flipped to FAIL. Outstanding: $${o.outstanding.toFixed(0)}.` });
}
for (const s of easyWinNames.slice(0, 5)) {
  const t = `Write up story for ${s.display_name}`;
  if (!existingActions.has(t)) proposed.push({ action: t, priority: 'Next week', owner: 'Ben', tier: '1 — local-only', notes: `Transcript exists 30+ days, no story published.` });
}

console.log(`Proposed new Action Items: ${proposed.length}`);
for (const a of proposed.slice(0, 10)) console.log(`  [${a.priority.padEnd(10)}] ${a.action}`);

// ─── This-week action items for the focus page ────────────────────
const thisWeekActions = [];
{
  let cursor = null;
  while (true) {
    const body = { page_size: 100, filter: {
      and: [
        { property: 'Priority', select: { equals: 'This week' } },
        { property: 'Status', select: { does_not_equal: 'Done' } },
      ]
    } };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${ACTIONS_DB}/query`, { method: 'POST', body: JSON.stringify(body) });
    for (const r of data.results) {
      thisWeekActions.push({
        action: r.properties['Action']?.title?.[0]?.plain_text || '',
        owner: r.properties['Owner']?.select?.name || '?',
        status: r.properties['Status']?.select?.name || 'To do',
      });
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
}

// ─── Top relationship-pipeline opps ────────────────────────────────
const topRelOpps = (oppsAll || [])
  .filter(o => Number(o.monetary_value || 0) > 0)
  .sort((a, b) => Number(b.monetary_value) - Number(a.monetary_value))
  .slice(0, 10);

console.log(`\nFocus page composition:`);
console.log(`  this-week actions: ${thisWeekActions.length}`);
console.log(`  FAIL orgs:         ${failOrgs.length}`);
console.log(`  stuck opps >180d:  ${stuckOpps.length}`);
console.log(`  overdue invoices:  ${(overdueInvoices || []).length}`);
console.log(`  easy-win stories:  ${easyWinNames.length}`);

if (!APPLY) {
  console.log('\nRe-run with --apply.');
  process.exit(0);
}

// ─── WRITE: create proposed action items ───────────────────────────
let createdActions = 0;
for (const a of proposed) {
  try {
    await notionFetch('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: ACTIONS_DB },
        properties: {
          Action: { title: [{ text: { content: a.action.slice(0, 200) } }] },
          Status: { select: { name: 'To do' } },
          Priority: { select: { name: a.priority } },
          Owner: { select: { name: a.owner } },
          Tier: { select: { name: a.tier } },
          Notes: { rich_text: [{ text: { content: a.notes.slice(0, 1800) } }] },
        },
      }),
    });
    createdActions++;
  } catch (e) {
    console.error(`  err "${a.action.slice(0, 40)}": ${e.message.slice(0, 100)}`);
  }
}
console.log(`Created ${createdActions} new Action Items.`);

// ─── WRITE: refresh focus page ─────────────────────────────────────
const search = await notionFetch('/search', { method: 'POST', body: JSON.stringify({ query: FOCUS_PAGE_NAME, filter: { value: 'page', property: 'object' } }) });
let focusPageId = search.results.find(p => p.properties?.title?.title?.[0]?.plain_text === FOCUS_PAGE_NAME)?.id;

const txt = s => ({ type: 'text', text: { content: s } });
const txtBold = s => ({ type: 'text', text: { content: s }, annotations: { bold: true } });
const p = s => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: Array.isArray(s) ? s : [txt(s)] } });
const h1 = s => ({ object: 'block', type: 'heading_1', heading_1: { rich_text: [txt(s)] } });
const h2 = s => ({ object: 'block', type: 'heading_2', heading_2: { rich_text: [txt(s)] } });
const li = s => ({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: Array.isArray(s) ? s : [txt(s)] } });
const todo = s => ({ object: 'block', type: 'to_do', to_do: { rich_text: [txt(s)], checked: false } });
const callout = (e, s) => ({ object: 'block', type: 'callout', callout: { icon: { type: 'emoji', emoji: e }, rich_text: [txt(s)] } });

const children = [
  callout('🎯', `Refreshed ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Updates daily 7am AEST.`),
  h1('This week — actions on the page'),
  ...(thisWeekActions.length === 0 ? [p('No this-week actions open.')] : thisWeekActions.slice(0, 25).map(a => todo(`[${a.owner}] ${a.action}${a.status === 'To do' ? '' : ' · ' + a.status}`))),

  h1('Funders flagged FAIL'),
  ...(failOrgs.length === 0 ? [p('None.')] : failOrgs.map(o => li(`${o.name} — $${o.outstanding.toFixed(0)} outstanding`))),

  h1('Top relationship-pipeline opps'),
  ...topRelOpps.slice(0, 10).map(o => li(`$${Number(o.monetary_value).toFixed(0).padStart(10)} · ${(o.name || '?').slice(0, 80)} · ${o.stage_name || '?'}`)),

  h1('Overdue receivables (30+ days)'),
  ...(overdueInvoices || []).slice(0, 8).map(i => li(`$${Number(i.amount_due).toFixed(0).padStart(8)} · ${i.contact_name} · ${i.invoice_number} · ${daysAgo(i.due_date)}d`)),

  h1('Opps stuck >180 days'),
  ...stuckOpps.slice(0, 8).map(o => li(`${(o.name || '?').slice(0, 80)} · ${o.stage_name} · $${Number(o.monetary_value).toFixed(0)} · ${daysAgo(o.ghl_updated_at)}d`)),

  h1('Stories ready to write (transcript exists)'),
  ...easyWinNames.slice(0, 8).map(s => li(`${s.display_name} — ${trCount.get(s.id)} transcript${trCount.get(s.id) === 1 ? '' : 's'} awaiting story`)),

  p([txtBold('Drift sweep this run: '), txt(`${createdActions} new action items created${createdActions === 0 ? ' (nothing newly out-of-band)' : ''}.`)]),
];

if (focusPageId) {
  // Clear existing children + replace
  const existing = await notionFetch(`/blocks/${focusPageId}/children?page_size=100`);
  for (const b of existing.results) {
    try { await notionFetch(`/blocks/${b.id}`, { method: 'DELETE' }); } catch {}
  }
  // Append new children in batches of 100
  for (let i = 0; i < children.length; i += 100) {
    await notionFetch(`/blocks/${focusPageId}/children`, { method: 'PATCH', body: JSON.stringify({ children: children.slice(i, i + 100) }) });
  }
  console.log(`Updated focus page: https://www.notion.so/${focusPageId.replace(/-/g, '')}`);
} else {
  const r = await notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { type: 'page_id', page_id: PARENT },
      icon: { type: 'emoji', emoji: '🎯' },
      properties: { title: [txt(FOCUS_PAGE_NAME)] },
      children: children.slice(0, 100),
    }),
  });
  // Append remainder if >100 blocks
  if (children.length > 100) {
    for (let i = 100; i < children.length; i += 100) {
      await notionFetch(`/blocks/${r.id}/children`, { method: 'PATCH', body: JSON.stringify({ children: children.slice(i, i + 100) }) });
    }
  }
  console.log(`Created focus page: ${r.url}`);
}
