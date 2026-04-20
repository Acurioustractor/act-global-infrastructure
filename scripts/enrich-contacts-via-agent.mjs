#!/usr/bin/env node
/**
 * Tier 3 contact enrichment — agent-driven per-org research.
 *
 * For gs_entities rows that neither ACNC nor website-scrape tiers resolved.
 * These are typically: ORIC-only corps with no ACNC registration, orgs
 * without a public website, orgs whose name collides with other entities
 * and whose true contact requires search context.
 *
 * Rather than doing this in-script with fragile scraping, this tier emits
 * a structured research brief per org that a research agent can work
 * through. The agent returns a JSON structure with contact data + source
 * citations + confidence score. Ben reviews before writing.
 *
 * Workflow
 * --------
 * 1. This script identifies candidates (gs_entities with null email/phone
 *    AND no website AND is_community_controlled = true)
 * 2. Emits a brief for each candidate to wiki/output/contact-enrichment/
 *    research-briefs/<gs_entity_id>.md
 * 3. Ben or a research agent (via Claude Code's Agent tool or external
 *    researcher) reads each brief, performs research, writes findings
 *    back to wiki/output/contact-enrichment/research-results/<gs_entity_id>.md
 * 4. A separate --ingest-results pass reads confirmed results and writes
 *    to gs_entities
 *
 * Research-brief template asks the agent to:
 * - Confirm the org is still operating
 * - Find public contact info (ABN Lookup, ACNC register, White Pages, social)
 * - Cite sources for every field
 * - Flag any ambiguity or multiple matches
 * - Return confidence 1-5 per field
 *
 * Usage
 * -----
 *   node scripts/enrich-contacts-via-agent.mjs                         # emit briefs
 *   node scripts/enrich-contacts-via-agent.mjs --limit 10              # cap briefs
 *   node scripts/enrich-contacts-via-agent.mjs --state QLD             # state filter
 *   node scripts/enrich-contacts-via-agent.mjs --ingest-results --apply # read back + write to DB
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const BRIEFS_DIR = join(REPO_ROOT, 'wiki', 'output', 'contact-enrichment', 'research-briefs')
const RESULTS_DIR = join(REPO_ROOT, 'wiki', 'output', 'contact-enrichment', 'research-results')
const AUDIT_DIR = join(REPO_ROOT, 'wiki', 'output', 'contact-enrichment')

const args = process.argv.slice(2)
const INGEST = args.includes('--ingest-results')
const APPLY = args.includes('--apply')
const VERBOSE = args.includes('--verbose')
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? parseInt(args[i + 1], 10) : null })()
const STATE = (() => { const i = args.indexOf('--state'); return i >= 0 ? args[i + 1] : null })()
const IDS_FILE = (() => { const i = args.indexOf('--ids-file'); return i >= 0 ? args[i + 1] : null })()

try {
  const env = readFileSync(join(REPO_ROOT, '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const [k, ...rest] = line.split('=')
    if (k && rest.length && !process.env[k.trim()]) process.env[k.trim()] = rest.join('=').trim()
  }
} catch {}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!KEY) { console.error('[fatal] SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1) }

async function get(p) {
  const r = await fetch(`${URL}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  if (!r.ok) throw new Error(`GET ${p}: ${r.status}`)
  return r.json()
}
async function patch(p, b) {
  const r = await fetch(`${URL}/rest/v1/${p}`, {
    method: 'PATCH',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(b),
  })
  if (!r.ok) throw new Error(`PATCH ${p}: ${r.status}`)
}

function briefTemplate(row) {
  return `---
gs_entity_id: ${row.id}
org_name: "${row.canonical_name}"
state: ${row.state || 'unknown'}
abn: ${row.abn || 'none'}
entity_type: ${row.entity_type}
is_community_controlled: ${row.is_community_controlled}
brief_generated: ${new Date().toISOString()}
status: awaiting_research
---

# Contact research brief — ${row.canonical_name}

## What we know

- **Name:** ${row.canonical_name}
- **State:** ${row.state || 'unknown'}
- **ABN:** ${row.abn || 'none in our record'}
- **Entity type:** ${row.entity_type}
- **Community-controlled:** ${row.is_community_controlled}
- **LGA:** ${row.lga_name || 'unknown'}
- **Postcode:** ${row.postcode || 'unknown'}
- **Current website:** ${row.website || 'none'}
- **Current email:** ${row.email || 'none'}
- **Current phone:** ${row.phone || 'none'}

## Research task

Find the current, active contact details for this organisation. Look in this order:

1. **ABN Lookup** (abr.business.gov.au) — enter ABN above, note main business address + GST status
2. **ACNC register** (acnc.gov.au/charity) — search by name; note email/phone/postal address
3. **ORIC register** (oric.gov.au) — if entity_type is indigenous_corp, search by name. Note ICN.
4. **Organisation's own website** — search Google for "${row.canonical_name}" plus state. If there's no website, check Facebook / LinkedIn / local government listings.
5. **Local directories** — QLD: community.services.gov.au; NSW: service.nsw.gov.au; other state equivalents

## Return format

Overwrite this file's \`status:\` to \`research_complete\`, add a results block at the bottom:

\`\`\`
## Research findings

- **Operating status:** [active / inactive / unknown]
- **Email:** [value or "not found"]
  - Source: [URL]
  - Confidence: [1-5]
- **Phone:** [value or "not found"]
  - Source: [URL]
  - Confidence: [1-5]
- **Website:** [value or "none"]
  - Source: [URL]
  - Confidence: [1-5]
- **Postal address:** [if found]
- **Notes:** [any caveats, name collisions, etc]
- **Researcher:** [name or "agent"]
- **Research date:** [ISO date]
\`\`\`

## Confidence rubric

- **5** — Direct from ACNC or organisation's official website; recently updated
- **4** — Confirmed from a secondary official source (government register, etc)
- **3** — From a credible third-party site (known directory)
- **2** — From a social-media profile; may not be current
- **1** — Best guess; treat as unverified
`
}

async function emitBriefs() {
  if (!existsSync(BRIEFS_DIR)) mkdirSync(BRIEFS_DIR, { recursive: true })
  const stateFilter = STATE ? `&state=eq.${STATE}` : ''
  const limit = LIMIT || 50
  let rows
  if (IDS_FILE) {
    const ids = JSON.parse(readFileSync(IDS_FILE, 'utf8'))
    const idList = (Array.isArray(ids) ? ids : ids.ids || []).map((x) => typeof x === 'string' ? x : x.id).filter(Boolean)
    console.log(`→ Loading ${idList.length} IDs from ${IDS_FILE}`)
    const inList = idList.map((id) => `"${id}"`).join(',')
    rows = await get(
      `gs_entities?select=id,canonical_name,state,abn,entity_type,is_community_controlled,lga_name,postcode,website,email,phone&id=in.(${inList})&email=is.null&website=is.null&order=state.asc,canonical_name.asc`,
    )
  } else {
    rows = await get(
      `gs_entities?select=id,canonical_name,state,abn,entity_type,is_community_controlled,lga_name,postcode,website,email,phone&is_community_controlled=eq.true&email=is.null&website=is.null${stateFilter}&limit=${limit}&order=canonical_name.asc`,
    )
  }
  console.log(`→ ${rows.length} candidates without email or website`)
  let written = 0, skipped = 0
  for (const row of rows) {
    const path = join(BRIEFS_DIR, `${row.id}.md`)
    if (existsSync(path)) { skipped++; continue }
    writeFileSync(path, briefTemplate(row))
    written++
    if (VERBOSE) console.log(`  ✓ brief: ${row.canonical_name}`)
  }
  console.log(`✓ wrote ${written} new briefs, skipped ${skipped} existing`)
  console.log(`  briefs at: ${BRIEFS_DIR.replace(REPO_ROOT + '/', '')}`)
  console.log(`  put results at: ${RESULTS_DIR.replace(REPO_ROOT + '/', '')}`)
  console.log('')
  console.log('Next: research agent fills in each brief, saves result to results-dir.')
  console.log('Then: node scripts/enrich-contacts-via-agent.mjs --ingest-results --apply')
}

async function ingestResults() {
  if (!existsSync(RESULTS_DIR)) {
    console.log(`No results yet at ${RESULTS_DIR.replace(REPO_ROOT + '/', '')}`)
    return
  }
  const files = readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.md'))
  console.log(`→ ${files.length} result files to ingest`)
  let applied = 0, skipped = 0, errors = 0
  for (const fname of files) {
    const raw = readFileSync(join(RESULTS_DIR, fname), 'utf8')
    const idMatch = raw.match(/gs_entity_id:\s*([a-f0-9-]+)/)
    if (!idMatch) { skipped++; continue }
    const id = idMatch[1]
    const emailMatch = raw.match(/\*\*Email:\*\*\s*\[?([^\]\n]+)\]?/)
    const phoneMatch = raw.match(/\*\*Phone:\*\*\s*\[?([^\]\n]+)\]?/)
    const confidenceEmailMatch = raw.match(/Email:[\s\S]*?Confidence:\s*(\d)/)
    const confidencePhoneMatch = raw.match(/Phone:[\s\S]*?Confidence:\s*(\d)/)
    const changes = {}
    if (emailMatch && emailMatch[1].includes('@') && parseInt(confidenceEmailMatch?.[1] || '0') >= 3) {
      changes.email = emailMatch[1].trim()
    }
    if (phoneMatch && /\d/.test(phoneMatch[1]) && parseInt(confidencePhoneMatch?.[1] || '0') >= 3) {
      changes.phone = phoneMatch[1].trim()
    }
    if (Object.keys(changes).length === 0) { skipped++; continue }
    if (!APPLY) {
      console.log(`  [dry-run] would patch ${id}: ${JSON.stringify(changes)}`)
      continue
    }
    try {
      await patch(`gs_entities?id=eq.${id}`, { ...changes, contact_source: 'agent_research', updated_at: new Date().toISOString() })
      applied++
    } catch (err) { errors++; if (VERBOSE) console.error(`  ✗ ${id}: ${err.message}`) }
  }
  console.log(`${APPLY ? `✓ applied ${applied}` : '(dry-run)'}, skipped ${skipped}, errors ${errors}`)
}

async function main() {
  console.log('===== enrich-contacts-via-agent =====')
  console.log(`Mode: ${INGEST ? 'INGEST-RESULTS' : 'EMIT-BRIEFS'}${APPLY ? ' + APPLY' : ''}`)
  if (LIMIT) console.log(`Limit: ${LIMIT}`)
  console.log('')
  if (INGEST) await ingestResults()
  else await emitBriefs()
}

main().catch((err) => { console.error('[fatal]', err.message); process.exit(1) })
