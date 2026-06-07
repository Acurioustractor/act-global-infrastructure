# Archived 2026-05-08 — finance routes cleanup

7 React routes archived as part of the 4-surface model consolidation
(plan: `~/.claude/plans/rewive-all-the-finciance-agile-pearl.md`).

| Route | Why retired | Restore destination |
|---|---|---|
| tagger | Superseded by `/finance/tagger-v2` | `apps/command-center/src/app/finance/tagger/` |
| tagger-bulk | Superseded by `/finance/tagger-v2` | `apps/command-center/src/app/finance/tagger-bulk/` |
| pipeline-viz | Three pipeline views — kept `/finance/pipeline` only | `apps/command-center/src/app/finance/pipeline-viz/` |
| pipeline-kanban | Same | `apps/command-center/src/app/finance/pipeline-kanban/` |
| project-plan | Demo / experiment, replaced by `/finance/projects/[code]` | `apps/command-center/src/app/finance/project-plan/` |
| self-reliance | Experiment | `apps/command-center/src/app/finance/self-reliance/` |
| vendor-rules-suggest | Suggest UI without complete edit flow | `apps/command-center/src/app/finance/vendor-rules-suggest/` |

## Restore one route
```bash
git mv apps/command-center/_archived/2026-05-finance-cleanup/routes/<route> \
       apps/command-center/src/app/finance/<route>
```

After restore, re-add to `apps/command-center/src/lib/nav-data.ts`.

## Why outside `src/app/`?

Next.js scans `src/app/**/page.tsx` for routes. Even directories prefixed with `_` are partially scanned by some toolchains. Moving outside `src/app/` guarantees zero compilation cost.
