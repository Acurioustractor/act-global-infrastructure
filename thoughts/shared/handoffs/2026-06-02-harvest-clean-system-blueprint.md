---
title: Harvest Clean-System Blueprint — build it right, email no one by accident
date: 2026-06-02
status: ready to execute (GHL UI)
companion: act-belonging-model.md · 2026-06-02-harvest-ghl-system-map.md · newsletter-consent-policy.md
---

# Harvest Clean-System Blueprint

> **The one rule above all:** build the structure with **all sending OFF**, and turn sends on **only after consent + your explicit go**. Today ~0 Harvest contacts are opted in, and 6 welcome/receipt workflows are live — so a careless tag edit = an email someone never asked for. This blueprint is ordered to make that impossible.



---

Both policies are aligned. Here is the runbook section.

## SAFE-SETUP RUNBOOK — Build the Harvest System With Sends OFF

> **The one rule everything else serves:** build the whole structure with every automated send switched OFF. Turn sends on only *after* (a) the audience has real opt-in consent and (b) you've given an explicit go. A tag-add, a contact move, or a pipeline seat must NEVER trigger an email. Nobody gets a Harvest email out of the blue.
>
> **Why this matters right now:** 61 contacts carry `comms:harvest-newsletter` but **0** have `newsletter_consent = true`. Per the Newsletter Consent Policy, a tag is a *segment*, not consent — so today almost nobody in Harvest can legally be emailed. The setup below makes sure that fact can't be violated by accident while you build.

### PRE-FLIGHT CHECK — run this before you tag, move, or seat ANYTHING

Do not touch a single contact until all three are true. This is the gate that stops an accidental send.

1. **Open Automation → Workflows.** For all 6 Harvest workflows (Member Welcome, Member Question Receipt, Follow Welcome, Shop Interest Receipt, Locals Day, EOI Gathering Confirmation) confirm the status pill reads **Draft**, not Published.
2. **For each one, open it and read the trigger** (the GHL API can't read triggers — you must look in the UI). Write down, in plain words, "this fires when ___." You are looking for any trigger that fires on **Contact Tag added**, **Added to workflow**, **Pipeline stage changed**, or **Contact created**. Those are the dangerous ones — a tagging sweep would set them off if they were live.
3. **Confirm zero published workflow fires on a tag-add or a pipeline move.** If even one is still Published with that kind of trigger, STOP and set it to Draft first. Only when every Harvest send-workflow is Draft do you proceed.

> Quick mental test before any tagging session: *"If I add this tag to 170 people right now, can a single email leave the building?"* The answer must be a confident **no**, because everything is Draft. If you can't say no, you're not ready — go back to step 1.

### THE COLD-CONTACT RULE (applies forever, not just during setup)

A contact you have not heard "yes, email me" from is a **cold contact**. A tag, a form fill for the shop, a pipeline card, or a name in a spreadsheet is **not** a yes. The only "yes" is `newsletter_consent = true` (with `newsletter_unsubscribed_at` empty). You may *organise, tag, and seat* cold contacts all day — that's internal admin. You may **never auto-email** them. They become emailable only by passing through the re-opt-in (Step 7), one person at a time, by their own click.

### THE ORDERED STEPS

**Step 1 — Switch every Harvest send-workflow to DRAFT/paused first.**
Before anything else, set all 6 workflows to Draft (see Pre-Flight). This is the safety on the gun. With sends off, every later step — tagging, moving, re-pointing triggers — is harmless. Do this *first*, every time, even if you think they're already off.

**Step 2 — Build the Membership Journey pipeline (the belonging ladder).**
You have Harvest Inbox and The Shop pipeline, but **no membership pipeline**. Create one with stages mirroring the ladder: **Curious → Connected → Member → Active → Steward**. Building an empty pipeline sends nothing — it's just columns. Seating people comes next, and it's still safe because Step 1 paused the sends.

**Step 3 — Seat and tag the ~170 contacts (this must NOT fire a send — and it won't, because Step 1 paused everything).**
Move each contact into the right Membership Journey stage and apply tier/interest tags. Because every workflow is Draft, a tag-add and a stage-move are pure admin — no email leaves. Use the canonical tags only (see Step 4) so you don't deepen the duplication. Tier lives in tags: `tier:curious / tier:connected / tier:member / tier:active / tier:steward`.

**Step 4 — Re-point every workflow trigger to the canonical tags (still paused).**
Right now tags are duplicated because the migration added new ones beside the old (`harvest-member` ↔ `role:member`, `harvest-shop-interest`/`shop-prospect` ↔ `interest:shop`, `harvest-newsletter` ↔ `comms:harvest-newsletter`, `act-hv`/`harvest-website` ↔ `project:act-hv`, `interest-membership` ↔ `interest:membership`). Pick the **canonical** side as the standard — the namespaced `comms: / role: / interest: / project:` tags — and edit each workflow's trigger to listen on the canonical tag. Do this while everything is still Draft. Nothing fires; you're just rewiring the plumbing.

**Step 5 — Add a `newsletter_consent = true` filter to the FRONT of every send-workflow.**
This is the belt-and-suspenders that makes a future accident impossible. In each workflow, the **first step after the trigger** must be a condition/filter: *if `newsletter_consent` is not `true` → exit the workflow.* Now even if a trigger fires on someone, the email stops dead unless they've legally opted in. (Receipt/confirmation workflows the person explicitly triggered themselves — e.g. a shop enquiry reply — are transactional, not marketing; keep those clearly separated and reviewed one at a time, not swept into the broadcast list.)

**Step 6 — Only NOW re-publish — and even then, sends reach only opted-in contacts.**
With triggers re-pointed (Step 4) and the consent filter in front (Step 5), you can move workflows from Draft to Published. Re-publish **one at a time**, watch it, confirm the consent filter is holding. Because the audience is `newsletter_consent = true` and that count is currently **0**, publishing sends to nobody until the next step grows the list. That's the point: structure is live, sends are still effectively dark.

**Step 7 — Run the re-opt-in to grow the consented list.**
This is the only lever that turns Harvest from 0 emailable people into a real audience. Send a one-time **"confirm your subscription"** message (transactional in nature — telling them they're on the Harvest segment and asking them to confirm) to the 61 `comms:harvest-newsletter`-tagged contacts. The confirm link writes `newsletter_consent = true` + `newsletter_consent_at = NOW()`. Anyone who doesn't confirm in 30 days keeps the tag but is **never** auto-emailed. From here, your real Harvest audience is whoever clicked yes — and only they ever receive a broadcast.

### THE ORDER IN ONE LINE

Pause sends (1) → build the empty pipeline (2) → seat/tag everyone, safely, sends still off (3) → re-point triggers to canonical tags, still off (4) → put a consent filter in front of every send (5) → only then re-publish, reaching opted-in people only (6) → re-opt-in to actually grow who's reachable (7). At no point can a tag-add or a move put an email in someone's inbox.


---

## WORKFLOWS + AUTO-EMAIL RISK

> **The one-line danger:** six Harvest workflows are *published* (live) right now. Several of them send a welcome or receipt email/SMS the moment a contact gets a certain tag or lands in a pipeline. If our tag clean-up touches a contact those workflows are watching, **the contact gets emailed** — even though, legally, almost none of our Harvest contacts can be emailed (0 are opted in). So before we touch a single tag, we open each workflow and confirm what wakes it up and whether it sends.
>
> ⚠ **Why everything below says "inferred":** the GHL API cannot read a workflow's trigger or its steps (`GET /workflows/{id}` returns 404). Every "fires on" and "sends?" below is a **best guess from the workflow's name** — not confirmed. The whole point of this section is that *you* confirm them in the GHL UI.

### The 6 published Harvest workflows

| # | Workflow | Inferred trigger (what wakes it) | Sends an email/SMS? | Risk it fires while we work |
|---|---|---|---|---|
| 1 | **Member Welcome** | contact gets a "member" tag (`harvest-member` / `role:member`) | **YES — welcome message** | 🔴 **HIGH.** 64 contacts carry `harvest-member`. Re-pointing this to `role:member`, or adding `role:member` to anyone, could re-fire a welcome to all of them. |
| 2 | **Member Question Receipt** | contact gets a "member question" tag, or a member-question form submit | **YES — receipt reply** | 🟠 MEDIUM. Fires on a question event, but if it's tag-triggered, tag edits can trip it. |
| 3 | **Follow Welcome** | a general Harvest "follow/signup" tag (unclear which) | **YES — welcome message** | 🔴 **HIGH + UNKNOWN.** We don't know which tag fires it, so we can't predict what trips it. Confirm first. |
| 4 | **Shop Interest Receipt** | contact gets a shop-interest tag (`harvest-shop-interest` / `interest:shop`) | **YES — receipt reply** | 🟠 MEDIUM. ~28+4 contacts in the Shop pipeline plus anyone tagged shop-interest could be re-hit. |
| 5 | **Locals Day** | event tag (`locals-day-march-2026`) | **YES — confirmation message** | 🟢 LOW. Event-specific, one-off; few or no contacts re-tagged. Still confirm before touching. |
| 6 | **EOI Gathering Confirmation** | event tag (`eoi-gathering-march-2026`) | **YES — confirmation message** | 🟢 LOW. Same as above — event-specific, one-off. |

All six are **welcome / receipt / confirmation** workflows, which is exactly the category that **sends**. Treat all six as "assume it sends until you've looked."

### The core safety finding

**Three ordinary clean-up actions can trip a live send-workflow:**

1. **Adding a tag** — if you add `role:member` (or `interest:shop`, etc.) to a contact, and a published workflow is watching for that tag, GHL fires it. An automated welcome email goes out.
2. **Moving a contact into a pipeline** — dropping someone into "The Shop pipeline" or a future membership pipeline can be a trigger in its own right, or can be paired with a tag that is.
3. **Enrolling / re-pointing a workflow** — when you change a workflow's trigger and republish it, contacts who *already* carry the new tag can be swept in and emailed retroactively.

**The rule (non-negotiable):**

> **Every send-workflow must filter on `newsletter_consent = true` before it sends — and today roughly ZERO Harvest contacts pass that filter.**
>
> We have **61 contacts tagged `comms:harvest-newsletter` but 0 with `newsletter_consent` set** (the consent policy is explicit: *a tag is a segment, not consent — never send on tag alone*). So right now, **no Harvest contact can legally be auto-emailed**. Any welcome/receipt that fires during clean-up is both an annoyance *and* a consent breach.
>
> Until each send-workflow has a consent filter on it, the safe state is: **don't add a watched tag, don't move contacts into a watched pipeline, and don't republish a send-workflow against contacts who already hold the new tag.**

### What Ben must CONFIRM IN THE UI before we touch any tags

Open **Automation → Workflows**, open each of the 6 below, and for each one read two things off the canvas: **(a) the Trigger card** at the top, and **(b) whether there's a send step** (an "Send Email" or "Send SMS" action anywhere in the steps). Then fill in this table:

| Workflow | (a) What's the EXACT trigger? (tag name / form / pipeline stage) | (b) Does it have a Send Email / Send SMS step? (Y/N) | (c) Does that send step already filter on consent? (Y/N) |
|---|---|---|---|
| Member Welcome | ☐ | ☐ | ☐ |
| Member Question Receipt | ☐ | ☐ | ☐ |
| Follow Welcome | ☐ ← **especially this one, trigger is unknown** | ☐ | ☐ |
| Shop Interest Receipt | ☐ | ☐ | ☐ |
| Locals Day | ☐ | ☐ | ☐ |
| EOI Gathering Confirmation | ☐ | ☐ | ☐ |

**Until that table is filled in, we change no tags and move no contacts.** If any workflow has a send step with **no consent filter (column c = N)**, the fix order is: **first add the `newsletter_consent = true` filter (or unpublish the workflow), then** do the tag re-point. Never the other way around.

**Fastest safe option if you'd rather not audit each one first:** flip all 6 from **Published → Draft** before we start tagging. A drafted workflow cannot fire. We re-publish them one at a time *after* each has a consent filter. (This is the recommended path given 0 contacts are opted in.)


---

## Membership System Design

> The one new board worth building. Every Harvest contact lives here, and you move them up. This replaces "newsletter list" thinking with a belonging ladder.

### The pipeline: Harvest Membership Journey

A new GHL pipeline with **five stages — one per rung of the belonging ladder.** Build it in GHL under Opportunities → Pipelines, named exactly **Harvest Membership Journey**.

| Stage | The contact is… | They get here by… |
|---|---|---|
| **1. Curious** | aware, in the system, not engaged | landing in the system at all (form, event, import) |
| **2. Connected** | opted in, getting the story, warming | saying yes to the newsletter / belonging invite |
| **3. Member** | committed — joined the CSA, contributes, belongs | joining the CSA or formally signing up as a member |
| **4. Active** | shows up — gatherings, volunteering, events | doing the thing (attends, volunteers, runs a stall) |
| **5. Steward** | aligned — champions it, brings others, co-stewards the farm | you'd hand them keys: they bring people, advise, co-own |

Everyone starts somewhere on this board and only ever moves **up**. The goal isn't a bigger list — it's more people in stages 3–5 this quarter than last.

### Seating the existing ~170 contacts

Place every contact on the board at the rung their **current tags** already prove. Read the tags top-to-bottom and stop at the first match — the highest rung a contact qualifies for wins.

| If the contact has… | Seat them at | Why |
|---|---|---|
| `harvest-member` / `role:member` (64 contacts) | **Member** | They already told us they joined. Strongest signal we have. |
| opted-in to newsletter (`newsletter_consent` = yes) | **Connected** | They legally said yes to the story. *(Today: 0 contacts — see below.)* |
| anyone else (the rest of the ~170) | **Curious** | In the system, not yet engaged. The honest default. |

**One rule decides everything:** a contact's rung is the **highest** thing their tags prove, never an average. A `harvest-member` who hasn't re-opted-in still seats at **Member** — joining outranks email consent.

**The consent reality you can't dodge:** 61 are tagged `comms:harvest-newsletter` but **0 are opted in**, so right now almost nobody seats at Connected by consent — and you cannot legally email the rest until they re-opt-in. The re-opt-in email is not "join our list," it's **"come belong to Harvest."** The first yes moves a contact Curious → Connected. That email is the engine that fills the Connected stage.

**Do NOT use the rich interest tags to seat rung.** Interest in `events`, `markets`, `workshops`, `garden` etc. tells you *what to invite them to* — it does not mean they've climbed. A contact tagged `interest:events` who's never shown up is still **Curious**, not Active. Interests drive the invitation; behaviour drives the rung.

### The tier: tag ↔ pipeline-stage sync

The pipeline stage and the `tier:` tag are **two views of the same fact** and must always agree:

- **Stage** = the board you work inside Harvest.
- **`tier:` tag** = the same status, but readable across the whole ACT ecosystem (so a Harvest steward can show as `tier:connected` in Goods at the same time).

| Pipeline stage | Tier tag |
|---|---|
| Curious | `tier:curious` |
| Connected | `tier:connected` |
| Member | `tier:member` |
| Active | `tier:active` |
| Steward | `tier:steward` |

**The discipline:** whenever a contact moves stage, set the matching `tier:` tag and remove the old one. Move to Member → tag `tier:member`, drop `tier:connected`. One tier tag per contact, always equal to their stage. When the seeding above runs, stamp the tier tag at the same time you place the card (the 64 Members get `tier:member`; everyone else gets `tier:curious`).

### Shop runs in parallel — a member can also be a buyer

The **Membership Journey is about belonging; The Shop pipeline is about commercial trade.** They are separate boards and a person can sit on both at once — a CSA `tier:member` who also stocks produce in their Witta café belongs in *both* the Member stage here and a Shop pipeline stage there. **Never collapse one into the other.** Membership measures depth of belonging; Shop measures produce sales. Tag the buyer side with `role:buyer` + `interest:shop`; leave their membership rung untouched. The two boards answer two different questions and both stay live.

---

Net seating from today's facts: **64 → Member**, **0 → Connected** (until the re-opt-in lands), **~106 → Curious**. The whole game from here is moving Curious up — and the re-opt-in "come belong" email is move number one.


---

## TAGS AUDIT — Harvest

Tags are your real categories. Pipelines are just two boards (Membership Journey + The Shop); everything else a contact "is" or "wants" lives in a tag. The plan: settle on ONE clean tag per thing, retire the old duplicates **only after the workflow that listens to the old tag has been re-pointed**, and bin the junk. Do nothing destructive until the workflow step is done — pulling a tag a workflow still listens to silently breaks the automation.

### KEEP — the canonical set (this is the whole vocabulary)

Every Harvest tag should be one of these. Format is always `namespace:value` (lowercase, hyphenated).

| Namespace | What it answers | Keep these values |
|---|---|---|
| `project:` | Which ACT project | `act-hv` |
| `role:` | What they are to Harvest | `member` · `buyer` · `volunteer` · `maker` · `chef` · `artist` · `partner` |
| `interest:` | What they've told us they care about | `membership` · `community` · `events` · `markets` · `workshops` · `garden` · `food` · `volunteer` · `sustainability` · `venue` · `shop` |
| `tier:` | Where they are on the belonging ladder | `curious` · `connected` · `member` · `active` · `steward` |
| `comms:` | What they've consented to receive | `harvest-newsletter` |
| `source:` | How they first arrived | `harvest-website` · `prospecting-witta` · `event:locals-day-2026` · `event:eoi-gathering-2026` |
| `place:` | Where they are | `witta` · `maleny` |

### RETIRE LATER — old → canonical (do NOT remove until the workflow is re-pointed)

Each row is a duplicate left behind by the additive migration. **Re-point the listed workflow to the canonical tag in the GHL UI first, confirm it fires, THEN bulk-remove the old tag.** Until then, the old tag is load-bearing.

| Old (flat) tag | Canonical tag | Re-point this workflow first | Then safe to retire |
|---|---|---|---|
| `harvest-member` | `role:member` | Harvest - Member Welcome | after re-point + confirmed |
| `member-question` | `role:member` | Harvest - Member Question Receipt | after re-point + confirmed |
| `interest-membership` | `interest:membership` | (no workflow) | retire now-ish, low risk |
| `harvest-shop-interest` | `interest:shop` | Harvest - Shop Interest Receipt | after re-point + confirmed |
| `shop-prospect` | `interest:shop` | (no workflow — merges into `interest:shop`) | retire with `harvest-shop-interest` |
| `harvest-newsletter` | `comms:harvest-newsletter` | (no workflow — consent flag only) | retire now-ish, low risk |
| `act-hv` / `harvest-website` | `project:act-hv` / `source:harvest-website` | Harvest - Follow Welcome *(confirm which tag it listens to)* | after re-point + confirmed |
| `locals-day-march-2026` | `source:event:locals-day-2026` | Harvest Locals Day | after re-point + confirmed |
| `eoi-gathering-march-2026` | `source:event:eoi-gathering-2026` | Harvest — EOI Gathering Confirmation | after re-point + confirmed |

> Two of these (`interest-membership`, `harvest-newsletter`) have no workflow watching them, so they can go straight away. The rest wait their turn behind a workflow re-point.

### DELETE — junk, no canonical home

| Tag | Why it goes |
|---|---|
| *(any bare one-off event tag with no `source:` twin)* | If an old event tag has no canonical `source:event:*` partner and no live workflow, delete it — don't migrate it. Event history belongs in `source:`, not a loose tag. |
| *(any free-typed / misspelled variant)* | Singular/plural or typo'd copies of a canonical tag (e.g. a stray `interest:event` vs `interest:events`) — merge onto the canonical spelling, delete the variant. |

> Confirm the exact delete list against a live tag export before pulling anything — the trigger and step details of all 6 workflows are currently **inferred** (the GHL API can't read workflow triggers), so eyeball each workflow in the UI before retiring the tag it might depend on.

### The one rule to remember

**Re-point, confirm, then retire.** A tag a workflow still listens to is not a duplicate — it's wiring. Cut it last, never first.
