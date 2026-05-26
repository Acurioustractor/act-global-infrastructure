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

    // health_checks table removed from DB — returns empty until a backend exists
    void limit
    return NextResponse.json({ history: [] })
  } catch (e) {
    console.error('Health history error:', e)
    return NextResponse.json({ history: [] })
  }
}
