import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString().split('T')[0]

    // Transactions this week
    const { data: txns } = await supabase
      .from('xero_transactions')
      .select('total, type')
      .gte('date', weekAgoStr)

    let weekIncome = 0, weekExpenses = 0
    for (const tx of txns || []) {
      const amt = Number(tx.total) || 0
      if (tx.type === 'RECEIVE') weekIncome += amt
      else if (tx.type === 'SPEND') weekExpenses += amt
    }

    // Knowledge items this week
    const { count: meetingsCount } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'meeting')
      .gte('created_at', weekAgo.toISOString())

    const { count: actionsCount } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'action')
      .gte('created_at', weekAgo.toISOString())

    const { count: decisionsCount } = await supabase
      .from('project_knowledge')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'decision')
      .gte('created_at', weekAgo.toISOString())

    // Contacts engaged this week
    const { count: contactsEngaged } = await supabase
      .from('ghl_contacts')
      .select('id', { count: 'exact', head: true })
      .gte('last_contact_date', weekAgo.toISOString())

    return NextResponse.json({
      period: { start: weekAgo.toISOString(), end: new Date().toISOString() },
      finance: {
        income: Math.round(weekIncome),
        expenses: Math.round(weekExpenses),
        net: Math.round(weekIncome - weekExpenses),
      },
      knowledge: {
        meetings: meetingsCount || 0,
        actions: actionsCount || 0,
        decisions: decisionsCount || 0,
      },
      relationships: {
        contactsEngaged: contactsEngaged || 0,
      },
    })
  } catch (e) {
    console.error('Weekly report error:', e)
    return NextResponse.json({
      period: { start: '', end: '' },
      finance: { income: 0, expenses: 0, net: 0 },
      knowledge: { meetings: 0, actions: 0, decisions: 0 },
      relationships: { contactsEngaged: 0 },
    })
  }
}
