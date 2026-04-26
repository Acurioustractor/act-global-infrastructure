#!/usr/bin/env node
/**
 * bitwarden-audit.mjs — list-only inventory of the ACT collection in Bitwarden
 *
 * Reads vault item NAMES + FOLDERS + URIs (where defined). Does NOT read or
 * print passwords, secrets, TOTP, or any field marked sensitive. Use this to
 * answer "do we have a credential for X?" without revealing values.
 *
 * Pre-requisites:
 *   1. brew install bitwarden-cli  (or npm install -g @bitwarden/cli)
 *   2. bw config server https://vault.bitwarden.com
 *   3. bw login your@email.com
 *   4. export BW_SESSION="$(bw unlock --raw)"
 *
 * Usage:
 *   node scripts/bitwarden-audit.mjs                # all items
 *   node scripts/bitwarden-audit.mjs --search Snow  # filter by substring
 *   node scripts/bitwarden-audit.mjs --org "ACT Core"  # filter by organisation
 *   node scripts/bitwarden-audit.mjs --json         # JSON output for piping
 *
 * Failure modes:
 *   - bw not installed → install message + exit 2
 *   - BW_SESSION missing → unlock instruction + exit 3
 *   - vault locked / session expired → re-unlock instruction + exit 4
 */
import { execSync } from 'node:child_process'
import { ensureUnlocked } from './lib/bitwarden-session.mjs'

const argv = process.argv.slice(2)
const SEARCH_FLAG = argv.indexOf('--search')
const SEARCH = SEARCH_FLAG >= 0 ? argv[SEARCH_FLAG + 1] : null
const ORG_FLAG = argv.indexOf('--org')
const ORG = ORG_FLAG >= 0 ? argv[ORG_FLAG + 1] : null
const JSON_OUT = argv.includes('--json')

function bw(args) {
  return execSync(`bw ${args}`, { encoding: 'utf8', env: process.env, stdio: ['pipe', 'pipe', 'pipe'] })
}

function listItems() {
  const flags = SEARCH ? `--search "${SEARCH.replace(/"/g, '\\"')}"` : ''
  const out = bw(`list items ${flags}`)
  return JSON.parse(out)
}

function listOrganizations() {
  const out = bw('list organizations')
  return JSON.parse(out)
}

function listFolders() {
  const out = bw('list folders')
  return JSON.parse(out)
}

function main() {
  ensureUnlocked()

  const items = listItems()
  const orgs = listOrganizations()
  const folders = listFolders()

  // Build lookup maps
  const orgById = Object.fromEntries(orgs.map(o => [o.id, o.name]))
  const folderById = Object.fromEntries(folders.map(f => [f.id, f.name]))

  // Audit-safe shape: name, folder, organisation, type, login URIs (no values)
  let audit = items.map(item => ({
    id: item.id,
    name: item.name,
    type: ({ 1: 'login', 2: 'secure-note', 3: 'card', 4: 'identity' })[item.type] || 'unknown',
    folder: item.folderId ? folderById[item.folderId] : '(no folder)',
    organisation: item.organizationId ? (orgById[item.organizationId] || '(unknown org)') : '(personal)',
    has_password: !!(item.login?.password),
    has_totp: !!(item.login?.totp),
    has_username: !!(item.login?.username),
    uri_count: item.login?.uris?.length || 0,
    uri_hosts: (item.login?.uris || []).map(u => {
      try { return new URL(u.uri).hostname } catch { return u.uri }
    }),
    notes_present: !!(item.notes),
    revisionDate: item.revisionDate,
  }))

  if (ORG) {
    audit = audit.filter(a => a.organisation === ORG)
  }

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(audit, null, 2) + '\n')
    return
  }

  // Human-friendly table
  console.log(`Bitwarden audit — ${audit.length} items${SEARCH ? ` matching "${SEARCH}"` : ''}${ORG ? ` in org "${ORG}"` : ''}`)
  console.log('')
  console.log('Pwd  TOTP Type        Folder                     Organisation      Name (URI hosts)')
  console.log('---  ---- ----------  -------------------------  ----------------  ----------------')
  for (const a of audit.sort((x, y) => x.name.localeCompare(y.name))) {
    const pwd = a.has_password ? ' ✓ ' : '   '
    const totp = a.has_totp ? '  ✓ ' : '    '
    const type = a.type.padEnd(10)
    const folder = (a.folder || '').slice(0, 25).padEnd(25)
    const org = (a.organisation || '').slice(0, 16).padEnd(16)
    const hosts = a.uri_hosts.length ? ` (${a.uri_hosts.slice(0, 3).join(', ')})` : ''
    console.log(`${pwd}  ${totp} ${type}  ${folder}  ${org}  ${a.name}${hosts}`)
  }

  // Summary
  console.log('')
  console.log(`Total: ${audit.length}`)
  console.log(`With password: ${audit.filter(a => a.has_password).length}`)
  console.log(`With TOTP: ${audit.filter(a => a.has_totp).length}`)
  console.log(`Organisations seen: ${[...new Set(audit.map(a => a.organisation))].join(', ')}`)
  console.log(`Folders seen: ${[...new Set(audit.map(a => a.folder))].join(', ')}`)
  console.log('')
  console.log('To inspect one item: bw get item "<name>"')
  console.log('To get password: bw get password "<name>"')
}

main()
