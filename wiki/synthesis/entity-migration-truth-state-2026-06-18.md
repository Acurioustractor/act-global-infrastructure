---
title: Entity migration truth-state — 12 days to cutover, NAB blocked, holdco decision due today
summary: Fourth pass of the ACT Alignment Loop (Q3). 12 days to cutover. Pty Xero not open. NAB blocked on Nick's trust docs as of 2026-06-12. Section 12 (2026-06-12 Standard Ledger call) added a new blocker — holdco + ACT Projects subsidiary structure decision was due 2026-06-19. Novation letters on HOLD pending that decision. D&O insurance 25 days past the 30-day deadline. Outstanding ACCREC $291,560. MRFF first invoice sequencing requires Pty Xero.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover]
status: active
date: 2026-06-18
---

# Entity migration truth-state — 2026-06-18

> Fourth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. Sources: migration checklist at `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` (last verified 2026-05-08, addenda through 2026-06-12), Supabase (`xero_invoices`, `bank_statement_lines`, `xero_tenant_id`), and `thoughts/shared/drafts/**` + `thoughts/shared/plans/**`. DB queried 2026-06-18. Prior pass: [[entity-migration-truth-state-2026-06-11|2026-06-11]].

## Headline findings

1. **12 days to cutover. The critical path is broken.** The Pty has no open Xero file. NAB account application is BLOCKED on Nick's trust documentation — confirmed as of the 2026-06-12 Standard Ledger call. Without banking: no Pty Xero. Without Pty Xero: no test invoice, no payroll, no Pty invoicing from 1 July. Cutover Rule 2 may apply (delay until genuinely live, not aspirational date).

2. **Section 12 (2026-06-12 Standard Ledger call) added new scope and a new BLOCKER.** The Standard Ledger structure call on 12 June opened four decisions:
   - **Holdco + ACT Projects subsidiary** — until decided, novation letters are on HOLD and new contract naming is frozen. Decision was due by 2026-06-19 (tomorrow/today).
   - **Butterfly CLG** — DGR lawyer question list to send before 2026-06-26 handover.
   - **Farm stays personal** — no farm entity, Nick confirms. Simplifies §1.
   - **FY26 founder draw** — ~$200K each before 30 June. Director's loan + payroll + D11.5 Knight Photography invoices.

3. **D&O insurance is 25 days past its 30-day deadline.** Registered 2026-04-24. Standard practice: bind D&O within 30 days = deadline 2026-05-24. Today: 2026-06-18. Zero ACCPAY from any insurer in Xero. If a policy has been bound off-books (Standard Ledger referral, direct engagement) the policy number needs to be documented. If not bound at all, this is a live governance risk with 12 days remaining.

4. **Novation letters remain unsent — now compounded by the holdco decision.** The template (`thoughts/shared/drafts/novation-letter-templates.md`) was drafted at the May 14 pass. But Section 12 explicitly says: "hold novation letters and any new from-1-July contract naming until holdco decision 1 lands." That decision is due today. Once resolved: letters must go out this week to meet the 30 June cutover.

5. **Xero tenant count: still 1.** DB query confirms `xero_tenant_id` count = 1 (Nic's sole trader, 2,233 invoices). No Pty Xero tenant appears. Bank statement lines: still "NAB Visa ACT #8815" only (data to 2026-03-31; no Pty NAB account visible).

6. **ABN confirmed issued.** The `2026-06-01-pty-test-invoice-runbook.md` (from the June 11 synthesis) included "ABN 36 697 347 676" — first positive evidence the ABN was granted. This unblocks GST rego and is a prerequisite for Xero and banking.

---

## Items × evidence × risk

Days until 30 June 2026 cutover: **12 days**.

### Section 1 — Entity setup

| Item | Status | Change since June 11 |
|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ DONE | → |
| Director IDs confirmed | ⚠️ UNVERIFIED | → unchanged since baseline |
| ABN application (Pty) — ABN 36 697 347 676 | 🟡 LIKELY ISSUED (test-invoice runbook) | → confirmed in June 11 pass |
| GST registration (Pty) | 🟡 LIKELY ISSUED (paired with ABN) | → |
| Standard Ledger briefed | ✅ DONE (ongoing) | → |
| Shareholders Agreement | 🔴 NOT STARTED (Rule 4: overdue since Week 2) | → unchanged 4 passes |
| Operating entity decision (holdco vs single Pty) | 🔴 DUE 2026-06-19 (TOMORROW) | 🆕 Section 12 |

### Section 2 — Banking and payment rails

| Item | Status | Change |
|---|---|---|
| NAB business account (Pty) | 🔴 BLOCKED — Nick's trust docs not yet provided | 🔴 explicitly confirmed blocked (June 12 call) |
| Stripe account (Pty) | 🔴 OPEN (blocked on NAB) | → |
| PayID / Osko on Pty NAB | ⏳ BLOCKED ON NAB | → |
| Auto-debits audit + migrate | 🟡 OPEN (38 vendor patterns in DB) | → |

### Section 3 — Xero

| Item | Status | Change |
|---|---|---|
| Pty Xero file opens | 🔴 OPEN/CRITICAL — blocked on NAB | → no progress 4 passes |
| Pty Xero launch playbook | ✅ ARTEFACT READY | → |
| Pty test-invoice runbook | 🟡 READY TO EXECUTE — awaiting Pty Xero + NAB | → |
| Final sole trader BAS (Q4 FY26) | ⏳ NOT YET DUE (28 July) | → |
| Sole trader → Pty mapping export | ✅ GENERATED (D11.4) | → |

### Section 4 — Grants and funders

#### Outstanding receivables

| Counterparty | Invoice | Amount | Status | Age | Action |
|---|---|---:|---|---:|---|
| **Rotary eClub** | INV-0222 | $82,500 | AUTH | 434d | 🔴 Chase or write off this week — last chance |
| **Sonas Properties** | INV-0316 | $44,000 | AUTH | 122d | 🟡 Harvest-related; confirm timing |
| **Homeland School** | INV-0303 | $44,000 | AUTH | 31d | 🟡 Verify amount (was $4.95K at baseline) |
| **Social Impact Hub** | INV-0289 | $21,780 | AUTH | 212d | ⚠️ Verify — may be data artefact |
| **Mounty Aboriginal Youth** | INV-0334 | $22,000 | AUTH | 0d | 🟢 New — assign project code |
| **Regional Arts Australia** | INV-0302 | $16,500 | AUTH | 185d | 🟡 Partial collection; chase remainder |
| **Tandanya** | INV-0332 | $16,500 | AUTH | 1d | 🟢 New — assign project code |
| **Julalikari Council** | INV-0335 | $15,000 | AUTH | 0d | 🟢 New — assign project code |
| **Brodie Germaine Fitness** | INV-0325 | $15,400 | AUTH | 64d | 🟡 Unchanged 4 passes |
| **Berry Obsession** | INV-0309 | $13,000 | AUTH | 128d | ⚠️ Verify — not in June 11 count |
| **Justice Reform Initiative** | INV-0333 | $880 | AUTH | 1d | 🟢 New — assign project code |
| **TOTAL** | | **$291,560** | | | |

#### Novation work status

| Item | Status | Change |
|---|---|---|
| Novation letter template | 🟡 DRAFTED — hold pending holdco decision (§12) | → template exists, blocked |
| Novation letters to funders | 🔴 ON HOLD — Section 12 explicitly blocks until entity decision | 🆕 new blocker |
| Operating entity decision (holdco) | 🔴 DUE 2026-06-19 — unblocks entire novation batch | 🆕 |
| MRFF first invoice | Requires Pty Xero + entity decision | 🆕 |

### Section 5 — Commercial contracts

All items remain 🔴 NOT STARTED / ON HOLD pending entity decision.

| Item | Status |
|---|---|
| Innovation Studio novation letters | 🔴 NOT STARTED — on hold §12 |
| JusticeHub partnerships | 🔴 NOT STARTED — on hold §12 |
| Goods on Country buyer relationships | 🔴 NOT STARTED — on hold §12 |
| Harvest lease (subsidiary name TBD) | 🔴 Subsidiary not incorporated; D11.1 decision needs §12 resolution first |
| Farm lease (Nic ↔ Pty) | 🟢 DEFERRED — farm stays personal (§12 D3) |

### Section 6 — IP

All items remain 🔴 NOT STARTED. IP assignment deed cannot be drafted until entity decision resolves which entity owns IP.

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| **Directors & Officers** | **2026-05-24 (30d post-reg)** | 🔴 **25 DAYS PAST DEADLINE — no Xero evidence** | ↓ urgency: immediate |
| Public Liability $20M | Before Harvest lease | 🔴 NOT STARTED | → |
| Professional Indemnity | 1 July 2026 | 🔴 NOT STARTED | → |
| Workers Comp | First employee | ⏳ NOT YET DUE | → |
| Insurance broker selection | Was "Week 1" | 🔴 NOT STARTED | → 12 weeks overdue |

### Section 8 — Governance

| Item | Status |
|---|---|
| Shareholders Agreement | 🔴 NOT STARTED — Rule 4 says Week 1-2; now 8 weeks overdue |
| Pty minute book | 🟡 UNVERIFIED (no artefact visible) |

### Section 9 — Subscriptions and tooling

All items remain 🔴 NOT STARTED / blocked on Pty Xero + banking.

### Section 10 — Communications

All items remain 🔴 NOT STARTED. Footer updates and announcement email depend on entity decision and Xero being live.

### Section 11 — Standard Ledger decisions (2026-05-05)

| Decision | Status |
|---|---|
| D11.1 Harvest subsidiary | 🟡 IN PROGRESS — D11.1 confirmed, but subsidiary not yet incorporated; entity question (§12) must resolve first |
| D11.2 Founder payroll ($10K/mo + director's loan) | 🟡 IN PROGRESS — payroll not yet running (Pty Xero not live) |
| D11.3 Dext per-project email forwarding | 🟡 OPEN |
| D11.4 Sole trader → Pty mapping export | ✅ DONE |
| D11.5 Knight Photography FY26 invoicing | 🔴 Phase 1 ($100K inv 15078) still not raised; 12 days left to get it paid before FY26 close |

### Section 12 — Standard Ledger structure call (2026-06-12)

| Decision | Status | Due |
|---|---|---|
| Holdco + ACT Projects subsidiary (entity decision) | 🔴 DUE — blocks novation letters, contracts, MRFF invoice | 2026-06-19 (today) |
| Butterfly CLG (DGR lawyer question list) | 🔴 OPEN | Before 2026-06-26 |
| Farm stays personal (Nick to confirm) | 🟡 PENDING Nick's confirmation | ASAP |
| FY26 founder draw (~$200K each, all mechanisms) | 🔴 OPEN — 12 days left; $200K is significant | Before 2026-06-30 |
| Inv 15078 ($100K Knight Photography) | 🔴 NOT RAISED | Before 2026-06-30 |
| FY26 R&D window plan (engagement papers, split Q4 invoices, pay by 30 Jun) | 🔴 OPEN | Before 2026-06-30 |

---

## Status summary

| Status | Count (approx) | Share |
|---|---:|---:|
| ✅ DONE | ~7 | ~10% |
| 🟡 IN PROGRESS / PARTIAL | ~10 | ~14% |
| 🔴 NOT STARTED / BLOCKED / OPEN | ~42 | ~61% |
| ⏳ NOT YET DUE | ~10 | ~15% |
| **Total items** | **~69** | |

---

## Cutover risk map — 12-day window

### 🚨 Must resolve THIS WEEK (2026-06-18 to 2026-06-23)

1. **Holdco entity decision (§12 D1)** — every novation letter, every new contract, MRFF invoice is blocked. Due today (June 19).
2. **NAB account unblocked (Nick's trust docs)** — blocks Pty Xero, Stripe, all Pty banking.
3. **Pty Xero file opens** — blocks first Pty invoice from 1 July.
4. **D&O insurance binding confirmed** — either get the policy number or bind immediately.
5. **Rotary INV-0222 — write off or chase** — last week.
6. **Knight Photography Inv 15078 ($100K) raised and paid** — must clear by June 30 for FY26 R&D window.
7. **FY26 founder draw mechanics agreed** — amounts, vehicles, July 1 deadline.
8. **Shareholders Agreement** — overdue since Week 2; critical before any external funder due-diligence.

### 🟠 Must ship by 2026-06-26

9. **Novation letters sent** (after entity decision) — funders, commercial contracts.
10. **IP assignment deed drafted + signed**.
11. **DGR lawyer question list sent** (Butterfly) — before June 26 handover.
12. **MRFF Palmer conversation** — last date before relay departure June 27.

### 🟡 Complete by 2026-06-29 (last working day)

13. Final sole trader invoices raised.
14. Sole trader Xero closed to new entries.
15. Email/website footers staged.
16. Announcement email drafted.
17. New June invoices (INV-0332/0333/0334) project-coded.

### Cutover rule 2 contingency

If Pty Xero + NAB are not invoice-ready by 1 July, the sole trader continues trading under Rule 2 (honest delay over silent mis-attribution). The announcement email and footer updates happen when the actual cutover occurs. The MRFF first invoice cannot go to the sole trader — it must wait for the Pty.

---

## Open questions — DB cannot answer

1. **Is D&O insurance actually bound?** No Xero evidence, but may be off-books. Ben to confirm policy number.
2. **What is Nick's trust documentation blocker for NAB?** Is it a specific document, timeline? What's the resolution path?
3. **Has the holdco entity decision been made (as of today June 19)?** This is the single most important binary.
4. **Aleisha Keating retainer status** — June 11 showed 13 × $450 remaining. Presumably winding down pre-cutover.
5. **Centrecorp relationship** — multiple batches of voided invoices, no new authorized invoice. Is the relationship paused or terminated?

---

## Sources queried

| Source | Query | As-of |
|---|---|---|
| `xero_invoices` | ACCREC AUTH+DRAFT amount_due > 0 | 2026-06-18 |
| `xero_invoices` | GROUP BY xero_tenant_id | 2026-06-18 |
| `bank_statement_lines` | GROUP BY bank_account | 2026-06-18 (data to 2026-03-31) |
| `xero_invoices` | status NOT IN (DELETED,VOIDED,PAID) GROUP BY status,type | 2026-06-18 |
| Checklist | `act-entity-migration-checklist-2026-06-30.md` | file (addenda to 2026-06-12) |
| Drafts | `ls thoughts/shared/drafts/` filtered for migration keywords | 2026-06-18 |
| Plans | `ls thoughts/shared/plans/` filtered for entity/migration | 2026-06-18 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop]]
- [[funder-alignment-2026-06-18|Q1 funder alignment — same pass]]
- [[entity-migration-truth-state-2026-06-11|Q3 prior pass — 2026-06-11]]
- [[index|Synthesis index]]
