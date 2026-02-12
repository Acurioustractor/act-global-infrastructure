#!/usr/bin/env node
/**
 * Sync Contacts to Notion People Directory
 *
 * Pushes GHL contacts from Supabase to a Notion People Directory database.
 * Creates a browsable, searchable directory of all contacts with engagement
 * status, project links, and last contact date.
 *
 * Data flow:
 *   Supabase ghl_contacts → Notion People Directory DB
 *
 * Respects cultural protocols — sensitive fields (is_elder, cultural data)
 * stay in Supabase only and are NOT pushed to Notion.
 *
 * Usage:
 *   node scripts/sync-contacts-to-notion.mjs              # Full sync
 *   node scripts/sync-contacts-to-notion.mjs --dry-run    # Preview
 *   node scripts/sync-contacts-to-notion.mjs --verbose    # Detailed
 *   node scripts/sync-contacts-to-notion.mjs --limit 50   # Limit contacts
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 500;

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const notionDbIds = JSON.parse(readFileSync(join(__dirname, '..', 'config', 'notion-database-ids.json'), 'utf-8'));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function verbose(msg) {
  if (VERBOSE) log(msg);
}

// ============================================
// Fetch Contacts
// ============================================

async function fetchContacts() {
  const { data, error } = await supabase
    .from('ghl_contacts')
    .select('id, ghl_id, first_name, last_name, full_name, email, phone, company_name, tags, projects, engagement_status, first_contact_date, last_contact_date, is_storyteller, canonical_entity_id')
    .order('last_contact_date', { ascending: false, nullsFirst: false })
    .limit(LIMIT);

  if (error) {
    log(`Error fetching contacts: ${error.message}`);
    return [];
  }
  return data || [];
}

// ============================================
// Get existing Notion pages to avoid duplicates
// ============================================

async function getExistingContacts(databaseId) {
  const existing = new Map();
  let cursor;

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });

    for (const page of response.results) {
      const ghlIdProp = page.properties['GHL ID'];
      if (ghlIdProp?.rich_text?.[0]?.plain_text) {
        existing.set(ghlIdProp.rich_text[0].plain_text, page.id);
      }
    }

    cursor = response.has_more ? response.next_cursor : null;
    if (cursor) await sleep(350);
  } while (cursor);

  return existing;
}

// ============================================
// Upsert Contact to Notion
// ============================================

function buildContactProperties(contact) {
  const name = contact.full_name
    || [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim()
    || contact.email
    || 'Unknown';

  const properties = {
    'Name': { title: [{ text: { content: name } }] },
    'Email': { email: contact.email || null },
    'Phone': { phone_number: contact.phone || null },
    'Organization': { rich_text: contact.company_name ? [{ text: { content: contact.company_name } }] : [] },
    'Engagement': { select: contact.engagement_status ? { name: contact.engagement_status } : null },
    'GHL ID': { rich_text: [{ text: { content: contact.ghl_id || contact.id } }] },
  };

  // Projects as multi-select
  if (contact.projects && Array.isArray(contact.projects) && contact.projects.length > 0) {
    properties['Projects'] = {
      multi_select: contact.projects.slice(0, 10).map(p => ({ name: String(p) })),
    };
  }

  // Tags as multi-select
  if (contact.tags && Array.isArray(contact.tags) && contact.tags.length > 0) {
    properties['Tags'] = {
      multi_select: contact.tags.slice(0, 10).map(t => ({ name: String(t) })),
    };
  }

  // Last Contact Date
  if (contact.last_contact_date) {
    properties['Last Contact'] = { date: { start: contact.last_contact_date.split('T')[0] } };
  }

  // First Contact Date
  if (contact.first_contact_date) {
    properties['First Contact'] = { date: { start: contact.first_contact_date.split('T')[0] } };
  }

  // Storyteller flag
  if (contact.is_storyteller) {
    properties['Storyteller'] = { checkbox: true };
  }

  return properties;
}

async function upsertContact(contact, databaseId, existingMap) {
  const ghlId = contact.ghl_id || contact.id;
  const notionPageId = existingMap.get(ghlId);
  const properties = buildContactProperties(contact);
  const name = properties['Name'].title[0].text.content;

  if (notionPageId) {
    verbose(`  Updating: ${name}`);
    if (!DRY_RUN) {
      await notion.pages.update({ page_id: notionPageId, properties });
      await sleep(300);
    }
    return 'updated';
  } else {
    verbose(`  Creating: ${name}`);
    if (!DRY_RUN) {
      await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
      });
      await sleep(300);
    }
    return 'created';
  }
}

// ============================================
// Main
// ============================================

async function main() {
  log('=== Contacts → Notion People Directory Sync ===');
  if (DRY_RUN) log('DRY RUN MODE');

  const databaseId = notionDbIds.peopleDirectory;
  if (!databaseId) {
    log('ERROR: No peopleDirectory DB ID in config/notion-database-ids.json');
    log('Create a "People Directory" database in Notion and add its ID.');
    process.exit(1);
  }

  // Fetch contacts
  const contacts = await fetchContacts();
  log(`Found ${contacts.length} contacts to sync`);

  if (contacts.length === 0) {
    log('No contacts to sync');
    return;
  }

  // Get existing Notion pages
  log('Loading existing Notion pages...');
  const existingMap = await getExistingContacts(databaseId);
  log(`Found ${existingMap.size} existing contacts in Notion`);

  // Sync
  const stats = { created: 0, updated: 0, errors: 0 };
  for (const contact of contacts) {
    try {
      const result = await upsertContact(contact, databaseId, existingMap);
      stats[result]++;
    } catch (err) {
      const name = contact.full_name || contact.email || contact.id;
      log(`  Error syncing "${name}": ${err.message}`);
      stats.errors++;
    }
  }

  log(`\nResults: ${stats.created} created, ${stats.updated} updated, ${stats.errors} errors`);
  log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
