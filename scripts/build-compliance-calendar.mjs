#!/usr/bin/env node
/**
 * Build the unified compliance calendar by merging:
 *   - Fixed obligations from wiki/finance/compliance-calendar.md (frontmatter)
 *   - Dynamic grant acquittals from ghl_opportunities.acquittal_due_date
 *
 * Produces a single JSON snapshot at:
 *   thoughts/shared/data/compliance-calendar/YYYY-MM-DD.json
 *
 * Severity scoring per item:
 *   🔴 critical = days_until_due ≤ 7  OR  status='overdue'
 *   🟠 high     = days_until_due ≤ 30
 *   🟡 medium   = days_until_due ≤ 90
 *    -          = days_until_due >  90 (not at-risk)
 *
 * Usage:
 *   node scripts/build-compliance-calendar.mjs              # write today's snapshot
 *   node scripts/build-compliance-calendar.mjs --dry-run    # print to stdout, don't write
 *   node scripts/build-compliance-calendar.mjs --stdout     # write AND print
 */

import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(__dirname, '..')
loadEnv({ path: path.join(REPO, '.env.local') })
loadEnv({ path: path.join(REPO, '.env') })

const DRY_RUN = process.argv.includes('--dry-run')
const ALSO_STDOUT = process.argv.includes('--stdout')

const WIKI_PATH = path.join(REPO, 'wiki', 'finance', 'compliance-calendar.md')
const OUT_DIR = path.join(REPO, 'thoughts', 'shared', 'data', 'compliance-calendar')

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// ── Frontmatter parser (js-yaml) ──

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/)
  if (!m) throw new Error('No YAML frontmatter found in wiki file')
  const doc = yaml.load(m[1])
  return doc ?? {}
}

// ── Dynamic grant acquittals ──

async function loadGrantAcquittals() {
  const { data, error } = await supabase
    .from('ghl_opportunities')
    .select('ghl_id, name, project_code, monetary_value, acquittal_due_date, acquittal_status, pipeline_name')
    .not('acquittal_due_date', 'is', null)
    .neq('acquittal_status', 'complete')
  if (error) {
    console.error(`Warning: failed to load grant acquittals — ${error.message}`)
    return []
  }
  return (data ?? []).map(g => ({
    id: `grant-acquittal-${g.ghl_id}`,
    title: `Acquittal: ${g.name ?? 'Unnamed grant'}`,
    type: 'GRANT_ACQUITTAL',
    entity: 'pty-ltd',
    due_date: g.acquittal_due_date,
    status: g.acquittal_status === 'overdue' ? 'overdue' : 'pending',
    lead_times_days: [60, 30, 14, 7, 1],
    notes: `Pipeline: ${g.pipeline_name ?? '—'} · Value: ${g.monetary_value ?? 0}`,
    owner: 'ben',
    project_code: g.project_code,
    source: 'ghl_opportunities',
    monetary_value: Number(g.monetary_value ?? 0),
  }))
}

// ── Severity scoring ──

function daysUntil(dateInput) {
  if (!dateInput) return null
  let dueIso
  if (dateInput instanceof Date) {
    dueIso = dateInput.toISOString().slice(0, 10)
  } else if (typeof dateInput === 'string') {
    dueIso = dateInput.slice(0, 10)
  } else {
    return null
  }
  const due = new Date(dueIso + 'T00:00:00Z').getTime()
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime()
  return Math.round((due - today) / (24 * 60 * 60 * 1000))
}

function normaliseDateField(d) {
  if (d == null) return null
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return String(d).slice(0, 10)
}

function severity(item, dDays) {
  if (item.status === 'filed' || item.status === 'superseded' || item.status === 'waived') return null
  if (dDays == null) return null
  if (dDays < 0 || dDays <= 7) return 'critical'
  if (dDays <= 30) return 'high'
  if (dDays <= 90) return 'medium'
  return null
}

// ── Main ──

async function main() {
  const md = readFileSync(WIKI_PATH, 'utf8')
  const fm = parseFrontmatter(md)
  const wikiObligations = (fm.obligations ?? []).map(o => ({
    ...o,
    source: 'wiki',
    owner: o.owner ?? 'ben',
  }))

  const grantAcquittals = await loadGrantAcquittals()
  const all = [...wikiObligations, ...grantAcquittals]

  const enriched = all.map(o => {
    const dDays = daysUntil(o.due_date)
    const sev = severity(o, dDays)
    return {
      ...o,
      due_date: normaliseDateField(o.due_date),
      earliest_filable: normaliseDateField(o.earliest_filable),
      last_filed_at: normaliseDateField(o.last_filed_at),
      days_until_due: dDays,
      severity: sev,
      at_risk: sev != null,
    }
  })

  // Sort: at-risk first by days_until_due asc, then non-at-risk by due_date asc
  enriched.sort((a, b) => {
    if (a.at_risk && !b.at_risk) return -1
    if (!a.at_risk && b.at_risk) return 1
    if (a.days_until_due == null && b.days_until_due == null) return 0
    if (a.days_until_due == null) return 1
    if (b.days_until_due == null) return -1
    return a.days_until_due - b.days_until_due
  })

  const counters = enriched.reduce((acc, o) => {
    if (o.severity === 'critical') acc.critical += 1
    else if (o.severity === 'high') acc.high += 1
    else if (o.severity === 'medium') acc.medium += 1
    else if (o.status === 'filed') acc.filed += 1
    return acc
  }, { critical: 0, high: 0, medium: 0, filed: 0 })

  const snapshot = {
    generatedAt: new Date().toISOString(),
    sources: {
      wiki: { path: 'wiki/finance/compliance-calendar.md', count: wikiObligations.length },
      grants: { table: 'ghl_opportunities', count: grantAcquittals.length },
    },
    counters,
    obligations: enriched,
  }

  if (ALSO_STDOUT || DRY_RUN) {
    console.log(JSON.stringify(snapshot, null, 2))
  }
  if (DRY_RUN) {
    console.error(`\nDRY-RUN — would write to ${path.join(OUT_DIR, todayStr() + '.json')}`)
    console.error(`Totals: ${counters.critical} 🔴 critical · ${counters.high} 🟠 high · ${counters.medium} 🟡 medium · ${counters.filed} ✓ filed`)
    return
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
  const json = JSON.stringify(snapshot, null, 2)
  const outPath = path.join(OUT_DIR, todayStr() + '.json')
  writeFileSync(outPath, json)
  // Stable filename the API + Notion sync read; the only snapshot tracked in git (dated history is
  // gitignored). The API recomputes days_until_due/severity live, so this need not be committed daily.
  writeFileSync(path.join(OUT_DIR, 'latest.json'), json)
  console.error(`Wrote ${outPath} + latest.json`)
  console.error(`Totals: ${counters.critical} 🔴 critical · ${counters.high} 🟠 high · ${counters.medium} 🟡 medium · ${counters.filed} ✓ filed`)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

main().catch(e => { console.error(e); process.exit(1) })
