---
project: ACT-FY26-RD-PACK
fy: FY26 (1 Jul 2025 – 30 Jun 2026)
entity: A Curious Tractor Pty Ltd (ACN 697 347 676)
purpose: Chronological contemporaneous-evidence timeline proving FY26 R&D activity, assembled for Standard Ledger (R&D consultant pack).
built: 2026-05-31
built_by: read-only sweep agent (no fabrication — every date/commit traced to git or a dated file)
source_of_truth: thoughts/shared/rd-pack-fy26/audit-trail.md (canonical commit ledger) + per-project registers
---

# FY26 R&D history — contemporaneous-evidence timeline

> Read-only sweep. Each row cites where the contemporaneous record lives (commit hash from
> `Acurioustractor/act-global-infrastructure`, or a dated file path). The canonical commit ledger is
> `thoughts/shared/rd-pack-fy26/audit-trail.md`; this file extends it with (a) the decision/governance
> timeline and (b) post-2026-05-07 activity through 31 May, which the audit-trail does not yet cover.
> **No claim is restated as fact here that the underlying records don't support.** Where proof is thin
> it is flagged in §"Strong vs thin/missing".

## 0. The spine — entity & decision timeline (governance proof)

| Date | Decision / event | Contemporaneous record |
|------|------------------|------------------------|
| 2026-04-15 | Money Framework decision log — founder R&D salary allocation basis (Ben 95% × $250K; Nic 40% × $200K) | `wiki/finance/money-framework-decision-log-2026-04-15.md` (symlinked into pack) |
| 2026-04-24 | A Curious Tractor Pty Ltd registered (ACN 697 347 676); Knight + Marchesi family trusts 50/50 | MEMORY.md `project_act_entity_structure.md`; ASIC registration |
| 2026-04-27 | **R&DTI Path C locked** — FY24-25 forfeited (sole-trader period ineligible); 30 Apr 2026 deadline does NOT apply; FY25-26 first eligible year via the Pty Ltd; lodge Jul 2026–30 Apr 2027 | Decision logged in MEMORY `project_rd_tax_incentive.md`; plan archived → `thoughts/shared/plans/_archive/2026-05/rd-tax-incentive-fy26-package.md` + `…-comprehensive-report.md` |
| 2026-05-07 | Four per-project R&D activity registers collated + audit-trail written (pre-lodgement, satisfies contemporaneity test) | `thoughts/shared/rd-pack-fy26/audit-trail.md`; registers under `wiki/projects/*/rd-activity-register.md` |
| 2026-05-07 | R&D evidence rubric v1.0 calibrated 6/6; pack grader wired into weekly cron | commits `5bf5b6c`, `d205c61` |
| 2026-05-17 | 30-Jun alignment — Farm/Harvest/Goods charity scoping + R&D founder stakes + quarterly R&D checklist cron | commits `d175736`, `6cc7e2a`; plans `2026-05-17-standard-ledger-scope-alignment.md`, `2026-05-17-farm-harvest-goods-charity-alignment.md` |
| 2026-05-31 | Overseas Finding / R&D Advance draft built (FY26-27 planned overseas activities) | `thoughts/shared/rd-pack-fy26/world-tour-overseas-finding-draft.md` |

Pack header (`thoughts/shared/rd-pack-fy26/README.md`): preliminary claim **$354,047** across four registers; Money-Framework realistic refund range **$180–250K** at the 43.5% refundable offset. Targets diverge by design (registers cover ~58% of framework-eligible spend).

## 1. ACT-EL — Empathy Ledger (lead: Ben Knight · claim $79,750)

**Hypothesis:** OCAP-respecting consent capture + multi-tenant story ledger across org boundaries.

| Date | Activity | Record |
|------|----------|--------|
| 2025-12-30 | EL path-reference rationalisation (precursor) | `74b0f3f` |
| 2026-02-04 | Storyteller scripts updated for EL v2 schema | `ccb7bfb` (ACT-EL-S1) |
| 2026-02-27 | World-tour partner opportunities in EL pipeline | `bcc05bd` (ACT-EL-S1) |
| 2026-04-18 | EL v2 → wiki living-library pipeline + OCAP governance (**core hypothesis**) | `e3a0728` (ACT-EL-S4) |
| 2026-04-20 | Consent-in-action dashboard; live EL v2 data replaces placeholders; gallery → 3,018-item multi-tenant pool | `4fff285`, `4856e13`, `c880e70`, `fc38b2a` (S5/S6, multi-tenancy core) |
| 2026-05-25 | EL v2 build — all four §7.2 items shipped (FY27 launch plan) | `thoughts/shared/handoffs/2026-05-25-empathy-ledger-build.md` |
| FY26-27 (planned) | PRISM v2.0 extraction, OCAP consent-as-code, guardian voice gate, offline-first revocation | `world-tour-overseas-finding-draft.md` C1–C4 |

Provenance sidecar: `wiki/projects/empathy-ledger/rd-activity-register.md.provenance.md` (dated 2026-05-07).

## 2. ACT-CG — CivicGraph (lead: Ben Knight · claim $61,500)

**Hypothesis:** cross-source organisational entity resolution from polluted multi-source inputs.

| Date | Activity | Record |
|------|----------|--------|
| 2026-02-13 | Notion bidirectional sync + entity resolution + analysis scripts (**resolver origin**) | `3a16982` |
| 2026-04-20 | Three-tier contact-enrichment workflow; ACNC private-endpoint discovery; 660 emails + 752 phones; gs_entities 3-pass DQ (8,826→4,729 rows) | `c910fad`, `29d48be`, `cbc67fe`, `f8d5f0c` (S1–S4 + core outcome) |
| 2026-05-25 | CivicGraph Atlas September-launch build (repo `grantscope`) | `thoughts/shared/handoffs/2026-05-25-civicgraph-build.md` |
| FY26-27 (planned) | Multinational corpus RLS leak test | `world-tour-overseas-finding-draft.md` C5 |

Provenance sidecar: `wiki/projects/civicgraph/rd-activity-register.md.provenance.md`.

## 3. ACT-GD — Goods on Country (lead: Nic Marchesi · claim $188,250 — largest)

**Hypothesis:** buyer-supplier matching + demand-side procurement infrastructure.

| Date | Activity | Record |
|------|----------|--------|
| 2026-02-06 | Goods dashboard — org display, inline edit, bidirectional GHL sync | `36c23b7` (ACT-GD-S4) |
| 2026-04-24 | A1/A2 procurement-analyst agent stubs; CRM kanban + Xero↔GHL reconciler; dedup infrastructure (7-FK merge); 4 agents on PM2 schedules | `5610fe3`, `0db21ce`, `b6ca767`, `52c9f8b`, `e85cca7`, `bc81ff3`, `cea9184` (S2–S4) |
| 2026-05-07 | Pipeline dedup + weighted-pipeline correctness (measurement infra) | `119f479` (ACT-GD-S5) |
| 2026-05-27→28 | 3-pipeline operating model + unit-ledger; v3 cost model (20kg HDPE/bed locked, Defy-invoice-derived) | `45a2dfc`, `8b3ea40`, `e412a6f`; handoffs `2026-05-28-goods-cost-model-and-dashboard-session.md` |

Provenance sidecar: `wiki/projects/goods/rd-activity-register.md.provenance.md`.

## 4. ACT-JH — JusticeHub (lead: Ben Knight · claim $24,547)

**Hypothesis:** federated procurement-code mapping across service catalogue with consent boundary.

| Date | Activity | Record |
|------|----------|--------|
| 2026-04-21→29 | Consent-boundary EL v2 integration; procurement-code mapping schema; federated read-path; IPP/justice-reinvestment harvester | `6329d53`, `6eb2c93`, `8cb8345`, `1da8f83` (cross-EL commits in this repo) |
| 2026-05-07 | JH R&D activity register collated | `b592bc4` |
| 2026-05-25 | JusticeHub build (repo `/Users/benknight/Code/JusticeHub`) | `thoughts/shared/handoffs/2026-05-25-justicehub-build.md` |
| FY26 | **601 commits** in the separate JusticeHub repo | reproduce: `git log --since=2025-07-01 --until=2026-06-30 --oneline | wc -l` (run in JusticeHub repo) |
| FY26-27 (planned) | Consent-gated pgvector search at RLS layer; ALMA multi-source ingestion | `world-tour-overseas-finding-draft.md` C5–C7 |

Provenance sidecar: `wiki/projects/justicehub/rd-activity-register.md.provenance.md`.

## 5. Cross-project R&D infrastructure (supports all four registers)

| Date | Activity | Record |
|------|----------|--------|
| 2026-02-13 | R&D expense tracking + tagging coverage stats | `f9101cc` |
| 2026-02-19 | R&D tracking dashboard | `cb42749` |
| 2026-03-20→30 | Tagger + reconciliation checklist; evidence-collection script; FY26 R&D package + receipt pipeline | `543bd34`, `e3754f5`, `8e8aaa9` |
| 2026-04-09 | BAS-cycle R&D tagger + weekly cron | `b717fff` |
| 2026-05-07 | R&D evidence rubric v1.0 + grader wired to weekly cron | `5bf5b6c`, `d205c61` |
| 2026-05-09 | FY26 R&D pack rendered as single-file HTML | `f5dd6a8` (`index.html` in pack) |
| 2026-05-16→23 | Pre-publish Dext AI grader (every receipt graded before Xero); grader determinism (temp=0) | `e7ea801`, `44023ee`, `4f7f12e` |
| 2026-05-26→27 | One money ledger + PostgREST 1000-cap pagination fix; schema-contract "honest by construction" test | `775cff7`, `81ffc5b`, `6ddbb34`, `31fb174` |
| 2026-05-29→30 | Xero Project-Tracking as project_code source (Phase 2/3); close-the-books cron; anomaly/dup watch | `d4987be`, `c10cbaa`, `03d4978`, `a682653` |

Receipt-coverage attestation (gating item, DB-attested 2026-05-07): ACT-GD bills 99.5%, ACT-IN 98.5%, ACT-EL 100% by value — `thoughts/shared/rd-pack-fy26/receipt-coverage-attestation.md`.

---

## Strong vs thin/missing (honest assessment for Standard Ledger)

### STRONG proof
- **Commit-anchored technical activity.** Every core/supporting activity ties to a real, timestamped, immutable git commit. Git timestamps are contemporaneous by construction. The audit-trail (`audit-trail.md`) is reproducible from a fresh clone with a documented grep command.
- **Dated decision spine.** Path C (2026-04-27), Money Framework allocation (2026-04-15), entity registration (2026-04-24) all have dated records. The contemporaneity test (records "at or near the time") is met for code; registers written 2026-05-07, ~2–11 months pre-lodgement.
- **Receipt coverage.** DB-attested 98.5–100% by value across the three main project codes — strong expenditure substantiation.
- **Honest classification.** Audit-trail explicitly separates CLAIMED (s355-25 core / s355-30 supporting) from NOT-CLAIMED context (Minderoo pitch, CEO plans, naming renames) — pre-empts AusIndustry rule 1.8 scrutiny.

### THIN / MISSING (gating items before lodgement)
- **AusIndustry registration not submitted** — hard blocker (rule 1.2). Owner: Standard Ledger + Ben.
- **Supporting:core dollar split unverified** — all supporting activities "subsumed in core" personnel; defensible but flagged (rubric 3.2). No separate expenditure assigned to supporting.
- **JusticeHub 601-commit count is asserted, not enclosed** — lives in a separate repo not in this git history. The cross-EL commits (5) are in-repo; the 601 must be reproduced from the JH repo. The 100-row procurement-code gold set (rule 2.3) is still to be hand-labelled.
- **Nic's $200K salary base is a "retrospective director-salary characterisation"** — fair-market figure to be set by Standard Ledger at lodgement; not yet an arms-length number.
- **ACT-IN (~42% of framework-eligible spend) has no discrete register** — agent system, ALMA, governed proof, platform infra. CivicGraph covers only $47.5K of the $142.5K ACT-IN founder allocation. This is the biggest coverage gap between the $354K pack total and the $180–250K framework refund estimate.
- **ACT-OO (Oonchiumpa) deliberately deferred** — no claim until technical components + OCAP boundaries confirmed with Kristy Bloomfield + Tanya Turner. Documented as a structural gap, not a claim.
- **Some "actual outcome" rows are interim** — gold sets, conversion measurements, audit closeouts still in progress (rubric 2.4).
- **Overseas Finding (FY26-27) is a DRAFT, not lodged** — `world-tour-overseas-finding-draft.md` (built 2026-05-31). Condition 3(c) "population not in Australia" is the main eligibility hook; adviser must confirm before any overseas spend is claimed. Out of FY26 scope (it's FY26-27).

### Source-of-truth pointers for the consultant
- Canonical commit ledger: `thoughts/shared/rd-pack-fy26/audit-trail.md`
- Pack executive summary + gating list: `thoughts/shared/rd-pack-fy26/README.md`
- Per-project registers + provenance: `wiki/projects/{empathy-ledger,civicgraph,goods,justicehub}/rd-activity-register.md(.provenance.md)`
- Salary allocations: `thoughts/shared/rd-pack-fy26/salary-allocations.csv`; `wiki/finance/money-framework-decision-log-2026-04-15.md`
- Receipt attestation: `thoughts/shared/rd-pack-fy26/receipt-coverage-attestation.md`
