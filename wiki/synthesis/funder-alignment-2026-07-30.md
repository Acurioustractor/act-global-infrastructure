---
title: Funder alignment — $53,950 cleared, BAS now 2 days overdue, Rotary enters 5th year unpaid
summary: Fifth pass of the ACT Alignment Loop (Q1), 2026-07-30. Two invoices paid since last pass — Homeland School ($44K) and Sonas second invoice ($9.95K). Outstanding ACCREC now $417,767.84 across 12 invoices. BAS Q4 FY26 was due 2026-07-28 — now 2 days past due. Rotary INV-0222 at 476 days.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-07-30
---

# Funder alignment — 2026-07-30

> Fifth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q1. Same four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). Last pass: [[funder-alignment-2026-07-23|2026-07-23]]. Baseline: [[funder-alignment-2026-04-24|2026-04-24]].

## Headline findings

1. **$53,950 cleared since the 2026-07-23 pass — the first receivable movement in two weeks.** Two invoices reached PAID status: INV-0303 Homeland School Company ($44,000) and INV-0337 Sonas Properties second invoice ($9,950). Outstanding ACCREC drops to $417,767.84 across 12 invoices.

2. **BAS Q4 FY26 (sole-trader) was due 2026-07-28 and is now 2 days overdue.** The last pass flagged this deadline as 5 days away and urgent. There is no DB-visible evidence of lodgement. Standard Ledger lodgement status is unknown from Supabase alone. If not yet lodged, this is an active compliance risk.

3. **Rotary eClub INV-0222 ($82,500) is now 476 days unpaid.** Every pass since 2026-04-24 has flagged this. The write-off decision should have been made before the BAS deadline. The outcome of that decision is not visible in the DB — INV-0222 remains AUTHORISED with full amount_due.

4. **Three post-cutover sole-trader invoices ($189,200) remain untagged and on the sole-trader books.** ALIVE National Centre INV-0341 ($66K) + INV-0342 ($101.2K) and Mounty Aboriginal Youth INV-0334 ($22K), all dated 2026-07-02, all with null `project_code`. Their BAS treatment under Rule 2 should now be resolved as part of lodgement.

5. **`wiki/narrative/funders.json` unchanged at 25 entries (v2, updated 2026-07-07).** No new funders added this week.

6. **Five invoiced counterparties without `funders.json` stubs persist.** Social Impact Hub Foundation ($21,780), Tandanya National Aboriginal Cultural Institute ($16,500), Brodie Germaine Fitness ($15,400), Julalikari Council ($15,000), Berry Obsession PTY LTD ($13,000). Flagged since 2026-07-16 with no resolution.

---

## At-a-glance — funder status vs 2026-07-23 baseline

Legend: 🟢 paid/clear, 🟡 outstanding, 🔴 critical/overdue, ⚪ historical, ❔ wiki-only, 🆕 new, 🔄 changed, ⏸ paused

| Funder | DB status | Amount outstanding | `funders.json` stage | Change since 2026-07-23 |
|---|---|---:|---|---|
| **Rotary eClub Outback Australia** | 🔴 AUTH **476d** | **$82,500** | active-partner | 🔴 +7d, BAS write-off outcome unknown |
| **ALIVE National Centre (UniMelb)** | 🟡 AUTH (post-cutover) | **$167,200** (×2 inv) | `mrff-uom-palmer` *warm* | → no change |
| **Sonas Properties Pty Ltd** | 🟡 AUTH ×1 (INV-0316) | **$44,000** | *not listed* | 🔄 INV-0337 ($9,950) **PAID** ✅ |
| **Mounty Aboriginal Youth** | 🟡 AUTH (post-cutover) | **$22,000** | *not listed* | → no change |
| **Social Impact Hub Foundation** | 🟡 AUTH | **$21,780** (INV-0289, 2025-11-18) | active-partner | → no change |
| **Tandanya National Aboriginal Cultural Inst.** | 🟡 AUTH | **$16,500** (INV-0332, 2026-06-17) | *not listed* | → no change |
| **Regional Arts Australia** | 🟡 AUTH | **$16,500** (INV-0302, 2025-12-16) | *not listed* | → no change |
| **Brodie Germaine Fitness Aboriginal Corp** | 🟡 AUTH | **$15,400** (INV-0325, 2026-04-15) | *not listed* | → no change |
| **Julalikari Council Aboriginal Corp** | 🟡 AUTH | **$15,000** (INV-0335, 2026-06-19) | *not listed* | → no change |
| **Berry Obsession PTY LTD** | 🟡 AUTH | **$13,000** (INV-0309, 2026-02-10) | *not listed* | → no change |
| **Jenn Brazier** | 🟡 AUTH | **$3,887.84** (INV-0228, 2025-07-01) | *not listed* | → no change |
| **Homeland School Company** | 🟢 PAID | $0 | *not listed* | 🆕 **PAID** ✅ (was $44,000 AUTHORISED) |
| **Sonas INV-0337** | 🟢 PAID | $0 | — | 🆕 **PAID** ✅ (was $9,950 AUTHORISED) |
| **TOTAL OUTSTANDING ACCREC** | | **$417,767.84** | | **↓ −$53,950 from 2026-07-23** |
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
| INV-0222 | Rotary eClub Outback Australia | $82,500 | 2025-04-10 | **476d** | 🚨 Write-off decision/BAS outcome pending |
| INV-0228 | Jenn Brazier | $3,887.84 | 2025-07-01 | **395d** | 🔴 oldest open |
| INV-0289 | Social Impact Hub Foundation | $21,780 | 2025-11-18 | 255d | 🟡 chase |
| INV-0302 | Regional Arts Australia | $16,500 | 2025-12-16 | 227d | 🟡 chase |
| INV-0309 | Berry Obsession PTY LTD | $13,000 | 2026-02-10 | 170d | 🟡 chase |
| INV-0316 | Sonas Properties Pty Ltd | $44,000 | 2026-02-16 | 164d | 🟡 Harvest lease-related |
| INV-0325 | Brodie Germaine Fitness | $15,400 | 2026-04-15 | 106d | 🟡 |
| INV-0303 | Homeland School Company | $44,000 | 2026-05-18 | — | ✅ **PAID** |
| INV-0335 | Julalikari Council | $15,000 | 2026-06-19 | 41d | ⬇️ recent |
| INV-0332 | Tandanya | $16,500 | 2026-06-17 | 43d | ⬇️ recent |
| INV-0337 | Sonas Properties (second) | $9,950 | 2026-06-25 | — | ✅ **PAID** |
| INV-0334 | Mounty Aboriginal Youth | $22,000 | 2026-07-02 | 28d | ⚠️ post-cutover sole trader |
| INV-0341 | ALIVE National Centre | $66,000 | 2026-07-02 | 28d | ⚠️ post-cutover sole trader |
| INV-0342 | ALIVE National Centre | $101,200 | 2026-07-02 | 28d | ⚠️ post-cutover sole trader |

---

## BAS deadline — status unknown

The Q4 FY26 sole-trader BAS was due 2026-07-28. As of 2026-07-30:
- No lodgement artefact is visible in Supabase.
- Rotary INV-0222 remains AUTHORISED at full $82,500 — if written off as bad debt for BAS purposes, this should appear as a VOIDED or modified status in Xero. It has not.
- The three post-cutover invoices ($189,200) still have null project_code and remain on the sole-trader Xero file. Their Rule 2 treatment and income-period classification for BAS purposes is unresolved in the data.

**Action required:** Confirm with Standard Ledger whether BAS has been lodged. If not, it is overdue.

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| Every funder with live outstanding amount named | ✅ 12 invoices enumerated |
| Every funder in active plans with no DB presence flagged | ✅ Minderoo (paused), QBE, June Canavan (unverified) |
| Every funder silent >90 days flagged | ✅ Rotary (476d), Jenn Brazier (395d) |

---

## Open actions — priority order

1. **Confirm BAS Q4 FY26 lodgement status** — due 2026-07-28, now 2 days past due. If not lodged, act immediately.
2. **Rotary INV-0222 write-off outcome** — 476 days. BAS write-off decision should be resolved. Confirm with Standard Ledger what was done.
3. **Tag the 3 untagged post-cutover invoices** (INV-0334, INV-0341, INV-0342) with project codes — $189,200 untracked.
4. **Add 5 missing counterparties to `funders.json`** as stubs: Social Impact Hub, Tandanya, Brodie Germaine Fitness, Julalikari, Berry Obsession.
5. **Clarify Centrecorp VOID** — $84.7K relationship real; no replacement Pty invoice visible.

---

## Sources queried

| Source | Query / file | Rows | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, AUTHORISED+DRAFT, amount_due > 0 | 12 rows | 2026-07-30 |
| `xero_invoices` | status+type GROUP BY | summary | 2026-07-30 |
| `xero_invoices` | INV-0303, INV-0337 individual lookup | 2 rows | 2026-07-30 |
| `wiki/narrative/funders.json` | full parse | v2, 25 funders, updated 2026-07-07 | file |
| `thoughts/shared/plans/**` | migration-keyword grep | 9+ matching files | 2026-07-30 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-07-23|Q1 funder-alignment — 2026-07-23 last pass]]
- [[funder-alignment-2026-04-24|Q1 funder-alignment — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
