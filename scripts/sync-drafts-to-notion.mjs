#!/usr/bin/env node
/**
 * Supabase newsletter_drafts → Notion `Newsletter drafts` DB.
 *
 * One-way sync of draft state. Notion is the surface where Ben reviews,
 * picks subject, edits body, and toggles status to send-ready. Status
 * read-back flows via sync-notion-draft-status.mjs (Day 4).
 *
 * Source of truth split:
 *   Supabase: edition_slug, audience, recipient_slug, edition_period,
 *             body_md, subject_candidates, candidate_ids, voice_grade_*,
 *             consent_warnings — set by the drafter, not edited in Notion
 *   Notion:   status (Ben taps send-ready), selected_subject (Ben picks),
 *             body_md edits (Ben tweaks the draft) — read back in Day 4
 *
 * Env:
 *   NOTION_MIRROR_TOKEN
 *   NOTION_NEWSLETTER_DRAFTS_DB_ID (or config/notion-database-ids.json)
 *
 * Usage:
 *   node scripts/sync-drafts-to-notion.mjs           # dry-run
 *   node scripts/sync-drafts-to-notion.mjs --apply
 *
 * PM2 cron: every 10 min (catches new drafts soon after the drafter runs)
 *   '* /10 * * * *' (every 10 minutes — comment escaped to avoid JS block-end)
 *
 * Plan: act-communication-pipeline-2026-05-23-locked
 */

import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const apply = args.includes('--apply');

const NOTION_TOKEN = process.env.NOTION_MIRROR_TOKEN;
let NOTION_DB = process.env.NOTION_NEWSLETTER_DRAFTS_DB_ID;
if (!NOTION_DB) {
  const cfgPath = '/Users/benknight/Code/act-global-infrastructure/config/notion-database-ids.json';
  if (existsSync(cfgPath)) {
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
    NOTION_DB = cfg.newsletterDrafts;
  }
}
if (!NOTION_TOKEN) { console.error('Missing NOTION_MIRROR_TOKEN'); process.exit(1); }
if (!NOTION_DB) {
  console.error('Missing newsletterDrafts DB ID — set NOTION_NEWSLETTER_DRAFTS_DB_ID');
  console.error('  OR add to config/notion-database-ids.json: { "newsletterDrafts": "<page-id>" }');
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

function draftToProperties(d) {
  const props = {
    'Edition slug':       { title: [{ text: { content: d.edition_slug } }] },
    'Audience':           { select: { name: d.audience } },
    'Recipient':          { rich_text: d.recipient_slug ? [{ text: { content: d.recipient_slug } }] : [] },
    'Edition period':     { rich_text: d.edition_period ? [{ text: { content: d.edition_period } }] : [] },
    'Status':             { select: { name: d.status } },
    'Selected subject':   { rich_text: d.selected_subject ? [{ text: { content: d.selected_subject.slice(0, 1900) } }] : [] },
    'Subject candidates': { rich_text: (d.subject_candidates || []).length
                              ? [{ text: { content: d.subject_candidates.map((s, i) => `${i + 1}. ${s}`).join('\n').slice(0, 1900) } }]
                              : [] },
    'Voice grade score':  d.voice_grade_score == null ? { number: null } : { number: d.voice_grade_score },
    'Consent warnings':   { rich_text: d.consent_warnings
                              ? [{ text: { content: JSON.stringify(d.consent_warnings).slice(0, 1900) } }]
                              : [] },
    'Double confirmed':   { checkbox: !!d.double_confirmed },
    'Sent at':            { date: d.sent_at ? { start: d.sent_at } : null },
    'GHL campaign ID':    { rich_text: d.ghl_campaign_id ? [{ text: { content: d.ghl_campaign_id } }] : [] },
    'Send error':         { rich_text: d.send_error ? [{ text: { content: d.send_error.slice(0, 1900) } }] : [] },
  };
  return props;
}

function bodyToBlocks(bodyMd) {
  // Naive markdown → Notion paragraph blocks. Splits on blank lines.
  // For richer rendering, lib/notion-md-blocks.mjs has a fuller converter,
  // but for newsletter drafts a flat paragraph layout is fine — the body
  // is short prose, not deep structure.
  if (!bodyMd) return [];
  const paragraphs = bodyMd.split(/\n{2,}/).filter(Boolean);
  return paragraphs.map(p => ({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: p.slice(0, 1900) } }],
    },
  }));
}

async function createPage(d) {
  const res = await notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: NOTION_DB },
      properties: draftToProperties(d),
      children: bodyToBlocks(d.body_md),
    }),
  });
  return res.id;
}

async function updatePage(pageId, d) {
  await notionFetch(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties: draftToProperties(d) }),
  });
  // Notion doesn't support replacing all children atomically; for now,
  // body edits live in Notion only after first sync. If draft is regenerated,
  // body_md will lag the Notion content. Acceptable trade-off for MVP.
}

async function main() {
  // Pull drafts that need a Notion page (notion_page_id IS NULL)
  // OR were updated by drafter recently (status='drafting' or 'graded')
  const { data: drafts, error } = await supabase
    .from('newsletter_drafts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;

  const toCreate = drafts.filter(d => !d.notion_page_id);
  const toUpdate = drafts.filter(d => d.notion_page_id && ['drafting', 'graded'].includes(d.status));
  console.log(`📦 ${drafts.length} total drafts (${toCreate.length} to create in Notion, ${toUpdate.length} property-update)`);

  if (!apply) {
    console.log('\n[DRY RUN — no Notion writes. Re-run with --apply.]');
    for (const d of toCreate) {
      console.log(`  CREATE ${d.edition_slug} — ${d.status} — ${d.voice_grade_score || '?'}/100`);
    }
    for (const d of toUpdate.slice(0, 5)) {
      console.log(`  UPDATE ${d.edition_slug} — ${d.status} — ${d.voice_grade_score || '?'}/100`);
    }
    return;
  }

  let created = 0, updated = 0, failed = 0;
  for (const d of toCreate) {
    try {
      const pageId = await createPage(d);
      await supabase.from('newsletter_drafts').update({ notion_page_id: pageId }).eq('id', d.id);
      created++;
      console.log(`  ✓ created ${d.edition_slug}`);
    } catch (e) {
      console.error(`  ✗ ${d.edition_slug}: ${e.message.slice(0, 200)}`);
      failed++;
    }
  }
  for (const d of toUpdate) {
    try {
      await updatePage(d.notion_page_id, d);
      updated++;
    } catch (e) {
      console.error(`  ✗ ${d.edition_slug}: ${e.message.slice(0, 200)}`);
      failed++;
    }
  }
  console.log(`✓ Created ${created}, updated ${updated}, failed ${failed}`);
}

main().catch((e) => {
  console.error('Sync failed:', e);
  process.exit(1);
});
