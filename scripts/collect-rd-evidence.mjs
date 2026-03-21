#!/usr/bin/env node

/**
 * R&D Evidence Auto-Collector
 *
 * Collects contemporaneous evidence for R&D Tax Incentive claims across:
 * - Git commits (experimental development work)
 * - Calendar events (design meetings, research sessions)
 * - Xero spend (eligible expenses with receipts)
 * - Communications (project-related emails)
 * - Knowledge base (documented learnings)
 *
 * Generates monthly activity registers per R&D project.
 *
 * Usage:
 *   node scripts/collect-rd-evidence.mjs                    # Current FY, all R&D projects
 *   node scripts/collect-rd-evidence.mjs --project ACT-EL   # Single project
 *   node scripts/collect-rd-evidence.mjs --month 2026-02    # Specific month
 *   node scripts/collect-rd-evidence.mjs --output json      # JSON output (for API)
 */

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const RD_PROJECTS = [
  { code: 'ACT-EL', name: 'Empathy Ledger', type: 'core', description: 'Novel community narrative platform — experimental NLP, consent-based storytelling' },
  { code: 'ACT-IN', name: 'Infrastructure / ALMA', type: 'core', description: 'AI agent orchestration, multi-provider LLM routing, agentic tool systems' },
  { code: 'ACT-JH', name: 'JusticeHub', type: 'supporting', description: 'Justice system data platform — data integration, outcome tracking' },
  { code: 'ACT-GD', name: 'Goods on Country', type: 'supporting', description: 'IoT fleet telemetry, social enterprise marketplace — Particle.io integration' },
]

const GIT_KEYWORDS = {
  'ACT-EL': ['empathy', 'ledger', 'storytell', 'narrative', 'consent', 'el-', 'empathy-ledger'],
  'ACT-IN': ['agent', 'bot', 'alma', 'llm', 'ai', 'intelligence', 'embedding', 'vector', 'tool-use', 'rag'],
  'ACT-JH': ['justice', 'hub', 'justicehub', 'jh-', 'youth', 'diversion'],
  'ACT-GD': ['goods', 'fleet', 'wash', 'telemetry', 'particle', 'iot', 'asset'],
}

// Parse args
const args = process.argv.slice(2)
const projectFilter = args.includes('--project') ? args[args.indexOf('--project') + 1] : null
const monthFilter = args.includes('--month') ? args[args.indexOf('--month') + 1] : null
const outputFormat = args.includes('--output') ? args[args.indexOf('--output') + 1] : 'text'
const verbose = args.includes('--verbose')

async function main() {
  const projects = projectFilter
    ? RD_PROJECTS.filter(p => p.code === projectFilter)
    : RD_PROJECTS

  if (projects.length === 0) {
    console.error(`Unknown project: ${projectFilter}. Valid: ${RD_PROJECTS.map(p => p.code).join(', ')}`)
    process.exit(1)
  }

  // Determine date range
  const now = new Date()
  let startDate, endDate
  if (monthFilter) {
    const [year, month] = monthFilter.split('-').map(Number)
    startDate = new Date(year, month - 1, 1)
    endDate = new Date(year, month, 0) // last day of month
  } else {
    // Current Australian FY (Jul-Jun)
    const fyStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
    startDate = new Date(fyStart, 6, 1) // Jul 1
    endDate = now
  }

  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  if (!outputFormat.includes('json')) {
    console.log(`\n═══ R&D Evidence Collector ═══`)
    console.log(`Period: ${startStr} to ${endStr}`)
    console.log(`Projects: ${projects.map(p => p.code).join(', ')}\n`)
  }

  const allEvidence = []

  for (const project of projects) {
    const evidence = await collectProjectEvidence(project, startStr, endStr)
    allEvidence.push(evidence)

    if (!outputFormat.includes('json')) {
      printProjectEvidence(evidence)
    }
  }

  if (outputFormat === 'json') {
    console.log(JSON.stringify(allEvidence, null, 2))
  } else {
    printSummary(allEvidence, startStr, endStr)
  }
}

async function collectProjectEvidence(project, startDate, endDate) {
  const [gitCommits, calendarEvents, xeroSpend, emails, knowledge] = await Promise.all([
    collectGitCommits(project, startDate, endDate),
    collectCalendarEvents(project, startDate, endDate),
    collectXeroSpend(project, startDate, endDate),
    collectEmails(project, startDate, endDate),
    collectKnowledge(project, startDate, endDate),
  ])

  // Calculate evidence strength
  const strength = calculateEvidenceStrength(gitCommits, calendarEvents, xeroSpend, emails, knowledge)

  return {
    project: project.code,
    project_name: project.name,
    rd_type: project.type,
    description: project.description,
    period: { start: startDate, end: endDate },
    evidence: {
      git_commits: gitCommits,
      calendar_events: calendarEvents,
      xero_spend: xeroSpend,
      emails: emails,
      knowledge: knowledge,
    },
    strength,
  }
}

async function collectGitCommits(project, startDate, endDate) {
  const keywords = GIT_KEYWORDS[project.code] || []
  if (keywords.length === 0) return { count: 0, items: [], hours_estimated: 0 }

  try {
    // Search git log for relevant commits
    const grepPattern = keywords.join('\\|')
    const gitLog = execSync(
      `git log --after="${startDate}" --before="${endDate}" --oneline --all --grep="${grepPattern}" -i 2>/dev/null || true`,
      { cwd: process.cwd(), encoding: 'utf-8', timeout: 10000 }
    ).trim()

    const commits = gitLog
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, ...rest] = line.split(' ')
        return { hash, message: rest.join(' ') }
      })

    // Also check file paths for project-specific directories
    const pathCommits = execSync(
      `git log --after="${startDate}" --before="${endDate}" --oneline --all -- '*${project.code.toLowerCase()}*' '*${project.name.toLowerCase().replace(/\s+/g, '-')}*' 2>/dev/null || true`,
      { cwd: process.cwd(), encoding: 'utf-8', timeout: 10000 }
    ).trim()

    const pathItems = pathCommits
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, ...rest] = line.split(' ')
        return { hash, message: rest.join(' ') }
      })

    // Deduplicate by hash
    const allCommits = new Map()
    for (const c of [...commits, ...pathItems]) {
      if (c.hash) allCommits.set(c.hash, c)
    }

    const items = Array.from(allCommits.values())
    // Rough estimate: 2 hours per commit (conservative for R&D documentation)
    const hours_estimated = items.length * 2

    return { count: items.length, items: items.slice(0, 50), hours_estimated }
  } catch {
    return { count: 0, items: [], hours_estimated: 0 }
  }
}

async function collectCalendarEvents(project, startDate, endDate) {
  const keywords = GIT_KEYWORDS[project.code] || []
  const keywordPattern = keywords.map(k => `title.ilike.%${k}%`).join(',')

  const { data } = await supabase
    .from('calendar_events')
    .select('title, start_time, end_time, description, location')
    .gte('start_time', startDate)
    .lte('start_time', endDate)
    .or(keywordPattern || 'title.ilike.%unlikely_match%')
    .order('start_time', { ascending: true })
    .limit(100)

  const events = data || []
  // Calculate total hours from event durations
  const totalHours = events.reduce((sum, e) => {
    if (!e.end_time) return sum + 1
    const duration = (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 3600000
    return sum + Math.min(duration, 8) // Cap at 8 hours per event
  }, 0)

  return {
    count: events.length,
    items: events.map(e => ({
      title: e.title,
      date: new Date(e.start_time).toISOString().split('T')[0],
      location: e.location,
    })),
    hours_documented: Math.round(totalHours * 10) / 10,
  }
}

async function collectXeroSpend(project, startDate, endDate) {
  // Get transactions tagged to this project
  const { data: transactions } = await supabase
    .from('xero_transactions')
    .select('contact_name, total, date, type')
    .eq('project_code', project.code)
    .lt('total', 0)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  // Get invoices (bills)
  const { data: invoices } = await supabase
    .from('xero_invoices')
    .select('contact_name, total, date, status, has_attachments, invoice_number')
    .eq('type', 'ACCPAY')
    .eq('project_code', project.code)
    .gte('date', startDate)
    .lte('date', endDate)

  const txns = transactions || []
  const bills = invoices || []
  const totalSpend = txns.reduce((sum, t) => sum + Math.abs(t.total), 0)
  const withReceipts = bills.filter(b => b.has_attachments).length
  const receiptCoverage = bills.length > 0 ? Math.round((withReceipts / bills.length) * 100) : 100

  // Vendor breakdown
  const vendorSpend = {}
  for (const t of txns) {
    const vendor = t.contact_name || 'Unknown'
    vendorSpend[vendor] = (vendorSpend[vendor] || 0) + Math.abs(t.total)
  }

  return {
    total_spend: Math.round(totalSpend * 100) / 100,
    transaction_count: txns.length,
    invoice_count: bills.length,
    receipt_coverage_pct: receiptCoverage,
    receipts_missing: bills.length - withReceipts,
    rd_offset_43pct: Math.round(totalSpend * 0.435 * 100) / 100,
    gst_claimable: Math.round(totalSpend / 11 * 100) / 100,
    top_vendors: Object.entries(vendorSpend)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([vendor, spend]) => ({ vendor, spend: Math.round(spend * 100) / 100 })),
  }
}

async function collectEmails(project, startDate, endDate) {
  const { data, count } = await supabase
    .from('communications')
    .select('subject, from_address, date', { count: 'exact' })
    .eq('project_code', project.code)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .limit(20)

  return {
    count: count || (data || []).length,
    recent: (data || []).map(e => ({
      subject: e.subject,
      from: e.from_address,
      date: e.date,
    })),
  }
}

async function collectKnowledge(project, startDate, endDate) {
  const { data, count } = await supabase
    .from('project_knowledge')
    .select('title, knowledge_type, recorded_at', { count: 'exact' })
    .eq('project_code', project.code)
    .gte('recorded_at', startDate)
    .lte('recorded_at', endDate)
    .order('recorded_at', { ascending: false })
    .limit(20)

  return {
    count: count || (data || []).length,
    items: (data || []).map(k => ({
      title: k.title,
      type: k.knowledge_type,
      date: k.recorded_at,
    })),
  }
}

function calculateEvidenceStrength(git, calendar, xero, emails, knowledge) {
  // Score 0-100 based on evidence completeness
  let score = 0
  const flags = []

  // Git commits (30 points)
  if (git.count >= 20) score += 30
  else if (git.count >= 10) score += 20
  else if (git.count >= 1) score += 10
  else flags.push('No git commits — weak technical evidence')

  // Calendar events (20 points)
  if (calendar.count >= 10) score += 20
  else if (calendar.count >= 3) score += 15
  else if (calendar.count >= 1) score += 5
  else flags.push('No calendar events — no time documentation')

  // Xero spend + receipts (30 points)
  if (xero.total_spend > 0) {
    score += 10
    if (xero.receipt_coverage_pct >= 90) score += 20
    else if (xero.receipt_coverage_pct >= 70) score += 10
    else flags.push(`Receipt coverage ${xero.receipt_coverage_pct}% — ${xero.receipts_missing} missing (impacts 43.5% refund)`)
  } else {
    flags.push('No tracked spend — need to tag transactions to this project')
  }

  // Communications (10 points)
  if (emails.count >= 10) score += 10
  else if (emails.count >= 1) score += 5

  // Knowledge (10 points)
  if (knowledge.count >= 5) score += 10
  else if (knowledge.count >= 1) score += 5

  let rating
  if (score >= 80) rating = 'strong'
  else if (score >= 50) rating = 'adequate'
  else if (score >= 25) rating = 'weak'
  else rating = 'insufficient'

  return { score, rating, flags }
}

function printProjectEvidence(evidence) {
  const { project, project_name, rd_type, strength, evidence: ev } = evidence

  console.log(`\n┌─── ${project} — ${project_name} (${rd_type} R&D) ───`)
  console.log(`│ Evidence Strength: ${strength.score}/100 [${strength.rating.toUpperCase()}]`)

  if (strength.flags.length > 0) {
    for (const flag of strength.flags) {
      console.log(`│ ⚠️  ${flag}`)
    }
  }

  console.log(`│`)
  console.log(`│ Git Commits:     ${ev.git_commits.count} commits (~${ev.git_commits.hours_estimated}h estimated)`)
  console.log(`│ Calendar Events: ${ev.calendar_events.count} events (${ev.calendar_events.hours_documented}h documented)`)
  console.log(`│ Xero Spend:      $${ev.xero_spend.total_spend.toLocaleString()} (${ev.xero_spend.transaction_count} transactions)`)
  console.log(`│   → R&D Offset:  $${ev.xero_spend.rd_offset_43pct.toLocaleString()} (43.5%)`)
  console.log(`│   → GST Credit:  $${ev.xero_spend.gst_claimable.toLocaleString()}`)
  console.log(`│   → Receipts:    ${ev.xero_spend.receipt_coverage_pct}% coverage (${ev.xero_spend.receipts_missing} missing)`)
  console.log(`│ Emails:          ${ev.emails.count} project-tagged`)
  console.log(`│ Knowledge:       ${ev.knowledge.count} documented items`)

  if (ev.xero_spend.top_vendors.length > 0) {
    console.log(`│`)
    console.log(`│ Top R&D Vendors:`)
    for (const v of ev.xero_spend.top_vendors.slice(0, 5)) {
      console.log(`│   $${v.spend.toLocaleString()} — ${v.vendor}`)
    }
  }

  console.log(`└${'─'.repeat(60)}`)
}

function printSummary(allEvidence, startDate, endDate) {
  console.log(`\n═══ SUMMARY ═══`)

  let totalSpend = 0
  let totalOffset = 0
  let totalMissing = 0

  for (const ev of allEvidence) {
    totalSpend += ev.evidence.xero_spend.total_spend
    totalOffset += ev.evidence.xero_spend.rd_offset_43pct
    totalMissing += ev.evidence.xero_spend.receipts_missing
  }

  console.log(`Total R&D Spend:    $${totalSpend.toLocaleString()}`)
  console.log(`Potential Refund:   $${totalOffset.toLocaleString()} (43.5%)`)
  console.log(`Missing Receipts:   ${totalMissing} (each one reduces the refund)`)
  console.log(``)

  const weakProjects = allEvidence.filter(e => e.strength.rating === 'weak' || e.strength.rating === 'insufficient')
  if (weakProjects.length > 0) {
    console.log(`⚠️  Projects needing attention:`)
    for (const p of weakProjects) {
      console.log(`   ${p.project}: ${p.strength.score}/100 — ${p.strength.flags.join('; ')}`)
    }
  }

  const strongProjects = allEvidence.filter(e => e.strength.rating === 'strong')
  if (strongProjects.length > 0) {
    console.log(`\n✅ Strong evidence: ${strongProjects.map(p => p.project).join(', ')}`)
  }
}

main().catch(err => {
  console.error('R&D Evidence Collector failed:', err)
  process.exit(1)
})
