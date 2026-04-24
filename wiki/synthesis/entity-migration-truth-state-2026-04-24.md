---
title: Entity migration truth-state — 67 days to cutover, what's done vs open
summary: Third artefact of the ACT Alignment Loop (Q3). For each item in the entity migration checklist, cross-references plan intent with DB evidence + draft evidence + memory state. Surfaces the real outstanding-on-sole-trader figure ($507K) and ranks items by cutover risk.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover]
status: active
date: 2026-04-24
---

# Entity migration truth-state — 2026-04-24

> Third artefact of the [[act-alignment-loop|ACT Alignment Loop]]. Four sources: the 10-section cutover checklist at `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`, Supabase (Xero invoices, transactions, bank lines, tenant state), `thoughts/shared/drafts/**` (novation + comms drafts), and `project_act_entity_structure.md` (memory state).

## Headline findings

1. **$507,350 outstanding on the sole trader's books, 67 days before cutover.** Q1's synthesis flagged ~$299K across three funders (Snow, Rotary, Centrecorp). The full exposure is 70% larger once recurring customers (Aleisha Keating $11.7K × 26 invoices), partner receivables (PICC $113.3K across two invoices), and other counterparties (Regional Arts Australia $33K, Just Reinvest $27.5K, Brodie Germaine Fitness $15.4K, Homeland School $5K, SMART Recovery $2.2K) are added. Every one of these is a migration-or-close-out decision.

2. **Phase 1 of the plan (weeks 1-3) is substantially done today.** The Pty registered at ASIC 2026-04-24. Shareholders (Knight Family Trust 50 / Marchesi Family Trust 50) and directors are in place. QBE Catalysing Impact is already contracted against the Pty. Bank preference (NAB) and accountant (Standard Ledger) are locked. These are the hardest-to-reverse steps — they're in the bag.

3. **Phase 2-3 (weeks 3-8) has zero artefacts on disk.** No novation letter template in `thoughts/shared/drafts/`. No IP assignment deed draft. No shareholders agreement. No subscription audit output. No announcement email. The plan schedules these for weeks 5-6, so "no artefact yet" is on-schedule but the countdown is 9 weeks with Standard Ledger turnaround in the middle — the artefact authoring should start this week.

4. **Only one Xero tenant visible in DB** (`786af1ed-e3ce-42fc-9ea9-ddf3447d79d0` = Nic's sole trader, 1,742 invoices). No Pty Xero file evidence yet. Plan target was "Week 3: Pty Xero file opens" — 2 weeks out from now. Standard Ledger blocker.

5. **Only one bank account in `bank_statement_lines`** — "NAB Visa ACT #8815" (sole trader card). No Pty NAB business account transactions yet. Plan target is "apply this week, 2-week onboarding" — NAB application is the gating step for everything else in banking/Stripe/subscriptions.

---

## Items × evidence × risk

Days until 30 June 2026 cutover: **67 days**.

### Section 1 — Entity setup (PRE-MIGRATION)

| Item | Target | Evidence of completion | Status | At risk if slips |
|---|---|---|---|---|
| Pty registered at ASIC | Done before 30 Jun | Memory: ACN 697 347 676 registered 2026-04-24 | ✅ DONE | n/a |
| Directors appointed (Ben + Nic) | Done | Memory confirms | ✅ DONE | n/a |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | Done | Memory confirms | ✅ DONE | n/a |
| Director IDs confirmed for both directors | Week 1 | Memory: "presumably registered when A Kind Tractor was incorporated, but confirm for the new Pty" | ⚠️ UNVERIFIED | Can't open NAB account, can't apply ABN without director IDs |
| ABN application (Pty) | Week 1-2 (Standard Ledger) | No ABN visible in memory; memory says "ABN pending" | 🔴 OPEN | Delays Xero file, invoicing, GST rego |
| GST registration (Pty) | With ABN | Paired with ABN | 🔴 OPEN | Delays invoicing |
| Standard Ledger briefed | Week 1 | Memory confirms engagement | ✅ DONE | n/a |

### Section 2 — Banking and payment rails

| Item | Target | Evidence | Status | At risk |
|---|---|---|---|---|
| NAB business account (Pty) | Apply this week, 2-week onboarding | Only "NAB Visa ACT #8815" (sole trader) in `bank_statement_lines`; no Pty account visible | 🔴 OPEN | Blocks Stripe, subscriptions, first Pty invoicing |
| Stripe account (Pty) | 1 July | No artefact | 🔴 OPEN (not-yet-due) | Customer payments still route to sole trader Stripe post-cutover |
| PayID / Osko on Pty NAB | After NAB opens | — | ⏳ BLOCKED ON NAB | B2B payment friction |
| Expense cards (Pty) | After NAB opens | — | ⏳ BLOCKED ON NAB | Founder reimbursements only |
| Auto-debits audit + migrate | By 1 July | No artefact; Q2 synthesis shows no consolidated subscription list | 🟡 OPEN | Silent continuation into Pty era |

### Section 3 — Xero

| Item | Target | Evidence | Status | At risk |
|---|---|---|---|---|
| Pty Xero file opens | Week 3 | DB shows 1 xero_tenant_id (Nic sole trader, 1,742 invoices) | 🔴 OPEN | Can't issue Pty invoices July 1 |
| Final sole trader BAS (Q4 FY26) | 28 July 2026 | Not yet (Q4 runs Apr-Jun) | ⏳ NOT YET DUE | n/a |
| R&D Tax Incentive — FY26 claim (sole trader) | With tax return | No artefact; memory notes Standard Ledger coordinating | ⏳ NOT YET DUE | Lose 43.5% refund if evidence thin (running separate concern in spending-intelligence system) |
| R&D — FY27 re-registration (Pty, AusIndustry) | Post-1-July | No artefact | ⏳ NOT YET DUE | FY27 R&D offset lost if re-registration slips |
| ABN (sole trader) cancellation | After final BAS | — | ⏳ NOT YET DUE | n/a |

### Section 4 — Grants and funders (CRITICAL PATH)

Q1 funder-alignment synthesis flagged 3 funders. Reality is bigger.

#### Outstanding receivables on sole trader's books

| Counterparty | Invoice | Amount | Status | Age | Project | Action needed |
|---|---|---:|---|---:|---|---|
| **Snow Foundation** | INV-0321 | $132,000 | AUTHORISED | 37d | ACT-GD | Call Sally/Alexandra: confirm payment + Pty migration notice |
| **Rotary eClub Outback Australia** | INV-0222 | $82,500 | AUTHORISED | **380d** | ACT-GD | Chase-or-write-off decision (only-Ben) |
| **Centrecorp Foundation** | INV-0314 | $84,700 | **DRAFT** | 70d | ACT-GD | Send / void / reissue-from-Pty (only-Ben) |
| **PICC** | INV-0317 | $36,300 | AUTHORISED | 67d | ACT-PI | Partner receivable — confirm PICC payment timing |
| **PICC** | INV-0324 | $77,000 | AUTHORISED | 16d | (none) | Partner receivable — confirm, **fix missing project_code** |
| **Regional Arts Australia** | INV-0301/0302 | $33,000 | AUTHORISED | 129d | ACT-HV | Chase; 129d old is unusual |
| **Just Reinvest** | INV-0295 | $27,500 | AUTHORISED | 54d | ACT-JH | Partner receivable — chase |
| **Brodie Germaine Fitness Aboriginal Corp** | INV-0325 | $15,400 | AUTHORISED | 9d | (none) | Recent, monitor; **fix missing project_code** (ACT-BG) |
| **Aleisha J Keating** | INV-0238..0307 | $11,700 | AUTHORISED (×26) | 7d–295d | ACT-FM | Weekly $450 recurring; **decide if retainer continues post-cutover under Pty** |
| **Homeland School Company** | INV-0303 | $4,950 | AUTHORISED | 65d | ACT-JH | Chase |
| **SMART Recovery Australia** | INV-0322 | $2,200 | AUTHORISED | 36d | ACT-SM | Chase |
| **TOTAL OUTSTANDING** | | **$507,350** | | | | |

**Interpretation:** the receivable book is concentrated — Snow + Rotary + Centrecorp + PICC-pair + Regional Arts = $441K (87% of the total). Everything else is small-dollar and mostly recent. But every line needs a migration or close-out decision before 30 June.

#### Planned novation work (scheduled but not started)

| Item | Target | Evidence | Status |
|---|---|---|---|
| Novation letter template | Week 5-6 | Zero drafts in `thoughts/shared/drafts/` | 🔴 NOT STARTED |
| Novation letters to Snow, Paul Ramsay, Lord Mayor's, Dusseldorp, Equity Trustees, any Commonwealth/state grant | Week 5-6 | None drafted | 🔴 NOT STARTED |
| Enumeration of active grants on sole trader | Before Week 5 | Q1 synthesis partially enumerated funders; customer-side receivables enumerated here | 🟡 IN PROGRESS |

### Section 5 — Commercial contracts

| Item | Target | Evidence | Status |
|---|---|---|---|
| Innovation Studio consulting — novation letters | Week 5-6 | No drafts | 🔴 NOT STARTED |
| JusticeHub partnerships (NJP, community MoUs) | Week 5-6 | No drafts | 🔴 NOT STARTED |
| Goods on Country buyer relationships (19 active) | Week 5-6 | No email template | 🔴 NOT STARTED |
| Harvest lease (Sonas Properties) — sign in Pty name from day one | Before lease signing | Memory: lease_start 2026-07-01, early_access 2026-01-01 — lease not yet signed | 🟡 PENDING |
| Farm lease (Nic as landlord, Pty as tenant) | NEW LEASE | No draft | 🔴 NOT STARTED |
| Empathy Ledger licensing arrangements | NOVATE | No artefact | 🔴 NOT STARTED |

### Section 6 — IP

| Item | Target | Evidence | Status |
|---|---|---|---|
| IP assignment deed (Nic → Pty) | Week 4-5 | No draft in `thoughts/shared/drafts/` | 🔴 NOT STARTED |
| GitHub org transfer (Acurioustractor → Pty identity) | Before 1 July | No evidence; `Acurioustractor/` org still referenced as canonical | 🔴 NOT STARTED |
| Trademark registration (Empathy Ledger, JusticeHub, ALMA, Goods on Country) | Post-Pty | No trademark research file | 🔴 NOT STARTED |

### Section 7 — Insurance

| Item | Required by | Evidence | Status |
|---|---|---|---|
| Public Liability $20M | Before Harvest lease signing | No broker selection, no binding evidence | 🔴 NOT STARTED |
| Workers Comp | First employee | No staff yet | ⏳ NOT YET DUE |
| Professional Indemnity | 1 July 2026 | No binding | 🔴 NOT STARTED |
| Product Liability | First Goods product sale | — | ⏳ NOT YET DUE |
| Directors & Officers | Within 30 days of registration | Registered 2026-04-24 — D&O due by ~2026-05-24 | 🟡 DUE IN ~30 DAYS |
| Cyber | Year 1 recommended | — | ⏳ DEFERRED |
| Insurance broker selection | Week 1 | No decision recorded | 🔴 NOT STARTED |

### Section 8 — Governance artefacts

| Item | Target | Evidence | Status |
|---|---|---|---|
| Shareholders Agreement | At establishment (before 3rd-party investment) | No draft; Standard Ledger's referred lawyer TBC | 🔴 NOT STARTED |
| Pty minute book (registration + director acceptance + share subscription + banking resolution) | Week 1-3 | No internal copy referenced | 🟡 UNVERIFIED |
| ASIC first annual review | ~2026-04-24 (next year) | — | ⏳ NOT YET DUE |

### Section 9 — Subscriptions and tooling

| Item | Target | Evidence | Status |
|---|---|---|---|
| Full subscription audit | Week 7-8 | `subscription_patterns` table has 38 recurring vendors identified; no consolidated "this-needs-Pty-transfer" report | 🟡 DATA AVAILABLE |
| Xero (Pty file) | Week 3 | Not yet (see §3) | 🔴 OPEN |
| GHL CRM | 1 July | No artefact | 🔴 NOT STARTED |
| Supabase (3 projects) | 1 July | No artefact | 🔴 NOT STARTED |
| Vercel | 1 July | No artefact | 🔴 NOT STARTED |
| Google Workspace (4 mailboxes) | 1 July | No artefact | 🔴 NOT STARTED |
| Stripe, Anthropic, OpenAI, Gemini, GitHub, Notion, Cloudflare, domain registrar(s), Telegram, PM2 | 1 July | No artefact | 🔴 NOT STARTED |

### Section 10 — Communications (1 July switchover)

| Item | Target | Evidence | Status |
|---|---|---|---|
| Email footer updates (all @act.place) | 1 July | No artefact | 🔴 NOT STARTED |
| Website footers (act.place, project sites) | 1 July | No artefact | 🔴 NOT STARTED |
| Xero invoice template (Pty) | 1 July | Blocked on Pty Xero file | ⏳ BLOCKED |
| Announcement email to funders, partners, community | Week of 1 July | No draft | 🔴 NOT STARTED |
| Business cards | 1 July | No artefact | 🟢 LOW-URGENCY |

---

## Status summary

| Status | Count | Share |
|---|---:|---:|
| ✅ DONE | 5 | 9% |
| 🟡 IN PROGRESS / PARTIAL / UNVERIFIED | 7 | 13% |
| 🔴 NOT STARTED / OPEN | 28 | 53% |
| ⏳ NOT YET DUE / BLOCKED | 13 | 25% |
| **Total items tracked** | **53** | |

53% of items not started is expected — the plan sequences most artefacts for weeks 5-8. But the time-cost of Standard-Ledger-dependent items (ABN, GST, Pty Xero, NAB account, legal drafts, D&O insurance) will compress if any of them slip past week 4.

## Alignment-loop acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every "this week" action in plan either verifiably done or flagged as open | ✅ | "This week" items (NAB applied, Standard Ledger briefed, Director IDs confirmed, insurance brokers researched): Standard Ledger briefed ✅; NAB applied/Director IDs/insurance brokers 🔴 open |
| Every grant in Q1's live list has a matching novation status | ✅ | Snow/Rotary/Centrecorp all 🔴 NOT STARTED in novation column |
| Drafts-but-not-sent distinguished from sent items | ✅ | Zero drafts found — cleanly "not started" rather than "drafted, awaiting" |

---

## Cutover risk map

Ranked by blast-radius × days-until-hard-date:

### 🚨 Red (would materially damage 1 July launch if not done)
1. **NAB business account opens** — blocks Stripe, auto-debits, subscription transfers, D&O insurance billing. Apply this week.
2. **Pty ABN + GST rego** — blocks Pty Xero file, first Pty invoice. Standard Ledger week 1-2.
3. **Pty Xero file opens** — blocks all invoicing from 1 July. Standard Ledger week 3.
4. **D&O insurance binding** — due ~2026-05-24 (30 days from registration).
5. **Director IDs confirmed for Ben + Nic** — currently unverified per memory; if missing, blocks ABN.
6. **Centrecorp INV-0314 DRAFT decision** — $84,700, blocks Goods → Minderoo pitch credibility.

### 🟠 Amber (must ship by mid-May to hit 30 June cleanly)
7. **Novation letter template + send to all current funders** — plan says week 5-6 (roughly 2026-05-22 to 2026-06-05). No draft exists yet.
8. **IP assignment deed (Nic → Pty)** — plan says week 4-5. Needs lawyer review turnaround.
9. **Enumeration of active grants on sole trader** — prerequisite for novation-letter batch.
10. **Shareholders Agreement** — "at establishment" per plan, overdue.
11. **Snow Foundation INV-0321 ($132K) call** — Q1 synthesis flagged; warm-relationship + Pty migration notice conversation.
12. **Rotary eClub INV-0222 ($82.5K) 380-day decision** — chase or write off.
13. **Harvest lease (Sonas Properties) sign in Pty name** — lease_start 2026-07-01.
14. **Farm lease (Nic ↔ Pty, arm's-length rate)** — Standard Ledger rate confirmation.

### 🟡 Yellow (recoverable post-cutover but best done by 30 June)
15. Email/website footer updates.
16. Announcement email to funders and partners.
17. Xero invoice template swap.
18. Subscription billing transfers (audit in week 7-8 per plan).
19. GitHub org transfer.
20. Trademark registration (post-Pty priority).

### ⏳ Deferred (correctly post-cutover)
- Sole trader ABN cancellation (after final BAS lodged).
- FY26 R&D claim (lodge with sole trader tax return by 31 Oct 2026).
- FY27 R&D AusIndustry re-registration (post-1-July).
- ASIC annual review (2027).

---

## Open questions — things DB/drafts/memory can't answer

1. **Are Director IDs for Ben and Nic already registered** from the A Kind Tractor Ltd setup? If yes, same IDs apply; if no, apply via ABRS immediately (takes 10 minutes online but requires identity verification).
2. **Has NAB business account application been submitted?** No evidence in DB, but evidence would only appear once an account is live and transactions flow. Worth asking Nic directly.
3. **Has Standard Ledger been given the target ABN date?** The plan says "Standard Ledger handles. Target: first week of May" but no visible deadline commit.
4. **Aleisha Keating — is this a retainer that continues under the Pty?** 26 × $450 weekly invoices AUTHORISED, oldest 295 days. Worth understanding: is this a billing issue (client not paying) or a cadence issue (ACT hasn't chased)? And: does the retainer continue post-cutover?
5. **Regional Arts Australia $33K 129-day old** — chase status?
6. **Lord Mayor's Charitable Foundation + Equity Trustees** — named in plan's funder-notify list but absent from Q1 synthesis (no Xero invoice history). Are these actually active grants, or were they planned-but-never-landed?
7. **Subscription audit output** — `subscription_patterns` table has 38 vendor patterns. Running `scripts/reconciliation-report.mjs` with a subscription-focused filter would produce the Week 7-8 deliverable early.

---

## Derived actions — sorted by 30 June cutover risk

### This week (Week 1 on plan, now)
1. **Ben/Nic**: confirm Director IDs exist and are valid for both. If missing, apply via ABRS today.
2. **Nic**: submit NAB Pty business account application.
3. **Ben**: research 3 insurance brokers for D&O + PL quotes; decision by end of week.
4. **Ben + Standard Ledger**: confirm ABN application filed this week with target week 1-2 ABN issue.
5. **Ben**: decide INV-0314 Centrecorp (send / void / reissue-from-Pty).

### Next 2 weeks (Weeks 2-3)
6. Open Pty Xero file once ABN issues.
7. NAB account active → Stripe account for Pty.
8. D&O insurance bound (deadline ~2026-05-24).
9. Draft novation letter template (can start now, iterate with Standard Ledger).
10. Full enumeration of grants-on-sole-trader (Q1 synthesis partial; extend).

### Weeks 4-5
11. Send novation letters to all current funders (Snow, Paul Ramsay, Lord Mayor's, Dusseldorp, Equity Trustees if active, Commonwealth/state if any).
12. IP assignment deed drafted + signed.
13. Shareholders agreement drafted + signed.

### Weeks 6-8
14. Subscription audit output (leverage existing `subscription_patterns` table).
15. Customer novations.
16. Harvest lease signed in Pty name.
17. Farm lease drafted.

### Week 9 (22-29 June)
18. Final sole trader invoices raised.
19. Sole trader Xero closes to new entries.
20. Email/website footer updates staged.

### Cutover (30 June) + Week 10-12
21. Sole trader stops trading, Pty starts.
22. Announcement email.
23. Footer switch.
24. Final sole trader BAS prep.

---

## Methodology

### Sources queried
| Source | Query / path | As-of |
|---|---|---|
| Plan | `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` | file |
| Plan | `thoughts/shared/plans/act-entity-alignment-2026-04.md` | file |
| Memory | `project_act_entity_structure.md` (2026-04-24) | memory |
| DB | `xero_invoices` WHERE status IN (AUTHORISED,DRAFT) AND type=ACCREC AND amount_due>0 | 2026-04-24 |
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-04-24 |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-04-24 |
| DB | `xero_invoices` WHERE reference/contact_name ILIKE '%Pty%' | 2026-04-24 |
| Drafts | `thoughts/shared/drafts/` listing, filtered for novation/transition/funder/announcement | 2026-04-24 |

### Caveats
1. **Novation drafts could exist elsewhere** — I searched `thoughts/shared/drafts/` for keywords (`novation|transition|migration|handover|assignment|pty|funder|announcement`). If Standard Ledger drafts live on Google Drive / email, they wouldn't show here. Ben to flag any off-repo artefacts.
2. **Director IDs not visible via DB** — sole trader's Xero doesn't store the Pty's governance state. Memory flags this as unverified.
3. **Active grants on sole trader** — partial enumeration via Q1 synthesis; exhaustive list would require chasing Lord Mayor's + Equity Trustees + any Commonwealth/state with Nic.
4. **Insurance bindings not in Xero** — D&O + PL policies, when bound, would appear as ACCPAY invoices. Today the Xero shows zero insurance-broker invoices. If policies are bound but not invoiced yet, memory needs updating.

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-04-24|Q1 funder alignment — the narrower receivables view]]
- [[project-truth-state-2026-04-24|Q2 project truth-state]]
- [[index|ACT Wikipedia]]
