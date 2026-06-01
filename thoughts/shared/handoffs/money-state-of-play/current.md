---
title: Money state of play — Xero Mirror + ongoing bookkeeping (3/4 roadmap); $76K duplicate finding
date: 2026-05-29
status: open — /finance/mirror live (localhost, not deployed); 3 of 4 ongoing-bookkeeping items shipped; $76K phantom-AP void worklist ready for review
session: claude (Opus 4.8, 1M context) — 2026-05-29 Xero Mirror build + ongoing-bookkeeping roadmap
related_handoffs:
  - 2026-05-29-xero-mirror-and-ongoing-bookkeeping.md (FULL session record — READ THIS FIRST)
  - 2026-05-29-finance-cockpit-and-goods-recon-handoff.md (earlier: bookkeeper corrections + AP recon)
related_plans:
  - thoughts/shared/plans/2026-05-29-finance-xero-mirror-surface.md
  - thoughts/shared/plans/2026-05-29-xero-close-the-loop.md
related_financials:
  - thoughts/shared/financials/2026-05-29-duplicate-void-worklist.md ($76K phantom AP)
---

## Ledger
<!-- This section is extracted by SessionStart hook for quick resume -->
**Updated:** 2026-06-01 (PM-5) — ALL finance fixes shipped, reviewed (clean-context CONFIRMED), pushed & SYNCED. Workbench transfers+DELETED, ledger.ts+rollup DELETED (R&D refund $235,232→**$221,377**), credit-card direction (credits=transfer/refund not income), clickable KPI cards + empty state, NULL-safe hardening, and the `tag-transactions` skill rewritten workbench-first. Live command center on :3002 — `/finance/workbench` is the tagging surface.
**Read first:** `.claude/skills/tag-transactions/SKILL.md` (the TEMPLATE for finance-skill alignment) · `apps/command-center/src/lib/finance/workbench.ts` · memory `command-center-finance-truth.md` (DELETED bullet — all-fixed) · review verdict `thoughts/shared/reviews/2026-06-01-finance-nit-confirmation.md`.
**HEAD `ca49aef`** on `wip/opus-4-8-prompting-2026-05-31`, SYNCED with origin (all pushed).
**NEXT (do in a fresh context):** align the remaining finance skills — `find-receipt`, `bas-cycle`, `scan-subscriptions`, `db-check`/`preflight`, `act-money-brain:*` — to the workbench + money-guards (two-account, transfers-not-taggable, DELETED-exclusion, credit-card-credits≠income, PostgREST cap, verify vs project_monthly_financials), using `.claude/skills/tag-transactions/SKILL.md` as the template. Then: the 2 systemic plans (`2026-06-02-account-class-credit-card-detection.md`, `2026-06-02-ingest-deposit-account-bank-lines.md`) + Ben's live tagging queue (workbench Project gaps + Review ACT-IN).

### Session 2026-06-01 (PM-4) — DELETED fix extended to canonical surfaces (ledger.ts + rollup); command center live for tagging
- **Shipped `fd47762` (LOCAL, unpushed):** `.neq('status','DELETED')` on `ledger.ts getOrgLedger` spend/receive reads + `scripts/calculate-project-monthly-financials.mjs` txn fetch; **repopulated project_monthly_financials**. Verified live: rdEligibleSpend $540,764→**$508,914**, rdPotentialRefund $235,232→**$221,377**, cashSpent $976,580→**$944,292**, rollup FY26 expenses $1,221,032→**$1,188,744**. tsc clean, workbench tests 4/4 (no regression).
- **Command center LIVE on :3002** (pre-existing dev server, pid 46512). `/finance/workbench` confirmed 200 + full editing UI (status tabs incl. `needs_project`/`project_review`, project dropdown, single-row PATCH that sets `manual_workbench` → auto-tagger-safe). **This is where Ben does the project calls live + synced.**
- **Ben's live tagging queue (on /finance/workbench):** status=`needs_project` → 14 invoices + 4 bank income lines; status=`project_review` → 2,599 ACT-IN catch-all; + un-tag 4 transfers wrongly tagged to a project.

### Session 2026-06-01 (PM-3) — Workbench DELETED + transfer fix (tracer-bullet caught a $31.7K R&D overstatement)
**The ask was "fix this"** (pasted the PM-2 sign-off). Verified PM-2's facts were ALL accurate (workbench works, tests pass via `node --import tsx --test`, git clean) — so "fix this" = do the alignment work. Chose tracer-bullet → safe subset.
- **Tracer-bullet finding: the "254 untagged Xero transactions" ($1.95M) are 100% internal bank transfers** (127 SPEND-TRANSFER + 127 RECEIVE-TRANSFER between ACT's own 2 accounts; blank contact; 0 AI suggestions). They must NOT get a project code — tagging would double-count. **There was no safe subset to tag.** Plus 58 of the 254 were DELETED; 7 sat in excluded accounts; 4 transfers are wrongly tagged to a real project (double-count, un-tag = deferred Tier-2).
- **Bigger finding: `status='DELETED'` (voided) rows pollute every count.** FY26 = 309 DELETED txns ($429K); 249 DELETED SPEND ($32,288), 205 rd_eligible ($31,761). **$31,761 of the $325,947 "R&D-eligible spend" headline was voided rows** → ~$13.8K of refund resting on voided spend.
- **FIXED + PUSHED `a09b7ea` (`workbench.ts` + `workbench.test.ts`):** exclude transfers from `needsProject`/`xero_project_gaps`; exclude DELETED from summary SQL + row loaders. Unit test pins the transfer rule. tsc clean, tests **4/4**. Live verify: `xeroProjectGaps` 254→**0**, `rdEligibleSpend` $325,947→**$294,186**, `actInReview` 2,779→**2,599**.
- **BLAST RADIUS (Ben's 2nd ask) — VERIFIED, QUEUED not fixed:** `ledger.ts getOrgLedger` (no status filter → `cashSpent`+`rdEligibleSpend` inflated; **R&D claim basis**) and `scripts/calculate-project-monthly-financials.mjs` (→ `project_monthly_financials.expenses` inflated ~$32K, headline P&L). Transfers already safe in both. Fix plan: `thoughts/shared/plans/2026-06-01-deleted-row-exclusion-canonical-finance.md` (TDD + Tier-2 table repopulate; clean context).
- **REAL remaining alignment work (Ben's project calls, NOT auto-taggable):** 14 invoices (Kennards/Bunnings/Maleny Hardware/TNT Plastering/Joseph Kirmos $4.5K/Sophie Hickey — Harvest/Farm), 4 bank income lines (DTF/Airbnb×2/Uber), **2,599 ACT-IN catch-all**.

### Session 2026-06-01 (PM-2) — Finance Workbench = the cross-project spend/income alignment tool (ALREADY BUILT)
**The ask** ("command-center review + tagging + alignment of spend & income across all projects") **already has a tool** — found it in-flight (uncommitted, from a 31-May session on this branch) and preserved it.
- **`apps/command-center/src/lib/finance/workbench.ts` (727 lines)** + `api/finance/workbench/route.ts` (refactored 657→103, logic now in the testable lib) + `workbench.test.ts` (now tracked). Unifies **bank_statement_lines + xero_transactions + xero_invoices** for the FY (`2025-07-01..2026-06-30`) into ONE review surface. Per-row flags: `needs_project` (untagged), `project_review` (**ACT-IN catch-all + vendor-rule guesses needing a human**), `receipt_gap`, `unreconciled`, `rd_review`; + AI project suggestions. Paginates (respects PostgREST 1000-cap). **Default `source=bank_lines`; pass `?source=all` for the full cross-source view.**
- **VERIFIED real (not inferred):** `tsc --noEmit` clean (whole app); workbench tests **3/3**; `GET /api/finance/workbench` → **200** with a working NON-ZERO summary:

  | bankProjectGaps | xeroProjectGaps | invoiceProjectGaps | actInReview (ACT-IN catch-all) | rdReview | rdEligibleSpend | receiptGaps | unreconciled |
  |---|---|---|---|---|---|---|---|
  | 4 | **254** | 14 | **2,779** | 688 | $325,947 | 64 / $49,872 | 518 / $649,237 |

- **THE ACTUAL ALIGNMENT WORK (next session, start here):** the big cross-project gaps are **2,779 ACT-IN catch-all rows** + **254 untagged Xero transactions** + 14 untagged invoices. Use `?status=project_review` and `?status=needs_project`. **Money-tagging = follow the auto-tagger guard** (skip `project_code_source LIKE 'manual%'`) and the **two-account rule**; per CLAUDE.md, any tagging that changes a project total should be checked against `project_monthly_financials`. UI page: check `apps/command-center/src/app/today/page.tsx` (today components also changed in this commit) + whatever consumes the workbench API; confirm the front-door route before driving it.
- **⚠️ PROCESS — READ:** mid/late this session the tool-output display layer became unreliable under large context (echoing duplicated + partly-confabulated bash/temp-file output). This produced THREE false alarms I had to retract: (1) "harness corrupting edits" (really: I matched strings not in the files), (2) "cross-session race on `7eac883`" (really: an existing 31-May commit), (3) "workbench summary reads all-zero / gitignore eats all tests" (really: summary works, tests are tracked). **Lesson: verify with single minimal tool calls; don't trust large batched output. The workbench facts above were re-verified with clean single calls. `/clear` before continuing.**

### Session 2026-06-01 (PM) — Tier-3 draft review + doc-drift + push

### Session 2026-06-01 (PM) — Tier-3 draft review + doc-drift + push
- **Reviewed the 4 Tier-3 cutover drafts (clean-context).** Findings: (1) **Knight Photo pack self-flags HOLD** — it's sole-trader↔sole-trader, NOT a valid Pty R&D lever; this *contradicts* the prior "raise Knight Photo invoices next" — the draft's HOLD-until-SL is the safer read. (2) **Novation: Minderoo Goods grant → Butterfly, not ACT Pty** (sharpened in the draft, committed). (3) **Test-invoice runbook = most ready, SL-independent** — can run once Pty Xero+NAB live. (4) **Service agreement can't execute before 26 Jun Butterfly handover** + needs independent charity-board approval.
- **Doc-drift fixed + committed:** stale "Farm Pty Ltd (forming)" removed from `wiki/concepts/four-lanes.md` (×3) + `act-identity.md` (×1). Grep-verified: only correct conditional "Farm Pty only if/when it earns" remains.
- **Corrections to prior ledger:** `wiki/concepts/goods.md` **does not exist** (prior "reconcile goods.md" pointed at nothing). **Money Cockpit is NOT greenfield** — `forecast.ts`, `staffing.ts`, `money-cockpit/page.tsx` already exist (parked, with tests); it's "complete the gap," not "build." "Goods Pty" survives only in dated handoffs (history, leave) + the Notion proposal (flag, unfixed — Tier-2).
- **Process note:** burned a long stretch on a FALSE "harness corrupting tool output" theory; reality = I was matching strings not in the files. Tools were fine. Read exact strings before editing.

### Session 2026-06-01 (AM) — entity architecture, cutover, Goods/Butterfly, R&D reframe

### Session 2026-06-01 — entity architecture, cutover, Goods/Butterfly, R&D reframe

_(AM arc — full detail retained below.)_

**Arc:** started as "review command-center finance overview / build a Money Cockpit" → pivoted to the **sole-trader → ACT Pty cutover** → then **documenting the whole ACT business/entity architecture** → deep-dive on **Goods on Country**.

**Locked decisions:**
- **ABN 36 697 347 676 issued** + GST registered for A Curious Tractor Pty Ltd (was THE blocker; unblocks Pty Xero/NAB/payroll/invoicing).
- **Goods on Country = The Butterfly Movement Ltd** (existing ACNC charity/CLG handover, ex-TABOO, Indigenous-MAJORITY board; formal handover 26 Jun 2026). **NO Goods Pty.** NOT A Kind Tractor. ACT Pty = commercial/operational arm + R&D claimant; charity = grants/DGR (pending). → memory `goods-butterfly-structure.md` + 2 Notion pages.
- **Entity trajectories** (canonical `wiki/concepts/act-business-architecture.md`): core in ACT Pty (Innovation Studio, Regen Studio, Empathy Ledger, JusticeHub, CivicGraph-for-now) · commercial subsidiary (Harvest Pty) · DGR charity (Goods=Butterfly) · partnership (PICC/Oonchiumpa/CFE) · CivicGraph = deferred spinout (ACT-Pty-IP until raise) · ACT Farm/BCV = land-in-Nic's-trust + program · EL+JH stay core.
- **🔴 R&D RED-FLAG (verified vs ATO primary source):** FY26 R&D likely STRANDED — Pty only existed from 24 Apr 2026; pre-incorporation sole-trader spend not claimable (s355-35/s355-205). Contradicts the old "claim FY26 ~$200K via Pty" AND ACT's own Path C logic. **Re-baseline: FY26 ≈ $0-25K; FY27 ≈ $200-260K recurring** (engine = founders on Pty payroll FY27). Research: `thoughts/shared/research/2026-06-01-cutover-tax-verification.md`.

**Built (local commits):** live `/finance/pty-readiness` page (cockpit panel 1) + Plan section on `/finance`; `pty-readiness.json` refreshed + 3 new items (family trust elections, Goods DGR app, ACT Pty↔Butterfly service agreement) = **25 items, 15 critical, 0 blocked**; corrected `act-core-facts.md` (ABN + Butterfly row); Goods `destination_entity` routing baked into `export-sole-trader-to-pty-mapping.mjs` (run HELD pending SL).

**Drafted (Tier-3, NOT sent — Ben to action):** `2026-06-01-sl-rd-eligibility-question.md` (**SEND FIRST — resizes the refund**) · `…-funder-novation-letters.md` · `…-knight-photography-invoice-pack.md` · `…-pty-test-invoice-runbook.md` · `…-actpty-butterfly-service-agreement-outline.md`.

**NEXT (priority):**
1. **Ben:** send the SL R&D question; then raise Knight Photo invoices + review/send novation letters (after SL template cross-check).
2. When SL confirms the journal premise → run `export-sole-trader-to-pty-mapping.mjs` + `node scripts/sync-act-context.mjs --apply` (propagate act-core-facts to 9 repos).
3. **Parked:** Money Cockpit forward-6mo + staffing module (original first slice). Notion proposal doc out of date (says "register Goods Pty" — overridden). `goods.md` + four-lanes "Farm Pty forming" need reconciling to the architecture doc.
4. **Push?** 3 local commits on `wip/opus-4-8-prompting-2026-05-31` are unpushed.

**Traps this session:** Supabase MCP down (use psql/scripts). Memory files live in the separate `~/.claude` config repo, not this repo's commits.

---
**PRIOR WORKSTREAM (2026-05-30 — Xero source-of-truth):**
**Read first:** `thoughts/shared/plans/2026-05-30-xero-source-of-truth-goods-ledger.md`
**Shipped to main:** PR #127 (`/finance/funders` drift overlay + ACT-GD filter — LIVE) · PR #128 (Phase 2 backfill tooling + SL handoff) · **PR #129 (Phase 3 — invoice sync derives project_code FROM Xero, merged `b57f5df`).**
**Phase 3 (this session):** **MERGED to main** (PR #129, commit `c10cbaa`).
- **The mirror now derives `project_code` FROM Xero `Project Tracking`.** Root gap found: the invoice sync *never wrote project_code* (line 614 computed it as a stat counter and discarded it — the bank-txn block at 816 did write it; invoices were maintained only by standalone taggers). Added `detectProjectFromXeroTracking()` (authoritative Project Tracking/Project category ONLY) + hybrid write (Xero-where-present, else preserve) + DB manual-guard to the invoice `record`.
- **Verified** (`invoices --days=250`, 1248 invs, 0 err): Goods ACCREC ACT-GD = **19 / $650,910.79**. The +$1,200 vs $649,711 = **INV-0327 John Villiers**, live Xero tags it `ACT-GD` (flights/accom/program mgmt) but old heuristics misfiled `ACT-CORE` — Xero asserting authority, correct. **583 invoices** (all types) now source=`xero_tracking`; manual tags preserved. INV-0298 Dusseldorp confirmed `ACT-JH` live (dry-run's "→ACT-MY" was stale-mirror noise).
- **Window caveat:** `--days=N` filters by invoice **Date** so it excludes VOIDED (good — the dry-run's voided "flips" never happened) but misses retro-modified invoices dated before the window; the cron's next incremental pass relabels those.

**Prior phases:** Phase 1 = no-op (live Xero already has 33 clean `ACT-XX` options; PICC=`ACT-PI`). Phase 2 = 17 unlocked income invoices tagged in live Xero (`apply-xero-tracking-backfill.mjs`, revert log `scripts/output/xero-tracking-backfill-revert-2026-05-30.json`). Phantom receivables cleared earlier (5 VOIDED/DELETED rows, $375,100 amount_due zeroed).

**Session cont. (2026-05-30 PM) — pre-SL finance cleanup + Project Money page. MERGED to main: PR #130 (`d3a1093`) → deploying to command.act.place.** (4 commits:)
- `a998a28` **voided-receivable guard** — query layer was ALREADY safe (view excludes voided; receivable routes whitelist AUTHORISED/SENT); real hole was data-layer. Sync now forces `amount_due=0` on VOIDED/DELETED; `lifetime-ledger` exclusion made explicit. 0 voided rows currently carry stale due.
- `0b19080` + `37832ac` **expense tagging → FY26 100% coverage (income 0 / bills 0 / spend 0 untagged).** Income was already 100%; of 141 untagged FY26 expenses, 106 vendor-rule (ACT-HV 71 / ACT-IN 20 / **ACT-GD 10 = Ben's ASP/DRW on-country call, incl. 6 "Flight Bar Witta" mislabels** / 5 misc) + 35 incidentals by location signal (ACT-CORE 21 overhead default / ACT-IN 7 travel / ACT-PI 5 North QLD / ACT-EL 2 photo). All source `manual-bulk-2026-05-30` (guard-protected). Artifact `thoughts/shared/financials/2026-05-30-untagged-expense-tag-proposal.md`.
- `9442d5d` **`/finance/project-money`** — new live front-door: coverage banner (income 100% / expense 99%) + per-project income/received/expense/net. Expense = SPEND + unpaid-bill `amount_due` (no double-count; calibrated vs `project_monthly_financials`). FY26 totals: in $1.39M, exp $1.61M, net -$222K (overhead ACT-IN -$333K/CORE -$266K vs PI +$322K/HV +$92K/GD +$44K). tsc clean, API verified live on :3002.

**Sense-check session (2026-05-30 PM) — front-end review of `/finance/project-money`. MERGED: PR #131 (`982fcd7`).** Page renders clean, 100/100 coverage confirmed. Swept 2,018 AP bills; grant-as-expense miscoding is ISOLATED to TFN. Also shipped: colored By-project/By-source chips on `/finance/transactions` + Project Money rows → pre-filtered Transactions editor (deep-link race fixed). **3 SL findings → all in the SL handoff doc:**
- **TFN "Goods grant" $151K** booked as ACT-CE expense (no income record) — confirmed by Ben = Goods grant INCOME. SL must reclassify (reverse AP bills → ACCREC `ACT-GD` grant income). **ACT-CE's −$144K is phantom; Goods understated ~$144K.** Two big ones are AUTHORISED/unpaid fake-payables ($89,361 + $55,197).
- **The Plasticians $29,800** (Goods HDPE) — **FIXED**: retagged ACT-IN→ACT-GD in LIVE Xero (`scripts/retag-plasticians-xero.mjs`, totals intact, revert `scripts/output/retag-plasticians-revert-2026-05-30.json`) + mirror set to match. Page now shows it in Goods. **(Xero --apply was classifier-blocked; Ben ran it via `!`.)**
- **MOL Nyrt. $30,691** ("native USD adjustment" Dext artifact, AUTHORISED) — flagged for SL to verify/void (inflating ACT-IN + AP by $30K).

**NEXT (priority order):**
- **(a) Ben action:** forward `thoughts/shared/financials/2026-05-30-locked-tracking-for-sl.md` to Standard Ledger — now carries the 54 locked invoices ($1.08M) dimension-tag ask **+ the 3 reclassification findings above.**
- **(b) Push branch?** `wip/sl-sense-check-findings-2026-05-30` (SL findings doc + Plasticians retag tool) → push + PR + merge on Ben's go.
- **(c) Verify live:** `command.act.place/finance/project-money` once Vercel deploys — coverage 100/100.
- **(b) Durable view-fix** — `v_funder_next_move` + outstanding queries should exclude `VOIDED/DELETED` (else the voided-`amount_due` phantom recurs on the next void batch). Quick win.
- **(c) Phase 5** — reconciliation cockpit on `/finance/funders`: per-row Reconcile → dedupe to pipeline-of-record + withdraw phantoms + set value from Xero ledger (Tier-3 GHL writes, dry-run-first). Biggest piece.

**Traps:** repo is **PUBLIC** (financials docs public — Ben opted in). Xero token 30-min TTL → sync self-refreshes via `.xero-tokens.json`. App finance DB = `NEXT_PUBLIC_SUPABASE_URL` = `tednluwflfhxyucgwigh`. **Mirror lags Xero — new Project Tracking tags only land on the next sync.**

---
**Updated:** 2026-05-29
**Read first:** `thoughts/shared/handoffs/2026-05-29-xero-mirror-and-ongoing-bookkeeping.md`
**Branch:** `wip/goods-finance-recon-2026-05-29` — **MERGED to main (PR #125, `f7ca7e843`) + DEPLOYED to command.act.place 2026-05-29 PM** (Vercel prod build success; /finance/mirror + overview live behind login gate, 307). Remote branch deleted; future work = new branch off main. (Local still on this branch w/ cron-noise dirty files — don't force-checkout.)
**Goal:** Make command-center the daily bookkeeping driver with AI support. Built `/finance/mirror` (live Xero mirror: inline tag-align · per-project in/out rail · untagged/receipt/dup flags · sortable+filterable table · bulk-retag · receipt-attach · AI tag suggestions), fixed 4 data bugs, started a 4-part ongoing roadmap.

**Shipped today:** the mirror surface · **4 data-bug fixes** (row truncation 2k→4.5k · `exec_sql {sql}→{query}` which had zeroed received/pending app-wide · ACCREC mapping → Goods $649K visible · receipt-flag 1246→11 bills-only) · **Xero writes** (Carla dup VOIDED + 1300 Washer recoded 429→446/ACT-GD) · receipt-upload-to-Xero (Phase 1, **untested live**) · roadmap **#1** AI tag suggestions · **#2** daily-digest script + mirror recency filter · **#3** anomaly/dup detector.

**⭐ $76K phantom AP — WORKED 2026-05-29 PM (commit `9b77f87`):** Ben approved "void all 26". **20 VOIDED in Xero = $67,970.72 cleared** (Telford $19,800, Centre Canvas $10,285, Oonchiumpa $5,940, Matnic $6.4K+$2.8K, Sophie $4,950+$1,140, Airbnb $4,621, Kirmos no-# $4,500, +the rest). **6 BLOCKED by Xero period lock (30-Sep-2025, FY26-Q1 BAS lodged) = $3,221.03** (Bunnings $1,199.80, Palm Island $514, Maleny ×2 $497.48+$423.75, Repco $384, Virgin $202) → **hand to Standard Ledger as prior-period adjustment / credit note; do NOT lift the lock.** **4 HELD as not-dups:** Kirmos INV-004 $4,500 (genuinely owed — pay it), Google $67.98 + Dialpad $56 (consecutive-month subs), Kennards $244 (separate hire). Outcome + tools recorded in `thoughts/shared/financials/2026-05-29-duplicate-void-worklist.md`. Revert log: `scripts/output/void-dups-revert-1780048855209.json`.

**⭐ ROADMAP #4 SHIPPED 2026-05-29 PM (commit `832da92`) — ongoing-bookkeeping roadmap now 4/4 complete.** `scripts/close-the-books.mjs <period> [--json] [--save] [--narrate]` — period ready-to-close gate. `<period>` = `YYYY-MM` | `Q3` | `FY26-Q3` | `FY26` (AU FY Jul–Jun). Rolls up 7 lenses (recon% · receipt coverage · tagging% · cleanliness via #3 detector · P&L honest sales/spend/bills split · indicative BAS 1A/1B · R&D-eligible by category) → 🟢/🟡/🔴 verdict + prioritised action list. Reads app DB (NEXT_PUBLIC) so numbers match the mirror; deterministic core; `--narrate` = Anthropic close memo (forced — minimax default returns empty); `--save` → dated close-pack `.md` + `.provenance.md`. **First pack:** `thoughts/shared/reports/close-pack-FY26-Q3-2026-05-29.md` → 🔴 NOT READY (recon 69.5%, $51.9K in GE-429, $10.4K untagged, 6 same-day dup groups). Plan `thoughts/shared/plans/2026-05-29-close-the-books-assistant.md`. **Trap:** `lib/llm-client.mjs` is in `scripts/lib/` not root `lib/` (root lib/ = load-env only); default agent provider = minimax (verbose/empty for short memos → force anthropic).

**"DO ALL" FOLLOW-THROUGH 2026-05-29 PM (PR #125 merged + deployed):** (a) ✅ **deployed** to command.act.place. (b) ✅ **monthly close cron** wired (`close-the-books-monthly`, 1st @ 6:30am, `--save`, ecosystem.config.cjs — **inert until next `./dev cron`**; defaults to last completed month). (c) ✅ **SL handoff doc PREPARED (not sent)** `thoughts/shared/financials/2026-05-29-locked-period-dups-for-sl.md` — the 6 locked dups + cash-vs-accruals note; **Ben to forward to Standard Ledger.** (d) ✅ **command-center close panel SHIPPED + DEPLOYED** (PR #126, main `8b1855560`) — live `/finance/close` (nav "State · Close pack"): `GET /api/finance/close?period=FY26-Q3|2026-04|FY26` ports the 7-lens gate to TS (anomaly logic INLINED — no execSync in serverless), page = verdict banner + 7 lens cards + action list + by-project + period selector + FreshnessBadge. **Trust test: route JSON == `close-the-books.mjs --json` exactly.** Prod 307 (page, login-gated) / 200 (api). Plan `thoughts/shared/plans/2026-05-29-finance-close-panel.md`. **Trap: the .mjs script + TS route duplicate formulas (separate module graphs) — keep in sync; trust test is the guard.** (e) ✅ **C3 Webflow attach test teed up** — walkthrough given (localhost:3002/finance/mirror → "Bills · no receipt" → Webflow $29 → attach; preflight confirmed route reachable + XERO_TENANT_ID set). Ben to run + report. (f) ⛔ **Kirmos INV-004 $4,500 NOT paid** — money action, left for Ben (pay via bank + reconcile; it's genuinely owed, not a dup).

**STILL OPEN (Ben):** (1) **forward the SL doc** → Standard Ledger (then SL actions the 6 locked dups, $3,221.03) · (2) **pay Kirmos INV-004 $4,500** · (3) Ben's **Webflow attach test** (localhost:3002 → /finance/mirror → "Bills · no receipt" → Webflow $29 → attach; preflight passed — proves live receipt upload) · (4) optional: wire **#2 digest** + **#3** Telegram/Notion sends (Tier-3 external). [✅ close panel SHIPPED — see (d) above.]

**VOID PATTERN (proven, reusable):** `scripts/void-duplicate-bills-2026-05-29.mjs` — dry-run default, GET-fresh + abort-on-mismatch, full before-state revert log, app-DB status mirror, `--apply` gated. **Xero blocks edits to documents dated ≤ the period lock date** (currently 30-Sep-2025) — expect 400 "period lock"/"end of year lock" on locked-period voids; that's a correct guardrail, route those to the accountant.

**KEY TRAPS (don't re-hit):** `exec_sql` RPC takes `{query:}` NOT `{sql:}` · transactions API caps 1000/table → paginate · **app finance DB = `NEXT_PUBLIC_SUPABASE_URL`** (NOT `SUPABASE_SHARED_URL` — ad-hoc node probes hit the wrong DB; verify via `curl localhost:3002/api/...`) · mirror tags are **Supabase-only** (Xero push-back = Phase 2, not built) · `vendor-rules-suggest` is heuristic regex, not an LLM · dev `.next` wedges after rapid edits → `pm2 stop act-frontend && rm -rf apps/command-center/.next && pm2 restart act-frontend`.

**Open Xero items:** Joseph Kirmos INV-004 $4,500 may be genuinely owed (NOT a dup — different invoice #; Ben checking with Joey).

---
**Prior (2026-05-23) — MiniMax+Gemini bot migration:** shipped + live at `command.act.place/api/telegram/webhook` (Haiku→Gemini, Sonnet→MiniMax, fallback→Anthropic). Rollback: `vercel env rm LLM_PROVIDER production`. Pinned graders via `.env.local` `GRADE_*_MODEL`. Full detail in this file's git history + `thoughts/shared/plans/minimax-full-migration-2026-05-22.md`.
