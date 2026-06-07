import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('vendor_project_rules')
      .select('id, vendor_name, aliases, project_code, category, rd_eligible, auto_apply')
      .order('vendor_name', { ascending: true })

    if (error) throw error
    return NextResponse.json({ rules: data || [] })
  } catch (e) {
    console.error('Vendor rules error:', e)
    return NextResponse.json({ error: 'Failed to fetch vendor rules' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vendor_name, project_code, aliases, category, rd_eligible } = body as {
      vendor_name: string
      project_code: string
      aliases?: string[]
      category?: string
      rd_eligible?: boolean
    }

    if (!vendor_name || !project_code) {
      return NextResponse.json({ error: 'vendor_name and project_code are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('vendor_project_rules')
      .upsert({
        vendor_name,
        project_code,
        aliases: aliases || [],
        category: category || 'Operations',
        rd_eligible: rd_eligible ?? false,
        auto_apply: true,
      }, { onConflict: 'vendor_name' })
      .select()

    if (error) throw error
    return NextResponse.json({ success: true, rule: data?.[0] })
  } catch (e) {
    console.error('Vendor rule upsert error:', e)
    return NextResponse.json({ error: 'Failed to save vendor rule' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('vendor_project_rules')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Vendor rule delete error:', e)
    return NextResponse.json({ error: 'Failed to delete vendor rule' }, { status: 500 })
  }
}
