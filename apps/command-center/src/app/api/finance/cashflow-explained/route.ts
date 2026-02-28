import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('v_cashflow_explained')
      .select('*')
      .order('month', { ascending: true })
      .limit(12)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      months: (data || []).map((m: any) => ({
        month: m.month,
        income: Number(m.income || 0),
        expenses: Number(m.expenses || 0),
        net: Number(m.net || 0),
        closing_balance: Number(m.closing_balance || 0),
        is_projection: m.is_projection || false,
        income_change: m.income_change != null ? Number(m.income_change) : null,
        expense_change: m.expense_change != null ? Number(m.expense_change) : null,
        net_change: m.net_change != null ? Number(m.net_change) : null,
        explanations: m.explanations || null,
      })),
    })
  } catch (error) {
    console.error('Error in cashflow explained:', error)
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 })
  }
}
