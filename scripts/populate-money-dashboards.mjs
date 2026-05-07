#!/usr/bin/env node
/**
 * Populate every Notion money-stack dashboard, on demand.
 *
 * Mirrors the PM2 Monday-morning sync chain (ecosystem.config.cjs cron lines
 * 6:00 -> 9:25am AEST) so Ben can refresh all dashboards immediately
 * without waiting for the next Monday.
 *
 * Runs each script in dependency order, captures stdout/stderr per step,
 * continues on failure (one bad script doesn't kill the chain). Reports
 * a summary table at the end.
 *
 * Usage:
 *   node scripts/populate-money-dashboards.mjs              # full chain
 *   node scripts/populate-money-dashboards.mjs --dry-run    # list steps, don't run
 *   node scripts/populate-money-dashboards.mjs --only <step1,step2,...>  # subset
 *   node scripts/populate-money-dashboards.mjs --skip <step1,step2,...>  # exclude
 *
 * Each step inherits the parent process's env (NOTION_TOKEN, Supabase
 * keys, Xero tokens) via load-env.mjs in each child script.
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
await import(join(__dirname, 'lib/load-env.mjs'))

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')
const ONLY_FLAG = argv.indexOf('--only')
const SKIP_FLAG = argv.indexOf('--skip')
const ONLY = ONLY_FLAG >= 0 ? new Set(argv[ONLY_FLAG + 1].split(',').map((s) => s.trim())) : null
const SKIP = SKIP_FLAG >= 0 ? new Set(argv[SKIP_FLAG + 1].split(',').map((s) => s.trim())) : new Set()

// Order matches ecosystem.config.cjs cron schedule. Each step is one PM2
// app from the money-stack chain.
const CHAIN = [
  // Pre-sync prep (cleanup + payment sync + audits)
  { name: 'ghl-cleanup', script: 'cleanup-stale-ghl-opps.mjs', args: ['--apply'] },
  { name: 'grant-seed', script: 'seed-ghl-grants.mjs', args: ['--count', '5'] },
  { name: 'xero-payments', script: 'sync-xero-payments.mjs', args: ['--days=180'] },
  { name: 'money-in-audit', script: 'audit-money-in-alignment.mjs' },
  { name: 'money-out-audit', script: 'audit-money-out-alignment.mjs' },
  { name: 'money-alignment-notion', script: 'sync-money-alignment-to-notion.mjs' },
  // The dashboard refresh chain (fresh data → Notion pages)
  { name: 'money-framework', script: 'sync-money-framework-to-notion.mjs' },
  { name: 'opportunities-db', script: 'sync-opportunities-to-notion-db.mjs' },
  { name: 'pile-pages', script: 'sync-pile-pages-to-notion.mjs' },
  { name: 'cash-forecast', script: 'sync-cash-forecast-to-notion.mjs' },
  { name: 'kpis', script: 'sync-kpis-to-notion.mjs' },
  { name: 'budget-actual', script: 'sync-budget-vs-actual-to-notion.mjs' },
  { name: 'cash-scenarios', script: 'sync-cash-scenarios-to-notion.mjs' },
  { name: 'dashboard-hub', script: 'sync-money-dashboard-hub.mjs' },
  { name: 'money-metrics', script: 'sync-money-metrics-to-notion.mjs' },
  { name: 'planning-rhythm', script: 'sync-planning-rhythm-to-notion.mjs' },
  { name: 'entity-hub', script: 'sync-entity-hub-to-notion.mjs' },
]

function runStep(step) {
  const scriptPath = join(__dirname, step.script)
  const args = step.args || []
  const startedAt = Date.now()
  return new Promise((resolve) => {
    let out = ''
    let err = ''
    const child = spawn('node', [scriptPath, ...args], { cwd: join(__dirname, '..') })
    child.stdout?.on('data', (d) => (out += d.toString()))
    child.stderr?.on('data', (d) => (err += d.toString()))
    child.on('exit', (code) => {
      resolve({ ...step, exit: code ?? 1, durationMs: Date.now() - startedAt, stdout: out, stderr: err })
    })
    child.on('error', (e) => {
      resolve({ ...step, exit: 1, durationMs: Date.now() - startedAt, stdout: out, stderr: err + '\nspawn error: ' + e.message })
    })
  })
}

const planned = CHAIN.filter((s) => (!ONLY || ONLY.has(s.name)) && !SKIP.has(s.name))

console.log(`[populate-money] ${planned.length}/${CHAIN.length} steps planned${DRY_RUN ? ' (dry-run)' : ''}`)
for (const s of planned) console.log(`  - ${s.name.padEnd(24)} ${s.script}${s.args ? ' ' + s.args.join(' ') : ''}`)

if (DRY_RUN) {
  console.log(`\n[populate-money] DRY-RUN: re-run without --dry-run to execute.`)
  process.exit(0)
}

if (!process.env.NOTION_TOKEN) {
  console.error('[populate-money] NOTION_TOKEN env var not set; the *-to-notion steps will silently skip')
}

console.log('')
const results = []
for (let i = 0; i < planned.length; i++) {
  const step = planned[i]
  process.stdout.write(`[${i + 1}/${planned.length}] ${step.name.padEnd(24)} ... `)
  const res = await runStep(step)
  const sec = (res.durationMs / 1000).toFixed(1)
  console.log(res.exit === 0 ? `✓ ${sec}s` : `✗ exit ${res.exit} (${sec}s)`)
  results.push(res)
}

console.log('\n[populate-money] summary')
console.log('━'.repeat(60))
const ok = results.filter((r) => r.exit === 0)
const failed = results.filter((r) => r.exit !== 0)
for (const r of results) {
  const status = r.exit === 0 ? '✓' : '✗'
  const sec = (r.durationMs / 1000).toFixed(1)
  console.log(`  ${status} ${r.name.padEnd(24)} ${sec}s`)
}
console.log('━'.repeat(60))
console.log(`  ${ok.length}/${results.length} succeeded · ${failed.length} failed`)
if (failed.length) {
  console.log('\n[populate-money] failed-step tails:')
  for (const r of failed) {
    const tail = (r.stderr || r.stdout).split('\n').slice(-6).join('\n  ')
    console.log(`\n=== ${r.name} (exit ${r.exit}) ===\n  ${tail}`)
  }
  process.exit(1)
}
console.log('\n[populate-money] all steps green')
