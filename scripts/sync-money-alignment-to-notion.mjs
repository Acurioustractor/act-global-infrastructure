#!/usr/bin/env node
/**
 * Sync money-in + money-out alignment reports to Notion as sub-pages
 * under the ACT Money Framework page.
 *
 * Pages created/updated:
 *   - 💰 Money In Alignment
 *   - 💸 Money Out Alignment
 *
 * Each page reads its corresponding markdown report from
 * thoughts/shared/reports/money-in-alignment-<date>.md and
 * thoughts/shared/reports/money-out-alignment-<date>.md.
 *
 * If the report doesn't exist for today, generates it first.
 *
 * Usage:
 *   node scripts/sync-money-alignment-to-notion.mjs
 */

import { Client } from '@notionhq/client';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const notionDbIdsPath = join(__dirname, '..', 'config', 'notion-database-ids.json');
const notionDbIds = JSON.parse(readFileSync(notionDbIdsPath, 'utf-8'));
const PARENT = notionDbIds.moneyFramework;

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function rt(text, opts = {}) {
  const r = { type: 'text', text: { content: String(text).slice(0, 2000) } };
  if (opts.link) r.text.link = { url: opts.link };
  if (opts.bold || opts.italic || opts.code || opts.color) {
    r.annotations = {};
    if (opts.bold) r.annotations.bold = true;
    if (opts.italic) r.annotations.italic = true;
    if (opts.code) r.annotations.code = true;
    if (opts.color) r.annotations.color = opts.color;
  }
  return r;
}

function markdownToBlocks(md) {
  const blocks = [];
  const lines = md.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [rt(line.slice(2))] } });
    } else if (line.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rt(line.slice(3))] } });
    } else if (line.startsWith('### ')) {
      blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt(line.slice(4))] } });
    } else if (line.startsWith('> ')) {
      blocks.push({ object: 'block', type: 'callout', callout: { rich_text: [rt(line.slice(2))], icon: { type: 'emoji', emoji: '\u{1F4DD}' }, color: 'gray_background' } });
    } else if (line.startsWith('- ')) {
      blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rt(line.slice(2))] } });
    } else if (line.startsWith('|')) {
      // Collect table rows
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].split('|').slice(1, -1).map(c => c.trim());
        if (cells.some(c => c.match(/^-+:?$|^:?-+:?$|^:-+$/))) { i++; continue; } // skip separator
        rows.push(cells);
        i++;
      }
      if (rows.length > 0) {
        const width = rows[0].length;
        blocks.push({
          object: 'block', type: 'table',
          table: {
            table_width: width,
            has_column_header: true,
            has_row_header: false,
            children: rows.map(r => ({
              object: 'block', type: 'table_row',
              table_row: { cells: r.map(c => [rt(c)]) },
            })),
          },
        });
      }
      continue; // already advanced i
    } else if (line === '---') {
      blocks.push({ object: 'block', type: 'divider', divider: {} });
    } else if (line.trim() === '') {
      // skip blank
    } else {
      blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [rt(line)] } });
    }
    i++;
  }
  return blocks;
}

async function ensurePage(key, title, emoji) {
  if (notionDbIds[key]) return notionDbIds[key];
  log(`Creating page: ${title}`);
  const page = await notion.pages.create({
    parent: { type: 'page_id', page_id: PARENT },
    properties: { title: [{ type: 'text', text: { content: title } }] },
    icon: { type: 'emoji', emoji },
  });
  notionDbIds[key] = page.id;
  writeFileSync(notionDbIdsPath, JSON.stringify(notionDbIds, null, 2) + '\n');
  return page.id;
}

async function replaceBody(pageId, blocks) {
  // Delete existing children
  let cursor = undefined;
  const ids = [];
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
    ids.push(...res.results.filter(b => b.type !== "child_database" && b.type !== "child_page").map(b => b.id));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  for (const id of ids) {
    try { await notion.blocks.delete({ block_id: id }); await sleep(100); } catch {}
  }
  // Append new in batches (Notion limit 100/req)
  const batchSize = 50;
  for (let i = 0; i < blocks.length; i += batchSize) {
    await notion.blocks.children.append({
      block_id: pageId,
      children: blocks.slice(i, i + batchSize),
    });
    await sleep(300);
  }
}

async function syncReport(reportPath, pageKey, title, emoji) {
  if (!existsSync(reportPath)) {
    log(`Report missing — generating: ${reportPath}`);
    const script = pageKey === 'moneyInAlignment' ? 'audit-money-in-alignment.mjs' : 'audit-money-out-alignment.mjs';
    execSync(`node ${join(__dirname, script)}`, { stdio: 'inherit' });
  }
  const md = readFileSync(reportPath, 'utf-8');
  const blocks = markdownToBlocks(md);
  log(`Built ${blocks.length} blocks for ${title}`);
  const pageId = await ensurePage(pageKey, title, emoji);
  await replaceBody(pageId, blocks);
  log(`Updated: notion.so/${pageId.replace(/-/g, '')}`);
}

async function main() {
  log('=== Money Alignment → Notion ===');
  if (!PARENT) { log('ERROR: moneyFramework parent not set'); process.exit(1); }

  const date = new Date().toISOString().slice(0, 10);
  const reportsDir = join(__dirname, '..', 'thoughts', 'shared', 'reports');

  await syncReport(
    join(reportsDir, `money-in-alignment-${date}.md`),
    'moneyInAlignment',
    'Money In Alignment',
    '\u{1F4B0}',
  );

  await syncReport(
    join(reportsDir, `money-out-alignment-${date}.md`),
    'moneyOutAlignment',
    'Money Out Alignment',
    '\u{1F4B8}',
  );

  log('Done.');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
