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
 *  16. get_project_pnl           — Monthly P&L for specific project with trends
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default worker;
