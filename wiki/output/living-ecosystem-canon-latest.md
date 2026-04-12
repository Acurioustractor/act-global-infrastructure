# Living Ecosystem Canon Registry

> Generated from `config/living-ecosystem-canon.json`. This is the machine-readable phase-1 map for hub/spoke/support/archive ownership.

## Summary

- Generated at: **2026-04-11T21:01:22.587Z**
- Systems: **6**
- Surfaces: **6**
- Primary assets: **4**
- Spokes: **4**
- Supporting assets: **2**
- Legacy assets: **1**
- Sandbox assets: **1**
- Open human decisions: **3**

## Primary

| Name | ID | Lane | Class | Role | Verified | Human decision | Notes |
|---|---|---|---|---|---|---|---|
| ACT Regenerative Studio | `act-regenerative-studio` | surface | primary | hub | verified | no | Verified live umbrella front door and public composition layer. |
| ACT Supabase Operational Ledger | `act-supabase-ledger` | system | primary | runtime | verified | no | Runtime state, identity resolution, auditability, and automation queues live here. Narrative meaning does not. |
| ACT Wiki / Obsidian Knowledge Graph | `act-wiki` | system | primary | knowledge | verified | no | Durable memory layer. Canonical meaning lives here before downstream mirrors are regenerated. |
| Empathy Ledger | `empathy-ledger` | surface | primary | content-spoke | inferred | yes | Verified live content surface. Its final classification as a primary surface versus an elevated spoke still needs human confirmation. |

## Spokes

| Name | ID | Lane | Class | Role | Verified | Human decision | Notes |
|---|---|---|---|---|---|---|---|
| Black Cockatoo Valley | `black-cockatoo-valley` | surface | spoke | project-spoke | inferred | yes | Best-fit current reading is spoke. Human confirmation still required. |
| Goods on Country | `goods-on-country` | surface | spoke | project-spoke | inferred | yes | Best-fit current reading is spoke. Human confirmation still required. |
| JusticeHub | `justicehub` | surface | spoke | project-spoke | inferred | yes | Best-fit current reading is spoke. Human confirmation still required. |
| The Harvest | `the-harvest` | surface | spoke | project-spoke | inferred | yes | Best-fit current reading is spoke. Human confirmation still required. |

## Supporting

| Name | ID | Lane | Class | Role | Verified | Human decision | Notes |
|---|---|---|---|---|---|---|---|
| ACT Command Center | `command-center` | system | supporting | ops-admin | verified | no | Operational and admin surface. It is not the public umbrella hub. |
| ACT Global Infrastructure | `act-automation-repo` | system | supporting | automation | verified | no | Holds the knowledge/sync/build tooling and the current wiki canon. |

## Legacy

| Name | ID | Lane | Class | Role | Verified | Human decision | Notes |
|---|---|---|---|---|---|---|---|
| Legacy Dashboard Archive | `legacy-dashboard-zone` | system | legacy | archive | verified | no | Historical reference only. Not a write target. |

## Sandbox

| Name | ID | Lane | Class | Role | Verified | Human decision | Notes |
|---|---|---|---|---|---|---|---|
| Experimental Outputs and Handoffs | `experimental-output-zone` | system | sandbox | sandbox | verified | no | Useful for exploration and handoffs. Nothing here should auto-promote into canon. |

## Ownership Rules

- `canonical_knowledge` -> Meaning is authored in the wiki first, then regenerated downstream.
  Owner: `act-wiki`
  Mirrors: `act-regenerative-studio`, `command-center`
- `runtime_state` -> Permissions, IDs, sync state, and release state must be led by Supabase-backed runtime state.
  Owner: `act-supabase-ledger`
  Mirrors: `empathy-ledger`, `command-center`, `act-regenerative-studio`
- `public_hub` -> The umbrella public front door lives in ACT Regenerative Studio.
  Owner: `act-regenerative-studio`
- `story_and_media_packets` -> Approved source packets originate in the story/media layer, then syndicate outward.
  Owner: `empathy-ledger`
- `public_work_copy` -> Cross-surface works should default to the hub unless the work is structurally part of a spoke's native product or community interface.
  Default owner: `act-regenerative-studio`

## Human Decisions Still Open

- `confirm-empathy-ledger-classification` (open) — Confirm whether Empathy Ledger is a primary public surface or an elevated spoke.
- `confirm-spoke-roster` (open) — Confirm the live spoke roster for JusticeHub, Goods on Country, Black Cockatoo Valley, and The Harvest.
- `confirm-public-work-copy-policy` (open) — Confirm which site owns canonical public work copy when a work appears on more than one surface.


