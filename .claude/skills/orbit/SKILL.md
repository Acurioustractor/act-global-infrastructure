---
name: orbit
description: Read ACT's energy-orbit relational CRM — where a person sits (supporter ring vs community constellation), their evidence or owes, flags (violation/dupe/ghost/uncaptured), and the gated next move. Read-only by default; never auto-writes. Use when user says "orbit", "/orbit", "where does <person> sit", "show me the orbit", "is <person> on the wrong lane / a community-line violation", "who's uncaptured", or wants to read or act on the relationship system before any GHL write.
triggers:
  - "orbit"
  - "where does * sit"
  - "show me the orbit"
  - "is * a community-line violation"
  - "who's uncaptured"
---

# /orbit — read the relational system, propose the gated next move

The orbit is the **read**; the system is the loop. This skill reports where a human sits and what to do next — it **never auto-writes**. Every GHL/EL change is Tier-2, day-shift, gated on Ben's explicit verb.

## Two lanes — never one funnel
- **Supporter lane → the rings.** Energy *toward* ACT. Climbs `tier:curious → connected → member → active → steward`; inner circle = hand-picked `circle:gsd-alliance`. Ranked by warmth/evidence (Beeper, Gmail two-way, tier).
- **Community lane → the constellation.** Storytellers / elders (`is_storyteller`, `role:storyteller`, `role:elder`). **NEVER energy-scored, laddered, or dripped (OCAP).** Measured by what ACT **owes back** (the transcript owes-ledger). Marked `lane:community`.

When unsure which lane someone is on, treat them as community.

## Quick start
- `/orbit <name|email>` — where this person sits, their flags, and the proposed (gated) action.
- `/orbit` — orbit overview: counts, community-line violations, dupes, ghosts, uncaptured allies.

## Workflow — read a person
1. If `thoughts/shared/unified-orbit-worklist.csv` is missing/stale, regenerate (read-only): `node scripts/build-unified-orbit.mjs`.
2. Find the person; report **lane** + either supporter (warmth / tier / `circle:`) or community (owes-ledger — see `build-contributor-constellation.mjs`), plus **flags**: `COMMUNITY-LINE-VIOLATION` / `dupe×N` / `ghost` / uncaptured / warm-channel.
3. Propose the next action — **do NOT execute** (see [REFERENCE.md](REFERENCE.md) for exact commands):
   - uncaptured ally → promote · community-line violation → fix · dupes → dedup · ghost → un-ghost.
4. Before proposing any write, verify against **live GHL** (`getContactById`) — the Supabase mirror lags.

## Workflow — act (only on Ben's explicit verb)
Show the live **before → after**, then run the matching tool's `prep` (dry-run) → present → `apply` after the explicit verb. Catalog + playbooks: [REFERENCE.md](REFERENCE.md).

## Guardrails (hard — do not bypass)
1. **Community line.** Never put a storyteller/elder/community contact on `tier:` or a drip; never energy-score them. Fixing that is the point — not extending it.
2. **Writes are gated.** Tier-2, day-shift, human-in-loop, explicit verb required. **Resolve targets live by email at write-time — never hard-code contact IDs** (the auto-mode classifier blocks pasted IDs).
3. **GHL can't merge.** The token adds/removes tags + creates + deletes, but `/contacts/merge` is 403 → merge is UI-only. Dedup = delete *verified-empty* dupes; history-bearing dupes need a UI merge.
4. **Mirror lags.** The GHL→Supabase mirror trails live writes; verify via direct `getContactById`, not search.
5. **Outward-facing → run `consent-check` first.** Internal CRM tagging is not outward-facing; publishing a name/story/photo is.

## Assets it orchestrates
| Script | Role |
|---|---|
| `scripts/build-unified-orbit.mjs` | orbit reconciler → `unified-orbit-worklist.csv` (read-only) |
| `scripts/build-contributor-constellation.mjs` | community owes-ledger from Empathy Ledger (read-only) |
| `scripts/orbit-tracer.mjs` | gated per-person GHL writes (promote / community-line fix / un-ghost) |
| `scripts/orbit-community-line-sweep.mjs` | classify + fix community-line violations (`prep`→`apply`) |
| `scripts/orbit-dedup.mjs` | union tags + delete verified-empty dupes (`prep`→`apply`) |

Governing model: `wiki/concepts/energy-orbit.md` · `wiki/concepts/relationship-first-crm.md`. Plan: `thoughts/shared/plans/2026-06-03-act-network-circle-action-stages.md`. Sibling skills (to build): `/vibe-pass /flow /needs /owes /impact`.
