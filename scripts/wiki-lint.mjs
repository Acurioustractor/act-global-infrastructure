#!/usr/bin/env node
/**
 * Wiki Lint — automated health check for the Tractorpedia wiki.
 *
 * Checks:
 *   - Orphaned articles (not linked from anywhere, including index.md)
 *   - Broken wikilinks ([[name]] pointing to non-existent files)
 *   - Stub articles (< 20 lines of content)
 *   - Missing index entries (article exists but isn't in index.md)
 *   - Missing backlinks (A links to B but B doesn't link back to A)
 *
 * Usage:
 *   node scripts/wiki-lint.mjs                    # human-readable report
 *   node scripts/wiki-lint.mjs --json             # JSON output
 *   node scripts/wiki-lint.mjs --write-report     # also save report to wiki/decisions/wiki-health-YYYY-MM-DD.md
 *
 * Designed to be run weekly (manually or via scheduled trigger).
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, basename, relative } from 'path'
import { logWikiEvent } from './wiki-log.mjs'

const WIKI_ROOT = join(process.cwd(), 'wiki')
const SKIP_DIRS = new Set(['raw', '.obsidian'])

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const writeReport = args.includes('--write-report')

// ---- Helpers --------------------------------------------------------

function walkMarkdown(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue
      walkMarkdown(full, files)
    } else if (entry.endsWith('.md')) {
      files.push(full)
    }
  }
  return files
}

function extractWikilinks(content) {
  // Strip fenced code blocks (```...```) and inline code spans (`...`) first —
  // wikilinks inside code are documentation, not real references.
  const stripped = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
  // Match [[link]] and [[link|display]]
  const links = []
  const regex = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g
  let m
  while ((m = regex.exec(stripped)) !== null) {
    // Strip any leading path (e.g. stories/origin-curious-tractor → origin-curious-tractor)
    const target = m[1].trim().split('/').pop()
    links.push(target)
  }
  return links
}

function countLines(content) {
  return content.split('\n').filter((l) => l.trim().length > 0).length
}

// ---- Main -----------------------------------------------------------

const allFiles = walkMarkdown(WIKI_ROOT)
const articleStems = new Set()
const articleByStem = new Map() // stem → relative path
const linkGraph = new Map() // stem → Set of stems it links to
const linesByStem = new Map()
const MAIN_INDEX_PATH = join(WIKI_ROOT, 'index.md')
let mainIndexContent = ''

for (const file of allFiles) {
  const stem = basename(file, '.md')
  const rel = relative(WIKI_ROOT, file)
  // Skip subdirectory index.md files in the article set — they're section indexes
  if (stem === 'index' && file !== MAIN_INDEX_PATH) continue
  articleStems.add(stem)
  if (!articleByStem.has(stem)) articleByStem.set(stem, rel)
}

for (const file of allFiles) {
  const stem = basename(file, '.md')
  const content = readFileSync(file, 'utf8')
  const links = extractWikilinks(content)
  if (file === MAIN_INDEX_PATH) {
    mainIndexContent = content
    linkGraph.set('index', new Set(links))
    linesByStem.set('index', countLines(content))
  } else if (stem !== 'index') {
    linkGraph.set(stem, new Set(links))
    linesByStem.set(stem, countLines(content))
  }
}

// ---- Checks ---------------------------------------------------------

// 1. Reverse link map: for each stem, who links to it?
const incoming = new Map()
for (const [src, targets] of linkGraph) {
  for (const t of targets) {
    if (!incoming.has(t)) incoming.set(t, new Set())
    incoming.get(t).add(src)
  }
}

// 2. Orphans: articles with no incoming links and not in index.md
const indexLinks = linkGraph.get('index') || new Set()
const orphans = []
for (const stem of articleStems) {
  if (stem === 'index') continue
  const incomingLinks = incoming.get(stem) || new Set()
  // Subtract self-links and the article's own backlinks section
  incomingLinks.delete(stem)
  if (incomingLinks.size === 0 && !indexLinks.has(stem)) {
    orphans.push(stem)
  }
}

// 3. Broken wikilinks: [[X]] where X.md doesn't exist
const broken = []
for (const [src, targets] of linkGraph) {
  for (const t of targets) {
    if (!articleStems.has(t)) {
      broken.push({ from: src, to: t })
    }
  }
}

// 4. Stubs: articles with < 20 non-blank lines
const stubs = []
for (const [stem, lines] of linesByStem) {
  if (stem === 'index') continue
  if (lines < 20) stubs.push({ stem, lines })
}

// 5. Missing index entries
const missingFromIndex = []
for (const stem of articleStems) {
  if (stem === 'index') continue
  // Skip directory index files (e.g. stories/index.md is its own thing)
  if (basename(articleByStem.get(stem), '.md') === 'index') continue
  if (!indexLinks.has(stem)) missingFromIndex.push(stem)
}

// 6. Missing backlinks: A links to B but B doesn't link back
const missingBacklinks = []
for (const [src, targets] of linkGraph) {
  if (src === 'index') continue
  for (const t of targets) {
    if (!articleStems.has(t)) continue
    if (t === 'index') continue
    const reverse = linkGraph.get(t) || new Set()
    if (!reverse.has(src)) {
      missingBacklinks.push({ from: src, to: t })
    }
  }
}

// ---- Output ---------------------------------------------------------

const summary = {
  date: new Date().toISOString().split('T')[0],
  total_articles: articleStems.size - 1, // exclude index
  total_links: [...linkGraph.values()].reduce((a, s) => a + s.size, 0),
  orphans: orphans.length,
  broken_links: broken.length,
  stubs: stubs.length,
  missing_from_index: missingFromIndex.length,
  missing_backlinks: missingBacklinks.length,
}

if (asJson) {
  console.log(JSON.stringify({ summary, orphans, broken, stubs, missingFromIndex, missingBacklinks }, null, 2))
  process.exit(0)
}

const lines = []
lines.push(`# Wiki Health Report — ${summary.date}`)
lines.push('')
lines.push(`**Articles:** ${summary.total_articles}`)
lines.push(`**Wikilinks:** ${summary.total_links}`)
lines.push('')
lines.push('## Summary')
lines.push('')
lines.push(`| Check | Count |`)
lines.push(`|-------|-------|`)
lines.push(`| Orphans (no incoming links, not in index) | ${summary.orphans} |`)
lines.push(`| Broken wikilinks | ${summary.broken_links} |`)
lines.push(`| Stub articles (< 20 lines) | ${summary.stubs} |`)
lines.push(`| Missing from index.md | ${summary.missing_from_index} |`)
lines.push(`| Missing backlinks | ${summary.missing_backlinks} |`)
lines.push('')

if (orphans.length) {
  lines.push('## Orphans')
  lines.push('')
  for (const o of orphans.sort()) lines.push(`- \`${articleByStem.get(o)}\``)
  lines.push('')
}

if (broken.length) {
  lines.push('## Broken Wikilinks')
  lines.push('')
  for (const { from, to } of broken.slice(0, 50)) lines.push(`- \`${from}\` → \`[[${to}]]\``)
  if (broken.length > 50) lines.push(`- ... and ${broken.length - 50} more`)
  lines.push('')
}

if (stubs.length) {
  lines.push('## Stubs (Enrichment Priority)')
  lines.push('')
  for (const { stem, lines: n } of stubs.sort((a, b) => a.lines - b.lines).slice(0, 20)) {
    lines.push(`- \`${articleByStem.get(stem)}\` (${n} lines)`)
  }
  if (stubs.length > 20) lines.push(`- ... and ${stubs.length - 20} more`)
  lines.push('')
}

if (missingFromIndex.length) {
  lines.push('## Articles Missing from index.md')
  lines.push('')
  for (const stem of missingFromIndex.sort().slice(0, 30)) {
    lines.push(`- \`${articleByStem.get(stem)}\``)
  }
  if (missingFromIndex.length > 30) lines.push(`- ... and ${missingFromIndex.length - 30} more`)
  lines.push('')
}

if (missingBacklinks.length) {
  lines.push('## Missing Backlinks (top 30)')
  lines.push('')
  for (const { from, to } of missingBacklinks.slice(0, 30)) {
    lines.push(`- \`${from}\` links to \`${to}\` but \`${to}\` doesn't link back`)
  }
  if (missingBacklinks.length > 30) lines.push(`- ... and ${missingBacklinks.length - 30} more`)
  lines.push('')
}

const report = lines.join('\n')
console.log(report)

if (writeReport) {
  const reportPath = join(WIKI_ROOT, 'output', `lint-${summary.date}.md`)
  writeFileSync(reportPath, report)
  console.error(`\nReport saved to: ${reportPath}`)

  try {
    logWikiEvent(
      'lint',
      `${summary.totalArticles || 'n/a'} articles · ${broken.length} broken links · ${orphans?.length || 0} orphans`,
      [`wiki/output/lint-${summary.date}.md`],
    )
  } catch (e) {
    console.error('  ⚠ wiki-log append failed:', e.message)
  }
}

// Exit code: 0 if no critical issues, 1 if broken links exist
process.exit(broken.length > 0 ? 1 : 0)
