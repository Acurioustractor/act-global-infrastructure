# Calibration — rd-evidence-pack.md

> Run: 2026-05-22T22:25:11.531Z
> Pass rate: 5/6
> Rubric: `thoughts/shared/rubrics/rd-evidence-pack.md`
> Fixtures: `thoughts/shared/rubrics/fixtures/rd-evidence`
> Grader: `scripts/grade-pack.mjs` (claude-sonnet-4-6)

## Results

| Fixture | Expected | Got | Score | Correct? |
|---------|----------|-----|-------|----------|
| bad-1-sole-trader.md | fail | fail | 0 | YES |
| bad-2-routine-maintenance.md | fail | fail | 0 | YES |
| bad-3-no-hypothesis.md | fail | fail | 21 | YES |
| good-1-act-gd.md | pass | fail | 70 | **NO** |
| good-2-act-el.md | pass | pass | 91 | YES |
| good-3-act-cg.md | pass | pass | 94 | YES |

## Detail

### bad-1-sole-trader.md — OK

**Verdict:** fail  ·  **Score:** 0  ·  **Expected:** fail

**Hard failures:**
- 1.1 Wrong entity: Frontmatter declares `entity: nic-sole-trader` and `registrant: Nic Marchesi (sole trader)` with ABN 21 591 780 066 for FY26. Rubric explicitly states: 'Any R&D claim attributed to nic-sole-trader (ABN 21 591 780 066) for FY26 → fail. The sole trader period is forfeited per the Path C decision logged 2026-04-27.'
- 1.2 AusIndustry registration absent or incomplete: Pack contains no AusIndustry registration file, confirmation receipt, or frontmatter citation (e.g., `ausindustry_registration:` field). The activity register wiki reference (`wiki/projects/goods/rd-activity-register.md`) is mentioned but no registration ID or verifiable record is provided. Rule states: 'Missing registration with no citation → fail.'
- 1.5 Salary allocation sheet missing or nonsense: Only statement present is 'Nic Marchesi (sole trader, ABN 21 591 780 066) — 25% of FY26 sole trader profit allocated as R&D-eligible labour cost.' No structured salary allocation sheet exists in the pack. Required fields absent: project code, period (specific dates), percentage/hours, salary base, R&D-eligible amount calculation. The sole-trader profit allocation format does not satisfy the rubric's requirement for a tabular or structured format with all required information.

**Warnings:** 1.4 Receipts gap above 15%, 1.6 Contemporaneous records check, 4.2 Provenance sidecars

### bad-2-routine-maintenance.md — OK

**Verdict:** fail  ·  **Score:** 0  ·  **Expected:** fail

**Hard failures:**
- 1.2 AusIndustry registration absent or incomplete: Frontmatter has `ausindustry_registration: registered_2026_07_15` but the activity document contains no hypothesis, no technical uncertainty, no experiment design, and no expected/actual outcome structure. Registration ID is unverifiable in the pack and date falls outside FY26 window (FY26 ends 2026-06-30). Rule requires four components to be present in the pack itself.
- 1.3 No core activity declared: Activity is described as 'routine maintenance on the Command Center finance dashboard, including: Fixing CSS issues, Updating dependencies, Adding new chart types, Patching minor bugs, Routine code refactoring' — all ordinary software maintenance with no hypothesis or technical uncertainty. Category is claimed as `core` in frontmatter but content is explicitly routine/ordinary. FAIL.
- 1.5 Salary allocation sheet missing or nonsense: Inline allocation states 'Ben Knight 40% R&D-eligible. Nic Marchesi 30% R&D-eligible' but missing required fields: project code, period, salary base, R&D-eligible amount calculation. Also exceeds Money Framework defaults (Nic 30% > 25%, Ben 40% > 10%) without citing Money Framework decision log — violates per-project deviation citation rule.
- 1.7 Receipt-to-activity linkage: No receipts provided. Only evidence cited is 'Git commits across FY26' (approximately 240 commits). Git commits are not R&D-claimed receipts; no receipt-to-activity linkage exists.
- 1.8 Excluded activity types claimed: Document explicitly lists: (1) 'routine maintenance' — excluded under s355-25(2); (2) 'Staff training sessions for new contributors' — explicitly excluded; (3) 'General business development work (writing pitch decks, preparing investor briefings)' — excluded; (4) 'Marketing campaigns to drive engagement' — excluded. All flagged by pattern: routine maintenance, staff training, general business development.

**Warnings:** 1.4 Receipts gap above 15%, 1.6 Contemporaneous records check, 2.1 Hypothesis, 2.2 Technical uncertainty, 2.3 Experiment design, 2.4 Outcome (expected vs actual), 4.1 Tax accountant reviewable, 4.2 Provenance sidecars, 4.3 Cross-references intact

### bad-3-no-hypothesis.md — OK

**Verdict:** fail  ·  **Score:** 21  ·  **Expected:** fail

**Hard failures:**
- 1.2 - AusIndustry registration absent or incomplete: frontmatter has `ausindustry_registration: registered_2026_07_15` which is a date only, not a registration ID. The rule requires a verifiable record ID. Additionally, the pack itself does not contain the four required components (hypothesis, technical uncertainty, experiment design, expected vs actual outcome) which would permit a frontmatter citation alone to pass.
- 1.3 - No core activity declared: The file is marked `category: core` but the content has none of the four required components. No hypothesis, no technical uncertainty, no experiment design, no measured outcome. The 'Goals' section lists aspirations ('Create a beautiful, accessible storytelling experience', 'Build trust with First Nations partners', 'Scale to multiple communities') which are not testable propositions. The 'Outcome' section is purely 'The platform is live' with no measurement or delta.
- 1.5 - Salary allocation sheet missing or nonsense: The salary line states 'Ben Knight 35%' which deviates from the Money Framework default of 10% without any citation to the decision log. 'Nic Marchesi 15%' deviates from 25% default without citation. Also, the line mixes salary allocation with contractor fees ($30K for V. Patel) and cloud costs ($12K) which are not salary allocations. No Money Framework document is cited for the 25% override. Per rubric: 'A per-project deviation needs a citation to the Money Framework decision log only when it pushes the org-wide total above default.'
- 1.7 - Receipt-to-activity linkage: The file contains no receipts whatsoever. The 'Evidence trail' section says 'Code in the empathy-ledger repo. Stories in wiki/stories/' but provides no attachments and no linkage of any receipt over $1,000 to a specific activity. Per-rule 1.4: receipt coverage must be ≥85% by dollar value. Missing receipts = fail.
- 1.8 - Excluded activity types claimed: 'Building software is always hard. We had to write a lot of code. We had to think about consent carefully. We had to design the database schema. We had to deploy to production.' This describes ordinary software development. Per rule: software development that is 'ordinary' maintenance is excluded under s355-25(2) ITAA 1997. The goals (beautiful, accessible, leading platform) and the 'Build trust with First Nations partners' language suggest market-facing outcomes that may constitute social science research without demonstrated scientific method. No hypothesis or uncertainty is present to reframe these as eligible R&D.

**Warnings:** 4.2 - Provenance sidecars, 4.3 - Cross-references intact

### good-1-act-gd.md — MISMATCH

**Verdict:** fail  ·  **Score:** 70  ·  **Expected:** pass

**Hard failures:**
- 1.5 Salary allocation sheet mismatch: Allocation table shows Nic: 25% of $200,000 = $50,000 R&D-eligible; Ben: 10% of $200,000 = $20,000 R&D-eligible (total $70,000). Evidence trail section lists 'Nic 25% R&D salary $87,500; Ben 10% R&D salary $35,000' (total $122,500). The evidence trail implies a salary base of $350,000 ($87,500 ÷ 25%), which contradicts the $200,000 base in the allocation table. The allocation table R&D-eligible amounts ($70,000) do not reconcile to the claimed salary figures ($122,500) within the ±2% tolerance. This is an internal inconsistency within the same document.

**Warnings:** 4.1 Executive summary, 4.2 Provenance sidecars

### good-2-act-el.md — OK

**Verdict:** pass  ·  **Score:** 91  ·  **Expected:** pass

_no hard failures_

**Warnings:** 4.1 Tax accountant reviewable, 4.2 Provenance sidecars, 4.3 Cross-references intact

### good-3-act-cg.md — OK

**Verdict:** pass  ·  **Score:** 94  ·  **Expected:** pass

_no hard failures_

**Warnings:** 1.7 Receipt-to-activity linkage, 4.2 Provenance sidecars, 4.3 Cross-references intact
