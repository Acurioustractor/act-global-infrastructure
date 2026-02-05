/**
 * Contact Duplicates API
 *
 * GET /api/contacts/duplicates
 *
 * Finds duplicate contacts by email and name match.
 * Returns grouped duplicate sets with merge suggestions.
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface ContactRow {
  ghl_id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  company_name: string | null
  tags: string[] | null
  created_at: string | null
  last_contact_date: string | null
}

export async function GET() {
  try {
    // Fetch ALL contacts (Supabase defaults to 1000 rows, so paginate)
    const allContacts: ContactRow[] = []
    const pageSize = 1000
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const { data: page, error } = await supabase
        .from('ghl_contacts')
        .select('ghl_id, full_name, first_name, last_name, email, company_name, tags, created_at, last_contact_date')
        .order('created_at', { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      allContacts.push(...(page as ContactRow[] || []))
      hasMore = (page?.length || 0) === pageSize
      offset += pageSize
    }

    // Group by email (case-insensitive, ignoring placeholder emails)
    const emailGroups = new Map<string, ContactRow[]>()
    for (const c of allContacts) {
      if (!c.email) continue
      const e = c.email.toLowerCase().trim()
      // Skip placeholder emails for email-based dedup
      if (e.includes('@empathy-ledger.local') || e.includes('@storyteller.local') || e.includes('@placeholder.local')) continue
      if (!emailGroups.has(e)) emailGroups.set(e, [])
      emailGroups.get(e)!.push(c)
    }

    // Group by name (case-insensitive, non-empty)
    const nameGroups = new Map<string, ContactRow[]>()
    for (const c of allContacts) {
      const name = (c.full_name || '').trim().toLowerCase()
      if (!name || name.length < 2) continue
      if (!nameGroups.has(name)) nameGroups.set(name, [])
      nameGroups.get(name)!.push(c)
    }

    // Build duplicate sets, deduplicating by ghl_id
    const seen = new Set<string>()
    const duplicateSets: Array<{
      key: string
      match_type: 'email' | 'name'
      contacts: Array<{
        ghl_id: string
        full_name: string
        email: string | null
        company_name: string | null
        tags: string[]
        created_at: string | null
        last_contact_date: string | null
        is_placeholder_email: boolean
      }>
    }> = []

    // Email duplicates first (higher confidence)
    for (const [email, group] of emailGroups) {
      if (group.length < 2) continue
      const setKey = `email:${email}`
      seen.add(setKey)
      duplicateSets.push({
        key: email,
        match_type: 'email',
        contacts: group.map(c => ({
          ghl_id: c.ghl_id,
          full_name: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || '(no name)',
          email: c.email,
          company_name: c.company_name,
          tags: c.tags || [],
          created_at: c.created_at,
          last_contact_date: c.last_contact_date,
          is_placeholder_email: false,
        })),
      })
    }

    // Name duplicates (only if not already caught by email)
    for (const [name, group] of nameGroups) {
      if (group.length < 2) continue
      // Check if all contacts in this group were already in an email group
      const ghlIds = group.map(c => c.ghl_id)
      const alreadyCovered = duplicateSets.some(ds =>
        ds.contacts.length >= 2 &&
        ghlIds.every(id => ds.contacts.some(c => c.ghl_id === id))
      )
      if (alreadyCovered) continue

      duplicateSets.push({
        key: name,
        match_type: 'name',
        contacts: group.map(c => ({
          ghl_id: c.ghl_id,
          full_name: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || '(no name)',
          email: c.email,
          company_name: c.company_name,
          tags: c.tags || [],
          created_at: c.created_at,
          last_contact_date: c.last_contact_date,
          is_placeholder_email: !!(c.email && (
            c.email.includes('@empathy-ledger.local') ||
            c.email.includes('@storyteller.local') ||
            c.email.includes('@placeholder.local')
          )),
        })),
      })
    }

    // Also find blank contacts (no name AND no email)
    const blanks = allContacts
      .filter(c => {
        const name = (c.full_name || '').trim()
        return (!name || name.length < 2) && !c.email
      })
      .map(c => ({
        ghl_id: c.ghl_id,
        full_name: '(blank)',
        email: null,
        company_name: c.company_name,
        tags: c.tags || [],
        created_at: c.created_at,
        last_contact_date: c.last_contact_date,
        is_placeholder_email: false,
      }))

    // Sort by number of duplicates (biggest groups first)
    duplicateSets.sort((a, b) => b.contacts.length - a.contacts.length)

    return NextResponse.json({
      duplicate_sets: duplicateSets,
      total_sets: duplicateSets.length,
      total_duplicates: duplicateSets.reduce((sum, s) => sum + s.contacts.length - 1, 0),
      blank_contacts: blanks,
      total_contacts: allContacts.length,
    })
  } catch (e) {
    console.error('Duplicates check error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
