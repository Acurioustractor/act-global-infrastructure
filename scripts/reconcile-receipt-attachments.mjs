#!/usr/bin/env node
/**
 * Reconcile xero_transactions.has_attachments against receipt_emails.
 *
 * The drift: receipts uploaded to Xero outside the Gmail pipeline (manual
 * Xero UI uploads, third-party OCR runs, partial-failure recovery) leave
 * xero_transactions.has_attachments=false in the Supabase mirror even
 * though Xero itself shows the attachment. R&D evidence pack scoring +
 * BAS-readiness reports both read this column, so drift makes them
 * under-count receipted spend.
 *
 * Single source of truth for "this transaction has an OCR'd receipt
 * attached": receipt_emails.status='uploaded' AND xero_transaction_id IS
 * NOT NULL. Per session memory:
 *   "xero_transactions.has_attachments drifts (refresh via
 *    receipt_emails.status='uploaded'); xero_invoices.has_attachments
 *    is accurate."
 *
 * Idempotent: only flips rows where has_attachments is currently false,
 * so a no-drift run is a no-op.
 *
 * Usage:
 *   node scripts/reconcile-receipt-attachments.mjs            # apply
 *   node scripts/reconcile-receipt-attachments.mjs --dry-run  # report only
 */
import './lib/load-env.mjs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SHARED_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')

async function loadUploadedReceiptTxnIds() {
  const ids = new Set()
  let from = 0
  const page = 1000
  while (true) {
    const { data, error } = await sb
      .from('receipt_emails')
      .select('xero_transaction_id')
      .eq('status', 'uploaded')
      .not('xero_transaction_id', 'is', null)
      .range(from, from + page - 1)
    if (error) throw new Error(`receipt_emails: ${error.message}`)
    if (!data || data.length === 0) break
    for (const r of data) if (r.xero_transaction_id) ids.add(r.xero_transaction_id)
    if (data.length < page) break
    from += page
  }
  return ids
}

async function findDrifted(txnIds) {
  const ids = Array.from(txnIds)
  const drifted = []
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100)
    const { data, error } = await sb
      .from('xero_transactions')
      .select('xero_transaction_id, has_attachments, contact_name, total, date, type')
      .in('xero_transaction_id', batch)
      .eq('has_attachments', false)
    if (error) throw new Error(`xero_transactions: ${error.message}`)
    drifted.push(...(data || []))
  }
  return drifted
}

async function applyUpdates(drifted) {
  let updated = 0
  for (let i = 0; i < drifted.length; i += 100) {
    const batch = drifted.slice(i, i + 100).map((r) => r.xero_transaction_id)
    const { error } = await sb.from('xero_transactions').update({ has_attachments: true }).in('xero_transaction_id', batch)
    if (error) throw new Error(`update batch ${i}-${i + batch.length}: ${error.message}`)
    updated += batch.length
  }
  return updated
}

async function main() {
  console.log(`[reconcile-receipts] ${DRY_RUN ? 'DRY-RUN' : 'APPLY'} mode`)
  const txnIds = await loadUploadedReceiptTxnIds()
  console.log(`[reconcile-receipts] ${txnIds.size} txns have an uploaded receipt in receipt_emails`)

  if (txnIds.size === 0) {
    console.log('[reconcile-receipts] no uploaded receipts; nothing to reconcile')
    return
  }

  const drifted = await findDrifted(txnIds)
  console.log(`[reconcile-receipts] ${drifted.length} drifted (receipt uploaded but has_attachments=false)`)

  if (drifted.length === 0) {
    console.log('[reconcile-receipts] mirror is in sync; no-op')
    return
  }

  console.log(`[reconcile-receipts] sample (first 10):`)
  for (const r of drifted.slice(0, 10)) {
    console.log(`  ${r.date} ${r.type} ${r.contact_name} $${r.total} (${r.xero_transaction_id})`)
  }

  if (DRY_RUN) {
    console.log('[reconcile-receipts] DRY-RUN: re-run without --dry-run to apply')
    return
  }

  const updated = await applyUpdates(drifted)
  console.log(`[reconcile-receipts] flipped has_attachments=true on ${updated} rows`)
}

main().catch((e) => {
  console.error('[reconcile-receipts] fatal:', e.message)
  process.exit(1)
})
