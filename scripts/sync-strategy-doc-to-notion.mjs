#!/usr/bin/env node
/**
 * Push the CY26 Money Philosophy + Plan markdown doc to Notion as a sub-page.
 * Re-runnable: replaces page body each time.
 */

import { Client } from '@notionhq/client';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const cfgPath = join(__dirname, '..', 'config', 'notion-database-ids.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
const PARENT = cfg.moneyFramework;
const DOC_PATH = join(__dirname, '..', 'wiki', 'finance', 'cy26-money-philosophy-and-plan.md');

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const rt = (text) => ({ type: 'text', text: { content: String(text).slice(0, 2000) } });

function mdToBlocks(md) {
  const blocks = [];
  const lines = md.split('\n');
  let i = 0;
  // Skip frontmatter
  if (lines[0]?.startsWith('---')) {
    i = 1;
    while (i < lines.length && !lines[i].startsWith('---')) i++;
    i++;
  }
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('# ')) blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [rt(line.slice(2))] } });
    else if (line.startsWith('## ')) blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [rt(line.slice(3))] } });
    else if (line.startsWith('### ')) blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [rt(line.slice(4))] } });
    else if (line.startsWith('> ')) blocks.push({ object: 'block', type: 'callout', callout: { rich_text: [rt(line.slice(2))], icon: { type: 'emoji', emoji: '\u{1F4DD}' }, color: 'gray_background' } });
    else if (line.startsWith('- [ ]')) blocks.push({ object: 'block', type: 'to_do', to_do: { rich_text: [rt(line.slice(6))], checked: false } });
    else if (line.startsWith('- ')) blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [rt(line.slice(2))] } });
    else if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].split('|').slice(1, -1).map(c => c.trim());
        if (cells.some(c => c.match(/^-+:?$|^:?-+:?$/))) { i++; continue; }
        rows.push(cells); i++;
      }
      if (rows.length > 0) {
        blocks.push({
          object: 'block', type: 'table',
          table: {
            table_width: rows[0].length, has_column_header: true, has_row_header: false,
            children: rows.map(r => ({ object: 'block', type: 'table_row', table_row: { cells: r.map(c => [rt(c)]) } })),
          },
        });
      }
      continue;
    }
    else if (/^```/.test(line)) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      blocks.push({ object: 'block', type: 'code', code: { rich_text: [rt(codeLines.join('\n'))], language: 'plain text' } });
    }
    else if (line === '---') blocks.push({ object: 'block', type: 'divider', divider: {} });
    else if (line.trim() === '') { /* skip */ }
    else blocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [rt(line)] } });
    i++;
  }
  return blocks;
}

async function main() {
  log('=== Strategy doc → Notion ===');
  const md = readFileSync(DOC_PATH, 'utf-8');
  const blocks = mdToBlocks(md);
  log(`Built ${blocks.length} blocks`);

  let pageId = cfg.cy26StrategyPlan;
  if (!pageId) {
    const page = await notion.pages.create({
      parent: { type: 'page_id', page_id: PARENT },
      properties: { title: [{ type: 'text', text: { content: 'CY26 Money Philosophy + Plan' } }] },
      icon: { type: 'emoji', emoji: '\u{1F4DC}' },
    });
    pageId = page.id;
    cfg.cy26StrategyPlan = pageId;
    writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
    log(`Created: ${pageId}`);
  }

  // Replace body
  let cursor;
  const ids = [];
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 });
    ids.push(...res.results.filter(b => b.type !== "child_database" && b.type !== "child_page").map(b => b.id));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  for (const id of ids) {
    try { await notion.blocks.delete({ block_id: id }); await sleep(100); } catch {}
  }
  for (let k = 0; k < blocks.length; k += 50) {
    await notion.blocks.children.append({ block_id: pageId, children: blocks.slice(k, k + 50) });
    await sleep(300);
  }
  log(`Done. Open: notion.so/${pageId.replace(/-/g, '')}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
