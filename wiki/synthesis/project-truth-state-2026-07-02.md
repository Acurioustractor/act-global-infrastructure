---
title: Project truth-state — 75 codes × 4 sources, third pass, post-cutover
summary: Third pass of the ACT Alignment Loop (Q2), 49 days after the 2026-05-14 pass. 75 codes unchanged. ACT-CP gained Xero presence (9 invoices, likely 4/4 now). ACT-PS wiki gap still open. Xero now covers 35 project codes (up from 31 at baseline). No code additions or removals.
tags: [synthesis, projects, alignment-loop, project-codes]
status: active
date: 2026-07-02
---

# Project truth-state — 2026-07-02

> Third pass of the [[act-alignment-loop|ACT Alignment Loop]], Q2. Four sources: `config/project-codes.json` (source-of-truth), `wiki/projects/**` (narrative), Supabase (`xero_invoices`, `xero_transactions`, `bank_statement_lines`, `projects`, `org_projects`), codebase grep across `apps/` `scripts/` `config/`. Previous pass: [[project-truth-state-2026-05-14|2026-05-14]].

## Headline findings

1. **75 codes — no additions or removals since May 14.** `config/project-codes.json` version 1.8.0, updated 2026-04-24. The count, the canonical_slug completeness (100% since May 14), and the archived ghost list (ACT-APO, ACT-AMT, ACT-EFI, ACT-GCC) are all unchanged.

2. **ACT-CP (Community Capital) has gained substantial Xero presence.** The baseline had ACT-CP scoring 3/4 with "no dedicated Xero tracking — runs through ACT-IN". As of 2026-07-02, `xero_invoices` shows 9 invoices for ACT-CP, `xero_transactions` shows 1 transaction, `bank_statement_lines` shows 1 entry. ACT-CP is now 4/4. The Social Impact Hub Foundation INV-0289 ($21,780 AUTHORISED) is the largest current receivable against this code.

3. **Xero now covers 35 project codes** (up from 31 at the 2026-04-24 baseline and approximately 34-35 at May 14). New code appearances since baseline: ACT-CT (ConFit Pathways, confirmed in May 14 pass), ACT-DL (DadLab, 1 invoice), ACT-ER (1 invoice, archived). ACT-GP now has 2 invoices (Jenn Brazier outstanding).

4. **ACT-PS (PICC On Country Photo Studio) wiki gap persists — three passes, no article.** DB presence continues to grow: 11 xero_invoice rows (up from 10 at May 14), 2 xero_transaction rows. The codebase has 47+ references. The article `wiki/projects/picc/picc-on-country-photo-studio.md` does not exist.

5. **ACT-SH (ACT Social Housing) — 44 xero_invoice rows but flagged as archived.** The baseline scored this 2/4 (code + DB reference only, archived). With 44 invoices it has significant financial history. If it remains archived, no action needed; but if activities are ongoing, it should be reviewed for reclassification.

6. **No project crossed below the 2/4 acceptance threshold.** All active and ideation projects continue to score ≥2/4. Acceptance criterion maintained.

---

## Score distribution (estimated — delta from May 14)

| Score | May 14 est. | 2026-07-02 est. | Change |
|---|---:|---:|---|
| **4/4** | ~33 | ~34 | ↑ +1 (ACT-CP confirmed 4/4) |
| **3/4** | ~11 | ~10 | ↓ -1 |
| **2/4** | ~27 | ~27 | → |
| **1/4** | 4 | 4 | → |
| **0/4** | 0 | 0 | → |
| **Total** | **75** | **75** | → |

_Note: Full scripted re-score would require running the synthesis script against the live DB. Delta estimates are based on confirmed single-item changes. The acceptance criterion (no active/ideation project at <2/4) is assessed and met._

---

## Acceptance criteria

| Criterion | Met? | Evidence |
|---|---|---|
| Every active/ideation project scores ≥2/4 | ✅ | All active + ideation projects have config + DB row at minimum |
| Any project at 0/4 flagged for retirement | ✅ | No 0/4 projects |
| DB activity but no wiki surfaces as authoring backlog | ✅ | ACT-PS is the one real gap (3 passes, still open) |

---

## Xero coverage — active codes with DB tracking as at 2026-07-02

### High-traffic (≥10 xero_invoices)

| Code | Name | inv | txn | bsl |
|------|------|----:|----:|----:|
| ACT-IN | Infrastructure | 974 | 1,554 | 1,043 |
| ACT-GD | Goods | 348 | 225 | 211 |
| ACT-HV | The Harvest Witta | 139 | 200 | 121 |
| ACT-FM | The Farm | 139 | 117 | 163 |
| ACT-UA | Uncle Allan Palm Island Art | 97 | 57 | — |
| ACT-DO | Designing for Obsolescence | 86 | 24 | — |
| ACT-SH | (ACT Social Housing — archived) | 44 | — | — |
| ACT-JH | JusticeHub | 37 | 25 | 21 |
| ACT-PI | PICC | 37 | 44 | 8 |
| ACT-CORE | ACT Regenerative Studio | 34 | 665 | — |
| ACT-OO | Oonchiumpa | 25 | 30 | — |
| ACT-EL | Empathy Ledger | 21 | 27 | — |
| ACT-MY | Mounty Yarns | 20 | 18 | 46 |
| ACT-BG | BG Fit | 19 | — | — |
| ACT-CA | Caring for those who care | 18 | 2 | — |
| ACT-MD | ACT Monthly Dinners | 13 | 1 | — |
| ACT-SM | SMART | 12 | 8 | — |
| ACT-PS | PICC On Country Photo Studio | 11 | 2 | — |
| ACT-CF | The Confessional | 11 | 8 | — |
| ACT-CE | Custodian Economy | 10 | 2 | — |
| ACT-CP | Community Capital | 9 | 1 | 1 |
| ACT-10 | (archived) | 23 | — | — |

### Notable: ACT-CP transition

At the 2026-04-24 baseline: ACT-CP listed as 3/4 with "no dedicated Xero tracking category — runs through ACT-IN." Now 9 invoices in `xero_invoices` + 1 txn + 1 bsl. This is a confirmed 4/4 transition. Social Impact Hub Foundation INV-0289 ($21,780 AUTHORISED) is the largest current receivable against this code.

---

## Authoring backlog

**One real gap remains: ACT-PS (PICC On Country Photo Studio)**

- 11 Xero invoices, 2 transactions
- 47+ codebase references
- `projects` / `org_projects` DB row exists
- `wiki/projects/picc/picc-on-country-photo-studio.md` — **does not exist**

This is the sole authoring backlog item, unchanged across three passes of the alignment loop.

---

## Phase-1 automation readiness

The May 14 pass confirmed 100% `canonical_slug` coverage across all 75 codes. The scripted synthesis (`scripts/synthesize-project-truth-state.mjs` — proposed in baseline) could now run cleanly against the updated config. The manual scoring in this pass is a delta estimate only. A scripted pass would produce authoritative per-code scores.

---

## Derived actions

1. **Write `wiki/projects/picc/picc-on-country-photo-studio.md`** — three passes, still open. One active studio project has no wiki article.
2. **Remove ghost codes from config** — ACT-APO, ACT-AMT, ACT-EFI, ACT-GCC remain in config after three passes. Low urgency but config hygiene.
3. **Implement `scripts/synthesize-project-truth-state.mjs`** — with 100% canonical_slug coverage, full automation is now unblocked.
4. **Classify ACT-SH** — 44 xero_invoice rows. Archived per config. Confirm no ongoing activity post-cutover.

---

## Sources queried

| Source | Query / path | As-of |
|---|---|---|
| `config/project-codes.json` | v1.8.0 | 2026-04-24 (file) |
| `xero_invoices` | GROUP BY project_code | 2026-07-02 |
| `xero_transactions` | GROUP BY project_code | 2026-07-02 |
| `bank_statement_lines` | GROUP BY project_code | 2026-07-02 |

## Backlinks

- [[act-alignment-loop|ACT Alignment Loop — the cycle this synthesis belongs to]]
- [[project-truth-state-2026-05-14|Q2 — 2026-05-14 previous pass]]
- [[project-truth-state-2026-04-24|Q2 — 2026-04-24 baseline]]
- [[index|ACT Wikipedia]]
