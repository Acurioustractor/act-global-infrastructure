#!/usr/bin/env node
/**
 * Setup Notion Node Map Database
 *
 * Creates a "Mukurtu Node Map" database in Notion for tracking
 * the distributed archive network across communities.
 *
 * Also creates a "Partnership Sprint Board" database for
 * 2-week sprint planning across partnership threads.
 *
 * Usage:
 *   node scripts/setup-notion-node-map.mjs                    # Create databases
 *   node scripts/setup-notion-node-map.mjs --seed             # + seed initial nodes
 *   node scripts/setup-notion-node-map.mjs --dry-run          # Preview only
 */

import { Client } from '@notionhq/client';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SEED = args.includes('--seed');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const configPath = join(__dirname, '..', 'config', 'notion-database-ids.json');
const notionDbIds = JSON.parse(readFileSync(configPath, 'utf-8'));

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

// ============================================
// Mukurtu Node Map — Database Schema
// ============================================

const NODE_MAP_PROPERTIES = {
  'Community': { title: {} },
  'Status': {
    select: {
      options: [
        { name: 'Scoping', color: 'gray' },
        { name: 'Champion Identified', color: 'blue' },
        { name: 'Technical Assessment', color: 'purple' },
        { name: 'Setup', color: 'orange' },
        { name: 'Live', color: 'green' },
        { name: 'Sustained', color: 'green' },
      ],
    },
  },
  'Champion': { rich_text: {} },
  'Champion Contact': { email: {} },
  'Region': {
    select: {
      options: [
        { name: 'Queensland', color: 'red' },
        { name: 'Northern Territory', color: 'orange' },
        { name: 'New South Wales', color: 'blue' },
        { name: 'National', color: 'purple' },
      ],
    },
  },
  'Technical Readiness': {
    select: {
      options: [
        { name: 'Not Assessed', color: 'gray' },
        { name: 'No Infrastructure', color: 'red' },
        { name: 'Basic Internet', color: 'orange' },
        { name: 'Server Ready', color: 'yellow' },
        { name: 'Mukurtu Installed', color: 'green' },
      ],
    },
  },
  'Partnership Thread': {
    multi_select: {
      options: [
        { name: 'ILA Grant', color: 'red' },
        { name: 'World Tour', color: 'blue' },
        { name: 'JusticeHub', color: 'purple' },
        { name: 'Harvest', color: 'green' },
        { name: 'Mukurtu', color: 'orange' },
      ],
    },
  },
  'Funding Source': { rich_text: {} },
  'Notes': { rich_text: {} },
  'GHL Pipeline Stage': { rich_text: {} },
  'Last Updated': { date: {} },
};

// ============================================
// Partnership Sprint Board — Database Schema
// ============================================

const SPRINT_BOARD_PROPERTIES = {
  'Task': { title: {} },
  'Status': {
    select: {
      options: [
        { name: 'Backlog', color: 'gray' },
        { name: 'This Sprint', color: 'blue' },
        { name: 'In Progress', color: 'orange' },
        { name: 'Waiting', color: 'yellow' },
        { name: 'Done', color: 'green' },
      ],
    },
  },
  'Thread': {
    select: {
      options: [
        { name: 'ILA Grant', color: 'red' },
        { name: 'World Tour', color: 'blue' },
        { name: 'Mukurtu', color: 'orange' },
        { name: 'JusticeHub', color: 'purple' },
        { name: 'Harvest', color: 'green' },
        { name: 'ACT', color: 'gray' },
        { name: 'Empathy Ledger', color: 'pink' },
      ],
    },
  },
  'Priority': {
    select: {
      options: [
        { name: 'Urgent', color: 'red' },
        { name: 'High', color: 'orange' },
        { name: 'Medium', color: 'yellow' },
        { name: 'Low', color: 'gray' },
      ],
    },
  },
  'Sprint': { rich_text: {} },
  'Due': { date: {} },
  'Owner': { rich_text: {} },
  'Notes': { rich_text: {} },
};

// ============================================
// Initial Node Data
// ============================================

const INITIAL_NODES = [
  {
    community: 'Palm Island',
    status: 'Scoping',
    champion: 'Rachel Atkinson (PICC CEO)',
    region: 'Queensland',
    technicalReadiness: 'Not Assessed',
    threads: ['ILA Grant', 'Mukurtu'],
    funding: 'ILA 2026-27 ($515,900 over 36 months) — Year 3 deliverable',
    notes: 'First fully integrated node. Manbarra language + Elder journey archives. PICC as lead org. Mukurtu implementation in collaboration with Tranby/Jumbunna.',
  },
  {
    community: 'Stradbroke Island (Minjerribah)',
    status: 'Scoping',
    champion: 'Shaun Fisher (Quandamooka)',
    region: 'Queensland',
    technicalReadiness: 'Not Assessed',
    threads: ['Harvest', 'Mukurtu'],
    funding: 'Unfunded — scope via Harvest connection',
    notes: 'Quandamooka sea country knowledge. Connection through The Harvest (Shaun\'s oyster farming). Potential second node after Palm Island proves model.',
  },
  {
    community: 'Mount Druitt',
    status: 'Scoping',
    champion: 'TBD',
    region: 'New South Wales',
    technicalReadiness: 'Not Assessed',
    threads: ['JusticeHub', 'Mukurtu'],
    funding: 'Unfunded — scope with JusticeHub',
    notes: 'Urban Aboriginal community archive. JusticeHub crossover — justice stories + data ownership. Strong UTS/Jumbunna proximity (Kirsten Thorpe).',
  },
  {
    community: 'Alice Springs (Mparntwe)',
    status: 'Scoping',
    champion: 'Bloomfield Family (Oonchiumpa)',
    region: 'Northern Territory',
    technicalReadiness: 'Not Assessed',
    threads: ['World Tour', 'ILA Grant', 'Mukurtu'],
    funding: 'ILA Year 2 journey destination. Separate node funding TBD.',
    notes: 'World Tour stop. Oonchiumpa youth diversion partnership. Arrernte knowledge. Cross-community exchange with Palm Island Elders.',
  },
  {
    community: 'Tennant Creek',
    status: 'Scoping',
    champion: 'TBD — connect via Nyinkka Nyunyu',
    region: 'Northern Territory',
    technicalReadiness: 'Mukurtu Installed',
    threads: ['Mukurtu'],
    funding: 'Existing (Wumpurrarni-kari archive operational)',
    notes: 'Origin of Mukurtu (Warumungu language: "dilly bag"). Wumpurrarni-kari archive at Nyinkka Nyunyu already live. Connection to source. Potential mentor node for new communities.',
  },
];

// Initial sprint tasks
const INITIAL_SPRINT_TASKS = [
  {
    task: 'Submit ILA grant application',
    status: 'This Sprint',
    thread: 'ILA Grant',
    priority: 'Urgent',
    sprint: 'Feb 24 — Mar 9',
    due: '2026-03-14',
    owner: 'Ben + Rachel',
    notes: 'Due March 16 11:30pm AEDT. PICC submits via SmartyGrants. Need letters of support from Bloomfield, Tranby/Jumbunna, Tablelands partner.',
  },
  {
    task: 'Reach out to Kirsten Thorpe (Jumbunna/UTS)',
    status: 'This Sprint',
    thread: 'Mukurtu',
    priority: 'Urgent',
    sprint: 'Feb 24 — Mar 9',
    due: '2026-02-28',
    owner: 'Ben',
    notes: 'Letter of support for ILA grant. Frame broader Mukurtu node network vision. She leads Australian Mukurtu Hub.',
  },
  {
    task: 'Confirm Bloomfield family letter of support',
    status: 'This Sprint',
    thread: 'ILA Grant',
    priority: 'High',
    sprint: 'Feb 24 — Mar 9',
    due: '2026-03-07',
    owner: 'Ben',
    notes: 'For ILA grant. Confirms hosting at Atnarpa, Year 2 cultural exchange, Oonchiumpa youth involvement.',
  },
  {
    task: 'Set up GHL partnership tags + Mukurtu pipeline',
    status: 'This Sprint',
    thread: 'ACT',
    priority: 'Medium',
    sprint: 'Feb 24 — Mar 9',
    due: '2026-03-02',
    owner: 'Ben',
    notes: 'Create pipeline in GHL UI, run setup-partnership-infrastructure.mjs --apply --all',
  },
  {
    task: 'World Tour partner outreach — Africa stops',
    status: 'Backlog',
    thread: 'World Tour',
    priority: 'Medium',
    sprint: '',
    due: '2026-05-01',
    owner: 'Ben',
    notes: 'South Africa, Botswana, Uganda, Kenya. Use outreach templates. Confirm anchor partners per stop.',
  },
  {
    task: 'Scope Stradbroke Island node with Shaun Fisher',
    status: 'Backlog',
    thread: 'Mukurtu',
    priority: 'Low',
    sprint: '',
    due: '',
    owner: 'Ben',
    notes: 'After Palm Island model is proven. Initial conversation at Harvest March 7 event.',
  },
];

// ============================================
// Create Database
// ============================================

async function createDatabase(parentPageId, title, properties, icon) {
  log(`Creating database: "${title}"`);

  if (DRY_RUN) {
    log(`  DRY RUN — would create "${title}" with ${Object.keys(properties).length} properties`);
    return null;
  }

  const response = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ type: 'text', text: { content: title } }],
    properties,
    ...(icon ? { icon: { type: 'emoji', emoji: icon } } : {}),
  });

  log(`  Created: ${response.id}`);
  return response.id;
}

// ============================================
// Seed Node Map
// ============================================

async function seedNodeMap(databaseId) {
  log('\nSeeding Mukurtu Node Map...');

  for (const node of INITIAL_NODES) {
    log(`  Adding: ${node.community}`);

    if (DRY_RUN) continue;

    const properties = {
      'Community': { title: [{ text: { content: node.community } }] },
      'Status': { select: { name: node.status } },
      'Champion': { rich_text: [{ text: { content: node.champion } }] },
      'Region': { select: { name: node.region } },
      'Technical Readiness': { select: { name: node.technicalReadiness } },
      'Partnership Thread': {
        multi_select: node.threads.map(t => ({ name: t })),
      },
      'Funding Source': { rich_text: [{ text: { content: node.funding } }] },
      'Notes': { rich_text: [{ text: { content: node.notes } }] },
      'Last Updated': { date: { start: new Date().toISOString().split('T')[0] } },
    };

    await notion.pages.create({
      parent: { database_id: databaseId },
      properties,
    });

    // Rate limit
    await new Promise(r => setTimeout(r, 350));
  }
}

// ============================================
// Seed Sprint Board
// ============================================

async function seedSprintBoard(databaseId) {
  log('\nSeeding Partnership Sprint Board...');

  for (const task of INITIAL_SPRINT_TASKS) {
    log(`  Adding: ${task.task}`);

    if (DRY_RUN) continue;

    const properties = {
      'Task': { title: [{ text: { content: task.task } }] },
      'Status': { select: { name: task.status } },
      'Thread': { select: { name: task.thread } },
      'Priority': { select: { name: task.priority } },
      'Owner': { rich_text: [{ text: { content: task.owner } }] },
      'Notes': { rich_text: [{ text: { content: task.notes } }] },
    };

    if (task.sprint) {
      properties['Sprint'] = { rich_text: [{ text: { content: task.sprint } }] };
    }
    if (task.due) {
      properties['Due'] = { date: { start: task.due } };
    }

    await notion.pages.create({
      parent: { database_id: databaseId },
      properties,
    });

    await new Promise(r => setTimeout(r, 350));
  }
}

// ============================================
// Main
// ============================================

async function main() {
  log('=== Notion Partnership Databases Setup ===');
  if (DRY_RUN) log('DRY RUN MODE');

  // Find parent page — use operationsHub as parent
  const parentPageId = notionDbIds.operationsHub;
  if (!parentPageId) {
    log('ERROR: No operationsHub page ID in config/notion-database-ids.json');
    log('Provide a Notion page ID where databases should be created.');
    process.exit(1);
  }

  log(`Parent page: ${parentPageId}`);

  // Create Node Map database
  let nodeMapId = notionDbIds.mukurtuNodeMap;
  if (!nodeMapId) {
    nodeMapId = await createDatabase(
      parentPageId,
      'Mukurtu Node Map',
      NODE_MAP_PROPERTIES,
      '🗺️'
    );

    if (nodeMapId) {
      notionDbIds.mukurtuNodeMap = nodeMapId;
      writeFileSync(configPath, JSON.stringify(notionDbIds, null, 2) + '\n');
      log(`  Saved mukurtuNodeMap ID to config`);
    }
  } else {
    log(`Node Map database already exists: ${nodeMapId}`);
  }

  // Create Sprint Board database
  let sprintBoardId = notionDbIds.partnershipSprintBoard;
  if (!sprintBoardId) {
    sprintBoardId = await createDatabase(
      parentPageId,
      'Partnership Sprint Board',
      SPRINT_BOARD_PROPERTIES,
      '🏃'
    );

    if (sprintBoardId) {
      notionDbIds.partnershipSprintBoard = sprintBoardId;
      writeFileSync(configPath, JSON.stringify(notionDbIds, null, 2) + '\n');
      log(`  Saved partnershipSprintBoard ID to config`);
    }
  } else {
    log(`Sprint Board database already exists: ${sprintBoardId}`);
  }

  // Seed if requested
  if (SEED) {
    if (nodeMapId) await seedNodeMap(nodeMapId);
    if (sprintBoardId) await seedSprintBoard(sprintBoardId);
  } else {
    log('\nRun with --seed to populate initial data');
  }

  log('\nDone!');
  if (DRY_RUN) log('💡 Run without --dry-run to create databases');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
