---
title: Living Ecosystem System - Implementation Backlog
created: 2026-04-12
updated: 2026-04-12
status: active
type: handoff
tags:
  - project/living-ecosystem
  - backlog
  - execution
  - qa
  - governance
aliases:
  - Living Ecosystem Backlog
  - Implementation Backlog
cssclasses: []
---

# Living Ecosystem System - Implementation Backlog

> [!abstract] Purpose
> Execution-ready backlog for the living ecosystem system. This is the concrete work plan that follows the operating model in [[01-living-ecosystem-execution-brief|the execution brief]], [[02-wiki-obsidian-living-knowledge|the knowledge OS]], [[03-data-sync-and-ledger|the ledger layer]], [[04-agentic-publishing-and-syndication|publishing]], [[05-public-hub-spokes-and-art-portfolio|public hub/spokes]], and [[06-human-requirements-and-testing|human QA/governance]].

## Phase Plan

### Phase 1 - Canon and ownership lock

Goal: remove ambiguity about what is canonical, what is generated, and who owns each surface.

- Declare primary hub, spokes, and archive boundaries.
- Confirm canonical note owners for projects, works, people, and stories.
- Freeze public naming and alias rules.

### Phase 2 - Knowledge contract

Goal: make source-to-canonical updates predictable.

- Standardise bridge note format and provenance rules.
- Define update rules for canonical wiki notes.
- Require explicit human decisions for disputed or sensitive claims.

### Phase 3 - Data and ledger orchestration

Goal: make writes deterministic and auditable.

- Use one validate -> resolve -> write -> mirror -> ledger -> notify flow.
- Keep Supabase as runtime state and audit ledger.
- Prevent silent sync loops and cross-tenant drift.

### Phase 4 - Publishing and syndication

Goal: turn one approved source packet into governed outputs.

- Generate drafts, excerpts, media explainer copy, and syndication payloads from one canonical packet.
- Gate public publish on consent, cultural review, and release approval.
- Preserve revocation and auditability.

### Phase 5 - Public hub and portfolio coherence

Goal: keep hub, spokes, and works legible as one system.

- Align hub navigation with spoke identities.
- Make works reusable across surfaces without duplicating canon.
- Keep art/portfolio pages explanatory, media-rich, and back-linkable.

### Phase 6 - QA and release governance

Goal: ensure every release is human-reviewed, verified, and monitorable.

- Enforce preview, browser, and smoke-test checks.
- Require release captain sign-off.
- Add post-release monitoring and rollback thresholds.

## Task Ledger

### Ready next

- [ ] Finalise canonical hub/spoke/archive map.
- [ ] Publish bridge-note template and canonical-note update rules.
- [ ] Define source packet schema for publishing.
- [ ] Define Supabase write sequence and ledger entry shape.
- [ ] Confirm release captain, QA owner, and cultural reviewer roles.

### In progress

- [ ] Validate current public surfaces against the hub/spoke map.
- [ ] Check existing sync scripts against the one-write-sequence rule.
- [ ] Review current consent and revocation paths for publish gating.

### Blocked

- [ ] Any work needing a canonical decision on hub ownership.
- [ ] Any work needing a schema decision without a confirmed table shape.
- [ ] Any public release that lacks a human reviewer.

### Done

- [x] Governance and testing requirements documented in [[06-human-requirements-and-testing|human requirements and testing]].
- [x] Public hub/spoke concept established in [[05-public-hub-spokes-and-art-portfolio|public hub, spokes, and art portfolio]].
- [x] Ledger and sync model framed in [[03-data-sync-and-ledger|data sync and ledger]].
- [x] Machine-readable canon registry added at `config/living-ecosystem-canon.json`.
- [x] Source packet contract added at `config/living-source-packet.schema.json` with an executable example packet.
- [x] Reusable bridge-note and provenance templates added in `thoughts/shared/templates/`.
- [x] Validation script added at `scripts/validate-living-ecosystem-config.mjs`.
- [x] Generated canon report added at `wiki/output/living-ecosystem-canon-latest.md`.

## Dependencies

- Canonical naming decisions from [[01-living-ecosystem-execution-brief|execution brief]].
- Bridge-note and provenance conventions from [[02-wiki-obsidian-living-knowledge|knowledge OS]].
- Runtime state, permissions, and write safety from [[03-data-sync-and-ledger|data sync and ledger]].
- Consent, cultural safety, and syndication rules from [[04-agentic-publishing-and-syndication|publishing and syndication]].
- Hub/spoke and portfolio navigation rules from [[05-public-hub-spokes-and-art-portfolio|public hub, spokes, and art portfolio]].
- Human decision gates and test gates from [[06-human-requirements-and-testing|human requirements and testing]].

## Blockers

- Canonical ownership is still ambiguous if two surfaces claim the same content.
- Schema drift will block implementation unless the real table shape is checked first.
- Publishing cannot go live without consent and cultural review.
- Hub/spoke changes cannot be released without browser verification on desktop and mobile.
- Any change that widens permissions or automates a risky publish step must stop for human approval.

## Human Decisions

These decisions must be made by humans before implementation continues:

1. Which site owns canonical public work copy.
2. Which site is the umbrella hub and which sites are spokes.
3. Which content types can auto-publish versus queue for review.
4. Who approves sensitive cultural or community-facing material.
5. Who can override a failed QA gate.
6. What rollback threshold triggers an immediate stop.

> [!note] Decision rule
> If a change alters public meaning, permissions, or publish authority, it needs a human decision before the backlog item moves forward.

## Acceptance Criteria

The backlog is ready for execution only when:

- Every phase has a named owner and a dependency chain.
- Canonical hub/spoke/archive boundaries are explicit.
- Source-bridge-to-canonical update rules are written down.
- The ledger write sequence is defined and auditable.
- Publishing cannot bypass consent or cultural review.
- Public hub and portfolio navigation stay legible across surfaces.
- QA gates exist for compile, browser, release, and monitoring.

## Verification Gates

### Gate 1 - Scope check

- Confirm the task belongs to one phase.
- Confirm the owner file or note is the right one.
- Confirm the change does not contradict the execution brief.

### Gate 2 - Schema / contract check

- Verify the actual data shape before writing implementation code.
- Verify the source packet or note contract before publishing automation.

### Gate 3 - Preview check

- Open the preview in browser.
- Check content, layout, and navigation.
- Check desktop and mobile.

### Gate 4 - Release check

- Require a human release decision.
- Confirm production smoke test passes.
- Confirm logs are clean enough to proceed.

### Gate 5 - Post-release watch

- Monitor for regressions, missing content, permission failures, and unexpected retries.
- Roll back if the same failure repeats or if a critical public surface breaks.

## Execution Notes

- Work in phase order unless a blocker forces a dependency task first.
- Keep implementation tasks small and releasable.
- Prefer one source of truth over mirrored edits.
- Never let automation become the approver.
