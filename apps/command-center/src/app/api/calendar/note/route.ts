import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { eventId, eventTitle, note, attendees } = body

    if (!note?.trim()) {
      return NextResponse.json(
        { error: 'Note text is required' },
        { status: 400 }
      )
    }

    // Store meeting note as a communication entry
    const { data, error } = await supabase
      .from('communications_history')
      .insert({
        subject: `Meeting note: ${eventTitle || 'Unnamed event'}`,
        summary: note.trim(),
        content: note.trim(),
        channel: 'meeting_note',
        direction: 'internal',
        sentiment: 'neutral',
        occurred_at: new Date().toISOString(),
        metadata: {
          calendar_event_id: eventId,
          event_title: eventTitle,
          attendees: attendees || [],
          source: 'manual_capture',
        },
      })
      .select('id')
      .single()

    if (error) {
      console.error('Calendar note insert error:', error)
      return NextResponse.json(
        { error: 'Failed to save meeting note' },
        { status: 500 }
      )
    }

    // Also create a project_knowledge entry for meeting notes (feeds into knowledge pipeline)
    await supabase
      .from('project_knowledge')
      .insert({
        title: `Meeting note: ${eventTitle || 'Unnamed event'}`,
        content: note.trim(),
        summary: note.trim().substring(0, 500),
        knowledge_type: 'meeting',
        importance: 'normal',
        participants: attendees || [],
        recorded_at: new Date().toISOString(),
        source_ref: `calendar:${eventId || 'manual'}`,
        action_required: false,
      })
      .then(({ error: knError }) => {
        if (knError) console.warn('Failed to create knowledge entry:', knError.message)
      })

    return NextResponse.json({
      success: true,
      id: data.id,
      message: 'Meeting note saved and queued for knowledge pipeline',
    })
  } catch (error) {
    console.error('Calendar note error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
