# Calibration — rd-evidence-pack.md

> Run: 2026-05-06T22:02:04.240Z
> Pass rate: 6/6
> Rubric: `/Users/benknight/Code/act-global-infrastructure/thoughts/shared/rubrics/rd-evidence-pack.md`
> Fixtures: `/Users/benknight/Code/act-global-infrastructure/thoughts/shared/rubrics/fixtures/rd-evidence/`
> Grader: `scripts/grade-pack.mjs` (claude-sonnet-4-6)

## Results

| Fixture | Expected | Got | Score | Correct? |
|---------|----------|-----|-------|----------|
| bad-1-sole-trader.md | fail | fail | 70 | YES |
| bad-2-routine-maintenance.md | fail | fail | 2 | YES |
| bad-3-no-hypothesis.md | fail | fail | 62 | YES |
| good-1-act-gd.md | pass | pass | 97 | YES |
| good-2-act-el.md | pass | pass | 91 | YES |
| good-3-act-cg.md | pass | pass | 100 | YES |

## Detail

### bad-1-sole-trader.md — OK

**Verdict:** fail  ·  **Score:** 70  ·  **Expected:** fail

**Hard failures:**
- 1.1 Wrong entity: Frontmatter declares entity: nic-sole-trader, registrant: Nic Marchesi (sole trader), ABN 21 591 780 066. Per rubric rule 1.1, any R&D claim attributed to nic-sole-trader (ABN 21 591 780 066) for FY26 is a hard block. The sole trader period is forfeited per Path C decision logged 2026-04-27.

**Warnings:** 1.2 AusIndustry registration absent or incomplete, 1.5 Salary allocation sheet — entity mismatch, 4.1 Tax accountant reviewable — executive summary absent, 4.2 Provenance sidecars missing

### bad-2-routine-maintenance.md — OK

**Verdict:** fail  ·  **Score:** 2  ·  **Expected:** fail

**Hard failures:**
- 1.8 Excluded activity types claimed: Pack explicitly claims: 'routine maintenance on the Command Center finance dashboard', 'Staff training sessions for new contributors on the codebase', 'general business development work (writing pitch decks, preparing investor briefings)', 'Marketing campaigns to drive engagement with the dashboard', 'Customer acquisition for our pitch process improved'. All five of these match the explicit pattern flags in rule 1.8 (routine maintenance, staff training, general business development, marketing campaign, customer acquisition) and none are reframed with a hypothesis or uncertainty.
- 1.3 No core activity declared: The document contains no core activity with the four required AusIndustry components (hypothesis, technical uncertainty, experiment design, expected vs actual outcome). The 'Goals' section is a goal/aspiration ('make the dashboard more reliable and easier for stakeholders to use'), not a hypothesis. No experiment design, no technical uncertainty, no pre/post outcome measurement is present anywhere in the pack.
- 1.5 Salary allocation sheet missing or nonsense: Ben Knight is listed at 40% R&D-eligible, which exceeds the org-wide default of 10% for Ben. The rubric requires a citation to the Money Framework decision log when a per-project deviation pushes the org-wide total above default. No such citation is present. Nic Marchesi is listed at 30%, exceeding the 25% default, also with no Money Framework citation. Both overrides are unsupported.
- 1.6 Contemporaneous records check: The only evidence cited is 'Git commits across FY26 in the apps/command-center directory. Approximately 240 commits.' No timestamps are provided for any narrative entries. There is no way to verify that any technical narrative entry was created within 30 days of the activity it describes. The narrative appears to be a single retrospective summary with no contemporaneous timestamps.
- 1.7 Receipt-to-activity linkage: No receipts are referenced or linked in the pack at all. The claim_total is $95,000 but no receipt-to-activity linkage exists. Any R&D-claimed receipts over $1,000 (which would almost certainly exist in a $95,000 claim) are not linked to any specific activity in a register.

**Warnings:** 1.8 pattern flag — marketing campaign, 1.8 pattern flag — customer acquisition, 1.8 pattern flag — staff training, 1.8 pattern flag — routine maintenance, 1.8 pattern flag — general business development, 2.1 Hypothesis absent, 2.2 Technical uncertainty absent, 2.3 Experiment design absent, 2.4 Outcome (expected vs actual) absent, 4.1 Tax accountant reviewable — executive summary missing, 4.2 Provenance sidecars missing, 3.1 No supporting activities section

### bad-3-no-hypothesis.md — OK

**Verdict:** fail  ·  **Score:** 62  ·  **Expected:** fail

**Hard failures:**
- 1.3 No core activity declared — Tier 2 2.1 Hypothesis missing: The pack contains no hypothesis. The 'Goals' section lists aspirations ('Create a beautiful, accessible storytelling experience', 'Become the leading platform for ethical storytelling in Australia') which are explicitly disqualified as hypotheses under rule 2.1. No specific, testable proposition about the world is present anywhere in the document.
- 1.3 No core activity declared — Tier 2 2.2 Technical uncertainty missing: The 'What was hard' section ('Building software is always hard. We had to write a lot of code...') does not name a knowledge gap unreachable by a competent professional from existing literature. No prior search is referenced, no gap is characterised, and no residual uncertainty is articulated.
- 1.3 No core activity declared — Tier 2 2.3 Experiment design missing: No experiment design is described. There are no variables, controls, success criteria, or data capture methods anywhere in the document.
- 1.3 No core activity declared — Tier 2 2.4 Outcome (expected vs actual) missing: 'The platform is live. Multiple communities are using it. Storytellers are sharing stories. We are proud of what we built.' This is a pure 'we built it and it worked' statement with no pre-experiment expected outcome documented and no measurement delta captured, failing rule 2.4 explicitly.

**Warnings:** 1.5 Salary allocation — org-wide reconciliation unverifiable, 1.6 Contemporaneous records check — timestamps absent, 1.7 Receipt-to-activity linkage — receipts not linked, 4.1 Tax accountant reviewable — executive summary absent, 4.2 Provenance sidecars missing, 4.3 Cross-references — evidence trail unresolvable

### good-1-act-gd.md — OK

**Verdict:** pass  ·  **Score:** 97  ·  **Expected:** pass

_no hard failures_

**Warnings:** 4.2 Provenance sidecars, 1.2 AusIndustry registration — verifiability, 4.3 Cross-references intact, 1.5 Salary allocation — amount reconciliation

### good-2-act-el.md — OK

**Verdict:** pass  ·  **Score:** 91  ·  **Expected:** pass

_no hard failures_

**Warnings:** 1.5 Salary allocation — org-wide reconciliation assertion unverified, 4.2 Provenance sidecars missing, 4.3 Cross-references — unresolved internal links, 4.1 Executive summary absent

### good-3-act-cg.md — OK

**Verdict:** pass  ·  **Score:** 100  ·  **Expected:** pass

_no hard failures_


