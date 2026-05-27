# Session handoff — Goods on Country GHL CRM build (2026-05-27)

**Memory:** `~/.claude/.../memory/goods-foundation-pipeline.md` (loads every session — the canonical state).
**Repo state:** act-infra `main` = `6e3bb6c`, clean + synced. All work merged via PRs #108–#112.

## What shipped this session
1. **Funder pipeline** — Supporter Journey **13 → 35** (Gmail + GrantScope mine, review-first; enriched contacts; Centrecorp/Centrebuild = Randle Walker one human / two opps).
2. **Buyer pipeline** — Buyer Pipeline **1 → 9** (commercial-only per operating model; delivery partners kept out). Demand Register **86 → 102** (incl. 9 backfilled anchor councils/ACCHOs + ALIVE-Beds sales prospects + Garma showcase).
3. **GrantScope anchor-gap backfill** — 9 marquee councils/ACCHOs into `goods_procurement_entities` with real austender ABNs (`grantscope` `goods-buyer-activation-2026-05-27`, pushed).
4. **GHL field strategy** — audit (40 of 51 fields empty), created ABN + impact rollup fields. `thoughts/shared/plans/2026-05-27-ghl-field-strategy.md`.
5. **Impact resync (one source of truth)** — `Goods Asset Register/v2/scripts/sync-goods-impact-rollups.mjs` reads LIVE `assets` (cwsyhpiuepvdjtxaozwf, 520 beds/41 washers) not the frozen Dec-2 CSV; curated community→record map; tags partners; cron wrapper. Verified (Snow=160 beds/24 washers, PICC=132/7).
6. **Grants** — SEDI fixed in DB (Capability 82/open + First Nations 88/upcoming, dupes retired); sweep handoff `thoughts/shared/handoffs/goods-grants-sweep-2026-05-27.md`.

## Traps learned (load these)
- GHL opp REQUIRES a contactId (422 otherwise) — cold orgs = company shells.
- `lookupContactByEmail` is broken (use `searchContacts`); contact tag updates OVERWRITE (use `addTagToContact`); customFields update MERGES by id (safe).
- GHL search index LAGS writes (~1 min) — don't re-run `--apply` immediately.
- GHL DATE custom fields want `YYYY-MM-DD` not epoch-ms; `grant_opportunities.url` + `customFields` have UNIQUE constraints.
- Goods `v2/.env.local` is fine, but shell-profile vars shadow `--env-file` → run live-assets scripts with `env -u NEXT_PUBLIC_SUPABASE_URL -u SUPABASE_SERVICE_ROLE_KEY … node --env-file=v2/.env.local`.

## OPEN — next session (do in this order)
1. **★ Scoring-noise fix (highest leverage, start here):** 72% of GrantScope's "goods_relevance≥60" is `arc-grants` (university research) + `qld-arts-data` (arts). Plan: source-exclude `arc-grants` from Goods scoring, add a Pty-Ltd/charity entity-eligibility gate, fix the "SEDI"↔"sediment" substring bug (word-boundary/funder-allowlist), then re-score. Detail in `goods-grants-sweep-2026-05-27.md` §5.
2. **Ingest the ~17 new source-vector programs** (IBA, ILSC, NIAA, ABA, Westpac, Telstra, Macquarie, Lowitja, Supply Nation) — proposed in the sweep handoff, not yet inserted (review-first).
3. **Build the capital + procurement pipelines** — Goods' real unlock (IBA loans/Many Rivers/NAIF + Supply Nation/$4B remote-housing). GrantScope models neither (sweep §4).
4. **Warm-intro pass** for ~11 contactless funder shells + buyer shells — `thoughts/shared/drafts/goods-warm-intro-worksheet-2026-05-27.md`.
5. Minor: confirm Centre Canvas + ALIVE org types; TFN primary contact (Kristen vs Madeline); add Sunrise Health + Mala'la to GrantScope scoring (need real ABNs).

## Restart prompt for next session
> "Pick up the Goods GHL CRM work — read memory `goods-foundation-pipeline.md` + handoff `thoughts/shared/handoffs/2026-05-27-goods-ghl-crm-session.md`. Start with the GrantScope scoring-noise fix (§5 of the grants sweep): exclude arc-grants, add a Pty-Ltd/charity eligibility gate, fix the SEDI/sediment substring bug, then re-score. Plan it first, then implement."
