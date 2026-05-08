#!/usr/bin/env node
/**
 * Restore archived Notion pages by flipping `archived: false` on each via
 * the Notion API.
 *
 * Targets the 17 money-stack pages archived by the JusticeHub integration
 * on 2026-05-06 (see `wiki/cockpit/archived-notion-inspection-2026-05-07.md`).
 * Each page id comes from `config/notion-database-ids.json`.
 *
 * Default mode is DRY-RUN: prints what would be restored, doesn't call
 * the API. Pass --apply to actually flip them.
 *
 * Usage:
 *   node scripts/restore-archived-notion-pages.mjs                   # dry-run
 *   node scripts/restore-archived-notion-pages.mjs --apply           # restore all
 *   node scripts/restore-archived-notion-pages.mjs --apply --keys k1,k2,k3
 *                                                                    # selective
 *   node scripts/restore-archived-notion-pages.mjs --skip k1,k2      # exclude some
 */
import { Client } from '@notionhq/client'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
await import(join(__dirname, 'lib/load-env.mjs'))

const REPO_ROOT = join(__dirname, '..')
const CFG_PATH = join(REPO_ROOT, 'config/notion-database-ids.json')

const argv = process.argv.slice(2)
const APPLY = argv.includes('--apply')
const KEYS_FLAG_IDX = argv.indexOf('--keys')
const SKIP_FLAG_IDX = argv.indexOf('--skip')
const KEYS_FILTER = KEYS_FLAG_IDX >= 0 ? argv[KEYS_FLAG_IDX + 1].split(',').map((k) => k.trim()) : null
const SKIP_LIST = SKIP_FLAG_IDX >= 0 ? new Set(argv[SKIP_FLAG_IDX + 1].split(',').map((k) => k.trim())) : new Set()

// Default target set: the 17 archived money-stack pages from 2026-05-07.
const DEFAULT_KEYS = [
  'moneyFramework',
  'pilePage_voice', 'pilePage_flow', 'pilePage_ground', 'pilePage_grants',
  'moneyInAlignment', 'moneyOutAlignment',
  'moneySyncPage', 'weeklyDigest',
  'cashForecast', 'cashScenarios', 'budgetActual', 'kpisPage',
  'cy26StrategyPlan', 'planningRhythm',
  'financeSurfaceDesign', 'dashboardWalkthrough',
]

if (!process.env.NOTION_TOKEN) {
  console.error('[restore-notion] NOTION_TOKEN env var not set')
  process.exit(1)
}

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const cfg = JSON.parse(readFileSync(CFG_PATH, 'utf-8'))

function titleFromPage(page) {
  const props = page.properties || {}
  for (const k of Object.keys(props)) {
    const p = props[k]
    if (p && p.type === 'title' && Array.isArray(p.title)) {
      return p.title.map((t) => t.plain_text).join('').trim() || '(untitled)'
    }
  }
  return '(untitled)'
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const candidates = (KEYS_FILTER || DEFAULT_KEYS).filter((k) => !SKIP_LIST.has(k))
  console.log(`[restore-notion] mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`[restore-notion] candidates: ${candidates.length}`)

  const records = []
  for (const key of candidates) {
    const id = cfg[key]
    if (!id) {
      records.push({ key, status: 'NO-ID', note: 'cfg key not found' })
      continue
    }
    try {
      const page = await notion.pages.retrieve({ page_id: id })
      const rec = { key, id, title: titleFromPage(page), archived: page.archived, in_trash: page.in_trash }

      if (!page.archived && !page.in_trash) {
        rec.status = 'ALREADY-LIVE'
        records.push(rec)
        continue
      }

      if (!APPLY) {
        rec.status = 'WOULD-RESTORE'
        records.push(rec)
        continue
      }

      // The Notion API uses `archived: false` to restore; some workspaces
      // also expose `in_trash: false`. Send archived only — Notion handles
      // both.
      await notion.pages.update({ page_id: id, archived: false })
      await sleep(150)
      rec.status = 'RESTORED'
      records.push(rec)
      console.log(`  ✓ ${key} — ${rec.title}`)
    } catch (e) {
      records.push({ key, id, status: 'ERROR', error: e.message.slice(0, 120) })
      console.log(`  ✗ ${key} — ${e.message.slice(0, 80)}`)
    }
  }

  console.log('')
  const buckets = records.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {})
  console.log(`[restore-notion] summary: ${Object.entries(buckets).map(([s, n]) => `${s}=${n}`).join(' · ')}`)

  if (!APPLY) {
    console.log('')
    console.log(`[restore-notion] DRY-RUN: re-run with --apply to restore.`)
  }
}

main().catch((err) => {
  console.error('[restore-notion] fatal:', err.stack || err.message)
  process.exit(1)
})
