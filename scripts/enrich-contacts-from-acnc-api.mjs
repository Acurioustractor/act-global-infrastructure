#!/usr/bin/env node
/**
 * Tier 1.5 contact enrichment — ACNC public API per-charity lookup.
 *
 * The ACNC bulk CSV is privacy-scrubbed (no email/phone), but the ACNC site
 * exposes an undocumented internal JSON API used by the charity-search UI
 * that DOES return email + phone for each charity:
 *
 *   1. Search by ABN:
 *      https://www.acnc.gov.au/api/dynamics/search/charity?search=<ABN>&limit=1
 *      → returns {results: [{uuid, data: {Name, Abn, ...}}]}
 *
 *   2. Detail fetch:
 *      https://www.acnc.gov.au/api/dynamics/entity/<uuid>
 *      → returns full charity record including contact block
 *
 * Yield expectation: ~60-80% of the 2,057 ACNC-matched gs_entities rows
 * should have email from this endpoint. At 1 req/sec (2 calls per charity)
 * the full run is ~70 minutes.
 *
 * Usage
 * -----
 *   node scripts/enrich-contacts-from-acnc-api.mjs              # dry-run
 *   node scripts/enrich-contacts-from-acnc-api.mjs --apply
 *   node scripts/enrich-contacts-from-acnc-api.mjs --limit 20   # small test
 *   node scripts/enrich-contacts-from-acnc-api.mjs --state QLD  # scope
 */

import 'dotenv/config'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const AUDIT_DIR = join(REPO_ROOT, 'wiki', 'output', 'contact-enrichment')

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ACT-contact-enrichment/1.0'
const DELAY_MS = 600 // ~1.5 req/sec

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const VERBOSE = args.includes('--verbose')
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? parseInt(args[i + 1], 10) : null })()
const STATE = (() => { const i = args.indexOf('--state'); return i >= 0 ? args[i + 1] : null })()

try {
  const env = readFileSync(join(REPO_ROOT, '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const [k, ...rest] = line.split('=')
    if (k && rest.length && !process.env[k.trim()]) process.env[k.trim()] = rest.join('=').trim()
  }
} catch {}

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!KEY) { console.error('[fatal] SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1) }

async function sbGet(p) {
  const all = []
  let offset = 0
  while (true) {
    const r = await fetch(`${SUPA}/rest/v1/${p}&limit=1000&offset=${offset}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    })
    if (!r.ok) throw new Error(`GET ${p}: ${r.status}`)
    const rows = await r.json()
    all.push(...rows)
    if (rows.length < 1000) break
    offset += 1000
  }
  return all
}

async function sbPatch(p, b) {
  const r = await fetch(`${SUPA}/rest/v1/${p}`, {
    method: 'PATCH',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(b),
  })
  if (!r.ok) throw new Error(`PATCH ${p}: ${r.status} ${await r.text()}`)
}

async function acncFetch(url) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) return null
    return await r.json()
  } catch { return null }
}

// Extract email + phone from the ACNC entity detail blob
function extractContact(entity) {
  if (!entity) return {}
  const out = {}
  const str = JSON.stringify(entity)

  // Email — first non-acnc.gov.au address
  const emails = Array.from(str.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)).map((m) => m[0])
    .filter((e) => !/@acnc\.gov\.au$|@.*\.png|noreply|donotreply|@example\.|@wixpress|sentry/i.test(e))
  if (emails.length) out.email = emails[0]

  // Phone — AU mobile/landline. Exclude ACNC internal reference IDs
  // (pattern 022489XXXX / 022481XXXX / similar which appear in ACNC boilerplate)
  const phones = Array.from(str.matchAll(/(?:\+?61[\s-]?)?(?:\(?0[2-478]\)?[\s-]?\d{4}[\s-]?\d{4}|04\d{2}[\s-]?\d{3}[\s-]?\d{3}|1[38]00[\s-]?\d{3}[\s-]?\d{3})/g)).map((m) => m[0])
    .filter((p) => p.replace(/\D/g, '').length >= 9)
    .filter((p) => { const d = p.replace(/\D/g, ''); return !/^0224(81|89)\d{4}$/.test(d) && !/^61224(81|89)\d{4}$/.test(d) }) // ACNC internal ref prefix
  if (phones.length) {
    const unique = [...new Set(phones)]
    out.phone = unique[0]
  }

  return out
}

async function lookupByAbn(abn) {
  const cleanAbn = abn.replace(/\D/g, '')
  const searchUrl = `https://www.acnc.gov.au/api/dynamics/search/charity?search=${cleanAbn}&limit=1`
  const s = await acncFetch(searchUrl)
  const uuid = s?.results?.[0]?.uuid
  if (!uuid) return { found: false }
  await new Promise((res) => setTimeout(res, DELAY_MS))
  const detail = await acncFetch(`https://www.acnc.gov.au/api/dynamics/entity/${uuid}`)
  if (!detail) return { found: false }
  return { found: true, uuid, contact: extractContact(detail) }
}

async function main() {
  console.log('===== enrich-contacts-from-acnc-api =====')
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  if (LIMIT) console.log(`Row cap: ${LIMIT}`)
  if (STATE) console.log(`State filter: ${STATE}`)
  console.log('')

  const stateFilter = STATE ? `&state=eq.${STATE}` : ''
  // Cast wide: anything with ABN + no email. The search-by-ABN endpoint is
  // cheap (one call per org), so probing non-ACNC ABNs only costs 1 req each
  // (detail call is skipped on miss). Worst case: lots of "ABN not found".
  console.log('→ Fetching CC orgs with ABN + missing email…')
  const allRows = await sbGet(
    `gs_entities?select=id,canonical_name,state,abn,email,phone,metadata,entity_type&is_community_controlled=eq.true&abn=not.is.null&email=is.null${stateFilter}`,
  )
  // Skip orgs we already probed in a previous run (idempotent re-run)
  const freshRows = allRows.filter((r) => !r.metadata?.contact_enrichment?.last_acnc_api_lookup)
  if (freshRows.length !== allRows.length) {
    console.log(`  ${allRows.length - freshRows.length} already probed — skipping`)
  }
  const rows = LIMIT ? freshRows.slice(0, LIMIT) : freshRows
  console.log(`  ${rows.length} candidates\n`)

  const enriched = []
  const notfound = []
  const nocontact = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    process.stdout.write(`\r  [${i + 1}/${rows.length}] ${row.canonical_name.slice(0, 55).padEnd(55)}`)
    const res = await lookupByAbn(row.abn)
    if (!res.found) notfound.push(row)
    else if (!res.contact.email && !res.contact.phone) nocontact.push(row)
    else {
      enriched.push({ row, contact: res.contact, uuid: res.uuid })
      if (VERBOSE) console.log(`\n    ✓ ${JSON.stringify(res.contact)}`)
    }
    await new Promise((res) => setTimeout(res, DELAY_MS))
  }
  process.stdout.write('\n\n')

  console.log('===== Plan =====')
  console.log(`  will enrich:   ${enriched.length}`)
  console.log(`  ABN not found: ${notfound.length}`)
  console.log(`  no contact:    ${nocontact.length}`)

  if (APPLY && enriched.length) {
    console.log(`\n→ Writing ${enriched.length} updates…`)
    let applied = 0, errors = 0
    for (const e of enriched) {
      try {
        const newMeta = {
          ...(e.row.metadata || {}),
          contact_enrichment: {
            ...(e.row.metadata?.contact_enrichment || {}),
            last_acnc_api_lookup: new Date().toISOString(),
            acnc_uuid: e.uuid,
          },
        }
        const changes = {
          metadata: newMeta,
          contact_source: 'acnc_api',
          updated_at: new Date().toISOString(),
        }
        if (!e.row.email && e.contact.email) changes.email = e.contact.email
        if (!e.row.phone && e.contact.phone) changes.phone = e.contact.phone
        await sbPatch(`gs_entities?id=eq.${e.row.id}`, changes)
        applied++
      } catch (err) { errors++; if (VERBOSE) console.error(`  ✗ ${e.row.id}: ${err.message}`) }
    }
    console.log(`  ✓ ${applied} patched, ${errors} errors`)
  } else if (!APPLY) {
    console.log('\n  (dry-run) re-run with --apply to write')
  }

  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  writeFileSync(
    join(AUDIT_DIR, `${stamp}-acnc-api.md`),
    [
      `# ACNC API per-charity enrichment — ${new Date().toISOString()}`,
      '',
      `Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`,
      `Candidates: ${rows.length}`,
      `Enriched: ${enriched.length}`,
      `ABN not found: ${notfound.length}`,
      `No contact in ACNC record: ${nocontact.length}`,
      '',
      '## Sample enrichments',
      ...enriched.slice(0, 20).map((e) => `- ${e.row.canonical_name} → ${JSON.stringify(e.contact)}`),
    ].join('\n'),
  )
  console.log(`✓ Audit: wiki/output/contact-enrichment/${stamp}-acnc-api.md`)
}

main().catch((err) => { console.error('[fatal]', err.message); process.exit(1) })
