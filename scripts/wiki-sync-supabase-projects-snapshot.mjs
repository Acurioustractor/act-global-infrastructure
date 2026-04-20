#!/usr/bin/env node
/**
 * Wiki Supabase Projects Snapshot
 *
 * Pulls the live `public.projects` table into the wiki as:
 * - an immutable raw snapshot in `wiki/raw/`
 * - a bridge summary in `wiki/sources/`
 * - a refreshed `wiki/sources/index.md`
 *
 * This keeps Supabase in the ACT knowledge loop as an operational mirror,
 * not as an isolated database the wiki never sees.
 *
 * Usage:
 *   node scripts/wiki-sync-supabase-projects-snapshot.mjs
 *   node scripts/wiki-sync-supabase-projects-snapshot.mjs --dry-run
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs'
import { basename, join, relative } from 'path'
import { logWikiEvent } from './wiki-log.mjs'
import { writeSourcesIndex } from './lib/wiki-sources.mjs'

const ROOT = process.cwd()
const WIKI_ROOT = join(ROOT, 'wiki')
const RAW_DIR = join(WIKI_ROOT, 'raw')
const SOURCES_DIR = join(WIKI_ROOT, 'sources')
const SOURCES_INDEX = join(SOURCES_DIR, 'index.md')
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function hhmm() {
  return new Date().toISOString().slice(11, 16).replace(':', '')
}

function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true })
}

function yamlSafe(value) {
  return String(value ?? '').replace(/"/g, '\\"')
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return {}

  const endIndex = content.indexOf('\n---\n', 4)
  if (endIndex === -1) return {}

  const data = {}
  for (const line of content.slice(4, endIndex).split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue
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

function countBy(items, getter) {
  const counts = new Map()
  for (const item of items) {
    const key = getter(item) || 'unknown'
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function renderCountBullets(label, entries, limit = 8) {
  if (!entries.length) return [`- ${label}: none`]
  const top = entries.slice(0, limit).map(([key, count]) => `${key} (${count})`).join(', ')
  return [`- ${label}: ${top}`]
}

function chooseSnapshotBasename() {
  const base = `${todayIso()}-supabase-projects-snapshot`
  const rawPath = join(RAW_DIR, `${base}.md`)
  const sourcePath = join(SOURCES_DIR, `${base}.md`)

  if (!existsSync(rawPath) && !existsSync(sourcePath)) return base
  return `${base}-${hhmm()}`
}

async function fetchProjects() {
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
  if (databaseUrl) {
    const sql = `
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          id,
          code,
          act_project_code,
          name,
          description,
          category,
          tier,
          status,
          priority,
          parent_project,
          organization_id,
          metadata,
          created_at,
          updated_at,
          cover_image_url
        FROM public.projects
        ORDER BY name ASC
      ) t;
    `

    const output = execFileSync('psql', [databaseUrl, '-t', '-A', '-c', sql], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()

    return JSON.parse(output || '[]')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase connection. Set DATABASE_URL for direct Postgres access, or SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL plus SUPABASE_SERVICE_ROLE_KEY for REST access.',
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const pageSize = 200
  let from = 0
  const rows = []

  while (true) {
    const { data, error } = await supabase
      .from('projects')
      .select(
        'id, code, act_project_code, name, description, category, tier, status, priority, parent_project, organization_id, metadata, created_at, updated_at, cover_image_url',
      )
      .order('name', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
    from += pageSize
  }

  return rows
}

function renderRawSnapshot(rows, basename) {
  const categoryCounts = countBy(rows, (row) => row.category)
  const tierCounts = countBy(rows, (row) => row.tier)
  const statusCounts = countBy(rows, (row) => row.status)
  const entityTypeCounts = countBy(rows, (row) => row.metadata?.entity_type)
  const canonicalSlugCount = rows.filter((row) => row.metadata?.canonical_slug).length
  const websitePathCount = rows.filter((row) => row.metadata?.website_path).length

  const lines = [
    '---',
    `title: "Supabase Projects Snapshot — ${todayIso()}"`,
    'source: supabase/public.projects',
    'source_type: supabase_snapshot',
    `captured_at: ${todayIso()}`,
    'captured_by: wiki-sync-supabase-projects-snapshot',
    `row_count: ${rows.length}`,
    `snapshot_basename: ${basename}`,
    '---',
    '',
    `# Supabase Projects Snapshot — ${todayIso()}`,
    '',
    '> Operational mirror of ACT project identity in Supabase. This is raw capture for the wiki, not the place where project meaning should be edited.',
    '',
    '## Why This Exists',
    '',
    '- Supabase holds operational state and history, but not the canonical meaning of a project.',
    '- This snapshot lets the wiki treat database state as ingestible source material instead of invisible infrastructure.',
    '- It supports the ACT rule: wiki defines identity, Supabase mirrors it, websites and EL consume the stable contract.',
    '',
    '## Snapshot Summary',
    '',
    `- Total rows: ${rows.length}`,
    `- Rows with \`metadata.canonical_slug\`: ${canonicalSlugCount}`,
    `- Rows with \`metadata.website_path\`: ${websitePathCount}`,
    ...renderCountBullets('Categories', categoryCounts),
    ...renderCountBullets('Tiers', tierCounts),
    ...renderCountBullets('Statuses', statusCounts),
    ...renderCountBullets('Entity types', entityTypeCounts),
    '',
    '## Project Rows',
    '',
    '| Canonical code | Row code | Name | Category | Tier | Status | Canonical slug | Entity type | Website path | Parent | Updated |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
  ]

  for (const row of rows) {
    const metadata = row.metadata || {}
    lines.push(
      `| ${row.act_project_code || '—'} | ${row.code || '—'} | ${String(row.name || '').replaceAll('|', '\\|')} | ${row.category || '—'} | ${row.tier || '—'} | ${row.status || '—'} | ${metadata.canonical_slug || '—'} | ${metadata.entity_type || '—'} | ${metadata.website_path || '—'} | ${row.parent_project || '—'} | ${(row.updated_at || '').slice(0, 10) || '—'} |`,
    )
  }

  lines.push('')
  lines.push('## Notes')
  lines.push('')
  lines.push('- `act_project_code` should be the canonical cross-system code for new work.')
  lines.push('- `metadata.canonical_slug` is the most important bridge back into the wiki and website layers.')
  lines.push('- If a row is wrong here, fix the canonical identity upstream in the ACT project registry and wiki, then re-sync Supabase.')
  lines.push('')

  return `${lines.join('\n')}\n`
}

function renderSourceSummary(rows, basename) {
  const categoryCounts = countBy(rows, (row) => row.category)
  const entityTypeCounts = countBy(rows, (row) => row.metadata?.entity_type)
  const missingCanonicalSlug = rows.filter((row) => !row.metadata?.canonical_slug).length
  const summary =
    'Daily operational snapshot of Supabase project rows, used to keep canonical wiki identity, website sync, and system tagging aligned.'

  const lines = [
    '---',
    `title: "Source Summary — Supabase Projects Snapshot — ${todayIso()}"`,
    'status: Auto-maintained',
    `date: ${todayIso()}`,
    'type: source',
    'tags:',
    '  - source',
    '  - supabase',
    '  - projects',
    `raw_source: raw/${basename}.md`,
    'source_system: Supabase',
    'source_table: public.projects',
    `summary: "${yamlSafe(summary)}"`,
    '---',
    '',
    `# Source Summary — Supabase Projects Snapshot — ${todayIso()}`,
    '',
    '> Operational bridge from the live Supabase `projects` table back into Tractorpedia. This is how database state becomes visible to the Obsidian vault and the wiki graph.',
    '',
    '## What This Source Contains',
    '',
    `- ${rows.length} rows from \`public.projects\``,
    `- ${rows.length - missingCanonicalSlug} rows already carrying \`metadata.canonical_slug\``,
    `- ${missingCanonicalSlug} rows still missing canonical slug metadata`,
    ...renderCountBullets('Top categories', categoryCounts, 6),
    ...renderCountBullets('Top entity types', entityTypeCounts, 6),
    '',
    '## Why It Matters',
    '',
    '- It lets the wiki audit whether Supabase is mirroring canonical ACT project identity properly.',
    '- It keeps operational history visible to the same LLM knowledge loop that drives the website.',
    '- It supports project-code, website-path, and EL-key alignment without making Supabase the place where project meaning is invented.',
    '',
    '## Raw Source',
    '',
    `- [[../raw/${basename}|${basename}]]`,
    '',
    '## Connected Canonical Pages',
    '',
    '- [[act-knowledge-ops-loop|ACT Knowledge Ops Loop]]',
    '- [[living-website-operating-system|Living Website Operating System]]',
    '- [[project-identity-and-tagging-system|Project Identity & Tagging System]]',
    '- [[wiki-project-and-work-sync-contract|Wiki Project & Work Sync Contract]]',
    '',
    '## Backlinks',
    '',
    '- [[sources/index|Sources Index]]',
    '- [[tractorpedia|Tractorpedia]]',
    '- [[llm-knowledge-base|LLM Knowledge Base]]',
    '',
  ]

  return `${lines.join('\n')}\n`
}

async function main() {
  ensureDir(RAW_DIR)
  ensureDir(SOURCES_DIR)

  const rows = await fetchProjects()
  const basename = chooseSnapshotBasename()
  const rawPath = join(RAW_DIR, `${basename}.md`)
  const sourcePath = join(SOURCES_DIR, `${basename}.md`)

  const rawContent = renderRawSnapshot(rows, basename)
  const sourceContent = renderSourceSummary(rows, basename)
  if (dryRun) {
    console.log(`Would write raw snapshot: ${relative(ROOT, rawPath)}`)
    console.log(`Would write source summary: ${relative(ROOT, sourcePath)}`)
    console.log(`Would refresh sources index: ${relative(ROOT, SOURCES_INDEX)}`)
    console.log(`Row count: ${rows.length}`)
    return
  }

  writeFileSync(rawPath, rawContent, 'utf8')
  writeFileSync(sourcePath, sourceContent, 'utf8')
  writeSourcesIndex({ wikiRoot: WIKI_ROOT, sourcesIndexPath: SOURCES_INDEX })

  logWikiEvent(
    'snapshot-sync',
    `Supabase projects snapshot captured (${rows.length} rows)`,
    [
      `wiki/raw/${basename}.md`,
      `wiki/sources/${basename}.md`,
      'wiki/sources/index.md',
    ],
  )

  console.log(`✓ wrote ${relative(ROOT, rawPath)}`)
  console.log(`✓ wrote ${relative(ROOT, sourcePath)}`)
  console.log(`✓ refreshed ${relative(ROOT, SOURCES_INDEX)}`)
  console.log(`✓ logged snapshot-sync (${rows.length} rows)`)
}

main().catch((error) => {
  console.error('Supabase projects snapshot failed:', error.message)
  process.exit(1)
})
