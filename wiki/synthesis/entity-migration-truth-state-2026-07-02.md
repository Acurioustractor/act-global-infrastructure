---
title: Entity migration truth-state — CUTOVER DATE PASSED, Pty Xero not yet in DB
summary: Third pass of the ACT Alignment Loop (Q3), dated 2026-07-02 — two days after the 30 June 2026 cutover date. Only one Xero tenant remains in Supabase (the sole trader). Invoices dated July 2, 2026 are in the sole trader file. Rule 2 (honest delay over silent misattribution) has kicked in. Outstanding receivables at $602,985.84.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover, URGENT]
status: active
date: 2026-07-02
---

# Entity migration truth-state — 2026-07-02

> Third pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. Sources: the 10-section + §11-12 checklist at `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`, Supabase (Xero invoices, tenant state, bank lines), `thoughts/shared/drafts/**`, and `thoughts/shared/plans/**`. Previous pass: [[entity-migration-truth-state-2026-05-14|2026-05-14]].

---

## 🚨 Top-of-page alert

**The 30 June 2026 cutover date has passed. Today is 2 July 2026.**

Supabase shows:
- **One Xero tenant** (`786af1ed-e3ce-42fc-9ea9-ddf3447d79d0` = Nic's sole trader, 2,245 invoices). No second Pty tenant has appeared.
- **One bank account** (`NAB Visa ACT #8815`). No Pty NAB account has appeared.
- **Two invoices dated July 2, 2026** (ALIVE National Centre / MRFF, $66,000 + $101,200) in the sole trader file, plus Mounty Aboriginal Youth $22,000.

**Rule 2 (honest delay over silent misattribution) has activated.** The sole trader continues trading past June 30 because the Pty infrastructure (ABN, NAB, Xero) was not ready. This is the correct and legally cleaner path — the announcement email, website footer, and invoice template updates should NOT go out until the Pty is genuinely live.

The §12 addendum (2026-06-12) revealed an Holdco structure question (decision 1: which entity trades from 1 July) that placed novation letters on hold and may be the cause of the delay.

---

## Headline findings

1. **Pty Xero file not yet open.** Only one Xero tenant in Supabase — the sole trader. MRFF invoices dated today are still hitting the sole trader. Either the Pty Xero is not yet set up, or it is open but not yet synced to Supabase. Given ABN/NAB blockers traced through May 14, the former is more likely.

2. **$345K cleared from the receivable book between May 14 and today.** Snow Foundation INV-0321 ($132K) paid. Centrecorp INV-0314 ($84.7K) resolved. PICC both invoices ($96.8K) paid. SMART ($2.2K), Aleisha retainer (~$12.15K), partial Regional Arts ($16.5K) all cleared. Sole trader's financial housekeeping has been active.

3. **New invoices raised since May 14 total ~$451K**, pushing outstanding ACCREC to $602,985.84 (17 invoices). Sonas Properties has three Harvest-related invoices ($167,838 combined). MRFF/UoM invoices ($167,200) dated today. Homeland School new $44K. Multiple community-org invoices dated June 17-July 2.

4. **§12 addendum (June 12 Standard Ledger call) puts novation letters on hold.** The Holdco structure proposal opened four decisions — the most critical being "which entity trades from 1 July." Until that decision is made, novation letters to funders cannot be sent (they would name the wrong entity). Decision 1 was due by June 19, appears still unresolved from DB evidence.

5. **Migration artefact activity increased.** Since May 14: `minimax-full-migration-2026-05-22.md` in drafts, `2026-06-01-pty-test-invoice-runbook.md` in plans (ready to execute once Pty Xero + NAB are live), `2026-05-17-farm-harvest-goods-charity-alignment.md`, `2026-05-26-harvest-stage-budget.md`, `2026-06-12` Standard Ledger call notes. The plan has been actively worked. The DBsignal lag suggests execution is behind.

6. **No draft matching `announcement|email footer|website footer|Pty invoice template`** found in `thoughts/shared/drafts/`. These are correctly deferred until the Pty is genuinely live (per Rule 2).

---

## Items × evidence × risk

Days since 30 June 2026 cutover: **+2 days (cutover DATE PASSED)**.

### Section 1 — Entity setup

| Item | Evidence | Status | Change since May 14 |
|---|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ confirmed | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ confirmed | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ confirmed | ✅ DONE | → |
| Director IDs confirmed | No new evidence | ⚠️ UNVERIFIED | → |
| ABN application (Pty) | No second Xero tenant, no ABN visible | 🔴 OPEN/LATE | → target "first week of May" long missed |
| GST registration (Pty) | Paired with ABN | 🔴 OPEN | → |
| Shareholders Agreement | No draft found; §12: "Standard Ledger's referred lawyer" | 🔴 OPEN/LATE | → |
| **Decide operating entity (Holdco vs Projects sub)** | §12 decision 1; due June 19 | 🔴 OPEN/OVERDUE | 🆕 §12 blocker; deadline PASSED |

### Section 2 — Banking and payment rails

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB business account (Pty) | Only NAB Visa ACT #8815 in bank_statement_lines | 🔴 OPEN/LATE | → still blocked (§12: "NAB blocked on Nick's trust docs") |
| Stripe account (Pty) | No artefact | 🔴 BLOCKED ON NAB | → |
| Auto-debits audit + migrate | No artefact | 🔴 OPEN | → |

### Section 3 — Xero

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty Xero file opens | 1 tenant only (sole trader, 2,245 invoices) | 🔴 OPEN/CRITICAL | → still blocked on ABN+NAB |
| New-entity Xero launch playbook | `thoughts/shared/plans/new-entity-xero-launch-playbook.md` | 🟢 ARTEFACT READY | → unchanged |
| $1 test-invoice runbook | `thoughts/shared/plans/2026-06-01-pty-test-invoice-runbook.md` | 🟢 ARTEFACT READY | 🆕 new since May 14 |
| Final sole trader BAS (Q4 FY26) | Q4 runs Apr–Jun; due 28 July 2026 | 🟡 DUE IN 26 DAYS | → now active |
| R&D FY26 window (Apr 24 – Jun 30) | `rd-fy26-window-and-fy27-setup.md` | 🟡 IN PROGRESS | 🆕 plan exists; execution status unknown |

### Section 4 — Grants and funders (UPDATED)

#### Outstanding receivables on the sole trader (2026-07-02)

| Counterparty | Invoice | Amount | Status | Age | Notes |
|---|---|---:|---|---:|---|
| **Snow Foundation** | INV-0321 | — | **PAID** | — | ✅ CLEARED since May 14 |
| **Centrecorp** | INV-0314 | — | **RESOLVED** | — | ✅ Draft resolved; decision made |
| **PICC** | INV-0317 + INV-0324 | — | **PAID** | — | ✅ Both CLEARED since May 14 |
| **Rotary eClub** | INV-0222 | $82,500 | AUTH | **448d** | 🔴 No action; approaching bad-debt |
| **ALIVE/UoM MRFF** | INV-0341+0342 | $167,200 | AUTH | 0d | 🆕 NEW (Jul 2, MRFF Year 1) |
| **Sonas Properties** | INV-0316/0336/0337 | $167,838 | AUTH | 0-136d | 🆕 Harvest subsidiary receivables |
| **Homeland School** | INV-0303 | $44,000 | AUTH | 45d | 🆕 New larger invoice |
| **Dusseldorp Forum** | INV-0338 | $16,500 | AUTH | 7d | 🆕 Jun 25 |
| **Regional Arts Australia** | INV-0302 | $16,500 | AUTH | 198d | 🟡 Partial; $16.5K still open |
| **Social Impact Hub Foundation** | INV-0289 | $21,780 | AUTH | — | 🆕 Surfaced |
| **Brodie Germaine** | INV-0325 | $15,400 | AUTH | 78d | → unchanged |
| **Mounty Aboriginal Youth** | INV-0334 | $22,000 | AUTH | 0d | 🆕 NEW (Jul 2) |
| **Tandanya** | INV-0332 | $16,500 | AUTH | 15d | 🆕 NEW |
| **Julalikari Council** | INV-0335 | $15,000 | AUTH | 13d | 🆕 NEW |
| **Berry Obsession** | INV-0309 | $13,000 | AUTH | 142d | 🆕 Surfaced |
| **Justice Reform Initiative** | INV-0333 | $880 | AUTH | 15d | 🆕 NEW |
| **Jenn Brazier** | INV-0228 | $3,887.84 | AUTH | 366d | → persists |
| **TOTAL** | | **$602,985.84** | | | ↑ from $497,240 at May 14 |

#### Migration-critical disposition decisions

Per cutover Rule 1: invoices issued under the sole trader ABN before 30 June 2026 get paid to the sole trader account regardless of when payment arrives. All 17 outstanding invoices dated before July 2 are sole trader invoices — no novation needed for payment collection; just chase normally.

The two ALIVE/UoM invoices dated July 2 are the first invoices raised after the planned cutover date. They are currently in the sole trader's Xero file, which confirms the cutover has not yet occurred. If Rule 2 is operating, these are correctly in the sole trader.

#### Novation letters — STATUS: ON HOLD

§12 addendum (2026-06-12): "Hold novation letters until decision 1 [operating entity] lands." The novation letter template (`thoughts/shared/drafts/novation-letter-templates.md`) is drafted and has been since May 14. The batch cannot be sent until the Holdco structure decision resolves which entity trades from 1 July.

### Section 5 — Commercial contracts

| Item | Status | Change |
|---|---|---|
| Innovation Studio novation letters | 🔴 ON HOLD (§12 decision 1) | → |
| JusticeHub partnerships | 🔴 ON HOLD | → |
| Goods on Country buyer relationships | 🔴 ON HOLD | → |
| Harvest lease / Harvest subsidiary | 🟡 ACTIVE PLANNING (`2026-05-26-harvest-stage-budget.md`, `2026-06-10-harvest-goods-10-week-staffing-alignment.md`) | 🆕 progress |
| Farm lease | 🟡 §12: "no farm entity for now; income in Nick's personal name" | 🆕 clarified |

### Section 6 — IP

| Item | Status | Change |
|---|---|---|
| IP assignment deed | 🔴 NOT STARTED | → |
| GitHub org transfer | 🔴 NOT STARTED | → |
| Trademark registration | 🔴 NOT STARTED | → |

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| Public Liability $20M | Before Harvest lease | 🔴 NOT STARTED | → |
| Professional Indemnity | 1 July 2026 | 🔴 NOT STARTED | ⚠️ Due date passed |
| **Directors & Officers** | ~2026-05-24 (30d from registration) | 🔴 OVERDUE | ⚠️ Deadline passed 39 days ago — CRITICAL |
| Workers Comp | First employee | ⏳ NOT YET DUE | → |
| Cyber | Year 1 recommended | ⏳ DEFERRED | → |

### Section 8 — Governance

| Item | Status | Change |
|---|---|---|
| Shareholders Agreement | 🔴 OPEN/LATE | → |
| Pty minute book | 🟡 UNVERIFIED | → |
| **Holdco structure decision (§12 D1)** | 🔴 OVERDUE (due June 19) | 🆕 critical new item |
| DGR lawyer question list | Due before June 26 (relay departure) | 🟡 STATUS UNKNOWN | 🆕 §12 item |

### Section 9 — Subscriptions and tooling

| Item | Status | Change |
|---|---|---|
| Pty Xero file | 🔴 OPEN (blocked on ABN+NAB) | → |
| All SaaS subscription transfers | 🔴 NOT STARTED (blocked on Pty entity) | → |
| $1 test invoice runbook | 🟢 PLAN READY — pre-reqs not yet met | 🆕 plan exists |

### Section 10 — Communications

All items remain 🔴 NOT STARTED — correctly deferred until the Pty is genuinely live per Rule 2. No announcement email, no footer updates, no Xero template change until real cutover.

### Section 11 — 2026-05-05 Standard Ledger decisions

| Decision | Status | Change |
|---|---|---|
| D11.1 — Harvest subsidiary structure | 🟡 ACTIVE PLANNING (multiple plans since May 14) | 🟡 progress |
| D11.2 — Payroll setup on Pty Xero | ⏳ BLOCKED on Pty Xero | → |
| D11.3 — Dext per-project email addresses | 🔴 STATUS UNKNOWN | → |
| D11.4 — Mapping export | ✅ DONE (script written May 5) | → |
| D11.4 — Clear untagged Xero queue | 🔴 STATUS UNKNOWN | → |
| D11.5 — Knight Photography Phase 1 invoice ($100K) | 🔴 STATUS UNKNOWN (was "not executed" at May 14) | → |

### Section 12 — 2026-06-12 Standard Ledger call (addendum — NEW since May 14)

| Item | Due | Status |
|---|---|---|
| **Decide operating entity (Holdco vs Projects sub)** | June 19 | 🔴 OVERDUE |
| Hold novation letters until decision 1 | Standing | ✅ HOLDING |
| DGR lawyer question list sent | Before June 26 (relay departure) | 🟡 STATUS UNKNOWN |
| FY26 draw totals agreed + transfers done | Before June 30 | 🔴 STATUS UNKNOWN — deadline passed |
| Nick confirms farm-stays-personal | Next founders conversation | 🟡 PENDING |
| FY26 R&D window plan executed | See `rd-fy26-window-and-fy27-setup.md` | 🟡 PLAN EXISTS |

---

## Status summary

| Status | May 14 count | 2026-07-02 count | Change |
|---|---:|---:|---|
| ✅ DONE | 6 | 7 | ↑ +1 (D11.4 mapping export) |
| 🟡 IN PROGRESS / PARTIAL | 8 | 10 | ↑ +2 (Harvest plans, R&D window plan) |
| 🔴 NOT STARTED / OPEN / LATE / OVERDUE | 32 | 35 | ↑ +3 (§12 items, D&O overdue, operating entity decision) |
| ⏳ NOT YET DUE / BLOCKED | 12 | 10 | ↓ -2 (Q4 BAS and Professional Indemnity now active/overdue) |
| **Total items tracked** | **58** | **62** | ↑ +4 (§12 items added) |

---

## Cutover risk map — 2026-07-02

### 🚨 Critical (must happen to un-block the Pty from operating)

1. **Decide operating entity (Holdco vs Projects sub)** — §12 decision 1, due June 19. Overdue. Every novation letter, every Pty invoice from July 1, the Harvest subsidiary structure, Knight Photography Phase 3 — all depend on knowing which entity is the trading entity. One call / email to Standard Ledger.
2. **Pty ABN** — still not visible in DB. Without this, Pty Xero can't open, Pty NAB can't verify, first real Pty invoice can't be raised. Standard Ledger dependency.
3. **NAB business account (Pty)** — blocked on Nick's trust docs (§12). One document away from unblocking the bank rail, which unblocks Stripe, subscriptions, Dext forwarding.
4. **D&O insurance** — D&O was due within 30 days of registration (i.e. by ~2026-05-24). We are now 39 days past that deadline. Pty directors are currently unprotected. Bind immediately.

### 🔴 Urgent (now actively overdue)

5. **Q4 FY26 BAS (sole trader)** — due 28 July 2026 (26 days). Standard Ledger handles; Ben to confirm it's in the queue and sole trader records are clean.
6. **Professional Indemnity** — was scheduled for "1 July 2026". That date is now. No binding evidence.
7. **Shareholders Agreement** — was Rule 4 (Week 1-2). Overdue since early May. While no external investor has arrived, the 2026-06-12 §12 discussion of Harvest subsidiary minority shareholder makes this more urgent.
8. **FY26 draw totals + transfers** — §12 item due June 30. Status unknown; deadline passed.
9. **Knight Photography Phase 1 invoice ($100K)** — D11.5. Was "not executed" at May 14, still no signal. R&D FY26 claim depends on associate amounts being PAID by June 30.

### 🟠 Amber (now correctly unblocked once operating entity is decided)

10. Send novation letters to funders (template ready; batch can go once entity decision lands + ABN confirmed + bank details locked).
11. IP assignment deed.
12. Harvest subsidiary formal structure (draft plans exist; needs lawyer + ABN).
13. Dry-run $1 Pty test invoice (runbook exists at `2026-06-01-pty-test-invoice-runbook.md`; pre-reqs not yet met).

### 🟡 Yellow (deferred, correctly)

14. Subscription audit + SaaS transfers.
15. Customer novations (Goods buyers).
16. Email/website footer updates.
17. Announcement email.
18. GitHub org transfer.

---

## Open questions

1. **What is the operating entity decision?** Holdco with A Curious Tractor Pty Ltd as holding company + ACT Projects as operating subsidiary? Or Pty Ltd as the single operating entity? Until this is answered, the novation letters can't go, and new July invoices don't have a correct entity to name.
2. **Has the Pty ABN been issued?** Standard Ledger was handling this. No DB signal of a second Xero tenant — if ABN had been issued and Xero opened, a second tenant ID would appear in the DB.
3. **Are the ALIVE/UoM invoices (Jul 2) intentionally in the sole trader?** They may reflect that: (a) the sole trader continues trading under Rule 2 while infrastructure catches up, or (b) there was a communication with the University that they're invoicing from the trading entity Ben/Nic decided to use.
4. **D&O insurance** — is there any binding that happened off-Xero (i.e. broker paid from personal account and not yet in Xero ACCPAY)? The 39-day overshoot is significant.
5. **Knight Photography Phase 1 invoice ($100K)** — FY26 R&D claim depends on this being PAID by 30 June 2026. If that deadline passed without the invoice being raised + paid, the R&D claim for this amount may carry to FY27.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| Plan | `act-entity-migration-checklist-2026-06-30.md` | file (last_verified 2026-05-08; §12 addendum 2026-06-12) |
| DB | `xero_invoices` WHERE ACCREC, status IN (AUTHORISED,DRAFT), amount_due > 0 | 2026-07-02 |
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-07-02 — 1 tenant only |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-07-02 — 1 account only |
| DB | `xero_invoices` status/type summary | 2026-07-02 |
| Drafts | `thoughts/shared/drafts/` keyword grep | 2026-07-02 |
| Plans | `thoughts/shared/plans/` keyword grep | 2026-07-02 |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-05-14|Q3 — 2026-05-14 previous pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 — 2026-04-24 baseline]]
- [[funder-alignment-2026-07-02|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-07-02|Q2 project truth-state — this pass]]
- [[index|ACT Wikipedia]]
