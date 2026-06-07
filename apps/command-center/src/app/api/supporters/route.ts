import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Returns the unified supporter view: tier + $ paid + $ outstanding +
 * open opps + last touch across all comms channels + active pipelines.
 *
 * Used by /supporters page in command-center. Joins:
 *   - supporters_intelligence (53 rows, daily 06:00am)
 *   - supporter_comms_summary (807 rows, daily 06:15am, by email-domain)
 *   - project_pipelines (39 rows, daily 06:10am)
 *
 * Plan: act-communication-pipeline-2026-05-23-locked § unified supporter view
 */

interface Supporter {
  slug: string
  name: string
  tier: string
  stage: string | null
  totalPaidAud: number
  outstandingAud: number
  outstandingAlert: string
  outstandingAgeDays: number | null
  projects: string[]
  primaryEmail: string | null
  primaryContact: string | null
  lastCommunicatedAt: string | null
  daysSinceLastContact: number | null
  themes: string[]
  nextReportDue: string | null
  // Opportunities
  openOppCount: number
  openOppValueAud: number
  wonOppCount: number
  wonOppValueAud: number
  pipelines: string[]
  latestStage: string | null
  latestStagePipeline: string | null
  // Communications (NEW)
  domain: string | null
  lastTouchAt: string | null
  lastTouchChannel: string | null
  lastTouchDirection: string | null
  lastTouchSubject: string | null
  lastTouchSnippet: string | null
  total30d: number
  total90d: number
  in30d: number
  out30d: number
  waitingForResponseCount: number
  channels: string[]
  needsReply: boolean
}

function pickDomain(primaryEmail: string | null | undefined): string | null {
  if (!primaryEmail) return null
  const first = primaryEmail.split(',')[0].trim()
  const at = first.indexOf('@')
  if (at < 0) return null
  return first.slice(at + 1).toLowerCase()
}

export async function GET() {
  try {
    const [supportersResult, commsResult] = await Promise.all([
      supabase
        .from('supporters_intelligence')
        .select('*')
        .order('outstanding_aud', { ascending: false })
        .limit(500),
      supabase
        .from('supporter_comms_summary')
        .select('*')
        .limit(2000),
    ])

    if (supportersResult.error) throw supportersResult.error
    if (commsResult.error) throw commsResult.error

    const commsByDomain = new Map<string, any>()
    for (const c of commsResult.data || []) {
      commsByDomain.set(c.domain, c)
    }

    const supporters: Supporter[] = (supportersResult.data || []).map((s: any) => {
      const domain = pickDomain(s.primary_email)
      const c = domain ? commsByDomain.get(domain) : null
      const lastTouchAt = c?.last_touch_at || s.last_communicated_at || null
      const daysSinceLastTouch = lastTouchAt
        ? Math.floor((Date.now() - new Date(lastTouchAt).getTime()) / 86400_000)
        : null
      const needsReply = (c?.waiting_for_response_count || 0) > 0
        || (s.outstanding_alert === 'CRITICAL' && (daysSinceLastTouch ?? 0) > 14)
        || (s.tier === 'WARM' && (daysSinceLastTouch ?? 0) > 90)

      return {
        slug: s.slug,
        name: s.name,
        tier: s.tier,
        stage: s.stage,
        totalPaidAud: Number(s.total_paid_aud || 0),
        outstandingAud: Number(s.outstanding_aud || 0),
        outstandingAlert: s.outstanding_alert,
        outstandingAgeDays: s.outstanding_age_days,
        projects: s.projects || [],
        primaryEmail: s.primary_email,
        primaryContact: s.primary_contact,
        lastCommunicatedAt: s.last_communicated_at,
        daysSinceLastContact: s.days_since_last_contact,
        themes: s.themes || [],
        nextReportDue: s.next_report_due,
        openOppCount: s.open_opp_count || 0,
        openOppValueAud: Number(s.open_opp_value_aud || 0),
        wonOppCount: s.won_opp_count || 0,
        wonOppValueAud: Number(s.won_opp_value_aud || 0),
        pipelines: s.pipelines || [],
        latestStage: s.latest_stage,
        latestStagePipeline: s.latest_stage_pipeline,
        domain,
        lastTouchAt,
        lastTouchChannel: c?.last_touch_channel || null,
        lastTouchDirection: c?.last_touch_direction || null,
        lastTouchSubject: c?.last_touch_subject || null,
        lastTouchSnippet: c?.last_touch_snippet || null,
        total30d: c?.total_30d || 0,
        total90d: c?.total_90d || 0,
        in30d: c?.in_30d || 0,
        out30d: c?.out_30d || 0,
        waitingForResponseCount: c?.waiting_for_response_count || 0,
        channels: c?.channels || [],
        needsReply,
      }
    })

    const summary = {
      total: supporters.length,
      tiers: supporters.reduce((acc, s) => {
        acc[s.tier] = (acc[s.tier] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      criticalOutstanding: supporters.filter((s) => s.outstandingAlert === 'CRITICAL').length,
      needsReply: supporters.filter((s) => s.needsReply).length,
      totalPaidLifetimeAud: supporters.reduce((s, x) => s + x.totalPaidAud, 0),
      totalOutstandingAud: supporters.reduce((s, x) => s + x.outstandingAud, 0),
      totalOpenOppValueAud: supporters.reduce((s, x) => s + x.openOppValueAud, 0),
    }

    return NextResponse.json({ supporters, summary })
  } catch (e: any) {
    console.error('supporters API failed:', e)
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
