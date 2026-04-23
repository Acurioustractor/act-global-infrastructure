# Plan: Goods CRM Upgrade — move people through procurement

> Slug: `goods-crm-upgrade`
> Created: 2026-04-23
> Status: draft
> Owner: Benjamin Knight (CEO, Goods)
> Companion to: `goods-ceo-6-month-plan.md`, `goods-agent-architecture.md`
> Trigger: QBE Catalysing Impact program demands operational CRM maturity by August outcome

## Objective

Turn the Goods pipeline from a $16M frozen demand register into a working procurement CRM. Make every active buyer, funder, and warm lead visible on one surface with a clear next action. Close the gap between what Xero knows (paid invoices, real deals) and what GHL shows (103 auto-generated community demand signals that have never moved).

By QBE outcome (August 2026), the pipeline must look like an operating system, not a dump.

## The current state — verified 2026-04-23 via live queries

| Signal | Finding |
|---|---|
| Total GHL contacts | 5,042 |
| Goods-tagged contacts | 714 |
| Total opportunities | 279 |
| Goods pipeline opportunities | **103** |
| Total Goods pipeline value | **$16,006,450** |
| Opportunities that have ever moved stage | **0** |
| Opportunities with `ghl_updated_at` populated | **0** |
| Goods pipeline stage count | **4** (New Lead / Contacted / Proposal Sent / Closed) |
| Non-demand-signal opps in the Goods pipeline | **3**, all $0 value |
| Real buyer opps (Centrecorp, PICC, Oonchiumpa, Miwatj, Julalikari, Our Community Shed) | **0 in GHL** — they exist only in Xero as paid invoices |

**The problem in one sentence:** the procurement pipeline is a CivicGraph data dump with no human touch, and the real deals that actually happened are invisible to the CRM because they only live in Xero.

## The upgrade in four parts

### Part A. Redesign the pipeline structure

Replace the current 4-stage generic pipeline with a 12-stage procurement-aware structure. Split into two tracks so demand signals (what communities need) don't clog the buyer pipeline (who's actually buying).

#### Track 1 — Buyer Pipeline (what we're selling to whom)

| Position | Stage | Win prob | What it means |
|---|---|---|---|
| 0 | Outreach Queued | 5% | Identified as a real target; owner assigned; first contact not made |
| 1 | First Contact | 15% | Email sent or call made; awaiting reply |
| 2 | In Conversation | 30% | Active dialogue; discovery happening |
| 3 | Qualified | 45% | Budget, authority, timeline confirmed; real buyer |
| 4 | Scoped | 55% | Internal proposal drafted; not yet sent |
| 5 | Proposed | 65% | Proposal sent; awaiting decision |
| 6 | Negotiating | 75% | Counter-proposal or terms in play |
| 7 | Committed | 90% | MoU or PO signed |
| 8 | In Delivery | 95% | Beds/goods shipping |
| 9 | Delivered | 98% | Receipt confirmed on community side |
| 10 | Invoiced | 99% | Xero invoice sent and live |
| 11 | Paid | 100% | Xero marked PAID |
| — | Lost | 0% | Explicit no, or stale >90 days without movement |

#### Track 2 — Demand Register (what communities need, pre-buyer)

Stays in a separate, lighter-weight structure. Signal, not opportunity.

| Stage | What it means |
|---|---|
| Signal | Community need identified from CivicGraph or direct ask; no buyer matched yet |
| Buyer Matched | One or more plausible buyers identified for this signal |
| Converted | Signal has been promoted into a Buyer Pipeline opportunity with named contact |
| Dormant | >180 days without progress; archived |

The 103 "COMMUNITY — Goods Demand $XK" opportunities currently in New Lead should migrate from the Buyer Pipeline to the Demand Register.

### Part B. Data backfill — make the CRM reflect reality

Three backfills, in order:

#### B1. Retroactive buyer opps from paid Xero invoices

For every Xero ACCREC invoice tagged ACT-GD with status PAID, create a corresponding GHL opportunity in the Buyer Pipeline at stage **Paid** with `xero_invoice_id` populated and `monetary_value` = invoice total. This makes historical wins visible in the CRM without rewriting history.

Known paid invoices to seed (from our forensics work):

| Invoice | Contact | Total | Stage | Notes |
|---|---|---|---|---|
| INV-0291 | Centrecorp Foundation | $85,712 | Paid | 107 beds Utopia Homelands (Nov 2025) |
| INV-0259 | Centrecorp Foundation | $37,620 | Paid | Tennant Creek v1 bed batch (Aug 2025) |
| INV-0260 | Our Community Shed | $13,500 | Paid | Tennant Creek auspicing (Aug 2025) |
| INV-0282 | Julalikari Council | $19,800 | Paid | Tennant Creek v1 bed batch (Oct 2025) |
| INV-0308 | Our Community Shed | $6,765 | Paid | Jan 2026 small order |

Plus the live-but-invisible:

| Invoice | Contact | Total | Stage | Notes |
|---|---|---|---|---|
| INV-0314 | Centrecorp Foundation | $84,700 | Proposed | **DRAFT in Xero, not sent. Opportunity should sit at Scoped or Proposed pending Nic confirmation.** |

This is where the CRM upgrade earns its keep. The `$84,700 Production Plant` is currently invisible to every system except Xero DRAFT. A proper buyer pipeline surfaces it as an action.

#### B2. Migrate 103 community demand signals to the Demand Register

Move every opp whose name matches `— Goods Demand $` from the Buyer Pipeline into a new Demand Register GHL pipeline. Preserve the monetary_value (community-level demand estimate) but re-stage as Signal. The $16M of identified demand stays visible in its own surface, not clogging the procurement pipeline.

#### B3. Seed anchor buyer opps with live context

For each of the five anchor buyers (Centrecorp, PICC, Oonchiumpa, Miwatj, Anyinginyi), create a Buyer Pipeline opportunity at the appropriate stage reflecting current relationship state:

| Anchor | Suggested stage | Reason |
|---|---|---|
| Centrecorp Foundation | Negotiating | Multiple past PAID orders + $84.7K draft + March board outcome pending |
| PICC (Palm Island) | Qualified | 141 beds deployed, Round 2 discussions, REAL Fund consortium |
| Oonchiumpa | Committed | Manufacturing partner; REAL Fund consortium lead — relationship is formal |
| Miwatj Health | First Contact | 8-clinic fleet exploration; 500-mattress request documented; needs outreach |
| Anyinginyi Health | Scoped | Washing machine fleet specs in negotiation; proposal next |

### Part C. UI upgrade — the pipeline kanban

Add `/goods/pipeline` route to command-center. Kanban board layout:

- **Column per stage** (12 columns for Buyer Pipeline, separate view for Demand Register)
- **Card per opportunity** showing: name, monetary value, days in current stage, days since last touch, assigned owner, anchor-buyer badge
- **Drag-drop to move stage** — fires GHL API update + logs the touch
- **Click card → drawer** with full context: linked contact, linked Xero invoice, last email/call, linked Empathy Ledger storyteller if any, latest note, upcoming action
- **Quick actions inside the drawer:** log touch, create task, mark next action, link Xero invoice, link storyteller
- **Top filter bar:** anchor buyers only / all / by owner / by age-in-stage / by dollar threshold
- **Stale badge** if opp hasn't moved in 21 days — directly surfaces to A1 Procurement Analyst weekly output

The existing `/goods` page stays as the contact segmentation surface (funder / partner / community / supporter / storyteller + duplicates management). The new `/goods/pipeline` becomes the operations surface.

### Part D. Agent integration

Three agents touch the pipeline:

1. **A1 Procurement Analyst** (exists, stub) — weekly Monday 8am ranks top 3 buyer opportunities needing movement this week. Queries must use `ghl_updated_at` (actual activity) not `updated_at` (supabase mirror clock).

2. **Pipeline Movement Detector** (new, small agent) — daily 6am detects opps stuck in same stage >21 days. Posts to cockpit as "these opps need movement." Escalates via Telegram if any Paid-stage-ready opp (has xero_invoice_id with status=PAID) hasn't been moved to Paid.

3. **Xero ↔ GHL Reconciler** (new, critical) — daily 5am scans Xero invoices against GHL opps. For every PAID ACCREC invoice tagged ACT-GD:
   - If no matching GHL opp, **create one** at stage Paid
   - If matching GHL opp exists but not at Paid, **move to Paid**
   - If Xero invoice VOIDED/DELETED, **move opp to Lost with note**
   - If Xero invoice DRAFT and matching GHL opp is at Committed or later, flag: "draft invoice for a committed deal — send or void"

The Reconciler agent is the single most valuable addition. It prevents the $84.7K-Production-Plant-DRAFT invisibility pattern from recurring.

## QBE-specific operating rhythm

The QBE Catalysing Impact program (shortlisted, outcome expected August 2026) requires demonstrable operational maturity. The pipeline upgrade gives us concrete evidence during program engagement:

| QBE milestone | What the pipeline shows | What we ask of QBE |
|---|---|---|
| Monthly program check-in | Stage velocity report: N opps moved stages this month, $X of deals closed, $Y new in pipeline | "Here's the discipline we've built" |
| Matched-grant conditional | Live pipeline with anchor buyers + scored demand register | "Here's where the match unlocks more signed orders" |
| Pre-outcome deep dive | Per-opp trajectory: when did this opp enter pipeline, how has it moved, what's next | "Here's how we run this, with or without the grant" |
| Post-outcome (PASS) | Triggered pipeline actions on Snow impact investment track | "Here's how we're deploying the next tranche" |
| Post-outcome (FAIL) | Routing pipeline to ACF + Paul Ramsay fallback tracks | "Here's the adjusted funding route — work continues" |

The pipeline becomes the evidence. Talking about impact is cheap; showing stage movement week-to-week is unfakeable.

## Sequencing

### This week (2026-04-23 → 04-30)

- [x] Create `llm_usage` table + migrate `llm-client.mjs` to log there
- [x] Validate narrative-gatekeeper logs correctly (Sonnet $0.016 per screen verified)
- [ ] Design sign-off on the 12-stage structure + 2-track approach (CEO + Nic, 15 min call)
- [ ] Redesign GHL "Goods" pipeline stages via API — swap 4 stages for 12 Buyer Pipeline stages
- [ ] Create separate GHL pipeline "Goods Demand Register" for migrated demand signals

### May 2026

- [ ] Data backfill B1: Retroactive opps for paid Xero invoices (script)
- [ ] Data backfill B2: Migrate 103 community demand signals to Demand Register
- [ ] Data backfill B3: Seed 5 anchor buyers at recommended stages
- [ ] Build Xero ↔ GHL Reconciler agent (daily cron)
- [ ] A1 Procurement Analyst first real Monday run (May 5)
- [ ] `/goods/pipeline` route scaffolding: read-only kanban first, using existing ghl_opportunities data

### June 2026

- [ ] `/goods/pipeline` interactive: drag-drop stage movement, GHL API writes
- [ ] Opportunity drawer: linked invoice + contact + storyteller context
- [ ] Pipeline Movement Detector agent (daily, flags stale opps)
- [ ] First-month velocity report → QBE program check-in

### July 2026

- [ ] Anchor-buyer evidence packs linked to their pipeline opps (one card → full pack)
- [ ] Funder pipeline track (separate from Goods) for capital stack — Snow, QBE, Minderoo, PRF, ACF stages
- [ ] Weekly CEO 15-minute pipeline review habit: Monday 8am cockpit → move 3 opps

### August 2026

- [ ] Three months of stage-movement evidence in time for QBE outcome call
- [ ] Alice Springs + Jinibara facility deals have stage-trace from first contact to committed in the CRM

## Task Ledger

- [x] llm_usage table created
- [x] scripts/lib/llm-client.mjs migrated from api_usage to llm_usage
- [x] narrative-gatekeeper logged cleanly (Sonnet $0.016 verified)
- [ ] 12-stage Buyer Pipeline design approved
- [ ] GHL API pipeline stage redesign executed
- [ ] Goods Demand Register pipeline created in GHL
- [ ] Retroactive-from-Xero seeding script written
- [ ] 103 demand-signal opps migrated to Demand Register
- [ ] 5 anchor buyers seeded at correct stages
- [ ] `/goods/pipeline` route scaffolded
- [ ] Xero ↔ GHL Reconciler agent built
- [ ] Pipeline Movement Detector agent built
- [ ] A1 Procurement Analyst query updated to use `ghl_updated_at`
- [ ] First Monday pipeline review habit run
- [ ] Three-month stage-movement report generated for QBE

## Decision Log

| Date | Decision | Rationale | Reversible? |
|---|---|---|---|
| 2026-04-23 | Separate Buyer Pipeline from Demand Register | Mixing CivicGraph auto-signals with named-buyer opps makes the pipeline useless as a work surface — 103 signals bury 5 real buyers | Yes — can merge back if the separation proves awkward |
| 2026-04-23 | 12-stage Buyer Pipeline (not 4) | Procurement is not "New Lead / Contacted / Proposed / Closed"; real buyer movement has intermediate states that matter to CEO rhythm | Yes — can collapse stages if too granular in practice |
| 2026-04-23 | Xero is the source of truth for paid state; GHL mirrors | Xero has accounting integrity; GHL is for sales activity | No — architectural |
| 2026-04-23 | Retroactive seed Xero PAID invoices as Paid-stage opps | Makes the CRM honest — the fact that real deals exist only in Xero is the core problem | Yes — can delete if history makes the UI noisy |
| 2026-04-23 | Reconciler agent runs daily, not weekly | Fresh Xero invoices shouldn't wait a week to appear in the pipeline — cash timing matters | Yes |
| 2026-04-23 | `/goods/pipeline` is a separate route, `/goods` stays for contact segmentation | Two operations surfaces, one for people + one for deals, both composed from same data | Yes |

## Verification Log

| Claim | Verified? | How | Date |
|---|---|---|---|
| 103 Goods opps exist | Verified | `SELECT COUNT(*) FROM ghl_opportunities WHERE pipeline_name ILIKE '%goods%'` = 103 | 2026-04-23 |
| All 103 are in stage "New Lead" | Verified | `GROUP BY stage_name` returns only "New Lead" | 2026-04-23 |
| Total value $16,006,450 | Verified | `SUM(monetary_value)` | 2026-04-23 |
| Only 3 non-demand-signal opps | Verified | `NOT ILIKE '%Goods Demand%'` returns 3 rows, all $0 | 2026-04-23 |
| Real buyers (Centrecorp, PICC, etc) absent from GHL | Verified — by absence in above query | 2026-04-23 |
| GHL pipeline has 4 stages | Verified | `SELECT stages FROM ghl_pipelines WHERE name ILIKE '%goods%'` | 2026-04-23 |
| Xero has paid Centrecorp/Julalikari/Our Community Shed invoices | Verified | `xero_invoices` query, see forensics doc | 2026-04-23 |
| INV-0314 $84,700 DRAFT, unsent | Verified | `status = 'DRAFT'`, `amount_due = 84700` | 2026-04-23 |
| llm_usage table exists + first row written | Verified | Table created via migration; Sonnet call recorded $0.016 | 2026-04-23 |

## Provenance

- Data source: ACT shared Supabase `tednluwflfhxyucgwigh`, tables `ghl_opportunities`, `ghl_contacts`, `ghl_pipelines`, `ghl_sync_log`, `xero_invoices`, `llm_usage`
- Date window: all-time for opps (no date filter), last 30/90/180 days for activity recency
- Migration applied: `create_llm_usage_table` (2026-04-23)
- Code updated: `scripts/lib/llm-client.mjs` line 134 — `api_usage` → `llm_usage`
- Unverified assumptions: suggested stage assignments for anchor buyers are inferred from wiki state; Ben + Nic's review required before seeding
- Generated by: Claude Opus 4.7, 2026-04-23, against live data via Supabase MCP

## Changelog

### 2026-04-23 — Plan created + first fixes shipped

**Objective:** Address the user's CRM concern + diagnose GHL data state + propose pipeline upgrade for QBE program discipline.

**Changed:**
- Created `llm_usage` table via migration
- Updated `scripts/lib/llm-client.mjs` to write to `llm_usage` instead of `api_usage`
- Verified end-to-end with narrative-gatekeeper run: $0.016 logged correctly
- Wrote this plan
- Documented verified pipeline state: 103 opps / $16M / 0 stage moves / 0 real buyer opps in GHL

**Verified:**
- GHL pipeline schema (4 stages, 103 opps all in "New Lead")
- Xero invoice history for anchor buyers (paid deals invisible to GHL)
- Contact + tag state (714 Goods-tagged contacts exist)
- llm_usage table write path end-to-end

**Failed/Learned:** The initial A1 dry-run reported "0 opps" because my query filtered by `updated_at >= 30d ago`. The opps DO exist — they just have never been touched. Fix: A1 should use `ghl_updated_at` for actual GHL activity, and widen default window to 180 days, while surfacing a separate panel for "opps that have never moved" which is where the real intervention is needed.

**Blockers:** None for the plan. Execution blockers: (a) Ben + Nic review of 12-stage design before GHL API changes; (b) backfill script is straightforward but touches live GHL data, needs dry-run + approval.

**Next:** CEO approval on stage design. On approval: GHL pipeline redesign + reconciler agent + retro-seed script, in that order.
