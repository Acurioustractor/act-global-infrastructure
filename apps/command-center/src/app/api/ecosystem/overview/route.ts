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
      .select('id, name, monetary_value, project_code, status')
      .eq('status', 'open')

    // Query latest project summaries
    const { data: summaries } = await supabase
      .from('project_summaries')
      .select('project_code, summary_text, stats, generated_at')
      .order('generated_at', { ascending: false })
      .limit(50)

    // Build latest summary lookup (deduplicate — keep latest per project)
    const latestSummary: Record<string, { text: string; generatedAt: string; stats: Record<string, unknown> }> = {}
    for (const s of summaries || []) {
      if (!latestSummary[s.project_code]) {
        latestSummary[s.project_code] = {
          text: s.summary_text,
          generatedAt: s.generated_at,
          stats: s.stats as Record<string, unknown>,
        }
      }
    }

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

      // Count opportunities for this project
      const projectOpps = (opportunities || []).filter((o) => {
        const code = (o.project_code || '').toLowerCase()
        return code === codeLower || code === nameLower
      })
      const oppCount = projectOpps.length
      const oppValue = projectOpps.reduce((sum, o) => sum + (o.monetary_value || 0), 0)

      // Get AI summary
      const summary = latestSummary[proj.code] || null

      return {
        code: proj.code,
        name: proj.name,
        color: proj.color,
        status: proj.status,
        contacts: contactCount,
        recentComms: commCount,
        opportunities: oppCount,
        opportunityValue: oppValue,
        summary: summary?.text || null,
        summaryGeneratedAt: summary?.generatedAt || null,
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
