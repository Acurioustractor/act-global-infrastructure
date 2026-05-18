import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const ACT_ACCOUNTS = ['NAB Visa ACT #8815', 'NJ Marchesi T/as ACT Everyday']

type Severity = 'high' | 'medium' | 'info'
type AuditAlert = {
  severity: Severity
  title: string
  detail: string
  amount?: number
  projectCode?: string | null
  xeroLink?: string
}

function firstDescr(li: any[] | null | undefined): string {
  if (!Array.isArray(li) || !li.length) return ''
  for (const x of li) if (x?._ocr?.summary) return x._ocr.summary as string
  return li.map((x) => x?.description || x?.Description || '').filter(Boolean).join(' | ')
}

export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams
    const accountsParam = (sp.get('accounts') || 'act-only').toLowerCase()
    const since = sp.get('since') || '2025-07-01'

    // Pull all bills + all spends (paginated past 1000)
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
      .select('id, xero_id, date, contact_name, total, status, line_items, project_code, project_code_source')
      .eq('type', 'ACCPAY')
      .in('status', ['AUTHORISED', 'PAID'])
      .gte('date', since)
      .order('date', { ascending: false })
    let spendsQ = supabase
      .from('xero_transactions')
      .select('id, xero_transaction_id, date, contact_name, total, status, type, line_items, project_code, project_code_source, bank_account, has_attachments')
      .in('type', ['SPEND', 'SPEND-OVERPAYMENT'])
      .gte('date', since)
      .order('date', { ascending: false })
    if (accountsParam === 'act-only') spendsQ = spendsQ.in('bank_account', ACT_ACCOUNTS)
    else if (accountsParam !== 'all') spendsQ = spendsQ.eq('bank_account', accountsParam)

    const [bills, spends, projectsMetaRes] = await Promise.all([
      fetchAll(billsQ),
      fetchAll(spendsQ),
      supabase.from('projects').select('code, name, status, tier'),
    ])
    const projectMeta = new Map<string, { name: string; status: string | null; tier: string | null }>()
    for (const p of projectsMetaRes?.data || []) {
      if (p?.code) projectMeta.set(p.code as string, {
        name: (p.name as string) || (p.code as string),
        status: (p.status as string) || null,
        tier: (p.tier as string) || null,
      })
    }

    // Dedupe bank-payment-of-bill
    const paidBills = bills.filter((b: any) => b.status === 'PAID')
    const matched = new Set<string>()
    for (const s of spends) {
      const sd = new Date(s.date as string).getTime()
      if (paidBills.some((b: any) =>
        (b.contact_name || '').trim().toUpperCase() === (s.contact_name || '').trim().toUpperCase() &&
        Number(b.total) === Number(s.total) &&
        Math.abs((new Date(b.date as string).getTime() - sd) / 86400000) <= 14
      )) matched.add(s.xero_transaction_id as string)
    }

    const expenseRows = [
      ...bills.map((b: any) => ({ source: 'bill' as const, id: b.id, xeroId: b.xero_id, date: b.date, contact: b.contact_name, total: Number(b.total), status: b.status, projectCode: b.project_code as string | null, line_items: b.line_items, bankAccount: null as string | null })),
      ...spends.filter((s: any) => !matched.has(s.xero_transaction_id)).map((s: any) => ({
        source: s.type === 'SPEND' ? 'spend' as const : 'spend-overpay' as const,
        id: s.id, xeroId: s.xero_transaction_id, date: s.date, contact: s.contact_name, total: Number(s.total), status: s.status,
        projectCode: s.project_code as string | null,
        line_items: s.line_items,
        bankAccount: s.bank_account as string | null,
      })),
    ]

    const totalSpend = expenseRows.reduce((a, r) => a + r.total, 0)

    // Stats by project (plus last activity for project-review panel)
    const byProject = new Map<string, { count: number; sum: number; lastActivity: string | null }>()
    const bySource = new Map<string, { count: number; sum: number }>()
    const byBank = new Map<string, { count: number; sum: number }>()
    for (const r of expenseRows) {
      const p = r.projectCode || 'UNTAGGED'
      const pp = byProject.get(p) || { count: 0, sum: 0, lastActivity: null }
      pp.count += 1; pp.sum += r.total
      if (!pp.lastActivity || (r.date as string) > pp.lastActivity) pp.lastActivity = r.date as string
      byProject.set(p, pp)
      const ss = bySource.get(r.source) || { count: 0, sum: 0 }
      ss.count += 1; ss.sum += r.total; bySource.set(r.source, ss)
      const ba = r.bankAccount || '(bill — no account)'
      const bb = byBank.get(ba) || { count: 0, sum: 0 }
      bb.count += 1; bb.sum += r.total; byBank.set(ba, bb)
    }

    // Top vendors
    const vendorSpend = new Map<string, { contact: string; total: number; count: number }>()
    for (const r of expenseRows) {
      const v = vendorSpend.get(r.contact) || { contact: r.contact, total: 0, count: 0 }
      v.total += r.total; v.count += 1; vendorSpend.set(r.contact, v)
    }

    // ---- AUDIT ALERTS (project-agnostic detection) ----
    const auditAlerts: AuditAlert[] = []

    // Same-day same-vendor same-amount duplicates per project
    const dupKey = new Map<string, typeof expenseRows>()
    for (const r of expenseRows) {
      const key = `${r.projectCode || 'UNTAGGED'}|${r.contact}|${r.total.toFixed(2)}|${r.date}`
      const arr = dupKey.get(key) || []; arr.push(r); dupKey.set(key, arr)
    }
    for (const [, dupRows] of dupKey.entries()) {
      if (dupRows.length > 1 && dupRows[0].total > 100) {
        auditAlerts.push({
          severity: 'high',
          title: `${dupRows.length}× duplicate ${dupRows[0].contact} ${dupRows[0].date}`,
          detail: `Same vendor + amount + date appears ${dupRows.length} times on ${dupRows[0].projectCode || 'UNTAGGED'} — likely double-billing or quote+invoice.`,
          amount: dupRows[0].total * (dupRows.length - 1),
          projectCode: dupRows[0].projectCode,
          xeroLink: dupRows[0].source === 'bill'
            ? `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${dupRows[0].xeroId}`
            : `https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=${dupRows[0].xeroId}`,
        })
      }
    }

    // Bunnings rows with line desc mentioning a DIFFERENT project than project_code
    for (const r of expenseRows) {
      if (!r.projectCode) continue
      const desc = firstDescr(r.line_items as any[])
      const match = /—\s*(ACT-[A-Z]{2,4})\b/i.exec(desc)
      if (match && match[1].toUpperCase() !== r.projectCode.toUpperCase()) {
        auditAlerts.push({
          severity: 'medium',
          title: `⚠ Project mismatch: ${r.contact} tagged ${r.projectCode} but line desc says ${match[1]}`,
          detail: `Date ${r.date}, $${r.total.toFixed(2)}. Dext auto-tag mismatch — verify which is correct.`,
          amount: r.total,
          projectCode: r.projectCode,
          xeroLink: r.source === 'bill'
            ? `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${r.xeroId}`
            : `https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=${r.xeroId}`,
        })
      }
    }

    // Known cross-project findings (extend as audit accrues)
    const notableFindings: AuditAlert[] = []
    // St Mary's Cathedral discovery
    if (expenseRows.some((r) => r.xeroId === '9ae29a04-f83b-48d1-a158-22565e2bd0cc' || r.xeroId === 'e8ab116e-7920-40fc-92ce-0ffbd2ea09d0')) {
      notableFindings.push({
        severity: 'info',
        title: '★ St Mary\'s Cathedral decking — 12.5t @ $700 = $8,750 (ACT-HV)',
        detail: 'Discovered via OCR. Embedded across Kennedy\'s 2026-04-24 ($7,000 / 10t) and 2026-05-07 ($1,750 / 2.5t).',
        amount: 8750,
        projectCode: 'ACT-HV',
      })
    }

    // OCR-surfaced rows (any project)
    const ocrFindings: { date: string; contact: string; summary: string; projectCode: string | null; xeroLink: string }[] = []
    for (const r of expenseRows) {
      const li = Array.isArray(r.line_items) ? (r.line_items as any[]) : []
      for (const item of li) {
        if (item?._ocr?.summary) {
          ocrFindings.push({
            date: r.date as string,
            contact: r.contact,
            summary: item._ocr.summary,
            projectCode: r.projectCode,
            xeroLink: r.source === 'bill'
              ? `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${r.xeroId}`
              : `https://go.xero.com/Bank/ViewTransaction.aspx?bankTransactionID=${r.xeroId}`,
          })
          break
        }
      }
    }

    // RNM Carpentry across any project (Ben flagged not-Harvest, but RNM tagged elsewhere also worth noting)
    const rnmRows = expenseRows.filter((r) => r.contact.toUpperCase().startsWith('RNM CARPENTRY'))
    if (rnmRows.length > 0) {
      const rnmSum = rnmRows.reduce((a, r) => a + r.total, 0)
      const projs = [...new Set(rnmRows.map(r => r.projectCode || 'UNTAGGED'))].join(', ')
      auditAlerts.push({
        severity: 'high',
        title: `⚠ RNM Carpentry — $${rnmSum.toFixed(2)} (flagged not Harvest)`,
        detail: `Currently tagged: ${projs}. Per user direction, RNM Carpentry shouldn't sit under ACT-HV. Review project assignments.`,
        amount: rnmSum,
      })
    }

    // Bills AUTHORISED but not PAID (commitments still open)
    const openBills = bills.filter((b: any) => b.status === 'AUTHORISED')
    const openSum = openBills.reduce((a: number, b: any) => a + Number(b.total), 0)
    auditAlerts.push({
      severity: 'info',
      title: `${openBills.length} bills AUTHORISED but unpaid — $${openSum.toFixed(2)}`,
      detail: 'Commitments still outstanding. Worth reviewing if any should be voided or whether cashflow can clear them.',
      amount: openSum,
    })

    // Sort alerts by severity then amount
    const sevRank = { high: 0, medium: 1, info: 2 }
    auditAlerts.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || (b.amount || 0) - (a.amount || 0))

    // Project review — every code seen in spend PLUS every canonical project, with archive recommendations.
    type ReviewRow = {
      code: string
      name: string | null
      status: string | null
      tier: string | null
      count: number
      sum: number
      lastActivity: string | null
      activityDaysAgo: number | null
      recommendation: 'keep' | 'review' | 'archive-candidate' | 'unknown-code'
      reason: string
    }
    const todayMs = Date.now()
    const seenCodes = new Set<string>([...byProject.keys()].filter(c => c !== 'UNTAGGED'))
    for (const c of projectMeta.keys()) seenCodes.add(c)
    const projectReview: ReviewRow[] = []
    for (const code of seenCodes) {
      const meta = projectMeta.get(code)
      const stats = byProject.get(code) || { count: 0, sum: 0, lastActivity: null }
      const daysAgo = stats.lastActivity ? Math.floor((todayMs - new Date(stats.lastActivity).getTime()) / 86400000) : null
      let rec: ReviewRow['recommendation'] = 'review'
      let reason = ''
      if (!meta) {
        rec = 'unknown-code'
        reason = 'Code seen in Xero but not in projects table — likely typo or stale tracking option.'
      } else if (meta.status === 'archived' || meta.status === 'transferred' || meta.status === 'sunsetting') {
        if (stats.count === 0) {
          rec = 'archive-candidate'
          reason = `Status=${meta.status}, zero spend since ${since}. Safe to archive in Xero tracking.`
        } else if (daysAgo !== null && daysAgo > 365) {
          rec = 'archive-candidate'
          reason = `Status=${meta.status}, last activity ${daysAgo}d ago. Safe to archive.`
        } else {
          rec = 'review'
          reason = `Status=${meta.status} but still has recent spend (${stats.count} rows / last ${daysAgo}d ago).`
        }
      } else if (meta.status === 'active' && stats.count === 0) {
        rec = 'review'
        reason = `Status=active but zero spend since ${since}. Consider whether it's truly active.`
      } else if (meta.status === 'active' && daysAgo !== null && daysAgo > 365) {
        rec = 'review'
        reason = `Status=active but last activity ${daysAgo}d ago.`
      } else {
        rec = 'keep'
        reason = `Status=${meta.status || '?'}, ${stats.count} rows, last ${daysAgo ?? '∞'}d ago.`
      }
      projectReview.push({
        code,
        name: meta?.name || null,
        status: meta?.status || null,
        tier: meta?.tier || null,
        count: stats.count,
        sum: stats.sum,
        lastActivity: stats.lastActivity,
        activityDaysAgo: daysAgo,
        recommendation: rec,
        reason,
      })
    }
    projectReview.sort((a, b) => b.sum - a.sum || (b.count - a.count))

    const reviewCounts = {
      total: projectReview.length,
      keep: projectReview.filter(r => r.recommendation === 'keep').length,
      review: projectReview.filter(r => r.recommendation === 'review').length,
      archiveCandidate: projectReview.filter(r => r.recommendation === 'archive-candidate').length,
      unknownCode: projectReview.filter(r => r.recommendation === 'unknown-code').length,
    }

    return NextResponse.json({
      since,
      accountsParam,
      actAccounts: ACT_ACCOUNTS,
      totalSpend,
      rowCount: expenseRows.length,
      byProject: [...byProject.entries()].map(([code, s]) => {
        const m = projectMeta.get(code)
        return { code, name: m?.name || null, status: m?.status || null, tier: m?.tier || null, ...s }
      }).sort((a, b) => b.sum - a.sum),
      bySource: [...bySource.entries()].map(([source, s]) => ({ source, ...s })),
      byBank: [...byBank.entries()].map(([bank, s]) => ({ bank, ...s })).sort((a, b) => b.sum - a.sum),
      topVendors: [...vendorSpend.values()].sort((a, b) => b.total - a.total).slice(0, 25),
      auditAlerts: auditAlerts.slice(0, 50),
      notableFindings,
      ocrFindings: ocrFindings.slice(0, 30),
      projectReview,
      reviewCounts,
    })
  } catch (e: any) {
    console.error('finance/audit error', e)
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
