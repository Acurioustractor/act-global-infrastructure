#!/usr/bin/env node
/**
 * supporters_intelligence (Supabase) → Notion "Supporters" DB.
 *
 * Refreshes the Notion surface with the latest tier classifications,
 * $ totals, outstanding alerts, primary contacts, and framing notes.
 *
 * Env:
 *   NOTION_MIRROR_TOKEN
 *   NOTION_SUPPORTERS_DB_ID (or config/notion-database-ids.json:supporters)
 *
 * Usage:
 *   node scripts/sync-supporters-to-notion.mjs           # dry run
 *   node scripts/sync-supporters-to-notion.mjs --apply
 *
 * PM2 cron: daily 06:05am AEST (after build-supporters-intelligence at 06:00)
 *
 * Plan: act-communication-pipeline-2026-05-23-locked
 */

import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const apply = args.includes('--apply');

const NOTION_TOKEN = process.env.NOTION_MIRROR_TOKEN;
let NOTION_DB = process.env.NOTION_SUPPORTERS_DB_ID;
if (!NOTION_DB) {
  const cfgPath = '/Users/benknight/Code/act-global-infrastructure/config/notion-database-ids.json';
  if (existsSync(cfgPath)) {
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
    NOTION_DB = cfg.supporters;
  }
}
if (!NOTION_TOKEN) { console.error('Missing NOTION_MIRROR_TOKEN'); process.exit(1); }
if (!NOTION_DB) { console.error('Missing supporters DB ID'); process.exit(1); }

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

function toProperties(s) {
  return {
    'Name':                    { title: [{ text: { content: (s.name || '').slice(0, 1900) } }] },
    'Tier':                    { select: { name: s.tier } },
    'Stage':                   s.stage ? { select: { name: s.stage } } : { select: null },
    'Paid AUD':                { number: s.total_paid_aud == null ? null : Number(s.total_paid_aud) },
    'Outstanding AUD':         { number: s.outstanding_aud == null ? null : Number(s.outstanding_aud) },
    'Outstanding alert':       s.outstanding_alert ? { select: { name: s.outstanding_alert } } : { select: null },
    'Outstanding age days':    { number: s.outstanding_age_days == null ? null : Number(s.outstanding_age_days) },
    'Projects':                { multi_select: (s.projects || []).filter(Boolean).map(p => ({ name: p })) },
    'Primary contact':         { rich_text: s.primary_contact ? [{ text: { content: s.primary_contact.slice(0, 1900) } }] : [] },
    'Primary email':           { email: (s.primary_email || '').split(',')[0].trim() || null },
    'CC emails':               { rich_text: s.cc_email ? [{ text: { content: s.cc_email.slice(0, 1900) } }] : [] },
    'Last contact':            s.last_communicated_at ? { date: { start: s.last_communicated_at } } : { date: null },
    'Days since last contact': { number: s.days_since_last_contact == null ? null : Number(s.days_since_last_contact) },
    'First invoice date':      s.first_invoice_date ? { date: { start: s.first_invoice_date } } : { date: null },
    'Last invoice date':       s.last_invoice_date ? { date: { start: s.last_invoice_date } } : { date: null },
    'Invoice count':           { number: s.invoice_count == null ? null : Number(s.invoice_count) },
    'Tone':                    { rich_text: s.tone ? [{ text: { content: s.tone.slice(0, 1900) } }] : [] },
    'Framing notes':           { rich_text: s.framing_notes_excerpt ? [{ text: { content: s.framing_notes_excerpt.slice(0, 1900) } }] : [] },
    'Next report due':         s.next_report_due ? { date: { start: s.next_report_due } } : { date: null },
    'Next report name':        { rich_text: s.next_report_name ? [{ text: { content: s.next_report_name.slice(0, 1900) } }] : [] },
    'Slug':                    { rich_text: [{ text: { content: s.slug } }] },
    'Synced at':               { date: { start: new Date().toISOString() } },
  };
}

async function main() {
  // 1. Pull all supporters from Supabase
  const { data: supporters, error } = await supabase
    .from('supporters_intelligence')
    .select('*')
    .order('outstanding_aud', { ascending: false });
  if (error) throw error;
  console.log(`📦 ${supporters.length} supporters from Supabase`);

  // 2. Pull existing Notion pages so we can update vs create
  const existing = new Map(); // slug → notion_page_id
  let cursor;
  do {
    const data = await notionFetch(`/databases/${NOTION_DB}/query`, {
      method: 'POST',
      body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    for (const page of data.results) {
      const slugProp = page.properties?.Slug?.rich_text || [];
      const slug = slugProp[0]?.plain_text;
      if (slug) existing.set(slug, page.id);
    }
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  console.log(`📋 ${existing.size} pages already in Notion`);

  if (!apply) {
    const toCreate = supporters.filter(s => !existing.has(s.slug));
    const toUpdate = supporters.filter(s => existing.has(s.slug));
    console.log(`\n[DRY RUN — no Notion writes]`);
    console.log(`  Would create: ${toCreate.length}`);
    console.log(`  Would update: ${toUpdate.length}`);
    for (const s of supporters.slice(0, 8)) {
      console.log(`    ${s.tier.padEnd(11)} ${s.outstanding_alert.padEnd(8)} $${(s.total_paid_aud||0).toFixed(0).padStart(8)} / $${(s.outstanding_aud||0).toFixed(0).padStart(8)} ${s.name.slice(0, 50)}`);
    }
    console.log(`    ...and ${supporters.length - 8} more`);
    return;
  }

  // 3. Upsert each supporter
  let created = 0, updated = 0, failed = 0;
  for (const s of supporters) {
    try {
      const props = toProperties(s);
      if (existing.has(s.slug)) {
        await notionFetch(`/pages/${existing.get(s.slug)}`, {
          method: 'PATCH',
          body: JSON.stringify({ properties: props }),
        });
        updated++;
      } else {
        const res = await notionFetch('/pages', {
          method: 'POST',
          body: JSON.stringify({
            parent: { database_id: NOTION_DB },
            properties: props,
          }),
        });
        await supabase.from('supporters_intelligence').update({ notion_page_id: res.id }).eq('slug', s.slug);
        created++;
      }
    } catch (e) {
      console.error(`  ✗ ${s.slug}: ${e.message.slice(0, 180)}`);
      failed++;
    }
  }
  console.log(`\n✓ Created ${created}, updated ${updated}, failed ${failed}`);
}

main().catch(e => { console.error('Sync failed:', e); process.exit(1); });
