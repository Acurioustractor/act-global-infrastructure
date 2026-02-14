import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/opportunities/update
 *
 * Updates an opportunity in Supabase + GHL (bi-directional sync).
 * Handles GHL opportunities, grant opportunities, and stage moves.
 *
 * Body: {
 *   id: string           // Supabase UUID
 *   source: 'ghl' | 'grant' | 'fundraising'
 *   changes: {
 *     value?: number
 *     projectCode?: string
 *     stageName?: string
 *     stageId?: string
 *     status?: 'open' | 'won' | 'lost'
 *     name?: string
 *     notes?: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, source, changes } = body

    if (!id || !source) {
      return NextResponse.json({ error: 'Missing id or source' }, { status: 400 })
    }

    const results: string[] = []

    if (source === 'ghl') {
      // Build Supabase update
      const supabaseUpdate: Record<string, unknown> = {}
      if (changes.value !== undefined) supabaseUpdate.monetary_value = changes.value
      if (changes.projectCode !== undefined) supabaseUpdate.project_code = changes.projectCode
      if (changes.stageName !== undefined) supabaseUpdate.stage_name = changes.stageName
      if (changes.stageId !== undefined) supabaseUpdate.ghl_stage_id = changes.stageId
      if (changes.status !== undefined) supabaseUpdate.status = changes.status
      if (changes.name !== undefined) supabaseUpdate.name = changes.name

      if (Object.keys(supabaseUpdate).length > 0) {
        const { error } = await supabase
          .from('ghl_opportunities')
          .update(supabaseUpdate)
          .eq('id', id)
        if (error) {
          return NextResponse.json({ error: `Supabase: ${error.message}` }, { status: 500 })
        }
        results.push('supabase')
      }

      // Sync to GHL if we have the ghl_id
      const { data: opp } = await supabase
        .from('ghl_opportunities')
        .select('ghl_id')
        .eq('id', id)
        .single()

      if (opp?.ghl_id) {
        try {
          const ghlUpdate: Record<string, unknown> = {}
          if (changes.value !== undefined) ghlUpdate.monetaryValue = changes.value
          if (changes.stageId !== undefined) ghlUpdate.pipelineStageId = changes.stageId
          if (changes.status !== undefined) ghlUpdate.status = changes.status
          if (changes.name !== undefined) ghlUpdate.name = changes.name

          if (Object.keys(ghlUpdate).length > 0) {
            const GHL_API_KEY = process.env.GHL_API_KEY
            const GHL_API_VERSION = '2021-07-28'
            const resp = await fetch(`https://services.leadconnectorhq.com/opportunities/${opp.ghl_id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${GHL_API_KEY}`,
                'Version': GHL_API_VERSION,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(ghlUpdate),
            })

            if (resp.ok) {
              results.push('ghl')
            } else {
              const errText = await resp.text()
              results.push(`ghl-failed: ${errText.slice(0, 100)}`)
            }
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'unknown error'
          results.push(`ghl-error: ${msg}`)
        }
      }
    } else if (source === 'grant') {
      const supabaseUpdate: Record<string, unknown> = {}
      if (changes.status !== undefined) supabaseUpdate.application_status = changes.status
      if (changes.projectCode !== undefined) {
        supabaseUpdate.aligned_projects = changes.projectCode ? [changes.projectCode] : []
      }
      if (changes.value !== undefined) supabaseUpdate.amount_max = changes.value
      if (changes.name !== undefined) supabaseUpdate.name = changes.name

      if (Object.keys(supabaseUpdate).length > 0) {
        const { error } = await supabase
          .from('grant_opportunities')
          .update(supabaseUpdate)
          .eq('id', id)
        if (error) {
          return NextResponse.json({ error: `Supabase: ${error.message}` }, { status: 500 })
        }
        results.push('supabase')
      }
    } else if (source === 'fundraising') {
      const supabaseUpdate: Record<string, unknown> = {}
      if (changes.value !== undefined) supabaseUpdate.target_amount = changes.value
      if (changes.status !== undefined) supabaseUpdate.status = changes.status
      if (changes.projectCode !== undefined) supabaseUpdate.project_code = changes.projectCode

      if (Object.keys(supabaseUpdate).length > 0) {
        const { error } = await supabase
          .from('fundraising_pipeline')
          .update(supabaseUpdate)
          .eq('id', id)
        if (error) {
          return NextResponse.json({ error: `Supabase: ${error.message}` }, { status: 500 })
        }
        results.push('supabase')
      }
    }

    return NextResponse.json({ ok: true, synced: results })
  } catch (error) {
    console.error('Opportunity update error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
