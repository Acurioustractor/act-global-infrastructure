#!/usr/bin/env node
/**
 * BAS Quarterly → Notion. Keeps the BAS Quarterly database fresh with
 * `xero_invoices` aggregates per quarter. Runs weekly Mon morning (BAS state
 * changes weekly at most).
 *
 * Self-bootstrapping: on first run, searches under cfg.moneyFramework for a
 * child database titled "BAS Quarterly" (or matches partial), persists its ID
 * to config/notion-database-ids.json as `basQuarterlyDb`. Subsequent runs
 * read straight from cfg.
 *
 * What it touches:
 *   - Updates metric fields per quarter row: Total invoices, AR outstanding,
 *     AP outstanding, AP missing receipts count, AP missing receipts amount.
 *   - Creates a quarter row if it doesn't exist (e.g. when FY rolls over).
 *   - Does NOT touch Status (Ben manages: In progress / Lodged / Reconciled).
 *   - Does NOT touch Notes.
 *   - Does NOT delete past-FY rows (history stays).
 *
 * Usage:
 *   node scripts/sync-bas-quarterly-to-notion.mjs              # full run
 *   node scripts/sync-bas-quarterly-to-notion.mjs --dry-run    # preview, no writes
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
await import(join(__dirname, 'lib/load-env.mjs'));

const DRY_RUN = process.argv.includes('--dry-run');
const CONFIG_PATH = join(__dirname, '..', 'config', 'notion-database-ids.json');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;

// ─── self-bootstrap: discover BAS Quarterly DB by title ──────────────────
async function ensureBasQuarterlyDb() {
  if (cfg.basQuarterlyDb) {
    try {
      const db = await notion.databases.retrieve({ database_id: cfg.basQuarterlyDb });
      if (!db.archived && !db.in_trash) return cfg.basQuarterlyDb;
    } catch (e) {
      log(`Configured basQuarterlyDb ${cfg.basQuarterlyDb} not retrievable — re-discovering...`);
    }
  }
  log('Searching for "BAS Quarterly" database under cfg.moneyFramework...');
  const search = await notion.search({
    query: 'BAS Quarterly',
    filter: { value: 'database', property: 'object' },
  });
  const candidates = (search.results || []).filter((r) => {
    const title = (r.title || []).map((t) => t.plain_text || '').join('').toLowerCase();
    return title.includes('bas') && title.includes('quarter');
  });
  if (!candidates.length) {
    log('ERROR: no database named "BAS Quarterly" found. Run Prompt 1 from');
    log('  thoughts/shared/handoffs/2026-05-09-notion-ai-dashboard-prompts.md');
    log('to have Notion AI create it under the Money Framework page.');
    process.exit(2);
  }
  const dbId = candidates[0].id;
  cfg.basQuarterlyDb = dbId;
  if (!DRY_RUN) {
    writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n', 'utf-8');
    log(`Discovered basQuarterlyDb: ${dbId} — persisted to ${CONFIG_PATH}`);
  } else {
    log(`DRY-RUN: would persist basQuarterlyDb ${dbId}`);
  }
  return dbId;
}

// ─── compute quarter ranges for the current FY ──────────────────────────
function currentFyQuarterRanges() {
  const today = new Date();
  const fy = today.getMonth() + 1 >= 7 ? today.getFullYear() + 1 : today.getFullYear();
  const fyShort = `FY${String(fy).slice(2)}`;
  return [
    { label: `Q1 ${fyShort} (Jul-Sep)`, fy: fyShort, start: `${fy - 1}-07-01`, end: `${fy - 1}-09-30`, dueDate: `${fy - 1}-11-28` },
    { label: `Q2 ${fyShort} (Oct-Dec)`, fy: fyShort, start: `${fy - 1}-10-01`, end: `${fy - 1}-12-31`, dueDate: `${fy}-02-28` },
    { label: `Q3 ${fyShort} (Jan-Mar)`, fy: fyShort, start: `${fy}-01-01`, end: `${fy}-03-31`, dueDate: `${fy}-04-28` },
    { label: `Q4 ${fyShort} (Apr-Jun)`, fy: fyShort, start: `${fy}-04-01`, end: `${fy}-06-30`, dueDate: `${fy}-07-28` },
  ];
}

// ─── pull aggregates from xero_invoices per quarter ──────────────────────
async function fetchQuarterMetrics(q) {
  const { data, error } = await supabase
    .from('xero_invoices')
    .select('type, status, total, amount_due, has_attachments')
    .gte('date', q.start).lte('date', q.end);
  if (error) throw new Error(`xero_invoices query failed for ${q.label}: ${error.message}`);
  const rows = data || [];
  const apMissingRcpt = rows.filter((r) => r.type === 'ACCPAY' && r.status === 'AUTHORISED' && !r.has_attachments);
  return {
    total: rows.length,
    arOutstanding: rows.filter((r) => r.type === 'ACCREC' && Number(r.amount_due) > 0).reduce((s, r) => s + Number(r.amount_due || 0), 0),
    apOutstanding: rows.filter((r) => r.type === 'ACCPAY' && Number(r.amount_due) > 0).reduce((s, r) => s + Number(r.amount_due || 0), 0),
    apMissingRcptCount: apMissingRcpt.length,
    apMissingRcptAmount: apMissingRcpt.reduce((s, r) => s + Number(r.total || 0), 0),
  };
}

// ─── property-name resilient set helper (Notion AI may use slight variants) ─
function setNumber(props, candidates, value) {
  for (const c of candidates) {
    if (c in props) return { [c]: { number: value } };
  }
  // Fallback to first candidate name; will be created if Notion accepts it.
  return { [candidates[0]]: { number: value } };
}

async function findExistingRow(dbId, label) {
  // Find a row whose title matches the quarter label
  const r = await notion.databases.query({
    database_id: dbId,
    filter: { property: 'Quarter', title: { equals: label } },
    page_size: 1,
  });
  if (r.results?.length) return r.results[0];
  // Fallback: try other common title-property names
  for (const titleProp of ['Name', 'Title']) {
    try {
      const r2 = await notion.databases.query({
        database_id: dbId,
        filter: { property: titleProp, title: { equals: label } },
        page_size: 1,
      });
      if (r2.results?.length) return r2.results[0];
    } catch { /* property doesn't exist */ }
  }
  return null;
}

async function upsertQuarterRow(dbId, q, metrics) {
  const existing = await findExistingRow(dbId, q.label);
  const props = existing?.properties || {};

  // Build update payload — only touches metric fields, not Status / Notes
  const update = {
    ...setNumber(props, ['Total invoices', 'Invoices', 'Total Invoices'], metrics.total),
    ...setNumber(props, ['AR outstanding', 'AR Outstanding'], metrics.arOutstanding),
    ...setNumber(props, ['AP outstanding', 'AP Outstanding'], metrics.apOutstanding),
    ...setNumber(props, ['AP missing receipts count', 'Missing receipts count', 'AP Missing Receipts Count'], metrics.apMissingRcptCount),
    ...setNumber(props, ['AP missing receipts amount', 'Missing receipts amount', 'AP Missing Receipts Amount'], metrics.apMissingRcptAmount),
  };

  if (DRY_RUN) {
    log(`  [DRY] ${q.label}: ${existing ? 'UPDATE' : 'CREATE'} — ${metrics.total} inv · AR ${fmt(metrics.arOutstanding)} · AP ${fmt(metrics.apOutstanding)} · missing-rcpt ${metrics.apMissingRcptCount}`);
    return;
  }

  if (existing) {
    await notion.pages.update({ page_id: existing.id, properties: update });
    log(`  ✓ updated ${q.label}: ${metrics.total} inv · AR ${fmt(metrics.arOutstanding)} · AP ${fmt(metrics.apOutstanding)} · missing-rcpt ${metrics.apMissingRcptCount}`);
  } else {
    // Need a title property for create — try a few common names
    const titleProps = ['Quarter', 'Name', 'Title'];
    let createdAny = false;
    for (const tp of titleProps) {
      try {
        await notion.pages.create({
          parent: { database_id: dbId },
          properties: {
            [tp]: { title: [{ type: 'text', text: { content: q.label } }] },
            ...update,
          },
        });
        log(`  + created ${q.label} (title prop: ${tp})`);
        createdAny = true;
        break;
      } catch (e) {
        if (!e.message?.includes('property')) throw e;
      }
    }
    if (!createdAny) log(`  ! could not create ${q.label} — title property not found among ${titleProps.join('/')}`);
  }
}

async function main() {
  log('=== BAS Quarterly → Notion ===');
  if (!cfg.moneyFramework) { log('ERROR: cfg.moneyFramework missing'); process.exit(1); }

  const dbId = await ensureBasQuarterlyDb();
  const quarters = currentFyQuarterRanges();

  log(`Computing metrics for ${quarters.length} quarters...`);
  for (const q of quarters) {
    const metrics = await fetchQuarterMetrics(q);
    await upsertQuarterRow(dbId, q, metrics);
  }

  log(`Done. Open: notion.so/${dbId.replace(/-/g, '')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
