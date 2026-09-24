---
title: "Source Summary: CivicGraph data quality snapshot (4 April 2026)"
status: Active
date: 2026-09-25
type: source
tags:
  - source
  - civicgraph
  - snapshot
raw_source: raw/2026-04-04-civicgraph-data-quality.md
source_system: CivicGraph database (shared Supabase)
source_kind: point_in_time_export
summary: "Health of CivicGraph's agents and datasets on 4 April 2026: 61 agents overdue, enrichment gaps, table sizes."
---

# Source Summary: CivicGraph data quality snapshot (4 April 2026)

> A point-in-time export. It describes the state on 4 April 2026, not today.

## What This Source Contains

- 61 scheduled agents were more than twice overdue; many had never run (state scrapers, ORIC enrichment, ACNC financials).
- Enrichment gaps: social enterprises 92% without descriptions, foundations ~55% without profiles, government bodies 70% without descriptions, Indigenous corporations 37.5% missing ABN.
- Materialized views stale since 14 March.
- Scale: 587,307 entities, 1,528,066 relationships, 796,701 AusTender contracts, 218,022 justice funding rows.

## Why Keep It

A baseline for how far CivicGraph's data has moved since April.

## Links

- [[civicgraph|CivicGraph]]
- [[2026-04-04-civicgraph-discoveries|CivicGraph discoveries, 4 April 2026]]
- [[2026-04-04-civicgraph-foundations-gaps|CivicGraph foundations gaps, 4 April 2026]]

(Source: raw/2026-04-04-civicgraph-data-quality.md, imported from the retired social-impact-kb vault)
