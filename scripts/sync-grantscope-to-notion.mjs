#!/usr/bin/env node

/**
 * Sync GrantScope Pipeline → Notion Grant Pipeline Tracker
 *
 * Pulls grants tagged with pipeline_stage from GrantScope's database and
 * syncs them to Notion's Grant Pipeline Tracker, Actions DB (Playbook 6 gates),
 * and Planning Calendar (deadline entries).
 *
 * Flow:
 *   1. Fetch tagged grants from GrantScope Supabase
 *   2. Fetch existing Notion pages (dedup by GrantScope ID)
 *   3. Create/update Grant Pipeline Tracker pages
 *   4. Auto-create Actions (Playbook 6 gates) for new grants
 *   5. Create Planning Calendar entries for grants with deadlines
 *
 * Usage:
 *   node scripts/sync-grantscope-to-notion.mjs              # Full sync
 *   node scripts/sync-grantscope-to-notion.mjs --dry-run     # Preview without writing
 *   node scripts/sync-grantscope-to-notion.mjs --verbose      # Detailed logging
 *   node scripts/sync-grantscope-to-notion.mjs --skip-actions # Sync grants only
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { queryDatabase as queryNotionDb } from './lib/notion-datasource.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
await import(join(__dirname, '../lib/load-env.mjs'));

// ── CLI flags ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const SKIP_ACTIONS = args.includes('--skip-actions');

function log(...a) { console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a); }
function verbose(...a) { if (VERBOSE || DRY_RUN) log(...a); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Notion database IDs ──────────────────────────────────────────────

const configPath = join(__dirname, '../config/notion-database-ids.json');
const dbIds = JSON.parse(readFileSync(configPath, 'utf8'));

const GRANT_PIPELINE_DB = dbIds.grantPipeline;
const ACTIONS_DB = dbIds.actions;
const PLANNING_CALENDAR_DB = dbIds.planningCalendar;
const PROJECTS_DB = dbIds.actProjects;

// ── Clients ──────────────────────────────────────────────────────────

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const gsUrl = process.env.GRANTSCOPE_SUPABASE_URL;
const gsKey = process.env.GRANTSCOPE_SUPABASE_KEY;

if (!gsUrl || !gsKey) {
  console.error('Missing GRANTSCOPE_SUPABASE_URL or GRANTSCOPE_SUPABASE_KEY in .env.local');
  process.exit(1);
}

const gsSupabase = createClient(gsUrl, gsKey);

// ── Stage mapping ────────────────────────────────────────────────────

const STAGE_MAP = {
  discovered: 'Discovered',
  researching: 'Researching',
  drafting: 'Drafting',
  submitted: 'Submitted',
  awarded: 'Awarded',
  declined: 'Declined',
  archived: 'Archived',
};

// Stages that trigger sync to Notion (skip discovered/archived/declined)
const ACTIVE_STAGES = ['researching', 'drafting', 'submitted'];

// ── Notion helpers ───────────────────────────────────────────────────

async function queryAllPages(databaseId, filter) {
  const pages = [];
  let cursor;

  do {
    const params = { page_size: 100 };
    if (filter) params.filter = filter;
    if (cursor) params.start_cursor = cursor;

    const response = await queryNotionDb(notion, databaseId, params);
    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
    if (cursor) await sleep(350);
  } while (cursor);

  return pages;
}

function getRichText(page, propName) {
  const prop = page.properties?.[propName];
  if (!prop) return '';
  if (prop.type === 'rich_text') return prop.rich_text?.[0]?.plain_text || '';
  if (prop.type === 'title') return prop.title?.[0]?.plain_text || '';
  return '';
}

// ── Phase 1: Fetch tagged grants from GrantScope ─────────────────────

async function fetchTaggedGrants() {
  log('Phase 1: Fetching tagged grants from GrantScope...');

  const { data: grants, error } = await gsSupabase
    .from('grant_opportunities')
    .select('id, name, description, provider, program, amount_min, amount_max, closes_at, deadline, url, categories, focus_areas, target_recipients, eligibility_criteria, geography, fit_score, aligned_projects, pipeline_stage, requirements_summary, status')
    .in('pipeline_stage', ACTIVE_STAGES)
    .order('closes_at', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('Error fetching grants:', error.message);
    process.exit(1);
  }

  log(`  Found ${grants.length} grants in active pipeline stages`);

  if (VERBOSE) {
    for (const g of grants) {
      verbose(`  - [${g.pipeline_stage}] ${g.name} (${g.provider}) — deadline: ${g.closes_at || g.deadline || 'none'}`);
    }
  }

  return grants;
}

// ── Phase 2: Dedup against existing Notion pages ─────────────────────

async function fetchExistingPages() {
  log('Phase 2: Fetching existing Grant Pipeline Tracker pages...');

  const pages = await queryAllPages(GRANT_PIPELINE_DB);
  log(`  Found ${pages.length} existing pages in Grant Pipeline Tracker`);

  // Build map: GrantScope ID → Notion page (ID stored as [gs:UUID] prefix in Notes)
  const map = new Map();
  for (const page of pages) {
    const notes = getRichText(page, 'Notes');
    const match = notes.match(/\[gs:([a-f0-9-]+)\]/);
    if (match) {
      map.set(match[1], page);
    }
  }

  verbose(`  ${map.size} pages have GrantScope IDs (for dedup)`);
  return map;
}

async function fetchExistingActions() {
  log('  Fetching existing Actions for dedup...');

  const pages = await queryAllPages(ACTIONS_DB, {
    property: 'Type',
    select: { equals: 'Grant' },
  });

  // Build set of action titles for dedup (only our auto-created ones with [Grant] prefix)
  const titles = new Set();
  for (const page of pages) {
    const title = getRichText(page, 'Action Item');
    if (title && title.startsWith('[Grant]')) titles.add(title);
  }

  verbose(`  ${titles.size} existing [Grant] actions found`);
  return titles;
}

async function fetchExistingCalendarEntries() {
  log('  Fetching existing Planning Calendar entries for dedup...');

  const pages = await queryAllPages(PLANNING_CALENDAR_DB, {
    property: 'Type',
    select: { equals: 'Deadline' },
  });

  const titles = new Set();
  for (const page of pages) {
    const title = getRichText(page, 'Event') || getRichText(page, 'Name');
    if (title) titles.add(title);
  }

  verbose(`  ${titles.size} existing Deadline calendar entries found`);
  return titles;
}

// ── Phase 3: Create/update Grant Pipeline Tracker pages ──────────────

function buildGrantProperties(grant) {
  const deadline = grant.closes_at || grant.deadline;
  const projects = Array.isArray(grant.aligned_projects)
    ? grant.aligned_projects.join(', ')
    : (grant.aligned_projects || '');

  const props = {
    'Grant Name': {
      title: [{ text: { content: (grant.name || 'Untitled Grant').slice(0, 2000) } }],
    },
    'Funder': {
      rich_text: [{ text: { content: (grant.provider || '').slice(0, 2000) } }],
    },
    'Stage': {
      select: { name: STAGE_MAP[grant.pipeline_stage] || 'Researching' },
    },
    'Type': {
      select: { name: 'Grant' },
    },
  };

  if (grant.amount_max) {
    props['Amount'] = { number: grant.amount_max };
  }

  if (deadline) {
    props['Deadline'] = { date: { start: deadline.split('T')[0] } };
  }

  if (grant.url) {
    props['Application URL'] = { url: grant.url };
  }

  if (grant.fit_score) {
    props['Readiness Score'] = { number: grant.fit_score };
  }

  if (projects) {
    props['Project'] = {
      rich_text: [{ text: { content: projects.slice(0, 2000) } }],
    };
  }

  const keyReqs = grant.requirements_summary || grant.eligibility_criteria || '';
  if (keyReqs) {
    props['Key Requirements'] = {
      rich_text: [{ text: { content: (typeof keyReqs === 'string' ? keyReqs : JSON.stringify(keyReqs)).slice(0, 2000) } }],
    };
  }

  // Notes: embed [gs:UUID] for dedup, then description
  const notesPrefix = `[gs:${grant.id}]`;
  const notesBody = grant.description ? ` ${grant.description}` : '';
  props['Notes'] = {
    rich_text: [{ text: { content: `${notesPrefix}${notesBody}`.slice(0, 2000) } }],
  };

  return props;
}

function buildGrantContent(grant) {
  const blocks = [];

  // Quick Links heading
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: { rich_text: [{ text: { content: 'Quick Links' } }] },
  });

  const links = [];
  if (grant.url) {
    links.push({ text: { content: 'Apply', link: { url: grant.url } } });
    links.push({ text: { content: '  |  ' } });
  }
  links.push({
    text: {
      content: 'GrantScope Profile',
      link: { url: `https://grantscope.vercel.app/grants/${grant.id}` },
    },
  });
  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: links },
  });

  // Overview
  if (grant.description) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: { rich_text: [{ text: { content: 'Overview' } }] },
    });
    // Notion blocks have 2000 char limit — split if needed
    const desc = grant.description.slice(0, 2000);
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ text: { content: desc } }] },
    });
  }

  // Eligibility
  const eligibility = grant.eligibility_criteria;
  if (eligibility) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: { rich_text: [{ text: { content: 'Eligibility' } }] },
    });
    const eligText = typeof eligibility === 'string' ? eligibility : JSON.stringify(eligibility, null, 2);
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ text: { content: eligText.slice(0, 2000) } }] },
    });
  }

  // Categories
  const cats = [
    ...(Array.isArray(grant.categories) ? grant.categories : []),
    ...(Array.isArray(grant.focus_areas) ? grant.focus_areas : []),
  ].filter(Boolean);

  if (cats.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: { rich_text: [{ text: { content: 'Categories' } }] },
    });
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: [{ text: { content: cats.join(', ').slice(0, 2000) } }] },
    });
  }

  return blocks;
}

async function syncGrantPages(grants, existingMap) {
  log('Phase 3: Syncing Grant Pipeline Tracker pages...');

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const newGrantIds = new Set();

  for (const grant of grants) {
    const existingPage = existingMap.get(grant.id);

    if (existingPage) {
      // Update existing page properties
      if (DRY_RUN) {
        verbose(`  Would update: ${grant.name}`);
        skipped++;
        continue;
      }

      try {
        await notion.pages.update({
          page_id: existingPage.id,
          properties: buildGrantProperties(grant),
        });
        updated++;
        verbose(`  Updated: ${grant.name}`);
      } catch (err) {
        log(`  Warning: failed to update ${grant.name}: ${err.message}`);
      }
    } else {
      // Create new page
      newGrantIds.add(grant.id);

      if (DRY_RUN) {
        verbose(`  Would create: ${grant.name} (${grant.provider}) — $${grant.amount_max || '?'}`);
        created++;
        continue;
      }

      try {
        await notion.pages.create({
          parent: { database_id: GRANT_PIPELINE_DB },
          properties: buildGrantProperties(grant),
          children: buildGrantContent(grant),
        });
        created++;
        verbose(`  Created: ${grant.name}`);
      } catch (err) {
        log(`  Warning: failed to create "${grant.name}": ${err.message}`);
        // Remove from newGrantIds so we don't create orphan actions
        newGrantIds.delete(grant.id);
      }
    }

    await sleep(350);
  }

  log(`  Grant pages: ${created} created, ${updated} updated, ${skipped} skipped`);
  return newGrantIds;
}

// ── Fetch Notion project pages for relation linking ──────────────────

async function fetchNotionProjects() {
  log('  Fetching Notion project pages for relation linking...');

  const pages = await queryAllPages(PROJECTS_DB);

  // Build map: project name (lowercase) → Notion page ID
  // Also map common project codes to Notion page IDs
  const nameMap = new Map();
  for (const page of pages) {
    const name = getRichText(page, 'Name');
    if (name) {
      nameMap.set(name.toLowerCase(), page.id);
      // Also map common short codes
      // e.g. "Empathy Ledger" → also findable as "ACT-EL"
    }
  }

  verbose(`  ${nameMap.size} Notion project pages mapped`);
  return nameMap;
}

// Match aligned_projects codes to Notion project page IDs
function resolveProjectRelations(alignedProjects, projectNameMap) {
  if (!alignedProjects || !Array.isArray(alignedProjects) || alignedProjects.length === 0) {
    return [];
  }

  // Map of GrantScope project codes → Notion project name substrings (lowercase)
  // These match actual Notion project page names
  const CODE_TO_SEARCH = {
    'ACT-EL': ['empathy ledger'],
    'ACT-JH': ['justicehub'],
    'ACT-GD': ['goods.', 'goods on country'],
    'ACT-BCV': ['black cockatoo', 'bcv'],
    'ACT-HV': ['the harvest'],
    'ACT-FM': ['the farm', 'act farm'],
    'ACT-ART': ['art'],
    'ACT-HQ': ['act hq', 'act operations'],
    'ACT-IN': ['alma'],
    'ACT-OC': ['oochiumpa', 'oonchiumpa'],
    'ACT-PC': ['palm island', 'palm community'],
    'ACT-OS': ['orange sky'],
  };

  const relations = [];
  const usedIds = new Set();
  for (const code of alignedProjects) {
    let found = false;
    // Try mapped search terms first
    const searchTerms = CODE_TO_SEARCH[code];
    if (searchTerms) {
      for (const term of searchTerms) {
        // Try exact match first
        const exactId = projectNameMap.get(term);
        if (exactId && !usedIds.has(exactId)) {
          relations.push({ id: exactId });
          usedIds.add(exactId);
          found = true;
          break;
        }
        // Try substring match
        if (!found) {
          for (const [name, pageId] of projectNameMap) {
            if (name.includes(term) && !usedIds.has(pageId)) {
              relations.push({ id: pageId });
              usedIds.add(pageId);
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }
    }
    // Fallback: search project names containing the code suffix
    if (!found) {
      const suffix = code.replace('ACT-', '').toLowerCase();
      for (const [name, pageId] of projectNameMap) {
        if (name.includes(suffix) && !usedIds.has(pageId)) {
          relations.push({ id: pageId });
          usedIds.add(pageId);
          break;
        }
      }
    }
  }
  return relations;
}

// Build page content blocks for a grant action item
function buildActionContent(grant, gate, gateNum) {
  const amount = grant.amount_max
    ? `$${Number(grant.amount_max).toLocaleString()}`
    : grant.amount_min
      ? `$${Number(grant.amount_min).toLocaleString()}`
      : 'Not specified';
  const deadline = grant.closes_at || grant.deadline || 'No deadline';
  const funder = grant.provider || 'Unknown funder';
  const program = grant.program || '';
  const projects = Array.isArray(grant.aligned_projects)
    ? grant.aligned_projects.join(', ')
    : (grant.aligned_projects || '—');

  const children = [
    // Summary block
    {
      object: 'block',
      type: 'callout',
      callout: {
        icon: { emoji: '💰' },
        rich_text: [{ text: { content: `${funder}${program ? ` — ${program}` : ''} | ${amount} | Closes ${deadline}` } }],
      },
    },
    // Details
    {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ text: { content: `Gate ${gateNum}: ${gate.name}` } }],
      },
    },
  ];

  // Add description if available
  if (grant.description) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: grant.description.slice(0, 1500) } }],
      },
    });
  }

  // Key details as bullet list
  const bullets = [
    `Funder: ${funder}`,
    `Amount: ${amount}`,
    `Deadline: ${deadline}`,
    `Aligned Projects: ${projects}`,
  ];
  if (grant.eligibility_criteria) {
    bullets.push(`Eligibility: ${String(grant.eligibility_criteria).slice(0, 300)}`);
  }
  if (grant.geography) {
    bullets.push(`Geography: ${Array.isArray(grant.geography) ? grant.geography.join(', ') : grant.geography}`);
  }
  if (grant.target_recipients) {
    bullets.push(`Target: ${Array.isArray(grant.target_recipients) ? grant.target_recipients.join(', ') : grant.target_recipients}`);
  }

  for (const text of bullets) {
    children.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ text: { content: text.slice(0, 2000) } }],
      },
    });
  }

  // Link to grant URL if available
  if (grant.url) {
    children.push({
      object: 'block',
      type: 'bookmark',
      bookmark: { url: grant.url },
    });
  }

  return children;
}

// ── Phase 4: Auto-create Actions (Playbook 6 Gates) ─────────────────

function calculateGates(deadline) {
  if (!deadline) return [];

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const daysUntil = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

  if (daysUntil < 1) return []; // Past deadline

  const formatDate = (d) => d.toISOString().split('T')[0];
  const addDays = (d, n) => {
    const result = new Date(d);
    result.setDate(result.getDate() + n);
    return result;
  };

  if (daysUntil > 14) {
    // Full 5 gates
    return [
      { name: 'Go/No-Go Decision', due: formatDate(addDays(deadlineDate, -14)), urgent: false },
      { name: 'Documents Gathered', due: formatDate(addDays(deadlineDate, -10)), urgent: false },
      { name: 'Draft Complete', due: formatDate(addDays(deadlineDate, -7)), urgent: false },
      { name: 'Review & Refine', due: formatDate(addDays(deadlineDate, -3)), urgent: false },
      { name: 'Submit', due: formatDate(addDays(deadlineDate, -1)), urgent: false },
    ];
  } else if (daysUntil >= 7) {
    // Compressed 3 gates
    return [
      { name: 'Go/No-Go + Documents', due: formatDate(addDays(deadlineDate, -5)), urgent: false },
      { name: 'Draft + Review', due: formatDate(addDays(deadlineDate, -2)), urgent: false },
      { name: 'Submit', due: formatDate(addDays(deadlineDate, -1)), urgent: true },
    ];
  } else {
    // Urgent 2 gates
    return [
      { name: 'Go/No-Go TODAY', due: formatDate(now), urgent: true },
      { name: 'Submit', due: formatDate(addDays(deadlineDate, -1)), urgent: true },
    ];
  }
}

async function createActions(grants, newGrantIds, existingActionTitles, projectNameMap) {
  if (SKIP_ACTIONS) {
    log('Phase 4: Skipped (--skip-actions)');
    return;
  }

  log('Phase 4: Creating Actions (Playbook 6 gates) for new grants...');

  const newGrants = grants.filter(g => newGrantIds.has(g.id));

  if (newGrants.length === 0) {
    log('  No new grants — skipping action creation');
    return;
  }

  let created = 0;
  let skipped = 0;
  let linked = 0;

  for (const grant of newGrants) {
    const deadline = grant.closes_at || grant.deadline;
    const gates = calculateGates(deadline);

    if (gates.length === 0) {
      verbose(`  No gates for ${grant.name} (no deadline or past)`);
      continue;
    }

    // Resolve project relations for this grant
    const projectRelations = resolveProjectRelations(grant.aligned_projects, projectNameMap);

    for (let i = 0; i < gates.length; i++) {
      const gate = gates[i];
      const gateNum = `G${i + 1}`;
      const actionTitle = `[Grant] ${gateNum}: ${gate.name} — ${grant.name}`;

      // Dedup check
      if (existingActionTitles.has(actionTitle)) {
        skipped++;
        verbose(`  Skipped (exists): ${actionTitle}`);
        continue;
      }

      if (DRY_RUN) {
        verbose(`  Would create action: ${actionTitle} (due: ${gate.due}, projects: ${projectRelations.length})`);
        created++;
        continue;
      }

      try {
        const props = {
          'Action Item': {
            title: [{ text: { content: actionTitle.slice(0, 2000) } }],
          },
          'Status': {
            status: { name: gate.urgent ? 'Please water' : 'Not started' },
          },
          'Due Date': {
            date: { start: gate.due },
          },
          'Type': {
            select: { name: 'Grant' },
          },
        };

        // Link to ACT projects if we resolved any
        if (projectRelations.length > 0) {
          props['Projects'] = { relation: projectRelations };
          linked++;
        }

        // Build rich page content with grant details
        const children = buildActionContent(grant, gate, gateNum);

        await notion.pages.create({
          parent: { database_id: ACTIONS_DB },
          properties: props,
          children,
        });
        created++;
        verbose(`  Created action: ${actionTitle} (${projectRelations.length} projects linked)`);
      } catch (err) {
        log(`  Warning: failed to create action "${actionTitle}": ${err.message}`);
      }

      await sleep(350);
    }
  }

  log(`  Actions: ${created} created, ${skipped} skipped, ${linked} project links set`);
}

// ── Phase 5: Create Planning Calendar entries ────────────────────────

async function createCalendarEntries(grants, newGrantIds, existingCalendarTitles) {
  if (SKIP_ACTIONS) {
    log('Phase 5: Skipped (--skip-actions)');
    return;
  }

  log('Phase 5: Creating Planning Calendar deadline entries...');

  const newGrants = grants.filter(g => newGrantIds.has(g.id));
  let created = 0;
  let skipped = 0;

  for (const grant of newGrants) {
    const deadline = grant.closes_at || grant.deadline;
    if (!deadline) {
      verbose(`  No deadline for ${grant.name} — skipping calendar entry`);
      continue;
    }

    const eventTitle = `DEADLINE: ${grant.name}`;

    if (existingCalendarTitles.has(eventTitle)) {
      skipped++;
      verbose(`  Skipped (exists): ${eventTitle}`);
      continue;
    }

    if (DRY_RUN) {
      verbose(`  Would create calendar entry: ${eventTitle} (${deadline.split('T')[0]})`);
      created++;
      continue;
    }

    try {
      await notion.pages.create({
        parent: { database_id: PLANNING_CALENDAR_DB },
        properties: {
          'Event': {
            title: [{ text: { content: eventTitle.slice(0, 2000) } }],
          },
          'Date': {
            date: { start: deadline.split('T')[0] },
          },
          'Type': {
            select: { name: 'Deadline' },
          },
          'Status': {
            select: { name: 'Confirmed' },
          },
        },
      });
      created++;
      verbose(`  Created calendar entry: ${eventTitle}`);
    } catch (err) {
      log(`  Warning: failed to create calendar entry "${eventTitle}": ${err.message}`);
    }

    await sleep(350);
  }

  log(`  Calendar entries: ${created} created, ${skipped} skipped (dedup)`);
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  log('=== GrantScope → Notion Pipeline Sync ===');
  if (DRY_RUN) log('DRY RUN MODE — no changes will be made');

  // Phase 1
  const grants = await fetchTaggedGrants();

  if (grants.length === 0) {
    log('No grants in active pipeline stages. Nothing to sync.');
    return;
  }

  // Phase 2
  const existingMap = await fetchExistingPages();

  // Fetch action/calendar dedup data and project map (sequential for rate limiting)
  let existingActionTitles = new Set();
  let existingCalendarTitles = new Set();
  let projectNameMap = new Map();

  if (!SKIP_ACTIONS) {
    existingActionTitles = await fetchExistingActions();
    existingCalendarTitles = await fetchExistingCalendarEntries();
    projectNameMap = await fetchNotionProjects();
  }

  // Phase 3
  const newGrantIds = await syncGrantPages(grants, existingMap);

  // Phase 4
  await createActions(grants, newGrantIds, existingActionTitles, projectNameMap);

  // Phase 5
  await createCalendarEntries(grants, newGrantIds, existingCalendarTitles);

  // Summary
  log('\n=== Sync Complete ===');
  log(`Grants processed: ${grants.length}`);
  log(`New grants: ${newGrantIds.size}`);
  log(`Existing (updated): ${grants.length - newGrantIds.size}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
