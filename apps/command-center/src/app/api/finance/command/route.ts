import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const FY_START = '2025-07-01'
const FY_END = '2026-06-30'

type Tier = 'ecosystem' | 'satellite' | 'studio' | 'background' | null

interface ProjectMoneyRow {
  project_code: string
  project_name: string
  tier: Tier
  category: string | null
  project_status: string | null
  importance_weight: number | null

  txn_count_fy: number
  txn_untagged_fy: number
  inv_count_fy: number
  inv_untagged_fy: number
  opp_open_count: number
  opp_untagged_count: number

  income_fy: number
  expenses_fy: number
  net_fy: number
  revenue_paid_fy: number
  receivables: number
  pipeline_weighted: number
  pipeline_raw: number
  grants_in_flight: number
  grants_in_flight_count: number

  last_transaction_at: string | null
  last_invoice_paid_at: string | null
  last_bill_at: string | null
  last_opp_update_at: string | null

  days_since_transaction: number | null
  days_since_invoice_paid: number | null
  days_since_opp_update: number | null
}

interface DriftItem {
  kind: 'invoice' | 'opportunity' | 'transaction'
  reason: 'untagged' | 'mismatch'
  id: string
  label: string
  amount: number
  meta: Record<string, unknown>
  workbenchUrl: string | null
}

interface CommandResponse {
  generatedAt: string
  fy: { start: string; end: string }
  top: {
    cashInBank: number | null
    fyIncome: number
    fyExpenses: number
    fyNet: number
    receivables: number
    pipelineWeighted: number
    grantsInFlight: number
    projectedIncoming90d: number
    incomingStack: Array<{ source: string; amount: number; note: string }>
  }
  middle: {
    coverage: Array<{ source: string; total: number; tagged: number; pct: number }>
    projects: ProjectMoneyRow[]
    drift: DriftItem[]
  }
  bottom: {
    actionLinks: Array<{ href: string; label: string; note: string }>
  }
}

const num = (v: unknown) => (v == null ? 0 : Number(v))

export async function GET() {
  // 1. Per-project money state from the view
  const { data: projectsRaw, error: projErr } = await supabase
    .from('v_project_money_state')
    .select('*')
  if (projErr) {
    return NextResponse.json({ error: projErr.message, hint: 'v_project_money_state view missing — apply supabase/migrations/20260516000000_money_command_state.sql' }, { status: 500 })
  }

  const projects: ProjectMoneyRow[] = (projectsRaw ?? []).map(r => ({
    project_code: r.project_code,
    project_name: r.project_name,
    tier: r.tier,
    category: r.category,
    project_status: r.project_status,
    importance_weight: r.importance_weight,
    txn_count_fy: num(r.txn_count_fy),
    txn_untagged_fy: num(r.txn_untagged_fy),
    inv_count_fy: num(r.inv_count_fy),
    inv_untagged_fy: num(r.inv_untagged_fy),
    opp_open_count: num(r.opp_open_count),
    opp_untagged_count: num(r.opp_untagged_count),
    income_fy: num(r.income_fy),
    expenses_fy: num(r.expenses_fy),
    net_fy: num(r.net_fy),
    revenue_paid_fy: num(r.revenue_paid_fy),
    receivables: num(r.receivables),
    pipeline_weighted: num(r.pipeline_weighted),
    pipeline_raw: num(r.pipeline_raw),
    grants_in_flight: num(r.grants_in_flight),
    grants_in_flight_count: num(r.grants_in_flight_count),
    last_transaction_at: r.last_transaction_at,
    last_invoice_paid_at: r.last_invoice_paid_at,
    last_bill_at: r.last_bill_at,
    last_opp_update_at: r.last_opp_update_at,
    days_since_transaction: r.days_since_transaction,
    days_since_invoice_paid: r.days_since_invoice_paid,
    days_since_opp_update: r.days_since_opp_update,
  }))

  // 2. Top layer totals + coverage
  const totals = projects.reduce(
    (acc, p) => ({
      income: acc.income + p.income_fy,
      expenses: acc.expenses + p.expenses_fy,
      receivables: acc.receivables + p.receivables,
      pipelineWeighted: acc.pipelineWeighted + p.pipeline_weighted,
      grantsInFlight: acc.grantsInFlight + p.grants_in_flight,
      txnTotal: acc.txnTotal + p.txn_count_fy,
      txnUntagged: acc.txnUntagged + p.txn_untagged_fy,
      invTotal: acc.invTotal + p.inv_count_fy,
      invUntagged: acc.invUntagged + p.inv_untagged_fy,
      oppTotal: acc.oppTotal + p.opp_open_count,
      oppUntagged: acc.oppUntagged + p.opp_untagged_count,
    }),
    { income: 0, expenses: 0, receivables: 0, pipelineWeighted: 0, grantsInFlight: 0, txnTotal: 0, txnUntagged: 0, invTotal: 0, invUntagged: 0, oppTotal: 0, oppUntagged: 0 },
  )

  // 3. Global coverage — use aggregate counts to dodge the 1000-row default cap.
  const coverage = await Promise.all([
    countCoverage('xero_transactions', q => q.gte('date', FY_START).lte('date', FY_END)),
    countCoverage('xero_invoices', q => q.eq('type', 'ACCREC').gte('date', FY_START).lte('date', FY_END)),
    countCoverage('ghl_opportunities (open)', q => q.eq('status', 'open'), 'ghl_opportunities'),
  ])

  // 4. Drift queue
  const drift = await loadDriftQueue()

  // 5. Cash in bank — sum live balances from xero_bank_accounts (mirrors /finance/overview)
  const cashInBank = await loadCashInBank()

  // 6. Build projected incoming 90d stack
  const projectedIncoming90d = totals.receivables + totals.pipelineWeighted + totals.grantsInFlight
  const incomingStack = [
    { source: 'Receivables (Xero AR)', amount: totals.receivables, note: 'Unpaid AUTHORISED/SUBMITTED invoices' },
    { source: 'Pipeline (weighted)', amount: totals.pipelineWeighted, note: 'GHL opportunities × stage probability' },
    { source: 'Grants in flight', amount: totals.grantsInFlight, note: 'submitted / in_review / interview' },
    { source: 'Recurring (contracted)', amount: 0, note: 'TODO — wire to xero_recurring_invoices when populated' },
  ]

  const response: CommandResponse = {
    generatedAt: new Date().toISOString(),
    fy: { start: FY_START, end: FY_END },
    top: {
      cashInBank,
      fyIncome: totals.income,
      fyExpenses: totals.expenses,
      fyNet: totals.income - totals.expenses,
      receivables: totals.receivables,
      pipelineWeighted: totals.pipelineWeighted,
      grantsInFlight: totals.grantsInFlight,
      projectedIncoming90d,
      incomingStack,
    },
    middle: {
      coverage,
      projects: projects.filter(p =>
        p.txn_count_fy > 0 || p.inv_count_fy > 0 || p.opp_open_count > 0 || p.grants_in_flight_count > 0,
      ),
      drift,
    },
    bottom: {
      actionLinks: [
        { href: '/finance/workbench', label: 'Workbench', note: 'fix tags / receipts' },
        { href: '/finance/pipeline', label: 'Pipeline', note: 'forecast detail' },
        { href: '/finance/projects', label: 'Projects P&L', note: 'per-project deep-dive' },
        { href: '/finance/overview', label: 'CEO cockpit', note: 'exec read view' },
      ],
    },
  }

  return NextResponse.json(response)
}

async function countCoverage(
  displayName: string,
  filter: (q: any) => any,
  tableOverride?: string,
) {
  const table = tableOverride ?? displayName
  const [totalRes, taggedRes] = await Promise.all([
    filter(supabase.from(table).select('*', { count: 'exact', head: true })),
    filter(supabase.from(table).select('*', { count: 'exact', head: true }).not('project_code', 'is', null)),
  ])
  const total = totalRes.count ?? 0
  const tagged = taggedRes.count ?? 0
  return {
    source: displayName,
    total,
    tagged,
    pct: total === 0 ? 0 : Math.round((tagged / total) * 1000) / 10,
  }
}

async function loadDriftQueue(): Promise<DriftItem[]> {
  const [{ data: invs }, { data: opps }, { data: txns }, { data: mismatched }] = await Promise.all([
    supabase
      .from('xero_invoices')
      .select('xero_id, invoice_number, contact_name, type, status, date, due_date, total')
      .gte('date', FY_START)
      .is('project_code', null)
      .order('total', { ascending: false })
      .limit(15),
    supabase
      .from('ghl_opportunities')
      .select('ghl_id, name, pipeline_name, stage_name, monetary_value, last_stage_change_at')
      .eq('status', 'open')
      .is('project_code', null)
      .order('monetary_value', { ascending: false, nullsFirst: false })
      .limit(15),
    supabase
      .from('xero_transactions')
      .select('xero_transaction_id, contact_name, type, status, date, total, bank_account')
      .gte('date', FY_START)
      .is('project_code', null)
      .order('total', { ascending: false })
      .limit(15),
    supabase
      .from('xero_invoices')
      .select('xero_id, invoice_number, contact_name, type, status, date, total, project_code, tracking_option_1')
      .gte('date', FY_START)
      .not('project_code', 'is', null)
      .not('tracking_option_1', 'is', null)
      .order('total', { ascending: false })
      .limit(100),
  ])

  const items: DriftItem[] = []
  for (const r of invs ?? []) {
    items.push({
      kind: 'invoice',
      reason: 'untagged',
      id: r.xero_id,
      label: `${r.contact_name ?? 'Unknown'} · ${r.invoice_number ?? ''}`.trim(),
      amount: Number(r.total ?? 0),
      meta: { type: r.type, status: r.status, date: r.date, due_date: r.due_date },
      workbenchUrl: '/finance/workbench?source=xero_invoices&status=needs_project',
    })
  }
  for (const r of opps ?? []) {
    items.push({
      kind: 'opportunity',
      reason: 'untagged',
      id: r.ghl_id,
      label: `${r.name ?? 'Unnamed'} · ${r.pipeline_name ?? ''}`.trim(),
      amount: Number(r.monetary_value ?? 0),
      meta: { pipeline: r.pipeline_name, stage: r.stage_name, last_change: r.last_stage_change_at },
      workbenchUrl: null,
    })
  }
  for (const r of txns ?? []) {
    items.push({
      kind: 'transaction',
      reason: 'untagged',
      id: r.xero_transaction_id,
      label: `${r.contact_name ?? 'Unknown'} · ${r.type}`,
      amount: Number(r.total ?? 0),
      meta: { type: r.type, status: r.status, date: r.date, bank_account: r.bank_account },
      workbenchUrl: '/finance/workbench?source=xero_transactions&status=needs_project',
    })
  }
  for (const r of (mismatched ?? []).filter(row => {
    const code = String(row.project_code ?? '').toUpperCase().trim()
    const tracking = String(row.tracking_option_1 ?? '').toUpperCase().trim()
    if (!code || !tracking) return false
    return code !== tracking && !tracking.includes(code) && !code.includes(tracking)
  }).slice(0, 10)) {
    items.push({
      kind: 'invoice',
      reason: 'mismatch',
      id: r.xero_id,
      label: `${r.contact_name ?? 'Unknown'} · ${r.invoice_number ?? ''}`.trim(),
      amount: Number(r.total ?? 0),
      meta: { project_code: r.project_code, tracking_option_1: r.tracking_option_1, date: r.date },
      workbenchUrl: '/finance/workbench?source=xero_invoices&status=project_review',
    })
  }

  items.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  return items.slice(0, 10)
}

async function loadCashInBank(): Promise<number | null> {
  const { data, error } = await supabase
    .from('xero_bank_accounts')
    .select('current_balance, status')
  if (error || !data || data.length === 0) return null
  const total = data
    .filter(a => a.status !== 'ARCHIVED')
    .reduce((sum, a) => sum + Number(a.current_balance ?? 0), 0)
  return Number.isFinite(total) ? total : null
}
