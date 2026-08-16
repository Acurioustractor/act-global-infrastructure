---
title: Alignment Loop drift — 2026-05-14 to 2026-06-11
summary: 28-day drift summary across Q1 (funder alignment), Q2 (project truth-state), and Q3 (entity migration). Three questions, one verdict per question. $333K receivables cleared is the headline positive. Pty Xero not open with 19 days to cutover is the headline risk. D&O 18 days past deadline.
tags: [synthesis, alignment-loop, drift, entity-migration, funders, projects]
status: active
date: 2026-06-11
---

# Alignment Loop drift — 2026-05-14 to 2026-06-11

> Third diff of the [[act-alignment-loop|ACT Alignment Loop]] Phase 0 artefacts, 28 days after the 2026-05-14 second pass. Three questions compared:
> - Q1: [[funder-alignment-2026-05-14|funder-alignment-2026-05-14]] → [[funder-alignment-2026-06-11|funder-alignment-2026-06-11]]
> - Q2: [[project-truth-state-2026-05-14|project-truth-state-2026-05-14]] → [[project-truth-state-2026-06-11|project-truth-state-2026-06-11]]
> - Q3: [[entity-migration-truth-state-2026-05-14|entity-migration-truth-state-2026-05-14]] → [[entity-migration-truth-state-2026-06-11|entity-migration-truth-state-2026-06-11]]

---

## TL;DR — what moved since 14 May

- **Q1 funders: $333K cleared — Snow paid, Centrecorp voided (decision finally made), PICC voided. Outstanding book down from $497K to $164K. Minderoo paused (internal restructure). MRFF deadline 2026-06-26 is 15 days away and was not in any prior pass.**
- **Q3 entity migration: ABN likely issued (confirmed by runbook template), but Pty Xero still not open 10 days ago. Cutover is 19 days away. D&O insurance is 18 days past the standard 30-day deadline with no binding evidence. Novation letters not sent. The critical path is compressed to breaking.**
- **Q2 projects: stable. Config cleaned (ACT-APO + ACT-AMT pruned), 74 codes, 98 wiki articles. ACT-PS wiki gap persists for the third straight pass. No regressions.**

---

## Q1 — Funder drift

### What changed

| Metric | 2026-05-14 | 2026-06-11 | Direction |
|---|---|---|---|
| `funders.json` version | v2 (updated 2026-05-07) | v2 (updated 2026-06-05) | ↑ updated |
| `funders.json` entry count | 24 | ~45 (auto-stubs + MRFF + Sonas etc.) | ↑ |
| Total ACCREC outstanding | $497,240 | **$164,250†** | ↓ −$333K |
| AUTHORISED ACCREC outstanding | $412,540 | $164,250 | ↓ −$248K |
| DRAFT ACCREC outstanding | $84,700 (Centrecorp, 1 inv) | **$0** (2 zero-value drafts) | ↓ RESOLVED |
| Snow INV-0321 status | AUTH, date 2026-05-22 | **PAID** 2026-05-22 | ↑ cleared |
| Centrecorp INV-0314 status | DRAFT 90d | **VOIDED** 2026-05-22 | ↑ resolved |
| PICC INV-0317 + INV-0324 | $19.8K + $77K AUTH | **VOIDED** | ↑ resolved |
| Rotary INV-0222 status | AUTH 399d | AUTH **428d** | ↓ +29d, no action |
| SMART Recovery $2.2K | AUTH | PAID | ↑ cleared |
| John Villiers Trust $1.2K | AUTH | PAID | ↑ cleared |
| Sonas Properties $37.3K | AUTH | PAID | ↑ cleared |
| Regional Arts $33K | AUTH 150d | AUTH **177d**, $16.5K remains | ↓ partial only |
| Aleisha Keating | 27 inv × $450 = $12,150 | 13 inv × $450 = $5,850 | ↑ 14 cleared |
| Brodie Germaine Fitness | $15,400 AUTH | $15,400 AUTH 57d | → no change |
| Homeland School NEW INV | — | $44,000 AUTH⚠️ (phantom?) | ⚠️ verify |
| Minderoo stage | ask-pending ($2.9M due 2026-05-15) | **paused** — restructure | 🔴 PAUSED |
| MRFF new funder | not in ledger | warm, deadline 2026-06-26 | 🆕 |
| Silent 90+ days count | Not queried (GHL schema error) | Georgina Byron, 64 days (only result) | — |

†If Homeland School $44K is a phantom, true outstanding is ~$120,250.

### Material changes — Q1

**The most significant positive event across the entire alignment loop.** $333K cleared in 28 days is not incremental — it's structural. Snow paying $132K is the largest single receivable ever on this ledger. Centrecorp's VOID ends a 90-day decision paralysis. PICC's two voids ($96.8K) suggest the relationship with PICC has been restructured off the invoicing model.

**🔴 Call-out — Minderoo paused:** Lucy Stronach paused justice conversations on 2026-05-14 (the same day as the prior synthesis) due to an internal Minderoo restructure. The $2.9M ask is off the table. This is not a failure of the pitch — it's an organisational pause at Minderoo. Re-engage Q3 FY27 or on Lucy's signal. This materially changes the funding outlook for FY27.

**🆕 Call-out — MRFF 15-day window:** `mrff-uom-palmer` appeared in `funders.json` (updated 2026-06-05) and has a hard deadline of 2026-06-26. ACT is named in the funded grant as a partner for Tennant Creek and Palm Island sites. The five-year ACT envelope (~$450K–$750K) would flow to the Pty. This is both a time-critical opportunity AND a cutover-sequencing question: the first invoice will need to go to the Pty (not sole trader), which requires Pty Xero to be live.

**🔴 Call-out — Rotary INV-0222 is now 428 days:** Three synthesis passes. Three calls to decide. The cutover is 19 days away. The sole trader closes on 30 June. If this invoice is not chased or written off this week, it becomes an open receivable on a closed entity — requiring an amended BAS and a bad-debt claim on the sole trader's FY26 tax return with no resolution record. Do it now.

---

## Q2 — Project truth-state drift

### What changed

| Metric | 2026-05-14 | 2026-06-11 | Direction |
|---|---|---|---|
| Project codes in config | 75 | **74** | ↓ −1 net (ACT-APO + ACT-AMT removed; 2 removed, net -1) |
| ACT-APO removed | present | **absent** | ↑ cleanup done |
| ACT-AMT removed | present | **absent** | ↑ cleanup done |
| ACT-GCC / ACT-EFI | present | present | → still pending |
| Wiki project articles | 98 | 98 | → no change |
| Score 4/4 count | ~33 (44%) | ~33 (44%) | → |
| Active/ideation projects <2/4 | 0 | 0 | → criterion met |
| Authoring backlog real gaps | 1 (ACT-PS) | 1 (ACT-PS) | → unchanged |
| canonical_slug coverage | 100% (all 75 had slugs) | 100% | → |
| Config version | 1.8.0 | 1.8.0 | → |

### Material changes — Q2

Config hygiene is half done. Two of four recommended removals (ACT-APO, ACT-AMT) have been made. ACT-GCC and ACT-EFI remain and should follow. The count moving from 75 to 74 is correct — two removed, net -1 from the +1 ACT-GS that was added at pass 2.

**ACT-PS persists.** If this wiki article were written in the 28 days since the last pass, the alignment loop acceptance criterion for authoring backlog would reach zero. It has been the lone backlog item since the 2026-04-24 baseline. With PICC invoices now voided, the article's framing should address the current state of the PICC relationship, not the invoice history. Estimated effort: 30 minutes.

**No regressions.** The acceptance criterion (no active project <2/4) remains met. Q2 is the healthiest of the three questions.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

### What changed

| Metric | 2026-05-14 | 2026-06-11 | Direction |
|---|---|---|---|
| Days until cutover | 47 | **19** | ↓ (9 days remain from this week) |
| xero_tenant_id count | 1 | **1** | → NO CHANGE — Pty Xero still absent |
| Pty NAB in bank_statement_lines | 0 | **0** (data to March only) | → unconfirmable |
| Total ACCREC outstanding | $497,240 | $164,250 | ↓ −$333K |
| DRAFT ACCREC live amount | $84,700 | **$0** | ↓ Centrecorp voided |
| ABN issued | 🔴 OPEN/LATE | 🟡 **LIKELY** (runbook template has "ABN 36 697 347 676") | ↑ evidence surfaced |
| Pty Xero file | 🔴 OPEN/LATE | 🔴 **STILL NOT OPEN** (confirmed 2026-06-01) | → |
| D&O insurance binding | 🔴 DUE IN 10 DAYS | 🔴 **18 DAYS PAST DEADLINE** | ↓ ESCALATED |
| Novation letters sent | 0 | **0** | → unchanged |
| Novation template | 🟡 DRAFTED | 🟡 DRAFTED (same file, not sent) | → unchanged |
| New entity Xero playbook | ✅ exists | ✅ exists | → |
| Pty test-invoice runbook | 0 | **1** (2026-06-01, prerequisites unchecked) | 🆕 |
| Xero data quality work | in-progress | **5 new dedicated plans/sessions** | 🆕 active |
| Harvest subsidiary planning | 🔴 DECISION MADE, NOT EXECUTED | 🟡 IN ACTIVE PLANNING | 🆕 |
| Status: DONE | 6 (~10%) | 6 (~10%) | → |
| Status: IN PROGRESS | 8 (~14%) | 10 (~17%) | ↑ +2 |
| Status: NOT STARTED | 32 (~55%) | 30 (~52%) | ↓ −2 |
| Status: NOT YET DUE/BLOCKED | 12 (~21%) | 12 (~21%) | → |

### Material changes — Q3

**The receivables outcome is remarkable and de-risks the migration significantly.** $333K off the sole trader's book means the cutover is cleaner — fewer contested receivables, less ambiguity about which entity pays what. Snow's $132K payment and Centrecorp's void removes the two highest-profile ambiguities from the funders-to-notify list.

**🔴 Call-out: Pty Xero not open with 19 days to go.** This is the single most critical item in the entire ecosystem right now. The test-invoice runbook was written 2026-06-01 with all prerequisites unchecked. If the Pty Xero opened between 2026-06-01 and today (2026-06-11), the DB would show a second `xero_tenant_id` after the next Xero sync. It doesn't. Either the Pty Xero opened but hasn't been synced yet, or it hasn't opened. Ben to confirm immediately. If it's not open, invoking Rule 2 (honest delay over silent mis-attribution) is now a real option and should be discussed with Standard Ledger this week.

**🔴 Call-out: D&O insurance 18 days past deadline.** Pty was registered 2026-04-24. Standard 30-day D&O window expired 2026-05-24. Today is 2026-06-11. Zero insurance ACCPAY in Xero. Directors are either:
a) Covered under a policy arranged outside Xero (no Xero evidence), or
b) Operating as directors without D&O cover for 48 days.

Option (a) is possible — BizCover/Steadfast quote could be paid from a personal card and never entered in Xero. Option (b) is a governance failure. Ben to confirm the policy status today. If not bound, BizCover can issue same-day for a tech company of this size.

**🟢 What did move in the right direction:**
- ABN likely issued (evidence from runbook template).
- Xero data quality work is active (pushback sessions, close-the-loop plan) — this is the underlying work that Standard Ledger needs before reviewing the mapping.
- Harvest subsidiary has active planning (two new plan files since last pass).
- $333K cleared from receivables.
- Pty test-invoice runbook written — one run away from confirming the stack is cutover-ready.

---

## Cross-question verdict

**Q1 → Q3 chain:** The receivables clearance is good news for the migration. But the chain that matters is: **ABN → Pty Xero → bank details confirmed → novation letters sent → 30 June cutover clean.** The ABN appears issued. The Pty Xero is the missing link. If it opens this week and the test invoice runs clean, novation letters can go out in the last two weeks of June. Tight but feasible.

**Q2 → Q3:** Project codes are clean. No project-level migration risks surfaced in Q2 that Q3 hasn't already captured.

**MRFF → Q3:** The MRFF partnership (deadline 2026-06-26) will produce its first invoice in FY27 under the Pty. This requires the Pty Xero to be live and the ACN/ABN to be on the invoice template. It is a concrete, immediate reason to open the Pty Xero now, before the MRFF conversation happens.

**Overall trajectory:** The financial cleanup is ahead of schedule. The structural setup is behind schedule. With 19 days left, the key question is whether Pty Xero + D&O + novation letters can close in that window or whether Rule 2 applies and the cutover date slips. That decision needs to be made this week.

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-06-11|Q1 funder alignment — 2026-06-11]]
- [[project-truth-state-2026-06-11|Q2 project truth-state — 2026-06-11]]
- [[entity-migration-truth-state-2026-06-11|Q3 entity migration — 2026-06-11]]
- [[funder-alignment-2026-05-14|Q1 — 2026-05-14 prior pass]]
- [[project-truth-state-2026-05-14|Q2 — 2026-05-14 prior pass]]
- [[entity-migration-truth-state-2026-05-14|Q3 — 2026-05-14 prior pass]]
- [[index|ACT Wikipedia]]
