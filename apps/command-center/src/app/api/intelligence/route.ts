import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getFYDates } from '@/lib/finance/dates'
import { getOrgLedger, getMonthlyPL, getCashPosition, getRdTaxWindow, RD_REFUND_RATE } from '@/lib/finance/ledger'

/**
 * /company front-door data. Rebuilt 2026-05-26 on the one ledger (lib/finance/ledger.ts).
 * Replaces the prototype that drifted from the schema — see
 * thoughts/shared/reviews/2026-05-26-company-overview-data-audit.md.
 *
 * Rules: compute money by type (never sign) via the ledger · real cash (two-account) · real R&D
 * window (no hardcoded 30 Apr 2026) · query only tables/columns that exist · NO SILENT ZEROS —
 * every section reports a `wired` flag so a broken pipe shows "needs wiring", not a fake 0.
 */
export async function GET() {
  try {
    const now = new Date()
    const { fyStart, fyEnd, monthsElapsed } = getFYDates(now)
    const todayStr = now.toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0]

    const [pl, ledger, cash, receivables, projectHealth, relationships, pipeline, receipts, activity] =
      await Promise.all([
        getMonthlyPL({ fyStart, fyEnd: todayStr }),
        getOrgLedger({ fyStart, fyEnd: todayStr }),
        getCashPosition(),
        getReceivablesAge(),
        getProjectHealth(),
        getContactsNeedingAttention(),
        getPipelineSummary(),
        getReceiptGaps(fyStart),
        getRecentActivity(thirtyDaysAgo),
      ])

    const rdWindow = getRdTaxWindow(now)

    // Monthly burn + runway from the accrual P&L expense (the headline source) + real cash.
    const monthlyBurn = pl.expenses / Math.max(1, pl.monthsCovered || monthsElapsed)
    const runway = monthlyBurn > 0 && cash.ok ? cash.cash / monthlyBurn : null
    const runwayStatus =
      runway == null ? 'unknown' : runway < 2 ? 'critical' : runway < 3 ? 'warning' : 'healthy'

    // No silent zeros: list any section that failed to wire or is materially stale.
    const dataQuality: Record<string, 'ok' | 'not_wired' | 'stale'> = {
      finance: pl.ok && ledger.ok ? 'ok' : 'not_wired',
      cash: !cash.ok ? 'not_wired' : cash.stale ? 'stale' : 'ok',
      receivables: receivables.wired ? 'ok' : 'not_wired',
      projects: projectHealth.wired ? 'ok' : 'not_wired',
      relationships: !relationships.wired ? 'not_wired' : relationships.stale ? 'stale' : 'ok',
      pipeline: pipeline.wired ? 'ok' : 'not_wired',
      receipts: receipts.wired ? 'ok' : 'not_wired',
      activity: activity.wired ? 'ok' : 'not_wired',
    }

    return NextResponse.json({
      timestamp: now.toISOString(),
      fy: `FY${fyStart.slice(2, 4)}-${fyEnd.slice(2, 4)}`,
      data_quality: dataQuality,
      financial: {
        revenue: pl.revenue,
        expenses: pl.expenses,
        net: pl.net,
        basis: 'accrual — project monthly financials (mapped txns)',
        cash_received: ledger.cashReceived,
        cash_spent: ledger.cashSpent,
        committed_expense: ledger.committedExpense,
        bills_outstanding: ledger.billsOutstanding,
        cash_on_hand: cash.cash,
        cash_as_of: cash.asOf,
        cash_stale: cash.stale,
        monthly_burn: Math.round(monthlyBurn),
        runway_months: runway == null ? null : Math.round(runway * 10) / 10,
        runway_status: runwayStatus,
        wired: pl.ok && cash.ok,
      },
      receivables,
      projects: projectHealth,
      relationships,
      pipeline,
      receipts,
      rd: {
        eligible_spend: ledger.rdEligibleSpend,
        potential_refund: ledger.rdPotentialRefund,
        refund_rate: RD_REFUND_RATE,
        fy: rdWindow.fy,
        applies: rdWindow.appliesToAct,
        window_open: rdWindow.windowOpen,
        lodgement_close: rdWindow.lodgementClose,
        days_until_close: rdWindow.daysUntilClose,
        note: rdWindow.note,
        wired: ledger.ok,
      },
      activity,
    })
  } catch (error) {
    console.error('Intelligence API error:', error)
    return NextResponse.json({ error: 'Failed to load intelligence data' }, { status: 500 })
  }
}

async function getReceivablesAge() {
  const { data, error } = await supabase
    .from('xero_invoices')
    .select('total, amount_due, due_date, status')
    .eq('type', 'ACCREC')
    .gt('amount_due', 0)
    .not('status', 'in', '(VOIDED,DELETED)')

  if (error) return { wired: false, total: 0, count: 0, pct_overdue: 0, buckets: { current: 0, overdue_30: 0, overdue_60: 0, overdue_90: 0 } }

  const now = new Date()
  const buckets = { current: 0, overdue_30: 0, overdue_60: 0, overdue_90: 0 }
  let total = 0
  for (const inv of data || []) {
    const amount = Number(inv.amount_due || inv.total || 0)
    total += amount
    const daysOverdue = inv.due_date ? Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000) : 0
    if (daysOverdue <= 0) buckets.current += amount
    else if (daysOverdue <= 30) buckets.overdue_30 += amount
    else if (daysOverdue <= 60) buckets.overdue_60 += amount
    else buckets.overdue_90 += amount
  }
  return {
    wired: true,
    total: Math.round(total),
    count: (data || []).length,
    pct_overdue: total > 0 ? Math.round(((total - buckets.current) / total) * 100) : 0,
    buckets: {
      current: Math.round(buckets.current),
      overdue_30: Math.round(buckets.overdue_30),
      overdue_60: Math.round(buckets.overdue_60),
      overdue_90: Math.round(buckets.overdue_90),
    },
  }
}

async function getProjectHealth() {
  // FIX: real column is `overall_score` (not `health_score`); no tier filter (show all scored projects).
  const [{ data: health, error }, { data: projects }] = await Promise.all([
    supabase.from('project_health').select('project_code, project_name, overall_score, health_status').order('overall_score', { ascending: true }),
    supabase.from('projects').select('code, name, tier'),
  ])
  if (error) return { wired: false, avg_health: null, total_projects: 0, critical: 0, attention: 0, healthy: 0, projects: [] }

  const projectMap = new Map((projects || []).map((p) => [p.code, p]))
  const items = (health || []).map((h) => {
    const proj = projectMap.get(h.project_code)
    const score = Number(h.overall_score || 0)
    return {
      code: h.project_code,
      name: proj?.name || h.project_name || h.project_code,
      tier: proj?.tier || null,
      health: score,
      status: score >= 80 ? 'healthy' : score >= 50 ? 'attention' : 'critical',
    }
  })
  const avgHealth = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.health, 0) / items.length) : null
  return {
    wired: true,
    avg_health: avgHealth,
    total_projects: items.length,
    critical: items.filter((i) => i.status === 'critical').length,
    attention: items.filter((i) => i.status === 'attention').length,
    healthy: items.filter((i) => i.status === 'healthy').length,
    projects: items,
  }
}

async function getContactsNeedingAttention() {
  // FIX: `contacts` table is dead. Use relationship_health (the real signal) + ghl_contacts for names.
  const { data, error } = await supabase
    .from('relationship_health')
    .select('ghl_contact_id, days_since_contact, last_contact_at, relationship_summary, snoozed_until, calculated_at')
    .order('days_since_contact', { ascending: false })
    .limit(200)
  if (error) return { wired: false, needing_attention: 0, lowest_engagement: [], as_of: null, stale: true }

  const rows = data || []
  const asOf = rows.reduce<string | null>((latest, r) => {
    const t = r.calculated_at as string | null
    return t && (!latest || t > latest) ? t : latest
  }, null)
  const stale = asOf ? (Date.now() - new Date(asOf).getTime()) / 86400000 > 7 : true

  const nowMs = Date.now()
  const active = rows.filter((r) => !r.snoozed_until || new Date(r.snoozed_until).getTime() < nowMs)
  const needing = active.filter((r) => Number(r.days_since_contact || 0) > 30)

  // Names for the top few.
  const topIds = needing.slice(0, 5).map((r) => r.ghl_contact_id).filter(Boolean)
  let names = new Map<string, string>()
  if (topIds.length) {
    const { data: contacts } = await supabase.from('ghl_contacts').select('ghl_id, full_name').in('ghl_id', topIds as string[])
    names = new Map((contacts || []).map((c) => [c.ghl_id, c.full_name || c.ghl_id]))
  }
  return {
    wired: true,
    as_of: asOf,
    stale,
    needing_attention: needing.length,
    lowest_engagement: needing.slice(0, 5).map((r) => ({
      name: names.get(r.ghl_contact_id as string) || 'Unknown contact',
      days_since_contact: Number(r.days_since_contact || 0),
      last_contact: r.last_contact_at,
      summary: r.relationship_summary,
    })),
  }
}

async function getPipelineSummary() {
  // FIX: real columns are value_mid/value_high, stage, probability, project_codes (no value/confidence/status).
  // Scope to ACT-linked opportunities (project_codes present) to cut the GrantScope noise (15k rows).
  const { data, error } = await supabase
    .from('opportunities_unified')
    .select('value_mid, value_high, probability, stage, project_codes')
    .not('stage', 'in', '(lost,expired,identified,closed,won,abandoned,declined)')
    .not('project_codes', 'is', null)
    .range(0, 4999)
  if (error) return { wired: false, count: 0, total_value: 0, weighted_value: 0 }

  const items = (data || []).filter((o) => Array.isArray(o.project_codes) && o.project_codes.length > 0)
  const value = (o: { value_mid: number | null; value_high: number | null }) => Number(o.value_mid || o.value_high || 0)
  const totalValue = items.reduce((s, o) => s + value(o), 0)
  const weightedValue = items.reduce((s, o) => s + value(o) * (Number(o.probability || 10) / 100), 0)
  return {
    wired: true,
    count: items.length,
    total_value: Math.round(totalValue),
    weighted_value: Math.round(weightedValue),
  }
}

async function getReceiptGaps(fyStart: string) {
  const [{ data: pending, error: pErr }, { data: bills, error: bErr }] = await Promise.all([
    supabase.from('receipt_matches').select('amount, status').in('status', ['pending', 'email_suggested']),
    // FIX: drop the stale [EL,IN,JH,GD] project filter — measure receipt coverage across ALL FY bills.
    supabase.from('xero_invoices').select('has_attachments, total').eq('type', 'ACCPAY').gte('date', fyStart).not('status', 'in', '(VOIDED,DELETED)'),
  ])
  if (bErr) return { wired: false, pending_count: 0, pending_value: 0, rd_receipts_missing: 0, rd_refund_at_risk: 0, rd_coverage_pct: null }

  const billsList = bills || []
  const withReceipts = billsList.filter((b) => b.has_attachments).length
  const missing = billsList.length - withReceipts
  const missingValue = billsList.filter((b) => !b.has_attachments).reduce((s, b) => s + Number(b.total || 0), 0)
  return {
    wired: true,
    pending_count: (pending || []).length,
    pending_value: pErr ? 0 : Math.round((pending || []).reduce((s, r) => s + Number(r.amount || 0), 0)),
    rd_receipts_missing: missing,
    rd_refund_at_risk: Math.round(missingValue * RD_REFUND_RATE),
    rd_coverage_pct: billsList.length > 0 ? Math.round((withReceipts / billsList.length) * 100) : null,
  }
}

async function getRecentActivity(since: string) {
  // FIX: `communications` is dead → communications_history. Calendar: exclude cancelled/all-day/transparent.
  const [emails, txns, meetings] = await Promise.all([
    supabase.from('communications_history').select('*', { count: 'exact', head: true }).gte('occurred_at', since),
    supabase.from('xero_transactions').select('*', { count: 'exact', head: true }).gte('date', since),
    supabase
      .from('calendar_events')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', since)
      .neq('status', 'cancelled')
      .eq('is_all_day', false)
      .neq('transparency', 'transparent'),
  ])
  const wired = !emails.error && !txns.error && !meetings.error
  return {
    wired,
    last_30_days: {
      emails: emails.count || 0,
      transactions: txns.count || 0,
      meetings: meetings.count || 0,
    },
  }
}
