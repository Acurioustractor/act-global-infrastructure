import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET — list repo-contact tags (optionally filter by repo_name)
export async function GET(request: NextRequest) {
  const repoName = request.nextUrl.searchParams.get('repo')

  let query = supabase
    .from('repo_contacts')
    .select('*')
    .order('created_at', { ascending: false })

  if (repoName) {
    query = query.eq('repo_name', repoName)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching repo contacts:', error)
    return NextResponse.json({ contacts: [], error: error.message }, { status: 500 })
  }

  return NextResponse.json({ contacts: data || [] })
}

// POST — tag a contact to a repo
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { repoName, contactId, contactName, role } = body

  if (!repoName || !contactId) {
    return NextResponse.json(
      { error: 'repoName and contactId are required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('repo_contacts')
    .upsert(
      { repo_name: repoName, contact_id: contactId, contact_name: contactName, role },
      { onConflict: 'repo_name,contact_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error tagging contact:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ contact: data })
}

// DELETE — remove a contact tag from a repo
export async function DELETE(request: NextRequest) {
  const body = await request.json()
  const { repoName, contactId } = body

  if (!repoName || !contactId) {
    return NextResponse.json(
      { error: 'repoName and contactId are required' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('repo_contacts')
    .delete()
    .eq('repo_name', repoName)
    .eq('contact_id', contactId)

  if (error) {
    console.error('Error removing contact tag:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
