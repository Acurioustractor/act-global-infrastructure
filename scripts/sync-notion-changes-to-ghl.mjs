#!/usr/bin/env node
/**
 * Sync Notion ACT Opportunities → GHL (Won/Lost/Archived status changes)
 *
 * Reads the ACT Opportunities database in Notion. For any row where:
 *   - Source = GHL, AND
 *   - Stage was changed in Notion to Won / Lost / Archived
 *   - But Supabase mirror still shows status = open
 * → Push the new status to GHL via API.
 *
 * Stage transitions handled:
 *   Notion Stage "Won"      → GHL status='won'
 *   Notion Stage "Lost"     → GHL status='lost'
 *   Notion Stage "Archived" → GHL status='lost' (with note)
 *
 * For more nuanced stage moves within an open pipeline (e.g. Discovery → Demo),
 * use GHL UI directly — those are pipeline-specific and not modelled in Notion.
 *
 * After applying, runs sync-ghl-to-supabase + sync-opportunities-to-notion-db to refresh.
 *
 * Usage:
 *   node scripts/sync-notion-changes-to-ghl.mjs              # default — apply
 *   node scripts/sync-notion-changes-to-ghl.mjs --dry-run    # preview only
 *   node scripts/sync-notion-changes-to-ghl.mjs --skip-refresh  # don't run downstream syncs
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKIP_REFRESH = args.includes('--skip-refresh');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const notionDbIds = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'notion-database-ids.json'), 'utf-8'));
const DATA_SOURCE_ID = notionDbIds.opportunitiesDataSource;

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Notion Stage → GHL status mapping (for Won/Lost/Archived only)
const STAGE_TO_GHL_STATUS = {
  'Won': 'won',
  'Lost': 'lost',
  'Archived': 'lost',
};

async function fetchNotionRows() {
  const rows = [];
  let cursor;
  do {
    const res = await notion.dataSources.query({
      data_source_id: DATA_SOURCE_ID,
      page_size: 100,
      start_cursor: cursor,
      filter: {
        and: [
          { property: 'Source', select: { equals: 'GHL' } },
          {
            or: [
              { property: 'Stage', select: { equals: 'Won' } },
              { property: 'Stage', select: { equals: 'Lost' } },
              { property: 'Stage', select: { equals: 'Archived' } },
            ],
          },
        ],
      },
    });
    for (const page of res.results) {
      const props = page.properties;
      const ext = props['External ID']?.rich_text?.[0]?.plain_text;
      const stage = props['Stage']?.select?.name;
      const name = props['Name']?.title?.[0]?.plain_text;
      if (ext && stage && ext.startsWith('ghl:')) {
        rows.push({ pageId: page.id, name, stage, ghlId: ext.slice(4), lastEdited: page.last_edited_time });
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return rows;
}

async function fetchGhlMirror(ghlIds) {
  if (ghlIds.length === 0) return new Map();
  const map = new Map();
  for (let i = 0; i < ghlIds.length; i += 200) {
    const batch = ghlIds.slice(i, i + 200);
    const { data } = await supabase
      .from('ghl_opportunities')
      .select('ghl_id, status')
      .in('ghl_id', batch);
    for (const r of (data || [])) map.set(r.ghl_id, r.status);
  }
  return map;
}

async function pushToGhl(ghlId, newStatus) {
  const res = await fetch(`https://services.leadconnectorhq.com/opportunities/${ghlId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    },
    body: JSON.stringify({ status: newStatus }),
  });
  if (!res.ok) throw new Error(`GHL ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function main() {
  log('=== Notion → GHL change sync ===');
  if (DRY_RUN) log('DRY RUN');

  if (!DATA_SOURCE_ID) { log('ERROR: opportunitiesDataSource not in config'); process.exit(1); }
  if (!process.env.NOTION_TOKEN) { log('ERROR: NOTION_TOKEN not set'); process.exit(1); }
  if (!process.env.GHL_API_KEY) { log('ERROR: GHL_API_KEY not set'); process.exit(1); }

  log('Fetching Notion rows with Won/Lost/Archived stage...');
  const notionRows = await fetchNotionRows();
  log(`  ${notionRows.length} rows in Notion with closed-status stage`);

  const ghlIds = notionRows.map(r => r.ghlId);
  const mirror = await fetchGhlMirror(ghlIds);
  log(`  ${mirror.size} matching rows in Supabase GHL mirror`);

  // Determine what needs pushing — Notion says closed but GHL still open
  const toApply = [];
  const alreadyAligned = [];
  for (const r of notionRows) {
    const currentGhl = mirror.get(r.ghlId);
    const targetGhl = STAGE_TO_GHL_STATUS[r.stage];
    if (!currentGhl) { log(`  ⚠ ${r.name} — no Supabase mirror; skipping`); continue; }
    if (currentGhl === targetGhl) {
      alreadyAligned.push(r);
    } else if (currentGhl === 'open' && targetGhl) {
      toApply.push({ ...r, currentGhl, targetGhl });
    } else {
      log(`  ⚠ ${r.name} — GHL=${currentGhl}, Notion stage=${r.stage}, target=${targetGhl} (skipping non-trivial transition)`);
    }
  }

  log(`\n  Already aligned (no action): ${alreadyAligned.length}`);
  log(`  To push: ${toApply.length}`);

  if (toApply.length === 0) {
    log('\nNothing to do.');
    return;
  }

  log('\n--- Changes ---');
  for (const r of toApply) {
    log(`  ${r.name?.slice(0, 60).padEnd(60)} | GHL ${r.currentGhl} → ${r.targetGhl}`);
  }

  if (DRY_RUN) {
    log('\nPass without --dry-run to apply.');
    return;
  }

  log('\nPushing to GHL...');
  let ok = 0, err = 0;
  for (const r of toApply) {
    try {
      await pushToGhl(r.ghlId, r.targetGhl);
      log(`  ✓ ${r.name?.slice(0, 50)}`);
      ok++;
      await sleep(150);
    } catch (e) {
      log(`  ✗ ${r.name?.slice(0, 50)}: ${e.message}`);
      err++;
    }
  }
  log(`\nDone: ${ok} applied, ${err} errors`);

  if (!SKIP_REFRESH && ok > 0) {
    log('\nRefreshing Supabase mirror + Notion DB...');
    try {
      execSync(`node ${join(__dirname, 'sync-ghl-to-supabase.mjs')}`, { stdio: 'inherit' });
      execSync(`node ${join(__dirname, 'sync-opportunities-to-notion-db.mjs')} --source ghl`, { stdio: 'inherit' });
      log('Refresh complete.');
    } catch (e) {
      log(`Refresh failed: ${e.message}`);
    }
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
