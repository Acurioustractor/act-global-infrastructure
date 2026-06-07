---
title: ACT GoHighLevel Operating Strategy — the LCAA→CRM connector
date: 2026-06-02
status: active
owner: Ben
related: [act-ghl-master-operating-system, act-belonging-model, comms-architecture, ghl-tag-taxonomy, newsletter-consent-signup-path]
provenance: Synthesized via a background multi-agent workflow (4 internal-doc readers + 5 web-research agents then 1 synthesis). Grounded in the live GHL state verified 2026-06-02. External best-practice claims are research-sourced (not ACT facts); ACT facts trace to the wiki/decisions docs in "related". Open decisions are in section 6, not yet resolved.
---

# A Curious Tractor — The GoHighLevel Operating Strategy

A relationship system, not a funnel. One shape for every project. Consent is the floor, not a feature.

---

## 1. THE FRAME — ACT's relationship philosophy as a CRM

A funnel narrows. It takes a wide crowd and squeezes them toward a single transaction, and the people who don't convert are waste. That is the opposite of how ACT works. ACT listens, gets curious, acts alongside people, and then makes art of the work and hands over the keys. The CRM has to carry that shape or it will quietly turn every relationship into a lead.

So the spine of this whole system is a **belonging ladder**, not a funnel. A ladder has rungs you climb at your own pace, and standing still on a rung is fine. Nobody is waste. The job of the system is to help someone move one rung closer to belonging when they're ready, and to leave them be when they're not.

### LCAA → CRM connector

| LCAA | What it means here | The CRM mechanic |
|---|---|---|
| **Listen** | How we first hear someone and take them in on their terms | Intake forms, source tags, the inbound-webhook trigger that records who arrived and how, with consent captured at the moment |
| **Curiosity** | How we get to know a person, not a segment | Custom fields (facts they told us), interest tags, light enrichment, engagement signals — building a picture without mining them |
| **Action** | How we involve them in real work | Pipeline stages that track genuine involvement (volunteered, attended, contributed), action-type tags, next-rung invitations |
| **Art** | How we celebrate, hand over the keys, design for our own obsolescence | Steward rung, storyteller handover, community-held records, the deliberate absence of an "extract more" stage at the top |

The top of an ACT ladder is not "high-value donor." It is **Steward** — someone who now holds part of the work themselves. That is beautiful obsolescence built into the data model.

### Non-negotiable guardrails (these win over every best practice in the digests)

1. **Consent-first.** `newsletter_consent = Yes` is the **only** signal that authorises an email send. It is set on a real opt-in only, captured at the moment of consent, with who/when/how recorded. No inferred consent — the Spam Act's inferred-consent bar is one almost no community contact clears, and ACMA's July 2024 expectation is that express is the default. A contact in the system is not a contact you may email.
2. **Commerce yes, community never, for AI and automation.** Buyers, ticket-holders, shop customers, and supporters can be nurtured by automation. Recipients, storytellers, and First Nations community members are **never** auto-enrolled, auto-segmented, auto-published, or funnelled. OCAP/CARE: consent is collective and revocable, and a record with a sovereignty flag is blocked from every automated audience by default.
3. **The CRM holds contact + consent-state only.** Story content, names, photos, cultural knowledge live in a sovereignty-respecting store (Empathy Ledger), not a marketing list. Never fabricate a name or date to "complete" a record.

Everything below is built so these three hold structurally, not by good intentions.

---

## 2. THE UNIVERSAL MODEL — one shape, every project

### 2a. VALUES → SYSTEM RULES

| ACT value | The rule the CRM enforces |
|---|---|
| Relationship over transaction | Every contact has exactly one `tier:` (ladder rung). No contact is ranked by dollars. Promotion is by reciprocity and engagement breadth, not spend. |
| Consent and cultural authority | No send without `newsletter_consent = Yes`. A `consent: community-hold` or `data_sovereignty` flag blocks the record from all automated audiences. Withdrawal triggers human review, not just an unsubscribe flag. |
| We hand over the keys | The top rung is **Steward**. There is no rung above it that exists to extract more. |
| Listen before we ask | A new contact cannot receive an ask in their first 90 days; the welcome track carries zero asks. `last_ask_date` blocks re-asks inside a window. |
| Don't mine people | Engagement score weights contribution and reciprocity, not monetary value. Story content never enters the CRM. |
| Honest and respectful | Preference centre is a hard constraint. "Reduce frequency" sits beside "unsubscribe." Cadence cap: max 2–3 messages per contact per day, suppress overlapping campaigns. |

### 2b. TAG TAXONOMY

The decision rule, applied everywhere:

- **Custom field** = a stable *fact* about the person (name, email, first action date, consent timestamp). Queryable, reportable, one value.
- **Tag** = a *category or transient state* (what project, what role, what interest, where they came from). Namespaced, prefixed, lower-case, single separator.
- **Pipeline stage** = *where they sit in a process* (their rung, their order status). One stage per pipeline per contact.

The rule of thumb from the research: if you'll report on it or filter a send by it, lean toward a field; if it's a bucket someone belongs to, it's a tag; if it's progress through a journey, it's a stage. ACT already runs a namespaced scheme — lock it before it sprawls.

| Namespace | Meaning | Real example strings |
|---|---|---|
| `project:` | Which ACT project | `project:harvest` · `project:goods` · `project:justicehub` · `project:empathy-ledger` |
| `role:` | What this person *is* to us | `role:volunteer` · `role:buyer` · `role:supporter` · `role:funder` · `role:storyteller` · `role:recipient` · `role:partner` |
| `tier:` | Ladder rung (mirrors pipeline stage) | `tier:curious` · `tier:connected` · `tier:member` · `tier:active` · `tier:steward` |
| `interest:` | What they care about | `interest:garden` · `interest:events` · `interest:on-country` · `interest:repair` |
| `comms:` | Channel/frequency preference state | `comms:email-ok` · `comms:sms-ok` · `comms:reduced-frequency` · `comms:paused` |
| `source:` | How they arrived | `source:website-form` · `source:event-signup` · `source:referral` · `source:shop-order` |
| `place:` | Geography | `place:samford` · `place:mparntwe` · `place:brisbane` |
| `consent:` | Consent state as a *visible* flag (mirrors fields, drives blocking) | `consent:newsletter-yes` · `consent:community-hold` · `consent:withdrawn` |

Two ACT-specific additions:

- `action:` — logs a *contribution event* so people can climb with zero dollars: `action:volunteered` · `action:attended` · `action:contributed` · `action:referred`. This is the data behind community-weighted scoring.
- `care:` — marks records on a relationship-only track with no asks: `care:recipient-track`. Used by Goods to keep recipients structurally separate from supporters.

Governance: only Ben (and later one trusted operator) creates new tags. Quarterly audit for duplicates and naming drift. New taggers must skip `manual%` sources, consistent with the existing auto-tagger guard.

### 2c. CUSTOM FIELDS (fact vs category), against the live 8 folders

The live 8-folder structure already maps almost perfectly. Keep facts as fields, push categories to tags.

| Folder | Stays a FIELD (a fact) | Becomes a TAG (a category) |
|---|---|---|
| Identity | full name, email, phone, pronouns, org | role → `role:` tag |
| Consent & Culture | `newsletter_consent` (the send gate), `consent_timestamp`, `consent_source`, `consent_evidence_ref`, `data_sovereignty` (bool) | consent state mirror → `consent:` tag, `care:recipient-track` |
| Preferences | preferred channel, frequency preference, topics-of-interest free text | interests → `interest:`, channel state → `comms:` |
| Engagement & AI | `engagement_score` (0–100), `first_action_date`, `last_engagement_date`, `last_ask_date` | — |
| Goods Ops | order count, demand-register need type, recipient flag | buyer/recipient role → `role:`, `care:` |
| Storytelling | `consent_publish` (bool), `collective_authority_ref`, `el_record_id` (pointer only) | storyteller → `role:storyteller`, `consent:community-hold` |
| Campaign Ops | last campaign, UTM source captured | source → `source:` |
| Forms | which form, submission timestamp | form-specific interest → `interest:` |

New fields to add (from the consent research): `consent_purpose[]`, `consent_channel[]`, `consent_evidence_ref`, `collective_authority_ref`, `data_sovereignty` (default true blocks automation only where the research demands — i.e. set true on community/storyteller records). Story *content* never becomes a field; only pointers (`el_record_id`).

### 2d. FORMS — exactly what each writes on submit

| Form | Tags written | Fields written | Consent |
|---|---|---|---|
| **General Contact** | `source:website-form`, `tier:curious`, project tag from form field | name, email, message, `first_action_date` | `newsletter_consent` ONLY if the opt-in box is ticked. Unticked = no consent, no send, ever. |
| **Newsletter Signup (rebuilt as API path)** | `source:website-form`, `comms:email-ok`, `consent:newsletter-yes`, `tier:curious` | email, `consent_timestamp`, `consent_source`, `consent_evidence_ref` | The act of submitting *is* the express opt-in; stamp `newsletter_consent = Yes` in code at submit. |
| **Volunteer Application** | `role:volunteer`, `source:website-form`, project tag, `tier:connected` | name, contact, availability, `first_action_date` | separate opt-in checkbox; a volunteer is not auto-subscribed |
| **Donation Form** | `role:supporter`, `source:website-form`, `action:contributed` | name, email, amount, `last_ask_date` | separate, unticked newsletter opt-in (no pre-checked boxes — the anti-extractive rule) |
| **Event Signup (new)** | `source:event-signup`, `action:attended`, `interest:events`, `tier:connected` | name, email, event ref | opt-in checkbox |
| **Story / community intake (new, restricted)** | `role:storyteller`, `consent:community-hold`, `data_sovereignty=true` | pointer to EL record only | NO marketing consent path. Publish consent is human-granted, collective where relevant. |

The consent rule made structural: a form that does not carry an explicit, unticked opt-in cannot write `newsletter_consent = Yes`. Submitting a *newsletter* form is itself the opt-in; submitting a *contact* form is not.

### 2e. PIPELINES

Two kinds, kept separate (the research is firm: separate pipelines per process, never one mega-pipeline).

**1. The Journey pipeline (every project has exactly one).** The five belonging rungs as stages, each a real milestone that changes follow-up behaviour:

`Curious` → `Connected` → `Member` → `Active` → `Steward`

- **Curious** — they raised a hand (form, signup). Welcome track, no asks.
- **Connected** — they've done one real thing with us (volunteered, attended, replied).
- **Member** — sustained involvement; they're part of it.
- **Active** — regularly contributing in their own way.
- **Steward** — they hold part of the work themselves. Handover stage.

The `tier:` tag mirrors the stage. Sync rule: the **Pipeline Stage Changed** trigger fires a workflow that swaps the `tier:` tag (remove old, add new) so the tag and stage never drift. Because stage changes are GHL-native events (not API side-effects), this trigger is reliable.

**2. Ops pipelines (only when a project has a real operational process):**

- **Shop / order** (Harvest "The Shop", Goods buyer) — `New order → Paid → Fulfilled → Delivered`. Tracks a transaction, not a relationship. A person can sit at `Member` on the Journey board and `Paid` on the Shop board at the same time.
- **Grant / funder** — `Identified → Applied → Awarded → Acquitting → Closed`. Funder relationship management.
- **Demand register** (Goods) — recipient need tracking. This one is **care-flagged**: it never feeds a send workflow.

Keep every pipeline to 5–7 stages. Scope every workflow with the **In Pipeline** filter so Harvest automation never fires on a Goods opportunity. Install the **Stale Opportunities** flag at 30 days as the "we've gone quiet" safety net — but on the recipient/care board, "stale" means *check in*, never *re-ask*.

### 2f. WORKFLOWS — a pattern library, each with its reliable trigger

The hard-won lesson: **GHL's Contact Created / Contact Changed triggers are unreliable on API-created contacts** (bulk imports suppress them by design; the LeadConnector new-contact event is sporadic). So the rule is: drive entry off something we *control* — an inbound webhook we POST to, a tag we set, or a native in-GHL event — never off GHL noticing our API touched a record.

| Pattern | Trigger to use | Why / replace-with-code note |
|---|---|---|
| **Intake** | **Inbound Webhook** — `/api/forms/submit` POSTs to the workflow's own webhook URL | The request *is* the trigger; guaranteed to start. Do NOT rely on Contact Created. |
| **Consent stamp** | **Code, not a workflow** | Already live: `newsletter_consent` is set in code at signup. Keep it there. A GHL trigger here is the exact thing that proved unreliable. |
| **Welcome (90-day, zero asks)** | **Contact Tag added** — fires on `tier:curious` | Tag-added is observable and reliable. The tag is applied in the upsert payload or by the intake workflow, then this listens. |
| **Nurture by tier** | **Contact Tag added** on the relevant `tier:` tag | One workflow per rung, each scoped In-Pipeline. Front-loaded then decaying cadence; one goal per message. |
| **Rung promotion** | **Pipeline Stage Changed** (native event) OR a code-set tag swap | When promotion criteria are met (see Intelligence), code moves the opportunity stage; the native stage-changed event then reliably fires the next-rung welcome and swaps the `tier:` tag. |
| **Engagement handoff** | **Engagement Score threshold** trigger | Native GHL scoring crossing a band signals "ready to deepen" — surfaces to a human, doesn't auto-ask. |
| **Re-engagement / win-back** | **Stale Opportunity (30 day)** + a scheduled check | Fires "we've gone quiet" on Journey/Shop boards. Never on the care board. |
| **Re-opt-in (re-permission)** | **Scheduled / code-driven batch** to a consent-filtered list | A plain "click to confirm you still want this." Non-responders are dropped, not retained. Human-in-loop for any dormant community contact. |

Every send workflow ends with the same hard gate before any email action: **if/else on `newsletter_consent = Yes` AND not DND** → else exit. No exceptions. Test every workflow against a contact using Ben's own email before publishing.

### 2g. INTELLIGENCE

**Scoring.** Use GHL's native Engagement Score as the base (opens, clicks, replies, form submits, payments add; bounces, unsubscribes subtract). Layer ACT-specific weight via "Modify Engagement Score" actions on `action:` events (volunteered, attended, contributed, referred) so contribution counts as much as clicks. Community-weighted, not donor-weighted — reciprocity scores, dollars don't dominate.

**Promotion criteria (the concrete rules that move a rung):**

| From → To | Promotes when |
|---|---|
| Curious → Connected | completed the welcome series AND one reciprocal action logged (`action:*` tag) |
| Connected → Member | 2+ contribution events within 90 days, OR a recurring/membership commitment |
| Member → Active | sustained contribution across 2+ months AND engagement score in the upper band |
| Active → Steward | **human decision only** — someone is holding part of the work. Never automated. |

**The 4 daily surfaces** (what Ben actually looks at):

1. **New arrivals today** — who came in, via which form, with consent state.
2. **Ready to climb** — contacts whose promotion criteria just went true, awaiting a human nudge.
3. **Gone quiet** — stale flags on Journey/Shop boards (care board excluded).
4. **Consent watch** — withdrawals and re-permission needs awaiting human review.

**Smart-lists are the send targets — always consent-filtered.** Never hand-maintain a list. Build dynamic smart-lists from tag × field × behaviour intersections, and every send list carries `newsletter_consent = Yes AND NOT data_sovereignty AND NOT comms:paused` as a baseline filter. Example: `project:harvest AND tier:member AND consent:newsletter-yes AND NOT comms:reduced-frequency`. Cap to ≤6 working segments per project; everything finer is a tag, not a segment.

---

## 3. THE HARVEST — concrete build

Harvest is the proven path. Tighten it end-to-end first, then replicate (the research's rollout discipline).

**Audiences:** garden volunteers, shop buyers, members/supporters, event attendees, local Samford community. All commerce/community — no recipients, no storytellers. Harvest can use automation freely within the consent gate.

**The real journey** (LIVE): `Curious → Connected → Member → Active → Steward` on the **Harvest Membership Journey** pipeline (id `ijPN2jEoEuMshXXKbQ4z`). 143 Harvest contacts are already seated with `tier:` tags.

**Tag set (Harvest):**
`project:harvest` · `role:volunteer` / `role:buyer` / `role:supporter` · `tier:curious…steward` · `interest:garden` / `interest:events` / `interest:repair` · `comms:email-ok` / `comms:reduced-frequency` · `source:website-form` / `source:shop-order` / `source:event-signup` · `place:samford` · `consent:newsletter-yes` · `action:volunteered` / `action:attended` / `action:contributed`

**Forms:** General Contact, Volunteer Application, Donation Form (all EXIST) + Event Signup (NEW) + rebuilt Newsletter path (NEW — see §5). The native Newsletter Signup form is dead; real signups are the API path.

**Pipelines:** Harvest Membership Journey (EXISTS) + Harvest Inbox (EXISTS, triage) + The Shop ops pipeline (EXISTS).

**Workflow set (each with trigger + consent gate). All send-workflows stay DRAFT until the coordinated launch:**

| Workflow | Trigger | Consent gate | Status |
|---|---|---|---|
| Intake → seat at Curious | Inbound Webhook (form submit) | n/a (no send) | NEW |
| Tier-tag sync | Pipeline Stage Changed | n/a | NEW |
| Welcome (90-day, no asks) | Tag added `tier:curious` | `newsletter_consent=Yes` | EXISTS (Draft) |
| Member nurture | Tag added `tier:member` | consent gate | EXISTS (Draft) |
| Active nurture | Tag added `tier:active` | consent gate | EXISTS (Draft) |
| Promotion nudge (ready-to-climb) | Engagement score threshold | surfaces to human, no auto-send | NEW |
| Shop order follow-up | Inbound Webhook (order) | transactional, still respects DND | NEW |
| Gone-quiet win-back | Stale Opportunity 30d | consent gate | NEW |

**What Member and Steward mean here.** **Member** = someone sustaining the garden — regular volunteer shifts, a membership/recurring commitment, or repeat shop+contribution. **Steward** = someone now running part of Harvest themselves: holding a garden bed program, leading events, onboarding new volunteers. Steward is a human call, the handover rung.

---

## 4. GOODS (The Butterfly Movement) — concrete build

Goods is a DGR charity (The Butterfly Movement Ltd, endorsed DGR + PBI since 2012), Indigenous-led board, handover 26 Jun 2026. The guardrails are not optional polish here; they are the design.

**The structural separation — four audiences, and recipients are walled off:**

| Audience | Role tag | Track | Asks? | Automation? |
|---|---|---|---|---|
| **Recipients / communities** | `role:recipient` + `care:recipient-track` + `data_sovereignty=true` | **Care/relationship track** | **NEVER** | **NEVER auto-enrolled, auto-segmented, or auto-published.** Blocked from all send smart-lists by default. |
| Supporters | `role:supporter` | Journey | yes, after 90 days | yes, within consent gate |
| Buyers | `role:buyer` | Journey + Shop ops | transactional | yes, within consent gate |
| Funders | `role:funder` | Grant ops pipeline | relationship-managed | human-led |

The recipient track is a pipeline whose "advancement" is *deeper care and connection*, never a step toward an ask. Its stale flag means "check in," not "re-engage to convert." Storyteller content (a recipient's story) lives in Empathy Ledger; the CRM holds only a consent state and a pointer. Publishing any recipient's name, photo, or story is a **blocking OCAP gate** handled by the `consent-check` skill, human-in-loop, collective sign-off where relevant — never a workflow.

**Tag set (Goods):**
`project:goods` · `role:recipient` / `role:supporter` / `role:buyer` / `role:funder` · `care:recipient-track` · `tier:*` (supporters/buyers only) · `interest:on-country` / `interest:repair` · `source:*` · `consent:newsletter-yes` / `consent:community-hold` · `action:contributed` / `action:referred`

**Forms:** Donation/supporter form (writes `role:supporter`, opt-in unticked), Buyer/shop intake (`role:buyer`), Demand-register intake (`role:recipient` + `care:recipient-track` + `data_sovereignty=true`, **no marketing consent path at all**), Funder contact (`role:funder`).

**Pipelines:** Goods Journey (supporters/buyers) + Goods Shop ops + **Demand register / recipient care** (care-flagged, no sends) + Grant/funder ops. Goods routing pipelines already referenced in code (`universalInquiry`, `empathyLedger/Identified`, `goodsBuyer/First Contact`) map onto this — the recipient/EL path must carry the sovereignty flag so it can never be swept into a send.

**Workflows:** same pattern library as Harvest for supporters/buyers/funders, every send gated on `newsletter_consent=Yes AND NOT data_sovereignty`. The recipient care track has **no send workflows** — only human check-in tasks. Build Goods *after* Harvest is proven (rollout discipline), and treat the recipient wall as the first thing verified, not the last.

---

## 5. SEQUENCED ROLLOUT — no one emailed without consent

The order is built so a send is impossible until consent filtering is in place on every workflow.

1. **PAUSE all sends.** Every Harvest send-workflow stays Draft (already the state). No exceptions go live during the build.
2. **Build the structure** (Tier 1, safe to do now): finalise fields (add `consent_purpose[]`, `consent_channel[]`, `consent_evidence_ref`, `collective_authority_ref`, `data_sovereignty`), lock the tag taxonomy, build the smart-lists, wire the Inbound-Webhook intake and the Pipeline-Stage-Changed tier-sync. None of this sends anything.
3. **Consent-filter every send-workflow.** Add the `newsletter_consent=Yes AND NOT data_sovereignty AND NOT comms:paused` if/else gate to the front of every email action in every Draft workflow. Add the DND check. This is the gate that makes step 5 safe.
4. **Verify the recipient wall (Goods) and the care exclusion** before anything Goods-facing publishes — confirm `care:` / `data_sovereignty` records appear in zero send smart-lists. Tracer-bullet: push one test recipient record and prove it's invisible to every send list.
5. **Re-publish together, consent-filtered.** Activate the Harvest send-workflows in one coordinated move, only after the gate is on every one. Run the **re-opt-in** to anyone whose consent isn't cleanly recorded: a plain "click to confirm you still want to hear from Harvest." Non-responders are dropped from sends, not retained. Then replicate the whole proven path for Goods.
6. **Maintain:** weekly clean of the boards, monthly archive of stale/closed, quarterly tag audit.

**The dead native Newsletter Signup form:** it has 0 submissions and real signups already flow `act.place form → /api/forms/submit → pushToGHL upsert` with `newsletter_consent` stamped in code. Do not try to revive the native form (its trigger would be the unreliable kind). **Unpublish / archive the native form** so no one wires a future workflow to a dead trigger, and keep the API path as the single source of consented signups. If a hosted signup page is wanted, point it at the API endpoint, not the native form.

**The guarantee:** because `newsletter_consent` is set only in code on a real opt-in, and every send-workflow gates on it before any email action, and the workflows stay Draft until that gate is universal, there is no path by which a non-consented or community-held contact receives an email.

---

## 6. OPEN QUESTIONS / DECISIONS for Ben

These are genuinely unknown from the digests — decide, don't let me guess.

1. **GHL native limits.** Max tags per sub-account, smart-list filter depth, and two-way sync fidelity to the actual email/SMS sender weren't confirmed in the research. Verify against current GHL docs before committing the full taxonomy at scale.
2. **Engagement-score threshold for "ready to climb."** The ~70–80 "sales-ready" band is a vendor convention, not GHL spec. Pick ACT's own band by watching real promotion data — start conservative.
3. **Promotion automation depth.** How much of Curious→Connected→Member do you want code-driven vs. a human pressing the button? Steward is human-only by design; the lower rungs are a choice.
4. **Re-opt-in scope.** Which existing Harvest contacts have cleanly recorded consent vs. need re-permission? This needs an audit of the 143 seated contacts before the coordinated launch — unknown from the digests.
5. **Recipient track ownership.** Who at Goods (Indigenous-led board) holds authority over the recipient/care records and the collective-consent sign-off? `collective_authority_ref` needs a real referent, and that's a governance decision for the Butterfly board, not a CRM setting.
6. **Where Empathy Ledger ends and GHL begins.** The boundary (CRM holds contact + consent-state + pointer; EL holds story content) is clear in principle; the exact pointer field and sync direction with EL v2 need confirming against the live EL schema.
7. **API upsert → tag-added timing.** No source quantified the latency between the `pushToGHL` upsert and the tag-added event the welcome workflow listens for. If there's a race, the welcome may need the tag included in the upsert payload itself rather than added in a second call. Test this on the tracer contact.

The frame holds: a ladder of belonging, one shape per project, consent as the structural floor, and recipients and storytellers walled off from every funnel. Build Harvest end-to-end, prove it, then give Goods the same shape with the recipient wall verified first.