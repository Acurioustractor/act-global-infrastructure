#!/usr/bin/env node
/**
 * One-shot inventory scanner for the finance surface across the ACT command-center.
 *
 * Outputs a markdown matrix of:
 *   - React routes under apps/command-center/src/app/finance/
 *   - API endpoints under apps/command-center/src/app/api/finance/
 *   - Finance-related scripts in scripts/
 *   - PM2 crons in ecosystem.config.cjs that touch finance/money/xero/dext/notion
 *   - Wiki finance docs under wiki/finance/
 *
 * For each item: last git edit date, size (LOC), nav presence (routes only), purpose snippet.
 *
 * Usage: node scripts/inventory-finance-surface.mjs > thoughts/shared/handoffs/2026-05-16-money-audit/inventory.md
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(__dirname, '..')

const NAV_FILE = path.join(REPO, 'apps/command-center/src/lib/nav-data.ts')
const ROUTES_DIR = path.join(REPO, 'apps/command-center/src/app/finance')
const API_DIR = path.join(REPO, 'apps/command-center/src/app/api/finance')
const SCRIPTS_DIR = path.join(REPO, 'scripts')
const WIKI_FINANCE_DIR = path.join(REPO, 'wiki/finance')
const ECOSYSTEM = path.join(REPO, 'ecosystem.config.cjs')

const navText = readFileSync(NAV_FILE, 'utf8')
const ecosystemText = readFileSync(ECOSYSTEM, 'utf8')

function gitLastEdit(filePath) {
  try {
    const rel = path.relative(REPO, filePath)
    const out = execSync(`git log -1 --format=%ar -- "${rel}"`, {
      cwd: REPO,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return out || 'untracked'
  } catch {
    return '?'
  }
}

function loc(filePath) {
  try {
    return readFileSync(filePath, 'utf8').split('\n').length
  } catch {
    return 0
  }
}

function firstHeader(filePath, maxLines = 20) {
  try {
    const lines = readFileSync(filePath, 'utf8').split('\n').slice(0, maxLines)
    const comment = lines
      .map(l => l.replace(/^[\s/*#]+/, '').trim())
      .filter(l => l && !l.match(/^@?(typescript|ts-|eslint|prettier|use client)/i))
      .find(l => l.length > 20 && l.length < 200)
    return comment || ''
  } catch {
    return ''
  }
}

function listDirs(parent) {
  try {
    return readdirSync(parent, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
      .map(d => d.name)
      .sort()
  } catch {
    return []
  }
}

function listArchive(parent) {
  try {
    return readdirSync(parent, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.startsWith('_'))
      .map(d => d.name)
  } catch {
    return []
  }
}

// ── 1. ROUTES ──────────────────────────────────────────────────────────
const routeDirs = listDirs(ROUTES_DIR)
const archivedRoutes = listArchive(ROUTES_DIR)

const routeRows = routeDirs.map(name => {
  const pageFile = path.join(ROUTES_DIR, name, 'page.tsx')
  const exists = (() => {
    try { statSync(pageFile); return true } catch { return false }
  })()
  if (!exists) {
    // dynamic route, find page.tsx anywhere
    const subDir = path.join(ROUTES_DIR, name)
    const findPage = (dir) => {
      try {
        const entries = readdirSync(dir, { withFileTypes: true })
        for (const e of entries) {
          if (e.isDirectory()) {
            const found = findPage(path.join(dir, e.name))
            if (found) return found
          } else if (e.name === 'page.tsx') {
            return path.join(dir, e.name)
          }
        }
      } catch {}
      return null
    }
    const found = findPage(subDir)
    if (!found) return null
    return {
      route: `/finance/${name}`,
      file: path.relative(REPO, found),
      loc: loc(found),
      lastEdit: gitLastEdit(found),
      inNav: navText.includes(`/finance/${name}`),
      purpose: firstHeader(found),
    }
  }
  return {
    route: `/finance/${name}`,
    file: path.relative(REPO, pageFile),
    loc: loc(pageFile),
    lastEdit: gitLastEdit(pageFile),
    inNav: navText.includes(`/finance/${name}`),
    purpose: firstHeader(pageFile),
  }
}).filter(Boolean)

// also include /finance root
try {
  const rootPage = path.join(ROUTES_DIR, 'page.tsx')
  statSync(rootPage)
  routeRows.unshift({
    route: '/finance',
    file: path.relative(REPO, rootPage),
    loc: loc(rootPage),
    lastEdit: gitLastEdit(rootPage),
    inNav: true,
    purpose: firstHeader(rootPage),
  })
} catch {}

// ── 2. API ENDPOINTS ───────────────────────────────────────────────────
const apiDirs = listDirs(API_DIR)

const apiRows = apiDirs.map(name => {
  const routeFile = path.join(API_DIR, name, 'route.ts')
  let target = routeFile
  try { statSync(routeFile) } catch {
    // try nested
    const subDir = path.join(API_DIR, name)
    const findRoute = (dir) => {
      try {
        const entries = readdirSync(dir, { withFileTypes: true })
        for (const e of entries) {
          if (e.isDirectory()) {
            const found = findRoute(path.join(dir, e.name))
            if (found) return found
          } else if (e.name === 'route.ts') {
            return path.join(dir, e.name)
          }
        }
      } catch {}
      return null
    }
    target = findRoute(subDir) || routeFile
  }
  return {
    api: `/api/finance/${name}`,
    file: path.relative(REPO, target),
    loc: loc(target),
    lastEdit: gitLastEdit(target),
    purpose: firstHeader(target),
  }
})

// ── 3. SCRIPTS ─────────────────────────────────────────────────────────
const FINANCE_SCRIPT_PATTERNS = [
  /^audit-/,
  /^align-/,
  /^tag-/,
  /^auto-tag-/,
  /^match-/,
  /^compute-project/,
  /^sync-(xero|finance|money|opportunities|budget|cash|kpis|pile|planning|grants|daily-pulse|weekly|dashboard-hub)/,
  /^(import|generate)-dext/,
  /^(capture|approve|analyze|build|backfill|find|refresh|upload)-(receipts?|safe|bank|xero|el-act)/,
  /xero/,
  /receipt/,
  /(money|finance|dext|grant|funder)/,
]

function isFinanceScript(name) {
  if (!name.endsWith('.mjs') && !name.endsWith('.sh')) return false
  return FINANCE_SCRIPT_PATTERNS.some(p => p.test(name))
}

const scriptFiles = readdirSync(SCRIPTS_DIR, { withFileTypes: true })
  .filter(d => d.isFile() && isFinanceScript(d.name))
  .map(d => d.name)
  .sort()

const scriptRows = scriptFiles.map(name => {
  const fp = path.join(SCRIPTS_DIR, name)
  return {
    script: name,
    loc: loc(fp),
    lastEdit: gitLastEdit(fp),
    inCron: ecosystemText.includes(`scripts/${name}`),
    purpose: firstHeader(fp, 30),
  }
})

// ── 4. CRONS ───────────────────────────────────────────────────────────
const cronBlocks = [...ecosystemText.matchAll(/\{[^{}]*?name:\s*'([^']+)'[^{}]*?script:\s*'([^']+)'[^{}]*?\}/gs)]
const FINANCE_CRON_KEYWORDS = /(xero|receipt|finance|money|dext|pile|cash|kpis|budget|reconcil|grant|funder|daily-pulse|opportunit|dashboard-hub|planning-rhythm|weekly)/i
const cronRows = cronBlocks
  .map(m => ({ name: m[1], script: m[2] }))
  .filter(c => FINANCE_CRON_KEYWORDS.test(c.name) || FINANCE_CRON_KEYWORDS.test(c.script))

// ── 5. WIKI FINANCE DOCS ───────────────────────────────────────────────
let wikiFiles = []
try {
  wikiFiles = readdirSync(WIKI_FINANCE_DIR, { withFileTypes: true })
    .filter(d => d.isFile() && d.name.endsWith('.md'))
    .map(d => d.name)
    .sort()
} catch {}

const wikiRows = wikiFiles.map(name => {
  const fp = path.join(WIKI_FINANCE_DIR, name)
  return {
    doc: `wiki/finance/${name}`,
    loc: loc(fp),
    lastEdit: gitLastEdit(fp),
  }
})

// ── RENDER ─────────────────────────────────────────────────────────────
const now = new Date().toISOString().split('T')[0]
const out = []

out.push(`# Finance Surface Inventory — ${now}`)
out.push(``)
out.push(`Generated by \`scripts/inventory-finance-surface.mjs\`. Use as Pass-A artifact for the 2026-05-16 money audit.`)
out.push(``)
out.push(`## Totals`)
out.push(``)
out.push(`- React routes: **${routeRows.length}** active (${archivedRoutes.length} archived dir(s) under \`_archived/\`)`)
out.push(`- API endpoints: **${apiRows.length}**`)
out.push(`- Finance scripts: **${scriptRows.length}**`)
out.push(`- Cron entries touching finance: **${cronRows.length}**`)
out.push(`- Wiki finance docs: **${wikiRows.length}**`)
out.push(``)

out.push(`## 1. React routes (\`/finance/*\`)`)
out.push(``)
out.push(`| Route | LOC | Last edit | In nav | File |`)
out.push(`|---|---:|---|:-:|---|`)
for (const r of routeRows) {
  out.push(`| \`${r.route}\` | ${r.loc} | ${r.lastEdit} | ${r.inNav ? '✓' : ' '} | \`${r.file}\` |`)
}
out.push(``)

out.push(`## 2. API endpoints (\`/api/finance/*\`)`)
out.push(``)
out.push(`| Endpoint | LOC | Last edit | File |`)
out.push(`|---|---:|---|---|`)
for (const a of apiRows) {
  out.push(`| \`${a.api}\` | ${a.loc} | ${a.lastEdit} | \`${a.file}\` |`)
}
out.push(``)

out.push(`## 3. Finance scripts`)
out.push(``)
out.push(`| Script | LOC | Last edit | In cron |`)
out.push(`|---|---:|---|:-:|`)
for (const s of scriptRows) {
  out.push(`| \`scripts/${s.script}\` | ${s.loc} | ${s.lastEdit} | ${s.inCron ? '✓' : ' '} |`)
}
out.push(``)

out.push(`## 4. Cron jobs (finance-touching)`)
out.push(``)
out.push(`| PM2 name | Script |`)
out.push(`|---|---|`)
for (const c of cronRows) {
  out.push(`| \`${c.name}\` | \`${c.script}\` |`)
}
out.push(``)

out.push(`## 5. Wiki finance docs`)
out.push(``)
out.push(`| Doc | LOC | Last edit |`)
out.push(`|---|---:|---|`)
for (const w of wikiRows) {
  out.push(`| \`${w.doc}\` | ${w.loc} | ${w.lastEdit} |`)
}
out.push(``)

out.push(`## API → UI consumer cross-check`)
out.push(``)
out.push(`Heuristic: for each API endpoint, grep the entire \`apps/command-center/src/\` tree for the route path. Endpoints with zero matches outside the API file itself are candidates for archive.`)
out.push(``)
out.push(`| Endpoint | Caller count (outside api/) | Likely consumer route(s) |`)
out.push(`|---|---:|---|`)

const APP_SRC = path.join(REPO, 'apps/command-center/src')
for (const a of apiRows) {
  const apiPath = a.api
  let count = 0
  let consumers = []
  try {
    const out = execSync(
      `grep -rl --include='*.tsx' --include='*.ts' "${apiPath}" "${APP_SRC}" 2>/dev/null | grep -v "/api/" | head -10`,
      { encoding: 'utf8' }
    ).trim()
    if (out) {
      consumers = out.split('\n').map(p => path.relative(REPO, p))
      count = consumers.length
    }
  } catch {}
  out.push(`| \`${apiPath}\` | ${count} | ${consumers.slice(0, 3).join('<br>') || '_(orphan?)_'} |`)
}

console.log(out.join('\n'))
