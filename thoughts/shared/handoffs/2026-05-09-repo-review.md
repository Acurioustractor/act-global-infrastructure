---
title: Repo review — pre-flight inventory
date: 2026-05-09
status: read-only snapshot
plan: ~/.claude/plans/plan-to-reivw-this-dynamic-tulip.md
---

# Repo review — pre-flight inventory (2026-05-09)

Read-only snapshot to scaffold the website-led refinement plan. Codex-branch-dependent sections (R&D pack score, synthesize/grade infra, voice grader fixtures) are deferred until PR #52 lands.

## Branch state

- This worktree: `claude/dazzling-euler-f8763e` @ `fae6ac5` (1 ahead of `origin/main`)
- `origin/codex/recover-finance-money-alignment` @ `f783b02` (88 ahead of main, 0 behind) — money cockpit, R&D pack, voice grader, synthesize-funder-alignment, synthesize-entity-migration-truth-state, alignment-loop self-grade
- `origin/alignment-loop-2026-05-08` @ `e396a5a` (2 ahead of main) — weekly alignment-loop output
- Open PR #52: codex → main (awaiting your review/merge call)
- Sister worktrees active: `claude/pedantic-bose-a37add`, `claude/unruffled-goldberg-49a95f` (both at `fae6ac5`) — multi-session race risk to watch

## Plans triage findings (115 files)

**Recency clusters:**
- 2026-04-25 (4 files, newest): `act-ceo-cockpit`, `act-brain-phase-2a-multi-repo-q2`, `act-brain-expansion`, `act-alignment-loop`
- 2026-04-20 to 2026-04-24 (17 files): the entity migration / Minderoo / Goods cluster — recent live work
- 2026-03-27 to 2026-04-13 (~20 files): mid-tier — likely needs status check
- 2026-02-09 to 2026-02-28 (~30 files, oldest): grant drafts (mannifera, ila, real-innovation-fund), command-center-v2, INDEX.md, learning-system, layered-memory-system, ux-overhaul-single-dashboard — high archive candidates

**Overlap signal (visible from filenames):**
- 4 finance plans: `finance-flow-dashboard-plan`, `finance-intelligence-system`, `financial-cockpit-plan`, `financial-operations-system-design`, `act-finance-engine-review`
- 4 spending intelligence: `spending-intelligence-system`, `spending-intelligence-expert-review`, `spending-intelligence-v4-full-automation`, plus v2/v3 in handoffs
- 2 unified financial overview: `unified-financial-overview`, `unified-financial-overview-v2`
- 3 alignment plans: `act-alignment-loop`, `ecosystem-alignment-launch`, `ecosystem-deep-alignment-plan`
- 4 Notion plans: `notion-agent-design`, `notion-agent-readiness-audit`, `notion-agent-trial-guide`, `notion-agents-alignment-strategy`, `notion-database-audit-and-agent-plan`, `notion-workers-experiment-plan`, `notion-workers-scenarios-flows`

**Conservative archive estimate:** ~50 plans of 115 are clear archive candidates (Feb-March drafts shipped/dead). Another ~25 are "consolidate into one" (the finance/spending/notion clusters). Target ≤25 active is achievable.

## Projects state

**Wiki/projects:** 90 .md files total (30 top-level + 60 in 7 subdirs: act-studio, smart-recovery, empathy-ledger, justicehub, act-farm, the-harvest, picc)

**Frontmatter coverage (top-level):** 7 of 30 have frontmatter. **23 missing** — full list:
```
act-monthly-dinners, act-public-voice, barkly-backbone, bg-fit, campfire,
civicgraph, community-capital, confit-pathways, custodian-economy, dad-lab-25,
deadlylabs, designing-for-obsolescence, diagrama, feel-good-project,
fishers-oysters, global-laundry-alliance, junes-patch, marriage-celebrant,
mounty-yarns, oonchiumpa, place-based-policy-lab, quandamooka-justice-strategy,
resoleution
```
Note: `custodian-economy.md` rename to `custodian-first-economy.md` is on codex branch.

**config/project-codes.json (72 projects):**
- 7 ecosystem (the targets for Session 2 website rendering): ACT-JH JusticeHub, ACT-GD Goods, ACT-EL Empathy Ledger, ACT-CORE Studio, ACT-FM Farm, ACT-HV Harvest, ACT-IN Infrastructure
- 12 studio
- 20 satellite
- **33 missing tier** (data hygiene gap): ACT-DG Diagrama, ACT-ER PICC Elders Room, ACT-SS Storm Stories, ACT-MR MingaMinga Rangers, ACT-MN Maningrida, ACT-FN First Nations Youth Advocacy, ACT-QF QFCC EL, ACT-DD Double Disadvantage, ACT-BM Bimberi, ACT-AI AIME, ACT-TN TOMNET, ACT-10 10x10 Retreat, ACT-SH The Shed, ACT-AS Art for Social Change, ACT-WJ Wilya Janta, ACT-YC YAC Story and Action, ACT-TW Travelling Women's Car, ACT-HS Project Her-Self, ACT-DH Deadly Homes and Gardens, ACT-MM MMEIC Justice, ACT-MU Murrup + ACT, ACT-BR ACT Bali Retreat, ACT-CC ACT Conservation Collective, ACT-FP Fairfax PLACE Tech, ACT-FA Festival Activations, ACT-SF SAF Foundation, ACT-SX SXSW 2025, ACT-WE Westpac Summit 2025, ACT-RP RPPP Stream Two, ACT-OE Olive Express, ACT-OS Orange Sky EL, ACT-GCC Global Community Connections, ACT-EFI Economic Freedom Initiative

## Brand state

`.claude/skills/act-brand-alignment/references/` — 5 files, all current:
- `brand-core.md` (6.4K)
- `writing-voice.md` (8.0K) — Curtis method + AI-tells blocklist
- `projects-ecosystem.md` (7.2K)
- `land-practice.md` (1.0K)
- `content-structure.md` (1.0K) — note: small, may need expansion for website-IA work

Brain source-of-truth files (wiki/decisions/): all present (act-core-facts, act-brand-alignment-map, ceo-operating-model, roadmap-2026, strategic-decisions-log, continuous-pipeline, operational-reference, README). Latest dated decisions go to 2026-04-25 (`2026-04-five-year-plan.md`, `2026-04-the-work.md`).

## Finance/cockpit state

- `wiki/finance/`: 2 files only (`five-year-cashflow-model.md`, `rdti-claim-strategy.md`) — confirmed gap
- `apps/command-center/src/app/finance/` exists; `/finance/overview` and `/finance/money-alignment` routes referenced in PR #52 body but live code is on codex branch
- **DEFERRED until merge:** R&D pack score, synthesize-* inventory, voice grader fixture pass-rate, Aleisha writeoff status, Standard Ledger combined-ask state

## Day-to-day surface

- `ecosystem.config.cjs`: **78 PM2 entries** — likely heavy with stale entries (memory notes phantom `collections-autopilot` was removed on codex)
- 2 scheduled remote agents per `wiki/decisions/README.md`: Daily Cockpit (07:00 Brisbane) and Weekly Alignment Loop (Friday 08:00 Brisbane)
- 3 open daily-cockpit PRs noted: #50 Alignment Loop 2026-05-08, #49 Soul stack cockpit 2026-04-26, #48 stale failed cockpit 2026-04-25 — #48 is a candidate to close

## Top wedges (in priority order, validated against the plan)

1. **Project frontmatter normalisation** — 23 of 30 top-level wiki/projects/*.md missing frontmatter. Without this, the website (Session 2) can't render uniformly. **This is the genuine blocker.**
2. **Tier completion in `config/project-codes.json`** — 33 projects without `tier`. Quick fix; needed before lint can be enforced.
3. **Plans archive sweep** — clear archive candidates (Feb-March cluster) move first; merge clusters second; status frontmatter on remainder.
4. **Wiki/finance buildout** — only 2 files vs major operational surface; the brain doesn't know the money.
5. **Website Phase 1 unblock** — depends on wedges 1-2; existing plan (`act-living-website-build-reset.md`) ready to execute.

## What's deferred until PR #52 merges

- R&D pack inventory + score (lives in `thoughts/shared/rd-pack-fy26/` on codex)
- synthesize/grade script inventory + wiring confirmation
- Voice grader fixture pass-rate verification
- Aleisha writeoff trigger
- Money cockpit live-data verification

## Next actions (await your call)

- Confirm tier table + auto-mode pre-flight rules per your message
- Decide PR #52 disposition (close / leave for review / merge)
- Resume Session 1 (project frontmatter normalisation) once branch state settled
