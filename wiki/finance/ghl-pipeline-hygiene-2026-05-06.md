---
title: GHL Pipeline Hygiene Review — 2026-05-06
status: Findings + actions
date: 2026-05-06
audience: Ben, Nic
purpose: Audit of the 11 GHL pipelines holding 315 opportunities. Identifies what's stale, what's mis-shaped, and what's missing — so GHL stays the operational source of truth and Notion stays the strategic view.
tags:
  - ghl
  - hygiene
  - operations
  - finance
parent: act-money-framework
---

# GHL Pipeline Hygiene Review — 2026-05-06

> **Two-line summary.** GHL holds **$31M open across 297 opportunities**, but 4 of the 11 pipelines (Empathy Ledger, Festivals, Mukurtu, ACT Events) have **zero monetary value across 63 opportunities** — they're being used as relationship trackers, not deal pipelines. Separately, the GHL→Supabase sync is **not capturing GHL-side timestamps** (`ghl_created_at`, `ghl_updated_at` are NULL for all 315 rows) so true staleness isn't measurable until the sync is fixed.

---

## How Notion + GHL split (the operating model)

| Surface | Purpose | Who uses it |
|---|---|---|
| **Notion: ACT Money Framework page** | One-screen exec view — bank, pile mix, top opportunities, what's burning | Ben + Nic, weekly glance |
| **Notion: ACT Opportunities database** | Filterable database (by Pile / Stage / Source) for management/strategy | Ben + Nic, when triaging |
| **Notion: Per-pile pages** (next step) | Voice / Flow / Ground / Grants — strategic context per pile | Ben + Nic, planning |
| **GoHighLevel** | Operational deal-by-deal work — calls, emails, tasks, stage advancement | Day-to-day execution |
| **CivicGraph** | Foundation + organisation research | Pre-application due diligence |
| **GrantScope** | Grant discovery + research | Identifying new grant opportunities |

**Flow:** GHL is where opportunities are created and worked. Supabase mirrors GHL nightly (+ webhook). Notion is the strategic view derived from Supabase. Don't update opportunities in Notion — update them in GHL and they'll flow through.

---

## Pipeline-by-pipeline state

### Healthy pipelines (keep as is, just polish)

| Pipeline | Open | $ open | Stages | Hygiene gap |
|---|---:|---:|---|---|
| **Goods — Demand Register** | 110 | $16,006,450 | Signal | 10 missing project_code (10%) |
| **Grants** | 86 | $13,724,500 | Identified (79) → In Progress (4) → Submitted (3) | **37 missing project_code (43%)** + 17 zero-value |
| **A Curious Tractor** | 20 | $1,009,899 | Germination → Growth → Composting → Graduation → Harvest | 6 zero-value (30%) |
| **Goods — Buyer Pipeline** | 18 | $340,450 | Outreach Queued (13) → Proposed (1) → Invoiced (4) | **13 zero-value (72%)** |

### Pipelines that are NOT deal pipelines (rethink)

These show $0 across all opportunities — they're being used to track relationships, contacts, or event invitations rather than commercial pipeline:

| Pipeline | Open | Note | Recommendation |
|---|---:|---|---|
| **Empathy Ledger** | 21 ($0, all stage = Identified) | 21 individuals/orgs identified for storytelling work, no $ attached | Either: (a) move to GHL Contacts/CRM list (not pipeline), OR (b) attach realistic $ if these are commercial prospects, OR (c) keep as pipeline but add stage progression |
| **Festivals** | 14 ($0) | Festival-related contacts: 9 New Lead + 4 Contacted + 1 Closed | Same — move to a tagged contact list unless commercial |
| **ACT Events** | 23 ($0) | Event invitations (e.g. Lucy Stronach, Toby Gowland — names) | **Should not be a pipeline.** Move to a Notion event tracker or GHL events module |
| **Mukurtu Node Activation** | 5 ($0, Scoping) | Mukurtu project deployments | Either archive (if no longer active) or attach value if commercial intent |

**Combined cleanup:** 63 zero-value opportunities across 4 pipelines. This is the single biggest GHL hygiene issue.

### Tiny pipelines (verify they should exist)

Not seen in this audit (only 7 pipelines surface in current data). Likely candidates worth checking in GHL UI: any "Partnerships," "Procurement," "IPP," or per-project pipelines that may have been created and forgotten.

---

## Sync gap (action: fix before next sync run)

**`ghl_created_at` is NULL for all 315 rows. `ghl_updated_at` is NULL for all 315 rows.**

Impact: cannot detect:
- Stale deals (no movement in 60d)
- Newly created opportunities since last sync
- Stage-progression velocity

Fix needed in `scripts/sync-ghl-to-supabase.mjs` — capture GHL's `createdAt` and `updatedAt` fields from the `/opportunities/{id}` response and write them to `ghl_opportunities.ghl_created_at` / `ghl_updated_at`. This is a 5-line patch.

Until fixed, "stale" can only be inferred from absence of stage change between syncs (we'd need to track stage_history) or from operator memory.

---

## Hygiene action list (ranked by impact)

| Action | Volume | Effort | Pile impact |
|---|---:|---|---|
| 1. **Fix GHL sync to capture ghl_updated_at** | 1 patch | 30 min | Unlocks staleness detection across all piles |
| 2. **Tag the 37 uncoded grants** with project_code | 37 opps | 30 min triage | Grants pile coverage from 57% → 100% |
| 3. **Decide Empathy Ledger pipeline future** | 21 opps | Strategic decision | Voice pile clarity |
| 4. **Decide Festivals pipeline future** | 14 opps | Strategic decision | Hygiene |
| 5. **Move ACT Events out of pipelines** | 23 opps | 15 min | Removes false-pipeline noise |
| 6. **Add monetary values to Goods — Buyer Pipeline** | 13 opps × $X | 1-2 hrs estimation | Flow pipeline accuracy |
| 7. **Decide Mukurtu Node Activation status** | 5 opps | Strategic decision | Hygiene |

---

## What this means for the ACT business view

ACT runs four lanes: **Voice / Flow / Ground / Grants**. Mapping GHL pipelines to those lanes:

```
Voice  ←  Empathy Ledger pipeline (21, $0)         ← needs commercial estimation
       ←  PICC contracts (sit in Xero, not GHL)    ← single-customer concentration

Flow   ←  Goods — Demand Register (110, $16M)      ← biggest commercial unlock (IPP-JV)
       ←  Goods — Buyer Pipeline (18, $340K)       ← buyer demand, weak estimation
       ←  CivicGraph commercial pipeline           ← DOES NOT EXIST in GHL today
       ←  JusticeHub deals (sit in Grants pipeline currently)

Ground ←  Harvest grants (sit in Grants pipeline)  ← no Ground-specific pipeline
       ←  Farm activity                            ← not in GHL

Grants ←  Grants pipeline (86, $13.7M)             ← cross-pile, by funding mechanism

Other  ←  ACT Events (23, $0)                      ← shouldn't be a pipeline
       ←  Mukurtu Node Activation (5, $0)          ← unclear
       ←  Festivals (14, $0)                       ← unclear
```

**Two structural gaps:**
1. **No CivicGraph commercial pipeline.** This matches the FY26 Voice/Flow gap analysis finding ($0 CivicGraph revenue). If FY27 Flow target is real, CivicGraph needs its own pipeline to track conversion.
2. **No Ground / Harvest commercial pipeline.** Harvest opportunities currently mix into Grants. If Ground becomes a commercial layer (eco-tourism, residencies), it needs its own pipeline.

---

## Recommended GHL pipeline reshape

### Add (when there's commercial activity to track)

- **CivicGraph Commercial** (when first paying customer enters scope) — stages: Discovery → Demo → Trial → Paid → Renewal
- **Ground Experiences** (when Farm/Harvest/residencies have commercial bookings) — stages: Inquiry → Booked → In-progress → Completed
- **Procurement / IPP** (when JV with Oonchiumpa is operational) — stages: Tender Discovery → Tender Submitted → Won/Lost

### Resolve

- **Empathy Ledger** — convert to commercial pipeline OR demote to Contacts list
- **ACT Events** — convert to a Notion event tracker (kept out of GHL pipelines)
- **Festivals** — same: move to Contacts list or define commercial intent
- **Mukurtu Node Activation** — archive unless reactivating

### Keep healthy

- Goods — Demand Register
- Goods — Buyer Pipeline
- Grants
- A Curious Tractor (the catch-all for Caring/Mounty Yarns/CC Retreat — could split if it gets crowded)

---

## What's most worth doing this week

If only one thing: **#1 (fix the sync to capture ghl_updated_at)**. Until that's fixed, the staleness signal is invisible and the rest of this hygiene work has no objective measurement.

If two: **#1 + #2 (tag the 37 uncoded grants)**. Grants is your biggest pipeline by $; 43% of it is mis-tagged.

If three: add **#5 (move ACT Events out)** as a 15-minute cleanup that reduces noise immediately.

---

## Cross-references

- [act-money-framework.md](act-money-framework.md) — the canonical money framework
- [fy26-voice-flow-gap-analysis.md](fy26-voice-flow-gap-analysis.md) — the strategic backdrop (Voice concentration risk, CivicGraph absence)
- [2026-05-pile-opportunity-workspace.md](../decisions/2026-05-pile-opportunity-workspace.md) — workspace architecture decision
- ACT Opportunities Notion DB: `notion.so/91db68258cc345d1a0abc3a50e42c0a1`
- GHL sync script: `scripts/sync-ghl-to-supabase.mjs` (needs the timestamp fix)
