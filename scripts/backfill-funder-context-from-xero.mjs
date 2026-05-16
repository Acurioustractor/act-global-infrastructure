#!/usr/bin/env node
/**
 * Backfill funder_context_snapshot from xero_invoices.
 *
 * Implements action #1 from the 2026-05-16 "lifetime ledger" finding:
 *   "Extend ... to pull DISTINCT contact_name FROM xero_invoices WHERE type='ACCREC'
 *    and include those alongside foundations."
 *
 * Behaviour:
 *   - For each DISTINCT Xero ACCREC customer NOT in funder_context_snapshot:
 *     INSERT a stub row with funder_name = contact_name, funder_aliases = ['xero-seed'],
 *     and the xero_* aggregate columns populated.
 *   - For existing rows matched by funder_name (case-insensitive trim) that have
 *     xero_paid_total IS NULL, UPDATE the xero_* fields with latest aggregates.
 *   - Never overwrites a row that already has xero data (safe re-run).
 *
 * Idempotent. Cleanup query: `DELETE FROM funder_context_snapshot WHERE 'xero-seed' = ANY(funder_aliases);`
 *
 * Usage:
 *   node scripts/backfill-funder-context-from-xero.mjs --dry-run   (default — preview only)
 *   node scripts/backfill-funder-context-from-xero.mjs --apply     (live writes)
 */

import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') })
loadEnv({ path: path.resolve(__dirname, '..', '.env') })

const APPLY = process.argv.includes('--apply')
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const canon = s => String(s ?? '').toLowerCase().trim()

async function fetchAllInvoices() {
  const PAGE = 1000
  let from = 0, out = []
  while (true) {
    const { data, error } = await supabase
      .from('xero_invoices')
      .select('contact_name, status, total, amount_due, date')
      .eq('type', 'ACCREC')
      .not('contact_name', 'is', null)
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return out
}

async function fetchSnapshot() {
  const { data, error } = await supabase
    .from('funder_context_snapshot')
    .select('funder_name, funder_aliases, xero_paid_total')
  if (error) throw error
  return data ?? []
}

function aggregateByContact(invoices) {
  const m = new Map()
  for (const inv of invoices) {
    const name = inv.contact_name.trim()
    if (!name) continue
    let row = m.get(name)
    if (!row) {
      row = { name, paid: 0, authorised: 0, invoiced: 0, lastInvoiceDate: null, lastPaymentDate: null }
      m.set(name, row)
    }
    const total = Number(inv.total ?? 0)
    const amountDue = Number(inv.amount_due ?? 0)
    row.invoiced += total
    if (inv.status === 'PAID') {
      row.paid += total
      if (inv.date && (!row.lastPaymentDate || inv.date > row.lastPaymentDate)) {
        row.lastPaymentDate = inv.date
      }
    } else if (inv.status === 'AUTHORISED' || inv.status === 'SUBMITTED') {
      row.authorised += amountDue
    }
    if (inv.date && (!row.lastInvoiceDate || inv.date > row.lastInvoiceDate)) {
      row.lastInvoiceDate = inv.date
    }
  }
  return [...m.values()]
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (live writes)' : 'DRY-RUN (no writes)'}`)
  const [invoices, snapshot] = await Promise.all([fetchAllInvoices(), fetchSnapshot()])
  console.log(`Read ${invoices.length} ACCREC invoices, ${snapshot.length} snapshot rows`)

  const byContact = aggregateByContact(invoices)
  const canonicalToSnapshot = new Map()
  for (const s of snapshot) {
    if (s.funder_name) canonicalToSnapshot.set(canon(s.funder_name), s)
    if (Array.isArray(s.funder_aliases)) {
      for (const a of s.funder_aliases) {
        if (typeof a === 'string') canonicalToSnapshot.set(canon(a), s)
      }
    }
  }

  const toInsert = []
  const toUpdate = []
  for (const c of byContact) {
    const existing = canonicalToSnapshot.get(canon(c.name))
    if (!existing) {
      toInsert.push({
        funder_name: c.name,
        funder_aliases: ['xero-seed'],
        xero_invoiced_total: c.invoiced,
        xero_paid_total: c.paid,
        xero_authorised_total: c.authorised,
        xero_last_invoice_date: c.lastInvoiceDate,
        xero_last_payment_date: c.lastPaymentDate,
      })
    } else if (existing.xero_paid_total == null || Number(existing.xero_paid_total) === 0) {
      toUpdate.push({
        funder_name: existing.funder_name,
        patch: {
          xero_invoiced_total: c.invoiced,
          xero_paid_total: c.paid,
          xero_authorised_total: c.authorised,
          xero_last_invoice_date: c.lastInvoiceDate,
          xero_last_payment_date: c.lastPaymentDate,
        },
      })
    }
  }

  console.log(`\nWill INSERT ${toInsert.length} new snapshot rows (xero-seed)`)
  for (const r of toInsert.slice(0, 10)) {
    console.log(`  + ${r.funder_name}  paid=$${r.xero_paid_total.toFixed(2)}  ar=$${r.xero_authorised_total.toFixed(2)}`)
  }
  if (toInsert.length > 10) console.log(`  ... and ${toInsert.length - 10} more`)

  console.log(`\nWill UPDATE ${toUpdate.length} existing rows with Xero aggregates`)
  for (const r of toUpdate.slice(0, 10)) {
    console.log(`  ~ ${r.funder_name}  paid=$${r.patch.xero_paid_total.toFixed(2)}`)
  }
  if (toUpdate.length > 10) console.log(`  ... and ${toUpdate.length - 10} more`)

  if (!APPLY) {
    console.log('\nDRY-RUN complete. Re-run with --apply to write.')
    return
  }

  let inserted = 0, updated = 0
  for (const row of toInsert) {
    const { error } = await supabase.from('funder_context_snapshot').insert(row)
    if (error) { console.error(`  ✗ insert "${row.funder_name}": ${error.message}`); continue }
    inserted++
  }
  for (const u of toUpdate) {
    const { error } = await supabase
      .from('funder_context_snapshot')
      .update(u.patch)
      .eq('funder_name', u.funder_name)
    if (error) { console.error(`  ✗ update "${u.funder_name}": ${error.message}`); continue }
    updated++
  }
  console.log(`\nDone. Inserted=${inserted}, Updated=${updated}`)
}

main().catch(e => { console.error(e); process.exit(1) })
