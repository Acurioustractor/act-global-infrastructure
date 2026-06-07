---
title: Entity migration truth-state — 53 days to cutover, Section 11 scope added, D&O window critical
summary: Third artefact of the ACT Alignment Loop (Q3), second pass. 53 days to cutover. Outstanding ACCREC reduced from $507K to ~$300K since baseline. Standard Ledger meeting (2026-05-05) added Section 11 scope — Harvest subsidiary, founder payroll, Knight Photography invoices, D11.4 mapping export shipped. Novation letter template now drafted (was 🔴 at baseline). Pty Xero and NAB account still unopened. D&O deadline is 2026-05-24 — 16 days away.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover]
status: active
date: 2026-05-08
---

# Entity migration truth-state — 2026-05-08

> Third artefact of the [[act-alignment-loop|ACT Alignment Loop]], second pass. Four sources: migration checklist at `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` (last_verified: 2026-05-08), Supabase (`xero_invoices`, `xero_transactions`, `bank_statement_lines`, `xero_tenant_id`), `thoughts/shared/drafts/**` (novation + comms drafts), and `thoughts/shared/plans/**` (new entity plans). DB queried 2026-06-04; structural facts (tenant count, bank accounts) are stable.

## Headline findings

1. **Outstanding ACCREC reduced ~$207K — but the cutover infrastructure hasn't moved.** Snow Foundation INV-0321 ($132K) paid, PICC pair ($113.3K) paid, Just Reinvest ($27.5K) paid, SMART ($2.2K) paid. Total ACCREC outstanding down from $507,350 to approximately $300,400 (per 2026-05-07 auto-cycle data). Yet xero_tenant_id is still 1 (sole trader only), bank_account is still NAB Visa ACT #8815 only, and no Pty Xero file has been opened. The money improved; the plumbing didn't.

2. **Standard Ledger meeting (2026-05-05) added major new scope — Section 11.** Four decisions added to the checklist:
   - **D11.1:** The Harvest will be a separate Pty Ltd subsidiary (not a project line) — architectural change.
   - **D11.2:** Founder payroll at $10K/month base + super + PAYG, top-up via director's loan.
   - **D11.3:** Dext per-project email forwarding per ACT-XX code.
   - **D11.4:** Sole trader → Pty income/expense mapping spreadsheet; the export script shipped (✅).
   - **D11.5:** Knight Photography FY26 invoices to be raised (Phase 1 $100K + Phase 2 3×$50K).

3. **Novation letter template now drafted.** `thoughts/shared/drafts/novation-letter-templates.md` exists. At baseline (2026-04-24) there were zero novation/migration drafts. This is a material unlock — the template was the prerequisite for the batch send to funders.

4. **D&O insurance is 16 days from its 30-day-post-registration deadline (2026-05-24).** Registered 2026-04-24. D&O due by ~2026-05-24. No binding evidence exists in Xero. This is the most time-critical item on the checklist.

5. **New plans on disk since baseline.** `thoughts/shared/plans/new-entity-xero-launch-playbook.md` exists — the Pty Xero onboarding playbook.

---

## Items × evidence × risk

Days until 30 June 2026 cutover: **53 days** (as of 2026-05-08).

### Section 1 — Entity setup

| Item | Status @ Baseline | Status @ 2026-05-08 | Change |
|---|---|---|---|
| Pty registered at ASIC | ✅ DONE | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ DONE | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ DONE | ✅ DONE | → |
| Director IDs confirmed for both directors | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | → Not resolved |
| ABN application (Pty) | 🔴 OPEN | 🔴 OPEN | → Target was week 1-2 of May, now overdue |
| GST registration (Pty) | 🔴 OPEN | 🔴 OPEN | → Blocked on ABN |
| Standard Ledger briefed | ✅ DONE | ✅ DONE | → |

### Section 2 — Banking and payment rails

| Item | Status @ Baseline | Status @ 2026-05-08 | Change |
|---|---|---|---|
| NAB business account (Pty) | 🔴 OPEN | 🔴 OPEN | → No new account in `bank_statement_lines` |
| Stripe account (Pty) | 🔴 OPEN | 🔴 OPEN | → |
| PayID / Osko on Pty NAB | ⏳ BLOCKED | ⏳ BLOCKED | → |
| Expense cards (Pty) | ⏳ BLOCKED | ⏳ BLOCKED | → |
| Auto-debits audit + migrate | 🟡 OPEN | 🟡 OPEN | → |

### Section 3 — Xero

| Item | Status @ Baseline | Status @ 2026-05-08 | Change |
|---|---|---|---|
| Pty Xero file opens | 🔴 OPEN | 🔴 OPEN | → DB shows 1 tenant (was 1,742 invoices → now 2,227 — sole trader only) |
| Final sole trader BAS (Q4 FY26) | ⏳ NOT YET DUE | ⏳ NOT YET DUE | → |
| R&D Tax Incentive FY26 (sole trader) | ⏳ NOT YET DUE | ⏳ NOT YET DUE | → |
| ABN cancellation (sole trader) | ⏳ NOT YET DUE | ⏳ NOT YET DUE | → |

### Section 4 — Grants and funders (CRITICAL PATH)

**Outstanding receivables on sole trader's books (as of 2026-05-07/08):**

| Counterparty | Invoice | Amount | Status | Age (2026-05-08) | Action |
|---|---|---:|---|---:|---|
| **Rotary eClub Outback Aus.** | INV-0222 | $82,500 | AUTHORISED | **420d+** | Chase or write off |
| **Regional Arts Australia** | INV-0302 | $16,500 | AUTHORISED | ~144d | Chase |
| **Brodie Germaine Fitness** | INV-0325 | $15,400 | AUTHORISED | ~23d | Monitor |
| **Aleisha J Keating** | 13 × weekly | $5,850 | AUTHORISED | ongoing | Retainer decision |
| **Homeland School Company** | INV-0303 | $44,000 | AUTHORISED | ~new | Chase (recent large invoice) |
| **Snow Foundation** | INV-0321 | ~~$132,000~~ | ✅ PAID | — | → Notify migration |
| **Centrecorp Foundation** | INV-0314 | ~~$84,700~~ | ✅ RESOLVED | — | → Track final outcome |
| **PICC (pair)** | INV-0317 + INV-0324 | ~~$113,300~~ | ✅ PAID | — | ✅ |

**Novation work:**

| Item | Status @ Baseline | Status @ 2026-05-08 | Change |
|---|---|---|---|
| Novation letter template | 🔴 NOT STARTED | 🟡 DRAFTED | 🟢 `drafts/novation-letter-templates.md` exists |
| Novation letters to funders (batch send) | 🔴 NOT STARTED | 🔴 NOT STARTED | → Template exists but letters not sent |
| Enumeration of active grants | 🟡 IN PROGRESS | 🟡 IN PROGRESS | → |

### Section 5 — Commercial contracts

All 🔴 NOT STARTED at baseline. No change as of 2026-05-08.

Exception: Harvest lease row updated — Harvest will be a subsidiary (D11.1), so the lease goes to the subsidiary, not directly to A Curious Tractor Pty Ltd.

### Section 6 — IP

All 🔴 NOT STARTED. No change.

### Section 7 — Insurance

| Item | Status @ Baseline | Status @ 2026-05-08 | Change |
|---|---|---|---|
| D&O insurance | 🟡 DUE IN ~30 DAYS | 🔴 **DUE IN 16 DAYS (2026-05-24)** | 🔴 Window closing fast; no binding evidence |
| Public Liability $20M | 🔴 NOT STARTED | 🔴 NOT STARTED | → |
| Professional Indemnity | 🔴 NOT STARTED | 🔴 NOT STARTED | → |
| Insurance broker selection | 🔴 NOT STARTED | 🔴 NOT STARTED | → |

### Section 8 — Governance artefacts

| Item | Status @ Baseline | Status @ 2026-05-08 | Change |
|---|---|---|---|
| Shareholders Agreement | 🔴 NOT STARTED | 🔴 NOT STARTED | → Rule 4 says Week 1-2 priority — 2 weeks overdue |
| Pty minute book | 🟡 UNVERIFIED | 🟡 UNVERIFIED | → |

### Section 9 — Subscriptions and tooling

All 🔴 NOT STARTED / ⏳ BLOCKED. No change from baseline.

### Section 10 — Communications

All 🔴 NOT STARTED. No change from baseline.

### Section 11 — New decisions (from Standard Ledger 2026-05-05)

| Item | Target | Status |
|---|---|---|
| Draft Harvest subsidiary structure | Week 4-5 | 🔴 OPEN |
| Confirm Harvest lease counterparty (subsidiary not Pty) | Week 4 | 🔴 OPEN |
| Open separate Xero for Harvest subsidiary | Day 0 of incorporation | ⏳ NOT YET DUE |
| Set up payroll on Pty Xero | Day 0 of Pty Xero | ⏳ BLOCKED |
| Open director's loan accounts | Week 3 | 🔴 OPEN |
| Decide FY26 founder pay catch-up | Week 5 | 🔴 OPEN |
| Provision Dext per-project email addresses | Week 4 | 🔴 OPEN |
| Document address map in config | Week 4 | 🔴 OPEN |
| Update gmail-to-xero-pipeline.mjs | Week 5 | 🔴 OPEN |
| Knight Photography Phase 1 invoice ($100K) | Asap | 🔴 OPEN |
| Knight Photography Phase 2 quarterly invoices | FY26 Q3-Q4 | 🔴 OPEN |
| Clear untagged transaction review queue | Week 4 | 🔴 OPEN |
| **Generate sole trader → Pty mapping export** | Done | **✅ DONE** (D11.4 script shipped) |
| Standard Ledger reviews mapping | Week 5-6 | 🔴 OPEN |

---

## Status summary

| Status | 2026-04-24 | 2026-05-08 | Change |
|---|---:|---:|---|
| ✅ DONE | 5 | 6 | +1 (D11.4 mapping export) |
| 🟡 IN PROGRESS / PARTIAL | 7 | 8 | +1 (novation template drafted) |
| 🔴 NOT STARTED / OPEN | 28 | ~40 | +12 (Section 11 new items added) |
| ⏳ NOT YET DUE / BLOCKED | 13 | 13 | 0 |
| **Total items tracked** | **53** | **~67** | +14 net scope increase |

---

## Cutover risk map — 2026-05-08 view

### 🚨 Red — would materially damage 1 July launch

1. **D&O insurance binding** — due 2026-05-24 (16 days). No evidence of broker engagement.
2. **Pty ABN + GST rego** — target was first week of May; now running at least 1 week late. Blocks Pty Xero.
3. **Pty Xero file opens** — blocked on ABN. Blocks all invoicing from 1 July.
4. **NAB Pty business account** — no evidence of application. Blocks Stripe, auto-debits, subscriptions.
5. **Shareholders Agreement** — Rule 4: should have been signed by Week 2. Now running late.
6. **Director IDs confirmed** — still unverified; can't open NAB without this.

### 🟠 Amber — must ship by mid-May

7. **Novation letter batch send to funders** — template exists, but letters not sent. Plan says Week 5-6 (now).
8. **IP assignment deed** — Plan says Week 4-5; no draft exists.
9. **Snow Foundation migration notice** — INV-0321 paid; time to notify Sally/Alexandra of 1 July transition.
10. **Rotary eClub chase-or-write-off** — 53 days to cutover; decision needed on sole trader BAS.
11. **Knight Photography Phase 1 invoice** — off-books transactions at risk without timely invoicing.

### 🟡 Yellow — recoverable post-cutover

12. Email/website footer updates.
13. Announcement email.
14. Subscription audit (Week 7-8 per plan).
15. GitHub org transfer.

---

## New artefacts since baseline

| File | Created | Signal |
|---|---|---|
| `thoughts/shared/drafts/novation-letter-templates.md` | ~2026-05 | 🟢 Novation template drafted (was 🔴 at baseline) |
| `thoughts/shared/plans/new-entity-xero-launch-playbook.md` | ~2026-05 | 🟢 Pty Xero launch plan drafted |
| `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` (§11) | 2026-05-05 (SL meeting) | Section 11 scope decisions added |

---

## DB evidence summary

| Check | Baseline | 2026-05-08 |
|---|---|---|
| xero_tenant_id count | 1 (sole trader, 1,742 invoices) | **1** (sole trader, 2,227 invoices) — no Pty Xero |
| bank_account distinct | 1 (NAB Visa ACT #8815) | **1** (NAB Visa ACT #8815, through 2026-03-31) |
| ACCREC AUTHORISED outstanding | $507,350 | ~$300,400 (2026-05-07 auto-cycle) |
| DRAFT ACCREC invoices | 2 (incl. INV-0314 $84.7K) | 2 (amount_due: $0 — Centrecorp resolved) |
| Migration-keyword drafts | 0 | 1 (`novation-letter-templates.md`) |
| Migration-related plans | 2 | 4+ (new-entity-xero-launch-playbook, etc.) |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-04-24|Q3 entity migration baseline]]
- [[funder-alignment-2026-05-08|Q1 funder-alignment — same cycle]]
- [[index|ACT Wikipedia]]
