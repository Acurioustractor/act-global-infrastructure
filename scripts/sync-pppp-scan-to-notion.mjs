#!/usr/bin/env node
/**
 * sync-pppp-scan-to-notion.mjs — spawn (or pre-fill) the week's PPPP scan page.
 *
 * The Monday ritual (Ben + Nic, 45 min) starts from evidence, not blank lines:
 * each P gets its system feed gathered automatically the morning of the scan.
 *   People  → unified-orbit-worklist.csv + field-decisions.jsonl (inner-ring cooling)
 *   Project → xero_transactions last 7d grouped by project_code (committed spend)
 *   Place   → NO FEED, ON PURPOSE (Country is not a data source)
 *   Process → pm2 process health + the gmail-spine freshness canary
 *   Product → git log last 7d (what actually shipped)
 *
 * Canonical logic: wiki/concepts/pppp-operating-logic.md
 * Notion stack:    field guide page → weekly run pages as children.
 *
 * Modes:
 *   node scripts/sync-pppp-scan-to-notion.mjs                  # cron: create this week's run page (idempotent per ISO week)
 *   node scripts/sync-pppp-scan-to-notion.mjs --prefill <id>   # append feeds to an EXISTING page (used for Run #1)
 *   node scripts/sync-pppp-scan-to-notion.mjs --dry-run        # print feeds, no Notion write
 *
 * Cron: Monday 7:45am AEST (entry pppp-scan in ecosystem.config.cjs) — before
 * the 8am weekly cockpit so the scan page is waiting when Ben + Nic sit down.
 * State: .pppp-scan-state.json (gitignored, like .xero-sync-state.json) → runs: { <monday-iso>: { n, pageId } }.
 *        The cron must never dirty a tracked file — a stash/checkout over uncommitted state would lose the
 *        idempotency record and double-create a run page. parentPage stays in config/notion-database-ids.json.
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));

const REPO_ROOT = join(__dirname, '..');
const CONFIG_PATH = join(REPO_ROOT, 'config', 'notion-database-ids.json');
const DRY_RUN = process.argv.includes('--dry-run');
const PREFILL_IDX = process.argv.indexOf('--prefill');
const PREFILL_PAGE = PREFILL_IDX > -1 ? process.argv[PREFILL_IDX + 1] : null;

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const sb = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
const PARENT_PAGE = cfg.ppppScan?.parentPage || '1553e9c2-4bf3-49d2-960a-d77070f467cb';
const STATE_PATH = join(REPO_ROOT, '.pppp-scan-state.json');
const loadState = () => (existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, 'utf8')) : { runs: {} });
const saveState = (s) => writeFileSync(STATE_PATH, JSON.stringify(s, null, 2) + '\n');
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;
const ageDays = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

// The scan's Monday anchor, in LOCAL (Brisbane) date terms. Mon–Fri → this
// week's Monday (the cron fires Monday 7:45am, so cron = same day). Sat/Sun →
// roll FORWARD: a weekend run preps the coming Monday's scan, not last week's.
function mondayOf(d = new Date()) {
  const x = new Date(d);
  const sinceMon = (x.getDay() + 6) % 7; // Mon=0 … Sun=6
  x.setDate(x.getDate() + (sinceMon >= 5 ? 7 - sinceMon : -sinceMon));
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

// ─── block builders ──────────────────────────────────────────────────────
const rt = (text, ann = {}) => ({ type: 'text', text: { content: String(text).slice(0, 2000) }, annotations: ann });
const h2 = (text) => ({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rt(text)] } });
const h3 = (text) => ({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt(text)] } });
const para = (parts) => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: Array.isArray(parts) ? parts : [rt(parts)] } });
const bullet = (parts) => ({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: Array.isArray(parts) ? parts : [rt(parts)] } });
const todo = (text) => ({ object: 'block', type: 'to_do', to_do: { rich_text: [rt(text)], checked: false } });
const callout = (parts, emoji, color = 'gray_background') => ({
  object: 'block', type: 'callout',
  callout: { rich_text: Array.isArray(parts) ? parts : [rt(parts)], icon: { type: 'emoji', emoji }, color },
});
const divider = () => ({ object: 'block', type: 'divider', divider: {} });

// ─── CSV helper (same dialect as field-preread) ──────────────────────────
function parseCSV(t) { const R = []; let r = [], f = '', Q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (Q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else Q = false; } else f += c; } else if (c === '"') Q = true; else if (c === ',') { r.push(f); f = ''; } else if (c === '\n') { r.push(f); R.push(r); r = []; f = ''; } else if (c !== '\r') f += c; } if (f || r.length) { r.push(f); R.push(r); } return R; }
const readCSV = (p) => { const R = parseCSV(readFileSync(p, 'utf8')); const h = R[0]; return R.slice(1).filter((x) => x.length === h.length).map((x) => Object.fromEntries(h.map((k, i) => [k, x[i]]))); };
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

// ─── feeds (each failure-soft: a dead feed becomes one honest line) ──────

async function feedPeople() {
  const out = [];
  try {
    // latest ring per person from the hand-read decisions
    const rings = new Map();
    if (existsSync(join(REPO_ROOT, 'thoughts/shared/field-decisions.jsonl')))
      for (const l of readFileSync(join(REPO_ROOT, 'thoughts/shared/field-decisions.jsonl'), 'utf8').split('\n').filter(Boolean)) {
        try { const d = JSON.parse(l); if (d.ring != null) rings.set(norm(d.name), String(d.ring)); } catch {}
      }
    const rows = readCSV(join(REPO_ROOT, 'thoughts/shared/unified-orbit-worklist.csv'));
    const inner = rows
      .filter((r) => ['5', '15'].includes(rings.get(norm(r.name)) || ''))
      .filter((r) => r.status !== 'community') // community lane never enters the scan as a "cooling" metric
      .map((r) => ({ name: r.name, ring: rings.get(norm(r.name)), days: r.last_contact ? ageDays(r.last_contact) : null }))
      .filter((r) => r.days != null)
      .sort((a, b) => b.days - a.days);
    const cooling = inner.filter((r) => r.days > 14).slice(0, 5);
    out.push(bullet([rt(`Inner rings (5/15) with a last-contact date: ${inner.length} people`, { bold: true })]));
    if (cooling.length) {
      out.push(bullet([rt('Cooling (>14d since contact): ', { bold: true }), rt(cooling.map((c) => `${c.name} (ring ${c.ring}, ${c.days}d)`).join(' · '))]));
    } else {
      out.push(bullet('No inner-ring relationship past 14 days without contact. Soil is watered.'));
    }
    const uncaptured = rows.filter((r) => r.status === 'uncaptured').length;
    if (uncaptured) out.push(bullet(`Uncaptured (known but not in GHL): ${uncaptured} — worth one promotion decision in the sweep`));
  } catch (e) { out.push(bullet(`⚠ People feed failed: ${e.message} — run scripts/build-field-surfaces.mjs first`)); }
  return out;
}

async function feedProject() {
  const out = [];
  try {
    const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    // committed spend last 7d — by type, never by sign. SPEND filter is SERVER-side:
    // filtering client-side after .limit(1000) silently drops rows on a heavy week.
    const { data, error } = await sb.from('xero_transactions')
      .select('project_code,total').eq('type', 'SPEND').gte('date', since).limit(1000);
    if (error) throw new Error(error.message);
    const byCode = {};
    for (const t of data || []) {
      const code = t.project_code || 'untagged';
      byCode[code] = (byCode[code] || 0) + Number(t.total || 0);
    }
    const top = Object.entries(byCode).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (top.length) {
      out.push(bullet([rt(`Committed spend last 7d by project: `, { bold: true }), rt(top.map(([c, v]) => `${c} ${fmt(v)}`).join(' · '))]));
      if (byCode.untagged) out.push(bullet(`⚠ ${fmt(byCode.untagged)} of that is untagged — /tag-transactions before it compounds`));
    } else out.push(bullet('No spend transactions landed in the last 7 days.'));
  } catch (e) { out.push(bullet(`⚠ Project feed failed: ${e.message}`)); }
  out.push(bullet('Opportunities: check the ACT Opportunities DB (stage moves are bidirectional from Notion)'));
  return out;
}

function feedPlace() {
  return [bullet([rt('No system feed, on purpose. ', { bold: true }), rt('What did Witta, Palm Island, Mparntwe, Mt Isa, Brisbane say this week — in person, on the phone, on Country? Write it by hand or leave it empty honestly.')])];
}

function feedProcess() {
  const out = [];
  try {
    // 132-proc fleet → jlist is several MB; "stopped" is the NORMAL idle state for
    // one-shot cron scripts, so only "errored" counts as sick.
    const procs = JSON.parse(execSync('pm2 jlist', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'ignore'] }));
    const sick = procs.filter((p) => p.pm2_env?.status === 'errored');
    out.push(bullet([rt(`PM2: ${procs.length} processes, `, { bold: true }), rt(sick.length ? `${sick.length} ERRORED: ${sick.map((p) => p.name).join(', ')}` : 'none errored')]));
  } catch { out.push(bullet('⚠ PM2 not reachable from this run — check ./dev cron')); }
  try {
    const fresh = JSON.parse(readFileSync(join(REPO_ROOT, 'thoughts/shared/field-freshness.json'), 'utf8'));
    out.push(bullet(fresh.stale_days > 2
      ? `🔴 Gmail spine ${fresh.stale_days} days stale — the People feed above is lying to you, fix the spine first`
      : `Gmail spine fresh (last ingest ${String(fresh.gmail_max_created).slice(0, 10)})`));
  } catch { out.push(bullet('⚠ No spine-freshness canary found')); }
  return out;
}

function feedProduct() {
  const out = [];
  try {
    const count = execSync('git log --since="7 days ago" --oneline | wc -l', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
    const subjects = execSync('git log --since="7 days ago" --pretty=%s | head -6', { cwd: REPO_ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    out.push(bullet([rt(`Shipped this week: ${count} commits (this repo). `, { bold: true }), rt('Latest:')]));
    for (const s of subjects) out.push(bullet(s.slice(0, 140)));
  } catch (e) { out.push(bullet(`⚠ Product feed failed: ${e.message}`)); }
  out.push(bullet('Anything heading public this week? consent-check gates BEFORE it leaves the building.'));
  return out;
}

// ─── assemble the feeds section ──────────────────────────────────────────
async function feedBlocks() {
  const t = new Date();
  const today = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  return [
    divider(),
    h2(`📡 Feeds — auto-gathered ${today}`),
    para([rt('Evidence in, before opinions. Generated by ', { italic: true }), rt('scripts/sync-pppp-scan-to-notion.mjs', { code: true }), rt(' — a dead feed shows as one honest ⚠ line, never silence.', { italic: true })]),
    h3('🔴 People — the soil'), ...(await feedPeople()),
    h3('🟠 Project — the seeds'), ...(await feedProject()),
    h3('🟡 Place — Country sets the pace'), ...feedPlace(),
    h3('🟣 Process — the spine'), ...feedProcess(),
    h3('🟢 Product — the artefacts'), ...feedProduct(),
  ];
}

// ─── the ritual skeleton for cron-created run pages ──────────────────────
function ritualBlocks(runN, weekISO) {
  return [
    callout([rt('Timebox 45 minutes, Ben + Nic. ', { bold: true }), rt('Success = fewer commitments, 2–3 named decisions, every live row owned, one proof memo. Feeds below are evidence — the sweep turns them into choices.')], '🔭', 'blue_background'),
    h2('1 · The sweep (15 min) — what changed · what’s warm · what’s stuck, per P'),
    para([rt('Work the board: ', {}), rt('All Ps — Operating Board', {}),]),
    h2('2 · The few bets (max 3) — bet · which P · why now · owner · done looks like'),
    todo('Bet 1: '), todo('Bet 2: '), todo('Bet 3: '),
    h2('3 · Decisions needed'),
    todo(' '), todo(' '),
    h2('4 · Stop carrying'),
    bullet(' '),
    h2('5 · Proof memo — three lines, written before leaving the room'),
    para(' '),
  ];
}

// ─── main ────────────────────────────────────────────────────────────────
const week = mondayOf();

if (DRY_RUN || process.argv.includes('--md')) {
  const blocks = await feedBlocks();
  if (process.argv.includes('--md')) {
    // markdown render — for piping feeds into other surfaces (e.g. MCP connector)
    for (const b of blocks) {
      const t = b[b.type]?.rich_text?.map((r) => r.text.content).join('') || '';
      if (b.type === 'divider') console.log('---');
      else if (b.type === 'heading_2') console.log(`## ${t}`);
      else if (b.type === 'heading_3') console.log(`### ${t}`);
      else if (b.type === 'bulleted_list_item') console.log(`- ${t}`);
      else console.log(t);
    }
  } else {
    log(`DRY RUN — week of ${week}, ${blocks.length} feed blocks:`);
    for (const b of blocks) {
      const t = b[b.type]?.rich_text?.map((r) => r.text.content).join('') || `[${b.type}]`;
      console.log(`  ${b.type.padEnd(22)} ${t.slice(0, 110)}`);
    }
  }
  process.exit(0);
}

if (PREFILL_PAGE) {
  // append feeds to an existing run page (Run #1 path)
  const blocks = await feedBlocks();
  await notion.blocks.children.append({ block_id: PREFILL_PAGE, children: blocks });
  const state = loadState();
  state.runs[week] = state.runs[week] || { n: Object.keys(state.runs).length + 1, pageId: PREFILL_PAGE };
  saveState(state);
  log(`Pre-filled feeds onto page ${PREFILL_PAGE} (registered as week ${week} → cron will not double-create)`);
  process.exit(0);
}

// cron path: create this week's run page, idempotent per ISO week
const state = loadState();
if (state.runs[week]) {
  log(`Run page for week ${week} already exists (${state.runs[week].pageId}) — nothing to do`);
  process.exit(0);
}
const runN = Object.keys(state.runs).length + 1;
const title = `PPPP Weekly Scan — Run #${runN} · Week of ${new Date(week).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`;
const page = await notion.pages.create({
  parent: { page_id: PARENT_PAGE },
  icon: { type: 'emoji', emoji: '🔭' },
  properties: { title: { title: [rt(title)] } },
  children: [...ritualBlocks(runN, week), ...(await feedBlocks())],
});
state.runs[week] = { n: runN, pageId: page.id };
saveState(state);
log(`Created ${title} → ${page.url}`);
