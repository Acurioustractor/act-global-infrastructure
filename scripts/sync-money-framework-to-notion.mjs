#!/usr/bin/env node
/**
 * Sync ACT Money Framework to Notion
 *
 * Pushes the unified money-movement framework view to a Notion page using
 * real Xero data from Supabase. Mirrors wiki/finance/act-money-framework.md.
 *
 * Panels:
 *   1. Entity ledger    — bank balance + per-entity position
 *   2. Pile income      — Voice / Flow / Ground / Grants / Other (FY26 YTD)
 *   3. Channel flow     — money in/out by framework channel #
 *   4. Founder take     — Ben & Nic YTD across all channels (where data allows)
 *   5. Compliance flags — Div 7A, franking, trust resolutions, R&D deadline
 *   6. 13-week forecast — open invoices, scheduled bills, runway
 *
 * Re-run anytime: `node scripts/sync-money-framework-to-notion.mjs`
 *
 * Usage:
 *   node scripts/sync-money-framework-to-notion.mjs              # Full update
 *   node scripts/sync-money-framework-to-notion.mjs --dry-run    # Preview
 *   node scripts/sync-money-framework-to-notion.mjs --verbose
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const MARKDOWN = args.includes('--markdown');

const SECTION_MARKER = '\u{1F3DB}️ ACT Money Framework';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const notionDbIdsPath = join(__dirname, '..', 'config', 'notion-database-ids.json');
const notionDbIds = JSON.parse(readFileSync(notionDbIdsPath, 'utf-8'));

const FY26_START = '2025-07-01';
const FY26_END = '2026-06-30';
const RD_REGISTRATION_DEADLINE = new Date('2027-04-30');

// Deep-link URL builders
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || process.env.NEXT_PUBLIC_GHL_LOCATION_ID;
const xeroInvoiceUrl = (xeroId) => xeroId ? `https://go.xero.com/app/invoicing/view/${xeroId}` : null;
const ghlOpportunityUrl = (ghlId) => (GHL_LOCATION_ID && ghlId) ? `https://app.gohighlevel.com/v2/location/${GHL_LOCATION_ID}/opportunities/list?opportunity=${ghlId}` : null;
const isValidUrl = (s) => typeof s === 'string' && /^https?:\/\//i.test(s);

// ============================================
// Pile mapping (project_code + income_type → pile)
// ============================================

// Pile map loaded from canonical config (single source of truth)
const PILE_CONFIG = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'pile-mapping.json'), 'utf-8'));
const PILE_BY_PROJECT = PILE_CONFIG.projects;

function pileFor(projectCode, incomeType) {
  if (incomeType === 'grant') return 'Grants';
  if (!projectCode) return 'Uncoded';
  return PILE_BY_PROJECT[projectCode] || 'Other';
}

// ============================================
// Helpers
// ============================================

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`); }
function verbose(msg) { if (VERBOSE) log(msg); }

function fmt(amount) {
  if (amount == null) return '$0';
  const n = Number(amount);
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtMonth(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr.length === 7 ? dateStr + '-01' : dateStr).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

// ============================================
// Notion block builders
// ============================================

function rt(text, opts = {}) {
  const r = { type: 'text', text: { content: text } };
  if (opts.link) r.text.link = { url: opts.link };
  if (opts.bold || opts.italic || opts.color || opts.code) {
    r.annotations = {};
    if (opts.bold) r.annotations.bold = true;
    if (opts.italic) r.annotations.italic = true;
    if (opts.code) r.annotations.code = true;
    if (opts.color) r.annotations.color = opts.color;
  }
  return r;
}

const h2 = (text) => ({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rt(text)], is_toggleable: false } });
const h3 = (text) => ({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt(text)] } });
const para = (parts) => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: Array.isArray(parts) ? parts : [rt(parts)] } });
const bullet = (parts) => ({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: Array.isArray(parts) ? parts : [rt(parts)] } });
const callout = (parts, emoji, color) => ({ object: 'block', type: 'callout', callout: { rich_text: Array.isArray(parts) ? parts : [rt(parts)], icon: { type: 'emoji', emoji }, color: color || 'default' } });
const divider = () => ({ object: 'block', type: 'divider', divider: {} });

function tableRow(cells) {
  return {
    object: 'block', type: 'table_row',
    table_row: { cells: cells.map(c => Array.isArray(c) ? c : [rt(String(c))]) },
  };
}

function tableBlock(headerRow, rows) {
  return {
    object: 'block', type: 'table',
    table: {
      table_width: headerRow.length,
      has_column_header: true,
      has_row_header: false,
      children: [tableRow(headerRow), ...rows.map(r => tableRow(r))],
    },
  };
}

// ============================================
// Data fetching
// ============================================

async function fetchPileIncome() {
  const { data, error } = await supabase
    .from('xero_invoices')
    .select('project_code, income_type, total, contact_name, date')
    .eq('type', 'ACCREC')
    .eq('entity_code', 'ACT-ST')
    .gte('date', FY26_START)
    .lte('date', FY26_END);
  if (error) throw error;

  const byPile = {};
  const byProject = {};
  let total = 0;
  for (const inv of (data || [])) {
    const pile = pileFor(inv.project_code, inv.income_type);
    const amt = Number(inv.total || 0);
    total += amt;
    if (!byPile[pile]) byPile[pile] = { amount: 0, count: 0 };
    byPile[pile].amount += amt;
    byPile[pile].count += 1;

    const key = `${inv.project_code || '(uncoded)'}|${inv.income_type || '(none)'}`;
    if (!byProject[key]) byProject[key] = { project_code: inv.project_code || '(uncoded)', income_type: inv.income_type || '(none)', pile, amount: 0, count: 0 };
    byProject[key].amount += amt;
    byProject[key].count += 1;
  }
  return { byPile, byProject, total };
}

async function fetchPipelineByPile() {
  // GHL open opportunities grouped by pile (via project_code mapping)
  const { data: opps, error } = await supabase
    .from('ghl_opportunities')
    .select('project_code, monetary_value, status, pipeline_name')
    .eq('status', 'open');
  if (error) throw error;

  const byPile = {};
  const byPipeline = {};
  let totalOpen = 0;
  for (const o of (opps || [])) {
    // Pipeline name as proxy for pile when project_code is missing
    let pile = pileFor(o.project_code, null);
    if (pile === 'Uncoded' && /grant/i.test(o.pipeline_name || '')) pile = 'Grants';
    const amt = Number(o.monetary_value || 0);
    totalOpen += amt;
    if (!byPile[pile]) byPile[pile] = { amount: 0, count: 0 };
    byPile[pile].amount += amt;
    byPile[pile].count += 1;

    const pn = o.pipeline_name || '(no pipeline)';
    if (!byPipeline[pn]) byPipeline[pn] = { amount: 0, count: 0 };
    byPipeline[pn].amount += amt;
    byPipeline[pn].count += 1;
  }

  // Won / lost FY26
  const { data: closed } = await supabase
    .from('ghl_opportunities')
    .select('status, monetary_value')
    .in('status', ['won', 'lost']);
  let won = 0, lost = 0, wonCount = 0, lostCount = 0;
  for (const c of (closed || [])) {
    const a = Number(c.monetary_value || 0);
    if (c.status === 'won') { won += a; wonCount++; }
    else if (c.status === 'lost') { lost += a; lostCount++; }
  }

  return { byPile, byPipeline, totalOpen, won, lost, wonCount, lostCount };
}

async function fetchMoneyFlow() {
  // FY26 cash in (paid invoices + standalone receives)
  // and cash out (paid bills + standalone spends)
  const SINCE = '2025-07-01';
  const [{ data: paidIn }, { data: receives }, { data: paidOut }, spendCount] = await Promise.all([
    supabase.from('xero_invoices').select('amount_paid')
      .eq('type', 'ACCREC').gt('amount_paid', 0).gte('date', SINCE),
    supabase.from('xero_transactions').select('total')
      .eq('type', 'RECEIVE').neq('status', 'DELETED').gte('date', SINCE),
    supabase.from('xero_invoices').select('amount_paid')
      .eq('type', 'ACCPAY').gt('amount_paid', 0).gte('date', SINCE),
    (async () => {
      // SPEND can be > 1000 rows; aggregate via paginated sum
      let from = 0, sum = 0, count = 0;
      while (true) {
        const { data: page } = await supabase.from('xero_transactions')
          .select('total').eq('type', 'SPEND').neq('status', 'DELETED')
          .gte('date', SINCE).range(from, from + 999);
        if (!page || page.length === 0) break;
        for (const r of page) { sum += Number(r.total || 0); count++; }
        if (page.length < 1000) break;
        from += 1000;
      }
      return { count, sum };
    })(),
  ]);
  const inViaInv = (paidIn || []).reduce((s, r) => s + Number(r.amount_paid || 0), 0);
  const inViaBank = (receives || []).reduce((s, r) => s + Number(r.total || 0), 0);
  const outViaBill = (paidOut || []).reduce((s, r) => s + Number(r.amount_paid || 0), 0);
  const outViaBank = spendCount.sum;
  return {
    cashIn: inViaInv + inViaBank,
    inViaInv, inViaBank,
    cashOut: outViaBill + outViaBank,
    outViaBill, outViaBank,
    net: (inViaInv + inViaBank) - (outViaBill + outViaBank),
  };
}

async function fetchPaymentsHygiene() {
  const { data } = await supabase
    .from('xero_payments')
    .select('amount, is_reconciled')
    .eq('status', 'AUTHORISED')
    .gte('date', '2025-07-01');
  const all = data || [];
  const unrec = all.filter(p => !p.is_reconciled);
  return {
    total: all.length,
    unreconciled: unrec.length,
    unreconciledAmount: unrec.reduce((s, p) => s + Number(p.amount || 0), 0),
  };
}

async function fetchStalenessSignals() {
  // Stale = open status + no stage change in N days. Uses last_stage_change_at (gold field)
  // with fallback to ghl_updated_at, then last_synced_at.
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();
  const oneEightyDaysAgo = new Date(Date.now() - 180 * 86400000).toISOString();
  const { data } = await supabase
    .from('ghl_opportunities')
    .select('ghl_id, name, pipeline_name, monetary_value, pile, last_stage_change_at, ghl_updated_at, ghl_created_at, project_code')
    .eq('status', 'open');
  const all = data || [];
  // Skip rows where we have no usable timestamp at all (sync-fix not yet applied)
  const ranked = all
    .map(r => ({
      ...r,
      bestTs: r.last_stage_change_at || r.ghl_updated_at || r.ghl_created_at,
    }))
    .filter(r => r.bestTs)
    .sort((a, b) => new Date(a.bestTs) - new Date(b.bestTs));

  const stale60 = ranked.filter(r => r.bestTs < sixtyDaysAgo);
  const stale180 = ranked.filter(r => r.bestTs < oneEightyDaysAgo);
  return {
    totalOpen: all.length,
    measurable: ranked.length,
    stale60: stale60.length,
    stale180: stale180.length,
    stale60Value: stale60.reduce((s, r) => s + Number(r.monetary_value || 0), 0),
    stale180Value: stale180.reduce((s, r) => s + Number(r.monetary_value || 0), 0),
    oldest: ranked.slice(0, 5),
  };
}

async function fetchPileDetailedPipeline() {
  // For each pile, fetch top GHL open opps + top outstanding Xero receivables + top open foundation grants
  const piles = ['Voice', 'Flow', 'Ground', 'Grants'];
  const result = {};
  for (const pile of piles) {
    const [{ data: ghlOpen }, { data: xeroOutstanding }, { data: grants }] = await Promise.all([
      supabase.from('ghl_opportunities')
        .select('ghl_id, name, monetary_value, pipeline_name, stage_name, project_code')
        .eq('pile', pile).eq('status', 'open')
        .order('monetary_value', { ascending: false, nullsFirst: false })
        .limit(8),
      pile === 'Grants'
        ? Promise.resolve({ data: [] })
        : supabase.from('xero_invoices')
          .select('xero_id, invoice_number, contact_name, total, amount_due, due_date, project_code, status')
          .eq('type', 'ACCREC').eq('entity_code', 'ACT-ST')
          .gt('amount_due', 0)
          .in('project_code', Object.keys(PILE_BY_PROJECT).filter(c => PILE_BY_PROJECT[c] === pile))
          .order('amount_due', { ascending: false })
          .limit(6),
      pile === 'Grants'
        ? supabase.from('grant_opportunities')
          .select('id, name, amount_max, deadline, url, foundations:foundation_id(name)')
          .or('pipeline_stage.eq.discovered,pipeline_stage.is.null')
          .gte('amount_max', 50000).lte('amount_max', 5000000)
          .not('foundation_id', 'is', null)
          .not('name', 'ilike', 'ARC Centre%')
          .order('amount_max', { ascending: false })
          .limit(8)
        : Promise.resolve({ data: [] }),
    ]);
    result[pile] = { ghlOpen: ghlOpen || [], xeroOutstanding: xeroOutstanding || [], grants: (grants || []).slice(0, 6) };
  }
  return result;
}

async function fetchFoundationResearch() {
  // Top 12 actionable ACT-relevant untriaged grants with full foundation profile.
  // Filtering at DB level via not.like / not.in to avoid taking 50 ARC rows then dropping all.
  const { data, error } = await supabase
    .from('grant_opportunities')
    .select('name, amount_max, deadline, url, relevance_score, fit_score, foundation_id, pipeline_stage, foundations!inner(name, has_dgr, total_giving_annual, thematic_focus, application_tips, type, enriched_at)')
    .or('pipeline_stage.eq.discovered,pipeline_stage.is.null')
    .gte('amount_max', 50000)
    .lte('amount_max', 5000000)
    .not('name', 'ilike', 'ARC Centre%')
    .not('name', 'ilike', 'ARC Industrial%')
    .not('foundations.name', 'ilike', '%Universit%')
    .not('foundations.enriched_at', 'is', null)
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .order('amount_max', { ascending: false })
    .limit(40);
  if (error) {
    console.warn('Foundation research fetch warning:', error.message);
    return { items: [], unmatched: 0 };
  }
  // Dedupe by name (some grants have near-duplicate entries)
  const seen = new Set();
  const items = [];
  for (const g of (data || [])) {
    if (!g.foundations) continue;
    const key = (g.name || '').toLowerCase().slice(0, 50);
    if (seen.has(key)) continue;
    seen.add(key);
    if (g.deadline && new Date(g.deadline) < new Date()) continue;
    items.push(g);
    if (items.length >= 12) break;
  }
  // Count drill-through coverage: foundation-linked, org-linked, neither
  const [{ count: foundationCount }, { count: orgCount }, { count: noLink }] = await Promise.all([
    supabase.from('grant_opportunities').select('id', { count: 'exact', head: true }).not('foundation_id', 'is', null),
    supabase.from('grant_opportunities').select('id', { count: 'exact', head: true }).is('foundation_id', null).not('provider_org_id', 'is', null),
    supabase.from('grant_opportunities').select('id', { count: 'exact', head: true }).is('foundation_id', null).is('provider_org_id', null),
  ]);
  return {
    items,
    foundationLinked: foundationCount || 0,
    orgLinked: orgCount || 0,
    unlinked: noLink || 0,
  };
}

async function fetchGrantScopeStatus() {
  // Paginate past Supabase's 1000-row default
  const byStage = {};
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data: page, error } = await supabase
      .from('grant_opportunities')
      .select('pipeline_stage, amount_max')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!page || page.length === 0) break;
    for (const g of page) {
      const s = g.pipeline_stage || '(unstaged)';
      if (!byStage[s]) byStage[s] = { count: 0, amount: 0 };
      byStage[s].count += 1;
      byStage[s].amount += Number(g.amount_max || 0);
    }
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return byStage;
}

async function fetchExpenseByProject() {
  const { data, error } = await supabase
    .from('xero_invoices')
    .select('project_code, total')
    .eq('type', 'ACCPAY')
    .gte('date', FY26_START)
    .lte('date', FY26_END);
  if (error) throw error;

  const byProject = {};
  let total = 0;
  for (const b of (data || [])) {
    const code = b.project_code || '(uncoded)';
    const amt = Number(b.total || 0);
    total += amt;
    if (!byProject[code]) byProject[code] = { amount: 0, count: 0 };
    byProject[code].amount += amt;
    byProject[code].count += 1;
  }
  return { byProject, total };
}

async function fetchCashflow() {
  const { data } = await supabase
    .from('v_cashflow_summary')
    .select('month, income, expenses, net, closing_balance, is_projection')
    .order('month', { ascending: false })
    .limit(12);
  return (data || []).reverse();
}

async function fetchOutstandingInvoices() {
  const { data } = await supabase
    .from('v_outstanding_invoices')
    .select('invoice_number, contact_name, project_code, type, total, amount_due, due_date, days_overdue')
    .order('amount_due', { ascending: false })
    .limit(30);
  return data || [];
}

async function fetchKnightPhotography() {
  const { data } = await supabase
    .from('xero_invoices')
    .select('invoice_number, date, total, status')
    .eq('type', 'ACCPAY')
    .ilike('contact_name', '%Knight Photography%')
    .order('date', { ascending: false })
    .limit(20);
  return data || [];
}

async function fetchFY26Totals() {
  const { data } = await supabase
    .from('xero_invoices')
    .select('type, total, status, amount_paid')
    .gte('date', FY26_START)
    .lte('date', FY26_END);
  let income = 0, expenses = 0, incomeReceived = 0;
  for (const i of (data || [])) {
    const t = Number(i.total || 0);
    const paid = Number(i.amount_paid || 0);
    if (i.type === 'ACCREC') {
      income += t;
      incomeReceived += paid;
    } else if (i.type === 'ACCPAY') {
      expenses += t;
    }
  }
  return { income, expenses, incomeReceived, net: income - expenses };
}

// ============================================
// Section builders
// ============================================

function buildHeader() {
  const blocks = [];
  blocks.push(callout([
    rt('Live snapshot of ACT money movement. ', { bold: true }),
    rt('Pulls real numbers from Xero/Supabase and aligns to the framework in '),
    rt('wiki/finance/act-money-framework.md', { code: true }),
    rt('. Re-run with '),
    rt('node scripts/sync-money-framework-to-notion.mjs', { code: true }),
    rt(' to refresh.'),
  ], '\u{1F4CC}', 'blue_background'));
  blocks.push(para([
    rt(`Last refreshed: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, { italic: true, color: 'gray' }),
  ]));
  return blocks;
}

function buildAssumptions() {
  const blocks = [];
  blocks.push(h3('\u{1F4CB} Standing assumptions (top of framework)'));
  blocks.push(bullet([
    rt('Trading entity FY26: ', { bold: true }),
    rt("Nic's sole trader (ABN 21 591 780 066). Winds down 30 Jun 2026."),
  ]));
  blocks.push(bullet([
    rt('Trading entity FY27+: ', { bold: true }),
    rt('A Curious Tractor Pty Ltd (ACN 697 347 676). 50/50 owned via Knight + Marchesi family trusts.'),
  ]));
  blocks.push(bullet([
    rt('Knight Photography: ', { bold: true }),
    rt("Ben's separate sole trader. Parallel — does NOT wind down. Supplier to ACT trading entity."),
  ]));
  blocks.push(bullet([
    rt('Default founder pay (FY27+): ', { bold: true }),
    rt('$10K/mo PAYG salary each + 12% super. Trust distribution at 30 June.'),
  ]));
  blocks.push(bullet([
    rt('R&D registration deadline: ', { bold: true }),
    rt('30 April 2027 for FY26 activities (Path C, lodged via Pty).'),
  ]));
  return blocks;
}

function buildEntityLedger(cashflow, fy26Totals) {
  const blocks = [];
  blocks.push(h3('\u{1F4B0} Panel 1 — Entity ledger'));
  const latest = cashflow[cashflow.length - 1];

  if (latest) {
    blocks.push(callout([
      rt(`As of ${fmtMonth(latest.month)}: `, { bold: true }),
      rt(`bank ${fmt(latest.closing_balance)}`, { color: 'green' }),
      rt(' | '),
      rt(`FY26 net ${fmt(fy26Totals.net)}`, { bold: true, color: fy26Totals.net >= 0 ? 'green' : 'red' }),
      rt(' | '),
      rt(`receivables paid ${fmt(fy26Totals.incomeReceived)} of ${fmt(fy26Totals.income)}`, { color: 'gray' }),
    ], '\u{1F3E6}', 'gray_background'));
  }

  const rows = [
    ["Nic's sole trader (ACT-ST)", fmt(latest?.closing_balance), `Income FY26 YTD: ${fmt(fy26Totals.income)}`, 'Winds down 30 Jun 2026'],
    ['ACT Pty Ltd', '$0 (not trading)', 'Activates 1 Jul 2026', 'Trusts 50/50 owners'],
    ['Knight Photography (Ben)', 'TBD — separate Xero', 'Not synced to this DB', 'Parallel sole trader'],
    ['Knight Family Trust', 'TBD — manual', '50% ACT Pty shareholder', 'Awaits FY27 first dividend'],
    ['Marchesi Family Trust', 'TBD — manual', '50% ACT Pty shareholder', 'Awaits FY27 first dividend'],
    ['A Kind Tractor (charity)', '$0', 'Dormant — NOT DGR', 'No active role'],
  ];
  blocks.push(tableBlock(['Entity', 'Cash position', 'YTD activity', 'Status'], rows));
  return blocks;
}

function buildPileIncome(pileData, expenseData) {
  const blocks = [];
  blocks.push(h3('\u{1F4CA} Panel 2 — Pile income (FY26 YTD)'));

  const PILE_ORDER = ['Voice', 'Flow', 'Ground', 'Grants', 'Other', 'Uncoded'];
  const TARGET_MIX = { Voice: 0.077, Flow: 0.558, Ground: 0.058, Grants: 0.385 }; // FY27 honest target
  const total = pileData.total || 1;

  const rows = PILE_ORDER.map(pile => {
    const d = pileData.byPile[pile] || { amount: 0, count: 0 };
    const pct = (d.amount / total * 100).toFixed(1);
    const targetPct = TARGET_MIX[pile] != null ? (TARGET_MIX[pile] * 100).toFixed(0) + '%' : '—';
    return [pile, fmt(d.amount), `${d.count} inv`, `${pct}%`, targetPct];
  });
  rows.push(['TOTAL', fmt(total), `${Object.values(pileData.byPile).reduce((s, d) => s + d.count, 0)} inv`, '100%', '—']);

  blocks.push(tableBlock(['Pile', 'FY26 income', 'Count', 'Actual %', 'FY27 target %'], rows));

  // Expense by project (top 8)
  const topExpenses = Object.entries(expenseData.byProject)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 8)
    .map(([code, d]) => [code, fmt(d.amount), `${d.count} bills`]);
  topExpenses.push(['TOTAL bills FY26 YTD', fmt(expenseData.total), '—']);

  blocks.push(para([rt('Expenses by project (FY26 YTD):', { bold: true })]));
  blocks.push(tableBlock(['Project', 'Amount', 'Count'], topExpenses));

  return blocks;
}

function buildChannelFlow(pileData, knightInvoices) {
  const blocks = [];
  blocks.push(h3('\u{1F500} Panel 3 — Channel flow YTD'));

  const grants = pileData.byPile.Grants?.amount || 0;
  const commercial = (pileData.byPile.Voice?.amount || 0)
    + (pileData.byPile.Flow?.amount || 0)
    + (pileData.byPile.Ground?.amount || 0)
    + (pileData.byPile.Other?.amount || 0)
    + (pileData.byPile.Uncoded?.amount || 0);
  const knightTotal = knightInvoices.reduce((s, i) => s + Number(i.total || 0), 0);

  const rows = [
    ['#1', 'Customers → ACT (Voice/Flow/Ground)', fmt(commercial), 'Active'],
    ['#2/3', 'Funders → ACT (grants)', fmt(grants), 'Active'],
    ['#4', 'ATO → ACT (R&D refund)', '$0 (FY26 claim Sep-Dec 2026)', 'Pending — register by 30 Apr 2027'],
    ['#26', 'Customers → Nic\'s sole trader', fmt(commercial + grants), 'FY26 only — winds down'],
    ['#27', 'Nic\'s ST → Knight Photography', fmt(knightTotal), `${knightInvoices.length} invoices`],
    ['#28', 'Nic\'s ST → Nic personal (drawings)', 'Implicit — taxed as ST profit', 'Pre-cutover'],
    ['#8', 'ACT Pty → Founder salary $10K/mo', '$0 (not yet active)', 'Activates 1 Jul 2026'],
    ['#13', 'ACT Pty → Knight Photography', '$0 (not yet active)', 'Activates 1 Jul 2026'],
    ['#14→16', 'ACT Pty → Trusts → Founders (franked div)', '$0 (no Pty profit yet)', 'First resolution 30 Jun 2027'],
  ];
  blocks.push(tableBlock(['Channel', 'Flow', 'YTD amount', 'Status'], rows));
  return blocks;
}

function buildFounderTake(fy26Totals, knightInvoices) {
  const blocks = [];
  blocks.push(h3('\u{1F465} Panel 4 — Founder take YTD'));

  const knightTotal = knightInvoices.reduce((s, i) => s + Number(i.total || 0), 0);

  blocks.push(callout([
    rt('FY26 era: Nic\'s sole trader profit flows to Nic as drawings (already taxed at marginal). Ben\'s take routes via Knight Photography invoices. ', { italic: true }),
    rt('Per-founder breakdown not yet computable from current Xero data alone — requires manual entry of personal super contributions and KP\'s own books.', { italic: true, color: 'gray' }),
  ], '\u{1F4DD}', 'yellow_background'));

  const rows = [
    ['Nic', 'Sole trader drawings (implicit)', `~${fmt(fy26Totals.net)}`, 'Pre-tax; ST profit before BAS/super', 'Already taxed at marginal'],
    ['Ben', 'Knight Photography invoiced ACT', fmt(knightTotal), 'Gross before KP costs', 'KP runs separate books'],
    ['Both (FY27+)', 'PAYG salary (Pty)', '$0 — not active', '$10K/mo each from 1 Jul 2026', 'Channel #8'],
    ['Both (FY27+)', 'Trust distribution', '$0 — first resolution Jun 2027', 'Franked dividend → trust → marginal', 'Channels #14→16'],
  ];
  blocks.push(tableBlock(['Founder', 'Channel', 'YTD amount', 'Notes', 'Tax treatment'], rows));
  return blocks;
}

function buildComplianceFlags() {
  const blocks = [];
  blocks.push(h3('\u{1F6A9} Panel 5 — Compliance flags'));

  const today = new Date();
  const daysToRD = Math.ceil((RD_REGISTRATION_DEADLINE - today) / (1000 * 60 * 60 * 24));
  const daysToCutover = Math.ceil((new Date('2026-06-30') - today) / (1000 * 60 * 60 * 24));
  const daysToFY26EOY = daysToCutover; // same day for ST

  const rows = [
    ['R&D registration (FY26)', `${daysToRD} days to 30 Apr 2027`, daysToRD > 90 ? '\u{1F7E2} on track' : daysToRD > 30 ? '\u{1F7E1} watch' : '\u{1F534} action now', 'Register Pty as registrant for FY26 activities'],
    ['Cutover deadline', `${daysToCutover} days to 30 Jun 2026`, daysToCutover > 60 ? '\u{1F7E2} on track' : daysToCutover > 30 ? '\u{1F7E1} watch' : '\u{1F534} action now', '328-G election + asset transfer + final ST tax'],
    ['Director loan (Div 7A)', 'N/A — Pty not yet trading', '\u{1F7E2}', 'Watch from 1 Jul 2026; settle by 30 Jun annually'],
    ['Franking account', 'N/A — first dividend Jun 2027', '\u{1F7E2}', 'Track once Pty pays company tax'],
    ['Trust distribution resolution', 'N/A — no Pty profits yet', '\u{1F7E2}', 'First resolution required by 30 Jun 2027'],
    ['Concessional super cap', 'TBD — manual entry', '\u{1F7E1}', '$30K/yr each (FY26)'],
    ['GST (Knight Photography)', 'TBD — confirm threshold cross-date', '\u{1F7E1}', 'Standard Ledger H3'],
    ['Path C R&D mechanic', 'Unverified — needs R&D consultant', '\u{1F7E1}', 'Open question H2'],
  ];
  blocks.push(tableBlock(['Flag', 'Status', 'Severity', 'Action'], rows));
  return blocks;
}

function buildCashForecast(cashflow, outstanding) {
  const blocks = [];
  blocks.push(h3('\u{1F4C5} Panel 6 — Cash trend & forecast'));

  // Recent cashflow trend
  const recent = cashflow.slice(-6);
  const rows = recent.map(m => [
    fmtMonth(m.month),
    fmt(m.income),
    fmt(m.expenses),
    fmt(m.net),
    fmt(m.closing_balance),
    m.is_projection ? 'projected' : 'actual',
  ]);
  blocks.push(tableBlock(['Month', 'Income', 'Expenses', 'Net', 'Closing balance', 'Type'], rows));

  // Outstanding invoices
  if (outstanding.length > 0) {
    const receivables = outstanding.filter(i => i.type === 'ACCREC' || i.type === 'receivable');
    const payables = outstanding.filter(i => i.type === 'ACCPAY' || i.type === 'payable');
    const totalRec = receivables.reduce((s, i) => s + Number(i.amount_due || 0), 0);
    const totalPay = payables.reduce((s, i) => s + Number(i.amount_due || 0), 0);

    blocks.push(para([
      rt('Outstanding: ', { bold: true }),
      rt(`${fmt(totalRec)} receivable`, { color: 'green' }),
      rt(' / '),
      rt(`${fmt(totalPay)} payable`, { color: 'red' }),
      rt(` | net ${fmt(totalRec - totalPay)}`, { bold: true }),
    ]));

    // Top 5 receivables
    if (receivables.length > 0) {
      blocks.push(para([rt('Top receivables:', { bold: true, italic: true })]));
      receivables.slice(0, 5).forEach(i => {
        blocks.push(bullet([
          rt(`${i.invoice_number || 'N/A'} — `, { code: true }),
          rt(`${i.contact_name || 'unknown'}`),
          rt(` — ${fmt(i.amount_due)}`, { color: 'green' }),
          i.days_overdue > 0 ? rt(` (${i.days_overdue}d overdue)`, { color: 'red' }) : rt(' '),
        ]));
      });
    }
  }
  return blocks;
}

function buildPipelineByPile(pipeline, grantScope, pileData) {
  const blocks = [];
  blocks.push(h3('\u{1F3AF} Panel 7 — Pipeline by pile (GHL open opportunities)'));

  blocks.push(callout([
    rt(`${fmt(pipeline.totalOpen)} open across pipelines`, { bold: true }),
    rt(' — '),
    rt(`won FY26 ${fmt(pipeline.won)}`, { color: 'green' }),
    rt(' / '),
    rt(`lost ${fmt(pipeline.lost)}`, { color: 'red' }),
    rt(`. ${pipeline.wonCount}W / ${pipeline.lostCount}L closed.`),
  ], '\u{1F4E1}', 'gray_background'));

  // Pile-mapped pipeline
  const PILE_ORDER = ['Voice', 'Flow', 'Ground', 'Grants', 'Other', 'Uncoded'];
  const TARGET_FY27 = { Voice: 200_000, Flow: 1_450_000, Ground: 150_000, Grants: 1_000_000 };
  const pileRows = PILE_ORDER.map(pile => {
    const open = pipeline.byPile[pile] || { amount: 0, count: 0 };
    const fy26 = pileData.byPile[pile] || { amount: 0 };
    const target = TARGET_FY27[pile] != null ? fmt(TARGET_FY27[pile]) : '—';
    const coverage = TARGET_FY27[pile] ? Math.round(open.amount / TARGET_FY27[pile] * 100) + '%' : '—';
    return [pile, fmt(fy26.amount), target, fmt(open.amount), `${open.count}`, coverage];
  });
  blocks.push(tableBlock(['Pile', 'FY26 actual', 'FY27 target', 'Open pipeline', 'N opps', 'Pipeline / target'], pileRows));

  // Pipeline-name breakdown
  const pipelineRows = Object.entries(pipeline.byPipeline)
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 8)
    .map(([name, d]) => [name, fmt(d.amount), `${d.count}`]);
  blocks.push(para([rt('By GHL pipeline:', { bold: true })]));
  blocks.push(tableBlock(['Pipeline', 'Amount open', 'Count'], pipelineRows));

  // GrantScope status
  blocks.push(para([rt('GrantScope research database:', { bold: true })]));
  const STAGE_ORDER = ['discovered', 'researching', 'drafting', 'submitted', 'won', 'lost'];
  const gsRows = STAGE_ORDER
    .filter(s => grantScope[s])
    .map(s => [s, String(grantScope[s].count), fmt(grantScope[s].amount)]);
  blocks.push(tableBlock(['Stage', 'Count', 'Total $'], gsRows));

  return blocks;
}

function buildOpportunityActions(pipeline) {
  const blocks = [];
  blocks.push(h3('\u{26A1} Panel 8 — Opportunity actions (auto-derived)'));
  const items = [];

  const uncoded = pipeline.byPile.Uncoded || { amount: 0, count: 0 };
  if (uncoded.amount > 100_000) {
    items.push(`Tag ${uncoded.count} uncoded GHL opps (${fmt(uncoded.amount)} total) with project_code so they roll into the right pile`);
  }

  // Flow gap → CivicGraph absence
  const flowOpen = pipeline.byPile.Flow?.amount || 0;
  if (flowOpen < 500_000) {
    items.push(`Flow pipeline is ${fmt(flowOpen)} — below the $1.45M FY27 target. Decide CivicGraph commercialisation path (Option A/B/C in fy26-voice-flow-gap-analysis.md)`);
  }

  // Grants pipeline coverage
  const grantOpen = pipeline.byPile.Grants?.amount || 0;
  if (grantOpen > 5_000_000) {
    items.push(`${fmt(grantOpen)} grant pipeline is large — triage 32K GrantScope-discovered grants with /align-ghl skill before more research`);
  }

  // PICC concentration
  items.push('Voice pile = 95% PICC photography. Add second commercial Voice contract or rename pile to reflect actual motion');

  // IPP JV
  items.push('Goods Demand Register has $16M open opps — IPP JV with Oonchiumpa (framework E2) is the unlock for Federal/State procurement');

  for (const i of items) blocks.push(bullet(i));
  return blocks;
}

// ============================================
// EXEC SUMMARY (Notion default — one-screen view)
// ============================================

function buildExecSummary({ cashflow, fy26Totals, pileData, pipeline, foundationResearch, outstanding, staleness, moneyFlow, paymentsHygiene }) {
  const blocks = [];
  const latest = cashflow[cashflow.length - 1];
  const today = new Date();
  const daysToCutover = Math.ceil((new Date('2026-06-30') - today) / 86400000);

  // Header — single big number row
  blocks.push(callout([
    rt(`${fmt(latest?.closing_balance || 0)} bank`, { bold: true, color: 'green' }),
    rt('  •  '),
    rt(`+${fmt(fy26Totals.net)} FY26 net`, { bold: true }),
    rt('  •  '),
    rt(`${daysToCutover} days to cutover`, { bold: true, color: daysToCutover < 60 ? 'orange' : 'default' }),
  ], '\u{1F3DB}️', 'gray_background'));

  // FY26 money flow callout — links to the alignment sub-pages
  if (moneyFlow) {
    const inUrl = notionDbIds.moneyInAlignment ? `https://www.notion.so/${notionDbIds.moneyInAlignment.replace(/-/g, '')}` : null;
    const outUrl = notionDbIds.moneyOutAlignment ? `https://www.notion.so/${notionDbIds.moneyOutAlignment.replace(/-/g, '')}` : null;
    blocks.push(callout([
      rt('FY26 cash flow: ', { bold: true }),
      inUrl ? rt(`${fmt(moneyFlow.cashIn)} in`, { link: inUrl, bold: true, color: 'green' })
            : rt(`${fmt(moneyFlow.cashIn)} in`, { bold: true, color: 'green' }),
      rt(`  (${fmt(moneyFlow.inViaInv)} invoiced + ${fmt(moneyFlow.inViaBank)} direct)`, { color: 'gray' }),
      rt('  •  '),
      outUrl ? rt(`${fmt(moneyFlow.cashOut)} out`, { link: outUrl, bold: true, color: 'red' })
             : rt(`${fmt(moneyFlow.cashOut)} out`, { bold: true, color: 'red' }),
      rt(`  (${fmt(moneyFlow.outViaBill)} bills + ${fmt(moneyFlow.outViaBank)} direct)`, { color: 'gray' }),
      rt('  •  '),
      rt(`${fmt(moneyFlow.net)} net`, { bold: true, color: moneyFlow.net >= 0 ? 'green' : 'red' }),
    ], '\u{1F4B5}', 'default'));
  }

  // TOP OPPORTUNITIES — composite ranked list
  blocks.push(h3('\u{26A1} Top opportunities'));
  const ops = [];
  // High-fit grants (foundation-linked, ACT-relevant size, deadline-aware)
  for (const g of (foundationResearch.items || []).slice(0, 6)) {
    const f = g.foundations || {};
    ops.push({
      amount: g.amount_max,
      label: `${g.name?.slice(0, 60) || 'unnamed grant'}`,
      sub: `${f.name?.slice(0, 40) || 'foundation'} • ${g.deadline || 'rolling'}`,
      url: g.url && /^https?:\/\//i.test(g.url) ? g.url : null,
      kind: 'grant',
    });
  }
  // Top GHL pipeline opps in Goods Demand Register (the IPP-JV unlock)
  if ((pipeline.byPipeline['Goods — Demand Register']?.amount || 0) > 0) {
    ops.push({
      amount: pipeline.byPipeline['Goods — Demand Register'].amount,
      label: `Goods Demand Register — ${pipeline.byPipeline['Goods — Demand Register'].count} buyers, IPP-JV unlock`,
      sub: 'Flow pile • requires Oonchiumpa JV (framework E2)',
      url: null,
      kind: 'commercial',
    });
  }
  // Overdue receivables — money already won, not collected
  const overdue = (outstanding || []).filter(i => (i.type === 'ACCREC' || i.type === 'receivable') && (i.days_overdue || 0) > 0);
  for (const inv of overdue.slice(0, 2)) {
    ops.push({
      amount: inv.amount_due,
      label: `${inv.invoice_number} ${inv.contact_name?.slice(0, 30)} — overdue ${inv.days_overdue}d`,
      sub: 'Already won. Chase.',
      url: null,
      kind: 'collect',
    });
  }
  // Sort by amount descending, take top 7
  ops.sort((a, b) => (b.amount || 0) - (a.amount || 0));
  const top = ops.slice(0, 7);
  for (const o of top) {
    const kindEmoji = o.kind === 'grant' ? '\u{1F3DB}️' : o.kind === 'commercial' ? '\u{1F4B0}' : '\u{1F4B8}';
    const labelParts = [
      rt(`${kindEmoji}  `),
      rt(fmt(o.amount), { bold: true }),
      rt('  '),
    ];
    if (o.url) {
      labelParts.push(rt(o.label, { link: o.url, bold: true }));
    } else {
      labelParts.push(rt(o.label, { bold: true }));
    }
    labelParts.push(rt(`  —  ${o.sub}`, { color: 'gray' }));
    blocks.push(bullet(labelParts));
  }

  // Burn / flags
  blocks.push(h3('\u{1F525} What\'s burning'));

  // Staleness signal (only if we have measurable data)
  if (staleness && staleness.measurable > 0 && staleness.stale60 > 0) {
    const severeStale = staleness.stale180 > 0 ? `${staleness.stale180} >180d (${fmt(staleness.stale180Value)})` : '';
    blocks.push(bullet([
      rt('\u{23F1}\u{FE0F}  '),
      rt(`${staleness.stale60} stale GHL opps`, { bold: true }),
      rt(` no stage change >60d (${fmt(staleness.stale60Value)} value)`, { color: 'gray' }),
      severeStale ? rt(`. Of those, ${severeStale}.`, { color: 'red' }) : rt(''),
    ]));
  } else if (staleness && staleness.measurable === 0) {
    blocks.push(bullet([
      rt('\u{23F1}\u{FE0F}  '),
      rt('Staleness unmeasurable', { bold: true }),
      rt(' — GHL sync needs to backfill timestamps. Run ', { color: 'gray' }),
      rt('node scripts/sync-ghl-to-supabase.mjs', { code: true, color: 'gray' }),
    ]));
  }

  if (paymentsHygiene && paymentsHygiene.unreconciled > 0) {
    blocks.push(bullet([
      rt('\u{1F501}  '),
      rt(`${paymentsHygiene.unreconciled} unreconciled Xero payments`, { bold: true }),
      rt(` (${fmt(paymentsHygiene.unreconciledAmount)} of $$ recorded against invoices but not matched to a bank line). Open Bank Accounts → Reconcile in Xero, or run `, { color: 'gray' }),
      rt('node scripts/xero-suggest-matches.mjs', { code: true, color: 'gray' }),
    ]));
  }

  const flags = [
    {
      label: '328-G election forms — Standard Ledger',
      sub: `${daysToCutover}d to cutover. Blocks Nic’s sole-trader → Pty asset transfer.`,
      severity: daysToCutover < 60 ? 'red' : 'orange',
    },
    {
      label: 'Path C R&D consultant — engage now',
      sub: 'FY26 R&D registration deadline 30 Apr 2027. Mechanic unverified.',
      severity: 'orange',
    },
    {
      label: 'CivicGraph $0 commercial — decide Option A/B/C',
      sub: 'FY27 Flow target $1.45M assumes CivicGraph MRR. Currently zero.',
      severity: 'orange',
    },
  ];
  for (const f of flags) {
    blocks.push(bullet([
      rt(f.severity === 'red' ? '\u{1F534}  ' : '\u{1F7E0}  '),
      rt(f.label, { bold: true }),
      rt(`  —  ${f.sub}`, { color: 'gray' }),
    ]));
  }

  // Pile snapshot
  blocks.push(h3('\u{1F4CA} Pile mix (FY26 actual / FY27 target)'));
  const TARGET_PCT = { Voice: 8, Flow: 56, Ground: 6, Grants: 39 };
  const total = pileData.total || 1;
  const pileLines = ['Voice', 'Flow', 'Ground', 'Grants'].map(p => {
    const d = pileData.byPile[p] || { amount: 0 };
    const actualPct = Math.round(d.amount / total * 100);
    const target = TARGET_PCT[p];
    const gap = actualPct - target;
    const arrow = gap > 5 ? '↑' : gap < -5 ? '↓' : '→';
    return { pile: p, amount: d.amount, actualPct, target, gap, arrow };
  });
  for (const l of pileLines) {
    const color = Math.abs(l.gap) > 10 ? (l.gap < 0 ? 'red' : 'orange') : 'green';
    blocks.push(bullet([
      rt(l.pile.padEnd(8), { bold: true }),
      rt(`${fmt(l.amount).padEnd(12)}`),
      rt(`${l.actualPct}% / ${l.target}% target  `, { color }),
      rt(`${l.arrow} ${l.gap > 0 ? '+' : ''}${l.gap}pts`, { color }),
    ]));
  }

  blocks.push(para([
    rt('Open detail: ', { italic: true, color: 'gray' }),
    rt('thoughts/shared/reports/act-money-framework-snapshot-<date>.md', { code: true, color: 'gray' }),
    rt(' (auto-generated weekly + on-demand). For deep-dive panels run ', { italic: true, color: 'gray' }),
    rt('node scripts/sync-money-framework-to-notion.mjs --markdown', { code: true, color: 'gray' }),
    rt('.', { italic: true, color: 'gray' }),
  ]));

  return blocks;
}

function buildPileDetail(pileDetail, pileData, pipeline) {
  const blocks = [];
  blocks.push(h3('\u{1F50E} Pipeline by pile — drill in'));
  blocks.push(para([
    rt('Each item links to its source system: ', { italic: true, color: 'gray' }),
    rt('Xero', { code: true, color: 'blue' }),
    rt(' for invoices, ', { italic: true, color: 'gray' }),
    rt('GHL', { code: true, color: 'purple' }),
    rt(' for open opportunities, funder URL for grants. Click to act.', { italic: true, color: 'gray' }),
  ]));

  const TARGET_FY27 = { Voice: 200_000, Flow: 1_450_000, Ground: 150_000, Grants: 1_000_000 };
  const PILE_EMOJI = { Voice: '\u{1F399}️', Flow: '\u{1F30A}', Ground: '\u{1F33E}', Grants: '\u{1F3DB}️' };

  for (const pile of ['Voice', 'Flow', 'Ground', 'Grants']) {
    const detail = pileDetail[pile] || { ghlOpen: [], xeroOutstanding: [], grants: [] };
    const fy26 = pileData.byPile[pile] || { amount: 0, count: 0 };
    const openPipe = pipeline.byPile[pile] || { amount: 0, count: 0 };
    const target = TARGET_FY27[pile] || 0;

    blocks.push(h3(`${PILE_EMOJI[pile] || ''} ${pile}`));
    blocks.push(callout([
      rt(`FY26 invoiced: ${fmt(fy26.amount)}`, { bold: true }),
      rt('  •  '),
      rt(`Open pipeline: ${fmt(openPipe.amount)} (${openPipe.count} opps)`),
      rt('  •  '),
      rt(`FY27 target: ${fmt(target)}`, { color: 'gray' }),
    ], PILE_EMOJI[pile] || '\u{1F4CC}', 'gray_background'));

    // GHL open opportunities — linked to GHL
    if (detail.ghlOpen.length > 0) {
      blocks.push(para([rt(`Open in GHL (${detail.ghlOpen.length}):`, { bold: true, color: 'purple' })]));
      for (const o of detail.ghlOpen) {
        const url = ghlOpportunityUrl(o.ghl_id);
        const title = o.name?.slice(0, 60) || 'unnamed';
        const sub = `${o.pipeline_name || 'pipeline'} · ${o.stage_name || 'stage'}${o.project_code ? ' · ' + o.project_code : ''}`;
        const line = [
          rt('💼  '),
          rt(fmt(o.monetary_value || 0), { bold: true }),
          rt('  '),
          url ? rt(title, { link: url, bold: true }) : rt(title, { bold: true }),
          rt(`  —  ${sub}`, { color: 'gray' }),
        ];
        blocks.push(bullet(line));
      }
    }

    // Xero outstanding receivables — linked to Xero
    if (detail.xeroOutstanding.length > 0) {
      blocks.push(para([rt(`Outstanding in Xero (${detail.xeroOutstanding.length}):`, { bold: true, color: 'blue' })]));
      for (const i of detail.xeroOutstanding) {
        const url = xeroInvoiceUrl(i.xero_id);
        const overdue = i.due_date && new Date(i.due_date) < new Date();
        const status = overdue ? 'overdue' : (i.status || '');
        const title = `${i.invoice_number || 'no#'} · ${(i.contact_name || 'unknown').slice(0, 40)}`;
        const line = [
          rt('🧾  '),
          rt(fmt(i.amount_due), { bold: true, color: overdue ? 'red' : 'default' }),
          rt('  '),
          url ? rt(title, { link: url, bold: true }) : rt(title, { bold: true }),
          rt(`  —  due ${i.due_date || 'n/a'}${status ? ' · ' + status : ''}`, { color: overdue ? 'red' : 'gray' }),
        ];
        blocks.push(bullet(line));
      }
    }

    // Open foundation grants — linked to grant URL (only relevant for Grants pile)
    if (detail.grants.length > 0) {
      blocks.push(para([rt(`Foundation grants to research (${detail.grants.length}):`, { bold: true, color: 'green' })]));
      for (const g of detail.grants) {
        const f = g.foundations || {};
        const title = g.name?.slice(0, 60) || 'unnamed grant';
        const sub = `${f.name?.slice(0, 40) || 'funder'} · ${g.deadline || 'rolling'}`;
        const line = [
          rt('🏛️  '),
          rt(fmt(g.amount_max), { bold: true }),
          rt('  '),
          isValidUrl(g.url) ? rt(title, { link: g.url, bold: true }) : rt(title, { bold: true }),
          rt(`  —  ${sub}`, { color: 'gray' }),
        ];
        blocks.push(bullet(line));
      }
    }

    if (detail.ghlOpen.length === 0 && detail.xeroOutstanding.length === 0 && detail.grants.length === 0) {
      blocks.push(para([rt('(no live items in this pile)', { italic: true, color: 'gray' })]));
    }
  }

  return blocks;
}

function buildFoundationResearch(research) {
  const blocks = [];
  blocks.push(h3('\u{1F50D} Panel 9 — Foundation research drill-through'));

  const totalCovered = (research.foundationLinked || 0) + (research.orgLinked || 0);
  const totalGrants = totalCovered + (research.unlinked || 0);
  const coveragePct = totalGrants > 0 ? Math.round(totalCovered / totalGrants * 100) : 0;
  blocks.push(callout([
    rt(`${research.items.length} actionable untriaged grants below. `, { bold: true }),
    rt(`Drill-through coverage: ${research.foundationLinked.toLocaleString()} via foundation profile + ${research.orgLinked.toLocaleString()} via organization (${coveragePct}% of ${totalGrants.toLocaleString()} grants). ${research.unlinked.toLocaleString()} still unlinked.`, { color: 'gray' }),
  ], '\u{1F4DA}', 'gray_background'));

  const rows = research.items.map(g => {
    const f = g.foundations || {};
    const themes = Array.isArray(f.thematic_focus) ? f.thematic_focus.slice(0, 3).join(', ') : '';
    const totalGiving = f.total_giving_annual ? fmt(f.total_giving_annual) + '/yr' : '—';
    const dgr = f.has_dgr === true ? '✓' : f.has_dgr === false ? '✗' : '?';
    const deadline = g.deadline || 'rolling';
    const tipsLink = f.application_tips ? '✓' : '—';
    return [
      g.name?.slice(0, 60) || 'unnamed',
      fmt(g.amount_max),
      deadline,
      f.name?.slice(0, 40) || 'unknown',
      totalGiving,
      dgr,
      themes || '—',
      g.url && /^https?:\/\//i.test(g.url)
        ? [rt('open', { link: g.url, color: 'blue' })]
        : [rt('—', { color: 'gray' })],
    ];
  });
  if (rows.length > 0) {
    blocks.push(tableBlock(
      ['Grant', 'Max $', 'Deadline', 'Funder', 'Annual giving', 'DGR', 'Themes', 'Link'],
      rows,
    ));
  } else {
    blocks.push(para([rt('(no actionable grants — broaden filter or enrich more foundations)', { italic: true, color: 'gray' })]));
  }

  blocks.push(para([
    rt('Drill-through: ', { bold: true }),
    rt('Click any grant to open the funder\'s page. Foundation profile data lives in '),
    rt('foundations', { code: true }),
    rt(' table — query directly via CivicGraph for board members, giving history, application tips.'),
  ]));
  return blocks;
}

function buildOpenQuestions() {
  const blocks = [];
  blocks.push(h3('\u{2753} Open questions for Standard Ledger / R&D consultant'));
  const items = [
    'H1 — Subdiv 328-G eligibility + election forms (priority, blocks cutover)',
    'H2 — Path C R&D registration mechanics (priority, blocks claim)',
    'H3 — Knight Photography GST registration date + post-cutover contracts',
    'H4 — Trust deed permissions (streaming franked dividends, capital gains)',
    'H5 — CGT exit positioning (share sale vs asset sale for CivicGraph)',
    'H6 — Div 7A operations (settle vs 7-year complying loan)',
    'H7 — State payroll tax (likely Y2 trigger via aggregation)',
    'H8 — IPP JV structure for Goods (with Oonchiumpa / Wilya Janta)',
    'H9 — EMDG verification (post-2021 reform)',
    'H10 — DGR pathway via A Kind Tractor (deferred)',
  ];
  items.forEach(i => blocks.push(bullet(i)));
  return blocks;
}

function buildFooter() {
  return callout([
    rt('Source: ', { bold: true }),
    rt('Supabase shared instance (xero_invoices, v_cashflow_summary, v_outstanding_invoices). '),
    rt('Pile mapping: '),
    rt('scripts/sync-money-framework-to-notion.mjs', { code: true }),
    rt('. Framework reference: '),
    rt('wiki/finance/act-money-framework.md', { code: true }),
    rt('.'),
  ], '\u{1F4CE}', 'gray_background');
}

// ============================================
// Section management (find + replace marker block)
// ============================================

async function findSectionRange(pageId) {
  const allBlocks = [];
  let cursor = undefined;
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
    allBlocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  let markerIndex = -1;
  for (let i = 0; i < allBlocks.length; i++) {
    const b = allBlocks[i];
    if (b.type === 'heading_2') {
      const text = b.heading_2.rich_text.map(rt => rt.plain_text).join('');
      if (text.includes('ACT Money Framework')) { markerIndex = i; break; }
    }
  }
  if (markerIndex === -1) return { blockIdsToDelete: [], insertAfterId: null };

  const blockIdsToDelete = [allBlocks[markerIndex].id];
  for (let i = markerIndex + 1; i < allBlocks.length; i++) {
    const b = allBlocks[i];
    if (b.type === 'heading_1') break;
    if (b.type === 'heading_2') break; // any other H2 ends our section
    // SAFETY: deleting a child_page block trashes the underlying sub-page;
    // deleting a child_database block trashes the underlying database. Skip both.
    if (b.type === 'child_page' || b.type === 'child_database') continue;
    blockIdsToDelete.push(b.id);
  }
  const insertAfterId = markerIndex > 0 ? allBlocks[markerIndex - 1].id : null;
  return { blockIdsToDelete, insertAfterId };
}

// ============================================
// Main
// ============================================

async function updatePage(pageId) {
  log('Fetching data from Supabase...');
  const [pileData, expenseData, cashflow, outstanding, knightInvoices, fy26Totals, pipeline, grantScope, foundationResearch, pileDetail, staleness, moneyFlow, paymentsHygiene] = await Promise.all([
    fetchPileIncome(),
    fetchExpenseByProject(),
    fetchCashflow(),
    fetchOutstandingInvoices(),
    fetchKnightPhotography(),
    fetchFY26Totals(),
    fetchPipelineByPile(),
    fetchGrantScopeStatus(),
    fetchFoundationResearch(),
    fetchPileDetailedPipeline(),
    fetchStalenessSignals(),
    fetchMoneyFlow(),
    fetchPaymentsHygiene(),
  ]);

  verbose(`  Piles: ${Object.keys(pileData.byPile).join(', ')}`);
  verbose(`  Total income: ${fmt(pileData.total)}`);
  verbose(`  Total expenses: ${fmt(expenseData.total)}`);
  verbose(`  Cashflow months: ${cashflow.length}`);
  verbose(`  Outstanding: ${outstanding.length}`);
  verbose(`  Knight Photography invoices: ${knightInvoices.length}`);

  // Notion gets the exec summary only — high-level, glanceable.
  // Detail lives in the auto-generated markdown report.
  const blocks = [];
  blocks.push(h2(SECTION_MARKER));

  // Prominent link to the database
  const dbId = notionDbIds.opportunitiesDb;
  if (dbId) {
    blocks.push(callout([
      rt('Operational view: ', { bold: true }),
      rt('ACT Opportunities database', { link: `https://www.notion.so/${dbId.replace(/-/g, '')}`, bold: true, color: 'blue' }),
      rt(' — 403 rows, filter by Pile / Stage / Source. Each row deep-links to Xero, GHL, or grant URL.'),
    ], '\u{1F4C2}', 'blue_background'));
  }

  blocks.push(para([
    rt(`Last refresh ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. `, { italic: true, color: 'gray' }),
    rt('Refresh page: '),
    rt('node scripts/sync-money-framework-to-notion.mjs', { code: true }),
    rt(' • Refresh DB: '),
    rt('node scripts/sync-opportunities-to-notion-db.mjs', { code: true }),
  ]));
  blocks.push(divider());
  blocks.push(...buildExecSummary({ cashflow, fy26Totals, pileData, pipeline, foundationResearch, outstanding, staleness, moneyFlow, paymentsHygiene }));
  blocks.push(divider());
  blocks.push(...buildPileDetail(pileDetail, pileData, pipeline));

  log(`Built ${blocks.length} blocks (exec + pile-detail)`);

  if (DRY_RUN) {
    log('[DRY RUN] Would push to Notion. Preview:');
    for (const b of blocks.slice(0, 6)) {
      const t = b.type;
      const text = (b[t]?.rich_text || []).map(r => r.plain_text || r.text?.content || '').join('');
      console.log(`  [${t}] ${text}`);
    }
    return;
  }

  log('Finding existing framework section...');
  const { blockIdsToDelete, insertAfterId } = await findSectionRange(pageId);
  await sleep(350);

  if (blockIdsToDelete.length > 0) {
    log(`Deleting ${blockIdsToDelete.length} existing blocks...`);
    for (const blockId of blockIdsToDelete) {
      try {
        await notion.blocks.delete({ block_id: blockId });
        await sleep(200);
      } catch (err) {
        verbose(`  Warning: could not delete ${blockId}: ${err.message}`);
      }
    }
  }

  log(`Appending ${blocks.length} blocks...`);
  const batchSize = 50;
  for (let i = 0; i < blocks.length; i += batchSize) {
    const batch = blocks.slice(i, i + batchSize);
    const opts = { block_id: pageId, children: batch };
    if (i === 0 && insertAfterId) opts.after = insertAfterId;
    await notion.blocks.children.append(opts);
    await sleep(500);
  }

  log('Done!');
}

async function ensurePage() {
  let pageId = notionDbIds.moneyFramework;
  if (pageId) return pageId;

  const parentId = notionDbIds.financeOverview;
  if (!parentId) {
    log('ERROR: No financeOverview parent page in config/notion-database-ids.json — cannot create child.');
    process.exit(1);
  }

  log('Creating new "ACT Money Framework" page under Finance Overview...');
  const newPage = await notion.pages.create({
    parent: { page_id: parentId },
    properties: {
      title: [{ type: 'text', text: { content: 'ACT Money Framework' } }],
    },
    icon: { type: 'emoji', emoji: '\u{1F3DB}️' },
  });
  pageId = newPage.id;
  log(`Created page: ${pageId}`);

  // Persist to config
  notionDbIds.moneyFramework = pageId;
  writeFileSync(notionDbIdsPath, JSON.stringify(notionDbIds, null, 2) + '\n');
  log(`Saved page ID to ${notionDbIdsPath}`);
  return pageId;
}

function blocksToMarkdown(blocks) {
  const lines = [];
  for (const b of blocks) {
    const t = b.type;
    const text = (b[t]?.rich_text || []).map(r => r.plain_text || r.text?.content || '').join('');
    if (t === 'heading_2') lines.push('', `## ${text}`, '');
    else if (t === 'heading_3') lines.push('', `### ${text}`, '');
    else if (t === 'paragraph') lines.push(text);
    else if (t === 'bulleted_list_item') lines.push(`- ${text}`);
    else if (t === 'callout') lines.push(`> ${b.callout.icon?.emoji || ''} ${text}`);
    else if (t === 'divider') lines.push('', '---', '');
    else if (t === 'table') {
      const rows = b.table.children;
      if (rows && rows.length) {
        const cells = rows.map(row =>
          (row.table_row.cells || []).map(cell =>
            cell.map(rt => rt.plain_text || rt.text?.content || '').join('')
          )
        );
        const header = cells[0];
        lines.push('', `| ${header.join(' | ')} |`);
        lines.push(`| ${header.map(() => '---').join(' | ')} |`);
        for (let i = 1; i < cells.length; i++) {
          lines.push(`| ${cells[i].join(' | ')} |`);
        }
        lines.push('');
      }
    }
  }
  return lines.join('\n');
}

async function writeMarkdown(blocks) {
  const date = new Date().toISOString().slice(0, 10);
  const outPath = join(__dirname, '..', 'thoughts', 'shared', 'reports', `act-money-framework-snapshot-${date}.md`);
  const md = `# ACT Money Framework — Snapshot ${date}\n\n` +
    `> Generated by \`scripts/sync-money-framework-to-notion.mjs --markdown\`. ` +
    `Mirrors the Notion sync. Re-run anytime.\n\n` +
    blocksToMarkdown(blocks);
  writeFileSync(outPath, md);
  log(`Wrote ${outPath}`);
  return outPath;
}

async function main() {
  log('=== ACT Money Framework → Notion ===');
  if (DRY_RUN) log('DRY RUN MODE');
  if (MARKDOWN) log('MARKDOWN OUTPUT MODE (no Notion push)');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    log('ERROR: Supabase credentials not set');
    process.exit(1);
  }

  if (MARKDOWN) {
    // Build blocks via the same pipeline but write to markdown instead
    const [pileData, expenseData, cashflow, outstanding, knightInvoices, fy26Totals] = await Promise.all([
      fetchPileIncome(), fetchExpenseByProject(), fetchCashflow(),
      fetchOutstandingInvoices(), fetchKnightPhotography(), fetchFY26Totals(),
    ]);
    const [pipeline, grantScope, foundationResearch] = await Promise.all([fetchPipelineByPile(), fetchGrantScopeStatus(), fetchFoundationResearch()]);
    const blocks = [];
    blocks.push(h2(SECTION_MARKER));
    blocks.push(...buildHeader());
    blocks.push(divider());
    blocks.push(...buildAssumptions());
    blocks.push(divider());
    blocks.push(...buildEntityLedger(cashflow, fy26Totals));
    blocks.push(divider());
    blocks.push(...buildPileIncome(pileData, expenseData));
    blocks.push(divider());
    blocks.push(...buildChannelFlow(pileData, knightInvoices));
    blocks.push(divider());
    blocks.push(...buildFounderTake(fy26Totals, knightInvoices));
    blocks.push(divider());
    blocks.push(...buildComplianceFlags());
    blocks.push(divider());
    blocks.push(...buildCashForecast(cashflow, outstanding));
    blocks.push(divider());
    blocks.push(...buildPipelineByPile(pipeline, grantScope, pileData));
    blocks.push(divider());
    blocks.push(...buildOpportunityActions(pipeline));
    blocks.push(divider());
    blocks.push(...buildFoundationResearch(foundationResearch));
    blocks.push(divider());
    blocks.push(...buildOpenQuestions());
    blocks.push(divider());
    blocks.push(buildFooter());
    await writeMarkdown(blocks);
    return;
  }

  if (!process.env.NOTION_TOKEN) {
    log('ERROR: NOTION_TOKEN not set');
    process.exit(1);
  }

  const pageId = DRY_RUN ? 'dry-run-no-page' : await ensurePage();
  if (!DRY_RUN) {
    const page = await notion.pages.retrieve({ page_id: pageId });
    if (page.archived || page.in_trash) {
      log(`ABORT: ACT Money Framework page (${pageId}) is in Trash. Restore it in Notion before re-running.`);
      process.exit(2);
    }
  }
  await updatePage(pageId);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
