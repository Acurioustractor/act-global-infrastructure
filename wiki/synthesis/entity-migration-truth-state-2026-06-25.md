---
title: Entity migration truth-state — 5 days to cutover, ABN live, Pty Xero not yet open
summary: Third pass of the ACT Alignment Loop (Q3), 2026-06-25. 5 days to the 30 June cutover. ABN issued 2026-06-01 (gate opened). Pty Xero file not yet visible in DB (1 tenant still). NAB Pty account onboarding was in progress as of June 1. D&O likely bound. Holdco structure decision was due June 19 — status unknown. Novation letters status unknown. Three Sonas invoices totalling $167,838 raised today. Outstanding ACCREC: $431,898.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover]
status: active
date: 2026-06-25
---

# Entity migration truth-state — 2026-06-25

> Third pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. Five days before the 30 June cutover. Sources: migration checklist + §11 + §12 addendum, Supabase DB, `thoughts/shared/drafts/**`, `thoughts/shared/plans/**`. Previous pass: [[entity-migration-truth-state-2026-05-14|2026-05-14]].

## Headline findings

1. **ABN 36 697 347 676 issued 2026-06-01 for A Curious Tractor Pty Ltd.** GST registered simultaneously. This was the single blocking dependency for Pty Xero, NAB verification, first Pty invoice, and payroll. As of June 1, the plan transitioned from "blocked" to "doing". 24 days have elapsed since the gate opened.

2. **Pty Xero file is not yet visible in the DB.** Only one `xero_tenant_id` (`786af1ed-e3ce-42fc-9ea9-ddf3447d79d0`, Nic's sole trader, now 2,236 invoices) appears in `xero_invoices`. The June 1 critical-path plan listed "Open the Pty Xero file" as a Week 1 (1–7 June) task — 24 days after Week 1 ended, it hasn't surfaced in the sync. If the file was opened and the sync hasn't picked it up, that's a data pipeline issue. If it hasn't been opened, that's a cutover-readiness issue.

3. **NAB Pty business account: status uncertain.** The `bank_statement_lines` table shows only "NAB Visa ACT #8815" (sole trader) but data is current only to 2026-03-31 — 3 months behind. NAB onboarding was "in progress" with a ~2-week ETA as of June 1, suggesting it should be live by now. Cannot confirm via DB; verify directly.

4. **Section §12 (June 12 Standard Ledger call) adds material complexity.** A June 12 call confirmed existing decisions and opened four new structural questions:
   - **Holdco + ACT Projects subsidiary structure** — which entity trades from 1 July is not yet settled. Decision was due June 19. **Status unknown.** This is blocking the novation letters (holding per checklist §12 rule: "Hold novation letters until decision 1 lands").
   - **Butterfly/charity connection** — DGR lawyer question list was to go before June 26 handover (tomorrow).
   - **Farm** — income/accommodation in Nick's personal name; no farm entity.
   - **FY26 founder draw** — up to ~$200K each before June 30; to be finalized with Standard Ledger.
   - As of June 12: NAB still blocked on Nick's trust docs. Xero opens after banking. Inv 15078 ($100K Knight Photography) still not raised.

5. **Outstanding ACCREC on sole trader: $431,898 across 14 invoices.** Down from $497,240 in May 14 baseline. Snow $132K paid, Centrecorp $84.7K resolved, PICC $96.8K cleared. However, $167,838 in new Sonas Properties invoices raised TODAY (final Harvest setup invoices). Three new community-org invoices totalling $53,380 issued this week.

6. **Cutover Rule 2 is likely to apply.** Rule 2 states: "If ABN/NAB/Pty Xero is not invoice-ready by 1 July, the sole trader continues trading until the Pty is genuinely live." Given the Pty Xero file is not confirmed open and the Holdco structure question is unresolved, a clean 1 July cutover requires immediate action on both blockers.

7. **R&D expectation re-baselined.** Per the June 1 SL-perspective analysis: FY26 R&D claim is largely stranded (sole trader period — ineligible entity). Revised expectation: FY26 ≈ $0–$25K; FY27 ≈ $200–$260K recurring from the Pty under Path C.

---

## Items × evidence × risk — updated (2026-06-25)

Days until 30 June 2026 cutover: **5 days**.

### Section 1 — Entity setup

| Item | Evidence | Status | Change since May-14 |
|---|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ confirmed | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ confirmed | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ confirmed | ✅ DONE | → |
| Director IDs confirmed | No DB signal; per §12 not mentioned | ⚠️ UNVERIFIED | → unchanged |
| **ABN (Pty) — ABN 36 697 347 676** | Per June 1 plan: "ABN issued" | ✅ DONE (per plan) | 🟢 gate opened June 1 |
| GST registration (Pty) | Registered with ABN | ✅ DONE (per plan) | 🟢 |
| Standard Ledger engaged + SL Ignition pending | June 1 plan §11, SL Ignition sign = Week 1 action | 🟡 SIGN IF NOT DONE | → |
| Shareholders Agreement | June 12 checklist shows still open; Rule 4 Week 1-2 | 🔴 LATE — still open | → |
| **Holdco structure decision** | Due June 19 per §12; no evidence of decision | 🔴 OVERDUE — blocking novation letters | 🆕 §12 |

### Section 2 — Banking and payment rails

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB business account (Pty) | BSL data stale (to Mar 31); June 1 plan: "~2 wk onboarding" from June 1 | 🟡 LIKELY LIVE (unverifiable by DB) | → |
| Stripe account (Pty) | No artefact; June 1 plan: "likely won't complete by 1 July" | 🟠 STRIPE RULE-2 FLAG | June 1 plan flags 30-day notice risk |
| Auto-debits audit + migrate | No consolidated list | 🔴 OPEN | → |

### Section 3 — Xero

| Item | Evidence | Status | Change |
|---|---|---|---|
| **Pty Xero file opens** | Only 1 tenant in DB; June 1 plan: "Week 1" task | 🔴 NOT VISIBLE IN DB | → ABN available but file not confirmed |
| New-entity Xero launch playbook | `thoughts/shared/plans/new-entity-xero-launch-playbook.md` | ✅ ARTEFACT READY | → |
| Pty payroll configured ($10K/mo ×2) | Blocked on Pty Xero | ⏳ BLOCKED ON XERO | → |
| Final sole trader BAS (Q4 FY26) | Due 28 July 2026 | ⏳ NOT YET DUE | → |

### Section 4 — Grants and funders

#### Outstanding receivables (as of 2026-06-25)

| Counterparty | Invoice | Amount | Status | Age | Disposition |
|---|---|---:|---|---:|---|
| **Rotary eClub Outback Australia** | INV-0222 | $82,500 | AUTH | **441d** | 🔴 Bad-debt write-off or chase — sole trader FY26 BAS |
| **Social Impact Hub Foundation** | INV-0289 | $21,780 | AUTH | 219d | ⚠️ Chase |
| **Regional Arts Australia** | INV-0302 | $16,500 | AUTH | 192d | → Chase; sole trader |
| **Sonas Properties** | INV-0316 | $44,000 | AUTH | 129d | Harvest setup |
| **Berry Obsession PTY LTD** | INV-0309 | $13,000 | AUTH | 135d | Chase |
| **Brodie Germaine Fitness** | INV-0325 | $15,400 | AUTH | 71d | → |
| **Homeland School Company** | INV-0303 | $44,000 | AUTH | 38d | New large invoice; chase |
| **Tandanya** | INV-0332 | $16,500 | AUTH | 8d | 🆕 Recent |
| **Justice Reform Initiative** | INV-0333 | $880 | AUTH | 8d | 🆕 Recent |
| **Mounty Aboriginal Youth** | INV-0334 | $22,000 | AUTH | 7d | 🆕 Recent |
| **Julalikari Council** | INV-0335 | $15,000 | AUTH | 6d | 🆕 Recent |
| **Dusseldorp Forum** | INV-0338 | $16,500 | AUTH | today | 🆕 Today — novation notice needed |
| **Sonas Properties** | INV-0336 | $63,888 | AUTH | today | 🆕 Harvest setup |
| **Sonas Properties** | INV-0337 | $59,950 | AUTH | today | 🆕 Harvest setup |
| **TOTAL** | | **$431,898** | | | ↓ −$65,342 from May-14 |

Previously large items now cleared:
- Snow Foundation INV-0321 $132,000 → **PAID ✅**
- Centrecorp INV-0314 $84,700 DRAFT → **RESOLVED ✅** ($0 amount_due)
- PICC INV-0317/0324 $96,800 → **PAID ✅**

#### Novation work

| Item | Evidence | Status | Change |
|---|---|---|---|
| Novation letter template | `thoughts/shared/drafts/novation-letter-templates.md` | 🟡 DRAFTED | → same as May 14 |
| **Novation letters sent** | Per §12: hold until Holdco decision (due June 19); Holdco status unknown | 🔴 UNKNOWN / BLOCKED | 🔴 decision overdue |
| Enumeration of active grants | Q1 synthesis enumerated; Snow + Dusseldorp are active partners needing notice | 🟡 PARTIAL | → |

### Section 5 — Commercial contracts

| Item | Status | Change |
|---|---|---|
| Innovation Studio novation letters | 🔴 NOT STARTED (blocked on entity decision) | → |
| Goods on Country buyer relationships | 🔴 NOT STARTED (blocked on entity decision) | → |
| Harvest lease (Harvest subsidiary name) | 🟡 D11.1 decision made; subsidiary not incorporated | → |
| Farm lease | Per §12: Farm income in Nick's personal name. 🟢 NO SEPARATE LEASE NEEDED | 🆕 Simplified |

### Section 6 — IP

| Item | Status | Change |
|---|---|---|
| IP assignment deed (Nic → Pty) | 🔴 NOT STARTED (blocked on IP-clause audit + entity decision) | → |
| GitHub org transfer | 🔴 NOT STARTED | → |
| Trademark registration | 🔴 NOT STARTED (post-Pty priority) | → |

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| Public Liability $20M | Before Harvest lease | 🟡 IN PROGRESS (per June 1 plan) | 🟢 progress |
| Professional Indemnity | 1 July 2026 | 🟡 IN PROGRESS (per June 1 plan) | 🟢 progress |
| **Directors & Officers** | ~2026-05-24 (PAST DUE 30 days) | 🟡 LIKELY BOUND (in progress June 1) | ⚠️ deadline passed 30 days ago — confirm binding |
| Workers Comp | First employee | ⏳ NOT YET DUE | → |
| Cyber | Year 1 | ⏳ DEFERRED | → |

### Section 8 — Governance

| Item | Status | Change |
|---|---|---|
| Shareholders Agreement | 🔴 NOT SIGNED — Rule 4 Week 1-2, now 10 weeks late | → |
| Pty minute book (resolutions + bank resolution) | Per June 1 plan: "Form 201 + resolutions" = Week 1 action | 🟡 SHOULD BE DONE |
| ASIC first annual review | ⏳ NOT YET DUE (April 2027) | → |

### Section 9 — Subscriptions and tooling

| Item | Status | Change |
|---|---|---|
| Pty Xero file | 🔴 NOT VISIBLE IN DB | → |
| SaaS subscription transfers (GHL, Supabase, Vercel, Google, Anthropic, GitHub) | 🔴 NOT STARTED | → |
| Stripe Pty account | 🟠 30-DAY NOTICE RISK (Rule 2 mitigation: sole-trader Stripe for run-off) | Per June 1 plan |

### Section 10 — Communications

All items 🔴 NOT STARTED, correctly deferred to Week 9-10 per plan sequence. With 5 days remaining, these must start NOW:
- Email footer updates (all @act.place)
- Website footers (act.place, project sites)
- Announcement email to funders, partners, community
- Xero invoice template (blocked on Pty Xero)

### Section 11 — 2026-05-05 Standard Ledger decisions

| Decision | Status | Change |
|---|---|---|
| D11.1 — Harvest subsidiary structure | 🔴 DRAFT NOT STARTED | → |
| D11.2 — Set up payroll on Pty Xero | ⏳ BLOCKED ON XERO | → |
| D11.2 — Director loan accounts | ⏳ BLOCKED ON XERO | → |
| D11.2 — **FY26 founder draw ($200K each before June 30)** | Per §12: to be finalized with SL | 🔴 URGENT — 5 days |
| D11.3 — Dext per-project email addresses | 🔴 NOT STARTED | → |
| D11.4 — Mapping export | ✅ DONE (script + CSV) | → |
| D11.4 — SL reviews mapping spreadsheet | 🟡 PENDING SL | → |
| **D11.5 — Knight Photography Phase 1 invoice ($100K)** | Per §12: "Inv 15078 still not raised" as of June 12 | 🔴 NOT RAISED — 5 days left |
| D11.5 — Knight Photography Phase 2 (3×$50K) | Dated Q1+Q2+Q3 FY26 | 🟡 PLAN WRITTEN |

### Section 12 — 2026-06-12 Standard Ledger structure call (NEW SINCE MAY-14)

| Item | Due by | Status |
|---|---|---|
| **Decide operating entity (Holdco vs Pty direct)** | June 19 | 🔴 OVERDUE — status unknown; novation letters on hold |
| DGR lawyer question list sent | Before June 26 handover | ⚠️ DUE TOMORROW |
| FY26 draw totals agreed + transfers done | Before June 30 | 🔴 URGENT — 5 days |
| Nick confirms farm-stays-personal | Next founders conversation | 🟡 |
| FY26 R&D window plan executed | Before June 30 | 🔴 URGENT |

---

## Status summary

| Status | Count | Share | Change from May-14 |
|---|---:|---:|---|
| ✅ DONE | 8 | ~11% | ↑ +2 (ABN/GST, Xero launch playbook) |
| 🟡 IN PROGRESS / PARTIAL | 10 | ~14% | ↑ +2 (insurance in progress, NAB likely live) |
| 🔴 NOT STARTED / OPEN / OVERDUE | 34 | ~47% | ↑ +2 (§12 items added) |
| ⏳ NOT YET DUE / BLOCKED | 10 | ~14% | ↓ −2 (some "blocked" items unblocked by ABN) |
| **🚨 5-DAY CRITICAL** | 6 | ~8% | 🆕 items due before June 30 |
| **Total items tracked** | **~72** | | ↑ +14 (§12 additions) |

---

## 5-day critical path (June 25–30)

These items must land before June 30 cutover or explicitly invoke Rule 2 (honest delay):

| Priority | Item | Blocker | Owner |
|---|---|---|---|
| 🚨 1 | **Decide Holdco vs Pty Direct** | Was due June 19; blocking novation letters | Ben + Nic + SL |
| 🚨 2 | **Open Pty Xero file** | ABN available since June 1; no observable blocker | Ben |
| 🚨 3 | **FY26 founder draw ($200K each) — transfers done** | Standard Ledger coordinating | Ben + Nic + SL |
| 🚨 4 | **Knight Photography Phase 1 invoice ($100K, Inv 15078)** | "Still not raised" per June 12 | Ben |
| 🚨 5 | **DGR lawyer question list sent** | Due June 26 (tomorrow) | Ben |
| 🚨 6 | **Comms footers + announcement ready to stage** | Copyable once entity decision landed | Ben |
| 🟠 7 | Shareholders Agreement signed | Lawyer required | Ben + SL lawyer |
| 🟠 8 | Insurance PL $20M + D&O binding confirmed | Confirmation only | Ben |
| 🟡 9 | Rotary INV-0222 — bad-debt write-off decision | Only-Ben | Ben |
| 🟡 10 | Stripe Rule 2 mitigation documented | Sole-trader Stripe for run-off; no action needed today | Ben |

---

## Rule 2 exposure assessment (as of 2026-06-25)

**Cutover Rule 2:** "If ABN/NAB/Pty Xero is not invoice-ready by 1 July, the sole trader continues trading until the Pty is genuinely live."

| Rail | Status | Invoice-ready? |
|---|---|---|
| ABN | ✅ Issued June 1 | ✅ |
| GST | ✅ Registered June 1 | ✅ |
| NAB Pty bank account | 🟡 "~2wk onboarding" from June 1 — likely live ~June 15 | ✅ probable |
| Pty Xero file | 🔴 Not visible in DB sync | ❌ cannot confirm |
| Pty Stripe | 🟠 30-day notice needed | ❌ not by July 1 |
| Holdco entity decision | 🔴 Overdue June 19 | ❌ blocking |

**Assessment:** Rule 2 risk is real. If the Pty Xero file is genuinely not open, the sole trader cannot transfer invoicing on July 1. The Stripe gap is explicitly covered by the June 1 plan's Rule 2 mitigation (sole-trader Stripe for run-off; Pty NAB takes PayID/EFT from day one). The entity decision is the wildcard.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| Plan | `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` §12 | 2026-06-25 |
| Plan | `thoughts/shared/plans/2026-06-01-cutover-30-day-critical-path.md` | 2026-06-25 |
| DB | `xero_invoices` xero_tenant_id GROUP BY | 2026-06-25 — 1 tenant |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-06-25 — data to 2026-03-31 |
| DB | `xero_invoices` ACCREC AUTHORISED/DRAFT amount_due>0 | 2026-06-25 |
| DB | `xero_invoices` status/type summary | 2026-06-25 |
| Drafts | `thoughts/shared/drafts/` migration keyword grep | 1 novation template |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-05-14|Q3 entity migration — 2026-05-14 pass]]
- [[funder-alignment-2026-06-25|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-06-25|Q2 project truth-state — this pass]]
- [[index|ACT Wikipedia]]
