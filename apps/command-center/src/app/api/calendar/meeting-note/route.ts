import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id parameter required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('project_knowledge')
      .select('id, title, summary, content, action_items, participants, topics, source_url, recorded_at')
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json({ meeting: data })
  } catch (e) {
    console.error('Meeting note fetch error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
