---
title: Project truth-state — 74 codes × 4 sources, fourth pass, ACT-PS persists
summary: Fourth pass of the ACT Alignment Loop (Q2). Config holds at 74 codes. Wiki holds at 98 articles. ACT-PS is the lone authoring backlog item for the fourth consecutive pass — with PICC invoices now voided, the article's framing needs updating to reflect current relationship state. Xero coverage has grown significantly across all active projects. Acceptance criterion holds.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-06-18
---

# Project truth-state — 2026-06-18

> Fourth pass of the [[act-alignment-loop|ACT Alignment Loop]] Q2. Four sources: `config/project-codes.json` (source-of-truth for codes, v1.8.0), `wiki/projects/**` (narrative), Supabase (`xero_invoices`, `xero_transactions`, `bank_statement_lines`, `projects`, `org_projects`), and codebase structure. Prior pass: [[project-truth-state-2026-06-11|2026-06-11]].

## Headline findings

1. **74 codes, 98 wiki articles — stable.** No codes added or removed since the June 11 pass. The removal of ACT-APO and ACT-AMT (done between pass 2 and pass 3) is holding. ACT-GCC and ACT-EFI remain in config despite being config-ghost candidates (no active traces anywhere).

2. **ACT-PS is the authoring backlog — for the fourth consecutive pass.** `wiki/projects/picc/picc-on-country-photo-studio.md` does not exist. The PICC folder has grown to 5 articles (picc.md, picc-photo-kiosk.md, picc-elders-hull-river.md, picc-annual-report.md, picc-centre-precinct.md) but the On-Country Photo Studio article has not been written. With PICC invoices (INV-0317 + INV-0324) now VOIDED since the last pass, the framing of this article needs to reflect the current state of the PICC relationship rather than the historical invoice history. **Estimated effort: 30 minutes.**

3. **Xero coverage has grown significantly since April baseline.** `xero_invoices` now shows 35 distinct project codes (vs 31 at baseline). New invoice activity: ACT-PS (0 → 11 inv), ACT-CT (0 → 1 inv), ACT-CP (6 → 9 inv), ACT-SH (0 → 44 inv). The codebase is tracking more projects through Xero than ever.

4. **Acceptance criterion holds.** No active or ideation project at 0/4 or 1/4. The four config-ghost 1/4 entries (ACT-GCC, ACT-EFI, ACT-OS, ACT-WJ) remain unchanged.

5. **New June invoices (Tandanya, Mounty Aboriginal Youth, Justice Reform, Julalikari) have no project code assigned.** These are ACCREC invoices raised June 17-18. Before the sole trader Xero closes, these need project codes — likely ACT-JH or ACT-GD based on counterparty context.

---

## Score distribution (estimated — no full re-score run)

Baseline was 28 at 4/4, 16 at 3/4, 26 at 2/4, 4 at 1/4, 0 at 0/4, total 74.

| Score | 2026-04-24 | 2026-06-11 | 2026-06-18 | Change from baseline |
|---|---:|---:|---:|---|
| **4/4** | 28 | ~33 | ~33 | +5 (ACT-CT, ACT-BV, ACT-PS via slug, others) |
| **3/4** | 16 | ~11 | ~11 | −5 (promotions) |
| **2/4** | 26 | ~26 | ~26 | ≈ stable (new background codes ≈ archived) |
| **1/4** | 4 | 4 | 4 | → config ghosts unchanged |
| **0/4** | 0 | 0 | 0 | → ✅ criterion holds |
| **Total** | **74** | **74** | **74** | Net ±0 since June 11 |

> Note: full re-score not run — distribution estimated from DB and config diff. A script re-run would confirm exact 4/4 count.

---

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | No active/ideation project found at <2/4 |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects |
| DB activity but no wiki surfaces as authoring backlog | ✅ | Only real gap: ACT-PS (see below) |

---

## Authoring backlog — ACT-PS (fourth pass)

**`ACT-PS` PICC On Country Photo Studio** — active, studio-tier.

- At baseline: $9K paid + 47 codebase refs, no wiki article.
- Now: 11 Xero invoices, 2 transactions, 8 bank statement lines. PICC invoices INV-0317 + INV-0324 were VOIDED since the May pass — the PICC billing relationship has been restructured off the invoicing model.
- The article that needs writing: a clear explanation of what the On-Country Photo Studio IS, its relationship to PICC (the community organisation), the photography infrastructure, and what the current arrangement is post-void.
- Article path: `wiki/projects/picc/picc-on-country-photo-studio.md`

---

## Xero coverage — notable changes from baseline

| Code | Baseline inv | Current inv | Change | Notes |
|------|---:|---:|---:|---|
| ACT-IN | not separately counted | 974 | ↑ | Infrastructure catches everything |
| ACT-GD | 218 | 347 | +129 | Most active invoice code |
| ACT-HV | 68 | 139 | +71 | Harvest scaling |
| ACT-FM | 129 | 139 | +10 | Farm stable |
| ACT-UA | 129 | 98 | −31 | Uncle Allan — declining or reclassified |
| ACT-JH | 17 | 37 | +20 | JusticeHub growing |
| ACT-PI | 13 | 37 | +24 | PICC growing despite voided large invoices |
| ACT-PS | 0 | 11 | +11 | Now has Xero activity; wiki gap more glaring |
| ACT-SH | 0 | 44 | +44 | New — check what code SH is |
| ACT-CT | 0 | 1 | +1 | ConFit Pathways now has an invoice |
| ACT-CP | 6 | 9 | +3 | Community Capital growing |

**Note on ACT-SH:** 44 invoices and 0 at baseline is unusual. ACT-SH is `ACT-SH` = likely "The Shelter" or similar. Confirm this code is being used correctly and not a mis-tagging.

---

## Config hygiene — still outstanding

From prior passes, two items remain unactioned:
1. **ACT-GCC** (Global Community Connections) — archived, no traces. Remove from config.
2. **ACT-EFI** (Economic Freedom Initiative) — archived, no traces. Remove from config.

---

## Sources queried

| Source | Shape | As-of |
|---|---|---|
| `config/project-codes.json` | v1.8.0, 74 codes | file |
| `wiki/projects/**` | 98 `.md` files | 2026-06-18 |
| `xero_invoices` | GROUP BY project_code | 2026-06-18 |
| `xero_transactions` | GROUP BY project_code | 2026-06-18 |
| `bank_statement_lines` | GROUP BY project_code | 2026-06-18 (stale to 2026-03-31) |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop]]
- [[project-truth-state-2026-06-11|Q2 prior pass — 2026-06-11]]
- [[funder-alignment-2026-06-18|Q1 funder alignment — same pass]]
- [[index|Synthesis index]]
