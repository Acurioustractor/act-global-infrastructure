import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

type UpdateBody =
  | { type: 'project'; code: string; action: 'focus' | 'active' | 'background' | 'archive' }
  | { type: 'pipeline'; id: string; action: 'pursue' | 'watch' | 'dismiss' }
  | { type: 'receivable'; invoiceId: string; action: 'chasing' | 'payment_plan' | 'dispute' | 'write_off' }

const PIPELINE_STAGE_MAP: Record<string, { stage: string; probability: number }> = {
  pursue: { stage: 'pursuing', probability: 35 },
  dismiss: { stage: 'lost', probability: 0 },
}

export async function POST(req: NextRequest) {
  try {
    const body: UpdateBody = await req.json()

    if (body.type === 'project') {
      const { code, action } = body
      if (!code) return NextResponse.json({ error: 'Missing project code' }, { status: 400 })

      const updates: Record<string, string> = { updated_at: new Date().toISOString() }
      if (action === 'focus') updates.priority = 'high'
      else if (action === 'active') updates.priority = 'medium'
      else if (action === 'background') updates.priority = 'low'
      else if (action === 'archive') {
        updates.status = 'archived'
        updates.priority = 'low'
      }

      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('code', code)

      if (error) throw error
      return NextResponse.json({ ok: true, type: 'project', code, action })
    }

    if (body.type === 'pipeline') {
      const { id, action } = body
      if (!id) return NextResponse.json({ error: 'Missing pipeline id' }, { status: 400 })

      if (action === 'watch') {
        // Tag as watching via metadata
        const { data: current } = await supabase
          .from('opportunities_unified')
          .select('metadata')
          .eq('id', id)
          .single()

        const metadata = (current?.metadata as Record<string, unknown>) || {}
        metadata.watching = true

        const { error } = await supabase
          .from('opportunities_unified')
          .update({ metadata, updated_at: new Date().toISOString() })
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ ok: true, type: 'pipeline', id, action })
      }

      const stageUpdate = PIPELINE_STAGE_MAP[action]
      if (!stageUpdate) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

      const { error } = await supabase
        .from('opportunities_unified')
        .update({
          stage: stageUpdate.stage,
          probability: stageUpdate.probability,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      // Audit log
      await supabase.from('pipeline_changes').insert({
        opportunity_id: id,
        changes: `review action: ${action} → stage=${stageUpdate.stage}`,
        new_values: { stage: stageUpdate.stage, probability: stageUpdate.probability },
        created_at: new Date().toISOString(),
      }).then(() => {})

      return NextResponse.json({ ok: true, type: 'pipeline', id, action })
    }

    if (body.type === 'receivable') {
      const { invoiceId, action } = body
      if (!invoiceId) return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 })

      const validStatuses = ['chasing', 'payment_plan', 'dispute', 'write_off']
      if (!validStatuses.includes(action)) {
        return NextResponse.json({ error: 'Invalid chase status' }, { status: 400 })
      }

      // Check if mapping exists
      const { data: existing } = await supabase
        .from('invoice_project_map')
        .select('id')
        .eq('invoice_id', invoiceId)
        .limit(1)

      if (existing && existing.length > 0) {
        // Update existing row
        const { error } = await supabase
          .from('invoice_project_map')
          .update({ chase_status: action })
          .eq('invoice_id', invoiceId)

        if (error) throw error
      } else {
        // Create a new mapping row with chase_status (project_code = UNTAGGED)
        const { error } = await supabase
          .from('invoice_project_map')
          .insert({
            invoice_id: invoiceId,
            project_code: 'UNTAGGED',
            income_type: 'receivable',
            chase_status: action,
          })

        if (error) throw error
      }

      return NextResponse.json({ ok: true, type: 'receivable', invoiceId, action })
    }

    return NextResponse.json({ error: 'Invalid update type' }, { status: 400 })
  } catch (error) {
    console.error('Review update error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
