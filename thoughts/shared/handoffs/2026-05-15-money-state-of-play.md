---
title: Money State of Play — Standard Ledger, Pty, Trusts, BAS, R&D, Farm, Charity
date: 2026-05-15
status: synthesis
owner: Ben Knight
fy_close: 2026-06-30
rd_lodgement_window: 2026-07-01 to 2027-04-30
canonical_links:
  - thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md
  - thoughts/shared/plans/rd-tax-incentive-fy2526-path-c.md
  - thoughts/shared/drafts/standard-ledger-combined-ask-2026-05-07.md
  - thoughts/shared/rd-pack-fy26/money-framework-decision-log-2026-04-15.md
  - wiki/decisions/2026-05-harvest-subsidiary-structure.md
  - wiki/decisions/2026-04-act-farm-repositioning.md
notion_target: ACT Money Framework → new "FY26 Close Sprint" page (parent 357ebcf981cf8101bc12dd5eab9ebec5)
---

# Money State of Play — what we know, what's blocked, what happens by when

Today: **2026-05-15**. FY26 close: **30 June 2026 (46 days)**. R&D lodgement window: **1 Jul 2026 – 30 Apr 2027**.

One sentence: the engagement with Standard Ledger is real, paid, and live — but the entire chain is sitting on a single 31-day-old draft email in Ben's outbox (Knight Family Trust TFN), and two BAS are overdue. Unblock that draft and the next eight weeks have a clear sequence.

---

## 1. Standard Ledger — the relationship as it actually stands

**Who's who**

| Role | Person | Email surface |
|---|---|---|
| Partner / strategy | Remco Marcelis | benjamin@ + 5 May 2026 Zoom + Mar 2026 scoping |
| Company secretary / incorporation | Vanessa Ordoñez | cosecAU thread (Pty incorporation, trust documentation) |
| BAS preparer | Robhie | "Kick off BAS service" thread |
| ATO portal / agent setup | Kylie Carter | 13 May email confirming SL = BAS agent for Nick |

**Scope locked in (Remco, 18 Mar 2026 proposal accepted via Ignition)**

- Knight Family Trust (new) — deed prepared 8 Apr 2026, TFN application open
- Marchesi Family Trust (existing) — referenced as ACT shareholder
- A Curious Tractor Pty Ltd (NewCo) — **incorporated 22 Apr 2026** by Vanessa, **ACN 697 347 676**
- R&D Tax Incentive (FY25-26 via Pty, Path C) — SL "typically reach out in June to start preparing", $5,500 starting fee
- Quarterly BAS @ $75/month

**Paid invoices**

- INV-22414 ($165, 1 Apr) ✓
- INV-22718 ($165, 1 May) ✓
- INV-22728 ($1,381, 4 May) ✓

**Unsigned**

- Latest Ignition proposal — reminder fired 13 May 2026, still unsigned. Sign-block — Ben.

---

## 2. State of play by workstream

### 2.1 A Curious Tractor Pty Ltd

| Element | State |
|---|---|
| ASIC incorporation | ✓ 22 Apr 2026, ACN 697 347 676 |
| Form 201 + initial resolutions + share certs + bank-account resolution | ✗ unsigned (per 22 Apr handover email) |
| ANNERLEY postcode error on 4 ACT docs | Vanessa committed to amend 20 Apr, no confirmation since — chase |
| ABN / TFN / GST / PAYGW | "Currently processing" per Vanessa 22 Apr — letters from ATO expected by post ~29 Apr. **Now 16 days late, chase ATO mail or SL** |
| Company bank account | ✗ not yet opened (needs Form 201 signed first + share-capital deposit) |
| Xero file for Pty | ✗ not yet opened |
| D&O insurance | ✗ not bound |
| Migration checklist | 10 sections drafted in `act-entity-migration-checklist-2026-06-30.md`, status: 58% not started, 12% in progress, 5% complete |
| Domain + subscription transfers | Pending cutover |
| Receivables to clear before cutover | $537,240 across 39 invoices — top: Snow Foundation $132K, PICC $96.8K, Centrecorp $84.7K, Rotary Eclub $82.5K |

### 2.2 Family trusts

| Element | State |
|---|---|
| Knight Family Trust deed | ✓ prepared 8 Apr 2026 |
| Knight Family Trust TFN app | **BLOCKED ON BEN** — Vanessa requested 14 Apr (Carla's TFN/DOB + Ben's TFN/DOB). Reply drafted but **not sent for 31 days**. This blocks trust ABN → blocks the Pty shareholder finalisation chain. |
| Marchesi Family Trust | Active (existing), 50% holder of ACT Pty. Director ID provided 2 Apr. No dedicated Notion entity page. |
| FTE election | Pending (referenced in `wiki/projects/knight-family-trust` — see Notion page `2bcebcf981cf801db1b4c0139e423bee`) |
| Trust distribution strategy | Conceptual — flagged in 9 May Task Register as P1, no formal decision yet |

### 2.3 BAS + bookkeeping

| Element | State |
|---|---|
| SL = formal BAS agent for Nick (sole trader) | ✓ 13 May 2026, Kylie confirmed via ATO portal |
| Q2 FY26 BAS (due 28 Feb 2026) | **OVERDUE** — combined Q2+Q3 GST liability ~$35,867.77 per Task Register 9 May |
| Q3 FY26 BAS (due 28 Apr 2026) | **OVERDUE** |
| Xero access for SL (xero@standardledger.co admin) | ✓ granted 30 Mar 2026 |
| `files.read` Xero scope | ✗ blocked — Xero Files scan can't run until reauth |
| Aleisha bad-debt write-off ($12,150 / 27 invoices) | Drafted in `standard-ledger-combined-ask-2026-05-07.md`. Script ready at `scripts/write-off-aleisha-invoices.mjs` — needs SL confirmation of account code (likely 6800), then ~60 sec to apply |
| Receipt coverage | 95.3% per spending-intelligence v3, $109K R&D offset on the table |
| 55-row P0 receipt operator pack | Open — Bunnings $571.10 + 16 NAB project tags + 6 review-linked + 24 clean + 8 find-and-match |
| ATO Statement of Account export + $9,000 payment allocation | Open task, owner Ben |
| Q4 FY26 BAS (Apr-Jun 2026, due 28 Jul) | Not yet prepped |
| Predecessor (Thriday) handover | None needed per Robhie |

### 2.4 R&D Tax Incentive — FY25-26 application

**Path locked (2026-04-27):** FY24-25 forfeited (sole-trader period, ineligible). Claim FY25-26 via A Curious Tractor Pty Ltd. Lodgement window opens 1 Jul 2026 and closes 30 Apr 2027.

| Element | State |
|---|---|
| Evidence pack | `thoughts/shared/rd-pack-fy26/` — 4 core registers (ACT-CG, ACT-EL, ACT-JH, ACT-GD) + 2 supporting (ACT-DO, ACT-FM), $354,047 total |
| YTD numbers (9 months to Mar 2026) | $338,036 R&D-eligible / $147,046 refund @ 43.5% |
| Projected full-year | $450,715 R&D-eligible / $196,061 refund (realistic range $180-220K per rebuttal doc) |
| Pack grade | **WARN/62** (`scripts/grade-pack.mjs`) — structural ceiling until external inputs land |
| Rule 1.5 (personnel basis) | **Unverified — biggest substance gap.** Closed by SL counter-signing the decision log. |
| Founder time allocations | Nic 60% R&D, Ben 85% R&D (Ben unpaid FY26 — flagged in rebuttal as needs PSI/PSB framing) |
| 5 decisions awaiting SL sign-off | Founder R&D totals (Ben $237.5K via Knight Photography invoicing; Nic $80K retrospective director-salary), Ben project-mix (60/10/10/10/5/5), Nic R&D split (25% ACT-GD, 15% ACT-EL, 60% operational), per-project reconciliation (ACT-CG ⊂ ACT-IN), aggregated turnover under $20M (43.5% rate confirmed) |
| Notion page "R&D Tax Package FY26 — Complete" | **STALE / wrong entity** — lists ACT Foundation CLG with sole-trader ABN. Tracked for correction in task `352ebcf981cf811cb9eded8efd3efd2c` |
| AusIndustry R&D activity registration deadline | 30 Apr 2027 |
| Five missing Qantas receipts | $1,757 total, open |
| Retrospective tagging of founder R&D salary in Xero | Pending — post sign-off |

### 2.5 The farm + The Harvest — two different things, two different entities

These often get conflated. They are not the same.

| Entity | Code | What it is | Legal home |
|---|---|---|---|
| **Act-Farm (Witta)** | ACT-FM | 150-acre Jinibara Country property, residency/accommodation business, June's Patch, eco-cottages | Sits **inside** A Curious Tractor Pty Ltd. Lease: Nic's trust → ACT. Post-cutover treated as ACT-FM project line. R&D-eligible (residency hosting of researchers counts). |
| **The Harvest** | ACT-HV | Cafe / shop / events / venue ~1km from the farm, separate landlord (the philanthropist landlord with ~$60M logistics-business exit, providing site at 50% market rent on a sliding scale) | **Separate Pty Ltd subsidiary** of ACT Pty — decision locked 5 May 2026 with SL. Target incorporation: before opening, Sep 2026. |

**Act-Farm repositioning** (decided 2026-04-12): public messaging shifts from "40% of profits to community ownership / beautiful obsolescence" → "regenerative capital engine — every dollar funds the next residency". Land-based businesses are designed for compounding; the obsolescence principle is preserved for the software (EL, JH, Goods).

**The Harvest subsidiary structure**
- Shareholding: ACT Pty majority, landlord/investor minority (split TBD)
- Profit-share waterfall: preference dividends to landlord up to a defined return, then ordinary dividends pro-rata
- Separate Xero file, separate bank account, separate ABN/GST/TFN
- Services Agreement: ACT charges Harvest for ops/finance/marketing/brand (arm's length, ATO defensible)
- Lease: novated or re-signed in Harvest Pty's name from day one
- Shareholders Agreement: SL's referred lawyer drafts; needs % split + reserved matters + drag/tag/pre-emption
- Status: agreed in principle Ben+Nic+SL; landlord not yet briefed; lawyer not yet engaged; ASIC not yet lodged

### 2.6 Goods on Country + Butterfly Movement charity transition

**Two separate moves**, both needed:

(a) **Register Goods on Country Pty Ltd** — new trading/operating company for Goods. Already in your action list from the 12 May TABOO board meeting. Notion has the conceptual financial model + cockpit but no incorporation page yet.

(b) **Transition The Butterfly Movement Ltd → Goods's DGR1 charitable home**. Director swap, not entity close-down. Mechanics:

| Step | Constraint |
|---|---|
| 21-day notice for AGM | Hard rule, constitution |
| 28-day notice for director nominations to secretary | Hard rule, constitution |
| AGM cannot run before 30 Jun 2026 | Constitution requires annual financials, which can't be finalised until FY close |
| Earliest realistic AGM window | Mid-July 2026 at the soonest |
| Adelaide visits available for in-person sign-off | 1 June + second-last week of June |

**Counterparties**
- Eloise Hall (TABOO co-founder, ex-chair of Butterfly Movement)
- John Cranwell (current Butterfly Movement chair) — call held 14 May 5pm AEST
- Sonia (Butterfly Movement board, legal/tax expert) — needs early meeting, busy mid-to-late June
- Briony Marshall (Butterfly Movement board, did 2022 transfer from Souls for Souls → Butterfly Movement, has institutional memory)

**Proposed Goods charity board** (per the prep doc you wrote)
- Kristy Bloomfield (Oonchiumpa, traditional owner, founding director — confirmed in Goods Cockpit Notion page)
- Nicholas Marchesi OAM
- Benjamin Knight
- Eloise Hall (continuity)

**Goods is "sold as-is"** — no financial assets, IP, stock, trademarks transferring. Just the DGR1 status itself + brand-licence model (similar to how TABOO licensed brand to the foundation). Butterfly Movement bank account closes; new one opens under reconstituted board.

**Strategic option (Eloise raised):** register Goods on Country trademark under a Curious Tractor Pty Ltd and license it to the charity — keeps optionality for later commercial scaling.

---

## 3. Critical blockers — today

In dependency order. The first two unblock the rest.

1. **Send the Knight Family Trust TFN reply** to Vanessa (Carla's TFN+DOB + Ben's TFN+DOB). Sitting in draft 31 days. This blocks: trust TFN → trust ABN → Pty shareholder finalisation → entity migration → R&D pack entity verification.
2. **Sign the latest Standard Ledger Ignition proposal** (reminder fired 13 May).
3. **Sign + return Form 201 + initial resolutions + share certificates + bank-account resolution** to Vanessa.
4. **Chase ATO mail** — ABN/TFN/GST/PAYGW letters expected ~29 Apr, now 16 days overdue. Confirm with Vanessa whether they were sent to ANNERLEY-wrong-postcode and need re-issuing.
5. **Send the combined-ask email** to Remco (`thoughts/shared/drafts/standard-ledger-combined-ask-2026-05-07.md`) — closes Aleisha $12,150 writeoff + R&D rule 1.5.

---

## 4. Dated plan to 30 June 2026 (FY close)

**Week of 19 May (this week)**
- Mon-Tue: Send the trust TFN reply. Sign the SL Ignition proposal. Sign + return all post-incorporation docs to Vanessa.
- Wed: Send the combined-ask email to Remco. Chase Vanessa on ANNERLEY postcode + ATO mail status.
- Thu: Open ACT Pty bank account (assuming Form 201 returned by then). Initial share-capital deposit.
- Fri: Resolve Q2+Q3 BAS path with Robhie — either lodge late + ATO payment plan, or get clarity on penalty regime. Pay the $9K against Statement of Account.

**Week of 26 May**
- Open Xero file for ACT Pty (port chart of accounts via `config/xero-chart-import.csv` + tracking categories via `scripts/seed-xero-tracking.mjs`).
- Receive SL counter-signature on R&D decision log → update pack status: Draft → Signed_off → Verified → re-grade (target WARN/62 → WARN/75+).
- Apply Aleisha writeoff via `scripts/write-off-aleisha-invoices.mjs` once SL confirms account code.
- Bind D&O insurance for ACT Pty.
- **Meeting with Sonia** (Butterfly Movement) — book this week. Sonia busy mid-to-late June.

**Week of 2 June (Adelaide visit 1 Jun)**
- In-person with Eloise + ideally Sonia. Agree the AGM timing (mid-July realistic). Lock the 4-board-member nomination list (Kristy + Nic + Ben + Eloise). Brief the landlord on Harvest subsidiary proposal.
- Engage SL's referred lawyer on Harvest subsidiary heads of agreement.
- Register Goods on Country Pty Ltd via ASIC.

**Week of 9 June**
- Heads of agreement drafted with Harvest landlord. Sign.
- Begin contract novation for ACT's commercial agreements (start with the top 5 by value).
- Begin grant-funder novation conversations (top 4 outstanding receivables: Snow, PICC, Centrecorp, Rotary).

**Week of 16 June**
- Lodge ASIC application for The Harvest Pty Ltd.
- Receivables push — target ≥80% of the $537K cleared before cutover.

**Week of 23 June (Adelaide visit second-last week)**
- In-person with Sonia + John re Butterfly Movement transition mechanics.
- Issue 21-day AGM notice + 28-day director nomination notice (timed so AGM lands ~21 July).
- Finalise founder director nominations to Butterfly Movement secretary.
- Final pre-cutover Xero reconciliation. All sole-trader open invoices either cleared or migrated.

**Mon 30 June — cutover day**
- Sole trader stops trading. ACT Pty live from 1 July.
- Final sole-trader Xero close. R&D founder time allocations retrospectively tagged.
- The Harvest Pty Ltd ABN/GST/TFN registrations submitted.

---

## 5. Plan from 1 Jul 2026 → 30 Apr 2027

**Jul 2026**
- Q4 FY26 BAS lodged (due 28 Jul) — Robhie prepares.
- Final FY26 R&D pack lock — close all 5 warnings (rule 1.5 via SL, AusIndustry 1.2 via Standard Ledger introduction, gold sets 2.3, outcome capture 2.4). Target PASS grade.
- R&D Tax Incentive lodgement opens 1 Jul. SL "typically reaches out in June" → kickoff late Jun / early Jul.
- Butterfly Movement AGM ~21 Jul: directors swap, John+Eloise+Briony+current step down, Kristy+Nic+Ben+Eloise step in.
- The Harvest Pty Ltd: ABN issued, bank account, Xero file open.

**Aug 2026**
- R&D Tax Incentive lodged via ACT Pty (target — earlier in window is cleaner).
- Harvest novate lease into Harvest Pty's name.
- Butterfly Movement reconstituted: bank account closed, DGR1 brand licence to Goods on Country Pty Ltd executed.

**Sep 2026**
- The Harvest public opening.
- First philanthropy receipts into Butterfly Movement (now Goods's DGR home) — donor onboarding live.

**Oct 2026** — Q1 FY27 BAS prep (Robhie).
**Jan 2027** — Q2 FY27 BAS due 28 Feb.
**Apr 2027** — Q3 FY27 BAS due 28 Apr. **AusIndustry R&D activity registration deadline 30 Apr 2027 — hard.**

---

## 6. What to push into Notion (3 surfaces)

Recommended structure — wants confirmation before any Notion writes.

**(a) New consolidated page: "FY26 Close Sprint — May-Jun 2026"**
- Parent: ACT Money Framework (`357ebcf981cf8101bc12dd5eab9ebec5`)
- Contents: §3 critical blockers + §4 dated plan (above), as a checklist
- Link out to: Knight Family Trust page, Pty Ltd entity page, R&D Setup page, ACT Business Admin HQ, Harvest subsidiary decision, Butterfly Movement transition meeting page

**(b) Decisions Log backfill** (database `f8b0bfb6-b5ad-4b18-829e-15c4561f55e0` — confirmed has the schema for `Owner=Standard Ledger`, tags `cutover`/`r-and-d`/`tax`/`family`/`cgt`/`trust`/`entity-structure`). Missing entries to add:
1. R&D Path C decision (FY24-25 forfeit, claim FY25-26 via Pty) — tag `r-and-d` + `entity-structure`, decided 2026-04-27
2. Aleisha bad-debt $12,150 write-off — tag `tax`, drafted 2026-05-07
3. Q2+Q3 FY26 BAS lodgement approach (lodge-late vs payment-plan) — tag `cutover`, status decision-needed
4. Standard Ledger 5 May 2026 strategy call outcomes (§11 of migration checklist) — tag `entity-structure` + `family` + `cutover`
5. Marchesi Family Trust — create dedicated entity page (currently only mentioned across 4+ pages)
6. The Harvest subsidiary structure — tag `entity-structure`, decided 2026-05-05 (already exists in wiki, mirror as Decisions Log entry)
7. Butterfly Movement → Goods DGR1 transition — tag `entity-structure`, agreed-in-principle 2026-05-14

**(c) Stale page to supersede**
- "R&D Tax Package FY26 — Complete" (`333ebcf981cf81069af2fbd6f938179f`) lists ACT Foundation CLG with sole-trader ABN. **Wrong entity.** Add a top-of-page banner: "SUPERSEDED — see Path C decision, claim via A Curious Tractor Pty Ltd ACN 697 347 676." Link to canonical R&D Setup page.

---

## 7. Open questions for Ben (before any push)

1. The 31-day TFN draft — what's missing on the form? (Carla's TFN/DOB? Just hit send?)
2. Q2+Q3 BAS lodgement — has Robhie already started prep, or are we still in the "wait for ATO access to clear" state? Last clear signal was 13 May (Kylie confirmed agent access, Robhie picking up).
3. ANNERLEY postcode — has the corrected version arrived? Vanessa's silence since 20 Apr is concerning given the ATO mail dependency.
4. Adelaide visits 1 Jun + second-last week Jun — are these confirmed flights? AGM mechanics ride on these.
5. Did the 14 May 5pm call with John Cranwell + Briony happen? Notion page exists but no follow-up in this synthesis.
6. The Harvest landlord — has the subsidiary-structure brief been delivered, or is that still TBD?
7. Notion push — proceed with (a) new FY26 Close Sprint page, (b) 7 Decisions Log backfill entries, (c) superseded banner on stale R&D page?

---

**Sources reconciled across:** Gmail (4 mailboxes), filesystem (`thoughts/shared/`, `wiki/`, `scripts/`), Notion (ACT Money Framework, Business Admin HQ, Mission Control, Decisions Log DB, Task Register 9 May). Cross-source contradictions resolved in favour of latest dated source. No external write actions taken — this is a read-only synthesis.
