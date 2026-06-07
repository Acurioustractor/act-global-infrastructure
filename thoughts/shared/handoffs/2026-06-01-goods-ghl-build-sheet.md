---
title: Goods GHL Build Sheet — make the funnels operational (UI steps)
date: 2026-06-01
status: ready to build (GHL UI)
companion: wiki/decisions/ghl-operating-system.md · goods-ghl-operating-model.md · plans/2026-06-01-goods-drip-feed-content-plan.md
---

# Goods GHL Build Sheet — turn the design into a running system

> What's already **done in code** (you don't touch): tags canonicalised (EXPAND), junk deleted, mirror resynced, and the **4 audiences enrolled** — every Goods contact now carries its `comms:<audience>-drip` tag. What's **left is GHL-UI work** (the API can't build workflows/forms/Smart Lists) — this sheet is that work, in order.

## The audiences as they actually are (built 2026-06-01)

| Audience | Enroll tag | In audience | **Send-ready (opted-in)** | Pipeline |
|---|---|---|---|---|
| Funder | `comms:funder-drip` | 69 | **24** | Supporter Journey |
| Supporter | `comms:supporter-drip` | 93 | **70** | Supporter Journey |
| Buyer | `comms:buyer-drip` | 48 | **2 ⚠** | Buyer Pipeline |
| Partner | `comms:partner-drip` | 229 | **32** | Supporter Journey (partner lane) |

**⚠ The headline truth: of 439 enrolled, only ~128 are opted-in to receive sends.** Tags are *segments*; the only legal send signal is `newsletter_consent = true` (`newsletter-consent-policy.md`). So **Step 0 below is a re-opt-in step** — especially for **buyers (2 of 48)**, whose funnel has almost no send-ready audience until they opt in.

## Pipeline correction (do this first, 5 min)

The drip plan mapped funders to **Demand Register** — but that pipeline only has `Signal → Buyer Matched` (it's for *community demand*, not funder cultivation). Correct mapping:
- **Buyers →** Goods — Buyer Pipeline *(Outreach Queued → Qualified → In Conversation → Proposed → Invoiced → Paid)* — already fits.
- **Funders + Supporters + Partners →** Goods Supporter Journey *(Identified → Qualified → Cultivating → Ask made → Delivering → Stewarding/Reporting → Renewing)* — this is the relationship-cultivation pipeline; use it for all three, distinguishing them by their `role:` + `comms:` tag.
- **Demand Register** stays for community need signals (Track A territory), not a Track-B funnel.

---

## Step 0 — Re-opt-in capture (so sends can actually go out)
1. Build a short **"stay in the loop" opt-in form** (GHL → Sites → Forms) that writes **both** `newsletter_consent = true` **and** the project tag `comms:goods-newsletter`, plus `source:` + `project:act-gd`.
2. Run a one-touch **re-permission email** to the segment-only contacts (enrolled but `newsletter_consent` false) — *"want to keep getting the Goods story? confirm here."* Lead with the buyers and partners (biggest opted-out gap).
3. Everyone who confirms flips to send-ready and the funnels reach them.

## Step 1 — Fix the `/partner` form (fastest conversion win)
On `goodsoncountry.com/partner`: **remove "Roughly what size are you thinking?"** from the first step (Croft's note — friction at the worst moment). Make it a **stage-2** question on a follow-up after the initial submit. Ensure the form stamps `source:partner-form` + `project:act-gd` + `role:partner` + UTMs.

## Step 2 — Build the 4 drip workflows (GHL → Automation → Workflows)
For each audience, one workflow. Same shape:
- **Trigger:** Contact Tag added = `comms:<audience>-drip`.
- **First filter:** `newsletter_consent = true` (or GHL email-opt-in) — *if false, exit* (no send; they sit in the segment for the re-opt-in campaign).
- **Steps:** the touches from `plans/2026-06-01-goods-drip-feed-content-plan.md` §B (Funder = 8, Buyer = 6, Supporter = 7, Partner = 6), each an Email step with a wait between (≈1/week).
- **Stage updates:** at the ask touch, move the contact's opp to the pipeline stage (Supporter Journey *Ask made* / Buyer *Quote*).
- **Consent gate inside:** any touch built on a community asset only goes live once cleared — Utopia content is now CLEARED (the `2026-06-01-utopia-trip-story-approval`), so all Track-B touches are buildable; keep the 4 un-verified names un-named.

Build **Supporter** first (70 send-ready — the biggest live audience) as the tracer, then Funder, Partner, Buyer.

## Step 3 — Smart Lists (GHL → Contacts → Smart Lists)
Build one per audience for at-a-glance management:
- `Goods · Funders (send-ready)` = tag `role:funder` + tag `project:act-gd` + `newsletter_consent = true`.
- Same for supporter / buyer / partner. These are the lists you watch and the social/newsletter targets.

## Step 4 — Social Planner
Connect the Goods channels in GHL → Marketing → Social Planner, so all social posts schedule from one place (the same story beats, repurposed). The agent drafts → intern queues here.

## Step 5 — The 26 workflow re-points
Per the earlier checklist `2026-06-01-ghl-workflow-migration-checklist.md` — re-point triggers to canonical tags, delete the 4 empty drafts, publish the Contained draft. (Independent of the Goods funnels; do when convenient.)

---

## Definition of done (the system "rolls out from workflows/audiences/funnels")
- [ ] Re-opt-in form + campaign live; send-ready audience climbing past 128.
- [ ] `/partner` form de-frictioned.
- [ ] 4 drip workflows built, Supporter live first.
- [ ] 4 Smart Lists built.
- [ ] Social Planner connected.
- [ ] 26 workflows re-pointed.

Once these are ticked, content (the drip plan) flows through the funnels automatically — the agent+intern loop just feeds the touches. **The plumbing is the part that had to be finished first; this sheet finishes it.**
