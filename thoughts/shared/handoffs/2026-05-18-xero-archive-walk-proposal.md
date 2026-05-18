# Xero archive-walk proposal · 2026-05-17

Source: `/api/finance/audit` (33 archive-candidates) ∩ Xero "Project Tracking" tracking category.

- **0** options would flip ACTIVE → ARCHIVED in Xero
- **0** already ARCHIVED in Xero (no-op)
- **33** codes flagged archive-candidate in projects table but no matching Xero option (no-op)

## Would archive (ACTIVE → ARCHIVED)

| Code | Xero option name | Option ID | projects.status |
|------|------------------|-----------|-----------------|

## Already ARCHIVED in Xero (no-op)

_(none)_

## Flagged archive-candidate but absent from Xero

- `ACT-MN`
- `ACT-FO`
- `ACT-MR`
- `ACT-BM`
- `ACT-TN`
- `ACT-FN`
- `ACT-QF`
- `ACT-DD`
- `ACT-AI`
- `ACT-GCC`
- `ACT-SE`
- `ACT-AS`
- `ACT-ER`
- `ACT-SS`
- `ACT-FP`
- `ACT-FA`
- `ACT-WJ`
- `ACT-YC`
- `ACT-CC`
- `ACT-TW`
- `ACT-HS`
- `ACT-DH`
- `ACT-MM`
- `ACT-MU`
- `ACT-SF`
- `ACT-SX`
- `ACT-WE`
- `ACT-RP`
- `ACT-OE`
- `ACT-OS`
- `ACT-EFI`
- `ACT-APO`
- `ACT-AMT`

## How to push

Add `--confirm` to a follow-up script (not yet written). Run in small batches (Xero `update-tracking-options` caps at 10 per call).
