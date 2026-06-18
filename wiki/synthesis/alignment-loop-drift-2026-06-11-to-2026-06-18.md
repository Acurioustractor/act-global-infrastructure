---
title: Alignment Loop drift — 2026-06-11 to 2026-06-18
summary: 7-day drift surface across Q1 (funder alignment), Q2 (project truth-state), and Q3 (entity migration). 12 days to cutover. NAB still blocked. Holdco decision was due today. Novation letters on HOLD. D&O 25 days past deadline. New June invoices reflect pre-cutover work surge. Pty Xero not open.
tags: [synthesis, alignment-loop, drift, entity-migration, funders, projects]
status: active
date: 2026-06-18
---

# Alignment Loop drift — 2026-06-11 to 2026-06-18

> Fourth diff of the [[act-alignment-loop|ACT Alignment Loop]] Phase 0 artefacts, 7 days after the 2026-06-11 third pass. Three questions compared:
> - Q1: [[funder-alignment-2026-06-11|funder-alignment-2026-06-11]] → [[funder-alignment-2026-06-18|funder-alignment-2026-06-18]]
> - Q2: [[project-truth-state-2026-06-11|project-truth-state-2026-06-11]] → [[project-truth-state-2026-06-18|project-truth-state-2026-06-18]]
> - Q3: [[entity-migration-truth-state-2026-06-11|entity-migration-truth-state-2026-06-11]] → [[entity-migration-truth-state-2026-06-18|entity-migration-truth-state-2026-06-18]]

---

## TL;DR — what moved since 11 June

- **Q3 CRITICAL: NAB account still blocked on Nick's trust docs (confirmed June 12 call). Holdco entity decision was due today (June 19). Novation letters explicitly on HOLD pending that decision. Pty Xero: not open. D&O: 25 days past its deadline. 12 days to cutover.**
- **Q1: $127K in new ACCREC appeared in the outstanding book — 4 new June invoices ($54K) to ACT-JH clients reflect a pre-cutover work surge, plus 3 older invoices ($79K) that weren't counted in the June 11 total. Rotary INV-0222 is now 434 days. MRFF deadline is 8 days away.**
- **Q2: No structural changes. 74 codes, 98 wiki articles, ACT-PS still missing. One stable quarter in an otherwise volatile cutover period.**

---

## Q1 — Funder drift

### What changed — Q1

| Metric | 2026-06-11 | 2026-06-18 | Direction |
|---|---|---|---|
| Total ACCREC outstanding | $164,250† | **$291,560** | ↑ new invoices + 3 previously uncounted |
| Rotary eClub INV-0222 | AUTH **428d** | AUTH **434d** | ↓ +6 days, no decision |
| New June ACCREC invoices | 0 | **4 invoices ($54,380)** — Tandanya, Mounty, Justice Reform, Julalikari | 🆕 pre-cutover work surge |
| Previously uncounted ACCREC | — | Sonas $44K + SIH $21.8K + Berry $13K = $78.8K | ⚠️ reconcile with June 11 query |
| Centrecorp status | VOIDED | VOIDED — no new invoice | → relationship stalled post-void |
| Snow Foundation | PAID | PAID | → |
| MRFF deadline | 2026-06-26 (15 days) | 2026-06-26 **(8 days)** | ↓ urgent |
| `funders.json` version | v2 (updated 2026-06-05) | v2 (unchanged) | → |
| `funders.json` entry count | ~45 | ~45 | → |
| New invoices missing project codes | 0 | **4** (INV-0332/0333/0334/0335) | ⚠️ tag before Xero closes |

†June 11 total of $164,250 appears to have missed Sonas INV-0316 ($44K), Social Impact Hub INV-0289 ($21.8K), Berry Obsession INV-0309 ($13K) — three invoices totalling $78.8K that appear in the current query. True June 11 outstanding was likely $243K+, not $164K.

### Material changes — Q1

**The apparent $127K jump is not deterioration.** It reflects: (a) 4 new invoices to real counterparties for work done in June, which will collect post-cutover to sole trader under Rule 1; (b) 3 older invoices now surfacing clearly in the query. The underlying receivables position is broadly stable.

**The time-critical action is Rotary INV-0222 — 434 days and counting.** The sole trader closes in 12 days. If this invoice is not chased or written off before 30 June, it becomes an open receivable on a closed entity. This has been flagged in every pass since April.

**MRFF window closes 2026-06-26 — 8 days.** The Palmer conversation needs to happen this week. ACT is a named partner in an awarded grant. The relay tour through Tennant Creek is happening now — the Year 1 site engagement for a grant-named site is live. This is the last opportunity before the relay departs June 27. First MRFF invoice goes to Pty — which requires Pty Xero to be live.

---

## Q2 — Project truth-state drift

### What changed — Q2

| Metric | 2026-06-11 | 2026-06-18 | Direction |
|---|---|---|---|
| Project codes in config | 74 | 74 | → |
| Wiki project articles | 98 | 98 | → |
| Score 4/4 count | ~33 | ~33 | → |
| Active/ideation projects <2/4 | 0 | 0 | → ✅ criterion holds |
| Authoring backlog real gaps | 1 (ACT-PS) | 1 (ACT-PS) | → 4th consecutive pass |
| New June invoices w/o project codes | 0 | 4 | ⚠️ tag before Xero closes |
| ACT-GCC / ACT-EFI config ghosts | present | present | → still not actioned |

### Material changes — Q2

None critical. The only flag worth noting: 4 new June invoices (Tandanya, Mounty Aboriginal Youth, Justice Reform Initiative, Julalikari) have no `project_code`. These are real invoices for work done under the sole trader. They need to be tagged before Xero closes — likely ACT-JH for Justice Reform, ACT-JH or ACT-GD for the others based on counterparty context.

**ACT-PS persists.** Four passes since April. This is the sole outstanding authoring backlog item. 30 minutes to write. With PICC invoices voided, the framing should reflect the current state of the On-Country Photo Studio, not the voided invoice history.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

### What changed — Q3

| Metric | 2026-06-11 | 2026-06-18 | Direction |
|---|---|---|---|
| Days until cutover | 19 | **12** | ↓ |
| xero_tenant_id count | 1 (2,227 invoices) | **1** (2,233 invoices) | → NO CHANGE |
| Bank accounts | 1 (NAB Visa ACT #8815) | **1** (NAB Visa ACT #8815) | → NO CHANGE |
| NAB Pty account | ❓ unknown (data stale to Mar 31) | 🔴 **CONFIRMED BLOCKED** — Nick's trust docs (June 12 call) | ↓ |
| Total ACCREC outstanding | $164,250 | $291,560 | ↑ (new invoices + query reconciliation) |
| D&O insurance | 18 days past deadline | **25 days past deadline** | ↓ |
| Novation letters | 🔴 NOT SENT | 🔴 **ON HOLD** — Section 12 blocks until entity decision | ↓ new blocker |
| Holdco entity decision | Not in scope | 🔴 **DUE 2026-06-19** — new critical blocking item | 🆕 |
| Shareholders Agreement | 🔴 not started | 🔴 not started | → |
| Section 12 addendum (June 12 call) | not in prior pass | 🆕 4 new decisions/blockers | 🆕 |
| ✅ DONE item count | ~6 | ~7 | ↑ (small) |
| 🔴 NOT STARTED / BLOCKED item count | ~40 | ~42 | ↓ more items, more blocked |
| D11.5 Knight Photography Inv 15078 | not raised | still not raised | 🔴 12 days left |
| FY26 founder draw ($200K each) | not tracked | 🔴 OPEN — 12 days | 🆕 |

### Material changes — Q3

**The most alarming single development in this pass: Section 12 added a new BLOCKING constraint.** The June 12 Standard Ledger structure call opened the holdco vs. operating entity question. The plan explicitly says: "hold novation letters and any new from-1-July contract naming" until this is resolved. That decision was due today (June 19). If it is not made today, novation letters cannot go out, new contracts cannot name an entity, and the entire §4 + §5 novation work cannot proceed. 12 days to cutover.

**NAB is confirmed blocked.** The June 11 pass noted "NAB status unknown (data stale to March 31)." The June 12 call note in the checklist explicitly states: "NAB account still blocked on Nick's trust docs." This is not a data lag — it's a real block. Without NAB: no Pty Xero, no Stripe, no auto-debit migration, no Pty invoicing.

**The entity migration is on a 12-day knife-edge.** The sequence is:
1. ~~Holdco decision~~ → today (June 19) → unblocks novation letters + contracts + MRFF naming
2. Nick provides trust docs → unblocks NAB account
3. NAB account opens → unblocks Pty Xero
4. Pty Xero opens → test invoice → payroll → Stripe → Pty invoicing 1 July

If step 1 slips past today, steps 2-4 compress further. If steps 1-3 are not done by June 25, the 1 July cutover date is not achievable and Rule 2 (honest delay) applies.

**Positive note:** $333K in receivables has cleared since the April baseline. The money is better than the plumbing.

---

## What didn't move (flagged to escalate)

The following items have been flagged 🔴 in every single pass since April 24 with no change:

| Item | Passes flagged | Note |
|---|---:|---|
| D&O insurance | 4 | Now 25 days past deadline. Resolve today. |
| Shareholders Agreement | 4 | Rule 4: should have been done in Week 1-2. |
| Rotary INV-0222 decision | 4 | 434 days, 12 days left. |
| ACT-PS wiki article | 4 | 30 minutes. |
| Insurance broker selection | 4 | Required for 3+ policy types. |
| NAB Pty account | 4 | Now confirmed blocked on a specific document. |
| IP assignment deed | 4 | Cannot draft until entity decision made. |

---

## Acceptance criteria check

| Loop criterion | Status |
|---|---|
| Every "this week" action either done or flagged | ✅ All flagged |
| Every grant in Q1's live list has novation status | 🔴 All on HOLD — Section 12 |
| Drafts-but-not-sent distinguished from sent | ✅ Template exists, none sent |
| Structural DB signals (tenant count, bank accounts) checked | ✅ Both queried |

---

## Sources queried

| Source | As-of |
|---|---|
| `xero_invoices`, `bank_statement_lines`, `xero_tenant_id` | 2026-06-18 |
| `act-entity-migration-checklist-2026-06-30.md` | file (last addenda 2026-06-12) |
| `wiki/narrative/funders.json` | file (updated 2026-06-05) |
| `config/project-codes.json` | v1.8.0 |
| `wiki/projects/**` | filesystem |
| `thoughts/shared/drafts/` | keyword scan |
| `thoughts/shared/plans/` | keyword scan |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop]]
- [[funder-alignment-2026-06-18|Q1 funder alignment — 2026-06-18]]
- [[project-truth-state-2026-06-18|Q2 project truth-state — 2026-06-18]]
- [[entity-migration-truth-state-2026-06-18|Q3 entity migration — 2026-06-18]]
- [[alignment-loop-drift-2026-05-14-to-2026-06-11|Previous drift — 2026-05-14 to 2026-06-11]]
- [[index|Synthesis index]]
