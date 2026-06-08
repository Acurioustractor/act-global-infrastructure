# GHL Phase B — Bucket 1 (CRUFT) apply record — 2026-06-08

Tier-3 GHL write, Ben-authorized (AskUserQuestion "Apply both, tracer-first"). Day-shift, human-in-loop.

## Reconciliation: map (mirror-derived) vs live GHL
The flat-tag map projected **~652 cruft deletes**. Live GHL reality: **11 tag definitions, 0 contacts.**

- `gone-from-ghl*` (652 in map) = **0 in live GHL** — it's a Supabase soft-delete marker (`clean-stale-ghl-contacts-from-manifest.mjs:94` appends to mirror `tags[]`), never written to GHL. Pure mirror artifact.
- Test-tag *definitions* (`test-submission`, `codex-smoke-test`, `webhook-test`, `test`, `test-delete-me`) — **already absent** from the GHL picker. Only `auto-triage` survived (as **2 duplicate defs**).
- The 6 codex-smoke "test-contact" tags (`community-idea`, `idea-general`, `residency-applicant`, `residency-artist`, `business-interest`, `biz-expression-of-interest`) existed as orphaned defs; their 4 contacts were **already gone from live GHL** (mirror drift).

## What was done
**Contacts:** 4 codex-smoke ids (`kU26…`, `S7Ji…`, `MZKH…`, `K0fg…`, all `@example.com`) → **all 404 in live GHL (already deleted)**. Verify-first guard returned no-op. Nothing deleted.

**Tag definitions deleted (11 total):**
1. `community-idea` (tracer — verified 393→392, gone, rest intact)
2. batch: `auto-triage`(1), `quiz-completed`, `business-registration`, `idea-general`, `residency-applicant`, `residency-artist`, `business-interest`, `biz-expression-of-interest`, `minderoo-connection` (392→383)
3. `auto-triage` (2nd duplicate, by-id after stale-read confusion → 383→382)

`minderoo-connection`: ruling was "drop tag, keep person" — deleting the def strips the tag and leaves the contact. ✓

**Final state:** 382 tag definitions · 0 bucket-1 cruft remaining (verified read-only).

## Lessons (carry into buckets 2–7)
1. **Map counts are mirror-inflated.** Always reconcile against the live GHL tag library (`GET /locations/{LOC}/tags`) before trusting a bucket's volume. The audit scripts `audit-ghl-cruft-*-2026-06-08.mjs` do this read-only.
2. **Mirror contact ids drift** — the 4 test contacts (and likely many storyteller rows) are gone-from-GHL. Always `getContactById`-verify-first; treat 400/404 as already-gone, clean-skip.
3. **`getAllContactsByTag` is broken** — GHL v2 `/contacts/?tags=` now 422s ("property tags should not exist"); needs POST `/contacts/search` filter body. Use the mirror for worklists.
4. **GHL tags list is eventually consistent** — a GET immediately after a DELETE can still show the deleted tag. Re-read after a beat before concluding a delete failed.
5. **`delete-junk-ghl-tags.mjs --tags` dedups by name** — duplicate tag defs with the same name need a second pass (or delete-by-id). Caught the 2× `auto-triage`.

## Tooling created this session (read-only audits + 1 authorized delete)
- `scripts/audit-ghl-cruft-bucket1-2026-06-08.mjs` — live tag-library reconciliation (READ-ONLY)
- `scripts/audit-ghl-cruft-mirror-bucket1-2026-06-08.mjs` — mirror worklist + test-contact enumeration (READ-ONLY)
- `scripts/audit-ghl-autotriage-ids-2026-06-08.mjs` — duplicate-id lister (READ-ONLY)
- `scripts/audit-ghl-testcontacts-bucket1-2026-06-08.mjs` — superseded (GHL tag-search API 422; kept as evidence of the drift)
- `scripts/delete-codex-smoke-testcontacts-2026-06-08.mjs` — verify-first contact delete (ran dry/no-op; guard works)
- delete via existing `scripts/delete-junk-ghl-tags.mjs`
