# GHL Field Strategy — make the most of the system, cut the bloat

**Date:** 2026-05-27 · Location `agzsSZWgovjwgpcoASWG` (A Curious Tractor) · audit-backed.

## The finding (measured, not guessed)
Of **~51 contact custom fields**, only **11 hold any data** across all **2,377 contacts**. **40 fields are empty scaffolding** (0 records) — built for forms/journeys that never populated them. That's the bloat.

| Field | Records with data | Verdict |
|---|---|---|
| Relationship Score · Last AI Action · Suggested Action | 147 ea | **KEEP** — AI engagement layer |
| CivicGraph Profile | 122 | **KEEP** — entity link |
| Goods · LinkedIn Tags | 67 | KEEP (or migrate to tags) |
| Project Designation | 8 | RETIRE → tag `project:*` |
| Product Type / Order Number / Order Total | 5 ea | KEEP (Goods order flow) |
| Seeds · Partnership Type | 1 ea | RETIRE → tags |
| **~40 others** | **0** | **ARCHIVE — zero data loss** |

## The unit-of-record principle (the root fix)
GHL contacts are **people**. We store **orgs** (councils, ACCHOs, foundations) as contacts + opportunities. So:
- **Org identity** → record name + `Business Name` + **tags** (`goods-role-*`, `goods-state-*`, `goods-communitycontrolled`). Add ONE field: **ABN** (the universal join key to Xero/GrantScope/ACNC).
- **Process state** → pipeline + stage (already right).
- **Impact / cumulative history** → **Supabase** (`goods_asset_lifecycle`, `goods_communities`, GrantScope). GHL is NOT the impact database — it holds the *relationship* + read-only **rollup** fields synced from Supabase.

## The decision rule (apply to every new field idea)
> **Filter or trigger on it → tag. Report a number / merge into comms → field. Process state → pipeline stage. Cumulative history → Supabase (sync a rollup to GHL if a human needs to see it).**

## What we're adding (minimal, high-value)
- `ABN` (contact, text) — org join key.
- `Beds delivered` (contact, number) — rollup from `goods_asset_lifecycle`.
- `Washers delivered` (contact, number) — rollup.
- `Last delivery date` (contact, date) — rollup.
(Impact data today: 384 beds + 20 washers across ~7 communities — synced, never hand-typed.)

## What we're retiring / hiding
- **40 empty fields** → archive (no data). Immediate UI relief: tick **"Hide Empty Fields"** in the edit modal.
- **Redundant project fields** (`Project Designation/Interest/Links/Role/Seeds` — 6 ways to say project) → collapse to `project:<slug>` tags; migrate the ~9 records with data first.
- **Duplicate** `how_did_you_hear` (2 copies) → keep one.

⚠️ GHL field deletion drops the data on every record using it. For the 40 empty fields it's safe. For the ~6 low-use ones, migrate data to tags FIRST, then archive. Prefer **hide** over delete where unsure.

## Folders (so org records aren't visually buried)
Keep folder groups tight: **Org & Impact** (ABN, Beds/Washers delivered, Last delivery, Community), **Relationship/AI** (Relationship Score, Suggested Action, Last AI Action, CivicGraph), **Goods Orders** (order fields), **Person** (the storyteller/volunteer/consent fields — only show on person records). Use "Hide Empty Fields" as the default working view.

## ⚠️ The impact-numbers truth chain (why beds/washers numbers keep differing)

```
LIVE assets table          stale CSV                 shared mirror            GHL rollups
(canonical, QR-updated)    expanded_assets_          goods_asset_lifecycle    Beds/Washers
project cwsyhpiuepvdjtxaozwf  final.csv (2 Dec 2025) ─→ (404 rows, =CSV)    ─→ delivered fields
   │                            ▲                                                  │
   └─ grantscope/goods-lifecycle-sync.mjs reads the CSV, NOT the live table ──────┘
```

**Root cause of "different numbers every time":** the pipeline is FROZEN on a **2 Dec 2025 CSV export**. `goods-lifecycle-sync.mjs` reads `data/expanded_assets_final.csv` (404 rows), never the live `assets` table. Live deployments since Dec never propagate.

**The fix (one source of truth):** rewrite the sync to read the LIVE `assets` table (project `cwsyhpiuepvdjtxaozwf`, the Goods v2 DB) → aggregate per community → upsert `goods_asset_lifecycle` → trigger the GHL rollup sync. Then cron it (weekly).

**Blocker:** the Goods `v2/.env.local` is malformed (unquoted multi-word values break env parsing — same issue that broke `source .env.local`). Fix the quoting (or run from a clean env with the `cwsyhpiuepvdjtxaozwf` URL+service key) and the live resync runs. Read-only count tool staged: `Goods Asset Register/v2/scripts/count-live-assets.mjs` (works once env is sane).

## Status
- [x] Audit + field strategy (this doc)
- [x] Created ABN + 3 rollup fields (`scripts/create-goods-impact-fields-2026-05-27.mjs` — applied)
- [x] GHL rollup sync built (`scripts/sync-goods-impact-to-ghl-2026-05-27.mjs`); ran — Palm Island→PICC (131 beds/10 washers) written. Other communities need a curated community→record mapping + the live-assets refresh below.
- [ ] **Un-freeze the impact pipeline**: sync from live `assets`, not the Dec-2 CSV (blocker: fix `v2/.env.local` quoting)
- [ ] Curated community→GHL-record map (Tennant Creek→? Utopia→? Maningrida→Mala'la? etc.)
- [ ] Field consolidation/archive pass (after Ben confirms the retire list — 40 empty fields safe)
