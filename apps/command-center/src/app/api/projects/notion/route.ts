import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('notion_projects')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    const projects = (data || []).map((p) => ({
      id: p.id,
      notion_id: p.notion_id,
      name: p.name,
      status: p.status || 'active',
      type: p.type || p.data?.projectType || 'project',
      budget: p.budget ?? p.data?.budget ?? null,
      progress: p.progress ?? null,
      tags: p.tags || p.data?.themes || [],
      data: p.data || {},
      last_synced: p.last_synced || p.updated_at,
      updated_at: p.updated_at,
    }))

    return NextResponse.json({ projects })
  } catch (e) {
    console.error('Notion projects error:', e)
    return NextResponse.json({ projects: [] })
  }
}
