#!/usr/bin/env node
/**
 * wiki-refresh-people-candidates.mjs
 *
 * Build a curated candidate queue for `wiki/people/` from Empathy Ledger.
 *
 * Design rule:
 * - Empathy Ledger is the source population for storytellers and voices.
 * - Tractorpedia `wiki/people/` is a curated layer for load-bearing, named people.
 * - This script deliberately does NOT mirror every storyteller into the repo.
 *
 * It writes:
 * - wiki/output/el-people-candidates-latest.md
 * - wiki/output/el-people-candidates-latest.json
 *
 * Usage:
 *   node scripts/wiki-refresh-people-candidates.mjs
 *   node scripts/wiki-refresh-people-candidates.mjs --dry-run
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, basename, relative, dirname } from 'path'
import { logWikiEvent } from './wiki-log.mjs'
import { WALK_SKIP_DIRS, isCanonicalGraphFile } from './lib/wiki-scope.mjs'

const ROOT = process.cwd()
const WIKI = join(ROOT, 'wiki')
const PEOPLE_DIR = join(WIKI, 'people')
const OUTPUT_MD = join(WIKI, 'output', 'el-people-candidates-latest.md')
const OUTPUT_JSON = join(WIKI, 'output', 'el-people-candidates-latest.json')
const dryRun = process.argv.includes('--dry-run')

const DEFAULT_EL_URL = 'https://yvnuayzslukamizrlhwb.supabase.co'
const DEFAULT_EL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bnVheXpzbHVrYW1penJsaHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNDQ4NTAsImV4cCI6MjA3MTgyMDg1MH0.UV8JOXSwANMl72lRjw-9d4CKniHSlDk9hHZpKHYN6Bs'
const EL_URL = process.env.EL_SUPABASE_URL || DEFAULT_EL_URL
const EL_KEY =
  process.env.EL_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_EL_SUPABASE_ANON_KEY ||
  DEFAULT_EL_ANON_KEY

const HEADERS = {
  apikey: EL_KEY,
  Authorization: `Bearer ${EL_KEY}`,
}

function walkMarkdown(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (WALK_SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walkMarkdown(full, files)
    else if (entry.endsWith('.md')) files.push(full)
  }
  return files
}

function normalizeRelativePath(relPath) {
  return relPath.replaceAll('\\', '/')
}

function relativePathToPagePath(relativePath) {
  const normalized = normalizeRelativePath(relativePath)
  if (normalized === 'index.md') return 'index'
  if (normalized.endsWith('/index.md')) return normalized.slice(0, -'/index.md'.length)
  return normalized.replace(/\.md$/, '')
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return { meta: {}, body: content }
  const end = content.indexOf('\n---\n', 4)
  if (end === -1) return { meta: {}, body: content }
  const fmText = content.slice(4, end)
  const body = content.slice(end + 5)
  const meta = {}
  for (const line of fmText.split('\n')) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)$/)
    if (m) meta[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return { meta, body }
}

function extractTitle(meta, body, fallbackStem) {
  if (meta.title) return meta.title
  const h1 = body.match(/^#\s+(.+?)$/m)
  if (h1) return h1[1].trim()
  return fallbackStem.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function escapeCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .trim()
}

async function fetchAll(path, limit = 500) {
  const rows = []
  let offset = 0
  while (true) {
    const sep = path.includes('?') ? '&' : '?'
    const url = `${EL_URL}/rest/v1/${path}${sep}limit=${limit}&offset=${offset}`
    const response = await fetch(url, { headers: HEADERS })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`EL fetch failed for ${path}: ${response.status} ${text}`)
    }
    const data = await response.json()
    rows.push(...data)
    if (data.length < limit) break
    offset += limit
  }
  return rows
}

function loadExistingPeople() {
  const byName = new Map()
  for (const file of readdirSync(PEOPLE_DIR)) {
    if (!file.endsWith('.md')) continue
    const full = join(PEOPLE_DIR, file)
    const raw = readFileSync(full, 'utf8')
    const { meta, body } = parseFrontmatter(raw)
    const title = extractTitle(meta, body, basename(file, '.md'))
    byName.set(normalizeName(title), {
      title,
      relativePath: normalizeRelativePath(relative(WIKI, full)),
      stem: basename(file, '.md'),
    })
  }
  return byName
}

function loadCanonicalProjectMap() {
  const files = walkMarkdown(WIKI).filter((file) => {
    const rel = normalizeRelativePath(relative(WIKI, file))
    return isCanonicalGraphFile(rel) && rel.startsWith('projects/')
  })

  const byStem = new Map()
  const byTitle = new Map()
  for (const file of files) {
    const rel = normalizeRelativePath(relative(WIKI, file))
    const stem = basename(file, '.md')
    const raw = readFileSync(file, 'utf8')
    const { meta, body } = parseFrontmatter(raw)
    const title = extractTitle(meta, body, stem)
    const pagePath = relativePathToPagePath(rel)
    const entry = { stem, title, relativePath: rel, pagePath }
    byStem.set(stem, entry)
    byTitle.set(slugify(title), entry)
  }
  return { byStem, byTitle }
}

function loadCanonicalEntityNameSet() {
  const files = walkMarkdown(WIKI).filter((file) => {
    const rel = normalizeRelativePath(relative(WIKI, file))
    return isCanonicalGraphFile(rel) && !rel.startsWith('people/')
  })

  const names = new Set()
  for (const file of files) {
    const rel = normalizeRelativePath(relative(WIKI, file))
    const stem = basename(file, '.md')
    const raw = readFileSync(file, 'utf8')
    const { meta, body } = parseFrontmatter(raw)
    const title = extractTitle(meta, body, stem)
    names.add(normalizeName(stem))
    names.add(normalizeName(title))
    names.add(normalizeName(relativePathToPagePath(rel)))
  }
  return names
}

function loadMentionCorpus() {
  const files = walkMarkdown(WIKI).filter((file) => {
    const rel = normalizeRelativePath(relative(WIKI, file))
    return isCanonicalGraphFile(rel) && !rel.startsWith('people/')
  })

  return files.map((file) => ({
    relativePath: normalizeRelativePath(relative(WIKI, file)),
    content: readFileSync(file, 'utf8'),
  }))
}

function countMentions(displayName, corpus) {
  if (!displayName) return 0
  const escaped = displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi')
  let count = 0
  for (const doc of corpus) {
    const matches = doc.content.match(regex)
    if (matches) count += matches.length
  }
  return count
}

function autoMatchProject(elProject, projectMap) {
  const manualOverrides = {
    goods: 'goods-on-country',
    'goods-on-country': 'goods-on-country',
    'picc-centre-precinct': 'picc',
    'palm-island': 'picc',
    justicehub: 'justicehub',
    'empathy-ledger': 'empathy-ledger',
    contained: 'contained',
    oonchiumpa: 'oonchiumpa',
    'black-cockatoo-valley': 'black-cockatoo-valley',
    'confit-pathways': 'confit-pathways',
    'mounty-yarns': 'mounty-yarns',
    campfire: 'campfire',
    'bg-fit': 'bg-fit',
    'the-harvest': 'the-harvest',
    'act-farm': 'act-farm',
  }

  const slug = slugify(elProject?.slug || '')
  const name = slugify(elProject?.name || '')
  const override = manualOverrides[slug] || manualOverrides[name]
  if (override && projectMap.byStem.has(override)) return projectMap.byStem.get(override)
  if (projectMap.byStem.has(slug)) return projectMap.byStem.get(slug)
  if (projectMap.byStem.has(name)) return projectMap.byStem.get(name)
  if (projectMap.byTitle.has(name)) return projectMap.byTitle.get(name)

  for (const [stem, entry] of projectMap.byStem.entries()) {
    if (slug && (stem.includes(slug) || slug.includes(stem))) return entry
    const titleSlug = slugify(entry.title)
    if (name && titleSlug && (titleSlug.includes(name) || name.includes(titleSlug))) return entry
  }

  return null
}

function isGenericName(displayName) {
  const value = String(displayName || '').trim()
  if (!value) return true
  if (value.length < 3) return true
  return /(staff|test|admin|anonymous|unknown|user|participant|team)$/i.test(value)
}

function isCollectiveLabel(displayName) {
  const value = String(displayName || '').trim()
  return /\b(group|workers|conversation|collective|team|crew|mob|delegation|youth|children|community|program|project|hub)\b/i.test(value)
}

function hasStandalonePersonShape(displayName) {
  const value = String(displayName || '').trim()
  if (!value) return false
  const words = value.split(/\s+/).filter(Boolean)
  return words.length >= 2
}

function isCanonicalEntityLabel(displayName, canonicalEntityNames) {
  const normalized = normalizeName(displayName)
  return canonicalEntityNames.has(normalized)
}

function buildReasonList(candidate) {
  const reasons = []
  if (candidate.isElder) reasons.push('Elder')
  if (candidate.isFeatured) reasons.push('Featured storyteller')
  if (candidate.publicStoryCount > 0) reasons.push(`${candidate.publicStoryCount} public stor${candidate.publicStoryCount === 1 ? 'y' : 'ies'}`)
  if (candidate.canonicalProjects.length > 0) reasons.push(`${candidate.canonicalProjects.length} canonical project link${candidate.canonicalProjects.length === 1 ? '' : 's'}`)
  if (candidate.mentionCount > 0) reasons.push(`${candidate.mentionCount} wiki mention${candidate.mentionCount === 1 ? '' : 's'}`)
  if (candidate.hasBio) reasons.push('bio present')
  return reasons
}

function scoreCandidate(candidate) {
  let score = 0
  if (candidate.isElder) score += 4
  if (candidate.isFeatured) score += 3
  if (candidate.publicStoryCount >= 3) score += 3
  else if (candidate.publicStoryCount >= 1) score += 1
  if (candidate.canonicalProjects.length >= 2) score += 3
  else if (candidate.canonicalProjects.length >= 1) score += 2
  if (candidate.mentionCount >= 3) score += 3
  else if (candidate.mentionCount >= 1) score += 1
  if (candidate.hasBio) score += 1
  if (candidate.hasAvatar) score += 1
  if (candidate.culturalBackground) score += 1
  if (candidate.genericName) score -= 5
  return score
}

function formatProjectLinks(projects) {
  if (!projects.length) return '—'
  return projects.map((project) => `[[${project.stem}|${project.title}]]`).join(', ')
}

function formatCandidateTable(rows) {
  if (rows.length === 0) return '_None right now._\n'
  let md = '| Name | Suggested file | Score | Why now | Canonical links |\n'
  md += '|---|---|---:|---|---|\n'
  for (const row of rows) {
    md += `| ${escapeCell(row.displayName)} | \`wiki/people/${row.suggestedFile}.md\` | ${row.score} | ${escapeCell(row.reasons.join('; '))} | ${escapeCell(formatProjectLinks(row.canonicalProjects))} |\n`
  }
  return md
}

async function main() {
  const existingPeople = loadExistingPeople()
  const projectMap = loadCanonicalProjectMap()
  const canonicalEntityNames = loadCanonicalEntityNameSet()
  const mentionCorpus = loadMentionCorpus()

  const [storytellers, projects, publicStories] = await Promise.all([
    fetchAll('storytellers?select=id,display_name,bio,public_avatar_url,location,cultural_background,is_elder,is_featured,tags&is_active=eq.true&order=is_elder.desc,display_name.asc'),
    fetchAll('projects?select=id,name,slug&order=name.asc'),
    fetchAll('stories?select=id,storyteller_id,title,project_id,is_public,status&is_public=eq.true&status=eq.published'),
  ])

  const projectById = new Map(projects.map((project) => [project.id, project]))
  const storiesByStoryteller = new Map()
  for (const story of publicStories) {
    const bucket = storiesByStoryteller.get(story.storyteller_id) || []
    bucket.push(story)
    storiesByStoryteller.set(story.storyteller_id, bucket)
  }

  const rawCandidates = storytellers.map((storyteller) => {
    const displayName = storyteller.display_name || 'Unknown'
    const normalized = normalizeName(displayName)
    const storytellerStories = storiesByStoryteller.get(storyteller.id) || []
    const canonicalProjects = []
    const seenPagePaths = new Set()

    for (const story of storytellerStories) {
      const project = projectById.get(story.project_id)
      if (!project) continue
      const match = autoMatchProject(project, projectMap)
      if (match && !seenPagePaths.has(match.pagePath)) {
        seenPagePaths.add(match.pagePath)
        canonicalProjects.push(match)
      }
    }

    const candidate = {
      id: storyteller.id,
      displayName,
      normalizedName: normalized,
      suggestedFile: slugify(displayName),
      existingPage: existingPeople.get(normalized) || null,
      publicStoryCount: storytellerStories.length,
      canonicalProjects,
      isElder: Boolean(storyteller.is_elder),
      isFeatured: Boolean(storyteller.is_featured),
      hasBio: Boolean(String(storyteller.bio || '').trim()),
      hasAvatar: Boolean(String(storyteller.public_avatar_url || '').trim()),
      culturalBackground: Array.isArray(storyteller.cultural_background)
        ? storyteller.cultural_background.join(', ')
        : storyteller.cultural_background || '',
      location: storyteller.location || '',
      genericName:
        isGenericName(displayName) ||
        isCollectiveLabel(displayName) ||
        (!hasStandalonePersonShape(displayName) && !existingPeople.get(normalized)) ||
        isCanonicalEntityLabel(displayName, canonicalEntityNames),
      mentionCount: countMentions(displayName, mentionCorpus),
    }

    candidate.score = scoreCandidate(candidate)
    candidate.reasons = buildReasonList(candidate)
    return candidate
  })

  const deduped = new Map()
  for (const candidate of rawCandidates) {
    const existing = deduped.get(candidate.normalizedName)
    if (!existing) {
      deduped.set(candidate.normalizedName, {
        ...candidate,
        sourceIds: [candidate.id],
      })
      continue
    }

    existing.sourceIds.push(candidate.id)
    existing.publicStoryCount += candidate.publicStoryCount
    existing.isElder = existing.isElder || candidate.isElder
    existing.isFeatured = existing.isFeatured || candidate.isFeatured
    existing.hasBio = existing.hasBio || candidate.hasBio
    existing.hasAvatar = existing.hasAvatar || candidate.hasAvatar
    existing.genericName = existing.genericName && candidate.genericName
    existing.mentionCount = Math.max(existing.mentionCount, candidate.mentionCount)
    if (!existing.culturalBackground && candidate.culturalBackground) existing.culturalBackground = candidate.culturalBackground
    if (!existing.location && candidate.location) existing.location = candidate.location
    if (!existing.existingPage && candidate.existingPage) existing.existingPage = candidate.existingPage
    if (candidate.displayName.length > existing.displayName.length) {
      existing.displayName = candidate.displayName
      existing.suggestedFile = candidate.suggestedFile
    }

    const seenProjects = new Set(existing.canonicalProjects.map((project) => project.pagePath))
    for (const project of candidate.canonicalProjects) {
      if (!seenProjects.has(project.pagePath)) {
        seenProjects.add(project.pagePath)
        existing.canonicalProjects.push(project)
      }
    }
  }

  const candidates = [...deduped.values()].map((candidate) => {
    candidate.score = scoreCandidate(candidate)
    candidate.reasons = buildReasonList(candidate)
    return candidate
  })

  const existingCoverage = candidates
    .filter((candidate) => candidate.existingPage)
    .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName))

  const recommendedNow = candidates
    .filter((candidate) =>
      !candidate.existingPage &&
      !candidate.genericName &&
      candidate.publicStoryCount >= 1 &&
      (candidate.canonicalProjects.length >= 1 || candidate.mentionCount >= 2) &&
      candidate.score >= 5
    )
    .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName))

  const watchlist = candidates
    .filter((candidate) =>
      !candidate.existingPage &&
      !candidate.genericName &&
      candidate.publicStoryCount >= 1 &&
      (candidate.canonicalProjects.length >= 1 || candidate.mentionCount >= 1) &&
      candidate.score >= 3 &&
      !recommendedNow.some((entry) => entry.id === candidate.id)
    )
    .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName))

  const suppressedSummary = {
    generic_name: candidates.filter((candidate) => !candidate.existingPage && candidate.genericName).length,
    no_public_story: candidates.filter((candidate) => !candidate.existingPage && candidate.publicStoryCount === 0).length,
    no_canonical_project_link: candidates.filter((candidate) => !candidate.existingPage && candidate.publicStoryCount > 0 && candidate.canonicalProjects.length === 0).length,
    low_signal_after_filters: candidates.filter((candidate) =>
      !candidate.existingPage &&
      !candidate.genericName &&
      candidate.publicStoryCount > 0 &&
      candidate.canonicalProjects.length >= 1 &&
      candidate.score < 3
    ).length,
  }

  const summary = {
    generated_at: new Date().toISOString(),
    active_storytellers_scanned: storytellers.length,
    deduped_people_considered: candidates.length,
    public_story_records_scanned: publicStories.length,
    storytellers_with_public_stories: candidates.filter((candidate) => candidate.publicStoryCount > 0).length,
    storytellers_linked_to_canonical_projects: candidates.filter((candidate) => candidate.canonicalProjects.length > 0).length,
    already_covered: existingCoverage.length,
    recommended_now: recommendedNow.length,
    watchlist: watchlist.length,
    suppressed_summary: suppressedSummary,
  }

  const report = `# EL People Candidates — ${summary.generated_at.slice(0, 10)}

> Curated candidate queue for \`wiki/people/\` derived from Empathy Ledger. This is intentionally **not** a full mirror of all storytellers.

## Policy

- **Empathy Ledger is the source population** for storytellers, voices, bios, and consent-aware public story surfaces.
- **Tractorpedia people pages are curated**. They exist for named, load-bearing people who help a reader understand ACT's work, methods, partnerships, and public proof.
- **Public/consented evidence comes first**. This queue only considers active EL storytellers with public stories when recommending new wiki pages.
- **Hold by default** if a profile is generic, sparse, not linked to a canonical ACT project, or better surfaced through EL's live voices layer instead of a permanent wiki biography.

## Summary

- Active EL storytellers scanned: **${summary.active_storytellers_scanned}**
- Public story records scanned: **${summary.public_story_records_scanned}**
- Storytellers with at least one public story: **${summary.storytellers_with_public_stories}**
- Storytellers linked to canonical wiki projects: **${summary.storytellers_linked_to_canonical_projects}**
- Already covered in \`wiki/people/\`: **${summary.already_covered}**
- Recommended now: **${summary.recommended_now}**
- Watchlist: **${summary.watchlist}**

## Recommended Now

${formatCandidateTable(recommendedNow.slice(0, 15))}

## Watchlist

${formatCandidateTable(watchlist.slice(0, 15))}

## Already Covered

${formatCandidateTable(existingCoverage.slice(0, 15))}

## Suppressed Summary

- Generic or placeholder names: **${suppressedSummary.generic_name}**
- No public story surface yet: **${suppressedSummary.no_public_story}**
- Public stories but no canonical ACT project link: **${suppressedSummary.no_canonical_project_link}**
- Linked but still low-signal for a standalone page: **${suppressedSummary.low_signal_after_filters}**

## Working Rule

Use this queue to decide **who should get a durable people page next**. Everyone else remains visible through:

- the live Empathy Ledger story/staff/storyteller surfaces
- the Tractorpedia/command-center voices integrations
- project-level story blocks and EL-linked media

That keeps \`wiki/people/\` small, useful, and legible.
`

  const jsonPayload = {
    summary,
    recommended_now: recommendedNow.slice(0, 30),
    watchlist: watchlist.slice(0, 30),
    already_covered: existingCoverage.slice(0, 30).map((candidate) => ({
      displayName: candidate.displayName,
      score: candidate.score,
      existingPage: candidate.existingPage,
      publicStoryCount: candidate.publicStoryCount,
      canonicalProjects: candidate.canonicalProjects,
      reasons: candidate.reasons,
    })),
  }

  if (!dryRun) {
    writeFileSync(OUTPUT_MD, report, 'utf8')
    writeFileSync(OUTPUT_JSON, JSON.stringify(jsonPayload, null, 2), 'utf8')
    logWikiEvent(
      'enrich',
      `EL people candidate queue refreshed: ${summary.recommended_now} recommended, ${summary.watchlist} watchlist, ${summary.already_covered} already covered`,
      [OUTPUT_MD, OUTPUT_JSON],
    )
  }

  console.log(report)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
