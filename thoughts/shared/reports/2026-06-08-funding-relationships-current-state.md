---
title: ACT Funding-Relationship Map — Current State
status: Draft
date: 2026-06-08
type: report
summary: Every philanthropist, procurement buyer, and delivery partner ACT CURRENTLY has — the warm base, mapped per lane with dollar figures and confidence labels, then a warm→cold ladder and adjacency-search recipes Ben can run to find adherent options on top of the warm base.
relates_to: wiki/concepts/act-business-architecture.md · wiki/concepts/ecosystem-value-exchange.md · scripts/foundation-shortlist.mjs
provenance: 2026-06-08-funding-relationships-current-state.md.provenance.md
---

# ACT Funding-Relationship Map — Current State

> **The warm base leads.** This is who ACT *already has* — funders who actually pay us, the handful of paying customers, and the delivery/community partners. The pipelines (warm→cold) hang off this base; the adjacency recipes at the end are how Ben grows it. Every dollar carries a confidence label per `~/.claude/rules/verification.md` (`Verified` = queried the source directly · `Inferred` = derived · `Unverified` = no second source).
>
> All Xero figures are from the shared Supabase Xero mirror (project `tednluwflfhxyucgwigh`), cash basis, voided/deleted excluded, filtered `type='ACCREC' status='PAID'` (the `amount_due=0` filter inflates — Centrecorp reads $832k there vs the real $123k). FY26 window = 1 Jul 2025 – 30 Jun 2026.

---

## Lane 1 — Philanthropy (who funds us now + in pipeline)

### 1a. WARM — funders who have actually paid ACT (the base)

The authoritative "who actually pays us" list. **FY26 ACCREC PAID = $1,307,339.40 across 46 invoices** (`Verified`, Xero mirror). The funder/grant-maker subset, by FY26 cash received:

| Funder | FY26 paid | Invoices | Latest | All-time paid | Conf |
|---|---|---|---|---|---|
| The Snow Foundation | $247,544.88 | 3 | 2026-05-22 | **$402,929.79** | `Verified` |
| Centrecorp Foundation | $123,332.00 | 2 | 2025-11-26 | $123,332.00 | `Verified` |
| Vincent Fairfax Family Foundation (VFFF) | $50,000.00 | 1 | 2025-07-24 | — | `Verified` |
| Regional Arts Australia | $33,000.00 | 2 | 2025-12-16 | $33,000 (+$16.5k AUTHORISED owed) | `Verified` |
| Social Impact Hub Foundation | $26,730.00 | 2 | 2025-11-18 | $26,730 | `Verified` |
| Dusseldorp Forum | $16,500.00 | 1 | 2025-12-11 | $16,500 | `Verified` |
| Red Dust Role Models Ltd | $15,950.00 | 1 | 2025-07-30 | $15,950 | `Verified` |
| Brisbane Powerhouse Foundation | $7,150.00 | 1 | 2025-09-25 | $7,150 | `Verified` |
| StreetSmart Australia | $5,500.00 | 1 | 2025-08-12 | $9,400 | `Verified` |
| Paul Ramsay Foundation | $3,069.00 | 1 | 2025-07-05 | $7,469 | `Verified` |
| The John Villiers Trust | $1,200.00 | 1 | 2026-05-03 | $1,200 | `Verified` |

Plus two foundations in the all-time `act_funded` signal set with **no FY26 cash** (paid pre-window): Westpac Scholars Trust ($3,080 all-time), and the Snow/Centrecorp/etc. above. Total of the 10 `act_funded` signal foundations all-time = **$630,790.79** (`Verified`, `foundation_relationship_signals` metadata, sourced `act://xero/invoices`).

> Snow reconciliation: signal table = $402,929.79 all-time (7 invoices); FY26 window = $247,544.88 (3 invoices); the ~$155k difference is pre-FY26 invoices. Both figures `Verified`; cite the window you mean.

### 1b. WARM — the grant-tranche acquittal ledger (Notion, no DB table)

Searched `information_schema` for `%tranche%` → **no table** (`Verified` absence). The per-tranche Xero-sourced acquittal ledger lives in **Notion** (`grantTranchesDb` = `f8204bd0-abcd-42e6-b349-c33d6ac80ade`, data source `61a20e42-…`). Per the money-state memory it holds **11 tranches / 4 funders = $592,211.79** (Snow · Centrecorp · VFFF · Red Dust). `Inferred` from memory note (not re-queried here — Notion is outside this report's DB-only scope); reconcile against §1a before quoting. Filter trap recorded: status `PAID` not `amount_due=0`.

### 1c. PIPELINE — funders ACT is working but hasn't been paid by

Two distinct sources — **keep them apart**, they mean different things:

**(i) Curated relationship pipeline (real, owned by ACT)** — GHL `ghl_opportunities`, the human-managed pipelines. These are genuine relationships. `Verified` (DB mirror with live money fields):

- **WON (closed) = 28 opportunities, $1,506,431.25** total. Top wins: PICC/Centrecorp/Snow Goods buyer orders, Fairfax Goods Grant ($50k), BG Fit – Qld Gives ($28k), Mounty Yarns ($25k+$15k), MELT ($7.15k).
- **OPEN curated (non-"Grants" pipelines):** Goods Supporter Journey 44 opps / $5.28M · Goods Buyer Pipeline 39 / $2.60M · A Curious Tractor 25 / $1.11M · Goods Demand Register 158 / $16.37M. Headline open asks: REAL Innovation Fund (DEWR) **$2.0M** (Goods, "Ask made"), WHSAC Groote Archipelago **$1.7M** (Goods buyer). Dollar values `Verified` as entered in GHL; probability/stage discipline is `Unverified` (entered values, not weighted).

**(ii) Auto-discovered "Grants" pipeline — NOT relationships.** The GHL "Grants" pipeline (268 opps, $272.3M) and the 36 `act_pipeline` signal rows (mostly stage `discovered`) are **GrantScope auto-discovery** — ARC/research grants scraped by topic match (generic abstracts, project code `WATCH`). Treat as a *prospect queue*, not warm relationships. The 36 `act_pipeline` foundations (e.g. Myer Foundation, Cannon-Brookes Foundation, Goodman Foundation, Judith Neilson Head Trust, Ininti Store Trust, QCoal, Women and Change) are *names to research*, strength 10. `Verified` they are auto-derived (source_url `act://ghl/opportunity/…`, stage `discovered`).

**In-flight receivables (issued, unpaid)** — ACCREC `AUTHORISED`, `Verified`: Rotary Eclub Outback Australia $82,500 (dated 2025-04-10 — stale, chase) · Homeland School Company $44,000 (2026-05-18) · Regional Arts Australia $16,500 · Brodie Germaine Fitness Aboriginal Corp $15,400 · Aleisha J Keating $5,850.

---

## Lane 2 — Procurement (current footprint)

### 2a. Federal procurement footprint: NONE

Searched **806,713** AusTender contract rows (`austender_contracts`) for ACT's three entity ABNs — **A Curious Tractor Pty Ltd `36 697 347 676`**, **The Butterfly Movement Ltd `22 155 132 684`**, **NJ Marchesi sole trader `21 591 780 066`** — and by supplier name (`%curious tractor%`, `%butterfly movement%`, `%marchesi%`). **Zero matches** (`Verified`).

> **Finding: ACT has no current federal procurement footprint.** Every government dollar to date has come through grants and through community-controlled partners (PICC, below), not direct Commonwealth contracts. The IPP-JV route (Indigenous Procurement Policy joint venture with Oonchiumpa, per the cutover thesis) is the lever to change this — it is greenfield, not a renewal.

### 2b. The real "procurement-ish" current relationships (from the Xero ACCREC list)

These are the government/agency/corporate **customers** who actually pay ACT for delivery — the genuine current procurement-style relationships (vs the AusTender *targets* in 2c). `Verified` (Xero, FY26 PAID):

| Buyer | FY26 paid | Type | Latest |
|---|---|---|---|
| **Palm Island Community Company (PICC)** | **$365,200.00** | community-controlled co. (delivery partner + payer) | 2025-11-03 |
| Sonas Properties Pty Ltd | $118,580.00 | corporate | 2026-05-06 |
| Ingkerreke Services Aboriginal Corp | $103,099.70 | Aboriginal corp | 2025-09-27 |
| SMART Recovery Australia | $59,700.00 | NFP service | 2026-03-19 |
| Just Reinvest | $27,500.00 | NFP | 2026-03-01 |
| Green Fox Training Studio Ltd | $27,000.00 | corporate | 2025-07-17 |
| Julalikari Council Aboriginal Corp | $19,800.00 | Aboriginal corp (Goods buyer) | 2025-10-21 |
| Department of Housing | $1,500.00 | **government agency** | 2025-09-05 |
| Minjerribah Moorgumpin Elders-in-Council Aboriginal Corp | $1,155.00 | Aboriginal corp | 2025-07-17 |

PICC at $365,200 is ACT's single largest FY26 payer — it is simultaneously a delivery partner (Lane 3) and the closest thing ACT has to a procurement customer. Department of Housing is the only direct government-agency payer in FY26 (tiny, $1,500).

### 2c. Procurement TARGETS (not relationships — labelled accordingly)

`v_act_procurement_buyers` (226 rows) is a **target ranker, not a relationship list.** Its definition (`Verified` via `pg_views`) scores Commonwealth/state buyers by topic-relevance to ACT's offer (data/analytics, evaluation, research, mapping, consultation/co-design, storytelling, Indigenous/First Nations) on contracts ≥$25k published in the last 3 years, ≥2 contracts. **These are prospects ACT could pursue — ACT has no contract with any of them today.** Top 10 by relevant spend (all `total_relevant_spend` `Verified`; relevance is `Inferred` from the view's keyword scoring):

| Buyer | Relevant contracts | Relevant spend | last-yr | topic score |
|---|---|---|---|---|
| Digital & ICT | 60 | $1.75B | 0 | 1.15 |
| NSW Dept of Communities and Justice | 325 | $1.10B | 0 | 1.08 |
| Department of Defence | 626 | $568.8M | 521 | 1.01 |
| QLD Queensland Health | 7 | $510.8M | 4 | 1.00 |
| Australian Taxation Office | 34 | $339.2M | 19 | 1.06 |
| Dept of Health, Disability and Ageing | 243 | $220.1M | 215 | 1.11 |
| TAFE NSW | 42 | $206.5M | 0 | 1.07 |
| Transport for NSW | 188 | $198.1M | 0 | 1.08 |
| Sydney Trains | 50 | $146.5M | 0 | 1.14 |
| Dept of Planning, Housing and Infrastructure | 118 | $146.1M | 0 | 1.17 |

> Caveat for Ben: these top-by-spend rows are generalist mega-buyers (Defence, ATO) with low topic scores (~1.0) — high spend, weak fit. The view is more useful re-sorted by `avg_topic_score` and Indigenous/community keywords (recipe R5 below), which surfaces *fit* over *size*. **NSW DCJ (justice) and Dept of Communities/Health are the most ACT-aligned of the top 10.**

---

## Lane 3 — Partners (delivery + community — NOT funders)

> **Community-line rule (load before reading):** community storytellers and community-controlled partners are **never** funnel targets. This lane is held strictly apart from Lanes 1–2. The give/get logic of the pipeline lanes does **not** apply here — the community lane runs on an **OCAP-holds / CARE-owes** frame (`wiki/concepts/ecosystem-value-exchange.md`). **Do not propose outreach automation, `tier:` nudges, or Journey workflows for any community-line person below.** Replies are written by hand.

### 3a. Canonical delivery + community partners

From `wiki/concepts/act-business-architecture.md` (the Partnership trajectory) — community-led and community-owned; ACT is a technical/strategic supporter, not the owner. `Verified` (canonical doc):

| Partner | Code | What it is | FY26 net (in/out) | Note |
|---|---|---|---|---|
| **PICC** (Palm Island Community Company) | ACT-PI | 100% community-controlled; ACT is supplier/supporter | **+$323K** ($365K in / $43K out) | also Lane-2 payer; 85% Indigenous / 78% local |
| **Oonchiumpa** | ACT-OO | Mparntwe, Aboriginal-led (Kristy Bloomfield, Tanya Turner) | +$26K ($103K / $77K) | **community line** |
| **Custodian First Economy** (ACT-CE) | ACT-CE | Youth-justice partner | −$145K ⚠ (TFN miscode, not real spend) | partner |
| **Goods on Country / The Butterfly Movement Ltd** | ACT-GD | Recycled-plastic essential goods with remote communities; charity+commercial | +$14K ($484K / $469K) | DGR charity vehicle; Indigenous-majority board (Kristy Bloomfield, Audrey Deemal) |
| **Mount Isa cluster — BG Fit (Brodie Germaine)** | ACT-BG, ACT-MY | Justice-reinvestment network; Mounty Yarns | small | community partner |

**Goods production/buyer communities** (from GHL won Goods orders, `Verified`): Julalikari Council Aboriginal Corp · Mala'la Health Service Aboriginal Corp · Our Community Shed Inc · Red Dust Role Models · Centrecorp · Snow (these buy Goods product — buyer relationships, some also funders). Note the dual role: a few orgs (Snow, Centrecorp, Red Dust) appear as both funders (Lane 1) and Goods buyers — that is real overlap, not double-counting; the dollars are in distinct invoices.

### 3b. Field warmth — ringed people attached to funder/partner orgs

From `thoughts/shared/field-decisions.jsonl` (Ben's 5/15/50/150 rings; person-keyed). `Verified` (Ben's own decisions file). **Funder/partner-attached people** (supporter lane — engageable):

| Person | Ring | Org / link | Ben's note |
|---|---|---|---|
| Georgina Byron AM | 50 | Snow Foundation | "largest secured funder ($403K) — keep engaged"; also a storyteller |
| Sally Grimsley-Ballard | 50 | Snow Foundation | "keep engaging… named unprompted" |
| Teya Dusseldorp | 50 | Dusseldorp Forum | "good connection for a number of things" |
| Lucy Stronach | 50 | Minderoo | "said NO to JusticeHub; can maybe help with Goods" |
| Maree Meredith | 50 | (Palm Island art centre) | "supports the Palm Island art centre stories — keep engaged" |
| Melissa DeLaney / Carollyn Kavanagh / Esther Gyorki | 50 | Regional Arts fellowship | arts-community supporters |
| Erin Jackson | 50 | SMART Recovery | COO (SMART pays ACT $59.7k FY26) |
| Margot Beach | 150 | Dusseldorp Forum | "mainly just a Dusseldorp connection" |
| George Newhouse | 50 | (JusticeHub) | "could be a BIG JusticeHub collaborator" |

**Community-line people in the file (DO NOT funnel):** Kristy Bloomfield (Oonchiumpa; lane=`community`, projects act-jh/act-gd/act-hv), Minjerribah Moorgumpin Elders (ring 50), Daniel Daylight (backyard development), Sam Davies (Goods bed-maker — "core partner, community"). These sit on the community line — relationship by hand, never automation.

> Note: a known live violation (per memory) — Kristy Bloomfield / Tanya Turner were tagged `role:storyteller` AND into `comms:funder-drip`/`partner-drip` automations. That is a community-line breach to fix in GHL (gated Tier-2 write), **out of scope for this read-only report** but flagged here so it isn't lost.

### 3c. GHL contact tags (partner-drip / circle:gsd-alliance) — DB read

The hand-curated inner circle (`circle:gsd-alliance`) and `partner-drip` tags are GHL-side. A `ghl_contacts` mirror exists in the shared DB but tag arrays were **not queried in this pass** (budget). `Unverified` here — read via the `orbit` skill or a targeted `ghl_contacts` tag query before acting on inner-circle membership.

---

## Warm → Cold ladder

The base above is the warm end. Moves get colder as you move down. **Lead with warm.**

### WARM (current funders — renewal / expansion)
These already pay ACT; the move is *renew and expand*, not *acquire*.
1. **Snow Foundation** — $403k all-time, $247.5k FY26, latest 2026-05-22, warm at board level (Georgina Byron AM + Sally Grimsley-Ballard both ring-50). Highest-trust renewal + multi-year ask. This is the QBE-matching co-funder candidate (per memory).
2. **Centrecorp Foundation** — $123k, dual role (funder + Goods buyer). Expand the Goods buyer line + grant.
3. **PICC** — $365k FY26 (largest payer), partnership + delivery. Renew/expand the service contract; protect the community-controlled framing.
4. **Regional Arts Australia** — $33k paid + $16.5k owed (chase the AUTHORISED invoice) + warm fellowship relationships (DeLaney/Kavanagh/Gyorki). Renew the fellowship.
5. **VFFF, Dusseldorp, Social Impact Hub, Paul Ramsay** — smaller current funders; low-cost renewal touches, Dusseldorp warm via Teya.

### ADJACENT (board-member bridges + co-funder patterns + partner networks)
One degree out from the warm base. Build these *from* the warm relationships:
- **Board-member bridges** — `foundation_people` (board/role data) × Ben's Field rings. The live example: Dusseldorp Forum ← Teya Dusseldorp (ring 50). Run recipe R1 to enumerate every foundation whose board sits in Ben's orbit.
- **Co-funder patterns** — `foundation_grantees`: foundations that fund the *same grantees* as ACT's current funders are thematically adjacent and socially proximate. Snow already shares grantees with **8** other foundations (`Verified`). Run recipe R2.
- **Partner networks** — PICC, Oonchiumpa, BG Fit and the Goods buyer communities each have their own funder relationships; a warm intro through a partner is the warmest cold-open ACT has. (Relational, not in one DB table — mine via the partner + the `orbit`/Field data.)

### COLD (ranked discovery — the new ranker)
For genuinely cold options, **do not freelance** — run **`scripts/foundation-shortlist.mjs`** (read-only). It blends, per foundation: (1) ACT's own `act_*` signal strength, (2) recency decay, (3) Field warmth (board members in Ben's rings — pulls from the same `field-decisions.jsonl`), (4) giving capacity (log-scaled), × an approachability multiplier from `foundation_power_profiles` (10,114 profiles: openness / approachability / gatekeeping). Output: weekly top-10 foundations to approach.
```
node scripts/foundation-shortlist.mjs            # top 10, console
node scripts/foundation-shortlist.mjs --top 20   # widen
node scripts/foundation-shortlist.mjs --json     # machine-readable
```

---

## Adjacency search recipes (run from the warm base)

Concrete read-only queries Ben can run to find adherent/adjacent options. Use the `exec_sql` RPC idiom (sequential, never `Promise.all`; not 1000-row capped). Substitute the current-funder name where shown.

**R1 — Foundations whose board members are in Ben's Field orbit (warmest cold-open):**
```sql
-- cross foundation_people against the names in thoughts/shared/field-decisions.jsonl
SELECT fp.foundation_name, fp.person_name, fp.role_title
FROM foundation_people fp
WHERE lower(fp.person_name_normalised) IN ( /* ring 5/15/50 names from field-decisions.jsonl */ )
ORDER BY fp.foundation_name;
```

**R2 — Co-funders: foundations that fund the same grantees as a current ACT funder:**
```sql
SELECT g2.foundation_name, count(DISTINCT g2.grantee_name_normalised) shared_grantees
FROM foundation_grantees g2
WHERE g2.grantee_name_normalised IN (
        SELECT grantee_name_normalised FROM foundation_grantees
        WHERE foundation_name ILIKE '%snow foundation%')   -- swap funder
  AND g2.foundation_name NOT ILIKE '%snow foundation%'
GROUP BY g2.foundation_name
ORDER BY shared_grantees DESC LIMIT 25;
```

**R3 — Foundations with the same geographic + thematic focus as ACT's wins, ranked by approachability:**
```sql
SELECT f.name, f.total_giving_annual, pp.approachability_score, pp.openness_score
FROM foundations f
JOIN foundation_geo_focus gf ON gf.foundation_id = f.id
LEFT JOIN foundation_power_profiles pp ON pp.foundation_id = f.id
WHERE gf.region ILIKE '%northern territory%'   -- or QLD / remote / Indigenous
  AND coalesce(pp.gatekeeping_score, 0) < 0.6
ORDER BY pp.approachability_score DESC NULLS LAST, f.total_giving_annual DESC NULLS LAST
LIMIT 25;
```

**R4 — Foundations whose `notable_grants` / category match ACT's themes (Indigenous, justice, regional arts, regenerative):**
```sql
SELECT f.name, f.avg_grant_size, f.giving_philosophy
FROM foundations f
JOIN foundation_category_assignments ca ON ca.foundation_id = f.id
WHERE ca.foundation_id IN ( /* category ids matching ACT-funded themes */ )
ORDER BY f.total_giving_annual DESC NULLS LAST LIMIT 25;
```

**R5 — Procurement targets re-sorted for FIT not size (Indigenous/justice/evaluation buyers):**
```sql
SELECT buyer_name, contract_count, total_relevant_spend, contracts_last_year, avg_topic_score
FROM v_act_procurement_buyers
WHERE avg_topic_score >= 1.5 AND contracts_last_year > 0
ORDER BY avg_topic_score DESC, contracts_last_year DESC LIMIT 20;
```

**R6 — All-time vs FY26 funder gap (who lapsed — re-engagement targets):**
```sql
SELECT contact_name,
       SUM(total) FILTER (WHERE date >= '2025-07-01') fy26,
       SUM(total) all_time, MAX(date) latest
FROM xero_invoices WHERE type='ACCREC' AND status='PAID'
GROUP BY contact_name
HAVING SUM(total) FILTER (WHERE date >= '2025-07-01') IS NULL  -- paid before, not in FY26
ORDER BY all_time DESC;
```

---

## Headline numbers (all `Verified` unless noted)

- **Funders who actually paid ACT (FY26):** 11 grant-makers within $1.307M total ACCREC PAID; top = Snow $247.5k (FY26) / $403k all-time.
- **Grant-tranche acquittal ledger:** $592,211.79 / 11 tranches / 4 funders (`Inferred`, Notion — reconcile before quoting).
- **Real current paying customers (procurement-ish):** PICC $365.2k leads; only one direct gov agency (Dept of Housing, $1.5k).
- **Federal procurement footprint:** **none** (0 of 806,713 AusTender rows).
- **Curated GHL pipeline:** 28 won ($1.51M); open headline asks REAL Innovation Fund $2.0M + WHSAC $1.7M. (The $272M "Grants" pipeline is auto-discovery noise, not relationships.)
- **Delivery/community partners:** 5 canonical (PICC, Oonchiumpa, Custodian First Economy, Goods/Butterfly, Mount Isa/BG Fit) + Goods buyer communities.
