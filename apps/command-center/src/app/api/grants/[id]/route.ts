import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Fetch grant + funder documents in parallel
    const [grantResult, docsResult] = await Promise.all([
      supabase
        .from('grant_opportunities')
        .select('*')
        .eq('id', id)
        .single(),
      supabase
        .from('grant_funder_documents')
        .select('*')
        .eq('opportunity_id', id)
        .order('sort_order', { ascending: true }),
    ])

    if (grantResult.error || !grantResult.data) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
    }

    return NextResponse.json({
      grant: grantResult.data,
      funderDocuments: docsResult.data || [],
    })
  } catch (error) {
    console.error('Error fetching grant:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Update grant_opportunities fields (eligibility, status, url, etc.)
    if (body.eligibility_criteria || body.application_status || body.url !== undefined) {
      const oppUpdates: Record<string, unknown> = {}
      if (body.eligibility_criteria) oppUpdates.eligibility_criteria = body.eligibility_criteria
      if (body.application_status) oppUpdates.application_status = body.application_status
      if (body.url !== undefined) oppUpdates.url = body.url || null

      const { error } = await supabase
        .from('grant_opportunities')
        .update(oppUpdates)
        .eq('id', id)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // Update grant_applications fields
    const updates: Record<string, unknown> = {}
    if (body.status) updates.status = body.status
    if (body.notes !== undefined) updates.notes = body.notes
    if (body.project_code) updates.project_code = body.project_code

    const { data, error } = await supabase
      .from('grant_applications')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) throw error

    return NextResponse.json(data?.[0] || null)
  } catch (error) {
    console.error('Error updating grant:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabase
      .from('grant_applications')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting grant:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
