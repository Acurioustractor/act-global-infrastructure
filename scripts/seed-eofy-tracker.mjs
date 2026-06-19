#!/usr/bin/env node
/**
 * Seed the Notion "EOFY Setup Tracker" database from config/eofy-tracker-seed.json.
 *
 * One-time seed. After it lands in Notion, the Notion DB is the source of truth —
 * edit statuses there, not in the JSON. Safe to re-run: skips tasks whose title
 * already exists in the DB (dedupe by Task title), so it only adds missing rows.
 *
 * Usage:
 *   node scripts/seed-eofy-tracker.mjs --dry-run   # print what would be created
 *   node scripts/seed-eofy-tracker.mjs             # create missing rows in Notion
 *
 * Env: NOTION_TOKEN (from .env.local). Data source id read from
 *      config/notion-database-ids.json → eofyTrackerDataSource.
 */

import { Client } from '@notionhq/client'
import { config as loadEnv } from 'dotenv'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(__dirname, '..')
loadEnv({ path: path.join(REPO, '.env.local') })
loadEnv({ path: path.join(REPO, '.env') })

const DRY_RUN = process.argv.includes('--dry-run')

const SEED_PATH = path.join(REPO, 'config', 'eofy-tracker-seed.json')
const IDS_PATH = path.join(REPO, 'config', 'notion-database-ids.json')

const token = process.env.NOTION_TOKEN
if (!token) {
  console.error('✗ NOTION_TOKEN not set (.env.local)')
  process.exit(1)
}

const seed = JSON.parse(readFileSync(SEED_PATH, 'utf-8'))
const ids = JSON.parse(readFileSync(IDS_PATH, 'utf-8'))
const dataSourceId = ids.eofyTrackerDataSource
if (!dataSourceId) {
  console.error('✗ eofyTrackerDataSource not found in config/notion-database-ids.json')
  process.exit(1)
}

const notion = new Client({ auth: token })

function titleOf(page) {
  const prop = page.properties?.Task
  if (!prop || prop.type !== 'title') return ''
  return (prop.title ?? []).map((t) => t.plain_text ?? '').join('')
}

function buildProperties(item) {
  const props = {
    Task: { title: [{ text: { content: item.task } }] },
    Category: { select: { name: item.category } },
    // Status is a Notion "status"-type property (not select).
    Status: { status: { name: item.status } },
    Priority: { select: { name: item.priority } },
  }
  if (item.due) props.Due = { date: { start: item.due } }
  // Owner is a "people"-type property and can't be set from a plain name
  // (Standard Ledger / Broker aren't Notion users), so carry the owner in the
  // Evidence text instead of the Owner property.
  const evidence = []
  if (item.owner) evidence.push(`Owner: ${item.owner}`)
  if (item.note) evidence.push(item.note)
  if (evidence.length) props.Evidence = { rich_text: [{ text: { content: evidence.join(' — ').slice(0, 1990) } }] }
  if (item.source) props.Source = { rich_text: [{ text: { content: item.source } }] }
  return props
}

async function fetchExistingTitles() {
  const titles = new Set()
  let cursor
  let pages = 0
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: cursor,
    })
    for (const p of res.results) titles.add(titleOf(p).trim())
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined
    if (++pages > 20) break
  } while (cursor)
  return titles
}

async function main() {
  const items = seed.items ?? []
  console.log(`EOFY tracker seed — ${items.length} items in JSON, data source ${dataSourceId}`)

  const existing = DRY_RUN ? new Set() : await fetchExistingTitles()
  if (!DRY_RUN) console.log(`  ${existing.size} rows already in the Notion DB`)

  let created = 0
  let skipped = 0
  for (const item of items) {
    if (existing.has(item.task.trim())) {
      skipped++
      continue
    }
    if (DRY_RUN) {
      console.log(`  + [${item.priority}] ${item.status.padEnd(7)} ${item.category.padEnd(20)} ${item.task}`)
      created++
      continue
    }
    await notion.pages.create({
      parent: { type: 'data_source_id', data_source_id: dataSourceId },
      properties: buildProperties(item),
    })
    created++
    console.log(`  ✓ ${item.task}`)
  }

  console.log(
    DRY_RUN
      ? `\nDRY RUN — would create ${created} rows.`
      : `\nDone. Created ${created}, skipped ${skipped} (already present).`,
  )
}

main().catch((err) => {
  console.error('✗ seed failed:', err.body ?? err.message ?? err)
  process.exit(1)
})
