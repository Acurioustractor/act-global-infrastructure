#!/usr/bin/env node
/**
 * narrative-watch.mjs — run ingest across all configured sources
 *
 * Reads wiki/narrative/sources.json, walks each enabled local-folder
 * source, dedupes against wiki/narrative/.seen.json, and writes a digest
 * per source to wiki/output/narrative-ingest/. Drop into a cron / PM2
 * loop and the narrative store learns from new content automatically.
 *
 * Sources marked with type: supabase, ghl, url are not yet wired —
 * those need their own adapters (see TODO list at the bottom of
 * sources.json).
 *
 * Usage:
 *   node scripts/narrative-watch.mjs                 # run all daily + weekly sources
 *   node scripts/narrative-watch.mjs --schedule weekly
 *   node scripts/narrative-watch.mjs --source <source-id>
 *   node scripts/narrative-watch.mjs --dry-run
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'fs'
import { join, basename, resolve } from 'path'
import { execSync } from 'child_process'

const ROOT = process.cwd()
const SOURCES_PATH = join(ROOT, 'wiki', 'narrative', 'sources.json')
const SEEN_PATH = join(ROOT, 'wiki', 'narrative', '.seen.json')

if (!existsSync(SOURCES_PATH)) {
  console.error('[narrative-watch] no sources.json found at wiki/narrative/sources.json')
  process.exit(1)
}

const sources = JSON.parse(readFileSync(SOURCES_PATH, 'utf8')).sources
const seen = existsSync(SEEN_PATH) ? JSON.parse(readFileSync(SEEN_PATH, 'utf8')) : {}

const args = process.argv.slice(2)
const flag = (n) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 && i + 1 < args.length && !args[i + 1].startsWith('--') ? args[i + 1] : null
}
const dryRun = args.includes('--dry-run')
const scheduleFilter = flag('schedule')
const sourceFilter = flag('source')

// ---- Filter sources -------------------------------------------------

let runnable = sources.filter((s) => {
  if (sourceFilter) return s.id === sourceFilter
  if (scheduleFilter) return s.schedule === scheduleFilter
  return s.schedule === 'daily' || s.schedule === 'weekly'
})

console.log(`[narrative-watch] ${runnable.length} source(s) to run`)

// ---- Adapter dispatch -----------------------------------------------

function buildCommand(src, lastSeen) {
  const sinceFlag = lastSeen ? ` --since ${lastSeen}` : ''
  const projectFlag = src.project && src.project !== 'auto' ? ` --project ${src.project}` : ''
  const typeFlag = ` --source-type ${src['source-type'] || 'unknown'}`

  switch (src.type) {
    case 'folder':
    case 'file': {
      const absPath = resolve(ROOT, src.path)
      if (!existsSync(absPath)) return { error: `path not found: ${absPath}` }
      return { cmd: `node scripts/narrative-ingest.mjs "${absPath}"${projectFlag}${typeFlag}${sinceFlag}` }
    }
    case 'supabase': {
      // Route by table to the right adapter
      if (src.table === 'articles') {
        return { cmd: `node scripts/narrative-adapters/supabase-articles.mjs${sinceFlag}${projectFlag}` }
      }
      if (src.table === 'stories') {
        return { cmd: `node scripts/narrative-adapters/el-stories.mjs${sinceFlag}${projectFlag}` }
      }
      return { error: `no adapter for supabase table: ${src.table}` }
    }
    case 'ghl': {
      return { cmd: `node scripts/narrative-adapters/ghl-responses.mjs${sinceFlag}` }
    }
    case 'url': {
      return { cmd: `node scripts/narrative-adapters/url-scrape.mjs ${src.url}${projectFlag}${typeFlag}` }
    }
    default:
      return { error: `unknown type: ${src.type}` }
  }
}

// ---- Process each source -------------------------------------------

const results = []

for (const src of runnable) {
  if (src.wired === false) {
    console.log(`[narrative-watch] SKIP ${src.id} — explicitly wired: false`)
    results.push({ id: src.id, status: 'skipped', reason: 'wired: false' })
    continue
  }

  const lastSeen = seen[src.id] || null
  const built = buildCommand(src, lastSeen)

  if (built.error) {
    console.warn(`[narrative-watch] SKIP ${src.id} — ${built.error}`)
    results.push({ id: src.id, status: 'skipped', reason: built.error })
    continue
  }

  console.log(`\n[narrative-watch] RUN ${src.id} (${src.type})`)
  console.log(`  ${built.cmd}`)

  if (dryRun) {
    results.push({ id: src.id, status: 'dry-run', cmd: built.cmd })
    continue
  }

  try {
    execSync(built.cmd, { stdio: 'inherit' })
    seen[src.id] = new Date().toISOString().slice(0, 10)
    results.push({ id: src.id, status: 'ok' })
  } catch (e) {
    console.error(`[narrative-watch] FAIL ${src.id}:`, e.message)
    results.push({ id: src.id, status: 'error', error: e.message })
  }
}

// ---- Persist .seen.json --------------------------------------------

if (!dryRun) {
  writeFileSync(SEEN_PATH, JSON.stringify(seen, null, 2))
}

// ---- Summary --------------------------------------------------------

const ok = results.filter((r) => r.status === 'ok').length
const skipped = results.filter((r) => r.status === 'skipped').length
const errored = results.filter((r) => r.status === 'error').length

console.log(`\n[narrative-watch] done — ${ok} ok · ${skipped} skipped · ${errored} errored`)
console.log(`Inbox: wiki/output/narrative-ingest/`)
console.log(`Next: open the most recent digest(s) and run /wiki narrative process`)
