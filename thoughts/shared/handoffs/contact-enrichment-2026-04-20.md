---
title: Contact enrichment run — 2026-04-20
purpose: Capture the state after Tier 1 + Tier 2 + Tier 3-brief-emit completed
---

# Contact enrichment — session summary

## Coverage change (community-controlled orgs, n=8,826)

| Field | Before | After | Delta |
|---|---|---|---|
| Email | 0 | 660 | +660 |
| Phone | 0 | 752 | +752 |
| Website | 1,003 | 1,010 | +7 |

## Tier 1 — ACNC bulk ABN join

- 4,737 community-controlled orgs with ABN + null email
- 2,057 matched ACNC register (43%)
- 7 got website added; 0 emails/phones (ACNC bulk export is privacy-protected, no email/phone in CSV)
- Applied

## Tier 2 — website contact-page scrape

- 997 candidates with website + null email
- 796 enriched (80% yield)
- 201 nothing-found
- 0 fetch failures
- Applied

**Bug fix landed in this run:** User-Agent header had an em-dash (`—`, U+2014) which `fetch` silently rejects as non-ASCII. Every scrape returned null before the fix. Noise filters added for `user@domain.com`, `@sentry-next.wixpress.com`, `@oric.gov.au`, `@acnc.gov.au`, `@asic.gov.au` — regulator/platform addresses that aren't the org's own contact.

## Tier 3 — agent research briefs

- 82 briefs emitted at `wiki/output/contact-enrichment/research-briefs/`
- Scoped to the 160 verified Session 1 candidates (those with no email, phone, or website after Tier 1+2)
- State distribution: NT 15, NSW 12, TAS 11, QLD 11, ACT 7, SA 6, VIC 5, WA 15
- Each brief carries the org's ABN, entity type, LGA/postcode, and a research task + return format
- Ingest path: agent fills in brief → writes to `research-results/` → `node scripts/enrich-contacts-via-agent.mjs --ingest-results --apply`

## Verified candidate coverage (Session 1 pool, n=160)

- 49 have email (was 0)
- 63 have phone (was 0)
- 78 have website
- 82 still need Tier 3 research (briefs emitted)

## Next moves

1. **Pick the 20–30 highest-priority briefs** (e.g. by state × linkage_strength) and run targeted research — either Ben manually, or dispatch a research agent
2. Post-research, `enrich-contacts-via-agent.mjs --ingest-results --apply` folds verified email/phone into `gs_entities`
3. Extend ORIC-register integration later — the ~2,680 ABN-unmatched rows are ORIC-only corps; pulling contact from the ORIC public register would close most of that gap
