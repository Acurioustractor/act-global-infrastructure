import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

type Row = {
  id: string
  xeroId: string
  source: 'bill' | 'spend' | 'spend-overpay' | 'receive'
  date: string
  contact: string
  total: number
  status: string
  projectCode: string | null
  projectSource: string | null
  description: string
  hasAttachments: boolean
  xeroLink: string
  note: string
  bankAccount: string | null
}

// The two real ACT business accounts. Everything else (NM Personal, Maximiser, etc)
// should be treated as out-of-scope for ACT project totals.
const ACT_ACCOUNTS = ['NAB Visa ACT #8815', 'NJ Marchesi T/as ACT Everyday']

function firstDescr(li: any[] | null | undefined): string {
  if (!Array.isArray(li) || !li.length) return ''
  for (const x of li) if (x?._ocr?.summary) return `[OCR] ${x._ocr.summary}`
  return li.map((x) => x?.description || x?.Description || '').filter(Boolean).join(' | ')
}

function firstNote(li: any[] | null | undefined): string {
  if (!Array.isArray(li) || !li.length) return ''
  for (const x of li) if (x?._note?.text) return x._note.text as string
  return ''
}

// PostgREST caps each response at 1000 rows even with .range(0, 4999) — so loop
// 1000-row pages until exhausted (or the cap). `build` must return a FRESH query
// each call (filters applied, no range) so pages don't collide.
async function fetchAllPaged<T>(build: () => any, cap: number): Promise<T[]> {
  const PAGE = 1000
  let all: T[] = []
  for (let from = 0; from < cap; from += PAGE) {
    const to = Math.min(from + PAGE - 1, cap - 1)
    const { data, error } = await build().range(from, to)
    if (error) throw new Error(error.message)
    const batch = (data || []) as T[]
    all = all.concat(batch)
    if (batch.length < PAGE) break
  }
  return all
}

export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams
    const project = sp.get('project') // optional, '' or 'UNTAGGED' for null, 'all' or absent for all
    const since = sp.get('since') || '2024-07-01'
    const until = sp.get('until') || null
    const limit = Math.min(parseInt(sp.get('limit') || '5000', 10), 10000)
    // Bank-account filter: 'act-only' (default — only the two real ACT accounts),
    // 'all' (every account incl. NM Personal), or a specific account name.
    // Bills (xero_invoices) have no bank_account until paid, so this filter only applies to spends.
    const accountsParam = (sp.get('accounts') || 'act-only').toLowerCase()

    // Bills — fresh builder per page (paginated past PostgREST's 1000 cap)
    const buildBills = () => {
      let q = supabase
        .from('xero_invoices')
        .select('id, xero_id, date, contact_name, total, status, project_code, project_code_source, line_items, has_attachments')
        .eq('type', 'ACCPAY')
        .in('status', ['AUTHORISED', 'PAID'])
        .gte('date', since)
        .order('date', { ascending: false })
      if (until) q = q.lte('date', until)
      if (project === 'UNTAGGED') q = q.is('project_code', null)
      else if (project && project !== 'all') q = q.eq('project_code', project)
      return q
    }

    // Bank txns — fresh builder per page
    const buildSpends = () => {
      let q = supabase
        .from('xero_transactions')
        .select('id, xero_transaction_id, date, contact_name, total, status, type, project_code, project_code_source, line_items, has_attachments, bank_account')
        .in('type', ['SPEND', 'SPEND-OVERPAYMENT', 'RECEIVE'])
        .gte('date', since)
        .order('date', { ascending: false })
      if (until) q = q.lte('date', until)
      if (project === 'UNTAGGED') q = q.is('project_code', null)
      else if (project && project !== 'all') q = q.eq('project_code', project)
      if (accountsParam === 'act-only') q = q.in('bank_account', ACT_ACCOUNTS)
      else if (accountsParam !== 'all') q = q.eq('bank_account', accountsParam)
      return q
    }

    const [billsData, spendsData, projRes, projectsMetaRes] = await Promise.all([
      fetchAllPaged<any>(buildBills, limit),
      fetchAllPaged<any>(buildSpends, limit),
      // Distinct project codes for filter dropdown
      supabase.rpc('exec_sql', {
        query: `
          SELECT project_code, COUNT(*) AS n
          FROM (
            SELECT project_code FROM xero_transactions
            UNION ALL SELECT project_code FROM xero_invoices WHERE type='ACCPAY'
          ) u
          GROUP BY project_code
          ORDER BY n DESC
        `,
      }),
      // Canonical project names from the `projects` table (code → name/status/tier).
      // Used to render human-readable labels in the page dropdowns.
      supabase.from('projects').select('code, name, status, tier'),
    ])

    const rows: Row[] = []
    for (const b of billsData) {
      rows.push({
        id: b.id as string,
        xeroId: b.xero_id as string,
        source: 'bill',
        date: b.date as string,
        contact: (b.contact_name as string) || '',
        total: Number(b.total),
        status: b.status as string,
        projectCode: (b.project_code as string) || null,
        projectSource: (b.project_code_source as string) || null,
        description: firstDescr(b.line_items as any[]),
        hasAttachments: !!b.has_attachments,
        xeroLink: `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${b.xero_id}`,
        note: firstNote(b.line_items as any[]),
        bankAccount: null, // bills don't have a bank account until paid
      })
    }
    for (const s of spendsData) {
      const src: Row['source'] = s.type === 'SPEND' ? 'spend' : s.type === 'SPEND-OVERPAYMENT' ? 'spend-overpay' : 'receive'
      rows.push({
        id: s.id as string,
        xeroId: s.xero_transaction_id as string,
        source: src,
        date: s.date as string,
        contact: (s.contact_name as string) || '',
        total: Number(s.total),
        status: s.status as string,
        projectCode: (s.project_code as string) || null,
        projectSource: (s.project_code_source as string) || null,
        description: firstDescr(s.line_items as any[]),
        hasAttachments: !!s.has_attachments,
        xeroLink: `https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=${s.xero_transaction_id}`,
        note: firstNote(s.line_items as any[]),
        bankAccount: (s.bank_account as string) || null,
      })
    }
    rows.sort((a, b) => b.date.localeCompare(a.date) || a.contact.localeCompare(b.contact))

    const nameByCode = new Map<string, { name: string; status: string | null; tier: string | null }>()
    for (const p of projectsMetaRes?.data || []) {
      if (p?.code) nameByCode.set(p.code as string, {
        name: (p.name as string) || (p.code as string),
        status: (p.status as string) || null,
        tier: (p.tier as string) || null,
      })
    }
    const projects = (projRes?.data || []).map((p: any) => {
      const meta = p.project_code ? nameByCode.get(p.project_code) : null
      return {
        code: p.project_code as string | null,
        name: meta?.name || null,
        status: meta?.status || null,
        tier: meta?.tier || null,
        count: Number(p.n),
      }
    })

    // Surface bank-account options for the page dropdown
    const accountSet = new Set<string>()
    for (const r of rows) if (r.bankAccount) accountSet.add(r.bankAccount)
    const allAccounts = [...accountSet].sort()

    return NextResponse.json({
      count: rows.length,
      rows,
      projects,
      accounts: allAccounts,
      actAccounts: ACT_ACCOUNTS,
      activeAccountFilter: accountsParam,
    })
  } catch (e: any) {
    console.error('finance/transactions error', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

// Inline re-tag: change project_code on a single row (by Supabase row id + source)
// Or bulk re-tag: pass items: [{ id, source }] + projectCode
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const projectCode = (body.projectCode ?? null) as string | null
    const items = (body.items as Array<{ id: string; source: string }> | undefined) ??
      (body.id && body.source ? [{ id: body.id, source: body.source }] : [])
    if (!items.length) return NextResponse.json({ error: 'items[] or {id,source} required' }, { status: 400 })

    const billIds = items.filter((i) => i.source === 'bill').map((i) => i.id)
    const spendIds = items.filter((i) => i.source !== 'bill').map((i) => i.id)
    const update = projectCode
      ? { project_code: projectCode, project_code_source: 'manual' }
      : { project_code: null, project_code_source: 'manual' }

    let updatedInv = 0
    let updatedTxn = 0
    if (billIds.length) {
      const { data, error } = await supabase.from('xero_invoices').update(update).in('id', billIds).select('id')
      if (error) return NextResponse.json({ error: `invoices: ${error.message}` }, { status: 500 })
      updatedInv = data?.length || 0
    }
    if (spendIds.length) {
      const { data, error } = await supabase.from('xero_transactions').update(update).in('id', spendIds).select('id')
      if (error) return NextResponse.json({ error: `txns: ${error.message}` }, { status: 500 })
      updatedTxn = data?.length || 0
    }

    return NextResponse.json({ ok: true, updatedInvoices: updatedInv, updatedTransactions: updatedTxn, total: updatedInv + updatedTxn })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
