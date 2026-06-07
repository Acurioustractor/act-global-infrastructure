import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { foldMonthlyByCanonical } from '@/lib/finance/project-codes'

export const dynamic = 'force-dynamic'

/**
 * GET /api/finance/cost-drill — folded per-project FY26 P&L for the cost-drill table.
 *
 * Source: project_monthly_financials (the maintained rollup; PAID ACCREC + bank xero_transactions).
 * Legacy codes (ACT-HQ/ACT-CG/ACT-PC) are folded to canonical (ACT-CORE/ACT-CS/ACT-PI) via
 * foldMonthlyByCanonical, or a project's costs split across two codes and the table lies.
 *
 * Reads ONLY revenue/expenses (positive in the rollup) — never by sign. Paginates the 1000-row cap.
 */

const FY_START = '2025-07-01'
const FY_END = '2026-06-30'

interface MonthlyRow {
  project_code: string | null
  revenue: number | string | null
  expenses: number | string | null
}

export async function GET() {
  try {
    // Paginate project_monthly_financials (server caps at ~1000 even with .range()).
    const PAGE = 1000
    const monthly: MonthlyRow[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('project_monthly_financials')
        .select('project_code, revenue, expenses')
        .gte('month', FY_START)
        .lte('month', FY_END)
        .range(from, from + PAGE - 1)
      if (error) throw error
      const batch = data ?? []
      monthly.push(...batch)
      if (batch.length < PAGE) break
    }

    const folded = foldMonthlyByCanonical(monthly)

    // Names + tier by canonical code. `status` filters the reassign-target dropdown to live projects.
    const { data: projects } = await supabase.from('projects').select('code, name, tier, status').limit(500)
    const meta = new Map<string, { name: string | null; tier: string | null }>(
      (projects || []).map((p) => [String(p.code).toUpperCase(), { name: p.name ?? null, tier: p.tier ?? null }]),
    )
    // Reassign targets: active projects, never the legacy wrappers (they fold away).
    const LEGACY = new Set(['ACT-CG', 'ACT-HQ', 'ACT-PC'])
    const targetProjects = (projects || [])
      .filter((p) => (p.status ?? 'active') === 'active' && !LEGACY.has(String(p.code).toUpperCase()))
      .map((p) => ({ code: String(p.code).toUpperCase(), name: p.name ?? p.code }))
      .sort((a, b) => a.code.localeCompare(b.code))

    const rows = folded.map((r) => ({
      ...r,
      name: meta.get(r.code)?.name ?? r.code,
      tier: meta.get(r.code)?.tier ?? null,
    }))

    const totals = rows.reduce(
      (a, r) => ({ revenue: a.revenue + r.revenue, expenses: a.expenses + r.expenses, net: a.net + r.net }),
      { revenue: 0, expenses: 0, net: 0 },
    )

    return NextResponse.json({ rows, totals, projects: targetProjects, fy: 'FY26', fyStart: FY_START, fyEnd: FY_END })
  } catch (error) {
    console.error('cost-drill P&L error:', error)
    return NextResponse.json({ error: 'Failed to load cost-drill P&L' }, { status: 500 })
  }
}
