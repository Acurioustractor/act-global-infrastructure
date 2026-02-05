/**
 * All Contacts API
 *
 * GET /api/contacts/all
 *
 * Returns paginated contacts with project tags and last email info.
 * Supports: ?search=, ?project=, ?untagged=true, ?company=, ?engagement=,
 *           ?sort=name|recent|oldest|company, ?limit=, ?offset=
 *
 * DELETE /api/contacts/all
 * Body: { ids: string[] }  — deletes contacts by ghl_id from Supabase
 *
 * PATCH /api/contacts/all
 * Body: { ids: string[], companyName: string }  — bulk update company
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load project codes once at module level
let projectTagMap: Map<string, string> | null = null

function getProjectTagMap(): Map<string, string> {
  if (projectTagMap) return projectTagMap
  try {
    const filePath = join(process.cwd(), '..', '..', 'config', 'project-codes.json')
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'))
    projectTagMap = new Map<string, string>()
    for (const [, project] of Object.entries(raw.projects as Record<string, { ghl_tags?: string[]; name: string }>)) {
      const tags = project.ghl_tags || []
      for (const tag of tags) {
        projectTagMap.set(tag.toLowerCase(), (project as { ghl_tags?: string[]; name: string; code?: string }).code || '')
      }
    }
    // Re-do with code from keys
    projectTagMap = new Map<string, string>()
    for (const [code, project] of Object.entries(raw.projects as Record<string, { ghl_tags?: string[]; name: string }>)) {
      const tags = project.ghl_tags || []
      for (const tag of tags) {
        projectTagMap.set(tag.toLowerCase(), code)
      }
    }
  } catch {
    projectTagMap = new Map()
  }
  return projectTagMap
}

function deriveProjects(tags: string[]): string[] {
  const tagMap = getProjectTagMap()
  const projects = new Set<string>()
  for (const tag of tags) {
    const code = tagMap.get(tag.toLowerCase())
    if (code) projects.add(code)
  }
  return Array.from(projects)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const project = searchParams.get('project') || ''
    const company = searchParams.get('company') || ''
    const engagement = searchParams.get('engagement') || ''
    const untagged = searchParams.get('untagged') === 'true'
    const noEmail = searchParams.get('noEmail') === 'true'
    const sort = searchParams.get('sort') || 'name'
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('ghl_contacts')
      .select('id, ghl_id, full_name, first_name, last_name, email, company_name, tags, engagement_status, last_contact_date', { count: 'exact' })

    // Search filter
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`)
    }

    // Company filter (exact match for dropdown selection)
    if (company) {
      query = query.eq('company_name', company)
    }

    // Engagement status filter
    if (engagement) {
      query = query.eq('engagement_status', engagement)
    }

    // No email filter
    if (noEmail) {
      query = query.is('email', null)
    }

    // Project filter
    if (project) {
      const filePath = join(process.cwd(), '..', '..', 'config', 'project-codes.json')
      const raw = JSON.parse(readFileSync(filePath, 'utf-8'))
      const projectEntry = raw.projects[project]
      if (projectEntry?.ghl_tags?.[0]) {
        query = query.contains('tags', [projectEntry.ghl_tags[0]])
      }
    }

    // Sort
    switch (sort) {
      case 'recent':
        query = query.order('last_contact_date', { ascending: false, nullsFirst: false })
        break
      case 'oldest':
        query = query.order('last_contact_date', { ascending: true, nullsFirst: true })
        break
      case 'company':
        query = query.order('company_name', { ascending: true, nullsFirst: false })
        break
      default:
        query = query.order('full_name', { ascending: true })
    }

    query = query.range(offset, offset + limit - 1)

    const { data: rawContacts, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const contacts = rawContacts || []
    const now = new Date()

    // Fetch latest communication per contact
    const ghlIds = contacts.map(c => c.ghl_id)
    const latestCommsMap = new Map<string, { subject: string; occurred_at: string }>()

    if (ghlIds.length > 0) {
      const { data: latestComms } = await supabase
        .from('communications_history')
        .select('ghl_contact_id, subject, occurred_at')
        .in('ghl_contact_id', ghlIds)
        .order('ghl_contact_id')
        .order('occurred_at', { ascending: false })

      if (latestComms) {
        for (const comm of latestComms) {
          if (!latestCommsMap.has(comm.ghl_contact_id)) {
            latestCommsMap.set(comm.ghl_contact_id, {
              subject: comm.subject || 'No subject',
              occurred_at: comm.occurred_at,
            })
          }
        }
      }
    }

    // Build response
    const result = contacts.map(c => {
      const tags = c.tags || []
      const projects = deriveProjects(tags)
      const latestComm = latestCommsMap.get(c.ghl_id)
      const daysSinceContact = c.last_contact_date
        ? Math.floor((now.getTime() - new Date(c.last_contact_date).getTime()) / 86400000)
        : null

      return {
        id: c.id,
        ghl_id: c.ghl_id,
        full_name: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
        email: c.email,
        company_name: c.company_name,
        tags,
        projects,
        days_since_contact: daysSinceContact,
        last_email_subject: latestComm?.subject || null,
        last_email_date: latestComm?.occurred_at || null,
      }
    })

    // Client-side filter for untagged (contacts with no project tags)
    const filtered = untagged ? result.filter(c => c.projects.length === 0) : result

    // Fetch distinct company names for dropdown filter
    const { data: companyRows } = await supabase
      .from('ghl_contacts')
      .select('company_name')
      .not('company_name', 'is', null)
      .neq('company_name', '')
      .order('company_name')

    const companies = [...new Set((companyRows || []).map(r => r.company_name as string))].filter(Boolean)

    return NextResponse.json({
      contacts: filtered,
      total: untagged ? filtered.length : (count || 0),
      companies,
      limit,
      offset,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const ids: string[] = body.ids
    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: 'No ids provided' }, { status: 400 })
    }

    // Delete dependent rows from all tables that reference ghl_contacts(ghl_id)
    const dependentTables = [
      'relationship_health',
      'communications_history',
      'contact_activities',
      'contact_notes',
      'contact_engagement_scores',
      'ghl_opportunities',
      'cultural_protocols',
      'donations',
      'volunteer_hours',
    ]

    for (const table of dependentTables) {
      await supabase.from(table).delete().in('ghl_contact_id', ids)
    }
    // voice_notes uses a different column name
    await supabase.from('voice_notes').delete().in('related_contact_id', ids)

    // Delete from Supabase by ghl_id
    const { error, count } = await supabase
      .from('ghl_contacts')
      .delete()
      .in('ghl_id', ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, deleted: count || ids.length })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const ids: string[] = body.ids
    const updates: Record<string, unknown> = {}

    if (body.companyName !== undefined) {
      updates.company_name = body.companyName
    }

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: 'No ids provided' }, { status: 400 })
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('ghl_contacts')
      .update(updates)
      .in('ghl_id', ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, updated: ids.length })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
