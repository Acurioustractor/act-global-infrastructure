#!/usr/bin/env node
/**
 * One-time backfill: Add rich content + Project links to existing [Grant] action items in Notion.
 * These were created by the old sync script with only title/status/date/type — no body, no projects.
 *
 * Usage:
 *   node scripts/backfill-grant-actions-content.mjs --dry-run    # Preview
 *   node scripts/backfill-grant-actions-content.mjs              # Apply
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { queryDatabase } from './lib/notion-datasource.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const DRY_RUN = process.argv.includes('--dry-run');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const gsSupabase = createClient(process.env.GRANTSCOPE_SUPABASE_URL, process.env.GRANTSCOPE_SUPABASE_KEY);

const dbIds = JSON.parse(readFileSync(join(__dirname, '../config/notion-database-ids.json'), 'utf8'));
const ACTIONS_DB = dbIds.actions;
const PROJECTS_DB = dbIds.actProjects;

function log(...a) { console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Step 1: Fetch all [Grant] action items from Notion ──

async function fetchGrantActions() {
  const pages = [];
  let cursor;
  do {
    const response = await queryDatabase(notion, ACTIONS_DB, {
      page_size: 100,
      filter: { property: 'Type', select: { equals: 'Grant' } },
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor : null;
    if (cursor) await sleep(350);
  } while (cursor);
  return pages;
}

// ── Step 2: Fetch Notion project pages for relation linking ──

async function fetchProjectPages() {
  const nameMap = new Map();
  let cursor;
  do {
    const response = await queryDatabase(notion, PROJECTS_DB, {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    for (const page of response.results) {
      const titleProp = page.properties['Name'];
      const name = titleProp?.title?.[0]?.plain_text;
      if (name) nameMap.set(name.toLowerCase(), page.id);
    }
    cursor = response.has_more ? response.next_cursor : null;
    if (cursor) await sleep(350);
  } while (cursor);
  return nameMap;
}

// ── Step 3: Fetch grants from GrantScope ──

async function fetchGrants() {
  const { data, error } = await gsSupabase
    .from('grant_opportunities')
    .select('id, name, description, provider, program, amount_min, amount_max, closes_at, deadline, url, categories, focus_areas, target_recipients, eligibility_criteria, geography, aligned_projects, pipeline_stage')
    .limit(500);

  if (error) { log('Error fetching grants:', error.message); return []; }
  return data || [];
}

// ── Step 4: Match grant from action title ──
// Strategy: word-overlap scoring + provider matching.
// Strip noise words, score each grant by how many significant words overlap.

const NOISE_WORDS = new Set([
  'the', 'and', 'for', 'grant', 'grants', 'submit', 'draft', 'complete',
  'decision', 'today', 'documents', 'gathered', 'review', 'refine',
  'start', 'plan', 'application', 'closes', 'readiness', 'due',
  'no-go', 'go/no-go', 'deadline', 'research', 'outline', 'prepare',
]);

function tokenize(text) {
  return text.toLowerCase()
    .replace(/\[grant\]/gi, '')
    .replace(/g\d+:/gi, '')
    .replace(/\$[\d,.]+[km]?/gi, '')
    .replace(/\d{1,2}\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !NOISE_WORDS.has(w));
}

function findMatchingGrant(actionTitle, grantByName, grantByProvider) {
  const titleTokens = new Set(tokenize(actionTitle));
  if (titleTokens.size === 0) return null;

  let bestGrant = null;
  let bestScore = 0;

  // Score against grant names
  for (const [name, grant] of grantByName) {
    const nameTokens = tokenize(name);
    if (nameTokens.length === 0) continue;

    let overlap = 0;
    for (const token of nameTokens) {
      if (titleTokens.has(token)) overlap++;
    }

    // Score = overlap / nameTokens (what fraction of the grant name is in the title)
    const score = overlap / nameTokens.length;
    if (overlap >= 2 && score > bestScore) {
      bestScore = score;
      bestGrant = grant;
    }
  }

  // Also try matching on provider name if no strong name match
  if (bestScore < 0.5 && grantByProvider) {
    for (const [provider, grants] of grantByProvider) {
      const provTokens = tokenize(provider);
      let overlap = 0;
      for (const token of provTokens) {
        if (titleTokens.has(token)) overlap++;
      }
      if (provTokens.length >= 2 && overlap >= 2 && overlap / provTokens.length > bestScore) {
        bestScore = overlap / provTokens.length;
        bestGrant = grants[0]; // Pick first grant from this provider
      }
    }
  }

  return bestScore >= 0.4 ? bestGrant : null;
}

// ── Step 5: Resolve project relations ──

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

function resolveProjectRelations(alignedProjects, projectNameMap) {
  if (!alignedProjects || !Array.isArray(alignedProjects) || alignedProjects.length === 0) return [];
  const relations = [];
  const usedIds = new Set();
  for (const code of alignedProjects) {
    let found = false;
    const searchTerms = CODE_TO_SEARCH[code];
    if (searchTerms) {
      for (const term of searchTerms) {
        for (const [name, pageId] of projectNameMap) {
          if ((name === term || name.includes(term)) && !usedIds.has(pageId)) {
            relations.push({ id: pageId });
            usedIds.add(pageId);
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
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

// ── Step 6: Build content blocks ──

function buildContentBlocks(grant, actionTitle) {
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
    {
      object: 'block',
      type: 'callout',
      callout: {
        icon: { emoji: '💰' },
        rich_text: [{ text: { content: `${funder}${program ? ` — ${program}` : ''} | ${amount} | Closes ${deadline}` } }],
      },
    },
  ];

  if (grant.description) {
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: grant.description.slice(0, 1500) } }],
      },
    });
  }

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

  if (grant.url) {
    children.push({
      object: 'block',
      type: 'bookmark',
      bookmark: { url: grant.url },
    });
  }

  return children;
}

// ── Main ──

async function main() {
  log('=== Backfill Grant Action Items with Content ===');
  if (DRY_RUN) log('DRY RUN MODE');

  const [actionPages, projectNameMap, grants] = await Promise.all([
    fetchGrantActions(),
    fetchProjectPages(),
    fetchGrants(),
  ]);

  log(`Found ${actionPages.length} [Grant] actions in Notion`);
  log(`Found ${projectNameMap.size} project pages`);
  log(`Found ${grants.length} grants in GrantScope`);

  // Build grant name → grant data lookup (lowercase for fuzzy matching)
  const grantByName = new Map();
  const grantByProvider = new Map();
  for (const g of grants) {
    if (g.name) grantByName.set(g.name.toLowerCase(), g);
    if (g.provider) {
      const key = g.provider.toLowerCase();
      if (!grantByProvider.has(key)) grantByProvider.set(key, []);
      grantByProvider.get(key).push(g);
    }
  }

  let enriched = 0;
  let linked = 0;
  let noMatch = 0;

  for (const page of actionPages) {
    const titleProp = page.properties['Action Item'];
    const actionTitle = titleProp?.title?.[0]?.plain_text || '';

    const grant = findMatchingGrant(actionTitle, grantByName, grantByProvider);

    if (!grant) {
      log(`  No match: "${actionTitle.slice(0, 80)}"`);
      noMatch++;
      continue;
    }

    log(`  Match: "${actionTitle.slice(0, 60)}" → ${grant.name} (${grant.provider})`);

    // Check if page already has content (don't overwrite)
    const existingBlocks = await notion.blocks.children.list({ block_id: page.id, page_size: 1 });
    if (existingBlocks.results.length > 0) {
      log(`    Already has content — skipping body, checking Projects relation`);
    }

    // Build updates
    const projectRelations = resolveProjectRelations(grant.aligned_projects, projectNameMap);
    const hasProjectsSet = page.properties['Projects']?.relation?.length > 0;

    if (DRY_RUN) {
      log(`    Would add: ${existingBlocks.results.length === 0 ? 'content blocks + ' : ''}${!hasProjectsSet && projectRelations.length > 0 ? `${projectRelations.length} project links` : 'no project changes'}`);
      enriched++;
      continue;
    }

    // Add content blocks if page is empty
    if (existingBlocks.results.length === 0) {
      const children = buildContentBlocks(grant, actionTitle);
      await notion.blocks.children.append({
        block_id: page.id,
        children,
      });
      enriched++;
      log(`    Added content blocks`);
      await sleep(350);
    }

    // Set Projects relation if not already set
    if (!hasProjectsSet && projectRelations.length > 0) {
      await notion.pages.update({
        page_id: page.id,
        properties: {
          'Projects': { relation: projectRelations },
        },
      });
      linked++;
      log(`    Linked ${projectRelations.length} project(s)`);
      await sleep(350);
    }
  }

  log(`\n=== Done ===`);
  log(`Enriched: ${enriched}, Project links added: ${linked}, No match: ${noMatch}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
