#!/usr/bin/env node
/**
 * Backfill missing ABNs on gs_entities by fuzzy matching against ACNC register.
 *
 * Target: community-controlled orgs with ORIC ICN but no ABN. Many of these
 * also hold ACNC registration (charity + corp dual registered). We can
 * recover the ABN by matching normalized name + state against the 65K-row
 * ACNC bulk CSV.
 *
 * Matching rules (in order, first match wins):
 *   1. Exact normalized-name match in same state
 *   2. Normalized-name match anywhere (if name is distinctive enough, length > 25)
 *   3. Name match after stripping "Aboriginal Corporation", "RNTBC", quotes
 *
 * Safety:
 *   - Dry-run default. --apply to write.
 *   - Audit every candidate match for human review
 *   - Never overwrite existing ABN
 *   - metadata.abn_backfill block records source + confidence
 *
 * Usage
 * -----
 *   node scripts/backfill-abn-from-acnc-fuzzy.mjs              # dry-run
 *   node scripts/backfill-abn-from-acnc-fuzzy.mjs --apply
 *   node scripts/backfill-abn-from-acnc-fuzzy.mjs --verbose
 */

import 'dotenv/config'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const CSV_PATH = join(REPO_ROOT, 'data', 'acnc-cache', 'acnc-register.csv')
const AUDIT_DIR = join(REPO_ROOT, 'wiki', 'output', 'data-quality')

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const VERBOSE = args.includes('--verbose')

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

// ---- CSV parsing + ACNC indexing -------------------------------------------

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

function normalizeName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/["""''']/g, '')
    .replace(/\baboriginal corporation\b/g, '')
    .replace(/\btorres strait islanders?\b/g, '')
    .replace(/\baboriginal and torres strait islanders?\b/g, '')
    .replace(/\baboriginal\b/g, '')
    .replace(/\bindigenous corporation\b/g, '')
    .replace(/\bindigenous\b/g, '')
    .replace(/\brntbc\b/g, '')
    .replace(/\bpty\s+ltd\b|\bltd\b|\blimited\b|\bincorporated\b|\binc\b/g, '')
    .replace(/\b(pbc|cla)\b/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildAcncIndex(csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim())
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]+/g, '_'))
  const col = (n) => header.indexOf(n)
  const abnIdx = col('abn'), nameIdx = col('charity_legal_name'), stateIdx = col('state')
  const byNormState = new Map()
  const byNormGlobal = new Map()
  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i])
    const abn = (f[abnIdx] || '').replace(/\D/g, '')
    const name = f[nameIdx] || ''
    const state = (f[stateIdx] || '').toUpperCase().trim()
    const norm = normalizeName(name)
    if (!abn || !norm) continue
    const sKey = `${norm}|${state}`
    if (!byNormState.has(sKey)) byNormState.set(sKey, { abn, name, state })
    if (!byNormGlobal.has(norm)) byNormGlobal.set(norm, [])
    byNormGlobal.get(norm).push({ abn, name, state })
  }
  return { byNormState, byNormGlobal }
}

// ---- Supabase helpers ------------------------------------------------------

async function get(p) {
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

async function patch(p, b) {
  const r = await fetch(`${SUPA}/rest/v1/${p}`, {
    method: 'PATCH',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(b),
  })
  if (!r.ok) throw new Error(`PATCH ${p}: ${r.status} ${await r.text()}`)
}

// ---- Matcher ---------------------------------------------------------------

function findMatch(row, idx) {
  const norm = normalizeName(row.canonical_name)
  if (!norm || norm.length < 6) return null
  const state = (row.state || '').toUpperCase().trim()
  // Tier 1: exact norm + state match
  const k1 = `${norm}|${state}`
  const h1 = idx.byNormState.get(k1)
  if (h1) return { abn: h1.abn, acnc_name: h1.name, confidence: 'high', method: 'name+state' }
  // Tier 2: norm match in any state, name must be distinctive (>= 25 chars)
  if (norm.length >= 25) {
    const h2 = idx.byNormGlobal.get(norm)
    if (h2 && h2.length === 1) return { abn: h2[0].abn, acnc_name: h2[0].name, confidence: 'medium', method: 'name-only-distinctive' }
    if (h2 && h2.length > 1) return null // ambiguous, skip
  }
  return null
}

// ---- Main ------------------------------------------------------------------

async function main() {
  console.log('===== backfill-abn-from-acnc-fuzzy =====')
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)

  console.log('→ Indexing ACNC register…')
  if (!existsSync(CSV_PATH)) { console.error(`[fatal] ACNC CSV not found at ${CSV_PATH}`); process.exit(2) }
  const csv = readFileSync(CSV_PATH, 'utf8')
  const idx = buildAcncIndex(csv)
  console.log(`  ACNC byNormState entries: ${idx.byNormState.size}`)
  console.log(`  ACNC byNormGlobal entries: ${idx.byNormGlobal.size}\n`)

  console.log('→ Fetching community-controlled rows with active ORIC ICN + no ABN…')
  const rows = await get(
    `gs_entities?select=id,canonical_name,state,metadata&is_community_controlled=eq.true&abn=is.null&metadata->oric->>status=neq.Deregistered&metadata->oric->>icn=not.is.null`,
  )
  console.log(`  ${rows.length} candidates\n`)

  const matched = []
  const unmatched = []
  for (const row of rows) {
    const m = findMatch(row, idx)
    if (m) matched.push({ row, match: m })
    else unmatched.push(row)
  }

  console.log('===== Plan =====')
  console.log(`  matched:   ${matched.length}`)
  console.log(`  unmatched: ${unmatched.length}`)
  console.log(`  by confidence: high=${matched.filter(x=>x.match.confidence==='high').length} medium=${matched.filter(x=>x.match.confidence==='medium').length}`)

  if (VERBOSE || !APPLY) {
    console.log('\nSample matches:')
    for (const m of matched.slice(0, 10)) {
      console.log(`  [${m.match.confidence}] ${m.row.canonical_name}  →  ABN ${m.match.abn}  (${m.match.acnc_name})`)
    }
  }

  if (APPLY && matched.length) {
    console.log(`\n→ Writing ${matched.length} ABNs…`)
    let backfilled = 0, duplicates = 0, errors = 0
    for (const m of matched) {
      try {
        const newMeta = {
          ...(m.row.metadata || {}),
          abn_backfill: {
            source: 'acnc_fuzzy',
            confidence: m.match.confidence,
            method: m.match.method,
            matched_acnc_name: m.match.acnc_name,
            backfilled_at: new Date().toISOString(),
          },
        }
        await patch(`gs_entities?id=eq.${m.row.id}`, {
          abn: m.match.abn,
          metadata: newMeta,
          updated_at: new Date().toISOString(),
        })
        backfilled++
      } catch (err) {
        if (err.message.includes('23505') || err.message.includes('duplicate key')) {
          // ABN already exists on a canonical row. Mark THIS row as a duplicate.
          try {
            const canonRes = await fetch(`${SUPA}/rest/v1/gs_entities?select=id&abn=eq.${m.match.abn}`, {
              headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
            })
            const [canon] = await canonRes.json()
            const newMeta = {
              ...(m.row.metadata || {}),
              duplicate_of: canon?.id || null,
              duplicate_detected_via: 'abn_fuzzy_match_collision',
              duplicate_abn: m.match.abn,
              duplicate_detected_at: new Date().toISOString(),
            }
            await patch(`gs_entities?id=eq.${m.row.id}`, {
              is_community_controlled: false,
              metadata: newMeta,
              updated_at: new Date().toISOString(),
            })
            duplicates++
          } catch (err2) { errors++; if (VERBOSE) console.error(`  ✗ dedup-${m.row.id}: ${err2.message}`) }
        } else { errors++; if (VERBOSE) console.error(`  ✗ ${m.row.id}: ${err.message}`) }
      }
    }
    console.log(`  ✓ backfilled: ${backfilled}`)
    console.log(`  ✓ marked as duplicate-of-canonical: ${duplicates}`)
    console.log(`  ✗ errors: ${errors}`)
  } else if (!APPLY) {
    console.log('\n  (dry-run) re-run with --apply to write')
  }

  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  writeFileSync(
    join(AUDIT_DIR, `${stamp}-abn-backfill.md`),
    [
      `# ABN backfill via ACNC fuzzy match — ${new Date().toISOString()}`,
      '',
      `Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`,
      `Candidates: ${rows.length}`,
      `Matched: ${matched.length}`,
      `Unmatched: ${unmatched.length}`,
      '',
      '## All matches (first 50)',
      ...matched.slice(0, 50).map((m) => `- [${m.match.confidence}] ${m.row.canonical_name} → ABN ${m.match.abn} (ACNC: ${m.match.acnc_name})`),
      '',
      '## Unmatched sample (first 50)',
      ...unmatched.slice(0, 50).map((r) => `- ${r.canonical_name} (${r.state || '??'})`),
    ].join('\n'),
  )
  console.log(`\n✓ Audit: wiki/output/data-quality/${stamp}-abn-backfill.md`)
}

main().catch((err) => { console.error('[fatal]', err.message); process.exit(1) })
