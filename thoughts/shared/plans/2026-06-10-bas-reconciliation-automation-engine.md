# Plan: BAS, Receipt and Reconciliation Automation Engine (Q4 FY26 + Pty cutover)

> Slug: `2026-06-10-bas-reconciliation-automation-engine`
> Created: 2026-06-10
> Status: draft
> Owner: Ben (day-shift verbs and clicks), agents (night-shift prep), Standard Ledger (lodgement and judgment calls)

## Objective

Run the BAS, receipt and reconciliation cycle as a continuously-closing pipeline with the fewest possible human steps. Agents acquire and match every receipt across all sources, tag spend to projects with a learning loop, prevent duplicates structurally, and stage every Xero write as a dry-run that one daily human verb releases. The Xero reconcile click stays human forever (Xero states it will not add API reconciliation), so the engine's job is to make every click a zero-thought confirmation. First acceptance test: Q4 FY26 BAS (Apr-Jun 2026, due ~28 Jul 2026, the last sole-trader BAS) at 2-3 hours of human time, against the ~145-action April cycle. Second: the 30 Jun sole-trader to A Curious Tractor Pty Ltd cutover runs both Xero orgs from one config with zero wrong-org writes.

This plan synthesises three adversarially-verified designs (min-human, trap-safety, daily-ux). Every verdict violation is resolved by adopting the verdict's fix. The completeness critic's items are folded in or explicitly parked in Open decisions.

## Task Ledger (P0)

- [x] Day zero: stop the three unattended Xero-write crons (DONE 2026-06-11: `pm2 delete` all three + `pm2 save` + commented out of `ecosystem.config.cjs`. Code-verified nuance: `receipt-match --apply` is mirror-only — no Xero calls — and can be re-enabled as the staging engine; the true Xero writers were `push-ai-tracking-to-xero` and `receipt-upload`)
- [ ] Truncation fixes, TDD-first (getReceiptGaps and the near-cap reads) — #158
- [ ] Org registry `config/finance-orgs.json` + tenant preflight in every write script (by 20 Jun) — #159
- [ ] Verify Xero app rate-limit tier via X-DayLimit-Remaining — #160
- [ ] Idempotency + dedup gate lib (precondition of the write batch) — #162 (live Reference probe: #161, HITL)
- [ ] Morning Apply daily write batch, fail-closed, at-tap re-verification — #164
- [ ] /finance/daily check-in surface + 7:55am Telegram brief — #165 + #168
- [ ] Reconcile cheat-sheet generator, staleness-gated — #166
- [ ] Golden totals re-baselined with Standard Ledger, then pinned in CI — #163 (HITL, blocked on SL rulings)
- [ ] Cutover checklist executed (rules pack, tracking categories, tracer txn, sub re-carding, Nic handover) — prep #167 + session #169 (HITL)

## 1. Context: the last two quarters

What the agent process did, what broke, and what it cost:

- **April Q3 BAS cycle:** roughly 145 counted human actions plus a 3-hour runbook. Quarter-end was archaeology: receipt hunts, recode worklists and duplicate cleanup compressed into BAS week.
- **Q2/Q3 recode:** $486K sat in account 429 General Expenses (including TFN $144K), worked down via `generate-ge-recode-worklist.mjs`. The Telford Smith $19.8K double-payment was found and remains unrecovered.
- **2026-06-02 duplicate cleanup:** 106 phantom spend-money deletes, 48 voided phantom bills, 9 recodes. Root cause: pre-creating coded spend-money txns via API with no idempotency gate, colliding with Dext-created bills. The most expensive failure of the period.
- **Dext duplicate class:** bill (keeper) plus unreconciled spend-money (phantom); real Q2+Q3 GST impact $740.69 across 27 lines.
- **Traps now documented and honoured here:** mirror `is_reconciled` lies (single-GET is the only truth); reconciled txns are fully API edit-locked (400); Xero Match suggests on amount not date (the Mar-May $14.99 false match); bank-rule misfires (Garmin charged to Shipstation); groceries coded to 493 Travel; the PostgREST 1000-row cap reading $590K of a real $975K.
- **Standing debt into Q4:** a statement-line matching backlog (last counted ~373; re-baseline before trusting), 3 archived-contact voids (UI-only), 124 DRAFT payables, and the Standard Ledger email with the Q2 revision questions still unsent.
- **Standing rule breach:** three crons write to Xero unattended today (`push-ai-tracking-to-xero` half-hourly, `receipt-upload` daily 8am, `receipt-match --apply` daily 7am), verified in `ecosystem.config.cjs`. All Xero writes are Tier 3 day-shift; these stop on day zero of this plan, before any build.

## 2. Current-state inventory

| Area | What exists today |
|---|---|
| Mirror + sync | `xero-sync` (6h incremental), `xero-bank-balances` (daily 6am), `ingest-statement-lines.mjs` (manual CSV only), `sync-xero-tokens.mjs` |
| Receipt sources | Gmail capture (4 delegated mailboxes, allowlist), auto-billing connector bills (Qantas/Uber/Webflow/Virgin/Booking, 100% receipted on the bill side), `sync-bill-attachments-to-txns.mjs`, Dext (legacy, export-only), Xero Me snaps, portal-only vendors (Anthropic, Descript, Qantas tail) |
| Matching / recon | `lib/finance/reconcile.ts` 6-verdict classifier, `match-receipts-to-xero` two-pass scorer, reconcile-prep tooling, `reconcile-write-log.md`, cockpits at `/finance/reconcile` and `/finance/reconciliation` |
| Tagging | Three overlapping taggers (`tag-xero-transactions`, `tag-transactions-by-vendor`, auto-tag-fy26), `vendor_project_rules`, manual% guard (asserted, untraced in 2 of 3) |
| OCR | `ocr-dext-processing.mjs` (Gemini 2.5 Flash Lite) |
| Skills | `bas-cycle`, `reconcile-cycle`, `find-receipt`, `tag-transactions`, `scan-subscriptions`, `reconcile` |
| Surfaces (4-surface model) | Notion (read), command-center (operate: `/company`, `/finance/*`), scripts (automate), Telegram (push: Mon 8am `weekly-reconciliation.mjs` digest) |
| Gap | No surface answers "what hit the two ACT accounts yesterday, by project, and what looks wrong" |

## 3. Live baseline (2026-06-10)

Source: Supabase mirror `tednluwflfhxyucgwigh`, SQL aggregates only (not subject to row-dump truncation). FY26 window 2025-07-01 to 2026-06-10. Two-account scope throughout. Mirror-vs-Xero fidelity for `is_reconciled` and `has_attachments` is Inferred at best.

| # | Metric | Value | Caveat |
|---|---|---|---|
| 1 | FY26 reconciliation state | NAB Visa #8815: 244 unreconciled / $208,025.14, 1,599 reconciled / $1,124,581.54. Everyday: 108 unreconciled / $745,366.50, 116 reconciled / $782,934.23. 439 DELETED rows excluded ($506K, the 06-02 cleanup) | Mirror `is_reconciled` drifts; Everyday's unreconciled sum is transfer-dominated; `total` is unsigned (direction in `type`) |
| 2 | FY26 untagged spend | Genuine SPEND: 69 txns / $39,454.72. Transfer legs (97+97 / $773K each side) intentionally untagged | Headline is the SPEND row only; counting transfer legs triple-counts internal movement |
| 3 | Tag provenance | xero_tracking 965, vendor_rule 583, manual-prefixed 379+, null 84, ai_router 36 | manual% rows are protected from auto-tagger overwrite |
| 4 | Receipt coverage | SPEND has_attachments true: 885 / $628,813.12 (49.6% of rows, 67.7% of dollars). receipt_emails: 1,920 uploaded, 263 review, 140 matched, 107 captured | `has_attachments` is a drifting flag; false means "flag not set", not "no receipt exists"; the 95.3% v3 figure uses a receipt-evidence definition |
| 5 | Q4-to-date (Apr 1 - Jun 10) | #8815: 323 txns, 50 unreconciled, 20 untagged, 186 genuine SPEND without attachment flag. Everyday: 22 txns, 22 unreconciled (feed lag), 0 SPEND without flag | Same drift caveats |
| 6 | Duplicate candidates | 44 same-day same-amount groups / 103 AUTHORISED SPEND txns | Candidates only; per-seat SaaS and split fares are legitimate repeats; verify keeper receipt before treating any pair as a true dupe |

SQL provenance (verbatim queries) lives in the sidecar `2026-06-10-bas-reconciliation-automation-engine.md.provenance.md`; the headline shapes: metric 1 `GROUP BY bank_account, status, is_reconciled` over `xero_transactions`; metric 2 filters `status='AUTHORISED' AND (project_code IS NULL OR btrim(project_code)='')` grouped by `type`; metric 6 is a `HAVING COUNT(*)>1` over `(date, total, bank_account)` on SPEND.

## 4. Xero API/MCP capability matrix (verified 2026-06-10)

**Verified CAN:**
- Attachments API: PUT/POST receipts onto BankTransactions, Invoices and more; 10 x 10MB per document; same-filename PUT replaces (developer.xero.com/documentation/api/accounting/attachments).
- Poll `GET BankTransactions` with If-Modified-Since + pagination; single-record `GET BankTransactions/{id}` is the only reliable IsReconciled read (banktransactions doc).
- Webhooks exist for Contact, Invoice, Credit Note and Subscription events (webhooks overview).
- Official Xero MCP server: standard Accounting + Payroll reads and writes, including tracking category/option creation (github.com/XeroAPI/xero-mcp-server). Writes stay on the codebase OAuth client per constraint 13.
- Rate limits: 5 concurrent, 60/min/tenant, daily tiered 1,000 (Starter) or 5,000 (Core+), X-DayLimit-Remaining header (oauth2/limits).
- IsReconciled is a settable flag for conversion scenarios only; it does not perform a match (banktransactions doc).

**Verified CANNOT:**
- Reconcile via API: "we do not plan to add this capability"; unreconciled statement lines are not exposed via public APIs, permanently (accounting/bankstatements).
- No Bank Rules API (endpoint index + open uservoice request).
- BankStatementsPlus and Bank Feeds APIs are closed to non-lenders/non-banks (finance/overview, bankfeeds/overview).
- No bank-transaction or statement-line webhooks; polling only.
- No item-level Dext API; only the aggregate Data Health and Insights API (help.dext.com).
- MCP server has no attachments, no voids/deletes, no statement lines, no reconcile, no bank rules.
- JAX automatic bank reconciliation (global beta, per-account UI toggle) has no API surface and no attribution signal (blog.xero.com JAX beta post).

**Workarounds adopted:** mirror by polling + single-GET truth checks; replicate bank-rule behaviour as agent-proposed spec cards a human types into the UI; receipts via Attachments API behind the daily human verb; batching <=50 per PUT with ~1100ms sleeps and Retry-After honoured.

**Unverified (verify before building on it):** ACT's app tier (1,000 vs 5,000/day); Reference set/search behaviour on SPEND BankTransactions; IsReconciled behaviour on feed-linked accounts; JAX toggle availability on ACT's org; whether the statement CSV export carries a stable unique line ID; the gated Collaborators webhook.

## 5. Target pipeline

Each stage lists its automation and its named human touch. Night shift is read-only and staging-only; every Xero write rides a day-shift verb.

**S0. Bank line lands: mirror + freshness.** 6h incremental sync, daily balances, DELETED/VOIDED excluded from every sum, per-org config registry (`config/finance-orgs.json`: tenant id, included-account SET per org, chart and tracking maps, FY window, lock dates), tenant assertion in every write preflight with visually distinct dry-run headers (OLD-ST vs NEW-PTY). Freshness sentinel stamps mirror age on every money surface. Statement lines are HUMAN-FED forever (no API path exists): weekly CSV export into a watched folder the ingester drains; cheat-sheet per-line verdicts are blocked, not footnoted, when statement data is older than the last bank-feed activity. *Human: one ~1-2 min CSV export before the Monday session, plus AMBER-prompted ad-hoc exports.*

**S1. Receipt acquisition.** Gmail capture 6h across the 4 mailboxes plus a catch-all classifier flagging billing-shaped emails from non-allowlisted vendors into a review pool with an allowlist-addition card. Connector bill attachments staged nightly as a dry-run; the PUTs ride Morning Apply. Dext is drain-only: export verified against Data Health API client counts BEFORE any cancellation verb. Xero Me and Files mirror back weekly, read-only. Portal-only vendors get a monthly deep-linked checklist and a watched drop folder. *Human: <=2 one-tap receipt actions/day inside the daily cap; one ~10-15 min portal batch monthly.*

**S2. OCR + evidence normalisation.** Nightly Gemini Flash Lite OCR for evidence rows missing vendor/amount/date; vendor alias normalisation; original currency captured; a content hash computed per document for evidence-side dedup. Mirror-only writes. LLM-optional with hard per-call timeouts and a max-runtime kill; skipped rows fall to the weekly batch, never block the brief. *Human: none.*

**S3. Receipt-to-transaction matching.** Heuristic pass (vendor Dice-bigram + date window + amount, surcharge-aware <=$15 and <=6%), then AI scoring on the 40-80% band. FX-aware tolerance: foreign-currency receipts match AUD lines within an indicative-rate band, covering the Anthropic/Descript class and the World Tour flood from 27 Jun. The 3-gate rule holds: never amount alone. >=80% stages the attachment into Morning Apply; 50-80% is one decision card; <40-50% pools to Friday. `has_attachments` refreshed from `receipt_emails.status='uploaded'`, never trusted raw. *Human: card taps inside the daily budget.*

**S4. Project tagging.** ONE consolidated engine replaces the three taggers: vendor_project_rules, tracking-history prior, fuzzy alias + frequency prior, then a timeout-guarded LLM fallback. Shared guard lib with tests: skip `project_code_source LIKE 'manual%'`, transfers never taggable, credits never income, per-org included-account set (not a hardcoded account pair, so the Pty org's accounts work from day 1). Sync-precedence contract: >=0.85 rows get a protected source value (`ai-auto-pending-push`) the 6h sync must skip, cleared when the Xero tracking write releases; a regression test proves sync cannot clobber a pending row. Every human confirm or correction writes back a rule. *Human: <=3 tag cards/day; baseline queue is small (69 SPEND / $39,454.72) and shrinks.*

**S5. Duplicate prevention.** See section 6; default posture is that CREATE verdicts stay worklist rows, with zero API creation.

**S6. Bank rules (no API, so propose + audit).** Weekly miner over confirmed codings (>=3-5 identical account+GST+tracking outcomes, zero exceptions) emits rule-spec cards with evidence rows. Specs accumulate in a versioned `bank-rule-library.json`, which is the cutover artifact: rules do not transfer between orgs, the evidence does. Every created rule gets a 30-day outcome audit to catch Garmin-to-Shipstation misfires. *Human: <=3 UI rule creations/week (~1 min each); one ~45 min pack session in the new org at cutover.*

**S7. Morning Apply: the one daily write verb.** Night shift assembles receipt attachments, tracking pushes, DRAFT bill approvals and prepared recodes into one batch with a dry-run stratified by risk class (counts and dollars per class, so the scan is a real review). The idempotency/dedup gate lib is a hard build dependency: the batch is fail-closed and refuses any create verdict unless the gate was invoked for that line. Two-speed verification: attachments may rely on night-verified state (idempotent PUT); recodes, approvals and anything state-sensitive are re-verified by single GET at tap time, skip-on-drift with a "skipped N (state changed)" line. Ordering rule: the batch applies BEFORE any reconciliation activity that day, so tracking lands before lines can lock; 400 edit-locked is an expected branch routed to a mirror-canonical tag plus a weekly UI punch-list, never silently dropped. Voids and deletes are NEVER in this batch. *Human: one tap per weekday after the stratified scan; zero on empty days.*

**S8. Daily check-in surface.** See section 7.

**S9. The reconcile click (the floor).** Weekly UI session off a cheat sheet scoped honestly: one clean counterpart per MIRROR-KNOWN txn/bill, built only from ingested CSV statement lines, gated on statement freshness GREEN (stale shows "ingest first", not a misleadingly complete list), sorted date+amount (Xero's UI ordering is not derivable). Surcharge adjustments precomputed. Never bulk-accept green Match suggestions. JAX is not load-bearing: click budgets assume no JAX; evaluation is parked at P2 behind a manual UI sampling protocol because no API attributes a reconciliation to JAX (see Open decisions). *Human: <=20-30 clicks/week steady state after the backlog burns down over ~3 sessions; archived-contact voids stay a UI punch-list.*

**S10. BAS-ready close, income side, dual org.** Weekly 6-path completeness classifier + prepare-bas worksheet all quarter, so quarter-end is verification. The worksheet ties to the report matching the CONFIRMED GST basis (cash vs accruals, to confirm with Standard Ledger) and is TDD-pinned only after golden totals are re-baselined from lodged values (Q2 status is currently Inferred, and open SL rulings may revise it). New income-side coverage (from the completeness critic): deposit-to-ACCREC matching, G1/1A completeness, a RECEIVE-TRANSFER undercount test (settlements land as transfers), DRAFT sales invoices surfaced (INV-0314 Centrecorp $84,700 is live), and GHL tranche inflows visible on the daily surface. Dual-org: old org runs Q4 BAS + EOFY then flips to read-only archive; the new org starts day 1 with the rule pack, vendor memory (org-agnostic in Supabase), tracking categories created, chart and account GUIDs mapped, and one tracer transaction run end-to-end before any day-1 automation is trusted. *Human: five counted quarterly steps (section 8).*

## 6. Duplicate guards (the explicit set)

1. **No API creation by default.** CREATE verdicts are worklist rows for the human, not API creations. The 106-delete/48-void engine never restarts by omission.
2. **Fail-closed gate lib.** If pre-coding ever ships, the Morning Apply executor refuses any create unless the idempotency/dedup gate module was invoked for that line. Library call, not convention.
3. **Verified idempotency key.** Verify Reference set/search behaviour on SPEND BankTransactions live first; add an `external_key` column to the mirror and write queue (xero_transactions has NO reference column); the hash includes a source-document disambiguator plus description and row sequence, so genuine same-day same-amount pairs (per-seat SaaS, split fares) are CREATED, not suppressed; any key collision routes to a human card.
4. **Pre-creation cross-doc probe.** Mandatory search of existing ACCPAY bills (Dext- and connector-created) and spend-money by amount/date/contact; any plausible existing doc means do not create, emit a match candidate.
5. **MATCH-THEN-DEDUPE.** A candidate duplicate pointing at an AUTHORISED bill is treated as a possible real payment, never bulk-deleted.
6. **Write-time truth.** Every delete/void re-verifies via single-GET `BankTransactions/{id}` AND confirms the keeper carries the receipt (the Airbnb tracer rule) at the moment of apply, not at staging time. Staging checks are advisory triage only.
7. **Detection radar.** Nightly (date, amount, account) grouping over AUTHORISED SPEND (baseline 44 groups / 103 txns) plus bill-shadowing-PAID-twin patterns, with a legitimate-repeat whitelist reconciled with the creation-side gate.
8. **Evidence-side dedup.** Content-hash across receipt_emails, finance_receipt_documents, Dext imports and Xero Me snaps, so one receipt arriving via four sources attaches once, to one transaction, and coverage metrics are not inflated.
9. **Destructive writes behind their own verb.** Weekly dedup/void worklist with dry-run, tracer-first on any new pattern; never inside the one-tap daily batch.

## 7. Daily check-in surface: /finance/daily + Telegram brief

Per the 4-surface model: the pane lives in command-center (operating surface), the 7:55am brief is Telegram (push surface). Notion stays read-only; scripts stay the automation layer.

Five zones, top to bottom:
1. **Yesterday's coded spend by project** (two-account scope, rolling 7-day sparkline), honestly labelled "coded spend visible in Xero, lags until reconcile" because no API exposes raw bank lines daily. A balance-delta line compares balance movement against INGESTED statement lines with persistence-based alerting (escalates only when fresh data still disagrees, or the gap outlives the weekly reconcile cadence), so the strip stays quiet-when-clean.
2. **NEEDS ME:** a hard in-code cap of 5 decision cards across ALL queues via one global prioritiser (dollar impact x age), with age-based escalation (anything unserved 7 days rolls to the weekly session) and queue depth reported monthly so starvation is visible. Card types: tag confirm/correct, receipt one-taps, confident duplicate confirms, personal-vs-business, DRAFT bill send/approve. Void is never a one-tap card.
3. **LOOKS WRONG:** read-only anomaly strip (new vendor, >2 sigma vs vendor baseline, same-day same-amount pair, trap-rule lints, statement staleness AMBER).
4. **Receipt-gap delta:** new gaps since yesterday with one-tap actions ("ask Nic" pre-filled forward, "open portal" deep link, "no receipt needed" under the $82.50 GST threshold). R&D-tagged spend is excluded from the no-receipt-needed tap: the GST substantiation threshold is not the R&D contemporaneous-evidence standard, and the 43.5% claim depends on receipts.
5. **MORNING APPLY:** one button behind the stratified dry-run (per-class counts and dollars). Re-verification happens at tap time per section 5/S7.

Product rules: quiet-when-clean (no decisions + no anomalies = no push; the Monday digest is the heartbeat); every figure is a SQL aggregate with a TDD-pinned total; freshness footer shows mirror sync time, statement lastDate and X-DayLimit-Remaining; "newly reconciled: N" is single-GET confirmed and never attributed to JAX (no attribution API exists). The whole brief renders without an LLM call, so a dead key can never stall it.

## 8. Cadence (both orgs through the July tail)

| Rhythm | Automated (agents, read-only/staging) | Human steps | Human time |
|---|---|---|---|
| Continuous 24/7 | 6h sync, Gmail capture, nightly OCR + matcher + tagger scoring + duplicate radar + rule miner + batch assembly + cheat-sheet build, call-budget logging. Zero Xero writes. | None | 0 |
| Daily weekday AM | Brief built 7:40, pushed 7:55 (suppressed when clean) | Glance zone 1, decide <=5 cards, one Morning Apply tap after the stratified scan | 3-5 min (0 on clear days) |
| Weekly Monday | Worklists, dry-runs, rule specs, learning-loop drafts prepped Sunday night | (1) ~1-2 min statement CSV export, (2) Morning batch applied BEFORE clicks, (3) reconcile session off the cheat sheet (<=20-30 clicks), (4) <=3 UI bank-rule creations, (5) one --apply verb on the destructive dedup/void worklist after its dry-run, (6) drain deferred cards, (7) approve learning-loop append | 30-40 min |
| Monthly 1st week | Checklist report, metrics (drift rate, false-positive rate, queue depth, cost ledger) | Portal receipt batch (~10-15 min), subscription confirmations, DRAFT payables sweep verbs, trust-meter glance | ~45 min |
| Quarterly BAS | Classifier + worksheet ran weekly all quarter; pack auto-assembled; retro auto-drafted | (1) verify GST tie-out, (2) resolve ambiguous list (~15 min), (3) send accountant pack (Tier 3), (4) confirm lodgement, (5) approve retro | <=2-3 h total |
| One-time cutover (hard-dated: gate closes 20 Jun; Nic handover before 27 Jun departure) | Config entry, exports, worklists, library prep | New-org session: bank feeds, chart + tracking categories/options created, account GUIDs mapped, ~15-30 rule pack typed from the library, tracer txn end-to-end, Dext drain verified vs Health API counts then cancel verb, subscription re-carding worklist started, Nic dry-run on the daily pane + Morning Apply + Tier-3 backup | ~2-3 h once |

Old org keeps the daily/weekly cadence through Q4 BAS + EOFY, then drops to read-only archive. New org starts the full cadence 1 Jul; expect the tag queue to spike for two weeks (cold start), with overflow routed to a dedicated cutover session rather than breaking the 5-card cap.

## 9. Build backlog

**P0: ship before Q4 BAS (cutover-critical by 20 Jun, everything by ~10 Jul).** Stop-the-line rule: org-config or rule-pack slipping past 15 Jun is stop-the-line; if the P0 engine is not proven by 10 Jul, run Q4 on the proven April-style pipeline. A late engine is recoverable, a wrong BAS is not.

| Item | Why | Effort | Test gate |
|---|---|---|---|
| 0. Day zero: pm2 stop `push-ai-tracking-to-xero` + `receipt-upload`, strip `--apply` from `receipt-match` | Zero-length constraint-8 violation window; outputs become worklists today | XS (Tier 2 ask) | Manual day-shift `--apply` until the batch ships |
| 1. Truncation fixes: getReceiptGaps, getMonthlyPL `.range(0,9999)`, overview `.limit(1000)`, projects/[code] `.range(0,4999)` | The one confirmed silently-wrong live dollar (/company); the $590K-of-$975K class | S | TDD: failing test pinned to a known SQL-aggregate total per fix, plus an overflow-flag (count vs fetched) convention |
| 2. Org registry + per-org included-account sets + tenant preflight + cutover-transfer exclusion | 30 Jun cutover; wrong-org writes are the new worst failure; the two-account rule must be per-org config, not a hardcoded pair | S-M, by 20 Jun | TDD: unioned dual-org FY26 total with the cutover transfer excluded, written before any cross-org figure ships |
| 3. Verify app rate-limit tier; log X-DayLimit-Remaining every run; call budget with carry-over for the nightly sweep | Starter tier (1,000/day/tenant) could silently stall the night shift across two tenants; unverified candidates are excluded from the next batch, never included optimistically | XS-S | Budget assertion in the executor |
| 4. Idempotency + dedup gate lib (verify Reference behaviour live first; `external_key` column on mirror + queue; collision routes to card) | Constraint 3; hard precondition of item 5 | S | Gate-invoked-or-refuse test; whitelisted-pair creation test |
| 5. Morning Apply daily write batch (fail-closed, two-speed verification, write-before-reconcile ordering, 400-lock taxonomy, append-only write-log with revert state, 1100ms) | N write classes collapse into 1 daily verb; cures the cron breach permanently | M | Executor tests: skip-on-drift, locked-line routing, idempotent re-run |
| 6. /finance/daily + Telegram brief (global 5-card prioritiser, quiet-when-clean, LLM-free render) | The habit spine; no current surface answers the daily question | M | TDD-pinned totals for every rendered figure |
| 7. Reconcile cheat-sheet generator (mirror-known scope, statement-freshness gated, date+amount sort) | Turns the floor clicks into zero-thought confirmations; burns the backlog down | M | Refuses to emit when statement data is stale |
| 8. Golden totals re-baseline with SL, then CI pack (pin changes require a lodgement event reference) | Pinning a number about to be revised converts the tie-out into a false alarm; confirm GST basis first | S, blocked on SL rulings | CI suite: Q2/Q3 pins post-ruling, two-account scope, DELETED exclusion |
| 9. Cutover checklist execution (section 8 one-time row) | The accounting events, not just the config: opening balances, 328-G journals (SL-owned), trailing AR/AP ownership, ~30 SaaS re-cardings off NAB Visa #8815 via `scan-subscriptions` | M, 15-27 Jun | Tracer txn end-to-end in the new org before day-1 trust |

**P1: post-cutover Jul-Aug.**

- Tagger consolidation + sync-precedence contract (M-L; TDD on all four guards; pull the sync-clobber regression test forward).
- Reconcile-sense-check nightly grader, 7 check families seeded from `memory/reconcile-autocoding-traps.md` (M); flags rank by dollar impact, feed the global prioritiser.
- Bank-rule miner + hit-rate tracker + 30-day post-deployment audits (S-M).
- Income/AR side: deposit-to-ACCREC matching, G1/1A tie-out, RECEIVE-TRANSFER test, DRAFT sales surfacing, GHL tranche inflows on the daily pane (M; TDD on the G1 tie-out).
- FX-aware matching band (S; pull forward before 27 Jun if capacity allows, the World Tour makes it live immediately).
- Evidence-side content-hash dedup across the four receipt sources (S).
- R&D evidence linkage: dual-write receipts to the R&D register, standing drawings-vs-basis check (the 81%-drawings trap), World Tour spend capture for the Overseas Finding (S-M).
- Credit notes/refunds: refund-verdict GST reversal handling + a recovery tracker with the Telford Smith $19.8K as the first row (S-M).
- Fleet dead-man heartbeat (alert on nightly jobs that did not COMPLETE, distinct from freshness footers) + LLM/API token cost ledger for the loops themselves (S).
- One-tap receipt request loop (Telegram inline buttons writing back to receipt_emails) + new-vendor allowlist proposals (M).
- Payroll/W1-W2/STP readiness for the Q1 FY27 BAS shape (M; pending the payroll decision below).

**P2: continuous improvement.**

- JAX evaluation behind a manual UI sampling protocol only (no API attribution exists); see Open decisions.
- History and Notes API: stamp agent provenance onto records in Xero ("tagged by act-agent, confidence 0.91") and probe change-history reads as a partial attribution signal (verify-before-build).
- Invoice/contact/credit-note webhooks to replace some polling for mirror freshness (S).
- Stripe/GHL settlement reconciliation (clearing accounts, gross-vs-net fees, GST on fees) when payments go live.
- Pty-era reimbursement/expense-claims flow (Xero Me as claims, director loan treatment).
- Hygiene sweep: stale skill state lines, broken refs, archive shipped one-offs, write the reconcile-sense-check skill, refresh `finance-surfaces.md`.

## 10. What stays human (the floor)

1. The reconcile click in the Xero UI, weekly (Xero: permanent, by policy).
2. The weekly bank statement CSV export (~1-2 min): the only source of statement lines that exists.
3. The daily check-in: <=5 one-tap decisions + 1 Morning Apply verb (3-5 min; zero on clear days).
4. Bank-rule creation in the Xero UI from agent spec cards (no API).
5. The weekly destructive-batch verb (`--apply` on dedup/void worklists after the dry-run).
6. The monthly portal receipt fetch (Qantas/Anthropic/Descript class).
7. Quarterly: GST tie-out ownership, ambiguous-list resolution, accountant pack send (Tier 3), lodgement confirmation, retro approval.
8. UI-only exceptions: archived-contact voids; locked-period items routed to Standard Ledger.
9. Standard Ledger judgment items: Q2 revision vs Q4 roll-in, TFN over-claim, 328-G journals, GST registration wind-down, opening balances.
10. One-time cutover session: new-org setup, rule pack, tracer transaction, Dext drain-then-cancel, subscription re-carding.

## 11. Risks and traps honoured (constraint map)

| # | Hard constraint | Where this plan respects it |
|---|---|---|
| 1 | Reconcile click is UI-only forever | S9 floor; cheat sheet minimises clicks, never pretends to remove them |
| 2 | No Bank Rules / Dext APIs | S6 propose-with-evidence + UI creation; Dext drain-only verified vs Health API counts |
| 3 | Pre-coding = the duplicate engine | Section 6 guards 1-4; gate lib is a fail-closed precondition of the write batch |
| 4 | Mirror/batch is_reconciled lies | Single-GET at WRITE time for all destructive/state-sensitive ops; staging checks advisory only |
| 5 | Two-account rule | Per-org included-account set in config; shared SQL predicate; NM Personal + Maximiser excluded |
| 6 | manual% skip | Shared guard lib with tests (currently asserted, untraced in 2 of 3 taggers: verified during consolidation) |
| 7 | 1000-row cap | SQL aggregates or pagination everywhere; overflow-flag convention; P0 item 1 |
| 8 | No unattended Xero writes | Day-zero cron stop; Morning Apply + weekly verbs are the only write paths |
| 9 | Money math TDD-first | Test gates on every backlog item that emits dollars; golden totals pinned post-re-baseline |
| 10 | 30 Jun cutover, dual org | Org registry, dual-org cadence, cutover-transfer test, tracking/chart creation, tracer txn |
| 11 | 60 req/min | 1100ms sleeps, <=50/batch, Retry-After; plus the DAILY tier budget (new) |
| 12 | <=5 decisions/day | One global prioritiser, in-code cap, age escalation, quiet-when-clean |
| 13 | MCP writes unreliable | Codebase OAuth is the only write path; MCP `create-bank-transaction` deny-by-default |

Residual risks carried: release-verb rubber-stamping (mitigated by stratified dry-runs and a weekly end-to-end tracer); single verb-holder during the 27 Jun World Tour departure (mitigated by the Nic handover gate before 20-27 Jun); July pile-up of BAS + EOFY + cutover (mitigated by the 10 Jul fallback rule); new-org cold start spiking the queues (expected, routed to a cutover session).

## 12. Open decisions for Ben

1. **JAX: enable at all, and where first?** The designs conflict: daily-ux proposed NAB Visa #8815 first; two verdicts ruled #8815 off indefinitely (it is the documented home of coincidental-amount false matches) and Everyday-first only after clean manual sampling. Both agree JAX has no API attribution and must not be load-bearing. Options: (a) leave it off entirely for FY26, revisit in the new org; (b) Everyday-only in the NEW org after a month of manual sampling. Note JAX also reconciles lines before tracking pushes land, costing Xero-side project tags on whatever it absorbs.
2. **Payroll from 1 Jul?** Founder wages + super + STP in the Pty decides whether W1/W2 automation must ship for the Q1 FY27 BAS (due ~28 Oct) or later. Decides P1 item priority.
3. **Are Stripe/GHL payments processing Goods/Harvest sales now?** If yes, settlement reconciliation moves from P2 to P1.
4. **Subscription re-carding owner and deadline.** ~30 recurring billers keep charging NAB Visa #8815 after 1 Jul until re-carded; old org accrues new spend indefinitely otherwise. Before 1 Jul or staged through July?
5. **Dext cancellation timing.** Drain + verify counts against the Health API first; the cancel is a one-shot verb with no retry.
6. **SL rulings (blocking golden totals + Q4 worksheet):** June GST correction ($14,632 to $15,350) as Q2 revision or Q4 roll-in; TFN $13,141.64 over-claim vs the $12,500 debit-error limit; GST basis (cash vs accruals) for both orgs; sole-trader wind-down sequence (final BAS marking, GST registration cancellation timing on ABN 21 591 780 066, Div 138 adjustments). The SL email must actually send.
7. **Nic as backup verb-holder** for the daily pane, Morning Apply and a designated Tier-3 send before the 27 Jun departure. Runbook + one supervised dry-run.
8. **Rejected/parked critic items (with reasons):** statement-line UI scraping rejected (fragile, ToS, 2FA risk; the CSV export stays an honest counted step); BankStatementsPlus rejected (closed Finance API, lender partners only, verified); reimbursement/expense-claims flow parked to P2 as Pty-era design work; settlement recon parked pending decision 3. Everything else from the critic was adopted (income side, payroll readiness, FX, R&D linkage, credit notes, evidence dedup, dead-man switch, cost ledger, cutover accounting events, History and Notes).

## 13. Logs

### Decision Log (seed)

| Date | Decision | Rationale | Reversible? |
|------|----------|-----------|-------------|
| 2026-06-10 | Stop the three unattended Xero-write crons on day zero | Constraint 8; zero-length violation window beats a schedule-dependent one | Yes (pm2) |
| 2026-06-10 | Statement lines stay human-fed CSV; no scraper | No public API path exists, permanently (verified); scraping is fragile and unverified | Yes |
| 2026-06-10 | No API pre-creation of spend-money by default; gate lib fail-closed if ever enabled | 106-delete/48-void history | Yes |
| 2026-06-10 | JAX not load-bearing; click budgets exclude it; manual sampling protocol before any toggle | Beta, no API surface, no attribution signal | Yes |
| 2026-06-10 | Voids/deletes never one-tap; weekly verb with write-time single-GET + keeper-receipt check | Constraint 4 + Tier 3 | Yes |
| 2026-06-10 | Cutover gate hard-dated 20 Jun; Nic named backup before 27 Jun | Travel overlaps cutover + Q4 prep | Yes |
| 2026-06-10 | Golden totals pinned only after SL re-baseline; pin changes need a lodgement reference | Q2 status Inferred; open rulings may revise it | Yes |
| 2026-06-10 | Per-org included-account set replaces the hardcoded two-account pair | New Pty org has different account GUIDs | Yes |

### Verification Log (seed)

| Claim | Verified? | How | Date |
|-------|-----------|-----|------|
| API reconciliation impossible, permanently | Verified | developer.xero.com accounting/bankstatements, live scrape | 2026-06-10 |
| No Bank Rules API | Verified | Endpoint index + open uservoice request | 2026-06-10 |
| No item-level Dext API | Verified | Dext Data Health and Insights docs | 2026-06-10 |
| Daily rate cap tiered (1,000 Starter / 5,000 Core+) | Verified | oauth2/limits page | 2026-06-10 |
| ACT's app tier | Unverified | P0 item 3: read X-DayLimit-Remaining on the live connection | pending |
| Reference set/search on SPEND BankTransactions | Unverified | P0 item 4 precondition: live probe | pending |
| Mirror baseline (section 3) | Verified against mirror | 8 SQL aggregate queries, tednluwflfhxyucgwigh | 2026-06-10 |
| Mirror is_reconciled / has_attachments fidelity vs Xero | Inferred | Known drift; single-GET only truth | 2026-06-10 |
| Q2 BAS lodgement status and values | Inferred | Re-baseline with Standard Ledger before pinning | pending |
| manual% guard present in all three taggers | Unverified (2 of 3) | Trace during tagger consolidation | pending |
| JAX toggle availability on ACT's org | Unverified | Check in Xero UI before any JAX decision | pending |
| Reconciled txns API edit-locked (400) | Verified | ACT's own 2026-06-08 merge work (memory) | 2026-06-08 |
| Statement CSV carries a stable unique line ID | Unverified | Inspect a real export before keying anything on it | pending |

## Provenance

- **Data sources queried:** Supabase mirror `tednluwflfhxyucgwigh` (xero_transactions, receipt_emails; SQL aggregates only, 8 queries); developer.xero.com + help.dext.com + blog.xero.com (live, 2026-06-10); `ecosystem.config.cjs` (cron verification); three adversarially-verified design documents + verdicts + completeness critic (2026-06-10).
- **Date range:** FY26 (2025-07-01 to 2026-06-10); Q4 window 2026-04-01 to 2026-06-10.
- **Unverified assumptions:** listed per-row in the Verification Log; nothing unverified is load-bearing without a named pre-build check.
- **Generated by:** hybrid (agent synthesis of adversarial designs; awaiting Ben's approval).