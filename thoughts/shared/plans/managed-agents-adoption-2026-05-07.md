# Plan: Claude Managed Agents Adoption — Finance + Services Sweep

> Slug: `managed-agents-adoption-2026-05-07`
> Created: 2026-05-07
> Status: draft (awaiting approval)
> Owner: Ben Knight
> Source: https://claude.com/blog/new-in-claude-managed-agents

## Objective

Audit ACT's existing automation, finance, and services stack against the May 2026 Claude Managed Agents launch (Outcomes rubrics, multiagent orchestration, Dreaming, webhooks). Propose a phased sweep that adopts the new primitives where they reduce real risk (R&D evidence quality, BAS receipt coverage, voice drift, OCAP integrity) without introducing lock-in or breaking the cron stack already in production.

This is a **plan**, not a sweep. No code moves until you approve a phase.

## What we have today (verified)

### Scripts and infrastructure
- **418 scripts** under `scripts/*.mjs` — verified via `ls scripts/*.mjs | wc -l`.
- **40+ shared libraries** under `scripts/lib/` including `finance/`, `receipt-*`, `cultural-guard.mjs`, `memory-lifecycle.mjs`, `episodic-memory.mjs`, `procedural-memory.mjs`, `agent-learning.mjs`, `knowledge-aligner.mjs`. Memory primitives already exist locally.
- **20 finance pages** under `apps/command-center/src/app/finance/` (reconciliation, money-alignment, board, projects, self-reliance, tagger, accountant, review, etc.).
- **4 existing "agent-*" cron jobs**: `agent-xero-ghl-reconciler`, `agent-invoice-drift-detector`, `agent-procurement-analyst`, `agent-funder-cadence`. The vocabulary of "agent" is already in the codebase.

### Cron stack (verified from `ecosystem.config.cjs`)
~40 PM2-managed jobs. Headline pattern: a **14-step Monday-morning money chain** runs sequentially in 5–15 min increments:

```
08:00 weekly-reconciliation        (runs report + Telegram)
08:15 money-framework-sync         (Notion)
08:30 opportunities-db-sync        (Notion)
08:30 agent-invoice-drift-detector
08:45 pile-pages-sync              (Notion)
08:50 cash-forecast-sync           (Notion)
08:55 kpis-sync                    (Notion)
09:00 budget-actual-sync           (Notion)
09:05 cash-scenarios-sync          (Notion)
09:10 dashboard-hub-sync           (Notion)
09:15 money-metrics-snapshot       (Notion)
09:20 planning-rhythm-sync         (Notion)
09:25 entity-hub-sync              (Notion)
```

This chain is the single largest multiagent fan-out target. The 5–15 min spacing looks defensive against Notion API contention, not a hard dependency graph.

### Skills (read this turn)
- `bas-cycle` — already has a learning loop (`bas-retrospective.mjs`), a 6-path receipt-coverage classifier, and per-vendor playbooks. Rubric-shaped but not graded by a separate model.
- `find-receipt` — already has explicit relevance-scoring weights (vendor 40, amount 25, date 20, keywords 15). A rubric in disguise.
- `act-brand-alignment` — has explicit DO/DON'T voice rules with named "AI tells" to reject. Natural fit for an Outcomes voice grader.

### Rules + memory
- `~/.claude/rules/opus-4-7-prompting.md` — defines the 4-part agent contract (budget, stop, fallback, scoped files).
- `~/.claude/projects/.../memory/MEMORY.md` — holds critical facts (entity structure, R&DTI Path C, OCAP, names). Already curated by hand; Dreaming-shaped.

## What Managed Agents adds

| Feature | Status | What it gives us |
|---------|--------|------------------|
| **Outcomes** (rubric grading) | Public beta | Independent grader checks output against a rubric, agent self-corrects. +8–10pt task-success lift on docx/pptx in Anthropic's tests. |
| **Multiagent orchestration** | Public beta | Lead agent fans out to specialist subagents in parallel, shared filesystem, persistent event memory. |
| **Dreaming** | Research preview (request access) | Scheduled review of agent sessions + memory, extracts patterns, restructures memory. |
| **Webhooks** | GA | Agent-task-complete notifications. |

## Decision matrix — where each feature fits ACT

### Outcomes (rubric grading) — 4 candidates

| Workflow | Rubric predicates (sample) | Why now |
|----------|----------------------------|---------|
| **R&D evidence pack (FY25-26)** | Every dollar has provenance source · `xero_invoices.type` populated · BAS-excluded items flagged · activity links to registered core/supporting · no fabricated dates | Lodgement Jul 2026 – 30 Apr 2027. 43.5% refund hinges on audit-grade evidence. |
| **BAS pack** | All 6 coverage paths classified · genuine-missing list ≤ threshold · no `xero_transactions` rows missing receipts where receipt exists in pool | Q3-FY26 due 28 Apr (overdue), Q4-FY26 imminent. |
| **ACT public-facing copy** | Curtis method (named room/body/abstract noun/stop) · zero AI tells (delve, crucial, pivotal, tapestry, em-dashes, "not just X but Y") · ALMA spelled out · names verified against wiki | Goods → Minderoo pitch mid-May; then standing rule for any pitch/grant/web. |
| **OCAP-respecting story drafts** | Every name spelled per canonical wiki · place names verified (Mparntwe, Oonchiumpa) · consent path declared · no quotes added beyond verbal record | Wiki story sync (Oonchiumpa, BG Fit, Mounty Yarns, PICC) is live. Caught name fabrication before; rubric makes it systematic. |

### Multiagent orchestration — 3 candidates ranked by impact

**1. Monday-morning money chain (highest impact)**
- Lead: `money-orchestrator` reads Xero/GHL deltas, prepares input bundle.
- Specialists in parallel: framework-sync, opportunities, piles, forecast, kpis, budget-actual, scenarios, metrics, planning-rhythm, entity-hub.
- Sequential after fan-out: dashboard-hub-sync (consumer of all upstream pages).
- Compresses 8:00–9:25 chain to ~8:00–8:15 wall-clock; webhook to Telegram on completion.
- **Constraint to encode in lead prompt:** Notion API rate limit, retry-on-409.

**2. Receipt hunt (BAS prep)**
- Lead: `bas-orchestrator` reads quarter delta, builds work list.
- Specialists: gmail-deep-search, xero-files-library-scan, dext-OCR-via-Gemini, pool-matcher, bill-attachment-copier.
- Shared filesystem: `/tmp/bas-Q{n}/` with structured JSON per candidate.
- Lead synthesises 6-path coverage report at end; only the genuine-missing list goes to a human.

**3. Grant triage (CivicGraph + GrantScope)**
- Lead: `grant-orchestrator` reads new grants since last run.
- Specialists by domain: federal, philanthropic, corporate, Indigenous-specific, place-based.
- Each specialist scores against ACT-fit rubric (rubric reuse from Outcomes work).
- Lead ranks + writes to GrantScope Notion DB.

### Dreaming — 2 candidates

**1. Wiki + OCAP integrity**
- Source: wiki story-sync agent sessions + `MEMORY.md` names section.
- Job: surface recurring name/place errors, restructure canonical name list, flag drift.
- This replaces the current manual maintenance of the Naming section in MEMORY.md.

**2. BAS quarterly retrospective replacement**
- Today: `bas-retrospective.mjs` writes patterns to `references/quarterly-learnings.md`.
- Migrate: Dreaming reads bas-cycle agent sessions, curates vendor patterns into per-vendor playbooks.
- Removes hand-coding.

### Webhooks — universal
Every long-running agent job webhooks back into Telegram bot (already grammY) or Slack (if connected). Replaces ad-hoc completion notification scripts.

## Phased rollout

### Phase 0 — Smallest viable test (½ day, fully reversible)
**Goal:** prove Outcomes rubric grading lifts artefact quality on something real before committing.

1. Write rubric file: `thoughts/shared/rubrics/act-voice-curtis.md` — encode the existing act-brand-alignment DO/DON'T as testable predicates.
2. Pick the Goods → Minderoo pitch draft already in tree (`apps/command-center/public/wiki/empathy-ledger/index.md` and adjacent goods docs are voice-loaded — use one as input).
3. Run Managed Agent with the rubric; record before/after.
4. Decision gate: did the grader catch real AI tells we missed? If yes → Phase 1. If no → tune rubric or abandon.

**Success criterion:** grader catches at least 3 voice issues in retrospectively-graded historical drafts that human review missed.

### Phase 1 — Two production rubrics (1–2 days)
1. **Voice grader** rolled into `act-brand-alignment` skill — auto-grade any output flagged as public-facing.
2. **R&D evidence rubric** wired into existing `weekly-reconciliation.mjs` post-step — fail-loud if evidence quality drops.

**Success criterion:** weekly-reconciliation Telegram message includes a rubric score; one BAS lodgement runs through it before Q4-FY26 due date.

### Phase 2 — One multiagent fan-out (3–5 days)
Pick the receipt-hunt orchestrator (smaller blast radius than the money chain). Build lead + 5 specialists. Run parallel-shadow against current sequential `bas-completeness.mjs` for one quarter; compare coverage.

**Success criterion:** parallel run finds ≥ same coverage as sequential, runtime cut by ≥ 50%, no false matches that bypass the 6-path classifier.

### Phase 3 — Money chain orchestration (1 week)
Once receipt hunt is stable, port the Monday-morning chain. This is the high-value, higher-risk one — touches Notion writes that the dashboard reads.

**Success criterion:** dashboard-hub-sync output identical (diff-clean) for 4 consecutive weeks vs the legacy chain running in parallel; only then retire the legacy chain.

### ~~Phase 4 — Dreaming on wiki + OCAP~~ DEFERRED
Blocked by US-only residency for memory + Dreams artefacts. Revisit when Anthropic announces AU region. In the interim, continue hand-curating MEMORY.md and use `bas-retrospective.mjs` for finance pattern capture (which can stay local).

### Phase 4 (replacement) — Dreaming on finance-only memory
Once AU residency or finance-scoped opt-in arrives, point Dreaming at:
- BAS retrospective patterns (vendor playbooks, edge cases by quarter)
- R&D evidence checklist drift (what got flagged, what passed audit)
- Grant-fit patterns from the Phase 2 triage orchestrator
**Not** at: stories, consent records, names, place names, contact records.

## Test + sweep methodology

For every phase:

1. **Shadow before swap.** New orchestration runs alongside legacy for ≥ 2 cycles. Diff outputs. Don't retire legacy until diffs are clean.
2. **Provenance sidecars.** Each rubric/orchestrator emits `<artefact>.provenance.md` (template: `thoughts/shared/templates/provenance-template.md`) — sources, what's verified vs inferred, gaps.
3. **Civicscope guard.** No phase touches shared-DB row counts without `scripts/civicscope-smoketest.mjs` pre + post.
4. **Org-scoping.** All shared-filesystem writes carry `org_id`. Lead prompts include the constraint.
5. **Rate-limit budgets.** Notion (3 req/s sustained), Xero (60/min/tenant), GHL (60/min/tenant) — encode in lead prompt as rule, not hint.
6. **Rollback.** Every phase must be revertible by `pm2 restart` to legacy config + git revert.

## Open questions — resolved 2026-05-07

| # | Question | Answer | Source |
|---|----------|--------|--------|
| 1 | Pricing | $0.08 per session-hour active runtime + standard token pass-through. No per-grade or per-specialist surcharge. Max 25 concurrent threads/session. Pricing flagged as "may change when leaving preview". | platform.claude.com/docs/en/managed-agents/overview |
| 2 | Dreaming/memory storage | Anthropic-hosted, workspace-scoped, mounted at `/mnt/memory/`. **No Australian residency** — workspace geo "us" only at launch. **Hard blocker for OCAP-bound content.** | platform.claude.com/docs/en/build-with-claude/data-residency |
| 3 | Shared filesystem | Ephemeral per-session sandboxed Linux container. **Network egress is configurable** — specialists can call Supabase/Xero/Notion. `allowed_domains` lockdown is customer responsibility. Disk quota not publicly documented — confirm with Anthropic. | anthropic.com/engineering/managed-agents, pluto.security/blog/securing-claude-managed-agents |
| 4 | Webhook semantics | **At-least-once delivery.** Handlers must be idempotent — dedupe on `event_id`. Fires on `session.status_idled`. Retry SLA not publicly documented. | platform.claude.com/cookbook/managed-agents-cma-operate-in-production |
| 5 | Training / data handling | Default: Anthropic does NOT train on inputs/outputs. AES-256 at rest, TLS in transit. ZDR addendum available for enterprise but **structurally incompatible with persistent memory + Dreams**. | platform.claude.com/docs/en/build-with-claude/api-and-data-retention |

### Implications

- **Finance / BAS / R&D / grant triage / money-chain orchestration → green light** under default commercial terms.
- **OCAP / storywork / consent records → red light** until (a) AU residency ships and (b) Anthropic confirms ZDR for memory + Dreams artefacts. Phase 4 (Dreaming on wiki/OCAP) is now **deferred indefinitely**.
- **Webhook idempotency is mandatory** — every downstream Telegram/Slack/Supabase/Xero handler must dedupe on `event_id` before acting.
- **Wrap calls in `scripts/lib/managed-agent-client.mjs`** to keep portability and to enforce `allowed_domains` lockdown in one place.

## Risks

- **Lock-in.** Multiagent orchestration runs on Anthropic infra. Mitigate: keep rubrics + lead prompts in `thoughts/` (portable), wrap calls in our own `scripts/lib/managed-agent-client.mjs` so we can swap backends.
- **OCAP exposure.** Story-sync is the most consent-sensitive workflow. Default position: do not put it on Managed Agents until question #5 is answered.
- **Notion contention.** The Monday chain serialises today for a reason — we don't know if. Phase 3 must shadow-run.
- **Cost discovery.** No public pricing. Phase 0 + 1 should generate a cost data point before committing further.

## Task Ledger

- [x] Phase 0a — write `thoughts/shared/rubrics/act-voice-curtis.md` (v0.2, 2026-05-07)
- [x] Phase 0b — Tier 1 calibration: 6/6 on canonical fixtures. Production-eligible.
- [x] Phase 0c — Tier 2-3 calibration ran (~$0.02). Result: 3/6 — bads correctly fail, goods wrongly warn. Haiku grader is too strict on Curtis terseness. Needs prompt tuning (few-shot + Sonnet bump) before promotion.
- [ ] Phase 0d — tune Tier 2-3 prompt with few-shot examples, re-run, promote rubric to v1.0 if 6/6
- [ ] Phase 0e — pick a real pitch (Goods → Minderoo or one in `wiki/empathy-ledger`) for first production grade
- [ ] Phase 1a — voice rubric wired into `act-brand-alignment` skill (auto-grade public-facing output)
- [ ] Phase 1b — R&D evidence rubric drafted at `thoughts/shared/rubrics/rd-evidence-pack.md`, wired into `weekly-reconciliation.mjs` post-step
- [ ] Phase 2 — receipt-hunt multiagent (lead + 5 specialists), shadow run for one BAS quarter
- [ ] Phase 3 — money-chain orchestrator, 4-week shadow before swap
- [ ] Phase 4 — DEFERRED (Dreaming residency block)
- [x] Cross-cutting — `scripts/lib/managed-agent-client.mjs` scaffold written (interface only, dryRun mode; real implementation pending Console access)

## Decision Log

| Date | Decision | Rationale | Reversible? |
|------|----------|-----------|-------------|
| 2026-05-07 | Start with Outcomes voice grader as Phase 0 | Smallest blast radius, immediate Minderoo pitch use, rubric data already in act-brand-alignment | Yes — rubric file only |
| 2026-05-07 | OCAP/storywork is OUT of Managed Agents scope until AU residency + memory ZDR confirmed | Memory + Dreams are US-only and persistent; structurally incompatible with consent obligations | Yes — revisit when Anthropic ships AU |
| 2026-05-07 | Money-chain orchestration is Phase 3, not Phase 1 | High value but high blast radius; receipt hunt validates the pattern first | Yes |
| 2026-05-07 | Wrap all Managed Agents calls in `scripts/lib/managed-agent-client.mjs` | Portability + central place to enforce `allowed_domains`, idempotency keys, and rate budgets | Yes |
| 2026-05-07 | Webhook handlers must dedupe on `event_id` before any side effect | At-least-once delivery confirmed in Anthropic cookbook | N/A — design rule |
| 2026-05-07 | Rubric v0.1 must clear calibration before production use (3 known-good pass, 3 known-bad fail) | Avoid shipping a grader that flags real ACT voice as wrong, or rubber-stamps AI register | Yes |

## Verification Log

| Claim | Verified? | How | Date |
|-------|-----------|-----|------|
| 418 *.mjs scripts | Yes | `ls scripts/*.mjs \| wc -l` | 2026-05-07 |
| Monday morning 14-step chain 8:00–9:25 | Yes | `grep -E "name:\|cron_restart:\|script:" ecosystem.config.cjs` | 2026-05-07 |
| 20 finance pages | Yes | `find apps/command-center/src/app/finance -name page.tsx` | 2026-05-07 |
| bas-cycle has 6-path classifier | Yes | Read `.claude/skills/bas-cycle/SKILL.md` | 2026-05-07 |
| find-receipt has explicit scoring weights | Yes | Read `.claude/skills/find-receipt/SKILL.md` | 2026-05-07 |
| act-brand-alignment has DO/DON'T rules | Yes | Read `.claude/skills/act-brand-alignment/SKILL.md` | 2026-05-07 |
| Dreaming storage location | Yes | Anthropic-hosted, US-only at launch | 2026-05-07 |
| Managed Agents pricing | Yes | $0.08/session-hour + token pass-through (preview pricing) | 2026-05-07 |
| Multiagent shared-filesystem reaches Supabase | Yes | Egress configurable; customer locks `allowed_domains` | 2026-05-07 |
| Webhook delivery semantics | Yes | At-least-once; cookbook recommends `event_id` dedupe | 2026-05-07 |
| Filesystem disk quota per session | No | Not in public docs — contact Anthropic before Phase 2 | — |

## Changelog

### 2026-05-07 — Phase 0a/0b: Voice rubric drafted + Tier 1 calibrated

**Objective:** Validate that an Outcomes-style rubric grader catches AI-register drift on canonical ACT examples before committing to Managed Agents.

**Changed:**
- Wrote `thoughts/shared/rubrics/act-voice-curtis.md` (v0.1 → v0.2)
- Wrote `scripts/grade-voice.mjs` (~180 lines, Tier 1 deterministic + Tier 2-3 Haiku stub + `--tier1-only` fallback)
- Wrote `thoughts/shared/rubrics/act-voice-curtis.calibration.md` (auto-generated)
- Researched 5 open questions; resolved all in plan's Verification Log

**Verified:**
- Tier 1 calibration 6/6 against `writing-voice.md` canonical fixtures (3 good pass, 3 bad fail)
- Hit precision after tuning: bad-1 2 hits, bad-2 4 hits, bad-3 3 hits
- Verb-stem inflection coverage: `leverage`/`leveraging`/`leveraged`, `delve`/`delves`, etc. now all match
- Goods clear: zero false positives across all three good fixtures (score 100/100 each)

**Failed/Learned:**
- Anthropic API key has zero credit — Tier 2-3 LLM grading deferred. Added `--tier1-only` mode.
- v0.1 regex `\b${word}\b` missed verb inflections. Fixed in v0.2.
- v0.1 significance-claim regex required "plays a X role"; missed "its X role". Fixed.
- Confirmed: OCAP/storywork is structurally blocked from Managed Agents memory + Dreams until AU residency. Phase 4 redesigned (finance-only).

**Blockers:**
- Anthropic API credit top-up needed before Tier 2-3 calibration (Phase 0c).
- No blockers for proceeding to Phase 1 prep work (R&D evidence rubric draft, `managed-agent-client.mjs` wrapper).

**Next:**
- Operator: top up API credit, run `node scripts/grade-voice.mjs --calibrate` (full mode, costs ~$0.05 in tokens).
- Engineer (next session): pick one — draft R&D evidence rubric (Phase 1b prep) OR build `scripts/lib/managed-agent-client.mjs` wrapper (cross-cutting prep).

---

## Provenance

- **Data sources queried:** local file system (scripts/, ecosystem.config.cjs, .claude/skills/, ~/.claude/rules/), Anthropic blog post (May 2026 launch).
- **Date range:** stack as of 2026-05-07.
- **Unverified assumptions:** Notion serial chain is API-contention-driven (not hard dependency); receipt-hunt parallelism doesn't break 6-path classifier ordering; Anthropic shared filesystem can hold per-agent JSON without size limits.
- **Generated by:** hybrid — direct file reads this turn + one prior agent (cron-orchestration audit) used selectively, with one agent's content discarded due to unreliability.
