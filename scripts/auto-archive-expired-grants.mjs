#!/usr/bin/env node
/**
 * Auto-archive expired grant actions in Notion.
 *
 * Marks grant action items as "Done" when:
 * - Type = "Grant" (or title contains grant keywords)
 * - Status is NOT "Done"
 * - The grant deadline (parsed from title or due_date) has passed
 * - Status is still "Not started" (never acted on = implicitly declined)
 *
 * Runs daily via scheduled-syncs.yml.
 *
 * Usage:
 *   node scripts/auto-archive-expired-grants.mjs              # Apply
 *   node scripts/auto-archive-expired-grants.mjs --dry-run    # Preview
 */
import { Client } from '@notionhq/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { queryDatabase } from './lib/notion-datasource.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const DRY_RUN = process.argv.includes('--dry-run');
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const dbIds = JSON.parse(readFileSync(join(__dirname, '../config/notion-database-ids.json'), 'utf8'));
const ACTIONS_DB = dbIds.actions;

const TODAY = new Date().toISOString().split('T')[0];

function log(...a) { console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Month name → number
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/**
 * Try to extract a grant deadline from the action title.
 * Patterns: "closes Mar 30", "closes Apr 2", "due Mar 27"
 */
function parseDeadlineFromTitle(title) {
  const match = title.match(/(?:closes?|due)\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})/i);
  if (!match) return null;

  const parts = match[1].trim().split(/\s+/);
  const monthStr = parts[0].toLowerCase().slice(0, 3);
  const day = parseInt(parts[1], 10);
  const month = MONTHS[monthStr];
  if (month === undefined || isNaN(day)) return null;

  // Assume current year, or next year if the date is far in the past
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month, day);
  if (candidate.getTime() < now.getTime() - 180 * 86400000) {
    year += 1; // If >6 months ago, probably means next year
  }

  return new Date(year, month, day).toISOString().split('T')[0];
}

log('=== Auto-Archive Expired Grant Actions ===');
if (DRY_RUN) log('DRY RUN MODE');

// Fetch all Grant-type actions that are not Done
const pages = [];
let cursor;
do {
  const response = await queryDatabase(notion, ACTIONS_DB, {
    page_size: 100,
    filter: {
      and: [
        { property: 'Type', select: { equals: 'Grant' } },
        { property: 'Status', status: { does_not_equal: 'Done' } },
      ],
    },
    ...(cursor ? { start_cursor: cursor } : {}),
  });
  pages.push(...response.results);
  cursor = response.has_more ? response.next_cursor : null;
  if (cursor) await sleep(350);
} while (cursor);

log(`Found ${pages.length} non-Done grant actions`);

let archived = 0;
let kept = 0;

for (const page of pages) {
  const title = page.properties['Action Item']?.title?.[0]?.plain_text || '';
  const status = page.properties['Status']?.status?.name || '';
  const dueDate = page.properties['Due Date']?.date?.start || null;

  // Only auto-archive items that were never started
  if (status !== 'Not started') {
    kept++;
    continue;
  }

  // Check if the grant deadline has passed
  const titleDeadline = parseDeadlineFromTitle(title);
  const effectiveDeadline = titleDeadline || dueDate;

  if (!effectiveDeadline) {
    kept++; // No deadline to check — keep it
    continue;
  }

  if (effectiveDeadline >= TODAY) {
    kept++; // Deadline hasn't passed yet
    continue;
  }

  // Deadline passed + status is Not started = auto-archive
  const daysExpired = Math.floor((Date.now() - new Date(effectiveDeadline).getTime()) / 86400000);

  if (DRY_RUN) {
    log(`  Would archive: ${title.slice(0, 80)} (expired ${daysExpired}d ago)`);
  } else {
    await notion.pages.update({
      page_id: page.id,
      properties: {
        'Status': { status: { name: 'Done' } },
      },
    });
    log(`  Archived: ${title.slice(0, 80)} (expired ${daysExpired}d ago)`);
    await sleep(350);
  }
  archived++;
}

log(`\nDone: ${archived} archived, ${kept} kept`);
