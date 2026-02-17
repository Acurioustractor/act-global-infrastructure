import Anthropic from '@anthropic-ai/sdk'
import { google } from 'googleapis'
import { Client as NotionClient } from '@notionhq/client'
import { supabase } from './supabase'
import { readFileSync } from 'fs'
import { join } from 'path'
import { savePendingAction, type SerializablePendingAction } from './telegram/pending-action-state'
import { getBrisbaneDate, getBrisbaneNow, getBrisbaneDateOffset } from './timezone'

// Helper: load project codes from the projects table
let _projectCodesCache: Record<string, any> | null = null
async function loadProjectCodes(): Promise<Record<string, any>> {
  if (_projectCodesCache) return _projectCodesCache

  try {
    const { data } = await supabase
      .from('projects')
      .select('*')

    const projects: Record<string, any> = {}
    for (const row of data || []) {
      projects[row.code] = row
    }
    _projectCodesCache = projects
    return projects
  } catch {
    _projectCodesCache = {}
    return {}
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL DEFINITIONS (Anthropic tool_use format)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'query_supabase',
    description:
      'Run a read-only SQL query against the ACT database. Use this to answer questions about contacts, projects, communications, knowledge, subscriptions, and other data. Only SELECT queries are allowed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sql: {
          type: 'string',
          description: 'A SELECT SQL query to run against the database.',
        },
        description: {
          type: 'string',
          description: 'Brief description of what this query is looking for.',
        },
      },
      required: ['sql', 'description'],
    },
  },
  {
    name: 'get_daily_briefing',
    description:
      'Get the daily briefing summary including overdue actions, upcoming follow-ups, relationship alerts, financial pipeline, and active project summaries. Use this when the user asks about what needs attention, priorities, or a general status update.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lookback_days: {
          type: 'number',
          description: 'Number of days to look back for recent activity. Default 7.',
        },
        detail_level: {
          type: 'string',
          enum: ['summary', 'full'],
          description: 'Level of detail: "summary" returns counts and headlines only (fewer tokens), "full" returns all items. Default "full".',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_financial_summary',
    description:
      'Get financial summary including pipeline totals, recent transactions, pending receipts, and subscription costs. Use this when the user asks about money, spending, cash flow, receipts, or subscriptions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: {
          type: 'number',
          description: 'Number of days to look back for transactions. Default 30.',
        },
      },
      required: [],
    },
  },
  {
    name: 'search_contacts',
    description:
      'Search for contacts by name, organisation, tag, or project. Use this when the user asks about a person, who works at a company, or contacts related to a project.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Name, company, tag, or keyword to search for.',
        },
        limit: {
          type: 'number',
          description: 'Max results to return. Default 10.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_contact_details',
    description:
      'Get full contact card including relationship health (temperature 0-100, trend, risk flags, signal scores), open pipeline value, next meeting, and recent communications. Use this after finding a contact via search, or when the user asks for details about a known person.',
    input_schema: {
      type: 'object' as const,
      properties: {
        contact_id: {
          type: 'string',
          description: 'The contact ID (UUID or GHL ID).',
        },
      },
      required: ['contact_id'],
    },
  },
  {
    name: 'get_calendar_events',
    description:
      "Get calendar events for today or a date range. Use this when the user asks about today's schedule, upcoming meetings, or what's on the calendar.",
    input_schema: {
      type: 'object' as const,
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format. Defaults to today.',
        },
        end_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format. Defaults to same as start_date.',
        },
      },
      required: [],
    },
  },
  {
    name: 'search_knowledge',
    description:
      'Search project knowledge including meetings, decisions, actions, and notes. Use this when the user asks about what was discussed, decided, or planned for a project.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search terms — topic, project name, person name, or keyword.',
        },
        project_code: {
          type: 'string',
          description: 'Optional project code to filter by (e.g. ACT-JH, ACT-GD).',
        },
        limit: {
          type: 'number',
          description: 'Max results. Default 10.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_project_summary',
    description:
      'Get the AI-generated narrative summary for a specific project. Use this when the user asks for a project update or "what\'s happening with X".',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_code: {
          type: 'string',
          description: 'The project code (e.g. ACT-JH, ACT-GD, ACT-HV, ACT-EL). Case-insensitive.',
        },
      },
      required: ['project_code'],
    },
  },
  {
    name: 'get_contacts_needing_attention',
    description:
      'Get contacts who need follow-up — prioritized by relationship signals (falling temperature, risk flags like going_cold, awaiting_response, high_value_inactive). Use this when the user asks "who should I reach out to", "who needs follow-up", or "who needs attention". Includes recommended actions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Max contacts to return. Default 10.',
        },
        project: {
          type: 'string',
          description: 'Optional project tag to filter by (e.g. "goods", "the-harvest"). Only returns contacts with this tag.',
        },
      },
      required: [],
    },
  },

  {
    name: 'get_deal_risks',
    description:
      'Get at-risk deals — open opportunities where the contact relationship is cooling, inactive, or awaiting response. Use this when the user asks "any deal risks?", "which deals are at risk?", or "pipeline health".',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Max deals to return. Default 10.',
        },
      },
      required: [],
    },
  },

  // ── WRITE ACTIONS (require confirmation via Telegram) ──────────────

  {
    name: 'draft_email',
    description:
      'Draft an email to a contact. The bot will show a preview and ask for confirmation before sending. Use this when the user says "email [name] about [topic]" or "draft an email to...".',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: {
          type: 'string',
          description: 'Recipient — contact name or email address. Will be resolved to email via contacts database.',
        },
        subject: {
          type: 'string',
          description: 'Email subject line.',
        },
        body: {
          type: 'string',
          description: 'Email body text.',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'create_calendar_event',
    description:
      'Create a calendar event. The bot will show a preview and ask for confirmation before creating. Use this when the user says "schedule a meeting" or "add an event".',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Event title.',
        },
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format.',
        },
        time: {
          type: 'string',
          description: 'Start time in HH:MM format (24h).',
        },
        duration_minutes: {
          type: 'number',
          description: 'Duration in minutes. Default 60.',
        },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Attendee names or emails.',
        },
        location: {
          type: 'string',
          description: 'Event location.',
        },
      },
      required: ['title', 'date', 'time'],
    },
  },
  {
    name: 'set_reminder',
    description:
      'Set a personal reminder. Use this when the user says "remind me to...", "set a reminder for...", or asks for recurring reminders like "remind me every day at 6am to exercise".',
    input_schema: {
      type: 'object' as const,
      properties: {
        message: {
          type: 'string',
          description: 'The reminder message.',
        },
        time: {
          type: 'string',
          description: 'When to trigger — ISO datetime (e.g. "2026-02-05T06:00:00+10:00") or relative (e.g. "tomorrow 6am"). Always include timezone offset for AEST (+10:00).',
        },
        recurring: {
          type: 'string',
          description: 'Recurrence: "daily", "weekday" (Mon-Fri), "weekly", or omit for one-off.',
        },
      },
      required: ['message', 'time'],
    },
  },
  {
    name: 'add_receipt',
    description:
      'Log a receipt/expense. Use this when the user describes a purchase (voice or text) like "I spent $45 at Bunnings today" or after a receipt photo is processed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        vendor: {
          type: 'string',
          description: 'Store or company name.',
        },
        amount: {
          type: 'number',
          description: 'Amount in AUD.',
        },
        date: {
          type: 'string',
          description: 'Transaction date in YYYY-MM-DD format.',
        },
        category: {
          type: 'string',
          description: 'Category: travel, supplies, food, subscription, utilities, other.',
        },
        notes: {
          type: 'string',
          description: 'Additional notes about the purchase.',
        },
      },
      required: ['vendor', 'amount', 'date'],
    },
  },

  // ── GRANT & PIPELINE TOOLS (read-only) ─────────────────────────────

  {
    name: 'get_grant_opportunities',
    description:
      'Get open/upcoming grant opportunities with closing dates and fit scores. Use when the user asks about available grants, funding opportunities, or "what grants can we apply for".',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status: open, upcoming, closed, applied. Default: open.',
        },
        limit: {
          type: 'number',
          description: 'Max results. Default 10.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_grant_pipeline',
    description:
      'Get active grant applications and their status. Use when the user asks about grant applications in progress, submitted grants, or "how are our grant applications going".',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status: draft, in_progress, submitted, under_review, successful, unsuccessful. Default: all active.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_pending_receipts',
    description:
      'Get receipts/expenses that need attention — pending matches, unresolved items. Use when the user asks about pending receipts, expenses needing action, or "what receipts are outstanding".',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Max results. Default 10.',
        },
      },
      required: [],
    },
  },

  // ── FINANCIAL REVIEW TOOLS ──────────────────────────────────────────

  {
    name: 'get_quarterly_review',
    description:
      'Get a comprehensive quarterly financial review including income/expenses, BAS summary (GST), outstanding invoices with aging, project spending, subscription costs, pending receipts, cashflow trends, and flagged issues. Use when the user wants to review finances, prepare for BAS, or do a quarterly check-in.',
    input_schema: {
      type: 'object' as const,
      properties: {
        quarter: {
          type: 'string',
          description:
            'Quarter in format "YYYY-Q1" through "YYYY-Q4". Q1=Jul-Sep (Australian FY), Q2=Oct-Dec, Q3=Jan-Mar, Q4=Apr-Jun. Default: current quarter.',
        },
        detail_level: {
          type: 'string',
          enum: ['summary', 'full'],
          description: 'Level of detail: "summary" returns headline numbers and issues only (fewer tokens), "full" returns all breakdowns. Default "full".',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_xero_transactions',
    description:
      'Browse Xero bank transactions with filters. Use to drill into specific spending, find transactions by vendor, review a date range, or investigate issues found in the quarterly review.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          description: 'Filter by type: RECEIVE, SPEND, TRANSFER. Default: all.',
        },
        vendor: {
          type: 'string',
          description: 'Filter by contact/vendor name (partial match).',
        },
        project_code: {
          type: 'string',
          description: 'Filter by project code (e.g. ACT-JH).',
        },
        start_date: {
          type: 'string',
          description: 'Start date YYYY-MM-DD. Default: 90 days ago.',
        },
        end_date: {
          type: 'string',
          description: 'End date YYYY-MM-DD. Default: today.',
        },
        min_amount: {
          type: 'number',
          description: 'Minimum transaction amount.',
        },
        limit: {
          type: 'number',
          description: 'Max results. Default 25.',
        },
      },
      required: [],
    },
  },

  // ── REFLECTION TOOLS ──────────────────────────────────────────────────

  {
    name: 'get_day_context',
    description:
      "Get a summary of today's activity for reflection — calendar events, communications, project activity, decisions, and contacts engaged with. Use this before generating a daily reflection to enrich the user's voice input with data.",
    input_schema: {
      type: 'object' as const,
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD. Default: today.',
        },
      },
      required: [],
    },
  },
  {
    name: 'save_daily_reflection',
    description:
      "Save a daily LCAA reflection. Use when the user has shared their thoughts about the day and you've synthesized it through the LCAA framework. Pass the complete reflection with all sections.",
    input_schema: {
      type: 'object' as const,
      properties: {
        voice_transcript: {
          type: 'string',
          description: 'Raw user voice/text input.',
        },
        lcaa_listen: {
          type: 'string',
          description: 'Listen section — who/what was listened to.',
        },
        lcaa_curiosity: {
          type: 'string',
          description: 'Curiosity section — questions explored, surprises.',
        },
        lcaa_action: {
          type: 'string',
          description: 'Action section — what was built, delivered, moved.',
        },
        lcaa_art: {
          type: 'string',
          description: 'Art section — stories told, meaning made.',
        },
        loop_to_tomorrow: {
          type: 'string',
          description: 'How today returns to Listen tomorrow.',
        },
        gratitude: {
          type: 'array',
          items: { type: 'string' },
          description: 'Things grateful for.',
        },
        challenges: {
          type: 'array',
          items: { type: 'string' },
          description: 'What was hard.',
        },
        learnings: {
          type: 'array',
          items: { type: 'string' },
          description: 'What was learned.',
        },
        intentions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Intentions for tomorrow.',
        },
      },
      required: ['voice_transcript', 'lcaa_listen', 'lcaa_curiosity', 'lcaa_action', 'lcaa_art'],
    },
  },
  {
    name: 'search_past_reflections',
    description:
      'Search past daily reflections by keyword or date range. Use when the user asks "what did I reflect on last week" or "when did I last think about X".',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description:
            'Search text (searches across all LCAA sections, gratitude, challenges, learnings).',
        },
        days: {
          type: 'number',
          description: 'Look back N days. Default 30.',
        },
        limit: {
          type: 'number',
          description: 'Max results. Default 7.',
        },
      },
      required: [],
    },
  },

  // ── WRITING TOOLS ───────────────────────────────────────────────────

  {
    name: 'save_writing_draft',
    description:
      'Save a writing draft to the Obsidian vault (thoughts/writing/drafts/). Use when the user is writing, brainstorming, or composing text they want to continue editing on their laptop. The draft is committed to git and pushed so it syncs immediately. Supports creating new drafts or appending to existing ones.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Title for the draft. Used as filename (kebab-cased) and markdown heading.',
        },
        content: {
          type: 'string',
          description: 'The draft content in markdown format.',
        },
        append: {
          type: 'boolean',
          description: 'If true, append to existing draft with this title instead of creating new. Default false.',
        },
        project: {
          type: 'string',
          description: 'ACT ecosystem project this writing relates to (e.g. "JusticeHub", "Empathy Ledger", "The Harvest", "Goods on Country", "PICC", "Diagrama", "Double Disadvantage"). Ask the user which project if the writing is clearly project-related.',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags for the draft (e.g. ["essay", "act-philosophy", "lcaa"]).',
        },
      },
      required: ['title', 'content'],
    },
  },

  // ── PLANNING TOOLS ─────────────────────────────────────────────────

  {
    name: 'save_planning_doc',
    description:
      'Save a planning document at the right time horizon — daily tasks, weekly plans, yearly goals, or decade visions. Use when the user talks about plans, goals, intentions, priorities, reviews, or retrospectives at any time scale. The document is committed to git and syncs to Obsidian.',
    input_schema: {
      type: 'object' as const,
      properties: {
        horizon: {
          type: 'string',
          enum: ['daily', 'weekly', 'yearly', 'decade'],
          description: 'Planning horizon: "daily" for today\'s tasks/focus, "weekly" for this week\'s plan/retro, "yearly" for annual goals/themes, "decade" for 10-year vision.',
        },
        title: {
          type: 'string',
          description: 'Title for the document. For daily: include the date. For weekly: include week number or date range. For yearly: include the year. For decade: a vision theme.',
        },
        content: {
          type: 'string',
          description: 'The planning content in markdown format.',
        },
        append: {
          type: 'boolean',
          description: 'If true, append to existing document with this title slug instead of creating new. Useful for updating daily plans throughout the day. Default false.',
        },
        project: {
          type: 'string',
          description: 'ACT ecosystem project this planning relates to, if specific to one project.',
        },
      },
      required: ['horizon', 'title', 'content'],
    },
  },

  // ── WRITING STAGE MANAGEMENT ────────────────────────────────────────

  {
    name: 'move_writing',
    description:
      'Move a writing piece between stages: drafts → in-progress → published. Use when the user says "I\'m working on this now", "this is done", "publish this", "move to in-progress", or when promoting a draft. Lists available pieces if no title given.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title_search: {
          type: 'string',
          description: 'Partial title to match (case-insensitive). If omitted, lists all pieces in the source stage.',
        },
        from_stage: {
          type: 'string',
          enum: ['drafts', 'in-progress', 'published'],
          description: 'Current stage of the piece. Default "drafts".',
        },
        to_stage: {
          type: 'string',
          enum: ['drafts', 'in-progress', 'published'],
          description: 'Target stage to move to.',
        },
      },
      required: ['to_stage'],
    },
  },

  // ── PLANNING ROLLUP ───────────────────────────────────────────────

  {
    name: 'review_planning_period',
    description:
      'Review and synthesize planning documents for a time period. Reads all plans from a horizon and produces a rollup summary. Use for: weekly review (reads dailies), monthly review (reads weeklies), yearly review (reads monthlies/weeklies). Also use when the user says "review the week", "how did the week go", "monthly check-in".',
    input_schema: {
      type: 'object' as const,
      properties: {
        period: {
          type: 'string',
          enum: ['week', 'month', 'year'],
          description: 'Period to review: "week" reads daily plans, "month" reads weekly plans, "year" reads monthly reviews.',
        },
        date: {
          type: 'string',
          description: 'Reference date in YYYY-MM-DD. Reviews the period containing this date. Default: today.',
        },
      },
      required: ['period'],
    },
  },

  // ── MOON CYCLE REVIEW ─────────────────────────────────────────────

  {
    name: 'moon_cycle_review',
    description:
      'Generate a monthly organisational health review aligned to the moon cycle. Pulls financial data, project status, relationship health, planning docs, and reflections to produce a comprehensive written review piece. Use when the user says "moon review", "monthly review", "how is the organisation going", "write the monthly piece".',
    input_schema: {
      type: 'object' as const,
      properties: {
        month: {
          type: 'string',
          description: 'Month to review in YYYY-MM format. Default: current month.',
        },
        focus: {
          type: 'string',
          enum: ['full', 'financial', 'relationships', 'projects', 'wellbeing'],
          description: 'Focus area for the review. "full" covers everything. Default "full".',
        },
      },
      required: [],
    },
  },

  // ── GOODS INTELLIGENCE ──────────────────────────────────────────────

  {
    name: 'get_goods_intelligence',
    description:
      'Get Goods on Country intelligence — newsletter planning, outreach recommendations, content strategy, or an overview. Use when the user asks about Goods newsletter, who to reach out to for Goods, content ideas, or a Goods overview.',
    input_schema: {
      type: 'object' as const,
      properties: {
        focus: {
          type: 'string',
          enum: ['newsletter_plan', 'outreach', 'content_ideas', 'overview'],
          description: 'What intelligence to focus on. newsletter_plan = content picks + audience breakdown. outreach = who to contact + suggested content. content_ideas = gaps and angles. overview = full summary.',
        },
      },
      required: ['focus'],
    },
  },

  // ── EMAIL SEARCH ──────────────────────────────────────────────────

  {
    name: 'search_emails',
    description:
      'Search emails across ACT mailboxes using Gmail API. Use when the user asks to find an email, check what someone sent, or look up a conversation. Searches benjamin@act.place by default.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Gmail search query — supports from:, to:, subject:, has:attachment, after:, before:, and free text. Examples: "from:jane subject:invoice", "to:hi@act.place grant".',
        },
        mailbox: {
          type: 'string',
          description: 'Which mailbox to search: benjamin@act.place, nicholas@act.place, hi@act.place, accounts@act.place. Default: benjamin@act.place.',
        },
        limit: {
          type: 'number',
          description: 'Max results. Default 10.',
        },
      },
      required: ['query'],
    },
  },

  // ── CASHFLOW FORECAST ─────────────────────────────────────────────

  {
    name: 'get_cashflow_forecast',
    description:
      'Get a cash flow forecast including historical snapshots, current month actuals, projections, and key metrics (burn rate, runway). Use when the user asks about cash flow, financial outlook, burn rate, or "how long will our money last".',
    input_schema: {
      type: 'object' as const,
      properties: {
        months_ahead: {
          type: 'number',
          description: 'How many months to project forward. Default 6.',
        },
      },
      required: [],
    },
  },

  // ── PROJECT HEALTH ────────────────────────────────────────────────

  {
    name: 'get_project_health',
    description:
      'Get health overview for one or all ACT projects — last activity, open actions, financial position, team engagement. Use when the user asks "how is project X going", "which projects need attention", or "project health check".',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_code: {
          type: 'string',
          description: 'Specific project code (e.g. ACT-JH). Omit for all projects overview.',
        },
      },
      required: [],
    },
  },

  // ── UPCOMING DEADLINES ────────────────────────────────────────────

  {
    name: 'get_upcoming_deadlines',
    description:
      'Get upcoming deadlines across grants, compliance, projects, and calendar. Use when the user asks "what deadlines are coming up", "what\'s due soon", or "upcoming compliance dates".',
    input_schema: {
      type: 'object' as const,
      properties: {
        days_ahead: {
          type: 'number',
          description: 'How many days ahead to look. Default 30.',
        },
        category: {
          type: 'string',
          description: 'Filter by category: grants, compliance, calendar, all. Default: all.',
        },
      },
      required: [],
    },
  },

  // ── MEETING NOTES ─────────────────────────────────────────────────

  {
    name: 'create_meeting_notes',
    description:
      'Save meeting notes to the knowledge base. Use when the user describes a meeting they had, or dictates meeting notes via voice. Links to project codes and participants automatically.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Meeting title.',
        },
        summary: {
          type: 'string',
          description: 'Brief summary of the meeting.',
        },
        content: {
          type: 'string',
          description: 'Full meeting notes in markdown.',
        },
        project_code: {
          type: 'string',
          description: 'Project code this meeting relates to (e.g. ACT-JH).',
        },
        participants: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names of people in the meeting.',
        },
        action_items: {
          type: 'array',
          items: { type: 'string' },
          description: 'Action items from the meeting.',
        },
        date: {
          type: 'string',
          description: 'Meeting date in YYYY-MM-DD. Default: today.',
        },
      },
      required: ['title', 'summary', 'content'],
    },
  },
  {
    name: 'get_project_360',
    description:
      'Get a comprehensive 360-degree view of a project: financial summary, key contacts, recent activity, health score, and pipeline. Use when the user asks "what\'s happening with X?" or wants a full project overview.',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_code: {
          type: 'string',
          description: 'The project code (e.g. ACT-JH, ACT-HV, ACT-EL).',
        },
      },
      required: ['project_code'],
    },
  },
  {
    name: 'get_ecosystem_pulse',
    description:
      'Get a pulse check on the entire ACT ecosystem: projects by health status, total pipeline value, cash position, contacts needing attention, and recent highlights. Use when the user asks "how\'s the ecosystem?" or wants an overall status.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  // ── NOTION WRITE TOOLS ────────────────────────────────────────────

  {
    name: 'add_meeting_to_notion',
    description:
      'Add a meeting record to the unified Notion Meetings database. Use when the user says "record meeting with..." or "log meeting about...". Also saves to Supabase project_knowledge. Requires confirmation before writing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Meeting title.',
        },
        date: {
          type: 'string',
          description: 'Meeting date in YYYY-MM-DD format. Default: today.',
        },
        project_code: {
          type: 'string',
          description: 'Project code (e.g. ACT-JH). Auto-detected from title if not provided.',
        },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names of attendees.',
        },
        notes: {
          type: 'string',
          description: 'Meeting notes in markdown.',
        },
        decisions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key decisions made during the meeting.',
        },
        action_items: {
          type: 'array',
          items: { type: 'string' },
          description: 'Action items from the meeting.',
        },
        meeting_type: {
          type: 'string',
          enum: ['internal', 'external', 'workshop', 'standup', 'review', 'other'],
          description: 'Type of meeting. Default: "external".',
        },
      },
      required: ['title', 'notes'],
    },
  },
  {
    name: 'add_action_item',
    description:
      'Add an action item to the Notion Actions database and Supabase project_knowledge. Use when the user says "add action..." or "I need to..." or dictates a task. Requires confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Action item title.',
        },
        project_code: {
          type: 'string',
          description: 'Project code (e.g. ACT-JH).',
        },
        due_date: {
          type: 'string',
          description: 'Due date in YYYY-MM-DD format.',
        },
        priority: {
          type: 'string',
          enum: ['high', 'normal', 'low'],
          description: 'Priority level. Default: "normal".',
        },
        details: {
          type: 'string',
          description: 'Additional context or details.',
        },
        assignee: {
          type: 'string',
          description: 'Who is responsible (e.g. "Ben", "Nic").',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'add_decision',
    description:
      'Record a decision in the Notion Decisions database and Supabase project_knowledge. Use when the user says "we decided..." or "decision: ..." or describes a choice that was made. Requires confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Decision title — what was decided.',
        },
        project_code: {
          type: 'string',
          description: 'Project code (e.g. ACT-JH).',
        },
        rationale: {
          type: 'string',
          description: 'Why this decision was made.',
        },
        alternatives_considered: {
          type: 'array',
          items: { type: 'string' },
          description: 'Other options that were considered.',
        },
        status: {
          type: 'string',
          enum: ['active', 'superseded', 'revisit'],
          description: 'Decision status. Default: "active".',
        },
      },
      required: ['title'],
    },
  },

  // ── PROJECT FINANCIALS ─────────────────────────────────────────────

  {
    name: 'get_project_financials',
    description:
      'Get per-project financial summary — FY income, expenses, net position, pipeline, grants, subscriptions. Use when the user asks "how is X doing financially", "project finances", or "financial overview".',
    input_schema: {
      type: 'object' as const,
      properties: {
        project_code: {
          type: 'string',
          description: 'Specific project code (e.g. ACT-JH). Omit for all projects.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_untagged_summary',
    description:
      'Get count of untagged transactions and top vendors needing project tags. Use when the user asks about transaction tagging coverage or "how many transactions need tagging".',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'trigger_auto_tag',
    description:
      'Trigger auto-tagging of untagged transactions using vendor rules and keyword matching. Use when the user says "tag transactions", "run auto-tagger", or "fix untagged transactions". Requires confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dry_run: {
          type: 'boolean',
          description: 'If true, preview matches without applying. Default false.',
        },
      },
      required: [],
    },
  },
]

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
      return await executeGetDailyBriefing(input as { lookback_days?: number; detail_level?: string })
    case 'get_financial_summary':
      return await executeGetFinancialSummary(input as { days?: number })
    case 'search_contacts':
      return await executeSearchContacts(input as { query: string; limit?: number })
    case 'get_contact_details':
      return await executeGetContactDetails(input as { contact_id: string })
    case 'get_calendar_events':
      return await executeGetCalendarEvents(input as { start_date?: string; end_date?: string })
    case 'search_knowledge':
      return await executeSearchKnowledge(input as { query: string; project_code?: string; limit?: number })
    case 'get_project_summary':
      return await executeGetProjectSummary(input as { project_code: string })
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
    case 'get_pending_receipts':
      return await executeGetPendingReceipts(input as { limit?: number })
    // Financial review tools
    case 'get_quarterly_review':
      return await executeGetQuarterlyReview(input as { quarter?: string; detail_level?: string })
    case 'get_xero_transactions':
      return await executeGetXeroTransactions(
        input as { type?: string; vendor?: string; project_code?: string; start_date?: string; end_date?: string; min_amount?: number; limit?: number }
      )
    // Reflection tools
    case 'get_day_context':
      return await executeGetDayContext(input as { date?: string })
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
    // Goods intelligence
    case 'get_goods_intelligence':
      return await executeGetGoodsIntelligence(input as { focus: string })
    // Email search
    case 'search_emails':
      return await executeSearchEmails(input as { query: string; mailbox?: string; limit?: number })
    // Cashflow forecast
    case 'get_cashflow_forecast':
      return await executeGetCashflowForecast(input as { months_ahead?: number })
    // Project health
    case 'get_project_health':
      return await executeGetProjectHealth(input as { project_code?: string })
    // Upcoming deadlines
    case 'get_upcoming_deadlines':
      return await executeGetUpcomingDeadlines(input as { days_ahead?: number; category?: string })
    // Meeting notes
    case 'create_meeting_notes':
      return await executeCreateMeetingNotes(input as {
        title: string; summary: string; content: string;
        project_code?: string; participants?: string[]; action_items?: string[]; date?: string
      })
    case 'get_project_360':
      return await executeGetProject360(input as { project_code: string })
    case 'get_ecosystem_pulse':
      return await executeGetEcosystemPulse()
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
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: query_supabase
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeQuerySupabase(input: {
  sql: string
  description: string
}): Promise<string> {
  const { sql, description } = input

  // Read-only guard
  const normalised = sql.trim().toUpperCase()
  if (!normalised.startsWith('SELECT') && !normalised.startsWith('WITH')) {
    return JSON.stringify({
      error: 'Only SELECT queries are allowed. Cannot run INSERT, UPDATE, DELETE, or DDL.',
    })
  }

  // Block dangerous patterns
  const blocked = ['DROP', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE', 'DELETE', 'GRANT', 'REVOKE']
  for (const keyword of blocked) {
    // Check for keyword as a standalone word (not part of column names)
    const regex = new RegExp(`\\b${keyword}\\b`, 'i')
    if (regex.test(sql) && !normalised.startsWith('SELECT') && !normalised.startsWith('WITH')) {
      return JSON.stringify({ error: `Blocked keyword detected: ${keyword}` })
    }
  }

  try {
    // Use Supabase's rpc to execute raw SQL via a database function
    // If the function doesn't exist, fall back to a simpler approach
    const { data, error } = await supabase.rpc('exec_read_only_sql', {
      query_text: sql,
    })

    if (error) {
      // If the RPC function doesn't exist, try common table queries
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        return await fallbackQuery(sql, description)
      }
      return JSON.stringify({ error: error.message, hint: 'Check table/column names.' })
    }

    const rows = Array.isArray(data) ? data : [data]
    return JSON.stringify({
      description,
      row_count: rows.length,
      data: rows.slice(0, 50), // Limit to 50 rows
      truncated: rows.length > 50,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

async function fallbackQuery(sql: string, description: string): Promise<string> {
  // Parse simple queries and use Supabase client methods
  const tableMatch = sql.match(/FROM\s+["']?(\w+)["']?/i)
  if (!tableMatch) {
    return JSON.stringify({
      error: 'Could not parse table name. The exec_read_only_sql database function is not available. Try asking about specific tables like contacts, projects, communications.',
    })
  }

  const table = tableMatch[1]
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i)
  const limit = limitMatch ? parseInt(limitMatch[1]) : 20

  try {
    const { data, error } = await supabase.from(table).select('*').limit(limit)
    if (error) {
      return JSON.stringify({ error: error.message })
    }
    return JSON.stringify({
      description,
      table,
      row_count: (data || []).length,
      data: (data || []).slice(0, 50),
      note: 'Fallback query - returned all columns with limit. For complex queries, the exec_read_only_sql function needs to be created.',
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_daily_briefing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetDailyBriefing(input: {
  lookback_days?: number
  detail_level?: string
}): Promise<string> {
  const days = input.lookback_days || 7
  const now = getBrisbaneNow()
  const lookback = new Date(now.getTime() - days * 86400000).toISOString()
  const today = getBrisbaneDate()
  const futureDate = getBrisbaneDateOffset(days)

  // Run all queries in parallel
  const [overdue, upcoming, meetings, relationships, projects] = await Promise.all([
    // Overdue actions
    supabase
      .from('project_knowledge')
      .select('project_code, title, follow_up_date, importance')
      .eq('action_required', true)
      .lt('follow_up_date', today)
      .order('follow_up_date', { ascending: true })
      .limit(20),

    // Upcoming follow-ups
    supabase
      .from('project_knowledge')
      .select('project_code, title, follow_up_date, importance')
      .eq('action_required', true)
      .gte('follow_up_date', today)
      .lte('follow_up_date', futureDate)
      .order('follow_up_date', { ascending: true })
      .limit(20),

    // Recent meetings
    supabase
      .from('project_knowledge')
      .select('project_code, title, summary, recorded_at, participants')
      .eq('knowledge_type', 'meeting')
      .gte('recorded_at', lookback)
      .order('recorded_at', { ascending: false })
      .limit(10),

    // Stale relationships (active/prospect contacts not contacted in 30+ days)
    supabase
      .from('ghl_contacts')
      .select('full_name, email, company_name, engagement_status, last_contact_date')
      .in('engagement_status', ['active', 'prospect'])
      .lt('last_contact_date', new Date(now.getTime() - 30 * 86400000).toISOString())
      .order('last_contact_date', { ascending: true })
      .limit(10),

    // Active projects (last 30 days activity count)
    supabase
      .from('project_knowledge')
      .select('project_code')
      .gte('recorded_at', new Date(now.getTime() - 30 * 86400000).toISOString()),
  ])

  // Count project activity
  const projectCounts: Record<string, number> = {}
  for (const row of projects.data || []) {
    const code = row.project_code
    projectCounts[code] = (projectCounts[code] || 0) + 1
  }

  const isSummary = input.detail_level === 'summary'

  if (isSummary) {
    return JSON.stringify({
      generated_at: now.toISOString(),
      overdue_actions: (overdue.data || []).length,
      upcoming_followups: (upcoming.data || []).length,
      recent_meetings: (meetings.data || []).length,
      stale_relationships: (relationships.data || []).length,
      active_projects: Object.keys(projectCounts).length,
      top_projects: Object.entries(projectCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([code, count]) => `${code}(${count})`).join(', '),
    })
  }

  return JSON.stringify({
    generated_at: now.toISOString(),
    lookback_days: days,
    overdue_actions: {
      count: (overdue.data || []).length,
      items: overdue.data || [],
    },
    upcoming_followups: {
      count: (upcoming.data || []).length,
      items: upcoming.data || [],
    },
    recent_meetings: {
      count: (meetings.data || []).length,
      items: meetings.data || [],
    },
    stale_relationships: {
      count: (relationships.data || []).length,
      items: (relationships.data || []).map((r) => ({
        name: r.full_name || r.email || 'Unknown',
        company: r.company_name,
        status: r.engagement_status,
        last_contact: r.last_contact_date,
      })),
    },
    active_projects: Object.entries(projectCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([code, count]) => ({ code, activity_count: count })),
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_financial_summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetFinancialSummary(input: {
  days?: number
}): Promise<string> {
  const days = input.days || 30

  const [pipeline, apiCosts, subscriptions] = await Promise.all([
    // Pipeline totals from opportunities
    supabase
      .from('ghl_opportunities')
      .select('status, monetary_value, pipeline_name, stage_name'),

    // API costs (last N days)
    supabase
      .from('api_usage')
      .select('provider, model, estimated_cost, created_at')
      .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100),

    // Active subscriptions
    supabase
      .from('subscriptions')
      .select('vendor, amount_aud, billing_cycle, category, status')
      .eq('status', 'active')
      .order('amount_aud', { ascending: false })
      .limit(30),
  ])

  // Aggregate pipeline
  let openValue = 0
  let wonValue = 0
  let lostValue = 0
  const pipelineData = pipeline.data || []
  for (const row of pipelineData) {
    const val = parseFloat(row.monetary_value) || 0
    if (row.status === 'open') openValue += val
    else if (row.status === 'won') wonValue += val
    else if (row.status === 'lost') lostValue += val
  }

  // Aggregate API costs
  let totalApiCost = 0
  const costsByModel: Record<string, number> = {}
  for (const row of apiCosts.data || []) {
    const cost = parseFloat(row.estimated_cost) || 0
    totalApiCost += cost
    const key = `${row.provider}/${row.model}`
    costsByModel[key] = (costsByModel[key] || 0) + cost
  }

  // Aggregate subscriptions
  let monthlySubscriptionTotal = 0
  for (const sub of subscriptions.data || []) {
    const amount = parseFloat(sub.amount_aud) || 0
    if (sub.billing_cycle === 'monthly') monthlySubscriptionTotal += amount
    else if (sub.billing_cycle === 'yearly') monthlySubscriptionTotal += amount / 12
  }

  return JSON.stringify({
    period_days: days,
    pipeline: {
      total_opportunities: pipelineData.length,
      open_value: openValue,
      won_value: wonValue,
      lost_value: lostValue,
      total_value: openValue + wonValue + lostValue,
    },
    api_costs: {
      total_usd: Math.round(totalApiCost * 100) / 100,
      by_model: costsByModel,
      call_count: (apiCosts.data || []).length,
    },
    subscriptions: {
      active_count: (subscriptions.data || []).length,
      monthly_total_aud: Math.round(monthlySubscriptionTotal * 100) / 100,
      items: (subscriptions.data || []).slice(0, 15),
    },
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: search_contacts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSearchContacts(input: {
  query: string
  limit?: number
}): Promise<string> {
  const { query, limit = 10 } = input
  const searchTerm = `%${query}%`

  try {
    // Search across name, email, company, and tags
    const { data, error } = await supabase
      .from('ghl_contacts')
      .select('id, ghl_id, full_name, email, phone, company_name, engagement_status, tags, projects, last_contact_date')
      .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},company_name.ilike.${searchTerm}`)
      .order('last_contact_date', { ascending: false })
      .limit(limit)

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    const now = new Date()
    const contacts = (data || []).map((c) => ({
      id: c.id,
      ghl_id: c.ghl_id,
      name: c.full_name || 'Unknown',
      email: c.email,
      phone: c.phone,
      company: c.company_name,
      status: c.engagement_status,
      tags: c.tags || [],
      projects: c.projects || [],
      last_contact: c.last_contact_date,
      days_since_contact: c.last_contact_date
        ? Math.floor((now.getTime() - new Date(c.last_contact_date).getTime()) / 86400000)
        : null,
    }))

    return JSON.stringify({
      query,
      count: contacts.length,
      contacts,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_contact_details
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetContactDetails(input: {
  contact_id: string
}): Promise<string> {
  const { contact_id } = input

  try {
    // Try by UUID first, then by GHL ID
    let query = supabase
      .from('ghl_contacts')
      .select('*')

    // UUID format check
    if (contact_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i)) {
      query = query.eq('id', contact_id)
    } else {
      query = query.eq('ghl_id', contact_id)
    }

    const { data: contact, error } = await query.maybeSingle()

    if (error) {
      return JSON.stringify({ error: error.message })
    }
    if (!contact) {
      return JSON.stringify({ error: 'Contact not found', contact_id })
    }

    // Fetch comms + relationship health + next meeting + open pipeline in parallel
    const [commsResult, healthResult, nextMeetingResult, pipelineResult] = await Promise.all([
      supabase
        .from('communications_history')
        .select('direction, channel, subject, summary, communication_date')
        .eq('contact_id', contact.id)
        .order('communication_date', { ascending: false })
        .limit(5),
      supabase
        .from('relationship_health')
        .select('temperature, temperature_trend, last_temperature_change, lcaa_stage, risk_flags, email_score, calendar_score, financial_score, pipeline_score, knowledge_score, signal_breakdown, next_meeting_date, open_invoice_amount')
        .eq('ghl_contact_id', contact.ghl_id)
        .maybeSingle(),
      supabase
        .from('calendar_events')
        .select('title, start_time, attendees')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(10),
      supabase
        .from('ghl_opportunities')
        .select('name, monetary_value, stage_name, status')
        .eq('contact_id', contact.ghl_id)
        .eq('status', 'open'),
    ])

    const comms = commsResult.data
    const health = healthResult.data
    const pipeline = pipelineResult.data

    // Find next meeting involving this contact
    const contactName = (contact.full_name || '').toLowerCase()
    const contactEmail = (contact.email || '').toLowerCase()
    const nextMeeting = (nextMeetingResult.data || []).find((e) => {
      const attendees = JSON.stringify(e.attendees || []).toLowerCase()
      const title = (e.title || '').toLowerCase()
      return (contactEmail && attendees.includes(contactEmail)) || (contactName && title.includes(contactName))
    })

    const now = new Date()
    const openPipelineValue = (pipeline || []).reduce((sum: number, o: { monetary_value?: number }) => sum + (o.monetary_value || 0), 0)

    return JSON.stringify({
      id: contact.id,
      ghl_id: contact.ghl_id,
      name: contact.full_name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company_name,
      status: contact.engagement_status,
      tags: contact.tags || [],
      projects: contact.projects || [],
      last_contact: contact.last_contact_date,
      days_since_contact: contact.last_contact_date
        ? Math.floor((now.getTime() - new Date(contact.last_contact_date).getTime()) / 86400000)
        : null,
      // Relationship health signals
      relationship: health ? {
        temperature: health.temperature,
        trend: health.temperature_trend,
        last_change: health.last_temperature_change,
        lcaa_stage: health.lcaa_stage,
        risk_flags: health.risk_flags || [],
        signals: {
          email: health.email_score,
          calendar: health.calendar_score,
          financial: health.financial_score,
          pipeline: health.pipeline_score,
          knowledge: health.knowledge_score,
        },
      } : null,
      // Pipeline
      open_pipeline: {
        count: (pipeline || []).length,
        total_value: openPipelineValue,
        opportunities: (pipeline || []).map((o: { name: string; monetary_value?: number; stage_name?: string }) => ({
          name: o.name,
          value: o.monetary_value,
          stage: o.stage_name,
        })),
      },
      // Next meeting
      next_meeting: nextMeeting ? { title: nextMeeting.title, date: nextMeeting.start_time } : null,
      recent_communications: (comms || []).map((c) => ({
        direction: c.direction,
        channel: c.channel,
        subject: c.subject,
        summary: c.summary,
        date: c.communication_date,
      })),
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_calendar_events
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetCalendarEvents(input: {
  start_date?: string
  end_date?: string
}): Promise<string> {
  const startDate = input.start_date || getBrisbaneDate()
  const endDate = input.end_date || startDate

  // Use AEST boundaries (UTC+10) so "today" means today in Brisbane
  const dayStart = `${startDate}T00:00:00+10:00`
  const dayEnd = `${endDate}T23:59:59+10:00`

  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .order('start_time', { ascending: true })

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    const events = (data || []).map((e) => ({
      title: e.title || e.summary || 'Untitled Event',
      start_time: e.start_time,
      end_time: e.end_time,
      location: e.location,
      description: e.description,
      project_code: e.project_code,
      is_all_day: e.is_all_day || false,
      attendees: e.attendees || [],
      link: e.html_link || e.link,
    }))

    return JSON.stringify({
      date_range: { start: startDate, end: endDate },
      count: events.length,
      events,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: search_knowledge
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSearchKnowledge(input: {
  query: string
  project_code?: string
  limit?: number
}): Promise<string> {
  const { query, project_code, limit = 10 } = input
  const searchTerm = `%${query}%`

  try {
    let dbQuery = supabase
      .from('project_knowledge')
      .select('id, project_code, knowledge_type, title, summary, key_points, participants, action_required, follow_up_date, importance, recorded_at')
      .or(`title.ilike.${searchTerm},summary.ilike.${searchTerm},key_points.ilike.${searchTerm}`)
      .order('recorded_at', { ascending: false })
      .limit(limit)

    if (project_code) {
      dbQuery = dbQuery.eq('project_code', project_code.toUpperCase())
    }

    const { data, error } = await dbQuery

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    const items = (data || []).map((k) => ({
      id: k.id,
      project_code: k.project_code,
      type: k.knowledge_type,
      title: k.title,
      summary: k.summary,
      key_points: k.key_points,
      participants: k.participants,
      action_required: k.action_required,
      follow_up_date: k.follow_up_date,
      importance: k.importance,
      recorded_at: k.recorded_at,
    }))

    return JSON.stringify({
      query,
      project_code: project_code || 'all',
      count: items.length,
      items,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_project_summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetProjectSummary(input: {
  project_code: string
}): Promise<string> {
  const projectCode = input.project_code.toUpperCase()

  try {
    const { data: summary, error } = await supabase
      .from('project_summaries')
      .select('*')
      .eq('project_code', projectCode)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    if (!summary) {
      return JSON.stringify({
        project_code: projectCode,
        error: 'No summary available yet for this project. Summaries are generated daily.',
      })
    }

    return JSON.stringify({
      project_code: summary.project_code,
      summary: summary.summary_text,
      data_sources: summary.data_sources_used,
      stats: summary.stats,
      generated_at: summary.generated_at,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_contacts_needing_attention
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetContactsNeedingAttention(input: {
  limit?: number
  project?: string
}): Promise<string> {
  const limit = input.limit || 10

  try {
    // Primary: use relationship_health signals (falling temperature or risk flags)
    const { data: healthData, error: healthError } = await supabase
      .from('relationship_health')
      .select('ghl_contact_id, temperature, temperature_trend, last_temperature_change, risk_flags, email_score, calendar_score, next_meeting_date')
      .or('temperature_trend.eq.falling,risk_flags.not.is.null')
      .order('temperature', { ascending: true })
      .limit(limit * 2)

    // Get contact details for matched health records
    const ghlIds = (healthData || []).map((h) => h.ghl_contact_id)

    let contactQuery = supabase
      .from('ghl_contacts')
      .select('id, ghl_id, full_name, email, phone, company_name, engagement_status, tags, projects, last_contact_date')
      .in('ghl_id', ghlIds.length > 0 ? ghlIds : ['__none__'])

    if (input.project) {
      contactQuery = contactQuery.contains('tags', [input.project.toLowerCase()])
    }

    const { data: contactData } = await contactQuery

    // Build health lookup
    const healthMap: Record<string, (typeof healthData extends (infer T)[] | null ? T : never)> = {}
    for (const h of (healthData || [])) {
      healthMap[h.ghl_contact_id] = h
    }

    const now = new Date()
    const contacts = (contactData || [])
      .map((c) => {
        const health = healthMap[c.ghl_id]
        const riskFlags = health?.risk_flags || []
        return {
          id: c.id,
          name: c.full_name || 'Unknown',
          email: c.email,
          phone: c.phone,
          company: c.company_name,
          status: c.engagement_status,
          tags: c.tags || [],
          projects: c.projects || [],
          last_contact: c.last_contact_date,
          days_since_contact: c.last_contact_date
            ? Math.floor((now.getTime() - new Date(c.last_contact_date).getTime()) / 86400000)
            : null,
          temperature: health?.temperature,
          trend: health?.temperature_trend,
          temperature_change: health?.last_temperature_change,
          risk_flags: riskFlags,
          recommended_action: suggestAction(riskFlags, health),
        }
      })
      .sort((a, b) => (a.temperature ?? 999) - (b.temperature ?? 999))
      .slice(0, limit)

    // Fallback: if no signal-based results, use the simple date threshold
    if (contacts.length === 0) {
      const fourteenDaysAgo = getBrisbaneNow()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
      const sixtyDaysAgo = getBrisbaneNow()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

      let fallbackQuery = supabase
        .from('ghl_contacts')
        .select('id, ghl_id, full_name, email, phone, company_name, engagement_status, tags, projects, last_contact_date')
        .lt('last_contact_date', fourteenDaysAgo.toISOString())
        .gt('last_contact_date', sixtyDaysAgo.toISOString())
        .order('last_contact_date', { ascending: true })
        .limit(limit)

      if (input.project) {
        fallbackQuery = fallbackQuery.contains('tags', [input.project.toLowerCase()])
      }

      const { data: fallbackData } = await fallbackQuery

      const fallbackContacts = (fallbackData || []).map((c) => ({
        id: c.id,
        name: c.full_name || 'Unknown',
        email: c.email,
        phone: c.phone,
        company: c.company_name,
        status: c.engagement_status,
        tags: c.tags || [],
        projects: c.projects || [],
        last_contact: c.last_contact_date,
        days_since_contact: c.last_contact_date
          ? Math.floor((now.getTime() - new Date(c.last_contact_date).getTime()) / 86400000)
          : null,
        recommended_action: 'Reach out — no recent contact',
      }))

      return JSON.stringify({
        description: 'Contacts who need follow-up (14-60 days since last contact, no signal data available yet)',
        count: fallbackContacts.length,
        contacts: fallbackContacts,
      })
    }

    return JSON.stringify({
      description: 'Contacts with falling relationship temperature or active risk flags, prioritized by urgency',
      count: contacts.length,
      contacts,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

function suggestAction(
  riskFlags: string[],
  health: { email_score?: number; calendar_score?: number; next_meeting_date?: string } | null | undefined
): string {
  if (riskFlags.includes('awaiting_response')) return 'Reply to their recent message — they\'re waiting to hear back'
  if (riskFlags.includes('high_value_inactive')) return 'High-value deal at risk — schedule a call or meeting ASAP'
  if (riskFlags.includes('one_way_outbound')) return 'Emails going unanswered — try a different channel (call, text, in-person)'
  if (riskFlags.includes('going_cold')) return 'Relationship cooling — send a check-in or share something relevant'
  if (health?.next_meeting_date) return `Meeting scheduled ${new Date(health.next_meeting_date).toLocaleDateString()} — prepare talking points`
  return 'Consider reaching out with a relevant update or check-in'
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_deal_risks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetDealRisks(input: {
  limit?: number
}): Promise<string> {
  const limit = input.limit || 10

  try {
    // Get open opportunities
    const { data: opportunities, error } = await supabase
      .from('ghl_opportunities')
      .select('id, name, monetary_value, stage_name, pipeline_name, contact_id, status, updated_at')
      .eq('status', 'open')
      .order('monetary_value', { ascending: false })

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    if (!opportunities || opportunities.length === 0) {
      return JSON.stringify({ description: 'No open opportunities in pipeline', deals: [] })
    }

    // Get relationship health for all contacts with open deals
    const contactIds = [...new Set(opportunities.map((o) => o.contact_id).filter(Boolean))]
    const { data: healthData } = await supabase
      .from('relationship_health')
      .select('ghl_contact_id, temperature, temperature_trend, risk_flags, last_contact_at, email_score')
      .in('ghl_contact_id', contactIds.length > 0 ? contactIds : ['__none__'])

    const healthMap: Record<string, { temperature?: number; temperature_trend?: string; risk_flags?: string[]; last_contact_at?: string; email_score?: number }> = {}
    for (const h of (healthData || [])) {
      healthMap[h.ghl_contact_id] = h
    }

    // Get contact names
    const { data: contactData } = await supabase
      .from('ghl_contacts')
      .select('ghl_id, full_name, email')
      .in('ghl_id', contactIds.length > 0 ? contactIds : ['__none__'])

    const contactMap: Record<string, { full_name?: string; email?: string }> = {}
    for (const c of (contactData || [])) {
      contactMap[c.ghl_id] = c
    }

    const now = new Date()
    const atRiskDeals = opportunities
      .map((opp) => {
        const health = healthMap[opp.contact_id]
        const contact = contactMap[opp.contact_id]
        const daysSinceUpdate = Math.floor((now.getTime() - new Date(opp.updated_at).getTime()) / 86400000)
        const daysSinceContact = health?.last_contact_at
          ? Math.floor((now.getTime() - new Date(health.last_contact_at).getTime()) / 86400000)
          : null

        // Determine risk reasons
        const risks: string[] = []
        if (health?.temperature_trend === 'falling') risks.push('Contact temperature falling')
        if (health?.risk_flags?.includes('going_cold')) risks.push('Contact going cold')
        if (health?.risk_flags?.includes('awaiting_response')) risks.push('Awaiting your response')
        if (health?.risk_flags?.includes('one_way_outbound')) risks.push('One-way outbound — no replies')
        if (health?.risk_flags?.includes('high_value_inactive')) risks.push('High value but inactive')
        if (daysSinceUpdate > 14) risks.push(`No deal activity in ${daysSinceUpdate} days`)
        if (daysSinceContact && daysSinceContact > 21) risks.push(`No contact in ${daysSinceContact} days`)

        if (risks.length === 0) return null

        return {
          deal: opp.name,
          value: opp.monetary_value,
          stage: opp.stage_name,
          pipeline: opp.pipeline_name,
          contact_name: contact?.full_name || 'Unknown',
          contact_email: contact?.email,
          temperature: health?.temperature,
          trend: health?.temperature_trend,
          risks,
          suggested_action: suggestAction(health?.risk_flags || [], health),
        }
      })
      .filter(Boolean)
      .slice(0, limit)

    return JSON.stringify({
      description: 'Open deals with relationship or activity risk signals',
      count: atRiskDeals.length,
      total_at_risk_value: atRiskDeals.reduce((sum, d) => sum + ((d as { value?: number }).value || 0), 0),
      deals: atRiskDeals,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: draft_email
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeDraftEmail(
  input: { to: string; subject: string; body: string },
  chatId?: number
): Promise<string> {
  // Resolve contact email if name given
  let recipientEmail = input.to
  let recipientName = input.to

  if (!input.to.includes('@')) {
    const searchTerm = `%${input.to}%`
    const { data } = await supabase
      .from('ghl_contacts')
      .select('full_name, email')
      .ilike('full_name', searchTerm)
      .not('email', 'is', null)
      .limit(1)
      .maybeSingle()

    if (data?.email) {
      recipientEmail = data.email
      recipientName = data.full_name || input.to
    } else {
      return JSON.stringify({
        error: `Could not find email for "${input.to}". Try providing the email address directly.`,
      })
    }
  }

  // Store as pending action if in Telegram context
  if (chatId) {
    await savePendingAction(chatId, `Send email to ${recipientName} <${recipientEmail}>`, {
      type: 'draft_email',
      params: { to: recipientEmail, subject: input.subject, body: input.body },
    })
  }

  return JSON.stringify({
    action: 'email_draft',
    status: 'pending_confirmation',
    to: recipientEmail,
    to_name: recipientName,
    subject: input.subject,
    body: input.body,
    message: `Email drafted to ${recipientName} (${recipientEmail}). Reply "yes" to send, "no" to cancel, or "edit" to modify.`,
  })
}

async function sendEmailViaGmail(to: string, subject: string, body: string): Promise<string> {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  const delegatedUser = process.env.GOOGLE_DELEGATED_USER
  if (!serviceAccountKey || !delegatedUser) {
    return 'Gmail not configured — GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_DELEGATED_USER required.'
  }

  const credentials = JSON.parse(serviceAccountKey)

  // Get access token via service account JWT
  const token = await getGoogleAccessToken(credentials, delegatedUser, [
    'https://www.googleapis.com/auth/gmail.send',
  ])

  // Build RFC 2822 email
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ]
  const rawEmail = Buffer.from(emailLines.join('\r\n')).toString('base64url')

  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: rawEmail }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    return `Failed to send email: ${response.status} ${errBody}`
  }

  return `Email sent to ${to} with subject "${subject}".`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: create_calendar_event
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeCreateCalendarEvent(
  input: {
    title: string
    date: string
    time: string
    duration_minutes?: number
    attendees?: string[]
    location?: string
  },
  chatId?: number
): Promise<string> {
  const duration = input.duration_minutes || 60
  const startDateTime = `${input.date}T${input.time}:00`
  const endDateTime = new Date(new Date(startDateTime).getTime() + duration * 60000).toISOString()

  // Resolve attendee emails
  const attendeeEmails: string[] = []
  if (input.attendees) {
    for (const attendee of input.attendees) {
      if (attendee.includes('@')) {
        attendeeEmails.push(attendee)
      } else {
        const searchTerm = `%${attendee}%`
        const { data } = await supabase
          .from('ghl_contacts')
          .select('email')
          .ilike('full_name', searchTerm)
          .not('email', 'is', null)
          .limit(1)
          .maybeSingle()
        if (data?.email) attendeeEmails.push(data.email)
      }
    }
  }

  const eventSummary = {
    title: input.title,
    start: startDateTime,
    end: endDateTime,
    duration_minutes: duration,
    attendees: attendeeEmails,
    location: input.location,
  }

  // Store as pending action if in Telegram context
  if (chatId) {
    await savePendingAction(chatId, `Create calendar event: ${input.title}`, {
      type: 'create_calendar_event',
      params: eventSummary,
    })
  }

  const timeStr = new Date(startDateTime).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })

  return JSON.stringify({
    action: 'calendar_event',
    status: 'pending_confirmation',
    ...eventSummary,
    message: `Event: "${input.title}" on ${input.date} at ${timeStr} (${duration} min)${attendeeEmails.length ? `, with ${attendeeEmails.join(', ')}` : ''}${input.location ? ` at ${input.location}` : ''}. Reply "yes" to create, "no" to cancel, or "edit" to modify.`,
  })
}

async function createGoogleCalendarEvent(event: {
  title: string
  start: string
  end: string
  attendees?: string[]
  location?: string
}): Promise<string> {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  const delegatedUser = process.env.GOOGLE_DELEGATED_USER
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

  if (!serviceAccountKey || !delegatedUser) {
    return 'Google Calendar not configured — GOOGLE_SERVICE_ACCOUNT_KEY and GOOGLE_DELEGATED_USER required.'
  }

  const credentials = JSON.parse(serviceAccountKey)
  const token = await getGoogleAccessToken(credentials, delegatedUser, [
    'https://www.googleapis.com/auth/calendar.events',
  ])

  const calendarEvent = {
    summary: event.title,
    start: {
      dateTime: event.start,
      timeZone: 'Australia/Brisbane',
    },
    end: {
      dateTime: event.end,
      timeZone: 'Australia/Brisbane',
    },
    ...(event.attendees?.length ? {
      attendees: event.attendees.map((email) => ({ email })),
    } : {}),
    ...(event.location ? { location: event.location } : {}),
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(calendarEvent),
    }
  )

  if (!response.ok) {
    const errBody = await response.text()
    return `Failed to create event: ${response.status} ${errBody}`
  }

  const created = await response.json()
  return `Event "${event.title}" created. ${created.htmlLink || ''}`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: set_reminder
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSetReminder(
  input: { message: string; time: string; recurring?: string },
  chatId?: number
): Promise<string> {
  if (!chatId) {
    return JSON.stringify({ error: 'Reminders require Telegram context (chatId).' })
  }

  let triggerAt: Date
  try {
    triggerAt = new Date(input.time)
    if (isNaN(triggerAt.getTime())) throw new Error('Invalid date')
  } catch {
    return JSON.stringify({
      error: `Could not parse time "${input.time}". Use ISO format like "2026-02-05T06:00:00+10:00".`,
    })
  }

  try {
    const { data, error } = await supabase.from('reminders').insert({
      chat_id: chatId,
      message: input.message,
      trigger_at: triggerAt.toISOString(),
      recurring: input.recurring || null,
    }).select().single()

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    const timeStr = triggerAt.toLocaleString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Australia/Brisbane',
    })

    return JSON.stringify({
      action: 'reminder_set',
      id: data.id,
      message: input.message,
      trigger_at: triggerAt.toISOString(),
      recurring: input.recurring || 'one-off',
      confirmation: `Reminder set: "${input.message}" — ${timeStr}${input.recurring ? ` (${input.recurring})` : ''}.`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: add_receipt
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeAddReceipt(input: {
  vendor: string
  amount: number
  date: string
  category?: string
  notes?: string
}): Promise<string> {
  try {
    const { data, error } = await supabase.from('receipt_matches').insert({
      source_type: 'transaction',
      source_id: `telegram-${Date.now()}`,
      vendor_name: input.vendor,
      amount: input.amount,
      transaction_date: input.date,
      category: input.category || 'other',
      description: input.notes || `Added via Telegram`,
      status: 'pending',
      week_start: getWeekStart(input.date),
    }).select().single()

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    return JSON.stringify({
      action: 'receipt_added',
      id: data.id,
      vendor: input.vendor,
      amount: input.amount,
      date: input.date,
      category: input.category || 'other',
      confirmation: `Receipt logged: $${input.amount.toFixed(2)} at ${input.vendor} on ${input.date}.`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_grant_opportunities
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetGrantOpportunities(input: {
  status?: string
  limit?: number
}): Promise<string> {
  const status = input.status || 'open'
  const limit = input.limit || 10

  try {
    const { data, error } = await supabase
      .from('grant_opportunities')
      .select('id, name, provider, program, amount_min, amount_max, opens_at, closes_at, status, fit_score, fit_notes, aligned_projects, categories, url')
      .eq('status', status)
      .order('closes_at', { ascending: true })
      .limit(limit)

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    const now = new Date()
    const grants = (data || []).map((g) => ({
      id: g.id,
      name: g.name,
      provider: g.provider,
      program: g.program,
      amount_range: g.amount_min && g.amount_max
        ? `$${Number(g.amount_min).toLocaleString()} - $${Number(g.amount_max).toLocaleString()}`
        : g.amount_max
          ? `Up to $${Number(g.amount_max).toLocaleString()}`
          : 'Not specified',
      opens_at: g.opens_at,
      closes_at: g.closes_at,
      days_until_close: g.closes_at
        ? Math.ceil((new Date(g.closes_at).getTime() - now.getTime()) / 86400000)
        : null,
      status: g.status,
      fit_score: g.fit_score,
      fit_notes: g.fit_notes,
      aligned_projects: g.aligned_projects || [],
      categories: g.categories || [],
      url: g.url,
    }))

    return JSON.stringify({
      status_filter: status,
      count: grants.length,
      grants,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_grant_pipeline
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetGrantPipeline(input: {
  status?: string
}): Promise<string> {
  try {
    let query = supabase
      .from('grant_applications')
      .select('id, application_name, amount_requested, status, started_at, submitted_at, outcome_at, milestones, lead_contact, team_members, project_code, outcome_amount, outcome_notes, opportunity_id')
      .order('started_at', { ascending: false })

    if (input.status) {
      query = query.eq('status', input.status)
    } else {
      // Default: active applications
      query = query.in('status', ['draft', 'in_progress', 'submitted', 'under_review'])
    }

    const { data, error } = await query.limit(20)

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    const applications = (data || []).map((a) => ({
      id: a.id,
      name: a.application_name,
      amount_requested: a.amount_requested ? `$${Number(a.amount_requested).toLocaleString()}` : 'Not specified',
      status: a.status,
      started_at: a.started_at,
      submitted_at: a.submitted_at,
      outcome_at: a.outcome_at,
      lead_contact: a.lead_contact,
      team: a.team_members || [],
      project_code: a.project_code,
      outcome_amount: a.outcome_amount ? `$${Number(a.outcome_amount).toLocaleString()}` : null,
      outcome_notes: a.outcome_notes,
    }))

    return JSON.stringify({
      status_filter: input.status || 'active',
      count: applications.length,
      applications,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_pending_receipts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetPendingReceipts(input: {
  limit?: number
}): Promise<string> {
  const limit = input.limit || 10

  try {
    const { data, error } = await supabase
      .from('receipt_matches')
      .select('id, vendor_name, amount, transaction_date, category, status, match_confidence, created_at')
      .in('status', ['pending', 'email_suggested'])
      .order('transaction_date', { ascending: false })
      .limit(limit)

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    const now = new Date()
    const receipts = (data || []).map((r) => ({
      id: r.id,
      vendor: r.vendor_name || 'Unknown',
      amount: `$${Number(r.amount).toFixed(2)}`,
      date: r.transaction_date,
      category: r.category,
      status: r.status,
      match_confidence: r.match_confidence,
      days_pending: Math.floor((now.getTime() - new Date(r.created_at).getTime()) / 86400000),
    }))

    const totalAmount = (data || []).reduce((sum, r) => sum + (parseFloat(String(r.amount)) || 0), 0)

    return JSON.stringify({
      count: receipts.length,
      total_pending: `$${totalAmount.toFixed(2)}`,
      receipts,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_quarterly_review
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getAustralianQuarter(date: Date): { quarter: number; fyStart: number; fyEnd: number } {
  const month = date.getMonth() // 0-based
  // Australian FY: Jul-Jun. Q1=Jul-Sep, Q2=Oct-Dec, Q3=Jan-Mar, Q4=Apr-Jun
  if (month >= 6 && month <= 8) return { quarter: 1, fyStart: date.getFullYear(), fyEnd: date.getFullYear() + 1 }
  if (month >= 9 && month <= 11) return { quarter: 2, fyStart: date.getFullYear(), fyEnd: date.getFullYear() + 1 }
  if (month >= 0 && month <= 2) return { quarter: 3, fyStart: date.getFullYear() - 1, fyEnd: date.getFullYear() }
  return { quarter: 4, fyStart: date.getFullYear() - 1, fyEnd: date.getFullYear() }
}

function getQuarterDates(quarterStr?: string): { label: string; start: string; end: string; fyLabel: string; prevStart: string; prevEnd: string } {
  const now = new Date()
  let year: number
  let q: number

  if (quarterStr) {
    const match = quarterStr.match(/^(\d{4})-Q([1-4])$/i)
    if (match) {
      year = parseInt(match[1])
      q = parseInt(match[2])
    } else {
      const aq = getAustralianQuarter(now)
      year = aq.fyStart
      q = aq.quarter
    }
  } else {
    const aq = getAustralianQuarter(now)
    year = aq.fyStart
    q = aq.quarter
  }

  // Map quarter to date ranges (Australian FY)
  const ranges: Record<number, { start: string; end: string }> = {
    1: { start: `${year}-07-01`, end: `${year}-09-30` },
    2: { start: `${year}-10-01`, end: `${year}-12-31` },
    3: { start: `${year + 1}-01-01`, end: `${year + 1}-03-31` },
    4: { start: `${year + 1}-04-01`, end: `${year + 1}-06-30` },
  }

  const prevQ = q === 1 ? 4 : q - 1
  const prevYear = q === 1 ? year - 1 : year
  const prevRanges: Record<number, { start: string; end: string }> = {
    1: { start: `${prevYear}-07-01`, end: `${prevYear}-09-30` },
    2: { start: `${prevYear}-10-01`, end: `${prevYear}-12-31` },
    3: { start: `${prevYear + 1}-01-01`, end: `${prevYear + 1}-03-31` },
    4: { start: `${prevYear + 1}-04-01`, end: `${prevYear + 1}-06-30` },
  }

  return {
    label: `Q${q} FY${year}/${year + 1}`,
    start: ranges[q].start,
    end: ranges[q].end,
    fyLabel: `FY${year}/${year + 1}`,
    prevStart: prevRanges[prevQ].start,
    prevEnd: prevRanges[prevQ].end,
  }
}

async function executeGetQuarterlyReview(input: { quarter?: string; detail_level?: string }): Promise<string> {
  const qDates = getQuarterDates(input.quarter)

  try {
    // Run all queries in parallel
    const [
      incomeInvoices,
      expenseInvoices,
      prevIncomeInvoices,
      prevExpenseInvoices,
      outstandingInvoices,
      pendingReceipts,
      resolvedReceipts,
      activeSubscriptions,
      subscriptionAlerts,
      upcomingRenewals,
      transactions6m,
    ] = await Promise.all([
      // Income invoices (ACCREC) for the quarter
      supabase
        .from('xero_invoices')
        .select('contact_name, total, amount_paid, amount_due, project_code, status')
        .eq('type', 'ACCREC')
        .gte('date', qDates.start)
        .lte('date', qDates.end),

      // Expense invoices (ACCPAY) for the quarter
      supabase
        .from('xero_invoices')
        .select('contact_name, total, amount_paid, amount_due, project_code, status')
        .eq('type', 'ACCPAY')
        .gte('date', qDates.start)
        .lte('date', qDates.end),

      // Previous quarter income (for comparison)
      supabase
        .from('xero_invoices')
        .select('total')
        .eq('type', 'ACCREC')
        .gte('date', qDates.prevStart)
        .lte('date', qDates.prevEnd),

      // Previous quarter expenses (for comparison)
      supabase
        .from('xero_invoices')
        .select('total')
        .eq('type', 'ACCPAY')
        .gte('date', qDates.prevStart)
        .lte('date', qDates.prevEnd),

      // Outstanding invoices (all unpaid)
      supabase
        .from('xero_invoices')
        .select('invoice_number, contact_name, amount_due, due_date, type, status')
        .gt('amount_due', 0)
        .in('status', ['AUTHORISED', 'SENT'])
        .order('due_date', { ascending: true }),

      // Pending receipts
      supabase
        .from('receipt_matches')
        .select('id, vendor_name, amount, transaction_date, category, status, created_at')
        .in('status', ['pending', 'email_suggested']),

      // Resolved receipts this quarter
      supabase
        .from('receipt_matches')
        .select('id')
        .eq('status', 'resolved')
        .gte('transaction_date', qDates.start)
        .lte('transaction_date', qDates.end),

      // Active subscriptions
      supabase
        .from('subscriptions')
        .select('vendor, name, amount_aud, billing_cycle, category, status, renewal_date, value_rating')
        .eq('status', 'active')
        .order('amount_aud', { ascending: false }),

      // Subscription alerts
      supabase
        .from('v_subscription_alerts')
        .select('*')
        .limit(20),

      // Upcoming renewals (next 30 days)
      supabase
        .from('v_upcoming_renewals')
        .select('*')
        .limit(20),

      // Transactions for last 6 months (for cashflow trend)
      supabase
        .from('xero_transactions')
        .select('date, type, total, contact_name')
        .gte('date', getBrisbaneDateOffset(-180))
        .order('date', { ascending: true }),
    ])

    // ── Income & Expenses ──────────────────────────────────
    const incomeData = incomeInvoices.data || []
    const expenseData = expenseInvoices.data || []

    const totalIncome = incomeData.reduce((sum, i) => sum + (parseFloat(String(i.total)) || 0), 0)
    const totalExpenses = expenseData.reduce((sum, i) => sum + (parseFloat(String(i.total)) || 0), 0)
    const netProfit = totalIncome - totalExpenses

    // Income by source (top 15)
    const incomeBySource: Record<string, number> = {}
    for (const inv of incomeData) {
      const key = inv.contact_name || 'Unknown'
      incomeBySource[key] = (incomeBySource[key] || 0) + (parseFloat(String(inv.total)) || 0)
    }
    const topIncome = Object.entries(incomeBySource)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([contact, amount]) => ({ contact, amount: Math.round(amount * 100) / 100 }))

    // Expenses by vendor (top 15)
    const expensesByVendor: Record<string, number> = {}
    for (const inv of expenseData) {
      const key = inv.contact_name || 'Unknown'
      expensesByVendor[key] = (expensesByVendor[key] || 0) + (parseFloat(String(inv.total)) || 0)
    }
    const topExpenses = Object.entries(expensesByVendor)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([vendor, amount]) => ({ vendor, amount: Math.round(amount * 100) / 100 }))

    // Expenses by project
    const expensesByProject: Record<string, number> = {}
    for (const inv of expenseData) {
      const key = inv.project_code || 'Unallocated'
      expensesByProject[key] = (expensesByProject[key] || 0) + (parseFloat(String(inv.total)) || 0)
    }
    const topProjectExpenses = Object.entries(expensesByProject)
      .sort(([, a], [, b]) => b - a)
      .map(([project, amount]) => ({ project, amount: Math.round(amount * 100) / 100 }))

    // Previous quarter comparison
    const prevIncome = (prevIncomeInvoices.data || []).reduce((sum, i) => sum + (parseFloat(String(i.total)) || 0), 0)
    const prevExpenses = (prevExpenseInvoices.data || []).reduce((sum, i) => sum + (parseFloat(String(i.total)) || 0), 0)
    const incomeChangePct = prevIncome > 0 ? Math.round(((totalIncome - prevIncome) / prevIncome) * 100) : null
    const expenseChangePct = prevExpenses > 0 ? Math.round(((totalExpenses - prevExpenses) / prevExpenses) * 100) : null

    // ── BAS Summary ────────────────────────────────────────
    const g1TotalSales = totalIncome
    const g11NonCapitalPurchases = totalExpenses
    const label1aGstOnSales = Math.round((g1TotalSales / 11) * 100) / 100
    const label1bGstOnPurchases = Math.round((g11NonCapitalPurchases / 11) * 100) / 100
    const estimatedGstPayable = Math.round((label1aGstOnSales - label1bGstOnPurchases) * 100) / 100

    // ── Outstanding Invoices ───────────────────────────────
    const outstanding = outstandingInvoices.data || []
    const now = new Date()
    const totalOutstanding = outstanding.reduce((sum, i) => sum + (parseFloat(String(i.amount_due)) || 0), 0)

    const aging: Record<string, number> = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    const overdueItems: Array<{ invoice_number: string; contact: string; amount_due: number; days_overdue: number }> = []

    for (const inv of outstanding) {
      const dueDate = new Date(inv.due_date)
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / 86400000)
      const amountDue = parseFloat(String(inv.amount_due)) || 0

      if (daysOverdue <= 0) aging.current += amountDue
      else if (daysOverdue <= 30) aging['1-30'] += amountDue
      else if (daysOverdue <= 60) aging['31-60'] += amountDue
      else if (daysOverdue <= 90) aging['61-90'] += amountDue
      else aging['90+'] += amountDue

      if (daysOverdue > 0 && inv.type === 'ACCREC') {
        overdueItems.push({
          invoice_number: inv.invoice_number,
          contact: inv.contact_name,
          amount_due: amountDue,
          days_overdue: daysOverdue,
        })
      }
    }
    overdueItems.sort((a, b) => b.days_overdue - a.days_overdue)

    // ── Receipts ───────────────────────────────────────────
    const pending = pendingReceipts.data || []
    const pendingCount = pending.length
    const pendingTotal = pending.reduce((sum, r) => sum + (parseFloat(String(r.amount)) || 0), 0)
    let oldestPendingDays = 0
    for (const r of pending) {
      const days = Math.floor((now.getTime() - new Date(r.created_at).getTime()) / 86400000)
      if (days > oldestPendingDays) oldestPendingDays = days
    }
    const receiptsByCategory: Record<string, number> = {}
    for (const r of pending) {
      const cat = r.category || 'uncategorised'
      receiptsByCategory[cat] = (receiptsByCategory[cat] || 0) + 1
    }

    // ── Subscriptions ──────────────────────────────────────
    const subs = activeSubscriptions.data || []
    let monthlyTotal = 0
    let annualTotal = 0
    for (const sub of subs) {
      const amount = parseFloat(String(sub.amount_aud)) || 0
      if (sub.billing_cycle === 'monthly') {
        monthlyTotal += amount
        annualTotal += amount * 12
      } else if (sub.billing_cycle === 'yearly') {
        monthlyTotal += amount / 12
        annualTotal += amount
      } else if (sub.billing_cycle === 'quarterly') {
        monthlyTotal += amount / 3
        annualTotal += amount * 4
      }
    }

    const topSubCosts = subs.slice(0, 10).map((s) => ({
      vendor: s.vendor || s.name,
      monthly_amount: parseFloat(String(s.amount_aud)) || 0,
      category: s.category,
      billing_cycle: s.billing_cycle,
    }))

    // ── Cashflow Trend ─────────────────────────────────────
    const txns = transactions6m.data || []
    const monthlyMap: Record<string, { income: number; expenses: number }> = {}
    for (const t of txns) {
      const month = t.date?.substring(0, 7) // YYYY-MM
      if (!month) continue
      if (!monthlyMap[month]) monthlyMap[month] = { income: 0, expenses: 0 }
      const amount = Math.abs(parseFloat(String(t.total)) || 0)
      if (t.type === 'RECEIVE') monthlyMap[month].income += amount
      else if (t.type === 'SPEND') monthlyMap[month].expenses += amount
    }
    const monthlyTrend = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: Math.round(data.income * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
        net: Math.round((data.income - data.expenses) * 100) / 100,
      }))

    const avgIncome = monthlyTrend.length > 0
      ? monthlyTrend.reduce((sum, m) => sum + m.income, 0) / monthlyTrend.length
      : 0
    const avgExpenses = monthlyTrend.length > 0
      ? monthlyTrend.reduce((sum, m) => sum + m.expenses, 0) / monthlyTrend.length
      : 0

    // ── Issue Detection ────────────────────────────────────
    const issues: Array<{ type: string; severity: string; detail: string }> = []

    // Overdue invoices > 30 days
    const overdue30 = overdueItems.filter((i) => i.days_overdue > 30)
    if (overdue30.length > 0) {
      const totalOverdue30 = overdue30.reduce((sum, i) => sum + i.amount_due, 0)
      issues.push({
        type: 'overdue_invoices',
        severity: 'high',
        detail: `${overdue30.length} invoices overdue >30 days, totalling $${totalOverdue30.toFixed(2)}`,
      })
    }

    // Large outstanding amounts
    if (totalOutstanding > 5000) {
      issues.push({
        type: 'large_outstanding',
        severity: 'high',
        detail: `$${totalOutstanding.toFixed(2)} total outstanding across ${outstanding.length} invoices`,
      })
    }

    // Pending receipts > 14 days
    const staleReceipts = pending.filter(
      (r) => Math.floor((now.getTime() - new Date(r.created_at).getTime()) / 86400000) > 14
    )
    if (staleReceipts.length > 0) {
      issues.push({
        type: 'stale_receipts',
        severity: 'medium',
        detail: `${staleReceipts.length} receipts pending >14 days (oldest: ${oldestPendingDays} days)`,
      })
    }

    // Subscriptions renewing soon
    const renewals = upcomingRenewals.data || []
    const urgentRenewals = renewals.filter((r) => {
      const daysUntil = r.renewal_date
        ? Math.ceil((new Date(r.renewal_date).getTime() - now.getTime()) / 86400000)
        : 999
      return daysUntil <= 7
    })
    if (urgentRenewals.length > 0) {
      issues.push({
        type: 'upcoming_renewals',
        severity: 'medium',
        detail: `${urgentRenewals.length} subscriptions renewing within 7 days`,
      })
    }

    // Subscription alerts
    const alerts = subscriptionAlerts.data || []
    if (alerts.length > 0) {
      issues.push({
        type: 'subscription_alerts',
        severity: 'medium',
        detail: `${alerts.length} subscription alerts (missed payments, price changes, etc.)`,
      })
    }

    // Expenses exceeding income
    if (totalExpenses > totalIncome && totalIncome > 0) {
      issues.push({
        type: 'expenses_exceed_income',
        severity: 'high',
        detail: `Expenses ($${totalExpenses.toFixed(2)}) exceed income ($${totalIncome.toFixed(2)}) by $${(totalExpenses - totalIncome).toFixed(2)}`,
      })
    }

    // Unusual vendor spending (>50% increase vs previous quarter)
    if (prevExpenses > 0) {
      // Check at vendor level by comparing current vs previous quarter
      // (simplified: flag if overall expenses jumped >50%)
      if (expenseChangePct !== null && expenseChangePct > 50) {
        issues.push({
          type: 'spending_spike',
          severity: 'low',
          detail: `Total expenses increased ${expenseChangePct}% vs previous quarter`,
        })
      }
    }

    // Summary mode: headline numbers + issues only (~200 tokens vs ~2000)
    if (input.detail_level === 'summary') {
      return JSON.stringify({
        quarter: qDates.label,
        income: Math.round(totalIncome * 100) / 100,
        expenses: Math.round(totalExpenses * 100) / 100,
        net_profit: Math.round(netProfit * 100) / 100,
        vs_prev: { income_pct: incomeChangePct, expenses_pct: expenseChangePct },
        gst_payable: estimatedGstPayable,
        outstanding: Math.round(totalOutstanding * 100) / 100,
        pending_receipts: pendingCount,
        subscriptions_monthly: Math.round(monthlyTotal * 100) / 100,
        issues,
      })
    }

    return JSON.stringify({
      quarter: {
        label: qDates.label,
        start_date: qDates.start,
        end_date: qDates.end,
        fy_label: qDates.fyLabel,
      },
      income_expenses: {
        total_income: Math.round(totalIncome * 100) / 100,
        total_expenses: Math.round(totalExpenses * 100) / 100,
        net_profit: Math.round(netProfit * 100) / 100,
        income_by_source: topIncome,
        expenses_by_vendor: topExpenses,
        expenses_by_project: topProjectExpenses,
        vs_previous_quarter: {
          income_change_pct: incomeChangePct,
          expenses_change_pct: expenseChangePct,
        },
      },
      bas_summary: {
        g1_total_sales: Math.round(g1TotalSales * 100) / 100,
        g11_non_capital_purchases: Math.round(g11NonCapitalPurchases * 100) / 100,
        label_1a_gst_on_sales: label1aGstOnSales,
        label_1b_gst_on_purchases: label1bGstOnPurchases,
        estimated_gst_payable: estimatedGstPayable,
        note: 'Estimates from Xero invoice totals. Verify against Xero BAS report.',
        invoice_count: { receivable: incomeData.length, payable: expenseData.length },
      },
      outstanding_invoices: {
        total_outstanding: Math.round(totalOutstanding * 100) / 100,
        by_aging: Object.fromEntries(
          Object.entries(aging).map(([k, v]) => [k, Math.round(v * 100) / 100])
        ),
        overdue_items: overdueItems.slice(0, 10),
      },
      receipts: {
        pending_count: pendingCount,
        pending_total: Math.round(pendingTotal * 100) / 100,
        oldest_pending_days: oldestPendingDays,
        by_category: receiptsByCategory,
        resolved_this_quarter: (resolvedReceipts.data || []).length,
      },
      subscriptions: {
        active_count: subs.length,
        monthly_total: Math.round(monthlyTotal * 100) / 100,
        annual_total: Math.round(annualTotal * 100) / 100,
        top_costs: topSubCosts,
        upcoming_renewals: (renewals).slice(0, 5),
        alerts: (alerts).slice(0, 5),
      },
      cashflow: {
        monthly_trend: monthlyTrend,
        avg_monthly_income: Math.round(avgIncome * 100) / 100,
        avg_monthly_expenses: Math.round(avgExpenses * 100) / 100,
        months_of_runway: avgExpenses > avgIncome && avgExpenses > 0
          ? null
          : undefined,
      },
      issues,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_xero_transactions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetXeroTransactions(input: {
  type?: string
  vendor?: string
  project_code?: string
  start_date?: string
  end_date?: string
  min_amount?: number
  limit?: number
}): Promise<string> {
  const limit = input.limit || 25
  const endDate = input.end_date || getBrisbaneDate()
  const startDate = input.start_date || getBrisbaneDateOffset(-90)

  try {
    let query = supabase
      .from('xero_transactions')
      .select('date, type, contact_name, bank_account, project_code, total, line_items, has_attachments')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .limit(limit)

    if (input.type) {
      query = query.eq('type', input.type.toUpperCase())
    }
    if (input.vendor) {
      query = query.ilike('contact_name', `%${input.vendor}%`)
    }
    if (input.project_code) {
      query = query.eq('project_code', input.project_code.toUpperCase())
    }
    if (input.min_amount) {
      query = query.gte('total', input.min_amount)
    }

    const { data, error } = await query

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    const transactions = (data || []).map((t) => {
      // Extract line items summary from JSONB
      let lineItemsSummary = ''
      if (t.line_items && Array.isArray(t.line_items)) {
        const items = t.line_items as Array<{ Description?: string; description?: string }>
        const first = items[0]
        const desc = first?.Description || first?.description || ''
        lineItemsSummary = desc
        if (items.length > 1) lineItemsSummary += ` (+${items.length - 1} more)`
      }

      return {
        date: t.date,
        type: t.type,
        contact_name: t.contact_name,
        bank_account: t.bank_account,
        project_code: t.project_code,
        total: parseFloat(String(t.total)) || 0,
        has_attachments: t.has_attachments || false,
        line_items_summary: lineItemsSummary,
      }
    })

    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.total), 0)

    return JSON.stringify({
      filters: {
        type: input.type || 'all',
        vendor: input.vendor || null,
        project_code: input.project_code || null,
        date_range: { start: startDate, end: endDate },
        min_amount: input.min_amount || null,
      },
      count: transactions.length,
      total_amount: Math.round(totalAmount * 100) / 100,
      transactions,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_day_context
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetDayContext(input: { date?: string }): Promise<string> {
  const date = input.date || getBrisbaneDate()

  try {
    const [calendar, comms, knowledge, actions] = await Promise.all([
      supabase
        .from('calendar_events')
        .select('title, start_time, end_time, location, attendees')
        .gte('start_time', `${date}T00:00:00Z`)
        .lte('start_time', `${date}T23:59:59Z`)
        .order('start_time'),
      supabase
        .from('communications_history')
        .select('contact_name, direction, channel, subject, ai_summary')
        .gte('created_at', `${date}T00:00:00Z`)
        .lte('created_at', `${date}T23:59:59Z`)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('project_knowledge')
        .select('project_code, knowledge_type, title, summary, participants')
        .gte('recorded_at', `${date}T00:00:00Z`)
        .lte('recorded_at', `${date}T23:59:59Z`)
        .order('recorded_at', { ascending: false })
        .limit(20),
      supabase
        .from('project_knowledge')
        .select('project_code, title, action_items')
        .eq('action_required', true)
        .gte('recorded_at', `${date}T00:00:00Z`)
        .lte('recorded_at', `${date}T23:59:59Z`),
    ])

    return JSON.stringify({
      date,
      calendar_events: calendar.data || [],
      communications: comms.data || [],
      knowledge_entries: knowledge.data || [],
      action_items: actions.data || [],
      stats: {
        meetings: (calendar.data || []).length,
        communications: (comms.data || []).length,
        knowledge_entries: (knowledge.data || []).length,
        actions_created: (actions.data || []).length,
      },
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: save_daily_reflection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSaveDailyReflection(
  input: {
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
  chatId?: number
): Promise<string> {
  if (!chatId) return JSON.stringify({ error: 'Reflections require Telegram context.' })

  const today = getBrisbaneDate()

  try {
    // Gather day stats for enrichment
    const [calResult, commsResult, knowledgeResult] = await Promise.all([
      supabase
        .from('calendar_events')
        .select('id', { count: 'exact', head: true })
        .gte('start_time', `${today}T00:00:00Z`)
        .lte('start_time', `${today}T23:59:59Z`),
      supabase
        .from('communications_history')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00Z`),
      supabase
        .from('project_knowledge')
        .select('id', { count: 'exact', head: true })
        .gte('recorded_at', `${today}T00:00:00Z`),
    ])

    const dayStats = {
      meetings: calResult.count || 0,
      communications: commsResult.count || 0,
      knowledge_entries: knowledgeResult.count || 0,
    }

    // Upsert (allow updating today's reflection)
    const { data, error } = await supabase
      .from('daily_reflections')
      .upsert(
        {
          chat_id: chatId,
          reflection_date: today,
          voice_transcript: input.voice_transcript,
          lcaa_listen: input.lcaa_listen,
          lcaa_curiosity: input.lcaa_curiosity,
          lcaa_action: input.lcaa_action,
          lcaa_art: input.lcaa_art,
          loop_to_tomorrow: input.loop_to_tomorrow || null,
          gratitude: input.gratitude || [],
          challenges: input.challenges || [],
          learnings: input.learnings || [],
          intentions: input.intentions || [],
          day_stats: dayStats,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'chat_id,reflection_date' }
      )
      .select()
      .single()

    if (error) return JSON.stringify({ error: error.message })

    return JSON.stringify({
      action: 'reflection_saved',
      id: data.id,
      date: today,
      day_stats: dayStats,
      confirmation: `Reflection saved for ${today}. Your LCAA loop is complete.`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: search_past_reflections
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSearchPastReflections(input: {
  query?: string
  days?: number
  limit?: number
}): Promise<string> {
  const days = input.days || 30
  const limit = input.limit || 7
  const lookback = getBrisbaneDateOffset(-days)

  try {
    let query = supabase
      .from('daily_reflections')
      .select(
        'id, reflection_date, lcaa_listen, lcaa_curiosity, lcaa_action, lcaa_art, loop_to_tomorrow, gratitude, challenges, learnings, intentions, day_stats'
      )
      .gte('reflection_date', lookback)
      .order('reflection_date', { ascending: false })
      .limit(limit)

    if (input.query) {
      const searchTerm = `%${input.query}%`
      query = query.or(
        `lcaa_listen.ilike.${searchTerm},lcaa_curiosity.ilike.${searchTerm},lcaa_action.ilike.${searchTerm},lcaa_art.ilike.${searchTerm},loop_to_tomorrow.ilike.${searchTerm},voice_transcript.ilike.${searchTerm}`
      )
    }

    const { data, error } = await query

    if (error) return JSON.stringify({ error: error.message })

    const reflections = (data || []).map((r) => ({
      id: r.id,
      date: r.reflection_date,
      listen: r.lcaa_listen,
      curiosity: r.lcaa_curiosity,
      action: r.lcaa_action,
      art: r.lcaa_art,
      loop: r.loop_to_tomorrow,
      gratitude: r.gratitude,
      challenges: r.challenges,
      learnings: r.learnings,
      intentions: r.intentions,
      day_stats: r.day_stats,
    }))

    return JSON.stringify({
      query: input.query || '(all recent)',
      lookback_days: days,
      count: reflections.length,
      reflections,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED: Google Service Account Auth
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getGoogleAccessToken(
  credentials: { client_email: string; private_key: string },
  subject: string,
  scopes: string[]
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: credentials.client_email,
    sub: subject,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url')

  const signInput = `${header}.${payload}`

  const crypto = await import('crypto')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signInput)
  const signature = sign.sign(credentials.private_key, 'base64url')

  const jwt = `${signInput}.${signature}`

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenResponse.ok) {
    throw new Error(`Google auth error: ${tokenResponse.status}`)
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COST TRACKING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PRICING: Record<string, { input: number; output: number }> = {
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-opus-4-5-20251101': { input: 15.00, output: 75.00 },
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model]
  if (!pricing) return 0
  return (
    (inputTokens * pricing.input) / 1_000_000 +
    (outputTokens * pricing.output) / 1_000_000
  )
}

export async function logAgentUsage(params: {
  model: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  toolCalls: number
}) {
  const cost = calculateCost(params.model, params.inputTokens, params.outputTokens)
  const pricing = PRICING[params.model]

  try {
    await supabase.from('api_usage').insert({
      provider: 'anthropic',
      model: params.model,
      endpoint: 'chat',
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      estimated_cost: cost,
      input_cost: pricing
        ? (params.inputTokens * pricing.input) / 1_000_000
        : 0,
      output_cost: pricing
        ? (params.outputTokens * pricing.output) / 1_000_000
        : 0,
      script_name: 'agent-chat',
      agent_id: 'agent-chat',
      operation: 'chat',
      latency_ms: params.latencyMs,
      response_status: 200,
    })
  } catch (err) {
    console.error('Failed to log agent usage:', (err as Error).message)
  }

  return cost
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

// TOOL: save_writing_draft
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSaveWritingDraft(input: {
  title: string
  content: string
  append?: boolean
  project?: string
  tags?: string[]
}): Promise<string> {
  const { title, content, append, project, tags } = input

  const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
  if (!token) {
    return JSON.stringify({ error: 'GITHUB_PAT or GITHUB_TOKEN not configured' })
  }

  const owner = 'Acurioustractor'
  const repo = 'act-global-infrastructure'
  const branch = 'main'

  // Generate filename from title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
  const date = getBrisbaneDate()
  const filename = `${date}-${slug}.md`
  const filepath = `thoughts/writing/drafts/${filename}`

  // Build markdown content
  const now = getBrisbaneNow().toISOString()
  const projectLine = project ? `\nproject: "${project}"` : ''
  const tagLine = tags?.length ? `\ntags: [${tags.map(t => `"${t}"`).join(', ')}]` : ''

  let fileContent: string
  let commitMessage: string
  let sha: string | undefined

  if (append) {
    // Try to find existing file by slug (any date prefix)
    try {
      const searchRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/thoughts/writing/drafts`,
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      )
      if (searchRes.ok) {
        const files = await searchRes.json()
        const match = files.find((f: { name: string }) => f.name.endsWith(`${slug}.md`))
        if (match) {
          const fileRes = await fetch(match.url, {
            headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
          })
          if (fileRes.ok) {
            const fileData = await fileRes.json()
            sha = fileData.sha
            const existing = Buffer.from(fileData.content, 'base64').toString('utf-8')
            fileContent = `${existing}\n\n---\n\n*Appended ${now}*\n\n${content}`
            commitMessage = `writing: append to "${title}"`
          } else {
            fileContent = buildNewDraft(title, content, now, projectLine, tagLine)
            commitMessage = `writing: new draft "${title}"`
          }
        } else {
          fileContent = buildNewDraft(title, content, now, projectLine, tagLine)
          commitMessage = `writing: new draft "${title}"`
        }
      } else {
        fileContent = buildNewDraft(title, content, now, projectLine, tagLine)
        commitMessage = `writing: new draft "${title}"`
      }
    } catch {
      fileContent = buildNewDraft(title, content, now, projectLine, tagLine)
      commitMessage = `writing: new draft "${title}"`
    }
  } else {
    fileContent = buildNewDraft(title, content, now, projectLine, tagLine)
    commitMessage = `writing: new draft "${title}"`
    // Check if file already exists — need SHA for overwrites
    try {
      const existRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}`,
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      )
      if (existRes.ok) {
        const existData = await existRes.json()
        sha = existData.sha
      }
    } catch {
      // File doesn't exist yet, no SHA needed
    }
  }

  // Commit via GitHub API
  try {
    const body: Record<string, unknown> = {
      message: commitMessage,
      content: Buffer.from(fileContent).toString('base64'),
      branch,
    }
    if (sha) body.sha = sha

    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!putRes.ok) {
      const err = await putRes.text()
      return JSON.stringify({ error: `GitHub API error: ${putRes.status} ${err}` })
    }

    const result = await putRes.json()
    return JSON.stringify({
      saved: true,
      path: filepath,
      url: result.content?.html_url,
      message: `Draft "${title}" saved to ${filepath} and pushed to git. Pull on your laptop to start editing.`,
    })
  } catch (err) {
    return JSON.stringify({ error: `Failed to save draft: ${(err as Error).message}` })
  }
}

function buildNewDraft(title: string, content: string, created: string, projectLine: string, tagLine: string): string {
  return `---
title: "${title}"
created: ${created}
status: draft${projectLine}${tagLine}
---

# ${title}

${content}
`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: save_planning_doc
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSavePlanningDoc(input: {
  horizon: string
  title: string
  content: string
  append?: boolean
  project?: string
}): Promise<string> {
  const { horizon, title, content, append, project } = input

  const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
  if (!token) {
    return JSON.stringify({ error: 'GITHUB_PAT or GITHUB_TOKEN not configured' })
  }

  const validHorizons = ['daily', 'weekly', 'yearly', 'decade']
  if (!validHorizons.includes(horizon)) {
    return JSON.stringify({ error: `Invalid horizon "${horizon}". Use: ${validHorizons.join(', ')}` })
  }

  const owner = 'Acurioustractor'
  const repo = 'act-global-infrastructure'
  const branch = 'main'

  // Generate filename
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
  const date = getBrisbaneDate()
  const filename = `${date}-${slug}.md`
  const filepath = `thoughts/planning/${horizon}/${filename}`

  // Build frontmatter
  const now = getBrisbaneNow().toISOString()
  const projectLine = project ? `\nproject: "${project}"` : ''
  const horizonTemplates: Record<string, string> = {
    daily: 'type: daily-plan\nreview_cadence: daily',
    weekly: 'type: weekly-plan\nreview_cadence: weekly',
    yearly: 'type: yearly-goals\nreview_cadence: quarterly',
    decade: 'type: decade-vision\nreview_cadence: yearly',
  }

  let fileContent: string
  let commitMessage: string
  let sha: string | undefined

  if (append) {
    // Try to find existing file by slug
    try {
      const searchRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/thoughts/planning/${horizon}`,
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      )
      if (searchRes.ok) {
        const files = await searchRes.json()
        const match = (files as { name: string; url: string }[]).find((f) => f.name.endsWith(`${slug}.md`))
        if (match) {
          const fileRes = await fetch(match.url, {
            headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
          })
          if (fileRes.ok) {
            const fileData = await fileRes.json()
            sha = fileData.sha
            const existing = Buffer.from(fileData.content, 'base64').toString('utf-8')
            fileContent = `${existing}\n\n---\n\n*Updated ${now}*\n\n${content}`
            commitMessage = `planning(${horizon}): update "${title}"`
          } else {
            fileContent = buildPlanningDoc(title, content, now, horizon, horizonTemplates[horizon], projectLine)
            commitMessage = `planning(${horizon}): new "${title}"`
          }
        } else {
          fileContent = buildPlanningDoc(title, content, now, horizon, horizonTemplates[horizon], projectLine)
          commitMessage = `planning(${horizon}): new "${title}"`
        }
      } else {
        fileContent = buildPlanningDoc(title, content, now, horizon, horizonTemplates[horizon], projectLine)
        commitMessage = `planning(${horizon}): new "${title}"`
      }
    } catch {
      fileContent = buildPlanningDoc(title, content, now, horizon, horizonTemplates[horizon], projectLine)
      commitMessage = `planning(${horizon}): new "${title}"`
    }
  } else {
    fileContent = buildPlanningDoc(title, content, now, horizon, horizonTemplates[horizon], projectLine)
    commitMessage = `planning(${horizon}): new "${title}"`
    // Check if file already exists to get SHA (avoids 422 conflict)
    try {
      const existRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}?ref=${branch}`,
        { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
      )
      if (existRes.ok) {
        const existData = await existRes.json()
        sha = existData.sha
        commitMessage = `planning(${horizon}): overwrite "${title}"`
      }
    } catch { /* new file, no sha needed */ }
  }

  // Commit via GitHub API
  try {
    const body: Record<string, unknown> = {
      message: commitMessage,
      content: Buffer.from(fileContent).toString('base64'),
      branch,
    }
    if (sha) body.sha = sha

    const putRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!putRes.ok) {
      const err = await putRes.text()
      return JSON.stringify({ error: `GitHub API error: ${putRes.status} ${err}` })
    }

    const result = await putRes.json()
    return JSON.stringify({
      saved: true,
      horizon,
      path: filepath,
      url: result.content?.html_url,
      message: `${horizon} plan "${title}" saved to ${filepath}. Syncs to Obsidian within 60 seconds.`,
    })
  } catch (err) {
    return JSON.stringify({ error: `Failed to save planning doc: ${(err as Error).message}` })
  }
}

function buildPlanningDoc(title: string, content: string, created: string, horizon: string, typeBlock: string, projectLine: string): string {
  return `---
title: "${title}"
created: ${created}
${typeBlock}
status: active${projectLine}
---

# ${title}

${content}
`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: move_writing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeMoveWriting(input: {
  title_search?: string
  from_stage?: string
  to_stage: string
}): Promise<string> {
  const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
  if (!token) return JSON.stringify({ error: 'GITHUB_PAT or GITHUB_TOKEN not configured' })

  const owner = 'Acurioustractor'
  const repo = 'act-global-infrastructure'
  const branch = 'main'
  const fromStage = input.from_stage || 'drafts'
  const toStage = input.to_stage
  const basePath = 'thoughts/writing'

  if (fromStage === toStage) return JSON.stringify({ error: 'from_stage and to_stage must be different' })

  // List files in the source stage
  const listRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${basePath}/${fromStage}?ref=${branch}`,
    { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
  )

  if (!listRes.ok) return JSON.stringify({ error: `Could not list ${fromStage}: ${listRes.status}` })

  const files = (await listRes.json()) as Array<{ name: string; path: string; sha: string; download_url: string }>
  const mdFiles = files.filter((f) => f.name.endsWith('.md'))

  if (!input.title_search) {
    return JSON.stringify({
      stage: fromStage,
      files: mdFiles.map((f) => f.name),
      hint: 'Provide a title_search to move a specific piece.',
    })
  }

  const search = input.title_search.toLowerCase()
  const match = mdFiles.find((f) => f.name.toLowerCase().includes(search))
  if (!match) {
    return JSON.stringify({
      error: `No file matching "${input.title_search}" in ${fromStage}/`,
      available: mdFiles.map((f) => f.name),
    })
  }

  // Read the file content
  const fileRes = await fetch(match.download_url)
  if (!fileRes.ok) return JSON.stringify({ error: `Could not read ${match.name}` })
  const content = await fileRes.text()

  // Update frontmatter status
  const updatedContent = content.replace(
    /^(status:\s*).*$/m,
    `$1${toStage === 'published' ? 'published' : toStage === 'in-progress' ? 'in-progress' : 'draft'}`
  )

  // Create file in target stage
  const newPath = `${basePath}/${toStage}/${match.name}`
  const createRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${newPath}`,
    {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `writing: move "${match.name}" from ${fromStage} to ${toStage}`,
        content: Buffer.from(updatedContent).toString('base64'),
        branch,
      }),
    }
  )
  if (!createRes.ok) {
    const err = await createRes.text()
    return JSON.stringify({ error: `Failed to create in ${toStage}: ${err}` })
  }

  // Delete from source stage
  const deleteRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${match.path}`,
    {
      method: 'DELETE',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `writing: remove "${match.name}" from ${fromStage} (moved to ${toStage})`,
        sha: match.sha,
        branch,
      }),
    }
  )
  if (!deleteRes.ok) {
    return JSON.stringify({ moved_to: newPath, warning: 'File created in target but failed to delete from source — may be duplicated.' })
  }

  return JSON.stringify({
    moved: true,
    file: match.name,
    from: `${basePath}/${fromStage}/`,
    to: `${basePath}/${toStage}/`,
    message: `Moved "${match.name}" from ${fromStage} → ${toStage}. Syncs to Obsidian within 60 seconds.`,
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: review_planning_period
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeReviewPlanningPeriod(input: {
  period: string
  date?: string
}): Promise<string> {
  const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
  if (!token) return JSON.stringify({ error: 'GITHUB_PAT or GITHUB_TOKEN not configured' })

  const owner = 'Acurioustractor'
  const repo = 'act-global-infrastructure'
  const branch = 'main'

  const refDate = input.date ? new Date(input.date) : getBrisbaneNow()

  // Determine which folder to read and date range
  let folder: string
  let startDate: Date
  let endDate: Date

  if (input.period === 'week') {
    folder = 'thoughts/planning/daily'
    // Get Monday of the week
    const day = refDate.getDay()
    const monday = new Date(refDate)
    monday.setDate(refDate.getDate() - (day === 0 ? 6 : day - 1))
    startDate = monday
    endDate = new Date(monday)
    endDate.setDate(monday.getDate() + 6)
  } else if (input.period === 'month') {
    folder = 'thoughts/planning/weekly'
    startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1)
    endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0)
  } else if (input.period === 'year') {
    folder = 'thoughts/reviews/monthly'
    startDate = new Date(refDate.getFullYear(), 0, 1)
    endDate = new Date(refDate.getFullYear(), 11, 31)
  } else {
    return JSON.stringify({ error: 'Invalid period. Use: week, month, year' })
  }

  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  // List files in the folder
  const listRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${folder}?ref=${branch}`,
    { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
  )

  if (!listRes.ok) {
    return JSON.stringify({
      period: input.period,
      range: `${startStr} to ${endStr}`,
      documents: [],
      message: `No ${input.period === 'week' ? 'daily' : input.period === 'month' ? 'weekly' : 'monthly'} plans found yet. Start by saving some!`,
    })
  }

  const files = (await listRes.json()) as Array<{ name: string; download_url: string }>
  const mdFiles = files.filter((f) => f.name.endsWith('.md'))

  // Filter files by date range (files are named YYYY-MM-DD-slug.md)
  const dateRegex = /^(\d{4}-\d{2}-\d{2})/
  const inRange = mdFiles.filter((f) => {
    const match = f.name.match(dateRegex)
    if (!match) return false
    return match[1] >= startStr && match[1] <= endStr
  })

  // Read contents of matching files
  const contents: Array<{ name: string; date: string; content: string }> = []
  for (const file of inRange.slice(0, 15)) {
    try {
      const res = await fetch(file.download_url)
      if (res.ok) {
        const text = await res.text()
        const dateMatch = file.name.match(dateRegex)
        contents.push({
          name: file.name,
          date: dateMatch ? dateMatch[1] : 'unknown',
          content: text.slice(0, 2000), // Cap per doc to manage tokens
        })
      }
    } catch { /* skip failed reads */ }
  }

  return JSON.stringify({
    period: input.period,
    range: `${startStr} to ${endStr}`,
    document_count: contents.length,
    documents: contents,
    instruction: `Synthesize these ${contents.length} ${input.period === 'week' ? 'daily' : input.period === 'month' ? 'weekly' : 'monthly'} plans into a ${input.period}ly review. Highlight: what was accomplished, what rolled over, themes, and intentions for next ${input.period}.`,
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: moon_cycle_review
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeMoonCycleReview(input: {
  month?: string
  focus?: string
}): Promise<string> {
  const now = getBrisbaneNow()
  const monthStr = input.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [yearNum, monthNum] = monthStr.split('-').map(Number)
  const startDate = `${monthStr}-01`
  const endDate = new Date(yearNum, monthNum, 0).toISOString().split('T')[0]
  const focus = input.focus || 'full'

  const sections: Record<string, unknown> = {
    month: monthStr,
    period: `${startDate} to ${endDate}`,
  }

  // Financial health
  if (focus === 'full' || focus === 'financial') {
    const [income, expenses, outstanding, subs] = await Promise.all([
      supabase
        .from('xero_invoices')
        .select('total')
        .eq('type', 'ACCREC')
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('xero_invoices')
        .select('total')
        .eq('type', 'ACCPAY')
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('xero_invoices')
        .select('amount_due')
        .gt('amount_due', 0)
        .in('status', ['AUTHORISED', 'SENT']),
      supabase
        .from('subscriptions')
        .select('amount_aud, billing_cycle')
        .eq('status', 'active'),
    ])

    const totalIncome = (income.data || []).reduce((s, i) => s + (parseFloat(String(i.total)) || 0), 0)
    const totalExpenses = (expenses.data || []).reduce((s, i) => s + (parseFloat(String(i.total)) || 0), 0)
    const totalOutstanding = (outstanding.data || []).reduce((s, i) => s + (parseFloat(String(i.amount_due)) || 0), 0)
    let monthlySubBurn = 0
    for (const sub of subs.data || []) {
      const amt = parseFloat(String(sub.amount_aud)) || 0
      if (sub.billing_cycle === 'monthly') monthlySubBurn += amt
      else if (sub.billing_cycle === 'yearly') monthlySubBurn += amt / 12
      else if (sub.billing_cycle === 'quarterly') monthlySubBurn += amt / 3
    }

    sections.financial = {
      income: Math.round(totalIncome * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      net: Math.round((totalIncome - totalExpenses) * 100) / 100,
      outstanding: Math.round(totalOutstanding * 100) / 100,
      subscription_burn: Math.round(monthlySubBurn * 100) / 100,
    }
  }

  // Relationship health
  if (focus === 'full' || focus === 'relationships') {
    const [activeContacts, staleContacts, recentComms] = await Promise.all([
      supabase
        .from('ghl_contacts')
        .select('id')
        .in('engagement_status', ['active', 'prospect']),
      supabase
        .from('ghl_contacts')
        .select('full_name, company_name, last_contact_date')
        .in('engagement_status', ['active', 'prospect'])
        .lt('last_contact_date', new Date(now.getTime() - 30 * 86400000).toISOString())
        .order('last_contact_date', { ascending: true })
        .limit(10),
      supabase
        .from('communications')
        .select('id')
        .gte('created_at', startDate)
        .lte('created_at', endDate),
    ])

    sections.relationships = {
      active_contacts: (activeContacts.data || []).length,
      going_cold: (staleContacts.data || []).length,
      coldest: (staleContacts.data || []).slice(0, 5).map((c) => ({
        name: c.full_name,
        company: c.company_name,
        last_contact: c.last_contact_date,
      })),
      communications_this_month: (recentComms.data || []).length,
    }
  }

  // Project health
  if (focus === 'full' || focus === 'projects') {
    const [projectActivity, recentKnowledge] = await Promise.all([
      supabase
        .from('project_knowledge')
        .select('project_code')
        .gte('recorded_at', startDate)
        .lte('recorded_at', endDate),
      supabase
        .from('project_knowledge')
        .select('project_code, title, knowledge_type')
        .gte('recorded_at', startDate)
        .order('recorded_at', { ascending: false })
        .limit(20),
    ])

    const counts: Record<string, number> = {}
    for (const row of projectActivity.data || []) {
      counts[row.project_code] = (counts[row.project_code] || 0) + 1
    }

    sections.projects = {
      activity_by_project: Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([code, count]) => ({ code, activity: count })),
      recent_highlights: (recentKnowledge.data || []).slice(0, 10).map((k) => ({
        project: k.project_code,
        title: k.title,
        type: k.knowledge_type,
      })),
    }
  }

  // Wellbeing — reflections summary
  if (focus === 'full' || focus === 'wellbeing') {
    const reflections = await supabase
      .from('daily_reflections')
      .select('date, gratitude, challenges, learnings, lcaa_listen, lcaa_art')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .limit(31)

    const refData = reflections.data || []
    sections.wellbeing = {
      reflections_logged: refData.length,
      themes: {
        gratitude_samples: refData.slice(0, 3).map((r) => r.gratitude).filter(Boolean),
        challenge_samples: refData.slice(0, 3).map((r) => r.challenges).filter(Boolean),
        learning_samples: refData.slice(0, 3).map((r) => r.learnings).filter(Boolean),
      },
    }
  }

  sections.instruction = `You have the month's data. Write a reflective moon cycle review with the user. Cover: what grew, what needs attention, what to release, and intentions for next month. Use a warm, spacious tone — this is reflection, not reporting. Save the final piece using save_planning_doc with horizon "monthly" or save_writing_draft.`

  return JSON.stringify(sections)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_goods_intelligence
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetGoodsIntelligence(input: { focus: string }): Promise<string> {
  const { focus } = input

  if (focus === 'newsletter_plan') {
    // Get unused/least-used content
    const { data: content } = await supabase
      .from('goods_content_library')
      .select('*')
      .not('analyzed_at', 'is', null)
      .order('times_used_newsletter', { ascending: true })
      .order('published_at', { ascending: false })
      .limit(8)

    // Get audience breakdown
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('tags, newsletter_consent')
      .contains('tags', ['goods'])

    const c = contacts || []
    const subscribers = c.filter(x => x.newsletter_consent && x.tags?.includes('goods-newsletter')).length
    const funders = c.filter(x => x.tags?.includes('goods-funder')).length
    const partners = c.filter(x => x.tags?.includes('goods-partner')).length
    const community = c.filter(x => x.tags?.includes('goods-community')).length
    const supporters = c.filter(x => x.tags?.includes('goods-supporter')).length

    const stories = (content || []).filter(c => c.content_type === 'story')
    const articles = (content || []).filter(c => c.content_type === 'article')
    const featured = stories[0] || (content || [])[0]

    let result = `## Newsletter Plan\n\n`
    result += `**Audience:** ${subscribers} newsletter subscribers (${funders} funders, ${partners} partners, ${community} community, ${supporters} supporters)\n\n`

    if (featured) {
      result += `### Recommended Featured Story\n`
      result += `**"${featured.title}"** (${featured.content_type})\n`
      if (featured.storyteller_name) result += `By ${featured.storyteller_name}\n`
      result += `${featured.key_message || featured.excerpt || ''}\n`
      result += `Tone: ${featured.emotional_tone || 'N/A'} | Topics: ${(featured.topics || []).join(', ')}\n`
      result += `Used in newsletters: ${featured.times_used_newsletter} times\n\n`
    }

    if (content && content.length > 1) {
      result += `### More Content Available\n`
      for (const item of content.slice(1, 5)) {
        result += `- **"${item.title}"** (${item.content_type}) — ${item.key_message || item.excerpt?.substring(0, 100) || 'No summary'}\n`
      }
      result += `\n`
    }

    result += `### Suggested Approach\n`
    if (funders > 0 && stories.length > 0) {
      result += `- Lead with "${featured?.title}" — impact stories resonate with funders\n`
    }
    if (articles.length > 0) {
      result += `- Include an article for depth: "${articles[0].title}"\n`
    }
    result += `- Build and send the newsletter in GHL (Marketing → Email Templates)\n`
    result += `- Filter by tag: goods-newsletter\n`
    result += `- Run \`node scripts/prepare-goods-newsletter.mjs\` for AI-generated copy suggestions\n`

    return result

  } else if (focus === 'outreach') {
    // Get contacts needing attention
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('id, full_name, first_name, last_name, email, tags, last_contact_date, created_at')
      .contains('tags', ['goods'])
      .order('last_contact_date', { ascending: true, nullsFirst: true })
      .limit(50)

    // Get content for pairing
    const { data: content } = await supabase
      .from('goods_content_library')
      .select('title, content_type, key_message, audience_fit, url')
      .not('analyzed_at', 'is', null)
      .order('times_used_newsletter', { ascending: true })
      .limit(10)

    const now = new Date()
    let result = `## Outreach Recommendations\n\n`
    const recs: { name: string; email: string | null; reason: string; priority: string; content: string }[] = []

    for (const contact of contacts || []) {
      const name = contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown'
      const daysSinceContact = contact.last_contact_date
        ? Math.floor((now.getTime() - new Date(contact.last_contact_date).getTime()) / 86400000)
        : null

      let reason = ''
      let priority = 'low'

      if (daysSinceContact === null) {
        reason = 'Never contacted — introduce Goods'
        priority = 'high'
      } else if (daysSinceContact > 60) {
        reason = `No contact in ${daysSinceContact} days`
        priority = 'high'
      } else if (daysSinceContact > 30) {
        reason = `${daysSinceContact} days since last contact`
        priority = 'medium'
      } else {
        continue
      }

      // Match content to contact segment
      const tags = contact.tags || []
      let suggestedContent = ''
      if (content && content.length > 0) {
        const segment = tags.includes('goods-funder') ? 'funders'
          : tags.includes('goods-partner') ? 'partners'
          : tags.includes('goods-community') ? 'community'
          : 'supporters'

        const match = content.find(c => c.audience_fit?.includes(segment)) || content[0]
        suggestedContent = `Share: "${match.title}" — ${match.key_message || ''}`
      }

      recs.push({ name, email: contact.email, reason, priority, content: suggestedContent })
    }

    // Sort by priority
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
    recs.sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2))

    const top = recs.slice(0, 10)
    for (const r of top) {
      result += `**${r.name}** (${r.priority} priority)\n`
      result += `${r.reason}${r.email ? ` | ${r.email}` : ''}\n`
      if (r.content) result += `→ ${r.content}\n`
      result += `\n`
    }

    result += `*${recs.length} contacts need attention total. Showing top 10.*\n`
    return result

  } else if (focus === 'content_ideas') {
    // Check what topics are covered vs gaps
    const { data: content } = await supabase
      .from('goods_content_library')
      .select('topics, impact_themes, audience_fit, content_type')
      .not('analyzed_at', 'is', null)

    // Count topic frequency
    const topicCounts: Record<string, number> = {}
    const audienceCounts: Record<string, number> = {}
    for (const item of content || []) {
      for (const t of item.topics || []) topicCounts[t] = (topicCounts[t] || 0) + 1
      for (const a of item.audience_fit || []) audienceCounts[a] = (audienceCounts[a] || 0) + 1
    }

    // Get contact segments for gap analysis
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('tags')
      .contains('tags', ['goods'])

    const c = contacts || []
    const segmentSizes: Record<string, number> = {
      funders: c.filter(x => x.tags?.includes('goods-funder')).length,
      partners: c.filter(x => x.tags?.includes('goods-partner')).length,
      community: c.filter(x => x.tags?.includes('goods-community')).length,
      supporters: c.filter(x => x.tags?.includes('goods-supporter')).length,
      storytellers: c.filter(x => x.tags?.includes('goods-storyteller')).length,
    }

    let result = `## Content Ideas & Gaps\n\n`

    result += `### Topic Coverage\n`
    const sortedTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])
    for (const [topic, count] of sortedTopics.slice(0, 8)) {
      result += `- ${topic}: ${count} pieces\n`
    }

    result += `\n### Audience Content Gap Analysis\n`
    const allSegments = ['funders', 'partners', 'community', 'media', 'government', 'storytellers', 'supporters']
    for (const seg of allSegments) {
      const contentCount = audienceCounts[seg] || 0
      const contactCount = segmentSizes[seg] || 0
      const ratio = contactCount > 0 ? (contentCount / contactCount).toFixed(1) : 'N/A'
      const gap = contactCount > 0 && contentCount < 2 ? ' ⚠️ UNDERSERVED' : ''
      result += `- **${seg}**: ${contentCount} content pieces for ${contactCount} contacts (ratio: ${ratio})${gap}\n`
    }

    result += `\n### Suggested Content Angles\n`
    // Identify underserved segments
    for (const [seg, count] of Object.entries(segmentSizes)) {
      if (count > 5 && (audienceCounts[seg] || 0) < 2) {
        result += `- You have ${count} ${seg} but very little content targeted at them. Consider a ${seg === 'funders' ? 'impact report or economic outcomes story' : seg === 'partners' ? 'collaboration spotlight or partnership update' : 'community update or participation story'}.\n`
      }
    }

    const underrepresented = ['food-sovereignty', 'youth-programs', 'circular-economy', 'regenerative-agriculture']
      .filter(t => !topicCounts[t] || topicCounts[t] < 2)
    if (underrepresented.length > 0) {
      result += `- Underrepresented topics to explore: ${underrepresented.join(', ')}\n`
    }

    return result

  } else {
    // overview
    const { data: contacts } = await supabase
      .from('ghl_contacts')
      .select('tags, newsletter_consent, last_contact_date')
      .contains('tags', ['goods'])

    const { data: content } = await supabase
      .from('goods_content_library')
      .select('id, times_used_newsletter, analyzed_at')

    const { data: recentComms } = await supabase
      .from('communications_history')
      .select('id')
      .contains('project_codes', ['GOODS'])
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

    const c = contacts || []
    const now = new Date()

    let result = `## Goods on Country Overview\n\n`
    result += `### Contacts\n`
    result += `- Total: ${c.length}\n`
    result += `- Newsletter subscribers: ${c.filter(x => x.newsletter_consent && x.tags?.includes('goods-newsletter')).length}\n`
    result += `- Funders: ${c.filter(x => x.tags?.includes('goods-funder')).length}\n`
    result += `- Partners: ${c.filter(x => x.tags?.includes('goods-partner')).length}\n`
    result += `- Community: ${c.filter(x => x.tags?.includes('goods-community')).length}\n`
    result += `- Supporters: ${c.filter(x => x.tags?.includes('goods-supporter')).length}\n`
    result += `- Storytellers: ${c.filter(x => x.tags?.includes('goods-storyteller')).length}\n`
    result += `- Needing attention (>30 days): ${c.filter(x => {
      if (!x.last_contact_date) return true
      return (now.getTime() - new Date(x.last_contact_date).getTime()) / 86400000 > 30
    }).length}\n`

    result += `\n### Content Library\n`
    const ct = content || []
    result += `- Total items: ${ct.length}\n`
    result += `- Analyzed: ${ct.filter(x => x.analyzed_at).length}\n`
    result += `- Unused in newsletters: ${ct.filter(x => !x.times_used_newsletter).length}\n`

    result += `\n### Recent Activity\n`
    result += `- Communications (30 days): ${recentComms?.length || 0}\n`

    result += `\n### Quick Actions\n`
    result += `- "Plan the next Goods newsletter" → newsletter_plan focus\n`
    result += `- "Who should I reach out to for Goods?" → outreach focus\n`
    result += `- "What content should we create for Goods?" → content_ideas focus\n`

    return result
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: search_emails
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSearchEmails(input: {
  query: string
  mailbox?: string
  limit?: number
}): Promise<string> {
  const { query, mailbox = 'benjamin@act.place', limit = 10 } = input

  try {
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    if (!keyJson) {
      return JSON.stringify({ error: 'GOOGLE_SERVICE_ACCOUNT_KEY not configured' })
    }

    const credentials = JSON.parse(keyJson)
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      subject: mailbox,
    })

    await auth.authorize()
    const gmail = google.gmail({ version: 'v1', auth })

    // Search messages
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: Math.min(limit, 20),
    })

    const messageIds = listRes.data.messages || []
    if (messageIds.length === 0) {
      return JSON.stringify({ mailbox, query, results: [], message: 'No emails found matching query.' })
    }

    // Fetch details for each message (headers only for speed)
    const emails = await Promise.all(
      messageIds.slice(0, limit).map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        })

        const headers = detail.data.payload?.headers || []
        const getHeader = (name: string) => headers.find(h => h.name === name)?.value || ''

        return {
          id: msg.id,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          snippet: detail.data.snippet || '',
        }
      })
    )

    return JSON.stringify({
      mailbox,
      query,
      count: emails.length,
      total_matches: listRes.data.resultSizeEstimate || emails.length,
      results: emails,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_cashflow_forecast
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetCashflowForecast(input: {
  months_ahead?: number
}): Promise<string> {
  const monthsAhead = input.months_ahead || 6

  try {
    // Fetch historical snapshots, current month transactions, and upcoming invoices in parallel
    const now = getBrisbaneNow()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const [snapshotsRes, txRes, invoicesRes, scenariosRes] = await Promise.all([
      supabase
        .from('financial_snapshots')
        .select('month, income, expenses, net, closing_balance, is_projection, confidence')
        .eq('is_projection', false)
        .order('month', { ascending: true })
        .limit(24),
      supabase
        .from('xero_transactions')
        .select('total, type')
        .gte('date', monthStart)
        .lte('date', monthEnd),
      supabase
        .from('xero_invoices')
        .select('total, amount_due, type, due_date')
        .gt('amount_due', 0)
        .in('status', ['AUTHORISED', 'SUBMITTED']),
      supabase
        .from('cashflow_scenarios')
        .select('name, description, adjustments')
        .eq('is_active', true),
    ])

    const snapshots = snapshotsRes.data || []
    const transactions = txRes.data || []
    const invoices = invoicesRes.data || []

    // Current month actuals
    let monthIncome = 0
    let monthExpenses = 0
    for (const tx of transactions) {
      if (tx.type === 'RECEIVE') monthIncome += Math.abs(tx.total || 0)
      else if (tx.type === 'SPEND') monthExpenses += Math.abs(tx.total || 0)
    }

    // Outstanding invoices
    let receivables = 0
    let payables = 0
    for (const inv of invoices) {
      const amt = Math.abs(inv.amount_due || 0)
      if (inv.type === 'ACCREC') receivables += amt
      else if (inv.type === 'ACCPAY') payables += amt
    }

    // Calculate averages from last 6 months of snapshots
    const recent = snapshots.slice(-6)
    const avgIncome = recent.length > 0 ? recent.reduce((s, r) => s + Number(r.income || 0), 0) / recent.length : 0
    const avgExpenses = recent.length > 0 ? recent.reduce((s, r) => s + Number(r.expenses || 0), 0) / recent.length : 0
    const lastBalance = snapshots.length > 0 ? Number(snapshots[snapshots.length - 1].closing_balance || 0) : 0

    // Generate projection
    const projections: Array<{ month: string; income: number; expenses: number; balance: number; confidence: number }> = []
    let balance = lastBalance + (monthIncome - monthExpenses)
    for (let i = 1; i <= monthsAhead; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const monthNet = avgIncome - avgExpenses
      balance += monthNet
      projections.push({
        month: d.toISOString().slice(0, 7),
        income: Math.round(avgIncome),
        expenses: Math.round(avgExpenses),
        balance: Math.round(balance),
        confidence: Math.max(0.5, 1 - i * 0.08),
      })
    }

    // Metrics
    const burnRate = Math.max(0, Math.round(avgExpenses - avgIncome))
    const runway = burnRate > 0 ? Math.round((balance / burnRate) * 10) / 10 : null

    return JSON.stringify({
      current_month: {
        period: now.toISOString().slice(0, 7),
        income: Math.round(monthIncome),
        expenses: Math.round(monthExpenses),
        net: Math.round(monthIncome - monthExpenses),
      },
      outstanding: {
        receivables: Math.round(receivables),
        payables: Math.round(payables),
        net: Math.round(receivables - payables),
      },
      metrics: {
        avg_monthly_income: Math.round(avgIncome),
        avg_monthly_expenses: Math.round(avgExpenses),
        burn_rate: burnRate,
        estimated_balance: Math.round(balance),
        runway_months: runway,
      },
      projections,
      scenarios: scenariosRes.data || [],
      history_months: snapshots.length,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_project_health
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetProjectHealth(input: {
  project_code?: string
}): Promise<string> {
  const { project_code } = input

  try {
    // Load project codes config
    const allProjects: Record<string, any> = await loadProjectCodes()

    const codes = project_code
      ? [project_code.toUpperCase()]
      : Object.keys(allProjects).filter(k => allProjects[k]?.status === 'active')

    // Fetch data across all dimensions in parallel
    const [knowledgeRes, financialsRes, commsRes, actionsRes] = await Promise.all([
      supabase
        .from('project_knowledge')
        .select('project_code, recorded_at, knowledge_type')
        .in('project_code', codes)
        .order('recorded_at', { ascending: false })
        .limit(500),
      supabase
        .from('v_project_financials')
        .select('*')
        .in('project_code', codes),
      supabase
        .from('communications_history')
        .select('project_codes, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
        .limit(1000),
      supabase
        .from('project_knowledge')
        .select('project_code, title, recorded_at')
        .in('project_code', codes)
        .eq('knowledge_type', 'action')
        .eq('action_required', true)
        .limit(200),
    ])

    const knowledge = knowledgeRes.data || []
    const financials = financialsRes.data || []
    const comms = commsRes.data || []
    const actions = actionsRes.data || []

    // Build per-project health
    const results = codes.map(code => {
      const proj = allProjects[code]
      const projKnowledge = knowledge.filter(k => k.project_code === code)
      const projFinancials = financials.find(f => f.project_code === code)
      const projComms = comms.filter(c => c.project_codes?.includes(code))
      const projActions = actions.filter(a => a.project_code === code)

      const lastActivity = projKnowledge.length > 0
        ? projKnowledge[0].recorded_at
        : null
      const daysSinceActivity = lastActivity
        ? Math.round((Date.now() - new Date(lastActivity).getTime()) / 86400000)
        : null

      return {
        code,
        name: proj?.name || code,
        category: proj?.category || 'unknown',
        priority: proj?.priority || 'normal',
        last_activity: lastActivity,
        days_since_activity: daysSinceActivity,
        knowledge_entries: projKnowledge.length,
        comms_last_30_days: projComms.length,
        open_actions: projActions.length,
        financials: projFinancials ? {
          total_receivables: projFinancials.total_receivables,
          total_payables: projFinancials.total_payables,
          outstanding_receivables: projFinancials.outstanding_receivables,
          net_position: projFinancials.net_position,
        } : null,
        health: daysSinceActivity === null ? 'unknown'
          : daysSinceActivity <= 7 ? 'active'
          : daysSinceActivity <= 30 ? 'steady'
          : daysSinceActivity <= 90 ? 'stale'
          : 'dormant',
      }
    })

    // Sort: active first, then by days since activity
    results.sort((a, b) => {
      const order = { active: 0, steady: 1, stale: 2, dormant: 3, unknown: 4 }
      const aOrder = order[a.health as keyof typeof order] ?? 4
      const bOrder = order[b.health as keyof typeof order] ?? 4
      return aOrder - bOrder || (a.days_since_activity || 999) - (b.days_since_activity || 999)
    })

    return JSON.stringify({
      total_projects: results.length,
      summary: {
        active: results.filter(r => r.health === 'active').length,
        steady: results.filter(r => r.health === 'steady').length,
        stale: results.filter(r => r.health === 'stale').length,
        dormant: results.filter(r => r.health === 'dormant').length,
      },
      projects: project_code ? results : results.slice(0, 20),
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_upcoming_deadlines
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetUpcomingDeadlines(input: {
  days_ahead?: number
  category?: string
}): Promise<string> {
  const daysAhead = input.days_ahead || 30
  const category = input.category || 'all'
  const cutoff = getBrisbaneDateOffset(daysAhead)
  const today = getBrisbaneDate()

  try {
    const deadlines: Array<{
      type: string
      title: string
      due_date: string
      days_until: number
      status: string
      project_code?: string
      details?: string
    }> = []

    // Grants deadlines
    if (category === 'all' || category === 'grants') {
      const { data: grants } = await supabase
        .from('fundraising_pipeline')
        .select('name, deadline, expected_date, status, project_codes')
        .or(`deadline.lte.${cutoff},expected_date.lte.${cutoff}`)
        .not('status', 'in', '("successful","unsuccessful","cancelled")')

      for (const g of grants || []) {
        const dueDate = g.deadline || g.expected_date
        if (!dueDate) continue
        const daysUntil = Math.round((new Date(dueDate).getTime() - Date.now()) / 86400000)
        deadlines.push({
          type: 'grant',
          title: g.name,
          due_date: dueDate,
          days_until: daysUntil,
          status: daysUntil < 0 ? 'overdue' : daysUntil <= 7 ? 'urgent' : 'upcoming',
          project_code: g.project_codes?.[0],
          details: `Status: ${g.status}`,
        })
      }
    }

    // Compliance deadlines
    if (category === 'all' || category === 'compliance') {
      const { data: compliance } = await supabase
        .from('compliance_items')
        .select('title, next_due, category, status, project_code, responsible')
        .lte('next_due', cutoff)
        .not('status', 'in', '("completed","not-applicable")')

      for (const c of compliance || []) {
        if (!c.next_due) continue
        const daysUntil = Math.round((new Date(c.next_due).getTime() - Date.now()) / 86400000)
        deadlines.push({
          type: 'compliance',
          title: c.title,
          due_date: c.next_due,
          days_until: daysUntil,
          status: daysUntil < 0 ? 'overdue' : daysUntil <= 7 ? 'urgent' : 'upcoming',
          project_code: c.project_code,
          details: `Category: ${c.category}. Responsible: ${c.responsible || 'unassigned'}`,
        })
      }
    }

    // Calendar deadlines (events with "deadline" or "due" in title)
    if (category === 'all' || category === 'calendar') {
      const { data: events } = await supabase
        .from('calendar_events')
        .select('title, start_time, project_code')
        .gte('start_time', `${today}T00:00:00Z`)
        .lte('start_time', `${cutoff}T23:59:59Z`)
        .or('title.ilike.%deadline%,title.ilike.%due%,title.ilike.%submission%,title.ilike.%lodge%')

      for (const e of events || []) {
        const dueDate = e.start_time.split('T')[0]
        const daysUntil = Math.round((new Date(dueDate).getTime() - Date.now()) / 86400000)
        deadlines.push({
          type: 'calendar',
          title: e.title,
          due_date: dueDate,
          days_until: daysUntil,
          status: daysUntil <= 3 ? 'urgent' : 'upcoming',
          project_code: e.project_code,
        })
      }
    }

    // Sort by due date
    deadlines.sort((a, b) => a.days_until - b.days_until)

    return JSON.stringify({
      period: `${today} to ${cutoff}`,
      total: deadlines.length,
      overdue: deadlines.filter(d => d.status === 'overdue').length,
      urgent: deadlines.filter(d => d.status === 'urgent').length,
      deadlines,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: create_meeting_notes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeCreateMeetingNotes(input: {
  title: string
  summary: string
  content: string
  project_code?: string
  participants?: string[]
  action_items?: string[]
  date?: string
}): Promise<string> {
  const {
    title,
    summary,
    content,
    project_code,
    participants = [],
    action_items = [],
    date,
  } = input

  const meetingDate = date || getBrisbaneDate()

  try {
    // Look up project name from code
    let projectName: string | null = null
    if (project_code) {
      const allProjects = await loadProjectCodes()
      projectName = allProjects[project_code.toUpperCase()]?.name || null
    }

    // Build full content with action items
    let fullContent = content
    if (action_items.length > 0) {
      fullContent += '\n\n## Action Items\n'
      for (const item of action_items) {
        fullContent += `- [ ] ${item}\n`
      }
    }

    // Insert into project_knowledge
    const { data, error } = await supabase
      .from('project_knowledge')
      .insert({
        project_code: project_code?.toUpperCase() || null,
        project_name: projectName,
        knowledge_type: 'meeting',
        title,
        content: fullContent,
        summary,
        source_type: 'telegram',
        recorded_by: 'Ben Knight',
        recorded_at: `${meetingDate}T12:00:00Z`,
        participants,
        topics: [],
        importance: 'normal',
        action_required: action_items.length > 0,
      })
      .select('id')
      .single()

    if (error) return JSON.stringify({ error: error.message })

    return JSON.stringify({
      action: 'meeting_notes_saved',
      id: data.id,
      title,
      date: meetingDate,
      project_code: project_code || null,
      participants_count: participants.length,
      action_items_count: action_items.length,
      confirmation: `Meeting notes "${title}" saved for ${meetingDate}${project_code ? ` (${project_code})` : ''}.`,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_project_360
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetProject360(input: { project_code: string }): Promise<string> {
  const { project_code } = input
  try {
    const [summaryRes, activityRes, contactsRes] = await Promise.all([
      supabase.from('v_project_summary').select('*').eq('project_code', project_code).single(),
      supabase.from('v_activity_stream').select('*').eq('project_code', project_code).order('activity_date', { ascending: false }).limit(10),
      supabase.from('ghl_contacts').select('full_name, email, company_name, engagement_status, last_contact_date').contains('tags', [project_code]).limit(5),
    ])

    const summary = summaryRes.data
    const activities = activityRes.data || []
    const contacts = contactsRes.data || []

    // Also try to get contacts via project tag matching from config
    let tagContacts = contacts
    if (contacts.length === 0) {
      try {
        const codes = await loadProjectCodes()
        const project = codes[project_code]
        if (project?.ghl_tags?.[0]) {
          const { data } = await supabase
            .from('ghl_contacts')
            .select('full_name, email, company_name, engagement_status, last_contact_date')
            .contains('tags', [project.ghl_tags[0]])
            .limit(5)
          tagContacts = data || []
        }
      } catch { /* ignore */ }
    }

    return JSON.stringify({
      project_code,
      financial: summary ? {
        revenue: summary.total_income,
        expenses: summary.total_expenses,
        net: summary.net,
        pipeline_value: summary.pipeline_value,
        open_opportunities: summary.open_opportunities,
        outstanding_invoices: summary.outstanding_amount,
        grants_won: summary.grants_won,
        grants_pending: summary.grants_pending,
        subscription_monthly_cost: summary.subscription_monthly_cost,
      } : null,
      health: summary ? {
        score: summary.health_score,
        status: summary.health_status,
        momentum: summary.momentum_score,
        engagement: summary.engagement_score,
        financial: summary.financial_score,
      } : null,
      key_contacts: tagContacts.map((c: any) => ({
        name: c.full_name,
        email: c.email,
        company: c.company_name,
        engagement: c.engagement_status,
        last_contact: c.last_contact_date,
      })),
      recent_activity: activities.map((a: any) => ({
        type: a.activity_type,
        title: a.title,
        date: a.activity_date,
        amount: a.amount,
      })),
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_ecosystem_pulse
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetEcosystemPulse(): Promise<string> {
  try {
    const [projectsRes, bookkeepingRes, nudgesRes, oppsRes] = await Promise.all([
      supabase.from('v_project_summary').select('project_code, project_name, health_score, health_status, total_income, total_expenses, pipeline_value, open_opportunities, email_count'),
      supabase.from('xero_transactions').select('total, type').gte('date', getBrisbaneDateOffset(-30)),
      supabase.from('ghl_contacts').select('full_name, last_contact_date').not('last_contact_date', 'is', null).order('last_contact_date', { ascending: true }).limit(5),
      supabase.from('ghl_opportunities').select('monetary_value, status').eq('status', 'open'),
    ])

    const projects = projectsRes.data || []
    const transactions = bookkeepingRes.data || []
    const staleContacts = nudgesRes.data || []
    const openOpps = oppsRes.data || []

    // Categorize projects by health
    const healthy = projects.filter((p: any) => p.health_status === 'healthy' || (p.health_score && p.health_score >= 60))
    const atRisk = projects.filter((p: any) => p.health_status === 'at_risk' || (p.health_score && p.health_score >= 30 && p.health_score < 60))
    const critical = projects.filter((p: any) => p.health_status === 'critical' || (p.health_score && p.health_score < 30))

    // Cash flow last 30 days
    const income30d = transactions.filter((t: any) => t.type === 'RECEIVE').reduce((s: number, t: any) => s + Math.abs(Number(t.total) || 0), 0)
    const expenses30d = transactions.filter((t: any) => t.type === 'SPEND').reduce((s: number, t: any) => s + Math.abs(Number(t.total) || 0), 0)

    // Pipeline
    const totalPipeline = openOpps.reduce((s: number, o: any) => s + (Number(o.monetary_value) || 0), 0)

    return JSON.stringify({
      projects_overview: {
        total: projects.length,
        healthy: { count: healthy.length, names: healthy.map((p: any) => p.project_code) },
        at_risk: { count: atRisk.length, names: atRisk.map((p: any) => p.project_code) },
        critical: { count: critical.length, names: critical.map((p: any) => p.project_code) },
      },
      financials_30d: {
        income: income30d,
        expenses: expenses30d,
        net: income30d - expenses30d,
      },
      pipeline: {
        total_value: totalPipeline,
        open_deals: openOpps.length,
      },
      contacts_needing_attention: staleContacts.map((c: any) => ({
        name: c.full_name,
        last_contact: c.last_contact_date,
        days_ago: Math.floor((Date.now() - new Date(c.last_contact_date).getTime()) / 86400000),
      })),
      top_projects: projects
        .sort((a: any, b: any) => (b.pipeline_value || 0) - (a.pipeline_value || 0))
        .slice(0, 5)
        .map((p: any) => ({
          code: p.project_code,
          name: p.project_name,
          health: p.health_score,
          revenue: p.total_income,
          pipeline: p.pipeline_value,
        })),
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NOTION WRITE TOOLS — shared helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let _notionDbIdsCache: Record<string, string> | null = null
function loadNotionDbIds(): Record<string, string> {
  if (_notionDbIdsCache) return _notionDbIdsCache
  try {
    const configPath = join(process.cwd(), '..', '..', 'config', 'notion-database-ids.json')
    _notionDbIdsCache = JSON.parse(readFileSync(configPath, 'utf-8'))
    return _notionDbIdsCache!
  } catch {
    return {}
  }
}

function getNotionClient(): NotionClient {
  return new NotionClient({ auth: process.env.NOTION_TOKEN })
}

// Resolve a project_code to its Notion page ID in the Projects database
async function resolveProjectPageId(projectCode: string): Promise<string | null> {
  const dbIds = loadNotionDbIds()
  const projectsDbId = dbIds.actProjects
  if (!projectsDbId || !process.env.NOTION_TOKEN) return null

  try {
    const notion = getNotionClient()
    // Search by title match
    const response = await (notion.databases as any).query({
      database_id: projectsDbId,
      filter: {
        property: 'Name',
        title: { contains: projectCode },
      },
      page_size: 5,
    })
    if (response.results.length > 0) return response.results[0].id
  } catch { /* ignore — relation linking is optional */ }
  return null
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: add_meeting_to_notion
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeAddMeetingToNotion(input: {
  title: string
  date?: string
  project_code?: string
  attendees?: string[]
  notes: string
  decisions?: string[]
  action_items?: string[]
  meeting_type?: string
}): Promise<string> {
  const { title, notes, decisions, action_items, meeting_type } = input
  const date = input.date || getBrisbaneDate()
  const attendees = input.attendees || []
  const projectCode = input.project_code || null

  try {
    // 1. Save to Supabase project_knowledge
    const { data: pkData, error: pkError } = await supabase
      .from('project_knowledge')
      .insert({
        title,
        content: notes,
        knowledge_type: 'meeting',
        project_code: projectCode,
        recorded_at: new Date(date).toISOString(),
        participants: attendees,
        action_items: action_items ? action_items.map(a => ({ text: a, done: false })) : null,
        source_type: 'telegram',
        importance: 'normal',
        action_required: (action_items && action_items.length > 0) || false,
      })
      .select('id')
      .single()

    if (pkError) {
      return JSON.stringify({ error: `Failed to save to knowledge base: ${pkError.message}` })
    }

    // 2. Save to Notion Meetings database (if configured)
    const dbIds = loadNotionDbIds()
    const meetingsDbId = dbIds.meetings || dbIds.unifiedMeetings
    let notionPageId: string | null = null

    if (meetingsDbId && process.env.NOTION_TOKEN) {
      const notion = getNotionClient()

      const properties: Record<string, any> = {
        'Name': { title: [{ text: { content: title } }] },
        'Date': { date: { start: date } },
        'Type': { select: { name: meeting_type || 'external' } },
        'Status': { select: { name: 'Completed' } },
        'Supabase ID': { rich_text: [{ text: { content: pkData.id } }] },
      }

      // Link to project via relation
      if (projectCode) {
        const projectPageId = await resolveProjectPageId(projectCode)
        if (projectPageId) {
          properties['Project'] = { relation: [{ id: projectPageId }] }
        }
      }

      if (attendees.length > 0) {
        properties['Attendees'] = { rich_text: [{ text: { content: attendees.join(', ') } }] }
      }

      // Build page content
      const children: any[] = []
      children.push({
        object: 'block', type: 'paragraph',
        paragraph: { rich_text: [{ text: { content: notes.slice(0, 2000) } }] },
      })

      if (decisions && decisions.length > 0) {
        children.push({
          object: 'block', type: 'heading_3',
          heading_3: { rich_text: [{ text: { content: 'Decisions' } }] },
        })
        for (const d of decisions) {
          children.push({
            object: 'block', type: 'bulleted_list_item',
            bulleted_list_item: { rich_text: [{ text: { content: d } }] },
          })
        }
      }

      if (action_items && action_items.length > 0) {
        children.push({
          object: 'block', type: 'heading_3',
          heading_3: { rich_text: [{ text: { content: 'Action Items' } }] },
        })
        for (const a of action_items) {
          children.push({
            object: 'block', type: 'to_do',
            to_do: { rich_text: [{ text: { content: a } }], checked: false },
          })
        }
      }

      const page = await notion.pages.create({
        parent: { database_id: meetingsDbId },
        properties,
        children,
      })
      notionPageId = page.id
    }

    // 3. Also save decisions as separate knowledge items
    if (decisions && decisions.length > 0) {
      for (const d of decisions) {
        await supabase.from('project_knowledge').insert({
          title: d,
          content: d,
          knowledge_type: 'decision',
          project_code: projectCode,
          recorded_at: new Date(date).toISOString(),
          decision_status: 'active',
          source_type: 'telegram',
          importance: 'normal',
        })
      }
    }

    return JSON.stringify({
      success: true,
      meeting_id: pkData.id,
      notion_page_id: notionPageId,
      saved_to: notionPageId ? 'supabase + notion' : 'supabase only',
      decisions_count: decisions?.length || 0,
      action_items_count: action_items?.length || 0,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: add_action_item
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeAddActionItem(input: {
  title: string
  project_code?: string
  due_date?: string
  priority?: string
  details?: string
  assignee?: string
}): Promise<string> {
  const { title, project_code, due_date, priority, details, assignee } = input

  try {
    // 1. Save to Supabase
    const { data, error } = await supabase
      .from('project_knowledge')
      .insert({
        title,
        content: details || title,
        knowledge_type: 'action',
        project_code: project_code || null,
        recorded_at: new Date().toISOString(),
        action_required: true,
        follow_up_date: due_date || null,
        importance: priority || 'normal',
        recorded_by: assignee || null,
        source_type: 'telegram',
      })
      .select('id')
      .single()

    if (error) {
      return JSON.stringify({ error: `Failed to save action: ${error.message}` })
    }

    // 2. Save to Notion Actions database (if configured)
    const dbIds = loadNotionDbIds()
    const actionsDbId = dbIds.actions
    let notionPageId: string | null = null

    if (actionsDbId && process.env.NOTION_TOKEN) {
      const notion = getNotionClient()

      // Existing Actions DB: 'Action Item' (title), 'Status' (status type), 'Projects' (relation)
      const properties: Record<string, any> = {
        'Action Item': { title: [{ text: { content: title } }] },
        'Status': { status: { name: 'In progress' } },
        'Supabase ID': { rich_text: [{ text: { content: data.id } }] },
      }

      // Link to project via relation
      if (project_code) {
        const projectPageId = await resolveProjectPageId(project_code)
        if (projectPageId) {
          properties['Projects'] = { relation: [{ id: projectPageId }] }
        }
      }

      if (due_date) {
        properties['Due Date'] = { date: { start: due_date } }
      }

      const children: any[] = []
      if (details) {
        children.push({
          object: 'block', type: 'paragraph',
          paragraph: { rich_text: [{ text: { content: details.slice(0, 2000) } }] },
        })
      }

      const page = await notion.pages.create({
        parent: { database_id: actionsDbId },
        properties,
        children,
      })
      notionPageId = page.id
    }

    return JSON.stringify({
      success: true,
      action_id: data.id,
      notion_page_id: notionPageId,
      saved_to: notionPageId ? 'supabase + notion' : 'supabase only',
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: add_decision
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeAddDecision(input: {
  title: string
  project_code?: string
  rationale?: string
  alternatives_considered?: string[]
  status?: string
}): Promise<string> {
  const { title, project_code, rationale, alternatives_considered, status } = input

  try {
    const content = [
      title,
      rationale ? `\nRationale: ${rationale}` : '',
      alternatives_considered?.length ? `\nAlternatives considered: ${alternatives_considered.join(', ')}` : '',
    ].filter(Boolean).join('')

    // 1. Save to Supabase
    const { data, error } = await supabase
      .from('project_knowledge')
      .insert({
        title,
        content,
        knowledge_type: 'decision',
        project_code: project_code || null,
        recorded_at: new Date().toISOString(),
        decision_status: status || 'active',
        decision_rationale: rationale || null,
        importance: 'high',
        source_type: 'telegram',
      })
      .select('id')
      .single()

    if (error) {
      return JSON.stringify({ error: `Failed to save decision: ${error.message}` })
    }

    // 2. Save to Notion Decisions database (if configured)
    const dbIds = loadNotionDbIds()
    const decisionsDbId = dbIds.decisions
    let notionPageId: string | null = null

    if (decisionsDbId && process.env.NOTION_TOKEN) {
      const notion = getNotionClient()

      const properties: Record<string, any> = {
        'Name': { title: [{ text: { content: title } }] },
        'Status': { select: { name: status || 'active' } },
        'Priority': { select: { name: 'high' } },
        'Date': { date: { start: getBrisbaneDate() } },
        'Supabase ID': { rich_text: [{ text: { content: data.id } }] },
      }

      // Link to project via relation
      if (project_code) {
        const projectPageId = await resolveProjectPageId(project_code)
        if (projectPageId) {
          properties['Project'] = { relation: [{ id: projectPageId }] }
        }
      }

      // Store rationale in dedicated property
      if (rationale) {
        properties['Rationale'] = { rich_text: [{ text: { content: rationale.slice(0, 2000) } }] }
      }

      const children: any[] = []
      if (rationale) {
        children.push({
          object: 'block', type: 'callout',
          callout: {
            rich_text: [{ text: { content: `Rationale: ${rationale}` } }],
            icon: { type: 'emoji', emoji: '\u{1F4AD}' },
          },
        })
      }
      if (alternatives_considered?.length) {
        children.push({
          object: 'block', type: 'heading_3',
          heading_3: { rich_text: [{ text: { content: 'Alternatives Considered' } }] },
        })
        for (const alt of alternatives_considered) {
          children.push({
            object: 'block', type: 'bulleted_list_item',
            bulleted_list_item: { rich_text: [{ text: { content: alt } }] },
          })
        }
      }

      const page = await notion.pages.create({
        parent: { database_id: decisionsDbId },
        properties,
        children,
      })
      notionPageId = page.id
    }

    return JSON.stringify({
      success: true,
      decision_id: data.id,
      notion_page_id: notionPageId,
      saved_to: notionPageId ? 'supabase + notion' : 'supabase only',
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_project_financials
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetProjectFinancials(input: { project_code?: string }): Promise<string> {
  try {
    let query = supabase.from('v_project_financials').select('*')
    if (input.project_code) {
      query = query.eq('code', input.project_code)
    }
    const { data, error } = await query

    if (error) return JSON.stringify({ error: error.message })
    if (!data || data.length === 0) return JSON.stringify({ message: 'No financial data found' })

    const projects = data.map((p: Record<string, unknown>) => ({
      code: p.code,
      name: p.name,
      tier: p.tier,
      fy_income: Math.round(Number(p.fy_income || 0)),
      fy_expenses: Math.round(Number(p.fy_expenses || 0)),
      net_position: Math.round(Number(p.net_position || 0)),
      receivable: Math.round(Number(p.receivable || 0)),
      pipeline_value: Math.round(Number(p.pipeline_value || 0)),
      grant_funding: Math.round(Number(p.grant_funding || 0)),
      monthly_subscriptions: Math.round(Number(p.monthly_subscriptions || 0)),
      transaction_count: Number(p.transaction_count || 0),
    }))

    return JSON.stringify({ projects, count: projects.length })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: get_untagged_summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeGetUntaggedSummary(): Promise<string> {
  try {
    const { count: untaggedCount } = await supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })
      .is('project_code', null)

    const { count: totalCount } = await supabase
      .from('xero_transactions')
      .select('*', { count: 'exact', head: true })

    // Top untagged vendors
    const { data: untagged } = await supabase
      .from('xero_transactions')
      .select('contact_name')
      .is('project_code', null)

    const vendorCounts: Record<string, number> = {}
    for (const tx of untagged || []) {
      const name = tx.contact_name || '(No contact)'
      vendorCounts[name] = (vendorCounts[name] || 0) + 1
    }

    const topVendors = Object.entries(vendorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, count]) => ({ vendor: name, count }))

    const coverage = totalCount ? Math.round(((totalCount - (untaggedCount || 0)) / totalCount) * 100) : 0

    return JSON.stringify({
      untagged: untaggedCount || 0,
      total: totalCount || 0,
      coverage_pct: coverage,
      top_untagged_vendors: topVendors,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL: trigger_auto_tag
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeTriggerAutoTag(input: { dry_run?: boolean }): Promise<string> {
  try {
    // Load vendor rules from DB
    const { data: rules, error: rulesErr } = await supabase
      .from('vendor_project_rules')
      .select('vendor_name, aliases, project_code')
      .eq('auto_apply', true)

    if (rulesErr) return JSON.stringify({ error: rulesErr.message })

    // Fetch untagged transactions
    const { data: untagged, error: txErr } = await supabase
      .from('xero_transactions')
      .select('id, contact_name')
      .is('project_code', null)
      .limit(5000)

    if (txErr) return JSON.stringify({ error: txErr.message })

    // Match
    const matches: Array<{ id: string; project_code: string; vendor: string }> = []
    for (const tx of untagged || []) {
      if (!tx.contact_name) continue
      const lower = tx.contact_name.toLowerCase()
      for (const rule of rules || []) {
        const names = [rule.vendor_name, ...(rule.aliases || [])].map((a: string) => a.toLowerCase())
        if (names.some((n: string) => lower.includes(n) || n.includes(lower))) {
          matches.push({ id: tx.id, project_code: rule.project_code, vendor: tx.contact_name })
          break
        }
      }
    }

    if (input.dry_run || matches.length === 0) {
      return JSON.stringify({
        mode: 'dry_run',
        would_tag: matches.length,
        untagged_remaining: (untagged?.length || 0) - matches.length,
        sample: matches.slice(0, 10),
      })
    }

    // Apply
    let applied = 0
    for (const m of matches) {
      const { error } = await supabase
        .from('xero_transactions')
        .update({ project_code: m.project_code, project_code_source: 'vendor_rule' })
        .eq('id', m.id)
      if (!error) applied++
    }

    return JSON.stringify({
      mode: 'applied',
      tagged: applied,
      untagged_remaining: (untagged?.length || 0) - applied,
    })
  } catch (err) {
    return JSON.stringify({ error: (err as Error).message })
  }
}
