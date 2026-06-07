import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface CustomerRow {
  contact_name: string
  paid_count: number
  paid_total: number
  authorised_outstanding: number
  draft_total: number
  last_invoice_date: string | null
  in_funder_snapshot: boolean
}

interface LifetimeLedgerResponse {
  generatedAt: string
  totals: {
    distinctCustomers: number
    payingCustomers: number
    lifetimePaid: number
    lifetimeAuthorised: number
    lifetimeDraft: number
    visibleBook: number
  }
  coverageGap: {
    snapshotRows: number
    xeroPayers: number
    matched: number
    missingFromSnapshot: number
    missingNames: string[]
  }
  topCustomers: CustomerRow[]
}

const n = (v: unknown) => (v == null ? 0 : Number(v))

export async function GET() {
  // 1. All ACCREC invoices grouped by contact_name (lifetime view)
  const { data: invoices, error } = await supabase
    .from('xero_invoices')
    .select('contact_name, status, type, total, amount_due, date')
    .eq('type', 'ACCREC')
    .not('status', 'in', '(DELETED,VOIDED)')
    .not('contact_name', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byContact = new Map<string, CustomerRow>()
  for (const inv of invoices ?? []) {
    const name = (inv.contact_name as string).trim()
    if (!name) continue
    let row = byContact.get(name)
    if (!row) {
      row = {
        contact_name: name,
        paid_count: 0,
        paid_total: 0,
        authorised_outstanding: 0,
        draft_total: 0,
        last_invoice_date: null,
        in_funder_snapshot: false,
      }
      byContact.set(name, row)
    }
    const total = n(inv.total)
    const amountDue = n(inv.amount_due)
    if (inv.status === 'PAID') {
      row.paid_count += 1
      row.paid_total += total
    } else if (inv.status === 'AUTHORISED' || inv.status === 'SUBMITTED') {
      row.authorised_outstanding += amountDue
    } else if (inv.status === 'DRAFT') {
      row.draft_total += total
    }
    if (inv.date && (!row.last_invoice_date || inv.date > row.last_invoice_date)) {
      row.last_invoice_date = inv.date
    }
  }

  // 2. Cross-check against funder_context_snapshot
  const { data: snapshotRows } = await supabase
    .from('funder_context_snapshot')
    .select('funder_name, funder_aliases')

  const snapshotCanonical = new Set<string>()
  for (const r of snapshotRows ?? []) {
    if (r.funder_name) snapshotCanonical.add(String(r.funder_name).toLowerCase().trim())
    if (Array.isArray(r.funder_aliases)) {
      for (const alias of r.funder_aliases) {
        if (typeof alias === 'string') snapshotCanonical.add(alias.toLowerCase().trim())
      }
    }
  }

  const customers = Array.from(byContact.values())
  for (const c of customers) {
    c.in_funder_snapshot = snapshotCanonical.has(c.contact_name.toLowerCase().trim())
  }

  // 3. Totals
  const totals = customers.reduce(
    (acc, c) => ({
      distinctCustomers: acc.distinctCustomers + 1,
      payingCustomers: acc.payingCustomers + (c.paid_count > 0 ? 1 : 0),
      lifetimePaid: acc.lifetimePaid + c.paid_total,
      lifetimeAuthorised: acc.lifetimeAuthorised + c.authorised_outstanding,
      lifetimeDraft: acc.lifetimeDraft + c.draft_total,
      visibleBook: 0,
    }),
    { distinctCustomers: 0, payingCustomers: 0, lifetimePaid: 0, lifetimeAuthorised: 0, lifetimeDraft: 0, visibleBook: 0 },
  )
  totals.visibleBook = totals.lifetimePaid + totals.lifetimeAuthorised + totals.lifetimeDraft

  // 4. Coverage gap (paying customers only — they're the canonical "won" set)
  const paying = customers.filter(c => c.paid_count > 0)
  const matched = paying.filter(c => c.in_funder_snapshot)
  const missing = paying
    .filter(c => !c.in_funder_snapshot)
    .sort((a, b) => b.paid_total - a.paid_total)
    .map(c => c.contact_name)

  const coverageGap = {
    snapshotRows: snapshotRows?.length ?? 0,
    xeroPayers: paying.length,
    matched: matched.length,
    missingFromSnapshot: missing.length,
    missingNames: missing.slice(0, 15),
  }

  // 5. Top customers — sort by paid_total + authorised_outstanding (commercial weight)
  const topCustomers = customers
    .sort((a, b) => (b.paid_total + b.authorised_outstanding) - (a.paid_total + a.authorised_outstanding))
    .slice(0, 20)

  const response: LifetimeLedgerResponse = {
    generatedAt: new Date().toISOString(),
    totals,
    coverageGap,
    topCustomers,
  }
  return NextResponse.json(response)
}
