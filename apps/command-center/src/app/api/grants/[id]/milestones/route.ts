import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface Milestone {
  name: string
  due: string
  completed: boolean
  assignee?: string
}

/**
 * Auto-generate milestones based on deadline and grant size
 */
function generateMilestones(deadline: string, amount: number): Milestone[] {
  const d = new Date(deadline)

  if (amount > 100000) {
    // Large grant: 7 milestones
    return [
      { name: 'LOI / Expression of Interest', due: offsetDate(d, -60), completed: false },
      { name: 'Full application draft', due: offsetDate(d, -30), completed: false },
      { name: 'Partner letters secured', due: offsetDate(d, -21), completed: false },
      { name: 'Budget & financials', due: offsetDate(d, -14), completed: false },
      { name: 'Internal review', due: offsetDate(d, -7), completed: false },
      { name: 'Final review', due: offsetDate(d, -3), completed: false },
      { name: 'Submit', due: offsetDate(d, -1), completed: false },
    ]
  }

  // Standard grant: 5 milestones
  return [
    { name: 'Research & eligibility check', due: offsetDate(d, -30), completed: false },
    { name: 'First draft complete', due: offsetDate(d, -20), completed: false },
    { name: 'Budget finalized', due: offsetDate(d, -14), completed: false },
    { name: 'Internal review', due: offsetDate(d, -10), completed: false },
    { name: 'Final submission', due: offsetDate(d, -2), completed: false },
  ]
}

function offsetDate(date: Date, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

/**
 * GET /api/grants/:id/milestones — fetch milestones from grant_applications
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data, error } = await supabase
      .from('grant_applications')
      .select('id, milestones, amount_requested, opportunity_id')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ milestones: [], error: 'Application not found' }, { status: 404 })
    }

    let milestones = (data.milestones || []) as Milestone[]

    // If no milestones, check if we can auto-generate
    if (milestones.length === 0 && data.opportunity_id) {
      const { data: opp } = await supabase
        .from('grant_opportunities')
        .select('closes_at, amount_max')
        .eq('id', data.opportunity_id)
        .single()

      if (opp?.closes_at) {
        milestones = generateMilestones(opp.closes_at, data.amount_requested || opp.amount_max || 50000)
        // Auto-save generated milestones
        await supabase
          .from('grant_applications')
          .update({ milestones })
          .eq('id', id)
      }
    }

    const completed = milestones.filter(m => m.completed).length
    const total = milestones.length
    const nextMilestone = milestones.find(m => !m.completed)

    return NextResponse.json({
      milestones,
      progress: { completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 },
      next: nextMilestone || null,
    })
  } catch (error) {
    console.error('Error fetching milestones:', error)
    return NextResponse.json({ milestones: [], error: 'Failed to fetch' }, { status: 500 })
  }
}

/**
 * PATCH /api/grants/:id/milestones — update milestone status
 * Body: { index: 0, completed: true } or { index: 0, assignee: "Ben" }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { index, completed, assignee } = body as { index: number; completed?: boolean; assignee?: string }

    // Fetch current milestones
    const { data, error } = await supabase
      .from('grant_applications')
      .select('milestones')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const milestones = [...((data.milestones || []) as Milestone[])]
    if (index < 0 || index >= milestones.length) {
      return NextResponse.json({ error: 'Invalid milestone index' }, { status: 400 })
    }

    if (completed !== undefined) milestones[index].completed = completed
    if (assignee !== undefined) milestones[index].assignee = assignee

    const { error: updateErr } = await supabase
      .from('grant_applications')
      .update({ milestones })
      .eq('id', id)

    if (updateErr) throw updateErr

    const completedCount = milestones.filter(m => m.completed).length
    return NextResponse.json({
      milestones,
      progress: { completed: completedCount, total: milestones.length, pct: Math.round((completedCount / milestones.length) * 100) },
    })
  } catch (error) {
    console.error('Error updating milestones:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
