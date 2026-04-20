---
title: Living Ecosystem System - Data Sync and Ledger
created: 2026-04-12
updated: 2026-04-12
status: active
type: handoff
tags:
  - act
  - handoff
  - ecosystem
  - supabase
  - wiki
  - ledger
aliases:
  - Data Sync and Ledger
  - Living Ecosystem Data Layer
cssclasses: []
---

# 03. Data Sync and Ledger

> [!abstract] Scope
> This brief covers the data/update layer for the living ecosystem system: Supabase projects, edge functions, sync scripts, operational ledger rules, identity mirroring, and automation hooks.

> [!info] Current boundary
> Supabase should be the operational system of record for mutable platform state. Wiki and Empathy Ledger should lead narrative, editorial, and human-readable knowledge. Supabase must stay downstream of those sources for content interpretation, but upstream for runtime state, permissions, and automation execution.

## Current State

### Verified

- Supabase is already the live persistence layer for platform data, and the ecosystem uses generated types plus service-role clients for admin/update flows.
- Sync and operational scripts already exist for the ecosystem data plane, including import, mirroring, reconciliation, and tagging workflows.
- Identity is already split across platform roles and public profiles, which means the system needs explicit mirroring instead of assuming one canonical name/shape everywhere.
- Edge and API hooks are already used as automation triggers for admin actions, webhooks, backfills, and reconciliation paths.
- The ledger concept already exists in practice: operational writes need to be auditable, reversible where possible, and scoped by tenant/org/project boundaries.

### Observed constraints

- Supabase schema is the truth for row shapes, nullability, and foreign keys.
- Wiki/EL content can describe the world, but it must not override runtime permissions, automation state, or database truth.
- Sync drift is a real risk whenever human-facing content, platform identity, and operational records are updated in separate places.
- Any orchestration layer must respect existing repo boundaries and avoid creating a second hidden source of truth.

## Target State

### Desired behaviour

- One orchestrator owns the write sequence for data updates, with clear stages for validate -> resolve identity -> write -> mirror -> ledger -> notify.
- Wiki and Empathy Ledger remain the human-authored upstreams for narrative and content intent.
- Supabase remains the runtime downstream for:
  - operational records
  - identity mirrors
  - permissions
  - automation state
  - audit/ledger entries
- Every sync path leaves a ledger trail with:
  - source
  - destination
  - actor
  - timestamp
  - object IDs
  - before/after summary
  - failure/retry status
- Edge functions and scripts share a common orchestration contract rather than each implementing bespoke sync logic.

### Non-goals

- Do not turn Supabase into the editorial source of truth for wiki-style narrative content.
- Do not let wiki/EL depend on speculative runtime state that only exists inside Supabase jobs.
- Do not create a new parallel ledger outside the existing operational/audit surfaces.

## Proposed Orchestrator Pattern

### Pattern

Use a thin orchestrator with explicit phases and idempotent steps:

1. **Ingest intent**
   - Receive a change request from wiki, EL, an admin route, or a webhook.
2. **Resolve identity**
   - Map human names, profile IDs, storyteller IDs, organization IDs, and tenant IDs to the canonical IDs required by Supabase.
3. **Validate schema and permissions**
   - Confirm the target table, row shape, and write scope before mutating anything.
4. **Write primary record**
   - Apply the change to the operational table in Supabase.
5. **Mirror derived identity**
   - Update downstream mirrors, caches, or public-facing denormalized rows.
6. **Append ledger entry**
   - Record the operation in the audit/ledger trail with source and result.
7. **Trigger hooks**
   - Emit edge-function, webhook, or automation follow-ups only after the primary write succeeds.

### Recommended placement

- **Supabase-led:** admin APIs, webhooks, tenant/org writes, sync tables, automation state, audit rows.
- **Wiki/EL-led:** narrative curation, editorial prompts, human review content, explanatory docs, knowledge graphs.
- **Shared orchestration:** sync scripts and edge functions that translate one layer into the other.

### Practical rule

If a write changes permissions, canonical IDs, runtime availability, or a queued automation state, Supabase leads.

If a write changes meaning, narrative framing, editorial interpretation, or documentation intent, wiki/EL leads.

## Human Requirements and Decisions

### Required human decisions

- Decide which entities are canonical in each lane:
  - person/profile
  - storyteller
  - organization
  - project
  - tenant
  - public-facing identity
- Decide which changes require human approval before write-through to Supabase.
- Decide when a wiki/EL update should only stage intent versus actually publish an operational mutation.
- Decide whether ledger entries are immutable append-only records or append-plus-correction records.
- Decide the fallback policy when identity resolution is incomplete:
  - fail closed
  - queue for review
  - write with warnings

### Human guardrails

- Human review is required for any cross-identity merge, destructive sync, or public identity promotion.
- Any automation that writes across multiple systems must surface a clear diff before execution.
- Ambiguous entity matches should never auto-resolve silently.

## Testing and Verification Checklist

- [ ] Confirm the target Supabase project and service-role path before any mutation.
- [ ] Verify the schema for every table touched, including foreign keys and nullable columns.
- [ ] Run the orchestrator against a dry-run or preview mode first.
- [ ] Confirm identity resolution maps to the expected canonical IDs.
- [ ] Verify the primary write succeeds before mirrors or hooks fire.
- [ ] Check the ledger row for source, destination, actor, timestamps, and before/after summary.
- [ ] Confirm retries are idempotent and do not duplicate writes.
- [ ] Verify edge functions/webhooks run only after the primary write.
- [ ] Validate that wiki/EL remains upstream for narrative intent and does not get overwritten by downstream syncs.
- [ ] Re-run targeted `tsc` or script-level checks after any orchestration change.

## Operational Notes

> [!tip] Default precedence
> When there is a conflict, prefer the human-authored upstream for meaning and the database upstream for runtime state. Never infer a canonical operational write from a narrative document without explicit identity mapping.

> [!warning] Failure mode to avoid
> The worst failure is a silent bidirectional sync loop where wiki, EL, and Supabase keep overwriting each other. The orchestrator must keep one-way intent flow and explicit ledgered writes.

## Next Implementation Questions

- Which sync paths are allowed to auto-write versus queue for review?
- Which identity fields are mirrored both ways, and which are write-once?
- Which automation hooks are critical-path versus best-effort?
- What is the minimal append-only ledger record that satisfies audit and replay needs?

