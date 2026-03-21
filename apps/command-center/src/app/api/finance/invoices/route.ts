import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface InvoiceRow {
  id: string
  xero_id: string
  invoice_number: string | null
  type: string
  status: string | null
  contact_name: string | null
  date: string | null
  due_date: string | null
  total: number | null
  amount_due: number | null
  amount_paid: number | null
  has_attachments: boolean | null
  reference: string | null
  project_code: string | null
  line_items: unknown
  fully_paid_date: string | null
}

function getLineDesc(lineItems: unknown): string | null {
  if (!Array.isArray(lineItems) || lineItems.length === 0) return null
  for (const li of lineItems) {
    const desc = li?.Description || li?.description
    if (desc && typeof desc === 'string' && desc.trim().length > 0) {
      return desc.trim().slice(0, 120)
    }
  }
  return null
}

export async function GET() {
  try {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // One week from now
    const oneWeek = new Date(now)
    oneWeek.setDate(oneWeek.getDate() + 7)
    const oneWeekStr = oneWeek.toISOString().split('T')[0]

    // Fetch all active invoices + projects in parallel
    const [invResult, projectsResult] = await Promise.all([
      supabase
        .from('xero_invoices')
        .select('id, xero_id, invoice_number, type, status, contact_name, date, due_date, total, amount_due, amount_paid, has_attachments, reference, project_code, line_items, fully_paid_date')
        .in('status', ['DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID'])
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('projects')
        .select('code, name, tier')
        .eq('status', 'active')
        .order('name'),
    ])

    const invoices = (invResult.data || []) as InvoiceRow[]
    const projects = projectsResult.data || []

    // Compute stats and enrich items
    let receivableTotal = 0
    let receivableCount = 0
    let payableTotal = 0
    let payableCount = 0
    let overdueTotal = 0
    let overdueCount = 0
    let dueThisWeekTotal = 0
    let dueThisWeekCount = 0
    let paidTotal = 0
    let paidCount = 0

    const items = invoices.map(inv => {
      const direction = inv.type === 'ACCREC' ? 'in' : 'out'
      const amount = Math.abs(inv.total || 0)
      const amountDue = Math.abs(inv.amount_due || 0)
      const isPaid = inv.status === 'PAID'

      // Days calculations
      let daysOverdue = 0
      let daysUntilDue = 0
      let isOverdue = false
      let isDueSoon = false

      if (inv.due_date && !isPaid) {
        const dueDate = new Date(inv.due_date)
        const diffMs = dueDate.getTime() - now.getTime()
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
        if (diffDays < 0) {
          daysOverdue = Math.abs(diffDays)
          isOverdue = true
        } else {
          daysUntilDue = diffDays
          isDueSoon = diffDays <= 7
        }
      }

      // Aggregate stats
      if (isPaid) {
        paidTotal += amount
        paidCount++
      } else if (direction === 'in') {
        receivableTotal += amountDue
        receivableCount++
        if (isOverdue) { overdueTotal += amountDue; overdueCount++ }
        if (isDueSoon) { dueThisWeekTotal += amountDue; dueThisWeekCount++ }
      } else {
        payableTotal += amountDue
        payableCount++
        if (isOverdue) { overdueTotal += amountDue; overdueCount++ }
        if (isDueSoon) { dueThisWeekTotal += amountDue; dueThisWeekCount++ }
      }

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        vendor: inv.contact_name || 'Unknown',
        direction,
        status: inv.status || 'DRAFT',
        amount,
        amountDue,
        amountPaid: Math.abs(inv.amount_paid || 0),
        date: inv.date,
        dueDate: inv.due_date,
        paidDate: inv.fully_paid_date,
        daysOverdue,
        daysUntilDue,
        isOverdue,
        isDueSoon,
        isPaid,
        hasReceipt: inv.has_attachments || false,
        projectCode: inv.project_code || null,
        description: getLineDesc(inv.line_items) || inv.reference || null,
      }
    })

    // Sort: overdue first (by days overdue desc), then due soon, then by due date
    items.sort((a, b) => {
      // Overdue items first
      if (a.isOverdue && !b.isOverdue) return -1
      if (!a.isOverdue && b.isOverdue) return 1
      if (a.isOverdue && b.isOverdue) return b.daysOverdue - a.daysOverdue

      // Then due soon
      if (a.isDueSoon && !b.isDueSoon) return -1
      if (!a.isDueSoon && b.isDueSoon) return 1

      // Then unpaid before paid
      if (!a.isPaid && b.isPaid) return -1
      if (a.isPaid && !b.isPaid) return 1

      // Then by amount desc
      return b.amount - a.amount
    })

    return NextResponse.json({
      items,
      projects: projects.map(p => ({ code: p.code, name: p.name, tier: p.tier })),
      stats: {
        receivable: { total: receivableTotal, count: receivableCount },
        payable: { total: payableTotal, count: payableCount },
        overdue: { total: overdueTotal, count: overdueCount },
        dueThisWeek: { total: dueThisWeekTotal, count: dueThisWeekCount },
        paid: { total: paidTotal, count: paidCount },
        totalItems: items.length,
      },
    })
  } catch (e) {
    console.error('Invoices API error:', e)
    return NextResponse.json({ error: 'Failed to load invoices' }, { status: 500 })
  }
}
