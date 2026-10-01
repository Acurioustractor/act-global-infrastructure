---
title: Funder alignment — ACCREC flat at $285K, tax return 30 days away, Rotary 539 days unpaid
summary: Eleventh pass of the ACT Alignment Loop (Q1), 2026-10-01. Outstanding ACCREC $285,067.84 — unchanged from Sep 24 (0 movement in 7 days). Still 10 invoices. Rotary INV-0222 now 539 days unpaid. BAS 65 days past standard due date. Sole-trader tax return (31 Oct 2026) 30 days away. funders.json unchanged at 25 entries.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-10-01
---

# Funder alignment — 2026-10-01

> Eleventh pass of the [[act-alignment-loop|ACT Alignment Loop]], Q1. Same four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). Last merged pass: [[funder-alignment-2026-09-24|2026-09-24]]. Baseline: [[funder-alignment-2026-04-24|2026-04-24]].

## Headline findings

1. **ACCREC flat — $285,067.84 on 10 invoices. Zero movement in 7 days.** Every invoice is in the same state and amount as 2026-09-24. No payments received, no new invoices raised. The receivables ledger has been static for two consecutive passes.

2. **Sole-trader tax return is now 30 days away (31 October 2026).** Down from 37 days at Sep 24. The three blocking items remain unresolved across eleven passes: Rotary INV-0222 write-off ($82,500, 539d), EOFY strategic fork (journal vs market-value sale), and R&D FY26 claim structuring. **Thirty days is not enough time to discover these answers — each needs a Standard Ledger conversation that has not started.**

3. **Rotary eClub INV-0222 ($82,500) is now 539 days unpaid** — over 17.5 months. The write-off decision must precede the sole-trader tax return. 30 days remaining.

4. **BAS Q4 FY26 (sole-trader) now 65 days past the standard due date** (2026-07-28). Up from 58 days at Sep 24. If Standard Ledger's concession window is end-October, BAS and the tax return share the same 30-day deadline. Concession deadline still not confirmed across eleven passes.

5. **`wiki/narrative/funders.json` unchanged at 25 entries** (v2). Six invoiced counterparties still without stubs: Social Impact Hub Foundation, Tandanya, Brodie Germaine Fitness, Berry Obsession, Sonas Properties, Oonchiumpa Consultancy.

6. **Four invoices carry null project_code** — INV-0289 (SIHF $21,780), INV-0332 (Tandanya $16,500), INV-0341 (ALIVE $66,000), INV-0347 (Tandanya $5,500). ALIVE ($66,000) now 91 days untagged. Tandanya INV-0332 ($16,500) now 106 days untagged.

---

## At-a-glance — outstanding receivables, 2026-10-01

Legend: 🟢 paid/clear, 🟡 outstanding, 🔴 critical/overdue, → no change, ✅ moved to paid

| Funder / counterparty | Invoice | Amount | Date raised | Age | Priority | Change |
|---|---|---:|---|---:|---|---|
| **Rotary eClub Outback Australia** | INV-0222 | $82,500 | 2025-04-10 | **539d** | 🚨 write-off deadline 30d | → +7d |
| **Jenn Brazier** | INV-0228 | $3,887.84 | 2025-07-01 | **457d** | 🔴 >1 year | → +7d |
| **Social Impact Hub Foundation** | INV-0289 | $21,780 | 2025-11-18 | 317d | 🟡 chase | → +7d |
| **Regional Arts Australia** | INV-0302 | $16,500 | 2025-12-16 | 289d | 🟡 chase | → +7d |
| **Berry Obsession PTY LTD** | INV-0309 | $13,000 | 2026-02-10 | 233d | 🟡 chase | → +7d |
| **Sonas Properties Pty Ltd** | INV-0316 | $44,000 | 2026-02-16 | 227d | 🟡 Harvest-related | → +7d |
| **Brodie Germaine Fitness Aboriginal Corp** | INV-0325 | $15,400 | 2026-04-15 | 169d | 🟡 | → +7d |
| **Tandanya National Aboriginal Cultural Inst.** | INV-0332 | $16,500 | 2026-06-17 | 106d | 🟡 no project_code | → +7d |
| **ALIVE National Centre (UniMelb)** | INV-0341 | $66,000 | 2026-07-02 | 91d | ⚠️ post-cutover, entity unclear | → +7d |
| **Tandanya National Aboriginal Cultural Inst.** | INV-0347 | $5,500 | 2026-08-28 | 34d | 🟡 no project_code | → +7d |
| **TOTAL OUTSTANDING ACCREC** | | **$285,067.84** | | | | **→ no change** |

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| No funder outstanding >90 days without a written reason | ❌ — Rotary (539d), Jenn Brazier (457d), SIHF (317d), RAA (289d), Berry Obsession (233d), Sonas (227d), Brodie Germaine (169d), Tandanya INV-0332 (106d) all >90d with no visible resolution |
| All active invoices have a project_code | ❌ — 4 invoices with null project_code: INV-0289, INV-0332, INV-0341, INV-0347 |
| `funders.json` reflects all active receivable counterparties | ❌ — 6 invoiced counterparties without stubs |
| BAS lodged (final sole-trader) | ❌ — 65 days past standard due date, concession deadline still not confirmed |

---

## Derived actions (priority order)

1. **Book Standard Ledger conversation this week** — sole-trader tax return is 30 days away. Three prerequisites (Rotary write-off, EOFY strategic fork, R&D FY26 claim) all require a ruling. This is now urgent.
2. **Confirm BAS Q4 FY26 concession deadline** — 65 days past standard due. If concession window closes end-October, BAS and tax return share the same 30-day clock.
3. **Resolve Rotary INV-0222 ($82,500, 539d)** — write off or confirm live. Decision required before the tax return.
4. **Confirm ALIVE INV-0341 entity treatment** — $66,000, 91 days post-cutover on sole trader. Sole trader or Pty?
5. **Tag 4 invoices with project_code** — INV-0289 (SIHF), INV-0332 (Tandanya), INV-0341 (ALIVE), INV-0347 (Tandanya).

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `xero_invoices` | ACCREC AUTHORISED/DRAFT, amount_due > 0 | 2026-10-01 |
| `xero_invoices` | status/type summary (non-deleted/voided/paid) | 2026-10-01 |
| `wiki/narrative/funders.json` | entry count | 25 entries, v2 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-09-24|Q1 funder alignment — 2026-09-24 last pass]]
- [[funder-alignment-2026-04-24|Q1 funder alignment — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
