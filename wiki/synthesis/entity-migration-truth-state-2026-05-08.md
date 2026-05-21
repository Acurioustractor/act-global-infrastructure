---
title: Entity migration truth-state — 53 days to cutover, Centrecorp sent, D&O overdue, ABN still open
summary: Third artefact of the ACT Alignment Loop (Q3), scheduled 2026-05-08 pass (queries run 2026-05-21). 40 days to cutover. Centrecorp INV-0314 finally sent (was DRAFT 90+ days), two new Centrecorp invoices raised. Total outstanding jumped $95K to $602K. Novation templates drafted. ABN, NAB, D&O still open — D&O is now overdue.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover]
status: active
date: 2026-05-08
---

# Entity migration truth-state — 2026-05-08

> Third artefact of the [[act-alignment-loop|ACT Alignment Loop]], Q3 second pass. Scheduled date: 2026-05-08 (2 weeks after baseline). Queries run: 2026-05-21. Sources: `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`, Supabase (`xero_invoices`, `bank_statement_lines`, xero_tenant check), `thoughts/shared/drafts/**`, `thoughts/shared/plans/**`. Baseline: [[entity-migration-truth-state-2026-04-24|2026-04-24]].

## Headline findings

1. **53 days to cutover** (as of scheduled pass date 2026-05-08; 40 days from query date 2026-05-21). The baseline was 67 days. The "Week 1" plan actions (NAB applied, Director IDs confirmed, ABN filed, insurance brokers researched) were due by 2026-05-01. No DB evidence any of these are done.

2. **Centrecorp INV-0314 decision made — sent as AUTHORISED at $97,900.** The baseline flagged this at 70 days DRAFT with an urgent only-Ben decision call. As of 2026-05-21, the invoice status is AUTHORISED and the amount has been revised upward from $84,700 to $97,900. A long-stalled receivable is now live. Two additional new Centrecorp invoices also raised: INV-0329 ($61,050 AUTH, 2026-05-17) and INV-0331 ($106,150 AUTH, 2026-05-17). Total Centrecorp outstanding: **$265,100** (was $84,700 DRAFT at baseline).

3. **Total outstanding ACCREC rose from $507,350 to $602,040 — up $94,690.** Counterintuitive: the receivable book grew, not shrank. New invoices (Centrecorp pair, Sonas $37,290 Harvest early-access, Homeland School new $44K invoice, JVT $1,200) exceeded what was collected. Full itemised table below.

4. **ABN, NAB, Pty Xero remain unopened.** Only one `xero_tenant_id` in the DB (`786af1ed-e3ce-42fc-9ea9-ddf3447d79d0` = sole trader, now 2,216 invoices). Only one bank account (`NAB Visa ACT #8815`, last transaction 2026-03-31). The Pty cannot issue its first invoice until ABN + Xero are live. Target was "Week 3" (early May). Still open at "Week 4–5" of the plan.

5. **D&O insurance is overdue.** Registered 2026-04-24. Standard practice: bind D&O within 30 days → deadline ~2026-05-24. As of query date 2026-05-21, no ACCPAY insurance-broker invoice visible in Xero, no binding artefact found. Three days to deadline. This is now the most critical single action on the board.

6. **Two new migration artefacts on disk since baseline.** `thoughts/shared/drafts/novation-letter-templates.md` (baseline had zero drafts — real progress) and `thoughts/shared/plans/new-entity-xero-launch-playbook.md` (operational readiness guide for Day 0 Xero setup). From zero artefacts at baseline to two at this pass.

---

## Items × evidence × risk

Days until 30 June 2026 cutover: **53** (scheduled pass date), **40** (actual from query date 2026-05-21).

### Section 1 — Entity setup

| Item | Evidence of completion | Status | Change since baseline |
|---|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ confirmed | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ confirmed | ✅ DONE | → |
| Shareholders (Knight FT 50 / Marchesi FT 50) | ✅ confirmed | ✅ DONE | → |
| Director IDs confirmed | No evidence; was "unverified" at baseline | ⚠️ UNVERIFIED | → unchanged |
| ABN application (Pty) | No 2nd xero_tenant in DB; target was Week 1 | 🔴 OPEN/LATE | → target "first week of May" MISSED |
| GST registration (Pty) | Paired with ABN | 🔴 OPEN | → |
| Standard Ledger briefed + meeting held | Meeting 2026-05-05 documented (§11 D11.1–D11.5) | ✅ DONE | ✅ meeting held, 5 structural decisions captured |
| Shareholders Agreement | No draft found | 🔴 OPEN/LATE | → target "Week 2 signed" MISSED |

### Section 2 — Banking

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB business account (Pty) | Only "NAB Visa ACT #8815" in bank_statement_lines (last txn 2026-03-31) | 🔴 OPEN/LATE | → |
| Stripe account (Pty) | No artefact | 🔴 OPEN (not yet due) | → |
| Auto-debits audit + migrate | No consolidated list | 🟡 DATA AVAILABLE | → |

### Section 3 — Xero

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty Xero file opens | DB shows 1 xero_tenant_id (sole trader, 2,216 invoices) | 🔴 OPEN/LATE | → 474 new invoices since baseline; Pty still absent |
| new-entity-xero-launch-playbook.md | File exists in thoughts/shared/plans/ | 🟡 READY TO EXECUTE | 🆕 playbook drafted since baseline |
| Final sole trader BAS (Q4 FY26) | Not yet (Q4 runs Apr–Jun) | ⏳ NOT YET DUE | → |
| R&D Tax FY26 claim (sole trader) | Standard Ledger coordinating | ⏳ NOT YET DUE | → |

### Section 4 — Grants and funders (CRITICAL PATH)

#### Outstanding receivables on sole trader's books

| Counterparty | Invoice(s) | Amount | Status | Project | Change since baseline |
|---|---|---:|---|---|---|
| **The Snow Foundation** | INV-0321 | **$132,000** | AUTH | ACT-GD | ⚠️ date changed (was 2026-03-18, now 2026-05-22) |
| **Centrecorp Foundation** | INV-0331 | **$106,150** | AUTH | ACT-GD | 🆕 NEW (2026-05-17) |
| **Centrecorp Foundation** | INV-0314 | **$97,900** | AUTH | ACT-GD | ✅ WAS DRAFT $84,700 → SENT at $97,900 |
| **Centrecorp Foundation** | INV-0329 | **$61,050** | AUTH | ACT-GD | 🆕 NEW (2026-05-17) |
| **Homeland School Company** | INV-0303 | **$44,000** | AUTH | ACT-JH | ⚠️ was $4,950 paid at baseline; full re-issue |
| **Rotary eClub Outback Australia** | INV-0222 | **$82,500** | AUTH | ACT-GD | 🔴 STILL UNPAID — 400+ days; no decision |
| **Sonas Properties Pty Ltd** | INV-0328 | **$37,290** | AUTH | ACT-HV | 🆕 NEW (Harvest early-access, 2026-05-06) |
| **Regional Arts Australia** | INV-0302 | **$16,500** | AUTH | ACT-HV | 🟡 INV-0301 paid; one invoice remains |
| **Brodie Germaine Fitness** | INV-0325 | **$15,400** | AUTH | ACT-BG | → no change |
| **Aleisha J Keating** | INV-0238..latest | **$5,850** | AUTH (13 inv) | ACT-FM | 🟡 down from $11,700/26 inv (13 recurrent) |
| **SMART Recovery Australia** | INV-0322 | **$2,200** | AUTH | ACT-SM | → no change |
| **The John Villiers Trust** | INV-0327 | **$1,200** | AUTH | ACT-CORE | 🆕 NEW (2026-05-03) |
| **TOTAL OUTSTANDING** | | **$602,040** | | | ↑ from $507,350 (+$94,690) |

**Interpretation:** The receivable book grew because ACT billed actively. Centrecorp alone went from $84.7K DRAFT to $265.1K live across three invoices. Snow + Centrecorp + Rotary (the funder-tier receivables) now total **$479,650** against the sole trader that closes 30 June. Each needs a novation or collection decision.

#### Novation artefacts

| Item | Evidence | Status | Change since baseline |
|---|---|---|---|
| Novation letter template | `thoughts/shared/drafts/novation-letter-templates.md` EXISTS | 🟡 DRAFT (needs Standard Ledger review) | ✅ from 🔴 NOT STARTED |
| Funder batch enumeration | Receivables table above; Q1 synthesis | 🟡 IN PROGRESS | → |
| Novation letters dispatched | No evidence of dispatch | 🔴 NOT STARTED | → |

### Sections 5–6 — Commercial contracts + IP

No change from baseline. All items 🔴 NOT STARTED.

### Section 7 — Insurance

| Type | Status | Change |
|---|---|---|
| **Directors & Officers** | 🔴 **OVERDUE** (~2026-05-24 deadline, no binding) | 🔴 escalated from 🟡 "due in 30d" |
| Public Liability $20M | 🔴 NOT STARTED | → |
| Professional Indemnity | 🔴 NOT STARTED | → |
| Workers Comp | ⏳ NOT YET DUE | → |
| Insurance broker selection | 🔴 OPEN/LATE | → |

### Section 8 — Governance

| Item | Status | Change |
|---|---|---|
| Shareholders Agreement | 🔴 OPEN/LATE (Rule 4 — should be Week 1-2) | → |
| Pty minute book | 🟡 UNVERIFIED | → |

### Section 11 — Decisions from 2026-05-05 Standard Ledger meeting (NEW)

| Decision | Summary | Status |
|---|---|---|
| D11.1 — Harvest as subsidiary | Separate Pty Ltd, Sonas as minority shareholders, lease in subsidiary name | 🟡 DOCUMENTED |
| D11.2 — Founder payroll structure | $10K/month base + director's loan + EOY settle | 🟡 DOCUMENTED |
| D11.3 — Dext per-project email forwarding | Top 12 project codes, individual email addresses | 🟡 DOCUMENTED |
| D11.4 — Sole trader → Pty mapping spreadsheet | 2,879 lines, 246 REVIEW rows | 🟡 DOCUMENTED |
| D11.5 — Knight Photography FY26 invoicing | Option A confirmed | ✅ DECIDED |

---

## Status summary

| Status | 2026-04-24 | 2026-05-08 pass | Change |
|---|---:|---:|---|
| ✅ DONE | 5 | 6 | +1 (S/L meeting upgraded; Centrecorp decision) |
| 🟡 IN PROGRESS / PARTIAL | 7 | 9 | +2 (novation template drafted; Harvest billing active) |
| 🔴 NOT STARTED / OPEN | 28 | 28 | D&O 🟡→🔴 offset by novation 🔴→🟡 |
| ⏳ NOT YET DUE / BLOCKED | 13 | 12 | -1 (D&O escalated to overdue) |
| **Total** | **53** | **55** | +2 (§11 decisions added) |

---

## Cutover risk map

### 🚨 Red / overdue

1. **D&O insurance** — deadline ~2026-05-24; no binding. Bind this week or it is overdue.
2. **ABN + GST** — blocks Pty Xero, first Pty invoice. "Week 1" target missed by 3+ weeks.
3. **NAB business account** — blocks Stripe, subscriptions, D&O insurance billing. "Week 1" target missed.
4. **Pty Xero file** — blocks all invoicing from 1 July. Target was Week 3.
5. **Shareholders Agreement** — Rule 4: Week 1-2. Undrafted. Two equal shareholders from two family trusts with no SHA is latent deadlock risk.
6. **Director IDs confirmed** — unverified from day 1; blocks ABN if missing.

### 🟠 Amber — must ship by end of May to hit 30 June cleanly

7. **Novation letters dispatched** — template exists; needs Standard Ledger review + ABN/bank details.
8. **Snow Foundation migration call** — call Sally/Alexandra: payment on INV-0321 + Pty transition notice.
9. **IP assignment deed** — needs lawyer, Week 4-5 per plan.
10. **Rotary eClub INV-0222** — 400+ days; chase or write off.
11. **Harvest lease signed in Pty/subsidiary name** (D11.1).

### 🟡 Yellow — recoverable post-cutover

12. Email/website footer updates.
13. Announcement email.
14. Subscription billing transfers (Week 7-8).
15. GitHub org transfer.

---

## Alignment-loop acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every "this week" action either verifiably done or flagged | ✅ | NAB/Director IDs/insurance all 🔴; S/L meeting done |
| Every grant in Q1's live list has a matching novation status | ✅ | Snow/Rotary/Centrecorp all 🔴 NOT STARTED on novation |
| Drafts-but-not-sent distinguished from sent | ✅ | Novation template DRAFTED; not dispatched |

---

## Sources queried

| Source | Query / path | Rows | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, status IN (AUTHORISED,DRAFT), amount_due > 0 | 24 AUTH + 2 DRAFT | 2026-05-21 |
| `xero_invoices` | GROUP BY xero_tenant_id | 1 tenant, 2,216 invoices | 2026-05-21 |
| `bank_statement_lines` | GROUP BY bank_account | 1 account, 1,618 rows | 2026-05-21 |
| `xero_invoices` | status/type distribution | see summary | 2026-05-21 |
| `thoughts/shared/drafts/` | grep migration keywords | 1 file: novation-letter-templates.md | 2026-05-21 |
| `thoughts/shared/plans/` | entity migration plans | 3 files: checklist, alignment-2026-04, xero-playbook | 2026-05-21 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop]]
- [[funder-alignment-2026-05-08|Q1 funder alignment — 2026-05-08 pass]]
- [[project-truth-state-2026-05-08|Q2 project truth-state — 2026-05-08 pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 baseline — 2026-04-24]]
- [[index|ACT Wikipedia]]
