---
date: 2026-06-17
session_name: ghl-forms-tag-alignment
branch: docs/forms-tag-rulings-2026-06-16
status: active — form-code alignment COMPLETE (5 repos); ⚠️ OPEN cross-session collision blocks the final plan commit
---

# Work Stream: GHL forms → canonical tag alignment (+ cron trim)

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-06-17 (save-to-clear) — **GHL forms→tag alignment is COMPLETE across all 5 repos; the sprint was ~95% discovery (4 repos already done) + 2 real builds shipped. ⚠️ One OPEN blocker: a cross-session collision in the act-repo main worktree left a live `index.lock` + contaminated PR #187 + my plan-status commit un-landed (edit safe on disk).**
**Goal:** finish the forms-tag alignment + record it. Remaining real work after this = ONLY the Tier-3 in-account GHL-UI migration. Plan: `thoughts/shared/plans/2026-06-08-whole-system-forms-tag-alignment.md` (carries resolved rulings + per-repo status blocks).

### ⚠️ RESUME FIRST — cross-session collision (act repo)
- Another session was live in the act-repo **main worktree** (violates one-session-per-worktree) and committed **`f73e223`** *"docs(structure): EOFY leaning = option A … holdco"* onto **my branch `docs/forms-tag-rulings-2026-06-16`** (= the PR **#187** branch).
- My `git push` carried `f73e223` to origin → **PR #187 now mixes forms-tag rulings + that unrelated EOFY commit.**
- A live **`.git/index.lock`** (created 05:58, from the other session) **blocked my own commit** → the plan-status edit **did NOT land**. It is **safe, uncommitted on disk**: `thoughts/shared/plans/2026-06-08-whole-system-forms-tag-alignment.md` (+14 insertions = the "Form-code status VERIFIED 2026-06-17" block + the EL line update) AND this handoff file itself.
- **DO NOT** remove the lock or force-push until you confirm the other session is idle/closed.
- **Recovery (next session):** (1) confirm other session idle → `ls .git/index.lock` (remove only if confirmed stale); (2) `git add thoughts/shared/plans/2026-06-08-whole-system-forms-tag-alignment.md thoughts/shared/handoffs/ghl-forms-tag-alignment/` + commit (Plan: 2026-06-08-whole-system-forms-tag-alignment) → updates #187; (3) decide `f73e223`-on-#187: cherry-pick onto its own EOFY branch + drop from #187 (rebase/force-push = Ben's verb), or leave the mix.

### Shipped this session (all verified)
- **Cron trim 133→10** — PR **#186 MERGED** (`f5eb151`). Paused 122 PM2 crons, kept the trip-critical 10 + glue; restore doc `thoughts/shared/handoffs/cron-trim-2026-06-16.md`; reversible via `ecosystem.config.cjs`.
- **Forms-tag DISCOVERY** — 4 of 5 repos were ALREADY aligned on main (plan/memory were 8 days stale): Goods `54b0c5e`, JusticeHub PRs #38/#44/#48/#51, act.place `496e826`, Harvest PR #26.
- **Rulings R1–R11 ALL resolved** (2026-06-17 decision-pass). ⚠️ **R8 = explicit override**: grandfather the **79** bare-`goods-newsletter` contacts despite **0/79 provenance** (47 phantom) — Spam-Act exposure, **reflag before any send**. Recorded in the plan.
- **Goods build** — newsletter opt-in **consent checkbox** (the one real gap; backend R8 gate had no front door) — PR **#126 MERGED** (`15f880d`).
- **EL World Tour build** — was the **lone flat repo**; new `src/lib/ghl/canonical-tags.ts` + the missing consent gate — PR **#317 OPEN** (mergeable, blocked on checks/maybe review). My review caught 2 latent consent defects (pre-ticked box → default-OFF; wrong consent-field key → canonical id `aVnqmajnysMtGYhLD0oA`). Worktree `empathy-ledger-v2/.claude/worktrees/el-tour-tag-align-2026-06-17` (node_modules **symlinked** — remove worktree after #317 merges).
- **Live tool** — `scripts/ghl-smartlist-live-gapcheck.mjs` (the Supabase mirror was found **STALE on counts** — Goods Sendable 46 mirror→28 live; community 74→59; pull from GHL via `POST /contacts/search` filters DSL — `GET /contacts/?tags=` is dead/422).
- **Memory updated** — `website-forms-ghl-one-account.md` + MEMORY.md index line (no longer "Goods mapping TODO").

### Open after resume
1. Land the plan-status commit + de-contaminate #187 (see RESUME FIRST).
2. Merge **EL #317** when green → then `git worktree remove` the EL worktree.
3. Merge **#187** (forms-tag rulings + gapcheck tool) once `f73e223` is resolved.
4. **ONLY remaining alignment work = Tier-3 in-account GHL migration:** re-key the Smart Router branches to canonical in the GHL UI → THEN drop the flat `goods-*`/`newsletter-stream:*` tags; + the R8 grandfather of the 79. Day-shift, Ben's verbs.

### Carry-over (from whole-picture-stack ledger — unchanged)
- ⚠️ **Mac sleep before 27 Jun** — MacBook lid OPEN + on power, then `sudo pmset -c sleep 0` (real Terminal). Else the 10 kept crons miss while away.
- Founder gates (whole-picture v1.5): N3 → `WHOLE_PICTURE_MONEY_CANON=1`; R&D cure → `RD_BASIS_RECORDS_CURED=1`. Still founder decisions.

**PRs this session:** #186 merged · #126 merged · #317 open (EL) · #187 open+contaminated (act, forms-tag).
