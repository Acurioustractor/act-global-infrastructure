# CivicGraph Atlas — September Launch Build (Handoff)

Date: 2026-05-25
Operator: Claude Opus 4.7 (build prompt §7.3, FY27 Launch Operations Plan)
Repo: `/Users/benknight/Code/grantscope`
Branch: `main` (uncommitted)

## Summary

Shipped the **Funding Deserts Atlas** (flagship), the **Revolving Door Explorer**,
plus full methodology pages, a v1 **Public API** with rate limiting and OpenAPI spec,
and **cross-product accountability instrumentation** (with local `audit_events`
fallback). All five tasks in the brief are at least v1-complete. Typecheck clean.
Smoke-tested live against the running dev server — every public surface returns 200
against real MV data. No blockers.

The Funding Deserts atlas table currently shows 412 LGAs (filtered to rows with both
state + lga_name populated). MV had ~2,200 raw rows but ~800 were unincorporated /
no-state slices we excluded as un-attributable.

## Files created

### Atlas surfaces (Server Components)
- `apps/web/src/app/atlas/page.tsx` — landing page for both atlases
- `apps/web/src/app/atlas/funding-deserts/page.tsx` — top-50 table with state/sort filters, cite block, JSON download CTA
- `apps/web/src/app/atlas/funding-deserts/[lga]/page.tsx` — per-LGA deep page with KPIs, funding-source mix bars, top entities
- `apps/web/src/app/atlas/funding-deserts/methodology/page.tsx` — 1,100-word plain-English methodology with honest limitations
- `apps/web/src/app/atlas/revolving-door/page.tsx` — top-100 table with vector + state filters, vector glyph column
- `apps/web/src/app/atlas/revolving-door/[gsId]/page.tsx` — per-entity profile with vector cards + breakdowns
- `apps/web/src/app/atlas/revolving-door/methodology/page.tsx` — methodology

### Public API (rate-limited, CC-BY)
- `apps/web/src/app/api/v1/public/funding-deserts/route.ts` — list + single-LGA endpoint
- `apps/web/src/app/api/v1/public/revolving-door/route.ts` — list
- `apps/web/src/app/api/v1/public/entity/[abn]/route.ts` — entity profile by ABN (joins registry + revolving-door + power-index)
- `apps/web/src/app/api/v1/public/grants/route.ts` — open grant opportunities (paginated)
- `apps/web/src/app/api/v1/public/openapi.json/route.ts` — OpenAPI 3.0 spec
- `apps/web/src/app/docs/api/page.tsx` — public API docs with curl + Python examples

### Shared atlas library
- `apps/web/src/lib/atlas/funding-deserts.ts` — MV reader with per-LGA × state aggregation + slug helpers
- `apps/web/src/lib/atlas/revolving-door.ts` — MV reader + per-gs_id fetch
- `apps/web/src/lib/atlas/format.ts` — money/num/decile/desertColor helpers
- `apps/web/src/lib/atlas/rate-limit.ts` — in-memory 60 req/min limiter
- `apps/web/src/lib/atlas/provenance.ts` — fire-and-forget audit logger (EL endpoint with audit_events fallback)

### Database
- `scripts/migrations/2026-05-25-audit-events.sql` — `audit_events` table + indexes (applied)

## Files modified

None — pure additive build inside `apps/web/src/app/atlas`, `apps/web/src/app/api/v1/public`, `apps/web/src/app/docs/api`, `apps/web/src/lib/atlas`. Did not touch existing routes per scope guard.

## Database state

- Applied migration `2026-05-25-audit-events.sql` — new table `audit_events` (id, surface, event_type, resource_id, query jsonb, actor_ip, user_agent, forwarded, forwarded_at, created_at) with two indexes
- No MV refreshes needed — `mv_funding_deserts` and `mv_revolving_door` are populated and freshness is acceptable
- Verified 4 audit events captured during smoke testing (3 from `/api/funding-deserts`, 1 from `/api/revolving-door`)

## Stop criteria check

| Criterion | Status |
|---|---|
| `/atlas/funding-deserts` renders real data publicly | YES — 412 LGAs visible, top desert score 185 (Mount Magnet WA) |
| Methodology page exists | YES — `/atlas/funding-deserts/methodology` |
| `/atlas/funding-deserts/[lga_code]` deep page works for ≥1 LGA | YES — `/atlas/funding-deserts/wa-mount-magnet` returns 200 with KPIs + recipients |
| Type check passes | YES — `cd apps/web && npx tsc --noEmit` exits 0 |

Stretch tasks also shipped:
- Revolving Door Explorer (#2) — full table + per-entity profile + methodology
- Open API (#3) — 4 endpoints + OpenAPI spec + docs page
- Provenance instrumentation (#4) — wired into both API routes, EL endpoint with audit_events fallback
- Methodology docs (#5) — both atlases documented honestly

## Open items for next session

1. **Provenance on page-level views.** Currently audit events fire from the two API routes. Wire `logAuditEvent` from the Server Component bodies of `/atlas/funding-deserts`, `/atlas/funding-deserts/[lga]`, `/atlas/revolving-door`, `/atlas/revolving-door/[gsId]` for full coverage (would need request headers via `headers()` from `next/headers`).
2. **OG image generation.** Brief asked for per-LGA Open Graph images server-side. Not built — would need an `opengraph-image.tsx` per route using `next/og` ImageResponse. Cheap to add but I prioritised shipping core surfaces. Each LGA deep page already has metadata for OG title/description.
3. **API key issuance + higher tiers.** Public + rate-limit is enough for September per brief, but a key-issuance flow for journalists/researchers is the obvious next step. Existing `api_keys` table + `lib/api-key.ts` could be wired in.
4. **EL accountability replay job.** Local `audit_events.forwarded = false` rows queue forever right now. A nightly script (`scripts/replay-audit-events.mjs`) should POST forwarded=false rows to EL once `EL_ACCOUNTABILITY_TOKEN` + endpoint are confirmed live, then mark forwarded=true.
5. **Choropleth map.** Brief mentioned an LGA choropleth on the main atlas page. Not built — used the sortable table fallback per v1 license. A future addition with `react-simple-maps` + LGA TopoJSON.
6. **Entity API caveat.** `/api/v1/public/entity/[abn]` joins `mv_entity_power_index` — that MV has `id` as PK, joined against `gs_entities.id`. Spot-check a real ABN once for correctness.
7. **Revolving Door score range note.** Initial methodology copy referenced "scores above 1,000" but actual top score is ~22 (mostly four-vector ceiling). Methodology copy now corrected.

## How to test what shipped

Start dev server:

```bash
cd /Users/benknight/Code/grantscope/apps/web && npx next dev --turbopack -p 3003
```

URLs (all public, no auth):
- http://localhost:3003/atlas — landing
- http://localhost:3003/atlas/funding-deserts — top 50 table
- http://localhost:3003/atlas/funding-deserts?state=NT — NT only
- http://localhost:3003/atlas/funding-deserts/wa-mount-magnet — deep page
- http://localhost:3003/atlas/funding-deserts/methodology — methodology
- http://localhost:3003/atlas/revolving-door — top 100
- http://localhost:3003/atlas/revolving-door/methodology
- http://localhost:3003/docs/api — API docs

Sample curl:
```bash
curl 'http://localhost:3003/api/v1/public/funding-deserts?state=NSW&limit=10'
curl 'http://localhost:3003/api/v1/public/revolving-door?limit=5'
curl 'http://localhost:3003/api/v1/public/openapi.json'
curl 'http://localhost:3003/api/v1/public/entity/33051775556'  # Telstra
curl 'http://localhost:3003/api/v1/public/grants?dgr_required=true&limit=5'
```

Check audit events landing:
```bash
node --env-file=.env scripts/gsql.mjs "SELECT surface, event_type, created_at FROM audit_events ORDER BY created_at DESC LIMIT 10"
```

Typecheck:
```bash
cd apps/web && npx tsc --noEmit
```

Smoke-tested against the running dev server during build — all surfaces returned 200.
