import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface Deadline {
  id: string
  title: string
  date: string
  type: 'grant' | 'compliance' | 'insurance' | 'tax' | 'opportunity'
  source: string
  amount?: number
  status?: string
  urgency: 'overdue' | 'this_week' | 'this_month' | 'upcoming'
}

export async function GET() {
  try {
    const now = new Date()
    const thirtyDaysOut = new Date()
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30)

    const deadlines: Deadline[] = []

    // 1. GHL opportunities with close dates (grants & opportunities)
    const { data: opportunities } = await supabase
      .from('ghl_opportunities')
      .select('id, name, monetary_value, status, close_date, pipeline_name, stage_name')
      .eq('status', 'open')
      .not('close_date', 'is', null)
      .lte('close_date', thirtyDaysOut.toISOString())
      .order('close_date', { ascending: true })
      .limit(15)

    for (const opp of opportunities || []) {
      const closeDate = new Date(opp.close_date)
      deadlines.push({
        id: `opp-${opp.id}`,
        title: opp.name,
        date: opp.close_date,
        type: opp.pipeline_name?.toLowerCase().includes('grant') ? 'grant' : 'opportunity',
        source: opp.pipeline_name || 'Pipeline',
        amount: opp.monetary_value,
        status: opp.stage_name,
        urgency: getUrgency(closeDate, now),
      })
    }

    // 2. Compliance calendar (hardcoded key dates)
    const currentYear = now.getFullYear()
    const complianceDates = [
      { title: 'BAS Q1 (Jul-Sep)', date: `${currentYear}-10-28`, type: 'tax' as const },
      { title: 'BAS Q2 (Oct-Dec)', date: `${currentYear + 1}-02-28`, type: 'tax' as const },
      { title: 'BAS Q3 (Jan-Mar)', date: `${currentYear}-04-28`, type: 'tax' as const },
      { title: 'BAS Q4 (Apr-Jun)', date: `${currentYear}-07-28`, type: 'tax' as const },
      { title: 'ASIC Annual Review', date: `${currentYear}-12-31`, type: 'compliance' as const },
      { title: 'ACNC Annual Information Statement', date: `${currentYear}-12-31`, type: 'compliance' as const },
      { title: 'Income Tax Return', date: `${currentYear}-10-31`, type: 'tax' as const },
      { title: 'Public Liability Insurance Renewal', date: `${currentYear}-06-30`, type: 'insurance' as const },
      { title: 'Workers Comp Insurance Renewal', date: `${currentYear}-06-30`, type: 'insurance' as const },
    ]

    for (const item of complianceDates) {
      const itemDate = new Date(item.date)
      // Show if within 60 days or overdue
      const daysUntil = Math.floor((itemDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntil >= -30 && daysUntil <= 60) {
        deadlines.push({
          id: `compliance-${item.title.replace(/\s/g, '-').toLowerCase()}`,
          title: item.title,
          date: item.date,
          type: item.type,
          source: 'Compliance Calendar',
          urgency: getUrgency(itemDate, now),
        })
      }
    }

    // Sort by date
    deadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json({
      deadlines,
      total: deadlines.length,
      counts: {
        overdue: deadlines.filter(d => d.urgency === 'overdue').length,
        thisWeek: deadlines.filter(d => d.urgency === 'this_week').length,
        thisMonth: deadlines.filter(d => d.urgency === 'this_month').length,
        upcoming: deadlines.filter(d => d.urgency === 'upcoming').length,
      },
    })
  } catch (error) {
    console.error('Business upcoming error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deadlines', deadlines: [], total: 0, counts: {} },
      { status: 500 }
    )
  }
}

function getUrgency(date: Date, now: Date): Deadline['urgency'] {
  const daysUntil = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntil < 0) return 'overdue'
  if (daysUntil <= 7) return 'this_week'
  if (daysUntil <= 30) return 'this_month'
  return 'upcoming'
}
