import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get pipelines with their stages
    const { data: pipelines } = await supabase
      .from('ghl_pipelines')
      .select('*')

    // Get all opportunities
    const { data: opportunities } = await supabase
      .from('ghl_opportunities')
      .select('*')
      .order('updated_at', { ascending: false })

    const now = Date.now()
    const allMappedOpps: Array<{
      id: string
      ghlId: string
      name: string
      contactName: string
      value: number
      status: string
      createdAt: string
      updatedAt: string
      daysInStage: number
    }> = []

    // Build board data - group opportunities by pipeline and stage
    const board = (pipelines || []).map((pipeline) => {
      const pipelineOpps = (opportunities || []).filter(
        o => o.ghl_pipeline_id === pipeline.ghl_id
      )

      const stages = (pipeline.stages || []).map((stage: { id: string; name: string }) => {
        const stageOpps = pipelineOpps.filter(o => o.ghl_stage_id === stage.id || o.stage_name === stage.name)
        const mapped = stageOpps.map(o => {
          const updatedAt = o.ghl_updated_at || o.updated_at || o.created_at || new Date().toISOString()
          const createdAt = o.ghl_created_at || o.created_at || ''
          const daysInStage = Math.floor((now - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24))
          const entry = {
            id: o.id,
            ghlId: o.ghl_id || '',
            name: o.name || 'Unnamed',
            contactName: o.contact_name || '',
            contactId: o.ghl_contact_id || '',
            value: Number(o.monetary_value) || 0,
            status: o.status || 'open',
            createdAt,
            updatedAt,
            daysInStage,
          }
          allMappedOpps.push(entry)
          return entry
        })

        return {
          id: stage.id,
          name: stage.name,
          opportunities: mapped,
        }
      })

      const openOpps = pipelineOpps.filter(o => o.status !== 'won' && o.status !== 'lost' && o.status !== 'abandoned')

      return {
        id: pipeline.id,
        ghlId: pipeline.ghl_id || '',
        ghlLocationId: pipeline.ghl_location_id || '',
        name: pipeline.name,
        stages,
        totalValue: pipelineOpps.reduce((s, o) => s + (Number(o.monetary_value) || 0), 0),
        openCount: openOpps.length,
      }
    })

    // Build summary
    const openOpps = allMappedOpps.filter(o => o.status !== 'won' && o.status !== 'lost' && o.status !== 'abandoned')
    const totalValue = openOpps.reduce((s, o) => s + o.value, 0)
    const staleDeals = openOpps.filter(o => o.daysInStage > 14)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const wonThisMonth = allMappedOpps.filter(
      o => o.status === 'won' && new Date(o.updatedAt) >= thirtyDaysAgo
    ).length

    const summary = {
      totalValue,
      openDeals: openOpps.length,
      staleDeals: staleDeals.length,
      staleDealsList: staleDeals.map(d => ({
        name: d.name,
        contact: d.contactName,
        value: d.value,
        daysSinceUpdate: d.daysInStage,
      })),
      wonThisMonth,
      avgDealSize: openOpps.length > 0 ? Math.round(totalValue / openOpps.length) : 0,
    }

    return NextResponse.json({ pipelines: board, summary })
  } catch (e) {
    console.error('Pipeline board error:', e)
    return NextResponse.json({ pipelines: [], summary: null })
  }
}
