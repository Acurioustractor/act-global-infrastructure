---
title: Entity migration truth-state — 65 days to cutover, novation template now exists
summary: Second run of the ACT Alignment Loop (Q3). One material change since baseline — novation letter templates drafted and committed (🔴→🟡). All structural blockers (ABN, NAB, Xero, D&O insurance) remain open. Outstanding ACCREC is $507,700 — essentially flat. D&O deadline is now 28 days away.
tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover]
status: active
date: 2026-05-08
---

# Entity migration truth-state — 2026-05-08

> Second artefact of the [[act-alignment-loop|ACT Alignment Loop]] Q3 cycle. Baseline: [[entity-migration-truth-state-2026-04-24|2026-04-24]]. Data pulled: 2026-04-26 (2 days post-baseline; file dated 2026-05-08 per loop schedule). Four sources: migration checklist at `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`, Supabase (Xero invoices, bank lines, tenant state), `thoughts/shared/drafts/**` (migration artefacts), baseline memory state.

## Headline findings

1. **One material change: novation letter templates drafted.** `thoughts/shared/drafts/novation-letter-templates.md` exists — two complete letter scaffolds (Template A for grant funders, Template B for commercial counterparties). This is a 🔴→🟡 flip on the "Novation letter template" checklist item. The templates need Standard Ledger review before any letter is sent; ABN and NAB bank details are still placeholder. But the artefact authoring has started — the baseline found zero migration drafts.
2. **All structural blockers remain open.** No Pty Xero file (still 1 xero_tenant_id). No Pty NAB business account (still `NAB Visa ACT #8815` only in bank_statement_lines). ABN still pending Standard Ledger. D&O insurance still unbound. These were 🔴 at baseline and remain 🔴 two days later.
3. **Outstanding ACCREC is $507,700 — essentially flat.** One Aleisha Keating weekly invoice cycled in (+$450). No payments received on any of the three critical funder invoices (Snow, Centrecorp, Rotary).
4. **D&O insurance deadline is now 28 days away (2026-05-24).** Registered 2026-04-24 + 30 days = 2026-05-24. No broker selected. No quote requested. This is the closest hard deadline in the migration.
5. **Two project_code tagging gaps were fixed.** INV-0324 (PICC $77K) now tagged ACT-PI. INV-0325 (Brodie $15.4K) now tagged ACT-BG. Minor hygiene wins from the baseline enumeration.

---

## Items × evidence × risk (delta view)

Days until 30 June 2026 cutover: **65 days** (from 2026-04-26 actual run date).

Only items that have changed status since baseline are shown in full. Unchanged items carry their baseline status.

### Section 1 — Entity setup

| Item | Baseline | 2026-04-26 | Delta |
|---|---|---|---|
| Pty registered at ASIC | ✅ DONE | ✅ DONE | → |
| Directors appointed | ✅ DONE | ✅ DONE | → |
| Shareholders set | ✅ DONE | ✅ DONE | → |
| Director IDs confirmed | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | → unchanged |
| ABN application (Pty) | 🔴 OPEN | 🔴 OPEN | → unchanged |
| GST registration | 🔴 OPEN | 🔴 OPEN | → unchanged |
| Standard Ledger briefed | ✅ DONE | ✅ DONE | → |

### Section 2 — Banking and payment rails

| Item | Baseline | 2026-04-26 | Delta |
|---|---|---|---|
| NAB business account (Pty) | 🔴 OPEN | 🔴 OPEN | → DB: still only NAB Visa ACT #8815 |
| Stripe account (Pty) | 🔴 NOT-YET-DUE | 🔴 NOT-YET-DUE | → |
| PayID / Osko | ⏳ BLOCKED ON NAB | ⏳ BLOCKED | → |
| Auto-debits audit | 🟡 OPEN | 🟡 OPEN | → |

### Section 3 — Xero

| Item | Baseline | 2026-04-26 | Delta |
|---|---|---|---|
| Pty Xero file opens | 🔴 OPEN | 🔴 OPEN | → DB: still 1 tenant ID (786af1ed…, 1,744 invoices) |
| Final sole trader BAS (Q4 FY26) | ⏳ NOT YET DUE | ⏳ NOT YET DUE | → |
| R&D FY26 claim | ⏳ NOT YET DUE | ⏳ NOT YET DUE | → |
| R&D FY27 re-registration | ⏳ NOT YET DUE | ⏳ NOT YET DUE | → |

### Section 4 — Grants and funders

#### Outstanding receivables (updated 2026-04-26)

| Counterparty | Invoice | Amount | Status | Age | Project | Delta vs baseline |
|---|---|---:|---|---:|---|---|
| **Snow Foundation** | INV-0321 | $132,000 | AUTHORISED | 39d | ACT-GD | → +2d, no payment |
| **Rotary eClub Outback Australia** | INV-0222 | $82,500 | AUTHORISED | **382d** | ACT-GD | → +2d, no decision |
| **Centrecorp Foundation** | INV-0314 | $84,700 | **DRAFT** | 72d | ACT-GD | → +2d, no decision |
| **PICC** | INV-0317 | $36,300 | AUTHORISED | 69d | ACT-PI | → +2d |
| **PICC** | INV-0324 | $77,000 | AUTHORISED | 18d | ACT-PI | ✅ project_code now tagged |
| **Regional Arts Australia** | INV-0301/0302 | $33,000 | AUTHORISED | 131d | ACT-HV | → +2d |
| **Just Reinvest** | INV-0295 | $27,500 | AUTHORISED | 56d | ACT-JH | → +2d |
| **Brodie Germaine Fitness** | INV-0325 | $15,400 | AUTHORISED | 11d | ACT-BG | ✅ project_code now tagged |
| **Aleisha J Keating** | INV-0238..0307 | $12,150 | AUTHORISED (×27) | 7d–387d | ACT-FM | → +1 invoice cycled in |
| **Homeland School Company** | INV-0303 | $4,950 | AUTHORISED | 67d | ACT-JH | → +2d |
| **SMART Recovery Australia** | INV-0322 | $2,200 | AUTHORISED | 38d | ACT-SM | → +2d |
| **TOTAL OUTSTANDING** | | **$507,700** | | | | ↑ $350 from baseline |

#### Novation work status

| Item | Baseline | 2026-04-26 | Delta |
|---|---|---|---|
| Novation letter template | 🔴 NOT STARTED | 🟡 DRAFT EXISTS | **🔴→🟡** — `novation-letter-templates.md` in drafts, pending Standard Ledger review |
| Novation letters to funders | 🔴 NOT STARTED | 🔴 NOT STARTED | → templates ready to populate but ABN + bank details still pending |
| Enumeration of active grants on sole trader | 🟡 IN PROGRESS | 🟡 IN PROGRESS | → Q1 synthesis enumeration still the source; no updates |

### Section 5 — Commercial contracts

All items remain 🔴 NOT STARTED or 🟡 PENDING from baseline. No new artefacts.

- Farm lease, Harvest lease, JusticeHub MoUs, Goods buyer novations, supplier notifications: unchanged.

### Section 6 — IP

All items remain 🔴 NOT STARTED. IP assignment deed (Nic → Pty) has no draft. GitHub org transfer not initiated.

### Section 7 — Insurance

| Item | Baseline | 2026-04-26 | Delta |
|---|---|---|---|
| Public Liability | 🔴 NOT STARTED | 🔴 NOT STARTED | → |
| Workers Comp | ⏳ NOT YET DUE | ⏳ NOT YET DUE | → |
| Professional Indemnity | 🔴 NOT STARTED | 🔴 NOT STARTED | → |
| **Directors & Officers** | 🟡 DUE IN ~30 DAYS | 🔴 **DUE IN 28 DAYS** | ⚠️ Deadline 2026-05-24 — no broker selected, no quote |
| Insurance broker selection | 🔴 NOT STARTED | 🔴 NOT STARTED | → |

**D&O is the nearest hard deadline in the entire migration.** Registered 2026-04-24. 30-day grace = 2026-05-24. No broker has been selected. If a broker can turn around a quote and binding in a week, the remaining window is ~21 days of shopping time. This is tight.

### Section 8 — Governance artefacts

| Item | Baseline | 2026-04-26 | Delta |
|---|---|---|---|
| Shareholders Agreement | 🔴 NOT STARTED | 🔴 NOT STARTED | → |
| Pty minute book | 🟡 UNVERIFIED | 🟡 UNVERIFIED | → |
| ASIC first annual review | ⏳ NOT YET DUE | ⏳ NOT YET DUE | → |

### Sections 9-10 — Subscriptions and Communications

All items remain 🔴 NOT STARTED from baseline. No new artefacts for GHL, Supabase, Vercel, Google Workspace, email footers, announcement email.

---

## Status summary (2026-04-26 vs baseline)

| Status | Baseline | 2026-04-26 | Delta |
|---|---:|---:|---|
| ✅ DONE | 5 | 5 | → |
| 🟡 IN PROGRESS / PARTIAL | 7 | 8 | ↑ +1 (novation template drafted) |
| 🔴 NOT STARTED / OPEN | 28 | 27 | ↓ −1 (novation template promoted) |
| ⏳ NOT YET DUE / BLOCKED | 13 | 13 | → |
| **Total** | **53** | **53** | |

---

## Cutover risk map (updated)

### 🚨 Red (unchanged from baseline — still blocking 1 July launch)
1. **D&O insurance** — 28 days to deadline. No broker. No quote. Most urgent.
2. **NAB business account** — still not opened. Blocks Stripe, Pty invoicing, subscription transfers.
3. **Pty ABN + GST** — Standard Ledger "Week 1-2" target. Now past Week 1. No evidence.
4. **Pty Xero file** — blocked on ABN.
5. **Director IDs confirmed** — still unverified.
6. **Centrecorp INV-0314 decision** — DRAFT invoice compromises Minderoo pitch credibility (deadline 2026-05-15).

### 🟠 Amber (must ship by mid-May)
7. **Novation letter batch** — template exists (🟡), but letters can't go out until ABN + NAB details fill the placeholders.
8. **IP assignment deed** — plan says Week 4-5. No draft.
9. **Shareholders Agreement** — should have been "at establishment." Overdue.
10. **Snow Foundation call** — confirm INV-0321 + Pty migration notice.
11. **Rotary eClub INV-0222 decision** — 382 days old.
12. **Harvest lease in Pty name** — lease_start 2026-07-01.

### 🟡 Yellow (recoverable post-cutover)
13. Email/website footer updates.
14. Announcement email.
15. Subscription audit and billing transfers.
16. GitHub org transfer.

---

## Migration drafts — what now exists on disk

```
thoughts/shared/drafts/novation-letter-templates.md  ← NEW since baseline
```

One migration-keyword file (matching `novation`). Baseline had zero. This is a genuine artefact now on disk.

The notes in the template confirm:
- Templates awaiting Standard Ledger review before sending
- ABN placeholder `{{PTY_ABN}}` — needs to be filled once Standard Ledger issues it
- Bank details placeholder `{{BANK_DETAILS_BLOCK}}` — needs NAB account active
- Minderoo and QBE are already Pty-contracted (don't need novation letters)
- Sequencing recommendation: grant funders before commercial counterparties

---

## Alignment-loop acceptance criteria

| Criterion | Met? |
|---|---|
| "This week" plan items either done or flagged | ✅ NAB 🔴, Director IDs ⚠️, D&O 🔴, ABN 🔴 |
| Every grant in Q1 live list has matching novation status | ✅ Snow/Rotary/Centrecorp all 🔴 send-pending (template now ready) |
| Drafts-but-not-sent distinguished from sent | ✅ Novation template = drafted, not sent — ABN + bank details still needed |

---

## Open questions — unchanged from baseline

1. Director IDs for Ben and Nic — confirmed via ASIC/ABRS?
2. NAB Pty account — application submitted?
3. Standard Ledger ABN target date — confirmed as first week of May?
4. Aleisha Keating retainer — continues under Pty? Currently 27 × $450 weekly invoices AUTHORISED.
5. Regional Arts Australia $33K — 131 days old. Chase status?
6. Lord Mayor's Charitable Foundation + Equity Trustees — active grants or not?

---

## Methodology

### Sources queried

| Source | Query / path | As-of |
|---|---|---|
| Plan | `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` | file |
| DB | `xero_invoices` ACCREC AUTHORISED+DRAFT amount_due>0 | 2026-04-26 |
| DB | `xero_invoices` GROUP BY xero_tenant_id | 2026-04-26 |
| DB | `bank_statement_lines` GROUP BY bank_account | 2026-04-26 |
| DB | `xero_invoices` status/type summary | 2026-04-26 |
| Drafts | `thoughts/shared/drafts/` — grep for migration keywords | 2026-04-26 |

### Caveats

1. **D&O insurance binding** — if Standard Ledger or Ben arranged a broker verbally or via email, it won't appear in DB. DB absence means unverified, not confirmed absent.
2. **ABN** — same caveat; ABN application status lives in Standard Ledger's workflow, not in any DB table.
3. **Director IDs** — still cannot be verified via DB; requires ASIC company extract or direct confirmation.
4. **Novation template date** — file is dated 2026-04-24, same day as baseline. It was likely created as part of the baseline alignment loop session (post-synthesis). In practice this represents less than 24 hours of artefact creation, but it is a genuine file on disk and counts as the first migration draft.

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[entity-migration-truth-state-2026-04-24|Q3 baseline — 2026-04-24]]
- [[funder-alignment-2026-05-08|Q1 second pass — funder receivables]]
- [[alignment-loop-drift-2026-04-24-to-2026-05-08|Drift summary — this pass vs baseline]]
- [[index|ACT Wikipedia]]
