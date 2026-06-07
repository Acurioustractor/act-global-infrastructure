# Goods on Country — Commercial BUYER pipeline candidates

**Generated:** 2026-05-27 · read-only research. Only this file written. NO writes to GHL / Gmail / Notion / Xero.
**Scope:** commercial demand for beds + washing machines in remote/First Nations communities — councils, ACCHOs/health services, land councils, remote stores, Aboriginal corporations.

> **No name, email, or phone below was invented.** "none found" = no real contact located in any source consulted. Scores are GrantScope-author-set unless marked **inferred**.

---

## Buyer source + dedup baseline

**GrantScope buyer scoring is TWO tables in the shared ACT DB (`tednluwflfhxyucgwigh`, verified via `get_project_url`):**

1. **`goods_communities`** — 1,542 communities, 1,537 with `demand_beds > 0`. This is what `grantscope/scripts/push-ghl-targets.mjs` scores. The scoring formula (`scoreCommunity()`):
   `score = (beds×$850 + washers×$1,200 + fridges×$1,500) × remoteness_mult × entity_mult × funding_signal`
   - remoteness: Very Remote ×2.0 / Remote ×1.5 / Outer Regional ×1.0 / else ×0.8
   - entity_mult: `min(2.0, 1 + community_controlled_org_count×0.1)`
   - funding_signal: ×1.3 if `total_govt_contract_value > 0` else ×1.0
   - tier: demand $ > $500K = hot, > $100K = warm, else nurture
   - **The 61 `"<COMMUNITY> — Goods Demand $XK"` rows in the Demand Register are this script's output** — it upserts a *community* as a GHL contact with a synthetic `<slug>@goods.civicgraph.io` email. These are signal placeholders, NOT buyers, exactly as the operating model says.

2. **`goods_procurement_entities`** — 4,553 rows, the *named* buyer orgs mapped to communities (`buyer_role`, `fit_score`, `govt_contract_value`, `estimated_annual_spend`, `is_community_controlled`). This is what the **grantscope `/api/goods/buyer/push-ghl` route** (`pushGoodsBuyerToGHL`) and **`sync-ghl-goods-buyers.mjs`** operate on — a named entity graduates to the **Buyer Pipeline** with `ghl_stage_name='Outreach Queued'`. Only **26 of 4,553** have a `ghl_opportunity_id`; **18 are stores** (the named "… Community Store Aboriginal Corporation" rows in the Demand Register), 5 council, 2 health, 1 housing.
   - `buyer_role` distribution: community_org 2,392 · council 925 · health_service 419 · education 375 · other 220 · government 115 · housing_provider 51 · store 23 · land_council 19 · aged_care 12.
   - **`fit_score` is sparse**: only **15 distinct named entities score ≥ 60**; the 50-59 band adds just 2 (both QLD regional councils). Everything else is sub-50 or AusTender contract noise (defence: Sikorsky, QinetiQ, maritime — `buyer_role='other'`, ignore).

3. **Goods v2 `outreach-targets.ts`** (475-line hand-curated list, "synced from grantscope intelligence Mar 16 2026") is the *richer* buyer source — it has named humans + relationship status the auto-scored DB lacks. v2's `/api/admin/targets/push-outreach` maps `category` → `buyer/capital/partner` and pushes via `ghl.createStrategicTargetContact`. Its `procurement_buyer` + `health_buyer` categories are the warm commercial buyers (Centrebuild, WHSAC/Groote, Outback Stores, ALPA, Tangentyere, West Arnhem council, Anyinginyi, Miwatj, Purple House). **These two systems are NOT cross-synced** — the v2 curated buyers mostly are NOT in the GrantScope `goods_procurement_entities` scoring.

**Dedup baseline (live GHL, location `agzsSZWgovjwgpcoASWG`, fetched this session):**
- **Demand Register (`UQsrmuqzxMSdCTklxEcG`): 86** — ~25 named per-community store/health/council Aboriginal Corporations + ~61 `"<COMMUNITY> — Goods Demand $XK"` community placeholders.
- **Buyer Pipeline (`FjMyJM3YzWQFmKqR9fur`): 1** — `Northern Land Council — GAPUWIYAK` (Matthew Ryan). **NLC is therefore already worked — excluded from new prospects below.**

---

## Table 1 — NEW commercial-buyer prospects (deduped vs the 86 + the 1)

Ranked by GrantScope `fit_score` then govt-contract value. All are NOT in the Demand Register and NOT in the Buyer Pipeline (one NLC row excepted — already in BP). **No real contact is on record in `goods_procurement_entities` for any of these (`contact_surface` is null across the board) — contacts shown are cross-referenced from the warm Gmail mine / v2 curated list where a real one exists; otherwise "none found — needs sourcing".**

| # | Entity | Type / buyer_role | Fit (author-set) | Geography | Govt contract signal | Named contact on record | Proposed pipeline + reasoning |
|---|---|---|---|---|---|---|---|
| 1 | **Canteen Creek Store Charitable Trust** | remote store | 86 | Canteen Creek, NT (Very Remote) | $0 | none found | **Demand Register** — top auto-score but no human, no live thread. Signal only until a contact + reason exist. |
| 2 | **The Arnhem Land Progress Aboriginal Corporation (ALPA)** | store network (CC) | 85 | NT (Arnhem Land, multi-store) | $15.5M | none found in DB; v2 lists as `procurement_buyer` prospect, no email | **Demand Register → fast-track** — anchor distribution channel (see Table 3). Largest Aboriginal-owned store network. Graduate to Buyer Pipeline the moment a named buyer/procurement lead is sourced. |
| 3 | **Tangentyere Council Aboriginal Corporation** | council (CC) | 85 | Alice Springs town camps, NT | $3.11M | none found in DB; v2 `procurement_buyer` prospect, no email | **Demand Register → fast-track** — town-camp housing/services buyer, in v2 curated list. Needs named contact. |
| 4 | **Outback Stores Pty Ltd** | remote store operator | 85 | NT/QLD/WA/SA (national remote) | $92K | none found in DB; v2 `procurement_buyer` prospect, no email | **Demand Register → fast-track** — key distribution-channel anchor (Table 3). |
| 5 | **Miwatj Health Aboriginal Corporation** | ACCHO (CC) | 85 | Galiwin'ku / East Arnhem, NT | $48K | **Madelyn Hay** `madelyn.hay@miwatj.com.au` (warm — "beds and washing machines east arnhem", to Nov 2025); v2 lists "Jessica Allardyce" | **BUYER PIPELINE** — named human + live East Arnhem beds/washers thread = graduation rule met. RHD-prevention fleet across 8 clinics (v2). Strongest scored-buyer + warm-contact overlap. |
| 6 | **Aputula Housing Assoc Inc** | housing provider | 78 | Finke, NT (Very Remote) | $0 | none found | **Demand Register** — housing buyer, no contact/thread. (NB partial-dup: "Aputula Housing Aboriginal Corporation — FINKE" already a DR store row; confirm same entity before any push.) |
| 7 | **Ntaria School Council Inc** | council | 78 | Hermannsburg, NT (Very Remote) | $0 | none found | **Demand Register** — signal only. |
| 8 | **Central Land Council** | land council (CC) | 74 | NT (271 communities) | $20.8M | none found | **Demand Register** — peak land council, huge footprint, but a land council is a representative body, not a direct bed/washer buyer; treat as channel/intro until a named procurement reason appears. |
| 9 | **Anindilyakwa Housing Aboriginal Corporation** | housing provider (CC) | 74 | Groote Eylandt, NT (17 communities) | $3.10M | none found in DB — but see Groote/WHSAC v2 demand (500 mattresses + 300 washers) | **Demand Register → high-priority** — Groote is the flagship demand signal in v2 (`whsac-groote`, Simone Grimmond). Housing arm is a real buyer; pair with WHSAC + Groote Trust. Graduate once Simone Grimmond contact is confirmed. |
| 10 | **Tiwi Land Council** | land council (CC) | 74 | Tiwi Islands, NT (9 communities) | $3.02M | none found | **Demand Register** — channel/intro body. |
| 11 | **Aboriginal Medical Services Alliance NT (AMSANT)** | ACCHO peak body (CC) | 74 | NT (338 communities) | $2.12M | none found | **Demand Register** — peak body / sector door-opener, not a per-community buyer; use for warm intros to member ACCHOs. |
| 12 | **Anindilyakwa Land Council** | land council (CC) | 74 | Groote Eylandt, NT | $270K | none found | **Demand Register** — pair with Groote cluster (#9). |
| 13 | **Central Desert Regional (Shire) Council** | regional council | 66 | NT (271 communities, Very Remote) | $16.85M | none found | **Demand Register → high-priority** — large remote-council procurement budget, multiple communities. Classic commercial buyer; needs a named procurement/assets contact. |
| 14 | **Tiwi Islands Regional Council** | regional council | 66 | Tiwi Islands, NT | $6.72M | none found | **Demand Register** — remote council, multi-community. Needs contact. |
| 15 | **Torres Strait Island Regional Council** | regional council | 50 | QLD (Torres Strait, 9 islands) | $5.54M (spend $833K) | none found | **Demand Register → high-priority** — only material QLD remote-council buyer in the scoring; ~$833K estimated annual spend. Needs contact. |
| 16 | **Northern Peninsula Area Regional Council** | regional council | 50 | Cape York / NPA, QLD | $1.74M (spend $413K) | none found | **Demand Register** — QLD remote council, real spend. Needs contact. |

**Reality check on count:** GrantScope's *scored named-buyer universe* is far thinner than the 4,553 row total suggests — only **16 distinct named entities** clear a fit ≥ 50 and survive noise-filtering. To reach "~25 NEW prospects" I add the **v2 curated `procurement_buyer`/`health_buyer` targets that are NOT in GHL and NOT scored in `goods_procurement_entities`** — these are real, warm, and named, just living in `outreach-targets.ts` instead of the DB:

| # | Entity (from v2 curated list) | Type | Signal | Named contact | Proposed pipeline + reasoning |
|---|---|---|---|---|---|
| 17 | **Centrebuild Pty Ltd** | procurement buyer | "109 beds sold; 107-bed Utopia pathway active" | none named in v2 | **BUYER PIPELINE** — strongest *commercial* signal in the whole set (already buying). Graduation rule met on "reason to talk"; source the buyer contact. |
| 18 | **WHSAC (Groote Archipelago)** | procurement buyer | "500 mattresses + 300 washing machines (~$1.7M)" | **Simone Grimmond** | **BUYER PIPELINE** — named human + the single largest stated order. Pair with #9/#12 Groote cluster. |
| 19 | **Tangentyere Council** *(v2 dup of #3)* | procurement buyer | town-camp households | none | — (same entity as #3; merge) |
| 20 | **Purple House** | health buyer | "dialysis patients need quality beds" | none named | **Demand Register** — real buyer thesis, no contact yet. |
| 21 | **West Arnhem Regional Council** | procurement buyer | "multiple remote communities" | none named | **Demand Register** — remote council buyer; **NOT in GrantScope scoring (gap)**. |
| 22 | **NPY Women's Council** | community buyer | "always looking for beds" (3 jurisdictions) | **Angela Lynch** | **BUYER PIPELINE** — named human + standing demand; cross-border NT/SA/WA. (Verify Angela Lynch still current.) |
| 23 | **NDIS Assistive Technology pathway** | govt procurement channel | recurring procurement | none (program) | **Demand Register** — channel research, not an org. |
| 24 | **Anyinginyi Health Aboriginal Corp** | health buyer | "5 washers deployed, quote for 4 more Feb 2026" | **Tony Miles** `tony.miles@anyinginyi.com.au` | **see Table 2** — already buying washers commercially (warm). Classification nuance below. |
| 25 | **QIC** | corporate buyer | "50-bed staff-build NAIDOC interest" | **Justin Welfare** `jwelfare@qic.com` et al | **see Table 2** — corporate procurement/CSR buyer, warm. |

---

## Table 2 — Warm Gmail-org classification (the operating-model crux)

Decision per the rules: **Buyer Pipeline** = commercial, named human, reason to talk · **Demand Register** = signal · **delivery partner** = grant-funded delivery (NOT a buyer).

| Org | Named human(s) on record | Verdict | Why |
|---|---|---|---|
| **PICC (Palm Island Community Company)** | Narelle Gleeson-Henaway `Narelle@picc.com.au`; Mislam Sam `mislams@picc.com.au` | **delivery partner** (with a commercial tail) | Backing-the-Future / FRRR-funded delivery site — beds delivered TO Palm Island via grant. BUT v2 records "141 beds deployed + 40-bed order + 'we'll buy the facility'" → there IS a genuine commercial buyer signal emerging. **Classify as delivery partner now; flag the 40-bed re-order + facility interest as the trigger to spin up a *separate* Buyer-Pipeline record** when the order is commercial (not grant-funded). |
| **Oonchiumpa (Kristy Bloomfield, Tanya Turner)** | Kristy `kristy.bloomfield@oonchiumpa.com.au`; Tanya `tanya.turner@oonchiumpa.com.au` | **delivery partner** | Co-applicant on the REAL Innovation Fund Goods grant (Utopia/Sandover). Aboriginal-owned community-led design partner / lead applicant — delivers WITH us via grant, does not pay its own way. Not a buyer. |
| **Anyinginyi Health (Tony Miles)** | Tony Miles `tony.miles@anyinginyi.com.au` | **BUYER PIPELINE** (lean) | The clearest *commercial* ACCHO buyer: "5 washers deployed, quote for 4 more sent Feb 2026" (v2) — paying for washers. Named human + live quote = graduation rule met. (Also appears on the Rotary Global Grant route — that's a funder thread, keep separate.) |
| **Miwatj Health (Madelyn Hay)** | Madelyn Hay `madelyn.hay@miwatj.com.au` | **BUYER PIPELINE** | Named human + live "beds and washing machines east arnhem" thread + GrantScope fit 85. RHD-prevention fleet across 8 clinics. (= Table 1 #5.) |
| **NT Govt (Amy Elson)** | Amy Elson `amy.elson@nt.gov.au` (Gmail); v2 lists Anna Philip `anna.philip2@nt.gov.au` | **Demand Register** (funder/govt-channel, not commercial buyer) | East-Arnhem beds/washers coordination + state-govt backing. Government relationship is a funding/endorsement channel, not a self-paying commercial buyer. Keep as signal/relationship; route grant asks to the funder pipeline. |
| **Bawinanga Aboriginal Corp (Alice Benchoam, Shannon Inder)** | Alice `gm@bawinanga.org.au`; Shannon `shannon.inder@bawinanga.org.au` | **delivery partner** | BAC laundromat launch/monitoring — grant-supported delivery/distribution model (v2 `distribution_partner` prospect). Not paying its own way for beds/washers. Watch for a commercial distribution deal as the trigger to reclassify. |
| **Wilya Janta (Simon Quilty)** | Simon Quilty `sq@wilyajanta.org`; Norman Frank Jupurrurla | **delivery partner / advisor** | Housing-health research + demonstration home, active bed testing, Tennant Creek anchor. Advocacy/advisor + delivery, explicitly "not a funder" and not a commercial buyer. |
| **Outback Stores** | none found | **Demand Register → fast-track** | Distribution-channel anchor (Table 1 #4, Table 3). Real commercial-channel potential but no named human yet → can't graduate to Buyer Pipeline. |
| **Charles Darwin University (CDU)** | none found in mine | **Demand Register** (research/partner, weak buyer signal) | Surfaced as ecosystem; no commercial bed/washer buying signal or named buyer contact located. Hold as signal. |

**Net of the named warm orgs: 3 are true Buyer-Pipeline (Anyinginyi, Miwatj, + emerging PICC-commercial), the rest are delivery partners / govt-funding channels / advisors.** This matches the operating model's prediction that PICC/Oonchiumpa/Bawinanga are grant-delivery, not buyers.

---

## Table 3 — Anchor-gap status (Outback Stores, Centrecorp, Miwatj, ALPA, Tangentyere)

| Anchor entity | In `goods_procurement_entities` (scored)? | In GHL? | Status / gap |
|---|---|---|---|
| **Outback Stores Pty Ltd** | **Yes** — fit 85, store, $92K govt | No | **Scored, not in GHL.** Gap = no named contact. Add to Demand Register, fast-track to Buyer Pipeline on contact. National remote-retail distribution channel. |
| **Centrecorp Foundation** | **No** — not found as a procurement entity (it's a funder/Aboriginal-trust, lives in v2 `aboriginal_trust` + Gmail funder mine: Randle Walker `randle@centrecorp.com.au`) | No (funder side) | **Anchor-gap = mis-bucketed, by design.** Centrecorp is a *capital* anchor (Tennant Creek bed funding, $123K paid / $420K commitment), not a commercial buyer. Belongs in the FUNDER/foundation pipeline, NOT the Buyer Pipeline. Its commercial twin is **Centrebuild Pty Ltd** (v2, 109 beds sold) — that's the buyer. |
| **Miwatj Health** | **Yes** — fit 85, health_service, CC | No | **Scored + warm contact (Madelyn Hay).** Ready to graduate to Buyer Pipeline now (Table 1 #5 / Table 2). |
| **ALPA (Arnhem Land Progress)** | **Yes** — fit 85, store, $15.5M govt, CC | No | **Scored, not in GHL.** Gap = no named contact. Highest-value Aboriginal-owned store network; key distribution anchor. |
| **Tangentyere Council** | **Yes** — fit 85, council, $3.11M, CC | No | **Scored, not in GHL.** Gap = no named contact. Also in v2 curated list. |

**Other anchors the operating model implies but GrantScope is MISSING entirely (scoring gap — flag for backfill):** the marquee remote-council buyers **West Daly, Roper Gulf, MacDonnell, East Arnhem, Barkly, Victoria Daly Regional Councils** and big ACCHOs **Sunrise Health, Katherine West Health, Central Australian Aboriginal Congress, Laynhapuy Homelands, Mala'la Health** are **not present as scored procurement entities** (only AMSANT the peak body is). These are textbook commercial bed/washer buyers and should be added to `goods_procurement_entities` so they get scored rather than relying on the per-community store-corp rows.

---

## Open items / gaps
- **No contact data in `goods_procurement_entities`** — every scored buyer has `contact_surface = null`. The buyer scoring identifies *which orgs* but carries *zero humans*; contacts only exist in the v2 curated list + Gmail mine. Closing the named-human gap is the blocker on graduating scored buyers to the Buyer Pipeline.
- **GrantScope vs v2 are not synced** — the warm commercial buyers (Centrebuild, WHSAC, Anyinginyi, Purple House, West Arnhem, NPY) live only in `outreach-targets.ts`; the scored buyers (ALPA, Tangentyere, Central Desert, Tiwi, Torres Strait) live only in the DB. A reconcile pass would de-risk double-entry.
- **Source not reached:** none — Supabase, both GHL pipelines, both scripts, the v2 route + data files, and both Gmail handoffs were all read. The only data *absence* is genuine (null contacts in the scoring table), not an access failure.
