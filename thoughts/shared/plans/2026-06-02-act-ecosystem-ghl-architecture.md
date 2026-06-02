# Plan: ACT Ecosystem GHL Architecture — tag · value · site · tagging · workflow

> The reconciled foundation the whole-ecosystem CRM hangs off, so workflows are built **once, on solid ground**. Written 2026-06-02 from a grill-with-docs alignment. Adopts the locked tag spec, adds the missing **value** layer, reconciles the live drift, and sequences the build.
>
> **Canonical sources this plan ties together (do not re-derive):**
> - Tags: `thoughts/shared/handoffs/2026-06-02-act-ghl-build-spec.md` §"TAG SYSTEM — LOCKED"
> - Value: `wiki/concepts/ecosystem-value-exchange.md`
> - Journey architecture: `wiki/decisions/ghl-ecosystem-journey-architecture.md`
> - Business/value-flow context: `wiki/concepts/act-business-architecture.md`, `four-lanes.md`

## Objective

One ecosystem CRM model, identical across every ACT project (Harvest, Goods, JusticeHub, ACT core, Empathy Ledger, partnerships), that:
1. Uses the locked 10-namespace tag vocabulary — one fact = one tag.
2. Carries a **value-exchange (give/get) reference matrix** per `role:`, deepening up the `tier:` ladder.
3. Makes the `tier:` ladder the **earned** theory of movement (rungs follow real `action:` gives, not import seeding).
4. Runs **one Journey board per project**, unified by the cross-project `tier:` tag.
5. Holds the **community line** absolutely (community/storyteller/elder never laddered).

"Done" = this model is agreed, the live drift is reconciled, and the build order below is ready to execute — *then* workflows get built.

## The five layers (the model)

### 1. TAGS — adopt the locked spec (no change)
The 10 namespaces (`project: role: tier: interest: place: source: comms: consent: priority: ops:`) are canonical as of 2026-06-02. This plan does not reopen them. Every form stamps the four-part capture signature: **`project:<x>` + `tier:connected` + `comms:<x>-newsletter` + `source:<how>`** (+ `consent:needed` if it captures a story/quote/photo).

### 2. VALUE — give/get matrix (the new layer)
A **reference matrix** (documentation, drives workflow copy + the human ask — NOT new tags, NOT custom fields). Realised gives are recorded with the existing **`action:`** namespace. The rung is *earned* by the `action:` gives a contact has actually made.

**DRAFT matrix — supporter lane (`role:` × `tier:` depth). ⚑ = needs Ben's confirm.**

| `role:` | GIVES (deepens curious→steward) | GETS | Realised-give `action:` |
|---|---|---|---|
| **funder** | curious: attention → connected: a meeting → member: a grant → active: renewed/multi-year → steward: introductions + co-design ⚑ | evidence, acquittal, impact story, a named relationship | `action:meeting-held`, `action:contributed` |
| **supporter** | attention → email/contact → first donation or sign-up → repeat + shares → advocacy + brings others | belonging, the story, behind-the-scenes, updates | `action:contributed`, `action:referred` |
| **buyer** | attention → enquiry → first purchase → repeat orders → stocks/champions the range ⚑ | the goods/produce, the impact behind them, supply reliability | `action:contributed` (purchase) ⚑ |
| **supplier** (grower/maker) | attention → "I might have surplus" → first thing on the shelf → regular supply → shapes the shop | shelf + their name on it, income, pride, a photo of their thing selling | `action:contributed` (stocked) |
| **partner** | conversation → shared intent → co-delivered work → embedded delivery → co-governance ⚑ | ACT's tech + strategic support, not ownership; shared platform | `action:meeting-held` |

**Community lane — PLACEHOLDER (Ben + community define, grounded in OCAP; do NOT invent).** `role:community`/`community-controlled`/`storyteller`/`elder`. They are **not** on the ladder. Give = story, knowledge, cultural authority, presence. Get = `consent:`-governed control, benefit-sharing, co-ownership of how their material is used. ⚑ Wording to be set with community.

### 3. SITE — each project's forms map into the one location
Per the build-spec "what drives what" table. Each project's website stamps the four-part signature on capture. Per-project form inventories already exist (Harvest is fully traced this session; Goods/JusticeHub/ACT-core per the build-spec table). No new architecture — confirm each site emits canonical tags.

### 4. TAGGING — where/when tags are applied
- **At capture, in code** (the website/form handler), not hand-built in workflows — so it's testable and consistent. (Harvest already does this; needs the canonical fix — see Reconciliation.)
- **`action:` gives** recorded by the workflow that confirms the give, or manually by the team.
- **`tier:` mirrors the pipeline stage** via an automated stage-change → write-tag step. Stage is source of truth.

### 5. WORKFLOWS — the ladder-lift engine (built LAST, on the above)
Per the build-spec "WORKFLOW BUILD SPEC". Each project's Journey board + the ladder-lift workflows that nudge the next rung using the value matrix as the copy. Built only after tags + value + reconciliation are settled.

## Reconciliation of the live drift (must happen before new workflows)

1. **This session's Harvest Phase B branch** (`wip/harvest-launch-fixes-2026-06-02`, repo: The Harvest Website): re-point to canonical —
   - ADD `project:act-hv` to every form (the missing router tag — biggest miss).
   - DROP `role:member` and `role:supplier` (not in vocabulary). Membership = `tier:member`; shop interest = `interest:markets` (per spec retire-map).
   - Keep the dual-write of flat→namespaced ONLY for the EXPAND phase, then retire per spec.
   - Keep: `tier:member`/`connected`/`curious`, `comms:harvest-newsletter` — these were correct.
2. **Live seeded `tier:` tags** (82/4/57/0/0 on the Harvest board): treat as a one-time seed; from now rungs move only on real `action:` gives. ⚑ Decide: backfill `action:` evidence for existing Members, or accept the seed and let movement take over.
3. **Draft workflows** (all 6 Harvest customer workflows are unpublished — members get silence now): publish per the Harvest alignment spec — independent of this plan, still urgent.
4. **Community-line check**: audit Journey boards for `role:community`-type contacts (e.g. "rachel atkinson — PICC" in Connected) and remove them from the ladder.

## Task Ledger

- [ ] Agree this plan + the value matrix (Ben fills ⚑ cells + community lane)
- [ ] Reconcile Harvest Phase B branch to canonical (`project:act-hv`, drop role:member/supplier, shop→interest:markets)
- [ ] Run the spec's tag migration EXPAND (additive, scripted `migrate-ghl-tags.mjs --dry-run` then live)
- [ ] RE-POINT keeper workflows to canonical tags (UI, one at a time) + update the 5 producing scripts
- [ ] Publish the 6 draft Harvest workflows + build the 3 calendar-tag workflows
- [ ] Build per-project Journey boards + stage→`tier:` sync automation
- [ ] Encode the value matrix into ladder-lift workflow copy
- [ ] RETIRE flat duplicate tags (gated, one at a time, after re-point)

## Decision Log

| Date | Decision | Why |
|---|---|---|
| 2026-06-02 | Value = give/get exchange per audience (not money metric, not score) | Ben, grill |
| 2026-06-02 | Unit = per `role:`, `tier:` = depth; two lanes (supporter ladder + community/consent) | Ben, grill |
| 2026-06-02 | Value lives as a reference matrix + realised gives via `action:` (no new namespace/fields) | Honours "one fact = one tag"; reuses locked vocabulary |
| 2026-06-02 | `tier:` ladder = the theory of movement; engine = value-exchange; rungs EARNED via `action:`, not seeded | Ben's insight; live board is decorative |
| 2026-06-02 | One Journey board per project + cross-project `tier:` rollup | ADR ghl-ecosystem-journey-architecture |
| 2026-06-02 | Adopt the locked 10-namespace tag spec unchanged | Already canonical; do not reopen |

## Verification Log

| Date | Checked | Result |
|---|---|---|
| 2026-06-02 | Live GHL workflows + tag library (read-only API) | All 6 Harvest customer workflows DRAFT; Membership Journey published but 0-enrolled; 397 tags, flat↔namespaced collision |
| 2026-06-02 | This session's Harvest Phase B vs locked spec | DRIFT: invented role:member/supplier, missing project:act-hv — must reconcile |

## Open items (need Ben / community)
- ⚑ The value-matrix cells marked above (funder steward give, buyer purchase as `action:`, partner govern rung).
- ⚑ Community-lane give/get wording (with community, OCAP-grounded).
- ⚑ Seeded `tier:` tags: backfill `action:` evidence vs accept seed.

## Changelog

### 2026-06-02 — Alignment (grill-with-docs)
**Objective:** Find and fill the missing foundational step before building more workflows.
**Changed:** Wrote `wiki/concepts/ecosystem-value-exchange.md`, `wiki/decisions/ghl-ecosystem-journey-architecture.md`, and this plan. Reconciled scope to ecosystem-wide.
**Verified:** Live GHL state (drafts + drift) via read-only API audit.
**Failed/Learned:** This session's Harvest Phase B drifted from the locked spec — caught before deploy.
**Blockers:** Value matrix ⚑ cells + community lane need Ben/community input.
**Next:** Ben fills the matrix; then reconcile the Harvest branch to canonical.

## Provenance
- Live state: read-only GHL API audit (`scripts/list-ghl-workflows-and-tags.ts` in The Harvest Website repo), 2026-06-02.
- Tag/workflow spec: `thoughts/shared/handoffs/2026-06-02-act-ghl-build-spec.md` (canonical 2026-06-02).
- Value/entity context: `wiki/concepts/act-business-architecture.md`, `four-lanes.md`.
- Matrix cells marked ⚑ are INFERRED from docs and unconfirmed; community lane is deliberately unwritten.
