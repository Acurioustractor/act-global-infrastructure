#!/usr/bin/env node
/**
 * Audit every page/database in the Notion money stack:
 *   - title (from page properties or db title)
 *   - last_edited_time
 *   - archived flag
 *   - child block count (for pages) / row count (for databases)
 *   - parent type
 *
 * Reads keys from config/notion-database-ids.json and tries each as a page
 * first, then as a database if that fails. Output groups results into:
 *   FRESH (edited <14 days ago, has content)
 *   STALE (edited >30 days ago)
 *   ORPHANED (no child blocks, never edited materially)
 *   ARCHIVED
 *   MISSING (id not found / 404)
 *
 * Usage:
 *   node scripts/audit-notion-money-stack.mjs                 # full audit
 *   node scripts/audit-notion-money-stack.mjs --json          # JSON output
 *   node scripts/audit-notion-money-stack.mjs --money-only    # only money-stack keys
 *
 * Plan: thoughts/shared/plans/notion-one-stop-shop.md (when shipped)
 */
import { Client } from '@notionhq/client'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
await import(join(__dirname, 'lib/load-env.mjs'))

const REPO_ROOT = join(__dirname, '..')
const CFG_PATH = join(REPO_ROOT, 'config/notion-database-ids.json')
const OUT_DIR = join(REPO_ROOT, 'wiki/cockpit')

const argv = process.argv.slice(2)
const JSON_OUT = argv.includes('--json')
const MONEY_ONLY = argv.includes('--money-only')

// Keys that are part of the money / soul-stack work (per
// wiki/decisions/notion-page-inventory-money-stack.md). DataSource keys
// are children of their DB and audit redundantly, so we skip them.
const MONEY_KEYS = new Set([
  'moneyFramework',
  'cashForecast', 'cashScenarios', 'budgetActual',
  'kpisPage', 'moneyMetricsDb',
  'moneyInAlignment', 'moneyOutAlignment',
  'pilePage_voice', 'pilePage_flow', 'pilePage_ground', 'pilePage_grants',
  'decisionsLog', 'actionItems',
  'stakeholders', 'foundationsDb', 'ledgerQA',
  'opportunitiesDb', 'grantPipeline',
  'entityHub',
  'cy26StrategyPlan', 'planningRhythm', 'weeklyDigest', 'moneySyncPage',
  'fourLanesCard',
  'financeOverview', 'financeSurfaceDesign', 'dashboardWalkthrough',
])

const FRESH_DAYS = 14
const STALE_DAYS = 30

const log = (m) => console.log(`[audit-notion] ${m}`)

if (!process.env.NOTION_TOKEN) {
  console.error('[audit-notion] NOTION_TOKEN env var not set in .env.local')
  process.exit(1)
}

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const cfg = JSON.parse(readFileSync(CFG_PATH, 'utf-8'))

function daysSince(iso) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Math.round(ms / 86400000)
}

function bucketFor(rec) {
  if (rec.error) return 'MISSING'
  if (rec.archived) return 'ARCHIVED'
  if (rec.children === 0 && rec.daysSinceEdit > STALE_DAYS) return 'ORPHANED'
  if (rec.daysSinceEdit > STALE_DAYS) return 'STALE'
  if (rec.daysSinceEdit <= FRESH_DAYS) return 'FRESH'
  return 'AGEING'
}

function titleFromPage(page) {
  const props = page.properties || {}
  for (const k of Object.keys(props)) {
    const p = props[k]
    if (p && p.type === 'title' && Array.isArray(p.title)) {
      return p.title.map((t) => t.plain_text).join('').trim() || '(untitled)'
    }
  }
  return '(untitled page)'
}

function titleFromDb(db) {
  if (Array.isArray(db.title)) return db.title.map((t) => t.plain_text).join('').trim() || '(untitled db)'
  return '(untitled db)'
}

async function countChildren(blockId) {
  let total = 0
  let cursor
  do {
    const res = await notion.blocks.children.list({ block_id: blockId, start_cursor: cursor, page_size: 100 })
    total += res.results.length
    cursor = res.has_more ? res.next_cursor : null
  } while (cursor)
  return total
}

async function countDbRows(databaseId) {
  let total = 0
  let cursor
  do {
    const res = await notion.databases.query({ database_id: databaseId, start_cursor: cursor, page_size: 100 })
    total += res.results.length
    cursor = res.has_more ? res.next_cursor : null
  } while (cursor)
  return total
}

async function auditOne(key, id) {
  const rec = { key, id, kind: null, title: null, lastEditedAt: null, daysSinceEdit: null, archived: false, children: 0, parentType: null }
  try {
    const page = await notion.pages.retrieve({ page_id: id })
    rec.kind = 'page'
    rec.title = titleFromPage(page)
    rec.lastEditedAt = page.last_edited_time
    rec.daysSinceEdit = daysSince(page.last_edited_time)
    rec.archived = !!page.archived
    rec.parentType = page.parent?.type || null
    if (!rec.archived) {
      try {
        rec.children = await countChildren(id)
      } catch (e) {
        rec.children = -1
      }
    }
    return rec
  } catch (pageErr) {
    try {
      const db = await notion.databases.retrieve({ database_id: id })
      rec.kind = 'database'
      rec.title = titleFromDb(db)
      rec.lastEditedAt = db.last_edited_time
      rec.daysSinceEdit = daysSince(db.last_edited_time)
      rec.archived = !!db.archived
      rec.parentType = db.parent?.type || null
      if (!rec.archived) {
        try {
          rec.children = await countDbRows(id)
        } catch (e) {
          rec.children = -1
        }
      }
      return rec
    } catch (dbErr) {
      rec.error = pageErr.message.slice(0, 80)
      return rec
    }
  }
}

async function main() {
  const allKeys = Object.keys(cfg).filter((k) => !k.endsWith('DataSource') && !k.endsWith('View'))
  const keys = MONEY_ONLY ? allKeys.filter((k) => MONEY_KEYS.has(k)) : allKeys
  log(`auditing ${keys.length} keys (money-only=${MONEY_ONLY})`)

  const records = []
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    process.stdout.write(`\r[audit-notion] ${i + 1}/${keys.length}: ${k.padEnd(30)}`)
    const rec = await auditOne(k, cfg[k])
    rec.bucket = bucketFor(rec)
    rec.inMoneyStack = MONEY_KEYS.has(k)
    records.push(rec)
  }
  process.stdout.write('\n')

  if (JSON_OUT) {
    console.log(JSON.stringify(records, null, 2))
    return
  }

  const buckets = { FRESH: [], AGEING: [], STALE: [], ORPHANED: [], ARCHIVED: [], MISSING: [] }
  for (const r of records) buckets[r.bucket].push(r)

  const lines = []
  const date = new Date().toISOString().slice(0, 10)
  lines.push(`# Notion money-stack audit — ${date}`, '')
  lines.push(`> Generated by \`scripts/audit-notion-money-stack.mjs\`. ${MONEY_ONLY ? 'Money-stack keys only.' : `${keys.length} keys total.`}`, '')
  lines.push(`Buckets: ${Object.entries(buckets).map(([b, r]) => `${b} ${r.length}`).join(' · ')}`, '')

  for (const [bucket, rows] of Object.entries(buckets)) {
    if (rows.length === 0) continue
    lines.push(`## ${bucket} (${rows.length})`, '')
    lines.push('| Key | Title | Kind | Children | Days since edit | Parent |')
    lines.push('|---|---|---|---:|---:|---|')
    rows.sort((a, b) => (a.daysSinceEdit ?? 9999) - (b.daysSinceEdit ?? 9999))
    for (const r of rows) {
      const title = (r.title || r.error || '').slice(0, 50)
      const kind = r.kind || '(error)'
      const children = r.children === -1 ? '?' : (r.children ?? '-')
      const days = r.daysSinceEdit ?? '-'
      const parent = r.parentType ?? '-'
      lines.push(`| \`${r.key}\` | ${title} | ${kind} | ${children} | ${days} | ${parent} |`)
    }
    lines.push('')
  }

  const out = lines.join('\n')
  if (!existsSync(OUT_DIR)) {
    log(`creating ${OUT_DIR}`)
  }
  const outPath = join(OUT_DIR, `notion-money-stack-audit-${date}.md`)
  writeFileSync(outPath, out)
  log(`wrote ${outPath}`)
  console.log('\n' + out)
}

main().catch((err) => {
  console.error('[audit-notion] fatal:', err.stack || err.message)
  process.exit(1)
})
