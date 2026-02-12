import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

interface ActionItem {
  id: string
  type: 'email_reply' | 'follow_up' | 'overdue_contact' | 'insight' | 'task' | 'deal_risk' | 'relationship_alert'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  title: string
  description: string
  project_code?: string
  project_codes?: string[]
  tags?: string[]
  company?: string
  entity?: string
  entity_id?: string
  time_ago?: string
  action_url?: string
  channel?: string
  created_at: string
  rank_score?: number
  linked_projects?: string[]
}

// Load active project codes for boost calculation
let activeProjectCodes: Set<string> | null = null
function getActiveProjectCodes(): Set<string> {
  if (activeProjectCodes) return activeProjectCodes
  try {
    const filePath = join(process.cwd(), '..', '..', 'config', 'project-codes.json')
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'))
    activeProjectCodes = new Set<string>()
    for (const [code, proj] of Object.entries(raw.projects as Record<string, { status?: string }>)) {
      if (!proj.status || proj.status === 'active') activeProjectCodes.add(code)
    }
  } catch {
    activeProjectCodes = new Set()
  }
  return activeProjectCodes
}

interface Vote {
  ghl_contact_id: string
  vote_type: 'up' | 'down'
  voted_at: string
  activity_snapshot_at: string | null
}

interface ProjectLink {
  ghl_contact_id: string
  project_code: string
}

function computeRankScore(
  contactId: string,
  rh: { pipeline_score?: number; financial_score?: number; email_score?: number; calendar_score?: number; knowledge_score?: number; days_since_contact?: number } | null,
  contactDeals: { monetary_value?: number }[] | null,
  votes: Vote[],
  projectLinks: string[],
  now: Date,
): number {
  // Base weighted signal scores
  const base = rh
    ? (rh.pipeline_score || 0) * 0.30 +
      (rh.financial_score || 0) * 0.25 +
      (rh.email_score || 0) * 0.20 +
      (rh.calendar_score || 0) * 0.15 +
      (rh.knowledge_score || 0) * 0.10
    : 0

  // Vote modifier with 30-day half-life decay
  let voteScore = 0
  for (const vote of votes) {
    const daysAgo = (now.getTime() - new Date(vote.voted_at).getTime()) / (1000 * 60 * 60 * 24)
    const decay = Math.pow(0.5, daysAgo / 30)
    voteScore += (vote.vote_type === 'up' ? 15 : -25) * decay
  }

  // Project boost
  const activeCodes = getActiveProjectCodes()
  let projectBoost = 0
  for (const code of projectLinks) {
    if (activeCodes.has(code)) { projectBoost = 20; break }
    projectBoost = Math.max(projectBoost, 10) // ideation/inactive project
  }

  // Deal boost
  const dealBoost = contactDeals?.some(d => (d.monetary_value || 0) > 0) ? 25 : 0

  // Recency penalty
  const recencyPenalty = rh?.days_since_contact ? Math.min(rh.days_since_contact * 2, 60) : 0

  return Math.round(base + voteScore + projectBoost + dealBoost - recencyPenalty)
}

function scoreToPriority(score: number): 'urgent' | 'high' | 'medium' | 'low' {
  if (score > 70) return 'urgent'
  if (score > 40) return 'high'
  if (score > 20) return 'medium'
  return 'low'
}

/** Check if a contact is suppressed by downvote (downvoted + no new activity since) */
function isSuppressed(contactId: string, votes: Vote[], latestActivityByContact: Record<string, string>): boolean {
  // Find most recent downvote
  const downvotes = votes.filter(v => v.vote_type === 'down')
  if (downvotes.length === 0) return false
  const latestDown = downvotes.reduce((a, b) => new Date(a.voted_at) > new Date(b.voted_at) ? a : b)
  if (!latestDown.activity_snapshot_at) return false

  const latestActivity = latestActivityByContact[contactId]
  if (!latestActivity) return true // no activity at all → stay suppressed
  return new Date(latestActivity) <= new Date(latestDown.activity_snapshot_at)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const project = searchParams.get('project')

    const actions: ActionItem[] = []
    const now = new Date()

    // Fetch votes, project links, and latest activity in parallel with existing queries
    const [
      { data: pendingComms },
      { data: atRiskContacts },
      { data: openDeals },
      { data: allVotes },
      { data: allProjectLinks },
      { data: latestActivities },
      { data: insights },
      { data: overdueActions },
    ] = await Promise.all([
      // 1. Communications waiting for response
      supabase
        .from('communications_history')
        .select('id, subject, content_preview, contact_name, ghl_contact_id, project_codes, occurred_at, channel')
        .eq('waiting_for_response', true)
        .eq('response_needed_by', 'us')
        .order('occurred_at', { ascending: false })
        .limit(15),

      // 2. At-risk relationship health (exclude snoozed)
      supabase
        .from('relationship_health')
        .select('id, ghl_contact_id, temperature, temperature_trend, risk_flags, days_since_contact, email_score, calendar_score, financial_score, pipeline_score, knowledge_score, total_touchpoints, calculated_at, snoozed_until')
        .or('temperature_trend.eq.falling,risk_flags.not.is.null')
        .gte('temperature', 15)
        .gte('total_touchpoints', 3)
        .or(`snoozed_until.is.null,snoozed_until.lt.${now.toISOString()}`)
        .order('temperature', { ascending: false })
        .limit(30),

      // 3. Open deals
      supabase
        .from('ghl_opportunities')
        .select('id, ghl_contact_id, name, pipeline_name, stage_name, monetary_value, project_code, ghl_updated_at')
        .eq('status', 'open'),

      // 4. All votes (small user-generated table)
      supabase
        .from('contact_votes')
        .select('ghl_contact_id, vote_type, voted_at, activity_snapshot_at')
        .order('voted_at', { ascending: false }),

      // 5. All project links
      supabase
        .from('contact_project_links')
        .select('ghl_contact_id, project_code'),

      // 6. Latest activity per contact (for downvote suppression)
      supabase
        .from('communications_history')
        .select('ghl_contact_id, occurred_at')
        .order('occurred_at', { ascending: false })
        .limit(500),

      // 7. Intelligence insights
      (() => {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return supabase
          .from('intelligence_insights')
          .select('id, title, description, insight_type, priority, status, source_type, created_at')
          .eq('status', 'active')
          .in('priority', ['high', 'medium', 'critical'])
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(8)
      })(),

      // 8. Overdue knowledge actions
      supabase
        .from('project_knowledge')
        .select('id, title, content, project_code, follow_up_date')
        .eq('knowledge_type', 'action')
        .eq('status', 'open')
        .lt('follow_up_date', now.toISOString())
        .order('follow_up_date', { ascending: true })
        .limit(8),
    ])

    // Build lookup maps
    const votesByContact: Record<string, Vote[]> = {}
    for (const v of (allVotes || []) as Vote[]) {
      if (!votesByContact[v.ghl_contact_id]) votesByContact[v.ghl_contact_id] = []
      votesByContact[v.ghl_contact_id].push(v)
    }

    const linksByContact: Record<string, string[]> = {}
    for (const l of (allProjectLinks || []) as ProjectLink[]) {
      if (!linksByContact[l.ghl_contact_id]) linksByContact[l.ghl_contact_id] = []
      linksByContact[l.ghl_contact_id].push(l.project_code)
    }

    const dealsByContact: Record<string, typeof openDeals> = {}
    for (const deal of openDeals || []) {
      if (!deal.ghl_contact_id) continue
      if (!dealsByContact[deal.ghl_contact_id]) dealsByContact[deal.ghl_contact_id] = []
      dealsByContact[deal.ghl_contact_id]!.push(deal)
    }

    // Latest activity by contact (for suppression check)
    const latestActivityByContact: Record<string, string> = {}
    for (const act of latestActivities || []) {
      if (!act.ghl_contact_id) continue
      if (!latestActivityByContact[act.ghl_contact_id]) {
        latestActivityByContact[act.ghl_contact_id] = act.occurred_at
      }
    }

    // RH lookup by contact
    const rhByContact: Record<string, (typeof atRiskContacts extends (infer T)[] | null ? T : never)> = {}
    for (const rh of atRiskContacts || []) {
      rhByContact[rh.ghl_contact_id] = rh
    }

    // Resolve contact details from ghl_contacts — only active/prospect/lead with real names
    const allGhlIds = [
      ...(pendingComms || []).filter(c => c.ghl_contact_id).map(c => c.ghl_contact_id),
      ...(atRiskContacts || []).map(r => r.ghl_contact_id).filter(Boolean),
    ]
    const contactDetailMap: Record<string, { name: string; email?: string; company?: string; tags?: string[]; engagement_status?: string }> = {}
    if (allGhlIds.length > 0) {
      const uniqueIds = [...new Set(allGhlIds)]
      const { data: ghlContacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, company_name, tags, engagement_status')
        .in('ghl_id', uniqueIds)
        .not('full_name', 'is', null)
        .in('engagement_status', ['active', 'prospect', 'lead'])
      for (const gc of ghlContacts || []) {
        if (!gc.full_name?.trim()) continue
        contactDetailMap[gc.ghl_id] = {
          name: gc.full_name,
          email: gc.email,
          company: gc.company_name,
          tags: gc.tags,
          engagement_status: gc.engagement_status,
        }
      }
    }

    // Helper: check suppression for a contact
    const isContactSuppressed = (contactId: string) => {
      const votes = votesByContact[contactId]
      if (!votes) return false
      return isSuppressed(contactId, votes, latestActivityByContact)
    }

    // 1. Communications waiting for our response
    for (const comm of pendingComms || []) {
      const ghlDetail = contactDetailMap[comm.ghl_contact_id]
      if (!ghlDetail) continue
      if (isContactSuppressed(comm.ghl_contact_id)) continue

      const daysSince = Math.floor((now.getTime() - new Date(comm.occurred_at).getTime()) / (1000 * 60 * 60 * 24))
      const projectCodes = comm.project_codes || []
      const projectCode = projectCodes[0]
      if (project && projectCode !== project) continue

      const allTags = ghlDetail.tags || []
      const projectTags = allTags.filter((t: string) =>
        /^(JH|EL|TF|TH|TS|GD|WT|PICC|OPS|ACT)/i.test(t) ||
        /justicehub|empathy|harvest|farm|studio|goods/i.test(t)
      )

      const contactLinks = linksByContact[comm.ghl_contact_id] || []
      const rh = rhByContact[comm.ghl_contact_id]
      const contactDeals = dealsByContact[comm.ghl_contact_id] || null
      const contactVotes = votesByContact[comm.ghl_contact_id] || []
      const rankScore = computeRankScore(comm.ghl_contact_id, rh || null, contactDeals, contactVotes, contactLinks, now)

      actions.push({
        id: `comm-${comm.id}`,
        type: 'email_reply',
        priority: scoreToPriority(rankScore),
        title: `Reply to ${ghlDetail.name}`,
        description: comm.subject || 'No subject',
        project_code: projectCode,
        project_codes: projectCodes.length > 0 ? projectCodes : (projectTags.length > 0 ? projectTags.slice(0, 2) : undefined),
        tags: projectTags.length > 0 ? projectTags : undefined,
        company: ghlDetail.company || undefined,
        entity: ghlDetail.name,
        entity_id: comm.ghl_contact_id || comm.id,
        time_ago: `${daysSince}d`,
        channel: comm.channel || 'email',
        created_at: comm.occurred_at,
        rank_score: rankScore,
        linked_projects: contactLinks.length > 0 ? contactLinks : undefined,
      })
    }

    // 2. Signal-based relationship alerts
    const alertedContactIds = new Set<string>()

    for (const rh of atRiskContacts || []) {
      const contact = contactDetailMap[rh.ghl_contact_id]
      if (!contact) continue
      if (isContactSuppressed(rh.ghl_contact_id)) continue

      const tags = contact.tags || []
      const projectTags = tags.filter((t: string) =>
        /^(JH|EL|TF|TH|TS|GD|WT|PICC|OPS|ACT)/i.test(t) ||
        /justicehub|empathy|harvest|farm|studio|goods/i.test(t)
      )
      const projectTag = projectTags[0]
      if (project && projectTag?.toUpperCase() !== project) continue

      const hasDeals = !!dealsByContact[rh.ghl_contact_id]
      const hasFinancial = (rh.financial_score || 0) > 0
      const hasPipeline = (rh.pipeline_score || 0) > 0
      const hasProjectTags = projectTags.length > 0
      const contactLinks = linksByContact[rh.ghl_contact_id] || []
      const hasProjectLinks = contactLinks.length > 0

      // Must be connected to something business-relevant
      if (!hasDeals && !hasFinancial && !hasPipeline && !hasProjectTags && !hasProjectLinks) continue

      const riskFlags: string[] = rh.risk_flags || []
      const contactVotes = votesByContact[rh.ghl_contact_id] || []
      const contactDeals = dealsByContact[rh.ghl_contact_id] || null
      const rankScore = computeRankScore(rh.ghl_contact_id, rh, contactDeals, contactVotes, contactLinks, now)

      const tempLabel = rh.temperature != null ? `${rh.temperature}°` : ''
      const trendLabel = rh.temperature_trend ? ` ${rh.temperature_trend}` : ''
      const signalParts: string[] = []
      if ((rh.email_score || 0) > 0) signalParts.push(`email:${rh.email_score}`)
      if ((rh.pipeline_score || 0) > 0) signalParts.push(`pipeline:${rh.pipeline_score}`)
      if ((rh.financial_score || 0) > 0) signalParts.push(`financial:${rh.financial_score}`)
      const daysLabel = rh.days_since_contact ? `${rh.days_since_contact}d ago` : ''
      const descParts = [
        tempLabel + trendLabel,
        daysLabel,
        signalParts.join(', '),
        riskFlags.length > 0 ? riskFlags.join(', ') : '',
      ].filter(Boolean)

      alertedContactIds.add(rh.ghl_contact_id)

      actions.push({
        id: `rh-${rh.id}`,
        type: 'relationship_alert',
        priority: scoreToPriority(rankScore),
        title: `${contact.name} cooling${hasDeals ? ' (has deals)' : ''}`,
        description: descParts.join(' — ') || 'Relationship health declining',
        project_code: projectTag,
        tags: projectTags.length > 0 ? projectTags : undefined,
        company: contact.company || undefined,
        entity: contact.name,
        entity_id: rh.ghl_contact_id,
        time_ago: rh.days_since_contact ? `${rh.days_since_contact}d` : undefined,
        action_url: `/people/${rh.ghl_contact_id}`,
        created_at: rh.calculated_at,
        rank_score: rankScore,
        linked_projects: contactLinks.length > 0 ? contactLinks : undefined,
      })
    }

    // 2b. Deal risks — open opportunities where contact is cooling
    for (const deal of openDeals || []) {
      if (!deal.ghl_contact_id) continue
      if (alertedContactIds.has(deal.ghl_contact_id)) continue
      if (project && deal.project_code !== project) continue
      if (isContactSuppressed(deal.ghl_contact_id)) continue

      const rh = (atRiskContacts || []).find(r => r.ghl_contact_id === deal.ghl_contact_id)
      if (!rh) continue

      const contactInfo = contactDetailMap[deal.ghl_contact_id]
      const contactName = contactInfo?.name || deal.name
      const value = deal.monetary_value ? `$${Number(deal.monetary_value).toLocaleString()}` : ''
      const riskFlags = rh.risk_flags || []
      const descParts = [
        deal.pipeline_name && deal.stage_name ? `${deal.pipeline_name} → ${deal.stage_name}` : '',
        value,
        rh.temperature != null ? `${rh.temperature}° ${rh.temperature_trend || ''}` : '',
        riskFlags.length > 0 ? riskFlags.join(', ') : '',
      ].filter(Boolean)

      const contactLinks = linksByContact[deal.ghl_contact_id] || []
      const contactVotes = votesByContact[deal.ghl_contact_id] || []
      const contactDeals = dealsByContact[deal.ghl_contact_id] || null
      const rankScore = computeRankScore(deal.ghl_contact_id, rh, contactDeals, contactVotes, contactLinks, now)

      alertedContactIds.add(deal.ghl_contact_id)

      actions.push({
        id: `deal-${deal.id}`,
        type: 'deal_risk',
        priority: scoreToPriority(rankScore),
        title: `Deal at risk: ${contactName}`,
        description: descParts.join(' — ') || deal.name,
        project_code: deal.project_code || undefined,
        entity: contactName,
        entity_id: deal.ghl_contact_id,
        action_url: `/people/${deal.ghl_contact_id}`,
        created_at: deal.ghl_updated_at,
        rank_score: rankScore,
        linked_projects: contactLinks.length > 0 ? contactLinks : undefined,
      })
    }

    // 3. Intelligence insights (no ranking — not contact-based)
    for (const insight of insights || []) {
      actions.push({
        id: `insight-${insight.id}`,
        type: 'insight',
        priority: insight.priority === 'critical' ? 'urgent' : insight.priority || 'medium',
        title: insight.title,
        description: insight.description || '',
        created_at: insight.created_at,
      })
    }

    // 4. Overdue knowledge actions (no ranking — not contact-based)
    for (const action of overdueActions || []) {
      if (project && action.project_code !== project) continue
      actions.push({
        id: `task-${action.id}`,
        type: 'task',
        priority: 'high',
        title: action.title || 'Overdue action',
        description: action.content || '',
        project_code: action.project_code,
        action_url: '/knowledge/actions',
        created_at: action.follow_up_date,
      })
    }

    // Sort by rank_score DESC (contact items), then priority bucket for non-scored items
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    actions.sort((a, b) => {
      // Items with rank_score sort by score
      if (a.rank_score != null && b.rank_score != null) {
        return b.rank_score - a.rank_score
      }
      // Items with score come before unsorted items at same priority
      if (a.rank_score != null && b.rank_score == null) {
        const pA = priorityOrder[a.priority] || 3
        const pB = priorityOrder[b.priority] || 3
        if (pA <= pB) return -1
        return 1
      }
      if (a.rank_score == null && b.rank_score != null) {
        const pA = priorityOrder[a.priority] || 3
        const pB = priorityOrder[b.priority] || 3
        if (pB <= pA) return 1
        return -1
      }
      // Neither has score — sort by priority then recency
      const pDiff = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
      if (pDiff !== 0) return pDiff
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return NextResponse.json({
      actions: actions.slice(0, limit),
      total: actions.length,
      counts: {
        email_reply: actions.filter(a => a.type === 'email_reply').length,
        relationship_alert: actions.filter(a => a.type === 'relationship_alert').length,
        deal_risk: actions.filter(a => a.type === 'deal_risk').length,
        insight: actions.filter(a => a.type === 'insight').length,
        task: actions.filter(a => a.type === 'task').length,
      },
    })
  } catch (error) {
    console.error('Intelligence actions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch actions', actions: [], total: 0, counts: {} },
      { status: 500 }
    )
  }
}
