# JusticeHub — Refugee & Justice-Evidence R&D Deep-Dive

> Read-only deep-dive (2026-05-31). Source repo: `/Users/benknight/Code/JusticeHub`.
> Purpose: deepen the R&D narrative on refugee-case / justice-evidence work, framed as
> **external-facing product R&D** — software used by justice/community orgs, lawyers, OHCHR
> officers, and the public — NOT internal business administration. The external-facing
> distinction matters for R&D Tax Incentive eligibility (a product used by third parties is
> clearly experimental development, not an internal admin tool).
>
> Eligibility lens applied honestly: an activity is a *core/supporting R&D activity* only if
> there is a genuine technical unknown, the outcome could not be known in advance by a
> competent professional from existing public knowledge, and the work proceeds by
> hypothesis → experiment → observation → new knowledge. Routine CRUD, config, copy,
> known-pattern integration, and "wire up a documented API" are explicitly excluded below.

---

## Context: what JusticeHub is (external product surfaces)

JusticeHub is a public web platform (Next.js) with these externally-used surfaces relevant here:

- **Justice Matrix** (`/justice-matrix`) — a "Global Strategic Litigation and Advocacy Clearing
  House" for refugee/asylum protection, with a second surface for Australian youth justice.
  Live verified state 2026-05-30: 354 cases, 67 campaigns, 48 sources, 8 published issues,
  48 human-verified cases. Used by lawyers, clinics, NGOs, academics, campaigners; the
  background paper proposes the OHCHR Regional Office for South-East Asia (Bangkok) as a
  regional host. → `docs/justice-matrix/user-guide-and-rationale.md`.
- **ALMA evidence layer** — ~595 youth-justice evidence studies + 1,115 interventions, with a
  continuous-learning extraction system. → `scripts/ALMA_LEARNING_SYSTEM.md`,
  `docs/DATA_GOVERNANCE_MASTER_PLAN.md`.
- **Governed-Proof federated layer** — cross-platform assembly of GrantScope (capital) +
  JusticeHub (evidence) + Empathy Ledger (community voice) into consent-gated "proof bundles"
  per place. → `src/lib/governed-proof/{contracts,service,place-assembler}.ts`.
- **Cross-platform syndication** — consent-gated story display + push-sync into Empathy
  Ledger. → `src/lib/supabase/empathy-ledger.ts`, `src/lib/empathy-ledger/push-sync.ts`.

These are all **third-party / public-facing**, not internal admin. That framing holds.

---

## COMPONENT 1 — Federated, consent-gated, cross-system "Governed-Proof" bundle assembler

**Files:** `src/lib/governed-proof/place-assembler.ts`, `contracts.ts`, `service.ts`;
`src/app/admin/governed-proof/*`; `src/app/for-funders/proof/[placeKey]/page.tsx`.

**What it does.** Assembles, for a single place (AU postcode), a four-layer "proof bundle"
drawing records from **three independently-governed Supabase systems** — GrantScope (`GS`,
capital/funding), JusticeHub (`JH`, evidence/interventions), Empathy Ledger (`EL`, community
voice/stories) — plus a `SHARED` lane. Each layer emits its own confidence
(capital/evidence/voice/governance); a derived lifecycle status
(raw→resolved→enriched→linked→validated) and promotion status
(draft→internal→partner→public→suppressed) gate what may ever surface publicly. The voice
layer is **consent-gated at the row level**: a story only contributes if it passes
`canDisplayOnJusticeHub` (public + privacy_level=public + elder-approval satisfied), and any
restricted story forces the whole bundle's `reviewStatus` to `pending` (human-in-loop).

**(a) Technical unknown / implicit hypothesis.**
Hypothesis: *that funding, intervention-evidence, and consent-governed lived-experience records
held in three separately-owned databases with incompatible schemas and divergent consent
regimes can be fused into a single, automatically-computed "proof of place" whose
publish-eligibility is provably bounded by the most-restrictive consent attached to any
constituent record — without a central data lake and without ever leaking a restricted record.*
The unknown is whether a deterministic confidence/lifecycle/promotion algebra can be defined
over heterogeneous, sovereignty-segmented sources such that the composite artefact's
governance state is correct by construction (not by manual review of every output).

**(b) Why a competent professional could not predict the outcome.**
Standard practice for cross-source aggregation is either (i) a central warehouse (which
collapses the data-sovereignty boundary OCAP/Indigenous data governance forbids) or (ii)
per-record manual clearance (which does not scale and is not a "system"). There is no
off-the-shelf pattern for a *federated* assembler where each source retains custody and the
composite's promotion ceiling is the minimum of its inputs' consent levels, computed live.
Whether the four-layer confidence average + `deriveLifecycleStatus` thresholds + the
"restricted ⇒ pending" propagation actually yield a bundle that is both *useful* (rich enough
for a funder brief) and *safe* (never over-promotes a restricted voice) is not knowable from
existing knowledge — it had to be built and observed against real EL consent data. The
tension between richness and safety is a genuine design-space exploration, not a lookup.

**(c) Australia relevance.**
Directly serves **OCAP / Indigenous Data Sovereignty** and **Closing the Gap Priority Reform
4** (shared access to data and information at a regional level, with community control).
Place bundles model funding + evidence + community voice for AU postcodes including remote/
SEIFA-disadvantaged communities, feeding funder-facing "proof of place" — relevant to youth
justice (CtG Target 11) and to demonstrating community-controlled spend.

**Eligibility:** STRONG candidate. Novel architecture, real uncertainty, hypothesis-driven.
Caveat: the per-source SQL *queries* and the admin CRUD around it are supporting/excluded;
the *governance algebra and federation design* is the core R&D.

---

## COMPONENT 2 — ALMA continuous-learning evidence-extraction system

**Files:** `scripts/ALMA_LEARNING_SYSTEM.md`, `scripts/alma-learning-system.mjs`,
`alma-scrape-with-learning.mjs`, `alma-extraction-tracker.mjs`; tables
`alma_extraction_history`, `alma_learning_patterns`, `alma_quality_metrics`,
`alma_human_feedback`.

**What it does.** A feedback loop that learns, per document type/structure, which extraction
strategy yields high-quality, *governance-aware* evidence (it learns to detect "community
authority" and "cultural-control" signals, not just facts), self-calibrates its confidence
against human-validated outcomes, and learns *when to escalate to a human*. Explicitly
constrained: it never learns to rank interventions, score communities, or make funding calls.

**(a) Technical unknown / implicit hypothesis.**
Hypothesis: *that an extraction system can be made to improve its own evidence-quality and
its own confidence calibration over time from human corrections, while remaining bounded so
it learns only document-structure/quality patterns and never learns to rank or optimise
people* — and that confidence-calibration error can be driven down (the doc cites 0.2 → 0.03)
by the loop alone. The "ethical containment" constraint (learn extraction, never learn
ranking) is itself the experimental variable: can a learning system be useful while
provably refusing a whole class of learnable objectives?

**(b) Why not predictable.**
Confidence calibration against a moving, human-judged ground truth over heterogeneous
government reports / RCTs / service directories is not a solved, documented recipe — whether
the calibration converges, and at what cost, is an empirical question answered by running it.
The novel part is binding the learner to detect *community authority / cultural-control*
evidence signals (a domain-specific, non-standard target) and demonstrating the
ranking-refusal holds under learning pressure. A competent ML engineer could not say in
advance whether the chosen signals + thresholds would calibrate or collapse.

**(c) Australia relevance.**
The evidence base is Australian youth-justice interventions (CtG **Target 11** — reduce the
rate of Aboriginal and Torres Strait Islander young people in detention) and "alternatives to
custody" / justice-reinvestment programs. The "community authority" learning target encodes
Indigenous-led evidence weighting. Phase-4 roadmap is explicit federated learning across
jurisdictions while protecting data sovereignty.

**Eligibility:** MODERATE-to-STRONG for the **learning/calibration loop and the
ethical-containment design**. EXCLUDE: the plain scraping, the deterministic OCR, and routine
table ingestion — those are known-solution. The R&D is the *self-calibration + bounded-
objective* experiment, and that needs a contemporaneous record of the calibration results to
substantiate (currently the .md asserts 0.2→0.03 but I did not see the run logs proving it —
mark as **needs evidence capture**).

---

## COMPONENT 3 — Cross-jurisdiction deterministic source adapters + comparative-law threading

**Files:** `src/lib/justice-matrix/{canlii,hudoc,curia,courtlistener,edal}-adapter.ts`,
`jurisdiction.ts`, `case-type.ts`, `scripts/scan-justice-matrix.ts`.

**What it does.** Five deterministic (no-LLM) adapters normalise heterogeneous legal sources
(CanLII REST, ECtHR HUDOC, CJEU/Curia, US CourtListener, EU EDAL) into one
`JusticeMatrixDiscoveryItem` schema, with domain signal-gating (e.g. `REFUGEE_SIGNAL` regex
filters general-court rows down to immigration/asylum matters) and cross-jurisdiction
"comparative-law threads" (third-country transfer links M70(AU) ↔ AAA/Rwanda(UK) ↔ N.S.(EU) ↔
M.S.S.(ECtHR) ↔ Ilias(ECtHR); high-seas pushbacks link Hirsi ↔ Sale).

**(a) Technical unknown / implicit hypothesis.**
Hypothesis: *that refugee-protection jurisprudence from five court systems with different
citation formats, languages, and metadata models can be normalised into one schema and
machine-threaded into strategically-meaningful comparative-law clusters reliably enough to be
useful to a strategic litigator.*

**(b) Why not predictable — PARTIAL.**
The *individual* adapters are largely **routine integration** — reading documented REST APIs
and mapping fields. By the eligibility gate, **that is NOT R&D** (known-solution dev), and the
narrative must not inflate it. The arguably-novel sliver is whether *deterministic* (no-LLM)
signal-gating + cross-jurisdiction threading can achieve precision/recall good enough to
replace LLM extraction for legal records — an empirical claim. But this is thin; treat as
**supporting at best, likely excluded** unless there is a documented experiment comparing
deterministic vs LLM extraction quality. **FALLBACK: unclear** that this clears the gate on
its own.

**(c) Australia relevance.**
Plaintiff M70/2011, #KidsOffNauru, #GameOver, offshore-detention/third-country-transfer threads
are core Australian refugee-policy material; the tool lets AU advocates see comparative wins.

**Eligibility:** MOSTLY EXCLUDE (routine API integration). Possible thin supporting-activity
claim only if a deterministic-vs-LLM quality experiment was actually run and recorded.

---

## COMPONENT 4 — "Ask the Matrix": grounded, citation-bounded retrieval over a mixed legal+evidence corpus

**Files:** `src/app/api/justice-matrix/ask/route.ts`,
`src/app/justice-matrix/ask/AskMatrixClient.tsx`, `src/lib/justice-matrix/embeddings.ts`,
`src/app/api/justice-matrix/search/route.ts`.

**What it does.** Plain-language question → retrieves cases/campaigns/evidence
(keyword + semantic/embedding modes) → forces every substantive claim to carry a bracket
citation `[C1]` to a retrieved record → hard boundary "research support, not legal advice; do
not invent cases/holdings/links." Surface gating prevents refugee and youth results bleeding
through shared category tags.

**(a) Technical unknown / implicit hypothesis.**
Hypothesis: *that a retrieval-grounded answer layer over a corpus mixing legal precedent,
advocacy campaigns, and consent-gated evidence can be constrained to never fabricate a
case/holding/link and to keep citation coverage high — while honouring a hard legal-advice
boundary and not leaking restricted evidence rows.* The novel constraint is the
**legal-advice safety boundary + zero-fabrication-of-precedent** in a domain where a
hallucinated case is a real-world harm.

**(b) Why not predictable — PARTIAL.**
RAG-with-citations is a known pattern, so the base mechanism is **not novel**. What is
genuinely uncertain is whether citation-coverage and zero-precedent-fabrication can be held to
an acceptable level *for legal records specifically* and whether the surface-gate + restricted-
row exclusion compose correctly with retrieval. The user-guide's own "next priorities" list
"stricter citation coverage tests" — i.e. the reliability is still an open, being-tested
question, which is the signature of experimental work. But absent those tests/metrics existing
yet, this is **emerging R&D, not yet substantiated**. FALLBACK: partially unclear.

**(c) Australia relevance.**
Lets AU youth-justice and refugee advocates query 354 cases + 595 evidence studies in plain
language and get cited, non-fabricated records — lowering the research barrier for under-
resourced AU community legal orgs.

**Eligibility:** WEAK-to-MODERATE. The *legal-domain zero-fabrication + advice-boundary +
restricted-row-safe retrieval*, IF tested with citation-coverage/hallucination metrics, is a
defensible supporting R&D activity. As built today it leans on a known RAG pattern — do not
overclaim. Strengthen by capturing the citation-coverage experiment results.

---

## COMPONENT 5 — Consent-gated cross-platform syndication (display + push-sync)

**Files:** `src/lib/supabase/empathy-ledger.ts` (`canDisplayOnJusticeHub`,
`getStoryConsentStatus`, cultural-warning gating), `src/lib/empathy-ledger/push-sync.ts`.

**What it does.** Enforces, at the application boundary, that EL stories only display on JH
when public + privacy=public + elder-approval-satisfied, surfaces cultural warnings, and
push-syncs JH people/orgs back into EL as syndication profiles (tenant-scoped).

**(a)/(b) Assessment.**
The display predicate (`canDisplayOnJusticeHub`) and the push-sync are **rule encoding +
routine API sync** — a known-solution data-governance implementation. By the gate, **this is
NOT R&D** on its own; the consent *rules* are policy, not a technical unknown, and the sync is
standard upsert plumbing. It becomes R&D-relevant only as a *component of* Component 1's
federated governance algebra (where composing many such consent gates correctly across three
systems is the actual unknown).

**(c) Australia relevance.** OCAP / Indigenous data sovereignty, elder-approval workflow.

**Eligibility:** EXCLUDE as standalone (honest call). Counts only inside Component 1's scope.

---

## Honest exclusions (NOT R&D — do not inflate)

- Individual REST-API adapters (CanLII/HUDOC/Curia/CourtListener/EDAL) — documented-API
  integration.
- Scraping, OCR, table ingestion — known-solution.
- Admin CRUD, review-queue UX, surface framing copy, the "Start here" rail, featured rows.
- The consent display predicate and push-sync as standalone — rule encoding + upsert plumbing.
- Security cleanup (removing committed keys), env config, route wiring.

## Strongest defensible R&D claims (ranked)

1. **Governed-Proof federated, consent-bounded bundle assembler** (Component 1) — clearest
   novel architecture + genuine richness-vs-safety uncertainty. Lead the narrative here.
2. **ALMA self-calibrating, ethically-bounded learning loop** (Component 2) — strong, but
   **capture the calibration-convergence evidence** (the 0.2→0.03 claim needs run logs).
3. **Ask-the-Matrix legal-domain zero-fabrication retrieval** (Component 4) — emerging;
   substantiate with the planned citation-coverage / hallucination tests before claiming.

## Evidence gaps for the R&D file (contemporaneous records to capture)

- ALMA confidence-calibration run logs proving convergence (Component 2).
- Ask-the-Matrix citation-coverage / precedent-hallucination test results (Component 4).
- A dated design-decision record for the Governed-Proof confidence/lifecycle/promotion algebra
  showing alternatives tried and rejected (Component 1) — this is the experiment trail.
- Any deterministic-vs-LLM extraction-quality comparison, if one was run (Component 3) — else
  drop Component 3 from the claim.
