import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getMonthlyPL } from '@/lib/finance/ledger'

type PmfRow = {
  month: string
  revenue: number | string | null
  expenses: number | string | null
  revenue_breakdown: Record<string, number> | null
  expense_breakdown: Record<string, number> | null
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const yearParam = url.searchParams.get('year')

    // Australian financial year: July 1 to June 30
    const now = new Date()
    let fyYear = yearParam ? parseInt(yearParam) : now.getFullYear()
    if (!yearParam && now.getMonth() < 6) fyYear -= 1 // Before July, use previous FY

    const fyStart = new Date(fyYear, 6, 1) // July 1
    const fyEnd = new Date(fyYear + 1, 5, 30, 23, 59, 59) // June 30
    const prevFyStart = new Date(fyYear - 1, 6, 1)
    const prevFyEnd = new Date(fyYear, 5, 30, 23, 59, 59)

    const fyStartStr = fyStart.toISOString().split('T')[0]
    const fyEndStr = fyEnd.toISOString().split('T')[0]
    const prevStartStr = prevFyStart.toISOString().split('T')[0]
    const prevEndStr = prevFyEnd.toISOString().split('T')[0]

    // === FINANCIAL DATA FROM CANONICAL ORG LEDGER (project_monthly_financials) ===
    // Headline income/expense/net come from getMonthlyPL so this surface agrees with /company,
    // /strategy and the per-project pages. Raw RECEIVE/SPEND bank sums were wrong (RECEIVE
    // undercounts income — most invoice settlements land as RECEIVE-TRANSFER). FY26 net ≈ +$518,059.
    const [currentPL, prevPL, currentPmf] = await Promise.all([
      getMonthlyPL({ fyStart: fyStartStr, fyEnd: fyEndStr }),
      getMonthlyPL({ fyStart: prevStartStr, fyEnd: prevEndStr }),
      supabase
        .from('project_monthly_financials')
        .select('month, revenue, expenses, revenue_breakdown, expense_breakdown')
        .gte('month', fyStartStr)
        .lte('month', fyEndStr)
        .range(0, 9999),
    ])

    const income = currentPL.revenue
    const expenses = currentPL.expenses
    const prevIncome = prevPL.revenue
    const prevExpenses = prevPL.expenses

    const incomeBySource: Record<string, number> = {}
    const expenseByCategory: Record<string, number> = {}
    const monthlyData: Record<string, { income: number; expenses: number }> = {}

    // Initialize monthly data
    for (let m = 0; m < 12; m++) {
      const month = new Date(fyYear, 6 + m, 1)
      const key = month.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
      monthlyData[key] = { income: 0, expenses: 0 }
    }

    for (const row of (currentPmf.data as PmfRow[] | null) || []) {
      // pmf.month is the first-of-month date string (e.g. '2025-07-01'); parse to the trend key.
      const monthDate = new Date(`${row.month}T00:00:00`)
      const monthKey = monthDate.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].income += Number(row.revenue) || 0
        monthlyData[monthKey].expenses += Number(row.expenses) || 0
      }
      for (const [name, amt] of Object.entries(row.revenue_breakdown || {})) {
        const src = name || 'Other'
        incomeBySource[src] = (incomeBySource[src] || 0) + (Number(amt) || 0)
      }
      for (const [name, amt] of Object.entries(row.expense_breakdown || {})) {
        const cat = name || 'Other'
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(amt) || 0)
      }
    }

    // === KNOWLEDGE DATA ===
    const { count: totalMeetings } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_type', 'meeting')
      .gte('created_at', fyStart.toISOString())
      .lte('created_at', fyEnd.toISOString())

    const { count: totalActions } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_type', 'action')
      .gte('created_at', fyStart.toISOString())
      .lte('created_at', fyEnd.toISOString())

    const { count: totalDecisions } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_type', 'decision')
      .gte('created_at', fyStart.toISOString())
      .lte('created_at', fyEnd.toISOString())

    const { count: prevMeetings } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('knowledge_type', 'meeting')
      .gte('created_at', prevFyStart.toISOString())
      .lte('created_at', prevFyEnd.toISOString())

    // === RELATIONSHIPS ===
    const { count: totalContacts } = await supabase
      .from('ghl_contacts')
      .select('id', { count: 'exact', head: true })

    const { count: newContacts } = await supabase
      .from('ghl_contacts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', fyStart.toISOString())
      .lte('created_at', fyEnd.toISOString())

    const { count: totalComms } = await supabase
      .from('communications_history')
      .select('id', { count: 'exact', head: true })
      .gte('occurred_at', fyStart.toISOString())
      .lte('occurred_at', fyEnd.toISOString())

    // === PROJECTS ===
    const { data: projectData } = await supabase
      .from('project_knowledge')
      .select('project_code')
      .gte('created_at', fyStart.toISOString())
      .lte('created_at', fyEnd.toISOString())

    const projectCounts: Record<string, number> = {}
    for (const item of projectData || []) {
      if (item.project_code) {
        projectCounts[item.project_code] = (projectCounts[item.project_code] || 0) + 1
      }
    }

    const topProjects = Object.entries(projectCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }))

    // Top income sources
    const topIncome = Object.entries(incomeBySource)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([source, amount]) => ({ source, amount: Math.round(amount) }))

    // Top expense categories
    const topExpenses = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([category, amount]) => ({ category, amount: Math.round(amount) }))

    // Monthly trend array
    const monthlyTrend = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      income: Math.round(data.income),
      expenses: Math.round(data.expenses),
      net: Math.round(data.income - data.expenses),
    }))

    const fyLabel = `FY${fyYear}/${(fyYear + 1).toString().slice(-2)}`
    const prevFyLabel = `FY${fyYear - 1}/${fyYear.toString().slice(-2)}`

    return NextResponse.json({
      period: {
        label: fyLabel,
        start: fyStart.toISOString(),
        end: fyEnd.toISOString(),
        fyYear,
      },
      finance: {
        income: Math.round(income),
        expenses: Math.round(expenses),
        net: Math.round(income - expenses),
        profitMargin: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
        comparison: {
          previousFy: prevFyLabel,
          income: Math.round(prevIncome),
          expenses: Math.round(prevExpenses),
          incomeChange: Math.round(income - prevIncome),
          incomeChangePercent: prevIncome ? Math.round(((income - prevIncome) / prevIncome) * 100) : 0,
          expensesChange: Math.round(expenses - prevExpenses),
          expensesChangePercent: prevExpenses ? Math.round(((expenses - prevExpenses) / prevExpenses) * 100) : 0,
        },
        topIncome,
        topExpenses,
        monthlyTrend,
      },
      knowledge: {
        meetings: totalMeetings || 0,
        actions: totalActions || 0,
        decisions: totalDecisions || 0,
        total: (totalMeetings || 0) + (totalActions || 0) + (totalDecisions || 0),
        avgPerMonth: Math.round(((totalMeetings || 0) + (totalActions || 0) + (totalDecisions || 0)) / 12),
        comparison: {
          previousMeetings: prevMeetings || 0,
          meetingsChange: (totalMeetings || 0) - (prevMeetings || 0),
        },
      },
      relationships: {
        totalContacts: totalContacts || 0,
        newContacts: newContacts || 0,
        communications: totalComms || 0,
        avgCommsPerMonth: Math.round((totalComms || 0) / 12),
      },
      projects: {
        activeCount: Object.keys(projectCounts).length,
        topByActivity: topProjects,
        totalKnowledgeItems: projectData?.length || 0,
      },
    })
  } catch (e) {
    console.error('Yearly report error:', e)
    return NextResponse.json({
      period: { label: '', start: '', end: '', fyYear: 0 },
      finance: { income: 0, expenses: 0, net: 0, profitMargin: 0, comparison: {}, topIncome: [], topExpenses: [], monthlyTrend: [] },
      knowledge: { meetings: 0, actions: 0, decisions: 0, total: 0, avgPerMonth: 0, comparison: {} },
      relationships: { totalContacts: 0, newContacts: 0, communications: 0, avgCommsPerMonth: 0 },
      projects: { activeCount: 0, topByActivity: [], totalKnowledgeItems: 0 },
    })
  }
}
