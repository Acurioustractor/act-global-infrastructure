# 2026-05-16 Money Audit — Handoff

**Status:** Pass A SHIPPED (`cb4d0ad`) + Pass B SHIPPED (`81e4bb1`) on branch `chore/finance-audit-2026-05-16`. Migration applied to shared DB. Build clean (`pnpm build` passed, `tsc --noEmit` exit 0). **Not pushed** — push is a Tier-2 action awaiting Ben.

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

1. **Smoke test** `/finance/command` against live dev server (`pnpm --filter @act/command-center dev` → `http://localhost:3002/finance/command`)
2. Decide on push: `git push -u origin chore/finance-audit-2026-05-16` (Tier 2)
3. (Optional) Open PR for review or merge directly to main
4. **Followups deferred from this pass:**
   - Wire cash-in-bank source (TOP layer KpiCard shows "—" currently)
   - Build `scripts/compute-project-money-state.mjs` for daily snapshot cron (view is read live now)
   - Add "money command summary" block to `scripts/weekly-reconciliation.mjs` Telegram digest
   - Trim 3 redundant weekly digests + 4 daily briefings (cron cleanup — Pass A2)
   - Review HOLD routes: `/finance/board` (role-dependent), `/finance/accountant`, `/finance/revenue`

## Pass A shipped — files

- 14 archive moves (2 routes + 10 APIs + 2 scripts) with RESTORE.md
- `scripts/inventory-finance-surface.mjs` — rerunnable
- `apps/command-center/src/lib/nav-data.ts` — 2 routes removed from nav
- `thoughts/shared/handoffs/2026-05-16-money-audit/{inventory,decisions,current}.md`

## Pass B shipped — files

- `supabase/migrations/20260516000000_money_command_state.sql` (applied)
- `apps/command-center/src/app/api/finance/command/route.ts` (651 B route)
- `apps/command-center/src/app/finance/command/page.tsx` (4.76 kB page)
- `apps/command-center/src/lib/nav-data.ts` (Compass entry pinned to top)
- `scripts/lib/finance/drift-detector.mjs` (shared lib)
