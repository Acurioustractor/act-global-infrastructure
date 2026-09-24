---
title: Funder alignment — Joy House cleared, ACCREC at $285K, tax return 37 days away
summary: Tenth pass of the ACT Alignment Loop (Q1), 2026-09-24. Outstanding ACCREC $285,067.84 — DOWN $931 from Sep 10 (Joy House INV-0349 cleared — paid or voided). Now 10 invoices. Rotary INV-0222 now 532 days unpaid. BAS 58 days past standard due date. Sole-trader tax return (31 Oct 2026) 37 days away. funders.json unchanged at 25 entries.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-09-24
---

# Funder alignment — 2026-09-24

> Tenth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q1. Same four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). Last merged pass: [[funder-alignment-2026-09-10|2026-09-10]]. Baseline: [[funder-alignment-2026-04-24|2026-04-24]].

## Headline findings

1. **Joy House INV-0349 ($931) cleared — ACCREC now $285,067.84 on 10 invoices.** The $931 Joy House Productions invoice is no longer in the outstanding list (paid or voided). This is the only receivables movement in 14 days. The remaining 10 invoices are unchanged in status and amount.

2. **Sole-trader tax return is now 37 days away (31 October 2026).** Down from 51 days at Sep 10. The three blocking items — Rotary INV-0222 write-off treatment, EOFY strategic fork (journal vs market-value sale), and R&D FY26 claim structuring — remain unresolved. This is now the primary operational deadline.

3. **Rotary eClub INV-0222 ($82,500) is now 532 days unpaid** — over 17.5 months. The write-off decision must precede the sole-trader tax return. 37 days remaining to resolve.

4. **BAS Q4 FY26 (sole-trader) now 58 days past the standard due date** (2026-07-28). Up from 44 days at Sep 10. Standard Ledger tax-agent concession date still not confirmed in any data source across ten passes.

5. **`wiki/narrative/funders.json` unchanged at 25 entries** (v2). Six invoiced counterparties still without stubs: Social Impact Hub Foundation, Tandanya, Brodie Germaine Fitness, Berry Obsession, Sonas Properties, Oonchiumpa Consultancy.

6. **Four invoices carry null project_code** — INV-0289 (SIHF $21,780), INV-0332 (Tandanya $16,500), INV-0341 (ALIVE $66,000), INV-0347 (Tandanya $5,500). Down from 5 (Joy House cleared). ALIVE ($66,000) is now 84 days untagged.

---

## At-a-glance — outstanding receivables, 2026-09-24

Legend: 🟢 paid/clear, 🟡 outstanding, 🔴 critical/overdue, → no change, ✅ moved to paid

| Funder / counterparty | Invoice | Amount | Date raised | Age | Priority | Change |
|---|---|---:|---|---:|---|---|
| **Rotary eClub Outback Australia** | INV-0222 | $82,500 | 2025-04-10 | **532d** | 🚨 write-off deadline 37d | → +14d |
| **Jenn Brazier** | INV-0228 | $3,887.84 | 2025-07-01 | **450d** | 🔴 >1 year | → +14d |
| **Social Impact Hub Foundation** | INV-0289 | $21,780 | 2025-11-18 | 310d | 🟡 chase | → +14d |
| **Regional Arts Australia** | INV-0302 | $16,500 | 2025-12-16 | 282d | 🟡 chase | → +14d |
| **Berry Obsession PTY LTD** | INV-0309 | $13,000 | 2026-02-10 | 226d | 🟡 chase | → +14d |
| **Sonas Properties Pty Ltd** | INV-0316 | $44,000 | 2026-02-16 | 220d | 🟡 Harvest-related | → +14d |
| **Brodie Germaine Fitness Aboriginal Corp** | INV-0325 | $15,400 | 2026-04-15 | 162d | 🟡 | → +14d |
| **Tandanya National Aboriginal Cultural Inst.** | INV-0332 | $16,500 | 2026-06-17 | 99d | 🟡 no project_code | → +14d |
| **ALIVE National Centre (UniMelb)** | INV-0341 | $66,000 | 2026-07-02 | 84d | ⚠️ post-cutover, entity unclear | → +14d |
| **Tandanya National Aboriginal Cultural Inst.** | INV-0347 | $5,500 | 2026-08-28 | 27d | 🟡 no project_code | → +14d |
| ~~Joy House Productions~~ | ~~INV-0349~~ | ~~$931~~ | ~~2026-08-31~~ | — | ✅ CLEARED | ↑ paid/removed |
| **TOTAL OUTSTANDING ACCREC** | | **$285,067.84** | | | | **↓ -$931 (Joy House)** |

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| No funder outstanding >90 days without a written reason | ❌ — Rotary (532d), Jenn Brazier (450d), SIHF (310d), RAA (282d), Berry Obsession (226d), Sonas (220d) all >90d with no visible resolution |
| All active invoices have a project_code | ❌ — 4 invoices with null project_code: INV-0289, INV-0332, INV-0341, INV-0347 |
| `funders.json` reflects all active receivable counterparties | ❌ — 6 invoiced counterparties without stubs |
| BAS lodged (final sole-trader) | ❌ — 58 days past standard due date, no confirmation |

---

## Derived actions (priority order)

1. **Confirm BAS Q4 FY26 status with Standard Ledger** — 58 days past standard due, unknown concession deadline. If Standard Ledger's concession window is end-October, BAS is converging with the tax return (37 days away).
2. **Resolve Rotary INV-0222 ($82,500, 532d)** — write off or confirm live. Must happen before the sole-trader tax return in 37 days.
3. **Confirm EOFY strategic fork (journal vs market-value sale)** — blocking tax return and R&D claim. No Standard Ledger ruling visible.
4. **Confirm ALIVE INV-0341 entity treatment** — $66,000, 84 days post-cutover on sole trader. Sole trader or Pty?
5. **Tag 4 invoices with project_code** — INV-0289 (SIHF), INV-0332 (Tandanya), INV-0341 (ALIVE), INV-0347 (Tandanya).

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `xero_invoices` | ACCREC AUTHORISED/DRAFT, amount_due > 0 | 2026-09-24 |
| `xero_invoices` | status/type summary (non-deleted/voided/paid) | 2026-09-24 |
| `wiki/narrative/funders.json` | entry count | 25 entries, v2 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-09-10|Q1 funder alignment — 2026-09-10 last pass]]
- [[funder-alignment-2026-04-24|Q1 funder alignment — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
