#!/usr/bin/env node
/**
 * Contact enrichment coordinator.
 *
 * Runs the three tiers in sequence:
 *   1. scripts/enrich-contacts-from-acnc.mjs     — bulk ABN join against ACNC
 *   2. scripts/enrich-contacts-from-website.mjs  — scrape contact pages
 *   3. scripts/enrich-contacts-via-agent.mjs     — emit research briefs for
 *      anything still missing
 *
 * Writes a consolidated report at wiki/output/contact-enrichment/<date>-summary.md
 * showing before/after coverage + per-tier yield + per-state breakdown.
 *
 * Usage
 * -----
 *   node scripts/enrich-contacts.mjs              # dry-run all three tiers
 *   node scripts/enrich-contacts.mjs --apply      # apply all three
 *   node scripts/enrich-contacts.mjs --acnc-only  # only tier 1
 *   node scripts/enrich-contacts.mjs --state QLD  # scope to one state
 */

import { spawnSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const AUDIT_DIR = join(REPO_ROOT, 'wiki', 'output', 'contact-enrichment')

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const ACNC_ONLY = args.includes('--acnc-only')
const WEBSITE_ONLY = args.includes('--website-only')
const AGENT_ONLY = args.includes('--agent-only')
const STATE = (() => { const i = args.indexOf('--state'); return i >= 0 ? args[i + 1] : null })()

try {
  const env = readFileSync(join(REPO_ROOT, '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const [k, ...rest] = line.split('=')
    if (k && rest.length && !process.env[k.trim()]) process.env[k.trim()] = rest.join('=').trim()
  }
} catch {}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function get(p) {
  const r = await fetch(`${URL}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  if (!r.ok) throw new Error(`GET ${p}: ${r.status}`)
  return r.json()
}

async function coverageSnapshot() {
  // Count contact coverage before/after
  const rows = await get('gs_entities?select=id,state,email,phone,website&is_community_controlled=eq.true&limit=10000')
  const stats = { total: rows.length, with_email: 0, with_phone: 0, with_website: 0, by_state: {} }
  for (const r of rows) {
    if (r.email) stats.with_email++
    if (r.phone) stats.with_phone++
    if (r.website) stats.with_website++
    const s = r.state || 'UNKNOWN'
    if (!stats.by_state[s]) stats.by_state[s] = { total: 0, email: 0 }
    stats.by_state[s].total++
    if (r.email) stats.by_state[s].email++
  }
  return stats
}

function run(script, extraArgs) {
  const cmd = ['node', join(REPO_ROOT, 'scripts', script), ...extraArgs]
  if (APPLY) cmd.push('--apply')
  if (STATE) cmd.push('--state', STATE)
  console.log(`\n$ ${cmd.join(' ')}`)
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit', cwd: REPO_ROOT })
  return r.status === 0
}

async function main() {
  console.log('====== Contact Enrichment Coordinator ======')
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  if (STATE) console.log(`State: ${STATE}`)
  console.log('')

  const before = await coverageSnapshot()
  console.log('Coverage BEFORE:')
  console.log(`  Total community-controlled orgs: ${before.total}`)
  console.log(`  With email:    ${before.with_email} (${Math.round(before.with_email * 100 / before.total)}%)`)
  console.log(`  With phone:    ${before.with_phone} (${Math.round(before.with_phone * 100 / before.total)}%)`)
  console.log(`  With website:  ${before.with_website} (${Math.round(before.with_website * 100 / before.total)}%)`)

  const runTier1 = !WEBSITE_ONLY && !AGENT_ONLY
  const runTier2 = !ACNC_ONLY && !AGENT_ONLY
  const runTier3 = !ACNC_ONLY && !WEBSITE_ONLY

  if (runTier1) {
    console.log('\n--- Tier 1: ACNC bulk join ---')
    run('enrich-contacts-from-acnc.mjs', [])
  }
  if (runTier2) {
    console.log('\n--- Tier 2: Website scrape ---')
    run('enrich-contacts-from-website.mjs', [])
  }
  if (runTier3) {
    console.log('\n--- Tier 3: Agent research briefs (emit only; no writes in this tier from coordinator) ---')
    run('enrich-contacts-via-agent.mjs', [])
  }

  const after = await coverageSnapshot()
  console.log('\n====== Summary ======')
  console.log(`Email added:    ${after.with_email - before.with_email} (${before.with_email} → ${after.with_email})`)
  console.log(`Phone added:    ${after.with_phone - before.with_phone} (${before.with_phone} → ${after.with_phone})`)
  console.log(`Website added:  ${after.with_website - before.with_website} (${before.with_website} → ${after.with_website})`)

  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  writeFileSync(join(AUDIT_DIR, `${stamp}-summary.md`), [
    `# Contact enrichment summary — ${new Date().toISOString()}`,
    '',
    `Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} | State: ${STATE || 'all'}`,
    '',
    '## Coverage before',
    `- Total: ${before.total}`,
    `- With email: ${before.with_email} (${Math.round(before.with_email*100/before.total)}%)`,
    `- With phone: ${before.with_phone} (${Math.round(before.with_phone*100/before.total)}%)`,
    `- With website: ${before.with_website} (${Math.round(before.with_website*100/before.total)}%)`,
    '',
    '## Coverage after',
    `- With email: ${after.with_email} (+${after.with_email - before.with_email})`,
    `- With phone: ${after.with_phone} (+${after.with_phone - before.with_phone})`,
    `- With website: ${after.with_website} (+${after.with_website - before.with_website})`,
    '',
    '## Per-state coverage (after)',
    '',
    '| State | Total | With email |',
    '|---|---|---|',
    ...Object.entries(after.by_state).sort().map(([s, v]) =>
      `| ${s} | ${v.total} | ${v.email} (${Math.round(v.email*100/v.total)}%) |`,
    ),
    '',
  ].join('\n'))
  console.log(`\n✓ Summary: ${join(AUDIT_DIR, `${stamp}-summary.md`).replace(REPO_ROOT+'/','')}`)
}

main().catch((err) => { console.error('[fatal]', err.message); process.exit(1) })
