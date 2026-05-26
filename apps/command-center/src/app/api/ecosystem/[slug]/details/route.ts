import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const { data: site, error } = await supabase
      .from('ecosystem_sites')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // health_checks table removed from DB — returns null until a backend exists
    const latestCheck = null

    return NextResponse.json({ site, latestCheck: latestCheck || null })
  } catch (e) {
    console.error('Ecosystem details error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
