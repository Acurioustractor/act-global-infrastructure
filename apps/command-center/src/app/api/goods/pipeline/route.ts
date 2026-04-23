/**
 * Goods Pipeline API
 *
 * GET /api/goods/pipeline
 *   Returns opportunities grouped by stage with linked Xero invoice + contact data.
 *   Shape: { stages: [{ id, name, winProbability, opps: [...] }], summary: {...} }
 *
 * PATCH /api/goods/pipeline/:oppId
 *   Body: { stageId: string, stageName: string }
 *   Moves an opportunity to a new stage. Updates Supabase mirror now;
 *   GHL API write happens via background sync worker (phase 2).
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const STALE_DAYS = 21

export async function GET() {
  try {
    // ━━━ Parallel fetch: pipeline structure, opps, linked invoices, linked contacts
    const [pipelineResult, oppsResult, invoicesResult] = await Promise.all([
      supabase
        .from('ghl_pipelines')
        .select('ghl_id, name, stages')
        .ilike('name', '%goods%')
        .order('name'),
      supabase
        .from('ghl_opportunities')
        .select('id, ghl_id, ghl_contact_id, name, pipeline_name, stage_name, ghl_stage_id, status, monetary_value, xero_invoice_id, project_code, assigned_to, ghl_created_at, ghl_updated_at, updated_at, custom_fields')
        .ilike('pipeline_name', '%goods%')
        .order('monetary_value', { ascending: false, nullsFirst: false }),
      supabase
        .from('xero_invoices')
        .select('xero_id, invoice_number, contact_name, date, total, amount_paid, amount_due, status')
        .eq('type', 'ACCREC')
        .in('status', ['PAID', 'AUTHORISED', 'SUBMITTED', 'DRAFT'])
        .order('date', { ascending: false })
        .limit(200),
    ])

    if (pipelineResult.error) throw pipelineResult.error
    if (oppsResult.error) throw oppsResult.error

    const pipelines = pipelineResult.data ?? []
    const opps = oppsResult.data ?? []
    const invoices = invoicesResult.data ?? []

    // Build invoice lookup by xero_id
    const invByXeroId = new Map<string, typeof invoices[number]>(
      invoices.map(i => [i.xero_id, i])
    )

    // Fetch linked contacts in one pass
    const contactIds = [...new Set(opps.map(o => o.ghl_contact_id).filter(Boolean))]
    const contactMap = new Map<string, { full_name: string; company_name: string | null; email: string | null; last_contact_date: string | null; tags: string[] }>()

    if (contactIds.length > 0) {
      const { data: contacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, company_name, email, last_contact_date, tags')
        .in('ghl_id', contactIds)

      for (const c of contacts ?? []) {
        contactMap.set(c.ghl_id, {
          full_name: c.full_name,
          company_name: c.company_name,
          email: c.email,
          last_contact_date: c.last_contact_date,
          tags: c.tags ?? [],
        })
      }
    }

    // Build enriched opp objects
    const now = Date.now()
    const enrichedOpps = opps.map(o => {
      const contact = o.ghl_contact_id ? contactMap.get(o.ghl_contact_id) : null
      const invoice = o.xero_invoice_id ? invByXeroId.get(o.xero_invoice_id) : null

      const updatedAt = o.ghl_updated_at ?? o.updated_at
      const daysInStage = updatedAt
        ? Math.floor((now - new Date(updatedAt).getTime()) / 86400000)
        : null
      const isStale = daysInStage !== null && daysInStage > STALE_DAYS
      const isDemandSignal = o.name?.includes('— Goods Demand $') ?? false

      return {
        id: o.id,
        ghl_id: o.ghl_id,
        name: o.name,
        pipeline_name: o.pipeline_name,
        stage_name: o.stage_name,
        ghl_stage_id: o.ghl_stage_id,
        status: o.status,
        monetary_value: Number(o.monetary_value ?? 0),
        project_code: o.project_code,
        assigned_to: o.assigned_to,
        days_in_stage: daysInStage,
        is_stale: isStale,
        is_demand_signal: isDemandSignal,
        contact: contact ? {
          full_name: contact.full_name,
          company_name: contact.company_name,
          email: contact.email,
          last_contact_date: contact.last_contact_date,
          days_since_contact: contact.last_contact_date
            ? Math.floor((now - new Date(contact.last_contact_date).getTime()) / 86400000)
            : null,
        } : null,
        invoice: invoice ? {
          invoice_number: invoice.invoice_number,
          date: invoice.date,
          total: Number(invoice.total ?? 0),
          paid: Number(invoice.amount_paid ?? 0),
          due: Number(invoice.amount_due ?? 0),
          status: invoice.status,
        } : null,
      }
    })

    // Group by stage — use each pipeline's declared stages order
    type StageDef = { id: string; name: string; position: number; stageWinProbability?: number }
    const stagesByPipeline = new Map<string, StageDef[]>()
    for (const p of pipelines) {
      const stages = Array.isArray(p.stages)
        ? (p.stages as StageDef[]).sort((a, b) => a.position - b.position)
        : []
      stagesByPipeline.set(p.name, stages)
    }

    // Primary pipeline = "Goods" or "Goods — Buyer Pipeline" (after Ben renames)
    const buyerPipelineName = pipelines.find(p =>
      p.name.toLowerCase().includes('buyer') || p.name.toLowerCase() === 'goods'
    )?.name ?? 'Goods'
    const demandPipelineName = pipelines.find(p =>
      p.name.toLowerCase().includes('demand')
    )?.name ?? null

    function buildStageGroups(pipelineName: string) {
      const stages = stagesByPipeline.get(pipelineName) ?? []
      const oppsInPipeline = enrichedOpps.filter(o => o.pipeline_name === pipelineName)

      return stages.map(s => ({
        id: s.id,
        name: s.name,
        position: s.position,
        winProbability: s.stageWinProbability ?? null,
        opps: oppsInPipeline.filter(o => o.ghl_stage_id === s.id || o.stage_name === s.name),
      }))
    }

    const buyerStages = buildStageGroups(buyerPipelineName)
    const demandStages = demandPipelineName ? buildStageGroups(demandPipelineName) : []

    // Summary metrics
    const buyerOpps = enrichedOpps.filter(o => o.pipeline_name === buyerPipelineName)
    const summary = {
      buyer_pipeline_name: buyerPipelineName,
      demand_pipeline_name: demandPipelineName,
      total_opps: buyerOpps.length,
      total_value: buyerOpps.reduce((sum, o) => sum + o.monetary_value, 0),
      paid_opps: buyerOpps.filter(o => o.stage_name?.toLowerCase() === 'paid').length,
      paid_value: buyerOpps
        .filter(o => o.stage_name?.toLowerCase() === 'paid')
        .reduce((sum, o) => sum + o.monetary_value, 0),
      stale_opps: buyerOpps.filter(o => o.is_stale).length,
      demand_signals_still_in_buyer_pipeline: buyerOpps.filter(o => o.is_demand_signal).length,
    }

    return NextResponse.json({
      summary,
      buyer_stages: buyerStages,
      demand_stages: demandStages,
      pipelines: pipelines.map(p => ({ ghl_id: p.ghl_id, name: p.name, stage_count: (p.stages as StageDef[] | null)?.length ?? 0 })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { oppId, stageId, stageName } = body as { oppId: string; stageId: string; stageName: string }

    if (!oppId || !stageId || !stageName) {
      return NextResponse.json({ error: 'oppId, stageId, stageName required' }, { status: 400 })
    }

    // Optimistic Supabase mirror update. Real GHL API write happens via
    // background sync worker (phase 2) — for now this keeps the UI responsive.
    const { error } = await supabase
      .from('ghl_opportunities')
      .update({
        ghl_stage_id: stageId,
        stage_name: stageName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', oppId)

    if (error) throw error

    return NextResponse.json({ ok: true, pending_ghl_sync: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
