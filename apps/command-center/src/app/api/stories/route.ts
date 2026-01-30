import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/stories
 *
 * Returns storytellers from the storytellers table,
 * joined with their project name for display context.
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('storytellers')
      .select(`
        id,
        full_name,
        bio,
        expertise_areas,
        media_type,
        consent_given,
        consent_date,
        consent_expiry,
        location,
        created_at,
        updated_at,
        project_id,
        projects ( name )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Stories query error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const stories = (data || []).map((row: any) => ({
      id: row.id,
      storytellerName: row.full_name || 'Unknown storyteller',
      bio: row.bio || '',
      expertiseAreas: row.expertise_areas || [],
      mediaType: row.media_type || null,
      consentGiven: row.consent_given ?? false,
      consentDate: row.consent_date || null,
      consentExpiry: row.consent_expiry || null,
      location: row.location || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      projectName: row.projects?.name || null,
    }))

    return NextResponse.json({ success: true, stories })
  } catch (e) {
    console.error('Stories API error:', e)
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    )
  }
}
