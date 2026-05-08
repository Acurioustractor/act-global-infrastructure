#!/usr/bin/env node
/**
 * Daily Pulse → Notion. Writes a "📡 Today's Pulse" section to the top of the
 * ACT Money Framework page, refreshed each morning. The section renders the
 * same data as scripts/daily-money-briefing.mjs but for the durable Notion
 * surface (Telegram is the push; Notion is the read-back).
 *
 * Strategy: section-replace via H2 marker. Mirrors sync-money-framework-to-notion.mjs.
 * Runs AFTER dashboard-hub (so the marker survives the hub's full-page replace
 * — the hub doesn't write a Today's Pulse marker; we add it here) and BEFORE
 * sync-money-framework-to-notion.mjs (so the pulse sits ABOVE the framework
 * panels in reading order).
 *
 * Cron: daily 8:13am AEST (after Xero sync, before the rest of the chain).
 *
 * Usage:
 *   node scripts/sync-daily-pulse-to-notion.mjs              # full run
 *   node scripts/sync-daily-pulse-to-notion.mjs --dry-run    # preview blocks, no Notion write
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
await import(join(__dirname, 'lib/load-env.mjs'));

const DRY_RUN = process.argv.includes('--dry-run');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const cfg = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'notion-database-ids.json'), 'utf-8'));

const MARKER = '📡 Today’s Pulse';
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;

// ─── block builders (same shape as sync-money-framework-to-notion.mjs) ───
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

// ─── data ────────────────────────────────────────────────────────────────
async function fetchPulseData() {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const todayISO = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [
    { data: bank },
    { data: paidYesterday },
    { data: newOpps },
    { data: overdueTop },
    { data: dueThisWeek },
    { data: spend90 },
  ] = await Promise.all([
    supabase.from('xero_bank_accounts').select('name, current_balance').eq('type', 'BANK').eq('status', 'ACTIVE'),
    supabase.from('xero_invoices').select('invoice_number, contact_name, amount_paid, fully_paid_date').eq('type', 'ACCREC').gt('amount_paid', 0).gte('updated_at', yesterday).order('amount_paid', { ascending: false }).limit(5),
    supabase.from('ghl_opportunities').select('name, monetary_value, pipeline_name').eq('status', 'open').gte('ghl_created_at', yesterday).order('monetary_value', { ascending: false, nullsFirst: false }).limit(3),
    supabase.from('xero_invoices').select('invoice_number, contact_name, amount_due, due_date').eq('type', 'ACCREC').eq('status', 'AUTHORISED').gt('amount_due', 0).lt('due_date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)).order('amount_due', { ascending: false }).limit(3),
    supabase.from('xero_invoices').select('amount_due').eq('type', 'ACCREC').eq('status', 'AUTHORISED').gt('amount_due', 0).gte('due_date', todayISO).lte('due_date', weekAhead),
    supabase.from('xero_transactions').select('total').eq('type', 'SPEND').eq('status', 'AUTHORISED').gte('date', new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)),
  ]);

  const tradingBal = (bank || []).filter((a) => /everyday|maximiser/i.test(a.name)).reduce((s, a) => s + Number(a.current_balance || 0), 0);
  const monthlyBurn = (spend90 || []).reduce((s, t) => s + Number(t.total || 0), 0) / 3;
  const runway = monthlyBurn > 0 ? tradingBal / monthlyBurn : 999;
  const expectedThisWeek = (dueThisWeek || []).reduce((s, i) => s + Number(i.amount_due || 0), 0);

  // Pull critical/high actions from Notion Action Items DB if available
  let criticalActions = [];
  try {
    if (cfg.actionItemsDataSource) {
      const r = await notion.dataSources.query({
        data_source_id: cfg.actionItemsDataSource,
        page_size: 100,
        filter: { property: 'Status', select: { does_not_equal: 'Done' } },
      });
      criticalActions = (r.results || [])
        .filter((p) => {
          const pri = p.properties?.Priority?.select?.name;
          return pri === 'Critical' || pri === 'High';
        })
        .slice(0, 5)
        .map((p) => ({
          name: p.properties?.Task?.title?.[0]?.plain_text || p.properties?.Name?.title?.[0]?.plain_text || '(unnamed)',
          due: p.properties?.Due?.date?.start,
          priority: p.properties?.Priority?.select?.name,
        }));
    }
  } catch (e) {
    log(`Action items query failed (non-fatal): ${e.message?.slice(0, 80)}`);
  }

  return { tradingBal, runway, monthlyBurn, paidYesterday: paidYesterday || [], newOpps: newOpps || [], overdueTop: overdueTop || [], expectedThisWeek, criticalActions };
}

// ─── render ──────────────────────────────────────────────────────────────
function buildPulse(d) {
  const blocks = [];
  blocks.push(h2(MARKER));

  // One-line live state callout (the "ten-second answer")
  const stateColor = d.runway < 6 ? 'red_background' : d.runway < 12 ? 'orange_background' : 'green_background';
  blocks.push(callout([
    rt(`Bank ${fmt(d.tradingBal)}`, { bold: true }),
    rt('  ·  '),
    rt(`Runway ${d.runway >= 99 ? '∞' : d.runway.toFixed(1) + 'mo'}`, { bold: true }),
    rt('  ·  '),
    rt(`This week +${fmt(d.expectedThisWeek)} due`, { bold: true, color: 'green' }),
    rt('  ·  '),
    rt(`${d.criticalActions.length} critical/high today`, { bold: true, color: d.criticalActions.length > 0 ? 'orange' : 'gray' }),
  ], '\u{1F4F0}', stateColor));

  blocks.push(para([rt(`Refreshed ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' })} AEST · regenerates each weekday at 8:13am`, { italic: true, color: 'gray' })]));

  // Critical / high actions today
  if (d.criticalActions.length > 0) {
    blocks.push(h3('🎯 Today: critical / high'));
    for (const a of d.criticalActions) {
      const dueStr = a.due ? ` (due ${a.due})` : '';
      blocks.push(bullet([
        rt(`[${a.priority}] `, { bold: true, color: a.priority === 'Critical' ? 'red' : 'orange' }),
        rt(a.name),
        rt(dueStr, { color: 'gray' }),
      ]));
    }
  }

  // Yesterday's wins
  if (d.paidYesterday.length > 0) {
    blocks.push(h3('✅ Yesterday — paid'));
    for (const i of d.paidYesterday.slice(0, 5)) {
      blocks.push(bullet([
        rt(`${fmt(i.amount_paid)}  `, { bold: true, color: 'green' }),
        rt(i.invoice_number || '—'),
        rt(`  · ${(i.contact_name || '').slice(0, 40)}`, { color: 'gray' }),
      ]));
    }
  }

  // New pipeline (last 24h)
  if (d.newOpps.length > 0) {
    blocks.push(h3('✨ New pipeline (last 24h)'));
    for (const o of d.newOpps) {
      blocks.push(bullet([
        rt(o.monetary_value ? `${fmt(o.monetary_value)}  ` : '(unvalued)  ', { bold: true }),
        rt((o.name || '').slice(0, 60)),
        rt(`  · ${(o.pipeline_name || '').slice(0, 30)}`, { color: 'gray' }),
      ]));
    }
  }

  // Top overdue
  if (d.overdueTop.length > 0) {
    blocks.push(h3('🟠 Top overdue (>30 days)'));
    for (const i of d.overdueTop) {
      const daysOver = Math.round((Date.now() - new Date(i.due_date).getTime()) / 86400000);
      blocks.push(bullet([
        rt(`${fmt(i.amount_due)}  `, { bold: true, color: 'red' }),
        rt(i.invoice_number || '—'),
        rt(`  · ${(i.contact_name || '').slice(0, 35)}`, { color: 'gray' }),
        rt(`  · ${daysOver}d overdue`, { color: 'red' }),
      ]));
    }
  }

  blocks.push(divider());
  return blocks;
}

// ─── section-replace logic (mirrors sync-money-framework-to-notion.mjs) ───
async function findSectionRange(pageId) {
  const all = [];
  let cursor;
  do {
    const r = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
    all.push(...r.results);
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
  if (markerIdx === -1) return { delete: [], insertAfterId: null, prepend: true };

  const toDelete = [all[markerIdx].id];
  for (let i = markerIdx + 1; i < all.length; i++) {
    const b = all[i];
    if (b.type === 'heading_1' || b.type === 'heading_2') break;
    if (b.type === 'child_page' || b.type === 'child_database') continue;
    toDelete.push(b.id);
  }
  return { delete: toDelete, insertAfterId: markerIdx > 0 ? all[markerIdx - 1].id : null, prepend: false };
}

async function main() {
  log('=== Daily Pulse → Notion ===');
  const pageId = cfg.moneyFramework;
  if (!pageId) { log('ERROR: cfg.moneyFramework missing'); process.exit(1); }

  // Refuse to operate on a trashed page
  if (!DRY_RUN) {
    const page = await notion.pages.retrieve({ page_id: pageId });
    if (page.archived || page.in_trash) {
      log(`ABORT: moneyFramework (${pageId}) is in Trash. Restore it before re-running.`);
      process.exit(2);
    }
  }

  log('Fetching pulse data from Supabase + Notion...');
  const data = await fetchPulseData();
  log(`Bank ${fmt(data.tradingBal)} · Runway ${data.runway >= 99 ? '∞' : data.runway.toFixed(1) + 'mo'} · ${data.criticalActions.length} crit/high · ${data.paidYesterday.length} paid yesterday · ${data.overdueTop.length} top overdue`);

  const blocks = buildPulse(data);
  log(`Built ${blocks.length} blocks`);

  if (DRY_RUN) {
    log('DRY-RUN: skipping Notion write.');
    return;
  }

  const range = await findSectionRange(pageId);
  if (range.delete.length > 0) {
    log(`Deleting ${range.delete.length} existing pulse blocks...`);
    for (const id of range.delete) {
      try { await notion.blocks.delete({ block_id: id }); await sleep(80); } catch {}
    }
  }

  // If no marker found, prepend at the top of the page (Notion API: append-only,
  // so we use the order of children — first call places at end, but if page
  // is empty after dashboard-hub wipe, this lands at top).
  // For section-replace re-write, we use append (Notion's API doesn't expose
  // "insert at position" — but the deletion above frees the space, and the
  // hub is appended fresh each cron, so order is by run sequence).
  log(`Appending ${blocks.length} blocks...`);
  for (let i = 0; i < blocks.length; i += 50) {
    await notion.blocks.children.append({ block_id: pageId, children: blocks.slice(i, i + 50) });
    await sleep(300);
  }

  log(`Done. Open: notion.so/${pageId.replace(/-/g, '')}`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
