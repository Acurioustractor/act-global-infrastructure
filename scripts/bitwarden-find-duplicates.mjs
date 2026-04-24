#!/usr/bin/env node
/**
 * bitwarden-find-duplicates.mjs
 *
 * List items that are likely duplicates: same name (case-insensitive) OR
 * same URI host. For each pair/group, show metadata so you can pick which
 * to keep + delete the rest. Read-only — never deletes anything.
 *
 * Pre-requisites:
 *   1. bw installed + logged in
 *   2. BW_SESSION exported
 *
 * Usage:
 *   node scripts/bitwarden-find-duplicates.mjs            # all duplicates
 *   node scripts/bitwarden-find-duplicates.mjs --by name  # only name-based
 *   node scripts/bitwarden-find-duplicates.mjs --by uri   # only URI-based
 *   node scripts/bitwarden-find-duplicates.mjs --json     # JSON output
 */
import { execSync } from 'node:child_process'

const argv = process.argv.slice(2)
const BY_FLAG = argv.indexOf('--by')
const BY = BY_FLAG >= 0 ? argv[BY_FLAG + 1] : 'both'
const JSON_OUT = argv.includes('--json')

function precheck() {
  try {
    execSync('which bw', { stdio: 'pipe' })
  } catch {
    console.error('bw (Bitwarden CLI) not installed.')
    process.exit(2)
  }
  if (!process.env.BW_SESSION) {
    console.error('BW_SESSION not set.')
    console.error('Run: export BW_SESSION="$(bw unlock --raw)"')
    process.exit(3)
  }
}

function bw(args) {
  return execSync(`bw ${args}`, {
    encoding: 'utf8',
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
}

function listItems() {
  return JSON.parse(bw('list items'))
}

function hostFromUri(uri) {
  if (!uri) return null
  try {
    return new URL(uri).hostname
  } catch {
    return uri
  }
}

function groupByName(items) {
  const map = new Map()
  for (const item of items) {
    const key = item.name.toLowerCase().trim()
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(item)
  }
  return [...map.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({ key, type: 'name', group }))
}

function groupByHost(items) {
  const map = new Map()
  for (const item of items) {
    const uris = item.login?.uris || []
    for (const u of uris) {
      const host = hostFromUri(u.uri)
      if (!host) continue
      if (!map.has(host)) map.set(host, new Set())
      map.get(host).add(item.id)
    }
  }
  // Convert to groups by item-ID set; only keep hosts with 2+ distinct items
  const itemById = new Map(items.map(i => [i.id, i]))
  return [...map.entries()]
    .filter(([, idSet]) => idSet.size > 1)
    .map(([host, idSet]) => ({
      key: host,
      type: 'host',
      group: [...idSet].map(id => itemById.get(id)),
    }))
}

function dedupeGroups(groups) {
  // Avoid showing the same pair twice (e.g., grouped by name AND by host).
  // Key by sorted item-ID-set string.
  const seen = new Set()
  const out = []
  for (const g of groups) {
    const ids = g.group.map(i => i.id).sort().join('|')
    if (seen.has(ids)) continue
    seen.add(ids)
    out.push(g)
  }
  return out
}

function fmtDate(s) {
  if (!s) return '?'
  return new Date(s).toISOString().slice(0, 10)
}

function suggestKeep(group) {
  // Heuristic: keep the most recently updated; if tie, keep the one with non-empty password
  const sorted = [...group].sort((a, b) => {
    const ad = new Date(a.revisionDate || 0).getTime()
    const bd = new Date(b.revisionDate || 0).getTime()
    if (bd !== ad) return bd - ad
    const aPwd = !!a.login?.password
    const bPwd = !!b.login?.password
    if (aPwd !== bPwd) return bPwd ? 1 : -1
    return 0
  })
  return sorted[0]
}

function main() {
  precheck()
  const items = listItems()

  let groups = []
  if (BY === 'name' || BY === 'both') groups.push(...groupByName(items))
  if (BY === 'uri' || BY === 'both') groups.push(...groupByHost(items))
  groups = dedupeGroups(groups)
  groups.sort((a, b) => b.group.length - a.group.length || a.key.localeCompare(b.key))

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(groups, null, 2) + '\n')
    return
  }

  if (groups.length === 0) {
    console.log('No duplicates found.')
    return
  }

  console.log(`Found ${groups.length} duplicate group(s) across ${items.length} items.\n`)

  for (const g of groups) {
    const keep = suggestKeep(g.group)
    const dropIds = g.group.filter(i => i.id !== keep.id).map(i => i.id)
    console.log(`────────────────────────────────────────────────────────`)
    console.log(`${g.type === 'name' ? 'NAME' : 'URI'}  "${g.key}"  (${g.group.length} items)`)
    for (const item of g.group) {
      const tag = item.id === keep.id ? '  KEEP →' : '  DROP →'
      const pwd = item.login?.password ? ' (pwd)' : ''
      const totp = item.login?.totp ? ' (totp)' : ''
      console.log(`${tag} ${fmtDate(item.revisionDate)}  ${item.name}${pwd}${totp}  [id ${item.id.slice(0, 8)}…]`)
    }
    if (dropIds.length > 0) {
      console.log('')
      console.log('  To delete losers (after manual review!):')
      for (const id of dropIds) {
        console.log(`    bw delete item ${id}`)
      }
    }
    console.log('')
  }

  console.log(`Reminder: review each suggestion before deleting. The 'KEEP' is a heuristic`)
  console.log(`(most-recently-updated, then has-password). The actual right one to keep`)
  console.log(`depends on which credential is current for the system.`)
}

main()
