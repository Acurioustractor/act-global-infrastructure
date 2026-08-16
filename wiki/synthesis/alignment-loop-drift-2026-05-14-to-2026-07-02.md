---
title: Alignment Loop drift — 2026-05-14 to 2026-07-02
summary: 49-day drift summary across all three questions. The cutover date (30 June) has passed with the Pty Xero still absent from Supabase — Rule 2 (honest delay) in operation. $345K cleared from the book; $451K new invoices raised. Operating entity decision (due June 19) appears unresolved.
tags: [synthesis, alignment-loop, drift, entity-migration, funders, projects]
status: active
date: 2026-07-02
---

# Alignment Loop drift — 2026-05-14 to 2026-07-02

> 49-day drift across three questions. Covers 2026-05-14 (second pass) to 2026-07-02 (this pass, Day +2 after the 30 June cutover date). Previous drift summaries: [[alignment-loop-drift-2026-04-24-to-2026-05-08|Apr 24 → May 8]], [[alignment-loop-drift-2026-04-24-to-2026-05-14|Apr 24 → May 14]].

---

## TL;DR — what moved since 14 May

- **🚨 Cutover missed.** The 30 June 2026 cutover date has passed. The sole trader's Xero file is still the only tenant in Supabase. Invoices dated today (2 July) are still hitting the sole trader. Rule 2 is correctly operating — the Pty hasn't traded yet because it isn't ready. The gating blocker is the §12 operating entity decision (due June 19, unresolved) which froze NAB, ABN, Pty Xero, and novation letters.
- **💰 Big receivable movement: $345K cleared, $451K raised, net +$106K.** Snow ($132K), Centrecorp ($84.7K), PICC ($96.8K), SMART, Aleisha, partial Regional Arts — all cleared. Offset by MRFF/UoM ($167.2K, today), three Sonas/Harvest invoices ($167.8K), Homeland School new $44K, and a cluster of smaller community-org invoices. Outstanding ACCREC at $602,985.84 (17 invoices).
- **📋 The §12 Standard Ledger call (June 12) is the pivot.** A Holdco structure proposal opened an operating entity decision that put novation letters on hold. D&O insurance is 39 days overdue. Q4 FY26 BAS is 26 days away. The Knight Photography Phase 1 invoice (FY26 R&D) had a June 30 deadline that may have been missed.

---

## Q1 — Funder drift

### What changed

| Metric | 2026-04-24 (baseline) | 2026-05-14 | 2026-07-02 | Direction |
|---|---|---|---|---|
| `funders.json` entries | 14 | 24 | 49 | ↑ |
| `funders.json` version | v1 | v2 (May 7) | v2 (Jun 5) | ↑ |
| Outstanding ACCREC | $507,350 | $497,240 | $602,985.84 | ↑ |
| Outstanding ACCREC invoice count | 11 | ~12 | 17 | ↑ |
| Snow INV-0321 ($132K) | AUTH 37d | AUTH date-changed to May 22 | **PAID ✅** | ↑ |
| Centrecorp INV-0314 ($84.7K DRAFT) | DRAFT 70d | DRAFT 90d | **RESOLVED ✅** | ↑ |
| Rotary INV-0222 ($82.5K) | AUTH 380d | AUTH 399d | AUTH **448d** | ↓ |
| PICC total ($96.8K) | AUTH | AUTH partial | **PAID ✅** | ↑ |
| Minderoo outcome | ask-pending ($2.9M, May 15 deadline) | deadline tomorrow | **PAUSED** (restructure) | → (neither win nor loss) |
| Funders silent >90 days | 4 (Jan batch) | 4 | Not re-queried (GHL schema mismatch) | ? |
| MRFF/UoM relationship | absent | absent | **LIVE** ($167.2K invoiced today) | 🆕 |
| `funders.json` `needs-writeup` stubs | 0 | 7 | ~27 | ↑ |

### Material call-outs

**Snow cleared — the relationship held through the migration.** INV-0321 ($132,000) has been paid. Snow was the single biggest outstanding funder at baseline. This is a meaningful result. The migration notice presumably was given during this settlement.

**Centrecorp resolved.** INV-0314 DRAFT ($84,700) no longer appears with outstanding amount_due. The exact disposition (sent + paid vs voided) isn't visible in the DB, but the "10-minute Nic conversation" action from three prior loops appears to have happened.

**MRFF/UoM is the new big pipeline.** The MRFF grant (Mental Health + Climate Change 2026-2031, GNT2051566) is now live. Two invoices ($66K + $101.2K = $167.2K) dated today represent Year 1 of a five-year relationship with an ACT envelope of $450K–$750K. This was not in the ledger at any prior pass.

**Rotary INV-0222 remains the worst-performing receivable.** 448 days. Three alignment loop passes have flagged this. No action. The sole trader's FY26 close-out BAS is now 26 days away (July 28). If this is not chased or written off before the BAS, it becomes a lingering bad-debt entry on the sole trader's final return.

---

## Q2 — Project truth-state drift

### What changed

| Metric | 2026-04-24 (baseline) | 2026-05-14 | 2026-07-02 | Direction |
|---|---|---|---|---|
| Total project codes | 74 | 75 | 75 | → |
| Codes at 4/4 | 28 | ~33 | ~34 | ↑ |
| Codes at 3/4 | 16 | ~11 | ~10 | ↓ |
| Codes at 2/4 | 26 | ~27 | ~27 | → |
| Codes at 1/4 | 4 | 4 | 4 | → |
| Codes at 0/4 | 0 | 0 | 0 | → |
| Active/ideation projects <2/4 | 0 | 0 | 0 | → (criterion met) |
| canonical_slug coverage | ~46% (40+ missing) | 100% | 100% | → |
| Authoring backlog (real gaps) | 1 (ACT-PS) | 1 (ACT-PS) | 1 (ACT-PS) | → |
| Xero-tracked codes | 31 | ~34 | 35 | ↑ |
| Wiki articles | 88 | 98 | Unknown (not re-counted) | → or ↑ |

### Material call-outs

**Q2 is the most stable question.** No codes added or removed. Acceptance criterion (no active project <2/4) maintained through three passes. The one structural change: ACT-CP (Community Capital) has gained Xero presence (9 invoices, 1 txn, 1 bsl) and has crossed from 3/4 to 4/4. This is the sole confirmed upward score movement since May 14.

**ACT-PS remains the one wiki gap.** Three passes, same finding, no article written. The article (`wiki/projects/picc/picc-on-country-photo-studio.md`) is a 30-minute piece of writing that would close the only active-project wiki gap.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

### What changed

| Metric | 2026-04-24 (baseline) | 2026-05-14 | 2026-07-02 | Direction |
|---|---|---|---|---|
| Days until cutover | 67 | 47 | **-2 (past)** | ↓ |
| xero_tenant_id count | 1 | 1 | **1** | → (should be 2) |
| bank_account count | 1 | 1 | **1** | → (should be 2) |
| Sole trader invoice count | 1,742 | 2,094 | 2,245 | ↑ (still growing) |
| Outstanding ACCREC | $507,350 | $497,240 | $602,985.84 | ↑ |
| DRAFT ACCREC count | 2 | 1 (Centrecorp) | 2 (both $0 amount_due) | → |
| DRAFT ACCREC $ | ~$84,700 | $84,700 | $0 | ↓ (drafts resolved) |
| Novation letter template | absent | **DRAFTED ✅** | drafted (on hold per §12) | → |
| Migration-related drafts | 0 | 1 | 2+ | ↑ |
| New plans since baseline | — | multiple | many | ↑ |
| D&O insurance | 0 days since registration | 20 days | **69 days (deadline was ~30d)** | 🔴 OVERDUE |
| Shareholders Agreement | not started | not started | not started | → |
| ABN (Pty) | open | open | open | → |
| Pty Xero file | open | open | open | → |
| Operating entity decision | n/a | n/a | **OPEN/OVERDUE (due Jun 19)** | 🆕 |
| Q4 FY26 BAS | not yet due | not yet due | **DUE IN 26 DAYS (Jul 28)** | ⚠️ |

### Section-by-section status counts

| Status | 2026-04-24 | 2026-05-14 | 2026-07-02 |
|---|---:|---:|---:|
| ✅ DONE | 5 | 6 | 7 |
| 🟡 IN PROGRESS / PARTIAL | 7 | 8 | 10 |
| 🔴 NOT STARTED / OPEN / OVERDUE | 28 | 32 | 35 |
| ⏳ NOT YET DUE / BLOCKED | 13 | 12 | 10 |
| **Total tracked** | **53** | **58** | **62** |

### Specific item transitions since May 14

| Item | May 14 | 2026-07-02 |
|---|---|---|
| D&O insurance | 🔴 URGENT (10 days to deadline) | 🔴 **OVERDUE** (39 days past deadline) |
| Centrecorp INV-0314 | 🔴 DRAFT 90d | ✅ RESOLVED |
| Snow INV-0321 ($132K) | 🟡 AUTH, date changed to May 22 | ✅ PAID |
| PICC ($96.8K) | 🟡 AUTH | ✅ PAID |
| Operating entity decision | n/a | 🔴 OVERDUE (due June 19) |
| Novation letters | 🔴 NOT SENT (waiting ABN + bank) | 🔴 ON HOLD (§12 decision 1) |
| §12 Standard Ledger call | n/a | 🆕 new scope (4 decisions) |
| Harvest subsidiary structure | 🔴 not started | 🟡 ACTIVE PLANNING |
| Q4 FY26 BAS | ⏳ not yet due | 🟡 DUE IN 26 DAYS |
| $1 test-invoice runbook | n/a | 🟢 PLAN READY (pre-reqs not met) |
| MRFF/UoM invoices in sole trader | n/a | 🔴 TODAY — post-cutover in sole trader |

### Material call-outs for Q3

**The cutover has been delayed. Rule 2 is operating.** Two days after the June 30 date, the Pty has no Xero file visible in Supabase and no NAB account visible in bank_statement_lines. Invoices are still being raised into the sole trader. This is the correct outcome under Rule 2 — better an honest delay than mis-attributing income to the wrong entity. However, the longer this continues, the more invoices will need re-assessment.

**The §12 Holdco decision is the blocker.** The June 12 Standard Ledger call introduced a structural question (Holdco + ACT Projects subsidiary vs Pty Ltd alone) that put all novation letters on hold and would repoint the QBE contract, Knight Photography Phase 3 invoicing, FY27 R&D re-registration, and the "Goods on Country" trading name registration. This decision was due June 19, appears unresolved, and is now the single largest blocker for completing the migration.

**D&O insurance is 39 days overdue.** Standard practice is to bind within 30 days of registration. The Pty has been registered since April 24. If the insurance hasn't been bound, the directors are unprotected while the MRFF partnership and Harvest subsidiary are being established.

**Knight Photography Phase 1 ($100K) — R&D deadline likely missed.** The FY26 R&D window plan required associate amounts to be PAID by June 30 to enter the FY26 claim. If Inv 15078 wasn't raised and paid before June 30, the R&D-eligible amount carries to FY27 instead (under Path C, FY26 covers only April 24–June 30, 2026 for the Pty).

---

## What to action right now (2026-07-02)

Priority order by blast radius:

1. **Resolve operating entity decision (§12 D1)** — call/email Standard Ledger. Holdco or Pty Ltd as the trading entity? One decision unblocks: novation letters, ABN application target, NAB account, Knight Photography Phase 3, FY27 R&D re-registration.
2. **Bind D&O insurance** — 39 days overdue. Phone a broker today.
3. **Confirm Q4 BAS in Standard Ledger's queue** — due July 28 (26 days). Sole trader records must be clean; the untagged Xero review queue (246 items from May 5) needs to be cleared first.
4. **Decide Rotary INV-0222 ($82,500, 448 days)** — write off on the sole trader's final BAS, or chase. A 448-day AUTH invoice is not bankable. Three loop passes, no action.
5. **Confirm Knight Photography Phase 1 invoice status** — was the $100K invoice raised and paid before June 30? If not, the FY26 R&D claim for this amount is materially reduced.

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[alignment-loop-drift-2026-04-24-to-2026-05-08|Prior drift: Apr 24 → May 8]]
- [[alignment-loop-drift-2026-04-24-to-2026-05-14|Prior drift: Apr 24 → May 14]]
- [[funder-alignment-2026-07-02|Q1 — this pass]]
- [[project-truth-state-2026-07-02|Q2 — this pass]]
- [[entity-migration-truth-state-2026-07-02|Q3 — this pass]]
- [[index|ACT Wikipedia]]
