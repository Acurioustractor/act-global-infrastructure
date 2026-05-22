# Calibration — rd-evidence-pack.md

> Run: 2026-05-22T22:51:27.058Z
> Pass rate: 4/6
> Rubric: `thoughts/shared/rubrics/rd-evidence-pack.md`
> Fixtures: `thoughts/shared/rubrics/fixtures/rd-evidence`
> Grader: `scripts/grade-pack.mjs` (claude-sonnet-4-6)

## Results

| Fixture | Expected | Got | Score | Correct? |
|---------|----------|-----|-------|----------|
| bad-1-sole-trader.md | fail | fail | 0 | YES |
| bad-2-routine-maintenance.md | fail | fail | 10 | YES |
| bad-3-no-hypothesis.md | fail | fail | 0 | YES |
| good-1-act-gd.md | pass | fail | 70 | **NO** |
| good-2-act-el.md | pass | warn | 94 | **NO** |
| good-3-act-cg.md | pass | pass | 97 | YES |

## Detail

### bad-1-sole-trader.md — OK

**Verdict:** fail  ·  **Score:** 0  ·  **Expected:** fail

**Hard failures:**
- 1.1 Wrong entity: Pack attributes claim to `nic-sole-trader` (ABN 21 591 780 066) for FY26. The sole trader period is forfeited per the Path C decision logged 2026-04-27. Entity declared as 'Nic Marchesi (sole trader)'.
- 1.2 AusIndustry registration absent or incomplete: No AusIndustry registration file, confirmation receipt, or frontmatter citation with registration ID/date is present in the pack. Required: `ausindustry-registration.{md,pdf,html}` or equivalent verifiable record.
- 1.4 Receipts gap above 15%: No receipts provided. Pack states 'Receipts in xero under sole trader entity' but no actual receipts, attachment references, or coverage calculation included. Cannot verify ≥85% receipt coverage per project.
- 1.5 Salary allocation sheet missing or nonsense: Salary allocation sheet (`salary-allocations.csv`) is listed as required input but entirely absent. The pack includes only an inline statement '25% of FY26 sole trader profit allocated as R&D-eligible labour cost' without required fields: staff member, project code, period, percentage or hours, salary base, R&D-eligible amount.
- 1.6 Contemporaneous records check: No timestamps provided for any technical narrative entry. No git commit timestamps, calendar events, meeting notes, or wiki edit logs provided as primary evidence. Cannot verify ≤30 day contemporaneous requirement.
- 1.7 Receipt-to-activity linkage: No receipts provided in pack. Cannot verify that R&D-claimed receipts over $1,000 link to specific activities in the register.

**Warnings:** 4.1 Tax accountant reviewable, 4.2 Provenance sidecars, 4.3 Cross-references intact

### bad-2-routine-maintenance.md — OK

**Verdict:** fail  ·  **Score:** 10  ·  **Expected:** fail

**Hard failures:**
- 1.3 - No core activity declared: The pack declares `category: core` in frontmatter but the activity described is exclusively routine maintenance: 'routine maintenance on the Command Center finance dashboard', 'Fixing CSS issues', 'Updating dependencies', 'Patching minor bugs', 'Routine code refactoring'. This is ordinary software maintenance under s355-25(2) ITAA 1997, not R&D. No hypothesis, technical uncertainty, experiment design, or expected-vs-actual outcome is present.
- 1.3 - All four AusIndustry components missing: Content: 'Our goal was to make the dashboard more reliable and easier for stakeholders to use.' — goal/aspiration, not hypothesis. No knowledge gap, no experiment variables, no controls, no success criteria, no measurement. Pure 'we built it and it worked' with only qualitative stakeholder reports ('Stakeholders report it is easier to use') and no numeric delta.
- 1.5 - Salary allocation missing required information: Inline salary data reads 'Ben Knight 40% R&D-eligible. Nic Marchesi 30% R&D-eligible.' Missing: period, salary base, R&D-eligible dollar amount. Also: increases to 40%/30% above Money Framework defaults (Nic 25%, Ben 10%) with only 'because of the dashboard work' as justification — no citation to Money Framework decision log, and since the underlying work is non-R&D routine maintenance, the allocation itself is invalid.
- 1.8 - Excluded activity types claimed: Content explicitly contains multiple excluded activity types: (1) 'Marketing campaigns to drive engagement with the dashboard' — marketing/promotion; (2) 'Customer acquisition for our pitch process improved' — customer acquisition; (3) 'Routine code refactoring for readability' — routine maintenance; (4) 'Staff training sessions for new contributors on the codebase' — staff training; (5) 'general business development work (writing pitch decks, preparing investor briefings)' — general business development. All five are listed in Tier 1.8 pattern flags as automatic fails.

**Warnings:** 1.2 - AusIndustry registration unverifiable, 1.6 - Contemporaneous records not evidenced, 1.7 - No receipts provided, 4.2 - Provenance sidecars missing

### bad-3-no-hypothesis.md — OK

**Verdict:** fail  ·  **Score:** 0  ·  **Expected:** fail

**Hard failures:**
- 1.3 No core activity declared: Category declared 'core' but content has zero AusIndustry components: 'Goals' are aspirations (lines 9-14: 'Create a beautiful, accessible storytelling experience', 'Build trust', 'Scale to multiple communities'), not hypothesis. 'What was hard' section (lines 16-19) contains only generic statements ('Building software is always hard') with no technical uncertainty. No experiment design with variables, controls, or success criteria. Outcome (lines 21-24) is 'platform is live' with no measurement—pure 'we built it and it worked'. Four components missing = no valid core activity.
- 1.5 Salary allocation mismatch: Line 26: 'Ben Knight 35%, Nic Marchesi 15%'. Per Money Framework default: Nic 25% R&D, Ben 10% R&D. Deviation: Nic -10pp, Ben +25pp. No citation to Money Framework decision log. Pack provides no evidence org-wide totals reconcile despite per-project deviation. Mismatch exceeds ±2% threshold without authorisation.
- 1.6 Contemporaneous records check: No timestamps present anywhere in document. No git commit timestamps, calendar events, meeting notes, or wiki edit logs cited. 'Evidence trail' (lines 30-31) says 'Code in the empathy-ledger repo. Stories in wiki/stories/' but no dates provided. No evidence of activities logged within 30 days of occurrence.
- 1.7 Receipt-to-activity linkage: Line 26 lists 'contractor V. Patel $30K, cloud $12K' but: (a) no itemised receipt register; (b) no linkage to specific activity in register; (c) contractor and cloud costs over $1,000 require explicit activity linkage per rule. Single line 'Ben Knight 35%, Nic Marchesi 15%, contractor V. Patel $30K, cloud $12K' does not constitute a structured salary allocation sheet with staff member, project code, period, percentage, salary base, and R&D-eligible amount.
- 2.1 Hypothesis absent: Calibration-case failure confirmed: 'Goals' section (lines 9-14) contains only goals/aspirations. Example of bad: 'Create a beautiful, accessible storytelling experience' is a goal, not a testable proposition. No 'hypothesise that...' construct found anywhere in document.
- 2.2 Technical uncertainty absent: No named knowledge gap. 'What was hard' (lines 16-19) lists generic implementation difficulties, not knowledge gaps that 'could not be resolved by a competent professional from existing literature'. No reference to what's been tried in literature, why it's insufficient, or what remains uncertain.
- 2.3 Experiment design absent: No described method with measurable outcomes. No variables, controls, success criteria, or data capture method. Document describes features built, not experiments conducted.
- 2.4 Outcome (expected vs actual) absent: Lines 21-24: 'The platform is live. Multiple communities are using it. Storytellers are sharing stories. We are proud of what we built.' No expected outcome documented pre-experiment. No actual outcome with delta vs expected. Pure 'we built it and it worked' with zero measurement. FAIL per rubric.

**Warnings:** 1.2 AusIndustry registration citation incomplete, 1.8 Excluded activity types present, 4.1 Tax accountant reviewable — no executive summary, 4.2 Provenance sidecars missing, 4.3 Cross-references not validated

### good-1-act-gd.md — MISMATCH

**Verdict:** fail  ·  **Score:** 70  ·  **Expected:** pass

**Hard failures:**
- 1.5 - Salary allocation sheet mismatch: Frontmatter states 'Nic 25% R&D salary $87,500; Ben 10% R&D salary $35,000' but the inline salary table states Nic: 25% × $200,000 = $50,000 and Ben: 10% × $200,000 = $20,000. The two sources disagree by 75% (Nic) and 75% (Ben). Per rule 1.5, 'R&D-eligible × salary base per founder must equal what's claimed in the activity register; mismatch ±2% → fail.' The discrepancy far exceeds 2% tolerance. The pack cannot be used for lodgement until the salary basis is reconciled.

**Warnings:** 4.2 - Provenance sidecars missing, 1.2 - AusIndustry registration citation unverified

### good-2-act-el.md — MISMATCH

**Verdict:** warn  ·  **Score:** 94  ·  **Expected:** pass

_no hard failures_

**Warnings:** 4.1 Tax accountant reviewable, 4.2 Provenance sidecars

### good-3-act-cg.md — OK

**Verdict:** pass  ·  **Score:** 97  ·  **Expected:** pass

_no hard failures_

**Warnings:** 4.2 Provenance sidecars
