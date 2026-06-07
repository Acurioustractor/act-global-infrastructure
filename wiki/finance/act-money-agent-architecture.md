---
title: ACT Money Agents — Architecture + How to Use
status: Strategic plan + practical setup
date: 2026-05-06
audience: Ben + Nic
purpose: After Anthropic's finance agents release (May 2026), map their templates to ACT use cases. Recommend where each agent lives (Claude Cowork / Code / Telegram / cron). Stop the "too many surfaces" problem.
tags: [agents, claude-cowork, claude-code, telegram, architecture]
parent: act-money-framework
---

# ACT Money Agents — Architecture + How to Use

> **The honest problem.** We've built 25+ Notion pages, 25+ scripts, 17 cron jobs, 8 databases. Each is useful. Together they're overwhelming. The answer isn't more surfaces — it's a conversational layer (agent) that answers from any surface, plus a clear "go here for X" map.

---

## Part 1 — What Anthropic just shipped (May 2026)

[Anthropic Finance Agents](https://www.anthropic.com/news/finance-agents) released 10 templates for finance work, each packaging:
- **Skills** (instructions + domain knowledge)
- **Connectors** (governed access to data sources)
- **Subagents** (helper Claude models)

Available in 3 places:
- **Claude Cowork** — desktop/web, plugin model, exec users
- **Claude Code** — CLI, dev workflow (where I'm operating from)
- **Claude Managed Agents** — autonomous, scheduled, with audit trails

The 10 templates split:
- **Research & Client:** Pitch builder · Meeting preparer · Earnings reviewer · Model builder · Market researcher
- **Finance & Operations:** Valuation reviewer · GL reconciler · Month-end closer · Statement auditor · KYC screener

---

## Part 2 — Which of these matter for ACT (and which don't)

| Anthropic template | ACT relevance | Reason |
|---|---|---|
| **Pitch builder** | ✅ HIGH | Maps to "build a grant target list" — comparable foundations, deadline-aware |
| **Meeting preparer** | ✅ HIGH | Pre-Standard-Ledger / pre-funder briefs |
| **Market researcher** | ✅ HIGH | Foundation activity, sector developments, GrantScope sweeps |
| **GL reconciler** | ✅ HIGH | Xero reconciliation — INV-0314 type situations |
| **Month-end closer** | ✅ HIGH | Monthly BAS prep, Friday digest sibling |
| **Statement auditor** | 🟡 MEDIUM | Would help annual financial review with Standard Ledger |
| **Earnings reviewer** | ❌ LOW | We're not analysing public companies |
| **Model builder** | 🟡 MEDIUM | Could help annual budget but FP&A-heavy |
| **Valuation reviewer** | ❌ LOW | Not a buy-side firm |
| **KYC screener** | ❌ LOW | Compliance volume too low |

**Verdict:** 5 templates are directly relevant. ACT-specific custom agents add 3-4 more (e.g., "Pile movement analyst," "R&D claim assembler").

---

## Part 3 — The right ACT agent stack (8 agents, 4 surfaces)

### 4 surfaces, each with a clear role

| Surface | When to use | Audience |
|---|---|---|
| **Claude Cowork** | Conversational ops/strategy ("draft a brief on Centrecorp", "what changed last week?") | Ben + Nic, exec |
| **Telegram bot** | Phone-first quick lookups ("bank balance?", "any overdue?") | Ben + Nic, mobile |
| **Notion AI** | In-context queries on a specific database | Ben + Nic, while reading a page |
| **Claude Code (CLI)** | Building/fixing infrastructure, running custom scripts | Ben (technical) |
| **Cron + scripts** | Scheduled autonomous (Mon refresh, Friday digest, daily alerts) | All — runs unattended |

### 8 ACT agents to set up

#### Cowork agents (install as plugins / build as Skills)

**1. Money Operations agent** *(combines GL Reconciler + Month-end Closer)*
- Connectors: Xero, Supabase
- Skills: BAS prep, payment matching, monthly close checklist, INV reconciliation
- Sub-tasks: "reconcile open invoices", "flag stale GHL deals", "prep monthly P&L"

**2. Funder Research agent** *(combines Pitch builder + Meeting preparer + Market researcher)*
- Connectors: CivicGraph (foundations table), GrantScope (gs_entities), Notion (Foundations DB)
- Skills: foundation profiling, comparable funder identification, alignment scoring
- Sub-tasks: "brief me on Snow Foundation", "find 5 comparable funders to Centrecorp", "what foundations align with Voice/storytelling work"

**3. Grant Triage agent** *(custom — no direct template)*
- Connectors: GrantScope (32K grants), GHL (pipeline), Notion (Opportunities)
- Skills: ACT-fit scoring, deadline awareness, push to GHL pipeline
- Sub-tasks: "find this week's top 10 grants worth applying for", "what grants close in next 30 days?"

**4. Money Strategist agent** *(custom — synthesis)*
- Connectors: Notion (all DBs), Supabase (everything)
- Skills: scenario analysis, pile mix planning, cutover prep
- Sub-tasks: "compare base vs no-PICC scenario", "what's the biggest risk this month", "draft Standard Ledger meeting agenda"

#### Telegram agents (phone-first)

**5. Quick Lookup agent** *(already exists — extend with money tools)*
- Skills: bank balance, runway, top opps, today's actions
- Use: "/bank", "/runway", "/overdue", "/today"

**6. Daily Briefing agent** *(already partially exists via telegram-money-alerts.mjs)*
- Skills: morning summary of overnight changes
- Use: auto-pushes 9am AEST

#### Notion AI (in-context)

**7. Database Query agent** *(no setup — already in Notion)*
- Use: Cmd+J in any DB → ask in plain English
- See `notion-ai-prompts.md` for examples

#### Cron scripts (autonomous)

**8. Scheduled Operations agents** *(already built — 17 cron jobs)*
- Use: zero touch. Mon 6-9am refresh stack + Fri 3pm digest + daily 9am alerts

---

## Part 4 — The "always start here" map (resolves the "too many surfaces" problem)

Whenever you have a money question, follow this sequence:

```
┌─ Question type ─────────────┬─ Where to go FIRST ────────────────┐
│                             │                                     │
│ "What's my bank balance?"   │ Telegram bot ("/bank")              │
│ "What's overdue?"           │ Telegram bot ("/overdue")           │
│ "What landed yesterday?"    │ Telegram alert (auto-pushed 9am)    │
│                             │                                     │
│ "Show me the dashboard"     │ Notion: ACT Money Framework hub     │
│ "What changed this week?"   │ Notion: Friday Digest               │
│ "Plan next month"           │ Notion: Planning Rhythm             │
│                             │                                     │
│ "Brief me on [funder]"      │ Claude Cowork: Funder Research      │
│ "Compare scenarios"         │ Claude Cowork: Money Strategist     │
│ "Find new grants"           │ Claude Cowork: Grant Triage         │
│ "Run the monthly close"     │ Claude Cowork: Money Operations     │
│                             │                                     │
│ "Build a new script"        │ Claude Code (this CLI)              │
│ "Add a new Notion DB"       │ Claude Code (this CLI)              │
│                             │                                     │
│ "Filter Opportunities DB"   │ Notion AI (Cmd+J inside the DB)     │
│ "Group by pile"             │ Notion AI (Cmd+J)                   │
│                             │                                     │
└─────────────────────────────┴─────────────────────────────────────┘
```

If the question doesn't fit, default to **Notion ACT Money Framework hub** — it has nav cards to every other surface.

---

## Part 5 — Setup steps (Claude Cowork plugins)

### What ACT can do today (out-of-box)

The 5 most useful Anthropic templates can be installed in Claude Cowork:

1. Open Claude Cowork (desktop or claude.ai)
2. Settings → Plugins (or Skills) → Browse
3. Search for "Finance" or "Anthropic finance agents"
4. Install:
   - **Pitch builder** → use it for grant target lists
   - **Meeting preparer** → pre-funder/pre-Standard-Ledger briefs
   - **Market researcher** → foundation news synthesis
   - **GL reconciler** → Xero reconciliation
   - **Month-end closer** → BAS prep checklist

5. Connect them to ACT's data:
   - Xero connector — sign in with ACT Xero credentials
   - Supabase connector (if Anthropic provides one) — use shared instance

### What ACT can build (custom Skills)

To go deeper, build ACT-specific Cowork Skills:

1. **Funder Research Skill (ACT)** — instructions tuned to ACT's pile model + LCAA framing
2. **Grant Triage Skill (ACT)** — wired to GrantScope's 32K grants, scores by ACT relevance
3. **Money Strategist Skill (ACT)** — knows the cutover, R&D claim, trust structure

These get built as YAML/JSON skill packages following Anthropic's cookbook format. ~1-2 hrs each. I can scaffold them via this CLI.

### Where to host Skills

Two options:
- **Local Cowork plugin** — distributed manually, lives in `~/.claude/skills/`
- **Anthropic's marketplace** — published, others can install (overkill for ACT)

For ACT, local plugins under `~/.claude/skills/act/` is the right shape.

---

## Part 6 — The unified daily flow (this is the answer to "easy to use")

**Morning (you don't open anything — system pushes to you):**
```
9:00 AEST  Telegram alert lands on phone:
           "ACT Money Daily — 6 May
           🟠 Overdue >30d: $133,150 across 31 invoices
           Top 5: ..."
           Bank: $679K · Runway: 30.3 mo
```

**Mid-morning (~5 min review):**
- Open ACT Money Framework hub on Notion (1 click from bookmark)
- Glance the KPI row at top
- If anything's red, click into the relevant sub-page
- If you have a question, Cmd+J in the relevant DB

**During the day (as needed):**
- Phone: Telegram bot for "/overdue", "/bank", "/today"
- Desktop: Cowork agent for strategic questions ("brief me on Snow Foundation")

**End of week (Friday afternoon, ~15 min):**
- Friday Digest auto-generated 3pm AEST
- Open it in Notion — review wins/burns/actions
- Add any open questions to Money Sync (Q&A) page
- Drop new Action Items as needed

**Monthly (1 hour):**
- Open Planning Rhythm → THIS MONTH section
- Review KPIs, Budget vs Actual, Decisions Log
- Run Money Operations agent (Cowork) for monthly close

**Quarterly (2 hours):**
- Standard Ledger meeting prep — open Standard Ledger Q&A DB, filter to Open
- Use Funder Research agent (Cowork) to brief any new prospects
- Update the CY26 Plan if anything's shifted

**Annually (4 hours):**
- Open Planning Rhythm → THIS YEAR + 5-YEAR sections
- Review pile mix vs target, entity structure, CGT positioning
- Update strategy docs

---

## Part 7 — What I should build next (in order of leverage)

### Priority 1: Daily Briefing (replaces single Friday digest)
- Same as Friday digest but pushed daily 9am AEST
- Telegram message + Notion page update
- Difference vs current alerts: positive news included (wins, new opps), not just burns
- **Effort: 1 hr** (extend existing telegram-money-alerts.mjs)

### Priority 2: Telegram bot money commands
- `/bank` — current trading balance
- `/runway` — months at current burn
- `/overdue` — top 5 overdue invoices
- `/today` — top 3 actions for today
- `/wins` — recent paid invoices
- **Effort: 2-3 hrs** (extend existing Telegram bot in apps/command-center)

### Priority 3: Custom Cowork Skill — "ACT Money Brain"
- Single Skill that answers most ACT-money questions
- Has access to Supabase + Notion via MCP connectors
- Knows the pile model, cutover, R&D context
- **Effort: 2-3 hrs** to scaffold + tune

### Priority 4: Reduce Notion surface noise
- Audit which pages are actually being used
- Archive ones no one opens
- Consolidate similar views
- **Effort: 30 min** of curation, ongoing

### Priority 5: Anthropic template installation guide
- Step-by-step for Ben + Nic to install the 5 most relevant templates
- Connect them to ACT's Xero / Supabase / Notion
- **Effort: 30 min** to write the guide

---

## Part 8 — The single rule for "easy to use"

> **One question, one place.** When you have a question, there's exactly one right surface to ask it (per Part 4 map). When you want a daily/weekly summary, it comes to you (Telegram alerts + Friday digest). When you want to plan, you open Planning Rhythm. Don't make Ben/Nic choose between 25 surfaces — give them a routing map and stick to it.

---

## Cross-references

- [act-money-framework.md](act-money-framework.md) — canonical framework
- [notion-ai-prompts.md](notion-ai-prompts.md) — Notion AI usage card
- [notion-finance-surface-design.md](notion-finance-surface-design.md) — why Notion vs paid tools

## Sources

- [Anthropic Finance Agents launch (May 2026)](https://www.anthropic.com/news/finance-agents) — 10 templates announcement
- Internal: `wiki/finance/cy26-money-philosophy-and-plan.md` — why we built what we built
