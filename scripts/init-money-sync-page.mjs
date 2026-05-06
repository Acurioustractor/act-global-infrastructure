#!/usr/bin/env node
/**
 * One-shot: create the "Money Sync Page" in Notion.
 * A free-form working page where Ben + Nic capture questions, ideas, decisions
 * during the week. Friday digest reads from this page (TBD).
 */

import { Client } from '@notionhq/client';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const path = join(__dirname, '..', 'config', 'notion-database-ids.json');
const ids = JSON.parse(readFileSync(path, 'utf-8'));

if (ids.moneySyncPage) { console.log('Already exists:', ids.moneySyncPage); process.exit(0); }

const r = (text) => ({ type: 'text', text: { content: text } });
const blocks = [
  { object: 'block', type: 'heading_2', heading_2: { rich_text: [r('💬 Money Sync — Questions & Ideas')] } },
  { object: 'block', type: 'callout', callout: {
    rich_text: [r('Free-form working page. Add questions, ideas, decisions throughout the week. Friday Digest reviews everything captured here.')],
    icon: { type: 'emoji', emoji: '✏️' }, color: 'gray_background',
  }},
  { object: 'block', type: 'heading_3', heading_3: { rich_text: [r('❓ Open questions for Standard Ledger')] } },
  { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [r('(add questions here as they arise)')] } },
  { object: 'block', type: 'heading_3', heading_3: { rich_text: [r('❓ Open questions for R&D consultant')] } },
  { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [r('(R&D-related questions)')] } },
  { object: 'block', type: 'heading_3', heading_3: { rich_text: [r('💡 Ideas to explore')] } },
  { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [r('(strategic ideas, "what if we...", new opportunities)')] } },
  { object: 'block', type: 'heading_3', heading_3: { rich_text: [r('📌 Decisions made (log)')] } },
  { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [r('(date — decision — context — owner)')] } },
  { object: 'block', type: 'heading_3', heading_3: { rich_text: [r('🔗 Related docs')] } },
  { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [r('Philosophy + CY26 plan: wiki/finance/cy26-money-philosophy-and-plan.md')] } },
  { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [r('Money framework: wiki/finance/act-money-framework.md')] } },
];

(async () => {
  const page = await notion.pages.create({
    parent: { type: 'page_id', page_id: ids.moneyFramework },
    properties: { title: [{ type: 'text', text: { content: 'Money Sync — Questions & Ideas' } }] },
    icon: { type: 'emoji', emoji: '💬' },
    children: blocks,
  });
  ids.moneySyncPage = page.id;
  writeFileSync(path, JSON.stringify(ids, null, 2) + '\n');
  console.log('Created:', page.id);
  console.log('URL: notion.so/' + page.id.replace(/-/g, ''));
})().catch(e => { console.error(e); process.exit(1); });
