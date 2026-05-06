#!/usr/bin/env node
/**
 * Sync per-pile strategic pages to Notion
 *
 * Creates four child pages under ACT Money Framework:
 *   - 🎙️ Voice — Storytelling commercialisation
 *   - 🌊 Flow — Commercial scale (Goods + CivicGraph + JusticeHub)
 *   - 🌾 Ground — Place-anchored experiences
 *   - 🏛️ Grants — Philanthropic + government funding
 *
 * Each page is the STRATEGIC view for that pile, not a deal list:
 *   - One-line "what this pile is"
 *   - Big number: FY26 invoiced + open pipeline + FY27 target
 *   - The 1-2 questions to answer this quarter
 *   - Top 3-5 specific opportunities with click-through links
 *   - Strategic context (e.g. PICC concentration risk, CivicGraph absence)
 *
 * Re-runnable: replaces the page body each time.
 *
 * Usage:
 *   node scripts/sync-pile-pages-to-notion.mjs
 *   node scripts/sync-pile-pages-to-notion.mjs --dry-run
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const notionDbIdsPath = join(__dirname, '..', 'config', 'notion-database-ids.json');
const notionDbIds = JSON.parse(readFileSync(notionDbIdsPath, 'utf-8'));

const PARENT_PAGE = notionDbIds.moneyFramework;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;
const PILE_CONFIG = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'pile-mapping.json'), 'utf-8'));

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const fmt = (n) => {
  const v = Number(n || 0);
  return `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;
};
const xeroUrl = (id) => id ? `https://go.xero.com/app/invoicing/view/${id}` : null;
const ghlUrl = (id) => (GHL_LOCATION_ID && id) ? `https://app.gohighlevel.com/v2/location/${GHL_LOCATION_ID}/opportunities/list?opportunity=${id}` : null;
const isUrl = (s) => typeof s === 'string' && /^https?:\/\//i.test(s);

const rt = (text, opts = {}) => {
  const r = { type: 'text', text: { content: String(text).slice(0, 2000) } };
  if (opts.link) r.text.link = { url: opts.link };
  if (opts.bold || opts.italic || opts.color || opts.code) {
    r.annotations = {};
    if (opts.bold) r.annotations.bold = true;
    if (opts.italic) r.annotations.italic = true;
    if (opts.code) r.annotations.code = true;
    if (opts.color) r.annotations.color = opts.color;
  }
  return r;
};

const h2 = (t) => ({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rt(t)] } });
const h3 = (t) => ({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt(t)] } });
const para = (parts) => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: Array.isArray(parts) ? parts : [rt(parts)] } });
const bullet = (parts) => ({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: Array.isArray(parts) ? parts : [rt(parts)] } });
const callout = (parts, emoji, color) => ({ object: 'block', type: 'callout', callout: { rich_text: Array.isArray(parts) ? parts : [rt(parts)], icon: { type: 'emoji', emoji }, color: color || 'default' } });
const divider = () => ({ object: 'block', type: 'divider', divider: {} });

// ============================================
// Pile-specific strategic context (the "what this pile is" + key questions)
// ============================================

const PILE_CONTEXT = {
  Voice: {
    emoji: '\u{1F399}️',
    title: 'Voice — Storytelling commercialisation',
    purpose: 'The lane for Empathy Ledger storytelling and ACT-led photography/media work that pays for itself. Should be productisable over time. Currently single-customer concentrated.',
    fy27Target: 200000,
    keyQuestions: [
      'Is PICC photography "Voice" — or is it a one-off contract that should sit elsewhere? (95% of FY26 Voice = PICC)',
      'What does Empathy Ledger commercialisation look like as a product, not a service?',
      'What\'s the second commercial Voice contract that de-risks PICC dependency?',
    ],
    strategicNote: 'Voice "overperforms" target ($501K vs $200K FY27 target) but it\'s 95% one customer (PICC, $478K). If PICC doesn\'t renew at scale, Voice goes from $501K to $23K. Not a scaled motion yet — a single contract.',
    note_color: 'orange_background',
  },
  Flow: {
    emoji: '\u{1F30A}',
    title: 'Flow — Commercial scale',
    purpose: 'CivicGraph SaaS, Goods retail, JusticeHub partnerships, SMART Connect, Wilya Janta. Should be the largest commercial lane by FY29.',
    fy27Target: 1450000,
    keyQuestions: [
      'CivicGraph commercialisation: Option A (defer, accept FY27 target haircut), Option B (commit resourcing now), or Option C (lean on Goods + IPP JV instead)?',
      'Is the IPP JV with Oonchiumpa the actual unlock for Goods Demand Register $16M? Start the conversation now or wait?',
      'Goods Buyer Pipeline has 13 zero-value opportunities — what\'s the realistic $ estimate per buyer?',
    ],
    strategicNote: 'Flow "underperforms" target ($410K vs $1.45M FY27 target). The structural reason: CivicGraph has zero commercial revenue in FY26. Existing Flow is Goods buyer-network ($240K) + WJ + SMART + JH partnerships. The $16M Goods Demand Register pipeline exists but conversion needs the IPP JV.',
    note_color: 'red_background',
  },
  Ground: {
    emoji: '\u{1F33E}',
    title: 'Ground — Place-anchored experiences',
    purpose: 'Farm, Harvest, residencies, eco-tourism. Liability-separated entity (separate from ACT Pty trading). Currently small.',
    fy27Target: 150000,
    keyQuestions: [
      'When does the Farm entity get its own structure (separate legal entity for liability)?',
      'Harvest grants are mixed into the Grants pipeline — should there be a Ground-specific GHL pipeline?',
      'What\'s the commercial model: paid residencies, eco-tourism, retreat consulting, or all three?',
    ],
    strategicNote: 'Ground tracks roughly to target ($163K vs $150K). The challenge is structural: it needs its own legal entity, accounting separation, and a clearer commercial model. Currently a mix of Caravan retreats, Mounty Yarns, Harvest activity.',
    note_color: 'green_background',
  },
  Grants: {
    emoji: '\u{1F3DB}️',
    title: 'Grants — Philanthropic + government funding',
    purpose: 'Cross-pile funding via foundations, government departments, philanthropic capital. Largest line in FY26 ($968K, 47% of revenue).',
    fy27Target: 1000000,
    keyQuestions: [
      'How do we triage 32K GrantScope-discovered grants into 50 actionable researches? (currently 5 in progress)',
      '37 of 86 open grant opportunities (43%) have no project_code — fix the tagging before the next round.',
      'Centrecorp dominates ($619K of $968K in FY26). What\'s the next anchor funder?',
    ],
    strategicNote: 'Grants is on target ($968K vs $1M FY27 target) but heavily concentrated on Centrecorp. The 30 Apr 2027 R&DTI registration deadline + 56-day Pty cutover means this lane needs Standard Ledger + R&D consultant engagement now.',
    note_color: 'purple_background',
  },
};

// ============================================
// Fetch pile data
// ============================================

async function fetchPileData(pile) {
  const projectCodes = Object.keys(PILE_CONFIG.projects).filter(k => PILE_CONFIG.projects[k] === pile);

  const [
    { data: fy26Income },
    { data: ghlOpen },
    { data: xeroOutstanding },
  ] = await Promise.all([
    supabase.from('xero_invoices')
      .select('total, contact_name, project_code, income_type')
      .eq('type', 'ACCREC').eq('entity_code', 'ACT-ST')
      .gte('date', '2025-07-01').lte('date', '2026-06-30')
      .in('project_code', projectCodes)
      .neq('income_type', 'grant'),
    supabase.from('ghl_opportunities')
      .select('ghl_id, name, monetary_value, pipeline_name, stage_name, project_code')
      .eq('pile', pile).eq('status', 'open')
      .order('monetary_value', { ascending: false, nullsFirst: false })
      .limit(5),
    pile === 'Grants' ? Promise.resolve({ data: [] }) :
      supabase.from('xero_invoices')
        .select('xero_id, invoice_number, contact_name, amount_due, due_date, project_code')
        .eq('type', 'ACCREC').gt('amount_due', 0)
        .in('project_code', projectCodes)
        .order('amount_due', { ascending: false }).limit(5),
  ]);

  // For Grants pile, override income query (it's by income_type, not project)
  let fy26Total = 0;
  if (pile === 'Grants') {
    const { data: grantIncome } = await supabase.from('xero_invoices')
      .select('total, contact_name')
      .eq('type', 'ACCREC').eq('entity_code', 'ACT-ST')
      .eq('income_type', 'grant')
      .gte('date', '2025-07-01').lte('date', '2026-06-30');
    fy26Total = (grantIncome || []).reduce((s, r) => s + Number(r.total || 0), 0);
  } else {
    fy26Total = (fy26Income || []).reduce((s, r) => s + Number(r.total || 0), 0);
  }

  // Top foundation grants for Grants pile
  let topGrants = [];
  if (pile === 'Grants') {
    const { data } = await supabase.from('grant_opportunities')
      .select('id, name, amount_max, deadline, url, foundations:foundation_id(name)')
      .or('pipeline_stage.eq.discovered,pipeline_stage.is.null')
      .gte('amount_max', 50000).lte('amount_max', 5000000)
      .not('foundation_id', 'is', null)
      .not('name', 'ilike', 'ARC Centre%')
      .order('amount_max', { ascending: false })
      .limit(8);
    topGrants = (data || [])
      .filter(g => !g.deadline || new Date(g.deadline) > new Date())
      .filter(g => g.foundations && !/universit/i.test(g.foundations.name || ''))
      .slice(0, 5);
  }

  return {
    fy26Total,
    ghlOpen: ghlOpen || [],
    xeroOutstanding: xeroOutstanding || [],
    topGrants,
  };
}

// ============================================
// Build pile page content
// ============================================

function buildPilePageBlocks(pile, data) {
  const ctx = PILE_CONTEXT[pile];
  const blocks = [];

  // Hero summary
  blocks.push(callout([
    rt(`${fmt(data.fy26Total)} FY26 invoiced`, { bold: true }),
    rt('  •  '),
    rt(`${fmt(ctx.fy27Target)} FY27 target`),
    rt('  •  '),
    rt(`${data.ghlOpen.length} active in GHL`, { color: 'purple' }),
    pile !== 'Grants' ? rt(`  •  ${data.xeroOutstanding.length} outstanding in Xero`, { color: 'blue' }) : rt(''),
  ], ctx.emoji, 'gray_background'));

  // Purpose
  blocks.push(para([rt(ctx.purpose)]));

  // Strategic note
  blocks.push(callout([rt(ctx.strategicNote)], '\u{1F4A1}', ctx.note_color));

  // Key questions
  blocks.push(h3('\u{2753} Questions to answer this quarter'));
  for (const q of ctx.keyQuestions) {
    blocks.push(bullet(q));
  }

  // Active GHL opportunities
  if (data.ghlOpen.length > 0) {
    blocks.push(h3('\u{1F4BC} Top active opportunities (GHL)'));
    for (const o of data.ghlOpen) {
      const url = ghlUrl(o.ghl_id);
      const title = o.name?.slice(0, 70) || 'unnamed';
      blocks.push(bullet([
        rt(`${fmt(o.monetary_value || 0).padEnd(12)}  `, { bold: true }),
        url ? rt(title, { link: url, bold: true }) : rt(title, { bold: true }),
        rt(`  —  ${o.pipeline_name || ''} · ${o.stage_name || ''}${o.project_code ? ' · ' + o.project_code : ''}`, { color: 'gray' }),
      ]));
    }
  }

  // Outstanding Xero (non-Grants piles)
  if (data.xeroOutstanding.length > 0) {
    blocks.push(h3('\u{1F9FE} Outstanding receivables (Xero)'));
    for (const i of data.xeroOutstanding) {
      const url = xeroUrl(i.xero_id);
      const overdue = i.due_date && new Date(i.due_date) < new Date();
      blocks.push(bullet([
        rt(`${fmt(i.amount_due).padEnd(12)}  `, { bold: true, color: overdue ? 'red' : 'default' }),
        url ? rt(`${i.invoice_number || ''} · ${i.contact_name?.slice(0, 40) || ''}`, { link: url, bold: true }) : rt(`${i.invoice_number || ''} · ${i.contact_name?.slice(0, 40) || ''}`, { bold: true }),
        rt(`  —  due ${i.due_date || 'n/a'}${overdue ? ' · OVERDUE' : ''}`, { color: overdue ? 'red' : 'gray' }),
      ]));
    }
  }

  // Foundation grants (Grants pile only)
  if (data.topGrants.length > 0) {
    blocks.push(h3('\u{1F3DB}️ Top foundation grants to research'));
    for (const g of data.topGrants) {
      const f = g.foundations || {};
      const url = isUrl(g.url) ? g.url : null;
      blocks.push(bullet([
        rt(`${fmt(g.amount_max).padEnd(12)}  `, { bold: true }),
        url ? rt(g.name?.slice(0, 70) || 'unnamed', { link: url, bold: true }) : rt(g.name?.slice(0, 70) || 'unnamed', { bold: true }),
        rt(`  —  ${f.name?.slice(0, 40) || ''} · ${g.deadline || 'rolling'}`, { color: 'gray' }),
      ]));
    }
  }

  blocks.push(divider());
  blocks.push(para([
    rt('Drill in: ', { italic: true, color: 'gray' }),
    rt('Filter the ACT Opportunities database by Pile = ' + pile, { italic: true, color: 'gray' }),
    rt('. Refresh: ', { italic: true, color: 'gray' }),
    rt('node scripts/sync-pile-pages-to-notion.mjs', { code: true }),
  ]));

  return blocks;
}

// ============================================
// Page management — find or create child page per pile
// ============================================

async function findOrCreatePilePage(pile) {
  const ctx = PILE_CONTEXT[pile];
  const pageKey = `pilePage_${pile.toLowerCase()}`;

  if (notionDbIds[pageKey]) return notionDbIds[pageKey];

  log(`Creating page: ${ctx.title}`);
  if (DRY_RUN) return 'dry-run-page-id';

  const page = await notion.pages.create({
    parent: { type: 'page_id', page_id: PARENT_PAGE },
    properties: { title: [{ type: 'text', text: { content: ctx.title } }] },
    icon: { type: 'emoji', emoji: ctx.emoji },
  });
  notionDbIds[pageKey] = page.id;
  writeFileSync(notionDbIdsPath, JSON.stringify(notionDbIds, null, 2) + '\n');
  log(`Created ${pile} page: ${page.id}`);
  return page.id;
}

async function replacePageBody(pageId, blocks) {
  if (DRY_RUN) {
    log(`[DRY RUN] would replace ${pageId} with ${blocks.length} blocks`);
    return;
  }
  // Delete all existing blocks
  let cursor = undefined;
  const toDelete = [];
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
    toDelete.push(...res.results.filter(b => b.type !== "child_database" && b.type !== "child_page").map(b => b.id));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  for (const blockId of toDelete) {
    try { await notion.blocks.delete({ block_id: blockId }); await sleep(120); } catch {}
  }

  // Append new
  const batchSize = 50;
  for (let i = 0; i < blocks.length; i += batchSize) {
    const batch = blocks.slice(i, i + batchSize);
    await notion.blocks.children.append({ block_id: pageId, children: batch });
    await sleep(300);
  }
}

// ============================================
// Main
// ============================================

async function main() {
  log('=== Pile pages → Notion ===');
  if (DRY_RUN) log('DRY RUN MODE');

  if (!process.env.NOTION_TOKEN) { log('ERROR: NOTION_TOKEN not set'); process.exit(1); }
  if (!PARENT_PAGE) { log('ERROR: moneyFramework page not configured'); process.exit(1); }

  for (const pile of ['Voice', 'Flow', 'Ground', 'Grants']) {
    log(`\n--- ${pile} ---`);
    const data = await fetchPileData(pile);
    log(`  FY26 invoiced: ${fmt(data.fy26Total)}`);
    log(`  GHL open: ${data.ghlOpen.length}`);
    log(`  Xero outstanding: ${data.xeroOutstanding.length}`);
    log(`  Top grants: ${data.topGrants.length}`);

    const pageId = await findOrCreatePilePage(pile);
    if (DRY_RUN) continue;
    const blocks = buildPilePageBlocks(pile, data);
    await replacePageBody(pageId, blocks);
    log(`  Updated page (${blocks.length} blocks)`);
  }

  log('\nDone.');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
