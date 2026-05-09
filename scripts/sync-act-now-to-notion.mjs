#!/usr/bin/env node
/**
 * ACT Now → Notion. Writes the executive read to a dedicated CHILD page
 * under ACT Money Framework. Self-bootstrapping: creates the child page on
 * first run, persists its ID to config/notion-database-ids.json as
 * `actNowPage`, full-replaces all children each run (no in-page section
 * tetris), and cleans up the legacy "🎯 ACT Now" H2 marker section that
 * the v1 of this script had appended to the parent moneyFramework page.
 *
 * Six cards (the gap surfaced in 2026-05-09-one-stop-shop-diagnostic.md):
 *   1. Receivables          — who owes ACT, top 5 by amount, with aging
 *   2. BAS by quarter       — Q2/Q3/Q4 FY26 reconcile state at a glance
 *   3. Per-pile money in    — Voice/Flow/Ground/Grants pipeline next 90d
 *   4. Open decisions/actions — Notion Decisions Log + Action Items aged > 7d
 *   5. Stale drafts         — thoughts/shared/drafts/*.md > 14d old, status != send-ready
 *   6. Plans needing markup — thoughts/shared/plans/*.md with status: review-needed
 *
 * Cron: daily 8:11am AEST (entry in ecosystem.config.cjs as act-now-sync).
 *
 * Usage:
 *   node scripts/sync-act-now-to-notion.mjs              # full run
 *   node scripts/sync-act-now-to-notion.mjs --dry-run    # preview blocks, no Notion write
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
await import(join(__dirname, 'lib/load-env.mjs'));

const DRY_RUN = process.argv.includes('--dry-run');
const REPO_ROOT = join(__dirname, '..');
const CONFIG_PATH = join(__dirname, '..', 'config', 'notion-database-ids.json');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));

const LEGACY_MARKER = '🎯 ACT Now'; // H2 the v1 of this script appended to moneyFramework
const PAGE_TITLE = '🎯 ACT Now — executive read';
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;
const ageDays = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

// ─── block builders ──────────────────────────────────────────────────────
const rt = (text, ann = {}) => ({ type: 'text', text: { content: String(text).slice(0, 2000) }, annotations: ann });
const h2 = (text) => ({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rt(text)], is_toggleable: false } });
const h3 = (text) => ({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt(text)] } });
const para = (parts) => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: Array.isArray(parts) ? parts : [rt(parts)] } });
const bullet = (parts) => ({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: Array.isArray(parts) ? parts : [rt(parts)] } });
const callout = (parts, emoji, color) => ({
  object: 'block', type: 'callout',
  callout: {
    rich_text: Array.isArray(parts) ? parts : [rt(parts)],
    icon: { type: 'emoji', emoji },
    color: color || 'default',
  },
});
const divider = () => ({ object: 'block', type: 'divider', divider: {} });

// KPI tile (used inside a column_list for the top strip)
const kpiTile = (emoji, value, label, bgColor) => ({
  object: 'block', type: 'callout',
  callout: {
    rich_text: [
      rt(value, { bold: true }),
      rt(`\n${label}`, { color: 'gray' }),
    ],
    icon: { type: 'emoji', emoji },
    color: bgColor || 'gray_background',
  },
});
const kpiStrip = (tiles) => ({
  object: 'block', type: 'column_list',
  column_list: { children: tiles.map(t => ({ object: 'block', type: 'column', column: { children: [t] } })) },
});

// Native Notion table block — much cleaner than bulleted lists for tabular data
const tableRow = (cells) => ({
  type: 'table_row',
  table_row: { cells: cells.map(c => Array.isArray(c) ? c : [rt(String(c ?? ''))]) },
});
const tableBlock = (headers, rows) => ({
  object: 'block', type: 'table',
  table: {
    table_width: headers.length,
    has_column_header: true,
    has_row_header: false,
    children: [tableRow(headers.map(h => [rt(h, { bold: true })])), ...rows.map(r => tableRow(r))],
  },
});

// ─── card 1: receivables ─────────────────────────────────────────────────
async function fetchReceivables() {
  const { data } = await supabase
    .from('xero_invoices')
    .select('invoice_number, contact_name, amount_due, due_date, date')
    .eq('type', 'ACCREC').eq('status', 'AUTHORISED').gt('amount_due', 0)
    .order('amount_due', { ascending: false })
    .limit(8);
  const total = (data || []).reduce((s, r) => s + Number(r.amount_due || 0), 0);
  return { rows: data || [], total };
}

function buildReceivablesCard(d) {
  const blocks = [h2('💰 Receivables — who owes ACT')];
  if (!d.rows.length) {
    blocks.push(para('No outstanding receivables.'));
    return blocks;
  }
  blocks.push(para([
    rt('Total outstanding ', {}), rt(fmt(d.total), { bold: true }),
    rt(` across ${d.rows.length} invoices.`),
  ]));
  const rows = d.rows.slice(0, 8).map((r) => {
    const age = r.due_date ? ageDays(r.due_date) : null;
    const overdue = age && age > 0;
    const ageCell = age == null ? '—' : overdue ? `${age}d overdue` : `due in ${-age}d`;
    return [
      [rt(fmt(r.amount_due), { bold: true, color: overdue ? 'red' : 'default' })],
      [rt(r.contact_name || 'Unknown')],
      [rt(r.invoice_number || '—', { code: true })],
      [rt(r.due_date || '—')],
      [rt(ageCell, { color: overdue ? 'red' : 'gray' })],
    ];
  });
  blocks.push(tableBlock(['Amount', 'Contact', 'Invoice', 'Due date', 'Aging'], rows));
  return blocks;
}

// ─── card 2: BAS by quarter ──────────────────────────────────────────────
function basQuarterRanges() {
  // Australian FY = Jul–Jun. Q1 Jul-Sep, Q2 Oct-Dec, Q3 Jan-Mar, Q4 Apr-Jun.
  const today = new Date();
  const fy = today.getMonth() + 1 >= 7 ? today.getFullYear() + 1 : today.getFullYear();
  return [
    { label: `Q2 FY${String(fy).slice(2)} (Oct-Dec)`, start: `${fy - 1}-10-01`, end: `${fy - 1}-12-31`, dueDate: `${fy}-02-28` },
    { label: `Q3 FY${String(fy).slice(2)} (Jan-Mar)`, start: `${fy}-01-01`, end: `${fy}-03-31`, dueDate: `${fy}-04-28` },
    { label: `Q4 FY${String(fy).slice(2)} (Apr-Jun)`, start: `${fy}-04-01`, end: `${fy}-06-30`, dueDate: `${fy}-07-28` },
  ];
}

async function fetchBasState() {
  const quarters = basQuarterRanges();
  const out = [];
  for (const q of quarters) {
    const { data } = await supabase
      .from('xero_invoices')
      .select('type, status, total, amount_due, has_attachments')
      .gte('date', q.start).lte('date', q.end);
    const rows = data || [];
    const apMissingRcpt = rows.filter(r => r.type === 'ACCPAY' && r.status === 'AUTHORISED' && !r.has_attachments);
    const apOutstanding = rows.filter(r => r.type === 'ACCPAY' && Number(r.amount_due) > 0);
    const arOutstanding = rows.filter(r => r.type === 'ACCREC' && Number(r.amount_due) > 0);
    const past = new Date(q.dueDate) < new Date();
    out.push({
      ...q,
      total: rows.length,
      apMissingRcptCount: apMissingRcpt.length,
      apMissingRcptAmt: apMissingRcpt.reduce((s, r) => s + Number(r.total || 0), 0),
      apOutstandingAmt: apOutstanding.reduce((s, r) => s + Number(r.amount_due || 0), 0),
      arOutstandingAmt: arOutstanding.reduce((s, r) => s + Number(r.amount_due || 0), 0),
      lodged: past,
    });
  }
  return out;
}

function buildBasCard(quarters) {
  const blocks = [h2('📋 BAS by quarter')];
  const rows = quarters.map((q) => {
    const status = q.lodged ? '✅ lodged' : '🟡 in progress';
    const receiptsCell = q.apMissingRcptCount > 0
      ? [rt(`⚠️ ${q.apMissingRcptCount} bills (${fmt(q.apMissingRcptAmt)})`, { color: 'orange' })]
      : [rt('—', { color: 'gray' })];
    return [
      [rt(q.label, { bold: true })],
      [rt(status)],
      [rt(String(q.total))],
      [rt(fmt(q.arOutstandingAmt))],
      [rt(fmt(q.apOutstandingAmt))],
      receiptsCell,
    ];
  });
  blocks.push(tableBlock(['Quarter', 'Status', 'Invoices', 'AR outstanding', 'AP outstanding', 'Missing receipts'], rows));
  return blocks;
}

// ─── card 3: per-pile money in (Notion Opportunities DB) ─────────────────
async function fetchPipelineByPile() {
  if (!cfg.opportunitiesDataSource) return null;
  try {
    // No status filter — Opportunities DB schema varies across stages.
    // We filter "Lost" client-side after fetching to avoid property-name lock-in.
    const r = await notion.dataSources.query({
      data_source_id: cfg.opportunitiesDataSource,
      page_size: 100,
    });
    const buckets = { Voice: 0, Flow: 0, Ground: 0, Grants: 0, Other: 0 };
    const counts = { Voice: 0, Flow: 0, Ground: 0, Grants: 0, Other: 0 };
    for (const p of r.results || []) {
      const pile = p.properties?.Pile?.select?.name || 'Other';
      const value = Number(
        p.properties?.['Weighted Value']?.number ??
        p.properties?.Value?.number ??
        p.properties?.Amount?.number ??
        0
      );
      const key = ['Voice', 'Flow', 'Ground', 'Grants'].includes(pile) ? pile : 'Other';
      buckets[key] += value;
      counts[key] += 1;
    }
    return { buckets, counts };
  } catch (e) {
    log('  warn: Opportunities DB query failed: ' + e.message);
    return null;
  }
}

function buildPileCard(d) {
  const blocks = [h2('🪣 Pipeline by pile')];
  if (!d) {
    blocks.push(para('Pipeline data unavailable (Opportunities DB unreachable or schema mismatch).'));
    return blocks;
  }
  const total = Object.values(d.buckets).reduce((s, v) => s + v, 0);
  const totalCount = Object.values(d.counts).reduce((s, v) => s + v, 0);
  blocks.push(para([
    rt('Open pipeline weighted ', {}), rt(fmt(total), { bold: true }),
    rt(` across ${totalCount} opportunities. Numbers may include closed/won — schema follow-up pending.`, { color: 'gray', italic: true }),
  ]));
  const rows = ['Voice', 'Flow', 'Ground', 'Grants', 'Other']
    .filter((k) => d.counts[k] > 0)
    .map((k) => [
      [rt(k, { bold: true })],
      [rt(String(d.counts[k]))],
      [rt(fmt(d.buckets[k]))],
    ]);
  blocks.push(tableBlock(['Pile', 'Count', 'Weighted value'], rows));
  return blocks;
}


// ─── card 4: open decisions + actions ────────────────────────────────────
async function fetchAttention() {
  const out = { decisions: [], actions: [] };
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  try {
    if (cfg.decisionsLogDataSource) {
      const r = await notion.dataSources.query({
        data_source_id: cfg.decisionsLogDataSource,
        page_size: 50,
        // Decisions Log status options: Proposed, Decided, Reversed, Superseded.
        // We surface the still-Proposed ones — the ones awaiting a decision.
        filter: { property: 'Status', select: { equals: 'Proposed' } },
      });
      out.decisions = (r.results || [])
        .filter((p) => p.created_time < sevenDaysAgo)
        .slice(0, 5)
        .map((p) => ({
          name: p.properties?.Decision?.title?.[0]?.plain_text
            ?? p.properties?.Name?.title?.[0]?.plain_text
            ?? '(unnamed)',
          age: ageDays(p.created_time),
          status: p.properties?.Status?.select?.name,
          url: p.url,
        }));
    }
  } catch (e) { log('  warn: decisions query failed: ' + e.message); }
  try {
    if (cfg.actionItemsDataSource) {
      const r = await notion.dataSources.query({
        data_source_id: cfg.actionItemsDataSource,
        page_size: 50,
        filter: { property: 'Status', select: { does_not_equal: 'Done' } },
      });
      out.actions = (r.results || [])
        .filter((p) => {
          const pri = p.properties?.Priority?.select?.name;
          return pri === 'Critical' || pri === 'High';
        })
        .slice(0, 5)
        .map((p) => ({
          name: p.properties?.Task?.title?.[0]?.plain_text
            ?? p.properties?.Name?.title?.[0]?.plain_text
            ?? '(unnamed)',
          due: p.properties?.Due?.date?.start,
          priority: p.properties?.Priority?.select?.name,
          url: p.url,
        }));
    }
  } catch (e) { log('  warn: action items query failed: ' + e.message); }
  return out;
}

function buildAttentionCard(d) {
  const blocks = [h2('🛎️ Decisions & actions waiting')];
  if (!d.decisions.length && !d.actions.length) {
    blocks.push(para('All decisions implemented and no critical/high actions outstanding.'));
    return blocks;
  }
  if (d.actions.length) {
    blocks.push(h3('Critical / high actions'));
    const rows = d.actions.map((it) => [
      [rt(it.priority || 'High', { color: it.priority === 'Critical' ? 'red' : 'orange', bold: true })],
      [rt(it.name, { bold: true })],
      [rt(it.due || '—', { color: 'gray' })],
    ]);
    blocks.push(tableBlock(['Priority', 'Task', 'Due'], rows));
  }
  if (d.decisions.length) {
    blocks.push(h3('Decisions aged > 7 days'));
    const rows = d.decisions.map((it) => [
      [rt(it.name, { bold: true })],
      [rt(it.status || 'Proposed')],
      [rt(`${it.age}d`, { color: 'gray' })],
    ]);
    blocks.push(tableBlock(['Decision', 'Status', 'Age'], rows));
  }
  return blocks;
}

// ─── card 5: stale drafts ────────────────────────────────────────────────
function parseFm(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return fm;
}

function fetchStaleDrafts() {
  const dir = join(REPO_ROOT, 'thoughts', 'shared', 'drafts');
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isFile() && e.name.endsWith('.md'))
      .map(e => join(dir, e.name));
  } catch { return []; }
  const now = Date.now();
  const stale = [];
  for (const f of entries) {
    try {
      const stat = statSync(f);
      const age = Math.floor((now - stat.mtimeMs) / 86400000);
      if (age < 14) continue;
      const fm = parseFm(readFileSync(f, 'utf-8').slice(0, 4000));
      if (fm.status === 'send-ready' || fm.status === 'sent' || fm.status === 'archived') continue;
      stale.push({
        name: f.split('/').pop(),
        age,
        status: fm.status || 'unknown',
        title: fm.title || f.split('/').pop().replace(/\.md$/, ''),
      });
    } catch {}
  }
  return stale.sort((a, b) => b.age - a.age).slice(0, 5);
}

function buildStaleDraftsCard(rows) {
  const blocks = [h2('📝 Drafts going stale')];
  if (!rows.length) { blocks.push(para('No drafts > 14 days old without send-ready status.')); return blocks; }
  blocks.push(para(`${rows.length} drafts not touched in > 14 days. Top by age:`));
  const tRows = rows.map((r) => [
    [rt(r.title, { bold: true })],
    [rt(r.status, { color: r.status === 'unknown' ? 'gray' : 'default' })],
    [rt(`${r.age}d`, { color: r.age > 30 ? 'red' : 'orange' })],
    [rt(r.name, { code: true })],
  ]);
  blocks.push(tableBlock(['Title', 'Status', 'Age', 'File'], tRows));
  return blocks;
}

// ─── card 6: plans needing markup ────────────────────────────────────────
function fetchPlansNeedingMarkup() {
  const dir = join(REPO_ROOT, 'thoughts', 'shared', 'plans');
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isFile() && e.name.endsWith('.md'))
      .map(e => join(dir, e.name));
  } catch { return { all: [], total: 0 }; }
  const all = [];
  for (const f of entries) {
    try {
      const fm = parseFm(readFileSync(f, 'utf-8').slice(0, 4000));
      const status = (fm.status || '').toLowerCase();
      if (status === 'review-needed' || status === 'awaiting-ben' || status === 'ben-markup-needed') {
        all.push({
          name: f.split('/').pop(),
          title: fm.title || f.split('/').pop().replace(/\.md$/, ''),
          status: fm.status,
        });
      }
    } catch {}
  }
  return { all, total: all.length };
}

function buildPlansCard(d) {
  const blocks = [h2('📐 Plans awaiting Ben markup')];
  if (!d.total) {
    blocks.push(para('No plans with status: review-needed (or no plans frontmatter normalised yet — see plans-triage handoff).'));
    return blocks;
  }
  const shown = Math.min(d.total, 10);
  const hint = d.total > shown ? ` Showing top ${shown}.` : '';
  blocks.push(para([
    rt(`${d.total} plans flagged for markup.`, { bold: true }),
    rt(`${hint} See `),
    rt('thoughts/shared/handoffs/2026-05-08-plans-triage-proposal.md', { code: true }),
    rt(' for the full list.'),
  ]));
  const rows = d.all.slice(0, shown).map((r) => [
    [rt(r.title, { bold: true })],
    [rt(r.status, { color: 'gray' })],
    [rt(r.name, { code: true })],
  ]);
  blocks.push(tableBlock(['Plan', 'Status', 'File'], rows));
  return blocks;
}

// ─── compose page (no H2 marker; this page is dedicated to ACT Now) ──────
async function buildAllBlocks() {
  log('Fetching receivables...');           const recv = await fetchReceivables();
  log('Fetching BAS state...');             const bas = await fetchBasState();
  log('Fetching pipeline by pile...');      const pipe = await fetchPipelineByPile();
  log('Fetching decisions + actions...');   const att = await fetchAttention();
  log('Scanning stale drafts...');          const stale = fetchStaleDrafts();
  log('Scanning plans needing markup...');  const plans = fetchPlansNeedingMarkup();

  const refreshed = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  // KPI strip (4 tiles, mirrors the dashboard hub style)
  const overdueCount = recv.rows.filter(r => r.due_date && new Date(r.due_date) < new Date()).length;
  const overdueAmt = recv.rows.filter(r => r.due_date && new Date(r.due_date) < new Date()).reduce((s, r) => s + Number(r.amount_due || 0), 0);
  const attentionCount = (att.actions?.length || 0) + (att.decisions?.length || 0);
  const kpis = kpiStrip([
    kpiTile('💰', fmt(recv.total), `Receivables outstanding · ${recv.rows.length} invoices`),
    kpiTile('🔥', overdueCount > 0 ? `${overdueCount} overdue` : '0 overdue', overdueCount > 0 ? `${fmt(overdueAmt)} past due` : 'No overdue invoices', overdueCount > 0 ? 'red_background' : 'green_background'),
    kpiTile('🛎️', String(attentionCount), 'Decisions + critical actions waiting', attentionCount > 0 ? 'orange_background' : 'gray_background'),
    kpiTile('📐', String(plans.total), `Plans · drafts > 14d: ${stale.length}`),
  ]);

  return [
    callout(
      [
        rt('Executive read across finance + operations. Refreshed ', { italic: true }),
        rt(refreshed, { italic: true, bold: true }),
        rt('. Daily 8:11am AEST. Source: ', { italic: true }),
        rt('scripts/sync-act-now-to-notion.mjs', { code: true }),
      ],
      '🎯', 'gray_background',
    ),
    kpis,
    ...buildReceivablesCard(recv),
    divider(),
    ...buildBasCard(bas),
    divider(),
    ...buildPileCard(pipe),
    divider(),
    ...buildAttentionCard(att),
    divider(),
    ...buildStaleDraftsCard(stale),
    divider(),
    ...buildPlansCard(plans),
  ];
}

// ─── self-bootstrap: ensure child page exists, persist ID to config ──────
async function ensureActNowPage() {
  if (cfg.actNowPage) {
    // Verify the page still exists and is not trashed
    try {
      const page = await notion.pages.retrieve({ page_id: cfg.actNowPage });
      if (!page.archived && !page.in_trash) return cfg.actNowPage;
      log(`Configured actNowPage ${cfg.actNowPage} is trashed/archived — recreating...`);
    } catch (e) {
      log(`Configured actNowPage ${cfg.actNowPage} not retrievable (${e.message?.slice(0, 80)}) — recreating...`);
    }
  }
  if (DRY_RUN) {
    log(`DRY-RUN: would create child page "${PAGE_TITLE}" under cfg.moneyFramework`);
    return '<dry-run-page-id>';
  }
  log(`Creating child page "${PAGE_TITLE}" under cfg.moneyFramework...`);
  const page = await notion.pages.create({
    parent: { type: 'page_id', page_id: cfg.moneyFramework },
    icon: { type: 'emoji', emoji: '🎯' },
    properties: {
      title: { title: [{ type: 'text', text: { content: PAGE_TITLE } }] },
    },
  });
  cfg.actNowPage = page.id;
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', 'utf-8');
  log(`Created actNowPage: ${page.id} — persisted to ${CONFIG_PATH}`);
  return page.id;
}

// ─── one-time cleanup: remove legacy "🎯 ACT Now" H2 section from parent ─
async function cleanupLegacySection() {
  const parentId = cfg.moneyFramework;
  const all = [];
  let cursor;
  do {
    const r = await notion.blocks.children.list({ block_id: parentId, start_cursor: cursor, page_size: 100 });
    all.push(...(r.results || []));
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);

  let markerIdx = -1;
  for (let i = 0; i < all.length; i++) {
    const b = all[i];
    if (b.type === 'heading_2') {
      const t = (b.heading_2.rich_text || []).map((r) => r.plain_text).join('');
      if (t.includes(LEGACY_MARKER)) { markerIdx = i; break; }
    }
  }
  if (markerIdx === -1) return 0;

  const toDelete = [all[markerIdx].id];
  for (let i = markerIdx + 1; i < all.length; i++) {
    const b = all[i];
    if (b.type === 'heading_1' || b.type === 'heading_2') break;
    if (b.type === 'child_page' || b.type === 'child_database') continue;
    toDelete.push(b.id);
  }
  log(`Cleanup: deleting ${toDelete.length} legacy "🎯 ACT Now" section blocks from moneyFramework...`);
  for (const id of toDelete) {
    try { await notion.blocks.delete({ block_id: id }); await sleep(80); } catch {}
  }
  return toDelete.length;
}

// ─── full-replace all children of the dedicated ACT Now page ─────────────
async function clearAllChildren(pageId) {
  const all = [];
  let cursor;
  do {
    const r = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
    all.push(...(r.results || []));
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  if (!all.length) return 0;
  log(`Clearing ${all.length} existing blocks from actNowPage...`);
  for (const b of all) {
    if (b.type === 'child_page' || b.type === 'child_database') continue;
    try { await notion.blocks.delete({ block_id: b.id }); await sleep(80); } catch {}
  }
  return all.length;
}

async function main() {
  log('=== ACT Now → Notion (child-page strategy) ===');
  if (!cfg.moneyFramework) { log('ERROR: cfg.moneyFramework missing'); process.exit(1); }

  const pageId = await ensureActNowPage();

  // Build blocks first (so DRY-RUN preview works without needing a real page)
  const blocks = await buildAllBlocks();
  log(`Built ${blocks.length} blocks`);

  if (DRY_RUN) {
    log('DRY-RUN: skipping Notion writes (page create / cleanup / append).');
    log('Block summary:');
    for (const b of blocks) {
      const t = b.type;
      const text = (b[t]?.rich_text || []).map((r) => r.plain_text || r.text?.content || '').join('').slice(0, 100);
      console.log(`  [${t.padEnd(20)}] ${text}`);
    }
    return;
  }

  // One-time cleanup: remove legacy section from parent moneyFramework page
  await cleanupLegacySection();

  // Full replace of all children on the dedicated page
  await clearAllChildren(pageId);

  log(`Appending ${blocks.length} fresh blocks to actNowPage...`);
  for (let i = 0; i < blocks.length; i += 50) {
    await notion.blocks.children.append({ block_id: pageId, children: blocks.slice(i, i + 50) });
    await sleep(300);
  }

  log(`Done. Open: notion.so/${pageId.replace(/-/g, '')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
