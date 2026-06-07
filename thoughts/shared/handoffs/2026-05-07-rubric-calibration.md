# Session handoff — 2026-05-07 rubric calibration sprint

> Companion to `2026-05-07-end-of-day-2.md`. Three more commits on `codex/recover-finance-money-alignment` (now pushed). Both new rubrics calibrated 6/6 and production-eligible.

## What shipped

| Commit | Outcome |
|--------|---------|
| `7753bae` | **funder-cadence v0.1 calibrated 6/6.** Built `scripts/grade-funder-cadence.mjs` (Sonnet 4.6 for tier 2-3, NOT Haiku). Built `scripts/lib/claim-loader.mjs` (resolves `project:claim-slug` IDs from funders.json). 6 fixtures: 3 good (Minderoo pitch, QBE term-sheet, Dusseldorp renewal), 3 bad (generic, claims_to_avoid, charity-case). Two rubric tweaks needed to land 6/6: judgment misses count as fail (not warn) per calibration intent; Tier 1.3 dollar-citation rule loosened with wider context window + more citation patterns + Year-1 staged-entry allowance. |
| `5194439` | **alignment-loop-synthesis v0.1 calibrated 6/6.** Built `scripts/grade-alignment-loop-synthesis.mjs`. 6 fixtures: 3 good (copies of 2026-04-24 wiki/synthesis docs with frontmatter retrofit + em-dashes stripped), 3 bad (undercited drift, bare aggregate, vague actions). Three rubric tweaks: same verdict semantics; drift regex skips Legend/definition lines; em-dash regex extended to skip CLI flag double-dashes (`--funder` no longer trips). |
| `8171104` | **Phase-2 self-grade integration.** `scripts/lib/alignment-loop-grade.mjs` wraps the alignment-loop grader. `synthesize-project-truth-state.mjs` self-grades after writeFileSync; on pass exits clean, on warn/fail writes triage report to `wiki/output/lint-loop-YYYY-MM-DD.md` and exits non-zero on fail. `--no-grade` opt-out for cron without ANTHROPIC_API_KEY. End-to-end verified on good + bad fixtures. |

Plus pushed origin/codex/recover-finance-money-alignment up to `8171104` (14 commits today across both sessions).

## Where the rubrics live now

```
thoughts/shared/rubrics/
├── act-voice-curtis.md                        v0.2  10/10 (board-report + donor-letter)
├── rd-evidence-pack.md                        v1.0   6/6
├── funder-cadence.md                          v0.1   6/6  ← shipped today
├── alignment-loop-synthesis.md                v0.1   6/6  ← shipped today
└── fixtures/
    ├── rd-evidence/                           6 fixtures
    ├── funder-cadence/                        6 fixtures   ← shipped today
    └── alignment-loop-synthesis/              6 fixtures   ← shipped today

scripts/
├── grade-voice.mjs                            production
├── grade-pack.mjs                             production (rubric-agnostic)
├── grade-funder-cadence.mjs                   production   ← shipped today
├── grade-alignment-loop-synthesis.mjs         production   ← shipped today
└── lib/
    ├── claim-loader.mjs                                    ← shipped today
    └── alignment-loop-grade.mjs                            ← shipped today
```

## How to use them

```bash
# Funder-cadence (single draft):
node scripts/grade-funder-cadence.mjs --file <path> --funder <slug> [--cycle <c>]

# Alignment-loop-synthesis (single doc):
node scripts/grade-alignment-loop-synthesis.mjs --file <path> --slug <synthesis-slug>

# Calibration runs (re-verify 6/6 before promoting any rubric edit):
node scripts/grade-funder-cadence.mjs --calibrate
node scripts/grade-alignment-loop-synthesis.mjs --calibrate

# Phase-2 wiring (already in synthesize-project-truth-state.mjs):
node scripts/synthesize-project-truth-state.mjs               # writes + self-grades
node scripts/synthesize-project-truth-state.mjs --no-grade    # writes only
```

## What's queued

### High-value next moves

1. **Build `synthesize-funder-alignment.mjs`** (per `thoughts/shared/plans/act-alignment-loop.md` task ledger). Once it lands, picks up the same Phase-2 wiring with one import + one call to `gradeAndLint(outPath, 'funder-alignment')`. Effort: ~4h. The good-1 fixture at `thoughts/shared/rubrics/fixtures/alignment-loop-synthesis/good-1-funder-alignment.md` is a reference shape for what the script should produce.

2. **Build `synthesize-entity-migration-truth-state.mjs`** — same shape. Effort: ~4h. Reference fixture: `good-3-entity-migration.md`.

3. **Wire funder-cadence into the act-brand-alignment skill** so any funder-facing draft auto-grades before commit. This is the natural follow-on: funder-cadence rubric is calibrated but not yet load-bearing on production drafts. Currently invoked manually via CLI (e.g. on Minderoo Goods pitch today). Skill-level wiring would make it automatic.

### Carry-over from `2026-05-07-end-of-day-2.md` (still open)

4. Send Standard Ledger combined-ask email at `thoughts/shared/drafts/standard-ledger-combined-ask-2026-05-07.md`. Round-trip closes Aleisha $12,150 (~$4-4.5K tax saving) + R&D rule 1.5.
5. After SL confirms account code: `node scripts/write-off-aleisha-invoices.mjs --apply --account-code <code> --confirm`.
6. Minderoo Goods pre-send pass (12 May Nic call → 16 May send to Lucy).
7. AusIndustry registration filing — Jul 2026 lodgement window, hard rubric fail 1.2 closes when this lands.

### Hygiene

8. The grader's calibration-md output overwrites the file each run (no preserved "Calibration history" section). Pattern matches `act-voice-curtis.calibration.md`. If we want long-term calibration history, the grader needs a "preserve this section on rewrite" mechanism. Low priority.

## Branch state

```
codex/recover-finance-money-alignment
  HEAD: 8171104
  origin: in sync (pushed 2026-05-07)
  Working tree: clean
```

Branch is in shippable state. Merge-to-main decision is Ben's. Original prompt's item 1 said "ask Ben whether to push as-is, merge to main, or keep parking." The push happened (per `do all` authorization); merge-to-main has not.

## Calibration history (canonical, since calibration md gets overwritten by graders)

### funder-cadence v0.1 — 2026-05-07

Two changes from draft to land 6/6:

1. **Verdict semantics:** Tier 3 judgment misses now count as `fail`, not `warn`. The calibration matrix (rubric line 154) was written with this intent — bad-1 (generic-opener pitch) was expected to fail, but the rubric file's verdict-mapping lines mapped Tier-3 false to warn, which let bad-1 score `warn` instead. Tightened the rubric file and `synthesize()` in the grader to match calibration intent.

2. **Tier 1.3 dollar-citation rule loosened in three places:**
   - Context window widened ±2 → ±5 lines (so a citation 3 lines above a multi-line bucket-allocation table reaches every cell).
   - Citation pattern recognises inline forms common in funder briefs: `(cost report line N)`, `signed letter`, `signed off by`, `Three Circles`, `Years 2-3`.
   - Year-1 staged-entry tokens (e.g. `$780K Year 1`) explicitly allowed when the canonical ask is also cited in the document.

### alignment-loop-synthesis v0.1 — 2026-05-07

Three changes from draft to land 6/6:

1. **Same verdict semantics tightening** (matches funder-cadence sister rubric).
2. **Tier 1.1 drift regex skips Legend / definition lines.** The lines `Legend: 🟢 paid / current, ⚠️ drift-alert` and bullet definitions like `- drift-alert: sources disagree` were tripping as under-cited drift claims. Added `isDriftDefinitionLine()` skip.
3. **Voice em-dash regex extended:** old regex was `/(?<![-])--(?![-])/`, new is `/(?<![-])--(?![-A-Za-z])/`. CLI flag double-dashes (`--funder`) no longer trip. Real `text -- text` em-dashes still caught.

Same em-dash regex update applied to `funder-cadence` for consistency.
