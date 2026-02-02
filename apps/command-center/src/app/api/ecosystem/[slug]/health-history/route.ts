import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const limit = parseInt(new URL(request.url).searchParams.get('limit') || '30')

    const { data: site } = await supabase
      .from('ecosystem_sites')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!site) return NextResponse.json({ history: [] })

    const { data } = await supabase
      .from('health_checks')
      .select('*')
      .eq('site_id', site.id)
      .order('checked_at', { ascending: false })
      .limit(limit)

    return NextResponse.json({ history: data || [] })
  } catch (e) {
    console.error('Health history error:', e)
    return NextResponse.json({ history: [] })
  }
}
