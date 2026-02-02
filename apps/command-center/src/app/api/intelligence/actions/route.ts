import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface ActionItem {
  id: string
  type: 'email_reply' | 'follow_up' | 'overdue_contact' | 'insight' | 'task'
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
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const project = searchParams.get('project')

    const actions: ActionItem[] = []
    const now = new Date()

    // 1. Communications waiting for our response
    const { data: pendingComms } = await supabase
      .from('communications_history')
      .select('id, subject, content_preview, contact_name, ghl_contact_id, project_codes, occurred_at, channel')
      .eq('waiting_for_response', true)
      .eq('response_needed_by', 'us')
      .order('occurred_at', { ascending: false })
      .limit(15)

    // Resolve contact details from ghl_contacts
    const allGhlIds = [
      ...(pendingComms || []).filter(c => c.ghl_contact_id).map(c => c.ghl_contact_id),
    ]
    const contactDetailMap: Record<string, { name: string; email?: string; company?: string; tags?: string[] }> = {}
    if (allGhlIds.length > 0) {
      const uniqueIds = [...new Set(allGhlIds)]
      const { data: ghlContacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, company_name, tags')
        .in('ghl_id', uniqueIds)
      for (const gc of ghlContacts || []) {
        contactDetailMap[gc.ghl_id] = {
          name: gc.full_name || '',
          email: gc.email,
          company: gc.company_name,
          tags: gc.tags,
        }
      }
    }

    for (const comm of pendingComms || []) {
      const daysSince = Math.floor((now.getTime() - new Date(comm.occurred_at).getTime()) / (1000 * 60 * 60 * 24))
      const projectCodes = comm.project_codes || []
      const projectCode = projectCodes[0]
      if (project && projectCode !== project) continue

      const ghlDetail = contactDetailMap[comm.ghl_contact_id] || {}
      const name = comm.contact_name || ghlDetail.name || null
      if (!name) continue

      // Extract project-relevant tags
      const allTags = ghlDetail.tags || []
      const projectTags = allTags.filter((t: string) =>
        /^(JH|EL|TF|TH|TS|GD|WT|PICC|OPS|ACT)/i.test(t) ||
        /justicehub|empathy|harvest|farm|studio|goods/i.test(t)
      )

      actions.push({
        id: `comm-${comm.id}`,
        type: 'email_reply',
        priority: daysSince > 7 ? 'urgent' : daysSince > 3 ? 'high' : 'medium',
        title: `Reply to ${name}`,
        description: comm.subject || 'No subject',
        project_code: projectCode,
        project_codes: projectCodes.length > 0 ? projectCodes : (projectTags.length > 0 ? projectTags.slice(0, 2) : undefined),
        tags: projectTags.length > 0 ? projectTags : undefined,
        company: ghlDetail.company || undefined,
        entity: name,
        entity_id: comm.ghl_contact_id || comm.id,
        time_ago: `${daysSince}d`,
        channel: comm.channel || 'email',
        created_at: comm.occurred_at,
      })
    }

    // 2. Stale contacts (>30 days, tagged to projects)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: staleContacts } = await supabase
      .from('ghl_contacts')
      .select('id, full_name, company_name, tags, last_contact_date, email')
      .lt('last_contact_date', thirtyDaysAgo.toISOString())
      .not('tags', 'is', null)
      .order('last_contact_date', { ascending: true })
      .limit(10)

    for (const contact of staleContacts || []) {
      const tags = contact.tags || []
      if (tags.length === 0) continue
      const contactName = contact.full_name || 'Unknown'
      const daysSince = Math.floor((now.getTime() - new Date(contact.last_contact_date).getTime()) / (1000 * 60 * 60 * 24))
      const projectTags = tags.filter((t: string) => /^(JH|EL|TF|TH|TS|GD|WT|PICC|OPS|ACT)/i.test(t))
      const projectTag = projectTags[0]
      if (project && projectTag?.toUpperCase() !== project) continue

      actions.push({
        id: `contact-${contact.id}`,
        type: 'overdue_contact',
        priority: daysSince > 60 ? 'high' : 'medium',
        title: `Reconnect with ${contactName}`,
        description: contact.company_name
          ? `${contact.company_name} — last contact ${daysSince} days ago`
          : `Last contact ${daysSince} days ago`,
        project_code: projectTag,
        tags: projectTags.length > 0 ? projectTags : undefined,
        company: contact.company_name || undefined,
        entity: contactName,
        entity_id: contact.id,
        time_ago: `${daysSince}d`,
        action_url: `/people/${contact.id}`,
        created_at: contact.last_contact_date,
      })
    }

    // 3. Agent insights (active, not dismissed)
    const { data: insights } = await supabase
      .from('agent_insights')
      .select('id, title, description, insight_type, priority, status, source_type, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(8)

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

    // 4. Overdue knowledge actions
    const { data: overdueActions } = await supabase
      .from('project_knowledge')
      .select('id, title, content, project_code, follow_up_date')
      .eq('knowledge_type', 'action')
      .eq('status', 'open')
      .lt('follow_up_date', now.toISOString())
      .order('follow_up_date', { ascending: true })
      .limit(8)

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

    // Sort by priority then recency
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    actions.sort((a, b) => {
      const pDiff = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3)
      if (pDiff !== 0) return pDiff
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return NextResponse.json({
      actions: actions.slice(0, limit),
      total: actions.length,
      counts: {
        email_reply: actions.filter(a => a.type === 'email_reply').length,
        overdue_contact: actions.filter(a => a.type === 'overdue_contact').length,
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
