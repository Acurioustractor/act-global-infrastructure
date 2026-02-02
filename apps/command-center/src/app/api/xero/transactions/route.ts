import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const { data, error } = await supabase
      .from('xero_transactions')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit)

    if (error) throw error

    const transactions = (data || []).map((t) => ({
      id: t.id,
      date: t.date,
      description: t.contact_name || 'Unknown',
      amount: Number(t.total) || 0,
      type: t.type || 'SPEND',
      account_name: t.bank_account || 'Uncategorized',
      project_code: t.project_code,
      has_attachments: t.has_attachments || false,
    }))

    return NextResponse.json({ transactions })
  } catch (e) {
    console.error('Xero transactions error:', e)
    return NextResponse.json({ transactions: [] })
  }
}
