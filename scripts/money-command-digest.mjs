#!/usr/bin/env node
/**
 * Money Command daily digest — prints (and optionally sends to Telegram) the
 * /finance/command snapshot:
 *
 *   - Coverage % per source (deltas if a previous snapshot exists on disk)
 *   - Drift queue top-5 (kind · reason · amount · label)
 *   - 90-day projected incoming stack (AR + weighted pipeline + grants in flight)
 *   - Lifetime ledger totals (visible book vs CivicGraph coverage gap)
 *
 * Reads from v_project_money_state + the same queries the API uses, so the
 * digest cannot drift from the page.
 *
 * Snapshots to thoughts/shared/data/money-command-snapshots/YYYY-MM-DD.json
 * so we can compute deltas next run.
 *
 * Usage:
 *   node scripts/money-command-digest.mjs                # print to stdout
 *   node scripts/money-command-digest.mjs --telegram     # also send to Telegram
 *   node scripts/money-command-digest.mjs --no-snapshot  # skip writing the daily JSON
 */

import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') })
loadEnv({ path: path.resolve(__dirname, '..', '.env') })

const SEND_TELEGRAM = process.argv.includes('--telegram')
const NO_SNAPSHOT = process.argv.includes('--no-snapshot')
const SNAPSHOT_DIR = path.resolve(__dirname, '..', 'thoughts', 'shared', 'data', 'money-command-snapshots')
const FY_START = '2025-07-01'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const fmt = n => '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
const fmtPct = n => `${Number(n).toFixed(1)}%`

async function loadCoverage() {
  // Use aggregate counts to dodge the 1000-row default cap on .select() results.
  const countTagged = async (table, filters = q => q) => {
    const total = await filters(supabase.from(table).select('*', { count: 'exact', head: true }))
    const tagged = await filters(supabase.from(table).select('*', { count: 'exact', head: true }).not('project_code', 'is', null))
    const t = total.count ?? 0
    const ta = tagged.count ?? 0
    return { total: t, tagged: ta, pct: t === 0 ? 0 : (ta / t) * 100 }
  }
  const [transactions, invoices, opportunities] = await Promise.all([
    countTagged('xero_transactions', q => q.gte('date', FY_START)),
    countTagged('xero_invoices', q => q.eq('type', 'ACCREC').gte('date', FY_START)),
    countTagged('ghl_opportunities', q => q.eq('status', 'open')),
  ])
  return { transactions, invoices, opportunities }
}

async function loadDriftTop5() {
  const { data: invs } = await supabase
    .from('xero_invoices')
    .select('contact_name, total, invoice_number')
    .gte('date', FY_START)
    .is('project_code', null)
    .eq('type', 'ACCREC')
    .order('total', { ascending: false })
    .limit(5)
  const { data: opps } = await supabase
    .from('ghl_opportunities')
    .select('name, monetary_value, pipeline_name')
    .eq('status', 'open')
    .is('project_code', null)
    .order('monetary_value', { ascending: false, nullsFirst: false })
    .limit(5)
  return [
    ...(invs ?? []).map(r => ({ kind: 'inv', amount: Number(r.total ?? 0), label: `${r.contact_name} · ${r.invoice_number ?? ''}` })),
    ...(opps ?? []).map(r => ({ kind: 'opp', amount: Number(r.monetary_value ?? 0), label: `${r.name} · ${r.pipeline_name ?? ''}` })),
  ].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 5)
}

async function loadIncoming90d() {
  const { data: state } = await supabase.from('v_project_money_state').select('receivables, pipeline_weighted, grants_in_flight')
  const totals = (state ?? []).reduce((a, r) => ({
    receivables: a.receivables + Number(r.receivables ?? 0),
    pipelineWeighted: a.pipelineWeighted + Number(r.pipeline_weighted ?? 0),
    grantsInFlight: a.grantsInFlight + Number(r.grants_in_flight ?? 0),
  }), { receivables: 0, pipelineWeighted: 0, grantsInFlight: 0 })
  return { ...totals, projected90d: totals.receivables + totals.pipelineWeighted + totals.grantsInFlight }
}

async function loadCashInBank() {
  const { data } = await supabase
    .from('xero_bank_accounts')
    .select('current_balance, status')
  if (!data || data.length === 0) return null
  return data.filter(a => a.status !== 'ARCHIVED')
    .reduce((s, a) => s + Number(a.current_balance ?? 0), 0)
}

async function loadLifetime() {
  const { data } = await supabase
    .from('xero_invoices')
    .select('contact_name, status, total, amount_due')
    .eq('type', 'ACCREC')
    .not('contact_name', 'is', null)
  const customers = new Map()
  let paid = 0, ar = 0, draft = 0
  for (const inv of data ?? []) {
    const name = inv.contact_name.trim()
    if (!name) continue
    if (!customers.has(name)) customers.set(name, { paid: 0 })
    const total = Number(inv.total ?? 0)
    const due = Number(inv.amount_due ?? 0)
    if (inv.status === 'PAID') { paid += total; customers.get(name).paid += total }
    else if (inv.status === 'AUTHORISED' || inv.status === 'SUBMITTED') ar += due
    else if (inv.status === 'DRAFT') draft += total
  }
  const paying = [...customers.values()].filter(c => c.paid > 0).length
  return { distinctCustomers: customers.size, paying, paid, ar, draft, visibleBook: paid + ar + draft }
}

function findPreviousSnapshot() {
  if (!existsSync(SNAPSHOT_DIR)) return null
  const files = readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith('.json')).sort()
  if (files.length === 0) return null
  return JSON.parse(readFileSync(path.join(SNAPSHOT_DIR, files[files.length - 1]), 'utf8'))
}

function writeSnapshot(snap) {
  if (!existsSync(SNAPSHOT_DIR)) mkdirSync(SNAPSHOT_DIR, { recursive: true })
  const today = new Date().toISOString().slice(0, 10)
  writeFileSync(path.join(SNAPSHOT_DIR, `${today}.json`), JSON.stringify(snap, null, 2))
}

function delta(curr, prev) {
  if (prev == null || curr == null) return ''
  const d = curr - prev
  if (Math.abs(d) < 0.05) return ''
  const arrow = d > 0 ? '↑' : '↓'
  return ` ${arrow}${Math.abs(d).toFixed(1)}`
}

function deltaMoney(curr, prev) {
  if (prev == null || curr == null) return ''
  const d = curr - prev
  if (Math.abs(d) < 1) return ''
  const arrow = d > 0 ? '↑' : '↓'
  return ` ${arrow}${fmt(Math.abs(d))}`
}

async function main() {
  const previous = findPreviousSnapshot()
  const [coverage, drift, incoming, cash, lifetime] = await Promise.all([
    loadCoverage(), loadDriftTop5(), loadIncoming90d(), loadCashInBank(), loadLifetime(),
  ])
  const today = new Date().toISOString().slice(0, 10)

  const lines = []
  lines.push(`📊 Money Command — ${today}`)
  lines.push('')
  lines.push(`Cash in bank: ${cash == null ? '—' : fmt(cash)}`)
  lines.push(`Projected 90d incoming: ${fmt(incoming.projected90d)}${deltaMoney(incoming.projected90d, previous?.incoming?.projected90d)}`)
  lines.push(`  • AR        ${fmt(incoming.receivables)}`)
  lines.push(`  • Pipeline  ${fmt(incoming.pipelineWeighted)}`)
  lines.push(`  • Grants    ${fmt(incoming.grantsInFlight)}`)
  lines.push('')
  lines.push('Coverage:')
  lines.push(`  Transactions: ${fmtPct(coverage.transactions.pct)}${delta(coverage.transactions.pct, previous?.coverage?.transactions?.pct)} (${coverage.transactions.tagged}/${coverage.transactions.total})`)
  lines.push(`  Invoices:     ${fmtPct(coverage.invoices.pct)}${delta(coverage.invoices.pct, previous?.coverage?.invoices?.pct)} (${coverage.invoices.tagged}/${coverage.invoices.total})`)
  lines.push(`  Opportunities:${fmtPct(coverage.opportunities.pct)}${delta(coverage.opportunities.pct, previous?.coverage?.opportunities?.pct)} (${coverage.opportunities.tagged}/${coverage.opportunities.total})`)
  lines.push('')
  if (drift.length > 0) {
    lines.push('Drift queue (top 5 by $):')
    for (const d of drift) {
      lines.push(`  [${d.kind}] ${fmt(d.amount)} · ${d.label.slice(0, 60)}`)
    }
    lines.push('')
  }
  lines.push(`Lifetime ledger: ${fmt(lifetime.visibleBook)} visible book (${lifetime.distinctCustomers} customers, ${lifetime.paying} paying)`)
  lines.push(`  • Paid all-time: ${fmt(lifetime.paid)}`)
  lines.push(`  • Outstanding AR: ${fmt(lifetime.ar)}`)
  lines.push(`  • Draft: ${fmt(lifetime.draft)}`)
  lines.push('')
  lines.push('Open: https://command.act.place/finance/command')

  const message = lines.join('\n')
  console.log(message)

  if (!NO_SNAPSHOT) writeSnapshot({ today, coverage, drift, incoming, cash, lifetime })

  if (SEND_TELEGRAM) {
    const { sendTelegram } = await import('./lib/telegram.mjs').catch(() => ({ sendTelegram: null }))
    if (sendTelegram) {
      await sendTelegram(message)
      console.log('\n→ Sent to Telegram')
    } else {
      console.error('\n⚠ scripts/lib/telegram.mjs not loadable; skipped Telegram send')
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
