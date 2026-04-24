#!/usr/bin/env node
/**
 * ACT Alignment Loop — Q2 project truth-state synthesis
 *
 * For each project code in config/project-codes.json, scores presence across
 * four sources (wiki × DB × codebase × Xero) and writes a synthesis artefact
 * to wiki/synthesis/project-truth-state-YYYY-MM-DD.md.
 *
 * Phase-1 automation of the manual pass Ben ran on 2026-04-24.
 * Plan: thoughts/shared/plans/act-alignment-loop.md
 * Baseline: wiki/synthesis/project-truth-state-2026-04-24.md
 *
 * Usage:
 *   node scripts/synthesize-project-truth-state.mjs              # write dated file
 *   node scripts/synthesize-project-truth-state.mjs --dry-run    # print to stdout
 *   node scripts/synthesize-project-truth-state.mjs --date 2026-05-08  # force date
 */
import './lib/load-env.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { join } from 'node:path'

const REPO_ROOT = process.cwd()
const CONFIG_PATH = join(REPO_ROOT, 'config/project-codes.json')
const WIKI_PROJECTS_ROOT = join(REPO_ROOT, 'wiki/projects')
const SYNTHESIS_DIR = join(REPO_ROOT, 'wiki/synthesis')
const CODE_REFS_THRESHOLD = 3
const GREP_PATHS = ['apps/', 'scripts/', 'config/']

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')
const DATE_FLAG = argv.indexOf('--date')
const DATE = DATE_FLAG >= 0 ? argv[DATE_FLAG + 1] : new Date().toISOString().slice(0, 10)

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SHARED_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

async function groupCountByProjectCode(table) {
  const out = {}
  let from = 0
  const page = 1000
  while (true) {
    const { data, error } = await sb.from(table).select('project_code').not('project_code', 'is', null).range(from, from + page - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data || data.length === 0) break
    for (const r of data) out[r.project_code] = (out[r.project_code] || 0) + 1
    if (data.length < page) break
    from += page
  }
  return out
}

async function distinctProjectCodes() {
  const set = new Set()
  const { data: p } = await sb.from('projects').select('act_project_code, code')
  for (const r of p || []) {
    if (r.act_project_code) set.add(r.act_project_code)
    else if (r.code && r.code.startsWith('ACT-')) set.add(r.code)
  }
  const { data: op } = await sb.from('org_projects').select('code')
  for (const r of op || []) if (r.code && r.code.startsWith('ACT-')) set.add(r.code)
  return set
}

async function storytellerCodes() {
  // project_storytellers.project_id → projects.act_project_code
  const set = new Set()
  const { data } = await sb.from('project_storytellers').select('projects(act_project_code)').limit(5000)
  for (const r of data || []) {
    const code = r?.projects?.act_project_code
    if (code) set.add(code)
  }
  return set
}

function walkWikiFiles() {
  const out = execSync(`find ${WIKI_PROJECTS_ROOT} -type f -name "*.md"`, { encoding: 'utf8' })
  return out.trim().split('\n').map(f => f.replace(`${WIKI_PROJECTS_ROOT}/`, ''))
}

function codebaseRefCounts() {
  const out = execSync(`grep -roh "ACT-[A-Z]\\{2,4\\}" ${GREP_PATHS.join(' ')} 2>/dev/null | sort | uniq -c | sort -rn`, { encoding: 'utf8' })
  const counts = {}
  for (const line of out.trim().split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(ACT-[A-Z]+)$/)
    if (m) counts[m[2]] = Number(m[1])
  }
  return counts
}

function findWikiFile(code, proj, wikiFiles) {
  const aliases = [proj.canonical_slug, ...(proj.slug_aliases || [])].filter(Boolean)
  if (aliases.length === 0) {
    // Fallback — slugify name if no canonical_slug set (shouldn't happen post-v1.8.0)
    const nameSlug = (proj.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (nameSlug) aliases.push(nameSlug)
  }
  for (const s of aliases) {
    const top = wikiFiles.find(f => f === `${s}.md`)
    if (top) return top
    const sub = wikiFiles.find(f => f.endsWith(`/${s}.md`))
    if (sub) return sub
  }
  return null
}

function scoreRow(code, proj, wikiFiles, xi, xt, bsl, dbCanon, storytellers, codeRefs) {
  const wikiFile = findWikiFile(code, proj, wikiFiles)
  const wikiOk = wikiFile ? 1 : 0
  const xeroInv = xi[code] || 0
  const xeroTxn = xt[code] || 0
  const bslN = bsl[code] || 0
  const xeroOk = xeroInv + xeroTxn + bslN > 0 ? 1 : 0
  const dbOk = xeroOk || dbCanon.has(code) || storytellers.has(code) ? 1 : 0
  const refs = codeRefs[code] || 0
  const codeOk = refs >= CODE_REFS_THRESHOLD ? 1 : 0
  return {
    code, name: proj.name, status: proj.status || '?', tier: proj.tier || '-',
    wikiFile, wikiOk, dbOk, xi: xeroInv, xt: xeroTxn, bsl: bslN, codeRefs: refs, xeroOk,
    presence: wikiOk + dbOk + codeOk + xeroOk,
  }
}

function renderMarkdown(rows, totalCodes) {
  const tick = b => (b ? '✓' : '·')
  const xeroCell = r => {
    const bits = []
    if (r.xi) bits.push(`inv:${r.xi}`)
    if (r.xt) bits.push(`txn:${r.xt}`)
    if (r.bsl) bits.push(`bsl:${r.bsl}`)
    return bits.length ? bits.join(' ') : '·'
  }

  const by = { 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 }
  for (const r of rows) by[r.presence]++
  const activeBelow2 = rows.filter(r => (r.status === 'active' || r.status === 'ideation') && r.presence < 2)
  const dbNoWiki = rows.filter(r => r.dbOk && !r.wikiOk)
  const wikiNoXero = rows.filter(r => r.wikiOk && !r.xeroOk)
  const zeros = rows.filter(r => r.presence === 0)
  const ones = rows.filter(r => r.presence === 1)

  const head = [
    '---',
    `title: Project truth-state — ${totalCodes} codes × 4 sources (auto-generated)`,
    `summary: Phase-1 automation of Q2 of the ACT Alignment Loop. For each project code in config/project-codes.json, scores presence across wiki, DB activity, codebase references, and Xero tracking.`,
    `tags: [synthesis, projects, alignment-loop, project-codes, auto-generated]`,
    `status: active`,
    `date: ${DATE}`,
    '---',
    '',
    `# Project truth-state — ${DATE}`,
    '',
    `> Auto-generated by \`scripts/synthesize-project-truth-state.mjs\`. Baseline: [[project-truth-state-2026-04-24]].`,
    '',
    '## Score distribution',
    '',
    '| 4/4 | 3/4 | 2/4 | 1/4 | 0/4 | Total |',
    '|-----|-----|-----|-----|-----|-------|',
    `| ${by[4]} | ${by[3]} | ${by[2]} | ${by[1]} | ${by[0]} | ${totalCodes} |`,
    '',
    '## Acceptance criteria',
    '',
    '| Criterion | Met? |',
    '|---|---|',
    `| Every active/ideation project scores ≥2/4 | ${activeBelow2.length === 0 ? '✅' : `❌ ${activeBelow2.length} below threshold`} |`,
    `| No 0/4 retirement candidates | ${zeros.length === 0 ? '✅' : `❌ ${zeros.length}`} |`,
    '',
  ]

  const rowsByScore = [...rows].sort((a, b) => b.presence - a.presence || b.codeRefs - a.codeRefs || a.code.localeCompare(b.code))
  const table = [
    '## At-a-glance — all projects by presence score',
    '',
    '| Code | Name | Status | Tier | Wiki | DB | CodeRefs | Xero | Score |',
    '|------|------|--------|------|:----:|:--:|--------:|:----:|:-----:|',
    ...rowsByScore.map(r => `| ${r.code} | ${r.name} | ${r.status} | ${r.tier} | ${tick(r.wikiOk)} | ${tick(r.dbOk)} | ${r.codeRefs} | ${xeroCell(r)} | **${r.presence}/4** |`),
    '',
  ]

  const backlogs = ['## Backlogs', '']
  if (zeros.length) {
    backlogs.push('### 0/4 — retirement candidates', '')
    zeros.forEach(r => backlogs.push(`- \`${r.code}\` ${r.name} (${r.status})`))
    backlogs.push('')
  }
  if (activeBelow2.length) {
    backlogs.push('### Active/ideation scoring <2/4 — acceptance-criterion violation', '')
    activeBelow2.forEach(r => backlogs.push(`- \`${r.code}\` ${r.name} (${r.status}) — ${r.presence}/4`))
    backlogs.push('')
  }
  const dbNoWikiActive = dbNoWiki.filter(r => r.status === 'active' || r.status === 'ideation')
  if (dbNoWikiActive.length) {
    backlogs.push('### Active projects with DB activity but no wiki article — authoring backlog', '')
    dbNoWikiActive.forEach(r => backlogs.push(`- \`${r.code}\` ${r.name} (${r.status}) — inv:${r.xi} txn:${r.xt} bsl:${r.bsl} refs:${r.codeRefs}`))
    backlogs.push('')
  }
  const wikiNoXeroActive = wikiNoXero.filter(r => r.status === 'active' || r.status === 'ideation')
  if (wikiNoXeroActive.length) {
    backlogs.push('### Wiki article but no Xero tracking — possible project-cost-tracking gap', '')
    wikiNoXeroActive.forEach(r => backlogs.push(`- \`${r.code}\` ${r.name} (${r.status}) — wiki:${r.wikiFile}`))
    backlogs.push('')
  }
  if (ones.length) {
    backlogs.push('### 1/4 — config-only ghosts', '')
    ones.forEach(r => backlogs.push(`- \`${r.code}\` ${r.name} (${r.status}) — consider removing from project-codes.json`))
    backlogs.push('')
  }

  const provenance = [
    '## Provenance',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Script: \`scripts/synthesize-project-truth-state.mjs\``,
    `- Config: \`config/project-codes.json\` (${totalCodes} projects)`,
    '- Sources: `xero_invoices`, `xero_transactions`, `bank_statement_lines`, `projects`, `org_projects`, `project_storytellers`, wiki/projects filesystem walk, codebase grep',
    `- Code-refs threshold: ≥${CODE_REFS_THRESHOLD} hits in apps/ scripts/ config/ (filters config-only entries)`,
    '',
    '## Backlinks',
    '',
    '- [[act-alignment-loop|ACT Alignment Loop]]',
    '- [[project-truth-state-2026-04-24|2026-04-24 baseline]]',
    '- [[index|ACT Wikipedia]]',
    '',
  ]

  return [...head, ...table, ...backlogs, ...provenance].join('\n')
}

async function main() {
  console.error(`[synthesize-project-truth-state] date=${DATE} dry_run=${DRY_RUN}`)
  console.error('[synthesize-project-truth-state] loading config…')
  const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  const projects = cfg.projects
  const totalCodes = Object.keys(projects).length

  console.error('[synthesize-project-truth-state] walking wiki…')
  const wikiFiles = walkWikiFiles()

  console.error('[synthesize-project-truth-state] grepping codebase…')
  const codeRefs = codebaseRefCounts()

  console.error('[synthesize-project-truth-state] querying Supabase…')
  const [xi, xt, bsl, dbCanon, storytellers] = await Promise.all([
    groupCountByProjectCode('xero_invoices'),
    groupCountByProjectCode('xero_transactions'),
    groupCountByProjectCode('bank_statement_lines'),
    distinctProjectCodes(),
    storytellerCodes(),
  ])

  const rows = Object.entries(projects).map(([code, proj]) =>
    scoreRow(code, proj, wikiFiles, xi, xt, bsl, dbCanon, storytellers, codeRefs)
  )

  const md = renderMarkdown(rows, totalCodes)

  if (DRY_RUN) {
    process.stdout.write(md)
    return
  }

  const outPath = join(SYNTHESIS_DIR, `project-truth-state-${DATE}.md`)
  writeFileSync(outPath, md)
  console.error(`[synthesize-project-truth-state] wrote ${outPath}`)
  console.error(`[synthesize-project-truth-state] ${rows.length} projects scored, distribution: ${[4,3,2,1,0].map(s => `${s}/4:${rows.filter(r => r.presence === s).length}`).join(' ')}`)
}

main().catch(e => { console.error(e); process.exit(1) })
