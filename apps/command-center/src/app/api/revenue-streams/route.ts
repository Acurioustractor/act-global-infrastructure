import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Revenue Streams API — pulls REAL data from across the ecosystem:
 * - Xero transactions (RECEIVE) → actual bank income by project
 * - Xero invoices (ACCREC) → invoiced revenue by project
 * - Financial snapshots → monthly income/expense totals from Xero
 * - Grant applications → successful grant funding
 * - GHL opportunities → CRM pipeline wins
 * - Donations table → donation income
 * - Revenue streams table → category definitions + targets
 *
 * Revenue is mapped to streams via project_codes on the revenue_streams table.
 */

export async function GET() {
  try {
    // Fetch all data sources in parallel
    const [
      streamsRes,
      snapshotsRes,
      invoicesRes,
      transactionsRes,
      grantsRes,
      ghlRes,
      donationsRes,
    ] = await Promise.all([
      // Stream definitions (categories with project_codes + targets)
      supabase.from('revenue_streams').select('*'),

      // Monthly snapshots from Xero (real income/expenses)
      supabase
        .from('financial_snapshots')
        .select('month, income, expenses, closing_balance')
        .order('month', { ascending: true }),

      // Invoices by project (receivables = revenue attribution)
      supabase
        .from('xero_invoices')
        .select('project_code, total, type, date, contact_name, status')
        .eq('type', 'ACCREC'),

      // Bank transactions by project (actual cash received)
      supabase
        .from('xero_transactions')
        .select('project_code, total, type, date, contact_name')
        .eq('type', 'RECEIVE'),

      // Successful grants
      supabase
        .from('grant_applications')
        .select('application_name, outcome_amount, status, project_code')
        .eq('status', 'successful'),

      // GHL pipeline (real opportunities)
      supabase
        .from('ghl_opportunities')
        .select('name, monetary_value, status, stage_name'),

      // Donations
      supabase
        .from('donations')
        .select('amount, donation_date, project'),
    ])

    const streams = streamsRes.data || []
    const snapshots = snapshotsRes.data || []
    const invoices = invoicesRes.data || []
    const transactions = transactionsRes.data || []
    const grants = grantsRes.data || []
    const ghlOpps = ghlRes.data || []
    const donations = donationsRes.data || []

    // Build project_code → stream mapping
    const projectToStream: Record<string, string> = {}
    for (const stream of streams) {
      const codes = stream.project_codes || []
      for (const code of codes) {
        projectToStream[code] = stream.id
      }
    }

    // Find the "Grants & Funding" and "Donations & Sponsorship" stream IDs
    const grantsStream = streams.find(s => s.category === 'grants')
    const donationsStream = streams.find(s => s.category === 'donations')

    // Compute actual revenue per stream from invoices (most accurate attribution)
    const streamRevenue: Record<string, Record<string, number>> = {}
    // Initialize 12-month windows per stream
    const now = new Date()
    for (const stream of streams) {
      streamRevenue[stream.id] = {}
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = d.toISOString().slice(0, 7)
        streamRevenue[stream.id][key] = 0
      }
    }

    // Map invoices to streams via project_code
    for (const inv of invoices) {
      const month = inv.date?.substring(0, 7)
      if (!month) continue
      const streamId = inv.project_code ? projectToStream[inv.project_code] : null
      const targetId = streamId || grantsStream?.id // Unattributed receivables → grants (most are grants)
      if (targetId && streamRevenue[targetId]?.[month] !== undefined) {
        streamRevenue[targetId][month] += Math.abs(inv.total || 0)
      }
    }

    // Map bank transactions to streams via project_code
    for (const tx of transactions) {
      const month = tx.date?.substring(0, 7)
      if (!month) continue
      const streamId = tx.project_code ? projectToStream[tx.project_code] : null
      // Only add if not already captured via invoices (avoid double-counting)
      // Bank transactions without project codes go to consulting (catch-all for services)
      if (!streamId && !tx.project_code) {
        const consultingStream = streams.find(s => s.name === 'Consulting & Services')
        if (consultingStream && streamRevenue[consultingStream.id]?.[month] !== undefined) {
          streamRevenue[consultingStream.id][month] += Math.abs(tx.total || 0)
        }
      }
    }

    // Add donation revenue
    for (const d of donations) {
      const month = d.donation_date?.substring(0, 7)
      if (!month || !donationsStream) continue
      if (streamRevenue[donationsStream.id]?.[month] !== undefined) {
        streamRevenue[donationsStream.id][month] += Math.abs(d.amount || 0)
      }
    }

    // Compute per-stream metrics
    const months = Object.keys(streamRevenue[streams[0]?.id] || {}).sort()
    const currentMonth = months[months.length - 1] || ''
    const prevMonth = months[months.length - 2] || ''
    const last3Months = months.slice(-3)
    const prev3Months = months.slice(-6, -3)

    const enrichedStreams = streams.map(stream => {
      const revenue = streamRevenue[stream.id] || {}
      const currentAmount = revenue[currentMonth] || 0
      const prevAmount = revenue[prevMonth] || 0

      // 3-month rolling average for stable comparison
      const recent3 = last3Months.reduce((sum, m) => sum + (revenue[m] || 0), 0) / Math.max(last3Months.length, 1)
      const prior3 = prev3Months.reduce((sum, m) => sum + (revenue[m] || 0), 0) / Math.max(prev3Months.length, 1)
      const growthRate = prior3 > 0 ? ((recent3 - prior3) / prior3) * 100 : 0

      // Total ever
      const totalRevenue = Object.values(revenue).reduce((sum, v) => sum + v, 0)

      return {
        ...stream,
        projected_revenue: Math.round(recent3), // 3-month avg as projected
        currentMonthAmount: Math.round(currentAmount),
        totalRevenue: Math.round(totalRevenue),
        growthRate: Math.round(growthRate * 10) / 10,
      }
    })

    // Build monthly entries for the chart (all streams, last 6 months)
    const last6Months = months.slice(-6)
    const entries = []
    for (const month of last6Months) {
      for (const stream of streams) {
        const amount = streamRevenue[stream.id]?.[month] || 0
        if (amount > 0) {
          entries.push({
            id: `${stream.id}-${month}`,
            stream_id: stream.id,
            month,
            amount: Math.round(amount),
            source: 'xero',
            notes: null,
            created_at: now.toISOString(),
          })
        }
      }
    }

    // Fundraising pipeline from REAL grant applications + GHL pipeline
    const pipeline = [
      // Active grant applications
      ...(grantsRes.data || []).map((g: any) => ({
        id: g.id || crypto.randomUUID(),
        name: g.application_name,
        funder: 'Grant',
        type: 'grant',
        amount: g.outcome_amount || 0,
        probability: 1.0, // Already successful
        status: 'approved' as const,
        expected_date: new Date().toISOString(),
        notes: `Project: ${g.project_code || 'Unassigned'}`,
        created_at: new Date().toISOString(),
      })),
      // GHL pipeline opportunities (not yet won)
      ...ghlOpps
        .filter((o: any) => o.status !== 'won' && o.status !== 'lost' && o.status !== 'abandoned')
        .map((o: any) => ({
          id: o.id || crypto.randomUUID(),
          name: o.name,
          funder: 'CRM Pipeline',
          type: 'opportunity',
          amount: o.monetary_value || 0,
          probability: o.stage_name?.includes('Won') ? 0.9 :
            o.stage_name?.includes('Proposal') ? 0.6 :
            o.stage_name?.includes('Qualified') ? 0.4 : 0.2,
          status: 'applying' as const,
          expected_date: new Date().toISOString(),
          notes: o.stage_name || '',
          created_at: new Date().toISOString(),
        })),
      // GHL won opportunities
      ...ghlOpps
        .filter((o: any) => o.status === 'won')
        .map((o: any) => ({
          id: o.id || crypto.randomUUID(),
          name: o.name,
          funder: 'CRM Won',
          type: 'opportunity',
          amount: o.monetary_value || 0,
          probability: 1.0,
          status: 'approved' as const,
          expected_date: new Date().toISOString(),
          notes: 'Won',
          created_at: new Date().toISOString(),
        })),
    ]

    // Metrics
    const totalMonthly = enrichedStreams.reduce((sum, s) => sum + s.currentMonthAmount, 0)
    const fastestGrowing = enrichedStreams.reduce(
      (max, s) => (s.growthRate > (max?.growthRate || -Infinity) ? s : max),
      enrichedStreams[0] || null
    )
    const onTarget = enrichedStreams.filter(
      s => s.projected_revenue >= (s.target_monthly || 0) && (s.target_monthly || 0) > 0
    ).length
    const pipelineValue = pipeline.reduce(
      (sum, p) => sum + ((p.amount || 0) * (p.probability || 0)), 0
    )

    // Financial health context from snapshots
    const latestSnapshot = snapshots[snapshots.length - 1]
    const totalIncome13Months = snapshots.reduce((sum, s) => sum + Number(s.income || 0), 0)

    return NextResponse.json({
      streams: enrichedStreams,
      entries,
      pipeline,
      metrics: {
        totalMonthly: Math.round(totalMonthly),
        fastestGrowing: fastestGrowing ? {
          name: fastestGrowing.name,
          growthRate: fastestGrowing.growthRate,
        } : null,
        onTarget,
        pipelineValue: Math.round(pipelineValue),
        pipelineCount: pipeline.length,
        currentBalance: Math.round(Number(latestSnapshot?.closing_balance || 0)),
        totalIncome13Months: Math.round(totalIncome13Months),
      },
    })
  } catch (error) {
    console.error('Revenue streams API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
