import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Close-the-books panel API (#4 fast-follow). Live counterpart of
// scripts/close-the-books.mjs — same 7-lens ready-to-close gate for a period.
// The cleanliness lens is INLINED here (the script shells out to
// detect-finance-anomalies.mjs via execSync, which can't run in a serverless
// route). Formulas are kept in sync with the script; the trust test is that
// this route's JSON matches `node scripts/close-the-books.mjs <period> --json`.

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const ACT = ['NAB Visa ACT #8815', 'NJ Marchesi T/as ACT Everyday']
const TH = {
  recon: { green: 98, amber: 90 },
  receipts: { green: 95, amber: 80, bigItem: 1000 },
  tagging: { green: 98, amber: 90 },
}

const abs = (n: unknown) => Math.abs(Number(n || 0))
const round1 = (n: number) => Math.round(n * 10) / 10
const round2 = (n: number) => Math.round(n * 100) / 100

// ---------- period parsing (AU FY = Jul–Jun) ----------
function lastDay(y: number, m: number) { return new Date(Date.UTC(y, m, 0)).getUTCDate() } // m 1-12
function currentFy(d: Date) { const y = d.getUTCFullYear(), mo = d.getUTCMonth() + 1; return (mo >= 7 ? y + 1 : y) - 2000 }
function quarterWindow(fy: number, q: number) {
  const sy = 2000 + fy - 1
  const map: Record<number, [number, number, number]> = { 1: [7, 9, sy], 2: [10, 12, sy], 3: [1, 3, sy + 1], 4: [4, 6, sy + 1] }
  const [m1, m2, yr] = map[q]
  const pad = (m: number) => String(m).padStart(2, '0')
  return { start: `${yr}-${pad(m1)}-01`, end: `${yr}-${pad(m2)}-${lastDay(yr, m2)}` }
}
function qMonths(q: number) { return ({ 1: 'Jul–Sep', 2: 'Oct–Dec', 3: 'Jan–Mar', 4: 'Apr–Jun' } as Record<number, string>)[q] }
function monthName(y: number, mo: number) { return new Date(Date.UTC(y, mo - 1, 1)).toLocaleString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }
function lastCompletedMonth() { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` }

interface Period { kind: 'month' | 'quarter' | 'fy'; label: string; human: string; start: string; end: string; q?: number }
function parsePeriod(arg: string): Period {
  let m
  if ((m = arg.match(/^(\d{4})-(\d{2})$/))) {
    const y = +m[1], mo = +m[2]
    if (mo < 1 || mo > 12) throw new Error(`Bad month "${arg}"`)
    return { kind: 'month', label: `${y}-${m[2]}`, human: monthName(y, mo), start: `${y}-${m[2]}-01`, end: `${y}-${m[2]}-${String(lastDay(y, mo)).padStart(2, '0')}` }
  }
  if ((m = arg.match(/^FY(\d{2})$/i))) {
    const fy = +m[1], sy = 2000 + fy - 1
    return { kind: 'fy', label: `FY${m[1]}`, human: `FY${m[1]} (Jul ${sy} – Jun ${sy + 1})`, start: `${sy}-07-01`, end: `${sy + 1}-06-30` }
  }
  if ((m = arg.match(/^(?:FY(\d{2})-)?Q([1-4])$/i))) {
    const fy = m[1] ? +m[1] : currentFy(new Date())
    const q = +m[2]
    const w = quarterWindow(fy, q)
    return { kind: 'quarter', label: `FY${String(fy).padStart(2, '0')}-Q${q}`, human: `FY${String(fy).padStart(2, '0')}-Q${q} (${qMonths(q)})`, q, ...w }
  }
  throw new Error(`Unrecognised period "${arg}". Use YYYY-MM, Q3, FY26-Q3, or FY26.`)
}

// ---------- data ----------
type Row = Record<string, unknown>
async function fetchAll(table: string, cols: string, build: (q: any) => any): Promise<Row[]> {
  const PAGE = 1000
  let all: Row[] = []
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select(cols)
    q = build(q).range(from, from + PAGE - 1)
    const { data, error } = await q
    if (error) throw new Error(`fetch ${table}: ${error.message}`)
    all = all.concat((data || []) as unknown as Row[])
    if (!data || data.length < PAGE) break
  }
  return all
}
function lineItems(r: Row): Row[] { const li = (r as any).line_items; return Array.isArray(li) ? li : [] }
function gstFor(r: Row, taxTypes: Set<string>) {
  return lineItems(r).reduce((s, li) => taxTypes.has((li as any).tax_type) ? s + abs((li as any).line_amount) / 11 : s, 0)
}
const norm = (s: unknown) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const daysBetween = (a: string, b: string) => Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000)
function classifyDup(auth: Row, paid: Row): 'near-certain' | 'likely' | 'review' {
  const an = String((auth as any).invoice_number || '').trim()
  const pn = String((paid as any).invoice_number || '').trim()
  if (an && pn && an === pn) return 'near-certain'
  if (!an && !(auth as any).has_attachments) return 'near-certain'
  if (!an) return 'likely'
  return 'review'
}

export async function GET(request: NextRequest) {
  try {
    const explicit = request.nextUrl.searchParams.get('period')
    const P = parsePeriod(explicit || lastCompletedMonth())
    const inWin = (d: string) => d >= P.start && d <= P.end

    const [bills, sales, txns, allBills] = await Promise.all([
      fetchAll('xero_invoices', 'xero_id,invoice_number,contact_name,total,date,status,has_attachments,line_items,project_code',
        (q) => q.eq('type', 'ACCPAY').in('status', ['AUTHORISED', 'PAID']).gte('date', P.start).lte('date', P.end)),
      fetchAll('xero_invoices', 'xero_id,contact_name,total,date,status,line_items,project_code',
        (q) => q.eq('type', 'ACCREC').in('status', ['AUTHORISED', 'PAID']).gte('date', P.start).lte('date', P.end)),
      fetchAll('xero_transactions', 'xero_transaction_id,contact_name,total,date,type,status,is_reconciled,has_attachments,line_items,project_code,rd_eligible,rd_category,bank_account',
        (q) => q.in('bank_account', ACT).not('status', 'in', '(VOIDED,DELETED)').gte('date', P.start).lte('date', P.end)),
      // all-time ACCPAY for void-candidate matching (PAID twins may sit outside the window)
      fetchAll('xero_invoices', 'xero_id,invoice_number,contact_name,total,date,status,has_attachments',
        (q) => q.eq('type', 'ACCPAY').in('status', ['AUTHORISED', 'PAID']).gte('date', '2024-07-01')),
    ])
    const spends = txns.filter((t) => (t as any).type === 'SPEND' || (t as any).type === 'SPEND-OVERPAYMENT')

    // 1. Reconciliation
    const reconDone = txns.filter((t) => (t as any).is_reconciled).length
    const reconPct = txns.length ? (reconDone / txns.length) * 100 : 100

    // 2. Receipt coverage
    const recItems = [
      ...bills.map((b) => ({ amt: abs((b as any).total), has: !!(b as any).has_attachments, vendor: (b as any).contact_name as string, kind: 'bill' })),
      ...spends.map((t) => ({ amt: abs((t as any).total), has: !!(t as any).has_attachments, vendor: (t as any).contact_name as string, kind: 'spend' })),
    ]
    const recTotal = recItems.reduce((s, i) => s + i.amt, 0)
    const noReceipt = recItems.filter((i) => !i.has)
    const gap = noReceipt.reduce((s, i) => s + i.amt, 0)
    const covPct = recTotal ? (1 - gap / recTotal) * 100 : 100
    const bigUnreceipted = noReceipt.filter((i) => i.amt > TH.receipts.bigItem).sort((a, b) => b.amt - a.amt)

    // 3. Tagging
    const taggable = [...bills, ...spends]
    const tagTotal = taggable.reduce((s, i) => s + abs((i as any).total), 0)
    const untaggedItems = taggable.filter((i) => !(i as any).project_code)
    const untag = untaggedItems.reduce((s, i) => s + abs((i as any).total), 0)
    const tagPct = tagTotal ? (1 - untag / tagTotal) * 100 : 100

    // 4. Cleanliness (inlined detector, period-scoped)
    const byVendorAmt = new Map<string, Row[]>()
    for (const b of allBills) {
      const k = `${norm((b as any).contact_name)}|${abs((b as any).total).toFixed(2)}`
      if (!byVendorAmt.has(k)) byVendorAmt.set(k, [])
      byVendorAmt.get(k)!.push(b)
    }
    const voidInWin: Array<{ vendor: string; amount: number; date: string; confidence: string }> = []
    for (const group of byVendorAmt.values()) {
      if (abs((group[0] as any).total) <= 50) continue
      const paid = group.filter((b) => (b as any).status === 'PAID')
      const auth = group.filter((b) => (b as any).status === 'AUTHORISED')
      if (!paid.length || !auth.length) continue
      for (const a of auth) {
        const near = paid.find((p) => daysBetween((p as any).date, (a as any).date) <= 60)
        if (!near) continue
        const date = (a as any).date as string
        if (!inWin(date)) continue
        voidInWin.push({ vendor: (a as any).contact_name as string, amount: abs((a as any).total), date, confidence: classifyDup(a, near) })
      }
    }
    const byExact = new Map<string, Row[]>()
    for (const b of bills) {
      if (abs((b as any).total) <= 50) continue
      const k = `${norm((b as any).contact_name)}|${abs((b as any).total).toFixed(2)}|${(b as any).date}`
      if (!byExact.has(k)) byExact.set(k, [])
      byExact.get(k)!.push(b)
    }
    const dupInWin = [...byExact.values()].filter((g) => g.length > 1).map((g) => ({ vendor: (g[0] as any).contact_name as string, amount: abs((g[0] as any).total), date: (g[0] as any).date as string, count: g.length }))
    const gePeriod = bills.filter((b) => lineItems(b).some((li) => String((li as any).account_code) === '429'))
    const ge = gePeriod.reduce((s, b) => s + lineItems(b).filter((li) => String((li as any).account_code) === '429').reduce((a, li) => a + abs((li as any).line_amount), 0), 0)
    const voidConfirmed = voidInWin.filter((v) => v.confidence !== 'review')

    // 5. P&L (honest split — no double-count)
    const proj = new Map<string, { sales: number; spend: number; bills: number }>()
    const addP = (code: unknown, field: 'sales' | 'spend' | 'bills', amt: number) => { const k = (code as string) || '(untagged)'; const r = proj.get(k) || { sales: 0, spend: 0, bills: 0 }; r[field] += amt; proj.set(k, r) }
    for (const s of sales) addP((s as any).project_code, 'sales', abs((s as any).total))
    for (const t of spends) addP((t as any).project_code, 'spend', abs((t as any).total))
    for (const b of bills) addP((b as any).project_code, 'bills', abs((b as any).total))
    const salesTotal = sales.reduce((s, r) => s + abs((r as any).total), 0)
    const spendTotal = spends.reduce((s, r) => s + abs((r as any).total), 0)
    const billsTotal = bills.reduce((s, r) => s + abs((r as any).total), 0)

    // 6. BAS (indicative, accruals) — quarter/FY only
    const showBas = P.kind !== 'month'
    const gst1A = sales.reduce((s, inv) => s + gstFor(inv, new Set(['OUTPUT'])), 0)
    const gst1B = bills.reduce((s, b) => s + gstFor(b, new Set(['INPUT', 'CAPEXINPUT'])), 0)

    // 7. R&D-eligible
    const rdClassified = txns.filter((t) => (t as any).rd_eligible !== null && (t as any).rd_eligible !== undefined).length
    const rdItems = txns.filter((t) => (t as any).rd_eligible === true)
    const rdByCat: Record<string, number> = { core: 0, supporting: 0, review: 0 }
    for (const t of rdItems) { const c = ((t as any).rd_category as string) || 'review'; rdByCat[c] = (rdByCat[c] || 0) + abs((t as any).total) }
    const rdTotal = rdItems.reduce((s, t) => s + abs((t as any).total), 0)
    const rdReceipted = rdItems.filter((t) => (t as any).has_attachments).reduce((s, t) => s + abs((t as any).total), 0)
    const rdRecPct = rdTotal ? (rdReceipted / rdTotal) * 100 : 100

    // ---------- gate ----------
    const reconBand = reconPct >= TH.recon.green ? 'green' : reconPct >= TH.recon.amber ? 'amber' : 'red'
    const recBand = bigUnreceipted.length ? (covPct < TH.receipts.amber ? 'red' : 'amber') : (covPct >= TH.receipts.green ? 'green' : covPct >= TH.receipts.amber ? 'amber' : 'red')
    const tagBand = tagPct >= TH.tagging.green ? 'green' : tagPct >= TH.tagging.amber ? 'amber' : 'red'
    const cleanBlockers = voidConfirmed.length + dupInWin.length + (gePeriod.length ? 1 : 0)
    const cleanBand = cleanBlockers ? 'red' : (voidInWin.length ? 'amber' : 'green')
    const bands = [reconBand, recBand, tagBand, cleanBand]
    const worst = bands.includes('red') ? 'red' : bands.includes('amber') ? 'amber' : 'green'
    const verdict = worst === 'green' ? '🟢 READY TO CLOSE' : worst === 'amber' ? '🟡 CLOSE WITH NOTES' : '🔴 NOT READY TO CLOSE'

    const blockers: string[] = []
    if (cleanBlockers) {
      if (voidConfirmed.length) blockers.push(`Void/clear ${voidConfirmed.length} in-period duplicate bill(s) ($${Math.round(voidConfirmed.reduce((s, v) => s + v.amount, 0)).toLocaleString('en-AU')})`)
      if (dupInWin.length) blockers.push(`Investigate ${dupInWin.length} same-day exact duplicate group(s)`)
      if (gePeriod.length) blockers.push(`Recode ${gePeriod.length} GE-429 bill(s) ($${Math.round(ge).toLocaleString('en-AU')}) out of General Expenses`)
    }
    if (recBand !== 'green') blockers.push(`Chase $${Math.round(gap).toLocaleString('en-AU')} across ${noReceipt.length} unreceipted item(s)${bigUnreceipted.length ? ` (${bigUnreceipted.length} over $${TH.receipts.bigItem})` : ''}`)
    if (tagBand !== 'green') blockers.push(`Tag ${untaggedItems.length} untagged item(s) ($${Math.round(untag).toLocaleString('en-AU')})`)
    if (reconBand !== 'green') blockers.push(`Reconcile ${txns.length - reconDone} unreconciled ACT transaction(s)`)

    return NextResponse.json({
      period: P.label, human: P.human, window: { start: P.start, end: P.end },
      scope: 'ACT (NAB Visa #8815 + Everyday)',
      counts: { bills: bills.length, sales: sales.length, txns: txns.length, spends: spends.length },
      lenses: {
        recon: { pct: round1(reconPct), done: reconDone, total: txns.length, band: reconBand },
        receipts: { coveragePct: round1(covPct), gap: round2(gap), unreceipted: noReceipt.length, overThreshold: bigUnreceipted.length, top: bigUnreceipted.slice(0, 5).map((i) => ({ vendor: i.vendor, amount: round2(i.amt), kind: i.kind })), band: recBand },
        tagging: { pct: round1(tagPct), untagged: untaggedItems.length, untaggedDollars: round2(untag), band: tagBand },
        cleanliness: { voidCandidates: voidInWin.length, voidConfirmed: voidConfirmed.length, sameDayDups: dupInWin.length, ge429Bills: gePeriod.length, ge429Dollars: round2(ge), band: cleanBand },
        pnl: { salesInvoiced: round2(salesTotal), bankSpend: round2(spendTotal), billsRaised: round2(billsTotal), netCash: round2(salesTotal - spendTotal), byProject: [...proj.entries()].map(([k, v]) => ({ project: k, sales: round2(v.sales), spend: round2(v.spend), bills: round2(v.bills) })).sort((a, b) => (b.sales + b.spend + b.bills) - (a.sales + a.spend + a.bills)) },
        bas: showBas ? { indicative: true, gstOnSales1A: round2(gst1A), gstCredits1B: round2(gst1B), netGst: round2(gst1A - gst1B), note: `indicative accruals — run prepare-bas.mjs ${P.kind === 'quarter' ? `Q${P.q}` : ''} for the cash-basis lodgement worksheet` } : null,
        rd: { classified: rdClassified, eligibleDollars: round2(rdTotal), byCategory: { core: round2(rdByCat.core), supporting: round2(rdByCat.supporting), review: round2(rdByCat.review) }, receiptCoveragePct: round1(rdRecPct), note: rdClassified === 0 ? 'rd_eligible not populated — run tag-rd-eligibility.mjs --apply' : 'bank-txn R&D only; see thoughts/shared/rd-pack-fy26/ for full registers' },
      },
      gate: { verdict, worst, blockers },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'close compute failed' }, { status: 500 })
  }
}
