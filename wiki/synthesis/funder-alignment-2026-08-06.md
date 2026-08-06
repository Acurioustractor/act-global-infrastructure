---
title: Funder alignment — BAS 9 days overdue, receivables unchanged at $417K, Rotary enters 484th day
summary: Fifth pass of the ACT Alignment Loop (Q1), 2026-08-06. Outstanding ACCREC $417,767.84 across 12 invoices — identical to 2026-07-30. No movement in 7 days. BAS Q4 FY26 standard due date (2026-07-28) is 9 days past; lodgement status unknown. Rotary INV-0222 now 483 days unpaid. funders.json at 25 entries (unchanged).
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-08-06
---

# Funder alignment — 2026-08-06

> Fifth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q1. Same four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). Last merged pass: [[funder-alignment-2026-07-23|2026-07-23]]. Note: a 2026-07-30 pass exists on an unmerged branch (`alignment-loop-2026-07-30`). Baseline: [[funder-alignment-2026-04-24|2026-04-24]].

## Headline findings

1. **Outstanding ACCREC is $417,767.84 across 12 invoices — zero change from 2026-07-30.** The $53,950 cleared between July 23 and July 30 (Homeland School $44K + Sonas second invoice $9.95K) was the last movement. Nothing has moved in 7 days.

2. **BAS Q4 FY26 (sole-trader) standard due date 2026-07-28 is now 9 days past.** Standard Ledger is ACT's registered tax agent and may hold a lodgement concession beyond the standard date. No BAS-related Xero or DB artefact is visible to confirm lodgement occurred. This is the most pressing compliance unknown.

3. **Rotary eClub INV-0222 ($82,500) is now 483 days unpaid.** Every pass since the 2026-04-24 baseline has flagged this. The BAS decision window (write-off before lodgement) has nominally passed. If INV-0222 was written off as FY26 bad debt, it should now appear VOIDED in Xero — it remains AUTHORISED with full amount_due, meaning either: (a) it was not written off, or (b) it was written off in Xero but the DB sync hasn't reflected this.

4. **Three post-cutover sole-trader invoices ($189,200) remain untagged.** ALIVE National Centre INV-0341 ($66K) + INV-0342 ($101.2K) and Mounty Aboriginal Youth INV-0334 ($22K), all dated 2026-07-02, all with null `project_code`. Their BAS treatment (Rule 2) is tied to the lodgement status of the Q4 FY26 BAS.

5. **`wiki/narrative/funders.json` unchanged at 25 entries (v2, updated 2026-07-07).** Five invoiced counterparties remain without `funders.json` stubs: Social Impact Hub Foundation ($21,780), Tandanya National Aboriginal Cultural Institute ($16,500), Brodie Germaine Fitness ($15,400), Julalikari Council ($15,000), Berry Obsession PTY LTD ($13,000). Flagged since 2026-07-16 with no resolution.

6. **Minderoo remains paused.** `funders.json` records Lucy Stronach paused justice conversations 2026-05-14 (Minderoo internal restructure). Re-engage Q3 FY27 or on her signal.

---

## At-a-glance — funder status vs 2026-07-23 baseline

Legend: 🟢 paid/clear, 🟡 outstanding, 🔴 critical/overdue, ⚪ historical, ❔ wiki-only, 🆕 new, 🔄 changed, ⏸ paused

| Funder | DB status | Amount outstanding | `funders.json` stage | Change since 2026-07-23 |
|---|---|---:|---|---|
| **Rotary eClub Outback Australia** | 🔴 AUTH **483d** | **$82,500** | active-partner | 🔴 +14d; BAS write-off outcome unknown |
| **ALIVE National Centre (UniMelb)** | 🟡 AUTH (post-cutover) | **$167,200** (×2 inv) | `mrff-uom-palmer` *warm* | → no change |
| **Sonas Properties Pty Ltd** | 🟡 AUTH ×1 (INV-0316) | **$44,000** | *not listed* | → (INV-0337 cleared Jul 30) |
| **Mounty Aboriginal Youth** | 🟡 AUTH (post-cutover) | **$22,000** | *not listed* | → no change |
| **Social Impact Hub Foundation** | 🟡 AUTH | **$21,780** (INV-0289, 2025-11-18) | active-partner | → no change |
| **Tandanya National Aboriginal Cultural Inst.** | 🟡 AUTH | **$16,500** (INV-0332, 2026-06-17) | *not listed* | → no change |
| **Regional Arts Australia** | 🟡 AUTH | **$16,500** (INV-0302, 2025-12-16) | *not listed* | → no change |
| **Brodie Germaine Fitness Aboriginal Corp** | 🟡 AUTH | **$15,400** (INV-0325, 2026-04-15) | *not listed* | → no change |
| **Julalikari Council Aboriginal Corp** | 🟡 AUTH | **$15,000** (INV-0335, 2026-06-19) | *not listed* | → no change |
| **Berry Obsession PTY LTD** | 🟡 AUTH | **$13,000** (INV-0309, 2026-02-10) | *not listed* | → no change |
| **Jenn Brazier** | 🟡 AUTH | **$3,887.84** (INV-0228, 2025-07-01) | *not listed* | → no change |
| **Homeland School Company** | 🟢 PAID | $0 | *not listed* | → cleared 2026-07-30 |
| **Sonas Properties INV-0337** | 🟢 PAID | $0 | — | → cleared 2026-07-30 |
| **TOTAL OUTSTANDING ACCREC** | | **$417,767.84** | | **→ unchanged from 2026-07-30** |
| — | — | — | — | — |
| **The Snow Foundation** | 🟢 PAID | $0 | active-partner | → cleared 2026-05-22 |
| **Centrecorp Foundation** | ⚪ VOIDED | $0 | active-partner | → VOIDED 2026-05-22; no Pty replacement invoice visible |
| **PICC (both invoices)** | ⚪ VOIDED | $0 | *not listed* | → VOIDED |
| **Minderoo Foundation** | ❔ PAUSED | — | paused | ⏸ unchanged |
| **QBE Catalysing Impact** | ❔ active | — | active-partner | → |
| **June Canavan Foundation** | ❔ unverified | — | active-partner (unverified) | → |
| **MRFF-Palmer (via ALIVE/UniMelb)** | 🟡 AUTH | $167,200 (invoiced) | `mrff-uom-palmer` *warm* | → Year 1 engagement active |

---

## Receivable ageing summary

| Invoice | Counterparty | Amount | Date raised | Age today (2026-08-06) | Priority |
|---|---|---:|---|---:|---|
| INV-0222 | Rotary eClub Outback Australia | $82,500 | 2025-04-10 | **483d** | 🚨 BAS write-off outcome unknown |
| INV-0228 | Jenn Brazier | $3,887.84 | 2025-07-01 | **401d** | 🔴 oldest open, >1 year |
| INV-0289 | Social Impact Hub Foundation | $21,780 | 2025-11-18 | 262d | 🟡 chase |
| INV-0302 | Regional Arts Australia | $16,500 | 2025-12-16 | 234d | 🟡 chase |
| INV-0309 | Berry Obsession PTY LTD | $13,000 | 2026-02-10 | 177d | 🟡 chase |
| INV-0316 | Sonas Properties Pty Ltd | $44,000 | 2026-02-16 | 171d | 🟡 Harvest lease-related |
| INV-0325 | Brodie Germaine Fitness | $15,400 | 2026-04-15 | 113d | 🟡 |
| INV-0335 | Julalikari Council | $15,000 | 2026-06-19 | 48d | ⬇️ recent |
| INV-0332 | Tandanya | $16,500 | 2026-06-17 | 50d | ⬇️ recent |
| INV-0334 | Mounty Aboriginal Youth | $22,000 | 2026-07-02 | 35d | ⚠️ post-cutover sole trader |
| INV-0341 | ALIVE National Centre | $66,000 | 2026-07-02 | 35d | ⚠️ post-cutover sole trader |
| INV-0342 | ALIVE National Centre | $101,200 | 2026-07-02 | 35d | ⚠️ post-cutover sole trader |

---

## MRFF-Palmer — Year 1 underway

The `mrff-uom-palmer` entry in `funders.json` (added 2026-07-07) captures the MRFF GNT2051566 relationship via University of Melbourne / ALIVE National Centre (Prof Victoria Palmer). Year 1 of the grant (Getting to Know You Year, Mar 2026–Mar 2027) is active. The two ALIVE invoices ($167.2K) are the first grant income under this relationship. Both remain untagged by project_code — a persistent tracking gap.

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| Every funder with live outstanding amount named | ✅ 12 invoices enumerated |
| Every funder in active plans with no DB presence flagged | ✅ Minderoo (paused), QBE (active no Xero), June Canavan (unverified) |
| Every funder silent >90 days flagged | ✅ Rotary (483d, no recent GHL record) |

---

## Open actions — priority order

1. **Confirm BAS Q4 FY26 lodgement status with Standard Ledger.** 9 days past standard due date. If a concession applies, confirm the concession deadline. If lodged, confirm Rotary write-off treatment and $189.2K post-cutover invoice treatment under Rule 2.
2. **Rotary INV-0222 write-off or chase — confirm BAS outcome.** 483 days. If not included in the BAS write-off, a separate bad-debt decision is now overdue.
3. **Tag the 3 untagged post-cutover invoices** (INV-0334, INV-0341, INV-0342) — $189.2K untracked against project codes. Critical for project-level financial reporting.
4. **Add 5 missing counterparties to `funders.json`** as stubs: Social Impact Hub, Tandanya, Brodie Germaine Fitness, Julalikari, Berry Obsession.
5. **Clarify Centrecorp + PICC voids ($181.5K combined)** — were replacement Pty invoices raised? None visible in DB.
6. **Confirm Pty Xero file open** and $1 test invoice run executed (runbook exists; no DB evidence).

---

## Sources queried

| Source | Query / file | Rows | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, AUTHORISED+DRAFT, amount_due > 0 | 12 rows (AUTHORISED) + 1 DRAFT ($0) | 2026-08-06 |
| `xero_invoices` | status+type GROUP BY | summary | 2026-08-06 |
| `wiki/narrative/funders.json` | full parse | v2, 25 funders, updated 2026-07-07 | file |
| `thoughts/shared/plans/**` | migration-keyword grep | 8 matching files | 2026-08-06 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-07-23|Q1 funder-alignment — 2026-07-23 last merged pass]]
- [[funder-alignment-2026-04-24|Q1 funder-alignment — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
