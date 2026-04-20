#!/usr/bin/env node
/**
 * narrative-log-deployment.mjs — record that a claim was deployed publicly
 *
 * Updates the claim file's frontmatter and body so the narrative system
 * stays alive over time. Increments times_deployed, updates last_used,
 * adds the channel if new, appends a sources entry, and (optionally)
 * appends a variant under "Variants used".
 *
 * Usage:
 *   node scripts/narrative-log-deployment.mjs <claim-id-or-file> <channel> \
 *     [--source <path-or-url>] \
 *     [--variant "the actual line we used"] \
 *     [--audience funder,decision-maker] \
 *     [--date 2026-04-09]
 *
 * Examples:
 *   node scripts/narrative-log-deployment.mjs claim-they-looked-like-children linkedin \
 *     --source https://linkedin.com/posts/benkn-... \
 *     --variant "Teddy bears. Family photos. They looked like children."
 *
 *   node scripts/narrative-log-deployment.mjs contained/claim-cost-comparison.md instagram \
 *     --source JusticeHub/output/instagram-2026-04-21.png
 *
 * After updating, automatically runs narrative-refresh for the claim's project.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, basename } from 'path'
import { execSync } from 'child_process'

const ROOT = process.cwd()
const NARRATIVE_ROOT = join(ROOT, 'wiki', 'narrative')

const args = process.argv.slice(2)
if (args.length < 2) {
  console.error('Usage: narrative-log-deployment.mjs <claim-id-or-file> <channel> [--source ...] [--variant "..."] [--audience ...] [--date YYYY-MM-DD]')
  process.exit(1)
}

const [claimArg, channel] = args
const flag = (name) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null
}

const source = flag('source')
const variant = flag('variant')
const audienceList = flag('audience')
const date = flag('date') || new Date().toISOString().slice(0, 10)

// ---- Locate the claim file -----------------------------------------

function findClaim(arg) {
  // Direct file path
  if (arg.endsWith('.md') && existsSync(arg)) return arg
  if (existsSync(join(ROOT, arg))) return join(ROOT, arg)

  // project/file form
  if (arg.includes('/')) {
    const direct = join(NARRATIVE_ROOT, arg.endsWith('.md') ? arg : `${arg}.md`)
    if (existsSync(direct)) return direct
  }

  // Search by id under all projects
  for (const project of readdirSync(NARRATIVE_ROOT)) {
    const dir = join(NARRATIVE_ROOT, project)
    if (!statSync(dir).isDirectory()) continue
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.md')) continue
      const stem = basename(f, '.md')
      if (stem === arg || stem === `claim-${arg}` || stem.endsWith(arg)) {
        return join(dir, f)
      }
    }
  }
  return null
}

const claimPath = findClaim(claimArg)
if (!claimPath) {
  console.error(`[narrative-log] could not find claim: ${claimArg}`)
  process.exit(1)
}

console.log(`[narrative-log] updating ${claimPath}`)

// ---- Frontmatter parser (light, in-place) --------------------------

const original = readFileSync(claimPath, 'utf8')
const fm = original.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
if (!fm) {
  console.error('[narrative-log] file has no frontmatter')
  process.exit(1)
}

let frontmatter = fm[1]
let body = fm[2]

function getField(name) {
  const m = frontmatter.match(new RegExp(`^${name}:\\s*(.*)$`, 'm'))
  return m ? m[1].trim() : null
}

function setField(name, value) {
  const re = new RegExp(`^(${name}:\\s*).*$`, 'm')
  if (re.test(frontmatter)) {
    frontmatter = frontmatter.replace(re, `$1${value}`)
  } else {
    frontmatter += `\n${name}: ${value}`
  }
}

function getListField(name) {
  const v = getField(name)
  if (!v) return []
  const m = v.match(/^\[(.*)\]$/)
  if (!m) return []
  return m[1].split(',').map((s) => s.trim()).filter(Boolean)
}

function setListField(name, list) {
  setField(name, `[${list.join(', ')}]`)
}

// ---- Apply updates --------------------------------------------------

// times_deployed
const cur = parseInt(getField('times_deployed') || '0', 10)
setField('times_deployed', String(cur + 1))

// last_used
setField('last_used', date)

// channels — add if new
const channels = getListField('channels')
if (!channels.includes(channel)) {
  channels.push(channel)
  setListField('channels', channels)
}

// audiences — merge if provided
if (audienceList) {
  const audiences = getListField('audiences')
  for (const a of audienceList.split(',').map((s) => s.trim())) {
    if (!audiences.includes(a)) audiences.push(a)
  }
  setListField('audiences', audiences)
}

// status — if it was needs-refresh, flip back to live
if (getField('status') === 'needs-refresh') {
  setField('status', 'live')
}

// sources — append a new entry under the existing sources block
if (source) {
  const sourcesIdx = frontmatter.indexOf('\nsources:')
  if (sourcesIdx >= 0) {
    // Find end of sources block (next top-level key)
    const after = frontmatter.slice(sourcesIdx + 1)
    const nextKey = after.match(/\n[a-z_]+:/)
    const insertAt = nextKey
      ? sourcesIdx + 1 + after.indexOf(nextKey[0])
      : frontmatter.length
    const insertion = `\n  - path: ${source}\n    section: "deployed ${date} via ${channel}"`
    frontmatter = frontmatter.slice(0, insertAt) + insertion + frontmatter.slice(insertAt)
  } else {
    frontmatter += `\nsources:\n  - path: ${source}\n    section: "deployed ${date} via ${channel}"`
  }
}

// Variant — append under "## Variants used" table
if (variant) {
  const variantsHeading = body.indexOf('## Variants used')
  if (variantsHeading >= 0) {
    // Find the end of the table block
    const after = body.slice(variantsHeading)
    const nextHeading = after.slice(1).search(/\n## /)
    const sectionEnd = nextHeading >= 0 ? variantsHeading + 1 + nextHeading : body.length

    // Find last table row
    const section = body.slice(variantsHeading, sectionEnd)
    const lastTableRow = section.lastIndexOf('\n|')
    if (lastTableRow >= 0) {
      // Find end of that row
      const rowEndRel = section.indexOf('\n', lastTableRow + 1)
      const rowEnd = variantsHeading + (rowEndRel >= 0 ? rowEndRel : section.length)
      const newRow = `\n| "${variant.replace(/"/g, '\\"')}" | ${channel} (${date}) |`
      body = body.slice(0, rowEnd) + newRow + body.slice(rowEnd)
    }
  }
}

const updated = `---\n${frontmatter}\n---\n${body}`
writeFileSync(claimPath, updated)

console.log(`[narrative-log] times_deployed: ${cur} → ${cur + 1}`)
console.log(`[narrative-log] last_used: ${date}`)
console.log(`[narrative-log] channel: +${channel}`)
if (source) console.log(`[narrative-log] +source: ${source}`)
if (variant) console.log(`[narrative-log] +variant logged`)

// ---- Auto-refresh the project index --------------------------------

const project = basename(join(claimPath, '..'))
try {
  execSync(`node scripts/narrative-refresh.mjs ${project}`, { stdio: 'inherit' })
} catch (e) {
  console.warn('[narrative-log] auto-refresh failed:', e.message)
}
