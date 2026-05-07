#!/usr/bin/env node
/**
 * Diff this week's alignment-loop synthesis against the previous week's,
 * for each of the three Phase-1 questions. Emits the headline movement
 * on each `summary_metrics` field so Ben sees what changed without
 * re-reading two markdown files side by side.
 *
 * Inputs (per synthesis_slug):
 *   The two most recent files in wiki/synthesis/<slug>-*.md, ordered by
 *   filename date. Both must carry schema_version >= 1 frontmatter.
 *
 * Output:
 *   wiki/cockpit/alignment-loop-diff-YYYY-MM-DD.md — one table per slug.
 *   Terminal summary lists each slug with the count of metrics that moved.
 *
 * Plan:
 *   thoughts/shared/plans/act-alignment-loop.md — Phase-2 task ledger.
 *   Schema source: scripts/lib/synthesis-schema.mjs (SCHEMA_VERSION=1).
 *
 * Usage:
 *   node scripts/diff-alignment-loop-cycle.mjs              # write report
 *   node scripts/diff-alignment-loop-cycle.mjs --json       # JSON output
 *   node scripts/diff-alignment-loop-cycle.mjs --slug <slug># only one slug
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = join(__dirname, '..')
const SYNTHESIS_DIR = join(REPO_ROOT, 'wiki/synthesis')
const COCKPIT_DIR = join(REPO_ROOT, 'wiki/cockpit')

const argv = process.argv.slice(2)
const JSON_OUT = argv.includes('--json')
const SLUG_FLAG_IDX = argv.indexOf('--slug')
const SLUG_FILTER = SLUG_FLAG_IDX >= 0 ? argv[SLUG_FLAG_IDX + 1] : null

const SLUGS = ['funder-alignment', 'project-truth-state', 'entity-migration-truth-state']
const TODAY = new Date().toISOString().slice(0, 10)

function findRecentSynthesisPair(slug) {
  if (!existsSync(SYNTHESIS_DIR)) return []
  const files = readdirSync(SYNTHESIS_DIR)
    .filter((f) => f.startsWith(`${slug}-`) && f.endsWith('.md'))
    .sort()
  return files.slice(-2).map((f) => join(SYNTHESIS_DIR, f))
}

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/)
  if (!m) return null
  const lines = m[1].split('\n')
  const fm = {}
  let inMetrics = false
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '')
    if (line === 'summary_metrics:') {
      inMetrics = true
      fm.summary_metrics = {}
      continue
    }
    if (inMetrics) {
      // Stop when indentation drops back to 0 (next top-level key).
      if (/^\S/.test(line)) {
        inMetrics = false
      } else {
        const km = line.match(/^\s+([a-zA-Z0-9_]+):\s*(.+?)\s*$/)
        if (km) {
          let v = km[2]
          if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v)
          else if (v === 'true') v = true
          else if (v === 'false') v = false
          else if (/^".*"$/.test(v)) v = v.slice(1, -1)
          fm.summary_metrics[km[1]] = v
        }
        continue
      }
    }
    const km = line.match(/^([a-zA-Z0-9_]+):\s*(.+?)\s*$/)
    if (km) {
      let v = km[2]
      if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v)
      else if (v === 'true') v = true
      else if (v === 'false') v = false
      else if (/^".*"$/.test(v)) v = v.slice(1, -1)
      fm[km[1]] = v
    }
  }
  return fm
}

function fmtDelta(prev, curr) {
  if (prev === undefined || prev === null) return { delta: null, label: '(new)' }
  if (curr === undefined || curr === null) return { delta: null, label: '(dropped)' }
  if (typeof prev !== 'number' || typeof curr !== 'number') {
    return { delta: null, label: prev === curr ? '(unchanged)' : '(text changed)' }
  }
  const d = curr - prev
  const sign = d > 0 ? '+' : ''
  if (prev === 0) return { delta: d, label: d === 0 ? '0' : `${sign}${d} (∞%)` }
  const pct = ((d / prev) * 100).toFixed(1)
  const label = `${sign}${d} (${sign}${pct}%)`
  return { delta: d, label }
}

function diffOneSlug(slug) {
  const pair = findRecentSynthesisPair(slug)
  if (pair.length < 2) {
    return { slug, status: 'INSUFFICIENT', reason: `need 2 syntheses, found ${pair.length}`, pair }
  }
  const [prevPath, currPath] = pair
  const prevMd = readFileSync(prevPath, 'utf-8')
  const currMd = readFileSync(currPath, 'utf-8')
  const prevFm = parseFrontmatter(prevMd) || {}
  const currFm = parseFrontmatter(currMd) || {}
  const prevMetrics = prevFm.summary_metrics
  const currMetrics = currFm.summary_metrics

  if (!currMetrics) {
    return { slug, status: 'NO-SCHEMA', reason: `current synthesis missing summary_metrics block`, currPath }
  }
  if (!prevMetrics) {
    return { slug, status: 'BASELINE', reason: `previous synthesis predates schema v1; today is the first datapoint with metrics`, prevPath, currPath, currMetrics }
  }

  const allKeys = new Set([...Object.keys(prevMetrics), ...Object.keys(currMetrics)])
  const rows = []
  let movedCount = 0
  for (const k of [...allKeys].sort()) {
    const p = prevMetrics[k]
    const c = currMetrics[k]
    const { delta, label } = fmtDelta(p, c)
    const moved = (delta !== 0 && delta !== null) || label === '(new)' || label === '(dropped)'
    if (moved) movedCount++
    rows.push({ metric: k, previous: p ?? '-', current: c ?? '-', delta_label: label, moved })
  }

  return { slug, status: 'OK', prevPath, currPath, movedCount, totalMetrics: rows.length, rows }
}

const slugs = SLUG_FILTER ? [SLUG_FILTER] : SLUGS
const results = slugs.map((s) => diffOneSlug(s))

if (JSON_OUT) {
  console.log(JSON.stringify(results, null, 2))
  process.exit(0)
}

const lines = []
lines.push(`# Alignment-loop diff — ${TODAY}`, '')
lines.push(`> Generated by \`scripts/diff-alignment-loop-cycle.mjs\`. Compares the two most recent syntheses for each Phase-1 question, surfacing summary_metrics movement.`, '')

for (const r of results) {
  lines.push(`## ${r.slug}`, '')
  if (r.status === 'INSUFFICIENT') {
    lines.push(`_${r.reason}_`, '')
    continue
  }
  if (r.status === 'NO-SCHEMA') {
    lines.push(`_${r.reason}: \`${r.currPath.replace(REPO_ROOT + '/', '')}\`_`, '')
    continue
  }
  if (r.status === 'BASELINE') {
    lines.push(`_${r.reason}_`, '')
    lines.push(`Current snapshot: \`${r.currPath.replace(REPO_ROOT + '/', '')}\``, '')
    lines.push(`| Metric | Value |`)
    lines.push(`|---|---:|`)
    for (const k of Object.keys(r.currMetrics).sort()) {
      lines.push(`| \`${k}\` | ${r.currMetrics[k]} |`)
    }
    lines.push('')
    continue
  }
  // OK — full diff
  lines.push(`Compared: \`${r.prevPath.split('/').pop()}\` → \`${r.currPath.split('/').pop()}\``, '')
  lines.push(`**${r.movedCount}/${r.totalMetrics} metrics moved.**`, '')
  lines.push(`| Metric | Previous | Current | Δ |`)
  lines.push(`|---|---:|---:|---|`)
  for (const row of r.rows) {
    const flag = row.moved ? ' 🟡' : ''
    lines.push(`| \`${row.metric}\`${flag} | ${row.previous} | ${row.current} | ${row.delta_label} |`)
  }
  lines.push('')
}

const out = lines.join('\n')
const outPath = join(COCKPIT_DIR, `alignment-loop-diff-${TODAY}.md`)
writeFileSync(outPath, out)
console.log(out)
console.log(`\n[diff-alignment-loop] wrote ${outPath}`)

const okSlugs = results.filter((r) => r.status === 'OK')
const movedTotal = okSlugs.reduce((s, r) => s + r.movedCount, 0)
console.log(`[diff-alignment-loop] ${okSlugs.length}/${results.length} slugs diffed cleanly; ${movedTotal} metrics moved across all`)
