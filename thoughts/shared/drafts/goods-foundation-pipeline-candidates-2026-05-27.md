# Goods on Country — Foundation Pipeline Candidates (REVIEW BEFORE GHL WRITE)

**Date:** 2026-05-27 · **Priority:** Foundations ($) first (per Ben) · **Mode:** review-first — nothing is written to GHL until this doc is approved.

> ## ✅ EXECUTED 2026-05-27 (Ben approved: all 9 new · top-10 cold · enrich 13, leave 3)
> Seeder: `scripts/seed-goods-foundation-pipeline-2026-05-27.mjs` (idempotent, dry-run default). Supporter Journey **13 → 32**.
> - **A** (4 warm) + **B** (5 high-fit) + **C** (10 cold) = **19 new opportunities** created (all opp IDs returned).
> - **D**: 3 new + 7 re-tagged secondary contacts (additive). B/C use company-shell contacts (no human — **need enrichment before outreach**).
> - GHL search index lagged after the write (25→30→32) — **do not re-run `--apply` until settled** or the 2 last-indexed (Developing East Arnhem, Paul Ramsay) would duplicate.
> - ⚠️ TFN: added Madeline Alderuccio but did **not** change primary (still Kristen Lark) — Ben to confirm. Centrecorp board window (17/05) passed — needs follow-up.
> Still open: contact-enrichment pass on the 15 shells · live `gmail-deep-search` of accounts@/hi@ · buyers phase (Batch 4).

**Sources** (both read-only, no fabrication):
- Gmail mine → `handoffs/goods-foundation-pipeline-2026-05-27/gmail-funders.md` (13,614 synced emails, 4 mailboxes, Jul 2025–25 May 2026; benjamin@/nicholas@ well-covered, **accounts@/hi@ thin**). Everything here is **verified from email metadata**.
- GrantScope mine → `handoffs/goods-foundation-pipeline-2026-05-27/grantscope-foundations.md` (shared ACT DB `foundations` table, 11,010 rows / 2,045 Indigenous-focus; Goods shortlist = 6 seeded rows). Fit scores: 6 are author-set, the rest **inferred**. **No contacts exist in this source.**

**Provenance key:** ✅ mail-verified contact · 🔎 fit inferred (no contact yet) · ⚠️ decision/flag for Ben.

---

## Dedup baseline (don't recreate)
13 already in GHL Goods Supporter Journey: Mala'la Health, Rotary Eclub Outback, AMP Foundation, FRRR, The Funding Network, Red Dust, QIC, VFFF, Julalikari Council, Our Community Shed, Homeland School, Centrecorp, Snow Foundation.

---

## BATCH 1 — NEW foundations to ADD to Supporter Journey

### 1a. Warm + real contact (from email — place at a real working stage)

| Foundation | Named contact ✅ | Email | Proposed stage | Warmth tag | Notes |
|---|---|---|---|---|---|
| **The John Villiers Trust** | Fiona Maxwell (CEO) | ceo@jvtrust.org.au | Cultivating | `goods-warm` | Warmest genuinely-new foundation. CEO-level, "checking in" 2026-04-29, funding a video project — relationship live but not yet a Goods bed/washer ask. |
| **Philanthropy Australia** | Kim Harland | kim@philanthropy.org.au | Cultivating | `goods-warm` | Convener/peak body, not a grant-maker — a **door-opener** (PA Conference featured Goods). Tag as `goods-supporter` + funder-adjacent. |
| **REAL Innovation Fund (DEWR)** | program inbox (no human) | REALInnovationFund@dewr.gov.au | Ask made | `goods-warm` | Federal grant; EOI + info-request exchange via PICC/Oonchiumpa for the "Goods Project", Ben chasing status. Govt grant, not philanthropy. |
| **Rotary Global Grant (route)** | Pene Curtis (+ advisors Tony Miles, Greg, Anne Gripper) | pene.curtis@bigpond.com | Ask made | `goods-warm` | Active application-drafting thread (washers/beds). ⚠️ Distinct from the existing GHL "Rotary Eclub Outback" entry — do not merge. |

### 1b. High-fit, already worked in GrantScope but NOT in GHL (cold contact — place + flag for enrichment)

| Foundation | GS fit | Proposed stage | Warmth | Contact status | Notes |
|---|---|---|---|---|---|
| **QBE Foundation** | 93 | Ask made | `goods-warm` 🔎 | needs human | In QBE **Catalysing Impact** cohort, working toward **up-to-$200K match grant** (via Social Impact Hub). Goods v2 even has a `qbe-program` admin page — this is live. **Add now.** |
| **Minderoo Foundation** | 91 | Qualified | `goods-steady` 🔎 | needs decision-maker | Warm catalytic / recoverable-grant target (~$200K). Route Yajilarra Trust + Minderoo Pictures through this one record. |
| **Paul Ramsay Foundation** | 89 | Qualified | `goods-steady` 🔎 | needs intro | $183M national; systems-change/procurement framing already in pipeline. |
| **Australian Communities Foundation** | 84 | Identified | `goods-cooling` 🔎 | needs human | Pooled-giving/donor-collaborative route. |
| **Nova Peris Foundation** | 76 | Identified | `goods-cooling` 🔎 | needs human | NT Indigenous economic-empowerment; possible route via PICC. |

### 1c. Cold prospects — strongest GrantScope-only leads (Identified, research/enrich before outreach)

🔎 All inferred fit, no contact on record. Top picks (full 37 in the handoff):
- **Northern Australian Aboriginal Charitable Trust** — website `remotelaundries.org.au`, literally funds remote-community washing. NT + Indigenous + exact use-case. **Standout.**
- **Developing East Arnhem Ltd** — $2M NT-only remote grant-maker.
- **Country Connect Foundation** — NT, remote + homelessness.
- **Community Resources Ltd** — only catalogue hit tagged `social-enterprise` + Indigenous + NT.
- **Fortescue / Rio Tinto / BHP Foundations** — large corporate-RAP procurement route (WA/national, high ceiling, hard access).
- ⚠️ **Land-council / mining-benefit trusts** (Tiwi, Anindilyakwa, Mirarr, Karrkad-Kanjdji, etc.) are **community-controlled** — better framed as **partners/co-owners** than funders. Hold for the partner track, not Supporter Journey.

---

## BATCH 2 — ENRICH the existing 13 (add real human contacts + correct stages)

Email surfaced real contacts/intel the GHL records are missing. These are **updates, not new records**:

| Existing record | Add / correct | From email |
|---|---|---|
| **Snow Foundation** | Add Sally Grimsley-Ballard (S.Grimsley-Ballard@snowfoundation.org.au), Georgina Byron, Ashley Machuca | Live "Goods Draft Proposal" 2026-04-13 — keep at Stewarding or move to Ask made |
| **QIC** | Add Justin Welfare (jwelfare@qic.com), Cat Vecchio, Cat Sullivan | NAIDOC beds + 2026 opportunities, active |
| **The Funding Network** | ⚠️ GHL contact = Kristen Lark; email shows **Madeline Alderuccio** (madeline.alderuccio@thefundingnetwork.com.au) — confirm current contact | Grant distributed Dec 2025, in 6-month reporting |
| **Red Dust** | Add Bridgit McMullen (bridgit@reddust.org.au) alongside Fiona Scicluna | Active washing-machine coordination |
| **Centrecorp** | Randle Walker correct ✅ | ⚠️ **Time-sensitive** — board applications closed 17/05 (now passed); confirm outcome/next window |
| **FRRR** | Steph Pearson correct ✅ | Acquittal done; ⚠️ **VFFF is FRRR's co-funder** — VFFF warmth is *via FRRR*, no direct thread |
| **AMP Foundation** | program inbox only (amp_foundation@amp.com.au), no human | EOI; awaiting reply / dormant |

---

## BATCH 3 — ⚠️ Reclassify / flag (decisions for Ben)

1. **3 of the current "13" aren't foundations** (GrantScope confirms no philanthropic-funder row): **Mala'la Health**, **Homeland School**, **Julalikari Council** are buyers/partners (income, not philanthropy). Leave in Supporter Journey as income relationships, or move to Demand/Buyer? → your call.
2. **Centrecorp network dedup:** two related trusts share `centrecorpfoundation.com.au` (Central Aboriginal Charitable Trust / Central Australian Aboriginal Charitable Trust). Do **not** create as separate cold prospects.
3. **Outback Stores + Charles Darwin University** scored high but are a **remote-retail distribution channel** and a **university** — these are the buyer/partner "anchor gap" from the operating model, not Supporter-Journey funders.

---

## BATCH 4 — Buyers/partners seen (parked for the buyers phase)
PICC (Narelle Gleeson-Henaway, Mislam Sam), Oonchiumpa (Kristy Bloomfield, Tanya Turner), Anyinginyi Health (Tony Miles). Zinus = supplier (advisory), not a buyer.

---

## Coverage gaps (be honest about these)
- **accounts@ / hi@ are thinly synced** — funder threads living only there may be missed. A live `gmail-deep-search` of those two would close it.
- **GrantScope cold prospects have NO contacts** — they need a contact-enrichment pass (web research / Notion Foundations DB) before they're outreach-ready. They'd enter GHL at `Identified` with a placeholder until enriched.
- **3 GHL funders had no Goods email** (Mala'la, Rotary Eclub Outback, Homeland School) — pre-sync or in the thin mailboxes.

---

## Proposed execution (on approval)
Writes go through the act-infra GHL service (`scripts/lib/ghl-api-service.mjs` — GHL MCP can't create opportunities), extending the existing `scripts/seed-goods-supporter-journey.mjs` pattern. All adds carry the tag convention: `goods` + `goods-funder`/`goods-supporter` + `goods-<warmth>` + `act-gd` + `project:act-gd`.

**Decisions needed before I write:**
1. Batch 1a + 1b (9 NEW foundations) — add all, or a subset?
2. Batch 2 enrichment — apply now, or hold?
3. Batch 3 reclassification — leave the 3 non-foundations, or move them?
4. How many of the Batch 1c cold prospects to seed at `Identified` (top 5 / top 10 / none yet)?
