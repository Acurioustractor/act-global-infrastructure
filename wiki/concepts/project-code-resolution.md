---
title: Project-Code Resolution (operational tagging engine)
status: Active
date: 2026-06-03
related: project-identity-and-tagging-system, ghl-tag-taxonomy
---

# Project-Code Resolution

> The operational counterpart to [[project-identity-and-tagging-system|Project Identity & Tagging System]].
> That page decides *which wiki pages get a code*; this page defines *how a record (a Xero transaction,
> a GHL opportunity, a subscription) gets resolved to one of those codes, consistently, across every area*.
> Decision record: [[2026-06-03-unified-project-code-resolver]].

## Resolved terms

| Term | Meaning |
|---|---|
| **Operational `project_code`** | The `ACT-XX` code stamped on a *money / opportunity / subscription record* — distinct from a wiki page's identity and from a GHL **contact** `project:` tag. |
| **Resolver** | The single shared function (`scripts/lib`) that maps a record's available signals to `{ code, confidence, source }`. The one place tag→code logic lives. |
| **Signal** | An input the resolver reads: a manual override, an authoritative system tag (Xero Project Tracking), a linked-record code, a registry match (`ghl_tags` / pipeline→project / vendor rule), or a name/keyword. |
| **Precedence** | The fixed order signals are tried: manual → system tag → linked-record → registry direct → name/keyword fuzzy. First sufficiently-confident hit wins. |
| **Source of truth (per area)** | The registry owns the *code set* + *mapping*. Xero **Project Tracking** owns *money-row assignment*. GHL opps / subs are owned by the resolver. `opportunities_unified` owns nothing — it is a projection. |
| **Confidence / provenance** | Every resolution carries how sure it is and which signal produced it. High → auto-apply; low → review queue. |
| **Review queue** | Low-confidence resolutions surfaced for human approval (the `tagger-v2` surface) — never written silently. |
| **Consistency sweep** | A read-only pass that finds the same logical entity tagged two ways across areas and emits a reconciliation worklist. |
| **Legacy wrapper** | A retained non-canonical code normalised on resolve: `ACT-CG→ACT-CS`, `ACT-HQ→ACT-CORE`, `ACT-PC→ACT-PI`. |
| **Hard link / fuzzy link** | How two areas are matched: hard = `xero_invoice_id`, `ghl_id`; fuzzy = `vendor_name`↔`contact_name`. Only hard-link conflicts auto-resolve. |

## How resolution flows

```
record (Xero txn / GHL opp / subscription)
   │  available signals
   ▼
shared resolver  ──▶  { code, confidence, source }   (registry = code set + mapping)
   │
   ├─ high confidence ─▶ auto-apply (respecting per-area SoR; gated for external writes)
   └─ low confidence  ─▶ review queue (tagger-v2)            ── never overwrite a manual code

consistency sweep (read-only) ─▶ reconciliation worklist ─▶ gated writer (tracer-first) ─▶ fixes
```

- **Money rows:** Xero Project Tracking is authoritative; Supabase mirrors on sync-down; clean codes
  backfill *up* into Xero (gated, period-lock aware).
- **GHL opps / subs:** resolver assigns; linked-record propagation (a paid opp inherits its Xero
  invoice's code) corrects drift toward the money SoR.
- **`opportunities_unified`:** never set directly — rebuilt as a projection of its bases.

## What this replaces

The divergent per-area logic in `project-code-resolver.mjs` (contact-only), `align-ghl-opportunities.mjs`
(its own scorer), `pileForOpp`, and the Xero vendor taggers — all consolidated behind the one resolver.
