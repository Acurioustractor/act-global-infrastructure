#!/usr/bin/env node
/**
 * Push the latest money-status one-stop-shop output into Notion.
 *
 * Reads the most recent `wiki/cockpit/money-status-YYYY-MM-DD.md` produced
 * by `scripts/money-status.mjs` and replaces the body of a target Notion
 * page with Notion-block equivalents.
 *
 * Target page id resolution order:
 *   1. NOTION_PAGE_MONEY_STATUS env var
 *   2. config/notion-database-ids.json -> moneyStatus
 *
 * Fail-soft if neither is set or the token is dead, so the cron stays green
 * during rollout. Companion design doc:
 *   wiki/decisions/money-stack-one-stop-shop.md
 *
 * Usage:
 *   node scripts/sync-money-status-to-notion.mjs              # push
 *   node scripts/sync-money-status-to-notion.mjs --dry-run    # preview
 *   node scripts/sync-money-status-to-notion.mjs --rebuild    # run money-status.mjs first
 */
import { Client } from '@notionhq/client'
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { markdownToBlocks, clearPage, appendBlocks } from './lib/notion-md-blocks.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
await import(join(__dirname, 'lib/load-env.mjs'))

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const REBUILD_FIRST = args.includes('--rebuild')

const REPO_ROOT = join(__dirname, '..')
const COCKPIT_DIR = join(REPO_ROOT, 'wiki/cockpit')
const CONFIG_PATH = join(REPO_ROOT, 'config/notion-database-ids.json')

const log = (m) => console.log(`[money-status-card] ${m}`)

function resolvePageId() {
  if (process.env.NOTION_PAGE_MONEY_STATUS) return process.env.NOTION_PAGE_MONEY_STATUS
  if (existsSync(CONFIG_PATH)) {
    const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
    if (cfg.moneyStatus) return cfg.moneyStatus
  }
  return null
}

function latestStatusFile() {
  if (!existsSync(COCKPIT_DIR)) return null
  const matches = readdirSync(COCKPIT_DIR).filter((f) => f.startsWith('money-status-') && f.endsWith('.md')).sort().reverse()
  return matches[0] ? join(COCKPIT_DIR, matches[0]) : null
}

async function main() {
  const pageId = resolvePageId()
  if (!pageId) {
    log('SKIP: target page id not set.')
    log('To enable: create a Notion page (e.g. "Money Status"), copy its id, then either:')
    log('  (a) add  "moneyStatus": "<page-id>"  to config/notion-database-ids.json, or')
    log('  (b) export NOTION_PAGE_MONEY_STATUS=<page-id> in .env.local.')
    return
  }
  if (!process.env.NOTION_TOKEN) {
    log('SKIP: NOTION_TOKEN env var not set. Cron stays green.')
    return
  }

  if (REBUILD_FIRST) {
    log('refreshing money-status via money-status.mjs')
    execSync(`node ${join(__dirname, 'money-status.mjs')} --skip-audit --quiet`, { stdio: 'inherit' })
  }

  const statusPath = latestStatusFile()
  if (!statusPath) {
    log('ERROR: no money-status-*.md found in wiki/cockpit/. Run with --rebuild or run money-status.mjs first.')
    process.exit(1)
  }

  const md = readFileSync(statusPath, 'utf-8')
  const blocks = markdownToBlocks(md)
  log(`parsed ${blocks.length} blocks from ${statusPath.replace(REPO_ROOT + '/', '')}`)

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
  console.error('[money-status-card] fatal:', err.message)
  process.exit(1)
})
