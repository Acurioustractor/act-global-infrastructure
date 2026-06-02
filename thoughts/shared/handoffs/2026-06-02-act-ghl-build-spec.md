---
title: ACT GHL Build Spec — build exactly this on the clean slate
date: 2026-06-02
status: ready to build (GHL UI)
companion: act-ghl-master-operating-system.md · act-belonging-model.md · comms-architecture.md · ghl-tag-taxonomy.md
---

# ACT GHL Build Spec

> The concrete "build exactly this" doc, on the clean slate (6 folders, junk deleted, senders Draft, System pipes Published). Order: lock the **global settings + standards** → the **tag system** → the **Smart Lists** → the **workflows**. The one rule that overrides everything: **every marketing send starts with an `newsletter_consent = true` filter; no exceptions.**



---

## GLOBAL SETTINGS + STANDARDS

> Set these once, then never deviate. These are the rules that stop the account sprawling and stop anyone ever being emailed without consent. The #1 rule below is non-negotiable.

### Part A — GHL Global Workflow Settings (set once, today)

In GHL, go to **Automation → top-right gear / Settings** and set exactly this:

| Setting | Set it to | Why |
|---|---|---|
| **Workflow error notifications** | **ON**, recipient = `benjamin@act.place` | Default is OFF. Without this a broken send fails silently. You want the email when a workflow errors. |
| **Default workflow builder** | **Standard** | Fine for every drip and receipt we build. Only switch a single workflow to Advanced if it genuinely needs multi-branch logic — never set Advanced as the account default. |
| **Auto-save** | **ON** | Already on. Confirm it. Stops lost edits mid-build. |
| **Who can switch builders / edit workflows** | **Ben only.** Leave all sub-account user roles unchecked. | One hand on the automation wheel until the system is stable. Add an intern role later, deliberately, not by default. |
| **Workflow timezone** | **Australia/Brisbane (AEST)** | So scheduled sends fire at the hour you intend. |

Leave **Pause Workflow scheduler** alone day-to-day — it's the lever you pull only for the coordinated-launch window (see doc §6).

### Part B — The non-negotiable standards (every workflow, every time)

**1. CONSENT GATE FIRST — the rule nothing overrides.**
Every **marketing/send** workflow's **first step after the trigger** is an **If/Else** condition:

- **Condition:** `newsletter_consent` **is** `true` (custom field check)
- **Yes branch →** continue the workflow (the email/SMS sends)
- **No branch →** **add to nothing, send nothing, exit the workflow** (drop the contact out)

If you cannot point at that If/Else as step 1, the workflow is not allowed to be Published. A tag (`tier:member`, `project:goods`) is a **segment, not consent** — consent is only the `newsletter_consent=true` field. Today ~0 contacts pass this gate; that is correct and safe. The re-opt-in campaigns are the only thing that grows the reachable list.

**2. Transactional vs Marketing — know which you're building (decides whether rule 1 applies).**

| Type | Definition | Consent gate? | Examples (keepers) |
|---|---|---|---|
| **Transactional** | A reply to an action the person *just took themselves* — they filled in a form, placed an order, asked a question. A single acknowledgement back. | **No gate needed** (they triggered it) — but **one message only, no follow-up drip** | Goods Inquiry → Acknowledge · New Order Notification · Member Question Receipt · Shop Interest Receipt · Member Welcome · Follow Welcome · Contact → Universal Inquiry |
| **Marketing** | Anything broadcast, scheduled, or sent *to* a person not in direct reply to an action — newsletters, drips, campaigns, re-engagement, event invites. | **YES — rule 1, no exceptions** | Newsletter Signup engine · any future drip · any project newsletter · re-opt-in campaigns |

If in doubt, it's marketing → gate it. A transactional workflow that grows into a drip becomes marketing the moment it adds a *second, unrequested* message — at that point it needs the gate.

**3. Naming convention — `Project — Thing`, every object.**
Workflows, pipelines, and Smart Lists all read `Project — Thing`:
- `Goods — Inquiry Acknowledge` · `Harvest — Member Welcome` · `ACT Core — Newsletter Signup` · `JusticeHub — Contained Launch`
- System pipes are the only exception: prefix `System — ` (e.g. `System — Gmail Email to Contact`, `System — Sync to Supabase`).
A glance at the name tells you the project, the folder it belongs in, and what it does.

**4. One folder per project — no orphans.**
Every workflow lives in exactly one of the **6 folders**: `ACT Core` · `Goods` · `JusticeHub` · `The Harvest` · `Empathy Ledger` · `System`. If a workflow doesn't have an obvious home folder, it doesn't belong in the account — delete or rethink it. No workflow at the account root.

**5. Senders stay DRAFT until the coordinated launch.**
Every send/marketing workflow stays **Draft** until the §6 launch sitting. The only things **Published** now are the **System** pipes (`Gmail Email to Contact`, `Sync to Supabase ×2`). Re-publish senders together, after the consent gate is verified on each — never one-off flip a sender live.

**6. One tag namespace, kept in sync.**
Use only the canonical namespaces (`project:` `role:` `tier:` `interest:` `comms:` `source:` `place:`). When a workflow moves someone up a rung, it updates **both** the `tier:` tag **and** the Journey pipeline stage — they never disagree.

**7. Source-stamp every entry point.**
Every form/trigger that creates or touches a contact adds a `source:` tag (e.g. `source:form:goods-media`, `source:event:witta-gathering`). No untracked contacts — you must always be able to answer "where did this person come from?".

### Part C — Pre-publish checklist (run on every workflow before flipping it to Published)

- [ ] Named `Project — Thing` (or `System — Thing`)?
- [ ] Sitting in the correct one of the 6 folders?
- [ ] Classified: transactional or marketing?
- [ ] **If marketing → is step 1 the `newsletter_consent=true` If/Else, with the No-branch exiting?**
- [ ] If transactional → confirmed it sends **one** message and starts no unrequested drip?
- [ ] Trigger points at a **canonical tag/field**, not a one-off legacy tag?
- [ ] Adds a `source:` tag on entry?
- [ ] Ran the test: *"Can this reach a person with `newsletter_consent` ≠ true?"* — answer must be **NO** for every marketing workflow.

If any box is unchecked, it stays **Draft**.


---

Both docs are read. The two namespaces collide on one fact (`temp:` heat vs `tier:` belonging rung), and the belonging doc supersedes the taxonomy doc on the ladder. I'll reconcile them into one locked vocabulary and write the canonical section.

## TAG SYSTEM — LOCKED

> **Status: canonical as of 2026-06-02.** This section is the single source of truth for the GHL tag vocabulary. It supersedes the namespace table in `ghl-tag-taxonomy.md` wherever they differ (specifically: the belonging ladder is `tier:`, and `temp:` is retired into it — see Reconciliation note at the end). Follow it literally. Two rules govern everything below:
>
> 1. **One fact = one tag.** Never two tags for the same fact. If a flat duplicate exists, it is a retire-candidate, not a second truth.
> 2. **A tag never duplicates a pipeline stage.** The pipeline stage says *where someone is in one journey*. Tags say *who they are, what they want, where they're from, how they arrived* — facts true no matter what stage they're at.

---

### 1. The canonical tag vocabulary (namespaces + allowed values)

Every tag is `namespace:value`. The separator is a **colon** (`:`), never a hyphen, for the namespace boundary. Anything without a colon is a legacy flat tag and is on the retire list. These are the **only** namespaces. Do not invent new ones without adding them here first.

| Namespace | Answers | Allowed values (the closed list) |
|---|---|---|
| `project:` | which ACT project | `act-core` (Regen Studio + infra), `act-in` (Innovation Studio), `act-el` (Empathy Ledger), `act-jh` (JusticeHub), `act-gd` (Goods), `act-hv` (Harvest), `act-fm` (Farm / Black Cockatoo Valley), `act-pi` (PICC), `act-oo` (Oonchiumpa), `act-ce` (Custodian First Economy), `act-bg` + `act-my` (Mount Isa cluster), `act-cn` (CivicGraph) |
| `role:` | what they **are** to us | `funder`, `supporter`, `buyer`, `supplier`, `partner`, `storyteller`, `community`, `community-controlled`, `council`, `health-service`, `land-council`, `media`, `gov`, `vendor`, `elder`, `advisory` |
| `tier:` | belonging rung (the ladder) | `curious`, `connected`, `member`, `active`, `steward` |
| `interest:` | what they **want** | `membership`, `events`, `markets`, `workshops`, `garden`, `food`, `volunteer`, `washer`, `container`, `justice-reform`, `venue` |
| `place:` | geography | states: `nt`, `qld`, `sa`, `nsw`, `vic`, `wa`, `tas`, `act-territory` · cities: `adelaide`, `brisbane`, `canberra`, … · communities: `community:mount-liebig`, `community:<name>` |
| `source:` | how they arrived (attribution — never changes) | `website`, `footer`, `contact-form`, `linkedin`, `xero`, `grantscope`, `gmail-discovery`, `event:naidoc-2026`, `event:parliament-demo`, `event:canberra-airport-2026`, `event:witta-gathering`, `event:harvest-locals-day`, `event:eoi-gathering` |
| `comms:` | what they're subscribed to | `act-newsletter`, `goods-newsletter`, `harvest-newsletter`, `nurture` |
| `consent:` | OCAP / story consent (hard gate) | `full`, `limited`, `needed`, `none` |
| `priority:` | manual priority flag | `high`, `medium`, `urgent` |
| `ops:` | system / lifecycle | `needs-review`, `duplicate` *(everything else in this namespace — `gone`, `test` — is delete-on-sight, not durable)* |

**`project:` aligned + locked 2026-06-02** to the [[../concepts/act-business-architecture]] codes: added `act-in`/`act-fm`/`act-pi`/`act-my`/`act-cn`; folded `act-rs → act-core` and `act-fa → act-fm`. CivicGraph confirmed `act-cn` (kept — already live on 50+ contacts). Strays `act-ca`/`act-gl`/`act-mr`/`act-rp`/`act-ra`/`act-cf` (×1 each, unidentified) → CLEAN on CONTRACT unless later recognised as a real project.

**Retired namespace — do not use:** `temp:` (hot/warm/cold) is **folded into `tier:`**. Engagement heat and belonging rung were two encodings of the same axis; `tier:` wins because the Belonging Model makes it the theory of change and the metric. `audience:*` is also retired — it folds into `role:` (`audience-funder → role:funder`) except `audience-brand → comms:act-newsletter`.

**The community line (non-negotiable):** `role:community`, `role:community-controlled`, `role:storyteller`, and `role:elder` people are **never** given a `tier:` tag and never enter a Journey pipeline. The ladder is for supporters only. Community are co-owners by right, governed by `consent:`. Stamping `tier:` on a storyteller is the exact extraction ACT refuses.

---

### 2. Cleanup actions (in strict order — re-point BEFORE you retire)

The iron rule: **a flat duplicate tag is only deleted after every workflow and script that fires on it has been re-pointed to its canonical replacement.** Delete a live tag early and you silently kill a running email sequence (the GHL API cannot read workflow triggers, so this can't be checked programmatically — it's UI-verified, one at a time).

**Step A — DELETE NOW (junk, nothing depends on it):**
- `gone-from-ghl*` (all 3 dated variants, ~656 contacts) → these are lifecycle noise; delete the tag.
- `*-test`, `codex-smoke-test`, `webhook-test`
- `*-review-2026-*`, `context:opp-fix-*`, `auto-triage`
- The 4 empty-stub leftovers already deleted in the workflow clean-slate.

**Step B — EXPAND (additive, safe, scripted):** run `scripts/migrate-ghl-tags.mjs --dry-run`, review the add-list, then run live. This **adds** the canonical `namespace:value` tag to each contact based on their existing flat tags. It removes **nothing**. After this step every contact carries both old and new tags; all 26 workflows still fire on the old ones. Zero breakage.

**Step C — RE-POINT (manual, GHL UI, one workflow at a time):** for each keeper workflow, change its trigger from the flat tag to the canonical tag, save, and send one test contact through to confirm the email still fires. Also update the 5 tag-producing scripts so they stop regenerating flat tags:
- `scripts/project-notifications.mjs` — emit `project:act-jh` / `project:act-gd` / `project:act-hv` etc., not `justicehub` / `goods` / `harvest`
- `scripts/clean-funder-ghl-contacts.mjs` — emit `comms:goods-newsletter`
- `scripts/seed-goods-opps-from-xero.mjs` — emit `project:act-gd` + `source:xero`
- `scripts/ghl-webhook-handler.mjs` — emit `role:partner` + `project:act-hv`
- `scripts/sync-content-to-ghl.mjs`

**Step D — RETIRE (gated, one tag at a time):** a flat duplicate becomes a delete-candidate **only** once its workflow (Step C) and its producing script are both confirmed on the canonical tag. Retire these flat-to-canonical pairs in this order, each only after its keeper workflow is re-pointed:

| Flat tag (retire) | Canonical replacement | Gate: re-point this workflow first |
|---|---|---|
| `goods`, `act-gd`, `project-goods`, `project:act-gd` (variants) | `project:act-gd` | Goods Inquiry → Acknowledge |
| `goods-inquiry` | `interest:container` / `interest:washer` + `project:act-gd` | Goods Inquiry → Acknowledge |
| `goods-media` | `interest:media` *(keeps firing)* — re-point Goods media form | Goods media form |
| `harvest`, `the harvest` | `project:act-hv` | Harvest Member Welcome |
| `harvest-member` | `project:act-hv` + `tier:member` | Member Welcome / Member Question Receipt |
| `harvest-shop-interest` | `interest:markets` + `project:act-hv` | Shop Interest Receipt |
| `shop-prospect` | `interest:markets` + `role:buyer` | Shop prospect → create card |
| `newsletter`, `goods-newsletter`, `harvest-newsletter` | `comms:act-newsletter` / `comms:goods-newsletter` / `comms:harvest-newsletter` | Newsletter Signup |
| `contained` | `project:act-jh` + `interest:justice-reform` | Contained launch 2025 (finish first) |
| `storyteller`, `Storyteller`, `audience-storyteller` | `role:storyteller` + `consent:needed` | (no send — fold + add consent) |
| `goods-hot/warm/cold/cooling/steady/new`, all `temp:*` | `tier:curious/connected/member/active/steward` | (no send — map heat→rung) |
| `goods-tier-*`, `goods-stage-*`, `goods-signal` | *(none — pipeline stage owns this; delete after EXPAND)* | the Goods pipelines carry it |

**Past-event tags — review then delete** (no live workflow should depend on these; confirm in UI, then Step A delete): `harvest-locals-day` → keep as `source:event:harvest-locals-day` on existing contacts, retire the flat tag; `eoi-gathering-march-2026` → `source:event:eoi-gathering`; Parliament House → `source:event:parliament-demo`; `witta` → `source:event:witta-gathering`. The event becomes an immutable `source:` attribution; the standalone flat tag goes.

---

### 3. What drives what — the one-glance map

Read this as: **a form stamps tags on capture → a workflow watches for a tag and sends → a Smart List filters on tags to give you a working view.** Stage lives in the pipeline, not in a tag.

**On capture, every form stamps the same four-part signature:**
`project:<x>` + `tier:connected` + `comms:<x>-newsletter` + `source:<how>` (+ `consent:needed` only if the form captures a story/quote/photo).

| Folder / form (capture) | Stamps on submit | Workflow that watches | Smart List that filters on it |
|---|---|---|---|
| **ACT Core** · Contact → Universal Inquiry | `project:act-core` + `source:contact-form` + `tier:curious` | Universal Inquiry triage (routes out by `role:`/`interest:`) | "ACT — unrouted inbox" = `project:act-core` + `tier:curious` + no `role:` |
| **ACT Core** · Newsletter Signup (rebuild) | `comms:act-newsletter` + `tier:connected` + `source:footer` + `newsletter_consent=true` | Newsletter Signup → welcome | "ACT newsletter — sendable" = `comms:act-newsletter` + `newsletter_consent=true` |
| **Goods** · Goods Inquiry | `project:act-gd` + `interest:container`/`washer` + `role:community` + `source:website` | Goods Inquiry → Acknowledge | "Goods demand register" = `project:act-gd` + `interest:container` + `role:community` |
| **Goods** · Goods media form | `project:act-gd` + `interest:media` | Goods media form (acknowledge) | "Goods media requests" = `project:act-gd` + `interest:media` |
| **Goods** · (funder/supporter) | `project:act-gd` + `role:funder`/`supporter` + `tier:member` | (Supporter Journey, by stage) | "Goods supporters" = `project:act-gd` + `role:supporter` |
| **JusticeHub** · CONTAINED form | `project:act-jh` + `interest:justice-reform` + `source:website` | Contained launch 2025 (finish) | "CONTAINED leads" = `project:act-jh` + `interest:justice-reform` |
| **The Harvest** · Member signup | `project:act-hv` + `interest:membership` + `tier:member` + `comms:harvest-newsletter` | Member Welcome | "Harvest members" = `project:act-hv` + `tier:member` |
| **The Harvest** · Member question | `project:act-hv` | Member Question Receipt | (uses Harvest members list) |
| **The Harvest** · Follow / newsletter | `project:act-hv` + `tier:connected` + `comms:harvest-newsletter` | Follow Welcome | "Harvest connected" = `project:act-hv` + `tier:connected` |
| **The Harvest** · Shop interest | `project:act-hv` + `interest:markets` | Shop Interest Receipt | "Harvest shop prospects" = `interest:markets` + `project:act-hv` |
| **The Harvest** · Shop prospect | `interest:markets` + `role:buyer` | Shop prospect → create card | (feeds The Shop pipeline) |
| **System** · Gmail Email to Contact | `source:gmail-discovery` | (none — creates contact only) | "Imported, unrouted" = `source:gmail-discovery` + no `project:` |
| **System** · Sync to Supabase ×2 | (none — read/sync only) | — | — |

**Three things drive movement; two things only report:**
- **Drives which pipeline you land in:** `project:` + `role:` (the router, set on capture).
- **Drives nurture content + the next-rung nudge:** `tier:` + `interest:`.
- **Drives whether a send is allowed at all:** `comms:` (must match the list) AND `newsletter_consent=true` AND, for any story content, `consent:full`. **No `comms:` opt-in or no `newsletter_consent` = do not email.** (Today ~0 contacts carry `newsletter_consent=true` — the Newsletter Signup rebuild is what creates a legally sendable list; until then the sendable Smart Lists are empty by design, not broken.)
- **Reports only, never moves anyone:** `source:` (attribution) + `place:` (geography).

**The cross-pollinate move (the one to automate, currently manual):** when a Goods buyer hits *Paid*, the Buyer pipeline auto-adds `role:supporter` + `tier:member`, which opens the Supporter Journey. When a supporter reaches the *Stewarding* stage, sync `tier:steward`. **Stage is the board you work; `tier:` is the cross-project status you segment on — they must stay in sync, but the stage is the source of truth.**

---

### Reconciliation note (why this differs from `ghl-tag-taxonomy.md`)

The taxonomy doc (2026-06-01) listed `temp:` (engagement heat) and the belonging ladder separately. The Belonging Model doc (2026-06-02) makes the ladder the theory of change and the headline metric. Heat and rung are the same axis measured two ways, so this locked vocabulary keeps **one** of them: `tier:` (curious→connected→member→active→steward). `temp:*` is retired into `tier:` in the table above. Everything else in the taxonomy doc (the 9 core namespaces, the additive expand→migrate→contract migration, the load-bearing-tag list) stands unchanged.


---

## SMART LISTS BUILD SPEC

> The saved views you build in **Contacts → Smart Lists**. A Smart List is a filter you save once and reuse forever — it's what you scroll each morning, and it's what every newsletter and social post targets. Build them in the order below. Name every list `Project · Thing` so they sort together.
>
> **The one rule that never bends:** any list you will *email or text from* MUST end with the condition **`Newsletter Consent = true`**. A `comms:` tag or a `tier:` tag is a *segment* (which room someone's in), never permission to send. Lists used only for *looking* (daily triage, counts) don't need the consent filter — they're for your eyes, not a send.

### How to build one (do this for every list below)

1. Go to **Contacts → Smart Lists → + New Smart List** (or **More filters** on the contact list, then **Save as Smart List**).
2. Add each **condition** listed (GHL calls these "filters"). Multiple conditions are joined with **AND** unless the spec says **OR group**.
3. Tag conditions: filter type **Contact Tags → "has tag"** (or "does not have tag" where noted).
4. Consent condition: filter type **Custom Field → Newsletter Consent → is → true** (and, where noted, **Newsletter Unsubscribed At → is empty**).
5. Date conditions: filter type **Date Added** (or the named date field) → **after** / **in the last N days**.
6. **Save**, type the exact **Name** below, and pin the daily-view ones to the top.

---

### 1. DAILY-VIEW lists (your morning scroll — NOT for sending, so no consent filter)

These five are for triage and noticing movement. Pin them to the top of Smart Lists.

| # | Name | Conditions |
|---|---|---|
| 1.1 | **★ Inbox · Needs reply** | This one lives in **Conversations**, not Smart Lists — open **Conversations → filter "Unread" + "Unactioned"**. Save that filtered view. (Smart Lists filter contacts; an unreplied *message* is a Conversations filter.) Your first daily move. |
| 1.2 | **★ New this week (all projects)** | `Date Added` → **in the last 7 days**. (No other condition — you want every new person, every project.) |
| 1.3 | **★ New this week · needs a project** | `Date Added` → in the last 7 days · **AND** `Contact Tags` → **does not have any tag starting `project:`** (add one "does not have tag" condition per project tag: not `project:act`, not `project:act-gd`, not `project:act-hv`, not `project:act-jh`, not `project:el`). These are people who came in but aren't sorted yet — sort them. |
| 1.4 | **★ Moved a rung (last 30 days)** | `Tier` change isn't a native filter, so drive this off the pipeline: in **Opportunities**, filter each Journey pipeline by **"Stage last updated → in the last 30 days"** and save. Use this view to spot who climbed. (If you want it as a contact list: `Contact Tags` has `tier:member` OR `tier:active` OR `tier:steward` **AND** `Date Added` is NOT in the last 30 days — i.e. existing people who are now deeper. Coarser, but works.) |
| 1.5 | **★ Stuck — Connected 30+ days** | `Contact Tags` has `tier:connected` · **AND** `Date Added` → **more than 30 days ago** (filter `Date Added` → before [a rolling date] / "not in the last 30 days"). These warmed up and stalled — they're your nurture-and-ask shortlist. |

---

### 2. Per-project × tier lists (the belonging board, for looking — no consent filter)

One list per **project × rung** so you can see, at a glance, how many people sit at each level of belonging in each project. These power the Dashboard counts ("are Members growing?") and are the base you copy to make the send-ready lists in §3.

Build pattern for every row: `Contact Tags has project:<x>` **AND** `Contact Tags has tier:<rung>`.

**The Harvest** (`project:act-hv`) — start here, it's the most populated:

| Name | Conditions |
|---|---|
| **Harvest · Curious** | has `project:act-hv` AND has `tier:curious` |
| **Harvest · Connected** | has `project:act-hv` AND has `tier:connected` |
| **Harvest · Members** | has `project:act-hv` AND has `tier:member` |
| **Harvest · Active** | has `project:act-hv` AND has `tier:active` |
| **Harvest · Stewards** | has `project:act-hv` AND has `tier:steward` |

**Goods on Country** (`project:act-gd`):

| Name | Conditions |
|---|---|
| **Goods · Curious** | has `project:act-gd` AND has `tier:curious` |
| **Goods · Connected** | has `project:act-gd` AND has `tier:connected` |
| **Goods · Members** | has `project:act-gd` AND has `tier:member` |
| **Goods · Active** | has `project:act-gd` AND has `tier:active` |
| **Goods · Stewards** | has `project:act-gd` AND has `tier:steward` |

**JusticeHub** (`project:act-jh`):

| Name | Conditions |
|---|---|
| **JusticeHub · Connected** | has `project:act-jh` AND has `tier:connected` |
| **JusticeHub · Members** (CONTAINED participants/partners) | has `project:act-jh` AND has `tier:member` |
| **JusticeHub · Active** | has `project:act-jh` AND has `tier:active` |
| **JusticeHub · Stewards** | has `project:act-jh` AND has `tier:steward` |

**ACT Core** (`project:act`):

| Name | Conditions |
|---|---|
| **ACT · Connected** | has `project:act` AND has `tier:connected` |
| **ACT · Members** | has `project:act` AND has `tier:member` |
| **ACT · Stewards** | has `project:act` AND has `tier:steward` |

**Empathy Ledger** (`project:el`) — **org partners only.** Do NOT build a tier list of storytellers; storytellers are sovereign co-owners and are never laddered or emailed from a marketing list.

| Name | Conditions |
|---|---|
| **EL · Org partners · Members** | has `project:el` AND has `tier:member` AND has `role:partner` |
| **EL · Org partners · Stewards** | has `project:el` AND has `tier:steward` AND has `role:partner` |

---

### 3. Per-project × role SEND lists (consent-filtered — these are the ones you actually email/text)

Same idea as §2, but with two extra conditions that make a list *safe to send*: a **role** (so a funder gets funder content, a buyer gets product) and, **always last, `Newsletter Consent = true`**. The name ends in **· send-ready** so you can never confuse a send list with a look list.

Build pattern: `has project:<x>` **AND** `has role:<role>` **AND** `has tier:<rung>` (optional) **AND** `Newsletter Consent = true` **AND** `Newsletter Unsubscribed At = empty`.

> Roles in use: `role:funder` · `role:supporter` · `role:buyer` · `role:partner` · `role:member`. (See `ghl-tag-taxonomy.md`.)

**Goods send lists:**

| Name | Conditions |
|---|---|
| **Goods · Funders · send-ready** | has `project:act-gd` AND has `role:funder` AND `Newsletter Consent = true` AND `Unsubscribed At = empty` |
| **Goods · Buyers · send-ready** | has `project:act-gd` AND has `role:buyer` AND `Newsletter Consent = true` AND `Unsubscribed At = empty` |
| **Goods · Supporters · send-ready** | has `project:act-gd` AND has `role:supporter` AND `Newsletter Consent = true` AND `Unsubscribed At = empty` |
| **Goods · Members · send-ready** | has `project:act-gd` AND has `tier:member` AND `Newsletter Consent = true` AND `Unsubscribed At = empty` |
| **Goods · Newsletter · send-ready** (the whole Goods room) | has `comms:goods-newsletter` AND `Newsletter Consent = true` AND `Unsubscribed At = empty` |

**Harvest send lists:**

| Name | Conditions |
|---|---|
| **Harvest · Members · send-ready** | has `project:act-hv` AND has `tier:member` AND `Newsletter Consent = true` AND `Unsubscribed At = empty` |
| **Harvest · Active · send-ready** (gathering/event invites) | has `project:act-hv` AND has `tier:active` AND `Newsletter Consent = true` AND `Unsubscribed At = empty` |
| **Harvest · Shop prospects · send-ready** | has `project:act-hv` AND has `interest:shop` AND `Newsletter Consent = true` AND `Unsubscribed At = empty` |
| **Harvest · Newsletter · send-ready** (the whole Harvest room) | has `comms:harvest-newsletter` AND `Newsletter Consent = true` AND `Unsubscribed At = empty` |

**JusticeHub send lists:**

| Name | Conditions |
|---|---|
| **JusticeHub · CONTAINED · send-ready** | has `project:act-jh` AND has `comms:justicehub-newsletter` AND `Newsletter Consent = true` AND `Unsubscribed At = empty` |
| **JusticeHub · Partners · send-ready** | has `project:act-jh` AND has `role:partner` AND `Newsletter Consent = true` AND `Unsubscribed At = empty` |

**ACT Core send lists:**

| Name | Conditions |
|---|---|
| **ACT · Newsletter · send-ready** (the house list) | has `comms:act-newsletter` AND `Newsletter Consent = true` AND `Unsubscribed At = empty` |
| **ACT · Stewards · send-ready** (ambassador/board asks) | has `project:act` AND has `tier:steward` AND `Newsletter Consent = true` AND `Unsubscribed At = empty` |

**Empathy Ledger send list — org partners ONLY:**

| Name | Conditions |
|---|---|
| **EL · Org partners · send-ready** | has `project:el` AND has `role:partner` AND `Newsletter Consent = true` AND `Unsubscribed At = empty` |

> **Never** build a "send-ready" list of storytellers. Storyteller comms are relational, human-written, OCAP-gated — they never come from a Smart List send.

---

### 4. Re-opt-in TARGET lists (the people you must win consent from before you can ever send)

This is the most important set right now, because **~0 people are consented today.** Each list below is everyone who is *tagged into a room* but has **NOT** yet given consent. These are exactly who the Step-0 re-opt-in campaign goes to — and the only thing that turns the rooms from empty to real.

Build pattern: `has comms:<x>-newsletter` **AND** `Newsletter Consent` → **is not true** (use **"is false" OR "is empty"** as an OR group, so you catch both never-set and explicitly-false).

| Name | Conditions |
|---|---|
| **RE-OPT-IN · ACT main** | has `comms:act-newsletter` AND ( `Newsletter Consent = false` OR `Newsletter Consent is empty` ) |
| **RE-OPT-IN · Goods** | has `comms:goods-newsletter` AND ( `Newsletter Consent = false` OR `Newsletter Consent is empty` ) |
| **RE-OPT-IN · Harvest** (the ~143 seated — the big win) | has `comms:harvest-newsletter` AND ( `Newsletter Consent = false` OR `Newsletter Consent is empty` ) |
| **RE-OPT-IN · JusticeHub / CONTAINED** | has `comms:justicehub-newsletter` AND ( `Newsletter Consent = false` OR `Newsletter Consent is empty` ) |
| **RE-OPT-IN · Segment-only (no room yet)** | `Newsletter Consent is not true` AND has **any** legacy `newsletter` or `comms:newsletter` tag, AND does **not** have any `comms:<project>-newsletter` tag. (These are the 300+ contacts who need standardising to `comms:act-newsletter` first, then a re-opt-in.) |

> **How a re-opt-in list empties itself:** when someone clicks "yes, keep me" in the re-opt-in email, the workflow sets `Newsletter Consent = true` — and they automatically drop out of the re-opt-in list and appear in the matching **· send-ready** list in §3. You don't move anyone by hand; the consent flag does it.

---

### Build order (do it once, top to bottom)

1. **§4 re-opt-in lists first** — you need to see who to ask, and these are the launch.
2. **§1 daily-view lists** — so you have a morning cockpit immediately.
3. **§2 per-project × tier lists** — the belonging board, for counts.
4. **§3 send-ready lists last** — they'll read ~0 until the re-opt-in lands consent, which is correct and safe.

### The check before you ever hit send

Open the list. Confirm the last condition reads **`Newsletter Consent = true`**. If it doesn't, it is a *look* list, not a *send* list — do not email from it. For any community/storyteller content, there is no list to send from at all: a human writes it, every time.


---

I have everything I need. The three documents give me the ladder rungs, the canonical tag namespaces, the Harvest seating logic, the consent rule, and the keeper workflows. Writing the build spec now.

## WORKFLOW BUILD SPEC

> The canonical workflow set to build in GHL, grouped by project folder. Two kinds: **(A) LADDER-LIFT workflows** that move people up rungs, and **(B) KEEPERS** — existing Harvest/Goods workflows you re-point to canonical tags and put behind the consent gate. Every send-workflow has the same first step after its trigger: **if `newsletter_consent` is not `true` → exit.** A tag is a segment, not consent. Build everything in **Draft**, publish only after the consent filter is in place, and grow the reachable list only through the re-opt-in.

**Read this before you build:**
- **The consent gate is one filter, repeated.** First step after every send trigger: *Condition → `newsletter_consent` equals `true`? No → End workflow.* If a workflow is **transactional** (a receipt for something the person just did themselves — submitted a form, placed an order), it is exempt from the consent gate but must NOT also drip marketing. Those are marked **TRANSACTIONAL** below.
- **Stage and `tier:` tag move together.** Whenever a workflow moves someone to a new rung, it does two things: move the opportunity to the new pipeline stage AND swap the tier tag (add the new `tier:`, remove the old one). One tier tag per contact, always equal to their stage.
- **Naming.** Every workflow name starts with its project: `Harvest — …`, `Goods — …`, `JusticeHub — …`, `ACT Core — …`. Lives in that project's folder.

---

### A. LADDER-LIFT WORKFLOWS (the engine that moves people up rungs)

#### A0. The opt-in engine — `<Project> — Newsletter Signup` (Curious → Connected)
*Build one per project. This is the ONLY workflow that creates a consented, reachable person. Everything else depends on it. Start with ACT Core and Harvest.*

- **Folder:** the project's folder (one copy in ACT Core, Goods, JusticeHub, Harvest each)
- **Trigger:** **Form Submitted** = the project's "Belong / become a member" form (the re-opt-in / signup form on that site). NOT a tag-add — a real click/submit by the person.
- **Consent gate:** none needed at the trigger — submitting the form **IS** the consent act. This workflow is what *sets* consent.
- **Ordered steps:**
  1. **Set contact field** `newsletter_consent = true`
  2. **Set contact field** `newsletter_consent_at = {{current timestamp}}` (and clear `newsletter_unsubscribed_at` if set)
  3. **Add tags:** `tier:connected`, `comms:<project>-newsletter`, `project:<x>`, `source:<x>-website` (+ UTM/`source:` from the form if captured)
  4. **Remove tag:** `tier:curious` (if present)
  5. **Find/Create opportunity** in `<Project> Membership Journey` pipeline → **move to stage "Connected"**
  6. **Wait 5 minutes** (lets fields settle)
  7. **Send Email:** the project's "Welcome — you belong now" first email (warm, the story, no ask — this is the Connected touch)
- **Result:** a person who clicked yes is now consented, on `tier:connected`, seated at Connected, and has had exactly one warm welcome. They are now reachable forever (until they unsubscribe).

#### A1. `<Project> — Welcome (Curious → Connected nurture)`
*Optional second touch after A0 for projects that want a 2-email welcome arc. If you keep the welcome to a single email, fold this into A0 step 7 and skip A1.*

- **Folder:** project folder
- **Trigger:** **Tag Added** = `tier:connected` (set by A0)
- **Consent gate:** `newsletter_consent = true`? No → End. *(Belt-and-suspenders — A0 already set it, but never trust the trigger alone.)*
- **Ordered steps:**
  1. **Consent gate** (above)
  2. **Wait 3 days**
  3. **Send Email:** "Here's what belonging to `<project>` looks like" (value + the people, still no hard ask)
  4. **Wait 4 days**
  5. **If/Else:** has the contact opened either welcome email? → if yes, **add tag** `interest:<project>-engaged` (a soft signal, not a rung change). Behaviour, not opens, drives the rung — so this does NOT move them to Member.
- **Result:** Connected contacts are warmed; no rung change here. The rung change to Member happens in A2 only on a real commitment.

#### A2. `<Project> — Nurture + Ask (Connected → Member)`
*The drip that earns the first real ask. The ask is the project's join action (Harvest: join the CSA; Goods: give/buy/fund; JusticeHub: adopt CONTAINED; ACT Core: become an ecosystem member). Moving to Member is triggered by the COMMITMENT, not by the drip finishing.*

- **Folder:** project folder
- **Trigger:** **Tag Added** = `tier:connected` (enrolls every Connected contact into the nurture)
- **Consent gate:** `newsletter_consent = true`? No → End.
- **Ordered steps (the drip):**
  1. **Consent gate**
  2. **Wait 7 days** → **Send Email:** story #1 (proof / impact)
  3. **Wait 10 days** → **Send Email:** story #2 (the people, the why)
  4. **Wait 10 days** → **Send Email:** the **soft ask** — "become a `<project>` member" with the join link
  5. **Goal / exit condition:** if the contact gets tag `role:member` (or `tier:member`) at any point → **exit the drip immediately** (they converted; stop asking)
- **The conversion (separate trigger — see A2b)**: the actual move to Member happens when they DO the join action, not when the drip ends. A contact who never joins simply finishes the drip and stays `tier:connected` — that's fine, they keep getting the newsletter.

#### A2b. `<Project> — Member Conversion (set the Member rung)`
*The clean rung-change workflow. Fired by the real commitment event, so the rung always reflects behaviour.*

- **Folder:** project folder
- **Trigger:** **Tag Added** = `role:member` (Harvest: applied on CSA join; Goods: on first gift/purchase; set by the join form or by you manually). For Harvest, the CSA-join form adds `role:member`.
- **Consent gate:** none for the *internal* rung change (tagging/moving is admin and never emails). BUT the **Send Email** step below carries its own `newsletter_consent = true`? No → skip-email branch.
- **Ordered steps:**
  1. **Add tag** `tier:member`; **Remove tag** `tier:connected`
  2. **Move opportunity** → stage **Member** in `<Project> Membership Journey`
  3. **Consent branch:** `newsletter_consent = true`? 
     - **Yes →** Send Email: "Welcome, member" (member-level content begins)
     - **No →** end (they're seated at Member but not emailable until they opt in — common for the 64 Harvest members today)
- **Result:** rung and tier tag in sync, member-content unlocked only if consented. This is the workflow that the 64 existing Harvest `role:member` contacts pass through — and because 0 are consented today, they seat at Member and get NO email until they re-opt-in. Exactly the desired behaviour.

#### A3. `<Project> — Activation (Member → Active)`
*Moves a committed member to "shows up." Triggered by a behaviour: a booking, an event attendance, a volunteer signup, a repeat gift.*

- **Folder:** project folder
- **Trigger (any of — build as separate triggers or an OR):**
  - **Appointment booked/attended** on a `<project>` calendar (gathering, consult), OR
  - **Tag Added** = `source:event:<…>` (event attendance tag), OR
  - **Tag Added** = `role:volunteer`, OR (Goods) a repeat-gift tag
- **Consent gate:** none for the rung change; consent branch on the email step.
- **Ordered steps:**
  1. **Add tag** `tier:active`; **Remove tag** `tier:member`
  2. **Move opportunity** → stage **Active**
  3. **Consent branch** (`newsletter_consent = true`?):
     - **Yes →** Send Email: recognition + "here's how to do more / bring a friend" (deeper-involvement content)
     - **No →** end
  4. **Create task** for Ben: "[<project>] <name> just became Active — personal thank-you?" (Active people are worth a human touch)
- **Result:** behaviour (not a date or a drip) lifts the rung; recognition goes out only if consented.

#### A4. `<Project> — Steward Nudge (Active → Steward)`
*The top rung. Steward is "you'd hand them the keys" — this is NOT auto-promoted. The workflow flags candidates and prompts Ben; the promotion is a human decision.*

- **Folder:** project folder
- **Trigger:** **Tag Added** = `tier:active` **AND** a strength signal — built as: trigger on `tier:active`, then a filter for repeat behaviour (e.g. 2+ `source:event:*` tags, OR `role:volunteer` + a referral tag, OR a manual `candidate:steward` tag you apply).
- **Consent gate:** N/A — this workflow does NOT send a marketing email; it creates an internal task.
- **Ordered steps:**
  1. **Filter:** is this a genuine steward candidate (repeat behaviour / referral / your manual flag)? No → End.
  2. **Create task** for Ben: "[<project>] <name> looks like a Steward — bring them in? (advisory / co-create / board)". 
  3. **(After Ben confirms — manual, or a `tier:steward` tag he applies):** a tiny follow-on workflow triggered by **Tag Added `tier:steward`** does: remove `tier:active`; move opportunity → **Steward** stage; (consent branch) send the personal co-creation invite.
- **Result:** Steward is earned and human-confirmed — the rung that *is* the mission isn't handed out by an automation. Community members are NEVER laddered into this; this is supporters only.

---

### B. KEEPERS — re-point existing workflows to canonical tags + add the consent gate

> These already exist and are live. Do NOT rebuild them — **re-point the trigger to the canonical tag and put the consent gate in front.** Build order per the runbook: set to Draft → re-point trigger → add consent filter → re-publish one at a time. The old flat tag stays load-bearing until the re-point is confirmed.

#### Harvest folder

| # | Workflow | Re-point trigger FROM → TO | Add consent gate? | Notes |
|---|---|---|---|---|
| B1 | **Harvest — Member Welcome** | `harvest-member` → **`role:member`** | **Replace with A2b** | This is the most dangerous one (64 contacts carry `harvest-member`, 0 consented). Best move: **retire this as a standalone welcome and let A2b (Member Conversion) own it** — A2b already does the rung change + consent-branched welcome. If you keep it separate, its trigger is `role:member` and its **first step is the consent gate** (no consent → end, so none of the 64 get a surprise email). |
| B2 | **Harvest — Member Question Receipt** | `member-question` → **`role:member`** *(question form)* | **No — TRANSACTIONAL** | This is a receipt for a question the person just asked. Keep it triggered on the **question form submit** (not a tag), no consent gate, but it must ONLY send the receipt — no marketing drip. Keep clearly separated from the broadcast list. |
| B3 | **Harvest — Follow Welcome** | **UNKNOWN tag → confirm in UI first**, then point to **`tier:connected`** | **Yes** | Trigger is unconfirmed (runbook flags this). Once you read it in the UI: if it's the general signup/follow, its job is the Curious→Connected welcome — **fold it into A0/A1** and retire it, OR re-point to `tier:connected` with the consent gate in front. Do not publish until the trigger is confirmed. |
| B4 | **Harvest — Shop Interest Receipt** | `harvest-shop-interest` → **`interest:shop`** | **No — TRANSACTIONAL** | Receipt for a shop enquiry the person submitted. Keep on the shop-interest event, send the receipt only, no consent gate, no marketing. Shop runs parallel to the ladder — do NOT change anyone's rung here. |
| B5 | **Harvest — Shop prospect → create card** | trigger stays (shop enquiry); tag `shop-prospect` → **`interest:shop`** + **`role:buyer`** | **No — internal only** | Creates a card in **The Shop pipeline** (commercial board), not the Membership Journey. No email, so no consent gate. Leave membership rung untouched (a buyer can also be a member — never collapse the two boards). |
| B6 | **Harvest — Locals Day** | `locals-day-march-2026` → **`source:event:locals-day-2026`** | **No — TRANSACTIONAL (event confirm)** | One-off event confirmation. Low risk. Re-point the tag, keep as transactional confirm. **Review for deletion** if the event is past — this is on the maybe-delete list. |
| B7 | **Harvest — EOI Gathering Confirmation** | `eoi-gathering-march-2026` → **`source:event:eoi-gathering-2026`** | **No — TRANSACTIONAL (event confirm)** | Same as B6 — past-event confirm. Re-point, keep transactional, or delete if the event is done (maybe-delete list). |

#### Goods folder

| # | Workflow | Re-point trigger | Add consent gate? | Notes |
|---|---|---|---|---|
| B8 | **Goods — Goods Inquiry → Acknowledge** | inquiry form submit; tag → **`project:goods`** + **`interest:goods`** | **No — TRANSACTIONAL** | Acknowledges a form the person submitted. Send the ack only. Also **seat them at Curious** in the Goods Membership Journey (internal, no email) and set `tier:curious`. The newsletter opt-in (A0 Goods) is what lifts them to Connected later. |
| B9 | **Goods — Goods media form** | media form submit; tag → **`interest:goods-media`** + **`source:goods-website`** | **No — TRANSACTIONAL / COMMUNITY-AWARE** | Form receipt. **Caution:** if this collects storyteller/community media, the people are community, NOT supporters — do NOT ladder them, do NOT auto-email beyond the receipt. Route to a human (create task), apply community handling, keep OCAP. |
| B10 | **Goods — Grant Deadline** | internal date/tag trigger | **No — INTERNAL, no contacts emailed** | This is an internal reminder workflow (deadline → task/notification to Ben). No external send, no consent gate. Just confirm it notifies Ben (Global Notifications ON) and isn't pointed at any contact list. |
| B11 | **Goods — New Order Notification** | order placed; tag → **`role:buyer`** + **`interest:goods`** | **No — TRANSACTIONAL (internal notify)** | Notifies Ben/team of a new order. Internal. Add `role:buyer` to the contact (commercial), seat/keep their Goods rung separately. No consent gate needed (internal notification, not a marketing send to the buyer). If it also sends the buyer a receipt, that receipt is transactional — keep, no drip. |

#### JusticeHub folder

| # | Workflow | Re-point trigger | Add consent gate? | Notes |
|---|---|---|---|---|
| B12 | **JusticeHub — Contained launch 2025 (finish)** | finish the draft; trigger on **CONTAINED list / `interest:contained`** | **YES — before publish** | This is a real broadcast to the CONTAINED list → it **must** have the consent gate (`newsletter_consent = true`? No → end) as its first step before you ever publish it. Finishing it seeds the JusticeHub Membership Journey (the draft is the Curious→Connected seed). Build the JusticeHub A0 newsletter-signup alongside so there's a consented audience to send to. Do not publish until the consent gate is in and the list is opted-in. |

---

### Build & publish order (so no one is emailed by accident)
1. **All sends to Draft first** (the senders are already Draft — keep them there; system pipes stay Published).
2. **Build the A-series ladder-lift workflows** in Draft, project by project (Harvest first, then Goods, JusticeHub, ACT Core).
3. **Re-point the B-series keeper triggers** to canonical tags while still Draft (nothing fires).
4. **Add the consent gate** to the front of every send-workflow (A and B). Verify per workflow: *"Can this reach a non-consented person?"* must be **no**.
5. **Re-publish one at a time**, watching each. With `newsletter_consent=true` at ~0, publishing sends to nobody yet — that's correct.
6. **Run the per-project re-opt-in** via the A0 Newsletter Signup form — the only thing that grows who's reachable. That is the launch.

**Two populations, one system:** the A-series ladders **supporters** (funders, members, buyers, the public). It is NEVER run on **community** — First Nations communities, storytellers, the people in the stories are co-owners by right, OCAP-governed, human-touch only. B9 (Goods media) is the one keeper that may touch community input: receipt only, route to a human, never laddered, never auto-dripped.
