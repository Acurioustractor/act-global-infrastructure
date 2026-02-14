import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const now = new Date()

    const [healthRes, commsRes, contactsRes, oppsRes] = await Promise.all([
      // Relationship health — all contacts with temperature data
      supabase
        .from('relationship_health')
        .select('ghl_contact_id, temperature, days_since_contact, lcaa_stage, total_touchpoints, last_touchpoint_date, email_score, calendar_score, financial_score, pipeline_score')
        .order('temperature', { ascending: true }),

      // Recent communications — last 30 days
      supabase
        .from('communications_history')
        .select('ghl_contact_id, subject, channel, direction, occurred_at, sentiment')
        .gte('occurred_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('occurred_at', { ascending: false })
        .limit(500),

      // All contacts with names
      supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, email, company_name, tags, engagement_status'),

      // Open opportunities — people with active deals
      supabase
        .from('ghl_opportunities')
        .select('ghl_contact_id, name, monetary_value, stage_name, ghl_updated_at')
        .eq('status', 'open'),
    ])

    // Build lookup maps
    const contactMap = new Map<string, { name: string; email: string | null; company: string | null; tags: string[]; status: string | null }>()
    for (const c of contactsRes.data || []) {
      if (c.ghl_id) {
        contactMap.set(c.ghl_id, {
          name: c.full_name || 'Unknown',
          email: c.email,
          company: c.company_name,
          tags: c.tags || [],
          status: c.engagement_status,
        })
      }
    }

    // Last comms per contact
    const commsMap = new Map<string, Array<{ subject: string; channel: string; direction: string; date: string; sentiment: string | null }>>()
    for (const comm of commsRes.data || []) {
      if (!comm.ghl_contact_id) continue
      const existing = commsMap.get(comm.ghl_contact_id) || []
      if (existing.length < 3) {
        existing.push({
          subject: comm.subject || '(no subject)',
          channel: comm.channel,
          direction: comm.direction,
          date: comm.occurred_at,
          sentiment: comm.sentiment,
        })
        commsMap.set(comm.ghl_contact_id, existing)
      }
    }

    // Opportunities per contact
    const oppMap = new Map<string, Array<{ name: string; value: number; stage: string | null }>>()
    for (const opp of oppsRes.data || []) {
      if (!opp.ghl_contact_id) continue
      const existing = oppMap.get(opp.ghl_contact_id) || []
      existing.push({
        name: opp.name,
        value: parseFloat(opp.monetary_value) || 0,
        stage: opp.stage_name,
      })
      oppMap.set(opp.ghl_contact_id, existing)
    }

    // Categorize contacts into touchpoint categories
    const needsFollowUp: any[] = []
    const goingCold: any[] = []
    const recentWins: any[] = []
    const activePartners: any[] = []

    for (const health of healthRes.data || []) {
      const contact = contactMap.get(health.ghl_contact_id)
      if (!contact) continue
      // Skip opted-out contacts
      if (contact.status === 'opted-out') continue

      const opps = oppMap.get(health.ghl_contact_id) || []
      const recentComms = commsMap.get(health.ghl_contact_id) || []
      const lastComm = recentComms[0] || null
      const hasOpenDeal = opps.length > 0
      const pipelineValue = opps.reduce((sum, o) => sum + o.value, 0)

      const entry = {
        contactId: health.ghl_contact_id,
        name: contact.name,
        email: contact.email,
        company: contact.company,
        temperature: health.temperature,
        daysSinceContact: health.days_since_contact,
        lcaaStage: health.lcaa_stage,
        lastComm: lastComm ? {
          subject: lastComm.subject,
          channel: lastComm.channel,
          direction: lastComm.direction,
          date: lastComm.date,
        } : null,
        opportunities: opps.slice(0, 2),
        pipelineValue,
        reason: '' as string,
      }

      // Category 1: Going cold — had relationship, now silent
      if (health.days_since_contact > 21 && health.temperature < 40 && health.total_touchpoints > 2) {
        entry.reason = hasOpenDeal
          ? `${health.days_since_contact}d silent with ${formatK(pipelineValue)} pipeline`
          : `${health.days_since_contact}d since last contact`
        goingCold.push(entry)
      }
      // Category 2: Needs follow-up — recent activity but waiting on us
      else if (lastComm && lastComm.direction === 'inbound' && health.days_since_contact <= 7) {
        entry.reason = `Replied ${daysAgo(lastComm.date)} via ${lastComm.channel}`
        needsFollowUp.push(entry)
      }
      // Category 3: Active partners — warm relationship with open deals
      else if (health.temperature >= 60 && hasOpenDeal) {
        entry.reason = `${formatK(pipelineValue)} active · ${health.temperature}° warm`
        activePartners.push(entry)
      }
      // Category 4: Recent wins — high sentiment in recent comms
      else if (lastComm && lastComm.sentiment === 'positive' && health.days_since_contact <= 14) {
        entry.reason = `Positive exchange ${daysAgo(lastComm.date)}`
        recentWins.push(entry)
      }
    }

    // Sort each category by priority
    goingCold.sort((a, b) => (b.pipelineValue || 0) - (a.pipelineValue || 0))
    needsFollowUp.sort((a, b) => a.daysSinceContact - b.daysSinceContact)
    activePartners.sort((a, b) => b.pipelineValue - a.pipelineValue)

    return NextResponse.json({
      needsFollowUp: needsFollowUp.slice(0, 5),
      goingCold: goingCold.slice(0, 5),
      recentWins: recentWins.slice(0, 5),
      activePartners: activePartners.slice(0, 5),
      summary: {
        totalFollowUp: needsFollowUp.length,
        totalCold: goingCold.length,
        totalActive: activePartners.length,
        totalWins: recentWins.length,
      },
    })
  } catch (error) {
    console.error('Error in touchpoints:', error)
    return NextResponse.json({ error: 'Failed to fetch touchpoints' }, { status: 500 })
  }
}

function formatK(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return `$${n.toLocaleString('en-AU')}`
}

function daysAgo(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}
