import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ACT_ACCOUNTS = ['NAB Visa ACT #8815', 'NJ Marchesi T/as ACT Everyday']

function firstDescr(li: any[] | null | undefined): string {
  if (!Array.isArray(li) || !li.length) return ''
  return li.map((x) => x?.description || x?.Description || '').filter(Boolean).join(' | ')
}

export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams
    const since = sp.get('since') || '2025-07-01'
    const accountsParam = (sp.get('accounts') || 'act-only').toLowerCase()

    async function fetchAll<T = any>(query: any): Promise<T[]> {
      const out: T[] = []
      let from = 0
      while (true) {
        const { data, error } = await query.range(from, from + 999)
        if (error) throw new Error(error.message)
        if (!data?.length) break
        out.push(...data)
        if (data.length < 1000) break
        from += 1000
      }
      return out
    }

    let billsQ = supabase
      .from('xero_invoices')
      .select('id, xero_id, date, contact_name, total, status, line_items, project_code, project_code_source, has_attachments')
      .eq('type', 'ACCPAY')
      .in('status', ['AUTHORISED', 'PAID'])
      .gte('date', since)

    let spendsQ = supabase
      .from('xero_transactions')
      .select('id, xero_transaction_id, date, contact_name, total, status, type, line_items, project_code, project_code_source, has_attachments, bank_account')
      .in('type', ['SPEND', 'SPEND-OVERPAYMENT'])
      .gte('date', since)
    if (accountsParam === 'act-only') spendsQ = spendsQ.in('bank_account', ACT_ACCOUNTS)
    else if (accountsParam !== 'all') spendsQ = spendsQ.eq('bank_account', accountsParam)

    const [bills, spends] = await Promise.all([fetchAll(billsQ), fetchAll(spendsQ)])

    // ----- Dedup: bill paid via bank produces a spend with same vendor+amount within ±30d -----
    // Widened from ±14d → ±30d (bills sometimes paid weeks late). Include both AUTHORISED + PAID
    // bills as matchable — the spend pays it regardless of bill status.
    const matchedSpendIds = new Set<string>()
    for (const s of spends) {
      const sd = new Date(s.date as string).getTime()
      const m = bills.find((b: any) =>
        (b.contact_name || '').trim().toUpperCase() === (s.contact_name || '').trim().toUpperCase() &&
        Number(b.total) === Number(s.total) &&
        Math.abs((new Date(b.date as string).getTime() - sd) / 86400000) <= 30
      )
      if (m) matchedSpendIds.add(s.xero_transaction_id as string)
    }
    const matchedPairs = matchedSpendIds.size
    const unmatchedSpends = spends.filter((s: any) => !matchedSpendIds.has(s.xero_transaction_id))

    // ----- Counts (deduped: each matched pair counted once via the bill side) -----
    const totalDeduped = bills.length + unmatchedSpends.length
    const taggedBills = bills.filter((b: any) => b.project_code).length
    const taggedSpends = unmatchedSpends.filter((s: any) => s.project_code).length
    const tagged = taggedBills + taggedSpends
    const untagged = totalDeduped - tagged
    const taggedPct = totalDeduped > 0 ? Math.round((tagged / totalDeduped) * 100) : 0

    // ----- Receipt coverage -----
    // A row is "receipted" if it has_attachments=true OR it's a spend whose matched bill has_attachments
    const billAttachmentByKey = new Map<string, boolean>()
    for (const b of bills) {
      const key = `${(b.contact_name || '').trim().toUpperCase()}|${Number(b.total).toFixed(2)}|${b.date}`
      if (b.has_attachments) billAttachmentByKey.set(key, true)
    }
    const billReceipted = bills.filter((b: any) => b.has_attachments).length
    const spendReceipted = unmatchedSpends.filter((s: any) => s.has_attachments).length
    const receipted = billReceipted + spendReceipted
    const receiptedPct = totalDeduped > 0 ? Math.round((receipted / totalDeduped) * 100) : 0

    // ----- Audit issue counts -----
    // Duplicates: same vendor+amount+date appearing twice on the same project
    const dupKey = new Map<string, number>()
    const allRows = [...bills, ...unmatchedSpends].map((r: any) => ({
      contact: (r.contact_name || '').trim().toUpperCase(),
      total: Number(r.total).toFixed(2),
      date: r.date,
      project: r.project_code || 'UNTAGGED',
    }))
    for (const r of allRows) {
      const key = `${r.project}|${r.contact}|${r.total}|${r.date}`
      dupKey.set(key, (dupKey.get(key) || 0) + 1)
    }
    let duplicates = 0
    for (const v of dupKey.values()) if (v > 1) duplicates += v - 1

    // Project mismatch: line desc says ACT-XX but project_code is ACT-YY
    // Skip manual overrides — `project_code_source LIKE 'manual%'` means user
    // deliberately overrode Dext's reading. Dext text is stale, tag is right.
    let mismatches = 0
    for (const r of [...bills, ...unmatchedSpends] as any[]) {
      if (!r.project_code) continue
      if (typeof r.project_code_source === 'string' && r.project_code_source.startsWith('manual')) continue
      const desc = firstDescr(r.line_items)
      const m = /—\s*(ACT-[A-Z]{2,4})\b/i.exec(desc)
      if (m && m[1].toUpperCase() !== r.project_code.toUpperCase()) mismatches += 1
    }

    // Totals
    const billsTotal = bills.reduce((a: number, b: any) => a + Number(b.total), 0)
    const unmatchedSpendsTotal = unmatchedSpends.reduce((a: number, s: any) => a + Number(s.total), 0)
    const grandTotal = billsTotal + unmatchedSpendsTotal

    return NextResponse.json({
      since,
      accountsParam,
      // Headline numbers
      spendsRaw: spends.length,
      billsCount: bills.length,
      matchedPairs,
      totalDeduped,
      // Tagging
      tagged,
      untagged,
      taggedPct,
      // Receipts
      receipted,
      unreceipted: totalDeduped - receipted,
      receiptedPct,
      // Audit
      duplicates,
      mismatches,
      // Money
      grandTotal: Math.round(grandTotal * 100) / 100,
      billsTotal: Math.round(billsTotal * 100) / 100,
      unmatchedSpendsTotal: Math.round(unmatchedSpendsTotal * 100) / 100,
    })
  } catch (e: any) {
    console.error('finance/transactions/reality error', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
