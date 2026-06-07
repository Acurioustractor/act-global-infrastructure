import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { count: pendingCount } = await supabase
      .from('receipt_matches')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'email_suggested'])

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const { count: resolvedThisWeek } = await supabase
      .from('receipt_matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved')
      .gte('resolved_at', weekStart.toISOString())

    // receipt_gamification_stats table removed from DB — returns null until a backend exists
    type GamificationStats = { current_streak?: number; total_points?: number; achievements?: unknown[] }
    const stats = null as GamificationStats | null

    const total = (pendingCount || 0) + (resolvedThisWeek || 0)
    const score = total > 0 ? Math.round(((resolvedThisWeek || 0) / total) * 100) : 100

    return NextResponse.json({
      success: true,
      score,
      pending: pendingCount || 0,
      resolvedThisWeek: resolvedThisWeek || 0,
      streak: stats?.current_streak || 0,
      totalPoints: stats?.total_points || 0,
      achievements: stats?.achievements || [],
    })
  } catch (e) {
    console.error('Receipt score error:', e)
    return NextResponse.json({
      success: true,
      score: 0,
      pending: 0,
      resolvedThisWeek: 0,
      streak: 0,
      totalPoints: 0,
      achievements: [],
    })
  }
}
