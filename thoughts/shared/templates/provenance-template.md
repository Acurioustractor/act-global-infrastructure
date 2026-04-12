---
title: "[Report or Output Name] Provenance"
status: Draft
date: YYYY-MM-DD
type: provenance
tags:
  - provenance
  - verification
  - audit
source_packet_id: [packet-id-or-na]
canonical_entity: [canonical-slug-or-na]
---

# [Report or Output Name] Provenance

## Purpose

- Output: [report / article / image brief / video brief / project card / other]
- Intended destination: [surface, URL, or file path]
- Why it was generated: [decision, task, or release context]

## Data Sources Queried

| Source | Type | Range / Snapshot | How it was used |
|---|---|---|---|
| [wiki/projects/foo.md] | canonical note | [date / commit / snapshot] | [meaning / framing / cross-links] |
| [table or API] | runtime ledger | [date range] | [permissions / IDs / state] |
| [media or raw source] | source packet | [capture date] | [quotes / captions / assets] |

## Verification Status

- `Verified:` [facts or values confirmed directly from source systems]
- `Inferred:` [syntheses, summaries, or mappings derived from verified inputs]
- `Unverified:` [anything still assumed, missing, or awaiting human review]

## Human Decisions / Gates

- Editorial review: [approved / pending / rejected]
- Cultural review: [approved / pending / not-required]
- Consent review: [approved / pending / rejected]
- Release approval: [approved / pending / rejected]

## Known Gaps And Assumptions

- [Gap or ambiguity]
- [Assumption or fallback]
- [Potential effect on the output]

## Reproduction Steps

1. [Command, query, or path used to gather the primary inputs]
2. [Command, script, or workflow used to build the output]
3. [How to verify the output after generation]

## Linked Artifacts

- Source packet: [path or ID]
- Output artifact: [path or URL]
- Validation log: [path or URL]
