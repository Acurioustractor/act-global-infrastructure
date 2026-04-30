---
title: Entity migration truth-state — 61 days to cutover, one 🔴 moved to 🟡
summary: Third artefact of the ACT Alignment Loop (Q3), Pass 2. 6 days elapsed since the 2026-04-24 baseline. Critical positive: novation letter template drafted (one 🔴 → 🟡). Critical negatives: Pty ABN, NAB account, and Pty Xero file still not opened. D&O insurance deadline now 24 days away.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover]
status: active
date: 2026-05-08
---

# Entity migration truth-state — 2026-05-08

> Third artefact of the [[act-alignment-loop|ACT Alignment Loop]], Pass 2. Queries ran 2026-04-30 (6 days after the 2026-04-24 baseline). Sources: `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` (updated with 4 cutover rules post-baseline), Supabase (Xero invoices, tenant state, bank lines), `thoughts/shared/drafts/**` (one novation draft found), and codebase plan files.

## Headline findings

1. **61 days to cutover. Three blockers still unopened.** The Pty ABN has not issued (Standard Ledger Week 1-2 target). The NAB Pty business account has not opened (applied "this week" per baseline — no confirmation). The Pty Xero file has not opened (blocked on ABN). These three are the critical path. Every subsequent step in the plan is blocked behind them.
2. **One 🔴 moved to 🟡 — novation letter template drafted.** `thoughts/shared/drafts/novation-letter-templates.md` appeared after the baseline. It contains two fully scaffolded templates (grant funders + commercial counterparties), placeholder-complete, ready for Standard Ledger review. The baseline had zero drafts. This is the only confirmed positive status change.
3. **New plans added.** `thoughts/shared/plans/new-entity-xero-launch-playbook.md` — a day-0 Xero setup playbook for the Pty file (Step 1 through Step 13, bank rules, tracking categories, contacts migration). `thoughts/shared/plans/pty-ltd-transition-and-rd-strategy.md` — R&D strategy context (pre-existing, dated 2026-03-17). These reduce execution risk once the ABN issues.
4. **CEO review applied to migration checklist (`9f353f1`).** Four cutover rules added: pre-cutover invoices stay with sole trader, fallback if ABN not ready by 1 July, Rotary recovery is separate from novation, Shareholders Agreement is Week 1-2 (not Week 4-5 as originally written). SHA is still not signed.
5. **D&O insurance deadline is now 24 days away (2026-05-24).** Registered 2026-04-24. 30-day window expires 2026-05-24. No broker selection or policy binding visible in Xero or plans. This is the most time-sensitive item in the checklist that can be acted on NOW.
6. **$507,700 outstanding on sole trader's books** (vs $507,350 baseline — +$350 from one additional Aleisha weekly). No invoices paid or resolved since baseline.

---

## Items × evidence × risk

Days until 30 June 2026 cutover: **61 days** (as of 2026-04-30).

### Section 1 — Entity setup (PRE-MIGRATION)

| Item | Target | Evidence | Status | At risk if slips |
|---|---|---|---|---|
| Pty registered at ASIC | Done | ACN 697 347 676 registered 2026-04-24 | ✅ DONE | n/a |
| Directors appointed (Ben + Nic) | Done | Confirmed at baseline | ✅ DONE | n/a |
| Shareholders set (Knight FT 50 / Marchesi FT 50) | Done | Confirmed at baseline | ✅ DONE | n/a |
| Director IDs confirmed | Week 1 | Still unverified | ⚠️ UNVERIFIED | Blocks ABN application |
| ABN application (Pty) | Week 1-2 (Standard Ledger) | No ABN visible | 🔴 OPEN | Blocks Xero file, invoicing, GST |
| GST registration (Pty) | With ABN | Paired with ABN | 🔴 OPEN | Blocks invoicing |
| Standard Ledger briefed | Week 1 | Confirmed at baseline | ✅ DONE | n/a |

### Section 2 — Banking and payment rails

| Item | Target | Evidence | Status | At risk |
|---|---|---|---|---|
| NAB business account (Pty) | Apply this week | Only "NAB Visa ACT #8815" in `bank_statement_lines` — no Pty account | 🔴 OPEN | Blocks Stripe, subscriptions, first Pty invoicing |
| Stripe account (Pty) | 1 July | No artefact | 🔴 OPEN (not-yet-due) | Customer payments route to sole trader |
| PayID / Osko on Pty NAB | After NAB opens | — | ⏳ BLOCKED ON NAB | — |
| Expense cards (Pty) | After NAB opens | — | ⏳ BLOCKED ON NAB | — |
| Auto-debits audit + migrate | By 1 July | No artefact | 🟡 OPEN | Silent continuation |

### Section 3 — Xero

| Item | Target | Evidence | Status | At risk |
|---|---|---|---|---|
| Pty Xero file opens | Week 3 | 1 xero_tenant_id only: `786af1ed-e3ce-42fc-9ea9-ddf3447d79d0` (sole trader, 1,744 invoices) | 🔴 OPEN | Can't issue Pty invoices July 1 |
| Pty Xero launch playbook | — | `thoughts/shared/plans/new-entity-xero-launch-playbook.md` now exists — 13-step Day-0 playbook | 🟡 PREPARED | n/a |
| Final sole trader BAS (Q4 FY26) | 28 July 2026 | Not yet (Q4 = Apr-Jun) | ⏳ NOT YET DUE | — |
| R&D Tax Incentive — FY26 claim | With tax return | Standard Ledger coordinating | ⏳ NOT YET DUE | Lose 43.5% if evidence thin |
| R&D FY27 re-registration (Pty) | Post-1-July | — | ⏳ NOT YET DUE | — |
| ABN (sole trader) cancellation | After final BAS | — | ⏳ NOT YET DUE | — |

### Section 4 — Grants and funders (CRITICAL PATH)

#### Outstanding receivables on sole trader's books (2026-04-30)

| Counterparty | Invoice | Amount | Status | Age (days) | Project | Action needed |
|---|---|---:|---|---:|---|---|
| **Snow Foundation** | INV-0321 | $132,000 | AUTHORISED | 43 | ACT-GD | Call Alexandra/Sally — payment + Pty migration notice |
| **Rotary eClub Outback Australia** | INV-0222 | $82,500 | AUTHORISED | **386** | ACT-GD | Chase-or-write-off decision (only-Ben) |
| **Centrecorp Foundation** | INV-0314 | $84,700 | **DRAFT** | 76 | ACT-GD | Send / void / reissue-from-Pty (only-Ben) |
| **PICC** | INV-0317 | $36,300 | AUTHORISED | 73 | ACT-PI | Confirm payment timing |
| **PICC** | INV-0324 | $77,000 | AUTHORISED | 22 | ACT-PI | Monitor; project_code fixed post-baseline |
| **Regional Arts Australia** | INV-0301/0302 | $33,000 | AUTHORISED | 135 | ACT-HV | Chase — 135d unusual |
| **Just Reinvest** | INV-0295 | $27,500 | AUTHORISED | 60 | ACT-JH | Chase |
| **Brodie Germaine Fitness** | INV-0325 | $15,400 | AUTHORISED | 15 | ACT-BG | Recent, monitor |
| **Aleisha J Keating** | INV-0238..0307 | $12,150 | AUTHORISED (×27) | 7d–301d | ACT-FM | Weekly $450 retainer — decide Pty continuation |
| **Homeland School Company** | INV-0303 | $4,950 | AUTHORISED | 70 | ACT-JH | Chase |
| **SMART Recovery Australia** | INV-0322 | $2,200 | AUTHORISED | 42 | ACT-SM | Chase |
| **TOTAL OUTSTANDING** | | **$507,700** | | | | |

#### Planned novation work

| Item | Target | Evidence | Status |
|---|---|---|---|
| Novation letter template | Week 5-6 | `thoughts/shared/drafts/novation-letter-templates.md` — two templates (grant funders + commercial counterparties), placeholder-complete | 🟡 DRAFT — Standard Ledger review needed before sending |
| Novation letters to Snow, Paul Ramsay, Lord Mayor's, Dusseldorp, Equity Trustees | Week 5-6 | None sent | 🔴 NOT STARTED (template exists; sending is next) |
| Enumeration of active grants on sole trader | Before Week 5 | Q1 synthesis partially enumerated; Q3 receivables list extends it | 🟡 IN PROGRESS |

### Section 5 — Commercial contracts (unchanged)

All items remain 🔴 NOT STARTED. No new drafts or evidence of progress since baseline.

### Section 6 — IP (unchanged)

| Item | Status |
|---|---|
| IP assignment deed (Nic → Pty) | 🔴 NOT STARTED |
| GitHub org transfer | 🔴 NOT STARTED |
| Trademark registration | 🔴 NOT STARTED |

### Section 7 — Insurance ⚠️ TIME-CRITICAL

| Item | Required by | Evidence | Status |
|---|---|---|---|
| Public Liability $20M | Before Harvest lease | No broker selection | 🔴 NOT STARTED |
| Workers Comp | First employee | No staff | ⏳ NOT YET DUE |
| Professional Indemnity | 1 July 2026 | No binding | 🔴 NOT STARTED |
| Product Liability | First Goods sale | — | ⏳ NOT YET DUE |
| **Directors & Officers** | **2026-05-24 (24 days)** | **No broker, no binding, no ACCPAY invoice in Xero** | **🔴 URGENT — 24 days remain** |
| Cyber | Year 1 | — | ⏳ DEFERRED |
| Insurance broker selection | Week 1 | No decision recorded | 🔴 NOT STARTED |

### Section 8 — Governance artefacts

| Item | Target | Status |
|---|---|---|
| Shareholders Agreement | Week 1-2 (per CEO review Rule 4) | 🔴 NOT STARTED — resequenced to Week 1-2 but still unsigned |
| Pty minute book | Ongoing | 🟡 UNVERIFIED |

### Sections 9–10 — Subscriptions and Communications (unchanged)

All subscription transfers (Xero, GHL, Supabase, Vercel, Google Workspace, Stripe, Anthropic, GitHub, etc.) and communications (email footers, website, announcement email) remain 🔴 NOT STARTED or ⏳ BLOCKED. Expected — most are scheduled for Weeks 7-8.

---

## Status summary

| Status | Baseline count | 2026-04-30 count | Change |
|---|---:|---:|---|
| ✅ DONE | 5 | 5 | → |
| 🟡 IN PROGRESS / PARTIAL | 7 | 8 | +1 (novation template drafted) |
| 🔴 NOT STARTED / OPEN | 28 | 27 | -1 (moved to 🟡) |
| ⏳ NOT YET DUE / BLOCKED | 13 | 13 | → |
| **Total** | **53** | **53** | |

53% of items not started is still expected — the plan sequences most artefacts for Weeks 5-8. But the three Standard-Ledger-dependent blockers (ABN, Pty Xero, NAB) are now on the critical path for everything else.

---

## Cutover risk map

### 🚨 Red (would materially damage 1 July launch if not done)

1. **D&O insurance binding — due 2026-05-24 (24 days).** No broker selected. This is the most immediately actionable 🔴 item.
2. **Pty ABN + GST rego** — blocks Pty Xero, invoicing. Standard Ledger Week 1-2.
3. **NAB business account** — blocks Stripe, subscriptions, Pty invoicing.
4. **Pty Xero file** — blocks all Pty invoicing from 1 July.
5. **Director IDs confirmed** — unverified; blocks ABN if missing.
6. **Centrecorp INV-0314 DRAFT decision** — $84.7K, Minderoo pitch deadline 2026-05-15.
7. **Shareholders Agreement** — resequenced to Week 1-2 per CEO Rule 4; still unsigned.

### 🟠 Amber (must ship by mid-May to hit 30 June cleanly)

8. **Snow Foundation INV-0321 call** — payment + Pty migration notice.
9. **Novation letters batch** — template exists; sending requires Standard Ledger review + ABN.
10. **IP assignment deed** — plan Week 4-5; needs lawyer turnaround.
11. **Enumeration of active grants** — prerequisite for novation batch.
12. **Rotary eClub INV-0222 decision** — 386 days old; chase-or-write-off.
13. **Harvest lease** — lease_start 2026-07-01; must be signed in Pty name.

### 🟡 Yellow (recoverable post-cutover)

14. Email/website footer updates, announcement email, Xero invoice template, subscription transfers, GitHub org transfer, trademark registration.

---

## Alignment-loop acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every "this week" action either verifiably done or flagged open | ✅ | All Week-1 items status tracked; ABN/NAB/Director IDs still 🔴 |
| Every grant in Q1's live list has novation status | ✅ | Template drafted; sending 🔴 |
| Drafts-but-not-sent distinguished from sent | ✅ | 1 draft (template), 0 sent |

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| Plan | `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` | 2026-04-30 (updated post-baseline) |
| DB | `xero_invoices` WHERE status IN (AUTHORISED, DRAFT) AND type=ACCREC AND amount_due>0 | 2026-04-30 |
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-04-30 |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-04-30 |
| DB | `xero_invoices` GROUP BY status, type | 2026-04-30 |
| Drafts | `thoughts/shared/drafts/` listing, filtered for novation/migration keywords | 2026-04-30 |
| Plans | `thoughts/shared/plans/` listing, filtered for entity/migration/pty keywords | 2026-04-30 |

### Caveats

1. **D&O insurance binding not in Xero** — no ACCPAY insurance invoice visible. If Standard Ledger or Ben bound a policy outside Xero, it wouldn't show here. Flagged as 🔴 based on absence of evidence.
2. **ABN not visible via DB** — Pty's ABN would only appear when Standard Ledger adds a new Xero tenant. The 1-tenant result confirms no new file. Does not confirm whether ABN application was submitted.
3. **Shareholders Agreement** — no internal copy referenced. Standard Ledger may have initiated. Flagged 🔴 as conservative default.
4. **Director IDs** — unverifiable via DB. Still ⚠️ UNVERIFIED.

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-05-08|Q1 funder alignment — second pass]]
- [[project-truth-state-2026-05-08|Q2 project truth-state — second pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 entity migration — 2026-04-24 baseline]]
- [[alignment-loop-drift-2026-04-24-to-2026-05-08|Drift summary — what changed between passes]]
- [[index|ACT Wikipedia]]
