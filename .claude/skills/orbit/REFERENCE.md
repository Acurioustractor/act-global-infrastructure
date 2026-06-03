# /orbit — command catalog, playbooks, gotchas

All commands run from the `act-global-infrastructure` repo root. Read-only commands are safe anytime;
`apply`/write commands are Tier-2 (day-shift, explicit verb). Every script logs writes with undo.

## Command catalog

### Read (safe anytime)
```bash
node scripts/build-unified-orbit.mjs            # → thoughts/shared/unified-orbit-worklist.csv (all GHL + Gmail + Beeper)
node scripts/build-contributor-constellation.mjs # → thoughts/shared/el-contributor-constellation.csv (transcript owes-ledger)
node scripts/orbit-tracer.mjs read              # live GHL recon of the tracer subjects
node scripts/orbit-community-line-sweep.mjs prep # classify community-line violations → diff (no writes)
node scripts/orbit-dedup.mjs prep <email|name>   # dry-run dedup plan for one person (or: prep community)
```

### Act (Tier-2 — only after Ben's explicit verb; show before→after first)
```bash
node scripts/orbit-tracer.mjs croft   # promote a known uncaptured ally → circle:gsd-alliance (template)
node scripts/orbit-tracer.mjs kristy  # community-line fix across a person's dupes (tags only, no merge)
node scripts/orbit-tracer.mjs allan   # re-create a deleted community contact (community-lane, EL-linked)
node scripts/orbit-community-line-sweep.mjs apply A   # genuine community individuals: strip tier/drips + lane:community
node scripts/orbit-community-line-sweep.mjs apply B   # mis-tagged team: remove erroneous role:storyteller
node scripts/orbit-dedup.mjs apply <email|name>       # union tags onto richest primary + delete verified-empty dupes
```
The tracer subjects (croft/kristy/allan) are templates — to act on a *new* person, copy the matching
branch and resolve the target live by email (never paste a contact ID).

## Tag namespaces
- `tier:` — supporter ring (curious/connected/member/active/steward). **Supporter lane only.**
- `circle:gsd-alliance` — hand-picked inner circle (orthogonal to `tier:`).
- `lane:community` — the constellation marker (community lane).
- `role:` — storyteller / elder / partner / funder / buyer / supplier / advisory / media / corporate…
  `role:storyteller` / `role:elder` = community-individual signals. `role:community` / `role:community-controlled`
  are **segment/org markers, NOT individual signals** — they must not trigger a community-line violation.
- `comms:*-drip` / `comms:*-newsletter` — funnels/audiences. Drips on a community individual = violation.
- `project:` `place:` `source:` — affinity / provenance.

## Playbooks

### Promote an uncaptured ally → circle:gsd-alliance
1. Confirm they're supporter lane (no community roles). 2. Resolve live by email. 3. Set name if blank.
4. `addTagToContact(id, 'circle:gsd-alliance')`. 5. Re-fetch + show after. (Pattern: `orbit-tracer.mjs croft`.)

### Fix a community-line violation
A genuine community individual on `tier:`/drips → strip `tier:*` + `comms:*drip*`, add `lane:community`,
keep `role:*` and newsletters. Use the sweep: `prep` (classify A/B/C) → review → `apply A`. Bucket C (orgs in
B2B drips, funder staff) are **not** violations — held, never auto-fixed.

### Dedup (no native merge)
`orbit-dedup.mjs prep` picks the richest record as primary, unions tags, and flags only **verified-empty**
secondaries (0 conversations/opportunities/tasks) as deletable. `apply` deletes those; history-bearing
records are **kept** (they need a GHL UI "Manage Duplicates" merge to consolidate opportunities).

### Read the owes-ledger (community lane)
`build-contributor-constellation.mjs` is **transcript-anchored** (the raw gift, not edited stories).
"Honoured/live" = a transcript whose `story_id` → a `stories.status='published'` row. `owes_gap` =
raw + in-draft transcripts not yet brought to life. NEVER an energy score.

## Gotchas (learned 2026-06-03)
- **exec_sql / PostgREST 1000-row cap** — paginate or aggregate; never trust an unpaginated bulk count.
- **GHL search lags after writes/deletes** — verify via direct `getContactById` (404 = gone), not search.
- **`/contacts/merge` = 403** for the private token; **MCP has no merge or delete tool**. Merge is UI-only.
- **`deleteContact` IS permitted** — but only delete verified-empty records; log tags for recovery.
- **Mirror staleness** — `build-unified-orbit.mjs` reads the Supabase mirror, which trails live GHL until
  the `sync-ghl` job runs; a freshly-fixed person can still show as a violation in a regenerated worklist.
- **Hard-coded contact IDs are blocked** by the auto-mode classifier — always resolve live by email.
