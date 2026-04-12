#!/usr/bin/env node
/**
 * Wiki Build Viewer — regenerates tools/act-wikipedia.html from the current wiki/ directory.
 *
 * The viewer is a single-file HTML app with article content embedded as a JS object.
 * This script walks the canonical Tractorpedia graph, extracts each article, and rebuilds
 * the `articles` object.
 * patches the `projectOrgMap` against current EL organizations, and broadens the
 * media_assets file_type filter so videos and non-jpeg images become visible.
 *
 * Usage:
 *   node scripts/wiki-build-viewer.mjs                # rebuild in place
 *   node scripts/wiki-build-viewer.mjs --dry-run      # show counts only
 *
 * Designed to run after every /wiki ingest and on the wiki-lint cron.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, basename, relative, dirname } from 'path'
import { execFileSync } from 'child_process'
import { logWikiEvent } from './wiki-log.mjs'
import { WALK_SKIP_DIRS, isCanonicalGraphFile } from './lib/wiki-scope.mjs'

const ROOT = process.cwd()
const WIKI = join(ROOT, 'wiki')
const VIEWER = join(ROOT, 'tools', 'act-wikipedia.html')
const dryRun = process.argv.includes('--dry-run')

// ---- Walk wiki/ ----------------------------------------------------

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

function normalizeRelativePath(relPath) {
  return relPath.replaceAll('\\', '/')
}

function relativePathToPagePath(relativePath) {
  const normalized = normalizeRelativePath(relativePath)
  if (normalized === 'index.md') return 'index'
  if (normalized.endsWith('/index.md')) return normalized.slice(0, -'/index.md'.length)
  return normalized.replace(/\.md$/, '')
}

function extractTitle(meta, body, slug) {
  if (meta.title) return meta.title
  const h1 = body.match(/^#\s+(.+?)$/m)
  if (h1) return h1[1].trim()
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function extractLinks(body) {
  // Strip code spans first (same logic as wiki-lint)
  const stripped = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
  const links = new Set()
  const regex = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g
  let m
  while ((m = regex.exec(stripped)) !== null) {
    const target = m[1].trim().replaceAll('\\', '/')
    links.add(target)
  }
  return [...links]
}

const allFiles = walkMarkdown(WIKI)
const graphFiles = allFiles.filter((file) => isCanonicalGraphFile(relative(WIKI, file)))
const MAIN_INDEX = join(WIKI, 'index.md')
const articles = {}
const stemCounts = new Map()

for (const file of graphFiles) {
  const stem = basename(file, '.md')
  if (stem === 'index' && file !== MAIN_INDEX) continue
  stemCounts.set(stem, (stemCounts.get(stem) || 0) + 1)
}

for (const file of graphFiles) {
  const stem = basename(file, '.md')
  const rel = normalizeRelativePath(relative(WIKI, file))
  const dir = dirname(rel) // 'concepts', 'projects', 'stories', or '.' for index.md
  const domain = dir === '.' ? 'index' : dir.split('/')[0]

  // Skip subdirectory index.md files in main lookup; keep main index.md as 'index'
  if (stem === 'index' && file !== MAIN_INDEX && domain !== 'stories') continue

  let key = stem
  if (domain === 'stories' && stem !== 'index') {
    key = `stories/${stem}`
  } else if ((stemCounts.get(stem) || 0) > 1) {
    key = relativePathToPagePath(rel)
  }

  const raw = readFileSync(file, 'utf8')
  const { meta, body } = parseFrontmatter(raw)
  const title = extractTitle(meta, body, stem)
  const links = extractLinks(body)

  articles[key === 'index' ? 'index' : key] = {
    slug: key,
    title,
    domain,
    content: body.trim(),
    links,
  }
}

const articleCount = Object.keys(articles).filter((k) => k !== 'index').length
console.error(`Walked canonical wiki graph: ${articleCount} articles + 1 index`)

// ---- Fetch EL organizations to rebuild projectOrgMap --------------

const DEFAULT_EL_URL = 'https://yvnuayzslukamizrlhwb.supabase.co'
const DEFAULT_EL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bnVheXpzbHVrYW1penJsaHdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNDQ4NTAsImV4cCI6MjA3MTgyMDg1MH0.UV8JOXSwANMl72lRjw-9d4CKniHSlDk9hHZpKHYN6Bs'
const EL_URL = process.env.EL_SUPABASE_URL || DEFAULT_EL_URL
const EL_KEY =
  process.env.EL_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_EL_SUPABASE_ANON_KEY ||
  DEFAULT_EL_ANON_KEY

if (EL_URL === DEFAULT_EL_URL || EL_KEY === DEFAULT_EL_ANON_KEY) {
  console.error('⚠ Using built-in Empathy Ledger public config fallback. Prefer EL_SUPABASE_URL + EL_SUPABASE_ANON_KEY.')
}

async function fetchELOrgs() {
  const r = await fetch(`${EL_URL}/rest/v1/organizations?select=id,slug,name&limit=200`, {
    headers: { apikey: EL_KEY, Authorization: `Bearer ${EL_KEY}` },
  })
  return r.ok ? r.json() : []
}

async function fetchELProjects() {
  const r = await fetch(`${EL_URL}/rest/v1/projects?select=id,name,slug&limit=200`, {
    headers: { apikey: EL_KEY, Authorization: `Bearer ${EL_KEY}` },
  })
  return r.ok ? r.json() : []
}

// Fetch public, consent-verified stories for a given EL project.
// Returns up to `limit` stories with storyteller_id, title, summary/excerpt, themes.
async function fetchProjectStories(projectId, limit = 20) {
  const url =
    `${EL_URL}/rest/v1/stories?` +
    `select=id,title,excerpt,summary,content,themes,storyteller_id,has_explicit_consent,is_public&` +
    `project_id=eq.${projectId}&is_public=eq.true&limit=${limit}`
  const r = await fetch(url, { headers: { apikey: EL_KEY, Authorization: `Bearer ${EL_KEY}` } })
  return r.ok ? r.json() : []
}

// Fetch storytellers by their IDs (for the unique storyteller_ids pulled from stories).
async function fetchStorytellers(storytellerIds) {
  if (storytellerIds.length === 0) return []
  const idsParam = storytellerIds.join(',')
  const url =
    `${EL_URL}/rest/v1/storytellers?` +
    `select=id,display_name,bio,public_avatar_url,location,cultural_background,is_elder,is_featured&` +
    `id=in.(${idsParam})`
  const r = await fetch(url, { headers: { apikey: EL_KEY, Authorization: `Bearer ${EL_KEY}` } })
  return r.ok ? r.json() : []
}

// Auto-match a wiki article slug to an EL project name using fuzzy slug comparison.
// Strategy: normalize both to lowercase alphanumeric, compare equality first, then inclusion.
// Returns the EL project object (id, name, slug) or null.
function autoMatchProject(wikiSlug, elProjects) {
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const wikiNorm = norm(wikiSlug)
  // Manual override table — for cases where fuzzy match would be wrong or miss
  const manualOverrides = {
    'goods-on-country': 'Goods',
    'redtape': 'Red Tape',
    'treacher': 'The Treacher',
    'the-caravan': 'Community Capital Retreat',
    'community-capital': 'Community Capital Retreat',
    // Oonchiumpa has its own EL org (276 photos) but no specific project — handled via org fallback
    // Don't map to "Elders Trips and Storytelling" — that's a different cross-community archive
    'picc': 'PICC Centre Precinct',
    'palm-island': 'PICC Centre Precinct',
    // picc-elders-hull-river: same — has its own org, not "Elders Trips and Storytelling"
    'nicholas-marchesi': 'Orange Sky Community Services',
    'mount-isa': 'BG Fit',
    'diagrama': 'Diagrama Youth Support',
    'goods': 'Goods',
    'quandamooka-justice-strategy': 'MMEIC Cultural Initiative',
  }
  if (manualOverrides[wikiSlug]) {
    const target = manualOverrides[wikiSlug]
    return elProjects.find((p) => p.name === target) || null
  }
  // Exact normalized match
  let match = elProjects.find((p) => norm(p.name) === wikiNorm || norm(p.slug) === wikiNorm)
  if (match) return match
  // Inclusion match (wiki slug contains or contained by EL name)
  match = elProjects.find((p) => {
    const pn = norm(p.name)
    return pn.length > 4 && (wikiNorm.includes(pn) || pn.includes(wikiNorm))
  })
  return match || null
}

// Use exact-count headers to get the true media count per project
async function fetchProjectMediaCount(projectId) {
  const r = await fetch(
    `${EL_URL}/rest/v1/media_assets?select=id&project_id=eq.${projectId}`,
    {
      headers: {
        apikey: EL_KEY,
        Authorization: `Bearer ${EL_KEY}`,
        Prefer: 'count=exact',
        Range: '0-0',
      },
    },
  )
  if (!r.ok) return 0
  const cr = r.headers.get('content-range') || ''
  const total = parseInt(cr.split('/').pop(), 10)
  return Number.isNaN(total) ? 0 : total
}

async function fetchELMediaCounts() {
  const r = await fetch(`${EL_URL}/rest/v1/media_assets?select=organization_id&limit=10000`, {
    headers: { apikey: EL_KEY, Authorization: `Bearer ${EL_KEY}` },
  })
  if (!r.ok) return {}
  const data = await r.json()
  const counts = {}
  for (const m of data) {
    if (!m.organization_id) continue
    counts[m.organization_id] = (counts[m.organization_id] || 0) + 1
  }
  return counts
}

// Filename patterns for orphaned media — when project_id query returns nothing,
// fall back to original_filename ILIKE '%pattern%'. Used for projects whose
// uploads exist in EL but were never tagged with project_id.
const FILENAME_PATTERNS = {
  'contained': 'Contained',
  'gold-phone': 'GoldPhone',
  'the-confessional': 'Confessional',
  'redtape': 'Redtape',
  'treacher': 'Treacher',
  'uncle-allan-palm-island-art': 'UncleAllan',
  'regional-arts-fellowship': 'Fellowship',
}

// Organization-id fallbacks — for wiki slugs whose entire EL org IS the project archive
// (no specific project_id needed). Used when project_id and filename patterns both miss.
// Maps wiki slug → EL organization slug.
const ORG_FALLBACKS = {
  'oonchiumpa': 'oonchiumpa',
  'picc-elders-hull-river': 'palm-island-community-company',
  'bg-fit': 'bg-fit',
  'mounty-yarns': 'mounty-yarns',
  'tomnet': 'tomnet',
  'mount-isa': 'bg-fit',
  'fishers-oysters': 'fishers-oysters',
}

// Manual mapping: wiki slug → EL project NAME (the canonical mapping that drives photo scoping).
// EL has 46 distinct projects, each with its own media tagged via media_assets.project_id.
// This is the right scope (not organization_id, which gave us random photos from a 521-photo pool).
const WIKI_TO_EL_PROJECT_NAME = {
  // Art cluster
  'uncle-allan-palm-island-art': 'Uncle Allan Palm Island Art',
  'contained': 'CONTAINED',
  'the-confessional': 'The Confessional',
  'gold-phone': 'Gold.Phone',
  'treacher': 'The Treacher',
  'redtape': 'Red Tape',
  'regional-arts-fellowship': 'Regional Arts Fellowship',
  'the-caravan': 'Community Capital Retreat', // Born at Community Capital — best photo source
  // 'the-vagina' has no EL project yet (coming soon piece)
  // 'art-projects' is the index, no photos

  // Ecosystem projects
  'empathy-ledger': 'Empathy Ledger',
  'justicehub': 'JusticeHub',
  'civicgraph': 'CivicGraph',
  'goods-on-country': 'Goods',
  'the-harvest': 'The Harvest',
  'act-farm': 'ACT Farm',
  'black-cockatoo-valley': 'Black Cockatoo Valley',
  'designing-for-obsolescence': 'Designing for Obsolescence',

  // PICC sub-articles → each has its own EL project
  'picc-annual-report': 'PICC Annual Report',
  'picc-centre-precinct': 'PICC Centre Precinct',
  'picc-photo-kiosk': 'PICC Photo Kiosk',
  // picc (parent) and picc-elders-hull-river don't have direct EL projects — fall back to PICC Centre Precinct
  'picc': 'PICC Centre Precinct',
  'picc-elders-hull-river': 'Elders Trips and Storytelling',
  'palm-island': 'PICC Centre Precinct',

  // Satellite projects (each with own EL project)
  'oonchiumpa': 'Elders Trips and Storytelling',
  'bg-fit': 'BG Fit',
  'diagrama': 'Diagrama Youth Support',
  'mounty-yarns': 'Mounty Yarns',
  'dad-lab-25': 'Dad.Lab.25',
  'junes-patch': 'Junes Patch',
  'fishers-oysters': 'Fishers Oysters',
  'tomnet': 'TOMNET',
  'smart-connect': 'SMART Connect',
  'smart-recovery-gp-kits': 'SMART Recovery GP Kits',
  'global-laundry-alliance': 'Global Laundry Alliance',
  'mounty-yarns': 'Mounty Yarns',
  'caring-for-those-who-care': 'Caring for Those Who Care',
  'community-capital': 'Community Capital Retreat',
  'quandamooka-justice-strategy': 'MMEIC Cultural Initiative',

  // People (link to most relevant project)
  'nicholas-marchesi': 'Orange Sky Community Services',
  // benjamin-knight, vic, brodie-germaine, richard-cassidy: no direct EL project — leave unmapped

  // Communities
  'mount-isa': 'BG Fit',
}

async function buildProjectOrgMap() {
  const projects = await fetchELProjects()
  console.error(`  Auto-matching ${projects.length} EL projects to wiki articles…`)

  // Build org slug → org id lookup for the third-tier fallback
  const orgsList = await fetchELOrgs()
  const orgBySlug = {}
  for (const o of orgsList) orgBySlug[o.slug] = o

  const map = {}
  const articleSlugs = Object.keys(articles).filter((k) => k !== 'index')

  // First pass: auto-match every wiki article to an EL project (or skip if no match)
  for (const articleSlug of articleSlugs) {
    const project = autoMatchProject(articleSlug, projects)
    const filenamePattern = FILENAME_PATTERNS[articleSlug] || null
    const orgFallbackSlug = ORG_FALLBACKS[articleSlug] || null
    const orgFallback = orgFallbackSlug ? orgBySlug[orgFallbackSlug] : null
    if (!project && !filenamePattern && !orgFallback) continue
    map[articleSlug] = {
      projectId: project ? project.id : null,
      projectName: project ? project.name : (filenamePattern || (orgFallback ? orgFallback.name : '')),
      count: 0, // filled in next pass
      filenamePattern,
      orgFallbackId: orgFallback ? orgFallback.id : null,
      orgFallbackName: orgFallback ? orgFallback.name : null,
      storytellers: [],
      stories: [],
    }
  }

  // Second pass: for each mapped project, fetch media count + stories + storytellers
  console.error(`  Enriching ${Object.keys(map).length} entries with media + storytellers…`)
  const storytellerCache = {}
  for (const slug of Object.keys(map)) {
    const entry = map[slug]
    if (!entry.projectId) continue
    entry.count = await fetchProjectMediaCount(entry.projectId)
    const stories = await fetchProjectStories(entry.projectId, 10)
    // Pull only consent-verified stories
    const consented = stories.filter((s) => s.has_explicit_consent)
    // Capture lightweight story info (title, summary/excerpt, themes, storyteller_id)
    entry.stories = consented.map((s) => ({
      id: s.id,
      title: s.title || '',
      excerpt: (s.excerpt || s.summary || '').slice(0, 200),
      themes: s.themes || [],
      storyteller_id: s.storyteller_id,
    }))
    // Collect unique storyteller IDs
    const uniqIds = [...new Set(consented.map((s) => s.storyteller_id).filter(Boolean))]
    // Fetch storyteller profiles (use cache to avoid duplicate requests)
    const freshIds = uniqIds.filter((id) => !storytellerCache[id])
    if (freshIds.length > 0) {
      const fetched = await fetchStorytellers(freshIds)
      for (const s of fetched) storytellerCache[s.id] = s
    }
    entry.storytellers = uniqIds
      .map((id) => storytellerCache[id])
      .filter(Boolean)
      .map((s) => ({
        id: s.id,
        name: s.display_name || '',
        avatar: s.public_avatar_url || '',
        location: s.location || '',
        isElder: !!s.is_elder,
      }))
  }

  // Backward compat: keep orgs/counts return for the rest of the script
  const orgs = await fetchELOrgs()
  const counts = await fetchELMediaCounts()
  return { map, orgs, counts, projects }
}

// ---- Format helpers ------------------------------------------------

function formatArticles(articles) {
  const lines = ['const articles = {']
  const keys = Object.keys(articles).sort()
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    const a = articles[k]
    lines.push(`  ${JSON.stringify(k)}: {`)
    lines.push(`    slug: ${JSON.stringify(a.slug)},`)
    lines.push(`    title: ${JSON.stringify(a.title)},`)
    lines.push(`    domain: ${JSON.stringify(a.domain)},`)
    lines.push(`    links: ${JSON.stringify(a.links)},`)
    // Use template literal for content (handles multiline cleanly)
    // Escape backticks and ${ inside the content
    const safeContent = a.content
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$\{/g, '\\${')
    lines.push(`    content: \`${safeContent}\``)
    lines.push(`  }${i < keys.length - 1 ? ',' : ''}`)
  }
  lines.push('};')
  return lines.join('\n')
}

function loadUrlAudit() {
  const auditPath = join(WIKI, 'decisions', 'url-audit-latest.json')
  if (!existsSync(auditPath)) {
    console.error('  ⚠ url-audit-latest.json not found — run scripts/wiki-verify-urls.mjs first')
    return null
  }
  try {
    const json = JSON.parse(readFileSync(auditPath, 'utf8'))
    return json
  } catch (e) {
    console.error(`  ⚠ Could not parse url-audit-latest.json: ${e.message}`)
    return null
  }
}

function formatUrlAudit(audit) {
  if (!audit || !audit.results) return null
  const lines = ['  urlAudit: {']
  const sorted = [...audit.results].sort((a, b) => a.slug.localeCompare(b.slug))
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i]
    const entry = {
      url: r.canonicalUrl || null,
      repo: r.repo ? r.repo.url : null,
      repoName: r.repo ? r.repo.name : null,
      archived: r.repo ? r.repo.archived : false,
      vercelProject: r.vercelProject ? r.vercelProject.name : null,
      live: r.live?.ok === true ? 'up' : (r.live?.ok === false ? 'down' : 'unknown'),
      status: r.live?.status || null,
      knownIssue: r.knownIssue || null,
    }
    lines.push(`    ${JSON.stringify(r.slug)}: ${JSON.stringify(entry)}` + (i < sorted.length - 1 ? ',' : ''))
  }
  lines.push('  }')
  return lines.join('\n')
}

function formatProjectOrgMap(map) {
  const lines = ['  projectOrgMap: {']
  const keys = Object.keys(map).sort()
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    const v = map[k]
    const entry = {
      projectId: v.projectId,
      orgId: v.projectId,
      projectName: v.projectName,
      name: v.projectName,
      count: v.count,
      filenamePattern: v.filenamePattern || null,
      orgFallbackId: v.orgFallbackId || null,
      orgFallbackName: v.orgFallbackName || null,
      storytellers: v.storytellers || [],
      stories: v.stories || [],
    }
    const line = `    ${JSON.stringify(k)}: ${JSON.stringify(entry)}`
    lines.push(line + (i < keys.length - 1 ? ',' : ''))
  }
  lines.push('  }')
  return lines.join('\n')
}

// ---- Main ----------------------------------------------------------

async function main() {
  console.error('Fetching EL organizations and media counts…')
  const { map, orgs, counts } = await buildProjectOrgMap()
  console.error(`  EL orgs: ${orgs.length}`)
  console.error(`  Media records sampled: ${Object.values(counts).reduce((a, b) => a + b, 0)}`)
  console.error(`  projectOrgMap entries: ${Object.keys(map).length} (was 27 before regen)`)

  // Show coverage
  let mappedCount = 0
  let unmappedSlugs = []
  for (const slug of Object.keys(articles)) {
    if (slug === 'index') continue
    if (map[slug]) mappedCount++
    else unmappedSlugs.push(slug)
  }
  console.error(`  Articles with photo map: ${mappedCount}/${articleCount}`)
  if (unmappedSlugs.length > 0 && unmappedSlugs.length <= 30) {
    console.error(`  Unmapped (no EL org match):`)
    for (const s of unmappedSlugs) console.error(`    - ${s}`)
  } else if (unmappedSlugs.length > 30) {
    console.error(`  Unmapped: ${unmappedSlugs.length} articles (mostly stories, concepts, decisions, research)`)
  }

  if (dryRun) {
    console.error('\n[dry-run] would write tools/act-wikipedia.html')
    return
  }

  // Read existing viewer
  let html = readFileSync(VIEWER, 'utf8')
  const before = html.length

  // 1. Replace projectOrgMap
  const newOrgMap = formatProjectOrgMap(map)
  const orgMapRegex = /  projectOrgMap: \{[\s\S]*?\n  \}/
  if (!orgMapRegex.test(html)) throw new Error('Could not find projectOrgMap in viewer')
  html = html.replace(orgMapRegex, newOrgMap)

  // 1b. Inject EL_CONFIG.urlAudit from wiki/decisions/url-audit-latest.json
  //     This is the canonical source-of-truth for project URLs, GitHub repos, and live status.
  //     Generated by scripts/wiki-verify-urls.mjs (Acurioustractor org + Vercel team).
  const audit = loadUrlAudit()
  if (audit) {
    const newUrlAudit = formatUrlAudit(audit)
    // Try to replace existing urlAudit block first (idempotent re-runs)
    const existingUrlAuditRegex = /,\s*\n  urlAudit: \{[\s\S]*?\n  \}/
    if (existingUrlAuditRegex.test(html)) {
      html = html.replace(existingUrlAuditRegex, ',\n' + newUrlAudit)
      console.error(`  ✓ urlAudit updated (${audit.results.length} entries from ${audit.generated})`)
    } else {
      // First-time insertion: append urlAudit after projectOrgMap closing brace
      const orgMapClose = /(  projectOrgMap: \{[\s\S]*?\n  \})/
      html = html.replace(orgMapClose, '$1,\n' + newUrlAudit)
      console.error(`  ✓ urlAudit injected (${audit.results.length} entries from ${audit.generated})`)
    }
  }

  // 2. Replace the entire fetchELMedia function with a 3-tier lookup:
  //    (a) project_id  — the cleanest scope when the EL project is set up
  //    (b) filename pattern — orphaned uploads with consistent naming (e.g. CONTAINED)
  //    (c) organization_id — the wiki article maps to a whole EL org (e.g. Oonchiumpa)
  const newFetchFn = `async function fetchELMedia(slugOrOrgId, limit) {
  limit = limit || 6;
  let mapping = (typeof EL_CONFIG.projectOrgMap[slugOrOrgId] === 'object')
    ? EL_CONFIG.projectOrgMap[slugOrOrgId]
    : null;
  let projectId = mapping ? mapping.projectId : slugOrOrgId;
  let pattern = mapping ? mapping.filenamePattern : null;
  let orgFallback = mapping ? mapping.orgFallbackId : null;
  let mediaTypes = '&or=(file_type.eq.image,file_type.eq.image/jpeg,file_type.eq.image/png,file_type.eq.jpg,file_type.eq.jpeg,file_type.eq.png,file_type.eq.photo,file_type.eq.heic,file_type.eq.mpeg,file_type.eq.video,file_type.eq.mp4)';
  let headers = {
    'apikey': EL_CONFIG.supabaseAnonKey,
    'Authorization': 'Bearer ' + EL_CONFIG.supabaseAnonKey
  };
  function normalize(data) {
    return data.map(function(m) { return { id: m.id, title: m.title || m.original_filename || '', url: m.cdn_url || m.thumbnail_url || '', type: m.file_type }; }).filter(function(m) { return m.url; });
  }
  try {
    // Tier 1: project_id (cleanest scope)
    if (projectId) {
      let url = EL_CONFIG.supabaseUrl + '/rest/v1/media_assets?select=id,title,original_filename,cdn_url,thumbnail_url,file_type&project_id=eq.' + projectId + mediaTypes + '&limit=' + limit + '&order=created_at.desc';
      let resp = await fetch(url, { headers: headers });
      if (resp.ok) {
        let mapped = normalize(await resp.json());
        if (mapped.length > 0) return mapped;
      }
    }
    // Tier 2: filename pattern (orphaned media)
    if (pattern) {
      let url2 = EL_CONFIG.supabaseUrl + '/rest/v1/media_assets?select=id,title,original_filename,cdn_url,thumbnail_url,file_type&original_filename=ilike.' + encodeURIComponent('%' + pattern + '%') + mediaTypes + '&limit=' + limit + '&order=created_at.desc';
      let resp2 = await fetch(url2, { headers: headers });
      if (resp2.ok) {
        let mapped2 = normalize(await resp2.json());
        if (mapped2.length > 0) return mapped2;
      }
    }
    // Tier 3: organization_id (wiki article maps to a whole EL org, no specific project)
    if (orgFallback) {
      let url3 = EL_CONFIG.supabaseUrl + '/rest/v1/media_assets?select=id,title,original_filename,cdn_url,thumbnail_url,file_type&organization_id=eq.' + orgFallback + mediaTypes + '&limit=' + limit + '&order=created_at.desc';
      let resp3 = await fetch(url3, { headers: headers });
      if (resp3.ok) return normalize(await resp3.json());
    }
    return [];
  } catch(e) {
    console.error('EL API error:', e);
    return [];
  }
}`
  const fetchFnRegex = /async function fetchELMedia\([^)]*\) \{[\s\S]*?\n\}/
  if (!fetchFnRegex.test(html)) {
    console.error('  ⚠ fetchELMedia function not found — cannot rewrite')
  } else {
    html = html.replace(fetchFnRegex, newFetchFn)
    console.error('  ✓ fetchELMedia rewritten with project_id + filename-pattern fallback')
  }

  // 3. Replace the articles object
  const newArticles = formatArticles(articles)
  const articlesRegex = /const articles = \{[\s\S]*?\n\};/
  if (!articlesRegex.test(html)) throw new Error('Could not find articles object in viewer')
  html = html.replace(articlesRegex, newArticles)

  // 4. Update index metadata in the embedded homepage article
  const today = new Date().toISOString().split('T')[0]
  html = html.replace(
    /\*\*Article count:\*\*[^\n]*/g,
    `**Article count:** ${articleCount} canonical articles`,
  )
  html = html.replace(/\*\*Articles:\*\*\s*\d+/g, `**Articles:** ${articleCount}`)
  html = html.replace(/\*\*Last compiled:\*\*[^\n]*/g, `**Last compiled:** ${today}`)

  // 5. Update hardcoded "Last compiled: YYYY-MM-DD" in the homepage render function AND in <li> footer
  html = html.replace(/Last compiled: [0-9]{4}-[0-9]{2}-[0-9]{2}/g, `Last compiled: ${today}`)

  // 6. Update the homepage "129 articles across the ACT ecosystem" line
  html = html.replace(/[0-9]+ articles across the ACT ecosystem/g, `${articleCount} articles across the ACT ecosystem`)

  // 7. Update the hardcoded sidebar Art Portfolio portal (lines 894-904 area)
  // Replace the 4-entry list with the canonical 9 art projects
  const ART_PROJECTS = [
    { slug: 'art-projects', name: 'Art Index — all 9' },
    { slug: 'uncle-allan-palm-island-art', name: 'Uncle Allan Art' },
    { slug: 'contained', name: 'CONTAINED' },
    { slug: 'the-confessional', name: 'The Confessional' },
    { slug: 'gold-phone', name: 'Gold.Phone' },
    { slug: 'treacher', name: 'Treacher' },
    { slug: 'redtape', name: 'Redtape' },
    { slug: 'regional-arts-fellowship', name: 'Regional Arts Fellowship' },
    { slug: 'the-vagina', name: 'The Vagina (coming soon)' },
    { slug: 'the-caravan', name: 'The Caravan' },
  ]
  const artPortalLines = ART_PROJECTS.map(
    (p) => `        <li><a href="#" onclick="navigateTo('${p.slug}'); return false;">${p.name}</a></li>`,
  ).join('\n')
  const newArtPortal = `  <div class="portal" id="p-art">
    <h3>Art Portfolio</h3>
    <div class="body">
      <ul>
${artPortalLines}
      </ul>
    </div>
  </div>`
  const artPortalRegex = /  <div class="portal" id="p-art">[\s\S]*?<\/div>\n  <\/div>/
  if (!artPortalRegex.test(html)) {
    console.error('  ⚠ Sidebar art portal not found — skipping')
  } else {
    html = html.replace(artPortalRegex, newArtPortal)
    console.error(`  ✓ Sidebar Art Portfolio portal updated → ${ART_PROJECTS.length} entries`)
  }

  // 8. Update the showArtPortfolio() function's artProjects array
  // Build a fresh array with all 9 art projects + descriptions
  const SHOW_ART = [
    { slug: 'uncle-allan-palm-island-art', name: 'Uncle Allan Palm Island Art', desc: "The elder of the studio line — Manbarra culture painted by Uncle Allan, shared on community terms. Cultural sovereignty in practice.", color: '#8e44ad', emoji: '🎨' },
    { slug: 'contained', name: 'CONTAINED', desc: 'Youth detention as a room you walk into. Built by hand by Nicholas Marchesi. Touring nationally 2026.', color: '#c0392b', emoji: '📦' },
    { slug: 'the-confessional', name: 'The Confessional', desc: 'A horse trailer converted into a sacred healing space. Mobile art therapy for remote communities.', color: '#2c3e50', emoji: '🚐' },
    { slug: 'gold-phone', name: 'Gold.Phone', desc: 'Random voice connection platform and community installation. Authentic conversation as anti-isolation infrastructure.', color: '#d4a017', emoji: '📞' },
    { slug: 'treacher', name: 'Treacher', desc: 'A tree pulled from Witta plays the sounds of where it came from. Sound installation about displacement and Country.', color: '#16a085', emoji: '🌳' },
    { slug: 'redtape', name: 'Redtape', desc: "Bureaucratic friction made physical — what an ACCO carries to receive funding. The grant process you can walk through.", color: '#e74c3c', emoji: '📜' },
    { slug: 'regional-arts-fellowship', name: 'Regional Arts Fellowship', desc: 'Art × technology × agriculture. Supporting underserved regional practitioners working at the intersection.', color: '#27ae60', emoji: '🌾' },
    { slug: 'the-vagina', name: 'The Vagina', desc: '(Coming soon) An ACT studio piece in development. Placeholder for the next work in the line.', color: '#9b59b6', emoji: '✨' },
    { slug: 'the-caravan', name: 'The Caravan', desc: 'Mobile leadership infrastructure born at the Community Capital Leadership Retreat. Lineage from Orange Sky.', color: '#3498db', emoji: '🚐' },
  ]
  const showArtArrayLines = SHOW_ART.map(
    (p) => `    { slug: '${p.slug}', name: ${JSON.stringify(p.name)}, desc: ${JSON.stringify(p.desc)}, color: '${p.color}', emoji: '${p.emoji}' }`,
  ).join(',\n')
  const newShowArtArray = `let artProjects = [
${showArtArrayLines}
  ];`
  const showArtRegex = /let artProjects = \[[\s\S]*?\];/
  if (!showArtRegex.test(html)) {
    console.error('  ⚠ showArtPortfolio array not found — skipping')
  } else {
    html = html.replace(showArtRegex, newShowArtArray)
    console.error(`  ✓ showArtPortfolio() artProjects array updated → ${SHOW_ART.length} entries`)
  }

  // 9. Widen the sidebar from 11em to 15em (text was wrapping awkwardly)
  // 4 occurrences in CSS — they're all paired (sidebar width + content margin-left)
  const sidebarBefore = (html.match(/11(?:\.5)?em/g) || []).length
  html = html.replace(/width: 11em;/g, 'width: 15em;')
  html = html.replace(/left: 11\.5em;/g, 'left: 15.5em;')
  html = html.replace(/margin-left: 11\.5em;/g, 'margin-left: 15.5em;')
  const sidebarAfter = (html.match(/15(?:\.5)?em/g) || []).length
  console.error(`  ✓ Sidebar widened 11em → 15em (${sidebarAfter} CSS rules updated)`)

  // 10. Fix art-portfolio hash routing — handleHash() looks up the hash in `articles`
  //     but 'art-portfolio' is a virtual route handled by showArtPortfolio(). Add a special-case.
  const handleHashOld = /function handleHash\(\) \{\s*let hash = window\.location\.hash\.substring\(1\);\s*if \(!hash\) \{\s*showMainPage\(\);\s*return;\s*\}/
  const handleHashNew = `function handleHash() {
  let hash = window.location.hash.substring(1);
  if (!hash) {
    showMainPage();
    return;
  }
  if (hash === 'art-portfolio') {
    showArtPortfolio();
    return;
  }`
  if (!handleHashOld.test(html)) {
    console.error('  ⚠ handleHash function not found — art-portfolio hash routing not patched')
  } else {
    html = html.replace(handleHashOld, handleHashNew)
    console.error('  ✓ handleHash now routes #art-portfolio to showArtPortfolio()')
  }

  // 11. Rewrite the showArtPortfolio render loop to use real photos as the FIRST render —
  //     not emoji placeholders that get upgraded later. The old version showed emoji even
  //     when fetchELMedia would have succeeded.
  const oldRenderRegex = /let html = '<div style="font-size:15px;line-height:1\.6;[\s\S]*?document\.getElementById\('mw-content-text'\)\.innerHTML = html;/
  const newRender = `let html = '<div style="font-size:15px;line-height:1.6;max-width:800px;margin-bottom:1.5em;">';
  html += 'A Curious Tractor\\'s art practice spans immersive experiences, community storytelling, digital platforms, and mobile installations. ';
  html += 'Art is the final phase of the <a href="#" onclick="navigateTo(\\'lcaa-method\\');return false;">LCAA Method</a> — where action becomes something beautiful, meaningful, and lasting.';
  html += '</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-bottom:2em;">';
  for (let p of artProjects) {
    html += '<div style="border:1px solid #ddd;border-radius:6px;overflow:hidden;background:#fff;cursor:pointer;" onclick="navigateTo(\\'' + p.slug + '\\')">';
    html += '<div id="art-thumb-' + p.slug + '" style="height:200px;background:linear-gradient(135deg, #f8f8f8 0%, #e8e8e8 100%);display:flex;align-items:center;justify-content:center;color:#888;font-size:13px;font-style:italic;overflow:hidden;">loading…</div>';
    html += '<div style="padding:14px 16px;">';
    html += '<div style="font-size:15px;font-weight:700;margin-bottom:4px;">' + p.name + '</div>';
    html += '<div style="font-size:12.5px;color:#666;line-height:1.45;">' + p.desc + '</div>';
    html += '</div></div>';
  }
  html += '</div>';
  html += '<div style="font-size:13px;color:#888;border-top:1px solid #eee;padding-top:12px;">';
  html += 'Photos loaded live from <a href="https://www.empathyledger.com" target="_blank">Empathy Ledger</a>, scoped to each project via project_id (or filename pattern as fallback).';
  html += '</div>';
  document.getElementById('mw-content-text').innerHTML = html;
  // Now async-load real photos for each card. fetchELMedia(slug) handles project_id + filename fallback.
  artProjects.forEach(function(p) {
    fetchELMedia(p.slug, 1).then(function(media) {
      let el = document.getElementById('art-thumb-' + p.slug);
      if (!el) return;
      if (media && media.length > 0) {
        el.innerHTML = '<img src="' + media[0].url + '" style="width:100%;height:100%;object-fit:cover;" alt="' + (media[0].title || p.name) + '">';
      } else {
        el.innerHTML = '<div style="text-align:center;padding:20px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#aaa;">photos coming soon</div><div style="font-size:11px;color:#bbb;margin-top:4px;">tag in Empathy Ledger</div></div>';
      }
    });
  });`
  if (!oldRenderRegex.test(html)) {
    console.error('  ⚠ showArtPortfolio render block not found — art portfolio still shows emoji')
  } else {
    html = html.replace(oldRenderRegex, newRender)
    console.error('  ✓ showArtPortfolio() render rewritten — real photos, no emoji placeholders')
  }

  // 12. Inject a "Voices & Stories" block into showArticle() — surfaces storytellers
  //     and story excerpts from the projectOrgMap for any article with mapped data.
  //     This is what makes wiki project pages actually carry the voices attached to them.
  const voicesOld = `document.getElementById('mw-content-text').innerHTML = infoboxHtml + html + categories;
}`
  const voicesNew = `let voicesHtml = '';
  let voicesMapping = EL_CONFIG.projectOrgMap[article.slug];
  if (voicesMapping && ((voicesMapping.storytellers && voicesMapping.storytellers.length > 0) || (voicesMapping.stories && voicesMapping.stories.length > 0))) {
    voicesHtml += '<div style="margin: 2em 0 1em 0; padding: 1.5em; background: #f8f9fa; border-left: 4px solid #0645ad; border-radius: 2px;">';
    voicesHtml += '<h2 style="font-family: \\'Linux Libertine\\', Georgia, Times, serif; font-size: 1.3em; font-weight: normal; border-bottom: 1px solid #a2a9b1; padding-bottom: 0.3em; margin: 0 0 1em 0;">Voices & Stories <span style="font-size:0.75em;color:#666;font-weight:normal;">from ' + (voicesMapping.projectName || 'Empathy Ledger') + '</span></h2>';
    if (voicesMapping.storytellers && voicesMapping.storytellers.length > 0) {
      voicesHtml += '<div style="margin-bottom:1.5em;"><div style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#555;margin-bottom:0.6em;">Storytellers (' + voicesMapping.storytellers.length + ')</div>';
      voicesHtml += '<div style="display:flex;flex-wrap:wrap;gap:12px;">';
      voicesMapping.storytellers.forEach(function(s) {
        let elderBadge = s.isElder ? ' <span style="display:inline-block;background:#d4a017;color:#fff;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;padding:1px 5px;border-radius:2px;vertical-align:middle;">Elder</span>' : '';
        let avatarImg = s.avatar ? '<img src="' + s.avatar + '" style="width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0;">' : '<div style="width:42px;height:42px;border-radius:50%;background:#e0e0e0;display:flex;align-items:center;justify-content:center;font-size:14px;color:#888;flex-shrink:0;">' + (s.name || '?').charAt(0) + '</div>';
        voicesHtml += '<div style="display:flex;align-items:center;gap:8px;background:#fff;padding:6px 10px;border-radius:22px;border:1px solid #e5e5e5;">' + avatarImg + '<div><div style="font-size:12.5px;font-weight:600;line-height:1.2;">' + (s.name || 'Unknown') + elderBadge + '</div>' + (s.location ? '<div style="font-size:10.5px;color:#888;">' + s.location + '</div>' : '') + '</div></div>';
      });
      voicesHtml += '</div></div>';
    }
    if (voicesMapping.stories && voicesMapping.stories.length > 0) {
      voicesHtml += '<div><div style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#555;margin-bottom:0.6em;">Stories (' + voicesMapping.stories.length + ')</div>';
      voicesHtml += '<ul style="list-style:none;margin:0;padding:0;">';
      voicesMapping.stories.slice(0, 6).forEach(function(st) {
        let themesHtml = '';
        if (st.themes && st.themes.length > 0) {
          themesHtml = ' <span style="font-size:10px;color:#888;">· ' + st.themes.slice(0,3).join(' · ') + '</span>';
        }
        let excerptHtml = st.excerpt ? '<div style="font-size:12px;color:#555;margin-top:2px;font-style:italic;">\\u201C' + st.excerpt.slice(0,180) + (st.excerpt.length > 180 ? '…' : '') + '\\u201D</div>' : '';
        voicesHtml += '<li style="padding:8px 0;border-bottom:1px solid #eee;"><div style="font-size:13px;font-weight:600;">' + (st.title || 'Untitled') + themesHtml + '</div>' + excerptHtml + '</li>';
      });
      voicesHtml += '</ul>';
      if (voicesMapping.stories.length > 6) voicesHtml += '<div style="font-size:11px;color:#888;margin-top:6px;">… and ' + (voicesMapping.stories.length - 6) + ' more in Empathy Ledger</div>';
      voicesHtml += '</div>';
    }
    voicesHtml += '<div style="font-size:11px;color:#888;margin-top:1em;border-top:1px solid #e5e5e5;padding-top:0.6em;">All storytellers and stories shown here have <strong>explicit consent</strong>. Data live from <a href="https://www.empathyledger.com" target="_blank">Empathy Ledger</a>.</div>';
    voicesHtml += '</div>';
  }
  document.getElementById('mw-content-text').innerHTML = infoboxHtml + html + voicesHtml + categories;
}`
  if (html.includes('voicesMapping = EL_CONFIG.projectOrgMap')) {
    console.error('  ✓ showArticle Voices & Stories block already present (idempotent)')
  } else if (!html.includes(voicesOld)) {
    console.error('  ⚠ showArticle render tail not found — voices block not injected')
  } else {
    html = html.replace(voicesOld, voicesNew)
    console.error('  ✓ showArticle() now renders Voices & Stories block from mapped storytellers')
  }

  // 13. Fix the infobox image + gallery to try fetchELMedia whenever a mapping exists
  //     (even when count=0, because filenamePattern fallback may still return photos).
  //     Also pass the SLUG to fetchELMedia, not orgId, so the fallback can kick in.
  const oldInfoboxImg = `if (elMapping && elMapping.count > 0) {
      infoboxHtml += '<div class="infobox-image" id="infobox-img-' + article.slug + '"><div class="placeholder" style="font-size:11px;">Loading from Empathy Ledger...</div></div>';
      // Async load the thumbnail
      setTimeout(function() {
        fetchELMedia(elMapping.orgId, 1).then(function(media) {
          let imgEl = document.getElementById('infobox-img-' + article.slug);
          if (imgEl && media.length > 0) {
            imgEl.innerHTML = '<img src="' + media[0].url + '" alt="' + article.title + '" style="max-width:100%;height:auto;display:block;">';
          } else if (imgEl) {
            imgEl.innerHTML = '<div class="placeholder">No photos yet</div>';
          }
        });
      }, 100);
    } else {
      infoboxHtml += '<div class="infobox-image"><div class="placeholder">No photos yet</div></div>';
    }`
  const newInfoboxImg = `if (elMapping && (elMapping.count > 0 || elMapping.filenamePattern || elMapping.orgFallbackId)) {
      infoboxHtml += '<div class="infobox-image" id="infobox-img-' + article.slug + '"><div class="placeholder" style="font-size:11px;">Loading from Empathy Ledger…</div></div>';
      setTimeout(function() {
        fetchELMedia(article.slug, 1).then(function(media) {
          let imgEl = document.getElementById('infobox-img-' + article.slug);
          if (imgEl && media.length > 0) {
            imgEl.innerHTML = '<img src="' + media[0].url + '" alt="' + article.title + '" style="max-width:100%;height:auto;display:block;">';
          } else if (imgEl) {
            imgEl.innerHTML = '<div class="placeholder">No photos yet</div>';
          }
        });
      }, 100);
    } else {
      infoboxHtml += '<div class="infobox-image"><div class="placeholder">No photos yet</div></div>';
    }`
  if (html.includes("fetchELMedia(article.slug, 1)")) {
    console.error('  ✓ Infobox image already uses filename-pattern fallback (idempotent)')
  } else if (!html.includes(oldInfoboxImg)) {
    console.error('  ⚠ infobox image block not found — not patched')
  } else {
    html = html.replace(oldInfoboxImg, newInfoboxImg)
    console.error('  ✓ Infobox image now uses filename-pattern fallback (CONTAINED, etc.)')
  }

  // 13b. Make the infobox render even when the article has NO "**Status:**" line.
  //      Currently the entire infobox is wrapped in `if (statusMatch && ...)` which means
  //      articles like The Confessional (no Status line) show zero infobox even when they
  //      have photos mapped. Loosen the condition to also trigger when there's an EL mapping.
  const oldInfoboxGate = `let statusMatch = article.content.match(/^\\*\\*Status:\\*\\*\\s*(.+)$/m);
  if (statusMatch && article.domain !== 'index') {
    let statusLine = statusMatch[1];
    // Remove the status line from content so it's not shown twice
    contentForRender = contentForRender.replace(/^\\*\\*Status:\\*\\*\\s*.+$/m, '');

    // Parse fields from the status line (e.g. "Active | **Code:** ACT-JH | **Tier:** Ecosystem")
    let status = statusLine.split('|')[0].trim();
    let codeMatch = statusLine.match(/\\*\\*Code:\\*\\*\\s*([^|]+)/);
    let tierMatch = statusLine.match(/\\*\\*Tier:\\*\\*\\s*([^|]+)/);
    let code = codeMatch ? codeMatch[1].trim() : '';
    let tier = tierMatch ? tierMatch[1].trim() : '';
    let domain = domainLabels[article.domain] || article.domain;`
  const newInfoboxGate = `let statusMatch = article.content.match(/^\\*\\*Status:\\*\\*\\s*(.+)$/m);
  let earlyMapping = EL_CONFIG.projectOrgMap[article.slug];
  // Render infobox if EITHER: (a) article has a Status line, OR (b) it has an EL photo mapping.
  // This ensures articles without a Status line (The Confessional, Gold.Phone, etc.) still
  // get the infobox with photo + gallery.
  if ((statusMatch || earlyMapping) && article.domain !== 'index') {
    let statusLine = statusMatch ? statusMatch[1] : '';
    if (statusMatch) {
      contentForRender = contentForRender.replace(/^\\*\\*Status:\\*\\*\\s*.+$/m, '');
    }
    let status = statusLine ? statusLine.split('|')[0].trim() : 'Active';
    let codeMatch = statusLine.match(/\\*\\*Code:\\*\\*\\s*([^|]+)/);
    let tierMatch = statusLine.match(/\\*\\*Tier:\\*\\*\\s*([^|]+)/);
    let code = codeMatch ? codeMatch[1].trim() : '';
    let tier = tierMatch ? tierMatch[1].trim() : '';
    let domain = domainLabels[article.domain] || article.domain;`
  if (!html.includes(oldInfoboxGate)) {
    // The pattern may already have been applied in a previous regen, or the source has shifted.
    // Try a more permissive match.
    const loose = /let statusMatch = article\.content\.match\(\/\^\\\*\\\*Status:\\\*\\\*\\s\*\(\.\+\)\$\/m\);\s*\n  if \(statusMatch && article\.domain !== 'index'\) \{/
    if (loose.test(html)) {
      html = html.replace(
        loose,
        `let statusMatch = article.content.match(/^\\*\\*Status:\\*\\*\\s*(.+)$/m);\n  let earlyMapping = EL_CONFIG.projectOrgMap[article.slug];\n  if ((statusMatch || earlyMapping) && article.domain !== 'index') {`,
      )
      console.error('  ✓ Infobox gate loosened — now renders when Status line OR EL mapping exists')
    } else {
      console.error('  ⚠ Infobox gate not found (already patched?)')
    }
  } else {
    html = html.replace(oldInfoboxGate, newInfoboxGate)
    console.error('  ✓ Infobox gate loosened — now renders when Status line OR EL mapping exists')
  }

  // Also fix the gallery block (same issue)
  const oldGallery = `if (elMapping && elMapping.count > 0) {
      infoboxHtml += '<div class="infobox-section">Gallery (' + elMapping.count + ' photos)</div>';
      infoboxHtml += '<div id="infobox-gallery-' + article.slug + '" style="padding:6px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;"></div>';
      // Async load gallery thumbnails
      setTimeout(function() {
        fetchELMedia(elMapping.orgId, 6).then(function(media) {
          let galEl = document.getElementById('infobox-gallery-' + article.slug);
          if (galEl && media.length > 0) {
            galEl.innerHTML = media.map(function(m) {
              return '<img src="' + m.url + '" style="width:100%;height:60px;object-fit:cover;border-radius:2px;cursor:pointer;" title="' + (m.title || '') + '">';
            }).join('');
          }
        });
      }, 200);
      infoboxHtml += '<div style="text-align:center;padding:4px 8px;"><a href="https://www.empathyledger.com" target="_blank" style="font-size:11px;">View all on Empathy Ledger →</a></div>';
    } else {
      infoboxHtml += '<div class="infobox-section">Gallery</div>';
      infoboxHtml += '<div style="text-align:center;color:#888;font-size:11px;padding:8px;">No photos yet · <a href="https://www.empathyledger.com" target="_blank" style="font-size:11px;">Upload to Empathy Ledger</a></div>';
    }`
  const newGallery = `if (elMapping && (elMapping.count > 0 || elMapping.filenamePattern || elMapping.orgFallbackId)) {
      let galleryCountLabel = elMapping.count > 0 ? (elMapping.count + ' photos') : 'live from filename';
      infoboxHtml += '<div class="infobox-section">Gallery (' + galleryCountLabel + ')</div>';
      infoboxHtml += '<div id="infobox-gallery-' + article.slug + '" style="padding:6px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;min-height:60px;"></div>';
      setTimeout(function() {
        fetchELMedia(article.slug, 6).then(function(media) {
          let galEl = document.getElementById('infobox-gallery-' + article.slug);
          if (galEl && media.length > 0) {
            galEl.innerHTML = media.map(function(m) {
              return '<img src="' + m.url + '" style="width:100%;height:60px;object-fit:cover;border-radius:2px;cursor:pointer;" title="' + (m.title || '') + '">';
            }).join('');
          } else if (galEl) {
            galEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;font-size:11px;padding:8px;">No photos yet</div>';
          }
        });
      }, 200);
      infoboxHtml += '<div style="text-align:center;padding:4px 8px;"><a href="https://www.empathyledger.com" target="_blank" style="font-size:11px;">View all on Empathy Ledger →</a></div>';
    } else {
      infoboxHtml += '<div class="infobox-section">Gallery</div>';
      infoboxHtml += '<div style="text-align:center;color:#888;font-size:11px;padding:8px;">No photos yet · <a href="https://www.empathyledger.com" target="_blank" style="font-size:11px;">Upload to Empathy Ledger</a></div>';
    }`
  if (html.includes("fetchELMedia(article.slug, 6)")) {
    console.error('  ✓ Infobox gallery already uses filename-pattern fallback (idempotent)')
  } else if (!html.includes(oldGallery)) {
    console.error('  ⚠ infobox gallery block not found — not patched')
  } else {
    html = html.replace(oldGallery, newGallery)
    console.error('  ✓ Infobox gallery now uses filename-pattern fallback')
  }

  // 13c. Replace the hardcoded `websiteMap` block with one that reads from EL_CONFIG.urlAudit.
  //      Adds Website / Repo / Deploy rows with live status badges, sourced from
  //      wiki/decisions/url-audit-latest.json (Acurioustractor org + Vercel team).
  const oldWebsiteBlock = `// Extract website URL from content
    let websiteMap = {`
  const newWebsiteBlock = `// Verified URLs from EL_CONFIG.urlAudit (generated by scripts/wiki-verify-urls.mjs)
    let urlInfo = (EL_CONFIG.urlAudit && EL_CONFIG.urlAudit[article.slug]) || null;
    if (urlInfo) {
      let badge = function(state) {
        if (state === 'up')   return '<span title="Live (HTTP 2xx)" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#0a0;margin-left:6px;vertical-align:middle;"></span>';
        if (state === 'down') return '<span title="Dead or unreachable" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#c33;margin-left:6px;vertical-align:middle;"></span>';
        return '<span title="Not checked" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ccc;margin-left:6px;vertical-align:middle;"></span>';
      };
      if (urlInfo.url) {
        let displayUrl = urlInfo.url.replace(/^https?:\\/\\//, '').replace(/\\/$/, '');
        infoboxHtml += '<div class="infobox-row"><div class="infobox-label">Website</div><div class="infobox-value"><a href="' + urlInfo.url + '" target="_blank">' + displayUrl + '</a>' + badge(urlInfo.live) + '</div></div>';
      }
      if (urlInfo.repo) {
        let archivedNote = urlInfo.archived ? ' <em style="color:#888;font-size:10px;">archived</em>' : '';
        infoboxHtml += '<div class="infobox-row"><div class="infobox-label">Repo</div><div class="infobox-value"><a href="' + urlInfo.repo + '" target="_blank">' + urlInfo.repoName + '</a>' + archivedNote + '</div></div>';
      }
      if (urlInfo.vercelProject) {
        infoboxHtml += '<div class="infobox-row"><div class="infobox-label">Deploy</div><div class="infobox-value"><span style="font-family:monospace;font-size:11px;color:#555;">' + urlInfo.vercelProject + '</span></div></div>';
      }
      if (urlInfo.knownIssue) {
        let issueLabel = urlInfo.knownIssue.split(':')[0];
        let issueDetail = urlInfo.knownIssue.split(':').slice(1).join(':').trim();
        infoboxHtml += '<div class="infobox-row" style="background:#fff3cd;border-top:1px solid #ffeeba;"><div class="infobox-label" style="color:#856404;">Status</div><div class="infobox-value" style="color:#856404;font-size:11px;"><strong>⚠ ' + issueLabel + '</strong><br>' + issueDetail + '</div></div>';
      }
    }
    // Legacy code-based websiteMap (kept as a fallback for articles without urlAudit entries)
    let websiteMap = {`
  // The urlAudit block lives between "// Verified URLs from EL_CONFIG.urlAudit" and "// Legacy code-based websiteMap"
  // On every regen, replace it wholesale so that renderer changes (e.g. knownIssue rows) propagate.
  const urlAuditBlockRegex = /\/\/ Verified URLs from EL_CONFIG\.urlAudit[\s\S]*?\/\/ Legacy code-based websiteMap \(kept as a fallback for articles without urlAudit entries\)\n    let websiteMap = \{/
  if (urlAuditBlockRegex.test(html)) {
    html = html.replace(urlAuditBlockRegex, newWebsiteBlock)
    console.error('  ✓ Infobox urlAudit block refreshed (renderer updated)')
  } else if (!html.includes(oldWebsiteBlock)) {
    console.error('  ⚠ websiteMap block not found — urlAudit infobox rows not added')
  } else {
    html = html.replace(oldWebsiteBlock, newWebsiteBlock)
    console.error('  ✓ Infobox now reads verified URLs from EL_CONFIG.urlAudit')
  }

  // Also gate the legacy websiteMap rendering: only render the legacy "Website" row if urlAudit didn't already produce one.
  const legacyWebsiteRender = `if (website) {
      infoboxHtml += '<div class="infobox-row"><div class="infobox-label">Website</div><div class="infobox-value"><a href="https://' + website + '" target="_blank">' + website + '</a></div></div>';
    }`
  const gatedLegacy = `if (website && !urlInfo) {
      infoboxHtml += '<div class="infobox-row"><div class="infobox-label">Website</div><div class="infobox-value"><a href="https://' + website + '" target="_blank">' + website + '</a></div></div>';
    }`
  if (html.includes('if (website && !urlInfo)')) {
    console.error('  ✓ Legacy websiteMap already gated (idempotent)')
  } else if (html.includes(legacyWebsiteRender)) {
    html = html.replace(legacyWebsiteRender, gatedLegacy)
    console.error('  ✓ Legacy websiteMap render gated behind !urlInfo')
  }

  // 14. Fix the broken About tab — it points to 'how-tractorpedia-works' which doesn't exist.
  //     The actual article is 'tractorpedia'. Replace both occurrences.
  const aboutBefore = (html.match(/how-tractorpedia-works/g) || []).length
  html = html.replace(/how-tractorpedia-works/g, 'tractorpedia')
  const aboutAfter = (html.match(/how-tractorpedia-works/g) || []).length
  if (aboutBefore > 0) {
    console.error(`  ✓ About tab fix: ${aboutBefore} broken links → 'tractorpedia' (was 0 after)`)
  }

  // 15. Add an "All Articles" tab between About and Art Portfolio + a showAllArticles() function.
  const oldTabBlock = `<li id="tab-about"><a href="#" onclick="navigateTo('tractorpedia'); return false;">About</a></li>
        <li><a href="#" onclick="showArtPortfolio(); return false;">Art Portfolio</a></li>`
  const newTabBlock = `<li id="tab-about"><a href="#" onclick="navigateTo('tractorpedia'); return false;">About</a></li>
        <li><a href="#" onclick="showAllArticles(); return false;">All Articles</a></li>
        <li><a href="#" onclick="showArtPortfolio(); return false;">Art Portfolio</a></li>`
  if (html.includes('showAllArticles()')) {
    console.error('  ✓ All Articles tab already present (idempotent)')
  } else if (!html.includes(oldTabBlock)) {
    console.error('  ⚠ Tab block not found — All Articles tab not added')
  } else {
    html = html.replace(oldTabBlock, newTabBlock)
    console.error('  ✓ All Articles tab added to top nav')
  }

  // Inject the showAllArticles function before the showArtPortfolio function declaration.
  const showAllArticlesFn = `
function showAllArticles() {
  window.location.hash = 'all-articles';
  document.getElementById('firstHeading').textContent = 'All Articles';
  document.getElementById('siteSub').style.display = 'block';
  let bc = document.getElementById('mw-category-breadcrumb');
  if (bc) { bc.textContent = 'index · all ' + (Object.keys(articles).length - 1) + ' articles'; bc.style.display = 'block'; }
  document.title = 'All Articles — Tractorpedia';

  // Group articles by domain, sort each group alphabetically by title
  let byDomain = {};
  Object.keys(articles).forEach(function(slug) {
    if (slug === 'index') return;
    let a = articles[slug];
    let d = a.domain || 'misc';
    if (!byDomain[d]) byDomain[d] = [];
    byDomain[d].push({ slug: slug, title: a.title });
  });
  let domainOrder = ['concepts','projects','people','communities','stories','art','research','technical','decisions','finance','misc'];
  let allDomains = Object.keys(byDomain).sort(function(a, b) {
    let ai = domainOrder.indexOf(a); let bi = domainOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  let html = '<div style="font-size:14px;line-height:1.6;max-width:900px;margin-bottom:1.5em;">';
  html += 'Every article in Tractorpedia, grouped by category and sorted alphabetically. ';
  html += '<strong>' + (Object.keys(articles).length - 1) + ' articles</strong> across ' + allDomains.length + ' domains.';
  html += '</div>';

  // Quick jump nav
  html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1.5em;padding:10px;background:#f8f9fa;border-radius:4px;font-size:12.5px;">';
  html += '<strong>Jump to:</strong> ';
  allDomains.forEach(function(d) {
    let label = (domainLabels && domainLabels[d]) || d;
    html += '<a href="#all-articles-' + d + '" onclick="document.getElementById(\\'sec-\\' + \\'' + d + '\\').scrollIntoView({behavior:\\'smooth\\'}); return false;">' + label + ' (' + byDomain[d].length + ')</a>';
  });
  html += '</div>';

  // Render each domain section
  allDomains.forEach(function(d) {
    let label = (domainLabels && domainLabels[d]) || d;
    let articles_in_domain = byDomain[d].sort(function(a, b) { return a.title.localeCompare(b.title); });
    html += '<div id="sec-' + d + '" style="margin-bottom:2em;">';
    html += '<h2 style="font-family: \\'Linux Libertine\\', Georgia, Times, serif; font-size:1.4em; font-weight:normal; border-bottom:1px solid #a2a9b1; padding-bottom:0.3em; margin: 1em 0 0.5em 0;">' + label + ' <span style="font-size:0.7em;color:#888;font-weight:normal;">(' + articles_in_domain.length + ')</span></h2>';
    html += '<div style="columns:3;column-gap:30px;font-size:13px;line-height:1.7;">';
    articles_in_domain.forEach(function(a) {
      html += '<div style="break-inside:avoid;"><a href="#' + a.slug + '" class="wikilink" onclick="navigateTo(\\'' + a.slug + '\\'); return false;">' + a.title + '</a></div>';
    });
    html += '</div>';
    html += '</div>';
  });

  document.getElementById('mw-content-text').innerHTML = html;
}

function showArtPortfolio() {`
  if (html.includes('function showAllArticles()')) {
    console.error('  ✓ showAllArticles() function already present (idempotent)')
  } else {
    const showArtRegex2 = /function showArtPortfolio\(\) \{/
    if (!showArtRegex2.test(html)) {
      console.error('  ⚠ showArtPortfolio() declaration not found — cannot inject showAllArticles()')
    } else {
      html = html.replace(/function showArtPortfolio\(\) \{/, showAllArticlesFn)
      console.error('  ✓ showAllArticles() function injected — alphabetical browse by domain')
    }
  }

  // Also add #all-articles routing in handleHash
  const handleHashAddOld = `if (hash === 'art-portfolio') {
    showArtPortfolio();
    return;
  }`
  const handleHashAddNew = `if (hash === 'art-portfolio') {
    showArtPortfolio();
    return;
  }
  if (hash === 'all-articles') {
    showAllArticles();
    return;
  }`
  if (html.includes("hash === 'all-articles'")) {
    console.error('  ✓ #all-articles routing already present (idempotent)')
  } else if (!html.includes(handleHashAddOld)) {
    console.error('  ⚠ handleHash art-portfolio block not found — all-articles routing not added')
  } else {
    html = html.replace(handleHashAddOld, handleHashAddNew)
    console.error('  ✓ #all-articles hash routing added')
  }

  // 16. Replace showMainPage() with a much richer overview page:
  //     hero + stats counters, pillar tiles with thumbnails, voices section,
  //     recent stories ticker, concept cloud, photo strip.
  // Fetch TRUE ecosystem totals from EL (not just the subset linked to wiki articles).
  // These reflect the full Empathy Ledger reality, not what we've mapped so far.
  async function fetchExactCount(path) {
    const r = await fetch(`${EL_URL}/rest/v1/${path}`, {
      headers: {
        apikey: EL_KEY,
        Authorization: `Bearer ${EL_KEY}`,
        Prefer: 'count=exact',
        Range: '0-0',
      },
    })
    if (!r.ok) return 0
    const cr = r.headers.get('content-range') || ''
    return parseInt(cr.split('/').pop(), 10) || 0
  }
  console.error('  Fetching true ecosystem totals from EL…')
  const ECOSYSTEM_TOTALS = {
    storytellers: await fetchExactCount('storytellers?select=id&is_active=eq.true'),
    publicStories: await fetchExactCount('stories?select=id&is_public=eq.true'),
    totalMedia: await fetchExactCount('media_assets?select=id'),
    elProjects: await fetchExactCount('projects?select=id'),
    elOrgs: await fetchExactCount('organizations?select=id'),
  }
  console.error(`  EL totals: ${ECOSYSTEM_TOTALS.storytellers} storytellers · ${ECOSYSTEM_TOTALS.publicStories} stories · ${ECOSYSTEM_TOTALS.totalMedia.toLocaleString()} media · ${ECOSYSTEM_TOTALS.elProjects} projects`)

  // Also compute the wiki-linked subset for the secondary line
  const linkedStorytellers = new Set()
  const linkedStories = new Set()
  let linkedPhotos = 0
  for (const slug of Object.keys(map)) {
    const e = map[slug]
    if (e.storytellers) e.storytellers.forEach((s) => linkedStorytellers.add(s.id))
    if (e.stories) e.stories.forEach((s) => linkedStories.add(s.id))
    if (e.count) linkedPhotos += e.count
  }
  const STATS = {
    articles: articleCount,
    storytellers: ECOSYSTEM_TOTALS.storytellers,
    stories: ECOSYSTEM_TOTALS.publicStories,
    photos: ECOSYSTEM_TOTALS.totalMedia,
    elProjects: ECOSYSTEM_TOTALS.elProjects,
    linkedStorytellers: linkedStorytellers.size,
    linkedStories: linkedStories.size,
    linkedPhotos: linkedPhotos,
  }
  // Featured storytellers — pull a few with avatars
  const featured = []
  for (const slug of Object.keys(map)) {
    const e = map[slug]
    if (!e.storytellers) continue
    for (const s of e.storytellers) {
      if (s.avatar && featured.length < 8 && !featured.find((f) => f.id === s.id)) {
        featured.push({ ...s, project: e.projectName, projectSlug: slug })
      }
    }
  }
  // Featured project tiles (cluster representatives that we know have photos)
  const FEATURED_PROJECTS = [
    { slug: 'oonchiumpa', label: 'Oonchiumpa', cluster: 'Place' },
    { slug: 'picc-photo-kiosk', label: 'PICC Photo Kiosk', cluster: 'Community Control' },
    { slug: 'goods-on-country', label: 'Goods on Country', cluster: 'Ecosystem' },
    { slug: 'the-confessional', label: 'The Confessional', cluster: 'Studio' },
    { slug: 'the-harvest', label: 'The Harvest', cluster: 'Place' },
    { slug: 'gold-phone', label: 'Gold.Phone', cluster: 'Studio' },
    { slug: 'contained', label: 'CONTAINED', cluster: 'Studio' },
    { slug: 'community-capital', label: 'Community Capital', cluster: 'Ecosystem' },
  ]

  const newShowMainPage = `function showMainPage() {
  document.title = 'Tractorpedia';
  document.getElementById('mw-category-breadcrumb').style.display = 'none';
  document.getElementById('firstHeading').style.display = 'none';
  document.getElementById('siteSub').style.display = 'none';

  let articleCount = Object.keys(articles).filter(function(k) { return k !== 'index'; }).length;
  let mappedCount = Object.keys(EL_CONFIG.projectOrgMap).length;

  // Compute live wikilink count
  let totalLinks = 0;
  Object.values(articles).forEach(function(a) { if (a.links) totalLinks += a.links.length; });

  let html = '';

  // ── HERO ──────────────────────────────────────────
  html += '<div style="text-align:center; padding: 2em 0 1.2em; border-bottom: 1px solid #a2a9b1; margin-bottom: 1.5em;">';
  html += '<h1 style="font-family: \\'Linux Libertine\\', Georgia, Times, serif; font-size: 2.4em; font-weight: normal; margin: 0 0 0.2em 0;">Tractorpedia</h1>';
  html += '<p style="font-size: 16px; color: #202122; margin: 0 0 0.4em 0;">The living knowledge base for <strong>A Curious Tractor</strong></p>';
  html += '<p style="font-size: 13px; color: #72777d; font-style: italic; margin: 0;">Maintained by LLM. Curated by humans. Knowledge that compounds.</p>';
  html += '</div>';

  // ── STATS COUNTERS ────────────────────────────────
  html += '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:2em;text-align:center;">';
  let counters = [
    { n: articleCount, label: 'Articles', color: '#0645ad' },
    { n: totalLinks, label: 'Wikilinks', color: '#7b68ee' },
    { n: mappedCount, label: 'Linked to EL', color: '#00af89' },
    { n: ${STATS.storytellers}, label: 'Storytellers', color: '#e67e22' },
    { n: ${STATS.stories}, label: 'Stories', color: '#c0392b' },
    { n: ${STATS.photos}, label: 'Photos', color: '#16a085' }
  ];
  counters.forEach(function(c) {
    html += '<div style="background:#fff;border:1px solid #e5e5e5;border-radius:4px;padding:14px 6px;">';
    html += '<div style="font-size:1.8em;font-weight:600;line-height:1;color:' + c.color + ';">' + c.n.toLocaleString() + '</div>';
    html += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#888;margin-top:4px;">' + c.label + '</div>';
    html += '</div>';
  });
  html += '</div>';

  // ── WHAT IS TRACTORPEDIA ──────────────────────────
  html += '<div style="background:#f8f9fa;border-left:4px solid #0645ad;padding:1em 1.2em;margin-bottom:2em;font-size:14px;line-height:1.65;">';
  html += '<strong>Tractorpedia</strong> is the institutional memory of <strong>A Curious Tractor</strong> — a regenerative innovation ecosystem co-founded by Benjamin Knight and Nicholas Marchesi. ';
  html += 'It compiles articles, decisions, stories, and photos from across our seven core projects (Empathy Ledger, JusticeHub, CivicGraph, Goods on Country, The Harvest, ACT Farm, the Studio art line) and the communities we partner with. ';
  html += 'Every page links back to the source data — photos load live from <a href="https://www.empathyledger.com" target="_blank">Empathy Ledger</a>, storytellers have explicit consent, the wiki itself is rebuilt weekly by an automated pipeline. ';
  html += '<a href="#" onclick="navigateTo(\\'tractorpedia\\'); return false;">Read the full About →</a>';
  html += '</div>';

  // ── FEATURED PROJECTS WITH THUMBNAILS ─────────────
  html += '<h2 style="font-family: \\'Linux Libertine\\', Georgia, Times, serif; font-size:1.4em; font-weight:normal; border-bottom:1px solid #a2a9b1; padding-bottom:0.3em; margin: 0 0 0.8em 0;">Featured Projects</h2>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-bottom:2em;">';
  let featuredProjects = ${JSON.stringify(FEATURED_PROJECTS)};
  featuredProjects.forEach(function(p) {
    html += '<div style="background:#fff;border:1px solid #ddd;border-radius:6px;overflow:hidden;cursor:pointer;" onclick="navigateTo(\\'' + p.slug + '\\')">';
    html += '<div id="hp-thumb-' + p.slug + '" style="height:120px;background:linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);display:flex;align-items:center;justify-content:center;color:#888;font-size:11px;">loading…</div>';
    html += '<div style="padding:10px 12px;">';
    html += '<div style="font-size:13.5px;font-weight:600;line-height:1.2;">' + p.label + '</div>';
    html += '<div style="font-size:10.5px;color:#888;text-transform:uppercase;letter-spacing:0.04em;margin-top:2px;">' + p.cluster + '</div>';
    html += '</div>';
    html += '</div>';
  });
  html += '</div>';

  // ── VOICES OF ACT ─────────────────────────────────
  html += '<h2 style="font-family: \\'Linux Libertine\\', Georgia, Times, serif; font-size:1.4em; font-weight:normal; border-bottom:1px solid #a2a9b1; padding-bottom:0.3em; margin: 0 0 0.8em 0;">Voices of ACT</h2>';
  let allFeatured = ${JSON.stringify(featured.slice(0, 8))};
  if (allFeatured.length > 0) {
    html += '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:0.5em;">';
    allFeatured.forEach(function(s) {
      let elderBadge = s.isElder ? ' <span style="display:inline-block;background:#d4a017;color:#fff;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;padding:1px 5px;border-radius:2px;">Elder</span>' : '';
      let avatar = s.avatar ? '<img src="' + s.avatar + '" style="width:50px;height:50px;border-radius:50%;object-fit:cover;flex-shrink:0;">' : '<div style="width:50px;height:50px;border-radius:50%;background:#e0e0e0;flex-shrink:0;"></div>';
      html += '<div onclick="navigateTo(\\'' + s.projectSlug + '\\')" style="display:flex;align-items:center;gap:10px;background:#fff;padding:8px 12px;border-radius:30px;border:1px solid #e5e5e5;cursor:pointer;">';
      html += avatar;
      html += '<div><div style="font-size:13px;font-weight:600;line-height:1.2;">' + s.name + elderBadge + '</div>';
      html += '<div style="font-size:10.5px;color:#888;">' + (s.location || s.project) + '</div></div>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div style="font-size:11px;color:#888;margin-bottom:2em;">All voices have explicit consent · live from Empathy Ledger</div>';
  } else {
    html += '<div style="font-size:13px;color:#888;margin-bottom:2em;">No storytellers loaded yet — tag stories with project_id in Empathy Ledger admin.</div>';
  }

  // ── EXPLORE BY DOMAIN (auto-generated) ────────────
  let byDomain = {};
  Object.keys(articles).forEach(function(slug) {
    if (slug === 'index') return;
    let d = articles[slug].domain || 'misc';
    if (!byDomain[d]) byDomain[d] = 0;
    byDomain[d]++;
  });
  let domainCards = [
    { d: 'projects', label: 'Projects', color: '#00af89', desc: 'ACT ecosystem projects' },
    { d: 'concepts', label: 'Concepts', color: '#7b68ee', desc: 'Frameworks, methodologies, theories' },
    { d: 'stories', label: 'Stories', color: '#e67e22', desc: 'Vignettes from Empathy Ledger' },
    { d: 'research', label: 'Research', color: '#c0392b', desc: 'Evidence, analysis, op-eds' },
    { d: 'people', label: 'People', color: '#3498db', desc: 'Founders, partners, voices' },
    { d: 'communities', label: 'Communities', color: '#16a085', desc: 'Place-based relationships' },
    { d: 'decisions', label: 'Decisions', color: '#d35400', desc: 'Strategic decisions log' },
    { d: 'technical', label: 'Technical', color: '#34495e', desc: 'Architecture, infrastructure' }
  ];
  html += '<h2 style="font-family: \\'Linux Libertine\\', Georgia, Times, serif; font-size:1.4em; font-weight:normal; border-bottom:1px solid #a2a9b1; padding-bottom:0.3em; margin: 0 0 0.8em 0;">Explore by Domain</h2>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:2em;">';
  domainCards.forEach(function(c) {
    let count = byDomain[c.d] || 0;
    if (count === 0) return;
    html += '<div onclick="showAllArticles(); setTimeout(function(){ document.getElementById(\\'sec-\\' + \\'' + c.d + '\\')?.scrollIntoView({behavior:\\'smooth\\'}); }, 100);" style="background:#fff;border:1px solid #e5e5e5;border-left:4px solid ' + c.color + ';border-radius:4px;padding:12px 14px;cursor:pointer;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:baseline;">';
    html += '<div style="font-size:14px;font-weight:600;">' + c.label + '</div>';
    html += '<div style="font-size:18px;color:' + c.color + ';font-weight:600;">' + count + '</div>';
    html += '</div>';
    html += '<div style="font-size:11px;color:#888;margin-top:3px;">' + c.desc + '</div>';
    html += '</div>';
  });
  html += '</div>';

  // ── RECENT ARTICLES (alphabetical sample) ─────────
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5em;margin-bottom:2em;">';
  // Featured Article
  html += '<div>';
  html += '<h2 style="font-family: \\'Linux Libertine\\', Georgia, Times, serif; font-size:1.2em; font-weight:normal; border-bottom:1px solid #a2a9b1; padding-bottom:0.2em; margin: 0 0 0.5em 0;">Featured Article: <a href="#third-reality" class="wikilink" onclick="navigateTo(\\'third-reality\\'); return false;">The Third Reality</a></h2>';
  html += '<p style="font-size:13px;line-height:1.6;color:#202122;"><strong>The Third Reality</strong> is ACT\\'s proprietary methodology for measuring social impact. It is the synthesis that emerges when verified systemic data (CivicGraph, JusticeHub) intersects with sovereign human narrative (Empathy Ledger). A spreadsheet alone won\\'t change a policymaker\\'s mind. A singular tragic story can be dismissed as an anomaly. But when you mathematically link an immutable, sovereign human story to verified systemic data, you create an undeniable, shared truth. <a href="#third-reality" class="wikilink" onclick="navigateTo(\\'third-reality\\'); return false;">Read more…</a></p>';
  html += '</div>';
  // Recent slice
  html += '<div>';
  html += '<h2 style="font-family: \\'Linux Libertine\\', Georgia, Times, serif; font-size:1.2em; font-weight:normal; border-bottom:1px solid #a2a9b1; padding-bottom:0.2em; margin: 0 0 0.5em 0;">Browse the Wiki</h2>';
  html += '<p style="font-size:13px;line-height:1.6;">';
  html += '<a href="#" onclick="showAllArticles(); return false;"><strong>All ' + articleCount + ' articles →</strong></a><br>';
  html += '<a href="#" onclick="showArtPortfolio(); return false;"><strong>Art Portfolio (9 pieces) →</strong></a><br>';
  html += '<a href="#" onclick="navigateTo(\\'lcaa-method\\'); return false;">LCAA Method</a> · ';
  html += '<a href="#" onclick="navigateTo(\\'beautiful-obsolescence\\'); return false;">Beautiful Obsolescence</a> · ';
  html += '<a href="#" onclick="navigateTo(\\'consent-as-infrastructure\\'); return false;">Consent as Infrastructure</a> · ';
  html += '<a href="#" onclick="navigateTo(\\'indigenous-data-sovereignty\\'); return false;">Indigenous Data Sovereignty</a><br>';
  html += '<a href="#" onclick="navigateTo(\\'alma-intervention-portfolio\\'); return false;">ALMA Portfolio (1,766 interventions)</a> · ';
  html += '<a href="#" onclick="navigateTo(\\'justice-funding-landscape\\'); return false;">Justice Funding Landscape ($31.8B)</a>';
  html += '</p></div>';
  html += '</div>';

  // ── FOOTER ────────────────────────────────────────
  html += '<div class="mp-stats" style="text-align:center;font-size:12px;color:#888;border-top:1px solid #e5e5e5;padding-top:1em;margin-top:1em;">';
  html += 'Tractorpedia is maintained using the <a href="#llm-knowledge-base" class="wikilink" onclick="navigateTo(\\'llm-knowledge-base\\'); return false;">LLM Knowledge Base</a> pattern. ';
  html += 'Photos live from <a href="https://www.empathyledger.com" target="_blank">Empathy Ledger</a>. Last compiled: ${new Date().toISOString().split('T')[0]}.';
  html += '</div>';

  document.getElementById('mw-content-text').innerHTML = html;

  // Async-load thumbnails for Featured Projects
  featuredProjects.forEach(function(p) {
    fetchELMedia(p.slug, 1).then(function(media) {
      let el = document.getElementById('hp-thumb-' + p.slug);
      if (el && media && media.length > 0) {
        el.innerHTML = '<img src="' + media[0].url + '" style="width:100%;height:100%;object-fit:cover;">';
      }
    });
  });
}`

  // Always replace showMainPage so STATS counters reflect latest ecosystem totals
  const oldShowMainPageRegex = /function showMainPage\(\) \{[\s\S]*?\n\}/
  if (!oldShowMainPageRegex.test(html)) {
    console.error('  ⚠ showMainPage() not found — main page not enriched')
  } else {
    html = html.replace(oldShowMainPageRegex, newShowMainPage)
    console.error(`  ✓ showMainPage() rebuilt — stats: ${STATS.storytellers} storytellers · ${STATS.stories} stories · ${STATS.photos.toLocaleString()} photos`)
  }

  // 17. Add a Voices tab + showVoices() function that fetches ALL active storytellers
  //     directly from EL (not just the ones tied to projects in the photo map). Live data.
  const oldVoicesTab = `<li><a href="#" onclick="showAllArticles(); return false;">All Articles</a></li>
        <li><a href="#" onclick="showArtPortfolio(); return false;">Art Portfolio</a></li>`
  const newVoicesTab = `<li><a href="#" onclick="showAllArticles(); return false;">All Articles</a></li>
        <li><a href="#" onclick="showVoices(); return false;">Voices</a></li>
        <li><a href="#" onclick="showArtPortfolio(); return false;">Art Portfolio</a></li>`
  if (html.includes('showVoices()')) {
    console.error('  ✓ Voices tab already present (idempotent)')
  } else if (!html.includes(oldVoicesTab)) {
    console.error('  ⚠ Tab nav not found — Voices tab not added')
  } else {
    html = html.replace(oldVoicesTab, newVoicesTab)
    console.error('  ✓ Voices tab added to top nav')
  }

  // Inject showVoices() function (lives next to showAllArticles)
  const showVoicesFn = `
function showVoices() {
  window.location.hash = 'voices';
  document.getElementById('firstHeading').textContent = 'Voices of ACT';
  document.getElementById('siteSub').style.display = 'block';
  let bc = document.getElementById('mw-category-breadcrumb');
  if (bc) { bc.textContent = 'storytellers · empathy ledger · live'; bc.style.display = 'block'; }
  document.title = 'Voices of ACT — Tractorpedia';

  document.getElementById('mw-content-text').innerHTML =
    '<div style="font-size:14px;line-height:1.6;max-width:900px;margin-bottom:1.5em;">' +
    'Every active storyteller in <a href="https://www.empathyledger.com" target="_blank">Empathy Ledger</a>, with explicit consent. ' +
    'Click any storyteller to find the projects they are linked to. ' +
    'Loading live from Empathy Ledger…' +
    '</div>' +
    '<div id="voices-content" style="font-size:13px;color:#888;">Loading 250+ storytellers…</div>';

  // Fetch all active storytellers with avatars
  let url = EL_CONFIG.supabaseUrl + '/rest/v1/storytellers?select=id,display_name,bio,public_avatar_url,location,cultural_background,is_elder,is_featured,tags&is_active=eq.true&order=is_elder.desc,display_name.asc&limit=300';
  fetch(url, {
    headers: {
      'apikey': EL_CONFIG.supabaseAnonKey,
      'Authorization': 'Bearer ' + EL_CONFIG.supabaseAnonKey
    }
  }).then(function(r) { return r.json(); }).then(function(storytellers) {
    if (!Array.isArray(storytellers)) {
      document.getElementById('voices-content').innerHTML = '<div style="color:#c00;">Error loading storytellers from Empathy Ledger.</div>';
      return;
    }

    // Build a reverse lookup: storyteller_id → wiki article slugs (for click navigation)
    let storytellerToWiki = {};
    Object.keys(EL_CONFIG.projectOrgMap).forEach(function(slug) {
      let entry = EL_CONFIG.projectOrgMap[slug];
      if (entry.storytellers && entry.storytellers.length > 0) {
        entry.storytellers.forEach(function(s) {
          if (!storytellerToWiki[s.id]) storytellerToWiki[s.id] = [];
          storytellerToWiki[s.id].push({ slug: slug, name: entry.projectName });
        });
      }
    });

    // Group by location
    let byLocation = {};
    storytellers.forEach(function(s) {
      let loc = (s.location || 'Unknown location').trim();
      if (!byLocation[loc]) byLocation[loc] = [];
      byLocation[loc].push(s);
    });
    let locations = Object.keys(byLocation).sort(function(a, b) {
      return byLocation[b].length - byLocation[a].length;
    });

    let html = '';
    // Stats bar
    let elderCount = storytellers.filter(function(s) { return s.is_elder; }).length;
    let withAvatars = storytellers.filter(function(s) { return s.public_avatar_url; }).length;
    html += '<div style="display:flex;gap:20px;margin-bottom:1.5em;padding:12px 16px;background:#f8f9fa;border-radius:4px;font-size:13px;">';
    html += '<div><strong>' + storytellers.length + '</strong> total voices</div>';
    html += '<div><strong>' + elderCount + '</strong> elders</div>';
    html += '<div><strong>' + withAvatars + '</strong> with portraits</div>';
    html += '<div><strong>' + locations.length + '</strong> locations</div>';
    html += '</div>';

    // Quick jump nav
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:1.5em;font-size:11.5px;">';
    html += '<strong style="margin-right:6px;">Jump to:</strong>';
    locations.slice(0, 15).forEach(function(loc) {
      let safeLoc = loc.replace(/[^a-z0-9]/gi, '_');
      html += '<a href="#voices_' + safeLoc + '" onclick="document.getElementById(\\'loc-\\' + \\'' + safeLoc + '\\').scrollIntoView({behavior:\\'smooth\\'}); return false;">' + loc + ' (' + byLocation[loc].length + ')</a>';
    });
    html += '</div>';

    // Each location section
    locations.forEach(function(loc) {
      let safeLoc = loc.replace(/[^a-z0-9]/gi, '_');
      html += '<div id="loc-' + safeLoc + '" style="margin-bottom:2em;">';
      html += '<h2 style="font-family: \\'Linux Libertine\\', Georgia, Times, serif; font-size:1.3em; font-weight:normal; border-bottom:1px solid #a2a9b1; padding-bottom:0.3em; margin: 1em 0 0.5em 0;">' + loc + ' <span style="font-size:0.7em;color:#888;font-weight:normal;">(' + byLocation[loc].length + ')</span></h2>';
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">';
      byLocation[loc].forEach(function(s) {
        let elderBadge = s.is_elder ? '<span style="display:inline-block;background:#d4a017;color:#fff;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;padding:1px 5px;border-radius:2px;vertical-align:middle;margin-left:4px;">Elder</span>' : '';
        let featuredBadge = s.is_featured ? '<span style="display:inline-block;background:#27ae60;color:#fff;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;padding:1px 5px;border-radius:2px;vertical-align:middle;margin-left:4px;">Featured</span>' : '';
        let avatar = s.public_avatar_url
          ? '<img src="' + s.public_avatar_url + '" style="width:60px;height:60px;border-radius:50%;object-fit:cover;flex-shrink:0;">'
          : '<div style="width:60px;height:60px;border-radius:50%;background:#e0e0e0;display:flex;align-items:center;justify-content:center;font-size:18px;color:#888;flex-shrink:0;">' + (s.display_name || '?').charAt(0) + '</div>';
        let projectLinks = storytellerToWiki[s.id] || [];
        let projectsHtml = '';
        if (projectLinks.length > 0) {
          projectsHtml = '<div style="font-size:10.5px;color:#0645ad;margin-top:4px;">in ' + projectLinks.map(function(p) {
            return '<a href="#' + p.slug + '" onclick="navigateTo(\\'' + p.slug + '\\'); return false;">' + p.name + '</a>';
          }).join(', ') + '</div>';
        }
        let bioHtml = s.bio ? '<div style="font-size:11px;color:#888;margin-top:4px;line-height:1.4;">' + s.bio.slice(0, 100) + (s.bio.length > 100 ? '…' : '') + '</div>' : '';
        html += '<div style="background:#fff;border:1px solid #e5e5e5;border-radius:6px;padding:12px;display:flex;gap:12px;align-items:flex-start;">';
        html += avatar;
        html += '<div style="flex:1;min-width:0;">';
        html += '<div style="font-size:13px;font-weight:600;line-height:1.2;">' + (s.display_name || 'Unknown') + elderBadge + featuredBadge + '</div>';
        html += projectsHtml;
        html += bioHtml;
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';
    });

    html += '<div style="font-size:11px;color:#888;margin-top:2em;border-top:1px solid #e5e5e5;padding-top:0.8em;">All voices have explicit consent. Live from <a href="https://www.empathyledger.com" target="_blank">Empathy Ledger</a> · ' + storytellers.length + ' active storytellers</div>';

    document.getElementById('mw-content-text').innerHTML =
      '<div style="font-size:14px;line-height:1.6;max-width:900px;margin-bottom:1.5em;">' +
      'Every active storyteller in <a href="https://www.empathyledger.com" target="_blank">Empathy Ledger</a>, with explicit consent. ' +
      'Click a project link beside any storyteller to navigate to their work in the wiki.' +
      '</div>' + html;
  }).catch(function(e) {
    console.error('Voices fetch error:', e);
    document.getElementById('voices-content').innerHTML = '<div style="color:#c00;">Error loading storytellers: ' + e.message + '</div>';
  });
}

function showAllArticles() {`
  if (html.includes('function showVoices()')) {
    console.error('  ✓ showVoices() function already present (idempotent)')
  } else {
    const showAllArticlesRegex = /function showAllArticles\(\) \{/
    if (!showAllArticlesRegex.test(html)) {
      console.error('  ⚠ showAllArticles() declaration not found — cannot inject showVoices()')
    } else {
      html = html.replace(/function showAllArticles\(\) \{/, showVoicesFn)
      console.error('  ✓ showVoices() function injected — fetches all 277 storytellers from EL live')
    }
  }

  // Add #voices hash routing
  const handleHashVoicesOld = `if (hash === 'all-articles') {
    showAllArticles();
    return;
  }`
  const handleHashVoicesNew = `if (hash === 'all-articles') {
    showAllArticles();
    return;
  }
  if (hash === 'voices') {
    showVoices();
    return;
  }`
  if (html.includes("hash === 'voices'")) {
    console.error('  ✓ #voices routing already present (idempotent)')
  } else if (!html.includes(handleHashVoicesOld)) {
    console.error('  ⚠ handleHash all-articles block not found — voices routing not added')
  } else {
    html = html.replace(handleHashVoicesOld, handleHashVoicesNew)
    console.error('  ✓ #voices hash routing added')
  }

  // 18. Fix the TOC bug: Contents links inside articles produce <a href="#section-id">.
  //     These trigger hashchange → handleHash() looks up articles[section-id] → 404.
  //     Patch generateToc to add onclick that scrolls directly without router involvement.
  const oldTocLink1 = `toc += '<li><a href="#' + h.id + '"><span class="tocnumber">' + h2num + '</span> <span class="toctext">' + h.text + '</span></a>';`
  const newTocLink1 = `toc += '<li><a href="#' + h.id + '" onclick="document.getElementById(\\'' + h.id + '\\')?.scrollIntoView({behavior:\\'smooth\\'}); return false;"><span class="tocnumber">' + h2num + '</span> <span class="toctext">' + h.text + '</span></a>';`
  const oldTocLink2 = `toc += '<li><a href="#' + headings[nextIdx].id + '"><span class="tocnumber">' + h2num + '.' + h3num + '</span> <span class="toctext">' + headings[nextIdx].text + '</span></a></li>';`
  const newTocLink2 = `toc += '<li><a href="#' + headings[nextIdx].id + '" onclick="document.getElementById(\\'' + headings[nextIdx].id + '\\')?.scrollIntoView({behavior:\\'smooth\\'}); return false;"><span class="tocnumber">' + h2num + '.' + h3num + '</span> <span class="toctext">' + headings[nextIdx].text + '</span></a></li>';`
  if (html.includes('scrollIntoView({behavior:\\\'smooth\\\'}); return false;"><span class="tocnumber">')) {
    console.error('  ✓ TOC scroll-on-click already patched (idempotent)')
  } else if (!html.includes(oldTocLink1)) {
    console.error('  ⚠ generateToc h2 link not found — TOC bug not fixed')
  } else {
    html = html.replace(oldTocLink1, newTocLink1)
    html = html.replace(oldTocLink2, newTocLink2)
    console.error('  ✓ generateToc() now scrolls in-page instead of triggering router')
  }

  writeFileSync(VIEWER, html)
  const after = html.length
  console.error(`\n✓ Wrote ${VIEWER}`)
  console.error(`  Size: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB`)
  console.error(`  Articles embedded: ${articleCount}`)
  console.error(`  Photo map entries: ${Object.keys(map).length}`)
  console.error(`  Media filter: now includes images, videos, audio (all known EL file_types)`)

  if (!dryRun) {
    console.error('  Syncing command-center wiki snapshot…')
    execFileSync('node', ['scripts/wiki-sync-command-center-snapshot.mjs'], {
      cwd: ROOT,
      stdio: 'inherit',
    })
  }

  try {
    logWikiEvent(
      'viewer-build',
      `${articleCount} articles · ${Object.keys(map).length} photo maps · ${(after / 1024).toFixed(0)}KB`,
      ['tools/act-wikipedia.html'],
    )
  } catch (e) {
    console.error('  ⚠ wiki-log append failed:', e.message)
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
