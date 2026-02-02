import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, count, error } = await supabase
      .from('pending_subscriptions')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('discovery_confidence', { ascending: false })

    if (error) throw error

    return NextResponse.json({ pending: data || [], count: count || 0 })
  } catch (e) {
    console.error('Pending subscriptions error:', e)
    return NextResponse.json({ pending: [], count: 0 })
  }
}
