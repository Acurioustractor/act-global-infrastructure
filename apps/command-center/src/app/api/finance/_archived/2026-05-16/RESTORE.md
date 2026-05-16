# Restore notes — 2026-05-16 finance API archive

Ten API endpoints archived. Two pair with archived routes; eight were orphans (zero UI consumers in the command-center app).

## Paired with archived routes

| Archived | Pairs with |
|---|---|
| `revenue-scenarios/` | `/finance/revenue-planning` (archived) |
| `review/` | `/finance/review` (archived) |

## Orphan endpoints (zero UI consumer per `scripts/inventory-finance-surface.mjs` grep)

| Archived | LOC | Last edit before archive | Notes |
|---|---:|---|---|
| `dext-setup/` | 143 | 9w | Setup wizard endpoint; no live UI |
| `flow/` | 393 | 9w | Large orphan; likely superseded by overview + workbench |
| `health/` | 567 | 8w | Likely superseded by money-alignment + data-quality |
| `pipeline-viz/` | 172 | 8w | Stranded — route archived 2026-05-08 |
| `project-plan/` | 255 | 8w | Stranded — route archived 2026-05-08 |
| `rd-evidence/` | 233 | 8w | R&D evidence lives in `thoughts/shared/rd-pack-fy26/` filesystem |
| `receipt-finder/` | 240 | 8w | Likely superseded by `receipt-evidence` (1284 LOC, untracked) |
| `vendor-rules/` | 75 | 8w | Stranded — route archived 2026-05-08 |

## Restore command (template)

```bash
git mv apps/command-center/src/app/api/finance/_archived/2026-05-16/<endpoint> apps/command-center/src/app/api/finance/<endpoint>
```

If a restore reveals the endpoint actually had a hidden caller (external client, Postman, webhook), file a follow-up to update the inventory scanner heuristic.
