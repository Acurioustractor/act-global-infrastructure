import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import projectCodesJson from '@/config/project-codes.json'

interface ProjectConfig {
  name: string
  code: string
  category: string
  ghl_tags: string[]
  [key: string]: unknown
}

const projectsMap = projectCodesJson.projects as Record<string, ProjectConfig>

// Known vendor → project code suggestions
const VENDOR_SUGGESTIONS: Record<string, string> = {
  'Nicholas Marchesi': 'ACT-IN',
  'Mighty Networks': 'ACT-IN',
  'Linktree': 'ACT-IN',
  'LinkedIn Singapore': 'ACT-IN',
  'AHM': 'ACT-IN',
  'Belong': 'ACT-IN',
  'Zapier': 'ACT-IN',
  'Squarespace': 'ACT-IN',
  'Updoc': 'ACT-IN',
  'GoPayID': 'ACT-IN',
  '2Up Spending': 'ACT-IN',
  'Amazon': 'ACT-IN',
  'Uber': 'ACT-IN',
  'Uber Eats': 'ACT-IN',
  'OpenAI': 'ACT-IN',
  'Anthropic': 'ACT-IN',
  'Notion': 'ACT-IN',
  'Webflow': 'ACT-IN',
  'Xero': 'ACT-IN',
  'Descript': 'ACT-IN',
  'Adobe': 'ACT-IN',
  'Vercel': 'ACT-IN',
  'Supabase': 'ACT-IN',
  'HighLevel': 'ACT-IN',
  'GitHub': 'ACT-IN',
  'Audible': 'ACT-IN',
  'Apple': 'ACT-IN',
  'Google': 'ACT-IN',
  'NAB': 'ACT-IN',
  'Defy Manufacturing': 'ACT-GD',
  'Maleny Hardware': 'ACT-HV',
}

// R&D-eligible project codes
const RD_ELIGIBLE_PROJECTS = new Set([
  'ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD', 'ACT-PS', 'ACT-CF',
])

function isRdEligible(projectCode: string | null): boolean {
  return !!projectCode && RD_ELIGIBLE_PROJECTS.has(projectCode)
}

function suggestProjectCode(contactName: string): string | null {
  // Direct match
  if (VENDOR_SUGGESTIONS[contactName]) {
    return VENDOR_SUGGESTIONS[contactName]
  }

  // Case-insensitive match
  const lower = contactName.toLowerCase()
  for (const [vendor, code] of Object.entries(VENDOR_SUGGESTIONS)) {
    if (lower.includes(vendor.toLowerCase()) || vendor.toLowerCase().includes(lower)) {
      return code
    }
  }

  // Try to fuzzy-match against project names
  for (const project of Object.values(projectsMap)) {
    const projectLower = project.name.toLowerCase()
    if (lower.includes(projectLower) || projectLower.includes(lower)) {
      return project.code
    }
    // Check GHL tags
    if (project.ghl_tags?.some(tag => lower.includes(tag.toLowerCase()))) {
      return project.code
    }
  }

  return null
}

export async function GET() {
  try {
    // Fetch all untagged transactions (no project_code)
    const { data: transactions, error } = await supabase
      .from('xero_transactions')
      .select('id, contact_name, type, total, date, project_code')
      .or('project_code.is.null,project_code.eq.')
      .order('date', { ascending: false })

    if (error) throw error

    const rows = transactions || []

    // Also get total count for coverage calculation
    const { count: totalCount } = await supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })

    // Group by contact_name + type
    const groupMap = new Map<string, {
      contactName: string
      type: string
      count: number
      total: number
      dates: Set<string>
      ids: string[]
    }>()

    for (const tx of rows) {
      const name = tx.contact_name || '(No contact)'
      const type = tx.type || 'UNKNOWN'
      const key = `${name}::${type}`

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          contactName: name,
          type,
          count: 0,
          total: 0,
          dates: new Set(),
          ids: [],
        })
      }

      const group = groupMap.get(key)!
      group.count++
      group.total += Math.abs(Number(tx.total) || 0)
      if (tx.date) group.dates.add(tx.date.substring(0, 7))
      group.ids.push(tx.id)
    }

    // Convert to sorted array
    const groups = Array.from(groupMap.values())
      .map(g => {
        const suggested = suggestProjectCode(g.contactName)
        return {
          contactName: g.contactName,
          type: g.type,
          count: g.count,
          total: Math.round(g.total),
          sampleDates: Array.from(g.dates).sort().slice(-3),
          suggestedCode: suggested,
          rdEligible: isRdEligible(suggested),
        }
      })
      .sort((a, b) => b.count - a.count)

    // Calculate R&D spend totals from tagged transactions
    const { data: rdTransactions } = await supabase
      .from('xero_transactions')
      .select('project_code, total')
      .in('project_code', Array.from(RD_ELIGIBLE_PROJECTS))

    let rdSpendTotal = 0
    const rdByProject: Record<string, number> = {}
    for (const tx of rdTransactions || []) {
      const amt = Math.abs(Number(tx.total) || 0)
      rdSpendTotal += amt
      rdByProject[tx.project_code] = (rdByProject[tx.project_code] || 0) + amt
    }

    // Build project codes list for the dropdown
    const projectCodes = Object.values(projectsMap).map(p => ({
      code: p.code,
      name: p.name,
      category: p.category,
    }))

    return NextResponse.json({
      groups,
      totalUntagged: rows.length,
      totalTransactions: totalCount || 0,
      projectCodes,
      rd: {
        totalSpend: Math.round(rdSpendTotal),
        byProject: rdByProject,
        threshold: 20000,
        eligibleProjects: Array.from(RD_ELIGIBLE_PROJECTS),
        refundRate: 0.435,
      },
    })
  } catch (e) {
    console.error('Untagged transactions error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch untagged transactions' },
      { status: 500 }
    )
  }
}
