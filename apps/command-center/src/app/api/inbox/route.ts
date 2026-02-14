import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Unified Priority Inbox
 *
 * Merges all attention-requiring items across systems into
 * a single ranked list:
 * - Overdue actions (project_knowledge)
 * - Unanswered emails (communications_history)
 * - Upcoming deadlines (project_knowledge follow_up_date)
 * - Stale key relationships (ghl_contacts)
 *
 * Each item gets a priority score based on urgency and type.
 */

interface InboxItem {
  id: string
  type: 'overdue_action' | 'unanswered_email' | 'upcoming_deadline' | 'stale_contact'
  title: string
  subtitle: string | null
  projectCode: string | null
  urgency: 'critical' | 'high' | 'medium' | 'low'
  score: number // For sorting
  daysOld: number | null
  link: string | null
  meta: Record<string, unknown>
}

function daysBetween(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function daysUntil(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

export async function GET() {
  try {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const staleThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch all sources in parallel
    const [overdueRes, upcomingRes, emailsRes, staleRes] = await Promise.all([
      // Overdue actions
      supabase
        .from('project_knowledge')
        .select('id, title, project_code, follow_up_date, importance')
        .eq('knowledge_type', 'action')
        .eq('action_required', true)
        .eq('status', 'open')
        .lt('follow_up_date', todayStr)
        .order('follow_up_date', { ascending: true })
        .limit(20),

      // Upcoming deadlines (next 7 days)
      supabase
        .from('project_knowledge')
        .select('id, title, project_code, follow_up_date, importance')
        .eq('action_required', true)
        .eq('status', 'open')
        .gte('follow_up_date', todayStr)
        .lte('follow_up_date', sevenDaysOut)
        .order('follow_up_date', { ascending: true })
        .limit(15),

      // Unanswered emails (last 3 days)
      supabase
        .from('communications_history')
        .select('id, contact_name, contact_email, subject, occurred_at, project_code')
        .eq('direction', 'inbound')
        .eq('requires_response', true)
        .is('responded_at', null)
        .gte('occurred_at', threeDaysAgo)
        .order('occurred_at', { ascending: false })
        .limit(15),

      // Stale key contacts (active/prospect, no contact in 30+ days)
      supabase
        .from('ghl_contacts')
        .select('id, full_name, email, company_name, last_contact_date, engagement_status, projects')
        .in('engagement_status', ['active', 'prospect'])
        .lt('last_contact_date', staleThreshold)
        .not('last_contact_date', 'is', null)
        .order('last_contact_date', { ascending: true })
        .limit(10),
    ])

    const items: InboxItem[] = []

    // Process overdue actions (highest priority)
    for (const a of overdueRes.data || []) {
      const daysOverdue = daysBetween(a.follow_up_date)
      const isHigh = a.importance === 'high' || daysOverdue > 14
      items.push({
        id: `action-${a.id}`,
        type: 'overdue_action',
        title: a.title,
        subtitle: `${daysOverdue}d overdue`,
        projectCode: a.project_code,
        urgency: daysOverdue > 14 ? 'critical' : isHigh ? 'high' : 'medium',
        score: 100 + daysOverdue * 2 + (a.importance === 'high' ? 20 : 0),
        daysOld: daysOverdue,
        link: '/knowledge/actions',
        meta: { follow_up_date: a.follow_up_date, importance: a.importance },
      })
    }

    // Process unanswered emails
    for (const e of emailsRes.data || []) {
      const daysOld = daysBetween(e.occurred_at)
      items.push({
        id: `email-${e.id}`,
        type: 'unanswered_email',
        title: e.subject || '(No subject)',
        subtitle: `From ${e.contact_name || e.contact_email}`,
        projectCode: e.project_code,
        urgency: daysOld > 2 ? 'high' : 'medium',
        score: 80 + daysOld * 10,
        daysOld,
        link: null,
        meta: { from: e.contact_name, email: e.contact_email },
      })
    }

    // Process upcoming deadlines
    for (const d of upcomingRes.data || []) {
      const daysLeft = daysUntil(d.follow_up_date)
      items.push({
        id: `deadline-${d.id}`,
        type: 'upcoming_deadline',
        title: d.title,
        subtitle: daysLeft === 0 ? 'Due today' : `Due in ${daysLeft}d`,
        projectCode: d.project_code,
        urgency: daysLeft <= 1 ? 'high' : daysLeft <= 3 ? 'medium' : 'low',
        score: 60 + (7 - daysLeft) * 5 + (d.importance === 'high' ? 15 : 0),
        daysOld: -daysLeft,
        link: '/knowledge/actions',
        meta: { follow_up_date: d.follow_up_date },
      })
    }

    // Process stale contacts
    for (const c of staleRes.data || []) {
      const daysSince = daysBetween(c.last_contact_date)
      // Only include if genuinely stale (not just old GHL data)
      if (daysSince > 180) continue // Skip contacts >6 months — likely data issue
      items.push({
        id: `contact-${c.id}`,
        type: 'stale_contact',
        title: c.full_name?.trim() || c.email || 'Unknown',
        subtitle: c.company_name ? `${c.company_name} · ${daysSince}d ago` : `${daysSince}d since contact`,
        projectCode: (c.projects as string[])?.[0] || null,
        urgency: daysSince > 60 ? 'medium' : 'low',
        score: 30 + Math.min(daysSince, 90),
        daysOld: daysSince,
        link: '/people',
        meta: { email: c.email, engagement: c.engagement_status },
      })
    }

    // Sort by score descending
    items.sort((a, b) => b.score - a.score)

    return NextResponse.json({
      items: items.slice(0, 25),
      counts: {
        overdue_actions: items.filter(i => i.type === 'overdue_action').length,
        unanswered_emails: items.filter(i => i.type === 'unanswered_email').length,
        upcoming_deadlines: items.filter(i => i.type === 'upcoming_deadline').length,
        stale_contacts: items.filter(i => i.type === 'stale_contact').length,
        total: items.length,
      },
    })
  } catch (error) {
    console.error('Inbox error:', error)
    return NextResponse.json({ error: 'Failed to fetch inbox', items: [], counts: {} }, { status: 500 })
  }
}
