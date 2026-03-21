import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PATCH: Update an opportunity's stage or project codes
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, stage, project_codes, note } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing opportunity id' }, { status: 400 })
    }

    // Fetch current state for audit
    const { data: current, error: fetchErr } = await supabase
      .from('opportunities_unified')
      .select('id, title, stage, project_codes, probability')
      .eq('id', id)
      .single()

    if (fetchErr || !current) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    // Build update
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const changes: string[] = []

    if (stage && stage !== current.stage) {
      changes.push(`stage: ${current.stage} → ${stage}`)
      updates.stage = stage
      // Auto-adjust probability based on stage
      const stageProbabilities: Record<string, number> = {
        researching: 20,
        pursuing: 35,
        submitted: 50,
        shortlisted: 70,
        realized: 100,
        won: 100,
        lost: 0,
        expired: 0,
      }
      if (stageProbabilities[stage] !== undefined) {
        updates.probability = String(stageProbabilities[stage])
      }
    }

    if (project_codes !== undefined) {
      const oldCodes = (current.project_codes || []).sort().join(', ')
      const newCodes = (project_codes || []).sort().join(', ')
      if (oldCodes !== newCodes) {
        changes.push(`projects: [${oldCodes}] → [${newCodes}]`)
        updates.project_codes = project_codes
      }
    }

    if (changes.length === 0) {
      return NextResponse.json({ message: 'No changes', id })
    }

    // Apply update
    const { error: updateErr } = await supabase
      .from('opportunities_unified')
      .update(updates)
      .eq('id', id)

    if (updateErr) throw updateErr

    // Log the change to pipeline_changes audit table
    await supabase.from('pipeline_changes').insert({
      opportunity_id: id,
      opportunity_title: current.title,
      changes: changes.join('; '),
      note: note || null,
      old_values: { stage: current.stage, project_codes: current.project_codes },
      new_values: { stage: updates.stage || current.stage, project_codes: updates.project_codes || current.project_codes },
      created_at: new Date().toISOString(),
    }).then(() => {}) // Don't fail if audit table doesn't exist yet

    return NextResponse.json({
      id,
      title: current.title,
      changes,
      updated: updates,
    })
  } catch (error) {
    console.error('Pipeline update error:', error)
    return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 })
  }
}

// GET: Fetch recent changes for review
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('pipeline_changes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    // If table doesn't exist, return empty
    if (error) {
      return NextResponse.json({ changes: [], error: error.message })
    }

    return NextResponse.json({ changes: data || [] })
  } catch {
    return NextResponse.json({ changes: [] })
  }
}
