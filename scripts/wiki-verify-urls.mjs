#!/usr/bin/env node
/**
 * wiki-verify-urls.mjs
 *
 * Audits every wiki project article against the canonical sources of truth:
 *   - GitHub repos in the Acurioustractor org (via `gh` CLI)
 *   - Vercel projects in Benjamin Knight's team (via Vercel REST API)
 *   - Live URL HEAD-check
 *
 * Output: wiki/decisions/url-audit-YYYY-MM-DD.md (human-readable)
 *         wiki/decisions/url-audit-latest.json   (machine-readable, consumed by viewer)
 *
 * Usage:
 *   node scripts/wiki-verify-urls.mjs            # full audit
 *   node scripts/wiki-verify-urls.mjs --quick    # skip HEAD checks
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import 'dotenv/config'
import { logWikiEvent } from './wiki-log.mjs'

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..')
const WIKI = path.join(ROOT, 'wiki')
const PROJECTS_DIR = path.join(WIKI, 'projects')
const OUT_DIR = path.join(WIKI, 'decisions')

const VERCEL_TEAM_ID = 'team_3aAWFPdRQ92RkkJ2LehJ209u' // Benjamin Knight's projects
const GITHUB_ORG = 'Acurioustractor'
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN

const QUICK = process.argv.includes('--quick')

// ---------------------------------------------------------------------------
// Manual canonical map — wiki slug -> { repo, vercelProject, customDomain }
// These override auto-matching when slugs disagree.
// ---------------------------------------------------------------------------
const CANONICAL = {
  'civicgraph': { repo: null, vercelProject: null, customDomain: 'https://civicgraph.app' },
  'empathy-ledger': { repo: 'empathy-ledger-v2', vercelProject: 'empathy-ledger-v2' },
  'justicehub': { repo: 'justicehub-platform', vercelProject: 'justicehub', customDomain: 'https://www.justicehub.com.au' },
  'goods-on-country': { repo: 'goods-asset-tracker', vercelProject: 'goods-on-country' },
  'the-harvest': { repo: 'theharvest', vercelProject: 'the-harvest' },
  'green-harvest-witta': { repo: 'theharvest', vercelProject: 'the-harvest' },
  'act-farm': { repo: 'act-farm', vercelProject: 'act-farm' },
  'act-public-voice': { repo: null, vercelProject: null, customDomain: 'https://act.place' },
  'act-studio': { repo: 'act-regenerative-studio', vercelProject: 'act-regenerative-studio', customDomain: null, knownIssue: 'build-failing: only 2 deployments ever attempted, both ERROR (Jan 2026); never had a successful production build' },
  'fishers-oysters': { repo: 'fishers-oysters', vercelProject: 'fishers-oysters' },
  'oonchiumpa': { repo: 'Oonchiumpa', vercelProject: 'oonchiumpa-app' },
  'campfire': { repo: 'Campfire-Website', vercelProject: 'campfire-website' },
  'mounty-yarns': { repo: 'mounty-yarns', vercelProject: null },
  'picc': { repo: 'palm-island-repository', vercelProject: 'palm-island-repository' },
  'picc-annual-report': { repo: 'palm-island-repository', vercelProject: 'palm-island-repository' },
  'picc-centre-precinct': { repo: 'picc-station-site-plan', vercelProject: null },
  'picc-elders-hull-river': { repo: 'palm-island-repository', vercelProject: 'palm-island-repository' },
  'picc-photo-kiosk': { repo: 'palm-island-repository', vercelProject: 'palm-island-repository' },
  'contained': { repo: 'contained-campaign-site', vercelProject: null },
  'diagrama': { repo: 'diagrama-australia', vercelProject: 'diagrama-australia', customDomain: null, knownIssue: 'domain-down: diagramaaustralia.org DNS unreachable; Vercel deployments are 401-protected, no public URL available' },
  'barkly-backbone': { repo: 'barkly-research-platform', vercelProject: 'barkly-research-platform', customDomain: null, knownIssue: 'build-failing: 20+ consecutive deployments in ERROR state since Feb 2026 (TypeScript build errors); never had a successful production deploy' },
  'cars-and-microcontrollers': { repo: null, vercelProject: null },
  'community-capital': { repo: null, vercelProject: null },
  'feel-good-project': { repo: null, vercelProject: null },
  'treacher': { repo: null, vercelProject: null },
  'the-caravan': { repo: null, vercelProject: null },
  'the-vagina': { repo: null, vercelProject: null },
  'the-confessional': { repo: null, vercelProject: null },
  'redtape': { repo: null, vercelProject: null },
  'gold-phone': { repo: null, vercelProject: null },
  'regional-arts-fellowship': { repo: null, vercelProject: null },
  'uncle-allan-palm-island-art': { repo: 'palm-island-repository', vercelProject: 'palm-island-repository' },
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------
function listProjectArticles() {
  return fs.readdirSync(PROJECTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => f.replace(/\.md$/, ''))
    .sort()
}

function fetchGithubRepos() {
  console.log(`→ Fetching GitHub repos in ${GITHUB_ORG}...`)
  const json = execSync(
    `gh repo list ${GITHUB_ORG} --limit 200 --json name,url,homepageUrl,description,isArchived,pushedAt`,
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  )
  return JSON.parse(json)
}

async function fetchVercelProjects() {
  if (!VERCEL_TOKEN) {
    console.warn('⚠ No VERCEL_TOKEN — Vercel deployment URLs will be skipped')
    return []
  }
  console.log('→ Fetching Vercel projects...')
  const all = []
  let next = null
  do {
    const url = new URL('https://api.vercel.com/v9/projects')
    url.searchParams.set('teamId', VERCEL_TEAM_ID)
    url.searchParams.set('limit', '100')
    if (next) url.searchParams.set('until', String(next))
    const res = await fetch(url, { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } })
    if (!res.ok) {
      console.warn(`⚠ Vercel API ${res.status} — ${await res.text()}`)
      break
    }
    const json = await res.json()
    all.push(...(json.projects || []))
    next = json.pagination?.next || null
  } while (next)
  console.log(`  loaded ${all.length} Vercel projects`)
  return all
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------
function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function findRepo(slug, override, repos) {
  if (override?.repo === null) return null // explicit "no repo"
  if (override?.repo) {
    return repos.find(r => r.name === override.repo) || null
  }
  const n = normalize(slug)
  return repos.find(r => normalize(r.name) === n)
      || repos.find(r => normalize(r.name).includes(n) || n.includes(normalize(r.name)))
      || null
}

function findVercelProject(slug, override, projects) {
  if (override?.vercelProject === null) return null
  if (override?.vercelProject) {
    return projects.find(p => p.name === override.vercelProject) || null
  }
  const n = normalize(slug)
  return projects.find(p => normalize(p.name) === n) || null
}

function vercelProjectURL(p) {
  if (!p) return null
  // Vercel API v9 returns `targets.production.alias` and `alias` arrays in newer responses.
  // Fall back to canonical *.vercel.app pattern.
  const aliases = p.targets?.production?.alias || p.alias || []
  const custom = aliases.find(a => typeof a === 'string' && !a.endsWith('.vercel.app'))
  if (custom) return `https://${custom}`
  const vercelAlias = aliases.find(a => typeof a === 'string' && a.endsWith('.vercel.app'))
  if (vercelAlias) return `https://${vercelAlias}`
  return `https://${p.name}.vercel.app`
}

// ---------------------------------------------------------------------------
// HEAD check
// ---------------------------------------------------------------------------
async function headCheck(url) {
  if (!url) return { ok: false, status: null, error: 'no-url' }
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    return { ok: res.ok, status: res.status }
  } catch (e) {
    // Some hosts reject HEAD — retry with GET
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      })
      return { ok: res.ok, status: res.status }
    } catch (e2) {
      return { ok: false, status: null, error: String(e2.message || e2).slice(0, 80) }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const slugs = listProjectArticles()
  const repos = fetchGithubRepos()
  const vercelProjects = await fetchVercelProjects()

  console.log(`\nAuditing ${slugs.length} wiki project articles...\n`)

  const results = []
  for (const slug of slugs) {
    const override = CANONICAL[slug]
    const repo = findRepo(slug, override, repos)
    const vp = findVercelProject(slug, override, vercelProjects)

    const customDomain = override?.customDomain || null
    const deployUrl = vercelProjectURL(vp)
    const repoHomepage = repo?.homepageUrl || null

    // Choose canonical URL: customDomain > repo homepageUrl > deployUrl
    // BUT: if a knownIssue is recorded (build-failing, domain-down, etc.), force null —
    // a stale .vercel.app fallback would falsely advertise a "live" URL.
    const canonicalUrl = override?.knownIssue
      ? null
      : (customDomain || repoHomepage || deployUrl || null)

    let live = { ok: null, status: null }
    if (!QUICK && canonicalUrl) {
      live = await headCheck(canonicalUrl)
    }

    results.push({
      slug,
      repo: repo ? { name: repo.name, url: repo.url, archived: repo.isArchived, pushedAt: repo.pushedAt } : null,
      vercelProject: vp ? { name: vp.name, id: vp.id } : null,
      canonicalUrl,
      live,
      knownIssue: override?.knownIssue || null,
      sources: {
        customDomain,
        repoHomepage,
        deployUrl,
      },
    })

    const badge = override?.knownIssue ? '⚠' : (live.ok === true ? '✓' : live.ok === false ? '✗' : '·')
    const repoTag = repo ? `[${repo.name}${repo.isArchived ? ' archived' : ''}]` : '[no-repo]'
    const vpTag = vp ? `(${vp.name})` : '(no-vercel)'
    const issueTag = override?.knownIssue ? `  ⚠ ${override.knownIssue.split(':')[0]}` : ''
    console.log(`  ${badge} ${slug.padEnd(32)} ${repoTag} ${vpTag}  ${canonicalUrl || '—'}${issueTag}`)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const today = new Date().toISOString().slice(0, 10)
  const jsonPath = path.join(OUT_DIR, 'url-audit-latest.json')
  fs.writeFileSync(jsonPath, JSON.stringify({ generated: today, results }, null, 2))

  // Markdown report
  const totalLive = results.filter(r => r.live?.ok === true).length
  const totalDead = results.filter(r => r.live?.ok === false && r.canonicalUrl).length
  const noUrl = results.filter(r => !r.canonicalUrl).length
  const noRepo = results.filter(r => !r.repo).length

  const md = `---
title: URL Audit ${today}
status: Auto-generated
cluster: decisions
---

# URL Audit — ${today}

> Generated by \`scripts/wiki-verify-urls.mjs\`. Cross-references every wiki project article against the canonical \`${GITHUB_ORG}\` GitHub org and Benjamin Knight's Vercel team.

## Summary

| Metric | Count |
|---|---|
| Total project articles | ${results.length} |
| Live URL (HTTP 2xx) | ${totalLive} |
| Dead URL (4xx/5xx/timeout) | ${totalDead} |
| No URL configured | ${noUrl} |
| No GitHub repo matched | ${noRepo} |

## Article Audit

| Article | GitHub Repo | Vercel Project | Canonical URL | Live |
|---|---|---|---|---|
${results.map(r => {
  const repoCell = r.repo ? `[${r.repo.name}](${r.repo.url})${r.repo.archived ? ' _(archived)_' : ''}` : '—'
  const vpCell = r.vercelProject ? `\`${r.vercelProject.name}\`` : '—'
  const urlCell = r.canonicalUrl ? `[link](${r.canonicalUrl})` : '—'
  const liveCell = r.live?.ok === true ? `✓ ${r.live.status}` : r.live?.ok === false ? `✗ ${r.live.status || r.live.error || 'fail'}` : '·'
  return `| [[${r.slug}]] | ${repoCell} | ${vpCell} | ${urlCell} | ${liveCell} |`
}).join('\n')}

## Articles missing a repo

${results.filter(r => !r.repo).map(r => `- [[${r.slug}]]`).join('\n') || '_(none)_'}

## Articles with dead URLs

${results.filter(r => r.live?.ok === false && r.canonicalUrl).map(r => `- [[${r.slug}]] → ${r.canonicalUrl} (${r.live.status || r.live.error})`).join('\n') || '_(none)_'}

---

_To consume this audit programmatically, read \`url-audit-latest.json\` in this directory. The wiki viewer (\`tools/act-wikipedia.html\`) reads it via the regen script (\`scripts/wiki-build-viewer.mjs\`) to render the Website / Repo / Deploy badges in each project infobox._
`

  const mdPath = path.join(OUT_DIR, `url-audit-${today}.md`)
  fs.writeFileSync(mdPath, md)

  console.log(`\n✓ Audit complete`)
  console.log(`  Live: ${totalLive}  Dead: ${totalDead}  No-URL: ${noUrl}  No-repo: ${noRepo}`)
  console.log(`  → ${path.relative(ROOT, mdPath)}`)
  console.log(`  → ${path.relative(ROOT, jsonPath)}`)

  // Append to wiki activity log
  try {
    const flagged = results.filter(r => r.knownIssue).length
    logWikiEvent(
      'url-audit',
      `${totalLive} live · ${totalDead} dead · ${flagged} known-issue · ${noUrl} no-URL · ${noRepo} no-repo`,
      [path.relative(ROOT, mdPath), path.relative(ROOT, jsonPath)],
    )
  } catch (e) {
    console.warn('  ⚠ wiki-log append failed:', e.message)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
