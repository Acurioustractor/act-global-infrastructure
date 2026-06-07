---
title: GHL Operating System (master reference)
date: 2026-06-01
status: draft (from goods-ghl-engagement workflow)
---

Both source documents are fully read. Here is the consolidated master reference.

---

```markdown
---
title: GHL Operating System (master reference)
date: 2026-06-01
status: locked
owner: Ben
location: GHL agzsSZWgovjwgpcoASWG
supersedes: ghl-tag-taxonomy.md (proposal), 2026-06-01-ghl-workflow-migration-checklist.md (Phase 2 checklist)
related: comms-crm-operating-system, ghl-money-alignment, consent-check (OCAP)
---

# GHL Operating System (master reference)

> **The one rule that holds the whole thing up:** the **pipeline stage** is the single source of truth for *where someone is*. **Tags** carry the cross-cutting facts about *who they are, what they want, where they're from, and how they arrived* — never *where they sit in a journey*. Everything below enforces that split.

This is the **locked master**. If you only read one GHL doc, read this one. It replaces the proposal and the Phase-2 checklist as the live reference.

---

## 0. The shape of it (read this first)

- **11 tag folders** (namespaces) hold the durable facts about a contact.
- **A tag never duplicates a pipeline stage.** This is the load-bearing rule.
- **12 pipelines** hold the journeys. `project:` + `role:` is the **router** that decides which pipeline someone enters.
- **26 workflows** send the automated messages. They fire on tags. Re-pointing them is delicate and is being done **additively** so nothing breaks.
- **5 producer scripts** write tags into GHL automatically. They must emit the new (canonical) tags or the old ones regenerate.

The golden capture stamp on every new contact: **`source:` + `project:` + `role:` + UTM** (plus `consent:needed` for any storyteller). Get that right at the door and the rest runs itself.

---

## 1. The folders (11 namespaces) + canonical tags

GHL has no literal folders. A **`namespace:` prefix is the folder** — every tag picker sorts alphabetically, so `project:act-gd` and `project:act-hv` cluster together; `role:funder` and `role:supplier` cluster together. Combined with **Smart Lists** (saved filters on tag combinations) you get real, actionable folders.

**Separator rule: always `:` (colon) for the namespace boundary. Never `-`.** (`-` is fine *inside* a value, e.g. `community-controlled`.)

The first 9 are the **core** folders; `priority:` and `action:` are **supplementary** (11 total).

| # | Folder | Answers | Canonical values |
|---|---|---|---|
| 1 | `project:` | which ACT project | `act-gd, act-hv, act-jh, act-el, act-ce, act-oo, act-core, act-cn, act-ca, act-bg` (system-wide project codes) |
| 2 | `role:` | what they **are** to us | `funder, supporter, buyer, supplier, partner, storyteller, community, community-controlled, council, health-service, land-council, media, gov, vendor, elder, advisory, member` |
| 3 | `temp:` | engagement heat (nurture) | `hot, warm, steady, cooling, cold, new` |
| 4 | `interest:` | what they **want** | `membership, events, markets, workshops, garden, food, volunteer, washer, container, justice-reform, venue, shop` |
| 5 | `place:` | geography | states `nt, qld, sa…`; communities `community:mount-liebig`, `witta`; cities `adelaide, brisbane…` |
| 6 | `source:` | how they arrived (attribution) | `website, footer, contact-form, inquiry, linkedin, xero, grantscope, gmail-discovery, event:naidoc-2026, event:parliament-demo, event:locals-day-2026, event:eoi-gathering-2026` |
| 7 | `comms:` | what they're subscribed to | `newsletter, goods-newsletter, harvest-newsletter, nurture` |
| 8 | `consent:` | OCAP / story consent | `full, limited, needed, none` |
| 9 | `ops:` | system / lifecycle-of-record | `gone, test, needs-review, auto-triage, duplicate` (most of these get **deleted**, not kept) |
| 10 | `priority:` *(supplementary)* | manual priority flag | `high, medium, urgent` |
| 11 | `action:` *(supplementary)* | behavioural milestone | `meeting-held, quiz-completed, attended:<event>` |

**Two folding decisions already locked (2026-06-01):**
- `audience-*` folds into `role:` — `audience-funder → role:funder`, `audience-storyteller → role:storyteller`, `audience-partner → role:partner`. One source of truth for who someone is.
- `audience-brand` → `comms:newsletter` — it's a subscription segment, not an identity.

**Consent is now first-class.** 287+ storytellers previously carried almost no consent tag. Every storyteller must carry a `consent:` value, and `consent:` is a hard gate before any storyteller content leaves the building (ties to the `consent-check` OCAP rule).

---

## 2. The rule: a tag never duplicates a pipeline stage

This single rule is what keeps the system from collapsing back into sprawl. It removes ~50 tags on its own.

- **Pipeline stage = where they are** in one journey. The source of truth. One per opportunity.
- **Tag = a cross-cutting fact** that stays true regardless of stage (who / what / where / how-arrived).

So these all **die**, because the pipeline already owns them:
- `goods-stage-prospect`, `goods-stage-customer` → the Buyer pipeline's `Qualified` / `In Conversation` stages carry this.
- `goods-tier-aware / engaged / active / champion` → the Supporter Journey's `Cultivating / Stewarding / Renewing` stages carry this.
- `goods-signal` → the Demand Register's `Signal` stage carries this.

**Practical test before you ever make a new tag:** *"Could this be a pipeline stage instead?"* If yes — it's a stage, not a tag. Don't make the tag.

---

## 3. The 12 pipelines + the `project:` + `role:` router

7 real journeys + triage holding-pens. **`project:` + `role:` decides which pipeline someone enters on capture.** The other folders drive movement and reporting, never entry.

```
                       role:community / community-controlled
   source:* ─▶ NEW ──▶ ─────────────────────────────────▶ GOODS — DEMAND REGISTER (Signal ▶ Buyer Matched)
   (capture stamps     role:buyer / supplier                          │ a matched Signal spawns ▼
   source: + project:  ├──────────────────────────────────▶ GOODS — BUYER PIPELINE (Outreach ▶ Qualified ▶
   + role: + consent:) │                                       In Conversation ▶ Proposed ▶ Invoiced ▶ Paid)
                       │   role:funder / supporter                     │ a Paid/repeat buyer who keeps giving ▼
                       └──────────────────────────────────▶ GOODS SUPPORTER JOURNEY (Identified ▶ Qualified ▶
                                                              Cultivating ▶ Ask made ▶ Delivering ▶
                                                              Stewarding/Reporting ▶ Renewing)
```

**The 12 pipelines:**

| # | Pipeline | Entered by (router) |
|---|---|---|
| 1 | Goods — Demand Register | `project:act-gd` + `role:community` / `community-controlled` |
| 2 | Goods — Buyer Pipeline | `project:act-gd` + `role:buyer` / `supplier` |
| 3 | Goods Supporter Journey | `project:act-gd` + `role:funder` / `supporter` |
| 4 | A Curious Tractor (portfolio/venture) | `project:act-core` + venture role |
| 5 | Grants | `role:funder` + grant opportunity |
| 6 | Empathy Ledger | `project:act-el` |
| 7 | Festivals | event/festival capture |
| 8 | ACT Events | `interest:events` |
| 9 | Mukurtu Node Activation | community node setup |
| 10 | The Shop | `interest:shop` |
| 11 | Harvest Inbox (triage → route out) | `project:act-hv` intake |
| 12 | Universal Inquiry (triage → route out) | `source:contact-form` |

**Movement vs. entry, by folder:**
- **`project:` + `role:`** → decide *which* pipeline on capture (the router).
- **`temp:` + `interest:`** → drive *which* nurture content runs and *when* to nudge the next stage.
- **`source:` + `place:`** → reporting/attribution only (which channel, which community produces demand). They move no one.
- **`consent:`** → hard gate before any storyteller content is published or syndicated.

**The cross-pollinate move (highest value, currently manual — automate it):** a *Paid* buyer or repeat funder gets `role:supporter` auto-added → enters the Supporter Journey at *Cultivating*; a Champion supporter → advisory/board; a consented storyteller → funder deck.

---

## 4. The 26-workflow re-point status

**The hard constraint: do not break any live workflow.** The GHL API can *list* workflows but **cannot read or edit their trigger config** (`GET /workflows/{id}` → 404). Which tag fires which message is **UI-only** knowledge — a tag rename can silently kill a running sequence. So the migration is **expand → migrate → contract**.

### Phase status

| Phase | What | Status |
|---|---|---|
| **EXPAND** | Script *adds* canonical `namespace:value` tags alongside the old tags. Never removes anything. All 26 workflows keep firing on old tags. | **✅ DONE** — additive, zero breakage. New + old tags now coexist. |
| **MIGRATE (Phase 2)** | Re-point each workflow trigger from old tag → canonical tag, one at a time, in the GHL **UI**, verified. | **⏳ PENDING** — manual UI work. Re-point at your pace; nothing breaks while old tags remain. |
| **CONTRACT (Phase 3)** | Delete a workflow's old tag only after that workflow + its producer scripts are confirmed on the new tag. Junk deletable now. | **🔒 GATED** — needs explicit "delete" go per the action tiers. |

### The 26 workflows, by re-point action

**A. RE-POINT — tag-triggered (14)** — change the trigger tag in the builder:

| ✓ | Workflow | Inferred current trigger | Re-point to |
|---|---|---|---|
| ☐ | Goods Inquiry → Acknowledge | `goods-inquiry` | `source:inquiry` (+ `project:act-gd`) |
| ☐ | Goods media form submission | form / `goods-media` | keep form; add `role:media` + `project:act-gd` |
| ☐ | Harvest - Member Welcome | `harvest-member` | `role:member` (+ `project:act-hv`) |
| ☐ | Harvest - Member Question Receipt | `member-question` | `role:member` |
| ☐ | Harvest - Follow Welcome | harvest signup | `project:act-hv` |
| ☐ | Harvest - Shop Interest Receipt | `harvest-shop-interest` | `interest:shop` |
| ☐ | Shop prospect → create card | `shop-prospect` | `interest:shop` (also creates Shop-pipeline opp) |
| ☐ | Harvest Locals Day | `locals-day-march-2026` | `source:event:locals-day-2026` |
| ☐ | Harvest — EOI Gathering Confirmation | `eoi-gathering-march-2026` | `source:event:eoi-gathering-2026` |
| ☐ | Newsletter Signup | `newsletter` / form | `comms:newsletter` (subscription gate — verify first) |
| ☐ | Parliament House Welcome | `goods-src-parliament-house-demo` | `source:event:parliament-demo` |
| ☐ | Volunteer Application | form / `interest-volunteer` | `interest:volunteer` |
| ☐ | Witta Gathering Photos | `witta` | `place:witta` (+ `project:act-hv`) |
| ☐ | **Contained launch 2025** *(draft)* | `contained` | `project:act-jh` + `interest:justice-reform` — **finish + publish** |

**B. NO TAG CHANGE — form/payment/date-triggered (5)** — leave the trigger; make the form/action **stamp** canonical tags so new contacts are born canonical:

| ✓ | Workflow | Trigger | Make it also add |
|---|---|---|---|
| ☐ | Contact Form to Universal Inquiry | form submit | `source:contact-form` + route by `role:` |
| ☐ | Contact → Universal Inquiry | form/inbound | `source:contact-form` |
| ☐ | Create Donor | payment / donor | `role:supporter` (or `role:funder`) |
| ☐ | New Order Notification | order placed | `role:buyer` |
| ☐ | Grant Deadline - 7 Day Reminder | opp deadline (date) | — (no tag) |

**C. SYSTEM — leave entirely (3):** Gmail Email to Contact · Sync to Supabase - Contact Updated · Sync to Supabase - New Contact.

**D. DRAFTS — delete (4):** the 4 empty `New Workflow : 17…` stubs.

### Load-bearing tags — DO NOT auto-remove until their workflow is re-pointed

`goods-inquiry` · `goods-media` · `newsletter` / `goods-newsletter` / `harvest-newsletter` · `harvest-member` · `harvest-shop-interest` · `shop-prospect` · `interest-volunteer` · `eoi-gathering-march-2026` · `locals-day-march-2026` · `goods-src-parliament-house-demo` · `witta` · `contained`. **Confirm the exact trigger in the GHL UI before contracting any of these.**

---

## 5. Producer-script status

These scripts write tags into GHL automatically. If they keep emitting the **old** tags, the old tags regenerate after Phase 3 and the cleanup never finishes. Each must emit canonical tags (additively).

| Script | Tags it writes | Status |
|---|---|---|
| `scripts/seed-goods-opps-from-xero.mjs` | `goods`, `auto-created-from-xero` | **✅ FIXED** — emits canonical tags |
| `scripts/project-notifications.mjs` | `justicehub`, `goods`, `harvest`, `contained`, `empathy-ledger`, `picc` | Verified **not a live producer** — no canonical-emit change required at this time |
| `scripts/clean-funder-ghl-contacts.mjs` | `goods-newsletter` | Verified **not a live producer** |
| `scripts/ghl-webhook-handler.mjs` | `Partner`, `ACT Farm` | Verified **not a live producer** |
| `scripts/sync-content-to-ghl.mjs` | content tags | Verified **not a live producer** |

> Net: **the one active producer (`seed-goods-opps-from-xero.mjs`) is fixed.** The other four were checked and are not currently live producers, so they cannot regenerate old tags. Re-verify before re-activating any of them.

---

## 6. How to not break it (operating rule)

Three habits keep this stable. A non-engineer can follow all three.

1. **Stamp every new contact at the door.** Capture sets `source:` + `project:` + `role:` + **UTM** (and `consent:needed` for any storyteller). If those four facts are on the contact at creation, the router puts them in the right pipeline and the right nurture runs. Missing stamps are the #1 cause of contacts going nowhere.

2. **Never rename or delete a load-bearing tag before its workflow is re-pointed.** A tag that triggers a live workflow is load-bearing (see the §4 list). Re-point the workflow in the GHL UI **first**, verify it fires on the new tag, **then** the old tag becomes a deletion candidate. The API can't see triggers, so the order matters and there is no undo on a silently-killed sequence.

3. **A tag is never a stage.** Before making any new tag, ask "could this be a pipeline stage instead?" If yes, it's a stage. Pipeline stage = *where they are*; tag = *who/what/where/how-arrived*. Keep that line and the sprawl never comes back.

**Junk is always safe to delete now** (`ops:gone`, `*-test`, `*-review-*`) — nothing depends on it. Everything else waits for its workflow.
```

The master doc above is the full markdown body, ready to land at `/Users/benknight/Code/act-global-infrastructure/wiki/decisions/ghl-operating-system.md`.
