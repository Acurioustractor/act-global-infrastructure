---
title: Verified per-state 20 + QLD funding deep-dive + contact enrichment plan
date: 2026-04-20
purpose: |
  Ben asked: identify 20 main organisations per state with ABNs, charity status, community-control status etc verified; find a way to contact all of them where linkage is weak; especially surface QLD orgs that received specific state government program support in the last 2 years because CivicGraph already has that data.
output:
  - apps/command-center/public/minderoo-verified-candidates.json (160 verified candidates)
  - This plan doc (contact enrichment strategy + linkage strength breakdown)
---

# Verified per-state 20 + contact enrichment

## What's in the verified file

160 candidates (20 per state/territory) with every available verification field:
- `abn` — ACN/ABN number for ACNC lookup
- `gs_entity_id` — CivicGraph entity ID for deep lookup
- `entity_type` — indigenous_corp / charity / social_enterprise / company
- `website` — if we have one
- `lga` + `postcode` — location verification
- `intervention_count` + `yj_intervention_count` — ALMA evidence layer
- `portfolio_score` — quality score if ALMA evidence exists
- `recent_qld_funding` — dollars of state youth-justice funding FY24-26 (QLD only)
- `funded_program_count` — number of distinct programs funded
- `linkage_strength` — classification used for outreach prioritisation
- `verification_score` — 0–5 composite

## Linkage strength distribution

Across all 160 candidates:

| Linkage | Count | Meaning |
|---|---|---|
| **strong_linkage** | 54 | Has ALMA youth-justice intervention with portfolio score — evidence-backed, workshop-ready |
| **funded_no_alma** | 70 | Received QLD state youth-justice funding FY24-26 but no ALMA record — funded but under-documented (primary authoring opportunity) |
| **weak_linkage_with_website** | 25 | No ALMA + no recent funding, has website — researchable via public channels before contact |
| **weak_linkage_no_contact** | 8 | No ALMA + no funding + no website — phone-directory / ABN-lookup outreach required |
| **moderate_linkage** | 3 | Has ALMA intervention (not youth-justice-specific) |

## QLD funding-verified tier (highest evidence)

**43 community-controlled QLD orgs received $280K–$44M in state youth-justice-related program funding FY24-26.** 13 of these are already in the verified top-20 for QLD. The rest sit in the broader QLD pool but didn't make the top 20 due to lower ALMA scoring or smaller funding amounts.

Standout QLD funded candidates beyond our 5 confirmed anchors:

1. **Institute for Urban Indigenous Health Ltd** (Brisbane, ABN 32140019290) — **$44M across 17 programs** in one year. Includes Beenleigh Primary Healthcare Hub + Birthing in Our Communities (Logan, Redlands, Salisbury). Largest Indigenous health hub in QLD by funding volume. Website iuih.org.au.

2. **Townsville Aboriginal and Torres Strait Islander Corporation for Health Services (TAIHS)** (ABN 66010113603) — **$7.8M across 7 programs** including **Bail Support Service, CYRD Diversion, Intensive Bail Initiative**. Deep youth-justice specifically.

3. **Mithangkaya Nguli / Young People Ahead Youth and Community Services** (Carpentaria, ABN 35424394822) — **$3.85M for "Intensive on Country"**. Literal name match to Brave Ones.

4. **Jabalbina Yalanji Aboriginal Corporation** (Douglas, ABN 79611886178) — **$6.4M across 3 programs: Intensive on Country, On Country, Social Services**. Youth-justice-adjacent but explicitly on-Country.

5. **ATSICHS Brisbane** (ABN 22009943435) — **$2.9M across 4 programs** including CYRD Diversion, YJ Family Led Decision Making, Community Youth Response. Brisbane hub.

6. **Kambu Aboriginal and Torres Strait Islander Corporation for Health** (Scenic Rim, ABN 83155632836) — **$1.4M** including CYRD Diversion + Cultural Mentoring.

7. **Murri Watch Aboriginal and Torres Strait Islander Corporation** (Brisbane, ABN 75628946046) — **$1.04M across Watchhouse Support + Young Offender Support Service**. This is the org referenced in the Aesthetics of Asymmetry Artefact 001.

8. **QATSICPP (Queensland Aboriginal & Torres Strait Islander Child Protection Peak)** (ABN 21132666525) — **$1.2M**, YJ Family Led Decision Making.

9. **DIYDG (Deadly Inspiring Youth Doing Good)** (Cairns, ABN 31213096805) — **$600K across 5 programs** including CYRD Bridging to Flexischool.

10. **Carbal Aboriginal and Torres Strait Islander Health Services** (Toowoomba, ABN 50275271535) — **$3.1M for Making Tracks in Primary Health Care**.

**QLD specific-funding data is the STRONGEST evidence layer we have** — it confirms recent state-level recognition with dollars and named programs. Worth its own treatment in the envelope: *"These QLD organisations have received specific state youth-justice-related funding in FY24-26. The state has already verified their delivery capacity. Adding these to the ALMA scoring + co-selection method closes the remaining evidence gap."*

## Non-QLD states — limited funding data

`justice_funding` coverage for FY24-26 is QLD-heavy. NSW, VIC, WA, SA, TAS, ACT have sparse or no state-youth-justice funding records in this period. This means:

- For QLD: we can cross-reference ALMA scoring + state funding + ACNC + CivicGraph for **four layers of evidence** per candidate
- For non-QLD states: we rely on ALMA scoring + ACNC + CivicGraph, **three layers**. The state-funding verification layer isn't yet available.

**Implication:** When Minderoo asks *"how do you know this NSW org is a real operator?"* the honest answer today is *"ALMA score + community-controlled flag + website + ACNC registration"* — no funding record to cite. For QLD we can add a fourth data point. Post-1-May engineering work should extend the justice_funding ingestion to other states.

## Contact enrichment — the gap

Of 8,826 community-controlled orgs in CivicGraph:

- **0 have email in the DB**
- **0 have phone in the DB**
- **1,003 (11%) have website**

All candidate outreach currently requires external lookup. Three-tier enrichment plan:

### Tier 1 — ACNC public register (fastest, cheapest)

ACNC publishes email + address for every registered charity. An automated scrape-and-join against `charity_abn_lookup(e.abn)` would populate email/phone for the ~7,500 community-controlled orgs that are ACNC-registered.

**Implementation (post-1-May):** a cron script `scripts/enrich-contacts-from-acnc.mjs` that iterates gs_entities with `entity_type IN ('charity', 'foundation', 'indigenous_corp')` and missing email, queries ACNC, writes email/phone/postal_address into gs_entities.

### Tier 2 — Website scrape (medium effort)

For the 1,003 orgs with website but no email, scrape the contact page. Pattern already used in ACT's ecosystem for similar enrichment.

### Tier 3 — Manual for the weak_linkage_no_contact (8 orgs)

Phone directory + desk research. ~2–3 hours of manual effort across all 8. These are edge cases.

## Session 1 readiness — per-state contact strategy

With the above, the realistic Session 1 story to Lucy is:

- **QLD (3+ anchors confirmed, funding layer rich)**: every candidate ABN-verified + ACNC-registered + funding-traceable + ALMA-scoreable. Gold standard.
- **NSW (1 anchor confirmed)**: Mounty Yarns confirmed; Wirringa Baiya + ALS NSW/ACT as Session 1 candidates. Contact enrichment needed.
- **VIC (0 confirmed)**: 7-candidate community-led pool; Rumbalara strongest. Contact enrichment needed.
- **WA (0 confirmed)**: Kullarri strongest remote-WA option; Hailey/UWA intro still open. Contact enrichment needed.
- **SA (0 confirmed)**: 1 strong candidate (Aboriginal Drug and Alcohol Council SA) + research from 107 CC Indigenous corps pool. Contact enrichment + community research needed.
- **TAS (0 confirmed)**: ATSILS strongest; thinnest overall pool. Contact enrichment + community research needed.
- **ACT (0 confirmed)**: Gugan Gulwan Youth Aboriginal Corp strongest (33 yrs). Contact enrichment needed.
- **NT (1 confirmed)**: Oonchiumpa confirmed; Tangentyere / Bawinanga as research candidates. Contact enrichment needed.

## Contact-outreach template for Session 1 candidates

For every candidate ACT approaches between Sessions 1 and 2:

> *"Kia ora [leadership name],*
>
> *I'm Benjamin Knight from A Curious Tractor, working with Nicholas Marchesi OAM on a three-year Minderoo Foundation-backed program called The Three Circles. It supports 7-8 anchor Aboriginal Community Controlled organisations across Australia, one per state and territory, selected together with community consent.*
>
> *Your organisation appeared in our data spine as a strong [state] candidate because [specific reason — ALMA evidence / state funding / longstanding operation / program referenced]. I'd like to ask permission to include [org] in a small shortlist we're walking through with Minderoo in late May 2026. If you'd like to be included, the next step is a 30-minute conversation about your work and whether this program would fit; if you'd rather not, that's also fine and you won't hear from us again.*
>
> *Live dashboard if you want to see the method: [URL]*
>
> *Benjamin Knight · benjamin@act.place · A Curious Tractor"*

This is a template — each candidate's outreach is tailored to the specific linkage reason visible in the verified JSON.

## Action list

**Pre-1-May (envelope-critical):**
1. Surface the QLD funding-verified tier as a page in the envelope (separate from Session 1 shortlist)
2. Build a dashboard section that shows the verified-candidate JSON with linkage-strength chips
3. Ben review the verified list per state to confirm Session 1 proposal

**Post-1-May (engineering):**
1. Build `scripts/enrich-contacts-from-acnc.mjs` — tier 1 enrichment
2. Build `scripts/scrape-website-contacts.mjs` — tier 2 enrichment
3. Extend `justice_funding` ingestion to NSW/VIC/WA/SA/TAS/NT/ACT for the fourth-evidence-layer parity
4. Author ALMA interventions for the 70 `funded_no_alma` QLD orgs — each has a funded program already; writing the record brings them into the ALMA scoring pool
