import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET — list all repo-project links (optionally filter by repo_name)
export async function GET(request: NextRequest) {
  const repoName = request.nextUrl.searchParams.get('repo')

  let query = supabase
    .from('repo_project_links')
    .select('*')
    .order('created_at', { ascending: false })

  if (repoName) {
    query = query.eq('repo_name', repoName)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching repo links:', error)
    return NextResponse.json({ links: [], error: error.message }, { status: 500 })
  }

  return NextResponse.json({ links: data || [] })
}

// POST — add a repo-project link
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { repoName, projectCode, projectName, notes } = body

  if (!repoName || !projectCode) {
    return NextResponse.json(
      { error: 'repoName and projectCode are required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('repo_project_links')
    .upsert(
      { repo_name: repoName, project_code: projectCode, project_name: projectName || null, notes, updated_at: new Date().toISOString() },
      { onConflict: 'repo_name,project_code' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error creating repo link:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ link: data })
}

// DELETE — remove a repo-project link
export async function DELETE(request: NextRequest) {
  const body = await request.json()
  const { repoName, projectCode } = body

  if (!repoName || !projectCode) {
    return NextResponse.json(
      { error: 'repoName and projectCode are required' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('repo_project_links')
    .delete()
    .eq('repo_name', repoName)
    .eq('project_code', projectCode)

  if (error) {
    console.error('Error deleting repo link:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
