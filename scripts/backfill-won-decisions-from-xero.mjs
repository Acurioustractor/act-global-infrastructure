#!/usr/bin/env node
/**
 * Backfill act_grant_recommendation_decisions with "won" rows for paid Xero invoices ≥ $5K.
 *
 * Implements action #2 from the 2026-05-16 "lifetime ledger" finding:
 *   "Backfill ... with 'won' rows — one row per paid invoice ≥ $5K,
 *    project_code from the tracking_option_1 column."
 *
 * Schema requires `act_grant_recommendation_decisions.opportunity_id` (NOT NULL,
 * FK to alma_funding_opportunities). So this script:
 *   1. Aggregates paid Xero ACCREC invoices ≥ $5K per (contact_name, project_code) pair
 *   2. INSERTs an alma_funding_opportunities row per (contact_name + project_code).
 *      source_type uses the existing 4-value check constraint (community/corporate/
 *      government/philanthropy) classified by name. The marker for idempotent
 *      re-run is the ` — won historical (xero)` suffix in `name`.
 *   3. INSERTs an act_grant_recommendation_decisions row with decision='won',
 *      decided_at=max invoice date, notes='Backfilled from xero_invoices'
 *
 * Idempotent. Cleanup:
 *   DELETE FROM act_grant_recommendation_decisions
 *     WHERE notes LIKE 'Backfilled from xero_invoices%';
 *   DELETE FROM alma_funding_opportunities
 *     WHERE name LIKE '%— won historical (xero%';
 *
 * Usage:
 *   node scripts/backfill-won-decisions-from-xero.mjs --dry-run
 *   node scripts/backfill-won-decisions-from-xero.mjs --apply
 */

import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') })
loadEnv({ path: path.resolve(__dirname, '..', '.env') })

const APPLY = process.argv.includes('--apply')
const MIN_AMOUNT = 5000

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

async function fetchPaidInvoices() {
  const { data, error } = await supabase
    .from('xero_invoices')
    .select('contact_name, project_code, tracking_option_1, total, date, invoice_number')
    .eq('type', 'ACCREC')
    .eq('status', 'PAID')
    .not('contact_name', 'is', null)
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

async function fetchExistingHistorical() {
  const { data: opps } = await supabase
    .from('alma_funding_opportunities')
    .select('id, name, funder_name')
    .like('name', '%— won historical (xero%')
  return new Set((opps ?? []).map(o => o.name))
}

function classifySource(funderName) {
  const n = String(funderName ?? '').toLowerCase()
  // Government
  if (/department|government|council|state of|federal|austender|niaa|qld\b|nsw\b|vic\b|sa\b|wa\b|nt\b|tas\b/.test(n)) return 'government'
  // Philanthropic foundations
  if (/foundation|trust|philanthropy|fairfax|snow|ramsay|dusseldorp|villiers|westpac scholars|brisbane powerhouse foundation|smith family/.test(n)) return 'philanthropy'
  // Aboriginal community / community-controlled
  if (/aboriginal|indigenous|community|corporation|moorgumpin|julalikari|ingkerreke|picc|palm island|red dust|mala’?la/.test(n)) return 'community'
  // Commercial / corporate default
  return 'corporate'
}

function bucketByFunderProject(invoices) {
  const m = new Map()
  for (const inv of invoices) {
    const funder = (inv.contact_name ?? '').trim()
    const project = inv.project_code ?? inv.tracking_option_1 ?? null
    const key = `${funder}__${project ?? '_'}`
    let row = m.get(key)
    if (!row) {
      row = { funder, project, paid: 0, count: 0, last_date: null, invoice_numbers: [] }
      m.set(key, row)
    }
    row.paid += Number(inv.total ?? 0)
    row.count += 1
    if (inv.invoice_number) row.invoice_numbers.push(inv.invoice_number)
    if (inv.date && (!row.last_date || inv.date > row.last_date)) {
      row.last_date = inv.date
    }
  }
  return [...m.values()].filter(r => r.paid >= MIN_AMOUNT)
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (live writes)' : 'DRY-RUN'}`)
  console.log(`Threshold: paid invoices ≥ $${MIN_AMOUNT.toLocaleString()}`)

  const [invoices, existingHistorical] = await Promise.all([
    fetchPaidInvoices(),
    fetchExistingHistorical(),
  ])
  console.log(`\nRead ${invoices.length} PAID ACCREC invoices`)
  console.log(`Existing xero-historical opportunities: ${existingHistorical.size}`)

  const buckets = bucketByFunderProject(invoices)
  console.log(`\n${buckets.length} (funder × project) buckets above threshold:\n`)

  const skipped = []
  const toCreate = []
  for (const b of buckets) {
    const oppName = `${b.funder} — won historical (xero${b.project ? `-${b.project}` : ''})`
    if (existingHistorical.has(oppName)) {
      skipped.push(b.funder)
      continue
    }
    toCreate.push({ ...b, oppName })
  }

  for (const b of toCreate) {
    console.log(`  + ${b.funder.padEnd(40)} ${b.project ?? '(no project)'} · $${b.paid.toFixed(0).padStart(9)} (${b.count} inv) last=${b.last_date}`)
  }
  if (skipped.length) console.log(`\n${skipped.length} buckets already backfilled, skipping`)

  if (!APPLY) {
    console.log('\nDRY-RUN. Re-run with --apply to write.')
    return
  }

  let oppsCreated = 0, decisionsCreated = 0
  for (const b of toCreate) {
    const sourceType = classifySource(b.funder)
    const { data: oppRow, error: oppErr } = await supabase
      .from('alma_funding_opportunities')
      .insert({
        name: b.oppName,
        funder_name: b.funder,
        source_type: sourceType,
        status: 'closed', // 'won' isn't in the check constraint; closed + decision='won' tells the full story
      })
      .select('id')
      .single()
    if (oppErr) {
      console.error(`  ✗ alma_funding_opportunities insert "${b.oppName}": ${oppErr.message}`)
      continue
    }
    oppsCreated += 1

    const { error: decErr } = await supabase
      .from('act_grant_recommendation_decisions')
      .insert({
        opportunity_id: oppRow.id,
        project_code: b.project ?? 'ACT-CORE',
        decision: 'won',
        decided_at: b.last_date ? new Date(b.last_date).toISOString() : new Date().toISOString(),
        notes: `Backfilled from xero_invoices · ${b.count} paid invoice(s) totalling $${b.paid.toFixed(2)} · last invoices: ${b.invoice_numbers.slice(0, 5).join(', ')}`,
      })
    if (decErr) {
      console.error(`  ✗ decision insert for "${b.funder}": ${decErr.message}`)
      continue
    }
    decisionsCreated += 1
  }

  console.log(`\nDone. alma_funding_opportunities created=${oppsCreated}, decisions created=${decisionsCreated}`)
}

main().catch(e => { console.error(e); process.exit(1) })
