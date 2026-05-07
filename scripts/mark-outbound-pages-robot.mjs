#!/usr/bin/env node
/**
 * One-shot: set 🤖 emoji icon on every outbound-only Notion page.
 *
 * Per wiki/decisions/notion-page-policy.md, outbound-only pages are rebuilt
 * from Supabase / Xero / GHL on every sync. Anything humans type into them
 * is overwritten on the next run. The policy doc says these pages should
 * carry the 🤖 emoji as a visible marker so editors know not to type into
 * them. This script enforces that policy in one pass.
 *
 * Capture pages (Money Sync, Meetings) and bidirectional pages get a
 * different emoji so they're visually distinct.
 *
 * Usage:
 *   node scripts/mark-outbound-pages-robot.mjs              # apply
 *   node scripts/mark-outbound-pages-robot.mjs --dry-run    # preview
 */

import { Client } from '@notionhq/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
await import(join(__dirname, 'lib/load-env.mjs'));

const DRY_RUN = process.argv.includes('--dry-run');
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const cfg = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'notion-database-ids.json'), 'utf-8'));

// Outbound-only pages get 🤖 (no human edits — overwritten by sync).
const OUTBOUND = [
  'moneyFramework',
  'moneyInAlignment', 'moneyOutAlignment',
  'cashForecast', 'cashScenarios', 'kpisPage', 'budgetActual',
  'pilePage_voice', 'pilePage_flow', 'pilePage_ground', 'pilePage_grants',
  'planningRhythm', 'cy26StrategyPlan',
  'weeklyDigest',
  'financeSurfaceDesign', 'dashboardWalkthrough',
];

// Capture / bidirectional pages get 💬 (human-writable).
const CAPTURE = [
  'moneySyncPage',
];

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function setIcon(key, emoji) {
  const id = cfg[key];
  if (!id) return { key, status: 'no-id' };
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    if (page.archived || page.in_trash) return { key, status: 'archived' };
    const currentEmoji = page.icon?.type === 'emoji' ? page.icon.emoji : null;
    if (currentEmoji === emoji) return { key, status: 'already-set', emoji };
    if (DRY_RUN) return { key, status: 'would-set', emoji, was: currentEmoji };
    await notion.pages.update({ page_id: id, icon: { type: 'emoji', emoji } });
    return { key, status: 'set', emoji, was: currentEmoji };
  } catch (e) {
    return { key, status: 'error', error: e.message?.slice(0, 80) };
  }
}

async function main() {
  log(`=== Mark outbound pages 🤖 ${DRY_RUN ? '(dry-run)' : ''} ===`);
  const results = [];
  for (const k of OUTBOUND) {
    const r = await setIcon(k, '🤖');
    results.push(r);
    log(`  ${r.status.padEnd(12)} ${k.padEnd(22)} ${r.emoji || ''} ${r.was ? `(was ${r.was})` : ''} ${r.error || ''}`);
    await sleep(60);
  }
  for (const k of CAPTURE) {
    const r = await setIcon(k, '💬');
    results.push(r);
    log(`  ${r.status.padEnd(12)} ${k.padEnd(22)} ${r.emoji || ''} ${r.was ? `(was ${r.was})` : ''} ${r.error || ''}`);
    await sleep(60);
  }
  const summary = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  log('Summary: ' + JSON.stringify(summary));
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
