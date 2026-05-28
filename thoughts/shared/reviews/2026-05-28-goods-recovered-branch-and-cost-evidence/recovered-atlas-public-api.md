# Recovered WIP Review — Atlas Cluster (CivicGraph / grantscope)

Reviewed: 2026-05-28
Branch: /tmp/wt-gs-recovered (uncommitted ~6-day WIP, never pushed)
Cluster: Public "Atlas" data product + public API

---

## 1. What it does

### Funding Deserts
A national LGA-level atlas showing where structural disadvantage is high but measured funding (government procurement, justice spending, political donations) is low. Uses a 0–200 composite `desert_score` (higher = worse served) derived from the `mv_funding_deserts` materialised view. Covers ~1,400+ LGAs. Users can filter by state, remoteness, SEIFA decile; sort by score, funding, entity count; drill into a per-LGA deep-page with KPI cards, funding-by-source breakdown, top entities list, cite block, and JSON download. A methodology page explains inputs, limitations, and caveats honestly.

### Revolving Door
An entity-level atlas identifying Australian organisations active across 2+ "influence vectors": lobbying (federal lobbyist register), political donations (AEC), government contracts (AusTender), and government funding (justice_funding + grants). Entities scored by a `revolving_door_score` composite (vector count × dollar magnitude). Lists top 100 entities, filterable by state/vector/min-vectors. Per-entity deep-page shows vector cards, donation/contract/funding breakdowns, and a JSON download. Methodology page is complete and candid about limitations.

### Public API
Four REST endpoints, all unauthenticated, rate-limited at 60 req/min per IP (in-memory bucket), CC-BY 4.0 licensed:
- `GET /api/v1/public/funding-deserts` — paginated LGA list, all filter/sort params
- `GET /api/v1/public/revolving-door` — paginated entity list with vector/state/min-vectors filters  
- `GET /api/v1/public/entity/{abn}` — entity profile by ABN, pulls gs_entities + mv_revolving_door + mv_entity_power_index
- `GET /api/v1/public/grants` — open grant opportunities from grant_opportunities table
- `GET /api/v1/public/openapi.json` — full OpenAPI 3.0 spec (served inline, no file dependency)

Audit/provenance system fires fire-and-forget events to `EL_ACCOUNTABILITY_URL` (Empathy Ledger endpoint) with 1.5s timeout, falls back to inserting into local `audit_events` table. Non-blocking.

### Docs page
`/docs/api` — human-readable API docs with endpoint list, curl examples, Python/pandas notebook snippet, rate-limit header docs, license, and contact. Links back to `/atlas`.

---

## 2. User-facing routes and endpoints

### Pages
| Route | Description |
|---|---|
| `/atlas` | Index page — cards for Funding Deserts + Revolving Door + API links |
| `/atlas/funding-deserts` | Filterable national table of 50 worst-served LGAs |
| `/atlas/funding-deserts/[lga]` | Per-LGA deep profile (slug format: `{state}-{lga-name}`) |
| `/atlas/funding-deserts/methodology` | Full methodology + caveats |
| `/atlas/revolving-door` | Filterable top-100 entities table |
| `/atlas/revolving-door/[gsId]` | Per-entity profile with vector cards + dollar breakdowns |
| `/atlas/revolving-door/methodology` | Full methodology + caveats |
| `/docs/api` | Human API documentation page |

### API endpoints
| Route | Purpose |
|---|---|
| `GET /api/v1/public/funding-deserts` | Programmatic LGA data |
| `GET /api/v1/public/revolving-door` | Programmatic entity data |
| `GET /api/v1/public/entity/{abn}` | Entity lookup by ABN |
| `GET /api/v1/public/grants` | Open grant opportunities |
| `GET /api/v1/public/openapi.json` | Machine-readable spec |

---

## 3. Data dependencies

### Materialised views (must exist in DB)
- `mv_funding_deserts` — core of Funding Deserts; rows are LGA × remoteness-band slices
- `mv_revolving_door` — core of Revolving Door; entities with ≥2 influence vectors
- `mv_entity_power_index` — referenced in entity API route (best-effort, null if absent)
- `mv_foundation_grantees` — mentioned in methodology page text only (excluded from score)
- `mv_board_donor_links` — mentioned in revolving-door methodology as a related view
- `mv_board_interlocks` — mentioned in revolving-door methodology as a related view

### Tables
- `gs_entities` — entity registry; used by entity API + LGA top-recipients query
- `grant_opportunities` — used by grants API
- `audit_events` — fallback audit log when EL endpoint unreachable
- `postcode_geo` — mentioned in methodology text (LGA mapping), not directly queried in read paths above
- `justice_funding` — mentioned in methodology text; ingested upstream into the MVs

### External services
- Empathy Ledger accountability endpoint (`EL_ACCOUNTABILITY_URL`) — fire-and-forget, gracefully degrades if absent

---

## 4. Wiring status

**NOT wired into global nav.** The `/atlas` route is not in `apps/web/src/app/components/nav.tsx` (which only has `Reallocation Atlas` under `/reports/reallocation-atlas`). The homepage (`/page.tsx`) mentions "revolving door" and "atlas" in marketing copy but does not link to `/atlas`. The sitemap (`sitemap.ts`) does not include any `/atlas/*` entries.

**Internal navigation is complete.** All sub-pages link correctly to their parents (Atlas → sub-atlas → deep-page → methodology). The API routes and docs page cross-link correctly. The revolving-door deep-page has a minor template-literal bug: `href="/entity/{row.gs_id}"` (line 67) is a raw string, not a template literal — should be `` `/entity/${row.gs_id}` ``. This means the "Open full entity record" link will be literally `/entity/{row.gs_id}` rather than the actual entity URL.

**Provenance system references `EL_ACCOUNTABILITY_URL`/`EL_ACCOUNTABILITY_TOKEN`** env vars that are not set anywhere in the repo. Falls back cleanly to the local `audit_events` table.

**`mv_entity_power_index`** is queried best-effort in the entity API but not confirmed to exist in the DB.

---

## 5. Completeness

### Complete and functional
- `apps/web/src/lib/atlas/funding-deserts.ts` — complete
- `apps/web/src/lib/atlas/revolving-door.ts` — complete
- `apps/web/src/lib/atlas/format.ts` — complete
- `apps/web/src/lib/atlas/rate-limit.ts` — complete (in-memory; known limitation noted in comments)
- `apps/web/src/lib/atlas/provenance.ts` — complete
- `/atlas/funding-deserts` list page — complete
- `/atlas/funding-deserts/[lga]` deep page — complete
- `/atlas/funding-deserts/methodology` — complete
- `/atlas/revolving-door` list page — complete
- `/atlas/revolving-door/methodology` — complete
- All API routes — complete
- `/docs/api` — complete
- `/api/v1/public/openapi.json` — complete

### Partial / has a bug
- `/atlas/revolving-door/[gsId]` deep page — functional but has a template-literal bug at line 67: `href="/entity/{row.gs_id}"` should be `` href={`/entity/${row.gs_id}`} ``

### Structural gaps (not blocking functionality)
1. **No nav link** — `/atlas` is not in the global nav or sitemap; it's a dead-end unless you know the URL
2. **`mv_entity_power_index`** — queried in `/api/v1/public/entity/{abn}` but existence in DB not confirmed; route handles null gracefully
3. **`audit_events` table** — provenance fallback writes here; table may not exist in DB (write will fail silently, which is intentional)
4. **Rate limiter is in-memory only** — resets on cold start; adequate for launch but not production-scale (comment in code acknowledges this)

---

## 6. Practical value

**Funding Deserts** gives ACT/CivicScope a publishable, citable, CC-BY public data product showing LGA-level funding inequality across Australia. This is directly relevant to ACT's community justice + disadvantage narrative. Journalists, researchers, community advocates, and grant writers can use it immediately. The methodology page is unusually honest about limitations, which is defensible.

**Revolving Door** creates a public accountability dataset identifying entities simultaneously lobbying, donating, contracting, and receiving government funding. Useful for investigative journalism and policy analysis. The top-of-table entities mentioned in methodology (Telstra, Aspen Medical, Built Pty Ltd) suggest the data is real, not stub.

**Public API** makes both datasets machine-consumable under CC-BY 4.0, which is the right move for open-data credibility. The OpenAPI spec, Python notebook example, and rate-limit headers are production-quality patterns.

The entire cluster is essentially launch-ready pending: (a) adding nav links, (b) confirming `mv_funding_deserts` and `mv_revolving_door` exist and are populated in the live DB, (c) fixing the single template-literal bug, and (d) confirming `mv_entity_power_index` existence or removing it from the entity API spec.
