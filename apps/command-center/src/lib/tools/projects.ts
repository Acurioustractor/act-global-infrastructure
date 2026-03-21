import { supabase } from '../supabase'
import { loadProjectCodes } from '../tool-helpers'
import { getBrisbaneDate, getBrisbaneDateOffset } from '../timezone'
import {
  fetchProjectSummary,
  fetchContactsNeedingAttention,
  fetchProjectHealth,
  fetchProjectIntelligence,
} from '@act/intel'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_project_summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetProjectSummary(input: {
  project_code: string
}): Promise<string> {
  try {
    const result = await fetchProjectSummary(supabase, { project_code: input.project_code })
    if (!result) {
      return JSON.stringify({
        project_code: input.project_code.toUpperCase(),
        error: 'No summary available yet for this project. Summaries are generated daily.',
      })
    }
    return JSON.stringify(result)
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_contacts_needing_attention
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetContactsNeedingAttention(input: {
  limit?: number
  project?: string
}): Promise<string> {
  try {
    const result = await fetchContactsNeedingAttention(supabase, { limit: input.limit, project: input.project })
    return JSON.stringify(result)
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

export function suggestAction(
  riskFlags: string[],
  health: { email_score?: number; calendar_score?: number; next_meeting_date?: string } | null | undefined
): string {
  if (riskFlags.includes('awaiting_response')) return 'Reply to their recent message — they\'re waiting to hear back'
  if (riskFlags.includes('high_value_inactive')) return 'High-value deal at risk — schedule a call or meeting ASAP'
  if (riskFlags.includes('one_way_outbound')) return 'Emails going unanswered — try a different channel (call, text, in-person)'
  if (riskFlags.includes('going_cold')) return 'Relationship cooling — send a check-in or share something relevant'
  if (health?.next_meeting_date) return `Meeting scheduled ${new Date(health.next_meeting_date).toLocaleDateString()} — prepare talking points`
  return 'Consider reaching out with a relevant update or check-in'
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_deal_risks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetDealRisks(input: {
  limit?: number
}): Promise<string> {
  const limit = input.limit || 10

  try {
    // Get open opportunities
    const { data: opportunities, error } = await supabase
      .from('ghl_opportunities')
      .select('id, name, monetary_value, stage_name, pipeline_name, contact_id, status, updated_at')
      .eq('status', 'open')
      .order('monetary_value', { ascending: false })

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    if (!opportunities || opportunities.length === 0) {
      return JSON.stringify({ description: 'No open opportunities in pipeline', deals: [] })
    }

    // Get relationship health for all contacts with open deals
    const contactIds = [...new Set(opportunities.map((o) => o.contact_id).filter(Boolean))]
    const { data: healthData } = await supabase
      .from('relationship_health')
      .select('ghl_contact_id, temperature, temperature_trend, risk_flags, last_contact_at, email_score')
      .in('ghl_contact_id', contactIds.length > 0 ? contactIds : ['__none__'])

    const healthMap: Record<string, { temperature?: number; temperature_trend?: string; risk_flags?: string[]; last_contact_at?: string; email_score?: number }> = {}
    for (const h of (healthData || [])) {
      healthMap[h.ghl_contact_id] = h
    }

    // Get contact names
    const { data: contactData } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, full_name, email')
      .in('ghl_id', contactIds.length > 0 ? contactIds : ['__none__'])

    const contactMap: Record<string, { full_name?: string; email?: string }> = {}
    for (const c of (contactData || [])) {
      contactMap[c.ghl_id] = c
    }

    const now = new Date()
    const atRiskDeals = opportunities
      .map((opp) => {
        const health = healthMap[opp.contact_id]
        const contact = contactMap[opp.contact_id]
        const daysSinceUpdate = Math.floor((now.getTime() - new Date(opp.updated_at).getTime()) / 86400000)
        const daysSinceContact = health?.last_contact_at
          ? Math.floor((now.getTime() - new Date(health.last_contact_at).getTime()) / 86400000)
          : null

        // Determine risk reasons
        const risks: string[] = []
        if (health?.temperature_trend === 'falling') risks.push('Contact temperature falling')
        if (health?.risk_flags?.includes('going_cold')) risks.push('Contact going cold')
        if (health?.risk_flags?.includes('awaiting_response')) risks.push('Awaiting your response')
        if (health?.risk_flags?.includes('one_way_outbound')) risks.push('One-way outbound — no replies')
        if (health?.risk_flags?.includes('high_value_inactive')) risks.push('High value but inactive')
        if (daysSinceUpdate > 14) risks.push(`No deal activity in ${daysSinceUpdate} days`)
        if (daysSinceContact && daysSinceContact > 21) risks.push(`No contact in ${daysSinceContact} days`)

        if (risks.length === 0) return null

        return {
          deal: opp.name,
          value: opp.monetary_value,
          stage: opp.stage_name,
          pipeline: opp.pipeline_name,
          contact_name: contact?.full_name || 'Unknown',
          contact_email: contact?.email,
          temperature: health?.temperature,
          trend: health?.temperature_trend,
          risks,
          suggested_action: suggestAction(health?.risk_flags || [], health),
        }
      })
      .filter(Boolean)
      .slice(0, limit)

    return JSON.stringify({
      description: 'Open deals with relationship or activity risk signals',
      count: atRiskDeals.length,
      total_at_risk_value: atRiskDeals.reduce((sum, d) => sum + ((d as { value?: number }).value || 0), 0),
      deals: atRiskDeals,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_project_health
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetProjectHealth(input: {
  project_code?: string
}): Promise<string> {
  try {
    const result = await fetchProjectHealth(supabase, {
      projectCode: input.project_code,
    })
    return JSON.stringify(result)
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_upcoming_deadlines
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetUpcomingDeadlines(input: {
  days_ahead?: number
  category?: string
}): Promise<string> {
  const daysAhead = input.days_ahead || 30
  const category = input.category || 'all'
  const cutoff = getBrisbaneDateOffset(daysAhead)
  const today = getBrisbaneDate()

  try {
    const deadlines: Array<{
      type: string
      title: string
      due_date: string
      days_until: number
      status: string
      project_code?: string
      details?: string
    }> = []

    // Grants deadlines
    if (category === 'all' || category === 'grants') {
      const { data: grants } = await supabase
        .from('fundraising_pipeline')
        .select('name, deadline, expected_date, status, project_codes')
        .or(`deadline.lte.${cutoff},expected_date.lte.${cutoff}`)
        .not('status', 'in', '("successful","unsuccessful","cancelled")')

      for (const g of grants || []) {
        const dueDate = g.deadline || g.expected_date
        if (!dueDate) continue
        const daysUntil = Math.round((new Date(dueDate).getTime() - Date.now()) / 86400000)
        deadlines.push({
          type: 'grant',
          title: g.name,
          due_date: dueDate,
          days_until: daysUntil,
          status: daysUntil < 0 ? 'overdue' : daysUntil <= 7 ? 'urgent' : 'upcoming',
          project_code: g.project_codes?.[0],
          details: `Status: ${g.status}`,
        })
      }
    }

    // Compliance deadlines
    if (category === 'all' || category === 'compliance') {
      const { data: compliance } = await supabase
        .from('compliance_items')
        .select('title, next_due, category, status, project_code, responsible')
        .lte('next_due', cutoff)
        .not('status', 'in', '("completed","not-applicable")')

      for (const c of compliance || []) {
        if (!c.next_due) continue
        const daysUntil = Math.round((new Date(c.next_due).getTime() - Date.now()) / 86400000)
        deadlines.push({
          type: 'compliance',
          title: c.title,
          due_date: c.next_due,
          days_until: daysUntil,
          status: daysUntil < 0 ? 'overdue' : daysUntil <= 7 ? 'urgent' : 'upcoming',
          project_code: c.project_code,
          details: `Category: ${c.category}. Responsible: ${c.responsible || 'unassigned'}`,
        })
      }
    }

    // Calendar deadlines (events with "deadline" or "due" in title)
    if (category === 'all' || category === 'calendar') {
      const { data: events } = await supabase
        .from('calendar_events')
        .select('title, start_time, project_code')
        .gte('start_time', `${today}T00:00:00Z`)
        .lte('start_time', `${cutoff}T23:59:59Z`)
        .or('title.ilike.%deadline%,title.ilike.%due%,title.ilike.%submission%,title.ilike.%lodge%')

      for (const e of events || []) {
        const dueDate = e.start_time.split('T')[0]
        const daysUntil = Math.round((new Date(dueDate).getTime() - Date.now()) / 86400000)
        deadlines.push({
          type: 'calendar',
          title: e.title,
          due_date: dueDate,
          days_until: daysUntil,
          status: daysUntil <= 3 ? 'urgent' : 'upcoming',
          project_code: e.project_code,
        })
      }
    }

    // Sort by due date
    deadlines.sort((a, b) => a.days_until - b.days_until)

    return JSON.stringify({
      period: `${today} to ${cutoff}`,
      total: deadlines.length,
      overdue: deadlines.filter(d => d.status === 'overdue').length,
      urgent: deadlines.filter(d => d.status === 'urgent').length,
      deadlines,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: create_meeting_notes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeCreateMeetingNotes(input: {
  title: string
  summary: string
  content: string
  project_code?: string
  participants?: string[]
  action_items?: string[]
  date?: string
}): Promise<string> {
  const {
    title,
    summary,
    content,
    project_code,
    participants = [],
    action_items = [],
    date,
  } = input

  const meetingDate = date || getBrisbaneDate()

  try {
    // Look up project name from code
    let projectName: string | null = null
    if (project_code) {
      const allProjects = await loadProjectCodes()
      projectName = allProjects[project_code.toUpperCase()]?.name || null
    }

    // Build full content with action items
    let fullContent = content
    if (action_items.length > 0) {
      fullContent += '\n\n## Action Items\n'
      for (const item of action_items) {
        fullContent += `- [ ] ${item}\n`
      }
    }

    // Insert into project_knowledge
    const { data, error } = await supabase
      .from('project_knowledge')
      .insert({
        project_code: project_code?.toUpperCase() || null,
        project_name: projectName,
        knowledge_type: 'meeting',
        title,
        content: fullContent,
        summary,
        source_type: 'telegram',
        recorded_by: 'Ben Knight',
        recorded_at: `${meetingDate}T12:00:00Z`,
        participants,
        topics: [],
        importance: 'normal',
        action_required: action_items.length > 0,
      })
      .select('id')
      .single()

    if (error) return JSON.stringify({ error: error.message })

    return JSON.stringify({
      action: 'meeting_notes_saved',
      id: data.id,
      title,
      date: meetingDate,
      project_code: project_code || null,
      participants_count: participants.length,
      action_items_count: action_items.length,
      confirmation: `Meeting notes "${title}" saved for ${meetingDate}${project_code ? ` (${project_code})` : ''}.`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_project_360
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetProject360(input: { project_code: string }): Promise<string> {
  try {
    const result = await fetchProjectIntelligence(supabase, { project_code: input.project_code })
    return JSON.stringify({
      project_code: result.project_code,
      financial: result.financials ? {
        revenue: result.financials.fy_revenue,
        expenses: result.financials.fy_expenses,
        net: result.financials.fy_net,
        pipeline_value: result.financials.pipeline_value,
        outstanding_invoices: result.financials.outstanding_amount,
        grants_won: result.financials.grants_won,
        grants_pending: result.financials.grants_pending,
      } : null,
      health: result.health ? {
        score: result.health.health_score,
        momentum: result.health.momentum_score,
        engagement: result.health.engagement_score,
        financial: result.health.financial_score,
      } : null,
      key_contacts: result.relationships.map((r) => ({
        name: r.contact_name,
        company: r.company_name,
        temperature: r.temperature,
        trend: r.temperature_trend,
        last_contact: r.last_contact_at,
      })),
      focus_areas: result.focus_areas,
      grants: result.grants,
      recent_knowledge: result.recent_knowledge.slice(0, 5),
      recent_wins: result.recent_wins,
      blockers: result.blockers,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_goods_intelligence
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeGetGoodsIntelligence(input: { focus: string }): Promise<string> {
  const { focus } = input

  if (focus === 'newsletter_plan') {
    // Get unused/least-used content
    const { data: content } = await supabase
      .from('goods_content_library')
      .select('*')
      .not('analyzed_at', 'is', null)
      .order('times_used_newsletter', { ascending: true })
      .order('published_at', { ascending: false })
      .limit(8)

    // Get audience breakdown
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('tags, newsletter_consent')
      .contains('tags', ['goods'])

    const c = contacts || []
    const subscribers = c.filter(x => x.newsletter_consent && x.tags?.includes('goods-newsletter')).length
    const funders = c.filter(x => x.tags?.includes('goods-funder')).length
    const partners = c.filter(x => x.tags?.includes('goods-partner')).length
    const community = c.filter(x => x.tags?.includes('goods-community')).length
    const supporters = c.filter(x => x.tags?.includes('goods-supporter')).length

    const stories = (content || []).filter(c => c.content_type === 'story')
    const articles = (content || []).filter(c => c.content_type === 'article')
    const featured = stories[0] || (content || [])[0]

    let result = `## Newsletter Plan\n\n`
    result += `**Audience:** ${subscribers} newsletter subscribers (${funders} funders, ${partners} partners, ${community} community, ${supporters} supporters)\n\n`

    if (featured) {
      result += `### Recommended Featured Story\n`
      result += `**"${featured.title}"** (${featured.content_type})\n`
      if (featured.storyteller_name) result += `By ${featured.storyteller_name}\n`
      result += `${featured.key_message || featured.excerpt || ''}\n`
      result += `Tone: ${featured.emotional_tone || 'N/A'} | Topics: ${(featured.topics || []).join(', ')}\n`
      result += `Used in newsletters: ${featured.times_used_newsletter} times\n\n`
    }

    if (content && content.length > 1) {
      result += `### More Content Available\n`
      for (const item of content.slice(1, 5)) {
        result += `- **"${item.title}"** (${item.content_type}) — ${item.key_message || item.excerpt?.substring(0, 100) || 'No summary'}\n`
      }
      result += `\n`
    }

    result += `### Suggested Approach\n`
    if (funders > 0 && stories.length > 0) {
      result += `- Lead with "${featured?.title}" — impact stories resonate with funders\n`
    }
    if (articles.length > 0) {
      result += `- Include an article for depth: "${articles[0].title}"\n`
    }
    result += `- Build and send the newsletter in GHL (Marketing -> Email Templates)\n`
    result += `- Filter by tag: goods-newsletter\n`
    result += `- Run \`node scripts/prepare-goods-newsletter.mjs\` for AI-generated copy suggestions\n`

    return result

  } else if (focus === 'outreach') {
    // Get contacts needing attention
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('id, full_name, first_name, last_name, email, tags, last_contact_date, created_at')
      .contains('tags', ['goods'])
      .order('last_contact_date', { ascending: true, nullsFirst: true })
      .limit(50)

    // Get content for pairing
    const { data: content } = await supabase
      .from('goods_content_library')
      .select('title, content_type, key_message, audience_fit, url')
      .not('analyzed_at', 'is', null)
      .order('times_used_newsletter', { ascending: true })
      .limit(10)

    const now = new Date()
    let result = `## Outreach Recommendations\n\n`
    const recs: { name: string; email: string | null; reason: string; priority: string; content: string }[] = []

    for (const contact of contacts || []) {
      const name = contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown'
      const daysSinceContact = contact.last_contact_date
        ? Math.floor((now.getTime() - new Date(contact.last_contact_date).getTime()) / 86400000)
        : null

      let reason = ''
      let priority = 'low'

      if (daysSinceContact === null) {
        reason = 'Never contacted — introduce Goods'
        priority = 'high'
      } else if (daysSinceContact > 60) {
        reason = `No contact in ${daysSinceContact} days`
        priority = 'high'
      } else if (daysSinceContact > 30) {
        reason = `${daysSinceContact} days since last contact`
        priority = 'medium'
      } else {
        continue
      }

      // Match content to contact segment
      const tags = contact.tags || []
      let suggestedContent = ''
      if (content && content.length > 0) {
        const segment = tags.includes('goods-funder') ? 'funders'
          : tags.includes('goods-partner') ? 'partners'
          : tags.includes('goods-community') ? 'community'
          : 'supporters'

        const match = content.find(c => c.audience_fit?.includes(segment)) || content[0]
        suggestedContent = `Share: "${match.title}" — ${match.key_message || ''}`
      }

      recs.push({ name, email: contact.email, reason, priority, content: suggestedContent })
    }

    // Sort by priority
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
    recs.sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2))

    const top = recs.slice(0, 10)
    for (const r of top) {
      result += `**${r.name}** (${r.priority} priority)\n`
      result += `${r.reason}${r.email ? ` | ${r.email}` : ''}\n`
      if (r.content) result += `-> ${r.content}\n`
      result += `\n`
    }

    result += `*${recs.length} contacts need attention total. Showing top 10.*\n`
    return result

  } else if (focus === 'content_ideas') {
    // Check what topics are covered vs gaps
    const { data: content } = await supabase
      .from('goods_content_library')
      .select('topics, impact_themes, audience_fit, content_type')
      .not('analyzed_at', 'is', null)

    // Count topic frequency
    const topicCounts: Record<string, number> = {}
    const audienceCounts: Record<string, number> = {}
    for (const item of content || []) {
      for (const t of item.topics || []) topicCounts[t] = (topicCounts[t] || 0) + 1
      for (const a of item.audience_fit || []) audienceCounts[a] = (audienceCounts[a] || 0) + 1
    }

    // Get contact segments for gap analysis
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('tags')
      .contains('tags', ['goods'])

    const c = contacts || []
    const segmentSizes: Record<string, number> = {
      funders: c.filter(x => x.tags?.includes('goods-funder')).length,
      partners: c.filter(x => x.tags?.includes('goods-partner')).length,
      community: c.filter(x => x.tags?.includes('goods-community')).length,
      supporters: c.filter(x => x.tags?.includes('goods-supporter')).length,
      storytellers: c.filter(x => x.tags?.includes('goods-storyteller')).length,
    }

    let result = `## Content Ideas & Gaps\n\n`

    result += `### Topic Coverage\n`
    const sortedTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])
    for (const [topic, count] of sortedTopics.slice(0, 8)) {
      result += `- ${topic}: ${count} pieces\n`
    }

    result += `\n### Audience Content Gap Analysis\n`
    const allSegments = ['funders', 'partners', 'community', 'media', 'government', 'storytellers', 'supporters']
    for (const seg of allSegments) {
      const contentCount = audienceCounts[seg] || 0
      const contactCount = segmentSizes[seg] || 0
      const ratio = contactCount > 0 ? (contentCount / contactCount).toFixed(1) : 'N/A'
      const gap = contactCount > 0 && contentCount < 2 ? ' UNDERSERVED' : ''
      result += `- **${seg}**: ${contentCount} content pieces for ${contactCount} contacts (ratio: ${ratio})${gap}\n`
    }

    result += `\n### Suggested Content Angles\n`
    for (const [seg, count] of Object.entries(segmentSizes)) {
      if (count > 5 && (audienceCounts[seg] || 0) < 2) {
        result += `- You have ${count} ${seg} but very little content targeted at them. Consider a ${seg === 'funders' ? 'impact report or economic outcomes story' : seg === 'partners' ? 'collaboration spotlight or partnership update' : 'community update or participation story'}.\n`
      }
    }

    const underrepresented = ['food-sovereignty', 'youth-programs', 'circular-economy', 'regenerative-agriculture']
      .filter(t => !topicCounts[t] || topicCounts[t] < 2)
    if (underrepresented.length > 0) {
      result += `- Underrepresented topics to explore: ${underrepresented.join(', ')}\n`
    }

    return result

  } else {
    // overview
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('tags, newsletter_consent, last_contact_date')
      .contains('tags', ['goods'])

    const { data: content } = await supabase
      .from('goods_content_library')
      .select('id, times_used_newsletter, analyzed_at')

    const { data: recentComms } = await supabase
      .from('communications_history')
      .select('id')
      .contains('project_codes', ['GOODS'])
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

    const c = contacts || []
    const now = new Date()

    let result = `## Goods on Country Overview\n\n`
    result += `### Contacts\n`
    result += `- Total: ${c.length}\n`
    result += `- Newsletter subscribers: ${c.filter(x => x.newsletter_consent && x.tags?.includes('goods-newsletter')).length}\n`
    result += `- Funders: ${c.filter(x => x.tags?.includes('goods-funder')).length}\n`
    result += `- Partners: ${c.filter(x => x.tags?.includes('goods-partner')).length}\n`
    result += `- Community: ${c.filter(x => x.tags?.includes('goods-community')).length}\n`
    result += `- Supporters: ${c.filter(x => x.tags?.includes('goods-supporter')).length}\n`
    result += `- Storytellers: ${c.filter(x => x.tags?.includes('goods-storyteller')).length}\n`
    result += `- Needing attention (>30 days): ${c.filter(x => {
      if (!x.last_contact_date) return true
      return (now.getTime() - new Date(x.last_contact_date).getTime()) / 86400000 > 30
    }).length}\n`

    result += `\n### Content Library\n`
    const ct = content || []
    result += `- Total items: ${ct.length}\n`
    result += `- Analyzed: ${ct.filter(x => x.analyzed_at).length}\n`
    result += `- Unused in newsletters: ${ct.filter(x => !x.times_used_newsletter).length}\n`

    result += `\n### Recent Activity\n`
    result += `- Communications (30 days): ${recentComms?.length || 0}\n`

    result += `\n### Quick Actions\n`
    result += `- "Plan the next Goods newsletter" -> newsletter_plan focus\n`
    result += `- "Who should I reach out to for Goods?" -> outreach focus\n`
    result += `- "What content should we create for Goods?" -> content_ideas focus\n`

    return result
  }
}
