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
 * Secrets required (set via `ntn workers env set`):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * @see https://github.com/makenotion/workers-template
 */

import { Worker } from "@notionhq/workers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
    const supabase = getSupabase();
    const daysAhead = params.days_ahead ?? 30;

    let query = supabase
      .from("grant_applications")
      .select(`
        id, application_name, status, amount_requested, milestones, project_code,
        grant_opportunities!grant_applications_opportunity_id_fkey (
          closes_at, name, provider
        )
      `)
      .in("status", ["draft", "in_progress", "submitted", "under_review"]);

    if (params.project_code) {
      query = query.eq("project_code", params.project_code);
    }

    const { data: apps, error } = await query;
    if (error) return `Error: ${error.message}`;
    if (!apps?.length) return "No active grant applications found.";

    const now = new Date();
    const results: string[] = [];

    for (const app of apps) {
      const opp = (app as any).grant_opportunities;
      if (!opp?.closes_at) continue;

      const deadline = new Date(opp.closes_at);
      const daysRemaining = Math.ceil(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysRemaining > daysAhead || daysRemaining < -7) continue;

      const milestones = (app.milestones as any[]) || [];
      const completed = milestones.filter((m: any) => m.completed).length;
      const total = milestones.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      const overdue = milestones.filter(
        (m: any) => !m.completed && m.due && new Date(m.due) < now
      );

      const urgency =
        daysRemaining <= 1 ? "CRITICAL" :
        daysRemaining <= 3 ? "URGENT" :
        daysRemaining <= 7 ? "SOON" :
        daysRemaining <= 14 ? "UPCOMING" : "PLANNED";

      results.push(
        [
          `[${urgency}] ${app.application_name}`,
          `  Provider: ${opp.provider} — ${opp.name}`,
          `  Project: ${app.project_code}`,
          `  Deadline: ${opp.closes_at} (${daysRemaining} days)`,
          `  Amount: $${(app.amount_requested || 0).toLocaleString()}`,
          `  Progress: ${pct}% (${completed}/${total} milestones)`,
          overdue.length > 0
            ? `  OVERDUE milestones: ${overdue.map((m: any) => m.name).join(", ")}`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      );
    }

    if (!results.length) return `No grant deadlines within the next ${daysAhead} days.`;

    return `Found ${results.length} grant(s) with upcoming deadlines:\n\n${results.join("\n\n")}`;
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
    const days = params.days ?? 7;
    const sections: string[] = [];

    // 1. Overdue actions
    let overdueQuery = supabase
      .from("project_knowledge")
      .select("project_code, title, follow_up_date, importance")
      .eq("action_required", true)
      .lt("follow_up_date", todayStr())
      .order("follow_up_date", { ascending: true })
      .limit(15);

    if (params.project_code) overdueQuery = overdueQuery.eq("project_code", params.project_code);

    const { data: overdue } = await overdueQuery;
    if (overdue?.length) {
      const items = overdue.map((r: any) => {
        const daysOver = Math.floor(
          (Date.now() - new Date(r.follow_up_date).getTime()) / 86400000
        );
        return `  - [${r.project_code}] ${r.title} (${daysOver}d overdue, ${r.importance})`;
      });
      sections.push(`OVERDUE ACTIONS (${overdue.length}):\n${items.join("\n")}`);
    }

    // 2. Upcoming follow-ups
    let upcomingQuery = supabase
      .from("project_knowledge")
      .select("project_code, title, follow_up_date, importance")
      .eq("action_required", true)
      .gte("follow_up_date", todayStr())
      .lte("follow_up_date", daysFromNow(days))
      .order("follow_up_date", { ascending: true })
      .limit(15);

    if (params.project_code) upcomingQuery = upcomingQuery.eq("project_code", params.project_code);

    const { data: upcoming } = await upcomingQuery;
    if (upcoming?.length) {
      const items = upcoming.map(
        (r: any) => `  - [${r.project_code}] ${r.title} (due ${r.follow_up_date})`
      );
      sections.push(`UPCOMING FOLLOW-UPS (${upcoming.length}):\n${items.join("\n")}`);
    }

    // 3. Recent decisions
    let decisionsQuery = supabase
      .from("project_knowledge")
      .select("project_code, title, decision_status, recorded_at")
      .eq("knowledge_type", "decision")
      .gte("recorded_at", daysAgo(days))
      .order("recorded_at", { ascending: false })
      .limit(10);

    if (params.project_code) decisionsQuery = decisionsQuery.eq("project_code", params.project_code);

    const { data: decisions } = await decisionsQuery;
    if (decisions?.length) {
      const items = decisions.map(
        (r: any) => `  - [${r.project_code}] ${r.title} (${r.decision_status || "pending"})`
      );
      sections.push(`RECENT DECISIONS (${decisions.length}):\n${items.join("\n")}`);
    }

    // 4. Relationship alerts (falling temperature)
    const { data: alerts } = await supabase
      .from("relationship_health")
      .select("ghl_contact_id, temperature, temperature_trend, risk_flags")
      .eq("temperature_trend", "falling")
      .order("temperature", { ascending: true })
      .limit(10);

    if (alerts?.length) {
      const ghlIds = alerts.map((a: any) => a.ghl_contact_id);
      const { data: contacts } = await supabase
        .from("ghl_contacts")
        .select("ghl_id, full_name, email, company_name")
        .in("ghl_id", ghlIds);

      const contactMap = new Map(
        (contacts || []).map((c: any) => [c.ghl_id, c])
      );

      const items = alerts.map((a: any) => {
        const c = contactMap.get(a.ghl_contact_id) as any;
        const name = c?.full_name || c?.email || "Unknown";
        return `  - ${name} (temp: ${a.temperature}/100, trend: falling)`;
      });
      sections.push(`RELATIONSHIP ALERTS (${alerts.length}):\n${items.join("\n")}`);
    }

    // 5. Grants pipeline summary
    const today = todayStr();
    const twoWeeksOut = daysFromNow(14);

    const [closingSoon, pipelineStats] = await Promise.all([
      supabase
        .from("grant_opportunities")
        .select("name, closes_at, amount_max, aligned_projects, application_status")
        .not("application_status", "in", '("not_relevant","next_round","unsuccessful")')
        .gte("closes_at", today)
        .lte("closes_at", twoWeeksOut)
        .order("closes_at", { ascending: true })
        .limit(5),
      supabase
        .from("grant_opportunities")
        .select("application_status, amount_max")
        .not("application_status", "in", '("not_relevant","next_round")'),
    ]);

    const closingGrants = closingSoon.data || [];
    const allGrants = pipelineStats.data || [];

    if (closingGrants.length > 0 || allGrants.length > 0) {
      const grantLines: string[] = ["GRANTS PIPELINE"];
      grantLines.push("─".repeat(20));

      if (closingGrants.length > 0) {
        grantLines.push("Closing soon:");
        for (const g of closingGrants as any[]) {
          const daysLeft = Math.ceil((new Date(g.closes_at).getTime() - Date.now()) / 86400000);
          const amount = g.amount_max ? ` ($${Number(g.amount_max).toLocaleString()})` : "";
          const projects = g.aligned_projects?.length ? ` [${g.aligned_projects.join(", ")}]` : "";
          grantLines.push(`  - ${g.name} — ${daysLeft}d${amount}${projects}`);
        }
      }

      // Summary stats
      const statusCounts: Record<string, number> = {};
      let pipelineValue = 0;
      for (const g of allGrants as any[]) {
        const s = g.application_status || "not_applied";
        statusCounts[s] = (statusCounts[s] || 0) + 1;
        pipelineValue += Number(g.amount_max) || 0;
      }

      const statusParts = Object.entries(statusCounts)
        .map(([s, c]) => `${c} ${s}`)
        .join(", ");
      grantLines.push(`Status: ${statusParts}`);
      grantLines.push(`Pipeline value: $${pipelineValue.toLocaleString()} across ${allGrants.length} opportunities`);

      sections.push(grantLines.join("\n"));
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
    const supabase = getSupabase();
    const q = params.query.toLowerCase();

    const { data: contacts, error } = await supabase
      .from("ghl_contacts")
      .select(
        "ghl_id, full_name, first_name, last_name, email, phone, company_name, engagement_status, last_contact_date, projects, tags"
      )
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(5);

    if (error) return `Error searching contacts: ${error.message}`;
    if (!contacts?.length) return `No contacts found matching "${params.query}".`;

    const results: string[] = [];

    for (const c of contacts as any[]) {
      const name = c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim();

      const { data: health } = await supabase
        .from("relationship_health")
        .select("temperature, temperature_trend, email_score, calendar_score, financial_score, pipeline_score, last_contact_at, risk_flags")
        .eq("ghl_contact_id", c.ghl_id)
        .maybeSingle();

      const thirtyDaysAgo = daysAgo(30);
      const { count: recentComms } = await supabase
        .from("communications")
        .select("id", { count: "exact", head: true })
        .or(`from_email.ilike.%${c.email}%,to_emails.cs.{${c.email}}`)
        .gte("date", thirtyDaysAgo);

      const h = health as any;
      const lines = [
        `${name}`,
        c.email ? `  Email: ${c.email}` : null,
        c.phone ? `  Phone: ${c.phone}` : null,
        c.company_name ? `  Company: ${c.company_name}` : null,
        `  Status: ${c.engagement_status || "unknown"}`,
        c.projects?.length ? `  Projects: ${c.projects.join(", ")}` : null,
        c.tags?.length ? `  Tags: ${c.tags.join(", ")}` : null,
        h ? `  Temperature: ${h.temperature}/100 (${h.temperature_trend || "stable"})` : null,
        h ? `  Signals: email=${h.email_score || 0}, calendar=${h.calendar_score || 0}, financial=${h.financial_score || 0}, pipeline=${h.pipeline_score || 0}` : null,
        h?.risk_flags ? `  Risk: ${JSON.stringify(h.risk_flags)}` : null,
        `  Recent emails (30d): ${recentComms || 0}`,
        c.last_contact_date ? `  Last contact: ${c.last_contact_date}` : null,
      ];

      results.push(lines.filter(Boolean).join("\n"));
    }

    return results.join("\n\n---\n\n");
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

    let knowledgeQuery = supabase
      .from("project_knowledge")
      .select("project_code, knowledge_type")
      .gte("recorded_at", daysAgo(30));

    if (params.project_code) {
      knowledgeQuery = knowledgeQuery.eq("project_code", params.project_code);
    }

    const { data: knowledge } = await knowledgeQuery;

    let grantQuery = supabase
      .from("grant_applications")
      .select("project_code, status, amount_requested")
      .in("status", ["draft", "in_progress", "submitted", "under_review"]);

    if (params.project_code) {
      grantQuery = grantQuery.eq("project_code", params.project_code);
    }

    const { data: grants } = await grantQuery;

    const projects = new Map<string, {
      knowledge: number;
      decisions: number;
      actions: number;
      meetings: number;
      grants: number;
      grantValue: number;
    }>();

    for (const k of (knowledge || []) as any[]) {
      const code = k.project_code || "UNLINKED";
      if (!projects.has(code)) {
        projects.set(code, { knowledge: 0, decisions: 0, actions: 0, meetings: 0, grants: 0, grantValue: 0 });
      }
      const p = projects.get(code)!;
      p.knowledge++;
      if (k.knowledge_type === "decision") p.decisions++;
      if (k.knowledge_type === "meeting") p.meetings++;
      if (k.knowledge_type === "action_item") p.actions++;
    }

    for (const g of (grants || []) as any[]) {
      const code = g.project_code || "UNLINKED";
      if (!projects.has(code)) {
        projects.set(code, { knowledge: 0, decisions: 0, actions: 0, meetings: 0, grants: 0, grantValue: 0 });
      }
      const p = projects.get(code)!;
      p.grants++;
      p.grantValue += g.amount_requested || 0;
    }

    if (!projects.size) return "No project activity found in the last 30 days.";

    const lines: string[] = [];
    for (const [code, p] of [...projects.entries()].sort((a, b) => b[1].knowledge - a[1].knowledge)) {
      lines.push(
        [
          `${code}`,
          `  Activity (30d): ${p.knowledge} entries (${p.meetings} meetings, ${p.decisions} decisions, ${p.actions} actions)`,
          p.grants > 0
            ? `  Grants: ${p.grants} active, $${p.grantValue.toLocaleString()} pipeline`
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
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    let txQuery = supabase
      .from("xero_transactions")
      .select("project_code, total, date, contact_name, type")
      .gte("date", since.toISOString().split("T")[0]);

    if (params.project_code) {
      txQuery = txQuery.eq("project_code", params.project_code);
    }

    const { data: transactions, error } = await txQuery;
    if (error) return `Error fetching transactions: ${error.message}`;

    const byProject = new Map<string, { spend: number; income: number; count: number }>();
    let untaggedCount = 0;
    let untaggedAmount = 0;

    for (const tx of (transactions || []) as any[]) {
      const code = tx.project_code || "UNTAGGED";
      if (code === "UNTAGGED") {
        untaggedCount++;
        untaggedAmount += Math.abs(tx.total || 0);
        continue;
      }

      if (!byProject.has(code)) {
        byProject.set(code, { spend: 0, income: 0, count: 0 });
      }
      const p = byProject.get(code)!;
      p.count++;
      if ((tx.total || 0) < 0) {
        p.spend += Math.abs(tx.total || 0);
      } else {
        p.income += tx.total || 0;
      }
    }

    const { data: grants } = await supabase
      .from("grant_applications")
      .select("project_code, amount_requested, status")
      .in("status", ["submitted", "under_review"]);

    let pipelineTotal = 0;
    for (const g of (grants || []) as any[]) {
      if (params.project_code && g.project_code !== params.project_code) continue;
      pipelineTotal += g.amount_requested || 0;
    }

    const sections: string[] = [];

    if (byProject.size) {
      const lines = [...byProject.entries()]
        .sort((a, b) => b[1].spend - a[1].spend)
        .map(
          ([code, p]) =>
            `  ${code}: $${p.spend.toLocaleString()} spent, $${p.income.toLocaleString()} income (${p.count} txns)`
        );
      sections.push(`SPEND BY PROJECT (${months}mo):\n${lines.join("\n")}`);
    }

    if (untaggedCount > 0) {
      sections.push(
        `UNTAGGED: ${untaggedCount} transactions ($${untaggedAmount.toLocaleString()})`
      );
    }

    if (pipelineTotal > 0) {
      sections.push(
        `GRANT PIPELINE: $${pipelineTotal.toLocaleString()} across ${grants?.length || 0} active applications`
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
    const max = params.limit ?? 20;

    const { data, error } = await supabase
      .from("v_need_to_respond")
      .select("contact_name, contact_email, subject, summary, days_since, sentiment, topics")
      .order("occurred_at", { ascending: true })
      .limit(max);

    if (error) return `Error: ${error.message}`;
    if (!data?.length) return "No unanswered emails — inbox is clear!";

    const lines = (data as any[]).map((e) => {
      const age = e.days_since ? `${e.days_since}d ago` : "unknown";
      const topicStr = e.topics?.length ? ` [${e.topics.join(", ")}]` : "";
      return [
        `${e.contact_name || e.contact_email || "Unknown"} — ${age}`,
        `  Subject: ${e.subject}`,
        e.summary ? `  Summary: ${e.summary}` : null,
        `  Sentiment: ${e.sentiment || "neutral"}${topicStr}`,
      ].filter(Boolean).join("\n");
    });

    return `UNANSWERED EMAILS (${data.length})\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
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
    const supabase = getSupabase();

    let query = supabase
      .from("v_projects_needing_attention")
      .select("project_code, project_name, overall_score, health_status, momentum_score, alerts, calculated_at, time_since_calculation")
      .order("overall_score", { ascending: true });

    if (params.project_code) {
      query = query.eq("project_code", params.project_code);
    }

    const { data, error } = await query;
    if (error) return `Error: ${error.message}`;
    if (!data?.length) return "No projects currently flagged as needing attention.";

    const lines = (data as any[]).map((p) => {
      const alertList = Array.isArray(p.alerts) && p.alerts.length
        ? `  Alerts: ${p.alerts.map((a: any) => typeof a === "string" ? a : a.message || JSON.stringify(a)).join("; ")}`
        : null;
      return [
        `[${p.health_status?.toUpperCase()}] ${p.project_code} — ${p.project_name}`,
        `  Health: ${p.overall_score}/100 | Momentum: ${p.momentum_score}/100`,
        alertList,
        `  Last calculated: ${p.calculated_at ? new Date(p.calculated_at).toLocaleDateString() : "unknown"}`,
      ].filter(Boolean).join("\n");
    });

    return `PROJECTS NEEDING ATTENTION (${data.length})\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
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
    const supabase = getSupabase();
    const maxDays = params.days_ahead ?? 90;

    let query = supabase
      .from("v_funding_pipeline")
      .select("name, funder_name, category, total_pool_amount, min_grant_amount, max_grant_amount, deadline, days_until_deadline, focus_areas, relevance_score, application_count, status")
      .not("deadline", "is", null)
      .gte("days_until_deadline", 0)
      .lte("days_until_deadline", maxDays)
      .order("days_until_deadline", { ascending: true });

    if (params.category) {
      query = query.ilike("category", `%${params.category}%`);
    }

    const { data, error } = await query;
    if (error) return `Error: ${error.message}`;
    if (!data?.length) return `No funding opportunities closing within ${maxDays} days.`;

    const lines = (data as any[]).map((o) => {
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

    return `FUNDING PIPELINE (${data.length} opportunities, next ${maxDays} days)\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
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
    const max = params.months ?? 6;

    const { data, error } = await supabase
      .from("v_cashflow_summary")
      .select("month, income, expenses, net, closing_balance, is_projection, confidence, income_breakdown, expense_breakdown")
      .order("month", { ascending: false })
      .limit(max);

    if (error) return `Error: ${error.message}`;
    if (!data?.length) return "No cash flow data available.";

    const lines = (data as any[]).reverse().map((m) => {
      const monthLabel = new Date(m.month).toLocaleDateString("en-AU", { month: "short", year: "numeric" });
      const proj = m.is_projection ? ` (PROJECTED, ${m.confidence || 0}% confidence)` : "";
      return [
        `${monthLabel}${proj}`,
        `  Income: $${Number(m.income || 0).toLocaleString()} | Expenses: $${Number(m.expenses || 0).toLocaleString()}`,
        `  Net: $${Number(m.net || 0).toLocaleString()} | Balance: $${Number(m.closing_balance || 0).toLocaleString()}`,
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
    const supabase = getSupabase();

    let query = supabase
      .from("v_outstanding_invoices")
      .select("invoice_number, contact_name, project_code, type, total, amount_due, amount_paid, date, due_date, aging_bucket, days_overdue")
      .order("days_overdue", { ascending: false, nullsFirst: false });

    if (params.project_code) {
      query = query.eq("project_code", params.project_code);
    }

    const { data, error } = await query;
    if (error) return `Error: ${error.message}`;
    if (!data?.length) return "No outstanding invoices — all paid up!";

    let totalDue = 0;
    const lines = (data as any[]).map((inv) => {
      totalDue += Number(inv.amount_due || 0);
      const overdue = inv.days_overdue > 0 ? ` (${inv.days_overdue}d overdue)` : "";
      return [
        `${inv.invoice_number || "No #"} — ${inv.contact_name || "Unknown"}${overdue}`,
        `  Project: ${inv.project_code || "Untagged"} | Type: ${inv.type || "invoice"}`,
        `  Total: $${Number(inv.total || 0).toLocaleString()} | Due: $${Number(inv.amount_due || 0).toLocaleString()} | Paid: $${Number(inv.amount_paid || 0).toLocaleString()}`,
        `  Due date: ${inv.due_date || "N/A"} | Aging: ${inv.aging_bucket || "current"}`,
      ].join("\n");
    });

    return `OUTSTANDING INVOICES (${data.length}, total due: $${totalDue.toLocaleString()})\n${"─".repeat(40)}\n\n${lines.join("\n\n")}`;
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
    const supabase = getSupabase();

    let query = supabase
      .from("sync_status")
      .select("integration_name, status, last_success_at, last_attempt_at, record_count, last_error, avg_duration_ms")
      .order("integration_name");

    if (params.integration) {
      query = query.ilike("integration_name", `%${params.integration}%`);
    }

    const { data, error } = await query;
    if (error) return `Error: ${error.message}`;
    if (!data?.length) return "No sync status data found.";

    const now = Date.now();
    const STALE_HOURS = 12;

    const lines = (data as any[]).map((s) => {
      const lastSync = s.last_success_at ? new Date(s.last_success_at) : null;
      const hoursAgo = lastSync ? Math.round((now - lastSync.getTime()) / 3600000) : null;
      const isStale = hoursAgo === null || hoursAgo > STALE_HOURS;
      const statusIcon = s.status === "healthy" && !isStale ? "OK" : s.status === "error" ? "ERR" : isStale ? "STALE" : "OK";

      return [
        `[${statusIcon}] ${s.integration_name}`,
        lastSync
          ? `  Last sync: ${lastSync.toISOString().replace("T", " ").slice(0, 19)} (${hoursAgo}h ago)`
          : "  Last sync: never",
        s.record_count !== null ? `  Records: ${s.record_count}` : null,
        s.last_error ? `  Error: ${s.last_error}` : null,
      ].filter(Boolean).join("\n");
    });

    const staleCount = (data as any[]).filter((s) => {
      if (!s.last_success_at) return true;
      return (now - new Date(s.last_success_at).getTime()) > STALE_HOURS * 3600000;
    }).length;

    const header = staleCount > 0
      ? `DATA FRESHNESS — ${staleCount} integration(s) stale`
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

    // Get all unanswered emails
    const { data: emails, error } = await supabase
      .from("v_need_to_respond")
      .select("id, ghl_contact_id, contact_name, contact_email, subject, summary, days_since, sentiment, topics, occurred_at")
      .order("occurred_at", { ascending: false });

    if (error) return `Error: ${error.message}`;
    if (!emails?.length) return "No unanswered emails — inbox is clear!";

    // Get contact tags for prioritization
    const contactIds = [...new Set((emails as any[]).map((e) => e.ghl_contact_id).filter(Boolean))];
    const { data: contacts } = await supabase
      .from("ghl_contacts")
      .select("ghl_id, tags")
      .in("ghl_id", contactIds);

    const tagMap = new Map((contacts || []).map((c: any) => [c.ghl_id, c.tags || []]));

    const keyTags = ["partner", "funder", "board", "investor", "government", "key_contact"];

    type EmailRow = typeof emails extends (infer T)[] ? T : never;
    const tier1: EmailRow[] = [];
    const tier2: EmailRow[] = [];
    const tier3: EmailRow[] = [];

    for (const email of emails as any[]) {
      const tags = tagMap.get(email.ghl_contact_id) || [];
      const isKeyContact = tags.some((t: string) => keyTags.some((k) => t.toLowerCase().includes(k)));

      if (isKeyContact) {
        tier1.push(email);
      } else if ((email.days_since || 0) <= 7) {
        tier2.push(email);
      } else {
        tier3.push(email);
      }
    }

    const formatTier = (label: string, items: any[], maxItems: number) => {
      if (!items.length) return null;
      const lines = items.slice(0, maxItems).map((e: any) => {
        const age = e.days_since ? `${e.days_since}d ago` : "unknown";
        return [
          `  ${e.contact_name || e.contact_email || "Unknown"} — ${age}`,
          `    Subject: ${e.subject}`,
          e.summary ? `    Summary: ${e.summary}` : null,
        ].filter(Boolean).join("\n");
      });
      const overflow = items.length > maxItems ? `\n  ... and ${items.length - maxItems} more` : "";
      return `${label} (${items.length}):\n${lines.join("\n\n")}${overflow}`;
    };

    const sections = [
      formatTier("TIER 1 — KEY CONTACTS (reply first)", tier1, max),
      formatTier("TIER 2 — RECENT (< 7 days)", tier2, max),
      formatTier("TIER 3 — BACKLOG", tier3, max),
    ].filter(Boolean);

    return `EMAIL TRIAGE (${emails.length} total)\n${"─".repeat(40)}\n\n${sections.join("\n\n")}`;
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
    const supabase = getSupabase();

    let query = supabase
      .from("v_grant_readiness")
      .select("grant_name, provider, fit_score, amount_max, closes_at, application_status, lead_contact, assigned_to, priority, total_requirements, ready_count, needed_count, readiness_pct")
      .order("readiness_pct", { ascending: true });

    if (params.min_readiness !== null) {
      query = query.gte("readiness_pct", params.min_readiness);
    }

    if (params.status) {
      query = query.eq("application_status", params.status);
    }

    const { data, error } = await query;
    if (error) return `Error: ${error.message}`;
    if (!data?.length) return "No grant applications found matching criteria.";

    const lines = (data as any[]).map((g) => {
      const pct = Number(g.readiness_pct || 0);
      const icon = pct >= 100 ? "✅" : pct >= 75 ? "🟡" : "🔴";
      const deadline = g.closes_at ? `Deadline: ${g.closes_at}` : "No deadline";
      const amount = g.amount_max ? `$${Number(g.amount_max).toLocaleString()}` : "TBD";

      return [
        `${icon} ${g.grant_name} (${pct}% ready)`,
        `  Provider: ${g.provider || "Unknown"} | ${amount}`,
        `  Status: ${g.application_status} | ${deadline}`,
        `  Requirements: ${g.ready_count}/${g.total_requirements} complete, ${g.needed_count} needed`,
        g.lead_contact ? `  Lead: ${g.lead_contact}` : null,
        g.priority ? `  Priority: ${g.priority}` : null,
      ].filter(Boolean).join("\n");
    });

    const readyCount = (data as any[]).filter((g) => Number(g.readiness_pct) >= 100).length;
    const header = readyCount > 0
      ? `GRANT READINESS — ${readyCount}/${data.length} ready to submit`
      : `GRANT READINESS — ${data.length} applications, none fully ready`;

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
        type: "string" as const,
        description: "ACT project code (e.g. ACT-EL, ACT-HV, ACT-JH, ACT-GD, ACT-FM, ACT-HQ)",
      },
    },
    required: ["project_code"] as const,
    additionalProperties: false,
  },
  execute: async (params: { project_code: string }) => {
    const supabase = getSupabase();
    const code = params.project_code.toUpperCase();

    // Parallel fetch all intelligence data
    const [snapshot, focusAreas, health, knowledge, relationships, grants] = await Promise.all([
      // Latest snapshot
      supabase
        .from("project_intelligence_snapshots")
        .select("*")
        .eq("project_code", code)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Focus areas
      supabase
        .from("project_focus_areas")
        .select("title, description, status, priority, target_date")
        .eq("project_code", code)
        .in("status", ["current", "upcoming", "blocked"])
        .order("priority"),

      // Health
      supabase
        .from("project_health")
        .select("health_score, momentum_score, engagement_score, financial_score, timeline_score, calculated_at")
        .eq("project_code", code)
        .maybeSingle(),

      // Recent knowledge
      supabase
        .from("project_knowledge")
        .select("title, knowledge_type, importance, recorded_at, action_required, follow_up_date")
        .eq("project_code", code)
        .order("recorded_at", { ascending: false })
        .limit(10),

      // Key contacts
      supabase
        .from("v_project_relationships")
        .select("contact_name, company_name, temperature, temperature_trend, last_contact_at")
        .eq("project_code", code)
        .order("temperature", { ascending: false, nullsFirst: false })
        .limit(8),

      // Active grants
      supabase
        .from("grant_applications")
        .select("application_name, status, amount_requested, project_code")
        .eq("project_code", code)
        .in("status", ["draft", "in_progress", "submitted", "under_review"]),
    ]);

    const sections: string[] = [];
    sections.push(`PROJECT INTELLIGENCE: ${code}`);
    sections.push("─".repeat(40));

    // Snapshot / financials
    const s = snapshot.data as any;
    if (s) {
      const finLines: string[] = [
        `\nFINANCIALS (FY):`,
        `  Revenue: $${Number(s.fy_revenue || 0).toLocaleString()}`,
        `  Expenses: $${Number(s.fy_expenses || 0).toLocaleString()}`,
        `  Net: $${Number(s.fy_net || 0).toLocaleString()}`,
      ];
      if (s.monthly_burn_rate) finLines.push(`  Burn rate: $${Number(s.monthly_burn_rate).toLocaleString()}/mo`);
      if (s.pipeline_value) finLines.push(`  Pipeline: $${Number(s.pipeline_value).toLocaleString()}`);
      sections.push(...finLines);
    }

    // Health
    const h = health.data as any;
    if (h) {
      sections.push(
        `\nHEALTH SCORES:`,
        `  Overall: ${h.health_score}/100 | Momentum: ${h.momentum_score}/100`,
        `  Engagement: ${h.engagement_score}/100 | Financial: ${h.financial_score}/100 | Timeline: ${h.timeline_score}/100`,
      );
    }

    // Focus areas
    const fa = (focusAreas.data || []) as any[];
    const current = fa.filter((f) => f.status === "current");
    const blocked = fa.filter((f) => f.status === "blocked");
    const upcoming = fa.filter((f) => f.status === "upcoming");

    if (current.length || blocked.length || upcoming.length) {
      sections.push(`\nFOCUS AREAS:`);
      if (current.length) {
        sections.push(`  Current:`);
        current.forEach((f: any) => sections.push(`    - ${f.title}${f.description ? `: ${f.description}` : ""}`));
      }
      if (blocked.length) {
        sections.push(`  Blocked:`);
        blocked.forEach((f: any) => sections.push(`    - ${f.title}${f.description ? `: ${f.description}` : ""}`));
      }
      if (upcoming.length) {
        sections.push(`  Upcoming:`);
        upcoming.forEach((f: any) => {
          const target = f.target_date ? ` (target: ${f.target_date})` : "";
          sections.push(`    - ${f.title}${target}`);
        });
      }
    }

    // Relationships
    const rels = (relationships.data || []) as any[];
    if (rels.length) {
      sections.push(`\nKEY RELATIONSHIPS (${rels.length}):`);
      rels.forEach((r: any) => {
        const trend = r.temperature_trend ? ` (${r.temperature_trend})` : "";
        const company = r.company_name ? ` — ${r.company_name}` : "";
        sections.push(`  - ${r.contact_name}${company}: temp ${r.temperature || "?"}/100${trend}`);
      });
    }

    // Grants
    const gr = (grants.data || []) as any[];
    if (gr.length) {
      const totalPipeline = gr.reduce((s: number, g: any) => s + (g.amount_requested || 0), 0);
      sections.push(`\nACTIVE GRANTS (${gr.length}, $${totalPipeline.toLocaleString()} pipeline):`);
      gr.forEach((g: any) => {
        sections.push(`  - ${g.application_name} (${g.status}) — $${(g.amount_requested || 0).toLocaleString()}`);
      });
    }

    // Recent knowledge
    const kn = (knowledge.data || []) as any[];
    if (kn.length) {
      sections.push(`\nRECENT KNOWLEDGE (${kn.length}):`);
      kn.slice(0, 5).forEach((k: any) => {
        const date = k.recorded_at ? k.recorded_at.split("T")[0] : "";
        const action = k.action_required ? " [ACTION REQUIRED]" : "";
        sections.push(`  - [${k.knowledge_type}] ${k.title} (${date})${action}`);
      });
    }

    // Recent wins / blockers from snapshot
    if (s?.recent_wins?.length) {
      sections.push(`\nRECENT WINS:`);
      (s.recent_wins as string[]).forEach((w: string) => sections.push(`  - ${w}`));
    }
    if (s?.blockers?.length) {
      sections.push(`\nBLOCKERS:`);
      (s.blockers as string[]).forEach((b: string) => sections.push(`  - ${b}`));
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
    const supabase = getSupabase();
    const max = params.months ?? 6;

    const { data, error } = await supabase
      .from("v_cashflow_explained")
      .select("*")
      .order("month", { ascending: false })
      .limit(max);

    if (error) return `Error: ${error.message}`;
    if (!data?.length) return "No cash flow data available.";

    const lines = (data as any[]).reverse().map((m) => {
      const monthLabel = new Date(m.month).toLocaleDateString("en-AU", { month: "short", year: "numeric" });
      const incChange = m.income_change != null ? ` (${Number(m.income_change) >= 0 ? "+" : ""}$${Number(m.income_change).toLocaleString()})` : "";
      const expChange = m.expense_change != null ? ` (${Number(m.expense_change) >= 0 ? "+" : ""}$${Number(m.expense_change).toLocaleString()})` : "";

      const result = [
        `${monthLabel}`,
        `  Income: $${Number(m.income || 0).toLocaleString()}${incChange}`,
        `  Expenses: $${Number(m.expenses || 0).toLocaleString()}${expChange}`,
        `  Net: $${Number(m.net || 0).toLocaleString()} | Balance: $${Number(m.closing_balance || 0).toLocaleString()}`,
      ];

      // Add variance explanations
      const explanations = m.explanations as any[] | null;
      if (explanations?.length) {
        for (const e of explanations) {
          result.push(`  → ${e.explanation}`);
        }
      }

      return result.join("\n");
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
    const supabase = getSupabase();
    const code = params.project_code.toUpperCase();
    const max = params.months ?? 12;

    const { data, error } = await supabase
      .from("project_monthly_financials")
      .select("*")
      .eq("project_code", code)
      .order("month", { ascending: false })
      .limit(max);

    if (error) return `Error: ${error.message}`;
    if (!data?.length) return `No monthly financial data for ${code}. Run the monthly calculation first.`;

    const months = (data as any[]).reverse();
    let totalRev = 0;
    let totalExp = 0;

    const lines = months.map((m) => {
      const label = new Date(m.month).toLocaleDateString("en-AU", { month: "short", year: "numeric" });
      const rev = Number(m.revenue || 0);
      const exp = Number(m.expenses || 0);
      const net = Number(m.net || 0);
      totalRev += rev;
      totalExp += exp;

      const expBreakdown = m.expense_breakdown || {};
      const topExp = Object.entries(expBreakdown)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([cat, amt]) => `${cat}: $${Number(amt).toLocaleString()}`)
        .join(", ");

      return [
        `${label}: Revenue $${rev.toLocaleString()} | Expenses $${exp.toLocaleString()} | Net $${net.toLocaleString()}`,
        topExp ? `  Top expenses: ${topExp}` : null,
      ].filter(Boolean).join("\n");
    });

    const latest = months[months.length - 1];
    const header = [
      `PROJECT P&L: ${code}`,
      "─".repeat(40),
      `Period total: Revenue $${totalRev.toLocaleString()} | Expenses $${totalExp.toLocaleString()} | Net $${(totalRev - totalExp).toLocaleString()}`,
      latest.fy_ytd_revenue ? `FY YTD: Revenue $${Number(latest.fy_ytd_revenue).toLocaleString()} | Expenses $${Number(latest.fy_ytd_expenses).toLocaleString()} | Net $${Number(latest.fy_ytd_net).toLocaleString()}` : null,
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
    const supabase = getSupabase();
    const type = params.type;

    // Pipeline value by type and stage
    let pvQuery = supabase.from("v_pipeline_value").select("*");
    if (type) pvQuery = pvQuery.eq("opportunity_type", type);

    const { data: pv, error: pvError } = await pvQuery;
    if (pvError) return `Error: ${pvError.message}`;
    if (!pv || pv.length === 0)
      return "No active opportunities in the pipeline.";

    // Summary
    const totalWeighted = pv.reduce(
      (sum: number, r: any) => sum + Number(r.weighted_value || 0),
      0
    );
    const totalUnweighted = pv.reduce(
      (sum: number, r: any) => sum + Number(r.total_value || 0),
      0
    );
    const totalCount = pv.reduce(
      (sum: number, r: any) => sum + Number(r.opportunity_count || 0),
      0
    );

    // Group by type
    const byType: Record<string, { weighted: number; total: number; count: number }> = {};
    for (const r of pv) {
      const t = r.opportunity_type;
      if (!byType[t]) byType[t] = { weighted: 0, total: 0, count: 0 };
      byType[t].weighted += Number(r.weighted_value || 0);
      byType[t].total += Number(r.total_value || 0);
      byType[t].count += Number(r.opportunity_count || 0);
    }

    const sections: string[] = [
      "PIPELINE VALUE SUMMARY",
      "─".repeat(40),
      `Total opportunities: ${totalCount}`,
      `Unweighted value: $${totalUnweighted.toLocaleString()}`,
      `Weighted value (probability-adjusted): $${totalWeighted.toLocaleString()}`,
      "",
      "BY TYPE:",
    ];

    for (const [t, v] of Object.entries(byType)) {
      sections.push(
        `  ${t}: ${v.count} opps | $${v.total.toLocaleString()} total | $${v.weighted.toLocaleString()} weighted`
      );
    }

    // Group by stage
    sections.push("", "BY STAGE:");
    const byStage: Record<string, { weighted: number; total: number; count: number }> = {};
    for (const r of pv) {
      const s = r.stage;
      if (!byStage[s]) byStage[s] = { weighted: 0, total: 0, count: 0 };
      byStage[s].weighted += Number(r.weighted_value || 0);
      byStage[s].total += Number(r.total_value || 0);
      byStage[s].count += Number(r.opportunity_count || 0);
    }

    const stageOrder = [
      "identified", "researching", "pursuing", "submitted",
      "negotiating", "approved",
    ];
    for (const s of stageOrder) {
      if (byStage[s]) {
        sections.push(
          `  ${s}: ${byStage[s].count} opps | $${byStage[s].total.toLocaleString()} | $${byStage[s].weighted.toLocaleString()} weighted`
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
    const supabase = getSupabase();
    const scenario = params.scenario;

    let query = supabase
      .from("revenue_scenarios")
      .select("*")
      .order("name");
    if (scenario) query = query.eq("name", scenario.toLowerCase());

    const { data: scenarios, error: scenError } = await query;
    if (scenError) return `Error: ${scenError.message}`;
    if (!scenarios || scenarios.length === 0)
      return "No revenue scenarios configured. Run: node scripts/build-revenue-scenarios.mjs";

    const sections: string[] = [
      "10-YEAR REVENUE FORECAST",
      "─".repeat(40),
    ];

    for (const s of scenarios) {
      const targets = s.annual_targets || {};
      const years = Object.keys(targets).sort();
      if (years.length === 0) continue;

      const firstYear = Number(years[0]);
      const lastYear = Number(years[years.length - 1]);
      const firstVal = targets[years[0]];
      const lastVal = targets[years[years.length - 1]];
      const totalGrowth =
        firstVal > 0 ? ((lastVal / firstVal - 1) * 100).toFixed(0) : "N/A";

      sections.push("");
      sections.push(`${s.name.toUpperCase()}: ${s.description || ""}`);
      sections.push(`  ${firstYear}-${lastYear} | Total growth: ${totalGrowth}%`);

      // Show key years (first, mid, last)
      const keyYears = [
        years[0],
        years[Math.floor(years.length / 3)],
        years[Math.floor((years.length * 2) / 3)],
        years[years.length - 1],
      ];
      const uniqueYears = [...new Set(keyYears)];
      for (const y of uniqueYears) {
        sections.push(`  ${y}: $${Number(targets[y]).toLocaleString()}`);
      }

      // Assumptions
      const assumptions = s.assumptions || {};
      if (Object.keys(assumptions).length > 0) {
        const aStr = Object.entries(assumptions)
          .map(([k, v]) => {
            const val =
              typeof v === "number" && v < 1
                ? `${(v * 100).toFixed(0)}%`
                : String(v);
            return `${k.replace(/_/g, " ")}: ${val}`;
          })
          .join(", ");
        sections.push(`  Assumptions: ${aStr}`);
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
    const supabase = getSupabase();
    const maxItems = params.limit ?? 20;
    const sections: string[] = [
      "TRANSACTION FIX SUGGESTIONS",
      "─".repeat(40),
    ];

    // 1. Unmapped transactions with suggestions
    const { data: unmapped } = await supabase
      .from("v_unmapped_transactions")
      .select("*")
      .limit(maxItems);

    if (unmapped && unmapped.length > 0) {
      const withSuggestion = unmapped.filter((u: any) => u.suggested_project);
      const withoutSuggestion = unmapped.filter((u: any) => !u.suggested_project);

      sections.push("");
      sections.push(`UNMAPPED TRANSACTIONS: ${unmapped.length} found`);

      if (withSuggestion.length > 0) {
        sections.push(`  Auto-fixable (${withSuggestion.length}):`);
        for (const u of withSuggestion.slice(0, 10) as any[]) {
          sections.push(
            `    ${u.date} | ${u.contact_name} | $${Math.abs(Number(u.total)).toLocaleString()} → ${u.suggested_project} (${u.suggested_category || "general"})`
          );
        }
      }

      if (withoutSuggestion.length > 0) {
        sections.push(`  Need manual tagging (${withoutSuggestion.length}):`);
        for (const u of withoutSuggestion.slice(0, 5) as any[]) {
          sections.push(
            `    ${u.date} | ${u.contact_name} | $${Math.abs(Number(u.total)).toLocaleString()}`
          );
        }
      }
    } else {
      sections.push("");
      sections.push("UNMAPPED TRANSACTIONS: None found");
    }

    // 2. Potential duplicate subscriptions
    let dupes: any[] | null = null;
    try {
      const { data } = await supabase.rpc("get_potential_duplicate_subscriptions");
      dupes = data;
    } catch { /* RPC may not exist */ }
    if (dupes && (dupes as any[]).length > 0) {
      sections.push("");
      sections.push(`POTENTIAL DUPLICATE SUBSCRIPTIONS: ${(dupes as any[]).length}`);
      for (const d of (dupes as any[]).slice(0, 5)) {
        sections.push(`  ${d.contact_name}: ${d.count}x in period ($${d.total})`);
      }
    }

    // 3. Large variance vendors (month-to-month)
    const { data: variances } = await supabase
      .from("financial_variance_notes")
      .select("*")
      .eq("severity", "critical")
      .order("created_at", { ascending: false })
      .limit(5);

    if (variances && variances.length > 0) {
      sections.push("");
      sections.push(`CRITICAL VARIANCES: ${variances.length}`);
      for (const v of variances as any[]) {
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
    const supabase = getSupabase();

    let query = supabase
      .from("impact_metrics")
      .select("*")
      .order("metric_type");

    if (params.project_code) {
      query = query.eq("project_code", params.project_code);
    }

    const { data, error } = await query;
    if (error) return `Error: ${error.message}`;
    if (!data || data.length === 0)
      return params.project_code
        ? `No impact metrics recorded for ${params.project_code}. Run: node scripts/extract-impact-metrics.mjs`
        : "No impact metrics recorded yet. Run: node scripts/extract-impact-metrics.mjs";

    // Aggregate by metric_type
    const agg: Record<string, { total: number; unit: string; count: number; projects: Set<string> }> = {};
    for (const m of data as any[]) {
      const t = m.metric_type;
      if (!agg[t]) agg[t] = { total: 0, unit: m.unit || "", count: 0, projects: new Set() };
      agg[t].total += Number(m.value);
      agg[t].count++;
      agg[t].projects.add(m.project_code);
    }

    const verified = (data as any[]).filter(m => m.verified).length;
    const total = data.length;

    const sections: string[] = [
      params.project_code ? `IMPACT SUMMARY: ${params.project_code}` : "IMPACT SUMMARY: All Projects",
      "─".repeat(40),
      `${total} metrics recorded (${verified} verified)`,
      "",
    ];

    for (const [type, v] of Object.entries(agg)) {
      const projectList = [...v.projects].join(", ");
      sections.push(
        `${type.replace(/_/g, " ").toUpperCase()}: ${v.total.toLocaleString()} ${v.unit}`
      );
      if (!params.project_code && v.projects.size > 1) {
        sections.push(`  Projects: ${projectList}`);
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
    const maxResults = params.limit ?? 10;

    // Text search across project_knowledge
    let query = supabase
      .from("project_knowledge")
      .select("id, title, content, knowledge_type, project_code, topics, importance, recorded_at, summary")
      .or(`title.ilike.%${params.query}%,content.ilike.%${params.query}%,summary.ilike.%${params.query}%`)
      .order("recorded_at", { ascending: false })
      .limit(maxResults);

    if (params.project_code) {
      query = query.eq("project_code", params.project_code);
    }

    const { data, error } = await query;
    if (error) return `Error: ${error.message}`;
    if (!data || data.length === 0) return `No knowledge found matching "${params.query}".`;

    // Get linked items for top results
    const topIds = (data as any[]).slice(0, 3).map((d: any) => d.id);
    const { data: links } = await supabase
      .from("knowledge_links")
      .select("source_id, target_id, link_type, reason")
      .or(`source_id.in.(${topIds.join(",")}),target_id.in.(${topIds.join(",")})`)
      .limit(10);

    const sections: string[] = [
      `KNOWLEDGE SEARCH: "${params.query}"`,
      "─".repeat(40),
      `Found ${data.length} results`,
      "",
    ];

    for (const item of data as any[]) {
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
      const summary = item.summary || item.content?.substring(0, 150) || "";

      sections.push(`${item.title || "Untitled"} (${item.knowledge_type})`);
      sections.push(`  Project: ${item.project_code} | Date: ${date}${topics}`);
      if (summary) sections.push(`  ${summary.substring(0, 200)}`);

      // Show linked items
      if (links) {
        const related = (links as any[]).filter(
          (l: any) => l.source_id === item.id || l.target_id === item.id
        );
        if (related.length > 0) {
          sections.push(
            `  Links: ${related.map((l: any) => `${l.link_type}${l.reason ? ` (${l.reason})` : ""}`).join(", ")}`
          );
        }
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
    const supabase = getSupabase();
    const now = new Date();
    const today = todayStr();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];

    // ── 1. CASH POSITION ──
    const { data: snapshots } = await supabase
      .from("financial_snapshots")
      .select("month, closing_balance, income, expenses")
      .order("month", { ascending: false })
      .limit(6);

    const latest = snapshots?.[0];
    const prior = snapshots?.[1];
    const balance = latest?.closing_balance || 0;
    const balanceChange = prior ? balance - (prior.closing_balance || 0) : 0;

    let totalBurn = 0;
    for (const m of snapshots || []) {
      totalBurn += Math.max(0, (m.expenses || 0) - (m.income || 0));
    }
    const burnRate = (snapshots?.length || 1) > 0 ? totalBurn / (snapshots?.length || 1) : 0;
    const runway = burnRate > 0 ? Math.round((balance / burnRate) * 10) / 10 : 0;

    // ── 2. THIS WEEK ──
    const { data: weekTxns } = await supabase
      .from("xero_transactions")
      .select("total, type, contact_name, project_code")
      .gte("date", weekAgoStr);

    let weekIncome = 0, weekExpenses = 0;
    const incomeByContact: Record<string, number> = {};
    const expenseByContact: Record<string, number> = {};

    for (const tx of weekTxns || []) {
      const amt = Math.abs(Number(tx.total) || 0);
      const contact = tx.contact_name || "Unknown";
      if (tx.type === "RECEIVE") {
        weekIncome += amt;
        incomeByContact[contact] = (incomeByContact[contact] || 0) + amt;
      } else if (tx.type === "SPEND") {
        weekExpenses += amt;
        expenseByContact[contact] = (expenseByContact[contact] || 0) + amt;
      }
    }

    const topIncome = Object.entries(incomeByContact).sort(([, a], [, b]) => b - a).slice(0, 3);
    const topExpenses = Object.entries(expenseByContact).sort(([, a], [, b]) => b - a).slice(0, 3);

    // ── 3. OVERDUE INVOICES ──
    const { data: invoices } = await supabase
      .from("xero_invoices")
      .select("invoice_number, contact_name, amount_due, due_date, status")
      .in("status", ["AUTHORISED", "SENT"])
      .eq("type", "ACCREC")
      .gt("amount_due", 0);

    const buckets = { current: 0, "1-30d": 0, "31-60d": 0, "61-90d": 0, "90d+": 0 };
    const overdueList: string[] = [];
    let totalDue = 0;

    for (const inv of invoices || []) {
      const amt = Number(inv.amount_due) || 0;
      totalDue += amt;
      if (!inv.due_date || inv.due_date >= today) {
        buckets.current += amt;
      } else {
        const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24));
        if (daysOverdue <= 30) buckets["1-30d"] += amt;
        else if (daysOverdue <= 60) buckets["31-60d"] += amt;
        else if (daysOverdue <= 90) buckets["61-90d"] += amt;
        else buckets["90d+"] += amt;

        overdueList.push(
          `  ${inv.contact_name || "Unknown"} — $${amt.toLocaleString()} (${daysOverdue}d overdue) [${inv.invoice_number}]`
        );
      }
    }

    // ── 4. RECEIPT GAP ──
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0];

    const { count: totalExpenses } = await supabase
      .from("xero_transactions")
      .select("*", { count: "exact", head: true })
      .eq("type", "SPEND")
      .gte("date", threeMonthsAgoStr);

    const { count: withReceipts } = await supabase
      .from("xero_transactions")
      .select("*", { count: "exact", head: true })
      .eq("type", "SPEND")
      .eq("has_attachment", true)
      .gte("date", threeMonthsAgoStr);

    const receiptTotal = totalExpenses || 0;
    const receiptMatched = withReceipts || 0;
    const receiptScore = receiptTotal > 0 ? Math.round((receiptMatched / receiptTotal) * 100) : 100;

    // ── 5. PROJECT SPEND ──
    const projectSpend: Record<string, number> = {};
    for (const tx of weekTxns || []) {
      if (tx.project_code && (Number(tx.total) || 0) < 0) {
        projectSpend[tx.project_code] = (projectSpend[tx.project_code] || 0) + Math.abs(Number(tx.total));
      }
    }
    const topProjects = Object.entries(projectSpend).sort(([, a], [, b]) => b - a).slice(0, 5);

    // ── 6. GRANT DEADLINES ──
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() + 14);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const { data: grants } = await supabase
      .from("grant_applications")
      .select("application_name, project_code, status, milestones")
      .in("status", ["draft", "in_progress", "submitted", "under_review", "successful"]);

    const grantLines: string[] = [];
    for (const g of grants || []) {
      for (const m of g.milestones || []) {
        if (m.due && m.due <= cutoffStr && m.due >= today && !m.completed) {
          const daysLeft = Math.ceil((new Date(m.due).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          grantLines.push(`  ${g.application_name}: ${m.name || "Milestone"} — ${daysLeft}d remaining`);
        }
      }
    }

    // ── 7. R&D SPEND ──
    const { data: rdRules } = await supabase
      .from("vendor_project_rules")
      .select("vendor_name")
      .eq("rd_eligible", true);

    const rdVendors = new Set((rdRules || []).map((r: any) => r.vendor_name));
    let weekRd = 0;
    for (const tx of weekTxns || []) {
      if (rdVendors.has(tx.contact_name) && (Number(tx.total) || 0) < 0) {
        weekRd += Math.abs(Number(tx.total));
      }
    }

    const fyStart = now.getMonth() >= 6 ? `${now.getFullYear()}-07-01` : `${now.getFullYear() - 1}-07-01`;
    const { data: ytdTxns } = await supabase
      .from("xero_transactions")
      .select("contact_name, total")
      .lt("total", 0)
      .gte("date", fyStart);

    let ytdRd = 0;
    for (const tx of ytdTxns || []) {
      if (rdVendors.has(tx.contact_name)) ytdRd += Math.abs(Number(tx.total));
    }

    // ── 8. DATA QUALITY ──
    const { count: untaggedCount } = await supabase
      .from("xero_transactions")
      .select("*", { count: "exact", head: true })
      .is("project_code", null)
      .gte("date", "2024-07-01")
      .lt("total", 0);

    const { count: totalTxCount } = await supabase
      .from("xero_transactions")
      .select("*", { count: "exact", head: true })
      .gte("date", "2024-07-01")
      .lt("total", 0);

    const untagged = untaggedCount || 0;
    const totalTx = totalTxCount || 0;
    const coverage = totalTx > 0 ? Math.round(((totalTx - untagged) / totalTx) * 100) : 100;

    // ── 9. ACTION ITEMS ──
    const actions: string[] = [];
    if (overdueList.length > 0)
      actions.push(`CHASE: ${overdueList.length} overdue invoices ($${Math.round(totalDue - buckets.current).toLocaleString()})`);
    if (receiptTotal - receiptMatched > 5)
      actions.push(`CAPTURE: ${receiptTotal - receiptMatched} missing receipts (score: ${receiptScore}%)`);
    if (untagged > 10)
      actions.push(`TAG: ${untagged} untagged transactions (coverage: ${coverage}%)`);
    if (grantLines.length > 0)
      actions.push(`GRANTS: ${grantLines.length} deadline(s) within 14 days`);
    if (runway > 0 && runway < 6)
      actions.push(`RUNWAY: ${runway} months — review burn rate`);

    // ── FORMAT OUTPUT ──
    const f = (n: number) => `$${Math.round(n).toLocaleString()}`;
    const sections = [
      `WEEKLY FINANCIAL REVIEW — Week of ${weekAgoStr}`,
      "═".repeat(50),
      "",
      `1. CASH POSITION`,
      `   Balance: ${f(balance)} (${balanceChange >= 0 ? "+" : ""}${f(balanceChange)} this month)`,
      `   Burn rate: ${f(burnRate)}/mo | Runway: ${runway} months`,
      "",
      `2. THIS WEEK`,
      `   Income: ${f(weekIncome)} | Expenses: ${f(weekExpenses)} | Net: ${weekIncome - weekExpenses >= 0 ? "+" : ""}${f(weekIncome - weekExpenses)}`,
      ...(topIncome.length > 0 ? [`   Top income: ${topIncome.map(([n, a]) => `${n} (${f(a)})`).join(", ")}`] : []),
      ...(topExpenses.length > 0 ? [`   Top expenses: ${topExpenses.map(([n, a]) => `${n} (${f(a)})`).join(", ")}`] : []),
      "",
      `3. OVERDUE INVOICES (${overdueList.length} overdue of ${invoices?.length || 0} total, ${f(totalDue)} due)`,
      `   Aging: Current ${f(buckets.current)} | 1-30d ${f(buckets["1-30d"])} | 31-60d ${f(buckets["31-60d"])} | 61-90d ${f(buckets["61-90d"])} | 90d+ ${f(buckets["90d+"])}`,
      ...(overdueList.length > 0 ? overdueList.slice(0, 10) : ["   All current — no overdue invoices!"]),
      "",
      `4. RECEIPT GAP`,
      `   Score: ${receiptScore}% (${receiptMatched} of ${receiptTotal} matched, ${receiptTotal - receiptMatched} missing)`,
      "",
      `5. PROJECT SPEND (this week)`,
      ...(topProjects.length > 0
        ? topProjects.map(([code, amt]) => `   ${code}: ${f(amt)}`)
        : ["   No project spend this week"]),
      "",
      `6. GRANT DEADLINES (next 14 days)`,
      ...(grantLines.length > 0 ? grantLines : ["   No upcoming deadlines"]),
      "",
      `7. R&D SPEND`,
      `   This week: ${f(weekRd)} | YTD: ${f(ytdRd)} | 43.5% offset: ${f(ytdRd * 0.435)}`,
      "",
      `8. DATA QUALITY`,
      `   Tagging coverage: ${coverage}% (${untagged} untagged of ${totalTx})`,
      "",
      `9. ACTION ITEMS`,
      ...(actions.length > 0 ? actions.map(a => `   → ${a}`) : ["   ✅ No urgent actions this week"]),
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
    const supabase = getSupabase();
    const daysBack = params.days_back || 30;
    const maxResults = Math.min(params.limit || 10, 20);
    const cutoff = new Date(Date.now() - daysBack * 86400000).toISOString();

    let query = supabase
      .from("project_knowledge")
      .select("id, title, recorded_at, project_code, project_name, participants, content, summary, ai_summary, ai_action_items, transcript, meeting_duration_minutes, transcription_status, topics, action_required, metadata, source_url")
      .eq("knowledge_type", "meeting")
      .gte("recorded_at", cutoff)
      .order("recorded_at", { ascending: false })
      .limit(maxResults);

    if (params.project_code) {
      query = query.eq("project_code", params.project_code);
    }

    if (params.participant) {
      query = query.contains("participants", [params.participant]);
    }

    if (params.query) {
      query = query.or(`title.ilike.%${params.query}%,content.ilike.%${params.query}%`);
    }

    const { data, error } = await query;
    if (error) return `Error: ${error.message}`;
    if (!data?.length) return "No meetings found matching your criteria.";

    const lines: string[] = [`MEETING NOTES — ${data.length} results (last ${daysBack} days)`, ""];

    for (const m of data as any[]) {
      const date = m.recorded_at ? new Date(m.recorded_at).toISOString().split("T")[0] : "unknown";
      const duration = m.meeting_duration_minutes ? ` (${m.meeting_duration_minutes} min)` : "";
      const participants = (m.participants || []).join(", ") || "unknown";

      lines.push(`━━━ ${m.title || "Untitled"} ━━━`);
      lines.push(`Date: ${date}${duration} | Project: ${m.project_code || "unassigned"}`);
      if (m.source_url) {
        lines.push(`Notion: ${m.source_url}`);
      }
      lines.push(`Participants: ${participants}`);

      // Prefer AI summary, fall back to LLM-extracted summary
      const summary = m.ai_summary || m.summary;
      if (summary) {
        lines.push(`Summary: ${summary.slice(0, 500)}`);
      }

      // Show AI action items if available
      if (m.ai_action_items?.length) {
        lines.push("Action items:");
        for (const item of m.ai_action_items.slice(0, 5)) {
          const check = item.completed ? "x" : " ";
          lines.push(`  [${check}] ${item.action}`);
        }
      }

      // Show strategic relevance from LLM extraction
      if (m.metadata?.strategic_relevance) {
        lines.push(`Strategic: ${m.metadata.strategic_relevance}`);
      }

      // Optionally include transcript (truncated)
      if (params.include_transcript && m.transcript) {
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
    const supabase = getSupabase();
    const daysBack = params.days_back || 30;
    const cutoff = new Date(Date.now() - daysBack * 86400000).toISOString();

    // 1. Get meetings with AI action items
    let meetingQuery = supabase
      .from("project_knowledge")
      .select("id, title, recorded_at, project_code, ai_action_items, participants, source_url")
      .eq("knowledge_type", "meeting")
      .not("ai_action_items", "is", null)
      .gte("recorded_at", cutoff)
      .order("recorded_at", { ascending: false })
      .limit(50);

    if (params.project_code) {
      meetingQuery = meetingQuery.eq("project_code", params.project_code);
    }

    const { data: meetings } = await meetingQuery;

    // 2. Get LLM-extracted action items linked to meetings
    let actionQuery = supabase
      .from("project_knowledge")
      .select("id, title, content, project_code, recorded_at, participants, action_items, importance")
      .eq("knowledge_type", "action")
      .eq("source_type", "meeting_extraction")
      .gte("recorded_at", cutoff)
      .order("recorded_at", { ascending: false })
      .limit(50);

    if (params.project_code) {
      actionQuery = actionQuery.eq("project_code", params.project_code);
    }

    const { data: extractedActions } = await actionQuery;

    const lines: string[] = [`MEETING ACTION ITEMS — Last ${daysBack} days`, ""];

    // AI-extracted action items (from Notion transcription)
    let aiActionCount = 0;
    if (meetings?.length) {
      lines.push("── From AI Transcription ──");
      for (const m of meetings as any[]) {
        if (!m.ai_action_items?.length) continue;
        const items = params.include_completed
          ? m.ai_action_items
          : m.ai_action_items.filter((a: any) => !a.completed);
        if (!items.length) continue;

        const date = new Date(m.recorded_at).toISOString().split("T")[0];
        lines.push(`\n${m.title} (${date}) [${m.project_code}]`);
        if (m.source_url) {
          lines.push(`  Notion: ${m.source_url}`);
        }
        for (const item of items) {
          const check = item.completed ? "x" : " ";
          lines.push(`  [${check}] ${item.action}`);
          aiActionCount++;
        }
      }
      if (aiActionCount === 0) lines.push("  No open AI action items.");
      lines.push("");
    }

    // LLM-extracted action items
    if (extractedActions?.length) {
      lines.push("── From Intelligence Extraction ──");
      for (const a of extractedActions as any[]) {
        const date = new Date(a.recorded_at).toISOString().split("T")[0];
        const assignee = a.action_items?.[0]?.assignee || "Unassigned";
        const priority = a.importance === "high" ? " [HIGH]" : "";
        lines.push(`  ${priority} ${a.title}`);
        lines.push(`    From: ${date} [${a.project_code}] | Assignee: ${assignee}`);
      }
      lines.push("");
    }

    if (!meetings?.length && !extractedActions?.length) {
      return "No meeting action items found for the specified criteria.";
    }

    const total = aiActionCount + (extractedActions?.length || 0);
    lines.push(`Total: ${total} action items`);

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
    const stage = params.stage;
    const sb = getSupabase();
    const lines: string[] = ["═══ Receipt Pipeline Status ═══", ""];

    // Funnel counts
    let query = sb.from("receipt_pipeline_status").select("stage, amount, transaction_date, vendor_name");
    if (stage) query = query.eq("stage", stage);
    const { data: pipeline, error } = await query;
    if (error) return `Error: ${error.message}`;
    if (!pipeline?.length) return "No receipt pipeline data yet. Run the correlation script first.";

    const stages = ["missing_receipt", "forwarded_to_dext", "dext_processed", "xero_bill_created", "reconciled"];
    const stageLabels: Record<string, string> = {
      missing_receipt: "Missing Receipt",
      forwarded_to_dext: "Forwarded to Dext",
      dext_processed: "Dext Processed",
      xero_bill_created: "Xero Bill Created",
      reconciled: "Reconciled",
    };

    const now = Date.now();
    const stuckThreshold = 14 * 24 * 60 * 60 * 1000;

    const stageCounts: Record<string, { count: number; amount: number; stuck: number; items: any[] }> = {};
    for (const s of stages) {
      stageCounts[s] = { count: 0, amount: 0, stuck: 0, items: [] };
    }

    for (const row of pipeline) {
      const s = row.stage;
      if (!stageCounts[s]) stageCounts[s] = { count: 0, amount: 0, stuck: 0, items: [] };
      stageCounts[s].count++;
      stageCounts[s].amount += Math.abs(parseFloat(row.amount) || 0);
      if (row.transaction_date && now - new Date(row.transaction_date).getTime() > stuckThreshold) {
        stageCounts[s].stuck++;
      }
      stageCounts[s].items.push(row);
    }

    // Funnel summary
    lines.push("── Pipeline Funnel ──");
    let totalCount = 0;
    for (const s of stages) {
      const sc = stageCounts[s];
      totalCount += sc.count;
      const stuckLabel = sc.stuck > 0 ? ` ⚠️ ${sc.stuck} stuck` : "";
      lines.push(`  ${stageLabels[s]}: ${sc.count} ($${sc.amount.toLocaleString()})${stuckLabel}`);
    }
    lines.push("");

    // Summary stats
    const reconciledCount = stageCounts.reconciled?.count || 0;
    const rate = totalCount > 0 ? Math.round((reconciledCount / totalCount) * 100) : 0;
    lines.push("── Summary ──");
    lines.push(`  Total tracked: ${totalCount}`);
    lines.push(`  Reconciliation rate: ${rate}%`);
    lines.push(`  Reconciled: ${reconciledCount}`);
    lines.push("");

    // Alerts
    const alerts: string[] = [];
    if (stageCounts.missing_receipt.stuck > 0) {
      alerts.push(`${stageCounts.missing_receipt.stuck} receipts stuck > 14 days`);
    }
    if (stageCounts.forwarded_to_dext.stuck > 0) {
      alerts.push(`${stageCounts.forwarded_to_dext.stuck} Dext forwarding may have failed (> 14 days)`);
    }

    // High-value unreconciled
    const highValue = pipeline
      .filter(r => r.stage !== "reconciled" && Math.abs(parseFloat(r.amount) || 0) > 500)
      .sort((a, b) => Math.abs(parseFloat(b.amount) || 0) - Math.abs(parseFloat(a.amount) || 0));
    if (highValue.length > 0) {
      alerts.push(`${highValue.length} unreconciled transactions > $500`);
    }

    if (alerts.length > 0) {
      lines.push("── Alerts ──");
      for (const a of alerts) {
        lines.push(`  ⚠️ ${a}`);
      }
      lines.push("");
    }

    // Show items for specific stage
    if (stage && stageCounts[stage]) {
      const items = stageCounts[stage].items
        .sort((a: any, b: any) => Math.abs(parseFloat(b.amount) || 0) - Math.abs(parseFloat(a.amount) || 0))
        .slice(0, 20);
      lines.push(`── ${stageLabels[stage]} Items (top ${items.length}) ──`);
      for (const item of items) {
        const date = item.transaction_date ? new Date(item.transaction_date).toISOString().split("T")[0] : "?";
        lines.push(`  ${item.vendor_name || "Unknown"}: $${Math.abs(parseFloat(item.amount) || 0)} (${date})`);
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
    const supabase = getSupabase();

    const { data: grants, error } = await supabase
      .from("grant_opportunities")
      .select("id, name, provider, closes_at, amount_max, application_status, url, act_readiness, aligned_projects")
      .ilike("name", `%${params.grant_name}%`)
      .limit(3);

    if (error) return `Error: ${error.message}`;
    if (!grants?.length) return `No grants found matching "${params.grant_name}".`;

    const results: string[] = [];

    for (const grant of grants as any[]) {
      const lines: string[] = [
        `━━━ ${grant.name} ━━━`,
        `Provider: ${grant.provider || "Unknown"}`,
        `Status: ${grant.application_status || "not_applied"}`,
        grant.closes_at ? `Deadline: ${grant.closes_at}` : null,
        grant.amount_max ? `Amount: up to $${Number(grant.amount_max).toLocaleString()}` : null,
        grant.url ? `URL: ${grant.url}` : null,
        grant.aligned_projects?.length ? `Projects: ${grant.aligned_projects.join(", ")}` : null,
      ].filter(Boolean) as string[];

      // Get requirements from enrichment
      const { data: reqs } = await supabase
        .from("grant_application_requirements")
        .select("requirement_type, description, is_met")
        .eq("opportunity_id", grant.id)
        .order("requirement_type");

      if (reqs?.length) {
        const eligibility = reqs.filter((r: any) => r.requirement_type === "eligibility");
        const assessment = reqs.filter((r: any) => r.requirement_type === "assessment");
        const documents = reqs.filter((r: any) => r.requirement_type === "document");

        if (eligibility.length) {
          lines.push("", "ELIGIBILITY CRITERIA:");
          for (const r of eligibility) {
            const check = (r as any).is_met ? "x" : " ";
            lines.push(`  [${check}] ${(r as any).description}`);
          }
        }

        if (assessment.length) {
          lines.push("", "ASSESSMENT CRITERIA:");
          for (const r of assessment) {
            lines.push(`  - ${(r as any).description}`);
          }
        }

        if (documents.length) {
          lines.push("", "REQUIRED DOCUMENTS:");
          for (const r of documents) {
            const check = (r as any).is_met ? "x" : " ";
            lines.push(`  [${check}] ${(r as any).description}`);
          }
        }

        const totalReqs = reqs.length;
        const metReqs = reqs.filter((r: any) => r.is_met).length;
        const readiness = totalReqs > 0 ? Math.round((metReqs / totalReqs) * 100) : 0;
        lines.push("", `READINESS: ${readiness}% (${metReqs}/${totalReqs} requirements met)`);
      }

      // Check act_readiness JSONB for additional context
      if (grant.act_readiness && typeof grant.act_readiness === "object") {
        const readiness = grant.act_readiness as any;
        if (readiness.score != null) {
          lines.push(`ACT Fit Score: ${readiness.score}%`);
        }
        if (readiness.gaps?.length) {
          lines.push("", "GAPS:");
          for (const gap of readiness.gaps) {
            lines.push(`  - ${gap}`);
          }
        }
      }

      if (!reqs?.length && !grant.act_readiness) {
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
    const supabase = getSupabase();

    let query = supabase
      .from("grant_opportunities")
      .select("id, name, provider, closes_at, amount_max, application_status, aligned_projects, updated_at");

    if (params.project_code) {
      query = query.contains("aligned_projects", [params.project_code]);
    }

    const { data: grants, error } = await query;
    if (error) return `Error: ${error.message}`;
    if (!grants?.length) return "No grant opportunities found.";

    // Count by status
    const statusCounts: Record<string, number> = {};
    let totalPipelineValue = 0;

    for (const g of grants as any[]) {
      const status = g.application_status || "not_applied";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      if (g.amount_max && !["not_relevant", "next_round", "unsuccessful"].includes(status)) {
        totalPipelineValue += Number(g.amount_max) || 0;
      }
    }

    const lines: string[] = [
      `GRANTS PIPELINE SUMMARY`,
      `${"─".repeat(40)}`,
      "",
      `Total: ${grants.length} opportunities | Pipeline value: $${totalPipelineValue.toLocaleString()}`,
      "",
      "BY STATUS:",
    ];

    const statusOrder = ["not_applied", "reviewing", "in_progress", "submitted", "successful", "unsuccessful", "not_relevant", "next_round"];
    for (const s of statusOrder) {
      if (statusCounts[s]) {
        lines.push(`  ${s}: ${statusCounts[s]}`);
      }
    }

    // Urgent deadlines (next 14 days)
    const now = new Date();
    const twoWeeks = new Date(now.getTime() + 14 * 86400000);
    const urgent = (grants as any[])
      .filter((g) => g.closes_at && new Date(g.closes_at) >= now && new Date(g.closes_at) <= twoWeeks)
      .sort((a, b) => new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime());

    if (urgent.length > 0) {
      lines.push("", "CLOSING SOON (next 14 days):");
      for (const g of urgent.slice(0, 10)) {
        const daysLeft = Math.ceil((new Date(g.closes_at).getTime() - now.getTime()) / 86400000);
        const amount = g.amount_max ? ` ($${Number(g.amount_max).toLocaleString()})` : "";
        const projects = g.aligned_projects?.length ? ` [${g.aligned_projects.join(", ")}]` : "";
        lines.push(`  ${g.name} — ${daysLeft}d${amount}${projects}`);
      }
    }

    // Recent status changes (last 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const recent = (grants as any[])
      .filter((g) => g.updated_at && new Date(g.updated_at) >= weekAgo)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);

    if (recent.length > 0) {
      lines.push("", "RECENTLY UPDATED:");
      for (const g of recent) {
        const date = new Date(g.updated_at).toISOString().split("T")[0];
        lines.push(`  ${g.name} — ${g.application_status} (${date})`);
      }
    }

    // Group by project
    const byProject: Record<string, number> = {};
    for (const g of grants as any[]) {
      for (const p of g.aligned_projects || []) {
        byProject[p] = (byProject[p] || 0) + 1;
      }
    }

    if (Object.keys(byProject).length > 0) {
      lines.push("", "BY PROJECT:");
      for (const [proj, count] of Object.entries(byProject).sort(([, a], [, b]) => b - a)) {
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
    const supabase = getSupabase();

    const [streamsResult, pipelineResult, scenariosResult, projectsResult] = await Promise.all([
      supabase.from("revenue_streams").select("*").eq("status", "active"),
      supabase.from("fundraising_pipeline").select("*"),
      supabase.from("revenue_scenarios").select("*"),
      supabase.from("projects").select("name, code, status"),
    ]);

    const streams = streamsResult.data || [];
    const pipeline = pipelineResult.data || [];
    const scenarios = scenariosResult.data || [];
    const projects = projectsResult.data || [];

    const totalMonthlyTarget = streams.reduce(
      (sum: number, s: any) => sum + parseFloat(s.target_monthly || "0"), 0
    );

    let totalPipelineValue = 0;
    let totalWeightedValue = 0;
    let totalReceivables = 0;

    for (const item of pipeline) {
      const amount = parseFloat(item.amount || "0");
      const probability = parseFloat(item.probability || "0");
      if (item.type === "receivable") {
        totalReceivables += amount;
      } else {
        totalPipelineValue += amount;
        totalWeightedValue += amount * probability;
      }
    }

    const topOps = pipeline
      .filter((p: any) => p.type !== "receivable")
      .map((p: any) => ({
        name: p.name,
        funder: p.funder,
        amount: parseFloat(p.amount || "0"),
        probability: parseFloat(p.probability || "0"),
        weighted: parseFloat(p.amount || "0") * parseFloat(p.probability || "0"),
        status: p.status,
        expected: p.expected_date,
        projects: p.project_codes,
      }))
      .sort((a: any, b: any) => b.weighted - a.weighted)
      .slice(0, 10);

    const receivables = pipeline
      .filter((p: any) => p.type === "receivable")
      .map((p: any) => ({
        name: p.name,
        funder: p.funder,
        amount: parseFloat(p.amount || "0"),
      }));

    const activeProjects = projects.filter((p: any) => p.status === "active");

    const lines: string[] = [
      "REVENUE SCOREBOARD",
      `Generated: ${new Date().toISOString().split("T")[0]}`,
      "",
      "TARGETS:",
      `  Monthly: $${totalMonthlyTarget.toLocaleString()}`,
      `  Annual: $${(totalMonthlyTarget * 12).toLocaleString()}`,
      "",
      "STREAMS:",
    ];

    for (const s of streams) {
      lines.push(`  ${s.name} (${s.code}): $${parseFloat(s.target_monthly || "0").toLocaleString()}/mo [${s.category}]`);
    }

    lines.push("", "PIPELINE:", `  Total value: $${totalPipelineValue.toLocaleString()}`, `  Weighted value: $${totalWeightedValue.toLocaleString()}`, `  Opportunities: ${pipeline.filter((p: any) => p.type !== "receivable").length}`, "", "TOP OPPORTUNITIES:");

    for (const op of topOps) {
      lines.push(`  ${op.name} — $${op.amount.toLocaleString()} × ${(op.probability * 100).toFixed(0)}% = $${op.weighted.toLocaleString()} [${op.status}] (${op.projects?.join(", ") || "no project"})`);
    }

    lines.push("", "RECEIVABLES:", `  Outstanding: $${totalReceivables.toLocaleString()}`);
    for (const r of receivables) {
      lines.push(`  ${r.name} (${r.funder}): $${r.amount.toLocaleString()}`);
    }

    if (scenarios.length > 0) {
      lines.push("", "SCENARIOS:");
      for (const s of scenarios) {
        lines.push(`  ${(s as any).name}: ${(s as any).description}`);
      }
    }

    lines.push("", `PROJECTS: ${activeProjects.length} active / ${projects.length} total`);

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
    const supabase = getSupabase();
    const now = new Date();
    const today = todayStr();
    const weekFromNow = daysFromNow(7);
    const includeFinancials = params.include_financials !== false;

    // Known archived/non-project codes to exclude from pulse
    const ARCHIVED_OR_META_CODES = new Set([
      "ACT-DG", "ACT-MR", "ACT-MN", "ACT-FN", "ACT-SS", "ACT-ER",
      "ACT-TN", "ACT-10", "ACT-SH", "ACT-SE", "ACT-QF", "ACT-DD",
      "ACT-BM", "ACT-AI", "ACT-BV", "ACT-WJ", "ACT-YC", "ACT-TW",
      "ACT-HS", "ACT-DH", "ACT-MM", "ACT-MU", "ACT-BR", "ACT-CC",
      "ACT-FP", "ACT-FA", "ACT-SF", "ACT-SX", "ACT-WE", "ACT-RP",
      "ACT-OE", "ACT-OS", "ACT-GCC", "ACT-EFI", "ACT-APO", "ACT-AMT",
      "ACT-MISC", "_WEEKLY",
    ]);

    // Determine which projects to report on
    let projectCodes: string[];
    if (params.project_code) {
      projectCodes = [params.project_code];
    } else {
      // Get active projects that have recent activity (last 60 days)
      const cutoff60 = daysAgo(60);
      const { data: recentKnowledge } = await supabase
        .from("project_knowledge")
        .select("project_code")
        .gte("recorded_at", cutoff60)
        .not("project_code", "is", null);

      const { data: recentGrants } = await supabase
        .from("grant_applications")
        .select("project_code")
        .in("status", ["draft", "in_progress", "submitted", "under_review", "successful"])
        .not("project_code", "is", null);

      const codes = new Set<string>();
      for (const k of recentKnowledge || []) if (k.project_code && !ARCHIVED_OR_META_CODES.has(k.project_code)) codes.add(k.project_code);
      for (const g of recentGrants || []) if (g.project_code && !ARCHIVED_OR_META_CODES.has(g.project_code)) codes.add(g.project_code);
      projectCodes = [...codes].sort();
    }

    if (projectCodes.length === 0) return "No active projects with recent activity found.";

    // Parallel data fetch for all projects
    const [
      { data: allActions },
      { data: allDecisions },
      { data: allMeetings },
      { data: allGrants },
      { data: allInvoices },
      { data: allContacts },
      { data: allHealth },
    ] = await Promise.all([
      // Open actions (overdue + upcoming)
      supabase
        .from("project_knowledge")
        .select("project_code, title, recorded_at, importance, action_required")
        .eq("action_required", true)
        .in("project_code", projectCodes)
        .order("recorded_at", { ascending: false })
        .limit(200),
      // Pending decisions
      supabase
        .from("project_knowledge")
        .select("project_code, title, recorded_at, decision_status")
        .eq("knowledge_type", "decision")
        .in("decision_status", ["pending", "proposed"])
        .in("project_code", projectCodes)
        .limit(100),
      // Last meetings per project
      supabase
        .from("project_knowledge")
        .select("project_code, title, recorded_at")
        .eq("knowledge_type", "meeting")
        .in("project_code", projectCodes)
        .order("recorded_at", { ascending: false })
        .limit(200),
      // Active grants
      supabase
        .from("grant_applications")
        .select("project_code, application_name, status, amount_requested, milestones")
        .in("status", ["draft", "in_progress", "submitted", "under_review", "successful"])
        .in("project_code", projectCodes),
      // Outstanding invoices (only if financials requested)
      includeFinancials
        ? supabase
            .from("xero_invoices")
            .select("contact_name, amount_due, due_date, status, tracking_category")
            .in("status", ["AUTHORISED", "SENT"])
            .gt("amount_due", 0)
        : Promise.resolve({ data: [] }),
      // Key contacts with relationship health
      supabase
        .from("ghl_contacts")
        .select("full_name, temperature, temperature_trend, engagement_status, projects")
        .not("full_name", "is", null)
        .not("projects", "is", null)
        .limit(200),
      // Project health scores
      supabase
        .from("project_health")
        .select("project_code, health_score, computed_at")
        .in("project_code", projectCodes)
        .order("computed_at", { ascending: false })
        .limit(100),
    ]);

    // Build per-project pulse
    const sections: string[] = [
      `WEEKLY PROJECT PULSE — ${new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`,
      "═".repeat(50),
      "",
    ];

    for (const code of projectCodes) {
      // Actions
      const actions = (allActions || []).filter((a: any) => a.project_code === code);
      const overdueActions = actions.filter((a: any) => a.recorded_at && new Date(a.recorded_at) < new Date(daysAgo(7)));
      const upcomingActions = actions.filter((a: any) => !overdueActions.includes(a));

      // Decisions
      const decisions = (allDecisions || []).filter((d: any) => d.project_code === code);

      // Last meeting
      const meetings = (allMeetings || []).filter((m: any) => m.project_code === code);
      const lastMeeting = meetings[0];
      const daysSinceMeeting = lastMeeting
        ? Math.floor((now.getTime() - new Date(lastMeeting.recorded_at).getTime()) / 86400000)
        : null;

      // Grants
      const grants = (allGrants || []).filter((g: any) => g.project_code === code);
      const grantPipelineValue = grants.reduce((s: number, g: any) => s + (g.amount_requested || 0), 0);
      let nextGrantDeadline: string | null = null;
      for (const g of grants as any[]) {
        for (const m of g.milestones || []) {
          if (m.due && m.due >= today && !m.completed) {
            if (!nextGrantDeadline || m.due < nextGrantDeadline) nextGrantDeadline = m.due;
          }
        }
      }

      // Invoices (match by xero_tracking pattern)
      const invoices = includeFinancials
        ? (allInvoices || []).filter((inv: any) => inv.tracking_category?.includes(code))
        : [];
      const totalOutstanding = invoices.reduce((s: number, inv: any) => s + (Number(inv.amount_due) || 0), 0);

      // Contacts
      const contacts = (allContacts || []).filter((c: any) => {
        const projs = Array.isArray(c.projects) ? c.projects : [];
        return projs.some((p: string) => p.includes(code));
      });
      const warmContacts = contacts.filter((c: any) => c.temperature_trend === "warming" || (c.temperature && c.temperature >= 70));
      const coolingContacts = contacts.filter((c: any) => c.temperature_trend === "cooling");

      // Health
      const healthEntries = (allHealth || []).filter((h: any) => h.project_code === code);
      const latestHealth = healthEntries[0];

      // Last activity signal
      const allDates = [
        ...(actions.map((a: any) => a.recorded_at)),
        ...(decisions.map((d: any) => d.recorded_at)),
        ...(meetings.map((m: any) => m.recorded_at)),
      ].filter(Boolean).map((d: string) => new Date(d).getTime());
      const lastActivityMs = allDates.length > 0 ? Math.max(...allDates) : 0;
      const daysSinceActivity = lastActivityMs > 0 ? Math.floor((now.getTime() - lastActivityMs) / 86400000) : null;

      // Format
      const statusLabel = daysSinceActivity !== null && daysSinceActivity <= 7 ? "ACTIVE" : daysSinceActivity !== null && daysSinceActivity <= 30 ? "QUIET" : "STALE";
      sections.push(`${code}`);
      sections.push(`  Status: ${statusLabel}${daysSinceActivity !== null ? ` | Last activity: ${daysSinceActivity}d ago` : ""}${latestHealth ? ` | Health: ${latestHealth.health_score}/100` : ""}`);
      sections.push(`  Actions: ${overdueActions.length} overdue, ${upcomingActions.length} open`);
      if (decisions.length > 0) sections.push(`  Decisions: ${decisions.length} pending`);
      if (lastMeeting) sections.push(`  Last meeting: ${new Date(lastMeeting.recorded_at).toISOString().split("T")[0]} (${daysSinceMeeting}d ago)`);
      if (grants.length > 0) {
        let grantLine = `  Grants: ${grants.length} active ($${grantPipelineValue.toLocaleString()} pipeline)`;
        if (nextGrantDeadline) {
          const daysUntil = Math.ceil((new Date(nextGrantDeadline).getTime() - now.getTime()) / 86400000);
          grantLine += `, next deadline ${nextGrantDeadline} (${daysUntil}d)`;
        }
        sections.push(grantLine);
      }
      if (includeFinancials && invoices.length > 0) {
        sections.push(`  Invoices: ${invoices.length} outstanding ($${totalOutstanding.toLocaleString()})`);
      }
      if (contacts.length > 0) {
        const contactParts: string[] = [];
        for (const c of warmContacts.slice(0, 2)) contactParts.push(`${c.full_name} (warm${c.temperature ? `, ${c.temperature}/100` : ""})`);
        for (const c of coolingContacts.slice(0, 2)) contactParts.push(`${c.full_name} (cooling${c.temperature ? `, ${c.temperature}/100` : ""})`);
        if (contactParts.length > 0) sections.push(`  Key contacts: ${contactParts.join(", ")}`);
      }
      sections.push("");
    }

    // Check for untagged/misc actions (not part of any real project)
    if (!params.project_code) {
      const { count: untaggedCount } = await supabase
        .from("project_knowledge")
        .select("id", { count: "exact", head: true })
        .eq("action_required", true)
        .or("project_code.is.null,project_code.eq.ACT-MISC");

      if (untaggedCount && untaggedCount > 0) {
        sections.push("DATA QUALITY");
        sections.push(`  ${untaggedCount} action items have no project code — need triaging`);
        sections.push("");
      }
    }

    // Summary footer
    const totalActions = (allActions || []).length;
    const totalDecisions = (allDecisions || []).length;
    const totalGrants = (allGrants || []).length;
    sections.push("─".repeat(50));
    sections.push(`${projectCodes.length} projects | ${totalActions} open actions | ${totalDecisions} pending decisions | ${totalGrants} active grants`);

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
    const supabase = getSupabase();
    const code = params.project_code;

    // Parallel data fetch
    const [
      { data: invoices },
      { data: openActions },
      { data: contacts },
      { data: recentDecisions },
      { data: grants },
      { data: recentKnowledge },
    ] = await Promise.all([
      // Unpaid invoices
      supabase
        .from("xero_invoices")
        .select("invoice_number, contact_name, amount_due, due_date, status, type")
        .in("status", ["AUTHORISED", "SENT", "DRAFT"])
        .gt("amount_due", 0),
      // Open action items
      supabase
        .from("project_knowledge")
        .select("title, recorded_at, importance, action_items, participants")
        .eq("project_code", code)
        .eq("action_required", true)
        .order("recorded_at", { ascending: false })
        .limit(30),
      // Contacts linked to project
      supabase
        .from("ghl_contacts")
        .select("full_name, email, temperature, temperature_trend, engagement_status, projects, last_contacted_at")
        .not("full_name", "is", null)
        .not("projects", "is", null)
        .limit(200),
      // Recent decisions
      supabase
        .from("project_knowledge")
        .select("title, content, decision_status, recorded_at")
        .eq("project_code", code)
        .eq("knowledge_type", "decision")
        .gte("recorded_at", daysAgo(90))
        .order("recorded_at", { ascending: false })
        .limit(20),
      // Grants linked to project
      supabase
        .from("grant_applications")
        .select("application_name, status, amount_requested, milestones")
        .eq("project_code", code),
      // Recent knowledge (artifacts, research, etc.)
      supabase
        .from("project_knowledge")
        .select("title, knowledge_type, recorded_at")
        .eq("project_code", code)
        .gte("recorded_at", daysAgo(90))
        .order("recorded_at", { ascending: false })
        .limit(50),
    ]);

    const lines: string[] = [
      `PROJECT CLOSE-OFF CHECKLIST: ${code}`,
      "═".repeat(50),
      "",
    ];

    // 1. FINANCIAL
    lines.push("1. FINANCIAL");
    const projectInvoices = (invoices || []).filter((inv: any) =>
      inv.tracking_category?.includes(code) ||
      inv.contact_name?.includes(code)
    );
    const unpaidReceivable = projectInvoices.filter((inv: any) => inv.type === "ACCREC");
    const unpaidPayable = projectInvoices.filter((inv: any) => inv.type === "ACCPAY");

    if (unpaidReceivable.length > 0) {
      for (const inv of unpaidReceivable) {
        lines.push(`  [ ] Chase invoice ${inv.invoice_number} — ${inv.contact_name} $${Number(inv.amount_due).toLocaleString()} (due ${inv.due_date || "unknown"})`);
      }
    }
    if (unpaidPayable.length > 0) {
      for (const inv of unpaidPayable) {
        lines.push(`  [ ] Pay invoice ${inv.invoice_number} — ${inv.contact_name} $${Number(inv.amount_due).toLocaleString()} (due ${inv.due_date || "unknown"})`);
      }
    }
    if (projectInvoices.length === 0) {
      lines.push("  [x] No outstanding invoices");
    }
    lines.push("");

    // 2. ACTIONS
    lines.push("2. OPEN ACTIONS");
    if (openActions && openActions.length > 0) {
      for (const a of openActions as any[]) {
        const age = Math.floor((Date.now() - new Date(a.recorded_at).getTime()) / 86400000);
        const priority = a.importance === "high" ? " [HIGH]" : "";
        lines.push(`  [ ]${priority} ${a.title} (${age}d old)`);
      }
    } else {
      lines.push("  [x] No open action items");
    }
    lines.push("");

    // 3. RELATIONSHIPS
    lines.push("3. RELATIONSHIPS — Thank/Follow-up");
    const projectContacts = (contacts || []).filter((c: any) => {
      const projs = Array.isArray(c.projects) ? c.projects : [];
      return projs.some((p: string) => p.includes(code));
    });
    if (projectContacts.length > 0) {
      for (const c of projectContacts as any[]) {
        const lastContact = c.last_contacted_at
          ? `last: ${new Date(c.last_contacted_at).toISOString().split("T")[0]}`
          : "no recent contact";
        const trend = c.temperature_trend ? ` (${c.temperature_trend})` : "";
        lines.push(`  [ ] ${c.full_name}${trend} — ${lastContact}`);
      }
    } else {
      lines.push("  [x] No contacts linked to this project");
    }
    lines.push("");

    // 4. KNOWLEDGE
    lines.push("4. DECISIONS TO DOCUMENT");
    if (recentDecisions && recentDecisions.length > 0) {
      for (const d of recentDecisions as any[]) {
        const status = d.decision_status || "unknown";
        const date = new Date(d.recorded_at).toISOString().split("T")[0];
        lines.push(`  [ ] ${d.title} — ${status} (${date})`);
      }
    } else {
      lines.push("  [x] No recent decisions needing documentation");
    }
    lines.push("");

    // 5. ARTIFACTS
    lines.push("5. KNOWLEDGE ARTIFACTS (last 90 days)");
    const knowledgeByType: Record<string, number> = {};
    for (const k of recentKnowledge || []) {
      const t = (k as any).knowledge_type || "other";
      knowledgeByType[t] = (knowledgeByType[t] || 0) + 1;
    }
    if (Object.keys(knowledgeByType).length > 0) {
      for (const [type, count] of Object.entries(knowledgeByType)) {
        lines.push(`  ${count} ${type}(s)`);
      }
    } else {
      lines.push("  No knowledge items recorded");
    }
    lines.push("");

    // 6. GRANTS
    lines.push("6. GRANTS");
    if (grants && grants.length > 0) {
      for (const g of grants as any[]) {
        const amount = g.amount_requested ? ` ($${Number(g.amount_requested).toLocaleString()})` : "";
        lines.push(`  [ ] ${g.application_name} — ${g.status}${amount}`);
        // Check for open milestones
        for (const m of g.milestones || []) {
          if (!m.completed) {
            lines.push(`      [ ] ${m.name || "Milestone"}${m.due ? ` (due ${m.due})` : ""}`);
          }
        }
      }
    } else {
      lines.push("  [x] No active grants");
    }
    lines.push("");

    // Summary
    const totalItems =
      (unpaidReceivable.length + unpaidPayable.length) +
      (openActions?.length || 0) +
      projectContacts.length +
      (recentDecisions?.length || 0) +
      (grants?.length || 0);
    lines.push("─".repeat(50));
    lines.push(`${totalItems} items to close off`);

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
    const supabase = getSupabase();
    const now = new Date();
    const today = todayStr();
    const weekEnd = daysFromNow(7);
    const monthEnd = daysFromNow(30);

    // Fetch applications + opportunities in parallel
    let appQuery = supabase
      .from("grant_applications")
      .select("id, application_name, project_code, status, amount_requested, milestones, created_at, updated_at")
      .in("status", ["draft", "in_progress", "submitted", "under_review", "successful"]);

    if (params.project_code) {
      appQuery = appQuery.eq("project_code", params.project_code);
    }

    let oppQuery = supabase
      .from("grant_opportunities")
      .select("id, name, provider, closes_at, amount_max, fit_score, relevance_score, application_status, aligned_projects, created_at")
      .not("application_status", "in", "(not_relevant,unsuccessful)");

    if (params.project_code) {
      oppQuery = oppQuery.contains("aligned_projects", [params.project_code]);
    }

    const [{ data: applications }, { data: opportunities }] = await Promise.all([appQuery, oppQuery]);

    const lines: string[] = [
      `DAILY GRANT REPORT — ${new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`,
      "═".repeat(50),
      "",
    ];

    // ── URGENT: Closing this week ──
    const closingThisWeek = (opportunities || [])
      .filter((o: any) => o.closes_at && o.closes_at >= today && o.closes_at <= weekEnd)
      .sort((a: any, b: any) => a.closes_at.localeCompare(b.closes_at));

    lines.push("THIS WEEK (urgent):");
    if (closingThisWeek.length > 0) {
      for (const o of closingThisWeek as any[]) {
        const daysLeft = Math.ceil((new Date(o.closes_at).getTime() - now.getTime()) / 86400000);
        const amount = o.amount_max ? ` ($${Number(o.amount_max).toLocaleString()})` : "";
        const fit = o.fit_score ? ` | Fit: ${o.fit_score}%` : "";
        const projects = o.aligned_projects?.length ? ` [${o.aligned_projects.join(", ")}]` : "";
        const status = o.application_status || "not_applied";
        lines.push(`  ⚠ ${o.name} — ${daysLeft}d left${amount}${fit} — ${status}${projects}`);
      }
    } else {
      lines.push("  No grants closing this week");
    }
    lines.push("");

    // ── THIS MONTH ──
    const closingThisMonth = (opportunities || [])
      .filter((o: any) => o.closes_at && o.closes_at > weekEnd && o.closes_at <= monthEnd)
      .sort((a: any, b: any) => a.closes_at.localeCompare(b.closes_at));

    lines.push("THIS MONTH:");
    if (closingThisMonth.length > 0) {
      for (const o of closingThisMonth as any[]) {
        const daysLeft = Math.ceil((new Date(o.closes_at).getTime() - now.getTime()) / 86400000);
        const amount = o.amount_max ? ` ($${Number(o.amount_max).toLocaleString()})` : "";
        const fit = o.fit_score ? ` | Fit: ${o.fit_score}%` : "";
        const status = o.application_status || "not_applied";
        lines.push(`  ${o.name} — ${daysLeft}d${amount}${fit} — ${status}`);
      }
    } else {
      lines.push("  No grants closing this month");
    }
    lines.push("");

    // ── ACTIVE APPLICATIONS ──
    lines.push("ACTIVE APPLICATIONS:");
    if (applications && applications.length > 0) {
      let totalPipelineValue = 0;

      for (const app of applications as any[]) {
        const amount = app.amount_requested ? ` ($${Number(app.amount_requested).toLocaleString()})` : "";
        totalPipelineValue += app.amount_requested || 0;

        // Find next incomplete milestone
        let nextMilestone: string | null = null;
        let milestoneDue: string | null = null;
        for (const m of app.milestones || []) {
          if (!m.completed && m.due) {
            if (!milestoneDue || m.due < milestoneDue) {
              nextMilestone = m.name || "Milestone";
              milestoneDue = m.due;
            }
          }
        }

        // Completion %
        const totalMilestones = (app.milestones || []).length;
        const completedMilestones = (app.milestones || []).filter((m: any) => m.completed).length;
        const pct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

        let line = `  ${app.application_name} — ${app.status}${amount}`;
        if (totalMilestones > 0) line += ` | ${pct}% complete`;
        if (nextMilestone && milestoneDue) {
          const daysUntil = Math.ceil((new Date(milestoneDue).getTime() - now.getTime()) / 86400000);
          line += ` | Next: ${nextMilestone} (${daysUntil}d)`;
        }
        lines.push(line);
      }

      lines.push("");
      lines.push(`  Pipeline value: $${totalPipelineValue.toLocaleString()}`);
    } else {
      lines.push("  No active applications");
    }
    lines.push("");

    // ── NEWLY DISCOVERED (last 24h) ──
    const yesterday = daysAgo(1);
    const newOpps = (opportunities || [])
      .filter((o: any) => o.created_at && o.created_at >= yesterday)
      .sort((a: any, b: any) => (b.fit_score || 0) - (a.fit_score || 0));

    lines.push("DISCOVERED (last 24h):");
    if (newOpps.length > 0) {
      for (const o of newOpps.slice(0, 10) as any[]) {
        const amount = o.amount_max ? ` ($${Number(o.amount_max).toLocaleString()})` : "";
        const fit = o.fit_score ? ` Fit: ${o.fit_score}%` : "";
        const closes = o.closes_at ? ` | Closes: ${o.closes_at}` : "";
        lines.push(`  + ${o.name} (${o.provider || "unknown"})${amount}${fit}${closes}`);
      }
    } else {
      lines.push("  No new opportunities in last 24h");
    }
    lines.push("");

    // ── WRITING TASKS ──
    const draftApps = (applications || []).filter((a: any) => a.status === "draft" || a.status === "in_progress");
    if (draftApps.length > 0) {
      lines.push("WRITING TASKS:");
      for (const app of draftApps as any[]) {
        const incompleteMilestones = (app.milestones || []).filter((m: any) => !m.completed && m.name?.toLowerCase().includes("writ"));
        if (incompleteMilestones.length > 0) {
          for (const m of incompleteMilestones) {
            lines.push(`  [ ] ${app.application_name}: ${m.name}${m.due ? ` (due ${m.due})` : ""}`);
          }
        } else {
          lines.push(`  [ ] ${app.application_name} — ${app.status}`);
        }
      }
      lines.push("");
    }

    // ── AWARDED PENDING PAYMENT ──
    const awarded = (applications || []).filter((a: any) => a.status === "successful");
    if (awarded.length > 0) {
      const awardedValue = awarded.reduce((s: number, a: any) => s + (a.amount_requested || 0), 0);
      lines.push("AWARDED (pending payment):");
      for (const a of awarded as any[]) {
        const amount = a.amount_requested ? ` $${Number(a.amount_requested).toLocaleString()}` : "";
        lines.push(`  ${a.application_name}${amount}`);
      }
      lines.push(`  Total awarded: $${awardedValue.toLocaleString()}`);
      lines.push("");
    }

    // Summary
    lines.push("─".repeat(50));
    const totalApps = (applications || []).length;
    const totalOpps = (opportunities || []).length;
    lines.push(`${totalApps} active applications | ${totalOpps} opportunities tracked | ${closingThisWeek.length} closing this week`);

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
    const supabase = getSupabase();
    const lookback = params.days_back ?? 90;
    const since = daysAgo(lookback).split("T")[0];
    const lines: string[] = ["RECONCILIATION STATUS", "─".repeat(40)];

    // Total counts
    const { count: totalCount } = await supabase
      .from("xero_transactions")
      .select("*", { count: "exact", head: true })
      .gte("date", since);

    const { count: taggedCount } = await supabase
      .from("xero_transactions")
      .select("*", { count: "exact", head: true })
      .gte("date", since)
      .not("project_code", "is", null);

    const { count: reconciledCount } = await supabase
      .from("xero_transactions")
      .select("*", { count: "exact", head: true })
      .gte("date", since)
      .eq("is_reconciled", true);

    const { count: withReceiptCount } = await supabase
      .from("xero_transactions")
      .select("*", { count: "exact", head: true })
      .gte("date", since)
      .not("dext_document_id", "is", null);

    const total = totalCount || 0;
    const tagged = taggedCount || 0;
    const reconciled = reconciledCount || 0;
    const withReceipt = withReceiptCount || 0;

    lines.push(`Period: last ${lookback} days (since ${since})`);
    lines.push("");
    lines.push(`Total transactions: ${total}`);
    lines.push(`Tagged:       ${tagged}/${total} (${total > 0 ? Math.round((tagged / total) * 100) : 0}%)`);
    lines.push(`Reconciled:   ${reconciled}/${total} (${total > 0 ? Math.round((reconciled / total) * 100) : 0}%)`);
    lines.push(`Has receipt:  ${withReceipt}/${total} (${total > 0 ? Math.round((withReceipt / total) * 100) : 0}%)`);

    // Top untagged vendors
    const { data: untagged } = await supabase
      .from("xero_transactions")
      .select("contact_name, total, type")
      .gte("date", since)
      .is("project_code", null)
      .not("type", "in", '("SPEND-TRANSFER","RECEIVE-TRANSFER")');

    if (untagged && untagged.length > 0) {
      const vendorTotals = new Map<string, { count: number; total: number }>();
      for (const tx of untagged) {
        const name = tx.contact_name || "(No contact)";
        const existing = vendorTotals.get(name) || { count: 0, total: 0 };
        existing.count++;
        existing.total += Math.abs(Number(tx.total) || 0);
        vendorTotals.set(name, existing);
      }

      const sorted = [...vendorTotals.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10);

      lines.push("");
      lines.push(`TOP UNTAGGED VENDORS (${untagged.length} transactions, excl. transfers):`);
      for (const [name, info] of sorted) {
        lines.push(`  ${name}: ${info.count} txns, $${Math.round(info.total).toLocaleString()}`);
      }
    }

    // Stuck items (>14 days untagged)
    const stuckSince = daysAgo(14).split("T")[0];
    const { data: stuck } = await supabase
      .from("xero_transactions")
      .select("contact_name, total, date")
      .is("project_code", null)
      .lt("date", stuckSince)
      .gte("date", since)
      .not("type", "in", '("SPEND-TRANSFER","RECEIVE-TRANSFER")')
      .order("total", { ascending: true })
      .limit(10);

    if (stuck && stuck.length > 0) {
      lines.push("");
      lines.push(`STUCK ITEMS (untagged >14 days, top ${stuck.length}):`);
      for (const s of stuck as any[]) {
        lines.push(`  ${s.date} | ${s.contact_name || "?"} | $${Math.abs(Number(s.total)).toLocaleString()}`);
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
    const supabase = getSupabase();
    const maxItems = params.limit ?? 20;
    const lines: string[] = ["UNTAGGED TRANSACTIONS SUMMARY", "─".repeat(40)];

    // Fetch untagged, excluding transfers
    const { data: untagged } = await supabase
      .from("xero_transactions")
      .select("contact_name, total, type, date, bank_account")
      .is("project_code", null)
      .not("type", "in", '("SPEND-TRANSFER","RECEIVE-TRANSFER")')
      .order("date", { ascending: false });

    if (!untagged || untagged.length === 0) {
      lines.push("No untagged transactions (excluding transfers). All caught up!");
      return lines.join("\n");
    }

    // Group by vendor
    const vendorMap = new Map<string, { count: number; total: number; dates: string[]; types: Set<string> }>();
    for (const tx of untagged) {
      const name = tx.contact_name || "(No contact)";
      const existing = vendorMap.get(name) || { count: 0, total: 0, dates: [], types: new Set() };
      existing.count++;
      existing.total += Math.abs(Number(tx.total) || 0);
      if (tx.date) existing.dates.push(tx.date);
      if (tx.type) existing.types.add(tx.type);
      vendorMap.set(name, existing);
    }

    // Load vendor rules for suggestions
    const { data: rules } = await supabase
      .from("vendor_project_rules")
      .select("vendor_name, aliases, project_code");

    function suggestCode(contactName: string): string | null {
      if (!rules) return null;
      const lower = contactName.toLowerCase();
      for (const rule of rules) {
        if (lower.includes(rule.vendor_name.toLowerCase())) return rule.project_code;
        for (const alias of rule.aliases || []) {
          if (lower.includes(alias.toLowerCase())) return rule.project_code;
        }
      }
      return null;
    }

    const sorted = [...vendorMap.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, maxItems);

    const totalUntaggedValue = [...vendorMap.values()].reduce((s, v) => s + v.total, 0);

    lines.push(`${untagged.length} untagged transactions across ${vendorMap.size} vendors`);
    lines.push(`Total untagged value: $${Math.round(totalUntaggedValue).toLocaleString()}`);
    lines.push("");
    lines.push(`TOP ${sorted.length} BY VALUE:`);

    for (const [name, info] of sorted) {
      const suggestion = suggestCode(name);
      const suggestionStr = suggestion ? ` → suggested: ${suggestion}` : "";
      const dateRange = info.dates.length > 0
        ? ` (${info.dates[info.dates.length - 1].substring(0, 10)}..${info.dates[0].substring(0, 10)})`
        : "";
      lines.push(
        `  ${name}: ${info.count} txns, $${Math.round(info.total).toLocaleString()}${dateRange}${suggestionStr}`
      );
    }

    if (vendorMap.size > maxItems) {
      lines.push(`  ... and ${vendorMap.size - maxItems} more vendors`);
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
    const supabase = getSupabase();
    const includeUrls = params.include_urls ?? true;
    const today = todayStr();
    const sevenDaysAgo = daysAgo(7);
    const fourteenDaysAgo = daysAgo(14);
    const baseUrl = "https://act-command-center.vercel.app";

    type ActionItem = {
      type: string;
      priority: "critical" | "high" | "medium";
      title: string;
      description: string;
      url?: string;
      estimatedMinutes: number;
    };

    const actions: ActionItem[] = [];

    // 1. Untagged transactions (>7 days, excl transfers)
    const { data: untagged, count: untaggedCount } = await supabase
      .from("xero_transactions")
      .select("contact_name, total, date", { count: "exact" })
      .is("project_code", null)
      .not("type", "in", '("SPEND-TRANSFER","RECEIVE-TRANSFER")')
      .lt("date", sevenDaysAgo)
      .order("total", { ascending: true })
      .limit(5);

    if ((untaggedCount || 0) > 0) {
      const topVendors = (untagged || [])
        .map((t: any) => `${t.contact_name || "?"} ($${Math.abs(Number(t.total)).toLocaleString()})`)
        .join(", ");
      actions.push({
        type: "untagged_transactions",
        priority: (untaggedCount || 0) > 50 ? "critical" : "high",
        title: `${untaggedCount} untagged transactions (>7 days old)`,
        description: `Top: ${topVendors}`,
        url: includeUrls ? `${baseUrl}/finance/tagger` : undefined,
        estimatedMinutes: Math.ceil((untaggedCount || 0) / 10),
      });
    }

    // 2. Missing receipts (SPEND, no attachments, >7 days)
    const { count: missingReceiptCount } = await supabase
      .from("xero_transactions")
      .select("*", { count: "exact", head: true })
      .in("type", ["SPEND", "ACCPAY"])
      .or("has_attachments.is.null,has_attachments.eq.false")
      .lt("date", sevenDaysAgo);

    if ((missingReceiptCount || 0) > 0) {
      actions.push({
        type: "missing_receipts",
        priority: (missingReceiptCount || 0) > 100 ? "critical" : "high",
        title: `${missingReceiptCount} spend transactions missing receipts`,
        description: "ATO requires receipt retention for 5 years. Forward to Dext or mark as no-receipt-needed.",
        url: includeUrls ? `${baseUrl}/finance/receipt-pipeline` : undefined,
        estimatedMinutes: Math.ceil((missingReceiptCount || 0) / 5),
      });
    }

    // 3. Overdue invoices (ACCREC past due_date, still AUTHORISED/SENT)
    const { data: overdueInvoices, count: overdueCount } = await supabase
      .from("xero_invoices")
      .select("invoice_number, contact_name, amount_due, due_date", { count: "exact" })
      .eq("type", "ACCREC")
      .in("status", ["AUTHORISED", "SENT"])
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(5);

    if ((overdueCount || 0) > 0) {
      const totalOverdue = (overdueInvoices || []).reduce(
        (s: number, i: any) => s + Math.abs(Number(i.amount_due) || 0), 0
      );
      const invoiceList = (overdueInvoices || [])
        .map((i: any) => `${i.contact_name} #${i.invoice_number} ($${Math.abs(Number(i.amount_due)).toLocaleString()})`)
        .join(", ");
      actions.push({
        type: "overdue_invoices",
        priority: "critical",
        title: `${overdueCount} overdue invoices ($${Math.round(totalOverdue).toLocaleString()})`,
        description: invoiceList,
        url: includeUrls ? `${baseUrl}/finance/revenue` : undefined,
        estimatedMinutes: (overdueCount || 0) * 5,
      });
    }

    // 4. Grant deadlines passed
    const { data: passedGrants, count: grantCount } = await supabase
      .from("grant_applications")
      .select("funder_name, deadline, status", { count: "exact" })
      .lt("deadline", today)
      .not("status", "in", '("submitted","awarded","rejected","expired","lost")')
      .order("deadline", { ascending: true })
      .limit(5);

    if ((grantCount || 0) > 0) {
      const grantList = (passedGrants || [])
        .map((g: any) => `${g.funder_name} (deadline ${g.deadline}, status: ${g.status})`)
        .join(", ");
      actions.push({
        type: "grant_deadlines",
        priority: "high",
        title: `${grantCount} grant deadlines passed without submission`,
        description: grantList,
        url: includeUrls ? `${baseUrl}/grants` : undefined,
        estimatedMinutes: (grantCount || 0) * 10,
      });
    }

    // 5. Stuck pipeline items (>14 days in same stage, not reconciled)
    const { count: stuckCount } = await supabase
      .from("receipt_pipeline_status")
      .select("*", { count: "exact", head: true })
      .not("stage", "eq", "reconciled")
      .lt("transaction_date", fourteenDaysAgo);

    if ((stuckCount || 0) > 0) {
      actions.push({
        type: "stuck_pipeline",
        priority: "medium",
        title: `${stuckCount} receipt pipeline items stuck >14 days`,
        description: "Items not progressing through receipt → Dext → Xero → reconciled pipeline.",
        url: includeUrls ? `${baseUrl}/finance/receipt-pipeline` : undefined,
        estimatedMinutes: (stuckCount || 0) * 3,
      });
    }

    // Build output
    if (actions.length === 0) {
      return "OVERDUE ACTIONS\n" + "─".repeat(40) + "\n\nAll clear — no overdue finance items. Well done!";
    }

    // Sort by priority
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 };
    actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const totalMinutes = actions.reduce((s, a) => s + a.estimatedMinutes, 0);
    const lines: string[] = [
      "OVERDUE FINANCE ACTIONS",
      "─".repeat(40),
      `${actions.length} items | ~${totalMinutes} min estimated`,
      "",
    ];

    let currentPriority = "";
    for (const action of actions) {
      if (action.priority !== currentPriority) {
        currentPriority = action.priority;
        lines.push(`── ${currentPriority.toUpperCase()} ──`);
      }
      lines.push(`  ${action.title}`);
      lines.push(`    ${action.description}`);
      if (action.url) lines.push(`    → ${action.url}`);
      lines.push(`    (~${action.estimatedMinutes} min)`);
      lines.push("");
    }

    return lines.join("\n");
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default worker;
