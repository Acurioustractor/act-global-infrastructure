import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('xero_invoices')
      .select('*')
      .order('due_date', { ascending: false })
      .limit(50)

    if (error) throw error

    const invoices = (data || []).map((i) => ({
      id: i.id,
      invoice_number: i.invoice_number,
      type: i.type,
      contact_name: i.contact_name,
      total: i.total || 0,
      amount_due: i.amount_due || 0,
      status: i.status,
      due_date: i.due_date,
    }))

    return NextResponse.json({ invoices })
  } catch (e) {
    console.error('Xero invoices error:', e)
    return NextResponse.json({ invoices: [] })
  }
}
