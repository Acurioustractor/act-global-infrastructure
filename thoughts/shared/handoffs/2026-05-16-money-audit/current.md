# 2026-05-16 Money Audit — Handoff

**Status:** Pass A1 + A2 + A3 complete (read-only audit). Pass A4 (archive moves) **awaiting Ben's OK**. Pass B (build `/finance/command` view) is next session.

## Artifacts

- [`inventory.md`](./inventory.md) — full surface matrix (18 routes · 40 APIs · 119 scripts · 46 crons · 17 wiki docs)
- [`decisions.md`](./decisions.md) — per-item KEEP/MERGE/ARCHIVE/HOLD with reasons
- Plan: [`/Users/benknight/.claude/plans/lets-pla-a-huge-goofy-dewdrop.md`](../../../../../.claude/plans/lets-pla-a-huge-goofy-dewdrop.md)
- Scanner: `scripts/inventory-finance-surface.mjs` (re-runnable)

## TL;DR

- 18 React routes (4 untracked in-flight); 8 APIs are clear orphans (zero UI consumer); 3 weekly digests overlap; 4 daily briefings overlap.
- **Pass A archive proposal:** 2 routes + 10 APIs + 2 scripts = **14 items**. Conservative — leaves `board`/`accountant`/`revenue` alone (have consumers or role-dependent).
- **Pass B canonical view:** `/finance/command` layering money-now/money-next (TOP) + alignment-quality (MIDDLE) + action hooks (BOTTOM), backed by new `v_project_alignment_state` Supabase view + daily cron.

## Resume next session

1. Get Ben's OK on archive list (decisions.md → "Pass A action plan")
2. Execute `git mv` batch (Tier 2 — one commit per category)
3. Update `apps/command-center/src/lib/nav-data.ts` lines 122 + 124 (remove `revenue-planning` + `review` from nav)
4. Add `RESTORE.md` in each `_archived/2026-05-16/` dir
5. Verify: `pnpm --filter @act/command-center build` + `npx tsc --noEmit`
6. Begin Pass B: write `supabase/migrations/20260516_project_alignment_state.sql`
