# Software R&D Compliance Check — TA 2017/5 + Sector Guide

> Required reading the AusIndustry application form itself flags (ANZSIC M / 7000 Computer System Design).
> Built 2026-05-31. Maps ACT's claims against the ATO/AusIndustry software-R&D guardrails. **Not advice — Standard Ledger confirms.**

## Sources (reviewed 2026-05-31)
- **TA 2017/5** Claiming the R&D Tax Incentive for software development (ATO + AusIndustry). [ATO legal database](https://www.ato.gov.au/law/view/document?DocID=TPA/TA20175/NAT/ATO/00001)
- **TA 2017/5A** Addendum (routine testing clarification). [ATO legal database](https://www.ato.gov.au/law/view/document?DocID=TPA/TA20175A/NAT/ATO/00001)
- **Software development sector guide** + "Software activities and the R&DTI" PDF. [business.gov.au](https://business.gov.au/grants-and-programs/research-and-development-tax-incentive/sector-guides-for-r-and-d-tax-incentive-applicants/software-development)
- ATO "Helping you get R&D claims right".
- _(The ATO law pages 403 on automated fetch; content above is from the business.gov.au sector guide fetch + ATO search summaries. Standard Ledger reads the primary PDFs.)_

## The rules in brief
1. **Per-activity, not per-project.** The #1 ATO concern is whole-of-project registration without isolating eligible R&D activities from ineligible ones. Eligibility attaches to specific *activities*.
2. **Real experiment, unknown outcome.** A core activity needs a hypothesis tested by experiment whose outcome could not be known in advance by a competent professional from established science/principles.
3. **Internal-administration exclusion (s355-25(2)).** Software developed for the dominant purpose of the entity's own internal administration (incl. business/management functions) is **excluded from core** R&D. Per the May-2024 update it **may** be claimed as a **supporting** activity if its dominant purpose is supporting a core R&D activity.
4. **Routine work is out.** Standard debugging, maintenance, implementation of known solutions, routine development following established practice. The **addendum (TA 2017/5A)** specifically narrows when routine *testing* steps can be claimed.
5. **Existing tech in a new context CAN qualify.** The sector guide: "activities involving the application of existing technology in a different context or location are capable of meeting the definition." (Supports the overseas finding.)
6. **Records.** Contemporaneous records isolating the experimental activity.

## ACT assessment (finding by finding)

### F1 — ACT-IN internal tooling: HIGH internal-administration risk (headline)
The two ACT-IN candidates (Alignment-Loop truth-state synthesis; LLM-graded rubric calibration) are **internal** software — ACT assessing/grading its own projects. As **core** activities they are at **high risk of the s355-25(2) internal-administration exclusion**.
- **Do NOT bank ACT-IN as core.** At best, claim as a **supporting** activity, and only the portion whose dominant purpose is supporting a registered core experiment (e.g. supporting the EL/JH/CivicGraph evaluations). Otherwise excluded.
- **Correction:** earlier pack framing called ACT-IN "the biggest lever toward $180-250K." That is now caveated — ACT-IN is the biggest *gap* but also the *riskiest*. The defensible core is the four external-facing product registers.

### F2 — Whole-of-project: ACT is well-isolated, but personnel % is a scrutiny risk
ACT's four registers are framed as **specific hypotheses** (entity-resolution precision; matching conversion; consent verifiability; federated-mapping match-rate) — exactly the per-activity isolation TA 2017/5 wants. Strength.
- **Risk:** the personnel allocation (Ben 95%, Nic 40%) is high. TA 2017/5 scrutinises whether that much time is genuinely on *experimental* activities vs routine development. **Standard Ledger should map the salary % to the isolated experimental activities, not the whole dev effort**, and be ready to defend the split.

### F3 — Products are external-facing: exclusion does NOT bite them
Empathy Ledger, JusticeHub, CivicGraph and Goods are built for external use (communities, partners, the public), not ACT's internal administration. The internal-admin exclusion does not apply. Clean.

### F4 — Routine testing vs experimental evaluation (addendum)
ACT's experiments involve measurement (extraction-fidelity scoring, leakage tests, conversion measurement). These are **experimental evaluation of a hypothesis**, not routine QA. The records must make that distinction explicit so they are not mistaken for the routine testing the addendum excludes.

### F5 — Overseas finding is supported
The sector guide's "existing technology in a different context or location" language supports the World Tour overseas activities (testing the tech against populations/contexts not present in Australia). Positive.

### F6 — ANZSIC M / 7000 is reasonable
Division M (Professional, Scientific and Technical Services) / Class 7000 (Computer System Design and Related Services) is a defensible classification for ACT's software-R&D entity. Confirm with Standard Ledger given ACT's mixed (impact + software) activities.

### F7 — Records are strong
Commit-hash audit trail + provenance sidecars + receipt coverage meet the contemporaneous-record expectation. Strength.

## Actions for Standard Ledger
1. **Re-classify ACT-IN** — core (likely excluded) vs supporting (dominant-purpose test) vs out. Do not register ACT-IN as core without this call.
2. **Defend the personnel split** — map Ben 95% / Nic 40% to the isolated experimental activities; trim to what is genuinely experimental.
3. Confirm **ANZSIC M / 7000**.
4. Ensure records label experimental evaluation distinctly from routine testing (addendum).
5. Read the primary TA 2017/5, TA 2017/5A and the sector-guide PDF before lodgement.

## Confidence
- **Verified (web-checked 2026-05-31):** the per-activity rule, the internal-administration exclusion + supporting-activity carve-out, the routine-work/addendum points, the "existing tech in a new context" allowance. From the business.gov.au sector guide + ATO search summaries (primary ATO PDFs to be read by SL).
- **Adviser-dependent:** the ACT-IN core/supporting/excluded call; the personnel-split defence; ANZSIC confirmation. **Not advice.**
