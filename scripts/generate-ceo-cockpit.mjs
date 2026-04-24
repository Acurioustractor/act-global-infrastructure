#!/usr/bin/env node
/**
 * generate-ceo-cockpit.mjs
 *
 * Produces ONE markdown page Ben opens every morning as CEO of ACT.
 * Pulls from: ACT Brain source-of-truth (wiki/decisions/act-core-facts.md),
 * latest Alignment Loop synthesis, live Supabase state, repo git log.
 *
 * Output: wiki/cockpit/today.md (overwritten daily; previous days archive
 * to wiki/cockpit/archive/YYYY-MM-DD.md).
 *
 * Sections (in order of CEO attention):
 *   1. The number (days to cutover, $ outstanding, what changed today)
 *   2. Decisions blocked on you
 *   3. Movement since yesterday
 *   4. The week ahead
 *   5. Receivables snapshot
 *   6. Quick links (most-used surfaces)
 *
 * Usage:
 *   node scripts/generate-ceo-cockpit.mjs              # write today.md
 *   node scripts/generate-ceo-cockpit.mjs --dry-run    # print to stdout
 */
import './lib/load-env.mjs'
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const REPO_ROOT = process.cwd()
const COCKPIT_DIR = join(REPO_ROOT, 'wiki/cockpit')
const ARCHIVE_DIR = join(COCKPIT_DIR, 'archive')
const TODAY_PATH = join(COCKPIT_DIR, 'today.md')
const FACTS_PATH = join(REPO_ROOT, 'wiki/decisions/act-core-facts.md')
const CUTOVER_DATE = new Date('2026-06-30T23:59:59+10:00')

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SHARED_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

const today = new Date()
const todayStr = today.toISOString().slice(0, 10)
const daysToCutover = Math.ceil((CUTOVER_DATE - today) / (1000 * 60 * 60 * 24))

// ── Data pulls ───────────────────────────────────────────────────────

async function getOutstandingReceivables() {
  const { data, error } = await sb.from('xero_invoices')
    .select('contact_name, invoice_number, status, date, amount_due, project_code')
    .eq('type', 'ACCREC')
    .in('status', ['AUTHORISED', 'DRAFT'])
    .gt('amount_due', 0)
    .order('amount_due', { ascending: false })
  if (error) throw error
  const total = data.reduce((s, r) => s + Number(r.amount_due), 0)
  return { rows: data, total }
}

async function getDraftInvoices() {
  const { data } = await sb.from('xero_invoices')
    .select('contact_name, invoice_number, date, total, project_code')
    .eq('type', 'ACCREC')
    .eq('status', 'DRAFT')
    .gt('total', 0)
    .order('date')
  return data || []
}

async function getRecentActivityCounts() {
  const { count: invoicesToday } = await sb.from('xero_invoices')
    .select('*', { count: 'exact', head: true })
    .gte('updated_date', todayStr)
  const { count: txnsToday } = await sb.from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .gte('updated_date', todayStr)
  return { invoicesToday: invoicesToday || 0, txnsToday: txnsToday || 0 }
}

function getRecentCommits(n = 8) {
  try {
    const out = execSync(`git log --oneline -${n}`, { cwd: REPO_ROOT, encoding: 'utf8' })
    return out.trim().split('\n')
  } catch (e) {
    return []
  }
}

function getRecentSyntheses() {
  try {
    const out = execSync(`ls -1 ${join(REPO_ROOT, 'wiki/synthesis')} | grep -E '^[a-z-]+-2026-' | sort -r | head -5`, { encoding: 'utf8', shell: '/bin/bash' })
    return out.trim().split('\n').filter(Boolean)
  } catch (e) {
    return []
  }
}

function getOpenActionsFromFacts() {
  if (!existsSync(FACTS_PATH)) return []
  const text = readFileSync(FACTS_PATH, 'utf8')
  const actions = []
  const seen = new Set()
  for (const m of text.matchAll(/^- \[ \] \*?\*?(.+?)\*?\*?(?:\s+—\s+(.+))?$/gm)) {
    const action = m[1].trim()
    if (seen.has(action)) continue
    seen.add(action)
    actions.push({ action, context: m[2] || '' })
  }
  return actions
}

// ── Render ───────────────────────────────────────────────────────────

function fmtAUD(n) {
  return '$' + Number(n).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function ageInDays(date) {
  return Math.floor((today - new Date(date)) / (1000 * 60 * 60 * 24))
}

async function render() {
  const [receivables, drafts, activity] = await Promise.all([
    getOutstandingReceivables(),
    getDraftInvoices(),
    getRecentActivityCounts(),
  ])
  const commits = getRecentCommits(8)
  const syntheses = getRecentSyntheses()
  const openActions = getOpenActionsFromFacts()

  // Highlights — the ones with names attached
  const namedReceivables = {
    snow: receivables.rows.find(r => r.contact_name?.includes('Snow')),
    centrecorp: receivables.rows.find(r => r.contact_name?.includes('Centrecorp')),
    rotary: receivables.rows.find(r => r.contact_name?.includes('Rotary')),
  }

  const dayName = today.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Brisbane' })

  const md = `---
title: ACT CEO Cockpit — ${todayStr}
summary: One-page daily landing for Ben as CEO of ACT. Auto-generated. Read top-to-bottom; act on the red items.
tags: [cockpit, ceo, daily, briefing]
status: live
date: ${todayStr}
generated: ${new Date().toISOString()}
---

# ACT Cockpit — ${dayName}

> ${daysToCutover} days to Pty cutover · ${fmtAUD(receivables.total)} outstanding on sole trader · ${commits.length ? commits[0].split(' ')[0] : '?'} latest commit

## 🚨 Decisions blocked on you

${draftDecisionLines(drafts, namedReceivables)}

## 📊 The number

| Metric | Today | What it means |
|--------|------:|---------------|
| Days to cutover (30 June) | **${daysToCutover}** | ${daysToCutover < 30 ? '⚠️ Inside the danger window' : daysToCutover < 60 ? 'Tight but doable' : 'Time to execute well'} |
| Outstanding receivables (sole trader) | **${fmtAUD(receivables.total)}** | ${receivables.rows.length} invoices across ${new Set(receivables.rows.map(r => r.contact_name)).size} counterparties |
| AUTHORISED ACCREC invoices | ${receivables.rows.filter(r => r.status === 'AUTHORISED').length} | Real money expected |
| DRAFT ACCREC invoices | ${receivables.rows.filter(r => r.status === 'DRAFT').length} | Awaiting your send/void decision |
| Xero activity logged today | ${activity.invoicesToday + activity.txnsToday} | ${activity.invoicesToday} invoice(s) + ${activity.txnsToday} txn(s) |

## 🎯 Top 3 receivables

${topReceivablesTable(receivables.rows.slice(0, 3))}

## 📋 Open actions from CEO review (from \`act-core-facts.md\`)

${openActions.length === 0 ? '_No open actions tracked. Run `node scripts/sync-act-context.mjs --apply` if act-core-facts.md was just updated._' : openActions.slice(0, 12).map((a, i) => `${i + 1}. **${a.action}**${a.context ? ` — ${a.context}` : ''}`).join('\n')}

## 🌊 What's moving

### Recent commits (this repo)
\`\`\`
${commits.slice(0, 5).join('\n')}
\`\`\`

### Recent Alignment Loop syntheses
${syntheses.slice(0, 3).map(s => `- [[${s.replace('.md', '')}]]`).join('\n') || '_No syntheses found_'}

## 🗓️ This week ahead

- **Weekly Alignment Loop drift PR** opens Friday 08:00 Brisbane (next: ${nextFridayString()})
- **Pty cutover** in ${daysToCutover} days (30 June 2026)
- **D&O insurance binding due** 2026-05-24 (within 30 days of Pty registration)
- **R&D FY26 records review** scheduled end May (~$47K audit-exposure protection)

## 🔗 Quick links

- **ACT Brain (source of truth)**: \`wiki/decisions/act-core-facts.md\`
- **Migration plan**: \`thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md\`
- **Latest entity-migration synthesis**: \`wiki/synthesis/${syntheses.find(s => s.startsWith('entity-migration')) || 'entity-migration-truth-state-2026-04-24.md'}\`
- **Latest funder-alignment synthesis**: \`wiki/synthesis/${syntheses.find(s => s.startsWith('funder-alignment')) || 'funder-alignment-2026-04-24.md'}\`
- **Latest project truth-state**: \`wiki/synthesis/${syntheses.find(s => s.startsWith('project-truth-state')) || 'project-truth-state-2026-04-24.md'}\`
- **Funders ledger**: \`wiki/narrative/funders.json\` (v2, 21 funders)
- **Project codes**: \`config/project-codes.json\` (v1.8.0, 72 projects, all canonical)

## 📝 How this page works

Auto-generated daily by \`scripts/generate-ceo-cockpit.mjs\` from:
- ACT Brain source: \`wiki/decisions/act-core-facts.md\`
- Live Supabase: \`xero_invoices\`, \`xero_transactions\`
- Repo state: \`git log\`, \`wiki/synthesis/\` directory walk

Yesterday's version archived at \`wiki/cockpit/archive/${yesterdayStr()}.md\` if generated.

To extend: edit the script's render() function. Don't hand-edit \`today.md\` — it's overwritten on the next run.

---
_Generated ${new Date().toISOString()} — ${commits.length} commits this repo · ${syntheses.length} alignment-loop syntheses indexed · drift cycle weekly Friday 08:00 Brisbane_
`

  return md
}

function draftDecisionLines(drafts, named) {
  const lines = []
  if (drafts.length > 0) {
    for (const d of drafts) {
      lines.push(`- **${d.invoice_number}** ${d.contact_name} ${fmtAUD(d.total)} DRAFT (${ageInDays(d.date)} days old) — send / void / reissue from Pty?`)
    }
  }
  if (named.snow) {
    lines.push(`- **${named.snow.invoice_number}** Snow Foundation ${fmtAUD(named.snow.amount_due)} AUTHORISED ${ageInDays(named.snow.date)} days — call Sally/Alexandra: confirm payment + Pty migration notice`)
  }
  if (named.rotary) {
    lines.push(`- **${named.rotary.invoice_number}** Rotary eClub ${fmtAUD(named.rotary.amount_due)} AUTHORISED **${ageInDays(named.rotary.date)} days** — chase or write off (Rule 3: recovery not novation)`)
  }
  if (lines.length === 0) {
    return '_Nothing blocked on you today. Quiet day. Watch the drift signal Friday._'
  }
  return lines.join('\n')
}

function topReceivablesTable(rows) {
  if (rows.length === 0) return '_No outstanding receivables — clean slate._'
  let out = '| Counterparty | Invoice | Amount | Status | Age | Project |\n|---|---|---:|---|---:|---|\n'
  for (const r of rows) {
    out += `| ${r.contact_name} | ${r.invoice_number} | ${fmtAUD(r.amount_due)} | ${r.status} | ${ageInDays(r.date)}d | ${r.project_code || '—'} |\n`
  }
  return out
}

function nextFridayString() {
  const d = new Date(today)
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function yesterdayStr() {
  const d = new Date(today)
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.error(`[ceo-cockpit] generating for ${todayStr}, ${daysToCutover}d to cutover`)
  if (!existsSync(COCKPIT_DIR)) mkdirSync(COCKPIT_DIR, { recursive: true })
  if (!existsSync(ARCHIVE_DIR)) mkdirSync(ARCHIVE_DIR, { recursive: true })

  // Archive yesterday's if it exists and the date differs
  if (existsSync(TODAY_PATH)) {
    const existing = readFileSync(TODAY_PATH, 'utf8')
    const dateMatch = existing.match(/^date: (\d{4}-\d{2}-\d{2})$/m)
    if (dateMatch && dateMatch[1] !== todayStr) {
      const archivePath = join(ARCHIVE_DIR, `${dateMatch[1]}.md`)
      if (!existsSync(archivePath)) {
        copyFileSync(TODAY_PATH, archivePath)
        console.error(`[ceo-cockpit] archived previous day's brief to ${archivePath}`)
      }
    }
  }

  const md = await render()

  if (DRY_RUN) {
    process.stdout.write(md)
    return
  }

  writeFileSync(TODAY_PATH, md)
  console.error(`[ceo-cockpit] wrote ${TODAY_PATH}`)
}

main().catch(e => { console.error(e); process.exit(1) })
