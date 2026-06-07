import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

type Row = {
  id: string
  xeroId: string
  source: 'bill' | 'spend' | 'spend-overpay' | 'receive'
  date: string
  contact: string
  total: number
  status: string
  ref: string
  description: string
  auditNote: string
  flagDuplicate: boolean
  paymentOfBill: boolean
  xeroLink: string
  projectCode: string | null
  hasReceipt: boolean
}

function firstDescr(li: any[] | null | undefined): string {
  if (!Array.isArray(li) || !li.length) return ''
  for (const x of li) {
    if (x && x._ocr && x._ocr.summary) return `[OCR] ${x._ocr.summary}`
  }
  return li
    .map((x) => x?.description || x?.Description || '')
    .filter(Boolean)
    .join(' | ')
}

function auditNote(row: { xeroId: string; contact: string; total: number; description: string }): string {
  const id = row.xeroId
  const n = (row.contact || '').toLowerCase()
  const desc = (row.description || '').toLowerCase()

  if (id === '0e7e9885-4c3e-4100-a6fc-40433e2e1e6d') return '⚠ DUPLICATE — to void (Kennedy\'s 10t decking charged twice)'
  if (id === '9ae29a04-f83b-48d1-a158-22565e2bd0cc') return '★ St Mary\'s Cathedral 10t decking @ $700 + delivery'
  if (id === 'e8ab116e-7920-40fc-92ce-0ffbd2ea09d0') return '★ St Mary\'s Cathedral 2.5t + recycled timber'
  if (id === '310fa568-bf02-4fdf-b6d4-c7e41f0ff4a4') return '? Carbatec router table — maybe duplicated inside $4,575 invoice'
  if (id === '6bf82502-d122-45ab-8f1c-843415d36441') return '? Carbatec bandsaw — maybe duplicated inside $1,811 invoice'
  if (n === 'flight bar witta') return '⚠ NT/SA/Melb/HK travel — should be ACT-OO'
  if (n === 'claire marchesi' && row.total === 8888) return '? purpose unconfirmed'
  if (n.includes('longara')) return 'milk crates'
  if (n.includes('rnm carpentry')) return '⚠ user flagged not Harvest'
  if (n.includes('bunnings') && desc.includes('act-in')) return '⚠ line desc says ACT-IN — miscoded'
  if (n.includes('savage landscape')) return 'soil/compost'
  if (n.includes('maleny landscaping')) return 'mulch/landscape'
  if (n.includes('sophie deirdre hickey')) return 'gardening'
  if (n.includes('thais pupio')) return '? design — confirm Harvest-related'
  if (n.includes('smartwood')) return 'timber'
  if (n.includes('liberty') || n === '7-eleven') return 'fuel'
  if (n === 'maleny hotel') return '? team meal — review tag'
  if (n.includes('fisher') && n.includes('oyster')) return '? 70 oyster plates — review'
  if (n === 'iga' || n === 'woolworths') return '? groceries — review'
  if (n.includes('nest in witta') || n.startsWith('cj') || n.includes('frank food') || n.includes('mapleton') || n.includes('sukhothai')) return 'local cafe/meal'
  if (n.startsWith('chris witta')) return 'site work'
  return ''
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const projectCode = decodeURIComponent(code).toUpperCase()

    // Optional date window (cost-drill passes the FY so the lines reconcile with the FY26 P&L table).
    // Omitted → all-time (the "full transaction ledger" page relies on that).
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    let billsQ = supabase
      .from('xero_invoices')
      .select('id, xero_id, date, contact_name, total, status, invoice_number, line_items, project_code, has_attachments')
      .eq('project_code', projectCode)
      .eq('type', 'ACCPAY')
      .in('status', ['AUTHORISED', 'PAID'])
    let spendsQ = supabase
      .from('xero_transactions')
      .select('id, xero_transaction_id, date, contact_name, total, status, type, line_items, project_code, has_attachments')
      .eq('project_code', projectCode)
      .in('type', ['SPEND', 'SPEND-OVERPAYMENT', 'RECEIVE'])
    if (from) { billsQ = billsQ.gte('date', from); spendsQ = spendsQ.gte('date', from) }
    if (to) { billsQ = billsQ.lte('date', to); spendsQ = spendsQ.lte('date', to) }

    const [billsRes, spendsRes] = await Promise.all([
      billsQ.order('date', { ascending: false }).range(0, 9999),
      spendsQ.order('date', { ascending: false }).range(0, 9999),
    ])

    const bills = billsRes.data || []
    const spends = spendsRes.data || []

    // Detect spends that mirror a paid bill (vendor+amount+date±14d)
    const paid = bills.filter((b: any) => b.status === 'PAID')
    const matched = new Set<string>()
    for (const s of spends) {
      const sd = new Date(s.date as string).getTime()
      if (
        paid.some(
          (b: any) =>
            (b.contact_name || '').trim().toUpperCase() === (s.contact_name || '').trim().toUpperCase() &&
            Number(b.total) === Number(s.total) &&
            Math.abs((new Date(b.date as string).getTime() - sd) / 86400000) <= 14
        )
      ) {
        matched.add(s.xero_transaction_id as string)
      }
    }

    const rows: Row[] = []
    for (const b of bills) {
      const description = firstDescr(b.line_items as any[])
      const xeroId = b.xero_id as string
      const total = Number(b.total)
      const note = auditNote({ xeroId, contact: b.contact_name as string, total, description })
      rows.push({
        id: b.id as string,
        xeroId,
        source: 'bill',
        date: b.date as string,
        contact: b.contact_name as string,
        total,
        status: b.status as string,
        ref: (b.invoice_number as string) || '',
        description,
        auditNote: note,
        flagDuplicate: note.startsWith('⚠ DUPLICATE'),
        paymentOfBill: false,
        xeroLink: `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${xeroId}`,
        projectCode: (b.project_code as string) || null,
        hasReceipt: b.has_attachments === true,
      })
    }
    for (const s of spends) {
      const description = firstDescr(s.line_items as any[])
      const xeroId = s.xero_transaction_id as string
      const total = Number(s.total)
      const note = auditNote({ xeroId, contact: s.contact_name as string, total, description })
      const sourceKind: Row['source'] =
        s.type === 'SPEND' ? 'spend' : s.type === 'SPEND-OVERPAYMENT' ? 'spend-overpay' : 'receive'
      rows.push({
        id: s.id as string,
        xeroId,
        source: sourceKind,
        date: s.date as string,
        contact: s.contact_name as string,
        total,
        status: s.status as string,
        ref: '',
        description,
        auditNote: note,
        flagDuplicate: note.startsWith('⚠ DUPLICATE'),
        paymentOfBill: matched.has(xeroId),
        xeroLink: `https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=${xeroId}`,
        projectCode: (s.project_code as string) || null,
        hasReceipt: s.has_attachments === true,
      })
    }

    rows.sort((a, b) => b.date.localeCompare(a.date) || a.contact.localeCompare(b.contact))

    return NextResponse.json({ projectCode, count: rows.length, rows })
  } catch (e: any) {
    console.error('transactions endpoint error', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
