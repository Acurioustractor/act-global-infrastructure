#!/usr/bin/env node
/**
 * gs_entities data-quality sweep.
 *
 * Three independent passes, each dry-run by default.
 *
 *   Pass 1 — tag deregistered ORIC corps as not-currently-operational.
 *            These are historical entities that shouldn't appear in any
 *            candidate query. Adds metadata.operational_status = 'deregistered'
 *            and sets is_community_controlled = false so they drop out of the
 *            active pool. Preserves the row + ORIC metadata for history.
 *
 *   Pass 2 — flag obvious junk rows: concat names >150 chars, multiple
 *            company-name suffixes, personal names lacking an org. Sets
 *            metadata.data_quality = 'junk' and is_community_controlled = false.
 *
 *   Pass 3 — flag government departments incorrectly marked community-controlled.
 *            Pattern-match "Department of", "Authority", "Office of" etc.
 *            Moves them to entity_type = 'government_body' and flips the flag.
 *
 * Usage
 * -----
 *   node scripts/gs-entities-data-quality-sweep.mjs             # dry-run all passes
 *   node scripts/gs-entities-data-quality-sweep.mjs --apply     # write
 *   node scripts/gs-entities-data-quality-sweep.mjs --pass=1    # dereg only
 *   node scripts/gs-entities-data-quality-sweep.mjs --pass=2    # junk only
 *   node scripts/gs-entities-data-quality-sweep.mjs --pass=3    # gov only
 *
 *   (combine flags freely: --pass=1 --pass=3 --apply)
 */

import 'dotenv/config'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const AUDIT_DIR = join(REPO_ROOT, 'wiki', 'output', 'data-quality')

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const VERBOSE = args.includes('--verbose')
const passFlags = args.filter((a) => a.startsWith('--pass=')).map((a) => a.split('=')[1])
const RUN_PASS_1 = passFlags.length === 0 || passFlags.includes('1')
const RUN_PASS_2 = passFlags.length === 0 || passFlags.includes('2')
const RUN_PASS_3 = passFlags.length === 0 || passFlags.includes('3')

try {
  const env = readFileSync(join(REPO_ROOT, '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const [k, ...rest] = line.split('=')
    if (k && rest.length && !process.env[k.trim()]) process.env[k.trim()] = rest.join('=').trim()
  }
} catch {}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!KEY) { console.error('[fatal] SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1) }

async function get(p) {
  const all = []
  let offset = 0
  while (true) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${p}&offset=${offset}&limit=1000`, {
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
  const r = await fetch(`${SUPA_URL}/rest/v1/${p}`, {
    method: 'PATCH',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(b),
  })
  if (!r.ok) throw new Error(`PATCH ${p}: ${r.status} ${await r.text()}`)
}

// ---- Pass 1: Deregistered ORIC corps ---------------------------------------

async function pass1() {
  console.log('\n===== Pass 1: Mark deregistered ORIC corps as not operational =====')
  const rows = await get(
    `gs_entities?select=id,canonical_name,metadata,is_community_controlled&is_community_controlled=eq.true&metadata->oric->>status=eq.Deregistered`,
  )
  console.log(`→ ${rows.length} deregistered ORIC corps currently flagged as community_controlled`)

  if (VERBOSE) for (const r of rows.slice(0, 5)) console.log(`  · ${r.canonical_name}`)

  if (!APPLY) {
    console.log(`  (dry-run) would flip is_community_controlled=false + add metadata.operational_status='deregistered' to ${rows.length} rows`)
    return { considered: rows.length, applied: 0 }
  }
  let applied = 0, errors = 0
  for (const r of rows) {
    try {
      const newMeta = {
        ...(r.metadata || {}),
        operational_status: 'deregistered',
        data_quality_pass: 'oric_deregistered_2026-04-20',
      }
      await patch(`gs_entities?id=eq.${r.id}`, {
        is_community_controlled: false,
        metadata: newMeta,
        updated_at: new Date().toISOString(),
      })
      applied++
    } catch (err) { errors++; if (VERBOSE) console.error(`  ✗ ${r.id}: ${err.message}`) }
  }
  console.log(`  ✓ ${applied} patched, ${errors} errors`)
  return { considered: rows.length, applied, errors }
}

// ---- Pass 2: Junk concat rows + personal names -----------------------------

function isJunk(row) {
  const name = row.canonical_name || ''
  // Long concat rows — multiple org suffixes mashed together
  if (name.length > 150) return { junk: true, reason: 'name_too_long' }
  // Two+ "Pty Ltd" / "Ltd" occurrences
  const ptyCount = (name.match(/\b(Pty\s+Ltd|Ltd)\b/gi) || []).length
  if (ptyCount >= 2) return { junk: true, reason: 'multiple_company_suffixes' }
  // Two+ "Australia" occurrences (hint of concat)
  const ausCount = (name.match(/\bAustralia\b/g) || []).length
  if (ausCount >= 3) return { junk: true, reason: 'multiple_australia_tokens' }
  // Personal-name patterns (Mr/Mrs/Ms/Dr with no org suffix)
  if (/^(Mr|Mrs|Ms|Dr)\s/.test(name) && !/(Corporation|Council|Association|Service|Authority|Centre|Center|Limited|Ltd|Incorporated|Inc|Co-op|Foundation)/i.test(name)) {
    return { junk: true, reason: 'personal_name_honorific' }
  }
  return { junk: false }
}

async function pass2() {
  console.log('\n===== Pass 2: Junk concat rows + personal names =====')
  const rows = await get(
    `gs_entities?select=id,canonical_name,metadata,is_community_controlled,entity_type&is_community_controlled=eq.true`,
  )
  const junk = rows.map((r) => ({ ...r, ...isJunk(r) })).filter((r) => r.junk)
  console.log(`→ ${junk.length} junk rows flagged (of ${rows.length} community_controlled)`)
  for (const r of junk.slice(0, 10)) console.log(`  · [${r.reason}] ${r.canonical_name.slice(0, 100)}`)

  if (!APPLY) {
    console.log(`  (dry-run) would flip is_community_controlled=false + add metadata.data_quality='junk' to ${junk.length} rows`)
    return { considered: junk.length, applied: 0 }
  }
  let applied = 0, errors = 0
  for (const r of junk) {
    try {
      const newMeta = {
        ...(r.metadata || {}),
        data_quality: 'junk',
        data_quality_reason: r.reason,
        data_quality_pass: 'junk_sweep_2026-04-20',
      }
      await patch(`gs_entities?id=eq.${r.id}`, {
        is_community_controlled: false,
        metadata: newMeta,
        updated_at: new Date().toISOString(),
      })
      applied++
    } catch (err) { errors++; if (VERBOSE) console.error(`  ✗ ${r.id}: ${err.message}`) }
  }
  console.log(`  ✓ ${applied} patched, ${errors} errors`)
  return { considered: junk.length, applied, errors }
}

// ---- Pass 3: Government departments mis-flagged ----------------------------

const GOV_PATTERNS = [
  /^Department of /i,
  /^Office of /i,
  /^Commonwealth /i,
  /^Australian Government /i,
  /Aboriginal Housing Office/i,
  /Aboriginal Areas Protection Authority/i,
  /Aboriginal Lands Trust/i,
  /National Commission for/i,
  /Ministry of /i,
  /Minister for /i,
]

function isGovDept(row) {
  const name = row.canonical_name || ''
  for (const p of GOV_PATTERNS) if (p.test(name)) return true
  return false
}

async function pass3() {
  console.log('\n===== Pass 3: Government depts mis-flagged as community_controlled =====')
  const rows = await get(
    `gs_entities?select=id,canonical_name,metadata,entity_type,is_community_controlled&is_community_controlled=eq.true`,
  )
  const gov = rows.filter(isGovDept)
  console.log(`→ ${gov.length} gov-dept rows mis-flagged`)
  for (const r of gov.slice(0, 10)) console.log(`  · [${r.entity_type}] ${r.canonical_name}`)

  if (!APPLY) {
    console.log(`  (dry-run) would flip is_community_controlled=false + set entity_type='government_body' on ${gov.length} rows`)
    return { considered: gov.length, applied: 0 }
  }
  let applied = 0, errors = 0
  for (const r of gov) {
    try {
      const newMeta = {
        ...(r.metadata || {}),
        data_quality_pass: 'gov_dept_reclassify_2026-04-20',
        previous_entity_type: r.entity_type,
      }
      await patch(`gs_entities?id=eq.${r.id}`, {
        is_community_controlled: false,
        entity_type: 'government_body',
        metadata: newMeta,
        updated_at: new Date().toISOString(),
      })
      applied++
    } catch (err) { errors++; if (VERBOSE) console.error(`  ✗ ${r.id}: ${err.message}`) }
  }
  console.log(`  ✓ ${applied} patched, ${errors} errors`)
  return { considered: gov.length, applied, errors }
}

// ---- Main ------------------------------------------------------------------

async function main() {
  console.log('===== gs_entities data-quality sweep =====')
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Passes: ${RUN_PASS_1 ? '1 ' : ''}${RUN_PASS_2 ? '2 ' : ''}${RUN_PASS_3 ? '3' : ''}`)

  const results = {}
  if (RUN_PASS_1) results.pass1 = await pass1()
  if (RUN_PASS_2) results.pass2 = await pass2()
  if (RUN_PASS_3) results.pass3 = await pass3()

  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  writeFileSync(
    join(AUDIT_DIR, `${stamp}-dq-sweep.md`),
    [
      `# gs_entities data-quality sweep — ${new Date().toISOString()}`,
      ``,
      `Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`,
      ``,
      `## Results`,
      JSON.stringify(results, null, 2),
    ].join('\n'),
  )
  console.log(`\n✓ Audit: wiki/output/data-quality/${stamp}-dq-sweep.md`)
}

main().catch((err) => { console.error('[fatal]', err.message); process.exit(1) })
