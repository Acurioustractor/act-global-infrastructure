#!/usr/bin/env node
/**
 * Push the Monday weekly digest into the Notion `weeklyDigest` page so
 * humans have a permanent log of every Monday's reconciliation review
 * without scrolling Telegram history.
 *
 * Reads the most recent `wiki/cockpit/weekly-digest-YYYY-MM-DD.md`
 * produced by `scripts/weekly-reconciliation.mjs` (which writes the
 * Telegram message to disk before/after sending it).
 *
 * Target page id resolution order:
 *   1. NOTION_PAGE_WEEKLY_DIGEST env var
 *   2. config/notion-database-ids.json -> weeklyDigest (already populated)
 *
 * Fail-soft if no token / no page id / no digest file. Cron stays green.
 *
 * Usage:
 *   node scripts/sync-weekly-digest-to-notion.mjs              # push latest
 *   node scripts/sync-weekly-digest-to-notion.mjs --dry-run    # preview
 *   node scripts/sync-weekly-digest-to-notion.mjs --date YYYY-MM-DD  # specific date
 */
import { Client } from '@notionhq/client'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { markdownToBlocks, clearPage, appendBlocks } from './lib/notion-md-blocks.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
await import(join(__dirname, 'lib/load-env.mjs'))

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const DATE_FLAG = args.indexOf('--date')
const FORCED_DATE = DATE_FLAG >= 0 ? args[DATE_FLAG + 1] : null

const REPO_ROOT = join(__dirname, '..')
const COCKPIT_DIR = join(REPO_ROOT, 'wiki/cockpit')
const CONFIG_PATH = join(REPO_ROOT, 'config/notion-database-ids.json')

const log = (m) => console.log(`[weekly-digest-card] ${m}`)

function resolvePageId() {
  if (process.env.NOTION_PAGE_WEEKLY_DIGEST) return process.env.NOTION_PAGE_WEEKLY_DIGEST
  if (existsSync(CONFIG_PATH)) {
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
    if (cfg.weeklyDigest) return cfg.weeklyDigest
  }
  return null
}

function findDigestFile() {
  if (!existsSync(COCKPIT_DIR)) return null
  if (FORCED_DATE) {
    const p = join(COCKPIT_DIR, `weekly-digest-${FORCED_DATE}.md`)
    return existsSync(p) ? p : null
  }
  const matches = readdirSync(COCKPIT_DIR).filter((f) => f.startsWith('weekly-digest-') && f.endsWith('.md')).sort().reverse()
  return matches[0] ? join(COCKPIT_DIR, matches[0]) : null
}

async function main() {
  const pageId = resolvePageId()
  if (!pageId) {
    log('SKIP: cfg.weeklyDigest / NOTION_PAGE_WEEKLY_DIGEST not set.')
    return
  }
  if (!process.env.NOTION_TOKEN) {
    log('SKIP: NOTION_TOKEN env var not set. Cron stays green.')
    return
  }

  const digestPath = findDigestFile()
  if (!digestPath) {
    log(`SKIP: no weekly-digest-*.md found in ${COCKPIT_DIR}. Run weekly-reconciliation.mjs first.`)
    return
  }

  const md = readFileSync(digestPath, 'utf-8')
  const blocks = markdownToBlocks(md)
  log(`parsed ${blocks.length} blocks from ${digestPath.replace(REPO_ROOT + '/', '')}`)

  if (DRY_RUN) {
    log('DRY-RUN: would replace page body with the following block types:')
    const types = blocks.reduce((acc, b) => ((acc[b.type] = (acc[b.type] || 0) + 1), acc), {})
    for (const [t, n] of Object.entries(types)) log(`  ${t}: ${n}`)
    log(`target page id: ${pageId}`)
    return
  }

  const notion = new Client({ auth: process.env.NOTION_TOKEN })
  log(`clearing existing body of ${pageId}`)
  await clearPage(notion, pageId)
  log(`appending ${blocks.length} blocks`)
  await appendBlocks(notion, pageId, blocks)
  log('done')
}

main().catch((err) => {
  console.error('[weekly-digest-card] fatal:', err.message)
  process.exit(1)
})
