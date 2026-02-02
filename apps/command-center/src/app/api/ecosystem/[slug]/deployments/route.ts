import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const limit = parseInt(new URL(request.url).searchParams.get('limit') || '10')

    const { data: site } = await supabase
      .from('ecosystem_sites')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!site) return NextResponse.json({ deployments: [] })

    const { data } = await supabase
      .from('deployments')
      .select('*')
      .eq('site_id', site.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    return NextResponse.json({ deployments: data || [] })
  } catch (e) {
    console.error('Deployments error:', e)
    return NextResponse.json({ deployments: [] })
  }
}
