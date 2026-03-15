/**
 * Agent Tools - Domain-organized index
 *
 * This module re-exports agent tools organized by domain.
 * The original agent-tools.ts remains the implementation file,
 * but tools are categorized here for better discoverability.
 *
 * Usage:
 *   import { AGENT_TOOLS, executeTool } from '@/lib/agent-tools'           // full set (unchanged)
 *   import { TOOL_CATEGORIES, getToolsByCategory } from '@/lib/agent-tools/index'  // organized
 */

import type Anthropic from '@anthropic-ai/sdk'

// Re-export everything from the main module
export { AGENT_TOOLS, executeTool, calculateCost, logAgentUsage, executeConfirmedAction } from '../agent-tools'

/**
 * Tool categories for organizing the 48 agent tools.
 * Each category maps to an array of tool names.
 */
export const TOOL_CATEGORIES = {
  /** Database & query tools */
  database: [
    'query_supabase',
  ],

  /** Briefing & dashboard tools */
  briefing: [
    'get_daily_briefing',
    'get_day_context',
    'get_ecosystem_pulse',
  ],

  /** Finance & accounting tools */
  finance: [
    'get_financial_summary',
    'get_xero_transactions',
    'get_pending_receipts',
    'get_quarterly_review',
    'add_receipt',
    'get_cashflow_forecast',
    'get_project_financials',
    'get_untagged_summary',
    'trigger_auto_tag',
    'get_receipt_pipeline_status',
    'get_weekly_finance_summary',
    'get_revenue_scoreboard',
  ],

  /** Contact & relationship tools */
  contacts: [
    'search_contacts',
    'get_contact_details',
    'get_contacts_needing_attention',
    'get_deal_risks',
  ],

  /** Calendar & scheduling tools */
  calendar: [
    'get_calendar_events',
    'create_calendar_event',
    'set_reminder',
    'get_upcoming_deadlines',
  ],

  /** Knowledge & search tools */
  knowledge: [
    'search_knowledge',
    'search_emails',
  ],

  /** Project management tools */
  projects: [
    'get_project_summary',
    'get_project_health',
    'get_project_360',
    'get_goods_intelligence',
  ],

  /** Communication tools */
  communications: [
    'draft_email',
  ],

  /** Meeting tools */
  meetings: [
    'create_meeting_notes',
    'add_meeting_to_notion',
    'get_meeting_prep',
    'capture_meeting_notes',
    'add_action_item',
    'add_decision',
  ],

  /** Grant management tools */
  grants: [
    'get_grant_opportunities',
    'get_grant_pipeline',
    'get_grant_readiness',
    'draft_grant_response',
  ],

  /** Reflection & writing tools */
  reflection: [
    'save_daily_reflection',
    'search_past_reflections',
    'save_writing_draft',
    'save_planning_doc',
    'move_writing',
    'review_planning_period',
    'moon_cycle_review',
  ],
} as const

export type ToolCategory = keyof typeof TOOL_CATEGORIES

/**
 * Get tool names for a specific category.
 */
export function getToolsByCategory(category: ToolCategory): readonly string[] {
  return TOOL_CATEGORIES[category]
}

/**
 * Get the category for a given tool name.
 */
export function getToolCategory(toolName: string): ToolCategory | null {
  for (const [category, tools] of Object.entries(TOOL_CATEGORIES)) {
    if ((tools as readonly string[]).includes(toolName)) {
      return category as ToolCategory
    }
  }
  return null
}

/**
 * Get tool definitions filtered by category.
 */
export function getToolDefinitions(
  allTools: Anthropic.Tool[],
  category: ToolCategory
): Anthropic.Tool[] {
  const names = TOOL_CATEGORIES[category]
  return allTools.filter(t => (names as readonly string[]).includes(t.name))
}

/**
 * Get all categories with their tool counts.
 */
export function getToolCategorySummary(): Array<{ category: string; count: number; tools: readonly string[] }> {
  return Object.entries(TOOL_CATEGORIES).map(([category, tools]) => ({
    category,
    count: tools.length,
    tools,
  }))
}
