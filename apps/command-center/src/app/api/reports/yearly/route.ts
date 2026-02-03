import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    // === CURRENT FY FINANCIAL DATA ===
    const { data: currentTxns } = await supabase
      .from('xero_transactions')
      .select('total, type, contact_name, date')
      .gte('date', fyStartStr)
      .lte('date', fyEndStr)

    // === PREVIOUS FY FINANCIAL DATA ===
    const { data: prevTxns } = await supabase
      .from('xero_transactions')
      .select('total, type')
      .gte('date', prevStartStr)
      .lte('date', prevEndStr)

    let income = 0, expenses = 0, prevIncome = 0, prevExpenses = 0
    const incomeBySource: Record<string, number> = {}
    const expenseByCategory: Record<string, number> = {}
    const monthlyData: Record<string, { income: number; expenses: number }> = {}

    // Initialize monthly data
    for (let m = 0; m < 12; m++) {
      const month = new Date(fyYear, 6 + m, 1)
      const key = month.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
      monthlyData[key] = { income: 0, expenses: 0 }
    }

    for (const tx of currentTxns || []) {
      const amt = Math.abs(Number(tx.total) || 0)
      const txDate = new Date(tx.date)
      const monthKey = txDate.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })

      if (tx.type === 'RECEIVE') {
        income += amt
        const src = tx.contact_name || 'Other'
        incomeBySource[src] = (incomeBySource[src] || 0) + amt
        if (monthlyData[monthKey]) monthlyData[monthKey].income += amt
      } else if (tx.type === 'SPEND') {
        expenses += amt
        const cat = tx.contact_name || 'Other'
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amt
        if (monthlyData[monthKey]) monthlyData[monthKey].expenses += amt
      }
    }

    for (const tx of prevTxns || []) {
      const amt = Math.abs(Number(tx.total) || 0)
      if (tx.type === 'RECEIVE') prevIncome += amt
      else if (tx.type === 'SPEND') prevExpenses += amt
    }

    // === KNOWLEDGE DATA ===
    const { count: totalMeetings } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'meeting')
      .gte('created_at', fyStart.toISOString())
      .lte('created_at', fyEnd.toISOString())

    const { count: totalActions } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'action')
      .gte('created_at', fyStart.toISOString())
      .lte('created_at', fyEnd.toISOString())

    const { count: totalDecisions } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'decision')
      .gte('created_at', fyStart.toISOString())
      .lte('created_at', fyEnd.toISOString())

    const { count: prevMeetings } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'meeting')
      .gte('created_at', prevFyStart.toISOString())
      .lte('created_at', prevFyEnd.toISOString())

    // === RELATIONSHIPS ===
    const { count: totalContacts } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })

    const { count: newContacts } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', fyStart.toISOString())
      .lte('created_at', fyEnd.toISOString())

    const { count: totalComms } = await supabase
      .from('communications')
      .select('id', { count: 'exact', head: true })
      .gte('received_at', fyStart.toISOString())
      .lte('received_at', fyEnd.toISOString())

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
