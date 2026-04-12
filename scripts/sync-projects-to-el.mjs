#!/usr/bin/env node
/**
 * Sync Project Codes → Empathy Ledger v2
 *
 * Source of truth: config/project-codes.json
 * Target: EL v2 Supabase (projects table, ACT organization)
 *
 * What it does:
 *   1. Reads canonical project list from config
 *   2. Queries EL v2 for existing ACT org projects
 *   3. Reports: missing projects, code mismatches, untagged projects
 *   4. With --fix: creates missing projects and corrects code mismatches
 *   5. With --fix-codes: only fix code mismatches (no creates)
 *
 * Usage:
 *   node scripts/sync-projects-to-el.mjs              # dry run (report only)
 *   node scripts/sync-projects-to-el.mjs --fix        # create missing + fix codes
 *   node scripts/sync-projects-to-el.mjs --fix-codes  # fix codes only
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// ---- Config ----------------------------------------------------------------

// Load EL v2 env vars
const EL_ENV_PATH = join(process.env.HOME, 'Code/empathy-ledger-v2/.env.local')
try {
  const elEnv = readFileSync(EL_ENV_PATH, 'utf8')
  for (const line of elEnv.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length > 0 && !process.env[`EL_${key}`]) {
      process.env[`EL_${key}`] = rest.join('=').trim()
    }
  }
} catch { console.warn('Could not load EL v2 .env.local') }

const EL_SUPABASE_URL = process.env.EL_NEXT_PUBLIC_SUPABASE_URL || 'https://yvnuayzslukamizrlhwb.supabase.co'
const SERVICE_KEY = process.env.EL_SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE_KEY) { console.error('Missing EL Supabase service role key'); process.exit(1) }

const ACT_ORG_ID = 'db0de7bd-eb10-446b-99e9-0f3b7c199b8a'
const ACT_TENANT_ID = '5f1314c1-ffe9-4d8f-944b-6cdf02d4b943'

// Skip these — meta projects or orgs that exist separately in EL v2
const SKIP_CODES = new Set([
  'ACT-IN',    // ACT Infrastructure — meta, not a real project
  'ACT-CORE',  // ACT Regenerative Studio — meta
])

// These are their own orgs in EL v2 — don't create as ACT projects
const ORG_LEVEL_CODES = new Set([
  'ACT-PI',    // PICC — exists as org palm-island-community-company
  'ACT-OO',    // Oonchiumpa — exists as org oonchiumpa
  'ACT-SM',    // SMART — exists as org smart-recovery
  'ACT-BG',    // BG Fit — exists as org bg-fit
])

const args = process.argv.slice(2)
const FIX = args.includes('--fix')
const FIX_CODES = args.includes('--fix-codes') || FIX

// ---- REST helpers ----------------------------------------------------------

async function restGet(table, params) {
  const res = await fetch(`${EL_SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`GET ${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function restPost(table, data) {
  const res = await fetch(`${EL_SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`POST ${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function restPatch(table, filter, data) {
  const res = await fetch(`${EL_SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`PATCH ${table}: ${res.status} ${await res.text()}`)
}

// ---- Main ------------------------------------------------------------------

async function main() {
  // Load canonical config
  const config = JSON.parse(readFileSync(join(process.cwd(), 'config/project-codes.json'), 'utf8'))
  const canonical = config.projects || {}

  // Filter to active/ideation ACT projects, skip meta/org-level
  const activeProjects = Object.entries(canonical)
    .filter(([code, p]) => typeof p === 'object'
      && ['active', 'ideation'].includes(p.status)
      && !SKIP_CODES.has(code))
    .map(([code, p]) => ({ code, ...p }))

  console.log(`Canonical config: ${activeProjects.length} active/ideation projects`)

  // Load ALL EL v2 projects with act_project_code (across all orgs)
  const elProjects = await restGet('projects',
    'select=id,name,slug,act_project_code,organization_id,status&limit=500')

  const elByCode = new Map()
  const elByName = new Map()
  for (const p of elProjects) {
    if (p.act_project_code) elByCode.set(p.act_project_code, p)
    elByName.set(p.name.toLowerCase(), p)
  }

  console.log(`EL v2: ${elProjects.length} total projects, ${elByCode.size} with codes\n`)

  // ---- Analysis ----

  const missing = []       // In config, not in EL v2 at all
  const codeMismatch = []  // In EL v2 but with different code
  const matched = []       // Perfectly matched

  for (const cp of activeProjects) {
    // Org-level codes — these are separate orgs, not ACT projects
    if (ORG_LEVEL_CODES.has(cp.code)) {
      console.log(`  [org]  ${cp.code.padEnd(15)} ${cp.name} (separate org in EL v2)`)
      continue
    }

    // Exact code match
    if (elByCode.has(cp.code)) {
      matched.push({ config: cp, el: elByCode.get(cp.code) })
      continue
    }

    // Try to find by exact name match
    const nameKey = cp.name.toLowerCase()
    let foundByName = elByName.get(nameKey)

    // Try slug-based match (e.g. "the-confessional" vs "The Confessional")
    if (!foundByName && cp.canonical_slug) {
      const slugName = cp.canonical_slug.replace(/-/g, ' ')
      foundByName = elByName.get(slugName)
    }

    if (foundByName && foundByName.act_project_code && foundByName.act_project_code !== cp.code) {
      codeMismatch.push({ config: cp, el: foundByName })
    } else if (foundByName && !foundByName.act_project_code) {
      codeMismatch.push({ config: cp, el: foundByName, needsCode: true })
    } else {
      missing.push(cp)
    }
  }

  // ---- Report ----

  console.log(`MATCHED: ${matched.length}`)
  for (const m of matched) {
    const orgNote = m.el.organization_id === ACT_ORG_ID ? '' : ' (partner org)'
    console.log(`  ${m.config.code.padEnd(15)} ${m.el.name}${orgNote}`)
  }

  if (codeMismatch.length > 0) {
    console.log(`\nCODE MISMATCHES: ${codeMismatch.length}`)
    for (const m of codeMismatch) {
      const elCode = m.el.act_project_code || '(none)'
      console.log(`  ${m.config.code.padEnd(15)} config="${m.config.name}" → EL="${m.el.name}" (EL code: ${elCode})`)
    }
  }

  if (missing.length > 0) {
    console.log(`\nMISSING FROM EL v2: ${missing.length}`)
    for (const m of missing) {
      console.log(`  ${m.code.padEnd(15)} ${m.name} (${m.tier || '?'})`)
    }
  }

  // ---- Fixes ----

  if (FIX_CODES && codeMismatch.length > 0) {
    console.log(`\n--- Fixing ${codeMismatch.length} code mismatches ---`)
    for (const m of codeMismatch) {
      try {
        await restPatch('projects', `id=eq.${m.el.id}`, { act_project_code: m.config.code })
        console.log(`  Fixed: ${m.el.name} → ${m.config.code} (was ${m.el.act_project_code || 'null'})`)
      } catch (err) {
        console.error(`  Error fixing ${m.el.name}: ${err.message}`)
      }
    }
  }

  if (FIX && missing.length > 0) {
    console.log(`\n--- Creating ${missing.length} missing projects ---`)
    for (const m of missing) {
      const slug = m.canonical_slug || m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
      const row = {
        name: m.name,
        slug,
        description: m.description || null,
        status: 'active',
        act_project_code: m.code,
        organization_id: ACT_ORG_ID,
        tenant_id: ACT_TENANT_ID,
      }
      try {
        const created = await restPost('projects', row)
        const id = Array.isArray(created) ? created[0]?.id : created?.id
        console.log(`  Created: ${m.code} "${m.name}" → ${id?.slice(0, 8)}..`)
      } catch (err) {
        console.error(`  Error creating ${m.code}: ${err.message}`)
      }
    }
  }

  if (!FIX && !FIX_CODES && (codeMismatch.length > 0 || missing.length > 0)) {
    console.log(`\nDry run — use --fix to create missing + fix codes, or --fix-codes to fix codes only`)
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
