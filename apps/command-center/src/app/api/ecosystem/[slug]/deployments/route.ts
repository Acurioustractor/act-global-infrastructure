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

    // deployments table removed from DB — returns empty until a backend exists
    void limit
    return NextResponse.json({ deployments: [] })
  } catch (e) {
    console.error('Deployments error:', e)
    return NextResponse.json({ deployments: [] })
  }
}
