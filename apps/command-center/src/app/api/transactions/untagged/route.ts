import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface ProjectConfig {
  name: string
  code: string
  category: string
  ghl_tags: string[]
  [key: string]: unknown
}

// Load project configs from DB (cached per request)
async function loadProjectsMap(): Promise<Record<string, ProjectConfig>> {
  const { data } = await supabase
    .from('projects')
    .select('code, name, category, ghl_tags, xero_tracking')
  const map: Record<string, ProjectConfig> = {}
  for (const p of data || []) {
    map[p.code] = p as ProjectConfig
  }
  return map
}

// Load vendor→project suggestions from DB
async function loadVendorSuggestions(): Promise<Array<{ vendorName: string; aliases: string[]; projectCode: string; rdEligible: boolean }>> {
  const { data } = await supabase
    .from('vendor_project_rules')
    .select('vendor_name, aliases, project_code, rd_eligible')

  return (data || []).map(r => ({
    vendorName: r.vendor_name,
    aliases: r.aliases || [],
    projectCode: r.project_code,
    rdEligible: r.rd_eligible,
  }))
}

// R&D-eligible project codes
const RD_ELIGIBLE_PROJECTS = new Set([
  'ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD', 'ACT-PS', 'ACT-CF',
])

function isRdEligible(projectCode: string | null): boolean {
  return !!projectCode && RD_ELIGIBLE_PROJECTS.has(projectCode)
}

function suggestProjectCode(
  contactName: string,
  projectsMap: Record<string, ProjectConfig>,
  vendorRules: Array<{ vendorName: string; aliases: string[]; projectCode: string }>
): string | null {
  const lower = contactName.toLowerCase()

  // Check DB vendor rules (name + aliases)
  for (const rule of vendorRules) {
    if (lower.includes(rule.vendorName.toLowerCase())) return rule.projectCode
    for (const alias of rule.aliases) {
      if (lower.includes(alias.toLowerCase())) return rule.projectCode
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
    const [projectsMap, vendorRules] = await Promise.all([
      loadProjectsMap(),
      loadVendorSuggestions(),
    ])

    // Fetch all untagged transactions (no project_code), exclude internal transfers
    const { data: transactions, error } = await supabase
      .from('xero_transactions')
      .select('id, contact_name, type, total, date, project_code, bank_account')
      .or('project_code.is.null,project_code.eq.')
      .not('type', 'in', '("SPEND-TRANSFER","RECEIVE-TRANSFER")')
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
      bankAccounts: Set<string>
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
          bankAccounts: new Set(),
        })
      }

      const group = groupMap.get(key)!
      group.count++
      group.total += Math.abs(Number(tx.total) || 0)
      if (tx.date) group.dates.add(tx.date.substring(0, 7))
      group.ids.push(tx.id)
      if (tx.bank_account) group.bankAccounts.add(tx.bank_account)
    }

    // Convert to sorted array
    const groups = Array.from(groupMap.values())
      .map(g => {
        const suggested = suggestProjectCode(g.contactName, projectsMap, vendorRules)
        return {
          contactName: g.contactName,
          type: g.type,
          count: g.count,
          total: Math.round(g.total),
          sampleDates: Array.from(g.dates).sort().slice(-3),
          bankAccounts: Array.from(g.bankAccounts),
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
    const projectCodes = Object.values(projectsMap).map((p: ProjectConfig) => ({
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
