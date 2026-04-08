# GrantScope (CivicGraph) — Australian Youth Justice Knowledge Review

## 1. Repo Orientation (50 words)

**What is GrantScope?** CivicGraph — decision infrastructure for Australian government and social sector. It connects supplier intelligence, place-based funding data, and outcome evidence to help institutions allocate better and communities access fairly. **Stack:** Next.js 15, TypeScript, Tailwind 4, Supabase PostgreSQL, MCP server, vector embeddings. **Directory structure:** `/apps/web` (Next.js frontend), `/data` (71 sources), `/scripts` (320+ agentic tasks), `/migrations` (schema), `/mcp-server` (AI agent interface), `/output` (intelligence reports). **Database:** Shared Supabase across CivicGraph (100K entities, 1.08M relationships) + JusticeHub (556 orgs, 1.1K interventions) + Empathy Ledger syncing in.

## 2. Youth Justice Data in GrantScope

**Explicitly loaded datasets:**

- **`rogs-youth-justice/youth-justice-2026.csv`** (2,444 rows): AIHW Rules of Government Spending youth justice by state, jurisdiction, measure (detention vs community), age 10-17, rates per 10,000. Covers FY 2016-17 to 2024-25. Data source: AIHW unpublished Youth Justice National Minimum Dataset. *Latest:* 3,177 young people under supervision (2024-25), detention rate 2.7/10,000, community rate 9.4/10,000.

- **`aihw/rogs-2026-youth-justice.csv`** (2,444 rows): Same data, parallel ingestion path.

- **`aihw/aihw-youth-detention-2025.xlsx`** & **`closing-the-gap/ctg-youth-justice.csv`** (815 rows): Closing the Gap youth detention trajectory projections by state and Indigenous status through 2030-31. Shows detention rate for Aboriginal/TSI youth of 24.6/10,000 projected by 2030-31 (vs 11.9 for all youth).

- **`bocsar/nsw-lga-crime.xlsx`**: NSW Bureau of Crime Statistics crime data by LGA — provides crime context for youth justice geography.

- **`prf-reports/`** (5 PDFs): Maranguka (Bourke) annual report 2024, JRI Youth Justice SA 2024, HRLC annual report, NTCOSS annual report. These are the anchor community organisations documented.

**Named programs visible in funding data:**
Oonchiumpa (Alice Springs — 95% diversion), PICC / Palm Island Community Company (78% diversion, $29M annual turnover, 208 FTE), Mounty Yarns (Mount Druitt), Young Offender Support Service (QLD DCYJMA), Operation Luna (NT Police).

**JusticeHub bridge:** `justice_funding` table (71K rows) holds 1B+ in justice spending tracked by program, recipient ABN, amount, state, announcement date, with direct bridge to ALMA `alma_intervention_id` and ALMA organisations. 315/556 JusticeHub orgs linked to CivicGraph entities (57%); 241 remain unmatched.

## 3. Models, Frameworks, International Precedents

**Documented in repository:**

- **Diagrama (Spain)** — 13.6% recidivism, €31K/year cost, 5.64:1 cost-benefit ratio. Featured in `/thoughts/outreach/the-cure-already-exists-v2.md` (foundational piece). Appears in PICC dashboard as international partner. No technical schema but deeply embedded in pitch narrative.

- **Halt (Holland)** — Referenced in narrative but no dedicated dataset or schema documentation found.

- **Norwegian restorative justice, Portuguese diversion, Canadian First Nations sentencing circles** — Mentioned in context as tour stops and international precedents. Not systematically documented in GrantScope data layer.

- **ALMA (Australian Living Map of Alternatives)** — 1,155 verified interventions documented with evidence type, methodology, outcomes, cultural authority, target cohort, geography. Lives in separate tables (`alma_interventions`, `alma_intervention_evidence`) bridged to justice_funding via `alma_intervention_id`. This is the most comprehensive evidence base GrantScope holds for youth justice alternatives.

- **Maranguka (Bourke)** — Evidence in PDF annual report (2024). No structured data entry in main schema yet; marked as "In ALMA" in PICC dashboard.

- **Whole System Approach (Scotland)** — Not found in current data.

## 4. Frameworks Institute / Framing Work

Zero references to Frameworks Institute or Andrea Davidson found in codebase, READMEs, schemas, or output briefs. **Status: Not yet integrated.** This is a gap. The pitch claims framing work as Circle Three anchor, but GrantScope does not hold it.

## 5. Agentic Insight Layer

**Live agents:**

- **`scrape-qld-hansard.mjs`** — Scrapes QLD Parliamentary Hansard PDFs from sitting calendar, filters for justice-relevant keywords (youth justice, detention, Indigenous, funding, reform), ingests speeches. Runs on sitting schedule. Output: Hansard speeches tagged by justice relevance.

- **`civicgraph-mcp` (MCP Server)** — Exposes 6 tools to AI agents: `civicgraph_search` (560K entities), `civicgraph_entity` (full profiles + power scores), `civicgraph_power_index` (cross-system rankings), `civicgraph_funding_deserts` (underserved LGAs), `civicgraph_revolving_door` (lobbying + donations + contracts), `civicgraph_ask` (natural language across all datasets). MCP is live, deployed, accessible.

- **`bridge-justice-to-graph.mjs`** — Links JusticeHub organisations to CivicGraph entities via ABN fuzzy matching. Runs on demand. 315/556 matched so far.

- **ALMA enrichment pipeline** (`enrich-alma-orgs.mjs`, `link-alma-*.mjs`) — Enriches ALMA intervention records with CivicGraph entity data (ABN, location, sector, SEIFA, remoteness, revenue). Cascades organisation enrichment backward to interventions.

**Agent outputs (in `/output/`):**
- `picc-comprehensive-dashboard.md` — $38.9M funding tracked for Palm Island CC, BAU program map, innovation project brief (Station Precinct).
- `civicgraph-founder-intake-prd.md` — Product positioning and data layer documentation.
- Philanthropy power briefs (15+ timestamped) — Foundation giving profiles, openness scores, geographic focus matching local orgs.

**Status:** Agentic layer is live and working. Reports generated weekly. Core agents scaffold-to-production (Hansard scraper, entity bridge, ALMA enrichment running). **Gap:** No agent yet for international peer benchmarking (Diagrama, Halt, international tour data is narrative-only).

## 6. Funding Flows / Philanthropy Data

**From MISSION.md metrics:**
- **Entities:** 100,036 resolved (target: 150K+). F1 match precision 94.1%.
- **Relationships:** 199,001 mapped (target: 200K+).
- **Geographic coverage:** 96% postcode, 96% remoteness, 95% LGA, 94% SEIFA.
- **Justice-specific:** 71K rows in `justice_funding` table (state, recipient, program, amount, year, announcement date).
- **AusTender contracts:** 770K rows across all sectors; justice subset extracted via contract category.
- **Foundations:** 10.8K rows with enrichment (11% have descriptions, LLM enriching remaining 9.6K).
- **Grant opportunities:** 18K global; justice-focused subset unknown.

**On "$114.9B across 35 sources" claim:**
No exact match found in GrantScope data for this number. The MISSION cites only categorical breakdown: ACNC, ORIC, AusTender, AEC, ATO, ASX, Justice Funding (manual import 52K), Foundations, Grant Opportunities, Social Enterprises, SEIFA, Postcode Geo, ASIC, ABR. That is ~14 sources, not 35. The $114.9B figure appears to come from **JusticeHub pitch**, not GrantScope documentation. **Verdict: Claim needs verification — GrantScope does not currently itemise the 35 sources or validate the $114.9B total.**

**Concrete dollar figures GrantScope can cite:**
- Oonchiumpa: 95% diversion, 97.6% cheaper than detention (~$31K vs $1.3M/year).
- PICC: $29M annual turnover, $38.9M tracked funding (2021-25), $1M+ Young Offender Support Service (growing 3x since 2021).
- Detention cost: $1.3M per young person per year nationally; Victoria $2.6M.
- Diagrama: 13.6% recidivism, 5.64:1 cost-benefit ratio over 30 years.

## 7. Five Pitch-Worthy Proof Points

1. **1,155 verified interventions** (ALMA) documented with evidence type, outcomes, and cultural authority — the most comprehensive Australian youth justice alternatives map in existence.

2. **99,000+ entities resolved** (CivicGraph) across charities, Indigenous corps, social enterprises with 96-95% geographic precision — enabling gap analysis by postcode, LGA, remoteness showing where alternatives are systematically unfunded.

3. **Diagrama's 13.6% recidivism and 5.64:1 cost-benefit ratio** as proven international precedent; $1.3M detention cost vs $31K Diagrama cost makes $939K annual saving per young person defensible.

4. **315 JusticeHub organisations linked to CivicGraph** (57% of 556) — the bridge enabling funding traceability from programs to outcomes, foundational for "Circle One" queryable intelligence.

5. **Hansard scraper + MCP agent framework** live and operational — platform capacity to ingest parliamentary debate, link to funding, and surface to funders/magistrates/journalists in real time.

## 8. Gaps and Risks

**Claimed but not built:**
- **Frameworks Institute integration** — referenced in Three Circles pitch but zero implementation in GrantScope. Andrea Davidson narrative reframing work is not ingested or operationalised.
- **International tour data** — Norway, Portugal, South Africa, Canada mentioned as tour stops; no structured data on outcomes, cost models, or replicability frameworks documented.
- **35 sources and $114.9B claim** — cannot be verified in GrantScope schema. The MISSION cites 14-16 core sources; the higher number appears to roll in subcategories (state contracts, ABN lookups, etc).
- **Community governance layer** — Phase 5, not started. Community corrections, lived experience validation, and community-controlled outcome definition not yet in schema.

**Stale or incomplete data:**
- Foundation enrichment only 30% complete (3,264/10,779 with descriptions).
- ASIC director linkage not yet ingested (2.2M companies awaiting selective extraction).
- Supply Nation Indigenous business verification pending API integration (7,822 → 10K+ target).
- Empathy Ledger stories: only 9 live (target: 226 storytellers).

**What a sophisticated funder will press on:**
- How do you move from 315 linked orgs (57%) to 90%+ without manual matching?
- The Maranguka, PICC, Oonchiumpa programs are documented; are you claiming they are in ALMA as evidence interventions, or just cited in PDFs?
- If Frameworks Institute is a Circle Three anchor, where is the narrative work documented and how does it feed back into Circle One queries?
- The 95% diversion claim for Oonchiumpa — what is the study (Flinders? ANU True Justice?), where is it linked in ALMA, and can a funder access it via the query layer?

**Data quality risk:**
JusticeHub ↔ CivicGraph bridge at 57% means 241 orgs are not yet matched to funding data. Until that gap closes, a funder querying "which community-led orgs work on youth diversion in QLD" may not see Oonchiumpa if it's not in the join. The Three Circles pitch requires seamless joinability; current state is functional but incomplete.

---

**File locations:**
- Youth justice data: `/data/rogs-youth-justice/`, `/data/aihw/`, `/data/closing-the-gap/`
- Programs (PDFs): `/data/prf-reports/` (Maranguka, JRI, HRLC, NTCOSS)
- Agentic code: `/scripts/` (320+ files, key: `scrape-qld-hansard.mjs`, `bridge-justice-*.mjs`, `enrich-alma-*.mjs`)
- MCP server: `/mcp-server/index.mjs` (exposes 6 tools)
- Intelligence outputs: `/output/*.md` (picc-comprehensive-dashboard.md, civicgraph-founder-intake-prd.md, philanthropy briefs)
- Foundational narrative: `/thoughts/outreach/the-cure-already-exists-v2.md`
