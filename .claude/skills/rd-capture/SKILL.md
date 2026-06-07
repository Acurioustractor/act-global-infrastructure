---
name: rd-capture
description: Capture a contemporaneous R&D record at the close of engineering work that resolved genuine technical uncertainty — novel architecture, an experimental integration, or an approach whose outcome was not knowable in advance. Appends to the FY26 R&D activity register for the 43.5% R&D Tax Incentive. Do NOT use for routine work — CRUD, config, copy, dependency bumps, or bug fixes with a known solution are not R&D.
---

# R&D Capture — contemporaneous record for the R&D Tax Incentive

ACT claims the **43.5% refundable R&D Tax Incentive** for FY25-26 via A Curious Tractor Pty Ltd (Path C; lodgement Jul 2026 – 30 Apr 2027). The refund **legally requires contemporaneous records** — written at the time the work happened, not reconstructed at lodgement. This skill captures that record *now*, while the work is fresh and the commits are right there. The claim is material (realistically $180–220K) and the ATO can audit — so the discipline cuts both ways: capture real R&D faithfully, and **never inflate routine work into an R&D claim.**

## Eligibility gate FIRST (most engineering is NOT R&D)

Before capturing anything, apply the core R&D activity test. It qualifies as a **core R&D activity** only if ALL three are true:

1. **Outcome could not be known in advance** — a competent professional in the field could not have predicted the result without doing the experimental work.
2. **It resolved a technical/scientific uncertainty** — a genuine *technical* unknown, not a business or design preference.
3. **It followed a systematic progression** — hypothesis → experiment → observation → logical conclusion.

If any is false, this is **not** a core R&D activity. Say so plainly and stop — routine CRUD, config, glue code, UI copy, dependency bumps, and bug fixes with a known solution do not qualify. (Some may be *supporting* R&D activities if undertaken for the dominant purpose of supporting a core activity — note that separately; don't pad the core.)

## Match the existing format (pull, don't guess)

R&D activities live in per-project registers in `thoughts/shared/rd-pack-fy26/`:

- `act-cg-rd-activity-register.md` (CivicGraph) · `act-el-rd-activity-register.md` (Empathy Ledger) · `act-gd-rd-activity-register.md` (Goods) · `act-jh-rd-activity-register.md` (JusticeHub).

**Read the relevant register and one existing entry before writing**, and match its structure exactly. Pick the register for the project this work belongs to; if it spans projects, capture under the dominant one and cross-reference. Check `audit-trail.md` in the same dir for how entries are logged.

## Capture the record (one pass, while it's fresh)

Append a dated entry covering:

- **Date** — today (do **not** backdate; contemporaneous means *now*).
- **Activity title** + whether **core** or **supporting**.
- **The technical uncertainty** — what was unknown, and why existing knowledge / a competent professional couldn't predict the outcome. This is the load-bearing field; a vague uncertainty sinks the claim.
- **Hypothesis** — what you expected, and why.
- **Experiments** — what you actually tried, in sequence. Include approaches that **failed** — failed experiments are among the strongest R&D evidence.
- **Observations / results** — what happened.
- **Conclusion** — what you now know that you didn't before.
- **Evidence links** — commit SHAs, PR numbers, test runs, the files touched. These are the receipts.
- **Effort** — rough hours / who, for cost apportionment.

Never fabricate an uncertainty, experiment, or result to strengthen an entry. If a field is genuinely unknown, mark it and ask — an honest gap is recoverable; a fabricated record is fraud and risks the whole claim. (Same discipline as `verification.md` and the provenance rule.)

## Close the loop

- Create/update the entry's `.provenance.md` sidecar (per the provenance rule — this is durable **evidence**, not disposable scaffolding, per the doc-lifecycle rule in CLAUDE.md).
- Offer to run `node scripts/grade-pack.mjs` — it grades the pack and is the feedback loop on evidence quality. A low grade means the uncertainty/experiment write-up is too thin to survive scrutiny; tighten it now, while you still remember the work, not at lodgement.
- Strategy + live plan: `thoughts/shared/plans/rd-tax-incentive-fy2526-path-c.md`.
