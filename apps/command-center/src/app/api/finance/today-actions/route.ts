import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-dynamic'

const FY_START = '2025-07-01'
const FY_END = '2026-06-30'

async function countUntaggedTransactions() {
  const { count } = await supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .gte('date', FY_START)
    .lte('date', FY_END)
    .or('project_code.is.null,project_code.eq.UNKNOWN')
  return count ?? 0
}

async function countUntaggedInvoices() {
  const { count } = await supabase
    .from('xero_invoices')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'ACCREC')
    .gte('date', FY_START)
    .or('project_code.is.null,project_code.eq.UNKNOWN')
  return count ?? 0
}

async function countReceiptsReadyToAttach() {
  // Approved best-candidate links with attach_file action — the attach_evidence queue.
  const { count } = await supabase
    .from('finance_receipt_bank_line_links')
    .select('*', { count: 'exact', head: true })
    .eq('link_status', 'approved')
    .eq('is_best_candidate', true)
    .eq('xero_action', 'attach_file')
  return count ?? 0
}

async function countAIRoutingSuggestions() {
  // Pending high-conf AI suggestions waiting for review/accept
  const { count } = await supabase
    .from('finance_ai_routing_suggestions')
    .select('*', { count: 'exact', head: true })
    .gte('confidence', 0.85)
    .eq('applied_to_source', false)
    .is('rejected_at', null)
  return count ?? 0
}

async function countOverdueAR() {
  const today = new Date().toISOString().slice(0, 10)
  const { count } = await supabase
    .from('xero_invoices')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'ACCREC')
    .eq('status', 'AUTHORISED')
    .gt('amount_due', 0)
    .lt('due_date', today)
  return count ?? 0
}

function daysSinceLastWeeklyNarrative() {
  // wiki/cockpit/weekly-narrative-YYYY-MM-DD.md
  const wikiDir = path.resolve(process.cwd(), '..', '..', 'wiki', 'cockpit')
  if (!existsSync(wikiDir)) return null
  try {
    const files = readdirSync(wikiDir).filter((f) => f.startsWith('weekly-narrative-') && f.endsWith('.md'))
    if (!files.length) return null
    files.sort()
    const latest = files[files.length - 1]
    const match = latest.match(/(\d{4}-\d{2}-\d{2})/)
    if (!match) return null
    const last = new Date(`${match[1]}T00:00:00Z`)
    const now = new Date()
    return Math.floor((now.getTime() - last.getTime()) / 86400000)
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const [
      untaggedTxns,
      untaggedInvs,
      receiptsReady,
      aiSuggestions,
      overdueAR,
    ] = await Promise.all([
      countUntaggedTransactions(),
      countUntaggedInvoices(),
      countReceiptsReadyToAttach(),
      countAIRoutingSuggestions(),
      countOverdueAR(),
    ])
    const narrativeAge = daysSinceLastWeeklyNarrative()

    const signals: Array<{
      severity: 'high' | 'medium' | 'low'
      label: string
      detail: string
      href: string
      count?: number
    }> = []

    if (untaggedTxns > 0) {
      signals.push({
        severity: untaggedTxns > 50 ? 'high' : untaggedTxns > 10 ? 'medium' : 'low',
        label: `${untaggedTxns} untagged transactions`,
        detail: 'Workbench filter=needs_project',
        href: '/finance/workbench?status=needs_project',
        count: untaggedTxns,
      })
    }

    if (receiptsReady > 0) {
      signals.push({
        severity: receiptsReady > 20 ? 'high' : 'medium',
        label: `${receiptsReady} receipts ready to attach`,
        detail: 'Run xero-copilot-execute --apply or use copilot',
        href: '/finance/workbench?status=candidate_receipts',
        count: receiptsReady,
      })
    }

    if (aiSuggestions > 0) {
      signals.push({
        severity: aiSuggestions > 30 ? 'high' : 'medium',
        label: `${aiSuggestions} AI suggestions ≥85%`,
        detail: 'Review and accept in workbench',
        href: '/finance/workbench?status=needs_project',
        count: aiSuggestions,
      })
    }

    if (overdueAR > 0) {
      signals.push({
        severity: overdueAR > 5 ? 'high' : 'medium',
        label: `${overdueAR} overdue invoices`,
        detail: 'AR past due_date',
        href: '/finance/invoices?filter=overdue',
        count: overdueAR,
      })
    }

    if (untaggedInvs > 0) {
      signals.push({
        severity: untaggedInvs > 10 ? 'medium' : 'low',
        label: `${untaggedInvs} untagged AR invoices`,
        detail: 'Money Command drift queue',
        href: '/finance/command',
        count: untaggedInvs,
      })
    }

    if (narrativeAge !== null && narrativeAge > 7) {
      signals.push({
        severity: 'medium',
        label: `Last weekly narrative ${narrativeAge} days ago`,
        detail: 'node scripts/narrate-weekly-digest.mjs --telegram',
        href: '/finance/command',
      })
    }

    // Top 3 by severity
    const sevOrder = { high: 0, medium: 1, low: 2 } as const
    signals.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity])
    const top3 = signals.slice(0, 3)

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      hasWork: top3.length > 0,
      signals: top3,
      counts: {
        untaggedTxns,
        untaggedInvs,
        receiptsReady,
        aiSuggestions,
        overdueAR,
        narrativeAgeDays: narrativeAge,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message?.slice(0, 300) || 'failed' },
      { status: 500 },
    )
  }
}
