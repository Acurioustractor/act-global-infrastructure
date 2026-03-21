/**
 * Outstanding invoices — unpaid invoices from the v_outstanding_invoices view.
 *
 * Extracted from Notion Workers Tool 10 (get_outstanding_invoices).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface OutstandingInvoicesOptions {
  project_code?: string
}

export interface OutstandingInvoice {
  invoice_number: string | null
  contact_name: string | null
  project_code: string | null
  type: string | null
  total: number
  amount_due: number
  amount_paid: number
  due_date: string | null
  aging_bucket: string | null
  days_overdue: number
}

export interface OutstandingInvoicesResult {
  count: number
  totalDue: number
  invoices: OutstandingInvoice[]
}

export async function fetchOutstandingInvoices(
  supabase: SupabaseQueryClient,
  opts: OutstandingInvoicesOptions = {}
): Promise<OutstandingInvoicesResult> {
  let query = supabase
    .from('v_outstanding_invoices')
    .select('invoice_number, contact_name, project_code, type, total, amount_due, amount_paid, date, due_date, aging_bucket, days_overdue')
    .order('days_overdue', { ascending: false, nullsFirst: false })

  if (opts.project_code) {
    query = query.eq('project_code', opts.project_code)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch outstanding invoices: ${error.message}`)
  if (!data?.length) {
    return { count: 0, totalDue: 0, invoices: [] }
  }

  let totalDue = 0
  const invoices: OutstandingInvoice[] = (data as any[]).map((inv) => {
    const amountDue = Number(inv.amount_due || 0)
    totalDue += amountDue
    return {
      invoice_number: inv.invoice_number || null,
      contact_name: inv.contact_name || null,
      project_code: inv.project_code || null,
      type: inv.type || null,
      total: Number(inv.total || 0),
      amount_due: amountDue,
      amount_paid: Number(inv.amount_paid || 0),
      due_date: inv.due_date || null,
      aging_bucket: inv.aging_bucket || null,
      days_overdue: Number(inv.days_overdue || 0),
    }
  })

  return { count: invoices.length, totalDue, invoices }
}
