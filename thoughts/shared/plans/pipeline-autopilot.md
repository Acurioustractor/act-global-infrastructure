# Pipeline Autopilot — Business Control System

## Vision (Ben, 23 Mar 2026)

The pipeline page is the seed of something incredible. Turn it into the **business control centre** that lets ACT operate on autopilot — knowing where every dollar goes, when to spend, when to hold, when to ramp up.

## Three Layers

### Layer 1: Signal vs Noise (Clean the View)

**Problem:** 352 items but most noise. Need to focus on the big earners.

**Priority projects** (the engines):
- Goods on Country (ACT-GD) — remote community laundry demand
- The Harvest (ACT-HV) — Witta farm + events
- The Farm (ACT-FM) — Black Cockatoo Valley regenerative ag
- Empathy Ledger (ACT-EL) — storytelling platform
- JusticeHub (ACT-JH) — justice data
- PICC (ACT-PI) — Palm Island Community Company

**De-prioritise:** Projects that are archived, dormant, or small-scale. Don't delete — dim them. Maybe a "Focus" toggle that shows only priority projects.

**Implementation:**
- Add project tier/priority filtering — show Tier 1 projects prominently
- Dim or collapse Tier 2/3 projects
- Sort by a combination of value + activity + recency, not just value

### Layer 2: 100% Coverage Dashboard

**Problem:** Can't control what you can't see. Need:

1. **100% transaction tagging** — every Xero transaction tagged to a project
   - Dashboard showing: X% tagged, Y untagged, Z auto-taggable
   - One-click review queue for untagged items
   - Already have Rapid Tagger and Bulk Tagger — surface coverage % on pipeline page

2. **100% outcome tracking** — every opportunity has a clear outcome
   - Won/Lost/Expired with $ and date
   - No opportunities stuck in "researching" for 6 months without movement
   - Stale opportunity alerts: "This has been in Pursuing for 90 days — still active?"

3. **R&D tracking per project** — spread R&D evidence across all qualifying projects
   - Which projects have R&D-eligible spend?
   - What % of each project's spend qualifies?
   - Total R&D claim forecast = sum across all projects
   - Link to git commits, calendar events, meeting notes as evidence

### Layer 3: Agentic Financial Autopilot

**The dream:** The system learns patterns and proactively manages cash flow.

**What the agent knows:**
- What money is coming in (pipeline × probability × timing)
- What money is going out (recurring costs, project burn rates)
- What capacity exists (staff availability, contractor pipeline)
- What R&D qualifies (43.5% back from ATO)

**What the agent does:**
- **Spend signals:** "ACT-GD has $500K confirmed. You can hire 2 more staff for remote deployment."
- **Founder draw:** "Cash runway is 8 months. Safe to draw $X this month."
- **Staff alignment:** "Goods deployment in Maningrida scheduled for April. Confirm logistics team availability."
- **Grant timing:** "Snow Foundation round opens May 1. Start EOI prep now — 3 weeks lead time."
- **Ramp signals:** "3 consecutive quarters of revenue growth on Goods. Consider expanding to 5 more communities."
- **Risk alerts:** "80% of pipeline is one funder (NIAA). Diversification needed."

**How it learns:**
- Track actual vs predicted close rates
- Track which funders convert and at what rate
- Track seasonal patterns (govt funding rounds, foundation deadlines)
- Feed GrantScope match quality back into pipeline probability

## Build Order

Phase 1: Focus toggle + project tier filtering (quick win, immediate value)
Phase 2: Coverage dashboard (tagging %, stale alerts, outcome tracking)
Phase 3: R&D section per project
Phase 4: Agent intelligence (spend signals, founder draw, ramp recommendations)

## What Already Exists

| Capability | Status | Location |
|-----------|--------|----------|
| Transaction tagging | Built | Rapid Tagger, Bulk Tagger pages |
| Tag coverage % | Built | `get_untagged_summary` tool |
| R&D tracking | Built | `/finance/rd-tracking` page |
| Grant matching | Just built | GrantScope + pipeline integration |
| Project P&L | Built | `/finance/projects` page |
| Cashflow forecast | Built | `get_cashflow_forecast` tool |
| Revenue scoreboard | Built | `get_revenue_scoreboard` tool |
| Pipeline kanban | Built | `/finance/pipeline-kanban` page |
| Receipt intelligence | Built | `/finance/receipt-intelligence` page |

A lot of the pieces exist. The pipeline page needs to become the **hub** that connects them all.
