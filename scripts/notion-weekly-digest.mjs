#!/usr/bin/env node
/**
 * Weekly digest — posts a Monday morning summary page to Notion.
 *
 * Pulls fresh data from the 5 mirrored Notion DBs + Supabase signals and
 * writes a new "Weekly Digest YYYY-MM-DD" page under Mission Control.
 *
 * Sections:
 *   - This week's headlines (movements)
 *   - Receivables status (paid this week, new open, overdue critical)
 *   - Pipeline movement (stage changes inferred from updated_at)
 *   - Stories captured this week (EL Stories created in last 7 days)
 *   - Action items still To-do this week
 *   - Funder Cadence: FAIL/WARN orgs requiring eyes
 *
 * Env:
 *   NOTION_MIRROR_TOKEN, NOTION_* DB IDs
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/notion-weekly-digest.mjs           # dry-run (prints what it would post)
 *   node scripts/notion-weekly-digest.mjs --apply   # creates the page
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));

const APPLY = process.argv.includes('--apply');
const TOKEN = process.env.NOTION_MIRROR_TOKEN;
const PARENT = '305ebcf9-81cf-81e9-8d08-e30d3f3416b1';
const ORGS_DB = process.env.NOTION_ORGANISATIONS_DB_ID;
const ACTIONS_DB = process.env.NOTION_ACTION_ITEMS_DB_ID;
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);
const el = createClient(process.env.EL_SUPABASE_URL, process.env.EL_SUPABASE_SERVICE_KEY);

async function notionFetch(path, init = {}) {
  const r = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`Notion ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

const today = new Date();
const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 3600 * 1000);
const isoToday = today.toISOString().split('T')[0];
const isoWeekAgo = oneWeekAgo.toISOString().split('T')[0];

console.log(`notion-weekly-digest — ${APPLY ? 'APPLY' : 'DRY-RUN'} — covering ${isoWeekAgo} → ${isoToday}`);

// ─── Section: Receivables ─────────────────────────────────────────
const { data: paidThisWeek } = await supabase
  .from('xero_invoices')
  .select('contact_name, invoice_number, amount_paid, fully_paid_on_date')
  .eq('type', 'ACCREC')
  .eq('status', 'PAID')
  .gte('fully_paid_on_date', isoWeekAgo)
  .order('amount_paid', { ascending: false });

const { data: openOverdue } = await supabase
  .from('xero_invoices')
  .select('contact_name, invoice_number, amount_due, due_date')
  .eq('type', 'ACCREC')
  .eq('status', 'AUTHORISED')
  .lt('due_date', isoToday)
  .order('amount_due', { ascending: false });

const paidThisWeekTotal = (paidThisWeek || []).reduce((s, i) => s + Number(i.amount_paid || 0), 0);
const overdueTotal = (openOverdue || []).reduce((s, i) => s + Number(i.amount_due || 0), 0);

// ─── Section: Stories this week ───────────────────────────────────
const { data: newStories } = await el
  .from('stories')
  .select('id, title, storyteller_id, created_at')
  .gte('created_at', isoWeekAgo)
  .order('created_at', { ascending: false });

// ─── Section: Pipeline movement ───────────────────────────────────
const { data: oppMoves } = await supabase
  .from('ghl_opportunities')
  .select('name, stage_name, status, monetary_value, ghl_updated_at')
  .gte('ghl_updated_at', isoWeekAgo)
  .order('ghl_updated_at', { ascending: false })
  .limit(20);

// ─── Section: Open Action items ───────────────────────────────────
const openActions = [];
{
  let cursor = null;
  while (true) {
    const body = { page_size: 100, filter: { property: 'Status', select: { does_not_equal: 'Done' } } };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${ACTIONS_DB}/query`, { method: 'POST', body: JSON.stringify(body) });
    for (const r of data.results) {
      const action = r.properties['Action']?.title?.[0]?.plain_text || '';
      const priority = r.properties['Priority']?.select?.name || '?';
      const owner = r.properties['Owner']?.select?.name || '?';
      const status = r.properties['Status']?.select?.name || 'To do';
      openActions.push({ action, priority, owner, status });
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
}
const thisWeekActions = openActions.filter(a => a.priority === 'This week');

// ─── Section: Funder Cadence FAIL/WARN ────────────────────────────
const failWarnOrgs = [];
{
  let cursor = null;
  while (true) {
    const body = { page_size: 100, filter: { or: [
      { property: 'Funder Cadence', select: { equals: 'FAIL' } },
      { and: [
        { property: 'Funder Cadence', select: { equals: 'WARN' } },
        { property: 'Open Pipeline Value', number: { greater_than: 0 } },
      ] },
    ] } };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(`/databases/${ORGS_DB}/query`, { method: 'POST', body: JSON.stringify(body) });
    for (const r of data.results) {
      const name = r.properties['Name']?.title?.[0]?.plain_text || '';
      const cadence = r.properties['Funder Cadence']?.select?.name || '?';
      const pipeline = r.properties['Open Pipeline Value']?.number || 0;
      const outstanding = r.properties['Outstanding (Xero)']?.number || 0;
      const lastContact = r.properties['Last Contact']?.date?.start || null;
      failWarnOrgs.push({ name, cadence, pipeline, outstanding, lastContact });
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
}
failWarnOrgs.sort((a, b) => (a.cadence === 'FAIL' ? -1 : 1) - (b.cadence === 'FAIL' ? -1 : 1) || b.pipeline - a.pipeline);

// ─── Print summary ────────────────────────────────────────────────
console.log(`\nReceivables: $${paidThisWeekTotal.toFixed(0)} paid · $${overdueTotal.toFixed(0)} overdue across ${(openOverdue || []).length} invoices`);
console.log(`Stories: ${(newStories || []).length} created this week`);
console.log(`Pipeline moves: ${(oppMoves || []).length} opps touched`);
console.log(`Open action items: ${openActions.length} (${thisWeekActions.length} flagged THIS WEEK)`);
console.log(`Funder Cadence: ${failWarnOrgs.filter(o => o.cadence === 'FAIL').length} FAIL · ${failWarnOrgs.filter(o => o.cadence === 'WARN').length} WARN with open pipeline`);

if (!APPLY) { console.log('\nRe-run with --apply to post.'); process.exit(0); }

// ─── Build & post Notion page ─────────────────────────────────────
const txt = s => ({ type: 'text', text: { content: s } });
const txtBold = s => ({ type: 'text', text: { content: s }, annotations: { bold: true } });
const p = kids => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: Array.isArray(kids) ? kids : [txt(kids)] } });
const h1 = s => ({ object: 'block', type: 'heading_1', heading_1: { rich_text: [txt(s)] } });
const h2 = s => ({ object: 'block', type: 'heading_2', heading_2: { rich_text: [txt(s)] } });
const li = kids => ({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: Array.isArray(kids) ? kids : [txt(kids)] } });
const callout = (e, s) => ({ object: 'block', type: 'callout', callout: { icon: { type: 'emoji', emoji: e }, rich_text: [txt(s)] } });

const children = [
  callout('📅', `${isoWeekAgo} → ${isoToday}`),

  h1('Headlines'),
  li([txtBold('$' + paidThisWeekTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')), txt(` paid this week (Xero ACCREC)`)]),
  li([txtBold('$' + overdueTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')), txt(` across ${(openOverdue || []).length} overdue invoices`)]),
  li([txtBold((newStories || []).length.toString()), txt(' new stories created in Empathy Ledger')]),
  li([txtBold((oppMoves || []).length.toString()), txt(' opportunities touched (stage / value / status)')]),
  li([txtBold(thisWeekActions.length.toString()), txt(' action items flagged for this week')]),
  li([txtBold(failWarnOrgs.filter(o => o.cadence === 'FAIL').length.toString()), txt(' orgs at FAIL cadence (need eyes)')]),

  h1('Money'),
  h2('Paid this week'),
  ...(paidThisWeek || []).slice(0, 10).map(i => li(`$${Number(i.amount_paid).toFixed(0)} · ${i.contact_name} · ${i.invoice_number}`)),
  h2('Open overdue (top 10)'),
  ...(openOverdue || []).slice(0, 10).map(i => li(`$${Number(i.amount_due).toFixed(0)} · ${i.contact_name} · ${i.invoice_number} · due ${i.due_date}`)),

  h1('Pipeline movement'),
  ...(oppMoves || []).slice(0, 10).map(o => li(`${o.name?.slice(0, 80)} · ${o.stage_name} · ${o.status} · $${Number(o.monetary_value || 0).toFixed(0)}`)),

  h1('Stories captured this week'),
  ...((newStories || []).length > 0
    ? (newStories || []).map(s => li(`${(s.title || '?').slice(0, 100)} · ${s.created_at?.split('T')[0]}`))
    : [p('No new stories this week.')]),

  h1('This week — action items'),
  ...(thisWeekActions.length > 0
    ? thisWeekActions.map(a => li(`[${a.owner}] ${a.action} · ${a.status}`))
    : [p('No this-week action items open.')]),

  h1('Funder Cadence — eyes needed'),
  h2('FAIL'),
  ...failWarnOrgs.filter(o => o.cadence === 'FAIL').map(o => li(`${o.name} · pipeline $${o.pipeline.toFixed(0)} · outstanding $${o.outstanding.toFixed(0)} · last contact ${o.lastContact || '—'}`)),
  h2('WARN with open pipeline (top 10)'),
  ...failWarnOrgs.filter(o => o.cadence === 'WARN').slice(0, 10).map(o => li(`${o.name} · pipeline $${o.pipeline.toFixed(0)} · last contact ${o.lastContact || '—'}`)),
];

const data = await notionFetch('/pages', {
  method: 'POST',
  body: JSON.stringify({
    parent: { type: 'page_id', page_id: PARENT },
    icon: { type: 'emoji', emoji: '📊' },
    properties: { title: [txt(`Weekly Digest — ${isoToday}`)] },
    children: children.slice(0, 100), // Notion 100-block cap on initial create
  }),
});
console.log(`\nPosted: ${data.url}`);
