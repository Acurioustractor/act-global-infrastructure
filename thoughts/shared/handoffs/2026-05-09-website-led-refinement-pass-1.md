---
title: Website-led refinement — pass 1 end-of-day handoff
status: active
date: 2026-05-09
purpose: Survive a /clear. 6 commits stacked on claude/dazzling-euler-f8763e. None pushed. Decisions awaiting Ben before push/PR.
plan: ~/.claude/plans/plan-to-reivw-this-dynamic-tulip.md
---

# Website-led refinement — pass 1 end-of-day

Stacked on branch `claude/dazzling-euler-f8763e`, off `origin/main` at `7acb613` (which itself merged `codex/recover-finance-money-alignment` — 88 commits including money cockpit, R&D pack, voice grader, synthesize/grade scripts).

**Nothing pushed.** All 6 commits local. PR creation is Tier 3 per `~/.claude/rules/workflow.md` — awaiting Ben's verb.

## What landed (6 commits)

```
5478e39 feat(cockpit): commits→plans section (Session 6)
f6c7959 docs(wiki/finance): README index for the 16 finance pages (Session 5)
156f952 feat(plans): Session 4b — triage report (118 plans grouped)
84c3123 feat(plans): Session 4a — frontmatter spine + lint
10f5751 feat(website): wiki-driven homepage projects (Session 2)
f236789 feat(wiki+config): Session 1 — project frontmatter + tier canonicalisation
```

## Per-session detail

### Session 1 — `f236789` — Project frontmatter + tier canonicalisation

3 new scripts:
- `scripts/normalise-wiki-project-frontmatter.mjs` — merges canonical frontmatter onto wiki/projects pages
- `scripts/lint-wiki-projects.mjs` — validates schema, catches orphans
- `scripts/fill-config-default-tier.mjs` — fills missing tier on config entries

Schema change: added `background` as 4th canonical tier (semantic: "in our system, not on the public website"). Updated `_meta.tier_values` + `_meta.tier_descriptions` in `config/project-codes.json`.

Data normalised:
- 30 wiki/projects/*.md to canonical schema
- 33 config entries assigned tier=background

Lint state: 0 errors, 18 warnings (all explained — see "Outstanding decisions" below).

### Session 2 — `10f5751` — Wiki-driven homepage projects

New: `apps/website/src/lib/wiki.ts` — reads wiki/projects/*.md (top-level + subdir entry pattern), augments with config (production_url, description, leads), extracts taglines from body blockquotes. Returns typed WikiProject records.

Updated: `apps/website/src/app/page.tsx` — homepage projects array now sourced from `getEcosystemProjects()` instead of hardcoded. COLOR_MAP and HOMEPAGE_COPY remain hardcoded per code (visual + copy decisions stay in component).

Behaviour change: homepage card count drops 6 → 5 (ACT-IN/Placemat had no wiki page). External links to production sites (justicehub.com.au, theharvestwitta.com.au, empathyledger.com, goodsoncountry.com, act-farm.vercel.app).

Verified: `npx tsc --noEmit` clean; pure-JS smoke test of wiki.ts logic returns 6 ecosystem projects with correct fields.

### Session 3 — DEFERRED

EL editorial/media overlay needs:
- env vars (EMPATHY_LEDGER_URL etc.) not in this worktree
- Decision on whether to migrate `/projects/[slug]/page.tsx` from `data/projects.ts` (439 lines, hand-curated) to `wiki.ts`-sourced content — bigger than originally scoped

Recommend: do this once env config is sorted + you've decided whether wiki.ts owns project detail pages or just the homepage.

### Session 4 — `84c3123` (4a) + `156f952` (4b) — Plans hygiene

4a — Spine:
- `scripts/normalise-plan-frontmatter.mjs` — adds minimal frontmatter to plans without any
- `scripts/lint-plans.mjs` — validates title/status/date, status enum, last_verified freshness, supersession integrity
- 109 plans got minimal frontmatter via normaliser
- 9 plans had pre-existing frontmatter; 7 had non-canonical status strings — fixed inline (preserved original strings as `status_note` where they had meaningful content)

Lint state after 4a:
- Total: 118 plans
- Errors: 0
- Warnings: 7 (stale last_verified)
- Status distribution: review-needed 110, active 7, blocked 1

4b — Triage proposal:
- `scripts/build-plans-triage-report.mjs` (new)
- `thoughts/shared/handoffs/2026-05-08-plans-triage-proposal.md` (output)

Groups all 118 plans into 17 topic clusters + 1 version chain (`unified-financial-overview` v1→v2). Each row has a suggested action. **Awaiting Ben to mark up final actions.**

After Ben triages, `scripts/apply-plans-triage.mjs` (TBD) will execute the marked-up file.

### Session 5 — `f6c7959` — wiki/finance README

Original premise (only 2 files in wiki/finance) was wrong — codex merge brought 14 more files. Higher leverage: index. Wrote `wiki/finance/README.md` mapping 16 pages into 5 sections + explicit "where the live numbers live (NOT here)" pointers + edit policy ($ figures must cite source + carry last_verified + link to live surface).

Did NOT add cash-position.md / founder-pay.md / runway.md as originally planned — would either duplicate existing content or hold stale numbers. Re-add later if a specific use-case demands.

### Session 6 — `5478e39` — Cockpit commits→plans section

Extended `scripts/generate-ceo-cockpit.mjs`:
- New function `getCommitsByPlan(sinceDays=7)` — parses `git log --grep=Plan:` for `Plan: <slug>` trailers in commit bodies, validates extracted slug against actual files in `thoughts/shared/plans/`. Tolerates 4 forms (slug / slug.md / path / path.md).
- New "Plans advanced (last 7 days)" subsection in cockpit's "What's moving" — groups commits by plan slug, sorted by count, links each to the plan file.

Convention: commits that advance a tracked plan should include `Plan: <slug>` in the body. If no commits carry the trailer, section shows one-liner explaining how to opt in (no fabricated data).

Smoke test: returns 1 valid match (`act-ceo-cockpit` from a 2026-04-26 commit). Earlier regex bug capturing "thoughts" from path-prefix mismatch is fixed via slug-validation set.

### Session 7 — DEFERRED (external-input-gated)

R&D + finance closeout needs Standard Ledger response on Aleisha account code. Stays open until they reply.

## Outstanding decisions (Ben only)

1. **Push branch + PR.** All 6 commits ready. Tier 3 — needs your verb.
2. **Plans triage markup** — open `thoughts/shared/handoffs/2026-05-08-plans-triage-proposal.md`, mark each row KEEP / ARCHIVE / SUPERSEDED BY X. Then say "apply triage" and I'll write the executor + run it.
3. **4 wiki orphans** (no config entry): `act-public-voice.md`, `deadlylabs.md`, `grantscope.md`, `place-based-policy-lab.md`. Add to config with `tier: background`, OR move out of `wiki/projects/` to `wiki/concepts/`?
4. **6 config entries with studio/satellite tier but no wiki page**: ACT-PS picc-on-country-photo-studio, ACT-UA uncle-allan-palm-island-art, ACT-CF the-confessional, ACT-GP gold-phone, ACT-RT redtape, ACT-SE sefa-partnership. Demote to background, or write stub pages?
5. **ACT-IN on homepage**: stub `wiki/projects/act-infrastructure.md` to restore the 6th card, or accept the drop to 5?
6. **Session 3 EL overlay approach**: migrate `/projects/[slug]/page.tsx` from `data/projects.ts` to `wiki.ts`, OR add EL cover images to homepage cards only, OR defer until env is sorted?

## Verification

- `npx tsc --noEmit` clean in `apps/website/`
- `node scripts/lint-wiki-projects.mjs` exit 0 (errors), 2 (warnings) — 18 warnings all in "Outstanding decisions" buckets above
- `node scripts/lint-plans.mjs` exit 0 (errors), 2 (warnings) — 7 stale last_verified
- `node scripts/normalise-wiki-project-frontmatter.mjs` idempotent (re-run shows 30 unchanged)
- `node scripts/normalise-plan-frontmatter.mjs` idempotent
- `node --check scripts/generate-ceo-cockpit.mjs` syntax clean
- Pure-JS smoke test of `wiki.ts` returns expected ecosystem projects
- Pure-JS smoke test of `getCommitsByPlan` returns 1 validated match (no false positives after fix)

NOT verified (env-gated):
- Cockpit script full run (needs SUPABASE_SHARED_SERVICE_ROLE_KEY)
- Website production build (`pnpm build` fails on `/api/v1/intelligence/search` — supabaseUrl missing, unrelated to this work)
- Website dev server actually rendering (needs env)
- EL data flow (needs EMPATHY_LEDGER_URL)

## Branch reconciliation note

This worktree was synced via fast-forward from `origin/main` mid-pass (was at `fae6ac5`, FF-merged to `7acb613` after PR #52 merged). Sister worktrees `claude/pedantic-bose-a37add` and `claude/unruffled-goldberg-49a95f` still at `fae6ac5` — they may need their own sync if active.

## How to resume

1. Read this file + the plan at `~/.claude/plans/plan-to-reivw-this-dynamic-tulip.md`.
2. Check git status + log to confirm branch state.
3. Pick from "Outstanding decisions" above; each unblocks a downstream chunk.
4. To execute plans triage: read marked-up `2026-05-08-plans-triage-proposal.md`, build `scripts/apply-plans-triage.mjs` (git mv archives, update superseded_by frontmatter), run, re-lint.

Plan: plan-to-reivw-this-dynamic-tulip
