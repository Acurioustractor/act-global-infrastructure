---
title: Alignment Loop drift — 2026-05-14 to 2026-06-25
summary: 42-day drift, cutover in 5 days. ABN issued June 1 (gate open), but Pty Xero still not in DB and Holdco decision overdue — clean 1 July cutover now at risk. Snow $132K paid, Centrecorp $84.7K resolved, but Rotary 441d and $167,838 new Sonas today. Q2 stable at 77 codes, ACT-PS wiki gap persists third pass.
tags: [synthesis, alignment-loop, drift, cutover, entity-migration]
status: active
date: 2026-06-25
---

# Alignment Loop drift — 2026-05-14 to 2026-06-25

> Third pass of the [[act-alignment-loop|ACT Alignment Loop]], drift summary. 42 days from the 2026-05-14 baseline. Five days from cutover. Sources: [[entity-migration-truth-state-2026-06-25]], [[funder-alignment-2026-06-25]], [[project-truth-state-2026-06-25]].

---

## TL;DR — what moved since 2026-05-14

1. **ABN issued June 1 — the blocking gate is open, but Pty Xero is NOT visible in the DB 24 days later.** The Holdco structure decision (§12, due June 19) is overdue, and it is blocking novation letters and the entity finalisation sequence. A clean 1 July cutover is now at real risk — Rule 2 is in play.

2. **$431,898 outstanding on the sole trader (↓$65K from May 14).** Snow $132K paid, Centrecorp $84.7K resolved — two long-running stalls closed. But $167,838 in Sonas invoices were raised today (June 25) and five new community-org invoices landed this week. The receivable book is larger in transaction count even as the headline total fell.

3. **Q2 project codes stable at 77; ACT-BV merged into ACT-FM (June 8); ACT-PS wiki gap persists for the third consecutive pass.** No strategic movement on project hygiene — which is appropriate given the cutover context.

---

## Q3 — Entity migration drift (cutover-critical)

| Metric | 2026-05-14 | 2026-06-25 | Direction |
|---|---|---|---|
| Days to cutover | 47 | **5** | ↓ |
| xero_tenant_id count in DB | 1 | 1 | → (Pty Xero NOT open or not connected) |
| Bank accounts in DB | NAB Visa ACT #8815 only | NAB Visa ACT #8815 only | → |
| Bank data currency | — | Stale to 2026-03-31 (3 months) | 🔴 |
| ABN (Pty) registered | OPEN/LATE | ✅ ISSUED 2026-06-01 | ↑ |
| GST (Pty) registered | OPEN | ✅ REGISTERED 2026-06-01 | ↑ |
| Pty Xero file open | OPEN | ❓ Not in DB (likely raised but not connected) | ⚠️ |
| Pty NAB account open | BLOCKED on Nick's trust docs | ❓ Unconfirmed from DB | ⚠️ |
| Holdco structure decision | N/A (§12 added June 12) | **OVERDUE** (due June 19) | 🔴 |
| Novation letters sent | NOT SENT | BLOCKED on entity decision | 🔴 |
| Knight Photo Phase 1 ($100K) | Not raised | Still not raised (per June 12 note) | 🔴 |
| D&O insurance | 10 days to deadline | Status unconfirmed | ⚠️ |
| Total ACCREC outstanding | $497,240 | $431,898 | ↓ |
| Standard Ledger engaged | Not confirmed | Still unconfirmed in DB | ⚠️ |

### What this means

The June 1 ABN issuance opened the structural gate. In theory, everything that was blocked on ABN can now proceed: Pty Xero, Pty NAB, test invoice, payroll, company resolutions. But 24 days have elapsed and:

- The Pty Xero file is not visible in the DB (1 tenant still, same as May 14).
- The Holdco decision (which should have been made June 19) is 6 days overdue. This decision governs the novation letter structure — you cannot finalise funder migration until you know whether ACT operates through the Pty directly or through a Holdco-Operating-Co pair.
- With 5 days left, the 5-day critical path is: Holdco decision → novation letters → ACT-IN (Pty) first invoice → payroll on ACT payroll → Pty Xero/NAB live confirmation → hand to Standard Ledger.

**Rule 2 is live.** If the entity decision isn't made before June 30, it is better to delay one or two items than to issue migration notices or invoices under the wrong structure. An incorrect novation letter sent in error is harder to unwind than a brief delay.

---

## Q1 — Funder alignment drift (receivables-critical)

| Metric | 2026-05-14 | 2026-06-25 | Direction |
|---|---|---|---|
| Total ACCREC outstanding | $497,240 | $431,898 | ↓ $65K |
| Snow Foundation INV-0321 ($132K) | AUTHORISED (not yet paid) | **PAID** | ✅ |
| Centrecorp INV-0314 ($84.7K) | DRAFT (90d stall, $0 due) | **Resolved** ($0 DRAFT, decided) | ✅ |
| Rotary INV-0222 ($82.5K) | AUTHORISED (399d unpaid) | AUTHORISED (**441d** unpaid) | 🔴 +42d |
| Sonas Properties total | $37,290 (1 invoice) | $167,838 (3 invoices, $123K new today) | ↑ |
| funders.json entries | 24 | 49 (+25) | ↑ |
| funders.json coverage | Sparse, auto-stubs pending | Materially complete (all Xero active + strategic entries) | ↑ |
| MRFF/Palmer grant | Not tracked | **AWARDED** (Mar 2026-Mar 2027 Year 1, $450K-750K envelope) | 🆕 |
| Minderoo | ask-pending | **paused** (Lucy Stronach, internal restructure) | ↓ |
| New invoices (community orgs) | 0 new this week | 4 new this week (Tandanya, JRI, Mounty, Julalikari) | 🆕 |
| Dusseldorp Forum | No outstanding | $16,500 AUTH today (new) | 🆕 |
| Paul Ramsay Foundation | No comm recorded | Still no comm recorded | 🔴 |
| Silent 90d+ funders | Rotary (no comm), Centrecorp (90d) | Rotary (441d, no comm), Centrecorp (132d), Paul Ramsay (never) | 🔴 |

### What moved — the good

Snow $132K and Centrecorp $84.7K clearing together takes $216K off the outstanding book. These were the two longest-stalled receivables in the Q1 and Q2 baseline passes.

funders.json grew from 24 to 49 entries — the ledger is now materially complete, having absorbed the Q1 recommended additions and 25+ Xero auto-stubs.

MRFF/Palmer is an entirely new awarded grant, entirely separate from the sole trader cutover (it contracts to the Pty). Year 1 deadline: June 26 (tomorrow — Palmer conversation needed).

### What hasn't moved — the risks

Rotary INV-0222 at 441 days is a firm bad-debt candidate. No communication recorded at all. The FY26 BAS (due 28 July) needs a receipt OR a bad-debt write-off decision before then.

The $167,838 Sonas invoices raised today are almost certainly Harvest-related (D11.1 subsidiary structure). These are legitimate sole-trader invoices but they enlarge the receivable book 5 days before cutover. They should be flagged in the migration handoff to Standard Ledger: "these are legacy sole trader receivables, pay as normal."

Three new community-org invoices (Tandanya $16.5K, Justice Reform $880, Mounty $22K) have no funders.json entries. They need stubs for migration record purposes even if they're small/transient.

---

## Q2 — Project truth-state drift (strategic hygiene)

| Metric | 2026-05-14 | 2026-06-25 | Direction |
|---|---|---|---|
| Config version | v1.8.0 | v1.8.0 | → |
| Total codes in config | 75 | 77 | ↑ +2 (ACT-GS, ACT-PB, ACT-DLB were added between passes; net is +2 from 75 per May 14 baseline, noting the May 14 baseline recorded 75 but the config now reflects 77 with ACT-BV retained as legacy alias) |
| ACT-BV status | Active (separate) | Legacy alias under ACT-FM (merged 2026-06-08) | → |
| Wiki article count | 98 | 98 | → |
| ACT-PS wiki gap | Persists (2nd pass) | **Persists (3rd pass)** | 🔴 carried |
| Undocumented DB codes (ACT-QD, ACT-RS) | First noted May 14 | Still in DB, not in config | → |
| 4/4 score count | ~33 | ~33 | → |
| 2/4 score count | ~27 | ~29 (+ACT-QD, +ACT-RS) | ↑ |
| Config hygiene list | APO, AMT, EFI, GCC pending removal | Same 4 pending + ACT-QD/RS need resolution | → |

### Interpretation

Q2 is the quietest quadrant in this pass, and that's appropriate — with 5 days to cutover, project code hygiene is not the priority. The only new structural fact is the ACT-BV → ACT-FM merger (June 8), which is an administrative tidy of same-land entities.

The ACT-PS wiki gap being called out for a third consecutive pass is a soft signal that it's not going to get resolved in the cutover period. After cutover, this should be the first authoring action: `wiki/projects/picc/picc-on-country-photo-studio.md`.

---

## Acceptance criteria — all three Qs

| Criterion | Met? | Evidence |
|---|---|---|
| Q3: Cutover blocker status surfaced | ✅ | Holdco decision overdue; Pty Xero not in DB |
| Q3: Rule 2 risk named | ✅ | Entity decision gate identified |
| Q3: 5-day critical path enumerated | ✅ | See entity migration synthesis |
| Q1: All ACCREC outstanding named | ✅ | 14 invoices, $431,898 |
| Q1: New MRFF/Palmer grant noted | ✅ | AWARDED, Year 1 running |
| Q1: Silent-90d-plus funders flagged | ✅ | Rotary, Centrecorp, Paul Ramsay |
| Q2: No regression from 75-code baseline | ✅ | 77 codes, all accounted for |
| Q2: ACT-PS persisting gap noted | ✅ | Third consecutive pass |

---

## Actions before end of day June 25

| Priority | Action | Owner |
|---|---|---|
| 🔴 P0 | Confirm Holdco decision (overdue since June 19) | Nic/Ben |
| 🔴 P0 | MRFF/Palmer deadline tomorrow — Palmer conversation | Ben |
| 🔴 P1 | Confirm Pty Xero file open and connected | Ben |
| 🔴 P1 | Confirm Pty NAB status (trust docs issue?) | Nic |
| 🔴 P1 | Raise Knight Photography Phase 1 invoice ($100K) | Ben |
| ⚠️ P2 | Begin funder novation letters once Holdco is decided | Ben/Nic |
| ⚠️ P2 | Bad-debt decision: Rotary INV-0222 (441d) | Ben/Nic |
| 🟡 P3 | Stub three new community orgs in funders.json | Ben |
| 🟡 P3 | Confirm D&O insurance bound | Nic |
| 🟡 P4 | Write ACT-PS wiki article (post-cutover) | Ben |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop]]
- [[entity-migration-truth-state-2026-06-25|Q3 — Entity migration truth-state, 2026-06-25]]
- [[funder-alignment-2026-06-25|Q1 — Funder alignment, 2026-06-25]]
- [[project-truth-state-2026-06-25|Q2 — Project truth-state, 2026-06-25]]
- [[alignment-loop-drift-2026-04-24-to-2026-05-14|Prior drift — 2026-04-24 to 2026-05-14]]
