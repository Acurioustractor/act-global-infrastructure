#!/usr/bin/env node
/**
 * wiki-log.mjs — append events to wiki/log.md
 *
 * Usage from CLI:
 *   node scripts/wiki-log.mjs <op> "summary text" [file1 file2 ...]
 *
 * Usage from another script:
 *   import { logWikiEvent } from './wiki-log.mjs'
 *   logWikiEvent('lint', '0 errors, 3 warnings', ['wiki/decisions/lint-2026-04-07.md'])
 *
 * Ops: ingest | lint | query | synthesis | viewer-build | snapshot-sync | url-audit | enrich | bootstrap
 *
 * The log is append-only, most-recent at the top within each year section.
 * Format: `- YYYY-MM-DD HH:MM | <op> | <summary> | <files-touched>`
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const LOG_PATH = join(ROOT, 'wiki', 'log.md')

const VALID_OPS = new Set([
  'ingest', 'lint', 'query', 'synthesis', 'viewer-build', 'snapshot-sync', 'url-audit',
  'enrich', 'bootstrap', 'meeting-watch', 'manual',
])

export function logWikiEvent(op, summary, files = []) {
  if (!VALID_OPS.has(op)) {
    console.warn(`[wiki-log] Unknown op "${op}" — using "manual"`)
    op = 'manual'
  }

  if (!existsSync(LOG_PATH)) {
    // Bootstrap if missing
    writeFileSync(LOG_PATH, `---
title: Wiki Activity Log
status: Append-only
cluster: log
---

# Wiki Activity Log

> Append-only timeline of every operation Tractorpedia has performed. Most-recent at the top.

Format: \`- YYYY-MM-DD HH:MM | <op> | <summary> | <files-touched>\`

Helper: \`node scripts/wiki-log.mjs <op> "<summary>" [files...]\`

---

`, 'utf8')
  }

  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const time = now.toTimeString().slice(0, 5)
  const year = now.getFullYear().toString()

  const filesStr = files.length > 0
    ? files.map(f => f.replace(ROOT + '/', '')).join(', ')
    : '—'
  const summaryClean = String(summary || '').replace(/\n/g, ' ').slice(0, 200)
  const entry = `- ${date} ${time} | ${op} | ${summaryClean} | ${filesStr}`

  let content = readFileSync(LOG_PATH, 'utf8')
  const yearHeader = `## ${year}`

  if (content.includes(yearHeader)) {
    // Insert directly after the year header (most-recent on top)
    content = content.replace(
      new RegExp(`(${yearHeader}\\n\\n?)`),
      `$1${entry}\n`,
    )
  } else {
    // Add new year section just after the "---" separator
    if (content.includes('\n---\n')) {
      content = content.replace('\n---\n', `\n---\n\n${yearHeader}\n\n${entry}\n`)
    } else {
      content += `\n\n${yearHeader}\n\n${entry}\n`
    }
  }

  writeFileSync(LOG_PATH, content, 'utf8')
}

// CLI invocation
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , op, summary, ...files] = process.argv
  if (!op || !summary) {
    console.error('Usage: node scripts/wiki-log.mjs <op> "<summary>" [files...]')
    console.error(`  ops: ${[...VALID_OPS].join(', ')}`)
    process.exit(1)
  }
  logWikiEvent(op, summary, files)
  console.log(`✓ logged: ${op} — ${summary}`)
}
