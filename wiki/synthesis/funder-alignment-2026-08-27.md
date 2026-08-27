---
title: Funder alignment — Oonchiumpa cleared, Tanya Turner new, outstanding at $286K
summary: Eighth pass of the ACT Alignment Loop (Q1), 2026-08-27. Outstanding ACCREC $286,520.84 across 10 invoices — net −$34,297 from Aug 20 (Oonchiumpa INV-0344 $41,250 PAID; new INV-0345 Tanya Turner $6,953 raised Aug 22). Rotary INV-0222 at 504 days. BAS Q4 FY26 now 30 days past standard due date. funders.json unchanged at 25 entries.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-08-27
---

# Funder alignment — 2026-08-27

> Eighth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q1. Same four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). Last merged pass: [[funder-alignment-2026-08-20|2026-08-20]]. Baseline: [[funder-alignment-2026-04-24|2026-04-24]].

## Headline findings

1. **Oonchiumpa INV-0344 ($41,250) PAID — outstanding ACCREC falls to $286,520.84, the lowest level in the alignment loop.** Net movement: −$34,297 from Aug 20 after Oonchiumpa cleared and a new invoice was raised. Outstanding now sits below $300K for the first time since the April baseline.

2. **New invoice INV-0345 (Tanya Turner, $6,953, raised 2026-08-22) — 5 days old, no project_code.** Tanya Turner is Oonchiumpa's Co-Director (Eastern Arrernte; former Supreme Court associate — per `wiki/projects/oonchiumpa.md:32`). This invoice is likely ACT-OO. No `funders.json` stub for her individually; the Oonchiumpa relationship stub should cover it. Project_code needs tagging.

3. **Rotary eClub INV-0222 ($82,500) is now 504 days unpaid** — over 16.5 months since it was raised (2025-04-10). Invoice remains AUTHORISED with full amount_due. The sole-trader tax return is due 31 October 2026 — 65 days away. Write-off or formal chase decision cannot be deferred much longer without affecting the FY26 tax return.

4. **BAS Q4 FY26 (sole-trader) is now 30 days past the standard due date** (2026-07-28). No lodgement evidence visible in Supabase. Standard Ledger (registered tax agent) may hold a concession deadline — but each passing week without confirmation increases compliance exposure.

5. **`wiki/narrative/funders.json` unchanged at 25 entries** (v2, last updated 2026-07-07). Five invoiced counterparties remain without stubs: Social Impact Hub Foundation ($21,780), Tandanya ($16,500), Brodie Germaine Fitness ($15,400), Berry Obsession ($13,000), Sonas Properties ($44,000). Tanya Turner (new, $6,953) is a sixth missing entry.

6. **GHL communications data remains sparse** — type mismatch on join query (same error as prior passes). Only Georgina Byron has a confirmed `last_contact_date` (2026-04-08, now 141 days silent). This is a data quality issue rather than a true comms signal.

---

## At-a-glance — outstanding receivables, 2026-08-27

Legend: 🟢 paid/clear, 🟡 outstanding, 🔴 critical/overdue, 🆕 new this pass, 🔄 changed

| Funder / counterparty | Invoice | Amount | Date raised | Age | Priority | Change |
|---|---|---:|---|---:|---|---|
| **Rotary eClub Outback Australia** | INV-0222 | $82,500 | 2025-04-10 | **504d** | 🚨 write-off or chase — FY26 tax return 65d away | → +7d |
| **Jenn Brazier** | INV-0228 | $3,887.84 | 2025-07-01 | **422d** | 🔴 >1 year | → +7d |
| **Social Impact Hub Foundation** | INV-0289 | $21,780 | 2025-11-18 | 282d | 🟡 chase | → +7d |
| **Regional Arts Australia** | INV-0302 | $16,500 | 2025-12-16 | 254d | 🟡 chase | → +7d |
| **Berry Obsession PTY LTD** | INV-0309 | $13,000 | 2026-02-10 | 198d | 🟡 chase | → +7d |
| **Sonas Properties Pty Ltd** | INV-0316 | $44,000 | 2026-02-16 | 192d | 🟡 Harvest-related | → +7d |
| **Brodie Germaine Fitness Aboriginal Corp** | INV-0325 | $15,400 | 2026-04-15 | 134d | 🟡 | → +7d |
| **Tandanya National Aboriginal Cultural Inst.** | INV-0332 | $16,500 | 2026-06-17 | 71d | ⬇️ recent | → +7d |
| **ALIVE National Centre (UniMelb)** | INV-0341 | $66,000 | 2026-07-02 | 56d | ⚠️ post-cutover, untagged | → +7d |
| **Tanya Turner** | INV-0345 | $6,953 | 2026-08-22 | 5d | 🆕 new, no project_code | 🆕 NEW |
| **TOTAL OUTSTANDING ACCREC** | | **$286,520.84** | | | | **↓ −$34,297 from Aug 20** |
| — | — | — | — | — | — | — |
| Oonchiumpa Consultancy and Services (INV-0344) | — | $0 | 2026-08-12 | — | 🟢 CLEARED | 🔄 PAID this pass |

---

## MRFF-Palmer — post-cutover status

ALIVE National Centre INV-0341 ($66,000) remains outstanding and untagged at 56 days. INV-0342 ($101,200) cleared in the previous pass. Total paid from the MRFF GNT2051566 relationship: $101,200 of $167,200. Whether INV-0341 should be transferred to the Pty entity (post-cutover) remains unresolved.

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| No funder outstanding >90 days without a written reason | ❌ — Rotary (504d), Jenn Brazier (422d), SIHF (282d), RAA (254d) all >90d with no visible reason |
| All active invoices have a project_code | ❌ — INV-0289, INV-0332, INV-0341, INV-0345 have null project_code |
| `funders.json` reflects all active receivable counterparties | ❌ — 6 invoiced counterparties without stubs (Sonas, Tandanya, Berry Obsession, Brodie Germaine, SIHF, Tanya Turner) |
| BAS lodged (final sole-trader) | ❌ — 30 days past standard due date, no confirmation |

---

## Derived actions (priority order)

1. **Confirm BAS Q4 FY26 status with Standard Ledger** — 30 days past standard due date. What is the concession deadline?
2. **Resolve Rotary INV-0222 ($82,500, 504d)** — must resolve before FY26 sole-trader tax return (65 days). Write off or chase?
3. **Tag INV-0345 Tanya Turner ($6,953) with project_code ACT-OO** — she is Oonchiumpa's Co-Director; invoice is almost certainly Oonchiumpa-related.
4. **Tag INV-0341 ALIVE ($66,000) with project_code** — untagged since 2026-07-02.
5. **Add missing counterparties to `funders.json`** — Sonas, Tandanya, Berry Obsession, Brodie Germaine, SIHF; check whether an Oonchiumpa stub covers Tanya Turner.
6. **Confirm Oonchiumpa INV-0344 payment** — was it tagged before payment? INV-0344 was flagged untagged in Aug 20 pass.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `xero_invoices` | ACCREC AUTHORISED/DRAFT, amount_due > 0 | 2026-08-27 |
| `xero_invoices` | status/type summary (non-deleted/voided/paid) | 2026-08-27 |
| `ghl_contacts` | tags ∋ 'funder', last_contact_date | 2026-08-27 (query type error — same as prior passes) |
| `wiki/narrative/funders.json` | entry count | 25 entries, v2 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-08-20|Q1 funder alignment — 2026-08-20 last pass]]
- [[funder-alignment-2026-04-24|Q1 funder alignment — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
