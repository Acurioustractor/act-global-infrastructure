# GHL Live Snapshot — 2026-07-12

Baseline inventory of the A Curious Tractor GHL location (`agzsSZWgovjwgpcoASWG`), pulled live via the HighLevel MCP (`/mcp/anthropic/v2`) on 12 Jul 2026 (AEST). This is the rollback/verification reference for the cleanup plan at `thoughts/shared/plans/2026-07-12-ghl-cleanup-alignment.md`.

## Counts (live, at snapshot time)

| Surface | Count | Notes |
|---|---|---|
| Contacts | 3,280 | mirror held 4,861 — deletion drift |
| Opportunities | 555 | mirror held 1,005, mirror stale since 29 Jun |
| Pipelines | 13 | see pipelines.json (stage IDs included) |
| Tags | 380 | see tags.json (name → id) |
| Custom fields (contact) | 63 | see custom-fields.json |
| Workflows | 21 | 11 published, 10 draft — see workflows.json |
| Forms | 4 | see forms.json |
| Calendars | 7 | see calendars.json |

## Provenance

- Source: HighLevel public API v2 via MCP facade (`get-pipelines`, `get-location-tags`, `get-custom-fields`, `get-workflow`, `get-forms`, `get-calendars`, `search-contacts-advanced`, `search-opportunity`).
- Verified: consent field IDs match repo config (`newsletter_consent` = `aVnqmajnysMtGYhLD0oA`, `consent_status` = `MtsIWjiOFaplbdN74aZq`).
- Condensed: tags.json is a name→id map; custom-fields.json and calendars.json keep operative fields only (IDs, keys, types, options). pipelines.json, workflows.json, forms.json are as returned.
- Gaps: contact-level data not snapshotted (counts only); email templates/campaigns not pulled.

## Known drift at snapshot time

1. Config `contained-adelaide-2026.json` references pipeline "CONTAINED: Partners & Funders"; live has "CONTAINED Engagement" (`vzatUY4dwN8t63ZoFIpH`).
2. Flat + canonical tag pairs coexist (`goods-newsletter`/`comms:goods-newsletter`, `adelaide`/`place:adelaide`, etc.) — Phase 4 of the plan.
3. `cultural:sacred-knowledge` tag exists in GHL — OCAP boundary decision pending (Phase 2).
4. Gmail-discovery import creating junk contacts (e.g. `welcome@supabase.com`, 11 Jul).
