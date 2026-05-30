# Phase 0 audit — Xero `Project Tracking` as source of truth

**Generated:** 2026-05-30 · read-only · DB `tednluwflfhxyucgwigh` · lock date `2025-09-30`
**Tool:** `scripts/audit-xero-tracking.mjs` (re-runnable)

## Income (ACCREC) classification

| Metric | Value |
|---|---|
| ACCREC invoices | 125 |
| **With `Project Tracking` option (Xero, the source)** | **15 (12%)** |
| With Supabase `project_code` (current de-facto truth) | 124 |

Classification (Xero Project-Tracking option vs Supabase project_code):

- **MATCH** — 3
- **MISSING** — 109
- **WRONG** — 11
- **NEITHER** — 2

> MATCH = Xero already agrees · MISSING = code present, Xero option blank (backfill) ·
> WRONG = Xero option disagrees with code · CODE_FROM_OPT = Xero has option, Supabase blank ·
> NEITHER = no project info either side.

## Backfill worklist (Phase 2 input)

| | invoices | cash received |
|---|---|---|
| **Unlocked — re-taggable in Xero** | **49** | $611,958 |
| Locked (≤ 2025-09-30) — route to Standard Ledger | 71 | $996,586 |

Unlocked worklist by project:

| project_code | invoices | cash | due |
|---|---|---|---|
| ACT-GD | 16 | $249,711 | $298,100 |
| ACT-PI | 3 | $165,000 | $77,000 |
| ACT-HV | 7 | $96,000 | $16,500 |
| ACT-JH | 5 | $44,000 | $44,000 |
| ACT-SM | 2 | $32,200 | $0 |
| ACT-CP | 1 | $21,780 | $0 |
| ACT-CORE | 1 | $3,267 | $0 |
| ACT-FM | 14 | $0 | $0 |

## `Project Tracking` options actually used on income

- 🟠 ORPHAN `Goods.` — 4
- 🟠 ORPHAN `Mounty` — 3
- 🟢 `ACT-GD — Goods` — 3
- 🟢 `ACT-HV — The Harvest Witta` — 2
- 🟢 `ACT-BG — BG Fit` — 1
- 🟠 ORPHAN `ACT-ER — PICC Elders Room` — 1
- 🟠 ORPHAN `The Harvest` — 1

> ⚠️ **Orphan options** used on invoices but absent from `config/xero-chart.json`: `Goods.`, `ACT-ER — PICC Elders Room`, `Mounty`, `The Harvest`. Either the chart export is stale or these were renamed/created live. Resolve before Phase 1.

## Goods (ACT-GD) spotlight

- Invoices: 29 · cash $649,711 · due $380,600 · locked: 13
- Tracking state: MISSING=25 · WRONG=4

## Standardisation map (Phase 1 input)

Canonical `Project Tracking` options: 33. Dirty/orphan options
to merge into canonical (resolve in Phase 1): see orphan list above + any non-`ACT-XX` strings.

_Full JSON: /tmp/xero-tracking-audit.json_
