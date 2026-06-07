# Deepened R&D Narrative — cross-project thesis (refugee / sovereignty / power)

> Synthesis of three deep-dives (2026-05-31): JusticeHub refugee/justice, Empathy Ledger data sovereignty,
> GrantScope philanthropic power. Compliance-aware (external-facing product mechanisms, isolated experimental
> activities, per TA 2017/5). **Not advice — Standard Ledger confirms eligibility.** Detail:
> `thoughts/shared/handoffs/world-tour-tax-rd/deepdive-{justicehub-refugee,el-sovereignty,grantscope-power}.md`.

## The thesis (the novel idea ACT is moving on in Australia)

ACT is building a **consent-governed, sovereignty-bounded evidence commons** across three layers, and the technical
hard problem is the same one each time: **how do you maximise the usefulness of fused community data while provably
never exceeding the consent and sovereignty constraints of its most-restricted source?**

| Layer | Project | Role | The hard problem |
| --- | --- | --- | --- |
| Capital / power | **GrantScope / CivicGraph** | who funds whom, open-sourced (MIT) | resolving ~100K entities across 30+ messy public datasets |
| Evidence / justice | **JusticeHub** | proof for alternatives to custody, refugee/justice | fusing sources without breaching the strictest consent |
| Voice / sovereignty | **Empathy Ledger** | consent-led storytelling, community-owned | extracting cultural constructs no taxonomy holds; gating AI voice-drift |

The **integrating crown jewel** is JusticeHub's **Governed-Proof federated assembler**, which fuses all three into
per-place "proof bundles." The recurring **method** is bounded, ethically-constrained self-calibration against
held-out ground truth — a system that improves itself but is provably forbidden from learning to rank or optimise
people. That ethical bound, made technical, is the genuinely novel contribution.

## New and strengthened R&D candidates (compliance-gated)

| Candidate | Project | What is genuinely novel/uncertain | Strength | Maps to | Evidence gap to close |
| --- | --- | --- | --- | --- | --- |
| **Governed-Proof federated assembler** (NEW) | JusticeHub (+EL+CG) | publish-ceiling of a fused proof bundle is bounded by the most-restrictive constituent consent; richness-vs-safety trade-off was not knowable a priori | **Strong — lead the narrative** | new (cross-platform) | the assembler "algebra" design-decision trail |
| **Entity-resolution autoresearch loop** | GrantScope / CivicGraph | LLM-mutated resolver under a frozen eval harness + held-out ABN truth; commit-on-gain / revert-on-regression | **Strong evidence** (F1 76.9→94.1; 24 logged iters, mostly reverted) | strengthens **ACT-CG-C1** | **TIMING — see flag below** |
| **ALMA self-calibrating, ethically-bounded extraction** | JusticeHub | learns extraction quality + confidence calibration while provably refusing to learn to rank people | Moderate-strong | extends **ACT-JH** | the 0.2→0.03 calibration run logs |
| **PRISM cultural-field extraction + Guardian voice gate** | Empathy Ledger | extracts community-defined sovereignty constructs (lived-experience authority, story_sovereignty, sacred markers, elder-verification) into a stable gradeable schema; deterministic voice-drift gate with empirically-found thresholds | Strong | strengthens **ACT-EL-C1**, links **WT-O1 / WT-O3** | v2→v3 versioning is the trail; capture it |
| **Ask-the-Matrix zero-fabrication legal retrieval** | JusticeHub | legal-domain RAG that guarantees no hallucinated precedent and stays within an advice boundary | Weak-moderate (emerging) | extends **ACT-JH** | the planned citation-coverage tests |

## Honestly excluded (NOT R&D — per the eligibility gate)

GrantScope ETL / scraping / schema design and the "140 donor-contractors / 58x" finding (a SQL materialized view =
advocacy/journalism, not a novel mechanism); JusticeHub REST adapters, scraping/OCR, admin CRUD, surface copy,
consent display predicate + push-sync as standalone plumbing; EL multi-tenant org scoping, embed-token issuance,
RLS leak-closing, cron mechanics (known-solution); and **all storytelling content** (statutory arts exclusion —
claim the mechanism, never the stories). The open-sourcing and power-redistribution framing is mission, not R&D.

## CRITICAL eligibility flags

1. **TIMING (GrantScope autoresearch loop):** the `autoresearch-log.jsonl` timestamps are **2026-03-08** — *before
   A Curious Tractor Pty Ltd existed* (registered 24 Apr 2026). Under Path C, only Pty activities from 24 Apr 2026
   count for FY25-26. **That specific run is likely NOT claimable by the Pty.** The activity/method may continue —
   capture **fresh autoresearch runs inside the eligible window** to claim it. Verify all evidence dates against
   the Path-C window before any claim.
2. **External-facing test holds** for every claimed mechanism (operated by communities, lawyers, NGOs, the public
   over their own data) — so the internal-administration exclusion (TA 2017/5) does NOT bite these. Contrast ACT-IN.
3. **Isolate the experimental activity** — claim the OCAP consent-as-code *composition* (cultural-tier + elder-gate
   + revocation), the *assembler algebra*, the *autoresearch loop*, the *voice gate* — never the whole platform.
4. **Eligibility is Inferred** throughout — adviser sign-off required.

## Why it matters for Australia (the priority alignment)

- **National Science & Research Priority 3 — Elevating Aboriginal and Torres Strait Islander knowledge systems:** the
  EL sovereignty mechanisms + OCAP consent-as-code, mapped to **Closing the Gap Priority Reform 4** (shared access to
  data at a regional level) and Indigenous Data Sovereignty (Maiam nayri Wingara).
- **Priorities 2 + 5 (healthy communities; secure & resilient nation):** JusticeHub's Governed-Proof + ALMA give
  costed, consent-safe evidence for alternatives to custody — **Closing the Gap Target 11** (youth detention −30% by
  2031) — and touch Australian refugee policy (M70, offshore detention, third-country transfer).
- **Power redistribution as public infrastructure:** GrantScope open-sources funding-transparency data as a commons
  (free for communities, institutions pay). Not R&D itself, but the public-good frame that signposts grant
  co-funding (incl. the QBE Catalysing Impact $400K match).

## Evidence to capture next (to substantiate the strong claims)
- Governed-Proof assembler design-decision / algebra trail (richness-vs-consent-ceiling).
- ALMA 0.2→0.03 calibration run logs; PRISM v2→v3 iteration logs; Guardian threshold-tuning notes.
- Ask-the-Matrix citation-coverage / zero-fabrication test results.
- **Fresh GrantScope autoresearch runs inside the FY25-26 / FY26-27 eligible window** (the existing log pre-dates the Pty).
