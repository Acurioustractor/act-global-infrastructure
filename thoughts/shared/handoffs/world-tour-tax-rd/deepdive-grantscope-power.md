# GrantScope / CivicGraph — R&D Deep-Dive (Philanthropic Power, Funding Transparency, Open Public Good)

> Read-only deep-dive of `/Users/benknight/Code/grantscope` (separate repo). 2026-05-31.
> Goal: identify technically-novel/uncertain work suitable as EXTERNAL-facing product R&D, framed around philanthropic-sector power dynamics, funding-data transparency, and open-sourcing this as a public good. Honest eligibility gate applied: data aggregation / scraping / known-solution dashboards are marked NOT-R&D.

## What GrantScope/CivicGraph is (verified from README, MISSION.md, WHY.md, package.json)

A Next.js 15 platform (`apps/web`) over a Supabase entity graph that fuses 30+ Australian public datasets — AusTender contracts (672K), ACNC charities + 7yr financials (66K/370K), AEC political donations (312K), ATO tax transparency, ORIC Indigenous corps, Supply Nation / Social Traders, ABR registry, SEIFA/remoteness — into ~100K canonical entities linked by ABN with ~199K relationships. Three products: Procurement Intelligence, Allocation Intelligence, Governed Proof. ~48 pipeline scripts, ~76 API routes, 30+ analytical reports. `package.json` declares **`license: MIT`**, `description: "Open-source Australian funding transparency platform"`, keywords `transparency, open-data`; README says "Free for communities. Institutions pay so communities don't have to." So the open-source / public-good framing is real and load-bearing. (No `LICENSE` file present yet — MIT is declared in package.json only.)

**Author:** A Curious Tractor. **DB:** shared Supabase `tednluwflfhxyucgwigh` (pooler `aws-0-ap-southeast-2`).

---

## ELIGIBILITY VERDICT (honest)

The platform as a whole is **NOT R&D** — most of it is data ingestion, scraping, schema design, aggregation, and dashboard/report rendering. That is skilled engineering, but the outcome was knowable in advance (known-solution data integration). The flagship "140 donor-contractors / 58x return" finding (`reports/donor-contractors`) is journalism/analysis powered by a **materialized view** (`mv_gs_donor_contractors`) — a SQL aggregation, **NOT a novel technical mechanism**. That distinction matters: the *policy/advocacy* framing (power dynamics, redistribution) is the public-good mission, not the R&D. R&D eligibility lives only in the few components below where the *technical outcome was genuinely uncertain*.

---

## CANDIDATE 1 — Self-improving entity-resolution autoresearch loop  ✅ STRONGEST R&D

**Files:** `scripts/benchmark/autoresearch.mjs`, `scripts/benchmark/evaluate.mjs` (frozen harness — header literally says "THIS FILE SHOULD NEVER BE MODIFIED BY THE AUTORESEARCH LOOP"), `scripts/benchmark/tasks/<task>/{program.md,resolve.mjs}`, `scripts/benchmark/create-ground-truth.mjs`, `scripts/benchmark/data/results/autoresearch-log.jsonl`.

**(a) What it is + the implicit hypothesis.** An implementation of Karpathy's "autoresearch" pattern applied to cross-dataset Australian entity resolution: a **frozen evaluation harness + held-out ground-truth set** (justice-funding/donation records where a real ABN is present, used as labels) + a **mutable resolver** that an LLM (Claude) iteratively rewrites; each iteration is auto-evaluated on F1, then **git-committed if F1 improved or reverted if not**. The hypothesis: *an LLM-in-the-loop search over normalization/matching heuristics can beat hand-tuned entity resolution on noisy Australian name data (HTML entities, `PTY LTD` vs `PTY. LTD.`, `(NT)` vs `NT`, ATF/trustee suffixes, trading names) — and converge to a stable, defensible F1.*

**(b) Why the outcome wasn't predictable.** The iteration log (`autoresearch-log.jsonl`, 24 logged iterations across runs) is the contemporaneous evidence that this was genuine search, not a known build: the loop **mostly reverted** — `improved` only ~4 times, with many `reverted` and several `error` iterations, and one accepted change that the very next run showed *regressed* a sibling metric. F1 crawled 76.8% → 77.3% in the logged window; the broader project (MISSION.md) reports the full journey **76.9% → 94.1% F1** (precision 99.9%, recall 89.0%) only after an "evaluator fix + name normalization." You cannot know in advance which heuristic mutations survive a held-out eval — that's the definition of experimental. The reverts ARE the uncertainty.

**(c) Australia-relevance.** Entity resolution is the load-bearing step that makes *all* the power-dynamics transparency possible: you cannot say "this donor also holds contracts" until donor-name → ABN → contract-ABN is resolved across AEC/AusTender/ACNC/ORIC. Australian-specific hardness: ABN/ACN/ORIC-ICE identifier zoo, ATF/trust structures, Supply Nation cross-refs, state-name geo tokens. A reusable, **open** AU entity-resolution harness + ground-truth methodology is itself the public good — it lets others reproduce/audit the power map rather than trust a black box.

---

## CANDIDATE 2 — Cross-platform recipient/donor ABN resolution (justice ↔ graph; donations → ABN)  ⚠️ PARTIAL R&D

**Files:** `scripts/benchmark/tasks/recipient-entity-match/program.md`, `scripts/resolve-donation-abns-v2.mjs`, `scripts/dedup-entities.mjs`, `scripts/engine-entity-resolution.mjs`.

**(a) / implicit hypothesis.** Multi-phase matcher: exact normalized name → **in-process trigram similarity reimplementing pg_trgm** (threshold 0.7, with a length-ratio prefilter) → ABR MatchingNames API (score ≥ 80) as fallback. The cross-platform task (`recipient-entity-match`) tests whether JusticeHub recipient names resolve to the same canonical graph entities as procurement/donation sides. Hypothesis: *a cheap local trigram pass can recover most cross-platform matches without per-row API calls, at a precision good enough to assert power-network edges.*

**(b) Predictability.** Trigram fuzzy matching and survivor-selection dedup are **largely known solutions** — that part is engineering, not R&D. The genuinely uncertain slice is the *threshold/precision trade-off under the power-claim constraint*: a false-positive ABN edge produces a libellous "X donates AND contracts" claim, so the acceptable precision bar is unusually high and had to be discovered empirically (the autoresearch loop in Candidate 1 is exactly how it was discovered). On its own this file is **borderline**; it earns R&D status only *through* the harness in Candidate 1. Flag as PARTIAL.

**(c) Australia-relevance.** Same as Candidate 1 — this is the edge-construction layer of the transparency graph.

---

## CANDIDATE 3 — Funding-network ranking autoresearch (allocation/equity strategy search)  ⚠️ WEAKER R&D

**Files:** `scripts/funding-autoresearch/{autoresearch.mjs,evaluate.mjs,strategy.mjs,program.md,lib/signals.mjs}`, `build-benchmark-set.mjs`.

**(a) / hypothesis.** A second autoresearch loop, same frozen-harness/mutable-strategy shape, but the optimized artefact is a **grant/foundation/charity/place ranking strategy**. The evaluator is notable: alongside standard IR metrics (precision@10, recall@10, NDCG@10) it bakes in a **`justiceExposure` term** and `relationshipUtility`/`actability` — i.e. it explicitly rewards surfacing Indigenous / community-controlled / regional / high-SEIFA-disadvantage / zero-funding candidates. Hypothesis: *you can encode an equity/redistribution objective into a reproducible ranking benchmark and let an LLM search for a strategy that improves "who the next dollar should reach" without collapsing to popularity.*

**(b) Predictability.** The IR machinery is standard. The uncertain/novel part is **operationalizing "funding equity" as a scoreable objective** — whether a `justiceExposure`-weighted NDCG actually moves rankings toward underserved places, or just games the term, is not knowable a priori and needs the held-out scenarios to settle. Modest R&D; the harness exists but the iteration evidence here is thinner than Candidate 1.

**(c) Australia-relevance.** Directly the redistribution-of-power thesis: SEIFA/remoteness/LGA-scored place gaps (2,900 postcodes, 492 LGAs) turned into an *auditable, open* "where is the most underserved dollar" ranking. If open-sourced, funders/communities can contest the weighting rather than accept a vendor's.

---

## NOT R&D (explicitly excluded — be honest)

- **Donor-contractor flagship report** (`reports/donor-contractors`, `mv_gs_donor_contractors`) — SQL materialized-view aggregation + Next.js render. High public-interest value; zero technical uncertainty. Advocacy, not R&D.
- **All importers/scrapers/sync agents** (`import-*`, `scrape-*`, `sync-*`) — known-solution ETL.
- **30+ analytical reports, dossier pages, place pages, premium gating, knowledge upload** — application engineering.
- **`build-entity-graph.mjs`, geo/SEIFA backfills, ABR bulk extract** — data assembly.
- **LLM foundation-program discovery** (`discover-foundation-programs.mjs`) + 5-provider round-robin — scraping + structured extraction with failover; standard integration pattern, NOT R&D (no held-out uncertainty being resolved).

---

## Bottom line for the R&D / world-tour-tax framing

One clearly-eligible activity, one partial, one weak — all sharing the **same novel mechanism**: a *frozen-eval + ground-truth + LLM-mutates-the-program + commit-on-improvement* harness applied to (1) Australian cross-dataset entity resolution and (2) equity-weighted funding ranking. The contemporaneous record (`autoresearch-log.jsonl` with its reverts/errors, the 76.9%→94.1% F1 journey) is exactly the kind of evidence the R&DTI wants. The *power-dynamics / transparency / open-data* story is the public-good **mission and dissemination** layer — strong for grants and narrative, but it is NOT the R&D; keep it cleanly separated from the eligible technical activity so the claim doesn't inflate.

**Recommended next step (not done here):** if pursuing this, run `rd-capture` against Candidate 1 specifically, citing `scripts/benchmark/` + the iteration log as the contemporaneous artefact. Confirm which FY the loop actually ran (log timestamps are 2026-03-08; verify against the FY25-26 Path-C window before claiming).

**Unclear / not verified:** exact final F1 provenance (94.1% is asserted in MISSION.md, not re-run here); whether any `LICENSE` file will accompany the MIT declaration; whether the funding-ranking loop was ever run to convergence (its results dir not inspected in depth).
