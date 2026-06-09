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

## Phase D build sequence (Tier 3, day-shift, gated to 16 Jun — DRY-RUN FIRST)

1. **Suppression guard workflow** — build FIRST (safety backstop before any send). Triggers: DND, Email Unsubscribed, consent_status=No consent, `lane:community`, `comms:do-not-bulk` → strip from all `comms:*`, stop workflows.
2. **Custom fields (2 to create)** — `cohort` (SINGLE_OPTIONS) + `slot_confirmed` (DATE). API-supported via `scripts/lib/ghl-api-service.mjs` `createCustomField`. Record returned field IDs into the config `custom_fields.existing`.
3. **Pipeline "CONTAINED Adelaide 2026" (11 stages)** — no `createPipeline` in the GHL lib; create in GHL UI. Record pipeline ID + each stage ID → set `GHL_PARTNER_PIPELINE_ID` / stages in JH Vercel env. (Funder pipeline: decide whether a separate pipeline or reuse — set `GHL_FUNDER_PIPELINE_ID` accordingly.)
4. **Calendar "CONTAINED Adelaide Walkthroughs"** — GHL native, 30-min slots; create in GHL UI. `on_booking_confirmed` → set `slot_confirmed`, move opportunity to Booked. Record public booking URL → `NEXT_PUBLIC_GHL_CONTAINED_CALENDAR_URL` in JH Vercel env (un-gates the register CTA from PR #44).
5. **Tag migration** — `scripts/ghl-taxonomy-migrate.mjs --dry-run` FIRST. 260 `project:contained-adelaide-2026` → `source:event:contained + place:sa`; additive-then-strip (RC3); conflict-guard the 9 multi-way email dupes (human merge in UI, skip); re-assert the community-line guard after each bucket. Eligibility gate: 113 eligible / 2916 blocked.
6. **Segments (smart lists)** — build from the `newsletter.segments` queries (consent-gated).
7. **Automations + sends** — last, never AFK, after suppression guard verified.

## Tier discipline

Config + this note are Tier 1 (data/docs). Everything in the build sequence touches the live shared GHL account = **Tier 3, day-shift, human-in-loop, dry-run first, gated to the 16 Jun go/no-go.** Never queue these into an AFK backlog.
