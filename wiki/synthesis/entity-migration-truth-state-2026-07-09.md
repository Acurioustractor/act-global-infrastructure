---
title: Entity migration truth-state — 9 days post-cutover, Rule 2 in effect, Pty Xero still unopened
summary: Fourth pass of the ACT Alignment Loop (Q3), 2026-07-09. The June 30 cutover has passed but the Pty is not yet operational: only one Xero tenant (sole trader, now 2,247 invoices), only one bank account (NAB Visa ACT #8815), and three invoices issued by the sole trader on July 2 ($189.2K). Rule 2 is in effect. The §12 Standard Ledger call (2026-06-12) surfaced a Holdco structure question that is blocking novation letters. BAS due July 28.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, post-cutover, rule-2]
status: active
date: 2026-07-09
---

# Entity migration truth-state — 2026-07-09

> Fourth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q3. Nine days past the June 30 cutover target. Sources: the migration checklist at `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` (including §12 addendum 2026-06-12), Supabase (Xero invoices, transactions, bank lines, tenant state), `thoughts/shared/drafts/**`. Comparison baseline: [[entity-migration-truth-state-2026-05-14|2026-05-14]] (last committed).

## Headline findings

1. **Rule 2 is in effect: cutover delayed, sole trader still trading.** The checklist Rule 2 states: "if ABN / NAB / Pty Xero is not invoice-ready by 1 July, the sole trader continues trading until the Pty is genuinely live." DB evidence confirms this: only 1 Xero tenant ID (sole trader, `786af1ed-e3ce-42fc-9ea9-ddf3447d79d0`, now 2,247 invoices), and three ACCREC invoices dated 2026-07-02 (Mounty $22K, ALIVE ×2 $167.2K) were issued by the sole trader AFTER the cutover target date. The Pty has not started trading.

2. **No Pty Xero file visible in DB.** At both the April 24 and May 14 passes, only 1 xero_tenant_id appeared in the DB. Today: still 1 tenant. The §12 addendum (2026-06-12) confirms the blocker: NAB account still blocked on Nick's trust docs as of June 12. No NAB → no ABN verification → no Pty Xero.

3. **The §12 Standard Ledger call (2026-06-12) surfaced a Holdco structure question.** A follow-up call on June 12 re-confirmed D11.1, D11.2, and D11.5, but opened four new decisions: (1) whether the operating entity is the Pty itself or an `ACT Projects` subsidiary under a holdco structure; (2) Butterfly's DGR connection; (3) Farm stays in Nick's personal name; (4) FY26 founder draw scale (up to $200K each before June 30). Until decision 1 is settled, the **novation letters are on hold** — because they need to name the correct entity.

4. **The FY26 BAS is due July 28 — 19 days away.** The sole trader's Q4 FY26 BAS (Apr–Jun quarter) must be lodged by 28 July 2026. This is the next hard deadline. Standard Ledger handles, but the R&D evidence window (24 Apr–30 Jun 2026 under Path C) also closes with this lodgement.

5. **Outstanding receivables on the sole trader's books: $471,717.84.** Net change from April baseline ($507,350): -$35,632. Snow $132K paid, Centrecorp $84.7K resolved, PICC $97K paid, SMART $2.2K paid. New invoices added: ALIVE $167.2K, Mounty $22K, additional Sonas invoices, Homeland School $44K, Tandanya $16.5K, Julalikari $15K, Jenn Brazier $3.9K. Every invoice from the sole trader is now a run-off item — they will pay out to the sole trader's bank account and figure into the FY26 BAS.

6. **Only 1 migration artefact on disk.** `thoughts/shared/drafts/novation-letter-templates.md` (drafted ~2026-05-08) remains the sole artefact. It is on hold pending decision 1 from the §12 call (operating entity name). No IP assignment deed draft. No shareholders agreement draft. No subscription audit output.

---

## Items × evidence × risk — updated

Days past June 30 cutover: **+9 days**. Sole trader is still the operational entity.

### Section 1 — Entity setup

| Item | Evidence of completion | Status | Change since 2026-05-14 |
|---|---|---|---|
| Pty registered (ACN 697 347 676) | ✅ confirmed | ✅ DONE | → |
| Directors appointed (Ben + Nic) | ✅ confirmed | ✅ DONE | → |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | ✅ confirmed | ✅ DONE | → |
| Director IDs confirmed | No evidence in DB | ⚠️ UNVERIFIED | → unchanged since Apr |
| ABN application (Pty) | No second xero_tenant | 🔴 NOT DONE | → target was "first week of May" — missed; NAB blocked |
| GST registration (Pty) | Paired with ABN | 🔴 OPEN | → |
| Standard Ledger engaged | ✅ confirmed; §12 call Jun 12 | ✅ DONE | ✅ §12 call adds Holdco question |
| **Holdco/subsidiary structure decision** | §12 opened 4 decisions, due by 19 June | 🔴 DECISION BLOCKING NOVATION | 🆕 blocking item |

### Section 2 — Banking and payment rails

| Item | Evidence | Status | Change |
|---|---|---|---|
| NAB business account (Pty) | Only "NAB Visa ACT #8815" in bank_statement_lines (to Mar 2026) | 🔴 BLOCKED — Nick's trust docs as of Jun 12 | → still blocked |
| Stripe account (Pty) | No artefact | 🔴 OPEN | → |
| Auto-debits audit + migrate | No consolidated list | 🟡 OPEN | → |

### Section 3 — Xero

| Item | Evidence | Status | Change |
|---|---|---|---|
| Pty Xero file opens | 1 tenant only (sole trader, now 2,247 invoices) | 🔴 NOT OPEN | → blocked on ABN/NAB |
| Pty Xero launch playbook | `new-entity-xero-launch-playbook.md` | 🟢 ARTEFACT READY | → unchanged |
| **Final sole trader BAS (Q4 FY26)** | Q4 Apr–Jun 2026; **DUE 28 JULY 2026 (19 days)** | ⏳ **IMMINENT** | 🔴 highest near-term deadline |
| Sole trader Xero stays open for run-off | Rule 2 in effect; Jul 2 invoices from sole trader | 🟡 ACTIVE RUN-OFF | 🆕 post-cutover reality |

### Section 4 — Grants and funders (CRITICAL PATH)

#### Outstanding receivables — sole trader run-off book

All items below are sole trader receivables under Rule 2 (sole trader continues trading until Pty is live).

| Counterparty | Invoice | Amount | Status | Age | Project | Action |
|---|---|---:|---|---:|---|---|
| **Rotary eClub** | INV-0222 | $82,500 | AUTH | **455d** | ACT-GD | ⚠️ FY26 BAS imminent — chase or write off |
| **Jenn Brazier** | INV-0228 | $3,887.84 | AUTH | **373d** | ACT-GP | Chase or write off |
| **Social Impact Hub** | INV-0289 | $21,780 | AUTH | 233d | null | Identify + chase |
| **Regional Arts Australia** | INV-0302 | $16,500 | AUTH | 205d | ACT-HV | Chase (was $33K, partial paid) |
| **Berry Obsession** | INV-0309 | $13,000 | AUTH | 149d | ACT-HV | Chase |
| **Sonas Properties** | INV-0316 | $44,000 | AUTH | 143d | ACT-HV | Harvest subsidiary question |
| **Brodie Germaine Fitness** | INV-0325 | $15,400 | AUTH | 85d | ACT-BG | Chase |
| **Homeland School** | INV-0303 | $44,000 | AUTH | 52d | ACT-GD | Chase |
| **Tandanya** | INV-0332 | $16,500 | AUTH | 22d | null | Tag project_code |
| **Julalikari Council** | INV-0335 | $15,000 | AUTH | 20d | ACT-GD | Chase |
| **Sonas Properties** | INV-0337 | $9,950 | AUTH | 14d | null | Tag ACT-HV |
| **Mounty Aboriginal Youth** | INV-0334 | $22,000 | AUTH | 7d | null | 🆕 POST-CUTOVER sole-trader invoice |
| **ALIVE / UoM** | INV-0341 | $66,000 | AUTH | 7d | null | 🆕 POST-CUTOVER — MRFF Year 1 |
| **ALIVE / UoM** | INV-0342 | $101,200 | AUTH | 7d | null | 🆕 POST-CUTOVER — MRFF Year 1 |
| **TOTAL** | | **$471,717.84** | | | | |

Cleared since 2026-05-14: Snow $132K ✅, Centrecorp $84.7K ✅, PICC (×2) ~$97K ✅, SMART Recovery $2.2K ✅, Aleisha Keating retainer resolved, Just Reinvest + Homeland (old $4.95K) ✅

#### Novation work

| Item | Evidence | Status | Change |
|---|---|---|---|
| Novation letter template | `thoughts/shared/drafts/novation-letter-templates.md` | 🟡 DRAFTED | → on hold pending §12 decision 1 |
| Novation letters sent | 0 letters sent | 🔴 ON HOLD | → §12: "hold novation letters until decision 1 lands" |
| Operating entity decided (§12 decision 1) | No evidence of resolution by 19-Jun target | 🔴 BLOCKING | 🆕 new blocker since 2026-05-14 |

### Section 5 — Commercial contracts

| Item | Status | Change |
|---|---|---|
| Innovation Studio novation letters | 🔴 ON HOLD (§12 decision 1) | → |
| JusticeHub partnerships | 🔴 NOT STARTED | → |
| Goods on Country buyers | 🔴 NOT STARTED | → |
| Harvest lease (Harvest subsidiary) | 🟡 D11.1 decided; subsidiary not yet incorporated | → |
| Farm lease | 🟡 §12 confirms Farm stays in Nick's personal name — simplifies this item | ↑ decision made |

### Section 6 — IP

All items remain 🔴 NOT STARTED. No lawyer-reviewed IP assignment deed. No GitHub org transfer. No trademark registrations.

### Section 7 — Insurance

| Item | Required by | Status | Change |
|---|---|---|---|
| Public Liability $20M | Before Harvest lease | 🔴 NOT STARTED | → |
| Workers Comp | First employee | ⏳ NOT YET DUE | → |
| Professional Indemnity | 1 July 2026 | 🔴 OVERDUE | 🔴 cutover passed |
| **Directors & Officers** | ~2026-05-24 (30d from Pty registration) | 🔴 **OVERDUE** — 46 days past deadline | 🔴 was already critical at May 14 |
| Insurance broker selection | Was "Week 1" | 🔴 LATE/UNKNOWN | → no signal |

### Section 8 — Governance

| Item | Status | Change |
|---|---|---|
| Shareholders Agreement | 🔴 NOT STARTED/LATE | → latent deadlock risk on equal-shareholder Pty |
| Pty minute book | 🟡 UNVERIFIED | → |
| ASIC first annual review | ⏳ NOT YET DUE (Apr 2027) | → |

### Section 9 — Subscriptions and tooling

All SaaS items 🔴 NOT STARTED. Blocked on Pty Xero file which requires ABN which requires NAB.

### Section 10 — Communications

All items 🔴 NOT STARTED. Blocked on operating entity decision (§12 decision 1).

### Section 11 — Standard Ledger decisions (2026-05-05)

| Item | Status | Change |
|---|---|---|
| D11.1 — Harvest subsidiary structure | 🔴 NOT EXECUTED | → |
| D11.2 — Payroll setup | ⏳ BLOCKED on Pty Xero | → |
| D11.3 — Dext per-project emails | 🔴 NOT STARTED | → |
| D11.4 — Clear untagged review queue | 🔴 NOT STARTED | → |
| D11.4 — Mapping export | ✅ DONE | → |
| D11.5 — Knight Photography Phase 1 invoice ($100K) | 🔴 NOT EXECUTED per §12 (still outstanding as of Jun 12) | → |

### Section 12 — Standard Ledger structure call (2026-06-12, NEW)

| Decision | Status | Urgency |
|---|---|---|
| **Decision 1: Operating entity (Pty vs ACT Projects subsidiary)** | 🔴 Unresolved — blocks all novation letters and from-1-July naming | CRITICAL |
| Decision 2: Butterfly DGR connection | 🟡 DGR lawyer question list due before 26 June; answers expected before Aug | → |
| Decision 3: Farm stays in Nick's personal name | 🟡 Awaiting Nick confirmation | ↑ simplifies §1 Farm lease row |
| Decision 4: FY26 founder draw ($200K each before 30 Jun) | 🟡 Target was 30 June; evidence unclear | → |
| Hold novation letters until Decision 1 | 🔴 Standing instruction — letters held | → |
| R&D FY26 window execution | Path C confirmed: Pty claims Apr 24–Jun 30 only; amounts owed to associates must be PAID by Jun 30 to enter FY26 claim | ⚠️ if payments not made, they push to FY27 |

---

## Status summary

| Status | Count | Share | Change from 2026-05-14 |
|---|---:|---:|---|
| ✅ DONE | 6 | ~9% | → (no new completions) |
| 🟡 IN PROGRESS / PARTIAL / UNVERIFIED | 9 | ~14% | ↑ +1 (Farm decision) |
| 🔴 NOT STARTED / OPEN / LATE / OVERDUE | 35 | ~55% | ↑ +3 (§12 items, D&O now overdue, Prof Ind now overdue) |
| ⏳ NOT YET DUE / BLOCKED | 12 | ~19% | → |
| **Total items tracked** | ~62 | | ↑ +4 (§12 decisions added) |

---

## Cutover risk map — updated

### 🚨 Red (active harm now)

1. **Rule 2 in effect: sole trader still trading** — three July 2 invoices confirm this. Each day the Pty is not operational, the sole trader takes on obligations that should be the Pty's. The MRFF/ALIVE relationship ($167.2K) is the most significant — it should be invoiced by the Pty.
2. **D&O insurance overdue** — registered 24 April 2026, standard practice is 30 days → deadline ~24 May. Now 46 days past that. Pty has been unprotected for directors since registration. Bind immediately.
3. **Professional Indemnity** — target was 1 July 2026. Cutover passed without it. Each consulting engagement from July 1 onward is uninsured.
4. **FY26 BAS due 28 July (19 days)** — Standard Ledger handles but all sole trader receivables and R&D evidence must be reconciled by then.
5. **§12 Decision 1 (operating entity)** — blocks novation letters, from-1-July naming, subscription transfers. ALIVE/MRFF invoicing entity cannot be confirmed until this is decided.

### 🟠 Amber (urgent, recoverable)

6. **NAB Pty account** — blocked on Nick's trust docs per Jun 12. Unblock this first: Pty Xero and all financial operations depend on it.
7. **ABN / GST registration (Pty)** — follows NAB. Every invoicing, payroll, and subscription-transfer item blocked.
8. **Shareholders Agreement** — Pty has been trading-adjacent since April with no SHA. Two 50/50 shareholders under Corporations Act defaults = latent deadlock.
9. **Rotary INV-0222 ($82.5K, 455 days)** — FY26 BAS in 19 days. Write-off or chase decision required NOW.
10. **R&D FY26 window** — associate amounts must be PAID by June 30 to enter the FY26 claim. If founder draw or Knight Photography Phase 1 wasn't transferred by June 30, those amounts push to FY27.

### 🟡 Yellow (recoverable post-cutover, still important)

11. Novation letters (once Decision 1 lands + ABN + NAB bank details)
12. IP assignment deed
13. SaaS subscription transfers
14. GitHub org transfer
15. Email/website footer updates

---

## Open questions — carried forward

1. **Was §12 Decision 1 (operating entity) resolved?** Target was 19 June; no evidence in DB or drafts.
2. **Has the NAB Pty account been unblocked?** Jun 12 call: blocked on Nick's trust docs. Status unknown.
3. **D&O insurance — has it been bound?** No ACCPAY invoice in Xero to an insurance broker. Still unconfirmed 46+ days past deadline.
4. **FY26 founder draw** — were transfers ($200K each) made before June 30 per §12 decision 4? If not, the R&D FY26 claim is affected.
5. **Knight Photography Phase 1 invoice ($100K)** — still not raised per Jun 12. If not issued and paid by June 30, falls into FY27.
6. **Rotary INV-0222 (455 days)** — final decision before BAS lodgement.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `xero_invoices` GROUP BY xero_tenant_id | 1 tenant | 2026-07-09 |
| `bank_statement_lines` GROUP BY bank_account | 1 account (to Mar 2026) | 2026-07-09 |
| `xero_invoices` ACCREC, AUTHORISED+DRAFT, amount_due>0 | 14 rows | 2026-07-09 |
| `xero_invoices` status/type GROUP BY | summary | 2026-07-09 |
| `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` | full read incl §12 | 2026-07-09 |
| `thoughts/shared/drafts/` migration keyword grep | 1 novation draft | 2026-07-09 |
| `thoughts/shared/meetings/` | 1 meeting: 2026-06-12-standard-ledger-structure-call.md | 2026-07-09 |

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-05-14|Q3 entity migration — 2026-05-14 prior pass]]
- [[funder-alignment-2026-07-09|Q1 funder alignment — this pass]]
- [[project-truth-state-2026-07-09|Q2 project truth-state — this pass]]
- [[alignment-loop-drift-2026-05-14-to-2026-07-09|Drift summary — 2026-05-14 to 2026-07-09]]
- [[index|ACT Wikipedia]]
