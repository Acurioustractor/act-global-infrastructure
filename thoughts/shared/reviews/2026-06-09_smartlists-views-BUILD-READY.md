# Smart Lists + Views — BUILD-READY checklist (2026-06-09)

> Companion to `2026-06-09_move2-move3-smartlists-views-spec.md`. That doc is the design; **this doc is
> the build sheet** — verified field IDs, verified tag strings, and the **real post-gate counts** to
> sanity-check each list against as you click. Moves 2 & 3 are GHL-UI-only (no API) — Ben builds, this
> guides. Location: "A Curious Tractor" (`agzsSZWgovjwgpcoASWG`).

## Verification status (read first)

- **Custom fields — VERIFIED LIVE** (GHL `locations_get-custom-fields`, 2026-06-09). All three consent-gate
  fields exist and are filterable.
- **Counts + tags — INFERRED from the Supabase mirror** (`tednluwflfhxyucgwigh.ghl_contacts`, re-synced
  GHL→Supabase after Phase B 2026-06-08). The GHL Smart-List filter runs on *live* GHL; the mirror can lag
  slightly and the GHL search index is eventually-consistent — so treat each count as a **target to
  sanity-check**, not a contract. If a list's live count is within a few of the target below, the filter is right.

### Consent-gate fields (paste exactly)

| Spec gate | GHL field name | fieldKey | field ID | Type | Filter operator |
|---|---|---|---|---|---|
| `Newsletter Consent = Yes` | **Newsletter Consent** | `contact.newsletter_consent` | `aVnqmajnysMtGYhLD0oA` | Single-option [Yes/No] | **is → Yes** |
| `Consent Source not empty` | **Consent Source** | `contact.consent_source` | `HdnMUyXkZRPZG7l7cygG` | Text | **is not empty** |
| (provenance backstop) | **Consent Timestamp** | `contact.consent_timestamp` | `Z1E4OJl7lf8kWbJGASDM` | Date | is not empty |

> ⚠️ If GHL's filter UI doesn't offer **"is not empty"** on the *Consent Source* text field, use **Consent
> Timestamp → is not empty** instead (Date fields reliably expose that operator). Both fields are set
> together on every real signup and blank together on phantom consent, so either one enforces provenance.

---

## ⚠️ The headline finding — the provenance gate changes the sizes a LOT

The spec's `≈ size` column was the **`Yes`-only upper bound**. Adding `Consent Source not empty` (the real
gate) drops phantom consent — and it's a big drop on two lists. **This is the gate working, not a bug.**
Had the lists been built on `Newsletter Consent = Yes` alone, ~180 contacts who never opted in would have
been emailable — a Spam-Act exposure. Real funnel:

| List | stream holders | + Consent=Yes | + Source present | **− lane:community = SENDABLE** | phantom dropped |
|---|---|---|---|---|---|
| **ACT · Sendable** | 159 | 147 | 56 | **55** | 91 `Yes` had no source |
| **Goods · Sendable** | 183 | 136 | 46 | **46** | 90 `Yes` had no source |
| **Harvest · Sendable** | 83 | 64 | 64 | **62** | clean — provenance intact |
| **JusticeHub · Sendable** | 20 | 1 | 0 | **0** | the 1 `Yes` has no source |

Reconciles with the spec's expectations: Harvest ≈62 (matches), JH collapses (spec said ~1, real = **0**).
ACT/Goods are far smaller than the Yes-only bound — phantom consent was concentrated there.

**What this means for the build:**
- **ACT (55) / Goods (46)** — build as specced; the small size is correct. Don't "fix" it by dropping the
  source gate. The ~180 phantom-consent contacts are the open Spam-Act decision (strip vs re-opt-in), not
  a send audience.
- **Harvest (62)** — clean, ship it.
- **JusticeHub (0)** — build the list anyway (it's correct and self-populates as real JH signups arrive),
  but **do not wire it to a workflow** — there's no one to send to. Matches the spec's locked decision:
  leave the 19 no-provenance holders in place, gate blocks them, fold into the 62-person Spam-Act call.

---

## Move 2 — the 6 Smart Lists (build in this order)

**Build-order rule (from spec):** List 6 first, then Sendables 1–4, then List 5.

### 6 · Community-line · NEVER SEND  → build FIRST
- Filter: **Tag `lane:community`** (one condition).
- Expected: **73**. Never an audience — exists so you can eyeball it before wiring any send.

### 1 · ACT · Sendable
- Filter (AND): Tag `comms:act-newsletter` · **Newsletter Consent** is `Yes` · **Consent Source** is not empty · Tag `lane:community` = **false / does not include**.
- Expected: **≈55**.

### 2 · Goods · Sendable
- Filter (AND): Tag `comms:goods-newsletter` · Newsletter Consent is `Yes` · Consent Source is not empty · NOT Tag `lane:community`.
- Expected: **≈46**.

### 3 · Harvest · Sendable
- Filter (AND): Tag `comms:harvest-newsletter` · Newsletter Consent is `Yes` · Consent Source is not empty · NOT Tag `lane:community`.
- Expected: **≈62**.

### 4 · JusticeHub · Sendable
- Filter (AND): Tag `comms:justicehub-newsletter` · Newsletter Consent is `Yes` · Consent Source is not empty · NOT Tag `lane:community`.
- Expected: **0 today** (expected and correct). Save it; do **not** attach a workflow.

### 5 · Funders · Relationship-led  → build LAST, never automated
- Filter: **Tag `role:funder`**. Expected: **94**.
- Optional warm refine: `engagement:personal-vip` (**32 funders carry it** — usable). Note `engagement:hot`
  has **0** funder holders — don't use it as a refine. Human send only; never attach to a drip workflow.

### Gate-proof check (do after each Sendable list)
Spot-check the saved list shows **0** members with `lane:community`. The mirror says only **3** community
contacts even carry a newsletter stream tag, and the NOT-gate drops all 3 — but eyeball those 3 anyway
(community-line person in a send stream is the exact pattern to keep stamped out).

---

## Move 3 — the 5 Custom Views (all view tags verified to exist)

Views are display lenses (columns + a default filter) — **no send risk**. All referenced filter tags are
live: `project:act-jh`=61, `project:act-gd`=547, `role:storyteller`=31, `interest:justice-reform`=28,
`project:contained*`=264.

| # | View | Default filter | Notes |
|---|---|---|---|
| 1 | Default | none | existing |
| 2 | Justice | `project:act-jh` OR `project:contained*` | ≈61 + 264. Columns: role · `interest:justice-reform` · consent. (No `campaign-stage` custom field exists — use a tag column or omit.) |
| 3 | Goods | `project:act-gd` | ≈547 (broad — this is the project tag, not buyers-only; refine with `role:buyer` if you want the operating subset) |
| 4 | Funders | `role:funder` | ≈94. "ask amount / grant pipeline / owner" live on **Opportunities**, not the contact — surface via the linked Company/opportunity, not a contact field |
| 5 | Community-line | `lane:community` | ≈73. **Omit all comms/consent-send columns** — read for context, never operated as an audience |

> View 4 caveat: grant-pipeline/ask/owner are opportunity-level. If you want them as columns on a contact
> view, they have to come through the Company↔Opportunity link, not a contact custom field — none of those
> three exist as contact fields in this account.

---

## After building
- The 12 DRAFT comms workflows stay **DRAFT**. Building lists switches on nothing. Comms go live only when
  Ben publishes a workflow (day-shift, human-in-loop).
- New Sendable lists are JIT only — build one when (and only when) a real send/workflow exists behind it
  (`buyer-drip`/`supporter-drip`). `funder-drip` is permanently relationship-led (List 5), never automated.
