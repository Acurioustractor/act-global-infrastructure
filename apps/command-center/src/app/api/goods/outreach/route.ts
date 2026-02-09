/**
 * Goods Outreach Recommendations API
 *
 * GET /api/goods/outreach?limit=20
 *
 * Returns prioritized list of Goods contacts to reach out to,
 * with reasons for each recommendation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface OutreachRecommendation {
  id: string
  name: string
  email: string | null
  tags: string[]
  reason: string
  priority: 'high' | 'medium' | 'low'
  daysSinceContact: number | null
  lastContactDate: string | null
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

  try {
    // Fetch all Goods contacts with their last contact date
    const { data: contacts, error } = await supabase
      .from('ghl_contacts')
      .select('id, ghl_id, full_name, first_name, last_name, email, tags, engagement_status, last_contact_date, created_at')
      .contains('tags', ['goods'])
      .order('last_contact_date', { ascending: true, nullsFirst: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const now = new Date()
    const recommendations: OutreachRecommendation[] = []

    for (const contact of contacts || []) {
      const name = contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown'
      const daysSinceContact = contact.last_contact_date
        ? Math.floor((now.getTime() - new Date(contact.last_contact_date).getTime()) / 86400000)
        : null
      const daysSinceCreated = Math.floor((now.getTime() - new Date(contact.created_at).getTime()) / 86400000)

      let reason: string | null = null
      let priority: 'high' | 'medium' | 'low' = 'low'

      // New contacts (< 7 days) -> welcome
      if (daysSinceCreated <= 7 && (daysSinceContact === null || daysSinceContact >= daysSinceCreated)) {
        reason = 'New contact — send welcome'
        priority = 'high'
      }
      // No contact > 30 days -> share recent story
      else if (daysSinceContact !== null && daysSinceContact > 30) {
        reason = `No contact in ${daysSinceContact} days — share a recent story or update`
        priority = daysSinceContact > 60 ? 'high' : 'medium'
      }
      // No contact > 14 days -> check-in
      else if (daysSinceContact !== null && daysSinceContact > 14) {
        reason = `${daysSinceContact} days since last contact — check in`
        priority = 'medium'
      }
      // Never contacted
      else if (daysSinceContact === null) {
        reason = 'Never contacted — introduce Goods'
        priority = 'high'
      }

      // Seasonal triggers (Australian growing seasons)
      const month = now.getMonth() // 0-indexed
      if (month >= 8 && month <= 10) {
        // Sep-Nov: spring planting
        if (!reason) {
          reason = 'Spring planting season — share seasonal update'
          priority = 'low'
        }
      } else if (month >= 2 && month <= 4) {
        // Mar-May: autumn harvest
        if (!reason) {
          reason = 'Autumn harvest season — share seasonal update'
          priority = 'low'
        }
      }

      if (reason) {
        recommendations.push({
          id: contact.id,
          name,
          email: contact.email,
          tags: contact.tags || [],
          reason,
          priority,
          daysSinceContact,
          lastContactDate: contact.last_contact_date,
        })
      }
    }

    // Sort by priority (high first), then by days since contact (longest first)
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    recommendations.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (pDiff !== 0) return pDiff
      // Null (never contacted) sorts before non-null
      if (a.daysSinceContact === null && b.daysSinceContact !== null) return -1
      if (a.daysSinceContact !== null && b.daysSinceContact === null) return 1
      return (b.daysSinceContact || 0) - (a.daysSinceContact || 0)
    })

    const limited = recommendations.slice(0, limit)

    return NextResponse.json({
      total: recommendations.length,
      showing: limited.length,
      recommendations: limited,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
