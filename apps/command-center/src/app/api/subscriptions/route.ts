import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

// Map DB row → page Subscription shape
function mapSubscription(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.vendor_name || '',
    provider: (row.vendor_name as string) || '',
    category: row.category || 'other',
    billing_cycle: row.billing_cycle || 'monthly',
    cost_per_cycle: row.amount || 0,
    currency: row.currency || 'AUD',
    renewal_date: row.next_billing_date || null,
    status: row.account_status || 'active',
    project_codes: row.project_codes || [],
    notes: row.notes || '',
    login_url: row.login_url || '',
    account_email: row.current_login_email || row.account_email || '',
    payment_method: row.payment_method || '',
    is_essential: row.is_essential || false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// Map page input → DB columns for insert/update
function mapToDb(input: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {}
  if ('name' in input) mapped.vendor_name = input.name
  if ('cost_per_cycle' in input) mapped.amount = input.cost_per_cycle
  if ('status' in input) mapped.account_status = input.status
  if ('renewal_date' in input) mapped.next_billing_date = input.renewal_date || null
  if ('account_email' in input) mapped.current_login_email = input.account_email
  // These columns match directly
  for (const key of ['category', 'billing_cycle', 'currency', 'project_codes', 'notes', 'login_url', 'payment_method', 'is_essential']) {
    if (key in input) mapped[key] = input[key]
  }
  return mapped
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const category = searchParams.get('category')

    let query = supabase.from('subscriptions').select('*').order('vendor_name', { ascending: true })

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('account_status', statusFilter)
    }
    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (error) throw error

    const subs = (data || []).map(mapSubscription)
    let monthlyAUD = 0, monthlyUSD = 0

    for (const sub of subs) {
      const cost = Number(sub.cost_per_cycle) || 0
      const currency = String(sub.currency || 'AUD').toUpperCase()
      const cycle = String(sub.billing_cycle || 'monthly')
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
    const dbData = mapToDb(body)
    const { data, error } = await supabase.from('subscriptions').insert(dbData).select().single()
    if (error) throw error
    return NextResponse.json({ subscription: mapSubscription(data) })
  } catch (e) {
    console.error('Create subscription error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const dbData = mapToDb(updates)
    dbData.updated_at = new Date().toISOString()
    const { data, error } = await supabase.from('subscriptions').update(dbData).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json({ subscription: mapSubscription(data) })
  } catch (e) {
    console.error('Update subscription error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
