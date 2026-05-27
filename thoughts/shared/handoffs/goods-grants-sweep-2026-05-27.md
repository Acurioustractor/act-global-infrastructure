# Goods on Country — Grant Discovery & Curation Sweep

**Date:** 2026-05-27
**Author:** Claude Code (research agent, GrantScope working dir)
**Subject:** Funding discovery + curation for "Goods on Country" — ACT's First Nations social enterprise (beds + washing machines for remote/NT communities). Needs span **capital · capability · procurement · grant funding**.
**Scope of WRITE:** This file only. No DB mutations executed. All proposed UPDATE/INSERT statements below are for Ben to review and run.

> Confidence key: **Verified** = confirmed against a primary source (DB row or funder page); **Inferred** = derived/likely but not directly confirmed; **Unverified** = single source, taken on faith. NEVER treat amounts/dates below as final without clicking the URL — funder pages move.

---

## 0. TL;DR for Ben

- **SEDI is the single best capability-funding fit and it is OPEN NOW.** IIA reopened SEDI Capability Building Grants on **8 May 2026**, **rolling assessment until funds exhausted**, up to **$120K**. The DB rows are real but mis-scored at 6. Proposed enrichment below bumps to **~82** and fills provider/amount/eligibility. The dedicated **SEDI First Nations stream** ($2.52M, IIA + Malu Pty Ltd) is **NOT yet open** — "details soon / later this year." Watch + EOI to SEDIGrants@impactinvestingaustralia.com.
- **Scoring noise diagnosis (Verified):** of the 193 rows scored `goods_relevance_score >= 60`, **94 are `arc-grants`** (university research — Goods can't apply) and **45 are `qld-arts-data`** (arts grants). That's **72% noise** from two sources. Recommendation in §5: hard source-exclude `arc-grants`, down-weight academic/arts, and add an entity-eligibility gate.
- **Capital ≠ grant.** Goods' biggest unlock is probably NOT a grant at all — it's **IBA Start-Up Finance** (up to 30% of loan as grant, max $150K loan) + **Many Rivers** microfinance + **NAIF small-loans** + **Supply Nation procurement** (the demand side — $5.83B FY24-25 member spend). Treat these as a parallel pipeline (§4).

---

## 1. SEDI — verification + proposed enrichment

### 1a. What's in the DB now (Verified — queried `grant_opportunities`)

| id | name | provider | amount_max | closes_at | goods_score | source |
|---|---|---|---|---|---|---|
| `5e52c7ef-a1b1-4319-b57c-421448dc3f27` | SEDI Capability Building Grant | Department of Social Services | 120000 | 2026-06-30 | **6** | dss |
| `06f01742-4659-4203-95a3-4b2e0c01908a` | SEDI Capability Building Grant | (null) | 120000 | (null) | 6 | ghl_sync |
| `19765334-e457-4482-a1db-5553894b240d` | Social Enterprise Capability Building Grants | Department of Social Services | 120000 | 2026-06-30 | 44 | web-search |
| `49236577-9344-4fde-98fb-63c7cd9f2498` | Social Enterprise Development Grants | Queensland Government | 75000 | 2026-06-30 | 27 | alta_agent |

The `dss` row and the `web-search` row are **the same program** described twice (one scored 6, one scored 44). The `ghl_sync` row is a thin duplicate (no provider, no date). The Qld row is a **separate** program (Qld Govt, not the federal SEDI).

### 1b. Corrected facts (Verified against dss.gov.au + communitygrants.gov.au + IIA, 2026-05-27)

- **Program:** Social Enterprise Development Initiative (SEDI). 4-year program FY2023-24 → FY2026-27.
- **Admin / front door:** Impact Investing Australia (IIA). URL: `https://impactinvestingaustralia.com/looking-for-funding-or-investors/`; platform `sedigrants.grantplatform.com`.
- **Funder:** Dept of Social Services (DSS).
- **Capability Building Grants:** up to **$120,000**. Applications **reopened 8 May 2026**, **assessed as received until funding exhausted** (rolling — so `closes_at 2026-06-30` is a placeholder; the real behaviour is rolling-until-exhausted, likely into FY26-27).
- **Eligibility (Inferred from program design):** trading social enterprises, Indigenous-owned/controlled eligible, typically >$50K revenue. Accepts Pty Ltd and incorporated/charity structures.
- **First Nations stream (Verified — not yet open):** Govt to invest a further **$2.52M** in a dedicated SEDI First Nations round; **IIA + Malu Pty Ltd** selected as administrators (2026). EOI / contact: **SEDIGrants@impactinvestingaustralia.com**. Status: "details soon."
- Extra **$3.4M** committed to extend SEDI to **June 2027**; **$3.3M** previously earmarked for First Nations social enterprises.

### 1c. Proposed DB writes (DO NOT EXECUTE — Ben to review)

**UPDATE the canonical DSS row** (`5e52c7ef…`):

```sql
UPDATE grant_opportunities SET
  name = 'SEDI Capability Building Grant',
  provider = 'Impact Investing Australia (admin) — Dept of Social Services (funder)',
  program = 'Social Enterprise Development Initiative (SEDI)',
  amount_min = 0,
  amount_max = 120000,
  closes_at = '2027-06-30',            -- rolling-until-exhausted; June-2027 program end as the honest backstop
  deadline = '2027-06-30',
  status = 'open',
  goods_relevance_score = 82,
  accepts_pty_ltd = true,
  accepts_charity = true,
  url = 'https://impactinvestingaustralia.com/looking-for-funding-or-investors/',
  description = 'Capability-building grants up to $120K for trading social enterprises (Indigenous-owned/controlled eligible, typically >$50K revenue). Reopened 8 May 2026, assessed on a rolling basis until funds exhausted. Platform: sedigrants.grantplatform.com.',
  updated_at = now()
WHERE id = '5e52c7ef-a1b1-4319-b57c-421448dc3f27';
```

**INSERT the First Nations stream as a distinct watchlist row** (not yet open — track it):

```sql
INSERT INTO grant_opportunities (name, provider, program, amount_min, amount_max, status, goods_relevance_score, accepts_pty_ltd, accepts_charity, url, description, source, discovery_method)
VALUES (
  'SEDI First Nations Social Enterprise Grants',
  'Impact Investing Australia + Malu Pty Ltd (admin) — Dept of Social Services (funder)',
  'Social Enterprise Development Initiative (SEDI) — First Nations Stream',
  NULL, NULL,
  'upcoming',
  88,
  true, true,
  'https://impactinvestingaustralia.com/looking-for-funding-or-investors/',
  'Dedicated $2.52M SEDI funding round for First Nations social enterprises. IIA partnered with Malu Pty Ltd as administrator (2026). NOT YET OPEN — register interest at SEDIGrants@impactinvestingaustralia.com. Strongest structural fit for Goods on Country.',
  'manual-research-2026-05-27',
  'web-research'
);
```

**De-dup:** mark `06f01742…` (ghl_sync, empty) and `19765334…` (web-search, same DSS program) as duplicates of `5e52c7ef…` (e.g. `status='duplicate'` or merge), so Goods doesn't see SEDI three times. Leave the Qld `49236577…` row alone — it's a genuinely separate program (see §2).

---

## 2. Honest existing-grant shortlist (enterprise-fundable, from `grant_opportunities`)

**Method (Verified):** `COALESCE(closes_at, deadline)` between 2026-05-27 and 2026-12-31; excluded `arc-grants`, universities, sediment/PhD/scholarship/fellowship; required an enterprise/Indigenous/community/housing/health/economic keyword or category. Then **hand-filtered** for "can a First Nations bed+washer enterprise actually apply?" — dropped pure research (NHMRC/MRFF), arts-festival/artist-only, scholarships/bursaries, and council micro-grants too small/local to matter.

Ranked by **real fit for Goods** (a manufacturing/social-enterprise that supplies furniture+appliances to remote First Nations communities), not by the noisy `goods_relevance_score`. **23 grants.**

| # | Grant | Funder | Amount (max) | Closes | DB score | Why it fits Goods | Fit |
|---|---|---|---|---|---|---|---|
| 1 | **SEDI Capability Building Grant** | IIA / DSS | $120K | rolling (open now) | 6→82 | Capability funding for trading social enterprises incl. Indigenous-owned. Open NOW. | **Verified — top** |
| 2 | **Indigenous Advancement Strategy (IAS)** | NIAA | $500K | 2026-06-30 | 48 | Federal IAS funds Indigenous economic participation, jobs, enterprise. Pty Ltd eligible. | Verified |
| 3 | **Aboriginal Affairs NSW Closing the Gap Partnership** | NSW Aboriginal Affairs | $5M | 2026-06-30 | 93 | Large CtG partnership funding; economic-participation priority. NSW geo caveat. | Inferred |
| 4 | **Social Enterprise Development Grants** | Queensland Government | $75K | 2026-06-30 | 27 | Qld state SE grants; Pty Ltd eligible. Goods is Qld-based (Jinibara Country). | Verified |
| 5 | **Micro Business Enterprises Project** | Nova Peris Foundation | $50K | 2026-06-30 | 32 | Indigenous micro/enterprise support; Pty Ltd eligible. | Inferred |
| 6 | **Prescribed Bodies Corporate Capacity Building** | NIAA | (n/a) | 2026-06-30 | 45 | If Goods partners with a PBC for remote delivery, capacity funding flows. | Inferred |
| 7 | **IAS: Support for Community Sector Organisations** | Australian Govt | (n/a) | 2026-06-30 | 41 | IAS stream; community-org delivery partners. | Inferred |
| 8 | **2025-2026 Minister's Discretionary Fund** | NSW Aboriginal Affairs | $100K | 2026-06-30 | 60 | Discretionary Indigenous fund; flexible use. NSW geo. | Inferred |
| 9 | **2024-2026 LDM Operational Funding — Stream 1** | NSW Aboriginal Affairs | $475K | 2026-06-30 | 61 | Local Decision Making operational funding. NSW geo. | Inferred |
| 10 | **Indigenous Capacity Building Fund** | (via Philanthropy Aus listing) | $100K | 2026-09-30 | 44 | Capacity-building for Indigenous orgs. Verify the underlying funder. | Inferred |
| 11 | **Indigenous Cultural Preservation Grant** | (via Philanthropy Aus listing) | $200K | 2026-09-30 | 73 | Pty Ltd + charity eligible; large. Verify underlying funder before relying. | Inferred |
| 12 | **Local Investments Funding** | Australian Govt | (n/a) | 2026-06-30 | 31 | Place-based investment; remote-community angle. | Inferred |
| 13 | **First Nations Clean Energy Advice Grants R1** | DCCEEW | (n/a) | 2026-09-03 | 32 | Adjacent — if Goods adds energy-efficient appliances / on-Country energy. | Inferred |
| 14 | **Community Development Grants Programme** | Australian Govt | (n/a) | 2026-06-30 | 20 | Place-based community infrastructure. | Inferred |
| 15 | **Secure Communities Partnership — R2 Small Business** | DCSODSFB (Qld) | $20K | 2026-06-30 | 20 | Qld small-business stream; Pty Ltd eligible. | Inferred |
| 16 | **QCoal Foundation Community Grant** | QCoal Foundation | $15K | 2026-08-31 | 50 | Qld/regional community grants; Pty Ltd + charity eligible. Small. | Inferred |
| 17 | **Social Enterprise Innovation Grant** | (via GrantConnect listing) | $50K | 2026-06-30 | 20 | SE innovation; Pty Ltd eligible. Verify underlying funder. | Inferred |
| 18 | **The Haven Project** | Property Industry Foundation | $50K | 2026-06-30 | 24 | Furniture/housing-adjacent (youth homelessness fit-out). Beds angle. | Inferred |
| 19 | **Enablers Programme** | Chain Reaction Foundation | $50K | 2026-06-30 | 20 | Community-enabler grants. | Inferred |
| 20 | **Community Development Grants (CDG)** | Australian Govt | (n/a) | 2026-06-30 | 20 | Federal community-development infrastructure. | Inferred |
| 21 | **Government Priority & Partnerships Investment Pathway** | NSW DPIRD | $25M | 2026-06-30 | 26 | Large regional-development partnership pathway. NSW geo; partnership model. | Inferred |
| 22 | **Transport Access Regional Partnerships** | Transport for NSW | $250K | 2026-06-30 | 43 | Adjacent — remote logistics/delivery of goods. NSW geo. | Inferred |
| 23 | **Telethon Program & Equipment Grants** | Channel 7 Telethon Trust | (n/a) | 2026-08-31 | 25 | Equipment/program grants; charity-eligible. WA-leaning. | Inferred |

**Deliberately EXCLUDED** (would have surfaced on a naive keyword/score pull, but Goods can't or shouldn't apply): all 94 `arc-grants` (DP/DE/LP/LE university research incl. the "sediment" SEDI false-matches), 45 `qld-arts-data` arts grants, NHMRC/MRFF Indigenous Health *Research* Fund (research-only), Lowitja research grants (research-only — see §3 note), artist/festival-only (WOMADelaide, Quick Response Fashion, Minderoo Artist Fund, Indigenous Visual Arts), scholarships/bursaries (Edmund Rice, Gregory Terrace), and sub-$10K hyper-local council grants.

---

## 3. First-principles sweep — sources GrantScope under-covers (NEW grants/programs found)

**Coverage gap (Verified):** the nightly pipeline (`scripts/nightly-grant-pipeline.mjs`) scrapes **state-government portals + GrantConnect + an ABN-driven `foundation_program` scrape + ARC**. It does **NOT** systematically crawl: IBA, ILSC, NIAA program pages (beyond GrantConnect listings), corporate foundations (Westpac/Telstra/Macquarie), Supply Nation, healthy-homes funders, NT/ABA via Aboriginal Investment NT, FRRR, or Indigenous-finance bodies. That's exactly where a bed+washer First Nations enterprise's money lives. Everything below is **net-new** relative to the DB unless noted.

| Program | Funder | What it funds | Eligibility | Amount | Open / Close | URL | Fit for Goods |
|---|---|---|---|---|---|---|---|
| **SEDI Capability Building** (re-confirm) | IIA / DSS | Capability, ops, sustainable models | Trading SEs incl. Indigenous-owned, ~>$50K rev | $120K | **Open 8 May 2026, rolling until exhausted** | impactinvestingaustralia.com | **★ Top capability fit — apply now** |
| **SEDI First Nations Stream** | IIA + Malu Pty Ltd / DSS | Dedicated First Nations SE round | First Nations social enterprises | ~$2.52M pool | **Not yet open** — "soon" | sedigrants.grantplatform.com / SEDIGrants@impactinvestingaustralia.com | **★ Best structural fit — register EOI** |
| **IBA Start-Up Finance Package** | Indigenous Business Australia | Loan + up to **30% as a grant** to buy business assets (e.g. machinery, inventory) | ≥50% Indigenous-owned, ABN, viable | Up to $150K loan (30% grant component) | Year-round | iba.gov.au | **★ Capital — buys beds/washers/plant** |
| **Our Country Our Future** | ILSC | Land/water ownership + enterprise on Country; partnership brokering + funding | Indigenous groups | Varies | Ongoing | ilsc.gov.au/partner-with-us/our-country-our-future | High — on-Country enterprise infrastructure |
| **Future Industries Grant Program** | ILSC | Independent specialist advice on economic opportunities on Country | Indigenous Corporations | Varies (advice) | Check site | ilsc.gov.au/grants/future-industries-grant-program | Medium — feasibility/advice for scale-up |
| **Aboriginals Benefit Account (ABA)** | NIAA / **Aboriginal Investment NT** | Beneficial projects for Aboriginal Territorians; multi-year, admin costs OK | NT-benefit projects; non-Indigenous applicants eligible if no suitable Aboriginal org + community support | Project-scaled | **Year-round (open funding)** | aboriginalinvestment.org.au/grants | **★ Remote-NT — Goods' core delivery geography** |
| **NAIF Small Loans Program** | Northern Australia Infrastructure Facility | Concessional finance for First Nations community projects (loans/equity, NOT grants) | Northern-Australia projects | Loan-scaled | Ongoing | naif.gov.au | Medium — capital for scale infrastructure |
| **Many Rivers Microfinance** | Many Rivers | Microenterprise loans + coaching for First Nations businesses | First Nations entrepreneurs | Micro-loans | Ongoing | manyrivers.org.au | Medium — early capital + capability |
| **Barayamal Accelerator** | Barayamal | Indigenous startup accelerator — grants + coworking + mentoring | First Nations founders, early-stage | ~$10K/startup ($50K pool) | EOI rounds (state-based) | barayamal.com.au | Medium — capability + small grant + network |
| **FRRR — Strengthening Rural Communities (Small & Vital + Larger Leverage)** | FRRR | Remote/rural community projects; **explicit First Nations + economic-participation priority**; non-DGR eligible | Communities <15K pop, local NFP/community groups (Goods may need an auspice) | $10K / $50K tiers | **Round 30 opens 25 Jun 2026, closes 17 Sep 2026** | frrr.org.au/funding/src-small-vital | **★ Remote + First Nations priority** |
| **FRRR / ANZ Seeds of Renewal** | FRRR + ANZ | Rural community + economic projects | Rural NFP/community | Varies | Annual round | frrr.org.au | Medium |
| **Westpac Foundation — Inclusive Employment Grant** | Westpac Foundation | Jobs/training for people facing barriers; social enterprises eligible | Community orgs + social enterprises | $50K over 2 yrs | **Round opens 2026** (date TBC) | westpacfoundation.com.au/our-grants | High — Goods = employment social enterprise |
| **Westpac Social Change Fellowship** | Westpac Scholars | Social entrepreneur development | Social entrepreneurs | Fellowship | **2027 round open, closes 16 Jun 2026** | scholars.westpac.com.au | Medium — founder capability |
| **Telstra Connected Communities** (via FRRR) | Telstra Foundation | Digital tech for remote communities; First Nations-led eligible | Rural/regional/remote | $10K ($200K pool) | **Opened 24 Feb, closed 26 Mar 2026** (annual — next ~Feb 2027) | telstra.com.au/.../telstra-connected-communities-grants | Low-Med — adjacent (digital), **CLOSED this cycle** |
| **Macquarie Group Foundation** | Macquarie | Work-integrated social enterprises; Indigenous economic development | Via partner orgs / nomination | Varies | By relationship | macquarie.com/.../global-grant-making-focus | Medium — relationship-led, not open application |
| **Lowitja Institute Seeding / GLOWS** | Lowitja | Aboriginal & TSI community grant stream (research-leaning but has a *community* stream) | ACCHOs / community orgs | Seeding-scale | **GLOWS closes 10 Jun 2026; another round 29 May 2026** | lowitja.smartygrants.com.au | Low — mostly research; community stream only if Goods has a health-evidence angle |
| **Supply Nation (procurement, not a grant)** | Supply Nation | Certification + access to corporate/govt buyers ($5.83B FY24-25 member spend) | ≥50% Indigenous-owned/controlled | Demand, not grant | Year-round registration | supplynation.org.au | **★ DEMAND SIDE — register to sell beds/washers to RAP buyers & govt** |

**Paywalled / unscrapeable / not confirmable this pass (flagged honestly):**
- **English Family Foundation** — no current open-round detail surfaced; likely invitation/relationship-only. Mark Unverified.
- **NACCHO** — member-funding body, not an open grant-maker to external enterprises; relevant only as a *channel/partner* for health-home delivery. No open round found.
- **Healthabitat** — delivers the NT "Housing for Health" program under govt contract (not a grant-maker). The real money is the **$4B Aust+NT remote housing investment (2700 homes/decade)** — that's a **procurement/supply opportunity** for Goods' beds, not a grant. Pursue via NT DHLGCD remote-housing contracts + Supply Nation.
- **Macquarie / Westpac IEG exact 2026 dates** — pages indicate "opens 2026" without a firm date this pass.

---

## 4. Strategy / source-vector recommendation (first-principles)

Goods needs **four different kinds of money** and the existing GrantScope keyword search only finds the weakest of them well (small competitive grants). Map the pipeline to the need:

1. **CAPITAL (buy plant, beds, washers, inventory):** IBA Start-Up Finance (30% grant component) → Many Rivers micro → NAIF small loans. These are *loans-with-grant-features*, not grant-portal listings — GrantScope misses them entirely. **Highest leverage, build a dedicated "Indigenous finance" watch.**
2. **CAPABILITY (build the enterprise muscle):** SEDI Capability (open now) → SEDI First Nations stream (watch) → Westpac IEG/Fellowship → Barayamal. SEDI is the anchor.
3. **PROCUREMENT (the demand side — sell, don't beg):** Supply Nation certification + the **$4B remote-housing program** + corporate RAP buyers. For a manufacturer, a **purchase order is worth more than a grant** and is repeatable. GrantScope doesn't model this at all — it's the biggest blind spot.
4. **GRANT (project + remote-community delivery):** FRRR SRC (First Nations + remote priority, opens 25 Jun), ABA/Aboriginal Investment NT (year-round, NT geo), IAS/NIAA, Qld SE grants. Use these for *delivery into communities*, auspiced if needed.

**Recommended new GrantScope source crawlers** (close the coverage gap): `iba.gov.au`, `ilsc.gov.au/grants`, `niaa.gov.au/.../grants-and-funding` (IAS + ABA), `aboriginalinvestment.org.au/grants`, `frrr.org.au/funding/find-funding-now`, `impactinvestingaustralia.com`, `westpacfoundation.com.au/our-grants`, `barayamal.com.au/grants`, and a Supply Nation / RAP-buyer demand feed. Add `discovery_method='indigenous-finance'` and `'procurement'` tags so they don't get squashed by the grant-relevance scorer.

---

## 5. Scoring-noise fix (the headline recommendation)

**Diagnosis (Verified):** of 193 rows at `goods_relevance_score >= 60`: **94 `arc-grants` + 45 `qld-arts-data` = 72% pure noise.** The scorer keyword-matches "sediment → SEDI", "research project", "development" and rewards big-dollar university research that Goods is structurally barred from. Meanwhile the genuinely-best fit (SEDI Capability) scored **6**.

**Fix (in priority order):**

1. **Hard source-exclude `arc-grants` from Goods relevance entirely.** A bed+washer social enterprise cannot apply to ARC. This alone removes ~half the noise. (Filter at query time and/or set `goods_relevance_score = 0` for `source='arc-grants'`.)
2. **Add an entity-eligibility gate before scoring.** If `accepts_pty_ltd`/`accepts_charity` are both false/null AND the funder is a research council/university, zero the score. Goods is a Pty Ltd / community-controlled enterprise, not a researcher.
3. **Kill the "SEDI" substring match against "sediment".** The scorer is matching geology grants ("SEDIment dissolution") to the SEDI program. Require word-boundary / acronym match (`\bSEDI\b`) or a funder allow-list (DSS/IIA), not substring.
4. **Down-weight `qld-arts-data` and arts/festival/artist programs** unless Goods explicitly pursues a cultural-product line.
5. **Up-weight the four real money-types** (§4) via `discovery_method` tags so capital/procurement opportunities aren't penalised for not reading like a "grant."
6. **Re-run the goods relevance scorer** after 1-5 and spot-check that SEDI, IBA, FRRR-SRC, IAS, ABA land in the top 20 and zero ARC rows do.

---

## 6. Provenance

- **DB facts** (SEDI rows, source-noise counts, shortlist candidates): queried `grant_opportunities` on shared ACT DB `tednluwflfhxyucgwigh` via Supabase MCP, 2026-05-27. Schema verified via `information_schema.columns` (column is `goods_relevance_score`, not `goods_relevance`; dates are `closes_at` + `deadline`; no `opens_at` column).
- **External funder facts:** WebSearch 2026-05-27 against dss.gov.au, communitygrants.gov.au, impactinvestingaustralia.com, iba.gov.au, ilsc.gov.au, niaa.gov.au, aboriginalinvestment.org.au, frrr.org.au, westpacfoundation.com.au, telstra.com.au, macquarie.com, lowitja.org.au, supplynation.org.au, barayamal.com.au, manyrivers.org.au.
- **Coverage-gap claim:** read `scripts/nightly-grant-pipeline.mjs` + `scripts/funding-autoresearch/` (README, program.md) — confirmed scrape scope = state portals + GrantConnect + ABN foundation scrape + ARC; no Indigenous-finance/corporate/procurement crawlers.
- **NOT executed:** all SQL in §1c is proposed only. No `grant_opportunities` rows were mutated.
- **Verify-before-relying:** every "Inferred" amount/date/eligibility above needs a click-through before it goes into an application or a funder brief. Funder pages move; rolling-grant `closes_at` is a modelling choice, not a hard deadline.
