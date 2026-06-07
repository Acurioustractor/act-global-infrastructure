---
title: ACT Warm→Cold Funding Pipeline — Operating Picture
status: Draft
date: 2026-06-08
type: report
summary: Synthesis of the two 2026-06-08 relationship maps into one pipeline — five rungs from conversations-in-motion to ranked cold discovery, with the weekly rhythm and the hygiene gates that protect the community line.
sources: 2026-06-08-funding-relationships-current-state.md · 2026-06-08-pipelines-suppliers-dgr-doors.md (all figures inherit those reports' provenance sidecars — no new numbers introduced here)
---

# ACT Warm→Cold Funding Pipeline — Operating Picture

> **The rule: never start colder than you have to.** Every figure below is sourced in the two underlying reports. Work top-down — exhaust a rung before reaching past it.

---

## Rung 0 — IN MOTION (close, don't open)

Money already moving. These need finishing, not cultivating.

**Chase (issued, unpaid — $164K sitting out):**
- Rotary Eclub Outback **$82.5K** — dated Apr 2025, 14 months stale. Chase or escalate this week.
- Homeland School Company $44K (May 2026) · Regional Arts Australia $16.5K · BG Fit $15.4K · A J Keating $5.85K

**Live grant submissions (real, not the $272M discovery noise):**
- Indigenous Languages & Arts $300K — *in progress*, last moved Feb. Needs a push.
- QBE Catalysing Impact (Impact Enterprises) — submitted; the Social Impact Hub advisory thread (62 touches/yr) is the live channel
- First Nations Development Fund $50K + Qld Gives $30K — submitted

**Invoiced/proposed Goods deals:** WHSAC Groote **$1.7M** (outreach queued) · Snow beds $132K (invoiced) · Centrecorp plant $84.7K (proposed — INV-0314 send/void decision with Nic still open) · NLC Gapuwiyak $70.8K · PICC Stretch Bed $36.3K

**Conversations live in the spine (warmest rung, zero acquisition cost):** Snow First Nations Advisory ToR (45 touches/yr) · Dusseldorp Mounty Yarns proposal (40/yr) · DEWR REAL Innovation Fund $2M EOI (via Palm Island) · Sport QLD acquittal · Minderoo (Lucy Stronach — "maybe Goods") · Just Reinvest · Mannifera · Aurizon Community Giving

## Rung 1 — WARM RENEWALS (they already pay us)

11 grant-makers paid ACT in FY26 ($1.31M total ACCREC). The move is renew + expand, in this order:

1. **Snow** — $403K all-time, board-warm twice over (Georgina Byron AM, Sally Grimsley-Ballard, ring-50), ToR thread live. Multi-year ask + the QBE co-funding match candidate.
2. **PICC** — $365K FY26, largest payer. Renew the service contract; community-controlled framing protected.
3. **Centrecorp** — $123K + buyer-side plant deal. Expand both doors at once (Randle Walker contacted Apr).
4. **Regional Arts Australia** — renew fellowship + collect the $16.5K owed.
5. **VFFF · Dusseldorp · Social Impact Hub · Red Dust · Paul Ramsay · John Villiers · StreetSmart** — low-cost renewal touches; Dusseldorp and JV Trust (Fiona Maxwell, Apr) have live threads.
6. **Lapsed funders** — run recipe R6 (paid pre-FY26, nothing since): cheapest re-engagement list there is.

## Rung 2 — ADJACENT (one degree from warm)

- **Board bridges** (R1): foundations whose boards sit in Ben's rings — Dusseldorp↔Teya is the proven case; enumerate the rest.
- **Co-funders** (R2): Snow alone shares grantees with 8 other foundations. Run per warm funder.
- **Partner intros**: PICC, Oonchiumpa, BG Fit and the Goods buyer communities each carry their own funder networks — a partner intro is the warmest cold-open ACT has. (Community-line rule applies: the *partner org* can introduce; community people are never funnel targets.)
- **Funder-funnel contacts already in conversation** (66 in funder-drip, 12-month active): FRRR (Steph Pearson) · The Funding Network · QIC · Queensland Gives · Philanthropy Australia intro thread.
- **Suppliers as two-way ties**: Defy (~$219K, core Goods maker) · Oonchiumpa Consultancy ($14.9K, First Nations business — IPP story) · Joseph Kirmos · Maleny trade cluster. Testimonials, co-marketing, procurement-policy evidence — not just costs.

## Rung 3 — NEW DOORS (structurally unlocked, not yet relationships)

- **DGR via Butterfly** (endorsed DGR-1 + PBI since 2012, Indigenous-led board from 26 Jun): ~11 DGR-gated open grants (floor) · 318 Indigenous-targeted open grants · 551 DGR foundations, 131 Indigenous-focused. Named immediate candidates: McCusker, James N Kirby, Tim Fairfax Futureproofing, QCoal — plus John Villiers, already a Rung-1 funder, now approachable at DGR scale.
- **IPP/MMR procurement** (`scripts/goods-tender-scan.mjs`): awarded-contract data → re-tender/repeat-buyer targets (8 in last 90 days). Greenfield — ACT has zero federal footprint (verified, 0 of 806,713 rows), so this rung is a build, not a harvest. JV-with-Oonchiumpa is the eligibility lever.
- **Gov rails already warm**: GrantConnect feed (118 touches/yr), Sport QLD, DEWR — the relationships exist at acquittal level; widen them.

## Rung 4 — COLD, RANKED (tool-driven only — no freelancing)

- `node scripts/foundation-shortlist.mjs` — weekly top-10 (signals × recency × Field warmth × capacity × approachability). Current top-3: Paul Ramsay (already Rung 1!), Westpac Scholars, Social Impact Hub — the ranker confirms warm beats cold even at the cold end.
- The 36 `act_pipeline` discovered foundations (Myer, Cannon-Brookes, Goodman, Judith Neilson…) — research queue, strength 10.
- The 268-row GHL "Grants" pipeline and `v_act_procurement_buyers` re-sorted by fit (R5) — prospect pools, never quoted as pipeline value.

---

## Weekly rhythm (proposed)

1. **Mon** — run `foundation-shortlist.mjs`; scan `supporter_comms_summary` for new warm threads; check Rung-0 chase list.
2. **Pick one move per rung 0–2** (three moves/week). Rungs 3–4 only when 0–2 are exhausted that week.
3. **Monthly** — re-run goods-tender-scan + the adjacency recipes (R1/R2) against any new warm funder.

## Hygiene gates (before ANY outbound send)

- ✅ 771 stale grant emails quarantined (2026-06-07, verified `cancelled`)
- ⛔ **3 community-line violations open**: Kristy Bloomfield, Shaun Fisher, Rachel Atkinson sit inside funder/partner drips. **No drip sends until fixed** (gated Tier-2 GHL write, Ben's go).
- ⚠ Tag hygiene: `role:community` mis-applied to funder staff (FRRR, Paul Ramsay) — inflates community counts, masks real violations.
- ⚠ Grant-tranche ledger ($592K, Notion) is single-source — reconcile against Xero before quoting externally.
