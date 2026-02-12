/**
 * Entity Merge API
 *
 * POST /api/entities/merge
 * Body: { keepEntityId: string, mergeEntityId: string, matchId?: string }
 *
 * Merges two canonical entities:
 * 1. Picks surviving entity (keepEntityId)
 * 2. Moves all identifiers from merged to surviving
 * 3. Fills blank canonical fields from merged entity
 * 4. Updates ghl_contacts to point to surviving entity
 * 5. Logs to entity_merge_log with full snapshot
 * 6. Deletes merged canonical entity
 * 7. Marks the match as 'merged' if matchId provided
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keepEntityId, mergeEntityId, matchId } = body as {
      keepEntityId: string
      mergeEntityId: string
      matchId?: string
    }

    if (!keepEntityId || !mergeEntityId) {
      return NextResponse.json({ error: 'keepEntityId and mergeEntityId required' }, { status: 400 })
    }

    if (keepEntityId === mergeEntityId) {
      return NextResponse.json({ error: 'Cannot merge an entity with itself' }, { status: 400 })
    }

    // 1. Fetch both entities
    const [keepResult, mergeResult] = await Promise.all([
      supabase.from('canonical_entities').select('*').eq('id', keepEntityId).single(),
      supabase.from('canonical_entities').select('*').eq('id', mergeEntityId).single(),
    ])

    if (keepResult.error || !keepResult.data) {
      return NextResponse.json({ error: 'Keep entity not found' }, { status: 404 })
    }
    if (mergeResult.error || !mergeResult.data) {
      return NextResponse.json({ error: 'Merge entity not found' }, { status: 404 })
    }

    const keepEntity = keepResult.data
    const mergeEntity = mergeResult.data

    // 2. Log the merge before making changes (for undo capability)
    const { error: logError } = await supabase
      .from('entity_merge_log')
      .insert({
        surviving_entity_id: keepEntityId,
        merged_entity_id: mergeEntityId,
        merged_entity_snapshot: mergeEntity,
        merge_reason: 'manual',
        match_confidence: null,
        match_details: { matchId },
        merged_by: 'manual:dashboard',
      })

    if (logError) {
      return NextResponse.json({ error: `Failed to create merge log: ${logError.message}` }, { status: 500 })
    }

    // 3. Move all identifiers from merged entity to surviving
    const { error: moveIdError } = await supabase
      .from('entity_identifiers')
      .update({ entity_id: keepEntityId })
      .eq('entity_id', mergeEntityId)

    if (moveIdError) {
      // Handle unique constraint violations by deleting duplicates from merged entity
      if (moveIdError.code === '23505') {
        // Delete identifiers that already exist on keep entity
        await supabase
          .from('entity_identifiers')
          .delete()
          .eq('entity_id', mergeEntityId)

        // Retry the move for any remaining
        await supabase
          .from('entity_identifiers')
          .update({ entity_id: keepEntityId })
          .eq('entity_id', mergeEntityId)
      } else {
        return NextResponse.json({ error: `Failed to move identifiers: ${moveIdError.message}` }, { status: 500 })
      }
    }

    // 4. Fill blank canonical fields from merged entity
    const updates: Record<string, unknown> = {
      merge_count: (keepEntity.merge_count || 1) + (mergeEntity.merge_count || 1),
      last_merge_at: new Date().toISOString(),
      merged_from: [...(keepEntity.merged_from || []), mergeEntityId],
    }

    if (!keepEntity.canonical_email && mergeEntity.canonical_email) {
      updates.canonical_email = mergeEntity.canonical_email
    }
    if (!keepEntity.canonical_phone && mergeEntity.canonical_phone) {
      updates.canonical_phone = mergeEntity.canonical_phone
    }
    if (!keepEntity.canonical_company && mergeEntity.canonical_company) {
      updates.canonical_company = mergeEntity.canonical_company
    }
    if (!keepEntity.relationship_strength && mergeEntity.relationship_strength) {
      updates.relationship_strength = mergeEntity.relationship_strength
    }

    // Merge project codes
    const keepProjects = keepEntity.primary_project_codes || []
    const mergeProjects = mergeEntity.primary_project_codes || []
    if (mergeProjects.length > 0) {
      updates.primary_project_codes = [...new Set([...keepProjects, ...mergeProjects])]
    }

    await supabase
      .from('canonical_entities')
      .update(updates)
      .eq('id', keepEntityId)

    // 5. Update ghl_contacts to point to surviving entity
    await supabase
      .from('ghl_contacts')
      .update({ canonical_entity_id: keepEntityId })
      .eq('canonical_entity_id', mergeEntityId)

    // 6. Delete merged canonical entity
    const { error: deleteError } = await supabase
      .from('canonical_entities')
      .delete()
      .eq('id', mergeEntityId)

    if (deleteError) {
      return NextResponse.json({ error: `Failed to delete merged entity: ${deleteError.message}` }, { status: 500 })
    }

    // 7. Mark the match as merged if matchId provided
    if (matchId) {
      await supabase
        .from('entity_potential_matches')
        .update({
          status: 'merged',
          reviewed_by: 'manual:dashboard',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', matchId)
    }

    // Also clean up any other potential matches involving the merged entity
    await supabase
      .from('entity_potential_matches')
      .delete()
      .or(`entity_a_id.eq.${mergeEntityId},entity_b_id.eq.${mergeEntityId}`)

    return NextResponse.json({
      ok: true,
      kept: keepEntityId,
      merged: mergeEntityId,
      fieldsUpdated: Object.keys(updates),
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
