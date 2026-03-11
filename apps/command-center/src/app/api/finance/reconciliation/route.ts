import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const project = searchParams.get('project') || ''
    const type = searchParams.get('type') || 'all'
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Get total counts for summary cards
    const { count: totalCount } = await supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })

    const { count: taggedCount } = await supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })
      .not('project_code', 'is', null)

    const { count: reconciledCount } = await supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('is_reconciled', true)

    // Receipt coverage: transactions that have attachments (from Xero/Dext)
    const { count: withReceiptCount } = await supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('has_attachments', true)

    // Untagged value
    const { data: untaggedValue } = await supabase
      .from('xero_transactions')
      .select('total')
      .is('project_code', null)

    const untaggedTotal = (untaggedValue || []).reduce(
      (sum: number, t: { total: number }) => sum + Math.abs(Number(t.total) || 0),
      0
    )

    // Build filtered query for transaction list
    let query = supabase
      .from('xero_transactions')
      .select('id, contact_name, total, date, type, project_code, project_code_source, bank_account, is_reconciled, has_attachments')
      .order('date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Apply filters
    if (status === 'needs_tag') {
      query = query.is('project_code', null)
    } else if (status === 'needs_receipt') {
      query = query.or('has_attachments.is.null,has_attachments.eq.false').not('type', 'in', '("SPEND-TRANSFER","RECEIVE-TRANSFER")')
    } else if (status === 'needs_reconcile') {
      query = query.or('is_reconciled.is.null,is_reconciled.eq.false')
    } else if (status === 'done') {
      query = query
        .not('project_code', 'is', null)
        .eq('is_reconciled', true)
    }

    if (project) {
      query = query.eq('project_code', project)
    }

    if (type === 'spend') {
      query = query.not('type', 'in', '("SPEND-TRANSFER","RECEIVE-TRANSFER","RECEIVE")')
    } else if (type === 'transfers') {
      query = query.in('type', ['SPEND-TRANSFER', 'RECEIVE-TRANSFER'])
    }

    if (from) {
      query = query.gte('date', from)
    }
    if (to) {
      query = query.lte('date', to)
    }

    const { data: transactions, error } = await query

    if (error) throw error

    // Get project codes for dropdown
    const { data: projects } = await supabase
      .from('projects')
      .select('code, name')
      .order('code')

    return NextResponse.json({
      summary: {
        total: totalCount || 0,
        tagged: taggedCount || 0,
        reconciled: reconciledCount || 0,
        withReceipt: withReceiptCount || 0,
        untaggedValue: Math.round(untaggedTotal),
        taggedPct: totalCount ? Math.round(((taggedCount || 0) / totalCount) * 100) : 0,
        reconciledPct: totalCount ? Math.round(((reconciledCount || 0) / totalCount) * 100) : 0,
        receiptPct: totalCount ? Math.round(((withReceiptCount || 0) / totalCount) * 100) : 0,
      },
      transactions: transactions || [],
      projects: projects || [],
      page,
      limit,
    })
  } catch (e) {
    console.error('Reconciliation API error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch reconciliation data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids, projectCode, noReceiptNeeded } = body as {
      ids: string[]
      projectCode?: string
      noReceiptNeeded?: boolean
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 })
    }

    let updated = 0

    for (const id of ids) {
      // Tag with project code on xero_transactions
      if (projectCode) {
        const { error } = await supabase
          .from('xero_transactions')
          .update({ project_code: projectCode, project_code_source: 'manual' })
          .eq('id', id)
        if (!error) updated++
      }

      // Mark as no-receipt-needed via receipt_matches table
      if (noReceiptNeeded) {
        const { error } = await supabase
          .from('receipt_matches')
          .upsert({
            transaction_id: id,
            status: 'no_receipt_needed',
            matched_at: new Date().toISOString(),
          }, { onConflict: 'transaction_id' })
        if (!error && !projectCode) updated++
      }
    }

    return NextResponse.json({ updated, total: ids.length })
  } catch (e) {
    console.error('Reconciliation update error:', e)
    return NextResponse.json(
      { error: 'Failed to update transactions' },
      { status: 500 }
    )
  }
}
