#!/usr/bin/env node
/**
 * ghl-responses adapter — pull contact notes / messages from GHL for
 * contacts tagged as having engaged with our outreach. Each note becomes
 * a candidate audience reaction matched against the claim being responded to.
 *
 * Strategy:
 *   1. Pull all contacts tagged with one of the contained-* tags
 *   2. For each contact, fetch their notes (and conversation messages if available)
 *   3. Filter to notes/messages created since `--since`
 *   4. Bundle into a digest grouped by tag → narrative project
 *   5. Pipe to narrative-ingest as source-type=email-response
 *
 * Tag → project routing (extend as needed):
 *   contained-* → contained
 *   goods-*     → goods-on-country
 *
 * Usage:
 *   node scripts/narrative-adapters/ghl-responses.mjs [--since YYYY-MM-DD] [--tag <tag>]
 *
 * Env required:
 *   GHL_API_KEY
 *   GHL_LOCATION_ID
 */

import 'dotenv/config'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { tmpdir } from 'os'
import { GHLService } from '../lib/ghl-api-service.mjs'

const ROOT = process.cwd()
const TMP = join(tmpdir(), 'narrative-adapter-ghl')
mkdirSync(TMP, { recursive: true })

const args = process.argv.slice(2)
const flag = (n) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 && i + 1 < args.length && !args[i + 1].startsWith('--') ? args[i + 1] : null
}
const since = flag('since')
const tagOverride = flag('tag')

const TAG_TO_PROJECT = {
  'contained-personal-outreach': 'contained',
  'contained-2026-launch': 'contained',
  'contained-responded': 'contained',
  'contained-meeting-booked': 'contained',
  'contained-amplifier': 'contained',
  'CONTAINED Tour Backer': 'contained',
  'CONTAINED Nominator': 'contained',
  'goods-hot': 'goods-on-country',
  'goods-warm': 'goods-on-country',
  'goods-nurture': 'goods-on-country',
}

const apiKey = process.env.GHL_API_KEY
const locationId = process.env.GHL_LOCATION_ID
if (!apiKey || !locationId) {
  console.error('[ghl-responses] missing GHL_API_KEY or GHL_LOCATION_ID')
  process.exit(1)
}

const ghl = new GHLService(apiKey, locationId)

// Fetch contact notes — extend GHLService here if not already present
async function getContactNotes(contactId) {
  try {
    return await ghl.request(`/contacts/${contactId}/notes`)
  } catch (e) {
    return { notes: [] }
  }
}

const tagsToScan = tagOverride ? [tagOverride] : Object.keys(TAG_TO_PROJECT)

const sinceDate = since ? new Date(since) : null
const contactsByProject = {}

for (const tag of tagsToScan) {
  const project = TAG_TO_PROJECT[tag] || 'unassigned'
  console.log(`[ghl-responses] scanning tag: ${tag} → ${project}`)

  let contacts = []
  try {
    contacts = await ghl.getAllContactsByTag(tag)
  } catch (e) {
    console.warn(`[ghl-responses] failed to fetch contacts for ${tag}:`, e.message)
    continue
  }
  console.log(`  ${contacts.length} contacts`)

  for (const contact of contacts) {
    const data = await getContactNotes(contact.id)
    const notes = data.notes || []
    const fresh = sinceDate
      ? notes.filter((n) => new Date(n.dateAdded || n.createdAt || 0) >= sinceDate)
      : notes
    if (fresh.length === 0) continue

    ;(contactsByProject[project] = contactsByProject[project] || []).push({
      contact,
      notes: fresh,
      tag,
    })
  }
}

// ---- Write digests --------------------------------------------------

for (const [project, items] of Object.entries(contactsByProject)) {
  if (items.length === 0) continue
  const batchPath = join(TMP, `${project}-ghl-${Date.now()}.md`)
  const lines = []
  lines.push(`# GHL contact responses batch — ${project}`)
  lines.push(`> ${items.length} contacts with new notes · since ${since || 'all'} · pulled ${new Date().toISOString().slice(0, 10)}`)
  lines.push('')
  lines.push('Each note below is a first-party audience reaction to outreach.')
  lines.push('Match by date + tag against the claim being deployed in that outreach window.')
  lines.push('Common pattern: a reply to the funder broadcast in March 2026 → log as audience reaction on `claim-cost-comparison` or `claim-platform-stack`.')
  lines.push('')

  for (const { contact, notes, tag } of items) {
    lines.push('---')
    lines.push('')
    lines.push(`## ${contact.firstName || ''} ${contact.lastName || ''} (${contact.email || contact.id})`)
    lines.push('')
    lines.push(`*Tag:* \`${tag}\` · *Company:* ${contact.companyName || '—'} · *Source:* ghl://contacts/${contact.id}`)
    lines.push('')
    for (const note of notes) {
      const date = (note.dateAdded || note.createdAt || '').slice(0, 10)
      lines.push(`### Note · ${date}`)
      lines.push('')
      lines.push(`> ${(note.body || note.content || '').slice(0, 1000).replace(/\n/g, '\n> ')}`)
      lines.push('')
    }
  }

  writeFileSync(batchPath, lines.join('\n'))
  console.log(`[ghl-responses] wrote ${batchPath} (${items.length} contacts for ${project})`)

  try {
    execSync(
      `node scripts/narrative-ingest.mjs "${batchPath}" --project ${project} --source-type email-response`,
      { stdio: 'inherit', cwd: ROOT }
    )
  } catch (e) {
    console.warn(`[ghl-responses] ingest failed for ${project}:`, e.message)
  }
}

const totalContacts = Object.values(contactsByProject).reduce((s, c) => s + c.length, 0)
console.log(`\n[ghl-responses] done — ${totalContacts} contact(s) with new notes across ${Object.keys(contactsByProject).length} project(s)`)
