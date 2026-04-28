---
title: Soul → Four Lanes Stack (handoff)
status: handoff
date_range: 2026-04-28 to 2026-04-29
author: Ben + Claude
---

# Soul → Four Lanes Stack — Handoff

> **Pick up here next session.** A two-day session built the entire soul-to-surfaces stack: founder identity at the top, ACT identity below, four-lanes economy, entity structure, method, public website pages, database scaffolding, and live snapshot generation. This file is the bookmark.

---

## What got built (top-down)

### Layer 1: Soul (founders)
- **`wiki/concepts/soul.md`** — Two voices (Ben + Nic), first person, six questions answered. Status: Draft, in review with Nic. Names spouse + children (Carla, Pollyanna, Jolie) and Nic's parents + dad-aspiration. Honest cost line: "Nic and I have not paid each other enough this year."
- **Voice rules baked in:** no em-dashes, Curtis stop-the-line cadence, no AI tells.

### Layer 2: Identity (org)
- **`wiki/concepts/act-identity.md`** — Updated 2026-04-29. Replaced "ACT Foundation / ACT Ventures" framing with real four-entity table (A Curious Tractor Pty Ltd + Harvest Pty forming + Farm Pty forming + A Kind Tractor Ltd dormant). Added soul-source line at top. Em-dash sweep complete.
- **`wiki/concepts/lcaa-method.md`** — Polished 2026-04-29. New "How LCAA Came to Be" section: method as externalised founder soul. Backlinks added.

### Layer 3: Economy (money story)
- **`wiki/concepts/four-lanes.md`** — Drafted 2026-04-28. Originally named `custodian-economy.md` then renamed because `wiki/projects/custodian-economy.md` exists as a separate (and stale) project file. Four lanes: To Us / To Down / To Grow / To Others. Entity flow + LCAA-in-money + beautiful-obsolescence-applied + "what this looks like in practice" + transparency case.

### Layer 4: Structure (entities)
- **`wiki/decisions/act-core-facts.md`** — Updated 2026-04-29. Added soul-source line and a "Why this structure" subsection. Sync script (`sync-act-context.mjs`) template still uses old phrasing — won't auto-update on next sync run.

### Layer 5: Strategy plan
- **`thoughts/shared/plans/strategy-from-soul.md`** — Seven-layer stack architecture, work order, "what done looks like" definition, risks. Items 1-8 marked done; item 9 (weekly digest line) is the only remaining work-order item.

### Layer 6: Public surfaces
- **`apps/website/src/app/about/page.tsx`** — Rewrote from soul. Two-humans intro (Muswellbrook, Brisbane van, Bolivia, Mount Isa, Witta), entity-structure section, LCAA cards, project clusters (Empathy Ledger, JusticeHub, Goods, Place cluster, Studio), beautiful obsolescence, footer CTAs.
- **`apps/website/src/app/economy/page.tsx`** — New page. Public translation of four-lanes. Section "How a quarter shows up" uses category-level placeholders (real data backfill pending lane data getting wired into Xero feed).
- **`apps/website/src/app/layout.tsx`** — Added "Economy" to main nav (between LCAA and Partners) and to footer customLinks.
- **`wiki/projects/custodian-economy.md`** — Added a stale-warning callout at top. Body preserved for review. Per Ben, the Custodian Economy project is a separate youth-justice partner ACT works with, not an internal economic concept. Needs full rewrite once Ben provides accurate detail.

### Layer 7: Data plumbing
- **Migration applied + mirrored at `supabase/migrations/20260429000000_add_lane_and_lcaa_phase_to_bank_statement_lines.sql`.** Added `lane`, `lcaa_phase`, `lane_source`, `lcaa_phase_source` columns + CHECK constraints + partial indexes + comments.
- **Backfill complete on 1,541 debit rows.** Lane: 1,318 to_grow / 224 to_down / 0 to_us / 0 to_others. Phase: 242 listen / 130 curiosity / 1,165 action / 5 art (after refinements).
- **`scripts/four-lanes-snapshot.mjs`** — Writes `wiki/cockpit/four-lanes-today.md` with current/previous quarter, last 90 days, LCAA by spend, soul-check line. Run with `node scripts/four-lanes-snapshot.mjs`.
- **`scripts/tag-lcaa-phases.mjs`** — Encodes vendor + project rules for ongoing phase tagging. Has a JS-client PostgREST timeout on bulk fetch; backfill ran via direct SQL through MCP. Script-level fix needed before it can run end-to-end.

---

## Where to pick up

**Next on the work order: item 9 — weekly digest line.**

Extend `scripts/weekly-reconciliation.mjs` (Monday 8am cron) to print:

- The four-lane snapshot (numbers from `bank_statement_lines` for the past week)
- The LCAA-by-spend ratio
- The soul-check line (lane most behind + a question matched to that lane)

The existing snapshot script generates exactly this content as markdown. Wiring it into the weekly cron is ~10 minutes.

**Other follow-ups, in priority order:**

1. **Fix JS PostgREST timeout** so `tag-lcaa-phases.mjs` can run end-to-end (likely a `db_extra_search_path` or statement_timeout setting in Supabase config). Not blocking; manual SQL works for now.
2. **Listen-at-9% interpretation.** Soul.md threshold says <20% means we've stopped sitting in rooms before we build. Either the rules are still under-tagging Listen (ACT-IN trip rules need refining), or the data genuinely shows a 90-day window that was delivery-heavy. Worth Ben's read.
3. **Art-at-0% refinement.** Adobe is the only Art-tagged spend ($227). Real Art-phase projects (Gold.Phone, Confessional, journal print runs) are likely tagged ACT-IN → Action. A targeted SQL sweep with specific transaction IDs would surface them.
4. **Custodian Economy project file** still needs a real rewrite — Ben to provide partner detail (who runs it, where, what they do for kids on youth justice orders).
5. **Notion API integration** for the four-lanes card — currently writes markdown to `wiki/cockpit/`. Notion API push is the next iteration if Ben wants the card directly in Notion.

---

## Files Ben needs to read with Nic before locking

In order of intimacy / decisions needed:

1. `wiki/concepts/soul.md` — read aloud, mark anything not true in your two mouths.
2. `wiki/concepts/four-lanes.md` — body that the soul lives in.
3. `act.place/about` (running on dev server at localhost:3001 if still up; rebuild with `npx next dev -p 3001` from `apps/website`).
4. `act.place/economy` — public version of four-lanes.
5. `wiki/concepts/act-identity.md` — has new entity structure.

---

## Critical session context

- **Connected to Supabase `tednluwflfhxyucgwigh` (Shared ACT/GS).** Verified at session start.
- **Migration was applied via `mcp__supabase__apply_migration`** which records in `supabase_migrations.schema_migrations`. The mirrored file in `supabase/migrations/` is for git history, won't double-apply.
- **No commits made.** All file changes are uncommitted in the working tree. Workflow rule: ask before destructive git ops; commits are explicit.
- **Dev server (port 3001)** was started in the background via `npx next dev -p 3001` from the act-global-infrastructure root. May still be running at session end (background task `bybdeh3ot`).
- **Em-dash policy:** soul.md, four-lanes.md, act-identity.md, lcaa-method.md (recent additions), public web copy in /economy and /about all em-dash-free. Other wiki files still have em-dashes; not swept.

---

## Tagging rule notes (so future Ben/agent doesn't have to re-derive)

**Lane rules (in DB now, not yet in a re-runnable script):**
- Credits (incoming) → NULL lane (revenue, not in any lane)
- ATO/Australian Tax payments → `to_down` (1 row, $13,346)
- NAB International / Foreign / Bank Fees / Account Fee / Service Fee → `to_down` (223 rows, $819)
- Knight Family Trust / Marchesi Family Trust / director fee/distribution / drawing account → `to_us` (0 rows, forward-looking)
- All other debits → `to_grow`

**LCAA phase rules (encoded in `scripts/tag-lcaa-phases.mjs`):**

VENDOR_OVERRIDES (win over project defaults):
- Adobe + art vendors (Eckersley, Whitehouse Institute, frame shops, galleries, Atkins Photo, Vanbar, Kayell, Printful, Printify, Raspberry Pi, Core Electronics, Element14, Pixapro, B&H Photo, Adorama) → `art`
- Materials/manufacturing (Carla Furnishers, Stratco, Telford Smith, Loadshift, Sydney Tools) → `action`
- R&D infra (Anthropic, Claude.AI, OpenAI, Vercel, Supabase, GitHub, Netlify, Cloudflare, Firecrawl, Railway, Webflow, GoHighLevel, Dialpad, Notion) → `curiosity`
- Compliance/banking/insurance/accounting/office (ATO, NAB, NRMA, AIG, Thriday, Standard Ledger, Officeworks, Kogan, Flyparks) → `action`

PROJECT_DEFAULTS (fallback when no vendor override):
- ACT-MY, ACT-PI → `listen`
- ACT-EL, ACT-JH → `curiosity`
- ACT-IN, ACT-FM, ACT-HV, ACT-CORE, ACT-CE, ACT-CC → `action`
- **ACT-GD → `listen`** (most spend is fieldwork; materials vendors override → action)

---

## Status of the strategy plan

`thoughts/shared/plans/strategy-from-soul.md` is the master tracker. Items 1-8 marked done. Item 9 (weekly digest) is the only open work-order line. All five wiki layers, both public surfaces, full data plumbing complete.

When resuming, open: `thoughts/shared/plans/strategy-from-soul.md` first, then this handoff, then proceed.
