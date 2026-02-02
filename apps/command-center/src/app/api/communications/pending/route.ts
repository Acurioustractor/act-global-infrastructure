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
      .limit(20)

    if (error) throw error

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

    // Group by project code
    const byProject: Record<string, typeof items> = {}
    const items = (pending || [])
      .map((comm) => {
        const resolved = nameMap[comm.ghl_contact_id] || {}
        const contactName = comm.contact_name || resolved.name || null
        if (!contactName) return null  // Skip unidentifiable contacts
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
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

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
      { error: 'Failed to fetch pending communications', pending: [], byProject: {}, total: 0, followUps: [] },
      { status: 500 }
    )
  }
}
