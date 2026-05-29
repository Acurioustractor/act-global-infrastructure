# Plan — Finance "Xero Mirror" alignment surface (`/finance/mirror`)

**Date:** 2026-05-29 · **Branch:** `wip/goods-finance-recon-2026-05-29` · **Owner:** Ben
**Ask (verbatim intent):** one command-center surface that walks through *as the Xero mirror* to **align tagging**, **showcase every project's funds incoming + outgoing**, and **flag issues**.

## Goal / success criteria
A single `/finance/mirror` page where, top to bottom, you can: (1) trust it's the live Xero mirror, (2) see every project's money IN and OUT at a glance, (3) see the open issues (untagged, missing receipt, duplicates like the Carla/Kirmos pattern), and (4) fix tagging inline on the live rows — without copy-pasting from Xero. Done when tsc + build pass, the page renders on :3002, the rail sums reconcile with `/finance/projects`, and an inline retag persists with `project_code_source='manual'`.

## Non-goals
- Not replacing `/finance/projects` (deep P&L), `/finance/audit` (full audit), or `/finance/xero-page-copilot` (paste-based reconcile) — this **composes + links** them; they stay live.
- No new sync — reads the existing 6-hourly mirror (`xero_transactions` + `xero_invoices`).
- **No Xero writes.** Tag alignment writes `project_code` in Supabase only (existing PATCH; honours the auto-tagger manual guard).

## Architecture — compose, don't reinvent
**Reads (all already exist):**
- `GET /api/finance/transactions` — live mirror rows (bills + spends), `projectCode/source`, `has_attachments`, `bank_account`, per-project counts, projects list. Filters: `project` (incl `UNTAGGED`), `accounts`.
- `GET /api/finance/projects` — per-project `revenue · expenses · net · received · pending · rdSpend`.
- `GET /api/finance/audit` — `auditAlerts` (high/medium: same-day-same-vendor-same-amount dups + PAID/AUTHORISED pairs), `notableFindings`.
- `GET /api/finance/sync-freshness` — "Xero data as of HH:MM".
- `GET /api/finance/trust-meters` — recon % · receipts % · tagging % · GE-429.

**Write:** `PATCH /api/finance/transactions` `{id, source:'bill'|'spend', projectCode}` → `project_code` + `project_code_source='manual'`.

**Components reused:** `FreshnessBadge`, `TrustMeters`, `RetagSelect`, `ReceiptInXero`.

→ **No API changes in v1.** Per-row flags (untagged / missing-receipt / duplicate) compute client-side from data already in the responses (`project_code===null`; `has_attachments===false`; cross-ref `audit.auditAlerts[].xeroLink`).

## Layout (single page, top → bottom = the workflow)
1. **Trust header** — `FreshnessBadge` ("Xero data as of HH:MM") + `TrustMeters` strip. Says: this is the live mirror.
2. **Project In/Out rail** — one chip per project: `name · IN $ (green) · OUT $ (red) · net`, plus an `UNTAGGED (n)` chip. Sourced from `/api/finance/projects` + counts. **Click a chip → filters the mirror below.** (This is "showcase all project funds in/out".)
3. **Flags band** — three actionable counters/cards: **Untagged (n)**, **Missing receipt (n)** (tagged spends, `has_attachments=false`), **Duplicates (n)** (from `audit.auditAlerts`, incl the PAID+AUTHORISED Carla/Kirmos pattern, with Xero links). **Click → filters the mirror to those rows.**
4. **Live mirror table** — columns: `date · vendor · amount (IN green / OUT red) · account · project [RetagSelect inline] · receipt [ReceiptInXero ✓/✗] · flag badges · → Xero`. Controls: project filter (from rail), tag-state (untagged/tagged/all), account (ACT-only default per two-account rule), text search. **Bulk-select → bulk-retag** (PATCH `items[]`).

## Files
| # | Action | File |
|---|---|---|
| 1 | **NEW** | `apps/command-center/src/app/finance/mirror/page.tsx` — the surface (client component) |
| 2 | **NEW** | `apps/command-center/src/components/finance/MirrorProjectRail.tsx` — in/out chips + filter |
| 3 | **NEW** | `apps/command-center/src/components/finance/MirrorFlags.tsx` — flags band |
| 4 | **EDIT** | `apps/command-center/src/lib/nav-data.ts` — add `Align · Mirror` pinned at top of Finance (above State) |

## Open decisions (confirm before build)
- **D1 — route + nav:** `/finance/mirror`, label **"Align · Mirror"**, pinned at the very top of the Finance group (it's the primary alignment entry). OK, or fold into an existing route?
- **D2 — default account scope:** ACT-only (NAB Visa #8815 + ACT Everyday) per the two-account rule, with a toggle to show all. OK?
- **D3 — v1 scope:** include **bulk-retag** in v1 (recommended) or single-row only first?

## Risks / watch-items
- **Volume / pagination:** `/api/finance/transactions` may return a large set. Mirror, the existing `/finance/transactions` page consumes the same API, so it's workable; if unpaginated, add client-side windowing/limit. Verify row count on first load.
- **Rail sums must reconcile** with `/finance/projects` (same source) — verify, don't assume.
- Additive route; only nav-data is edited on existing files → low blast radius.

## Verification log (to run)
- [ ] `npx tsc --noEmit` clean in `apps/command-center`
- [ ] `/finance/mirror` renders on :3002 (logged in `?k=tractorsrcool`)
- [ ] FreshnessBadge shows a real timestamp; TrustMeters populate
- [ ] Rail IN/OUT per project matches `/finance/projects`
- [ ] UNTAGGED chip + flag filters narrow the table correctly
- [ ] Inline retag persists → row's `project_code_source='manual'` (query DB)
- [ ] Duplicate flag surfaces the Carla/Kirmos PAID+AUTHORISED pattern
- [ ] `pnpm --filter @act/command-center build` passes

## Decision log
- 2026-05-29 — Compose over reinvent: no new API; flags client-side. Rationale: every needed read already exists; keeps blast radius to 1 new route + nav.
