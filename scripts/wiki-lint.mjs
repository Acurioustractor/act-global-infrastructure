#!/usr/bin/env node
/**
 * Wiki Lint — automated health check for the Tractorpedia wiki.
 *
 * Checks:
 *   - Orphaned articles (not linked from anywhere, including index.md)
 *   - Broken wikilinks ([[name]] pointing to non-existent files)
 *   - Stub articles (< 20 lines of content)
 *   - Missing index entries (article exists but isn't in index.md)
 *   - Missing backlinks for non-hub pages
 *   - Advisory hub/list references that do not need reciprocal links by default
 *
 * Usage:
 *   node scripts/wiki-lint.mjs                    # human-readable report
 *   node scripts/wiki-lint.mjs --json             # JSON output
 *   node scripts/wiki-lint.mjs --write-report     # also save report to wiki/output/lint-YYYY-MM-DD.md
 *
 * Designed to be run weekly (manually or via scheduled trigger).
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, basename, relative } from 'path'
import { logWikiEvent } from './wiki-log.mjs'
import {
  WALK_SKIP_DIRS,
  isCanonicalGraphFile,
  countCanonicalArticlesByDomain,
} from './lib/wiki-scope.mjs'
import { buildRawSourcePriorityRecord } from './lib/wiki-source-bridge.mjs'

const WIKI_ROOT = join(process.cwd(), 'wiki')
const RAW_ROOT = join(WIKI_ROOT, 'raw')
const SOURCES_ROOT = join(WIKI_ROOT, 'sources')
const args = process.argv.slice(2)
const asJson = args.includes('--json')
const writeReport = args.includes('--write-report')

// ---- Helpers --------------------------------------------------------

function walkMarkdown(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (WALK_SKIP_DIRS.has(entry)) continue
      walkMarkdown(full, files)
    } else if (entry.endsWith('.md')) {
      files.push(full)
    }
  }
  return files
}

function extractWikilinks(content) {
  const stripped = content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')

  const links = []
  const regex = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g
  let match

  while ((match = regex.exec(stripped)) !== null) {
    links.push(match[1].trim().replaceAll('\\', '/'))
  }

  return links
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return null

  const endIndex = content.indexOf('\n---\n', 4)
  if (endIndex === -1) return null

  const raw = content.slice(4, endIndex).split('\n')
  const data = {}

  for (const line of raw) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf(':')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    data[key] = value
  }

  return data
}

function countLines(content) {
  return content.split('\n').filter((line) => line.trim().length > 0).length
}

function normalizeRelativePath(relativePath) {
  return relativePath.replaceAll('\\', '/')
}

function relativePathToPagePath(relativePath) {
  const normalized = normalizeRelativePath(relativePath)
  if (normalized === 'index.md') return 'index'
  if (normalized.endsWith('/index.md')) return normalized.slice(0, -'/index.md'.length)
  return normalized.replace(/\.md$/, '')
}

function normalizeSupportPath(value) {
  return normalizeRelativePath(value)
    .replace(/^(\.\.\/)+/g, '')
    .replace(/^\.?\//, '')
}

function extractTitle(content, fallback) {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : fallback
}

function isHubLikePage(record, outgoingCount = 0) {
  const relativePath = (record?.relativePath || '').toLowerCase()
  const title = (record?.title || '').toLowerCase()
  const stem = (record?.stem || '').toLowerCase()
  const pagePath = (record?.id || '').toLowerCase()

  if (relativePath === 'index.md') return true
  if (relativePath.endsWith('/readme.md')) return true
  if (stem === 'index' || stem === 'readme') return true
  if (['glossary', 'tractorpedia', 'social-soil-canvas'].includes(stem)) return true
  if (pagePath.endsWith('/glossary') || pagePath.endsWith('/tractorpedia') || pagePath.endsWith('/social-soil-canvas')) return true
  if (/\b(cluster|portfolio|directory|catalog|index|glossary|canvas)\b/.test(title)) return true
  if (/\b(projects|stories|ecosystem)\b/.test(title) && outgoingCount >= 6) return true
  if (outgoingCount >= 12) return true

  return false
}

// ---- Main -----------------------------------------------------------

const allFiles = walkMarkdown(WIKI_ROOT)
const graphFiles = allFiles.filter((file) => isCanonicalGraphFile(relative(WIKI_ROOT, file)))
const articleIds = new Set()
const articleById = new Map() // pagePath -> { id, stem, relativePath, title }
const articleIdsByStem = new Map() // stem -> Set<pagePath>
const rawLinksById = new Map() // pagePath -> string[]
const linkGraph = new Map() // pagePath -> Set<pagePath>
const linesById = new Map()
const MAIN_INDEX_PATH = join(WIKI_ROOT, 'index.md')
const LOAD_BEARING_SYNC_REQUIRED_FIELDS = [
  'title',
  'status',
  'date',
  'entity_type',
  'tagging_mode',
  'canonical_slug',
  'canonical_code',
  'website_path',
  'public_surface',
  'cluster',
  'empathy_ledger_key',
]
const domainCounts = countCanonicalArticlesByDomain(
  graphFiles.map((file) => relative(WIKI_ROOT, file)),
)
const frontmatterById = new Map()

const LOAD_BEARING_SYNC_CONTRACT_PATHS = new Set([
  'projects/contained.md',
  'projects/justicehub/justicehub.md',
  'projects/justicehub/three-circles.md',
  'projects/justicehub/staying.md',
  'projects/justicehub/the-brave-ones.md',
  'projects/act-farm/act-farm.md',
  'projects/act-farm/black-cockatoo-valley.md',
  'projects/the-harvest/the-harvest.md',
  'projects/the-harvest/green-harvest-witta.md',
  'projects/empathy-ledger.md',
  'projects/goods-on-country.md',
  'projects/picc/picc.md',
  'projects/picc/picc-centre-precinct.md',
  'projects/picc/picc-photo-kiosk.md',
  'projects/picc/picc-elders-hull-river.md',
])

function requiresLoadBearingSyncContract(relativePath) {
  if (LOAD_BEARING_SYNC_CONTRACT_PATHS.has(relativePath)) return true
  if (!relativePath.startsWith('projects/act-studio/')) return false
  return relativePath !== 'projects/act-studio/README.md'
}

for (const file of graphFiles) {
  const stem = basename(file, '.md')
  if (stem === 'index' && file !== MAIN_INDEX_PATH) continue

  const relativePath = normalizeRelativePath(relative(WIKI_ROOT, file))
  const id = relativePathToPagePath(relativePath)

  articleIds.add(id)
  articleById.set(id, {
    id,
    stem,
    relativePath,
    title: stem,
  })

  if (!articleIdsByStem.has(stem)) articleIdsByStem.set(stem, new Set())
  articleIdsByStem.get(stem).add(id)
}

function resolveLinkTarget(target) {
  const candidate = normalizeRelativePath(target.trim())
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.md$/i, '')

  if (!candidate) return null
  if (articleById.has(candidate)) return candidate

  const stem = candidate.split('/').pop()
  const matches = [...(articleIdsByStem.get(stem) || [])]
  if (matches.length === 1) return matches[0]

  return null
}

for (const file of graphFiles) {
  const stem = basename(file, '.md')
  if (stem === 'index' && file !== MAIN_INDEX_PATH) continue

  const relativePath = normalizeRelativePath(relative(WIKI_ROOT, file))
  const id = relativePathToPagePath(relativePath)
  const content = readFileSync(file, 'utf8')
  const rawLinks = extractWikilinks(content)
  const resolvedLinks = new Set()
  const frontmatter = parseFrontmatter(content)

  rawLinksById.set(id, rawLinks)
  frontmatterById.set(id, frontmatter)
  for (const target of rawLinks) {
    const resolved = resolveLinkTarget(target)
    if (resolved) resolvedLinks.add(resolved)
  }

  linkGraph.set(id, resolvedLinks)
  linesById.set(id, countLines(content))

  const record = articleById.get(id)
  if (record) {
    record.title = extractTitle(content, record.title)
  }
}

// ---- Checks ---------------------------------------------------------

const incoming = new Map()
for (const [src, targets] of linkGraph) {
  for (const target of targets) {
    if (!incoming.has(target)) incoming.set(target, new Set())
    incoming.get(target).add(src)
  }
}

const indexLinks = linkGraph.get('index') || new Set()

const orphans = []
for (const id of articleIds) {
  if (id === 'index') continue
  const incomingLinks = new Set(incoming.get(id) || [])
  incomingLinks.delete(id)
  if (incomingLinks.size === 0 && !indexLinks.has(id)) {
    orphans.push(id)
  }
}

const broken = []
for (const [from, targets] of rawLinksById) {
  for (const target of targets) {
    if (!resolveLinkTarget(target)) {
      broken.push({ from, to: target.replace(/\.md$/i, '') })
    }
  }
}

const stubs = []
for (const [id, lines] of linesById) {
  if (id === 'index') continue
  if (lines < 20) stubs.push({ id, lines })
}

const missingFromIndex = []
for (const id of articleIds) {
  if (id === 'index') continue
  if (!indexLinks.has(id)) missingFromIndex.push(id)
}

const missingBacklinks = []
const advisoryBacklinks = []
for (const [from, targets] of linkGraph) {
  if (from === 'index') continue
  const fromRecord = getRecord(from)
  const fromIsHubLike = isHubLikePage(fromRecord, targets.size)
  for (const target of targets) {
    if (target === 'index') continue
    const reverse = linkGraph.get(target) || new Set()
    if (!reverse.has(from)) {
      const entry = { from, to: target }
      if (fromIsHubLike) advisoryBacklinks.push(entry)
      else missingBacklinks.push(entry)
    }
  }
}

const frontmatterContractViolations = []
for (const [id, record] of articleById) {
  if (!requiresLoadBearingSyncContract(record.relativePath)) continue

  const frontmatter = frontmatterById.get(id) || {}
  const requiredFields = [...LOAD_BEARING_SYNC_REQUIRED_FIELDS]
  const entityType = frontmatter.entity_type || ''
  const taggingMode = frontmatter.tagging_mode || ''
  const needsParentProject =
    (typeof entityType === 'string' && entityType.includes('work')) ||
    (typeof taggingMode === 'string' && taggingMode !== 'own-code')

  if (needsParentProject) {
    requiredFields.push('parent_project')
  }

  const missingFields = requiredFields.filter((field) => {
    const value = frontmatter[field]
    return typeof value !== 'string' || value.trim().length === 0
  })

  if (missingFields.length) {
    frontmatterContractViolations.push({
      id,
      relativePath: record.relativePath,
      missingFields,
    })
  }
}

const rawSupportFiles = walkMarkdown(RAW_ROOT)
  .map((file) => normalizeRelativePath(relative(WIKI_ROOT, file)))
  .filter((file) => file !== 'raw/index.md')

const sourceSummaryFiles = walkMarkdown(SOURCES_ROOT)
  .map((file) => normalizeRelativePath(relative(WIKI_ROOT, file)))
  .filter((file) => file !== 'sources/index.md')

const sourceSummaryCoverage = new Map()
const orphanSourceSummaries = []
const rawSourceMetadata = rawSupportFiles.map((rawPath) => {
  const fullPath = join(WIKI_ROOT, rawPath)
  const content = readFileSync(fullPath, 'utf8')
  const frontmatter = parseFrontmatter(content) || {}
  return buildRawSourcePriorityRecord(rawPath, frontmatter, content)
})

for (const relativePath of sourceSummaryFiles) {
  const fullPath = join(WIKI_ROOT, relativePath)
  const content = readFileSync(fullPath, 'utf8')
  const frontmatter = parseFrontmatter(content)
  const rawSourceValue = frontmatter?.raw_source || frontmatter?.raw_source_path || ''
  const fallbackRawPath = `raw/${basename(relativePath)}`
  const rawPath = rawSourceValue
    ? normalizeSupportPath(rawSourceValue.endsWith('.md') ? rawSourceValue : `${rawSourceValue}.md`)
    : fallbackRawPath

  sourceSummaryCoverage.set(rawPath, relativePath)

  if (!rawSupportFiles.includes(rawPath)) {
    orphanSourceSummaries.push({
      source_summary: relativePath,
      raw_source: rawPath,
    })
  }
}

const missingSourceSummaryRecords = rawSourceMetadata
  .filter(({ raw_path }) => !sourceSummaryCoverage.has(raw_path))
  .sort(
    (a, b) =>
      b.priority_score - a.priority_score ||
      a.raw_path.localeCompare(b.raw_path),
  )

const missingSourceSummaries = missingSourceSummaryRecords.map(({ raw_path }) => raw_path)

const sourceBridgeByKind = rawSourceMetadata.reduce((acc, record) => {
  if (!acc[record.kind]) {
    acc[record.kind] = {
      raw_sources: 0,
      covered_raw_sources: 0,
      missing_raw_sources: 0,
    }
  }

  acc[record.kind].raw_sources += 1
  if (sourceSummaryCoverage.has(record.raw_path)) acc[record.kind].covered_raw_sources += 1
  else acc[record.kind].missing_raw_sources += 1
  return acc
}, {})

const sourceBridge = {
  raw_sources: rawSupportFiles.length,
  source_summaries: sourceSummaryFiles.length,
  covered_raw_sources: rawSupportFiles.length - missingSourceSummaries.length,
  missing_source_summaries: missingSourceSummaries.length,
  orphan_source_summaries: orphanSourceSummaries.length,
  by_kind: sourceBridgeByKind,
  coverage_pct:
    rawSupportFiles.length === 0
      ? 100
      : Math.round(
          ((rawSupportFiles.length - missingSourceSummaries.length) / rawSupportFiles.length) * 100,
        ),
}

// ---- Output ---------------------------------------------------------

const summary = {
  date: new Date().toISOString().split('T')[0],
  total_articles: articleIds.size - 1,
  total_links: [...linkGraph.values()].reduce((acc, links) => acc + links.size, 0),
  orphans: orphans.length,
  broken_links: broken.length,
  stubs: stubs.length,
  missing_from_index: missingFromIndex.length,
  missing_backlinks: missingBacklinks.length,
  advisory_backlinks: advisoryBacklinks.length,
}

function getRecord(id) {
  return articleById.get(id) || {
    id,
    stem: id.split('/').pop() || id,
    relativePath: `${id}.md`,
    title: id,
  }
}

function displayPath(id) {
  return getRecord(id).relativePath
}

function buildArticleRepairEntry(id) {
  const record = getRecord(id)
  return {
    stem: record.stem,
    title: record.title,
    relative_path: record.relativePath,
    page_path: id,
  }
}

const repairQueue = {
  broken_links: broken
    .map(({ from, to }) => ({
      ...buildArticleRepairEntry(from),
      missing_target: to,
    }))
    .sort((a, b) => a.relative_path.localeCompare(b.relative_path) || a.missing_target.localeCompare(b.missing_target))
    .slice(0, 8),
  missing_from_index: missingFromIndex
    .map((id) => buildArticleRepairEntry(id))
    .sort((a, b) => a.relative_path.localeCompare(b.relative_path))
    .slice(0, 8),
  missing_backlinks: missingBacklinks
    .map(({ from, to }) => ({
      ...buildArticleRepairEntry(from),
      target: buildArticleRepairEntry(to),
    }))
    .sort(
      (a, b) =>
        a.relative_path.localeCompare(b.relative_path) ||
        a.target.relative_path.localeCompare(b.target.relative_path),
    )
    .slice(0, 8),
  orphan_pages: orphans
    .map((id) => buildArticleRepairEntry(id))
    .sort((a, b) => a.relative_path.localeCompare(b.relative_path))
    .slice(0, 8),
  stubs: stubs
    .sort((a, b) => a.lines - b.lines || a.id.localeCompare(b.id))
    .slice(0, 8)
    .map(({ id, lines }) => ({
      ...buildArticleRepairEntry(id),
      lines,
    })),
  advisory_backlinks: advisoryBacklinks
    .map(({ from, to }) => ({
      ...buildArticleRepairEntry(from),
      target: buildArticleRepairEntry(to),
    }))
    .sort(
      (a, b) =>
        a.relative_path.localeCompare(b.relative_path) ||
        a.target.relative_path.localeCompare(b.target.relative_path),
    )
    .slice(0, 8),
  frontmatter_contract_violations: frontmatterContractViolations
    .map(({ id, missingFields }) => ({
      ...buildArticleRepairEntry(id),
      missing_fields: missingFields,
    }))
    .sort((a, b) => a.relative_path.localeCompare(b.relative_path))
    .slice(0, 8),
  missing_source_summaries: missingSourceSummaries.slice(0, 12).map((rawPath) => ({
    raw_source: rawPath,
    suggested_summary: `sources/${basename(rawPath)}`,
    kind:
      missingSourceSummaryRecords.find((record) => record.raw_path === rawPath)?.kind || 'raw_capture',
    priority:
      missingSourceSummaryRecords.find((record) => record.raw_path === rawPath)?.priority_label || 'medium',
    focus:
      missingSourceSummaryRecords.find((record) => record.raw_path === rawPath)?.focus || [],
  })),
  orphan_source_summaries: orphanSourceSummaries
    .slice(0, 12)
    .map(({ source_summary, raw_source }) => ({ source_summary, raw_source })),
}

if (asJson) {
  console.log(
    JSON.stringify(
      {
        scope: 'canonical-graph',
        domains: domainCounts,
        summary,
        source_bridge: sourceBridge,
        repair_queue: repairQueue,
        frontmatter_contract_violations: frontmatterContractViolations,
        orphans,
        broken,
        stubs,
        missingFromIndex,
        missingBacklinks,
        advisoryBacklinks,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

const reportLines = []
reportLines.push(`# Wiki Health Report — ${summary.date}`)
reportLines.push('')
reportLines.push('_Scope: canonical Tractorpedia graph only (excludes raw, output, library, dashboards, sources, and narrative store)._')
reportLines.push('')
reportLines.push(`**Articles:** ${summary.total_articles}`)
reportLines.push(`**Wikilinks:** ${summary.total_links}`)
reportLines.push('')
reportLines.push('## Summary')
reportLines.push('')
reportLines.push('| Check | Count |')
reportLines.push('|-------|-------|')
reportLines.push(`| Orphans (no incoming links, not in index) | ${summary.orphans} |`)
reportLines.push(`| Broken wikilinks | ${summary.broken_links} |`)
reportLines.push(`| Stub articles (< 20 lines) | ${summary.stubs} |`)
reportLines.push(`| Missing from index.md | ${summary.missing_from_index} |`)
reportLines.push(`| Missing backlinks | ${summary.missing_backlinks} |`)
reportLines.push(`| Advisory hub/list links without backlinks | ${summary.advisory_backlinks} |`)
reportLines.push(`| Load-bearing sync pages missing sync frontmatter | ${frontmatterContractViolations.length} |`)
reportLines.push('')

reportLines.push('## Source Bridge Coverage')
reportLines.push('')
reportLines.push('| Check | Count |')
reportLines.push('|-------|-------|')
reportLines.push(`| Raw markdown sources in \`wiki/raw/\` | ${sourceBridge.raw_sources} |`)
reportLines.push(`| Source summaries in \`wiki/sources/\` | ${sourceBridge.source_summaries} |`)
reportLines.push(`| Raw sources with a bridge summary | ${sourceBridge.covered_raw_sources} |`)
reportLines.push(`| Raw sources missing a bridge summary | ${sourceBridge.missing_source_summaries} |`)
reportLines.push(`| Source summaries pointing at missing raw files | ${sourceBridge.orphan_source_summaries} |`)
reportLines.push(`| Bridge coverage | ${sourceBridge.coverage_pct}% |`)
reportLines.push('')

reportLines.push('### Source Bridge Coverage by Kind')
reportLines.push('')
reportLines.push('| Kind | Raw | Covered | Missing |')
reportLines.push('|------|-----|---------|---------|')
for (const [kind, stats] of Object.entries(sourceBridge.by_kind).sort((a, b) => a[0].localeCompare(b[0]))) {
  reportLines.push(`| ${kind} | ${stats.raw_sources} | ${stats.covered_raw_sources} | ${stats.missing_raw_sources} |`)
}
reportLines.push('')

reportLines.push('## Domain Coverage')
reportLines.push('')
reportLines.push('| Domain | Articles |')
reportLines.push('|--------|----------|')
for (const [domain, count] of Object.entries(domainCounts)) {
  reportLines.push(`| ${domain} | ${count} |`)
}
reportLines.push('')

if (orphans.length) {
  reportLines.push('## Orphans')
  reportLines.push('')
  for (const id of orphans.sort()) reportLines.push(`- \`${displayPath(id)}\``)
  reportLines.push('')
}

if (broken.length) {
  reportLines.push('## Broken Wikilinks')
  reportLines.push('')
  for (const { from, to } of broken.slice(0, 50)) {
    reportLines.push(`- \`${displayPath(from)}\` → \`[[${to}]]\``)
  }
  if (broken.length > 50) reportLines.push(`- ... and ${broken.length - 50} more`)
  reportLines.push('')
}

if (stubs.length) {
  reportLines.push('## Stubs (Enrichment Priority)')
  reportLines.push('')
  for (const { id, lines } of stubs.sort((a, b) => a.lines - b.lines).slice(0, 20)) {
    reportLines.push(`- \`${displayPath(id)}\` (${lines} lines)`)
  }
  if (stubs.length > 20) reportLines.push(`- ... and ${stubs.length - 20} more`)
  reportLines.push('')
}

if (missingFromIndex.length) {
  reportLines.push('## Articles Missing from index.md')
  reportLines.push('')
  for (const id of missingFromIndex.sort().slice(0, 30)) {
    reportLines.push(`- \`${displayPath(id)}\``)
  }
  if (missingFromIndex.length > 30) reportLines.push(`- ... and ${missingFromIndex.length - 30} more`)
  reportLines.push('')
}

if (missingBacklinks.length) {
  reportLines.push('## Missing Backlinks (top 30)')
  reportLines.push('')
  for (const { from, to } of missingBacklinks.slice(0, 30)) {
    reportLines.push(`- \`${displayPath(from)}\` links to \`${displayPath(to)}\` but \`${displayPath(to)}\` doesn't link back`)
  }
  if (missingBacklinks.length > 30) reportLines.push(`- ... and ${missingBacklinks.length - 30} more`)
  reportLines.push('')
}

if (frontmatterContractViolations.length) {
  reportLines.push('## Load-Bearing Art/Work Frontmatter Violations')
  reportLines.push('')
  reportLines.push('These pages are expected to carry the canonical sync contract because downstream website, EL, and Supabase layers depend on them.')
  reportLines.push('')
  for (const { relativePath, missingFields } of frontmatterContractViolations.slice(0, 20)) {
    reportLines.push(`- \`${relativePath}\` missing: ${missingFields.map((field) => `\`${field}\``).join(', ')}`)
  }
  if (frontmatterContractViolations.length > 20) {
    reportLines.push(`- ... and ${frontmatterContractViolations.length - 20} more`)
  }
  reportLines.push('')
}

if (missingSourceSummaries.length) {
  reportLines.push('## Priority Raw Sources Missing Source Summaries (top 20)')
  reportLines.push('')
  reportLines.push('These are the best next bridge candidates based on flagship relevance, ACT article corpus value, and sync importance.')
  reportLines.push('')
  for (const record of missingSourceSummaryRecords.slice(0, 20)) {
    const focusSuffix = record.focus.length ? ` · focus: ${record.focus.join(', ')}` : ''
    reportLines.push(`- \`${record.raw_path}\` [${record.priority_label} | ${record.kind}]${focusSuffix}`)
  }
  if (missingSourceSummaryRecords.length > 20) {
    reportLines.push(`- ... and ${missingSourceSummaryRecords.length - 20} more`)
  }
  reportLines.push('')

  reportLines.push('## Raw Sources Missing Source Summaries (top 40)')
  reportLines.push('')
  reportLines.push('These raw files exist in `wiki/raw/` but do not yet have a bridge summary in `wiki/sources/`. That means they are captured but not yet navigable as part of the compiled knowledge loop.')
  reportLines.push('')
  for (const record of missingSourceSummaryRecords.slice(0, 40)) {
    const focusSuffix = record.focus.length ? ` (${record.kind}; focus: ${record.focus.join(', ')})` : ` (${record.kind})`
    reportLines.push(`- \`${record.raw_path}\` → expected bridge summary \`sources/${basename(record.raw_path)}\`${focusSuffix}`)
  }
  if (missingSourceSummaries.length > 40) {
    reportLines.push(`- ... and ${missingSourceSummaries.length - 40} more`)
  }
  reportLines.push('')
}

if (orphanSourceSummaries.length) {
  reportLines.push('## Source Summaries With Missing Raw Sources')
  reportLines.push('')
  for (const { source_summary, raw_source } of orphanSourceSummaries.slice(0, 20)) {
    reportLines.push(`- \`${source_summary}\` points to missing raw source \`${raw_source}\``)
  }
  if (orphanSourceSummaries.length > 20) {
    reportLines.push(`- ... and ${orphanSourceSummaries.length - 20} more`)
  }
  reportLines.push('')
}

if (advisoryBacklinks.length) {
  reportLines.push('## Advisory Hub/List Links Without Backlinks (top 20)')
  reportLines.push('')
  reportLines.push('These come from cluster pages, portfolios, index-style pages, or very broad overview pages. They are navigational references, not default repair work.')
  reportLines.push('')
  for (const { from, to } of advisoryBacklinks.slice(0, 20)) {
    reportLines.push(`- \`${displayPath(from)}\` references \`${displayPath(to)}\` without a reciprocal link`)
  }
  if (advisoryBacklinks.length > 20) reportLines.push(`- ... and ${advisoryBacklinks.length - 20} more`)
  reportLines.push('')
}

const report = reportLines.join('\n')
console.log(report)

if (writeReport) {
  const reportPath = join(WIKI_ROOT, 'output', `lint-${summary.date}.md`)
  const statusPath = join(WIKI_ROOT, 'output', 'status-latest.json')

  writeFileSync(reportPath, report)
  writeFileSync(
    statusPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        scope: 'canonical-graph',
        domains: domainCounts,
        summary,
        source_bridge: sourceBridge,
        repair_queue: repairQueue,
        frontmatter_contract_violations: frontmatterContractViolations,
        backlink_policy: {
          missing_backlinks: 'Reciprocal links expected for non-hub articles only.',
          advisory_backlinks:
            'Cluster pages, portfolios, and broad overview pages are reported separately as navigational references.',
        },
      },
      null,
      2,
    ),
  )

  console.error(`\nReport saved to: ${reportPath}`)
  console.error(`Status saved to: ${statusPath}`)

  try {
    logWikiEvent(
      'lint',
      `${summary.total_articles} canonical articles · ${broken.length} broken links · ${orphans.length} orphans · ${sourceBridge.coverage_pct}% source-bridge coverage`,
      [`wiki/output/lint-${summary.date}.md`, 'wiki/output/status-latest.json'],
    )
  } catch (error) {
    console.error('  ⚠ wiki-log append failed:', error.message)
  }
}

process.exit(broken.length > 0 || frontmatterContractViolations.length > 0 ? 1 : 0)
