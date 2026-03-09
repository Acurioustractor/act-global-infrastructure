import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .in('account_status', ['active', 'pending_migration'])

    if (error) throw error

    const subs = data || []
    let totalMonthlyAud = 0
    let totalMonthlyUsd = 0
    let unassigned = 0
    let dueSoon = 0
    const byCategory: Record<string, number> = {}

    const now = new Date()
    const twoWeeksFromNow = new Date()
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)

    for (const sub of subs) {
      const cost = sub.amount || 0
      const currency = (sub.currency || 'AUD').toUpperCase()
      const cycle = sub.billing_cycle || 'monthly'

      let monthly = cost
      if (cycle === 'annual' || cycle === 'yearly') monthly = cost / 12
      else if (cycle === 'quarterly') monthly = cost / 3

      if (currency === 'USD') totalMonthlyUsd += monthly
      else totalMonthlyAud += monthly

      const cat = sub.category || 'other'
      byCategory[cat] = (byCategory[cat] || 0) + monthly

      if (!sub.project_codes || sub.project_codes.length === 0) unassigned++

      if (sub.next_billing_date) {
        const renewal = new Date(sub.next_billing_date)
        if (renewal <= twoWeeksFromNow && renewal >= now) dueSoon++
      }
    }

    const topSubscriptions = subs
      .map((s) => {
        const cost = s.amount || 0
        const cycle = s.billing_cycle || 'monthly'
        let monthly = cost
        if (cycle === 'annual' || cycle === 'yearly') monthly = cost / 12
        else if (cycle === 'quarterly') monthly = cost / 3
        return {
          id: s.id,
          name: s.vendor_name,
          provider: s.vendor_name,
          amount: Math.round(monthly * 100) / 100,
          billing_cycle: cycle,
          project_codes: s.project_codes,
        }
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    return NextResponse.json({
      total_monthly_aud: Math.round(totalMonthlyAud * 100) / 100,
      total_monthly_usd: Math.round(totalMonthlyUsd * 100) / 100,
      total_yearly_aud: Math.round(totalMonthlyAud * 12 * 100) / 100,
      total_yearly_usd: Math.round(totalMonthlyUsd * 12 * 100) / 100,
      count: subs.length,
      unassigned,
      dueSoon,
      byCategory,
      topSubscriptions,
    })
  } catch (e) {
    console.error('Subscriptions summary error:', e)
    return NextResponse.json({
      total_monthly_aud: 0,
      total_monthly_usd: 0,
      total_yearly_aud: 0,
      total_yearly_usd: 0,
      count: 0,
      unassigned: 0,
      dueSoon: 0,
      byCategory: {},
      topSubscriptions: [],
    })
  }
}
