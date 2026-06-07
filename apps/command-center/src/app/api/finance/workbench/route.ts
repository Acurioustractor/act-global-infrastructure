import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  getFinanceWorkbench,
  type DirectionFilter,
  type SourceFilter,
  type StatusFilter,
} from '@/lib/finance/workbench'

export const dynamic = 'force-dynamic'

function parseLimit(value: string | null): number {
  return Math.min(Math.max(parseInt(value || '300', 10), 50), 800)
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const filters = {
    source: (params.get('source') || 'bank_lines') as SourceFilter,
    direction: (params.get('direction') || 'all') as DirectionFilter,
    status: (params.get('status') || 'needs_action') as StatusFilter,
    project: params.get('project') || 'all',
    q: (params.get('q') || '').trim(),
    limit: parseLimit(params.get('limit')),
  }

  try {
    return NextResponse.json(await getFinanceWorkbench(filters))
  } catch (error) {
    console.error('[finance/workbench] GET failed:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

function rdUpdate(rdCategory: unknown, source: SourceFilter) {
  if (typeof rdCategory !== 'string') return {}
  if (source === 'xero_invoices') return {}

  if (source === 'bank_lines') {
    if (rdCategory === 'core' || rdCategory === 'supporting') return { rd_eligible: true }
    if (rdCategory === 'review' || rdCategory === 'none') return { rd_eligible: false }
    return {}
  }

  if (rdCategory === 'core' || rdCategory === 'supporting') {
    return { rd_eligible: true, rd_category: rdCategory }
  }
  if (rdCategory === 'review') return { rd_eligible: false, rd_category: 'review' }
  if (rdCategory === 'none') return { rd_eligible: false, rd_category: null }
  return {}
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const source = body.source as SourceFilter
    const id = typeof body.id === 'string' ? body.id : null
    const hasProjectCode = Object.prototype.hasOwnProperty.call(body, 'projectCode')
    const projectCode = hasProjectCode && typeof body.projectCode === 'string' && body.projectCode.trim()
      ? body.projectCode.trim()
      : null

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    if (!['bank_lines', 'xero_transactions', 'xero_invoices'].includes(source)) {
      return NextResponse.json({ error: 'invalid source' }, { status: 400 })
    }

    if (projectCode) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('code')
        .eq('code', projectCode)
        .maybeSingle()
      if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 })
      if (!project) return NextResponse.json({ error: `Unknown project code: ${projectCode}` }, { status: 400 })
    }

    const rd = rdUpdate(body.rdCategory, source)
    const updates: Record<string, unknown> = { ...rd }
    if (hasProjectCode) updates.project_code = projectCode

    if (source === 'bank_lines') {
      if (hasProjectCode) updates.project_source = 'manual_workbench'
      const { error } = await supabase.from('bank_statement_lines').update(updates).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (source === 'xero_transactions') {
      if (hasProjectCode) updates.project_code_source = 'manual_workbench'
      updates.updated_at = new Date().toISOString()
      const { error } = await supabase.from('xero_transactions').update(updates).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (source === 'xero_invoices') {
      if (hasProjectCode) updates.project_code_source = 'manual_workbench'
      updates.updated_at = new Date().toISOString()
      const { error } = await supabase.from('xero_invoices').update(updates).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id, source, projectCode, rdCategory: body.rdCategory || null })
  } catch (error) {
    console.error('[finance/workbench] PATCH failed:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
