import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const FY26_START = '2025-07-01'
const FY26_END = '2026-06-30'

interface FounderInvoice {
  invoice_number: string | null
  date: string | null
  total: number
  status: string | null
}

interface FounderPayResponse {
  fy: string
  generatedAt: string
  era: 'pre-cutover' | 'post-cutover'
  cutoverDate: string
  nic: {
    channel: string
    ytdAmount: number
    note: string
    fy27Target: { monthly: number; annual: number }
  }
  ben: {
    channel: string
    ytdAmount: number
    invoiceCount: number
    lastInvoice: FounderInvoice | null
    note: string
    fy27Target: { monthly: number; annual: number }
  }
  caveats: string[]
}

export async function GET() {
  try {
    // Mirrors scripts/sync-money-framework-to-notion.mjs::fetchKnightPhotography + fetchFY26Totals
    const [knightRes, fy26Res] = await Promise.all([
      supabase
        .from('xero_invoices')
        .select('invoice_number, date, total, status')
        .eq('type', 'ACCPAY')
        .ilike('contact_name', '%Knight Photography%')
        .gte('date', FY26_START)
        .lte('date', FY26_END)
        .order('date', { ascending: false })
        .limit(40),
      supabase
        .from('xero_invoices')
        .select('type, total, status, amount_paid')
        .gte('date', FY26_START)
        .lte('date', FY26_END),
    ])

    if (knightRes.error) throw knightRes.error
    if (fy26Res.error) throw fy26Res.error

    const knightInvoices = (knightRes.data || []) as FounderInvoice[]
    let income = 0
    let expenses = 0
    for (const i of fy26Res.data || []) {
      const t = Number(i.total || 0)
      if (i.type === 'ACCREC') income += t
      else if (i.type === 'ACCPAY') expenses += t
    }
    const fy26Net = income - expenses

    const knightTotal = knightInvoices.reduce((s, i) => s + Number(i.total || 0), 0)

    const today = new Date()
    const cutover = new Date('2026-06-30')
    const era: 'pre-cutover' | 'post-cutover' = today < cutover ? 'pre-cutover' : 'post-cutover'

    const response: FounderPayResponse = {
      fy: 'FY26',
      generatedAt: new Date().toISOString(),
      era,
      cutoverDate: '2026-06-30',
      nic: {
        channel: era === 'pre-cutover' ? 'Sole trader drawings (implicit)' : 'PAYG salary (Pty)',
        ytdAmount: fy26Net,
        note: 'FY26 era: ST profit flows to Nic as drawings. Already taxed at marginal. Channel #28.',
        fy27Target: { monthly: 10000, annual: 120000 },
      },
      ben: {
        channel: era === 'pre-cutover' ? 'Knight Photography invoiced ACT' : 'PAYG salary (Pty)',
        ytdAmount: knightTotal,
        invoiceCount: knightInvoices.length,
        lastInvoice: knightInvoices[0] || null,
        note: 'FY26 era: KP invoices ACT. Gross before KP costs. KP runs separate books. Channel #27.',
        fy27Target: { monthly: 10000, annual: 120000 },
      },
      caveats: [
        'Per-founder breakdown not fully computable from Xero alone — manual entry of personal super contributions and KP own-books is missing.',
        'Cutover 30 Jun 2026: from 1 Jul both founders move to $10K/mo PAYG (Channel #8) plus trust distributions from FY27 onwards (first resolution Jun 2027).',
      ],
    }

    return NextResponse.json(response)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
