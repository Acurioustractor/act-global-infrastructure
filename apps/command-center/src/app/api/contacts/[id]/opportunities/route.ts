import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Get the contact's GHL ID
    const { data: contact } = await supabase
      .from('ghl_contacts')
      .select('ghl_id')
      .eq('id', id)
      .single()

    if (!contact) return NextResponse.json({ opportunities: [] })

    const { data } = await supabase
      .from('ghl_opportunities')
      .select('*')
      .eq('ghl_contact_id', contact.ghl_id)
      .order('updated_at', { ascending: false })

    const opportunities = (data || []).map((o) => ({
      id: o.id,
      name: o.name,
      pipeline_name: o.pipeline_name || 'Default',
      stage_name: o.stage_name || 'Unknown',
      monetary_value: Number(o.monetary_value) || 0,
      status: o.status || 'open',
      created_at: o.created_at,
      updated_at: o.updated_at,
    }))

    return NextResponse.json({ opportunities })
  } catch (e) {
    console.error('Contact opportunities error:', e)
    return NextResponse.json({ opportunities: [] })
  }
}
