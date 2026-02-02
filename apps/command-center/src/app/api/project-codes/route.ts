import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data } = await supabase
      .from('notion_projects')
      .select('name, status, data')
      .order('name', { ascending: true })

    const codes = (data || []).map((p) => ({
      code: p.data?.id || p.name?.toLowerCase().replace(/\s+/g, '-') || '',
      name: p.name,
      category: p.data?.projectType || 'project',
      status: p.status || 'active',
      priority: p.data?.priority || 'medium',
    }))

    return NextResponse.json({
      codes,
      categories: {
        project: { icon: 'folder', color: 'blue' },
        product: { icon: 'box', color: 'purple' },
        venue: { icon: 'building', color: 'green' },
        operations: { icon: 'settings', color: 'gray' },
      },
    })
  } catch (e) {
    console.error('Project codes error:', e)
    return NextResponse.json({ codes: [], categories: {} })
  }
}
