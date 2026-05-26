import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, count, error } = await supabase
      .from('subscription_alerts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ alerts: data || [], count: count || 0 })
  } catch (e) {
    console.error('Subscription alerts error:', e)
    return NextResponse.json({ alerts: [], count: 0 })
  }
}
