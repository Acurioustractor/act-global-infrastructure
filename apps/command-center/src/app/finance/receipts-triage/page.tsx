'use client'

import { useEffect, useState, useCallback } from 'react'

type Bucket = 'missing_amount' | 'unknown_vendor' | 'missing_file' | 'junk'

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
  signed_url: string | null
}

interface Counts {
  missing_amount: number
  unknown_vendor: number
  missing_file: number
  junk: number
}

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'missing_amount', label: 'Missing amount' },
  { key: 'unknown_vendor', label: 'Unknown vendor' },
  { key: 'missing_file', label: 'Missing file' },
  { key: 'junk', label: 'Junk' },
]

export default function ReceiptsTriagePage() {
  const [bucket, setBucket] = useState<Bucket>('missing_amount')
  const [rows, setRows] = useState<ReceiptRow[]>([])
  const [counts, setCounts] = useState<Counts>({ missing_amount: 0, unknown_vendor: 0, missing_file: 0, junk: 0 })
  const [loading, setLoading] = useState(false)
  const [edits, setEdits] = useState<Record<string, Partial<ReceiptRow>>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/receipts-triage?bucket=${bucket}&limit=500`)
      const data = await res.json()
      setRows(data.rows || [])
      setCounts(data.counts || counts)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [bucket])

  useEffect(() => { fetchRows() }, [fetchRows])

  const patch = async (id: string, payload: Record<string, unknown>) => {
    setBusyId(id)
    try {
      const res = await fetch('/api/finance/receipts-triage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`Failed: ${err.error}`)
      } else {
        // Optimistic update: remove from current list if bucket no longer matches
        setRows((rs) => rs.filter((r) => r.id !== id))
        setCounts((c) => {
          const next = { ...c }
          if (payload.action === 'junk') {
            next.junk += 1
            if (bucket !== 'junk') next[bucket] = Math.max(0, next[bucket] - 1)
          } else if (payload.action === 'restore') {
            next.junk = Math.max(0, next.junk - 1)
          }
          return next
        })
      }
    } finally {
      setBusyId(null)
    }
  }

  const setEdit = (id: string, field: keyof ReceiptRow, value: unknown) => {
    setEdits((e) => ({ ...e, [id]: { ...e[id], [field]: value } }))
  }

  const saveEdit = async (id: string) => {
    const edit = edits[id]
    if (!edit) return
    const payload: Record<string, unknown> = { action: 'edit' }
    if (edit.vendor_name !== undefined) payload.vendor_name = edit.vendor_name
    if (edit.amount_detected !== undefined) payload.amount_detected = Number(edit.amount_detected)
    if (edit.received_at !== undefined) payload.received_at = edit.received_at
    await patch(id, payload)
    setEdits((e) => {
      const next = { ...e }
      delete next[id]
      return next
    })
    fetchRows()
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 1400, margin: '0 auto', background: 'white', color: '#111', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Receipt triage</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Receipts in our DB that didn't auto-push to Xero. Fix the amount or vendor, or mark junk. Once fixed,
        rerun <code>scripts/push-receipts-to-xero.mjs</code> to push them through.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
        {BUCKETS.map((b) => (
          <button
            key={b.key}
            onClick={() => setBucket(b.key)}
            style={{
              padding: '8px 16px',
              background: bucket === b.key ? '#2563eb' : '#f3f4f6',
              color: bucket === b.key ? 'white' : '#111',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {b.label} <span style={{ opacity: 0.8 }}>({counts[b.key]})</span>
          </button>
        ))}
        <button
          onClick={fetchRows}
          style={{ marginLeft: 'auto', padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Refresh
        </button>
      </div>

      {loading && <p>Loading…</p>}
      {!loading && rows.length === 0 && <p style={{ color: '#999' }}>Nothing in this bucket.</p>}

      <div style={{ display: 'grid', gap: 16 }}>
        {rows.map((r) => {
          const edit = edits[r.id] || {}
          const isImage = (r.attachment_content_type || '').startsWith('image/')
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 16, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, background: 'white' }}>
              <div style={{ background: '#f9fafb', borderRadius: 4, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {r.signed_url ? (
                  isImage ? (
                    <img src={r.signed_url} alt="receipt" style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain' }} />
                  ) : (
                    <iframe src={r.signed_url} style={{ width: '100%', height: 500, border: 'none' }} title={`receipt-${r.id}`} />
                  )
                ) : (
                  <div style={{ padding: 24, color: '#999', textAlign: 'center' }}>
                    No file<br />
                    <small>{r.attachment_url || '(no URL)'}</small>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {r.source} · {r.status} · {r.id.slice(0, 8)} {r.dext_item_id ? `· Dext ${r.dext_item_id}` : ''}
                </div>

                <label style={{ fontSize: 12, color: '#555' }}>Vendor
                  <input
                    type="text"
                    defaultValue={r.vendor_name || ''}
                    onChange={(e) => setEdit(r.id, 'vendor_name', e.target.value)}
                    style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}
                  />
                </label>

                <label style={{ fontSize: 12, color: '#555' }}>Amount (AUD)
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={r.amount_detected ?? ''}
                    onChange={(e) => setEdit(r.id, 'amount_detected', e.target.value)}
                    style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}
                  />
                </label>

                <label style={{ fontSize: 12, color: '#555' }}>Date
                  <input
                    type="date"
                    defaultValue={(r.received_at || '').slice(0, 10)}
                    onChange={(e) => setEdit(r.id, 'received_at', e.target.value)}
                    style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}
                  />
                </label>

                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  Subject: {r.subject || '—'}<br />
                  From: {r.from_email || '—'}
                  {r.error_message ? <><br />Error: <code style={{ color: '#dc2626' }}>{r.error_message}</code></> : null}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  {bucket !== 'junk' ? (
                    <>
                      <button
                        disabled={busyId === r.id || !edit || Object.keys(edit).length === 0}
                        onClick={() => saveEdit(r.id)}
                        style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: (!edit || Object.keys(edit).length === 0) ? 0.5 : 1 }}
                      >
                        Save fix
                      </button>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => patch(r.id, { action: 'junk' })}
                        style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                      >
                        Junk
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={busyId === r.id}
                      onClick={() => patch(r.id, { action: 'restore' })}
                      style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                      Restore to review
                    </button>
                  )}
                  {r.signed_url && (
                    <a
                      href={r.signed_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ padding: '8px 16px', background: '#f3f4f6', color: '#111', borderRadius: 4, textDecoration: 'none' }}
                    >
                      Open in new tab
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
