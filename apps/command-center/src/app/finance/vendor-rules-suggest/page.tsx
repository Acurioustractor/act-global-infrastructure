'use client'

import { useEffect, useState, useCallback } from 'react'

interface Suggestion {
  vendor_name: string
  receipt_count: number
  total_amount: number
  first_seen: string | null
  last_seen: string | null
  project_code: string
  category: string
  xero_account_code: string
  xero_tax_type: string
  xero_currency: string
  rd_eligible: boolean
  reason: string
  sample_subjects: string[]
  _include?: boolean // client-side selection
}

const PROJECT_CODES: Array<[string, string]> = [
  ['ACT-IN', 'ACT-IN — ACT Infrastructure'],
  ['ACT-FM', 'ACT-FM — The Farm'],
  ['ACT-HV', 'ACT-HV — The Harvest Witta'],
  ['ACT-GD', 'ACT-GD — Goods'],
  ['ACT-EL', 'ACT-EL — Empathy Ledger'],
  ['ACT-JH', 'ACT-JH — JusticeHub'],
  ['ACT-MY', 'ACT-MY — Mounty Yarns'],
  ['ACT-BG', 'ACT-BG — BG Fit'],
  ['ACT-CB', 'ACT-CB — Marriage Celebrant'],
  ['ACT-ER', 'ACT-ER — PICC Elders Room'],
  ['ACT-FG', 'ACT-FG — Feel Good Project'],
  ['ACT-JP', "ACT-JP — June's Patch"],
  ['ACT-PI', 'ACT-PI — PICC'],
  ['ACT-PS', 'ACT-PS — PICC Photo Studio'],
  ['ACT-TR', 'ACT-TR — Treacher'],
  ['ACT-TW', "ACT-TW — Travelling Women's Car"],
  ['ACT-UA', 'ACT-UA — Uncle Allan Palm Island Art'],
  ['ACT-WE', 'ACT-WE — Westpac Summit 2025'],
  ['ACT-TN', 'ACT-TN — TOMNET'],
  ['ACT-10', 'ACT-10 — 10x10 Retreat'],
  ['ACT-OO', 'ACT-OO — Oonchiumpa'],
  ['ACT-BB', 'ACT-BB — Barkly Backbone'],
  ['ACT-BM', 'ACT-BM — Bimberi'],
  ['ACT-BR', 'ACT-BR — ACT Bali Retreat'],
  ['ACT-BV', 'ACT-BV — Black Cockatoo Valley'],
  ['ACT-CA', 'ACT-CA — Caring for those who care'],
  ['ACT-CF', 'ACT-CF — The Confessional'],
  ['ACT-CN', 'ACT-CN — Contained'],
  ['ACT-DG', 'ACT-DG — Diagrama'],
  ['ACT-DL', 'ACT-DL — DadLab'],
  ['ACT-DO', 'ACT-DO — Designing for Obsolescence'],
  ['ACT-FA', 'ACT-FA — Festival Activations'],
  ['ACT-FO', 'ACT-FO — Fishers Oysters'],
  ['ACT-FP', 'ACT-FP — Fairfax PLACE Tech'],
  ['ACT-GL', 'ACT-GL — Global Laundry Alliance'],
  ['ACT-GP', 'ACT-GP — Gold Phone'],
  ['ACT-HS', 'ACT-HS — Project Her-Self'],
  ['ACT-MC', 'ACT-MC — Cars and Microcontrollers'],
  ['ACT-MD', 'ACT-MD — ACT Monthly Dinners'],
  ['ACT-MM', 'ACT-MM — MMEIC Justice'],
  ['ACT-MR', 'ACT-MR — MingaMinga Rangers'],
  ['ACT-RA', 'ACT-RA — Regional Arts Fellowship'],
  ['ACT-SM', 'ACT-SM — SMART'],
  ['ACT-SS', 'ACT-SS — Storm Stories'],
]
const CATEGORIES = ['Software & Subscriptions','Travel','Accommodation','Meals & Entertainment','Fuel','Hardware & Equipment','Telecommunications','Professional Services','Insurance','Contractor','Printing','Storage','Rent','Other']
// Common Xero account codes with names — add more via Xero → Accounting → Chart of accounts
const ACCOUNT_CODES: Array<[string, string]> = [
  ['400', '400 — Professional Services'],
  ['421', '421 — Light meals & refreshments'],
  ['425', '425 — Printing'],
  ['429', '429 — General Expenses'],
  ['433', '433 — Insurance'],
  ['446', '446 — Equipment'],
  ['449', '449 — Fuel'],
  ['452', '452 — Storage / General'],
  ['469', '469 — Rent'],
  ['485', '485 — Subscriptions'],
  ['489', '489 — Telecoms'],
  ['493', '493 — Travel'],
]
const TAX_TYPES = ['INPUT','BASEXCLUDED','GSTFREEEXPENSES','EXEMPTEXPENSES','NONE']
const CURRENCIES = ['AUD','USD','EUR','GBP','NZD','SGD']

export default function VendorRulesSuggestPage() {
  const [rows, setRows] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/vendor-rules-suggest')
      const data = await res.json()
      setRows((data.suggestions || []).map((s: Suggestion) => ({ ...s, _include: true })))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRows() }, [fetchRows])

  const update = (i: number, field: keyof Suggestion, value: any) => {
    setRows((rs) => {
      const next = [...rs]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  const saveSelected = async () => {
    const toSave = rows.filter((r) => r._include)
    if (toSave.length === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/finance/vendor-rules-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: toSave }),
      })
      const data = await res.json()
      if (data.error) alert(`Failed: ${data.error}`)
      else {
        setSavedCount((c) => c + (data.inserted || 0))
        setRows((rs) => rs.filter((r) => !r._include))
      }
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = rows.filter((r) => r._include).length
  const totalValue = rows.filter((r) => r._include).reduce((s, r) => s + (r.total_amount || 0), 0)

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 1800, margin: '0 auto', background: 'white', color: '#111', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Vendor rule suggestions</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Vendors without rules, with inferred defaults. Edit any field, untick to skip. Click <b>Save selected</b>
        to bulk-insert into <code>vendor_project_rules</code>. Saved rules immediately improve push-receipts-to-xero coding.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <button onClick={fetchRows} disabled={loading} style={btnStyle('#f3f4f6', '#111')}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <button onClick={saveSelected} disabled={saving || selectedCount === 0} style={{ ...btnStyle('#2563eb', 'white'), opacity: selectedCount === 0 ? 0.5 : 1 }}>
          {saving ? 'Saving…' : `Save ${selectedCount} selected rules`}
        </button>
        <span style={{ color: '#666', fontSize: 14 }}>
          {selectedCount}/{rows.length} selected · ${totalValue.toFixed(0)} covered
          {savedCount > 0 ? ` · ${savedCount} saved this session` : ''}
        </span>
      </div>

      {loading && <p>Loading…</p>}
      {!loading && rows.length === 0 && <p style={{ color: '#999' }}>No unknown vendors — all are covered by rules.</p>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f3f4f6', textAlign: 'left' }}>
            <tr>
              <th style={th}><input type="checkbox" checked={selectedCount === rows.length && rows.length > 0} onChange={(e) => setRows((rs) => rs.map((r) => ({ ...r, _include: e.target.checked })))} /></th>
              <th style={th}>Vendor</th>
              <th style={th}># / Total</th>
              <th style={th}>Date range</th>
              <th style={th}>Project</th>
              <th style={th}>Category</th>
              <th style={th}>Account</th>
              <th style={th}>Tax</th>
              <th style={th}>Currency</th>
              <th style={th}>R&D</th>
              <th style={th}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.vendor_name} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={td}><input type="checkbox" checked={r._include} onChange={(e) => update(i, '_include', e.target.checked)} /></td>
                <td style={{ ...td, fontWeight: 500 }}>
                  {r.vendor_name}
                  {r.sample_subjects.length > 0 && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{r.sample_subjects[0].slice(0, 60)}</div>
                  )}
                </td>
                <td style={td}>
                  <div>{r.receipt_count}× · ${r.total_amount.toFixed(0)}</div>
                </td>
                <td style={{ ...td, fontSize: 11, color: '#555', whiteSpace: 'nowrap' as const }}>
                  {r.first_seen && r.last_seen && r.first_seen !== r.last_seen ? (
                    <>
                      <div>{r.first_seen}</div>
                      <div>→ {r.last_seen}</div>
                    </>
                  ) : (
                    <div>{r.first_seen || '—'}</div>
                  )}
                </td>
                <td style={td}>
                  <select value={r.project_code} onChange={(e) => update(i, 'project_code', e.target.value)} style={{ ...sel, minWidth: 220 }}>
                    {PROJECT_CODES.map(([c, label]) => <option key={c} value={c}>{label}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <select value={r.category} onChange={(e) => update(i, 'category', e.target.value)} style={sel}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <select value={r.xero_account_code} onChange={(e) => update(i, 'xero_account_code', e.target.value)} style={{ ...sel, minWidth: 180 }}>
                    {ACCOUNT_CODES.map(([c, label]) => <option key={c} value={c}>{label}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <select value={r.xero_tax_type} onChange={(e) => update(i, 'xero_tax_type', e.target.value)} style={sel}>
                    {TAX_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <select value={r.xero_currency} onChange={(e) => update(i, 'xero_currency', e.target.value)} style={{ ...sel, width: 70 }}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td style={td}><input type="checkbox" checked={r.rd_eligible} onChange={(e) => update(i, 'rd_eligible', e.target.checked)} /></td>
                <td style={{ ...td, fontSize: 11, color: '#666', maxWidth: 250 }}>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const btnStyle = (bg: string, fg: string) => ({ padding: '8px 16px', background: bg, color: fg, border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 })
const th = { padding: '10px 8px', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' as const, color: '#555', background: '#f3f4f6' }
const td = { padding: '10px 8px', verticalAlign: 'top' as const, color: '#111' }
const sel: React.CSSProperties = { padding: '4px 6px', border: '1px solid #ccc', borderRadius: 4, fontSize: 12, width: '100%', maxWidth: 200, background: 'white', color: '#111', colorScheme: 'light' }
