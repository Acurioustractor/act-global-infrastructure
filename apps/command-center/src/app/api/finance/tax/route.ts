import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface BASLabel {
  label: string
  amount: number
  description: string
}

interface TaxResponse {
  quarter: string
  basLabels: Record<string, BASLabel>
  gstSummary: { collected: number; paid: number; net: number }
  acncRevenue: Array<{ category: string; amount: number; percentage: number }>
  acncExpenses: Array<{ category: string; amount: number; percentage: number }>
  entitySelector: string[]
  lastUpdated: string
}

function getQuarterDates(quarter?: string): { start: string; end: string; label: string } {
  const now = new Date()
  let year = now.getFullYear()
  let q: number

  if (quarter) {
    // Parse "2026-Q1" format
    const parts = quarter.split('-Q')
    year = parseInt(parts[0])
    q = parseInt(parts[1])
  } else {
    // Current quarter (Australian FY: Jul-Sep=Q1, Oct-Dec=Q2, Jan-Mar=Q3, Apr-Jun=Q4)
    const month = now.getMonth() // 0-indexed
    if (month >= 6 && month <= 8) q = 1
    else if (month >= 9 && month <= 11) q = 2
    else if (month >= 0 && month <= 2) { q = 3; if (month <= 2) year = year } // Jan-Mar
    else q = 4 // Apr-Jun
  }

  // Quarter start/end (calendar quarters for BAS)
  const qStartMonth = (q - 1) * 3 // 0, 3, 6, 9
  const start = `${year}-${String(qStartMonth + 1).padStart(2, '0')}-01`
  const endMonth = qStartMonth + 3
  const endYear = endMonth > 12 ? year + 1 : year
  const endM = endMonth > 12 ? endMonth - 12 : endMonth
  const end = `${endYear}-${String(endM).padStart(2, '0')}-01`

  return { start, end, label: `${year}-Q${q}` }
}

// Xero account code ranges for BAS classification
const ASSET_ACCOUNTS = ['1000', '1100', '1200', '1300', '1400', '1500']
const PAYROLL_ACCOUNTS = ['8000', '8100', '8200', '8300']
const WITHHOLDING_ACCOUNTS = ['8200', '8210']

export async function GET(request: Request): Promise<NextResponse<TaxResponse>> {
  try {
    const { searchParams } = new URL(request.url)
    const quarterParam = searchParams.get('quarter') || undefined

    const { start, end, label } = getQuarterDates(quarterParam)

    // Fetch all transactions for the quarter
    const { data: transactions } = await supabase
      .from('xero_transactions')
      .select('id, total, type, line_items, contact_name, bank_account, date')
      .gte('date', start)
      .lt('date', end)

    const txs = transactions || []

    // Fetch invoices for the quarter (for G1 - Total Sales)
    const { data: invoices } = await supabase
      .from('xero_invoices')
      .select('id, total, type, line_items, status')
      .gte('date', start)
      .lt('date', end)

    const invs = invoices || []

    // Calculate BAS labels from transactions
    let g1TotalSales = 0
    let g10CapitalPurchases = 0
    let g11NonCapitalPurchases = 0
    let gstCollected = 0 // 1A
    let gstPaid = 0 // 1B
    let w1TotalWages = 0
    let w2Withholding = 0

    // G1: Total sales from ACCREC invoices
    invs.forEach((inv: any) => {
      if (inv.type === 'ACCREC') {
        g1TotalSales += Math.abs(inv.total || 0)
      }
    })

    // Process transactions — extract account codes from line_items JSONB
    txs.forEach((tx: any) => {
      const total = Math.abs(tx.total || 0)
      const lineItems = tx.line_items || []
      const items = Array.isArray(lineItems) ? lineItems : []

      // Extract account codes from line items
      const accountCodes = items
        .map((li: any) => li.AccountCode || li.account_code || '')
        .filter(Boolean)

      // GST from line items
      items.forEach((li: any) => {
        const taxAmount = Math.abs(li.TaxAmount || li.tax_amount || 0)
        if (tx.type === 'RECEIVE' || tx.type === 'ACCREC') {
          gstCollected += taxAmount
        } else if (tx.type === 'SPEND' || tx.type === 'ACCPAY') {
          gstPaid += taxAmount
        }
      })

      // Capital purchases (asset account codes in any line item)
      const hasAssetCode = accountCodes.some((c: string) => ASSET_ACCOUNTS.some(a => c.startsWith(a)))
      const hasPayrollCode = accountCodes.some((c: string) => PAYROLL_ACCOUNTS.some(a => c.startsWith(a)))

      if (tx.type === 'SPEND' && hasAssetCode) {
        g10CapitalPurchases += total
      }

      // Non-capital purchases
      if (tx.type === 'SPEND' && !hasAssetCode && !hasPayrollCode) {
        g11NonCapitalPurchases += total
      }

      // Payroll
      if (hasPayrollCode) {
        w1TotalWages += total
      }
      if (accountCodes.some((c: string) => WITHHOLDING_ACCOUNTS.some(a => c.startsWith(a)))) {
        w2Withholding += total
      }
    })

    const basLabels: Record<string, BASLabel> = {
      G1: { label: 'Total Sales', amount: Math.round(g1TotalSales), description: 'Total sales including GST' },
      G10: { label: 'Capital Purchases', amount: Math.round(g10CapitalPurchases), description: 'Capital acquisitions' },
      G11: { label: 'Non-Capital Purchases', amount: Math.round(g11NonCapitalPurchases), description: 'Non-capital purchases' },
      '1A': { label: 'GST Collected', amount: Math.round(gstCollected), description: 'GST on sales' },
      '1B': { label: 'GST Paid', amount: Math.round(gstPaid), description: 'GST on purchases' },
      W1: { label: 'Total Wages', amount: Math.round(w1TotalWages), description: 'Total salary and wages' },
      W2: { label: 'PAYG Withholding', amount: Math.round(w2Withholding), description: 'Amounts withheld from payments' },
    }

    // ACNC revenue categorization
    // Fetch grants for government revenue
    const { data: grantApps } = await supabase
      .from('grant_applications')
      .select('outcome_amount, status')
      .eq('status', 'successful')

    const grantRevenue = (grantApps || []).reduce((s: number, g: any) => s + (g.outcome_amount || 0), 0)

    // Donations
    const { data: donationData } = await supabase
      .from('donations')
      .select('amount')
      .gte('donation_date', start)
      .lt('donation_date', end)

    const donationTotal = (donationData || []).reduce((s: number, d: any) => s + Math.abs(d.amount || 0), 0)

    // Revenue from invoices (goods/services)
    const goodsServicesRevenue = invs
      .filter((i: any) => i.type === 'ACCREC')
      .reduce((s: number, i: any) => s + Math.abs(i.total || 0), 0)

    const totalRev = grantRevenue + donationTotal + goodsServicesRevenue
    const acncRevenue = [
      { category: 'Government Grants', amount: Math.round(grantRevenue) },
      { category: 'Donations & Bequests', amount: Math.round(donationTotal) },
      { category: 'Goods & Services', amount: Math.round(goodsServicesRevenue) },
    ]
      .filter(r => r.amount > 0)
      .map(r => ({
        ...r,
        percentage: totalRev > 0 ? Math.round((r.amount / totalRev) * 100) : 0,
      }))

    // Expense categorization — derive from line_items account codes
    const expensesByCategory: Record<string, number> = {}
    txs.forEach((tx: any) => {
      if (tx.type === 'SPEND') {
        const items = Array.isArray(tx.line_items) ? tx.line_items : []
        const codes = items.map((li: any) => li.AccountCode || li.account_code || '').filter(Boolean)
        const primaryCode = codes[0] || 'Other'
        const cat = primaryCode.startsWith('6') ? 'Operating Expenses' :
                    primaryCode.startsWith('8') ? 'Employment Costs' :
                    primaryCode.startsWith('1') ? 'Capital' :
                    primaryCode.startsWith('4') ? 'Direct Costs' : 'Other'
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Math.abs(tx.total || 0)
      }
    })

    const totalExp = Object.values(expensesByCategory).reduce((s, v) => s + v, 0)
    const acncExpenses = Object.entries(expensesByCategory)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount),
        percentage: totalExp > 0 ? Math.round((amount / totalExp) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    return NextResponse.json({
      quarter: label,
      basLabels,
      gstSummary: {
        collected: Math.round(gstCollected),
        paid: Math.round(gstPaid),
        net: Math.round(gstCollected - gstPaid),
      },
      acncRevenue,
      acncExpenses,
      entitySelector: ['Sole Trader (ABN 21 591 780 066)', 'A Kind Tractor LTD (ABN 73 669 029 341)'],
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in tax GET handler:', error)
    return NextResponse.json({
      quarter: '',
      basLabels: {},
      gstSummary: { collected: 0, paid: 0, net: 0 },
      acncRevenue: [],
      acncExpenses: [],
      entitySelector: [],
      lastUpdated: new Date().toISOString(),
    }, { status: 500 })
  }
}
