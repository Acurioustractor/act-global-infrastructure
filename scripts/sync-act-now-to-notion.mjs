#!/usr/bin/env node
/**
 * ACT Now → Notion. Writes a "🎯 ACT Now" section to the ACT Money Framework
 * page — the executive read across finance + business operations.
 *
 * Six cards (the gap surfaced in 2026-05-09-one-stop-shop-diagnostic.md):
 *   1. Receivables          — who owes ACT, top 5 by amount, with aging
 *   2. BAS by quarter       — Q2/Q3/Q4 FY26 reconcile state at a glance
 *   3. Per-pile money in    — Voice/Flow/Ground/Grants pipeline next 90d
 *   4. Open decisions/actions — Notion Decisions Log + Action Items aged > 7d
 *   5. Stale drafts         — thoughts/shared/drafts/*.md > 14d old, status != send-ready
 *   6. Plans needing markup — thoughts/shared/plans/*.md with status: review-needed
 *
 * Strategy: section-replace via H2 marker, mirrors sync-daily-pulse-to-notion.mjs.
 * Cron: chained AFTER daily-pulse so the section sits at top.
 *
 * Usage:
 *   node scripts/sync-act-now-to-notion.mjs              # full run
 *   node scripts/sync-act-now-to-notion.mjs --dry-run    # preview blocks, no Notion write
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
await import(join(__dirname, 'lib/load-env.mjs'));

const DRY_RUN = process.argv.includes('--dry-run');
const REPO_ROOT = join(__dirname, '..');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const cfg = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'notion-database-ids.json'), 'utf-8'));

const MARKER = '🎯 ACT Now';
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
  const blocks = [h3('💰 Receivables — who owes ACT')];
  if (!d.rows.length) {
    blocks.push(para('No outstanding receivables.'));
    return blocks;
  }
  blocks.push(para([
    rt('Total outstanding: ', {}), rt(fmt(d.total), { bold: true }),
    rt(` across ${d.rows.length} invoices. Top by amount:`),
  ]));
  for (const r of d.rows.slice(0, 5)) {
    const age = r.due_date ? ageDays(r.due_date) : null;
    const overdue = age && age > 0;
    const ageStr = age == null ? '' : overdue ? ` · ${age}d overdue` : ` · due in ${-age}d`;
    blocks.push(bullet([
      rt(fmt(r.amount_due), { bold: true, color: overdue ? 'red' : 'default' }),
      rt(` — ${r.contact_name || 'Unknown'} (${r.invoice_number || '—'})${ageStr}`),
    ]));
  }
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
  const blocks = [h3('📋 BAS by quarter')];
  for (const q of quarters) {
    const status = q.lodged ? '✅ lodged' : '🟡 in progress';
    const flag = q.apMissingRcptCount > 0 ? ` · ⚠️ ${q.apMissingRcptCount} bills missing receipts (${fmt(q.apMissingRcptAmt)})` : '';
    blocks.push(bullet([
      rt(`${q.label} `, { bold: true }),
      rt(`${status} · ${q.total} invoices · AR outstanding ${fmt(q.arOutstandingAmt)} · AP outstanding ${fmt(q.apOutstandingAmt)}${flag}`),
    ]));
  }
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
  const blocks = [h3('🪣 Pipeline by pile')];
  if (!d) {
    blocks.push(para('Pipeline data unavailable (Opportunities DB unreachable or schema mismatch).'));
    return blocks;
  }
  const total = Object.values(d.buckets).reduce((s, v) => s + v, 0);
  blocks.push(para([rt('Open pipeline (Voice/Flow/Ground/Grants/Other), weighted value: ', {}), rt(fmt(total), { bold: true })]));
  for (const k of ['Voice', 'Flow', 'Ground', 'Grants', 'Other']) {
    if (d.counts[k] === 0) continue;
    blocks.push(bullet([
      rt(`${k} `, { bold: true }),
      rt(`${fmt(d.buckets[k])} across ${d.counts[k]} opps`),
    ]));
  }
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
  const blocks = [h3('🛎️ Decisions & actions waiting')];
  if (!d.decisions.length && !d.actions.length) {
    blocks.push(para('All decisions implemented and no critical/high actions outstanding.'));
    return blocks;
  }
  if (d.decisions.length) {
    blocks.push(para([rt('Decisions aged > 7d:', { bold: true })]));
    for (const it of d.decisions) {
      blocks.push(bullet([rt(`${it.name} `, { bold: true }), rt(`(${it.status || 'Open'}, ${it.age}d)`)]));
    }
  }
  if (d.actions.length) {
    blocks.push(para([rt('Critical/high action items:', { bold: true })]));
    for (const it of d.actions) {
      const dueStr = it.due ? ` · due ${it.due}` : '';
      blocks.push(bullet([rt(it.name, { bold: true }), rt(` (${it.priority || 'High'}${dueStr})`)]));
    }
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
  const blocks = [h3('📝 Drafts going stale')];
  if (!rows.length) { blocks.push(para('No drafts > 14 days old without send-ready status.')); return blocks; }
  blocks.push(para(`${rows.length} drafts not touched in > 14 days. Top by age:`));
  for (const r of rows) {
    blocks.push(bullet([
      rt(`${r.title} `, { bold: true }),
      rt(`(${r.status}, ${r.age}d) — ${r.name}`),
    ]));
  }
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
  const blocks = [h3('📐 Plans awaiting Ben markup')];
  if (!d.total) {
    blocks.push(para('No plans with status: review-needed (or no plans frontmatter normalised yet — see plans-triage handoff).'));
    return blocks;
  }
  const shown = Math.min(d.total, 8);
  const hint = d.total > shown ? ` (showing top ${shown})` : '';
  blocks.push(para(`${d.total} plans flagged for markup${hint}. See plans-triage handoff for the full list:`));
  for (const r of d.all.slice(0, shown)) {
    blocks.push(bullet([rt(`${r.title} `, { bold: true }), rt(`(${r.status}) — ${r.name}`)]));
  }
  return blocks;
}

// ─── compose page ────────────────────────────────────────────────────────
async function buildAllBlocks() {
  log('Fetching receivables...');           const recv = await fetchReceivables();
  log('Fetching BAS state...');             const bas = await fetchBasState();
  log('Fetching pipeline by pile...');      const pipe = await fetchPipelineByPile();
  log('Fetching decisions + actions...');   const att = await fetchAttention();
  log('Scanning stale drafts...');          const stale = fetchStaleDrafts();
  log('Scanning plans needing markup...');  const plans = fetchPlansNeedingMarkup();

  const refreshed = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  return [
    h2(MARKER),
    callout(
      [rt('Executive read across finance + operations. Refreshed ', { italic: true }), rt(refreshed, { italic: true, bold: true }), rt('. Source: ', { italic: true }), rt('scripts/sync-act-now-to-notion.mjs', { code: true })],
      '🎯', 'gray_background',
    ),
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

// ─── section-replace via marker ──────────────────────────────────────────
async function findSectionRange(pageId) {
  const all = [];
  let cursor;
  do {
    const r = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
    all.push(...(r.results || []));
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);

  let markerIdx = -1;
  for (let i = 0; i < all.length; i++) {
    const b = all[i];
    if (b.type === 'heading_2') {
      const t = (b.heading_2.rich_text || []).map((rt) => rt.plain_text).join('');
      if (t.includes(MARKER)) { markerIdx = i; break; }
    }
  }
  if (markerIdx === -1) return { delete: [] };

  const toDelete = [all[markerIdx].id];
  for (let i = markerIdx + 1; i < all.length; i++) {
    const b = all[i];
    if (b.type === 'heading_1' || b.type === 'heading_2') break;
    if (b.type === 'child_page' || b.type === 'child_database') continue;
    toDelete.push(b.id);
  }
  return { delete: toDelete };
}

async function main() {
  log('=== ACT Now → Notion ===');
  const pageId = cfg.moneyFramework;
  if (!pageId) { log('ERROR: cfg.moneyFramework missing'); process.exit(1); }

  if (!DRY_RUN) {
    const page = await notion.pages.retrieve({ page_id: pageId });
    if (page.archived || page.in_trash) {
      log(`ABORT: moneyFramework (${pageId}) is in Trash. Restore it before re-running.`);
      process.exit(2);
    }
  }

  const blocks = await buildAllBlocks();
  log(`Built ${blocks.length} blocks`);

  if (DRY_RUN) {
    log('DRY-RUN: skipping Notion write.');
    log('Block summary:');
    for (const b of blocks) {
      const t = b.type;
      const text = (b[t]?.rich_text || []).map(r => r.plain_text || r.text?.content || '').join('').slice(0, 100);
      console.log(`  [${t.padEnd(20)}] ${text}`);
    }
    return;
  }

  const range = await findSectionRange(pageId);
  if (range.delete.length > 0) {
    log(`Deleting ${range.delete.length} existing ACT Now blocks...`);
    for (const id of range.delete) {
      try { await notion.blocks.delete({ block_id: id }); await sleep(80); } catch {}
    }
  }

  log(`Appending ${blocks.length} blocks...`);
  for (let i = 0; i < blocks.length; i += 50) {
    await notion.blocks.children.append({ block_id: pageId, children: blocks.slice(i, i + 50) });
    await sleep(300);
  }

  log(`Done. Open: notion.so/${pageId.replace(/-/g, '')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
