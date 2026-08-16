---
title: Alignment Loop drift — 2026-05-14 to 2026-07-09
summary: 56-day drift summary across all three alignment loop questions. Snow $132K paid; Minderoo paused; ALIVE/MRFF $167.2K first invoices. Rule 2 in effect 9 days post-cutover — Pty not operational. D&O 46 days overdue. FY26 BAS due July 28.
tags: [synthesis, alignment-loop, drift, post-cutover]
status: active
date: 2026-07-09
---

# Alignment Loop drift — 2026-05-14 to 2026-07-09

> 56-day drift window. Comparison baseline: [[alignment-loop-drift-2026-04-24-to-2026-05-14|2026-05-14 pass]] (last committed). Covers Q1 (funder alignment), Q2 (project truth-state), Q3 (entity migration). Missing window: alignment-loop branches for 2026-06-11, 2026-06-18, 2026-06-25, and 2026-07-02 are on remote but unmerged — their findings are not captured here.

---

## TL;DR — what moved since 14 May

- **Snow Foundation $132K paid; Centrecorp $84.7K resolved.** Two of the three most-flagged receivables from the April baseline are now cleared. The $471.7K still outstanding is largely a mix of new Goods/Harvest community invoices and the critical ALIVE/MRFF relationship.
- **ALIVE/MRFF grant awarded and invoiced: $167.2K from the sole trader post-cutover.** The 5-year MRFF Mental Health partnership is ACT's largest new relationship since Centrecorp. First two invoices ($66K + $101.2K) were issued July 2 by the sole trader — confirming Rule 2 is in effect. No project_code assigned. This needs immediate attention.
- **Rule 2 confirmed: the cutover did not happen June 30.** Nine days in, the Pty Xero file has not opened, the Pty NAB account is still blocked on Nick's trust docs (per June 12 call), and the sole trader is still the trading entity. D&O insurance is 46 days past its 30-day-from-registration deadline. FY26 BAS is due July 28 — 19 days away. The migration is real but late.

---

## Q1 — Funder drift

### What changed

| Metric | 2026-05-14 | 2026-07-09 | Direction |
|---|---|---|---|
| Total ACCREC outstanding | $497,240 | $471,717.84 | ↓ −$25,522 |
| funders.json version | v2, 24 entries, updated 2026-05-07 | v2, 25 entries, updated 2026-07-07 | ↑ |
| funders.json delivery-partner stubs | mixed in | moved to partners.json | ↑ cleaner |
| Rotary INV-0222 age | 399 days | **455 days** | ↓ still unresolved |
| Snow Foundation INV-0321 | $132,000 AUTHORISED | **PAID** | ✅ |
| Centrecorp INV-0314 | $84,700 DRAFT (90 days) | **RESOLVED** (not in outstanding) | ✅ |
| PICC invoices total | ~$96,800 outstanding | **PAID / CLEARED** | ✅ |
| Minderoo stage | ask-pending ($2.9M, deadline 2026-05-15) | **paused** (internal restructure; re-engage Q3 FY27) | ⚠️ |
| ALIVE / MRFF relationship | not present | **$167,200 invoiced** (2 invoices, Jul 2) | 🆕 major new |
| Silent-90d-plus funders | Rotary (399d), Bryan Foundation batch | Rotary (455d), Jenn Brazier (373d), Social Impact Hub (233d) | → slight increase |
| New invoices missing project_code | 0 in active set | 6 invoices ($237.4K) | ↓ hygiene gap |

**Material calls:**

- **Snow $132K paid** is the single best news across all three synthesis questions. The relationship is healthy. Migration notice to Snow still needs confirmation.
- **Minderoo pause** is not a rejection — Lucy explicitly said internal restructure, re-engage Q3 FY27. The $2.9M ask is tabled. The JusticeHub Three Circles pitch is ready to go when she signals.
- **ALIVE/MRFF** is the biggest new relationship. $167.2K in year-1 invoices from a 5-year awarded grant. Year 1 milestone (interactive map) is Mar 2027–Sep 2028. This relationship needs a project code, a wiki article, and proper invoicing from the Pty entity once it's operational.
- **Rotary INV-0222 455 days**: FY26 BAS is due July 28. Write-off or chase — the next BAS lodgement is the last chance to correctly account for this in the sole trader's books.

---

## Q2 — Project truth-state drift

### What changed

| Metric | 2026-05-14 | 2026-07-09 | Direction |
|---|---|---|---|
| Total project codes in config | 74 | **74** | → |
| Score distribution (4/4 count) | ~28 | ~28 (estimated) | → |
| Authoring backlog (active, no wiki) | ACT-PS | ACT-PS + ALIVE/MRFF (new) | ↓ |
| Codes missing canonical_slug | 40+ | **40+ (unchanged)** | ↓ hygiene not addressed |
| Active invoices with null project_code | rare | **6 invoices, $237.4K** | ↓ new gap |
| ACT-SM total billed | ~$2,200 (outstanding) | **$158,930** (10 invoices total) | ↑ substantial new activity |
| ACT-PS total billed | ~$9,000 known | **$81,860** (6 invoices) | ↑ real gap, growing |
| New project code needed | — | ALIVE/MRFF (5-year grant) | 🆕 |
| Phase-1 automation (synthesize-project-truth-state.mjs) | not started | not started | → not addressed |

**Material calls:**

- **No score distribution regression**: the core project ledger (28 at 4/4, active projects all ≥2/4) appears stable. No new retirement candidates.
- **New invoicing pattern breaking project_code discipline**: Tandanya, Sonas (2nd invoice), Mounty, and both ALIVE invoices all arrived with null project_code. As new relationships scale post-cutover, the code-assignment step needs to happen at invoice-creation time, not retrospectively.
- **ALIVE/MRFF needs a dedicated project code**. It is a 5-year, multi-site (~$450K–$750K) research partnership and should not be lumped under ACT-EL or ACT-JH. Candidate: `ACT-MH` (Mental Health Research) — verify no existing use.

---

## Q3 — Entity migration drift (MOST IMPORTANT)

### What changed

| Metric | 2026-05-14 | 2026-07-09 | Direction |
|---|---|---|---|
| Days to/past cutover | 47 days until Jun 30 | **9 days past Jun 30** | → cutover date passed |
| Rule 2 in effect | N/A | **YES** (sole trader still trading) | 🔴 |
| xero_tenant_id count | 1 (sole trader, 2,094 inv) | **1 (sole trader, 2,247 inv)** | 🔴 Pty Xero not opened |
| Pty NAB account | unconfirmed | **blocked (Nick's trust docs, per Jun 12)** | 🔴 |
| Bank accounts in BSL | NAB Visa ACT #8815 only | NAB Visa ACT #8815 only | 🔴 |
| ACCREC outstanding | $497,240 | $471,717.84 | ↓ −$25,522 |
| DRAFT ACCREC sum | $84,700 (Centrecorp) | **$0** | ✅ resolved |
| Post-cutover invoices from sole trader | — | **$189,200** (3 invoices dated Jul 2) | 🔴 new exposure |
| D&O insurance | 🔴 10 days to deadline | 🔴 **46 days overdue** | 🔴 worse |
| Professional Indemnity | 🔴 not started | 🔴 **overdue (target was Jul 1)** | 🔴 worse |
| Novation letter template | drafted, awaiting review | **on hold — §12 decision 1 blocking** | → held |
| Novation letters sent | 0 | **0** | 🔴 |
| §12 operating entity decision | N/A (pre-Jun 12) | **unresolved, blocks novation** | 🆕 critical new blocker |
| Migration drafts on disk | 1 (novation template) | **1** (unchanged) | → |
| Items DONE | 6 | **6** | → (no new completions) |
| Items 🔴 NOT STARTED/LATE | 32 | **~35** | ↓ more overdue items |
| FY26 BAS due date | 28 July 2026 | **28 July 2026 — 19 days away** | 🚨 imminent |

**Material calls:**

- **Rule 2 is the operative reality.** The sole trader is still the trading entity 9 days post-cutover. This is explicitly allowed by the checklist (Rule 2). It is not a failure — it is the correct response to NAB being blocked. The risk is each day of delay expands the run-off book.
- **D&O insurance overdue by 46 days** is the most time-sensitive legal exposure. The Pty has been running director-unprotected since registration. This was flagged as "10 days to deadline" in the May 14 pass and has gotten worse.
- **§12 operating entity decision is the critical path blocker.** Whether the trading entity is the Pty itself or an `ACT Projects` subsidiary blocks ALL novation letters, ALL subscription transfers, ALL from-1-July naming. Until decided in writing, the whole migration is on hold.
- **FY26 BAS due July 28 (19 days)**: the R&D FY26 claim window (Apr 24–Jun 30 under Path C) closes with this BAS. If associate amounts (founder draw, Knight Photography Phase 1) were not paid by June 30, they roll to FY27. Standard Ledger handles the BAS; Ben needs to confirm what was paid before June 30.
- **If ABN + NAB unblock this week**, the migration sequence can complete by end-July: ABN → Pty Xero → first Pty invoices → novation letters → subscription transfers. The checklist is still executable; it just needs the NAB blocker removed.

---

## Item-by-item transition calls (flips since 2026-05-14)

| Item | Was (2026-05-14) | Now (2026-07-09) | Verdict |
|---|---|---|---|
| Snow INV-0321 $132K | 🟡 AUTHORISED | ✅ PAID | 🟢 resolved |
| Centrecorp INV-0314 $84.7K | 🔴 DRAFT 90d | ✅ RESOLVED | 🟢 resolved |
| PICC invoices ~$97K | 🟡 AUTH/PARTIAL | ✅ CLEARED | 🟢 resolved |
| D&O insurance | 🔴 10 days to deadline | 🔴 46 days OVERDUE | 🔴 worse |
| Professional Indemnity | 🔴 not started | 🔴 OVERDUE (Jul 1 target passed) | 🔴 worse |
| Rotary INV-0222 | 🔴 399 days | 🔴 455 days | 🔴 no action |
| Minderoo stage | ask-pending ($2.9M) | paused (internal restructure) | ⚠️ neutral—not lost |
| ALIVE/MRFF | nonexistent | 🆕 $167.2K awarded + invoiced | 🆕 significant gain |
| Holdco/ACT Projects decision | N/A | 🔴 unresolved, blocks novation | 🆕 critical new blocker |
| §12 overall | N/A | 🟡 4 decisions opened, tracking status unclear | 🆕 |
| Rule 2 status | N/A | 🔴 in effect | 🔴 sole trader still trading |

---

## Next actions — priority order

1. **Unblock NAB Pty account** — Nick's trust docs. This is the critical path first step. Everything else (ABN, Xero, invoicing, subscriptions) flows from here.
2. **Bind D&O insurance** — 46 days past deadline. Pick a broker and bind today.
3. **Resolve §12 Decision 1** (Pty vs ACT Projects subsidiary) — until this is in writing, novation letters are on hold.
4. **Assign project_codes to 6 null-code invoices** ($237.4K including ALIVE $167.2K).
5. **Decide Rotary INV-0222** — FY26 BAS due July 28, 19 days. Final chance.
6. **Create ALIVE/MRFF project code** in `config/project-codes.json` — `ACT-MH` candidate.
7. **Confirm R&D FY26 window** — were founder draw + Knight Photography amounts paid before June 30? If not, they roll to FY27.
8. **Update Snow framing_notes** in `funders.json` — still says "$132K outstanding", now paid.
9. **Confirm migration notice to Snow Foundation** (call Sally/Alexandra) — has the Pty transition been communicated?

---

## Sources queried

All sources as of 2026-07-09. See individual synthesis files for detailed query logs.

- [[funder-alignment-2026-07-09|Q1 — funder alignment 2026-07-09]]
- [[project-truth-state-2026-07-09|Q2 — project truth-state 2026-07-09]]
- [[entity-migration-truth-state-2026-07-09|Q3 — entity migration truth-state 2026-07-09]]

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[alignment-loop-drift-2026-04-24-to-2026-05-14|Previous drift — 2026-04-24 to 2026-05-14]]
- [[index|ACT Wikipedia]]
