# Plan: ACT Brain — cross-repo sync + multi-source review architecture

> Slug: `act-brain-expansion`
> Created: 2026-04-25
> Status: Phase 1 partially shipped (this session)
> Owner: Ben

## Objective

ACT runs across 9+ codebases, 4 sync inputs (Xero, GHL, Gmail, Notion), 3 wiki surfaces, and 1 strategic-intent set (entity, cutover, projects, funders). Today's reality: each codebase has a CLAUDE.md but cross-cutting facts (entity structure, cutover rules, naming, contact people) live in scattered places and don't reach Claude sessions working in any individual repo.

The Alignment Loop (shipped this week) is the first concrete instance of "always reviewed across all areas" — but it only covers Xero + GHL + this codebase + the wiki. The other sources (Gmail content, Notion documents, the other 8 ACT repos) are unwired.

The bet: make the upstream facts authoritative + the distribution mechanism trivial + the verification automatic, and "the ACT brain" stops being a metaphor and starts being a file you can grep.

## Three-layer architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 1 — INPUTS (data sync, mostly built)                          │
│                                                                      │
│  Xero ───────▶ xero_invoices, xero_transactions, bank_statement_lines│
│  GHL ────────▶ ghl_contacts, communications_history                  │
│  Gmail ──────▶ receipt_emails (metadata only — content TBD)          │
│  Notion ─────▶ notion_projects (structure only — body TBD)           │
│  Calendar ───▶ calendar events                                       │
│  EL v2 ──────▶ project_storytellers, media_assets (separate DB)      │
│  Other ACT repos ──▶ NOT INDEXED (gap)                               │
│  External email content ──▶ NOT INDEXED (gap)                        │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 2 — REVIEW (the Alignment Loop, partially built)              │
│                                                                      │
│  Q1 funder alignment ── manual ── synthesis/funder-alignment-*.md    │
│  Q2 project truth-state ── SCRIPT ── synthesis/project-truth-state-* │
│  Q3 entity migration ── manual ── synthesis/entity-migration-*       │
│                                                                      │
│  Weekly cron via remote agent (every Friday 08:00 Brisbane)          │
│  Output: drift PRs against main when material change                 │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 3 — DISTRIBUTION (the BRAIN — shipped this session)           │
│                                                                      │
│  wiki/decisions/act-core-facts.md  ◀── upstream source of truth      │
│         │                                                            │
│         ▼                                                            │
│  scripts/sync-act-context.mjs  ── generates "ACT Context" block      │
│         │                                                            │
│         ▼                                                            │
│  CLAUDE.md in each of 8 active ACT repos                             │
│  (act-regenerative-studio, empathy-ledger-v2, JusticeHub, goods,    │
│   grantscope, Palm Island, act-farm, The Harvest Website)            │
│                                                                      │
│  Wiki surfaces (3): tractorpedia, command-center, regen-studio       │
│  rebuild from push-trigger CI                                        │
└──────────────────────────────────────────────────────────────────────┘
```

## What's shipped (this session, 2026-04-25)

- **`wiki/decisions/act-core-facts.md`** — single source of truth for cross-repo facts. Entity structure, cutover rules, receivables, key people, projects, naming + voice, technical infrastructure, target repo list.
- **`scripts/sync-act-context.mjs`** — push-from-hub distribution. Reads source, generates compact "ACT Context" block, injects into target repos' CLAUDE.md via HTML-comment delimiters (`<!-- BEGIN ACT-CONTEXT -->` / `<!-- END ACT-CONTEXT -->`). Idempotent. Dry-run by default; `--apply` to write.
- **Distribution complete**: 7 of 8 target repos now carry the synced ACT Context block in their CLAUDE.md. Each has uncommitted changes for Ben's per-repo review.

## What's NOT shipped (Phase 2 + 3)

### Phase 2 — multi-source review (Alignment Loop expansion)

The Alignment Loop reads 4 sources today (Xero, GHL, this codebase, wiki). To genuinely be "always reviewed across all areas", needs three more inputs:

**2a — Multi-repo codebase scanning**
- Q2 currently runs `grep -roh 'ACT-[A-Z]+' apps/ scripts/ config/` over THIS repo only
- Should run across all 8 active ACT repos
- Adds ~30s to weekly run; surfaces project-code references living entirely in other repos
- **Effort**: small. Modify `scripts/synthesize-project-truth-state.mjs` to take a list of repo roots, run grep across each
- **Payoff**: catches projects that have wiki + DB + funder activity but only show up in code via a different repo (currently invisible to scoring)

**2b — Email content surfacing**
- `receipt_emails` table holds receipt metadata; full email content not indexed
- Q1 (funder drift) currently knows last_comm DATES but not WHAT was said
- If a funder emails "we need a deed of novation", it lands in Gmail but never surfaces in the next weekly drift report
- **Effort**: medium. Build `scripts/sync-funder-email-content.mjs` (Gmail API → Supabase `funder_email_threads` table → Q1 enrichment)
- **Payoff**: catches relationship-changing communications before they become problems
- **Risk**: privacy. Funder emails are sensitive. Need access controls + retention policy.

**2c — Notion document content**
- `notion_projects` has structure (titles, IDs, statuses) but not body content
- Decisions, meeting notes, project plans live in Notion bodies; Alignment Loop can't see them
- **Effort**: medium. Build `scripts/sync-notion-content.mjs` (Notion API → Supabase `notion_pages_content` table → Q2 + Q3 enrichment)
- **Payoff**: project truth-state can score "wiki ✓ DB ✓ codebase ✓ Notion ✓" instead of guessing at presence

### Phase 3 — bidirectional sync (read-write)

Current model: hub pushes, downstream consumes. Bidirectional means downstream repos can ALSO write back to the hub via PR.

- **Use case**: Harvest team adds a new lease term → updates `act-core-facts.md` for the Harvest entity row → Alignment Loop verifies against Supabase → distribution pushes the new fact to other repos
- **Effort**: large. Requires conflict resolution, branch management, CI integration
- **Decision**: defer until Phase 2 proves out the read-only model in practice (1-2 cycles of weekly drift PRs)

### Phase 4 — MCP server ("ACT brain as a tool")

The most ambitious end-state. A persistent MCP server exposes ACT facts as tools any Claude session can query:
- `act_brain.get_entity_state()` → current Pty + sole trader + charity status
- `act_brain.get_funder(slug)` → narrative + last interaction + outstanding amount
- `act_brain.get_project(code)` → wiki + DB + codebase + Xero presence
- `act_brain.search(query)` → semantic search across wiki + decisions + memory

Replaces file-based distribution with API-based query. No more sync; every Claude session has live access.

- **Effort**: large. MCP infrastructure, Supabase integration, semantic search
- **Decision**: defer to Phase 5+. File-based is sufficient for current ACT scale (8 repos, ~15 active commitments).

## Task Ledger

### Phase 1 (this session — DONE)
- [x] `wiki/decisions/act-core-facts.md` written (upstream source)
- [x] `scripts/sync-act-context.mjs` written (distribution)
- [x] First sync applied to 7 target repos
- [x] `thoughts/shared/plans/act-brain-expansion.md` (this doc)

### Phase 1.5 (next session — small wins)
- [ ] Per-repo commits of the ACT Context block in each downstream
- [ ] Add `node scripts/sync-act-context.mjs --verify` mode that diffs upstream vs each downstream and flags drift
- [ ] Wire weekly Alignment Loop agent to also run `--verify` and PR if any downstream drift

### Phase 2 (5-10 hours of agent work)
- [ ] 2a — multi-repo Q2 codebase scan
- [ ] 2b — email content surfacing into `funder_email_threads` table
- [ ] 2c — Notion document body sync into `notion_pages_content` table
- [ ] Update `scripts/synthesize-project-truth-state.mjs` to consume new sources
- [ ] Build Q1 + Q3 scripts (currently manual in Phase 0)

### Phase 3 (after Phase 2 proves out)
- [ ] Bidirectional sync design
- [ ] PR-based downstream-to-upstream contribution

### Phase 4 (deferred)
- [ ] MCP server design
- [ ] Replace file-based distribution

## Decision Log

| Date | Decision | Rationale | Reversible? |
|------|----------|-----------|-------------|
| 2026-04-25 | File-based distribution (not MCP) for Phase 1 | ACT has 8 repos, <50 cross-cutting facts, <1 sync/day. File-based is sufficient and zero infra. MCP is right when scale demands query semantics, not yet. | Yes — Phase 4 is the upgrade path. |
| 2026-04-25 | Push-from-hub model (not bidirectional) for Phase 1 | Simplest mental model: one source, many consumers. Bidirectional adds conflict resolution complexity that's unjustified at current pace of fact change. | Yes — Phase 3 plans the bidirectional add. |
| 2026-04-25 | HTML-comment delimiters in CLAUDE.md (not separate file) | Keeps the synced block visible to any human or Claude reading CLAUDE.md. Separate file requires explicit pointer; that pointer rots. | Yes. |
| 2026-04-25 | Source-of-truth lives in `wiki/decisions/`, not `thoughts/shared/` | Decisions are durable, versioned, reviewable. `thoughts/` is a draft space that doesn't compile to viewer surfaces. | Yes. |
| 2026-04-25 | Script does NOT auto-commit downstream | Downstream repos have their own git histories, deploy pipelines, review processes. Auto-commit is too aggressive; per-repo review is the right unit. | Yes — Phase 2 may add an opt-in `--auto-commit` flag. |

## Verification Log

| Claim | Verified? | How | Date |
|-------|-----------|-----|------|
| 8 active ACT codebases | Verified | `ls /Users/benknight/Code/` filtered for ACT-named repos; cross-checked with MEMORY.md | 2026-04-25 |
| Distribution works | Verified | First run wrote to 7 of 8 (Palm Island has no CLAUDE.md); diff in Harvest checked manually | 2026-04-25 |
| Alignment Loop runs weekly | Verified | `trig_018X1ZRtc9zdgFENiYsx5t8c` confirmed via RemoteTrigger get; cron `0 22 * * 4` = Fri 08:00 Brisbane | 2026-04-25 |
| Source file is read on every sync | Verified | `existsSync(SOURCE)` check in `scripts/sync-act-context.mjs` | 2026-04-25 |

## Provenance

- **Data sources queried:** `wiki/decisions/act-core-facts.md` (newly authored), `MEMORY.md`, `wiki/synthesis/*-2026-04-24.md`, `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`
- **Date range:** entity-state as of 2026-04-25; cutover decisions from 2026-04-24 CEO review
- **Generated by:** Claude Opus 4.7 session 2026-04-25 with Ben

## Next action (Phase 1.5)

If approved:
1. Per-repo commit of the ACT Context block in each of the 7 downstream repos (Ben reviews each, commits with `chore: sync ACT Context from act-global-infrastructure`)
2. Add `--verify` mode to `scripts/sync-act-context.mjs`
3. Update the weekly Alignment Loop agent's prompt to include `node scripts/sync-act-context.mjs --verify` after writing syntheses, and PR any drift

## Backlinks

- [[act-alignment-loop|Alignment Loop plan]] (the review layer this brain layer distributes from)
- [[act-entity-migration-checklist-2026-06-30|Migration checklist]] (the live commitment this brain protects)
- [[../../wiki/decisions/act-core-facts|act-core-facts.md]] (the upstream source)
- [[../../wiki/synthesis/index|Synthesis index]] (Alignment Loop outputs feed into the brain)
