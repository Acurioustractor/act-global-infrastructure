# F — Row-cap truncation sweep

PostgREST (Supabase JS) returns **at most ~1000 rows per request** — a server-side `max-rows` cap that `.range(0, N)` does **not** override. Any `.from(table).select(...)` whose query scope can match >1000 rows, then reduces/sums/counts those rows in JS, **silently truncates**: wrong totals, no error. Safe patterns: `count:'exact', head:true` (returns 0 rows, count is accurate), `.single()/.maybeSingle()`, tight `.eq(<unique/small>)` scope, small `.limit(n)`, SQL aggregation via `exec_sql`/`.rpc()`, or an explicit `fetchAll`/`fetchPaged` pagination loop.

Verified row counts (Supabase `tednluwflfhxyucgwigh`, 2026-05-26):
`xero_transactions` 3.7k total · **FY26 (date≥2025-07-01) = 2321** · since 2024-07-01 = 3674 · **FY26 SPEND = 1991** · last-6-months = **1064** · last-3-months SPEND = 513 · `total<0` rows = **0** (sign filter `.lt('total',0)` returns nothing).
`xero_invoices` 2.2k total · **active (DRAFT/SUBMITTED/AUTHORISED/PAID) = 2122** · **FY26 (any status) = 1651** · ACCREC (all statuses) = 125 · ACCREC AUTHORISED|PAID since Jul24 = 79 · open ACCREC (AUTHORISED|SENT) = **17**.

---

## HIGH severity — confirmed-wrong totals (>1000 rows in scope, summed/counted in JS, no pagination)

| file:line | table | what it computes | why it truncates | fix |
|---|---|---|---|---|
| `app/api/bookkeeping/progress/route.ts:9` & `:16` | xero_transactions / xero_invoices | `totalIncome`, `totalExpenses`, `netPosition`, monthly trend, top contacts, receivables/payables totals — **all-time, no date/limit** | both fetched with only `.order()` (no pagination); txns 3.7k, active invoices 2.1k → caps at 1000 each | add `fetchAll` paginator (pattern already in `finance/audit/route.ts:29`) |
| `app/api/finance/invoices/route.ts:48` | xero_invoices | `receivableTotal`, `payableTotal`, `paidTotal`, overdue/due-this-week totals + counts | DRAFT/SUBMITTED/AUTHORISED/PAID, no date filter = **2122 rows**, only `.order()` | paginate, or compute totals in SQL |
| `app/api/finance/founder-pay/route.ts:49` | xero_invoices | FY26 `income`/`expenses` → `fy26Net` | `gte FY26_START, lte FY26_END`, no limit = **1651 rows** | paginate the FY26 invoice fetch |
| `app/api/finance/accountant-pack/route.ts:61` & `:68` | xero_transactions / xero_invoices | FY26 R&D + coverage totals | `.limit(2000)` is **false safety** — max-rows still caps at 1000; FY26 txn 2321, FY26 inv 1651 | paginate (or `count`+SQL sums) |
| `app/api/projects/financials/route.ts:10` | xero_transactions | tagging coverage `totalTx`/`taggedTx` via `allTx.length` | `count:'exact', head:false` whole table (3674) but uses the **row array** (`.length`), not the count field → capped at 1000 | use the returned `count` for total; SQL `COUNT(*) FILTER` for tagged |
| `app/api/reports/profit-loss/route.ts:12` & `:20` | xero_transactions | FY `totalIncome`/`totalExpenses` (income+expense, by contact) | FY-scoped (`gte fyStart`) = 2321 rows current FY, summed | paginate, or SQL `SUM` by type |
| `app/api/reports/yearly/route.ts:25` | xero_transactions | current-FY income/expenses + monthly + by-source | `gte fyStartStr, lte fyEndStr` = 2321, summed | paginate / SQL (prev-FY query line 32 also FY-scoped → same risk) |
| `app/api/reports/cash-flow-forecast/route.ts:10` | xero_transactions | `avgMonthlyInflow`/`Outflow` → drives the whole 6-month forecast | last 6 months = **1064 rows** > cap; averages understated | paginate the 6-month window |
| `app/api/business/overview/route.ts:30` | xero_transactions | FY `fyIncome`/`fyExpenses` (line 95 `rdTxns` FY R&D-by-project too) | `gte fyStartStr` = 2321, summed; rdTxns FY across 6 projects also FY-scoped | paginate the FY queries (month/30-day queries lines 43/56 are bounded — safe) |

**Note on `rd-tracking`:** `app/api/finance/rd-tracking/route.ts:71` (JS fallback) and `:134` (`totalsByProject`) are FY-scoped (`gte '2024-07-01'`, 3674 rows) and summed without pagination — *would* be HIGH, but both filter `.lt('total', 0)` and **there are 0 rows with `total<0`** in the table, so they return empty (no truncation today). This is a latent correctness bug (wrong sign filter — spend is stored as positive `total` with `type='SPEND'`), not a live truncation. Flagging for the sign-bug sweep, not as a row-cap.

---

## MEDIUM — scope realistically near or occasionally over 1000 rows

| file:line | table | what it computes | reasoning |
|---|---|---|---|
| `app/api/finance/transactions/route.ts:57` & `:69` | xero_invoices / xero_transactions | explorer rows (`since` default 2024-07-01) via `.range(0, limit-1)`, limit default 5000 cap 10000 | **`.range(0,4999)` false safety** — caps at 1000. Spends+RECEIVE since Jul24 likely >1000 → page silently shows 1000 of more. Display-only (no $ total), but misleads on completeness |
| `app/api/intelligence/route.ts:237` | xero_invoices | receipt-gap `missing`/`missingValue` over all FY ACCPAY | `gte fyStart` ACCPAY subset of 1651 FY26 invoices; could sit near the cap. ⚠️ open question: exact FY ACCPAY count not measured |
| `app/api/subscriptions/discover/route.ts:104` & `:162` | xero_transactions | recurrence detection (fallback) + vendor→project map: ALL SPEND, no date filter | only fires if the recurring-RPC errors; all-time SPEND ≈2000 → truncates, dropping detected subscriptions. line 162 always runs |
| `lib/tools/finance.ts:800` | xero_transactions | `top_untagged_vendors` grouping (ALL untagged, no limit) | headline `untagged`/`total`/`coverage_pct` use `count:head` (accurate); only the vendor-count grouping truncates if untagged >1000 |
| `lib/tools/finance.ts:844` | xero_transactions | `executeTriggerAutoTag` processes untagged via `.limit(5000)` | false safety — auto-tags only first 1000 untagged per run, silently skips the rest |
| `app/api/strategy/route.ts:118` | xero_transactions | FY26 SPEND AUTHORISED coverage signals, `.limit(5000)` | false safety; FY26 SPEND=1991, AUTHORISED subset smaller but may exceed 1000 |
| `app/api/xero/spending-by-project/route.ts:13` | xero_transactions | spend-by-project totals, `?months=` (default 3) | default 3mo = 513 (safe); `?months=12` ≈ all FY26 SPEND (1991) → truncates. Parameter-dependent |
| `app/api/finance/revenue-model/route.ts:24` | xero_invoices | monthly actual ACCREC since 2024-07-01, summed | ACCREC AUTHORISED|PAID since Jul24 = 79 today → safe now, but unbounded by date; flag as it grows |
| `app/api/finance/lifetime-ledger/route.ts:40` | xero_invoices | per-customer lifetime paid/outstanding totals (ALL ACCREC) | ACCREC = 125 today → safe now, but "lifetime" + no pagination means it silently truncates once ACCREC passes 1000 |

---

## LOW / note — `.range(0, N≥1000)` or `.limit(N≥1000)` false-safety, currently under cap; or tightly-scoped

- `app/api/finance/projects/[code]/route.ts:506` & `:514` — `xero_invoices`/`xero_transactions` `.range(0,4999)` but `.eq('project_code', X)`; largest project (ACT-GD/ACT-HV) is hundreds, none >1000. Sums per-project — false safety, fine today.
- `app/api/finance/projects/[code]/transactions/route.ts:71` & `:79` — `.range(0,9999)`, per-`project_code`; same as above.
- `app/api/finance/vendors/[name]/route.ts:13` & `:21` — `.range(0,999)`, per-`contact_name`; a single vendor with >1000 txns is implausible.
- `app/api/intelligence/route.ts:213` (`getPipelineSummary`) — `opportunities_unified` `.range(0,4999)` but scoped `.not('project_codes','is',null)` (ACT-linked subset of 15.5k); `total_value`/`weighted_value` truncate only if ACT-linked active opps exceed 1000 (today they don't).
- `app/api/strategy/route.ts:63` — `opportunities_unified` `.limit(500)` intentional small cap.
- `app/api/finance/pipeline-review/route.ts:31`, `app/api/pipeline/unified/route.ts:11` — `opportunities_unified .limit(1000)/.limit(500)` — at/under the cap, top-pipeline display.
- `app/api/harvest/budget/route.ts:30` — `xero_transactions .eq('project_code','ACT-HV')` (~110 rows), summed — safe.
- `app/api/finance/self-reliance/route.ts:97` — ACCREC FY26 `.limit(500)`, but FY26 ACCREC AUTH|PAID ≈79 — safe.

**Verified SAFE (no change needed):** `lib/finance/ledger.ts` (`getOrgLedger` uses `fetchAllRows`), `finance/audit`, `finance/transactions/reality`, `finance/workbench` (rows via `fetchPaged`, summary via `execSql`), `finance/dext-push-audit` (all via `fetchPaged`), `finance/data-quality` (views), `finance/reconciliation` (count:head), `finance/today-actions`/`rd-tracking` count blocks (count:head), `finance/tax` (BAS-quarter scope, <1000), `finance/weekly-review` (week-window + count:head + open-receivables), `reports/monthly` (single-month), `ecosystem/pulse` (view + 60-day grant window + open receivables), and all `single()`/`maybeSingle()`/`.eq(id)` lookups across contacts/grants/receipts/pipeline/calendar.

---

## Summary

**9 confirmed-wrong totals (HIGH):** `bookkeeping/progress` (income/expense/net + everything), `finance/invoices` (receivables/payables/paid), `finance/founder-pay` (FY26 net), `finance/accountant-pack` (R&D/coverage, `.limit(2000)` false-safety), `projects/financials` (coverage uses `.length` not count), `reports/profit-loss` (FY P&L), `reports/yearly` (FY income/expense), `reports/cash-flow-forecast` (6-month averages, 1064 rows), `business/overview` (FY income/expense + FY R&D).

**Single worst actively-wrong total:** `app/api/bookkeeping/progress/route.ts` — `totalIncome`/`totalExpenses`/`netPosition` sum **all-time** `xero_transactions` (3.7k) and `xero_invoices` (2.1k) with zero pagination; both cap at 1000, so every headline number on that surface is understated by the same class of bug as the production org-`cash_spent` case ($590K vs $975K).

Plus **9 MEDIUM** (parameter/scope/fallback-dependent or growing toward the cap) and **~12 LOW** (`.range/.limit` false-safety currently under cap, or per-entity scoped). The dominant fix is the existing `fetchAll`/`fetchPaged` paginator (see `finance/audit/route.ts:29`) or moving the aggregation into SQL via `exec_sql`.
