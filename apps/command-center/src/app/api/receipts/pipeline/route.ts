import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const STAGES = ['missing_receipt', 'forwarded_to_dext', 'dext_processed', 'xero_bill_created', 'reconciled'] as const

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 1. Funnel counts + amounts per stage
    const { data: funnel, error: funnelError } = await supabase
      .from('receipt_pipeline_status')
      .select('stage, amount, transaction_date')

    if (funnelError) throw funnelError

    const funnelStats: Record<string, { count: number; total_amount: number; stuck_count: number }> = {}
    const now = new Date()
    const stuckThreshold = 14 * 24 * 60 * 60 * 1000 // 14 days

    for (const s of STAGES) {
      funnelStats[s] = { count: 0, total_amount: 0, stuck_count: 0 }
    }

    for (const row of funnel || []) {
      const s = row.stage as string
      if (!funnelStats[s]) funnelStats[s] = { count: 0, total_amount: 0, stuck_count: 0 }
      funnelStats[s].count++
      funnelStats[s].total_amount += Math.abs(parseFloat(row.amount) || 0)
      if (row.transaction_date) {
        const txDate = new Date(row.transaction_date)
        if (now.getTime() - txDate.getTime() > stuckThreshold) {
          funnelStats[s].stuck_count++
        }
      }
    }

    // 2. Items for a specific stage (or all if not filtered)
    let query = supabase
      .from('receipt_pipeline_status')
      .select('*')
      .order('transaction_date', { ascending: false })
      .limit(limit)

    if (stage) {
      query = query.eq('stage', stage)
    }

    const { data: items, error: itemsError } = await query

    if (itemsError) throw itemsError

    // 3. Summary stats
    const totalRecords = (funnel || []).length
    const totalAmount = Object.values(funnelStats).reduce((sum, s) => sum + s.total_amount, 0)
    const reconciledCount = funnelStats.reconciled?.count || 0
    const reconciliationRate = totalRecords > 0 ? Math.round((reconciledCount / totalRecords) * 100) : 0

    const oldestPending = (funnel || [])
      .filter(r => r.stage === 'missing_receipt')
      .map(r => r.transaction_date)
      .filter(Boolean)
      .sort()[0] || null

    return NextResponse.json({
      success: true,
      funnel: STAGES.map(s => ({
        stage: s,
        label: stageLabel(s),
        ...funnelStats[s],
      })),
      items: items || [],
      summary: {
        total_records: totalRecords,
        total_unreconciled_amount: totalAmount - (funnelStats.reconciled?.total_amount || 0),
        reconciliation_rate: reconciliationRate,
        oldest_pending: oldestPending,
        stuck_count: Object.values(funnelStats).reduce((sum, s) => sum + s.stuck_count, 0) - (funnelStats.reconciled?.stuck_count || 0),
      },
    })
  } catch (e) {
    console.error('Pipeline API error:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    missing_receipt: 'Missing Receipt',
    forwarded_to_dext: 'Forwarded to Dext',
    dext_processed: 'Dext Processed',
    xero_bill_created: 'Xero Bill Created',
    reconciled: 'Reconciled',
  }
  return labels[stage] || stage
}
