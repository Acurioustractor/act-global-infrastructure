import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Hardcoded deadlines with date math
function getDeadlines() {
  const now = new Date()
  const deadlines = [
    { name: 'FY2024-25 R&D Registration', date: '2026-04-30', description: 'Register R&D activities with AusIndustry' },
    { name: 'Pty Ltd Registration', date: '2026-03-31', description: 'Must be incorporated before R&D application' },
    { name: 'Engage R&D Consultant', date: '2026-03-15', description: 'Find specialist to review activities' },
    { name: 'Director ID Numbers', date: '2026-02-28', description: 'Both directors need DIN before company registration' },
    { name: 'FY2025-26 Ends', date: '2026-06-30', description: 'End of current financial year' },
    { name: 'FY2025-26 R&D Registration', date: '2027-04-30', description: 'Register FY2025-26 R&D activities' },
  ]

  return deadlines.map(d => {
    const date = new Date(d.date)
    const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    let status: 'overdue' | 'urgent' | 'upcoming' | 'future'
    if (daysUntil < 0) status = 'overdue'
    else if (daysUntil <= 30) status = 'urgent'
    else if (daysUntil <= 90) status = 'upcoming'
    else status = 'future'
    return { ...d, daysUntil, status }
  })
}

function getActionChecklist() {
  return [
    { task: 'Get Director Identification Numbers (DIN)', status: 'pending' as const, dueDate: '2026-02-28', category: 'Pty Ltd' },
    { task: 'Choose company name & check availability', status: 'pending' as const, dueDate: '2026-03-07', category: 'Pty Ltd' },
    { task: 'Register Pty Ltd + ABN + GST ($611)', status: 'pending' as const, dueDate: '2026-03-31', category: 'Pty Ltd' },
    { task: 'Open company bank account', status: 'pending' as const, dueDate: '2026-04-07', category: 'Pty Ltd' },
    { task: 'Set up Xero for new entity', status: 'pending' as const, dueDate: '2026-04-14', category: 'Pty Ltd' },
    { task: 'Engage R&D tax consultant', status: 'pending' as const, dueDate: '2026-03-15', category: 'R&D' },
    { task: 'Document R&D activities for FY2024-25', status: 'pending' as const, dueDate: '2026-04-15', category: 'R&D' },
    { task: 'Lodge FY2024-25 R&D registration', status: 'pending' as const, dueDate: '2026-04-30', category: 'R&D' },
    { task: 'Set up family trust (discuss with accountant)', status: 'pending' as const, dueDate: '2026-05-30', category: 'Structure' },
    { task: 'Begin FY2025-26 activity documentation', status: 'pending' as const, dueDate: '2026-06-30', category: 'R&D' },
  ]
}

export async function GET() {
  try {
    // 1. R&D spend: xero_transactions joined with vendor_project_rules where rd_eligible
    const { data: rdTransactions, error: rdError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          t.contact_name,
          t.project_code,
          t.total,
          t.date,
          v.category,
          v.rd_eligible,
          p.name as project_name
        FROM xero_transactions t
        JOIN vendor_project_rules v ON t.contact_name = v.vendor_name
        LEFT JOIN projects p ON t.project_code = p.code
        WHERE v.rd_eligible = true
          AND t.total < 0
          AND t.date >= '2024-07-01'
        ORDER BY t.date DESC
      `
    })

    // Fallback: direct query if RPC not available
    let transactions = rdTransactions
    if (rdError) {
      // Use two separate queries and join in JS
      const { data: txData } = await supabase
        .from('xero_transactions')
        .select('contact_name, project_code, total, date')
        .lt('total', 0)
        .gte('date', '2024-07-01')

      const { data: vendorData } = await supabase
        .from('vendor_project_rules')
        .select('vendor_name, category, rd_eligible, project_code')
        .eq('rd_eligible', true)

      const { data: projectData } = await supabase
        .from('projects')
        .select('code, name')

      const vendorMap = new Map((vendorData || []).map(v => [v.vendor_name, v]))
      const projectMap = new Map((projectData || []).map(p => [p.code, p.name]))

      transactions = (txData || [])
        .filter(t => vendorMap.has(t.contact_name))
        .map(t => {
          const vendor = vendorMap.get(t.contact_name)!
          return {
            contact_name: t.contact_name,
            project_code: t.project_code,
            total: t.total,
            date: t.date,
            category: vendor.category,
            rd_eligible: true,
            project_name: projectMap.get(t.project_code || '') || t.project_code,
          }
        })
    }

    // 2. Calculate spend by FY
    const fy2425: Record<string, number> = { software: 0, hardware: 0, product: 0, travel: 0, operations: 0, total: 0 }
    const fy2526: Record<string, number> = { software: 0, hardware: 0, product: 0, travel: 0, operations: 0, total: 0 }

    const spendByProject: Record<string, { code: string; name: string; rdSpend: number; totalSpend: number }> = {}

    for (const tx of transactions || []) {
      const amount = Math.abs(tx.total)
      const date = new Date(tx.date)
      const fy = date < new Date('2025-07-01') ? fy2425 : fy2526

      // Map category to spend bucket
      const cat = (tx.category || '').toLowerCase()
      if (cat.includes('software') || cat.includes('subscription')) fy.software += amount
      else if (cat.includes('material') || cat.includes('supplies')) fy.hardware += amount
      else if (cat.includes('travel')) fy.travel += amount
      else fy.operations += amount
      fy.total += amount

      // By project
      const code = tx.project_code || 'Untagged'
      if (!spendByProject[code]) {
        spendByProject[code] = { code, name: tx.project_name || code, rdSpend: amount, totalSpend: 0 }
      } else {
        spendByProject[code].rdSpend += amount
      }
    }

    // 3. Get total spend per project for percentage calculation
    const { data: totalsByProject } = await supabase
      .from('xero_transactions')
      .select('project_code, total')
      .lt('total', 0)
      .gte('date', '2024-07-01')
      .not('project_code', 'is', null)

    const projectTotals: Record<string, number> = {}
    for (const tx of totalsByProject || []) {
      const code = tx.project_code!
      projectTotals[code] = (projectTotals[code] || 0) + Math.abs(tx.total)
    }

    const spendByProjectArray = Object.values(spendByProject)
      .map(p => ({
        ...p,
        totalSpend: projectTotals[p.code] || p.rdSpend,
        rdPct: projectTotals[p.code] ? Math.round((p.rdSpend / projectTotals[p.code]) * 100) : 100,
      }))
      .sort((a, b) => b.rdSpend - a.rdSpend)

    // 4. Top vendors
    const vendorSpend: Record<string, { vendor: string; project: string; category: string; spend: number }> = {}
    for (const tx of transactions || []) {
      const key = tx.contact_name
      if (!vendorSpend[key]) {
        vendorSpend[key] = {
          vendor: tx.contact_name,
          project: tx.project_code || 'Untagged',
          category: tx.category || 'Unknown',
          spend: Math.abs(tx.total),
        }
      } else {
        vendorSpend[key].spend += Math.abs(tx.total)
      }
    }
    const topVendors = Object.values(vendorSpend)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 20)
      .map(v => ({ ...v, rdEligible: true }))

    // 5. Tagging coverage
    const { data: tagStats } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          CASE WHEN date < '2025-07-01' THEN 'fy2025' ELSE 'fy2026' END as fy,
          COUNT(*) as total,
          COUNT(project_code) as tagged
        FROM xero_transactions
        WHERE date >= '2024-07-01' AND total < 0
        GROUP BY 1
      `
    })

    let taggingCoverage: Record<string, { total: number; tagged: number; pct: number }> = {}
    if (tagStats) {
      for (const row of tagStats) {
        taggingCoverage[row.fy] = {
          total: Number(row.total),
          tagged: Number(row.tagged),
          pct: row.total > 0 ? Math.round((Number(row.tagged) / Number(row.total)) * 100) : 0,
        }
      }
    } else {
      // Fallback: count manually
      const { count: total2025 } = await supabase
        .from('xero_transactions')
        .select('*', { count: 'exact', head: true })
        .lt('total', 0)
        .gte('date', '2024-07-01')
        .lt('date', '2025-07-01')

      const { count: tagged2025 } = await supabase
        .from('xero_transactions')
        .select('*', { count: 'exact', head: true })
        .lt('total', 0)
        .gte('date', '2024-07-01')
        .lt('date', '2025-07-01')
        .not('project_code', 'is', null)

      const { count: total2026 } = await supabase
        .from('xero_transactions')
        .select('*', { count: 'exact', head: true })
        .lt('total', 0)
        .gte('date', '2025-07-01')

      const { count: tagged2026 } = await supabase
        .from('xero_transactions')
        .select('*', { count: 'exact', head: true })
        .lt('total', 0)
        .gte('date', '2025-07-01')
        .not('project_code', 'is', null)

      taggingCoverage = {
        fy2025: {
          total: total2025 || 0,
          tagged: tagged2025 || 0,
          pct: total2025 ? Math.round(((tagged2025 || 0) / total2025) * 100) : 0,
        },
        fy2026: {
          total: total2026 || 0,
          tagged: tagged2026 || 0,
          pct: total2026 ? Math.round(((tagged2026 || 0) / total2026) * 100) : 0,
        },
      }
    }

    // 6. Calculate 43.5% offset
    const offset43pct = {
      fy2425: Math.round(fy2425.total * 0.435),
      fy2526: Math.round(fy2526.total * 0.435),
      combined: Math.round((fy2425.total + fy2526.total) * 0.435),
    }

    return NextResponse.json({
      deadlines: getDeadlines(),
      spendByFY: { 'FY2024-25': fy2425, 'FY2025-26': fy2526 },
      spendByProject: spendByProjectArray,
      topVendors,
      actionChecklist: getActionChecklist(),
      offset43pct,
      taggingCoverage,
    })
  } catch (error) {
    console.error('R&D tracking API error:', error)
    return NextResponse.json({ error: 'Failed to load R&D tracking data' }, { status: 500 })
  }
}
