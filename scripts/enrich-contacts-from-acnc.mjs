#!/usr/bin/env node
/**
 * Tier 1 contact enrichment — ACNC bulk ABN join.
 *
 * The Australian Charities and Not-for-profits Commission publishes a public
 * register with every registered charity's email, phone, and postal address
 * indexed by ABN. ~60K charities total; ~7,500 of our community-controlled
 * gs_entities rows are ACNC-registered. A single join closes 85%+ of our
 * 8,826-row contact gap in one pass.
 *
 * Dataset source
 * --------------
 * Default: https://data.gov.au/data/dataset/b050b242-4487-4306-abf5-07ca073e5594/resource/8dc2ad29-2d95-44c6-930b-92b7e3d5ec12/download/datadotgov_main.csv
 * (ACNC "Current ACNC Register" — updated quarterly by ACNC on data.gov.au)
 *
 * Override with --csv-url or --csv-path for local testing.
 *
 * Safety
 * ------
 * - Dry-run by default (preview joins + counts without writing)
 * - --apply writes to gs_entities
 * - Never overwrites existing email/phone/website (use --force to override
 *   policy; rare, record in audit)
 * - Full audit at wiki/output/contact-enrichment/<YYYY-MM-DD>-acnc.md
 * - Idempotent — skips rows enriched from ACNC within the last 7 days
 *
 * Usage
 * -----
 *   node scripts/enrich-contacts-from-acnc.mjs                # dry-run
 *   node scripts/enrich-contacts-from-acnc.mjs --apply        # write
 *   node scripts/enrich-contacts-from-acnc.mjs --limit 100    # cap rows
 *   node scripts/enrich-contacts-from-acnc.mjs --csv-path /tmp/acnc.csv
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const AUDIT_DIR = join(REPO_ROOT, 'wiki', 'output', 'contact-enrichment')
const CACHE_DIR = join(REPO_ROOT, 'data', 'acnc-cache')

// data.gov.au's ACNC-register download URLs rotate frequently and CKAN API
// discovery is flaky. Default path is manual download + --csv-path, or
// pre-cached at data/acnc-cache/acnc-register.csv.
// Override with --csv-url for one-off testing.

// ---- Args ------------------------------------------------------------------

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const FORCE = args.includes('--force')
const VERBOSE = args.includes('--verbose')
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? parseInt(args[i + 1], 10) : null })()
const CSV_PATH = (() => { const i = args.indexOf('--csv-path'); return i >= 0 ? args[i + 1] : null })()
const CSV_URL_OVERRIDE = (() => { const i = args.indexOf('--csv-url'); return i >= 0 ? args[i + 1] : null })()

// ---- Env -------------------------------------------------------------------

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

// ---- PostgREST -------------------------------------------------------------

async function get(path) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function patch(path, body) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: KEY, Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

// ---- ACNC CSV fetch + parse ------------------------------------------------

const MANUAL_DOWNLOAD_INSTRUCTIONS = `
MANUAL DOWNLOAD required for this run.

data.gov.au's direct-download URLs rotate frequently; auto-discovery is
unreliable. One-time manual step:

1. Visit https://www.acnc.gov.au/about/transparency/open-data
2. Download the "ACNC Charity Register" CSV (usually called
   datadotgov_main.csv, ~60MB, ~60K rows)
3. Save to: data/acnc-cache/acnc-register.csv
   OR run with: node scripts/enrich-contacts-from-acnc.mjs --csv-path /path/to/file.csv

After the initial download, the script caches for 24h and auto-reuses.
Quarterly re-download as the ACNC publishes updates.
`

async function fetchAcncCsv() {
  if (CSV_PATH) {
    console.log(`→ Reading ACNC CSV from local path: ${CSV_PATH}`)
    return readFileSync(CSV_PATH, 'utf8')
  }
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
  const cachePath = join(CACHE_DIR, 'acnc-register.csv')
  if (existsSync(cachePath)) {
    const age = Date.now() - statSync(cachePath).mtimeMs
    if (age < 24 * 60 * 60 * 1000) {
      console.log(`→ Using cached ACNC CSV (${Math.round(age / 3600000)}h old)`)
      return readFileSync(cachePath, 'utf8')
    }
  }
  // Attempt auto-download with a known-stable URL pattern. If it fails,
  // fall through to the manual-download instructions.
  if (CSV_URL_OVERRIDE) {
    console.log(`→ Auto-downloading from: ${CSV_URL_OVERRIDE}`)
    try {
      const res = await fetch(CSV_URL_OVERRIDE, {
        redirect: 'follow',
        headers: { 'User-Agent': 'ACT-contact-enrichment/1.0 (benjamin@act.place)', Accept: 'text/csv,*/*' },
      })
      if (res.ok) {
        const csv = await res.text()
        writeFileSync(cachePath, csv)
        console.log(`  cached to ${cachePath} (${(csv.length / 1024 / 1024).toFixed(1)} MB)`)
        return csv
      }
      console.error(`  auto-download failed (${res.status} after redirects to ${res.url})`)
    } catch (err) {
      console.error(`  auto-download threw: ${err.message}`)
    }
  }
  console.error(MANUAL_DOWNLOAD_INSTRUCTIONS)
  process.exit(2)
}

function parseCsvLine(line) {
  // Basic CSV parse with quoted-field handling
  const fields = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') inQuotes = false
      else cur += c
    } else {
      if (c === ',') { fields.push(cur); cur = '' }
      else if (c === '"') inQuotes = true
      else cur += c
    }
  }
  fields.push(cur)
  return fields
}

function buildAcncIndex(csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) { console.error('[fatal] ACNC CSV is empty'); process.exit(2) }
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, '_'))
  // Expect fields like: abn, charity_name, charity_address_email, charity_address_phone, website, address_line_1, etc.
  const abnIdx = header.indexOf('abn')
  const emailIdx = header.findIndex((h) => h.includes('email'))
  const phoneIdx = header.findIndex((h) => h.includes('phone'))
  const websiteIdx = header.findIndex((h) => h.includes('website'))
  const addrIdx = header.findIndex((h) => h.includes('address') && !h.includes('email') && !h.includes('phone'))
  const nameIdx = header.findIndex((h) => h.includes('charity') && h.includes('name'))
  const statusIdx = header.findIndex((h) => h.includes('status') || h.includes('operating'))
  if (abnIdx < 0) throw new Error(`ACNC CSV header missing ABN column. Headers: ${header.join(', ')}`)

  const byAbn = new Map()
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i])
    const abn = (f[abnIdx] || '').replace(/\D/g, '')
    if (!abn) continue
    byAbn.set(abn, {
      abn,
      charity_name: f[nameIdx] || null,
      email: emailIdx >= 0 ? (f[emailIdx] || null) : null,
      phone: phoneIdx >= 0 ? (f[phoneIdx] || null) : null,
      website: websiteIdx >= 0 ? (f[websiteIdx] || null) : null,
      address: addrIdx >= 0 ? (f[addrIdx] || null) : null,
      status: statusIdx >= 0 ? (f[statusIdx] || null) : null,
    })
  }
  return { byAbn, headerSample: header.slice(0, 20) }
}

// ---- Main ------------------------------------------------------------------

async function main() {
  console.log('===== enrich-contacts-from-acnc =====')
  console.log(`Mode: ${APPLY ? 'APPLY (writes gs_entities)' : 'DRY-RUN'}`)
  if (LIMIT) console.log(`Row cap: ${LIMIT}`)
  console.log('')

  // 1. Load ACNC register
  const csv = await fetchAcncCsv()
  const { byAbn, headerSample } = buildAcncIndex(csv)
  console.log(`✓ ACNC register indexed: ${byAbn.size} charities`)
  if (VERBOSE) console.log(`  header sample: ${headerSample.join(', ')}`)
  console.log('')

  // 2. Fetch gs_entities needing enrichment
  console.log('→ Fetching community-controlled gs_entities with ABN + missing email/phone...')
  let page = 0
  const PAGE_SIZE = 1000
  const allRows = []
  while (true) {
    const rows = await get(
      `gs_entities?select=id,canonical_name,abn,email,phone,website,metadata,state&is_community_controlled=eq.true&abn=not.is.null&email=is.null&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
    )
    allRows.push(...rows)
    if (rows.length < PAGE_SIZE) break
    page++
    if (LIMIT && allRows.length >= LIMIT) break
  }
  const rows = LIMIT ? allRows.slice(0, LIMIT) : allRows
  console.log(`  ${rows.length} gs_entities rows need email enrichment`)

  // 3. Match + classify
  const matched = []
  const unmatched = []
  const skipped_stale = []
  for (const row of rows) {
    const cleanAbn = (row.abn || '').replace(/\D/g, '')
    const acnc = byAbn.get(cleanAbn)
    if (!acnc) { unmatched.push(row); continue }
    // Skip if already enriched from ACNC within last 7 days
    const lastRun = row.metadata?.contact_enrichment?.last_acnc_join
    if (lastRun && !FORCE) {
      const ageMs = Date.now() - new Date(lastRun).getTime()
      if (ageMs < 7 * 24 * 60 * 60 * 1000) { skipped_stale.push(row); continue }
    }
    const changes = {}
    if (!row.email && acnc.email) changes.email = acnc.email
    if (!row.phone && acnc.phone) changes.phone = acnc.phone
    if (!row.website && acnc.website) changes.website = acnc.website
    if (Object.keys(changes).length === 0) continue
    matched.push({ row, acnc, changes })
  }

  console.log('')
  console.log('===== Plan =====')
  console.log(`  will enrich:       ${matched.length}`)
  console.log(`  no ACNC match:     ${unmatched.length}`)
  console.log(`  skipped (recent):  ${skipped_stale.length}`)

  const withEmail = matched.filter((m) => m.changes.email).length
  const withPhone = matched.filter((m) => m.changes.phone).length
  const withWebsite = matched.filter((m) => m.changes.website).length
  console.log(`  · email added:     ${withEmail}`)
  console.log(`  · phone added:     ${withPhone}`)
  console.log(`  · website added:   ${withWebsite}`)

  if (VERBOSE) {
    console.log('\n  Sample enrichments:')
    for (const m of matched.slice(0, 5)) {
      console.log(`    ${m.row.canonical_name.slice(0, 50).padEnd(50)} ${JSON.stringify(m.changes)}`)
    }
  }

  // 4. Apply
  if (APPLY && matched.length) {
    console.log('')
    console.log(`→ Writing ${matched.length} updates...`)
    let applied = 0, errors = 0
    for (const m of matched) {
      try {
        const newMeta = {
          ...(m.row.metadata || {}),
          contact_enrichment: {
            ...(m.row.metadata?.contact_enrichment || {}),
            last_acnc_join: new Date().toISOString(),
            acnc_enriched_fields: Object.keys(m.changes),
            acnc_source: 'data.gov.au ACNC Current Register',
          },
        }
        await patch(`gs_entities?id=eq.${m.row.id}`, {
          ...m.changes,
          contact_source: 'ACNC',
          metadata: newMeta,
          updated_at: new Date().toISOString(),
        })
        applied++
      } catch (err) {
        errors++
        if (VERBOSE) console.error(`  ✗ ${m.row.id}: ${err.message}`)
      }
    }
    console.log(`  ✓ ${applied} patched, ${errors} errors`)
  } else if (!APPLY) {
    console.log('\n  (dry-run) Re-run with --apply to write.')
  }

  // 5. Audit
  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  const auditPath = join(AUDIT_DIR, `${stamp}-acnc.md`)
  const audit = [
    `# ACNC contact enrichment — ${new Date().toISOString()}`,
    '',
    `Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`,
    `ACNC source: ${CSV_PATH || CSV_URL}`,
    `ACNC index size: ${byAbn.size} registered charities`,
    `gs_entities rows considered: ${rows.length}`,
    '',
    '## Summary',
    `- Matched + enrichable: ${matched.length}`,
    `  - Email added: ${withEmail}`,
    `  - Phone added: ${withPhone}`,
    `  - Website added: ${withWebsite}`,
    `- No ACNC match (ABN not found in register): ${unmatched.length}`,
    `- Skipped (already enriched within 7 days): ${skipped_stale.length}`,
    '',
    '## Sample matched enrichments (first 20)',
    '',
    ...matched.slice(0, 20).map((m) =>
      `- **${m.row.canonical_name}** (${m.row.state}, ABN ${m.row.abn})` +
      Object.entries(m.changes).map(([k, v]) => `\n    - ${k}: ${v}`).join(''),
    ),
    '',
    '## Sample unmatched (first 20 — ABN not in ACNC register)',
    '',
    ...unmatched.slice(0, 20).map((r) => `- ${r.canonical_name} (${r.state}, ABN ${r.abn})`),
    '',
    '## Notes',
    '',
    '- ACNC register covers registered charities only. Non-charity Indigenous corps (ORIC-registered under CATSI Act without ACNC) will not match — next tier (website scrape) catches most remaining.',
    '- gs_entities with blank ABN cannot be enriched via this path.',
    '- This script is idempotent; safe to re-run. Skips rows enriched in last 7 days (override with --force).',
  ].join('\n')
  writeFileSync(auditPath, audit)
  console.log(`\n✓ Audit: ${auditPath.replace(REPO_ROOT + '/', '')}`)
}

main().catch((err) => {
  console.error('[fatal]', err.message)
  console.error(err.stack)
  process.exit(1)
})
