---
title: Funder alignment — post-cutover steady state, BAS window critical, receivables frozen
summary: Fourth pass of the ACT Alignment Loop (Q1), 2026-07-23. Outstanding ACCREC unchanged at $471,717.84 (14 invoices) — no movement in 7 days. Rotary INV-0222 now 469 days unpaid. MRFF-Palmer added to funders.json (25 entries). BAS due in 5 days.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-07-23
---

# Funder alignment — 2026-07-23

> Fourth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q1. Same four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). Last pass: [[funder-alignment-2026-07-16|2026-07-16]]. Baseline: [[funder-alignment-2026-04-24|2026-04-24]].

## Headline findings

1. **Outstanding ACCREC is exactly $471,717.84 — identical to 2026-07-16.** Same 14 invoices, same amounts. No receivable was collected, voided, or raised in the 7 days since the last pass. The book is frozen in place while the BAS approaches.

2. **Rotary eClub INV-0222 ($82,500) is now 469 days unpaid.** Every pass since 2026-04-24 has flagged this. The sole-trader Q4 FY26 BAS is due 28 July — **5 days from now**. If this invoice is to be written off as FY26 bad debt, that decision must be made before lodgement. This is no longer a strategic question; it is an accounting deadline.

3. **Three post-cutover sole-trader invoices ($189,200) remain on the books.** ALIVE National Centre INV-0341 ($66K) + INV-0342 ($101.2K) and Mounty Aboriginal Youth INV-0334 ($22K), all dated 2026-07-02 with no project_code tagged. These will appear in the Q4 FY26 BAS unless Standard Ledger and Ben agree on their treatment (Rule 2 invocation, reissue timeline, income period).

4. **`wiki/narrative/funders.json` now has 25 entries** (up from 24 at the 2026-07-07 update). The new entry is `mrff-uom-palmer`: MRFF grant GNT2051566 via University of Melbourne / ALIVE National Centre (Prof Victoria Palmer). The grant is awarded and Year 1 is active (Mar 2026 – Mar 2027). ACT is named in the grant text as a Partner AI for Tennant Creek and Palm Island. This is the grant behind the ALIVE invoices.

5. **Minderoo remains paused.** `funders.json` records: *"Lucy paused justice conversations 2026-05-14 — Minderoo internal restructure. Re-engage Q3 FY27 or on her signal."* No action available on ACT's side until then.

6. **Five invoiced counterparties still have no `funders.json` entry:** Social Impact Hub Foundation ($21,780), Tandanya National Aboriginal Cultural Institute ($16,500), Brodie Germaine Fitness ($15,400), Julalikari Council ($15,000), Berry Obsession PTY LTD ($13,000). These are billed clients, not funders in the philanthropic sense — but they hold outstanding receivables and deserve entries, even as data-only stubs.

---

## At-a-glance — funder status vs 2026-07-16 baseline

Legend: 🟢 paid/clear, 🟡 outstanding, 🔴 critical/overdue, ⚪ historical, ❔ wiki-only, 🆕 new, 🔄 changed, ⏸ paused

| Funder | DB status | Amount outstanding | `funders.json` stage | Change since 2026-07-16 |
|---|---|---:|---|---|
| **Rotary eClub Outback Australia** | 🔴 AUTH **469d** | **$82,500** | active-partner | 🔴 +7d, **BAS decision due in 5 days** |
| **ALIVE National Centre (UniMelb)** | 🟡 AUTH (post-cutover) | **$167,200** (×2 inv) | `mrff-uom-palmer` *warm* | 🆕 now in `funders.json` (MRFF entry) |
| **Homeland School Company** | 🟡 AUTH | **$44,000** (INV-0303, 2026-05-18) | *not listed* | → no change |
| **Sonas Properties Pty Ltd** | 🟡 AUTH ×2 | **$53,950** (INV-0316 $44K + INV-0337 $9.95K) | *not listed* | → no change |
| **Mounty Aboriginal Youth** | 🟡 AUTH (post-cutover) | **$22,000** | *not listed* | → no change |
| **Social Impact Hub Foundation** | 🟡 AUTH | **$21,780** (INV-0289, 2025-11-18) | active-partner | → no change |
| **Tandanya National Aboriginal Cultural Inst.** | 🟡 AUTH | **$16,500** (INV-0332, 2026-06-17) | *not listed* | → no change |
| **Regional Arts Australia** | 🟡 AUTH | **$16,500** (INV-0302, 2025-12-16) | *not listed* | → no change |
| **Brodie Germaine Fitness Aboriginal Corp** | 🟡 AUTH | **$15,400** (INV-0325, 2026-04-15) | *not listed* | → no change |
| **Julalikari Council Aboriginal Corp** | 🟡 AUTH | **$15,000** (INV-0335, 2026-06-19) | *not listed* | → no change |
| **Berry Obsession PTY LTD** | 🟡 AUTH | **$13,000** (INV-0309, 2026-02-10) | *not listed* | → no change |
| **Sonas Properties (second invoice)** | — | included above | — | — |
| **Jenn Brazier** | 🟡 AUTH | **$3,887.84** (INV-0228, 2025-07-01) | *not listed* | → no change |
| **TOTAL OUTSTANDING ACCREC** | | **$471,717.84** | | **→ unchanged** |
| — | — | — | — | — |
| **The Snow Foundation** | 🟢 PAID | $0 | active-partner | → cleared 2026-05-22 |
| **Centrecorp Foundation** | ⚪ VOIDED | $0 | active-partner | → VOIDED 2026-05-22 |
| **PICC (both invoices)** | ⚪ VOIDED | $0 | *not listed* | → VOIDED |
| **Minderoo Foundation** | ❔ PAUSED | — | paused | ⏸ unchanged |
| **QBE Catalysing Impact** | ❔ active | — | active-partner | → |
| **June Canavan Foundation** | ❔ unverified | — | active-partner (unverified) | → |

---

## Receivable ageing summary

| Invoice | Counterparty | Amount | Date raised | Age today | Priority |
|---|---|---:|---|---:|---|
| INV-0222 | Rotary eClub Outback Australia | $82,500 | 2025-04-10 | **469d** | 🚨 BAS write-off decision this week |
| INV-0228 | Jenn Brazier | $3,887.84 | 2025-07-01 | 388d | 🔴 oldest open |
| INV-0289 | Social Impact Hub Foundation | $21,780 | 2025-11-18 | 248d | 🟡 chase |
| INV-0302 | Regional Arts Australia | $16,500 | 2025-12-16 | 220d | 🟡 chase |
| INV-0309 | Berry Obsession PTY LTD | $13,000 | 2026-02-10 | 163d | 🟡 chase |
| INV-0316 | Sonas Properties Pty Ltd | $44,000 | 2026-02-16 | 157d | 🟡 Harvest lease-related |
| INV-0303 | Homeland School Company | $44,000 | 2026-05-18 | 66d | 🟡 |
| INV-0325 | Brodie Germaine Fitness | $15,400 | 2026-04-15 | 99d | 🟡 |
| INV-0335 | Julalikari Council | $15,000 | 2026-06-19 | 34d | ⬇️ recent |
| INV-0332 | Tandanya | $16,500 | 2026-06-17 | 36d | ⬇️ recent |
| INV-0337 | Sonas Properties (second) | $9,950 | 2026-06-25 | 28d | ⬇️ recent |
| INV-0334 | Mounty Aboriginal Youth | $22,000 | 2026-07-02 | 21d | ⚠️ post-cutover sole trader |
| INV-0341 | ALIVE National Centre | $66,000 | 2026-07-02 | 21d | ⚠️ post-cutover sole trader |
| INV-0342 | ALIVE National Centre | $101,200 | 2026-07-02 | 21d | ⚠️ post-cutover sole trader |

---

## MRFF-Palmer — the grant behind the ALIVE invoices

`funders.json` now records the MRFF GNT2051566 relationship properly. Key facts:
- **Grant awarded:** MRFF Mental Health and Climate Change initiative, 2026–2031 (5 years).
- **Year 1 scope:** Getting to Know You Year (Mar 2026 – Mar 2027).
- **ACT role:** Named partner AI for Tennant Creek (Julalikari) and Palm Island (PICC). ACT develops the interactive map (milestone Mar 2027 – Sep 2028).
- **Five-year ACT envelope target:** ~$450K–$750K AUD.
- **Invoices so far:** $167,200 across 2 invoices (ALIVE National Centre as pass-through), both dated 2026-07-02 with no project_code tagged.
- **Deadline note:** `funders.json` recorded a deadline of 2026-06-26 for the Palmer conversation. The relay tour through Tennant Creek preceded this. The Year 1 engagement is actively running.

**Priority action:** Tag INV-0341 and INV-0342 to a project code (likely ACT-EL or a new code for the MRFF partnership). Without a project_code, these invoices are invisible to project-based financial tracking.

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| Every funder with live outstanding amount named | ✅ 14 invoices enumerated |
| Every funder in active plans with no DB presence flagged | ✅ Minderoo (paused), QBE, June Canavan (unverified) |
| Every funder silent >90 days flagged | ✅ Rotary (469d, no GHL record since 2026-04-13) |

---

## Open actions — priority order

1. **Rotary INV-0222 write-off or chase — decide before 28 July BAS.** 469 days. Must be resolved in the next 5 days or the BAS cannot close cleanly. This is now a BAS obligation, not a funder relationship question.
2. **Tag the 3 untagged post-cutover invoices** (INV-0334, INV-0341, INV-0342) with project codes. All three are large ($189.2K combined) and will be BAS income.
3. **Brief Standard Ledger on the $189.2K post-cutover sole-trader income** — Rule 2 treatment, income period, and BAS impact. Must happen before lodgement.
4. **Add 5 missing counterparties to `funders.json`** as stubs: Social Impact Hub, Tandanya, Brodie Germaine Fitness, Julalikari, Berry Obsession.
5. **Clarify Centrecorp VOID** — $84.7K relationship real; no replacement Pty invoice visible. If the relationship continues, a Pty invoice is overdue.
6. **PICC voids ($96.8K combined)** — same question: reissue from Pty or written off?

---

## Sources queried

| Source | Query / file | Rows | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, AUTHORISED+DRAFT, amount_due > 0 | 14 rows | 2026-07-23 |
| `xero_invoices` | status+type GROUP BY | summary | 2026-07-23 |
| `wiki/narrative/funders.json` | full parse | v2, 25 funders, updated 2026-07-07 | file |
| `thoughts/shared/plans/**` | migration-keyword grep | 13 matching files | 2026-07-23 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-07-16|Q1 funder-alignment — 2026-07-16 last pass]]
- [[funder-alignment-2026-04-24|Q1 funder-alignment — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
