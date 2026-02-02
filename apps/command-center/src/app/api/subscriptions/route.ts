import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const category = searchParams.get('category')

    let query = supabase.from('subscriptions').select('*').order('name', { ascending: true })

    if (statusFilter) query = query.eq('status', statusFilter)
    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (error) throw error

    const subs = data || []
    let monthlyAUD = 0, monthlyUSD = 0

    for (const sub of subs) {
      const cost = sub.cost_per_cycle || 0
      const currency = (sub.currency || 'AUD').toUpperCase()
      const cycle = sub.billing_cycle || 'monthly'
      let monthly = cost
      if (cycle === 'annual' || cycle === 'yearly') monthly = cost / 12
      else if (cycle === 'quarterly') monthly = cost / 3

      if (currency === 'USD') monthlyUSD += monthly
      else monthlyAUD += monthly
    }

    return NextResponse.json({
      subscriptions: subs,
      monthlyTotal: { AUD: Math.round(monthlyAUD * 100) / 100, USD: Math.round(monthlyUSD * 100) / 100 },
      yearlyProjection: { AUD: Math.round(monthlyAUD * 12 * 100) / 100, USD: Math.round(monthlyUSD * 12 * 100) / 100 },
      count: subs.length,
    })
  } catch (e) {
    console.error('Subscriptions error:', e)
    return NextResponse.json({ subscriptions: [], monthlyTotal: { AUD: 0, USD: 0 }, yearlyProjection: { AUD: 0, USD: 0 }, count: 0 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, error } = await supabase.from('subscriptions').insert(body).select().single()
    if (error) throw error
    return NextResponse.json({ subscription: data })
  } catch (e) {
    console.error('Create subscription error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
