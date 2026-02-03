import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const yearParam = url.searchParams.get('year')
    const monthParam = url.searchParams.get('month')

    const now = new Date()
    const year = yearParam ? parseInt(yearParam) : now.getFullYear()
    const month = monthParam ? parseInt(monthParam) - 1 : now.getMonth()

    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)
    const prevMonthStart = new Date(year, month - 1, 1)
    const prevMonthEnd = new Date(year, month, 0, 23, 59, 59)

    const monthStartStr = monthStart.toISOString().split('T')[0]
    const monthEndStr = monthEnd.toISOString().split('T')[0]
    const prevStartStr = prevMonthStart.toISOString().split('T')[0]
    const prevEndStr = prevMonthEnd.toISOString().split('T')[0]

    // === FINANCIAL DATA ===
    const { data: currentTxns } = await supabase
      .from('xero_transactions')
      .select('total, type, contact_name, date')
      .gte('date', monthStartStr)
      .lte('date', monthEndStr)

    const { data: prevTxns } = await supabase
      .from('xero_transactions')
      .select('total, type')
      .gte('date', prevStartStr)
      .lte('date', prevEndStr)

    let income = 0, expenses = 0, prevIncome = 0, prevExpenses = 0
    const incomeBySource: Record<string, number> = {}
    const expenseByVendor: Record<string, number> = {}

    for (const tx of currentTxns || []) {
      const amt = Math.abs(Number(tx.total) || 0)
      if (tx.type === 'RECEIVE') {
        income += amt
        const src = tx.contact_name || 'Other'
        incomeBySource[src] = (incomeBySource[src] || 0) + amt
      } else if (tx.type === 'SPEND') {
        expenses += amt
        const vendor = tx.contact_name || 'Other'
        expenseByVendor[vendor] = (expenseByVendor[vendor] || 0) + amt
      }
    }

    for (const tx of prevTxns || []) {
      const amt = Math.abs(Number(tx.total) || 0)
      if (tx.type === 'RECEIVE') prevIncome += amt
      else if (tx.type === 'SPEND') prevExpenses += amt
    }

    // === KNOWLEDGE DATA ===
    const { count: meetingsCount } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'meeting')
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())

    const { count: actionsCount } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'action')
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())

    const { count: decisionsCount } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'decision')
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())

    // Previous month knowledge
    const { count: prevMeetings } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'meeting')
      .gte('created_at', prevMonthStart.toISOString())
      .lte('created_at', prevMonthEnd.toISOString())

    // === RELATIONSHIPS ===
    const { count: contactsEngaged } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .gte('updated_at', monthStart.toISOString())
      .lte('updated_at', monthEnd.toISOString())

    const { count: communicationsCount } = await supabase
      .from('communications')
      .select('id', { count: 'exact', head: true })
      .gte('received_at', monthStart.toISOString())
      .lte('received_at', monthEnd.toISOString())

    // === PROJECTS ===
    const { data: projectActivity } = await supabase
      .from('project_knowledge')
      .select('project_code')
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())

    const projectCounts: Record<string, number> = {}
    for (const item of projectActivity || []) {
      if (item.project_code) {
        projectCounts[item.project_code] = (projectCounts[item.project_code] || 0) + 1
      }
    }

    // Sort by activity
    const topProjects = Object.entries(projectCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }))

    // Top income sources
    const topIncome = Object.entries(incomeBySource)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, amount]) => ({ source, amount: Math.round(amount) }))

    // Top expenses
    const topExpenses = Object.entries(expenseByVendor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([vendor, amount]) => ({ vendor, amount: Math.round(amount) }))

    const monthName = monthStart.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

    return NextResponse.json({
      period: {
        label: monthName,
        start: monthStart.toISOString(),
        end: monthEnd.toISOString(),
        year,
        month: month + 1,
      },
      finance: {
        income: Math.round(income),
        expenses: Math.round(expenses),
        net: Math.round(income - expenses),
        vsLastMonth: {
          income: Math.round(income - prevIncome),
          expenses: Math.round(expenses - prevExpenses),
          incomePercent: prevIncome ? Math.round(((income - prevIncome) / prevIncome) * 100) : 0,
          expensesPercent: prevExpenses ? Math.round(((expenses - prevExpenses) / prevExpenses) * 100) : 0,
        },
        topIncome,
        topExpenses,
      },
      knowledge: {
        meetings: meetingsCount || 0,
        actions: actionsCount || 0,
        decisions: decisionsCount || 0,
        vsLastMonth: {
          meetings: (meetingsCount || 0) - (prevMeetings || 0),
        },
      },
      relationships: {
        contactsEngaged: contactsEngaged || 0,
        communications: communicationsCount || 0,
      },
      projects: {
        activeCount: topProjects.length,
        topByActivity: topProjects,
      },
    })
  } catch (e) {
    console.error('Monthly report error:', e)
    return NextResponse.json({
      period: { label: '', start: '', end: '', year: 0, month: 0 },
      finance: { income: 0, expenses: 0, net: 0, vsLastMonth: {}, topIncome: [], topExpenses: [] },
      knowledge: { meetings: 0, actions: 0, decisions: 0, vsLastMonth: {} },
      relationships: { contactsEngaged: 0, communications: 0 },
      projects: { activeCount: 0, topByActivity: [] },
    })
  }
}
