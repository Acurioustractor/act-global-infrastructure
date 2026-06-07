---
title: GHL UI Runbook — ACT Ecosystem Journey pipeline + projectCode-routed intake
date: 2026-06-02
owner: Ben (GHL UI — API can't create pipelines)
status: ready to action
related: [wiki/decisions/act-site-form-alignment.md, thoughts/shared/plans/2026-06-02-harvest-ghl-tier1-build.md]
---

# GHL UI Runbook — two steps

GHL location: **`agzsSZWgovjwgpcoASWG`** (the only ACT location). Both steps are in the
GHL web UI. Nothing here sends a message — seating an opportunity ≠ sending. The
re-opt-in to the 139 Harvest contacts is a SEPARATE, gated, day-shift task — not here.

**Why now:** the act.place forms now POST `projectCode` to the intake webhook (deployed
2026-06-02, commit 4ea2d7f). The webhook payload carries:
`email · formType · projectCode · firstName · lastName · name`. The intake just has to
obey `projectCode` instead of always seating Harvest.

---

## STEP 1 — Create the "ACT — Ecosystem Journey" pipeline (~3 min)

1. GHL → **Opportunities** → **Pipelines** (top-right) → **+ Create new Pipeline**.
2. Name it exactly: **`ACT — Ecosystem Journey`** (em dash, matching the Harvest one).
3. Add **5 stages, in this order** (mirror the Harvest Membership Journey shape):
   1. **Curious**
   2. **Connected**   ← act.place newsletter signups seat here
   3. **Member**
   4. **Active**
   5. **Steward**
4. **Save.** (No contacts move yet. Migration of any mis-seated contacts is a no-op —
   the audit found 0; nothing was ever wrongly seated because the webhook only just
   went live.)

Reference — existing Harvest pipeline to copy the shape from:
`Harvest Membership Journey` = `ijPN2jEoEuMshXXKbQ4z` (Connected stage `571c3eab-ecca-47e6-a746-cafc04cd7c1c`).

---

## STEP 2 — Rewrite "ACT — Intake" to route by projectCode (~10 min)

Open **Automation → Workflows → "ACT — Intake"** (it exists + is Published).

Current (wrong) shape:
`Inbound Webhook → Find Contact → [Found: Create Opp **Harvest**/Connected + tier:connected + First Action Date] / [Not Found: END]`
— it seats **everyone** on Harvest regardless of project. That's the bug.

### Edit it to:

1. **Trigger** — leave as the Inbound Webhook (hook id `8432ee10-f5d5-4f72-a6fb-5f0829b937c6`). Unchanged.
2. **Find Contact** — unchanged. (Keep the `Not Found → END` branch.)
3. **DELETE** the unconditional "Create Opportunity → Harvest / Connected" action.
4. Add **If/Else** (or a multi-branch) keyed on the webhook value **`projectCode`**
   (reference it as `{{inboundWebhookRequest.projectCode}}` — confirm the exact token in
   the webhook trigger's sample payload after one test submit). Branches:

   | If `projectCode` = | Create Opportunity in pipeline | Stage |
   |---|---|---|
   | `ACT-IN` **or empty** | **ACT — Ecosystem Journey** (new) | **Connected** |
   | `ACT-HV` | Harvest Membership Journey (`ijPN2jEoEuMshXXKbQ4z`) | Connected |
   | `ACT-GD` | Goods Supporter Journey (`JvBFYpVpyKsw899lkFgj`) | first stage (Identified) |
   | `ACT-EL` | Empathy Ledger (`aRGmSaMh62wPO2R0Bt4g`) — **belonging only, OCAP** | Identified |
   | `ACT-JH` / `ACT-BV` / `ACT-AS` / anything else | Universal Inquiry (`ggQw10DuH0XRji6keimS`) | New Inquiry |

   The default/else branch → **Universal Inquiry** (never Harvest).
5. In each branch (or once, before the branches): keep **Add tag `tier:connected`** and
   **Set "First Action Date" = now (if empty)** — the existing native actions.
6. **Save & keep Published.** This workflow only seats; it sends nothing, so Published is safe.

### Test it (do this before trusting it)
- Easiest: submit the **newsletter form on `act-regenerative-studio.vercel.app`** with a
  test email. Expected: contact lands on **ACT — Ecosystem Journey / Connected**, NOT Harvest,
  with `newsletter_consent=Yes`, `project:act-in`, `comms:act-newsletter`.
- Then submit something with `projectCode=ACT-HV` (the Harvest page's form) → lands on Harvest.
- If a branch mis-fires, check the webhook trigger's sample payload for the exact field path.

---

## Guardrails (unchanged)
- **Route by projectCode, never formType.** No form's contact reaches a pipeline its
  `projectCode` didn't name.
- Seating ≠ sending. **All send-workflows stay Draft** until a coordinated, consent-filtered launch.
- **No send without `newsletter_consent`.** Empathy Ledger stays OCAP-gated — belonging, never a funnel.
- The **139 Harvest re-opt-in** is separate, gated, human-in-loop, day-shift. Never queue it AFK.

## Optional (lights up the hub's deploy panel)
Vercel → Settings → Tokens → create a **read-only, team-scoped** token (team `benjamin-knights-projects`)
→ set it as **`VERCEL_ANALYTICS_TOKEN`** in the command-center env (local + Vercel). The
`/analytics` "Site deployments" panel goes live immediately, no code change.

---

## PARKED main area — JusticeHub / THE CONTAINED (`ACT-JH`) — revisit ~early-mid June 2026

Captured 2026-06-02 so the grounding isn't lost; **design deferred a few days** (Harvest + Goods are the priority). Today `ACT-JH` falls into the Universal-Inquiry catch-all above — that's a placeholder; **ACT-JH will get its own first-class journey** ("THE CONTAINED / JusticeHub Journey") when we return.

What it is (don't re-discover this):
- **THE CONTAINED** = a real, mature JusticeHub campaign. *"One container. Three rooms. Thirty minutes."* A **touring physical shipping container**: Room 1 current reality (critical) → Room 2 Diagrama therapeutic alternative (transitional) → Room 3 local community orgs already doing it (hopeful, changes per tour stop).
- Platform stack framing: **CONTAINED = the emotional front door** (what youth detention feels like) → **JusticeHub = the evidence/coordination layer** (what works instead) → Empathy Ledger (consent/authority) → ALMA (evidence engine).
- It runs in its OWN repo + GHL wiring: `~/Code/JusticeHub` (Vercel `justicehub` → justicehub.com.au), `api/ghl/{signup,register,newsletter}` → own `@/lib/ghl/client`, tags `JUSTICEHUB/STEWARD/RESEARCHER`, writing to the SAME GHL location `agzsSZWgovjwgpcoASWG`. NOT act's `/api/forms/submit`.
- Canonical docs already exist in JusticeHub: `compendium/contained-campaign-bible.md` (LOCKED), `compendium/brand-guide.md`, tour/launch runbooks.
- Existing digital touchpoints (scaffolded, not yet tied into one flow): `/contained/{experience, reaction, nominations, join, enroll, momentum, adelaide}` — incl. a **nomination mechanic** (nominate a decision-maker to experience youth-detention reality) + a **reaction capture** + a **role-based `/api/ghl/signup` join**.

The flow hypothesis to grill when we return (NOT decided):
- The rad, distinctive moment = the **physical→digital handoff at emotional peak** — exiting Room 3, scan a QR → ONE contained action → a CONTAINED belonging journey in GHL. The **nomination mechanic** is the likely signature action.
- Open questions parked: who it's for (visitor vs decision-maker vs host-org), the single contained action, the GHL journey + rungs + consent (OCAP — youth-justice content, never extractive, "system-impacted not offenders"), and whether to align JusticeHub's own un-namespaced tags to the `project:/role:/comms:` scheme.
- Brand/voice is LOCKED in the JusticeHub repo (Space Grotesk + IBM Plex Mono, off-white `#F5F0E8`, urgent-red CTAs only) — design to that, real-photos-only, centre agency not trauma.
