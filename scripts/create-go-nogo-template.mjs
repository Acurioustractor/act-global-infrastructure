#!/usr/bin/env node
/**
 * Create a Go/No-Go decision template page in the Notion Actions DB.
 * This becomes a reusable template for all grant Go/No-Go decisions.
 *
 * Run once: node scripts/create-go-nogo-template.mjs
 */
import { Client } from '@notionhq/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const dbIds = JSON.parse(readFileSync(join(__dirname, '../config/notion-database-ids.json'), 'utf8'));
const ACTIONS_DB = dbIds.actions;

console.log('Creating Go/No-Go template in Actions DB...');

const page = await notion.pages.create({
  parent: { database_id: ACTIONS_DB },
  properties: {
    'Action Item': { title: [{ text: { content: 'Go/No-Go Decision Template' } }] },
    'Type': { select: { name: 'Grant' } },
    'Status': { status: { name: 'Not started' } },
  },
  children: [
    // Header
    {
      object: 'block',
      type: 'heading_2',
      heading_2: { rich_text: [{ text: { content: 'Grant Go/No-Go Decision' } }] },
    },
    // Grant details callout
    {
      object: 'block',
      type: 'callout',
      callout: {
        icon: { emoji: '💰' },
        rich_text: [{ text: { content: 'Grant: [Name]\nFunder: [Organisation]\nAmount: $[X]\nDeadline: [Date]\nReadiness: [X]%' } }],
      },
    },
    // Divider
    { object: 'block', type: 'divider', divider: {} },
    // GO criteria heading
    {
      object: 'block',
      type: 'heading_3',
      heading_3: { rich_text: [{ text: { content: '✅ GO Criteria' } }] },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'Aligned to an active ACT project' } }], checked: false },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'Amount justifies the effort (> $2K or strategic value)' } }], checked: false },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'We meet eligibility requirements' } }], checked: false },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'Have all required documents ready (or can get them in time)' } }], checked: false },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'Enough time before deadline (> 7 days or simple application)' } }], checked: false },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'Writer/owner available this week' } }], checked: false },
    },
    // NO-GO criteria heading
    {
      object: 'block',
      type: 'heading_3',
      heading_3: { rich_text: [{ text: { content: '🚫 NO-GO Signals' } }] },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'Deadline < 7 days AND readiness < 80%' } }], checked: false },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'No capacity this month (competing grants take priority)' } }], checked: false },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'Requires DGR status we don\'t have' } }], checked: false },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'Doesn\'t align with any current project or strategic direction' } }], checked: false },
    },
    // Divider
    { object: 'block', type: 'divider', divider: {} },
    // Decision section
    {
      object: 'block',
      type: 'heading_3',
      heading_3: { rich_text: [{ text: { content: '🎯 Decision' } }] },
    },
    {
      object: 'block',
      type: 'callout',
      callout: {
        icon: { emoji: '📋' },
        rich_text: [{ text: { content: 'DECISION: GO / NO-GO / DEFER\n\nRationale: [One sentence explaining why]\n\nIf GO:\n- Owner: [Who writes it]\n- Draft due: [Date]\n- Submit by: [Date]\n\nIf DEFER:\n- Revisit date: [When to reconsider]\n- What needs to change: [Condition]' } }],
      },
    },
    // Divider
    { object: 'block', type: 'divider', divider: {} },
    // Assets checklist
    {
      object: 'block',
      type: 'heading_3',
      heading_3: { rich_text: [{ text: { content: '📎 Required Assets' } }] },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'Organisation description' } }], checked: false },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'Project description / scope' } }], checked: false },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'Budget breakdown' } }], checked: false },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'Letters of support' } }], checked: false },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'ABN / registration certificates' } }], checked: false },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'Insurance certificate of currency' } }], checked: false },
    },
    {
      object: 'block',
      type: 'to_do',
      to_do: { rich_text: [{ text: { content: 'Impact evidence / case studies' } }], checked: false },
    },
  ],
});

console.log(`Created template page: ${page.url}`);
console.log(`Page ID: ${page.id}`);
console.log('\nTo use: Open this page in Notion → ⋯ menu → "Save as template"');
console.log('Then every new Go/No-Go action can use this template.');
