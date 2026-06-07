---
name: preflight
description: Verify Supabase connection, TypeScript health, and schema before any database or implementation work. Use when starting a session, before migrations, or when something feels off.
---

# Preflight Check

Run this mandatory checklist before any database or implementation work.

## Step 1: Verify Supabase Connection

```bash
# Check which project MCP is connected to
mcp__supabase__get_project_url
```

Cross-reference with expected projects (refs verified 2026-06-01 against codebase + memory `command-center-finance-truth`):
- **Shared ACT/GS**: `tednluwflfhxyucgwigh` — Command Center, Telegram bot, GrantScope, scripts (operational DB; all money/finance work)
- **EL v2**: `yvnuayzslukamizrlhwb` — Empathy Ledger v2 storyteller content
- **Media storage**: `uaxhjzqrdotoahjnxmbj` — media-only public storage; serves the `story-media/` gallery image URLs in `minderoo-gallery.json` (NOT unused — don't deprovision without rehosting)

If the URL doesn't match the project you need, STOP and tell the user.

## Step 2: Verify Database Access

Run via MCP:
```sql
SELECT current_database(), count(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';
```

Report the table count. If it seems wrong (e.g., expecting 571 tables but seeing 153), you're on the wrong project.

## Step 3: TypeScript Health

```bash
cd apps/command-center && npx tsc --noEmit 2>&1 | head -20
```

Report: clean or number of errors found.

## Step 4: Schema Cache (if doing DB work)

For any tables you'll be working with, query the actual schema:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = '<table>'
ORDER BY ordinal_position;
```

Keep this in context and reference it when writing queries or migrations.

For **finance/money tables**, also load the money guards before any dollar-emitting query — see the `db-check` skill's "Money tables" section + memory `command-center-finance-truth.md` (exclude DELETED, never SUM via supabase-js, two-account rule, verify vs `project_monthly_financials`).

## Step 5: Report

Summarize:
- Supabase project: [name] (confirmed correct / WRONG)
- Table count: [n]
- TypeScript: clean / [n] errors
- Schema cached for: [table1, table2, ...]
- Ready to proceed: YES / NO (with blockers)
