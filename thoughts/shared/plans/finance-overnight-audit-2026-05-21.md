---
name: finance-overnight-audit-2026-05-21
status: in_progress
created: 2026-05-21
owner: ben
agent: claude (background, general-purpose)
---

# Overnight Finance Audit — 2026-05-21

**Goal:** Find absolutely everything wrong, slow, duplicated, or improvable in ACT's finance state, and write actionable recommendations Ben can triage with coffee.

**Constraints (load every section):**
- READ-ONLY against Supabase (use `mcp__supabase__execute_sql` + `mcp__supabase__list_tables`)
- READ-ONLY against Xero (use `mcp__xero__list-*` only — NEVER `create-*`, `update-*`, `delete-*`, `approve-*`, `revert-*`)
- READ scripts/, config/, apps/command-center/src/app/finance/, .pm2/dump.pm2, ecosystem.config.cjs
- WRITE only to `thoughts/shared/reports/finance-audit-2026-05-21.md`
- NO Xero writes, NO config edits, NO commits, NO PM2 changes, NO migrations

**Context to load first (in order):**
1. `thoughts/shared/handoffs/money-state-of-play/current.md` — 2026-05-19 handoff (state baseline, may be 2 days stale — verify)
2. `CLAUDE.md` — Finance 4-Surface Model, two-account rule, auto-tagger guard, action tiers
3. `config/tag-suggester-rules.json` — current tagger rules (Tier A-D)
4. `~/.claude/projects/-Users-benknight-Code-act-global-infrastructure/memory/MEMORY.md` — active workstreams

**Verify before trusting:** The 2026-05-19 handoff says 98% tagged, 81% receipted, 4+16 dups. Re-query and report current numbers. If they've drifted, note it.

---

## §1 — Tagging coverage
- Current untagged row count from `xero_transactions` (or whatever the canonical view is — check `/api/finance/transactions/reality` source)
- Filter to ACT-only accounts (NAB Visa ACT #8815 + NJ Marchesi T/as ACT Everyday). Exclude `NM Personal` + `NJ Marchesi T/as ACT Maximiser`.
- Group untagged by vendor + amount + description bucket
- Clusters of 3+ rows: rule candidates (vendor → suggested project_code)
- Untagged > $500 individually: name them with date + amount + description + xero_id
- `project_code_source` distribution (manual / vendor_rule / auto_*). Check the manual-guard still holds.

## §2 — Receipt coverage
- Unreceipted row count from same view as §1
- Split: correctly excluded (transfers + ATO + payroll) vs real gaps
- Cluster real gaps by vendor → top 20 by total dollar value
- Classify each cluster as:
  - **Auto-billing connector vendor** (Qantas, Uber, Webflow, Virgin, Booking — receipts on bills, sync issue)
  - **Dext-source vendor** (Dext has it, never reached Xero — DRAFT bill?)
  - **Manual capture needed** (no automation path)
- DRAFT bills in Xero: count + total $ + count with attachments
- DRAFT invoices > 30 days (separately — different problem)

## §3 — Duplicate detection
- Bill+bill: same vendor + same amount, group by date proximity
  - Same date × 2+ → DEFINITE duplicate
  - Within 7 days × 2+ → PROBABLE duplicate
  - Monthly cadence (28-32 days apart) → FALSE POSITIVE (sub) — flag as such
- Spend+spend: same logic against `xero_transactions`
- Bill+spend: pairs where bill matches spend (existing audit panel uses this — verify count holds)
- Top 20 candidates by dollar value, with Xero deep links
- Note: Don't recommend voiding without Ben review — `void-duplicate-bills.mjs` is plan-only by design

## §4 — Tagger rules health
- Read `config/tag-suggester-rules.json` — enumerate all rules with tier
- For each rule: count rows matching in current data (use vendor name pattern + tier hint)
- Dead rules: 0 matches → archive candidate
- Conflicting rules: same vendor pattern, different project codes → resolve
- Coverage gaps: vendors with 3+ untagged rows + no rule → rule candidates
- Also check `vendor_rules` table in Supabase (if exists — distinct from JSON config)

## §5 — Pipeline architecture
- Inventory all scripts under `scripts/` that write to xero_transactions, xero_bills, xero_invoices, receipt_emails
- Identify parallel paths:
  - `gmail-to-xero-pipeline.mjs` (handoff says archived candidate but not yet moved)
  - `push-receipts-to-xero.mjs` (same)
  - `sync-bill-attachments-to-txns.mjs` (active, useful)
  - Dext → Xero (external, via Dext settings)
- Recommend single canonical receipt-capture path. The handoff's grill-me Q1 asked: A) keep our pipeline, B) Dext + connectors only, C) hybrid. Recommend B with rationale.
- List scripts safe to archive to `scripts/_archive/2026-05/` with reasons.

## §6 — Cron + workflow audit
- Run `pm2 list` (read-only) and parse: which finance-related entries running vs stopped
- Cross-check with `ecosystem.config.cjs` (or whatever PM2 config file exists)
- Identify zombies:
  - Stopped but should run (lost cron)
  - Running but obsolete (e.g., gmail-to-xero if archived)
  - Missing entirely (gap)
- Map: Mon-morning sync chain, daily pulse, weekly reconciliation, etc.
- Recommend consolidations.

## §7 — Xero data quality
- Tracking categories: list active tracking options per category. Verify the 33 active count holds after cleanup.
- Contacts with multiple uses misrouting spend (Flight Bar Witta is the known case — find similar)
- DRAFT invoices > 30 days old (revenue stuck in pipeline)
- DRAFT bills > 14 days old (the Authorise gap — handoff says 152-177)
- Unreconciled bank transactions count (cannot fix from API — UI-only)
- Contact aliases: vendors appearing under 2+ slightly-different names

## §8 — Top 10 improvements
Synthesize across §1–§7. For each:
- **WHAT** — one-line problem
- **WHY** — impact ($, time, risk)
- **HOW** — specific action, with file/script/UI path
- **EFFORT** — Tier 1 (local, <30 min) / Tier 2 (shared-state, reversible) / Tier 3 (hard-to-reverse, ask Ben)
- **DEPENDENCY** — what has to happen first

Order by impact-per-effort (highest leverage first).

---

## Output format per finding

```
### N.M Finding title
- **WHAT:** one-line problem statement
- **EVIDENCE:** SQL count / file:line / query result (raw, citable)
- **RECOMMENDATION:** specific action
- **CONFIDENCE:** H/M/L + why
```

## Wrap-up section (end of report)

- **Time spent:** start → end wall time
- **Sections fully covered vs partial vs blocked**
- **Top 3 blockers encountered** (tool errors, missing data, ambiguity)
- **Top 3 surprises** (things Ben probably doesn't know)
- **Top 3 questions for Ben** (decisions needed to act on findings)
