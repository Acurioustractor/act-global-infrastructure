#!/usr/bin/env node
/**
 * narrative-strategy-review.mjs — write a weekly strategy review per project
 *
 * Reads every claim file's frontmatter and produces wiki/narrative/<project>/STRATEGY-REVIEW.md
 * with the questions a campaign retro should answer:
 *   - Which frames did we lean on this week vs last week?
 *   - Which audiences are we under-serving?
 *   - Which channels have we touched recently / not touched at all?
 *   - Which claims have generated zero response in 30 days (signal to retire or refresh)?
 *   - Which audience reactions came in this week (and from whom)?
 *   - Which funders/cycles have unused matching claims?
 *
 * Run weekly. The output file IS the campaign retro — no meeting required.
 *
 * Usage:
 *   node scripts/narrative-strategy-review.mjs [project]
 *   node scripts/narrative-strategy-review.mjs --all
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join, basename } from 'path'
import { logWikiEvent } from './wiki-log.mjs'

const ROOT = process.cwd()
const NARRATIVE_ROOT = join(ROOT, 'wiki', 'narrative')
const FUNDERS_PATH = join(NARRATIVE_ROOT, 'funders.json')

const args = process.argv.slice(2)
const all = args.includes('--all')
const targetProject = args.find((a) => !a.startsWith('--'))

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { meta: {}, body: content }
  const meta = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/)
    if (!kv) continue
    const v = kv[2].trim()
    if (v.startsWith('[') && v.endsWith(']')) {
      meta[kv[1]] = v.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean)
    } else {
      meta[kv[1]] = v
    }
  }
  return { meta, body: m[2] }
}

function daysSince(dateStr) {
  if (!dateStr) return Infinity
  const d = new Date(dateStr)
  if (isNaN(d)) return Infinity
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function asInt(v) {
  const n = parseInt(v, 10)
  return isNaN(n) ? 0 : n
}

function listProjects() {
  if (!existsSync(NARRATIVE_ROOT)) return []
  return readdirSync(NARRATIVE_ROOT).filter((d) => {
    const p = join(NARRATIVE_ROOT, d)
    try {
      return statSync(p).isDirectory()
    } catch {
      return false
    }
  })
}

function loadClaims(project) {
  const dir = join(NARRATIVE_ROOT, project)
  return readdirSync(dir)
    .filter((f) => f.startsWith('claim-') && f.endsWith('.md'))
    .map((f) => {
      const path = join(dir, f)
      const content = readFileSync(path, 'utf8')
      const { meta, body } = parseFrontmatter(content)
      const title = (body.match(/^# (.+)/m) || [null, meta.id || f])[1]
      return { file: f, path, meta, body, title }
    })
}

function loadFunders() {
  if (!existsSync(FUNDERS_PATH)) return {}
  return JSON.parse(readFileSync(FUNDERS_PATH, 'utf8')).funders || {}
}

const FRAME_BUDGET = {
  evidentiary: 0.18,
  constructive: 0.18,
  invitational: 0.18,
  testimonial: 0.14,
  structural: 0.14,
  confrontational: 0.10,
  moral: 0.08,
}

function reviewProject(project) {
  const claims = loadClaims(project)
  if (claims.length === 0) return null
  const funders = loadFunders()
  const today = new Date().toISOString().slice(0, 10)

  // ---- Frame distribution analysis ---------------------------------
  const frameCounts = {}
  const frameDeployments = {}
  const totalDeployments = claims.reduce((s, c) => s + asInt(c.meta.times_deployed), 0)
  for (const c of claims) {
    const f = c.meta.frame || 'unspecified'
    frameCounts[f] = (frameCounts[f] || 0) + 1
    frameDeployments[f] = (frameDeployments[f] || 0) + asInt(c.meta.times_deployed)
  }

  const frameDelta = Object.keys(FRAME_BUDGET).map((frame) => {
    const actual = totalDeployments > 0 ? (frameDeployments[frame] || 0) / totalDeployments : 0
    const budget = FRAME_BUDGET[frame]
    return {
      frame,
      actual: actual,
      budget,
      delta: actual - budget,
      label: actual > budget * 1.5 ? 'over' : actual < budget * 0.5 ? 'starved' : 'on-budget',
    }
  })

  // ---- Audience coverage --------------------------------------------
  const audienceCounts = {}
  for (const c of claims) {
    for (const a of c.meta.audiences || []) {
      audienceCounts[a] = (audienceCounts[a] || 0) + 1
    }
  }

  // ---- Channel freshness --------------------------------------------
  const channelLastUsed = {}
  for (const c of claims) {
    for (const ch of c.meta.channels || []) {
      const last = c.meta.last_used
      if (!channelLastUsed[ch] || (last && last > channelLastUsed[ch])) {
        channelLastUsed[ch] = last
      }
    }
  }

  // ---- Cold claims (untouched 30+ days) -----------------------------
  const cold = claims
    .map((c) => ({ c, days: daysSince(c.meta.last_used) }))
    .filter(({ days }) => days >= 30)
    .sort((a, b) => b.days - a.days)

  // ---- Funder pipeline gaps -----------------------------------------
  const funderGaps = []
  for (const [slug, f] of Object.entries(funders)) {
    const wanted = (f.claims_to_lead_with || []).filter((ref) => {
      const [proj, id] = ref.includes(':') ? ref.split(':') : [project, ref]
      return proj === project
    })
    if (wanted.length === 0) continue
    const cold = wanted.filter((ref) => {
      const id = ref.includes(':') ? ref.split(':')[1] : ref
      const c = claims.find((x) => x.meta.id === id)
      return c && daysSince(c.meta.last_used) >= 14
    })
    if (cold.length > 0) {
      funderGaps.push({ slug, name: f.name, stage: f.stage, deadline: f.deadline, cold })
    }
  }

  // ---- Cycle gaps ---------------------------------------------------
  const cycleCounts = {}
  for (const c of claims) {
    for (const cyc of c.meta.cycle || []) {
      cycleCounts[cyc] = (cycleCounts[cyc] || 0) + 1
    }
  }

  // ---- Render -------------------------------------------------------
  const lines = []
  lines.push(`# ${project.toUpperCase()} — Strategy Review`)
  lines.push('')
  lines.push(`> Auto-regenerated by \`scripts/narrative-strategy-review.mjs\`. The questions every weekly retro needs to answer, computed from live claim data.`)
  lines.push(`> **Last review:** ${today} · **Claims:** ${claims.length} · **Total deployments:** ${totalDeployments}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // Frame budget
  lines.push('## Frame budget — what are we leaning on?')
  lines.push('')
  lines.push('A balanced campaign distributes deployments across frames. The "budget" column is the recommended share of deployments per frame for a healthy campaign mix. The "delta" shows where we are over- or under-spending.')
  lines.push('')
  lines.push('| Frame | Budget | Actual | Status |')
  lines.push('|---|---|---|---|')
  for (const { frame, budget, actual, label } of frameDelta) {
    const symbol = label === 'over' ? '🔴 over' : label === 'starved' ? '🟡 starved' : '🟢 on-budget'
    lines.push(`| ${frame} | ${(budget * 100).toFixed(0)}% | ${(actual * 100).toFixed(0)}% | ${symbol} |`)
  }
  lines.push('')

  const starved = frameDelta.filter((f) => f.label === 'starved')
  if (starved.length > 0) {
    lines.push(`**This week's recommended frames** (the starved ones):`)
    lines.push('')
    for (const f of starved) {
      lines.push(`- \`${f.frame}\` — actual ${(f.actual * 100).toFixed(0)}% vs budget ${(f.budget * 100).toFixed(0)}%`)
    }
    lines.push('')
    lines.push(`Run \`node scripts/narrative-draft.mjs ${project} --frame ${starved[0].frame}\` to draft against the most starved frame.`)
    lines.push('')
  }

  // Audience coverage
  lines.push('## Audience coverage')
  lines.push('')
  lines.push('| Audience | Claims tagged |')
  lines.push('|---|---|')
  for (const [a, n] of Object.entries(audienceCounts).sort((x, y) => y[1] - x[1])) {
    lines.push(`| ${a} | ${n} |`)
  }
  const weakAudiences = Object.entries(audienceCounts).filter(([, n]) => n < 3).map(([a]) => a)
  if (weakAudiences.length > 0) {
    lines.push('')
    lines.push(`**Under-served audiences** (< 3 claims): ${weakAudiences.join(', ')}`)
  }
  lines.push('')

  // Channel freshness
  lines.push('## Channel freshness')
  lines.push('')
  lines.push('| Channel | Last deployed |')
  lines.push('|---|---|')
  for (const [ch, last] of Object.entries(channelLastUsed).sort((a, b) => (b[1] || '').localeCompare(a[1] || ''))) {
    const days = daysSince(last)
    const status = days < 14 ? '🟢' : days < 30 ? '🟡' : '🔴'
    lines.push(`| ${ch} | ${last || '—'} ${status} (${days === Infinity ? '∞' : days}d ago) |`)
  }
  lines.push('')

  // Cold claims
  if (cold.length > 0) {
    lines.push('## Cold claims (≥ 30 days untouched)')
    lines.push('')
    lines.push('Either deploy them this week, or retire them.')
    lines.push('')
    for (const { c, days } of cold.slice(0, 10)) {
      lines.push(`- [${c.title}](${c.file}) — \`${c.meta.last_used || 'never'}\` (${days === Infinity ? 'never' : days + 'd'} ago)`)
    }
    lines.push('')
  }

  // Funder gaps
  if (funderGaps.length > 0) {
    lines.push('## Funder pipeline — claims gone cold for active asks')
    lines.push('')
    lines.push('These funders have an open ask and the claims that should be leading their pitch have not been deployed in 14+ days. Either re-deploy publicly so the funder sees them, or refresh the claim with new evidence.')
    lines.push('')
    for (const g of funderGaps) {
      lines.push(`### ${g.name} — ${g.stage}${g.deadline ? ` (deadline ${g.deadline})` : ''}`)
      lines.push('')
      for (const ref of g.cold) lines.push(`- \`${ref}\` is cold`)
      lines.push('')
      lines.push(`Draft the next pitch: \`node scripts/narrative-draft.mjs ${project} --funder ${g.slug} --channel pitch --length long\``)
      lines.push('')
    }
  }

  // Cycle coverage
  if (Object.keys(cycleCounts).length > 0) {
    lines.push('## Cycle coverage')
    lines.push('')
    lines.push('Which campaign cycles are well-staffed with claims, and which need building?')
    lines.push('')
    lines.push('| Cycle | Claims tagged |')
    lines.push('|---|---|')
    for (const [c, n] of Object.entries(cycleCounts).sort((a, b) => b[1] - a[1])) {
      lines.push(`| \`${c}\` | ${n} |`)
    }
    lines.push('')
  }

  // Recommendations
  lines.push('## This week\'s recommended actions')
  lines.push('')
  if (starved.length > 0) {
    lines.push(`1. **Draft against the starved frame.** Run \`node scripts/narrative-draft.mjs ${project} --frame ${starved[0].frame}\``)
  }
  if (cold.length > 0) {
    lines.push(`2. **Re-deploy or retire** the ${cold.length} cold claim(s) above`)
  }
  if (funderGaps.length > 0) {
    lines.push(`3. **Active funder pitches** — ${funderGaps.length} funder(s) have cold claims in their pitch deck`)
  }
  const oldChannels = Object.entries(channelLastUsed).filter(([, l]) => daysSince(l) > 30)
  if (oldChannels.length > 0) {
    lines.push(`4. **Touch silent channels** — ${oldChannels.map(([c]) => c).join(', ')} haven't been used in 30+ days`)
  }
  lines.push('')

  return { project, lines, claimCount: claims.length, totalDeployments }
}

// ---- Main -----------------------------------------------------------

const projects = targetProject ? [targetProject] : listProjects()
const reports = []

for (const p of projects) {
  const r = reviewProject(p)
  if (!r) continue
  const outPath = join(NARRATIVE_ROOT, p, 'STRATEGY-REVIEW.md')
  writeFileSync(outPath, r.lines.join('\n'))
  console.log(`[strategy-review] wrote ${outPath} (${r.claimCount} claims, ${r.totalDeployments} deployments)`)
  reports.push({ project: p, path: outPath })
}

if (reports.length > 0) {
  try {
    logWikiEvent(
      'manual',
      `narrative strategy review — ${reports.length} project(s)`,
      reports.map((r) => r.path.replace(ROOT + '/', ''))
    )
  } catch (e) {
    console.warn('[strategy-review] log append failed:', e.message)
  }
}
