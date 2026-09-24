---
title: "Source Summary: CivicGraph watch-agent discoveries (4 April 2026)"
status: Active
date: 2026-09-25
type: source
tags:
  - source
  - civicgraph
  - snapshot
raw_source: raw/2026-04-04-civicgraph-discoveries.md
source_system: CivicGraph database (shared Supabase)
source_kind: point_in_time_export
summary: "100 findings from CivicGraph's watch agents to 4 April 2026: data quality issues and entity changes."
---

# Source Summary: CivicGraph watch-agent discoveries (4 April 2026)

> A point-in-time export of the watch agents' significant and notable findings.

## What This Source Contains

- Data quality issues, e.g. 7,678 justice_funding records unlinked (10.8%), 2,935 Indigenous corporations missing ABN (22 March).
- Entity changes on 21 March: 186,401 new companies, 2,799 new government bodies, 521 new Indigenous corporations.
- Three "new community-controlled org" flags: JusticeHub, Made by Mob, Yabun Panjoo Elders.

## Known Error in This Source

The watcher flagged **JusticeHub** as a new community-controlled organisation. JusticeHub is
ACT's own project ([[justicehub|JusticeHub]]), not a community-controlled organisation. The
classification is wrong at the source. The other two flags are unverified registry signals:
do not describe Made by Mob or Yabun Panjoo Elders from this row alone.

## Links

- [[civicgraph|CivicGraph]]
- [[2026-04-04-civicgraph-data-quality|CivicGraph data quality, 4 April 2026]]

(Source: raw/2026-04-04-civicgraph-discoveries.md, imported from the retired social-impact-kb vault)
