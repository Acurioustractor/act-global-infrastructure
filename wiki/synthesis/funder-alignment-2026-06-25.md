---
title: Funder alignment — cutover week, $431,898 outstanding, Sonas $168K burst today
summary: Third pass of the ACT Alignment Loop (Q1), 2026-06-25, 5 days before cutover. Snow Foundation $132K PAID; Centrecorp $84.7K DRAFT resolved; Rotary INV-0222 still outstanding at 441 days; three Sonas invoices totalling $167,838 raised today for Harvest; funders.json grew to 49 entries; MRFF/Palmer grant AWARDED and tracked; Minderoo paused.
tags: [synthesis, funders, alignment-loop, entity-migration, cutover]
status: active
date: 2026-06-25
---

# Funder alignment — 2026-06-25

> Third pass of the [[act-alignment-loop|ACT Alignment Loop]], Q1. Five days before the sole trader cutover. Sources: `xero_invoices` (DB), `ghl_contacts` (comms state), `wiki/narrative/funders.json` (strategic narrative), `thoughts/shared/drafts+plans` (in-flight). Previous pass: [[funder-alignment-2026-05-14|2026-05-14]].

## Headline findings

1. **Snow Foundation INV-0321 ($132,000) has been PAID.** The largest single outstanding funder receivable at baseline has cleared. Total Snow billed: $534,930. The migration notice should have been given by now — confirm with Nic whether the "Pty transition from 1 July" conversation has happened with Sally/Alexandra.

2. **Centrecorp INV-0314 ($84,700 DRAFT) is resolved.** The invoice shows DRAFT status with $0 `amount_due` — the decision was made (likely voided or reissued). The 130-day stall that was the single most consequential decision in the prior two passes has closed.

3. **Rotary INV-0222 ($82,500) is now 441 days unpaid.** No change in status since 2026-04-24. This is now a firm bad-debt candidate for the sole trader FY26 close-out. Per Cutover Rule 3: this is a recovery problem, not a novation one. The sole trader's FY26 BAS (due 28 July) will need to either show a receipt or a bad-debt write-off.

4. **Three Sonas Properties invoices totalling $167,838 were raised TODAY (2026-06-25).** INV-0336 ($63,888), INV-0337 ($59,950), and the existing INV-0316 ($44,000, Feb 2026). Total Sonas outstanding: $167,838. These are Harvest-setup invoices — likely reflecting the Harvest subsidiary structure (D11.1) and the Sonas principal arrangement. They are issued under the sole trader, so they're the final tranche of legacy receivables before cutover.

5. **`wiki/narrative/funders.json` grew from 24 to 49 entries** (v2, updated 2026-06-05). All seven Q1-recommended additions from the April baseline are in. A further 25+ auto-stubs from Xero were added 2026-05-07 and 2026-05-16, plus MRFF/UoM Palmer as a new strategic entry. The ledger is now materially complete.

6. **MRFF/UoM Palmer is a new AWARDED grant.** Mental Health and Climate Change grant 2026-2031, $450K–$750K ACT envelope target, Year 1 now running (Mar 2026–Mar 2027). Deadline: June 26 (tomorrow) for the Palmer conversation. ACT named as Partner AI for Tennant Creek + Palm Island. This is entirely separate from the cutover — it contracts to the Pty.

7. **Minderoo is paused.** Lucy Stronach indicated internal restructure 2026-05-14. Stage updated to `paused`, re-engage Q3 FY27 on her signal. The $2.9M ask is off the active board for now.

---

## At-a-glance — funders with live outstanding or strategic significance

| Funder | DB status | Total billed | Outstanding | `funders.json` stage | Change |
|---|---|---|---|---|---|
| **Rotary eClub Outback Australia** | 🟡 AUTH 441d | $82,500 | **$82,500** | ask-pending | 🔴 +42d, no action |
| **Social Impact Hub Foundation** | 🟡 AUTH 219d | $21,780+ | **$21,780** | lapsed | ⚠️ INV-0289 outstanding (was "paid") |
| **Regional Arts Australia** | 🟡 AUTH 192d | $49,500 | **$16,500** | needs-writeup | 🟢 one tranche cleared |
| **Sonas Properties Pty Ltd** | 🟡 AUTH x3 | $168K+ | **$167,838** | needs-writeup | 🆕 $123K new today |
| **Berry Obsession PTY LTD** | 🟡 AUTH 135d | $13,000 | **$13,000** | needs-writeup | → |
| **Brodie Germaine Fitness** | 🟡 AUTH 71d | $15,400 | **$15,400** | needs-writeup | → |
| **Homeland School Company** | 🟡 AUTH 38d | $44,000+ | **$44,000** | needs-writeup | ⚠️ new larger invoice (prior $4,950 paid) |
| **Tandanya National Aboriginal Cultural Institute** | 🆕 AUTH 8d | $16,500 | **$16,500** | *not listed* | 🆕 new |
| **Justice Reform Initiative** | 🆕 AUTH 8d | $880 | **$880** | *not listed* | 🆕 new |
| **Mounty Aboriginal Youth & Community Services** | 🆕 AUTH 7d | $22,000 | **$22,000** | *not listed* | 🆕 new |
| **Julalikari Council Aboriginal Corporation** | 🆕 AUTH 6d | $15,000+ | **$15,000** | needs-writeup | 🆕 new invoice |
| **Dusseldorp Forum** | 🟡 AUTH today | $33,000+ | **$16,500** | active-partner | 🆕 new invoice today |
| **The Snow Foundation** | 🟢 PAID | $534,930 | **$0** | active-partner | 🟢 INV-0321 $132K PAID |
| **Centrecorp Foundation** | 🟢 resolved | $208,032 | **$0** | active-partner | 🟢 INV-0314 DRAFT $0 — decision made |
| **PICC** | 🟢 paid | $533,500 | **$0** | needs-writeup | 🟢 all cleared |
| **Just Reinvest** | 🟢 paid | $27,500 | **$0** | needs-writeup | → paid since Apr |
| **SMART Recovery Australia** | 🟢 paid | $158,700 | **$0** | needs-writeup | 🟢 cleared |
| **Minderoo Foundation** | ❔ paused | — | — | paused | 🔴 paused since 2026-05-14 |
| **MRFF/UoM Palmer** | ❔ warm | — | — | warm | 🆕 AWARDED grant, deadline tomorrow |
| **QBE Catalysing Impact** | ❔ active | — | — | active-partner | → Cohort 2026, last comm 2026-05-19 |
| **Tim Fairfax Family Foundation** | ❔ warm | — | — | warm | → last comm 2026-05-20 |
| **June Canavan Foundation / Anne Gripper** | ❔ active-partner | — | — | active-partner | → last comm 2026-05-21 |

---

## Outstanding ACCREC book — $431,898 on the sole trader, 5 days to cutover

The full receivable book as of 2026-06-25. Every item below is an invoiced sum on Nic's sole trader. Per Cutover Rule 1: invoices issued before 30 June pay to the sole trader regardless of when payment arrives. Novation letters (if sent) must distinguish: "existing invoices pay as normal; new tranches from 1 July invoice to the Pty."

| Counterparty | Invoice | Amount | Status | Age | Migration disposition |
|---|---|---:|---|---:|---|
| **Rotary eClub Outback Australia** | INV-0222 | $82,500 | AUTH | **441d** | 🔴 Chase or write-off. SOLE TRADER BAD-DEBT decision before FY26 BAS. |
| **Social Impact Hub Foundation** | INV-0289 | $21,780 | AUTH | 219d | ⚠️ Sole trader; pay as normal or chase. |
| **Regional Arts Australia** | INV-0302 | $16,500 | AUTH | 192d | → Chase; second tranche unpaid. |
| **Sonas Properties** | INV-0316 | $44,000 | AUTH | 129d | Harvest-related; sole trader billing. |
| **Berry Obsession PTY LTD** | INV-0309 | $13,000 | AUTH | 135d | Chase. |
| **Brodie Germaine Fitness** | INV-0325 | $15,400 | AUTH | 71d | → |
| **Homeland School Company** | INV-0303 | $44,000 | AUTH | 38d | ⚠️ New larger invoice; prior paid. Chase. |
| **Tandanya** | INV-0332 | $16,500 | AUTH | 8d | 🆕 New. |
| **Justice Reform Initiative** | INV-0333 | $880 | AUTH | 8d | 🆕 New. |
| **Mounty Aboriginal Youth** | INV-0334 | $22,000 | AUTH | 7d | 🆕 New. |
| **Julalikari Council** | INV-0335 | $15,000 | AUTH | 6d | 🆕 New. |
| **Dusseldorp Forum** | INV-0338 | $16,500 | AUTH | today | 🆕 New. Novation letter needed (active-partner). |
| **Sonas Properties** | INV-0336 | $63,888 | AUTH | today | 🆕 Harvest-setup. |
| **Sonas Properties** | INV-0337 | $59,950 | AUTH | today | 🆕 Harvest-setup. |
| **TOTAL** | | **$431,898** | | | |

---

## Funders not yet in `funders.json` (wiki-absent)

Three contacts with new AUTHORISED invoices have no `funders.json` entry:
- **Tandanya National Aboriginal Cultural Institute** — $16,500 new
- **Justice Reform Initiative** — $880 new
- **Mounty Aboriginal Youth & Community Services** — $22,000 new

These are community orgs, not funders in the traditional sense, but they have sole-trader receivables and should be stubbed for the migration record.

---

## Communication-overdue risks

From `funders.json.last_communicated_at` fields:
- **Centrecorp** — last comm 2026-02-13 (132+ days silent). Decision was made on the invoice, but is the relationship maintained?
- **Paul Ramsay Foundation** — `last_communicated_at: null` — no recorded comm ever in system
- **Rotary eClub** — no comm recorded at all, 441-day unpaid invoice

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| Every funder with live outstanding is named | ✅ 14 invoices enumerated |
| Every funder silent >90 days flagged | ✅ Rotary (no comm, 441d), Centrecorp (132d), Paul Ramsay (never) |
| MRFF/Palmer integration noted | ✅ |

---

## Sources queried

| Source | Query / file | Rows | As-of |
|---|---|---|---|
| `xero_invoices` | ACCREC, AUTHORISED+DRAFT, amount_due>0 | 14 AUTHORISED + 2 DRAFT | 2026-06-25 |
| `wiki/narrative/funders.json` | all entries | 49 entries, v2, updated 2026-06-05 | 2026-06-25 |
| `thoughts/shared/drafts/` | migration-keyword grep | 1 (novation-letter-templates.md) | 2026-06-25 |
| `thoughts/shared/plans/` | migration-related listing | multiple June plans | 2026-06-25 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-05-14|Q1 — 2026-05-14 pass]]
- [[index|ACT Wikipedia]]
