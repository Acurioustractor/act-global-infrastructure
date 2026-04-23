import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { dirname, join, resolve } from 'path'

export interface WikiFileRecord {
  source: 'canonical' | 'snapshot'
  relativePath: string
  path: string
  title: string
  sectionId: string
  sectionTitle: string
  frontmatter: Record<string, string>
  content: string
}

export interface WikiStatus {
  generated_at: string
  scope: string
  domains: Record<string, number>
  summary: {
    date: string
    total_articles: number
    total_links: number
    orphans: number
    broken_links: number
    stubs: number
    missing_from_index: number
    missing_backlinks: number
    advisory_backlinks?: number
  }
  repair_queue: {
    broken_links: Array<{
      stem: string
      title: string
      relative_path: string
      page_path: string
      missing_target: string
    }>
    missing_from_index: Array<{
      stem: string
      title: string
      relative_path: string
      page_path: string
    }>
    missing_backlinks?: Array<{
      stem: string
      title: string
      relative_path: string
      page_path: string
      target: {
        stem: string
        title: string
        relative_path: string
        page_path: string
      }
    }>
    orphan_pages: Array<{
      stem: string
      title: string
      relative_path: string
      page_path: string
    }>
    stubs: Array<{
      stem: string
      title: string
      relative_path: string
      page_path: string
      lines: number
    }>
    advisory_backlinks?: Array<{
      stem: string
      title: string
      relative_path: string
      page_path: string
      target: {
        stem: string
        title: string
        relative_path: string
        page_path: string
      }
    }>
  }
  backlink_policy?: {
    missing_backlinks?: string
    advisory_backlinks?: string
  }
}

const CANONICAL_SECTION_ORDER = [
  'concepts',
  'projects',
  'communities',
  'people',
  'stories',
  'art',
  'research',
  'technical',
  'finance',
  'decisions',
  'synthesis',
] as const

const CANONICAL_SECTION_TITLES: Record<string, string> = {
  concepts: 'Concepts',
  projects: 'Projects',
  communities: 'Communities',
  people: 'People',
  stories: 'Stories',
  art: 'Art',
  research: 'Research',
  technical: 'Technical',
  finance: 'Finance',
  decisions: 'Decisions',
  synthesis: 'Synthesis',
}

const LEGACY_ALIASES: Record<string, string> = {
  act: 'concepts/act-identity',
  'the-farm': 'projects/act-farm',
  'the-studio': 'projects/act-studio',
  'the-harvest': 'projects/the-harvest',
  goods: 'projects/goods',
  justicehub: 'projects/justicehub',
  'empathy-ledger': 'projects/empathy-ledger',
  contained: 'art/contained',
  picc: 'projects/picc',
}

function findWorkspaceRoot(start = process.cwd()) {
  let current = resolve(start)

  while (true) {
    if (existsSync(join(current, 'wiki', 'index.md'))) return current
    const parent = dirname(current)
    if (parent === current) return resolve(start)
    current = parent
  }
}

const WORKSPACE_ROOT = findWorkspaceRoot()
const CANONICAL_WIKI_DIR = join(WORKSPACE_ROOT, 'wiki')
const SNAPSHOT_WIKI_DIR = join(WORKSPACE_ROOT, 'apps', 'command-center', 'public', 'wiki')
const STATUS_PATH = join(CANONICAL_WIKI_DIR, 'output', 'status-latest.json')

function stripFrontmatter(content: string) {
  const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)
  return match ? match[1] : content
}

function parseFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: {} as Record<string, string>, body: content }

  const frontmatter: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':')
    if (!key || rest.length === 0) continue
    frontmatter[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '')
  }

  return { frontmatter, body: match[2] }
}

function extractTitle(content: string, fallback: string) {
  const titleMatch = stripFrontmatter(content).match(/^#\s+(.+)$/m)
  return titleMatch ? titleMatch[1].trim() : fallback
}

function normalizeRelativePath(relativePath: string) {
  return relativePath.replaceAll('\\', '/')
}

function relativePathToPagePath(relativePath: string) {
  const normalized = normalizeRelativePath(relativePath)
  if (normalized === 'index.md') return 'index'
  if (normalized.endsWith('/index.md')) return normalized.slice(0, -'/index.md'.length)
  const withoutExtension = normalized.replace(/\.md$/, '')
  const parts = withoutExtension.split('/')
  const stem = parts[parts.length - 1]
  const parent = parts[parts.length - 2]
  if (parent && stem === parent) return parts.slice(0, -1).join('/')
  return withoutExtension
}

function walkMarkdown(dir: string, files: string[] = []) {
  if (!existsSync(dir)) return files

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walkMarkdown(full, files)
    } else if (entry.endsWith('.md')) {
      files.push(full)
    }
  }

  return files
}

function buildCanonicalRecords() {
  const records: WikiFileRecord[] = []

  if (existsSync(join(CANONICAL_WIKI_DIR, 'index.md'))) {
    const raw = readFileSync(join(CANONICAL_WIKI_DIR, 'index.md'), 'utf8')
    const { frontmatter, body } = parseFrontmatter(raw)
    records.push({
      source: 'canonical',
      relativePath: 'index.md',
      path: 'index',
      title: extractTitle(raw, 'ACT Wikipedia'),
      sectionId: 'overview',
      sectionTitle: 'Overview',
      frontmatter,
      content: body,
    })
  }

  for (const sectionId of CANONICAL_SECTION_ORDER) {
    const sectionDir = join(CANONICAL_WIKI_DIR, sectionId)
    for (const file of walkMarkdown(sectionDir)) {
      const relativePath = normalizeRelativePath(file.slice(CANONICAL_WIKI_DIR.length + 1))
      const raw = readFileSync(file, 'utf8')
      const { frontmatter, body } = parseFrontmatter(raw)
      records.push({
        source: 'canonical',
        relativePath,
        path: relativePathToPagePath(relativePath),
        title: extractTitle(raw, relativePath.replace(/\.md$/, '')),
        sectionId,
        sectionTitle: CANONICAL_SECTION_TITLES[sectionId] || sectionId,
        frontmatter,
        content: body,
      })
    }
  }

  return records
}

function buildStemIndex(records: WikiFileRecord[]) {
  const index = new Map<string, WikiFileRecord[]>()

  for (const record of records) {
    const parts = record.path.split('/')
    const stem = parts[parts.length - 1]
    const matches = index.get(stem) || []
    matches.push(record)
    index.set(stem, matches)
  }

  return index
}

const CANONICAL_RECORDS = buildCanonicalRecords()
const CANONICAL_BY_PATH = new Map(CANONICAL_RECORDS.map((record) => [record.path, record]))
const CANONICAL_BY_STEM = buildStemIndex(CANONICAL_RECORDS)

function resolveCanonicalPath(inputPath: string) {
  const normalized = inputPath.trim().replace(/^\/+|\/+$/g, '').replace(/\.md$/i, '')
  if (!normalized) return CANONICAL_BY_PATH.get('index') || null

  const aliased = LEGACY_ALIASES[normalized] || normalized
  if (CANONICAL_BY_PATH.has(aliased)) return CANONICAL_BY_PATH.get(aliased) || null

  const stem = aliased.split('/').pop() || aliased
  const matches = CANONICAL_BY_STEM.get(stem)
  if (matches?.length === 1) return matches[0]

  return null
}

function resolveSnapshotPath(inputPath: string) {
  const normalized = inputPath.trim().replace(/^\/+|\/+$/g, '').replace(/\.md$/i, '')
  if (!normalized || !existsSync(SNAPSHOT_WIKI_DIR)) return null

  const candidates = [
    join(SNAPSHOT_WIKI_DIR, normalized, 'index.md'),
    join(SNAPSHOT_WIKI_DIR, `${normalized}.md`),
  ]

  const parts = normalized.split('/')
  if (parts.length > 1) {
    candidates.push(join(SNAPSHOT_WIKI_DIR, parts[0], `${parts.slice(1).join('/')}.md`))
  }

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    const raw = readFileSync(candidate, 'utf8')
    const { frontmatter, body } = parseFrontmatter(raw)
    const relativePath = normalizeRelativePath(candidate.slice(SNAPSHOT_WIKI_DIR.length + 1))
    const sectionId = relativePath.split('/')[0]
    return {
      source: 'snapshot' as const,
      relativePath,
      path: normalized,
      title: extractTitle(raw, normalized),
      sectionId,
      sectionTitle: sectionId.charAt(0).toUpperCase() + sectionId.slice(1),
      frontmatter,
      content: body,
    }
  }

  return null
}

export function resolveWikiPath(inputPath: string) {
  return resolveCanonicalPath(inputPath) || resolveSnapshotPath(inputPath)
}

export function getCanonicalWikiSections() {
  const groups = new Map<string, { id: string; title: string; pages: Array<{ name: string; path: string; title: string }> }>()

  for (const record of CANONICAL_RECORDS) {
    if (record.path === 'index') continue

    if (!groups.has(record.sectionId)) {
      groups.set(record.sectionId, {
        id: record.sectionId,
        title: record.sectionTitle,
        pages: [],
      })
    }

    groups.get(record.sectionId)?.pages.push({
      name: record.title,
      path: record.path,
      title: record.title,
    })
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      pages: group.pages.sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => {
      const aIndex = CANONICAL_SECTION_ORDER.indexOf(a.id as (typeof CANONICAL_SECTION_ORDER)[number])
      const bIndex = CANONICAL_SECTION_ORDER.indexOf(b.id as (typeof CANONICAL_SECTION_ORDER)[number])
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex)
    })
}

function resolveWikilinkTarget(target: string) {
  const cleanTarget = target.split('#')[0].trim()
  const resolved = resolveCanonicalPath(cleanTarget) || resolveSnapshotPath(cleanTarget)
  return resolved?.path || null
}

export function renderWikiMarkdown(content: string) {
  return content.replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_match, target: string, label?: string) => {
    const resolvedPath = resolveWikilinkTarget(target)
    const linkText = (label || target.split('/').pop() || target).trim()
    if (!resolvedPath) return linkText
    return `[${linkText}](/wiki?page=${encodeURIComponent(resolvedPath)})`
  })
}

export function searchCanonicalWiki(query: string) {
  const queryLower = query.toLowerCase()
  const results: Array<{ path: string; title: string; snippet: string; section: string }> = []

  for (const record of CANONICAL_RECORDS) {
    const haystack = `${record.title}\n${record.content}`.toLowerCase()
    if (!haystack.includes(queryLower)) continue

    const matchIndex = haystack.indexOf(queryLower)
    const sourceText = `${record.title}\n${record.content}`
    const snippetStart = Math.max(0, matchIndex - 60)
    const snippetEnd = Math.min(sourceText.length, matchIndex + query.length + 120)
    let snippet = sourceText.slice(snippetStart, snippetEnd).replace(/\n/g, ' ').trim()
    if (snippetStart > 0) snippet = `...${snippet}`
    if (snippetEnd < sourceText.length) snippet = `${snippet}...`

    results.push({
      path: record.path,
      title: record.title,
      snippet,
      section: record.sectionTitle,
    })
  }

  return results
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 20)
}

export function getCanonicalWikiStatus(): WikiStatus | null {
  if (!existsSync(STATUS_PATH)) return null

  try {
    return JSON.parse(readFileSync(STATUS_PATH, 'utf8')) as WikiStatus
  } catch {
    return null
  }
}
