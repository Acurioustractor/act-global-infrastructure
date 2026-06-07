#!/usr/bin/env node
/**
 * Weekly narrative digest — Sonnet 4.6 turns the raw money-command numbers
 * into "the 5 things you need to know this week" in ACT (Curtis) voice.
 *
 * Reads same sources as money-command-digest.mjs (coverage, drift queue,
 * incoming 90d, cash, lifetime ledger) PLUS the delta vs the snapshot from
 * 7 days ago (not yesterday), then asks Sonnet to surface what changed
 * that matters, in plain language, no AI tells.
 *
 * Output:
 *   - stdout (always)
 *   - wiki/cockpit/weekly-narrative-YYYY-MM-DD.md (committed artifact)
 *   - Telegram (if --telegram and chat creds set)
 *
 * Usage:
 *   node scripts/narrate-weekly-digest.mjs              # print only
 *   node scripts/narrate-weekly-digest.mjs --telegram   # also send Telegram
 *   node scripts/narrate-weekly-digest.mjs --no-write   # skip wiki/ write
 *   node scripts/narrate-weekly-digest.mjs --model haiku  # cheaper
 */

import './lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { trackedClaudeCompletion } from './lib/llm-client.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(ROOT, 'thoughts', 'shared', 'data', 'money-command-snapshots');
const WIKI_DIR = path.join(ROOT, 'wiki', 'cockpit');
const FY_START = '2025-07-01';
const SCRIPT_NAME = 'narrate-weekly-digest';

const args = process.argv.slice(2);
const SEND_TELEGRAM = args.includes('--telegram');
const NO_WRITE = args.includes('--no-write');
const MODEL_TAG = valueAfter('--model') || 'sonnet';
const MODEL =
  MODEL_TAG === 'haiku' ? 'claude-haiku-4-5'
  : MODEL_TAG === 'opus' ? 'claude-opus-4-7'
  : 'claude-sonnet-4-6';

function valueAfter(flag) {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_SHARED_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = (process.env.TELEGRAM_AUTHORIZED_USERS || '').split(',')[0]?.trim();

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 });

const STAGE_PROBABILITY = [
  [/(won|invoiced|harvest|graduation)/i, 1.00],
  [/(submitted|growth|negotiation)/i, 0.70],
  [/(proposed|invited|application.in.progress)/i, 0.50],
  [/(germination|scoping|needs.assessment)/i, 0.25],
  [/(grant.opportunity.identified)/i, 0.00],
  [/(identified|signal|new.lead|new.inquiry|outreach)/i, 0.10],
  [/(lost|cancelled|dropped)/i, 0.00],
];
function stageProb(stage) {
  if (!stage) return 0.10;
  for (const [re, p] of STAGE_PROBABILITY) if (re.test(stage)) return p;
  return 0.10;
}

async function loadCoverage() {
  const countTagged = async (table, filters = (q) => q, taggedColumn = 'project_code') => {
    const total = await filters(supabase.from(table).select('*', { count: 'exact', head: true }));
    const tagged = await filters(supabase.from(table).select('*', { count: 'exact', head: true }).not(taggedColumn, 'is', null));
    return { total: total.count ?? 0, tagged: tagged.count ?? 0 };
  };
  const [transactions, invoices, opportunities] = await Promise.all([
    countTagged('xero_transactions', (q) => q.gte('date', FY_START)),
    countTagged('xero_invoices', (q) => q.eq('type', 'ACCREC').gte('date', FY_START)),
    countTagged('ghl_opportunities', (q) => q.eq('status', 'open')),
  ]);
  return { transactions, invoices, opportunities };
}

async function loadIncoming() {
  const [stateRes, oppsRes] = await Promise.all([
    supabase.from('v_project_money_state').select('receivables, grants_in_flight'),
    supabase.from('ghl_opportunities').select('monetary_value, stage_name').eq('status', 'open'),
  ]);
  const state = stateRes.data ?? [];
  const opps = oppsRes.data ?? [];
  const receivables = state.reduce((s, r) => s + Number(r.receivables ?? 0), 0);
  const grantsInFlight = state.reduce((s, r) => s + Number(r.grants_in_flight ?? 0), 0);
  const pipelineWeighted = opps.reduce((s, o) => s + Number(o.monetary_value ?? 0) * stageProb(o.stage_name), 0);
  return { receivables, grantsInFlight, pipelineWeighted, projected90d: receivables + pipelineWeighted + grantsInFlight };
}

async function loadCash() {
  const { data } = await supabase.from('xero_bank_accounts').select('current_balance, status, name');
  if (!data || !data.length) return { total: 0, accounts: [] };
  const live = data.filter((a) => a.status !== 'ARCHIVED');
  return {
    total: live.reduce((s, a) => s + Number(a.current_balance ?? 0), 0),
    accounts: live.map((a) => ({ name: a.name, balance: Number(a.current_balance ?? 0) })),
  };
}

async function loadDriftTop3() {
  const { data: invs } = await supabase
    .from('xero_invoices')
    .select('contact_name, total, invoice_number')
    .gte('date', FY_START)
    .is('project_code', null)
    .eq('type', 'ACCREC')
    .order('total', { ascending: false })
    .limit(3);
  const { data: opps } = await supabase
    .from('ghl_opportunities')
    .select('name, monetary_value')
    .eq('status', 'open')
    .is('project_code', null)
    .order('monetary_value', { ascending: false, nullsFirst: false })
    .limit(3);
  return { invs: invs ?? [], opps: opps ?? [] };
}

async function loadOverdueAR() {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('xero_invoices')
    .select('contact_name, invoice_number, total, amount_due, due_date, date')
    .eq('type', 'ACCREC')
    .eq('status', 'AUTHORISED')
    .gt('amount_due', 0)
    .lt('due_date', today)
    .order('amount_due', { ascending: false })
    .limit(5);
  return data ?? [];
}

async function loadWeekDeltas() {
  if (!existsSync(SNAPSHOT_DIR)) return null;
  const files = readdirSync(SNAPSHOT_DIR).filter((f) => f.endsWith('.json')).sort();
  if (!files.length) return null;
  const target = new Date();
  target.setDate(target.getDate() - 7);
  const targetIso = target.toISOString().slice(0, 10);
  const lastWeekFile = files.find((f) => f.startsWith(targetIso) || f >= targetIso);
  if (!lastWeekFile) return null;
  try {
    return JSON.parse(readFileSync(path.join(SNAPSHOT_DIR, lastWeekFile), 'utf8'));
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `You are A Curious Tractor's money narrator. You write the weekly digest in Ian Curtis voice — architectural, not decorative.

Method (every paragraph):
1. Name the room (the bank account, the bill, the spreadsheet, the meeting room).
2. Name the body (the cash, the receivables, the receipts pile).
3. Load the abstract noun (runway, coverage, capacity) by putting it in the room against the body — let the institutional word break.
4. Stop the line. No "because", "which demonstrates", "highlighting", "reflecting".

Forbidden words (AI tells — reject on sight): delve, crucial, pivotal, vital, significant, tapestry, landscape, underscore, highlight (verb), showcase, leverage, foster, cultivate, empower, nestled, in the heart of, at the forefront of, world-class, robust, vibrant, dynamic, thriving, navigate (as metaphor).

Forbidden constructions: "not just X, but Y", "X represents Y", "stands as a testament", "plays a pivotal role", em dashes (— or –). Use periods, commas, colons.

Plainness test: could a fourteen-year-old in Doomadgee say this without translation? If not, cut.

Format the output as:

## This week

One paragraph. Plain. The state of things.

## Five things to know

1. **<headline>**: one or two sentences. Name the body, name the number, stop the line.
2. ...
3. ...
4. ...
5. ...

## Action this week

3 bullets max. Each begins with a verb (chase, file, void, attach, tag, call).

Total length: 250-400 words. Tighter is better.`;

function buildUserPrompt(data) {
  const lines = [];
  lines.push(`Date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push(`# Cash and incoming`);
  lines.push(`Cash in bank: ${fmt(data.cash.total)} across ${data.cash.accounts.length} accounts.`);
  if (data.cash.accounts.length) {
    data.cash.accounts.slice(0, 5).forEach((a) => {
      lines.push(`  ${a.name}: ${fmt(a.balance)}`);
    });
  }
  lines.push('');
  lines.push(`Projected 90-day incoming: ${fmt(data.incoming.projected90d)}`);
  lines.push(`  Receivables (AR): ${fmt(data.incoming.receivables)}`);
  lines.push(`  Pipeline (weighted): ${fmt(data.incoming.pipelineWeighted)}`);
  lines.push(`  Grants in flight: ${fmt(data.incoming.grantsInFlight)}`);
  lines.push('');

  if (data.weekAgo) {
    lines.push(`# Week-over-week deltas`);
    if (data.weekAgo.cash != null) lines.push(`  Cash 7d ago: ${fmt(data.weekAgo.cash)}  →  Δ ${fmt(data.cash.total - data.weekAgo.cash)}`);
    if (data.weekAgo.incoming?.projected90d != null) {
      lines.push(`  Incoming 90d 7d ago: ${fmt(data.weekAgo.incoming.projected90d)}  →  Δ ${fmt(data.incoming.projected90d - data.weekAgo.incoming.projected90d)}`);
    }
    lines.push('');
  }

  const c = data.coverage;
  lines.push(`# Coverage (tagged / total)`);
  lines.push(`  Xero transactions (FY26): ${c.transactions.tagged}/${c.transactions.total} (${(c.transactions.tagged * 100 / Math.max(c.transactions.total, 1)).toFixed(1)}%)`);
  lines.push(`  Xero invoices (FY26 ACCREC): ${c.invoices.tagged}/${c.invoices.total} (${(c.invoices.tagged * 100 / Math.max(c.invoices.total, 1)).toFixed(1)}%)`);
  lines.push(`  Open opportunities: ${c.opportunities.tagged}/${c.opportunities.total} (${(c.opportunities.tagged * 100 / Math.max(c.opportunities.total, 1)).toFixed(1)}%)`);
  lines.push('');

  if (data.overdueAR.length) {
    lines.push(`# Overdue AR (top 5 by amount due)`);
    data.overdueAR.forEach((inv) => {
      lines.push(`  ${inv.invoice_number} ${inv.contact_name} ${fmt(inv.amount_due)} (due ${inv.due_date})`);
    });
    lines.push('');
  }

  if (data.drift.invs.length || data.drift.opps.length) {
    lines.push(`# Drift queue (untagged top 3)`);
    data.drift.invs.forEach((inv) => lines.push(`  invoice  ${inv.invoice_number} ${inv.contact_name} ${fmt(inv.total)}`));
    data.drift.opps.forEach((opp) => lines.push(`  opportunity  ${opp.name} ${fmt(opp.monetary_value)}`));
    lines.push('');
  }

  lines.push(`Write the weekly narrative in the required format. Focus on what changed this week. Name names, name amounts. No filler.`);
  return lines.join('\n');
}

async function sendTelegram(text) {
  if (!TG_TOKEN || !TG_CHAT) {
    console.log('[telegram] creds not set, skipping');
    return false;
  }
  // Telegram has a 4096 char limit per message; chunk if needed.
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= 4000) {
      chunks.push(remaining);
      break;
    }
    const slice = remaining.slice(0, 4000);
    const lastNewline = slice.lastIndexOf('\n');
    const cut = lastNewline > 2000 ? lastNewline : 4000;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }
  for (const chunk of chunks) {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: chunk, parse_mode: 'Markdown', disable_web_page_preview: true }),
    });
    if (!res.ok) {
      console.warn(`[telegram] ${res.status} ${(await res.text()).slice(0, 200)}`);
      return false;
    }
  }
  return true;
}

async function main() {
  console.log('━'.repeat(72));
  console.log('Weekly narrative digest');
  console.log('━'.repeat(72));
  console.log(`Model: ${MODEL}  •  Telegram: ${SEND_TELEGRAM ? 'yes' : 'no'}`);
  console.log();
  console.log('Loading data…');

  const [coverage, incoming, cash, drift, overdueAR, weekAgo] = await Promise.all([
    loadCoverage(),
    loadIncoming(),
    loadCash(),
    loadDriftTop3(),
    loadOverdueAR(),
    loadWeekDeltas(),
  ]);

  const data = { coverage, incoming, cash, drift, overdueAR, weekAgo };
  const userPrompt = buildUserPrompt(data);

  console.log('Asking Sonnet to narrate…');
  const narrative = await trackedClaudeCompletion(userPrompt, SCRIPT_NAME, {
    model: MODEL,
    system: SYSTEM_PROMPT,
    maxTokens: 900,
    operation: 'narrate_weekly',
  });

  console.log();
  console.log('━'.repeat(72));
  console.log(narrative);
  console.log('━'.repeat(72));
  console.log();

  const today = new Date().toISOString().slice(0, 10);

  if (!NO_WRITE) {
    if (!existsSync(WIKI_DIR)) mkdirSync(WIKI_DIR, { recursive: true });
    const outPath = path.join(WIKI_DIR, `weekly-narrative-${today}.md`);
    const front = [
      '---',
      `title: Weekly money narrative — ${today}`,
      `status: published`,
      `generated_by: scripts/narrate-weekly-digest.mjs`,
      `model: ${MODEL}`,
      `cash_in_bank: ${cash.total}`,
      `incoming_90d: ${incoming.projected90d}`,
      `coverage_xero_txns: ${(coverage.transactions.tagged * 100 / Math.max(coverage.transactions.total, 1)).toFixed(1)}%`,
      '---',
      '',
    ].join('\n');
    writeFileSync(outPath, front + narrative + '\n');
    console.log(`Wrote ${outPath}`);
  }

  if (SEND_TELEGRAM) {
    const tgMessage = `📰 *Weekly money narrative* — ${today}\n\n${narrative}`;
    const sent = await sendTelegram(tgMessage);
    if (sent) console.log('Telegram: sent');
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
