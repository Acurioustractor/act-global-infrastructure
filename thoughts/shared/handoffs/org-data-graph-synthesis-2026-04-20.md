---
title: What the enrichment round taught us about the org-data graph
date: 2026-04-20
purpose: |
  Synthesis of the Tier 1-3 contact enrichment run. What's working, what's
  limited, what we can link with CivicGraph, what's still opaque, and how to
  make ABN the universal join key for everything downstream.
---

# Org-data graph — current state (as of 2026-04-20)

## The baseline: 8,826 community-controlled orgs in CivicGraph

| Dimension | Count | % of 8,826 |
|---|---|---|
| With ABN | 4,737 | **54%** |
| **No ABN at all** | **4,089** | **46%** |
| entity_type = indigenous_corp | 7,491 | 85% |
| entity_type = charity | 618 | 7% |
| entity_type = foundation | 105 | 1% |

**This is the single biggest structural fact**: nearly half of CC orgs in CivicGraph are ABN-less. Without an ABN they can't be matched to ACNC, ORIC, ASIC, or the justice_funding register. They're effectively opaque — we can see the name and (sometimes) the state, and nothing else.

## What the three-tier enrichment actually yielded

| Tier | Started at | Coverage now | Delta | Yield rate |
|---|---|---|---|---|
| Website | 1,003 | 1,010 | +7 | 0.3% (ACNC bulk export only has website, not email) |
| Email | 0 | **682** | +682 | 68% of those with known website |
| Phone | 0 | **772** | +772 | 77% of those with known website |

Sources:
- ACNC bulk join: 2 orgs got email, rest was website-only
- Website scrape: **809 orgs** now have contact data sourced from their own site
- Agent research: **22 orgs** targeted Session 1 candidates, researched via web

## The five registers that could link — what we use, what we don't

```
                         ABN (universal key)
                              │
              ┌───────────────┼──────────────────┐
              │               │                  │
         ACNC (charity)  ORIC (indig corp)  ASIC (company)
         65,386 rows      3,000 rows        all companies
              │               │                  │
        ┌─────┴─────┐    ┌────┴────┐       ┌─────┴─────┐
        │           │    │         │       │           │
     Used ✓    Per-org  NOT YET  NOT YET  NOT YET   NOT YET
    (bulk      scrape     integrated
     website)  not done
```

**ACNC (Australian Charities and Not-for-profits Commission)** — used ✓
- Bulk CSV has website, address, size, registration date
- Email/phone are public on each charity page but **NOT in bulk export** (privacy guard)
- Next move: per-charity page scrape would unlock email/phone for all 2,057 matched orgs
- Yearly financial reports (AIS) also public per-charity

**ORIC (Office of the Registrar of Indigenous Corporations)** — NOT integrated
- Covers ~3,000 corps under CATSI Act, overlaps heavily with our indigenous_corp rows
- Has public register with contact + directors + governance
- Many of our 2,680 ABN-unmatched rows are ORIC-only corps
- Integration here closes the second-largest gap (after the 4,089 no-ABN rows)

**ASIC (Australian Securities and Investments Commission)** — NOT integrated
- Covers all Pty Ltd / Ltd companies
- Most restrictive API (paid, rate-limited)
- Not a priority for ACCO work (mostly non-indigenous orgs)

**data.gov.au justice_funding** — integrated (QLD only)
- Already used to verify 43 QLD orgs received state youth-justice funding FY24-26
- Extending to NSW/VIC/WA/SA/TAS/ACT/NT is flagged post-1-May

**ABR (Australian Business Register)** — used via ABN Lookup
- Agent-tier scripts use this to verify ABN status (active/cancelled)
- Returns main business address + trading name + GST status

## What's working — the ABN-centric pattern

1. **ABN is the universal join key.** Every script in the enrichment pipeline uses ABN to cross-reference. This compounds: ABN → ACNC → website; ABN → ORIC → governance; ABN → funding → dollars.
2. **Idempotent enrichment.** Scripts never overwrite existing data, respect 7-day staleness windows, audit every run. Safe to re-run.
3. **Tiered fallback.** ACNC bulk (fast, cheap) → website scrape (slower, finds emails) → agent research (expensive, definitive). Each tier picks up what the previous missed.
4. **Noise filtering improved the scrape.** After removing `@oric.gov.au`, `@acnc.gov.au`, `@sentry-next.wixpress.com`, `user@domain.com`, we now get 80% clean yield on sites with contact pages.
5. **Agent research is high-signal, low-yield.** 22/24 researched orgs resolved to confidence ≥ 3. The 2 failures were stub entries with bad data (misfiled state, non-existent name).

## What's limited — gaps we hit

1. **46% of CC orgs have no ABN.** Can't be linked to anything downstream. These are either (a) data ingestion failures where ABN wasn't resolved, (b) unincorporated groups that don't have an ABN, or (c) typo/dedupe errors. Priority fix: ABN backfill pass using name + state + ACNC fuzzy match.

2. **ACNC bulk export strips email/phone.** To get those fields from ACNC we'd need to scrape the per-charity page (one URL per ABN). Doable — ~65K page loads, a few hours at 2 req/sec — but wasn't the priority this session.

3. **ORIC is not integrated at all.** ~2,680 indigenous corps with ABN but not in ACNC are likely ORIC-only. They have a separate public register we haven't touched. **This is the biggest single quick-win left.**

4. **Website coverage is 11%.** Most community-controlled orgs don't maintain their own website. Many use Facebook/Instagram instead — we don't scrape those.

5. **Social-media-only orgs are invisible to Tier 2.** Smaller grassroots groups often only have a Facebook page. Tier 3 agent research is the only way to surface them currently.

6. **Data quality leaks into the verified pool.** 2 of 24 Tier 3 targets had bad source data (misfiled state, mis-transcribed name). That's an 8% junk rate even in the "verified" Session 1 shortlist. Worth a dedicated data-quality sweep before the envelope goes out.

7. **Stale-ness is unmanaged.** A contact that was fresh in 2023 may be dead now. We have no re-validation cycle — every field is "last known value, never re-verified." For Session 1 outreach this is probably fine, but for anything ongoing we'd need a rescrape cadence.

## What we can now link confidently

For any **CC org with an ABN**, we can pull:
- **Charity status** (ACNC bulk)
- **Website + postal address** (ACNC bulk)
- **Charity size band** (ACNC bulk: Extra Small → Extra Large)
- **Registration date** (ACNC bulk — proxy for org age)
- **Email + phone** (website scrape or agent research)
- **ALMA portfolio score** (our own evidence layer)
- **QLD justice funding** (if QLD and funded FY24-26)
- **EL v2 stories** (if in our org allowlist)

For **orgs without ABN**, we can only see canonical_name, state, entity_type (if classified). Nothing links out.

## Making the most of the ABN ↔ register chain — the practical ladder

Ranked by cost-per-row-enriched:

1. **ACNC per-charity scrape** (cheap, 2,057 rows) — add email/phone for every ACNC-matched org. ~1-2 hours at 2 req/sec.
2. **ORIC integration** (medium, ~2,680 rows) — harvests indigenous_corp contacts that aren't in ACNC. First-time build.
3. **ABN backfill for the 4,089 no-ABN rows** (medium, variable yield) — fuzzy-match name + state against ACNC/ORIC to assign ABNs retrospectively. Closes the biggest single gap.
4. **Per-state justice funding extension** (medium, flagged post-1-May) — gives non-QLD states the 4th evidence layer.
5. **Social-media scrape / research** (expensive per row) — for the orgs with no website at all.

## Recommended next build (post-1-May, ranked)

1. `scripts/enrich-contacts-from-acnc-pages.mjs` — per-charity ACNC page scrape. Expected yield: ~2,000 emails, ~2,000 phones. Runtime: ~1 hour.
2. `scripts/ingest-oric-register.mjs` — first-time ORIC integration. Expected yield: contact + governance + status for ~2,000 indigenous corps that aren't ACNC-registered.
3. `scripts/backfill-missing-abns.mjs` — fuzzy match the 4,089 ABN-less CC orgs against combined ACNC+ORIC register by name+state. Expected yield: ~1,500 ABNs added (estimated 30-40% hit rate on fuzzy match).
4. `scripts/enrich-contact-freshness.mjs` — quarterly re-validation cycle. Flags contacts that 404, bounce, or have been unchanged >2 years.

## Instrumentation we should add to the CivicGraph dashboard

The dashboard currently shows candidate counts but not **data completeness**. Add a coverage panel per state:

```
QLD candidate pool completeness:
  with ABN:        ■■■■■■■■□□  80% (125/156)
  with ACNC match: ■■■■■□□□□□  50% (78/156)
  with email:      ■■■□□□□□□□  30% (47/156)
  with phone:      ■■■■□□□□□□  40% (62/156)
  with website:    ■■□□□□□□□□  20% (31/156)
```

Ben can see at a glance which candidates are contactable and which need research.
