# Move 2 (Smart Lists) + Move 3 (Custom Views) — GHL UI build-spec (2026-06-09)

> The orgs→Companies migration (Move 1) is done. Moves 2 & 3 are **UI-only** — GHL Smart Lists and
> Custom Views are not exposed on the API, so these are click-by-click for Ben. Grounded in
> `wiki/concepts/ghl-crm-operating-model.md` (the object model) + `ghl-crm-taxonomy.md` (tag vocab).
> Location: "A Curious Tractor" (`agzsSZWgovjwgpcoASWG`).

**The one safety invariant (rule 4):** every *Sendable* Smart List carries **both** gates by construction —
`newsletter_consent = Yes` **AND** `NOT lane:community`. No exceptions. Build these gates into the
filter, not into a person's memory.

---

## Move 3 — Custom Views (exactly 5, the canon set)

GHL caps useful per-operator views; the operating model fixes the set at 5. Build each as a saved
Contacts view (Contacts → Manage Fields/Views → add view → choose columns + default filter).

| # | View | Columns / lens | Default filter |
|---|------|----------------|----------------|
| 1 | **Default** | name · email · phone · tags · last activity | none (existing) |
| 2 | **Justice** | role · `interest:justice-reform` · campaign-stage · CONTAINED tags · consent | `project:act-jh` OR `project:contained*` |
| 3 | **Goods** | role (buyer/supplier/recipient) · Company · asset tags · consent | `project:act-gd` |
| 4 | **Funders** | Company · grant pipeline · ask amount · owner | `role:funder` |
| 5 | **Community-line** | `role:storyteller` · `lane:community` · consent provenance · **NO comms fields** | `lane:community` |

> View 5 deliberately omits comms/enrolment columns — a community-line record is read for context,
> never operated as a send audience.

---

## Move 2 — Smart Lists (6) — campaign audiences

Smart Lists = saved tag/field queries. ACT sends four newsletters + runs one relationship lane +
keeps one never-send safety list. Each Sendable list = stream tag **AND** both gates.

Consent = the GHL custom field **"Newsletter Consent"** (SINGLE_OPTIONS Yes|No) → filter **is `Yes`**.
Expected sizes are from the Supabase mirror (2026-06-09, cap-safe counts, gone-from-ghl excluded) — GHL
live will be ≈ these; the gate-proof in GHL is the real check.

| # | Smart List | Filter (AND) | Sendable? | ≈ size |
|---|------------|--------------|-----------|--------|
| 1 | **ACT · Sendable** | `comms:act-newsletter` · Newsletter Consent = Yes · NOT `lane:community` | ✅ | **146** (of 158 tagged) |
| 2 | **Goods · Sendable** | `comms:goods-newsletter` · consent · NOT `lane:community` | ✅ | **136** (of 182) |
| 3 | **Harvest · Sendable** | `comms:harvest-newsletter` · consent · NOT `lane:community` | ✅ | **62** (of 80) |
| 4 | **JusticeHub · Sendable** | `comms:justicehub-newsletter` · consent · NOT `lane:community` | ✅ | **1** ⚠️ (of 20) |
| 5 | **Funders · Relationship-led** | `role:funder` (92) — *optional warm refine:* `engagement:hot`/`engagement:personal-vip` | ❌ no automation — human send only | 92 |
| 6 | **Community-line · NEVER SEND** | `lane:community` | ❌ safety/visibility list, never an audience | 72 |

> ⚠️ **JusticeHub·Sendable = 1.** The gate drops **19 of 20** `comms:justicehub-newsletter` holders —
> they lack consent or are `lane:community`. That's the gate doing its job, but a 1-person send list is
> a signal: either JH consent capture is broken, or the JH audience is genuinely community-line
> (lived-experience people). The `tier:`/warmth tags the earlier draft used (`tier:warm/hot/personal`)
> **do not exist** in this account; the real warmth vocab is `engagement:*` / `ring:*` (and
> `tier:curious|member|connected` is Harvest membership, not funder warmth) — hence list 5 is plain
> `role:funder` + an optional engagement refine.
>
> **DIAGNOSED + DECIDED (2026-06-09):** the 19 dropped are **all no-consent, non-community** (`src=ghl`
> CONTAINED/import professionals bulk-tagged, never a signup; incl. `toby gowland ×4` duplicate
> contacts → UI-merge, no merge API). They are NOT a consent-capture bug to silently fix and NOT
> community-line. **Decision (Ben): LEAVE them in place — the consent gate already blocks every send to
> them** — and fold into the single pending 62-person Spam-Act decision (strip-vs-investigate) rather
> than piecemeal. Reversible tool built + dry-run only (NOT applied): `scripts/strip-unconsented-jh-newsletter-2026-06-09.mjs`;
> re-opt-in worklist: `2026-06-09_jh-newsletter-reoptin-worklist.csv`. Consent was never touched/fabricated.

### Build order
1. List 6 first (Community-line) — so it exists to eyeball *before* any send list is wired to a campaign.
2. Then the four Sendable lists (1–4). After saving each, sanity-check the count and spot-check that
   **zero** members carry `lane:community` (proves the gate).
3. List 5 (Funders) last — relationship lane, never attached to an automation.

### Decision (locked 2026-06-09): 6 now, expand just-in-time
**The rule: build a Sendable Smart List only when a real send exists behind it.** A list with no
workflow is clutter that *looks* like a live audience. State-of-play §4 enumerated 7 streams (the 4
newsletters + `comms:funder-drip` / `comms:buyer-drip` / `comms:supporter-drip`), but the 4 newsletters
are the only streams that send today — the drip workflows are all still DRAFT. So:
- **Build the 6 above now.**
- **`funder-drip` → never a standalone automated list.** Funders are relationship-led; an automated
  drip to a program officer is off-brand and is the exact pattern that produced the community-line
  violations. They stay in list 5 (Funders · Relationship-led, human send only) — permanently, not just
  "for now".
- **`buyer-drip` / `supporter-drip` → add a Sendable list JIT**, at the moment you build that drip's
  *workflow* — never before. Same template (stream tag · consent · NOT `lane:community`). That is where
  a 7th/8th list comes from, when (and only when) it has a send behind it.

---

## After building
- Spot-check each Sendable list has **0** `lane:community` members (the gate proof).
- Note: the 12 DRAFT workflows (state-of-play §4) stay **DRAFT** — building lists does not switch on
  any send. Comms go live only when Ben publishes a workflow (day-shift, human-in-loop).
