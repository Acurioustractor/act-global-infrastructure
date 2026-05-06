#!/usr/bin/env node
/**
 * Multi-period planning page → Notion sub-page.
 *
 * Five timeframe sections, each pulling the right data for that cadence:
 *   1. THIS WEEK — open action items + Friday digest highlights + cash forecast next 7d
 *   2. THIS MONTH — KPI delta vs last month + budget tracking + open Standard Ledger Q&A
 *   3. THIS HALF (6 mo) — cutover countdown + R&D claim status + cash scenarios out 6mo
 *   4. THIS YEAR (12 mo) — pile mix vs target + cash scenarios all 4 + outstanding decisions
 *   5. 5-YEAR HORIZON — Voice/Flow/Ground evolution targets + CGT exit positioning + entity structure
 *
 * Cron: Mon 9:20am AEST.
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const cfgPath = join(__dirname, '..', 'config', 'notion-database-ids.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
const PARENT = cfg.moneyFramework;

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;

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

const notionUrl = (id) => id ? `https://www.notion.so/${id.replace(/-/g, '')}` : '#';

// ============================================
// Data
// ============================================

async function fetchData() {
  const today = new Date();
  const weekFromNow = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const monthAgo = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);

  const [
    { data: bankAccts },
    { data: openOpps },
    { data: receivables7d },
    { data: paidLastMonth },
    { data: pile },
    { data: rdSpend },
  ] = await Promise.all([
    supabase.from('xero_bank_accounts').select('name, current_balance').eq('type', 'BANK').eq('status', 'ACTIVE'),
    supabase.from('ghl_opportunities').select('name, monetary_value, pile, pipeline_name').eq('status', 'open').order('monetary_value', { ascending: false, nullsFirst: false }).limit(10),
    supabase.from('xero_invoices').select('invoice_number, contact_name, amount_due, due_date').eq('type', 'ACCREC').eq('status', 'AUTHORISED').gt('amount_due', 0).gte('due_date', today.toISOString().slice(0, 10)).lte('due_date', weekFromNow).order('due_date', { ascending: true }),
    supabase.from('xero_invoices').select('invoice_number, contact_name, amount_paid').eq('type', 'ACCREC').gt('amount_paid', 0).gte('updated_at', monthAgo).order('amount_paid', { ascending: false }),
    supabase.from('xero_invoices').select('total, project_code, income_type').eq('type', 'ACCREC').eq('entity_code', 'ACT-ST').gte('date', '2025-07-01'),
    supabase.from('xero_transactions').select('total, rd_eligible').eq('type', 'SPEND').eq('status', 'AUTHORISED').gte('date', '2025-07-01'),
  ]);

  const tradingBal = (bankAccts || [])
    .filter(a => /everyday|maximiser/i.test(a.name))
    .reduce((s, a) => s + Number(a.current_balance || 0), 0);
  const openPipelineTotal = (openOpps || []).reduce((s, o) => s + Number(o.monetary_value || 0), 0);
  const expected7d = (receivables7d || []).reduce((s, i) => s + Number(i.amount_due || 0), 0);
  const paidLastMonthTotal = (paidLastMonth || []).reduce((s, i) => s + Number(i.amount_paid || 0), 0);
  const totalSpend = (rdSpend || []).reduce((s, t) => s + Number(t.total || 0), 0);
  const rdEligibleTotal = (rdSpend || []).filter(t => t.rd_eligible).reduce((s, t) => s + Number(t.total || 0), 0);

  // Pile mix
  const PILE_CONFIG = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'pile-mapping.json'), 'utf-8'));
  const piles = { Voice: 0, Flow: 0, Ground: 0, Grants: 0 };
  for (const i of (pile || [])) {
    const p = i.income_type === 'grant' ? 'Grants' : (PILE_CONFIG.projects[i.project_code] || 'Other');
    if (piles[p] !== undefined) piles[p] += Number(i.total || 0);
  }
  const pileTotal = Object.values(piles).reduce((s, v) => s + v, 0);

  const cutover = new Date('2026-06-30');
  const daysToCutover = Math.ceil((cutover - today) / 86400000);

  return {
    tradingBal, openPipelineTotal, expected7d, paidLastMonthTotal,
    rdEligibleTotal, totalSpend,
    piles, pileTotal,
    openOpps: openOpps || [], receivables7d: receivables7d || [],
    paidLastMonth: paidLastMonth || [], daysToCutover,
  };
}

// ============================================
// Build sections
// ============================================

function buildWeekly(d) {
  const blocks = [];
  blocks.push(h2('🗓️ THIS WEEK — operational rhythm'));
  blocks.push(callout([
    rt('What needs done in the next 7 days. Cash expected: ', { bold: true }),
    rt(fmt(d.expected7d), { bold: true, color: 'green' }),
    rt(`. Open action items: `),
    rt('see Action Items DB', { link: notionUrl(cfg.actionItems), color: 'blue' }),
  ], '\u{2705}', 'gray_background'));

  if (d.receivables7d.length > 0) {
    blocks.push(h3(`💰 Cash expected this week (${d.receivables7d.length})`));
    for (const r of d.receivables7d.slice(0, 8)) {
      blocks.push(bullet([
        rt(`${fmt(r.amount_due)}  `, { bold: true, color: 'green' }),
        rt(r.invoice_number || '—'),
        rt(`  · ${(r.contact_name || '').slice(0, 40)}`),
        rt(`  · due ${r.due_date}`, { color: 'gray' }),
      ]));
    }
  } else {
    blocks.push(para([rt('(no invoices due this week)', { italic: true, color: 'gray' })]));
  }

  blocks.push(h3('📋 This-week checklist'));
  for (const item of [
    'Review Action Items DB → tackle any Critical/High priority',
    'Open Cash Forecast → confirm no tight weeks coming',
    'Check Friday Digest from last Friday → action anything still hanging',
    'Add new questions to Money Sync (Q&A) as they arise',
  ]) {
    blocks.push({ object: 'block', type: 'to_do', to_do: { rich_text: [rt(item)], checked: false } });
  }
  return blocks;
}

function buildMonthly(d) {
  const blocks = [];
  blocks.push(h2('📆 THIS MONTH — KPI + budget rhythm'));
  blocks.push(callout([
    rt('Last 30 days: ', { bold: true }),
    rt(`${fmt(d.paidLastMonthTotal)} paid via ${d.paidLastMonth.length} invoices`, { color: 'green' }),
    rt('. Bank: ', { color: 'gray' }),
    rt(fmt(d.tradingBal), { bold: true }),
    rt('  ·  Pipeline: '), rt(fmt(d.openPipelineTotal), { bold: true }),
  ], '\u{1F4C8}', 'gray_background'));

  if (d.paidLastMonth.length > 0) {
    blocks.push(h3('💵 Top wins (last 30 days)'));
    for (const i of d.paidLastMonth.slice(0, 5)) {
      blocks.push(bullet([
        rt(`${fmt(i.amount_paid)}  `, { bold: true, color: 'green' }),
        rt(i.invoice_number || '—'),
        rt(`  · ${(i.contact_name || '').slice(0, 40)}`, { color: 'gray' }),
      ]));
    }
  }

  blocks.push(h3('📋 This-month checklist'));
  for (const item of [
    'Review KPIs page — runway moving in right direction?',
    'Review Budget vs Actual — any project blown its budget?',
    'Process all PAID Standard Ledger Q&A → mark Closed',
    'Update Decisions Log with any major calls made',
    'Check pile mix on framework page — drifting from FY27 target?',
  ]) {
    blocks.push({ object: 'block', type: 'to_do', to_do: { rich_text: [rt(item)], checked: false } });
  }

  return blocks;
}

function buildHalfYear(d) {
  const blocks = [];
  blocks.push(h2('📅 THIS HALF (6 months) — cutover + R&D rhythm'));

  blocks.push(callout([
    rt(`${d.daysToCutover} days to cutover. R&D-eligible spend FY26: `, { bold: true }),
    rt(fmt(d.rdEligibleTotal), { bold: true, color: 'green' }),
    rt(` (forecast refund @43.5% = ${fmt(d.rdEligibleTotal * 0.435)})`),
  ], '\u{231A}', d.daysToCutover < 60 ? 'orange_background' : 'gray_background'));

  blocks.push(h3('🎯 Six-month milestones'));
  blocks.push(bullet([rt('30 Jun 2026: ', { bold: true }), rt('Cutover. Nic\'s ST closes. ACT Pty starts trading.')]));
  blocks.push(bullet([rt('1 Jul 2026: ', { bold: true }), rt('First Pty payroll run ($24K/mo). 328-G election filed.')]));
  blocks.push(bullet([rt('Aug 2026: ', { bold: true }), rt('AusIndustry FY26 R&D registration submitted.')]));
  blocks.push(bullet([rt('Sep-Dec 2026: ', { bold: true }), rt('R&D refund lands ($180-220K).')]));
  blocks.push(bullet([rt('Sep 2026: ', { bold: true }), rt('Final Nic ST tax return lodged.')]));
  blocks.push(bullet([rt('Dec 2026: ', { bold: true }), rt('First Pty H1 trust distribution opportunity.')]));

  blocks.push(h3('📋 Half-yearly review questions'));
  for (const item of [
    'Has Standard Ledger drafted 328-G election forms?',
    'Has R&D consultant been engaged?',
    'Are trust deeds confirmed to allow streaming?',
    'Have Cameron + Pollyanna distribution channels been chosen?',
    'Is CivicGraph Commercial pipeline scaffolded in GHL?',
    'Has IPP-JV conversation with Oonchiumpa started?',
  ]) {
    blocks.push({ object: 'block', type: 'to_do', to_do: { rich_text: [rt(item)], checked: false } });
  }

  return blocks;
}

function buildYearly(d) {
  const blocks = [];
  blocks.push(h2('📅 THIS YEAR (12 months) — pile mix + strategic rhythm'));

  // Pile mix
  blocks.push(h3('🎯 FY26 pile mix vs FY27 target'));
  const TARGETS = { Voice: 0.077, Flow: 0.558, Ground: 0.058, Grants: 0.385 };
  for (const [pile, total] of Object.entries(d.piles)) {
    const actual = total / (d.pileTotal || 1);
    const target = TARGETS[pile] || 0;
    const gap = (actual - target) * 100;
    blocks.push(bullet([
      rt(`${pile.padEnd(8)}  `, { bold: true }),
      rt(`${fmt(total).padEnd(12)}`),
      rt(`  ${(actual * 100).toFixed(0)}% actual / ${(target * 100).toFixed(0)}% target  `),
      rt(`${gap > 0 ? '+' : ''}${gap.toFixed(0)}pts`, { color: Math.abs(gap) > 10 ? (gap < 0 ? 'red' : 'orange') : 'green' }),
    ]));
  }

  blocks.push(h3('🎯 12-month strategic checkpoints'));
  blocks.push(bullet([rt('FY27 revenue target: ', { bold: true }), rt('$2.6M (Voice $200K + Flow $1.45M + Ground $150K + Grants $1M)')]));
  blocks.push(bullet([rt('Honest target (rebuttal §2.1): ', { bold: true }), rt('55/35/8/2 commercial/grants/R&D/other in FY27, glide to 60/25/10/5 by FY29')]));
  blocks.push(bullet([rt('Africa Empathy Ledger trip: ', { bold: true }), rt('R&D-aligned, technical report by Oct')]));
  blocks.push(bullet([rt('Snow Foundation INV-0321 $132K: ', { bold: true }), rt('paid by Jun 2026')]));

  blocks.push(h3('📋 Yearly review questions'));
  for (const item of [
    'Has the Voice/Flow/Ground rebalance happened (rebuttal §2.1)?',
    'Was the FY26 R&D refund collected? Reinvested where?',
    'Has CivicGraph hit first paying customer (or made the call to defer)?',
    'Has Goods IPP-JV with Oonchiumpa launched?',
    'Are Cameron + Pollyanna receiving income through the chosen channel?',
    'Is the trust distribution resolution being signed by 30 June?',
  ]) {
    blocks.push({ object: 'block', type: 'to_do', to_do: { rich_text: [rt(item)], checked: false } });
  }

  return blocks;
}

function buildFiveYear() {
  const blocks = [];
  blocks.push(h2('🔭 5-YEAR HORIZON (FY27 → FY31) — entity + asset rhythm'));

  blocks.push(callout([
    rt('Five years out: ACT Pty trading + Harvest sub + Farm entity + IPP JV + bucket companies. CivicGraph exit positioning. Trust beneficiary distributions stable. R&D claim cycle mature.', { italic: true }),
  ], '\u{1F52E}', 'purple_background'));

  blocks.push(h3('🎯 Year-by-year strategic shape'));
  blocks.push(bullet([rt('FY27 (now-Jul 2027): ', { bold: true }), rt('Cutover settles. Pty hits stride. CivicGraph commercial decision (Option A/B/C). First Pty trust distribution.')]));
  blocks.push(bullet([rt('FY28 (Jul 2027-Jun 2028): ', { bold: true }), rt('Harvest sub incorporated if grant-funded ground work scales. IPP JV operational. CivicGraph 5-10 paying customers if Option B.')]));
  blocks.push(bullet([rt('FY29 (Jul 2028-Jun 2029): ', { bold: true }), rt('Pile mix at 60/25/10/5. Voice = scaled storytelling motion (not just PICC). $4M+ revenue.')]));
  blocks.push(bullet([rt('FY30 (Jul 2029-Jun 2030): ', { bold: true }), rt('Farm entity separated. Bucket companies under trusts active. CivicGraph IP carve-out for cleaner exit.')]));
  blocks.push(bullet([rt('FY31 (Jul 2030-Jun 2031): ', { bold: true }), rt('CivicGraph exit ready (Y5 target $4-10M EV). Small Business CGT concessions stack ready ($1M tax saving). $5.5M+ total revenue.')]));

  blocks.push(h3('🎯 Multi-year asset positioning'));
  blocks.push(bullet([rt('CGT concessions: ', { bold: true }), rt('annual evidence pack of CivicGraph as active asset. Aggregated turnover + MNAV tests tracked yearly.')]));
  blocks.push(bullet([rt('Trust wealth: ', { bold: true }), rt('annual distributions build long-term family wealth via Knight + Marchesi trusts. Bucket co retention.')]));
  blocks.push(bullet([rt('Founder personal: ', { bold: true }), rt('$120K/yr salary + $14.4K/yr super each. By FY31, super balance ~$72K each (5×14.4K).')]));
  blocks.push(bullet([rt('R&D refund cycle: ', { bold: true }), rt('annual ~$200K refund (FY26 baseline), growing as R&D-eligible spend grows. Compounds asset base.')]));
  blocks.push(bullet([rt('Entity stack at exit: ', { bold: true }), rt('ACT Pty (trading) + Harvest sub + Farm entity + IPP JV + Knight bucket co + Marchesi bucket co + A Kind Tractor (charity, optional DGR pathway).')]));

  blocks.push(h3('📋 Annual 5-year review (do this each Dec or June)'));
  for (const item of [
    'Update CY plan (cy26-money-philosophy-and-plan.md) for next CY',
    'Review entity structure — any new entities to add (Harvest sub, Farm, IPP JV)?',
    'Review CGT concession positioning — active asset evidence current?',
    'Review trust distribution patterns — beneficiaries + amounts still right?',
    'Review pile evolution — Voice/Flow/Ground still the right framing?',
    'Review CivicGraph commercial trajectory — exit timeline still Y5?',
  ]) {
    blocks.push({ object: 'block', type: 'to_do', to_do: { rich_text: [rt(item)], checked: false } });
  }

  return blocks;
}

async function main() {
  log('=== Planning rhythm sync ===');
  const d = await fetchData();
  log(`Bank ${fmt(d.tradingBal)}, pipeline ${fmt(d.openPipelineTotal)}, ${d.daysToCutover}d cutover`);

  const blocks = [];
  blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [rt('🧭 Planning Rhythm — multi-period view')] } });
  blocks.push(callout([
    rt('Five timeframes in one place: weekly, monthly, half-yearly, yearly, 5-year. Auto-refreshes Mon 9:20am AEST. Use the daily check-in for THIS WEEK; use monthly review for THIS MONTH; etc.'),
  ], '\u{1F5DD}\u{FE0F}', 'gray_background'));
  blocks.push(divider());

  blocks.push(...buildWeekly(d));
  blocks.push(divider());
  blocks.push(...buildMonthly(d));
  blocks.push(divider());
  blocks.push(...buildHalfYear(d));
  blocks.push(divider());
  blocks.push(...buildYearly(d));
  blocks.push(divider());
  blocks.push(...buildFiveYear());

  log(`Built ${blocks.length} blocks`);

  let pageId = cfg.planningRhythm;
  if (!pageId) {
    log('Creating Planning Rhythm page...');
    const page = await notion.pages.create({
      parent: { type: 'page_id', page_id: PARENT },
      properties: { title: [{ type: 'text', text: { content: 'Planning Rhythm — multi-period' } }] },
      icon: { type: 'emoji', emoji: '\u{1F9ED}' },
    });
    pageId = page.id;
    cfg.planningRhythm = pageId;
    writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
  }

  // Replace body (skip child pages/databases)
  let cursor; const ids = [];
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
    ids.push(...res.results.filter(b => b.type !== 'child_database' && b.type !== 'child_page').map(b => b.id));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  for (const id of ids) { try { await notion.blocks.delete({ block_id: id }); await sleep(80); } catch {} }
  for (let k = 0; k < blocks.length; k += 50) {
    await notion.blocks.children.append({ block_id: pageId, children: blocks.slice(k, k + 50) });
    await sleep(300);
  }
  log(`Done. Open: notion.so/${pageId.replace(/-/g, '')}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
