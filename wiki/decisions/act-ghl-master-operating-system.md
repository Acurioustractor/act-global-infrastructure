---
title: ACT GHL Master Operating System — the whole account as one system
date: 2026-06-02
status: active
owner: Ben
related: [act-belonging-model, comms-architecture, ghl-operating-system, ghl-tag-taxonomy, 2026-06-02-harvest-clean-system-blueprint]
---

# ACT GHL Master Operating System

> One account, every project, one shape. Everything serves the **belonging ladder** (Curious → Connected → Member → Active → Steward). You log in each morning and see the whole org's life in four places. Nobody is ever emailed without consent.

## 1. The daily login view — the four surfaces

What you check each morning. Each is one of GHL's main left-nav items.

| Surface | What it shows | Your daily move |
|---|---|---|
| **Conversations** | every inbound — SMS, email, social DM, web chat — in one inbox | triage; approve the AI's *commercial* drafts, write *community* replies by hand |
| **Opportunities** | the Journey pipelines (belonging ladders) + the Shop/Grant boards | who moved a rung, who's stuck, who to nudge |
| **Calendar** | bookings — gatherings, consults, meetings | who's coming; a booking can lift someone to Active |
| **Dashboard** | the numbers — contacts by tier/project, new this week, pipeline value | the org's pulse in one screen |

That's "log in to see activity": Conversations = the talking, Opportunities = the belonging, Calendar = the meeting, Dashboard = the count.

## 2. The organising layer (so it never sprawls)

- **Folders** — one **workflow folder per project**: `The Harvest` · `Goods` · `JusticeHub` · `Empathy Ledger` · `ACT Core`. Every workflow lives in its project folder. (Also name pipelines + Smart Lists `Project — Thing`.)
- **Tags = the categories** — the canonical namespaces only: `project:` · `role:` · `tier:` · `interest:` · `comms:` · `source:` · `place:` (see `ghl-tag-taxonomy.md`).
- **The ladder = the spine** — each project has a **Journey pipeline** whose stages are the five rungs. `tier:` tag stays in sync with the stage.
- **Smart Lists = saved views** — `Harvest · Members`, `Goods · Funders tier:active`, etc. These are what you filter and what social/newsletters target.

## 3. The content engine — send people different things by their level

This is the core. What someone receives is decided by the intersection of **tier × project × role**, always consent-gated.

**By tier (how deep they belong):**
| Rung | What they get |
|---|---|
| Curious | the invitation to connect (re-opt-in) — nothing else |
| Connected | the project newsletter — the story, value, no asks yet |
| Member | member updates + the first real asks (renew, give, attend) |
| Active | deeper involvement, recognition, bring-a-friend |
| Steward | co-creation, board/advisory, advocacy asks — the keys |

**By project:** each has its newsletter (`comms:<project>-newsletter`) + its drips.
**By role:** funders get funder content, buyers get product, partners get governance.

A GHL workflow or a scheduled send targets a **Smart List = the intersection** (e.g. `Goods · tier:member · role:funder` who are `newsletter_consent=true`). One engine, repeated per project. **Every send filters on `newsletter_consent=true` first** — a tag is a segment, not consent.

## 4. The surfaces wired

- **Calendar:** booking pages for gatherings / consults / funder meetings. A booking tags the contact (`interest:`, `source:event:…`) and flags an **Active** candidate.
- **Conversations:** the unified inbox + the **AI agent in suggest mode** — drafts *commercial* first-touch in ACT voice, *community* conversations stay human (the commerce-yes/community-never rule, `comms-architecture.md`).
- **Analytics:** GHL Dashboard for conversion + the belonging counts; the **Supabase mirror → command-center** for deeper analysis; **web traffic** via GA4/Plausible per site, attributed back through `source:` + UTM on every form.

## 5. Global Workflow Settings (set once)

- **Notifications: ON** — add Ben's email so workflow errors reach you (default is off).
- **Default builder: Standard** — fine for drips; Advanced only for complex branching.
- **Auto-save: ON** (already).
- **Who can switch builders:** leave sub-account roles unchecked unless an intern needs it.
- **Pause Workflow scheduler:** use it for the coordinated-launch window (below).
- Plan: Workflow Pro – Growth, 432/30,000 executions — plenty of headroom.

## 6. The coordinated launch (pause → build → launch together)

Do it all at once, cleanly, with sends off the whole time:

1. **PAUSE everything** — set all published workflows to Draft (or schedule a pause window). Sends are now impossible.
2. **Build the structure** — folders per project; a Journey pipeline per project; seat contacts on rungs; Smart Lists; Calendar booking pages; the Conversations AI agent config.
3. **Re-wire workflows** — re-point every trigger to its canonical tag; add the `newsletter_consent=true` filter to the **front of every send-workflow**.
4. **Verify** — for each send-workflow: "can this reach a non-consented person?" must be **no**.
5. **Re-publish together** — flip all back to Published in one sitting. They reach only opted-in contacts (≈0 until step 6).
6. **Run the re-opt-ins** per project — the only thing that grows who's reachable. This is the launch.

## 7. Per-project rollout (same shape every time)

| Project | State | Next |
|---|---|---|
| **Harvest** | ladder + Membership Journey pipeline built, 143 seated | re-point + consent-filter the 6 workflows, then re-opt-in |
| **Goods** | Supporter Journey pipeline + drip plan exist | relabel stages to the 5 rungs + `tier:`; seat contacts; consent-filter |
| **JusticeHub** | CONTAINED list + draft launch workflow | build the journey; finish + consent-filter the Contained workflow |
| **ACT Core** | main newsletter (114) | Ecosystem Membership journey, later |
| **Empathy Ledger** | storyteller content | **org-partner** journey only — storytellers stay sovereign |

Only the meaning of *Member* and *Steward* changes per project. The shape — ladder, pipeline, tags, consent-gated content engine, four daily surfaces — is identical everywhere.
