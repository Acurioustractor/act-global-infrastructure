---
title: Funder alignment — Oonchiumpa cleared, ACCREC at $286K; BAS now 37 days past standard due date
summary: Eighth pass of the ACT Alignment Loop (Q1), 2026-09-03. Outstanding ACCREC $285,998.84 across 11 invoices — net −$34,819 from Aug 20 (Oonchiumpa INV-0344 $41,250 PAID; 2 new small invoices). ALIVE INV-0341 ($66K) still outstanding at 63 days. Rotary INV-0222 now 511 days. BAS Q4 FY26 now 37 days past standard due date. funders.json unchanged at 25 entries. Joy House Productions appears for the first time.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-09-03
---

# Funder alignment — 2026-09-03

> Eighth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q1. Same four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). Last merged pass: [[funder-alignment-2026-08-20|2026-08-20]]. Baseline: [[funder-alignment-2026-04-24|2026-04-24]].

## Headline findings

1. **Oonchiumpa INV-0344 ($41,250) PAID — outstanding ACCREC falls to $285,998.84.** Net movement −$34,819 from Aug 20. Two new small invoices offset the clearance: Tandanya INV-0347 ($5,500, raised 2026-08-28) and Joy House Productions INV-0349 ($931, raised 2026-08-31). Invoice count moves from 10 to 11 (−1 paid, +2 new).

2. **ALIVE INV-0341 ($66,000) remains AUTHORISED at 63 days** — raised 2026-07-02 on the sole trader, post-cutover. Project_code still null. Entity treatment (sole trader vs Pty) remains unresolved and unvisible from DB.

3. **Rotary eClub INV-0222 ($82,500) is now 511 days unpaid** — 17 months. Remains the oldest open invoice in the book and the single largest decision deferred since the April 2026 baseline. Write-off window (before sole-trader tax return, due 31 October 2026) is now 58 days away.

4. **BAS Q4 FY26 (sole-trader) is now 37 days past the standard due date** (2026-07-28). Up from 23 days at Aug 20. No lodgement evidence visible in any data source. Standard Ledger (registered tax agent) may hold a concession date but it has not been confirmed in any pass.

5. **Five invoices carry null project_code** — INV-0289 (SIHF $21,780), INV-0332 (Tandanya $16,500), INV-0341 (ALIVE $66,000), INV-0347 (Tandanya $5,500), INV-0349 (Joy House $931). First appeared in prior passes; no tagging action visible.

6. **Joy House Productions appears for the first time** — INV-0349 ($931, 2026-08-31, 3 days old). Unknown counterparty; no wiki or GHL record visible. Needs project_code and counterparty identification.

7. **`wiki/narrative/funders.json` unchanged at 25 entries** (v2, last updated 2026-07-07). Six invoiced counterparties remain without stubs: Social Impact Hub Foundation, Tandanya, Brodie Germaine Fitness, Berry Obsession, Sonas Properties, Oonchiumpa Consultancy. Unchanged from Aug 20.

---

## At-a-glance — outstanding receivables, 2026-09-03

Legend: 🟢 paid/clear, 🟡 outstanding, 🔴 critical/overdue, 🆕 new this pass, 🔄 changed

| Funder / counterparty | Invoice | Amount | Date raised | Age | Priority | Change |
|---|---|---:|---|---:|---|---|
| **Rotary eClub Outback Australia** | INV-0222 | $82,500 | 2025-04-10 | **511d** | 🚨 write-off deadline approaching | → +14d |
| **Jenn Brazier** | INV-0228 | $3,887.84 | 2025-07-01 | **429d** | 🔴 >1 year | → +14d |
| **Social Impact Hub Foundation** | INV-0289 | $21,780 | 2025-11-18 | 289d | 🟡 chase | → +14d |
| **Regional Arts Australia** | INV-0302 | $16,500 | 2025-12-16 | 261d | 🟡 chase | → +14d |
| **Berry Obsession PTY LTD** | INV-0309 | $13,000 | 2026-02-10 | 205d | 🟡 chase | → +14d |
| **Sonas Properties Pty Ltd** | INV-0316 | $44,000 | 2026-02-16 | 199d | 🟡 Harvest-related | → +14d |
| **Brodie Germaine Fitness Aboriginal Corp** | INV-0325 | $15,400 | 2026-04-15 | 141d | 🟡 | → +14d |
| **Tandanya National Aboriginal Cultural Inst.** | INV-0332 | $16,500 | 2026-06-17 | 78d | 🟡 no project_code | → +14d |
| **ALIVE National Centre (UniMelb)** | INV-0341 | $66,000 | 2026-07-02 | 63d | ⚠️ post-cutover, entity unclear | → +14d |
| **Tandanya National Aboriginal Cultural Inst.** | INV-0347 | $5,500 | 2026-08-28 | **6d** | 🆕 new | 🆕 NEW |
| **Joy House Productions** | INV-0349 | $931 | 2026-08-31 | **3d** | 🆕 new counterparty | 🆕 NEW |
| **TOTAL OUTSTANDING ACCREC** | | **$285,998.84** | | | | **↓ −$34,819 from Aug 20** |
| — | — | — | — | — | — | — |
| Oonchiumpa Consultancy INV-0344 | — | $0 | 2026-08-12 | — | 🟢 CLEARED | 🔄 PAID this pass |

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| No funder outstanding >90 days without a written reason | ❌ — Rotary (511d), Jenn Brazier (429d), SIHF (289d), RAA (261d) all >90d with no visible resolution |
| All active invoices have a project_code | ❌ — 5 invoices with null project_code: INV-0289, INV-0332, INV-0341, INV-0347, INV-0349 |
| `funders.json` reflects all active receivable counterparties | ❌ — 6 invoiced counterparties without stubs (unchanged from Aug 20) + Joy House Productions (new, unknown) |
| BAS lodged (final sole-trader) | ❌ — 37 days past standard due date, no confirmation |

---

## Derived actions (priority order)

1. **Confirm BAS Q4 FY26 status with Standard Ledger** — lodged or concession deadline? 37 days past standard due. Sole-trader tax return (31 Oct 2026) is 58 days away.
2. **Resolve Rotary INV-0222 ($82,500, 511d)** — write off or continue chasing? Write-off must precede sole-trader tax return filing.
3. **Identify Joy House Productions** — new counterparty, INV-0349 $931, no project_code. Who are they and what code applies?
4. **Tag 5 invoices with project_code** — INV-0289 (SIHF), INV-0332 (Tandanya), INV-0341 (ALIVE), INV-0347 (Tandanya), INV-0349 (Joy House).
5. **Confirm ALIVE INV-0341 entity treatment** — $66K raised on sole trader post-cutover. Sole trader or Pty?
6. **Add 6 missing counterparties to `funders.json`** — Sonas, Tandanya, Berry Obsession, Brodie Germaine, SIHF, Oonchiumpa (now paid; stub still useful for history).

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `xero_invoices` | ACCREC AUTHORISED/DRAFT, amount_due > 0 | 2026-09-03 |
| `xero_invoices` | status/type summary (non-deleted/voided/paid) | 2026-09-03 |
| `wiki/narrative/funders.json` | entry count | 25 entries, v2 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-08-20|Q1 funder alignment — 2026-08-20 last pass]]
- [[funder-alignment-2026-04-24|Q1 funder alignment — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
