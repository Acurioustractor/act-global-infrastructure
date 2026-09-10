---
title: Funder alignment — ACCREC flat at $286K for 7 days; tax return deadline 51 days away
summary: Ninth pass of the ACT Alignment Loop (Q1), 2026-09-10. Outstanding ACCREC $285,998.84 — UNCHANGED from Sep 3. Zero invoices cleared in 7 days. Rotary INV-0222 now 518 days. BAS 44 days past standard due date. Sole-trader tax return (31 Oct 2026) 51 days away. funders.json unchanged at 25 entries.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-09-10
---

# Funder alignment — 2026-09-10

> Ninth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q1. Same four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). Last merged pass: [[funder-alignment-2026-09-03|2026-09-03]]. Baseline: [[funder-alignment-2026-04-24|2026-04-24]].

## Headline findings

1. **ACCREC flat — $285,998.84, UNCHANGED from 2026-09-03.** Zero invoices paid in the 7-day interval. Zero new invoices raised. This is the first pass since the May 2026 baseline with no movement at all — 11 invoices, same amounts, same ages +7 days each.

2. **Sole-trader tax return is now 51 days away (31 October 2026).** Down from 58 days at Sep 3. The three blocking items — Rotary INV-0222 write-off treatment, EOFY strategic fork (journal vs market-value sale), and R&D FY26 claim structuring — all remain unresolved.

3. **Rotary eClub INV-0222 ($82,500) is now 518 days unpaid** — over 17 months. The write-off decision (or confirmation that the grant is still live) must precede the sole-trader tax return filing. 51 days remaining.

4. **BAS Q4 FY26 (sole-trader) now 44 days past the standard due date** (2026-07-28). Up from 37 days. Standard Ledger tax-agent concession date still not confirmed in any data source across nine passes.

5. **`wiki/narrative/funders.json` unchanged at 25 entries** (v2, last updated 2026-07-07). Six invoiced counterparties still without stubs: Social Impact Hub Foundation, Tandanya, Brodie Germaine Fitness, Berry Obsession, Sonas Properties, Oonchiumpa Consultancy.

6. **Five invoices carry null project_code** — INV-0289 (SIHF $21,780), INV-0332 (Tandanya $16,500), INV-0341 (ALIVE $66,000), INV-0347 (Tandanya $5,500), INV-0349 (Joy House $931). Unchanged from Sep 3; ALIVE and Tandanya have been untagged for 70 and 85 days respectively.

---

## At-a-glance — outstanding receivables, 2026-09-10

Legend: 🟢 paid/clear, 🟡 outstanding, 🔴 critical/overdue, → no change

| Funder / counterparty | Invoice | Amount | Date raised | Age | Priority | Change |
|---|---|---:|---|---:|---|---|
| **Rotary eClub Outback Australia** | INV-0222 | $82,500 | 2025-04-10 | **518d** | 🚨 write-off deadline 51d | → +7d |
| **Jenn Brazier** | INV-0228 | $3,887.84 | 2025-07-01 | **436d** | 🔴 >1 year | → +7d |
| **Social Impact Hub Foundation** | INV-0289 | $21,780 | 2025-11-18 | 296d | 🟡 chase | → +7d |
| **Regional Arts Australia** | INV-0302 | $16,500 | 2025-12-16 | 268d | 🟡 chase | → +7d |
| **Berry Obsession PTY LTD** | INV-0309 | $13,000 | 2026-02-10 | 212d | 🟡 chase | → +7d |
| **Sonas Properties Pty Ltd** | INV-0316 | $44,000 | 2026-02-16 | 206d | 🟡 Harvest-related | → +7d |
| **Brodie Germaine Fitness Aboriginal Corp** | INV-0325 | $15,400 | 2026-04-15 | 148d | 🟡 | → +7d |
| **Tandanya National Aboriginal Cultural Inst.** | INV-0332 | $16,500 | 2026-06-17 | 85d | 🟡 no project_code | → +7d |
| **ALIVE National Centre (UniMelb)** | INV-0341 | $66,000 | 2026-07-02 | 70d | ⚠️ post-cutover, entity unclear | → +7d |
| **Tandanya National Aboriginal Cultural Inst.** | INV-0347 | $5,500 | 2026-08-28 | 13d | 🟡 no project_code | → +7d |
| **Joy House Productions** | INV-0349 | $931 | 2026-08-31 | 10d | ⚠️ new counterparty | → +7d |
| **TOTAL OUTSTANDING ACCREC** | | **$285,998.84** | | | | **→ UNCHANGED** |

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| No funder outstanding >90 days without a written reason | ❌ — Rotary (518d), Jenn Brazier (436d), SIHF (296d), RAA (268d) all >90d with no visible resolution |
| All active invoices have a project_code | ❌ — 5 invoices with null project_code: INV-0289, INV-0332, INV-0341, INV-0347, INV-0349 |
| `funders.json` reflects all active receivable counterparties | ❌ — 6 invoiced counterparties without stubs + Joy House Productions (still unknown) |
| BAS lodged (final sole-trader) | ❌ — 44 days past standard due date, no confirmation |

---

## Derived actions (priority order)

1. **Confirm BAS Q4 FY26 status with Standard Ledger** — lodged or concession deadline? 44 days past standard due. Sole-trader tax return (31 Oct 2026) is 51 days away.
2. **Resolve Rotary INV-0222 ($82,500, 518d)** — write off before the sole-trader tax return. Must decide and action within ~51 days.
3. **Confirm EOFY strategic fork (journal vs market-value sale)** — blocking tax return filing and R&D claim structuring. No Standard Ledger ruling visible.
4. **Confirm ALIVE INV-0341 entity treatment** — $66K raised post-cutover on sole trader at 70 days. Sole trader or Pty?
5. **Tag 5 invoices with project_code** — INV-0289 (SIHF), INV-0332 (Tandanya), INV-0341 (ALIVE), INV-0347 (Tandanya), INV-0349 (Joy House).
6. **Identify Joy House Productions** — INV-0349 $931, no project_code, 10 days old. Who are they?

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `xero_invoices` | ACCREC AUTHORISED/DRAFT, amount_due > 0 | 2026-09-10 |
| `xero_invoices` | status/type summary (non-deleted/voided/paid) | 2026-09-10 |
| `wiki/narrative/funders.json` | entry count | 25 entries, v2 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-09-03|Q1 funder alignment — 2026-09-03 last pass]]
- [[funder-alignment-2026-04-24|Q1 funder alignment — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
