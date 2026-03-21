/**
 * ACT Ecosystem — Notion Workers
 *
 * Custom agent tools for Notion's AI agents, powered by ACT's Supabase data layer.
 * Each tool exposes a slice of ACT intelligence directly inside Notion.
 *
 * Tools (Wave 1):
 *   1. check_grant_deadlines — Upcoming grant deadlines with milestone progress
 *   2. get_daily_briefing    — Morning digest: overdue actions, follow-ups, decisions
 *   3. lookup_contact        — Relationship intelligence for any contact
 *   4. get_project_health    — Project health scores and activity summary
 *   5. get_financial_summary — Spend by project, pipeline totals
 *
 * Tools (Wave 2):
 *   6. get_unanswered_emails   — Emails waiting for our response
 *   7. get_attention_items     — Projects flagged as needing attention
 *   8. get_funding_pipeline    — Discovered funding opportunities with deadlines
 *   9. get_cashflow            — Monthly cash flow: income, expenses, balance
 *  10. get_outstanding_invoices — Unpaid invoices and accounts receivable
 *
 * Tools (Wave 3 — Freshness & Triage):
 *  11. get_data_freshness      — Sync status and staleness for all integrations
 *  12. triage_emails           — Prioritized email triage (key contacts → recent → backlog)
 *  13. get_grant_readiness     — Grant readiness checklist (ready vs gaps)
 *
 * Tools (Wave 4 — Project Intelligence):
 *  14. get_project_intelligence — Comprehensive project overview (financials, focus, relationships, health)
 *
 * Tools (Wave 5 — Financial Clarity):
 *  15. explain_cashflow          — Monthly cash flow with variance explanations
 *  16. get_project_pnl           — Monthly P&L for specific project with trends
 *
 * Tools (Wave 6 — Opportunity Pipeline):
 *  17. get_pipeline_value        — Weighted pipeline value by type and stage
 *  18. get_revenue_forecast      — 10-year revenue scenarios
 *
 * Tools (Wave 7 — Agent Intelligence):
 *  19. suggest_transaction_fixes — Unmapped transactions, duplicates, anomalies
 *  20. get_impact_summary        — Aggregated impact metrics across projects
 *  21. search_knowledge_graph    — Semantic knowledge search with related items
 *
 * Tools (Wave 8 — Weekly Review):
 *  22. run_weekly_financial_review — Comprehensive weekly financial review with action items
 *
 * Tools (Wave 9 — Meeting Intelligence):
 *  23. query_meeting_notes          — Search meetings by project, participant, date, keyword
 *  24. get_meeting_actions           — Open action items extracted from meetings
 *
 * Tools (Wave 10 — Receipt Pipeline):
 *  25. get_receipt_pipeline          — Pipeline status: missing → Dext → processed → reconciled
 *
 * Tools (Wave 11 — Grants Agent):
 *  26. update_grant_status           — Update grant application status from chat
 *  27. get_grant_requirements        — Show eligibility, criteria, documents, readiness
 *  28. set_grant_reminder            — Create Telegram reminder linked to grant deadline
 *  29. get_grants_summary            — Pipeline dashboard: counts, deadlines, value
 *  30. get_revenue_scoreboard        — Revenue targets, pipeline, receivables, scenarios
 *
 * Tools (Wave 12 — Weekly Pulse & Close-Off):
 *  31. get_weekly_project_pulse      — Monday morning overview: actions, meetings, grants, contacts per project
 *  32. get_project_closeoff          — Close-off checklist: invoices, actions, contacts, decisions, grants
 *  33. get_daily_grant_report        — Daily grant landscape: urgency-grouped, milestones, new opps, writing tasks
 *
 * Tools (Wave 13 — Reconciliation):
 *  34. get_reconciliation_status      — Tagged %, reconciled %, receipt coverage, stuck items
 *  35. get_untagged_summary           — Untagged transactions grouped by vendor with suggested codes
 *
 * Tools (Wave 14 — Overdue Actions):
 *  36. get_overdue_actions             — Aggregated overdue items: untagged, missing receipts, invoices, grants, stuck pipeline
 *
 * Tools (Wave 15 — Proactive Orchestration):
 *  37. get_daily_review                — Comprehensive morning review combining ALL intelligence sources
 *  38. get_meeting_context             — Pre-meeting prep: contacts, health, actions, grants, talking points
 *  39. run_weekly_cleanup              — Monday data hygiene: stale actions, orphans, incomplete contacts
 *  40. suggest_grants                  — Match projects to open grant opportunities by theme/keywords
 *
 * Tools (Wave 16 — Company Intelligence):
 *  41. get_project_budget_status       — Budget vs actual spend per project with variance alerts
 *  42. get_missing_receipts_impact     — Missing receipts with GST + R&D tax refund impact
 *  43. get_rd_evidence_strength        — R&D evidence coverage per eligible project
 *
 * Secrets required (set via `ntn workers env set`):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * @see https://github.com/makenotion/workers-template
 */

import { Worker } from "@notionhq/workers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  fetchDailyBriefing,
  fetchProjectHealth,
  fetchFinancialSummary,
  fetchCashflow,
  fetchRevenueScoreboard,
  fetchReceiptPipeline,
  searchContacts,
  fetchContactsNeedingAttention,
  fetchGrantDeadlines,
  fetchFundingPipeline,
  fetchGrantReadiness,
  fetchUnansweredEmails,
  triageEmails,
  fetchProjectIntelligence,
  searchKnowledge,
  fetchProjectsNeedingAttention,
  fetchOutstandingInvoices,
  fetchDataFreshness,
  fetchCashflowExplained,
  fetchProjectPnl,
  fetchPipelineValue,
  fetchRevenueForecast,
  fetchTransactionFixes,
  fetchImpactSummary,
  fetchWeeklyFinancialReview,
  searchMeetings,
  fetchMeetingActions,
  fetchGrantsSummary,
  fetchGrantRequirements,
  fetchWeeklyProjectPulse,
  fetchProjectCloseoff,
  fetchDailyGrantReport,
  fetchReconciliationStatus,
  fetchUntaggedSummary,
  fetchOverdueActions,
  fetchDailyReview,
  fetchMeetingContext,
  fetchWeeklyCleanup,
  fetchGrantSuggestions,
  fetchProjectFinancials,
} from "@act/intel";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SHARED SETUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WORKER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const worker = new Worker();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL CURATION — Only register high-value tools (15 of 43)
// Set ENABLE_ALL_NOTION_TOOLS=1 env var to register all tools
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CURATED_TOOLS = new Set([
  "lookup_contact",             // "Who is X?" — contact search + relationship health
  "get_daily_review",           // "What needs attention?" — comprehensive morning digest
  "get_project_intelligence",   // "How is project X?" — full project 360 view
  "get_financial_summary",      // "How are finances?" — spend, pipeline, runway
  "get_grants_summary",         // "What grants?" — pipeline dashboard with deadlines
  "search_knowledge_graph",     // "What do we know about X?" — semantic search
  "get_outstanding_invoices",   // "Who owes us?" — receivables and aging
]);

const ENABLE_ALL = !!process.env.ENABLE_ALL_NOTION_TOOLS;

// Wrapper: only registers tools in CURATED_TOOLS unless ENABLE_ALL is set
const _workerTool = worker.tool.bind(worker);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(worker as any).tool = (name: string, config: any) => {
  if (ENABLE_ALL || CURATED_TOOLS.has(name)) {
    _workerTool(name, config);
  } else {
    console.log(`[worker] Skipped tool: ${name} (not in CURATED_TOOLS)`);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// TOOL 1: Grant Deadline Check
// ─────────────────────────────────────────────────────────────────────────

worker.tool("check_grant_deadlines", {
  title: "Check Grant Deadlines",
  description:
    "Query the ACT Supabase database for active grant applications with upcoming deadlines. Returns urgency level (CRITICAL/URGENT/SOON/UPCOMING/PLANNED), deadline dates, dollar amounts, milestone completion percentages, and overdue milestones. ALWAYS use this tool instead of searching Notion pages when the user asks about: grant deadlines, grant progress, application status, milestone tracking, or 'what grants are closing'. Data source: grant_applications + grant_opportunities tables. Example queries: 'What grants are closing soon?', 'Show ACT-EL grant deadlines', 'Any overdue milestones?'",
  schema: {
    type: "object" as const,
    properties: {
      days_ahead: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "How many days ahead to look (default: 30). Pass null to use default.",
      },
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter by ACT project code (e.g. ACT-EL, ACT-PICC). Pass null for all.",
      },
    },
    required: ["days_ahead", "project_code"] as const,
    additionalProperties: false,
  },
  execute: async (params: { days_ahead: number | null; project_code: string | null }) => {
    const result = await fetchGrantDeadlines(getSupabase(), {
      days_ahead: params.days_ahead ?? undefined,
      project_code: params.project_code ?? undefined,
    });

    if (result.count === 0) return `No grant deadlines within the next ${result.days_ahead} days.`;

    const lines = result.deadlines.map((d) =>
      [
        `[${d.urgency}] ${d.application_name}`,
        `  Provider: ${d.provider} — ${d.opportunity_name}`,
        `  Project: ${d.project_code}`,
        `  Deadline: ${d.deadline} (${d.days_remaining} days)`,
        `  Amount: $${(d.amount_requested || 0).toLocaleString()}`,
        `  Progress: ${d.progress.pct}% (${d.progress.completed}/${d.progress.total} milestones)`,
        d.overdue_milestones.length > 0
          ? `  OVERDUE milestones: ${d.overdue_milestones.join(", ")}`
          : null,
      ].filter(Boolean).join("\n")
    );

    return `Found ${result.count} grant(s) with upcoming deadlines:\n\n${lines.join("\n\n")}`;
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 2: Daily Briefing
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_daily_briefing", {
  title: "Daily Briefing",
  description:
    "Query the ACT Supabase database to generate a structured morning digest. Returns four sections: OVERDUE ACTIONS (with days overdue and importance), UPCOMING FOLLOW-UPS (with due dates), RECENT DECISIONS (with status), and RELATIONSHIP ALERTS (contacts with falling engagement temperature). ALWAYS use this tool instead of searching Notion pages when the user asks about: daily briefing, morning summary, what's overdue, what needs attention, what's happening today, or status update. Data source: project_knowledge + relationship_health + ghl_contacts tables. Example queries: 'What's my briefing?', 'What's overdue?', 'Morning update', 'What needs attention for ACT-EL?'",
  schema: {
    type: "object" as const,
    properties: {
      days: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Lookback period in days (default: 7). Pass null for default.",
      },
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter by project code. Pass null for all projects.",
      },
    },
    required: ["days", "project_code"] as const,
    additionalProperties: false,
  },
  execute: async (params: { days: number | null; project_code: string | null }) => {
    const supabase = getSupabase();
    const result = await fetchDailyBriefing(supabase, {
      lookbackDays: params.days ?? 7,
      projectCode: params.project_code ?? undefined,
    });

    const sections: string[] = [];

    // 1. Overdue actions
    if (result.overdue_actions.length) {
      const items = result.overdue_actions.map((r) => {
        const daysOver = Math.floor(
          (Date.now() - new Date(r.follow_up_date).getTime()) / 86400000
        );
        return `  - [${r.project_code}] ${r.title} (${daysOver}d overdue, ${r.importance})`;
      });
      sections.push(`OVERDUE ACTIONS (${result.overdue_actions.length}):\n${items.join("\n")}`);
    }

    // 2. Upcoming follow-ups
    if (result.upcoming_followups.length) {
      const items = result.upcoming_followups.map(
        (r) => `  - [${r.project_code}] ${r.title} (due ${r.follow_up_date})`
      );
      sections.push(`UPCOMING FOLLOW-UPS (${result.upcoming_followups.length}):\n${items.join("\n")}`);
    }

    // 3. Recent decisions
    if (result.recent_decisions.length) {
      const items = result.recent_decisions.map(
        (r) => `  - [${r.project_code}] ${r.title} (${r.decision_status || "pending"})`
      );
      sections.push(`RECENT DECISIONS (${result.recent_decisions.length}):\n${items.join("\n")}`);
    }

    // 4. Relationship alerts
    if (result.relationship_alerts.length) {
      const items = result.relationship_alerts.map(
        (a) => `  - ${a.contact_name} (temp: ${a.temperature}/100, trend: falling)`
      );
      sections.push(`RELATIONSHIP ALERTS (${result.relationship_alerts.length}):\n${items.join("\n")}`);
    }

    if (!sections.length) return "All clear — no overdue items, upcoming follow-ups, or alerts.";

    return `ACT DAILY BRIEFING — ${todayStr()}\n${"─".repeat(40)}\n\n${sections.join("\n\n")}`;
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 3: Contact Lookup
// ─────────────────────────────────────────────────────────────────────────

worker.tool("lookup_contact", {
  title: "Lookup Contact",
  description:
    "Query the ACT Supabase CRM for contact relationship intelligence. Returns: name, email, phone, company, engagement status, linked projects, temperature score (0-100), engagement signals (email/calendar/financial/pipeline scores), risk flags, recent email count (30 days), and last contact date. ALWAYS use this tool instead of searching Notion pages when the user asks about: a specific person, contact details, relationship status, meeting prep, 'who is [name]', or 'tell me about [name]'. Data source: ghl_contacts + relationship_health + communications tables. Example queries: 'Who is Sarah Chen?', 'Prep me for meeting with Brodie', 'What's our relationship with Cultural Arts Foundation?'",
  schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string" as const,
        description: "Name or email to search for",
      },
    },
    required: ["query"] as const,
    additionalProperties: false,
  },
  execute: async (params: { query: string }) => {
    const result = await searchContacts(getSupabase(), { query: params.query, limit: 5 });

    if (result.count === 0) return `No contacts found matching "${params.query}".`;

    const lines = result.contacts.map((c) =>
      [
        c.name,
        c.email ? `  Email: ${c.email}` : null,
        c.phone ? `  Phone: ${c.phone}` : null,
        c.company ? `  Company: ${c.company}` : null,
        `  Status: ${c.status || "unknown"}`,
        c.projects.length ? `  Projects: ${c.projects.join(", ")}` : null,
        c.tags.length ? `  Tags: ${c.tags.join(", ")}` : null,
        c.temperature !== null ? `  Temperature: ${c.temperature}/100 (${c.temperature_trend || "stable"})` : null,
        c.signals ? `  Signals: email=${c.signals.email}, calendar=${c.signals.calendar}, financial=${c.signals.financial}, pipeline=${c.signals.pipeline}` : null,
        c.risk_flags?.length ? `  Risk: ${JSON.stringify(c.risk_flags)}` : null,
        `  Recent emails (30d): ${c.recent_comms_30d || 0}`,
        c.last_contact ? `  Last contact: ${c.last_contact}` : null,
      ].filter(Boolean).join("\n")
    );

    return lines.join("\n\n---\n\n");
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 4: Project Health
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_project_health", {
  title: "Project Health",
  description:
    "Query the ACT Supabase database for project health metrics. Returns per-project: activity count (last 30 days), breakdown by type (meetings, decisions, action items), and active grant pipeline (count + dollar value). ALWAYS use this tool instead of searching Notion pages when the user asks about: project health, project status, project activity, 'how is [project] going', or comparing projects. Data source: project_knowledge + grant_applications tables. Example queries: 'How healthy is ACT-EL?', 'Project status overview', 'Which projects are most active?', 'Show me the grant pipeline for Harvest'",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Specific project code (e.g. ACT-EL). Pass null for all projects.",
      },
    },
    required: ["project_code"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string | null }) => {
    const supabase = getSupabase();
    const result = await fetchProjectHealth(supabase, {
      projectCode: params.project_code ?? undefined,
    });

    if (!result.projects.length) return "No project activity found in the last 30 days.";

    const lines: string[] = [];
    for (const p of result.projects) {
      const kb = p.knowledge_breakdown;
      lines.push(
        [
          `${p.code} (${p.health})`,
          `  Activity (30d): ${p.knowledge_entries} entries (${kb.meetings} meetings, ${kb.decisions} decisions, ${kb.actions} actions)`,
          p.grants.active_count > 0
            ? `  Grants: ${p.grants.active_count} active, $${p.grants.pipeline_value.toLocaleString()} pipeline`
            : null,
          p.financials
            ? `  Financials: $${p.financials.outstanding_receivables.toLocaleString()} receivable, net $${p.financials.net_position.toLocaleString()}`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      );
    }

    return `PROJECT HEALTH — Last 30 Days\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 5: Financial Summary
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_financial_summary", {
  title: "Financial Summary",
  description:
    "Query the ACT Supabase database for financial data from Xero. Returns three sections: SPEND BY PROJECT (spend + income + transaction count per project code), UNTAGGED TRANSACTIONS (count + total dollar value needing project codes), and GRANT PIPELINE (total value of submitted/under-review applications). ALWAYS use this tool instead of searching Notion pages when the user asks about: finances, spend, budget, money, cash flow, transactions, untagged expenses, or financial summary. Data source: xero_transactions + grant_applications tables. Example queries: 'Financial summary', 'What did we spend this month?', 'How many untagged transactions?', 'ACT-HV budget overview'",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter by project code. Pass null for all projects.",
      },
      months: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "How many months of data to include (default: 3). Pass null for default.",
      },
    },
    required: ["project_code", "months"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string | null; months: number | null }) => {
    const supabase = getSupabase();
    const months = params.months ?? 3;
    const result = await fetchFinancialSummary(supabase, {
      months,
      projectCode: params.project_code ?? undefined,
    });

    const sections: string[] = [];

    if (result.spend_by_project.length) {
      const lines = result.spend_by_project.map(
        (p) => `  ${p.project_code}: $${p.spend.toLocaleString()} spent, $${p.income.toLocaleString()} income (${p.count} txns)`
      );
      sections.push(`SPEND BY PROJECT (${months}mo):\n${lines.join("\n")}`);
    }

    if (result.untagged.count > 0) {
      sections.push(
        `UNTAGGED: ${result.untagged.count} transactions ($${result.untagged.amount.toLocaleString()})`
      );
    }

    if (result.grant_pipeline_total > 0) {
      sections.push(
        `GRANT PIPELINE: $${result.grant_pipeline_total.toLocaleString()}`
      );
    }

    if (!sections.length) return "No financial data found for the specified period.";

    return `FINANCIAL SUMMARY\n${"─".repeat(40)}\n\n${sections.join("\n\n")}`;
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 6: Unanswered Emails
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_unanswered_emails", {
  title: "Unanswered Emails",
  description:
    "Query the ACT Supabase database for inbound emails that are waiting for a response from us. Returns: contact name, email, subject, AI-generated summary, days waiting, sentiment, and topics. Sorted by oldest first (most urgent). ALWAYS use this tool instead of searching Notion pages when the user asks about: unanswered emails, emails to reply to, inbox, who's waiting, follow-up emails, or 'what emails need a response'. Data source: v_need_to_respond view (communications_history + ghl_contacts). Example queries: 'What emails need a reply?', 'Who's waiting to hear from us?', 'Show unanswered emails', 'Any urgent emails?'",
  schema: {
    type: "object" as const,
    properties: {
      limit: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Max results to return (default: 20). Pass null for default.",
      },
    },
    required: ["limit"] as const,
    additionalProperties: false,
  },
  execute: async (params: { limit: number | null }) => {
    const supabase = getSupabase();
    const result = await fetchUnansweredEmails(supabase, { limit: params.limit ?? undefined });
    if (!result.emails.length) return "No unanswered emails — inbox is clear!";

    const lines = result.emails.map((e) => {
      const age = e.days_since ? `${e.days_since}d ago` : "unknown";
      const topicStr = e.topics?.length ? ` [${e.topics.join(", ")}]` : "";
      return [
        `${e.contact_name || e.contact_email || "Unknown"} — ${age}`,
        `  Subject: ${e.subject}`,
        e.summary ? `  Summary: ${e.summary}` : null,
        `  Sentiment: ${e.sentiment || "neutral"}${topicStr}`,
      ].filter(Boolean).join("\n");
    });

    return `UNANSWERED EMAILS (${result.count})\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 7: Projects Needing Attention
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_attention_items", {
  title: "Projects Needing Attention",
  description:
    "Query the ACT Supabase database for projects flagged as needing attention based on health scores. Returns: project code, name, health status (critical/warning/healthy), overall score, momentum score, specific alerts, and when health was last calculated. ALWAYS use this tool instead of searching Notion pages when the user asks about: what needs attention, which projects are struggling, critical projects, project alerts, or 'what should I focus on'. Data source: v_projects_needing_attention view (project_health table). Example queries: 'What needs attention?', 'Which projects are critical?', 'Show me struggling projects', 'What should I focus on today?'",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter by project code. Pass null for all projects.",
      },
    },
    required: ["project_code"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string | null }) => {
    const result = await fetchProjectsNeedingAttention(getSupabase(), {
      project_code: params.project_code ?? undefined,
    });

    if (!result.count) return "No projects currently flagged as needing attention.";

    const lines = result.projects.map((p) => {
      const alertList = p.alerts.length
        ? `  Alerts: ${p.alerts.join("; ")}`
        : null;
      return [
        `[${p.health_status.toUpperCase()}] ${p.project_code} — ${p.project_name}`,
        `  Health: ${p.overall_score}/100 | Momentum: ${p.momentum_score}/100`,
        alertList,
        `  Last calculated: ${p.calculated_at ? new Date(p.calculated_at).toLocaleDateString() : "unknown"}`,
      ].filter(Boolean).join("\n");
    });

    return `PROJECTS NEEDING ATTENTION (${result.count})\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 8: Funding Pipeline
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_funding_pipeline", {
  title: "Funding Pipeline",
  description:
    "Query the ACT Supabase database for discovered funding opportunities with deadlines. Returns: opportunity name, funder, category, grant amount range, deadline, days until deadline, focus areas, relevance score, and number of linked applications. Sorted by deadline (soonest first). ALWAYS use this tool instead of searching Notion pages when the user asks about: funding opportunities, grants to apply for, funding pipeline, new grants, available funding, or 'what can we apply for'. Data source: v_funding_pipeline view (grant_opportunities + grant_applications). Example queries: 'What funding is available?', 'Show the pipeline', 'Any grants closing soon we haven't applied for?', 'What opportunities match our work?'",
  schema: {
    type: "object" as const,
    properties: {
      days_ahead: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Only show opportunities closing within N days (default: 90). Pass null for default.",
      },
      category: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter by category (e.g. 'arts', 'indigenous', 'technology'). Pass null for all.",
      },
    },
    required: ["days_ahead", "category"] as const,
    additionalProperties: false,
  },
  execute: async (params: { days_ahead: number | null; category: string | null }) => {
    const result = await fetchFundingPipeline(getSupabase(), {
      days_ahead: params.days_ahead ?? undefined,
      category: params.category ?? undefined,
    });

    if (result.count === 0) return `No funding opportunities closing within ${result.max_days} days.`;

    const lines = result.opportunities.map((o) => {
      const amount = o.max_grant_amount
        ? `$${(o.min_grant_amount || 0).toLocaleString()} – $${o.max_grant_amount.toLocaleString()}`
        : o.total_pool_amount
          ? `Pool: $${o.total_pool_amount.toLocaleString()}`
          : "Amount TBD";
      const focus = o.focus_areas?.length ? `  Focus: ${o.focus_areas.join(", ")}` : null;
      return [
        `${o.name} (${o.days_until_deadline}d remaining)`,
        `  Funder: ${o.funder_name || "Unknown"}`,
        `  Category: ${o.category || "General"} | ${amount}`,
        `  Deadline: ${o.deadline ? new Date(o.deadline).toLocaleDateString() : "TBD"}`,
        focus,
        `  Relevance: ${o.relevance_score || "N/A"}/100 | Applications: ${o.application_count || 0}`,
      ].filter(Boolean).join("\n");
    });

    return `FUNDING PIPELINE (${result.count} opportunities, next ${result.max_days} days)\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 9: Cash Flow
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_cashflow", {
  title: "Cash Flow Summary",
  description:
    "Query the ACT Supabase database for monthly cash flow data. Returns: month, income, expenses, net (income minus expenses), closing balance, whether the month is a projection, and confidence level for projections. Includes income and expense breakdowns by category. ALWAYS use this tool instead of searching Notion pages when the user asks about: cash flow, runway, burn rate, bank balance, monthly income/expenses, or financial projections. Data source: v_cashflow_summary view (xero_transactions aggregated). Example queries: 'What's our cash flow?', 'How much runway do we have?', 'Show monthly income and expenses', 'What's our burn rate?'",
  schema: {
    type: "object" as const,
    properties: {
      months: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Number of months to show (default: 6). Pass null for default.",
      },
    },
    required: ["months"] as const,
    additionalProperties: false,
  },
  execute: async (params: { months: number | null }) => {
    const supabase = getSupabase();
    const result = await fetchCashflow(supabase, {
      monthsHistory: params.months ?? 6,
    });

    if (!result.history.length) return "No cash flow data available.";

    const lines = result.history.map((m) => {
      const monthLabel = new Date(m.month).toLocaleDateString("en-AU", { month: "short", year: "numeric" });
      const proj = m.is_projection ? ` (PROJECTED, ${m.confidence || 0}% confidence)` : "";
      return [
        `${monthLabel}${proj}`,
        `  Income: $${m.income.toLocaleString()} | Expenses: $${m.expenses.toLocaleString()}`,
        `  Net: $${m.net.toLocaleString()} | Balance: $${m.closing_balance.toLocaleString()}`,
      ].join("\n");
    });

    return `CASH FLOW SUMMARY\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 10: Outstanding Invoices
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_outstanding_invoices", {
  title: "Outstanding Invoices",
  description:
    "Query the ACT Supabase database for unpaid invoices. Returns: invoice number, contact, project code, total amount, amount due, amount paid, due date, aging bucket (current/30/60/90+ days), and days overdue. Sorted by most overdue first. ALWAYS use this tool instead of searching Notion pages when the user asks about: invoices, money owed, accounts receivable, overdue payments, or 'who owes us money'. Data source: v_outstanding_invoices view (xero_invoices). Example queries: 'Any outstanding invoices?', 'Who owes us?', 'Show overdue invoices', 'What's in accounts receivable?'",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter by project code. Pass null for all projects.",
      },
    },
    required: ["project_code"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string | null }) => {
    const result = await fetchOutstandingInvoices(getSupabase(), {
      project_code: params.project_code ?? undefined,
    });

    if (!result.count) return "No outstanding invoices — all paid up!";

    const lines = result.invoices.map((inv) => {
      const overdue = inv.days_overdue > 0 ? ` (${inv.days_overdue}d overdue)` : "";
      return [
        `${inv.invoice_number || "No #"} — ${inv.contact_name || "Unknown"}${overdue}`,
        `  Project: ${inv.project_code || "Untagged"} | Type: ${inv.type || "invoice"}`,
        `  Total: $${Number(inv.total || 0).toLocaleString()} | Due: $${Number(inv.amount_due || 0).toLocaleString()} | Paid: $${Number(inv.amount_paid || 0).toLocaleString()}`,
        `  Due date: ${inv.due_date || "N/A"} | Aging: ${inv.aging_bucket || "current"}`,
      ].join("\n");
    });

    return `OUTSTANDING INVOICES (${result.count}, total due: $${result.totalDue.toLocaleString()})\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 11: Data Freshness
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_data_freshness", {
  title: "Data Freshness",
  description:
    "Query the ACT Supabase database for data freshness across all integrations. Returns: integration name, status (healthy/stale/error/unknown), last successful sync time, how long ago, record count, and any errors. Use to verify whether data in other tools is up-to-date. ALWAYS use this tool when the user asks about: data freshness, sync status, 'is the data current', 'when was the last sync', integration health, or 'why is this data old'. Data source: sync_status table. Example queries: 'Is my data fresh?', 'When did Gmail last sync?', 'Any stale integrations?', 'Show sync status'",
  schema: {
    type: "object" as const,
    properties: {
      integration: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter by integration name (e.g. 'gmail_sync'). Pass null for all.",
      },
    },
    required: ["integration"] as const,
    additionalProperties: false,
  },
  execute: async (params: { integration: string | null }) => {
    const result = await fetchDataFreshness(getSupabase(), {
      integration: params.integration ?? undefined,
    });

    const lines = result.integrations.map((s) => {
      return [
        `[${s.status}] ${s.name}`,
        s.last_sync
          ? `  Last sync: ${s.last_sync.replace("T", " ").slice(0, 19)} (${s.hours_ago}h ago)`
          : "  Last sync: never",
        s.record_count !== null ? `  Records: ${s.record_count}` : null,
        s.last_error ? `  Error: ${s.last_error}` : null,
      ].filter(Boolean).join("\n");
    });

    const header = result.staleCount > 0
      ? `DATA FRESHNESS — ${result.staleCount} integration(s) stale`
      : "DATA FRESHNESS — All integrations healthy";

    return `${header}\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 12: Email Triage
// ─────────────────────────────────────────────────────────────────────────

worker.tool("triage_emails", {
  title: "Triage Emails",
  description:
    "Query the ACT Supabase database to prioritize unanswered emails into tiers. Tier 1 (URGENT): emails from key contacts (partners/funders with tags). Tier 2 (RECENT): emails from the last 7 days. Tier 3 (BACKLOG): older emails from known contacts. Returns contact name, subject, days waiting, summary, and tier. ALWAYS use this tool instead of searching Notion pages when the user asks about: email triage, email priorities, 'what should I reply to first', prioritize emails, or inbox zero strategy. Data source: v_need_to_respond view + ghl_contacts tags. Example queries: 'Triage my emails', 'What should I reply to first?', 'Prioritize my inbox', 'Show urgent emails'",
  schema: {
    type: "object" as const,
    properties: {
      limit: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Max results per tier (default: 10). Pass null for default.",
      },
    },
    required: ["limit"] as const,
    additionalProperties: false,
  },
  execute: async (params: { limit: number | null }) => {
    const supabase = getSupabase();
    const max = params.limit ?? 10;
    const result = await triageEmails(supabase, { limit: max });
    if (!result.total) return "No unanswered emails — inbox is clear!";

    const formatTier = (label: string, items: typeof result.tier1) => {
      if (!items.length) return null;
      const lines = items.map((e) => {
        const age = e.days_since ? `${e.days_since}d ago` : "unknown";
        return [
          `  ${e.contact_name || e.contact_email || "Unknown"} — ${age}`,
          `    Subject: ${e.subject}`,
          e.summary ? `    Summary: ${e.summary}` : null,
        ].filter(Boolean).join("\n");
      });
      return `${label} (${items.length}):\n${lines.join("\n\n")}`;
    };

    const sections = [
      formatTier("TIER 1 — KEY CONTACTS (reply first)", result.tier1),
      formatTier("TIER 2 — RECENT (< 7 days)", result.tier2),
      formatTier("TIER 3 — BACKLOG", result.tier3),
    ].filter(Boolean);

    return `EMAIL TRIAGE (${result.total} total)\n${"─".repeat(40)}\n\n${sections.join("\n\n")}`;
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 13: Grant Readiness
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_grant_readiness", {
  title: "Grant Readiness",
  description:
    "Query the ACT Supabase database for grant application readiness. Returns per application: grant name, provider, fit score, amount, deadline, application status, lead contact, total requirements vs ready vs needed, and readiness percentage. Use to identify which grants are ready to submit vs which have gaps. ALWAYS use this tool instead of searching Notion pages when the user asks about: grant readiness, application progress, 'are we ready to submit', which grants have gaps, or 'what's missing for [grant]'. Data source: v_grant_readiness view (grant_applications + requirements). Example queries: 'Which grants are ready?', 'What's missing for the Snow Foundation grant?', 'Show grant readiness', 'Any grants 100% ready?'",
  schema: {
    type: "object" as const,
    properties: {
      min_readiness: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Only show grants with readiness >= this percentage (0-100). Pass null for all.",
      },
      status: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter by application status (e.g. 'draft', 'in_progress'). Pass null for all.",
      },
    },
    required: ["min_readiness", "status"] as const,
    additionalProperties: false,
  },
  execute: async (params: { min_readiness: number | null; status: string | null }) => {
    const result = await fetchGrantReadiness(getSupabase(), {
      min_readiness: params.min_readiness ?? undefined,
      status: params.status ?? undefined,
    });

    if (result.count === 0) return "No grant applications found matching criteria.";

    const lines = result.applications.map((g) => {
      const pct = g.readiness_pct;
      const icon = pct >= 100 ? "✅" : pct >= 75 ? "🟡" : "🔴";
      const deadline = g.closes_at ? `Deadline: ${g.closes_at}` : "No deadline";
      const amount = g.amount_max ? `$${Number(g.amount_max).toLocaleString()}` : "TBD";

      return [
        `${icon} ${g.grant_name} (${pct}% ready)`,
        `  Provider: ${g.provider || "Unknown"} | ${amount}`,
        `  Status: ${g.status} | ${deadline}`,
        `  Requirements: ${g.ready_count}/${g.total_requirements} complete, ${g.needed_count} needed`,
        g.lead_contact ? `  Lead: ${g.lead_contact}` : null,
        g.priority ? `  Priority: ${g.priority}` : null,
      ].filter(Boolean).join("\n");
    });

    const header = result.ready_count > 0
      ? `GRANT READINESS — ${result.ready_count}/${result.count} ready to submit`
      : `GRANT READINESS — ${result.count} applications, none fully ready`;

    return `${header}\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 14: Project Intelligence
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_project_intelligence", {
  title: "Project Intelligence",
  description:
    "Query the ACT Supabase database for comprehensive project intelligence. Returns: financial summary (FY revenue/expenses/net, burn rate, pipeline value), focus areas (current/upcoming/blocked), key relationships (top contacts with temperature/trend), recent activity (emails/transactions/knowledge/meetings), health scores, and recent knowledge items. ALWAYS use this tool instead of searching Notion pages when the user asks about: 'what's happening with [project]', project overview, project status, project summary, or 'give me the full picture on [project]'. Data source: project_intelligence_snapshots + project_focus_areas + project_health + project_knowledge + relationship_health tables. Example queries: 'What's happening with ACT-EL?', 'Give me the full picture on Harvest', 'Summarize JusticeHub', 'What's the status of ACT-HV?'",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "ACT project code (e.g. ACT-EL, ACT-HV, ACT-JH, ACT-GD, ACT-FM, ACT-HQ). Pass null to list available projects.",
      },
    },
    required: ["project_code"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string | null }) => {
    if (!params.project_code) return "Available projects: ACT-EL (Empathy Ledger), ACT-GD (Goods on Country), ACT-HV (The Harvest), ACT-JH (JusticeHub), ACT-FM (ACT Farm), ACT-HQ (Operations), ACT-AR (Art). Ask about a specific project by code.";
    const supabase = getSupabase();
    const result = await fetchProjectIntelligence(supabase, { project_code: params.project_code });

    const sections: string[] = [];
    sections.push(`PROJECT INTELLIGENCE: ${result.project_code}`);
    sections.push("─".repeat(40));

    // Financials
    if (result.financials) {
      const f = result.financials;
      const finLines: string[] = [
        `\nFINANCIALS (FY):`,
        `  Revenue: $${f.fy_revenue.toLocaleString()}`,
        `  Expenses: $${f.fy_expenses.toLocaleString()}`,
        `  Net: $${f.fy_net.toLocaleString()}`,
      ];
      if (f.monthly_burn_rate) finLines.push(`  Burn rate: $${f.monthly_burn_rate.toLocaleString()}/mo`);
      if (f.pipeline_value) finLines.push(`  Pipeline: $${f.pipeline_value.toLocaleString()}`);
      sections.push(...finLines);
    }

    // Health
    if (result.health) {
      const h = result.health;
      sections.push(
        `\nHEALTH SCORES:`,
        `  Overall: ${h.health_score}/100 | Momentum: ${h.momentum_score}/100`,
        `  Engagement: ${h.engagement_score}/100 | Financial: ${h.financial_score}/100 | Timeline: ${h.timeline_score}/100`,
      );
    }

    // Focus areas
    const current = result.focus_areas.filter((f) => f.status === "current");
    const blocked = result.focus_areas.filter((f) => f.status === "blocked");
    const upcoming = result.focus_areas.filter((f) => f.status === "upcoming");

    if (current.length || blocked.length || upcoming.length) {
      sections.push(`\nFOCUS AREAS:`);
      if (current.length) {
        sections.push(`  Current:`);
        current.forEach((f) => sections.push(`    - ${f.title}${f.description ? `: ${f.description}` : ""}`));
      }
      if (blocked.length) {
        sections.push(`  Blocked:`);
        blocked.forEach((f) => sections.push(`    - ${f.title}${f.description ? `: ${f.description}` : ""}`));
      }
      if (upcoming.length) {
        sections.push(`  Upcoming:`);
        upcoming.forEach((f) => {
          const target = f.target_date ? ` (target: ${f.target_date})` : "";
          sections.push(`    - ${f.title}${target}`);
        });
      }
    }

    // Relationships
    if (result.relationships.length) {
      sections.push(`\nKEY RELATIONSHIPS (${result.relationships.length}):`);
      result.relationships.forEach((r) => {
        const trend = r.temperature_trend ? ` (${r.temperature_trend})` : "";
        const company = r.company_name ? ` — ${r.company_name}` : "";
        sections.push(`  - ${r.contact_name}${company}: temp ${r.temperature || "?"}/100${trend}`);
      });
    }

    // Grants
    if (result.grants.length) {
      const totalPipeline = result.grants.reduce((s, g) => s + (g.amount_requested || 0), 0);
      sections.push(`\nACTIVE GRANTS (${result.grants.length}, $${totalPipeline.toLocaleString()} pipeline):`);
      result.grants.forEach((g) => {
        sections.push(`  - ${g.application_name} (${g.status}) — $${(g.amount_requested || 0).toLocaleString()}`);
      });
    }

    // Recent knowledge
    if (result.recent_knowledge.length) {
      sections.push(`\nRECENT KNOWLEDGE (${result.recent_knowledge.length}):`);
      result.recent_knowledge.slice(0, 5).forEach((k) => {
        const date = k.recorded_at ? k.recorded_at.split("T")[0] : "";
        const action = k.action_required ? " [ACTION REQUIRED]" : "";
        sections.push(`  - [${k.knowledge_type}] ${k.title} (${date})${action}`);
      });
    }

    // Recent wins / blockers
    if (result.recent_wins.length) {
      sections.push(`\nRECENT WINS:`);
      result.recent_wins.forEach((w) => sections.push(`  - ${w}`));
    }
    if (result.blockers.length) {
      sections.push(`\nBLOCKERS:`);
      result.blockers.forEach((b) => sections.push(`  - ${b}`));
    }

    return sections.filter(Boolean).join("\n");
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 15: Explain Cash Flow
// ─────────────────────────────────────────────────────────────────────────

worker.tool("explain_cashflow", {
  title: "Explain Cash Flow",
  description:
    "Query the ACT Supabase database for monthly cash flow with explanations. Returns: monthly income, expenses, net, closing balance, change from prior month, and auto-generated variance explanations. ALWAYS use this tool when the user asks about: 'why did our balance change', cash flow explanation, monthly comparison, 'what happened financially this month', or balance changes. Data source: v_cashflow_explained view (v_cashflow_summary + financial_variance_notes). Example queries: 'Why did our balance drop?', 'Explain this month's finances', 'Compare income month over month', 'What's driving our expenses?'",
  schema: {
    type: "object" as const,
    properties: {
      months: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Number of months to show (default: 6). Pass null for default.",
      },
    },
    required: ["months"] as const,
    additionalProperties: false,
  },
  execute: async (params: { months: number | null }) => {
    const result = await fetchCashflowExplained(getSupabase(), {
      months: params.months ?? undefined,
    });

    if (!result.months.length) return "No cash flow data available.";

    const lines = result.months.map((m) => {
      const monthLabel = new Date(m.month).toLocaleDateString("en-AU", { month: "short", year: "numeric" });
      const incChange = m.income_change != null ? ` (${m.income_change >= 0 ? "+" : ""}$${m.income_change.toLocaleString()})` : "";
      const expChange = m.expense_change != null ? ` (${m.expense_change >= 0 ? "+" : ""}$${m.expense_change.toLocaleString()})` : "";

      const lines2 = [
        `${monthLabel}`,
        `  Income: $${m.income.toLocaleString()}${incChange}`,
        `  Expenses: $${m.expenses.toLocaleString()}${expChange}`,
        `  Net: $${m.net.toLocaleString()} | Balance: $${m.closing_balance.toLocaleString()}`,
      ];

      if (m.explanations?.length) {
        for (const e of m.explanations) {
          lines2.push(`  → ${e}`);
        }
      }

      return lines2.join("\n");
    });

    return `CASH FLOW EXPLAINED\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 16: Project P&L
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_project_pnl", {
  title: "Project P&L",
  description:
    "Query the ACT Supabase database for monthly profit & loss for a specific project. Returns: monthly revenue, expenses, net, expense/revenue breakdowns by category, FY year-to-date totals, and transaction counts. ALWAYS use this tool when the user asks about: project P&L, project profit and loss, 'how much did we spend on [project]', project financial breakdown, or 'show me [project] expenses by category'. Data source: project_monthly_financials table. Example queries: 'P&L for ACT-GD', 'What did we spend on Goods?', 'Harvest financial breakdown', 'Show ACT-EL expenses by category'",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        type: "string" as const,
        description: "ACT project code (e.g. ACT-EL, ACT-HV, ACT-GD)",
      },
      months: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Number of months to show (default: 12). Pass null for default.",
      },
    },
    required: ["project_code", "months"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string; months: number | null }) => {
    const result = await fetchProjectPnl(getSupabase(), {
      project_code: params.project_code,
      months: params.months ?? undefined,
    });

    if (!result.months.length) return `No monthly financial data for ${params.project_code.toUpperCase()}. Run the monthly calculation first.`;

    const lines = result.months.map((m) => {
      const label = new Date(m.month).toLocaleDateString("en-AU", { month: "short", year: "numeric" });
      const topExp = Object.entries(m.expense_breakdown).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cat, amt]) => `${cat}: $${amt.toLocaleString()}`).join(", ");
      return [
        `${label}: Revenue $${m.revenue.toLocaleString()} | Expenses $${m.expenses.toLocaleString()} | Net $${m.net.toLocaleString()}`,
        topExp ? `  Top expenses: ${topExp}` : null,
      ].filter(Boolean).join("\n");
    });

    const lastMonth = result.months[result.months.length - 1];
    const header = [
      `PROJECT P&L: ${result.project_code}`,
      "─".repeat(40),
      `Period total: Revenue $${result.totalRevenue.toLocaleString()} | Expenses $${result.totalExpenses.toLocaleString()} | Net $${(result.totalRevenue - result.totalExpenses).toLocaleString()}`,
      lastMonth?.fy_ytd_revenue != null ? `FY YTD: Revenue $${lastMonth.fy_ytd_revenue.toLocaleString()} | Expenses $${(lastMonth.fy_ytd_expenses ?? 0).toLocaleString()} | Net $${(lastMonth.fy_ytd_net ?? 0).toLocaleString()}` : null,
      "",
    ].filter(Boolean).join("\n");

    return `${header}\n${lines.join("\n\n")}`;
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL 17: Unified Pipeline Value
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

worker.tool("get_pipeline_value", {
  title: "Get Pipeline Value",
  description:
    "Returns the total weighted pipeline value by opportunity type and stage. " +
    "Shows how much potential revenue is in each stage of the pipeline across grants, deals, investments, and other types. " +
    "Use when asked about pipeline value, opportunity totals, or revenue potential.",
  schema: {
    type: "object" as const,
    properties: {
      type: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description:
          "Filter by opportunity type: grant, deal, investment, land_equity, community_capital, donation, earned_revenue. Pass null for all.",
      },
    },
    required: ["type"] as const,
    additionalProperties: false,
  },
  execute: async (params: { type: string | null }) => {
    const result = await fetchPipelineValue(getSupabase(), {
      type: params.type ?? undefined,
    });

    if (!result.totalCount) return "No active opportunities in the pipeline.";

    const sections: string[] = [
      "PIPELINE VALUE SUMMARY",
      "─".repeat(40),
      `Total opportunities: ${result.totalCount}`,
      `Unweighted value: $${result.totalUnweighted.toLocaleString()}`,
      `Weighted value (probability-adjusted): $${result.totalWeighted.toLocaleString()}`,
      "",
      "BY TYPE:",
    ];

    for (const [t, v] of Object.entries(result.byType)) {
      sections.push(
        `  ${t}: ${v.count} opps | $${v.total.toLocaleString()} total | $${v.weighted.toLocaleString()} weighted`
      );
    }

    sections.push("", "BY STAGE:");
    const stageOrder = ["identified", "researching", "pursuing", "submitted", "negotiating", "approved"];
    for (const s of stageOrder) {
      if (result.byStage[s]) {
        sections.push(
          `  ${s}: ${result.byStage[s].count} opps | $${result.byStage[s].total.toLocaleString()} | $${result.byStage[s].weighted.toLocaleString()} weighted`
        );
      }
    }

    return sections.join("\n");
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL 18: Revenue Forecast
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

worker.tool("get_revenue_forecast", {
  title: "Get Revenue Forecast",
  description:
    "Returns 10-year revenue projections across Conservative, Moderate, and Aggressive scenarios. " +
    "Shows annual targets by revenue stream and growth assumptions. " +
    "Use when asked about revenue planning, financial forecasts, growth projections, or long-term financial outlook.",
  schema: {
    type: "object" as const,
    properties: {
      scenario: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description:
          "Specific scenario to show: conservative, moderate, aggressive. Pass null for all three.",
      },
    },
    required: ["scenario"] as const,
    additionalProperties: false,
  },
  execute: async (params: { scenario: string | null }) => {
    const result = await fetchRevenueForecast(getSupabase(), {
      scenario: params.scenario ?? undefined,
    });

    if (!result.scenarios.length) return "No revenue scenarios configured. Run: node scripts/build-revenue-scenarios.mjs";

    const sections: string[] = [
      "10-YEAR REVENUE FORECAST",
      "─".repeat(40),
    ];

    for (const s of result.scenarios) {
      sections.push("");
      sections.push(`${s.name.toUpperCase()}: ${s.description}`);
      const years = Object.keys(s.annual_targets).sort();
      const firstYear = years[0] ?? "?";
      const lastYear = years[years.length - 1] ?? "?";
      const firstVal = s.annual_targets[firstYear] ?? 0;
      const lastVal = s.annual_targets[lastYear] ?? 0;
      const totalGrowth = firstVal > 0 ? `${Math.round(((lastVal - firstVal) / firstVal) * 100)}%` : "N/A";
      sections.push(`  ${firstYear}-${lastYear} | Total growth: ${totalGrowth}`);
      for (const [y, v] of Object.entries(s.annual_targets)) {
        sections.push(`  ${y}: $${v.toLocaleString()}`);
      }
      if (Object.keys(s.assumptions).length > 0) {
        sections.push(`  Assumptions: ${JSON.stringify(s.assumptions)}`);
      }
    }

    return sections.join("\n");
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL 19: Suggest Transaction Fixes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

worker.tool("suggest_transaction_fixes", {
  title: "Suggest Transaction Fixes",
  description:
    "Identifies financial data issues: unmapped transactions (no project code), " +
    "potential duplicate subscriptions, and vendor anomalies. " +
    "Use when asked about transaction issues, data quality, unmapped expenses, or financial cleanup.",
  schema: {
    type: "object" as const,
    properties: {
      limit: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Max issues to return (default: 20). Pass null for default.",
      },
    },
    required: ["limit"] as const,
    additionalProperties: false,
  },
  execute: async (params: { limit: number | null }) => {
    const result = await fetchTransactionFixes(getSupabase(), {
      limit: params.limit ?? undefined,
    });

    const sections: string[] = [
      "TRANSACTION FIX SUGGESTIONS",
      "─".repeat(40),
    ];

    sections.push("");
    sections.push(`UNMAPPED TRANSACTIONS: ${result.unmapped.total} found`);
    if (result.unmapped.withSuggestion.length > 0) {
      sections.push(`  Auto-fixable (${result.unmapped.withSuggestion.length}):`);
      for (const u of result.unmapped.withSuggestion.slice(0, 10)) {
        sections.push(
          `    ${u.date} | ${u.contact_name} | $${Math.abs(u.total).toLocaleString()} → ${u.suggested_project} (${u.suggested_category || "general"})`
        );
      }
    }
    if (result.unmapped.withoutSuggestion.length > 0) {
      sections.push(`  Need manual tagging (${result.unmapped.withoutSuggestion.length}):`);
      for (const u of result.unmapped.withoutSuggestion.slice(0, 5)) {
        sections.push(
          `    ${u.date} | ${u.contact_name} | $${Math.abs(u.total).toLocaleString()}`
        );
      }
    }

    if (result.duplicates.length > 0) {
      sections.push("");
      sections.push(`POTENTIAL DUPLICATE SUBSCRIPTIONS: ${result.duplicates.length}`);
      for (const d of result.duplicates.slice(0, 5)) {
        sections.push(`  ${d.contact_name}: ${d.count}x in period ($${d.total})`);
      }
    }

    if (result.criticalVariances.length > 0) {
      sections.push("");
      sections.push(`CRITICAL VARIANCES: ${result.criticalVariances.length}`);
      for (const v of result.criticalVariances) {
        sections.push(
          `  ${v.project_code || "Org-wide"} (${v.month}): ${v.variance_type} — ${v.explanation}`
        );
      }
    }

    return sections.join("\n");
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL 20: Impact Summary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

worker.tool("get_impact_summary", {
  title: "Get Impact Summary",
  description:
    "Returns aggregated impact metrics across all projects or a specific project. " +
    "Shows people reached, revenue generated, stories collected, events held, and other impact data. " +
    "Use when asked about impact, outcomes, community reach, or social metrics.",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter by project code (e.g. ACT-EL). Pass null for all projects.",
      },
    },
    required: ["project_code"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string | null }) => {
    const result = await fetchImpactSummary(getSupabase(), {
      project_code: params.project_code ?? undefined,
    });

    if (!result.totalMetrics) {
      return params.project_code
        ? `No impact metrics recorded for ${params.project_code}. Run: node scripts/extract-impact-metrics.mjs`
        : "No impact metrics recorded yet. Run: node scripts/extract-impact-metrics.mjs";
    }

    const sections: string[] = [
      params.project_code ? `IMPACT SUMMARY: ${params.project_code}` : "IMPACT SUMMARY: All Projects",
      "─".repeat(40),
      `${result.totalMetrics} metrics recorded (${result.verifiedCount} verified)`,
      "",
    ];

    for (const m of result.metrics) {
      sections.push(
        `${m.type.replace(/_/g, " ").toUpperCase()}: ${m.total.toLocaleString()} ${m.unit}`
      );
      if (!params.project_code && m.projects.length > 1) {
        sections.push(`  Projects: ${m.projects.join(", ")}`);
      }
    }

    return sections.join("\n");
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOOL 21: Knowledge Graph Search
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

worker.tool("search_knowledge_graph", {
  title: "Search Knowledge Graph",
  description:
    "Searches the ACT knowledge base by keywords and returns matching knowledge items with related links. " +
    "Covers meeting notes, decisions, research, action items, and learnings across all projects. " +
    "Use when asked to find information, past decisions, meeting notes, or any organisational knowledge.",
  schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string" as const,
        description: "Search query — keywords, topic, or question.",
      },
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter by project code. Pass null for all.",
      },
      limit: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Max results (default: 10). Pass null for default.",
      },
    },
    required: ["query", "project_code", "limit"] as const,
    additionalProperties: false,
  },
  execute: async (params: {
    query: string;
    project_code: string | null;
    limit: number | null;
  }) => {
    const supabase = getSupabase();
    const result = await searchKnowledge(supabase, {
      query: params.query,
      project_code: params.project_code ?? undefined,
      limit: params.limit ?? undefined,
      includeLinks: true,
    });

    if (!result.count) return `No knowledge found matching "${params.query}".`;

    const sections: string[] = [
      `KNOWLEDGE SEARCH: "${params.query}"`,
      "─".repeat(40),
      `Found ${result.count} results`,
      "",
    ];

    for (const item of result.items) {
      const date = item.recorded_at
        ? new Date(item.recorded_at).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
            year: "2-digit",
          })
        : "Unknown";
      const topics = item.topics?.length
        ? ` [${item.topics.slice(0, 3).join(", ")}]`
        : "";
      const summary = item.summary || item.content_preview || "";

      sections.push(`${item.title || "Untitled"} (${item.type})`);
      sections.push(`  Project: ${item.project_code} | Date: ${date}${topics}`);
      if (summary) sections.push(`  ${summary.substring(0, 200)}`);

      if (item.links?.length) {
        sections.push(
          `  Links: ${item.links.map((l) => `${l.link_type}${l.reason ? ` (${l.reason})` : ""}`).join(", ")}`
        );
      }

      sections.push("");
    }

    return sections.join("\n");
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 22: Weekly Financial Review
// ─────────────────────────────────────────────────────────────────────────

worker.tool("run_weekly_financial_review", {
  title: "Weekly Financial Review",
  description:
    "Generate a comprehensive weekly financial review for the ACT ecosystem. Returns: cash position & runway, weekly income/expenses with top items, overdue invoices with aging buckets, receipt gap score, top 5 projects by spend, grant deadlines, R&D eligible spend, data quality coverage, and auto-generated action items. ALWAYS use this tool when the user asks about: weekly review, financial overview, 'how are we doing financially', 'weekly check-in', financial health, or 'what needs attention'. This is the single most comprehensive financial summary tool. Data sources: financial_snapshots, xero_transactions, xero_invoices, vendor_project_rules, grant_applications, grant_opportunities, projects.",
  schema: {
    type: "object" as const,
    properties: {
      include_details: {
        anyOf: [{ type: "boolean" as const }, { type: "null" as const }],
        description: "Include detailed line items in each section. Default true. Pass false for a summary-only view.",
      },
    },
    required: ["include_details"] as const,
    additionalProperties: false,
  },
  execute: async (params: { include_details: boolean | null }) => {
    const result = await fetchWeeklyFinancialReview(getSupabase());

    const f = (n: number) => `$${Math.round(n).toLocaleString()}`;
    const sections = [
      `WEEKLY FINANCIAL REVIEW — Week of ${result.weekOf}`,
      "═".repeat(50),
      "",
      `1. CASH POSITION`,
      `   Balance: ${f(result.cashPosition.balance)} (${result.cashPosition.balanceChange >= 0 ? "+" : ""}${f(result.cashPosition.balanceChange)} this month)`,
      `   Burn rate: ${f(result.cashPosition.burnRate)}/mo | Runway: ${result.cashPosition.runway} months`,
      "",
      `2. THIS WEEK`,
      `   Income: ${f(result.thisWeek.income)} | Expenses: ${f(result.thisWeek.expenses)} | Net: ${result.thisWeek.income - result.thisWeek.expenses >= 0 ? "+" : ""}${f(result.thisWeek.income - result.thisWeek.expenses)}`,
      ...(result.thisWeek.topIncome.length > 0 ? [`   Top income: ${result.thisWeek.topIncome.map(([n, a]) => `${n} (${f(a)})`).join(", ")}`] : []),
      ...(result.thisWeek.topExpenses.length > 0 ? [`   Top expenses: ${result.thisWeek.topExpenses.map(([n, a]) => `${n} (${f(a)})`).join(", ")}`] : []),
      "",
      `3. OVERDUE INVOICES (${result.overdueInvoices.count} overdue, ${f(result.overdueInvoices.totalDue)} due)`,
      `   Aging: Current ${f(result.overdueInvoices.buckets.current)} | 1-30d ${f(result.overdueInvoices.buckets["1-30d"])} | 31-60d ${f(result.overdueInvoices.buckets["31-60d"])} | 61-90d ${f(result.overdueInvoices.buckets["61-90d"])} | 90d+ ${f(result.overdueInvoices.buckets["90d+"])}`,
      ...(result.overdueInvoices.items.length > 0 ? result.overdueInvoices.items.slice(0, 10).map(i => `  ${i.contact_name || "Unknown"} — $${i.amount_due.toLocaleString()} (${i.days_overdue}d overdue) [${i.invoice_number}]`) : ["   All current — no overdue invoices!"]),
      "",
      `4. RECEIPT GAP`,
      `   Score: ${result.receiptGap.score}% (${result.receiptGap.matched} of ${result.receiptGap.total} matched, ${result.receiptGap.missing} missing)`,
      "",
      `5. PROJECT SPEND (this week)`,
      ...(result.projectSpend.length > 0
        ? result.projectSpend.map((ps) => `   ${ps.code}: ${f(ps.amount)}`)
        : ["   No project spend this week"]),
      "",
      `6. GRANT DEADLINES (next 14 days)`,
      ...(result.grantDeadlines.length > 0 ? result.grantDeadlines.map(g => `  ${g.application_name}: ${g.milestone_name} — ${g.days_remaining}d remaining`) : ["   No upcoming deadlines"]),
      "",
      `7. R&D SPEND`,
      `   This week: ${f(result.rdSpend.thisWeek)} | YTD: ${f(result.rdSpend.ytd)} | 43.5% offset: ${f(result.rdSpend.ytd * 0.435)}`,
      "",
      `8. DATA QUALITY`,
      `   Tagging coverage: ${result.dataQuality.coverage}% (${result.dataQuality.untagged} untagged of ${result.dataQuality.total})`,
      "",
      `9. ACTION ITEMS`,
      ...(result.actionItems.length > 0 ? result.actionItems.map(a => `   → ${a.description}`) : ["   No urgent actions this week"]),
    ];

    return sections.join("\n");
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Wave 9 — Meeting Intelligence
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

worker.tool("query_meeting_notes", {
  title: "Query Meeting Notes",
  description:
    "Search meetings by project, participant, date range, or keyword. Returns title, date, participants, AI summary, action items, and decisions. Optionally includes full transcript.",
  schema: {
    type: "object" as const,
    properties: {
      query: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Free-text search across meeting titles and content. Pass null to skip text search.",
      },
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter by project code (e.g. 'ACT-BCV', 'ACT-GD'). Pass null for all projects.",
      },
      participant: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter by participant name. Pass null for all participants.",
      },
      days_back: {
        type: "number" as const,
        description: "How many days back to search. Default 30.",
      },
      include_transcript: {
        type: "boolean" as const,
        description: "Include full transcript in results (can be very long). Default false.",
      },
      limit: {
        type: "number" as const,
        description: "Max meetings to return. Default 10.",
      },
    },
    required: ["query", "project_code", "participant", "days_back", "include_transcript", "limit"] as const,
    additionalProperties: false,
  },
  execute: async (params: {
    query: string | null;
    project_code: string | null;
    participant: string | null;
    days_back: number;
    include_transcript: boolean;
    limit: number;
  }) => {
    const result = await searchMeetings(getSupabase(), {
      query: params.query ?? undefined,
      project_code: params.project_code ?? undefined,
      participant: params.participant ?? undefined,
      days_back: params.days_back || 30,
      include_transcript: params.include_transcript,
      limit: params.limit || 10,
    });

    if (!result.count) return "No meetings found matching your criteria.";

    const lines: string[] = [`MEETING NOTES — ${result.count} results (last ${params.days_back || 30} days)`, ""];

    for (const m of result.meetings) {
      const duration = m.duration ? ` (${m.duration} min)` : "";
      const participants = m.participants.join(", ") || "unknown";

      lines.push(`━━━ ${m.title || "Untitled"} ━━━`);
      lines.push(`Date: ${m.date}${duration} | Project: ${m.project_code || "unassigned"}`);
      if (m.source_url) lines.push(`Notion: ${m.source_url}`);
      lines.push(`Participants: ${participants}`);
      if (m.summary) lines.push(`Summary: ${m.summary}`);
      if (m.ai_action_items?.length) {
        lines.push("Action items:");
        for (const item of m.ai_action_items.slice(0, 5)) {
          const check = item.completed ? "x" : " ";
          lines.push(`  [${check}] ${item.action}`);
        }
      }
      if (m.strategic_relevance) lines.push(`Strategic: ${m.strategic_relevance}`);
      if (m.transcript) {
        const truncated = m.transcript.length > 4000 ? m.transcript.slice(0, 4000) + "\n... [truncated]" : m.transcript;
        lines.push(`\nTranscript:\n${truncated}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  },
});

worker.tool("get_meeting_actions", {
  title: "Get Meeting Action Items",
  description:
    "Returns open action items extracted from meetings. Shows what was agreed, who is responsible, and what needs follow-up. Includes both AI-extracted and LLM-extracted actions.",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter by project code. Pass null for all projects.",
      },
      days_back: {
        type: "number" as const,
        description: "How many days back to search. Default 30.",
      },
      include_completed: {
        type: "boolean" as const,
        description: "Include completed action items. Default false.",
      },
    },
    required: ["project_code", "days_back", "include_completed"] as const,
    additionalProperties: false,
  },
  execute: async (params: {
    project_code: string | null;
    days_back: number;
    include_completed: boolean;
  }) => {
    const result = await fetchMeetingActions(getSupabase(), {
      project_code: params.project_code ?? undefined,
      days_back: params.days_back || 30,
      include_completed: params.include_completed,
    });

    if (!result.totalCount) return "No meeting action items found for the specified criteria.";

    const lines: string[] = [`MEETING ACTION ITEMS — Last ${params.days_back || 30} days`, ""];

    if (result.aiActions.length) {
      lines.push("── From AI Transcription ──");
      for (const group of result.aiActions) {
        lines.push(`\n${group.meeting_title} (${group.date}) [${group.project_code}]`);
        if (group.source_url) lines.push(`  Notion: ${group.source_url}`);
        for (const item of group.items) {
          const check = item.completed ? "x" : " ";
          lines.push(`  [${check}] ${item.action}`);
        }
      }
      lines.push("");
    }

    if (result.extractedActions.length) {
      lines.push("── From Intelligence Extraction ──");
      for (const a of result.extractedActions) {
        const priority = a.importance === "high" ? " [HIGH]" : "";
        lines.push(`  ${priority} ${a.title}`);
        lines.push(`    From: ${a.date} [${a.project_code}] | Assignee: ${a.assignee || "Unassigned"}`);
      }
      lines.push("");
    }

    lines.push(`Total: ${result.totalCount} action items`);
    return lines.join("\n");
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 25: Receipt Pipeline Status
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_receipt_pipeline", {
  title: "Receipt Pipeline Status",
  description:
    "Returns the current state of the receipt-to-reconciliation pipeline. Shows how many transactions are at each stage (missing receipt, forwarded to Dext, Dext processed, Xero bill created, reconciled), stuck items (> 14 days), high-value unreconciled transactions, and reconciliation rate. Use when asked about: receipt status, missing receipts, reconciliation progress, Dext forwarding, bookkeeping gaps. Data source: receipt_pipeline_status + xero_transactions tables.",
  schema: {
    type: "object" as const,
    properties: {
      stage: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter to specific stage: missing_receipt, forwarded_to_dext, dext_processed, xero_bill_created, reconciled. Pass null for full summary.",
      },
    },
    required: ["stage"] as const,
    additionalProperties: false,
  },
  execute: async (params: { stage: string | null }) => {
    const result = await fetchReceiptPipeline(getSupabase(), {
      stage: params.stage || undefined,
      includeStuck: true,
    });

    const stageLabels: Record<string, string> = {
      missing_receipt: "Missing Receipt",
      forwarded_to_dext: "Forwarded to Dext",
      dext_processed: "Dext Processed",
      xero_bill_created: "Xero Bill Created",
      reconciled: "Reconciled",
    };

    const lines: string[] = ["═══ Receipt Pipeline Status ═══", ""];

    lines.push("── Pipeline Funnel ──");
    for (const s of result.stages) {
      const stuckLabel = s.stuck_count > 0 ? ` ⚠️ ${s.stuck_count} stuck` : "";
      lines.push(`  ${stageLabels[s.stage] || s.stage}: ${s.count} ($${s.amount.toLocaleString()})${stuckLabel}`);
    }
    lines.push("");

    lines.push("── Summary ──");
    lines.push(`  Total tracked: ${result.total_items}`);
    lines.push(`  Reconciliation rate: ${result.reconciliation_rate}%`);
    lines.push(`  Reconciled: ${result.stages.find(s => s.stage === "reconciled")?.count || 0}`);
    lines.push("");

    if (result.alerts.length > 0) {
      lines.push("── Alerts ──");
      for (const a of result.alerts) {
        lines.push(`  ⚠️ ${a}`);
      }
      lines.push("");
    }

    if (result.stuck_items.length > 0) {
      lines.push("── Stuck Items ──");
      for (const item of result.stuck_items) {
        lines.push(`  ${item.vendor}: $${item.amount.toLocaleString()} (${item.date}) — ${stageLabels[item.stage] || item.stage} (${item.days_stuck}d)`);
      }
    }

    return lines.join("\n");
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Wave 11 — Grants Agent Tools
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─────────────────────────────────────────────────────────────────────────
// TOOL 26: Update Grant Status
// ─────────────────────────────────────────────────────────────────────────

worker.tool("update_grant_status", {
  title: "Update Grant Status",
  description:
    "Update the application status of a grant opportunity from Notion chat. Fuzzy-matches the grant name and updates the status. Use when the user says things like 'mark SCC grant as submitted', 'we got the Ian Potter grant', 'decline the Perpetual grant'. Valid statuses: reviewing, in_progress, submitted, successful, unsuccessful. Data source: grant_opportunities table.",
  schema: {
    type: "object" as const,
    properties: {
      grant_name: {
        type: "string" as const,
        description: "Name or partial name of the grant to update",
      },
      new_status: {
        type: "string" as const,
        description: "New application status: reviewing, in_progress, submitted, successful, unsuccessful",
      },
    },
    required: ["grant_name", "new_status"] as const,
    additionalProperties: false,
  },
  execute: async (params: { grant_name: string; new_status: string }) => {
    const validStatuses = ["reviewing", "in_progress", "submitted", "successful", "unsuccessful"];
    if (!validStatuses.includes(params.new_status)) {
      return `Invalid status "${params.new_status}". Must be one of: ${validStatuses.join(", ")}`;
    }

    const supabase = getSupabase();

    // Fuzzy match: search by ilike
    const { data: grants, error } = await supabase
      .from("grant_opportunities")
      .select("id, name, application_status, provider")
      .ilike("name", `%${params.grant_name}%`)
      .limit(5);

    if (error) return `Error: ${error.message}`;
    if (!grants?.length) return `No grants found matching "${params.grant_name}".`;

    if (grants.length > 1) {
      const list = grants.map((g: any) => `  - ${g.name} (${g.provider || "unknown provider"}) — currently: ${g.application_status}`).join("\n");
      return `Multiple matches found. Please be more specific:\n${list}`;
    }

    const grant = grants[0] as any;
    const oldStatus = grant.application_status;

    const { error: updateErr } = await supabase
      .from("grant_opportunities")
      .update({
        application_status: params.new_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", grant.id);

    if (updateErr) return `Error updating: ${updateErr.message}`;

    return `Updated "${grant.name}" status: ${oldStatus} → ${params.new_status}`;
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 27: Get Grant Requirements
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_grant_requirements", {
  title: "Get Grant Requirements",
  description:
    "Show what's needed for a specific grant application — eligibility criteria, assessment criteria, required documents, readiness score, and gaps. Use when the user asks 'what do I need for the SCC grant', 'show requirements for Ian Potter', 'am I ready to apply for [grant]'. Data source: grant_opportunities + grant_application_requirements tables.",
  schema: {
    type: "object" as const,
    properties: {
      grant_name: {
        type: "string" as const,
        description: "Name or partial name of the grant to look up",
      },
    },
    required: ["grant_name"] as const,
    additionalProperties: false,
  },
  execute: async (params: { grant_name: string }) => {
    const result = await fetchGrantRequirements(getSupabase(), {
      grant_name: params.grant_name,
    });

    if (!result.grants.length) return `No grants found matching "${params.grant_name}".`;

    const results: string[] = [];
    for (const grant of result.grants) {
      const lines: string[] = [
        `━━━ ${grant.name} ━━━`,
        `Provider: ${grant.provider || "Unknown"}`,
        `Status: ${grant.status || "not_applied"}`,
        grant.deadline ? `Deadline: ${grant.deadline}` : null,
        grant.amount ? `Amount: up to $${grant.amount.toLocaleString()}` : null,
        grant.url ? `URL: ${grant.url}` : null,
        grant.aligned_projects?.length ? `Projects: ${grant.aligned_projects.join(", ")}` : null,
      ].filter(Boolean) as string[];

      if (grant.eligibility.length) {
        lines.push("", "ELIGIBILITY CRITERIA:");
        for (const r of grant.eligibility) {
          const check = r.is_met ? "x" : " ";
          lines.push(`  [${check}] ${r.description}`);
        }
      }
      if (grant.assessment.length) {
        lines.push("", "ASSESSMENT CRITERIA:");
        for (const r of grant.assessment) {
          lines.push(`  - ${r.description}`);
        }
      }
      if (grant.documents.length) {
        lines.push("", "REQUIRED DOCUMENTS:");
        for (const r of grant.documents) {
          const check = r.is_met ? "x" : " ";
          lines.push(`  [${check}] ${r.description}`);
        }
      }

      if (grant.readiness_pct !== null) {
        lines.push("", `READINESS: ${grant.readiness_pct}%`);
      }

      if (grant.act_readiness?.score != null) {
        lines.push(`ACT Fit Score: ${grant.act_readiness.score}%`);
      }
      if (grant.act_readiness?.gaps?.length) {
        lines.push("", "GAPS:");
        for (const gap of grant.act_readiness.gaps) {
          lines.push(`  - ${gap}`);
        }
      }

      if (!grant.eligibility.length && !grant.assessment.length && !grant.documents.length && grant.act_readiness?.score == null) {
        lines.push("", "No detailed requirements extracted yet. Run the grant enrichment script to populate.");
      }

      results.push(lines.join("\n"));
    }

    return results.join("\n\n");
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 28: Set Grant Reminder
// ─────────────────────────────────────────────────────────────────────────

worker.tool("set_grant_reminder", {
  title: "Set Grant Reminder",
  description:
    "Create a Telegram reminder linked to a specific grant. Defaults to 3 days before the deadline. Use when the user says 'remind me about the SCC grant', 'set a reminder for Ian Potter deadline'. Data source: grant_opportunities + reminders tables.",
  schema: {
    type: "object" as const,
    properties: {
      grant_name: {
        type: "string" as const,
        description: "Name or partial name of the grant",
      },
      days_before: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Days before deadline to trigger reminder. Default 3. Pass null for default.",
      },
      message: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Custom reminder message. Pass null for auto-generated message.",
      },
    },
    required: ["grant_name", "days_before", "message"] as const,
    additionalProperties: false,
  },
  execute: async (params: { grant_name: string; days_before: number | null; message: string | null }) => {
    const supabase = getSupabase();
    const daysBefore = params.days_before ?? 3;

    // Find the grant
    const { data: grants, error } = await supabase
      .from("grant_opportunities")
      .select("id, name, closes_at, provider")
      .ilike("name", `%${params.grant_name}%`)
      .limit(3);

    if (error) return `Error: ${error.message}`;
    if (!grants?.length) return `No grants found matching "${params.grant_name}".`;

    if (grants.length > 1) {
      const list = grants.map((g: any) => `  - ${g.name} (closes ${g.closes_at || "unknown"})`).join("\n");
      return `Multiple matches found. Please be more specific:\n${list}`;
    }

    const grant = grants[0] as any;

    if (!grant.closes_at) {
      return `"${grant.name}" has no deadline set. Can't create a deadline reminder without a closing date.`;
    }

    const deadline = new Date(grant.closes_at);
    const triggerAt = new Date(deadline.getTime() - daysBefore * 24 * 60 * 60 * 1000);

    // Don't set reminders in the past
    if (triggerAt.getTime() < Date.now()) {
      const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 0) {
        return `"${grant.name}" deadline has already passed (${grant.closes_at}).`;
      }
      return `"${grant.name}" closes in ${daysLeft} day(s) — that's less than ${daysBefore} days away. The deadline is ${grant.closes_at}.`;
    }

    // Set reminder at 8am Brisbane time on the trigger day
    triggerAt.setUTCHours(22, 0, 0, 0); // 8am AEST = 22:00 UTC previous day
    if (triggerAt.getTime() < Date.now()) {
      triggerAt.setDate(triggerAt.getDate() + 1);
    }

    const reminderMessage = params.message || `Grant deadline: "${grant.name}" closes in ${daysBefore} days (${grant.closes_at})`;

    // Get a chat_id for the reminder — use first authorized user
    const chatIdStr = process.env.TELEGRAM_AUTHORIZED_USERS || "";
    const chatId = parseInt(chatIdStr.split(",")[0]?.trim() || "0", 10);

    if (!chatId) {
      return "No Telegram chat ID configured. Set TELEGRAM_AUTHORIZED_USERS env var.";
    }

    const { error: insertErr } = await supabase.from("reminders").insert({
      chat_id: chatId,
      message: reminderMessage,
      trigger_at: triggerAt.toISOString(),
      active: true,
      recurring: null,
    });

    if (insertErr) return `Error creating reminder: ${insertErr.message}`;

    const triggerDate = triggerAt.toISOString().split("T")[0];
    return `Reminder set for ${triggerDate} (${daysBefore} days before deadline): "${grant.name}" — ${grant.closes_at}`;
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 29: Grants Summary Dashboard
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_grants_summary", {
  title: "Grants Summary",
  description:
    "Dashboard view of the grants pipeline: counts by status, urgent deadlines (next 14 days), recent status changes, and total pipeline value. Use when the user asks 'grants overview', 'how's the pipeline', 'grant summary', 'how many grants do we have'. Data source: grant_opportunities table.",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter by project code (e.g. ACT-HV). Pass null for all projects.",
      },
    },
    required: ["project_code"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string | null }) => {
    const result = await fetchGrantsSummary(getSupabase(), {
      project_code: params.project_code ?? undefined,
    });

    if (!result.total) return "No grant opportunities found.";

    const lines: string[] = [
      `GRANTS PIPELINE SUMMARY`,
      `${"─".repeat(40)}`,
      "",
      `Total: ${result.total} opportunities | Pipeline value: $${result.pipelineValue.toLocaleString()}`,
      "",
      "BY STATUS:",
    ];

    const statusOrder = ["not_applied", "reviewing", "in_progress", "submitted", "successful", "unsuccessful", "not_relevant", "next_round"];
    for (const s of statusOrder) {
      if (result.statusCounts[s]) {
        lines.push(`  ${s}: ${result.statusCounts[s]}`);
      }
    }

    if (result.closingSoon.length > 0) {
      lines.push("", "CLOSING SOON (next 14 days):");
      for (const g of result.closingSoon.slice(0, 10)) {
        const amount = g.amount_max ? ` ($${g.amount_max.toLocaleString()})` : "";
        const projects = g.aligned_projects?.length ? ` [${g.aligned_projects.join(", ")}]` : "";
        lines.push(`  ${g.name} — ${g.days_left}d${amount}${projects}`);
      }
    }

    if (result.recentlyUpdated.length > 0) {
      lines.push("", "RECENTLY UPDATED:");
      for (const g of result.recentlyUpdated) {
        lines.push(`  ${g.name} — ${g.application_status} (${g.updated_at})`);
      }
    }

    if (Object.keys(result.byProject).length > 0) {
      lines.push("", "BY PROJECT:");
      for (const [proj, count] of Object.entries(result.byProject).sort(([, a], [, b]) => b - a)) {
        lines.push(`  ${proj}: ${count}`);
      }
    }

    return lines.join("\n");
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 30: Revenue Scoreboard
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_revenue_scoreboard", {
  title: "Revenue Scoreboard",
  description:
    "Get the ACT revenue scoreboard — all commercial decision-making data in one call. Returns revenue streams vs monthly/annual targets, fundraising pipeline by status with weighted values, outstanding receivables, revenue scenarios (conservative/moderate/aggressive), and active project counts. ALWAYS use this tool when the user asks about: revenue targets, pipeline value, commercial overview, how we're tracking, fundraising progress, or business performance. Data source: revenue_streams, fundraising_pipeline, revenue_scenarios, projects tables.",
  schema: {
    type: "object" as const,
    properties: {
      format: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Output format: 'summary' for key numbers only, null for full detail.",
      },
    },
    required: ["format"] as const,
    additionalProperties: false,
  },
  execute: async (_params: { format: string | null }) => {
    const result = await fetchRevenueScoreboard(getSupabase());

    const lines: string[] = [
      "REVENUE SCOREBOARD",
      `Generated: ${new Date().toISOString().split("T")[0]}`,
      "",
      "TARGETS:",
      `  Monthly: $${result.streams.totalMonthlyTarget.toLocaleString()}`,
      `  Annual: $${result.streams.totalAnnualTarget.toLocaleString()}`,
      "",
      "STREAMS:",
    ];

    for (const s of result.streams.items) {
      lines.push(`  ${s.name} (${s.code}): $${s.monthlyTarget.toLocaleString()}/mo [${s.category}]`);
    }

    lines.push("", "PIPELINE:",
      `  Total value: $${result.pipeline.totalValue.toLocaleString()}`,
      `  Weighted value: $${result.pipeline.weightedValue.toLocaleString()}`,
      `  Opportunities: ${result.pipeline.topOpportunities.length}`,
      "", "TOP OPPORTUNITIES:");

    for (const op of result.pipeline.topOpportunities.slice(0, 10)) {
      lines.push(`  ${op.name} — $${op.amount.toLocaleString()} × ${(op.probability * 100).toFixed(0)}% = $${op.weighted.toLocaleString()} [${op.status}] (${op.projects?.join(", ") || "no project"})`);
    }

    lines.push("", "RECEIVABLES:", `  Outstanding: $${result.receivables.total.toLocaleString()}`);
    for (const r of result.receivables.items) {
      lines.push(`  ${r.name} (${r.funder}): $${r.amount.toLocaleString()}`);
    }

    if (result.scenarios.length > 0) {
      lines.push("", "SCENARIOS:");
      for (const s of result.scenarios) {
        lines.push(`  ${s.name}: ${s.description}`);
      }
    }

    lines.push("", `PROJECTS: ${result.projects.active} active / ${result.projects.total} total`);

    return lines.join("\n");
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Wave 12 — Weekly Project Pulse + Close-Off + Daily Grant Report
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─────────────────────────────────────────────────────────────────────────
// TOOL 31: Weekly Project Pulse
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_weekly_project_pulse", {
  title: "Weekly Project Pulse",
  description:
    "Monday morning overview: for each active project, shows open/overdue actions, pending decisions, last meeting date, outstanding invoices, active grants + next deadline, key contacts with relationship health, and days since last activity. " +
    "ALWAYS use this tool when the user asks: 'what needs my attention this week', 'weekly pulse', 'project overview', 'what's happening across projects', 'Monday morning briefing'. " +
    "Data sources: project_knowledge, grant_applications, grant_opportunities, xero_invoices, ghl_contacts, project_health, calendar_events.",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter to a single project code (e.g. ACT-HV). Pass null for all active projects.",
      },
      include_financials: {
        anyOf: [{ type: "boolean" as const }, { type: "null" as const }],
        description: "Include invoice/financial data per project. Default true. Pass false to skip.",
      },
    },
    required: ["project_code", "include_financials"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string | null; include_financials: boolean | null }) => {
    const result = await fetchWeeklyProjectPulse(getSupabase(), {
      project_code: params.project_code ?? undefined,
      include_financials: params.include_financials ?? undefined,
    });

    if (!result.projects.length) return "No active projects with recent activity found.";

    const sections: string[] = [
      `WEEKLY PROJECT PULSE — ${result.date}`,
      "═".repeat(50),
      "",
    ];

    for (const p of result.projects) {
      sections.push(`${p.code}`);
      sections.push(`  Status: ${p.statusLabel}${p.daysSinceActivity !== null ? ` | Last activity: ${p.daysSinceActivity}d ago` : ""}${p.healthScore !== null ? ` | Health: ${p.healthScore}/100` : ""}`);
      sections.push(`  Actions: ${p.overdueActions} overdue, ${p.openActions} open`);
      if (p.pendingDecisions > 0) sections.push(`  Decisions: ${p.pendingDecisions} pending`);
      if (p.lastMeetingDate) sections.push(`  Last meeting: ${p.lastMeetingDate} (${p.daysSinceMeeting}d ago)`);
      if (p.grants.count > 0) {
        let grantLine = `  Grants: ${p.grants.count} active ($${p.grants.pipelineValue.toLocaleString()} pipeline)`;
        if (p.grants.nextDeadline) {
          grantLine += `, next deadline ${p.grants.nextDeadline} (${p.grants.nextDeadlineDays}d)`;
        }
        sections.push(grantLine);
      }
      if (p.invoices.count > 0) {
        sections.push(`  Invoices: ${p.invoices.count} outstanding ($${p.invoices.totalOutstanding.toLocaleString()})`);
      }
      const warmContacts = p.contacts.warm.map(c => c.name);
      const coolingContacts = p.contacts.cooling.map(c => c.name);
      const contactParts: string[] = [];
      if (warmContacts.length) contactParts.push(`warm: ${warmContacts.join(", ")}`);
      if (coolingContacts.length) contactParts.push(`cooling: ${coolingContacts.join(", ")}`);
      if (contactParts.length) sections.push(`  Key contacts: ${contactParts.join(" | ")}`);
      sections.push("");
    }

    if (result.untaggedActionCount != null && result.untaggedActionCount > 0) {
      sections.push("DATA QUALITY");
      sections.push(`  ${result.untaggedActionCount} action items have no project code — need triaging`);
      sections.push("");
    }

    sections.push("─".repeat(50));
    sections.push(`${result.projects.length} projects | ${result.summary.totalOpenActions} open actions | ${result.summary.totalPendingDecisions} pending decisions | ${result.summary.totalActiveGrants} active grants`);

    return sections.join("\n");
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 32: Project Close-Off Checklist
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_project_closeoff", {
  title: "Project Close-Off Checklist",
  description:
    "Generates a close-off checklist for a project: unpaid invoices, open actions, key contacts needing follow-up/thanks, recent decisions to document, and related projects/next phases. " +
    "Use when the user says 'close off the retreat', 'what do we need to wrap up for [project]', 'close-off checklist for ACT-HV'. " +
    "Data sources: xero_invoices, project_knowledge, ghl_contacts, grant_applications.",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        type: "string" as const,
        description: "The project code to generate close-off for (e.g. ACT-HV).",
      },
    },
    required: ["project_code"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string }) => {
    const result = await fetchProjectCloseoff(getSupabase(), {
      project_code: params.project_code,
    });

    const lines: string[] = [
      `PROJECT CLOSE-OFF CHECKLIST: ${result.project_code}`,
      "═".repeat(50),
      "",
    ];

    lines.push("1. FINANCIAL");
    if (result.financial.receivables.length > 0) {
      for (const inv of result.financial.receivables) {
        lines.push(`  [ ] Chase invoice ${inv.invoice_number} — ${inv.contact_name} $${inv.amount_due.toLocaleString()} (due ${inv.due_date || "unknown"})`);
      }
    }
    if (result.financial.payables.length > 0) {
      for (const inv of result.financial.payables) {
        lines.push(`  [ ] Pay invoice ${inv.invoice_number} — ${inv.contact_name} $${inv.amount_due.toLocaleString()} (due ${inv.due_date || "unknown"})`);
      }
    }
    if (!result.financial.receivables.length && !result.financial.payables.length) {
      lines.push("  [x] No outstanding invoices");
    }
    lines.push("");

    lines.push("2. OPEN ACTIONS");
    if (result.actions.length > 0) {
      for (const a of result.actions) {
        const priority = a.importance === "high" ? " [HIGH]" : "";
        lines.push(`  [ ]${priority} ${a.title} (${a.age_days}d old)`);
      }
    } else {
      lines.push("  [x] No open action items");
    }
    lines.push("");

    lines.push("3. RELATIONSHIPS — Thank/Follow-up");
    if (result.contacts.length > 0) {
      for (const c of result.contacts) {
        const trend = c.temperature_trend ? ` (${c.temperature_trend})` : "";
        lines.push(`  [ ] ${c.full_name}${trend} — ${c.last_contacted_at || "no contact date"}`);
      }
    } else {
      lines.push("  [x] No contacts linked to this project");
    }
    lines.push("");

    lines.push("4. DECISIONS TO DOCUMENT");
    if (result.decisions.length > 0) {
      for (const d of result.decisions) {
        lines.push(`  [ ] ${d.title} — ${d.decision_status} (${d.recorded_at})`);
      }
    } else {
      lines.push("  [x] No recent decisions needing documentation");
    }
    lines.push("");

    lines.push("5. KNOWLEDGE ARTIFACTS (last 90 days)");
    if (Object.keys(result.knowledge).length > 0) {
      for (const [type, count] of Object.entries(result.knowledge)) {
        lines.push(`  ${count} ${type}(s)`);
      }
    } else {
      lines.push("  No knowledge items recorded");
    }
    lines.push("");

    lines.push("6. GRANTS");
    if (result.grants.length > 0) {
      for (const g of result.grants) {
        const amount = g.amount_requested ? ` ($${g.amount_requested.toLocaleString()})` : "";
        lines.push(`  [ ] ${g.application_name} — ${g.status}${amount}`);
        for (const m of g.openMilestones) {
          lines.push(`      [ ] ${m.name}${m.due ? ` (due ${m.due})` : ""}`);
        }
      }
    } else {
      lines.push("  [x] No active grants");
    }
    lines.push("");

    lines.push("─".repeat(50));
    lines.push(`${result.totalItems} items to close off`);

    return lines.join("\n");
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 33: Daily Grant Report
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_daily_grant_report", {
  title: "Daily Grant Report",
  description:
    "Comprehensive daily grant landscape: active applications grouped by urgency (closing this week / this month / pipeline), per-grant progress with next milestone and days until deadline, newly discovered opportunities with fit scores, writing tasks needed, and total pipeline value. " +
    "ALWAYS use this tool when the user asks: 'daily grant report', 'what grants need attention today', 'grant landscape', 'what's due this week'. " +
    "Data sources: grant_applications, grant_opportunities.",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter by project code. Pass null for all projects.",
      },
    },
    required: ["project_code"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string | null }) => {
    const result = await fetchDailyGrantReport(getSupabase(), {
      project_code: params.project_code ?? undefined,
    });

    const lines: string[] = [
      `DAILY GRANT REPORT — ${new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`,
      "═".repeat(50),
      "",
    ];

    lines.push("THIS WEEK (urgent):");
    if (result.closingThisWeek.length > 0) {
      for (const o of result.closingThisWeek) {
        const amount = o.amount_max ? ` ($${o.amount_max.toLocaleString()})` : "";
        const fit = o.fit_score ? ` | Fit: ${o.fit_score}%` : "";
        const projects = o.aligned_projects?.length ? ` [${o.aligned_projects.join(", ")}]` : "";
        lines.push(`  ⚠ ${o.name} — ${o.days_left}d left${amount}${fit} — ${o.application_status}${projects}`);
      }
    } else {
      lines.push("  No grants closing this week");
    }
    lines.push("");

    lines.push("THIS MONTH:");
    if (result.closingThisMonth.length > 0) {
      for (const o of result.closingThisMonth) {
        const amount = o.amount_max ? ` ($${o.amount_max.toLocaleString()})` : "";
        const fit = o.fit_score ? ` | Fit: ${o.fit_score}%` : "";
        lines.push(`  ${o.name} — ${o.days_left}d${amount}${fit} — ${o.application_status}`);
      }
    } else {
      lines.push("  No grants closing this month");
    }
    lines.push("");

    lines.push("ACTIVE APPLICATIONS:");
    if (result.activeApplications.length > 0) {
      for (const app of result.activeApplications) {
        const amount = app.amount_requested ? ` ($${app.amount_requested.toLocaleString()})` : "";
        let line = `  ${app.application_name} — ${app.status}${amount}`;
        if (app.completion_pct > 0) line += ` | ${app.completion_pct}% complete`;
        if (app.next_milestone && app.next_milestone_days !== null) {
          line += ` | Next: ${app.next_milestone} (${app.next_milestone_days}d)`;
        }
        lines.push(line);
      }
      lines.push("");
      lines.push(`  Pipeline value: $${result.pipelineValue.toLocaleString()}`);
    } else {
      lines.push("  No active applications");
    }
    lines.push("");

    lines.push("DISCOVERED (last 24h):");
    if (result.newlyDiscovered.length > 0) {
      for (const o of result.newlyDiscovered) {
        const amount = o.amount_max ? ` ($${o.amount_max.toLocaleString()})` : "";
        const fit = o.fit_score ? ` Fit: ${o.fit_score}%` : "";
        const closes = o.closes_at ? ` | Closes: ${o.closes_at}` : "";
        lines.push(`  + ${o.name} (${o.provider || "unknown"})${amount}${fit}${closes}`);
      }
    } else {
      lines.push("  No new opportunities in last 24h");
    }
    lines.push("");

    if (result.writingTasks.length > 0) {
      lines.push("WRITING TASKS:");
      for (const w of result.writingTasks) {
        lines.push(`  [ ] ${w.application_name}: ${w.milestone_name || w.application_name}${w.due ? ` (due ${w.due})` : ""}`);
      }
      lines.push("");
    }

    if (result.awarded.length > 0) {
      lines.push("AWARDED (pending payment):");
      for (const a of result.awarded) {
        const amount = a.amount_requested ? ` $${a.amount_requested.toLocaleString()}` : "";
        lines.push(`  ${a.application_name}${amount}`);
      }
      lines.push(`  Total awarded: $${result.awardedValue.toLocaleString()}`);
      lines.push("");
    }

    lines.push("─".repeat(50));
    lines.push(`${result.totalApplications} active applications | ${result.totalOpportunities} opportunities tracked | ${result.closingThisWeek.length} closing this week`);

    return lines.join("\n");
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WAVE 13 — RECONCILIATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

worker.tool("get_reconciliation_status", {
  title: "Get Reconciliation Status",
  description:
    "Returns reconciliation overview: total transactions, % tagged with project codes, " +
    "% reconciled in Xero, % with receipts from Dext, top untagged vendors, and stuck items " +
    "(untagged for >14 days). Use when asked about reconciliation status, financial data quality, " +
    "or how clean the books are.",
  schema: {
    type: "object" as const,
    properties: {
      days_back: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Look back N days (default: 90). Pass null for default.",
      },
    },
    required: ["days_back"] as const,
    additionalProperties: false,
  },
  execute: async (params: { days_back: number | null }) => {
    const result = await fetchReconciliationStatus(getSupabase(), {
      days_back: params.days_back ?? undefined,
    });

    const lines: string[] = ["RECONCILIATION STATUS", "─".repeat(40)];

    lines.push(`Period: ${result.period}`);
    lines.push("");
    lines.push(`Total transactions: ${result.total}`);
    lines.push(`Tagged:       ${result.tagged}/${result.total} (${result.total > 0 ? Math.round((result.tagged / result.total) * 100) : 0}%)`);
    lines.push(`Reconciled:   ${result.reconciled}/${result.total} (${result.total > 0 ? Math.round((result.reconciled / result.total) * 100) : 0}%)`);
    lines.push(`Has receipt:  ${result.withReceipt}/${result.total} (${result.total > 0 ? Math.round((result.withReceipt / result.total) * 100) : 0}%)`);

    if (result.topUntaggedVendors.length > 0) {
      lines.push("");
      lines.push(`TOP UNTAGGED VENDORS (excl. transfers):`);
      for (const v of result.topUntaggedVendors) {
        lines.push(`  ${v.name}: ${v.count} txns, $${Math.round(v.total).toLocaleString()}`);
      }
    }

    if (result.stuckItems.length > 0) {
      lines.push("");
      lines.push(`STUCK ITEMS (untagged >14 days, top ${result.stuckItems.length}):`);
      for (const s of result.stuckItems) {
        lines.push(`  ${s.date} | ${s.contact_name} | $${Math.abs(s.total).toLocaleString()}`);
      }
    }

    return lines.join("\n");
  },
});

worker.tool("get_untagged_summary", {
  title: "Get Untagged Summary",
  description:
    "Returns untagged transactions grouped by vendor with suggested project codes. " +
    "Excludes inter-account transfers (already handled as ACT-IN). " +
    "Shows top vendors by dollar value for human review. " +
    "Use when asked about untagged transactions, what needs tagging, or financial cleanup priorities.",
  schema: {
    type: "object" as const,
    properties: {
      limit: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Max vendor groups to return (default: 20). Pass null for default.",
      },
    },
    required: ["limit"] as const,
    additionalProperties: false,
  },
  execute: async (params: { limit: number | null }) => {
    const result = await fetchUntaggedSummary(getSupabase(), {
      limit: params.limit ?? undefined,
    });

    const lines: string[] = ["UNTAGGED TRANSACTIONS SUMMARY", "─".repeat(40)];

    if (!result.totalTransactions) {
      lines.push("No untagged transactions (excluding transfers). All caught up!");
      return lines.join("\n");
    }

    lines.push(`${result.totalTransactions} untagged transactions across ${result.totalVendors} vendors`);
    lines.push(`Total untagged value: $${Math.round(result.totalValue).toLocaleString()}`);
    lines.push("");
    lines.push(`TOP ${result.vendors.length} BY VALUE:`);

    for (const v of result.vendors) {
      const suggestionStr = v.suggestedCode ? ` → suggested: ${v.suggestedCode}` : "";
      const dateRange = v.dateRange || "";
      lines.push(
        `  ${v.name}: ${v.count} txns, $${Math.round(v.total).toLocaleString()}${dateRange ? ` (${dateRange})` : ""}${suggestionStr}`
      );
    }

    if (result.totalVendors > result.vendors.length) {
      lines.push(`  ... and ${result.totalVendors - result.vendors.length} more vendors`);
    }

    return lines.join("\n");
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WAVE 14 — Overdue Actions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

worker.tool("get_overdue_actions", {
  title: "Get Overdue Actions",
  description:
    "Aggregates ALL overdue finance items across 5 sources: untagged transactions (>7 days), " +
    "missing receipts (SPEND with no attachments, >7 days), overdue invoices (ACCREC past due date), " +
    "grant deadlines passed (not submitted/awarded/rejected), and stuck receipt pipeline items (>14 days). " +
    "Returns prioritized action list grouped by urgency with estimated time. " +
    "Use when asked: what's overdue, what needs attention, daily finance check, morning actions, what's stuck.",
  schema: {
    type: "object" as const,
    properties: {
      include_urls: {
        anyOf: [{ type: "boolean" as const }, { type: "null" as const }],
        description: "Include dashboard URLs for each action. Default true.",
      },
    },
    required: ["include_urls"] as const,
    additionalProperties: false,
  },
  execute: async (params: { include_urls: boolean | null }) => {
    const result = await fetchOverdueActions(getSupabase());

    if (!result.actions.length) {
      return "OVERDUE ACTIONS\n" + "─".repeat(40) + "\n\nAll clear — no overdue finance items. Well done!";
    }

    const lines: string[] = [
      "OVERDUE FINANCE ACTIONS",
      "─".repeat(40),
      `${result.actions.length} items | ~${result.actions.reduce((s, a) => s + a.estimatedMinutes, 0)} min estimated`,
      "",
    ];

    let currentPriority = "";
    const includeUrls = params.include_urls ?? true;
    for (const action of result.actions) {
      if (action.priority !== currentPriority) {
        currentPriority = action.priority;
        lines.push(`── ${currentPriority.toUpperCase()} ──`);
      }
      lines.push(`  ${action.title}`);
      lines.push(`    ${action.description}`);
      lines.push(`    (~${action.estimatedMinutes} min)`);
      lines.push("");
    }

    return lines.join("\n");
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 37: Daily Review (Proactive Orchestration)
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_daily_review", {
  title: "Daily Review",
  description:
    "Comprehensive proactive morning review combining ALL intelligence sources into a single prioritized digest. Returns: daily briefing, grant deadlines, overdue finance actions, contacts needing attention, unanswered emails, receipt pipeline status, outstanding invoices, and a PRIORITY SUMMARY sorted by urgency (critical → attention → info). ALWAYS use this tool when the user asks for a complete overview of their day, a comprehensive status, or 'what should I focus on'. This is the MOST COMPREHENSIVE tool — it combines get_daily_briefing + check_grant_deadlines + get_overdue_actions + get_outstanding_invoices + get_unanswered_emails + get_receipt_pipeline into one call. Example queries: 'What should I focus on today?', 'Give me the full picture', 'Complete morning review', 'What's most urgent?'",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter to a specific project (e.g. ACT-EL). Pass null for all projects.",
      },
      grant_days_ahead: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Grant deadline lookahead in days (default 14). Pass null for default.",
      },
    },
    required: ["project_code", "grant_days_ahead"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string | null; grant_days_ahead: number | null }) => {
    const result = await fetchDailyReview(getSupabase(), {
      project_code: params.project_code ?? undefined,
      grant_days_ahead: params.grant_days_ahead ?? undefined,
    });

    const lines: string[] = [
      `DAILY REVIEW — ${result.date}`,
      "═".repeat(50),
    ];

    // Priority summary
    const { critical_items, attention_items, info_items } = result.priority_summary;
    if (critical_items.length > 0) {
      lines.push("", "🔴 CRITICAL", "─".repeat(40));
      for (const item of critical_items) {
        lines.push(`  [${item.category.toUpperCase()}] ${item.title}`);
        lines.push(`    ${item.detail}`);
      }
    }
    if (attention_items.length > 0) {
      lines.push("", "🟡 NEEDS ATTENTION", "─".repeat(40));
      for (const item of attention_items) {
        lines.push(`  [${item.category.toUpperCase()}] ${item.title}`);
        lines.push(`    ${item.detail}`);
      }
    }
    if (info_items.length > 0) {
      lines.push("", "ℹ️ INFO", "─".repeat(40));
      for (const item of info_items) {
        lines.push(`  [${item.category.toUpperCase()}] ${item.title}`);
        lines.push(`    ${item.detail}`);
      }
    }

    if (critical_items.length === 0 && attention_items.length === 0 && info_items.length === 0) {
      lines.push("", "All clear — nothing urgent today.");
    }

    lines.push("", `Summary: ${critical_items.length} critical, ${attention_items.length} attention, ${info_items.length} info`);

    return lines.join("\n");
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 38: Meeting Context (Pre-Meeting Prep)
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_meeting_context", {
  title: "Meeting Context",
  description:
    "Pre-load everything needed before walking into a meeting. Given attendees and/or a project, gathers: contact profiles, project health, recent meetings, open action items, grant deadlines, outstanding invoices, and auto-generated TALKING POINTS. ALWAYS use this tool when the user says they have a meeting coming up, need a meeting brief, or asks 'what should I know before meeting X'. Example queries: 'Prep me for the ACT-PICC meeting', 'Meeting brief for Black Cockatoo Valley', 'I'm meeting with Sarah — what should I know?', 'What context do I need for the JusticeHub standup?'",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Project code for this meeting (e.g. ACT-EL, ACT-PICC). Pass null if unknown.",
      },
      attendees: {
        anyOf: [{ type: "array" as const, items: { type: "string" as const } }, { type: "null" as const }],
        description: "Names of meeting attendees to look up. Pass null if unknown.",
      },
      history_days: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Days of meeting history to include (default 30). Pass null for default.",
      },
    },
    required: ["project_code", "attendees", "history_days"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string | null; attendees: string[] | null; history_days: number | null }) => {
    const result = await fetchMeetingContext(getSupabase(), {
      project_code: params.project_code ?? undefined,
      attendees: params.attendees ?? undefined,
      history_days: params.history_days ?? undefined,
    });

    const lines: string[] = [
      `MEETING CONTEXT${result.project_code ? ` — ${result.project_code}` : ""}`,
      "═".repeat(50),
    ];

    // Talking points (most valuable section)
    if (result.talking_points.length > 0) {
      lines.push("", "TALKING POINTS", "─".repeat(40));
      for (const tp of result.talking_points) {
        lines.push(`  • ${tp}`);
      }
    }

    // Attendee profiles
    if (result.attendee_profiles.length > 0) {
      lines.push("", "ATTENDEES", "─".repeat(40));
      for (const profile of result.attendee_profiles) {
        if (profile.contacts.length > 0) {
          const c = profile.contacts[0];
          lines.push(`  ${c.name}${c.company ? ` (${c.company})` : ""}`);
          if (c.status) lines.push(`    Status: ${c.status}`);
          if (c.last_contact) lines.push(`    Last contact: ${c.last_contact}`);
        }
      }
    }

    // Project health
    if (result.project_health?.projects?.length) {
      const p = result.project_health.projects[0];
      lines.push("", "PROJECT HEALTH", "─".repeat(40));
      lines.push(`  Health: ${p.health}`);
      lines.push(`  Open actions: ${p.open_actions} | Days since activity: ${p.days_since_activity ?? "?"}`);
    }

    // Open actions
    if (result.open_actions.totalCount > 0) {
      lines.push("", `OPEN ACTIONS (${result.open_actions.totalCount})`, "─".repeat(40));
      const actionGroups = result.open_actions.aiActions?.slice(0, 3) ?? [];
      for (const group of actionGroups) {
        lines.push(`  ${group.meeting_title} (${group.date})`);
        for (const item of group.items.filter(i => !i.completed).slice(0, 3)) {
          lines.push(`    • ${item.action}`);
        }
      }
    }

    // Grant deadlines
    if (result.upcoming_grant_deadlines.count > 0) {
      lines.push("", `GRANT DEADLINES (${result.upcoming_grant_deadlines.count})`, "─".repeat(40));
      for (const g of result.upcoming_grant_deadlines.deadlines.slice(0, 3)) {
        lines.push(`  [${g.urgency}] ${g.application_name} — ${g.days_remaining}d`);
      }
    }

    // Outstanding invoices
    if (result.outstanding_invoices && result.outstanding_invoices.count > 0) {
      lines.push("", `OUTSTANDING INVOICES (${result.outstanding_invoices.count})`, "─".repeat(40));
      lines.push(`  Total due: $${result.outstanding_invoices.totalDue.toLocaleString()}`);
    }

    return lines.join("\n");
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 39: Weekly Cleanup
// ─────────────────────────────────────────────────────────────────────────

worker.tool("run_weekly_cleanup", {
  title: "Weekly Cleanup",
  description:
    "Monday morning data hygiene scan. Finds: stale actions (overdue by 14+ days), orphaned items (no project assigned), incomplete contacts (missing email/phone/org), and stale projects (no activity in 30+ days). Use this tool on Mondays to clean up the org's data before the week starts. Example queries: 'Run weekly cleanup', 'What data needs attention?', 'Find stale items', 'Data hygiene check', 'What's orphaned?'",
  schema: {
    type: "object" as const,
    properties: {
      stale_threshold_days: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Days before an action is stale (default 14). Pass null for default.",
      },
      contact_inactive_days: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Days before a contact is inactive (default 30). Pass null for default.",
      },
    },
    required: ["stale_threshold_days", "contact_inactive_days"] as const,
    additionalProperties: false,
  },
  execute: async (params: { stale_threshold_days: number | null; contact_inactive_days: number | null }) => {
    const result = await fetchWeeklyCleanup(getSupabase(), {
      stale_threshold_days: params.stale_threshold_days ?? undefined,
      contact_inactive_days: params.contact_inactive_days ?? undefined,
    });

    const lines: string[] = [
      "WEEKLY CLEANUP REPORT",
      "═".repeat(50),
      `Total issues: ${result.summary.total_issues}`,
    ];

    if (result.stale_actions.length > 0) {
      lines.push("", `STALE ACTIONS (${result.summary.stale_action_count})`, "─".repeat(40));
      for (const a of result.stale_actions.slice(0, 10)) {
        lines.push(`  ${a.title}`);
        lines.push(`    Project: ${a.project_code ?? "none"} | ${a.days_overdue}d overdue | ${a.importance ?? "normal"}`);
      }
    }

    if (result.orphaned_items.length > 0) {
      lines.push("", `ORPHANED ITEMS (${result.summary.orphaned_count})`, "─".repeat(40));
      for (const o of result.orphaned_items) {
        lines.push(`  ${o.title} (${o.knowledge_type})`);
        lines.push(`    ${o.reason} — recorded ${o.recorded_at.split("T")[0]}`);
      }
    }

    if (result.incomplete_contacts.length > 0) {
      lines.push("", `INCOMPLETE CONTACTS (${result.summary.incomplete_contact_count})`, "─".repeat(40));
      for (const c of result.incomplete_contacts.slice(0, 10)) {
        lines.push(`  ${c.name} (${c.engagement_status ?? "unknown"})`);
        lines.push(`    Missing: ${c.missing_fields.join(", ")}`);
      }
    }

    if (result.stale_projects.length > 0) {
      lines.push("", `STALE PROJECTS (${result.summary.stale_project_count})`, "─".repeat(40));
      for (const p of result.stale_projects) {
        lines.push(`  ${p.name} (${p.code})`);
        lines.push(`    ${p.days_since_activity}d since activity | ${p.open_actions} open actions`);
      }
    }

    if (result.summary.total_issues === 0) {
      lines.push("", "All clean — no data hygiene issues found!");
    }

    return lines.join("\n");
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 40: Grant Suggestions
// ─────────────────────────────────────────────────────────────────────────

worker.tool("suggest_grants", {
  title: "Suggest Grants",
  description:
    "Proactively match ACT projects to open grant opportunities based on theme overlap, keyword alignment, and readiness scores. Scans all open/upcoming/rolling grants and ranks matches by relevance. Shows which grants each project already applied for. Use this tool when the user asks 'what grants should we apply for?', 'find matching grants', 'grant suggestions for ACT-EL', or 'what opportunities fit our projects'. Example queries: 'Suggest grants for JusticeHub', 'What grants match our projects?', 'Find new funding opportunities'",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Only suggest for this project (e.g. ACT-EL). Pass null for all active projects.",
      },
      min_readiness: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Minimum readiness score 0-100 to include (default 0). Pass null for default.",
      },
      limit_per_project: {
        anyOf: [{ type: "number" as const }, { type: "null" as const }],
        description: "Max suggestions per project (default 5). Pass null for default.",
      },
    },
    required: ["project_code", "min_readiness", "limit_per_project"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string | null; min_readiness: number | null; limit_per_project: number | null }) => {
    const result = await fetchGrantSuggestions(getSupabase(), {
      project_code: params.project_code ?? undefined,
      min_readiness: params.min_readiness ?? undefined,
      limit_per_project: params.limit_per_project ?? undefined,
    });

    if (result.projects.length === 0) {
      return `No grant suggestions found. Scanned ${result.total_opportunities_scanned} open opportunities.`;
    }

    const lines: string[] = [
      "GRANT SUGGESTIONS",
      "═".repeat(50),
      `Scanned ${result.total_opportunities_scanned} open opportunities | ${result.total_suggestions} matches`,
    ];

    for (const project of result.projects) {
      lines.push("", `${project.project_name} (${project.project_code})`, "─".repeat(40));
      if (project.project_themes.length > 0) {
        lines.push(`  Themes: ${project.project_themes.join(", ")}`);
      }
      lines.push(`  Already applied: ${project.already_applied} | New suggestions: ${project.suggestions.length}`);

      for (const s of project.suggestions) {
        lines.push("");
        lines.push(`  → ${s.opportunity_name}`);
        lines.push(`    Provider: ${s.provider}`);
        if (s.amount_max) lines.push(`    Up to: $${s.amount_max.toLocaleString()}`);
        if (s.days_until_close !== null) {
          lines.push(`    Closes in: ${s.days_until_close} days (${s.closes_at})`);
        } else {
          lines.push(`    Rolling/no deadline`);
        }
        lines.push(`    Match: ${s.match_reasons.join("; ")}`);
        if (s.readiness_score !== null) {
          lines.push(`    Readiness: ${s.readiness_score}%`);
        }
      }
    }

    return lines.join("\n");
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 41: Project Budget Status
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_project_budget_status", {
  title: "Project Budget Status",
  description:
    "Show budget vs actual spend per project with variance alerts. Compares FY income against expenses, highlights projects running over budget, and shows net position. Use when the user asks 'are we on budget?', 'project spend', 'budget variance', or 'which projects are overspending'. Example queries: 'Budget status for all projects', 'Is JusticeHub on track?', 'Which projects are over budget?'",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter to specific project (e.g. ACT-EL). Pass null for all projects.",
      },
    },
    required: ["project_code"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string | null }) => {
    const result = await fetchProjectFinancials(getSupabase(), {
      projectCode: params.project_code ?? undefined,
    });

    if (result.projects.length === 0) {
      return "No project financial data found.";
    }

    const lines: string[] = [
      "PROJECT BUDGET STATUS",
      "═".repeat(50),
      `${result.count} projects | Australian FY (Jul-Jun)`,
      "",
    ];

    let totalIncome = 0;
    let totalExpenses = 0;
    const alerts: string[] = [];

    for (const p of result.projects) {
      totalIncome += p.fy_income;
      totalExpenses += p.fy_expenses;
      const net = p.net_position;
      const status = net >= 0 ? "✅" : "⚠️";
      if (net < -5000) alerts.push(`${p.code} is $${Math.abs(net).toLocaleString()} over budget`);

      lines.push(`${status} ${p.code} — ${p.name} (${p.tier})`);
      lines.push(`   Income: $${p.fy_income.toLocaleString()} | Expenses: $${p.fy_expenses.toLocaleString()} | Net: $${net.toLocaleString()}`);
      if (p.receivable > 0) lines.push(`   Receivable: $${p.receivable.toLocaleString()}`);
      if (p.pipeline_value > 0) lines.push(`   Pipeline: $${p.pipeline_value.toLocaleString()}`);
      lines.push("");
    }

    lines.push("─".repeat(40));
    lines.push(`TOTALS: Income $${totalIncome.toLocaleString()} | Expenses $${totalExpenses.toLocaleString()} | Net $${(totalIncome - totalExpenses).toLocaleString()}`);

    if (alerts.length > 0) {
      lines.push("", "⚠️ ALERTS:");
      for (const a of alerts) lines.push(`  • ${a}`);
    }

    return lines.join("\n");
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 42: Missing Receipts Impact
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_missing_receipts_impact", {
  title: "Missing Receipts Impact",
  description:
    "Show missing receipts with their GST and R&D tax refund impact in dollars. Highlights how much money is at risk from missing documentation. Use when the user asks 'missing receipts', 'receipt coverage', 'GST at risk', 'R&D receipt gaps', or 'what receipts do we need'. Example queries: 'What receipts are missing?', 'How much GST are we losing?', 'R&D receipt gaps'",
  schema: {
    type: "object" as const,
    properties: {
      rd_only: {
        anyOf: [{ type: "boolean" as const }, { type: "null" as const }],
        description: "Only show R&D project receipts (ACT-EL, ACT-IN, ACT-JH, ACT-GD). Pass null for all.",
      },
    },
    required: ["rd_only"] as const,
    additionalProperties: false,
  },
  execute: async (params: { rd_only: boolean | null }) => {
    const sb = getSupabase();
    const now = new Date();
    const fyStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStartDate = `${fyStart}-07-01`;
    const rdProjects = ["ACT-EL", "ACT-IN", "ACT-JH", "ACT-GD"];

    // Get receipt pipeline status
    const pipelineResult = await fetchReceiptPipeline(sb, { includeStuck: true });

    // Get R&D bills missing receipts
    const { data: rdBills } = await sb
      .from("xero_invoices")
      .select("contact_name, total, project_code, has_attachments, date")
      .eq("type", "ACCPAY")
      .gte("date", fyStartDate)
      .in("project_code", rdProjects);

    const rdMissing = (rdBills || []).filter((b: Record<string, unknown>) => !b.has_attachments);
    const rdMissingValue = rdMissing.reduce((s: number, b: Record<string, unknown>) => s + Math.abs(Number(b.total || 0)), 0);
    const rdTotal = (rdBills || []).length;
    const rdWithReceipts = rdTotal - rdMissing.length;

    const lines: string[] = [
      "MISSING RECEIPTS — FINANCIAL IMPACT",
      "═".repeat(50),
      "",
      "RECEIPT PIPELINE",
      `  Total items: ${pipelineResult.total_items}`,
      `  Reconciliation rate: ${pipelineResult.reconciliation_rate}%`,
    ];

    for (const stage of pipelineResult.stages) {
      if (stage.count > 0) {
        lines.push(`  ${stage.stage}: ${stage.count} ($${Math.round(stage.amount).toLocaleString()})${stage.stuck_count > 0 ? ` ⚠️ ${stage.stuck_count} stuck` : ""}`);
      }
    }

    lines.push(
      "",
      "R&D RECEIPT COVERAGE",
      `  Total R&D bills: ${rdTotal}`,
      `  With receipts: ${rdWithReceipts}`,
      `  Missing receipts: ${rdMissing.length}`,
      `  Coverage: ${rdTotal > 0 ? Math.round((rdWithReceipts / rdTotal) * 100) : 100}%`,
      "",
      "💰 FINANCIAL IMPACT",
      `  Missing receipt value: $${Math.round(rdMissingValue).toLocaleString()}`,
      `  GST at risk (÷11): $${Math.round(rdMissingValue / 11).toLocaleString()}`,
      `  R&D refund at risk (×43.5%): $${Math.round(rdMissingValue * 0.435).toLocaleString()}`,
      `  TOTAL AT RISK: $${Math.round(rdMissingValue / 11 + rdMissingValue * 0.435).toLocaleString()}`,
    );

    if (rdMissing.length > 0) {
      lines.push("", "TOP MISSING (by value):");
      const sorted = rdMissing
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => Math.abs(Number(b.total || 0)) - Math.abs(Number(a.total || 0)))
        .slice(0, 10);
      for (const b of sorted) {
        lines.push(`  • ${(b as Record<string, unknown>).contact_name || "Unknown"}: $${Math.abs(Number((b as Record<string, unknown>).total || 0)).toLocaleString()} [${(b as Record<string, unknown>).project_code}] (${(b as Record<string, unknown>).date})`);
      }
    }

    if (pipelineResult.alerts.length > 0) {
      lines.push("", "⚠️ PIPELINE ALERTS:");
      for (const a of pipelineResult.alerts) lines.push(`  • ${a}`);
    }

    return lines.join("\n");
  },
});

// ─────────────────────────────────────────────────────────────────────────
// TOOL 43: R&D Evidence Strength
// ─────────────────────────────────────────────────────────────────────────

worker.tool("get_rd_evidence_strength", {
  title: "R&D Evidence Strength",
  description:
    "Show R&D evidence coverage per eligible project (ACT-EL, ACT-IN, ACT-JH, ACT-GD). Checks git commits, calendar events, Xero spend, emails, and knowledge entries. Calculates evidence strength score (0-100) and highlights gaps. Use when the user asks 'R&D evidence', 'R&D readiness', 'are we ready for R&D claim', 'evidence gaps', or 'R&D coverage'. Example queries: 'How strong is our R&D evidence?', 'R&D gaps for Empathy Ledger', 'Are we ready for AusIndustry?'",
  schema: {
    type: "object" as const,
    properties: {
      project_code: {
        anyOf: [{ type: "string" as const }, { type: "null" as const }],
        description: "Filter to specific R&D project (ACT-EL, ACT-IN, ACT-JH, ACT-GD). Pass null for all.",
      },
    },
    required: ["project_code"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string | null }) => {
    const sb = getSupabase();
    const now = new Date();
    const fyStart = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStartDate = `${fyStart}-07-01`;
    const todayDate = now.toISOString().split("T")[0];
    const rdProjects = params.project_code
      ? [params.project_code]
      : ["ACT-EL", "ACT-IN", "ACT-JH", "ACT-GD"];

    const rdNames: Record<string, string> = {
      "ACT-EL": "Empathy Ledger (Core R&D)",
      "ACT-IN": "ALMA/Bot Intelligence (Core R&D)",
      "ACT-JH": "JusticeHub (Supporting R&D)",
      "ACT-GD": "Goods on Country (Supporting R&D)",
    };

    const lines: string[] = [
      "R&D EVIDENCE STRENGTH",
      "═".repeat(50),
      `FY${fyStart}-${(fyStart + 1).toString().slice(2)} | Registration deadline: April 30`,
      `Days remaining: ${Math.ceil((new Date(`${fyStart + 1}-04-30`).getTime() - now.getTime()) / 86400000)}`,
      "",
    ];

    let totalSpend = 0;

    for (const code of rdProjects) {
      // Parallel queries for each project
      const [spendResult, billsResult, calendarResult, emailResult, knowledgeResult] = await Promise.all([
        sb.from("xero_transactions").select("total").lt("total", 0).gte("date", fyStartDate).lte("date", todayDate).eq("project_code", code),
        sb.from("xero_invoices").select("has_attachments, total").eq("type", "ACCPAY").gte("date", fyStartDate).eq("project_code", code),
        sb.from("calendar_events").select("id", { count: "exact", head: true }).gte("start_time", fyStartDate).ilike("title", `%${code.replace("ACT-", "")}%`),
        sb.from("communications").select("id", { count: "exact", head: true }).gte("date", fyStartDate).contains("project_codes", [code]),
        sb.from("project_knowledge").select("id", { count: "exact", head: true }).eq("project_code", code).gte("recorded_at", fyStartDate),
      ]);

      const spend = (spendResult.data || []).reduce((s: number, t: Record<string, unknown>) => s + Math.abs(Number(t.total || 0)), 0);
      totalSpend += spend;

      const bills = billsResult.data || [];
      const withReceipts = bills.filter((b: Record<string, unknown>) => b.has_attachments).length;
      const receiptCoverage = bills.length > 0 ? Math.round((withReceipts / bills.length) * 100) : 100;

      const calendarCount = calendarResult.count || 0;
      const emailCount = emailResult.count || 0;
      const knowledgeCount = knowledgeResult.count || 0;

      // Calculate evidence strength (0-100)
      let score = 0;
      if (spend > 0) score += 20;
      if (receiptCoverage >= 90) score += 25;
      else if (receiptCoverage >= 70) score += 15;
      else if (receiptCoverage >= 50) score += 10;
      if (calendarCount >= 10) score += 20;
      else if (calendarCount >= 5) score += 10;
      if (emailCount >= 20) score += 15;
      else if (emailCount >= 5) score += 8;
      if (knowledgeCount >= 5) score += 20;
      else if (knowledgeCount >= 2) score += 10;

      const rating = score >= 80 ? "STRONG ✅" : score >= 60 ? "ADEQUATE ⚡" : score >= 40 ? "WEAK ⚠️" : "INSUFFICIENT ❌";

      lines.push(`${rdNames[code] || code}`);
      lines.push(`  Score: ${score}/100 — ${rating}`);
      lines.push(`  Spend: $${Math.round(spend).toLocaleString()} | Refund potential: $${Math.round(spend * 0.435).toLocaleString()}`);
      lines.push(`  Receipts: ${withReceipts}/${bills.length} (${receiptCoverage}%)`);
      lines.push(`  Calendar events: ${calendarCount} | Emails: ${emailCount} | Knowledge: ${knowledgeCount}`);

      const gaps: string[] = [];
      if (receiptCoverage < 90) gaps.push(`receipts (${100 - receiptCoverage}% missing)`);
      if (calendarCount < 5) gaps.push("calendar evidence");
      if (knowledgeCount < 2) gaps.push("knowledge documentation");
      if (gaps.length > 0) lines.push(`  Gaps: ${gaps.join(", ")}`);
      lines.push("");
    }

    lines.push("─".repeat(40));
    lines.push(`TOTAL R&D SPEND: $${Math.round(totalSpend).toLocaleString()}`);
    lines.push(`TOTAL POTENTIAL REFUND: $${Math.round(totalSpend * 0.435).toLocaleString()} (43.5% offset)`);

    return lines.join("\n");
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default worker;
