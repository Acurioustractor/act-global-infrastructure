#!/usr/bin/env node
/**
 * el-stories adapter — pull stories from Empathy Ledger v2 with strict
 * consent enforcement.
 *
 * EL v2 lives on a different Supabase instance (yvnuayzslukamizrlhwb).
 * Connection requires its own env vars.
 *
 * CONSENT RULE:
 *   - consent_scope: 'public'         → safe to use as a public claim variant
 *   - consent_scope: 'with-care'      → safe to use, but tag the digest with the constraint
 *   - consent_scope: 'internal-only'  → DO NOT EMIT. Refuse the row entirely.
 *   - any other / null                → DO NOT EMIT (default deny)
 *
 * The ingest digest tags every emitted item with its consent level so that
 * downstream draft scripts can refuse to lift a 'with-care' quote into a
 * mass-broadcast post.
 *
 * Schema discovery:
 *   This script queries information_schema first to confirm column names
 *   before selecting — per project schema-first rule. If the table is missing
 *   or column names differ, it prints the actual schema and exits.
 *
 * Usage:
 *   node scripts/narrative-adapters/el-stories.mjs [--since YYYY-MM-DD] [--project <slug>]
 *
 * Env required:
 *   EMPATHY_LEDGER_SUPABASE_URL    (e.g. https://yvnuayzslukamizrlhwb.supabase.co)
 *   EMPATHY_LEDGER_SUPABASE_KEY    (service role for read-only)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { tmpdir } from 'os'

const ROOT = process.cwd()
const TMP = join(tmpdir(), 'narrative-adapter-el-stories')
mkdirSync(TMP, { recursive: true })

const args = process.argv.slice(2)
const flag = (n) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 && i + 1 < args.length && !args[i + 1].startsWith('--') ? args[i + 1] : null
}
const since = flag('since')
const projectOverride = flag('project')

const url = process.env.EMPATHY_LEDGER_SUPABASE_URL
const key = process.env.EMPATHY_LEDGER_SUPABASE_KEY

if (!url || !key) {
  console.error('[el-stories] missing EMPATHY_LEDGER_SUPABASE_URL or EMPATHY_LEDGER_SUPABASE_KEY')
  console.error('  Add to .env or .envrc:')
  console.error('  EMPATHY_LEDGER_SUPABASE_URL=https://yvnuayzslukamizrlhwb.supabase.co')
  console.error('  EMPATHY_LEDGER_SUPABASE_KEY=<service-role-key>')
  process.exit(1)
}

const supabase = createClient(url, key)

// ---- Schema check (per CLAUDE.md schema-first rule) ----------------

const candidateColumns = [
  'id', 'title', 'transcript', 'content', 'body', 'storyteller_id',
  'project_id', 'project_code', 'consent_scope', 'consent_status',
  'organization_id', 'created_at', 'updated_at', 'published_at',
]

const { data: schema, error: schemaError } = await supabase.rpc('exec_sql', {
  sql: `SELECT column_name FROM information_schema.columns WHERE table_name = 'stories' AND table_schema = 'public' ORDER BY ordinal_position`
}).catch(() => ({ data: null, error: null }))

let availableColumns = null
if (schema && Array.isArray(schema)) {
  availableColumns = new Set(schema.map((r) => r.column_name))
} else {
  // Fallback: try a select with limit 1 and inspect the keys
  const { data: probe, error: probeError } = await supabase.from('stories').select('*').limit(1)
  if (probeError) {
    console.error('[el-stories] cannot query stories table:', probeError.message)
    console.error('  This adapter is configured but the EL v2 schema may differ.')
    console.error('  Run: node scripts/narrative-adapters/el-stories.mjs --probe')
    console.error('  Or check the EL v2 multi-tenancy migration plan in memory/project_el_multi_tenancy.md')
    process.exit(1)
  }
  if (probe && probe[0]) {
    availableColumns = new Set(Object.keys(probe[0]))
    console.log(`[el-stories] discovered columns: ${[...availableColumns].join(', ')}`)
  }
}

if (!availableColumns || availableColumns.size === 0) {
  console.error('[el-stories] could not determine stories schema')
  process.exit(1)
}

const selectColumns = candidateColumns.filter((c) => availableColumns.has(c))
if (selectColumns.length === 0) {
  console.error('[el-stories] no recognized columns in stories table — schema may have changed')
  console.error('  available:', [...availableColumns].join(', '))
  process.exit(1)
}

console.log(`[el-stories] selecting: ${selectColumns.join(', ')}`)

// ---- Fetch stories --------------------------------------------------

let query = supabase.from('stories').select(selectColumns.join(','))

const dateColumn = selectColumns.includes('updated_at')
  ? 'updated_at'
  : selectColumns.includes('published_at')
  ? 'published_at'
  : 'created_at'

if (since && availableColumns.has(dateColumn)) {
  query = query.gte(dateColumn, since)
}

query = query.order(dateColumn, { ascending: false }).limit(200)

const { data: stories, error } = await query

if (error) {
  console.error('[el-stories] query failed:', error.message)
  process.exit(1)
}

console.log(`[el-stories] fetched ${stories?.length || 0} stories`)

if (!stories || stories.length === 0) process.exit(0)

// ---- Consent enforcement -------------------------------------------

const ALLOWED_CONSENT = new Set(['public', 'with-care', 'with care', 'with_care'])
const REFUSED_CONSENT = new Set(['internal-only', 'internal_only', 'team-only', 'private'])

const consentField = selectColumns.includes('consent_scope')
  ? 'consent_scope'
  : selectColumns.includes('consent_status')
  ? 'consent_status'
  : null

if (!consentField) {
  console.error('[el-stories] STOPPING — no consent field found in stories table.')
  console.error('  Refusing to ingest content without explicit consent metadata.')
  console.error('  available columns:', selectColumns.join(', '))
  process.exit(1)
}

const allowed = stories.filter((s) => {
  const c = String(s[consentField] || '').toLowerCase()
  if (REFUSED_CONSENT.has(c)) return false
  if (ALLOWED_CONSENT.has(c)) return true
  return false // default deny
})

const refused = stories.length - allowed.length
console.log(`[el-stories] consent gate: ${allowed.length} allowed, ${refused} refused (default-deny)`)

if (allowed.length === 0) process.exit(0)

// ---- Group by project, write batch files ---------------------------

const byProject = {}
for (const s of allowed) {
  const proj = projectOverride || s.project_code || 'unassigned'
  ;(byProject[proj] = byProject[proj] || []).push(s)
}

for (const [project, items] of Object.entries(byProject)) {
  const batchPath = join(TMP, `${project}-el-stories-${Date.now()}.md`)
  const lines = []
  lines.push(`# Empathy Ledger stories batch — ${project}`)
  lines.push(`> ${items.length} stories · consent-filtered · pulled ${new Date().toISOString().slice(0, 10)}`)
  lines.push('')
  lines.push('**CONSENT NOTICE:** every story below has consent_scope: public OR with-care.')
  lines.push('Internal-only and unmarked stories were refused at the adapter layer and never reach this digest.')
  lines.push('')
  lines.push('When promoting any quote into a public claim, re-confirm the consent level.')
  lines.push('with-care quotes may NOT be used in mass-broadcast channels (Twitter, paid ads, public op-eds) without explicit storyteller confirmation.')
  lines.push('')
  for (const s of items) {
    lines.push('---')
    lines.push('')
    lines.push(`## ${s.title || 'Untitled story'} (consent: ${s[consentField]})`)
    lines.push('')
    lines.push(`*Source:* el://stories/${s.id} · *Project:* ${s.project_code || s.project_id || '—'}`)
    lines.push('')
    const body = String(s.transcript || s.content || s.body || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000)
    lines.push(body)
    lines.push('')
  }
  writeFileSync(batchPath, lines.join('\n'))
  console.log(`[el-stories] wrote ${batchPath} (${items.length} for ${project})`)

  try {
    execSync(
      `node scripts/narrative-ingest.mjs "${batchPath}" --project ${project} --source-type el-story`,
      { stdio: 'inherit', cwd: ROOT }
    )
  } catch (e) {
    console.warn(`[el-stories] ingest failed for ${project}:`, e.message)
  }
}
