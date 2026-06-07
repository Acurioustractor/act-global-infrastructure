---
title: "Funding Relationships — Pipelines, Suppliers, DGR Doors"
status: Draft
date: 2026-06-08
type: report
tags:
  - funding
  - relationships
  - ghl
  - suppliers
  - dgr
---

# Funding Relationships — Pipelines, Suppliers, DGR Doors

> Companion to `2026-06-08-funding-relationships-current-state.md` (foundation signals, Xero ACCREC income, AusTender, wiki partners, Field rings). This report adds three lanes that file does **not** cover: who is already moving inside the pipelines and email spine (Lane A), suppliers as relationship assets (Lane B), and the DGR-gated grant doors the Butterfly Movement now opens (Lane C).
>
> All figures are DB-sourced from shared Supabase `tednluwflfhxyucgwigh` on 2026-06-08 via the `exec_sql` RPC. Confidence labels per row. Email content is **subject-line and metadata only** — no body text quoted (privacy/OCAP). See the `.provenance.md` sidecar for every query.

---

## Lane A — Who's already in the pipelines (GHL + email spine)

### A1. GHL opportunity pipelines (the funnels that actually carry money)

`ghl_opportunities` (771 rows) across 15 pipelines. The **Grants** pipeline total ($272.3M) is dirty: 259 of 268 are in "Grant Opportunity Identified" — a discovery dump, not a live ask. The real active grant work is **4 In Progress + 3 Submitted**. The money pipelines that reflect genuine relationships are the buyer/funder ones below.

| Pipeline | Opps | Open | Σ value (raw) | Reading | Confidence |
|---|---|---|---|---|---|
| Grants | 268 | 232 | $272.3M | **Discovery dump** — 259 "Identified". Live = 4 in-progress + 3 submitted | Verified (counts); value Unverified (noise) |
| Goods — Demand Register | 158 | 158 | $16.4M | Demand signal, not committed money | Verified |
| Goods Supporter Journey | 44 | 44 | $5.3M | Supporter cultivation | Verified |
| Goods — Buyer Pipeline | 39 | 27 | $2.6M | **Real buyer deals** (see A2) | Verified |
| A Curious Tractor | 25 | 7 | $1.1M | Mostly won/historic delivery | Verified |

### A2. Live money opportunities (real stages, named)

Grants pipeline — active stages only:

| Opportunity | Stage | Status | Value | Last moved | Confidence |
|---|---|---|---|---|---|
| QBE Foundation – Catalysing Impact | Declined | lost | $400K | 2026-02-27 | Verified |
| Paul Ramsay Foundation – Just Futures | Declined | lost | $500K | 2026-02-27 | Verified |
| Indigenous Languages & Arts – Open Competitive 2026 | In Progress | open | $200K + $100K | 2026-02-02 | Verified |
| Catalysing Impact (QBE) – Impact Enterprises | Submitted | open | (no value) | — | Verified |
| Arts Business: First Nations Development Fund | Submitted | open | $50K | — | Verified |
| Qld Gives – Dec 25 | Submitted | open | $30K | 2025-12-16 | Verified |

Goods — Buyer Pipeline (open deals, the warmest commercial money):

| Buyer | Stage | Value | Confidence |
|---|---|---|---|
| WHSAC (Groote Archipelago) | Outreach Queued | $1.70M | Verified |
| The Snow Foundation — Immediate Bed Deployment | Invoiced | $132K | Verified |
| Centrecorp Foundation — Production Plant pt 1 | Proposed | $84.7K | Verified |
| Rotary eClub Outback (Div 9560) — Greate Bed v1 | Invoiced | $82.5K | Verified |
| Northern Land Council — Gapuwiyak | Outreach Queued | $70.8K | Verified |
| Palm Island Community Company (PICC) — Stretch Bed v2.3 | Invoiced | $36.3K | Verified |

### A3. Funder-funnel contacts (in a funder drip, contacted in last 12mo)

`ghl_contacts` tagged `comms:funder-drip` / `role:funder` / `goods-funder` with `last_contact_date` ≥ 2025-06. 66 carry `comms:funder-drip`; 91 carry `role:funder`. Warmest, named:

| Person | Org | Last contact | Lane | Confidence |
|---|---|---|---|---|
| Fiona Maxwell | JV Trust | 2026-04-29 | funder | Verified |
| Randle Walker | Centrecorp | 2026-04-13 | funder/buyer | Verified |
| Alexandra Lagelee Kean | Snow Foundation | 2026-04-13 | funder | Verified |
| Teya Dusseldorp | Dusseldorp Forum | 2026-04-01 | funder/partner | Verified |
| Steph Pearson | FRRR | 2026-03-31 | funder (⚠ see A5) | Verified |
| Adam Robinson | StreetSmart Australia | 2026-03-28 | funder/partner | Verified |
| Maddi Alderuccio | The Funding Network | 2026-03-06 | funder/partner | Verified |
| Seana Osbourne | Queensland Gives | 2026-02-16 | funder | Verified |
| Justin Welfare | QIC | 2026-02-15 | funder/partner | Verified |

### A4. Conversations already in motion (email spine, subjects only)

The 27k-comms spine is **not** stored as raw message rows in this DB (`gmail_messages` = 25 rows, `messages` = 1 — gap, see provenance). The mineable spine is the materialised view `supporter_comms_summary` (848 domains, with `last_touch_subject`, direction, 30/90/365-day counts — **subjects only, no bodies**). Active money/relationship threads, last 12mo, ranked by touch volume:

| Org (domain) | Last touch | 365d touches | Dir | Thread gist (subject) | Lane | Confidence |
|---|---|---|---|---|---|---|
| GrantConnect (grants.gov.au) | 2026-06-03 | 118 | in | "New Grant Opportunities / Forecast" | gov feed | Verified |
| Social Impact Hub (socialimpacthub.org) | 2026-06-02 | 62 | in | "Catalysing Impact – Advisory – A Curious Tractor" | funder/advisor | Verified |
| Snow Foundation (snowfoundation.org.au) | 2026-06-02 | 45 | out | "Draft Snow Foundation First Nations Advisory ToR" | funder | Verified |
| Dusseldorp Forum (dusseldorp.org.au) | 2026-06-03 | 40 | in | "Next stage for Mounty Yarns – dedicated support proposal" | funder | Verified |
| Minderoo (minderoo.org) | 2026-04-29 | 34 | in | "Following: ACT and Lucy // JusticeHub and Goods" | funder | Verified |
| Sport QLD (sport.qld.gov.au) | 2026-06-04 | 33 | in | "Final Report" | gov grant acquittal | Verified |
| Just Reinvest (justreinvest.org.au) | 2026-04-28 | 32 | out | "Next stage for Mounty Yarns – support proposal" | partner/funder | Verified |
| The Justice Project (justice.org.au) | 2026-03-24 | 24 | out | "JusticeHub x Justice Project – Partnership Proposal" | partner | Verified |
| The Funding Network (thefundingnetwork.com.au) | 2026-03-30 | 22 | in | "update from Healthy People, Healthy Planet event" | funder | Verified |
| JV Trust (jvtrust.org.au) | 2026-04-29 | 21 | out | "Checking in" | funder | Verified |
| Queensland Gives (queenslandgives.org.au) | 2026-06-03 | 20 | out | "Awards lunch" | funder | Verified |
| Centrecorp (centrecorp.com.au) | 2026-04-13 | 17 | in | "Tennant Creek Bed Funding" | funder/buyer | Verified |
| DEWR (dewr.gov.au) | 2026-03-27 | 12 | out | "REAL Innovation Fund EOI – Palm Island" | gov grant (via partner) | Verified |
| Philanthropy Australia (philanthropy.org.au) | 2026-05-05 | 7 | in | "Introducing A Curious Tractor and Philanthropy Australia" | sector body | Verified |
| Mannifera (grantinterface.com) | 2026-04-02 | 3 | in | "2026 Mannifera Signature Grant Round Outcome" | funder | Verified |
| Aurizon (corporate.aurizon.com.au) | 2026-03-15 | 1 | in | "Aurizon Community Giving Fund Applications now open" | corporate funder | Verified |

Corroboration: joining active domains against `foundations.website` confirms Dusseldorp, Snow, FRRR, Ian Potter, StreetSmart, Connellan Airways Trust, Brian M Davis Foundation as known foundations (fuzzy host match — `google.com`/`acnc.gov.au` over-match excluded). Marked Inferred where only the join (not a subject) establishes the relationship.

### A5. ⚠ COMMUNITY-LINE VIOLATIONS (do NOT treat as pipeline targets)

Community storytellers tagged into automated funder/partner drips. Per the community-line rule these are **flagged for remediation, not listed as pipeline**:

| Person | Community role | Offending funnel tags | Confidence |
|---|---|---|---|
| Kristy Bloomfield | Oonchiumpa lead, `role:storyteller`, `lane:community` | `role:funder`, `comms:funder-drip`(via partner), `comms:partner-drip`, `comms:act-newsletter` | Verified — VIOLATION |
| Shaun Fisher | `role:storyteller`, `lane:community` | `audience-funder`, `role:funder`, `role:partner`, `comms:newsletter` | Verified — VIOLATION |
| Rachel Atkinson | PICC, `role:storyteller`, `lane:community` | `role:funder`, `role:partner`, `comms:act-newsletter` | Verified — VIOLATION |

(Also surfaced: `oonchiumpa.com.au` "NIAA Funding Questions" thread in the spine — that is Oonchiumpa community-controlled funding work, **not** an ACT pipeline target.) Narelle Gleeson / Rachel Atkinson carry `role:community` + `comms:partner-drip` — partner-org contacts, lower-severity; FRRR/Paul Ramsay carry `role:community` mis-applied to funder staff (tag-hygiene noise, not a community-line breach). Remediation belongs in a gated Tier-2 GHL write, not this read-only report.

---

## Lane B — Suppliers as relationships (who we pay)

Two-account rule applied: only **NAB Visa ACT #8815** (2,690 txns) + **NJ Marchesi T/as ACT Everyday** (406 txns). Excluded: NM Personal (621) + ACT Maximiser (4). FY26 = Jul 2025 – Jun 2026. Source: `xero_transactions` (`type='SPEND'`, computed by `type` not sign) and paid bills `xero_invoices` (`type='ACCPAY'`, `status='PAID'`).

> Caveat: card/bank SPEND txns and paid ACCPAY bills **overlap** for connector-billed vendors (Defy, Qantas, Bunnings, Airbnb, Kennards) — the bill and its card settlement are separate rows. Treat the two tables as complementary views, not additive totals, for those vendors. Frequency + recency are the relationship signal here, not a clean grand total.

### B1. Top suppliers by SPEND (card/bank txns), FY26

| Supplier | Freq | Σ spend | First → last | Asset type | Confidence |
|---|---|---|---|---|---|
| Nicholas Marchesi | 13 | $226,139 | Jul–Nov 2025 | **Founder drawings/reimbursement — not a supplier** (exclude) | Verified |
| Qantas | 178 | $120,576 | Jul 2025–Jun 2026 | Commodity (airline) | Verified |
| Defy / Defy Manufacturing / Defy Design | 26 | $107,443 | Jul 2025–May 2026 | **Relationship asset** — Goods bed maker | Verified |
| Telford Smith Engineering | 2 | $39,600 | Dec 2025 | Trade/maker (⚠ known double-pay) | Verified |
| RNM Carpentry | 2 | $33,711 | Nov 2025 | **Relationship asset** — local trade | Verified |
| Kennedy's | 4 | $29,746 | Apr–May 2026 | Trade/timber supply | Verified |
| Hatch Electrical | 3 | $24,397 | Nov 2025–Jan 2026 | **Relationship asset** — local trade | Verified |
| Bionic Self Storage | 2 | $14,795 | Dec 2025 | Commodity (storage) | Verified |
| Kennards Hire | 9 | $14,434 | Jul–Dec 2025 | Repeat services (equipment hire) | Verified |
| Uber | 385 | $14,243 | Jul 2025–Jun 2026 | Commodity (rideshare) | Verified |
| Carbatec Brisbane | 3 | $8,726 | Jan 2026 | Maker tooling | Verified |
| Bunnings Warehouse | 16 | $6,703 | Jul 2025–Jun 2026 | Commodity (hardware) | Verified |
| Maleny Hardware & Rural / Landscaping / Liberty Maleny | ~32 | ~$10,800 | ongoing | **Relationship asset** — local Maleny/farm suppliers | Verified |
| Webflow | 78 | $4,672 | ongoing | SaaS (commodity) | Verified |

### B2. Top suppliers by paid ACCPAY bills, FY26

| Supplier | Bills | Σ billed | First → last | Asset type | Confidence |
|---|---|---|---|---|---|
| Defy Manufacturing / Defy | 24 | $111,922 | Jul 2025–Mar 2026 | **Relationship asset** — core Goods maker | Verified |
| Bunnings Warehouse | 41 | $40,212 | Jul 2025–May 2026 | Commodity (hardware) | Verified |
| Qantas (+ Group Accom) | 92 | $46,283 | Jul 2025–Mar 2026 | Commodity (travel) | Verified |
| Telford Smith Engineering | 1 | $19,800 | Dec 2025 | Trade/maker | Verified |
| Centre Canvas And Upholstery | 2 | $15,000 | Jan–Mar 2026 | **Relationship asset** — maker | Verified |
| **Oonchiumpa Consultancy and Services** | 2 | $14,850 | Oct–Dec 2025 | **First Nations business — relationship asset** | Verified |
| **Joseph Kirmos** | 3 | $13,500 | Mar–May 2026 | **Relationship asset** — Harvest/garden labour | Verified |
| Zinus Australia | 1 | $10,871 | Sep 2025 | Commodity (mattress supply) | Verified |
| The Matnic Trust | 3 | $9,860 | Dec 2025–Mar 2026 | Repeat services | Verified |
| DNP Australia | 4 | $8,051 | Jul 2025–Apr 2026 | Repeat services | Verified |
| TJ's Imaging Centre | 5 | $7,623 | Jul 2025–Feb 2026 | **Relationship asset** — local print/photo | Verified |
| The Funding Network | 2 | $6,500 | Sep 2025 | Sector body (membership/fees) | Verified |

**Relationship-asset suppliers** (cultivate as warm two-way ties): Defy (core maker), Oonchiumpa Consultancy (First Nations business), Joseph Kirmos (Harvest labour), local trades (RNM Carpentry, Hatch Electrical, Centre Canvas, Telford Smith, Kennedy's), Maleny/farm cluster (Maleny Hardware, Maleny Landscaping, Liberty Maleny), TJ's Imaging. **Commodity** (transactional, no cultivation): Qantas, Uber, Webflow, Bunnings, Amazon, AGL, ATO, car-hire (Avis/Thrifty), storage.

---

## Lane C — DGR doors now open (Butterfly lead-through)

Context: Goods on Country runs through **The Butterfly Movement Ltd** (ABN 22 155 132 684) — an already-endorsed **DGR Item 1 + PBI charity since 2012**, Indigenous-led board, handover completes 26 Jun 2026. ACT Pty (not DGR) could never enter DGR-gated doors; Butterfly can. Source: `grant_opportunities` (25,048 rows; 2,960 `status='open'`) + `foundations` (11,042).

> Data shape: the structured `dgr_required` boolean is populated for only 8 of 25,048 rows, and `accepts_charity` for 433. So the DGR-gate and charity counts below are **keyword-matched on free text** (`description` + `eligibility_criteria` + `requirements`) and marked **Inferred**. The Indigenous-targeted count matches name/description and is high-confidence as a floor.

### C1. The three newly-reachable sets (open grants)

| Set | Count (open grants) | Method | Confidence |
|---|---|---|---|
| (1) Grants requiring DGR status | **11** | keyword "deductible gift recipient" / " DGR " + 8 structured `dgr_required=true` | **Inferred** (free-text under-counts; structured field near-empty) |
| (2) Grants for Indigenous-led orgs | **318** | name/description match indigenous/aboriginal/first nation/torres strait | Verified (floor — name/desc only) |
| (3) Grants requiring charity/NFP status | **97** | `accepts_charity=true` OR "registered charity"/"ACNC"/"not-for-profit" | **Inferred** |

### C2. DGR-required open grants (named — the doors that just unlocked)

| Grant | Provider | Confidence |
|---|---|---|
| The McCusker Charitable Foundation Grant Program | McCusker Charitable Foundation | Verified (name); DGR-gate Inferred |
| Small Grants Program | James N Kirby Foundation | Verified; DGR-gate Inferred |
| The John Villiers Trust Funding | The John Villiers Trust | Verified; DGR-gate Inferred |
| Grants Program (DGR Item 1 + TCC) | Therapeutic Guidelines Foundation | Verified; DGR-gate **Verified** (explicit "DGR Item 1") |
| Futureproofing Stream | Tim Fairfax Family Foundation | Verified; DGR-gate Inferred |
| QCoal Foundation Community Grant Program | QCoal Foundation | Verified; DGR-gate Inferred |

### C3. Indigenous-led-targeted open grants (sample of 318)

| Grant | Provider | Confidence |
|---|---|---|
| Aboriginal & Torres Strait Islander Student Scholarships | Bupa Foundation | Verified |
| Aboriginal Health Partnerships Funding | nib Foundation | Verified |
| Aboriginal Business Development Program | NT Government | Verified |
| Aboriginal Community Infrastructure Program | Victorian Government | Verified |
| 2026-2029 Indigenous Employment Initiative | Dept of Health, Disability & Ageing | Verified |
| Aboriginal Affairs NSW Closing the Gap Partnership Grant | NSW Government — Aboriginal Affairs | Verified |

### C4. Foundations newly in range (DGR-endorsed funders)

| Metric | Count | Confidence |
|---|---|---|
| Foundations endorsed DGR (`has_dgr=true`) | 551 | Verified |
| DGR foundations with Indigenous focus | 131 | Inferred (text match on focus/recipients) |
| Foundations with any Indigenous focus (DGR or not) | 1,900 | Inferred |
| Foundations whose free text explicitly requires grantee DGR/charity | 10 | Verified (floor — most don't state it; see gap) |

**Gap:** the foundations table rarely records grantee-eligibility in structured form, so "foundations that ONLY fund DGR-endorsed orgs" cannot be counted reliably from the DB — the 10 explicit ones are a floor, not the true population. Treat C1(1)/C4 as directional, not exhaustive.

---

## What this adds to the warm→cold ladder

- **Buyer pipeline is the warmest money** that the foundation-signals report misses: $1.7M (WHSAC/Groote), $132K (Snow beds), $84.7K (Centrecorp) — Invoiced/Proposed deals, not cold prospects.
- **Three grant applications are genuinely live** (Indigenous Languages & Arts $300K in-progress; First Nations Development Fund + Qld Gives submitted) — distinct from the 259-row "Identified" discovery noise; don't read the Grants pipeline's $272M as real.
- **The email spine reveals warm funders no foundation-signal scan would rank:** Dusseldorp (Mounty Yarns proposal, 40 touches/yr), Snow (First Nations Advisory ToR, 45/yr), Minderoo, Just Reinvest, Mannifera, Aurizon Community Giving — these are *conversations in motion*, the warmest rung.
- **Government grant rails are active relationships too:** Sport QLD (final report/acquittal), DEWR (REAL Innovation Fund EOI for Palm Island via partner) — warm, recurring, lane=gov.
- **Suppliers are an untapped warm rung:** Defy (Goods maker, ~$219K across both tables), Oonchiumpa Consultancy (First Nations business), Joseph Kirmos, and the Maleny/local-trade cluster are two-way relationships, not just costs — candidates for testimonial, co-marketing, and procurement-policy storytelling.
- **Butterfly's DGR endorsement opens a measurable new door:** ~11 DGR-gated open grants + 318 Indigenous-targeted open grants + 551 DGR foundations (131 Indigenous-focused) become reachable that ACT Pty alone could not enter.
- **Community-line integrity is at risk in the warm rungs:** 3 confirmed violations (Kristy Bloomfield, Shaun Fisher, Rachel Atkinson) sit inside funder/partner drips — fix before any drip send, or the ladder leaks community people into automated funnels.
- **Tag hygiene is a ladder reliability problem:** `role:community` is mis-applied to funder staff (FRRR, Paul Ramsay), inflating community counts and masking real violations — a cleanup pass would sharpen every segment.
- **The spine is not in raw form in this DB** — `supporter_comms_summary` (a materialised view) is the only mineable surface; the 27k raw messages live upstream (Beeper/Gmail), so "last contact" is reliable but full-thread mining requires the source system.
