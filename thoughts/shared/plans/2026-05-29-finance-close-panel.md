# Plan — command-center Close-Pack panel (#4 fast-follow)

## Context
`scripts/close-the-books.mjs` (shipped this session) produces a period **ready-to-close gate** across 7 lenses, but only on the CLI. Ben wants it on the dashboard. Earlier I deferred this deliberately: a finance panel must be **live** (a static snapshot would silently go stale, the exact failure the "honest by construction" `/finance` rebuild fixed), and a live DB-querying route must pass the `Verify schema contract` CI gate — so it deserves its own focused build, not a ride-along in a big deploy. This is that focused build.

**Outcome:** a live `/finance/close` page in command-center showing the same gate the script produces, period-selectable, deployed to command.act.place.

**Key constraint discovered:** the script's cleanliness lens shells out to `detect-finance-anomalies.mjs` via `execSync` — that **cannot run in a Vercel serverless route**. So the API route must **inline** the anomaly logic (void-candidate / same-day-dup / GE-429) in TS. The script and route will share formulas but not code (the .mjs script and the Next TS app have separate module graphs) — controlled duplication, documented; the **trust test is that the route's JSON matches the script's `--json`** for the same period.

## Deliverable (3 files)
1. **`apps/command-center/src/app/api/finance/close/route.ts`** — NEW. `GET ?period=FY26-Q3|2026-04|FY26` (default = last completed month). Ports the 7-lens close computation + gate to TS, querying `@/lib/supabase`. Returns the same JSON shape as the script's `--json`.
2. **`apps/command-center/src/app/finance/close/page.tsx`** — NEW. `'use client'`, react-query (`useQuery`) → `/api/finance/close`. Period selector (FY26-Q1..Q4 · FY26 · last ~3 months). Renders: verdict banner (🟢/🟡/🔴) · 7 lens cards · prioritised action list · by-project table. Reuses `FreshnessBadge` (`@/components/finance/FreshnessBadge`), `formatMoney` (`@/lib/finance/format`), the finance dark-theme styling (match `/finance/mirror`).
3. **`apps/command-center/src/lib/nav-data.ts`** — add `{ href: '/finance/close', label: 'Close · Pack', icon: ClipboardCheck, … }` after the `/finance/overview` (State · Cockpit) entry (~line 128). Accountant-facing → also fine for the `accountant`/`board` role finance set.

**Deterministic only** — no `--narrate`/LLM in the web view (numbers + gate are the trustworthy core; the AI memo stays a CLI nicety).

## API route — port faithfully from `scripts/close-the-books.mjs`
Reuse the script's exact logic (I wrote it; copy formulas, not guesses):
- **Period parser:** `parsePeriod`/`quarterWindow`/`lastDay`/`currentFy`/`lastCompletedMonth` (AU FY Jul–Jun; Q3 = Jan–Mar).
- **Fetches (paginated past 1000 via `.range`):** ACCPAY bills in period · ACCREC sales in period · `xero_transactions` ACT in period (`bank_account in (NAB Visa ACT #8815, NJ Marchesi T/as ACT Everyday)`, exclude VOIDED/DELETED) · **all-time ACCPAY bills** (void-candidate matching needs PAID twins outside the window).
- **7 lenses:** recon `is_reconciled` % · receipt coverage (bills+spends w/o `has_attachments`, by $) · tagging % (project_code) · cleanliness (inline: void candidates [vendor+amount, PAID↔AUTHORISED within 60d, confidence classify], same-day exact dups, GE-429 from `line_items[].account_code==='429'`) · P&L (honest sales/spend/bills split, no double-count) · indicative BAS (`OUTPUT`→1A, `INPUT`/`CAPEXINPUT`→1B, `line_amount/11`) · R&D (`rd_eligible`/`rd_category` on `xero_transactions` — confirmed present + populated in the app DB).
- **Gate:** same thresholds (recon 98/90 · receipts 95/80 + any item >$1k · tagging 98/90 · cleanliness 0-blockers) → worst-lens verdict + action list.

**Schema-contract:** every `.from().select()` + filter uses columns verified this session (`type`,`status`,`total`,`date`,`has_attachments`,`line_items`,`project_code`,`bank_account`,`is_reconciled`,`rd_eligible`,`rd_category`,`xero_id`,`xero_transaction_id`). Must pass `pnpm schema:check` + the `Verify schema contract` CI gate.

## Verification (end-to-end, before PR)
1. `npx tsc --noEmit` in `apps/command-center` → clean.
2. **Trust test:** `curl 'localhost:3002/api/finance/close?period=FY26-Q3'` JSON must match `node scripts/close-the-books.mjs FY26-Q3 --json` (recon%, untagged$, R&D$, verdict, blockers). If they diverge, the port is wrong — fix until they agree.
3. Visit `localhost:3002/finance/close` → renders, period selector switches periods, FreshnessBadge shows.
4. `pnpm schema:check` (or the schema-contract test) → passes incl. the new route.
5. New branch off updated `main` → push → PR → CI (`Verify schema contract` + `Type Check & Lint` + Vercel build all green) → merge `--merge --delete-branch` (solo-author default) → confirm prod deploy success + `/finance/close` returns 307 (login gate) on command.act.place.

## Out of scope
LLM narrate in the web view · a shared script↔app logic module (separate module graphs; controlled duplication documented in both files) · persisted `period_close_status` table · wiring close into the accountant-pack route.

## Notes
- Branch the current local repo is on (`wip/goods-finance-recon-2026-05-29`) is merged + remote-deleted; start the panel on a fresh branch off `origin/main` (e.g. `wip/finance-close-panel-2026-05-29`). 188 cron-noise dirty files in the tree — stage only the 3 panel files.
- Don't reach for the `accountant-pack` route — distinct feature (data pack vs ready-to-close gate).
