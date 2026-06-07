# ACT-IN classification — internal tooling vs claimable product R&D

> Resolves the open ACT-IN core/supporting/out question from `software-rd-compliance-check.md`.
> Determination 2026-05-31, from reading the actual tool purposes. **Not advice — Standard Ledger confirms.**

## The test (why purpose, not cleverness, decides)

- **Internal-administration exclusion (s355-25(2)(b)):** software developed for the **dominant purpose** of the
  entity's own internal administration (incl. management functions) is **excluded from core R&D** — *regardless of how
  novel it is*. The exclusion is purpose-based.
- **Supporting-activity carve-out (sector guide, May-2024):** excluded-core software *may* still be a **supporting**
  activity, but only if its **dominant purpose is to support a registered core R&D activity** (an experiment) — not
  to support the business's operations or its R&D *claim process*.

## Per-component determination (purposes read from the source headers)

| Component | File(s) | Actual dominant purpose | Internal-admin exclusion? | Supporting test | Verdict |
| --- | --- | --- | --- | --- | --- |
| Alignment-Loop truth-state synthesis | `scripts/synthesize-project-truth-state.mjs` + `scripts/lib/alignment-loop-grade.mjs` | "scores presence across four sources (wiki × DB × codebase × Xero)" to tell ACT the true state of its own projects — automation of a manual management pass | **Yes — excluded** (internal project/ops management) | Fails — supports ACT's ops, not a core experiment | **OUT as core** |
| Rubric calibration / grading harness | `scripts/grade-pack.mjs`, `scripts/grade-alignment-loop-synthesis.mjs` | grades ACT's own synthesis docs **and the R&D pack itself** | **Yes — excluded** (internal QC; *circular* against the R&D claim) | Fails — supports the claim process, not a core experiment | **OUT as core** |
| PostgREST 1000-cap ground-truth harness | `apps/command-center/src/lib/finance/ledger.ts` | correct internal finance reporting | Yes — internal finance admin; and the fix was **known-solution** | Fails | **OUT** |

A narrow supporting-activity argument exists only if a tool were built *specifically to evaluate the outcome of a
named core experiment*. None of these were — they are general ops/QC/finance tools. Flag for the adviser, but do not
rely on it.

## The resolution — do NOT create an ACT-IN core register

The honest, audit-safe outcome:

1. **There is no ~$95K ACT-IN core claim to bank.** The internal tools are excluded as core and fail the supporting
   test. The earlier "biggest lever toward $180-250K" framing is withdrawn.
2. **Re-cut Ben's ~60% "ACT-IN" time, don't register it as a block.** That bucket (README salary table: ACT-IN
   60% × $250K × 95% = $142,500) is a **mix**:
   - **External-facing experimental work → move into the PRODUCT registers** where it is defensible: ALMA ingestion →
     **ACT-JH**; entity-resolution autoresearch loop → **ACT-CG** (note the pre-Pty timing flag); the Governed-Proof
     federated assembler → **ACT-JH / new cross-platform**. These are genuine core activities used by external parties.
   - **Internal ops / QC / finance time (Alignment Loop, grading, ledger harness) → simply not R&D.** Drop it from the
     claim.
3. **Net effect:** the defensible claim stays the **four external-facing product registers ($354,047)** plus the
   properly-homed product experiments — *lower* risk, not a smaller honest claim. Removing a risky internal-admin
   claim is what survives a TA 2017/5 review.

## What Standard Ledger confirms
- The purpose characterisation of each tool (internal-admin vs product).
- The **personnel re-cut**: what fraction of Ben's "ACT-IN" time was genuinely on external-facing product experiments
  (→ product registers) vs internal ops (→ not R&D).
- Whether any internal tool genuinely ships *inside* an external product (which would change its character).

## Confidence
- **Verified:** the dominant purposes, read directly from the file header docblocks (cited above), 2026-05-31.
- **My analysis (adviser confirms):** the exclusion/supporting verdicts and the re-cut recommendation. **Not advice.**
