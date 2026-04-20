#!/usr/bin/env node
/**
 * Backfill missing ABNs from the ORIC bulk CSV (data.gov.au).
 *
 * ORIC publishes a complete monthly CSV of every registered Aboriginal /
 * Torres Strait Islander corporation under the CATSI Act, including ABN,
 * financials (income / assets / employees for 2023-2025), corporation size,
 * status, registered/deregistered dates, and ORIC URL.
 *
 * We already hold ORIC ICN in metadata.oric.icn for most indigenous_corp
 * rows — missing is just the ABN (and financial data we've never ingested).
 *
 * This script keys on ICN and:
 *   1. Backfills ABN where it's missing
 *   2. Enriches metadata.oric with corporation_size, 2023-25 financials, URL
 *
 * Safety: dedup collision handled like backfill-abn-from-acnc-fuzzy — if the
 * target ABN already exists on a different row, mark the current row as a
 * duplicate-of-canonical.
 *
 * Usage
 * -----
 *   node scripts/backfill-abn-from-oric.mjs              # dry-run
 *   node scripts/backfill-abn-from-oric.mjs --apply
 *   node scripts/backfill-abn-from-oric.mjs --limit 20   # test on a small set
 */

import 'dotenv/config'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const CSV_PATH = join(REPO_ROOT, 'data', 'oric-cache', 'oric-register.csv')
const AUDIT_DIR = join(REPO_ROOT, 'wiki', 'output', 'data-quality')

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const VERBOSE = args.includes('--verbose')
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? parseInt(args[i + 1], 10) : null })()

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

// ---- CSV helpers -----------------------------------------------------------

function parseCsvLine(line) {
  const out = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') inQ = false
      else cur += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') { out.push(cur); cur = '' }
      else cur += c
    }
  }
  out.push(cur)
  return out
}

function buildIndex(csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim())
  const header = parseCsvLine(lines[0])
  const col = (name) => header.indexOf(name)
  const icnIdx = col('ICN')
  const nameIdx = col('Corporation Name')
  const statusIdx = col('Status Reason')
  const regIdx = col('Registered On')
  const deregIdx = col('Deregistered On')
  const sizeIdx = col('Corporation Size')
  const abnIdx = col('ABN')
  const stateIdx = col('State/Territory (Main place of business) (Address)')
  const postcodeIdx = col('Postcode (Main place of business) (Address)')
  const industryIdx = col('Industry Sector(s)')
  const acncIdx = col('Corporation registered with ACNC?')
  const income25Idx = col('2025 Total Income')
  const assets25Idx = col('2025 Total Assets')
  const employees25Idx = col('2025 Number of Employees')
  const income24Idx = col('2024 Total Income')
  const assets24Idx = col('2024 Total Assets')
  const employees24Idx = col('2024 Number of Employees')
  const income23Idx = col('2023 Total Income')
  const assets23Idx = col('2023 Total Assets')
  const employees23Idx = col('2023 Number of Employees')
  const urlIdx = col('URL')

  const byIcn = new Map()
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i])
    const icn = (f[icnIdx] || '').trim()
    if (!icn) continue
    const abn = (f[abnIdx] || '').replace(/\D/g, '')
    byIcn.set(icn, {
      icn,
      name: f[nameIdx] || '',
      status: f[statusIdx] || null,
      registered_on: f[regIdx] || null,
      deregistered_on: f[deregIdx] || null,
      corporation_size: f[sizeIdx] || null,
      abn: abn || null,
      state: f[stateIdx] || null,
      postcode: f[postcodeIdx] || null,
      industry_sectors: f[industryIdx] || null,
      registered_with_acnc: f[acncIdx] === 'Yes',
      financials: {
        '2025': { income: f[income25Idx] || null, assets: f[assets25Idx] || null, employees: f[employees25Idx] || null },
        '2024': { income: f[income24Idx] || null, assets: f[assets24Idx] || null, employees: f[employees24Idx] || null },
        '2023': { income: f[income23Idx] || null, assets: f[assets23Idx] || null, employees: f[employees23Idx] || null },
      },
      url: f[urlIdx] || null,
    })
  }
  return byIcn
}

// ---- Supabase helpers ------------------------------------------------------

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

// ---- Main ------------------------------------------------------------------

async function main() {
  console.log('===== backfill-abn-from-oric =====')
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)

  if (!existsSync(CSV_PATH)) { console.error(`[fatal] ORIC CSV not found at ${CSV_PATH}. Download from data.gov.au first.`); process.exit(2) }
  console.log('→ Indexing ORIC register…')
  const csv = readFileSync(CSV_PATH, 'utf8')
  const byIcn = buildIndex(csv)
  console.log(`  ${byIcn.size} corporations indexed\n`)

  console.log('→ Fetching gs_entities rows with ORIC ICN…')
  const allRows = await sbGet(
    `gs_entities?select=id,canonical_name,abn,state,metadata&metadata->oric->>icn=not.is.null`,
  )
  const rows = LIMIT ? allRows.slice(0, LIMIT) : allRows
  console.log(`  ${rows.length} candidates\n`)

  const toBackfill = []
  const toEnrichOnly = []
  const missingFromOric = []
  for (const row of rows) {
    const icn = row.metadata?.oric?.icn
    const oric = byIcn.get(icn)
    if (!oric) { missingFromOric.push(row); continue }
    if (!row.abn && oric.abn) {
      toBackfill.push({ row, oric })
    } else {
      toEnrichOnly.push({ row, oric })
    }
  }

  console.log('===== Plan =====')
  console.log(`  ABN to backfill:      ${toBackfill.length}`)
  console.log(`  enrich-only (already has ABN): ${toEnrichOnly.length}`)
  console.log(`  ICN not in current ORIC CSV:   ${missingFromOric.length}`)

  if (VERBOSE) {
    console.log('\nSample backfill targets:')
    for (const t of toBackfill.slice(0, 8)) {
      console.log(`  ICN ${t.oric.icn}  ${t.row.canonical_name}  →  ABN ${t.oric.abn}  (${t.oric.corporation_size})`)
    }
  }

  if (!APPLY) {
    console.log('\n  (dry-run) re-run with --apply to write')
    return { toBackfill: toBackfill.length, toEnrichOnly: toEnrichOnly.length, missingFromOric: missingFromOric.length }
  }

  let backfilled = 0, duplicates = 0, enriched = 0, errors = 0
  // Backfill ABN + enrich metadata
  for (const t of toBackfill) {
    const newMeta = {
      ...(t.row.metadata || {}),
      oric: {
        ...(t.row.metadata?.oric || {}),
        abn: t.oric.abn,
        corporation_size: t.oric.corporation_size,
        state: t.oric.state,
        postcode: t.oric.postcode,
        industry_sectors: t.oric.industry_sectors,
        registered_with_acnc: t.oric.registered_with_acnc,
        financials: t.oric.financials,
        url: t.oric.url,
        last_oric_refresh: new Date().toISOString(),
      },
      abn_backfill: {
        source: 'oric_bulk_csv',
        backfilled_at: new Date().toISOString(),
      },
    }
    try {
      await sbPatch(`gs_entities?id=eq.${t.row.id}`, { abn: t.oric.abn, metadata: newMeta, updated_at: new Date().toISOString() })
      backfilled++
    } catch (err) {
      if (err.message.includes('23505') || err.message.includes('duplicate key')) {
        try {
          const canonRes = await fetch(`${SUPA}/rest/v1/gs_entities?select=id&abn=eq.${t.oric.abn}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
          const [canon] = await canonRes.json()
          const dedupMeta = {
            ...(t.row.metadata || {}),
            duplicate_of: canon?.id || null,
            duplicate_detected_via: 'oric_abn_backfill_collision',
            duplicate_abn: t.oric.abn,
            duplicate_detected_at: new Date().toISOString(),
          }
          await sbPatch(`gs_entities?id=eq.${t.row.id}`, { is_community_controlled: false, metadata: dedupMeta, updated_at: new Date().toISOString() })
          duplicates++
        } catch (err2) { errors++; if (VERBOSE) console.error(`  ✗ dedup-${t.row.id}: ${err2.message}`) }
      } else { errors++; if (VERBOSE) console.error(`  ✗ ${t.row.id}: ${err.message}`) }
    }
  }
  // Enrich-only (already has ABN, just update oric metadata + financials)
  for (const t of toEnrichOnly) {
    const newMeta = {
      ...(t.row.metadata || {}),
      oric: {
        ...(t.row.metadata?.oric || {}),
        corporation_size: t.oric.corporation_size,
        state: t.oric.state,
        postcode: t.oric.postcode,
        industry_sectors: t.oric.industry_sectors,
        registered_with_acnc: t.oric.registered_with_acnc,
        financials: t.oric.financials,
        url: t.oric.url,
        last_oric_refresh: new Date().toISOString(),
      },
    }
    try {
      await sbPatch(`gs_entities?id=eq.${t.row.id}`, { metadata: newMeta, updated_at: new Date().toISOString() })
      enriched++
    } catch (err) { errors++; if (VERBOSE) console.error(`  ✗ ${t.row.id}: ${err.message}`) }
  }

  console.log(`\n  ✓ ABN backfilled:     ${backfilled}`)
  console.log(`  ✓ duplicates merged:  ${duplicates}`)
  console.log(`  ✓ metadata enriched:  ${enriched}`)
  console.log(`  ✗ errors:             ${errors}`)

  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  writeFileSync(
    join(AUDIT_DIR, `${stamp}-oric-backfill.md`),
    [
      `# ORIC ABN backfill + metadata enrichment — ${new Date().toISOString()}`,
      ``,
      `Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`,
      `CSV candidates: ${byIcn.size}`,
      `gs_entities with ICN: ${rows.length}`,
      ``,
      `- ABN backfilled: ${backfilled}`,
      `- Duplicates merged: ${duplicates}`,
      `- Metadata enriched (already had ABN): ${enriched}`,
      `- ICN not in current CSV: ${missingFromOric.length}`,
      `- Errors: ${errors}`,
    ].join('\n'),
  )
  console.log(`\n✓ Audit: wiki/output/data-quality/${stamp}-oric-backfill.md`)
}

main().catch((err) => { console.error('[fatal]', err.message); process.exit(1) })
