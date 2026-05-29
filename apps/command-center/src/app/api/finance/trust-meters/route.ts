import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// STATE-surface trust meters (plan 2026-05-29 P2). Live, DB-derived signals
// that make every number on /finance/overview trustworthy:
//   1. Reconciliation %  — ACT bank spend reconciled in Xero
//   2. Receipt coverage % — ACT spend txns + active bills with a receipt attached
//   3. Tagging coverage % — txns + bills tagged to a project
//   4. Uncategorised (429) — $ still sitting in the General Expenses catch-all
//      (lower is better; the GE recode is driving this toward 0)
//
// Scope: the two ACT spend accounts only (per the two-account rule). NM Personal
// and the Maximiser savings account are excluded from all ACT totals.

const ACT_ACCOUNTS = ['NAB Visa ACT #8815', 'NJ Marchesi T/as ACT Everyday']
const ACTIVE_BILL_STATUS = ['PAID', 'AUTHORISED']

/** Current Australian financial year (1 Jul → 30 Jun). */
function currentAuFy(): { start: string; end: string } {
  const now = new Date()
  const y = now.getUTCFullYear()
  const startYear = now.getUTCMonth() >= 6 ? y : y - 1 // month 6 = July (0-indexed)
  return { start: `${startYear}-07-01`, end: `${startYear + 1}-06-30` }
}

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 1000) / 10 : 0
}

/** head:true count — no rows transferred. */
async function countTxns(extra: (q: any) => any): Promise<number> {
  let q = supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'SPEND')
    .in('bank_account', ACT_ACCOUNTS)
  q = extra(q)
  const { count } = await q
  return count ?? 0
}

async function countBills(extra: (q: any) => any): Promise<number> {
  let q = supabase
    .from('xero_invoices')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'ACCPAY')
    .in('status', ACTIVE_BILL_STATUS)
  q = extra(q)
  const { count } = await q
  return count ?? 0
}

export async function GET() {
  try {
    const fy = currentAuFy()
    const inFy = (q: any) => q.gte('date', fy.start).lte('date', fy.end)

    const [
      txnTotal,
      txnReconciled,
      txnReceipt,
      txnTagged,
      billTotal,
      billReceipt,
      billTagged,
      uncategorised,
    ] = await Promise.all([
      countTxns(inFy),
      countTxns((q) => inFy(q).eq('is_reconciled', true)),
      countTxns((q) => inFy(q).eq('has_attachments', true)),
      countTxns((q) => inFy(q).not('project_code', 'is', null)),
      countBills(inFy),
      countBills((q) => inFy(q).eq('has_attachments', true)),
      countBills((q) => inFy(q).not('project_code', 'is', null)),
      // GE catch-all: bills with any line coded to account 429 (bill-level, like
      // the recode worklist). Tiny set (~95) — fetch totals and sum in JS.
      supabase
        .from('xero_invoices')
        .select('total')
        .eq('type', 'ACCPAY')
        .in('status', ACTIVE_BILL_STATUS)
        // jsonb containment (@>): pass a JSON string, not an array — supabase-js
        // .contains() would serialise an array as a Postgres array literal {…}.
        .filter('line_items', 'cs', JSON.stringify([{ account_code: '429' }])),
    ])

    const uncatRows = (uncategorised.data ?? []) as Array<{ total: number | null }>
    const uncatAmount = uncatRows.reduce((sum, r) => sum + (r.total ?? 0), 0)

    const receiptNum = txnReceipt + billReceipt
    const receiptDen = txnTotal + billTotal
    const taggingNum = txnTagged + billTagged
    const taggingDen = txnTotal + billTotal

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      fy,
      reconciliation: { reconciled: txnReconciled, total: txnTotal, pct: pct(txnReconciled, txnTotal) },
      receiptCoverage: { withReceipt: receiptNum, total: receiptDen, pct: pct(receiptNum, receiptDen) },
      tagging: { tagged: taggingNum, total: taggingDen, pct: pct(taggingNum, taggingDen) },
      uncategorised429: { bills: uncatRows.length, amount: Math.round(uncatAmount * 100) / 100 },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'trust-meters failed' },
      { status: 500 },
    )
  }
}
