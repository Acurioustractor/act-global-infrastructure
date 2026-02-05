/**
 * Contact Merge API
 *
 * POST /api/contacts/merge
 * Body: { keepId: string, mergeIds: string[] }
 *
 * Merges duplicate contacts:
 * 1. Reads all contacts (keep + merges)
 * 2. Merges tags, fills missing fields on the keep contact
 * 3. Re-points communications_history to the keep contact
 * 4. Deletes the merge contacts
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const keepId: string = body.keepId
    const mergeIds: string[] = body.mergeIds

    if (!keepId || !mergeIds || mergeIds.length === 0) {
      return NextResponse.json({ error: 'keepId and mergeIds required' }, { status: 400 })
    }

    if (mergeIds.includes(keepId)) {
      return NextResponse.json({ error: 'keepId cannot be in mergeIds' }, { status: 400 })
    }

    // 1. Fetch all contacts involved
    const allIds = [keepId, ...mergeIds]
    const { data: contacts, error: fetchErr } = await supabase
      .from('ghl_contacts')
      .select('*')
      .in('ghl_id', allIds)

    if (fetchErr || !contacts) {
      return NextResponse.json({ error: fetchErr?.message || 'Contacts not found' }, { status: 500 })
    }

    const keepContact = contacts.find(c => c.ghl_id === keepId)
    if (!keepContact) {
      return NextResponse.json({ error: 'Keep contact not found' }, { status: 404 })
    }

    const mergeContacts = contacts.filter(c => mergeIds.includes(c.ghl_id))

    // 2. Merge data into keep contact
    const mergedTags = new Set<string>(keepContact.tags || [])
    let mergedEmail = keepContact.email
    let mergedCompany = keepContact.company_name
    let mergedPhone = keepContact.phone
    let mergedFirstName = keepContact.first_name
    let mergedLastName = keepContact.last_name

    for (const mc of mergeContacts) {
      // Merge tags
      for (const tag of (mc.tags || [])) {
        mergedTags.add(tag)
      }
      // Fill missing fields from merge contacts (prefer real data over placeholders)
      if (!mergedEmail && mc.email && !isPlaceholderEmail(mc.email)) {
        mergedEmail = mc.email
      }
      if (!mergedCompany && mc.company_name) {
        mergedCompany = mc.company_name
      }
      if (!mergedPhone && mc.phone) {
        mergedPhone = mc.phone
      }
      if (!mergedFirstName && mc.first_name) {
        mergedFirstName = mc.first_name
      }
      if (!mergedLastName && mc.last_name) {
        mergedLastName = mc.last_name
      }
      // If keep has placeholder email but merge has real one, prefer real
      if (mergedEmail && isPlaceholderEmail(mergedEmail) && mc.email && !isPlaceholderEmail(mc.email)) {
        mergedEmail = mc.email
      }
    }

    // 3. Update the keep contact with merged data
    // Note: full_name is a generated column (first_name + last_name), so we update first/last
    const { error: updateErr } = await supabase
      .from('ghl_contacts')
      .update({
        tags: Array.from(mergedTags),
        email: mergedEmail,
        company_name: mergedCompany,
        phone: mergedPhone,
        first_name: mergedFirstName,
        last_name: mergedLastName,
        updated_at: new Date().toISOString(),
      })
      .eq('ghl_id', keepId)

    if (updateErr) {
      return NextResponse.json({ error: `Failed to update keep contact: ${updateErr.message}` }, { status: 500 })
    }

    // 4. Re-point communications_history from merged contacts to keep contact
    await supabase
      .from('communications_history')
      .update({ ghl_contact_id: keepId })
      .in('ghl_contact_id', mergeIds)

    // 5. Delete dependent rows for merge contacts (all FK tables)
    const dependentTables = [
      'relationship_health',
      'contact_activities',
      'contact_notes',
      'contact_engagement_scores',
      'ghl_opportunities',
      'cultural_protocols',
      'donations',
      'volunteer_hours',
      'voice_notes',
    ]

    for (const table of dependentTables) {
      const col = table === 'voice_notes' ? 'related_contact_id' : 'ghl_contact_id'
      await supabase.from(table).delete().in(col, mergeIds)
    }

    // 6. Delete the merge contacts
    const { error: deleteErr } = await supabase
      .from('ghl_contacts')
      .delete()
      .in('ghl_id', mergeIds)

    if (deleteErr) {
      return NextResponse.json({ error: `Failed to delete merged contacts: ${deleteErr.message}` }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      kept: keepId,
      merged: mergeIds.length,
      tags: Array.from(mergedTags),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

function isPlaceholderEmail(email: string): boolean {
  const lower = email.toLowerCase()
  return (
    lower.includes('@empathy-ledger.local') ||
    lower.includes('@storyteller.local') ||
    lower.includes('@placeholder.local') ||
    lower.includes('@example.com')
  )
}
