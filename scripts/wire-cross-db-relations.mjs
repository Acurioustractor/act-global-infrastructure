#!/usr/bin/env node
/**
 * Wire cross-database relations + backfill matches.
 *
 * Relations:
 *   Opportunities  → Entity Hub (Linked Org)        — match by canonical name
 *   Action Items   → Opportunities (Linked Opp)    — match by mention in Description
 *   Action Items   → Decisions Log (Linked Decision) — manual at create time
 *   Standard Ledger Q&A → Decisions Log (Linked Decision) — manual
 *
 * Run once to add properties + backfill. Re-runnable: only adds missing.
 */

import { Client } from '@notionhq/client';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const cfgPath = join(__dirname, '..', 'config', 'notion-database-ids.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const canonical = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '');

async function addRelationProp(dataSourceId, propName, targetDsId) {
  const ds = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
  if (ds.properties[propName]) {
    log(`  ${propName} already exists, skipping add`);
    return;
  }
  await notion.dataSources.update({
    data_source_id: dataSourceId,
    properties: {
      [propName]: { relation: { data_source_id: targetDsId, type: 'single_property', single_property: {} } },
    },
  });
  log(`  ✓ Added relation property: ${propName} → ${targetDsId.slice(0, 8)}`);
}

async function fetchAllRows(dsId) {
  const rows = [];
  let cursor;
  do {
    const res = await notion.dataSources.query({ data_source_id: dsId, page_size: 100, start_cursor: cursor });
    rows.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return rows;
}

function getProp(page, propName, type) {
  const p = page.properties[propName];
  if (!p) return null;
  if (type === 'title') return p.title?.[0]?.plain_text;
  if (type === 'rich_text') return p.rich_text?.[0]?.plain_text;
  if (type === 'select') return p.select?.name;
  return null;
}

async function main() {
  log('=== Cross-DB relations ===');

  // 1. Opportunities → Entity Hub
  log('\n--- Opportunities ↔ Entity Hub ---');
  await addRelationProp(cfg.opportunitiesDataSource, 'Linked Org', cfg.entityHubDataSource);
  await sleep(500);

  log('  Loading entities...');
  const entityRows = await fetchAllRows(cfg.entityHubDataSource);
  const entityByCanonical = new Map();
  for (const e of entityRows) {
    const cName = getProp(e, 'Canonical Name', 'rich_text');
    if (cName) entityByCanonical.set(cName, e.id);
  }
  log(`  ${entityByCanonical.size} entities indexed`);

  log('  Loading opportunities...');
  const oppRows = await fetchAllRows(cfg.opportunitiesDataSource);
  log(`  ${oppRows.length} opportunities`);

  let matched = 0, unmatched = 0;
  for (const opp of oppRows) {
    // Skip if already has linked org
    if (opp.properties['Linked Org']?.relation?.length > 0) continue;

    // Use Funder/Contact field if present, else Name
    const funderContact = getProp(opp, 'Funder / Contact', 'rich_text') || getProp(opp, 'Name', 'title');
    if (!funderContact) { unmatched++; continue; }

    const c = canonical(funderContact);
    const entityId = entityByCanonical.get(c);
    if (!entityId) { unmatched++; continue; }

    try {
      await notion.pages.update({
        page_id: opp.id,
        properties: { 'Linked Org': { relation: [{ id: entityId }] } },
      });
      matched++;
      if (matched % 50 === 0) log(`    ${matched} matched...`);
      await sleep(120);
    } catch (e) {
      // ignore individual errors
    }
  }
  log(`  ✓ ${matched} opps linked to entities, ${unmatched} unmatched`);

  // 2. Action Items → Decisions Log
  log('\n--- Action Items ↔ Decisions Log ---');
  await addRelationProp(cfg.actionItemsDataSource, 'Linked Decision', cfg.decisionsLogDataSource);
  await sleep(300);

  // 3. Standard Ledger Q&A → Decisions Log
  log('\n--- Standard Ledger Q&A ↔ Decisions Log ---');
  await addRelationProp(cfg.ledgerQADataSource, 'Resulted in Decision', cfg.decisionsLogDataSource);
  await sleep(300);

  // 4. Action Items → Opportunities (no automatic backfill — too noisy to do by name)
  log('\n--- Action Items ↔ Opportunities ---');
  await addRelationProp(cfg.actionItemsDataSource, 'Linked Opportunity', cfg.opportunitiesDataSource);
  await sleep(300);

  // 5. Decisions Log → Stakeholders (for family decisions)
  log('\n--- Decisions Log ↔ Stakeholders ---');
  await addRelationProp(cfg.decisionsLogDataSource, 'Affects Stakeholder', cfg.stakeholdersDataSource);
  await sleep(300);

  log('\n=== Done ===');
  log(`Manual linkages — set them as you create new rows. Auto-backfill done for Opportunities ↔ Entity Hub (${matched} matched).`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
