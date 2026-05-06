#!/usr/bin/env node
/**
 * Build the main ACT Money Dashboard hub page in Notion.
 *
 * Replaces the body of the existing ACT Money Framework page with a true
 * dashboard layout:
 *   - 4 KPI callouts at top (bank, runway, FY26 net, days to cutover)
 *   - Quick action row (refresh, GHL, Xero, sync page)
 *   - Navigation grid (sub-pages organized by category)
 *   - Embedded recent opportunities (linked database)
 *   - How-to-use toggles
 *   - Testing checklist
 *
 * This OVERRIDES the previous exec-summary on the framework page. The exec
 * summary content (top opportunities, what's burning, pile mix) is preserved
 * lower down.
 *
 * Usage:
 *   node scripts/sync-money-dashboard-hub.mjs              # full refresh
 *   node scripts/sync-money-dashboard-hub.mjs --dry-run    # preview
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
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const cfgPath = join(__dirname, '..', 'config', 'notion-database-ids.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
const HUB_PAGE = cfg.moneyFramework;

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;

const rt = (text, opts = {}) => {
  const r = { type: 'text', text: { content: String(text).slice(0, 2000) } };
  if (opts.link) r.text.link = { url: opts.link };
  if (opts.bold || opts.color || opts.code) {
    r.annotations = {};
    if (opts.bold) r.annotations.bold = true;
    if (opts.code) r.annotations.code = true;
    if (opts.color) r.annotations.color = opts.color;
  }
  return r;
};

const notionUrl = (id) => id ? `https://www.notion.so/${id.replace(/-/g, '')}` : '#';

async function gatherKPIs() {
  // Bank
  const { data: bankAccts } = await supabase
    .from('xero_bank_accounts').select('name, current_balance')
    .eq('type', 'BANK').eq('status', 'ACTIVE');
  const tradingBal = (bankAccts || [])
    .filter(a => /everyday|maximiser/i.test(a.name))
    .reduce((s, a) => s + Number(a.current_balance || 0), 0);

  // Burn (90d avg)
  const { data: spend } = await supabase
    .from('xero_transactions').select('total')
    .eq('type', 'SPEND').eq('status', 'AUTHORISED')
    .gte('date', new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const monthlyBurn = (spend || []).reduce((s, t) => s + Number(t.total || 0), 0) / 3;
  const runway = monthlyBurn > 0 ? tradingBal / monthlyBurn : 999;

  // FY26 net
  const { data: rec } = await supabase
    .from('xero_invoices').select('amount_paid')
    .eq('type', 'ACCREC').gt('amount_paid', 0).gte('date', '2025-07-01');
  const { data: pay } = await supabase
    .from('xero_invoices').select('amount_paid')
    .eq('type', 'ACCPAY').gt('amount_paid', 0).gte('date', '2025-07-01');
  const recvTotal = (rec || []).reduce((s, r) => s + Number(r.amount_paid), 0);
  const paidTotal = (pay || []).reduce((s, r) => s + Number(r.amount_paid), 0);
  const fy26Net = recvTotal - paidTotal;

  // Days to cutover
  const cutover = new Date('2026-06-30');
  const daysToCutover = Math.ceil((cutover - new Date()) / 86400000);

  return { tradingBal, runway, fy26Net, daysToCutover };
}

function kpiCallout(emoji, value, label, color, link) {
  const valueRich = link
    ? rt(value, { bold: true, link })
    : rt(value, { bold: true });
  return {
    object: 'block', type: 'callout',
    callout: {
      rich_text: [
        valueRich,
        rt('\n'),
        rt(label, { color: 'gray' }),
      ],
      icon: { type: 'emoji', emoji },
      color,
    },
  };
}

function navCard(emoji, title, desc, pageId) {
  return {
    object: 'block', type: 'callout',
    callout: {
      rich_text: [
        rt(title, { bold: true, link: notionUrl(pageId) }),
        rt(`\n${desc}`, { color: 'gray' }),
      ],
      icon: { type: 'emoji', emoji },
      color: 'default',
    },
  };
}

function buildNavGridRow(cards) {
  // 2-column row (Notion column_list children)
  return {
    object: 'block', type: 'column_list',
    column_list: {
      children: cards.map(c => ({
        object: 'block', type: 'column',
        column: { children: [c] },
      })),
    },
  };
}

async function buildBlocks() {
  const k = await gatherKPIs();
  log(`KPIs: bank ${fmt(k.tradingBal)}, runway ${k.runway.toFixed(1)}mo, FY26 net ${fmt(k.fy26Net)}, ${k.daysToCutover}d to cutover`);

  const blocks = [];

  // ── Title row ─────────────────────────
  blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [rt('🏛️ ACT Money — Dashboard')] } });
  blocks.push({
    object: 'block', type: 'paragraph',
    paragraph: { rich_text: [
      rt('One place for everything money-related at ACT. Auto-refreshes Mon morning. Last sync: ', { color: 'gray' }),
      rt(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC', { color: 'gray', code: true }),
    ]},
  });

  // ── KPI row (4 callouts in column_list) ──
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('📊 Right now')] } });
  blocks.push({
    object: 'block', type: 'column_list',
    column_list: { children: [
      { object: 'block', type: 'column', column: { children: [
        kpiCallout('🏦', fmt(k.tradingBal), 'Cash in trading accounts', 'gray_background'),
      ]}},
      { object: 'block', type: 'column', column: { children: [
        kpiCallout('🛬', `${k.runway.toFixed(1)} mo`, 'Runway at current burn',
          k.runway < 6 ? 'red_background' : k.runway < 12 ? 'orange_background' : 'green_background'),
      ]}},
      { object: 'block', type: 'column', column: { children: [
        kpiCallout('📈', fmt(k.fy26Net), 'FY26 net surplus', k.fy26Net >= 0 ? 'green_background' : 'red_background'),
      ]}},
      { object: 'block', type: 'column', column: { children: [
        kpiCallout('⏱️', `${k.daysToCutover} days`, 'Until ACT Pty cutover (30 Jun)',
          k.daysToCutover < 30 ? 'red_background' : k.daysToCutover < 60 ? 'orange_background' : 'gray_background'),
      ]}},
    ]},
  });

  // ── Navigation grid ─────────────
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('🧭 Navigate')] } });

  // Row 1: Operations
  blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [rt('💼 Operations', { bold: true, color: 'purple' })] } });
  blocks.push(buildNavGridRow([
    navCard('💰', 'Opportunities Database', '408 deals · filter by Pile · edits push to GHL', cfg.opportunitiesDb),
    navCard('💰', 'Money In Alignment', 'Every $ in: invoices + bank receipts + payments hygiene', cfg.moneyInAlignment),
    navCard('💸', 'Money Out Alignment', 'Every $ out · R&D-eligible flagged', cfg.moneyOutAlignment),
  ]));

  // Row 2: Forecast & Analytics
  blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [rt('🔮 Forecast & Analytics', { bold: true, color: 'blue' })] } });
  blocks.push(buildNavGridRow([
    navCard('📈', 'Cash Forecast (13-week)', 'Rolling weekly view · receipts + payments + recurring', cfg.cashForecast),
    navCard('🔮', 'Cash Scenarios (12-month)', 'Base / No PICC / R&D delayed / CG first sale', cfg.cashScenarios),
    navCard('📊', 'KPIs & Concentration Risk', 'Runway · top customers · AR aging · win rate', cfg.kpisPage),
  ]));

  // Row 3: Strategy & Pile pages
  blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [rt('🎯 Pile pages (strategic)', { bold: true, color: 'orange' })] } });
  blocks.push(buildNavGridRow([
    navCard('🎙️', 'Voice', 'Storytelling commercialisation', cfg.pilePage_voice),
    navCard('🌊', 'Flow', 'CivicGraph · Goods · JusticeHub commercial', cfg.pilePage_flow),
    navCard('🌾', 'Ground', 'Farm · Harvest · place-anchored', cfg.pilePage_ground),
    navCard('🏛️', 'Grants', 'Philanthropic + government', cfg.pilePage_grants),
  ]));

  // Row 4: Strategy + Reviews
  blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [rt('📜 Strategy & Reviews', { bold: true, color: 'brown' })] } });
  blocks.push(buildNavGridRow([
    navCard('📜', 'CY26 Plan & Philosophy', 'Cutover · payroll · Cameron + Pollyanna · Africa R&D', cfg.cy26StrategyPlan),
    navCard('🏗️', 'Surface Design', 'Why we built this in Notion (vs Float / Causal / Fathom)', cfg.financeSurfaceDesign),
    navCard('🎯', 'Budget vs Actual', 'Per-project FY26 tracking', cfg.budgetActual),
  ]));

  // Row 5: Reviews & Sync
  blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [rt('🔁 Reviews & Sync', { bold: true, color: 'green' })] } });
  blocks.push(buildNavGridRow([
    navCard('💵', 'Friday Digest', 'Auto Fri 3pm · weekly wins/burns/actions', cfg.weeklyDigest),
    navCard('💬', 'Money Sync (Q&A)', 'Free-form: questions, ideas, decisions', cfg.moneySyncPage),
    navCard('📈', 'Money Metrics DB', 'Weekly snapshots → Dashboard view (charts)', cfg.moneyMetricsDb),
  ]));

  // Row 6: Supporting databases (Decisions, Actions, Foundations, Q&A, Stakeholders)
  blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [rt('🗂️ Working databases', { bold: true, color: 'pink' })] } });
  blocks.push(buildNavGridRow([
    navCard('📜', 'Decisions Log', 'What decided · why · linked Opp · status', cfg.decisionsLog),
    navCard('✅', 'Action Items', 'Tasks with owner · due · priority', cfg.actionItems),
    navCard('🏛️', 'Foundations', 'Top 100 funders · DGR · giving · themes', cfg.foundationsDb),
  ]));
  blocks.push(buildNavGridRow([
    navCard('❓', 'Standard Ledger Q&A', 'Open questions to advisors · status · topic', cfg.ledgerQA),
    navCard('👥', 'Stakeholders', 'Founders · family · trust beneficiaries', cfg.stakeholders),
    navCard('🏗️', 'Dashboard Walkthrough', 'How-to setup guide for views + charts', cfg.dashboardWalkthrough),
  ]));

  // Row 7: World-class connected layer
  blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [rt('🌐 Connected layer (cross-system views)', { bold: true, color: 'red' })] } });
  blocks.push(buildNavGridRow([
    navCard('🧭', 'Planning Rhythm', 'Weekly / monthly / half-yearly / yearly / 5-year — all in one page', cfg.planningRhythm),
    navCard('🌐', 'Entity Hub', 'Every org we touch (Xero + GHL + Foundations + GrantScope)', cfg.entityHub),
  ]));

  // ── Quick actions ─────────────
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('⚡ Quick actions')] } });
  blocks.push({
    object: 'block', type: 'callout',
    callout: {
      rich_text: [
        rt('External systems: ', { bold: true }),
        rt('Xero', { link: 'https://go.xero.com/', color: 'blue' }),
        rt(' · '),
        rt('GHL', { link: `https://app.gohighlevel.com/v2/location/${process.env.GHL_LOCATION_ID || 'agzsSZWgovjwgpcoASWG'}/opportunities/list`, color: 'blue' }),
        rt(' · '),
        rt('CivicGraph', { link: 'https://civicgraph.app', color: 'blue' }),
        rt(' · '),
        rt('GHL Settings (pipelines)', { link: `https://app.gohighlevel.com/v2/location/${process.env.GHL_LOCATION_ID || 'agzsSZWgovjwgpcoASWG'}/settings/pipelines`, color: 'blue' }),
      ],
      icon: { type: 'emoji', emoji: '🔗' }, color: 'gray_background',
    },
  });

  // ── How to use ─────────────
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('📖 How to use this dashboard')] } });

  // Toggle: Daily check-in
  blocks.push({
    object: 'block', type: 'toggle',
    toggle: {
      rich_text: [rt('☀️ Daily check-in (2 minutes)', { bold: true })],
      children: [
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('Open this dashboard. Glance at the KPI row. Anything red?')] } },
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('Scroll to "What\'s burning" (further down). Action anything new.')] } },
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('If anything happened money-wise (invoice paid, deal won, decision made): drop a note in Money Sync (Q&A).')] } },
      ],
    },
  });

  // Toggle: Friday review
  blocks.push({
    object: 'block', type: 'toggle',
    toggle: {
      rich_text: [rt('🍻 Friday review (15-30 minutes with Nic)', { bold: true })],
      children: [
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('Open the Friday Digest — read this week\'s wins/burns')] } },
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('Open Cash Forecast — any tight weeks coming?')] } },
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('Open KPIs — runway changed? Concentration risk?')] } },
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('Review Money Sync (Q&A) — any unanswered questions?')] } },
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('Decide top 3 actions for next week. Log them on Money Sync (Q&A).')] } },
      ],
    },
  });

  // Toggle: Edit a deal
  blocks.push({
    object: 'block', type: 'toggle',
    toggle: {
      rich_text: [rt('💼 Edit a deal (Notion → GHL)', { bold: true })],
      children: [
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('Open Opportunities Database. Filter by Pile or Source.')] } },
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('Click a row → change Stage to Won / Lost / Archived.')] } },
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('In terminal: ', { color: 'gray' }), rt('node scripts/sync-notion-changes-to-ghl.mjs', { code: true })] } },
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('GHL is updated. Next Mon sync brings it back into Notion.')] } },
      ],
    },
  });

  // Toggle: Match Xero payment
  blocks.push({
    object: 'block', type: 'toggle',
    toggle: {
      rich_text: [rt('🧾 Match a Xero payment to an invoice', { bold: true })],
      children: [
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [rt('When you know which invoice a deposit paid (Xero side):', { bold: true })] } },
        { object: 'block', type: 'code', code: { language: 'shell', rich_text: [rt(`# Find available bank accounts\nnode scripts/xero-match-payment.mjs --list-bank-accounts\n\n# Create the payment + auto-reconcile\nnode scripts/xero-match-payment.mjs \\\n  --invoice INV-XXXX \\\n  --account "NJ Marchesi T/as ACT Everyday" \\\n  --amount 27500 \\\n  --date 2026-04-24`)] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [rt('Or get suggested matches automatically:', { bold: true })] } },
        { object: 'block', type: 'code', code: { language: 'shell', rich_text: [rt(`node scripts/xero-suggest-matches.mjs                # preview\nnode scripts/xero-suggest-matches.mjs --apply        # auto-apply high-confidence`)] } },
      ],
    },
  });

  // Toggle: Refresh + cron
  blocks.push({
    object: 'block', type: 'toggle',
    toggle: {
      rich_text: [rt('🔄 Refresh anytime / cron stack', { bold: true })],
      children: [
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [rt('All pages auto-refresh Mon morning. Manual refresh:', { bold: true })] } },
        { object: 'block', type: 'code', code: { language: 'shell', rich_text: [rt(`# Refresh ALL\nnode scripts/sync-money-dashboard-hub.mjs            # this hub page\nnode scripts/sync-money-framework-to-notion.mjs      # exec view (deeper)\nnode scripts/sync-cash-forecast-to-notion.mjs        # 13-week\nnode scripts/sync-cash-scenarios-to-notion.mjs       # 12-month\nnode scripts/sync-kpis-to-notion.mjs                 # KPIs\nnode scripts/sync-budget-vs-actual-to-notion.mjs     # budget\nnode scripts/sync-pile-pages-to-notion.mjs           # pile pages\nnode scripts/sync-opportunities-to-notion-db.mjs     # opportunities DB\nnode scripts/sync-money-alignment-to-notion.mjs      # alignment pages\nnode scripts/weekly-money-digest.mjs                 # Friday digest\n\n# After Xero/GHL changes:\nnode scripts/sync-xero-to-supabase.mjs invoices --days=30\nnode scripts/sync-ghl-to-supabase.mjs\nnode scripts/sync-xero-payments.mjs --days=30`)] } },
      ],
    },
  });

  // Toggle: dashboard view setup
  blocks.push({
    object: 'block', type: 'toggle',
    toggle: {
      rich_text: [rt('✨ Set up Notion Dashboard view (5 min, one-time, Business plan)', { bold: true })],
      children: [
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [
          rt('You have two databases ready for Dashboard views: ', { bold: true }),
        ]}},
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [
          rt('1. ', { bold: true }),
          rt('Money Metrics DB', { link: notionUrl(cfg.moneyMetricsDb), color: 'blue', bold: true }),
          rt(' — weekly snapshots, perfect for line/trend charts (Bank, Runway, FY26 Net over time)'),
        ]}},
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [
          rt('2. ', { bold: true }),
          rt('Opportunities Database', { link: notionUrl(cfg.opportunitiesDb), color: 'blue', bold: true }),
          rt(' — pipeline data, perfect for bar/donut charts (by Pile, Stage, Source)'),
        ]}},
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [rt('To set up:', { bold: true })] } },
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('Open the database, click ⋯ → Connections → add JusticeHub integration')] } },
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('Click + next to existing view → "Dashboard"')] } },
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('Add widgets (max 12, 4 per row):')] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [rt('Suggested for Money Metrics:', { bold: true })] } },
        { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rt('Number: Bank Cash (Latest) — conditional <100K red')] } },
        { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rt('Number: Runway Months (Latest) — conditional <6 red, <12 orange')] } },
        { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rt('Number: FY26 Net (Latest)')] } },
        { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rt('Line chart: Bank Cash by Snapshot Date')] } },
        { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rt('Line chart: Runway Months by Snapshot Date')] } },
        { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rt('Stacked bar: Voice + Flow + Ground + Grants Income by Snapshot Date')] } },
        { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rt('Number: R&D Eligible Spend (Latest) — caption "× 0.435 = forecast refund"')] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [rt('Suggested for Opportunities:', { bold: true })] } },
        { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rt('Bar chart: Amount grouped by Pile')] } },
        { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rt('Donut: count grouped by Source (GHL / Xero / Foundation)')] } },
        { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rt('Table: Top 10 by Amount where Stage = Open')] } },
        { object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [rt('Pin Dashboard view as default')] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [
          rt('Note: trend charts will look flat for the first ~4 weeks because backfill seeded with current values. Real trends emerge as the Mon 9:15am cron appends new snapshots each week.', { color: 'gray' })
        ]}},
      ],
    },
  });

  // ── Test checklist ─────────────
  blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt('✅ Test the system (one-off, ~10 min)')] } });
  const tests = [
    'Open this dashboard. Confirm KPI row shows real numbers.',
    'Click each navigation card — confirms each sub-page loads.',
    'Open Opportunities Database. Filter by Pile = Voice. Should show ~40 rows.',
    'Click any GHL-source row → "Source URL" link should open the deal in GHL.',
    'Click any Xero-source row → "Source URL" link should open the invoice in Xero.',
    'Open Cash Forecast. Verify trough week is highlighted (orange/red if low).',
    'Open KPIs. Confirm runway is realistic (should be 30+ months at current burn).',
    'Open Cash Scenarios. Pick the "No PICC" column — should show lower trough than Base.',
    'Open Friday Digest — confirm it shows this week\'s data (auto-runs Friday 3pm).',
    'Open Money Sync (Q&A). Add a test question. Refresh nothing — it stays.',
  ];
  for (const t of tests) {
    blocks.push({ object: 'block', type: 'to_do', to_do: { rich_text: [rt(t)], checked: false } });
  }

  // ── Footer ─────────────
  blocks.push({ object: 'block', type: 'divider', divider: {} });
  blocks.push({
    object: 'block', type: 'paragraph',
    paragraph: { rich_text: [
      rt('Built on Supabase (single source of truth) → Notion (work surface) → Xero/GHL/CivicGraph (sources). Auto-refreshes via PM2 cron Mon 6am-9:05am AEST. ', { color: 'gray' }),
      rt('Architecture: ', { color: 'gray' }),
      rt('Surface Design doc', { link: notionUrl(cfg.financeSurfaceDesign), color: 'blue' }),
      rt('. Refresh this page: ', { color: 'gray' }),
      rt('node scripts/sync-money-dashboard-hub.mjs', { code: true }),
    ]},
  });

  return blocks;
}

async function main() {
  log('=== Money Dashboard Hub ===');
  const blocks = await buildBlocks();
  log(`Built ${blocks.length} top-level blocks`);

  if (DRY_RUN) {
    log('DRY RUN — would replace the framework page body.');
    return;
  }

  // Replace body of framework page
  let cursor;
  const ids = [];
  do {
    const res = await notion.blocks.children.list({ block_id: HUB_PAGE, start_cursor: cursor, page_size: 100 });
    ids.push(...res.results.filter(b => b.type !== "child_database" && b.type !== "child_page").map(b => b.id));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  log(`Deleting ${ids.length} existing blocks...`);
  for (const id of ids) {
    try { await notion.blocks.delete({ block_id: id }); await sleep(80); } catch {}
  }

  log(`Appending ${blocks.length} new blocks...`);
  for (let i = 0; i < blocks.length; i += 50) {
    await notion.blocks.children.append({ block_id: HUB_PAGE, children: blocks.slice(i, i + 50) });
    await sleep(300);
  }

  log(`Done. Open: ${notionUrl(HUB_PAGE)}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
