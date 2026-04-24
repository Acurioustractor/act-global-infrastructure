---
title: ACT Brain — architecture overview (read first)
summary: One-page map of the cross-repo brain that distributes ACT facts + brand + daily attention to every Claude session and every active codebase. If you arrive cold (new collaborator, future Claude session, you-in-three-weeks), read this first.
tags: [brain, architecture, readme, navigation]
status: live
date: 2026-04-25
---

# ACT Brain — read first

The brain solves one problem: **stop re-deciding what's already decided.** ACT runs across 9+ codebases, 4 sync inputs, 3 wiki surfaces, and ~50 cross-cutting facts (entity structure, cutover rules, brand inheritance, project codes, key contacts, voice rules). Before this layer existed, those facts lived in scattered places and never reached a Claude session working in any individual repo. Now they do.

## Three layers, 30 seconds

```
┌──────────────────────────────────────────────────────────────┐
│  LAYER 1 — INPUTS (data sync, mostly built)                  │
│  Xero / GHL / Gmail / Notion / Calendar / EL v2 → Supabase   │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  LAYER 2 — REVIEW (Alignment Loop, weekly)                   │
│  Q1 funder · Q2 project · Q3 entity migration                │
│  Agent fires every Friday 08:00 Brisbane → drift PR          │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  LAYER 3 — DISTRIBUTION (the BRAIN proper)                   │
│  Source files → sync script → 8 ACT repos' CLAUDE.md         │
│  Daily cockpit → wiki/cockpit/today.md → morning PR          │
└──────────────────────────────────────────────────────────────┘
```

## What lives where

### Source-of-truth files (edit these; everything else propagates)
| File | Purpose | Edit when |
|------|---------|-----------|
| `wiki/decisions/act-core-facts.md` | Entity, cutover, receivables, key people, projects, naming | A fact changes (Pty ABN issued, novation sent, rule decided) |
| `wiki/decisions/act-brand-alignment-map.md` | Visual cluster per sub-brand, inheritance + intentional deviation | New sub-brand emerges, or visual positioning shifts |
| `.claude/skills/act-brand-alignment/references/brand-core.md` | Parent IDENTITY (LCAA, voice, values, project narratives) | Identity-level change (rare) |
| `.claude/skills/act-brand-alignment/references/writing-voice.md` | Curtis method + AI-tells blocklist | Voice rule changes (rare) |
| `config/project-codes.json` | 72 project codes, all `canonical_slug` populated | New project, retire project, code rename |
| `wiki/narrative/funders.json` | Funder ledger v2 (21 funders, stage + ask + claims) | Funder stage changes, new funder added |
| `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` | The 67-day cutover plan with 4 cutover rules + 14 open actions | Action ships, rule changes, new gap surfaces |

### Distribution (push from hub, never edit downstream)
| File | Purpose |
|------|---------|
| `scripts/sync-act-context.mjs` | Reads source files, generates "ACT Context" block, injects into 8 target CLAUDE.mds via HTML-comment delimiters. Idempotent. `--dry-run` by default; `--apply` writes. |
| `scripts/generate-ceo-cockpit.mjs` | Pulls live Supabase + git + brain files; writes `wiki/cockpit/today.md`; auto-archives yesterday |
| `scripts/synthesize-project-truth-state.mjs` | Phase-1 Q2 of Alignment Loop — scores every project across wiki/DB/codebase/Xero |

### Outputs (generated; do not hand-edit)
| File | Updated by | Cadence |
|------|-----------|---------|
| `wiki/cockpit/today.md` | `generate-ceo-cockpit.mjs` via daily agent | Every morning 07:00 Brisbane |
| `wiki/cockpit/archive/YYYY-MM-DD.md` | Auto-archive of yesterday's cockpit | Daily |
| `wiki/synthesis/funder-alignment-YYYY-MM-DD.md` | Weekly Alignment Loop agent | Every Friday 08:00 Brisbane |
| `wiki/synthesis/project-truth-state-YYYY-MM-DD.md` | Weekly agent (uses Q2 script) | Friday |
| `wiki/synthesis/entity-migration-truth-state-YYYY-MM-DD.md` | Weekly agent | Friday |
| Each ACT repo's CLAUDE.md "ACT Context" block | `sync-act-context.mjs --apply` | On edit to source files; verified weekly |

### Plans (the why behind the what)
| File | Covers |
|------|--------|
| `thoughts/shared/plans/act-alignment-loop.md` | Phase 0/1/2 design of the weekly review cycle |
| `thoughts/shared/plans/act-brain-expansion.md` | Three-layer architecture; Phase 2 (multi-repo Q2, email content, Notion body) scoped + deferred |
| `thoughts/shared/plans/act-ceo-cockpit.md` | Daily landing page architecture + Phase 2 candidates |
| `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md` | The actual cutover work with 4 rules + 14 actions + gstack review report |

## Two scheduled remote agents

| Agent | Trigger ID | Cron | What it does |
|-------|-----------|------|-------------|
| Daily Cockpit | `trig_01E6LXqwyCpgCekqvM6M1vKJ` | `0 21 * * *` UTC = 07:00 Brisbane daily | Runs `generate-ceo-cockpit.mjs`, opens PR with refreshed today.md |
| Weekly Alignment Loop | `trig_018X1ZRtc9zdgFENiYsx5t8c` | `0 22 * * 4` UTC = 08:00 Friday Brisbane | Re-generates Q1+Q2+Q3 syntheses, opens drift PR |

Manage both at https://claude.ai/code/routines.

## The cadence (when to expect what)

```
DAILY 07:00 Brisbane    Cockpit refresh PR opens
                        → headline: days to cutover, $ outstanding,
                          decisions blocked on you
                        → wiki/cockpit/today.md updated
                        → previous day archived

WEEKLY Friday 08:00     Alignment Loop drift PR opens
Brisbane                → Q1/Q2/Q3 syntheses re-generated
                        → drift summary names what moved since last week
                        → Saturday's cockpit picks up the new state

ON EDIT to source       Run: node scripts/sync-act-context.mjs --apply
                        → 8 ACT repos' CLAUDE.md updated
                        → next morning's cockpit reflects the change
                        → commit each downstream when ready

ON EDIT to brand-       Run: node scripts/sync-act-context.mjs --apply
alignment-map.md        → ACT Context block in each repo points at the
                          updated map
                        → no design work in any repo proceeds without
                          reading the map first

MONTHLY (first Friday)  Scan brand-alignment-map.md
                        → does each sub-brand still match its DESIGN.md?
                        → drift = update map or fix the surface
```

## Active ACT codebases (sync targets)

| Repo | Path | Cluster | DESIGN.md |
|------|------|---------|-----------|
| act-global-infrastructure (hub) | `/Users/benknight/Code/act-global-infrastructure` | Editorial Warmth (defines parent) | n/a (this is the hub) |
| act-regenerative-studio | `/Users/benknight/Code/act-regenerative-studio` | Editorial Warmth (defines parent visual) | ✓ |
| empathy-ledger-v2 | `/Users/benknight/Code/empathy-ledger-v2` | Editorial Warmth (multi-tenant subfamily) | ✓ |
| JusticeHub | `/Users/benknight/Code/JusticeHub` | Editorial Warmth (STAY journal subfamily) | ✓ |
| goods | `/Users/benknight/Code/goods` (not a git repo) | Editorial Warmth (earth + manufacturing) | ✓ |
| grantscope (CivicGraph) | `/Users/benknight/Code/grantscope` | Civic Bauhaus | ✓ |
| Palm Island Reposistory | `/Users/benknight/Code/Palm Island Reposistory` | TBD | no CLAUDE.md yet |
| act-farm | `/Users/benknight/Code/act-farm` | Editorial Warmth (parent unchanged) | ✓ |
| The Harvest Website | `/Users/benknight/Code/The Harvest Website` | Editorial Warmth (parent unchanged) | ✓ |

## How to extend the brain

### Add a new fact to the entity layer
1. Edit `wiki/decisions/act-core-facts.md`
2. Run `node scripts/sync-act-context.mjs --apply` to propagate
3. Commit the source change in this repo + each downstream repo (per-repo)

### Add a new sub-brand
1. Add a card to `wiki/decisions/act-brand-alignment-map.md` BEFORE the new brand ships its first page
2. Decide which cluster it belongs to (or document a third cluster with explicit reason)
3. Create a stub `DESIGN.md` in the new repo that explicitly inherits + names deviations
4. Run sync to propagate the brain pointer to the new repo's CLAUDE.md

### Add a new daily / weekly check to the cockpit
1. Edit `scripts/generate-ceo-cockpit.mjs` — extend the `render()` function
2. Test: `node scripts/generate-ceo-cockpit.mjs --dry-run`
3. Commit; the daily agent picks up the new version on next run

### Add Phase-2 to the Alignment Loop
Per `thoughts/shared/plans/act-brain-expansion.md`:
- 2a — Multi-repo Q2 codebase scan (extend `synthesize-project-truth-state.mjs` to take repo-roots list)
- 2b — Email content surfacing into Q1 (build `sync-funder-email-content.mjs`)
- 2c — Notion document body sync into Q2/Q3 (build `sync-notion-content.mjs`)

## Quick links

- **Open today's cockpit**: `wiki/cockpit/today.md`
- **Latest synthesis run**: `wiki/synthesis/` (sort by date)
- **Cutover plan with all rules**: `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`
- **Brand alignment map**: `wiki/decisions/act-brand-alignment-map.md`
- **Entity facts**: `wiki/decisions/act-core-facts.md`
- **Parent identity (brand-core)**: `.claude/skills/act-brand-alignment/references/brand-core.md`
- **Parent voice (Curtis method + AI-tells blocklist)**: `.claude/skills/act-brand-alignment/references/writing-voice.md`
- **Project codes (72)**: `config/project-codes.json`
- **Funders ledger (21)**: `wiki/narrative/funders.json`

## Daily ritual (if you only do one thing)

Every morning, open the PR titled `Daily cockpit refresh — YYYY-MM-DD`. Read the page top-to-bottom. The headline tells you days-to-cutover, $-outstanding, latest commit. The "Decisions blocked on you" section tells you what to act on today. Everything else is context.

If something is wrong on the page, edit `scripts/generate-ceo-cockpit.mjs` and re-run. Iteration is cheap. The agent re-fires tomorrow morning regardless.

## What this brain does NOT do (yet)

- **Multi-repo codebase scanning** — Q2 only greps this repo today; the other 8 ACT repos' code isn't indexed
- **Email content surfacing** — only metadata indexed; funder reply bodies don't reach Q1
- **Notion document body sync** — only structure indexed; meeting notes + decisions inside Notion pages aren't read
- **Day-over-day diff** — cockpit is point-in-time; doesn't say "$ outstanding moved $507K → $389K since yesterday"
- **Calendar integration** — "this week ahead" is fixed text; real meetings not pulled
- **Telegram / SMS push** — agent opens a PR; doesn't push notifications
- **Bidirectional sync** — downstream repos can't write back to upstream (push-from-hub only)

All of these are scoped in `thoughts/shared/plans/act-brain-expansion.md` Phase 2-4. Defer until a few weeks of usage shows what's actually missing.

## Backlinks

- [[act-core-facts|act-core-facts.md]] (entity layer source-of-truth)
- [[act-brand-alignment-map|act-brand-alignment-map.md]] (visual layer source-of-truth)
- [[../cockpit/today|wiki/cockpit/today.md]] (daily landing)
- [[../synthesis/index|wiki/synthesis/index]] (Alignment Loop outputs)
- [[../../thoughts/shared/plans/act-brain-expansion|brain expansion plan]]
- [[../../thoughts/shared/plans/act-ceo-cockpit|cockpit plan]]
- [[../../thoughts/shared/plans/act-alignment-loop|alignment loop plan]]
- [[../../thoughts/shared/plans/act-entity-migration-checklist-2026-06-30|cutover plan]]
