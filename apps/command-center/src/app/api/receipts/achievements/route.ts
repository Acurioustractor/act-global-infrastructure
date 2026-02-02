import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: stats } = await supabase
      .from('receipt_gamification_stats')
      .select('achievements, total_points, current_streak, best_streak')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      success: true,
      achievements: stats?.achievements || [],
      totalPoints: stats?.total_points || 0,
      currentStreak: stats?.current_streak || 0,
      bestStreak: stats?.best_streak || 0,
    })
  } catch (e) {
    console.error('Achievements error:', e)
    return NextResponse.json({
      success: true,
      achievements: [],
      totalPoints: 0,
      currentStreak: 0,
      bestStreak: 0,
    })
  }
}
