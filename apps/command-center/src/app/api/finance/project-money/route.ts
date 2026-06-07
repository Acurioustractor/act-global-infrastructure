import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Project Money — live per-project income / expense / net + tagging coverage,
// derived straight from the Xero mirror (xero_invoices ACCREC+ACCPAY, xero_transactions
// SPEND). Reads live so it reflects tagging immediately (unlike project_monthly_financials).
// Income = ACCREC invoiced total (received = amount_paid). Expense = ACCPAY bills + SPEND.
// FY26 = from 2025-07-01. Voided/deleted excluded.

const FY_START = '2025-07-01'
const VOID = '(VOIDED,DELETED)'
const PAGE = 1000

const num = (v: unknown) => Math.abs(Number(v) || 0)
const tag = (c: unknown) => (c && String(c).trim() ? String(c).trim() : null)

async function pageAll<T>(build: (from: number, to: number) => any): Promise<T[]> {
  let out: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) throw error
    out = out.concat(data || [])
    if (!data || data.length < PAGE) break
    from += PAGE
  }
  return out
}

interface Bucket {
  income: number; received: number; billsOutstanding: number; spendExpense: number
}
const empty = (): Bucket => ({ income: 0, received: 0, billsOutstanding: 0, spendExpense: 0 })

export async function GET() {
  try {
    const [income, bills, spend, projects] = await Promise.all([
      pageAll<any>((f, t) => supabase.from('xero_invoices')
        .select('project_code, project_code_source, total, amount_paid, status')
        .eq('type', 'ACCREC').not('status', 'in', VOID).gte('date', FY_START).range(f, t)),
      pageAll<any>((f, t) => supabase.from('xero_invoices')
        .select('project_code, project_code_source, total, amount_due, status')
        .eq('type', 'ACCPAY').not('status', 'in', VOID).gte('date', FY_START).range(f, t)),
      pageAll<any>((f, t) => supabase.from('xero_transactions')
        .select('project_code, project_code_source, total')
        .in('type', ['SPEND', 'SPEND-OVERPAYMENT']).gte('date', FY_START).range(f, t)),
      supabase.from('projects').select('code, name, tier, status').limit(500).then(r => r.data || []),
    ])

    const nameOf = new Map<string, { name: string; tier: string | null; status: string | null }>()
    for (const p of projects) nameOf.set(p.code, { name: p.name, tier: p.tier, status: p.status })

    const buckets = new Map<string, Bucket>()
    const bucket = (code: string) => {
      let b = buckets.get(code); if (!b) { b = empty(); buckets.set(code, b) } return b
    }
    // Coverage accumulators
    const cov = {
      income: { tagged: { n: 0, $: 0 }, untagged: { n: 0, $: 0 } },
      expense: { tagged: { n: 0, $: 0 }, untagged: { n: 0, $: 0 } },
    }
    const addCov = (kind: 'income' | 'expense', code: string | null, amt: number) => {
      const k = code ? 'tagged' : 'untagged'; cov[kind][k].n++; cov[kind][k].$ += amt
    }

    const UNTAGGED = '— untagged —'
    for (const r of income) {
      const code = tag(r.project_code); const amt = num(r.total)
      addCov('income', code, amt)
      const b = bucket(code || UNTAGGED); b.income += amt; b.received += num(r.amount_paid)
    }
    for (const r of bills) {
      const code = tag(r.project_code); const amt = num(r.total)
      // Coverage counts the bill record (every expense should be tagged); but for the
      // money total we only add the UNPAID portion (amount_due) — the paid portion
      // already shows up as a SPEND bank transaction, so adding the full bill double-counts.
      addCov('expense', code, amt)
      bucket(code || UNTAGGED).billsOutstanding += (r.status === 'AUTHORISED' ? num(r.amount_due) : 0)
    }
    for (const r of spend) {
      const code = tag(r.project_code); const amt = num(r.total)
      addCov('expense', code, amt)
      bucket(code || UNTAGGED).spendExpense += amt
    }

    const rows = [...buckets.entries()].map(([code, b]) => {
      // Cash-out (SPEND) + unpaid bill commitments (amount_due). Matches the cash basis
      // of project_monthly_financials without double-counting paid bills.
      const expense = b.spendExpense + b.billsOutstanding
      const meta = nameOf.get(code)
      return {
        code,
        name: code === UNTAGGED ? 'Untagged' : (meta?.name || code),
        tier: meta?.tier || null,
        status: meta?.status || null,
        income: b.income,
        received: b.received,
        billsOutstanding: b.billsOutstanding,
        spendExpense: b.spendExpense,
        expense,
        net: b.income - expense,
        untagged: code === UNTAGGED,
      }
    }).sort((a, b) => {
      if (a.untagged) return 1
      if (b.untagged) return -1
      return (b.income + b.expense) - (a.income + a.expense)
    })

    const totals = rows.reduce((acc, r) => ({
      income: acc.income + r.income,
      received: acc.received + r.received,
      expense: acc.expense + r.expense,
      net: acc.net + r.net,
    }), { income: 0, received: 0, expense: 0, net: 0 })

    const pct = (t: { n: number }, u: { n: number }) => {
      const d = t.n + u.n; return d ? Math.round((t.n / d) * 100) : 100
    }

    return NextResponse.json({
      fyStart: FY_START,
      rows,
      totals,
      coverage: {
        income: { ...cov.income, pct: pct(cov.income.tagged, cov.income.untagged) },
        expense: { ...cov.expense, pct: pct(cov.expense.tagged, cov.expense.untagged) },
      },
    })
  } catch (error: any) {
    console.error('GET /api/finance/project-money error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
