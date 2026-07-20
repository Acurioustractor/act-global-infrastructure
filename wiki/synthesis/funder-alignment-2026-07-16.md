---
title: Funder alignment — post-cutover, sole trader still trading, new $189K on books
summary: Third pass of the ACT Alignment Loop (Q1), 2026-07-16. $132K Snow Foundation payment cleared. Centrecorp voided. Post-cutover invoices of $189.2K raised on sole trader (Rule 2). Minderoo paused. Rotary 462 days unpaid. Five new Xero contacts surface.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-07-16
---

# Funder alignment — 2026-07-16

> Third pass of the [[act-alignment-loop|ACT Alignment Loop]], Q1. Same four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). Last pass: [[funder-alignment-2026-05-14|2026-05-14]]. Baseline: [[funder-alignment-2026-04-24|2026-04-24]].

## Headline findings

1. **Snow Foundation INV-0321 ($132,000) PAID on 2026-05-22.** The relationship held through the cutover. This is the largest single receivable clearance since the alignment loop started.

2. **Centrecorp INV-0314 ($84,700 DRAFT) VOIDED on 2026-05-22.** The 90-day DRAFT stalemate ended — the invoice was voided rather than sent. The $84.7K will not arrive in the sole trader. Whether a replacement invoice will be raised from the Pty under the new entity is unrecorded in DB.

3. **Both PICC invoices VOIDED.** INV-0317 ($19,800 at time of last pass) and INV-0324 ($77,000) both show VOIDED. Together $96,800 cleared from the outstanding book without payment. No replacement Pty invoices are visible.

4. **Three invoices dated 2026-07-02 raised on the sole trader — $189,200 in total.** Mounty Aboriginal Youth & Community Services Ltd ($22,000), ALIVE National Centre for Mental Health Research Translation ($66,000), and a second ALIVE invoice ($101,200). These are post-cutover. Cutover Rule 2 in `2026-06-01-cutover-30-day-critical-path.md` allows sole-trader trading to continue if the Pty operational stack is not yet invoice-ready. This is the most likely explanation, but the situation needs explicit confirmation from Ben.

5. **Minderoo moved from "ask-pending" to "paused".** `wiki/narrative/funders.json` (updated 2026-07-07) records: *"Lucy paused justice conversations 2026-05-14 — Minderoo internal restructure. Re-engage Q3 FY27 or on her signal."* The $2.9M ask timeline is suspended.

6. **Rotary eClub INV-0222 ($82,500) is now 462 days old.** No action since the 2026-04-24 baseline flagged this. Every subsequent synthesis has carried the same alert. This is approaching the point where it must be written off as bad debt before the sole-trader BAS finalises.

7. **Five new counterparties** have invoices in Xero with no `funders.json` entry: ALIVE National Centre, Julalikari Council Aboriginal Corporation, Tandanya National Aboriginal Cultural Institute, Berry Obsession PTY LTD (Harvest-related), and Jenn Brazier (ACT-GP). Total outstanding from these new contacts: $220,587.84.

---

## At-a-glance — every funder, every source

Legend: 🟢 paid/clear, 🟡 outstanding, 🔴 critical/overdue, ⚪ historical, ❔ wiki-only, 🆕 new, 🔄 changed, ⏸ paused

| Funder | DB status | Amount outstanding | `funders.json` stage | Change since 2026-05-14 |
|---|---|---:|---|---|
| **Rotary eClub Outback Australia** | 🔴 AUTH 462d | **$82,500** | ask-pending | 🔴 +63d, still no action |
| **ALIVE National Centre (UniMelb)** | 🆕 AUTH | **$167,200** (×2 inv) | *not listed* | 🆕 post-cutover on sole trader |
| **Homeland School Company** | 🆕 AUTH | **$44,000** | *not listed* | 🆕 large new invoice (prev $4,950 paid) |
| **Sonas Properties Pty Ltd** | 🔄 AUTH | **$53,950** (INV-0316 $44K + INV-0337 $10K) | *not listed* | 🔄 INV-0328 cleared; two new |
| **Mounty Aboriginal Youth** | 🆕 AUTH | **$22,000** | *not listed* | 🆕 post-cutover on sole trader |
| **Social Impact Hub Foundation** | 🟡 AUTH | **$21,780** | active-partner | 🔄 new ACCREC invoice |
| **Brodie Germaine Fitness** | 🟡 AUTH | **$15,400** | *not listed* | → no change |
| **Julalikari Council** | 🆕 AUTH | **$15,000** | *not listed* | 🆕 new invoice ACT-GD |
| **Regional Arts Australia** | 🟡 AUTH | **$16,500** | *not listed* | 🔄 one inv cleared (was $33K) |
| **Tandanya National Aboriginal Cultural Inst.** | 🆕 AUTH | **$16,500** | *not listed* | 🆕 new invoice |
| **Berry Obsession PTY LTD** | 🆕 AUTH | **$13,000** | *not listed* | 🆕 new ACT-HV |
| **Jenn Brazier** | 🆕 AUTH | **$3,887.84** | *not listed* | 🆕 ACT-GP inv from 2025-07-01 |
| **The Snow Foundation** | 🟢 PAID | **$0** (was $132,000) | active-partner | 🟢 PAID 2026-05-22 |
| **Centrecorp Foundation** | ⚪ VOIDED | **$0** (was $84,700 DRAFT) | active-partner | 🔄 VOIDED 2026-05-22 |
| **PICC (Palm Island Community Company)** | ⚪ VOIDED | **$0** (was $96,800) | *not listed* | 🔄 both invoices VOIDED |
| **Minderoo Foundation** | ❔ PAUSED | — | **paused** | ⏸ Lucy internal restructure |
| **QBE Catalysing Impact** | ❔ active | — | active-partner | → no change |
| **Dusseldorp Forum** | 🟢 historical | $0 | active-partner | → |
| **Paul Ramsay Foundation** | 🟢 historical | $0 | warm | → |
| **June Canavan Foundation** | ❔ unverified | — | active-partner (unverified) | → |
| Others (historical / wiki-only stubs) | ⚪ | — | various | → unchanged |

**Total outstanding ACCREC: $471,717.84** (14 invoices)

---

## Post-cutover sole-trader activity — Rule 2 flag

Three invoices dated 2026-07-02 have been raised on the sole trader (ABN 21 591 780 066):

| Invoice | Counterparty | Amount | Project | Note |
|---|---|---:|---|---|
| INV-0334 | Mounty Aboriginal Youth & Community Services Ltd | $22,000 | *untagged* | post-cutover |
| INV-0341 | ALIVE National Centre (UniMelb) | $66,000 | *untagged* | post-cutover |
| INV-0342 | ALIVE National Centre (UniMelb) | $101,200 | *untagged* | post-cutover |
| **TOTAL** | | **$189,200** | | |

Per `2026-06-01-cutover-30-day-critical-path.md` Cutover Rule 2: *"if the Pty isn't genuinely invoice-ready by 1 July, the sole trader keeps trading until it is."* This is the most likely explanation. **Ben needs to confirm explicitly:** (a) Rule 2 is intentionally invoked; (b) the $189.2K will be reissued from the Pty once the stack is ready; (c) the sole-trader close-out BAS treatment is agreed with Standard Ledger.

All three invoices lack `project_code` tags — a data quality issue regardless of entity.

---

## Receivables that cleared since 2026-05-14

| Counterparty | Invoice | Amount | Disposition |
|---|---|---:|---|
| The Snow Foundation | INV-0321 | $132,000 | **PAID** 2026-05-22 |
| Centrecorp Foundation | INV-0314 | $84,700 | **VOIDED** 2026-05-22 |
| PICC | INV-0317 | ~$19,800 | **VOIDED** |
| PICC | INV-0324 | $77,000 | **VOIDED** |
| Aleisha J Keating (×27) | INV-0238–0307 | ~$12,150 | Cleared (retainer ended or wrapped) |
| SMART Recovery | INV-0322 | $2,200 | Cleared |
| John Villiers Trust | INV-0327 | $1,200 | Cleared |
| Regional Arts Australia (one inv) | INV-0301 | ~$16,500 | Cleared |
| **Total cleared** | | **~$345,550** | (offset by ~$320K new invoices) |

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| Every funder with live outstanding amount named | ✅ 14 invoices enumerated above |
| Every funder in active plans with no DB presence flagged | ✅ Minderoo (paused), QBE (no invoice yet), June Canavan (unverified) |
| Every funder silent >90 days flagged | ✅ Rotary (462d, no GHL record), Georgina Byron (99d, GHL only) |

---

## Open actions — priority order

1. **Confirm Rule 2 invocation with Ben** — are the $189.2K post-cutover invoices intentional? Will they be reissued from Pty once the stack passes the $1 test invoice runbook?
2. **Decide Rotary INV-0222** — 462 days unpaid. Chase or write off as FY26 bad debt before the sole-trader BAS lodges (due 28 July). This is now an urgent FY26 close-out item.
3. **Add 5 new counterparties to `funders.json`** — ALIVE (UniMelb), Julalikari, Tandanya, Berry Obsession, Homeland School. All have invoices, none have a wiki entry.
4. **Tag the 3 untagged post-cutover invoices** (INV-0334, INV-0341, INV-0342) with project codes.
5. **Clarify Centrecorp VOID** — the $84.7K relationship was real. Will a Pty invoice replace it? Or is the Centrecorp relationship now closed?
6. **Clarify PICC void** — both PICC invoices voided ($96.8K combined). Is this a reissue-from-Pty scenario or a written-off receivable?
7. **Minderoo re-engagement timeline** — funders.json says "Q3 FY27 or on Lucy's signal". Set a calendar trigger.

---

## Sources queried

| Source | Query / file | Rows | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, AUTHORISED+DRAFT, amount_due > 0 | 14 rows | 2026-07-16 |
| `xero_invoices` | status+type GROUP BY | summary | 2026-07-16 |
| `xero_invoices` | specific INV lookup (INV-0321, 0314, 0317, 0324, 0222) | 5 rows | 2026-07-16 |
| `wiki/narrative/funders.json` | full parse | v2, updated 2026-07-07 | file |
| `ghl_contacts` | funder-tagged, last_contact_date | 1 result | 2026-07-16 |
| `thoughts/shared/drafts/` | migration-keyword grep | novation-letter-templates.md | 2026-07-16 |
| `thoughts/shared/plans/` | entity+migration keyword grep | 7 files | 2026-07-16 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-05-14|Q1 funder-alignment — 2026-05-14 last pass]]
- [[funder-alignment-2026-04-24|Q1 funder-alignment — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
