#!/usr/bin/env node
/**
 * ACT Alignment Loop — weekly cycle dispatcher
 *
 * Runs Friday 08:00 Brisbane (cron `trig_018X1ZRtc9zdgFENiYsx5t8c`). Decides
 * which of the three Phase-1 synthesize-* scripts to run this week, so the
 * three questions stagger instead of all firing on the same Friday.
 *
 * Cadence:
 *   Pre-cutover (today <= 2026-06-30):
 *     - entity-migration-truth-state runs EVERY Friday (54-day countdown,
 *       drift signal must be weekly through cutover)
 *     - funder-alignment / project-truth-state alternate by ISO-week parity
 *       (week even -> funder, week odd -> project)
 *     => 2 syntheses per Friday pre-cutover
 *
 *   Post-cutover (today > 2026-06-30):
 *     - 3-way rotation by ISO-week % 3
 *       0 -> funder, 1 -> project, 2 -> entity-migration
 *     => 1 synthesis per Friday post-cutover
 *
 * Overrides:
 *   --all                          run all three regardless of week
 *   --question <slug>              run a specific question
 *   <any other flag>               passed through to child scripts (e.g. --no-grade, --dry-run, --date YYYY-MM-DD)
 *
 * Exit:
 *   0 if every child script exits 0 (or with warn verdict, which the children
 *   treat as exit 0). Non-zero if any child exited non-zero (fail verdict).
 *
 * Plan: thoughts/shared/plans/act-alignment-loop.md (Phase 2 task ledger)
 */
import { spawn } from 'node:child_process'

const QUESTIONS = {
  'funder-alignment': 'scripts/synthesize-funder-alignment.mjs',
  'project-truth-state': 'scripts/synthesize-project-truth-state.mjs',
  'entity-migration-truth-state': 'scripts/synthesize-entity-migration-truth-state.mjs',
}

const CUTOVER_DATE = '2026-06-30'

function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
}

function questionsForToday(today = new Date()) {
  const todayISO = today.toISOString().slice(0, 10)
  const week = isoWeek(today)
  const preCutover = todayISO <= CUTOVER_DATE

  if (preCutover) {
    const alt = week % 2 === 0 ? 'funder-alignment' : 'project-truth-state'
    return ['entity-migration-truth-state', alt]
  }

  const order = ['funder-alignment', 'project-truth-state', 'entity-migration-truth-state']
  return [order[week % 3]]
}

function parseArgv(argv) {
  const out = { all: false, question: null, passthrough: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--all') out.all = true
    else if (a === '--question') {
      out.question = argv[i + 1]
      i++
    } else {
      out.passthrough.push(a)
    }
  }
  return out
}

async function runSynthesis(slug, passthrough) {
  const script = QUESTIONS[slug]
  console.log(`[alignment-loop-cycle] starting ${slug} -> node ${script}${passthrough.length ? ' ' + passthrough.join(' ') : ''}`)
  return new Promise((resolve) => {
    const child = spawn('node', [script, ...passthrough], { stdio: 'inherit' })
    child.on('exit', (code) => {
      console.log(`[alignment-loop-cycle] ${slug} exited ${code}`)
      resolve(code ?? 1)
    })
    child.on('error', (err) => {
      console.error(`[alignment-loop-cycle] ${slug} spawn error: ${err.message}`)
      resolve(1)
    })
  })
}

async function main() {
  const { all, question, passthrough } = parseArgv(process.argv.slice(2))

  let toRun
  if (all) {
    toRun = Object.keys(QUESTIONS)
    console.log(`[alignment-loop-cycle] --all: running every question (${toRun.length})`)
  } else if (question) {
    if (!QUESTIONS[question]) {
      console.error(`[alignment-loop-cycle] unknown --question '${question}'. Valid: ${Object.keys(QUESTIONS).join(', ')}`)
      process.exit(2)
    }
    toRun = [question]
    console.log(`[alignment-loop-cycle] --question ${question}: forced single run`)
  } else {
    const today = new Date()
    const week = isoWeek(today)
    toRun = questionsForToday(today)
    const todayISO = today.toISOString().slice(0, 10)
    const phase = todayISO <= CUTOVER_DATE ? 'pre-cutover' : 'post-cutover'
    console.log(`[alignment-loop-cycle] ${todayISO} ISO-week ${week} (${phase}) -> ${toRun.join(', ')}`)
  }

  const codes = []
  for (const slug of toRun) {
    const code = await runSynthesis(slug, passthrough)
    codes.push({ slug, code })
  }

  const failed = codes.filter((c) => c.code !== 0)
  if (failed.length) {
    console.error(`[alignment-loop-cycle] ${failed.length}/${codes.length} synthesis runs failed:`)
    for (const f of failed) console.error(`  - ${f.slug} exit ${f.code}`)
    process.exit(1)
  }
  console.log(`[alignment-loop-cycle] ${codes.length}/${codes.length} synthesis runs succeeded`)
}

main().catch((err) => {
  console.error('[alignment-loop-cycle] fatal:', err.stack || err.message)
  process.exit(1)
})
