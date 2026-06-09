# CONTAINED — RC5 unified source tag + Phase D build readiness

**Date:** 2026-06-09
**Decider:** Ben
**Status:** RC5 locked. Config aligned. Phase D build = Tier 3, day-shift, gated to 16 Jun go/no-go.
**Supersedes (source-tag aspect only):** `2026-06-09_contained-cta-ghl-alignment.md` (which used the city-suffixed `source:event:contained-adelaide`). That handoff stays as a point-in-time record; RC5 is the governing decision now.

## RC5 — the ruling

**ONE unified CONTAINED source tag: `source:event:contained` for every city.** The stop is distinguished by `place:<x>` (Adelaide = `place:sa`), **not** a city-suffixed source. This resolves the conflict between JusticeHub's R5 (no-city, already shipped in code) and the earlier city-suffixed config.

**Why unified won:**
- It matches JusticeHub's shipped code — `GHL_CANONICAL.SOURCE_EVENT_CONTAINED = 'source:event:contained'` across every CONTAINED route + PR #44. No code churn, no re-tagging live contacts twice.
- The config was DATA-ONLY / not-yet-applied, so it was the cheap thing to change. The 260 legacy contacts get the unified tag in the gated migration regardless of which scheme we picked.
- Cities scale via `place:` without source-tag proliferation; Adelaide segments already AND-in `place:sa`.

## What changed in `config/campaigns/contained-adelaide-2026.json`

- `canonical_contract.always`: `source:event:contained-adelaide` → `source:event:contained`.
- Segments: `daily-recap` re-pinned with `place:sa`; `future-cities` reworked to `source:event:contained` + `exclude place:sa` (per-city segment = `source:event:contained` + `place:<city>` when scoped).
- Pipeline stage entries (1, 10), lifecycle layer, meta comment: place-based wording.
- Migration map: `project:contained-adelaide-2026` (260 contacts) → `source:event:contained + place:sa`; generic `project:contained` → place derived from state field.
- cta_map: `nominate_leader`, `host_back_tour`, `funder_partner_outreach` flipped `build` → `shipped` (JusticeHub PR #44).
- All 19 city-suffixed source tags removed; JSON validated.

## JusticeHub side — NO change needed

PR #44 already emits the unified `source:event:contained` everywhere. The gated hooks are in place and waiting for the IDs that Phase D produces:
- `GHL_PARTNER_PIPELINE_ID`, `GHL_PARTNER_STAGE_NEW`
- `GHL_FUNDER_PIPELINE_ID`, `GHL_FUNDER_STAGE_NEW`
- `NEXT_PUBLIC_GHL_CONTAINED_CALENDAR_URL`

Opportunities and the calendar CTA are no-ops until these are set in Vercel.

## Pre-built dry-run scripts (Tier 1 — run any time, read-only by default)

Validated against the live account 2026-06-09 (read-only):

- **`scripts/contained-ghl-ids-probe.mjs`** — READ-ONLY, no writes ever. Lists every pipeline + stage IDs, every calendar, and the CONTAINED custom-field IDs, then prints a paste-ready JusticeHub Vercel env block. Run it before AND after the UI create steps to capture IDs.
- **`scripts/contained-ghl-custom-fields.mjs`** — creates the 2 fields. DRY RUN by default (prints exact POST bodies); `--apply` creates them and prints IDs. Idempotent.

## Phase D build sequence (Tier 3, day-shift, gated to 16 Jun — DRY-RUN FIRST)

0. **Probe** — `node scripts/contained-ghl-ids-probe.mjs` to snapshot current IDs + get the env-block template.
1. **Suppression guard workflow** — build FIRST (safety backstop before any send). Triggers: DND, Email Unsubscribed, consent_status=No consent, `lane:community`, `comms:do-not-bulk` → strip from all `comms:*`, stop workflows.
2. **Custom fields (2 to create)** — `node scripts/contained-ghl-custom-fields.mjs` (dry-run) → `--apply`. Creates `cohort` (SINGLE_OPTIONS + 6 options) + `slot_confirmed` (DATE). Paste the printed IDs into the config `custom_fields.existing`. (`newsletter_consent` already exists: `aVnqmajnysMtGYhLD0oA`.)
3. **Pipeline "CONTAINED Adelaide 2026" (11 stages)** — no `createPipeline` in the GHL lib; create in GHL UI, then re-run the probe to capture pipeline + stage IDs. **DESIGN DECISION (open):** JusticeHub host/connect routes open opportunities in *separate* `GHL_PARTNER_PIPELINE_ID` / `GHL_FUNDER_PIPELINE_ID`, but the campaign pipeline is the participant journey (Captured→Booked→Experienced). Map host/funder deals to either existing ACT pipelines — **Grants** (`scom3L0kNwA1W0zPIzMe`) for funders, **Empathy Ledger** (`aRGmSaMh62wPO2R0Bt4g`) for partners — or stand up dedicated ones. Pick, then set the env vars.
4. **Calendar "CONTAINED Adelaide Walkthroughs"** — GHL native, 30-min slots; create in GHL UI. `on_booking_confirmed` → set `slot_confirmed`, move opportunity to Booked. Grab the public booking permalink → `NEXT_PUBLIC_GHL_CONTAINED_CALENDAR_URL` in JH Vercel env (un-gates the register CTA from PR #44).
5. **Tag migration** — `scripts/contained-260-tag-migration.mjs` (built + validated read-only 2026-06-09; reconciles to the preflight: **269 import / 260 matched / 9 conflicts**). Identity tags only (project/source/place/cohort/role); additive-then-strip (RC3); skips the 9 conflicts (owned by `merge-contained-9-conflicts`); community-line guard (never adds `comms:`). Worksheet: `thoughts/shared/reviews/2026-06-09_contained-260-tag-migration-worksheet.md`. **--apply is guarded** (`--apply --reviewed` + snapshot + single-contact tracer + verify-or-abort + rate-limit) and has NOT been run — Tier 3, 16 Jun.
   - **⚠ DECISION (place derivation):** the worksheet derives `place:` from each contact's State, NOT a blanket `place:sa` — because **246 of 260 have no State** (interstate/UK delivery-circle, e.g. Diagrama). Under RC5 those 246 get `source:event:contained` but **no `place:`**, so only ~14 (State=SA) land in the `place:sa` Adelaide segment. The delivery circle is reached via `campaign-stage:`/`ring:`, not the place segment. Confirm that's intended, or enrich State before --apply if the place:sa segment should be larger.
   - **comms: deferred** — newsletter enrolment is resolved by `build-contained-consent-worklist` (REAL vs PHANTOM consent); the 3 newsletter-streams become smart-list segments, not tags. Eligibility gate: 113 eligible / 2916 blocked.
6. **Segments (smart lists)** — build from the `newsletter.segments` queries (consent-gated).
7. **Automations + sends** — last, never AFK, after suppression guard verified.

## Tier discipline

Config + this note are Tier 1 (data/docs). Everything in the build sequence touches the live shared GHL account = **Tier 3, day-shift, human-in-loop, dry-run first, gated to the 16 Jun go/no-go.** Never queue these into an AFK backlog.
