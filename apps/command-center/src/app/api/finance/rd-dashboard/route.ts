import { NextResponse } from 'next/server'
import { getFYDates } from '@/lib/finance/dates'
import { execSql } from '@/lib/finance/query'

export const dynamic = 'force-dynamic'

// Australian R&D Tax Incentive: 43.5% refundable for entities < $20M turnover
const RD_REFUND_RATE = 0.435

// R&D eligible project definitions
const CORE_RD_PROJECTS = ['ACT-EL', 'ACT-JH', 'ACT-IN', 'ACT-DO']
const SUPPORTING_RD_PROJECTS = ['ACT-GD', 'ACT-FM']

// Nic's salary R&D allocation (60% of time on R&D projects)
const SALARY_RD_ALLOCATION = 0.6

interface RdProject {
  code: string
  name: string
  category: string
  spend: number
  txCount: number
  topVendors: { name: string; spend: number }[]
}

type RdRow = { project_code: string; project_name: string; rd_category: string; tx_count: number; spend: number }
type VendorRow = { project_code: string; contact_name: string; spend: number }
type SalaryRow = { contact_name: string; total: number }
type SpendRow = { total_spend: number }
type MonthlyRow = { month: string; rd_category: string; spend: number }

export async function GET() {
  try {
    const { fyStart, monthsElapsed, monthsRemaining } = getFYDates()

    const [rdRows, vendorRows, salaryRows, totalSpendRows, monthlyRows] = await Promise.all([
      execSql<RdRow>('rd-by-project', `
        SELECT t.project_code, p.name as project_name, t.rd_category,
               count(*) as tx_count,
               round(sum(t.total)::numeric, 0) as spend
        FROM xero_transactions t
        LEFT JOIN projects p ON p.code = t.project_code
        WHERE t.date >= '${fyStart}' AND t.rd_eligible = true
        GROUP BY 1, 2, 3 ORDER BY spend DESC`),

      execSql<VendorRow>('rd-top-vendors', `
        SELECT project_code, contact_name,
               round(sum(total)::numeric, 0) as spend
        FROM xero_transactions
        WHERE date >= '${fyStart}' AND rd_eligible = true
          AND rd_category != 'salary' AND contact_name IS NOT NULL
        GROUP BY 1, 2 ORDER BY spend DESC LIMIT 20`),

      execSql<SalaryRow>('founder-salary', `
        SELECT contact_name, round(sum(total)::numeric, 0) as total
        FROM xero_transactions
        WHERE date >= '${fyStart}' AND type IN ('SPEND','SPEND-TRANSFER')
          AND (contact_name ILIKE '%marchesi%' OR contact_name = 'Nicholas')
          AND total >= 5000
        GROUP BY 1`),

      execSql<SpendRow>('total-fy-spend', `
        SELECT round(sum(total)::numeric, 0) as total_spend
        FROM xero_transactions
        WHERE date >= '${fyStart}' AND type IN ('SPEND','SPEND-TRANSFER')
          AND contact_name IS NOT NULL`),

      execSql<MonthlyRow>('monthly-rd-trend', `
        SELECT date_trunc('month', date)::date as month,
               rd_category,
               round(sum(total)::numeric, 0) as spend
        FROM xero_transactions
        WHERE date >= '${fyStart}' AND rd_eligible = true
        GROUP BY 1, 2 ORDER BY 1`),
    ])

    // Process R&D by project
    const projects: RdProject[] = []
    const projectCodes = [...new Set(rdRows.map(r => r.project_code))]

    for (const code of projectCodes) {
      const rows = rdRows.filter(r => r.project_code === code)
      const category = rows[0]?.rd_category || 'unknown'
      if (category === 'salary') continue // handle salary separately

      projects.push({
        code,
        name: rows[0]?.project_name || code,
        category,
        spend: rows.reduce((s, r) => s + Number(r.spend), 0),
        txCount: rows.reduce((s, r) => s + Number(r.tx_count), 0),
        topVendors: vendorRows
          .filter(v => v.project_code === code)
          .slice(0, 5)
          .map(v => ({ name: v.contact_name, spend: Number(v.spend) })),
      })
    }

    projects.sort((a, b) => b.spend - a.spend)

    // Salary R&D
    const nicSalary = salaryRows.reduce((s, r) => s + Number(r.total), 0)
    const nicRdSalary = Math.round(nicSalary * SALARY_RD_ALLOCATION)
    const benRdSalary = 0 // Ben is not on payroll yet

    // Totals
    const coreSpend = projects.filter(p => CORE_RD_PROJECTS.includes(p.code)).reduce((s, p) => s + p.spend, 0)
    const supportingSpend = projects.filter(p => SUPPORTING_RD_PROJECTS.includes(p.code)).reduce((s, p) => s + p.spend, 0)
    const salaryRdSpend = nicRdSalary + benRdSalary
    const totalRdEligible = coreSpend + supportingSpend + salaryRdSpend
    const refund = Math.round(totalRdEligible * RD_REFUND_RATE)

    const totalFySpend = Number(totalSpendRows[0]?.total_spend || 0)
    const rdPct = totalFySpend > 0 ? Math.round((totalRdEligible / totalFySpend) * 100) : 0

    // Monthly trend
    const months = [...new Set(monthlyRows.map(r => r.month))].sort()
    const monthly = months.map(m => {
      const rows = monthlyRows.filter(r => r.month === m)
      return {
        month: m,
        core: rows.filter(r => r.rd_category === 'core').reduce((s, r) => s + Number(r.spend), 0),
        supporting: rows.filter(r => r.rd_category === 'supporting').reduce((s, r) => s + Number(r.spend), 0),
        salary: rows.filter(r => r.rd_category === 'salary').reduce((s, r) => s + Number(r.spend), 0),
      }
    })

    // Projected full year
    const projectedRd = monthsElapsed > 0
      ? Math.round((totalRdEligible / monthsElapsed) * 12)
      : totalRdEligible
    const projectedRefund = Math.round(projectedRd * RD_REFUND_RATE)

    // What if Ben starts at $200K with 85% R&D?
    const benPotentialRd = Math.round(200000 * (monthsRemaining / 12) * 0.85)
    const withBenRefund = Math.round((totalRdEligible + benPotentialRd) * RD_REFUND_RATE)

    return NextResponse.json({
      projects,
      salary: {
        nic: { total: nicSalary, rdAllocation: SALARY_RD_ALLOCATION, rdAmount: nicRdSalary },
        ben: { total: 0, rdAllocation: 0.85, rdAmount: benRdSalary, potential: benPotentialRd },
      },
      totals: {
        core: coreSpend,
        supporting: supportingSpend,
        salary: salaryRdSpend,
        total: totalRdEligible,
        refund,
        totalFySpend,
        rdPct,
      },
      projection: {
        monthsElapsed,
        monthsRemaining,
        projectedFullYear: projectedRd,
        projectedRefund,
        withBenOnPayroll: withBenRefund,
        benPotentialRd,
      },
      monthly,
      definitions: {
        core: { projects: CORE_RD_PROJECTS, description: 'Experimental activities whose outcome cannot be known in advance' },
        supporting: { projects: SUPPORTING_RD_PROJECTS, description: 'Activities directly related to core R&D' },
        salary: { description: 'Founder time allocated to R&D projects (based on time logs)' },
        rate: RD_REFUND_RATE,
        note: 'Australian R&D Tax Incentive — 43.5% refundable offset for entities under $20M turnover',
      },
    })
  } catch (e) {
    console.error('R&D dashboard error:', e)
    return NextResponse.json({ error: 'Failed to load R&D dashboard' }, { status: 500 })
  }
}
