/**
 * Goods Intelligence Dashboard API
 *
 * GET /api/goods/dashboard
 *
 * Returns aggregated data for the Goods dashboard:
 * - Segment counts
 * - All Goods contacts with computed fields
 * - Content library items
 * - Outreach recommendations
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Parallel queries: contacts, content
    const [contactsResult, contentResult] = await Promise.all([
      supabase
        .from('ghl_contacts')
        .select('id, ghl_id, full_name, first_name, last_name, email, company_name, website, tags, engagement_status, last_contact_date, created_at')
        .contains('tags', ['goods'])
        .order('full_name', { ascending: true }),
      supabase
        .from('goods_content_library')
        .select('*')
        .order('published_at', { ascending: false }),
    ])

    if (contactsResult.error) {
      return NextResponse.json({ error: contactsResult.error.message }, { status: 500 })
    }

    const rawContacts = contactsResult.data || []
    const content = contentResult.data || []
    const now = new Date()

    // Derive segment from tags
    function getSegment(tags: string[]): string {
      if (tags.includes('goods-funder')) return 'funder'
      if (tags.includes('goods-partner')) return 'partner'
      if (tags.includes('goods-storyteller')) return 'storyteller'
      if (tags.includes('goods-supporter')) return 'supporter'
      return 'community'
    }

    // Build contacts with computed fields
    const contacts = rawContacts.map(c => {
      const tags = c.tags || []
      const daysSinceContact = c.last_contact_date
        ? Math.floor((now.getTime() - new Date(c.last_contact_date).getTime()) / 86400000)
        : null

      return {
        id: c.id,
        ghl_id: c.ghl_id,
        full_name: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        company_name: c.company_name,
        website: c.website,
        tags,
        last_contact_date: c.last_contact_date,
        newsletter_consent: tags.includes('goods-newsletter'),
        segment: getSegment(tags),
        days_since_contact: daysSinceContact,
      }
    })

    // Segment counts
    const segments = {
      total: contacts.length,
      newsletter: contacts.filter(c => c.newsletter_consent).length,
      funders: contacts.filter(c => c.segment === 'funder').length,
      partners: contacts.filter(c => c.segment === 'partner').length,
      community: contacts.filter(c => c.segment === 'community').length,
      supporters: contacts.filter(c => c.segment === 'supporter').length,
      storytellers: contacts.filter(c => c.segment === 'storyteller').length,
      needingAttention: contacts.filter(c =>
        c.days_since_contact === null || c.days_since_contact > 30
      ).length,
    }

    // Build outreach recommendations (same logic as outreach API)
    const outreach: Array<{
      id: string
      name: string
      email: string | null
      reason: string
      priority: 'high' | 'medium' | 'low'
      days_since_contact: number | null
      ghl_id: string
      segment: string
    }> = []

    for (const c of contacts) {
      const daysSinceCreated = Math.floor((now.getTime() - new Date(rawContacts.find(r => r.id === c.id)!.created_at).getTime()) / 86400000)
      let reason: string | null = null
      let priority: 'high' | 'medium' | 'low' = 'low'

      if (daysSinceCreated <= 7 && (c.days_since_contact === null || c.days_since_contact >= daysSinceCreated)) {
        reason = 'New contact — send welcome'
        priority = 'high'
      } else if (c.days_since_contact !== null && c.days_since_contact > 30) {
        reason = `No contact in ${c.days_since_contact} days — share a recent story`
        priority = c.days_since_contact > 60 ? 'high' : 'medium'
      } else if (c.days_since_contact !== null && c.days_since_contact > 14) {
        reason = `${c.days_since_contact} days since last contact — check in`
        priority = 'medium'
      } else if (c.days_since_contact === null) {
        reason = 'Never contacted — introduce Goods'
        priority = 'high'
      }

      if (reason) {
        outreach.push({
          id: c.id,
          name: c.full_name,
          email: c.email,
          reason,
          priority,
          days_since_contact: c.days_since_contact,
          ghl_id: c.ghl_id,
          segment: c.segment,
        })
      }
    }

    // Sort outreach: high first, then by days since contact desc
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    outreach.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (pDiff !== 0) return pDiff
      if (a.days_since_contact === null && b.days_since_contact !== null) return -1
      if (a.days_since_contact !== null && b.days_since_contact === null) return 1
      return (b.days_since_contact || 0) - (a.days_since_contact || 0)
    })

    return NextResponse.json({
      segments,
      contacts,
      content,
      outreach: outreach.slice(0, 20),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
