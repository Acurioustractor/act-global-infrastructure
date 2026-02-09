import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get pipelines, opportunities, and contacts in parallel
    const [{ data: pipelines }, { data: opportunities }, { data: contacts }] = await Promise.all([
      supabase.from('ghl_pipelines').select('*'),
      supabase.from('ghl_opportunities').select('*').order('updated_at', { ascending: false }),
      supabase.from('ghl_contacts').select('ghl_id, full_name, first_name, last_name, email'),
    ])

    // Build contact lookup by ghl_id
    const contactMap: Record<string, { name: string; email: string }> = {}
    for (const c of contacts || []) {
      if (c.ghl_id) {
        contactMap[c.ghl_id] = {
          name: c.full_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || '',
          email: c.email || '',
        }
      }
    }

    const now = Date.now()
    const allMappedOpps: Array<{
      id: string
      ghlId: string
      name: string
      contactName: string
      contactId: string
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
          // Resolve contact name: use contact lookup first, fall back to opportunity field
          const contactId = o.ghl_contact_id || ''
          const contactInfo = contactId ? contactMap[contactId] : null
          const contactName = contactInfo?.name || o.contact_name || ''
          const contactEmail = contactInfo?.email || ''
          const entry = {
            id: o.id,
            ghlId: o.ghl_id || '',
            name: o.name || 'Unnamed',
            contactName,
            contactId,
            contactEmail,
            value: Number(o.monetary_value) || 0,
            status: o.status || 'open',
            createdAt,
            updatedAt,
            daysInStage,
            projectCode: o.project_code || '',
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

    // Build summary with won/lost stats
    const openOpps = allMappedOpps.filter(o => o.status !== 'won' && o.status !== 'lost' && o.status !== 'abandoned')
    const wonOpps = allMappedOpps.filter(o => o.status === 'won')
    const lostOpps = allMappedOpps.filter(o => o.status === 'lost')
    const totalValue = openOpps.reduce((s, o) => s + o.value, 0)
    const staleDeals = openOpps.filter(o => o.daysInStage > 14)

    // Time ranges
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const quarterStart = new Date()
    quarterStart.setMonth(quarterStart.getMonth() - 3)

    const wonThisMonth = wonOpps.filter(o => new Date(o.updatedAt) >= thirtyDaysAgo)
    const wonThisQuarter = wonOpps.filter(o => new Date(o.updatedAt) >= quarterStart)
    const lostThisQuarter = lostOpps.filter(o => new Date(o.updatedAt) >= quarterStart)

    const wonValueThisQuarter = wonThisQuarter.reduce((s, o) => s + o.value, 0)
    const wonValueAllTime = wonOpps.reduce((s, o) => s + o.value, 0)
    const lostValueThisQuarter = lostThisQuarter.reduce((s, o) => s + o.value, 0)

    // Win rate: won / (won + lost) for all time
    const closedTotal = wonOpps.length + lostOpps.length
    const winRate = closedTotal > 0 ? Math.round((wonOpps.length / closedTotal) * 100) : 0

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
      wonThisMonth: wonThisMonth.length,
      wonThisQuarter: wonThisQuarter.length,
      wonAllTime: wonOpps.length,
      wonValueThisQuarter: Math.round(wonValueThisQuarter),
      wonValueAllTime: Math.round(wonValueAllTime),
      lostThisQuarter: lostThisQuarter.length,
      lostValueThisQuarter: Math.round(lostValueThisQuarter),
      winRate,
      avgDealSize: openOpps.length > 0 ? Math.round(totalValue / openOpps.length) : 0,
    }

    return NextResponse.json({ pipelines: board, summary })
  } catch (e) {
    console.error('Pipeline board error:', e)
    return NextResponse.json({ pipelines: [], summary: null })
  }
}
