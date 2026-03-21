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

Cross-reference with expected projects:
- **Shared ACT/GS**: `tednluwflfhxyucgwigh` — Command Center, Telegram bot, GrantScope, scripts
- **EL v2**: `uaxhjzqrdotoahjnxmbj` — Empathy Ledger v2
- **EL original**: `yvnuayzslukamizrlhwb` — Legacy EL

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

## Step 5: Report

Summarize:
- Supabase project: [name] (confirmed correct / WRONG)
- Table count: [n]
- TypeScript: clean / [n] errors
- Schema cached for: [table1, table2, ...]
- Ready to proceed: YES / NO (with blockers)
