// Re-export from extracted modules for backward compatibility
export { AGENT_TOOLS } from './tool-definitions'
export { calculateCost, logAgentUsage } from './tool-helpers'

// Import type for executeConfirmedAction
import type { SerializablePendingAction } from './telegram/pending-action-state'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Domain handler imports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import {
  executeQuerySupabase,
  executeGetDailyBriefing,
  executeSearchContacts,
  executeGetContactDetails,
  executeGetCalendarEvents,
  executeSearchKnowledge,
  executeSearchEmails,
} from './tools/core'

import {
  executeGetXeroTransactions,
  executeFindReceipt,
  executeGetCashflowForecast,
  executeGetProjectFinancials,
  executeGetUntaggedSummary,
  executeTriggerAutoTag,
  executeGetReceiptPipelineStatus,
  executeGetRevenueScoreboard,
  executeAddReceipt,
} from './tools/finance'

import {
  executeGetContactsNeedingAttention,
  executeGetDealRisks,
  executeGetUpcomingDeadlines,
  executeGetProject360,
  executeGetGoodsIntelligence,
} from './tools/projects'

import {
  executeSaveDailyReflection,
  executeSearchPastReflections,
  executeSaveWritingDraft,
  executeSavePlanningDoc,
  executeMoveWriting,
  executeReviewPlanningPeriod,
  executeMoonCycleReview,
  executeSaveDream,
  executeSearchDreams,
} from './tools/writing'

import {
  executeDraftEmail,
  sendEmailViaGmail,
  executeCreateCalendarEvent,
  createGoogleCalendarEvent,
  executeSetReminder,
  executeGetMeetingPrep,
  executeAddMeetingToNotion,
  executeAddActionItem,
  executeAddDecision,
  executeDraftGrantResponse,
  executeGetGrantReadiness,
  executeGetGrantOpportunities,
  executeGetGrantPipeline,
  executeSearchGrantsForProject,
} from './tools/actions'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL EXECUTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  chatId?: number
): Promise<string> {
  switch (name) {
    case 'query_supabase':
      return await executeQuerySupabase(input as { sql: string; description: string })
    case 'get_daily_briefing':
      return await executeGetDailyBriefing(input as { lookback_days?: number; detail_level?: string; format?: string })
    case 'search_contacts':
      return await executeSearchContacts(input as { query: string; limit?: number })
    case 'get_contact_details':
      return await executeGetContactDetails(input as { contact_id: string })
    case 'get_calendar_events':
      return await executeGetCalendarEvents(input as { start_date?: string; end_date?: string })
    case 'search_knowledge':
      return await executeSearchKnowledge(input as { query: string; project_code?: string; limit?: number })
    case 'get_contacts_needing_attention':
      return await executeGetContactsNeedingAttention(input as { limit?: number; project?: string })
    case 'get_deal_risks':
      return await executeGetDealRisks(input as { limit?: number })
    // Write actions
    case 'draft_email':
      return await executeDraftEmail(input as { to: string; subject: string; body: string }, chatId)
    case 'create_calendar_event':
      return await executeCreateCalendarEvent(
        input as { title: string; date: string; time: string; duration_minutes?: number; attendees?: string[]; location?: string },
        chatId
      )
    case 'set_reminder':
      return await executeSetReminder(input as { message: string; time: string; recurring?: string }, chatId)
    case 'add_receipt':
      return await executeAddReceipt(input as { vendor: string; amount: number; date: string; category?: string; notes?: string })
    // Grant & pipeline
    case 'get_grant_opportunities':
      return await executeGetGrantOpportunities(input as { status?: string; limit?: number })
    case 'get_grant_pipeline':
      return await executeGetGrantPipeline(input as { status?: string })
    case 'search_grants_for_project':
      return await executeSearchGrantsForProject(input as { project_code: string; min_score?: number; limit?: number })
    case 'get_xero_transactions':
      return await executeGetXeroTransactions(
        input as { type?: string; vendor?: string; project_code?: string; start_date?: string; end_date?: string; min_amount?: number; limit?: number }
      )
    // Reflection tools
    case 'save_daily_reflection':
      return await executeSaveDailyReflection(
        input as {
          voice_transcript: string
          lcaa_listen: string
          lcaa_curiosity: string
          lcaa_action: string
          lcaa_art: string
          loop_to_tomorrow?: string
          gratitude?: string[]
          challenges?: string[]
          learnings?: string[]
          intentions?: string[]
        },
        chatId
      )
    case 'search_past_reflections':
      return await executeSearchPastReflections(input as { query?: string; days?: number; limit?: number })
    // Writing tools
    case 'save_writing_draft':
      return await executeSaveWritingDraft(
        input as { title: string; content: string; append?: boolean; project?: string; tags?: string[] }
      )
    // Planning tools
    case 'save_planning_doc':
      return await executeSavePlanningDoc(
        input as { horizon: string; title: string; content: string; append?: boolean; project?: string }
      )
    // Writing stage management
    case 'move_writing':
      return await executeMoveWriting(
        input as { title_search?: string; from_stage?: string; to_stage: string }
      )
    // Planning rollup
    case 'review_planning_period':
      return await executeReviewPlanningPeriod(
        input as { period: string; date?: string }
      )
    // Moon cycle review
    case 'moon_cycle_review':
      return await executeMoonCycleReview(
        input as { month?: string; focus?: string }
      )
    // Dream journal
    case 'save_dream':
      return await executeSaveDream(
        input as { content: string; title?: string; category?: string; tags?: string[]; media_url?: string; media_type?: string },
        chatId
      )
    case 'search_dreams':
      return await executeSearchDreams(input as { query?: string; category?: string; limit?: number })
    // Goods intelligence
    case 'get_goods_intelligence':
      return await executeGetGoodsIntelligence(input as { focus: string })
    // Email search
    case 'search_emails':
      return await executeSearchEmails(input as { query: string; mailbox?: string; limit?: number })
    // Receipt finder
    case 'find_receipt':
      return await executeFindReceipt(input as { vendor?: string; amount?: number; date?: string; project_code?: string })
    // Cashflow forecast
    case 'get_cashflow_forecast':
      return await executeGetCashflowForecast(input as { months_ahead?: number })
    // Project health
    // Upcoming deadlines
    case 'get_upcoming_deadlines':
      return await executeGetUpcomingDeadlines(input as { days_ahead?: number; category?: string })
    // Meeting notes
    case 'get_project_360':
      return await executeGetProject360(input as { project_code: string })
    // Notion write tools
    case 'add_meeting_to_notion':
      return await executeAddMeetingToNotion(input as {
        title: string; date?: string; project_code?: string; attendees?: string[];
        notes: string; decisions?: string[]; action_items?: string[]; meeting_type?: string
      })
    case 'add_action_item':
      return await executeAddActionItem(input as {
        title: string; project_code?: string; due_date?: string;
        priority?: string; details?: string; assignee?: string
      })
    case 'add_decision':
      return await executeAddDecision(input as {
        title: string; project_code?: string; rationale?: string;
        alternatives_considered?: string[]; status?: string
      })
    case 'get_project_financials':
      return await executeGetProjectFinancials(input as { project_code?: string })
    case 'get_untagged_summary':
      return await executeGetUntaggedSummary()
    case 'trigger_auto_tag':
      return await executeTriggerAutoTag(input as { dry_run?: boolean })
    // Bot intelligence tools
    case 'get_receipt_pipeline_status':
      return await executeGetReceiptPipelineStatus(input as { include_stuck?: boolean })
    case 'get_meeting_prep':
      return await executeGetMeetingPrep(input as { event_title?: string; date?: string })
    case 'get_grant_readiness':
      return await executeGetGrantReadiness(input as { application_id?: string; grant_name?: string })
    case 'draft_grant_response':
      return await executeDraftGrantResponse(
        input as { opportunity_id: string; project_code?: string; sections?: string[]; tone?: string },
        chatId
      )
    case 'get_revenue_scoreboard':
      return await executeGetRevenueScoreboard()
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIRMED ACTION EXECUTOR (for pending actions from Supabase)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function executeConfirmedAction(action: SerializablePendingAction): Promise<string> {
  switch (action.type) {
    case 'draft_email': {
      const { to, subject, body } = action.params as { to: string; subject: string; body: string }
      return await sendEmailViaGmail(to, subject, body)
    }
    case 'create_calendar_event': {
      const event = action.params as { title: string; start: string; end: string; attendees?: string[]; location?: string }
      return await createGoogleCalendarEvent(event)
    }
    default:
      return `Unknown action type: ${action.type}`
  }
}
