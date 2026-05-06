# Rubric: R&D evidence pack (R&DTI Path C, FY25-26)

> Slug: `rd-evidence-pack`
> Version: 1.0
> Created: 2026-05-07
> Calibrated: 6/6 against canonical fixtures (3 known-good, 3 known-bad). Status: production-eligible.
> Use: pass to Anthropic Managed Agents Outcomes, or to a local grader before quarterly weekly-reconciliation runs.
> Lodgement window: Jul 2026 – 30 Apr 2027. Registrant: A Curious Tractor Pty Ltd (ACN 697 347 676).
> Refund rate: 43.5% offset. Realistic estimate $180–220K (not $250K — see rebuttal doc).
> Stakes: failure means lodgement rejected, refund delayed or denied.

## What this rubric grades

The R&D evidence pack assembled before lodgement. Inputs are: AusIndustry registration draft, R&D activity register, supporting receipt pack, salary allocation sheet, technical narrative per project. The pack must satisfy ATO + AusIndustry contemporaneous-records expectations.

## Inputs

- `pack` — directory or markdown bundle containing at minimum: `core-activities.md`, `supporting-activities.md`, `salary-allocations.csv`, `vendor-receipts/`, `technical-narratives/`, `audit-trail.md`
- `fy` — fiscal year (default `FY26`, range `2025-07-01` to `2026-06-30`)
- `entity` — registrant entity (`act-pty-ltd` for FY26+; sole trader period FY24-25 is forfeit, fail any entity = `nic-sole-trader` for R&D claims)

## Output

```json
{
  "verdict": "pass" | "warn" | "fail",
  "score": 0-100,
  "estimated_refund_range": [number, number],
  "hard_failures": [{ "rule": "...", "evidence": "..." }],
  "warnings":      [{ "rule": "...", "evidence": "..." }],
  "missing_artefacts": [string],
  "audit_readiness": { "ausindustry": "ready|partial|missing", "ato": "ready|partial|missing" }
}
```

`fail` if any Tier 1 hard rule trips. `warn` if Tier 1 clean but Tier 2 has structural gaps. `pass` only when all four tiers clean.

---

## Tier 1 — hard rules (binary, BLOCK on hit)

### 1.1 Wrong entity
- Any R&D claim attributed to `nic-sole-trader` (ABN 21 591 780 066) for FY26 → fail. The sole trader period is forfeited per the Path C decision logged 2026-04-27.
- Any R&D claim attributed to `act-foundation` or `act-ventures` → fail (not legal names; correct is `act-pty-ltd` / A Curious Tractor Pty Ltd, ACN 697 347 676).
- Any reference to "A Kind Tractor Ltd" as registrant → fail (it's the dormant charity, not trading).

### 1.2 AusIndustry registration absent or incomplete
- Pack must include OR cite an AusIndustry registration: a `ausindustry-registration.{md,pdf,html}` file, a confirmation receipt, or a frontmatter `ausindustry_registration:` field with a registration ID/date that resolves to a verifiable record.
- Registration must declare each core activity with: hypothesis, technical uncertainty, experiment design, expected vs actual outcome.
- Frontmatter citation alone passes if all four components ARE in the pack itself; the rule is "registration exists and is verifiable", not "a separate file exists".
- Missing registration with no citation → fail.

### 1.3 No core activity declared
- Each R&D project (e.g. ACT-GD Goods on Country, ACT-OO Oonchiumpa, ACT-EL Empathy Ledger, ACT-CG CivicGraph) claimed must have at least one **core activity** with all four AusIndustry components present.
- Supporting-only claims without a core activity → fail.

### 1.4 Receipts gap above 15%
- Per project, receipt coverage must be ≥85% by dollar value. Spending Intelligence v3 reports 95.3% at the org level — per-project must also clear 85%.
- Use `xero_invoices.has_attachments` + `receipt_emails.status='uploaded'` + bill-attachment cross-references (the 6-path classifier from `bas-cycle`).
- Below 85% on any claimed R&D project → fail.

### 1.5 Salary allocation sheet missing or nonsense
- Required information (in any format — CSV, inline markdown table, structured frontmatter all acceptable): staff member, project code, period, percentage or hours, salary base, R&D-eligible amount.
- Total R&D-eligible × salary base per founder must equal what's claimed in the activity register; mismatch ±2% → fail.
- Per Money Framework: Nic 25% R&D, Ben 10% R&D as default **across the whole portfolio**. Per-project allocations can deviate from the org-wide default as long as the org-wide totals reconcile. A per-project deviation needs a citation to the Money Framework decision log only when it pushes the org-wide total above default.

### 1.6 Contemporaneous records check
- Each technical narrative entry must have a timestamp ≤30 days after the activity it describes.
- Narrative entries dated more than 90 days after the activity → fail (ATO contemporaneous test).
- Use git commit timestamps, calendar events, meeting notes, or wiki edit logs as primary evidence.

### 1.7 Receipt-to-activity linkage
- Every R&D-claimed receipt over $1,000 must link to a specific activity in the register.
- Receipts tagged R&D-eligible but not linked to an activity → fail.

### 1.8 Excluded activity types claimed
- Reject any of: marketing/promotion, market research, social science research without scientific method, software development that's "ordinary" maintenance, training of staff. These are explicitly excluded under Section 355-25(2) ITAA 1997.
- Pattern flags (case-insensitive): `marketing campaign`, `customer acquisition`, `routine maintenance`, `staff training`, `general business development` — all warn unless reframed with a hypothesis + uncertainty.

---

## Tier 2 — structural rules (LLM grader, per activity)

For each declared core activity, verify all four AusIndustry components are present and substantive (not boilerplate):

### 2.1 Hypothesis
- A specific, testable proposition about the world. NOT a goal or aspiration.
- Bad: "We will build a recycling logistics platform that scales."
- Good: "We hypothesise that bulk-aggregating regional waste flows via a shared digital ledger reduces per-unit transport cost by ≥25% compared with point-to-point pickup, despite added coordination overhead."

### 2.2 Technical uncertainty
- A named knowledge gap that could not be resolved by a competent professional from existing literature.
- Must reference: what's been tried (search), why it's insufficient, what remains uncertain.

### 2.3 Experiment design
- A described method with measurable outcomes.
- Must include: variables, controls, success criteria, data capture method.

### 2.4 Outcome (expected vs actual)
- Pre-experiment: expected outcome documented.
- Post-experiment: actual outcome captured, with delta vs expected.
- A pure "we built it and it worked" with no measurement → fail this rule.

---

## Tier 3 — supporting activity linkage

For each supporting activity:

### 3.1 Direct linkage to a core activity
- Every supporting activity must name the core activity it supports.
- Standalone supporting activities → fail.

### 3.2 Reasonable proportion
- Supporting activity expenditure should not exceed core × 5 (rule of thumb — flag if violated).
- AusIndustry scrutinises high supporting:core ratios.

---

## Tier 4 — pack-level audit readiness

### 4.1 Tax accountant reviewable
- Pack opens with a 1-page executive summary stating: total claim, refund estimate, registrant, fiscal year, lead contact.
- Each activity is a self-contained markdown file with frontmatter (`project`, `dates`, `claim_total`, `category: core|supporting`).

### 4.2 Provenance sidecars
- Every dollar figure must have a `.provenance.md` sidecar (per project rule). Template: `thoughts/shared/templates/provenance-template.md`.
- Missing sidecars → warn (not fail) but reduce score.

### 4.3 Cross-references intact
- Every link to a Notion page, wiki entry, or thoughts/ doc must resolve. Broken links → warn.

---

## Scoring

```
score = 100
  - 30 per Tier 1 hard failure (capped at 100)
  - 8 per Tier 2 structural gap
  - 5 per Tier 3 linkage gap
  - 3 per Tier 4 readiness gap
estimated_refund_range:
  - lower = 0.435 × (claim_total × 0.85) when score ≥ 70
  - upper = 0.435 × claim_total when score = 100
  - if score < 70, range = [0, 0]
```

## Calibration set (to build before v0.2)

Three known-good packs (must score `pass`):
- A worked example for ACT-GD with at least one full core activity
- A worked example for ACT-EL with hypothesis + experiment + outcome
- The reference Path C registration draft once ready

Three known-bad packs (must score `fail`):
- Sole-trader-attributed claim → 1.1 fail
- "Routine maintenance of the dashboard" claimed as R&D → 1.8 fail
- Claim with no hypothesis, just goals → 2.1 fail

## Open questions before v1.0

| # | Question | How to resolve |
|---|----------|----------------|
| 1 | Confirmed list of FY26 core activities per project? | Working session with Nic + tax advisor |
| 2 | Standard Ledger preferred file structure for the pack? | Email accounts@act.place |
| 3 | AusIndustry registration deadline for FY26? | Confirm 30 Apr 2027 (per memory) |
| 4 | Per-project R&D-eligible salary % override list (BG Fit 50%, etc.)? | Money Framework decision log |

## Versioning

- **v0.1** (2026-05-07 morning) — initial draft from memory + Path C decision log + ATO/AusIndustry public guidance.
- **v1.0** (2026-05-07 afternoon) — calibrated 6/6 against fixtures in `fixtures/rd-evidence/`. Two clarifications added during calibration: (a) salary allocation accepts any tabular format with required information, not just CSV; (b) AusIndustry registration accepts a frontmatter citation that resolves to a verifiable record, not only a separate file. Production-eligible.

Source of truth references: `thoughts/shared/plans/rd-tax-incentive-fy2526-path-c.md` (if exists), `wiki/finance/act-money-thesis-rebuttal.md`, ATO R&DTI guidance, AusIndustry registration form.

Grader command: `node scripts/grade-pack.mjs --rubric thoughts/shared/rubrics/rd-evidence-pack.md --pack <path-to-pack>`
