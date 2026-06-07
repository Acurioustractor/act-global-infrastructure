---
title: Unified Project-Code Resolver & Per-Area Source of Truth
date: 2026-06-03
status: accepted
owner: Ben
related: project-identity-and-tagging-system, ghl-tag-taxonomy, ghl-money-alignment
---

# ADR: Unified project-code resolver & per-area source of truth

## Context

Operational `project_code` tagging (the `ACT-XX` code on money + opportunity + subscription
records) is inconsistent across areas. Diagnostic (live, 2026-06-03):

| Area | Coverage |
|---|---|
| Xero txns FY26 SPEND / RECEIVE | ~100% |
| Xero invoices ACCPAY / ACCREC | 97% / 99% |
| Xero txns all-time | 69% — **$3.7M untagged**, almost all pre-FY26 backlog |
| **GHL opportunities** | **project_code 64% · pile 58%** |
| **Subscriptions** | **49%** |

The tag→code logic is **duplicated and divergent** across `scripts/lib/project-code-resolver.mjs`
(GHL-contact prefix rules), `align-ghl-opportunities.mjs` (name+pipeline keyword scorer, 0.7/0.3
confidence split), `apps/command-center` `pileForOpp`, and the Xero vendor taggers. Each surface tags
independently and **nothing detects cross-area drift** (e.g. a won GHL opp whose linked Xero invoice
carries a different code). This silently corrupts per-project P&L.

This ADR covers the **operational project_code layer only**. The GHL **contact**-tag taxonomy
(`project:`/`role:`/… namespaces) is a separate, already-planned migration ([[ghl-tag-taxonomy]]) that
this layer stays consistent with (`project:act-gd` ↔ `ACT-GD`) but does not re-open.

## Decision

1. **Per-area source of truth, unified by the registry.**
   - `config/project-codes.json` = SoR for the **code set** + the **tag→code mapping** (every area
     resolves through it).
   - **Xero `Project Tracking` category = SoR for money-row assignment** (Supabase `project_code`
     mirrors it on sync-down; gated backfill pushes clean codes *up* into Xero where missing; respects
     Standard-Ledger period locks ≤ 2025-09-30). This is the pre-existing, documented direction.
   - GHL opps / subscriptions have no external SoR → assigned by the resolver + propagation from
     linked records.
   - `opportunities_unified` is a **projection** (rebuilt from its bases), never authoritatively set.

2. **One shared resolver** (`scripts/lib`) returns `{ code, confidence, source }` under a fixed
   precedence: **manual override → authoritative system tag (Xero tracking / direct ACT-XX) →
   linked-record code → registry direct match (ghl_tags / pipeline→project / vendor rule) →
   name/keyword fuzzy**, with legacy-wrapper normalisation applied throughout. **Auto-apply only at
   high confidence; low-confidence → review queue; never overwrite a manual code.**

3. **Read-only consistency sweep** emits a reconciliation worklist (conflict · proposed resolution
   toward the per-area SoR · confidence · link-type). A **separate gated writer** applies only
   high-confidence / hard-link fixes (`xero_invoice_id`, `ghl_id`), **tracer-first** (prep→plan→apply,
   per the reconcile-tools pattern). Fuzzy vendor-link conflicts flag for review.

4. **Rollout:** engine + read-only sweep + extended review surface first (AFK-safe) → one tracer →
   gated per-area writers (day-shift, Tier 2/3).

## Alternatives considered

- **Supabase `project_code` as the global master** — rejected: fights the existing "Xero tracking is
  the durable source" design and the Standard-Ledger period locks (can't rewrite locked Xero).
- **Registry-only, systems as pure projections** — rejected: impractical for thousands of
  per-transaction assignments that genuinely originate in Xero.
- **Deterministic first-match, auto-apply all** — rejected: silent fuzzy-match writes corrupt
  per-project P&L (the exact pain this fixes).

## Consequences

- One resolver to maintain; the scattered taggers (`align-ghl-opportunities`, `pileForOpp`, vendor
  taggers) call it instead of re-implementing the mapping.
- `tagger-v2` / `tagger-queue` become the **cross-area** review surface (today Xero-only) — extended to
  GHL opps + subscriptions + a conflicts mode, fed by the shared resolver's confidence/provenance.
- Drift becomes visible and gated; writes stay day-shift.
- Legacy wrappers (`ACT-CG→ACT-CS`, `ACT-HQ→ACT-CORE`, `ACT-PC→ACT-PI`) normalised centrally, once.
