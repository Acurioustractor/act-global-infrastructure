# Plan: Goods Agent Architecture — Agents We Should Build

> Slug: `goods-agent-architecture`
> Created: 2026-04-23
> Status: draft
> Owner: Benjamin Knight (CEO, Goods)
> Scope: Goods-first, ACT-wide reusable
> Companion to: `goods-ceo-6-month-plan.md` (Layer 5 expansion)

## Objective

The 6-month plan names seven narrow agents. This document expands the catalogue across the five domains that actually eat the week — **communications, procurement, reporting, grants, and operations** — plus the orchestration layer that ties them together. The goal is not to build twenty agents. The goal is to know which agents exist, what each one is for, which one to build first, and when to stop building.

An agent earns its place by turning an hour of CEO work per week into a five-minute review. Nothing less.

## Principles

1. **One bounded task per agent.** If the description has the word "and" in the middle, split it.
2. **Opus 4.7 contract always.** Every agent call includes task budget, stop criteria, fallback, scoped file list. No fuzzy prompts.
3. **File-based handoffs.** Agents write outputs to files, return ≤2-line summaries. Context stays clean across the chain.
4. **Cost tiers.** Haiku for sweeps and classification. Sonnet for drafting and reasoning. Opus reserved for CEO brief and architecture decisions. Every agent has a cost ceiling per run.
5. **Draft, not publish, by default.** Agents draft into the CEO inbox or Notion staging. Humans approve the send. Exception: reconciliation agents that write to dashboards not humans.
6. **Verbal OCAP + witness rule for any community-facing output.** Never auto-publish words attributed to community members. Consent chain must be explicit.
7. **Kill the agent if humans are not reviewing it.** An agent with no human loop is an unread email. Instrument read-rate; retire agents below threshold.
8. **Every agent is a script that a human could run.** The agent is just the scheduling + context-assembly + narrow reasoning wrapper. If you can't express it as `node scripts/foo.mjs`, you can't operationalise it.

## The catalogue

Agents are grouped by domain. Each row lists trigger, task, output, cost tier, whether the output is auto-sent or draft-for-review, and the scripts or data sources it composes.

### Domain 1. Communications

| Agent | Trigger | Task | Output | Tier | Send mode |
|---|---|---|---|---|---|
| **Funder Cadence** (A2 in plan) | Daily 06:00 | For any active funder silent >18 days: draft a 120-word progress note matching that funder's engagement style using last deployment + latest story. | Draft email in CEO Friday-writing queue. | Sonnet | Draft-for-review |
| **Community Storyteller Liaison** | Daily 07:00 | Sweep EL v2 for new storyteller content; match against consent state; flag what's publishable, what's blocked, what's waiting on elder approval. | Notion storyteller queue panel + red-flag list. | Sonnet | Draft |
| **Inbox Triage** | Every 2 hours during work day | Read Goods inbox (benjamin@act.place + hi@act.place filtered by Goods tag); classify urgency, draft 1-line replies for the quick wins, surface the 3 things that need Ben's hand. | Notion daily-triage page. | Haiku | Draft |
| **Meeting Prep** | 24h + 2h before any Google Calendar event tagged `goods` or `funder` or `community` | Pull participant context from GHL, Notion, EL, last touch. Draft 1-page brief: who, history, their open asks, what to aim for. | PDF or Notion page delivered to calendar event + Telegram 2h before. | Sonnet | Informational |
| **Meeting Note Synthesiser** | Triggered by Zoom/Meet transcript upload | Extract action items, decisions, quotes worth storytelling, any community-voice content requiring OCAP. Add actions to Notion with assignee + due date; flag consent items. | Notion meeting page + actions created. | Sonnet | Draft (Ben approves actions before creation) |
| **Monthly CEO Letter Drafter** | 28th of each month | Given the month's room + body + noun from the plan's letter calendar, draft 400-word letter in Curtis voice using month's storyteller moments + deployment data. | Draft in `wiki/letters/goods/YYYY-MM.md` for Narrative Gatekeeper screening. | Opus | Draft |
| **Crisis Response Drafter** | On manual trigger (Ben flags event) | Given an event (community issue, media query, funder concern), draft holding statement + 3-option response path; pull relevant context from wiki + EL. | Draft in `thoughts/shared/drafts/crisis/`. | Opus | Draft |
| **Partnership Warm-Intro Finder** | On manual trigger (Ben names a target) | Search across GHL contacts, EL storytellers, Advisory Board, Oonchiumpa/PICC network; return top 3 mutual connections ranked by recency + strength. | Table in Notion or Telegram. | Haiku | Informational |
| **Narrative Gatekeeper** (A6 in plan) | On every public artefact | Screen against `writing-voice.md`: Curtis four-move check, forbidden AI-tells, name + place verification, em-dash + curly-quote sweep. | Pass/fail + specific rewrites inline. | Sonnet | Gate |

### Domain 2. Procurement and buyers

| Agent | Trigger | Task | Output | Tier | Send mode |
|---|---|---|---|---|---|
| **Procurement Analyst** (A1 in plan) | Weekly Mon 08:00 after the AusTender sweep cron | Given new contract alerts + new demand signals + current anchor state, rank this week's top 3 buyer touches; draft opening line for each. | Cockpit panel + Telegram. | Sonnet | Draft |
| **Contract Watch** | Daily 07:00 | AusTender sweep: any new federal contract won by watched entities (Centrecorp, ALPA, Outback Stores, Miwatj, Anyinginyi, Julalikari, Tangentyere, QIC, Palm Island Housing); any new grant posting touching remote housing, manufacturing, Indigenous enterprise. | Daily alert email + cockpit panel. | Haiku | Informational |
| **Buyer Pipeline Rescoring** | Weekly Wed 08:00 | Rerun `buyerPlausibilityScore` across the 6,000-entity pool with latest signals: new contacts added, new contracts won, new stories landed. Flag any buyer who crossed the `ready-now` threshold this week. | Cockpit panel + GHL push log. | Haiku | Informational |
| **RFP Response Drafter** | On-demand when Ben pastes an RFP into a queue | Given an RFP (housing, remote infrastructure, Indigenous procurement, social enterprise panel), draft: eligibility check, response outline, required evidence, competitor scan from 672K AusTender rows. | Draft response pack + gap list in `thoughts/shared/drafts/rfps/`. | Sonnet | Draft |
| **Evidence Pack Builder** | On-demand per anchor buyer | Given an anchor (Centrecorp, PICC, Oonchiumpa, Miwatj, Anyinginyi), assemble: delivered units, cost-per-unit, lifespan evidence from asset register, community storyteller reference, freight corridor, incumbent pricing, MoU scan, procurement pathway, named contact, last touch. | `anchors/<name>/evidence-pack.pdf`. | Sonnet | Draft |
| **Freight Economics Refresh** | Monthly or on fuel/shipping base-price change | Rerun `goods-supply-chain-analyst.mjs` for every active community-buyer pair; flag any pair where delivered cost now exceeds incumbent price + tolerance. | Cockpit panel. | Haiku | Informational |
| **Community Need Detector** | Weekly, after the `goods-procurement-matcher` cron | Identify communities with documented demand but zero deployed assets, zero active buyer relationship, and zero pipeline opportunity. Rank by population × remoteness × SEIFA multiplier. | Cockpit panel: "top 5 cold communities". | Haiku | Informational |

### Domain 3. Reporting and financial truth

| Agent | Trigger | Task | Output | Tier | Send mode |
|---|---|---|---|---|---|
| **Capital Stack Weekly Brief** (A5 in plan) | Sunday 20:00 | Model 4-week capital flow from Xero actuals + GHL pipeline + funder engagement state; flag waterfall slippage; draft CEO Monday-morning read-me. | Cockpit brief + Telegram at 06:00 Mon. | Opus | Informational |
| **Invoice Drift Detector** | Weekly Mon 08:30 | Cross-reference wiki financial claims against live Xero state per project. If a wiki dollar figure diverges >5% from Xero, flag for CEO + propose wiki edit with provenance. Prevents the 36K-ghost pattern. | PR against wiki repo with corrections + CEO Telegram. | Sonnet | Draft (wiki PR) |
| **13-Week Cashflow** | Daily 05:00 | Update 13-week cashflow forecast from Xero + GHL weighted pipeline + known upcoming obligations. | Cockpit panel. | Haiku | Informational |
| **R&D Evidence Log** | Weekly Fri 17:00 | Scan Xero ACT-GD tagged transactions + IoT telemetry samples + script commits + meeting notes for R&D-eligible activity. Append to rolling R&D contemporaneous record. | `thoughts/shared/rd-log/FY27.md` append + provenance row. | Sonnet | Draft |
| **BAS Prep** (existing skill: bas-cycle) | Monthly, then harder 10 days before lodgement | Reconciliation + receipt matching + gap hunt + Xero audit; generate BAS completeness score. | BAS assembly pack + receipt chase list. | Sonnet | Draft |
| **Monthly Board Report** | 3rd business day of each month | Pull: deployments last month, revenue (Xero), pipeline movement (GHL), funder state (GrantScope), community stories landed (EL), R&D milestones, risk register deltas. | 6-page PDF + exec summary. | Sonnet | Draft |
| **Funder Impact Report** | Per-funder cadence (Snow quarterly, QBE per-milestone, etc) | Given a funder and their agreed reporting window, assemble impact narrative with Curtis voice, storyteller quotes (OCAP-checked), dollar-sourced metrics, photos. | Funder-branded impact report draft. | Opus | Draft |
| **Annual Impact Report** | Annually, starts 8 weeks before FY close | Year-wide narrative: deployments, communities, storytellers, plastic diverted, R&D findings, capital raised, facility commissioned, people employed. | `wiki/reports/annual/FY27/` draft package. | Opus | Draft |
| **Provenance Sidecar Writer** | On any new report artefact | Generate `<report>.provenance.md` listing tables queried, verification tier per claim, unverified assumptions, how to reproduce. | Sidecar file. | Haiku | Automatic |

### Domain 4. Grants and capital

| Agent | Trigger | Task | Output | Tier | Send mode |
|---|---|---|---|---|---|
| **Grant Discovery (Semantic)** | Weekly Tue 08:00 | Generate Goods-specific embedding; run pgvector search against all 18K `grant_opportunities` and 10K `foundations`; rank by semantic proximity + capital-fit score. Filter out ones already in pipeline. | Top 10 new fits to CEO inbox. | Sonnet | Draft |
| **Grant Eligibility Screener** | On any grant surfaced by Discovery | Read grant full text; check eligibility (entity type, geography, size, Indigenous requirement, DGR status); pass/fail with 3-line reasoning. | Pass/fail tag on pipeline row. | Haiku | Automatic |
| **Grant Deadline Watcher** | Daily 06:00 | Any open-application grant with deadline <30 days; any deadline <7 days escalates to Telegram. | Cockpit panel + escalations. | Haiku | Informational |
| **Grant First-Draft Assembler** | On Ben's "go" per opportunity | Assemble first-draft application using thesis from decision profile + data room docs + storyteller quotes (OCAP-checked) + live deployment numbers. | Draft application in `thoughts/shared/drafts/grants/<funder>/`. | Opus | Draft |
| **Data Room Builder** (A7 in plan) | Per funder ask | Assemble data room folder: MoUs, financials (w/ provenance sidecars), R&D evidence, IoT samples, storyteller consent records, product specs. List missing docs. | Notion or Dropbox tree + gap list. | Sonnet | Draft |
| **Funder Engagement State** | Daily 06:00 | Update per-funder: last touch, last response, open asks, next-touch-due. Colour Kanban: green <14d, amber 14–21d, red >21d. | Cockpit Kanban. | Haiku | Informational |
| **Philanthropic Landscape Scanner** | Monthly | Quarterly-reporting foundations + annual reports + AIS 500 filings: who's increased giving, who's added new programs, who's retired old ones. Update foundation database `fit_score` inputs. | Foundation database updates. | Sonnet | Draft |
| **Capital Structure Advisor** | On-demand (when blended-stack decisions arise) | Given a capital need (e.g., "$400K bridge before QBE"), propose blended structure from available sources (grant / catalytic / sub-debt / senior debt), model dilution/covenants/reporting burden. | Decision memo in `thoughts/shared/drafts/capital/`. | Opus | Draft |

### Domain 5. Operations and field truth

| Agent | Trigger | Task | Output | Tier | Send mode |
|---|---|---|---|---|---|
| **Field Insight** (A3 in plan) | Daily 07:00 | Asset register alerts + IoT telemetry anomalies + active tickets + storyteller activity; summarise field state, flag community-health slippage. | Cockpit panel + Telegram escalation on critical. | Sonnet | Informational |
| **Story Cascade** (A4 in plan) | Weekly Thu 08:00 | Consent-sweep: identify stories eligible to publish, draft publish queue, flag consent gaps. | Cockpit storyteller queue. | Sonnet | Draft |
| **Consent Chain Verifier** | On any publication attempt | Given a community-facing draft, verify: every named person has current consent, every elder-approval dependency is satisfied, every sensitive cultural element is cleared. Hard-block on gap. | Pass/fail with gap list. | Sonnet | Gate |
| **Asset Register Reconciler** | Daily 05:00 | Compare physical asset CSV (after the CSV-to-Supabase-Storage fix) against `goods_asset_lifecycle` table. Flag any drift: new deployment missing, overdue check-in, ticket not matched to unit. | Cockpit field panel. | Haiku | Informational |
| **IoT Anomaly Hunter** | Hourly | On the 10 IoT-instrumented washing machines: detect cycle-count drops, power anomalies, offline periods >24h. Distinguish community-led off-cycles (cultural events) from failures. | Alert to Nic or field partner. | Haiku | Informational |
| **Handover Progress Tracker** | Weekly | For each facility + community relationship, score the handover arc: who owns what, what's still ACT-held, what's been transferred. Track progress against designed-for-obsolescence milestones. | Cockpit panel. | Sonnet | Informational |
| **Governance Rhythm Keeper** | Daily | Track standing meetings, reporting cadences, consent renewals, MoU expiries. 30-day + 7-day + 1-day lookahead alerts. | Cockpit calendar panel. | Haiku | Informational |
| **Wiki Truth Keeper** | Weekly | Audit every dollar figure, deployment count, and named-person claim in `wiki/projects/goods.md` against live systems. Propose PR with corrections + new provenance sidecars. | PR against wiki. | Sonnet | Draft |

### Domain 6. Orchestration and meta

| Agent | Trigger | Task | Output | Tier | Send mode |
|---|---|---|---|---|---|
| **Monday Cockpit Assembler** | Monday 05:00 | Orchestrate all weekly-scheduled agents (Procurement Analyst, Capital Stack Brief, Field Insight, Funder Cadence, Grant Discovery). Compose into one 3-page CEO brief. | `cockpit/monday-YYYY-MM-DD.md` + Telegram. | Opus | Informational |
| **Agent Cost + Read-Rate Monitor** | Weekly | Per-agent: runs, total token spend, human read-rate (did the CEO open the output), resulting action (did any draft get sent or task created). Flag agents with <20% read-rate for retirement. | Agent ops dashboard. | Haiku | Informational |
| **Cross-Repo Drift Detector** | Weekly Sun 22:00 | Sweep all ACT repos + Notion + GHL + Xero for key-fact drift (slugs, project codes, deployment counts, contact state). Flag inconsistencies across systems-of-record. | Drift report in `thoughts/shared/drift/`. | Sonnet | Draft |
| **Retrospective Weekly** | Friday 17:00 | What shipped this week: commits, deployments, funder touches, stories landed. What didn't: unclosed overdues, silent funders, blocked community conversations. Name the one lesson of the week. | `thoughts/shared/retros/YYYY-W##.md`. | Sonnet | Draft |

## Sequencing — what to build in what order

Not all at once. The 6-month plan names seven agents (A1–A7). Here is the month-by-month agent build sequence, subordinated to the plan.

### May 2026 — Foundation

Build first, because they compose everything else:
- **A1 Procurement Analyst** — the weekly procurement cadence won't work without it
- **A2 Funder Cadence** — the 21-day silence rule won't work without it
- **Narrative Gatekeeper (A6)** — the CEO letter publishing cadence won't work without it
- **Capital Stack Weekly Brief (A5)** — Monday mornings don't compose without it
- **Invoice Drift Detector** — lesson from the 36K-ghost: this prevents the next one

### June 2026 — Field + storyteller layers

- **A3 Field Insight** — post the asset-register-CSV-to-Supabase fix, this unlocks
- **A4 Story Cascade** — post the EL consent-chain agent work
- **Grant Deadline Watcher** — pure Haiku, high-value, low-cost
- **Grant Discovery (Semantic)** — pairs with the Goods-specific embedding build

### July 2026 — Evidence and capital-document layer

- **A7 Data Room Builder** — 31 July data-room deadline forces this
- **Evidence Pack Builder** — anchor-buyer conversations need this
- **Meeting Prep + Meeting Note Synthesiser** — pair for every funder and community meeting in Q1 FY27
- **Provenance Sidecar Writer** — mandatory on any report agent that ships

### August 2026 — Operating system

- **Monday Cockpit Assembler** — orchestration of all prior agents into one CEO surface
- **Inbox Triage** — CEO writing block becomes unblockable at this scale otherwise
- **Consent Chain Verifier** — every public publication goes through it
- **Buyer Pipeline Rescoring** — weekly hygiene on 6,000 entities

### September 2026 — Reporting scale

- **Monthly Board Report** — Advisory Board rhythm needs this
- **Funder Impact Report** — Snow, QBE, any R1 funder needs structured reporting
- **R&D Evidence Log** — FY27 R&D claim starts its contemporaneous-record window
- **Cross-Repo Drift Detector** — breadth check on all ACT systems

### October 2026 — Maturity

- **Annual Impact Report** — warm-up for FY27 annual (lands FY28-H1)
- **Agent Cost + Read-Rate Monitor** — retire the agents that nobody reads
- **Retrospective Weekly** — habit formalisation

After October, the next six months become optimisation, not new-build. That restraint matters.

## Orchestration pattern

Agents compose via **file-based handoffs**, not direct invocation. Never agent-A-calls-agent-B runtime chaining — too brittle, too expensive, too hard to debug. Instead:

```
Agent A runs → writes output to well-known path → Agent B's trigger watches that path → Agent B runs.
```

Example: Asset Register Reconciler writes `thoughts/shared/field/YYYY-MM-DD-reconcile.md` → Field Insight watches that path → runs when new reconcile lands → writes cockpit panel.

Benefits:
- Each agent is testable in isolation
- Failed agent does not cascade-fail dependents
- Humans can read the intermediate files
- Context stays clean — no agent carries another agent's full output

The Monday Cockpit Assembler is the only agent that orchestrates. Everything else is peer.

## Infrastructure conventions

- **Scheduled via cron** in `scripts/cron/` — each agent is `agent-<name>.mjs` that wraps an LLM call + file I/O
- **Notion + Telegram + cockpit** as the three output channels
- **`project_knowledge` append** on every run — agents self-document decisions as `pattern` or `action_item` rows so next session inherits context
- **Cost log** per run to `logs/agents/<agent>/<YYYY-MM-DD>.json` with token counts, cost, tool calls
- **Timeout ceiling** per run: Haiku 2 min, Sonnet 5 min, Opus 10 min
- **Dead-agent rule:** <20% read-rate over 4 weeks, retire the agent and move that budget to a new one
- **No agent touches production Notion or GHL without a human-approved PR equivalent** (unless specifically whitelisted for automatic inserts, e.g., log entries)

## What NOT to build

Seven patterns to reject when the list gets long:

1. **"Strategy agent."** Strategy is a CEO conversation with partners + Advisory Board. An LLM cannot replace it. The plan file already exists.
2. **"Chat interface agent."** Telegram + email + cockpit are already the interface surface. Adding a chat UI is fiddle-work that doesn't increase leverage.
3. **"Automated social posts."** Narrative sovereignty rules forbid this. Every public word goes through Narrative Gatekeeper + elder approval.
4. **"Content-farm drafter."** No AI slop masquerading as ACT voice. Drafts are always drafts; humans ship.
5. **"Single-agent does everything."** The point is narrow bounded tasks. Any agent description with four verbs is wrong.
6. **"Real-time community-voice drafter."** Community voice has an OCAP chain. No agent fabricates storyteller words.
7. **"Agent-on-agent-on-agent."** Two-level orchestration max (Monday Cockpit calls peers). Three levels = debugging hell.

## Reusability across ACT

Most of these agents serve Goods today but the patterns apply to every ACT project. A later cut of this document should pull them to `thoughts/shared/plans/act-ecosystem-agent-architecture.md` with Goods as Exhibit A and JusticeHub, Empathy Ledger, Black Cockatoo Valley, The Harvest as sibling deployments of the same agent layer. The agent architecture is ACT-wide infrastructure, not a Goods-only thing.

Candidate per-project agent instances (post-October 2026):
- JusticeHub Funder Cadence, Storyteller Liaison, Impact Report
- Empathy Ledger Consent Chain Verifier (central, shared with all projects)
- Black Cockatoo Valley Biodiversity Monitor + Residency Coordinator
- The Harvest Community Gathering Planner + Seasonal Letter Drafter

The shared substrate (Narrative Gatekeeper, Meeting Prep, Grant Discovery, Data Room Builder, Provenance Sidecar Writer) should be implemented once, parameterised by project code.

## Task Ledger

- [ ] Stand up agent infrastructure: `scripts/cron/` convention + cost log + `project_knowledge` append hooks
- [ ] A1 Procurement Analyst (May Week 1)
- [ ] A2 Funder Cadence (May Week 1)
- [ ] A6 Narrative Gatekeeper (May Week 1)
- [ ] A5 Capital Stack Weekly Brief (May Week 1)
- [ ] Invoice Drift Detector (May Week 2)
- [ ] A3 Field Insight + A4 Story Cascade (June, post-CSV-to-Storage fix)
- [ ] Grant Discovery (Semantic) + Deadline Watcher (June)
- [ ] A7 Data Room Builder + Evidence Pack Builder (July)
- [ ] Meeting Prep + Meeting Note Synthesiser (July)
- [ ] Provenance Sidecar Writer (July)
- [ ] Monday Cockpit Assembler (August)
- [ ] Inbox Triage + Consent Chain Verifier (August)
- [ ] Buyer Pipeline Rescoring (August)
- [ ] Monthly Board Report + Funder Impact Report (September)
- [ ] R&D Evidence Log + Cross-Repo Drift Detector (September)
- [ ] Annual Impact Report + Agent Cost Monitor + Weekly Retro (October)
- [ ] Retire any agent with <20% read-rate at 4-week mark (ongoing)
- [ ] Post-October: migrate shared agents to ACT-ecosystem-wide infrastructure

## Decision Log

| Date | Decision | Rationale | Reversible? |
|---|---|---|---|
| 2026-04-23 | File-based handoffs, not runtime chaining | Debuggable, testable, resilient to single-agent failure | Yes |
| 2026-04-23 | Monday Cockpit is only orchestrator — all others peer | Max 2 levels of orchestration; keeps the system readable | Yes |
| 2026-04-23 | Every public-facing agent output passes Narrative Gatekeeper | Curtis voice + no AI tells is load-bearing brand | No — architectural |
| 2026-04-23 | Cost tier Haiku / Sonnet / Opus assigned per agent | Cheaper agents for sweeps, expensive for reasoning; prevents token bloat | Yes |
| 2026-04-23 | <20% read-rate retires an agent after 4 weeks | Forces honest evaluation; stops dead agents from eating budget | Yes |
| 2026-04-23 | Shared substrate agents built once, parameterised by project code | Avoid building 7× the same thing for 7 ACT projects | No — architectural |
| 2026-04-23 | Seven rejected patterns named upfront | Prevents scope creep; the "do not build" list is as important as the build list | No |

## Changelog

### 2026-04-23 — Architecture drafted

**Objective:** Expand Layer 5 of the 6-month plan into a full agent catalogue across communications, procurement, reporting, grants, operations, and orchestration.

**Changed:** Wrote this file. Sequenced 30+ agent candidates by month. Named the 7 agents NOT to build.

**Verified:** Agent contract + cost tiers align with `~/.claude/rules/opus-4-7-prompting.md` and `context-efficiency.md`. Existing scripts (`goods-auto-tagger`, `check-contract-alerts`, `hydrate-goods-*`, `weekly-reconciliation`) identified as reusable substrate — agents wrap them, don't replace them.

**Failed/Learned:** None.

**Blockers:** Infrastructure standup (cron convention, cost log, `project_knowledge` append) is the prerequisite before any agent work. That's the real May Week 1 deliverable before A1/A2 exist.

**Next:** CEO approval of sequencing. On approval: infrastructure build + A1/A2/A5/A6 stand-up in May Week 1.

## Provenance

- **Data sources queried:** `goods-ceo-6-month-plan.md` (Layer 5), `~/.claude/rules/opus-4-7-prompting.md`, `~/.claude/rules/context-efficiency.md`, `~/.claude/rules/memory-system.md`, `CLAUDE.md` (agent delegation section), existing `scripts/` inventory (goods-auto-tagger, weekly-reconciliation, tag-statement-lines, etc), `grantscope/scripts/` inventory (check-contract-alerts, hydrate-goods-*, goods-workspace/ghl-push).
- **Unverified assumptions:** Read-rate threshold 20% is a judgment call, not measured. Cost ceilings per run are conservative guesses; will be calibrated after first month. Monday Cockpit's exact composition will change as panels come online.
- **Generated by:** Claude Opus 4.7, 2026-04-23. Framing + sequencing review by CEO (Ben Knight).
