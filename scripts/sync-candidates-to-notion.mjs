#!/usr/bin/env node
/**
 * Supabase newsletter_candidates → Notion `Newsletter candidates` DB.
 *
 * One-way write of new candidates + status changes from Supabase. The
 * reverse direction (human taps include/exclude in Notion → status back
 * to Supabase) lives in sync-notion-candidate-status.mjs.
 *
 * Source of truth split:
 *   Supabase: title, summary, url, event_date, source_*, auto_audiences,
 *             payload — never change post-insert, sync once on create
 *   Notion:   status (human taps), audiences override, notes — read back
 *             via the companion script
 *
 * Env:
 *   NOTION_MIRROR_TOKEN
 *   NOTION_NEWSLETTER_CANDIDATES_DB_ID (or fallback to
 *     config/notion-database-ids.json newsletterCandidates)
 *   SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL
 *
 * Usage:
 *   node scripts/sync-candidates-to-notion.mjs           # dry-run
 *   node scripts/sync-candidates-to-notion.mjs --apply
 *
 * PM2 cron: 35 7 * * * (daily 7:35am AEST, 5min after newsletter-candidates-sync)
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
  // Fallback: read from config/notion-database-ids.json
  const cfgPath = '/Users/benknight/Code/act-global-infrastructure/config/notion-database-ids.json';
  if (existsSync(cfgPath)) {
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
    NOTION_DB = cfg.newsletterCandidates;
  }
}

if (!NOTION_TOKEN) { console.error('Missing NOTION_MIRROR_TOKEN'); process.exit(1); }
if (!NOTION_DB) {
  console.error('Missing newsletterCandidates DB ID — set NOTION_NEWSLETTER_CANDIDATES_DB_ID');
  console.error('  OR add to config/notion-database-ids.json: { "newsletterCandidates": "<page-id>" }');
  console.error('  See thoughts/shared/plans/newsletter-notion-db-schemas.md for the schema.');
  process.exit(1);
}

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

function candidateToNotionProperties(c) {
  return {
    'Title':            { title: [{ text: { content: (c.title || '').slice(0, 1900) } }] },
    'Status':           { status: { name: c.status } },
    'Auto audiences':   { multi_select: (c.auto_audiences || []).map(a => ({ name: a })) },
    'Audiences':        { multi_select: (c.audiences || []).map(a => ({ name: a })) },
    'Source type':      { select: { name: c.source_type } },
    'Source repo':      { rich_text: c.source_repo ? [{ text: { content: c.source_repo } }] : [] },
    'Source URL':       { url: c.url || null },
    'Event date':       { date: c.event_date ? { start: c.event_date } : null },
    'Project codes':    { multi_select: (c.project_codes || []).map(p => ({ name: p })) },
    'Storyteller IDs':  { multi_select: (c.storyteller_ids || []).map(s => ({ name: s })) },
    'Consent visibility': c.consent_visibility ? { select: { name: c.consent_visibility } } : { select: null },
    'Synced at':        { date: { start: new Date().toISOString() } },
  };
}

async function createNotionPage(c) {
  const res = await notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: NOTION_DB },
      properties: candidateToNotionProperties(c),
    }),
  });
  return res.id;
}

async function updateNotionPage(pageId, c) {
  await notionFetch(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties: candidateToNotionProperties(c) }),
  });
}

async function main() {
  // Pull candidates that need a Notion page (no notion_page_id yet) OR were
  // status-changed in Supabase since the last sync (rare — usually status
  // flows Notion→Supabase, but we cover the reverse for completeness).
  const { data: candidates, error } = await supabase
    .from('newsletter_candidates')
    .select('*')
    .or('notion_page_id.is.null,status_changed_at.gt.created_at')
    .order('event_date', { ascending: false })
    .limit(200);
  if (error) throw error;

  const toCreate = candidates.filter(c => !c.notion_page_id);
  const toUpdate = candidates.filter(c => c.notion_page_id);
  console.log(`📦 ${candidates.length} candidates needing sync (${toCreate.length} to create, ${toUpdate.length} to update)`);

  if (!apply) {
    console.log('\n[DRY RUN — no Notion writes. Re-run with --apply.]');
    console.log('Sample to create:');
    for (const c of toCreate.slice(0, 5)) {
      console.log(`  ${(c.auto_audiences || []).join('+').padEnd(20)} ${c.title.slice(0, 80)}`);
    }
    return;
  }

  let created = 0, updated = 0, failed = 0;
  for (const c of toCreate) {
    try {
      const pageId = await createNotionPage(c);
      await supabase
        .from('newsletter_candidates')
        .update({ notion_page_id: pageId })
        .eq('id', c.id);
      created++;
    } catch (e) {
      console.error(`  fail create ${c.id.slice(0,8)}: ${e.message.slice(0, 120)}`);
      failed++;
    }
  }
  for (const c of toUpdate) {
    try {
      await updateNotionPage(c.notion_page_id, c);
      updated++;
    } catch (e) {
      console.error(`  fail update ${c.id.slice(0,8)}: ${e.message.slice(0, 120)}`);
      failed++;
    }
  }
  console.log(`✓ Created ${created}, updated ${updated}, failed ${failed}`);
}

main().catch((e) => {
  console.error('Sync failed:', e);
  process.exit(1);
});
