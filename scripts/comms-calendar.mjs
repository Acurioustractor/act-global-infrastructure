#!/usr/bin/env node
/**
 * Unified content calendar — the comms scheduling ENGINE + Notion VIEW sync.
 *
 * Implements the locked plan's Q5: per-audience cadence + candidate threshold.
 * For each newsletter audience it computes, from live Supabase data:
 *   - last sent edition  (newsletter_drafts, status='sent')
 *   - next due date      (last sent + intervalDays, or due-now if never sent)
 *   - candidates ready   (status='include' candidates for the audience since last sent)
 *   - status             (Ready | Under threshold | Not due yet | Event-triggered)
 *   - recommended action (the drafter command, or "Skip — N/min")
 *
 * Reads:  config/comms-cadence.json, newsletter_drafts, newsletter_candidates
 * Writes: (default) nothing — prints a report.
 *         --sync-notion : upserts one row per audience into the Notion
 *                         "Comms Content Calendar" DB (commsContentCalendar).
 *         --run-brand   : if brand is due AND ready, runs the brand drafter for
 *                         the current fortnight slug (per-recipient stays manual).
 *
 * Usage:
 *   node scripts/comms-calendar.mjs                 # report only (read-only)
 *   node scripts/comms-calendar.mjs --sync-notion   # + push the 4 rows to Notion
 *   node scripts/comms-calendar.mjs --run-brand      # + fire a due+ready brand edition
 *
 * PM2 cron (proposed): 40 7 * * *  (after newsletter-candidates-to-notion at 7:35)
 *
 * Plan: 2026-05-28-unified-content-calendar
 *       act-communication-pipeline-2026-05-23-locked (Q5)
 */

import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { getSupabase } from './lib/newsletter-drafter.mjs';

const args = process.argv.slice(2);
const syncNotion = args.includes('--sync-notion');
const runBrand = args.includes('--run-brand');

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CADENCE_PATH = `${ROOT}config/comms-cadence.json`;
const NOTION_IDS_PATH = `${ROOT}config/notion-database-ids.json`;

const supabase = getSupabase();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATE / PERIOD HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DAY_MS = 24 * 60 * 60 * 1000;
const today = new Date();
const isoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

// Australian financial year + quarter (FY starts 1 Jul). May 2026 → Q4-FY26.
function auFinancialQuarter(date) {
  const m = date.getMonth(); // 0-11
  const y = date.getFullYear();
  const fy = m >= 6 ? y + 1 : y; // Jul (6) onward belongs to next FY
  const q = m >= 6 ? Math.floor((m - 6) / 3) + 1 : Math.floor((m + 6) / 3) + 1;
  return { q, fy: String(fy).slice(-2) };
}

// Suggested edition-period slug for the recommended drafter command.
function suggestPeriod(audienceKey, date) {
  const y = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  if (audienceKey === 'brand') return `${y}-${mm}-${date.getDate() <= 15 ? 'A' : 'B'}`;
  if (audienceKey === 'partner') return `${y}-${mm}`;
  if (audienceKey === 'funder') {
    const { q, fy } = auFinancialQuarter(date);
    return `Q${q}-FY${fy}`;
  }
  return `${y}-${mm}`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PER-AUDIENCE COMPUTATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function lastSentAt(audienceKey) {
  const { data } = await supabase
    .from('newsletter_drafts')
    .select('sent_at')
    .eq('audience', audienceKey)
    .eq('status', 'sent')
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.sent_at || null;
}

// audiences IS NULL XOR NOT NULL partitions the rows, so manual + auto counts
// never overlap — summing them is safe.
async function countIncludeCandidates(audienceKey, sinceDate) {
  const base = () =>
    supabase
      .from('newsletter_candidates')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'include')
      .gte('event_date', sinceDate);

  const { count: manual = 0 } = await base().contains('audiences', [audienceKey]);
  const { count: auto = 0 } = await base().is('audiences', null).contains('auto_audiences', [audienceKey]);
  return (manual || 0) + (auto || 0);
}

async function computeAudience(key, cfg) {
  const sentAt = await lastSentAt(key);
  const isEvent = cfg.mode === 'event' || !cfg.intervalDays;
  const sinceDate = isoDate(sentAt) || '2026-01-01';
  const candidatesReady = await countIncludeCandidates(key, sinceDate);

  let nextDue = null;
  let status;
  let action;

  if (isEvent || !cfg.drafter) {
    status = cfg.drafter ? 'Event-triggered' : 'Event-triggered (no drafter)';
    action = cfg.drafter
      ? 'Fires on storyteller event'
      : `Not built — ${candidatesReady} candidate(s) waiting`;
  } else {
    nextDue = sentAt ? addDays(new Date(sentAt), cfg.intervalDays) : new Date(today);
    const dueNow = nextDue.getTime() <= today.getTime();
    if (!dueNow) {
      status = 'Not due yet';
      action = `Next due ${isoDate(nextDue)}`;
    } else if (candidatesReady >= cfg.minCandidates) {
      status = 'Ready';
      const period = suggestPeriod(key, today);
      action = cfg.mode === 'per-audience'
        ? `node ${cfg.drafter} ${period}`
        : `node ${cfg.drafter} <recipient> ${period}`;
    } else {
      status = 'Under threshold';
      action = `Skip — ${candidatesReady}/${cfg.minCandidates} candidates`;
    }
  }

  return {
    key,
    label: cfg.label,
    cadence: cfg.cadence,
    mode: cfg.mode,
    lastSent: isoDate(sentAt),
    nextDue: isoDate(nextDue),
    candidatesReady,
    threshold: cfg.minCandidates,
    status,
    action,
    drafter: cfg.drafter || '(not built)',
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTION SYNC  (raw fetch, mirrors scripts/sync-candidates-to-notion.mjs)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const NOTION_TOKEN = process.env.NOTION_MIRROR_TOKEN;

let lastNotionAt = 0;
async function notionFetch(path, init = {}, attempt = 0) {
  const dt = Date.now() - lastNotionAt;
  if (dt < 350) await new Promise((r) => setTimeout(r, 350 - dt));
  lastNotionAt = Date.now();
  let r;
  try {
    r = await fetch(`${NOTION_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
  } catch (netErr) {
    if (attempt < 4) {
      await new Promise((res) => setTimeout(res, 1000 * 2 ** attempt));
      return notionFetch(path, init, attempt + 1);
    }
    throw netErr;
  }
  if ((r.status >= 500 || r.status === 429) && attempt < 4) {
    await new Promise((res) => setTimeout(res, 1000 * 2 ** attempt));
    return notionFetch(path, init, attempt + 1);
  }
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Notion ${r.status} ${path}: ${body.slice(0, 300)}`);
  }
  return r.json();
}

function rowToNotionProperties(row) {
  return {
    Audience: { title: [{ text: { content: row.label } }] },
    'Next due': { date: row.nextDue ? { start: row.nextDue } : null },
    Cadence: { select: { name: row.cadence } },
    Mode: { select: { name: row.mode } },
    'Last sent': { date: row.lastSent ? { start: row.lastSent } : null },
    'Candidates ready': { number: row.candidatesReady },
    Threshold: { number: row.threshold },
    Status: { select: { name: row.status } },
    'Recommended action': { rich_text: [{ text: { content: row.action.slice(0, 1900) } }] },
    Drafter: { rich_text: [{ text: { content: row.drafter } }] },
    'Synced at': { date: { start: new Date().toISOString() } },
  };
}

function resolveCalendarDbId() {
  let id = process.env.NOTION_COMMS_CONTENT_CALENDAR_DB_ID;
  if (!id && existsSync(NOTION_IDS_PATH)) {
    id = JSON.parse(readFileSync(NOTION_IDS_PATH, 'utf8')).commsContentCalendar;
  }
  return id;
}

async function syncToNotion(rows) {
  if (!NOTION_TOKEN) throw new Error('Missing NOTION_MIRROR_TOKEN');
  const DB = resolveCalendarDbId();
  if (!DB) {
    throw new Error(
      'Missing commsContentCalendar DB id — set NOTION_COMMS_CONTENT_CALENDAR_DB_ID '
      + 'or add { "commsContentCalendar": "<db-id>" } to config/notion-database-ids.json',
    );
  }
  for (const row of rows) {
    const found = await notionFetch(`/databases/${DB}/query`, {
      method: 'POST',
      body: JSON.stringify({ filter: { property: 'Audience', title: { equals: row.label } }, page_size: 1 }),
    });
    const props = rowToNotionProperties(row);
    if (found.results[0]) {
      await notionFetch(`/pages/${found.results[0].id}`, { method: 'PATCH', body: JSON.stringify({ properties: props }) });
      console.log(`   ↻ updated ${row.label}`);
    } else {
      await notionFetch('/pages', { method: 'POST', body: JSON.stringify({ parent: { database_id: DB }, properties: props }) });
      console.log(`   + created ${row.label}`);
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function main() {
  if (!existsSync(CADENCE_PATH)) throw new Error(`comms-cadence.json missing at ${CADENCE_PATH}`);
  const cadence = JSON.parse(readFileSync(CADENCE_PATH, 'utf8'));

  console.log(`\n━━━ Comms content calendar — ${isoDate(today)} ━━━\n`);

  const rows = [];
  for (const [key, cfg] of Object.entries(cadence.audiences)) {
    rows.push(await computeAudience(key, cfg));
  }

  // Report
  const pad = (s, n) => String(s ?? '—').padEnd(n);
  console.log(
    pad('Audience', 12) + pad('Cadence', 16) + pad('Last sent', 12)
    + pad('Next due', 12) + pad('Ready', 8) + pad('Status', 22) + 'Action',
  );
  console.log('─'.repeat(120));
  for (const r of rows) {
    console.log(
      pad(r.label, 12) + pad(r.cadence, 16) + pad(r.lastSent, 12)
      + pad(r.nextDue, 12) + pad(`${r.candidatesReady}/${r.threshold}`, 8)
      + pad(r.status, 22) + r.action,
    );
  }
  console.log('');

  if (syncNotion) {
    console.log('📤 Syncing to Notion Comms Content Calendar...');
    await syncToNotion(rows);
    console.log('✓ Notion sync complete.\n');
  }

  if (runBrand) {
    const brand = rows.find((r) => r.key === 'brand');
    if (brand?.status === 'Ready') {
      const period = suggestPeriod('brand', today);
      console.log(`🚀 Brand edition due + ready — running drafter for ${period}...\n`);
      execSync(`node scripts/draft-brand-newsletter.mjs ${period}`, { stdio: 'inherit', cwd: ROOT });
    } else {
      console.log(`⏭  --run-brand: brand not due+ready (status: ${brand?.status}). No action.\n`);
    }
  }
}

main().catch((e) => {
  console.error('comms-calendar failed:', e);
  process.exit(1);
});
