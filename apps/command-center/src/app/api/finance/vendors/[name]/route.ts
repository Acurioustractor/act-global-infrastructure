import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Vendor profile: total spend, count, project distribution, suggested tag, all transactions.
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    const vendor = decodeURIComponent(name)
    if (!vendor) return NextResponse.json({ error: 'vendor required' }, { status: 400 })

    const [billsRes, spendsRes] = await Promise.all([
      supabase
        .from('xero_invoices')
        .select('id, xero_id, date, total, status, project_code, project_code_source, line_items, type')
        .eq('contact_name', vendor)
        .eq('type', 'ACCPAY')
        .in('status', ['AUTHORISED', 'PAID'])
        .order('date', { ascending: false })
        .range(0, 999),
      supabase
        .from('xero_transactions')
        .select('id, xero_transaction_id, date, total, status, type, project_code, project_code_source, line_items, has_attachments')
        .eq('contact_name', vendor)
        .in('type', ['SPEND', 'SPEND-OVERPAYMENT', 'RECEIVE'])
        .order('date', { ascending: false })
        .range(0, 999),
    ])

    const bills = billsRes.data || []
    const spends = spendsRes.data || []

    type V = { id: string; xeroId: string; source: string; date: string; total: number; status: string; projectCode: string | null; projectSource: string | null; description: string; xeroLink: string; hasAttachments: boolean }
    const rows: V[] = []
    for (const b of bills) {
      const firstDesc = Array.isArray(b.line_items) ? (b.line_items as any[]).map((x: any) => x?._ocr?.summary || x?.description || x?.Description || '').filter(Boolean).join(' | ') : ''
      rows.push({
        id: b.id as string,
        xeroId: b.xero_id as string,
        source: 'bill',
        date: b.date as string,
        total: Number(b.total),
        status: b.status as string,
        projectCode: (b.project_code as string) || null,
        projectSource: (b.project_code_source as string) || null,
        description: firstDesc,
        xeroLink: `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${b.xero_id}`,
        hasAttachments: false,
      })
    }
    for (const s of spends) {
      const firstDesc = Array.isArray(s.line_items) ? (s.line_items as any[]).map((x: any) => x?._ocr?.summary || x?.description || x?.Description || '').filter(Boolean).join(' | ') : ''
      rows.push({
        id: s.id as string,
        xeroId: s.xero_transaction_id as string,
        source: s.type === 'SPEND' ? 'spend' : s.type === 'SPEND-OVERPAYMENT' ? 'spend-overpay' : 'receive',
        date: s.date as string,
        total: Number(s.total),
        status: s.status as string,
        projectCode: (s.project_code as string) || null,
        projectSource: (s.project_code_source as string) || null,
        description: firstDesc,
        xeroLink: `https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=${s.xero_transaction_id}`,
        hasAttachments: !!s.has_attachments,
      })
    }
    rows.sort((a, b) => b.date.localeCompare(a.date))

    const projectDist = new Map<string, { count: number; sum: number }>()
    for (const r of rows) {
      const p = r.projectCode || 'UNTAGGED'
      const pp = projectDist.get(p) || { count: 0, sum: 0 }
      pp.count += 1; pp.sum += r.total; projectDist.set(p, pp)
    }
    const distArr = [...projectDist.entries()].map(([code, s]) => ({ code, count: s.count, sum: s.sum })).sort((a, b) => b.sum - a.sum)
    const totalCount = rows.length
    const totalSum = rows.reduce((a, r) => a + r.total, 0)

    // Suggest = most-common non-UNTAGGED project_code (by row count)
    const taggedDist = distArr.filter((d) => d.code !== 'UNTAGGED')
    const suggested = taggedDist[0] ? {
      projectCode: taggedDist[0].code,
      count: taggedDist[0].count,
      confidence: Math.round((taggedDist[0].count / Math.max(1, taggedDist.reduce((a, d) => a + d.count, 0))) * 100),
    } : null

    return NextResponse.json({
      vendor,
      totalCount,
      totalSum,
      projectDistribution: distArr,
      suggested,
      rows,
      untaggedCount: rows.filter((r) => !r.projectCode).length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
