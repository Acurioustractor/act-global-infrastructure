/**
 * Meeting search — search meetings by project, participant, date, keyword.
 *
 * Extracted from Notion Workers Tool 23 (query_meeting_notes).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface MeetingSearchOptions {
  query?: string
  project_code?: string
  participant?: string
  days_back?: number
  include_transcript?: boolean
  limit?: number
}

export interface MeetingSearchEntry {
  id: string
  title: string | null
  date: string
  duration: number | null
  project_code: string | null
  participants: string[]
  summary: string | null
  ai_action_items: Array<{ action: string; completed: boolean }> | null
  strategic_relevance: string | null
  transcript: string | null
  source_url: string | null
}

export interface MeetingSearchResult {
  count: number
  meetings: MeetingSearchEntry[]
}

export async function searchMeetings(
  supabase: SupabaseQueryClient,
  opts: MeetingSearchOptions = {}
): Promise<MeetingSearchResult> {
  const daysBack = opts.days_back || 30
  const maxResults = Math.min(opts.limit || 10, 20)
  const cutoff = new Date(Date.now() - daysBack * 86400000).toISOString()

  let query = supabase
    .from('project_knowledge')
    .select('id, title, recorded_at, project_code, project_name, participants, content, summary, ai_summary, ai_action_items, transcript, meeting_duration_minutes, transcription_status, topics, action_required, metadata, source_url')
    .eq('knowledge_type', 'meeting')
    .gte('recorded_at', cutoff)
    .order('recorded_at', { ascending: false })
    .limit(maxResults)

  if (opts.project_code) {
    query = query.eq('project_code', opts.project_code)
  }

  if (opts.participant) {
    query = query.contains('participants', [opts.participant])
  }

  if (opts.query) {
    query = query.or(`title.ilike.%${opts.query}%,content.ilike.%${opts.query}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to search meetings: ${error.message}`)
  if (!data?.length) {
    return { count: 0, meetings: [] }
  }

  const meetings: MeetingSearchEntry[] = (data as any[]).map((m) => {
    // Prefer AI summary, fall back to LLM-extracted summary
    const summary = m.ai_summary || m.summary || null

    return {
      id: m.id as string,
      title: m.title || null,
      date: m.recorded_at ? new Date(m.recorded_at).toISOString().split('T')[0] : 'unknown',
      duration: m.meeting_duration_minutes || null,
      project_code: m.project_code || null,
      participants: m.participants || [],
      summary: summary ? summary.slice(0, 500) : null,
      ai_action_items: Array.isArray(m.ai_action_items)
        ? m.ai_action_items.map((a: any) => ({
            action: a.action || '',
            completed: !!a.completed,
          }))
        : null,
      strategic_relevance: m.metadata?.strategic_relevance || null,
      transcript: opts.include_transcript && m.transcript
        ? (m.transcript.length > 4000 ? m.transcript.slice(0, 4000) : m.transcript)
        : null,
      source_url: m.source_url || null,
    }
  })

  return { count: meetings.length, meetings }
}
