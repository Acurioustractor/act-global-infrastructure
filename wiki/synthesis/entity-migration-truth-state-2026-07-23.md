---
title: Entity migration truth-state — 23 days post-cutover, BAS in 5 days, Pty stack still unconfirmed
summary: Fourth pass of the ACT Alignment Loop (Q3), 2026-07-23. Sole-trader BAS (Q4 FY26) due 28 July — 5 days away and the most urgent single compliance obligation in this session. Xero still shows 1 tenant (2,293 invoices). $471,717.84 outstanding ACCREC unchanged. New plan artifact: new-entity-xero-launch-playbook.md. EOFY strategic fork unresolved.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover, post-cutover, bas]
status: active
date: 2026-07-23
---

# Entity migration truth-state — 2026-07-23

> Fourth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. **23 days post-cutover (30 June 2026).** Same sources: migration checklist, Supabase, `thoughts/shared/drafts/**`, `thoughts/shared/plans/**`. Last pass: [[entity-migration-truth-state-2026-07-16|2026-07-16]].

## Headline findings

1. **Q4 FY26 sole-trader BAS is due 28 July — 5 days from now.** This was 12 days away at the 2026-07-16 pass. It is now the dominant compliance deadline. The BAS must account for: all Q4 FY26 income, the three Rule 2 post-cutover invoices ($189.2K on the sole trader), and a write-off decision on Rotary INV-0222 ($82.5K, 469 days). Standard Ledger must be briefed and the lodgement prepared immediately.

2. **Only 1 Xero tenant in DB — the sole trader, now 2,293 invoices (+46 since 2026-07-16).** No Pty Xero file is visible in the database. The +46 invoices show continued sole-trader activity in the 7 days since the last pass. Whether the Pty Xero file exists but is not yet synced to Supabase remains unknown — this cannot be confirmed from the DB alone.

3. **Bank statement data still ends 2026-03-31.** `bank_statement_lines` shows only one account (NAB Visa ACT #8815), with data through end of Q3 FY26. If a Pty NAB account has been opened, it would not yet appear here.

4. **Outstanding ACCREC: $471,717.84 — identical to 2026-07-16.** 14 invoices, no movement in 7 days. Includes $189,200 in post-cutover sole-trader invoices (ALIVE ×2 + Mounty) and $82,500 Rotary (469 days). The book is frozen.

5. **One new migration plan artifact since 2026-07-16: `new-entity-xero-launch-playbook.md`.** The 2026-07-16 synthesis found 7 migration-related plan artifacts; now 8. The playbook likely covers the $1 test invoice sequence and Pty Xero setup steps. Total migration-related plan artifacts: `act-entity-migration-checklist-2026-06-30.md`, `2026-06-01-cutover-30-day-critical-path.md`, `2026-06-01-pty-test-invoice-runbook.md`, `minimax-full-migration-2026-05-22.md`, `finance-cutover-review-workflow.md`, `2026-06-19-eofy-decision-pack.md`, `2026-06-19-eofy-money-movement-plan.md`, `2026-06-19-eofy-round3-compliance-detail.md`, and now `new-entity-xero-launch-playbook.md`.

6. **EOFY strategic fork (journal-entry vs market-value-sale) remains unresolved.** The 2026-06-19 Decision Pack concluded the journal-entry model likely fails under Subdiv 328-G. No Standard Ledger ruling is visible. Until this is resolved, no cross-entity journals should be booked and the R&D claim basis is unclear.

---

## Items × evidence × risk — post-cutover view

Days past 30 June 2026 cutover: **+23 days**.

### Section 1 — Entity setup

| Item | Evidence | Status | Change since 2026-07-16 |
|---|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ confirmed | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ confirmed | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ confirmed | ✅ DONE | → |
| ABN 36 697 347 676 (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| GST registration (Pty) | ✅ DONE 2026-06-01 | ✅ DONE | → |
| Standard Ledger briefed | ✅ confirmed | ✅ DONE | → |
| Director IDs confirmed | Assumed OK (ABN issued without block) | ⚠️ ASSUMED OK | → |
| Shareholders Agreement | Not visible in plans/drafts | 🔴 NOT CONFIRMED | → |
| Strategic fork confirmed with SL (journal vs sale) | EOFY Decision Pack raises it; no ruling visible | 🔴 NOT RESOLVED | → unchanged |

### Section 2 — Banking

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB Pty business account | `bank_statement_lines` data ends 2026-03-31; no Pty account visible | ❓ UNCONFIRMED | → |
| Stripe account (Pty) | No artefact | 🟡 OPEN | → |

### Section 3 — Xero

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty Xero file opens | 1 xero_tenant_id in DB; may be open but unsynced | ❓ UNCONFIRMED | → |
| $1 test invoice run | Runbook exists; no pass evidence in DB | ❓ UNCONFIRMED | → |
| **Final sole trader BAS (Q4 FY26)** | **Due 28 July 2026 — 5 days away** | **🚨 IMMINENTLY DUE** | 🆕 escalated from "12 days" |
| Pty payroll | Blocked on Pty Xero + salary determination | ❓ UNCONFIRMED | → |
| R&D FY27 re-registration (AusIndustry) | Should have started 1 July | 🔴 OPEN | → |

### Section 4 — Grants and funders

Outstanding receivables: see [[funder-alignment-2026-07-23|Q1 funder synthesis — this pass]].

| Novation item | Status | Change |
|---|---|---|
| Novation letter template | ✅ DRAFTED | → |
| Snow Foundation novation notice | Snow PAID; ABN available; migration notice status unknown | 🟡 UNKNOWN | → |
| Funder batch novation letters | No confirmation | 🔴 NOT CONFIRMED | → |

### Section 5–6 — Commercial contracts + IP

All items remain NOT STARTED or UNCONFIRMED per available evidence. No changes since 2026-07-16.

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| D&O insurance | ~2026-05-24 (30d from registration) | ❓ UNCONFIRMED — was in progress June 1 | → (now 99d past deadline) |
| Public Liability $20M | Before Harvest lease | ❓ in progress per 2026-06-01 | → |
| Professional Indemnity | 1 July 2026 | ❓ UNCONFIRMED | → |

### Section 8 — Governance

| Item | Status | Change |
|---|---|---|
| Shareholders Agreement | 🔴 NOT CONFIRMED — was due Week 1-2 (circa 2026-05-08) | → |
| Pty minute book | 🟡 UNVERIFIED | → |

### Section 9 — Subscriptions / tooling

All SaaS transfers NOT STARTED per available evidence. Sole trader still the active Xero entity.

### Section 10 — Communications

| Item | Status | Change |
|---|---|---|
| Announcement email to funders/partners | 🔴 NOT CONFIRMED | → |
| Email/website footer updates | 🔴 NOT CONFIRMED | → |

### Section 11 — Standard Ledger decisions (2026-05-05)

No new information on D11.2 (payroll), D11.3 (Dext emails), D11.5 (Knight Photography invoices). D11.4 (mapping export) remains ✅ DONE.

### Section 12 — EOFY Decision Pack (2026-06-19)

| Decision | Status | Change |
|---|---|---|
| Transfer path: journal-entry vs market-value sale fork | 🔴 NOT RESOLVED | → |
| Final sole trader BAS | **DUE IN 5 DAYS** | 🆕 CRITICAL |
| Nic super contribution $30K by 30 Jun | ❓ status unknown | → |
| Knight Photography structure | 🔴 NOT RESOLVED | → |

---

## Status summary

| Status | Count | Share | Change from 2026-07-16 |
|---|---:|---:|---|
| ✅ DONE | ~8 | ~12% | → |
| ❓ UNCONFIRMED | ~8 | ~12% | → |
| 🟡 IN PROGRESS / PARTIAL | ~7 | ~10% | → |
| 🔴 NOT STARTED / NOT CONFIRMED | ~30 | ~44% | → |
| ⏳ NOT YET DUE / BLOCKED | ~12 | ~18% | ↓ −1 (BAS escalated to 🚨) |
| **Total** | **~65** | | → |

---

## Cutover risk map — post-cutover

### 🚨 Red (active problems today)

1. **Final sole trader BAS due 28 July — 5 days.** Q4 FY26 BAS is the last major sole-trader compliance obligation. Must capture: all Q4 income, post-cutover Rule 2 invoices ($189.2K ALIVE + Mounty), and a write-off decision on Rotary ($82.5K). Standard Ledger must be briefed NOW.
2. **Rotary INV-0222 ($82,500, 469 days).** Write off or chase — must be decided before BAS lodgement. Write-off creates a bad debt deduction in the sole trader's FY26 return.
3. **Sole trader still invoicing post-cutover.** Three invoices dated 2026-07-02 ($189.2K) on the sole trader. Rule 2 may legitimise this, but it needs explicit BAS treatment — Standard Ledger must confirm whether these are sole-trader income or an accounts-receivable transfer to the Pty.
4. **EOFY strategic fork unresolved.** The journal-entry model may fail under Subdiv 328-G. Until Standard Ledger rules, no cross-entity journals should be booked, and the R&D claim for FY27 cannot be properly structured.

### 🟠 Amber (this week)

5. **Confirm Pty Xero file open and $1 test invoice run** — prerequisite for Pty invoicing. `new-entity-xero-launch-playbook.md` exists; confirm it has been executed.
6. **Confirm NAB Pty account live** — DB can't confirm (data ends 2026-03-31).
7. **Confirm D&O insurance binding** — now 99 days past the ~2026-05-24 deadline; if not bound, the company has been operating without D&O for 3 months.
8. **AusIndustry R&D re-registration for Pty (FY27)** — should have started 1 July; now 23 days overdue.
9. **Tag the 3 post-cutover invoices** (INV-0334, INV-0341, INV-0342) — both for BAS accuracy and project tracking.
10. **Confirm Shareholders Agreement signed.**

### 🟡 Yellow (recoverable within a month)

11. D11.5 Knight Photography Phase 1+2 invoices.
12. Subscription billing transfers.
13. GitHub org transfer.
14. Email/website footer updates.
15. Funder novation letters batch send.

### ⏳ Correctly deferred

- Sole trader ABN cancellation (after final BAS)
- ASIC first annual review (2027)
- FY26 R&D claim with sole trader tax return (31 October 2026)
- Workers Comp (first employee)

---

## Open questions

1. **Sole trader BAS Q4 FY26** — what's the Standard Ledger lodgement plan for the next 5 days?
2. **Is Cutover Rule 2 deliberately invoked for the ALIVE + Mounty invoices?** When will they be reissued from the Pty, or are they staying on the sole trader?
3. **Has Standard Ledger confirmed the market-value-sale vs journal-entry fork?** This is the highest-stakes unresolved question.
4. **Has the Pty Xero file been opened and the $1 test invoice been run?** `new-entity-xero-launch-playbook.md` exists — what's its status?
5. **Has D&O insurance been bound?** 99 days past the 30-day-post-registration deadline.
6. **Nic's super $30K — executed before 30 June?**

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-07-23 (1 tenant, 2,293 inv) |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-07-23 (data ends 2026-03-31) |
| DB | `xero_invoices` status/type summary | 2026-07-23 |
| DB | ACCREC AUTHORISED, amount_due > 0 | 2026-07-23 (14 rows, $471,717.84) |
| Plans | `thoughts/shared/plans/` migration-keyword grep | 9 matching files including `new-entity-xero-launch-playbook.md` |
| Drafts | `thoughts/shared/drafts/` migration-keyword grep | `novation-letter-templates.md` |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-07-16|Q3 entity migration — 2026-07-16 last pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 entity migration — 2026-04-24 baseline]]
- [[funder-alignment-2026-07-23|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-07-23|Q2 project truth-state — this pass]]
- [[index|ACT Wikipedia]]
