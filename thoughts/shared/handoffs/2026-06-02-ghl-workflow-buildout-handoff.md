---
title: GHL Workflow Build-Out — strategic continuation handoff (Harvest + Goods first)
date: 2026-06-02
owner: Ben
purpose: Resume in a fresh session to build out the GHL workflows RIGHT — strategically, assembled from previous rounds, Harvest + Goods first.
resume_prompt: >
  Resume ACT's GHL workflow build-out. Read thoughts/shared/handoffs/2026-06-02-ghl-workflow-buildout-handoff.md
  FIRST — it has the strategy, the spine that's already built, the prior-round artifacts to build FROM, the
  ordered Harvest+Goods plan, the gates, and the open decisions. The spine is DONE (projectCode routing deployed
  + intake runbook + pipelines + consent live + analytics hub). The job now: build the per-project belonging
  journeys + send-workflows on that spine, Harvest then Goods, building one → proving → replicating. Effort high,
  standard mode (no /fast) for anything touching consent / GHL / sends. Route by projectCode never formType;
  consent set in code on real opt-in only; no seat/send without newsletter_consent; ALL send-workflows stay
  Draft until a coordinated consent-filtered launch; the 139 Harvest re-opt-in is day-shift, human-in-loop,
  never AFK.
---

# GHL Workflow Build-Out — strategic continuation

**The one-liner:** the *spine* is built and deployed. The job now is to build out the **per-project belonging journeys + send-workflows** on top of it — **Harvest first, then Goods** — assembling from previous rounds, not re-inventing. Build one, prove it, replicate.

## The spine is DONE (don't rebuild — build ON it)
- **Forms route by `projectCode`** — act.place `/api/forms/submit` → `pushToGHL` now derives `project:<code>` + `comms:<project>-newsletter` from projectCode (default ACT-IN). Shipped + deployed 2026-06-02 (act-regenerative-studio PR #51, commit `4ea2d7f`, live green on `act-regenerative-studio.vercel.app`).
- **Consent is live** — `newsletter_consent=Yes` + `consent_source` stamped in code on real newsletter opt-in (PR #49, deployed + verified).
- **The intake webhook fires** — every submit POSTs `{email, formType, projectCode, firstName, lastName, name}` to the GHL Inbound Webhook (hook `8432ee10-f5d5-4f72-a6fb-5f0829b937c6`, location `agzsSZWgovjwgpcoASWG`).
- **Pipelines exist** (GHL ids): Harvest Membership Journey `ijPN2jEoEuMshXXKbQ4z` (Curious→Connected→Member→Active→Steward) · Goods Supporter Journey `JvBFYpVpyKsw899lkFgj` · Goods — Buyer Pipeline `FjMyJM3YzWQFmKqR9fur` · Goods — Demand Register `UQsrmuqzxMSdCTklxEcG` · Empathy Ledger `aRGmSaMh62wPO2R0Bt4g` · Universal Inquiry `ggQw10DuH0XRji6keimS` · Supporters & Donors `QiK57emft8v05hxylmwA` · The Shop `Pdtr1ZIOvg3LrMSeNvHe` · Grants `scom3L0kNwA1W0zPIzMe`.
- **Analytics to measure it** — command-center `/analytics` hub reads the GHL mirror (belonging funnel by rung, consent state, source, per-project). Live. (Vercel deploy panel needs a team-scoped `VERCEL_ANALYTICS_TOKEN`.)
- **The intake rewrite is specced but NOT yet built** (GHL UI, Ben): `thoughts/shared/runbooks/2026-06-02-ghl-ecosystem-journey-intake.md` — create "ACT — Ecosystem Journey" pipeline (5 rungs) + branch the "ACT — Intake" workflow on projectCode. **This is step 0 of the build-out** — do it first so seating is correct.

## The strategy (the model to build to)
One **intake** workflow routed by `projectCode` (the spine) → each project's **belonging journey** (same 5-rung shape Curious→Connected→Member→Active→Steward; only the meaning of Member/Steward changes) → **send-workflows** (nurture/comms) that stay **Draft** until a coordinated, consent-filtered launch. Belonging, not sales. Full strategy: `wiki/decisions/act-ghl-operating-strategy.md`.

## Build FROM these previous rounds (the strategic inputs — read, don't redo)
- `wiki/decisions/act-ghl-operating-strategy.md` — belonging-ladder strategy + LCAA→CRM connector.
- `wiki/decisions/act-site-form-alignment.md` — VERIFIED site→form→GHL map, the projectCode taxonomy, the 5-site reality (each sub-site has its OWN GHL wiring into the shared location), fix list.
- `thoughts/shared/plans/2026-06-02-harvest-ghl-tier1-build.md` — Harvest Tier-1: the 7 decisions, Lane-A tags (`action:/interest:/comms:/consent:`), and **the finding: only 4 of 143 seated Harvest contacts have clean consent → 139 need re-opt-in**.
- `thoughts/shared/runbooks/2026-06-02-ghl-ecosystem-journey-intake.md` — the intake/pipeline build runbook (+ parked CONTAINED area).
- `thoughts/shared/plans/2026-06-02-ecosystem-connective-tissue.md` — the analytics layer (hub built; Vercel feed + per-site SEO are Phases 2/3).
- Memory: `harvest-spend-tagging.md`, `goods-foundation-pipeline.md`, `newsletter-consent-signup-path.md`, `ghl-money-alignment.md`.

## Ordered build-out plan
**Step 0 — finish the spine (GHL UI, Ben):** build "ACT — Ecosystem Journey" pipeline + repoint "ACT — Intake" to route by projectCode (per the runbook). Until this is done, ACT-HV/ACT-GD seat correctly but ACT-IN still lands on Harvest.

**Harvest (ACT-HV) — first, prove the pattern:**
1. Confirm the Harvest Membership Journey rungs' *meaning* for Harvest (CSA member lifecycle) + the entry rung per form (CSA interest = Curious? newsletter-on-Harvest-page = Connected?).
2. Build the Harvest **belonging/nurture send-workflows** (welcome, CSA cadence) — **DRAFT only**; trigger on rung + consent; never send without `newsletter_consent`.
3. The **139 re-opt-in** is the real "launch" — separate, gated, **day-shift, human-in-loop, NEVER AFK**. Plan it as its own consent-filtered campaign.
4. Align the Harvest site's own GHL wiring (`~/Code/The Harvest`, theharvestwitta.com.au) to projectCode + namespaced tags if/when touched (step-8 territory).

**Goods (ACT-GD) — replicate the proven pattern:**
1. Map the three Goods pipelines (Supporter / Buyer / Demand) to the belonging model — note Goods is commerce-allowed (buyers can carry full lifecycle), but supporters/community follow belonging-not-sales.
2. Build Goods send-workflows (supporter nurture, buyer follow-up) — **DRAFT**; commerce-yes/community-never; DGR routing (Goods = The Butterfly Movement) for donations/receipting.
3. Align the Goods site's own GHL wiring (`~/Code/Goods Asset Register/v2`, goodsoncountry.com) to projectCode + namespaced tags (step-8).
4. Tie to the Goods foundation pipeline (supporter/buyer/demand CRM) + the Minderoo $900K pitch context.

## Gates (non-negotiable)
- **Route by projectCode, never formType.**
- **No seat/send without `newsletter_consent`**; consent set in CODE on real opt-in only, never inferred.
- **All send-workflows stay Draft** until a coordinated, consent-filtered launch. Intake/seating workflows send nothing (safe to publish).
- **Commerce-yes / community-never**; storytellers + recipients NEVER funnelled (OCAP).
- **The 139 Harvest re-opt-in = day-shift, human-in-loop. Never queue into an AFK backlog.**
- Tier-2 GHL writes (pipeline/workflow/field config): post "about to do X — proceed?" first. Tier-3 (deploy, send, merge): explicit verb from Ben.

## Parked (revisit ~early-mid June)
- **JusticeHub / THE CONTAINED (ACT-JH)** — grounded + locked in the runbook's "PARKED main area" section; will get its own first-class journey. Until then ACT-JH → Universal Inquiry catch-all.

## Open decisions still needed from Ben
- Harvest journey rung *meanings* + per-form entry rung.
- Goods: donation DGR routing (Butterfly vs Pty) for receipting; which Goods forms feed which pipeline.
- Whether to align JusticeHub/Goods/Harvest sites' own un-namespaced GHL tags to the `project:/role:/comms:` scheme (step-8 per site).
- Team-scoped `VERCEL_ANALYTICS_TOKEN` to light the hub's deploy panel.

## Session trail (all committed)
- **act-global-infrastructure** branch `wip/opus-4-8-prompting-2026-05-31`: `dae9c10` site-map+audit · `afaf559` URLs+CivicGraph · `200e6a6` analytics hub · `64e15ac` Vercel feed · `d000079` interim URL decision · `980473d` GHL UI runbook · `b6e8875` parked CONTAINED · (this handoff).
- **act-regenerative-studio**: PR #51 MERGED (`4ea2d7f`) — projectCode tagging + build fix, live green.
