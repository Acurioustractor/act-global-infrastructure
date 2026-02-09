import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: apps } = await supabase
      .from('grant_applications')
      .select('status, amount_requested, outcome_amount, milestones')

    const all = apps || []

    const successful = all.filter(a => a.status === 'successful')
    const unsuccessful = all.filter(a => a.status === 'unsuccessful')
    const active = all.filter(a => ['draft', 'in_progress', 'submitted', 'under_review'].includes(a.status))

    const totalAwarded = successful.reduce((s, a) => s + (a.outcome_amount || 0), 0)
    const pipelineValue = active.reduce((s, a) => s + (a.amount_requested || 0), 0)
    const winRate = (successful.length + unsuccessful.length) > 0
      ? Math.round(100 * successful.length / (successful.length + unsuccessful.length))
      : 0

    // Next deadline from milestones
    const now = new Date()
    let nextDeadline: string | null = null
    let nextDeadlineName: string | null = null

    for (const app of active) {
      for (const m of app.milestones || []) {
        if (m.due && !m.completed && new Date(m.due) > now) {
          if (!nextDeadline || new Date(m.due) < new Date(nextDeadline)) {
            nextDeadline = m.due
            nextDeadlineName = `${app.status === 'draft' ? 'Draft' : ''} ${m.name || 'Milestone'}`.trim()
          }
        }
      }
    }

    // Upcoming deadlines (90 days)
    const { data: opps } = await supabase
      .from('grant_opportunities')
      .select('name, closes_at, fit_score')
      .eq('status', 'open')
      .gte('closes_at', now.toISOString().split('T')[0])
      .order('closes_at', { ascending: true })
      .limit(10)

    return NextResponse.json({
      pipelineValue,
      activeCount: active.length,
      winRate,
      totalAwarded,
      nextDeadline,
      nextDeadlineName,
      upcomingDeadlines: (opps || []).map(o => ({
        name: o.name,
        closesAt: o.closes_at,
        fitScore: o.fit_score,
        daysRemaining: Math.round((new Date(o.closes_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
    })
  } catch (error) {
    console.error('Error in grants metrics:', error)
    return NextResponse.json({
      pipelineValue: 0,
      activeCount: 0,
      winRate: 0,
      totalAwarded: 0,
      nextDeadline: null,
      nextDeadlineName: null,
      upcomingDeadlines: [],
    }, { status: 500 })
  }
}
