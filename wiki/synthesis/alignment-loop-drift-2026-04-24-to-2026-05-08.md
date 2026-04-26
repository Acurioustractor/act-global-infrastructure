---
title: Alignment loop drift — 2026-04-24 to 2026-05-08
summary: Drift summary for the second ACT Alignment Loop pass. Actual data pulled 2026-04-26 (2 days post-baseline, not 14). One material change per question. Q1 — funder invoices unmoved, Paul Ramsay crossed 90-day silence threshold. Q2 — canonical_slug backlog fully cleared (40+→0), config trimmed 74→72. Q3 — novation template drafted (first migration artefact on disk), D&O deadline now 28 days away.
tags: [synthesis, alignment-loop, drift, entity-migration, funders, projects]
status: active
date: 2026-05-08
---

# Alignment loop drift — 2026-04-24 → 2026-05-08

> Drift summary for the second ACT Alignment Loop Phase 0 pass. Baseline commit `7d8f74d` + `83a9e7c` on `main`. Data pulled **2026-04-26** (actual run date — 2 days post-baseline, not 14; file dated 2026-05-08 per loop schedule). The 2-day vs 14-day gap means most operational metrics are flat by design; what changed did so in the 24 hours following the baseline session.

## TL;DR — what moved since 24 Apr

- **Q2 config hygiene landed completely:** all 40+ missing `canonical_slug` entries are now filled, and two phantom project codes (ACT-AMT, ACT-APO) are removed from config. The main Phase-1 automation blocker is gone.
- **Q3 first migration artefact on disk:** `novation-letter-templates.md` was committed — a 🔴→🟡 flip on the novation template item. Every other Q3 structural blocker (ABN, NAB, D&O insurance) remains 🔴, and D&O now has **28 days** to its hard deadline.
- **Q1 funder invoices are completely unmoved:** Snow $132K, Centrecorp $84.7K DRAFT, Rotary $82.5K all unchanged. No decisions, no payments. Minderoo deadline is 19 days away at data-pull date.

---

## Q1 — Funder alignment

### What changed

| Metric | 2026-04-24 | 2026-04-26 | Direction |
|---|---|---|---|
| Total outstanding ACCREC (all counterparties) | $507,350 | $507,700 | ↑ +$350 |
| funders.json version | v2 (21 funders, updated 2026-04-24) | v2 (21 funders, unchanged) | → |
| Snow Foundation INV-0321 | AUTHORISED 37d, $132,000 | AUTHORISED 39d, $132,000 | → no payment |
| Centrecorp Foundation INV-0314 | DRAFT 70d, $84,700 | DRAFT 72d, $84,700 | → no decision |
| Rotary eClub INV-0222 | AUTHORISED 380d, $82,500 | AUTHORISED 382d, $82,500 | → no decision |
| New funders in Xero not in funders.json | 0 | 0 | → |
| New entries added to funders.json | 0 (v2 remains at 21) | 0 | → |
| Funder-tagged contacts silent >90 days | ~5–10 (Jan batch) | 14+ | ↑ Paul Ramsay crossed threshold |
| Paul Ramsay Foundation silence | ~80d | 128d | ⚠️ crossed 90-day threshold |
| Minderoo deadline proximity | 21 days | 19 days | ↓ counting down |

### Commentary

Nothing material moved in Q1 in two days, which is expected. The three live funder invoices are untouched — no payments, no decisions, no communications. This is the expected shape of a 2-day drift window.

The meaningful signal is **Paul Ramsay Foundation** crossing 90 days silent. This wasn't actionable at baseline (80d); it's now in the silent-critical band. And the **Minderoo deadline** is advancing: 19 days from 2026-04-26, 9 days from the nominal 2026-05-08 run date.

**If this run were genuinely 14 days post-baseline (i.e. run on 2026-05-08):** Centrecorp would be 84 days DRAFT (getting closer to a write-off forcing function), Rotary would be 394 days, Snow would be 51d with D&O insurance also due in 16 days. The urgency curve steepens significantly over the full 14 days.

---

## Q2 — Project truth-state

### What changed

| Metric | 2026-04-24 | 2026-04-26 | Direction |
|---|---|---|---|
| Project codes in config | 74 | 72 | ↓ −2 (ACT-AMT, ACT-APO removed) |
| Codes missing canonical_slug | 40+ | **0** | ↓↓ complete resolution |
| wiki/projects/*.md files | 88 | 90 | ↑ +2 new articles |
| Score 4/4 count (estimated) | 28 | ~31 | ↑ ~3 (canonical_slug false-negs resolved) |
| Score 3/4 count (estimated) | 16 | ~13 | ↓ ~3 |
| Score 2/4 count (estimated) | 26 | ~24 | ↓ ~2 |
| Score 1/4 count | 4 | 4 | → (ACT-EFI, ACT-GCC remain) |
| Score 0/4 count | 0 | 0 | → |
| Active/ideation projects scoring <2/4 | 0 | 0 | → acceptance criterion met |
| Authoring backlog (real gaps) | 1 (ACT-PS) | 1 (ACT-PS) | → unchanged |
| Project_codes added / removed | — | −ACT-AMT, −ACT-APO | ✅ recommended cleanup done |
| ACT-PI Xero invoice count | 13 | 14 | ↑ INV-0324 project_code tagged |
| ACT-BG Xero invoice count | 2 | 3 | ↑ INV-0325 project_code tagged |

### Commentary

**The canonical_slug fix is the biggest single change across all three questions this pass.** The baseline identified 40+ missing slugs as the main blocker for Phase-1 automation of the project truth-state synthesis. Every one of those slugs is now populated. This unblocks `scripts/synthesize-project-truth-state.mjs` — once written, it will run clean against all 72 codes.

The ACT-AMT and ACT-APO removals were also recommended by the baseline. Two of the four "ghosts" are gone. ACT-EFI and ACT-GCC remain in config (low urgency).

ACT-PS remains the one genuine wiki authoring backlog item. Nothing else is a real gap — every active project is at 2/4 or better.

---

## Q3 — Entity migration (MOST IMPORTANT)

### What changed

| Metric | 2026-04-24 | 2026-04-26 | Direction |
|---|---|---|---|
| Days until cutover | 67 | 65 (actual) / 53 (nominal 2026-05-08) | ↓ |
| xero_tenant_id count | 1 | 1 | → Pty Xero still not opened |
| bank_account list | NAB Visa ACT #8815 only | NAB Visa ACT #8815 only | → Pty NAB still not opened |
| ACCREC AUTHORISED total | ~$422,650 | $423,000 | → flat (+$350) |
| ACCREC DRAFT total | $84,700 (Centrecorp) | $84,700 | → unchanged |
| Total outstanding ACCREC | $507,350 | $507,700 | → flat |
| DRAFT ACCREC count | 1 | 2 (one is $0) | → not material |
| INV-0314 Centrecorp status | DRAFT, 70d | DRAFT, 72d | → no decision |
| Director IDs confirmation | ⚠️ UNVERIFIED | ⚠️ UNVERIFIED | → |
| NAB account opened | 🔴 OPEN | 🔴 OPEN | → |
| ABN application lodged | 🔴 OPEN | 🔴 OPEN | → |
| **D&O insurance deadline** | ~30 days (due ~2026-05-24) | **28 days** | ⚠️ countdown |
| **Novation letter template** | 🔴 NOT STARTED | **🟡 DRAFTED** | **🔴→🟡** |
| Shareholders agreement | 🔴 NOT STARTED | 🔴 NOT STARTED | → |
| IP assignment deed | 🔴 NOT STARTED | 🔴 NOT STARTED | → |
| Migration drafts matching keywords | 0 | **1** (`novation-letter-templates.md`) | ↑ |
| Status: DONE | 5 | 5 | → |
| Status: IN PROGRESS / PARTIAL | 7 | 8 | ↑ +1 |
| Status: NOT STARTED / OPEN | 28 | 27 | ↓ −1 |
| Status: NOT YET DUE / BLOCKED | 13 | 13 | → |

### Commentary

Two things moved and they point in opposite directions:

**The good:** `novation-letter-templates.md` is the first migration artefact to appear on disk. Both templates (grant funders + commercial counterparties) are complete scaffolds — they just need ABN, bank details, and Standard Ledger review. This was a 🔴 at baseline ("Zero drafts — cleanly not started"). It's now 🟡. The work has begun.

**The concerning:** Every structural prerequisite is still 🔴. The novation letters can't go out until the ABN is issued (Standard Ledger) and the NAB account is opened (Nic). Both were "this week" items on the baseline plan. No DB evidence they've moved. If the ABN issues in Week 2 (early May) and NAB opens Week 3 (mid-May), the novation batch can go out in Week 5-6 as planned. If either slips, the batch compresses.

**D&O insurance is the nearest hard deadline.** 28 days from 2026-04-26 = 2026-05-24. No broker selected, no quote in any DB record. This is the one item in the migration that has a statutory hard date (30 days from ASIC registration). Everything else has a "plan target" — D&O has a legal clock.

**What should have flipped 🔴→🟡 since baseline that hasn't:**
- Director IDs confirmation (listed as "this week" in baseline's derived actions)
- NAB Pty account application (listed as "this week")
- Insurance broker selection / D&O research (listed as "this week")

All three remain at their baseline status. If those were genuinely addressed verbally or via email/Slack (not recorded in DB), that's fine — but the verifiable evidence doesn't exist yet.

---

## Cross-question summary

| Question | Baseline headline | 2026-04-26 state | Net change |
|---|---|---|---|
| Q1 Funder alignment | $507,350 outstanding, 3 unmoved invoices | $507,700 outstanding, 3 unchanged invoices | Minderoo deadline 2 days closer; PRF crossed 90d silence |
| Q2 Project truth-state | 74 codes, 40+ missing canonical_slug, 28 at 4/4 | 72 codes, 0 missing, ~31 at 4/4 | ✅ Major config hygiene done |
| Q3 Entity migration | 67d to cutover, 0 migration drafts, 5/7/28/13 | 65d, 1 draft, 5/8/27/13 | 🟡 First artefact on disk; all blockers still open |

---

## What to prioritise before the next loop run (nominal 2026-05-22)

Ordered by blast radius:

1. **🔴 D&O insurance — bind before 2026-05-24.** Zero days of slack. Select a broker this week.
2. **🔴 NAB Pty business account — apply.** Everything else in the migration depends on this.
3. **🔴 Pty ABN — confirm Standard Ledger has lodged.** Target was Week 1-2 (early May).
4. **🔴 Centrecorp INV-0314 — decide (10 minutes with Nic).** Minderoo deadline is 19 days away. DRAFT is a problem.
5. **🟡 Call Snow Foundation.** INV-0321 payment + Pty migration notice. Relationship is warm.
6. **🟡 Rotary eClub INV-0222 — chase or write off.** 382 days. Grows worse each week.
7. **🟡 Fill ABN + bank placeholders in novation template** once issued. Send funder batch by end of May.
8. **🟡 Shareholders Agreement — engage Standard Ledger's referred lawyer.**

---

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[funder-alignment-2026-04-24|Q1 baseline]] · [[funder-alignment-2026-05-08|Q1 second pass]]
- [[project-truth-state-2026-04-24|Q2 baseline]] · [[project-truth-state-2026-05-08|Q2 second pass]]
- [[entity-migration-truth-state-2026-04-24|Q3 baseline]] · [[entity-migration-truth-state-2026-05-08|Q3 second pass]]
- [[index|ACT Wikipedia]]
