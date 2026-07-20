import { NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { supabase } from '@/lib/supabase'

const PROJECT_CODE = 'ACT-HV'
const FUND_TOTAL = 250_000
const FUND_START = '2026-01-01'
const NOTION_BUDGET_DATA_SOURCE = process.env.NOTION_HARVEST_BUDGET_DATA_SOURCE_ID
  || '3df521a0-b3f8-4f47-983d-6713657befe5'

type BudgetLine = {
  id: string
  name: string
  budget: number
  phase: string
  category: string
  zone: string
  status: string
  budgetType: string
  notes: string
  supplier: string
}

const terminalInvoiceStatuses = new Set(['DRAFT', 'VOIDED', 'DELETED'])

function textValue(property: any) {
  const values = property?.title || property?.rich_text || []
  return values.map((value: any) => value.plain_text || '').join('')
}

function selectValue(property: any) {
  return property?.select?.name || property?.status?.name || ''
}

async function fetchNotionBudget(): Promise<{ lines: BudgetLine[]; fetchedAt: string } | null> {
  const token = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY
  if (!token) return null

  const notion = new Client({ auth: token })
  const pages: any[] = []
  let startCursor: string | undefined

  do {
    const response = await notion.dataSources.query({
      data_source_id: NOTION_BUDGET_DATA_SOURCE,
      page_size: 100,
      start_cursor: startCursor,
    })
    pages.push(...response.results)
    startCursor = response.has_more ? response.next_cursor || undefined : undefined
  } while (startCursor)

  const lines = pages.map((page: any): BudgetLine => ({
    id: page.id,
    name: textValue(page.properties?.['Line item']) || 'Untitled budget line',
    budget: Number(page.properties?.['Amount (AUD)']?.number) || 0,
    phase: selectValue(page.properties?.Phase),
    category: selectValue(page.properties?.Category),
    zone: selectValue(page.properties?.Zone),
    status: selectValue(page.properties?.Status),
    budgetType: selectValue(page.properties?.['Budget type']),
    notes: textValue(page.properties?.Notes),
    supplier: textValue(page.properties?.['Supplier / source']),
  }))

  return { lines, fetchedAt: new Date().toISOString() }
}

function netOfGst(gross: number) {
  return Math.round((gross / 1.1) * 100) / 100
}

export async function GET() {
  try {
    const [transactionsResult, invoicesResult, notionResult] = await Promise.all([
      supabase
        .from('xero_transactions')
        .select('id, xero_transaction_id, date, line_items, contact_name, total, type, status, synced_at')
        .eq('project_code', PROJECT_CODE)
        .gte('date', FUND_START)
        .order('date', { ascending: false }),
      supabase
        .from('xero_invoices')
        .select('id, invoice_number, date, due_date, line_items, contact_name, subtotal, total, amount_paid, amount_due, type, status, project_code, synced_at')
        .eq('type', 'ACCREC')
        .ilike('contact_name', '%Sonas%')
        .order('date', { ascending: true }),
      fetchNotionBudget().catch((error) => {
        console.error('Harvest Notion budget fetch failed:', error)
        return null
      }),
    ])

    if (transactionsResult.error) throw transactionsResult.error
    if (invoicesResult.error) throw invoicesResult.error

    const transactions = transactionsResult.data || []
    const invoices = (invoicesResult.data || []).filter((invoice: any) =>
      !terminalInvoiceStatuses.has(String(invoice.status || '').toUpperCase())
    )

    const spendTransactions = transactions.filter((transaction: any) =>
      transaction.type === 'SPEND'
      && !['DELETED', 'VOIDED'].includes(String(transaction.status || '').toUpperCase())
    )
    const receiptTransactions = transactions.filter((transaction: any) =>
      transaction.type === 'RECEIVE' && /sonas|luff/i.test(transaction.contact_name || '')
    )

    const totalProjectSpend = spendTransactions.reduce(
      (sum: number, transaction: any) => sum + Math.abs(Number(transaction.total) || 0),
      0
    )
    const issuedNet = invoices.reduce(
      (sum: number, invoice: any) => sum + Math.abs(Number(invoice.subtotal) || 0),
      0
    )
    const issuedGross = invoices.reduce(
      (sum: number, invoice: any) => sum + Math.abs(Number(invoice.total) || 0),
      0
    )
    const invoicePaidGross = invoices.reduce(
      (sum: number, invoice: any) => sum + Math.abs(Number(invoice.amount_paid) || 0),
      0
    )

    // INV-0316's $44k is present as two reconciled bank receipts but remains unmatched
    // to the invoice in Xero. Include those receipts in cash received and expose the gap.
    const unmatchedReceiptGross = receiptTransactions.reduce(
      (sum: number, transaction: any) => sum + Math.abs(Number(transaction.total) || 0),
      0
    )
    const receivedGross = invoicePaidGross + unmatchedReceiptGross
    const receivedNet = netOfGst(receivedGross)
    const outstandingGross = Math.max(issuedGross - receivedGross, 0)
    const remainingToInvoice = Math.max(FUND_TOTAL - issuedNet, 0)

    const notionLines = notionResult?.lines || []
    const phaseNames = ['Phase 1', 'Phase 2']
    const phases = phaseNames.map((phaseName) => {
      const lineItems = notionLines.filter((line) => line.phase === phaseName)
      const budget = lineItems.reduce((sum, line) => sum + line.budget, 0)
      return {
        id: phaseName.toLowerCase().replace(' ', '_'),
        name: `${phaseName} — Notion working estimate`,
        budget,
        status: lineItems.some((line) => line.status === 'Approved') ? 'approved' : 'draft',
        lineItems: lineItems.map((line) => ({
          id: line.id,
          name: line.name,
          budget: line.budget,
          spent: null,
          remaining: null,
          pctUsed: null,
          zone: line.zone,
          category: line.category,
          status: line.status,
          budgetType: line.budgetType,
          notes: line.notes,
          supplier: line.supplier,
        })),
        totalSpent: null,
        remaining: null,
        pctUsed: null,
      }
    })
    const plannedTotal = phases.reduce((sum, phase) => sum + phase.budget, 0)

    const latestXeroSync = [...transactions, ...invoices]
      .map((record: any) => record.synced_at)
      .filter(Boolean)
      .sort()
      .at(-1) || null

    const drawdowns = invoices.map((invoice: any) => ({
      number: invoice.invoice_number,
      billed_to: invoice.contact_name,
      date: invoice.date,
      due_date: invoice.due_date,
      subtotal: Number(invoice.subtotal) || 0,
      total: Number(invoice.total) || 0,
      amount_paid: Number(invoice.amount_paid) || 0,
      amount_due: Number(invoice.amount_due) || 0,
      status: invoice.status,
      phase: (invoice.line_items?.[0]?.description || '').match(/Phase\s+[12]/i)?.[0] || '',
      description: invoice.line_items?.map((item: any) => item.description).filter(Boolean).join(' · ') || '',
      pctOfFund: (((Number(invoice.subtotal) || 0) / FUND_TOTAL) * 100).toFixed(1),
      trackingGap: !invoice.project_code,
    }))

    const expenses = spendTransactions.slice(0, 50).map((transaction: any) => ({
      number: transaction.xero_transaction_id,
      vendor: transaction.contact_name || 'Unknown supplier',
      date: transaction.date,
      total: Number(transaction.total) || 0,
      status: transaction.status,
      description: transaction.line_items?.map((item: any) => item.description).filter(Boolean).join(' · ') || '',
      account: transaction.line_items?.[0]?.account_code || '',
      pctOfFund: (((Number(transaction.total) || 0) / FUND_TOTAL) * 100).toFixed(1),
    }))

    return NextResponse.json({
      summary: {
        totalBudget: FUND_TOTAL,
        totalDrawn: Math.round(receivedNet),
        totalDrawnGross: Math.round(receivedGross),
        totalInvoiced: Math.round(issuedNet),
        totalInvoicedGross: Math.round(issuedGross),
        remainingToDraw: Math.round(FUND_TOTAL - receivedNet),
        remainingToInvoice: Math.round(remainingToInvoice),
        outstandingGross: Math.round(outstandingGross),
        pctDrawn: ((receivedNet / FUND_TOTAL) * 100).toFixed(1),
        totalExpensed: Math.round(totalProjectSpend),
        pctSpent: ((totalProjectSpend / FUND_TOTAL) * 100).toFixed(1),
        cashAvailable: Math.round(receivedNet - totalProjectSpend),
        phase1Budget: phases[0]?.budget || 0,
        phase2Budget: phases[1]?.budget || 0,
        plannedTotal,
        planVariance: plannedTotal - FUND_TOTAL,
      },
      sourceStatus: {
        xero: { status: 'live', syncedAt: latestXeroSync },
        notion: {
          status: notionResult ? 'live' : 'unavailable',
          syncedAt: notionResult?.fetchedAt || null,
          lineCount: notionLines.length,
        },
        caveats: [
          'Xero project spend includes all ACT-HV operating and capital transactions from 1 Jan 2026; capital-only spend cannot be proven until cost-centre tracking is applied.',
          ...(unmatchedReceiptGross > 0
            ? [`$${unmatchedReceiptGross.toLocaleString()} of Sonas bank receipts are not matched to their Xero invoice.`]
            : []),
          ...(!notionResult ? ['Notion is unavailable; phase estimates are not shown.'] : []),
        ],
      },
      phases,
      costCentres: [],
      drawdowns,
      expenses,
      lease: null,
      spendByVendor: Object.entries(spendTransactions.reduce((totals: Record<string, number>, transaction: any) => {
        const vendor = transaction.contact_name || 'Unknown supplier'
        totals[vendor] = (totals[vendor] || 0) + Math.abs(Number(transaction.total) || 0)
        return totals
      }, {})).sort(([, a], [, b]) => Number(b) - Number(a)).slice(0, 15).map(([name, total]) => ({ name, total })),
      recentTransactions: expenses,
    })
  } catch (error) {
    console.error('Harvest budget API error:', error)
    return NextResponse.json({ error: 'Failed to load Harvest budget data' }, { status: 500 })
  }
}
