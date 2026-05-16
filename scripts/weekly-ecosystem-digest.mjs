#!/usr/bin/env node
/**
 * ACT ecosystem weekly digest — what shipped across all ACT repos in the
 * last N days, grouped by `Plan: <slug>` commit trailer.
 *
 * Companion to scripts/weekly-reconciliation.mjs (which is finance-focused).
 * This one is code/plan-focused: it answers "what plans moved this week
 * across the ecosystem, and where".
 *
 * Sources:
 *   - Repo list mirrors scripts/sync-act-context.mjs TARGET_REPOS + this repo
 *   - Plan-trailer parser ported from scripts/generate-ceo-cockpit.mjs
 *   - Valid plan slugs derived from thoughts/shared/plans/*.md in THIS repo
 *     (canonical plan store)
 *
 * Output: thoughts/shared/digests/ecosystem-YYYY-MM-DD.md
 *
 * Optional Notion push (Tier 2): --notion pushes to the page resolved via
 *   1. NOTION_PAGE_ECOSYSTEM_DIGEST env var
 *   2. config/notion-database-ids.json -> ecosystemDigest
 *
 * Usage:
 *   node scripts/weekly-ecosystem-digest.mjs                    # write markdown
 *   node scripts/weekly-ecosystem-digest.mjs --days 14          # 14-day window
 *   node scripts/weekly-ecosystem-digest.mjs --dry-run          # stdout only
 *   node scripts/weekly-ecosystem-digest.mjs --notion           # also push
 *   node scripts/weekly-ecosystem-digest.mjs --notion --dry-run # preview push
 */
import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = join(__dirname, '..')

await import(join(__dirname, 'lib/load-env.mjs'))

// ── Args ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const DAYS = (() => {
  const i = args.indexOf('--days')
  if (i < 0) return 7
  const n = parseInt(args[i + 1], 10)
  return Number.isFinite(n) && n > 0 ? n : 7
})()
const DRY_RUN = args.includes('--dry-run')
const PUSH_NOTION = args.includes('--notion')

// ── Repo set ─────────────────────────────────────────────────────────

// Canonical list mirrors sync-act-context.mjs TARGET_REPOS plus this repo.
// Edit there → edit here (kept in sync manually; not load-bearing enough
// to warrant extracting a shared module yet).
const ACT_REPOS = [
  REPO_ROOT,
  '/Users/benknight/Code/act-regenerative-studio',
  '/Users/benknight/Code/empathy-ledger-v2',
  '/Users/benknight/Code/JusticeHub',
  '/Users/benknight/Code/goods',
  '/Users/benknight/Code/grantscope',
  '/Users/benknight/Code/Palm Island Reposistory',
  '/Users/benknight/Code/act-farm',
  '/Users/benknight/Code/The Harvest Website',
]

const log = (m) => console.error(`[ecosystem-digest] ${m}`)

// ── Plan slug validation ─────────────────────────────────────────────

function loadValidPlanSlugs() {
  const plansDir = join(REPO_ROOT, 'thoughts/shared/plans')
  const slugs = new Set()
  try {
    for (const f of readdirSync(plansDir)) {
      if (f.endsWith('.md') && !f.startsWith('.')) {
        slugs.add(f.replace(/\.md$/, ''))
      }
    }
  } catch {
    // dir missing → no validation (allow any slug)
  }
  return slugs
}

// ── Git scraping per repo ────────────────────────────────────────────

const PLAN_RE = /Plan:\s*(?:thoughts\/shared\/plans\/)?([a-z0-9_-]+)(?:\.md)?/i
const SEP = '---END---COMMIT---'

function isGitRepo(path) {
  if (!existsSync(path)) return false
  try {
    return statSync(join(path, '.git')).isDirectory() || statSync(join(path, '.git')).isFile()
  } catch {
    return false
  }
}

function currentBranch(cwd) {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf8' }).trim()
  } catch {
    return '?'
  }
}

function getFilesPerCommit(repoPath, sinceDays) {
  // One git call returns hash + changed file list, parsed via __COMMIT__ marker.
  // Cheaper than N `git show` calls. Map keyed by short hash (matches %h).
  const map = {}
  try {
    const out = execSync(
      `git log --since="${sinceDays} days ago" --name-only --format="__COMMIT__%h"`,
      { cwd: repoPath, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
    )
    let current = null
    for (const line of out.split('\n')) {
      if (line.startsWith('__COMMIT__')) {
        current = line.slice('__COMMIT__'.length).trim()
        if (current) map[current] = []
      } else if (current && line.trim()) {
        map[current].push(line.trim())
      }
    }
  } catch {
    // Best-effort. If files-per-commit fails, downstream area-grouping
    // just shows nothing — does not block the rest of the digest.
  }
  return map
}

function scrapeRepo(repoPath, sinceDays, validSlugs) {
  const repoName = basename(repoPath)
  const result = {
    repoPath,
    repoName,
    branch: '?',
    available: false,
    commits: [], // { hash, subject, dateIso, planSlug | null, files: [] }
    error: null,
  }

  if (!isGitRepo(repoPath)) {
    result.error = 'not a git repo / missing'
    return result
  }
  result.available = true
  result.branch = currentBranch(repoPath)

  const filesMap = getFilesPerCommit(repoPath, sinceDays)

  try {
    // %h hash · %s subject · %ai author date · %b body
    const out = execSync(
      `git log --since="${sinceDays} days ago" --format="%h|%s|%ai%n%b%n${SEP}"`,
      { cwd: repoPath, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
    )
    for (const block of out.split(SEP)) {
      const text = block.trim()
      if (!text) continue
      const firstNewline = text.indexOf('\n')
      const header = firstNewline > 0 ? text.slice(0, firstNewline) : text
      const body = firstNewline > 0 ? text.slice(firstNewline + 1) : ''
      const [hash, subject = '', dateIso = ''] = header.split('|')
      const planMatch = (body + ' ' + subject).match(PLAN_RE)
      let planSlug = null
      if (planMatch) {
        const slug = planMatch[1]
        if (validSlugs.size === 0 || validSlugs.has(slug)) {
          planSlug = slug
        }
      }
      result.commits.push({
        hash,
        subject,
        dateIso: dateIso.split(' ')[0] || '',
        planSlug,
        files: filesMap[hash] || [],
      })
    }
  } catch (e) {
    result.error = e.message.split('\n')[0]
  }

  return result
}

// ── Area mapping (file path → human area) ────────────────────────────

// Order matters: first match wins. Tuned for the ACT ecosystem repos.
// Add rules as new dirs become hot. If a path doesn't match anything,
// it falls through to "Other" — which is the signal to add a rule.
const AREA_RULES = [
  [/^apps\/command-center\/src\/app\/finance\//, 'Command Center · Finance'],
  [/^apps\/command-center\/src\/app\/api\//, 'Command Center · API'],
  [/^apps\/command-center\/src\/app\//, 'Command Center · UI'],
  [/^apps\/command-center\/src\//, 'Command Center · Lib'],
  [/^apps\/command-center\//, 'Command Center'],
  [/^apps\/website\//, 'Website'],
  [/^apps\//, 'Apps · Other'],
  [/^packages\//, 'Packages'],
  [/^scripts\/sync-.*-to-notion/, 'Notion Syncs'],
  [/^scripts\/(sync|notion)-/, 'Notion Syncs'],
  [/^scripts\/weekly-/, 'Weekly Crons'],
  [/^scripts\/lib\//, 'Scripts · Lib'],
  [/^scripts\//, 'Scripts'],
  [/^wiki\/projects\//, 'Wiki · Projects'],
  [/^wiki\/decisions\//, 'Wiki · Decisions'],
  [/^wiki\/finance\//, 'Wiki · Finance'],
  [/^wiki\//, 'Wiki'],
  [/^thoughts\/shared\/plans\//, 'Plans'],
  [/^thoughts\/shared\/handoffs\//, 'Handoffs'],
  [/^thoughts\/shared\/rd-pack/, 'R&D Pack'],
  [/^thoughts\/shared\/digests\//, 'Digests'],
  [/^thoughts\//, 'Thoughts'],
  [/^supabase\/migrations\//, 'DB Migrations'],
  [/^supabase\//, 'Supabase'],
  [/^config\//, 'Config'],
  [/^\.claude\/skills\//, 'Skills'],
  [/^\.claude\//, 'Claude Config'],
  [/^\.githooks\//, 'Git Hooks'],
  [/^\.github\//, 'CI/CD'],
  [/^docs\//, 'Docs'],
  [/^public\//, 'Public Assets'],
]

function mapFileToArea(filepath) {
  for (const [re, area] of AREA_RULES) {
    if (re.test(filepath)) return area
  }
  return 'Other'
}

// ── Aggregate ────────────────────────────────────────────────────────

function buildAggregate(repoResults) {
  const byPlan = {} // slug -> [{ repoName, hash, subject, dateIso }]
  // Area-level rollup of UNSCOPED commits (the ones without `Plan:`).
  // Counts both commits-that-touched-area (Set) and file-touches (int) so
  // we surface intensity even when a single commit edits many files.
  const byArea = {} // area -> { commits: Set, fileTouches: number, repos: Set }
  let totalCommits = 0
  let unscopedCount = 0

  for (const r of repoResults) {
    for (const c of r.commits) {
      totalCommits++
      if (c.planSlug) {
        if (!byPlan[c.planSlug]) byPlan[c.planSlug] = []
        byPlan[c.planSlug].push({
          repoName: r.repoName,
          hash: c.hash,
          subject: c.subject,
          dateIso: c.dateIso,
        })
      } else {
        unscopedCount++
        // Drop unscoped commit's files into area buckets. Merge commits
        // and empty diffs simply contribute nothing — fine.
        for (const file of c.files || []) {
          const area = mapFileToArea(file)
          if (!byArea[area]) {
            byArea[area] = { commits: new Set(), fileTouches: 0, repos: new Set() }
          }
          byArea[area].commits.add(`${r.repoName}:${c.hash}`)
          byArea[area].fileTouches++
          byArea[area].repos.add(r.repoName)
        }
      }
    }
  }

  return {
    totalCommits,
    unscopedCount,
    byPlan,
    byArea,
    reposScanned: repoResults.filter((r) => r.available).length,
    reposMissing: repoResults.filter((r) => !r.available).map((r) => ({ name: r.repoName, error: r.error })),
  }
}

// ── Render markdown ──────────────────────────────────────────────────

function renderMarkdown({ todayStr, days, repoResults, agg }) {
  const sinceDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toLocaleDateString('en-CA', { timeZone: 'Australia/Brisbane' })
  })()

  const planEntries = Object.entries(agg.byPlan).sort((a, b) => b[1].length - a[1].length)

  const perRepoRows = repoResults
    .filter((r) => r.available)
    .map((r) => {
      const planSet = new Set(r.commits.map((c) => c.planSlug).filter(Boolean))
      return `| ${r.repoName} | ${r.branch} | ${r.commits.length} | ${planSet.size} |`
    })

  const unscopedByRepo = {}
  for (const r of repoResults) {
    const unscoped = r.commits.filter((c) => !c.planSlug)
    if (unscoped.length > 0) unscopedByRepo[r.repoName] = unscoped
  }

  return `---
title: ACT Ecosystem Digest — ${todayStr}
window: ${days} days (${sinceDate} → ${todayStr})
repos_scanned: ${agg.reposScanned}
total_commits: ${agg.totalCommits}
plans_advanced: ${Object.keys(agg.byPlan).length}
unscoped_commits: ${agg.unscopedCount}
generated: ${new Date().toISOString()}
---

# ACT Ecosystem — Week of ${todayStr}

> **${agg.totalCommits} commits** across **${agg.reposScanned} repos** · **${Object.keys(agg.byPlan).length} plans advanced** · **${agg.unscopedCount} commits** without \`Plan:\` trailer

${agg.reposMissing.length > 0
  ? `_Skipped repos (not on disk / not git):_ ${agg.reposMissing.map((m) => `\`${m.name}\``).join(', ')}\n`
  : ''}

## 🎯 Plans advanced (last ${days} days)

${planEntries.length === 0
  ? '_No commits with `Plan: <slug>` trailers in the window. Add `Plan: <slug>` to commit bodies (slug must match a file in `thoughts/shared/plans/`) to track plan movement._'
  : planEntries
      .map(([slug, list]) => {
        const byRepo = {}
        for (const c of list) {
          if (!byRepo[c.repoName]) byRepo[c.repoName] = []
          byRepo[c.repoName].push(c)
        }
        const repoBlocks = Object.entries(byRepo)
          .map(([repo, commits]) =>
            `- **${repo}**\n` +
            commits.map((c) => `  - \`${c.hash}\` ${c.subject} _(${c.dateIso})_`).join('\n')
          )
          .join('\n')
        return `### \`${slug}\` — ${list.length} commit${list.length === 1 ? '' : 's'}\n[plan](../plans/${slug}.md)\n\n${repoBlocks}`
      })
      .join('\n\n')}

## 📦 Per-repo activity

| Repo | Branch | Commits | Plans touched |
|---|---|---:|---:|
${perRepoRows.join('\n') || '| _no active repos_ | | | |'}

## 🔥 Where work happened (unscoped — last ${days} days)

${(() => {
  const areas = Object.entries(agg.byArea)
    .map(([area, v]) => ({ area, commits: v.commits.size, fileTouches: v.fileTouches, repos: Array.from(v.repos) }))
    .sort((a, b) => b.fileTouches - a.fileTouches)
  if (areas.length === 0) return '_No file-touches recorded — either every commit had a `Plan:` trailer (good) or git could not enumerate files (check log)._'
  const top = areas.slice(0, 15)
  const maxTouches = top[0].fileTouches
  const rows = top.map(({ area, commits, fileTouches, repos }) => {
    const barLen = Math.max(1, Math.round((fileTouches / maxTouches) * 20))
    const bar = '█'.repeat(barLen) + '░'.repeat(20 - barLen)
    return `| ${area} | \`${bar}\` | ${fileTouches} | ${commits} | ${repos.slice(0, 3).join(', ')}${repos.length > 3 ? ` +${repos.length - 3}` : ''} |`
  })
  const remaining = areas.length - top.length
  return `Top ${top.length} areas by file-touches across commits without a \`Plan:\` trailer. Tells you where work landed even when the trailer is missing. Add rules in \`AREA_RULES\` (\`scripts/weekly-ecosystem-digest.mjs\`) when "Other" gets large.

| Area | Intensity | File touches | Commits | Repos |
|---|---|---:|---:|---|
${rows.join('\n')}${remaining > 0 ? `\n\n_…and ${remaining} more area${remaining === 1 ? '' : 's'} below the top 15._` : ''}`
})()}

## 📝 Commits without \`Plan:\` trailer

${Object.keys(unscopedByRepo).length === 0
  ? '_All commits in window have plan trailers. Good hygiene._'
  : Object.entries(unscopedByRepo)
      .map(([repo, list]) =>
        `### ${repo}\n` +
        list.map((c) => `- \`${c.hash}\` ${c.subject} _(${c.dateIso})_`).join('\n')
      )
      .join('\n\n')}

---

_Generated by \`scripts/weekly-ecosystem-digest.mjs\`. Window: ${sinceDate} → ${todayStr}. Plan slugs validated against \`thoughts/shared/plans/\` in this repo._
`
}

// ── Notion push ──────────────────────────────────────────────────────

async function pushToNotion(markdown) {
  const CONFIG_PATH = join(REPO_ROOT, 'config/notion-database-ids.json')

  let pageId = process.env.NOTION_PAGE_ECOSYSTEM_DIGEST || null
  if (!pageId && existsSync(CONFIG_PATH)) {
    try {
      const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
      if (cfg.ecosystemDigest) pageId = cfg.ecosystemDigest
    } catch {}
  }

  if (!pageId) {
    log('SKIP notion push: no NOTION_PAGE_ECOSYSTEM_DIGEST env or cfg.ecosystemDigest in config/notion-database-ids.json')
    return { pushed: false, reason: 'no page id' }
  }
  if (!process.env.NOTION_TOKEN) {
    log('SKIP notion push: NOTION_TOKEN not set')
    return { pushed: false, reason: 'no token' }
  }

  const { Client } = await import('@notionhq/client')
  const { markdownToBlocks, clearPage, appendBlocks } = await import('./lib/notion-md-blocks.mjs')

  const blocks = markdownToBlocks(markdown)
  log(`parsed ${blocks.length} notion blocks`)

  if (DRY_RUN) {
    const types = blocks.reduce((acc, b) => ((acc[b.type] = (acc[b.type] || 0) + 1), acc), {})
    log(`DRY-RUN target page id: ${pageId}`)
    for (const [t, n] of Object.entries(types)) log(`  ${t}: ${n}`)
    return { pushed: false, reason: 'dry-run' }
  }

  const notion = new Client({ auth: process.env.NOTION_TOKEN })
  log(`clearing existing body of ${pageId}`)
  await clearPage(notion, pageId)
  log(`appending ${blocks.length} blocks`)
  await appendBlocks(notion, pageId, blocks)
  log('notion push done')
  return { pushed: true, pageId }
}

// ── Main ─────────────────────────────────────────────────────────────

function brisbaneToday() {
  // en-CA format gives YYYY-MM-DD which is the only locale that does
  // ISO-shape dates predictably.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Brisbane' })
}

async function main() {
  const todayStr = brisbaneToday()
  const validSlugs = loadValidPlanSlugs()
  log(`window: ${DAYS} days · valid plan slugs: ${validSlugs.size}`)

  const repoResults = []
  for (const path of ACT_REPOS) {
    const r = scrapeRepo(path, DAYS, validSlugs)
    log(`  ${r.repoName.padEnd(28)} ${r.available ? `${String(r.commits.length).padStart(3)} commits @ ${r.branch}` : `SKIP (${r.error})`}`)
    repoResults.push(r)
  }

  const agg = buildAggregate(repoResults)
  const markdown = renderMarkdown({ todayStr, days: DAYS, repoResults, agg })

  const outDir = join(REPO_ROOT, 'thoughts/shared/digests')
  const outPath = join(outDir, `ecosystem-${todayStr}.md`)

  if (DRY_RUN && !PUSH_NOTION) {
    process.stdout.write(markdown)
    log(`(dry-run) would write ${outPath}`)
    return
  }

  if (!DRY_RUN) {
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
    writeFileSync(outPath, markdown)
    log(`wrote ${outPath.replace(REPO_ROOT + '/', '')}`)
  }

  if (PUSH_NOTION) {
    await pushToNotion(markdown)
  }
}

main().catch((err) => {
  console.error('[ecosystem-digest] fatal:', err)
  process.exit(1)
})
