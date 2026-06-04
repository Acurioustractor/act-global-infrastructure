---
title: Alignment Loop drift — 2026-04-24 to 2026-05-08
summary: 14-day drift summary across all three Alignment Loop questions. Outstanding receivables fell $207K (Snow paid, PICC cleared, Centrecorp resolved). Cutover infrastructure still unblocked — no Pty Xero, no NAB. D&O deadline is 16 days away. Section 11 scope added from Standard Ledger meeting. Novation template drafted.
tags: [synthesis, alignment-loop, drift, entity-migration, funders, projects]
status: active
date: 2026-05-08
---

# Alignment Loop drift — 2026-04-24 to 2026-05-08

> 14-day drift surface. Baseline: the three 2026-04-24 syntheses. Second pass: the three 2026-05-08 syntheses. This document surfaces what moved, what stalled, and what's approaching a hard deadline.

---

## TL;DR — what moved since 24 Apr

1. **$207K in receivables cleared — Snow paid ($132K), PICC pair paid ($113K), Centrecorp resolved ($84.7K). Total outstanding ACCREC down from $507K to ~$300K.** Rotary eClub INV-0222 ($82.5K, now 420d) is the lone unresolved critical receivable. The money picture improved materially. The plumbing didn't: Pty Xero still unopened, NAB still sole trader only, ABN still pending.

2. **Standard Ledger meeting (2026-05-05) added Section 11 scope and one ✅.** Harvest becomes a subsidiary (not a project line), founder payroll agreed at $10K/mo, Knight Photography FY26 invoices to be raised, D11.4 mapping export script shipped. Novation letter template drafted — the first migration artefact that didn't exist at baseline.

3. **D&O insurance is 16 days from its ~30-day-post-registration deadline (2026-05-24). No binding evidence.** Shareholders Agreement is also overdue per Rule 4 (should be signed by Week 2). These two governance items are the highest-urgency actions right now.

---

## Q1 — Funder drift

### Leading paragraph

The funder receivables picture improved significantly. Snow Foundation paid their $132K invoice (the warmest and most important relationship is now migration-ready for a Pty notice conversation). PICC, Just Reinvest, SMART, and one Regional Arts invoice also cleared. The funders.json ledger expanded from 14 to 24+ entries — all 7 previously absent paid funders now have stubs. The two most critical outstanding items remain: Rotary eClub at 420+ days (no decision made), and the Minderoo ask which moved from pending to paused following Lucy's restructure signal on 2026-05-14.

### What changed — Q1

| Metric | 2026-04-24 | 2026-05-08 | Direction |
|---|---|---|---|
| Outstanding ACCREC (funder subset: Snow + Rotary + Centrecorp) | $299,200 | ~$82,500 (Rotary only) | ↓ Snow paid, Centrecorp resolved |
| Total outstanding ACCREC (all counterparties) | $507,350 | ~$300,400 | ↓ Major collections |
| Snow Foundation INV-0321 | AUTHORISED 37d | ✅ PAID | ↑ |
| Centrecorp Foundation INV-0314 | DRAFT 70d ($84.7K) | RESOLVED (voided or paid decision) | ↑ |
| Rotary eClub INV-0222 | AUTHORISED 380d ($82.5K) | AUTHORISED 420d+ ($82.5K) | ↓ 40 more days, no decision |
| funders.json funder count | 14 entries (updated 2026-04-09) | 24+ entries (updated 2026-05-07) | ↑ |
| funders.json wiki-absent funders | 7 | 0 | ↑ All stubbed |
| Stage errors in funders.json | 2 (Snow `warm`, PRF `cold`) | 0 | ↑ Fixed |
| Minderoo ask | ask-pending $2.9M, deadline 2026-05-15 | `paused` — Minderoo internal restructure | → No ACT-side action available |
| Silent-90-plus funder contacts | ~10 (107-day Jan batch) | ~6 (growing toward 12 by June) | ↓ Growing |
| June Canavan Foundation (ghost stage) | `active-partner` unverified | `active-partner` unverified | → Still unvalidated |

**Material changes:** Snow paid (✅ relationship now clear for migration notice). Centrecorp resolved. Rotary unchanged — 53 days left to decide.

---

## Q2 — Project truth-state drift

### Leading paragraph

Minimal structural change — which is expected for a 14-day window. Three new background codes added (ACT-GS, ACT-PB, ACT-DLB), ACT-PS gained its canonical_slug (partially closing the only real authoring backlog gap from baseline), and ACT-CT / ACT-BV gained Xero entries. Score distribution improved by ~2-3 projects moving from 3/4 to 4/4. Acceptance criteria continue to hold: no active project below 2/4.

### What changed — Q2

| Metric | 2026-04-24 | 2026-05-08 | Direction |
|---|---|---|---|
| Total codes in config | 74 (v1.7.0) | 75 (v1.8.0) | ↑ +1 (ACT-GS, ACT-PB, ACT-DLB added) |
| 4/4 score count | 28 | ~30–31 | ↑ |
| 3/4 score count | 16 | ~13–14 | ↑ |
| 2/4 score count | 26 | ~27–28 | ↓ (new background codes at 2-3/4) |
| 1/4 score count (config ghosts) | 4 | 4 | → |
| 0/4 score count | 0 | 0 | → ✅ acceptance criterion |
| Active/ideation projects scoring <2/4 | 0 | 0 | → ✅ acceptance criterion |
| Authoring backlog — real gaps | 1 (ACT-PS no canonical_slug) | 0–1 (canonical_slug added; wiki article TBC) | ↑ Partially resolved |
| Codes missing canonical_slug | 40+ | 38+ | ↑ Marginal improvement |
| Config ghost codes (non-projects) | 4 (APO, AMT, EFI, GCC) | 4 | → Not actioned |
| Xero codes with NEW entries since baseline | — | ACT-CT (inv:1), ACT-BV (inv:1+txn:8) | ↑ |

**Material changes:** None critical. ACT-PS canonical_slug is a config hygiene win. Three new background codes keep the total accurate.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

### Leading paragraph

The receivables book improved dramatically — ~$207K cleared in 14 days. But the cutover infrastructure made zero progress: still 1 Xero tenant, still 1 bank account, no ABN issued, no NAB Pty account, no Shareholders Agreement signed. The Standard Ledger meeting on 2026-05-05 added significant new scope (Section 11) and produced one ✅ (D11.4 mapping export) plus one 🟡 (novation letter template drafted). The most alarming single number: D&O insurance is due by 2026-05-24 — 16 days from today. No broker engagement is visible in any source.

### What changed — Q3

| Metric | 2026-04-24 | 2026-05-08 | Direction |
|---|---|---|---|
| Days until cutover | 67 | 53 | ↓ (clock ticking) |
| xero_tenant_id count | 1 (1,742 invoices) | **1** (2,227 invoices) | → No Pty Xero opened |
| Distinct bank accounts in `bank_statement_lines` | 1 (NAB Visa ACT #8815) | **1** (NAB Visa ACT #8815) | → No Pty NAB opened |
| Total outstanding ACCREC | $507,350 | ~$300,400 | ↓ $206,950 cleared |
| DRAFT ACCREC invoices | 2 (incl. INV-0314 $84.7K) | 2 ($0 amount_due) | ↑ Centrecorp draft resolved |
| ✅ DONE item count | 5 | 6 | ↑ D11.4 mapping export shipped |
| 🟡 IN PROGRESS item count | 7 | 8 | ↑ Novation template drafted |
| 🔴 NOT STARTED item count | 28 | ~40 | ↓ Section 11 new scope added |
| ⏳ NOT YET DUE item count | 13 | 13 | → |
| Total items tracked | 53 | ~67 | ↑ Section 11 added 14 new items |
| Migration-keyword drafts in `thoughts/shared/drafts/` | **0** | **1** (novation-letter-templates.md) | ↑ |
| Migration-related new plans | 0 | 2+ (new-entity-xero-launch-playbook, etc.) | ↑ |
| D&O insurance status | 🟡 DUE IN ~30 DAYS | 🔴 DUE IN 16 DAYS (2026-05-24) | ↓ Critical |
| Shareholders Agreement | 🔴 NOT STARTED | 🔴 NOT STARTED (Rule 4: overdue) | ↓ Rule 4 says Week 1-2 |
| Director IDs confirmed | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | → Blocks NAB application |
| ABN (Pty) | 🔴 OPEN | 🔴 OPEN (target was week 1-2 of May) | ↓ Overdue |
| Novation letter template | 🔴 NOT STARTED | 🟡 DRAFTED | ↑ `drafts/novation-letter-templates.md` |
| Funder novation letters sent | 0 | 0 | → Template ready but not sent |
| Harvest lease approach | Direct to Pty | Via subsidiary (D11.1) | ↑ Cleaner architecture |
| Harvest subsidiary structure | Not scoped | 🔴 OPEN (D11.1 — draft needed) | New scope |
| Knight Photography FY26 invoices | Not scoped | 🔴 OPEN (D11.5) | New scope |

### Specific item transitions

| Item | Baseline | 2026-05-08 | Direction |
|---|---|---|---|
| INV-0314 Centrecorp | DRAFT 70d | ✅ RESOLVED | 🟢 Decision made |
| Director IDs confirmation | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | 🔴 Still open |
| NAB Pty account | 🔴 Not applied | 🔴 Not applied | 🔴 No progress |
| ABN application | 🔴 OPEN | 🔴 OPEN (overdue) | 🔴 Slipped |
| D&O insurance | 🟡 Due ~30d | 🔴 Due in 16d | 🔴 Critical urgency |
| Novation letter template | 🔴 NOT STARTED | 🟡 DRAFTED | 🟢 Unlock achieved |
| Shareholders Agreement | 🔴 NOT STARTED | 🔴 NOT STARTED | 🔴 Rule 4 overdue |
| Migration-keyword draft count | 0 | 1 | 🟢 First artefact on disk |

---

## What the drift says about trajectory

- **Money picture:** materially better. $207K cleared in 14 days. Only Rotary ($82.5K, 420d) remains as a hard decision.
- **Legal/governance picture:** worse than the calendar allows. SHA, D&O, and ABN are all either late or urgent. If D&O isn't bound before 2026-05-24, ACT's directors are operating an uninsured Pty Ltd from April 24 onward.
- **Operational preparation picture:** slow but moving. The first novation template exists. The Xero launch playbook exists. The mapping export script shipped. But the actual Pty infrastructure (Xero file, NAB account, ABN) hasn't moved.

**If nothing changes in the next week:** The D&O window closes on 2026-05-24. That's the immovable hard stop. Everything else can theoretically compress into the final 30 days, but D&O cannot be retroactively bound.

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-04-24|Q1 baseline]] · [[funder-alignment-2026-05-08|Q1 second pass]]
- [[project-truth-state-2026-04-24|Q2 baseline]] · [[project-truth-state-2026-05-08|Q2 second pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 baseline]] · [[entity-migration-truth-state-2026-05-08|Q3 second pass]]
- [[index|ACT Wikipedia]]
