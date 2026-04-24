# Plan: Phase 2a — Multi-repo Q2 codebase scan

> Slug: `act-brain-phase-2a-multi-repo-q2`
> Created: 2026-04-25
> Status: planned, not started
> Owner: Ben
> Parent plan: `thoughts/shared/plans/act-brain-expansion.md`

## Objective

Q2 of the Alignment Loop (`scripts/synthesize-project-truth-state.mjs`) currently scores every project code's "codebase presence" by grepping THIS repo's `apps/ scripts/ config/`. The other 8 ACT codebases are invisible to it. A project living entirely in one of the other repos (e.g., a Goods feature in `goods/`, an EL feature in `empathy-ledger-v2/`) has zero CodeRefs in the synthesis even when the code is real.

Phase 2a closes this gap: extend the Q2 scan to grep all 8 ACT codebases, aggregate counts cross-repo, surface "where does this code actually live?" as a new column.

## Scope

- **In scope:** extend the Q2 script's codebase-presence query; update output format; re-tune the `codeRefs >= 3` threshold for cross-repo counts; document the change.
- **Out of scope:** Q1 + Q3 multi-repo scans (different sources — Q1 reads Supabase + GHL, Q3 reads plan + drafts; cross-repo doesn't apply the same way); changing the project_code regex; building a UI.

## Design

### What to scan

Per `wiki/decisions/act-brand-alignment-map.md` — the canonical 8 active codebases:

```
1. /Users/benknight/Code/act-global-infrastructure  (this repo, hub — currently scanned)
2. /Users/benknight/Code/act-regenerative-studio
3. /Users/benknight/Code/empathy-ledger-v2
4. /Users/benknight/Code/JusticeHub
5. /Users/benknight/Code/goods
6. /Users/benknight/Code/grantscope
7. /Users/benknight/Code/Palm Island Reposistory
8. /Users/benknight/Code/act-farm
9. /Users/benknight/Code/The Harvest Website
```

(act-global-infrastructure is the hub, so 9 total including hub.)

### Per-repo grep scope

Each repo has different conventions. Sane defaults:

- **Default scan paths per repo:** `src/`, `app/`, `apps/`, `scripts/`, `config/`, `client/`, `server/`, `pages/`, `public/data/`
- **Always exclude:** `node_modules/`, `.git/`, `dist/`, `build/`, `.next/`, `out/`, `coverage/`
- Override possible via per-repo config (a `.act-codebase-scan.json` at repo root, optional)

### Data model

Today the script returns `codeRefCounts: { 'ACT-GD': 152, 'ACT-JH': 162, ... }` — flat code → count.

Extend to:

```js
codeRefCounts = {
  'ACT-GD': { 
    total: 540,
    byRepo: {
      'act-global-infrastructure': 152,
      'goods': 380,
      'empathy-ledger-v2': 8,
    }
  },
  ...
}
```

### Threshold re-tuning

Current rule: `codeRefs >= 3` → `codeOk = 1`. Tuned for single-repo where 2-3 references are config-only ghosts.

For cross-repo: most ecosystem codes (ACT-GD, ACT-JH, ACT-EL, etc.) will jump from ~150 to 500+. Quiet codes (archived projects) stay at 0-3.

New rule (proposed): `codeRefs >= 5` total OR `codeRefs >= 3` in any single non-hub repo → `codeOk = 1`. The "any single non-hub repo" clause catches code that lives heavily in one place even if hub-side refs are minimal.

### Output format change

The synthesis table currently has one CodeRefs column. Extend to:

| Code | Name | Status | Tier | Wiki | DB | CodeRefs (total) | CodeRefs (where) | Xero | Score |
|------|------|--------|------|:----:|:--:|--------:|------|:----:|:-----:|
| ACT-GD | Goods | active | ecosystem | ✓ | ✓ | 540 | hub:152 goods:380 EL:8 | ... | **4/4** |

`CodeRefs (where)` shows top-3 repos by count, abbreviated. Full breakdown in JSON sidecar (optional, Phase 2a.2).

## Implementation

### Files to touch

- `scripts/synthesize-project-truth-state.mjs` — extend `codebaseRefCounts()` to take a repo list, return per-repo + total
- `scripts/synthesize-project-truth-state.mjs` — extend `scoreRow()` to consume new shape
- `scripts/synthesize-project-truth-state.mjs` — extend `renderMarkdown()` for the new column
- `scripts/lib/act-codebase-scan.mjs` — NEW. Encapsulates the multi-repo grep with the exclude-list. Reusable by Phase 2c if Notion content sync needs similar logic.

### Phasing within Phase 2a

1. **Phase 2a.1** — extract `codebaseRefCounts()` into `scripts/lib/act-codebase-scan.mjs` (refactor only, no behavior change). Verify Q2 still produces identical output. Commit.
2. **Phase 2a.2** — add multi-repo support to the lib + update Q2 to call it with the 9-repo list. Re-run; expect score distribution to shift (some 3/4 → 4/4 as cross-repo refs surface). Commit.
3. **Phase 2a.3** — update threshold + output format. Commit.
4. **Phase 2a.4** — update `thoughts/shared/plans/act-alignment-loop.md` task ledger; mark Phase 2a complete.

## Risks + mitigations

| Risk | Probability | Mitigation |
|------|-------------|------------|
| `grep -roh` across 9 repos slow (>30s) | Med | Use `find ... -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.mjs" -o -name "*.json" -o -name "*.md" \)` to limit file types; should drop to <10s |
| One repo's grep fails (path doesn't exist, permissions) | Med | Wrap each repo in try/catch; log warning, continue |
| Generated code (build artefacts, bundled JS) inflates counts | Med | Exclude list (already in design); spot-check after first run; tighten if false positives |
| Cross-repo refs include test files or fixtures with literal "ACT-" placeholders | Low | Initial spot-check in first run; if persistent, exclude `**/test*/`, `**/fixture*/`, `**/__mocks__/` |
| Threshold change misclassifies projects | Med | Run before + after on today's baseline; review the diff manually before committing the threshold change |
| Regex misses kebab-case variants (act-jh vs ACT-JH) | Low | Regex `ACT-[A-Z]+` is case-sensitive on purpose. If lowercase variants matter, expand to `[Aa][Cc][Tt]-[A-Za-z]+` and dedupe |

## Verification

After Phase 2a.2 lands:

- Run `node scripts/synthesize-project-truth-state.mjs --dry-run` from hub repo
- Compare distribution to baseline (today: 29/16/25/2/0)
- Spot-check 3 codes: ACT-GD (Goods — should jump significantly), ACT-EL (EL v2 — should jump), ACT-IN (Infrastructure — should stay stable, no other repos use it)
- Check runtime: `time node scripts/synthesize-project-truth-state.mjs --dry-run` — target <20s

After Phase 2a.4:

- Update the weekly Alignment Loop agent's prompt to mention the multi-repo behavior (it already calls the script; output will just have the new column)
- Next Friday's drift PR will be the first to show cross-repo movement

## Decision Log

| Date | Decision | Rationale | Reversible? |
|------|----------|-----------|-------------|
| 2026-04-25 | Extract grep into a lib (Phase 2a.1) before extending | Standard refactor-then-extend pattern. Lets us verify nothing broke before adding new behavior. | Yes |
| 2026-04-25 | File-type allowlist (not full directory grep) | Bounds runtime + reduces false positives from binary or generated files | Yes — switch to full grep if a real file type is missed |
| 2026-04-25 | Per-repo `.act-codebase-scan.json` config OPTIONAL not required | Defaults work for 90% of cases; per-repo override available when needed without forcing config files into every repo | Yes |
| 2026-04-25 | Score threshold: `total >= 5 OR any-non-hub-repo >= 3` | Captures both ecosystem-wide projects and single-repo-heavy projects. Single-threshold (just total) would let archived projects with hub-only references squeak by. | Yes — tune after first weekly drift PR shows real numbers |
| 2026-04-25 | Defer per-file-path detail (not just per-repo counts) | Per-file paths multiply data without proportional value at current scale. Add later if a "where exactly does ACT-XX live?" question becomes load-bearing. | Yes — extend the data model |

## Verification Log (to fill in during execution)

| Claim | Verified? | How | Date |
|-------|-----------|-----|------|
| Phase 2a.1 refactor preserves behavior | TBD | Compare output before/after | — |
| Cross-repo grep <20s | TBD | `time` | — |
| Threshold change improves classification | TBD | Manual review of 5+ shifted codes | — |
| Weekly agent picks up new format cleanly | TBD | First Friday after deploy | — |

## Effort estimate

| Sub-phase | Effort | Notes |
|-----------|--------|-------|
| 2a.1 (refactor) | 10 min | Mechanical extract |
| 2a.2 (multi-repo lib) | 15 min | New code; covered by design above |
| 2a.3 (threshold + output) | 10 min | Tuning + format change |
| 2a.4 (docs) | 5 min | Task ledger update |
| **Total** | **40 min** | Single sitting |

## Out of scope (Phase 2b, 2c, 3, 4)

Per parent plan `act-brain-expansion.md`:
- **Phase 2b** — email content surfacing into Q1 (different source, different design)
- **Phase 2c** — Notion document body sync into Q2/Q3 (different source)
- **Phase 3** — bidirectional sync
- **Phase 4** — MCP server

## Backlinks

- [[act-brain-expansion|Parent: ACT Brain expansion plan]]
- [[act-alignment-loop|Alignment Loop plan (parent of Q2)]]
- [[../../wiki/decisions/act-core-facts|act-core-facts.md (canonical repo list)]]
- [[../../wiki/decisions/act-brand-alignment-map|brand alignment map (canonical repo list)]]
