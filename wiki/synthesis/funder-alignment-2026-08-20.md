---
title: Funder alignment — ALIVE $101K cleared, outstanding at $320K (lowest since baseline)
summary: Seventh pass of the ACT Alignment Loop (Q1), 2026-08-20. Outstanding ACCREC $320,817.84 across 10 invoices — net −$101,200 from Aug 13 (ALIVE INV-0342 $101,200 PAID). ALIVE INV-0341 ($66K) still outstanding. Rotary INV-0222 at 497 days. BAS Q4 FY26 now 23 days past standard due date. funders.json unchanged at 25 entries.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-08-20
---

# Funder alignment — 2026-08-20

> Seventh pass of the [[act-alignment-loop|ACT Alignment Loop]], Q1. Same four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). Last merged pass: [[funder-alignment-2026-08-13|2026-08-13]]. Baseline: [[funder-alignment-2026-04-24|2026-04-24]].

## Headline findings

1. **ALIVE INV-0342 ($101,200) PAID — outstanding ACCREC falls to $320,817.84, the lowest level since the April baseline.** Net movement: −$101,200 from Aug 13. INV-0342 (University of Melbourne / ALIVE National Centre, $101,200, raised 2026-07-02) has cleared. Its partner invoice INV-0341 ($66,000, same counterparty) remains AUTHORISED and outstanding at 49 days.

2. **Rotary eClub INV-0222 ($82,500) is now 497 days unpaid** — 16 months since it was raised (2025-04-10). Invoice remains AUTHORISED with full amount_due. No write-off or void visible. BAS Q4 FY26 is now 23 days past the standard due date, making the treatment of this invoice increasingly urgent.

3. **BAS Q4 FY26 (sole-trader) is 23 days past the standard due date** (2026-07-28). Standard Ledger (registered tax agent) may hold a concession date. No lodgement artefact visible in Supabase. This is the most pressing compliance unknown in the loop — confirm lodgement or concession deadline immediately.

4. **Oonchiumpa INV-0344 ($41,250, raised 2026-08-12) remains untagged** — now 8 days old with no project_code. Likely ACT-OO but needs confirmation. First raised in the Aug 13 pass; no action visible.

5. **`wiki/narrative/funders.json` unchanged at 25 entries** (v2, last updated 2026-07-07). Six invoiced counterparties remain without stubs: Social Impact Hub Foundation ($21,780), Tandanya ($16,500), Brodie Germaine Fitness ($15,400), Berry Obsession ($13,000), Sonas Properties ($44,000), Oonchiumpa Consultancy ($41,250). None of these were added since the July 7 update.

6. **GHL communications data is sparse** — only one funder-tagged contact (Georgina Byron) has a `last_contact_date` in the DB (2026-04-08, now 134 days silent). This is a data quality issue rather than a signal of actual comms drought; most funder contacts likely have incomplete GHL records.

---

## At-a-glance — outstanding receivables, 2026-08-20

Legend: 🟢 paid/clear, 🟡 outstanding, 🔴 critical/overdue, 🆕 new this pass, 🔄 changed

| Funder / counterparty | Invoice | Amount | Date raised | Age | Priority | Change |
|---|---|---:|---|---:|---|---|
| **Rotary eClub Outback Australia** | INV-0222 | $82,500 | 2025-04-10 | **497d** | 🚨 write-off or chase | → +7d |
| **Jenn Brazier** | INV-0228 | $3,887.84 | 2025-07-01 | **415d** | 🔴 >1 year | → +7d |
| **Social Impact Hub Foundation** | INV-0289 | $21,780 | 2025-11-18 | 275d | 🟡 chase | → +7d |
| **Regional Arts Australia** | INV-0302 | $16,500 | 2025-12-16 | 247d | 🟡 chase | → +7d |
| **Berry Obsession PTY LTD** | INV-0309 | $13,000 | 2026-02-10 | 191d | 🟡 chase | → +7d |
| **Sonas Properties Pty Ltd** | INV-0316 | $44,000 | 2026-02-16 | 185d | 🟡 Harvest-related | → +7d |
| **Brodie Germaine Fitness Aboriginal Corp** | INV-0325 | $15,400 | 2026-04-15 | 127d | 🟡 | → +7d |
| **Tandanya National Aboriginal Cultural Inst.** | INV-0332 | $16,500 | 2026-06-17 | 64d | ⬇️ recent | → +7d |
| **ALIVE National Centre (UniMelb)** | INV-0341 | $66,000 | 2026-07-02 | 49d | ⚠️ post-cutover sole trader | → +7d |
| **Oonchiumpa Consultancy and Services** | INV-0344 | $41,250 | 2026-08-12 | 8d | ⚠️ no project_code | → +7d |
| **TOTAL OUTSTANDING ACCREC** | | **$320,817.84** | | | | **↓ −$101,200 from Aug 13** |
| — | — | — | — | — | — | — |
| ALIVE National Centre (INV-0342) | — | $0 | 2026-07-02 | — | 🟢 CLEARED | 🔄 PAID this pass |

---

## MRFF-Palmer — partial clearance

ALIVE National Centre INV-0342 ($101,200) has been PAID since Aug 13. INV-0341 ($66,000) remains outstanding. Together these represent Year 1 of the MRFF GNT2051566 relationship (via University of Melbourne / Prof Victoria Palmer). Both remained untagged by project_code throughout — a persistent tracking gap. Total paid from this relationship to date: $101,200 of $167,200.

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| No funder outstanding >90 days without a written reason | ❌ — Rotary (497d), Jenn Brazier (415d), SIHF (275d), RAA (247d) all >90d with no visible reason |
| All active invoices have a project_code | ❌ — INV-0289, INV-0332, INV-0341, INV-0344 have null project_code |
| `funders.json` reflects all active receivable counterparties | ❌ — 6 invoiced counterparties without stubs |
| BAS lodged (final sole-trader) | ❌ — 23 days past standard due date, no confirmation |

---

## Derived actions (priority order)

1. **Confirm BAS Q4 FY26 status with Standard Ledger** — lodged or concession date? 23 days past standard due.
2. **Resolve Rotary INV-0222 ($82,500, 497d)** — write off before R&D/tax filing or continue chasing? Decision needed before BAS closes.
3. **Tag INV-0344 Oonchiumpa ($41,250) with project_code** — likely ACT-OO.
4. **Tag INV-0341 ALIVE ($66,000) with project_code** — untagged since 2026-07-02.
5. **Add 6 missing counterparties to `funders.json`** — Sonas, Tandanya, Berry Obsession, Brodie Germaine, SIHF, Oonchiumpa.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `xero_invoices` | ACCREC AUTHORISED/DRAFT, amount_due > 0 | 2026-08-20 |
| `xero_invoices` | status/type summary (non-deleted/voided/paid) | 2026-08-20 |
| `ghl_contacts` | tags ∋ 'funder', last_contact_date | 2026-08-20 |
| `wiki/narrative/funders.json` | entry count | 25 entries, v2 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-08-13|Q1 funder alignment — 2026-08-13 last pass]]
- [[funder-alignment-2026-04-24|Q1 funder alignment — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
