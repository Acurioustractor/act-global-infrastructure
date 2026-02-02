import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') || '3')

    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    const { data, error } = await supabase
      .from('xero_transactions')
      .select('total, project_code')
      .eq('type', 'SPEND')
      .gte('date', startDate.toISOString().split('T')[0])

    if (error) throw error

    // Group spending by project
    const projectMap = new Map<string, { total: number; count: number }>()

    for (const tx of data || []) {
      const project = tx.project_code || 'Unassigned'
      const existing = projectMap.get(project) || { total: 0, count: 0 }
      existing.total += Math.abs(Number(tx.total) || 0)
      existing.count++
      projectMap.set(project, existing)
    }

    const projects = Array.from(projectMap.entries())
      .map(([name, { total, count }]) => ({ name, total: Math.round(total * 100) / 100, count }))
      .sort((a, b) => b.total - a.total)

    const total = projects.reduce((s, p) => s + p.total, 0)

    return NextResponse.json({
      projects,
      total: Math.round(total * 100) / 100,
      period: `Last ${months} months`,
    })
  } catch (e) {
    console.error('Spending by project error:', e)
    return NextResponse.json({ projects: [], total: 0, period: 'Last 3 months' })
  }
}
