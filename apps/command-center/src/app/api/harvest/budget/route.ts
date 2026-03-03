import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

const PROJECT_CODE = 'ACT-HV'

// Load budget config at module level
const budgetPath = join(process.cwd(), '..', '..', 'config', 'harvest-budget.json')
let harvestBudget: any
try {
  harvestBudget = JSON.parse(readFileSync(budgetPath, 'utf-8'))
} catch {
  // Fallback: try from repo root (Vercel build may have different cwd)
  try {
    const altPath = join(process.cwd(), 'config', 'harvest-budget.json')
    harvestBudget = JSON.parse(readFileSync(altPath, 'utf-8'))
  } catch {
    harvestBudget = null
  }
}

export async function GET() {
  try {
    if (!harvestBudget) {
      return NextResponse.json({ error: 'Budget config not found' }, { status: 500 })
    }

    // Fetch all Harvest transactions from Xero
    const { data: transactions } = await supabase
      .from('xero_transactions')
      .select('id, date, description, contact_name, total, type, account_code, account_name')
      .eq('project_code', PROJECT_CODE)
      .order('date', { ascending: false })

    const txData = transactions || []

    // Calculate total spent (actuals)
    const totalSpent = txData
      .filter((tx: any) => tx.type === 'SPEND')
      .reduce((sum: number, tx: any) => sum + Math.abs(tx.total || 0), 0)

    const totalIncome = txData
      .filter((tx: any) => tx.type === 'RECEIVE')
      .reduce((sum: number, tx: any) => sum + Math.abs(tx.total || 0), 0)

    // Group spend by contact (vendor)
    const spendByVendor: Record<string, number> = {}
    for (const tx of txData) {
      if ((tx as any).type === 'SPEND' && (tx as any).contact_name) {
        const name = (tx as any).contact_name
        spendByVendor[name] = (spendByVendor[name] || 0) + Math.abs((tx as any).total || 0)
      }
    }

    // Group spend by account code
    const spendByAccount: Record<string, { name: string; total: number }> = {}
    for (const tx of txData) {
      const t = tx as any
      if (t.type === 'SPEND' && t.account_code) {
        if (!spendByAccount[t.account_code]) {
          spendByAccount[t.account_code] = { name: t.account_name || t.account_code, total: 0 }
        }
        spendByAccount[t.account_code].total += Math.abs(t.total || 0)
      }
    }

    // Build phase summaries from config
    const fund = harvestBudget.capital_improvement_fund
    const phases = Object.entries(fund.phases).map(([key, phase]: [string, any]) => {
      const lineItems = phase.line_items.map((item: any) => ({
        ...item,
        spent: 0,
        remaining: item.budget,
        pctUsed: 0,
      }))

      return {
        id: key,
        name: phase.name,
        budget: phase.budget,
        status: phase.status,
        lineItems,
        totalSpent: 0,
        remaining: phase.budget,
        pctUsed: 0,
      }
    })

    // Cost centre summary
    const costCentres = Object.entries(harvestBudget.cost_centres.values).map(([code, description]: [string, any]) => {
      const budgetLines = [
        ...fund.phases.phase_1.line_items,
        ...fund.phases.phase_2.line_items,
      ].filter((item: any) => item.cost_centre === code)

      const totalBudget = budgetLines.reduce((sum: number, item: any) => sum + item.budget, 0)

      return {
        code,
        description,
        budget: totalBudget,
        spent: 0,
        remaining: totalBudget,
        pctUsed: 0,
        lineItemCount: budgetLines.length,
      }
    }).filter(cc => cc.budget > 0)

    // Fund drawdowns (money IN from landlord)
    const drawdowns = (harvestBudget.fund_drawdowns?.drawdowns || []).map((d: any) => ({
      ...d,
      pctOfFund: ((d.subtotal / fund.total_budget) * 100).toFixed(1),
    }))
    const totalDrawn = harvestBudget.fund_drawdowns?.total_drawn || 0
    const remainingToDraw = fund.total_budget - totalDrawn

    // Expenses (money OUT to contractors/suppliers)
    const expenses = (harvestBudget.expenses?.payments || []).map((exp: any) => ({
      ...exp,
      pctOfFund: ((exp.total / fund.total_budget) * 100).toFixed(1),
    }))
    const totalExpensed = harvestBudget.expenses?.total_spent || 0

    // Cash position: drawn - spent = available cash for Harvest
    const cashAvailable = totalDrawn - totalExpensed

    // Lease summary
    const lease = harvestBudget.lease

    return NextResponse.json({
      summary: {
        totalBudget: fund.total_budget,
        // Fund inflows
        totalDrawn,
        remainingToDraw,
        pctDrawn: ((totalDrawn / fund.total_budget) * 100).toFixed(1),
        // Fund outflows
        totalExpensed,
        pctSpent: ((totalExpensed / fund.total_budget) * 100).toFixed(1),
        // Cash position
        cashAvailable,
        // Xero actuals
        xeroIncome: Math.round(totalIncome),
        xeroExpenses: Math.round(totalSpent),
        // Phase budgets
        phase1Budget: fund.phases.phase_1.budget,
        phase2Budget: fund.phases.phase_2.budget,
      },
      phases,
      costCentres,
      drawdowns,
      expenses,
      lease: {
        landlord: lease.landlord,
        premises: lease.premises,
        commencementDate: lease.commencement_date,
        earlyAccess: lease.early_access,
        baseRentMonthly: lease.rent.base_rent_monthly,
        baseRentAnnual: lease.rent.base_rent_pa,
        targetRentAnnual: lease.rent.target_rent_pa,
        revenueShare: lease.rent.revenue_share,
        options: lease.options_to_extend,
        outgoings: lease.outgoings,
        reporting: lease.reporting,
      },
      spendByVendor: Object.entries(spendByVendor)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([name, total]) => ({ name, total: Math.round(total) })),
      spendByAccount: Object.entries(spendByAccount)
        .sort(([, a], [, b]) => b.total - a.total)
        .map(([code, { name, total }]) => ({ code, name, total: Math.round(total) })),
      recentTransactions: txData.slice(0, 20).map((tx: any) => ({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        contact: tx.contact_name,
        amount: tx.total,
        type: tx.type,
        account: tx.account_name,
      })),
    })
  } catch (error) {
    console.error('Harvest budget API error:', error)
    return NextResponse.json({ error: 'Failed to load Harvest budget data' }, { status: 500 })
  }
}
