# ADR: GHL Target Architecture — one system, not thirteen

**Date:** 2026-07-12 · **Status:** accepted (D1–D3 locked by Ben) · **Supersedes:** nothing — sits under `act-ghl-master-operating-system.md` and narrows it
**Context:** Live audit via HighLevel MCP (baseline: `wiki/outputs/2026-07-12-ghl-live-snapshot/`). The account felt bloated and disconnected; the numbers agreed: 13 pipelines (2 empty, 1 dead, front door at 6 opps), 543 opportunities of which ~90% sit permanently "open", and 3,267 contacts of which 66% carry no tags and 60% no email. The canonical tag system describes roughly a third of the account.

## Decisions (locked 2026-07-12)

### D1 — Quarantine the noise, don't delete it
Contacts with no email AND no project tag AND no consent evidence AND no opportunities (overwhelmingly Gmail-discovery imports; ~1,900–2,100) get `status:quarantine`. Every smart list, segment, dashboard count, and sync-derived rollup excludes them. Reversible; nothing deleted; review in batches later. **Plus the source fix:** the Gmail discovery import must stop creating contacts from transactional senders (`welcome@supabase.com` class) — filter at import, not after.

### D2 — One pipeline per living journey (13 → 4)
A pipeline earns its existence by things *moving through it to a terminal stage*. Grants is the only one currently doing that. Target set:

| Pipeline | Absorbs | Notes |
|---|---|---|
| **Grants** | (unchanged) | Already honest — 16/31 open, stages used. |
| **Goods** | Buyer (18) + Demand Register (74) + Supporter Journey (67) | One pipeline; deal type via `role:buyer` / `role:supporter` tags + name prefix (RC6 pattern). Demand signals enter at a "Signal" stage instead of a separate register. |
| **Harvest** | Inbox (54) + Shop (35) + Membership (139) | Inbox+Shop merge as intake→resolution lanes. **Build-time checkpoint:** Membership (139/139 open, untouched since 16 Jun) is a segment wearing a pipeline costume — `member-level:*` tags already encode the same state. Preferred: retire it INTO tags + a smart list; keep as stages only if Ben overrules at build. |
| **CONTAINED** | Engagement (101) + Adelaide 2026 (4) | Engagement shape wins; stop distinguished by `place:*` (RC5). **Resolves the deal-pipeline drift:** amend RC6 — `GHL_PARTNER_PIPELINE_ID` / `GHL_FUNDER_PIPELINE_ID` point here; "CONTAINED: Partners & Funders" is not built. |

**Archive** (export snapshot → then delete in UI): Empathy Ledger (0 opps — EL intake lives on the Empathy Ledger platform, not GHL), Supporters & Donors (0 opps — donor state belongs to tags + Xero), A Curious Tractor (14 opps, all closed, dead since 9 Jun), Universal Inquiry (see D3).

**Standing rule:** every pipeline must move ≥1 opp to a terminal stage per month or it's flagged at the monthly review as a candidate to become a tag/smart list.

### D3 — Per-project intake; retire the Universal front door
Reality won: Harvest Inbox, Goods inquiry, and CONTAINED capture each own their intake. Universal Inquiry (6 opps) retires. Routing is tags, not a triage board. **Safety net:** the weekly gapcheck adds one query — contacts created >7 days ago with no `project:*` tag and not quarantined → surfaced in the report for human routing. A report, not a pipeline.

## Execution order (updates the 2026-07-12 cleanup plan's Phases 3–6)

1. **Quarantine batch** — define the exact predicate, tracer one contact, then MCP bulk-tag (Tier 3, batched, attempted-vs-actual). Fix the Gmail import filter in the same PR. After this, every count in the system describes real relationships.
2. **R8 consent remediation** (plan Phase 5, unchanged) — still blocks all bulk sends.
3. **Pipeline consolidation** — per merge: add any missing stages to the target pipeline (UI), bulk-move opps via MCP (batched, tracer first), verify counts source-vs-target, then archive the source. One pipeline at a time, Grants untouched.
4. **Tag migration** (plan Phase 4, unchanged mechanics) — now runs over ~1,100 real contacts instead of 3,267, using `config/ghl-tag-canonical-map.json`. Post-quarantine, also retire the 138 tags with <5 uses (fold or drop via the map's decide-list).
5. **Workflow re-key + draft cleanup** (plan Phase 3) — re-point triggers at the 4 target pipelines and canonical tags; delete superseded drafts.
6. **Docs close the loop** — update `act-ghl-master-operating-system.md` to this shape; `git mv` the superseded forms/tag-alignment plans into `_archive/`; keep this ADR as the durable record.

## What "connected" means when this is done
One intake per project → canonical tags describe every real contact → four honest pipelines where movement means something → mirror (already zero-drift, self-correcting) feeds dashboards that exclude quarantine → consent provable before any send. The measure: **any count you read in GHL, the mirror, or a dashboard agrees, and describes only real relationships.**
