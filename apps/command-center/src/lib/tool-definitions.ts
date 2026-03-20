import Anthropic from '@anthropic-ai/sdk'

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
        format: {
          type: 'string',
          enum: ['text', 'voice'],
          description: 'Output format. "voice" returns concise natural sentences optimised for TTS (~800 chars max).',
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

  // ── DREAM JOURNAL ──────────────────────────────────────────────────

  {
    name: 'save_dream',
    description:
      'Save a dream, idea, story, reflection, or vision to the Dream Journal. Use when the user shares something creative, aspirational, reflective, or emotional — especially about the future of ACT, The Harvest, Black Cockatoo Valley, community, art, or personal growth. Also use when they explicitly say "dream", "add to journal", "save this thought", or send a voice message that feels like a dream/vision rather than a business query. AI will auto-categorise and find thematic links to other entries.',
    input_schema: {
      type: 'object' as const,
      properties: {
        content: {
          type: 'string',
          description: 'The dream/thought/story content. Can be raw transcription from voice.',
        },
        title: {
          type: 'string',
          description: 'Optional title. If not provided, AI will generate one from content.',
        },
        category: {
          type: 'string',
          enum: ['dream', 'story', 'reflection', 'excitement', 'idea', 'experience', 'love', 'vision'],
          description: 'Category for this entry. If unsure, AI will auto-detect from content.',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags like project names, themes, people.',
        },
        media_url: {
          type: 'string',
          description: 'URL to attached media (photo/video) if any.',
        },
        media_type: {
          type: 'string',
          enum: ['photo', 'video', 'voice', 'document'],
          description: 'Type of attached media.',
        },
      },
      required: ['content'],
    },
  },

  {
    name: 'search_dreams',
    description:
      'Search the Dream Journal for past entries. Use when the user asks "what did I dream about...", "find my thoughts on...", "show me my visions for The Harvest", or similar. Returns matching entries with AI themes and connections.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search text to match against content, titles, tags, and AI themes.',
        },
        category: {
          type: 'string',
          enum: ['dream', 'story', 'reflection', 'excitement', 'idea', 'experience', 'love', 'vision'],
          description: 'Filter by category.',
        },
        limit: {
          type: 'number',
          description: 'Max entries to return. Default 10.',
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

  {
    name: 'get_daily_priorities',
    description:
      'Get today\'s ranked priority actions from the daily priorities engine. Returns scored, ranked items covering overdue invoices, grant deadlines, at-risk deals, unanswered emails, overdue actions, and stale pipeline opportunities. Use when the user asks "what should I focus on today?", "daily priorities", "what\'s urgent?", or "top things to do".',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of priorities to return. Default: 10.',
        },
      },
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

  // ── RECEIPT PIPELINE ─────────────────────────────────────────────────

  {
    name: 'get_receipt_pipeline_status',
    description:
      'Get receipt pipeline funnel status — counts and totals per stage (missing_receipt → forwarded_to_dext → dext_processed → xero_bill_created → reconciled). Shows stuck items. Use when the user asks about receipt pipeline, Dext status, or reconciliation progress.',
    input_schema: {
      type: 'object' as const,
      properties: {
        include_stuck: {
          type: 'boolean',
          description: 'Include items stuck >14 days. Default true.',
        },
      },
      required: [],
    },
  },

  // ── MEETING PREP ─────────────────────────────────────────────────────

  {
    name: 'get_meeting_prep',
    description:
      'Get pre-meeting briefing with attendee context — contact details, last interaction, open deals, relationship health. Use when the user asks to "prep for a meeting", "who am I meeting", or "meeting brief".',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_title: {
          type: 'string',
          description: 'Title or partial title of the calendar event to prep for.',
        },
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format. Default today.',
        },
      },
      required: [],
    },
  },

  // ── MEETING NOTES CAPTURE ────────────────────────────────────────────

  {
    name: 'capture_meeting_notes',
    description:
      'Save meeting notes/takeaways from a voice note or text. Auto-matches to today\'s calendar event and links attendee contacts. Use when the user sends meeting takeaways, action items, or "notes from the meeting".',
    input_schema: {
      type: 'object' as const,
      properties: {
        notes: {
          type: 'string',
          description: 'The meeting notes, takeaways, or transcript to save.',
        },
        event_title: {
          type: 'string',
          description: 'Calendar event title to link to. Auto-matched if omitted.',
        },
        project_code: {
          type: 'string',
          description: 'Project code (e.g. ACT-JH). Auto-detected from event if omitted.',
        },
      },
      required: ['notes'],
    },
  },

  // ── WEEKLY FINANCE SUMMARY ───────────────────────────────────────────

  {
    name: 'get_weekly_finance_summary',
    description:
      'Get weekly financial summary — income vs spend, overdue receivables, upcoming payables, cash position. Supports voice format for TTS. Use when the user asks for "weekly finances", "financial update", or "money this week".',
    input_schema: {
      type: 'object' as const,
      properties: {
        format: {
          type: 'string',
          enum: ['text', 'voice'],
          description: 'Output format. "voice" returns natural sentences for TTS. Default "text".',
        },
      },
      required: [],
    },
  },

  // ── GRANT READINESS ──────────────────────────────────────────────────

  {
    name: 'get_grant_readiness',
    description:
      'Get grant application readiness — requirement completion %, missing documents, available reusable assets, days until close. Use when the user asks "are we ready for [grant]", "grant checklist", or "what do we need for [application]".',
    input_schema: {
      type: 'object' as const,
      properties: {
        application_id: {
          type: 'string',
          description: 'Grant application UUID.',
        },
        grant_name: {
          type: 'string',
          description: 'Grant or application name to search for.',
        },
      },
      required: [],
    },
  },

  // ── GRANT DRAFT ──────────────────────────────────────────────────────

  {
    name: 'draft_grant_response',
    description:
      'Draft a grant EOI or application response using project context, reusable assets, and recent knowledge. Requires confirmation before saving. Use when the user says "draft a response for [grant]", "write grant application", or "help with [grant] submission".',
    input_schema: {
      type: 'object' as const,
      properties: {
        opportunity_id: {
          type: 'string',
          description: 'Grant opportunity UUID (required).',
        },
        project_code: {
          type: 'string',
          description: 'Project code to frame the response around.',
        },
        sections: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific sections to draft (e.g. ["project_description", "budget_justification"]). Drafts full EOI if omitted.',
        },
        tone: {
          type: 'string',
          enum: ['formal', 'conversational', 'community-led'],
          description: 'Writing tone. Default "community-led" (ACT voice).',
        },
      },
      required: ['opportunity_id'],
    },
  },

  // ── REVENUE SCOREBOARD ────────────────────────────────────────────

  {
    name: 'get_revenue_scoreboard',
    description:
      'Get the revenue scoreboard — all commercial decision-making data in one call. Includes revenue streams vs targets, fundraising pipeline by status with weighted values, outstanding receivables, revenue scenarios, and active project counts. Use when the user asks about revenue, targets, pipeline value, commercial overview, or "how are we tracking against targets".',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
]
