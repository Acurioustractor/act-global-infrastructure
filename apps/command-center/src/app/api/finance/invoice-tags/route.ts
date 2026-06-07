import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * GET /api/finance/invoice-tags?type=ACCREC|ACCPAY — a flat list of every invoice + its project tag,
 * for the simple "see every invoice and move it" view. ACCREC = income (sales), ACCPAY = bills.
 *
 * Excludes DELETED + VOIDED (those didn't really "come in"). Paginates the 1000-row cap. Sorted date desc.
 * Reassignment is the same reversible writer as the cost drill (POST /api/finance/cost-reassign, kind=invoice).
 */

const LEGACY = new Set(['ACT-CG', 'ACT-HQ', 'ACT-PC'])

interface InvoiceRow {
  id: string
  xeroId: string | null
  date: string | null
  number: string | null
  contact: string | null
  total: number
  status: string | null
  projectCode: string | null
  hasReceipt: boolean
  xeroLink: string
}

export async function GET(request: NextRequest) {
  try {
    const type = (request.nextUrl.searchParams.get('type') || 'ACCREC').toUpperCase() === 'ACCPAY' ? 'ACCPAY' : 'ACCREC'

    // Paginate (ACCPAY ~2k exceeds the server cap).
    const PAGE = 1000
    const raw: {
      id: string; xero_id: string | null; date: string | null; invoice_number: string | null
      contact_name: string | null; total: number | string | null; status: string | null
      project_code: string | null; has_attachments: boolean | null
    }[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('xero_invoices')
        .select('id, xero_id, date, invoice_number, contact_name, total, status, project_code, has_attachments')
        .eq('type', type)
        .not('status', 'in', '("DELETED","VOIDED")')
        .order('date', { ascending: false })
        .range(from, from + PAGE - 1)
      if (error) throw error
      const batch = data ?? []
      raw.push(...batch)
      if (batch.length < PAGE) break
    }

    const isAccrec = type === 'ACCREC'
    const rows: InvoiceRow[] = raw.map((r) => ({
      id: r.id,
      xeroId: r.xero_id,
      date: r.date,
      number: r.invoice_number,
      contact: r.contact_name,
      total: Number(r.total || 0),
      status: r.status,
      projectCode: r.project_code,
      hasReceipt: r.has_attachments === true,
      xeroLink: isAccrec
        ? `https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${r.xero_id}`
        : `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${r.xero_id}`,
    }))

    // Reassign targets: active, non-legacy projects.
    const { data: projects } = await supabase.from('projects').select('code, name, status').limit(500)
    const targetProjects = (projects || [])
      .filter((p) => (p.status ?? 'active') === 'active' && !LEGACY.has(String(p.code).toUpperCase()))
      .map((p) => ({ code: String(p.code).toUpperCase(), name: p.name ?? p.code }))
      .sort((a, b) => a.code.localeCompare(b.code))

    const totalValue = rows.reduce((a, r) => a + r.total, 0)
    const taggedCount = rows.filter((r) => r.projectCode).length

    return NextResponse.json({
      type,
      rows,
      projects: targetProjects,
      stats: { count: rows.length, totalValue: Math.round(totalValue), taggedCount },
    })
  } catch (e) {
    console.error('invoice-tags error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
