# Open Questions — Empathy Ledger World Tour — RESOLVED 2026-04-09

> **Created:** 2026-04-09 from the strategy synthesis (`wiki/raw/2026-04-09-empathy-ledger-strategy-synthesis.md`).
> **Status:** ✅ ALL FIVE RESOLVED 2026-04-09 — see answers inline below.
> **Next:** the open data needs that fall out of these decisions are captured at [`2026-04-09-lesotho-data-needs.md`](2026-04-09-lesotho-data-needs.md).

## Decision 1 — Lesotho: real, exploratory, or drop?

### ✅ RESOLVED — REAL

**Ben (2026-04-09):** *"real but need teh prison connection and the JCF specific program"*

Lesotho is a confirmed stop. Two data gaps remain that block public-pageable readiness, both filed at [`2026-04-09-lesotho-data-needs.md`](2026-04-09-lesotho-data-needs.md):
1. **Prison contact** — which Lesotho prison or restorative-practice site, and the named contact
2. **JCF Lesotho program** — which JCF-funded program operates in Lesotho (not yet visible in the connected DB; likely lives in JCF records or EL v2)

Once both are named: file as `status: confirmed` in `tour_stops`, add `buyer_contact`, draft the chapter question, slot into the African leg between Rwanda and Uganda.

**Verified:** The connected Supabase (`tednluwflfhxyucgwigh`) returns **zero hits** for Lesotho across `articles`, `tour_stops`, and `locations`. The synthesis itself flagged this. Lesotho is not currently in any JCF data on the connected DB.

**Possibilities:**
1. **Real partnership** that lives in the EL v2 database (`yvnuayzslukamizrlhwb` — separate Supabase, not currently connected via MCP) and just hasn't been pulled across
2. **Real contact** Ben holds personally that has never been logged anywhere
3. **Aspirational** — Ben wants to add it because the prison interest is real (Lesotho prisons are unique restorative-practice cases) but there's no anchor partner yet
4. **Confused with** a Tanzanian or Rwandan partner whose location was misremembered

**What unblocks each:**
- (1) → switch the Supabase MCP to EL v2 and re-query, OR pull the EL v2 stories/tour_stops via the `el-stories` adapter once `EMPATHY_LEDGER_SUPABASE_*` env vars are wired
- (2) → Ben adds the contact to GHL with `tag: world-tour-lesotho` and the system picks it up
- (3) → file Lesotho as `status: scoping` in tour_stops, with a buyer column blank as the discipline. Per `empathy-ledger:claim-every-stop-has-a-buyer`, a stop with no buyer is a holiday.
- (4) → drop the entry, update the synthesis to remove Lesotho

**Recommendation (was):** Default to (3) until a real anchor partner is named. **Resolved differently:** Lesotho is real, the gaps are data-not-existence. See decision above.

---

## Decision 2 — JCF partners: cross-chapter network or per-stop list?

### ✅ RESOLVED — YES, BOTH

**Ben (2026-04-09):** *"big yes for this"*

The synthesis recommends: **cross-chapter network with per-stop tags.**

**The data model question is:** is JCF a `tour_partner` (one record, appears at multiple stops) or a per-stop entry (St Jude under Tanzania, Kula under Rwanda, Naramatisho under Tanzania, etc.)?

**Recommendation:** Both.
- JCF as a top-level **partner network** in the world tour DB, with one record
- Each beneficiary org (St Jude, Kula, Naramatisho, plus future ones) as a `tour_stop_partner` row linked to (a) the JCF network and (b) the specific stop
- This makes the `goods-on-country:claim-handover-is-the-test`-style cross-chapter funder pitches assemblable

**Implication:** the `goods-on-country:claim-not-charity-its-enterprise` framing extends here too — JCF beneficiaries are not charity recipients on the tour, they are partners in the same listening loop.

---

## Decision 3 — Multi-stop Uganda: one chapter or several?

### ✅ RESOLVED — ONE CHAPTER, MULTIPLE ENCOUNTERS

**Ben (2026-04-09):** *"yes"*

The synthesis recommends: **one chapter, multiple encounters inside it.**

**Cleaner narrative.** The "one country, ten organisations, one travelling partner (Shyaka)" frame is the strongest single-chapter through-line in the entire tour. Splitting it would dilute it.

**Implementation:** the chapter is "Uganda — What does dignity look like at 5kg of laundry per day?" and inside it are sub-encounters for Washing Machine Project, Breakdance Project Uganda, CDS Uganda, UCOBAC, AYADO, Diagrama School Uganda, Incarceration Nation Uganda. Each sub-encounter has its own `tour_stop_encounter` row but they all roll up to the Uganda chapter for narrative purposes.

**Recommendation:** Approve as recommended.

---

## Decision 4 — Holland focus: youth justice only, or youth justice + social enterprise?

### ✅ RESOLVED — YOUTH JUSTICE LEAD, SOCIAL ENTERPRISE SECONDARY
### ⭐ CONFIRMED PARTNER — YOPE INTERNATIONAL (AMSTERDAM) — 2026-04-09

**Ben (2026-04-09):** *"yes"*

**Update 2026-04-09:** Ludmila Andrade at YOPE International confirmed by email (2026-04-08 22:37) that YOPE can host an exchange between Australian young people and the YOPE Amsterdam cohort. **First confirmed Travel Diary inbound/outbound partner.** Ben's July 2026 visit becomes the proof-of-concept that the bidirectional methodology works **before STAY Year 2 even begins**.

This converts Holland from a hypothetical Year-2 destination into a live Year-0 anchor. Full planning at [`wiki/library/locations/yope-amsterdam-july-2026.md`](../library/locations/yope-amsterdam-july-2026.md).

The synthesis offers: **the combo gives you the three-country arc of Diagrama School Uganda → Holland prison closure → Spain Diagrama HQ.**

This is the strongest narrative spine of the entire international leg. Restricting Holland to youth justice would simplify the chapter; combining it with social enterprise would create a richer chapter but blur the question.

**Recommendation:** Youth justice as the lead, social enterprise as the secondary thread. The chapter question is *"Why do their kids come home?"* — the answer involves both the prison closure and the social infrastructure that made it possible. Don't separate them.

---

## Decision 5 — Tanzania split: combine St Jude + Naramatisho into one chapter, or split?

### ✅ RESOLVED — COMBINED (one Tanzania chapter, two encounters)

**Ben (2026-04-09):** *"yes"*

The synthesis says: *"Depends on travel time / travel days you have."*

**Recommendation:** Combine. Tanzania is one chapter with two encounters (St Jude in one location, Naramatisho in another), unless the travel days are so long they make this physically impossible. The tour benefits from chapter-density (16 chapters across 6 months ≈ 1 chapter every 11 days) and splitting Tanzania burns one of those slots without adding a new question.

---

## What happens once these are answered

1. **DB wiring:** `tour_stops` gets the new entries, with `status` per Decision 1 and `buyer_contact` filled where known
2. **Cross-project bridges:** the new Stories from Inside sub-project gets a folder in `wiki/narrative/empathy-ledger/sub-projects/` (or its own project folder if it grows)
3. **Funder pitches:** `narrative-draft.mjs --funder jcf --channel pitch` will produce the JCF Final-5 brief using the new claims
4. **CONTAINED becomes legible as one island in the ecosystem** instead of a standalone campaign — the `claim-platform-stack` extension is the bridge

## Sources

- `wiki/raw/2026-04-09-empathy-ledger-strategy-synthesis.md`
- `wiki/narrative/empathy-ledger/` (10 claim files extracted from the synthesis)
- `wiki/narrative/funders.json` (jcf, atlassian-foundation, snow-foundation, patagonia, allbirds, who-gives-a-crap added)
- DB verification: Supabase MCP, `tednluwflfhxyucgwigh.locations` and `tednluwflfhxyucgwigh.tour_stops`
