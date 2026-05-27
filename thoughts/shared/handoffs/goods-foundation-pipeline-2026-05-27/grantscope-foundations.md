# Goods on Country — Foundation Prospect List (from GrantScope)

**Date:** 2026-05-27
**Purpose:** Ranked foundation/philanthropic prospects to fund "Goods on Country" (social enterprise making beds + washing machines for remote/First Nations communities, NT/remote focus, community-controlled). Candidates for GHL's **Goods Supporter Journey** pipeline.

## Data source & confidence

| Item | Value |
|---|---|
| **Supabase project** | `tednluwflfhxyucgwigh` (shared ACT DB — GrantScope `.env` `SUPABASE_URL` matches the connected MCP project; **Verified**) |
| **Master catalogue** | `foundations` table — **11,010 rows**, of which **2,045** carry `indigenous` in `thematic_focus` |
| **Goods scored shortlist** | `org_project_foundations` filtered to the `goods` project (`org_profiles.slug='act'` → `org_projects.slug='goods'`) — **6 rows**, all seeded by `scripts/seed-goods-foundation-contacts.mjs` |
| **Scoring source** | `fit_score` (0-100) on the 6 shortlisted rows is **author-set in the seeder** (hardcoded), not algorithmic. For the other ~37 prospects below, fit is **inferred** by me from `thematic_focus`/`geographic_focus`/`total_giving_annual` — flagged "inferred" per row block. |
| **Contacts (named human + email)** | **NONE in this data source.** `foundations` has **no** contact/email/phone/person column (Verified via `information_schema.columns`). The 6 seeded rows carry relationship *narrative* (e.g. Snow via "Sally Grimsley-Ballard") in `notes`/`research.relationship_path` but no structured email. **No contact has been invented.** |
| **GHL push status** | The GrantScope seeder does **NOT** push to GHL. It only writes `org_project_foundations` / `_research` / `_interactions` in Supabase. A separate `org_pipeline` → foundation import path exists (the `/foundations` API `import_pipeline_candidates`), still Supabase-only. **No evidence any of these foundations have been pushed to GHL from GrantScope.** |

**`total_giving_annual` caveat:** many rows show a flat `500000.00` / `100000.00` / `25000.00` — these are **banded/estimated** ACNC-derived values, not exact. Treat as order-of-magnitude only. Land-council / mining-benefit trusts (e.g. Tiwi, Anindilyakwa, Mirarr) are **grant-makers to community AND community-controlled bodies** — they are as much potential *partners/co-owners* as funders; flagged inline.

## How to read KNOWN vs NEW
- **KNOWN** = already in GHL's Goods Supporter Journey (the 13 supplied) OR already a seeded Goods shortlist row in GrantScope.
- **NEW** = surfaced from the `foundations` catalogue, not yet in GHL and not on the Goods shortlist.

---

## TABLE A — NEW prospects (not in GHL Goods Supporter Journey, not on Goods shortlist)

Ranked by inferred fit. Fit rationale is **inferred** from catalogue fields unless noted.

| # | Foundation | Type | Giving (est.) | Geo | Themes (fit signal) | Inferred fit & rationale | Contact on record |
|---|---|---|---|---|---|---|---|
| 1 | **Northern Australian Aboriginal Charitable Trust** | trust | ~$100K band | AU-NT | community, indigenous | **Highest thematic bullseye.** Website = `remotelaundries.org.au` — this trust literally funds **remote-community laundries/washing**, Goods' exact product domain (washing machines). NT + Indigenous + the precise use-case. Likely a peer/partner/co-funder, not just a grant source. | none in data |
| 2 | **Developing East Arnhem Limited** | grantmaker | $2.0M | AU-NT | indigenous, community, education, health, rural_remote | NT-only grant-maker funding remote Arnhem economic + community infrastructure. Strong remote-NT enterprise/employment alignment. | none in data |
| 3 | **Fortescue Foundation** | corporate_foundation | $54.9M | AU-WA | indigenous, community, education, environment, youth, human_rights | Mining-corporate philanthropy, large budget, explicit Indigenous-community focus; RAP-procurement route named in Goods decision profile. WA not NT but remote-Indigenous mandate transfers. | none in data |
| 4 | **Rio Tinto Foundation** | corporate_foundation | $153.7M | AU-WA/QLD/National | indigenous, community, **employment**, **economic_development**, cultural_heritage | One of two corporates explicitly carrying `employment` + `economic_development` themes — matches Goods' on-Country manufacturing/jobs thesis. Named in decision profile's Corporate RAP route. | none in data |
| 5 | **BHP Foundation** | corporate_foundation | $195.1M | International/National/QLD/SA/WA | indigenous, community, rural_remote, human_rights, education | Largest corporate budget with `rural_remote` + indigenous; named in decision profile's Corporate RAP procurement route. Hard to access but high ceiling. | none in data |
| 6 | **Country Connect Foundation Limited** | corporate_foundation | ~$500K band | AU-NT | community, indigenous, health, youth, disability, **rural_remote, homelessness** | NT-only, remote + homelessness focus — beds/household goods map directly to remote-housing/homelessness outcomes. | none in data |
| 7 | **Uniting Church Australia Frontier Services** | religious_org | $1.9M | National (all states incl NT) | community, indigenous, **rural_remote**, health | Long-standing remote-Australia service body; rural_remote + Indigenous + health. Possible delivery partner as well as funder. | none in data |
| 8 | **Community Resources Limited** | service_delivery | $3.1M | National incl NT | employment, community, indigenous, youth, **social-enterprise** | Only catalogue hit carrying `social-enterprise` tag + Indigenous + employment + NT reach — closest thematic mirror to Goods as a social enterprise. | none in data |
| 9 | **The Trustee For Yeperenye Charitable Trust** | trust | ~$500K band | AU-NT | community, indigenous | Central Australian (Alice Springs) Indigenous community trust; remote-NT community capital. | none in data |
| 10 | **Central Aboriginal Charitable Trust** | trust | ~$500K band | AU-NT | community, indigenous | Website `centrecorpfoundation.com.au` — **Centrecorp-family trust** (Centrecorp itself is KNOWN/in GHL). Related vehicle worth tracking; may be same network — verify before separate outreach. | none in data |
| 11 | **The Trustee For Central Australian Aboriginal Charitable Trust** | trust | ~$500K band | AU-NT | community, indigenous | Same Centrecorp network (`centrecorpfoundation.com.au`). Likely duplicate/related to #10 + the KNOWN Centrecorp. Dedup before outreach. | none in data |
| 12 | **Mjd Foundation Limited** | corporate_foundation | ~$500K band | AU-NT/QLD | health, indigenous | Machado-Joseph Disease Foundation — Groote Eylandt / remote-NT Indigenous health body. Beds/healthy-homes angle (environmental health). | none in data |
| 13 | **Redtails Pinktails Right Tracks Foundation** | corporate_foundation | ~$500K band | AU-NT | health, community, indigenous | Central Australian Indigenous health/community foundation (AFL-linked). NT remote community fit. | none in data |
| 14 | **Mirarr Charitable Trust** | trust | ~$500K band | AU-NT | arts, education, health, community, indigenous | Kakadu/Jabiru Mirarr traditional-owner trust. Community-controlled; partner-or-funder. | none in data |
| 15 | **Tiwi Land Council** | grantmaker | $1.57M | AU-NT | indigenous, community, arts, environment | Tiwi Islands community-controlled grant-maker. Remote-island household-goods demand + community ownership thesis. Partner-or-funder. | none in data |
| 16 | **Karrkad-Kanjdji Limited** | grantmaker | $1.45M | AU-NT (Arnhem Land) | environment, indigenous, education, community, **employment** | Arnhem Land Indigenous-led grant-maker with employment focus; remote on-Country jobs alignment. | none in data |
| 17 | **The Trustee For Anindilyakwa Mining Trust** | trust | ~$500K band | AU-NT | community, indigenous | Groote Eylandt mining-benefit trust — community-controlled remote capital. Partner-or-funder. | none in data |
| 18 | **The Goodman Foundation** | corporate_foundation | ~$500K band | NSW/NT/QLD/VIC | community, indigenous | National corporate foundation funding community + Indigenous; logistics-parent (Goodman) could align with manufacturing/distribution. | none in data |
| 19 | **Moriarty Foundation** | corporate_foundation | ~$500K band | NSW/NT/QLD | community, indigenous | Indigenous-led (John Moriarty) foundation, NT reach, community focus. | none in data |
| 20 | **Bupa Foundation (Australia) Limited** | corporate_foundation | ~$500K band | NSW/NT/VIC | health, indigenous | Health-corporate foundation with NT + Indigenous; beds-as-preventive-health (environmental health) framing. | none in data |
| 21 | **Territory Natural Resource Management Inc** | environmental | $2.4M | AU-NT | environment, indigenous, community, rural_remote | NT-wide remote-community + Indigenous grant body; environment-led but community/remote reach. Weaker product fit (env focus). | none in data |
| 22 | **EON Aboriginal Corporation (EON Foundation)** | (n/a) | ~$100K band | AU-NT/WA | health, community, indigenous | Remote-community Indigenous health/nutrition body (healthy-homes adjacent). | none in data |
| 23 | **The Walkatjara Trust** | trust | ~$500K band | AU-NT | arts, community, indigenous | Uluru/Mutitjulu community trust. Community-controlled remote capital; arts-led. | none in data |
| 24 | **The Trustee For McArthur River Mine Community Benefits Trust** | trust | ~$100K band | AU-NT | arts, health, environment, community, indigenous | Borroloola-region mining-benefit trust; remote-NT community capital. Partner-or-funder. | none in data |
| 25 | **The Eddie Betts Foundation** | corporate_foundation | ~$100K band | NT/QLD/SA/VIC/WA | education, community, indigenous | Indigenous-athlete-led; youth/community; NT reach. Smaller, story-aligned. | none in data |
| 26 | **The Ininti Store Trust** | trust | ~$500K band | AU-NT | arts, community, indigenous | Uluru community store trust — community-controlled remote retail/economic body. Partner-or-funder. | none in data |
| 27 | **Aboriginal Sea Company Operations Trust** | trust | ~$100K band | AU-NT | community, indigenous | NT Indigenous economic-development (sea-country enterprise) trust; enterprise/ownership thesis. | none in data |
| 28 | **The Trustee For Jawoyn Aboriginal Charitable Trust No 4** | trust | ~$100K band | AU-NT | arts, environment, indigenous, community | Katherine-region Jawoyn community-controlled trust. Partner-or-funder. | none in data |
| 29 | **The Saville Foundation Ltd** | corporate_foundation | ~$100K band | AU-NT | education, community, indigenous | NT-only education/community/Indigenous foundation. | none in data |
| 30 | **The Regional & First Nations Community Foundation** | corporate_foundation | unknown | ACT/NSW/NT/QLD/SA/VIC | education, health, community, indigenous | First-Nations community foundation w/ NT reach; community-led giving route. Giving figure unknown. | none in data |
| 31 | **Strong Brother Strong Sister Foundation** | corporate_foundation | ~$25K band | NT/VIC | arts, community, indigenous | Indigenous youth/community; small budget. | none in data |
| 32 | **Miriam Rose Foundation** | corporate_foundation | ~$25K band | AU-NT | education, health, community, indigenous | Daly River (NT) Indigenous-led foundation; small but deeply remote-NT. | none in data |
| 33 | **Namatjira Legacy Trust** | trust | ~$25K band | AU-NT | arts, education, indigenous, community | Central Australian Indigenous legacy trust; small, arts-led. | none in data |
| 34 | **GEBIE Investment Charitable Trust** | trust | ~$25K band | AU-NT | arts, education, health, community, indigenous | Groote Eylandt (Angurugu) community trust. Community-controlled. | none in data |
| 35 | **Ninti One Foundation Limited** | corporate_foundation | ~$25K band | AU-NT | education, health, community, indigenous | Remote-Australia Indigenous research/training body (CRC-CI lineage). | none in data |
| 36 | **The Ian Potter Foundation** | corporate_foundation | $38M | AU-National | arts, indigenous, health, education, community, research | Major national foundation; Indigenous among themes. Broad, competitive, no NT-specific signal but large ceiling. **Lower remote-fit.** | none in data |
| 37 | **Kinghorn Foundation** | private_ancillary_fund | $31M | National/Intl | indigenous, health, education, community | Large PAF; Indigenous among themes; national. Broad, low remote-specificity. | none in data |

**Deferred / flagged, not ranked as direct asks:**
- **Yajilarra Trust** ($214M) and **Minderoo Pictures** ($210M) are both **Forrest-family / Minderoo group** vehicles — Minderoo is already on the Goods shortlist (#3, KNOWN below). Route through the existing Minderoo relationship, not as separate cold prospects.
- **Charles Darwin University** ($9.1M, NT, indigenous/research) and **Outback Stores Pty Ltd** ($1.8M, NT, indigenous/employment) scored high on the heuristic but are a **university** and a **remote-retail operator** respectively — better framed as **delivery/distribution partners** (Outback Stores = remote-community retail network = a distribution channel for Goods) than as grant funders. Worth a partner conversation, not a Supporter-Journey funder slot.

---

## TABLE B — KNOWN prospects (already in GHL Goods Supporter Journey OR already on Goods shortlist) — with fresh GrantScope intel

| Foundation | KNOWN via | GrantScope fit_score | Stage / engagement | Fresh intel from GrantScope |
|---|---|---|---|---|
| **The Trustee For The Snow Foundation** | GHL list **+** Goods shortlist | **97** | in_conversation / proposal | Anchor funder, ~$193,785 to date, Round 4 proposal live. Relationship via **Sally Grimsley-Ballard** (narrative only, no email in data). Tennant Creek deployment proof. Next: blended-capital framing alongside QBE + SEFA. |
| **QBE Foundation** | Goods shortlist (NEW vs GHL-13) | **93** | in_conversation / proposal | In QBE **Catalysing Impact** cohort; working toward an **up-to-$200K match grant**. Active program relationship via Social Impact Hub. **NEW to the GHL Supporter Journey** — add it. |
| **Minderoo Foundation** | Goods shortlist (NEW vs GHL-13) | **91** | priority / approached | Warm catalytic/recoverable-grant target (~$200K). Missing: locked decision-maker. Note Yajilarra Trust + Minderoo Pictures are same group. **NEW to GHL Supporter Journey** — add it. |
| **Paul Ramsay Foundation Limited** | Goods shortlist (NEW vs GHL-13) | **89** | approach_now / ready_to_approach | $183M national funder. Goods-specific systems-change/procurement prospect already framed in ACT pipeline. Needs a named intro. **NEW to GHL Supporter Journey** — add it. |
| **Australian Communities Foundation** | Goods shortlist (NEW vs GHL-13) | **84** | approach_now / ready_to_approach | Pooled-giving/donor-collaborative route. Needs Goods-specific donor pathway. **NEW to GHL Supporter Journey** — add it. |
| **Nova Peris Foundation Limited** | Goods shortlist (NEW vs GHL-13) | **76** | saved / researching | NT-based Indigenous economic-empowerment; route possibly via PICC enterprise. **NEW to GHL Supporter Journey** — add it. |
| **Vincent Fairfax Family Foundation (VFFF)** | GHL list | — (not on Goods shortlist) | not shortlisted | In catalogue as **Vincent Fairfax Family Trust**, $15M, national/NSW. Not yet scored for Goods — consider adding to the GrantScope Goods shortlist. |
| **FRRR (Foundation for Rural & Regional Renewal)** | GHL list | — | not shortlisted | Catalogue: **Foundation For Rural And Regional Renewal**, ~$500K band, NSW/VIC. Rural-remote grant intermediary. |
| **AMP Foundation** | GHL list | — | not shortlisted | Catalogue: **AMP Foundation Charitable Trust**, ~$500K band, national. |
| **The Funding Network** | GHL list | — | not shortlisted | Catalogue: **The Funding Network Australia Limited**, $1.5M, national — live-crowdfunding/grant intermediary. |
| **Centrecorp Foundation** | GHL list | — | not shortlisted | Catalogue: **Centrecorp Foundation**, ~$100K band, national. NB two related Central-Australian trusts (#10, #11 above) share the `centrecorpfoundation.com.au` domain — dedup. |
| **Mala'la Health Service** | GHL list | not in foundations catalogue | — | No `foundations` row found (it's a Maningrida ACCHO, not a philanthropic funder — sits in the buyer/partner side, not foundation prospects). |
| **Rotary Eclub Outback Australia** | GHL list | not in foundations catalogue | — | No `foundations` row matched. Community/service-club funder; not in this catalogue. |
| **Red Dust** | GHL list | not in foundations catalogue | — | No clear `foundations` row matched (Red Dust Role Models = remote-health NFP). |
| **QIC** | GHL list | not in foundations catalogue | — | No `foundations` row matched (QIC = Queensland Investment Corp; corporate, not a charity-registered foundation). |
| **Julalikari Council** | GHL list | not in foundations catalogue | — | No `foundations` row matched (Tennant Creek Aboriginal corporation — partner/community body, not a foundation). |
| **Our Community Shed** | GHL list | not in foundations catalogue | — | No `foundations` row matched. |
| **Homeland School** | GHL list | not in foundations catalogue | — | No `foundations` row matched — Homeland Schools Company is a **buyer** (65-bed pathway in Goods decision profile), not a foundation funder. |

---

## Gaps & caveats (explicit)

1. **No contact data exists in this source.** `foundations` has no email/phone/person columns. Any named human you want must come from elsewhere (GHL, web research, or the Goods wiki narrative). Snow's "Sally Grimsley-Ballard" is the only named relationship and it's free-text in `notes`, no email.
2. **`fit_score` is hardcoded** in `seed-goods-foundation-contacts.mjs` for the 6 shortlisted rows — author judgment, not algorithmic. All Table-A fit assessments are **inferred by me** from catalogue `thematic_focus`/`geographic_focus`/`total_giving_annual`.
3. **`total_giving_annual` is banded/estimated** (many flat $500K/$100K/$25K values from ACNC processing). Do not quote as exact figures.
4. **Land-council & mining-benefit trusts** (Tiwi, Anindilyakwa, Mirarr, Walkatjara, Ininti, Jawoyn, McArthur River, GEBIE) are **community-controlled** — they fit Goods' ownership-transfer thesis as **partners/co-owners** as much as funders. Frame accordingly.
5. **Some Table-A rows are likely the same network** (Centrecorp #10/#11 + KNOWN Centrecorp; Minderoo group Yajilarra/Pictures). Dedup before separate outreach.
6. **No GHL push from GrantScope.** Nothing here has been pushed to GHL by the seeder/API — all writes are Supabase-only (`org_project_foundations`).
