import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { execSync } from 'child_process'

const RD_PROJECTS = [
  { code: 'ACT-EL', name: 'Empathy Ledger', type: 'core' as const },
  { code: 'ACT-IN', name: 'Infrastructure / ALMA', type: 'core' as const },
  { code: 'ACT-JH', name: 'JusticeHub', type: 'supporting' as const },
  { code: 'ACT-GD', name: 'Goods on Country', type: 'supporting' as const },
]

const GIT_KEYWORDS: Record<string, string[]> = {
  'ACT-EL': ['empathy', 'ledger', 'storytell', 'narrative', 'consent'],
  'ACT-IN': ['agent', 'bot', 'alma', 'llm', 'ai', 'intelligence', 'embedding', 'vector'],
  'ACT-JH': ['justice', 'hub', 'justicehub', 'youth', 'diversion'],
  'ACT-GD': ['goods', 'fleet', 'wash', 'telemetry', 'particle', 'iot'],
}

interface EvidenceSummary {
  project: string
  project_name: string
  rd_type: 'core' | 'supporting'
  git_commits: number
  git_hours: number
  calendar_events: number
  calendar_hours: number
  total_spend: number
  rd_offset: number
  receipt_coverage_pct: number
  receipts_missing: number
  email_count: number
  knowledge_count: number
  strength_score: number
  strength_rating: string
  flags: string[]
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectFilter = searchParams.get('project')

    // Australian FY
    const now = new Date()
    const fyStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
    const startDate = `${fyStart}-07-01`
    const endDate = now.toISOString().split('T')[0]

    const projects = projectFilter
      ? RD_PROJECTS.filter(p => p.code === projectFilter)
      : RD_PROJECTS

    const evidence: EvidenceSummary[] = await Promise.all(
      projects.map(p => collectEvidence(p, startDate, endDate))
    )

    const totalSpend = evidence.reduce((s, e) => s + e.total_spend, 0)
    const totalOffset = evidence.reduce((s, e) => s + e.rd_offset, 0)
    const totalMissing = evidence.reduce((s, e) => s + e.receipts_missing, 0)
    const avgStrength = Math.round(evidence.reduce((s, e) => s + e.strength_score, 0) / evidence.length)

    return NextResponse.json({
      period: { start: startDate, end: endDate, fy: `FY${fyStart}-${(fyStart + 1).toString().slice(2)}` },
      projects: evidence,
      totals: {
        eligible_spend: Math.round(totalSpend * 100) / 100,
        potential_refund: Math.round(totalOffset * 100) / 100,
        receipts_missing: totalMissing,
        refund_at_risk: Math.round(totalMissing * 300 * 0.435 * 100) / 100, // est $300 avg per missing receipt
        avg_evidence_strength: avgStrength,
      },
    })
  } catch (error) {
    console.error('R&D evidence API error:', error)
    return NextResponse.json({ error: 'Failed to collect R&D evidence' }, { status: 500 })
  }
}

async function collectEvidence(
  project: { code: string; name: string; type: 'core' | 'supporting' },
  startDate: string,
  endDate: string
): Promise<EvidenceSummary> {
  // Run all queries in parallel
  const [gitData, calendarData, spendData, emailCount, knowledgeCount] = await Promise.all([
    getGitCommitCount(project.code, startDate, endDate),
    getCalendarData(project.code, startDate, endDate),
    getSpendData(project.code, startDate, endDate),
    getEmailCount(project.code, startDate, endDate),
    getKnowledgeCount(project.code, startDate, endDate),
  ])

  // Calculate evidence strength
  let score = 0
  const flags: string[] = []

  if (gitData.count >= 20) score += 30
  else if (gitData.count >= 10) score += 20
  else if (gitData.count >= 1) score += 10
  else flags.push('No git commits')

  if (calendarData.count >= 10) score += 20
  else if (calendarData.count >= 3) score += 15
  else if (calendarData.count >= 1) score += 5
  else flags.push('No calendar events')

  if (spendData.total > 0) {
    score += 10
    if (spendData.receiptPct >= 90) score += 20
    else if (spendData.receiptPct >= 70) score += 10
    else flags.push(`Receipt coverage ${spendData.receiptPct}%`)
  } else {
    flags.push('No tracked spend')
  }

  if (emailCount >= 10) score += 10
  else if (emailCount >= 1) score += 5

  if (knowledgeCount >= 5) score += 10
  else if (knowledgeCount >= 1) score += 5

  let rating: string
  if (score >= 80) rating = 'strong'
  else if (score >= 50) rating = 'adequate'
  else if (score >= 25) rating = 'weak'
  else rating = 'insufficient'

  return {
    project: project.code,
    project_name: project.name,
    rd_type: project.type,
    git_commits: gitData.count,
    git_hours: gitData.count * 2,
    calendar_events: calendarData.count,
    calendar_hours: calendarData.hours,
    total_spend: spendData.total,
    rd_offset: Math.round(spendData.total * 0.435 * 100) / 100,
    receipt_coverage_pct: spendData.receiptPct,
    receipts_missing: spendData.missing,
    email_count: emailCount,
    knowledge_count: knowledgeCount,
    strength_score: score,
    strength_rating: rating,
    flags,
  }
}

function getGitCommitCount(projectCode: string, startDate: string, endDate: string): { count: number } {
  const keywords = GIT_KEYWORDS[projectCode] || []
  if (keywords.length === 0) return { count: 0 }

  try {
    const grepPattern = keywords.join('\\|')
    const result = execSync(
      `git log --after="${startDate}" --before="${endDate}" --oneline --all --grep="${grepPattern}" -i 2>/dev/null | wc -l`,
      { cwd: process.cwd(), encoding: 'utf-8', timeout: 5000 }
    ).trim()
    return { count: parseInt(result) || 0 }
  } catch {
    return { count: 0 }
  }
}

async function getCalendarData(projectCode: string, startDate: string, endDate: string): Promise<{ count: number; hours: number }> {
  const keywords = GIT_KEYWORDS[projectCode] || []
  const keywordPattern = keywords.map(k => `title.ilike.%${k}%`).join(',')

  const { data } = await supabase
    .from('calendar_events')
    .select('start_time, end_time')
    .gte('start_time', startDate)
    .lte('start_time', endDate)
    .or(keywordPattern || 'title.ilike.%unlikely_match%')
    .limit(200)

  const events = data || []
  const hours = events.reduce((sum, e) => {
    if (!e.end_time) return sum + 1
    const dur = (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 3600000
    return sum + Math.min(dur, 8)
  }, 0)

  return { count: events.length, hours: Math.round(hours * 10) / 10 }
}

async function getSpendData(projectCode: string, startDate: string, endDate: string): Promise<{ total: number; receiptPct: number; missing: number }> {
  const { data: txns } = await supabase
    .from('xero_transactions')
    .select('total')
    .eq('project_code', projectCode)
    .lt('total', 0)
    .gte('date', startDate)
    .lte('date', endDate)

  const { data: invoices } = await supabase
    .from('xero_invoices')
    .select('has_attachments')
    .eq('type', 'ACCPAY')
    .eq('project_code', projectCode)
    .gte('date', startDate)
    .lte('date', endDate)

  const total = (txns || []).reduce((s, t) => s + Math.abs(t.total), 0)
  const bills = invoices || []
  const withReceipts = bills.filter(b => b.has_attachments).length
  const missing = bills.length - withReceipts
  const receiptPct = bills.length > 0 ? Math.round((withReceipts / bills.length) * 100) : 100

  return { total: Math.round(total * 100) / 100, receiptPct, missing }
}

async function getEmailCount(projectCode: string, startDate: string, endDate: string): Promise<number> {
  const { count } = await supabase
    .from('communications')
    .select('*', { count: 'exact', head: true })
    .eq('project_code', projectCode)
    .gte('date', startDate)
    .lte('date', endDate)

  return count || 0
}

async function getKnowledgeCount(projectCode: string, startDate: string, endDate: string): Promise<number> {
  const { count } = await supabase
    .from('project_knowledge')
    .select('*', { count: 'exact', head: true })
    .eq('project_code', projectCode)
    .gte('recorded_at', startDate)
    .lte('recorded_at', endDate)

  return count || 0
}
