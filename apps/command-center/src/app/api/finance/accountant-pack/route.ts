import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const FY_START = '2025-07-01'
const R_AND_D_PROJECTS = ['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD']

function formatCurrency(amount: number): string {
  return `$${Math.abs(amount).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })
}

export async function GET() {
  try {
    // Fetch all required data in parallel
    const [
      monthlyResult,
      projectsResult,
      receivablesResult,
      payablesResult,
      transactionsResult,
      invoicesResult,
      pipelineResult,
    ] = await Promise.all([
      // Monthly financials
      supabase
        .from('project_monthly_financials')
        .select('project_code, month, revenue, expenses, net')
        .gte('month', FY_START)
        .limit(1000),

      // Projects metadata
      supabase
        .from('projects')
        .select('code, name, tier, status')
        .limit(200),

      // Outstanding receivables (ACCREC)
      supabase
        .from('xero_invoices')
        .select('id, contact_name, total, amount_due, date, due_date, status, project_code')
        .eq('type', 'ACCREC')
        .in('status', ['AUTHORISED', 'SENT'])
        .order('due_date', { ascending: true })
        .limit(500),

      // Outstanding payables (ACCPAY)
      supabase
        .from('xero_invoices')
        .select('id, contact_name, total, amount_due, date, due_date, status, project_code')
        .eq('type', 'ACCPAY')
        .in('status', ['AUTHORISED', 'SENT'])
        .order('due_date', { ascending: true })
        .limit(500),

      // All FY26 transactions for R&D and coverage
      supabase
        .from('xero_transactions')
        .select('id, date, contact_name, total, type, project_code')
        .gte('date', FY_START)
        .limit(2000),

      // All FY26 invoices for completeness
      supabase
        .from('xero_invoices')
        .select('id, contact_name, total, project_code, type')
        .gte('date', FY_START)
        .limit(2000),

      // Pipeline data
      supabase
        .from('opportunities_unified')
        .select('stage, value_mid, probability')
        .neq('stage', 'identified')
        .limit(1000),
    ])

    // Process data
    const monthlyData = monthlyResult.data || []
    const projects = projectsResult.data || []
    const receivables = receivablesResult.data || []
    const payables = payablesResult.data || []
    const transactions = transactionsResult.data || []
    const invoices = invoicesResult.data || []
    const pipelineData = pipelineResult.data || []

    const projectMap = new Map(projects.map(p => [p.code, p]))

    // 1. Executive Summary - aggregate by project
    const financials = new Map<string, { revenue: number; expenses: number; net: number }>()
    for (const row of monthlyData) {
      const code = row.project_code
      const entry = financials.get(code) || { revenue: 0, expenses: 0, net: 0 }
      entry.revenue += Number(row.revenue || 0)
      entry.expenses += Number(row.expenses || 0)
      entry.net += Number(row.net || 0)
      financials.set(code, entry)
    }

    let fyRevenue = 0, fyExpenses = 0
    for (const [, v] of financials) {
      fyRevenue += v.revenue
      fyExpenses += v.expenses
    }

    const totalReceivables = receivables.reduce((s, r) => s + Number(r.amount_due || 0), 0)
    const totalPayables = payables.reduce((s, p) => s + Math.abs(Number(p.amount_due || 0)), 0)

    // Calculate runway (based on avg monthly burn)
    const monthlyTotals = new Map<string, { expenses: number }>()
    for (const row of monthlyData) {
      const m = row.month
      const entry = monthlyTotals.get(m) || { expenses: 0 }
      entry.expenses += Number(row.expenses || 0)
      monthlyTotals.set(m, entry)
    }

    const completedMonths = [...monthlyTotals.entries()].filter(([m]) => m < new Date().toISOString().slice(0, 7) + '-01')
    const avgMonthlyBurn = completedMonths.length > 0
      ? completedMonths.reduce((sum, [, v]) => sum + Math.abs(v.expenses), 0) / completedMonths.length
      : 0
    const runway = avgMonthlyBurn > 0 ? ((fyRevenue - fyExpenses) + totalReceivables) / avgMonthlyBurn : 0

    // 2. Project P&L
    const projectPL = []
    for (const [code, fin] of financials) {
      const project = projectMap.get(code)
      projectPL.push({
        code,
        name: project?.name || code,
        tier: project?.tier || 'unknown',
        revenue: fin.revenue,
        expenses: fin.expenses,
        net: fin.net,
        margin: fin.revenue !== 0 ? ((fin.net / fin.revenue) * 100) : 0,
      })
    }

    // Sort: ecosystem first, then by expense magnitude
    const tierOrder: Record<string, number> = { ecosystem: 0, studio: 1, satellite: 2, unknown: 3 }
    projectPL.sort((a, b) => {
      const td = (tierOrder[a.tier] ?? 3) - (tierOrder[b.tier] ?? 3)
      if (td !== 0) return td
      return Math.abs(b.expenses) - Math.abs(a.expenses)
    })

    // 3. Outstanding Invoices - aging breakdown
    const now = new Date()
    const receivablesAging = {
      current: { amount: 0, count: 0, invoices: [] as typeof receivables },
      overdue30: { amount: 0, count: 0, invoices: [] as typeof receivables },
      overdue60: { amount: 0, count: 0, invoices: [] as typeof receivables },
      overdue90: { amount: 0, count: 0, invoices: [] as typeof receivables },
    }

    for (const inv of receivables) {
      const due = new Date(inv.due_date)
      const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
      const amt = Number(inv.amount_due || 0)

      if (daysOverdue <= 0) {
        receivablesAging.current.amount += amt
        receivablesAging.current.count++
        receivablesAging.current.invoices.push(inv)
      } else if (daysOverdue <= 30) {
        receivablesAging.overdue30.amount += amt
        receivablesAging.overdue30.count++
        receivablesAging.overdue30.invoices.push(inv)
      } else if (daysOverdue <= 60) {
        receivablesAging.overdue60.amount += amt
        receivablesAging.overdue60.count++
        receivablesAging.overdue60.invoices.push(inv)
      } else {
        receivablesAging.overdue90.amount += amt
        receivablesAging.overdue90.count++
        receivablesAging.overdue90.invoices.push(inv)
      }
    }

    // 5. Pipeline Summary - stage funnel
    const stageMap = new Map<string, { count: number; value: number; weighted: number }>()
    for (const opp of pipelineData) {
      const stage = opp.stage || 'unknown'
      const entry = stageMap.get(stage) || { count: 0, value: 0, weighted: 0 }
      entry.count++
      entry.value += Number(opp.value_mid || 0)
      entry.weighted += Number(opp.value_mid || 0) * (Number(opp.probability || 0) / 100)
      stageMap.set(stage, entry)
    }

    const stageOrder = ['researching', 'pursuing', 'submitted', 'shortlisted', 'won', 'realized']
    const pipelineSummary = [...stageMap.entries()]
      .map(([stage, data]) => ({
        stage,
        count: data.count,
        value: data.value,
        weighted: data.weighted,
      }))
      .sort((a, b) => {
        const ai = stageOrder.indexOf(a.stage)
        const bi = stageOrder.indexOf(b.stage)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })

    // 6. R&D Eligible Spend
    const rdSpend = new Map<string, number>()
    for (const txn of transactions) {
      if (R_AND_D_PROJECTS.includes(txn.project_code)) {
        const code = txn.project_code
        rdSpend.set(code, (rdSpend.get(code) || 0) + Math.abs(Number(txn.total || 0)))
      }
    }

    const rdTotal = [...rdSpend.values()].reduce((sum, v) => sum + v, 0)
    const rdOffset = rdTotal * 0.435 // 43.5% refundable offset

    const rdByProject = R_AND_D_PROJECTS.map(code => ({
      code,
      name: projectMap.get(code)?.name || code,
      spend: rdSpend.get(code) || 0,
      offset: (rdSpend.get(code) || 0) * 0.435,
    })).filter(p => p.spend > 0)

    // 7. Transaction Coverage
    const allTransactions = [...transactions, ...invoices]
    const taggedCount = allTransactions.filter(t => t.project_code && t.project_code !== '').length
    const coveragePct = allTransactions.length > 0 ? (taggedCount / allTransactions.length) * 100 : 0

    // Generate HTML
    const reportDate = new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })
    const reportMonth = new Date().toISOString().slice(0, 7)

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ACT Accountant Pack - ${reportMonth}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #000;
      background: #fff;
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; border-bottom: 3px solid #000; padding-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; margin-top: 2rem; margin-bottom: 1rem; page-break-after: avoid; }
    h3 { font-size: 1.2rem; margin-top: 1.5rem; margin-bottom: 0.75rem; }
    .header { margin-bottom: 2rem; }
    .meta { color: #666; font-size: 0.9rem; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      font-size: 0.9rem;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 0.5rem;
      text-align: left;
    }
    th {
      background: #f5f5f5;
      font-weight: 600;
    }
    tr:nth-child(even) { background: #fafafa; }
    tr.total-row {
      font-weight: bold;
      background: #e8e8e8 !important;
      border-top: 2px solid #000;
    }
    .amount { text-align: right; font-family: "Courier New", monospace; }
    .negative { color: #c00; }
    .positive { color: #080; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }
    .summary-card {
      border: 1px solid #ddd;
      padding: 1rem;
      background: #fafafa;
    }
    .summary-card h3 { margin-top: 0; font-size: 1rem; color: #666; }
    .summary-card .value { font-size: 1.8rem; font-weight: bold; }
    .overdue { background: #fff3cd; }
    .section { page-break-inside: avoid; }
    @media print {
      body { padding: 1rem; }
      h2 { page-break-before: always; margin-top: 0; padding-top: 1rem; }
      h2:first-of-type { page-break-before: auto; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>ACT Foundation — Accountant Pack</h1>
    <div class="meta">
      <p><strong>Financial Year:</strong> FY26 (July 1, 2025 – June 30, 2026)</p>
      <p><strong>Generated:</strong> ${reportDate}</p>
      <p><strong>ABN:</strong> 21 591 780 066</p>
    </div>
  </div>

  <section class="section">
    <h2>1. Executive Summary</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <h3>FY26 Revenue</h3>
        <div class="value positive">${formatCurrency(fyRevenue)}</div>
      </div>
      <div class="summary-card">
        <h3>FY26 Expenses</h3>
        <div class="value">${formatCurrency(fyExpenses)}</div>
      </div>
      <div class="summary-card">
        <h3>FY26 Net</h3>
        <div class="value ${fyRevenue - fyExpenses >= 0 ? 'positive' : 'negative'}">${formatCurrency(fyRevenue - fyExpenses)}</div>
      </div>
      <div class="summary-card">
        <h3>Outstanding Receivables</h3>
        <div class="value">${formatCurrency(totalReceivables)}</div>
      </div>
      <div class="summary-card">
        <h3>Outstanding Payables</h3>
        <div class="value">${formatCurrency(totalPayables)}</div>
      </div>
      <div class="summary-card">
        <h3>Runway (months)</h3>
        <div class="value">${runway.toFixed(1)}</div>
      </div>
    </div>
  </section>

  <section class="section">
    <h2>2. Project P&L</h2>
    <table>
      <thead>
        <tr>
          <th>Project Code</th>
          <th>Project Name</th>
          <th>Tier</th>
          <th class="amount">Revenue</th>
          <th class="amount">Expenses</th>
          <th class="amount">Net</th>
          <th class="amount">Margin %</th>
        </tr>
      </thead>
      <tbody>
        ${projectPL.map(p => `
        <tr>
          <td>${p.code}</td>
          <td>${p.name}</td>
          <td>${p.tier}</td>
          <td class="amount">${formatCurrency(p.revenue)}</td>
          <td class="amount">${formatCurrency(p.expenses)}</td>
          <td class="amount ${p.net >= 0 ? 'positive' : 'negative'}">${formatCurrency(p.net)}</td>
          <td class="amount">${p.margin.toFixed(1)}%</td>
        </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="3">TOTAL</td>
          <td class="amount">${formatCurrency(fyRevenue)}</td>
          <td class="amount">${formatCurrency(fyExpenses)}</td>
          <td class="amount ${fyRevenue - fyExpenses >= 0 ? 'positive' : 'negative'}">${formatCurrency(fyRevenue - fyExpenses)}</td>
          <td class="amount">${fyRevenue !== 0 ? (((fyRevenue - fyExpenses) / fyRevenue) * 100).toFixed(1) : '0.0'}%</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="section">
    <h2>3. Outstanding Invoices (Receivables)</h2>
    <h3>Aging Summary</h3>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th class="amount">Count</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Current (not yet due)</td>
          <td class="amount">${receivablesAging.current.count}</td>
          <td class="amount">${formatCurrency(receivablesAging.current.amount)}</td>
        </tr>
        <tr class="${receivablesAging.overdue30.amount > 0 ? 'overdue' : ''}">
          <td>Overdue 1-30 days</td>
          <td class="amount">${receivablesAging.overdue30.count}</td>
          <td class="amount">${formatCurrency(receivablesAging.overdue30.amount)}</td>
        </tr>
        <tr class="${receivablesAging.overdue60.amount > 0 ? 'overdue' : ''}">
          <td>Overdue 31-60 days</td>
          <td class="amount">${receivablesAging.overdue60.count}</td>
          <td class="amount">${formatCurrency(receivablesAging.overdue60.amount)}</td>
        </tr>
        <tr class="${receivablesAging.overdue90.amount > 0 ? 'overdue' : ''}">
          <td>Overdue 60+ days</td>
          <td class="amount">${receivablesAging.overdue90.count}</td>
          <td class="amount">${formatCurrency(receivablesAging.overdue90.amount)}</td>
        </tr>
        <tr class="total-row">
          <td>TOTAL</td>
          <td class="amount">${receivables.length}</td>
          <td class="amount">${formatCurrency(totalReceivables)}</td>
        </tr>
      </tbody>
    </table>

    ${receivablesAging.overdue30.invoices.length + receivablesAging.overdue60.invoices.length + receivablesAging.overdue90.invoices.length > 0 ? `
    <h3>Overdue Invoices Detail</h3>
    <table>
      <thead>
        <tr>
          <th>Contact</th>
          <th>Date</th>
          <th>Due Date</th>
          <th>Days Overdue</th>
          <th>Project</th>
          <th class="amount">Amount Due</th>
        </tr>
      </thead>
      <tbody>
        ${[...receivablesAging.overdue30.invoices, ...receivablesAging.overdue60.invoices, ...receivablesAging.overdue90.invoices]
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
          .map(inv => {
            const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))
            return `
        <tr class="overdue">
          <td>${inv.contact_name || 'Unknown'}</td>
          <td>${formatDate(inv.date)}</td>
          <td>${formatDate(inv.due_date)}</td>
          <td class="amount">${daysOverdue}</td>
          <td>${inv.project_code || 'N/A'}</td>
          <td class="amount">${formatCurrency(Number(inv.amount_due || 0))}</td>
        </tr>
            `
          }).join('')}
      </tbody>
    </table>
    ` : '<p>No overdue invoices.</p>'}
  </section>

  <section class="section">
    <h2>4. Outstanding Bills (Payables)</h2>
    ${payables.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Contact</th>
          <th>Date</th>
          <th>Due Date</th>
          <th>Project</th>
          <th class="amount">Amount Due</th>
        </tr>
      </thead>
      <tbody>
        ${payables.map(inv => `
        <tr>
          <td>${inv.contact_name || 'Unknown'}</td>
          <td>${formatDate(inv.date)}</td>
          <td>${formatDate(inv.due_date)}</td>
          <td>${inv.project_code || 'N/A'}</td>
          <td class="amount">${formatCurrency(Math.abs(Number(inv.amount_due || 0)))}</td>
        </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="4">TOTAL</td>
          <td class="amount">${formatCurrency(totalPayables)}</td>
        </tr>
      </tbody>
    </table>
    ` : '<p>No outstanding payables.</p>'}
  </section>

  <section class="section">
    <h2>5. Pipeline Summary</h2>
    <table>
      <thead>
        <tr>
          <th>Stage</th>
          <th class="amount">Count</th>
          <th class="amount">Total Value</th>
          <th class="amount">Weighted Value</th>
        </tr>
      </thead>
      <tbody>
        ${pipelineSummary.map(s => `
        <tr>
          <td>${s.stage}</td>
          <td class="amount">${s.count}</td>
          <td class="amount">${formatCurrency(s.value)}</td>
          <td class="amount">${formatCurrency(s.weighted)}</td>
        </tr>
        `).join('')}
        <tr class="total-row">
          <td>TOTAL</td>
          <td class="amount">${pipelineSummary.reduce((s, p) => s + p.count, 0)}</td>
          <td class="amount">${formatCurrency(pipelineSummary.reduce((s, p) => s + p.value, 0))}</td>
          <td class="amount">${formatCurrency(pipelineSummary.reduce((s, p) => s + p.weighted, 0))}</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="section">
    <h2>6. R&D Eligible Spend</h2>
    <p>Projects eligible for 43.5% refundable R&D tax offset: ${R_AND_D_PROJECTS.join(', ')}</p>
    <table>
      <thead>
        <tr>
          <th>Project Code</th>
          <th>Project Name</th>
          <th class="amount">R&D Spend</th>
          <th class="amount">43.5% Offset</th>
        </tr>
      </thead>
      <tbody>
        ${rdByProject.map(p => `
        <tr>
          <td>${p.code}</td>
          <td>${p.name}</td>
          <td class="amount">${formatCurrency(p.spend)}</td>
          <td class="amount positive">${formatCurrency(p.offset)}</td>
        </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="2">TOTAL R&D</td>
          <td class="amount">${formatCurrency(rdTotal)}</td>
          <td class="amount positive">${formatCurrency(rdOffset)}</td>
        </tr>
      </tbody>
    </table>
    <p><strong>Note:</strong> R&D registration must be lodged with AusIndustry by April 30, 2026 (10 months after FY end).</p>
  </section>

  <section class="section">
    <h2>7. Transaction Coverage</h2>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th class="amount">Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Total transactions (bank + invoices)</td>
          <td class="amount">${allTransactions.length}</td>
        </tr>
        <tr>
          <td>Tagged with project codes</td>
          <td class="amount">${taggedCount}</td>
        </tr>
        <tr class="total-row">
          <td>Coverage</td>
          <td class="amount">${coveragePct.toFixed(1)}%</td>
        </tr>
      </tbody>
    </table>
  </section>

  <footer style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ddd; color: #666; font-size: 0.85rem;">
    <p>Generated by ACT Command Center on ${reportDate}</p>
    <p>This report is self-contained and suitable for printing or PDF export.</p>
  </footer>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="act-accountant-pack-${reportMonth}.html"`,
      },
    })
  } catch (error) {
    console.error('Error generating accountant pack:', error)
    return NextResponse.json({ error: 'Failed to generate accountant pack' }, { status: 500 })
  }
}
