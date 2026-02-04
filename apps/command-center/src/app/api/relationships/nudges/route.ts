import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5')

    // Find active/prospect contacts going cold:
    // - engagement_status is active or prospect
    // - last_contact_date > 14 days ago (going cold)
    // - ordered by stalest first
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const { data: coldContacts, error } = await supabase
      .from('ghl_contacts')
      .select('id, ghl_id, full_name, first_name, last_name, email, company_name, engagement_status, last_contact_date, tags, projects')
      .in('engagement_status', ['active', 'prospect', 'lead'])
      .lt('last_contact_date', fourteenDaysAgo.toISOString())
      .not('full_name', 'is', null)
      .order('last_contact_date', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Nudges query error:', error)
      return NextResponse.json({ nudges: [], error: error.message }, { status: 500 })
    }

    // For each contact, get their last communication for context
    const nudges = await Promise.all(
      (coldContacts || []).map(async (contact) => {
        const name = contact.full_name?.trim() ||
          `${contact.first_name || ''} ${contact.last_name || ''}`.trim() ||
          contact.email || 'Unknown'

        const daysSinceContact = contact.last_contact_date
          ? Math.floor((Date.now() - new Date(contact.last_contact_date).getTime()) / 86400000)
          : null

        // Get last communication for context
        let lastContext = null
        if (contact.ghl_id) {
          const { data: lastComm } = await supabase
            .from('communications_history')
            .select('subject, summary, channel, direction, occurred_at')
            .eq('ghl_contact_id', contact.ghl_id)
            .order('occurred_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (lastComm) {
            lastContext = {
              subject: lastComm.subject,
              summary: lastComm.summary,
              channel: lastComm.channel,
              direction: lastComm.direction,
              date: lastComm.occurred_at,
            }
          }
        }

        // Generate suggested action
        let suggestedAction = 'Check in and see how things are going'
        if (daysSinceContact && daysSinceContact > 60) {
          suggestedAction = 'Re-engage — has been over 2 months since last contact'
        } else if (daysSinceContact && daysSinceContact > 30) {
          suggestedAction = 'Follow up — approaching a month without contact'
        } else if (lastContext?.direction === 'inbound') {
          suggestedAction = `Reply to their last ${lastContext.channel || 'message'} about "${(lastContext.subject || '').substring(0, 50)}"`
        }

        return {
          id: contact.id,
          ghlId: contact.ghl_id,
          name,
          email: contact.email,
          company: contact.company_name,
          engagementStatus: contact.engagement_status,
          lastContactDate: contact.last_contact_date,
          daysSinceContact,
          projects: contact.projects || [],
          tags: contact.tags || [],
          lastContext,
          suggestedAction,
        }
      })
    )

    return NextResponse.json({
      nudges,
      total: nudges.length,
    })
  } catch (error) {
    console.error('Nudges error:', error)
    return NextResponse.json(
      { nudges: [], error: 'Failed to fetch relationship nudges' },
      { status: 500 }
    )
  }
}
