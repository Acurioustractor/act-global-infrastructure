---
title: Alignment Loop drift — 2026-04-24 → 2026-05-08
summary: Drift summary across Q1 (funder alignment), Q2 (project truth-state), and Q3 (entity migration). Queries ran 2026-04-30, 6 days after the baseline. Key signal: one 🔴 moved to 🟡 (novation template drafted); three invoice decisions still unmade; D&O insurance 24 days away; config hygiene done; canonical_slug gap closed.
tags: [synthesis, alignment-loop, drift, entity-migration, funders, projects]
status: active
date: 2026-05-08
---

# Alignment Loop drift — 2026-04-24 to 2026-05-08

> **Queries ran 2026-04-30** (6 days after the baseline, not the full 14 days scheduled). The gap is shorter than planned; the signal is still clean. File dated 2026-05-08 per the scheduled second-pass cadence.

---

## TL;DR — what moved since 24 Apr

- **Q3 (Entity migration):** One positive — novation letter template drafted. Three red blockers unchanged: Pty ABN, NAB account, and Pty Xero file still not opened. D&O insurance deadline is now 24 days away and there is still no broker, no quote, no binding visible anywhere.
- **Q1 (Funder receivables):** Zero invoice status changes. Snow ($132K AUTHORISED, 43d), Centrecorp ($84.7K DRAFT, 76d), and Rotary ($82.5K AUTHORISED, 386d) are all exactly where they were 6 days ago. The call to Snow Foundation was not made, despite Minderoo's deadline being 15 days away.
- **Q2 (Project hygiene):** Material gains — ACT-AMT and ACT-APO removed from config, all 72 remaining codes now have `canonical_slug` (was 40+ missing), and ACT-SM correctly resolves to 4/4. ACT-PS wiki article authoring gap unchanged.

---

## Q1 — Funder alignment: what changed

**No material revenue movement.** Every outstanding invoice sits in exactly the same status as 2026-04-24. The drift below is clock ticking, not decisions made.

| Metric | 2026-04-24 | 2026-04-30 | Direction |
|---|---|---|---|
| Total ACCREC outstanding | $507,350 | $507,700 | ↑ +$350 (one Aleisha weekly) |
| Snow INV-0321 age | 37 days AUTHORISED | 43 days AUTHORISED | ↑ no payment, no call made |
| Centrecorp INV-0314 age | 70 days DRAFT | 76 days DRAFT | ↑ still unsent |
| Rotary INV-0222 age | 380 days AUTHORISED | 386 days AUTHORISED | ↑ still unresolved |
| Snow contact silence | 10 days | 17 days | ↑ call not made |
| Paul Ramsay Foundation silence | 80 days | 87 days | ↑ approaching 90d threshold |
| funders.json version | v1 (14 entries, missing 7) | v2 (21 entries, stubs added) | ↑ updated 2026-04-24 |
| New funders in Xero | — | 0 | → |
| Silent >90 days count | ~10 | ~10 (growing) | ↑ |
| Minderoo deadline | 21 days away | 15 days away | ↑ URGENT |

**What to call out:**

The Centrecorp DRAFT is now 76 days old and the Minderoo pitch is 15 days away. The pitch names Centrecorp as live pipeline evidence. The Centrecorp decision is now on the Minderoo critical path, not just the migration critical path.

Paul Ramsay Foundation will cross 90 days silent on approximately 2026-05-03 (already past at time of queries). William Frazer is tagged `partner + justicehub` in GHL — a warm relationship going cold.

---

## Q2 — Project truth-state: what changed

**Config hygiene executed; methodology gap closed; authoring backlog unchanged.**

| Metric | 2026-04-24 | 2026-04-30 | Direction |
|---|---|---|---|
| Total project codes | 74 | 72 | ↓ -2 (ACT-APO, ACT-AMT removed) |
| Codes missing `canonical_slug` | 40+ | 0 | ↓ fixed |
| Score 4/4 count | 28 | ~30+ (estimated) | ↑ (slug fix promotes several) |
| Score 1/4 count | 4 | 2 | ↓ -2 (ghosts removed) |
| Active/ideation projects <2/4 | 0 | 0 | → acceptance criterion holds |
| ACT-PS authoring backlog | 1 real gap | 1 real gap | → unchanged |
| ACT-SM false negative | 3/4 (missing slug) | 4/4 (slug fixed) | ↑ |
| Wiki articles | 88 | 90 | ↑ +2 |
| New active project codes added | — | 0 | → |
| New active project codes removed | — | 0 | → |

**What to call out:**

The `canonical_slug` fix is the highest-ROI change this pass. It unblocks Phase-1 automation of this synthesis (the scoring script can now run cleanly without manual slug lookup). That was the main structural blocker in the baseline.

ACT-PS remains the only real wiki authoring gap among active projects. The config now has `canonical_slug: picc-on-country-photo-studio` set — the article just needs to be written.

---

## Q3 — Entity migration: what changed

**MOST IMPORTANT.** 61 days to cutover. One green shoot; several amber ticking clocks.

| Metric | 2026-04-24 | 2026-04-30 | Direction |
|---|---|---|---|
| Days until cutover | 67 | 61 | ↓ 6 days consumed |
| xero_tenant_id count | 1 | 1 | → Pty Xero file NOT opened |
| bank_account entries | 1 (NAB Visa ACT #8815) | 1 (NAB Visa ACT #8815) | → Pty NAB NOT opened |
| ACCREC outstanding total | $507,350 | $507,700 | ↑ +$350 (noise) |
| AUTHORISED ACCREC invoices | ~36 | 37 | ↑ +1 (Aleisha) |
| DRAFT ACCREC invoices | 2 | 2 | → Centrecorp still draft |
| DRAFT ACCREC value | $84,700 | $84,700 | → |
| Novation drafts in `thoughts/shared/drafts/` | **0** | **1** | ↑ **TEMPLATE DRAFTED** |
| Novation letters sent | 0 | 0 | → not yet (template needs SL review + ABN) |
| D&O insurance binding | 🔴 | 🔴 | → URGENT — 24 days remain |
| D&O insurance broker selected | 🔴 | 🔴 | → still not started |
| Shareholders Agreement signed | 🔴 | 🔴 | → CEO Rule 4 resequenced to Week 1-2; still unsigned |
| Pty ABN issued | 🔴 | 🔴 | → Standard Ledger target Week 1-2; no confirmation |
| Director IDs confirmed | ⚠️ | ⚠️ | → still unverified |
| Section status: ✅ DONE | 5 | 5 | → |
| Section status: 🟡 IN PROGRESS | 7 | 8 | ↑ +1 (novation template) |
| Section status: 🔴 NOT STARTED | 28 | 27 | ↓ -1 (moved to 🟡) |
| Section status: ⏳ NOT YET DUE | 13 | 13 | → |

**Item-level transitions since 2026-04-24:**

| Item | 2026-04-24 | 2026-04-30 | Change |
|---|---|---|---|
| Novation letter template | 🔴 NOT STARTED | 🟡 IN PROGRESS (draft exists) | **POSITIVE** |
| Pty Xero launch playbook | (not tracked) | 🟡 PREPARED (`new-entity-xero-launch-playbook.md`) | **POSITIVE** |
| Centrecorp INV-0314 | 🔴 DRAFT, 70d | 🔴 DRAFT, 76d | negative (still unsent) |
| Director IDs | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | → (still unconfirmed) |
| NAB business account | 🔴 OPEN | 🔴 OPEN | → (no evidence of application) |
| ABN application | 🔴 OPEN | 🔴 OPEN | → |
| D&O insurance | 🟡 DUE IN ~30 DAYS | 🔴 DUE IN 24 DAYS | negative (clock running, no action) |
| Shareholders Agreement | 🔴 NOT STARTED | 🔴 NOT STARTED | → (resequenced to Wk 1-2 but still unsigned) |
| Snow call | 🔴 ACTION OUTSTANDING | 🔴 ACTION OUTSTANDING | → (not made) |

**What to call out plainly:**

The D&O insurance situation should be called out explicitly: it was flagged as "🟡 DUE IN ~30 DAYS" in the baseline, meaning the deadline was already known and visible. It is now 24 days away. The item requires broker selection → quote → binding — a 1–2 week process minimum. If no broker is engaged this week (i.e., by 2026-05-02, which is past at the time of this file), the policy will be late. Late D&O means the Pty is operating as an uninsured company with two directors. This is the one item on the checklist that has a hard deadline that cannot be extended by cutover-rule workarounds.

The Shareholders Agreement resequencing (CEO Rule 4, commit `9f353f1`) was the right call. It moved the SHA from "Week 4-5" to "Week 1-2." But it still has not been signed. Until it is signed, the two 50% shareholders have no agreed terms on deadlock resolution, dividends, or director removal. With a Minderoo pitch potentially due-diligencing the Pty's governance, this is a live risk.

---

## Interpretation

### What the trajectory says

Six days elapsed. In those six days:
- One artefact moved from 0 to exists (novation template)
- One methodology gap closed (canonical_slug)
- Two config ghosts removed
- Zero financial decisions made

The action list from the baseline was clear and specific. The Snow call hasn't happened. The Centrecorp decision hasn't happened. The D&O broker hasn't been engaged. The most charitable reading is that 6 days is a short window and the Standard Ledger dependencies (ABN, NAB) are outside Ben and Nic's direct control. The least charitable reading is that the three solo-decision items (Snow call, Centrecorp DRAFT, D&O broker) have no external blockers and still haven't moved.

### What the 14-day run (2026-05-08 actual) should show

If the plan is on track, the **next** pass (queries on 2026-05-08 actual date) should show:
- ABN issued (Standard Ledger Week 1-2)
- NAB application submitted with 2-week onboarding in flight
- D&O insurance broker engaged and quote in hand
- Snow Foundation call made, INV-0321 confirmed for payment, migration notice given
- Centrecorp decision made (INV-0314 sent or voided)
- SHA either signed or in final lawyer review

If none of those five have moved by 2026-05-08, the cutover is at material risk.

---

## Sources

All four synthesis artefacts queried Supabase project `tednluwflfhxyucgwigh` (confirmed `https://tednluwflfhxyucgwigh.supabase.co`), `config/project-codes.json` (v1.8.0), `wiki/narrative/funders.json` (v2), `wiki/projects/**` (90 files), `thoughts/shared/drafts/**`, and `thoughts/shared/plans/**`. Queries ran 2026-04-30.

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-05-08|Q1 funder alignment — second pass]]
- [[project-truth-state-2026-05-08|Q2 project truth-state — second pass]]
- [[entity-migration-truth-state-2026-05-08|Q3 entity migration — second pass]]
- [[funder-alignment-2026-04-24|Q1 baseline — 2026-04-24]]
- [[project-truth-state-2026-04-24|Q2 baseline — 2026-04-24]]
- [[entity-migration-truth-state-2026-04-24|Q3 baseline — 2026-04-24]]
- [[index|ACT Wikipedia]]
