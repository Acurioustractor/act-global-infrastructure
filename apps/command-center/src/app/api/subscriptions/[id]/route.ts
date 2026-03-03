import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

// Map page field names → DB column names
function mapToDb(input: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {}
  if ('name' in input) mapped.vendor_name = input.name
  if ('cost_per_cycle' in input) mapped.amount = input.cost_per_cycle
  if ('status' in input) mapped.account_status = input.status
  if ('renewal_date' in input) mapped.next_billing_date = input.renewal_date || null
  if ('account_email' in input) mapped.current_login_email = input.account_email
  for (const key of ['category', 'billing_cycle', 'currency', 'project_codes', 'notes', 'login_url', 'payment_method', 'is_essential']) {
    if (key in input) mapped[key] = input[key]
  }
  return mapped
}

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const dbData = mapToDb(body)
    dbData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('subscriptions')
      .update(dbData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ subscription: mapSubscription(data) })
  } catch (e) {
    console.error('Update subscription error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Delete subscription error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
