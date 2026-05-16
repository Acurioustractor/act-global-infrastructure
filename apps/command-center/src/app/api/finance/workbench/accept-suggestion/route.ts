import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface AcceptBody {
  suggestionId?: string
  rejectionReason?: string
  action?: 'accept' | 'reject'
}

const SAFE_NEVER_AUTO = new Set(['ASK_USER', 'SL_REVIEW'])

export async function POST(request: NextRequest) {
  let body: AcceptBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { suggestionId, action = 'accept', rejectionReason } = body

  if (!suggestionId) {
    return NextResponse.json({ error: 'Missing suggestionId' }, { status: 400 })
  }

  const { data: suggestion, error: fetchErr } = await supabase
    .from('finance_ai_routing_suggestions')
    .select('id,source_table,source_record_id,suggested_project_code,confidence,applied_to_source,rejected_at,vendor_name,amount')
    .eq('id', suggestionId)
    .single()

  if (fetchErr || !suggestion) {
    return NextResponse.json({ error: `Suggestion not found: ${fetchErr?.message || 'no row'}` }, { status: 404 })
  }

  if (suggestion.applied_to_source) {
    return NextResponse.json(
      { ok: false, error: 'Already applied' },
      { status: 409 },
    )
  }
  if (suggestion.rejected_at) {
    return NextResponse.json(
      { ok: false, error: 'Already rejected' },
      { status: 409 },
    )
  }

  if (action === 'reject') {
    const { error: rejErr } = await supabase
      .from('finance_ai_routing_suggestions')
      .update({
        rejected_at: new Date().toISOString(),
        rejected_reason: rejectionReason || 'rejected via workbench',
      })
      .eq('id', suggestionId)
    if (rejErr) {
      return NextResponse.json({ error: rejErr.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, action: 'reject', suggestionId })
  }

  // Accept path
  const code = suggestion.suggested_project_code
  if (SAFE_NEVER_AUTO.has(code)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Cannot auto-apply ${code} — these codes require human review. Update the source row's project_code manually.`,
      },
      { status: 400 },
    )
  }

  const updates: Record<string, unknown> = { project_code: code }
  if (suggestion.source_table === 'xero_transactions') {
    updates.project_code_source = 'ai_router'
  }

  const { error: updateErr } = await supabase
    .from(suggestion.source_table)
    .update(updates)
    .eq('id', suggestion.source_record_id)

  if (updateErr) {
    return NextResponse.json(
      {
        ok: false,
        error: `Failed to update ${suggestion.source_table}: ${updateErr.message.slice(0, 200)}`,
      },
      { status: 500 },
    )
  }

  const { error: markErr } = await supabase
    .from('finance_ai_routing_suggestions')
    .update({
      applied_at: new Date().toISOString(),
      applied_to_source: true,
    })
    .eq('id', suggestionId)

  if (markErr) {
    console.warn('[accept-suggestion] Failed to mark applied:', markErr.message)
  }

  return NextResponse.json({
    ok: true,
    action: 'accept',
    suggestionId,
    appliedCode: code,
    sourceTable: suggestion.source_table,
    sourceRecordId: suggestion.source_record_id,
  })
}
