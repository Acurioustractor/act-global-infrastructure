import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ghlUpdateContact } from '@/lib/ghl'

export async function POST(req: Request) {
  try {
    const { keepId, mergeIds } = await req.json() as { keepId: string; mergeIds: string[] }

    if (!keepId || !mergeIds?.length) {
      return NextResponse.json({ error: 'keepId and mergeIds required' }, { status: 400 })
    }

    // 1. Load the keeper contact
    const { data: keeper, error: keeperErr } = await supabase
      .from('ghl_contacts')
      .select('*')
      .eq('ghl_id', keepId)
      .single()

    if (keeperErr || !keeper) {
      return NextResponse.json({ error: 'Keeper contact not found' }, { status: 404 })
    }

    // 2. Load merge candidates
    const { data: mergeCandidates, error: mergeErr } = await supabase
      .from('ghl_contacts')
      .select('*')
      .in('ghl_id', mergeIds)

    if (mergeErr || !mergeCandidates?.length) {
      return NextResponse.json({ error: 'Merge contacts not found' }, { status: 404 })
    }

    // 3. Union tags from all contacts onto the keeper
    const allTags = new Set<string>(keeper.tags || [])
    for (const mc of mergeCandidates) {
      for (const tag of mc.tags || []) allTags.add(tag)
    }
    const unionTags = Array.from(allTags)

    // 4. Copy company_name/website to keeper if keeper is missing them
    const updates: Record<string, unknown> = {
      tags: unionTags,
      updated_at: new Date().toISOString(),
    }
    if (!keeper.company_name) {
      const company = mergeCandidates.find(c => c.company_name)?.company_name
      if (company) updates.company_name = company
    }
    if (!keeper.website) {
      const website = mergeCandidates.find(c => c.website)?.website
      if (website) updates.website = website
    }

    // 5. Update the keeper
    const { error: updateErr } = await supabase
      .from('ghl_contacts')
      .update(updates)
      .eq('ghl_id', keepId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // 6. Reassign all FK-referenced tables before delete.
    //    7 tables hold FKs to ghl_contacts — all must be handled.
    //    Reassign (move to keeper) where history matters; delete where it doesn't.

    // 6a. Resolve the internal UUIDs for merge targets (contact_entity_links uses id not ghl_id)
    const mergeIdsStr = mergeIds.join(',')
    const keeperUuid = keeper.id as string
    const mergeUuids = mergeCandidates.map(c => c.id as string)

    // 6b. Reassign — preserve history on keeper
    const reassignTables: Array<{ table: string; column: string; ids: string[]; keep: string }> = [
      { table: 'communications_history', column: 'ghl_contact_id', ids: mergeIds, keep: keepId },
      { table: 'contact_votes',          column: 'ghl_contact_id', ids: mergeIds, keep: keepId },
      { table: 'ghl_opportunities',      column: 'ghl_contact_id', ids: mergeIds, keep: keepId },
      { table: 'user_identities',        column: 'ghl_contact_id', ids: mergeIds, keep: keepId },
      { table: 'voice_notes',            column: 'related_contact_id', ids: mergeIds, keep: keepId },
      { table: 'contact_entity_links',   column: 'contact_id', ids: mergeUuids, keep: keeperUuid },
    ]

    for (const { table, column, ids, keep } of reassignTables) {
      const { error: err } = await supabase
        .from(table)
        .update({ [column]: keep })
        .in(column, ids)
      if (err) {
        console.error(`[merge] reassign ${table}.${column} failed:`, err.message)
      }
    }

    // 6c. Delete — relationship_health is per-contact aggregation, regenerated on next run
    await supabase
      .from('relationship_health')
      .delete()
      .in('ghl_contact_id', mergeIds)

    // 7. Delete the merged contacts (FK reassignments above must succeed first)
    const { error: deleteErr } = await supabase
      .from('ghl_contacts')
      .delete()
      .in('ghl_id', mergeIds)

    if (deleteErr) {
      return NextResponse.json(
        { error: `Delete failed (likely FK still referenced): ${deleteErr.message}` },
        { status: 500 }
      )
    }

    // 8. Push updated tags to GHL (best-effort)
    try {
      await ghlUpdateContact(keepId, { tags: unionTags })
    } catch (ghlErr) {
      console.error('GHL tag sync after merge (non-blocking):', ghlErr)
    }

    return NextResponse.json({ ok: true, mergedCount: mergeIds.length })
  } catch (e) {
    console.error('Merge error:', e)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
