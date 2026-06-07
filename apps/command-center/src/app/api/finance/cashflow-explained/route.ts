import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // v_cashflow_explained view removed from DB — returns empty until a backend exists
    const data: any[] = []

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
