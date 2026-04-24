import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Bucket = 'missing_amount' | 'unknown_vendor' | 'missing_file' | 'junk' | 'all'

interface ReceiptRow {
  id: string
  source: string
  status: string
  vendor_name: string | null
  amount_detected: number | null
  received_at: string | null
  attachment_url: string | null
  attachment_filename: string | null
  attachment_content_type: string | null
  subject: string | null
  from_email: string | null
  dext_item_id: string | null
  error_message: string | null
  xero_invoice_id: string | null
  signed_url?: string | null
}

async function signedUrlFor(path: string | null) {
  if (!path) return null
  const storagePath = path.startsWith('receipt-attachments/')
    ? path.replace('receipt-attachments/', '')
    : path
  try {
    const { data, error } = await supabase.storage
      .from('receipt-attachments')
      .createSignedUrl(storagePath, 3600)
    if (error) return null
    return data?.signedUrl ?? null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const bucket = (searchParams.get('bucket') as Bucket) || 'missing_amount'
  const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500)

  let query = supabase
    .from('receipt_emails')
    .select('id, source, status, vendor_name, amount_detected, received_at, attachment_url, attachment_filename, attachment_content_type, subject, from_email, dext_item_id, error_message, xero_invoice_id')
    .order('received_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (bucket === 'missing_amount') {
    query = query.in('status', ['review', 'captured']).or('amount_detected.is.null,amount_detected.eq.0').not('attachment_url', 'is', null)
  } else if (bucket === 'unknown_vendor') {
    query = query.in('status', ['review', 'captured']).ilike('vendor_name', '%unknown%')
  } else if (bucket === 'missing_file') {
    query = query.in('status', ['review', 'captured']).is('attachment_url', null)
  } else if (bucket === 'junk') {
    query = query.eq('status', 'junk')
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows: ReceiptRow[] = data || []
  // Attach signed URLs for previews (parallel, don't block on failures)
  await Promise.all(
    rows.map(async (r) => {
      r.signed_url = await signedUrlFor(r.attachment_url)
    })
  )

  // Bucket counts for the header
  const { data: countsData } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        COUNT(*) FILTER (WHERE status IN ('review','captured') AND (amount_detected IS NULL OR amount_detected <= 0) AND attachment_url IS NOT NULL) AS missing_amount,
        COUNT(*) FILTER (WHERE status IN ('review','captured') AND vendor_name ILIKE '%unknown%') AS unknown_vendor,
        COUNT(*) FILTER (WHERE status IN ('review','captured') AND attachment_url IS NULL) AS missing_file,
        COUNT(*) FILTER (WHERE status = 'junk') AS junk
      FROM receipt_emails
    `,
  })

  const counts = countsData?.[0] || { missing_amount: 0, unknown_vendor: 0, missing_file: 0, junk: 0 }

  return NextResponse.json({ bucket, rows, counts, total: rows.length })
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, action, vendor_name, amount_detected, received_at } = body as {
      id: string
      action: 'junk' | 'restore' | 'edit'
      vendor_name?: string
      amount_detected?: number | null
      received_at?: string
    }

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (action === 'junk') {
      updates.status = 'junk'
      updates.error_message = 'Manually marked junk via triage UI'
    } else if (action === 'restore') {
      updates.status = 'review'
      updates.error_message = null
    } else if (action === 'edit') {
      if (vendor_name !== undefined) updates.vendor_name = vendor_name
      if (amount_detected !== undefined) updates.amount_detected = amount_detected
      if (received_at !== undefined) updates.received_at = received_at
    } else {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }

    const { error } = await supabase.from('receipt_emails').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, id, updates })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
