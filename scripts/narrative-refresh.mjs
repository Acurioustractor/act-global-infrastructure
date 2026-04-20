#!/usr/bin/env node
/**
 * narrative-refresh.mjs — regenerate the narrative INDEX for a project
 *
 * Reads every claim file under wiki/narrative/<project>/, parses frontmatter,
 * and rebuilds INDEX.md so that:
 *   - The most-recently-used claims sort to the top of a "Recent" section
 *   - Frame distribution is recomputed from live data
 *   - Claims untouched > 90 days are flagged status: needs-refresh
 *   - Top under-deployed claims are surfaced
 *
 * Usage:
 *   node scripts/narrative-refresh.mjs                  # all projects
 *   node scripts/narrative-refresh.mjs contained        # one project
 *   node scripts/narrative-refresh.mjs --dry-run        # show changes only
 *
 * Run after every deployment, or weekly via cron.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { logWikiEvent } from './wiki-log.mjs'

const ROOT = process.cwd()
const NARRATIVE_ROOT = join(ROOT, 'wiki', 'narrative')
const STALE_DAYS = 90

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const targetProject = args.find((a) => !a.startsWith('--'))

// ---- Frontmatter parsing -------------------------------------------

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { meta: {}, body: content }
  const meta = {}
  let currentKey = null
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/)
    if (kv) {
      currentKey = kv[1]
      const v = kv[2].trim()
      if (v.startsWith('[') && v.endsWith(']')) {
        meta[currentKey] = v
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      } else if (v === '') {
        meta[currentKey] = []
      } else {
        meta[currentKey] = v
      }
    } else if (line.startsWith('  - ') && currentKey && Array.isArray(meta[currentKey])) {
      meta[currentKey].push(line.slice(4).trim())
    }
  }
  return { meta, body: m[2] }
}

function serializeFrontmatter(meta) {
  const lines = ['---']
  const order = [
    'id', 'project', 'type', 'frame', 'secondary_frame', 'status',
    'first_used', 'last_used', 'times_deployed', 'channels', 'audiences',
    'sources', 'related_claims', 'backlinks_to_concepts',
  ]
  const seen = new Set()
  for (const key of order) {
    if (key in meta) {
      seen.add(key)
      lines.push(formatField(key, meta[key]))
    }
  }
  for (const [k, v] of Object.entries(meta)) {
    if (!seen.has(k)) lines.push(formatField(k, v))
  }
  lines.push('---')
  return lines.join('\n')
}

function formatField(key, value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return `${key}: []`
    if (key === 'sources') {
      return `${key}:\n${value.map((v) => `  - ${v}`).join('\n')}`
    }
    return `${key}: [${value.join(', ')}]`
  }
  return `${key}: ${value}`
}

// ---- Claim discovery ------------------------------------------------

function listProjects() {
  if (!existsSync(NARRATIVE_ROOT)) return []
  return readdirSync(NARRATIVE_ROOT).filter((d) => {
    const p = join(NARRATIVE_ROOT, d)
    return statSync(p).isDirectory()
  })
}

function listClaimFiles(project) {
  const dir = join(NARRATIVE_ROOT, project)
  return readdirSync(dir)
    .filter((f) => f.startsWith('claim-') && f.endsWith('.md'))
    .map((f) => join(dir, f))
}

function loadClaim(path) {
  const content = readFileSync(path, 'utf8')
  const { meta, body } = parseFrontmatter(content)
  return { path, file: basename(path), meta, body, raw: content }
}

// ---- Helpers --------------------------------------------------------

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

// ---- Refresh ---------------------------------------------------------

function refreshProject(project) {
  const dir = join(NARRATIVE_ROOT, project)
  const claimFiles = listClaimFiles(project)
  if (claimFiles.length === 0) {
    console.log(`[narrative-refresh] no claims under ${project}`)
    return null
  }

  const claims = claimFiles.map(loadClaim)
  const changed = []

  // Stale flagging
  for (const c of claims) {
    const days = daysSince(c.meta.last_used)
    if (days > STALE_DAYS && c.meta.status === 'live') {
      c.meta.status = 'needs-refresh'
      const newRaw = serializeFrontmatter(c.meta) + '\n' + c.body
      if (!dryRun) writeFileSync(c.path, newRaw)
      changed.push(`${c.file} → needs-refresh (${days}d cold)`)
    }
  }

  // Sort by recency (most recent first)
  const byRecency = [...claims].sort((a, b) => {
    const da = new Date(a.meta.last_used || 0).getTime()
    const db = new Date(b.meta.last_used || 0).getTime()
    return db - da
  })

  // Frame distribution
  const frameCounts = {}
  const frameDeployments = {}
  for (const c of claims) {
    const frame = c.meta.frame || 'unspecified'
    frameCounts[frame] = (frameCounts[frame] || 0) + 1
    frameDeployments[frame] = (frameDeployments[frame] || 0) + asInt(c.meta.times_deployed)
  }

  // Under-deployed (deployments / file count, sorted ascending — least used = top of list)
  const byUnderDeployment = [...claims].sort(
    (a, b) => asInt(a.meta.times_deployed) - asInt(b.meta.times_deployed)
  )

  // Audience coverage
  const audienceCounts = {}
  for (const c of claims) {
    for (const a of c.meta.audiences || []) {
      audienceCounts[a] = (audienceCounts[a] || 0) + 1
    }
  }

  // Channel coverage
  const channelCounts = {}
  for (const c of claims) {
    for (const ch of c.meta.channels || []) {
      channelCounts[ch] = (channelCounts[ch] || 0) + 1
    }
  }

  // ---- Render INDEX.md --------------------------------------------
  const today = new Date().toISOString().slice(0, 10)
  const lines = []
  lines.push(`# ${project.toUpperCase()} — Narrative Index`)
  lines.push('')
  lines.push(`> Auto-regenerated by \`scripts/narrative-refresh.mjs\`. Do not edit by hand — edit individual claim files instead.`)
  lines.push(`> **Last refresh:** ${today} · **Claims:** ${claims.length}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // Recent first
  lines.push('## Most recently deployed')
  lines.push('')
  lines.push('The latest is at the top. Use this to see what is hot, what is cooling, what is being said again right now.')
  lines.push('')
  for (const c of byRecency.slice(0, 10)) {
    const last = c.meta.last_used || '—'
    const n = asInt(c.meta.times_deployed)
    const frame = c.meta.frame || '?'
    const status = c.meta.status === 'live' ? '' : ` ⚠ ${c.meta.status}`
    lines.push(`- \`${last}\` · **[${c.meta.id || c.file}](${c.file})** · ${frame} · ${n} deployments${status}`)
  }
  lines.push('')

  // Frame distribution
  lines.push('## Frame distribution')
  lines.push('')
  lines.push('| Frame | Claims | Total deployments |')
  lines.push('|---|---|---|')
  const sortedFrames = Object.keys(frameCounts).sort(
    (a, b) => frameDeployments[b] - frameDeployments[a]
  )
  for (const f of sortedFrames) {
    lines.push(`| ${f} | ${frameCounts[f]} | ${frameDeployments[f]} |`)
  }
  lines.push('')
  lines.push('A balanced campaign uses every frame. Frames at the bottom of this list are starved — drafting against them produces fresh posts instead of repetition.')
  lines.push('')

  // Top under-deployed
  lines.push('## Top under-deployed claims (highest leverage)')
  lines.push('')
  lines.push('These claims have material on the shelf and have barely been used. Read their `What we haven\'t said yet` sections — that is where the next post lives.')
  lines.push('')
  for (const c of byUnderDeployment.slice(0, 7)) {
    const n = asInt(c.meta.times_deployed)
    const frame = c.meta.frame || '?'
    const title = (c.body.match(/^# (.+)/m) || [null, c.meta.id || c.file])[1]
    lines.push(`1. **[${title}](${c.file})** — ${frame} · ${n} deployment${n === 1 ? '' : 's'}`)
  }
  lines.push('')

  // All claims by frame
  lines.push('## All claims by frame')
  lines.push('')
  for (const frame of sortedFrames) {
    const inFrame = claims.filter((c) => c.meta.frame === frame)
    lines.push(`### ${frame} (${inFrame.length} claims · ${frameDeployments[frame]} deployments)`)
    lines.push('')
    for (const c of inFrame) {
      const title = (c.body.match(/^# (.+)/m) || [null, c.meta.id])[1]
      const n = asInt(c.meta.times_deployed)
      const last = c.meta.last_used || '—'
      const status = c.meta.status === 'live' ? '' : ` ⚠ ${c.meta.status}`
      lines.push(`- [${title}](${c.file}) — **${n}** deployments · last \`${last}\`${status}`)
    }
    lines.push('')
  }

  // Audience coverage
  lines.push('## Audience coverage')
  lines.push('')
  lines.push('| Audience | Claims tagged |')
  lines.push('|---|---|')
  for (const [a, n] of Object.entries(audienceCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${a} | ${n} |`)
  }
  lines.push('')

  // Channel coverage
  lines.push('## Channel coverage')
  lines.push('')
  lines.push('| Channel | Claims using it |')
  lines.push('|---|---|')
  for (const [ch, n] of Object.entries(channelCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${ch} | ${n} |`)
  }
  lines.push('')

  // Stale claims
  const stale = claims.filter((c) => c.meta.status === 'needs-refresh')
  if (stale.length > 0) {
    lines.push('## ⚠ Needs refresh')
    lines.push('')
    lines.push('Claims marked `status: needs-refresh` — either auto-flagged after 90+ days untouched, or manually marked because the underlying argument has shifted.')
    lines.push('')
    for (const c of stale) {
      const days = daysSince(c.meta.last_used)
      lines.push(`- [${c.file}](${c.file}) — last used \`${c.meta.last_used || 'never'}\` (${days}d ago)`)
    }
    lines.push('')
  }

  // Stat conflicts pointer
  if (existsSync(join(dir, 'STAT-CONFLICTS.md'))) {
    lines.push('## Stat issues')
    lines.push('')
    lines.push(`See [STAT-CONFLICTS.md](STAT-CONFLICTS.md) — numbers we have used inconsistently across the campaign.`)
    lines.push('')
  }

  // Footer
  lines.push('---')
  lines.push('')
  lines.push('## How to use this')
  lines.push('')
  lines.push('- Browsing freshness: read **Most recently deployed**')
  lines.push('- Drafting a new post: read **Top under-deployed claims** + the chosen claim\'s `What we haven\'t said yet` section')
  lines.push('- Reconciling a stat: open **STAT-CONFLICTS.md**')
  lines.push('- Logging a deployment: `node scripts/narrative-log-deployment.mjs <claim-id> <channel> [--variant "..."]`')
  lines.push('- Drafting an op-ed: `node scripts/narrative-draft.mjs ' + project + ' --frame moral`')
  lines.push('- Refreshing this index: `node scripts/narrative-refresh.mjs ' + project + '`')
  lines.push('')

  const indexPath = join(dir, 'INDEX.md')
  const newContent = lines.join('\n')

  if (dryRun) {
    console.log(`[narrative-refresh] would write ${indexPath} (${newContent.length} bytes)`)
  } else {
    writeFileSync(indexPath, newContent)
    console.log(`[narrative-refresh] wrote ${indexPath}`)
  }

  return {
    project,
    claims: claims.length,
    changed,
    indexPath,
  }
}

// ---- Main -----------------------------------------------------------

const projects = targetProject ? [targetProject] : listProjects()
const results = []
for (const p of projects) {
  const r = refreshProject(p)
  if (r) results.push(r)
}

const totalClaims = results.reduce((sum, r) => sum + r.claims, 0)
const totalChanged = results.reduce((sum, r) => sum + r.changed.length, 0)
const summary = `${results.length} project(s) · ${totalClaims} claims · ${totalChanged} status changes`

console.log(`\n[narrative-refresh] ${summary}`)

if (!dryRun && results.length > 0) {
  try {
    logWikiEvent(
      'manual',
      `narrative-refresh — ${summary}`,
      results.map((r) => r.indexPath.replace(ROOT + '/', ''))
    )
  } catch (e) {
    console.warn('[narrative-refresh] log append failed:', e.message)
  }
}
