#!/usr/bin/env node
/**
 * Update Notion Project Pages with Dashboard Links
 *
 * Adds or updates a "Dashboard Links" callout block on each project's
 * Notion page, containing deep links back to the Command Center dashboard.
 *
 * Usage:
 *   node scripts/update-notion-dashboard-links.mjs              # Update all projects
 *   node scripts/update-notion-dashboard-links.mjs --dry-run    # Preview only
 *   node scripts/update-notion-dashboard-links.mjs --project ACT-JH  # Single project
 *   node scripts/update-notion-dashboard-links.mjs --verbose    # Detailed output
 *
 * Environment Variables:
 *   NOTION_TOKEN                    - Notion API token
 *   DASHBOARD_BASE_URL             - Dashboard URL (default: https://act-command-center.vercel.app)
 */

import { Client } from '@notionhq/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env (override: true so .env.local wins over stale shell env vars from direnv)
dotenv.config({ path: join(__dirname, '..', 'apps', 'command-center', '.env.local'), override: true });
dotenv.config({ path: join(__dirname, '..', '.env.local'), override: true });

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const projectFilter = args.includes('--project') ? args[args.indexOf('--project') + 1] : null;

const DASHBOARD_BASE_URL = process.env.DASHBOARD_BASE_URL || 'https://act-command-center.vercel.app';
const CALLOUT_MARKER = 'Dashboard Links';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Load project codes
const projectCodesPath = join(__dirname, '..', 'config', 'project-codes.json');
const projectCodesData = JSON.parse(readFileSync(projectCodesPath, 'utf-8'));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function verbose(msg) {
  if (VERBOSE) log(msg);
}

/**
 * Build dashboard links for a project
 */
function buildDashboardLinks(code, name) {
  return [
    { text: `${name} Overview`, url: `${DASHBOARD_BASE_URL}/projects/${code}` },
    { text: 'Financials', url: `${DASHBOARD_BASE_URL}/projects/${code}?tab=financials` },
    { text: 'Pipeline', url: `${DASHBOARD_BASE_URL}/projects/${code}?tab=pipeline` },
    { text: 'ALMA Impact', url: `${DASHBOARD_BASE_URL}/projects/${code}?tab=alma` },
    { text: 'Related People', url: `${DASHBOARD_BASE_URL}/people` },
    { text: 'Compendium', url: `${DASHBOARD_BASE_URL}/compendium/${code}` },
  ];
}

/**
 * Create the callout block content for Notion API
 */
function buildCalloutBlock(links) {
  const richText = [
    {
      type: 'text',
      text: { content: `${CALLOUT_MARKER}\n` },
      annotations: { bold: true },
    },
  ];

  links.forEach((link, i) => {
    richText.push({
      type: 'text',
      text: {
        content: link.text,
        link: { url: link.url },
      },
    });
    if (i < links.length - 1) {
      richText.push({
        type: 'text',
        text: { content: '  |  ' },
      });
    }
  });

  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: richText,
      icon: { type: 'emoji', emoji: '🔗' },
      color: 'blue_background',
    },
  };
}

/**
 * Find existing Dashboard Links callout in a page's children
 */
async function findExistingCallout(pageId) {
  let cursor;
  do {
    const children = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    for (const block of children.results) {
      if (block.type === 'callout' && block.callout?.rich_text) {
        const text = block.callout.rich_text.map(rt => rt.plain_text).join('');
        if (text.includes(CALLOUT_MARKER)) {
          return block.id;
        }
      }
    }

    cursor = children.has_more ? children.next_cursor : null;
    if (cursor) await sleep(500);
  } while (cursor);
  return null;
}

/**
 * Update or create dashboard links on a project's Notion page
 */
async function updateProjectPage(code, project) {
  // Determine the Notion page ID
  const pageId = project.notion_page_id || project.notion_id;
  if (!pageId) {
    verbose(`  ${code}: No notion_page_id, skipping`);
    return { status: 'skipped', reason: 'no_page_id' };
  }

  const links = buildDashboardLinks(code, project.name);
  const calloutBlock = buildCalloutBlock(links);

  if (DRY_RUN) {
    log(`  [DRY RUN] ${code} (${project.name}): Would update page ${pageId}`);
    links.forEach(l => verbose(`    -> ${l.text}: ${l.url}`));
    return { status: 'dry_run' };
  }

  try {
    // Check for existing callout
    const existingBlockId = await findExistingCallout(pageId);
    await sleep(500); // Rate limiting: ~2 req/sec

    if (existingBlockId) {
      // Update existing block
      verbose(`  ${code}: Updating existing callout block ${existingBlockId}`);
      await notion.blocks.update({
        block_id: existingBlockId,
        callout: calloutBlock.callout,
      });
      await sleep(500);
      return { status: 'updated' };
    } else {
      // Append new callout at the top
      verbose(`  ${code}: Appending new callout block to page ${pageId}`);
      await notion.blocks.children.append({
        block_id: pageId,
        children: [calloutBlock],
      });
      await sleep(500);
      return { status: 'created' };
    }
  } catch (err) {
    log(`  ${code}: ERROR - ${err.message}`);
    return { status: 'error', error: err.message };
  }
}

async function main() {
  log('=== Notion Dashboard Links Updater ===');
  if (DRY_RUN) log('DRY RUN MODE - no changes will be made');
  log(`Dashboard URL: ${DASHBOARD_BASE_URL}`);
  log('');

  const projects = projectCodesData.projects;
  const codes = projectFilter
    ? [projectFilter]
    : Object.keys(projects).filter(code => {
        const p = projects[code];
        return (p.notion_page_id || p.notion_id) && p.status !== 'archived';
      });

  log(`Processing ${codes.length} projects...`);

  const stats = { created: 0, updated: 0, skipped: 0, errors: 0, dry_run: 0 };

  for (const code of codes) {
    const project = projects[code];
    if (!project) {
      log(`  ${code}: Not found in project-codes.json`);
      stats.errors++;
      continue;
    }

    log(`  ${code}: ${project.name}`);
    const result = await updateProjectPage(code, project);
    stats[result.status] = (stats[result.status] || 0) + 1;

    // Rate limit between projects
    await sleep(1000);
  }

  log('');
  log('=== Summary ===');
  log(`Created: ${stats.created}`);
  log(`Updated: ${stats.updated}`);
  log(`Skipped: ${stats.skipped}`);
  log(`Errors:  ${stats.errors}`);
  if (DRY_RUN) log(`Dry run: ${stats.dry_run}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
