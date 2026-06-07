---
title: ACT GHL + Website Alignment — continuation handoff
date: 2026-06-02
owner: Ben
purpose: Resume the GHL/website alignment work in a fresh session after /clear
---

# Picking up ACT's GoHighLevel + website alignment

You are continuing a build that aligns ACT's websites and forms with GoHighLevel, so tags/values/workflows/pipelines DERIVE from the forms (forms-first), not the other way round. Read the three durable docs first, then act on the fix list. **Effort: high. Standard mode (no /fast) for anything touching consent or external systems.**

## Read these first (they hold the real detail)
- `wiki/decisions/act-site-form-alignment.md` — the site→form→GHL map + the **VERIFIED act.place form registry** (commit cac3921). START HERE.
- `wiki/decisions/act-ghl-operating-strategy.md` — the belonging-ladder strategy + LCAA→CRM connector (32cfceb).
- `thoughts/shared/plans/2026-06-02-harvest-ghl-tier1-build.md` — Harvest Tier-1 + the 7 decisions (incl. the finding: **only 4 of 143 seated Harvest contacts have clean consent → 139 need re-opt-in**).
- memory: `newsletter-consent-signup-path.md`.

## The one principle that prevents the recurring error
**Route by `projectCode`, NEVER by formType.** Every act.place form already declares a projectCode. The CRM must obey it. The Harvest mistake happened because the intake hardcoded Harvest-seating + `comms:act-newsletter` regardless of project.

projectCode taxonomy (canonical, from the code): `ACT-IN` ecosystem · `ACT-HV` Harvest · `ACT-BV` Black Cockatoo Valley/Farm · `ACT-AS` Art/residency · `ACT-EL` Empathy Ledger · `ACT-JH` JusticeHub · `ACT-GD` Goods.

act.place forms (verified in act-regenerative-studio): NewsletterForm→ACT-IN(overridable) · CSAInterestForm `csa`→ACT-HV · FarmStayForm `farm-stay`→ACT-BV · ResidencyForm `residency`→ACT-AS · ContactForm `contact`→ACT-IN · QuickInquiryForm `flagship-inquiry`→per-page · FoundationContestForm `payout-wall-contest`→ACT-IN. All post via `/api/forms/submit` → `pushToGHL` upsert.

## Current state (what's true / live / committed)
- **GHL location** `agzsSZWgovjwgpcoASWG`. Field IDs: newsletter_consent `aVnqmajnysMtGYhLD0oA` · consent_source `HdnMUyXkZRPZG7l7cygG` · first_action_date `JovUpJTwrhctE85adcSV` · consent_timestamp `Z1E4OJl7lf8kWbJGASDM` · last_ask_date `thAJdAyTPpmNRdoSrSmb`.
- **Custom fields**: 57 in 8 folders (Identity, Consent & Culture, Preferences, Engagement & AI, Goods Ops, Storytelling, Campaign Ops, Forms). Reorg script `scripts/reorg-ghl-custom-fields.mjs`.
- **Tags**: Lane A created `action:` ×4, `interest:` ×3, `comms:` ×3, `consent:` ×2 (`scripts/harvest-ghl-tier1-lane-a.mjs`, commit 77d9083).
- **Consent LIVE**: newsletter_consent stamped in code (regen-studio PR #49 / merge 270d3b6, deployed 04:12, verified end-to-end with a real tracer signup).
- **"ACT — Intake" GHL workflow** EXISTS + Published: Inbound Webhook → Find Contact → [Found: Create Opp **Harvest**/Connected · Add `tier:connected` · First Action Date=now] / [Not Found: END]. Webhook URL hook id `8432ee10-f5d5-4f72-a6fb-5f0829b937c6`. **⚠️ It wrongly seats to Harvest — must become projectCode-routed.**
- **regen-studio PR #50** (namespaced `source:`/`role:`/`action:` tags + the intake-webhook POST) is MERGED to main (a697b5c) but **NOT deployed** — the deploy fails on a PRE-EXISTING static-gen timeout (EL/Supabase build-time fetches on `/projects/[slug]`, `/art/*`, `/sitemap.xml` >60s). NOT caused by the change. Leaving it un-deployed is correct: the intake needs the projectCode rewrite first.

## The fix list (do in order; nothing here sends a message)
1. **Decide Ecosystem Journey rung names** — recommend the canonical 5 (`Curious → Connected → Member → Active → Steward`), same as Harvest, per the belonging model. Drop the workflow's invented "Newcomer/Participant/…".
2. **Create "ACT — Ecosystem Journey" pipeline** (5 rungs) in the GHL UI — API can't create pipelines (401 no scope). Quick UI build.
3. **Code (regen-studio `src/app/api/forms/submit/route.ts` → `pushToGHL`)**: derive `comms:<project>-newsletter` from projectCode instead of hardcoding `comms:act-newsletter`; add a `project:<code>` tag; keep passing projectCode to the webhook. tsc + build; commit on a branch; hold deploy.
4. **Rewrite the intake workflow to route by projectCode** (GHL UI): after Find Contact, branch on the `projectCode` value from the webhook payload — `ACT-IN`→ACT Ecosystem/Connected · `ACT-HV`→Harvest · `ACT-BV`→Farm · etc. Remove the always-Harvest seating.
5. **Migrate mis-seated contacts**: query how many act.place newsletter (ACT-IN) contacts are sitting on the Harvest pipeline; move them to the Ecosystem Journey. Query first, move deliberately, never delete.
6. **Fix the deploy**: make the slow `/projects`,`/art` pages ISR/runtime (or bump `staticPageGenerationTimeout`), then deploy PR #50 + the projectCode code.
7. **Source/UTM capture**: add hidden UTM + `lead_site` fields to the forms, map through the upsert (see alignment map §5).

## Decisions still needed from Ben
- Ecosystem Journey rung names (recommend canonical 5 — confirm).
- Do JusticeHub / Goods / CivicGraph forms post through `/api/forms/submit`, or are they Webflow/native (unwired)? — needs Ben.
- Is `ACT-AS` the artist residency? Confirm.
- Donations → route to The Butterfly Movement (DGR) or ACT Pty? (tax-receipting owner).

## Guardrails (load every time — non-negotiable)
- **Route by projectCode, never formType.**
- **Consent** set in CODE on real opt-in only; never inferred; **no seat/send without `newsletter_consent`**.
- **commerce-yes / community-never**; storytellers + recipients NEVER funnelled (OCAP); Empathy Ledger stays behind the `consent-check` gate.
- All **send-workflows stay Draft** until a coordinated, consent-filtered launch. Intake/seating workflows send nothing (safe to publish).
- **Tier-2 GHL writes** (pipeline/workflow/field config): post "about to do X — proceed?" first. **Tier-3** (deploy to prod, send a message, merge PR): needs the explicit verb from Ben.
- The **re-opt-in to the 139 Harvest contacts** is the real "launch" — separate, gated, day-shift, human-in-loop. Never queue it AFK.

## Bringing it together (the bigger picture)
- **One intake workflow, routed by projectCode** = the spine. Every project's journey shares the 5-rung belonging shape; only the meaning of Member/Steward changes.
- **Analytics layer**: outbound webhooks (contact create/update + Pipeline Stage Changed) mirror GHL → shared Supabase → command-center dashboards; GA4/Plausible per site; track belonging (first touch, engagement depth, time-in-stage, return rate, consent state) — not sales conversion.
- **Per-project rollout, same shape**: Harvest → ACT Ecosystem → Goods → JusticeHub → EL (OCAP-only). Build one, prove it, replicate.
