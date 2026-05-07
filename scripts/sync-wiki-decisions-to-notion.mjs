#!/usr/bin/env node
/**
 * Sync wiki/decisions/*.md to the Notion decisionsLog database.
 *
 * Surfaced 2026-05-07 by check-money-stack-alignment.mjs: Notion
 * decisionsLog had only 2 rows while wiki/decisions/ had 25 files.
 * This script closes that gap by creating one row per wiki file that
 * isn't already represented.
 *
 * Idempotent: queries Notion first and skips rows that match by title.
 * Doesn't update existing rows (so manual edits in Notion survive).
 *
 * Property mapping:
 *   wiki frontmatter `title`   → Name (title, required)
 *   frontmatter `date`         → Date (defaults to file mtime)
 *   frontmatter `status`       → Status (mapped to Proposed|Decided|Reversed|Superseded)
 *   first paragraph of body    → Decision (rich_text)
 *   first 1800 chars of body   → Context (rich_text)
 *   frontmatter `tags`         → Tags (multi_select; auto-created if new)
 *   GitHub URL of the file     → Linked Page (url)
 *
 * Usage:
 *   node scripts/sync-wiki-decisions-to-notion.mjs              # apply
 *   node scripts/sync-wiki-decisions-to-notion.mjs --dry-run    # preview
 */
import { Client } from '@notionhq/client'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
await import(join(__dirname, 'lib/load-env.mjs'))

const REPO_ROOT = join(__dirname, '..')
const DECISIONS_DIR = join(REPO_ROOT, 'wiki/decisions')
const CFG_PATH = join(REPO_ROOT, 'config/notion-database-ids.json')
const GITHUB_BASE = 'https://github.com/Acurioustractor/act-global-infrastructure/blob/main/wiki/decisions'

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')

if (!process.env.NOTION_TOKEN) {
  console.error('[sync-wiki-decisions] NOTION_TOKEN not set')
  process.exit(1)
}

const cfg = JSON.parse(readFileSync(CFG_PATH, 'utf-8'))
const dsId = cfg.decisionsLogDataSource
if (!dsId) {
  console.error('[sync-wiki-decisions] cfg.decisionsLogDataSource missing in notion-database-ids.json')
  process.exit(1)
}

const notion = new Client({ auth: process.env.NOTION_TOKEN })

const STATUS_MAP = {
  draft: 'Proposed',
  proposed: 'Proposed',
  decided: 'Decided',
  active: 'Decided',
  current: 'Decided',
  reversed: 'Reversed',
  superseded: 'Superseded',
}

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { fm: {}, body: md }
  const fm = {}
  for (const line of m[1].split('\n')) {
    const km = line.match(/^([a-zA-Z0-9_]+):\s*(.+?)\s*$/)
    if (!km) continue
    let v = km[2]
    if (/^\[.*\]$/.test(v)) {
      v = v
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    }
    fm[km[1]] = v
  }
  return { fm, body: m[2] }
}

function firstParagraph(body) {
  const lines = body.split('\n')
  let started = false
  const out = []
  for (const line of lines) {
    if (/^#/.test(line) || line.startsWith('>')) continue
    if (line.trim() === '') {
      if (started) break
      continue
    }
    started = true
    out.push(line)
    if (out.join(' ').length > 400) break
  }
  return out.join(' ').trim()
}

function titleFromFile(filePath, fm) {
  if (fm.title && typeof fm.title === 'string') return fm.title.replace(/^["']|["']$/g, '')
  const md = readFileSync(filePath, 'utf-8')
  const h1 = md.match(/^#\s+(.+)$/m)
  if (h1) return h1[1].trim()
  return basename(filePath, '.md').replace(/-/g, ' ')
}

async function loadExistingTitles() {
  const titles = new Set()
  let cursor
  do {
    const res = await notion.dataSources.query({ data_source_id: dsId, start_cursor: cursor, page_size: 100 })
    for (const row of res.results) {
      const props = row.properties || {}
      for (const k of Object.keys(props)) {
        const p = props[k]
        if (p?.type === 'title') {
          const t = (p.title || []).map((x) => x.plain_text).join('').trim().toLowerCase()
          if (t) titles.add(t)
        }
      }
    }
    cursor = res.has_more ? res.next_cursor : null
  } while (cursor)
  return titles
}

function rt(text, max = 2000) {
  return [{ type: 'text', text: { content: String(text || '').slice(0, max) } }]
}

async function main() {
  if (!existsSync(DECISIONS_DIR)) {
    console.error('[sync-wiki-decisions] wiki/decisions/ not found')
    process.exit(1)
  }

  const files = readdirSync(DECISIONS_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((f) => join(DECISIONS_DIR, f))

  console.log(`[sync-wiki-decisions] ${files.length} markdown files in wiki/decisions/`)

  console.log(`[sync-wiki-decisions] loading existing titles from Notion...`)
  const existing = await loadExistingTitles()
  console.log(`[sync-wiki-decisions] ${existing.size} rows already in Notion`)

  const results = { created: [], skipped: [], errors: [] }

  for (const path of files) {
    const md = readFileSync(path, 'utf-8')
    const { fm, body } = parseFrontmatter(md)
    const title = titleFromFile(path, fm)
    const fname = basename(path)

    if (existing.has(title.toLowerCase())) {
      results.skipped.push({ fname, title, reason: 'already in Notion' })
      continue
    }

    const dateIso = (typeof fm.date === 'string' ? fm.date.replace(/^["']|["']$/g, '') : null) || statSync(path).mtime.toISOString().slice(0, 10)
    const statusName = STATUS_MAP[String(fm.status || '').toLowerCase()] || 'Decided'
    const decision = firstParagraph(body)
    const tags = Array.isArray(fm.tags) ? fm.tags.slice(0, 8) : []

    const properties = {
      Name: { title: rt(title, 2000) },
      Date: { date: { start: dateIso } },
      Status: { select: { name: statusName } },
      Decision: { rich_text: rt(decision, 1800) },
      Context: { rich_text: rt(body.replace(/^#+\s.*$/gm, '').replace(/\n+/g, ' ').trim(), 1800) },
      'Linked Page': { url: `${GITHUB_BASE}/${fname}` },
    }
    if (tags.length) properties.Tags = { multi_select: tags.map((t) => ({ name: String(t).slice(0, 100) })) }

    if (DRY_RUN) {
      results.created.push({ fname, title, dateIso, statusName, tags })
      console.log(`  + WOULD CREATE: ${title} (${fname})`)
      continue
    }

    try {
      await notion.pages.create({ parent: { type: 'data_source_id', data_source_id: dsId }, properties })
      results.created.push({ fname, title })
      console.log(`  ✓ ${title}`)
    } catch (e) {
      results.errors.push({ fname, title, error: e.message.slice(0, 120) })
      console.log(`  ✗ ${title}: ${e.message.slice(0, 80)}`)
    }
  }

  console.log('')
  console.log(`[sync-wiki-decisions] summary: created=${results.created.length} skipped=${results.skipped.length} errors=${results.errors.length}`)
  if (DRY_RUN) console.log('[sync-wiki-decisions] DRY-RUN: re-run without --dry-run to apply')
}

main().catch((err) => {
  console.error('[sync-wiki-decisions] fatal:', err.stack || err.message)
  process.exit(1)
})
