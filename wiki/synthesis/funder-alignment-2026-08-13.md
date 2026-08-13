---
title: Funder alignment — Oonchiumpa $41K new receivable, BAS 16 days overdue, Rotary enters 490th day
summary: Sixth pass of the ACT Alignment Loop (Q1), 2026-08-13. Outstanding ACCREC $422,017.84 across 11 invoices — net +$4,250 from Aug 6 (Mounty $22K + Julalikari $15K cleared; new Oonchiumpa INV-0344 $41,250 raised 2026-08-12). BAS Q4 FY26 now 16 days past standard due date. Rotary INV-0222 at 490 days. funders.json unchanged at 25 entries.
tags: [synthesis, funders, alignment-loop, entity-migration]
status: active
date: 2026-08-13
---

# Funder alignment — 2026-08-13

> Sixth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q1. Same four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work). Last merged pass: [[funder-alignment-2026-08-06|2026-08-06]]. Baseline: [[funder-alignment-2026-04-24|2026-04-24]].

## Headline findings

1. **Outstanding ACCREC is $422,017.84 across 11 invoices — net increase of $4,250 from Aug 6.** Two invoices cleared (Mounty Aboriginal Youth $22K + Julalikari Council $15K = −$37K) but a new $41,250 invoice to Oonchiumpa Consultancy and Services (INV-0344, dated 2026-08-12) arrived with no project_code. First movement on the receivables book in seven days.

2. **BAS Q4 FY26 (sole-trader) standard due date was 2026-07-28 — now 16 days past.** Standard Ledger (registered tax agent) may hold a concession beyond the standard date. No lodgement artefact visible in Supabase. This is the most pressing compliance unknown: confirm lodgement status or concession deadline with Standard Ledger immediately.

3. **Rotary eClub INV-0222 ($82,500) is now 490 days unpaid.** INV-0222 dates to 2025-04-10. The BAS decision window (write-off before lodgement) has passed nominally. Invoice remains AUTHORISED with full amount_due — either not written off, or Xero DB sync hasn't reflected a VOID.

4. **New invoice: Oonchiumpa Consultancy and Services INV-0344 — $41,250 raised 2026-08-12, no project_code.** This is the largest single piece of new receivable activity since the ALIVE invoices ($167.2K, 2026-07-02). Oonchiumpa Consultancy is likely related to ACT-OO but needs confirmation and project_code tagging before BAS/reporting can include it cleanly.

5. **`wiki/narrative/funders.json` unchanged at 25 entries** (v2, updated 2026-07-07). Five invoiced counterparties remain without stubs: Social Impact Hub Foundation ($21,780), Tandanya ($16,500), Brodie Germaine Fitness ($15,400), Berry Obsession ($13,000), Oonchiumpa Consultancy ($41,250 new). That's now six missing entries if Oonchiumpa is added.

---

## At-a-glance — outstanding receivables, 2026-08-13

Legend: 🟢 paid/clear, 🟡 outstanding, 🔴 critical/overdue, 🆕 new this pass, 🔄 changed

| Funder / counterparty | Invoice | Amount | Date raised | Age | Priority | Change |
|---|---|---:|---|---:|---|---|
| **Rotary eClub Outback Australia** | INV-0222 | $82,500 | 2025-04-10 | **490d** | 🚨 write-off or chase | → +7d |
| **Jenn Brazier** | INV-0228 | $3,887.84 | 2025-07-01 | **408d** | 🔴 >1 year | → +7d |
| **Social Impact Hub Foundation** | INV-0289 | $21,780 | 2025-11-18 | 268d | 🟡 chase | → +7d |
| **Regional Arts Australia** | INV-0302 | $16,500 | 2025-12-16 | 240d | 🟡 chase | → +7d |
| **Berry Obsession PTY LTD** | INV-0309 | $13,000 | 2026-02-10 | 184d | 🟡 chase | → +7d |
| **Sonas Properties Pty Ltd** | INV-0316 | $44,000 | 2026-02-16 | 178d | 🟡 Harvest-related | → +7d |
| **Brodie Germaine Fitness Aboriginal Corp** | INV-0325 | $15,400 | 2026-04-15 | 120d | 🟡 | → +7d |
| **Tandanya National Aboriginal Cultural Inst.** | INV-0332 | $16,500 | 2026-06-17 | 57d | ⬇️ recent | → +7d |
| **ALIVE National Centre (UniMelb)** | INV-0341 | $66,000 | 2026-07-02 | 42d | ⚠️ post-cutover sole trader | → +7d |
| **ALIVE National Centre (UniMelb)** | INV-0342 | $101,200 | 2026-07-02 | 42d | ⚠️ post-cutover sole trader | → +7d |
| **Oonchiumpa Consultancy and Services** | INV-0344 | **$41,250** | **2026-08-12** | **1d** | 🆕 no project_code | 🆕 new |
| **TOTAL OUTSTANDING ACCREC** | | **$422,017.84** | | | | **↑ +$4,250 from Aug 6** |
| — | — | — | — | — | — | — |
| Mounty Aboriginal Youth (INV-0334) | — | $0 | 2026-07-02 | — | 🟢 CLEARED | 🔄 cleared this pass |
| Julalikari Council (INV-0335) | — | $0 | 2026-06-19 | — | 🟢 CLEARED | 🔄 cleared this pass |

---

## MRFF-Palmer — Year 1 underway (unchanged)

ALIVE National Centre (INV-0341 + INV-0342, $167.2K total, 2026-07-02) represents Year 1 of the MRFF GNT2051566 relationship via University of Melbourne / Prof Victoria Palmer. Both remain untagged by project_code — persistent tracking gap flagged since 2026-07-16.

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| Every funder with live outstanding amount named | ✅ 11 invoices enumerated |
| Every funder in active plans with no DB presence flagged | ✅ Minderoo (paused), QBE (active no Xero), June Canavan (unverified) |
| Every funder silent >90 days flagged | ✅ Rotary (490d, no GHL record), Jenn Brazier (408d) |

---

## Open actions — priority order

1. **Confirm BAS Q4 FY26 lodgement status with Standard Ledger** — 16 days past standard due date. Confirm concession deadline if applicable. Rotary write-off and post-cutover invoice treatment (Rule 2) both hinge on BAS outcome.
2. **Tag INV-0344 Oonchiumpa ($41,250) with project_code** — likely ACT-OO. Confirm relationship.
3. **Rotary INV-0222 ($82,500, 490 days)** — write-off or chase. BAS window may have passed.
4. **Add missing counterparties to `funders.json`** — Social Impact Hub, Tandanya, Brodie Germaine, Berry Obsession, Oonchiumpa (new).
5. **Tag INV-0341 + INV-0342 ALIVE ($167.2K)** with project_code — unresolved since 2026-07-16.
6. **Clarify Centrecorp + PICC voids** ($181.5K combined) — are replacement Pty invoices being raised?

---

## Sources queried

| Source | Query / file | Rows | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, AUTHORISED+DRAFT, amount_due > 0 | 11 rows (AUTHORISED) + 1 DRAFT ($0) | 2026-08-13 |
| `xero_invoices` | status+type GROUP BY | summary | 2026-08-13 |
| `wiki/narrative/funders.json` | full parse | v2, 25 funders, updated 2026-07-07 | file |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-08-06|Q1 funder-alignment — 2026-08-06 last pass]]
- [[funder-alignment-2026-04-24|Q1 funder-alignment — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
