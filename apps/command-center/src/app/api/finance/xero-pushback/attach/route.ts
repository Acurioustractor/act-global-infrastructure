import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Phase 1 of the close-the-loop plan (2026-05-29-xero-close-the-loop): upload a
// receipt from the Mirror straight to Xero's Attachments API, then flip the
// mirror row to has_attachments=true. Tier-3 Xero write (additive — attaches a
// file, mutates no financial data; allowed even on reconciled rows).
//
// Body: multipart/form-data { file, id (supabase row id), source ('bill'|'spend'|…) }

const TENANT = process.env.XERO_TENANT_ID

async function getAccessToken(): Promise<string> {
  const { data: row } = await supabase.from('xero_tokens').select('refresh_token').eq('id', 'default').single()
  if (!row?.refresh_token) throw new Error('No Xero refresh token on file')
  const creds = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64')
  const r = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: row.refresh_token }),
  })
  if (!r.ok) throw new Error(`Token refresh failed ${r.status}`)
  const t = await r.json()
  const expiresAt = new Date(Date.now() + t.expires_in * 1000 - 60000)
  await supabase.from('xero_tokens').upsert(
    { id: 'default', refresh_token: t.refresh_token, access_token: t.access_token, expires_at: expiresAt.toISOString(), updated_at: new Date().toISOString(), updated_by: 'mirror-attach' },
    { onConflict: 'id' },
  )
  return t.access_token as string
}

function safeFileName(name: string): string {
  const base = (name || 'receipt').split(/[\\/]/).pop() || 'receipt'
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 100)
  return cleaned || 'receipt'
}

export async function POST(request: NextRequest) {
  try {
    if (!TENANT) return NextResponse.json({ error: 'XERO_TENANT_ID not set on the server' }, { status: 500 })
    const form = await request.formData()
    const file = form.get('file')
    const id = form.get('id') as string | null
    const source = (form.get('source') as string | null) || 'bill'
    if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 })
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Resolve the Xero GUID server-side (don't trust the client) + the table to update.
    const isBill = source === 'bill'
    const table = isBill ? 'xero_invoices' : 'xero_transactions'
    const guidCol = isBill ? 'xero_id' : 'xero_transaction_id'
    const endpoint = isBill ? 'Invoices' : 'BankTransactions'
    const { data: rowData, error: lookupErr } = await supabase.from(table).select(`${guidCol}, has_attachments`).eq('id', id).single()
    if (lookupErr || !rowData) return NextResponse.json({ error: `row not found in ${table}` }, { status: 404 })
    const xeroId = (rowData as Record<string, unknown>)[guidCol] as string | null
    if (!xeroId) return NextResponse.json({ error: `no Xero id on ${table} row` }, { status: 422 })

    const fileName = safeFileName(file.name)
    const contentType = file.type || 'application/octet-stream'
    const bytes = Buffer.from(await file.arrayBuffer())
    if (!bytes.length) return NextResponse.json({ error: 'empty file' }, { status: 400 })
    if (bytes.length > 25 * 1024 * 1024) return NextResponse.json({ error: 'file too large (Xero limit ~25MB)' }, { status: 413 })

    const token = await getAccessToken()
    const url = `https://api.xero.com/api.xro/2.0/${endpoint}/${xeroId}/Attachments/${encodeURIComponent(fileName)}`
    const xr = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'xero-tenant-id': TENANT,
        'Content-Type': contentType,
        'Content-Length': bytes.length.toString(),
        Accept: 'application/json',
      },
      body: bytes,
    })
    if (!xr.ok) {
      const txt = await xr.text()
      return NextResponse.json({ error: `Xero ${xr.status}: ${txt.slice(0, 250)}` }, { status: 502 })
    }
    const body = await xr.json().catch(() => ({}))
    const attachmentId = body?.Attachments?.[0]?.AttachmentID || null

    // Flip the mirror so the UI reflects it immediately (next sync confirms).
    await supabase.from(table).update({ has_attachments: true }).eq('id', id)

    return NextResponse.json({ ok: true, attachmentId, fileName, endpoint, xeroId })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'attach failed' }, { status: 500 })
  }
}
