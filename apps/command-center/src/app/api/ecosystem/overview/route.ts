import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Project code definitions matching the 10 ACT project codes
const PROJECT_CODES = [
  { code: 'JH', name: 'JusticeHub', color: 'blue', status: 'active' },
  { code: 'EL', name: 'Empathy Ledger', color: 'pink', status: 'active' },
  { code: 'TH', name: 'The Harvest', color: 'green', status: 'active' },
  { code: 'TF', name: 'The Farm', color: 'amber', status: 'active' },
  { code: 'TS', name: 'The Studio', color: 'purple', status: 'active' },
  { code: 'GD', name: 'Goods', color: 'orange', status: 'active' },
  { code: 'WT', name: 'World Tour', color: 'cyan', status: 'planning' },
  { code: 'PICC', name: 'PICC', color: 'teal', status: 'active' },
  { code: 'OPS', name: 'Operations', color: 'slate', status: 'active' },
  { code: 'ACT', name: 'ACT Global', color: 'indigo', status: 'active' },
]

export async function GET() {
  try {
    // Query contacts per project tag
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('id, tags')

    // Query recent communications (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentComms } = await supabase
      .from('communications_history')
      .select('id, project_codes')
      .gte('occurred_at', sevenDaysAgo.toISOString())

    // Query open opportunities
    const { data: opportunities } = await supabase
      .from('ghl_opportunities')
      .select('id, name, monetary_value, tags, status')
      .eq('status', 'open')

    // Build per-project stats
    const projects = PROJECT_CODES.map((proj) => {
      const codeLower = proj.code.toLowerCase()
      const nameLower = proj.name.toLowerCase()

      // Count contacts tagged with this project
      const contactCount = (contacts || []).filter((c) => {
        const tags = (c.tags || []).map((t: string) => t.toLowerCase())
        return tags.some((t: string) => t.includes(codeLower) || t.includes(nameLower))
      }).length

      // Count recent communications for this project
      const commCount = (recentComms || []).filter((c) => {
        const codes = c.project_codes || []
        return codes.some((pc: string) => pc.toLowerCase() === codeLower || pc.toLowerCase() === nameLower)
      }).length

      // Count opportunities tagged to this project
      const projectOpps = (opportunities || []).filter((o) => {
        const tags = (o.tags || []).map((t: string) => t.toLowerCase())
        return tags.some((t: string) => t.includes(codeLower) || t.includes(nameLower))
      })
      const oppCount = projectOpps.length
      const oppValue = projectOpps.reduce((sum, o) => sum + (o.monetary_value || 0), 0)

      return {
        code: proj.code,
        name: proj.name,
        color: proj.color,
        status: proj.status,
        contacts: contactCount,
        recentComms: commCount,
        opportunities: oppCount,
        opportunityValue: oppValue,
      }
    })

    // Sort: active projects with most activity first
    projects.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1
      return (b.contacts + b.recentComms + b.opportunities) - (a.contacts + a.recentComms + a.opportunities)
    })

    return NextResponse.json({
      projects,
      totals: {
        contacts: (contacts || []).length,
        recentComms: (recentComms || []).length,
        opportunities: (opportunities || []).length,
        opportunityValue: (opportunities || []).reduce((s, o) => s + (o.monetary_value || 0), 0),
      },
    })
  } catch (error) {
    console.error('Ecosystem overview error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ecosystem overview', projects: [], totals: { contacts: 0, recentComms: 0, opportunities: 0, opportunityValue: 0 } },
      { status: 500 }
    )
  }
}
