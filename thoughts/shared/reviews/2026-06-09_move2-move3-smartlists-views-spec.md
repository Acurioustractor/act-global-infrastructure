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
| 5 | **Community-line** | `role:storyteller` · `place:community` · consent provenance · **NO comms fields** | `lane:community` |

> View 5 deliberately omits comms/enrolment columns — a community-line record is read for context,
> never operated as a send audience.

---

## Move 2 — Smart Lists (6) — campaign audiences

Smart Lists = saved tag/field queries. ACT sends four newsletters + runs one relationship lane +
keeps one never-send safety list. Each Sendable list = stream tag **AND** both gates.

| # | Smart List | Filter (AND) | Sendable? |
|---|------------|--------------|-----------|
| 1 | **ACT · Sendable** | `comms:act-newsletter` · `newsletter_consent = Yes` · NOT `lane:community` | ✅ |
| 2 | **Goods · Sendable** | `comms:goods-newsletter` · consent · NOT `lane:community` | ✅ |
| 3 | **Harvest · Sendable** | `comms:harvest-newsletter` · consent · NOT `lane:community` | ✅ |
| 4 | **JusticeHub · Sendable** | `comms:justicehub-newsletter` · consent · NOT `lane:community` | ✅ |
| 5 | **Funders · Relationship-led** | `role:funder` · `tier:` warm/hot/personal | ❌ no automation — human send only |
| 6 | **Community-line · NEVER SEND** | `lane:community` | ❌ safety/visibility list, never an audience |

### Build order
1. List 6 first (Community-line) — so it exists to eyeball *before* any send list is wired to a campaign.
2. Then the four Sendable lists (1–4). After saving each, sanity-check the count and spot-check that
   **zero** members carry `lane:community` (proves the gate).
3. List 5 (Funders) last — relationship lane, never attached to an automation.

### ⚠️ One open question for Ben (6 vs 7)
`thoughts/shared/reviews/ghl-system-state-of-play-2026-06-08.md` §4 enumerated **7** streams — the 4
newsletters **plus** three drips (`comms:funder-drip`, `comms:buyer-drip`, `comms:supporter-drip`).
This spec collapses the drips into the Funders relationship list (5) rather than standalone Sendable
lists, giving **6**. If you want `buyer-drip` / `supporter-drip` as their own Sendable Smart Lists,
add them on the same template (stream tag · consent · NOT `lane:community`) → that's where the 7th/8th
come from. Decide at build time; the gate rule is identical either way.

---

## After building
- Spot-check each Sendable list has **0** `lane:community` members (the gate proof).
- Note: the 12 DRAFT workflows (state-of-play §4) stay **DRAFT** — building lists does not switch on
  any send. Comms go live only when Ben publishes a workflow (day-shift, human-in-loop).
