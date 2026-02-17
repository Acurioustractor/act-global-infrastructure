import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get communications where we need to respond
    const { data: pending, error } = await supabase
      .from('communications_history')
      .select('id, subject, contact_name, contact_email, ghl_contact_id, channel, direction, sentiment, project_codes, occurred_at, waiting_for_response, response_needed_by')
      .eq('waiting_for_response', true)
      .eq('response_needed_by', 'us')
      .order('occurred_at', { ascending: false })
      .limit(30)

    if (error) throw error

    // Get all user actions (archived, important, follow_up_today)
    const pendingIds = (pending || []).map(c => c.id)
    const { data: actions } = pendingIds.length > 0
      ? await supabase
          .from('communication_user_actions')
          .select('communication_id, action')
          .in('communication_id', pendingIds)
      : { data: [] }

    const actionMap: Record<string, string> = {}
    for (const a of actions || []) {
      actionMap[a.communication_id] = a.action
    }

    // Resolve contact names from ghl_contacts where contact_name is null
    const ghlIds = (pending || [])
      .filter(c => !c.contact_name && c.ghl_contact_id)
      .map(c => c.ghl_contact_id)
    const nameMap: Record<string, { name: string; email?: string }> = {}
    if (ghlIds.length > 0) {
      const { data: ghlContacts } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email')
        .in('ghl_id', ghlIds)
      for (const gc of ghlContacts || []) {
        if (gc.full_name) nameMap[gc.ghl_id] = { name: gc.full_name, email: gc.email }
      }
    }

    const now = new Date()

    const items = (pending || [])
      .map((comm) => {
        const resolved = nameMap[comm.ghl_contact_id] || {}
        const contactName = comm.contact_name || resolved.name || null
        if (!contactName) return null  // Skip unidentifiable contacts
        const userAction = actionMap[comm.id] || null
        if (userAction === 'archived') return null  // Filter out archived
        const daysSince = Math.floor((now.getTime() - new Date(comm.occurred_at).getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: comm.id,
          contactName,
          contactEmail: comm.contact_email || resolved.email,
          subject: comm.subject || '(no subject)',
          channel: comm.channel || 'email',
          sentiment: comm.sentiment,
          projectCode: (comm.project_codes || [])[0] || 'Other',
          daysWaiting: daysSince,
          occurredAt: comm.occurred_at,
          priority: userAction as 'important' | 'follow_up_today' | null,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    // Group by priority section, then by project within each
    const important = items.filter(i => i.priority === 'important')
    const followUpToday = items.filter(i => i.priority === 'follow_up_today')
    const other = items.filter(i => !i.priority)

    // Also group all by project (for backward compat)
    const byProject: Record<string, typeof items> = {}
    for (const item of items) {
      const key = item.projectCode || 'Other'
      if (!byProject[key]) byProject[key] = []
      byProject[key].push(item)
    }

    // Also get follow-up suggestions from agent insights
    const { data: followUps } = await supabase
      .from('agent_insights')
      .select('id, title, description, data, status, created_at')
      .eq('insight_type', 'follow_up')
      .neq('status', 'dismissed')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      pending: items,
      important,
      followUpToday,
      other,
      byProject,
      total: items.length,
      followUps: (followUps || []).map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        status: f.status,
        createdAt: f.created_at,
      })),
    })
  } catch (error) {
    console.error('Pending communications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending communications', pending: [], important: [], followUpToday: [], other: [], byProject: {}, total: 0, followUps: [] },
      { status: 500 }
    )
  }
}
