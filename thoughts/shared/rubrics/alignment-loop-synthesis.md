# Rubric: Alignment Loop synthesis

> Slug: `alignment-loop-synthesis`
> Version: 0.1 (DRAFT — calibration pending)
> Created: 2026-05-07
> Source of truth: `thoughts/shared/plans/act-alignment-loop.md` (the Karpathy-style cross-source pattern)
> Use: pass to Anthropic Managed Agents Outcomes, or to a local grader before any synthesis doc lands in `wiki/synthesis/`.
> Calibration: 0/0 (no fixtures yet — see `alignment-loop-synthesis.calibration.md`)
> Status: **draft**, not production-eligible until calibration ≥ 6/6.
> Pass threshold: clean Tier 1 + ≥3 of 4 structural moves + every drift claim sourced both ways.

## What this rubric grades

Synthesis articles produced by the ACT Alignment Loop — the cross-source reconciliation cycles documented in `thoughts/shared/plans/act-alignment-loop.md`. Specifically:

- `wiki/synthesis/funder-alignment-YYYY-MM-DD.md` (Q1)
- `wiki/synthesis/project-truth-state-YYYY-MM-DD.md` (Q2)
- `wiki/synthesis/entity-migration-truth-state-YYYY-MM-DD.md` (Q3)
- Future synthesis questions following the same four-source pull pattern.

Out of scope: regular wiki articles (people, projects, country, concepts, decisions, sources). Those don't have the four-source-reconciliation contract.

The rubric layers on top of `act-voice-curtis` (which catches AI-tells, plainness drift). This rubric adds the synthesis-specific contract: every drift claim has a source on both sides of the disagreement, every dollar/date/name has a row reference, every reconciliation recommendation is actionable.

## Inputs

- `text` — the synthesis draft (markdown, with frontmatter)
- `slug` — synthesis slug (e.g. `funder-alignment`, `project-truth-state`)
- `sources_queried` — required array, what data sources the synthesis pulled from. Examples:
  ```yaml
  sources_queried:
    - { kind: "xero", table: "invoices", filter: "income_type = 'grant'" }
    - { kind: "ghl", table: "contacts", filter: "tag IN ('funder','goods-funder')" }
    - { kind: "wiki", path: "wiki/narrative/funders.json" }
    - { kind: "wiki", path: "wiki/projects/**" }
    - { kind: "thoughts", path: "thoughts/shared/drafts/**" }
  ```
- `prior_synthesis` — optional path to last cycle's synthesis (for diff/drift detection)

## Output (grader must produce all)

```json
{
  "verdict": "pass" | "warn" | "fail",
  "score": 0-100,
  "synthesis_slug": "funder-alignment",
  "cycle_date": "2026-04-24",
  "hard_failures":   [{ "rule": "uncited_drift_claim", "evidence": "wiki stage 3 tranches behind reality", "line": 21 }],
  "warnings":        [{ "rule": "vague_reconciliation_target", "evidence": "update funders.json", "line": 88 }],
  "suggestions":     [{ "rule": "name_the_row", "evidence": "...", "advice": "Cite the exact wiki/narrative/funders.json key + the Xero invoice ID for both sides." }],
  "structural_check": {
    "frontmatter_complete": true,
    "sources_block_present": true,
    "every_finding_cites_row": true,
    "drift_table_classifies_each_row": true
  },
  "judgment_check": {
    "no_decision_log_contradiction": true,
    "reconciliation_targets_are_actionable": true,
    "stage_classifications_match_canonical": true,
    "no_silent_inversion": true
  }
}
```

`verdict = fail` if any Tier 1 hard rule trips OR any drift claim is uncited on either side OR any reconciliation recommendation is non-actionable.
`verdict = warn` if Tier 1 + Tier 3 clean but `structural_check` has any `false`.
`verdict = pass` if Tier 1 clean + all four structural checks pass + all four judgment checks pass.

The `act-voice-curtis` rubric must also be run against the same text. A `fail` there is a `fail` here; this rubric does not duplicate those checks.

---

## Tier 1 — hard rules (binary, BLOCK on hit)

### 1.1 Every drift claim cites both sides
A drift claim is any sentence asserting a disagreement between two sources. Patterns:
- `(wiki|funders\.json|plan|draft) (says|claims|tags|stage) .{1,80} (xero|db|reality|actual) (shows|has|paid|received)`
- `(N) (tranches|days|months) behind (reality|the (db|ledger|wiki))`
- `(missing from|absent from|not listed) (funders\.json|wiki|the ledger)`
- Any cell in a drift-classification table classified as `⚠️` / `drift-alert` / `wiki-absent` / `db-absent` / `plan-absent`.

For each drift claim, the grader must find within ±200 chars OR in the row's source-citation column:
- The asserted side: row reference (`wiki/narrative/funders.json:funders.minderoo.stage`, or path + line)
- The disagreeing side: row reference (`xero_invoices INV-0123`, `ghl_contacts contact_id`, `wiki/projects/<slug>.md§<heading>`)

A drift claim with only one side cited (or with both sides described in prose without row references) is a hard fail.

### 1.2 Every dollar figure traces to a row
Pattern: any `\$[\d,.]+(?:\s*(?:M|K|m|k|million|thousand|billion|bn))?` token.

For each match, the grader must find:
- A Xero invoice ID (`INV-NNNN`, `BILL-NNNN`), OR
- A wiki/project/decision-log file path + section, OR
- A signed contract / board paper reference.

Bare aggregates ("$402K total" with no enumeration) are hard fails unless the synthesis has an enumeration table where each row carries the IDs.

### 1.3 Every name spelled per canonical
- Funders: `wiki/narrative/funders.json[slug].name`
- Projects: `config/project-codes.json[code].canonical_slug` + canonical name
- People: `wiki/people/<slug>.md` frontmatter `name`
- Entities: `wiki/decisions/act-core-facts.md` ("A Curious Tractor Pty Ltd", not "ACT Pty" or "ACT Foundation")

Misspellings are hard fails (e.g. `Mindaroo` vs `Minderoo`, `Rachael` vs `Rachel`).

### 1.4 Every "missing from X" is grep-verifiable
Pattern: any claim of the form `(absent|missing|not listed|wiki-absent) (in|from) (funders\.json|the ledger|wiki|plans|GHL)`.

The grader must run an absence check against the named source. A claim that an entity is "absent from `funders.json`" must trip `jq '.funders[<slug>]' funders.json` returning null. A false-absence claim (entity actually present) is a hard fail.

### 1.5 Inherits all act-voice-curtis Tier 1
Em-dashes, AI vocabulary, negative parallelism, significance claims, knowledge disclaimers, vague attribution, copula avoidance, curly quotes, title-case headings, inline-header puff. Run that rubric first; failures there fail here.

---

## Tier 2 — structural rules (4 moves, LLM grader)

### 2.1 Frontmatter complete
Required keys:
```yaml
title: <string>
summary: <string>
tags: [synthesis, alignment-loop, <topic>]
status: active | superseded
date: YYYY-MM-DD
sources_queried: [<source spec>...]   # the four-source list
```

Missing or empty `sources_queried` → fail. The synthesis must declare what it pulled from.

### 2.2 Sources block in body
Right after the title/summary, the synthesis must have a paragraph or section naming the four datastores by name and what was queried. The block doubles as the synthesis's audit trail and gives the grader something to cross-reference.

Example pass: "First artefact of the [[act-alignment-loop|ACT Alignment Loop]]. One synthesis, four sources: `xero_invoices` (DB reality), `ghl_contacts` (communication state), `wiki/narrative/funders.json` (strategic narrative), and `thoughts/shared/drafts + plans` (in-flight work)."

### 2.3 Every headline finding cites a specific row
The "Headline findings" section (or equivalent — top of synthesis, numbered list) must have every numbered finding back its claim with a specific row, count, or invoice ID. Generic findings ("Most funders are aligned") fail; specific ones ("Three funders hold live money — Snow $132K AUTH, Centrecorp $84.7K DRAFT, Rotary $82.5K AUTH-380d, all on the sole trader closing in 67 days") pass.

### 2.4 Drift table classifies each row
The "at-a-glance" table (or equivalent — the synthesis's main reconciliation matrix) must have an explicit classification column per row. Acceptable classifications:
- `aligned` — sources agree
- `drift-alert` — sources disagree, action needed
- `wiki-absent` — present in DB, missing in wiki
- `db-absent` — present in wiki, missing in DB
- `plan-absent` — present in DB+wiki, missing from any active plan
- `historical-only` — paid/closed but kept for the record

A drift table without a classification column fails. A row with a classification of `drift-alert` without an open-questions cell explaining the action also fails.

---

## Tier 3 — judgment rules (LLM grader, full-pass)

The LLM is given the full synthesis + the most recent prior synthesis on the same slug + recent decision-log entries.

### 3.1 No decision-log contradiction
Walk `wiki/decisions/*.md` for any decision newer than the prior synthesis. The current synthesis must not assert a state that contradicts a more recent decision (e.g. "Centrecorp ask remains $84.7K" when a 2026-05-01 decision-log entry records a renegotiated $120K).

### 3.2 Reconciliation targets are actionable
Every "what to do" or "next step" line must name:
- The file path AND specific row/key/section to update, OR
- A specific person + a specific deadline, OR
- A specific script invocation.

Vague targets ("update funders.json", "review with Ben") fail. Specific targets ("set `funders.minderoo.deadline` to 2026-05-15 in funders.json line 14"; "Ben to confirm Snow stage by 2026-05-10") pass.

### 3.3 Stage classifications match canonical sources
For each entity classified in the synthesis (funder stage, project status, entity migration phase), confirm the classification matches the canonical source AT THE TIME OF the cycle. If the synthesis says "Minderoo stage = ask-pending" the funders.json record at the synthesis's commit hash must show `stage: ask-pending`.

### 3.4 No silent inversion
The synthesis must not silently invert a source's classification. If `funders.json` says `stage: warm` but the synthesis classifies the funder as `cold` or `active-partner` without explicit reconciliation language, fail. The synthesis can recommend the canonical source be updated, but it must say so explicitly, not silently impose a new view.

---

## Calibration plan

Six fixtures minimum across the three alignment questions × two outcome shapes:

| ID | Synthesis slug | Cycle date | Verdict | What it tests |
|----|----------------|-----------:|---------|---------------|
| good-1 | funder-alignment | 2026-04-24 | pass | The 2026-04-24 funder-alignment synthesis on file. Should pass with one or two warnings on Tier 2 (it predates this rubric). |
| good-2 | project-truth-state | 2026-04-24 | pass | Same — exists already, calibration baseline. |
| good-3 | entity-migration-truth-state | 2026-04-24 | pass | Same. |
| bad-1 | funder-alignment | 2026-05-XX | fail | A synthesis that asserts drift without citing both sides — fails 1.1. |
| bad-2 | project-truth-state | 2026-05-XX | fail | A synthesis with bare aggregate `$N total` and no enumeration — fails 1.2. |
| bad-3 | funder-alignment | 2026-05-XX | fail | A synthesis with vague reconciliation targets ("review with Ben") — fails 3.2. |

Calibration file at `alignment-loop-synthesis.calibration.md`.

---

## Why this rubric

The alignment loop's whole value is **drift visible as rhythm, not reaction.** That value collapses if the synthesis itself can drift — if a finding gets uncited, a stage gets silently flipped, a reconciliation target stays vague. The rubric makes the synthesis carry its own audit trail: every claim sourced both ways, every recommendation actionable, every classification verifiable against the canonical source at the synthesis's commit hash.

Calibration target: 6/6 across the fixture matrix. Until then, treat output as advisory.
