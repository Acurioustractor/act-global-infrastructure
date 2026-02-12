import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { project_code } = await req.json()

    if (!project_code) {
      return NextResponse.json({ error: 'project_code required' }, { status: 400 })
    }

    const { error } = await supabase.from('contact_project_links').upsert(
      { ghl_contact_id: id, project_code, source: 'manual' },
      { onConflict: 'ghl_contact_id,project_code' }
    )

    if (error) {
      console.error('Link project error:', error)
      return NextResponse.json({ error: 'Failed to link project' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Link project error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { project_code } = await req.json()

    if (!project_code) {
      return NextResponse.json({ error: 'project_code required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('contact_project_links')
      .delete()
      .eq('ghl_contact_id', id)
      .eq('project_code', project_code)

    if (error) {
      console.error('Unlink project error:', error)
      return NextResponse.json({ error: 'Failed to unlink project' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unlink project error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
