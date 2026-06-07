# Calibration — rd-evidence-pack.md

> Run: 2026-05-23T04:22:24.301Z
> Pass rate: 5/6
> Rubric: `thoughts/shared/rubrics/rd-evidence-pack.md`
> Fixtures: `thoughts/shared/rubrics/fixtures/rd-evidence`
> Grader: `scripts/grade-pack.mjs` (claude-sonnet-4-6)

## Results

| Fixture | Expected | Got | Score | Correct? |
|---------|----------|-----|-------|----------|
| bad-1-sole-trader.md | fail | fail | 70 | YES |
| bad-2-routine-maintenance.md | fail | fail | 10 | YES |
| bad-3-no-hypothesis.md | fail | fail | 62 | YES |
| good-1-act-gd.md | pass | warn | 81 | **NO** |
| good-2-act-el.md | pass | pass | 91 | YES |
| good-3-act-cg.md | pass | pass | 97 | YES |

## Detail

### bad-1-sole-trader.md — OK

**Verdict:** fail  ·  **Score:** 70  ·  **Expected:** fail

**Hard failures:**
- 1.1 Wrong entity: Frontmatter declares `entity: nic-sole-trader` and `registrant: Nic Marchesi (sole trader)` with `registrant_abn: 21 591 780 066`. Per rubric rule 1.1, any R&D claim attributed to `nic-sole-trader` (ABN 21 591 780 066) for FY26 is a hard block. The sole trader period is forfeited per Path C decision logged 2026-04-27. Claim total of $184,500 under this entity cannot proceed.
- 1.5 Salary allocation sheet — wrong entity / nonsense allocation: Salary allocation section reads 'Nic Marchesi (sole trader, ABN 21 591 780 066) — 25% of FY26 sole trader profit allocated as R&D-eligible labour cost.' Sole trader profit is not an eligible R&D labour cost base under R&DTI for the registered entity (act-pty-ltd). No salary base figure, no hours or percentage mapped to an employment arrangement with ACT Pty Ltd, and no CSV or structured table present. This constitutes a nonsense allocation for the correct entity.

**Warnings:** 1.2 AusIndustry registration absent or incomplete, 1.4 Receipts gap — unverifiable, 1.7 Receipt-to-activity linkage, 4.1 Executive summary missing, 4.2 Provenance sidecars missing

### bad-2-routine-maintenance.md — OK

**Verdict:** fail  ·  **Score:** 10  ·  **Expected:** fail

**Hard failures:**
- 1.8 Excluded activity types claimed: Pack explicitly states 'routine maintenance on the Command Center finance dashboard', 'Staff training sessions for new contributors on the codebase', 'general business development work (writing pitch decks, preparing investor briefings)', 'Marketing campaigns to drive engagement with the dashboard', and 'Customer acquisition for our pitch process improved' — all are pattern-flagged excluded activity types under Section 355-25(2) ITAA 1997. No hypothesis or technical uncertainty is provided to reframe any of these as eligible R&D.
- 1.3 No core activity declared: The pack claims category: core but contains zero AusIndustry-compliant core activity components. There is no hypothesis, no technical uncertainty, no experiment design, and no expected vs actual outcome documented. The 'What we did' and 'Goals' sections describe maintenance tasks and business objectives, not a core R&D activity.
- 1.5 Salary allocation sheet missing or nonsense: Ben Knight is listed at 40% R&D-eligible, exceeding the Money Framework default of 10%. Nic Marchesi is listed at 30% R&D-eligible, exceeding the default of 25%. The pack notes these are 'increased above default 10/25 because of the dashboard work' but provides no citation to the Money Framework decision log to justify pushing org-wide totals above default, as required by rule 1.5. Furthermore, no salary base figures or R&D-eligible dollar amounts are provided, making reconciliation against the activity register impossible.

**Warnings:** 1.8 pattern flag — routine maintenance, 1.8 pattern flag — staff training, 1.8 pattern flag — marketing campaign, 1.8 pattern flag — customer acquisition, 1.8 pattern flag — general business development, 2.1 Hypothesis absent, 2.2 Technical uncertainty absent, 2.3 Experiment design absent, 2.4 Outcome (expected vs actual) absent, 4.1 Executive summary missing, 4.2 Provenance sidecars missing, 4.3 Cross-references

### bad-3-no-hypothesis.md — OK

**Verdict:** fail  ·  **Score:** 62  ·  **Expected:** fail

**Hard failures:**
- 1.3 No core activity declared — Tier 2 failure propagates to Tier 1 block: no hypothesis present: The 'Goals' section lists aspirations ('Create a beautiful, accessible storytelling experience', 'Become the leading platform for ethical storytelling in Australia') with no specific, testable proposition about the world. There is no hypothesis anywhere in the document.
- 1.6 Contemporaneous records check — no timestamps on narrative entries: No timestamps, git commit references, calendar events, or wiki edit logs are cited anywhere in the narrative. It is impossible to verify entries are within 30 days of the described activity, let alone avoid the 90-day fail threshold.

**Warnings:** 2.2 Technical uncertainty absent or not substantive, 2.3 Experiment design absent, 2.4 Outcome — no expected vs actual delta, 1.5 Salary allocation — potential mismatch; org-wide default deviation unverified, 4.1 Executive summary absent, 4.2 Provenance sidecars missing, 4.3 Cross-references — evidence trail links unverifiable, 1.8 Excluded activity pattern — possible ordinary software development

### good-1-act-gd.md — MISMATCH

**Verdict:** warn  ·  **Score:** 81  ·  **Expected:** pass

_no hard failures_

**Warnings:** 1.2 AusIndustry registration — verifiability, 1.5 Salary allocation — claim_total reconciliation, 4.1 Executive summary missing, 4.2 Provenance sidecars, 4.3 Cross-references — internal links unverifiable

### good-2-act-el.md — OK

**Verdict:** pass  ·  **Score:** 91  ·  **Expected:** pass

_no hard failures_

**Warnings:** 1.5 Salary allocation — org-wide reconciliation partially cited, 1.5 Salary allocation — contractor ABN format, 4.2 Provenance sidecars, 4.3 Cross-references — unverified links, 1.6 Contemporaneous records — supporting activities

### good-3-act-cg.md — OK

**Verdict:** pass  ·  **Score:** 97  ·  **Expected:** pass

_no hard failures_

**Warnings:** 4.2 Provenance sidecars, 4.3 Cross-references intact
