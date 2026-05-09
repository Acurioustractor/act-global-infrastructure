#!/usr/bin/env node
/**
 * ACT Now → single-file HTML dashboard.
 *
 * Same data feeds as sync-act-now-to-notion.mjs but rendered as a richer,
 * interactive HTML artifact (per the HTML-effectiveness pattern: information
 * density, visual clarity, filters, sortable tables, charts, copy-as-markdown).
 *
 * Output:
 *   thoughts/shared/cockpit/act-now.html  (~250 KB self-contained)
 *
 * Usage:
 *   node scripts/render-act-now-html.mjs
 *   open thoughts/shared/cockpit/act-now.html
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
await import(join(__dirname, 'lib/load-env.mjs'));

const REPO_ROOT = join(__dirname, '..');
const OUT_DIR = join(REPO_ROOT, 'thoughts', 'shared', 'cockpit');
const OUT = join(OUT_DIR, 'act-now.html');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const cfg = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'notion-database-ids.json'), 'utf-8'));

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const fmt = (n) => Number(n || 0).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
const ageDays = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ─── data fetch ──────────────────────────────────────────────────────────
async function fetchAll() {
  log('Fetching xero data...');
  const [
    { data: bank },
    { data: receivables },
    { data: q2 },
    { data: q3 },
    { data: q4 },
    { data: spend90 },
    { data: bankHistory },
  ] = await Promise.all([
    supabase.from('xero_bank_accounts').select('name, current_balance').eq('type', 'BANK').eq('status', 'ACTIVE'),
    supabase.from('xero_invoices').select('invoice_number, contact_name, amount_due, total, due_date, date').eq('type', 'ACCREC').eq('status', 'AUTHORISED').gt('amount_due', 0).order('amount_due', { ascending: false }).limit(20),
    supabase.from('xero_invoices').select('type, status, total, amount_due, has_attachments, contact_name, invoice_number, date').gte('date', '2025-10-01').lte('date', '2025-12-31'),
    supabase.from('xero_invoices').select('type, status, total, amount_due, has_attachments, contact_name, invoice_number, date').gte('date', '2026-01-01').lte('date', '2026-03-31'),
    supabase.from('xero_invoices').select('type, status, total, amount_due, has_attachments, contact_name, invoice_number, date').gte('date', '2026-04-01').lte('date', '2026-06-30'),
    supabase.from('xero_transactions').select('total').eq('type', 'SPEND').eq('status', 'AUTHORISED').gte('date', new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)),
    // bank balance trail (last 30 days) for sparkline — best-effort, may be empty if no history
    supabase.from('xero_bank_accounts').select('name, current_balance').eq('type', 'BANK').eq('status', 'ACTIVE'),
  ]);

  log('Fetching Notion data...');
  let opps = [], decisions = [], actions = [];
  try {
    if (cfg.opportunitiesDataSource) {
      const r = await notion.dataSources.query({ data_source_id: cfg.opportunitiesDataSource, page_size: 100 });
      opps = (r.results || []).map((p) => ({
        name: p.properties?.Name?.title?.[0]?.plain_text || p.properties?.Title?.title?.[0]?.plain_text || '(unnamed)',
        pile: p.properties?.Pile?.select?.name || 'Other',
        amount: Number(p.properties?.Amount?.number ?? p.properties?.Value?.number ?? p.properties?.['Weighted Value']?.number ?? 0),
        stage: p.properties?.Stage?.select?.name || '—',
        source: p.properties?.Source?.select?.name || '—',
        url: p.url,
      }));
    }
  } catch (e) { log('  warn: opportunities query: ' + e.message); }

  try {
    if (cfg.decisionsLogDataSource) {
      const r = await notion.dataSources.query({
        data_source_id: cfg.decisionsLogDataSource, page_size: 50,
        filter: { property: 'Status', select: { equals: 'Proposed' } },
      });
      decisions = (r.results || []).map((p) => ({
        name: p.properties?.Decision?.title?.[0]?.plain_text || p.properties?.Name?.title?.[0]?.plain_text || '(unnamed)',
        status: p.properties?.Status?.select?.name || 'Proposed',
        age: ageDays(p.created_time),
        url: p.url,
      })).filter((d) => d.age > 7).sort((a, b) => b.age - a.age).slice(0, 10);
    }
  } catch (e) { log('  warn: decisions query: ' + e.message); }

  try {
    if (cfg.actionItemsDataSource) {
      const r = await notion.dataSources.query({
        data_source_id: cfg.actionItemsDataSource, page_size: 50,
        filter: { property: 'Status', select: { does_not_equal: 'Done' } },
      });
      actions = (r.results || []).map((p) => ({
        name: p.properties?.Task?.title?.[0]?.plain_text || p.properties?.Name?.title?.[0]?.plain_text || '(unnamed)',
        priority: p.properties?.Priority?.select?.name || 'Medium',
        due: p.properties?.Due?.date?.start || null,
        url: p.url,
      })).filter((a) => a.priority === 'Critical' || a.priority === 'High').slice(0, 15);
    }
  } catch (e) { log('  warn: actions query: ' + e.message); }

  log('Scanning filesystem...');
  const drafts = scanDrafts();
  const plans = scanPlans();

  const tradingBal = (bank || []).filter((a) => /everyday|maximiser/i.test(a.name)).reduce((s, a) => s + Number(a.current_balance || 0), 0);
  const monthlyBurn = (spend90 || []).reduce((s, t) => s + Number(t.total || 0), 0) / 3;
  const runway = monthlyBurn > 0 ? tradingBal / monthlyBurn : 999;

  return {
    tradingBal,
    runway,
    receivables: receivables || [],
    bas: { q2: q2 || [], q3: q3 || [], q4: q4 || [] },
    opps,
    decisions,
    actions,
    drafts,
    plans,
  };
}

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

function scanDrafts() {
  const dir = join(REPO_ROOT, 'thoughts', 'shared', 'drafts');
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.md')); } catch { return []; }
  const stale = [];
  for (const e of entries) {
    try {
      const f = join(dir, e.name);
      const stat = statSync(f);
      const age = Math.floor((Date.now() - stat.mtimeMs) / 86400000);
      if (age < 14) continue;
      const fm = parseFm(readFileSync(f, 'utf-8').slice(0, 4000));
      if (['send-ready', 'sent', 'archived'].includes(fm.status)) continue;
      stale.push({ name: e.name, age, status: fm.status || 'unknown', title: fm.title || e.name.replace(/\.md$/, '') });
    } catch {}
  }
  return stale.sort((a, b) => b.age - a.age).slice(0, 10);
}

function scanPlans() {
  const dir = join(REPO_ROOT, 'thoughts', 'shared', 'plans');
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.md')); } catch { return { all: [], total: 0 }; }
  const all = [];
  for (const e of entries) {
    try {
      const fm = parseFm(readFileSync(join(dir, e.name), 'utf-8').slice(0, 4000));
      const status = (fm.status || '').toLowerCase();
      if (['review-needed', 'awaiting-ben', 'ben-markup-needed'].includes(status)) {
        all.push({ name: e.name, title: fm.title || e.name.replace(/\.md$/, ''), status: fm.status });
      }
    } catch {}
  }
  return { all, total: all.length };
}

function basAggregate(rows) {
  const apMissingRcpt = rows.filter((r) => r.type === 'ACCPAY' && r.status === 'AUTHORISED' && !r.has_attachments);
  return {
    total: rows.length,
    arOutstanding: rows.filter((r) => r.type === 'ACCREC' && Number(r.amount_due) > 0).reduce((s, r) => s + Number(r.amount_due || 0), 0),
    apOutstanding: rows.filter((r) => r.type === 'ACCPAY' && Number(r.amount_due) > 0).reduce((s, r) => s + Number(r.amount_due || 0), 0),
    apMissingRcptCount: apMissingRcpt.length,
    apMissingRcptAmt: apMissingRcpt.reduce((s, r) => s + Number(r.total || 0), 0),
  };
}

function bucketReceivablesByAging(receivables) {
  const buckets = { 'Future': 0, '0-30 overdue': 0, '31-60 overdue': 0, '61-90 overdue': 0, '90+ overdue': 0 };
  for (const r of receivables) {
    if (!r.due_date) continue;
    const age = ageDays(r.due_date);
    const amt = Number(r.amount_due || 0);
    if (age <= 0) buckets['Future'] += amt;
    else if (age <= 30) buckets['0-30 overdue'] += amt;
    else if (age <= 60) buckets['31-60 overdue'] += amt;
    else if (age <= 90) buckets['61-90 overdue'] += amt;
    else buckets['90+ overdue'] += amt;
  }
  return buckets;
}

function pileAggregates(opps) {
  const out = { Voice: { count: 0, value: 0 }, Flow: { count: 0, value: 0 }, Ground: { count: 0, value: 0 }, Grants: { count: 0, value: 0 }, Other: { count: 0, value: 0 } };
  for (const o of opps) {
    const k = ['Voice', 'Flow', 'Ground', 'Grants'].includes(o.pile) ? o.pile : 'Other';
    out[k].count++;
    out[k].value += Number(o.amount || 0);
  }
  return out;
}

function gitInfo() {
  try {
    const sha = execSync('git rev-parse --short HEAD', { cwd: REPO_ROOT }).toString().trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: REPO_ROOT }).toString().trim();
    return { sha, branch };
  } catch { return { sha: 'unknown', branch: 'unknown' }; }
}

// ─── render HTML ─────────────────────────────────────────────────────────
function renderHtml(d) {
  const refreshed = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const git = gitInfo();
  const overdue = d.receivables.filter((r) => r.due_date && new Date(r.due_date) < new Date());
  const overdueAmt = overdue.reduce((s, r) => s + Number(r.amount_due || 0), 0);
  const totalAR = d.receivables.reduce((s, r) => s + Number(r.amount_due || 0), 0);
  const piles = pileAggregates(d.opps);
  const aging = bucketReceivablesByAging(d.receivables);
  const basRows = [
    { label: 'Q2 FY26 (Oct-Dec 25)', lodged: true, ...basAggregate(d.bas.q2) },
    { label: 'Q3 FY26 (Jan-Mar 26)', lodged: true, ...basAggregate(d.bas.q3) },
    { label: 'Q4 FY26 (Apr-Jun 26)', lodged: false, ...basAggregate(d.bas.q4) },
  ];
  const attentionCount = d.actions.length + d.decisions.length;

  // Pre-compute markdown summary for the copy button
  const mdSummary = `# ACT Now — ${refreshed}

## KPIs
- Cash in trading accounts: ${fmt(d.tradingBal)}
- Runway: ${d.runway >= 99 ? '∞' : d.runway.toFixed(1) + ' mo'}
- Receivables outstanding: ${fmt(totalAR)} across ${d.receivables.length} invoices
- Overdue: ${overdue.length} invoices · ${fmt(overdueAmt)}
- Critical/high actions waiting: ${d.actions.length}
- Decisions awaiting (>7d): ${d.decisions.length}
- Drafts going stale (>14d): ${d.drafts.length}
- Plans awaiting markup: ${d.plans.total}

## Top receivables
${d.receivables.slice(0, 5).map((r) => `- ${fmt(r.amount_due)} ${r.contact_name || '?'} (${r.invoice_number || '—'})${r.due_date ? ' · due ' + r.due_date : ''}`).join('\n')}

## BAS by quarter
${basRows.map((q) => `- ${q.label}: ${q.lodged ? 'lodged' : 'in progress'} · ${q.total} invoices · AR ${fmt(q.arOutstanding)} · AP ${fmt(q.apOutstanding)}${q.apMissingRcptCount ? ` · ⚠️ ${q.apMissingRcptCount} bills missing receipts (${fmt(q.apMissingRcptAmt)})` : ''}`).join('\n')}

## Pipeline by pile
${['Voice', 'Flow', 'Ground', 'Grants', 'Other'].filter((k) => piles[k].count > 0).map((k) => `- ${k}: ${piles[k].count} opps · ${fmt(piles[k].value)}`).join('\n')}

Source: scripts/render-act-now-html.mjs · commit ${git.sha}
`;

  // ── HTML template ──────────────────────────────────────────────────────
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ACT Now — ${refreshed}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
:root {
  --bg: #f7f6f1;
  --surface: #ffffff;
  --ink: #1a1a17;
  --muted: #5b5b54;
  --border: #e5e3dc;
  --accent: #0a4f3a;
  --warn: #a36400;
  --warn-bg: #fff8e8;
  --fail: #a31a1a;
  --fail-bg: #fdeded;
  --pass: #0a7d3a;
  --pass-bg: #e8f5ec;
  --voice: #c2410c;
  --flow: #1d4ed8;
  --ground: #15803d;
  --grants: #7c2d12;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--ink);
  font: 14px/1.55 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px 24px 60px;
}
h1, h2, h3 { font-family: ui-serif, "Iowan Old Style", Palatino, Georgia, serif; line-height: 1.2; margin: 0 0 8px; }
h1 { font-size: 30px; }
h2 { font-size: 22px; margin: 32px 0 14px; padding-bottom: 8px; border-bottom: 2px solid var(--border); }
h3 { font-size: 16px; margin: 20px 0 8px; }

header.banner {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 18px 22px;
  margin-bottom: 16px;
  display: flex; justify-content: space-between; align-items: center; gap: 24px;
}
.banner-title { display: flex; flex-direction: column; }
.banner-sub { color: var(--muted); font-size: 13px; margin-top: 2px; }
.banner-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.btn {
  padding: 8px 14px;
  background: var(--accent); color: white; border: 0; border-radius: 6px;
  font: 13px ui-sans-serif, -apple-system, sans-serif; cursor: pointer; text-decoration: none;
}
.btn:hover { opacity: 0.9; }
.btn-ghost { background: transparent; color: var(--ink); border: 1px solid var(--border); }
.btn-ghost:hover { background: #efece4; }

.kpi-strip {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;
  margin-bottom: 20px;
}
.kpi-tile {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 16px;
  position: relative;
}
.kpi-tile.warn { background: var(--warn-bg); border-left: 4px solid var(--warn); }
.kpi-tile.fail { background: var(--fail-bg); border-left: 4px solid var(--fail); }
.kpi-tile.pass { background: var(--pass-bg); border-left: 4px solid var(--pass); }
.kpi-emoji { font-size: 18px; }
.kpi-value { font-size: 24px; font-weight: 700; line-height: 1.1; margin: 4px 0 2px; font-variant-numeric: tabular-nums; }
.kpi-label { font-size: 12px; color: var(--muted); }

.grid-2 { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; align-items: start; }
@media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px 18px;
}
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 10px; flex-wrap: wrap; }
.card-header h2 { margin: 0; padding: 0; border: 0; font-size: 18px; }
.card-summary { color: var(--muted); font-size: 12px; }

.filter-chips { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0 12px; }
.chip {
  padding: 4px 10px;
  background: #efece4;
  border: 1px solid var(--border);
  border-radius: 14px;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}
.chip.active { background: var(--ink); color: white; border-color: var(--ink); }

table { border-collapse: collapse; width: 100%; font-size: 13px; }
th, td { padding: 6px 9px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
th { background: #efece4; font-weight: 600; cursor: pointer; user-select: none; position: sticky; top: 0; }
th:hover { background: #e5e1d3; }
th.sort-asc::after { content: ' ▲'; color: var(--muted); font-size: 10px; }
th.sort-desc::after { content: ' ▼'; color: var(--muted); font-size: 10px; }
tbody tr { transition: background 0.1s; }
tbody tr:hover { background: #fbfaf6; }
tbody tr.hidden { display: none; }
.amount { font-variant-numeric: tabular-nums; font-weight: 600; }
.amount.overdue { color: var(--fail); }
.badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; display: inline-block; }
.badge-red { background: var(--fail-bg); color: var(--fail); }
.badge-orange { background: var(--warn-bg); color: var(--warn); }
.badge-green { background: var(--pass-bg); color: var(--pass); }
.badge-gray { background: #efece4; color: var(--muted); }
.badge-voice { background: #fff1e8; color: var(--voice); }
.badge-flow { background: #eef2ff; color: var(--flow); }
.badge-ground { background: #ecfdf5; color: var(--ground); }
.badge-grants { background: #fef3c7; color: var(--grants); }

.chart-box { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 14px; height: 320px; position: relative; }
.chart-box canvas { max-height: 280px; }

.search-box {
  width: 100%; padding: 6px 10px; font: 13px ui-sans-serif, sans-serif;
  border: 1px solid var(--border); border-radius: 4px; margin-bottom: 8px;
}
.toast {
  position: fixed; bottom: 24px; right: 24px; background: var(--ink); color: white;
  padding: 10px 16px; border-radius: 6px; font-size: 13px; opacity: 0;
  transition: opacity 0.2s; pointer-events: none;
}
.toast.show { opacity: 1; }

footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid var(--border); font-size: 11px; color: var(--muted); }
footer a { color: var(--accent); }
</style>
</head>
<body>

<header class="banner">
  <div class="banner-title">
    <h1>🎯 ACT Now</h1>
    <div class="banner-sub">Executive read · refreshed ${esc(refreshed)} · commit <code>${esc(git.sha)}</code></div>
  </div>
  <div class="banner-actions">
    <button class="btn" id="copy-md">📋 Copy summary as markdown</button>
    <a class="btn btn-ghost" href="https://www.notion.so/35bebcf981cf81319f14d8d4b23e35f4" target="_blank">Open in Notion</a>
    <a class="btn btn-ghost" href="https://command.act.place/finance" target="_blank">Command center</a>
  </div>
</header>

<section class="kpi-strip">
  <div class="kpi-tile">
    <div class="kpi-emoji">🏦</div>
    <div class="kpi-value">${fmt(d.tradingBal)}</div>
    <div class="kpi-label">Cash in trading accounts</div>
  </div>
  <div class="kpi-tile ${d.runway < 6 ? 'fail' : d.runway < 12 ? 'warn' : 'pass'}">
    <div class="kpi-emoji">🛬</div>
    <div class="kpi-value">${d.runway >= 99 ? '∞' : d.runway.toFixed(1) + ' mo'}</div>
    <div class="kpi-label">Runway at current burn</div>
  </div>
  <div class="kpi-tile">
    <div class="kpi-emoji">💰</div>
    <div class="kpi-value">${fmt(totalAR)}</div>
    <div class="kpi-label">Receivables · ${d.receivables.length} invoices</div>
  </div>
  <div class="kpi-tile ${overdue.length > 0 ? 'fail' : 'pass'}">
    <div class="kpi-emoji">🔥</div>
    <div class="kpi-value">${overdue.length} overdue</div>
    <div class="kpi-label">${overdue.length > 0 ? fmt(overdueAmt) + ' past due' : 'No overdue invoices'}</div>
  </div>
  <div class="kpi-tile ${attentionCount > 0 ? 'warn' : 'pass'}">
    <div class="kpi-emoji">🛎️</div>
    <div class="kpi-value">${attentionCount}</div>
    <div class="kpi-label">Decisions + critical actions waiting</div>
  </div>
  <div class="kpi-tile">
    <div class="kpi-emoji">📐</div>
    <div class="kpi-value">${d.plans.total}</div>
    <div class="kpi-label">Plans · ${d.drafts.length} stale drafts</div>
  </div>
</section>

<section class="grid-2">
  <div class="card">
    <div class="card-header">
      <h2>💰 Receivables</h2>
      <div class="card-summary"><strong>${fmt(totalAR)}</strong> across ${d.receivables.length} invoices · <strong style="color:var(--fail)">${fmt(overdueAmt)} overdue</strong></div>
    </div>
    <div class="filter-chips" data-target="receivables-table">
      <span class="chip active" data-filter="all">All (${d.receivables.length})</span>
      <span class="chip" data-filter="overdue">Overdue (${overdue.length})</span>
      <span class="chip" data-filter="future">Future</span>
    </div>
    <input class="search-box" placeholder="Search contact / invoice…" data-target="receivables-table">
    <div style="max-height: 360px; overflow-y: auto;">
    <table id="receivables-table" data-sortable>
      <thead><tr>
        <th data-type="number">Amount</th>
        <th>Contact</th>
        <th>Invoice</th>
        <th>Due date</th>
        <th data-type="number">Aging</th>
      </tr></thead>
      <tbody>
${d.receivables.map((r) => {
  const age = r.due_date ? ageDays(r.due_date) : null;
  const isOverdue = age !== null && age > 0;
  return `        <tr data-state="${isOverdue ? 'overdue' : 'future'}">
          <td><span class="amount ${isOverdue ? 'overdue' : ''}">${fmt(r.amount_due)}</span></td>
          <td>${esc(r.contact_name || 'Unknown')}</td>
          <td><code>${esc(r.invoice_number || '—')}</code></td>
          <td>${esc(r.due_date || '—')}</td>
          <td>${age === null ? '<span class="badge badge-gray">—</span>' :
            isOverdue ? `<span class="badge badge-red">${age}d overdue</span>` :
            `<span class="badge badge-green">due in ${-age}d</span>`}</td>
        </tr>`;
}).join('\n')}
      </tbody>
    </table>
    </div>
  </div>

  <div class="card">
    <h2>📊 Receivables aging</h2>
    <div class="chart-box"><canvas id="aging-chart"></canvas></div>
  </div>
</section>

<section class="grid-2" style="margin-top: 18px;">
  <div class="card">
    <div class="card-header">
      <h2>📋 BAS by quarter</h2>
    </div>
    <table data-sortable>
      <thead><tr>
        <th>Quarter</th>
        <th>Status</th>
        <th data-type="number">Invoices</th>
        <th data-type="number">AR outstanding</th>
        <th data-type="number">AP outstanding</th>
        <th>Missing receipts</th>
      </tr></thead>
      <tbody>
${basRows.map((q) => `
        <tr>
          <td><strong>${esc(q.label)}</strong></td>
          <td>${q.lodged
            ? '<span class="badge badge-green">✅ lodged</span>'
            : '<span class="badge badge-orange">🟡 in progress</span>'}</td>
          <td>${q.total}</td>
          <td><span class="amount">${fmt(q.arOutstanding)}</span></td>
          <td><span class="amount">${fmt(q.apOutstanding)}</span></td>
          <td>${q.apMissingRcptCount > 0
            ? `<span class="badge badge-orange">⚠️ ${q.apMissingRcptCount} bills · ${fmt(q.apMissingRcptAmt)}</span>`
            : '<span class="badge badge-gray">—</span>'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2>🪣 Pipeline by pile</h2>
    <div class="chart-box"><canvas id="pile-chart"></canvas></div>
  </div>
</section>

<section class="card" style="margin-top: 18px;">
  <div class="card-header">
    <h2>🛎️ Decisions & critical actions waiting</h2>
    <div class="card-summary">${d.actions.length} critical/high actions · ${d.decisions.length} decisions aged > 7d</div>
  </div>
  ${d.actions.length === 0 && d.decisions.length === 0
    ? '<p style="color: var(--muted)">All caught up.</p>'
    : ''}
  ${d.actions.length > 0 ? `
  <h3>Critical / high actions</h3>
  <table data-sortable>
    <thead><tr>
      <th>Priority</th>
      <th>Task</th>
      <th>Due</th>
    </tr></thead>
    <tbody>
${d.actions.map((a) => `
      <tr>
        <td><span class="badge ${a.priority === 'Critical' ? 'badge-red' : 'badge-orange'}">${esc(a.priority)}</span></td>
        <td><strong>${esc(a.name)}</strong></td>
        <td>${esc(a.due || '—')}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}
  ${d.decisions.length > 0 ? `
  <h3 style="margin-top: 16px;">Decisions awaiting (Status: Proposed, age > 7d)</h3>
  <table data-sortable>
    <thead><tr>
      <th>Decision</th>
      <th>Status</th>
      <th data-type="number">Age</th>
    </tr></thead>
    <tbody>
${d.decisions.map((dn) => `
      <tr>
        <td><strong>${esc(dn.name)}</strong></td>
        <td><span class="badge badge-orange">${esc(dn.status)}</span></td>
        <td>${dn.age}d</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}
</section>

<section class="grid-2" style="margin-top: 18px;">
  <div class="card">
    <div class="card-header">
      <h2>📝 Drafts going stale</h2>
      <div class="card-summary">${d.drafts.length} drafts > 14 days untouched</div>
    </div>
    ${d.drafts.length === 0 ? '<p style="color: var(--muted)">No drafts older than 14 days.</p>' : `
    <table data-sortable>
      <thead><tr>
        <th>Title</th>
        <th>Status</th>
        <th data-type="number">Age</th>
      </tr></thead>
      <tbody>
${d.drafts.map((dr) => `
        <tr>
          <td><strong>${esc(dr.title)}</strong><br><code style="font-size:11px; color:var(--muted)">${esc(dr.name)}</code></td>
          <td><span class="badge badge-gray">${esc(dr.status)}</span></td>
          <td><span class="badge ${dr.age > 30 ? 'badge-red' : 'badge-orange'}">${dr.age}d</span></td>
        </tr>`).join('')}
      </tbody>
    </table>`}
  </div>

  <div class="card">
    <div class="card-header">
      <h2>📐 Plans awaiting markup</h2>
      <div class="card-summary">${d.plans.total} plans flagged · top 10 shown</div>
    </div>
    ${d.plans.total === 0 ? '<p style="color: var(--muted)">No plans flagged.</p>' : `
    <table data-sortable>
      <thead><tr>
        <th>Plan</th>
        <th>File</th>
      </tr></thead>
      <tbody>
${d.plans.all.slice(0, 10).map((p) => `
        <tr>
          <td><strong>${esc(p.title)}</strong></td>
          <td><code style="font-size:11px">${esc(p.name)}</code></td>
        </tr>`).join('')}
      </tbody>
    </table>`}
  </div>
</section>

<footer>
  Generated by <code>scripts/render-act-now-html.mjs</code> · branch <code>${esc(git.branch)}</code> · commit <code>${esc(git.sha)}</code><br>
  Data sources: Supabase <code>xero_invoices</code> + <code>xero_bank_accounts</code> + <code>xero_transactions</code>; Notion Opportunities + Decisions + Action Items; filesystem <code>thoughts/shared/drafts/</code> + <code>thoughts/shared/plans/</code>.<br>
  Regenerate: <code>node scripts/render-act-now-html.mjs</code>
</footer>

<div class="toast" id="toast">Copied to clipboard</div>

<script>
// ─── sortable tables ──────────────────────────────────────────────────
function parseCellSort(td, type) {
  const t = (td.textContent || '').trim();
  if (type === 'number') {
    const n = Number(t.replace(/[\\$,A-Za-z\\s%]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return t.toLowerCase();
}
document.querySelectorAll('table[data-sortable]').forEach((table) => {
  const ths = table.querySelectorAll('thead th');
  ths.forEach((th, idx) => {
    th.addEventListener('click', () => {
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const dir = th.classList.contains('sort-asc') ? 'desc' : 'asc';
      ths.forEach((t) => t.classList.remove('sort-asc', 'sort-desc'));
      th.classList.add(dir === 'asc' ? 'sort-asc' : 'sort-desc');
      const type = th.dataset.type || 'string';
      rows.sort((a, b) => {
        const A = parseCellSort(a.children[idx], type);
        const B = parseCellSort(b.children[idx], type);
        if (type === 'number') return dir === 'asc' ? A - B : B - A;
        return dir === 'asc' ? String(A).localeCompare(String(B)) : String(B).localeCompare(String(A));
      });
      rows.forEach((r) => tbody.appendChild(r));
    });
  });
});

// ─── filter chips ─────────────────────────────────────────────────────
document.querySelectorAll('.filter-chips').forEach((chips) => {
  const targetId = chips.dataset.target;
  const table = document.getElementById(targetId);
  chips.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter;
      table.querySelectorAll('tbody tr').forEach((row) => {
        if (filter === 'all' || row.dataset.state === filter) row.classList.remove('hidden');
        else row.classList.add('hidden');
      });
    });
  });
});

// ─── search box ───────────────────────────────────────────────────────
document.querySelectorAll('.search-box').forEach((box) => {
  const targetId = box.dataset.target;
  const table = document.getElementById(targetId);
  box.addEventListener('input', () => {
    const q = box.value.toLowerCase();
    table.querySelectorAll('tbody tr').forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.classList.toggle('hidden', q && !text.includes(q));
    });
  });
});

// ─── copy markdown summary ────────────────────────────────────────────
const MD_SUMMARY = ${JSON.stringify(mdSummary)};
document.getElementById('copy-md').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(MD_SUMMARY);
    const t = document.getElementById('toast');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1800);
  } catch (e) {
    alert('Copy failed: ' + e.message);
  }
});

// ─── charts ───────────────────────────────────────────────────────────
const AGING_DATA = ${JSON.stringify(aging)};
const PILE_DATA = ${JSON.stringify(piles)};

window.addEventListener('load', () => {
  if (typeof Chart === 'undefined') return;

  const agingLabels = Object.keys(AGING_DATA);
  const agingValues = Object.values(AGING_DATA);
  const agingColors = ['#0a7d3a', '#a36400', '#d97706', '#c2410c', '#a31a1a'];
  new Chart(document.getElementById('aging-chart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: agingLabels,
      datasets: [{
        label: 'Outstanding $',
        data: agingValues,
        backgroundColor: agingColors,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => '$' + (v / 1000).toFixed(0) + 'k' } },
      },
    },
  });

  const pileLabels = Object.keys(PILE_DATA).filter((k) => PILE_DATA[k].count > 0);
  const pileValues = pileLabels.map((k) => PILE_DATA[k].value);
  const pileColors = { Voice: '#c2410c', Flow: '#1d4ed8', Ground: '#15803d', Grants: '#7c2d12', Other: '#5b5b54' };
  new Chart(document.getElementById('pile-chart').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: pileLabels,
      datasets: [{
        data: pileValues,
        backgroundColor: pileLabels.map((k) => pileColors[k]),
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const k = ctx.label;
              const v = PILE_DATA[k];
              return \`\${k}: \${v.count} opps · $\${(v.value / 1000).toFixed(0)}k\`;
            },
          },
        },
      },
    },
  });
});
</script>

</body>
</html>
`;
}

async function main() {
  log('=== ACT Now → HTML ===');
  const data = await fetchAll();
  log(`Receivables: ${data.receivables.length} · BAS Q4 invoices: ${data.bas.q4.length} · Opps: ${data.opps.length} · Actions: ${data.actions.length} · Decisions: ${data.decisions.length} · Drafts: ${data.drafts.length} · Plans: ${data.plans.total}`);
  const html = renderHtml(data);
  try { mkdirSync(OUT_DIR, { recursive: true }); } catch {}
  writeFileSync(OUT, html, 'utf-8');
  const sizeKb = (Buffer.byteLength(html) / 1024).toFixed(1);
  log(`✓ Wrote ${relative(REPO_ROOT, OUT)} (${sizeKb} KB)`);
  log(`  Open: open ${relative(process.cwd(), OUT)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
