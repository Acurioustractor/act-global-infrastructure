import Anthropic from '@anthropic-ai/sdk'
import { supabase } from './supabase'

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
      'Get full details for a specific contact including email, phone, organisation, tags, engagement history, and recent communications. Use this after finding a contact via search, or when the user asks for details about a known person.',
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
      'Get contacts who need follow-up — people who were recently active but haven\'t been contacted in 14-60 days. Use this when the user asks "who should I reach out to" or "who needs follow-up".',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Max contacts to return. Default 10.',
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
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional tags for the draft (e.g. ["essay", "act-philosophy", "lcaa"]).',
        },
      },
      required: ['title', 'content'],
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
      return await executeGetDailyBriefing(input as { lookback_days?: number })
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
      return await executeGetContactsNeedingAttention(input as { limit?: number })
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
      return await executeGetQuarterlyReview(input as { quarter?: string })
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
        input as { title: string; content: string; append?: boolean; tags?: string[] }
      )
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
}): Promise<string> {
  const days = input.lookback_days || 7
  const now = new Date()
  const lookback = new Date(now.getTime() - days * 86400000).toISOString()
  const today = now.toISOString().split('T')[0]
  const futureDate = new Date(now.getTime() + days * 86400000).toISOString().split('T')[0]

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

    // Get recent communications
    const { data: comms } = await supabase
      .from('communications_history')
      .select('direction, channel, subject, summary, communication_date')
      .eq('contact_id', contact.id)
      .order('communication_date', { ascending: false })
      .limit(5)

    const now = new Date()
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
  const now = new Date()
  const startDate = input.start_date || now.toISOString().split('T')[0]
  const endDate = input.end_date || startDate

  const dayStart = `${startDate}T00:00:00.000Z`
  const dayEnd = `${endDate}T23:59:59.999Z`

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
}): Promise<string> {
  const limit = input.limit || 10

  try {
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const { data, error } = await supabase
      .from('ghl_contacts')
      .select('id, ghl_id, full_name, email, phone, company_name, engagement_status, tags, projects, last_contact_date')
      .lt('last_contact_date', fourteenDaysAgo.toISOString())
      .gt('last_contact_date', sixtyDaysAgo.toISOString())
      .order('last_contact_date', { ascending: true })
      .limit(limit)

    if (error) {
      return JSON.stringify({ error: error.message })
    }

    const now = new Date()
    const contacts = (data || []).map((c) => ({
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
    }))

    return JSON.stringify({
      description: 'Contacts who were recently active but need follow-up (14-60 days since last contact)',
      count: contacts.length,
      contacts,
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
    const { setPendingAction } = await import('@/lib/telegram/bot')
    setPendingAction(chatId, {
      description: `Send email to ${recipientName} <${recipientEmail}>`,
      execute: async () => {
        return await sendEmailViaGmail(recipientEmail, input.subject, input.body)
      },
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
    const { setPendingAction } = await import('@/lib/telegram/bot')
    setPendingAction(chatId, {
      description: `Create calendar event: ${input.title}`,
      execute: async () => {
        return await createGoogleCalendarEvent(eventSummary)
      },
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

async function executeGetQuarterlyReview(input: { quarter?: string }): Promise<string> {
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
        .gte('date', new Date(new Date().getTime() - 180 * 86400000).toISOString().split('T')[0])
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
  const endDate = input.end_date || new Date().toISOString().split('T')[0]
  const startDate = input.start_date || new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]

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
  const date = input.date || new Date().toISOString().split('T')[0]

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

  const today = new Date().toISOString().split('T')[0]

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
  const lookback = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

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
// TOOL: save_writing_draft
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function executeSaveWritingDraft(input: {
  title: string
  content: string
  append?: boolean
  tags?: string[]
}): Promise<string> {
  const { title, content, append, tags } = input

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
  const date = new Date().toISOString().split('T')[0]
  const filename = `${date}-${slug}.md`
  const filepath = `thoughts/writing/drafts/${filename}`

  // Build markdown content
  const now = new Date().toISOString()
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
            fileContent = buildNewDraft(title, content, now, tagLine)
            commitMessage = `writing: new draft "${title}"`
          }
        } else {
          fileContent = buildNewDraft(title, content, now, tagLine)
          commitMessage = `writing: new draft "${title}"`
        }
      } else {
        fileContent = buildNewDraft(title, content, now, tagLine)
        commitMessage = `writing: new draft "${title}"`
      }
    } catch {
      fileContent = buildNewDraft(title, content, now, tagLine)
      commitMessage = `writing: new draft "${title}"`
    }
  } else {
    fileContent = buildNewDraft(title, content, now, tagLine)
    commitMessage = `writing: new draft "${title}"`
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

function buildNewDraft(title: string, content: string, created: string, tagLine: string): string {
  return `---
title: "${title}"
created: ${created}
status: draft${tagLine}
---

# ${title}

${content}
`
}
