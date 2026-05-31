# ACT R&D Tax Pack - Standard Ledger Index

> **For:** Standard Ledger (acting as ACT's R&D consultant, confirmed 2026-05-17).
> **Entity:** A Curious Tractor Pty Ltd, ACN 697 347 676 (ABN to confirm). Path C: FY24-25 forfeited (sole-trader period); claim FY25-26 onward.
> **Built/updated:** 2026-05-31. **Not advice. Not lodged. AusIndustry registration NOT yet submitted (hard blocker).**

## 1. What is in this pack

| Artefact | What it is |
| --- | --- |
| `README.md` | Pack overview (carries one un-reconciled older dollar note - see flags) |
| `wiki/projects/{civicgraph,empathy-ledger,goods,justicehub}/rd-activity-register.md` (+ `.provenance.md`) | The 4 registered project registers + provenance sidecars |
| `supporting-activities.md` | Supporting activities (e.g. ACT-GD-S6 Gemini OCR) |
| `salary-allocations.csv` | Personnel R&D allocation (8 cols): staff, project_code, period_start, period_end, percentage, personnel_basis_aud, rd_eligible_aud, evidence |
| `audit-trail.md` | Commit-hashed, reproducible activity ledger to 2026-05-07 |
| `receipt-coverage-attestation.md` | DB-attested receipt coverage (98.5-100%) |
| `world-tour-overseas-finding-draft.md` | FY26-27 Overseas Finding draft + per-activity narratives + national-priority map |
| **`rd-master-register.csv`** (NEW) | **Consolidated activity register across ALL projects, incl. ACT-IN candidates, overseas activities, and considered-and-excluded items** |
| **`rd-project-totals.csv`** (NEW) | **Per-project eligible-$ totals reconciling to $354,047, + ACT-IN estimate + overseas** |
| `grades/` | Rubric grades (latest WARN/62) |
| `software-rd-compliance-check.md` | TA 2017/5 + sector-guide compliance review (internal-admin exclusion, per-activity rule) |
| `deepened-rd-narrative.md` | Cross-project R&D thesis + new candidates (Governed-Proof assembler) + timing flag |
| _(Notion)_ **R&D Evidence To Capture** | Status-tracked checklist of the 11 outstanding evidence items (deep-dive gaps + register close-outs), in the Notion R&D hub |

## 2. Current state (verified from the registers)

**FY26 registered eligible expenditure: $354,047** (43.5% refundable offset path).

| Register | $ eligible | Core hypothesis | Status / gap |
| --- | --- | --- | --- |
| ACT-GD Goods | $188,250 | Buyer-supplier matching >=40% conversion vs ~12% | in_progress; treatment cohort not run |
| ACT-EL Empathy Ledger | $79,750 | OCAP verbal-consent-as-audit-trail >=99% verifiable; multi-tenant zero-leakage | in_progress; audit + leakage tests not run |
| ACT-CG CivicGraph | $61,500 | Entity resolution >=92% precision / >=85% recall | in_progress; 200-row gold set unbuilt |
| ACT-JH JusticeHub | $24,547 | Federated code mapping >=80% match | in_progress; 100-row gold set unbuilt; JH personnel unallocated |

All four are `in_progress`: designs written, no success criterion yet measured against ground truth. Personnel basis: **Ben 95% = $237,500; Nic 40% = $80,000** (`salary-allocations.csv`).

## 3. The full R&D map (this is the consolidation you asked for)

1. **Domestic FY26 (registered):** the four registers above = $354,047.
2. **ACT-IN internal infrastructure (NOT registered - biggest gap, but HIGH-RISK):** ~40-42% of Ben's time / ~$95K eligible is flagged in the CivicGraph register but has **no register**. Two candidates found (Alignment-Loop truth-state synthesis; LLM-graded rubric calibration). **Compliance caveat (TA 2017/5):** these are INTERNAL tooling and at high risk of the **internal-administration exclusion** as CORE activities; at best claimable as **supporting** (dominant purpose supporting a core experiment). Do NOT bank ACT-IN as core - see `software-rd-compliance-check.md`. The defensible core is the four external-facing product registers.
3. **FY26-27 overseas (Overseas Finding required):** the World Tour validates EL + JH cores overseas. It does not replace the domestic claim - it is next year's continuation. See the finding draft.

## 4. How the overseas finding interacts with the main R&D

- The overseas activities **extend the Australian EL and JH core activities**, in **FY26-27** (not FY26). The Australian core is conducted *solely in Australia*; the overseas trip supplies test populations that don't exist here.
- **Condition 4 (less-than):** FY26-27 overseas R&D spend (the CT-RD bucket in the World Tour Expense Ledger) must be **less than** the related FY26-27 Australian EL/JH dev spend. This is the link to next-year personnel allocation - and a reason ACT-IN/dev allocation matters across both years.
- **Lodge the Overseas Finding early in FY26-27** (planned activities allowed; ~90-day processing; hard deadline 30 Jun 2027).

## 5. National priority alignment (all projects)

| R&D cluster | National Science and Research Priority (2024) | Other framework |
| --- | --- | --- |
| Consent-as-code + data sovereignty (ACT-EL, ACT-JH, overseas) | **3. Elevating Aboriginal and Torres Strait Islander knowledge systems** | Closing the Gap Priority Reform 4; Indigenous Data Sovereignty |
| Justice evidence / alternatives to custody (ACT-JH, overseas) | **2. Healthy and thriving communities** + **5. Secure and resilient nation** | Closing the Gap Target 11 (youth detention -30% by 2031) |
| Entity resolution / civic data infra (ACT-CG, ACT-IN) | **5. Secure and resilient nation** | National data infrastructure |
| Circular-economy matching (ACT-GD) | **2.** + **1. Net zero** / **4. Environment** | National Waste Policy |

(R&DTI eligibility is the four tests, not priority alignment - but alignment strengthens the new-knowledge narrative and signposts grant co-funding, incl. the QBE Catalysing Impact $400K match.)

## 6. Open asks for Standard Ledger (consolidated)

1. Written R&D scope + pricing (and confirm SL is the R&D consultant, no separate engagement).
2. **Nic's arms-length salary** determination - sets the $80,000 ACT-EL/personnel base; currently a retrospective characterisation.
3. **AusIndustry registration timing** for FY26 (the hard blocker; due within 10 months of year-end = by 30 Apr 2027).
4. **ACT-IN register decision** - whether to write up the two new core candidates (~$95K) before lodgement.
5. **Core-vs-supporting classification** of each overseas activity (World Tour finding).
6. **Overseas Finding** lodgement plan (FY26-27; before 30 Jun 2027; ~90 days).
7. Confirm the contemporaneous-record standard is met (audit-trail.md + provenance sidecars + this system).

## 7. Integrity flags

- **[RESOLVED 2026-05-31] Path C plan restored.** `thoughts/shared/plans/rd-tax-incentive-fy2526-path-c.md` now exists (was referenced by 11 files but missing) - the canonical Path C decision record lives there.
- **[RESOLVED 2026-05-31] README dollars reconciled.** The stale "$147,250 preliminary total" line was corrected: **$354,047** registered ($130,910-$154,010 refund) is the governing number; the ~$180-250K framework range is the ACT-IN-inclusive potential, the gap being exactly the unregistered ACT-IN allocation.
- **JusticeHub commits** (601 asserted) live in a separate repo - only ~5 cross-EL commits are in this repo. The 100-row gold set is unlabelled.

## 8. Confidence

- **Verified:** the four register dollar figures and hypotheses; the salary-allocations columns; the 2024 National Priorities; CtG Target 11; the overseas-finding four conditions. (Register reads + web checks 2026-05-31.)
- **Estimate / adviser-dependent:** ACT-IN ~$95K (an allocation estimate, not a claim); core-vs-supporting of new candidates and overseas activities; all refund figures; Nic's salary base.
- Detail behind this index: `thoughts/shared/handoffs/world-tour-tax-rd/` (rd-existing-pack-synthesis, rd-novelty-sweep, rd-history-proof).
