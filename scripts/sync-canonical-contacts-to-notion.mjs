#!/usr/bin/env node
/**
 * Sync canonical contacts (Supabase v_canonical_contacts) → Notion database.
 *
 * Phase 1 of wiki/decisions/2026-05-14-notion-platform-architecture.md
 * (Path B — Notion REST API, since the Workers CLI auth is broken on this
 *  account. Same pattern as the 17 existing sync-*-to-notion.mjs scripts.)
 *
 * Target database: "ACT Contacts (canonical)" in The ACT Farm workspace,
 * created by this script's predecessor under the Mission Control page.
 *
 * Cultural-sensitivity columns are deliberately not mirrored — see ADR.
 *
 * Env (set in ~/Code/act-global-infrastructure/.env.local):
 *   NOTION_MIRROR_TOKEN          internal integration token (ntn_*)
 *   NOTION_CONTACTS_DB_ID        target database id
 *   SUPABASE_SHARED_URL          Supabase URL
 *   SUPABASE_SHARED_SERVICE_ROLE_KEY  Supabase service role key
 *
 * Usage:
 *   node scripts/sync-canonical-contacts-to-notion.mjs          # dry-run
 *   node scripts/sync-canonical-contacts-to-notion.mjs --apply
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));
const { buildProjectTagMap, deriveProjectCodes } = await import(join(__dirname, 'lib/project-code-resolver.mjs'));

const APPLY = process.argv.includes('--apply');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX > -1 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : null;

const NOTION_TOKEN = process.env.NOTION_MIRROR_TOKEN;
const NOTION_DB = process.env.NOTION_CONTACTS_DB_ID;
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

for (const [k, v] of Object.entries({ NOTION_MIRROR_TOKEN: NOTION_TOKEN, NOTION_CONTACTS_DB_ID: NOTION_DB, SUPABASE_URL, SUPABASE_KEY })) {
  if (!v) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// ──────────────────────────────────────────────────────────────────────
// Notion helpers (rate-limited to 3 req/sec — Notion's burst cap)
// ──────────────────────────────────────────────────────────────────────

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
      const backoff = 1000 * Math.pow(2, attempt);
      console.warn(`  net error on ${path} (attempt ${attempt + 1}/5): ${netErr.message} — retry in ${backoff}ms`);
      await new Promise(r => setTimeout(r, backoff));
      return notionFetch(path, init, attempt + 1);
    }
    throw netErr;
  }
  if (r.status >= 500 || r.status === 429) {
    if (attempt < 4) {
      const backoff = 1000 * Math.pow(2, attempt);
      console.warn(`  Notion ${r.status} on ${path} (attempt ${attempt + 1}/5) — retry in ${backoff}ms`);
      await new Promise(r => setTimeout(r, backoff));
      return notionFetch(path, init, attempt + 1);
    }
  }
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Notion ${r.status} ${path}: ${body.slice(0, 300)}`);
  }
  return r.json();
}

async function findPageByGhlId(ghlId) {
  const data = await notionFetch(`/databases/${NOTION_DB}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter: { property: 'GHL ID', rich_text: { equals: ghlId } },
      page_size: 1,
    }),
  });
  return data.results[0]?.id || null;
}

// ──────────────────────────────────────────────────────────────────────
// Supabase fetch (paginated v_canonical_contacts)
// ──────────────────────────────────────────────────────────────────────

async function fetchAllCanonicalContacts() {
  const out = [];
  const page = 500;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('v_canonical_contacts')
      .select('ghl_id, full_name, first_name, last_name, email, phone, company_name, tags, projects, last_contact_date, newsletter_consent, is_storyteller, is_elder, empathy_ledger_id, canonical_entity_id, xero_contact_id, updated_at')
      .order('ghl_id', { ascending: true })
      .range(offset, offset + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...data);
    if (data.length < page) break;
    offset += page;
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// Row → Notion property mapping
// ──────────────────────────────────────────────────────────────────────

function bestName(r) {
  const full = (r.full_name || '').trim();
  if (full) return full;
  const joined = `${r.first_name || ''} ${r.last_name || ''}`.trim();
  if (joined) return joined;
  return r.email || r.ghl_id;
}

function richText(s) {
  return { rich_text: [{ text: { content: (s || '').slice(0, 2000) } }] };
}

// Notion multi-select options cannot contain commas. Tags in our data don't,
// but defensive: strip them. 100-char limit on option names; ours max 32.
function sanitizeOption(name) {
  return String(name).replace(/,/g, ' ').slice(0, 100);
}

function toProperties(r, directMap) {
  const tags = (r.tags || []).filter(Boolean);
  // Derive canonical ACT-XX codes from tags using the shared resolver —
  // r.projects is under-populated in ghl_contacts; tags are the truth.
  const projectCodes = deriveProjectCodes(tags, directMap);
  return {
    Name: { title: [{ text: { content: bestName(r) } }] },
    'GHL ID': richText(r.ghl_id),
    Email: { email: r.email || null },
    Phone: { phone_number: r.phone || null },
    Company: richText(r.company_name || ''),
    Projects: { multi_select: projectCodes.map(name => ({ name: sanitizeOption(name) })) },
    Tags: { multi_select: tags.slice(0, 100).map(t => ({ name: sanitizeOption(t) })) },
    'Last Contact': { date: r.last_contact_date ? { start: r.last_contact_date } : null },
    'Newsletter Consent': { checkbox: !!r.newsletter_consent },
    Storyteller: { checkbox: !!r.is_storyteller },
    Elder: { checkbox: !!r.is_elder },
    'EL Profile ID': richText(r.empathy_ledger_id || ''),
    'Xero Contact ID': richText(r.xero_contact_id || ''),
    'Canonical Entity': richText(r.canonical_entity_id || ''),
    'Last Synced': { date: { start: new Date().toISOString() } },
  };
}

// ──────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────

console.log(`sync-canonical-contacts-to-notion — ${APPLY ? 'APPLY' : 'DRY-RUN'}${LIMIT ? ` (limit ${LIMIT})` : ''}`);

const { directMap } = await buildProjectTagMap(supabase);
console.log(`Built project-tag map: ${directMap.size} tag aliases`);

const rows = await fetchAllCanonicalContacts();
console.log(`Loaded ${rows.length} canonical contacts from Supabase`);

const stats = { upserts: 0, updates: 0, creates: 0, errors: 0 };

let processed = 0;
for (const r of rows) {
  if (LIMIT && processed >= LIMIT) break;
  processed++;

  if (!APPLY) {
    if (processed <= 5) {
      const codes = deriveProjectCodes(r.tags || [], directMap);
      console.log(`  WOULD UPSERT  ${r.ghl_id.slice(0, 12)}  ${bestName(r)}  tags=${(r.tags || []).length}  projects=${codes.join(',') || '-'}`);
    }
    stats.upserts++;
    continue;
  }

  try {
    const existing = await findPageByGhlId(r.ghl_id);
    if (existing) {
      await notionFetch(`/pages/${existing}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties: toProperties(r, directMap) }),
      });
      stats.updates++;
    } else {
      await notionFetch(`/pages`, {
        method: 'POST',
        body: JSON.stringify({
          parent: { database_id: NOTION_DB },
          properties: toProperties(r, directMap),
        }),
      });
      stats.creates++;
    }
    stats.upserts++;
  } catch (e) {
    stats.errors++;
    if (stats.errors <= 5) console.error(`  err ${r.ghl_id}: ${e.message.slice(0, 200)}`);
  }

  if (processed % 50 === 0) {
    console.log(`  …processed ${processed}  upserts=${stats.upserts} updates=${stats.updates} creates=${stats.creates} errors=${stats.errors}`);
  }
}

console.log(`\n─── results ───`);
console.log(`processed: ${processed}`);
if (APPLY) {
  console.log(`upserts:   ${stats.upserts}`);
  console.log(`updates:   ${stats.updates}`);
  console.log(`creates:   ${stats.creates}`);
  console.log(`errors:    ${stats.errors}`);
} else {
  console.log(`Would upsert: ${stats.upserts}`);
  console.log(`Re-run with --apply to write.`);
}
