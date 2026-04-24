# Plan: ACT Alignment Loop — a Karpathy-style cross-source research cycle

> Slug: `act-alignment-loop`
> Created: 2026-04-24
> Status: draft
> Owner: Ben

## Objective

ACT's truth is scattered. The wiki carries the claims. The DB (Xero, GHL, Supabase) carries the reality. The `thoughts/shared/` folder carries the in-flight work. The codebase carries what's actually shipped. Each source evolves independently, and drift between them is only noticed when a deadline forces an enumeration — and then the enumeration surfaces things like "Rachael" vs "Rachel" (four days stale), 103 Goods duplicates hidden behind a tag-filter gap, a 12-month Rotary invoice nobody chased, 44% of ALMA signals stuck at fallback, and "15 missing wiki articles" that was actually 1.

The alignment loop makes drift visible as a matter of rhythm, not reaction. It borrows the Karpathy LLM-knowledge-base pattern already running in the wiki (ingest → compile → lint) and extends it to the three non-wiki sources, producing one synthesis artefact per cycle that answers a named alignment question. The answer lives as a markdown file in `wiki/synthesis/` so the existing compile-lint pipeline carries it forward.

The bet: 1.5 hours of Ben's review time per month buys genuine situational awareness that today is built in panic-mode the week before an envelope lands.

## Scope — what this plan covers

- **In scope:** the design of the loop (cadence, source list, output shape), the first three alignment questions, acceptance criteria, and the Phase-2 cron/LLM-automation path.
- **Out of scope (this plan):** scoring frameworks beyond simple 0-4 presence checks (no rank-order politics), any UI surfacing (CLI/file output only), any change to wiki canonical graph structure.

## The loop (cycle, by phase)

### Phase 0 — pilot (this plan) — 3 questions authored manually by Claude, reviewed by Ben
- Zero automation. Each of the three synthesis docs is written as a Claude session output and committed manually.
- Goal: prove the pattern produces useful answers before investing in automation.

### Phase 1 — once per question is useful — LLM pass + human review, run on demand
- Codify the four-source queries into a script per question (e.g. `scripts/synthesize-funder-alignment.mjs`).
- Script generates a draft synthesis doc, Ben reviews + commits.
- Runs whenever Ben invokes it.

### Phase 2 — once the pattern stabilises — weekly cron + alert on drift
- PM2 runs the scripts on a weekly schedule.
- Script diffs this-week's synthesis against last-week's; if material drift (e.g. a new outstanding grant appears, a wiki article goes orphan, a plan item stays "pending" past its target date), posts a Telegram alert.
- Ben reviews the diffs, merges or archives.

## The three starting questions

### Q1 — Funder & grant alignment

**Question:** Across every funder relationship ACT has ever had, what is each one's live state, and where does the wiki / plans / DB disagree?

**Four-source pull:**
- **DB (Xero):** all ACCREC invoices with `income_type = 'grant'` — status, amount, amount_due, project_code, date (extends today's enumeration).
- **DB (GHL):** contacts tagged `funder`, `goods-funder`, `justicehub-funder` — last communication, opportunity status.
- **Wiki:** any article in `wiki/narrative/funders.json`, narrative claims that mention funders, project articles that name funders.
- **thoughts/shared:** any draft/plan that names a funder (novation letters, pitch versions, funder notes).

**Synthesis output:** `wiki/synthesis/funder-alignment-YYYY-MM-DD.md` — one row per funder with columns:
`funder | live_grants | total_received | days_since_last_comm | named_in_plans | named_in_wiki | open_questions`.

**Alignment-question acceptance criteria:**
- Every funder with a live outstanding invoice (`amount_due > 0` OR `status = 'AUTHORISED'`) is named.
- Every funder mentioned in an active plan without a matching DB presence is flagged.
- Every funder with no communication in 90+ days is flagged.

### Q2 — Project truth-state

**Question:** For each of the 74 codes in `config/project-codes.json`, how many of the four layers (wiki article, DB activity, repo/API reference, Xero tracking) actually exist?

**Four-source pull:**
- **Config:** `config/project-codes.json` — the source-of-truth for project codes.
- **Wiki:** walk `wiki/projects/**` recursively, match by canonical_slug or slugified name.
- **DB (Supabase):** count rows per project_code in `xero_invoices`, `ghl_contacts` (via tags), `media_assets`, `project_storytellers`.
- **Codebase:** grep for each project code across `apps/`, `scripts/`, `config/` (the code citations).

**Synthesis output:** `wiki/synthesis/project-truth-state-YYYY-MM-DD.md` — one row per project:
`code | canonical_slug | status | wiki✓ | db✓ | code_refs | xero_tracking✓ | presence_score 0-4`.

**Alignment-question acceptance criteria:**
- Every `active` or `ideation` project scores at least 2/4 (named somewhere operational + wiki).
- Any project scoring 0/4 is flagged for retirement from `project-codes.json`.
- Any project with DB activity but no wiki presence surfaces as an authoring backlog.

### Q3 — Entity migration truth-state

**Question:** For each item in `thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md`, what's actually done, and what's at risk given the 30 June 2026 cutover?

**Four-source pull:**
- **Plan:** parse the checklist — extract each action item with its target week.
- **DB (Xero):** check for the signals that prove the action shipped — e.g. "Pty's Xero file opens" = existence of any invoice with `xero_tenant_id` matching the Pty's tenant; "final sole trader BAS lodged" = a BAS line item dated after 30 June with sole-trader ABN.
- **Drafts:** check `thoughts/shared/drafts/` for novation letters drafted but not sent.
- **Memory:** check `project_act_entity_structure.md` for the latest known-state.

**Synthesis output:** `wiki/synthesis/entity-migration-truth-state-YYYY-MM-DD.md` — one row per checklist item:
`item | target_week | evidence_of_completion | status | days_until_cutover | at_risk_if_slips`.

**Alignment-question acceptance criteria:**
- Every "this week" action in the plan is either verifiably done or flagged as open.
- Every grant in Q1's live list has a matching novation status here.
- Drafts-but-not-sent (e.g. novation letter template sitting in a draft file) are distinguished from sent items.

## Task Ledger

Phase 0 (this plan):
- [ ] Q1 funder-alignment synthesis drafted and reviewed
- [ ] Q2 project-truth-state synthesis drafted and reviewed
- [ ] Q3 entity-migration-truth-state synthesis drafted and reviewed
- [ ] Each synthesis committed to `wiki/synthesis/`
- [ ] Decide whether each question is worth Phase-1 automation (based on "was the answer useful?")

Phase 1 (after Phase 0 proves out):
- [ ] `scripts/synthesize-funder-alignment.mjs`
- [ ] `scripts/synthesize-project-truth-state.mjs`
- [ ] `scripts/synthesize-entity-migration-truth-state.mjs`
- [ ] Script output schema stabilised so Phase 2 can diff

Phase 2 (once Phase 1 is stable):
- [ ] PM2 schedule for weekly runs
- [ ] Diff-against-last-week logic
- [ ] Telegram alert on material drift
- [ ] Rotation so all three questions run but staggered (not all on the same Monday)

## Decision Log

| Date | Decision | Rationale | Reversible? |
|------|----------|-----------|-------------|
| 2026-04-24 | Output lives in `wiki/synthesis/` rather than `thoughts/shared/reports/` | The wiki compile-lint pipeline already carries synthesis articles forward and backlinks them; thoughts/shared is a draft space. | Yes — can move outputs later. |
| 2026-04-24 | Three starting questions (funder, project, entity) not more | Each answers a known real-need surfaced this session. Fewer means the pattern is testable against lived value; more means risk of building a framework for its own sake. | Yes. |
| 2026-04-24 | Phase 0 = manual Claude pass, not scripted | The scoring logic for "useful answer" isn't obvious yet. Running it by hand first tells us what the script should compute before the script is written. | Yes. |

## Verification Log

| Claim | Verified? | How | Date |
|-------|-----------|-----|------|
| Karpathy pattern already runs in wiki | Verified | Read `wiki/AGENTS.md`; confirmed `scripts/wiki-lint.mjs` + `wiki-build-viewer.mjs` + CI `.github/workflows/wiki-rebuild.yml` | 2026-04-24 |
| `income_type = 'grant'` captures all grants | Inferred | 18 invoices matched today; 2 NULL-type entries may also be grants (Rotary, QLD DFSDSCS) — filter should use both | 2026-04-24 |
| 74 project codes exist in config/project-codes.json | Verified | `python3 -c "... len(pc['projects'])"` returned 74 today | 2026-04-24 |

## Provenance

- **Data sources queried:** `config/project-codes.json`, `xero_invoices` (ACCREC, income_type), `ghl_contacts` (tags), `wiki/projects/**`, `.github/workflows/wiki-rebuild.yml`
- **Date range:** Xero invoices Feb 2025 – Mar 2026, wiki state as of 2026-04-24
- **Unverified assumptions:** that the wiki's existing compile-lint pipeline has spare compute for 3 synthesis docs per cycle; that Ben's review pace is ~15 min per synthesis (estimated, not measured)
- **Generated by:** Claude Opus 4.7 session 2026-04-24 with Ben

## Next action

If approved: I write Q1 (funder alignment) as the first synthesis artefact in this session, against today's data. That proves the output shape before any scripting. Q2 and Q3 can follow in later sessions once Q1's format is agreed.
