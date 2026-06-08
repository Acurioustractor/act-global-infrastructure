# ACT-BV (Black Cockatoo Valley) merged into ACT-FM (The Farm)

**Date:** 2026-06-08
**Decision by:** Ben
**Status:** Tier-1 (config/code) DONE · Tier-3 (Xero/Supabase money re-code) DONE 2026-06-08 (Ben's verb)

## Decision

`ACT-BV` "Black Cockatoo Valley" and `ACT-FM` "The Farm" are the **same project** (the same Witta land — The Farm program is the land-based-healing lens; Black Cockatoo Valley is the regenerative-conservation lens). They are merged into **one canonical code: `ACT-FM`**. `ACT-BV` (and its legacy `ACT-BCV`) are retired to legacy aliases that fold to `ACT-FM`.

"Black Cockatoo Valley" remains a valid **place name and wiki page** (`wiki/place/black-cockatoo-valley.md`, `wiki/projects/act-farm/black-cockatoo-valley.md`) — an alias *under* The Farm, not a separate project code.

## Why ACT-FM is the keeper (the data)

Xero usage at decision time:

| Code | Invoices | Transactions | Total money records |
|---|---|---|---|
| **ACT-FM** "The Farm" | 138 | 84 | **222** |
| ACT-BV "Black Cockatoo Valley" | 1 | 8 | **9** |

ACT-FM is 25× more entrenched, has its own repo (`Acurioustractor/act-farm`) + production site, ecosystem/high tier, and already owned the `act-farm`/`the-farm` slugs that ACT-BV redundantly claimed as aliases. Keeping ACT-FM means re-coding only 9 records (vs 222).

## What changed (Tier 1 — DONE 2026-06-08)

Fold lever = the existing legacy-wrapper mechanism (`normalizeCode`/`normalizeProjectCode`), so the 9 not-yet-re-coded records roll up to ACT-FM in every resolver-driven view immediately.

- **Fold maps** — `ACT-BV→ACT-FM`, `ACT-BCV→ACT-FM` added to `scripts/lib/project-resolver.mjs` `LEGACY_WRAPPERS` and its TS mirror `apps/command-center/src/lib/finance/project-codes.ts`.
- **Slug→code resolvers** — `bcv-`/`black-cockatoo-` prefixes and `bcv-residencies` now resolve to `ACT-FM` in `project-resolver.mjs`, `project-code-resolver.mjs`, `backfill-ghl-contact-projects.mjs`.
- **Registry** — both copies (`config/project-codes.json` + `apps/command-center/src/config/project-codes.json`): standalone `ACT-BV` entry removed; its identifiers folded into `ACT-FM` (`legacy_codes: [ACT-BV, ACT-BCV]`, slug_aliases `bcv`/`black-cockatoo-valley`, ghl_tags `bcv`/`black-cockatoo`, notion_pages + xero_tracking_aliases). The command-center copy previously had **no ACT-FM entry at all** (it only knew ACT-BV) — fixed.
- **Identity rules** — `config/project-identity-rules.json` `black-cockatoo-valley` rule → `canonical_code: ACT-FM`.
- **R&D eligibility** — `scripts/tag-rd-eligibility.mjs` adds `ACT-FM` to `RD_PROJECT_CODES` (ACT-BCV was eligible as "Black Cockatoo Valley tech"; the farm keeps that 43.5% R&D eligibility under the merged code). `ACT-BCV` kept for un-migrated records.
- **Money-alignment view** — `money-alignment/route.ts` hardcoded ACT-BV card ($525/1 line) folded into the ACT-FM card (now $131,386.29 exp / −$106,493.79 net / 154 lines); separate card removed.
- **Tests** — `project-codes.test.ts` fold-map guard + `normalizeProjectCode` assertions updated to include ACT-BV/ACT-BCV→ACT-FM. Suites green (6/6 fold, 13/13 resolver), command-center `tsc --noEmit` clean.

## Tier-3 execution (DONE 2026-06-08)

Script: `scripts/recode-act-bv-to-fm-2026-06-08.mjs` (gated, GET-fresh → modify-only-tracking → revert-log → POST → verify byte-identical totals). Revert log: `scripts/output/recode-act-bv-to-fm-revert-2026-06-08.json`.

**Live Xero truth (probed first):** only the 1 invoice actually carried `ACT-BV` in Xero; all 8 Aleisha (BCV rent) txns had **no Project Tracking at all** (`null`) — their mirror `ACT-BV` never corresponded to live Xero tracking.

1. **Xero invoice** — Dinkum Dunnies $525 bill (ACCPAY, post-lock) recoded `ACT-BV → ACT-FM`, total byte-intact, verified. ✅
2. **Xero option retired** — `ACT-BV — Black Cockatoo Valley` Project Tracking option **DELETEd** (once unused; Xero rejects ARCHIVE on a not-in-use option, requires DELETE; reversible by recreate). Confirmed MISSING; `ACT-FM — The Farm` remains ACTIVE. ✅
3. **Supabase mirror** — all 9 rows (1 invoice + 8 txns) → `project_code='ACT-FM'`, `project_code_source='manual-merge-2026-06-08'` (sync-protected). Verified: 0 ACT-BV remain. ✅
4. **The 8 RECEIVE txns** — **could not be API-recoded**: reconciled bank transactions are API-locked (`"This Bank Transaction cannot be edited as it has been reconciled with a Bank Statement"`). They were never ACT-BV-tracked in Xero anyway, and now fold to ACT-FM via the mirror + resolver. Adding Xero Project Tracking to them would require manual UI edits (low value — correctly attributed already). **The "route 5 locked records to SL" step dissolved** — they're untracked in Xero, nothing to recode.

### Still-dead literal-`ACT-BV` keys (cleanup, no rush)
Now that no record carries ACT-BV, these literal keys are dead and can be swept anytime: `config/xero-chart.json:1808`, Xero-push maps (`add-tracking-to-bank-txns.mjs:39`, `push-ai-tracking-to-xero.mjs:66`), display/pile maps (`bunya-fixer.mjs:64`, `generate-project-financials.mjs:41`, `self-reliance/route.ts:9`, `pile-mapping.json:38`, `ledger.ts:812`). The fold handles them regardless.

## Intentionally NOT changed

Place/wiki references to the slug `black-cockatoo-valley` (wiki pages, `living-ecosystem-canon.json` which already nests it under `act-farm`, source-packet schemas, keyword hints) stay — Black Cockatoo Valley remains a real place name under The Farm.
