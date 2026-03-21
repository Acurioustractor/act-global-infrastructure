/**
 * Meeting actions — open action items from AI transcription and LLM extraction.
 *
 * Extracted from Notion Workers Tool 24 (get_meeting_actions).
 */

import type { SupabaseQueryClient } from '../types.js'

export interface MeetingActionsOptions {
  project_code?: string
  days_back?: number
  include_completed?: boolean
}

export interface AiActionGroup {
  meeting_title: string
  date: string
  project_code: string | null
  source_url: string | null
  items: Array<{ action: string; completed: boolean }>
}

export interface ExtractedAction {
  title: string
  date: string
  project_code: string | null
  assignee: string | null
  importance: string | null
}

export interface MeetingActionsResult {
  aiActions: AiActionGroup[]
  extractedActions: ExtractedAction[]
  totalCount: number
}

export async function fetchMeetingActions(
  supabase: SupabaseQueryClient,
  opts: MeetingActionsOptions = {}
): Promise<MeetingActionsResult> {
  const daysBack = opts.days_back || 30
  const cutoff = new Date(Date.now() - daysBack * 86400000).toISOString()
  const includeCompleted = opts.include_completed ?? false

  // 1. Get meetings with AI action items
  let meetingQuery = supabase
    .from('project_knowledge')
    .select('id, title, recorded_at, project_code, ai_action_items, participants, source_url')
    .eq('knowledge_type', 'meeting')
    .not('ai_action_items', 'is', null)
    .gte('recorded_at', cutoff)
    .order('recorded_at', { ascending: false })
    .limit(50)

  if (opts.project_code) {
    meetingQuery = meetingQuery.eq('project_code', opts.project_code)
  }

  const { data: meetings } = await meetingQuery

  // 2. Get LLM-extracted action items linked to meetings
  let actionQuery = supabase
    .from('project_knowledge')
    .select('id, title, content, project_code, recorded_at, participants, action_items, importance')
    .eq('knowledge_type', 'action')
    .eq('source_type', 'meeting_extraction')
    .gte('recorded_at', cutoff)
    .order('recorded_at', { ascending: false })
    .limit(50)

  if (opts.project_code) {
    actionQuery = actionQuery.eq('project_code', opts.project_code)
  }

  const { data: extractedActionsData } = await actionQuery

  // Build AI action groups
  const aiActions: AiActionGroup[] = []
  let aiActionCount = 0

  if (meetings?.length) {
    for (const m of (meetings as any[])) {
      if (!m.ai_action_items?.length) continue
      const items = includeCompleted
        ? m.ai_action_items
        : m.ai_action_items.filter((a: any) => !a.completed)
      if (!items.length) continue

      const date = new Date(m.recorded_at).toISOString().split('T')[0]
      aiActions.push({
        meeting_title: m.title || 'Untitled',
        date,
        project_code: m.project_code || null,
        source_url: m.source_url || null,
        items: items.map((item: any) => ({
          action: item.action || '',
          completed: !!item.completed,
        })),
      })
      aiActionCount += items.length
    }
  }

  // Build extracted actions
  const extractedActions: ExtractedAction[] = ((extractedActionsData || []) as any[]).map((a) => ({
    title: a.title as string,
    date: new Date(a.recorded_at).toISOString().split('T')[0],
    project_code: a.project_code || null,
    assignee: a.action_items?.[0]?.assignee || null,
    importance: a.importance || null,
  }))

  const totalCount = aiActionCount + extractedActions.length

  return { aiActions, extractedActions, totalCount }
}
