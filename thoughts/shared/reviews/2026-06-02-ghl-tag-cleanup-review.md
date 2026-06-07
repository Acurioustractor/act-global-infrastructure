# GHL Tag Cleanup Review — full inventory before re-pointing/publishing workflows

> 2026-06-02. Complete review of every tag in use across **2,502 GHL contacts** (read-only, via `scripts/migrate-ghl-tags.mjs` dry-run against the Supabase mirror). Ben's sequencing: **review + align + clean ALL tags BEFORE turning workflows back on.** This is that review. Full machine output: `/tmp/tag-review-full.txt`.
> Pairs with `thoughts/shared/plans/2026-06-02-act-ecosystem-ghl-architecture.md` and the locked spec `handoffs/2026-06-02-act-ghl-build-spec.md`.

## Scale
- 2,502 contacts · 328 stale (`gone-from-ghl`, skipped) · 157 would gain ≥1 canonical tag (462 adds) on a clean EXPAND.
- ~250 distinct tags in use across ~12 namespaces + flat legacy.

## 1. CANONICAL — already correct, keep (no action)
The namespaced tags already on contacts and mapping to themselves — the system IS partly migrated:
`project:act-gd ×486`, `role:partner ×271`, `comms:partner-drip ×229`, `comms:goods-newsletter ×186`, `comms:newsletter ×175`, `project:act-hv ×142`, `source:website ×131`, `role:supporter ×93`, `role:funder ×87`, `tier:curious ×82`, `interest:membership ×57`, `tier:member ×57`, `place:nt ×53`, `role:community-controlled ×42`, the full `interest:*`, `place:*`, `source:event:*`, `role:*` sets. **These are the target — leave them.**

## 2. FLAT → RETIRE (mapped; gated behind re-pointing the firing workflow first)
Clear flat→canonical migrations (high count shown; full list in machine output). EXPAND adds the canonical; CONTRACT removes the flat **only after** the workflow that triggers on it is re-pointed:
- `act-gd ×477`, `goods ×276`, `project-goods` → `project:act-gd`
- `audience-partner ×281`, `partner ×50`, `goods-partner` → `role:partner`
- `goods-newsletter ×197` → `comms:goods-newsletter`; `newsletter ×82`, `audience-brand ×119` → `comms:newsletter`
- `harvest-website ×166` → `source:website`; `harvest-newsletter ×71` → `comms:harvest-newsletter`
- `justicehub ×60`, `act-jh ×57` → `project:act-jh`; `act-hv ×94`, `harvest`, `the harvest` → `project:act-hv`
- `audience-funder ×89`, `goods-funder ×48`, `funder ×29`, `grant` → `role:funder`
- `audience-storyteller ×37`, `storyteller` → `role:storyteller`; `goods-supporter ×103` → `role:supporter`
- `interest-* ` (membership/community/events/markets/workshops/garden/food/volunteer/sustainability/venue) → `interest:*`
- `goods-state-* → place:*`, `goods-community-* → place:community:*`, `goods-src-* → source:event:*`, `goods-role-* → role:*`, `goods-gmail-* → source:gmail-discovery + role:*`, `supplier-* / vendor-* → role:supplier`, `contained-* → project:act-jh + interest:justice-reform`

## 3. STALE CANONICAL → CLEAN (created by a prior migration run against the OLD mappings)
These namespaced tags are wrong and must be **removed** (CONTRACT), not just superseded:
- **`role:member` ×57** → remove (membership is `tier:member`; EXPAND now also adds `tier:member` to these same contacts).
- **`temp:*` ×84** (warm 41 / cooling 13 / hot 12 / cold 11 / steady 6 / new 1) → retire (namespace killed; tier earned via `action:`).
- **`interest:shop` ×32** → remove (canonical is `interest:markets`, which EXPAND now adds).

## 4. JUNK → DELETE (206 instances; nothing canonical depends on them)
- Pipeline-stage duplicates (the pipeline owns these): `goods-stage-prospect ×56`, `goods-tier-aware ×34`, `goods-tier-engaged ×25`, `goods-tier-champion ×17`, `goods-tier-active ×12`, `goods-stage-customer/active`, `goods-signal`
- Retired `engagement:*` (`engagement:lead ×14`, `engagement:active`)
- Test/noise: `test-submission ×19`, `codex-smoke-test ×4`, `test`, `webhook-test`, `test-delete-me`, all `context: *`, `ai-flagged`, `no email`, `route: /`, `auto-created-from-xero ×8`
- Tooling: `scripts/delete-junk-ghl-tags.mjs` (exists).

## 5. ⚑ DECISIONS NEEDED (these block a clean run)

### A. The `project:` vocabulary is incomplete / drifting — THE big one
The locked closed list is 8: `act-core, act-gd, act-hv, act-jh, act-el, act-ce, act-oo, act-bg`. But the migration emits codes **outside** it:
| Stray code | Count | What it is | Recommendation |
|---|---|---|---|
| `project:act-cn` | 50 | CivicGraph (`civicgraph→act-cn`) | CivicGraph has "no code" in business-arch. **Decide its canonical code** (act-cn? act-cg?) and add to the closed list. |
| `project:act-rs` | 15 | Regen Studio (`act-regenerative-studio`) | **Fold → `project:act-core`** (business-arch: Regen Studio = ACT-CORE). |
| `project:act-ca` | 12 | unknown | Identify or junk. |
| `project:act-in` | 7 | Innovation Studio (ACT-IN) | Real cost-centre in business-arch. **Add `act-in` to the closed list** (or fold → act-core). |
| `act-fa, act-gl, act-mr, act-rp, act-ra, act-cf` | 1 ea | Farm? / unknown | Identify each; `act-fa`→`act-fm` (Farm) likely a typo. |

**Recommended resolution:** align the GHL `project:` closed list to the business-architecture project codes (add `act-in`, `act-fm`, `act-pi`, and CivicGraph's chosen code), and fix the strays (`act-rs→act-core`, `act-fa→act-fm`). Update the locked spec's closed list + the migration PROJECT map together.

### B. Small unmapped tags — quick rules
- `harvest-inbox ×13` → `ops:needs-review`? or keep as operational triage tag? (Decide.)
- `contact ×5` → too vague — junk, or `role:`? (Decide.)
- `contained ×1` → `project:act-jh + interest:justice-reform` (the `contained-` regex misses the bare word — easy rule).
- `form:newsletter`, `needs-attention`, `container - scheduled` (1 ea) → low-stakes; map or junk.

## The order (do NOT skip ahead)
1. **Resolve §5 decisions** (project codes + unmapped) → update locked spec closed list + migration map.
2. **EXPAND `--apply`** (Tier 3) — add canonical tags additively. Nothing breaks.
3. **RE-POINT** each keeper workflow's trigger to its canonical tag (UI, one at a time, test each).
4. **CONTRACT** — delete the §3 stale + §4 junk, one tag at a time, only after its workflow is re-pointed.
5. **THEN** publish the draft workflows + build the new ones. (Publishing earlier just fires them on the messy base.)

> Iron rule (from the locked spec): a flat/stale tag is deleted **only after** every workflow + script that fires on it is re-pointed. The GHL API can't read workflow triggers, so this is UI-verified one at a time.
