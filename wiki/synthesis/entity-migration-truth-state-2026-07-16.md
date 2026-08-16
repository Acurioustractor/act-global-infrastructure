---
title: Entity migration truth-state — 16 days post-cutover, sole trader still invoicing, Pty stack status unknown
summary: Third pass of the ACT Alignment Loop (Q3), 2026-07-16. Cutover deadline (30 June) has passed. ABN issued 2026-06-01. Only 1 Xero tenant in DB (sole trader). Post-cutover invoices of $189.2K raised on sole trader. 7 new migration artifacts created since 2026-05-14. EOFY Decision Pack introduces strategic fork question.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover, post-cutover]
status: active
date: 2026-07-16
---

# Entity migration truth-state — 2026-07-16

> Third pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. **The 2026-06-30 cutover deadline has passed — this is the first post-cutover synthesis.** Sources: the migration checklist at `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`, Supabase (Xero invoices, transactions, bank lines, tenant state), `thoughts/shared/drafts/**`, and `thoughts/shared/plans/**`. Last pass: [[entity-migration-truth-state-2026-05-14|2026-05-14]].

## Headline findings

1. **The cutover date has passed. The sole trader is still invoicing.** Three invoices dated 2026-07-02 — ALIVE National Centre (×2: $66K + $101.2K) and Mounty Aboriginal Youth & Community Services Ltd ($22K) — are on the sole trader's books. Total: $189,200. Per `2026-06-01-cutover-30-day-critical-path.md`, Cutover Rule 2 allows the sole trader to keep trading if the Pty stack isn't genuinely invoice-ready. That rule appears to be invoked. **Ben needs to confirm the Rule 2 status explicitly**, and Standard Ledger needs to be aligned on the BAS treatment of any post-30-June sole-trader income.

2. **ABN issued 2026-06-01 — the critical unblocking event.** A Curious Tractor Pty Ltd ABN 36 697 347 676 issued by Standard Ledger on 1 June. GST registered same day. This was the single blocking dependency that held up Pty Xero, NAB, payroll, and novation letters for 5+ weeks past the "first week of May" target.

3. **Pty Xero file: not confirmed in DB.** Only one `xero_tenant_id` exists in the database (786af1ed-e3ce-42fc-9ea9-ddf3447d79d0 — sole trader, now 2,247 invoices). The 2026-06-01 critical path plan described opening the Pty Xero file as a Week 1 action after ABN issued. It may have been opened but not yet synced to Supabase; or it may not have been opened. **Cannot confirm from DB alone.**

4. **NAB Pty business account: cannot confirm from DB.** `bank_statement_lines` data ends 2026-03-31 (no new bank data loaded since Q1 FY26). If the Pty NAB account opened after March 31, it would not appear here. **Needs direct confirmation.**

5. **Seven new migration-related plan artifacts exist since the 2026-05-14 pass.** At that pass there was 1 (novation letter template). Now: `2026-06-01-cutover-30-day-critical-path.md`, `2026-06-01-pty-test-invoice-runbook.md`, `minimax-full-migration-2026-05-22.md`, `finance-cutover-review-workflow.md`, `2026-06-19-eofy-decision-pack.md`, `2026-06-19-eofy-money-movement-plan.md`, `2026-06-19-eofy-round3-compliance-detail.md`. Active planning accelerated through June — but DB confirms no execution evidence yet.

6. **EOFY Decision Pack (2026-06-19) introduces a material strategic fork.** The 9-agent research workflow concluded that the "journal-entry / sole-trader operated on behalf of the Pty" model likely fails under Subdiv 328-G and 122-A (two-family cap table). The proposed alternative is a **market-value sale** of the sole-trader business to the Pty (sale price held as a vendor loan). This is a fundamental change from the documented migration approach. Standard Ledger must confirm or rule on this before any journals are booked.

7. **Outstanding receivables on sole trader: $471,717.84** (14 ACCREC invoices). This includes $189.2K post-cutover (Rule 2), $82.5K Rotary (462 days, write-off risk), and $167.2K ALIVE (new, post-cutover). Snow Foundation PAID ($132K); Centrecorp VOIDED ($84.7K); both PICC invoices VOIDED ($96.8K combined). Net movement since 2026-05-14: ↓ $25,522 (but composition has changed dramatically).

---

## Items × evidence × risk — post-cutover view

Days past 30 June 2026 cutover: **+16 days**.

### Section 1 — Entity setup

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ confirmed all passes | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ confirmed | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ confirmed | ✅ DONE | → |
| **ABN 36 697 347 676 (Pty)** | `2026-06-01-cutover-30-day-critical-path.md` | ✅ **DONE 2026-06-01** | 🟢 cleared |
| **GST registration (Pty)** | With ABN; confirmed in same plan | ✅ **DONE 2026-06-01** | 🟢 cleared |
| Standard Ledger briefed | ✅ confirmed; 2026-05-05 meeting | ✅ DONE | → |
| Director IDs confirmed | Still unverified from memory; ABN issued suggests OK | ⚠️ ASSUMED OK | → unresolved |
| Shareholders Agreement | Not in drafts; was Rule-4 Week 1-2 | 🔴 NOT CONFIRMED | → |
| Strategic fork confirmed with SL (journal vs sale) | EOFY Decision Pack 2026-06-19 raises this | 🔴 NOT RESOLVED | 🆕 new risk |

### Section 2 — Banking and payment rails

| Item | Evidence | Status | Change |
|---|---|---|---|
| **NAB business account (Pty)** | bank_statement_lines ends 2026-03-31; in progress per 2026-06-01 plan | ❓ UNCONFIRMED | was 🔴, may have progressed |
| Stripe account (Pty) | No artefact; 2026-06-01 plan noted 30-day notice risk | 🟡 OPEN (may not be needed by 1 July per Rule 2) | → |
| Auto-debits audit + migrate | No consolidated output | 🟡 OPEN | → |

### Section 3 — Xero

| Item | Evidence | Status | Change |
|---|---|---|---|
| **Pty Xero file opens** | 1 xero_tenant_id in DB; may be opened but not synced | ❓ UNCONFIRMED | was 🔴; openable since 2026-06-01 |
| **$1 test invoice run** | Runbook exists; no pass evidence in DB | ❓ UNCONFIRMED | 🆕 pre-req for live invoicing |
| Final sole trader BAS (Q4 FY26) | Due 28 July 2026 — **12 days from now** | ⏳ DUE IMMINENTLY | → escalating |
| Pty payroll configured | Blocked on Pty Xero + salary determination | ❓ UNCONFIRMED | → |
| R&D FY27 re-registration (AusIndustry) | Post-1-July; plan says "from day 1" | 🔴 OPEN — needs to start | 🆕 now due |

### Section 4 — Grants and funders

Outstanding receivables: see [[funder-alignment-2026-07-16|Q1 funder synthesis]].

| Novation item | Evidence | Status | Change |
|---|---|---|---|
| Novation letter template | `thoughts/shared/drafts/novation-letter-templates.md` | ✅ DRAFTED | → (was 🟡 awaiting review+ABN) |
| Snow Foundation novation notice | Snow has PAID INV-0321; migration conversation status unknown | 🟡 UNKNOWN | → ABN now available to include |
| Funder batch novation letters sent | No confirmation in plans or drafts | 🔴 NOT CONFIRMED | → plan said end-May; likely slipped |
| All active-grant enumeration | Q1 synthesis + Q3 running | 🟡 PARTIAL | → |

### Section 5 — Commercial contracts

All items remain NOT STARTED or UNCONFIRMED per available evidence.

### Section 6 — IP

| Item | Status | Change |
|---|---|---|
| IP assignment deed (Nic → Pty) | 🔴 NOT CONFIRMED | → |
| GitHub org transfer | 🔴 NOT STARTED | → |
| Trademark registration | 🔴 NOT STARTED | → |

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| D&O insurance | ~2026-05-24 (30d from registration) | ❓ UNCONFIRMED — in progress per 2026-06-01 plan | was 🔴 10d, may have resolved |
| Public Liability $20M | Before Harvest lease | ❓ in progress per 2026-06-01 | → |
| Professional Indemnity | 1 July 2026 | ❓ UNCONFIRMED | → |
| Workers Comp | First employee | ⏳ NOT YET (pending payroll) | → |

### Section 8 — Governance

| Item | Status | Change |
|---|---|---|
| Shareholders Agreement | 🔴 NOT CONFIRMED — Rule 4 target was Week 1-2 (circa 2026-05-08) | → |
| Pty minute book | 🟡 UNVERIFIED | → |
| ASIC first annual review | ⏳ NOT YET DUE (2027) | → |

### Section 9 — Subscriptions and tooling

All SaaS transfers remain NOT STARTED per available evidence. The sole trader is still the active Xero tenant and is still issuing invoices.

### Section 10 — Communications (cutover)

| Item | Status | Change |
|---|---|---|
| Announcement email to funders/partners | 🔴 NOT CONFIRMED | → |
| Email/website footer updates | 🔴 NOT CONFIRMED | → |
| Xero invoice template (Pty) | ❓ blocked until Pty Xero confirmed open | → |

### Section 11 — Standard Ledger decisions (2026-05-05)

| Decision | Status | Change |
|---|---|---|
| D11.1 Harvest subsidiary structure | 🟡 Decision made (D11.1); plan `2026-05-26-harvest-stage-budget.md` suggests progress | → |
| D11.2 Payroll setup | ❓ BLOCKED on Pty Xero | → |
| D11.3 Dext per-project emails | 🔴 NOT CONFIRMED | → |
| D11.4 Mapping export | ✅ DONE (2026-05-05, 2,879 lines) | → |
| D11.5 Knight Photography Phase 1+2 invoices | 🔴 NOT CONFIRMED | → |

### Section 12 — EOFY Decision Pack (2026-06-19) — NEW

| Decision | Status |
|---|---|
| Transfer path: journal-entry vs market-value sale fork | 🔴 NOT RESOLVED — requires SL confirmation |
| Vendor-finance loan structure | ⏳ PENDING SL + private ruling |
| Nic super contribution $30K by 30 Jun | ⏳ STATUS UNKNOWN (may have executed) |
| Knight Photography structure (sole trader vs partnership) | 🔴 NOT RESOLVED |
| R&D re-baseline (FY26 ≈ $0-25K; FY27 ≈ $200-260K) | 🟡 DECISION DOCUMENTED — SL to confirm |

---

## Status summary

| Status | Count | Share | Change from 2026-05-14 |
|---|---:|---:|---|
| ✅ DONE | ~8 | ~12% | ↑ +2 (ABN, GST) |
| ❓ UNCONFIRMED (may have progressed) | ~8 | ~12% | 🆕 new category — DB can't confirm |
| 🟡 IN PROGRESS / PARTIAL | ~7 | ~10% | → |
| 🔴 NOT STARTED / NOT CONFIRMED | ~30 | ~44% | → |
| ⏳ NOT YET DUE / BLOCKED | ~12 | ~18% | ↑ +3 new from §12 |
| **Total** | **~65** | | ↑ (§12 added 6 items) |

---

## Cutover risk map — post-cutover

### 🚨 Red (active problems today)

1. **Sole trader still invoicing post-30-June.** $189.2K in post-cutover sole-trader invoices. Rule 2 may explain it, but it needs explicit acknowledgement and BAS planning with Standard Ledger. **Close this loop this week.**
2. **Final sole trader BAS due 28 July — 12 days away.** Q4 FY26 BAS is the last solo-trader compliance obligation. Needs to capture all income, the Rule 2 post-June invoices policy, and the Rotary write-off if that's the decision. Standard Ledger must be briefed on the post-cutover activity.
3. **EOFY strategic fork unresolved.** The 2026-06-19 Decision Pack concludes the journal-entry model likely fails. Until Standard Ledger rules on the market-value-sale vs journal-entry fork, no cross-entity journals should be booked and the R&D claim basis is unclear.
4. **Rotary eClub INV-0222 ($82,500, 462 days).** Must be resolved for the FY26 BAS — either chased (unlikely to succeed) or written off as bad debt. Every day closer to the BAS lodgement this becomes more urgent.

### 🟠 Amber (immediate follow-up needed)

5. **Confirm Pty Xero file open status** — was it opened after ABN issued 2026-06-01? The $1 test invoice runbook must be run before any real Pty invoicing.
6. **Confirm NAB Pty account live** — bank data ends 2026-03-31; cannot confirm from DB.
7. **Confirm insurance (D&O + PL) binding** — was in progress 2026-06-01 but no Xero ACCPAY evidence.
8. **Funder novation letters sent?** Template exists, ABN now available. Were they sent?
9. **IP assignment deed** — plan said week 4-5 (circa late May). No evidence of completion.
10. **Shareholders Agreement signed?** Rule 4 target was Week 1-2. No evidence of completion.
11. **AusIndustry R&D re-registration for Pty (FY27)** — should have started 1 July.

### 🟡 Yellow (recoverable within next month)

12. D11.5 Knight Photography Phase 1+2 invoices (R&D attribution risk).
13. Subscription billing transfers (SaaS).
14. GitHub org transfer.
15. Email/website footer updates.

### ⏳ Correctly deferred

- Sole trader ABN cancellation (after final BAS, due by late July)
- ASIC first annual review (2027)
- FY26 R&D claim with sole trader tax return (31 October 2026)
- Workers Comp (first employee)

---

## Open questions inherited + new

1. **Is Cutover Rule 2 deliberately invoked?** What's Ben's current plan for the ALIVE and Mounty invoices — reissue from Pty once stack is ready?
2. **Has the Pty Xero file been opened and the $1 test invoice run?** Without this, no Pty invoices should be raised.
3. **Has Standard Ledger confirmed the market-value-sale vs journal-entry fork (EOFY Decision Pack §C1)?** This is the highest-stakes open question from the June analysis.
4. **Nic's super $30K — executed before 30 June?** BAS-relevant.
5. **D&O insurance bound?** Was due ~2026-05-24 (92 days ago). If not bound by now, the company has been operating without D&O for 3 months since registration.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| Plan | `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` | file |
| Plan | `thoughts/shared/plans/2026-06-01-cutover-30-day-critical-path.md` | file |
| Plan | `thoughts/shared/plans/2026-06-19-eofy-decision-pack.md` | file (excerpt) |
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-07-16 |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-07-16 (data ends 2026-03-31) |
| DB | `xero_invoices` status/type summary | 2026-07-16 |
| DB | specific invoice lookups (INV-0321/0314/0317/0324) | 2026-07-16 |
| Drafts | `thoughts/shared/drafts/` — migration keyword grep | 2026-07-16 |
| Plans | `thoughts/shared/plans/` — entity+migration keyword grep | 2026-07-16 |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-05-14|Q3 entity migration — 2026-05-14 last pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 entity migration — 2026-04-24 baseline]]
- [[funder-alignment-2026-07-16|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-07-16|Q2 project truth-state — this pass]]
- [[index|ACT Wikipedia]]
