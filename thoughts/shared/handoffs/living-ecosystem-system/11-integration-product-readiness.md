# Integration / Product Readiness

## Verified Integration State
- `act-global-infrastructure` now holds the canon registry and validation layer: `config/living-ecosystem-canon.json`, `config/project-identity-rules.json`, `config/living-source-packet.schema.json`, plus `scripts/wiki-bootstrap-source-summaries.mjs`, `scripts/wiki-build-flagship-project-packs.mjs`, `scripts/validate-living-ecosystem-config.mjs`, and `scripts/verify-repo-connections.mjs`.
- `act-regenerative-studio` is wired as the public hub build: `package.json` runs `sync:wiki -> sync:project-codes -> sync:el-media -> sync:el-editorial -> sync:el-packets -> next build`; `src/lib/empathy-ledger-runtime.ts` and `src/lib/empathy-ledger-featured.ts` fetch EL data with fallback behavior driven by `EMPATHY_LEDGER_URL`, `EMPATHY_LEDGER_SITE_SLUG`, and `EMPATHY_LEDGER_API_KEY`.
- `empathy-ledger-v2` is wired as the governed content engine: `scripts/sync-flagship-project-packs.mjs` reads canonical wiki data via `ACT_CANONICAL_WIKI_ROOT` or `../act-global-infrastructure/wiki`, and `next.config.js` force-loads Supabase env vars from `.env.local` to avoid direnv leakage.

## Verified Risks
- The canon registry still marks Empathy Ledger, JusticeHub, Goods on Country, Black Cockatoo Valley, and The Harvest as `inferred` / `human_decision_required`; the hub/spoke roster is not fully settled in machine-readable form.
- The source-packet schema is governed but ACT-specific: `canonical_entity.public_copy_owner` is limited to ACT surfaces, so it is not yet a generic multi-org content contract.
- `act-regenerative-studio/.env.example` exists, but `empathy-ledger-v2` does not have checked-in `.env.example` or `.env.local.example` in this checkout, despite docs still referencing them; that is a real setup and productization gap.

## Reusable Product Core
- The reusable core is the packet contract plus sync chain: canonical wiki note -> source packet -> review gates (`editorial`, `cultural`, `consent`, `release`) -> approved outputs -> generated snapshots.
- EL is already acting as a governed content engine, not just a CMS: the packet schema carries provenance, canonical identity, source refs, approved outputs, and release gating.
- The hub/site layer is reusable as a composition layer because it already consumes generated wiki snapshots and EL fetch/fallback helpers instead of hand-authored one-off pages.

## Next Implementation Moves
- Generalize the packet schema from ACT-only ownership to tenant-scoped ownership, with an explicit org registry for `public_copy_owner`, destinations, and review owners.
- Add checked-in env templates for EL/hub repos and a CI smoke test that verifies the full roundtrip: wiki canonical note -> source packet -> EL snapshot -> hub render.
- Promote the human decision list into a first-class governance gate so the canon registry can stop relying on inference for hub/spoke classification.

## Launch Readiness
ACT internal use: ready enough to operate today, with manual governance where the canon is still inferred.
External productization: not ready yet; it needs tenant-agnostic ownership, cleaner env/template hygiene, and an automated verification loop before it can be sold as a multi-org offering.
