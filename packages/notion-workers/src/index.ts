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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default worker;
