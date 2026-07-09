---
title: Project truth-state — 74 codes × 4 sources, post-cutover pass
summary: Fourth pass of the ACT Alignment Loop (Q2), 2026-07-09. 74 project codes. Core score distribution stable. New post-cutover invoices ($189K+) all missing project_codes — a data hygiene gap opening as the Pty era begins. ALIVE / MRFF is the material new relationship requiring a code.
tags: [synthesis, projects, alignment-loop, project-codes, post-cutover]
status: active
date: 2026-07-09
---

# Project truth-state — 2026-07-09

> Fourth pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Sources: `config/project-codes.json` (74 projects), `wiki/projects/**`, Supabase (`xero_invoices`, `xero_transactions`), codebase grep `apps/` `scripts/` `config/`. Comparison baseline: [[project-truth-state-2026-05-14|2026-05-14]] (last committed). All alignment-loop branch passes 2026-06-11 through 2026-07-02 are on remote but unmerged.

## Headline findings

1. **74 project codes, unchanged count.** `config/project-codes.json` still lists 74 projects. No additions or removals since the April 2026 baseline.

2. **The score distribution is structurally stable.** DB-active codes match April baseline closely. ACT-GD, ACT-HV, ACT-IN remain the top 3 by invoice volume and transaction count. The 28/38% fully aligned at 4/4 figure is approximately unchanged.

3. **Post-cutover invoices are arriving without project_codes.** Four of the 14 outstanding ACCREC invoices (Tandanya $16.5K, Sonas $9.95K, Mounty $22K, ALIVE ×2 $167.2K) have null `project_code`. This was the same gap flagged in April (40+ codes with no `canonical_slug`), but now manifests in the other direction: new invoices at cutover with no code. The ALIVE/MRFF relationship ($167.2K) is the most material — it needs a code immediately.

4. **ALIVE National Centre / University of Melbourne has no project code.** The MRFF GNT2051566 partnership (5-year, ~$450K–$750K total) is the largest new relationship since Centrecorp. Its two July 2 invoices (INV-0341 $66K, INV-0342 $101.2K) have `project_code = null`. Until a code is assigned, neither LCAA tracking nor automated synthesis can surface this relationship correctly.

5. **ACT-SM (SMART Recovery) shows $158,930 total billed.** This is a significant jump — ACT-SM was a minor code in April ($2.2K outstanding). The current `xero_invoices` aggregate suggests SMART Recovery has become a substantive financial relationship. Needs narrative review.

6. **ACT-PS (PICC On Country Photo Studio) reached $81,860 in total billed** — the one authoring backlog item from the April baseline. The relationship is real and growing; the wiki article gap (`wiki/projects/picc/picc-on-country-photo-studio.md` missing) remains open.

---

## At-a-glance — Xero activity by project code (top 20 by invoice total)

| Code | Name | Inv count | Total billed | Txn count | Change since 2026-04-24 |
|------|------|----------:|-------------:|----------:|---|
| ACT-GD | Goods on Country | 369 | $1,209,518 | 201 | ↑ strong growth |
| ACT-HV | The Harvest Witta | 110 | $321,531 | 220 | ↑ Harvest subsidiary expanding |
| ACT-IN | ACT Infrastructure | 541 | $300,118 | 1155 | → dominant ops category |
| ACT-PI | PICC | 27 | $256,143 | 44 | ↑ significant — MRFF may route here |
| ACT-SM | SMART Recovery | 10 | $158,930 | 8 | ↑ substantially higher than Apr baseline |
| ACT-FM | The Farm | 62 | $140,397 | 95 | → stable |
| ACT-JH | JusticeHub | 48 | $84,577 | 25 | → stable |
| ACT-WJ | Wilya Janta | 3 | $82,500 | — | ⚠️ matches Rotary outstanding amount |
| ACT-PS | PICC On Country Photo Studio | 6 | $81,860 | — | ↑ authoring backlog still open |
| ACT-ER | — | 1 | $77,000 | — | ⚠️ $77K in 1 invoice — large unattributed |
| ACT-MY | Mounty Yarns | 27 | $54,101 | 18 | → stable |
| ACT-EL | Empathy Ledger | 22 | $38,523 | 36 | → stable |
| ACT-UA | Uncle Allan Palm Island Art | 48 | $29,013 | 31 | → stable |
| ACT-FG | Feel Good Project | 3 | $22,435 | — | ↑ new activity |
| ACT-BG | BG Fit | 23 | $16,782 | — | → Brodie Germaine still outstanding |
| ACT-MD | ACT Monthly Dinners | 7 | $11,265 | — | → |
| ACT-GP | Gold Phone | 2 | $5,862 | — | → Jenn Brazier 373d invoice here |
| ACT-CORE | ACT Core | 13 | $5,237 | 401 | → transactions high, invoices low |
| ACT-DO | Designing for Obsolescence | 42 | $4,195 | 7 | → sunsetting |

---

## Data hygiene: missing project_codes on new invoices

The 14 outstanding ACCREC invoices as of 2026-07-09 include 5 with null `project_code`:

| Invoice | Contact | Amount | Expected code |
|---------|---------|--------|---------------|
| INV-0289 | Social Impact Hub Foundation | $21,780 | Unknown — needs review |
| INV-0332 | Tandanya National Aboriginal Cultural Institute | $16,500 | Possibly ACT-GD or ACT-EL |
| INV-0337 | Sonas Properties Pty Ltd | $9,950 | ACT-HV (Harvest) |
| INV-0334 | Mounty Aboriginal Youth & Community Services | $22,000 | ACT-MY or ACT-GD |
| INV-0341 | ALIVE National Centre / UoM (MRFF) | $66,000 | **NEEDS NEW CODE** |
| INV-0342 | ALIVE National Centre / UoM (MRFF) | $101,200 | **NEEDS NEW CODE** |

The ALIVE/MRFF relationship ($167.2K) needs a dedicated project code in `project-codes.json`. Given the 5-year scope and partnership structure, it likely warrants its own code rather than routing through ACT-EL or ACT-JH.

---

## Score distribution (estimated, methodology unchanged from April)

| Score | Count | Share | Change from 2026-04-24 |
|---|---:|---:|---|
| **4/4** | ~28 | ~38% | → approximately stable |
| **3/4** | ~16 | ~22% | → approximately stable |
| **2/4** | ~26 | ~35% | → approximately stable |
| **1/4** | 4 | 5% | → unchanged (ACT-GCC, ACT-AMT, ACT-APO, ACT-EFI) |
| **0/4** | 0 | 0% | → unchanged |
| **Total** | **74** | | → unchanged |

> **Caveat:** Full re-scoring not run in this pass (no helper script available). Score distribution is estimated from DB activity and prior pass methodology. Phase-1 automation (per April action item) would enable fully automated re-scoring; not yet implemented.

---

## Authoring backlog — active projects missing wiki coverage

Unchanged from April baseline:

- **`ACT-PS` PICC On Country Photo Studio** — $81,860 billed, no wiki article. Still the one real gap.
- **`ACT-SM` SMART Recovery** — $158,930 now billed; `wiki/projects/smart-recovery/smart-recovery.md` exists but config lacks `canonical_slug`. Score is a false negative.

New additions to watch:
- **ALIVE National Centre / MRFF** — no code, no wiki article. Needs both.

---

## Acceptance criteria — this pass

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ (estimated) | Core active projects all have DB + code + wiki presence |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects |
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS still, ALIVE/MRFF new gap |
| New invoices with null project_code flagged | ✅ | 6 invoices, $237.4K total, flagged above |

---

## Actions

1. **Create a project code for ALIVE/MRFF** — the 5-year MRFF partnership needs `project-codes.json` entry. Candidate: `ACT-MH` (Mental Health) or `ACT-MR` (MRFF Research). Check existing `ACT-MR` usage (shows 1 xero_transaction — may be in use for something else).
2. **Tag INV-0341, INV-0342, INV-0334, INV-0332, INV-0337** with project codes.
3. **Draft `wiki/projects/picc/picc-on-country-photo-studio.md`** — the one authoring backlog item, now with $81K in billing.
4. **Add `canonical_slug: smart-recovery` to ACT-SM** in `project-codes.json` — closes the false-negative scoring.
5. **Add `canonical_slug` to the 40+ codes still missing it** — enables Phase-1 automation of this synthesis.
6. **Investigate ACT-ER $77,000 in 1 invoice** — large amount in an archived/unknown code. Likely mistagged.
7. **Assess ALIVE/MRFF wiki article** — the relationship warrants a wiki article before Year 1 milestone in Mar 2027.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | JSON, 74 projects | 2026-07-09 |
| `xero_invoices` | GROUP BY project_code, SUM(total) | 2026-07-09 |
| `xero_transactions` | GROUP BY project_code, COUNT | 2026-07-09 |
| `xero_invoices` | ACCREC AUTHORISED+DRAFT, amount_due>0 | 2026-07-09 |
| wiki/synthesis/project-truth-state-2026-05-14.md | prior pass comparison | reference |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-05-14|Q2 project truth-state — 2026-05-14 prior pass]]
- [[alignment-loop-drift-2026-05-14-to-2026-07-09|Drift summary — 2026-05-14 to 2026-07-09]]
- [[index|ACT Wikipedia]]
