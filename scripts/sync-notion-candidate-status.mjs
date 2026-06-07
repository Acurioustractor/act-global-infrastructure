#!/usr/bin/env node
/**
 * Notion `Newsletter candidates` DB → Supabase newsletter_candidates.status + audiences.
 *
 * One-way read of status changes from Notion (where humans tap
 * include/exclude/defer) back to Supabase (where the drafter reads).
 *
 * Doesn't touch the immutable fields (title, source_type, etc) — those
 * flow the other direction via sync-candidates-to-notion.mjs.
 *
 * Env:
 *   NOTION_MIRROR_TOKEN
 *   NOTION_NEWSLETTER_CANDIDATES_DB_ID (or config/notion-database-ids.json)
 *   SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL
 *
 * Usage:
 *   node scripts/sync-notion-candidate-status.mjs           # dry-run
 *   node scripts/sync-notion-candidate-status.mjs --apply
 *
 * PM2 cron: every 30 min during business hours (09:00, 09:30, 10:00, ... 18:00 AEST)
 *   `0,30 9-18 * * *`
 *
 * Plan: act-communication-pipeline-2026-05-23-locked
 */

import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const apply = args.includes('--apply');

const NOTION_TOKEN = process.env.NOTION_MIRROR_TOKEN;
let NOTION_DB = process.env.NOTION_NEWSLETTER_CANDIDATES_DB_ID;
if (!NOTION_DB) {
  const cfgPath = '/Users/benknight/Code/act-global-infrastructure/config/notion-database-ids.json';
  if (existsSync(cfgPath)) {
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
    NOTION_DB = cfg.newsletterCandidates;
  }
}
if (!NOTION_TOKEN) { console.error('Missing NOTION_MIRROR_TOKEN'); process.exit(1); }
if (!NOTION_DB) { console.error('Missing newsletterCandidates DB ID — see sync-candidates-to-notion.mjs for setup'); process.exit(1); }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

let lastNotionAt = 0;
async function notionFetch(path, init = {}, attempt = 0) {
  const dt = Date.now() - lastNotionAt;
  if (dt < 350) await new Promise(r => setTimeout(r, 350 - dt));
  lastNotionAt = Date.now();
  let r;
  try {
    r = await fetch(`${NOTION_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
  } catch (netErr) {
    if (attempt < 4) {
      await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
      return notionFetch(path, init, attempt + 1);
    }
    throw netErr;
  }
  if ((r.status >= 500 || r.status === 429) && attempt < 4) {
    await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
    return notionFetch(path, init, attempt + 1);
  }
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Notion ${r.status} ${path}: ${body.slice(0, 300)}`);
  }
  return r.json();
}

async function queryAllPages() {
  let cursor;
  const pages = [];
  do {
    const data = await notionFetch(`/databases/${NOTION_DB}/query`, {
      method: 'POST',
      body: JSON.stringify({
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return pages;
}

function readStatusFromPage(page) {
  return page.properties?.Status?.select?.name || 'proposed';
}

function readAudiencesFromPage(page) {
  return (page.properties?.Audiences?.multi_select || []).map(s => s.name);
}

async function main() {
  console.log('🔄 Reading Notion candidates DB...');
  const pages = await queryAllPages();
  console.log(`📦 ${pages.length} Notion candidate pages`);

  // Build map of notion_page_id → {status, audiences}
  const desired = new Map();
  for (const p of pages) {
    desired.set(p.id, {
      status: readStatusFromPage(p),
      audiences: readAudiencesFromPage(p),
    });
  }

  // Fetch current Supabase state
  const { data: rows, error } = await supabase
    .from('newsletter_candidates')
    .select('id, notion_page_id, status, audiences, status_changed_at')
    .not('notion_page_id', 'is', null)
    .in('notion_page_id', [...desired.keys()]);
  if (error) throw error;

  let drift = 0;
  const updates = [];
  for (const row of rows) {
    const d = desired.get(row.notion_page_id);
    if (!d) continue;
    const audChanged =
      JSON.stringify((row.audiences || []).slice().sort()) !==
      JSON.stringify(d.audiences.slice().sort());
    const statusChanged = row.status !== d.status;
    if (statusChanged || audChanged) {
      drift++;
      updates.push({
        id: row.id,
        notion_page_id: row.notion_page_id,
        old_status: row.status,
        new_status: d.status,
        old_audiences: row.audiences,
        new_audiences: d.audiences,
      });
    }
  }

  console.log(`📐 Detected ${drift} candidate(s) with Notion-side changes`);
  for (const u of updates.slice(0, 10)) {
    const statusStr = u.old_status === u.new_status ? '' : ` status=${u.old_status}→${u.new_status}`;
    const audStr = JSON.stringify(u.old_audiences) === JSON.stringify(u.new_audiences)
      ? ''
      : ` aud=${JSON.stringify(u.old_audiences)}→${JSON.stringify(u.new_audiences)}`;
    console.log(`  ${u.id.slice(0,8)}${statusStr}${audStr}`);
  }
  if (updates.length > 10) console.log(`  ...and ${updates.length - 10} more`);

  if (!apply) {
    console.log('\n[DRY RUN — no Supabase writes. Re-run with --apply.]');
    return;
  }

  let applied = 0, failed = 0;
  for (const u of updates) {
    const patch = {
      status: u.new_status,
      audiences: u.new_audiences.length ? u.new_audiences : null,
      status_changed_at: new Date().toISOString(),
      status_changed_by: 'notion-sync',
    };
    const { error } = await supabase
      .from('newsletter_candidates')
      .update(patch)
      .eq('id', u.id);
    if (error) { failed++; console.error(`  fail ${u.id.slice(0,8)}: ${error.message}`); }
    else applied++;
  }
  console.log(`✓ Applied ${applied}, failed ${failed}`);
}

main().catch((e) => {
  console.error('Sync failed:', e);
  process.exit(1);
});
