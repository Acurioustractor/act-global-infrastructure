# B — Finance operate (transactions, receipts, vendors, invoices, pipeline, funders, harvest)

> Audited 2026-05-26 against shared DB `tednluwflfhxyucgwigh`. Verdicts use the
> `_schema-truth.md` legend (🟢 real · 🟡 stale · 🟠 misleading · 🔴 broken · ⚫ not-wired · ⚠️ unverified).
> Scope = operate surfaces. Money-state routes (overview, runway, etc.) are another agent's job.

## Top findings

1. **The transaction-tagging core works end-to-end and is the strongest part of the system.** `/finance/transactions` + `tagger-v2` + `vendors` + `workbench` + `dext-push-audit` all read live `xero_transactions`/`xero_invoices` (fresh to 2026-05-26), tag by writing `project_code` + `project_code_source='manual*'`, and correctly union ACCPAY bills with bank SPEND/SPEND-OVERPAYMENT/RECEIVE. They honour the two-account rule and the bill↔payment dedup. This is the salvageable spine.

2. **Harvest dashboards under-report spend by ~half — they ignore ACCPAY bills.** Both `/api/harvest` and `/api/harvest/budget` read ONLY `xero_transactions` (bank SPEND). Verified: ACT-HV has **$60,412 in 49 ACCPAY bills** that neither route touches, vs $51,472 in bank SPEND it does count. So the Harvest project page shows ~46% of real spend. (The dedicated `/finance/projects/ACT-HV` stage page — not in this scope — is the one that does it right.)

3. **The `bank_statement_lines` pipeline is STALE (last date 2026-03-31, ~2 months behind, only 1,618 rows).** Everything built on it — `/finance/reconciliation`, `reconciliation/inbox`, `workbench` (bank_lines source), `receipt-evidence`, `dext-push-audit`, `xero-page-copilot` — silently shows nothing for Q4 (Apr–Jun). Numbers shown are correct *for the stale window* but the FY views query through 2026-06-30 and find empty.

4. **`weekly-review` receipt-gap section is broken by a dead column.** `getReceiptGap()` filters `.eq('has_attachment', true)` — the real column is `has_attachments` (plural, verified). Query errors/returns 0 → the receipt score is wrong (likely 0% or "all missing"). Also computes R&D off a vendor-name list (`vendor_project_rules.rd_eligible`), reads stale `financial_snapshots` (17 rows, 20d old) for cash, and ignores bills.

5. **`pipeline-intelligence` over-counts burn/revenue and under-counts R&D.** Uses `type IN ('SPEND','SPEND-TRANSFER')` for burn and `RECEIVE-TRANSFER` for income — internal transfers leak into both. R&D refund is bank-SPEND-only (excludes ACCPAY bills, the bulk of real R&D spend), so the "$XK potential refund" is understated.

6. **Three operate surfaces query dead/missing backing and silently return zeros:** `subscriptions/alerts` (`subscription_alerts` does not exist), `receipts/achievements` + `receipts/score` (`receipt_gamification_stats` is a dead table). All three swallow the error and return empty — the gamification layer is permanently off, disguised as "0 points / no alerts".

7. **Routes that WRITE to Xero (live, irreversible):** `xero-page-copilot/execute` (creates Payments, BankTransfers, attaches receipts — has `dryRun`), `transactions/ocr` + `transactions/route PATCH` (write `_ocr`/`_note` blobs and tags), and `receipt-evidence` POST (uploads to storage + Xero attach via the execute path). None write *bad* data, but execute is Tier-3 and depends on stale bank-line matches for its recommendations — the human must verify against live Xero (the route says so).

8. **No surface writes corrupting financial data**, but two write *into the wrong shape silently*: `harvest/budget` selects `account_code`/`account_name` off `xero_transactions` (those live inside `line_items`, not columns) so `spendByAccount` is always empty; `harvest` selects `description` (not a column) so transaction descriptions are always blank.

9. **`receipt-evidence/pdf-preview` shells out to `pdftoppm`** (poppler binary). Works locally; on Vercel serverless the binary isn't installed → returns "pdftoppm not installed". Effectively local-only.

10. **R&D project lists are inconsistent across routes** — `[EL,IN,JH,GD]` (reconciliation), `[EL,JH,GD,IN,FM]` (pipeline-intelligence), `[EL,IN,JH,GD,PS,CF]` (transactions/untagged). No single source of truth; each route's R&D total differs.

## Surface-by-surface

| Surface | Shows / returns | Lineage (table.cols · transform) | Verdict | Root cause / note | Fix |
|---|---|---|---|---|---|
| **PAGE /finance/transactions** | Filterable txn explorer, inline retag, OCR, notes | → `transactions`, `transactions/reality`, `transactions/vendor-suggestions`, `vendors/[name]` | 🟢 | Thin client; all APIs sound | — |
| API `transactions` GET | Bills(ACCPAY AUTH/PAID)+spends(SPEND/OVERPAY/RECEIVE) unioned, 2-acct filter | `xero_invoices`,`xero_transactions`,`projects`; `exec_sql` distinct codes | 🟢 | Correct types, 2-acct rule, fresh | — |
| API `transactions` PATCH | Bulk/single retag (writes) | UPDATE `xero_invoices`/`xero_transactions` `project_code`+`source='manual'` | 🟢 (write) | Sets manual source = sync-safe | — |
| API `transactions/note` POST | Saves note in `line_items[0]._note` | UPDATE jsonb | 🟢 (write) | No-migration jsonb pattern | — |
| API `transactions/ocr` POST | Gemini OCR of Xero attachment → `_ocr` blob | Xero API (createXeroClient) + Gemini 2.5-flash-lite + UPDATE jsonb | 🟢 (write, ext) | Needs `GEMINI_API_KEY` + Xero token | — |
| API `transactions/reality` GET | Deduped tagged%/receipt% headline | `xero_invoices`+`xero_transactions`, ±30d bill-payment dedup, no-receipt-needed exclusion | 🟢 | Best-built coverage logic in the repo | — |
| API `transactions/vendor-suggestions` GET | Per-vendor most-common project | `exec_sql` over union of both tables | 🟢 | — | — |
| **PAGE /finance/tagger-v2** | Untagged queue + calendar context + tag | → `tagger-queue`, `receipts/calendar-context`, `transactions/tag` | 🟠 | Queue source has sign bug (below) | — |
| API `tagger-queue` GET | Untagged/tagged invoices+txns w/ rule suggestions | `xero_invoices`(ACCPAY); `xero_transactions` **`.lt('total',0)`**; `vendor_project_rules`,`projects` | 🟠 | **SIGN BUG**: SPEND rows store `total` positive, so `.lt('total',0)` returns ~zero bank txns. Queue shows bills only, misses spend rows | Drop `.lt('total',0)`, filter by `type IN (SPEND,...)` |
| API `transactions/tag` POST | Bulk tag by id or contact (writes) + optional vendor rule | UPDATE both tables; upsert `vendor_project_rules` | 🟢 (write) | source='manual' | — |
| **PAGE /finance/vendors** | All-vendor index + drill-in | → `vendors`, `transactions?project=ACT-CORE`, `vendors/[name]` | 🟢 | — | — |
| API `vendors` GET | Per-vendor totals, untagged, top project | `exec_sql` union SPEND/OVERPAY/RECEIVE + ACCPAY AUTH/PAID | 🟢 | — | — |
| API `vendors/[name]` GET | Vendor profile + project distribution + all rows | `xero_invoices`,`xero_transactions` by contact | 🟢 | — | — |
| API `vendor-rules-suggest` GET/POST | Suggests new vendor→project rules from `receipt_emails`; POST inserts rules | `vendor_project_rules`,`receipt_emails` (2,492 rows fresh); heuristic inference | 🟢 (write on POST) | Rule inference is keyword-heuristic (location/keyword) — suggestions only | — |
| **PAGE /finance/receipts-triage** | Receipt-email triage buckets | → `receipts-triage` GET/PATCH | 🟢 | — | — |
| API `receipts-triage` GET/PATCH | Buckets (missing amount/unknown vendor/file/junk) + storage signed URLs | `receipt_emails` (2,492, fresh); storage `receipt-attachments`; PATCH edits row | 🟢 (write) | — | — |
| **PAGE /finance/reconciliation** | BAS-readiness, coverage, chase list, R&D | → `reconciliation`, `reconciliation/inbox` | 🟡 | Stale bank pipeline (below) | — |
| API `reconciliation` GET/POST | BSL coverage/match stats, R&D-at-risk, project/vendor breakdown | `bank_statement_lines` (**stale to 2026-03-31, 1,618 rows**), `xero_invoices`, `subscription_patterns`, `receipt_emails`; POST writes BSL | 🟡 (write) | Logic correct; data pipeline 2mo behind → empty Q4. R&D list `[EL,IN,JH,GD]` stale | Re-ingest bank statements; reconcile R&D list |
| API `reconciliation/inbox` GET/POST | Unmatched BSL + top-3 candidate receipts (fuzzy score); POST resolves | `bank_statement_lines`(stale), `xero_invoices`, `receipt_emails`; POST writes BSL | 🟡 (write) | Matching sound; stale BSL means recent lines absent | Re-ingest |
| **PAGE /finance/workbench** | Unified needs-action queue (bank/txn/invoice) + AI suggestions | → `workbench`, `workbench/accept-suggestion`, `receipt-evidence` | 🟡 | bank_lines portion stale; txn/invoice portion fresh | — |
| API `workbench` GET/PATCH | Items from BSL+txns+invoices, AI suggestion overlay; PATCH tags/rd | `v_finance_bank_line_evidence`(view on stale BSL), `xero_transactions`,`xero_invoices`,`projects`,`finance_ai_routing_suggestions`(254 rows fresh); `execSql` FY summary | 🟡 (write) | Validates project code before write; bank-line items stale (FY query empty for Q4); txn/invoice items fresh | Re-ingest BSL |
| API `workbench/accept-suggestion` POST | Accept/reject AI routing suggestion → write project_code | `finance_ai_routing_suggestions`; UPDATE source table | 🟢 (write) | Blocks ASK_USER/SL_REVIEW auto-apply; marks applied | — |
| API `workbench/ai-queue` GET | High-conf / review buckets of AI suggestions | `finance_ai_routing_suggestions` | 🟢 | 254 rows, fresh 2026-05-26 | — |
| **PAGE /finance/ai-suggestions** | AI routing review/accept | → `workbench/ai-queue`, `workbench/accept-suggestion` | 🟢 | — | — |
| **PAGE /finance/dext-push-audit** | Dext-pushed bills vs bank-line dup-risk classifier | → `dext-push-audit` GET/PATCH | 🟡 | Candidate bank-lines stale; route warns "verify in Xero" | — |
| API `dext-push-audit` GET/PATCH | ACCPAY w/ `reference ILIKE '%auto-pushed%dext_import%'`, classify vs BSL + payments; PATCH tags | `xero_invoices`,`bank_statement_lines`(stale),`xero_payments`,`projects` | 🟡 (write) | Classifier logic good; relies on stale BSL for candidate match | Re-ingest BSL |
| **PAGE /finance/audit** | Cross-project audit alerts, dup groups, project review, OCR finds | → `audit` | 🟢 | — | — |
| API `audit` GET | Deduped expense rows, duplicate detection (dext-id + vendor/amount/date), project-review recommendations, RNM/St Mary's notable finds | `xero_invoices`,`xero_transactions`,`projects`; ±30d dedup | 🟢 | Bills+spends unioned, 2-acct, manual-source skip on mismatch detection | — |
| **PAGE /finance/receipt-evidence** | Bank-line evidence hub w/ receipt previews, manual upload, approve/reject | → `receipt-evidence` GET/POST, `receipts/calendar-context` | 🟡 | Stale BSL view; pdf-preview local-only | — |
| API `receipt-evidence` GET | Evidence rows + signed receipt URLs + reviewable-candidate normalisation | `v_finance_bank_line_evidence`(stale BSL), storage | 🟡 | Same stale-BSL caveat | Re-ingest |
| API `receipt-evidence` POST | approve/reject link, no-receipt-needed, manual file upload (writes) | `finance_receipt_bank_line_links`,`finance_receipt_documents`,`bank_statement_lines`, storage | 🟢 (write) | Real link/document tables exist; upload + link works | — |
| API `receipt-evidence/pdf-preview` GET | Renders Supabase-hosted PDF page → PNG | `pdftoppm` binary; fetch Supabase storage | ⚫ on Vercel / 🟢 local | poppler not installed in serverless → "pdftoppm not installed" | Use a JS PDF renderer or pre-rasterise |
| **PAGE /finance/xero-page-copilot** | Paste Xero Reconcile text → per-row action advice | → `xero-page-copilot` POST | 🟡 | Decision aid; stale BSL lowers match quality for recent rows | — |
| API `xero-page-copilot` POST | Parses pasted Xero text, matches to bank-lines/evidence/bills, advises action | `bank_statement_lines`(stale),`v_finance_bank_line_evidence`,`xero_invoices` | 🟡 | Read-only, no mutation; explicitly "decision aid only". Recent-row matches weak (stale BSL) | Re-ingest BSL |
| API `xero-page-copilot/execute` POST | Executes attach_evidence / find_match_bill (Payment) / transfer (BankTransfer) | Xero API writes + storage download; `dryRun` flag | 🟢 (LIVE Xero write, Tier 3) | Writes correct shapes; recommendations upstream depend on stale BSL — human-verify required | Keep dryRun-first; gate on fresh data |
| **PAGE /finance/invoices** | AR/AP, overdue, due-this-week, aging; inline retag | → `invoices`, `transactions/tag` | 🟢 | — | — |
| API `invoices` GET | All DRAFT/SUBMITTED/AUTH/PAID invoices, AR/AP/overdue stats | `xero_invoices` (fresh), `projects` | 🟢 | All-entity (no entity scope) but plausible; uses `type`/`due_date` correctly | Optionally scope to ACT entity |
| **PAGE /finance/pipeline** | Pipeline review/intelligence/grant-matches + rd-dashboard + revenue-reality | → `pipeline-intelligence`, `pipeline-review`, `pipeline-update`, `grant-matches`, `rd-dashboard`*, `revenue-reality`* (\*out of B scope) | 🟠 | Intelligence over/under-counts (below) | — |
| API `pipeline-intelligence` GET | Tagging coverage, project pipeline, R&D refund, cashflow, insights | `xero_transactions` `type IN (SPEND,SPEND-TRANSFER)`; `opportunities_unified`(15.5k, grant-noise); `execSql` | 🟠 | Transfers leak into burn AND income (`RECEIVE-TRANSFER`); R&D = bank-SPEND-only (no bills) → understated; opportunities_unified is grant-noise-polluted | Exclude `%-TRANSFER`; add ACCPAY bills to R&D; clean opp source |
| API `pipeline-review` GET | Opportunities by stage/type, weighted pipeline | `opportunities_unified` (correct cols: value_mid/stage/probability/project_codes) | 🟡 | Correct columns; source table is 15.5k grant-noise → totals inflated by noise | Filter source_system to real pipeline |
| API `pipeline-update` PATCH/GET | Stage/project edits + audit log | UPDATE `opportunities_unified`; insert `pipeline_changes` (exists) | 🟢 (write) | Stage→probability auto-map; audit table real | — |
| API `grant-matches` GET | Per-project grant fit via embeddings | `project_profiles` (**only 7 rows**, all embedded); RPC `match_grants_for_org`; `grant_opportunities`(25k) | 🟡 | RPC + table exist & work, but only 7 projects have profiles → most projects show no matches | Backfill project_profiles embeddings |
| **PAGE /finance/funders** | Funder warmth + allocation/drawdown overlay | → `funders` GET/POST, `funders/[name]` GET/PATCH, `.../drawdowns`, `.../sync-notion` | 🟢 | — | — |
| API `funders` GET/POST | Warmth + invoice summary + allocation overlay; POST creates allocation | `v_funder_next_move`(view), `v_project_funding_position`(view), `project_funding_allocations` | 🟢 (write) | Views + tables all exist | — |
| API `funders/[name]` GET/PATCH | Funder detail: warmth, allocation, drawdowns, ACCREC invoice history | `v_funder_next_move`,`project_funding_allocations`,`project_funding_drawdowns`,`xero_invoices` (ACCREC, excl DELETED/VOIDED) | 🟢 (write) | Correct invoice scoping | — |
| API `funders/[name]/drawdowns` POST/DELETE | Add/remove drawdown against allocation | `project_funding_allocations`,`project_funding_drawdowns` | 🟢 (write) | Verifies ownership before delete | — |
| API `funders/[name]/sync-notion` POST | Shells `node scripts/sync-funder-reporting-to-notion.mjs` | child_process exec, Supabase+Notion env | 🟡 (write, ext) | Spawns node from /tmp; overrides SUPABASE_SHARED_URL (EL-v2 env trap noted in code). Writes to Notion (outbound page) | Verify script path on Vercel; Tier-2 Notion write |
| API `weekly-review` GET | Cash, weekly flow, overdue aging, receipt gap, R&D, strategic risk, forecast | `financial_snapshots`(**stale 20d/17 rows**), `xero_transactions`, `xero_invoices`, `vendor_project_rules`, `project_health.overall_score`, `opportunities_unified`, `grant_applications`,`grant_opportunities` | 🟠 | **`getReceiptGap` uses dead col `has_attachment`** (real=`has_attachments`)→0%/broken; cash from stale snapshots; R&D from vendor-name list not bills; expenses bank-SPEND-only | Fix col name; bills in R&D; live cash from `xero_bank_accounts` |
| API `ask` POST | LLM Q&A over page context (CFO persona) | MiniMax (`MiniMax-M2.7`) via OpenAI SDK; no DB | ⚫-dependent | No data lineage (context passed in); needs `MINIMAX_API_KEY`. System prompt has stale facts ("14 active projects", "ACT Foundation/Ventures" legal names, R&D `[EL,IN,JH,GD]`) | Update persona facts |
| **PAGE /harvest** | Harvest project cockpit (financials, pipeline, grants, team) | → `harvest`, `harvest/budget` | 🟠 | Under-reports spend (below) | — |
| API `harvest` GET | ACT-HV financials, vendors, monthly trend, stakeholders, team | `xero_transactions` (`.limit(200)`, SPEND/RECEIVE only — **no bills**); `ghl_opportunities`,`ghl_contacts`,`grant_applications`,`subscriptions`,`communications_history`,`resource_allocations`,`project_health` | 🟠 | **Ignores $60K ACCPAY bills** (49 rows) — shows ~half of real ACT-HV spend; selects non-col `description` (always blank); `healthScore: health_score` is dead col→null; limit(200) truncates | Union ACCPAY bills; drop `description`; use `overall_score` |
| API `harvest/budget` GET | Budget-vs-actual phases, cost centres, drawdowns, lease | `config/harvest-budget.json` (static); `xero_transactions` selecting non-cols `account_code`/`account_name` | 🟠 | Budget figures from static JSON (OK); actuals: `spendByAccount` always empty (account_code/name not columns); phase/cost-centre `spent` hardcoded 0 (never reconciled); xeroExpenses bank-SPEND-only (no bills) | Read account from `line_items`; union bills; wire phase actuals |
| API `receipts/scan` POST | Scans recent SPEND no-attachment → seeds `receipt_matches` | `xero_transactions` SPEND has_attachments=false; insert `receipt_matches` | 🟢 (write) | Categorises, skips bank-fee/transfer | — |
| API `receipts/match` POST | Resolve a receipt_match | UPDATE `receipt_matches`; insert `receipt_match_history` (exists) | 🟢 (write) | — | — |
| API `receipts/unmatched` GET | Pending receipt_matches since 2025-10 | `receipt_matches` (2,763 rows) | 🟢 | — | — |
| API `receipts/search` POST | Vendor search of receipt_matches | `receipt_matches` ilike | 🟢 | — | — |
| API `receipts/skip` POST | Mark receipt no-receipt-needed | UPDATE `receipt_matches` | 🟢 (write) | — | — |
| API `receipts/suggestions/[txId]` GET | Email-match suggestion for a receipt_match | `receipt_matches` | 🟢 | — | — |
| API `receipts/calendar-context/[txDate]` GET | Calendar events near a txn date (relevance-scored) | `calendar_events` (2,748, fresh) — no status/all-day filter | 🟡 | Contextual hint only; unfiltered calendar over-includes but low stakes | — |
| API `receipts/pipeline` GET | Receipt funnel (missing→reconciled) counts + stuck | `receipt_pipeline_status` (2,195 rows) | 🟢 | Table exists & populated | — |
| API `receipts/achievements` GET | Gamification points/streaks | `receipt_gamification_stats` (**DEAD table**) | ⚫ | Dead table; swallows error → always 0 | Drop or point at real stats |
| API `receipts/score` GET | Receipt-resolution score + streak | `receipt_matches` (real) + `receipt_gamification_stats` (dead) | 🟡 | Score works (receipt_matches); streak/points always 0 (dead table) | Drop gamification fields |
| API `subscriptions` GET/POST/PUT | List + create + update subs, monthly/yearly AUD+USD | `subscriptions` (68 rows, fresh) | 🟢 (write) | Correct col mapping | — |
| API `subscriptions/[id]` PATCH/DELETE | Update / hard-delete a sub | `subscriptions` | 🟢 (write) | DELETE is a hard delete (destructive but scoped) | — |
| API `subscriptions/summary` GET | Monthly totals, byCategory, dueSoon, unassigned | `subscriptions` active/pending | 🟢 | — | — |
| API `subscriptions/alerts` GET | Subscription alerts | `subscription_alerts` (**does not exist**) | 🔴 | Table absent; swallows error → always empty 0 | Create table or remove route |
| API `subscriptions/pending` GET | Pending discovered subs | `pending_subscriptions` (37 rows) | 🟢 | Table exists & populated | — |
| API `subscriptions/discover` POST | Detect recurring SPEND vendors → insert subs | RPC `execute_sql` (**wrong name** — real is `exec_sql`) → JS fallback over `xero_transactions`; insert `subscriptions` | 🟡 (write) | RPC name wrong but JS fallback runs the same logic, so it works; SPEND-only stats | Rename RPC call or rely on fallback |
| API `bookkeeping/progress` GET | Income/expense, AR/AP, overdue aging | `xero_transactions` (SPEND/RECEIVE bank only — **no bills**); `xero_invoices` | 🟠 | Expenses bank-SPEND-only (ignores ACCPAY bills); all-account (no 2-acct scope); transfers excluded (good) | Add bills to expense total; 2-acct scope |

## What's salvageable

**Keep — the operate spine (works, fresh, correct):**
- `/finance/transactions` + `transactions/{reality,note,ocr,vendor-suggestions}` — the best-built finance code in the repo. Correct types, dedup, two-account rule, manual-source guard. This is the canonical tagging surface.
- `/finance/vendors` + `vendor-rules-suggest` — solid vendor intelligence.
- `/finance/audit` — genuinely useful cross-project duplicate/mismatch detection.
- `/finance/invoices`, `/finance/funders` (+ all funder sub-routes), `/finance/ai-suggestions` (`workbench/ai-queue` + `accept-suggestion`) — all read real fresh data and write safely.
- `receipts/{scan,match,unmatched,search,skip,suggestions,pipeline}` + `receipts-triage` — the receipt-match workflow is real and populated.
- `subscriptions` CRUD + `summary` + `pending` + `discover` — functional.

**Fix before trusting (correct logic, wrong data/column):**
- **`/harvest` + `/harvest/budget`** — highest-value fix: union ACCPAY bills so Harvest shows its real ~$112K spend not ~$51K; read account from `line_items`; use `overall_score`.
- **Re-ingest `bank_statement_lines`** (2mo stale) — unblocks reconciliation, inbox, workbench bank-lines, receipt-evidence, dext-push-audit, xero-page-copilot in one move.
- **`tagger-queue`** — remove the `.lt('total',0)` sign bug so bank spend rows appear.
- **`weekly-review`** — `has_attachment`→`has_attachments`; add bills to R&D; live cash.
- **`pipeline-intelligence`** — drop `%-TRANSFER` from burn/income; add bills to R&D; de-noise `opportunities_unified`.

**Archive / decommission:**
- **`subscriptions/alerts`** (`subscription_alerts` dead) — remove or stand up the table.
- **`receipts/achievements`** + gamification fields in `receipts/score` (`receipt_gamification_stats` dead) — the gamification layer never worked; drop it.
- **`receipt-evidence/pdf-preview`** — non-functional on Vercel (no poppler); replace with a JS renderer or archive.
- **`ask`** persona — either update the stale facts in the system prompt or retire it (MiniMax dependency, no data lineage).

**Cross-cutting recommendation:** the bills-ignored pattern (harvest, bookkeeping, pipeline R&D, weekly-review R&D) and the inconsistent R&D project lists both argue for a shared `lib/finance.ts` income/expense/R&D helper — same conclusion as the company-overview audit. Build it once, reuse everywhere, so these surfaces stop disagreeing.
